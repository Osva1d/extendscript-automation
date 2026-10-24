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
 *   - The ruler origin the run sets to [0, 0] comes back when the run was
 *     refused before changing anything (getBounds null, render false) and stays
 *     [0, 0] after a run that drew or crashed (spec 9.4, R4).
 *   - The messages: no document, an unexpected error (the canon template with
 *     the line), the empty document and a reserved layer (one prefix, "The
 *     document was not changed."), settings that could not be saved.
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
 *     returns (default true; false = refused, null = crashed),
 *     origin: the document's ruler origin before the run (default [0, 0]),
 *     noDoc: no document is open, reserved: the name reservedMappingName
 *     answers (default none), throwAt: "getBounds" | "render" — that call
 *     throws o.thrown, saveFails: Storage.save answers false,
 *     originUnreadable: reading doc.rulerOrigin throws}
 * @returns {Object} {doc, alerts, renders: [settings], scaleSaves: [n],
 *     storageSaves, xmpBefore, originAtBounds, sessionsEnded}
 */
function runMain(o) {
    o = o || {};
    var rec = { renders: [], scaleSaves: [], storageSaves: 0, sessionsEnded: 0, originAtBounds: null };
    var doc = Mock.buildDoc({ xmp: o.xmp,
        layers: [{ name: "Art", items: [{ type: "path", bounds: [0, 100, 100, 0] }] }] });
    if (o.origin) doc.rulerOrigin = o.origin.slice();
    if (o.originUnreadable) {
        Object.defineProperty(doc, "rulerOrigin", { configurable: true,
            get: function () { throw new Error("origin unreadable"); }, set: function () {} });
    }
    global.app.activeDocument = doc;
    global.app.documents = { length: o.noDoc ? 0 : 1 };
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
        save: function () { rec.storageSaves++; return o.saveFails ? false : true; }
    };
    ZSM.Draw = {
        reservedMappingName: function () { return o.reserved || null; },
        beginSession: function () {},
        endSession: function () { rec.sessionsEnded++; },
        getBounds: function () {
            try { rec.originAtBounds = doc.rulerOrigin.slice(); } catch (eRead) { rec.originAtBounds = null; }
            if (o.throwAt === "getBounds") throw o.thrown;
            return (o.bounds !== undefined) ? o.bounds : [0, 100, 100, 0];
        },
        render: function (geo, s) {
            rec.renders.push(s);
            if (o.throwAt === "render") throw o.thrown;
            return (o.drew !== undefined) ? o.drew : true;
        }
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
    try { rec.origin = doc.rulerOrigin; } catch (eRead2) { rec.origin = null; }
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
// TEST 2: the ruler origin comes back when the run is refused (spec 9.4, R4)
// =====================================================
// The run sets rulerOrigin = [0, 0] before measuring (all the geometry reads
// document coordinates from there), so "Dokument nebyl změněn." was not quite
// true for a refused run: the operator's custom origin was gone. A refusal
// (getBounds null, render false) gives it back; a run that drew keeps [0, 0]
// (the marks sit by it); after a crash (render null) the document is partly
// changed and the origin stays too.
console.log("\n=== TEST 2: ruler origin restored after a refusal only ===");
var ORIGIN = [12, 34];
function sameOrigin(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; }

var o1 = runMain({ origin: ORIGIN });
assert(sameOrigin(o1.originAtBounds, [0, 0]), "a run: the origin is [0, 0] while the bounds are measured");
assert(sameOrigin(o1.origin, [0, 0]), "a run that drew: the origin stays [0, 0] (the marks are placed by it)");

var o2 = runMain({ origin: ORIGIN, bounds: null });
assert(sameOrigin(o2.originAtBounds, [0, 0]), "an empty document: the origin was [0, 0] while measuring");
assert(sameOrigin(o2.origin, ORIGIN), "...and is the original again after the refusal (got " + JSON.stringify(o2.origin) + ")");
assertEq(o2.renders.length, 0, "...no render");

var o3 = runMain({ origin: ORIGIN, drew: false });
assert(sameOrigin(o3.origin, ORIGIN), "render refused (false): the original origin is back (got " + JSON.stringify(o3.origin) + ")");

var o4 = runMain({ origin: ORIGIN, drew: null, settings: { scaleN: 10 } });
assert(sameOrigin(o4.origin, [0, 0]), "render crashed (null): the origin is NOT restored (the document may be changed)");
assertEq(o4.scaleSaves.length, 0, "...and the drawing scale is not written");

var o5 = runMain({ origin: ORIGIN, reserved: "Regmarks" });
assertEq(o5.renders.length, 0, "a reserved layer: no render");
assert(sameOrigin(o5.origin, ORIGIN), "...and the origin was never touched");

// An origin that cannot be read: the run goes on, nothing is restored, no alert.
var noReadLogs = [], origLogMain = ZSM.Utils.log;
ZSM.Utils.log = function (m) { noReadLogs.push(String(m)); };
var noRead;
try { noRead = runMain({ bounds: null, originUnreadable: true }); } finally { ZSM.Utils.log = origLogMain; }
noRead.logs = noReadLogs;
assertEq(noRead.alerts.length, 1, "an unreadable origin: only the empty-document message is shown (no extra alert)");
assert(noRead.logs.join("\n").indexOf("origin unreadable") >= 0, "...and the failure is logged, not swallowed");


// =====================================================
// TEST 3: the messages (spec 9.2-9.4, canon 12.2)
// =====================================================
console.log("\n=== TEST 3: messages ===");
var m1 = runMain({ noDoc: true });
assertEq(m1.alerts.length, 1, "no document: one alert");
assertEq(m1.alerts[0], ZSM.L.ERR_NO_DOC, "...the canon's text (as grommet-marks), nothing else");
assertEq(m1.renders.length, 0, "...no run");

var boom = new Error("boom"); boom.line = 42;
var m2 = runMain({ throwAt: "getBounds", thrown: boom });
assertEq(m2.alerts.length, 1, "an unexpected error: one alert");
assertEq(m2.alerts[0], ZSM.L.format(ZSM.L.ERR_CRITICAL, "boom", "42"), "...ERR_CRITICAL with the message and the line");
assertEq(m2.sessionsEnded, 1, "...and the layer locks are still restored");
var m3 = runMain({ throwAt: "render", thrown: new Error("boom") });
assertEq(m3.alerts[0], ZSM.L.format(ZSM.L.ERR_CRITICAL, "boom", "?"), "an error without a line: \"?\"");
assert(m3.alerts[0].indexOf("%s") === -1 && m3.alerts[0].indexOf("undefined") === -1, "...no stray placeholder");

var m4 = runMain({ bounds: null });
assertEq(m4.alerts.length, 1, "an empty document: one alert");
assertEq(m4.alerts[0], ZSM.L.ERROR_PREFIX + ZSM.L.ERR_NO_SEL, "...one prefix, then ERR_NO_SEL");
assert(/The document was not changed\.$/.test(m4.alerts[0]), "...ending with the document's state");

var m5 = runMain({ reserved: "Regmarks" });
assertEq(m5.alerts.length, 1, "a reserved layer: one alert");
assertEq(m5.alerts[0], ZSM.L.ERROR_PREFIX + ZSM.L.format(ZSM.L.ERR_RESERVED_LAYER, "Regmarks"), "...one prefix, then ERR_RESERVED_LAYER");

var m6 = runMain({ saveFails: true });
assertEq(m6.alerts.length, 1, "settings that cannot be saved after Generate: one alert");
assertEq(m6.alerts[0], ZSM.L.ERR_WRITE_SETTINGS_RUN, "...ERR_WRITE_SETTINGS_RUN (the run goes on)");
assertEq(m6.renders.length, 1, "...and the run does draw");


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
