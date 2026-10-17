#!/usr/bin/env node
/**
 * shared/lib/numbers.js — reading number fields and writing them back.
 */
var fs = require("fs");
var path = require("path");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "numbers.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function isNaNValue(v) { return typeof v === "number" && v !== v; }

var NS = { L: { DEC_SEP: "," } };
buildNumbers(NS);
var N = NS.Numbers;

console.log("\n=== parse: what the operator types ===");
assert(N.parse("20") === 20, "a whole number");
assert(N.parse("2,5") === 2.5, "a decimal comma");
assert(N.parse("2.5") === 2.5, "a decimal dot");
assert(N.parse("  2,5 ") === 2.5, "spaces around are ignored");
assert(N.parse("+5") === 5, "a leading plus");
assert(N.parse("-3,5") === -3.5, "a negative number; the field's check decides if it may be");
assert(N.parse("0") === 0, "zero");
assert(N.parse(12) === 12, "a stored number passes through");

console.log("\n=== parse: anything else is invalid, never a different number ===");
var bad = ["2O", "1O5", "1 000", "20 mm", "2,5,0", "1e3", "0x10", ".5", ",5", "5.", "5,",
           "", "   ", "Infinity", "NaN", "abc", "--1"];
var i;
for (i = 0; i < bad.length; i++) {
    assert(isNaNValue(N.parse(bad[i])), JSON.stringify(bad[i]) + " is NaN");
}
assert(isNaNValue(N.parse(null)), "null is NaN");
assert(isNaNValue(N.parse(undefined)), "undefined is NaN");

console.log("\n=== format: the locale's separator, no rounding ===");
assert(N.format(2.5) === "2,5", "NS.L.DEC_SEP is the default separator");
assert(N.format(2.5, ".") === "2.5", "an explicit separator wins");
assert(N.format(0.25) === "0,25", "no rounding: a 0,25 pt line stays 0,25");
assert(N.format(20) === "20", "a whole number has no separator");
assert(N.format(-3.5) === "-3,5", "a negative number");
assert(N.format("20") === "20", "a number stored as text by a hand-edited preset");
assert(N.format(NaN) === "", "NaN gives an empty field, never \"NaN\"");
assert(N.format(Infinity) === "", "Infinity gives an empty field");
assert(N.format(null) === "" && N.format(undefined) === "" && N.format("") === "", "nothing gives an empty field");
assert(N.format("2,5") === "", "text that is not a stored number gives an empty field");

var NS2 = {};
buildNumbers(NS2);
assert(NS2.Numbers.format(2.5) === "2.5", "without NS.L the separator is a dot");

console.log("\n=== round trip: what is written back reads back the same ===");
var values = [0, 1, 2.5, 0.25, 12.75, 1000, 0.3, 99.9];
for (i = 0; i < values.length; i++) {
    assert(N.parse(N.format(values[i])) === values[i], values[i] + " survives format then parse");
    assert(N.parse(N.format(values[i], ".")) === values[i], values[i] + " survives it with a dot too");
}

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
