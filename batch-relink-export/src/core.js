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
                    // Store a direct reference, not an index — relinkDocument may
                    // remove items, which shifts indices and would make an
                    // index-based restore lock the wrong surviving item.
                    this._lockedItems.push(item);
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

        // Restore item locks by reference. Items removed during processing
        // throw here (reference invalid) and are harmlessly swallowed.
        for (i = 0; i < this._lockedItems.length; i++) {
            try {
                this._lockedItems[i].locked = true;
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
        var results = {
            relinked: 0, skipped: 0, removed: 0,
            relinkedItems: [], warnings: [], errors: [], ok: false
        };
        var items = doc.placedItems;
        var i, item, label;

        for (i = 0; i < items.length; i++) {
            item = items[i];
            label = item.name || ("item_" + i);

            if (!item.file) {
                results.skipped++;
                continue;
            }

            if (this._isOnHiddenLayer(item)) {
                results.warnings.push(BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, label));
                results.skipped++;
                continue;
            }

            if (totalPages > 0 && item.pageNumber && item.pageNumber > totalPages) {
                continue;
            }

            try {
                item.relink(targetPdf);
                results.relinked++;
                // Keep a reference so verifyRelink checks ONLY the items we
                // actually relinked — never the deliberately-skipped ones
                // (hidden-layer / fileless), which still point to the old PDF.
                results.relinkedItems.push({ item: item, label: label });
            } catch (e) {
                results.errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, label, e.message));
            }
        }

        if (totalPages > 0) {
            // Remove positions whose page is beyond the source PDF (reverse
            // iteration is required when removing from a live collection).
            for (i = items.length - 1; i >= 0; i--) {
                try {
                    if (items[i].pageNumber && items[i].pageNumber > totalPages) {
                        items[i].remove();
                        results.removed++;
                    }
                } catch (e) {
                    results.errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, "remove_" + i, e.message));
                }
            }

            // Post-condition: after removal NO surviving item may reference a
            // page beyond the source. If one does, a remove() silently failed —
            // flag it so the caller refuses to export a lossy sheet.
            for (i = 0; i < items.length; i++) {
                try {
                    if (items[i].pageNumber && items[i].pageNumber > totalPages) {
                        results.errors.push(
                            BRE.L.format(BRE.L.ERR_REMOVE_FAIL, String(items[i].pageNumber))
                        );
                    }
                } catch (e) {}
            }
        }

        results.ok = (results.errors.length === 0);
        return results;
    },

    // ---------------------------------------------------------------------
    // Relink verification
    // ---------------------------------------------------------------------

    /**
     * Verifies that every relinked item now points to the expected PDF.
     * Takes the relinked-items list from relinkDocument() — NOT the whole
     * document — so deliberately-skipped items (hidden-layer / fileless),
     * which still reference the old PDF, are never wrongly flagged.
     * @param {Array} relinkedItems - [{ item, label }] from relinkDocument.
     * @param {File} expectedPdf - The expected linked file.
     * @returns {Object} { ok: boolean, errors: string[] }
     */
    verifyRelink: function (relinkedItems, expectedPdf) {
        var errors = [];
        var expectedPath = expectedPdf.fsName;

        for (var i = 0; i < relinkedItems.length; i++) {
            var rec = relinkedItems[i];
            try {
                var actualPath = rec.item.file.fsName;
                if (actualPath !== expectedPath) {
                    errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_VERIFY, rec.label, expectedPath, actualPath)
                    );
                }
            } catch (e) {
                errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, rec.label, e.message));
            }
        }

        return { ok: errors.length === 0, errors: errors };
    },

    // ---------------------------------------------------------------------
    // PDF page count
    // ---------------------------------------------------------------------

    /**
     * Reads a PDF's raw bytes as a binary string.
     * @param {File} pdfFile - The PDF file to read.
     * @returns {string|null} File content, or null on failure.
     */
    _readPdfBinary: function (pdfFile) {
        try {
            pdfFile.encoding = "binary";
            if (!pdfFile.open("r")) return null;
            var content = pdfFile.read();
            pdfFile.close();
            return content;
        } catch (e) {
            this._log("_readPdfBinary failed: " + e.message);
            return null;
        }
    },

    /**
     * Skips a run of PDF whitespace starting at idx.
     * @param {string} content - PDF content.
     * @param {number} idx - Start index.
     * @returns {number} Index of the first non-whitespace character.
     */
    _skipPdfWhitespace: function (content, idx) {
        while (idx < content.length) {
            var w = content.charAt(idx);
            if (w === " " || w === "\n" || w === "\r" || w === "\t" || w === "\f" || w === "\0") {
                idx++;
            } else {
                break;
            }
        }
        return idx;
    },

    /**
     * Highest /Count value in the content. /Count is followed by arbitrary
     * PDF whitespace (space, newline, CR, tab…), not only a single space —
     * matching just "/Count " misses "/Count\n8" and silently undercounts,
     * which (with the remove-excess logic) risks dropping real pages.
     * @param {string} content - PDF content.
     * @returns {number} Highest /Count, or 0 if none found.
     */
    _maxCount: function (content) {
        var token = "/Count";
        var maxCount = 0;
        var startIdx = 0;
        while (true) {
            var pos = content.indexOf(token, startIdx);
            if (pos === -1) break;
            var ci = this._skipPdfWhitespace(content, pos + token.length);
            var numStr = "";
            while (ci < content.length) {
                var ch = content.charAt(ci);
                if (ch >= "0" && ch <= "9") { numStr += ch; ci++; } else { break; }
            }
            if (numStr.length > 0) {
                var n = parseInt(numStr, 10);
                if (n > maxCount) maxCount = n;
            }
            startIdx = pos + token.length;
        }
        return maxCount;
    },

    /**
     * Counts page objects: "/Type" + whitespace + "/Page" (excluding "/Pages").
     * An independent cross-check against _maxCount. Returns 0 when page
     * objects live in compressed object streams (PDF 1.5+) — callers treat
     * 0 as "no cross-check available" rather than a contradiction.
     * @param {string} content - PDF content.
     * @returns {number} Number of /Type /Page objects found.
     */
    _countPageObjects: function (content) {
        var token = "/Type";
        var count = 0;
        var startIdx = 0;
        while (true) {
            var pos = content.indexOf(token, startIdx);
            if (pos === -1) break;
            var ci = this._skipPdfWhitespace(content, pos + token.length);
            if (content.substr(ci, 5) === "/Page" && content.charAt(ci + 5) !== "s") {
                count++;
            }
            startIdx = pos + token.length;
        }
        return count;
    },

    /**
     * Reads page count from PDF binary data (highest /Count in the page tree).
     * @param {File} pdfFile - The PDF file to inspect.
     * @returns {number} Page count, or 0 on failure.
     */
    countPdfPages: function (pdfFile) {
        var content = this._readPdfBinary(pdfFile);
        if (content === null) return 0;
        return this._maxCount(content);
    },

    // ---------------------------------------------------------------------
    // Pre-flight scan
    // ---------------------------------------------------------------------

    /**
     * Scans every source PDF and classifies its page count against the
     * template's position count. This is the safety net: it surfaces every
     * file whose page count does not match the number of positions BEFORE
     * any destructive processing, and flags over-page files for hard block.
     *
     * Status values:
     *   "ok"         pages === slotCount (full sheet)
     *   "partial"    pages < slotCount AND last file (expected short last sheet)
     *   "under"      pages < slotCount AND not last file (likely split error)
     *   "over"       pages > slotCount (would silently drop pages — BLOCKED)
     *   "uncertain"  two independent counts disagree — not trusted — BLOCKED
     *   "unreadable" pages === 0 (count could not be detected)
     *
     * Each PDF is read once; both /Count and /Type/Page counts are derived
     * from the same bytes. When both are non-zero and disagree, the count
     * cannot be trusted (a wrong count gates a destructive remove), so the
     * file is marked "uncertain" and hard-blocked for manual review.
     *
     * @param {File[]} pdfFiles - Source PDF files (already sorted).
     * @param {number} slotCount - Number of PlacedItems in the template.
     * @returns {Object} { items: [{name, pages, pageObjs, status}], counts, processable }
     */
    scanSources: function (pdfFiles, slotCount) {
        var items = [];
        var counts = { ok: 0, partial: 0, under: 0, over: 0, uncertain: 0, unreadable: 0 };
        var lastIdx = pdfFiles.length - 1;

        for (var i = 0; i < pdfFiles.length; i++) {
            var f = pdfFiles[i];
            var name = f.displayName || decodeURI(f.name);
            var content = this._readPdfBinary(f);
            var pages = (content === null) ? 0 : this._maxCount(content);
            var pageObjs = (content === null) ? 0 : this._countPageObjects(content);
            var status;

            if (pages === 0) {
                status = "unreadable";
            } else if (pageObjs > 0 && pageObjs !== pages) {
                status = "uncertain";
            } else if (pages > slotCount) {
                status = "over";
            } else if (pages === slotCount) {
                status = "ok";
            } else {
                status = (i === lastIdx) ? "partial" : "under";
            }

            counts[status]++;
            items.push({ name: name, pages: pages, pageObjs: pageObjs, status: status });
        }

        // "over" and "uncertain" files are hard-blocked; the rest are processable.
        return {
            items: items,
            counts: counts,
            processable: pdfFiles.length - counts.over - counts.uncertain
        };
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

    /**
     * Finds an already-open document matching the given file, if any.
     * Used to warn before closing a template the user has open.
     * @param {File} file - The file to look for among open documents.
     * @returns {Document|null} The open document, or null.
     */
    findOpenDocument: function (file) {
        try {
            for (var i = 0; i < app.documents.length; i++) {
                var d = app.documents[i];
                try {
                    if (d.fullName && d.fullName.fsName === file.fsName) return d;
                } catch (e) {}
            }
        } catch (e) {}
        return null;
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
