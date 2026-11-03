var h = require("./lib/harness");
var BTE = h.load(["src/lib/utils.js", "src/vars.js", "src/steps.js"], ["numbers"]);

function N(where, extra) {
    var s = { type: "number", active: true, where: where, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function V(extra) { return N({kind:"var", text:"{n}"}, extra); }
function infoOf(st, step) { return BTE.Steps.run(st, [step]).info[0]; }

var st = []; for (var i = 0; i < 5; i++) st.push(["{kód}", "{n}"]);
var r = BTE.Steps.run(st, [N({kind:"var",text:"{n}"})]);
h.eq(r.states[1][4][1], "005", "1..5 padded");
h.eq(BTE.Steps.valueAt(5, 1, 1, 1, 6), 6, "reset not reached");
h.eq(BTE.Steps.valueAt(6, 1, 1, 1, 6), 1, "reset after 6");
h.eq(BTE.Steps.valueAt(20, 1, 1, 20, 0), 2, "repeat 20");
h.eq(BTE.Steps.formatValue(-7, "1", 3), "-007", "negative padded");
h.eq(BTE.Steps.formatValue(27, "A", 3), "AA", "letters ignore digits");
h.eq(BTE.Steps.formatValue(26, "a", 1), "z", "lowercase");
h.eq(BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{format:"A",from:"0"})]).info[0].error.key, "ERR_LETTER_BELOW_ONE", "letters below 1");
h.eq(BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{from:"1,5"})]).info[0].error.key, "ERR_NOT_INTEGER", "integers only");
h.eq(BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{digits:"0"})]).info[0].error.key, "ERR_MIN_ONE", "digits >= 1");
var w = BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{to:"8"})]).info[0].warns;
h.eq(w[0].key + w[1].key + w[1].args[0], "WARN_TO_MISMATCHWARN_MISSING3", "Do: 3 missing");
h.eq(BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{to:"3"})]).info[0].warns[1].key, "WARN_EXTRA", "Do: extra");
h.eq(BTE.Steps.run(st, [N({kind:"var",text:"{n}"},{to:"5"})]).info[0].warns.length, 0, "Do matches");
// first number in element, text order within element
h.eq(BTE.Steps.run([["A 12", "7"]], [N({kind:"first"},{from:"40"})]).states[1][0].join("|"), "A 040|7", "first number only");
// a text without a match consumes nothing
h.eq(BTE.Steps.run([["x"], ["{n}"]], [N({kind:"var",text:"{n}"})]).states[1][1][0], "001", "no-match element skipped");
// Review Focus: same variable twice, empty texts
var two = BTE.Steps.run([["{n}/{n}"], ["{n}"]], [N({kind:"var",text:"{n}"})]);
h.eq(two.states[1][0][0] + " " + two.states[1][1][0], "001/001 002", "same variable twice in one text");
h.eq(two.info[0].multi[0].count, 2, "multi-match reported");
h.eq(BTE.Steps.run([[""], ["\r"], ["{n}"]], [N({kind:"var",text:"{n}"})]).states[1][2][0], "001", "empty texts consume nothing");

