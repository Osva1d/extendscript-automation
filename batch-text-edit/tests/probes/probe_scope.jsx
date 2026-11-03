// ------------------------------------------------------------------------
// Script:      probe_scope.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-29
// Description: Scope probe for Batch Text Edit (Task 9). Runs the real
//              BTE.Scope.prepare on documents it builds itself: 240 prefabs
//              (12 x 20, pitch 312 pt) in the three structures of spec 4.2 -
//              prefab groups, prefab groups inside sheet groups of 12, and
//              loose texts - plus 500 loose prefabs (1000 loose texts), the
//              same with about 10 000 paths, a selection, an artboard, a
//              document of edge cases and the bounds of a plain group around
//              a clip group (ruling R24). Every prefab: a code text above the
//              centre, a number below it, a clip group with the graphic (mask
//              circle 290 pt over a 312 pt square) and a 283 pt cut circle on
//              the same layer. Reports element count, texts per element, the
//              order, the skipped counts and the time of prepare (and of its
//              parts). Creates one document per run and closes only that
//              one, unsaved. Nothing is written to the user's documents.
// Usage:       The probe needs a header line and the real modules in front
//              of it. From the repo root, with 0 open documents (it refuses
//              to run otherwise):
//                  P=batch-text-edit
//                  { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true;'
//                    echo 'var PART = "group"; var PARTS_FIRST = false;'
//                    cat shared/lib/json2.js $P/src/lib/utils.js $P/src/order.js \
//                        $P/src/element.js $P/src/scope.js $P/tests/probes/probe_scope.jsx
//                  } > "$TMPDIR/probe_scope_run.jsx"
//                  tools/ai-eval.sh -t 600 "$TMPDIR/probe_scope_run.jsx"
//              The header resets BTE, which the engine keeps between runs,
//              so the modules that follow load fresh. Parts: group, sheets,
//              loose, select, artboard, loose1000, loose10k, mixed,
//              groupbounds. One part per run. PARTS_FIRST = true times the
//              parts of prepare before prepare itself (the first read of a
//              fresh document is the slow one). Optional: var LOG_PATH =
//              "..."; for the progress log (default
//              Folder.temp/bte_probe_scope.log).
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
    var logPath = (typeof LOG_PATH === "string" && LOG_PATH !== "") ? LOG_PATH : Folder.temp.fsName + "/bte_probe_scope.log";
    var partsFirst = (typeof PARTS_FIRST === "boolean") && PARTS_FIRST;
    // The engine keeps globals from one run to the next (measured: a
    // PARTS_FIRST set in one run was still true in the next), so every flag
    // is reset once read, and BTE counts only when the run's header reset it
    // and set BTE_PROBE_FRESH: a BTE left over from an earlier run is never
    // used.
    if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
    if (typeof PART === "string") { PART = ""; }
    if (typeof PARTS_FIRST === "boolean") { PARTS_FIRST = false; }
    if (typeof LOG_PATH === "string") { LOG_PATH = ""; }
    var PITCH = 312, CUT = 283, MASK = 290;
    var out = { part: part, app: app.version, notes: [] };
    var d = null;

    function now() { return new Date().getTime(); }
    function log(s) {
        var f = new File(logPath);
        f.encoding = "UTF-8";
        if (f.open("a")) { f.writeln(part + ": " + s); f.close(); }
    }
    function hex(n) { var x = n.toString(16); while (x.length < 4) { x = "0" + x; } return x; }
    // JSON with every non-ASCII character escaped, so the AppleEvent result stays ASCII.
    function ascii(s) {
        var r = "", i, code;
        for (i = 0; i < s.length; i++) {
            code = s.charCodeAt(i);
            r += (code < 32 || code > 126) ? "\\u" + hex(code) : s.charAt(i);
        }
        return r;
    }
    function circle(container, cx, cy, size) {
        return container.pathItems.ellipse(cy + size / 2, cx - size / 2, size, size);
    }
    function point(container, x, y, text) {
        var tf = container.textFrames.pointText([x, y]);
        tf.contents = text;
        return tf;
    }

    // Builds `cols x rows` prefabs on layer L. mode: "group" | "sheets" | "none".
    // decor: closed circles of 60 pt per prefab around the centre, none of
    // which holds a text's centre (they only make the shape search work).
    function buildSheet(L, mode, cols, rows, H, decor) {
        var n = cols * rows, sheet = null, i, k, cx, cy, parent, clip, a;
        for (i = 0; i < n; i++) {
            cx = (i % cols) * PITCH + PITCH / 2;
            cy = H - (Math.floor(i / cols) * PITCH + PITCH / 2);
            if (mode === "sheets" && i % 12 === 0) { sheet = L.groupItems.add(); }
            if (mode === "none") { parent = L; }
            else { parent = (mode === "sheets" ? sheet : L).groupItems.add(); }
            clip = parent.groupItems.add();
            clip.pathItems.rectangle(cy + PITCH / 2, cx - PITCH / 2, PITCH, PITCH);
            for (k = 0; k < decor; k++) {
                a = 2 * Math.PI * k / decor;
                circle(clip, cx + 110 * Math.cos(a), cy + 110 * Math.sin(a), 60);
            }
            circle(clip, cx, cy, MASK);
            clip.clipped = true;
            point(parent, cx - 30, cy + 35, "{k" + String.fromCharCode(243) + "d}");
            point(parent, cx - 10, cy - 45, "{n}");
            circle(L, cx, cy, CUT);
            if (i % 60 === 59) { log("built " + (i + 1)); }
        }
        // Document-level collections (doc.pathItems, ...) catch up only after a
        // redraw inside one script (docs/extendscript-engine-facts.md); the tool
        // itself reads a document built before it ran.
        app.redraw();
    }

    // What prepare returned, in numbers. Checks the order against the grid:
    // element k must sit at prefab k (rows) when `cols` is given.
    function describe(p, cols, H, ms) {
        var r = { ms: ms, elements: p.elements.length, textCount: p.textCount, skipped: p.skipped,
            cursorInText: p.cursorInText, perElement: {}, keyKinds: {} };
        var badOrder = 0, firstBad = null, i, b, cx, cy, ex, ey, n;
        for (i = 0; i < p.elements.length; i++) {
            n = String(p.state[i].length);
            r.perElement[n] = (r.perElement[n] || 0) + 1;
            r.keyKinds[p.elements[i].key.charAt(0)] = (r.keyKinds[p.elements[i].key.charAt(0)] || 0) + 1;
            if (p.tfs[i].length !== p.state[i].length) { r.tfsMismatch = i; }
            if (cols) {
                b = p.elements[i].bounds;
                cx = (b[0] + b[2]) / 2;
                cy = (b[1] + b[3]) / 2;
                ex = (i % cols) * PITCH + PITCH / 2;
                ey = H - (Math.floor(i / cols) * PITCH + PITCH / 2);
                if (Math.abs(cx - ex) > 0.5 || Math.abs(cy - ey) > 0.5) {
                    badOrder++;
                    if (firstBad === null) { firstBad = { el: i, centre: [cx, cy], expected: [ex, ey] }; }
                }
            }
        }
        if (cols) { r.outOfGridOrder = badOrder; r.firstOutOfOrder = firstBad; }
        if (p.state.length) {
            r.firstRow = ascii(p.state[0].join(" | "));
            r.lastRow = ascii(p.state[p.state.length - 1].join(" | "));
        }
        return r;
    }

    // The parts of prepare, timed one by one (all of them only read).
    function timeParts(doc, kind) {
        var t = {}, s, c, shapes = [], els, loose = false, i;
        s = now(); c = BTE.Scope.collect(doc, kind); t.collect = now() - s;
        for (i = 0; i < c.texts.length; i++) { if (c.texts[i].group === null) { loose = true; } }
        if (loose) { s = now(); shapes = BTE.Scope.shapes(doc); t.shapes = now() - s; }
        t.shapeCount = shapes.length;
        s = now(); els = BTE.Element.build(c.texts, shapes); t.build = now() - s;
        s = now(); BTE.Order.sort(els, "rows"); t.sort = now() - s;
        return t;
    }

    function sheetPart(mode, cols, rows, decor, kind) {
        var H = rows * PITCH, s, p, built;
        d = app.documents.add(DocumentColorSpace.RGB, cols * PITCH, H);
        s = now();
        buildSheet(d.layers[0], mode, cols, rows, H, decor);
        built = now() - s;
        out.buildMs = built;
        out.counts = { textFrames: d.textFrames.length, pathItems: d.pathItems.length,
            compoundPathItems: d.compoundPathItems.length, groupItems: d.groupItems.length };
        log("built in " + built + " ms: " + out.counts.textFrames + " texts, " + out.counts.pathItems + " paths");
        if (kind === "selection") {
            selectTop(d);
            out.selectionIsArray = BTE.Utils.isArray(d.selection);
            out.selectionLength = d.selection.length;
            out.isTextEditing = BTE.Scope.isTextEditing(d.selection);
        }
        if (partsFirst) {
            out.parts = timeParts(d, kind);
            log("parts " + j(out.parts));
        }
        s = now();
        p = BTE.Scope.prepare(d, kind);
        out.prepare = describe(p, cols, H, now() - s);
        log("prepare " + j(out.prepare));
        if (!partsFirst) {
            out.parts = timeParts(d, kind);
            log("parts " + j(out.parts));
        }
        out.partsFirst = partsFirst;
    }

    function selectTop(doc) {
        var L = doc.layers[0], items = [], i;
        for (i = 0; i < L.pageItems.length; i++) { items.push(L.pageItems[i]); }
        doc.selection = items;
    }

    function artboardPart() {
        var cols = 12, rows = 20, H = rows * PITCH, s, p, idx;
        d = app.documents.add(DocumentColorSpace.RGB, cols * PITCH, H);
        buildSheet(d.layers[0], "group", cols, rows, H, 0);
        // a second artboard over the top-left 6 x 10 prefabs, cut through the
        // middle of column 7 and row 11: their centres are outside it
        idx = d.artboards.add([0, H, 6 * PITCH + PITCH / 2 - 1, H - 10 * PITCH - PITCH / 2 + 1]);
        d.artboards.setActiveArtboardIndex(1);
        out.activeIndex = d.artboards.getActiveArtboardIndex();
        out.artboardRect = d.artboards[1].artboardRect;
        out.addReturned = typeof idx;
        s = now();
        p = BTE.Scope.prepare(d, "artboard");
        out.prepare = describe(p, 0, H, now() - s);
        out.prepare.expected = 60;
        s = now();
        p = BTE.Scope.prepare(d, "document");
        out.documentScope = describe(p, cols, H, now() - s);
    }

    // Real-DOM versions of the Node edge cases.
    function mixedPart() {
        var L, g, lockedG, hidL, a1, a2, p, s, r, ov, clip, ETX = String.fromCharCode(3);
        var LONG = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore";
        d = app.documents.add(DocumentColorSpace.RGB, 1000, 1000);
        L = d.layers[0];
        // (1) Review Focus: one locked and one editable text in a group
        g = L.groupItems.add();
        g.pathItems.rectangle(950, 50, 200, 200);
        point(g, 60, 900, "{n} locked").locked = true;
        point(g, 60, 800, "{n} free");
        // (2) a text in a locked group
        lockedG = L.groupItems.add();
        point(lockedG, 400, 900, "in locked group");
        lockedG.locked = true;
        // (4) a two-frame thread
        a1 = L.textFrames.areaText(L.pathItems.rectangle(700, 50, 120, 40));
        a1.contents = LONG;
        a2 = L.textFrames.areaText(L.pathItems.rectangle(640, 50, 120, 40), TextOrientation.HORIZONTAL, a1, true);
        // (5) an overflowing area text, (6) a fitting one with paragraph breaks
        ov = L.textFrames.areaText(L.pathItems.rectangle(500, 50, 100, 30));
        ov.contents = LONG;
        L.textFrames.areaText(L.pathItems.rectangle(400, 50, 200, 100)).contents = "ab\rcd\r";
        // (7) empty point texts
        point(L, 600, 500, "");
        point(L, 600, 450, "\r");
        point(L, 600, 400, ETX);
        // (8) a text in a clip group whose content is larger than the mask
        clip = L.groupItems.add();
        clip.pathItems.rectangle(350, 300, 400, 300);
        point(clip, 420, 200, "in clip");
        clip.pathItems.rectangle(250, 400, 100, 100);
        clip.clipped = true;
        // (3) a text on a hidden layer, last: with the new layer hidden,
        // areaText() on L failed with "Target layer cannot be modified"
        hidL = d.layers.add();
        point(hidL, 400, 800, "on hidden layer");
        hidL.visible = false;
        r = { a2Linked: a2.story.textFrames.length, ovChars: ov.characters.length };
        s = now();
        p = BTE.Scope.prepare(d, "document");
        out.prepare = describe(p, 0, 0, now() - s);
        out.rows = [];
        for (s = 0; s < p.state.length; s++) {
            out.rows.push({ key: p.elements[s].key.charAt(0), texts: ascii(p.state[s].join(" | ")),
                bounds: p.elements[s].bounds });
        }
        out.facts = r;
        out.expected = { skipped: { locked: 3, overflow: 1, linked: 2 },
            reviewFocusRow: "{n} free", clipBounds: [400, 250, 500, 150] };
    }

    // Ruling R24: do a plain group's bounds include the hidden content of a
    // clip group inside it? And a hidden child? Also what BTE.Scope reports.
    function groupBoundsPart() {
        var L, G2, G, T, T2, C, content, mask, H, shown, hid, p, i, r = {};
        function union(list) {
            var u = list[0].slice(), k;
            for (k = 1; k < list.length; k++) {
                u[0] = Math.min(u[0], list[k][0]); u[1] = Math.max(u[1], list[k][1]);
                u[2] = Math.max(u[2], list[k][2]); u[3] = Math.min(u[3], list[k][3]);
            }
            return u;
        }
        d = app.documents.add(DocumentColorSpace.RGB, 1500, 1500);
        L = d.layers[0];
        // G2 (plain) > { G (plain) > { T, C (clip: content 600 x 600, mask 100 x 100 off-centre) }, T2 }
        G2 = L.groupItems.add();
        T2 = point(G2, 900, 1300, "outer text");
        G = G2.groupItems.add();
        T = point(G, 100, 1300, "{n}");
        C = G.groupItems.add();
        content = C.pathItems.rectangle(1400, 100, 600, 600);     // x 100..700, y 800..1400
        mask = C.pathItems.rectangle(1000, 500, 100, 100);        // x 500..600, y 900..1000
        C.clipped = true;
        // H (plain) > { a shown square, a hidden square }
        H = L.groupItems.add();
        shown = H.pathItems.rectangle(500, 1000, 100, 100);       // x 1000..1100, y 400..500
        hid = H.pathItems.rectangle(300, 1300, 100, 100);         // x 1300..1400, y 200..300
        hid.hidden = true;
        app.redraw();
        r.text = T.geometricBounds;
        r.content = content.geometricBounds;
        r.mask = mask.geometricBounds;
        r.clipGroup = { geometric: C.geometricBounds, visible: C.visibleBounds };
        r.plainGroup = { geometric: G.geometricBounds, visible: G.visibleBounds };
        r.unionTextMask = union([T.geometricBounds, mask.geometricBounds]);
        r.unionTextContent = union([T.geometricBounds, content.geometricBounds]);
        r.outerGroup = { geometric: G2.geometricBounds, visible: G2.visibleBounds };
        r.outerUnionWithMask = union([T2.geometricBounds, r.unionTextMask]);
        r.hiddenChildGroup = { geometric: H.geometricBounds, visible: H.visibleBounds,
            shown: shown.geometricBounds, hidden: hid.geometricBounds };
        p = BTE.Scope.prepare(d, "document");
        r.scopeElements = [];
        for (i = 0; i < p.elements.length; i++) {
            r.scopeElements.push({ key: p.elements[i].key.charAt(0), texts: ascii(p.state[i].join(" | ")), bounds: p.elements[i].bounds });
        }
        out.groupBounds = r;
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

    if (!fresh || typeof BTE === "undefined" || !BTE.Scope) {
        return "probe_scope: run it behind the header in Usage (resets BTE, sets BTE_PROBE_FRESH, then the modules)";
    }
    log("start, documents=" + app.documents.length);
    try {
        if (part === "group") { sheetPart("group", 12, 20, 0, "document"); }
        else if (part === "sheets") { sheetPart("sheets", 12, 20, 0, "document"); }
        else if (part === "loose") { sheetPart("none", 12, 20, 0, "document"); }
        else if (part === "select") { sheetPart("sheets", 12, 20, 0, "selection"); }
        else if (part === "loose1000") { sheetPart("none", 20, 25, 0, "document"); }
        else if (part === "loose10k") { sheetPart("none", 20, 25, 16, "document"); }
        else if (part === "artboard") { artboardPart(); }
        else if (part === "mixed") { mixedPart(); }
        else if (part === "groupbounds") { groupBoundsPart(); }
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
