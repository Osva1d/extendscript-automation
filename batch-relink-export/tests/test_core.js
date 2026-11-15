#!/usr/bin/env node
/** BRE.Core — pure decisions: skip rule, overwrite candidates, page map, artboards, sizes. */
var T = require("./lib/load.js");
T.boot();
T.load("src/core.js");
T.load("src/pdf.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

var table = {};
global.File = function (p) {
    var t = table[p] || { exists: false, modified: 0 };
    this.fsName = p; this.exists = t.exists; this.modified = t.modified;
};
function f(exists, modified) { return { exists: exists, modified: modified }; }

// isFinished
var C = BRE.Core;
assert(C.isFinished(f(true, 30), f(true, 10), f(true, 20)) === true, "isFinished: newer than both");
assert(C.isFinished(f(true, 15), f(true, 10), f(true, 20)) === false, "isFinished: older than template");
assert(C.isFinished(f(true, 5), f(true, 10), f(true, 1)) === false, "isFinished: older than source");
assert(C.isFinished(f(false, 99), f(true, 10), f(true, 20)) === false, "isFinished: missing");

// overwriteCandidates
function src(n) { return { name: n + ".pdf", displayName: n + ".pdf", modified: 100 }; }
var cfg = {
    namingPattern: "{n}_{template}_{source}", templateName: "t",
    pdfFiles: [src("a"), src("b"), src("c")],
    templateFile: { modified: 50 }, outputFolder: { fsName: "/out" }, skipExisting: true
};
table = {
    "/out/01_t_a.pdf": f(true, 200),   // finished
    "/out/02_t_b.pdf": f(true, 60),    // older than source
    "/out/03_t_c.pdf": f(false, 0)     // missing
};
assert(same(C.overwriteCandidates(cfg), ["/out/02_t_b.pdf", "/out/03_t_c.pdf"]),
    "overwriteCandidates: skip protects finished outputs only");
cfg.skipExisting = false;
assert(same(C.overwriteCandidates(cfg), ["/out/01_t_a.pdf", "/out/02_t_b.pdf", "/out/03_t_c.pdf"]),
    "overwriteCandidates: skip off lists all");

// describePageMap
var m = C.describePageMap([2, 1, 3], 3);
assert(m.ok === true && !m.unknown, "pageMap: permutation ok");
m = C.describePageMap([1, 1, 3], 3);
assert(!m.ok && same(m.duplicates, [{ page: 1, times: 2 }]) && same(m.missing, [2]) && same(m.beyond, []),
    "pageMap: duplicate and missing");
m = C.describePageMap([1, 2, 9], 3);
assert(!m.ok && same(m.missing, [3]) && same(m.beyond, [9]), "pageMap: beyond");
m = C.describePageMap(null, 4);
assert(m.ok === false && m.unknown === true && same(m.missing, []), "pageMap: unknown");
m = C.describePageMap([1, 1, 1, 1], 4);
assert(!m.ok && same(m.duplicates, [{ page: 1, times: 4 }]) && same(m.missing, [2, 3, 4]), "pageMap: repeat");

// positionsPerArtboard
var rects = [[0, 100, 100, 0], [100, 100, 200, 0]];
var p = C.positionsPerArtboard([[10, 10], [20, 20], [30, 30], [40, 40], [110, 10], [120, 20], [130, 30], [140, 40]], rects);
assert(same(p.counts, [4, 4]) && p.outside === 0, "positions: 4 + 4");
p = C.positionsPerArtboard([[250, 50]], rects);
assert(same(p.counts, [0, 0]) && p.outside === 1, "positions: outside");
p = C.positionsPerArtboard([[100, 50]], rects);
assert(same(p.counts, [1, 0]), "positions: shared edge counts for the first");

// distinctSizes
var s = C.distinctSizes([[255.1, 141.7], [255.15, 141.7], null, [240.9, 155.9]]);
assert(s.length === 2 && same(s[0], [255.1, 141.7]) && same(s[1], [240.9, 155.9]), "distinctSizes: two sizes");

// needsCheck
assert(C.needsCheck({ under: 0, over: 0, unreadable: 0, partial: 1 }, true) === false, "needsCheck: partial only, map ok");
assert(C.needsCheck({ under: 0, over: 0, unreadable: 0, partial: 1 }, false) === true, "needsCheck: map not ok");
assert(C.needsCheck({ under: 1, over: 0, unreadable: 0 }, true) === true, "needsCheck: under");
assert(C.needsCheck({ under: 0, over: 0, unreadable: 1 }, true) === true, "needsCheck: unreadable");
assert(C.needsCheck({ under: 0, over: 0, unreadable: 0 }, true) === false, "needsCheck: all ok");

console.log("test_core: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
