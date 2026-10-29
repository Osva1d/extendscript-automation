// ------------------------------------------------------------------------
// Script:      probe_write.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-29
// Description: Write probe for Batch Text Edit (Task 10). Runs the real
//              BTE.Scope.prepare, BTE.Steps.run, BTE.Write.apply and
//              BTE.Write.verify on a document it builds itself, then reads
//              every text and the formatting of every character back. It
//              does not measure Undo: app.executeMenuCommand("undo") inside
//              the probe's own run took back the whole run, the document's
//              setup included (5 texts -> 0, although app.redraw() closed
//              the setup first), and the run stalled Illustrator for about
//              18 minutes, most likely on that command (2026-10-29). Undo
//              after a run needs its own bridge call or the manual test
//              (spec 7.3). Parts:
//                chain  the brief's text „{kód} {n} Série {série}“ ({kód} red
//                       20 pt, the rest black 12 pt) and a text whose
//                       variables start with a character of other formatting,
//                       chain Replace {série} -> 2026, Number {n}, Case {kód}
//                       upper, Replace {KÓD} -> abc; a locked text, a text in
//                       a locked group and a text on a hidden layer with the
//                       same contents
//                case   case changes over a text with a different format on
//                       every character, ß -> SS, and a text the chain does
//                       not change
//                bulk   240 groups of „{kód}“ + „{n}“: timing
//                edge   a character outside the BMP (index in contents
//                       against characters) and a range set past the end
//              Creates one document per run and closes only that one,
//              unsaved. Nothing is written to the user's documents.
// Usage:       The probe needs a header line and the real modules in front
//              of it. From the repo root, with 0 open documents (it refuses
//              to run otherwise):
//                  P=batch-text-edit
//                  { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true; var PART = "chain";'
//                    cat shared/lib/json2.js $P/src/locale.js $P/src/lib/utils.js shared/lib/numbers.js
//                    echo 'buildNumbers(BTE);'
//                    cat $P/src/vars.js $P/src/steps.js $P/src/order.js $P/src/element.js \
//                        $P/src/scope.js $P/src/write.js $P/tests/probes/probe_write.jsx
//                  } > "$TMPDIR/probe_write_run.jsx"
//                  tools/ai-eval.sh -t 300 "$TMPDIR/probe_write_run.jsx"
//              The header resets BTE, which the engine keeps between runs,
//              so the modules that follow load fresh. One part per run.
//              Optional: var LOG_PATH = "..."; for the progress log (default
//              Folder.temp/bte_probe_write.log).
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
    var logPath = (typeof LOG_PATH === "string" && LOG_PATH !== "") ? LOG_PATH : Folder.temp.fsName + "/bte_probe_write.log";
    // The engine keeps globals from one run to the next, so every flag is
    // reset once read, and BTE counts only when this run's header reset it.
    if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
    if (typeof PART === "string") { PART = ""; }
    if (typeof LOG_PATH === "string") { LOG_PATH = ""; }

    var out = { part: part, app: app.version, notes: [] };
    var d = null;

    function now() { return new Date().getTime(); }
    function log(s) {
        var f = new File(logPath);
        f.encoding = "UTF-8";
        if (f.open("a")) { f.writeln(part + ": " + s); f.close(); }
    }
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

    function rgb(r, g, b) {
        var c = new RGBColor();
        c.red = r; c.green = g; c.blue = b;
        return c;
    }
    var BLACK = rgb(0, 0, 0), RED = rgb(255, 0, 0), BLUE = rgb(0, 0, 255), GREEN = rgb(0, 160, 0);

    function point(container, x, y, text) {
        var tf = container.textFrames.pointText([x, y]);
        tf.contents = text;
        return tf;
    }
    // Formats `len` characters from `start` (setup only, never the tool's way of writing contents).
    function paint(tf, start, len, size, color) {
        var r = tf.characters[start];
        r.length = len;
        r.characterAttributes.size = size;
        r.characterAttributes.fillColor = color;
    }
    // The formatting of every character: "r,g,b/size".
    function attrsOf(tf) {
        var a = [], n = tf.characters.length, i, ca, fc, col;
        for (i = 0; i < n; i++) {
            ca = tf.characters[i].characterAttributes;
            fc = ca.fillColor;
            col = (fc.typename === "RGBColor") ?
                Math.round(fc.red) + "," + Math.round(fc.green) + "," + Math.round(fc.blue) : fc.typename;
            a.push(col + "/" + Math.round(ca.size * 100) / 100);
        }
        return a;
    }
    function snap(tf) {
        var s = { contents: tf.contents, attrs: null };
        try { s.attrs = attrsOf(tf); } catch (e) { s.attrs = ["read failed: " + e.message]; }
        return s;
    }
    // Spans [[count, attr], ...] -> one attr per character.
    function spans(list) {
        var a = [], i, k;
        for (i = 0; i < list.length; i++) {
            for (k = 0; k < list[i][0]; k++) { a.push(list[i][1]); }
        }
        return a;
    }
    // First differences between two attr lists (index: got vs want), "" when equal.
    function attrDiff(got, want) {
        var r = [], n = Math.max(got.length, want.length), i;
        for (i = 0; i < n && r.length < 6; i++) {
            if (got[i] !== want[i]) { r.push(i + ": " + got[i] + " vs " + want[i]); }
        }
        return r.join("; ");
    }
    function same(a, b) {
        return a.contents === b.contents && attrDiff(a.attrs, b.attrs) === "";
    }

    function R(where, rep) { return { type: "replace", active: true, where: where, replace: rep, matchCase: false, firstOnly: false }; }
    function N(where) { return { type: "number", active: true, where: where, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" }; }
    function C(where, mode) { return { type: "case", active: true, where: where, mode: mode }; }
    function V(name) { return { kind: "var", text: name }; }

    // Redraws once after the setup (never during the write), runs prepare,
    // run, apply and verify; returns what each stage reported.
    function runChain(steps, texts) {
        var r = {}, p, run, fin, w, bad, s, i, k;
        log("setup built");
        app.redraw();
        r.before = [];
        r.editable = [];
        r.uuids = [];
        for (i = 0; i < texts.length; i++) {
            r.before.push(snap(texts[i]));
            r.editable.push(texts[i].editable);
            r.uuids.push(texts[i].uuid);
        }
        s = now();
        p = BTE.Scope.prepare(d, "document");
        r.prepareMs = now() - s;
        r.elements = p.elements.length;
        r.textCount = p.textCount;
        r.skipped = p.skipped;
        run = BTE.Steps.run(p.state, steps);
        fin = run.states[run.states.length - 1];
        r.stepErrors = [];
        for (k = 0; k < run.info.length; k++) { r.stepErrors.push(run.info[k].error ? run.info[k].error.key : null); }
        log("prepared and run, applying");
        s = now();
        w = BTE.Write.apply(p.tfs, run.info);
        r.applyMs = now() - s;
        log("applied");
        r.textsWritten = w.textsWritten;
        s = now();
        bad = BTE.Write.verify(p.tfs, fin);
        r.verifyMs = now() - s;
        r.verify = bad;
        r.after = [];
        for (i = 0; i < texts.length; i++) { r.after.push(snap(texts[i])); }
        r.tfsUuids = {};
        for (i = 0; i < p.tfs.length; i++) {
            for (k = 0; k < p.tfs[i].length; k++) { r.tfsUuids[p.tfs[i][k].uuid] = true; }
        }
        r.preview = fin;
        log("verified");
        return r;
    }

    function chainPart() {
        var L, G, HL, t1, t2, t3, t4, t5, texts, r, i, want1, want2, B = "0,0,0/12";
        var TXT = "{kód} {n} Série {série}";
        d = app.documents.add(DocumentColorSpace.RGB, 1000, 1000);
        L = d.layers[0];
        // t1: the brief's text. t2: each variable starts with a character
        // formatted unlike the rest of it, so "the first character" is seen.
        t1 = point(L, 100, 900, TXT);
        paint(t1, 0, TXT.length, 12, BLACK);
        paint(t1, 0, 5, 20, RED);
        t2 = point(L, 100, 800, "Díl {n} {série}");
        paint(t2, 0, 15, 12, BLACK);
        paint(t2, 4, 1, 16, BLUE);      // "{" of {n}
        paint(t2, 8, 2, 14, GREEN);     // "{s" of {série}
        // Never written: locked itself, in a locked group, on a hidden layer
        // (built last, see findings, Scope probe).
        t3 = point(L, 500, 900, TXT);
        paint(t3, 0, TXT.length, 12, BLACK);
        paint(t3, 0, 5, 20, RED);
        t3.locked = true;
        log("t1-t3 built");
        G = L.groupItems.add();
        t4 = point(G, 500, 800, TXT);
        paint(t4, 0, TXT.length, 12, BLACK);
        paint(t4, 0, 5, 20, RED);
        G.locked = true;
        log("t4 built");
        HL = d.layers.add();
        t5 = point(HL, 500, 700, TXT);
        paint(t5, 0, TXT.length, 12, BLACK);
        paint(t5, 0, 5, 20, RED);
        HL.visible = false;
        texts = [t1, t2, t3, t4, t5];

        r = runChain([R(V("{série}"), "2026"), N(V("{n}")), C(V("{kód}"), "upper"), R(V("{KÓD}"), "abc")], texts);

        want1 = spans([[3, "255,0,0/20"], [15, B]]);
        want2 = spans([[4, B], [3, "0,0,255/16"], [1, B], [4, "0,160,0/14"]]);
        out.prepare = { ms: r.prepareMs, elements: r.elements, textCount: r.textCount, skipped: r.skipped };
        out.stepErrors = r.stepErrors;
        out.applyMs = r.applyMs;
        out.verifyMs = r.verifyMs;
        out.textsWritten = r.textsWritten;
        out.verify = r.verify;
        out.preview = r.preview;
        out.t1 = { before: r.before[0].contents, after: r.after[0].contents, beforeAttrs: r.before[0].attrs.join(" "),
            attrsDiff: attrDiff(r.after[0].attrs, want1) };
        out.t2 = { before: r.before[1].contents, after: r.after[1].contents, beforeAttrs: r.before[1].attrs.join(" "),
            attrsDiff: attrDiff(r.after[1].attrs, want2) };
        out.neverWritten = [];
        for (i = 2; i < 5; i++) {
            out.neverWritten.push({
                text: ["locked", "locked group", "hidden layer"][i - 2],
                inTfs: r.tfsUuids[r.uuids[i]] === true,
                editable: r.editable[i],
                unchanged: same(r.after[i], r.before[i])
            });
        }
    }

    function casePart() {
        var L, t1, t2, t3, texts, r, i, a0, a1, kept, S = "straße {kód} Ab";
        var COLORS = [RED, GREEN, BLUE];
        d = app.documents.add(DocumentColorSpace.RGB, 1000, 1000);
        L = d.layers[0];
        // A different format on every character: size 10 + i, colour by i % 3.
        t1 = point(L, 100, 900, S);
        for (i = 0; i < S.length; i++) { paint(t1, i, 1, 10 + i, COLORS[i % 3]); }
        t2 = point(L, 100, 800, "ABC");
        t3 = point(L, 100, 700, "x {kód} y");
        texts = [t1, t2, t3];

        r = runChain([C(V("{kód}"), "title"), C({ kind: "all" }, "upper")], texts);

        out.textsWritten = r.textsWritten;
        out.verify = r.verify;
        out.stepErrors = r.stepErrors;
        out.after = [r.after[0].contents, r.after[1].contents, r.after[2].contents];
        // straße -> STRASSE: characters 0-3 keep theirs, the SS are new, 5.. keep theirs one place on.
        a0 = r.before[0].attrs;
        a1 = r.after[0].attrs;
        kept = [];
        for (i = 0; i < a0.length; i++) {
            if (i < 4 && a1[i] !== a0[i]) { kept.push(i + ": " + a1[i] + " vs " + a0[i]); }
            if (i > 4 && a1[i + 1] !== a0[i]) { kept.push(i + ": " + a1[i + 1] + " vs " + a0[i]); }
        }
        out.keptFormat = kept.length === 0 ? "every character but the ß kept its own" : kept.join("; ");
        out.sharpS = { before: a0[4], after: [a1[4], a1[5]] };
    }

    function bulkPart() {
        var L, g, cols = 12, rows = 20, PITCH = 50, H = rows * PITCH, texts = [], r, i, cx, cy, tk, tn, s;
        s = now();
        d = app.documents.add(DocumentColorSpace.RGB, cols * PITCH, H);
        L = d.layers[0];
        for (i = 0; i < cols * rows; i++) {
            cx = (i % cols) * PITCH + 5;
            cy = H - (Math.floor(i / cols) * PITCH + 15);
            g = L.groupItems.add();
            tk = point(g, cx, cy, "{kód}");
            paint(tk, 0, 5, 14, RED);
            tn = point(g, cx, cy - 20, "{n}");
            paint(tn, 0, 3, 10, BLACK);
            texts.push(tk);
            texts.push(tn);
        }
        out.buildMs = now() - s;

        r = runChain([R(V("{kód}"), "SNB"), N(V("{n}"))], texts);

        out.prepare = { ms: r.prepareMs, elements: r.elements, textCount: r.textCount };
        out.applyMs = r.applyMs;
        out.verifyMs = r.verifyMs;
        out.textsWritten = r.textsWritten;
        out.verifyCount = r.verify.length;
        out.firstLast = [r.after[0].contents, r.after[1].contents, r.after[texts.length - 2].contents, r.after[texts.length - 1].contents];
        out.formatKept = attrDiff(r.after[0].attrs, spans([[3, "255,0,0/14"]])) + "|" + attrDiff(r.after[1].attrs, spans([[3, "0,0,0/10"]]));
    }

    function edgePart() {
        var L, t, a, r, rr, p, run, w, smile = String.fromCharCode(0xD83D, 0xDE00);
        d = app.documents.add(DocumentColorSpace.RGB, 1000, 1000);
        L = d.layers[0];
        // A character outside the BMP: is a surrogate pair one character or two?
        t = point(L, 100, 900, "a" + smile + "b {n}");
        a = { contentsLength: t.contents.length, charactersLength: t.characters.length, contents: t.contents };
        app.redraw();
        p = BTE.Scope.prepare(d, "document");
        run = BTE.Steps.run(p.state, [R(V("{n}"), "7")]);
        try {
            w = BTE.Write.apply(p.tfs, run.info);
            a.textsWritten = w.textsWritten;
            a.after = t.contents;
            a.verify = BTE.Write.verify(p.tfs, run.states[run.states.length - 1]);
        } catch (e) {
            a.applyError = e.message;
        }
        out.astral = a;
        // A range set past the end of its text: throws, or clamps?
        t = point(L, 100, 700, "abc");
        rr = { contents: "abc" };
        try {
            r = t.characters[1];
            r.length = 10;
            rr.length = r.length;
            rr.rangeContents = r.contents;
        } catch (e2) {
            rr.error = e2.message;
        }
        out.pastEnd = rr;
    }

    if (!fresh || typeof BTE === "undefined" || !BTE.Write || !BTE.Scope || !BTE.Numbers) {
        return "probe_write: run it behind the header in Usage (resets BTE, sets BTE_PROBE_FRESH, then the modules)";
    }
    log("start, documents=" + app.documents.length);
    try {
        if (part === "chain") { chainPart(); }
        else if (part === "case") { casePart(); }
        else if (part === "bulk") { bulkPart(); }
        else if (part === "edge") { edgePart(); }
        else { out.notes.push("unknown PART \"" + part + "\""); }
    } catch (e) {
        out.FAILED = e.message + " (line " + e.line + ")";
    } finally {
        if (d) {
            try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.notes.push("close failed: " + e2.message); }
        }
    }
    out.documentsAtEnd = app.documents.length;
    log("done " + j(out));
    return j(out);
})();
