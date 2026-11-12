#!/usr/bin/env node
/**
 * BRE.UI.buildMain / show / activeDocInfo / pdfPresets — the main dialog
 * built from the shared kit, driven through its controls' handlers.
 *
 * What a mock can show: which rows the dialog builds, in which order, what
 * the live check writes and when the run closes the dialog. Where Illustrator
 * draws it is measured with tools/ui-probe (Task 7).
 */
var T = require("./lib/load.js");
var CHAR_W = require("../../shared/tests/lib_scriptui_mock.js").CHAR_W;

T.boot();
T.load("../shared/lib/field_paint.js");
T.load("../shared/lib/ui_kit.js");
buildFieldPaint(BRE);
buildUiKit(BRE);
T.load("src/core.js");
T.load("src/ui.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function eq(a, b, msg) { assert(a === b, msg + " (got " + JSON.stringify(a) + ")"); }

// --- A fake disk: what File and Folder see ---------------------------------
var FS;
function resetFs() {
    FS = {
        files: { "/t/vizitky.ai": 100 },        // path -> modified
        folders: { "/src": 12, "/out": 0 },     // path -> PDF count
        canCreate: true,
        created: []
    };
}
function base(p) { return String(p).replace(/^.*\//, ""); }
global.File = function (p) {
    this.fsName = p;
    this.name = base(p);
    this.displayName = base(p);
    this.exists = FS.files.hasOwnProperty(p);
    this.modified = FS.files[p];
};
global.Folder = function (p) {
    this.fsName = p;
    this.exists = FS.folders.hasOwnProperty(p);
    this.create = function () {
        FS.created.push(p);
        if (FS.canCreate) { FS.folders[p] = 0; }
        return FS.canCreate;
    };
};

// The real functions over app, tested at the end; the dialog gets stubs.
var realInfo = BRE.UI.activeDocInfo, realPresets = BRE.UI.pdfPresets;

// --- Stubs of the thin layer over File/Folder/app ---------------------------
var countCalls = 0;
BRE.UI.countPdfs = function (p) {
    countCalls++;
    return FS.folders.hasOwnProperty(p) ? FS.folders[p] : -1;
};
BRE.UI.facts = function (t, pdfCount) {
    return {
        templateExists: FS.files.hasOwnProperty(t.template),
        templateIsAi: /\.ai$/i.test(t.template),
        templateOpenUnsaved: false,
        sourceExists: FS.folders.hasOwnProperty(t.source),
        pdfCount: pdfCount,
        outputExists: FS.folders.hasOwnProperty(t.output),
        sameFolder: t.source === t.output
    };
};
var PRESETS = ["[Illustrator Default]", "[Kvalitní tisk]", "[PDF/X-4:2008]"];
BRE.UI.pdfPresets = function () { return PRESETS.slice(0); };
var DOC = { state: "none", path: "" };
BRE.UI.activeDocInfo = function () { return DOC; };
// Three sources, each modified at 50.
BRE.UI.listPdfs = function (folder) {
    var out = [], names = ["a.pdf", "b.pdf", "c.pdf"], i, f;
    for (i = 0; i < names.length; i++) {
        f = new File(folder.fsName + "/" + names[i]);
        f.modified = 50;
        out.push(f);
    }
    return out;
};
var asked = [], answer = true;
global.confirm = function (q, noAsDefault) { asked.push([q, noAsDefault]); return answer; };

function saved(over) {
    var s = {
        template: "/t/vizitky.ai", output: "/out", pattern: "{n}_{template}_{source}",
        preset: "[PDF/X-4:2008]", openAfter: true, skip: false
    };
    for (var k in over) { if (over.hasOwnProperty(k)) { s[k] = over[k]; } }
    return s;
}
// Records each close: its code and what result() held at that moment.
// The shared mock's close() only sets closed, so the wrapper lives here.
function recordClose(d) {
    var orig = d.w.close;
    d.closes = [];
    d.w.close = function (v) {
        d.closes.push({ code: v, result: d.result() });
        return orig.apply(this, arguments);
    };
    return d;
}
function fresh(over, doc) {
    resetFs();
    countCalls = 0;
    asked = [];
    answer = true;
    DOC = doc || { state: "none", path: "" };
    return recordClose(BRE.UI.buildMain(saved(over || {})));
}
function type(field, text) { field.text = text; field.onChanging(); }
function walk(c, fn) {
    fn(c);
    for (var i = 0; i < c.children.length; i++) { walk(c.children[i], fn); }
}
function types(group) {
    var out = [], i;
    for (i = 0; i < group.children.length; i++) { out.push(group.children[i].type); }
    return out.join(",");
}
function isRed(et) {
    var p = et.graphics.foregroundColor;
    return !!p && p.color[0] === BRE.FieldPaint.COLORS.ERR[0] && p.color[1] === BRE.FieldPaint.COLORS.ERR[1];
}
function example(d) {
    var found = null;
    walk(d.w, function (c) { if (c.type === "statictext" && c.props && c.props.truncate === "middle") { found = c; } });
    return found;
}

console.log("\n=== layout: two panels from the kit, one axis, status line, footer ===");
var d = fresh({});
eq(d.w.text, BRE.Config.ui.title, "window title");
var kids = d.w.children;
eq(types(d.w), "panel,panel,statictext,group", "Soubory, Pojmenování a formát, status line, footer");
eq(kids[0].text, "Soubory", "first panel");
eq(kids[1].text, "Pojmenování a formát", "second panel");
var files = kids[0], fmt = kids[1];
eq(types(files.children[0]), "statictext,edittext,button", "template row: label, field, Vybrat…");
eq(files.children[0].children[1], d.template, "template is the first row's field");
eq(types(files.children[1]), "statictext,button", "active document row: empty label, button");
eq(files.children[1].children[0].text, "", "active document row: empty label on the axis");
eq(files.children[1].children[1], d.activeBtn, "activeBtn sits under the template");
eq(d.activeBtn.text, "Použít aktivní dokument", "activeBtn text");
eq(d.activeBtn.helpTip, BRE.L.TIP_ACTIVE_DOC, "activeBtn tip");
eq(files.children[2].children[1], d.source, "source row third");
eq(files.children[3].children[1], d.output, "output row fourth");
eq(types(files.children[4]) + "|" + types(files.children[5]), "statictext,checkbox|statictext,checkbox",
    "two checkbox rows under the output folder");
eq(files.children[4].children[1], d.skip, "skip is the first checkbox");
eq(files.children[5].children[1], d.open, "open is the second checkbox");
eq(d.skip.text + "|" + d.open.text, "Přeskočit hotové výstupy|Po dokončení otevřít cílovou složku", "checkbox texts");
eq(files.children.length, 6, "Soubory has six rows");
eq(files.children[0].children[0].text + "|" + files.children[2].children[0].text + "|" + files.children[3].children[0].text,
    "Šablona (.ai):|Zdrojová složka:|Cílová složka:", "path labels");
eq(files.children[0].children[2].text, "Vybrat…", "Vybrat… on a path row");
eq(types(fmt.children[0]), "statictext,edittext", "pattern row");
eq(fmt.children[0].children[1], d.pattern, "pattern field");
eq(fmt.children[0].children[0].text, "Vzor pojmenování:", "pattern label");
eq(types(fmt.children[1]), "statictext,statictext", "legend row: empty label, legend");
eq(fmt.children[1].children[0].text, "", "legend row: empty label");
eq(fmt.children[1].children[1].text, BRE.L.NAMING_LEGEND, "legend text");
eq(fmt.children[1].children[1].enabled, false, "legend is greyed");
eq(fmt.children[2].children[0].text, "Příklad názvu:", "example label");
var ex = fmt.children[2].children[1];
eq(ex, example(d), "the example value is the truncated statictext");
eq(ex.characters, BRE.UiKit.TEXT_CHARS, "example sized like a text field");
eq(ex.text, "01_vizitky_zdroj.pdf", "example from the remembered pattern and template");
eq(types(fmt.children[3]), "statictext,dropdownlist", "preset row");
eq(fmt.children[3].children[1], d.preset, "preset list");
eq(fmt.children[3].children[0].text, "PDF preset:", "preset label");
eq(fmt.children.length, 4, "Pojmenování a formát has four rows");
eq(kids[2], d.status, "status line above the footer");
eq(d.status.props && d.status.props.truncate, "end", "status line from the kit");
var foot = kids[3];
var btns = foot.all("button");
eq(btns.length, 2, "footer: two buttons");
eq(btns[0].text + "|" + btns[1].text, "Storno|Spustit", "Storno then Spustit");
eq(btns[0].props.name + "|" + btns[1].props.name, "cancel|ok", "button names");
eq(btns[1], d.runBtn, "runBtn is Spustit");
eq(foot.children[0].text, BRE.UiKit.COPYRIGHT + BRE.Config.version, "footer copyright with version");

// One axis over both panels: every label as wide as the widest, the empty ones too.
var axisW = "Vzor pojmenování:".length * CHAR_W;
var labels = [], i;
for (i = 0; i < files.children.length; i++) { labels.push(files.children[i].children[0]); }
for (i = 0; i < fmt.children.length; i++) { labels.push(fmt.children[i].children[0]); }
var locked = true;
for (i = 0; i < labels.length; i++) {
    var L = labels[i];
    if (!(L.preferredSize.width === axisW && L.minimumSize.width === axisW && L.maximumSize.width === axisW)) {
        locked = false;
        console.log("    label not on the axis: \"" + L.text + "\" " + L.preferredSize.width);
    }
}
assert(locked, "one axis of " + axisW + " px over all ten labels of both panels");

var spacingWritten = [], fontWritten = [];
walk(d.w, function (c) {
    if (c.hasOwnProperty("margins") || c.hasOwnProperty("spacing")) {
        spacingWritten.push(c.type + " " + c.text);
    }
    if (c.graphics && Object.prototype.hasOwnProperty.call(c.graphics, "font")) { fontWritten.push(c.type + " " + c.text); }
});
eq(spacingWritten.join("; "), "", "native spacing: no margins or spacing written");

console.log("\n=== no bold ===");
eq(fontWritten.join("; "), "", "no control's graphics.font was written");

console.log("\n=== open: remembered settings, empty source ===");
d = fresh({ skip: true, openAfter: false });
eq(d.template.text, "/t/vizitky.ai", "remembered template");
eq(d.output.text, "/out", "remembered output");
eq(d.source.text, "", "source is not remembered");
eq(d.pattern.text, "{n}_{template}_{source}", "remembered pattern");
eq(d.skip.value, true, "remembered skip");
eq(d.open.value, false, "remembered open after");
eq(BRE.UiKit.listValue(d.preset), "[PDF/X-4:2008]", "remembered preset selected");
eq(d.runBtn.enabled, false, "Spustit is grey");
eq(d.status.text, "✗ Vyberte zdrojovou složku.", "status says the source error");
eq(d.source.active, true, "focus in Zdrojová složka");
assert(isRed(d.source), "the empty source is painted red");
eq(d.template.sharedDefaultPen, undefined, "a valid field is never painted");
eq(countCalls, 0, "an empty source is not listed");
eq(d.result(), null, "no result before Run");

console.log("\n=== open: missing preset and empty source ===");
d = fresh({ preset: "X" });
eq(d.preset.selection.text, "X  (chybí)", "the preset shows as missing");
eq(d.preset.selection.kitMissing, true, "flagged missing");
eq(d.runBtn.enabled, false, "Spustit is grey");
eq(d.status.text, "✗ Vyberte zdrojovou složku. Další chyby: 1.", "first error, then the count of the rest");

console.log("\n=== open: nothing remembered — the default preset ===");
d = fresh({ preset: "" });
eq(BRE.UiKit.listValue(d.preset), "[Kvalitní tisk]", "first preset matching presetSearchPatterns");
PRESETS = ["[A]", "[B]"];
d = fresh({ preset: "" });
eq(BRE.UiKit.listValue(d.preset), "[A]", "no match: the first item");
PRESETS = [];
d = fresh({ preset: "" });
eq(d.preset.selection, null, "no presets: nothing selected");
d.source.text = "/src";
d.source.onChanging();
eq(d.status.text, "✗ Vyberte PDF preset.", "no preset: an error");
PRESETS = ["[Illustrator Default]", "[Kvalitní tisk]", "[PDF/X-4:2008]"];

console.log("\n=== typing a valid source ===");
d = fresh({});
type(d.source, "/src");
eq(d.runBtn.enabled, true, "Spustit is live");
eq(d.status.text, "✓ Ve zdrojové složce je 12 PDF.", "status counts the PDFs");
assert(!isRed(d.source), "the source is no longer red");
eq(countCalls, 1, "the source was listed once");
type(d.pattern, "{n}_x");
eq(countCalls, 1, "typing in the pattern does not list the source again");
eq(example(d).text, "01_x.pdf", "the example follows the pattern");
type(d.output, "/out2");
type(d.template, "/t/vizitky.ai");
eq(countCalls, 1, "typing in the other paths does not list the source either");
eq(d.status.text, "⚠ Cílová složka neexistuje, běh ji vytvoří.", "a new output folder is a warning");
eq(d.runBtn.enabled, true, "a warning keeps Spustit live");
type(d.pattern, "x");
eq(d.runBtn.enabled, false, "a pattern without {n} greys Spustit");
assert(isRed(d.pattern), "the pattern is painted red");
eq(d.status.text, "✗ Vzor pojmenování musí obsahovat {n}, jinak by se výstupy přepisovaly.", "pattern error");
type(d.pattern, "{n}");
assert(!isRed(d.pattern), "a fixed pattern gets its colour back");
type(d.source, "/src ");
eq(countCalls, 2, "a changed source path is listed again");
eq(d.status.text, "✗ Zdrojová složka neexistuje.", "an unknown folder");
type(d.source, "/out");
eq(d.status.text, "✗ Ve zdrojové složce nejsou žádné PDF.", "a folder without PDFs");
type(d.output, "/out");
eq(d.status.text, "✗ Ve zdrojové složce nejsou žádné PDF. Další chyby: 1.", "two errors");
assert(isRed(d.output), "same folder: output red");
d.preset.selection = 0;
d.preset.onChange();
eq(BRE.UiKit.listValue(d.preset), "[Illustrator Default]", "another preset picked");
eq(d.status.text, "✗ Ve zdrojové složce nejsou žádné PDF. Další chyby: 1.", "the preset change re-runs the check");

console.log("\n=== Vybrat… re-runs the check ===");
d = fresh({ template: "" });
global.Folder.selectDialog = function () { return { fsName: "/src" }; };
global.File.openDialog = function () { return { fsName: "/t/vizitky.ai" }; };
eq(d.status.text, "✗ Vyberte šablonu. Další chyby: 1.", "before: template and source missing");
files = d.w.children[0];
files.children[2].children[2].onClick();
eq(d.source.text, "/src", "a picked source fills the field");
eq(d.status.text, "✗ Vyberte šablonu.", "the pick re-ran the check");
eq(countCalls, 1, "the picked source was listed");
files.children[0].children[2].onClick();
eq(d.template.text, "/t/vizitky.ai", "a picked template fills the field");
eq(d.status.text, "✓ Ve zdrojové složce je 12 PDF.", "the template pick re-ran the check");
eq(example(d).text, "01_vizitky_zdroj.pdf", "the example takes the picked template's name");
FS.folders["/src"] = 4;
files.children[2].children[2].onClick();
eq(countCalls, 2, "picking the same source again lists it again (PDFs copied in meanwhile)");
eq(d.status.text, "✓ Ve zdrojové složce jsou 4 PDF.", "the new count");

console.log("\n=== active doc ===");
d = fresh({ template: "/t/old.ai" }, { state: "never", path: "" });
eq(d.activeBtn.enabled, true, "a document is open: the button is live");
d.activeBtn.onClick();
eq(d.template.text, "/t/old.ai", "never saved: the template field is unchanged");
eq(d.status.text, "✗ Aktivní dokument ještě není uložený. Uložte ho jako .ai a zkuste to znovu.", "never saved: says why");
d = fresh({ template: "/t/old.ai" }, { state: "notAi", path: "/x/leták.pdf" });
d.activeBtn.onClick();
eq(d.template.text, "/t/old.ai", "not .ai: the template field is unchanged");
eq(d.status.text, "✗ Aktivní dokument není šablona .ai.", "not .ai: says why");
d = fresh({ template: "" }, { state: "ok", path: "/t/vizitky.ai" });
type(d.source, "/src");
eq(d.status.text, "✗ Vyberte šablonu.", "before the click: no template");
d.activeBtn.onClick();
eq(d.template.text, "/t/vizitky.ai", "saved .ai: the template field is the path");
eq(d.status.text, "✓ Ve zdrojové složce je 12 PDF.", "saved .ai: the check ran again");
eq(d.runBtn.enabled, true, "saved .ai: Spustit is live");
d = fresh({});
eq(d.activeBtn.enabled, false, "no document: the button is grey");

console.log("\n=== activeDocInfo and pdfPresets (real) ===");
global.app.documents = { length: 0 };
eq(realInfo().state, "none", "no document: none");
global.app.documents = { length: 1 };
global.app.activeDocument = {};
Object.defineProperty(global.app.activeDocument, "fullName", { get: function () { throw new Error("no file"); } });
var logged = [], realLog = BRE.Core._log;
BRE.Core._log = function (m) { logged.push(m); };
eq(realInfo().state, "never", "fullName throws: never");
eq(logged.length === 1 && /activeDocInfo: no file: no file/.test(logged[0]), true, "fullName throws: logged, not silent");
BRE.Core._log = realLog;
// Illustrator may hand back a File that is not on disk instead of throwing.
var untitled = { fsName: "/Users/x/Bez názvu-1", name: "Bez názvu-1", exists: false };
global.app.activeDocument = { fullName: untitled };
var info = realInfo();
eq(info.state + "|" + info.path, "never|", "a File not on disk (Bez názvu-1): never, no path");
global.app.activeDocument = { fullName: { fsName: "", exists: false } };
eq(realInfo().state, "never", "fullName without a path: never");
global.app.activeDocument = { fullName: { fsName: "/x/leták.pdf", exists: true } };
eq(realInfo().state, "notAi", "a PDF: notAi");
global.app.activeDocument = { fullName: { fsName: "/x/Vizitky.AI", exists: true } };
info = realInfo();
eq(info.state + " " + info.path, "ok /x/Vizitky.AI", "an .AI file in any case: ok with its path");
// The click, through the real function, on a never-saved document that
// returns a File.
global.app.activeDocument = { fullName: untitled };
BRE.UI.activeDocInfo = realInfo;
d = fresh({ template: "/t/old.ai" });
BRE.UI.activeDocInfo = function () { return DOC; };
eq(d.activeBtn.enabled, true, "Bez názvu-1: the button is live");
d.activeBtn.onClick();
eq(d.template.text, "/t/old.ai", "Bez názvu-1: the template field is unchanged");
eq(d.status.text, "✗ Aktivní dokument ještě není uložený. Uložte ho jako .ai a zkuste to znovu.",
    "Bez názvu-1: says it was never saved, not that it is no .ai");
global.app.PDFPresetsList = ["[P1]", "[P2]"];
eq(realPresets().join(","), "[P1],[P2]", "pdfPresets: the app's list");
Object.defineProperty(global.app, "PDFPresetsList", { get: function () { throw new Error("no list"); } });
eq(realPresets().join(","), "[High Quality Print]", "pdfPresets: the fallback when the app refuses");
global.app.documents = { length: 0 };

console.log("\n=== run: overwrite declined ===");
d = fresh({});
type(d.source, "/src");
FS.files["/out/01_vizitky_a.pdf"] = 10;
FS.files["/out/02_vizitky_b.pdf"] = 10;
answer = false;
d.runBtn.onClick();
eq(asked.length, 1, "asked once");
eq(asked.length && asked[0][0], "V cílové složce už je: 2 soubory. Přepsat?", "the question with the count");
eq(asked.length && asked[0][1], false, "Ano is the default");
eq(d.w.closed, false, "declined: the dialog stays open");
eq(d.closes.length, 0, "declined: close() was not called");
eq(d.result(), null, "declined: no result");
eq(d.source.text + "|" + d.output.text + "|" + d.pattern.text, "/src|/out|{n}_{template}_{source}", "declined: every field as it was");
eq(d.runBtn.enabled, true, "declined: Spustit stays live");

console.log("\n=== run: accepted ===");
answer = true;
d.skip.value = true;      // existing outputs older (10) than sources (50): still overwritten
d.open.value = false;
d.runBtn.onClick();
eq(asked.length, 2, "asked again");
eq(asked[1][0], "V cílové složce už je: 2 soubory. Přepsat?", "skip on, older outputs: still counted");
eq(d.w.closed, true, "accepted: the dialog closes");
eq(d.closes.length, 1, "accepted: closed once");
eq(d.closes.length && d.closes[0].code, 1, "accepted: closed with 1, so show() reads it as Run");
var r = d.result();
assert(r !== null, "accepted: a result");
assert(d.closes.length === 1 && d.closes[0].result === r, "result() is the config already when the dialog closes");
if (r) {
    eq(r.skipExisting, true, "skipExisting mirrors the checkbox");
    eq(r.openAfter, false, "openAfter mirrors the checkbox");
    eq(r.pdfFiles.length, 3, "pdfFiles from listPdfs");
    eq(r.pdfFiles[0].fsName, "/src/a.pdf", "pdfFiles listed from the source folder");
    eq(r.templateFile.fsName, "/t/vizitky.ai", "templateFile");
    eq(r.sourceFolder.fsName, "/src", "sourceFolder");
    eq(r.outputFolder.fsName, "/out", "outputFolder");
    eq(r.namingPattern, "{n}_{template}_{source}", "namingPattern");
    eq(r.preset, "[PDF/X-4:2008]", "preset");
    eq(r.templateName, "vizitky", "templateName without the extension");
    var keys = [], k2;
    for (k2 in r) { if (r.hasOwnProperty(k2)) { keys.push(k2); } }
    eq(keys.sort().join(","), "namingPattern,openAfter,outputFolder,pdfFiles,preset,skipExisting,sourceFolder,templateFile,templateName",
        "the config has 1.2.0's shape");
    eq(FS.created.length, 0, "an existing output folder is not created");
}

console.log("\n=== run: skip protects finished outputs from the question ===");
d = fresh({ skip: true });
type(d.source, "/src");
FS.files["/out/01_vizitky_a.pdf"] = 200;    // newer than source (50) and template (100)
FS.files["/out/02_vizitky_b.pdf"] = 10;     // older: will be made again
d.runBtn.onClick();
eq(asked.length && asked[0][0], "V cílové složce už je: 1 soubor. Přepsat?", "only the output the run writes is counted");
eq(d.w.closed, true, "accepted");

console.log("\n=== run: nothing to overwrite, no question ===");
d = fresh({});
type(d.source, "/src");
d.runBtn.onClick();
eq(asked.length, 0, "no existing output: no question");
eq(d.w.closed, true, "closes");

console.log("\n=== run: a missing output folder is created after the question ===");
d = fresh({ output: "/new" });
type(d.source, "/src");
eq(d.status.text, "⚠ Cílová složka neexistuje, běh ji vytvoří.", "warning before the run");
d.runBtn.onClick();
eq(FS.created.join(","), "/new", "the folder was created");
eq(d.w.closed, true, "closes");
eq(d.closes.length && d.closes[0].code, 1, "closes with 1");
eq(d.result() && d.result().outputFolder.fsName, "/new", "result has the new folder");

d = fresh({ output: "/new" });
type(d.source, "/src");
FS.canCreate = false;
d.runBtn.onClick();
eq(d.w.closed, false, "create failed: the dialog stays open");
eq(d.closes.length, 0, "create failed: close() was not called");
eq(d.result(), null, "create failed: no result");
eq(d.status.text, "✗ Cílovou složku se nepodařilo vytvořit. Zkontrolujte cestu a právo do ní zapisovat.", "create failed: says why");

console.log("\n=== run: the check runs again at the click ===");
d = fresh({});
type(d.source, "/src");
eq(d.runBtn.enabled, true, "live after typing");
delete FS.folders["/src"];              // the folder went away while the dialog was open
d.runBtn.onClick();
eq(d.w.closed, false, "a stale check does not run");
eq(asked.length, 0, "no question");
eq(d.status.text, "✗ Zdrojová složka neexistuje.", "the fresh error");
eq(d.runBtn.enabled, false, "Spustit greys");

console.log("\n=== show ===");
resetFs();
var shown = BRE.UI.show(saved({}));
eq(shown, null, "show without a Run returns null");
var last = null;
var Win = global.Window;
global.Window = function (t, ti, b, p) {
    var w = new Win(t, ti, b, p);
    last = w;
    w.show = function () { w.shown++; return 2; };
    return w;
};
eq(BRE.UI.show(saved({})), null, "Storno returns null");
eq(last && last.shown, 1, "the dialog was shown");
global.Window = Win;

console.log("\ntest_dialog: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
