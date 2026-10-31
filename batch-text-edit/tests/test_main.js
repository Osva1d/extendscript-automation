// Tests for the entry point (src/main.js) and the run summary it shows
// (BTE.UIModel.changes, mismatchLines, runSummary, writeFailureSummary).
// main.js is run against stubs of the dialog, the write and the summary
// window: what is under test is the flow, the error paths and what reaches
// the user, not the DOM (tests/probes/probe_e2e.jsx runs it for real).
var h = require("./lib/harness");
var fs = require("fs");
var path = require("path");

var MODULES = ["src/locale.js", "src/lib/utils.js", "src/config.js", "src/lib/storage.js",
    "src/vars.js", "src/steps.js", "src/ui_model.js", "src/write.js"];

// BTE.L reads app.locale once, so the language is set around the load.
function loadBTE(locale) {
    global.app = { locale: locale };
    try {
        return h.load(MODULES, ["numbers", "summary"]);
    } finally {
        delete global.app;
    }
}
var BTE = loadBTE("cs_CZ");
var U = BTE.UIModel;
var L = BTE.L;
var MAIN = fs.readFileSync(path.join(__dirname, "..", "src", "main.js"), "utf8");

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
function V(name) { return { kind: "var", text: name }; }

// What BTE.UI.show hands back, for a state and a chain.
function result(state, steps, skipped, tfs) {
    return {
        scope: "document", order: "rows", steps: steps,
        prepared: { elements: [], state: state, tfs: tfs || [], skipped: skipped || { locked: 0, overflow: 0, linked: 0 },
            cursorInText: false, textCount: 0 },
        run: BTE.Steps.run(state, steps)
    };
}
function sheet(n) {
    var a = [], i;
    for (i = 0; i < n; i++) { a.push(["{kód}", "{n}", "Série {série}"]); }
    return a;
}
var CHAIN = [R(V("{kód}"), { replace: "ABC" }), N(V("{n}")), R(V("{série}"), { replace: "2026" })];

// ======================= changes ==============================================
var r = result(sheet(240), CHAIN);
var c = U.changes(r.run.states);
h.eq(c.elements, 240, "changes: every element of the sheet");
h.eq(c.texts, 720, "changes: three texts in each");
h.eq(U.status(r.run, CHAIN).changed, c.elements, "changes: the elements agree with the dialog's status");

// A -> B -> A writes the text twice and changes nothing
var back = [R({ kind: "text", text: "a" }, { replace: "b" }), R({ kind: "text", text: "b" }, { replace: "a" })];
r = result([["a", "x"], ["a", "x"]], back);
c = U.changes(r.run.states);
h.eq(c.elements + "/" + c.texts, "0/0", "changes: A -> B -> A is no change");

// only the text that differs counts; the element changes once
r = result([["a", "x"], ["y", "x"]], [R({ kind: "text", text: "a" }, { replace: "b" })]);
c = U.changes(r.run.states);
h.eq(c.elements + "/" + c.texts, "1/1", "changes: one text of one element");
r = result([["a", "a"], ["a", "x"]], [R({ kind: "text", text: "a" }, { replace: "b" })]);
c = U.changes(r.run.states);
h.eq(c.elements + "/" + c.texts, "2/3", "changes: two texts in one element count twice, the element once");

// ======================= mismatchLines ========================================
h.eq(U.mismatchLines([]).length, 0, "no mismatch, no line");
var lines = U.mismatchLines([{ el: 2, tx: 0, expected: "ABC", actual: "ABC\rX" }]);
h.eq(lines.join("|"), "✗ Prvek 3, text 1: náhled říkal „ABC“, v dokumentu je „ABC¶X“.", "mismatch line: from 1, ¶ for a paragraph break");
lines = U.mismatchLines([{ el: 0, tx: 1, expected: new Array(100).join("x"), actual: "y" }]);
h.eq(lines[0].indexOf("…") !== -1 && lines[0].length < 120, true, "a long text is cut");

