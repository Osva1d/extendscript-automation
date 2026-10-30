var h = require("./lib/harness");

// The pure helpers of BTE.UI. build() needs ScriptUI and is measured headless
// by tests/probes/probe_dialog.jsx; ui.js itself loads in Node because it
// touches ScriptUI only inside build().
var MODULES = ["src/locale.js", "src/lib/utils.js", "src/config.js", "src/lib/storage.js",
    "src/vars.js", "src/steps.js", "src/order.js", "src/ui_model.js", "src/ui.js"];

function loadBTE(locale) {
    global.app = { locale: locale };
    try {
        return h.load(MODULES, ["numbers", "ui_state"]);
    } finally {
        delete global.app;
    }
}
var BTE = loadBTE("cs_CZ");
var U = BTE.UI;
var S = BTE.Storage;
var DEF = BTE.Config.PRESET_KEY_DEFAULT;

function j(v) { return JSON.stringify(v); }
function V(name) { return { kind: "var", text: name }; }
function N(where, extra) {
    var s = S.newStep("number"), k;
    s.where = where;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function R(where, extra) {
    var s = S.newStep("replace"), k;
    s.where = where;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}

// A sheet like the user's: every element holds a code above a number.
var SHEET = [];
var i;
for (i = 0; i < 6; i++) { SHEET.push(["{kód}", "{n}"]); }

// ======================= copy ================================================
var src = { order: "rows", steps: [N(V("{n}"), { from: "5" })] };
var cp = U.copy(src);
h.eq(j(cp), j(src), "copy: same data");
cp.steps[0].where.text = "{x}";
cp.steps.push(1);
h.eq(src.steps[0].where.text, "{n}", "copy: nested objects are new");
h.eq(src.steps.length, 1, "copy: arrays are new");
h.eq(U.copy(null), null, "copy: null");
h.eq(U.copy("a"), "a", "copy: a string");
h.eq(BTE.Utils.isArray(U.copy([1, [2]])), true, "copy: an array stays an array");

// ======================= initialScope ========================================
h.eq(U.initialScope([{ typename: "GroupItem" }]), "selection", "objects selected: Výběr");
h.eq(U.initialScope([]), "document", "nothing selected: Celý dokument");
h.eq(U.initialScope(null), "document", "null selection: Celý dokument");
h.eq(U.initialScope(undefined), "document", "no selection: Celý dokument");
// Text being edited is a TextRange, not an array (findings, Task 8 fact 2).
h.eq(U.initialScope({ typename: "TextRange", length: 3 }), "document", "text editing: Celý dokument");

// ======================= resolveAuto =========================================
var raw = S.defaultPreset();
var res = U.resolveAuto(raw, SHEET);
h.eq(j(res.steps[0].where), j(V("{kód}")), "auto: the first variable of the texts");
h.eq(raw.steps[0].where.kind, "auto", "auto: the input is not changed");
res = U.resolveAuto(raw, [["Série 12"], ["Série 13"]]);
h.eq(j(res.steps[0].where), '{"kind":"first","text":""}', "auto: no variable gives the Number default");
res = U.resolveAuto(raw, []);
h.eq(j(res.steps[0].where), '{"kind":"first","text":""}', "auto: an empty range gives the Number default");
// a later auto step sees the variables after the steps above it
var chain = { order: "rows", steps: [R(V("{kód}"), { replace: "ABC" }), N({ kind: "auto", text: "" })] };
res = U.resolveAuto(chain, SHEET);
h.eq(j(res.steps[1].where), j(V("{n}")), "auto: below a step that replaced {kód}, the next variable is {n}");
h.eq(j(res.steps[0].where), j(V("{kód}")), "auto: a concrete Kde stays");
res = U.resolveAuto({ order: "cols", steps: [N(V("{x}"))] }, SHEET);
h.eq(res.order, "cols", "auto: the order is kept");
h.eq(j(res.steps[0].where), j(V("{x}")), "auto: a variable the texts lack is kept (nenalezeno)");

// ---- Task 11 carry: [Výchozí] shows no "*" right after the dialog opens ------
function openAs(pData, state) {
    // What build() does: [Výchozí] resolved in memory, the fields from the
    // last run or the active preset, resolved with the same texts.
    var LAST = BTE.Config.PRESET_KEY_LAST;
    var start = pData.presets.hasOwnProperty(LAST) ? pData.presets[LAST] : pData.presets[pData.activePreset];
    pData.presets[DEF] = U.resolveAuto(S.defaultPreset(), state);
    return U.resolveAuto(start, state);
}
function listText(pData, values) {
    var e = BTE.UIState.formatPresetList(pData, values, BTE.L), out = [], k;
    for (k = 0; k < e.length; k++) { out.push(e[k].displayText); }
    return out.join(",");
}
var pd = S.fresh();
var shown = openAs(pd, SHEET);
h.eq(listText(pd, shown), "[Výchozí]", "no * after open: fresh settings, [Výchozí] active");
h.eq(BTE.UIState.isModified(pd, shown), false, "no * after open: not modified");
pd = S.fresh();
shown = openAs(pd, [["Série 12"]]);
h.eq(listText(pd, shown), "[Výchozí]", "no * after open: a document without variables");
// negative control: comparing with the stored, unresolved [Výchozí] would mark it
pd = S.fresh();
shown = U.resolveAuto(pd.presets[DEF], SHEET);
h.eq(listText(pd, shown), "[Výchozí] *", "negative control: unresolved [Výchozí] shows *");
// an edit after open marks it
pd = S.fresh();
shown = openAs(pd, SHEET);
shown.steps[0].from = "101";
h.eq(listText(pd, shown), "[Výchozí] *", "an edit after open shows *");
// a new Rozsah resolves [Výchozí] again: the same variables, no *
pd = S.fresh();
shown = openAs(pd, SHEET);
pd.presets[DEF] = U.resolveAuto(S.defaultPreset(), [["{kód}", "{n}"]]);
h.eq(listText(pd, shown), "[Výchozí]", "Rozsah change with the same first variable: no *");
pd.presets[DEF] = U.resolveAuto(S.defaultPreset(), [["{n}"]]);
h.eq(listText(pd, shown), "[Výchozí] *", "Rozsah change to texts whose first variable differs: * (the values differ)");
// the last run's values on open: * only when they differ from the active preset
pd = S.fresh();
pd.presets[BTE.Config.PRESET_KEY_LAST] = { order: "rows", steps: [N(V("{kód}"))] };
shown = openAs(pd, SHEET);
h.eq(listText(pd, shown), "[Výchozí]", "last run equal to [Výchozí] here: no *");
pd = S.fresh();
pd.presets[BTE.Config.PRESET_KEY_LAST] = { order: "rows", steps: [N(V("{n}"), { from: "101" })] };
shown = openAs(pd, SHEET);
h.eq(listText(pd, shown), "[Výchozí] *", "last run differing from [Výchozí]: *");
h.eq(j(shown.steps[0].where), j(V("{n}")), "the fields hold the last run");

// ======================= whereAfterPick ======================================
h.eq(j(U.whereAfterPick(V("{n}"), { kind: "text", text: "abc" })), j(V("{n}")), "pick a variable");
h.eq(j(U.whereAfterPick({ kind: "regex", text: "" }, { kind: "text", text: "a.b" })), '{"kind":"regex","text":"a.b"}', "text -> regex keeps what was typed");
h.eq(j(U.whereAfterPick({ kind: "text", text: "" }, { kind: "regex", text: "\\d+" })), '{"kind":"text","text":"\\\\d+"}', "regex -> text keeps what was typed");
h.eq(j(U.whereAfterPick({ kind: "text", text: "" }, V("{n}"))), '{"kind":"text","text":""}', "variable -> text starts empty");
h.eq(j(U.whereAfterPick({ kind: "first", text: "" }, { kind: "text", text: "x" })), '{"kind":"first","text":""}', "-> first number has no text");
h.eq(j(U.whereAfterPick({ kind: "all", text: "" }, null)), '{"kind":"all","text":""}', "no old Kde");
var picked = V("{n}");
var w2 = U.whereAfterPick(picked, null);
w2.text = "{m}";
h.eq(picked.text, "{n}", "pick: the item's Kde is not shared");

// ======================= errorField ==========================================
function info(key, args) { return { error: key ? { key: key, args: args || [] } : null, warns: [] }; }
var on = N(V("{n}"));
h.eq(U.errorField(on, info("ERR_FIND_EMPTY")), "where", "empty find -> the text field");
h.eq(U.errorField(on, info("ERR_BAD_REGEX")), "where", "bad regex -> the text field");
h.eq(U.errorField(on, info("ERR_LOOKBEHIND")), "where", "lookbehind -> the text field");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", ["FIELD_FROM"])), "from", "Od");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", ["FIELD_TO"])), "to", "Do");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", ["FIELD_STEP"])), "step", "Krok");
h.eq(U.errorField(on, info("ERR_MIN_ONE", ["FIELD_DIGITS"])), "digits", "Číslic");
h.eq(U.errorField(on, info("ERR_MIN_ONE", ["FIELD_REPEATS"])), "repeats", "Opakovat");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", ["FIELD_RESET"])), "reset", "Znovu po");
h.eq(U.errorField(on, info("ERR_DIGITS_RANGE", [1, 20])), "digits", "Číslic range");
h.eq(U.errorField(on, info("ERR_VALUE_RANGE")), null, "a value out of range names no field");
h.eq(U.errorField(on, info("ERR_LETTER_BELOW_ONE")), null, "a letter below A names no field");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", ["FIELD_NOPE"])), null, "an unknown label names no field");
h.eq(U.errorField(on, info("ERR_NOT_INTEGER", [])), null, "no label names no field");
h.eq(U.errorField(on, info(null)), null, "no error");
h.eq(U.errorField(on, null), null, "no info");
h.eq(U.errorField(N(V("{n}"), { active: false }), info("ERR_FIND_EMPTY")), null, "a step that is off reports nothing");
// the real messages of BTE.Steps
var run = BTE.Steps.run(SHEET, [N(V("{n}"), { repeats: "x" })]);
h.eq(U.errorField(N(V("{n}"), { repeats: "x" }), run.info[0]), "repeats", "real run: Opakovat x");
run = BTE.Steps.run(SHEET, [R({ kind: "regex", text: "(" })]);
h.eq(U.errorField(R({ kind: "regex", text: "(" }), run.info[0]), "where", "real run: bad regex");