// --- more than the brief lists ---
// valueAt / formatValue
h.eq(BTE.Steps.valueAt(3, 10, -2, 1, 0), 4, "descending step");
h.eq(BTE.Steps.valueAt(4, 7, 0, 1, 0), 7, "step 0 gives the same value");
h.eq(BTE.Steps.valueAt(0, -3, 1, 1, 0), -3, "negative start");
h.eq(BTE.Steps.valueAt(5, 1, 1, 2, 4), 1, "reset then repeat: b = 5 mod 4 = 1");
h.eq(BTE.Steps.valueAt(7, 1, 1, 2, 4), 2, "reset then repeat: b = 3 -> 1 + 1");
h.eq(BTE.Steps.formatValue(5, "1", 3), "005", "digits pad");
h.eq(BTE.Steps.formatValue(1200, "1", 3), "1200", "digits never truncate");
h.eq(BTE.Steps.formatValue(0, "1", 3), "000", "zero padded");
h.eq(BTE.Steps.formatValue(-120, "1", 2), "-120", "negative wider than digits");
h.eq(BTE.Steps.formatValue(1, "A", 3), "A", "letter 1 is A");
h.eq(BTE.Steps.formatValue(26, "A", 3), "Z", "letter 26 is Z");
h.eq(BTE.Steps.formatValue(52, "A", 3), "AZ", "letter 52 is AZ");
h.eq(BTE.Steps.formatValue(53, "A", 3), "BA", "letter 53 is BA");
h.eq(BTE.Steps.formatValue(702, "A", 3), "ZZ", "letter 702 is ZZ");
h.eq(BTE.Steps.formatValue(703, "A", 3), "AAA", "letter 703 is AAA");
h.eq(BTE.Steps.formatValue(28, "a", 3), "ab", "lowercase two letters");
// per-element ordering and the same value for an element
var rows = BTE.Steps.run([["{n}", "x"], ["x", "{n}"], ["{n} {n}"]], [V({digits:"1"})]);
h.eq(rows.states[1][0][0] + "|" + rows.states[1][1][1] + "|" + rows.states[1][2][0], "1|2|3 3", "one number per element, all its matches equal");
h.eq(rows.info[0].hits, 3, "hits = elements numbered");
h.eq(JSON.stringify(rows.info[0].multi), '[{"el":2,"count":2}]', "multi lists only elements with several matches");
h.eq(JSON.stringify(rows.info[0].edits[0]), '{"el":0,"tx":0,"start":0,"length":3,"text":"1"}', "edit relative to input");
// letters, repeats, reset
var lt = BTE.Steps.run([["{r}"], ["{r}"], ["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{format:"A",repeats:"2"})]);
h.eq(lt.states[1].join(""), "AABBC", "letters with repeat 2");
var rs = BTE.Steps.run([["{r}"], ["{r}"], ["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{reset:"2",digits:"1"})]);
h.eq(rs.states[1].join(""), "12121", "reset after 2");
var dn = BTE.Steps.run([["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{from:"10",step:"-5",digits:"1"})]);
h.eq(dn.states[1].join(","), "10,5,0", "descending");
var neg = BTE.Steps.run([["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{from:"-1",digits:"2"})]);
h.eq(neg.states[1].join(","), "-01,00", "negative start through zero");
h.eq(BTE.Steps.run([["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{step:"0",from:"4",digits:"1"})]).states[1].join(","), "4,4", "step 0");
h.eq(BTE.Steps.run([["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{format:"A",from:"3",step:"-1"})]).states[1].join(""), "CBA", "letters descending to A");
h.eq(BTE.Steps.run([["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{format:"A",from:"3",step:"-1"})]).info[0].error, null, "letters reaching 1 are fine");
h.eq(BTE.Steps.run([["{r}"], ["{r}"], ["{r}"], ["{r}"]], [N({kind:"var",text:"{r}"},{format:"A",from:"3",step:"-1"})]).info[0].error.key, "ERR_LETTER_BELOW_ONE", "letters descending below 1");
h.eq(BTE.Steps.run([["x"]], [N({kind:"var",text:"{r}"},{format:"A",from:"0"})]).info[0].error, null, "letter check looks at used values only");
// digits is not validated for letters; it is for the numeric format
h.eq(BTE.Steps.run([["{r}"]], [N({kind:"var",text:"{r}"},{format:"A",digits:"0"})]).states[1][0][0], "A", "digits ignored for letters");
h.eq(BTE.Steps.run([["{r}"]], [N({kind:"var",text:"{r}"},{format:"a",digits:"x"})]).info[0].error, null, "digits not validated for lowercase letters");
// digits is capped at 20 (R13): padding to an absurd width could hang the live preview
function digitsErr(d) { return infoOf([["{n}"]], V({digits:d})).error; }
h.eq(digitsErr("21").key + "," + digitsErr("21").args[0] + "," + digitsErr("21").args[1], "ERR_DIGITS_RANGE,1,20", "digits 21 is out of range");
h.eq(digitsErr("100000000").key, "ERR_DIGITS_RANGE", "huge digits refused without padding");
h.eq(digitsErr("20"), null, "digits 20 is fine");
h.eq(BTE.Steps.run([["{n}"]], [V({digits:"20"})]).states[1][0][0], "00000000000000000001", "digits 20 pads to 20 characters");
h.eq(BTE.Steps.run([["{n}"]], [V({digits:"20"})]).states[1][0][0].length, 20, "digits 20: 20 characters");
h.eq(digitsErr("0").key, "ERR_MIN_ONE", "digits 0 keeps the minimum error");
h.eq(digitsErr("-5").key, "ERR_MIN_ONE", "negative digits keep the minimum error");
h.eq(BTE.Steps.MAX_DIGITS, 20, "cap is MAX_DIGITS = 20");
h.eq(BTE.Steps.run([["{n}"]], [V({digits:"21", format:"A"})]).info[0].error, null, "digits cap does not apply to letters");
h.eq(infoOf([["{n}"]], V({from:"x", digits:"21"})).error.key, "ERR_NOT_INTEGER", "fields are checked in order: Od before Číslic");
// numbers beyond the safe integer range (R15): never written, never looped on
var SAFE = "9007199254740991";
var zeros400 = "1"; for (var z = 0; z < 400; z++) zeros400 += "0";
function errOf(extra, n) {
    var rows = []; for (var q = 0; q < (n || 1); q++) rows.push(["{n}"]);
    return BTE.Steps.run(rows, [V(extra)]);
}
h.eq(errOf({from: zeros400}).info[0].error.key + errOf({from: zeros400}).info[0].error.args[0], "ERR_NOT_INTEGERFIELD_FROM", "401-digit Od is refused (it parses to Infinity)");
h.eq(errOf({step: zeros400}).info[0].error.args[0], "FIELD_STEP", "401-digit Krok is refused");
h.eq(errOf({to: zeros400}).info[0].error.args[0], "FIELD_TO", "401-digit Do is refused");
h.eq(errOf({repeats: zeros400}).info[0].error.key, "ERR_NOT_INTEGER", "401-digit Opakovat is refused");
h.eq(errOf({reset: zeros400}).info[0].error.args[0], "FIELD_RESET", "401-digit Znovu po is refused");
h.eq(errOf({from: "-" + zeros400}).info[0].error.key, "ERR_NOT_INTEGER", "negative 401-digit Od is refused");
h.eq(errOf({from: "1" + "00000000000000000000000"}).info[0].error.key, "ERR_NOT_INTEGER", "1e22 would be written as 1e+22: refused");
h.eq(errOf({from: "9007199254740992"}).info[0].error.key, "ERR_NOT_INTEGER", "2^53 is beyond the safe range");
h.eq(errOf({from: "9007199254740993"}).info[0].error.key, "ERR_NOT_INTEGER", "2^53+1 would silently become ...992: refused");
h.eq(errOf({from: "-9007199254740992"}).info[0].error.key, "ERR_NOT_INTEGER", "-2^53 is beyond the safe range");
h.eq(errOf({from: SAFE, digits: "1"}).states[1][0][0], SAFE, "the largest safe Od is fine and written exactly");
h.eq(errOf({from: "-" + SAFE, digits: "1"}).states[1][0][0], "-" + SAFE, "the smallest safe Od is fine and written exactly");
h.eq(errOf({from: SAFE}, 2).info[0].error.key, "ERR_VALUE_RANGE", "Od at the limit plus step 1 over 2 elements: value out of range");
h.eq(errOf({from: SAFE}, 2).info[0].error.args.length, 0, "ERR_VALUE_RANGE has no arguments");
h.eq(errOf({from: SAFE}, 2).states[1].join("|"), "{n}|{n}", "nothing is written when a value is out of range");
h.eq(errOf({from: SAFE}, 2).info[0].edits.length, 0, "no edits when a value is out of range");
h.eq(errOf({from: "-" + SAFE, step: "-1"}, 2).info[0].error.key, "ERR_VALUE_RANGE", "negative side out of range");
h.eq(errOf({from: "1", step: SAFE}, 2).info[0].error.key, "ERR_VALUE_RANGE", "step as large as the limit, second value out of range");
h.eq(errOf({from: "1", step: SAFE}, 1).info[0].error, null, "a single element never reaches Krok");
h.eq(errOf({from: SAFE, repeats: "2", digits: "1"}, 2).states[1].join("|"), SAFE + "|" + SAFE, "repeats keep the value in range");
h.eq(errOf({from: SAFE, reset: "1", digits: "1"}, 3).states[1].join("|"), SAFE + "|" + SAFE + "|" + SAFE, "reset keeps the value in range");
h.eq(errOf({from: SAFE, step: "0", digits: "1"}, 3).info[0].error, null, "step 0 never leaves the range");
// letters: an overflowing series is an error and terminates
h.eq(errOf({from: SAFE, format: "A"}, 2).info[0].error.key, "ERR_VALUE_RANGE", "letters: out of range is an error, not a loop");
h.eq(errOf({from: "1", step: SAFE, format: "A"}, 2).info[0].error.key, "ERR_VALUE_RANGE", "letters: huge step is an error");
h.eq(errOf({from: zeros400, format: "A"}).info[0].error.key, "ERR_NOT_INTEGER", "letters: Infinity never reaches formatValue");
// the term step * k is exact too: here step * 3 = 2^53 + 1 would round and leave a wrong value in range
var STEP3 = "3002399751580331";
h.eq(errOf({from: "-" + SAFE, step: STEP3, digits: "1"}, 4).info[0].error.key, "ERR_VALUE_RANGE", "inexact term is refused even when the sum would be in range");
h.eq(errOf({from: "-" + SAFE, step: STEP3, digits: "1"}, 3).states[1].join("|"), "-9007199254740991|-6004799503160660|-3002399751580329", "values up to the limit are exact");
// formatValue never loops on a value that has no text
h.eq(BTE.Steps.formatValue(Infinity, "A", 3), "", "Infinity has no letters (and terminates)");
h.eq(BTE.Steps.formatValue(-Infinity, "a", 3), "", "-Infinity has no letters");
h.eq(BTE.Steps.formatValue(NaN, "A", 3), "", "NaN has no letters");
h.eq(BTE.Steps.formatValue(Infinity, "1", 3), "", "Infinity has no digits");
h.eq(BTE.Steps.formatValue(NaN, "1", 3), "", "NaN has no digits");
h.eq(BTE.Steps.formatValue(1e22, "1", 3), "", "1e22 is not written as 1e+22");
h.eq(BTE.Steps.formatValue(2.5, "1", 3), "", "a fraction has no text");
h.eq(BTE.Steps.formatValue(2.5, "A", 3), "", "a fraction has no letters");
h.eq(BTE.Steps.formatValue(9007199254740991, "1", 1), SAFE, "the limit itself formats exactly");
h.eq(BTE.Steps.formatValue(-9007199254740991, "1", 1), "-" + SAFE, "the negative limit formats exactly");
// field validation: keys, argument names, order
function err(extra) { return infoOf([["{n}"]], V(extra)).error; }
h.eq(err({from:"x"}).key + err({from:"x"}).args[0], "ERR_NOT_INTEGER" + "FIELD_FROM", "from names its label key");
h.eq(err({to:"2.5"}).args[0], "FIELD_TO", "to names its label key");
h.eq(err({step:"abc"}).args[0], "FIELD_STEP", "step names its label key");
h.eq(err({digits:"1,5"}).args[0], "FIELD_DIGITS", "digits names its label key");
h.eq(err({repeats:"1,5"}).args[0], "FIELD_REPEATS", "repeats names its label key");
h.eq(err({reset:"1,5"}).args[0], "FIELD_RESET", "reset names its label key");
h.eq(err({digits:"0"}).key + err({digits:"0"}).args[0], "ERR_MIN_ONEFIELD_DIGITS", "digits below 1");
h.eq(err({repeats:"0"}).key + err({repeats:"0"}).args[0], "ERR_MIN_ONEFIELD_REPEATS", "repeats below 1");
h.eq(err({repeats:"-2"}).key, "ERR_MIN_ONE", "negative repeats");
h.eq(err({from:""}).key, "ERR_NOT_INTEGER", "empty from is not a number");
h.eq(err({step:""}).key, "ERR_NOT_INTEGER", "empty step is not a number");
h.eq(err({to:"", reset:"", repeats:""}), null, "empty to, reset and repeats are valid");
h.eq(infoOf([["{n}"], ["{n}"], ["{n}"]], V({repeats:"", digits:"1"})).hits, 3, "empty repeats run as 1");
h.eq(BTE.Steps.run([["{n}"], ["{n}"], ["{n}"]], [V({repeats:"", digits:"1"})]).states[1].join(","), "1,2,3", "empty repeats are 1");
h.eq(BTE.Steps.run([["{n}"], ["{n}"], ["{n}"]], [V({reset:"", digits:"1"})]).states[1].join(","), "1,2,3", "empty reset is never");
h.eq(err({from:" 7 "}), null, "spaces around a number are fine");
h.eq(BTE.Steps.run([["{n}"]], [V({from:"-3", digits:"1"})]).states[1][0][0], "-3", "negative from");
h.eq(BTE.Steps.run([["{n}"]], [V({from:"+4", digits:"1"})]).states[1][0][0], "4", "plus sign on from");
h.eq(err({to:"1e3"}).key, "ERR_NOT_INTEGER", "exponent is not an integer");
h.eq(err({from:"1.0"}), null, "1.0 is the integer 1");
// a failing step passes its input on and the chain goes on
var bad = BTE.Steps.run([["{n}"]], [V({digits:"0"})]);
h.eq(bad.states[1][0][0], "{n}", "failing step changes nothing");
h.eq(bad.info[0].edits.length + "," + bad.info[0].hits, "0,0", "failing step reports no edits");
// Where: other kinds go through the matcher; unresolved kinds are an error
h.eq(BTE.Steps.run([["Fig 7", "x"]], [N({kind:"text", text:"Fig"},{from:"9", digits:"1"})]).states[1][0].join("|"), "9 7|x", "text kind");
h.eq(BTE.Steps.run([["Fig 7"]], [N({kind:"text", text:"fig"},{from:"9"})]).info[0].warns[0].key, "WARN_NOTHING_FOUND", "text kind is case-sensitive");
h.eq(BTE.Steps.run([["a1 b22"]], [N({kind:"regex", text:"[a-z]\\d+"},{from:"5", digits:"1"})]).states[1][0][0], "5 5", "regex kind, all matches get one value");
h.eq(BTE.Steps.run([["x"]], [N({kind:"regex", text:"("})]).info[0].error.key, "ERR_BAD_REGEX", "bad regex");
h.eq(BTE.Steps.run([["x"]], [N({kind:"var", text:""})]).info[0].error.key, "ERR_FIND_EMPTY", "empty Where text");
h.eq(BTE.Steps.run([["x"]], [N({kind:"auto"})]).info[0].error.key, "ERR_FIND_EMPTY", "unresolved kind is an error");
h.eq(BTE.Steps.run([["x"]], [N({kind:"all"})]).info[0].error.key, "ERR_FIND_EMPTY", "all is not a Number position");
h.eq(BTE.Steps.run([["x"]], [N({kind:"var", text:"{q}"})]).info[0].warns[0].key, "WARN_NOTHING_FOUND", "nothing found");
// first number: digits only, no sign, no decimals, first text that has one
h.eq(BTE.Steps.run([["no digits", "ab 5 cd 6", "7"]], [N({kind:"first"},{from:"1", digits:"1"})]).states[1][0].join("|"), "no digits|ab 1 cd 6|7", "first number across texts");
h.eq(BTE.Steps.run([["-12.5"]], [N({kind:"first"},{from:"9", digits:"1"})]).states[1][0][0], "-9.5", "first number takes digits only");
h.eq(BTE.Steps.run([["12"], ["a"], ["3 4"]], [N({kind:"first"},{from:"1", digits:"1"})]).states[1].join(","), "1,a,2 4", "first number: one per element, none consumed by a miss");
h.eq(BTE.Steps.run([["12 34"]], [N({kind:"first"})]).info[0].multi.length, 0, "first number is never multi");
// Do check
var d1 = infoOf(st, N({kind:"var",text:"{n}"},{to:"8"})).warns;
h.eq(d1[0].args[0] + "," + d1[0].args[1], "5,8", "mismatch names last and Do");
h.eq(d1.length, 2, "mismatch + missing");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"3"})).warns[1].args[0], "2", "2 extra");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"3"})).warns[0].key, "WARN_TO_MISMATCH", "mismatch first");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"4", repeats:"2"})).warns.length, 1, "repeats: mismatch only");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"9", reset:"3"})).warns.length, 1, "reset: mismatch only");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"9", step:"0"})).warns.length, 1, "step 0: mismatch only");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"7", step:"2"})).warns[1].args[0], "1", "step 2 to 7: values 1..9, one extra");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"20", step:"2"})).warns.length, 1, "unreachable Do: mismatch only");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{from:"10", to:"4", step:"-2"})).warns[1].key, "WARN_EXTRA", "descending: values 10..2, Do 4");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{from:"10", to:"0", step:"-2"})).warns[1].args[0], "1", "descending: 10 -> 0 needs 6, has 5, one missing");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{from:"10", to:"0", step:"-2"})).warns[1].key, "WARN_MISSING", "descending: missing");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"-3"})).warns.length, 1, "Do on the wrong side: mismatch only");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"1.5"})).error.args[0], "FIELD_TO", "Do must be an integer");
h.eq(infoOf([["x"]], N({kind:"var",text:"{n}"},{to:"4"})).warns.length, 1, "nothing found: no Do check");
h.eq(infoOf([["x"]], N({kind:"var",text:"{n}"},{to:"4"})).warns[0].key, "WARN_NOTHING_FOUND", "nothing found: only that warning");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:" "})).warns.length, 0, "blank Do means none");
h.eq(infoOf(st, N({kind:"var",text:"{n}"},{to:"4", format:"A"})).warns[0].args[0], "5", "letters: Do check compares numbers");
// inactive step
var off = N({kind:"var",text:"{n}"}); off.active = false;
h.eq(BTE.Steps.run(st, [off]).states[1][0][1], "{n}", "inactive step copies input");
// chain: Replace then Number; Number then Replace
var chain = BTE.Steps.run([["{kód}", "{n}"], ["{kód}", "{n}"]],
    [N({kind:"var",text:"{n}"}), { type: "replace", active: true, where: {kind:"var", text:"{kód}"}, replace: "K", matchCase: false, firstOnly: false }]);
h.eq(chain.states[2].join("|"), "K,001|K,002", "number then replace");
h.eq(JSON.stringify(chain.info[1].vars), '[{"name":"{kód}","count":2}]', "numbered variable is gone from the next step's list");

h.done();
