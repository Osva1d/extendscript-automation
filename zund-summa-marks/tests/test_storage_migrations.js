#!/usr/bin/env node
/**
 * ZSM.Storage Migration Test Suite
 * Tests Storage.load() against various legacy data shapes — no Illustrator needed.
 *
 * Coverage:
 *   - Migration 1: v26.0 flat thru/kiss → v26.3 layers[]
 *   - Migration 2: flat settings → presets wrapper
 *   - Migration 3: layers[{active}] → layers[{name,color}]
 *   - Migration 4: localized [Výchozí] → [Default]
 *   - Filename migration: settings_v26_3.json → settings.json
 *   - Empty file
 *   - Corrupted JSON
 *   - Forward-fill of new keys
 *
 * Usage: node tests/test_storage_migrations.js
 */

var fs   = require("fs");
var path = require("path");

// ===== MOCK ENVIRONMENT =====
var ZSM = {};

// Mock virtual file system: { absPath: "fileContent" }
var mockFS = {};

// Mock Folder class — minimal, just `userData`, `exists`, `create`, `fsName`
function MockFolder(p) {
    this.fsName = p;
}
MockFolder.userData = "/mock/userData";
Object.defineProperty(MockFolder.prototype, "exists", {
    get: function () { return true; }   // assume folder always exists
});
MockFolder.prototype.create = function () { return true; };
global.Folder = MockFolder;

// Mock File class — backed by mockFS
function MockFile(p) {
    this.fsName = p;
    this._path = p;
    this.encoding = "UTF-8";
    this._open = false;
    this._buffer = "";
}
Object.defineProperty(MockFile.prototype, "exists", {
    get: function () { return mockFS.hasOwnProperty(this._path); }
});
MockFile.prototype.open = function (mode) {
    this._open = true;
    this._mode = mode;
    if (mode === "w") this._buffer = "";
    return true;
};
MockFile.prototype.read = function () {
    return mockFS[this._path] || "";
};
MockFile.prototype.write = function (s) {
    this._buffer += s;
};
MockFile.prototype.close = function () {
    if (this._mode === "w") mockFS[this._path] = this._buffer;
    this._open = false;
};
global.File = MockFile;

// Mock alert / utils log
global.alert = function () {};

// ===== LOAD PRODUCTION CODE =====
// Need ZSM.Utils.error to exist before config.js loads (Storage.save calls it)
var utilsPath = path.join(__dirname, "..", "src", "lib", "utils.js");
ZSM.L = { ERR_WRITE_SETTINGS: "Cannot write settings file." };
eval(fs.readFileSync(utilsPath, "utf8"));

var configPath = path.join(__dirname, "..", "src", "config.js");
eval(fs.readFileSync(configPath, "utf8"));

var storagePath = path.join(__dirname, "..", "src", "lib", "storage.js");
eval(fs.readFileSync(storagePath, "utf8"));


// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}

function resetMockFS() {
    mockFS = {};
}

var NEW_PATH = "/mock/userData/ZSM/settings.json";
var LEGACY_PATH = "/mock/userData/ZSM/settings_v26_3.json";


// =====================================================
// TEST 1: No file exists → returns null
// =====================================================
console.log("\n=== TEST 1: No file exists ===");
resetMockFS();
var data = ZSM.Storage.load();
assert(data === null, "load() returns null when no file exists");


// =====================================================
// TEST 2: Empty file → returns null
// =====================================================
console.log("\n=== TEST 2: Empty file ===");
resetMockFS();
mockFS[NEW_PATH] = "";
data = ZSM.Storage.load();
assert(data === null, "load() returns null on empty file");


// =====================================================
// TEST 3: Corrupted JSON → returns null
// =====================================================
console.log("\n=== TEST 3: Corrupted JSON ===");
resetMockFS();
mockFS[NEW_PATH] = "{this is not valid json";
data = ZSM.Storage.load();
assert(data === null, "load() returns null on corrupted JSON");


// =====================================================
// TEST 4: Filename migration — legacy file is read
// =====================================================
console.log("\n=== TEST 4: Filename migration (settings_v26_3.json → settings.json) ===");
resetMockFS();
// Only legacy file exists, new one doesn't
mockFS[LEGACY_PATH] = JSON.stringify({
    activePreset: "[Default]",
    presets: {
        "[Default]": ZSM.Config.getDefaults()
    }
});
data = ZSM.Storage.load();
assert(data !== null, "Filename migration: legacy file is loaded");
assert(data.activePreset === "[Default]", "Filename migration: activePreset preserved");
assert(data.presets["[Default]"] !== undefined, "Filename migration: presets preserved");

// After load, save should write to NEW path
ZSM.Storage.save(data);
assert(mockFS[NEW_PATH] !== undefined, "Filename migration: save() writes to new path");
assert(JSON.parse(mockFS[NEW_PATH]).activePreset === "[Default]", "Filename migration: new file has correct content");


