// ------------------------------------------------------------------------
// Module: Entry point — IIFE, error boundary, dialog, write, verify, summary
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.UI, BTE.UIModel, BTE.Write, BTE.Summary
// ------------------------------------------------------------------------
var BTE = BTE || {};

(function (BTE) {
    var L = BTE.L;

    /**
     * Writes where a debugger can see it. The user never reads this: a
     * write error's `detail` is English diagnostics, its `message` is the
     * text for the user.
     * @param {string} msg - What to log.
     */
    function log(msg) {
        if (typeof $ !== "undefined" && $.writeln) { $.writeln("[BTE] " + msg); }
    }

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
        } catch (writeErr) {
            // Only a write that stopped halfway carries `written`; apply()
            // throws anything else (a broken edit list) before it touches
            // the document, and that goes to the boundary below.
            if (typeof writeErr.written !== "number") { throw writeErr; }
            log(String(writeErr.detail));
            BTE.Summary.show(BTE.UIModel.writeFailureSummary(writeErr));
            return;
        }

        var mismatches = BTE.Write.verify(prepared.tfs, run.states[run.states.length - 1]);
        BTE.Summary.show(BTE.UIModel.runSummary(res, mismatches));

    } catch (e) {
        log("fatal: " + e.message + " (line " + e.line + ")");
        alert(L.format(L.ERR_CRITICAL, e.message, String(e.line || "?")));
    }
})(BTE);
