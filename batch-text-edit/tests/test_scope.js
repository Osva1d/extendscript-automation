var h = require("./lib/harness");
var M = require("./lib/mock_dom");
var BTE = h.load(["src/lib/utils.js", "src/order.js", "src/element.js", "src/scope.js"]);

// Illustrator coordinates: bounds are [left, top, right, bottom], top > bottom.
function box(cx, cy, w, hgt) {
    return [cx - w / 2, cy + hgt / 2, cx + w / 2, cy - hgt / 2];
}

function ids(texts) {
    var a = [], i;
    for (i = 0; i < texts.length; i++) { a.push(texts[i].id); }
    return a.join(",");
}

function contentsOf(texts) {
    var a = [], i;
    for (i = 0; i < texts.length; i++) { a.push(texts[i].contents); }
    return a.join(",");
}

function byId(texts, id) {
    var i;
    for (i = 0; i < texts.length; i++) { if (texts[i].id === id) { return texts[i]; } }
    return null;
}

function rows(state) {
    var a = [], i;
    for (i = 0; i < state.length; i++) { a.push(state[i].join("+")); }
    return a.join(" | ");
}

function throwsMsg(fn) {
    try { fn(); } catch (e) { return e.message; }
    return null;
}

// ---- the three real structures as a mock DOM (spec 4.2) --------------------
//
// Every prefab: a 312 pt box with a code text above the centre and a number
// below it, a clip group holding the graphic (mask circle 290, content 312 x
// 312) and a 283 pt cut circle on the same layer.
//   "group"   layer > prefab group > { clip group, code, number }; cut on layer
//   "sheets"  layer > sheet group of `perSheet` > prefab group > ...
//   "none"    layer > { clip group, code, number, cut }, no prefab group
var PITCH = 312;

function sheet(mode, cols, rowsN, perSheet) {
    var d = M.doc({ artboards: [[0, 0, cols * PITCH, -rowsN * PITCH]] });
    var L = d.layers[0], sheetGroup = null, n = cols * rowsN;
    var i, cx, cy, parent, clip, sheets = [];
    for (i = 0; i < n; i++) {
        cx = (i % cols) * PITCH + PITCH / 2;
        cy = -(Math.floor(i / cols) * PITCH + PITCH / 2);
        if (mode === "sheets" && i % perSheet === 0) {
            sheetGroup = M.group(L, [0, 0, 0, 0]);
            sheets.push(sheetGroup);
        }
        if (mode === "none") { parent = L; }
        else { parent = M.group(mode === "sheets" ? sheetGroup : L, box(cx, cy, PITCH, PITCH)); }
        clip = M.group(parent, box(cx, cy, PITCH, PITCH), { clipped: true });
        M.path(clip, box(cx, cy, 290, 290), { clipping: true });
        M.path(clip, box(cx, cy, PITCH, PITCH));
        M.text(parent, "{kód}", box(cx, cy + 40, 120, 24));
        M.text(parent, "{n}", box(cx, cy - 40, 120, 24));
        M.path(L, box(cx, cy, 283, 283));
    }
    return { doc: d, sheets: sheets };
}

["group", "sheets", "none"].forEach(function (mode) {
    var s = sheet(mode, 12, 20, 12);
    var p = BTE.Scope.prepare(s.doc, "document");
    var allTwo = true, allPair = true, i;
    h.eq(p.elements.length, 240, mode + ": 240 elements");
    h.eq(p.textCount, 480, mode + ": 480 texts");
    h.eq(p.state.length, 240, mode + ": one state row per element");
    for (i = 0; i < p.state.length; i++) {
        if (p.state[i].length !== 2 || p.tfs[i].length !== 2) { allTwo = false; }
        if (p.state[i][0] !== "{kód}" || p.state[i][1] !== "{n}") { allPair = false; }
    }
    h.assert(allTwo, mode + ": two texts per element in state and tfs");
    h.assert(allPair, mode + ": code above the number in every row");
    h.eq(p.elements[0].key.charAt(0), mode === "none" ? "s" : "g", mode + ": element kind");
    h.assert(p.tfs[0][0] === s.doc.textFrames[0], mode + ": first row starts with the first text");
    h.assert(p.tfs.length === 240 && p.tfs[239][1] === s.doc.textFrames[479], mode + ": last row ends with the last text");
    h.eq(p.cursorInText, false, mode + ": no cursor");
    h.eq(JSON.stringify(p.skipped), JSON.stringify({ locked: 0, overflow: 0, linked: 0 }), mode + ": nothing skipped");
});

