#!/usr/bin/env node
/** BRE.Core.inspectTemplate — layout and page map of the template, measured on a copy when open. */
var T = require("./lib/load.js");
T.boot();
T.load("src/core.js");
T.load("src/pdf.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

var fileLog;
global.File = function (p) {
    this.fsName = p; this.exists = true;
    this.copy = function (to) { fileLog.copied.push(to); return true; };
    this.remove = function () { fileLog.removed.push(this.fsName); return true; };
};
global.Folder = { temp: { fsName: "/tmp" } };
global.SaveOptions = { DONOTSAVECHANGES: "no" };
BRE.Core._probe = function () { return { fsName: "/tmp/probe.pdf", exists: true }; };
BRE.Core._log = function () {};

// 8 positions on two artboards (4 + 4); testPages[i] = page the probe gives position i.
function makeDoc(testPages) {
    var items = [], i;
    for (i = 0; i < testPages.length; i++) {
        (function (idx) {
            var cx = (idx < 4 ? 10 : 110) + (idx % 4) * 10;
            var it = {
                file: { fsName: "/src/a.pdf" }, hidden: false,
                layer: { visible: true, parent: { typename: "Document" } },
                geometricBounds: [cx - 5, 50, cx + 5, 40],
                boundingBox: [0, 100, 255, 0],
                relinked: 0,
                relink: function () {
                    this.relinked++;
                    this.boundingBox = [0, 100, BRE.Pdf.PROBE_BASE + testPages[idx] * BRE.Pdf.PROBE_STEP, 0];
                }
            };
            items.push(it);
        })(i);
    }
    var doc = {
        placedItems: items,
        artboards: [{ artboardRect: [0, 100, 100, 0] }, { artboardRect: [100, 100, 200, 0] }],
        closed: null,
        close: function (o) { this.closed = o; }
    };
    return doc;
}
var opened;
function mockOpen(doc) { global.app = { open: function (f) { opened.push(f.fsName); return doc; } }; }
function reset() { fileLog = { copied: [], removed: [] }; opened = []; }

// closed template, good map
reset();
var doc = makeDoc([1, 2, 3, 4, 5, 6, 7, 8]);
mockOpen(doc);
var tpl = new File("/t/tpl.ai");
var info = BRE.Core.inspectTemplate(tpl, null);
assert(info.positions === 8, "closed: 8 positions");
assert(same(info.perArtboard.counts, [4, 4]), "closed: 4 + 4");
assert(info.map.ok === true, "closed: map ok");
assert(info.sizes.length === 1, "closed: one size");
assert(same(info.pages, [1, 2, 3, 4, 5, 6, 7, 8]), "closed: pages");
assert(doc.closed === "no", "closed: closed without saving");
assert(opened[0] === "/t/tpl.ai" && fileLog.copied.length === 0, "closed: opened the file itself");

// duplicate page
reset();
doc = makeDoc([1, 1, 1, 4, 5, 6, 7, 8]);
mockOpen(doc);
info = BRE.Core.inspectTemplate(tpl, null);
assert(info.positions === 8, "duplicate: still 8 positions");
assert(!info.map.ok && info.map.duplicates.length > 0 && same(info.map.missing, [2, 3]), "duplicate: reported");
assert(info.pages !== null, "duplicate: raw pages kept");

// _positionPages keeps today's strict contract
var good = makeDoc([2, 1, 3, 4, 5, 6, 7, 8]);
assert(same(BRE.Core._positionPages(good.placedItems), [2, 1, 3, 4, 5, 6, 7, 8]), "_positionPages: good map");
var dup = makeDoc([1, 1, 3, 4, 5, 6, 7, 8]);
assert(BRE.Core._positionPages(dup.placedItems) === null, "_positionPages: duplicate gives null");

// open template: copy only
[true, false].forEach(function (saved) {
    reset();
    var user = makeDoc([1, 2, 3, 4, 5, 6, 7, 8]);
    user.saved = saved;
    var copyDoc = makeDoc([1, 2, 3, 4, 5, 6, 7, 8]);
    mockOpen(copyDoc);
    info = BRE.Core.inspectTemplate(tpl, user);
    assert(opened.length === 1 && opened[0] !== "/t/tpl.ai" && opened[0].indexOf("/tmp/bre-template-") === 0,
        "open (saved=" + saved + "): app.open got the copy");
    assert(fileLog.removed.length === 1 && fileLog.removed[0] === opened[0], "open (saved=" + saved + "): copy removed");
    var touched = 0, k;
    for (k = 0; k < user.placedItems.length; k++) touched += user.placedItems[k].relinked;
    assert(touched === 0, "open (saved=" + saved + "): user's items not relinked");
    assert(user.closed === null, "open (saved=" + saved + "): user's doc not closed");
    assert(copyDoc.closed === "no" && info.positions === 8, "open (saved=" + saved + "): copy closed, measured");
});

// no positions
reset();
doc = makeDoc([]);
mockOpen(doc);
var probed = 0;
BRE.Core._probe = function () { probed++; return { fsName: "/tmp/probe.pdf", exists: true }; };
info = BRE.Core.inspectTemplate(tpl, null);
assert(info.positions === 0 && probed === 0, "no positions: zero, no probe");
assert(doc.closed === "no", "no positions: closed");

console.log("test_inspect: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
