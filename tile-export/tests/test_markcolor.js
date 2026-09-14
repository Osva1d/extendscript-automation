#!/usr/bin/env node
/**
 * TE.Draw mark-colour helpers — listing swatches, reading a spot definition.
 * Pure logic over a mocked document; the actual colour objects are DOM and
 * are verified by probe.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "draw.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

function spot(name, c, m, y, k) {
    return {
        name: name,
        color: { typename: "CMYKColor", cyan: c, magenta: m, yellow: y, black: k }
    };
}
function mockDoc(spots, swatchNames) {
    return {
        spots: spots,
        swatches: (function () {
            var arr = [];
            for (var i = 0; i < swatchNames.length; i++) { arr.push({ name: swatchNames[i] }); }
            arr.getByName = function (n) {
                for (var j = 0; j < arr.length; j++) { if (arr[j].name === n) { return arr[j]; } }
                throw new Error("no swatch " + n);
            };
            return arr;
        })()
    };
}

console.log("\n=== getRegistrationName ===");
// The registration swatch is always index 1 and its name is LOCALIZED.
var czDoc = mockDoc([], ["Nic", "[Registrační]", "cut"]);
assert(TE.Draw.getRegistrationName(czDoc) === "[Registrační]",
    "bere swatches[1], nespoléhá na anglický název");
var enDoc = mockDoc([], ["None", "[Registration]"]);
assert(TE.Draw.getRegistrationName(enDoc) === "[Registration]", "a v angličtině taky");
assert(TE.Draw.getRegistrationName({}) === "[Registration]",
    "dokument bez swatchů nespadne, vrátí anglický default");

console.log("\n=== listMarkColors ===");
var d = mockDoc(
    [spot("[Registrační]", 0, 0, 0, 100), spot("cut", 0, 100, 100, 0), spot("Spot 1", 0, 0, 0, 0)],
    ["Nic", "[Registrační]", "cut", "Spot 1"]);
var names = TE.Draw.listMarkColors(d);
assert(names[0] === "[Registrační]", "registrační je vždy první");
assert(TE.Utils.indexOf(names, "Spot 1") !== -1, "uživatelské přímé barvy jsou v seznamu");
assert(TE.Utils.indexOf(names, "cut") !== -1, "včetně té, co slouží jako kontura");
// System spots are bracketed; Registration is already in, the rest is noise.
var d2 = mockDoc([spot("[Registrační]", 0, 0, 0, 100), spot("[Neco]", 0, 0, 0, 0)],
                 ["Nic", "[Registrační]"]);
assert(TE.Draw.listMarkColors(d2).length === 1, "systémové spoty v závorkách se přeskočí");

console.log("\n=== readSpotDef ===");
var def = TE.Draw.readSpotDef(d, "Spot 1");
assert(def !== null, "definice se přečte");
assert(def.name === "Spot 1", "nese jméno");
assert(def.cyan === 0 && def.black === 0, "nese CMYK složky");

assert(TE.Draw.readSpotDef(d, "[Registrační]") === null,
    "registrační se nepřenáší — v každém dokumentu už je");
assert(TE.Draw.readSpotDef(d, "Neexistuje") === null, "neznámá barva vrátí null");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