// Task 7 carry (a): Scope must resolve the LOWEST group. Negative control: the
// same texts keyed by their outer sheet group collapse into 20 elements.
(function () {
    var s = sheet("sheets", 12, 20, 12);
    var c = BTE.Scope.collect(s.doc, "document");
    var outer = [], i, t;
    for (i = 0; i < c.texts.length; i++) {
        t = c.texts[i];
        outer.push({ id: t.id, group: { id: t.tf.parent.parent.uuid, bounds: [0, 0, 0, 0] }, bounds: t.bounds, tie: t.tie });
    }
    h.eq(s.sheets.length, 20, "lowest group: 20 sheet groups exist");
    h.eq(BTE.Element.build(outer, []).length, 20, "lowest group: keyed by the sheet group, 240 prefabs would be 20 elements");
    h.eq(c.texts[0].group.id, s.doc.textFrames[0].parent.uuid, "lowest group: a text's group is its direct parent");
    h.eq(BTE.Scope.prepare(s.doc, "document").elements.length, 240, "lowest group: Scope gives 240");
})();

// Selecting the sheet groups (what Cmd+A gives) reaches every nested text.
(function () {
    var s = sheet("sheets", 12, 20, 12);
    var p;
    s.doc.selection = s.sheets.slice();
    p = BTE.Scope.prepare(s.doc, "selection");
    h.eq(p.elements.length, 240, "select all sheets: 240 elements");
    h.eq(p.textCount, 480, "select all sheets: 480 texts");
})();

// ---- selection ------------------------------------------------------------

(function () {
    var d = M.doc(), L = d.layers[0];
    var outer = M.group(L, [0, 500, 500, 0]);
    var inner = M.group(outer, [0, 200, 200, 0]);
    var deep = M.group(inner, [0, 100, 100, 0]);
    var clip = M.group(outer, [300, 500, 500, 300], { clipped: true });
    var t0 = M.text(L, "loose, not selected", box(800, 800, 40, 10));
    var t1 = M.text(outer, "in outer", box(400, 100, 40, 10));
    var t2 = M.text(inner, "in inner", box(150, 150, 40, 10));
    var t3 = M.text(deep, "in deep", box(50, 50, 40, 10));
    var t4, c;
    M.path(clip, [320, 480, 480, 320], { clipping: true });
    t4 = M.text(clip, "in clip", box(400, 400, 40, 10));
    d.selection = [outer];
    c = BTE.Scope.collect(d, "selection");
    h.eq(c.texts.length, 4, "selection of an outer group: every nested text");
    h.eq(byId(c.texts, t0.uuid), null, "selection of an outer group: a text outside it is not collected");
    h.eq(byId(c.texts, t1.uuid).group.id, outer.uuid, "selection of an outer group: text in outer");
    h.eq(byId(c.texts, t2.uuid).group.id, inner.uuid, "selection of an outer group: text in inner keeps inner");
    h.eq(byId(c.texts, t3.uuid).group.id, deep.uuid, "selection of an outer group: text in deep keeps deep");
    h.eq(byId(c.texts, t4.uuid).group.id, clip.uuid, "selection of an outer group: text in a clip group");
    h.eq(byId(c.texts, t3.uuid).tie, 3, "selection: tie is the index in doc.textFrames");
    h.assert(byId(c.texts, t3.uuid).tf === t3, "selection: tf is the frame");
    h.eq(byId(c.texts, t3.uuid).contents, "in deep", "selection: contents");
    h.eq(c.cursorInText, false, "selection of an outer group: no cursor");
})();

(function () {
    var d = M.doc(), L = d.layers[0];
    var g = M.group(L, [0, 300, 300, 0]);
    var a = M.text(g, "a", box(100, 200, 40, 10));
    var b = M.text(g, "b", box(100, 100, 40, 10));
    var c;
    d.selection = [b];
    c = BTE.Scope.collect(d, "selection");
    h.eq(ids(c.texts), b.uuid, "text selected inside a group: only that text");
    h.eq(c.texts[0].group.id, g.uuid, "text selected inside a group: still gets its group");
    // a plain group covers the union of its children, the unselected text included
    h.eq(JSON.stringify(c.texts[0].group.bounds), JSON.stringify([80, 205, 120, 95]), "text selected inside a group: group bounds");
    h.eq(c.texts[0].tie, 1, "text selected inside a group: tie from doc.textFrames");
    h.assert(a.uuid !== b.uuid, "uuids differ");
})();

(function () {
    var d = M.doc(), L = d.layers[0];
    var g = M.group(L, [0, 300, 300, 0]);
    var a = M.text(g, "a", box(100, 200, 40, 10));
    var c;
    d.selection = [g, a];
    c = BTE.Scope.collect(d, "selection");
    h.eq(c.texts.length, 1, "group and its own text both selected: the text once");
    h.eq(BTE.Scope.prepare(d, "selection").textCount, 1, "group and its own text both selected: one text in the rows");
})();

