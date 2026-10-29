var h = require("./lib/harness");
var F = require("./lib/sheet_fixture");
var BTE = h.load(["src/lib/utils.js", "src/order.js", "src/element.js"]);

// Illustrator coordinates: bounds are [left, top, right, bottom], top > bottom.
function text(id, group, bounds, tie) {
    return { id: id, group: group, bounds: bounds, tie: tie };
}

function keysOf(els) {
    var a = [], i;
    for (i = 0; i < els.length; i++) { a.push(els[i].key); }
    return a.join(",");
}

function reversed(arr) {
    var a = [], i;
    for (i = arr.length - 1; i >= 0; i--) { a.push(arr[i]); }
    return a;
}

// ---- the three real files (spec 4.2): 240 elements of two texts -----------

["group", "sheets", "none"].forEach(function (mode) {
    var s = F.makeSheet(mode, 12, 20, 12), els = BTE.Element.build(s.texts, s.shapes);
    var seen = {}, unique = 0, allTwo = true, ordered = true, i, e, prefix;

    h.eq(els.length, 240, mode + ": 240 elements");
    h.eq(els[0].textIds.length, 2, mode + ": two texts per element");

    prefix = (mode === "none") ? "s:" : "g:";
    for (i = 0; i < els.length; i++) {
        e = els[i];
        if (e.textIds.length !== 2) { allTwo = false; }
        if (!seen.hasOwnProperty(e.key)) { seen[e.key] = true; unique++; }
        if (e.tie !== i * 2) { ordered = false; }
        if (e.key.indexOf(prefix) !== 0) { h.assert(false, mode + ": key " + e.key + " has prefix " + prefix); }
    }
    h.assert(allTwo, mode + ": every element has two texts");
    h.eq(unique, 240, mode + ": element keys are unique");
    h.assert(ordered, mode + ": build returns elements by ascending tie, tie = smallest text tie");

    // code above the centre comes first, number below it second
    h.eq(els[0].textIds.join(","), "1,2", mode + ": textIds top to bottom");
    h.eq(els[239].textIds.join(","), "479,480", mode + ": last element texts");

    if (mode === "none") {
        h.eq(els[0].key, "s:200000", mode + ": the cut path is the element");
        h.eq(JSON.stringify(els[0].bounds), JSON.stringify(s.shapes[0].bounds), mode + ": bounds of the cut path");
    } else {
        h.eq(els[0].key, "g:100000", mode + ": the prefab group is the element");
        h.eq(JSON.stringify(els[0].bounds), JSON.stringify(s.texts[0].group.bounds), mode + ": bounds of the group");
        h.eq(els[239].key, "g:100239", mode + ": last group");
    }

    // build must not depend on the input order
    h.eq(
        JSON.stringify(BTE.Element.build(reversed(s.texts), reversed(s.shapes))),
        JSON.stringify(els),
        mode + ": same elements from reversed input"
    );
});

(function () {
    var s = F.makeSheet("sheets", 12, 20, 12), els = BTE.Element.build(s.texts, s.shapes);
    var k = {}, i, hit = 0;
    h.eq(s.outerGroups.length, 20, "sheets: 20 outer groups of 12 prefabs exist");
    for (i = 0; i < els.length; i++) { k[els[i].key] = true; }
    for (i = 0; i < s.outerGroups.length; i++) {
        if (k.hasOwnProperty("g:" + s.outerGroups[i].id)) { hit++; }
    }
    h.eq(hit, 0, "sheets: no element is an outer group (texts reference their lowest group)");
})();

// ---- geometry: smallest containing shape wins -----------------------------

(function () {
    // text 20 x 10 (area 200), centre (110, 105)
    var t = text(1, null, [100, 110, 120, 100], 0);
    var big = { id: 10, bounds: [0, 200, 300, 0] };         // 300 x 200
    var mid = { id: 20, bounds: [90, 130, 140, 90] };       //  50 x  40
    var els = BTE.Element.build([t], [big, mid]);
    h.eq(els.length, 1, "nested shapes: one element");
    h.eq(els[0].key, "s:20", "nested shapes: the smaller containing shape wins");
    h.eq(JSON.stringify(els[0].bounds), JSON.stringify([90, 130, 140, 90]), "nested shapes: bounds are the shape's");
    h.eq(BTE.Element.build([t], [mid, big])[0].key, "s:20", "nested shapes: shape order does not matter");
})();

