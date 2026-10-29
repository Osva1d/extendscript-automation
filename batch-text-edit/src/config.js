// ------------------------------------------------------------------------
// Module: BTE.Config — constants, getDefaults()
// Part of: Illustrator Batch Text Edit
// Depends on: —
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Config = {
    scriptName: "Batch Text Edit",
    // KEEP IN SYNC with package.json "version" — build.sh enforces this.
    version: "1.0.0",

    /**
     * Defaults of a fresh run: the selection, numbered in reading order.
     * @returns {Object} Settings with every key the dialog reads.
     */
    getDefaults: function () {
        return {
            scope: "selection",
            order: "rows"
        };
    }
};
