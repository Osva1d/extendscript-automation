/**
 * BTE test harness — loads the real src/ modules into a fresh BTE namespace
 * and counts assertions. No copy-pasted algorithms: a test runs the file the
 * build ships.
 *
 *   var h = require("./lib/harness"), BTE = h.load(["src/lib/utils.js"]);
 *   h.eq(BTE.Utils.pad(3, 7), "007", "pad");
 *   h.done();
 *
 * load(relPaths, extraShared)
 *   relPaths     tool-relative paths, evaluated in the order given.
 *   extraShared  names of shared/lib modules to bind to BTE, each after the
 *                files above: "numbers", "field_paint", "ui_state", "summary".
 *                A shared module is a factory (buildNumbers(NS) ...), so it is
 *                evaluated and then called, as tools/build.sh does.
 */
var fs = require("fs");
var path = require("path");

var TOOL_ROOT = path.join(__dirname, "..", "..");
var SHARED_LIB = path.join(TOOL_ROOT, "..", "shared", "lib");

var SHARED = {
    numbers:     { file: "numbers.js",     factory: "buildNumbers" },
    field_paint: { file: "field_paint.js", factory: "buildFieldPaint" },
    ui_state:    { file: "ui_state.js",    factory: "buildUIState" },
    summary:     { file: "summary.js",     factory: "buildSummary" }
};

var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function eq(a, b, msg) {
    var ok = (a === b);
    // NaN is the one value that is never === itself.
    if (!ok && typeof a === "number" && typeof b === "number" && a !== a && b !== b) { ok = true; }
    total++;
    if (ok) { pass++; }
    else {
        fail++;
        console.log("  FAIL: " + msg + " | got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b));
    }
}

function load(relPaths, extraShared) {
    var BTE = {};
    var i, code, name, spec;

    for (i = 0; i < relPaths.length; i++) {
        code = fs.readFileSync(path.join(TOOL_ROOT, relPaths[i]), "utf8");
        try {
            eval(code);
        } catch (e) {
            throw new Error("harness: " + relPaths[i] + " failed to load: " + e.message);
        }
    }

    extraShared = extraShared || [];
    for (i = 0; i < extraShared.length; i++) {
        name = extraShared[i];
        spec = SHARED[name];
        if (!spec) { throw new Error("harness: unknown shared module \"" + name + "\""); }
        code = fs.readFileSync(path.join(SHARED_LIB, spec.file), "utf8");
        try {
            eval(code);
            eval(spec.factory + "(BTE);");
        } catch (e) {
            throw new Error("harness: shared " + spec.file + " failed to load: " + e.message);
        }
    }
    return BTE;
}

function done() {
    console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
    process.exit(fail === 0 ? 0 : 1);
}

module.exports = { load: load, assert: assert, eq: eq, done: done };
