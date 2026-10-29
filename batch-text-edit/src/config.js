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

    // The shared BTE.UIState keeps its own copies of these two literals and
    // must stay in sync with them (see its header).
    PRESET_KEY_DEFAULT: "[Default]",
    PRESET_KEY_LAST: "[Last Settings]",

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