(function () {
    var d = M.doc(), L = d.layers[0];
    var p = M.path(L, [0, 100, 100, 0]);
    var t = M.text(L, "x", box(50, 50, 20, 10));
    var c;
    d.selection = [p];
    c = BTE.Scope.collect(d, "selection");
    h.eq(c.texts.length, 0, "a selected path holds no text");
    h.eq(c.cursorInText, false, "a selected path is not text editing");
    d.selection = [];
    c = BTE.Scope.prepare(d, "selection");
    h.eq(c.elements.length, 0, "empty selection: no elements");
    h.eq(c.textCount, 0, "empty selection: no texts");
    h.eq(c.cursorInText, false, "empty selection: no cursor");
    h.assert(t.uuid !== p.uuid, "uuids differ");
})();

// ---- cursor in a text (fact 2: one TextRange object, not an array) ---------

// the three measured editing states: cursor (length 0), 3 and 15 characters marked
h.eq(BTE.Scope.isTextEditing(M.textRange(0)), true, "isTextEditing: measured cursor, TextRange of length 0");
h.eq(BTE.Scope.isTextEditing(M.textRange(3)), true, "isTextEditing: measured 3 characters marked");
h.eq(BTE.Scope.isTextEditing(M.textRange(15)), true, "isTextEditing: measured Cmd+A inside the text");
h.eq(BTE.Scope.isTextEditing([{ typename: "TextFrame" }]), false, "isTextEditing: measured text selected as an object");
h.eq(BTE.Scope.isTextEditing([]), false, "isTextEditing: empty array");
h.eq(BTE.Scope.isTextEditing(null), false, "isTextEditing: null");
h.eq(BTE.Scope.isTextEditing(undefined), false, "isTextEditing: undefined");
h.eq(BTE.Scope.isTextEditing([{ typename: "GroupItem" }, { typename: "TextFrame" }, { typename: "PathItem" },
    { typename: "CompoundPathItem" }, { typename: "PlacedItem" }, { typename: "RasterItem" }, { typename: "SymbolItem" },
    { typename: "MeshItem" }, { typename: "PluginItem" }, { typename: "GraphItem" }, { typename: "LegacyTextItem" },
    { typename: "NonNativeItem" }]), false, "isTextEditing: every page item type");
h.eq(BTE.Scope.isTextEditing(M.textRange()), true, "isTextEditing: a TextRange instead of an array");
h.eq(BTE.Scope.isTextEditing({ typename: "InsertionPoint" }), true, "isTextEditing: any non-array object");
h.eq(BTE.Scope.isTextEditing([M.textRange()]), true, "isTextEditing: an array holding a TextRange");
h.eq(BTE.Scope.isTextEditing([{ typename: "GroupItem" }, { typename: "Character" }]), true, "isTextEditing: one non-page item is enough");
h.eq(BTE.Scope.isTextEditing([null]), true, "isTextEditing: an empty slot");
h.eq(BTE.Scope.isTextEditing([{ typename: "constructor" }]), true, "isTextEditing: a typename that is an Object.prototype name");

(function () {
    var d = M.doc(), L = d.layers[0], c, p;
    M.text(L, "x", box(50, 50, 20, 10));
    d.selection = M.textRange();
    c = BTE.Scope.collect(d, "selection");
    h.eq(c.cursorInText, true, "TextRange selection: cursorInText");
    h.eq(c.texts.length, 0, "TextRange selection: no texts");
    p = BTE.Scope.prepare(d, "selection");
    h.eq(p.cursorInText, true, "TextRange selection: prepare passes cursorInText on");
    h.eq(p.elements.length, 0, "TextRange selection: prepare gives no elements");
    h.eq(p.textCount, 0, "TextRange selection: textCount 0");

    d.reads.selection = 0;
    p = BTE.Scope.prepare(d, "document");
    h.eq(d.reads.selection, 0, "document scope never reads the selection");
    h.eq(p.cursorInText, false, "document scope: no cursor even with a TextRange selected");
    h.eq(p.textCount, 1, "document scope: the text is there");
    p = BTE.Scope.prepare(d, "artboard");
    h.eq(d.reads.selection, 0, "artboard scope never reads the selection");
    h.eq(p.textCount, 1, "artboard scope: the text is there");
})();

// ---- skipped texts -----------------------------------------------------------

