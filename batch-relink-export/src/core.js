// ------------------------------------------------------------------------
// Module: BRE.Core — Session Management, Relink, Verification
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Core = {

    _lockedLayers: [],
    _lockedItems: [],

    // ---------------------------------------------------------------------
    // Session management
    // ---------------------------------------------------------------------

    /**
     * Unlocks all locked layers and PlacedItems before processing.
     * Stores their state so endSession() can restore it.
     * @param {Document} doc - The active Illustrator document.
     */
    beginSession: function (doc) {
        this._lockedLayers = [];
        this._lockedItems = [];
        var i, layer, item;

        for (i = 0; i < doc.layers.length; i++) {
            layer = doc.layers[i];
            try {
                if (layer.locked) {
                    this._lockedLayers.push({ idx: i, name: layer.name });
                    layer.locked = false;
                }
            } catch (e) {
                this._log("beginSession: layer unlock failed — " + layer.name);
            }
        }

        for (i = 0; i < doc.placedItems.length; i++) {
            item = doc.placedItems[i];
            try {
                if (item.locked) {
                    this._lockedItems.push({ idx: i, name: item.name || ("item_" + i) });
                    item.locked = false;
                }
            } catch (e) {
                this._log("beginSession: item unlock failed — index " + i);
            }
        }
    },

    /**
     * Restores layer and item locks cleared by beginSession().
     * @param {Document} doc - The active Illustrator document.
     */
    endSession: function (doc) {
        var i, rec, lay;

        for (i = 0; i < this._lockedItems.length; i++) {
            try {
                rec = this._lockedItems[i];
                if (rec.idx < doc.placedItems.length) {
                    doc.placedItems[rec.idx].locked = true;
                }
            } catch (e) {}
        }

        for (i = 0; i < this._lockedLayers.length; i++) {
            try {
                rec = this._lockedLayers[i];
                lay = (rec.idx < doc.layers.length && doc.layers[rec.idx].name === rec.name)
                    ? doc.layers[rec.idx]
                    : doc.layers.getByName(rec.name);
                lay.locked = true;
            } catch (e) {}
        }

        this._lockedLayers = [];
        this._lockedItems = [];
    },

    // ---------------------------------------------------------------------
    // Relink pipeline
    // ---------------------------------------------------------------------

    /**
     * Relinks all PlacedItems in the document to the target PDF.
     * Removes PlacedItems whose pageNumber exceeds the source page count.
     *
     * @param {Document} doc - The active document.
     * @param {File} targetPdf - The PDF file to relink to.
     * @param {number} totalPages - Total pages in targetPdf (0 = unknown).
     * @returns {Object} { relinked, skipped, removed, warnings, errors }
     */
    relinkDocument: function (doc, targetPdf, totalPages) {
        var results = { relinked: 0, skipped: 0, removed: 0, warnings: [], errors: [] };
        var items = doc.placedItems;
        var i, item;

        for (i = 0; i < items.length; i++) {
            item = items[i];

            if (!item.file) {
                results.skipped++;
                continue;
            }

            if (this._isOnHiddenLayer(item)) {
                results.warnings.push(
                    BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, item.name || ("item_" + i))
                );
                results.skipped++;
                continue;
            }

            if (totalPages > 0 && item.pageNumber && item.pageNumber > totalPages) {
                continue;
            }

            try {
                item.relink(targetPdf);
                results.relinked++;
            } catch (e) {
                results.errors.push(
                    BRE.L.format(BRE.L.ERR_RELINK_ITEM, item.name || ("item_" + i), e.message)
                );
            }
        }

        if (totalPages > 0) {
            for (i = items.length - 1; i >= 0; i--) {
                try {
                    if (items[i].pageNumber && items[i].pageNumber > totalPages) {
                        items[i].remove();
                        results.removed++;
                    }
                } catch (e) {
                    results.errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_ITEM, "remove_" + i, e.message)
                    );
                }
            }
        }

        return results;
    },

    // ---------------------------------------------------------------------
    // Relink verification
    // ---------------------------------------------------------------------

    /**
     * Verifies that all PlacedItems point to the expected PDF.
     * @param {Document} doc - The document to verify.
     * @param {File} expectedPdf - The expected linked file.
     * @returns {Object} { ok: boolean, errors: string[] }
     */
    verifyRelink: function (doc, expectedPdf) {
        var items = doc.placedItems;
        var errors = [];
        var expectedPath = expectedPdf.fsName;

        for (var i = 0; i < items.length; i++) {
            if (!items[i].file) continue;
            try {
                var actualPath = items[i].file.fsName;
                if (actualPath !== expectedPath) {
                    errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_VERIFY,
                            items[i].name || ("item_" + i), expectedPath, actualPath)
                    );
                }
            } catch (e) {
                errors.push(
                    BRE.L.format(BRE.L.ERR_RELINK_ITEM, items[i].name || ("item_" + i), e.message)
                );
            }
        }

        return { ok: errors.length === 0, errors: errors };
    },

    // ---------------------------------------------------------------------
    // PDF page count
    // ---------------------------------------------------------------------

    /**
     * Reads page count from PDF binary data.
     * Finds the highest /Count value in the page tree.
     * @param {File} pdfFile - The PDF file to inspect.
     * @returns {number} Page count, or 0 on failure.
     */
    countPdfPages: function (pdfFile) {
        try {
            pdfFile.encoding = "binary";
            if (!pdfFile.open("r")) return 0;
            var content = pdfFile.read();
            pdfFile.close();

            var maxCount = 0;
            var startIdx = 0;
            while (true) {
                var pos = content.indexOf("/Count ", startIdx);
                if (pos === -1) break;
                var numStr = "";
                for (var ci = pos + 7; ci < content.length && ci < pos + 17; ci++) {
                    var ch = content.charAt(ci);
                    if (ch >= "0" && ch <= "9") {
                        numStr += ch;
                    } else if (numStr.length > 0) {
                        break;
                    }
                }
                if (numStr.length > 0) {
                    var n = parseInt(numStr, 10);
                    if (n > maxCount) maxCount = n;
                }
                startIdx = pos + 1;
            }
            return maxCount;
        } catch (e) {
            this._log("countPdfPages failed: " + e.message);
            return 0;
        }
    },

    // ---------------------------------------------------------------------
    // Output naming
    // ---------------------------------------------------------------------

    /**
     * Builds output filename from a pattern with placeholder substitution.
     * @param {string} pattern - Naming pattern (e.g. "{n}_{template}").
     * @param {number} index - Zero-based file index.
     * @param {number} totalCount - Total number of files (for zero-padding).
     * @param {string} templateName - Template filename without extension.
     * @param {string} sourceName - Source PDF filename without extension.
     * @returns {string} Complete filename with .pdf extension.
     */
    buildOutputName: function (pattern, index, totalCount, templateName, sourceName) {
        var padLen = String(totalCount).length;
        if (padLen < 2) padLen = 2;
        var num = String(index + 1);
        while (num.length < padLen) num = "0" + num;

        var name = pattern;
        name = name.split("{n}").join(num);
        name = name.split("{template}").join(templateName);
        name = name.split("{source}").join(sourceName);
        return name + ".pdf";
    },

    /**
     * Strips file extension from a filename.
     * @param {string} filename - Filename with extension.
     * @returns {string} Filename without extension.
     */
    stripExtension: function (filename) {
        return filename.replace(/\.[^.]+$/, "");
    },

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Checks whether an item resides on a hidden layer (or nested hidden parent).
     * @param {PlacedItem} item - The item to check.
     * @returns {boolean} True if any ancestor layer is hidden.
     */
    _isOnHiddenLayer: function (item) {
        try {
            var obj = item.layer;
            while (obj) {
                if (!obj.visible) return true;
                if (!obj.parent || obj.parent.typename !== "Layer") break;
                obj = obj.parent;
            }
        } catch (e) {}
        return false;
    },

    /**
     * Debug logger — writes to ExtendScript console when debug is enabled.
     * @param {string} msg - Message to log.
     */
    _log: function (msg) {
        if (BRE.Config && BRE.Config.debug) {
            $.writeln("[BRE] " + msg);
        }
    }
};
