/**
 * Loads modules from shared/lib/ into a test's namespace the way
 * tools/build.sh does: the file is evaluated, then its factory is called
 * with the namespace — numbers -> buildNumbers(GM), and so on.
 *
 * Usage (in a suite, after the modules that fill GM.L / GM.Utils):
 *   var loadShared = require("./lib/load_shared.js");
 *   loadShared(GM, ["numbers"]);
 *
 * A module only reads what it needs from the namespace at call time
 * (GM.L.DEC_SEP, GM.Utils.log), so the order among the src files does not
 * matter — only that the call happens before the first use.
 */
var fs = require("fs");
var path = require("path");

var FACTORIES = {
    numbers:       "buildNumbers",
    field_paint:   "buildFieldPaint",
    registration:  "buildRegistration",
    drawing_scale: "buildDrawingScale"
};

/**
 * @param {Object} ns - The suite's namespace object (GM).
 * @param {string[]} names - Module names, e.g. ["numbers", "field_paint"].
 */
function loadShared(ns, names) {
    for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var factory = FACTORIES[name];
        if (!factory) { throw new Error("loadShared: unknown shared module '" + name + "'"); }
        var file = path.join(__dirname, "..", "..", "..", "shared", "lib", name + ".js");
        // A function scope of its own: the factory is a declaration in the
        // module, and must not leak into the suite's globals.
        var build = new Function(fs.readFileSync(file, "utf8") + "\nreturn " + factory + ";")();
        build(ns);
    }
}

module.exports = loadShared;
module.exports.loadShared = loadShared;
