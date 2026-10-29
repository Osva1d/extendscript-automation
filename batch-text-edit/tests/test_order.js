var h = require("./lib/harness"), BTE = h.load(["src/lib/utils.js", "src/order.js"]);

// Illustrator coordinates: bounds are [left, top, right, bottom], top > bottom.
function box(key, left, top, w, hgt, tie) {
    return { key: key, bounds: [left, top, left + w, top - hgt], tie: tie };
}

// cols x rows grid of 10 x 10 boxes, pitch 12, key = row * cols + col (reading
// order). dx(key) / dy(key) jitter the centre; row `shiftRow` moves down by
// `shiftBy`.
function grid(cols, rows, dx, dy, shiftRow, shiftBy) {
    var items = [], r, c, key, x, y;
    for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
            key = r * cols + c;
            x = c * 12 + (dx ? dx(key) : 0);
            y = -r * 12 + (dy ? dy(key) : 0) - (r === shiftRow ? shiftBy : 0);
            items.push(box(key, x, y, 10, 10, key));
        }
    }
    return items;
}

function seq(n) {
    var a = [], i;
    for (i = 0; i < n; i++) { a.push(i); }
    return a;
}

function reversed(items) {
    var a = [], i;
    for (i = items.length - 1; i >= 0; i--) { a.push(items[i]); }
    return a;
}

function keys(items, mode) { return BTE.Order.sort(items, mode).join(","); }

var READING = seq(12).join(",");                        // 4 columns x 3 rows
var COLUMNS = "0,4,8,1,5,9,2,6,10,3,7,11";

// --- plain grid -------------------------------------------------------------
h.eq(keys(grid(4, 3), "rows"), READING, "grid rows: reading order");
h.eq(keys(grid(4, 3), "cols"), COLUMNS, "grid cols: column order");
h.eq(keys(reversed(grid(4, 3)), "rows"), READING, "grid rows: input order does not matter");
h.eq(keys(reversed(grid(4, 3)), "cols"), COLUMNS, "grid cols: input order does not matter");
h.eq(keys(grid(3, 4), "rows"), READING, "3 x 4 grid rows");
h.eq(keys(grid(3, 4), "cols"), "0,3,6,9,1,4,7,10,2,5,8,11", "3 x 4 grid cols");

// --- jitter ---------------------------------------------------------------
// Fixed jitter up to +-3 per key. The tolerance is 5 and a row's first item is
// its highest, so the order only holds while the cy spread inside a row is at
// most 5 (cx spread inside a column for "cols"). The fixture is checked, not
// trusted: it uses the full +-3 but keeps every spread at exactly 5.
var JX = [-3, 3, 0, -1,   2, -2, 3, -3,   0, 1, -2, 2];
var JY = [3, -2, 0, 1,   -3, 2, 0, -1,   2, 3, -2, 1];
function jx(k) { return JX[k]; }
function jy(k) { return JY[k]; }
(function () {
    var worst = 0, lo, hi, r, c, k;
    for (k = 0; k < 12; k++) {
        worst = Math.max(worst, Math.abs(JX[k]), Math.abs(JY[k]));
    }
    h.eq(worst, 3, "fixture reaches +-3");
    for (r = 0; r < 3; r++) {                           // cy spread inside each row
        lo = 99; hi = -99;
        for (c = 0; c < 4; c++) { lo = Math.min(lo, JY[r * 4 + c]); hi = Math.max(hi, JY[r * 4 + c]); }
        h.assert(hi - lo <= 5, "fixture: row " + r + " cy spread within tolerance");
    }
    for (c = 0; c < 4; c++) {                           // cx spread inside each column
        lo = 99; hi = -99;
        for (r = 0; r < 3; r++) { lo = Math.min(lo, JX[r * 4 + c]); hi = Math.max(hi, JX[r * 4 + c]); }
        h.assert(hi - lo <= 5, "fixture: column " + c + " cx spread within tolerance");
    }
})();
h.eq(keys(grid(4, 3, jx, jy), "rows"), READING, "jitter +-3: rows keep order");
h.eq(keys(grid(4, 3, jx, jy), "cols"), COLUMNS, "jitter +-3: cols keep order");
h.eq(keys(reversed(grid(4, 3, jx, jy)), "rows"), READING, "jitter +-3: rows, reversed input");
h.eq(keys(reversed(grid(4, 3, jx, jy)), "cols"), COLUMNS, "jitter +-3: cols, reversed input");

