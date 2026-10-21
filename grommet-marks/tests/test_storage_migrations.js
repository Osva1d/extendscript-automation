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
var failOpenForWrite = false;    // a write that cannot start: open("w") returns false
var failWrite = false;           // a write that throws
MockFile.prototype.open = function (mode) {
    this._mode = mode;
    if (mode === "w" && failOpenForWrite) return false;
    if (mode === "w") this._buffer = "";
    return true;
};
MockFile.prototype.read = function () {
    return mockFS[this._path] || "";
};
MockFile.prototype.write = function (s) {
    if (failWrite) throw new Error("disk full");
    this._buffer += s;
};
MockFile.prototype.close = function () {
    if (this._mode === "w") mockFS[this._path] = this._buffer;
};
global.File = MockFile;

var alerts = [];
global.alert = function (m) { alerts.push(String(m)); };
global.$ = { writeln: function () {} };

// ===== LOAD PRODUCTION CODE =====
eval(fs.readFileSync(path.join(__dirname, "..", "src", "constants.js"), "utf8"));

// The real locale (storage's error path says what the operator reads)
global.app = { locale: "en_US" };
eval(fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8"));

eval(fs.readFileSync(path.join(__dirname, "..", "src", "lib", "utils.js"), "utf8"));
require("./lib/load_shared.js")(GM, ["numbers"]);   // shared: GM.Numbers (presetEquals)
eval(fs.readFileSync(path.join(__dirname, "..", "src", "config.js"), "utf8"));

// JSON polyfill (in case Node version is ancient, unlikely but safe)
eval(fs.readFileSync(path.join(__dirname, "..", "..", "shared", "lib", "json2.js"), "utf8"));

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
    var data = { activePreset: "Old", presets: { "Old": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["Old"].offsetX === 12, "v2: offsetX from top.x");
    assert(result.presets["Old"].offsetY === 15, "v2: offsetY from top.y");
    assert(result.presets["Old"].top.x === undefined, "v2: top.x removed");
    assert(result.presets["Old"].top.y === undefined, "v2: top.y removed");
})();

console.log("--- Migration: v3.0 localized units -> v3.1 internal keys ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.units = "Milimetry";
    var data = { activePreset: "Old", presets: { "Old": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["Old"].units === "mm", "units: Milimetry -> mm");
})();

console.log("--- Migration: v3.0 localized sentinels -> __create__ ---");
(function () {
    var preset = GM.Config.getDefaults();
    preset.fillSwatchName = "[Create 'Grommet Marks']";
    var data = { activePreset: "Old", presets: { "Old": preset } };
    setup(data);

    var result = GM.Storage.load();
    assert(result.presets["Old"].fillSwatchName === "__create__",
        "sentinel: localized -> __create__");
})();

console.log("--- Forward-fill: new keys added to old presets ---");
(function () {
    var preset = { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 };
    var data = { activePreset: "Old", presets: { "[Default]": GM.Config.getDefaults(), "Old": preset } };
    setup(data);

    var result = GM.Storage.load();
    var p = result.presets["Old"];
    assert(p.markCircle === true, "forward-fill: markCircle added from defaults");
    assert(p.markCross === false, "forward-fill: markCross added from defaults");
    assert(p.regWeight === 1.0, "forward-fill: regWeight added");
    assert(p.haloWeight === 3.0, "forward-fill: haloWeight added");
    assert(p.top !== undefined, "forward-fill: top edge added");
    assert(p.markSize === 2, "forward-fill: existing value preserved");
})();

console.log("--- v5 forward-fill ---");
(function () {
    var preset = { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 };
    var data = { activePreset: "Old", presets: { "[Default]": GM.Config.getDefaults(), "Old": preset } };
    setup(data);

    var result = GM.Storage.load();
    var p = result.presets["Old"];
    assert(p.placementMode === "artboard", "forward-fill: placementMode added");
    assert(p.cornerZone && p.cornerZone.enabled === false, "forward-fill: cornerZone.enabled");
    assert(p.cornerZone.count === 5, "forward-fill: cornerZone.count");
    assert(p.cornerZone.pitch === 100, "forward-fill: cornerZone.pitch");
    assert(p.pathDist && p.pathDist.useNumber === false, "forward-fill: pathDist.useNumber");
    assert(p.pathDist.number === 24, "forward-fill: pathDist.number");
    assert(p.pathDist.spacing === 105, "forward-fill: pathDist.spacing");
    assert(p.pathOffset === 0, "forward-fill: pathOffset 0 — old presets keep marks on the path (no double offset)");
})();