(function () {
    var t = text(1, null, [100, 110, 120, 100], 0);        // area 200, centre (110, 105)
    var sameArea = { id: 11, bounds: [105, 115, 115, 95] }; // 10 x 20 = 200, contains the centre
    var smaller = { id: 12, bounds: [108, 107, 112, 103] }; // 4 x 4, contains the centre
    var big = { id: 13, bounds: [0, 200, 300, 0] };

    h.eq(BTE.Element.build([t], [sameArea]).length, 1, "not larger: one element");
    h.eq(BTE.Element.build([t], [sameArea])[0].key, "t:1", "not larger: a shape of equal area is ignored");
    h.eq(BTE.Element.build([t], [smaller])[0].key, "t:1", "not larger: a smaller shape is ignored");
    h.eq(BTE.Element.build([t], [sameArea, smaller, big])[0].key, "s:13", "not larger: ignored shapes do not hide a valid one");
})();

(function () {
    var t = text(1, null, [100, 110, 120, 100], 0);        // centre (110, 105)

    // centre exactly on the left and bottom edge of the shape: inclusive
    var edge = { id: 30, bounds: [110, 120, 200, 105] };
    h.eq(BTE.Element.build([t], [edge])[0].key, "s:30", "edge: a centre on the shape's edge counts as inside");

    // the shape overlaps the text but its bounds miss the centre by 1
    var miss = { id: 31, bounds: [0, 200, 109, 0] };
    h.eq(BTE.Element.build([t], [miss])[0].key, "t:1", "edge: bounds that miss the centre do not qualify");

    // the centre decides, not the whole text: the shape holds only half of it
    var half = { id: 32, bounds: [0, 200, 111, 0] };
    h.eq(BTE.Element.build([t], [half])[0].key, "s:32", "edge: centre inside is enough, the text may stick out");
})();

(function () {
    // two shapes of equal area that both hold the centre (110, 105)
    var t = text(1, null, [100, 110, 120, 100], 0);
    var a = { id: 3, bounds: [50, 150, 150, 50] };
    var b = { id: 9, bounds: [60, 160, 160, 60] };
    h.eq(BTE.Element.build([t], [b, a])[0].key, "s:9", "equal areas: the smaller shape index wins (b first)");
    h.eq(BTE.Element.build([t], [a, b])[0].key, "s:3", "equal areas: the smaller shape index wins (a first)");
})();

(function () {
    // a text in a group never looks at shapes, even with a tight one around it
    var g = { id: 7, bounds: [0, 300, 300, 0] };
    var t = text(1, g, [100, 110, 120, 100], 0);
    var shape = { id: 40, bounds: [90, 130, 140, 90] };
    var els = BTE.Element.build([t], [shape]);
    h.eq(els.length, 1, "grouped text: one element");
    h.eq(els[0].key, "g:7", "grouped text: the group wins over a smaller shape");
    h.eq(JSON.stringify(els[0].bounds), JSON.stringify([0, 300, 300, 0]), "grouped text: bounds are the group's");
})();

// ---- a loose text without a shape is its own element ----------------------

(function () {
    var t = text(5, null, [10, 30, 50, 10], 4);
    var far = { id: 50, bounds: [500, 600, 700, 500] };
    var els = BTE.Element.build([t], [far]);
    h.eq(els.length, 1, "lone text: one element");
    h.eq(els[0].key, "t:5", "lone text: key is t:<id>");
    h.eq(els[0].textIds.join(","), "5", "lone text: its own id");
    h.eq(JSON.stringify(els[0].bounds), JSON.stringify([10, 30, 50, 10]), "lone text: the text's own bounds");
    h.eq(els[0].tie, 4, "lone text: tie");

    els = BTE.Element.build([t], []);
    h.eq(els[0].key, "t:5", "lone text: no shapes at all");
})();

// ---- the documented failure: loose texts on one big background ------------

(function () {
    var bg = { id: 60, bounds: [0, 1000, 1000, 0] };           // artboard-sized rectangle
    var low = text(1, null, [100, 110, 140, 100], 0);
    var high = text(2, null, [700, 910, 740, 900], 1);
    var els = BTE.Element.build([low, high], [bg]);
    h.eq(els.length, 1, "big background: loose texts merge into one element");
    h.eq(els[0].key, "s:60", "big background: the background is the element");
    h.eq(els[0].textIds.join(","), "2,1", "big background: texts top to bottom");
    h.eq(els[0].tie, 0, "big background: tie is the smallest text tie");
})();

// ---- order of texts inside an element -------------------------------------

(function () {
    var g = { id: 8, bounds: [0, 100, 200, 0] };
    var topRight = text(1, g, [120, 90, 180, 80], 0);
    var topLeft = text(2, g, [20, 90, 80, 80], 1);
    var bottom = text(3, g, [60, 30, 140, 20], 2);
    var els = BTE.Element.build([bottom, topRight, topLeft], []);
    h.eq(els[0].textIds.join(","), "2,1,3", "text order: rows top to bottom, left to right inside a row");

    // identical positions: the smaller tie goes first
    var p = text(10, g, [20, 90, 80, 80], 5);
    var q = text(11, g, [20, 90, 80, 80], 3);
    els = BTE.Element.build([p, q], []);
    h.eq(els[0].textIds.join(","), "11,10", "text order: equal positions fall back to tie");
    h.eq(els[0].tie, 3, "text order: element tie is the smallest tie");
})();

