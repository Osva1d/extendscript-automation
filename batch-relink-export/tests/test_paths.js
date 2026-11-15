#!/usr/bin/env node
/**
 * BRE.Core.samePath — one path in two Unicode forms. Illustrator reports a
 * placed file's and a document's path decomposed (NFD); Folder.getFiles and
 * typed text keep the name as stored, often composed (NFC). Measured
 * 2026-11-15, AI 30.8.2. Strings are built with fromCharCode so no editor
 * can normalize the test data.
 */
var T = require("./lib/load.js");
T.boot();
T.load("src/core.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function ch() { return String.fromCharCode.apply(null, arguments); }

var C = BRE.Core;

// Oracle: every character of Latin-1 Supplement and Latin Extended-A
// decomposes exactly as Node's canonical NFD does.
var bad = [];
for (var c = 0x00C0; c <= 0x017F; c++) {
    var s = ch(c);
    if (C._nfd(s) !== s.normalize("NFD")) { bad.push(c.toString(16)); }
}
assert(bad.length === 0, "_nfd matches NFD for U+00C0..U+017F (bad: " + bad.join(",") + ")");

// The measured case: "Část1.pdf" stored composed, reported decomposed.
var nfc = "/a/" + ch(0x10C) + "ást1.pdf";             // Č composed
var nfd = "/a/C" + ch(0x30C) + "a" + ch(0x301) + "st1.pdf";  // C + caron, a + acute
assert(nfc !== nfd, "the two forms differ as strings");
assert(C.samePath(nfc, nfd) === true, "samePath: NFC and NFD of one path");
assert(C.samePath(nfd, nfd) === true, "samePath: identical NFD");
assert(C.samePath(nfc, "/a/" + ch(0x10C) + "ást2.pdf") === false, "samePath: another file");
assert(C.samePath("/a/Cast1.pdf", nfc) === false, "samePath: no diacritics is not the same file");
assert(C.samePath("/A/X.pdf", "/a/x.pdf") === false, "samePath: case counts by default");
assert(C.samePath("/A/" + ch(0x10C) + "ást", "/a/c" + ch(0x30C) + "a" + ch(0x301) + "st", true) === true,
    "samePath: ignoreCase after decomposition");
assert(C._nfd("/x/" + ch(0x3A9) + ".pdf") === "/x/" + ch(0x3A9) + ".pdf", "_nfd: characters outside the table unchanged");

// verifyRelink: positions report NFD, the expected source came from getFiles in NFC.
var item = { file: { fsName: nfd }, boundingBox: [0, 100, 100, 0] };
var v = C.verifyRelink([{ item: item, label: "p1", size: [100, 100] }], { fsName: nfc });
assert(v.ok === true, "verifyRelink: NFC source, NFD link passes (" + v.errors.join(" | ") + ")");
var other = { file: { fsName: "/a/jine.pdf" }, boundingBox: [0, 100, 100, 0] };
assert(C.verifyRelink([{ item: other, label: "p1", size: [100, 100] }], { fsName: nfc }).ok === false,
    "verifyRelink: another file still fails");

// countManagedPositions: an NFC target still counts the NFD positions.
var layer = { visible: true, parent: { typename: "Document" } };
var doc = { placedItems: [
    { hidden: false, layer: layer, file: { fsName: nfd } },
    { hidden: false, layer: layer, file: { fsName: nfd } },
    { hidden: false, layer: layer, file: { fsName: "/a/logo.pdf" } }
] };
assert(C.countManagedPositions(doc, { fsName: nfc }) === 2, "countManagedPositions: NFC target counts NFD positions");

// findOpenDocument: the open document reports NFD, the template path is NFC.
var tplNfc = "/s/" + ch(0x160) + "ablona.ai", tplNfd = "/s/S" + ch(0x30C) + "ablona.ai";
var open = { fullName: { fsName: tplNfd } };
global.app.documents = [open];
assert(C.findOpenDocument({ fsName: tplNfc }) === open, "findOpenDocument: NFC path finds the NFD document");
global.app.documents = [];

console.log("test_paths: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
