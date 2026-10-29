/**
 * Mock Illustrator DOM — plain objects carrying only the surface BTE.Scope
 * reads. Shapes follow the measured facts (docs/findings.md, Task 8):
 * every object has a string `uuid`; doc.textFrames holds every text, grouped
 * or not; layers and groups list their direct children in pageItems and by
 * type (pathItems, compoundPathItems, groupItems; a layer also its sublayers
 * in layers); a compound path's pathItems are its subpaths; a clip group's
 * own bounds are its content's; lines exclude their terminator.
 *
 *   var M = require("./lib/mock_dom");
 *   var d = M.doc();                         // one layer, one artboard
 *   var g = M.group(d.layers[0], [0, 100, 100, 0]);
 *   var t = M.text(g, "abc", [10, 60, 40, 50]);
 *   d.selection = [g];
 *
 * Builders (parent is a layer, a group or a compound path):
 *   doc(opts)                      opts.artboards: [[l, t, r, b], ...], opts.active
 *   layer(doc)
 *   sublayer(layer)
 *   group(parent, bounds, opts)    opts.clipped
 *   text(parent, contents, bounds, opts)
 *        opts.kind "point" (default) | "area" | "path"; opts.editable
 *        (default true); opts.visible = how many characters the frame shows
 *        (area/path text; fewer than contents.length = overflow)
 *   path(parent, bounds, opts)     opts.closed (default true), opts.clipping,
 *                                  opts.guides
 *   compound(parent, subBounds, opts)  subBounds: bounds of each subpath, in
 *        pageItems order; opts.clipping marks every subpath as a mask; the
 *        compound's own bounds are the union of the subpaths
 *   link(a, b)                     threads two text frames into one story
 *   textRange(length)              the selection while text is being edited:
 *                                  one TextRange, not an array (fact 2)
 *
 * Counter: d.reads.selection counts reads of doc.selection, so a test can
 * prove that Scope did not touch it.
 *
 * Sets global.TextType, the enum BTE.Scope compares `kind` with.
 */
var uuidSeq = 1000;

var TEXT_TYPE = {
    POINTTEXT: { name: "TextType.POINTTEXT" },
    AREATEXT: { name: "TextType.AREATEXT" },
    PATHTEXT: { name: "TextType.PATHTEXT" }
};
global.TextType = TEXT_TYPE;

var ETX = String.fromCharCode(3);

function nextUuid() {
    uuidSeq++;
    return String(uuidSeq);
}

function docOf(item) {
    var p = item;
    while (p.typename !== "Document") { p = p.parent; }
    return p;
}

function union(list) {
    var b = list[0].slice(), i;
    for (i = 1; i < list.length; i++) {
        b[0] = Math.min(b[0], list[i][0]);
        b[1] = Math.max(b[1], list[i][1]);
        b[2] = Math.max(b[2], list[i][2]);
        b[3] = Math.min(b[3], list[i][3]);
    }
    return b;
}

// Line lengths without terminators, as Illustrator reports them.
function linesOf(shown) {
    var out = [], parts, i;
    if (shown.length === 0) { return out; }
    parts = shown.split(/[\r\u0003]/);
    for (i = 0; i < parts.length; i++) {
        out.push({ characters: { length: parts[i].length } });
    }
    return out;
}

function doc(opts) {
    var o = opts || {};
    var rects = o.artboards || [[0, 1000, 1000, 0]];
    var d = {
        typename: "Document",
        layers: [],
        textFrames: [],
        reads: { selection: 0 },
        _selection: []
    };
    var boards = [], i;
    for (i = 0; i < rects.length; i++) { boards.push({ artboardRect: rects[i] }); }
    boards.getActiveArtboardIndex = function () { return o.active || 0; };
    d.artboards = boards;

    Object.defineProperty(d, "selection", {
        get: function () { d.reads.selection++; return d._selection; },
        set: function (v) { d._selection = v; }
    });
    layer(d);
    return d;
}

function container(typename, parent) {
    return { typename: typename, parent: parent, pageItems: [], pathItems: [], compoundPathItems: [], groupItems: [] };
}

function layer(d) {
    var L = container("Layer", d);
    L.layers = [];
    d.layers.push(L);
    return L;
}

function sublayer(parentLayer) {
    var L = container("Layer", parentLayer);
    L.layers = [];
    parentLayer.layers.push(L);
    return L;
}

function group(parent, bounds, opts) {
    var o = opts || {};
    var g = container("GroupItem", parent);
    g.uuid = nextUuid();
    g.geometricBounds = bounds;
    g.clipped = o.clipped === true;
    parent.pageItems.push(g);
    parent.groupItems.push(g);
    return g;
}

function text(parent, contents, bounds, opts) {
    var o = opts || {};
    var kinds = { point: TEXT_TYPE.POINTTEXT, area: TEXT_TYPE.AREATEXT, path: TEXT_TYPE.PATHTEXT };
    var shown = (o.visible === undefined) ? contents : contents.substring(0, o.visible);
    var t = {
        typename: "TextFrame",
        uuid: nextUuid(),
        parent: parent,
        contents: contents,
        geometricBounds: bounds,
        editable: o.editable !== false,
        kind: kinds[o.kind || "point"],
        lines: linesOf(shown),
        characters: { length: contents.length }
    };
    t.story = { textFrames: [t] };
    parent.pageItems.push(t);
    docOf(parent).textFrames.push(t);
    return t;
}

function path(parent, bounds, opts) {
    var o = opts || {};
    var p = {
        typename: "PathItem",
        uuid: nextUuid(),
        parent: parent,
        geometricBounds: bounds,
        closed: o.closed !== false,
        clipping: o.clipping === true,
        guides: o.guides === true
    };
    if (parent.typename !== "CompoundPathItem") { parent.pageItems.push(p); }
    parent.pathItems.push(p);
    return p;
}

function compound(parent, subBounds, opts) {
    var o = opts || {};
    var c = {
        typename: "CompoundPathItem",
        uuid: nextUuid(),
        parent: parent,
        pathItems: [],
        geometricBounds: union(subBounds)
    };
    var i;
    parent.pageItems.push(c);
    parent.compoundPathItems.push(c);
    for (i = 0; i < subBounds.length; i++) {
        path(c, subBounds[i], { clipping: o.clipping === true });
    }
    return c;
}

function link(a, b) {
    var story = { textFrames: [a, b] };
    a.story = story;
    b.story = story;
}

// As measured (findings.md, Task 8 fact 2): one TextRange object, not an
// array; length 0 for a blinking cursor, the marked count otherwise.
function textRange(length) {
    return { typename: "TextRange", length: length || 0 };
}

module.exports = {
    doc: doc, layer: layer, sublayer: sublayer, group: group, text: text, path: path,
    compound: compound, link: link, textRange: textRange, ETX: ETX
};
