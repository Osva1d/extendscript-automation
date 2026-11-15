/**
 * Test loader for BRE sources (ES3 files evaluated into the global scope).
 * boot() re-creates global.BRE and loads locale.js and config.js; further
 * files are loaded with load().
 */
var fs = require("fs");
var path = require("path");

function load(rel) {
    eval.call(global, fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8"));
}

function boot(opts) {
    opts = opts || {};
    global.BRE = {};
    global.app = { locale: opts.locale || "cs_CZ", documents: { length: 0 } };
    load("src/locale.js");
    load("src/config.js");
}

module.exports = { load: load, boot: boot };
