// ------------------------------------------------------------------------
// Script:      probe_manual.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-11-10
// Description: The manual test (docs/manual-test.md) driven by a probe, for
//              every step that needs no human eye. Opens a COPY of one of
//              the user's three test files, builds the real dialog
//              (BTE.UI.build) without showing it, drives its controls the
//              way the test does (field text + onChanging/onChange, dropdown
//              selection, onClick), clicks Použít after BTE.UI.HOLD_MS and
//              runs the real src/main.js on what the dialog hands back; only
//              the summary window is captured instead of shown. The written
//              document is read back by POSITION (reading order from the
//              text frames' centres, aršíky from the group above the
//              sticker), not from the tool's own order, and every text's
//              font, size, colour and anchor is compared before and after.
//              What it cannot do: Cmd+Z (an undo inside a probe stalled
//              Illustrator, 2026-10-29), a real click or Enter, and anything
//              that is only a look (colour, glyph, truncation on screen).
//              The settings file is a file of the probe's own
//              (BTE.Storage.getFile), the log goes to the temp folder
//              (BTE.Utils.LOG_FOLDER), and alert/confirm/prompt are locals of
//              the wrapper (the globals cannot be reassigned, measured
//              2026-11-10), so no window ever opens. One document per part,
//              closed unsaved (part run1 saves its written copy to WORK_DIR
//              for part run2). At most one write per part.
//              Parts: dialog (1.0-1.5, 9.1), run1 (2.1-2.5), run2 (3.1-3.3),
//              presets (8.1-8.4), controls (6.2, 6.6-6.8), tick (6.5 logic),
//              locked (7.2), arch51 (5.2, 5.1), nogroups (5.3, 5.4),
//              artboard (5.5), a101, a102, a103 (10.1-10.3), a104 (10.4,
//              10.6), a105 (10.5).
// Usage:       From the repo root, with 0 open documents, one part per run;
//              the wrapper makes alert/confirm/prompt local stubs:
//                  P=batch-text-edit; R="$PWD"
//                  { echo '(function () {'
//                    echo 'var STUB = { alerts: [], confirms: [], prompts: [], confirmAnswer: false, promptAnswer: null };'
//                    echo 'var alert = function (s) { STUB.alerts.push(String(s)); };'
//                    echo 'var confirm = function (s) { STUB.confirms.push(String(s)); return STUB.confirmAnswer; };'
//                    echo 'var prompt = function (s) { STUB.prompts.push(String(s)); return STUB.promptAnswer; };'
//                    echo "var PART = \"$PART\", MAIN_PATH = \"$R/$P/src/main.js\";"
//                    echo "var FILES_DIR = \"$FILES\", WORK_DIR = \"$WORK\", SETTINGS_PATH = \"$SETTINGS\";"
//                    echo 'var BTE;'
//                    cat shared/lib/json2.js $P/src/locale.js $P/src/lib/utils.js shared/lib/ui_state.js
//                    echo 'buildUIState(BTE);'
//                    cat shared/lib/numbers.js; echo 'buildNumbers(BTE);'
//                    cat shared/lib/field_paint.js; echo 'buildFieldPaint(BTE);'
//                    cat shared/lib/summary.js; echo 'buildSummary(BTE);'
//                    cat $P/src/config.js $P/src/lib/storage.js $P/src/vars.js $P/src/steps.js \
//                        $P/src/order.js $P/src/element.js $P/src/ui_model.js $P/src/scope.js \
//                        $P/src/write.js $P/src/ui.js $P/tests/probes/probe_manual.jsx
//                    echo 'return probeManual(STUB);'
//                    echo '})();'
//                  } > "$TMPDIR/probe_manual_run.jsx"
//                  tools/ai-eval.sh -t 900 "$TMPDIR/probe_manual_run.jsx"
//              FILES holds copies of Zund_Summa_Test_geoup.ai, „…geoup
//              arch.ai“ and Zund_Summa_Test.ai; WORK is a scratch folder;
//              SETTINGS the settings file the part reads and writes (run1,
//              run2 and presets share one; the others start from the one
//              the part writes itself). The result is one JSON string; every
//              check carries `pass`.
// ------------------------------------------------------------------------
function probeManual(STUB) {
    if (app.documents.length !== 0) { return "PRERUSENO: otevrene dokumenty"; }

    var out = { part: PART, app: app.version, locale: app.locale, checks: {}, notes: [], timings: {} };
    var doc = null;
    var L = BTE.L, C = BTE.Config, U = BTE.UI, Model = BTE.UIModel, SYM = BTE.UIModel.SYMBOL;
    var DOT = " " + String.fromCharCode(183) + " ";
    var GEO = "Zund_Summa_Test_geoup.ai", ARCH = "Zund_Summa_Test_geoup arch.ai", BARE = "Zund_Summa_Test.ai";
    var realGetFile = BTE.Storage.getFile;
    var settingsPath = SETTINGS_PATH;
    var snap = null;

    // ---- plumbing ------------------------------------------------------------
    function now() { return new Date().getTime(); }
    function hex(n) { var x = n.toString(16); while (x.length < 4) { x = "0" + x; } return x; }
    function ascii(s) {
        var r = "", i, code;
        s = String(s);
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
    function has(s, part) { return String(s).indexOf(part) !== -1; }
    function fmt3(n) { var s = String(n); while (s.length < 3) { s = "0" + s; } return s; }
    function sym(kind) { return SYM[kind] + " "; }
    // One check in a try of its own: a failure is a failed check, the part goes on.
    function check(name, fn) {
        var r;
        try {
            r = fn();
            if (r === undefined || r === null) { r = { pass: false, error: "check returned nothing" }; }
        } catch (e) {
            r = { pass: false, error: ascii(e.message + " (line " + e.line + ")") };
        }
        out.checks[name] = r;
        return r;
    }

    function readFile(path) {
        var f = new File(path), s = null;
        if (!f.exists) { return null; }
        f.encoding = "UTF-8";
        if (f.open("r")) { s = f.read(); f.close(); }
        return s;
    }
    function writeFile(path, s) {
        var f = new File(path);
        f.encoding = "UTF-8";
        if (!f.open("w")) { throw new Error("cannot write " + path); }
        f.write(s);
        f.close();
    }
    function useSettings(path) {
        settingsPath = path;
        BTE.Storage.getFile = function () { return new File(settingsPath); };
    }
    function settings() { var s = readFile(settingsPath); return s === null ? null : JSON.parse(s); }

    // BTE.Utils.log builds its folder under Folder.userData; "../" climbs to /.
    function redirectLog() {
        var depth = Folder.userData.fsName.split("/").length - 1, up = "", i;
        for (i = 0; i < depth; i++) { up += "../"; }
        BTE.Utils.LOG_FOLDER = up + WORK_DIR.substring(1);
        BTE.Utils.LOG_FILE = "bte_manual_" + PART + ".log";
        return WORK_DIR + "/" + BTE.Utils.LOG_FILE;
    }

    function openDoc(path) {
        var pdf = null, level = null, t = now();
        try { pdf = { c: app.preferences.PDFFileOptions.pDFCropToBox, p: app.preferences.PDFFileOptions.pageToOpen }; } catch (e1) { out.notes.push("pdf opts: " + e1.message); }
        level = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        try {
            doc = app.open(new File(path));
        } finally {
            app.userInteractionLevel = level;
            try { if (pdf) { app.preferences.PDFFileOptions.pDFCropToBox = pdf.c; app.preferences.PDFFileOptions.pageToOpen = pdf.p; } } catch (e2) { out.notes.push("pdf restore: " + e2.message); }
        }
        out.timings.openMs = now() - t;
        app.redraw();
        return doc;
    }
    function openCopy(name) { return openDoc(FILES_DIR + "/" + name); }

    // ---- presets as the files hold them --------------------------------------
    function R(where, rep) { return { type: "replace", active: true, where: where, replace: rep, matchCase: false, firstOnly: false }; }
    function N(where, from, digits) {
        return { type: "number", active: true, where: where, from: from, to: "", step: "1", digits: digits, repeats: "1", reset: "", format: "1" };
    }
    function V(name) { return { kind: "var", text: name }; }
    // „Samolepky“ of test 2.1 in the 1.0.0 format (no bySheet, no perSheet).
    function samolepky10(from) {
        return { order: "rows", steps: [R(V("{NORDIC CZ}"), "SNB CZ"), N(V("{n}"), from, "3")] };
    }
    // „Samolepky“ as 1.1.0 saves it.
    function samolepky11() {
        var p = samolepky10("1");
        p.bySheet = false;
        p.steps[1].perSheet = false;
        return p;
    }
    function writeSettings(active, last) {
        var data = { activePreset: active, presets: {} };
        data.presets[C.PRESET_KEY_LAST] = last;
        data.presets.Samolepky = samolepky11();
        writeFile(settingsPath, JSON.stringify(data));
    }

    // ---- the dialog --------------------------------------------------------------
    function build() {
        var t = now(), dlg = U.build(doc);
        dlg.buildMs = now() - t;
        return dlg;
    }
    function commit(et, text) { et.text = text; et.onChanging(); et.onChange(); }
    function typeOnly(et, text) { et.text = text; et.onChanging(); }
    function itemTexts(dd) {
        var a = [], i;
        for (i = 0; i < dd.items.length; i++) { a.push(dd.items[i].type === "separator" ? "---" : String(dd.items[i].text)); }
        return a;
    }
    function pick(dd, prefix) {
        var i;
        for (i = 0; i < dd.items.length; i++) {
            if (dd.items[i].type !== "separator" && String(dd.items[i].text).indexOf(prefix) === 0) {
                dd.selection = i;   // a programmatic selection fires onChange (measured)
                return i;
            }
        }
        throw new Error("no item starting with " + ascii(prefix) + " in " + ascii(itemTexts(dd).join(" / ")));
    }
    function selectStep(dlg, i) { dlg.refs.lbSteps.selection = i; }
    function setType(dlg, type) { dlg.refs.ddType.selection = BTE.Utils.indexOf(U.TYPES, type); }
    function addStep(dlg, type) {
        dlg.refs.ddAddType.selection = BTE.Utils.indexOf(U.TYPES, type);
        dlg.refs.btnAdd.onClick();
    }
    function tick(cb, on) { cb.value = on; cb.onClick(); }
    function rows(dlg) {
        var lb = dlg.refs.lbPrev, a = [], i, it;
        for (i = 0; i < lb.items.length; i++) {
            it = lb.items[i];
            a.push([String(it.text), String(it.subItems[0].text), String(it.subItems[1].text), String(it.subItems[2].text)]);
        }
        return a;
    }
    function msgs(dlg) { return String(dlg.refs.etMsgs.text); }
    function status(dlg) { return String(dlg.refs.stStatus.text); }
    function presetText(dlg) { var s = dlg.refs.ddPreset.selection; return s ? String(s.text) : null; }
    function stepLabels(dlg) { var a = [], i; for (i = 0; i < dlg.refs.lbSteps.items.length; i++) { a.push(String(dlg.refs.lbSteps.items[i].text)); } return a; }
    // Použít after the hold window, as a user who looked at the preview.
    function apply(dlg) {
        $.sleep(U.HOLD_MS + 150);
        dlg.refs.btnOk.onClick();
        return dlg.result();
    }
    // The ↺ of the manual test: back to the active preset.
    function revert(dlg) { dlg.refs.btnRevert.onClick(); }
    // Each column of the preview from row a to row b (1-based), as one string.
    function col(rs, c, a, b) { var s = [], i; for (i = a - 1; i < b && i < rs.length; i++) { s.push(rs[i][c]); } return s; }
    function allEqual(list, v) { var i; for (i = 0; i < list.length; i++) { if (list[i] !== v) { return false; } } return true; }

    // ---- main.js, with the dialog driven by `drive` -----------------------------
    function runMain(drive) {
        var r = { summaries: [], alerts: [], ms: 0, dialog: null, notes: null };
        var realShow = U.show, realSummary = BTE.Summary.show, src, f, t;
        f = new File(MAIN_PATH);
        f.encoding = "UTF-8";
        if (!f.open("r")) { throw new Error("cannot read " + MAIN_PATH); }
        src = f.read();
        f.close();
        U.show = function (d) {
            var dlg = build();
            r.dialog = dlg;
            r.notes = dlg.notes;
            drive(dlg);
            r.applyStart = now();
            return dlg.result();
        };
        BTE.Summary.show = function (o) { r.summaries.push(o); };
        t = now();
        try {
            (new Function("BTE", "app", "alert", src))(BTE, app, function (s) { r.alerts.push(String(s)); });
        } finally {
            U.show = realShow;
            BTE.Summary.show = realSummary;
            r.ms = now() - t;
            if (r.applyStart) { r.writeMs = now() - r.applyStart; }
        }
        return r;
    }
    function pairs(summary) {
        var a = {}, i;
        for (i = 0; i < summary.pairs.length; i++) { a[summary.pairs[i].label] = String(summary.pairs[i].value); }
        return a;
    }
    function summaryOf(r) {
        var s = r.summaries.length > 0 ? r.summaries[0] : null;
        if (!s) { return null; }
        return { pairs: pairs(s), note: s.note, details: s.details };
    }

    // ---- the document, read by position ------------------------------------------
    function colorDesc(c) {
        if (!c) { return "none"; }
        var t = c.typename;
        if (t === "CMYKColor") { return "cmyk " + [c.cyan, c.magenta, c.yellow, c.black].join(","); }
        if (t === "RGBColor") { return "rgb " + [c.red, c.green, c.blue].join(","); }
        if (t === "GrayColor") { return "gray " + c.gray; }
        if (t === "SpotColor") { return "spot " + c.spot.name + " " + c.tint; }
        if (t === "NoColor") { return "nocolor"; }
        return t;
    }
    function charDesc(ch) {
        var a = ch.characterAttributes;
        return [a.textFont.name, a.size, colorDesc(a.fillColor), a.horizontalScale, a.tracking].join("/");
    }
    function centre(b) { return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
    // Every text frame with what it held, where it lies, its format, and the
    // groups above it; plus a fingerprint of everything that is no text.
    function snapshot() {
        var s = { frames: [], contents: [], pos: [], fmt: [], anchor: [], sticker: [], sheet: [], nIdx: [], cIdx: [] };
        var tfs = doc.textFrames, k, tf, chs, p, pp, sum = 0, pi, b;
        for (k = 0; k < tfs.length; k++) {
            tf = tfs[k];
            s.frames.push(tf);
            s.contents.push(String(tf.contents));
            s.pos.push(centre(tf.geometricBounds));
            chs = tf.textRange.characters;
            s.fmt.push(charDesc(chs[0]) + "|" + charDesc(chs[chs.length - 1]));
            s.anchor.push(tf.anchor[0].toFixed(3) + "," + tf.anchor[1].toFixed(3));
            p = tf.parent;
            pp = (p.typename === "GroupItem") ? p.parent : null;
            s.sticker.push(p.typename === "GroupItem" ? p : null);
            s.sheet.push(pp && pp.typename === "GroupItem" ? pp : null);
            // the number and the code, before or after a first run
            if (/^(\{n\}|\d+)$/.test(String(tf.contents))) { s.nIdx.push(k); }
            if (/^(\{NORDIC CZ\}|SNB CZ)$/.test(String(tf.contents))) { s.cIdx.push(k); }
        }
        pi = doc.pathItems;
        for (k = 0; k < pi.length; k++) { b = pi[k].geometricBounds; sum += b[0] + 2 * b[1] + 3 * b[2] + 4 * b[3]; }
        s.paths = pi.length;
        s.pathSum = Math.round(sum * 100) / 100;
        s.groups = doc.groupItems.length;
        s.compound = doc.compoundPathItems.length;
        return s;
    }
    // Format, anchors and the rest of the artwork after a write.
    function unchanged(before) {
        var r = { fmtDiff: [], anchorDiff: [], textCount: doc.textFrames.length }, k, tf, chs, f, a, pi, sum = 0, b;
        for (k = 0; k < before.frames.length; k++) {
            tf = before.frames[k];
            chs = tf.textRange.characters;
            f = charDesc(chs[0]) + "|" + charDesc(chs[chs.length - 1]);
            a = tf.anchor[0].toFixed(3) + "," + tf.anchor[1].toFixed(3);
            if (f !== before.fmt[k] && r.fmtDiff.length < 5) { r.fmtDiff.push(ascii(before.contents[k] + " -> " + tf.contents + ": " + before.fmt[k] + " / " + f)); }
            if (a !== before.anchor[k]) { r.anchorDiff.push(k); }
        }
        pi = doc.pathItems;
        for (k = 0; k < pi.length; k++) { b = pi[k].geometricBounds; sum += b[0] + 2 * b[1] + 3 * b[2] + 4 * b[3]; }
        r.paths = pi.length === before.paths && Math.round(sum * 100) / 100 === before.pathSum;
        r.groups = doc.groupItems.length === before.groups && doc.compoundPathItems.length === before.compound;
        r.fmtOk = r.fmtDiff.length === 0;
        r.anchorOk = r.anchorDiff.length === 0;
        r.anchorDiff = r.anchorDiff.length;
        r.pass = r.fmtOk && r.anchorOk && r.paths && r.groups && r.textCount === before.frames.length;
        return r;
    }
    // Indices of `idx` in reading order: rows top to bottom, each left to
    // right ("rows"), or columns left to right, each top to bottom ("cols").
    function reading(idx, pos, order, tol) {
        var a = idx.slice(), lines = [], cur = null, i, k, res = [];
        var major = order === "rows" ? 1 : 0, minor = order === "rows" ? 0 : 1;
        a.sort(function (p, q) { return order === "rows" ? pos[q][1] - pos[p][1] : pos[p][0] - pos[q][0]; });
        for (i = 0; i < a.length; i++) {
            if (cur === null || Math.abs(pos[a[i]][major] - cur.at) > tol) { cur = { at: pos[a[i]][major], items: [] }; lines.push(cur); }
            cur.items.push(a[i]);
        }
        for (i = 0; i < lines.length; i++) {
            lines[i].items.sort(function (p, q) { return order === "rows" ? pos[p][0] - pos[q][0] : pos[q][1] - pos[p][1]; });
            for (k = 0; k < lines[i].items.length; k++) { res.push(lines[i].items[k]); }
        }
        return res;
    }
    // What the frames hold now, in the given order of snapshot indices.
    function contentsIn(order) { var a = [], i; for (i = 0; i < order.length; i++) { a.push(String(snap.frames[order[i]].contents)); } return a; }
    // Compares `got` with `want`; the first differences.
    function compare(got, want) {
        var bad = [], i;
        for (i = 0; i < Math.max(got.length, want.length); i++) {
            if (got[i] !== want[i]) { bad.push((i + 1) + ": " + ascii(got[i]) + " (want " + ascii(want[i]) + ")"); }
        }
        return { wrong: bad.length, first: bad.slice(0, 5) };
    }
    // The sheets (the group above each sticker) in reading order, each with
    // its number texts in reading order.
    function sheetsInOrder() {
        var keys = [], groups = {}, centres = [], i, k, g, key, b, sheetIdx, order, res = [];
        for (i = 0; i < snap.nIdx.length; i++) {
            k = snap.nIdx[i];
            g = snap.sheet[k];
            if (!g) { throw new Error("number text " + k + " has no sheet group"); }
            b = g.geometricBounds;
            key = b.join(",");
            if (!groups[key]) { groups[key] = []; keys.push(key); centres.push(centre(b)); }
            groups[key].push(k);
        }
        sheetIdx = [];
        for (i = 0; i < keys.length; i++) { sheetIdx.push(i); }
        order = reading(sheetIdx, centres, "rows", 100);
        for (i = 0; i < order.length; i++) {
            res.push({ centre: centres[order[i]], numbers: reading(groups[keys[order[i]]], snap.pos, "rows", 40) });
        }
        return res;
    }

    // =============================================================================
    // Parts
    // =============================================================================

    // 1.0-1.5 and 9.1 on …geoup.ai; nothing is written.
    function partDialog() {
        var base = settingsPath, dlg, t;
        openCopy(GEO);

        // 1.0: a settings file from 1.0.0 (no bySheet, no perSheet), the last
        // run equal to „Samolepky“, then one that differs.
        useSettings(base + ".v10.json");
        writeFile(settingsPath, JSON.stringify((function () {
            var d = { activePreset: "Samolepky", presets: {} };
            d.presets[C.PRESET_KEY_LAST] = samolepky10("1");
            d.presets.Samolepky = samolepky10("1");
            return d;
        })()));
        t = now();
        dlg = build();
        out.timings.firstBuildMs = now() - t;
        check("1.0 same", function () {
            var r = { notes: dlg.notes.length, preset: ascii(presetText(dlg)), bySheet: dlg.refs.cbBySheet.value,
                perSheet: dlg.refs.ed.number.cbPerSheet.value, steps: dlg.state.steps.length, from: dlg.refs.ed.number.fields.from.text };
            r.pass = r.notes === 0 && presetText(dlg) === "Samolepky" && r.bySheet === false && r.steps === 2;
            return r;
        });
        dlg.win.close();
        writeFile(settingsPath, JSON.stringify((function () {
            var d = { activePreset: "Samolepky", presets: {} };
            d.presets[C.PRESET_KEY_LAST] = samolepky10("5");
            d.presets.Samolepky = samolepky10("1");
            return d;
        })()));
        dlg = build();
        check("1.0 differs", function () {
            var r = { notes: dlg.notes.length, preset: ascii(presetText(dlg)), revert: dlg.refs.btnRevert.enabled };
            r.pass = r.notes === 0 && presetText(dlg) === "Samolepky *" && r.revert === true;
            return r;
        });
        dlg.win.close();
        check("1.0 file untouched", function () {
            var s = readFile(settingsPath);
            return { pass: s !== null && s.indexOf("bySheet") === -1 };
        });

        // 1.1-1.5: first run, no settings file.
        useSettings(base + ".fresh.json");
        dlg = build();
        out.timings.buildMs = dlg.buildMs;
        check("1.1", function () {
            var w = dlg.win, R = dlg.refs, acc = [], drops = [], foot = footer(w), r;
            liftAll(w);
            w.layout.layout(true);
            clipped(w, acc, drops);
            r = { title: ascii(w.text), kind: dlg.state.kind, kindRb: R.rbKind[2].value, scope: ascii(R.stScope.text), bySheet: R.cbBySheet.value,
                footer: ascii(foot), window: [w.size.width, w.size.height], screens: screens(), clipped: acc, drops: drops };
            r.pass = w.text === "Batch Text Edit v1.1.0" && dlg.state.kind === "document" && R.rbKind[2].value === true &&
                String(R.stScope.text) === "240 prvků, 480 textů" && R.cbBySheet.value === false &&
                foot === String.fromCharCode(169) + " 2025–2026 Ladislav Osvald · v1.1.0" && acc.length === 0;
            return r;
        });
        check("1.2", function () {
            var R = dlg.refs, r = { preset: ascii(presetText(dlg)), revert: R.btnRevert.enabled, save: R.btnSave.enabled, del: R.btnDel.enabled,
                steps: dlg.state.steps.length, type: dlg.state.steps[0].type, remove: R.btnRemove.enabled };
            r.pass = presetText(dlg) === L.PRESET_DEFAULT && !r.revert && !r.save && !r.del && r.steps === 1 && r.type === "number" && !r.remove;
            return r;
        });
        check("1.3", function () {
            var items = itemTexts(dlg.refs.ed.number.dd), want = ["{NORDIC CZ}   (240×)", "{n}   (240×)", "---", L.WHERE_FIRST, L.WHERE_TEXT, L.WHERE_REGEX];
            return { items: ascii(items.join(" / ")), pass: items.join("/") === want.join("/") };
        });
        check("1.4", function () {
            var missing = [], tooLong = [], R = dlg.refs, seen = walkTips(dlg.win, R, missing, tooLong);
            return { controls: seen, missing: missing, overTwo: tooLong, okTip: !!R.btnOk.helpTip, cancelTip: !!R.btnCancel.helpTip,
                pass: missing.length === 0 && tooLong.length === 0 && !R.btnOk.helpTip && !R.btnCancel.helpTip };
        });
        check("1.5 wiring", function () {
            var w = dlg.win, R = dlg.refs;
            return { cancelElement: w.cancelElement === R.btnCancel, defaultElement: w.defaultElement === R.btnOk,
                cancelName: R.btnCancel.properties ? R.btnCancel.properties.name : null,
                pass: R.btnCancel.properties && R.btnCancel.properties.name === "cancel" };
        });
        check("9.2 refresh", function () {
            var R = dlg.refs, times = [], i, tb;
            for (i = 0; i < 5; i++) {
                t = now();
                commit(R.ed.number.fields.from, String(2 + i));
                times.push(now() - t);
            }
            t = now();
            tick(R.cbBySheet, true);
            tb = now() - t;
            tick(R.cbBySheet, false);
            times.sort(function (a, b) { return a - b; });
            return { fieldMs: times, medianMs: times[2], bySheetMs: tb, pass: times[2] <= 500 };
        });
        check("1.x no file written", function () { return { pass: readFile(settingsPath) === null }; });
        dlg.win.close();
    }

    // 2.1-2.5 on …geoup.ai, from a first run; the written copy is saved for run2.
    function partRun1() {
        var r, s;
        useSettings(settingsPath);
        openCopy(GEO);
        snap = snapshot();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs;
            check("2.1", function () {
                setType(dlg, "replace");
                pick(R.ed.replace.dd, "{NORDIC CZ}");
                commit(R.ed.replace.etReplace, "SNB CZ");
                addStep(dlg, "number");
                pick(R.ed.number.dd, "{n}");
                commit(R.ed.number.fields.from, "1");
                commit(R.ed.number.fields.digits, "3");
                commit(R.ed.number.fields.to, "");
                rs = rows(dlg);
                return { sel: dlg.state.sel, steps: dlg.state.steps.length, row1: ascii(rs[0].join(" || ")), last: ascii(rs[239].join(" || ")),
                    status: ascii(status(dlg)), msgs: ascii(msgs(dlg)),
                    pass: rs.length === 240 && rs[0][1] === "{NORDIC CZ} | {n}" && rs[0][3] === "SNB CZ | 001" && rs[239][3] === "SNB CZ | 240" &&
                        status(dlg) === sym("OK") + "Změní se 240 z 240 prvků." };
            });
            check("2.2", function () {
                STUB.promptAnswer = "Samolepky";
                R.btnSaveAs.onClick();
                STUB.promptAnswer = null;
                s = settings();
                return { prompts: STUB.prompts.length, preset: ascii(presetText(dlg)), stored: !!(s && s.presets && s.presets.Samolepky),
                    pass: presetText(dlg) === "Samolepky" && !!(s && s.presets.Samolepky && s.presets.Samolepky.steps.length === 2) };
            });
            check("2.3", function () {
                selectStep(dlg, 0);
                rs = rows(dlg);
                return { row1after: ascii(rs[0][2]), pass: rs[0][2] === "SNB CZ | {n}" && rs[0][3] === "SNB CZ | 001" };
            });
            apply(dlg);
        });
        out.timings.mainMs = r.ms;
        out.timings.writeMs = r.writeMs;
        check("2.4", function () {
            var sm = summaryOf(r), cmp, codes;
            cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), (function () { var a = [], i; for (i = 1; i <= 240; i++) { a.push(fmt3(i)); } return a; })());
            codes = contentsIn(snap.cIdx);
            return { alerts: r.alerts, summary: sm ? { pairs: sm.pairs, details: sm.details.length, note: ascii(sm.note || "") } : null, numbers: cmp,
                codesAllSnb: allEqual(codes, "SNB CZ"),
                pass: !!sm && sm.pairs[L.SUM_CHANGED_ELEMENTS] === "240" && sm.pairs[L.SUM_CHANGED_TEXTS] === "480" &&
                    (sm.pairs[L.SUM_MISMATCH] === undefined || sm.pairs[L.SUM_MISMATCH] === "0") && cmp.wrong === 0 && allEqual(codes, "SNB CZ") && r.alerts.length === 0 };
        });
        check("2.5", function () { return unchanged(snap); });
        check("2.x saved for run2", function () {
            var f = new File(WORK_DIR + "/run1.ai"), level = app.userInteractionLevel;
            app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
            try {
                doc.saveAs(f, new IllustratorSaveOptions());
            } finally {
                app.userInteractionLevel = level;
            }
            return { pass: f.exists };
        });
    }

    // 3.1-3.3 on the copy run1 wrote.
    function partRun2() {
        var r;
        useSettings(settingsPath);
        openDoc(WORK_DIR + "/run1.ai");
        snap = snapshot();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs;
            check("3.1", function () {
                var labels = stepLabels(dlg), w1, w2;
                selectStep(dlg, 0);
                w1 = String(R.ed.replace.dd.selection.text);
                selectStep(dlg, 1);
                w2 = String(R.ed.number.dd.selection.text);
                return { find: ascii(w1), where: ascii(w2), labels: ascii(labels.join(" / ")), status: ascii(status(dlg)), ok: R.btnOk.enabled,
                    pass: w1 === "{NORDIC CZ}  " + L.NOT_FOUND && w2 === "{n}  " + L.NOT_FOUND && has(labels[0], SYM.WARN) && has(labels[1], SYM.WARN) &&
                        has(msgs(dlg), L.WARN_NOTHING_FOUND) && status(dlg) === sym("WARN") + L.STATUS_NOTHING && R.btnOk.enabled === false };
            });
            check("3.2", function () {
                selectStep(dlg, 1);
                pick(R.ed.number.dd, L.WHERE_FIRST);
                commit(R.ed.number.fields.from, "101");
                rs = rows(dlg);
                return { first: ascii(rs[0][3]), last: ascii(rs[239][3]), pass: /\| 101$/.test(rs[0][3]) && /\| 340$/.test(rs[239][3]) };
            });
            check("3.3 preview", function () {
                selectStep(dlg, 0);
                pick(R.ed.replace.dd, L.WHERE_TEXT);
                commit(R.ed.replace.et, "SNB CZ");
                commit(R.ed.replace.etReplace, "SNB SK");
                rs = rows(dlg);
                return { row1: ascii(rs[0].join(" || ")), status: ascii(status(dlg)),
                    pass: rs[0][1] === "SNB CZ | 001" && rs[0][3] === "SNB SK | 101" && status(dlg) === sym("OK") + "Změní se 240 z 240 prvků." };
            });
            apply(dlg);
        });
        out.timings.mainMs = r.ms;
        check("3.3 write", function () {
            var sm = summaryOf(r), cmp, codes;
            cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), (function () { var a = [], i; for (i = 101; i <= 340; i++) { a.push(String(i)); } return a; })());
            codes = contentsIn(snap.cIdx);
            return { summary: sm ? sm.pairs : null, numbers: cmp, codesSk: allEqual(codes, "SNB SK"), alerts: r.alerts,
                pass: !!sm && sm.pairs[L.SUM_CHANGED_ELEMENTS] === "240" && sm.pairs[L.SUM_CHANGED_TEXTS] === "480" && cmp.wrong === 0 && allEqual(codes, "SNB SK") };
        });
        check("3.3 format", function () { return unchanged(snap); });
    }

    // 8.1-8.4 on …geoup.ai, with the settings run1 and run2 left; nothing written.
    function partPresets() {
        var dlg, s0;
        useSettings(settingsPath);
        openCopy(GEO);
        s0 = settings();
        dlg = build();
        var R = dlg.refs;
        check("8.1", function () {
            // the last run (3.3) differs from „Samolepky“
            var r = { preset: ascii(presetText(dlg)), from: R.ed.number.fields.from.text, activeInFile: s0 ? s0.activePreset : null };
            selectStep(dlg, 1);
            r.from = R.ed.number.fields.from.text;
            r.pass = presetText(dlg) === "Samolepky *" && r.from === "101";
            return r;
        });
        check("8.2", function () {
            var r = {};
            revert(dlg);
            r.afterRevert = ascii(presetText(dlg));
            selectStep(dlg, 1);
            commit(R.ed.number.fields.from, "7");
            r.changed = ascii(presetText(dlg));
            r.revertOn = R.btnRevert.enabled;
            revert(dlg);
            selectStep(dlg, 1);
            r.reverted = ascii(presetText(dlg));
            r.from = R.ed.number.fields.from.text;
            r.pass = presetText(dlg) === "Samolepky" && r.changed === "Samolepky *" && r.revertOn === true && r.from === "1";
            return r;
        });
        check("8.3", function () {
            var r = {}, before = readFile(settingsPath);
            pick(R.ddPreset, L.PRESET_DEFAULT);
            r.steps = dlg.state.steps.length;
            r.type = dlg.state.steps[0].type;
            r.preset = ascii(presetText(dlg));
            r.del = R.btnDel.enabled;
            commit(R.ed.number.fields.from, "3");
            r.changed = ascii(presetText(dlg));
            STUB.prompts = [];
            STUB.promptAnswer = null;
            R.btnSave.onClick();
            r.prompted = STUB.prompts.length;
            r.fileSame = readFile(settingsPath) === before;
            r.pass = r.steps === 1 && r.type === "number" && r.preset === ascii(L.PRESET_DEFAULT) && r.del === false &&
                r.changed === ascii(L.PRESET_DEFAULT + " *") && r.prompted === 1 && r.fileSame;
            return r;
        });
        check("8.4", function () {
            var r = {}, s;
            pick(R.ddPreset, "Samolepky");
            STUB.confirms = [];
            STUB.confirmAnswer = true;
            R.btnDel.onClick();
            STUB.confirmAnswer = false;
            r.confirm = ascii(STUB.confirms.join(" / "));
            r.list = ascii(itemTexts(R.ddPreset).join(" / "));
            s = settings();
            r.inFile = !!(s && s.presets && s.presets.Samolepky);
            r.pass = STUB.confirms.length === 1 && STUB.confirms[0] === "Smazat předvolbu „Samolepky“? Smazání nejde vrátit." &&
                BTE.Utils.indexOf(itemTexts(R.ddPreset), "Samolepky") === -1 && !r.inFile;
            return r;
        });
        dlg.win.close();
    }

    // 6.2, 6.6, 6.7 (no write), then 6.8 written.
    function partControls() {
        var r;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(GEO);
        snap = snapshot();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs;
            revert(dlg);
            check("6.2", function () {
                var x = {};
                selectStep(dlg, 1);
                R.btnUp.onClick();
                x.afterUp = [dlg.state.steps[0].type, dlg.state.steps[1].type, dlg.state.sel];
                x.previewUp = ascii(rows(dlg)[0][3]);
                R.btnDown.onClick();
                x.afterDown = [dlg.state.steps[0].type, dlg.state.steps[1].type, dlg.state.sel];
                addStep(dlg, "replace");
                x.added = [dlg.state.steps.length, dlg.state.sel];
                R.btnRemove.onClick();
                x.removed = dlg.state.steps.length;
                x.labels = ascii(stepLabels(dlg).join(" / "));
                x.preview = ascii(rows(dlg)[0][3]);
                x.pass = x.afterUp.join() === "number,replace,0" && x.afterDown.join() === "replace,number,1" && x.added.join() === "3,2" &&
                    x.removed === 2 && rows(dlg)[0][3] === "SNB CZ | 001";
                return x;
            });
            check("6.6", function () {
                var x = {}, et = R.ed.number.fields.from;
                selectStep(dlg, 1);
                typeOnly(et, "1O");
                R.btnOk.onClick();
                x.closed = dlg.result() !== null;
                x.status = ascii(status(dlg));
                x.label = ascii(stepLabels(dlg)[1]);
                x.ok = R.btnOk.enabled; x.save = R.btnSave.enabled; x.saveAs = R.btnSaveAs.enabled;
                x.hint = has(msgs(dlg), L.HOLD_HINT);
                try { x.pen = et.graphics.foregroundColor ? String(et.graphics.foregroundColor.color) : null; } catch (ep) { x.pen = "unreadable: " + ep.message; }
                commit(et, "1");
                x.back = { ok: R.btnOk.enabled, saveAs: R.btnSaveAs.enabled, status: ascii(status(dlg)) };
                try { x.penBack = et.graphics.foregroundColor ? String(et.graphics.foregroundColor.color) : null; } catch (ep2) { x.penBack = "unreadable: " + ep2.message; }
                x.pass = !x.closed && status(dlg) !== "" && x.status.indexOf(ascii(SYM.ERR)) === 0 && x.label.indexOf(ascii(SYM.ERR)) !== -1 &&
                    !x.ok && !x.save && !x.saveAs && !x.hint && x.back.ok && x.back.saveAs && x.back.status.indexOf(ascii(SYM.OK)) === 0;
                return x;
            });
            check("6.7", function () {
                var x = {}, cut = sym("WARN") + "Krok 2: 10 prvků zůstane beze změny, řada končí na Do 230.", left = sym("WARN") + "10 prvků má po posledním kroku dál {n}.";
                selectStep(dlg, 1);
                commit(R.ed.number.fields.to, "230");
                rs = rows(dlg);
                x.status = ascii(status(dlg));
                x.msgs = ascii(msgs(dlg));
                x.r230 = ascii(rs[229][3]); x.r231 = ascii(rs[230][3]); x.r240 = ascii(rs[239][3]);
                x.ok = R.btnOk.enabled;
                x.cutShown = has(msgs(dlg), cut); x.leftShown = has(msgs(dlg), left);
                x.tail = allEqual(col(rs, 3, 231, 240), "SNB CZ | {n}");
                commit(R.ed.number.fields.to, "");
                x.afterClear = { cut: has(msgs(dlg), "řada končí"), left: has(msgs(dlg), "po posledním kroku"), status: ascii(status(dlg)) };
                x.pass = status(dlg) === sym("OK") + "Změní se 240 z 240 prvků." && x.status === ascii(sym("WARN") + "Změní se 240 z 240 prvků.") &&
                    x.cutShown && x.leftShown && x.tail && rs[229][3] === "SNB CZ | 230" && x.ok && !x.afterClear.cut && !x.afterClear.left;
                return x;
            });
            check("6.8 preview", function () {
                selectStep(dlg, 1);
                addStep(dlg, "case");
                pick(R.ed["case"].dd, L.WHERE_ALL);
                pick(R.ed["case"].ddMode, L.MODE_LOWER);
                rs = rows(dlg);
                return { steps: dlg.state.steps.length, row1: ascii(rs[0][3]), pass: dlg.state.steps.length === 3 && rs[0][3] === "snb cz | 001" };
            });
            apply(dlg);
        });
        check("6.8 write", function () {
            var cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), (function () { var a = [], i; for (i = 1; i <= 240; i++) { a.push(fmt3(i)); } return a; })());
            var codes = contentsIn(snap.cIdx), sm = summaryOf(r);
            return { numbers: cmp, codesLower: allEqual(codes, "snb cz"), summary: sm ? sm.pairs : null, alerts: r.alerts,
                pass: cmp.wrong === 0 && allEqual(codes, "snb cz") && !!sm && sm.pairs[L.SUM_CHANGED_ELEMENTS] === "240" };
        });
        check("6.8 format", function () { return unchanged(snap); });
    }

    // 6.5 as logic only: step 1's tick cleared in the list without any event
    // (the worst case), then Použít.
    function partTick() {
        var r, firstClick = {};
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(GEO);
        snap = snapshot();
        r = runMain(function (dlg) {
            var R = dlg.refs;
            revert(dlg);
            selectStep(dlg, 1);
            commit(R.ed.number.fields.from, "6");
            $.sleep(U.HOLD_MS + 150);
            R.lbSteps.items[0].checked = false;   // no event fires
            R.btnOk.onClick();
            firstClick = { closed: dlg.result() !== null, hint: has(msgs(dlg), L.HOLD_HINT), active0: dlg.state.steps[0].active,
                preview: ascii(rows(dlg)[0][3]) };
            apply(dlg);
        });
        check("6.5 logic", function () {
            var cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), (function () { var a = [], i; for (i = 6; i <= 245; i++) { a.push(fmt3(i)); } return a; })());
            var codes = contentsIn(snap.cIdx);
            return { firstClick: firstClick, numbers: cmp, codesKept: allEqual(codes, "{NORDIC CZ}"),
                pass: firstClick.closed === false && firstClick.hint === true && firstClick.active0 === false && cmp.wrong === 0 && allEqual(codes, "{NORDIC CZ}") };
        });
    }

    // 7.2: one {NORDIC CZ} locked.
    function partLocked() {
        var r, lockedK, sibling = null, i, g;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(GEO);
        snap = snapshot();
        lockedK = snap.cIdx[7];
        g = snap.sticker[lockedK];
        for (i = 0; i < snap.nIdx.length; i++) { if (snap.sticker[snap.nIdx[i]] === g) { sibling = snap.nIdx[i]; } }
        snap.frames[lockedK].locked = true;
        r = runMain(function (dlg) {
            revert(dlg);
            check("7.2 dialog", function () {
                var sc = String(dlg.refs.stScope.text), tail = " · přeskočené texty: 1";
                return { scope: ascii(sc), pass: sc.length > tail.length && sc.substring(sc.length - tail.length) === tail };
            });
            apply(dlg);
        });
        check("7.2 write", function () {
            var sm = summaryOf(r), lockedNow = String(snap.frames[lockedK].contents), sib = sibling === null ? null : String(snap.frames[sibling].contents), det;
            det = sm ? ascii(j(sm.details)) : "";
            snap.frames[lockedK].locked = false;
            return { summary: sm ? sm.pairs : null, details: det, locked: ascii(lockedNow), sibling: ascii(sib), alerts: r.alerts,
                pass: !!sm && sm.pairs[L.SUM_SKIPPED] === "1" && det.indexOf(ascii(SYM.WARN)) !== -1 && lockedNow === "{NORDIC CZ}" && sib !== null && /^\d{3}$/.test(sib) };
        });
    }

    // 5.2 (Storno) and 5.1 (written) on …arch.ai.
    function partArch51() {
        var r, sheets, topLeft = null, dlg;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(ARCH);
        snap = snapshot();
        sheets = sheetsInOrder();
        topLeft = snap.sheet[sheets[0].numbers[0]];
        doc.selection = [topLeft];
        dlg = build();
        check("5.2", function () {
            var rs;
            revert(dlg);
            rs = rows(dlg);
            return { kind: dlg.state.kind, scope: ascii(dlg.refs.stScope.text), first: ascii(rs[0][3]), last: ascii(rs[rs.length - 1][3]), n: rs.length,
                pass: dlg.state.kind === "selection" && String(dlg.refs.stScope.text) === "12 prvků, 24 textů" && rs.length === 12 &&
                    rs[0][3] === "SNB CZ | 001" && rs[11][3] === "SNB CZ | 012" };
        });
        dlg.win.close();
        doc.selection = null;
        r = runMain(function (d2) { revert(d2); apply(d2); });
        check("5.1", function () {
            var want = [], i, cmp, tl;
            for (i = 1; i <= 240; i++) { want.push(fmt3(i)); }
            cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), want);
            tl = contentsIn(sheets[0].numbers);
            return { numbers: cmp, topLeftSheet: tl.join(" "), summary: summaryOf(r) ? summaryOf(r).pairs : null,
                pass: cmp.wrong === 0 && tl.slice(0, 6).join(" ") === "001 002 003 013 014 015" };
        });
    }

    // 5.3 (Storno) and 5.4 (Po sloupcích, written) on Zund_Summa_Test.ai.
    function partNoGroups() {
        var r, dlg;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(BARE);
        snap = snapshot();
        dlg = build();
        out.timings.bareBuildMs = dlg.buildMs;
        check("5.3", function () {
            var rs;
            revert(dlg);
            rs = rows(dlg);
            return { scope: ascii(dlg.refs.stScope.text), allPairs: allEqual(col(rs, 1, 1, 240), "{NORDIC CZ} | {n}"), multi: has(msgs(dlg), "shod"),
                pass: String(dlg.refs.stScope.text) === "240 prvků, 480 textů" && rs.length === 240 && allEqual(col(rs, 1, 1, 240), "{NORDIC CZ} | {n}") && !has(msgs(dlg), "shod") };
        });
        dlg.win.close();
        r = runMain(function (d2) {
            revert(d2);
            d2.refs.rbOrder[1].value = true;
            d2.refs.rbOrder[1].onClick();
            apply(d2);
        });
        check("5.4", function () {
            var want = [], i, cmp, pairOk = 0, k, g, best, dist, n;
            for (i = 1; i <= 240; i++) { want.push(fmt3(i)); }
            cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "cols", 40)), want);
            // every code text has its number right under it: the nearest number text
            // lies in the same column, below
            for (i = 0; i < snap.cIdx.length; i++) {
                k = snap.cIdx[i]; best = null;
                for (n = 0; n < snap.nIdx.length; n++) {
                    g = snap.nIdx[n];
                    dist = Math.abs(snap.pos[g][0] - snap.pos[k][0]) + Math.abs(snap.pos[g][1] - snap.pos[k][1]);
                    if (best === null || dist < best.d) { best = { d: dist, k: g }; }
                }
                if (String(snap.frames[k].contents) === "SNB CZ" && /^\d{3}$/.test(String(snap.frames[best.k].contents))) { pairOk++; }
            }
            return { numbers: cmp, pairs: pairOk, summary: summaryOf(r) ? summaryOf(r).pairs : null, pass: cmp.wrong === 0 && pairOk === 240 };
        });
    }

    // 5.5: a second artboard over the left half of the sheet, made active.
    function partArtboard() {
        var dlg, ab, rect, xs = [], i, split, want = 0, k, cx;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(GEO);
        snap = snapshot();
        for (i = 0; i < snap.nIdx.length; i++) { xs.push(snap.pos[snap.nIdx[i]][0]); }
        xs.sort(function (a, b) { return a - b; });
        split = (xs[119] + xs[120]) / 2;
        rect = doc.artboards[0].artboardRect;
        ab = doc.artboards.add([rect[0], rect[1], split, rect[3]]);
        doc.artboards.setActiveArtboardIndex(1);
        for (i = 0; i < snap.nIdx.length; i++) {
            k = snap.nIdx[i];
            cx = centre(snap.sticker[k].geometricBounds)[0];
            if (cx < split) { want++; }
        }
        dlg = build();
        check("5.5", function () {
            var R = dlg.refs, n;
            R.rbKind[1].value = true;
            R.rbKind[1].onClick();
            n = dlg.state.prepared.elements.length;
            return { kind: dlg.state.kind, elements: n, want: want, scope: ascii(R.stScope.text), pass: dlg.state.kind === "artboard" && n === want && want === 120 };
        });
        dlg.win.close();
    }

    // 10.1-10.3: one write each.
    function partA101() {
        var r;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(ARCH);
        snap = snapshot();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs;
            revert(dlg);
            selectStep(dlg, 1);
            commit(R.ed.number.fields.to, "100");
            rs = rows(dlg);
            check("10.1 preview", function () {
                var cut = sym("WARN") + "Krok 2: 140 prvků zůstane beze změny, řada končí na Do 100.", left = sym("WARN") + "140 prvků má po posledním kroku dál {n}.";
                return { r1: ascii(rs[0][3]), r100: ascii(rs[99][3]), r101: ascii(rs[100][3]), msgs: ascii(msgs(dlg)), ok: R.btnOk.enabled,
                    pass: rs[0][3] === "SNB CZ | 001" && rs[99][3] === "SNB CZ | 100" && allEqual(col(rs, 3, 101, 240), "SNB CZ | {n}") &&
                        has(msgs(dlg), cut) && has(msgs(dlg), left) && R.btnOk.enabled };
            });
            apply(dlg);
        });
        check("10.1 write", function () {
            var want = [], i, cmp, sm = summaryOf(r), det;
            for (i = 1; i <= 240; i++) { want.push(i <= 100 ? fmt3(i) : "{n}"); }
            cmp = compare(contentsIn(reading(snap.nIdx, snap.pos, "rows", 40)), want);
            det = sm ? j(sm.details) : "";
            return { numbers: cmp, details: ascii(det), summary: sm ? sm.pairs : null,
                pass: cmp.wrong === 0 && det.indexOf(ascii("140 prvků má po posledním kroku dál {n}.")) !== -1 };
        });
    }
    function partA102() {
        var r, sheets;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(ARCH);
        snap = snapshot();
        sheets = sheetsInOrder();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs, t;
            revert(dlg);
            t = now();
            tick(R.cbBySheet, true);
            out.timings.bySheetTickMs = now() - t;
            rs = rows(dlg);
            check("10.2 preview", function () {
                var lb = R.lbPrev, last = rs[239][0], pw = lb.columns.preferredWidths;
                return { scope: ascii(R.stScope.text), n1: ascii(rs[0][0]), n12: ascii(rs[11][0]), n13: ascii(rs[12][0]), n240: ascii(last),
                    hashColW: pw[0], hashTextW: Math.ceil(lb.graphics.measureString(last)[0]),
                    pass: String(R.stScope.text) === "240 prvků, 480 textů, 20 aršíků" && rs[0][0] === "1" + DOT + "1" && rs[11][0] === "1" + DOT + "12" &&
                        rs[12][0] === "2" + DOT + "13" && last === "20" + DOT + "240" };
            });
            apply(dlg);
        });
        check("10.2 write", function () {
            var s, i, want, got, bad = [], firstRows;
            for (s = 0; s < sheets.length; s++) {
                got = contentsIn(sheets[s].numbers);
                want = [];
                for (i = 0; i < got.length; i++) { want.push(fmt3(12 * s + i + 1)); }
                if (got.join() !== want.join()) { bad.push("sheet " + (s + 1) + ": " + got.join(" ")); }
            }
            firstRows = { s1: contentsIn(sheets[0].numbers).join(" "), s2: contentsIn(sheets[1].numbers).slice(0, 3).join(" "), s5: contentsIn(sheets[4].numbers).slice(0, 3).join(" ") };
            return { sheets: sheets.length, wrong: bad.slice(0, 4), firstRows: firstRows, summary: summaryOf(r) ? summaryOf(r).pairs : null,
                pass: sheets.length === 20 && bad.length === 0 && firstRows.s1 === "001 002 003 004 005 006 007 008 009 010 011 012" &&
                    firstRows.s2 === "013 014 015" && firstRows.s5 === "049 050 051" };
        });
    }
    function partA103() {
        var r, sheets;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(ARCH);
        snap = snapshot();
        sheets = sheetsInOrder();
        r = runMain(function (dlg) {
            var R = dlg.refs, rs;
            revert(dlg);
            tick(R.cbBySheet, true);
            selectStep(dlg, 1);
            tick(R.ed.number.cbPerSheet, true);
            commit(R.ed.number.fields.to, "10");
            rs = rows(dlg);
            check("10.3 preview", function () {
                var bad = 0, s, i, cut = sym("WARN") + "Krok 2: 40 prvků zůstane beze změny, řada končí na Do 10.", left = sym("WARN") + "40 prvků má po posledním kroku dál {n}.";
                for (s = 0; s < 20; s++) {
                    for (i = 0; i < 12; i++) {
                        if (rs[12 * s + i][3] !== (i < 10 ? "SNB CZ | " + fmt3(i + 1) : "SNB CZ | {n}")) { bad++; }
                    }
                }
                return { bad: bad, msgs: ascii(msgs(dlg)), ok: R.btnOk.enabled, pass: bad === 0 && has(msgs(dlg), cut) && has(msgs(dlg), left) && R.btnOk.enabled };
            });
            apply(dlg);
        });
        check("10.3 write", function () {
            var s, i, got, want, bad = [];
            for (s = 0; s < sheets.length; s++) {
                got = contentsIn(sheets[s].numbers);
                want = [];
                for (i = 0; i < got.length; i++) { want.push(i < 10 ? fmt3(i + 1) : "{n}"); }
                if (got.join() !== want.join()) { bad.push("sheet " + (s + 1) + ": " + got.join(" ")); }
            }
            return { wrong: bad.slice(0, 4), s1: contentsIn(sheets[0].numbers).join(" "), summary: summaryOf(r) ? summaryOf(r).pairs : null, pass: bad.length === 0 };
        });
    }

    // 10.4 and 10.6 on …arch.ai; nothing written.
    function partA104() {
        var dlg, R, s;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(ARCH);
        dlg = build();
        R = dlg.refs;
        check("10.4", function () {
            var x = {}, rs;
            revert(dlg);
            tick(R.cbBySheet, true);
            selectStep(dlg, 1);
            tick(R.ed.number.cbPerSheet, true);
            tick(R.cbBySheet, false);
            rs = rows(dlg);
            x.perSheet = [R.ed.number.cbPerSheet.value, R.ed.number.cbPerSheet.enabled];
            x.msg = has(msgs(dlg), sym("WARN") + "Krok 2: v každém aršíku platí jen s Pořadím po aršících.");
            x.r13 = ascii(rs[12][3]); x.r240 = ascii(rs[239][3]);
            x.pass = x.perSheet[0] === true && x.perSheet[1] === false && x.msg && rs[12][3] === "SNB CZ | 013" && rs[239][3] === "SNB CZ | 240";
            return x;
        });
        check("10.6", function () {
            var x = {};
            revert(dlg);
            tick(R.cbBySheet, true);
            selectStep(dlg, 1);
            tick(R.ed.number.cbPerSheet, true);
            STUB.promptAnswer = "Aršíky";
            R.btnSaveAs.onClick();
            STUB.promptAnswer = null;
            pick(R.ddPreset, "Samolepky");
            selectStep(dlg, 1);
            x.samolepky = [R.cbBySheet.value, R.ed.number.cbPerSheet.value, ascii(presetText(dlg))];
            pick(R.ddPreset, "Aršíky");
            selectStep(dlg, 1);
            x.arsiky = [R.cbBySheet.value, R.ed.number.cbPerSheet.value, ascii(presetText(dlg))];
            s = settings();
            x.stored = s && s.presets[ "Aršíky" ] ? { bySheet: s.presets["Aršíky"].bySheet, perSheet: s.presets["Aršíky"].steps[1].perSheet } : null;
            x.pass = x.samolepky[0] === false && x.samolepky[1] === false && presetText(dlg) === "Aršíky" &&
                x.arsiky[0] === true && x.arsiky[1] === true && !!x.stored && x.stored.bySheet === true && x.stored.perSheet === true;
            return x;
        });
        dlg.win.close();
    }

    // 10.5 on …geoup.ai (no aršíky); nothing written.
    function partA105() {
        var dlg, R, before, after;
        useSettings(settingsPath);
        writeSettings("Samolepky", samolepky11());
        openCopy(GEO);
        dlg = build();
        R = dlg.refs;
        check("10.5", function () {
            revert(dlg);
            before = col(rows(dlg), 3, 1, 240).join("/") + "#" + col(rows(dlg), 1, 1, 240).join("/");
            tick(R.cbBySheet, true);
            after = col(rows(dlg), 3, 1, 240).join("/") + "#" + col(rows(dlg), 1, 1, 240).join("/");
            return { msg: has(msgs(dlg), sym("WARN") + L.SHEET_NONE), same: before === after, n1: ascii(rows(dlg)[0][0]),
                pass: has(msgs(dlg), sym("WARN") + L.SHEET_NONE) && before === after };
        });
        dlg.win.close();
    }

    // ---- layout helpers from probe_dialog.jsx ------------------------------------
    function footer(c) {
        var k, ch, f;
        for (k = 0; k < c.children.length; k++) {
            ch = c.children[k];
            if (ch.type === "statictext" && String(ch.text).indexOf(String.fromCharCode(169)) === 0) { return String(ch.text); }
            if (ch.children && ch.children.length) { f = footer(ch); if (f !== null) { return f; } }
        }
        return null;
    }
    // Every control a user points at, except Použít, Storno and the two
    // read-only boxes: whether it has a helpTip of at most two sentences.
    function walkTips(c, R, missing, tooLong) {
        var k, ch, t, tip, n, seen = 0;
        for (k = 0; k < c.children.length; k++) {
            ch = c.children[k];
            t = ch.type;
            if ((t === "edittext" || t === "dropdownlist" || t === "checkbox" || t === "radiobutton" || t === "button" || t === "listbox") &&
                    ch !== R.btnOk && ch !== R.btnCancel && ch !== R.etMsgs && ch !== R.lbPrev) {
                seen++;
                tip = ch.helpTip ? String(ch.helpTip) : "";
                if (tip === "") { missing.push(t + ":" + ascii(ch.text || "")); }
                n = (tip.match(/[.!?](\s|$)/g) || []).length;
                if (n > 2) { tooLong.push(ascii(tip)); }
            }
            if (ch.children && ch.children.length) { seen += walkTips(ch, R, missing, tooLong); }
        }
        return seen;
    }
    function broken(n) { return n > 100000 || n < 0; }
    function liftAll(el) {
        var m = el.maximumSize, k;
        if (m && (broken(m.width) || broken(m.height))) {
            if (broken(m.width)) { m.width = 4000; }
            if (broken(m.height)) { m.height = 4000; }
            el.maximumSize = m;
        }
        if (el.children) { for (k = 0; k < el.children.length; k++) { liftAll(el.children[k]); } }
    }
    function screens() {
        var a = [], i, s;
        for (i = 0; i < $.screens.length; i++) { s = $.screens[i]; a.push([s.right - s.left, s.bottom - s.top]); }
        return a;
    }
    function clipped(c, acc, drops) {
        var kids = c.children, k, ch, t, tw, cw, box, m, widest;
        for (k = 0; k < kids.length; k++) {
            ch = kids[k];
            t = ch.type;
            if ((t === "statictext" || t === "button" || t === "checkbox" || t === "radiobutton") && ch.text !== "" && ch.visible !== false) {
                tw = Math.ceil(ch.graphics.measureString(ch.text)[0]);
                cw = ch.size ? ch.size.width : -1;
                box = (t === "checkbox" || t === "radiobutton") ? 18 : 0;
                if (tw + box > cw) { acc.push({ type: t, text: ascii(ch.text), textW: tw, ctrlW: cw }); }
            }
            if (t === "dropdownlist" && ch.items && ch.items.length > 0) {
                widest = 0;
                for (m = 0; m < ch.items.length; m++) {
                    if (ch.items[m].text) { widest = Math.max(widest, Math.ceil(ch.graphics.measureString(ch.items[m].text)[0])); }
                }
                drops.push({ first: ascii(ch.items[0].text), widestItemW: widest, ctrlW: ch.size ? ch.size.width : -1 });
            }
            if (ch.children && ch.children.length > 0) { clipped(ch, acc, drops); }
        }
    }

    // =============================================================================
    var logPath = redirectLog();
    var parts = { dialog: partDialog, run1: partRun1, run2: partRun2, presets: partPresets, controls: partControls, tick: partTick,
        locked: partLocked, arch51: partArch51, nogroups: partNoGroups, artboard: partArtboard,
        a101: partA101, a102: partA102, a103: partA103, a104: partA104, a105: partA105 };
    var t0 = now(), name, failed = 0;
    try {
        if (!parts[PART]) { throw new Error("unknown PART " + PART); }
        parts[PART]();
    } catch (e) {
        out.FAILED = ascii(e.message + " (line " + e.line + ")");
    } finally {
        BTE.Storage.getFile = realGetFile;
        if (doc) {
            try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.notes.push("close failed: " + e2.message); }
        }
    }
    for (name in out.checks) { if (out.checks.hasOwnProperty(name) && out.checks[name].pass !== true) { failed++; } }
    out.failed = failed;
    out.stubbed = { alerts: STUB.alerts, confirms: STUB.confirms.length, prompts: STUB.prompts.length };
    out.log = readFile(logPath);
    out.ms = now() - t0;
    out.documentsAtEnd = app.documents.length;
    return j(out);
}
