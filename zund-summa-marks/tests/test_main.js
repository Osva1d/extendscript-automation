#!/usr/bin/env node
/**
 * src/main.js Test Suite — the run's orchestration.
 *
 * main.js is an IIFE that runs when it is evaluated, so each case installs its
 * stubs and evaluates the file once:
 *   - ZSM.UI.show   returns the wrapper the dialog would (or null = Cancel)
 *   - ZSM.Storage   load / save, recorded
 *   - ZSM.Draw      session, bounds and render, recorded; render answers as told
 *   - ZSM.Core      calculateAll, a placeholder geometry
 *   - app, alert    the mock Illustrator (tests/lib/mock_illustrator.js), alerts
 *                   collected
 * ZSM.L, ZSM.Config, ZSM.Utils and the shared ZSM.DrawingScale are the real
 * modules; DrawingScale.save is wrapped to count its calls and still writes
 * into the mock document's XMPString.
 *
 * Coverage:
 *   - The drawing scale goes into the document only after a run that drew and
 *     only when it differs from what the document held (spec 1.2.0 §5.2).
 *
 * Usage: node tests/test_main.js
 */

var fs   = require("fs");
var path = require("path");
var Mock = require("./lib/mock_illustrator.js");

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}
function assertEq(a, b, msg) {
    total++;
    if (a === b) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b)); }
}

// ===== SETUP =====
Mock.install();
global.CoordinateSystem = { DOCUMENTCOORDINATESYSTEM: "DOCUMENTCOORDINATESYSTEM" };
var alerts = [];
global.alert = function (m) { alerts.push(String(m)); };
global.$ = { writeln: function () {} };

var ZSM = {};
function src(rel) { return fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8"); }
eval(src("locale.js"));          // app.locale from the mock: en
eval(src("lib/utils.js"));
eval(src("config.js"));
require("./lib/load_shared.js")(ZSM, ["numbers", "drawing_scale"]);
var MAIN_SRC = src("main.js");

/** A packet of the mock document holding the drawing scale n. */
function xmpWithScale(n) { return ZSM.DrawingScale.write(Mock.XMP_PACKET, n); }

/**
 * Runs main.js once against fresh stubs.
 * @param {Object} o - {xmp: document packet (default: none stored),
 *     settings: overrides of the submitted [Last Settings] (default ZUND 1:1),
 *     cancel: the dialog is cancelled, bounds: what getBounds returns
 *     (default an artwork box; null = empty document), drew: what render
 *     returns (default true)}
 * @returns {Object} {doc, alerts, renders: [settings], scaleSaves: [n],
 *     storageSaves, xmpBefore}
 */
function runMain(o) {
    o = o || {};
    var rec = { renders: [], scaleSaves: [], storageSaves: 0 };
    var doc = Mock.buildDoc({ xmp: o.xmp,
        layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }] });
    global.app.activeDocument = doc;
    global.app.documents = { length: 1 };
    rec.doc = doc;
    rec.xmpBefore = doc.XMPString;

    var last = ZSM.Config.getDefaults();
    var over = o.settings || {};
    for (var k in over) { if (over.hasOwnProperty(k)) last[k] = over[k]; }

    ZSM.UI = {
        show: function (pData) {
            if (o.cancel) return null;
            pData.presets["[Last Settings]"] = last;
            return pData;
        }
    };
    ZSM.Storage = {
        load: function () { return null; },
        save: function () { rec.storageSaves++; return true; }
    };
    ZSM.Draw = {
        reservedMappingName: function () { return null; },
        beginSession: function () {},
        endSession: function () {},
        getBounds: function () { return (o.bounds !== undefined) ? o.bounds : [0, 100, 100, 0]; },
        render: function (geo, s) { rec.renders.push(s); return (o.drew !== undefined) ? o.drew : true; }
    };
    ZSM.Core = { calculateAll: function () { return { warnings: [] }; } };

    var realSave = ZSM.DrawingScale.save;
    ZSM.DrawingScale.save = function (d, n) {
        rec.scaleSaves.push(n);
        return realSave.call(ZSM.DrawingScale, d, n);
    };
    alerts = [];
    try {
        eval(MAIN_SRC);
    } finally {
        ZSM.DrawingScale.save = realSave;
    }
    rec.alerts = alerts.slice();
    return rec;
}


