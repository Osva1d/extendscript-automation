// ------------------------------------------------------------------------
// Probe: BRE.Core.inspectTemplate on synthetic templates (1.3.0, Task 7)
// Part of: batch-relink-export tests — run in Illustrator, not in Node
//
// Builds templates in a temp folder from an 8-page PDF written by
// BRE.Pdf.writeProbe (page k is 100 + 10k pt wide, so a placed position's
// width tells its page), runs inspectTemplate on each, and checks that a
// template the "operator" has open — saved, or with an unsaved change — is
// left exactly as it was. Also records three engine facts the dialog relies
// on: fullName of a never-saved document, new Folder() of a file path, and
// fsName with a trailing slash.
//
// Run with Illustrator empty (the probe refuses otherwise):
//   tools/ai-eval.sh -t 180 -e '$.global.BRE_ROOT="<worktree>"; $.evalFile(new File("<worktree>/batch-relink-export/tests/probes/inspect_template.jsx"))'
// It closes only the documents it opened and removes its temp folder.
// ------------------------------------------------------------------------
// $.evalFile runs in the caller's scope, so the modules load at the top
// level, where their `var BRE` is global.
$.evalFile(new File($.global.BRE_ROOT + "/shared/lib/json2.js"));
$.evalFile(new File($.global.BRE_ROOT + "/batch-relink-export/src/locale.js"));
$.evalFile(new File($.global.BRE_ROOT + "/batch-relink-export/src/config.js"));
$.evalFile(new File($.global.BRE_ROOT + "/batch-relink-export/src/pdf.js"));
$.evalFile(new File($.global.BRE_ROOT + "/batch-relink-export/src/core.js"));
(function () {
    if (app.documents.length !== 0) { return "PRERUSENO: otevrene dokumenty"; }

    var out = [];
    function say(s) { out.push(s); }
    function check(cond, msg) { say((cond ? "OK   " : "FAIL ") + msg); }

    var prefs = BRE.Core.savePdfPrefs();
    var uil = app.userInteractionLevel;
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var tmp = new Folder(Folder.temp.fsName + "/bre-inspect-" + new Date().getTime());
    tmp.create();
    var mine = [];      // every document this probe opened
    function closeMine() {
        for (var i = mine.length - 1; i >= 0; i--) {
            try { mine[i].close(SaveOptions.DONOTSAVECHANGES); } catch (e) {}
        }
        mine = [];
    }

    // Positions on a 2 x 2 grid per artboard; [artboard, col, row] per page,
    // artboard 2 = outside both artboards.
    function makeTemplate(name, pdf, pages, slots) {
        var d = app.documents.add(DocumentColorSpace.CMYK, 420, 240);
        mine.push(d);
        var r = d.artboards[0].artboardRect;
        var w = r[2] - r[0];
        d.artboards.add([r[2] + 40, r[1], r[2] + 40 + w, r[3]]);
        var rects = [d.artboards[0].artboardRect, d.artboards[1].artboardRect];
        for (var i = 0; i < pages.length; i++) {
            var s = slots[i];
            var left = (s[0] < 2) ? rects[s[0]][0] : rects[1][2] + 200;
            var top = (s[0] < 2) ? rects[s[0]][1] : rects[1][1];
            app.preferences.PDFFileOptions.pageToOpen = pages[i];
            var p = d.placedItems.add();
            p.file = pdf;
            p.position = [left + 10 + s[1] * 200, top - 10 - s[2] * 110];
        }
        var f = new File(tmp.fsName + "/" + name + ".ai");
        d.saveAs(f, new IllustratorSaveOptions());
        d.close(SaveOptions.DONOTSAVECHANGES);
        mine.pop();
        return f;
    }
    var GRID = [[0, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1], [1, 0, 0], [1, 1, 0], [1, 0, 1], [1, 1, 1]];

    // What the operator's document shows: page per position, from widths.
    function widths(doc) {
        var a = [], i, bb;
        for (i = 0; i < doc.placedItems.length; i++) {
            bb = doc.placedItems[i].boundingBox;
            a.push(Math.round(bb[2] - bb[0]));
        }
        return a.join(",");
    }
    function leftovers() {
        var n = 0, fs = Folder.temp.getFiles("bre-template-*");
        for (var i = 0; i < fs.length; i++) { n++; }
        return n;
    }

    try {
        var base = leftovers();
        var pdf = new File(tmp.fsName + "/zdroj8.pdf");
        check(BRE.Pdf.writeProbe(pdf, 8) === true, "8-page source PDF written");

        // Placement: does pageToOpen pick the page a new position shows?
        var A = makeTemplate("A_ok", pdf, [1, 2, 3, 4, 5, 6, 7, 8], GRID);
        var ia = BRE.Core.inspectTemplate(A, null);
        check(ia.positions === 8, "A: 8 positions (" + ia.positions + ")");
        check(ia.perArtboard.counts.join("+") === "4+4" && ia.perArtboard.outside === 0,
            "A: 4 + 4 on artboards, none outside (" + ia.perArtboard.counts.join("+") + ", outside " + ia.perArtboard.outside + ")");
        // placedItems lists the last placed first (z-order), so the raw map is
        // a permutation of 1..8, not 1..8 in order.
        check(ia.pages && ia.pages.slice(0).sort().join(",") === "1,2,3,4,5,6,7,8", "A: raw pages are 1..8 each once (" + ia.pages + ")");
        check(ia.pageMap.ok === true, "A: page map ok");
        check(ia.sizes.length === 8, "A: 8 distinct page sizes (" + ia.sizes.length + ")");

        var B = makeTemplate("B_dup", pdf, [1, 1, 3, 4, 5, 6, 7, 8], GRID);
        var ib = BRE.Core.inspectTemplate(B, null);
        check(!ib.pageMap.ok && ib.pageMap.duplicates.length === 1 && ib.pageMap.duplicates[0].page === 1 &&
            ib.pageMap.missing.join(",") === "2", "B: page 1 twice, 2 missing (" + ib.pages + ")");

        var C = makeTemplate("C_out", pdf, [1, 2, 3, 4, 5, 6, 7, 8],
            [[0, 0, 0], [0, 1, 0], [0, 0, 1], [0, 1, 1], [1, 0, 0], [1, 1, 0], [1, 0, 1], [2, 0, 0]]);
        var ic = BRE.Core.inspectTemplate(C, null);
        check(ic.perArtboard.counts.join("+") === "4+3" && ic.perArtboard.outside === 1,
            "C: 4 + 3, one outside (" + ic.perArtboard.counts.join("+") + ", outside " + ic.perArtboard.outside + ")");

        // The operator has A open and saved.
        var dA = app.open(A);
        mine.push(dA);
        var before = widths(dA), activeBefore = app.activeDocument.name;
        var iA2 = BRE.Core.inspectTemplate(A, dA);
        check(iA2.pageMap.ok === true && iA2.positions === 8, "open saved: same result as closed");
        check(dA.saved === true, "open saved: still saved");
        check(widths(dA) === before, "open saved: positions unchanged (" + widths(dA) + ")");
        check(app.documents.length === 1, "open saved: no extra document left open (" + app.documents.length + ")");
        say("INFO open saved: active document before '" + activeBefore + "', after '" + app.activeDocument.name + "'");
        check(leftovers() === base, "open saved: temp copy removed");

        // The operator changes it without saving.
        dA.pathItems.rectangle(-5, 5, 10, 10);
        check(dA.saved === false, "open unsaved: document now has an unsaved change");
        var iA3 = BRE.Core.inspectTemplate(A, dA);
        check(iA3.pageMap.ok === true, "open unsaved: map from the file on disk");
        check(dA.saved === false && dA.pathItems.length === 1, "open unsaved: the change is still there");
        check(widths(dA) === before, "open unsaved: positions unchanged");
        check(app.documents.length === 1, "open unsaved: no extra document left open");
        check(leftovers() === base, "open unsaved: temp copy removed");
        closeMine();

        // Engine facts for the dialog.
        var nd = app.documents.add();
        mine.push(nd);
        var fn;
        try {
            var f0 = nd.fullName;
            fn = "no throw: fsName '" + (f0 ? f0.fsName : f0) + "', exists " + (f0 ? f0.exists : "-");
        } catch (e0) { fn = "throws: " + e0.message; }
        say("FACT fullName of a never-saved document: " + fn);
        closeMine();
        var asFolder = new Folder(pdf.fsName);
        say("FACT new Folder(<file path>): instanceof Folder " + (asFolder instanceof Folder) +
            ", instanceof File " + (asFolder instanceof File) + ", exists " + asFolder.exists);
        say("FACT trailing slash: '" + new Folder(tmp.fsName + "/").fsName + "' vs '" + tmp.fsName + "'");
    } catch (e) {
        say("FAIL probe stopped: " + e.message + " (line " + e.line + ")");
    } finally {
        closeMine();
        BRE.Core.removeProbe();
        BRE.Core.restorePdfPrefs(prefs);
        app.userInteractionLevel = uil;
        var left = tmp.getFiles();
        for (var k = 0; k < left.length; k++) { try { left[k].remove(); } catch (e3) {} }
        try { tmp.remove(); } catch (e4) {}
    }
    return out.join("\n");
})();