// =====================================================
// TEST 5: New file takes precedence over legacy
// =====================================================
console.log("\n=== TEST 5: New file precedence ===");
resetMockFS();
mockFS[LEGACY_PATH] = JSON.stringify({
    activePreset: "LegacyOnly",
    presets: { "LegacyOnly": ZSM.Config.getDefaults() }
});
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "NewOnly",
    presets: { "NewOnly": ZSM.Config.getDefaults() }
});
data = ZSM.Storage.load();
assert(data.activePreset === "NewOnly", "New file precedence: activePreset = 'NewOnly'");


// =====================================================
// TEST 6: MIGRATION 1 — v26.0 flat thru/kiss → v26.3 layers[]
// =====================================================
console.log("\n=== TEST 6: Migration 1 (flat thru/kiss → layers[]) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    mode: "ZUND",
    thruActive: true,  thruName: "Thru-cut",
    kissActive: true,  kissName: "Kiss-cut"
});
data = ZSM.Storage.load();
assert(data !== null, "Migration 1: load succeeds");
// After migration 2 wraps in presets, the layers will be in [Last Settings] or similar
// Since input was flat (no `presets` key), migration 2 wraps it
assert(data.presets !== undefined, "Migration 1+2: presets wrapper created");
// Find the migrated preset
var migratedPreset = data.presets["[Last Settings]"] || data.presets[Object.keys(data.presets)[0]];
assert(migratedPreset.layers !== undefined, "Migration 1: layers array created");
assert(migratedPreset.layers.length >= 1, "Migration 1: at least 1 layer");
// Both thru and kiss were active=true, so both kept (after migration 3 strips inactive)
var hasThruCut = false, hasKissCut = false;
for (var li = 0; li < migratedPreset.layers.length; li++) {
    if (migratedPreset.layers[li].name === "Thru-cut") hasThruCut = true;
    if (migratedPreset.layers[li].name === "Kiss-cut") hasKissCut = true;
}
assert(hasThruCut, "Migration 1: Thru-cut layer preserved");
assert(hasKissCut, "Migration 1: Kiss-cut layer preserved");


// =====================================================
// TEST 7: MIGRATION 1 — only thru active (kiss inactive dropped)
// =====================================================
console.log("\n=== TEST 7: Migration 1 + 3 (drop inactive layers) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    mode: "ZUND",
    thruActive: true,  thruName: "Cut",
    kissActive: false, kissName: "Kiss-cut"
});
data = ZSM.Storage.load();
var preset = data.presets["[Last Settings]"];
// Migration 3 should have stripped the inactive Kiss-cut row
var layerNames = [];
for (var i = 0; i < preset.layers.length; i++) layerNames.push(preset.layers[i].name);
assert(layerNames.indexOf("Cut") !== -1, "Migration 3: active layer (Cut) preserved");
assert(layerNames.indexOf("Kiss-cut") === -1, "Migration 3: inactive layer (Kiss-cut) dropped");


// =====================================================
// TEST 8: MIGRATION 2 — flat settings → presets wrapper
// =====================================================
console.log("\n=== TEST 8: Migration 2 (flat → wrapper) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    mode: "SUMMA", gapInner: 7, gapOuter: 3, maxDist: 250
});
data = ZSM.Storage.load();
assert(data.presets !== undefined, "Migration 2: presets object created");
assert(data.presets["[Default]"] !== undefined, "Migration 2: [Default] created");
assert(data.presets["[Last Settings]"] !== undefined, "Migration 2: [Last Settings] created");
// User's flat data should be in [Last Settings]
assert(data.presets["[Last Settings]"].gapInner === 7, "Migration 2: gapInner preserved");
assert(data.presets["[Last Settings]"].mode === "SUMMA", "Migration 2: mode preserved");
// activePreset should be [Last Settings]
assert(data.activePreset === "[Last Settings]", "Migration 2: activePreset = [Last Settings]");


// =====================================================
// TEST 9: MIGRATION 3 — layers with active flag
// =====================================================
console.log("\n=== TEST 9: Migration 3 (strip 'active' from layers) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "[Default]",
    presets: {
        "[Default]": {
            mode: "ZUND",
            layers: [
                { active: true,  name: "Cut",      color: "[Registration]" },
                { active: false, name: "Inactive", color: "[Registration]" },
                { active: true,  name: "Kiss",     color: "[Registration]" }
            ]
        }
    }
});
data = ZSM.Storage.load();
var migrated = data.presets["[Default]"].layers;
assert(migrated.length === 2, "Migration 3: inactive layer dropped (2 remain, got " + migrated.length + ")");
for (var mi = 0; mi < migrated.length; mi++) {
    assert(migrated[mi].active === undefined, "Migration 3: 'active' stripped from layer " + mi);
}


// =====================================================
// TEST 10: MIGRATION 3 — all layers inactive → fallback Cut
// =====================================================
console.log("\n=== TEST 10: Migration 3 (all inactive → fallback) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "[Default]",
    presets: {
        "[Default]": {
            mode: "ZUND",
            layers: [
                { active: false, name: "A", color: "[Registration]" },
                { active: false, name: "B", color: "[Registration]" }
            ]
        }
    }
});
data = ZSM.Storage.load();
assert(data.presets["[Default]"].layers.length === 1, "Migration 3 fallback: 1 default Cut layer");
assert(data.presets["[Default]"].layers[0].name === "Cut", "Migration 3 fallback: layer named 'Cut'");


