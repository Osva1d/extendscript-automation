#!/usr/bin/env node
/**
 * shared/lib/progress.js — the progress palette that stops on held Esc.
 */
var fs = require("fs");
var path = require("path");
var mock = require("./lib_scriptui_mock.js");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "progress.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

var NS = {};
buildProgress(NS);
var P = NS.Progress;
var TEXTS = { title: "Export plátů…", init: "Připravuji…", item: "Exportuji: %s (%s z %s)",
    hint: "Export zastavíte podržením klávesy Esc.", stopping: "Zastavuji — rozpracovaný plát se dokončí…" };

console.log("\n=== shorten: a long name keeps its start and its end ===");
assert(P.shorten("zed_01.pdf") === "zed_01.pdf", "a short name stays");
var long = "26_13456_a_motiv_vlevo_01_2040x1030mm_1ku10_1x";
var sh = P.shorten(long);
assert(sh.length === 36 && sh.indexOf("…") === 18, "a long one is cut in the middle (" + sh + ")");
assert(sh.slice(0, 18) === long.slice(0, 18) && sh.slice(-17) === long.slice(-17), "its start and end stay");

console.log("\n=== create: a palette with the status, a bar and the stop hint ===");
var pr = P.create(12, TEXTS);
var w = mock.windows[mock.windows.length - 1];
assert(w.windowType === "palette" && w.text === "Export plátů…" && w.props.closeButton === false,
    "a palette without a close button, titled");
assert(w.shown === 1, "shown at once");
var st = w.all("statictext"), bar = w.all("progressbar")[0];
assert(st[0].text === "Připravuji…" && st[1].text === TEXTS.hint, "status and hint");
assert(st[0].preferredSize.width === 450 && bar.maxvalue === 12, "the status width is reserved; the bar counts 12");

console.log("\n=== update: the item, its position and the total ===");
pr.update(0, "zed_01");
assert(st[0].text === "Exportuji: zed_01 (1 z 12)", "first panel");
assert(bar.value === 0, "the bar stands before the item in progress");
pr.update(4, long);
assert(st[0].text === "Exportuji: " + sh + " (5 z 12)", "a long name is shortened");

console.log("\n=== held Esc stops after the item in progress ===");
assert(pr.isCancelled() === false, "no key, no stop");
ScriptUI.environment.keyboardState.keyName = "Escape";
assert(pr.isCancelled() === true, "Esc held: stop");
assert(st[1].text === TEXTS.stopping, "and the hint says the item in progress is finished");
ScriptUI.environment.keyboardState.keyName = undefined;
assert(pr.isCancelled() === true, "the request stays once Esc is let go");
ScriptUI.environment.keyboardState = null;
var pr2 = P.create(3, TEXTS);
assert(pr2.isCancelled() === false, "an unreadable keyboard state is no stop");
ScriptUI.environment.keyboardState = { keyName: undefined };

console.log("\n=== finish and close ===");
pr.finish();
assert(bar.value === 12, "the bar ends full");
pr.close();
assert(w.closed === true, "closed");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
