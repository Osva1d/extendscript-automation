var h = require("./lib/harness");
var BTE = h.load(["src/lib/utils.js", "src/vars.js", "src/steps.js"], ["numbers"]);
var S = BTE.Steps;

// Every expected value in the tables below was measured in Illustrator, not
// derived: tests/probes/probe_case.jsx writes each input into a point text,
// applies changeCaseTo and reads the text back. caseText is the preview's
// emulation of that and has to give the same string for every pair.

// [input, UPPERCASE, LOWERCASE, TITLECASE, SENTENCECASE], read back from `tf.contents` after
// `tf.textRange.changeCaseTo(...)` on a fresh point text (Illustrator 30.8.2, probe_case.jsx).
// The brief's set: Czech text, an abbreviation, a variable.
var BRIEF = [
    ["čau světe", "ČAU SVĚTE", "čau světe", "Čau Světe", "Čau světe"],
    ["ČAU SVĚTE", "ČAU SVĚTE", "čau světe", "Čau Světe", "Čau světe"],
    ["žluťoučký kůň-úpěl", "ŽLUŤOUČKÝ KŮŇ-ÚPĚL", "žluťoučký kůň-úpěl", "Žluťoučký Kůň-Úpěl", "Žluťoučký kůň-úpěl"],
    ["a. b. c", "A. B. C", "a. b. c", "A. B. C", "A. b. c"],
    ["ŘEDITEL ŠKOLY. DRUHÁ VĚTA", "ŘEDITEL ŠKOLY. DRUHÁ VĚTA", "ředitel školy. druhá věta", "Ředitel Školy. Druhá Věta", "Ředitel školy. Druhá věta"],
    ["{kód} ABC", "{KÓD} ABC", "{kód} abc", "{Kód} Abc", "{Kód} abc"]
];

// Beyond the brief: characters whose mapping is not one-to-one, apostrophes and digits.
var EXTRA = [
    ["straße", "STRASSE", "straße", "Straße", "Straße"],
    ["ǆ ǅ Ǆ", "Ǆ Ǆ Ǆ", "ǆ ǆ ǆ", "ǅ ǅ ǅ", "ǅ ǆ ǆ"],
    ["o'neil don't", "O'NEIL DON'T", "o'neil don't", "O'neil Don't", "O'neil don't"],
    ["x1y2 3abc", "X1Y2 3ABC", "x1y2 3abc", "X1y2 3abc", "X1y2 3abc"],
    ["a.b. c", "A.B. C", "a.b. c", "A.b. C", "A.b. c"],
    ["hello  world", "HELLO  WORLD", "hello  world", "Hello  World", "Hello  world"],
    ["Ahoj! jak se máš? dobře", "AHOJ! JAK SE MÁŠ? DOBŘE", "ahoj! jak se máš? dobře", "Ahoj! Jak Se Máš? Dobře", "Ahoj! Jak se máš? Dobře"],
    ["ŠKOLA\rdruhý odstavec. třetí", "ŠKOLA\rDRUHÝ ODSTAVEC. TŘETÍ", "škola\rdruhý odstavec. třetí", "Škola\rDruhý Odstavec. Třetí", "Škola\rDruhý odstavec. třetí"],
    ["a_b-c/d", "A_B-C/D", "a_b-c/d", "A_b-C/D", "A_b-c/d"],
    ["(abc) \"def\" ghi", "(ABC) \"DEF\" GHI", "(abc) \"def\" ghi", "(Abc) \"Def\" Ghi", "(Abc) \"def\" ghi"],
    ["ǉudi ﬁlm", "ǇUDI FILM", "ǉudi ﬁlm", "ǈudi Film", "ǈudi ﬁlm"],
    ["  úvod", "  ÚVOD", "  úvod", "  Úvod", "  Úvod"],
    ["i\u0307 İ ı", "I\u0307 İ I", "i\u0307 i\u0307 ı", "I\u0307 İ I", "I\u0307 i\u0307 ı"],
    ["ÁÉÍÓÚ áéíóú", "ÁÉÍÓÚ ÁÉÍÓÚ", "áéíóú áéíóú", "Áéíóú Áéíóú", "Áéíóú áéíóú"]
];

