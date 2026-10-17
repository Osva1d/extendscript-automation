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

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
