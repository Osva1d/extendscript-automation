var h = require("./lib/harness");
var fs = require("fs");
var path = require("path");

// The CaseChangeType enum the write passes to changeCaseTo (Illustrator global).
global.CaseChangeType = {
    UPPERCASE: { name: "CaseChangeType.UPPERCASE" },
    LOWERCASE: { name: "CaseChangeType.LOWERCASE" },
    TITLECASE: { name: "CaseChangeType.TITLECASE" },
    SENTENCECASE: { name: "CaseChangeType.SENTENCECASE" }
};
var BTE = h.load(["src/locale.js", "src/lib/utils.js", "src/vars.js", "src/steps.js", "src/write.js"], ["numbers"]);
var L = BTE.L;

// ---- mock text frame ---------------------------------------------------------
//
// Only the surface the write may use: characters[i] returns a fresh range of
// length 1 whose `length` can be set, whose `contents` reads and writes the
// characters it covers and whose changeCaseTo() changes them through the
// preview's own emulation (so straße -> STRASSE changes the length, as the
// engine does). tf.contents can be read; assigning it throws, because the
// write must never do it. Every write lands in f.log.
//   opts.editable  false = a locked or hidden text (default true)
//   opts.fail(op)  called before every write ("contents" or "case"); throw
//                  there to simulate a DOM error
//   opts.alter(v)  what really lands in the document for a contents write
//   opts.caseImpl(mode, s)  what changeCaseTo really makes of a range
//                  (default: the preview's emulation)
var MODE_OF = { UPPERCASE: "upper", LOWERCASE: "lower", TITLECASE: "title", SENTENCECASE: "sentence" };

function enumName(t) {
    var k;
    for (k in CaseChangeType) { if (CaseChangeType[k] === t) { return k; } }
    return null;
}

function range(f, start) {
    var len = 1;
    var r = {};
    Object.defineProperty(r, "length", {
        get: function () { return len; },
        // Past the end the DOM throws ("the value would result in an illegal
        // text range.", measured, findings Task 10); the mock clamps without
        // a word, the worst case, so only the write's own checks can catch it.
        set: function (n) { len = Math.min(n, f.s.length - start); }
    });
    Object.defineProperty(r, "contents", {
        get: function () { return f.s.substr(start, len); },
        set: function (v) {
            if (f.fail) { f.fail("contents"); }
            f.log.push({ op: "contents", start: start, length: len, text: v });
            f.s = f.s.substring(0, start) + (f.alter ? f.alter(v) : v) + f.s.substring(start + len);
        }
    });
    r.changeCaseTo = function (t) {
        var name = enumName(t);
        var seg = f.s.substr(start, len);
        if (name === null) { throw new Error("mock: changeCaseTo needs a CaseChangeType member"); }
        if (f.fail) { f.fail("case"); }
        f.log.push({ op: "case", start: start, length: len, type: name });
        f.s = f.s.substring(0, start) + (f.caseImpl ? f.caseImpl(MODE_OF[name], seg) : BTE.Steps.caseText(MODE_OF[name], seg)) +
            f.s.substring(start + len);
    };
    return r;
}

function frame(s, opts) {
    var o = opts || {};
    var f = { s: s, log: [], reads: 0, editable: o.editable === undefined ? true : o.editable, fail: o.fail || null,
        alter: o.alter || null, caseImpl: o.caseImpl || null };
    f.characters = new Proxy({}, {
        get: function (t, key) {
            var i;
            if (typeof key !== "string") { return undefined; }
            if (key === "length") { return f.s.length; }
            i = Number(key);
            if (String(i) !== key || i < 0 || i >= f.s.length) { throw new Error("mock: characters[" + key + "] out of range"); }
            return range(f, i);
        }
    });
    Object.defineProperty(f, "contents", {
        configurable: true,
        get: function () { f.reads++; return f.s; },
        set: function () { throw new Error("mock: tf.contents = is banned"); }
    });
    return f;
}

