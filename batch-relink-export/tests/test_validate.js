#!/usr/bin/env node
/** BRE.UI.validate / facts / listPdfs / countPdfs — the dialog's live check. */
var T = require("./lib/load.js");
T.boot();
T.load("src/core.js");
T.load("src/ui.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function eq(a, b, msg) { assert(a === b, msg + " (got " + JSON.stringify(a) + ")"); }

function good() {
    return {
        template: "/t/a.ai", source: "/s", output: "/o", pattern: "{n}_x",
        preset: { value: "Press", missing: false },
        f: { templateExists: true, templateIsAi: true, templateOpenUnsaved: false,
             sourceExists: true, pdfCount: 12, outputExists: true, sameFolder: false }
    };
}
function check(mut, field, text, kind) {
    var s = good(); mut(s);
    var r = BRE.UI.validate(s);
    var list = kind === "WARN" ? r.warnings : r.errors;
    eq(list.length, 1, text + ": one entry");
    if (list.length) {
        eq(list[0].field, field, text + ": field");
        eq(list[0].text, text, text + ": text");
    }
    eq(r.kind, kind || "ERR", text + ": kind");
}

var ok = BRE.UI.validate(good());
eq(ok.kind, "OK", "valid: kind");
eq(ok.text, "Ve zdrojové složce je 12 PDF.", "valid: text");
eq(ok.errors.length + ok.warnings.length, 0, "valid: no entries");

check(function (s) { s.template = "  "; }, "template", "Vyberte šablonu.");
check(function (s) { s.f.templateExists = false; }, "template", "Šablona se nenašla nebo nemá příponu .ai.");
check(function (s) { s.f.templateIsAi = false; }, "template", "Šablona se nenašla nebo nemá příponu .ai.");
check(function (s) { s.f.templateOpenUnsaved = true; }, "template",
    "Šablona má neuložené změny, běh použije verzi na disku.", "WARN");
check(function (s) { s.source = ""; }, "source", "Vyberte zdrojovou složku.");
check(function (s) { s.f.sourceExists = false; }, "source", "Zdrojová složka neexistuje.");
check(function (s) { s.f.pdfCount = 0; }, "source", "Ve zdrojové složce nejsou žádné PDF.");
check(function (s) { s.output = ""; }, "output", "Vyberte cílovou složku.");
check(function (s) { s.f.sameFolder = true; }, "output",
    "Cílová složka je stejná jako zdrojová, vyberte jinou.");
check(function (s) { s.f.outputExists = false; }, "output", "Cílová složka neexistuje, běh ji vytvoří.", "WARN");
check(function (s) { s.pattern = "abc"; }, "pattern",
    "Vzor musí obsahovat {n}, jinak se výstupy přepíšou.");
check(function (s) { s.preset = { value: "", missing: false }; }, "preset", "Vyberte PDF preset.");
check(function (s) { s.preset = { value: "Old", missing: true }; }, "preset",
    "PDF preset „Old“ v Illustratoru není, vyberte jiný.");

// warnings only
var s = good(); s.f.templateOpenUnsaved = true; s.f.outputExists = false;
var r = BRE.UI.validate(s);
eq(r.kind, "WARN", "unsaved + new output: kind");
eq(r.text, "Šablona má neuložené změny, běh použije verzi na disku.", "unsaved + new output: first warning");
eq(r.warnings.length, 2, "two warnings");

// first error in reading order + count of the rest
s = good(); s.source = ""; s.preset = { value: "Old", missing: true };
r = BRE.UI.validate(s);
eq(r.text, "Vyberte zdrojovou složku. Další chyby: 1.", "two errors: text");
eq(r.errors.length, 2, "two errors: list");

// blank source: same-folder not applied
s = good(); s.source = ""; s.f.sameFolder = true;
r = BRE.UI.validate(s);
eq(r.errors.length, 1, "blank source + sameFolder: only source error");
eq(r.errors[0].field, "source", "blank source + sameFolder: source");

// an error outranks warnings in text and kind
s = good(); s.f.outputExists = false; s.pattern = "x";
r = BRE.UI.validate(s);
eq(r.kind, "ERR", "error + warning: kind");
eq(r.text, "Vzor musí obsahovat {n}, jinak se výstupy přepíšou.", "error + warning: text");

// listPdfs / countPdfs / facts
global.File = function (p) { this.name = p; this.displayName = p; this.fsName = "/x/" + p; this.exists = true; };
function mkFolder(names) {
    return { getFiles: function (filter) {
        var out = [], i;
        for (i = 0; i < names.length; i++) {
            var f = new File(names[i]);
            if (!filter || filter(f)) out.push(f);
        }
        return out;
    } };
}
var list = BRE.UI.listPdfs(mkFolder(["a.PDF", "._a.pdf", ".hidden.pdf", "b.txt", "part_10.pdf", "part_2.pdf"]));
var got = [], i;
for (i = 0; i < list.length; i++) got.push(list[i].name);
eq(got.join(","), "a.PDF,part_2.pdf,part_10.pdf", "listPdfs: filter + natural sort");

// Measured in Illustrator: new Folder(file path) is a Folder that exists
// (getFiles() empty); the function form Folder(path) returns a File there.
var FILE_PATHS = { "/a/file.txt": true };
global.Folder = function (p) {
    if (!(this instanceof global.Folder)) {
        return FILE_PATHS[p] ? { fsName: p, exists: true, name: p } : new global.Folder(p);
    }
    this.fsName = p; this.exists = p !== "/missing";
    this.getFiles = FILE_PATHS[p] ? function () { return []; } : mkFolder(["a.pdf", "b.pdf", "c.txt"]).getFiles;
};
eq(BRE.UI.countPdfs("/missing"), -1, "countPdfs: missing folder");
eq(BRE.UI.countPdfs("/ok"), 2, "countPdfs: counts pdfs");

// a path naming an existing FILE is not a folder
var threw = false, cnt;
try { cnt = BRE.UI.countPdfs("/a/file.txt"); } catch (e) { threw = true; }
eq(threw, false, "countPdfs: file path does not throw");
eq(cnt, -1, "countPdfs: file path is not a folder");

global.app.documents = { length: 1, 0: { fullName: { fsName: "/t/a.ai" }, saved: false } };
global.File = function (p) { this.fsName = p; this.name = p; this.exists = p !== "/t/none.ai"; };
var f = BRE.UI.facts({ template: "/t/a.ai", source: "/S", output: "/s" }, 7);
eq(f.templateExists, true, "facts: template exists");
eq(f.templateIsAi, true, "facts: is .ai");
eq(f.templateOpenUnsaved, true, "facts: open unsaved");
eq(f.sourceExists, true, "facts: source exists");
eq(f.pdfCount, 7, "facts: pdfCount passes through");
eq(f.sameFolder, true, "facts: sameFolder ignores case");
f = BRE.UI.facts({ template: "/t/b.PDF", source: "/missing", output: "/o" }, -1);
eq(f.templateIsAi, false, "facts: not .ai");
eq(f.templateOpenUnsaved, false, "facts: not open");
eq(f.sourceExists, false, "facts: source missing");
eq(f.outputExists, true, "facts: output exists");
eq(f.sameFolder, false, "facts: different folders");

f = BRE.UI.facts({ template: "/t/a.ai", source: "/a/file.txt", output: "/a/file.txt" }, -1);
eq(f.sourceExists, false, "facts: file as source is not a folder");
eq(f.outputExists, false, "facts: file as output is not a folder");
s = good(); s.source = "/a/file.txt"; s.f = f; s.f.templateExists = true; s.f.templateIsAi = true;
r = BRE.UI.validate(s);
eq(r.errors[0].text, "Zdrojová složka neexistuje.", "validate: file as source");

console.log("validate: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
