#!/usr/bin/env node
/**
 * BRE.UI.templateLine / pageMapStatus / checkKind / showCheck / showSummary.
 * A mock shows which lines the window builds and what they say; where
 * Illustrator draws them is measured with tools/ui-probe.
 */
var T = require("./lib/load.js");
var MOCK = require("../../shared/tests/lib_scriptui_mock.js");

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
function walk(c, fn) {
    fn(c);
    for (var i = 0; i < c.children.length; i++) { walk(c.children[i], fn); }
}

var PT = { w: 255.118, h: 141.732 };   // 90 × 50 mm
function info(counts, outside, sizes, map) {
    var n = 0, i;
    for (i = 0; i < counts.length; i++) { n += counts[i]; }
    return { positions: n, perArtboard: { counts: counts, outside: outside },
             sizes: sizes, pageMap: map || { ok: true } };
}
var one = [[PT.w, PT.h]];

console.log("\n=== templateLine ===");
eq(BRE.UI.templateLine("vizitky", info([4, 4], 0, one)),
   "Šablona: vizitky · 8 pozic na 2 kreslicích plátnech (4 + 4) · strana 90 × 50 mm", "two artboards");
eq(BRE.UI.templateLine("vizitky", info([8], 0, one)),
   "Šablona: vizitky · 8 pozic na 1 kreslicím plátně · strana 90 × 50 mm", "one artboard, no brackets");
eq(BRE.UI.templateLine("v", info([8], 0, [[PT.w, PT.h], [240.945, 155.906]])),
   "Šablona: v · 8 pozic na 1 kreslicím plátně · formáty stran: 90 × 50 mm, 85 × 55 mm", "mixed sizes");
assert(/mimo kreslicí plátna: 2/.test(BRE.UI.templateLine("v", info([4, 4], 2, one))), "outside artboards");

console.log("\n=== pageMapStatus ===");
var bad = BRE.Core.describePageMap([1, 1, 3, 4, 5, 6, 7, 8], 8);
var st = BRE.UI.pageMapStatus(bad, 8);
eq(st.kind, "WARN", "bad map kind");
eq(st.text, "Pozice neukazují strany 1–8 každou jednou: strana 1 je na 2 pozicích, chybí 2.", "bad map text");
st = BRE.UI.pageMapStatus(BRE.Core.describePageMap([1, 2, 3, 4, 5, 6, 7, 8], 8), 8);
eq(st.kind, "OK", "ok map kind");
eq(st.text, "Pozice ukazují strany 1–8, každou jednou.", "ok map text");
st = BRE.UI.pageMapStatus(BRE.Core.describePageMap([1, 2, 9, 4], 4), 4);
assert(/strany nad 4: 9/.test(st.text), "beyond part: " + st.text);

console.log("\n=== checkKind ===");
function scanOf(c, processable) {
    var base = { ok: 0, partial: 0, under: 0, over: 0, unreadable: 0 };
    for (var k in c) { if (c.hasOwnProperty(k)) { base[k] = c[k]; } }
    return { items: [], counts: base, processable: processable };
}
eq(BRE.UI.checkKind(scanOf({ over: 3 }, 0), true), "ERR", "nothing processable");
eq(BRE.UI.checkKind(scanOf({ ok: 10, partial: 1 }, 11), true), "WARN", "a deviation");
eq(BRE.UI.checkKind(scanOf({ ok: 11 }, 11), true), "OK", "all ok");
eq(BRE.UI.checkKind(scanOf({ ok: 11 }, 11), false), "WARN", "all ok, bad map");

console.log("\n=== showCheck ===");
function pdf(n) { return { name: n + ".pdf", displayName: n + ".pdf" }; }
function run(infoObj, scan, n) {
    MOCK.windows.length = 0;
    var files = [], i;
    for (i = 0; i < n; i++) { files.push(pdf("f" + i)); }
    var ok = BRE.UI.showCheck({ namingPattern: "{n}_{source}", templateName: "vizitky",
        pdfFiles: files }, infoObj, scan);
    return { w: MOCK.windows[MOCK.windows.length - 1], ok: ok };
}
function texts(w) {
    var out = [];
    walk(w, function (c) { if (c.type === "statictext") { out.push(c.text); } });
    return out;
}
function detailsOf(w) {
    var det = null;
    walk(w, function (c) { if (c.type === "edittext") { det = c; } });
    return det;
}
var badInfo = info([4, 4], 0, one, bad);
var scan = scanOf({ ok: 10, partial: 1, under: 1 }, 12);
scan.items = [{ name: "last.pdf", pages: 3, status: "partial" }, { name: "mid.pdf", pages: 5, status: "under" }];
var r = run(badInfo, scan, 12);
var t = texts(r.w);
eq(r.w.text, "Kontrola souborů", "title");
eq(t[0], "⚠ Zpracovat jde 12 z 12 archů, 2 s upozorněním. Blokováno: 0.", "verdict line");
eq(t[1], BRE.UI.templateLine("vizitky", badInfo), "template line second");
assert(t[2].indexOf("⚠ Pozice neukazují") === 0, "page map line third: " + t[2]);
assert(t[3].indexOf("Zdrojových PDF: 12 · Příklad názvu: ") === 0, "sources line: " + t[3]);
eq(t[4], "Počet stran proti 8 pozicím:", "header");
var dl = detailsOf(r.w).text.split("\n");
eq(dl[0], BRE.UI.pageMapStatus(badInfo.pageMap, 8).text, "check details: map explanation first");
eq(dl[1], BRE.L.CHECK_MAP_MANUAL, "check details: bad map with a short sheet");

r = run(info([4, 4], 0, one), scan, 12);
assert(detailsOf(r.w).text.indexOf(BRE.L.CHECK_MAP_MANUAL) === -1, "ok map: no manual note");

r = run(info([8], 0, one), scanOf({ over: 2 }, 0), 2);
t = texts(r.w);
assert(t[0].indexOf("✗ ") === 0, "ERR verdict");
assert(t.indexOf(BRE.L.SCAN_NONE) !== -1, "SCAN_NONE shown");
var cont = null;
walk(r.w, function (c) { if (c.type === "button" && c.text === BRE.L.BTN_CONTINUE) { cont = c; } });
eq(cont.enabled, false, "Continue disabled");

console.log("\n=== showSummary ===");
var seen = null;
BRE.Summary = { show: function (o) { seen = o; } };
var res = { success: 1, errors: 0, skipped: 0, blocked: 0, removed: 0, manual: 0,
            cancelled: false, total: 1, log: ["a: x"] };
BRE.UI.showSummary(res, badInfo, { templateName: "vizitky" });
eq(seen.intro, BRE.UI.templateLine("vizitky", badInfo), "intro");
eq(seen.details[0], BRE.UI.pageMapStatus(bad, 8).text, "map status first");
eq(seen.details[1], "a: x", "then the log");
BRE.UI.showSummary(res, info([8], 0, one), { templateName: "vizitky" });
eq(seen.details.length, 1, "ok map: log only");

console.log("\ntest_check: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
