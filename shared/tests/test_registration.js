#!/usr/bin/env node
/**
 * shared/lib/registration.js — the registration swatch, found by type.
 */
var fs = require("fs");
var path = require("path");

// Illustrator globals the module reads.
global.ColorModel = { REGISTRATION: "REGISTRATION", SPOT: "SPOT", PROCESS: "PROCESS" };
global.CMYKColor = function () {
    this.typename = "CMYKColor";
    this.cyan = 0; this.magenta = 0; this.yellow = 0; this.black = 0;
};

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "registration.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

function assertEq(a, b, msg) {
    total++;
    if (a === b) { pass++; } else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}

function spotSwatch(name, colorType) {
    return { name: name, color: { typename: "SpotColor", spot: { colorType: colorType }, tag: name } };
}
function plainSwatch(name, typename) {
    return { name: name, color: { typename: typename, tag: name } };
}

var logged = [];
var NS = { Utils: { log: function (m) { logged.push(m); } } };
buildRegistration(NS);
var R = NS.Registration;

console.log("\n=== found by type, whatever its name ===");
var czech = { swatches: [
    plainSwatch("[Žádná]", "NoColor"),
    spotSwatch("[Registrační]", ColorModel.REGISTRATION),
    plainSwatch("Bílá", "CMYKColor")
]};
assert(R.name(czech) === "[Registrační]", "the localized name of a Czech install");
assert(R.color(czech).tag === "[Registrační]", "and its colour");

console.log("\n=== and wherever it sits ===");
// Measured trap: where index 1 holds White, a tool trusting the position
// draws marks the cutter's camera cannot see.
var moved = { swatches: [
    plainSwatch("[None]", "NoColor"),
    plainSwatch("White", "CMYKColor"),
    spotSwatch("CutContour", ColorModel.SPOT),
    spotSwatch("[Registration]", ColorModel.REGISTRATION)
]};
assert(R.name(moved) === "[Registration]", "found at index 3, not taken from index 1");
assert(R.color(moved).tag === "[Registration]", "its colour, not White's");
assert(R.swatch(moved) === moved.swatches[3], "swatch() returns the swatch itself");

console.log("\n=== a spot colour is not registration ===");
var spotsOnly = { swatches: [plainSwatch("[None]", "NoColor"), spotSwatch("Cut", ColorModel.SPOT)] };
assert(R.swatch(spotsOnly) === null, "no registration swatch: none");
assert(R.name(spotsOnly) === "[Registration]", "the English name as the fallback name");
var k = R.color(spotsOnly);
assert(k.typename === "CMYKColor" && k.cyan === 0 && k.magenta === 0 && k.yellow === 0 && k.black === 100,
    "100 % black as the fallback colour, never a neighbouring swatch");

console.log("\n=== an unreadable swatch list is quiet ===");
var broken = {};
Object.defineProperty(broken, "swatches", { get: function () { throw new Error("no swatches"); } });
var threw = false;
try {
    assert(R.name(broken) === "[Registration]", "unreadable list: the fallback name");
    assert(R.color(broken).black === 100, "unreadable list: 100 % black");
} catch (e) { threw = true; }
assert(!threw, "no exception escapes");
assert(logged.length >= 1, "the failure is logged");
var oddColor = { swatches: [{ name: "x", color: null }, { name: "y", color: { typename: "SpotColor" } }] };
assert(R.swatch(oddColor) === null, "a swatch with no colour or no spot is skipped");

console.log("\n=== an unreadable swatch does not end the search ===");
// Measured in Node on zund-summa-marks and on this module: one try around the
// whole loop meant a swatch whose colour cannot be read, placed before the
// registration swatch, ended the search silently — the marks came out 100 % K.
function unreadableSwatch(name) {
    var sw = { name: name };
    Object.defineProperty(sw, "color", { get: function () { throw new Error("colour unreadable"); } });
    return sw;
}
var withBroken = { swatches: [
    unreadableSwatch("Broken"),
    spotSwatch("[Registrační]", ColorModel.REGISTRATION),
    plainSwatch("Bílá", "CMYKColor")
]};
logged.length = 0;
assert(R.swatch(withBroken) === withBroken.swatches[1], "the registration swatch behind an unreadable one is found");
assert(R.name(withBroken) === "[Registrační]", "its localized name");
assert(R.color(withBroken).tag === "[Registrační]", "its colour, not 100 % black");
assertEq(logged.length, 3, "one log line per lookup that met the unreadable swatch");
assert(logged[0].indexOf("colour unreadable") >= 0, "the log line carries the reason");

var twoBroken = { swatches: [
    unreadableSwatch("Broken 1"),
    unreadableSwatch("Broken 2"),
    spotSwatch("[Registration]", ColorModel.REGISTRATION)
]};
logged.length = 0;
assert(R.swatch(twoBroken) === twoBroken.swatches[2], "two unreadable swatches in front: still found");
assertEq(logged.length, 2, "one log line for each unreadable swatch");

var onlyBroken = { swatches: [unreadableSwatch("Broken"), plainSwatch("Bílá", "CMYKColor")] };
logged.length = 0;
assert(R.swatch(onlyBroken) === null, "no readable registration swatch: none");
assert(R.color(onlyBroken).black === 100, "then 100 % black, the fallback");
assertEq(logged.length, 2, "logged, never silent");

var brokenBehind = { swatches: [
    spotSwatch("[Registration]", ColorModel.REGISTRATION),
    unreadableSwatch("Broken")
]};
logged.length = 0;
assert(R.swatch(brokenBehind) === brokenBehind.swatches[0], "an unreadable swatch behind registration is never reached");
assertEq(logged.length, 0, "and costs no log line");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