// ---- mixed input and a deterministic result order -------------------------

(function () {
    var g1 = { id: 1, bounds: [0, 100, 100, 0] };
    var g2 = { id: 2, bounds: [200, 100, 300, 0] };
    var bg = { id: 3, bounds: [0, 500, 400, 200] };
    var texts = [
        text(40, null, [20, 450, 60, 440], 9),     // loose, inside bg
        text(30, g2, [220, 60, 260, 50], 4),
        text(10, g1, [20, 60, 60, 50], 1),
        text(50, null, [1000, 10, 1040, 0], 0),    // loose, nowhere
        text(41, null, [20, 300, 60, 290], 7),     // loose, inside bg
        text(11, g1, [20, 30, 60, 20], 2)
    ];
    var els = BTE.Element.build(texts, [bg]);
    h.eq(keysOf(els), "t:50,g:1,g:2,s:3", "mixed: groups, shape and lone text, ordered by element tie");
    h.eq(els[1].textIds.join(","), "10,11", "mixed: group g:1 texts");
    h.eq(els[3].textIds.join(","), "40,41", "mixed: shape s:3 texts");
    h.eq(els[3].tie, 7, "mixed: shape element tie");
    h.eq(keysOf(BTE.Element.build(reversed(texts), [bg])), "t:50,g:1,g:2,s:3", "mixed: same order from reversed input");
})();

h.eq(BTE.Element.build([], []).length, 0, "empty: no texts, no elements");
h.eq(BTE.Element.build([], [{ id: 1, bounds: [0, 10, 10, 0] }]).length, 0, "empty: shapes alone make no element");

// ---- inputs are not mutated -----------------------------------------------

(function () {
    var g = { id: 7, bounds: [0, 300, 300, 0] };
    var texts = [text(1, g, [100, 110, 120, 100], 0), text(2, null, [500, 110, 520, 100], 1)];
    var shapes = [{ id: 40, bounds: [450, 150, 600, 50] }];
    var before = JSON.stringify([texts, shapes]);
    var els = BTE.Element.build(texts, shapes);

    h.eq(JSON.stringify([texts, shapes]), before, "no mutation: build leaves its inputs unchanged");

    els[0].bounds[0] = -999;
    els[1].bounds[0] = -999;
    els[0].textIds.push(99);
    h.eq(JSON.stringify([texts, shapes]), before, "no mutation: results do not alias input arrays");
})();

// ---- the position grid gives the same answer as comparing every shape ------
//
// Oracle: the rule of spec 4.2 written out over all shapes. Coordinates sit
// on a coarse lattice, so centres often fall exactly on shape edges and on
// cell borders, and shapes often share bounds or areas.

function oracleKey(t, shapes) {
    var cx = (t.bounds[0] + t.bounds[2]) / 2, cy = (t.bounds[1] + t.bounds[3]) / 2;
    var ta = (t.bounds[2] - t.bounds[0]) * (t.bounds[1] - t.bounds[3]);
    var best = -1, bestArea = 0, i, b, a;
    if (t.group) { return "g:" + t.group.id; }
    for (i = 0; i < shapes.length; i++) {
        b = shapes[i].bounds;
        a = (b[2] - b[0]) * (b[1] - b[3]);
        if (a <= ta || cx < b[0] || cx > b[2] || cy > b[1] || cy < b[3]) { continue; }
        if (best < 0 || a < bestArea) { best = i; bestArea = a; }
    }
    return best < 0 ? "t:" + t.id : "s:" + shapes[best].id;
}

(function () {
    var seed = 12345, cases = 300, bad = 0, firstBad = "", k, i, n, m, shapes, texts, els, got, want, x, y, w, hh;
    // Park-Miller: the product stays below 2^53, so every step is exact.
    function rnd(lim) { seed = (seed * 16807) % 2147483647; return seed % lim; }
    for (k = 0; k < cases; k++) {
        shapes = [];
        texts = [];
        n = rnd(60);
        m = 1 + rnd(40);
        for (i = 0; i < n; i++) {
            x = rnd(20) * 10; y = rnd(20) * 10; w = rnd(12) * 10; hh = rnd(12) * 10;
            if (rnd(15) === 0) { x = -50; y = -50; w = 400; hh = 400; }     // a background over everything
            shapes.push({ id: 1000 + i, bounds: [x, y + hh, x + w, y] });
            if (rnd(6) === 0) { shapes.push({ id: 5000 + i, bounds: shapes[shapes.length - 1].bounds.slice() }); }
        }
        for (i = 0; i < m; i++) {
            x = rnd(24) * 10 - 20; y = rnd(24) * 10 - 20; w = rnd(3) * 10; hh = rnd(3) * 5;
            texts.push({ id: i + 1, group: rnd(5) === 0 ? { id: 77, bounds: [0, 10, 10, 0] } : null,
                bounds: [x, y + hh, x + w, y], tie: i });
        }
        els = BTE.Element.build(texts, shapes);
        got = {};
        for (i = 0; i < els.length; i++) {
            for (x = 0; x < els[i].textIds.length; x++) { got[els[i].textIds[x]] = els[i].key; }
        }
        for (i = 0; i < texts.length; i++) {
            want = oracleKey(texts[i], shapes);
            if (got[texts[i].id] !== want) {
                bad++;
                if (firstBad === "") { firstBad = "case " + k + " text " + texts[i].id + ": " + got[texts[i].id] + " vs " + want; }
            }
        }
    }
    h.eq(bad, 0, "grid: same shape as the full comparison in " + cases + " random cases " + firstBad);
})();

