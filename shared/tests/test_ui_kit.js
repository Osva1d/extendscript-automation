#!/usr/bin/env node
/**
 * shared/lib/ui_kit.js — the family's dialog parts.
 *
 * What a mock can show: which controls a part builds, in which order, with
 * which widths, texts, tips and wiring. What it cannot: where Illustrator
 * draws them; that is measured with tools/ui-probe.
 */
var fs = require("fs");
var path = require("path");
var mock = require("./lib_scriptui_mock.js");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "ui_kit.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "..", "lib", "numbers.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function widthLocked(ctrl, w) {
    return ctrl.preferredSize.width === w && ctrl.minimumSize.width === w && ctrl.maximumSize.width === w;
}
function types(group) {
    var out = [], i;
    for (i = 0; i < group.children.length; i++) { out.push(group.children[i].type); }
    return out.join(",");
}

var logged = [];
var painted = [];
var NS = {
    L: { DEC_SEP: "," },
    Utils: { log: function (m) { logged.push(m); } },
    FieldPaint: { status: function (ctrl, kind) { painted.push([ctrl, kind]); } }
};
buildNumbers(NS);
buildUiKit(NS);
var K = NS.UiKit;

function dialog() { return new Window("dialog", "Test"); }

console.log("\n=== lockW and axis ===");
var w = dialog();
var a = w.add("statictext", undefined, "Krátký:");
var b = w.add("statictext", undefined, "Mnohem delší popisek:");
var pad = w.add("statictext", undefined, "");
K.lockW(a, 50);
assert(widthLocked(a, 50), "lockW pins preferred, minimum and maximum width");
var axisW = K.axis([a, b, pad]);
assert(axisW === "Mnohem delší popisek:".length * mock.CHAR_W, "the axis is the widest label, measured");
assert(widthLocked(a, axisW) && widthLocked(b, axisW), "every label of the axis gets its width");
assert(widthLocked(pad, axisW), "an empty label (a checkbox row's) is locked too, not measured");

console.log("\n=== numberRow: label, field of 7 characters, unit 5 px after it ===");
w = dialog();
var nr = K.numberRow(w, { label: "Mezera:", value: 2.5, tip: "Mezera od okraje.", unit: "mm" });
assert(nr.row.type === "group" && types(nr.row) === "statictext,group", "a row of a label and a field group");
assert(nr.label.text === "Mezera:" && nr.label.helpTip === "Mezera od okraje.", "the label with its tip");
assert(nr.field.type === "edittext" && nr.field.characters === K.NUMBER_CHARS && K.NUMBER_CHARS === 7, "the field is 7 characters");
assert(nr.field.text === "2,5", "a number goes in with the Czech separator, unrounded (Numbers.format)");
assert(nr.field.helpTip === "Mezera od okraje.", "the field has the label's tip");
assert(nr.unit && nr.unit.text === "mm" && nr.row.children[1].children[1] === nr.unit, "the unit after the field");
assert(nr.row.children[1].spacing === K.TIGHT && K.TIGHT === 5, "field and unit 5 px apart");
var nr2 = K.numberRow(w, { label: "Počet:", value: "3", chars: 4 });
assert(nr2.field.text === "3" && nr2.field.characters === 4, "a string value as it is; a short count may take 4 characters");
assert(nr2.unit === null && nr2.row.children[1].children.length === 1, "no unit: no unit text, the field in the same place");
assert(nr2.label.helpTip === undefined, "no tip: none written");

console.log("\n=== textRow: the field takes the rest of the row ===");
w = dialog();
var tr = K.textRow(w, { label: "Vzor pojmenování:", value: "{n}_{name}", tip: "Vzor." });
assert(tr.field.text === "{n}_{name}" && tr.field.characters === K.TEXT_CHARS && K.TEXT_CHARS === 24, "24 characters");
assert(tr.field.alignment[0] === "fill", "fills the row");
assert(tr.row.alignment[0] === "fill", "the row fills its panel");

console.log("\n=== pathRow: label, path field, Vybrat… capped at 90 px ===");
var picked = { folder: null, file: null, filter: null };
var answer = { fsName: "/Users/x/Výstup" };
global.Folder = { selectDialog: function (p) { picked.folder = p; return answer; } };
global.File = function (p) { this.path = p; this.exists = !!global.File.existing[p]; };
global.File.existing = {};
global.File.openDialog = function (p, f) { picked.file = p; picked.filter = f; return answer; };
w = dialog();
var pickedRows = [];
var pr = K.pathRow(w, { label: "Cílová složka:", value: "/old", tip: "Kam se ukládá.",
    tipButton: "Vybere složku.", button: "Vybrat…", folder: true, prompt: "Vyberte cílovou složku",
    onPick: function (f) { pickedRows.push(f); } });