// =====================================================
// TEST 1: the drawing scale goes into the document after a run that drew
// =====================================================
// spec 1.2.0 §5.2, grommet-marks 1.4.0 §13: written after a successful run,
// only when it changed. A refused run promises "the document was not changed"
// — the scale included (review focus 3).
console.log("\n=== TEST 1: drawing scale saved after a run that drew, only when it changed ===");

var r1 = runMain({ settings: { scaleN: 10 } });
assertEq(r1.renders.length, 1, "1:10 in a document without a scale: render ran");
assertEq(r1.renders.length && r1.renders[0].scaleN, 10, "...with scaleN 10");
assertEq(r1.scaleSaves.length, 1, "...DrawingScale.save called once");
assertEq(r1.scaleSaves[0], 10, "...with 10");
assertEq(ZSM.DrawingScale.read(r1.doc.XMPString), 10, "...and the document now holds 1:10");

var r2 = runMain({ xmp: xmpWithScale(2.5), settings: { scaleN: 10 } });
assertEq(r2.scaleSaves.length, 1, "2,5 in the document, a 1:10 run: saved once");
assertEq(ZSM.DrawingScale.read(r2.doc.XMPString), 10, "...the document holds 1:10");

var r3 = runMain({ xmp: xmpWithScale(10), settings: { scaleN: 10 } });
assertEq(r3.renders.length, 1, "1:10 in the document, a 1:10 run: render ran");
assertEq(r3.scaleSaves.length, 0, "...DrawingScale.save not called (nothing changed)");
assertEq(r3.doc.XMPString, r3.xmpBefore, "...the packet is untouched");

var r4 = runMain({ settings: { scaleN: 1 } });
assertEq(r4.scaleSaves.length, 0, "a 1:1 run in a document without a scale: not called (none = 1)");
assertEq(r4.doc.XMPString, r4.xmpBefore, "...the packet is untouched");

var r5 = runMain({ xmp: xmpWithScale(10), settings: { scaleN: 2.5 }, drew: false });
assertEq(r5.renders.length, 1, "render refused the run (false): it was called");
assertEq(r5.scaleSaves.length, 0, "...DrawingScale.save not called");
assertEq(ZSM.DrawingScale.read(r5.doc.XMPString), 10, "...the document keeps its 1:10 (review focus 3)");

var r6 = runMain({ settings: { scaleN: 10 }, bounds: null });
assertEq(r6.renders.length, 0, "an empty document: no render");
assertEq(r6.scaleSaves.length, 0, "...and no scale written");
assertEq(r6.doc.XMPString, r6.xmpBefore, "...the packet is untouched");

var r7 = runMain({ settings: { scaleN: 10 }, cancel: true });
assertEq(r7.renders.length + r7.scaleSaves.length + r7.storageSaves, 0, "Cancel: no render, no scale, no settings");

var r8 = runMain({ xmp: xmpWithScale(10), settings: { scaleN: 1 } });
assertEq(r8.scaleSaves.length, 1, "1:1 in a document that held 1:10: saved");
assertEq(ZSM.DrawingScale.read(r8.doc.XMPString), 1, "...the document now holds 1:1");

for (var ai = 1; ai <= 8; ai++) {
    var rr = [r1, r2, r3, r4, r5, r6, r7, r8][ai - 1];
    if (ai === 6) continue;   // the empty document says so
    assertEq(rr.alerts.length, 0, "case " + ai + ": no alert (got " + JSON.stringify(rr.alerts) + ")");
}


// =====================================================
// TEARDOWN
// =====================================================
Mock.uninstall();


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("MAIN TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
