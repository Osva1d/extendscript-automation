#!/usr/bin/env node
/**
 * shared/lib/drawing_scale.js — the drawing scale 1:N kept in the document.
 * The packet cases are tile-export's (tests/test_doc.js, 1.1.0): the module
 * must keep reading what tile-export 1.1.0 has written.
 */
var fs = require("fs");
var path = require("path");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "drawing_scale.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

var logged = [];
var NS = { Utils: { log: function (m) { logged.push(m); } } };
buildDrawingScale(NS);
var D = NS.DrawingScale;
var NSURI = "https://codeberg.org/Osva1d/extendscript-automation/ns/tile-export/1.0/";

console.log("\n=== the family key is tile-export 1.1.0's ===");
assert(D.NAMESPACE === NSURI, "namespace unchanged, so documents written by tile-export 1.1.0 read");
assert(D.KEY === "drawingScale", "key unchanged");

console.log("\n=== read and write a packet ===");
var XMP = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    + '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>Adobe Illustrator</xmp:CreatorTool>'
    + "</rdf:Description></rdf:RDF></x:xmpmeta>";
assert(D.read(XMP) === null, "a document never given a scale has none");
var x10 = D.write(XMP, 10);
assert(D.read(x10) === 10, "written as 10, read back as 10");
assert(x10.indexOf(NSURI) !== -1, "under the family namespace");
assert(x10.indexOf("xmp:CreatorTool") !== -1, "the rest of the packet is kept");
var x125 = D.write(x10, 12.5);
assert(D.read(x125) === 12.5, "rewriting replaces the value");
assert(x125.split("te:drawingScale>").length === 3, "and does not add a second one");
var x25 = D.write(XMP, 2.5);
assert(D.read(x25) === 2.5, "a decimal scale, 1:2,5");
// An XMP toolkit may store a simple property as an attribute instead.
var xAttr = XMP.replace('<rdf:Description rdf:about=""',
    '<rdf:Description rdf:about="" xmlns:te="' + NSURI + '" te:drawingScale="20"');
assert(D.read(xAttr) === 20, "the attribute form is read too");
assert(D.read(D.write(xAttr, 5)) === 5, "and rewritten in place");
assert(D.write("<x:xmpmeta/>", 10) === null, "no RDF to write into: nothing written");
assert(D.read(XMP.replace("</rdf:RDF>",
    '<rdf:Description xmlns:te="' + NSURI + '"><te:drawingScale>0</te:drawingScale>'
    + "</rdf:Description></rdf:RDF>")) === null,
    "a zero scale counts as none");

console.log("\n=== a prefix Illustrator renamed (tile-export N43) ===");
// Illustrator re-serializes the packet it is given: the value moves into its
// own description and the prefix "te" may come back renamed (measured
// 2026-10-11, AI 30.8.2: "te_1_"). The namespace is what identifies it.
var XMP_AI = XMP.replace('xmlns:xmp="http://ns.adobe.com/xap/1.0/"',
    'xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n            xmlns:te_1_="' + NSURI + '"')
    .replace("</xmp:CreatorTool>", "</xmp:CreatorTool>\n         <te_1_:drawingScale>10</te_1_:drawingScale>");
assert(D.read(XMP_AI) === 10, "a renamed prefix is read through its namespace");
var xAi = D.write(XMP_AI, 12.5);
assert(D.read(xAi) === 12.5, "and rewritten");
assert(xAi.split("drawingScale>").length === 3, "in place, without a second value beside it");
var xOther = XMP.replace("</rdf:RDF>", '<rdf:Description xmlns:foo="http://example.com/other/">'
    + "<foo:drawingScale>7</foo:drawingScale></rdf:Description></rdf:RDF>");
assert(D.read(xOther) === null, "another namespace's drawingScale is not ours");
assert(D.read(D.write(xOther, 4)) === 4, "and writing ours leaves it be");
assert(D.read(null) === null, "an unreadable packet counts as none");

console.log("\n=== load and save on a document ===");
var doc = { XMPString: XMP };
assert(D.load(doc) === null, "a new document has no scale");
assert(D.save(doc, 10) === true, "saved");
assert(D.load(doc) === 10, "and loaded back");
var before = doc.XMPString;
assert(D.save(doc, 10) === true && doc.XMPString === before, "saving the same value leaves the packet untouched");
assert(D.save({ XMPString: "<x:xmpmeta/>" }, 10) === false, "a packet without RDF cannot hold it");
var unreadable = {};
Object.defineProperty(unreadable, "XMPString", { get: function () { throw new Error("no XMP"); } });
var threw = false;
try {
    assert(D.load(unreadable) === null, "an unreadable packet loads as none");
    assert(D.save(unreadable, 10) === false, "and cannot be saved to");
} catch (e) { threw = true; }
assert(!threw, "no exception escapes load or save");
var readOnly = {};
Object.defineProperty(readOnly, "XMPString", {
    get: function () { return XMP; },
    set: function () { throw new Error("read-only"); }
});
assert(D.save(readOnly, 10) === false, "a packet that refuses the write reports false");
assert(logged.length >= 3, "every failure is logged");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
