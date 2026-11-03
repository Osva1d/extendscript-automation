var h = require("./lib/harness");

var MODULES = ["src/locale.js", "src/lib/utils.js", "src/config.js", "src/lib/storage.js", "src/ui_model.js"];

// BTE.L reads app.locale once, so the language is chosen around the load.
global.app = { locale: "cs_CZ" };
var BTE = h.load(MODULES, ["ui_state"]);
delete global.app;
var S = BTE.Storage;

function J(x) { return JSON.stringify(x); }
function same(a, b, msg) { h.eq(BTE.Utils.presetEquals(a, b), true, msg); }

// ======================= defaultPreset ========================================
var d = S.defaultPreset();
h.eq(d.order, "rows", "default order");
h.eq(d.steps.length, 1, "default: one step");
h.eq(d.steps[0].type, "number", "default: a number step");
h.eq(J(d.steps[0].where), '{"kind":"auto","text":""}', "default: where is auto, resolved by defaultWhere");
same(d.steps[0], {
    type: "number", active: true, where: { kind: "auto", text: "" },
    from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1"
}, "default: spec 5.3 values (from 1, step 1, digits 3, repeats 1, format 1)");
h.eq(d.hasOwnProperty("scope"), false, "default: Rozsah is not part of a preset");
h.eq(S.defaultPreset() === S.defaultPreset(), false, "default: a fresh object every time");
d.steps[0].from = "99";
h.eq(S.defaultPreset().steps[0].from, "1", "default: callers cannot change the factory values");

// "auto" is resolved by defaultWhere to a concrete where
h.eq(J(BTE.UIModel.defaultWhere("number", [{ name: "{n}", count: 3 }])), '{"kind":"var","text":"{n}"}', "default resolves to {n} when present");
h.eq(J(BTE.UIModel.defaultWhere("number", [])), '{"kind":"first","text":""}', "default resolves to the first number otherwise");

// ======================= newStep =============================================
h.eq(J(S.newStep("replace")), '{"type":"replace","active":true,"where":{"kind":"auto","text":""},"replace":"","matchCase":false,"firstOnly":false}', "new replace step");
h.eq(S.newStep("case").mode, "upper", "new case step: VELKÁ");
h.eq(S.newStep("number").repeats, "1", "the field is repeats, not repeat");
h.eq(S.newStep("number").hasOwnProperty("repeat"), false, "no 'repeat' key");
var threw = false;
try { S.newStep("frobnicate"); } catch (e) { threw = true; }
h.eq(threw, true, "newStep throws on an unknown type");

