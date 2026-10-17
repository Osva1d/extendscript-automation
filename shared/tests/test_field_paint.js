#!/usr/bin/env node
/**
 * shared/lib/field_paint.js — status colours on ScriptUI text.
 */
var fs = require("fs");
var path = require("path");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "field_paint.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function sameRGB(pen, rgb) {
    return pen && pen.color && pen.color.length === 4 &&
        pen.color[0] === rgb[0] && pen.color[1] === rgb[1] && pen.color[2] === rgb[2] && pen.color[3] === 1;
}

// A ScriptUI control's graphics object, as far as the module uses it.
function mockControl(defaultPen) {
    var g = {
        PenType: { SOLID_COLOR: "solid" },
        foregroundColor: defaultPen,
        newPen: function (type, color, width) { return { type: type, color: color, width: width }; }
    };
    return { graphics: g };
}

var logged = [];
var NS = { Utils: { log: function (m) { logged.push(m); } } };
buildFieldPaint(NS);
var P = NS.FieldPaint;

console.log("\n=== the canon's colours ===");
assert(sameRGB({ color: P.COLORS.ERR.concat([1]) }, [0.90, 0.20, 0.20]), "error red 0.90 0.20 0.20");
assert(sameRGB({ color: P.COLORS.WARN.concat([1]) }, [0.96, 0.60, 0.38]), "warning amber 0.96 0.60 0.38");
assert(sameRGB({ color: P.COLORS.OK.concat([1]) }, [0.36, 0.60, 0.34]), "OK green 0.36 0.60 0.34");

console.log("\n=== field: red while invalid, its own pen back when valid ===");
var own = { own: true };
var et = mockControl(own);
P.field(et, false);
assert(sameRGB(et.graphics.foregroundColor, P.COLORS.ERR), "invalid paints the text red");
assert(et.sharedDefaultPen === own, "the field's own pen is remembered before painting");
P.field(et, true);
assert(et.graphics.foregroundColor === own, "valid gives the field its own pen back, not black");
P.field(et, false);
P.field(et, true);
assert(et.graphics.foregroundColor === own, "and again after a second round");

console.log("\n=== field: a pen that cannot be read falls back to light grey ===");
var et2 = mockControl(undefined);
P.field(et2, false);
P.field(et2, true);
assert(sameRGB(et2.graphics.foregroundColor, P.FALLBACK), "light grey, legible on the light and the dark UI");

console.log("\n=== field and text never throw ===");
var threw = false;
try {
    P.field(null, false);
    P.field({}, false);
    P.field({ graphics: {} }, false);
    var hostile = mockControl({});
    hostile.graphics.newPen = function () { throw new Error("pen refused"); };
    P.field(hostile, false);
    P.text(hostile, "ERR");
    P.text(null, "OK");
    P.text(mockControl({}), "NOPE");
} catch (e) { threw = true; }
assert(!threw, "missing graphics, a refused pen and an unknown kind are all quiet");
assert(logged.length === 2, "a refused pen is logged, twice: field and text");

console.log("\n=== text: a status line in the colour of its state ===");
var st = mockControl({});
P.text(st, "OK");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.OK), "OK paints green");
P.text(st, "WARN");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.WARN), "WARN paints amber");
P.text(st, "ERR");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.ERR), "ERR paints red");

var NS2 = {};
buildFieldPaint(NS2);
var hostile2 = mockControl({});
hostile2.graphics.newPen = function () { throw new Error("pen refused"); };
threw = false;
try { NS2.FieldPaint.field(hostile2, false); } catch (e2) { threw = true; }
assert(!threw, "without NS.Utils a refused pen is still quiet");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