// Seeded sweep: jitter within +-2.4 keeps every spread under the tolerance by
// construction, so the order must hold for every seed. Park-Miller generator,
// exact in double precision.
(function () {
    var seed, state, bad = 0, k, rnd, items;
    function next() {
        state = (state * 16807) % 2147483647;
        return state / 2147483647;                      // (0, 1)
    }
    for (seed = 1; seed <= 200; seed++) {
        state = seed;
        rnd = [];
        for (k = 0; k < 24; k++) { rnd.push((next() * 2 - 1) * 2.4); }
        items = grid(4, 3, function (key) { return rnd[key]; }, function (key) { return rnd[12 + key]; });
        if (keys(items, "rows") !== READING) { bad++; }
        if (keys(items, "cols") !== COLUMNS) { bad++; }
    }
    h.eq(bad, 0, "200 seeded jitters within +-2.4 keep rows and cols order");
})();

// --- a shifted row stays a row ------------------------------------------------
h.eq(keys(grid(4, 3, null, null, 1, 5), "rows"), READING, "row 2 shifted down by 5: still three rows, rows");
h.eq(keys(grid(4, 3, null, null, 1, 5), "cols"), COLUMNS, "row 2 shifted down by 5: cols");

// --- tolerance boundary: strictly more than the tolerance starts a new row -----
// Sizes are 10, so the tolerance is 5. A has cy 0 and cx 5.
(function () {
    var a = box("A", 0, 5, 10, 10, 0);
    h.eq(keys([a, box("B", -20, 0, 10, 10, 1)], "rows"), "B,A", "rows: centres 5 apart (= tolerance) are one row, B left of A");
    h.eq(keys([a, box("B", -20, -0.5, 10, 10, 1)], "rows"), "A,B", "rows: centres 5.5 apart (> tolerance) are two rows, A above");
    // cols: the same on the X axis. B far below / above A, cx 5 or 5.5 apart.
    h.eq(keys([a, box("B", 5, -20, 10, 10, 1)], "cols"), "A,B", "cols: cx 5 apart: one column, A above B");
    h.eq(keys([a, box("B", 5, 20, 10, 10, 1)], "cols"), "B,A", "cols: cx 5 apart: one column, B above A");
    h.eq(keys([a, box("B", 5.5, 20, 10, 10, 1)], "cols"), "A,B", "cols: cx 5.5 apart: two columns, A left");
})();

// --- transitive: a row is compared with its FIRST item ----------------------------
// cy 0, -4, -8 with tolerance 5: -8 is 8 from the first item, so it starts a
// row although it is only 4 from its neighbour. Same answer for every input order.
(function () {
    var p = box("p", 0, 5, 10, 10, 0);        // cy 0
    var q = box("q", 20, 1, 10, 10, 1);       // cy -4
    var r = box("r", -20, -3, 10, 10, 2);     // cy -8, far left
    h.eq(keys([p, q, r], "rows"), "p,q,r", "transitive: p,q one row, r its own row below");
    h.eq(keys([r, q, p], "rows"), "p,q,r", "transitive: same for reversed input");
    h.eq(keys([q, r, p], "rows"), "p,q,r", "transitive: same for shuffled input");
})();

// --- the tolerance is the MEDIAN of the sizes ---------------------------------------
// 12 grid boxes (height 10) plus one 200-high box on the right whose cy is 1.
// Median height 10 -> tolerance 5; the big box is 6 above row 0, so it is a row
// of its own and comes first. A mean or max tolerance would merge it into row 0
// and put it last in that row.
(function () {
    var items = grid(4, 3);
    items.push(box("H", 200, 101, 100, 200, 99));
    h.eq(keys(items, "rows"), "H," + READING, "median, not mean: a big box does not swallow row 0");
})();

