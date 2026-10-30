var h = require("./lib/harness");
var BTE = h.load(["src/lib/utils.js", "src/vars.js", "src/steps.js"], ["numbers"]);

function R(where, extra) {
    var s = { type: "replace", active: true, where: where, replace: "", matchCase: false, firstOnly: false };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function one(text, step) { return BTE.Steps.run([[text]], [step]); }

var st = [["{kód}", "{n}", "Série {série}"], ["{kód}", "{n}", "Série {série}"]];
var r = BTE.Steps.run(st, [R({kind:"var", text:"{kód}"}, {replace:"ABC"})]);
h.eq(r.states[1][0][0], "ABC", "variable replaced");
h.eq(r.states[1][1][2], "Série {série}", "rest untouched");
h.eq(r.info[0].hits, 2, "hits counted per element");
h.eq(JSON.stringify(r.info[0].edits[0]), '{"el":0,"tx":0,"start":0,"length":5,"text":"ABC"}', "edit relative to input");
// chain: step 2 sees step 1's output and its vars
var r2 = BTE.Steps.run(st, [R({kind:"var",text:"{kód}"},{replace:"A"}), R({kind:"var",text:"{série}"},{replace:"2026"})]);
h.eq(JSON.stringify(r2.info[1].vars), '[{"name":"{n}","count":2},{"name":"{série}","count":2}]', "vars before step 2");
h.eq(BTE.Steps.run([["Abc abc"]], [R({kind:"text",text:"abc"},{replace:"x"})]).states[1][0][0], "x x", "matchCase off by default");
h.eq(BTE.Steps.run([["Abc abc"]], [R({kind:"text",text:"abc"},{replace:"x",matchCase:true})]).states[1][0][0], "Abc x", "matchCase on");
h.eq(BTE.Steps.run([["a a"]], [R({kind:"text",text:"a"},{replace:"b",firstOnly:true})]).states[1][0][0], "b a", "first only");
h.eq(BTE.Steps.run([["2025-10"]], [R({kind:"regex",text:"(\\d+)-(\\d+)"},{replace:"$2/$1"})]).states[1][0][0], "10/2025", "backrefs in regex mode");
// Review Focus: metacharacters and dollar
h.eq(BTE.Steps.run([["{a+b} {x.y}"]], [R({kind:"var",text:"{a+b}"},{replace:"1"})]).states[1][0][0], "1 {x.y}", "metacharacters in variable");
h.eq(BTE.Steps.run([["p"]], [R({kind:"text",text:"p"},{replace:"$1$&"})]).states[1][0][0], "$1$&", "dollar stays literal");
h.eq(BTE.Steps.run([["x"]], [R({kind:"regex",text:"(?<=a)x"},{replace:""})]).info[0].error.key, "ERR_LOOKBEHIND", "lookbehind rejected");
h.eq(BTE.Steps.run([["x"]], [R({kind:"regex",text:"("},{replace:""})]).info[0].error.key, "ERR_BAD_REGEX", "bad regex");
h.eq(BTE.Steps.run([["x"]], [R({kind:"text",text:""},{replace:""})]).info[0].error.key, "ERR_FIND_EMPTY", "empty find");
h.eq(BTE.Steps.run([["ab"]], [R({kind:"regex",text:"x*"},{replace:"-"})]).info[0].edits.length, 0, "empty matches skipped");
h.eq(BTE.Steps.run([["ab\rcd"]], [R({kind:"regex",text:"^c"},{replace:"X"})]).states[1][0][0], "ab\rcd", "no m flag");
h.eq(BTE.Steps.run([["x"]], [R({kind:"var",text:"{q}"},{replace:"1"})]).info[0].warns[0].key, "WARN_NOTHING_FOUND", "nothing found warns");
var off = R({kind:"var",text:"{kód}"},{replace:"A"}); off.active = false;
h.eq(BTE.Steps.run(st, [off]).states[1][0][0], "{kód}", "inactive step copies input");

// --- more than the brief lists ---
// several matches, several texts: positions are per text, counted per element
var multi = BTE.Steps.run([["{n}/{n}", "x {n}"], ["{n}"]], [R({kind:"var",text:"{n}"},{replace:"7"})]);
h.eq(multi.states[1][0].join("|"), "7/7|x 7", "same variable twice in one text, second text");
h.eq(multi.info[0].hits, 2, "two matches in one element count once");
h.eq(JSON.stringify(multi.info[0].edits.slice(0, 3)),
    '[{"el":0,"tx":0,"start":0,"length":3,"text":"7"},{"el":0,"tx":0,"start":4,"length":3,"text":"7"},{"el":0,"tx":1,"start":2,"length":3,"text":"7"}]',
    "edits ordered by element, text, position");
h.eq(multi.info[0].multi.length, 0, "replace reports no multi-match elements");
// Review Focus: names with regex metacharacters or $ match literally
h.eq(one("a {$} b", R({kind:"var",text:"{$}"},{replace:"X"})).states[1][0][0], "a X b", "{$} as a variable is literal");
var dot = one("{x.y} {xzy}", R({kind:"var",text:"{x.y}"},{replace:"X"}));
h.eq(dot.states[1][0][0], "X {xzy}", "{x.y} does not match {xzy}");
h.eq(dot.info[0].edits.length, 1, "{x.y} has exactly one edit");
// mayCapture(): only an unescaped "(" can open a group
h.eq(BTE.Steps.mayCapture("\\{n\\}"), false, "mayCapture: an escaped variable");
h.eq(BTE.Steps.mayCapture(BTE.Utils.escapeRegExp("{a(b)}")), false, "mayCapture: escaped parentheses");
h.eq(BTE.Steps.mayCapture("\\d+"), false, "mayCapture: a regex without parentheses");
h.eq(BTE.Steps.mayCapture("(a)"), true, "mayCapture: a group at the start");
h.eq(BTE.Steps.mayCapture("x(y)"), true, "mayCapture: a group inside");
h.eq(BTE.Steps.mayCapture("x\\\\(y)"), true, "mayCapture: an escaped backslash, then a group");
h.eq(BTE.Steps.mayCapture("x\\\\\\(y"), false, "mayCapture: three backslashes escape the parenthesis");
h.eq(BTE.Steps.mayCapture("(?:a)"), true, "mayCapture: a non-capturing group errs towards true");
h.eq(BTE.Steps.mayCapture("[(]"), true, "mayCapture: a parenthesis in a class errs towards true");
// the path without groups gives what the general path gives; "(?:...)" forces
// the general path without adding a group
var PATS = ["x*", "a", "\\d+", "b?", "\\{n\\}", "[a-c]", "\\s", "^a", "a$", ".", "\\r"];
var TEXTS = ["", "xxaxb", "aaa", "a1 b22 c333", "{n}/{n} {n}", "ab\rcd", "  a  "];
var diff = [], pi, ti, f;
for (pi = 0; pi < PATS.length; pi++) {
    for (ti = 0; ti < TEXTS.length; ti++) {
        for (f = 0; f < 2; f++) {
            if (JSON.stringify(BTE.Steps.matches(new RegExp(PATS[pi], "g"), TEXTS[ti], f === 1)) !==
                    JSON.stringify(BTE.Steps.matches(new RegExp("(?:" + PATS[pi] + ")", "g"), TEXTS[ti], f === 1))) {
                diff.push(PATS[pi] + " in " + JSON.stringify(TEXTS[ti]) + (f ? " firstOnly" : ""));
            }
        }
    }
}
h.eq(diff.join("; "), "", "matches: the path without groups equals the general one (" + PATS.length * TEXTS.length * 2 + " cases)");
h.eq(JSON.stringify(BTE.Steps.matches(new RegExp("A", "gi"), "xaA")), '[{"0":"a","index":1,"length":1},{"0":"A","index":2,"length":1}]', "matches: case-insensitive keeps its flag on the fast path");

// matches(): empty matches at the end and between characters, groups, offsets
var mm = BTE.Steps.matches(new RegExp("x*", "g"), "xxaxb");
h.eq(mm.length, 2, "x* gives its two non-empty matches and terminates");
h.eq(mm[0].index + ":" + mm[0][0] + "|" + mm[1].index + ":" + mm[1][0], "0:xx|3:x", "x* match positions");
var gm = BTE.Steps.matches(new RegExp("(a)|(b)", "g"), "ab");
h.eq(gm[0].length + "," + gm[0][1] + "," + gm[0][2] + "|" + gm[1][1] + "," + gm[1][2], "3,a,|,b", "groups, non-participating group is empty");
h.eq(BTE.Steps.matches(new RegExp("a", "g"), "aaa", true).length, 1, "firstOnly keeps one match");
h.eq(BTE.Steps.matches(new RegExp("a?", "g"), "").length, 0, "empty text, empty pattern: no match");
h.eq(one("ab", R({kind:"regex",text:"b?"},{replace:"-"})).states[1][0][0], "a-", "optional pattern: empty matches skipped, real one replaced");
// a variable is always matched case-sensitively, text and regex follow matchCase
h.eq(one("{Kód} {kód}", R({kind:"var",text:"{kód}"},{replace:"X"})).states[1][0][0], "{Kód} X", "variable is case-sensitive");
h.eq(one("ABC abc", R({kind:"regex",text:"abc"},{replace:"x"})).states[1][0][0], "x x", "regex case-insensitive by default");
h.eq(one("ABC abc", R({kind:"regex",text:"abc"},{replace:"x",matchCase:true})).states[1][0][0], "ABC x", "regex matchCase on");
// "(?<" is only an error in regex mode
h.eq(one("a (?<x b", R({kind:"text",text:"(?<x"},{replace:"Y"})).states[1][0][0], "a Y b", "(?< is literal in text mode");
h.eq(one("x", R({kind:"regex",text:"(?<n>x)"},{replace:""})).info[0].error.key, "ERR_LOOKBEHIND", "named group rejected");
h.eq(one("x", R({kind:"regex",text:"(?<!a)x"},{replace:""})).info[0].error.key, "ERR_LOOKBEHIND", "negative lookbehind rejected");
// kinds that belong to other steps, or that leaked, are errors and not silent no-ops
h.eq(one("x", R({kind:"auto",text:""},{replace:"1"})).info[0].error.key, "ERR_FIND_EMPTY", "auto is an error");
h.eq(one("x", R({kind:"first",text:""},{replace:"1"})).info[0].error.key, "ERR_FIND_EMPTY", "first is an error in Replace");
h.eq(one("x", R({kind:"var",text:""},{replace:"1"})).info[0].error.key, "ERR_FIND_EMPTY", "empty variable is an error");
// a failing step copies its input and the chain goes on
var chain = BTE.Steps.run([["ab"]], [R({kind:"text",text:""},{}), R({kind:"text",text:"b"},{replace:"Z"})]);
h.eq(chain.states[1][0][0], "ab", "failing step copies input");
h.eq(chain.states[2][0][0], "aZ", "next step still runs");
h.eq(chain.info[0].hits, 0, "failing step has no hits");
h.eq(chain.info[0].warns.length, 0, "failing step has the error and no warning");
h.eq(chain.info[1].error, null, "next step has no error");
// an inactive step is not compiled, but still reports the variables of its input
var offBad = R({kind:"regex",text:"("},{}); offBad.active = false;
var offR = BTE.Steps.run(st, [offBad]);
h.eq(offR.info[0].error, null, "inactive step is not compiled");
h.eq(offR.info[0].warns.length, 0, "inactive step does not warn");
h.eq(JSON.stringify(offR.info[0].vars), '[{"name":"{kód}","count":2},{"name":"{n}","count":2},{"name":"{série}","count":2}]', "inactive step lists variables");
// edits are relative to the step's own input
var rel = BTE.Steps.run([["ab"]], [R({kind:"text",text:"a"},{replace:"xyz"}), R({kind:"text",text:"b"},{replace:"Q"})]);
h.eq(rel.states[2][0][0], "xyzQ", "second step works on the first one's output");
h.eq(rel.info[1].edits[0].start, 3, "second step edit relative to its input");
h.eq(rel.states.length, 3, "one state per step plus the input");
h.eq(rel.states[0][0][0], "ab", "state 0 is the input");
// first only is per text; empty matches before it are skipped
var fo = BTE.Steps.run([["a a", "a a"]], [R({kind:"text",text:"a"},{replace:"b",firstOnly:true})]);
h.eq(fo.states[1][0].join("|"), "b a|b a", "first only is per text");
h.eq(one("axx", R({kind:"regex",text:"x*"},{replace:"-",firstOnly:true})).states[1][0][0], "a-", "first non-empty match after an empty one");
// replacement tokens, regex mode only
h.eq(one("ab", R({kind:"regex",text:"(a)(b)"},{replace:"$$$&$2$1"})).states[1][0][0], "$abba", "$$ and $& and groups");
h.eq(one("xaby", R({kind:"regex",text:"ab"},{replace:"[$`|$']"})).states[1][0][0], "x[x|y]y", "$` and $' use the input text");
h.eq(one("a", R({kind:"regex",text:"(a)"},{replace:"$2$0$10"})).states[1][0][0], "$2$0a0", "groups that do not exist stay literal");
h.eq(one("a", R({kind:"regex",text:"(a)|(b)"},{replace:"<$2>"})).states[1][0][0], "<>", "group that did not take part is empty");
// empty and paragraph-only texts
var emp = BTE.Steps.run([[""], ["\r"], ["   "]], [R({kind:"regex",text:"x"},{replace:"1"})]);
h.eq(emp.info[0].edits.length, 0, "empty texts produce no edit");
h.eq(emp.info[0].warns[0].key, "WARN_NOTHING_FOUND", "empty texts: nothing found");
h.eq(emp.states[1][1][0], "\r", "paragraph-only text kept");
// input is not changed; unchanged states are copies
var input = [["{a}"]];
var cp = BTE.Steps.run(input, [off]);
h.eq(input[0][0], "{a}", "input state untouched");
h.assert(cp.states[1] !== input && cp.states[1][0] !== input[0], "unchanged step returns a copy");
// compile
var c1 = BTE.Steps.compile({kind:"text", text:"a.b"}, false);
h.eq(c1.re.source, "a\\.b", "text is escaped");
h.eq(c1.re.global, true, "g flag");
h.eq(c1.re.ignoreCase, false, "case-sensitive when asked");
h.eq(c1.re.multiline, false, "never m");
h.eq(BTE.Steps.compile({kind:"regex", text:"x"}, true).re.ignoreCase, true, "regex case-insensitive when asked");
h.eq(BTE.Steps.compile({kind:"var", text:"{n}"}, true).re.ignoreCase, false, "variable ignores the flag");
h.eq(BTE.Steps.compile({kind:"regex", text:"("}, false).error.key, "ERR_BAD_REGEX", "compile reports bad regex");
// unknown step type is a programming error, not a quiet no-op
var threw = false;
try { BTE.Steps.run([["x"]], [{ type: "bogus", active: true }]); } catch (e) { threw = true; }
h.eq(threw, true, "unknown step type throws");
h.done();