// Frames in the shape of Scope.prepare's tfs, from a state.
function frames(state, opts) {
    var out = [], i, j, row;
    for (i = 0; i < state.length; i++) {
        row = [];
        for (j = 0; j < state[i].length; j++) { row.push(frame(state[i][j], opts)); }
        out.push(row);
    }
    return out;
}

// The texts the frames hold now, as a state.
function stateOf(tfs) {
    var out = [], i, j, row;
    for (i = 0; i < tfs.length; i++) {
        row = [];
        for (j = 0; j < tfs[i].length; j++) { row.push(tfs[i][j].s); }
        out.push(row);
    }
    return out;
}

// Writes a hand-built edit list with the states run would pass: states[0] is
// what the frames hold, states[k + 1] what step k's edits make of states[k].
function write(tfs, info) {
    var states = [stateOf(tfs)], k;
    for (k = 0; k < info.length; k++) { states.push(BTE.Steps.applyEdits(states[k], info[k].edits)); }
    return BTE.Write.apply(tfs, info, states);
}

function texts(tfs) {
    var a = [], i, j;
    for (i = 0; i < tfs.length; i++) {
        for (j = 0; j < tfs[i].length; j++) { a.push(tfs[i][j].s); }
    }
    return a.join(" | ");
}

function logs(tfs) {
    var n = 0, i, j;
    for (i = 0; i < tfs.length; i++) {
        for (j = 0; j < tfs[i].length; j++) { n += tfs[i][j].log.length; }
    }
    return n;
}

function starts(f) {
    var a = [], i;
    for (i = 0; i < f.log.length; i++) { a.push(f.log[i].start); }
    return a.join(",");
}

function ops(f) {
    var a = [], i;
    for (i = 0; i < f.log.length; i++) { a.push(f.log[i].op + ":" + (f.log[i].type || f.log[i].text)); }
    return a.join(",");
}

function thrown(fn) {
    try { fn(); } catch (e) { return e; }
    return null;
}

function E(el, tx, start, length, text, caseMode) {
    var e = { el: el, tx: tx, start: start, length: length, text: text };
    if (caseMode !== undefined) { e.caseMode = caseMode; }
    return e;
}

