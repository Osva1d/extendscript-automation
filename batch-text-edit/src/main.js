// ------------------------------------------------------------------------
// Module: Entry point — IIFE, error boundary, dialog, write, verify, summary
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.UI, BTE.UIModel, BTE.Utils, BTE.Write, BTE.Summary
// ------------------------------------------------------------------------
var BTE = BTE || {};

(function (BTE) {
    var L = BTE.L;
    // A write error's `detail` and the boundary's errors are English
    // diagnostics for the maintainer: BTE.Utils.log puts them on the console
    // and in the log file, never in a dialog. The user reads `message`.
    var log = BTE.Utils.log;

    // True once apply() has returned: from then on the document is written
    // and the boundary's message must say so. Before that nothing touched it.
    var changed = false;

    try {
        if (app.documents.length === 0) { alert(L.ERR_NO_DOC); return; }

        var res = BTE.UI.show(app.activeDocument);
        if (!res) { return; }

        var prepared = res.prepared;
        var run = res.run;

        // Apply and verify run back to back and nothing between them
        // redraws the document: a redraw would split the run into several
        // Undo steps (spec 7.3).
        try {
            BTE.Write.apply(prepared.tfs, run.info, run.states);
            changed = true;
        } catch (writeErr) {
            // Only a write that stopped halfway carries `written`; apply()
            // throws anything else (a broken edit list) before it touches
            // the document, and that goes to the boundary below.
            if (typeof writeErr.written !== "number") { throw writeErr; }
            // Part of the document is written: a failure of the log or the
            // summary below must not claim it is unchanged.
            changed = true;
            log(String(writeErr.detail));
            BTE.Summary.show(BTE.UIModel.writeFailureSummary(writeErr));
            return;
        }

        var mismatches = BTE.Write.verify(prepared.tfs, run.states[run.states.length - 1]);

        // Only a clean, verified write leaves a continuation; a mismatch or a
        // stopped write keeps the last run saved at Použít, without `last`.
        if (mismatches.length === 0) {
            try {
                var docName = "";
                try { docName = String(app.activeDocument.name); } catch (nameErr) {
                    log("saveLast: reading the document name failed: " + nameErr.message);
                }
                var lasts = BTE.UIModel.continuations(res.steps, run.info, docName, new Date().getTime());
                if (!BTE.Storage.saveLast(res.preset, lasts)) { log("saveLast: the continuation was not stored"); }
            } catch (saveErr) {
                log("saveLast: " + saveErr.message);
            }
        }

        BTE.Summary.show(BTE.UIModel.runSummary(res, mismatches));

    } catch (e) {
        log("fatal: " + e.message + " (line " + e.line + ")");
        alert(L.format(changed ? L.ERR_CRITICAL : L.ERR_CRITICAL_UNCHANGED, e.message, String(e.line || "?")));
    }
})(BTE);