var many = [], i;
for (i = 0; i < 10; i++) { many.push({ el: i, tx: 0, expected: "e", actual: "a" }); }
h.eq(U.mismatchLines(many).length, 10, "ten mismatches are all listed");
many.push({ el: 10, tx: 0, expected: "e", actual: "a" });
lines = U.mismatchLines(many);
h.eq(lines.length, 11, "eleven: ten and a line for the rest");
h.eq(lines[10], "✗ A další 1 neshoda.", "the rest: one");
for (i = 11; i < 13; i++) { many.push({ el: i, tx: 0, expected: "e", actual: "a" }); }
h.eq(U.mismatchLines(many)[10], "✗ A další 3 neshody.", "the rest: three");
for (i = 13; i < 30; i++) { many.push({ el: i, tx: 0, expected: "e", actual: "a" }); }
h.eq(U.mismatchLines(many)[10], "✗ A dalších 20 neshod.", "the rest: twenty");
h.eq(lines[0].indexOf("Prvek 1, text 1") !== -1, true, "the list starts with the first mismatch");

// ======================= runSummary ===========================================
r = result(sheet(240), CHAIN);
var sum = U.runSummary(r, []);
h.eq(sum.title, "Výsledek úprav", "summary: title");
h.eq(sum.pairs[0].label + sum.pairs[0].value, "Změněné prvky:240", "summary: changed elements");
h.eq(sum.pairs[1].label + sum.pairs[1].value, "Změněné texty:720", "summary: changed texts");
h.eq(sum.pairs[2].value, 0, "summary: nothing skipped");
h.eq(sum.pairs[3].label + sum.pairs[3].value + sum.pairs[3].alert + sum.pairs[3].always, "Neshoda po zápisu:0truetrue", "summary: the mismatch pair is red and always shown");
h.eq(sum.note, "", "summary: no note when all is well");
h.eq(sum.details.length, 0, "summary: no details when all is well");
h.eq(sum.close, "Zavřít", "summary: close");
var shown = BTE.Summary.visiblePairs(sum.pairs), labels = [];
for (i = 0; i < shown.length; i++) { labels.push(shown[i].label); }
h.eq(labels.join("|"), "Změněné prvky:|Změněné texty:|Neshoda po zápisu:", "summary: the window shows no row for the skipped texts at 0");

// skipped texts: one row with the total, the reasons in the details (from the dialog's status)
r = result(sheet(3), CHAIN, { locked: 1, overflow: 2, linked: 0 });
sum = U.runSummary(r, []);
h.eq(sum.pairs[2].label + sum.pairs[2].value, "Přeskočené texty:3", "summary: skipped texts, all reasons added");
h.eq(sum.details.join("|"), "⚠ Přeskočen 1 zamčený nebo skrytý text.|⚠ Přeskočeny 2 přetečené texty.", "summary: the reasons by name, counted");
shown = BTE.Summary.visiblePairs(sum.pairs);
h.eq(shown.length, 4, "summary: the skipped row shows at 3");

// warnings of the run go to the details
r = result(sheet(5), [N(V("{n}"), { to: "8" })]);
sum = U.runSummary(r, []);
h.eq(sum.details.join("|"), "⚠ Krok 1: Poslední číslo vyjde 5, v poli Do je 8.|⚠ Krok 1: Chybí 3 prvky.", "summary: the Do warning");
h.eq(sum.note, "", "summary: a warning is no note");

// mismatches: red count, a note, the lines before the warnings
r = result(sheet(5), [N(V("{n}"), { to: "8" })]);
sum = U.runSummary(r, [{ el: 1, tx: 1, expected: "002", actual: "2" }]);
h.eq(sum.pairs[3].value, 1, "summary: one mismatch");
h.eq(sum.note, "Zkontrolujte dokument, případně běh vraťte (Cmd+Z).", "summary: the note says what to do");
h.eq(sum.details[0], "✗ Prvek 2, text 2: náhled říkal „002“, v dokumentu je „2“.", "summary: the mismatch comes first");
h.eq(sum.details.length, 3, "summary: then the two warnings");

