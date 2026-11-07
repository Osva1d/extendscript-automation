// ------------------------------------------------------------------------
// Script:      ui_kit_dialog.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-11-07
// Description: A dialog built only from shared/lib/ui_kit.js, for
//              tools/ui-probe to measure: the rows batch-relink-export and
//              grommet-marks will use, the status line and the footer. Not a
//              tool. build-probe.js puts numbers.js, field_paint.js and
//              ui_kit.js in front of it; the controls are handed to the
//              scenario on w.kitRefs.
// ------------------------------------------------------------------------
var UI_KIT_PROBE = {};
buildNumbers(UI_KIT_PROBE);
buildFieldPaint(UI_KIT_PROBE);
buildUiKit(UI_KIT_PROBE);
UI_KIT_PROBE.L = { DEC_SEP: "," };

(function (NS) {
    var K = NS.UiKit;
    var w = new Window("dialog", "UI kit — sonda");
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    var pFiles = w.add("panel", undefined, "Soubory");
    pFiles.alignChildren = ["fill", "top"];
    var tpl = K.pathRow(pFiles, { label: "Šablona:", button: "Vybrat…", ext: "*.ai", prompt: "Šablona" });
    var src = K.pathRow(pFiles, { label: "Zdrojová složka:", button: "Vybrat…", folder: true, prompt: "Zdroj" });
    var out = K.pathRow(pFiles, { label: "Cílová složka:", value: "/Users/ladislavosvald/Desktop/Výstup/2026/listopad/zakázka-1234",
        button: "Vybrat…", folder: true, prompt: "Cíl" });
    var pat = K.textRow(pFiles, { label: "Vzor pojmenování:", value: "{n}_{name}" });
    var pdf = K.listRow(pFiles, { label: "PDF předvolba:", items: app.PDFPresetsList });
    K.selectItem(pdf.list, "[Neexistující předvolba]", "(chybí)");
    var skip = K.checkRow(pFiles, { text: "Přeskočit hotové výstupy", value: true });
    var axisFiles = K.axis([tpl.label, src.label, out.label, pat.label, pdf.label, skip.label]);

    var pNum = w.add("panel", undefined, "Čísla");
    pNum.alignChildren = ["fill", "top"];
    var gap = K.numberRow(pNum, { label: "Mezera od okraje:", value: 2.5, unit: "mm" });
    var cnt = K.numberRow(pNum, { label: "Počet:", value: 4 });
    var shortCnt = K.numberRow(pNum, { label: "Krátký počet:", value: 12, chars: 4, unit: "ks" });
    var dir = K.radioRow(pNum, { label: "Směr:", options: ["Svisle", "Vodorovně"], selected: 0 });
    var mirror = K.checkRow(pNum, { text: "Zrcadlit protilehlou hranu" });
    var axisNum = K.axis([gap.label, cnt.label, shortCnt.label, dir.label, mirror.label]);

    var status = K.statusLine(w);
    var foot = K.footerRow(w, "0.0.0", [
        { text: "Storno", name: "cancel" },
        { text: "Jen pláty" },
        { text: "Spustit", name: "ok" }
    ]);

    w.kitRefs = {
        K: K, NS: NS, axisFiles: axisFiles, axisNum: axisNum,
        rows: { tpl: tpl, src: src, out: out, pat: pat, pdf: pdf, skip: skip,
            gap: gap, cnt: cnt, shortCnt: shortCnt, dir: dir, mirror: mirror },
        status: status, foot: foot
    };
    w.show();
}(UI_KIT_PROBE));