// ===== TEST: [Default] is built from the code on every load (spec 6.4, P13) =====
// A file that holds another [Default] — an older version's, a hand edit — does
// not change what "default" means. The other presets and the active key stay.
console.log("--- Storage.load: [Default] always comes from getDefaults(), the rest is left alone ---");
(function () {
    var D = GM.Config.getDefaults();
    var bent = GM.Config.getDefaults();
    bent.markSize = 99; bent.offsetX = 1234; bent.top.spacing = 5; bent.cornerZone.pitch = 7;
    var mine = GM.Config.getDefaults();
    mine.markSize = 4.5; mine.units = "cm";
    var data = { activePreset: "Mine", presets: { "[Default]": bent, "Mine": mine } };
    setup(data);

    var result = GM.Storage.load();
    assert(JSON.stringify(result.presets["[Default]"]) === JSON.stringify(D),
        "a file's [Default] with markSize 99 loads as getDefaults()");
    assert(result.presets["Mine"].markSize === 4.5 && result.presets["Mine"].units === "cm",
        "another preset is not touched");
    assert(result.activePreset === "Mine", "the active preset key is not touched");

    // A [Default] with older shape (pre-v5 keys missing) is rebuilt, not forward-filled
    setup({ activePreset: "[Default]", presets: { "[Default]": { offsetX: 5, offsetY: 5, units: "mm", markSize: 2 } } });
    var old = GM.Storage.load();
    assert(JSON.stringify(old.presets["[Default]"]) === JSON.stringify(D), "an old-shape [Default] loads as getDefaults()");
    assert(old.activePreset === "[Default]", "active [Default] stays active");

    // The sentinel / legacy names still land on [Default], which then holds the code's values
    setup({ activePreset: "__default__", presets: { "__default__": bent } });
    var legacy = GM.Storage.load();
    assert(JSON.stringify(legacy.presets["[Default]"]) === JSON.stringify(D) && legacy.presets["__default__"] === undefined,
        "a legacy default key is renamed and holds the code's values");
    assert(legacy.activePreset === "[Default]", "...and stays the active one");

    // A file without [Default]: it is there
    setup({ activePreset: "Mine", presets: { "Mine": mine } });
    var none = GM.Storage.load();
    assert(JSON.stringify(none.presets["[Default]"]) === JSON.stringify(D) && none.activePreset === "Mine",
        "no [Default] in the file: it is added, the active key stays");

    // Not shared with the next load
    none.presets["[Default]"].markSize = 77;
    setup({ activePreset: "[Default]", presets: {} });
    assert(GM.Storage.load().presets["[Default]"].markSize === D.markSize, "each load builds a fresh [Default]");
})();

// ===== TEST: a failed settings write is no error (ruling R4) =====
// The run goes on (or the dialog stays open) without the settings, so the alert
// is the bare consequence sentence: no "CHYBA: " / "ERROR: " in front, as in the
// other tools. Both ways a write fails: open("w") refuses, or writing throws.
console.log("--- Storage.save: a failed write alerts ERR_WRITE_SETTINGS and nothing else ---");
(function () {
    function tableFor(locale) {
        var saved = global.app.locale;
        global.app.locale = locale;
        var table = new Function("GM", fs.readFileSync(path.join(__dirname, "..", "src", "locale.js"), "utf8") +
            "\nreturn GM.L;")({});
        global.app.locale = saved;
        return table;
    }
    var data = { activePreset: "[Default]", presets: { "[Default]": GM.Config.getDefaults() } };
    var kept = GM.L;
    var langs = ["en_US", "cs_CZ"];
    for (var li = 0; li < langs.length; li++) {
        GM.L = tableFor(langs[li]);
        var tag = langs[li] + ": ";

        setup();
        alerts = [];
        assert(GM.Storage.save(data) === true && alerts.length === 0, tag + "a good write: true, no alert");
        assert(mockFS.hasOwnProperty(SETTINGS_PATH), tag + "...and the file is written");

        setup();
        alerts = [];
        failOpenForWrite = true;
        var r1 = GM.Storage.save(data);
        failOpenForWrite = false;
        assert(r1 === false, tag + "open('w') refused: save returns false");
        assert(alerts.length === 1 && alerts[0] === GM.L.ERR_WRITE_SETTINGS,
            tag + "open('w') refused: exactly ERR_WRITE_SETTINGS (got '" + alerts.join(" | ") + "')");
        assert(alerts.length === 1 && alerts[0].indexOf(GM.L.ERR_PREFIX) < 0,
            tag + "...with no error prefix");

        setup();
        alerts = [];
        failWrite = true;
        var r2 = GM.Storage.save(data);
        failWrite = false;
        assert(r2 === false, tag + "write throws: save returns false");
        assert(alerts.length === 1 && alerts[0] === GM.L.ERR_WRITE_SETTINGS,
            tag + "write throws: exactly ERR_WRITE_SETTINGS (got '" + alerts.join(" | ") + "')");
    }
    GM.L = kept;
})();

// ===== SUMMARY =====
console.log("\nResults: " + pass + "/" + total + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