// the shared window reads what the model gives: a pair with a count and a note never says "all fine"
h.eq(typeof sum.allOk, "string", "summary: allOk is given (shown only when there is no note and no detail)");

// the note is one unwrapped line of about 60 characters at most
h.eq(L.SUM_MISMATCH_NOTE.length <= 60 && L.SUM_STOPPED.length <= 60, true, "the notes fit the unwrapped line");

// ======================= writeFailureSummary ==================================
var wErr = BTE.Write.stopped(new Error("the DOM said no"), { step: 0, el: 6, tx: 1 }, 12);
sum = U.writeFailureSummary(wErr);
h.eq(sum.details.join("|"), "Zápis se zastavil u prvku 7, zapsáno 12 textů. Zpět (Cmd+Z) vrátí celý běh.", "failure: the Error's message, in the details box");
h.eq(sum.pairs.length + sum.pairs[0].label + sum.pairs[0].value + sum.pairs[0].alert, "1Chyby:1true", "failure: one red error");
h.eq(sum.note, "Zápis se zastavil před koncem.", "failure: a note, so the window never says all is fine");
h.eq(JSON.stringify(sum).indexOf("the DOM said no") === -1 && JSON.stringify(sum).indexOf("BTE.Write.apply") === -1, true,
    "failure: the detail is nowhere in what the user sees");
shown = BTE.Summary.visiblePairs(sum.pairs);
h.eq(shown.length, 1, "failure: the error row shows");

// ======================= main.js ==============================================
// Runs main.js against stubs and records every call in order.
function runMain(opts) {
    var calls = [], alerts = [], logged = [], summaries = [];
    var res = opts.res;
    var env = {
        documents: { length: opts.docs === undefined ? 1 : opts.docs },
        activeDocument: { name: "doc" }
    };
    var origApply = BTE.Write.apply, origVerify = BTE.Write.verify, origSummary = BTE.Summary;

    BTE.UI = { show: function (doc) {
        if (opts.uiThrows) { throw opts.uiThrows; }
        calls.push("ui.show:" + (doc === env.activeDocument));
        return res === undefined ? null : res;
    } };
    BTE.Write.apply = function (tfs, info, states) {
        calls.push("apply");
        calls.args = { tfs: tfs, info: info, states: states };
        if (opts.applyThrows) { throw opts.applyThrows; }
        return { textsWritten: 0 };
    };
    BTE.Write.verify = function (tfs, finalState) {
        calls.push("verify");
        calls.verifyArgs = { tfs: tfs, finalState: finalState };
        if (opts.verifyThrows) { throw opts.verifyThrows; }
        return opts.mismatches || [];
    };
    BTE.Summary = { show: function (o) { calls.push("summary"); summaries.push(o); } };
    global.$ = { writeln: function (s) { logged.push(s); } };
    try {
        new Function("BTE", "app", "alert", "$", MAIN)(BTE, env, function (s) { alerts.push(s); }, global.$);
    } finally {
        BTE.Write.apply = origApply;
        BTE.Write.verify = origVerify;
        delete BTE.UI;
        BTE.Summary = origSummary;
        delete global.$;
    }
    return { calls: calls, alerts: alerts, logged: logged, summaries: summaries };
}

var tfs = [[{ id: "frame" }]];
r = result(sheet(2), CHAIN, undefined, tfs);

// no document: the alert, nothing else
var m = runMain({ docs: 0, res: r });
h.eq(m.alerts.join("|"), L.ERR_NO_DOC, "main: no document, the alert");
h.eq(m.calls.length, 0, "main: no document, the dialog is not opened");

// Storno: nothing is written, nothing is said
m = runMain({ res: null });
h.eq(m.calls.join(","), "ui.show:true", "main: Storno, the dialog only");
h.eq(m.alerts.length + m.summaries.length, 0, "main: Storno, no alert and no summary");

