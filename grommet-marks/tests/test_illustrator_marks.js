#!/usr/bin/env node
/**
 * GM.Illustrator DOM adapter — mark drawing and path extraction, against a
 * fake DOM. New paths in Illustrator inherit the document's current stroke style
 * (measured in 30.8.1: dashes, cap, join after selecting a dashed path), so the
 * fake hands out paths that already carry an inherited dashed, round-capped
 * stroke — whatever placeMarkGroup does not set explicitly shows up here.
 *
 * Usage: node tests/test_illustrator_marks.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
global.app = { locale: "en_US" };
global.$ = { writeln: function () {} };
global.StrokeCap = { BUTTENDCAP: "BUTT", ROUNDENDCAP: "ROUND", PROJECTINGENDCAP: "PROJECTING" };
global.ColorModel = { REGISTRATION: "REGISTRATION", SPOT: "SPOT", PROCESS: "PROCESS" };
global.CMYKColor = function () { this.typename = "CMYKColor"; };
global.PathPointSelection = { ANCHORPOINT: "ANCHOR", NOSELECTION: "NONE",
                              LEFTDIRECTION: "LEFT", RIGHTDIRECTION: "RIGHT" };

var GM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("constants.js"));
eval(src("lib/utils.js"));
eval(src("core.js"));
eval(src("illustrator.js"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

// ===== FAKE DOM =====
function inheritedPath() {
    return { strokeDashes: [6, 3], strokeCap: StrokeCap.ROUNDENDCAP,
             setEntirePath: function (pts) { this.points = pts; } };
}
function fakeLayer() {
    var created = [];
    var grp = {
        pathItems: {
            ellipse: function () { var p = inheritedPath(); created.push(p); return p; },
            add: function () { var p = inheritedPath(); created.push(p); return p; }
        }
    };
    return { layer: { groupItems: { add: function () { return grp; } } }, created: created };
}
GM.Illustrator.doc = {
    swatches: [null, { color: { typename: "SpotColor", spot: { colorType: ColorModel.REGISTRATION } } }]
};

// ===== TEST: marks do not inherit the document stroke style (review G2) =====
console.log("--- placeMarkGroup: explicit stroke style (G2) ---");
(function () {
    var f = fakeLayer();
    var ok = GM.Illustrator.placeMarkGroup(f.layer, 100, 100, 10,
        { circle: true, cross: true, regWeight: 1, haloWeight: 3 });
    assert(ok === true, "placeMarkGroup succeeds");
    assert(f.created.length === 6, "circle + cross, halo + registration = 6 paths (got " + f.created.length + ")");
    var solid = true, butt = true;
    for (var i = 0; i < f.created.length; i++) {
        if (!(f.created[i].strokeDashes instanceof Array) || f.created[i].strokeDashes.length !== 0) solid = false;
        if (f.created[i].strokeCap !== StrokeCap.BUTTENDCAP) butt = false;
    }
    assert(solid, "every path has a solid stroke (no inherited dashes)");
    assert(butt, "every path has butt caps (no inherited round caps)");
})();

// ===== TEST: selected path with a duplicated closing anchor (review G6) =====
console.log("--- getSelectedPathInfo: duplicated closing anchor (G6) ---");
(function () {
    function pp(x, y) { return { anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y] }; }
    var rect = { typename: "PathItem", closed: true,
                 pathPoints: [pp(0, 0), pp(1000, 0), pp(1000, 500), pp(0, 500), pp(0, 0)] };
    GM.Illustrator.doc.selection = [rect];
    var info = GM.Illustrator.getSelectedPathInfo();
    assert(info.ok === true, "5-point closed rectangle is a usable path");
    assert(info.cornerCount === 4, "all 4 corners found (got " + info.cornerCount + ")");
    assert(Math.abs(info.totalLen - 3000) < 1e-6, "perimeter unchanged: 3000 (got " + info.totalLen + ")");
})();

// ===== TEST: corners, part of the outline (spec §5.2, §5.4) =====
console.log("--- getSelectedPathInfo: corners and a direct selection ---");
(function () {
    function pp(x, y, sel) {
        return { anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y],
                 selected: sel ? PathPointSelection.ANCHORPOINT : PathPointSelection.NOSELECTION };
    }
    var house = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, true), pp(1000, 600, false), pp(500, 1000, false), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [house];
    var info = GM.Illustrator.getSelectedPathInfo();
    assert(info.sharpCount === 5 && info.roundCount === 0 && info.cornerCount === 5, "house: 5 corners");
    assert(info.partial.state === "runs" && info.partial.runs.length === 1 && info.partial.selectedSegs === 1,
        "bottom side selected: one run of 1 segment (got " + info.partial.state + ")");
    assert(info.partial.totalSegs === 5, "5 segments in total");
    assert(info.pointSel.length === 5 && info.pointSel[0] === PathPointSelection.ANCHORPOINT, "point states kept for restoring");

    var lone = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, false), pp(1000, 600, false), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [lone];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "lone", "one lone anchor: 'lone'");

    var whole = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, true), pp(1000, 600, true), pp(0, 600, true)] };
    GM.Illustrator.doc.selection = [whole];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "none", "every anchor selected (Selection tool): whole outline");
})();

console.log("--- getDocInfo ---");
(function () {
    GM.Illustrator.doc.artboards = [{ artboardRect: [0, 500, 1000, 0] }, { artboardRect: [0, 0, 10, -10] }];
    GM.Illustrator.doc.scaleFactor = 10;
    var d = GM.Illustrator.getDocInfo();
    assert(d.artboards === 2 && d.width === 1000 && d.height === 500 && d.scale === 10, "count, first artboard size, scale");
    delete GM.Illustrator.doc.scaleFactor;
    assert(GM.Illustrator.getDocInfo().scale === 1, "no scaleFactor -> 1");
})();

// ===== TEST: what Task 5 delivers — rounded corners counted, selection aligned (review) =====
console.log("--- getSelectedPathInfo: rounded corners, selection with a duplicated anchor ---");
(function () {
    var A = PathPointSelection.ANCHORPOINT, N = PathPointSelection.NOSELECTION;
    function P(ax, ay, lx, ly, rx, ry, sel) {
        return { anchor: [ax, ay], leftDirection: [lx, ly], rightDirection: [rx, ry], selected: sel ? A : N };
    }
    // Rounded rectangle 1000 x 600, R 100, 8 anchors with circle handles (live corners)
    var W = 1000, H = 600, R = 100, k = 0.5522847498 * R;
    var rr = { typename: "PathItem", closed: true, pathPoints: [
        P(R, 0, R - k, 0, R, 0), P(W - R, 0, W - R, 0, W - R + k, 0),
        P(W, R, W, R - k, W, R), P(W, H - R, W, H - R, W, H - R + k),
        P(W - R, H, W - R + k, H, W - R, H), P(R, H, R, H, R - k, H),
        P(0, H - R, 0, H - R + k, 0, H - R), P(0, R, 0, R, 0, R - k)] };
    GM.Illustrator.doc.selection = [rr];
    var i1 = GM.Illustrator.getSelectedPathInfo();
    assert(i1.cornerCount === 4 && i1.sharpCount === 0 && i1.roundCount === 4,
        "rounded rectangle: 4 corners, all rounded (got " + i1.cornerCount + "/" + i1.sharpCount + "/" + i1.roundCount + ")");
    assert(i1.partial.state === "none", "nothing selected: whole outline");

    // Duplicated middle anchor; the segment after it is selected
    function pp(x, y, sel) { return P(x, y, x, y, x, y, sel); }
    var dup = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, false), pp(1000, 0, false), pp(1000, 0, true), pp(1000, 600, true), pp(0, 600, false)] };
    GM.Illustrator.doc.selection = [dup];
    var i2 = GM.Illustrator.getSelectedPathInfo();
    assert(i2.partial.state === "runs" && i2.partial.runs.length === 1 &&
        Math.abs(i2.partial.runs[0].from - 1000) < 1e-6 && Math.abs(i2.partial.runs[0].len - 600) < 1e-6,
        "selection stays aligned after dropping the zero-length segment: run 1000+600");
    assert(i2.partial.totalSegs === 4, "4 segments after the drop");

    // Duplicated closing anchor, only the two coincident anchors selected
    var close = { typename: "PathItem", closed: true, pathPoints: [
        pp(0, 0, true), pp(1000, 0, false), pp(1000, 600, false), pp(0, 600, false), pp(0, 0, true)] };
    GM.Illustrator.doc.selection = [close];
    assert(GM.Illustrator.getSelectedPathInfo().partial.state === "lone",
        "two coincident anchors selected: no whole segment — 'lone', not a run");
})();

// ===== TEST: offsetPath (spec §6.1) =====
// The fake models the document selection as measured (Illustrator 30.8.2,
// 2026-10-13): `item.selected = true` adds the item to doc.selection;
// `doc.selection = null` empties it EXCEPT for a path with direct-selected
// anchors (some selected, some not), which stays selected; `item.selected = false`
// deselects such a path and drops its point states; expandStyle replaces the
// selected copy by the result IN PLACE and keeps every other selected item. So a
// run that forgets to deselect the cut line ends with [cutLine, result] selected,
// and cleanup would delete the cut line - the test sees that.
console.log("--- offsetPath: clean copy, expand, clean up, selection back ---");
(function () {
    var A = PathPointSelection.ANCHORPOINT, N = PathPointSelection.NOSELECTION;
    var doc = GM.Illustrator.doc, savedSel = doc.selection, savedActive = global.app.activeDocument;
    var selection = [], src, tmp, result, menu, removed, addCalls, tmpPts, pointsSelectPath, afterExpand, effectAtExpand, stuck;
    // Anchors selected on only some points: the state `doc.selection = null` does not clear.
    function directlySelected(item) {
        var a = 0, n = 0, len = item.pathPoints.length;
        for (var i = 0; i < len; i++) {
            if (item.pathPoints[i].state === A) a++;
            if (item.pathPoints[i].state === N) n++;
        }
        return a < len && n < len;
    }

    Object.defineProperty(doc, "selection", { configurable: true, enumerable: true,
        get: function () { return selection; },
        set: function (v) {
            if (v) selection = v.slice();
            else if (src && selection && selection.indexOf(src) >= 0 && (stuck || directlySelected(src))) selection = [src];
            else selection = [];
            if (src && selection.indexOf(src) < 0) {
                for (var i = 0; i < src.pathPoints.length; i++) src.pathPoints[i].state = N;
            }
        } });
    function selectable(item) {
        Object.defineProperty(item, "selected", { configurable: true, enumerable: true,
            get: function () { return selection !== null && selection.indexOf(item) >= 0; },
            set: function (v) {
                if (selection === null) selection = [];
                var at = selection.indexOf(item);
                if (v && at < 0) selection.push(item);
                if (!v && at >= 0 && !(stuck && item === src)) {
                    selection.splice(at, 1);
                    if (item === src) {
                        for (var i = 0; i < src.pathPoints.length; i++) src.pathPoints[i].state = N;
                    }
                }
            } });
        return item;
    }
    function removeFn() { this.removed = true; removed.push(this); }
    // A cut-line point: distinct handles; its selection state selects the path
    // (measured 2026-10-13, M3; switched off for the post-condition tests).
    function cutPt(x, y, lx, ly, rx, ry, state) {
        var p = { anchor: [x, y], leftDirection: [lx, ly], rightDirection: [rx, ry], state: state };
        Object.defineProperty(p, "selected", { configurable: true, enumerable: true,
            get: function () { return this.state; },
            set: function (v) { this.state = v; if (v !== N && pointsSelectPath) src.selected = true; } });
        return p;
    }
    function resultPt(x, y) {
        return { anchor: [x, y], leftDirection: [x, y], rightDirection: [x, y], selected: N };
    }
    function square(a, b) {
        return { typename: "PathItem", closed: true, removed: false, remove: removeFn,
                 pathPoints: [resultPt(a, a), resultPt(b, a), resultPt(b, b), resultPt(a, b)] };
    }
    function build(opts) {
        menu = []; removed = []; addCalls = 0; tmpPts = []; afterExpand = null; effectAtExpand = undefined;
        pointsSelectPath = !(opts && opts.pointsDoNotSelect);
        stuck = !!(opts && opts.stuckSelection);
        tmp = selectable({ pathPoints: { add: function () { var p = {}; tmpPts.push(p); return p; } },
            applyEffect: function (x) { this.effect = x; }, remove: removeFn });
        src = selectable({ typename: "PathItem", closed: true, removed: false, remove: removeFn,
            pathPoints: [cutPt(0, 0, -10, 1, 10, 2, A), cutPt(1000, 0, 990, 3, 1010, 4, A),
                         cutPt(1000, 1000, 995, 1005, 1005, 995, N), cutPt(0, 1000, 5, 1000, -5, 1000, N)],
            layer: { pathItems: { add: function () { addCalls++; return tmp; } } } });
        selection = [src];                     // the user's cut line is selected when the run starts
        return { pathRef: src, pointSel: [A, A, N, N] };
    }
    function states() {
        var out = [];
        for (var i = 0; i < src.pathPoints.length; i++) out.push(src.pathPoints[i].state);
        return out.join(",");
    }
    function same(a, b) { return !!a && !!b && a.length === b.length && a[0] === b[0] && a[1] === b[1]; }
    function segLen(res) { return res && res.segments ? res.segments.length : -1; }
    function selIs(item) { return selection !== null && selection.length === 1 && selection[0] === item; }

    GM.Illustrator.doc.name = "test";
    global.app.activeDocument = GM.Illustrator.doc;
    global.app.executeMenuCommand = function (cmd) {
        menu.push(cmd);
        effectAtExpand = tmp.effect;
        if (afterExpand === "empty") { selection = []; return; }
        if (afterExpand === "null") { selection = null; return; }
        var at = selection.indexOf(tmp);
        if (at >= 0) selection[at] = result;   // the copy is replaced in place; other selected items stay
    };

    // --- the normal run ---
    var info = build();
    result = square(50, 950);
    var r = GM.Illustrator.offsetPath(info, 50);
    assert(r.ok === true && r.loops === 1 && segLen(r) === 4, "one loop, 4 segments");
    assert(segLen(r) > 0 && Math.abs(r.segments[0].p0[0] - 50) < 1e-9, "segments read from the expanded result");
    assert(tmpPts.length === 4 && tmp.filled === true && tmp.stroked === false && tmp.closed === true,
        "clean copy: 4 points, closed, fill, no stroke");
    var handlesOk = tmpPts.length === 4;
    for (var i = 0; handlesOk && i < 4; i++) {
        handlesOk = same(tmpPts[i].anchor, src.pathPoints[i].anchor) &&
                    same(tmpPts[i].leftDirection, src.pathPoints[i].leftDirection) &&
                    same(tmpPts[i].rightDirection, src.pathPoints[i].rightDirection);
    }
    assert(handlesOk, "the copy carries anchor, left and right handle of every point");
    assert(tmp.effect === '<LiveEffect name="Adobe Offset Path"><Dict data="R mlim 4 R ofst -50 I jntp 2 "/></LiveEffect>',
        "inward miter offset: Adobe Offset Path, mlim 4, ofst -D, jntp 2");
    assert(effectAtExpand === tmp.effect, "effect applied before expandStyle");
    assert(menu.length === 1 && menu[0] === "expandStyle", "expanded once");
    assert(removed.length === 1 && removed[0] === result, "only the expanded result was removed");
    assert(src.removed === false, "the user's cut line is never removed");
    assert(selIs(src) && states() === [A, A, N, N].join(","),
        "cut line selected again, point selection handed back");

    // --- a split line: compound path with two loops ---
    info = build();
    var c1 = square(50, 400), c2 = square(600, 950);
    result = { typename: "CompoundPathItem", pathItems: [c1, c2], remove: removeFn };
    var r2 = GM.Illustrator.offsetPath(info, 50);
    assert(r2.ok === true && r2.loops === 2 && segLen(r2) === 0, "split line: 2 loops, segments only for one loop");
    assert(removed.length === 1 && removed[0] === result && src.removed === false, "split line: result removed, cut line kept");

    // --- result in a group (object with fill and stroke) ---
    info = build();
    result = { typename: "GroupItem", pageItems: [square(50, 950)], remove: removeFn };
    var rg = GM.Illustrator.offsetPath(info, 50);
    assert(rg.ok === true && rg.loops === 1 && segLen(rg) === 4 && removed.length === 1 && removed[0] === result,
        "group result: path found inside, group removed");

    // --- failure in the effect: reported, copy removed, nothing else lost ---
    info = build();
    tmp.applyEffect = function () { throw new Error("no effect"); };
    var r3 = GM.Illustrator.offsetPath(info, 50);
    assert(r3.ok === false && r3.message === "no effect", "failure reported");
    assert(removed.length === 1 && removed[0] === tmp && src.removed === false, "copy removed, cut line kept");
    assert(selIs(src), "selection back after a failure");

    // --- another document is active: no menu command ---
    info = build();
    result = square(50, 950);
    global.app.activeDocument = { name: "other" };
    var r4 = GM.Illustrator.offsetPath(info, 50);
    global.app.activeDocument = GM.Illustrator.doc;
    assert(r4.ok === false && r4.message === "active document changed", "active-document guard reported");
    assert(menu.length === 0, "no menu command in the wrong document");
    assert(removed.length === 1 && removed[0] === tmp && src.removed === false, "guard: copy removed, cut line kept");

    // --- an offset of 0 or less is a caller bug: nothing touched ---
    info = build();
    result = square(50, 950);
    var bad = [0, -5, NaN, undefined], badOk = true;
    for (var b = 0; b < bad.length; b++) {
        var rb = GM.Illustrator.offsetPath(info, bad[b]);
        if (rb.ok !== false || rb.message !== "offset must be greater than 0") badOk = false;
    }
    assert(badOk, "D <= 0, NaN, undefined: {ok:false} with a message");
    assert(addCalls === 0 && menu.length === 0 && removed.length === 0 &&
           selIs(src) && states() === [A, A, N, N].join(","),
        "D <= 0: the document is not touched");

    // --- the cut line cannot be deselected: the copy is not expanded next to it ---
    info = build({ stuckSelection: true });
    result = square(50, 950);
    var rs = GM.Illustrator.offsetPath(info, 50);
    assert(rs.ok === false && rs.message === "could not isolate the offset copy", "cut line still selected: error, not an expansion");
    assert(menu.length === 0 && src.removed === false && removed.length === 1 && removed[0] === tmp,
        "stuck selection: no expandStyle, copy removed, cut line kept");

    // --- expandStyle left nothing selected: never a silent ok ---
    info = build();
    result = square(50, 950);
    afterExpand = "empty";
    var r5 = GM.Illustrator.offsetPath(info, 50);
    assert(r5.ok === false && r5.message === "expandStyle left no result selected", "empty selection after expandStyle: error");
    assert(removed.length === 1 && removed[0] === tmp && src.removed === false, "empty selection: copy removed, cut line kept");
    assert(selIs(src), "empty selection: cut line selected again");

    info = build();
    result = square(50, 950);
    afterExpand = "null";
    var r6 = GM.Illustrator.offsetPath(info, 50);
    assert(r6.ok === false && r6.message === "expandStyle left no result selected", "null selection after expandStyle: same error");
    assert(removed.length === 1 && removed[0] === tmp && src.removed === false, "null selection: copy removed, cut line kept");
    assert(selIs(src), "null selection: cut line selected again");

    // --- _restoreSelection: the path ends selected even if point states select nothing ---
    info = build({ pointsDoNotSelect: true });
    src.selected = false;
    GM.Illustrator._restoreSelection(info);
    assert(selIs(src) && states() === [A, A, N, N].join(","),
        "restore: point states do not select the path -> the whole path is selected, states kept");
    info = build();
    src.selected = false;
    GM.Illustrator._restoreSelection({ pathRef: src, pointSel: [] });
    assert(selIs(src), "restore: no saved point states -> the path is selected");
    info = build();
    src.selected = false;
    GM.Illustrator._restoreSelection(info);
    assert(selIs(src) && states() === [A, A, N, N].join(","),
        "restore: states select the path, selected once");
    info = build();
    src.selected = false;
    Object.defineProperty(src.pathPoints[1], "selected", { configurable: true,
        set: function () { throw new Error("no point state"); }, get: function () { return N; } });
    GM.Illustrator._restoreSelection(info);
    assert(selIs(src), "restore: setting a point state fails -> the path is selected");
    info = build({ pointsDoNotSelect: true });
    result = square(50, 950);
    var r7 = GM.Illustrator.offsetPath(info, 50);
    assert(r7.ok === true && selIs(src), "run end to end: cut line selected after the run");

    // --- put the shared fake document back as it was ---
    delete doc.selection;
    doc.selection = savedSel;
    global.app.activeDocument = savedActive;
    delete global.app.executeMenuCommand;
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