assert(types(pr.row) === "statictext,edittext,button", "label, field, button");
assert(pr.field.text === "/old" && pr.field.characters === 26 && pr.field.alignment[0] === "fill", "the path field: 26 characters, fills");
assert(pr.button.text === "Vybrat…" && pr.button.maximumSize.width === K.BROWSE_MAX && K.BROWSE_MAX === 90, "the button is capped at 90 px");
assert(pr.button.helpTip === "Vybere složku." && pr.field.helpTip === "Kam se ukládá.", "the button's own tip, the field the label's");
pr.button.onClick();
assert(picked.folder === "Vyberte cílovou složku" && pr.field.text === "/Users/x/Výstup", "a picked folder fills the field");
assert(pickedRows.length === 1 && pickedRows[0] === pr.field, "onPick hears of it, with the field");
answer = null;
pr.button.onClick();
assert(pr.field.text === "/Users/x/Výstup" && pickedRows.length === 1, "a cancelled picker changes nothing");
answer = { fsName: "/Users/x/a.ai" };
var pf = K.pathRow(w, { label: "Šablona:", button: "Vybrat…", folder: false, ext: "*.ai", prompt: "Vyberte šablonu" });
assert(pf.field.text === "" && pf.button.helpTip === undefined, "no value: empty; no tips: none written");
pf.button.onClick();
assert(picked.file === "Vyberte šablonu" && picked.filter === "*.ai" && pf.field.text === "/Users/x/a.ai", "a file picker with its type");
global.Folder.selectDialog = function () { throw new Error("picker refused"); };
logged.length = 0;
var threw = false;
try { pr.button.onClick(); } catch (e) { threw = true; }
assert(!threw && logged.length === 1 && /pathRow: picker refused/.test(logged[0]), "a picker that throws is logged, not thrown");

console.log("\n=== listRow and selectItem: a missing value shows as missing ===");
w = dialog();
var lr = K.listRow(w, { label: "PDF předvolba:", items: ["[Kvalitní tisk]", "[PDF/X-4:2008]"], tip: "Předvolba." });
assert(lr.list.type === "dropdownlist" && lr.list.items.length === 2 && lr.list.alignment[0] === "fill", "the list fills the row");
assert(lr.list.helpTip === "Předvolba.", "the list has the label's tip");
K.selectItem(lr.list, "[PDF/X-4:2008]", "(chybí)");
assert(lr.list.selection.text === "[PDF/X-4:2008]" && K.listValue(lr.list) === "[PDF/X-4:2008]", "an existing value is selected");
K.selectItem(lr.list, "[Moje]", "(chybí)");
assert(lr.list.items.length === 3 && lr.list.selection.text === "[Moje]  (chybí)", "a missing one is added as \"name  (chybí)\" and selected");
assert(lr.list.selection.kitMissing === true && K.listValue(lr.list) === "[Moje]", "its value is the name, flagged missing");
K.selectItem(lr.list, "[Kvalitní tisk]", "(chybí)");
assert(lr.list.items.length === 2 && K.listValue(lr.list) === "[Kvalitní tisk]", "the next selection removes the missing item");
K.selectItem(lr.list, "[kvalitní TISK]", "(chybí)", function (x, y) { return x.toLowerCase() === y.toLowerCase(); });
assert(lr.list.items.length === 2 && lr.list.selection.index === 0, "a comparison of its own may match differently");
K.selectItem(lr.list, "", "(chybí)");
assert(lr.list.selection.index === 0, "no value: the first item");
var empty = K.listRow(w, { label: "Barva:" });
K.selectItem(empty.list, "", "(chybí)");
assert(empty.list.selection === null && K.listValue(empty.list) === "", "an empty list selects nothing and reads as \"\"");

console.log("\n=== radioRow: label level with the buttons ===");
w = dialog();
var rr = K.radioRow(w, { label: "Směr:", options: ["Svisle", "Vodorovně"], selected: 1, tip: "Směr dělení." });
assert(types(rr.row) === "statictext,radiobutton,radiobutton", "label and one button per option, in one row");
assert(rr.buttons[0].value === false && rr.buttons[1].value === true, "the selected one is on");
assert(rr.buttons[0].helpTip === "Směr dělení." && rr.label.helpTip === "Směr dělení.", "every part has the tip");
assert(rr.label.alignment[1] === "top", "the label sits at the top of the row (TE levelWithButton, measured)");

console.log("\n=== checkRow: the box starts on the field axis, its text is on it ===");
w = dialog();
var cr = K.checkRow(w, { text: "Přeskočit hotové výstupy", value: 1, tip: "Nepřepíše hotové." });
assert(types(cr.row) === "statictext,checkbox", "an empty label on the axis, then the checkbox");
assert(cr.label.text === "" && cr.box.text === "Přeskočit hotové výstupy", "the text is on the box, not in a label");
assert(cr.box.value === true && cr.box.helpTip === "Nepřepíše hotové.", "value as a boolean, the tip on the box");
var cr2 = K.checkRow(w, { text: "Otevřít" });
assert(cr2.box.value === false, "no value: off");