// Where the engine puts sentence and word boundaries.
var EDGE = [
    ["škola. druhá věta", "ŠKOLA. DRUHÁ VĚTA", "škola. druhá věta", "Škola. Druhá Věta", "Škola. druhá věta"],
    ["škola. Druhá věta", "ŠKOLA. DRUHÁ VĚTA", "škola. druhá věta", "Škola. Druhá Věta", "Škola. Druhá věta"],
    ["ŠKOLA.DRUHÁ", "ŠKOLA.DRUHÁ", "škola.druhá", "Škola.druhá", "Škola.druhá"],
    ["škola.druhá", "ŠKOLA.DRUHÁ", "škola.druhá", "Škola.druhá", "Škola.druhá"],
    ["škola.Druhá", "ŠKOLA.DRUHÁ", "škola.druhá", "Škola.druhá", "Škola.druhá"],
    ["škola.  druhá", "ŠKOLA.  DRUHÁ", "škola.  druhá", "Škola.  Druhá", "Škola.  druhá"],
    ["škola. 1 druhá", "ŠKOLA. 1 DRUHÁ", "škola. 1 druhá", "Škola. 1 Druhá", "Škola. 1 druhá"],
    ["škola. (druhá)", "ŠKOLA. (DRUHÁ)", "škola. (druhá)", "Škola. (Druhá)", "Škola. (druhá)"],
    ["škola. \"Druhá\"", "ŠKOLA. \"DRUHÁ\"", "škola. \"druhá\"", "Škola. \"Druhá\"", "Škola. \"Druhá\""],
    ["škola! druhá", "ŠKOLA! DRUHÁ", "škola! druhá", "Škola! Druhá", "Škola! Druhá"],
    ["škola? druhá", "ŠKOLA? DRUHÁ", "škola? druhá", "Škola? Druhá", "Škola? Druhá"],
    ["škola… druhá", "ŠKOLA… DRUHÁ", "škola… druhá", "Škola… Druhá", "Škola… druhá"],
    ["škola.\rdruhá", "ŠKOLA.\rDRUHÁ", "škola.\rdruhá", "Škola.\rDruhá", "Škola.\rDruhá"],
    ["škola.\r\rdruhá", "ŠKOLA.\r\rDRUHÁ", "škola.\r\rdruhá", "Škola.\r\rDruhá", "Škola.\r\rDruhá"],
    ["a! b? c", "A! B? C", "a! b? c", "A! B? C", "A! B? C"],
    ["3abc def", "3ABC DEF", "3abc def", "3abc Def", "3abc def"],
    ["123 abc", "123 ABC", "123 abc", "123 Abc", "123 abc"],
    ["1. abc", "1. ABC", "1. abc", "1. Abc", "1. abc"],
    ["škola.\u00a0druhá", "ŠKOLA.\u00a0DRUHÁ", "škola.\u00a0druhá", "Škola.\u00a0Druhá", "Škola.\u00a0druhá"],
    ["škola.\u00a0Druhá", "ŠKOLA.\u00a0DRUHÁ", "škola.\u00a0druhá", "Škola.\u00a0Druhá", "Škola.\u00a0Druhá"],
    ["a. B. c", "A. B. C", "a. b. c", "A. B. C", "A. B. c"],
    ["„ahoj“ svět", "„AHOJ“ SVĚT", "„ahoj“ svět", "„Ahoj“ Svět", "„Ahoj“ svět"],
    ["ahoj. „druhá“", "AHOJ. „DRUHÁ“", "ahoj. „druhá“", "Ahoj. „Druhá“", "Ahoj. „druhá“"],
    ["ahoj. „Druhá“", "AHOJ. „DRUHÁ“", "ahoj. „druhá“", "Ahoj. „Druhá“", "Ahoj. „Druhá“"],
    ["tel. 123", "TEL. 123", "tel. 123", "Tel. 123", "Tel. 123"],
    ["e.g. abc", "E.G. ABC", "e.g. abc", "E.g. Abc", "E.g. abc"],
    ["Dr. novák", "DR. NOVÁK", "dr. novák", "Dr. Novák", "Dr. novák"],
    ["a:b c:d", "A:B C:D", "a:b c:d", "A:b C:d", "A:b c:d"],
    ["1,5 a,b", "1,5 A,B", "1,5 a,b", "1,5 A,B", "1,5 a,b"],
    ["don’t stop", "DON’T STOP", "don’t stop", "Don’t Stop", "Don’t stop"],
    ["1.5x 2nd", "1.5X 2ND", "1.5x 2nd", "1.5x 2nd", "1.5x 2nd"],
    ["a1 b2c _x __y", "A1 B2C _X __Y", "a1 b2c _x __y", "A1 B2c _X __Y", "A1 b2c _x __y"],
    ["ab–cd", "AB–CD", "ab–cd", "Ab–Cd", "Ab–cd"],
    ["ab\u2011cd", "AB\u2011CD", "ab\u2011cd", "Ab\u2011Cd", "Ab\u2011cd"],
    ["kód\u00a0abc", "KÓD\u00a0ABC", "kód\u00a0abc", "Kód\u00a0Abc", "Kód\u00a0abc"],
    ["x+y=z", "X+Y=Z", "x+y=z", "X+Y=Z", "X+y=z"],
    ["ab@cd.cz www.example.cz", "AB@CD.CZ WWW.EXAMPLE.CZ", "ab@cd.cz www.example.cz", "Ab@Cd.cz Www.example.cz", "Ab@cd.cz www.example.cz"],
    ["3D tisk", "3D TISK", "3d tisk", "3d Tisk", "3d tisk"],
    ["A4 formát", "A4 FORMÁT", "a4 formát", "A4 Formát", "A4 formát"],
    ["i7 cpu", "I7 CPU", "i7 cpu", "I7 Cpu", "I7 cpu"],
    ["ŘEDITEL-ŠKOLY", "ŘEDITEL-ŠKOLY", "ředitel-školy", "Ředitel-Školy", "Ředitel-školy"],
    ["{kód}-{název} {x_y}", "{KÓD}-{NÁZEV} {X_Y}", "{kód}-{název} {x_y}", "{Kód}-{Název} {X_y}", "{Kód}-{název} {x_y}"],
    ["\tabc\tdef", "\tABC\tDEF", "\tabc\tdef", "\tAbc\tDef", "\tAbc\tdef"],
    ["a\rb", "A\rB", "a\rb", "A\rB", "A\rB"],
    ["", "", "", "", ""],
    ["ÓČ", "ÓČ", "óč", "Óč", "Óč"],
    ["ABC DEF. ghi", "ABC DEF. GHI", "abc def. ghi", "Abc Def. Ghi", "Abc def. ghi"]
];