(function () {
    var d = M.doc(), L = d.layers[0], c;
    M.text(L, "locked", box(50, 50, 20, 10), { editable: false });
    M.text(L, "free", box(50, 150, 20, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(contentsOf(c.texts), "free", "editable false: not in texts");
    h.eq(c.skipped.locked, 1, "editable false: counted in skipped.locked");
    h.eq(c.skipped.overflow + c.skipped.linked, 0, "editable false: no other reason");
})();

(function () {
    var d = M.doc(), L = d.layers[0], c, over, fits, para, pointBroken;
    over = M.text(L, "abcdefghij", box(50, 50, 20, 10), { kind: "area", visible: 6 });
    // a terminator after a visible line still counts as hidden text
    M.text(L, "ab\rcd", box(50, 150, 20, 10), { kind: "area", visible: 3 });
    M.text(L, "ab\r\r\r", box(50, 250, 20, 10), { kind: "area", visible: 3 });
    fits = M.text(L, "abcdefghij", box(50, 350, 20, 10), { kind: "area" });
    // the line-sum rule would call these overflowing (lines exclude \r and U+0003)
    para = M.text(L, "ab\rcd\r", box(50, 450, 20, 10), { kind: "area" });
    M.text(L, "ab" + M.ETX + "cd", box(50, 550, 20, 10), { kind: "path" });
    M.text(L, "", box(50, 650, 20, 10), { kind: "area" });
    M.text(L, "\r", box(50, 750, 20, 10), { kind: "area" });
    // point text never overflows; its lines are not even read
    pointBroken = M.text(L, "a\rb", box(50, 850, 0, 10));
    pointBroken.lines = [];
    c = BTE.Scope.collect(d, "document");
    h.eq(c.skipped.overflow, 3, "overflow: three overflowing texts skipped");
    h.eq(byId(c.texts, over.uuid), null, "overflow: not in texts");
    h.assert(byId(c.texts, fits.uuid) !== null, "overflow: a text that fits is kept");
    h.assert(byId(c.texts, para.uuid) !== null, "overflow: paragraph breaks are not overflow (walk rule)");
    h.eq(c.texts.length, 6, "overflow: six texts kept");
    h.assert(byId(c.texts, pointBroken.uuid) !== null, "overflow: point text is never walked");
})();

(function () {
    var d = M.doc(), L = d.layers[0], c, a, b;
    a = M.text(L, "first part", box(50, 50, 20, 10), { kind: "area" });
    b = M.text(L, "", box(50, 150, 20, 10), { kind: "area" });
    M.link(a, b);
    M.text(L, "alone", box(50, 250, 20, 10), { kind: "area" });
    c = BTE.Scope.collect(d, "document");
    h.eq(c.skipped.linked, 2, "two-frame story: both frames in skipped.linked");
    h.eq(contentsOf(c.texts), "alone", "two-frame story: neither frame in texts");
})();

(function () {
    // one reason per text: locked wins over linked, linked over overflow
    var d = M.doc(), L = d.layers[0], c, a, b;
    a = M.text(L, "abcdef", box(50, 50, 20, 10), { kind: "area", visible: 2, editable: false });
    b = M.text(L, "abcdef", box(50, 150, 20, 10), { kind: "area", visible: 2 });
    M.link(a, b);
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(c.skipped), JSON.stringify({ locked: 1, overflow: 0, linked: 1 }), "one reason per text");
})();

// Review Focus: locked text inside an element.
(function () {
    var d = M.doc(), L = d.layers[0];
    var g = M.group(L, [0, 300, 300, 0]);
    var locked = M.text(g, "{n} locked", box(150, 250, 60, 10), { editable: false });
    var free = M.text(g, "{n} free", box(150, 50, 60, 10));
    var p = BTE.Scope.prepare(d, "document");
    h.eq(p.elements.length, 1, "locked text inside an element: one element");
    h.eq(p.elements[0].key, "g:" + g.uuid, "locked text inside an element: the group is the element");
    h.eq(p.tfs[0].length, 1, "locked text inside an element: tfs row holds one frame");
    h.assert(p.tfs[0][0] === free, "locked text inside an element: tfs row holds the editable frame");
    h.eq(p.state[0].join("|"), "{n} free", "locked text inside an element: state row holds only its contents");
    h.eq(p.elements[0].textIds.join(","), free.uuid, "locked text inside an element: textIds without the locked text");
    h.eq(p.elements[0].tie, 1, "locked text inside an element: tie from the editable text");
    h.eq(p.skipped.locked, 1, "locked text inside an element: counted as skipped");
    h.eq(p.textCount, 1, "locked text inside an element: textCount counts the editable one");
    h.assert(locked.uuid !== free.uuid, "uuids differ");
})();

(function () {
    // an element whose only text is locked disappears
    var d = M.doc(), L = d.layers[0];
    var g = M.group(L, [0, 300, 300, 0]);
    var p;
    M.text(g, "locked", box(150, 150, 60, 10), { editable: false });
    M.text(L, "free", box(800, 800, 60, 10));
    p = BTE.Scope.prepare(d, "document");
    h.eq(p.elements.length, 1, "all-locked element: dropped");
    h.eq(rows(p.state), "free", "all-locked element: the other text remains");
    h.eq(p.skipped.locked, 1, "all-locked element: counted");
})();

// ---- empty texts (fact 6): passed like any other text ----------------------

(function () {
    var d = M.doc(), L = d.layers[0], p;
    M.text(L, "", [100, 710, 100, 697]);
    M.text(L, "\r", [100, 650, 100, 622]);
    M.text(L, "", [300, 700, 420, 660], { kind: "area" });
    p = BTE.Scope.prepare(d, "document");
    h.eq(p.textCount, 3, "empty texts: all three in the rows");
    h.eq(p.skipped.overflow, 0, "empty texts: not overflow");
})();

// ---- clip groups: the mask gives the bounds (fact 5) -----------------------

(function () {
    var d = M.doc(), L = d.layers[0], g, c, t;
    // the group's own bounds are the content's; the mask child is not first
    g = M.group(L, [50, 700, 550, 200], { clipped: true });
    M.path(g, [50, 700, 550, 200]);
    M.path(g, [100, 600, 300, 400], { clipping: true });
    t = M.text(g, "a", box(200, 500, 20, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([100, 600, 300, 400]), "clip group: bounds of the PathItem mask");
})();

(function () {
    var d = M.doc(), L = d.layers[0], g, c, t;
    g = M.group(L, [450, 700, 950, 200], { clipped: true });
    // pathItems[0] is the hole; the compound's own bounds are the outline's
    M.compound(g, [[550, 550, 650, 450], [500, 600, 700, 400]], { clipping: true });
    M.path(g, [450, 700, 950, 200]);
    t = M.text(g, "a", box(600, 500, 20, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([500, 600, 700, 400]), "clip group: bounds of the CompoundPathItem mask, not of pathItems[0]");
})();

(function () {
    var d = M.doc(), L = d.layers[0], g, c, t;
    g = M.group(L, [0, 300, 300, 0]);
    M.path(g, [100, 200, 200, 100]);
    t = M.text(g, "a", box(150, 150, 20, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([100, 200, 200, 100]), "plain group: the union of its children");
})();

// Ruling R24, measured: a plain group's own geometricBounds include the
// clipped-away content of a clip group inside it. The element is what shows:
// a clip group child counts with its mask, a plain group child with the union
// of its own children, every other child with its bounds (hidden ones too).
(function () {
    var d = M.doc(), L = d.layers[0], outer, g, clip, inner, t, t2, c;
    // as in probe_scope.jsx part groupbounds: text + clip group (600 x 600 content, 100 x 100 mask)
    outer = M.group(L, [100, 1400, 950, 800]);
    t2 = M.text(outer, "outer text", [900, 1310, 950, 1297]);
    g = M.group(outer, [100, 1400, 700, 800]);
    t = M.text(g, "{n}", [100, 1310, 113, 1297]);
    clip = M.group(g, [100, 1400, 700, 800], { clipped: true });
    M.path(clip, [100, 1400, 700, 800]);
    M.path(clip, [500, 1000, 600, 900], { clipping: true });
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([100, 1310, 600, 900]),
        "group bounds: a clip group child counts with its mask, not its hidden content");
    h.eq(JSON.stringify(byId(c.texts, t2.uuid).group.bounds), JSON.stringify([100, 1310, 950, 900]),
        "group bounds: a plain group child counts with its own union, recursively");

    // a compound mask in a nested clip group, and a hidden child that still counts
    d = M.doc();
    g = M.group(d.layers[0], [0, 1000, 1000, 0]);
    t = M.text(g, "a", [10, 20, 30, 10]);
    inner = M.group(g, [0, 1000, 1000, 0], { clipped: true });
    M.compound(inner, [[450, 450, 550, 350], [400, 500, 600, 300]], { clipping: true });
    M.path(inner, [0, 1000, 1000, 0]);
    M.path(g, [700, 900, 800, 800]).hidden = true;
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([10, 900, 800, 10]),
        "group bounds: compound mask of a child clip group, hidden child included");

    // an empty group child adds nothing
    d = M.doc();
    g = M.group(d.layers[0], [0, 1000, 1000, 0]);
    t = M.text(g, "a", [10, 20, 30, 10]);
    M.group(g, [0, 0, 0, 0]);
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([10, 20, 30, 10]), "group bounds: an empty child group adds nothing");
})();

(function () {
    // no path or compound mask among the children (e.g. a text used as the mask): the group's own bounds
    var d = M.doc(), L = d.layers[0], g, c, t;
    g = M.group(L, [0, 300, 300, 0], { clipped: true });
    t = M.text(g, "a", box(150, 150, 20, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(JSON.stringify(byId(c.texts, t.uuid).group.bounds), JSON.stringify([0, 300, 300, 0]), "clip group without a path mask: the group's own bounds");
})();

// ---- shapes ---------------------------------------------------------------

(function () {
    var d = M.doc(), L = d.layers[0], g, s, got, clip;
    var closed = M.path(L, [0, 100, 100, 0]);
    var inGroup, comp;
    M.path(L, [0, 200, 100, 100], { closed: false });
    clip = M.group(L, [0, 300, 100, 200], { clipped: true });
    M.path(clip, [0, 300, 100, 200], { clipping: true });
    g = M.group(L, [200, 300, 300, 200]);
    inGroup = M.path(g, [200, 300, 300, 200]);
    comp = M.compound(L, [[400, 300, 500, 200], [420, 280, 480, 220]]);
    M.compound(clip, [[0, 300, 100, 200]], { clipping: true });
    s = BTE.Scope.shapes(d);
    got = ids(s);
    h.eq(got, [closed.uuid, inGroup.uuid, comp.uuid].join(","), "shapes: closed non-mask paths (also in groups) and non-mask compounds");
    h.eq(JSON.stringify(s[2].bounds), JSON.stringify([400, 300, 500, 200]), "shapes: compound bounds are its own");
})();

(function () {
    // Ruling R23: a closed guide (bleed or safe-area rectangle) is not a shape
    var d = M.doc(), L = d.layers[0], s, p;
    var guide = M.path(L, [0, 1000, 1000, 0], { guides: true });
    var cut = M.path(L, [100, 300, 300, 100]);
    s = BTE.Scope.shapes(d);
    h.eq(ids(s), cut.uuid, "guides: a closed guide is not a shape");
    M.text(L, "a", box(500, 800, 40, 10));
    M.text(L, "b", box(500, 600, 40, 10));
    p = BTE.Scope.prepare(d, "document");
    h.eq(p.elements.length, 2, "guides: loose texts under a guide rectangle stay apart");
    h.assert(guide.uuid !== cut.uuid, "uuids differ");
})();

(function () {
    // every layer, sublayer and nesting depth; compounds inside groups; no subpaths
    var d = M.doc(), L1 = d.layers[0], L2 = M.layer(d), sub = M.sublayer(L2), deepSub = M.sublayer(sub);
    var g1 = M.group(sub, [0, 10, 10, 0]), g2 = M.group(g1, [0, 10, 10, 0]);
    var a = M.path(L1, [0, 10, 10, 0]);
    var b = M.path(sub, [0, 20, 10, 10]);
    var c = M.path(g2, [0, 30, 10, 20]);
    var e = M.path(deepSub, [0, 40, 10, 30]);
    var cg = M.compound(g2, [[0, 50, 10, 40], [2, 48, 8, 42]]);
    var cl = M.compound(L2, [[0, 60, 10, 50]]);
    var s = BTE.Scope.shapes(d), got = {}, i;
    for (i = 0; i < s.length; i++) { got[s[i].id] = true; }
    h.eq(s.length, 6, "shapes: six shapes over layers, sublayers and nested groups");
    h.assert(got[a.uuid] && got[b.uuid] && got[c.uuid] && got[e.uuid], "shapes: paths on every level");
    h.assert(got[cg.uuid] && got[cl.uuid], "shapes: compound paths in a layer and in a nested group");
    h.assert(!got[cg.pathItems[0].uuid] && !got[cg.pathItems[1].uuid], "shapes: subpaths of a compound are not shapes");
    // walk order: a container's own items before its groups and sublayers
    h.eq(s[4].id + "," + s[5].id, cl.uuid + "," + cg.uuid, "shapes: compound paths come after the paths");
})();

(function () {
    // a counter around BTE.Scope.shapes, which prepare calls through the namespace
    var original = BTE.Scope.shapes, calls = 0, s;
    BTE.Scope.shapes = function (d) { calls++; return original(d); };
    try {
        s = sheet("group", 3, 2);
        BTE.Scope.prepare(s.doc, "document");
        h.eq(calls, 0, "shapes: not read when every text is in a group");
        s = sheet("none", 3, 2);
        BTE.Scope.prepare(s.doc, "document");
        h.eq(calls, 1, "shapes: read once when a loose text exists");
    } finally {
        BTE.Scope.shapes = original;
    }
})();

// ---- order, rows and the plain state --------------------------------------

(function () {
    // 2 x 2 loose texts, created in a scrambled order
    var d = M.doc(), L = d.layers[0], p;
    M.text(L, "BR", box(300, 100, 40, 10));
    M.text(L, "TL", box(100, 300, 40, 10));
    M.text(L, "BL", box(100, 100, 40, 10));
    M.text(L, "TR", box(300, 300, 40, 10));
    p = BTE.Scope.prepare(d, "document");
    h.eq(rows(p.state), "TL | TR | BL | BR", "order: rows by default");
    p = BTE.Scope.prepare(d, "document", "rows");
    h.eq(rows(p.state), "TL | TR | BL | BR", "order: rows");
    p = BTE.Scope.prepare(d, "document", "cols");
    h.eq(rows(p.state), "TL | BL | TR | BR", "order: cols");
    h.eq(p.tfs[1][0].contents, "BL", "order: tfs follow the same order");
    h.eq(p.elements[1].textIds[0], p.tfs[1][0].uuid, "order: elements follow the same order");
    h.assert(throwsMsg(function () { BTE.Scope.prepare(d, "document", "diagonal"); }) !== null, "order: unknown mode throws");
})();

// ---- reorder (ruling R22): a Pořadí change without reading the DOM ---------

(function () {
    // 3 x 2 grid of two-text groups; a locked text skipped so skipped/textCount show
    var d = M.doc(), L = d.layers[0], names = ["A", "B", "C", "D", "E", "F"], i, g, cx, cy, p, q, back, before, reads;
    for (i = 0; i < 6; i++) {
        cx = (i % 3) * 300 + 150;
        cy = 1000 - Math.floor(i / 3) * 300 - 150;
        g = M.group(L, box(cx, cy, 300, 300));
        M.text(g, names[i] + "1", box(cx, cy + 40, 60, 10));
        M.text(g, names[i] + "2", box(cx, cy - 40, 60, 10));
    }
    M.text(g, "locked", box(cx, cy, 60, 10), { editable: false });
    p = BTE.Scope.prepare(d, "document", "rows");
    h.eq(rows(p.state), "A1+A2 | B1+B2 | C1+C2 | D1+D2 | E1+E2 | F1+F2", "reorder: start by rows");
    before = JSON.stringify({ state: p.state, keys: p.elements, skipped: p.skipped, textCount: p.textCount });
    reads = d.reads.selection;
    q = BTE.Scope.reorder(p, "cols");
    h.eq(rows(q.state), "A1+A2 | D1+D2 | B1+B2 | E1+E2 | C1+C2 | F1+F2", "reorder: rows to cols");
    for (i = 0; i < q.elements.length; i++) {
        h.eq(q.tfs[i][0].contents + "+" + q.tfs[i][1].contents, q.state[i].join("+"), "reorder: tfs row " + i + " follows state");
        h.eq(q.elements[i].textIds.join(","), q.tfs[i][0].uuid + "," + q.tfs[i][1].uuid, "reorder: element " + i + " follows its rows");
    }
    h.eq(JSON.stringify(q.skipped), JSON.stringify({ locked: 1, overflow: 0, linked: 0 }), "reorder: skipped unchanged");
    h.eq(q.textCount, 12, "reorder: textCount unchanged");
    h.eq(q.cursorInText, false, "reorder: cursorInText unchanged");
    h.eq(JSON.stringify({ state: p.state, keys: p.elements, skipped: p.skipped, textCount: p.textCount }), before, "reorder: input not mutated");
    h.assert(q.state !== p.state && q.state[0] !== p.state[0] && q.tfs[0] !== p.tfs[0] && q.skipped !== p.skipped,
        "reorder: no rows shared with the input");
    back = BTE.Scope.reorder(q, "rows");
    h.eq(rows(back.state), rows(p.state), "reorder: cols back to rows gives the prepare order");
    h.eq(JSON.stringify(BTE.Scope.reorder(p, "cols").elements), JSON.stringify(BTE.Scope.prepare(d, "document", "cols").elements),
        "reorder: the same order as prepare with that order");
    h.eq(d.reads.selection, reads, "reorder: no DOM read");
    h.assert(throwsMsg(function () { BTE.Scope.reorder(p, "diagonal"); }) !== null, "reorder: unknown mode throws");

    q = BTE.Scope.reorder({ elements: [], state: [], tfs: [], skipped: { locked: 0, overflow: 0, linked: 0 }, cursorInText: true, textCount: 0 }, "cols");
    h.eq(q.elements.length + q.state.length + q.tfs.length, 0, "reorder: empty prepared");
    h.eq(q.cursorInText, true, "reorder: cursorInText kept on an empty result");
})();

(function () {
    // texts in one element: top to bottom, then left to right
    var d = M.doc(), L = d.layers[0], g, p;
    g = M.group(L, [0, 300, 300, 0]);
    M.text(g, "bottom", box(150, 50, 40, 10));
    M.text(g, "top-right", box(250, 250, 40, 10));
    M.text(g, "top-left", box(50, 250, 40, 10));
    p = BTE.Scope.prepare(d, "document");
    h.eq(rows(p.state), "top-left+top-right+bottom", "texts inside an element: top to bottom, left to right");
    h.eq(p.tfs[0][2].contents, "bottom", "texts inside an element: tfs row in the same order");
})();

(function () {
    // loose texts sharing a shape form one element; the tie is the doc index
    var d = M.doc(), L = d.layers[0], p, c;
    M.path(L, [0, 300, 300, 0]);
    M.text(L, "x", box(800, -500, 40, 10));     // below the shape
    M.text(L, "b", box(150, 50, 40, 10));
    M.text(L, "a", box(150, 250, 40, 10));
    c = BTE.Scope.collect(d, "document");
    h.eq(c.texts[2].tie, 2, "document: tie is the index in doc.textFrames");
    p = BTE.Scope.prepare(d, "document");
    h.eq(p.elements.length, 2, "shape element: two elements");
    h.eq(rows(p.state), "a+b | x", "shape element: texts of one shape together");
})();

// ---- artboard -------------------------------------------------------------

(function () {
    var d = M.doc({ artboards: [[0, 1000, 1000, 0], [2000, 1000, 3000, 0]], active: 1 });
    var L = d.layers[0], c, p, g;
    M.text(L, "on 1", box(500, 500, 40, 10));
    M.text(L, "on 2", box(2500, 500, 40, 10));
    M.text(L, "locked on 1", box(500, 300, 40, 10), { editable: false });
    M.text(L, "locked on 2", box(2500, 300, 40, 10), { editable: false });
    // a group straddling the edge: its background puts the centre (2100) on
    // artboard 2, while the text's own centre (1950) is off it
    g = M.group(L, [1900, 600, 2300, 400]);
    M.path(g, [1900, 600, 2300, 400]);
    M.text(g, "straddling", box(1950, 500, 40, 10));
    c = BTE.Scope.collect(d, "artboard");
    h.eq(c.texts.length, 3, "artboard: collect returns all document texts");
    p = BTE.Scope.prepare(d, "artboard");
    h.eq(rows(p.state), "straddling | on 2", "artboard: elements whose centre is on the active artboard");
    h.eq(p.skipped.locked, 1, "artboard: only skipped texts of elements on the artboard count");
    h.eq(p.textCount, 2, "artboard: textCount");
    h.eq(BTE.Scope.prepare(d, "document").skipped.locked, 2, "document: every skipped text counts");
})();

// ---- errors ---------------------------------------------------------------

(function () {
    var d = M.doc(), L = d.layers[0], t, msg;
    h.assert(/unknown kind/.test(String(throwsMsg(function () { BTE.Scope.collect(d, "page"); }))), "collect: unknown kind throws");
    M.text(L, "fine", box(50, 50, 20, 10));
    t = M.text(L, "broken", box(50, 150, 20, 10));
    Object.defineProperty(t, "story", { get: function () { throw new Error("DOM gone"); } });
    msg = String(throwsMsg(function () { BTE.Scope.collect(d, "document"); }));
    h.assert(/DOM gone/.test(msg), "a DOM error keeps its message: " + msg);
    h.assert(/text 2/.test(msg), "a DOM error names the text: " + msg);
})();

(function () {
    // the collection read itself (doc.textFrames[i]) carries context too
    var d = M.doc(), L = d.layers[0], msg;
    M.text(L, "fine", box(50, 50, 20, 10));
    M.text(L, "gone", box(50, 150, 20, 10));
    Object.defineProperty(d.textFrames, "1", { get: function () { throw new Error("No such element"); } });
    msg = String(throwsMsg(function () { BTE.Scope.collect(d, "document"); }));
    h.assert(/No such element/.test(msg) && /text 2/.test(msg), "doc.textFrames[i] failing names the text: " + msg);
})();

(function () {
    // and so does reading a selected object's typename
    var d = M.doc(), L = d.layers[0], bad = {}, msg;
    M.text(L, "x", box(50, 50, 20, 10));
    Object.defineProperty(bad, "typename", { get: function () { throw new Error("object gone"); } });
    d.selection = [L.pageItems[0], bad];
    msg = String(throwsMsg(function () { BTE.Scope.collect(d, "selection"); }));
    h.assert(/object gone/.test(msg) && /selected object 2/.test(msg), "selection typename failing names the object: " + msg);
})();

h.done();