// ======================= normalize ==========================================
// Review Focus: unknown step type dropped
var r = S.normalize({
    order: "cols",
    steps: [
        { type: "number", active: true, where: { kind: "var", text: "{n}" }, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" },
        { type: "frobnicate", active: true, where: { kind: "text", text: "x" } },
        { type: "replace", active: true, where: { kind: "text", text: "a" }, replace: "b", matchCase: true, firstOnly: false }
    ]
});
h.eq(r.values.steps.length, 2, "unknown step type dropped: the other two stay");
h.eq(r.values.steps[0].type + r.values.steps[1].type, "numberreplace", "unknown step type dropped: in order");
h.eq(r.values.order, "cols", "order kept");
h.eq(r.notes.length, 1, "unknown step type dropped: with a note");
h.eq(r.notes[0], "Krok 2 má neznámý typ „frobnicate“ a byl vynechán.", "the note names the step and the type");
h.eq(r.values.steps[1].matchCase, true, "stored values win over defaults");

// Review Focus: variable names kept as stored, even if no text has them
r = S.normalize({ order: "rows", steps: [{ type: "number", active: true, where: { kind: "var", text: "{objednávka č. 5}" }, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" }] });
h.eq(r.values.steps[0].where.text, "{objednávka č. 5}", "missing variable kept: the name is exactly as stored");
h.eq(r.values.steps[0].where.kind, "var", "missing variable kept: kind var");
h.eq(r.notes.length, 0, "missing variable kept: no note, the dialog shows (nenalezeno)");
// ... and the dialog model shows it
var items = BTE.UIModel.whereItems(r.values.steps[0], []);
h.eq(items.items[items.selected].label, "{objednávka č. 5}  (nenalezeno)", "missing variable kept: shown as (nenalezeno) and selected");

// missing fields filled from the step defaults
r = S.normalize({ order: "rows", steps: [{ type: "number" }] });
var st = r.values.steps[0];
h.eq(st.digits, "3", "missing digits filled with \"3\"");
h.eq([st.from, st.to, st.step, st.repeats, st.reset, st.format].join("|"), "1||1|1||1", "the other number fields are filled too");
h.eq(st.active, true, "missing active: on");
h.eq(J(st.where), '{"kind":"first","text":""}', "missing where: the number step's default, concrete");
h.eq(r.notes.length, 0, "filling missing fields is no news");
r = S.normalize({ order: "rows", steps: [{ type: "replace" }, { type: "case" }] });
same(r.values.steps[0], { type: "replace", active: true, where: { kind: "text", text: "" }, replace: "", matchCase: false, firstOnly: false }, "missing replace fields");
same(r.values.steps[1], { type: "case", active: true, where: { kind: "all", text: "" }, mode: "upper" }, "missing case fields");

// types and invalid enumerations
r = S.normalize({ order: "rows", steps: [{ type: "number", active: "yes", where: { kind: "first", text: 5 }, from: 5, to: null, step: -2, digits: 3, repeats: undefined, reset: "4", format: "X" }] });
st = r.values.steps[0];
h.eq(st.active, true, "a non-boolean active falls back to on");
h.eq(st.from + "|" + st.to + "|" + st.step + "|" + st.digits + "|" + st.repeats + "|" + st.reset, "5||-2|3|1|4", "numbers become field text, null and undefined become the default");
h.eq(st.format, "1", "an unknown format becomes 1");
h.eq(st.where.text, "", "first has no text");
r = S.normalize({ order: "rows", steps: [{ type: "case", mode: "lower" }, { type: "case", mode: "shout" }, { type: "replace", matchCase: 1, firstOnly: "true", replace: 7 }] });
h.eq(r.values.steps[0].mode + r.values.steps[1].mode, "lowerupper", "mode: valid kept, unknown becomes upper");
h.eq(r.values.steps[2].matchCase + "|" + r.values.steps[2].firstOnly + "|" + r.values.steps[2].replace, "false|false|7", "booleans must be booleans; replace text becomes text");

// order
r = S.normalize({ order: "diagonal", steps: [{ type: "number" }] });
h.eq(r.values.order, "rows", "unknown order becomes rows (BTE.Order.sort never gets it)");
h.eq(r.notes.length, 1, "unknown order: with a note");
h.eq(r.notes[0], "Pořadí chybí nebo je neznámé, použito pořadí po řádcích.", "the order note");
r = S.normalize({ steps: [{ type: "number" }] });
h.eq(r.values.order + "|" + r.notes.length, "rows|1", "missing order: rows, with a note");
h.eq(S.normalize({ order: "cols", steps: [{ type: "number" }] }).values.order, "cols", "cols kept");
h.eq(S.normalize({ order: "cols", steps: [{ type: "number" }] }).notes.length, 0, "cols: no note");

// where kinds the type does not have
r = S.normalize({ order: "rows", steps: [
    { type: "replace", where: { kind: "first", text: "" } },
    { type: "replace", where: { kind: "all", text: "" } },
    { type: "number", where: { kind: "all", text: "" } },
    { type: "case", where: { kind: "first", text: "" } },
    { type: "number", where: { kind: "banana", text: "x" } },
    { type: "number", where: { kind: "var", text: "" } },
    { type: "number", where: "{n}" }
] });
h.eq(J(r.values.steps[0].where) + J(r.values.steps[1].where), '{"kind":"text","text":""}{"kind":"text","text":""}', "replace: a kind it lacks becomes text");
h.eq(J(r.values.steps[2].where), '{"kind":"first","text":""}', "number: whole text is not offered, becomes first number");
h.eq(J(r.values.steps[3].where), '{"kind":"all","text":""}', "case: first number is not offered, becomes whole text");
h.eq(J(r.values.steps[4].where), '{"kind":"first","text":""}', "an unknown kind becomes the type's default");
h.eq(J(r.values.steps[5].where), '{"kind":"first","text":""}', "a variable without a name becomes the type's default");
h.eq(J(r.values.steps[6].where), '{"kind":"first","text":""}', "a where that is not an object becomes the default (a missing one does so without a note)");
h.eq(r.notes.length, 7, "seven repaired wheres, seven notes");
h.eq(r.notes[0], "Krok 1: pole Kde bylo neplatné a nahradila ho výchozí volba.", "where note");

// regex and text kinds keep their text exactly
r = S.normalize({ order: "rows", steps: [
    { type: "replace", where: { kind: "regex", text: "(\\d+)-(\\d+)" }, replace: "$2/$1" },
    { type: "replace", where: { kind: "text", text: "  a  " }, replace: " " }
] });
h.eq(r.values.steps[0].where.text + "|" + r.values.steps[0].replace, "(\\d+)-(\\d+)|$2/$1", "regex and $-replacement untouched");
h.eq(r.values.steps[1].where.text + "|" + r.values.steps[1].replace, "  a  | ", "spaces untouched");

// nothing left
r = S.normalize({ order: "rows", steps: [] });
h.eq(r.values.steps.length, 1, "no steps: one default step so the dialog always has a selection");
h.eq(J(r.values.steps[0].where), '{"kind":"first","text":""}', "the added step has a concrete where");
h.eq(r.notes.length, 1, "no steps: noted");
r = S.normalize({ order: "rows", steps: [{ type: "x" }, { type: "y" }] });
h.eq(r.values.steps.length, 1, "all dropped: one default step");
h.eq(r.notes.length, 3, "all dropped: two dropped, one added");
r = S.normalize({ order: "rows" });
h.eq(r.values.steps.length, 1, "steps missing: one default step");
r = S.normalize({ order: "rows", steps: "nonsense" });
h.eq(r.values.steps.length, 1, "steps not an array: one default step");
r = S.normalize({ order: "rows", steps: [null, 5, "x", [], { type: 7 }] });
h.eq(r.values.steps.length, 1, "junk entries are dropped, not thrown on");
h.eq(r.notes[0], "Krok 1 má neznámý typ „?“ a byl vynechán.", "a step without a usable type is named with a question mark");
h.eq(S.normalize({ order: "rows", steps: [{ type: new Array(60).join("x") }, { type: "number" }] }).notes[0].length < 80, true, "a long type name is shortened in the note");

// not an object at all
var junk = [undefined, null, 5, "x", true, []];
var ok = true, i;
for (i = 0; i < junk.length; i++) {
    try {
        r = S.normalize(junk[i]);
        if (r.values.steps.length !== 1 || r.values.order !== "rows") { ok = false; }
    } catch (e2) { ok = false; }
}
h.eq(ok, true, "normalize never throws and always returns a usable preset");

// fields that are not part of a preset do not leak in
r = S.normalize({ order: "rows", scope: "document", future: 1, steps: [{ type: "number", active: true, where: { kind: "first", text: "" }, colour: "red", future: [1] }] });
h.eq(r.values.hasOwnProperty("scope") || r.values.hasOwnProperty("future"), false, "Rozsah and unknown top-level fields are not kept");
h.eq(r.values.steps[0].hasOwnProperty("colour") || r.values.steps[0].hasOwnProperty("future"), false, "unknown step fields are not kept");
h.eq(r.notes.length, 0, "and that is no news either");

// idempotent; the default preset (auto) is a fixed point; input is not touched
var odd = { order: "cols", steps: [{ type: "replace", where: { kind: "var", text: "{a+b}" }, replace: "$1" }, { type: "case", mode: "title", where: { kind: "regex", text: "^." } }] };
var before = J(odd);
r = S.normalize(odd);
h.eq(J(odd), before, "normalize does not change its input");
var r2 = S.normalize(r.values);
same(r2.values, r.values, "normalize is idempotent");
h.eq(r2.notes.length, 0, "and the second pass has nothing to say");
same(S.normalize(S.defaultPreset()).values, S.defaultPreset(), "the default preset (with auto) passes through unchanged");
h.eq(r.values.steps[0].where.text, "{a+b}", "metacharacters in a variable name survive");

// ======================= presetEquals =====================================
var a = { order: "rows", steps: [{ type: "number", where: { kind: "var", text: "{n}" }, from: "1" }] };
var b = { steps: [{ from: "1", where: { text: "{n}", kind: "var" }, type: "number" }], order: "rows" };
same(a, b, "presetEquals ignores key order");
b.steps[0].from = "2";
h.eq(BTE.Utils.presetEquals(a, b), false, "presetEquals sees a changed nested field");
b.steps[0].from = "1";
b.steps.push({ type: "case" });
h.eq(BTE.Utils.presetEquals(a, b), false, "presetEquals sees an extra step");
h.eq(BTE.Utils.presetEquals(b, a), false, "in both directions");
h.eq(BTE.Utils.presetEquals({ a: 1 }, { a: 1, b: 2 }), false, "an extra key");
h.eq(BTE.Utils.presetEquals({ a: 1, b: 2 }, { a: 1 }), false, "a missing key");
h.eq(BTE.Utils.presetEquals({ a: [] }, { a: {} }), false, "an array is not an object");
h.eq(BTE.Utils.presetEquals({ a: "1" }, { a: 1 }), false, "no coercion: normalize already made fields text");
h.eq(BTE.Utils.presetEquals(null, {}), false, "null is never equal");
h.eq(BTE.Utils.presetEquals({}, {}), true, "empty equals empty");

// ======================= UIState: modified, list ===============================
var pData = { activePreset: "Zakázka A", presets: {} };
pData.presets["[Default]"] = S.defaultPreset();
pData.presets["Zakázka A"] = S.normalize(odd).values;
var cur = S.normalize(odd).values;
h.eq(BTE.UIState.isModified(pData, cur), false, "unchanged preset is not modified");
cur.steps[1].mode = "lower";
h.eq(BTE.UIState.isModified(pData, cur), true, "a changed field in a step marks the preset modified");
cur = S.normalize(odd).values;
cur.steps.pop();
h.eq(BTE.UIState.isModified(pData, cur), true, "a removed step does too");
cur = S.normalize(odd).values;
cur.order = "rows";
h.eq(BTE.UIState.isModified(pData, cur), true, "so does the order");
var list = BTE.UIState.formatPresetList(pData, cur, { PRESET_DEFAULT: "[Výchozí]" });
h.eq(list[0].displayText + "|" + list[1].displayText, "[Výchozí]|Zakázka A *", "the list shows the default first and the asterisk on the active preset");

// ======================= load / save with an in-memory disk ===================
var disk = {}, folders = {}, opens = { fail: false }, writes = { fail: false };
function MockFolder(p) { this.fsName = p; }
Object.defineProperty(MockFolder.prototype, "exists", { get: function () { return folders[this.fsName] === true; } });
MockFolder.prototype.create = function () { folders[this.fsName] = true; return true; };
MockFolder.userData = "/ud";
function MockFile(p) { this.fsName = p; }
Object.defineProperty(MockFile.prototype, "exists", { get: function () { return disk.hasOwnProperty(this.fsName); } });
MockFile.prototype.open = function (mode) { if (opens.fail) { return false; } this.mode = mode; return true; };
MockFile.prototype.read = function () { return disk[this.fsName]; };
MockFile.prototype.write = function (s) { if (writes.fail) { return false; } disk[this.fsName] = s; return true; };
MockFile.prototype.close = function () { return true; };
global.Folder = MockFolder;
global.File = MockFile;
var PATH = "/ud/batch-text-edit/settings.json";

h.eq(S.getFile().fsName, PATH, "settings file path");
h.eq(folders["/ud/batch-text-edit"], true, "getFile creates the folder");

// no file: a fresh wrapper
delete disk[PATH];
var p = S.load();
h.eq(p.activePreset, "[Default]", "no file: default preset active");
h.eq(J(Object.keys(p.presets)), '["[Default]"]', "no file: only the default preset");
same(p.presets["[Default]"], S.defaultPreset(), "no file: built from code");
h.eq(p.notes.length, 0, "no file: nothing to report");

// round trip
p.presets["Zakázka A"] = S.normalize(odd).values;
p.activePreset = "Zakázka A";
p.notes = ["must not be written"];
h.eq(S.save(p), true, "save reports success");
var onDisk = JSON.parse(disk[PATH]);
h.eq(onDisk.presets.hasOwnProperty("[Default]"), false, "the default preset is not written, it is rebuilt on every open");
h.eq(onDisk.hasOwnProperty("notes"), false, "notes are not written");
h.eq(onDisk.activePreset, "Zakázka A", "active preset written");
var p2 = S.load();
h.eq(p2.activePreset, "Zakázka A", "round trip: active preset");
same(p2.presets["Zakázka A"], S.normalize(odd).values, "round trip: the preset");
same(p2.presets["[Default]"], S.defaultPreset(), "round trip: default rebuilt");
h.eq(p2.notes.length, 0, "round trip: no notes");

// a stale [Default] in the file is replaced by the code's
onDisk.presets["[Default]"] = { order: "cols", steps: [{ type: "case" }] };
disk[PATH] = JSON.stringify(onDisk);
same(S.load().presets["[Default]"], S.defaultPreset(), "a stored [Default] never wins over the code's");

// Review Focus: a preset from another job or a future version
disk[PATH] = JSON.stringify({
    activePreset: "Budoucí",
    presets: {
        "Budoucí": {
            order: "cols",
            steps: [
                { type: "replace", where: { kind: "var", text: "{kód}" }, replace: "ABC" },
                { type: "lookup-table", pairs: [["a", "b"]] },
                { type: "number", where: { kind: "var", text: "{n}" }, repeats: "2" }
            ]
        },
        "Prázdná": { order: "zig", steps: [] }
    }
});
p = S.load();
h.eq(p.activePreset, "Budoucí", "a future file: loads");
h.eq(p.presets["Budoucí"].steps.length, 2, "a future file: the unknown step is dropped");
h.eq(p.presets["Budoucí"].steps[1].digits, "3", "a future file: missing digits filled with 3");
h.eq(p.presets["Budoucí"].steps[1].repeats, "2", "a future file: stored values kept");
h.eq(p.presets["Budoucí"].steps[0].where.text, "{kód}", "a future file: variable name kept");
h.eq(p.notes.length, 3, "a future file: notes for the dropped step, the order and the empty list");
h.eq(p.notes[0], "Předvolba „Budoucí“: Krok 2 má neznámý typ „lookup-table“ a byl vynechán.", "the note names the preset");
h.eq(p.presets["Prázdná"].steps.length + "|" + p.presets["Prázdná"].order, "1|rows", "a preset without steps still opens");

// activePreset that does not exist
disk[PATH] = JSON.stringify({ activePreset: "Zmizela", presets: { "A": S.defaultPreset() } });
h.eq(S.load().activePreset, "[Default]", "an active preset that is gone falls back to the default");
disk[PATH] = JSON.stringify({ presets: { "A": S.normalize(odd).values } });
h.eq(S.load().activePreset, "[Default]", "no active preset: the default");

// unreadable
disk[PATH] = "{ not json";
p = S.load();
h.eq(p.activePreset + "|" + p.notes.length, "[Default]|1", "corrupt file: defaults and one note");
h.eq(p.notes[0], "Soubor s předvolbami nešel přečíst, uložené předvolby se nenačetly.", "corrupt file: the note says what happened and what it means");
disk[PATH] = JSON.stringify([1, 2]);
h.eq(S.load().notes.length, 1, "valid JSON of the wrong shape: defaults and a note");
disk[PATH] = JSON.stringify({ presets: "x" });
h.eq(S.load().notes.length, 1, "presets of the wrong type: defaults and a note");
disk[PATH] = "";
h.eq(S.load().notes.length, 0, "empty file: just defaults");
disk[PATH] = "{}";
h.eq(S.load().notes.length, 0, "an empty object: just defaults");
opens.fail = true;
disk[PATH] = "{}";
p = S.load();
h.eq(p.notes.length, 1, "a file that cannot be opened: defaults and a note");
opens.fail = false;

// save failures are reported, never thrown
opens.fail = true;
h.eq(S.save(p), false, "save: open fails");
opens.fail = false;
writes.fail = true;
h.eq(S.save(p), false, "save: write fails");
writes.fail = false;
h.eq(S.save(null), false, "save: nothing to save");
h.eq(S.save({}), false, "save: not a wrapper");
delete global.Folder;
delete global.File;
h.eq(S.save(p), false, "save: no File and Folder at all (not in Illustrator) is a failure, not a crash");
h.eq(S.load().notes.length, 1, "load: ... and a note instead of a crash");
h.done();