// ======================= varsAfter ===========================================
run = BTE.Steps.run(SHEET, [R(V("{kód}"), { replace: "ABC" })]);
h.eq(j(U.varsAfter(run, 0)), '[{"name":"{n}","count":6}]', "after step 1: {kód} is gone");
h.eq(j(U.varsAfter(run, -1)), '[{"name":"{kód}","count":6},{"name":"{n}","count":6}]', "before step 1: the input");
h.eq(j(U.varsAfter(null, 0)), "[]", "no run: no variables");
h.eq(j(U.varsAfter(run, 5)), "[]", "past the chain: no variables");

// ======================= insertStep / removeStep / moveStep ===================
var A = { id: "a" }, B = { id: "b" }, C = { id: "c" }, X = { id: "x" };
function ids(r) {
    var out = [], k;
    for (k = 0; k < r.steps.length; k++) { out.push(r.steps[k].id); }
    return out.join("") + "@" + r.selected;
}
var three = [A, B, C];
h.eq(ids(U.insertStep(three, 0, X)), "axbc@1", "add below the first");
h.eq(ids(U.insertStep(three, 2, X)), "abcx@3", "add below the last");
h.eq(ids(U.insertStep(three, -1, X)), "abcx@3", "nothing selected: at the end");
h.eq(ids(U.insertStep([], 0, X)), "x@0", "into an empty chain");
h.eq(three.length, 3, "insert leaves the input alone");