// The rules behind those boundaries: terminators with their exceptions, what joins a word.
var EDGE2 = [
    ["škola.. druhá", "ŠKOLA.. DRUHÁ", "škola.. druhá", "Škola.. Druhá", "Škola.. druhá"],
    ["škola.. Druhá", "ŠKOLA.. DRUHÁ", "škola.. druhá", "Škola.. Druhá", "Škola.. Druhá"],
    ["škola. - druhá", "ŠKOLA. - DRUHÁ", "škola. - druhá", "Škola. - Druhá", "Škola. - druhá"],
    ["škola. , Druhá", "ŠKOLA. , DRUHÁ", "škola. , druhá", "Škola. , Druhá", "Škola. , druhá"],
    ["3.14 abc", "3.14 ABC", "3.14 abc", "3.14 Abc", "3.14 abc"],
    ["cena 3.14. další věta", "CENA 3.14. DALŠÍ VĚTA", "cena 3.14. další věta", "Cena 3.14. Další Věta", "Cena 3.14. další věta"],
    ["cena 3.14. Další věta", "CENA 3.14. DALŠÍ VĚTA", "cena 3.14. další věta", "Cena 3.14. Další Věta", "Cena 3.14. Další věta"],
    ["ŠKOLA?! DRUHÁ", "ŠKOLA?! DRUHÁ", "škola?! druhá", "Škola?! Druhá", "Škola?! Druhá"],
    ["škola?! druhá", "ŠKOLA?! DRUHÁ", "škola?! druhá", "Škola?! Druhá", "Škola?! Druhá"],
    ["škola.) druhá", "ŠKOLA.) DRUHÁ", "škola.) druhá", "Škola.) Druhá", "Škola.) druhá"],
    ["(škola.) Druhá", "(ŠKOLA.) DRUHÁ", "(škola.) druhá", "(Škola.) Druhá", "(Škola.) Druhá"],
    ["(škola.) druhá", "(ŠKOLA.) DRUHÁ", "(škola.) druhá", "(Škola.) Druhá", "(Škola.) druhá"],
    ["škola.\" druhá", "ŠKOLA.\" DRUHÁ", "škola.\" druhá", "Škola.\" Druhá", "Škola.\" druhá"],
    ["škola.\" Druhá", "ŠKOLA.\" DRUHÁ", "škola.\" druhá", "Škola.\" Druhá", "Škola.\" Druhá"],
    ["škola. a Druhá", "ŠKOLA. A DRUHÁ", "škola. a druhá", "Škola. A Druhá", "Škola. a druhá"],
    ["škola.\u0003Druhá", "ŠKOLA.\u0003DRUHÁ", "škola.\u0003druhá", "Škola.\u0003Druhá", "Škola.\u0003Druhá"],
    ["škola.\u0003druhá", "ŠKOLA.\u0003DRUHÁ", "škola.\u0003druhá", "Škola.\u0003Druhá", "Škola.\u0003druhá"],
    ["A.B. Smith", "A.B. SMITH", "a.b. smith", "A.b. Smith", "A.b. Smith"],
    ["U.S. firma", "U.S. FIRMA", "u.s. firma", "U.s. Firma", "U.s. firma"],
    ["p. 12", "P. 12", "p. 12", "P. 12", "P. 12"],
    ["škola! a druhá", "ŠKOLA! A DRUHÁ", "škola! a druhá", "Škola! A Druhá", "Škola! A druhá"],
    ["ab'cd 'ef' gh", "AB'CD 'EF' GH", "ab'cd 'ef' gh", "Ab'cd 'Ef' Gh", "Ab'cd 'ef' gh"],
    ["l'été", "L'ÉTÉ", "l'été", "L'été", "L'été"],
    ["a-b-c", "A-B-C", "a-b-c", "A-B-C", "A-b-c"],
    ["a/b", "A/B", "a/b", "A/B", "A/b"],
    ["(a)(b)", "(A)(B)", "(a)(b)", "(A)(B)", "(A)(b)"],
    ["ab\u00adcd", "AB\u00adCD", "ab\u00adcd", "Ab\u00adcd", "Ab\u00adcd"],
    ["ab_cd_ef", "AB_CD_EF", "ab_cd_ef", "Ab_cd_ef", "Ab_cd_ef"],
    ["a__b", "A__B", "a__b", "A__b", "A__b"],
    ["1_a", "1_A", "1_a", "1_a", "1_a"],
    ["a_1", "A_1", "a_1", "A_1", "A_1"],
    ["1a_b2", "1A_B2", "1a_b2", "1a_b2", "1a_b2"],
    ["x.1", "X.1", "x.1", "X.1", "X.1"],
    ["1.x", "1.X", "1.x", "1.X", "1.x"],
    ["a.1b", "A.1B", "a.1b", "A.1b", "A.1b"],
    ["ab.cd.ef", "AB.CD.EF", "ab.cd.ef", "Ab.cd.ef", "Ab.cd.ef"],
    ["a:1", "A:1", "a:1", "A:1", "A:1"],
    ["1:a", "1:A", "1:a", "1:A", "1:a"],
    ["1,a", "1,A", "1,a", "1,A", "1,a"],
    ["a,1", "A,1", "a,1", "A,1", "A,1"],
    ["1'2", "1'2", "1'2", "1'2", "1'2"],
    ["a'1", "A'1", "a'1", "A'1", "A'1"]
];