// Použít: write, verify, summary - in that order, with the run the dialog handed over
m = runMain({ res: r });
h.eq(m.calls.join(","), "ui.show:true,apply,verify,summary", "main: dialog, apply, verify, summary");
h.eq(m.alerts.length, 0, "main: no alert after a good run");
h.eq(m.calls.args.tfs === tfs && m.calls.args.info === r.run.info && m.calls.args.states === r.run.states, true,
    "main: apply gets prepared.tfs, run.info, run.states");
h.eq(m.calls.verifyArgs.tfs === tfs && m.calls.verifyArgs.finalState === r.run.states[r.run.states.length - 1], true,
    "main: verify gets the same frames and the final state");
h.eq(JSON.stringify(m.summaries[0]), JSON.stringify(U.runSummary(r, [])), "main: the summary of the run");
h.eq(m.summaries[0].pairs[0].value, 2, "main: the summary counts the sheet");

// mismatches reach the summary
m = runMain({ res: r, mismatches: [{ el: 0, tx: 0, expected: "ABC", actual: "x" }] });
h.eq(m.summaries[0].pairs[3].value, 1, "main: the mismatch count reaches the summary");
h.eq(m.summaries[0].details[0].indexOf("Prvek 1, text 1") !== -1, true, "main: and the line");

// a write that stopped: the Error's message in the summary, the detail only in the log, no verify
m = runMain({ res: r, applyThrows: wErr });
h.eq(m.calls.join(","), "ui.show:true,apply,summary", "main: a stopped write shows the summary and does not verify");
h.eq(m.alerts.length, 0, "main: a stopped write is no ERR_CRITICAL");
h.eq(m.summaries[0].details.join("|"), wErr.message, "main: the Error's message is shown");
h.eq(JSON.stringify(m.summaries[0]).indexOf("the DOM said no"), -1, "main: the detail is not shown");
h.eq(m.logged.join("|"), "[BTE] " + wErr.detail, "main: the detail is logged");
h.eq(wErr.detail.indexOf("the DOM said no") !== -1, true, "main: (the logged detail carries the cause)");

// a broken edit list (apply throws before it writes): the global boundary
var bug = new Error("BTE.Write: step 1, edit 1 has no text");
bug.line = 42;
m = runMain({ res: r, applyThrows: bug });
h.eq(m.calls.join(","), "ui.show:true,apply", "main: a bug in the edit list stops at apply");
h.eq(m.alerts.join("|"), L.format(L.ERR_CRITICAL, "BTE.Write: step 1, edit 1 has no text", "42"), "main: ERR_CRITICAL with the message and the line");
h.eq(m.summaries.length, 0, "main: no summary after ERR_CRITICAL");
h.eq(m.logged.length, 1, "main: the fatal error is logged too");

// a failing verify: the boundary (the document is written, ERR_CRITICAL says to check it)
m = runMain({ res: r, verifyThrows: new Error("BTE.Write.verify: reading failed") });
h.eq(m.calls.join(","), "ui.show:true,apply,verify", "main: a failing verify stops there");
h.eq(m.alerts[0].indexOf("BTE.Write.verify: reading failed") !== -1 && m.alerts[0].indexOf("(řádek ?)") !== -1, true,
    "main: ERR_CRITICAL, line unknown");

// the dialog throwing (a document that cannot be read)
m = runMain({ uiThrows: new Error("BTE.UI: reading the selection failed") });
h.eq(m.calls.join(","), "", "main: the dialog threw before it returned");
h.eq(m.alerts.length === 1 && m.alerts[0].indexOf("BTE.UI: reading the selection failed") !== -1, true,
    "main: the dialog's failure reaches the boundary");

// the source has no silent catch and no redraw between apply and verify
h.eq(/app\.redraw/.test(MAIN), false, "main.js never redraws (one Undo step)");
h.eq(/catch\s*\([^)]*\)\s*\{\s*\}/.test(MAIN), false, "main.js has no empty catch");

h.done();