console.log("\n=== statusLine and setStatus ===");
w = dialog();
var sl = K.statusLine(w, "Připraveno.");
assert(sl.type === "statictext" && sl.props && sl.props.truncate === "end", "one line that truncates at the end");
assert(sl.alignment[0] === "fill" && sl.text === "Připraveno.", "full width, laid out with its first text");
var sl0 = K.statusLine(w);
assert(sl0.text === " ", "no first text: a space, so the line keeps its height");
painted.length = 0;
K.setStatus(sl, "ERR", "Nejde spustit: 2 chyby, viz níže.");
assert(sl.text === "✗ Nejde spustit: 2 chyby, viz níže.", "the symbol of the state goes first");
assert(painted.length === 1 && painted[0][0] === sl && painted[0][1] === "ERR", "painted by FieldPaint.status");
K.setStatus(sl, "WARN", "Pozor.");
assert(sl.text === "⚠ Pozor." && painted[1][1] === "WARN", "warning");
K.setStatus(sl, "OK", "Připraveno: 12 PDF.");
assert(sl.text === "✓ Připraveno: 12 PDF." && painted[2][1] === "OK", "OK");
K.setStatus(sl, "OK", "");
assert(sl.text === "", "an empty text clears the line, no lone symbol");

console.log("\n=== footerRow: greyed author and version left, buttons right ===");
w = dialog();
var fr = K.footerRow(w, "1.3.0", [
    { text: "Storno", name: "cancel" },
    { text: "Jen pláty", tip: "Nakreslí pláty bez exportu." },
    { text: "Spustit", name: "ok" }
]);
assert(types(fr.row) === "statictext,group,group", "author, slack, buttons");
assert(fr.copy.text === "© 2025–2026 Ladislav Osvald · v1.3.0" && fr.copy.enabled === false, "the family's footer, greyed");
assert(fr.row.alignment[0] === "fill" && fr.row.children[1].alignment[0] === "fill", "the slack goes between them");
var btns = fr.row.children[2];
assert(btns.alignment[0] === "right" && btns.children.length === 3, "the buttons in a group of their own, right");
assert(fr.buttons.length === 3 && fr.buttons[0].text === "Storno" && fr.buttons[2].text === "Spustit", "in the order given");
assert(fr.buttons[0].props.name === "cancel" && fr.buttons[2].props.name === "ok", "Esc and Enter names");
assert(fr.buttons[1].props === undefined && fr.buttons[1].helpTip === "Nakreslí pláty bez exportu.", "a side action with its tip");

console.log("\n=== existingCount and confirmOverwrite ===");
global.File.existing = { "/out/1.pdf": true, "/out/3.pdf": true };
assert(K.existingCount(["/out/1.pdf", "/out/2.pdf", "/out/3.pdf"]) === 2, "counts the files already there");
assert(K.existingCount([]) === 0, "none given: 0");
var realFile = global.File;
global.File = function () { throw new Error("no access"); };
logged.length = 0;
assert(K.existingCount(["/x"]) === 1 && /existingCount: no access/.test(logged[0]), "a file that cannot be checked counts as there, and is logged");
global.File = realFile;
var asked = [];
var reply = true;
global.confirm = function (q, noAsDefault) { asked.push([q, noAsDefault]); return reply; };
assert(K.confirmOverwrite(0, "?") === true && asked.length === 0, "nothing to overwrite: no question, go on");
assert(K.confirmOverwrite(3, "V cílové složce už jsou 3 soubory. Přepsat?") === true, "Ano: go on");
assert(asked.length === 1 && asked[0][0] === "V cílové složce už jsou 3 soubory. Přepsat?", "the tool's question, as it is");
assert(asked[0][1] === false, "Ano is the default button");
reply = false;
assert(K.confirmOverwrite(1, "?") === false, "Ne: back to the dialog");

console.log("\n=== the kit writes no spacing and no heights ===");
// Native spacing and heights (design system §2.4, §2.5): the only spacing
// written is TIGHT, the only sizes are widths.
var all = [], wi, stack, node, ci;
for (wi = 0; wi < mock.windows.length; wi++) {
    stack = [mock.windows[wi]];
    while (stack.length) {
        node = stack.pop();
        all.push(node);
        for (ci = 0; ci < node.children.length; ci++) { stack.push(node.children[ci]); }
    }
}
var badSpacing = 0, heights = 0, margins = 0;
for (ci = 0; ci < all.length; ci++) {
    if (all[ci].spacing !== undefined && all[ci].spacing !== K.TIGHT) { badSpacing++; }
    if (all[ci].margins !== undefined) { margins++; }
    if (all[ci].preferredSize.height !== undefined || all[ci].minimumSize.height !== undefined ||
        all[ci].maximumSize.height !== undefined) { heights++; }
}
assert(badSpacing === 0 && margins === 0 && heights === 0, "no spacing but TIGHT, no margins, no heights");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