// Even count: the lower middle element is the median. Heights 10 and 20 ->
// median 10, tolerance 5; the centres are 7 apart, so two rows. (Upper middle
// or mean would give tolerance 10 / 7.5, one row, B left of A.)
h.eq(keys([box("A", 10, 5, 10, 10, 0), box("B", 0, 3, 10, 20, 1)], "rows"), "A,B",
    "even count: lower middle height is the median");
// Same on the X axis: widths 10 and 20, centres 7 apart.
h.eq(keys([box("A", 5, 10, 10, 10, 0), box("B", -7, 0, 20, 10, 1)], "cols"), "B,A",
    "even count, cols: lower middle width is the median");

// The sizes are sorted as numbers: heights 9, 10, 100 -> median 10, tolerance 5.
// Sorted as strings ("10", "100", "9") the median would be 100 and A, B (7 apart)
// would share a row, B left of A.
(function () {
    var a = box("A", 10, 4.5, 20, 9, 0);       // cy 0, cx 20, height 9
    var b = box("B", 0, -2, 10, 10, 1);        // cy -7, cx 5, height 10
    var c = box("C", 0, -1000, 100, 100, 2);   // cy -1050, height 100
    h.eq(keys([a, b, c], "rows"), "A,B,C", "median sizes sort numerically");
})();

// --- ties ------------------------------------------------------------------------
(function () {
    var a = box("a", 0, 10, 10, 10, 0);
    var b = box("b", 0, 10, 10, 10, 1);
    var c = box("c", 0, 10, 10, 10, 2);
    h.eq(keys([c, a, b], "rows"), "a,b,c", "identical centres: tie order (rows)");
    h.eq(keys([b, c, a], "rows"), "a,b,c", "identical centres: tie order, other input order");
    h.eq(keys([c, a, b], "cols"), "a,b,c", "identical centres: tie order (cols)");
    h.eq(keys([box("late", 0, 10, 10, 10, 10), box("early", 0, 10, 10, 10, 9)], "rows"), "early,late",
        "tie compares numbers, not strings");
    // Same cy, different cx: cx decides before tie.
    h.eq(keys([box("right", 20, 10, 10, 10, 0), box("left", 0, 10, 10, 10, 5)], "rows"), "left,right",
        "tie does not override cx inside a row");
    // Equal cx but different cy inside one row: the order along the row is
    // decided by tie alone, not by how the cy sort happened to lay them out
    // (the engine's sort is not stable, so this must not lean on it).
    h.eq(keys([box("hi", 0, 10, 10, 10, 1), box("lo", 0, 9, 10, 10, 0)], "rows"), "lo,hi",
        "rows: equal cx, tie decides inside the row");
    h.eq(keys([box("left", 0, 10, 10, 10, 1), box("right", 1, 10, 10, 10, 0)], "cols"), "right,left",
        "cols: equal cy, tie decides inside the column");
})();

// --- edges -----------------------------------------------------------------------
h.eq(JSON.stringify(BTE.Order.sort([], "rows")), "[]", "empty list returns [] (rows)");
h.eq(JSON.stringify(BTE.Order.sort([], "cols")), "[]", "empty list returns [] (cols)");
h.eq(JSON.stringify(BTE.Order.sort([box("only", 0, 10, 10, 10, 0)], "rows")), '["only"]', "one item returns itself");
h.eq(JSON.stringify(BTE.Order.sort([box("only", 0, 10, 10, 10, 0)], "cols")), '["only"]', "one item returns itself (cols)");
(function () {
    var threw = false;
    try { BTE.Order.sort([box("x", 0, 10, 10, 10, 0)], "diagonal"); } catch (e) { threw = true; }
    h.assert(threw, "unknown mode throws");
})();

// --- the input is not touched ------------------------------------------------------
(function () {
    var items = reversed(grid(4, 3, jx, jy));
    var before = JSON.stringify(items);
    BTE.Order.sort(items, "rows");
    BTE.Order.sort(items, "cols");
    h.eq(JSON.stringify(items), before, "input array and items unchanged");
})();

h.done();
