// ------------------------------------------------------------------------
// Script:      probe_e2e.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-31
// Description: End-to-end probe for Batch Text Edit (Task 13). Runs the real
//              src/main.js on a document the probe builds itself, with the
//              real modules in front of it and only the two windows stubbed:
//              BTE.UI.show returns what the dialog returns for a chain (the
//              real BTE.Scope.prepare and BTE.Steps.run, Replace {kód} ->
//              ABC, Number {n} Číslic 3, Replace {série} -> 2026), and
//              BTE.Summary.show captures its argument. main.js is read from
//              disk and run through new Function with its own alert and $,
//              so an alert can never block Illustrator and the logged
//              `detail` can be read. Parts (one per run):
//                main        240 prefabs of „{kód}“, „{n}“, „Série {série}“:
//                            expect 240 elements „ABC | 001 ... 240 | Série
//                            2026“ in reading order, verify [], summary 240
//                            changed elements, 720 changed texts, 0 skipped,
//                            0 mismatches, no alert, no log
//                locked      3 prefabs, one text locked: skipped 1, the rest
//                            written, the locked text untouched
//                fail-dom    20 prefabs; BTE.Write.writeEdit wrapped so the
//                            15th write throws like a DOM error: the summary
//                            shows the Error's message, the detail goes to
//                            the log only, verify is not called
//                fail-drift  20 prefabs; a text of the document is changed
//                            after the dialog's preview (a real drift): the
//                            same path without a wrapper
//                note        no run: the width of the summary's labels and
//                            notes in the dialog's font (graphics.measureString)
//              It does not measure Undo (an undo command inside a probe stalled
//              Illustrator for 18 minutes, 2026-10-29): one Cmd+Z after a run
//              from File > Scripts is the manual test (spec 7.3). Creates one
//              document per run and closes only that one, unsaved.
// Usage:       The probe needs a header line and the real modules in front of
//              it (everything the dist has except main.js, which the probe
//              reads from MAIN_PATH). From the repo root, with 0 open
//              documents (it refuses to run otherwise):
//                  P=batch-text-edit; R="$PWD"
//                  { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true; var PART = "main";'
//                    echo "var MAIN_PATH = \"$R/$P/src/main.js\";"
//                    cat shared/lib/json2.js $P/src/locale.js $P/src/lib/utils.js shared/lib/ui_state.js
//                    echo 'buildUIState(BTE);'
//                    cat shared/lib/numbers.js; echo 'buildNumbers(BTE);'
//                    cat shared/lib/field_paint.js; echo 'buildFieldPaint(BTE);'
//                    cat shared/lib/summary.js; echo 'buildSummary(BTE);'
//                    cat $P/src/config.js $P/src/lib/storage.js $P/src/vars.js $P/src/steps.js \
//                        $P/src/order.js $P/src/element.js $P/src/ui_model.js $P/src/scope.js \
//                        $P/src/write.js $P/src/ui.js $P/tests/probes/probe_e2e.jsx
//                  } > "$TMPDIR/probe_e2e_run.jsx"
//                  tools/ai-eval.sh -t 300 "$TMPDIR/probe_e2e_run.jsx"
//              The header resets BTE, which the engine keeps between runs, so
//              the modules that follow load fresh.
// ------------------------------------------------------------------------
(function () {
    // Never next to the user's work: run only with no document open. The
    // marker is dropped here too, so a refused run leaves nothing to reuse.
    if (app.documents.length !== 0) {
        if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
        return "PRERUSENO: otevrene dokumenty";
    }

    var fresh = (typeof BTE_PROBE_FRESH === "boolean") && BTE_PROBE_FRESH;
    var part = (typeof PART === "string") ? PART : "";
    var mainPath = (typeof MAIN_PATH === "string") ? MAIN_PATH : "";
    // The engine keeps globals from one run to the next, so every flag is
    // reset once read.
    if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
    if (typeof PART === "string") { PART = ""; }
    if (typeof MAIN_PATH === "string") { MAIN_PATH = ""; }

    var out = { part: part, app: app.version, locale: "", notes: [] };
    var d = null;

    function now() { return new Date().getTime(); }
    function hex(n) { var x = n.toString(16); while (x.length < 4) { x = "0" + x; } return x; }
    // Every non-ASCII character escaped, so the AppleEvent result stays ASCII.
    function ascii(s) {
        var r = "", i, code;
        for (i = 0; i < s.length; i++) {
            code = s.charCodeAt(i);
            r += (code < 32 || code > 126) ? "\\u" + hex(code) : s.charAt(i);
        }
        return r;
    }
    function j(v) {
        var a = [], k, i;
        if (v === null) { return "null"; }
        if (v === undefined) { return "\"<undefined>\""; }
        if (typeof v === "string") { return "\"" + ascii(v).replace(/"/g, "\\\"") + "\""; }
        if (typeof v === "number" || typeof v === "boolean") { return String(v); }
        if (v instanceof Array) {
            for (i = 0; i < v.length; i++) { a.push(j(v[i])); }
            return "[" + a.join(",") + "]";
        }
        for (k in v) { if (v.hasOwnProperty(k)) { a.push("\"" + k + "\":" + j(v[k])); } }
        return "{" + a.join(",") + "}";
    }

    function R(where, rep) { return { type: "replace", active: true, where: where, replace: rep, matchCase: false, firstOnly: false }; }
    function N(where) { return { type: "number", active: true, where: where, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" }; }
    function V(name) { return { kind: "var", text: name }; }
    var CHAIN = [R(V("{kód}"), "ABC"), N(V("{n}")), R(V("{série}"), "2026")];

    function point(container, x, y, text) {
        var tf = container.textFrames.pointText([x, y]);
        tf.contents = text;
        return tf;
    }

    // n prefabs in a grid of 12 columns, each a group of three texts; rows
    // top to bottom, so prefab i is element i in reading order.
    function buildSheet(n) {
        var cols = 12, rows = Math.ceil(n / cols), PITCH = 60, H = rows * PITCH + 20, groups = [], g, i, cx, cy;
        d = app.documents.add(DocumentColorSpace.RGB, cols * PITCH, H);
        for (i = 0; i < n; i++) {
            cx = (i % cols) * PITCH + 5;
            cy = H - (Math.floor(i / cols) * PITCH + 15);
            g = d.layers[0].groupItems.add();
            point(g, cx, cy, "{kód}");
            point(g, cx, cy - 14, "{n}");
            point(g, cx, cy - 28, "Série {série}");
            groups.push(g);
        }
        app.redraw();
        return groups;
    }

    function pad3(n) { var s = String(n); while (s.length < 3) { s = "0" + s; } return s; }

    // Reads the texts of every prefab back, in the order they were built
    // (pageItems[0] is the topmost, the last text added).
    function readGroups(groups) {
        var all = [], i, g, tx;
        for (i = 0; i < groups.length; i++) {
            g = groups[i];
            tx = [g.textFrames[2].contents, g.textFrames[1].contents, g.textFrames[0].contents];
            all.push(tx);
        }
        return all;
    }

    // The run of main.js: stubs for the two windows, the real rest. opts:
    //   afterShow(p, run)  called after the dialog's stub has built its result
    function runMain(opts) {
        var r = { calls: [], summaries: [], alerts: [], logged: [], applyReturn: null, verifyReturn: null, ms: 0 };
        var origApply = BTE.Write.apply, origVerify = BTE.Write.verify, origUI = BTE.UI, origSummary = BTE.Summary;
        var f, src, fakeDollar, started;

        f = new File(mainPath);
        f.encoding = "UTF-8";
        if (!f.open("r")) { throw new Error("cannot read " + mainPath); }
        src = f.read();
        f.close();

        BTE.UI = {
            show: function (doc) {
                var p = BTE.Scope.prepare(doc, "document", "rows");
                var run = BTE.Steps.run(p.state, CHAIN);
                r.calls.push("ui.show");
                r.preview = { elements: p.elements.length, textCount: p.textCount, skipped: p.skipped, canApply: BTE.UIModel.status(run, CHAIN, p.skipped, p.cursorInText).canApply };
                if (opts.afterShow) { opts.afterShow(p, run); }
                return { scope: "document", order: "rows", steps: CHAIN, prepared: p, run: run };
            }
        };
        BTE.Write.apply = function (tfs, info, states) {
            var w;
            r.calls.push("apply");
            w = origApply(tfs, info, states);
            r.applyReturn = w;
            return w;
        };
        BTE.Write.verify = function (tfs, finalState) {
            var v = origVerify(tfs, finalState);
            r.calls.push("verify");
            r.verifyReturn = v;
            return v;
        };
        BTE.Summary = { show: function (o) { r.calls.push("summary"); r.summaries.push(o); } };
        // The real $ for everything else; writeln is the log main.js uses.
        fakeDollar = { writeln: function (s) { r.logged.push(String(s)); } };

        started = now();
        try {
            (new Function("BTE", "app", "alert", "$", src))(BTE, app, function (s) { r.alerts.push(String(s)); }, fakeDollar);
        } finally {
            r.ms = now() - started;
            BTE.Write.apply = origApply;
            BTE.Write.verify = origVerify;
            BTE.UI = origUI;
            BTE.Summary = origSummary;
        }
        return r;
    }

    function pairsOf(summary) {
        var a = [], i;
        for (i = 0; i < summary.pairs.length; i++) { a.push(summary.pairs[i].label + " " + summary.pairs[i].value); }
        return a;
    }

    function mainPart() {
        var groups = buildSheet(240), r, texts, i, bad = [], want;
        r = runMain({});
        out.calls = r.calls;
        out.preview = r.preview;
        out.alerts = r.alerts;
        out.logged = r.logged;
        out.ms = r.ms;
        out.applyReturn = r.applyReturn;
        out.verifyReturn = r.verifyReturn;
        out.summaryCount = r.summaries.length;
        if (r.summaries.length > 0) {
            out.pairs = pairsOf(r.summaries[0]);
            out.note = r.summaries[0].note;
            out.detailCount = r.summaries[0].details.length;
            out.shownRows = BTE.Summary.visiblePairs(r.summaries[0].pairs).length;
        }
        texts = readGroups(groups);
        for (i = 0; i < texts.length; i++) {
            want = ["ABC", pad3(i + 1), "Série 2026"];
            if (texts[i].join("|") !== want.join("|")) { bad.push(i + 1 + ": " + texts[i].join("|")); }
        }
        out.wrongElements = bad.length;
        out.firstWrong = bad.slice(0, 5);
        out.first = texts[0].join(" | ");
        out.second = texts[1].join(" | ");
        out.last = texts[239].join(" | ");
    }

    function lockedPart() {
        var groups = buildSheet(3), r, texts, locked;
        // the {kód} text of prefab 2 is locked after the sheet is built
        locked = groups[1].textFrames[2];
        locked.locked = true;
        app.redraw();
        r = runMain({});
        out.calls = r.calls;
        out.preview = r.preview;
        out.alerts = r.alerts;
        out.logged = r.logged;
        out.verifyReturn = r.verifyReturn;
        out.applyReturn = r.applyReturn;
        if (r.summaries.length > 0) {
            out.pairs = pairsOf(r.summaries[0]);
            out.details = r.summaries[0].details;
            out.expectedSkipLine = BTE.UIModel.SYMBOL.WARN + " " + BTE.L.count("SKIP_LOCKED", 1);
        }
        locked.locked = false;
        texts = readGroups(groups);
        out.texts = [texts[0].join(" | "), texts[1].join(" | "), texts[2].join(" | ")];
    }

    // The 15th write throws, as a DOM error would.
    function failDomPart() {
        var groups = buildSheet(20), r, texts, calls = 0, origWriteEdit = BTE.Write.writeEdit, i, changed = 0;
        BTE.Write.writeEdit = function (tf, e, s) {
            calls++;
            if (calls === 15) { throw new Error("Simulated DOM failure: the value would result in an illegal text range."); }
            return origWriteEdit(tf, e, s);
        };
        try {
            r = runMain({});
        } finally {
            BTE.Write.writeEdit = origWriteEdit;
        }
        out.calls = r.calls;
        out.alerts = r.alerts;
        out.logged = r.logged;
        out.writeEditCalls = calls;
        out.summaryCount = r.summaries.length;
        if (r.summaries.length > 0) {
            out.pairs = pairsOf(r.summaries[0]);
            out.note = r.summaries[0].note;
            out.details = r.summaries[0].details;
            out.summaryHasDetail = j(r.summaries[0]).indexOf("Simulated DOM failure") !== -1;
        }
        texts = readGroups(groups);
        for (i = 0; i < texts.length; i++) { if (texts[i][0] === "ABC") { changed++; } }
        out.elementsWithAbc = changed;
        out.expectedMessage = BTE.L.format(BTE.L.countForm("ERR_WRITE_AT", 14), 15, 14);
    }

    // The document drifts from the preview after the dialog: element 10's
    // first text is changed by hand. No wrapper.
    function failDriftPart() {
        var groups = buildSheet(20), r, texts, i, changed = 0;
        r = runMain({
            afterShow: function () { groups[9].textFrames[2].contents = "{kód}!"; }
        });
        out.calls = r.calls;
        out.alerts = r.alerts;
        out.logged = r.logged;
        out.summaryCount = r.summaries.length;
        if (r.summaries.length > 0) {
            out.pairs = pairsOf(r.summaries[0]);
            out.note = r.summaries[0].note;
            out.details = r.summaries[0].details;
        }
        texts = readGroups(groups);
        for (i = 0; i < texts.length; i++) { if (texts[i][0] === "ABC") { changed++; } }
        out.elementsWithAbc = changed;
        out.element10 = texts[9].join(" | ");
        out.expectedMessage = BTE.L.format(BTE.L.countForm("ERR_WRITE_AT", 9), 10, 9);
    }

    // Widths in the dialog's own font: the note of the summary is a single
    // unwrapped line of 500 px; the labels sit in a column of 150 px.
    function notePart() {
        var w = new Window("dialog", "probe"), L = BTE.L, S = BTE.Summary, keys, i, st, res = {}, max = 0;
        w.orientation = "column";
        keys = ["SUM_MISMATCH_NOTE", "SUM_STOPPED", "SUM_ALL_OK", "SUM_CHANGED_ELEMENTS", "SUM_CHANGED_TEXTS", "SUM_SKIPPED", "SUM_MISMATCH", "SUM_ERRORS"];
        for (i = 0; i < keys.length; i++) {
            st = w.add("statictext", undefined, L[keys[i]]);
            res[keys[i]] = Math.round(st.graphics.measureString(L[keys[i]])[0]);
        }
        out.widths = res;
        out.limits = { note: S.NOTE_W, label: S.LABEL_W };
        out.locale = L.DEC_SEP === "," ? "cs" : "en";
        for (i = 0; i < keys.length; i++) { if (keys[i].indexOf("NOTE") !== -1 || keys[i] === "SUM_STOPPED" || keys[i] === "SUM_ALL_OK") { max = Math.max(max, res[keys[i]]); } }
        out.widestNote = max;
        w.close();
    }

    if (!fresh || typeof BTE === "undefined" || !BTE.Write || !BTE.Scope || !BTE.UIModel || !BTE.Summary || mainPath === "") {
        return "probe_e2e: run it behind the header in Usage (resets BTE, sets BTE_PROBE_FRESH and MAIN_PATH, then the modules)";
    }
    out.locale = BTE.L.DEC_SEP === "," ? "cs" : "en";
    try {
        if (part === "main") { mainPart(); }
        else if (part === "locked") { lockedPart(); }
        else if (part === "fail-dom") { failDomPart(); }
        else if (part === "fail-drift") { failDriftPart(); }
        else if (part === "note") { notePart(); }
        else { out.notes.push("unknown PART \"" + part + "\""); }
    } catch (e) {
        out.FAILED = e.message + " (line " + e.line + ")";
    } finally {
        if (d) {
            try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.notes.push("close failed: " + e2.message); }
        }
    }
    out.documentsAtEnd = app.documents.length;
    return j(out);
})();