// [text, start, length, UPPERCASE, LOWERCASE, TITLECASE, SENTENCECASE]: the engine changed only
// the range text.characters[start] with .length = length, and the whole text was read back.
var RANGES = [
    ["abc def ghi", 4, 3, "abc DEF ghi", "abc def ghi", "abc Def ghi", "abc Def ghi"],
    ["ABC DEF GHI", 4, 3, "ABC DEF GHI", "ABC def GHI", "ABC Def GHI", "ABC Def GHI"],
    ["abcdef", 2, 2, "abCDef", "abcdef", "abCdef", "abCdef"],
    ["ABCDEF", 2, 2, "ABCDEF", "ABcdEF", "ABCdEF", "ABCdEF"],
    ["{kód} ABC", 0, 5, "{KÓD} ABC", "{kód} ABC", "{Kód} ABC", "{Kód} ABC"],
    ["{KÓD} abc", 0, 5, "{KÓD} abc", "{kód} abc", "{Kód} abc", "{Kód} abc"],
    ["abc. def ghi", 5, 7, "abc. DEF GHI", "abc. def ghi", "abc. Def Ghi", "abc. Def ghi"],
    ["ABC. DEF GHI", 5, 7, "ABC. DEF GHI", "ABC. def ghi", "ABC. Def Ghi", "ABC. Def ghi"],
    ["x {kód}-ab cd", 2, 5, "x {KÓD}-ab cd", "x {kód}-ab cd", "x {Kód}-ab cd", "x {Kód}-ab cd"]
];

var MODES = ["upper", "lower", "title", "sentence"];

function checkRows(label, rows) {
    var i, m, row;
    for (i = 0; i < rows.length; i++) {
        row = rows[i];
        for (m = 0; m < MODES.length; m++) {
            h.eq(S.caseText(MODES[m], row[0]), row[1 + m], label + " " + MODES[m] + " " + JSON.stringify(row[0]));
        }
    }
}
checkRows("brief", BRIEF);
checkRows("extra", EXTRA);
checkRows("edge", EDGE);
checkRows("edge2", EDGE2);