// =====================================================
// TEST 11: MIGRATION 4 — localized [Výchozí] → [Default]
// =====================================================
console.log("\n=== TEST 11: Migration 4 (Czech [Výchozí] → [Default]) ===");
resetMockFS();
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "[Výchozí]",
    presets: {
        "[Výchozí]": ZSM.Config.getDefaults(),
        "MyPreset": ZSM.Config.getDefaults()
    }
});
data = ZSM.Storage.load();
assert(data.presets["[Default]"] !== undefined, "Migration 4: [Default] key created");
assert(data.presets["[Výchozí]"] === undefined, "Migration 4: [Výchozí] key removed");
assert(data.activePreset === "[Default]", "Migration 4: activePreset migrated to [Default]");
assert(data.presets["MyPreset"] !== undefined, "Migration 4: other presets preserved");


// =====================================================
// TEST 12: MIGRATION 4 — both [Výchozí] AND [Default] exist (don't overwrite)
// =====================================================
console.log("\n=== TEST 12: Migration 4 (both keys, no overwrite) ===");
resetMockFS();
var existingDefault = ZSM.Config.getDefaults();
existingDefault.gapInner = 999; // Marker to detect overwrite
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "[Default]",
    presets: {
        "[Výchozí]": ZSM.Config.getDefaults(),
        "[Default]": existingDefault
    }
});
data = ZSM.Storage.load();
// [Default] should not be overwritten (Migration 4 condition: && !data.presets[PRESET_KEY_DEFAULT])
assert(data.presets["[Default]"].gapInner === 999, "Migration 4: existing [Default] not overwritten");


// =====================================================
// TEST 13: Forward-fill — new keys filled into old presets
// =====================================================
console.log("\n=== TEST 13: Forward-fill new keys ===");
resetMockFS();
// Old preset missing newer fields like orientDist
mockFS[NEW_PATH] = JSON.stringify({
    activePreset: "[Default]",
    presets: {
        "[Default]": {
            mode: "ZUND",
            gapInner: 5,
            // missing: gapOuter, maxDist, feedTop, feedBottom, drawRed,
            //          useArtboardBounds, markSizeZ, markSizeS, orientDist, markColor, layers
        }
    }
});
data = ZSM.Storage.load();
var p = data.presets["[Default]"];
var defaults = ZSM.Config.getDefaults();
for (var k in defaults) {
    if (defaults.hasOwnProperty(k)) {
        assert(p[k] !== undefined, "Forward-fill: '" + k + "' filled in");
    }
}
// gapInner should be PRESERVED (had explicit value)
assert(p.gapInner === 5, "Forward-fill: existing values preserved (gapInner=5)");


// =====================================================
// TEST 14: Save → Load roundtrip
// =====================================================
console.log("\n=== TEST 14: Save → Load roundtrip ===");
resetMockFS();
var originalData = {
    activePreset: "MyTestPreset",
    presets: {
        "[Default]": ZSM.Config.getDefaults(),
        "MyTestPreset": {
            mode: "ZUND",
            gapInner: 7, gapOuter: 2, maxDist: 333,
            feedTop: 80, feedBottom: 60,
            drawRed: false, useArtboardBounds: true,
            markSizeZ: 6, markSizeS: 4, orientDist: 120,
            markColor: "MyCustomSpot",
            layers: [{ name: "Cut", color: "MyCustomSpot" }]
        }
    }
};
ZSM.Storage.save(originalData);
var loaded = ZSM.Storage.load();
assert(loaded.activePreset === "MyTestPreset", "Roundtrip: activePreset preserved");
assert(loaded.presets["MyTestPreset"].gapInner === 7, "Roundtrip: gapInner preserved");
assert(loaded.presets["MyTestPreset"].markColor === "MyCustomSpot", "Roundtrip: markColor preserved");
assert(loaded.presets["MyTestPreset"].layers[0].name === "Cut", "Roundtrip: layer name preserved");


// =====================================================
// TEST 15: Multiple migrations chained (v26.0 → v27 in one load)
// =====================================================
console.log("\n=== TEST 15: Multi-migration chain ===");
resetMockFS();
// Worst case: v26.0 flat data with thru/kiss, also old localized [Výchozí]
// Set this up via the legacy path to also test filename migration
mockFS[LEGACY_PATH] = JSON.stringify({
    mode: "ZUND",
    gapInner: 5,
    thruActive: true,  thruName: "Cut",
    kissActive: false, kissName: ""
});
data = ZSM.Storage.load();
assert(data !== null, "Multi-migration: load succeeds");
assert(data.presets !== undefined, "Multi-migration: presets wrapper present");
// Verify all expected keys filled
var defaults2 = ZSM.Config.getDefaults();
var p2 = data.presets["[Last Settings]"];
for (var k2 in defaults2) {
    if (defaults2.hasOwnProperty(k2)) {
        assert(p2[k2] !== undefined, "Multi-migration: '" + k2 + "' filled in");
    }
}


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("STORAGE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