h.eq(ids(U.removeStep(three, 1)), "ac@1", "remove the middle: the next one is selected");
h.eq(ids(U.removeStep(three, 2)), "ab@1", "remove the last: the new last is selected");
h.eq(ids(U.removeStep(three, 0)), "bc@0", "remove the first");
h.eq(ids(U.removeStep([A], 0)), "a@0", "the only step stays");
h.eq(ids(U.removeStep(three, 7)), "abc@2", "out of range: nothing removed");
h.eq(three.length, 3, "remove leaves the input alone");

h.eq(ids(U.moveStep(three, 1, -1)), "bac@0", "up");
h.eq(ids(U.moveStep(three, 1, 1)), "acb@2", "down");
h.eq(ids(U.moveStep(three, 0, -1)), "abc@0", "the first does not go up");
h.eq(ids(U.moveStep(three, 2, 1)), "abc@2", "the last does not go down");
h.eq(j([three[0].id, three[1].id, three[2].id]), '["a","b","c"]', "move leaves the input alone");

// ======================= convertStep =========================================
var vars = BTE.Vars.list(SHEET);
var num = N(V("{n}"), { active: false, from: "9" });
var conv = U.convertStep(num, "replace", vars);
h.eq(conv.type, "replace", "convert: the new type");
h.eq(conv.active, false, "convert: Aktivní is kept");
h.eq(j(conv.where), j(V("{kód}")), "convert: Kde from defaultWhere");
h.eq(conv.replace, "", "convert: the new type's fields");
h.eq(conv.from, undefined, "convert: no field of the old type");
h.eq(U.convertStep(num, "number", vars), num, "convert to the same type: the same step");
conv = U.convertStep(num, "case", []);
h.eq(j(conv.where), '{"kind":"all","text":""}', "convert without variables: the type's default");
// a converted step is a valid preset step: normalize changes nothing
var norm = S.normalize({ order: "rows", steps: [conv] });
h.eq(j(norm.values.steps[0]), j(conv), "convert: the step is already in the preset format");
h.eq(norm.notes.length, 0, "convert: no repair notes");