// changeCaseTo on a range treats the range as a text of its own: the emulation
// of the matched text alone, put back between the untouched rest, is what the
// engine produced. This is why caseText takes the match and no context.
(function () {
    var i, m, r, built;
    for (i = 0; i < RANGES.length; i++) {
        r = RANGES[i];
        for (m = 0; m < MODES.length; m++) {
            built = r[0].substring(0, r[1]) + S.caseText(MODES[m], r[0].substring(r[1], r[1] + r[2])) + r[0].substring(r[1] + r[2]);
            h.eq(built, r[3 + m], "range " + MODES[m] + " " + JSON.stringify(r[0]) + " [" + r[1] + "," + r[2] + "]");
        }
    }
})();

// An unknown mode is a bug in the caller: it throws, it does not pass the text on.
function threw(fn) {
    try { fn(); } catch (e) { return String(e.message); }
    return null;
}
h.eq(threw(function () { S.caseText("shout", "abc"); }) !== null, true, "caseText throws on an unknown mode");
h.eq(threw(function () { S.caseText(undefined, "abc"); }) !== null, true, "caseText throws on a missing mode");
h.eq(threw(function () { S.caseText("upper", "abc"); }), null, "a known mode does not throw");
h.eq(S.caseText("upper", ""), "", "empty text stays empty");
h.eq(JSON.stringify(S.CASE_MAP),
    '{"upper":"UPPERCASE","lower":"LOWERCASE","title":"TITLECASE","sentence":"SENTENCECASE"}',
    "CASE_MAP names the CaseChangeType members the write uses");

