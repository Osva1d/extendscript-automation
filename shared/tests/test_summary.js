#!/usr/bin/env node
/**
 * shared/lib/summary.js — the window a run ends with.
 */
var fs = require("fs");
var path = require("path");
var mock = require("./lib_scriptui_mock.js");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "summary.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "lib", "field_paint.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function last() { return mock.windows[mock.windows.length - 1]; }
function texts(w) { return w.all("statictext").map(function (c) { return c.text; }); }

var NS = {};
buildSummary(NS);
var S = NS.Summary;
var BASE = { title: "Výsledek exportu", detailsTitle: "Podrobnosti", allOk: "Vše proběhlo bez chyb.", close: "Zavřít" };
function opts(extra) { var o = {}, k; for (k in BASE) { o[k] = BASE[k]; } for (k in extra) { o[k] = extra[k]; } return o; }

console.log("\n=== visiblePairs: a count of 0 shows only when it must ===");
var vp = S.visiblePairs([{ label: "a", value: 3, always: true }, { label: "b", value: 0, always: true },
    { label: "c", value: 0 }, { label: "d", value: 2 }]);
assert(vp.map(function (p) { return p.label; }).join(",") === "a,b,d", "0 without always is left out");

console.log("\n=== a clean run ===");
S.show(opts({ pairs: [{ label: "Exportováno:", value: 3, always: true },
    { label: "Chyby:", value: 0, alert: true, always: true }, { label: "Přeskočeno:", value: 0 }] }));
var w = last();
assert(w.windowType === "dialog" && w.text === "Výsledek exportu" && w.shown === 1, "a dialog, titled, shown");
var t = texts(w);
assert(t.indexOf("Exportováno:") !== -1 && t.indexOf("3") !== -1 && t.indexOf("Chyby:") !== -1, "the counts");
assert(t.indexOf("Přeskočeno:") === -1, "a zero count that may be left out is");
assert(t.indexOf("Vše proběhlo bez chyb.") !== -1, "and it says all went fine");
var btn = w.all("button")[0];
assert(btn.text === "Zavřít" && btn.props.name === "ok", "one button, Return closes it");

console.log("\n=== errors in red, details in a scrolling box ===");
S.show(opts({ pairs: [{ label: "Exportováno:", value: 2, always: true }, { label: "Chyby:", value: 1, alert: true, always: true }],
    details: ["Plát 3: disk je plný."] }));
w = last();
var red = w.all("statictext").filter(function (c) { return c.text === "1"; })[0];
assert(red.graphics.foregroundColor && red.graphics.foregroundColor.color.slice(0, 3).join(",") === "0.9,0.2,0.2",
    "the error count is red, the canon's red without FieldPaint");
var box = w.all("edittext")[0];
assert(box && box.text === "Plát 3: disk je plný." && box.props.scrolling === true && box.props.readonly === true,
    "the details in a read-only scrolling box");
assert(texts(w).indexOf("Vše proběhlo bez chyb.") === -1, "and no claim that all went fine");

console.log("\n=== a stopped run never says that everything went fine ===");
S.show(opts({ pairs: [{ label: "Exportováno:", value: 4, always: true }], note: "Zastaveno po 4 z 12 plátů." }));
t = texts(last());
assert(t.indexOf("Zastaveno po 4 z 12 plátů.") !== -1, "the note says it stopped");
assert(t.indexOf("Vše proběhlo bez chyb.") === -1, "and the run is not called fine");

console.log("\n=== an intro line comes first ===");
S.show(opts({ intro: "Cílová složka: „/Users/shop/out“", pairs: [{ label: "Exportováno:", value: 1, always: true }] }));
assert(last().children[0].type === "statictext" && last().children[0].text === "Cílová složka: „/Users/shop/out“",
    "the intro line above the counts");
var intro = last().children[0];
assert(intro.preferredSize.width === undefined && intro.minimumSize.width === S.NOTE_W,
    "the intro keeps its own width, at least NOTE_W: a long folder path is not cut");

console.log("\n=== with FieldPaint built, its red ===");
var NS2 = {};
buildFieldPaint(NS2);
buildSummary(NS2);
NS2.Summary.show(opts({ pairs: [{ label: "Chyby:", value: 2, alert: true, always: true }] }));
red = last().all("statictext").filter(function (c) { return c.text === "2"; })[0];
assert(red.graphics.foregroundColor.color.slice(0, 3).join(",") === NS2.FieldPaint.COLORS.ERR.join(","), "the family colour");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