function R(where, extra) {
    var s = { type: "replace", active: true, where: where, replace: "", matchCase: false, firstOnly: false };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function N(where, extra) {
    var s = { type: "number", active: true, where: where, from: "1", to: "", step: "1", digits: "3", repeats: "1", reset: "", format: "1" };
    var k;
    for (k in extra) { if (extra.hasOwnProperty(k)) { s[k] = extra[k]; } }
    return s;
}
function C(where, mode) { return { type: "case", active: true, where: where, mode: mode }; }

var tfs, f, res, e, i;

// ---- within one text the edits of a step go from the highest start down ----
tfs = frames([["{a} {b}"]]);
res = write(tfs, [{ edits: [E(0, 0, 0, 3, "xx"), E(0, 0, 4, 3, "yyyy")] }]);
h.eq(tfs[0][0].s, "xx yyyy", "two length-changing replacements in one text land where the preview put them");
h.eq(starts(tfs[0][0]), "4,0", "the higher start is written first");
h.eq(res.textsWritten, 1, "one text written");

// changeCaseTo changes the length (straße -> STRASSE, measured); from the end
// the second range is still where the preview put it.
tfs = frames([["straße straße"]]);
res = write(tfs, [{ edits: [E(0, 0, 0, 6, "STRASSE", "upper"), E(0, 0, 7, 6, "STRASSE", "upper")] }]);
h.eq(tfs[0][0].s, "STRASSE STRASSE", "two length-changing case edits in one text");
h.eq(starts(tfs[0][0]), "7,0", "case edits from the highest start too");
h.eq(ops(tfs[0][0]), "case:UPPERCASE,case:UPPERCASE", "a case edit calls changeCaseTo and writes no contents");

// ---- a case edit calls changeCaseTo with the mapped enum, one range each -----
tfs = frames([["abc"], ["ABC"], ["ab cd"], ["ab. cd"]]);
write(tfs, [{ edits: [
    E(0, 0, 0, 3, "ABC", "upper"),
    E(1, 0, 0, 3, "abc", "lower"),
    E(2, 0, 0, 5, "Ab Cd", "title"),
    E(3, 0, 0, 6, "Ab. cd", "sentence")
] }]);
h.eq(ops(tfs[0][0]) + " " + ops(tfs[1][0]) + " " + ops(tfs[2][0]) + " " + ops(tfs[3][0]),
    "case:UPPERCASE case:LOWERCASE case:TITLECASE case:SENTENCECASE", "each mode passes its CaseChangeType member");
h.eq(tfs[2][0].log[0].start + "/" + tfs[2][0].log[0].length, "0/5", "the range covers exactly the edit");

tfs = frames([["xx {k} yy"]]);
write(tfs, [{ edits: [E(0, 0, 3, 3, "{K}", "upper")] }]);
h.eq(tfs[0][0].s, "xx {K} yy", "a case edit inside a longer text changes only its range");
h.eq(tfs[0][0].log[0].start + "/" + tfs[0][0].log[0].length, "3/3", "the case range starts and ends at the edit");

// A no-op edit between two lengthening ones, in one text and one step: from
// the end, the outer two are written, the middle one is not, and every range
// lands where the preview put it.
var mid = BTE.Steps.run([["straße ABC straße"]], [C({ kind: "regex", text: "straße|ABC" }, "upper")]);
h.eq(mid.info[0].edits.length, 3, "fixture: three case edits in one text");
tfs = frames([["straße ABC straße"]]);
res = BTE.Write.apply(tfs, mid.info, mid.states);
h.eq(tfs[0][0].s, "STRASSE ABC STRASSE", "lengthening, no-op, lengthening: the preview lands");
h.eq(starts(tfs[0][0]), "11,0", "the highest start first, the no-op in the middle skipped");
h.eq(res.textsWritten, 1, "one text written");

// ---- an edit that changes nothing is not written and not counted -------------
tfs = frames([["ABC"], ["{x} end"], ["abc DEF"]]);
res = write(tfs, [{ edits: [
    E(0, 0, 0, 3, "ABC", "upper"),
    E(1, 0, 0, 3, "{x}"),
    E(2, 0, 0, 3, "ABC", "upper"),
    E(2, 0, 4, 3, "DEF", "upper")
] }]);
h.eq(logs([[tfs[0][0], tfs[1][0]]]), 0, "a case edit and a replacement that change nothing write nothing");
h.eq(ops(tfs[2][0]) + "@" + starts(tfs[2][0]), "case:UPPERCASE@0", "next to a no-op edit, only the real one is written");
h.eq(res.textsWritten, 1, "texts with only no-op edits are not counted");
h.eq(tfs[2][0].s, "ABC DEF", "the text still ends as the preview says");

// ---- run -> apply -> verify: the preview is what lands ----------------------
// Each step's edits are relative to the step's input, so the DOM must have
// steps 0..k-1 in it before step k: the Case step makes straße one letter
// longer, and the Replace after it finds {KÓD} one place further on.
var state = [["{kód} {n} Série {série}"], ["straße {kód}", "{n}"], ["ABC"]];
var steps = [
    R({ kind: "var", text: "{série}" }, { replace: "2026" }),
    R({ kind: "var", text: "{n}" }, { replace: "never", active: false }),
    N({ kind: "var", text: "{n}" }),
    R({ kind: "text", text: "" }, { replace: "fails" }),
    C({ kind: "all" }, "upper"),
    R({ kind: "var", text: "{KÓD}" }, { replace: "abc" })
];
var run = BTE.Steps.run(state, steps);
var fin = run.states[run.states.length - 1];
h.eq(run.info[3].error.key, "ERR_FIND_EMPTY", "fixture: step 4 fails");
tfs = frames(state);
res = BTE.Write.apply(tfs, run.info, run.states);
h.eq(texts(tfs), "abc 001 SÉRIE 2026 | STRASSE abc | 002 | ABC", "the chain lands as the preview");
h.eq(texts(tfs), fin[0][0] + " | " + fin[1][0] + " | " + fin[1][1] + " | " + fin[2][0], "document = final state");
h.eq(JSON.stringify(BTE.Write.verify(tfs, fin)), "[]", "verify finds nothing after a clean write");
h.eq(res.textsWritten, 3, "three texts written; ABC (upper of ABC) never is");
h.eq(tfs[2][0].log.length, 0, "the text the chain leaves alone gets no write");
h.eq(ops(tfs[1][1]), "contents:002", "the number is written, its no-op upper case is not");
h.eq(starts(tfs[1][0]), "0,8", "the Replace after the case step writes at the shifted start");

// A text two steps write is one text written.
tfs = frames([["{a}"]]);
res = write(tfs, [{ edits: [E(0, 0, 0, 3, "{b}")] }, { edits: [E(0, 0, 0, 3, "c")] }]);
h.eq(tfs[0][0].s + " " + res.textsWritten, "c 1", "a text written by two steps counts once");

// Nothing to write.
tfs = frames([["a"], ["b"]]);
h.eq(BTE.Write.apply(tfs, [], [stateOf(tfs)]).textsWritten, 0, "no steps, nothing written");
h.eq(write(tfs, [{ edits: [] }, { edits: [] }]).textsWritten, 0, "steps without edits write nothing");
h.eq(logs(tfs), 0, "and touch no text");

// Deleting a range (empty replacement).
tfs = frames([["a {x} b"]]);
write(tfs, [{ edits: [E(0, 0, 2, 4, "")] }]);
h.eq(tfs[0][0].s, "a b", "an empty replacement deletes the range");

// ---- verify reads every text back ------------------------------------------
// The mock drops the last character of whatever is written into element 2.
tfs = frames([["{n}"], ["{n}"], ["{n}"]]);
tfs[1][0] = frame("{n}", { alter: function (v) { return v.substring(0, v.length - 1); } });
write(tfs, [{ edits: [E(0, 0, 0, 3, "001"), E(1, 0, 0, 3, "002"), E(2, 0, 0, 3, "003")] }]);
res = BTE.Write.verify(tfs, [["001"], ["002"], ["003"]]);
h.eq(JSON.stringify(res), '[{"el":1,"tx":0,"expected":"002","actual":"00"}]', "verify reports the write the document altered, and only it");

// Every text is read, also the ones apply did not touch: a text that should
// have changed and did not is a difference too.
tfs = frames([["a"], ["b"]]);
res = BTE.Write.verify(tfs, [["a"], ["B"]]);
h.eq(JSON.stringify(res), '[{"el":1,"tx":0,"expected":"B","actual":"b"}]', "verify checks texts apply did not write");
h.eq(tfs[0][0].reads + tfs[1][0].reads, 2, "one read per text");

e = thrown(function () { BTE.Write.verify(frames([["a"]]), [["a"], ["b"]]); });
h.eq(e !== null && /rows/.test(e.message), true, "verify throws when the preview has other rows than the frames");
e = thrown(function () { BTE.Write.verify(frames([["a", "b"]]), [["a"]]); });
h.eq(e !== null && /texts/.test(e.message), true, "verify throws when a row has another number of texts");
f = frame("a");
Object.defineProperty(f, "contents", { get: function () { throw new Error("DOM gone"); } });
e = thrown(function () { BTE.Write.verify([[frame("x")], [f]], [["x"], ["a"]]); });
h.eq(e !== null && /element 2, text 1/.test(e.message) && /DOM gone/.test(e.message), true, "a failing read names the text and keeps the cause");

// ---- a DOM error stops the write and says how far it got --------------------
function failing() { return frame("{n}", { fail: function () { throw new Error("Text is locked"); } }); }

tfs = frames([["{n}"], ["{n}"], ["{n}"]]);
tfs[2][0] = failing();
e = thrown(function () { write(tfs, [{ edits: [E(0, 0, 0, 3, "001"), E(1, 0, 0, 3, "002"), E(2, 0, 0, 3, "003")] }]); });
h.eq(e !== null, true, "a DOM error is not swallowed");
h.eq(e.message, L.format(L.countForm("ERR_WRITE_AT", 2), 3, 2), "the message is ERR_WRITE_AT alone: element 3, 2 written");
h.eq(e.detail, "BTE.Write.apply: step 1, element 3, text 1: Text is locked", "detail names where and keeps the DOM's own words");
h.eq(e.cause instanceof Error && e.cause.message === "Text is locked", true, "cause is what the DOM threw");
h.eq(e.written + "/" + e.el + "/" + e.tx + "/" + e.step, "2/2/0/0", "the error carries written, el, tx and step");
h.eq(texts(tfs), "001 | 002 | {n}", "the texts before the failure are written, the failing one is not");

tfs = [[failing()], [frame("{n}")]];
e = thrown(function () { write(tfs, [{ edits: [E(0, 0, 0, 3, "001"), E(1, 0, 0, 3, "002")] }]); });
h.eq(e.message.indexOf(L.format(L.countForm("ERR_WRITE_AT", 0), 1, 0)) >= 0 && e.written === 0, true, "failing on the first text: 0 written");
h.eq(tfs[1][0].log.length, 0, "the write stops at the error, the next text is not touched");

// In step 2, on a text step 1 already wrote: the count is texts written so far.
f = frame("{a} {b}");
var calls = 0;
f.fail = function () { calls++; if (calls === 2) { throw new Error("boom"); } };
tfs = [[f], [frame("{a}")]];
e = thrown(function () {
    write(tfs, [
        { edits: [E(0, 0, 0, 3, "A"), E(1, 0, 0, 3, "A")] },
        { edits: [E(0, 0, 0, 1, "aa")] }
    ]);
});
h.eq(e.written + "/" + e.el + "/" + e.step, "2/0/1", "an error in a later step counts every text written before it");
h.eq(e.message, L.format(L.countForm("ERR_WRITE_AT", 2), 1, 2), "and names the element of the failing text");
h.eq(e.detail, "BTE.Write.apply: step 2, element 1, text 1: boom", "detail names the step");

// A text partly written before the error counts as written.
f = frame("{a} {b}");
calls = 0;
f.fail = function () { calls++; if (calls === 2) { throw new Error("boom"); } };
e = thrown(function () { write([[f]], [{ edits: [E(0, 0, 0, 3, "A"), E(0, 0, 4, 3, "B")] }]); });
h.eq(e.written + " " + f.s, "1 {a} B", "a text with one of its edits written counts as written");

// ---- the document drifts from the preview: the write stops before it -------
// The review's case: the emulation makes SS of ß, a DOM that left ß would let
// step 2 overwrite "BC" instead of "AB". Before a step writes into a text,
// the text must be the step's input; here it is not, so step 2 writes nothing.
var asciiUpper = function (mode, seg) { return seg.replace(/[a-z]/g, function (c) { return c.toUpperCase(); }); };
var drift = BTE.Steps.run([["ß abc x"]], [C({ kind: "all" }, "upper"), R({ kind: "text", text: "AB" }, { replace: "zz", matchCase: true })]);
h.eq(drift.states[1][0][0] + " / " + drift.states[2][0][0], "SS ABC X / SS zzC X", "fixture: the preview");
tfs = [[frame("ß abc x", { caseImpl: asciiUpper })]];
e = thrown(function () { BTE.Write.apply(tfs, drift.info, drift.states); });
h.eq(e !== null, true, "a text that is not the step's input stops the write");
h.eq(tfs[0][0].s, "ß ABC X", "step 2 writes nothing into the drifted text");
h.eq(ops(tfs[0][0]), "case:UPPERCASE", "only step 1 reached the document");
h.eq(e.written + "/" + e.el + "/" + e.tx + "/" + e.step, "1/0/0/1", "written as before: the text step 1 wrote");
h.eq(e.message, L.format(L.countForm("ERR_WRITE_AT", 1), 1, 1), "ERR_WRITE_AT for element 1, 1 written");
h.eq(/^BTE\.Write\.apply: step 2, element 1, text 1: the text differs from the preview/.test(e.detail), true, "detail names the step, the element and the drift");
h.eq(/first difference at character 0; 7 characters in the document, 8 in the preview/.test(e.detail), true, "and where the texts part");

// The same chain on a document that follows the preview writes both steps.
tfs = [[frame("ß abc x")]];
res = BTE.Write.apply(tfs, drift.info, drift.states);
h.eq(tfs[0][0].s + " " + res.textsWritten, "SS zzC X 1", "a matching chain still writes");
h.eq(JSON.stringify(BTE.Write.verify(tfs, drift.states[2])), "[]", "and verifies");

// Drift before the first step (the document is not what Scope read).
tfs = [[frame("ab")], [frame("{n}")]];
e = thrown(function () { BTE.Write.apply(tfs, [{ edits: [E(0, 0, 1, 5, "x"), E(1, 0, 0, 3, "1")] }], [[["abcdef"], ["{n}"]]]); });
h.eq(e !== null && e.message === L.format(L.countForm("ERR_WRITE_AT", 0), 1, 0), true, "a shorter document text stops the write");
h.eq(logs(tfs), 0, "and nothing is written, there or after");

// ---- a broken edit list is a bug: refused before the first write ------------
// Every bad edit sits in step 2 behind a valid step 1, so a refusal with no
// write anywhere proves the whole list is checked first.
function refused(bad, label, editable) {
    var t = [[frame("abcdef")], [frame("ghijkl", { editable: editable })]];
    var st = [[["abcdef"], ["ghijkl"]], [["Abcdef"], ["ghijkl"]]];
    var err = thrown(function () { BTE.Write.apply(t, [{ edits: [E(0, 0, 0, 1, "A")] }, { edits: bad }], st); });
    h.eq(err !== null, true, label + ": throws");
    h.eq(logs(t), 0, label + ": nothing written anywhere");
    return err;
}
refused([E(1, 0, 2, 0, "x")], "zero-length range");
refused([E(1, 0, -1, 2, "x")], "negative start");
refused([E(1, 0, 0, 2, undefined)], "edit without text");
refused([E(1, 0, 0, 2, "GH", "shout")], "unknown caseMode");
refused([E(1, 1, 0, 2, "x")], "no frame for the text");
refused([E(2, 0, 0, 2, "x")], "no row for the element");
refused([E(1, 0, 3, 2, "x"), E(1, 0, 0, 2, "y")], "edits out of order in one text");
refused([E(1, 0, 0, 3, "x"), E(1, 0, 2, 2, "y")], "overlapping edits");
refused([E(1, 0, 0, 1, "x"), E(0, 0, 3, 1, "y")], "elements out of order");
refused([E(1, 0, 4, 3, "x")], "a range past the end of the step's input text");
e = refused([E(1, 0, 0, 2, "x")], "a text that is not editable", false);
h.eq(/editable/.test(e.message), true, "the refusal names editable");
e = thrown(function () { BTE.Write.apply(frames([["a"]]), [{ hits: 0 }], [[["a"]]]); });
h.eq(e !== null, true, "a step without an edit list is refused");
tfs = frames([["abc"]]);
e = thrown(function () { BTE.Write.apply(tfs, [{ edits: [E(0, 0, 0, 1, "A")] }]); });
h.eq(e !== null && /states/.test(e.message) && logs(tfs) === 0, true, "no states: refused, nothing written");
e = thrown(function () { BTE.Write.apply(tfs, [{ edits: [] }, { edits: [E(0, 0, 0, 1, "A")] }], [[["abc"]]]); });
h.eq(e !== null && /input text/.test(e.message) && logs(tfs) === 0, true, "no input text for a step: refused, nothing written");

// ---- the bans of the global constraints, in the source ----------------------
var src = fs.readFileSync(path.join(__dirname, "..", "src", "write.js"), "utf8");
var code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
h.eq(/characterOffset/.test(code), false, "no characterOffset");
h.eq(/redraw/.test(code), false, "no app.redraw()");
h.eq(/\btf\.contents\s*=[^=]/.test(code), false, "no tf.contents =");
h.done();