// ======================= the step ============================================
function C(where, mode, extra) {
    var s = { type: "case", active: true, where: where, mode: mode };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function V(name) { return { kind: "var", text: name }; }
var ALL = { kind: "all", text: "" };
function one(text, step) { return S.run([[text]], [step]); }

// the brief: a variable, upper, only that range is in the edit
var r = one("{kód} x", C(V("{kód}"), "upper"));
h.eq(r.states[1][0][0], "{KÓD} x", "variable to upper");
h.eq(JSON.stringify(r.info[0].edits), '[{"el":0,"tx":0,"start":0,"length":5,"text":"{KÓD}","caseMode":"upper"}]',
    "the edit covers the variable only and carries the result and the mode");
h.eq(r.info[0].hits, 1, "one element hit");
h.eq(r.info[0].error, null, "no error");
h.eq(r.info[0].warns.length, 0, "no warning");
h.eq(one("{kód} abc", C(V("{kód}"), "title")).states[1][0][0], "{Kód} abc", "variable to title");
h.eq(one("{kód} ABC", C(V("{kód}"), "sentence")).states[1][0][0], "{Kód} ABC", "variable to sentence");
h.eq(one("{KÓD} ABC", C(V("{KÓD}"), "lower")).states[1][0][0], "{kód} ABC", "variable to lower");

// several matches, several texts, positions per text, elements untouched stay as they are
var multi = S.run([["{kód} a {kód}", "b {kód}"], ["x"]], [C(V("{kód}"), "upper")]);
h.eq(JSON.stringify(multi.states[1]), '[["{KÓD} a {KÓD}","b {KÓD}"],["x"]]', "every match in every text");
h.eq(JSON.stringify(multi.info[0].edits.slice(0, 3)),
    '[{"el":0,"tx":0,"start":0,"length":5,"text":"{KÓD}","caseMode":"upper"},{"el":0,"tx":0,"start":8,"length":5,"text":"{KÓD}","caseMode":"upper"},{"el":0,"tx":1,"start":2,"length":5,"text":"{KÓD}","caseMode":"upper"}]',
    "edits ordered by element, text, position");
h.eq(multi.info[0].hits, 1, "two texts with matches in one element count once");
h.eq(multi.info[0].multi.length, 0, "case reports no multi-match elements");

// Kde: Celý text is the whole text of every text of the element
var all = S.run([["abc", "dEf"], ["", "\r", "   "], ["ghi"]], [C(ALL, "upper")]);
h.eq(JSON.stringify(all.states[1]), '[["ABC","DEF"],["","\\r","   "],["GHI"]]', "whole text of every text");
h.eq(all.info[0].hits, 2, "elements with a non-blank text");
h.eq(JSON.stringify(all.info[0].edits.slice(0, 2)),
    '[{"el":0,"tx":0,"start":0,"length":3,"text":"ABC","caseMode":"upper"},{"el":0,"tx":1,"start":0,"length":3,"text":"DEF","caseMode":"upper"}]',
    "one edit over each whole text");
h.eq(all.info[0].edits.length, 3, "empty, paragraph-only and blank texts get no edit");
h.eq(JSON.stringify(one("ředitel školy. druhá věta", C(ALL, "sentence")).states[1][0]), '["Ředitel školy. druhá věta"]', "whole text, sentence");
h.eq(one("ŠKOLA\rdruhý", C(ALL, "title")).states[1][0][0], "Škola\rDruhý", "whole text over a paragraph break");
// Review Focus: empty and paragraph-only texts
var empty = S.run([[""], ["\r"], ["   "]], [C(ALL, "upper")]);
h.eq(empty.info[0].edits.length, 0, "empty texts: no edit");
h.eq(empty.info[0].hits, 0, "empty texts: no hit");
h.eq(empty.info[0].warns[0].key, "WARN_NOTHING_FOUND", "empty texts: nothing found is said");
h.eq(JSON.stringify(empty.states[1]), '[[""],["\\r"],["   "]]', "empty texts: unchanged");
h.eq(one("x", C(ALL, "upper", { where: { kind: "all", text: "ignored" } })).states[1][0][0], "X", "Celý text ignores the text field");

// Kde: Jiný text is literal and case-sensitive (spec 5.2), there is no matchCase on this step
var txt = one("Abc abc ABC a.c", C({ kind: "text", text: "abc" }, "upper"));
h.eq(txt.states[1][0][0], "Abc ABC ABC a.c", "text kind is case-sensitive");
h.eq(txt.info[0].edits.length, 1, "text kind: one match");
h.eq(one("abc a.c", C({ kind: "text", text: "a.c" }, "upper")).states[1][0][0], "abc A.C", "text kind is literal");
h.eq(one("Abc abc", C({ kind: "text", text: "abc" }, "upper", { matchCase: false })).states[1][0][0], "Abc ABC", "a stray matchCase field does nothing");

// Kde: Regulární výraz
var rx = one("AB1 CD2 ef3 Gh4", C({ kind: "regex", text: "[A-Z]+[0-9]" }, "lower"));
h.eq(rx.states[1][0][0], "ab1 cd2 ef3 Gh4", "regex matches, case-sensitive");
h.eq(rx.info[0].edits.length, 2, "regex: two matches");
h.eq(one("ab\rcd", C({ kind: "regex", text: "^c" }, "upper")).info[0].edits.length, 0, "regex has no m flag: ^ is the start of the whole text");
h.eq(one("ab", C({ kind: "regex", text: "x*" }, "upper")).info[0].edits.length, 0, "empty regex matches are skipped");
h.eq(one("x", C({ kind: "regex", text: "(?<=a)x" }, "upper")).info[0].error.key, "ERR_LOOKBEHIND", "lookbehind rejected");
h.eq(one("x", C({ kind: "regex", text: "(" }, "upper")).info[0].error.key, "ERR_BAD_REGEX", "bad regex");

// errors and warnings, as for the other steps
h.eq(one("x", C({ kind: "text", text: "" }, "upper")).info[0].error.key, "ERR_FIND_EMPTY", "empty text field");
h.eq(one("x", C({ kind: "var", text: "" }, "upper")).info[0].error.key, "ERR_FIND_EMPTY", "empty variable");
h.eq(one("1", C({ kind: "first", text: "" }, "upper")).info[0].error.key, "ERR_FIND_EMPTY", "First number is not a position of this step");
h.eq(one("1", C({ kind: "auto", text: "" }, "upper")).info[0].error.key, "ERR_FIND_EMPTY", "an unresolved auto is an error, not a silent no-op");
h.eq(one("x", C(V("{q}"), "upper")).info[0].warns[0].key, "WARN_NOTHING_FOUND", "variable not in the text: nothing found");
h.eq(one("x", C(V("{q}"), "upper")).states[1][0][0], "x", "nothing found: text unchanged");
var failed = one("abc", C({ kind: "text", text: "" }, "upper"));
h.eq(failed.states[1][0][0], "abc", "a failed step passes its input on");
h.eq(failed.info[0].edits.length, 0, "a failed step has no edits");

// an unknown or missing mode is a bug in the caller: loud, not a quiet no-op
h.eq(threw(function () { one("abc", C(ALL, "shout")); }) !== null, true, "unknown mode throws in run");
h.eq(threw(function () { one("abc", C(ALL, undefined)); }) !== null, true, "missing mode throws in run");
var offBad = C(ALL, "shout"); offBad.active = false;
h.eq(threw(function () { one("abc", offBad); }), null, "an inactive step is not run, so its mode is not looked at");

// an inactive step copies its input
var off = C(V("{kód}"), "upper"); off.active = false;
h.eq(one("{kód}", off).states[1][0][0], "{kód}", "inactive step copies input");
h.eq(one("{kód}", off).info[0].edits.length, 0, "inactive step has no edits");

// the input is never changed
var input = [["{kód} a"], ["b"]];
var before = JSON.stringify(input);
S.run(input, [C(V("{kód}"), "upper"), C(ALL, "title")]);
h.eq(JSON.stringify(input), before, "the input state is not modified");

// characters whose uppercase is longer: the edit keeps the original length, the text is longer
var sz = one("aß ßb", C({ kind: "text", text: "ß" }, "upper"));
h.eq(sz.states[1][0][0], "aSS SSb", "one letter becomes two");
h.eq(JSON.stringify(sz.info[0].edits.slice(0, 2)),
    '[{"el":0,"tx":0,"start":1,"length":1,"text":"SS","caseMode":"upper"},{"el":0,"tx":0,"start":3,"length":1,"text":"SS","caseMode":"upper"}]',
    "positions refer to the input, not to the longer output");
h.eq(one("straße ß", C(ALL, "upper")).states[1][0][0], "STRASSE SS", "whole text with a growing letter");

// chains: the next step works on the output of the one before
var chain = S.run([["abc {n}"]], [
    { type: "replace", active: true, where: V("{n}"), replace: "x y", matchCase: false, firstOnly: false },
    C(ALL, "title")
]);
h.eq(chain.states[2][0][0], "Abc X Y", "case after replace");
h.eq(JSON.stringify(chain.info[1].vars), "[]", "the case step sees the variables of its own input");
var chain2 = S.run([["{kód} {n}"]], [C(V("{kód}"), "upper"), C(V("{KÓD}"), "lower")]);
h.eq(chain2.states[1][0][0], "{KÓD} {n}", "step one output");
h.eq(chain2.states[2][0][0], "{kód} {n}", "step two finds the variable step one wrote");
h.eq(chain2.info[1].vars[0].name, "{KÓD}", "step two lists the variables of step one's output");
h.eq(JSON.stringify(chain2.info[1].edits), '[{"el":0,"tx":0,"start":0,"length":5,"text":"{kód}","caseMode":"lower"}]', "edits of step two relative to its input");
var chain3 = S.run([["ab"]], [C(ALL, "upper"), { type: "replace", active: true, where: { kind: "text", text: "AB" }, replace: "-", matchCase: true, firstOnly: false }]);
h.eq(chain3.states[2][0][0], "-", "replace after case sees the new case");

// ======================= applyEdits is loud about a broken edit list ========
function E(start, length, text, extra) {
    var e = { el: 0, tx: 0, start: start, length: length, text: text };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { e[k] = extra[k]; } }
    return e;
}
function apply(state, edits) { return JSON.stringify(S.applyEdits(state, edits)); }
h.eq(apply([["abcdef"]], [E(0, 2, "X"), E(3, 1, "YY")]), '[["XcYYef"]]', "ordered edits are applied");
h.eq(apply([["abc"]], [E(1, 1, "")]), '[["ac"]]', "an empty text deletes the range");
h.eq(apply([["abc"]], [E(1, 0, "-")]), '[["a-bc"]]', "a zero-length edit inserts");
h.eq(apply([["abc"]], [E(0, 3, "ABC", { caseMode: "upper" })]), '[["ABC"]]', "a case edit with its result is applied like any edit");
h.eq(apply([["abc"]], []), '[["abc"]]', "no edits: a copy");
h.eq(apply([["ab", "cd"], ["ef"]], [{ el: 0, tx: 1, start: 0, length: 1, text: "X" }, { el: 1, tx: 0, start: 1, length: 1, text: "Y" }]), '[["ab","Xd"],["eY"]]', "edits in later texts and elements");
h.eq(threw(function () { apply([["abcdef"]], [E(0, 3, "X"), E(2, 1, "Y")]); }) !== null, true, "overlapping edits throw");
h.eq(threw(function () { apply([["abcdef"]], [E(3, 1, "X"), E(0, 1, "Y")]); }) !== null, true, "edits in descending order throw");
h.eq(threw(function () { apply([["abc"]], [E(1, 1, undefined)]); }) !== null, true, "an edit without text throws, never inserts undefined");
h.eq(threw(function () { apply([["abc"]], [E(1, 1, 5)]); }) !== null, true, "a text that is not a string throws");
h.eq(threw(function () { apply([["abc"]], [{ el: 0, tx: 0, start: 0, length: 3, caseMode: "upper" }]); }) !== null, true, "a case edit without its result throws");
h.eq(threw(function () { apply([["abc"]], [E(0, 3, "ABC", { caseMode: "shout" })]); }) !== null, true, "an unknown caseMode throws");
h.eq(threw(function () { apply([["abc"]], [E(2, 5, "X")]); }) !== null, true, "an edit past the end of the text throws");
h.eq(threw(function () { apply([["abc"]], [E(-1, 1, "X")]); }) !== null, true, "a negative start throws");
h.eq(threw(function () { apply([["abc"]], [E(0, -1, "X")]); }) !== null, true, "a negative length throws");
h.eq(threw(function () { apply([["abc"]], [{ el: 1, tx: 0, start: 0, length: 1, text: "X" }]); }) !== null, true, "an edit for a missing element throws, it is not dropped");
h.eq(threw(function () { apply([["abc", "def"]], [{ el: 0, tx: 5, start: 0, length: 1, text: "X" }]); }) !== null, true, "an edit for a missing text throws");
h.eq(threw(function () { apply([["a"], ["b"]], [{ el: 1, tx: 0, start: 0, length: 1, text: "X" }, { el: 0, tx: 0, start: 0, length: 1, text: "Y" }]); }) !== null, true, "edits in descending element order throw");
h.eq(threw(function () { apply([["ab", "cd"]], [{ el: 0, tx: 1, start: 0, length: 1, text: "X" }, { el: 0, tx: 0, start: 0, length: 1, text: "Y" }]); }) !== null, true, "edits in descending text order throw");
var rawIn = [["abc"]];
S.applyEdits(rawIn, [E(0, 1, "X")]);
h.eq(JSON.stringify(rawIn), '[["abc"]]', "applyEdits does not change its input");

