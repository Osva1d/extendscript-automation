var h = require("./lib/harness");

var MODULES = ["src/locale.js", "src/lib/utils.js", "src/config.js", "src/lib/storage.js",
    "src/vars.js", "src/steps.js", "src/ui_model.js"];

// BTE.L reads app.locale once, so each language is its own load.
function loadBTE(locale) {
    global.app = { locale: locale };
    try {
        return h.load(MODULES, ["numbers"]);
    } finally {
        delete global.app;
    }
}
var BTE = loadBTE("cs_CZ");
var U = BTE.UIModel;

// ---- step builders (the preset format) --------------------------------------
function N(where, extra) {
    var s = { type: "number", active: true, where: where, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function R(where, extra) {
    var s = { type: "replace", active: true, where: where, replace: "", matchCase: false, firstOnly: false };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function C(where, extra) {
    var s = { type: "case", active: true, where: where, mode: "upper" };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function V(name) { return { kind: "var", text: name }; }
function labels(r) {
    var a = [], i;
    for (i = 0; i < r.items.length; i++) { a.push(r.items[i].label); }
    return a.join(" ; ");
}
var VARS = [{ name: "{n}", count: 240 }, { name: "{kód}", count: 240 }];

// ======================= whereItems =========================================
var r = U.whereItems(N(V("{n}")), VARS);
h.eq(labels(r), "{n}   (240×) ; {kód}   (240×) ; - ; První číslo v prvku ; Jiný text… ; Regulární výraz…", "number: variables, separator, first number, text, regex");
h.eq(r.selected, 0, "number: the stored variable is selected");
h.eq(r.items[2].separator, true, "the separator item is flagged");
h.eq(r.items[2].where, null, "the separator has no where");
h.eq(r.items[0].separator, false, "a normal item is no separator");
h.eq(JSON.stringify(r.items[1].where), '{"kind":"var","text":"{kód}"}', "variable item carries the name as stored");
h.eq(JSON.stringify(r.items[3].where), '{"kind":"first","text":""}', "first number item");
h.eq(JSON.stringify(r.items[4].where), '{"kind":"text","text":""}', "text item");
h.eq(JSON.stringify(r.items[5].where), '{"kind":"regex","text":""}', "regex item");

r = U.whereItems(N(V("{kód}")), VARS);
h.eq(r.selected, 1, "number: second variable selected");

r = U.whereItems(N({ kind: "first", text: "" }), VARS);
h.eq(r.selected, 3, "number: first number selected after the separator");

r = U.whereItems(N({ kind: "first", text: "" }), []);
h.eq(labels(r), "První číslo v prvku ; Jiný text… ; Regulární výraz…", "number without variables: no separator at the top");
h.eq(r.selected, 0, "number without variables: first number selected");

r = U.whereItems(R(V("{n}")), VARS);
h.eq(labels(r), "{n}   (240×) ; {kód}   (240×) ; - ; Jiný text… ; Regulární výraz…", "replace: no first number, no whole text");
r = U.whereItems(R({ kind: "text", text: "abc" }), []);
h.eq(labels(r), "Jiný text… ; Regulární výraz…", "replace without variables");
h.eq(r.selected, 0, "replace: text selected");
h.eq(JSON.stringify(r.items[0].where), '{"kind":"text","text":"abc"}', "the selected text item carries the typed text (round trip)");
h.eq(JSON.stringify(r.items[1].where), '{"kind":"regex","text":""}', "the other item stays empty");

r = U.whereItems(R({ kind: "regex", text: "\\d+" }), VARS);
h.eq(r.selected, 4, "replace: regex selected");
h.eq(r.items[4].where.text, "\\d+", "the selected regex item carries the pattern");

r = U.whereItems(C({ kind: "all", text: "" }), VARS);
h.eq(labels(r), "Celý text ; {n}   (240×) ; {kód}   (240×) ; - ; Jiný text… ; Regulární výraz…", "case: whole text first, no first number");
h.eq(r.selected, 0, "case: whole text selected");
h.eq(JSON.stringify(r.items[0].where), '{"kind":"all","text":""}', "whole text item");
r = U.whereItems(C(V("{kód}")), VARS);
h.eq(r.selected, 2, "case: variable selected");
r = U.whereItems(C({ kind: "all", text: "" }), []);
h.eq(labels(r), "Celý text ; - ; Jiný text… ; Regulární výraz…", "case without variables");

// Review Focus: missing variable kept
r = U.whereItems(N(V("{n}")), []);
h.eq(labels(r), "{n}  (nenalezeno) ; - ; První číslo v prvku ; Jiný text… ; Regulární výraz…", "missing variable kept: listed as (nenalezeno)");
h.eq(r.selected, 0, "missing variable kept: and selected");
h.eq(JSON.stringify(r.items[0].where), '{"kind":"var","text":"{n}"}', "missing variable kept: where unchanged");
r = U.whereItems(N(V("{série}")), [{ name: "{n}", count: 3 }]);
h.eq(labels(r), "{n}   (3×) ; {série}  (nenalezeno) ; - ; První číslo v prvku ; Jiný text… ; Regulární výraz…", "missing variable sits after the found ones");
h.eq(r.selected, 1, "missing variable selected, nothing silently swapped");
r = U.whereItems(C(V("{x}")), []);
h.eq(labels(r), "Celý text ; {x}  (nenalezeno) ; - ; Jiný text… ; Regulární výraz…", "case: missing variable after whole text");
h.eq(r.selected, 1, "case: missing variable selected");

// an unresolved "auto" and a kind the type does not have resolve to the default
r = U.whereItems(N({ kind: "auto", text: "" }), VARS);
h.eq(r.selected, 0, "auto resolves to the first variable");
r = U.whereItems(N({ kind: "auto", text: "" }), []);
h.eq(r.items[r.selected].label, "První číslo v prvku", "auto without variables resolves to the first number");
r = U.whereItems(R({ kind: "first", text: "" }), []);
h.eq(r.items[r.selected].label, "Jiný text…", "a kind the type lacks resolves to the type's default");
r = U.whereItems(N(undefined), []);
h.eq(r.items[r.selected].label, "První číslo v prvku", "no where at all resolves to the default");
h.eq(r.selected >= 0, true, "selected is never -1");
var threw = false;
try { U.whereItems({ type: "frobnicate", where: {} }, []); } catch (e) { threw = true; }
h.eq(threw, true, "unknown step type throws (a bug in the caller)");

// ======================= defaultWhere =======================================
h.eq(JSON.stringify(U.defaultWhere("number", VARS)), '{"kind":"var","text":"{n}"}', "default: first variable");
h.eq(JSON.stringify(U.defaultWhere("replace", VARS)), '{"kind":"var","text":"{n}"}', "default replace: first variable");
h.eq(JSON.stringify(U.defaultWhere("case", VARS)), '{"kind":"var","text":"{n}"}', "default case: first variable");
h.eq(JSON.stringify(U.defaultWhere("number", [])), '{"kind":"first","text":""}', "default number without variables");
h.eq(JSON.stringify(U.defaultWhere("replace", [])), '{"kind":"text","text":""}', "default replace without variables");
h.eq(JSON.stringify(U.defaultWhere("case", [])), '{"kind":"all","text":""}', "default case without variables");
h.eq(U.defaultWhere("number", []) === U.defaultWhere("number", []), false, "a fresh object every time");
threw = false;
try { U.defaultWhere("frobnicate", []); } catch (e2) { threw = true; }
h.eq(threw, true, "defaultWhere throws on an unknown type");

// ======================= stepLabel ==========================================
var errInfo = { hits: 0, error: { key: "ERR_FIND_EMPTY", args: [] }, warns: [], vars: [], multi: [], edits: [] };
var warnInfo = { hits: 0, error: null, warns: [{ key: "WARN_NOTHING_FOUND", args: [] }], vars: [], multi: [], edits: [] };
var okInfo = { hits: 4, error: null, warns: [], vars: [], multi: [], edits: [] };
h.eq(U.stepLabel(R(V("{kód}"), { replace: "ABC" }), errInfo, 0), "1  Nahradit {kód} → ABC  ✗", "the brief's example");
h.eq(U.stepLabel(R(V("{kód}"), { replace: "ABC" }), okInfo, 0), "1  Nahradit {kód} → ABC", "ok: no symbol");
h.eq(U.stepLabel(R(V("{kód}"), { replace: "ABC" }), warnInfo, 2), "3  Nahradit {kód} → ABC  ⚠", "warning symbol, index is zero-based");
h.eq(U.stepLabel(N(V("{n}")), okInfo, 1), "2  Číslovat {n} od 1", "number step");
h.eq(U.stepLabel(N({ kind: "first", text: "" }, { from: "10" }), okInfo, 0), "1  Číslovat První číslo v prvku od 10", "number step, first number");
h.eq(U.stepLabel(C(V("{kód}"), { mode: "upper" }), okInfo, 0), "1  Velikost písmen {kód} → VELKÁ", "case step upper");
h.eq(U.stepLabel(C({ kind: "all", text: "" }, { mode: "lower" }), okInfo, 0), "1  Velikost písmen Celý text → malá", "case step lower");
h.eq(U.stepLabel(C({ kind: "all", text: "" }, { mode: "title" }), okInfo, 0), "1  Velikost písmen Celý text → Každé Slovo", "case step title");
h.eq(U.stepLabel(C({ kind: "all", text: "" }, { mode: "sentence" }), okInfo, 0), "1  Velikost písmen Celý text → První písmeno věty", "case step sentence");
h.eq(U.stepLabel(R({ kind: "regex", text: "\\d+" }, { replace: "x" }), okInfo, 0), "1  Nahradit /\\d+/ → x", "regex shown between slashes");
h.eq(U.stepLabel(R({ kind: "text", text: "abc" }, { replace: "" }), okInfo, 0), "1  Nahradit abc → (prázdné)", "empty replacement is named, not blank");
h.eq(U.stepLabel(R({ kind: "text", text: "" }, { replace: "x" }), errInfo, 0), "1  Nahradit … → x  ✗", "empty find shows an ellipsis");
h.eq(U.stepLabel(N(V("{n}"), { from: "" }), okInfo, 0), "1  Číslovat {n} od …", "empty From shows an ellipsis");
h.eq(U.stepLabel(R({ kind: "text", text: "a\rb\u0003c" }, { replace: "x" }), okInfo, 0), "1  Nahradit a¶b↵c → x", "paragraph and soft break are shown as symbols");
var longName = "{" + new Array(60).join("x") + "}";
var lab = U.stepLabel(R(V(longName), { replace: "x" }), errInfo, 0);
h.eq(lab.length < 50, true, "a long name is shortened (length " + lab.length + ")");
h.eq(lab.substring(lab.length - 3), "  ✗", "the symbol survives the shortening");
var off = R(V("{kód}"), { replace: "ABC", active: false });
h.eq(U.stepLabel(off, errInfo, 0), "1  Nahradit {kód} → ABC", "an inactive step shows no symbol, even with a stale error");
h.eq(U.stepLabel(off, undefined, 0), "1  Nahradit {kód} → ABC", "no info is fine");
threw = false;
try { U.stepLabel({ type: "x", where: {} }, okInfo, 0); } catch (e3) { threw = true; }
h.eq(threw, true, "stepLabel throws on an unknown type");

// ======================= rows ===============================================
var states = [
    [["{kód}", "{n}"], ["{kód}", "{n}"]],
    [["ABC", "{n}"], ["ABC", "{n}"]],
    [["ABC", "001"], ["ABC", "002"]]
];
var rows = U.rows(states, 0);
h.eq(JSON.stringify(rows), JSON.stringify([
    ["1", "{kód} | {n}", "ABC | {n}", "ABC | 001"],
    ["2", "{kód} | {n}", "ABC | {n}", "ABC | 002"]
]), "rows: number, original, after the selected step, final");
rows = U.rows(states, 1);
h.eq(rows[0][2], "ABC | 001", "rows: after the second step");
h.eq(U.rows(states, -1)[0][2], "ABC | 001", "no step selected: the middle column shows the final state");
h.eq(U.rows(states, 7)[0][2], "ABC | 001", "a step out of range: the final state");
h.eq(U.rows([[["a"]]], 0)[0].join("/"), "1/a/a/a", "no steps at all: everything is the original");
h.eq(U.rows([], 0).length, 0, "no elements, no rows");
rows = U.rows([[["a\rb", "c\u0003d"]], [["x\r", "\r"]]], 0);
h.eq(rows[0][1], "a¶b | c↵d", "paragraph break shown as ¶, soft break as ↵");
h.eq(rows[0][2], "x¶ | ¶", "the same in the after column");
h.eq(U.rows([[[""]], [[""]]], 0)[0][1], "", "an empty text is an empty cell");
h.eq(U.display("a\rb\r\rc\u0003"), "a¶b¶¶c↵", "display() replaces every occurrence");
var big = [[[]]];
var bigRows = U.rows(big, 0);
h.eq(bigRows[0][1], "", "an element without texts is an empty cell");

// ======================= text(): messages =====================================
h.eq(U.text({ key: "ERR_FIND_EMPTY", args: [] }), "Zadejte, co hledat.", "plain message");
h.eq(U.text({ key: "WARN_TO_MISMATCH", args: ["24", "30"] }), "Poslední číslo vyjde 24, v poli Do je 30.", "message with two values");
h.eq(U.text({ key: "ERR_NOT_INTEGER", args: ["FIELD_FROM"] }), "Pole „Od“ musí být celé číslo.", "label key resolved");
h.eq(U.text({ key: "ERR_MIN_ONE", args: ["FIELD_REPEATS"] }), "Pole „Opakovat“ musí být alespoň 1.", "label key resolved (min one)");
h.eq(U.text({ key: "ERR_DIGITS_RANGE", args: [1, 20] }), "Číslic musí být od 1 do 20.", "numbers as arguments");
h.eq(U.text({ key: "WARN_MISSING", args: ["1"] }), "Chybí 1 prvek.", "missing: 1");
h.eq(U.text({ key: "WARN_MISSING", args: ["3"] }), "Chybí 3 prvky.", "missing: 3");
h.eq(U.text({ key: "WARN_MISSING", args: ["6"] }), "Chybí 6 prvků.", "missing: 6");
h.eq(U.text({ key: "WARN_MISSING", args: [0] }), "Chybí 0 prvků.", "missing: 0");
h.eq(U.text({ key: "WARN_EXTRA", args: ["1"] }), "Prvků je o 1 víc.", "extra: 1");
h.eq(U.text({ key: "WARN_EXTRA", args: ["6"] }), "Prvků je o 6 víc.", "extra: 6");
h.eq(U.text({ key: "NO_SUCH_KEY", args: [] }), "NO_SUCH_KEY", "an unknown key is shown as it is, never throws");
h.eq(U.text({ key: "ERR_FIND_EMPTY" }), "Zadejte, co hledat.", "args may be missing");

// ======================= status ===============================================
function chain(st, steps) { return BTE.Steps.run(st, steps); }
var five = [];
var i;
for (i = 0; i < 5; i++) { five.push(["{kód}", "{n}"]); }

// OK
var steps = [R(V("{kód}"), { replace: "ABC" }), N(V("{n}"))];
var s = U.status(chain(five, steps), steps);
h.eq(s.kind, "OK", "ok: kind");
h.eq(s.line, "✓ Změní se 5 z 5 prvků.", "ok: line");
h.eq(s.canApply, true, "ok: can apply");
h.eq(s.changed, 5, "ok: changed");
h.eq(s.messages.length, 0, "ok: no messages");

// singular and the 2-4 form of the total
s = U.status(chain([["{n}"]], [N(V("{n}"))]), [N(V("{n}"))]);
h.eq(s.line, "✓ Změní se 1 z 1 prvku.", "one of one");
s = U.status(chain([["{n}"], ["x"], ["x"]], [N(V("{n}"))]), [N(V("{n}"))]);
h.eq(s.line, "✓ Změní se 1 z 3 prvků.", "one of three");
s = U.status(chain([["{n}"], ["{n}"], ["x"], ["x"], ["x"], ["x"]], [N(V("{n}"))]), [N(V("{n}"))]);
h.eq(s.line, "✓ Změní se 2 z 6 prvků.", "two of six");

// changed counts elements whose final text differs from the original
steps = [R({ kind: "text", text: "a" }, { replace: "a" })];
s = U.status(chain([["a"], ["a"]], steps), steps);
h.eq(s.changed, 0, "a step that writes the same text changes nothing");
h.eq(s.messages.length, 0, "and has nothing to warn about");
h.eq(s.line, "⚠ Nic se nezmění.", "nothing changes: line");
h.eq(s.kind, "WARN", "nothing changes: kind");
h.eq(s.canApply, false, "nothing changes: cannot apply");

// nothing found: the step's own warning and the nothing-changes line
steps = [R(V("{zzz}"), { replace: "x" })];
s = U.status(chain(five, steps), steps);
h.eq(s.line, "⚠ Nic se nezmění.", "nothing found: line");
h.eq(s.canApply, false, "nothing found: cannot apply");
h.eq(s.messages.join("|"), "⚠ Krok 1: Nic nenašel, nic nezmění.", "nothing found: the step warning");

// WARN: Do does not match (two lines, apply stays on)
steps = [N(V("{n}"), { to: "8" })];
s = U.status(chain(five, steps), steps);
h.eq(s.kind, "WARN", "do: kind");
h.eq(s.line, "⚠ Změní se 5 z 5 prvků.", "do: line keeps the count");
h.eq(s.canApply, true, "do: apply stays on (decision 8)");
h.eq(s.messages.join("|"), "⚠ Krok 1: Poslední číslo vyjde 5, v poli Do je 8.|⚠ Krok 1: Chybí 3 prvky.", "do: both messages, plural form");
steps = [N(V("{n}"), { to: "4" })];
s = U.status(chain(five, steps), steps);
h.eq(s.messages[1], "⚠ Krok 1: Prvků je o 1 víc.", "do: extra");

// ERR
steps = [R({ kind: "text", text: "" }, { replace: "x" })];
s = U.status(chain(five, steps), steps);
h.eq(s.kind, "ERR", "err: kind");
h.eq(s.line, "✗ Nelze použít, nic se nezapíše.", "err: line");
h.eq(s.canApply, false, "err: cannot apply");
h.eq(s.messages.join("|"), "✗ Krok 1: Zadejte, co hledat.", "err: message");

// ERR names a field by its label, never by its key
steps = [R(V("{kód}"), { replace: "ABC" }), N(V("{n}"), { from: "x" })];
s = U.status(chain(five, steps), steps);
h.eq(s.messages.join("|"), "✗ Krok 2: Pole „Od“ musí být celé číslo.", "err: the step number is the position, the field is named");
steps = [N(V("{n}"), { digits: "0", repeats: "0" })];
s = U.status(chain(five, steps), steps);
h.eq(s.messages[0], "✗ Krok 1: Pole „Číslic“ musí být alespoň 1.", "err: min one names the label");
steps = [N(V("{n}"), { digits: "99" })];
s = U.status(chain(five, steps), steps);
h.eq(s.messages[0], "✗ Krok 1: Číslic musí být od 1 do 20.", "err: digits range");

// errors come before warnings, both in step order
steps = [N(V("{n}"), { to: "8" }), R({ kind: "text", text: "" }, { replace: "x" })];
s = U.status(chain(five, steps), steps);
h.eq(s.kind, "ERR", "mixed: error wins");
h.eq(s.messages[0].charAt(0), "✗", "mixed: errors first");
h.eq(s.messages[1].charAt(0), "⚠", "mixed: then warnings");
h.eq(s.messages.length, 3, "mixed: all three kept");

// an inactive step reports nothing, even if the run carries a stale error
steps = [R({ kind: "text", text: "" }, { replace: "x", active: false }), N(V("{n}"))];
s = U.status(chain(five, steps), steps);
h.eq(s.kind, "OK", "inactive step: no error");
var stale = chain(five, steps);
stale.info[0].error = { key: "ERR_FIND_EMPTY", args: [] };
stale.info[0].warns = [{ key: "WARN_NOTHING_FOUND", args: [] }];
s = U.status(stale, steps);
h.eq(s.messages.length, 0, "inactive step: a stale error or warning is ignored");
h.eq(s.canApply, true, "inactive step: apply stays on");

// no text in the range
s = U.status(chain([], [N(V("{n}"))]), [N(V("{n}"))]);
h.eq(s.kind, "ERR", "empty range: kind");
h.eq(s.canApply, false, "empty range: cannot apply");
h.eq(s.messages.join("|"), "✗ V rozsahu není žádný text.", "empty range: one message, no step noise");

// multi-match (decision 9): singular/plural of "shod", capped list
steps = [N(V("{n}"))];
s = U.status(chain([["{n}/{n}"], ["{n}"]], steps), steps);
h.eq(s.kind, "WARN", "multi: warning");
h.eq(s.canApply, true, "multi: apply stays on");
h.eq(s.messages.join("|"), "⚠ Krok 1: Prvek 1 má 2 shody {n}, dostanou stejné číslo.", "multi: two matches");
var many = [], parts = [];
for (i = 0; i < 24; i++) { parts.push("{n}"); }
many.push([parts.join(" ")]);
s = U.status(chain(many, steps), steps);
h.eq(s.messages.join("|"), "⚠ Krok 1: Prvek 1 má 24 shod {n}, dostanou stejné číslo.", "multi: 24 matches");
parts = [];
for (i = 0; i < 5; i++) { parts.push("{n}"); }
s = U.status(chain([[parts.join("")]], steps), steps);
h.eq(s.messages[0], "⚠ Krok 1: Prvek 1 má 5 shod {n}, dostanou stejné číslo.", "multi: 5 matches");
s = U.status(chain([["{n}{n}{n}"]], steps), steps);
h.eq(s.messages[0], "⚠ Krok 1: Prvek 1 má 3 shody {n}, dostanou stejné číslo.", "multi: 3 matches");
var merged = [];
for (i = 0; i < 10; i++) { merged.push(["{n}{n}"]); }
s = U.status(chain(merged, steps), steps);
h.eq(s.messages.length, 4, "multi: three elements listed, then one line for the rest");
h.eq(s.messages[3], "⚠ Krok 1: A 7 dalších prvků má víc shod.", "multi: the rest summed up");
merged = [];
for (i = 0; i < 5; i++) { merged.push(["{n}{n}"]); }
s = U.status(chain(merged, steps), steps);
h.eq(s.messages[3], "⚠ Krok 1: A 2 další prvky mají víc shod.", "multi: 2 more");
merged = [];
for (i = 0; i < 4; i++) { merged.push(["{n}{n}"]); }
s = U.status(chain(merged, steps), steps);
h.eq(s.messages[3], "⚠ Krok 1: A 1 další prvek má víc shod.", "multi: 1 more");
steps = [N({ kind: "text", text: "ab" })];
s = U.status(chain([["ab ab"]], steps), steps);
h.eq(s.messages[0], "⚠ Krok 1: Prvek 1 má 2 shody ab, dostanou stejné číslo.", "multi: a text match is named by its text");
steps = [N({ kind: "regex", text: "\\d" })];
s = U.status(chain([["1 2"]], steps), steps);
h.eq(s.messages[0], "⚠ Krok 1: Prvek 1 má 2 shody /\\d/, dostanou stejné číslo.", "multi: a regex match is named between slashes");

// skipped texts (ruling R3)
steps = [N(V("{n}"))];
var run5 = chain(five, steps);
s = U.status(run5, steps, { locked: 2, overflow: 0, linked: 1 });
h.eq(s.kind, "WARN", "skipped: warning");
h.eq(s.canApply, true, "skipped: apply stays on");
h.eq(s.line, "⚠ Změní se 5 z 5 prvků.", "skipped: line");
h.eq(s.messages.join("|"), "⚠ Přeskočeny 2 zamčené nebo skryté texty.|⚠ Přeskočen 1 navázaný rámeček.", "skipped: locked and linked, overflow of 0 is silent");
s = U.status(run5, steps, { locked: 1, overflow: 5, linked: 0 });
h.eq(s.messages.join("|"), "⚠ Přeskočen 1 zamčený nebo skrytý text.|⚠ Přeskočeno 5 přetečených textů.", "skipped: singular and 5+");
s = U.status(run5, steps, { locked: 6, overflow: 3, linked: 24 });
h.eq(s.messages.join("|"), "⚠ Přeskočeno 6 zamčených nebo skrytých textů.|⚠ Přeskočeny 3 přetečené texty.|⚠ Přeskočeno 24 navázaných rámečků.", "skipped: all three");
s = U.status(run5, steps, { locked: 0, overflow: 0, linked: 0 });
h.eq(s.kind, "OK", "skipped: zeros add nothing");
s = U.status(run5, steps, {});
h.eq(s.kind, "OK", "skipped: an empty object is fine");
s = U.status(run5, steps, undefined);
h.eq(s.kind, "OK", "skipped: omitted is fine");
s = U.status(chain(five, [R(V("{zzz}"), { replace: "x" })]), [R(V("{zzz}"), { replace: "x" })], { locked: 3 });
h.eq(s.canApply, false, "skipped: with nothing to change apply stays off");
s = U.status(chain([], steps), steps, { locked: 3 });
h.eq(s.kind, "ERR", "skipped: an empty range is still an error");
h.eq(s.messages.join("|"), "✗ V rozsahu není žádný text.|⚠ Přeskočeny 3 zamčené nebo skryté texty.", "skipped: and says why the range is empty");

// ---- the user never sees a raw key or an unfilled slot ----------------------
var allMessages = [];
function collect(st, stps, sk) {
    var q = U.status(chain(st, stps), stps, sk), j;
    for (j = 0; j < q.messages.length; j++) { allMessages.push(q.messages[j]); }
    allMessages.push(q.line);
}
collect(five, [N(V("{n}"), { from: "x" })]);
collect(five, [N(V("{n}"), { step: "1,5" })]);
collect(five, [N(V("{n}"), { to: "x" })]);
collect(five, [N(V("{n}"), { digits: "0" })]);
collect(five, [N(V("{n}"), { repeats: "0" })]);
collect(five, [N(V("{n}"), { reset: "x" })]);
collect(five, [N(V("{n}"), { digits: "99" })]);
collect(five, [N(V("{n}"), { format: "A", from: "0" })]);
collect(five, [N(V("{n}"), { from: "9007199254740991", step: "9007199254740991" })]);
collect(five, [N(V("{n}"), { to: "9" })]);
collect(five, [R({ kind: "text", text: "" })]);
collect(five, [R({ kind: "regex", text: "(" })]);
collect(five, [R({ kind: "regex", text: "(?<=a)b" })]);
collect(five, [R({ kind: "auto", text: "" })]);
collect(five, [R(V("{zzz}"))]);
collect([["{n}{n}"]], [N(V("{n}"))], { locked: 1, overflow: 2, linked: 3 });
collect([], [N(V("{n}"))]);
var leaked = [];
for (i = 0; i < allMessages.length; i++) {
    if (/[A-Z]+_[A-Z_]+/.test(allMessages[i]) || allMessages[i].indexOf("%s") !== -1 || allMessages[i].indexOf("undefined") !== -1) {
        leaked.push(allMessages[i]);
    }
}
h.eq(allMessages.length > 25, true, "the leak check covered " + allMessages.length + " lines");
h.eq(leaked.join(" | "), "", "no raw key, no unfilled %s, no undefined in any message");

// ---- cursor in text (spec 4.1): the empty range says why ----------------------
steps = [N(V("{n}"))];
s = U.status(chain([], steps), steps, { locked: 0, overflow: 0, linked: 0 }, true);
h.eq(s.kind, "ERR", "cursor: error");
h.eq(s.canApply, false, "cursor: Použít off");
h.eq(s.messages.join("|"), "✗ Kurzor je v textu. Ukončete úpravu textu klávesou Esc a vyberte prvky, nebo zvolte jiný rozsah.", "cursor: the message replaces 'no text'");
s = U.status(chain([], steps), steps, undefined, false);
h.eq(s.messages.join("|"), "✗ V rozsahu není žádný text.", "cursor false: no text as before");
s = U.status(chain(five, steps), steps, undefined, true);
h.eq(s.kind, "OK", "cursor flag with texts in the range changes nothing");

// ---- failedStatus: a preview that threw -----------------------------------------
s = U.failedStatus("BTE.Steps: unknown step type \"x\"");
h.eq(s.kind, "ERR", "failed: error");
h.eq(s.canApply, false, "failed: Použít off");
h.eq(s.changed, 0, "failed: nothing changes");
h.eq(s.line, "✗ Nelze použít, nic se nezapíše.", "failed: the error line");
h.eq(s.messages.join("|"), "✗ Náhled se nepodařilo spočítat (BTE.Steps: unknown step type \"x\"). Pošlete tuto hlášku správci skriptu.", "failed: says what failed");
s = U.failedStatus("x is undefined", "ERR_HANDLER");
h.eq(s.messages.join("|"), "✗ Dialog narazil na chybu (x is undefined). Nic se nezapsalo; pošlete tuto hlášku správci skriptu.", "failed in a handler: its own message");
h.eq(s.canApply, false, "failed in a handler: Použít off");
h.eq(U.failedStatus("y", "NOPE").messages[0].indexOf("Náhled") !== -1, true, "an unknown key falls back to the preview message");

// ---- scopeLine: what the range holds ----------------------------------------------
function prep(elements, texts, skipped, cursor) {
    var els = [], q;
    for (q = 0; q < elements; q++) { els.push({}); }
    return { elements: els, textCount: texts, skipped: skipped || { locked: 0, overflow: 0, linked: 0 }, cursorInText: !!cursor };
}
h.eq(U.scopeLine(prep(240, 480)), "240 prvků, 480 textů", "scope: 240 / 480");
h.eq(U.scopeLine(prep(1, 1)), "1 prvek, 1 text", "scope: one / one");
h.eq(U.scopeLine(prep(3, 2)), "3 prvky, 2 texty", "scope: 2-4 forms");
h.eq(U.scopeLine(prep(0, 0)), "0 prvků, 0 textů", "scope: empty");
h.eq(U.scopeLine(prep(240, 478, { locked: 2, overflow: 0, linked: 0 })), "240 prvků, 478 textů · přeskočené texty: 2", "scope: skipped total");
h.eq(U.scopeLine(prep(5, 5, { locked: 1, overflow: 2, linked: 3 })), "5 prvků, 5 textů · přeskočené texty: 6", "scope: all reasons summed");
h.eq(U.scopeLine(prep(0, 0, undefined, true)), "Kurzor je v textu, prvky se z výběru nečtou.", "scope: cursor in text");
h.eq(U.scopeLine({ elements: [], textCount: 0, skipped: {}, cursorInText: false }), "0 prvků, 0 textů", "scope: an empty skipped object");

// ======================= English ==============================================
var BTE_EN = loadBTE("en_US");
var UE = BTE_EN.UIModel;
var enSteps = [N(V("{n}"))];
var enS = UE.status(BTE_EN.Steps.run([["{n}"]], enSteps), enSteps);
h.eq(enS.line, "✓ 1 of 1 element will change.", "en: one of one");
enS = UE.status(BTE_EN.Steps.run([["{n}"], ["{n}"], ["x"]], enSteps), enSteps);
h.eq(enS.line, "✓ 2 of 3 elements will change.", "en: plural");
enSteps = [N(V("{n}"), { to: "8" })];
enS = UE.status(BTE_EN.Steps.run([["{n}"], ["{n}"], ["{n}"], ["{n}"], ["{n}"]], enSteps), enSteps);
h.eq(enS.messages.join("|"), "⚠ Step 1: The last number comes out as 5, the To field says 8.|⚠ Step 1: 3 elements missing.", "en: do check");
enSteps = [N(V("{n}"), { to: "1" })];
enS = UE.status(BTE_EN.Steps.run([["{n}"], ["{n}"]], enSteps), enSteps);
h.eq(enS.messages[1], "⚠ Step 1: 1 element too many.", "en: extra, singular");
enS = UE.status(BTE_EN.Steps.run([["{n}"]], [N({ kind: "text", text: "" })]), [N({ kind: "text", text: "" })]);
h.eq(enS.line, "✗ Cannot apply, nothing will be written.", "en: error line");
h.eq(enS.messages[0], "✗ Step 1: Enter what to look for.", "en: error message");
enSteps = [N(V("{n}"), { from: "x" })];
enS = UE.status(BTE_EN.Steps.run([["{n}"]], enSteps), enSteps);
h.eq(enS.messages[0], "✗ Step 1: The field \"From\" must be a whole number.", "en: label resolved");
h.eq(UE.whereItems(N(V("{n}")), []).items[0].label, "{n}  (not found)", "en: not found");
h.eq(UE.stepLabel(N(V("{n}")), undefined, 1), "2  Number {n} from 1", "en: step label");
h.done();
