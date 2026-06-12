#!/usr/bin/env node
/**
 * GM.Storage Migration Test Suite
 * Tests Storage.load() against various legacy data shapes.
 *
 * Coverage:
 *   - Migration 1: flat {__default__: ...} -> wrapper {activePreset, presets}
 *   - Migration 2: __default__ -> [Default] key rename
 *   - Migration 3: v2 per-edge offsets -> v3 global
 *   - Migration 4: v3.0 localized strings -> v3.1 internal keys
 *   - Migration 5: localized [Výchozí] -> [Default]
 *   - Forward-fill new default keys
 *   - Empty/corrupt/missing file
 *
 * Usage: node tests/test_storage_migrations.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var GM = {};

// Mock virtual file system
var mockFS = {};
var SETTINGS_PATH = "/mock/userData/GrommetMarks/GrommetMarksSettings.json";

function MockFolder(p) { this.fsName = p; }
MockFolder.userData = "/mock/userData";
Object.defineProperty(MockFolder.prototype, "exists", {
    get: function () { return true; }
});
MockFolder.prototype.create = function () { return true; };
global.Folder = MockFolder;

function MockFile(p) {
    this.fsName = p;
    this._path = p;
    this.encoding = "UTF-8";
    this._mode = null;
    this._buffer = "";
}
Object.defineProperty(MockFile.prototype, "exists", {
    get: function () { return mockFS.hasOwnProperty(this._path); }
});
MockFile.prototype.open = function (mode) {
    this._mode = mode;
    if (mode === "w") this._buffer = "";
    return true;
};
MockFile.prototype.read = function () {
    return mockFS[this._path] || "";
};
MockFile.prototype.write = function (s) { this._buffer += s; };
MockFile.prototype.close = function () {
    if (this._mode === "w") mockFS[this._path] = this._buffer;
};
global.File = MockFile;

global.alert = function () {};
global.$ = { writeln: function () {} };

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));

// Stub locale (needed by storage error paths)
GM.L = { ERR_WRITE_SETTINGS: "Cannot write settings file." };

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));

// JSON polyfill (in case Node version is ancient, unlikely but safe)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "polyfills", "json2.js"), "utf8"));

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "storage.js"), "utf8"));

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function setup(content) {
    mockFS = {};
    if (content !== undefined) {
        mockFS[SETTINGS_PATH] = typeof content === "string" ? content : JSON.stringify(content);
    }
}

// ===== TESTS =====
console.log("--- Migration: no file -> null ---");
(function () {
    setup();
    var result = GM.Storage.load();
    assert(result === null, "no file returns null");
})();

console.log("--- Migration: empty file -> null ---");
(function () {
    setup("");
    var result = GM.Storage.load();
    assert(result === null, "empty file returns null");
})();

console.log("--- Migration: corrupt JSON -> null ---");
(function () {
    setup("{broken json!!!}");
    var result = GM.Storage.load();
    assert(result === null, "corrupt JSON returns null");
})();

console.log("--- Migration 1: flat -> wrapper ---");
(function () {
    var flat = {};
    flat["__default__"] = GM.Config.getDefaults();
    flat["MyPreset"] = GM.Config.getDefaults();
    flat["MyPreset"].markSize = 5;
    setup(flat);

    var result = GM.Storage.load();
    assert(result !== null, "flat: load succeeds");
    assert(result.presets !== undefined, "flat: has presets key");
    assert(result.activePreset === "[Default]", "flat: activePreset is [Default]");
    assert(result.presets["[Default]"] !== undefined, "flat: [Default] preset exists");
    assert(result.presets["MyPreset"] !== undefined, "flat: user preset preserved");
    assert(result.presets["MyPreset"].markSize === 5, "flat: user preset values preserved");
})();

console.log("--- Migration 2: __default__ -> [Default] ---");
(function () {
    var data = { activePreset: "__default__", presets: {} };
    data.presets["__default__"] = GM.Config.getDefaults();
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"] !== undefined, "sentinel: [Default] exists");
    assert(result.presets["__default__"] === undefined, "sentinel: __default__ removed");
    assert(result.activePreset === "[Default]", "sentinel: activePreset updated");
})();

console.log("--- Migration 3: localized [Výchozí] -> [Default] ---");
(function () {
    var data = { activePreset: "[Výchozí]", presets: {} };
    data.presets["[Výchozí]"] = GM.Config.getDefaults();
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"] !== undefined, "localized: [Default] exists");
    assert(result.presets["[Výchozí]"] === undefined, "localized: old key removed");
    assert(result.activePreset === "[Default]", "localized: activePreset updated");
})();

console.log("--- Migration: v2 per-edge offsets -> v3 global ---");
(function () {
    var preset = GM.Config.getDefaults();
    delete preset.offsetX;
    delete preset.offsetY;
    preset.top.x = 12;
    preset.top.y = 15;
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].offsetX === 12, "v2: offsetX from top.x");
    assert(result.presets["[Default]"].offsetY === 15, "v2: offsetY from top.y");
    assert(result.presets["[Default]"].top.x === undefined, "v2: top.x removed");
    assert(result.presets["[Default]"].top.y === undefined, "v2: top.y removed");
})();

console.log("--- Migration: v3.0 localized units -> v3.1 internal keys ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.units = "Milimetry";
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].units === "mm", "units: Milimetry -> mm");
})();

console.log("--- Migration: v3.0 localized sentinels -> __create__ ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.fillSwatchName = "[Create 'Grommet Marks']";
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["[Default]"].fillSwatchName === "__create__",
        "sentinel: localized -> __create__");
})();

console.log("--- Forward-fill: new keys added to old presets ---");
(function () {
    var preset = { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 };
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    var p = result.presets["[Default]"];
    assert(p.isRound === true, "forward-fill: isRound added from defaults");
    assert(p.fillEnabled === true, "forward-fill: fillEnabled added");
    assert(p.top !== undefined, "forward-fill: top edge added");
    assert(p.markSize === 2, "forward-fill: existing value preserved");
})();

console.log("--- v5 forward-fill ---");
(function () {
    var preset = { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 };
    var data = { activePreset: "[Default]", presets: { "[Default]": preset } };
    setup(data);

    var result = GM.Storage.load();
    var p = result.presets["[Default]"];
    assert(p.placementMode === "artboard", "forward-fill: placementMode added");
    assert(p.cornerZone && p.cornerZone.enabled === false, "forward-fill: cornerZone.enabled");
    assert(p.cornerZone.count === 5, "forward-fill: cornerZone.count");
    assert(p.cornerZone.pitch === 100, "forward-fill: cornerZone.pitch");
    assert(p.pathDist && p.pathDist.useNumber === false, "forward-fill: pathDist.useNumber");
    assert(p.pathDist.number === 24, "forward-fill: pathDist.number");
    assert(p.pathDist.spacing === 105, "forward-fill: pathDist.spacing");
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