(function () {
    // every shape flat on one axis: one column or one row of cells
    var lineX = [{ id: 1, bounds: [10, 100, 10, 0] }, { id: 2, bounds: [10, 50, 10, 20] }];
    var lineY = [{ id: 3, bounds: [0, 40, 100, 40] }];
    var pt = text(1, null, [10, 30, 10, 30], 0);              // area 0, centre (10, 30)
    h.eq(BTE.Element.build([pt], lineX)[0].key, "t:1", "grid: zero-area shapes are never larger than a zero-area text");
    h.eq(BTE.Element.build([text(2, null, [0, 40, 100, 40], 0)], lineY)[0].key, "t:2", "grid: flat shapes and a text on them");
    // a zero-area text in a real shape next to a flat one: the real shape wins
    h.eq(BTE.Element.build([text(3, null, [5, 60, 5, 60], 0)], [{ id: 4, bounds: [0, 100, 10, 0] }, { id: 5, bounds: [10, 100, 10, 0] }])[0].key,
        "s:4", "grid: a single real shape among flat ones");
    // centre outside the union of all shapes
    h.eq(BTE.Element.build([text(6, null, [500, 510, 520, 500], 0)], [{ id: 7, bounds: [0, 100, 100, 0] }])[0].key,
        "t:6", "grid: a centre beyond every shape");
    // centre exactly on the grid's outer edges (max x, max y)
    h.eq(BTE.Element.build([text(8, null, [99, 101, 101, 99], 0)],
        [{ id: 9, bounds: [0, 100, 100, 0] }, { id: 10, bounds: [50, 100, 100, 50] }])[0].key,
        "s:10", "grid: a centre on the far corner of the grid");
})();

(function () {
    // the grid is built only when a loose text needs it: shapes with
    // unusable bounds are never read for grouped texts
    var g = { id: 1, bounds: [0, 10, 10, 0] };
    var poisoned = [{ id: 2, get bounds() { throw new Error("shape bounds read"); } }];
    h.eq(BTE.Element.build([text(1, g, [1, 2, 3, 1], 0)], poisoned)[0].key, "g:1", "grid: not built for grouped texts only");
})();

// ---- inRect: elements by the centre of their bounds -----------------------

(function () {
    var rect = [0, 100, 200, -100];                          // the artboard
    var half = { key: "half", textIds: [1], bounds: [-100, 50, 20, -50], tie: 0 };       // centre (-40, 0)
    var mostly = { key: "mostly", textIds: [2], bounds: [-40, 50, 60, -50], tie: 1 };    // centre (10, 0)
    var left = { key: "left", textIds: [3], bounds: [-20, 10, 20, -10], tie: 2 };        // centre (0, 0): on the edge
    var topE = { key: "top", textIds: [4], bounds: [50, 120, 70, 80], tie: 3 };          // centre y 100: on the edge
    var above = { key: "above", textIds: [5], bounds: [50, 121, 70, 80], tie: 4 };       // centre y 100.5
    var inside = { key: "inside", textIds: [6], bounds: [90, 10, 110, -10], tie: 5 };
    var all = [half, mostly, left, topE, above, inside];

    h.eq(keysOf(BTE.Element.inRect(all, rect)), "mostly,left,top,inside", "inRect: keeps by centre, edges inclusive, input order");
    h.eq(BTE.Element.inRect([half], rect).length, 0, "inRect: half on the artboard with the centre outside is dropped");
    h.eq(BTE.Element.inRect([mostly], rect).length, 1, "inRect: most of it on the artboard keeps it");
    h.eq(BTE.Element.inRect([], rect).length, 0, "inRect: empty list");
    h.eq(BTE.Element.inRect(all, rect)[0], mostly, "inRect: returns the element objects themselves");
    h.eq(all.length, 6, "inRect: input list unchanged");
})();

h.done();
