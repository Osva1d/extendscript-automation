#!/usr/bin/env node
/**
 * TE.Utils test suite — unit conversion and scale composition.
 * Loads the real src/lib/utils.js. No copy-pasted algorithms.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
TE.L = { ERR_MUST_BE_NUMBER: "%s must be a number", format: function (t) { return t; } };
// Illustrator DOM stub — getSF() reads app.activeDocument.scaleFactor.
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

console.log("\n=== Unit conversion ===");
assertClose(TE.Utils.mm2pt(1), 2.83464567, 0.0001, "1 mm -> pt");
assertClose(TE.Utils.mm2pt(25.4), 72, 0.01, "1 inch = 72 pt");
assertClose(TE.Utils.pt2mm(TE.Utils.mm2pt(37)), 37, 0.0001, "roundtrip");

console.log("\n=== Scale composition (regression: ZSM v26.4.0) ===");
global.app.activeDocument.scaleFactor = 1;
assertClose(TE.Utils.getEffectiveSF({ scaleN: 10 }), 10, 0.0001, "manual 1:10");
assertClose(TE.Utils.toDoc(1000, { scaleN: 10 }), TE.Utils.mm2pt(100), 0.001,
    "1000 real mm in a 1:10 doc is 100 doc mm");

global.app.activeDocument.scaleFactor = 10;
assertClose(TE.Utils.getEffectiveSF({ scaleN: 1 }), 10, 0.0001, "Large Canvas alone");
assertClose(TE.Utils.getEffectiveSF({ scaleN: 10 }), 100, 0.0001, "Large Canvas AND manual 1:10 compose");
global.app.activeDocument.scaleFactor = 1;

assertClose(TE.Utils.getEffectiveSF({}), 1, 0.0001, "missing scaleN -> 1");
assertClose(TE.Utils.getEffectiveSF({ scaleN: 0 }), 1, 0.0001, "zero scaleN -> 1");
assertClose(TE.Utils.getEffectiveSF({ scaleN: "abc" }), 1, 0.0001, "NaN scaleN -> 1");

console.log("\n=== toDoc / fromDoc roundtrip ===");
assertClose(TE.Utils.fromDoc(TE.Utils.toDoc(450, { scaleN: 10 }), { scaleN: 10 }), 450, 0.0001,
    "mm -> doc -> mm survives the scale");

console.log("\n=== ES3 indexOf ===");
assert(TE.Utils.indexOf(["a", "b", "c"], "b") === 1, "finds element");
assert(TE.Utils.indexOf(["a"], "z") === -1, "missing element -> -1");
assert(TE.Utils.indexOf([], "z") === -1, "empty array -> -1");

console.log("\n=== toNumber ===");
// Number() with the Czech decimal comma, and nothing else changed: callers
// rely on "" being 0 and garbage being NaN to pick their own fallback.
assert(TE.Utils.toNumber("0,3") === 0.3, "Czech decimal comma");
assert(TE.Utils.toNumber("0.3") === 0.3, "decimal point unchanged");
assert(TE.Utils.toNumber(" 12,5 ") === 12.5, "whitespace trimmed around a comma");
assert(TE.Utils.toNumber(20) === 20, "a number passes through");
assert(TE.Utils.toNumber("") === 0, "empty is 0, exactly like Number()");
assert(TE.Utils.toNumber("0") === 0, "zero is zero");
assert(isNaN(TE.Utils.toNumber("abc")), "garbage is NaN");
assert(isNaN(TE.Utils.toNumber("1,5,3")), "two separators are NaN, not 1.5");

console.log("\n=== validateNumber ===");
assert(TE.Utils.validateNumber("12,5", 0, 100, "x") === 12.5, "Czech decimal comma");
assert(TE.Utils.validateNumber("  7 ", 0, 100, "x") === 7, "whitespace trimmed");
assert(TE.Utils.validateNumber("", 0, 100, "x") === null, "empty string is invalid");
assert(TE.Utils.validateNumber("abc", 0, 100, "x") === null, "non-numeric is invalid");
assert(TE.Utils.validateNumber("101", 0, 100, "x") === null, "above max is invalid");
assert(TE.Utils.validateNumber("0", 0, 100, "x") === 0, "zero at the boundary is valid");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