// --- the exception tables, against the engine's simple mapping ---
// Node maps case in full, the ExtendScript engine does not ("ß".toUpperCase() === "ß",
// "ǅ".toLowerCase() === "ǅ", measured, docs/findings.md), so the tests above stay green
// even when an entry leaves CASE_UPPER / CASE_LOWER / CASE_TITLE. Here the host's two
// functions are replaced by the engine's simple mapping for the characters the tables
// cover (they return them unchanged) and the emulation has to give the measured results.
// The pairs are the measured ones: [input, UPPERCASE, LOWERCASE, TITLECASE, SENTENCECASE].
var HOST_KEEPS = "ß\uFB00\uFB01\uFB02\uFB03\uFB04\uFB05\uFB06\u01C5\u01C8\u01CB\u01F2\u0130";
var HOST_PAIRS = [
    ["straße", "STRASSE", "straße", "Straße", "Straße"],
    ["ǆ ǅ Ǆ", "Ǆ Ǆ Ǆ", "ǆ ǆ ǆ", "ǅ ǅ ǅ", "ǅ ǆ ǆ"],
    ["ǉudi ﬁlm", "ǇUDI FILM", "ǉudi ﬁlm", "ǈudi Film", "ǈudi ﬁlm"],
    ["i\u0307 \u0130 \u0131", "I\u0307 \u0130 I", "i\u0307 i\u0307 \u0131", "I\u0307 \u0130 I", "I\u0307 i\u0307 \u0131"]
];
var origUpper = String.prototype.toUpperCase;
var origLower = String.prototype.toLowerCase;
function simpleMap(orig) {
    return function () {
        var s = String(this);
        var out = "";
        var i, c;
        for (i = 0; i < s.length; i++) {
            c = s.charAt(i);
            out += HOST_KEEPS.indexOf(c) !== -1 ? c : orig.call(c);
        }
        return out;
    };
}
try {
    String.prototype.toUpperCase = simpleMap(origUpper);
    String.prototype.toLowerCase = simpleMap(origLower);
    h.eq("ß".toUpperCase(), "ß", "the stub is the engine's simple mapping");
    var MODES = ["upper", "lower", "title", "sentence"];
    var hp, hm;
    for (hp = 0; hp < HOST_PAIRS.length; hp++) {
        for (hm = 0; hm < MODES.length; hm++) {
            h.eq(S.caseText(MODES[hm], HOST_PAIRS[hp][0]), HOST_PAIRS[hp][hm + 1],
                MODES[hm] + " of " + JSON.stringify(HOST_PAIRS[hp][0]) + " without the host's full mapping");
        }
    }
} finally {
    String.prototype.toUpperCase = origUpper;
    String.prototype.toLowerCase = origLower;
}

h.done();
