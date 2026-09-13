#!/usr/bin/env node
/**
 * TE.Cut — finding the contour by spot colour, and the covering frame geometry.
 * The frame is pure maths; the Pathfinder part is verified by probe, not here.
 */
var fs = require("fs");
var path = require("path");

var TE = {};
global.app = { documents: { length: 1 }, activeDocument: { scaleFactor: 1 } };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "cut.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function assertClose(a, b, tol, msg) {
    total++;
    if (Math.abs(a - b) <= tol) { pass++; }
    else { fail++; console.log("  FAIL: " + msg + " | got=" + a + " expected=" + b); }
}

function spotItem(name, stroked) {
    var col = { typename: "SpotColor", spot: { name: name } };
    return {
        typename: "PathItem",
        stroked: !!stroked,
        filled: !stroked,
        strokeColor: stroked ? col : { typename: "NoColor" },
        fillColor: stroked ? { typename: "NoColor" } : col
    };
}
function plainItem() {
    return {
        typename: "PathItem", stroked: true, filled: false,
        strokeColor: { typename: "CMYKColor" }, fillColor: { typename: "NoColor" }
    };
}

console.log("\n=== findContour ===");
var doc = {
    pathItems: [spotItem("cut", true), plainItem(), spotItem("cut", false),
                spotItem("Jina", true)],
    compoundPathItems: [],
    spots: [{ name: "cut" }, { name: "Jina" }]
};
var found = TE.Cut.findContour(doc, "cut");
assert(found.length === 2, "najde obarvené tahem i výplní, ostatní ne");
assert(TE.Cut.findContour(doc, "Neexistuje").length === 0, "cizí barva nenajde nic");

console.log("\n=== findContour: compound path ===");
// A compound path carries its colour on the first sub-path — that is how
// Illustrator reports it, measured on a real ring.
var docCP = {
    pathItems: [],
    compoundPathItems: [{ typename: "CompoundPathItem",
                          pathItems: [spotItem("cut", true), spotItem("cut", true)] }],
    spots: [{ name: "cut" }]
};
assert(TE.Cut.findContour(docCP, "cut").length === 1,
    "compound path se počítá jednou, ne za každou subcestu");

console.log("\n=== hasSpot ===");
assert(TE.Cut.hasSpot(doc, "cut") === true, "existující spot");
assert(TE.Cut.hasSpot(doc, "Neexistuje") === false, "neexistující spot");
assert(TE.Cut.hasSpot({ }, "cut") === false, "dokument bez spots nespadne");

console.log("\n=== frameRects ===");
var fr = TE.Cut.frameRects([0, 0, 400, -800], 5000);
assertClose(fr.hole[0], 0, 0.001, "díra kopíruje plát: left");
assertClose(fr.hole[1], 0, 0.001, "díra: top");
assertClose(fr.hole[2], 400, 0.001, "díra: right");
assertClose(fr.hole[3], -800, 0.001, "díra: bottom");

assertClose(fr.outer[0], -5000, 0.001, "vnější obdélník přesahuje o margin vlevo");
assertClose(fr.outer[1], 5000, 0.001, "přesahuje nahoru");
assertClose(fr.outer[2], 5400, 0.001, "přesahuje vpravo");
assertClose(fr.outer[3], -5800, 0.001, "přesahuje dolů");

var fr2 = TE.Cut.frameRects([100, -50, 500, -850], 1);
assertClose(fr2.outer[0], 99, 0.001, "margin se aplikuje i na posunutý plát");
assertClose(fr2.hole[0], 100, 0.001, "díra sedí na plát bez ohledu na margin");

// The outer rectangle must strictly contain the hole, or the frame is not a frame.
assert(fr.outer[0] < fr.hole[0] && fr.outer[2] > fr.hole[2] &&
       fr.outer[1] > fr.hole[1] && fr.outer[3] < fr.hole[3],
       "vnější obdélník díru ostře obklopuje ze všech stran");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