// ======================= the dialog's tables =================================
h.eq(U.TYPES.length, 3, "three step types");
var t;
for (t = 0; t < U.TYPES.length; t++) {
    h.eq(S.isType(U.TYPES[t]), true, "type " + U.TYPES[t] + " is known to Storage");
}
h.eq(j(U.FORMATS), '["1","A","a"]', "formats in dropdown order");
h.eq(j(U.MODES), '["upper","lower","title","sentence"]', "modes in dropdown order");
h.eq(j(U.SCOPES), '["selection","artboard","document"]', "scopes in radio order");
var nf = S.newStep("number"), missing = [];
for (t = 0; t < U.NUMBER_FIELDS.length; t++) {
    if (typeof nf[U.NUMBER_FIELDS[t]] !== "string") { missing.push(U.NUMBER_FIELDS[t]); }
}
h.eq(missing.join(","), "", "every number field is a text field of the step");
var keys = [], k2;
for (k2 in U.FIELD_OF) { if (U.FIELD_OF.hasOwnProperty(k2)) { keys.push(k2 + "=" + (typeof BTE.L[k2])); } }
h.eq(keys.join(","), "FIELD_FROM=string,FIELD_TO=string,FIELD_STEP=string,FIELD_DIGITS=string,FIELD_REPEATS=string,FIELD_RESET=string",
    "FIELD_OF names the locale labels BTE.Steps uses");

// ======================= the dialog's strings exist in both languages =========
// Every BTE.L key ui.js reads, in Czech and English.
var fs = require("fs");
var path = require("path");
var uiSrc = fs.readFileSync(path.join(__dirname, "..", "src", "ui.js"), "utf8");
var EN = loadBTE("en_US").L;
var re = /\bL\.([A-Z][A-Z0-9_]+)\b/g, m, absent = [];
while ((m = re.exec(uiSrc)) !== null) {
    if (typeof BTE.L[m[1]] !== "string" || typeof EN[m[1]] !== "string") { absent.push(m[1]); }
}
h.eq(absent.join(","), "", "every L.KEY in ui.js exists in both tables");
var code = uiSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
h.eq(/"[^"\n]*[ěščřžýáíéóůúňťď][^"\n]*"/i.test(code), false, "no Czech string literal in ui.js");
h.eq(uiSrc.indexOf("\"© 2025–2026 Ladislav Osvald · v\" + C.version") !== -1, true, "the family footer, verbatim");
h.done();
