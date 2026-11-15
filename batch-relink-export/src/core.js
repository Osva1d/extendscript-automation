// ------------------------------------------------------------------------
// Module: BRE.Core — Session Management, Relink, Verification
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Core = {

    _lockedLayers: [],
    _lockedItems: [],
    _probeFile: null,
    _probePages: 0,

    // ---------------------------------------------------------------------
    // Session management
    // ---------------------------------------------------------------------

    /**
     * Unlocks all locked layers (sublayers included) and PlacedItems before
     * processing. Stores their state so endSession() can restore it.
     * @param {Document} doc - The active Illustrator document.
     */
    beginSession: function (doc) {
        this._lockedLayers = [];
        this._lockedItems = [];
        var i, item;

        this._unlockLayers(doc.layers);

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
     * Note: in the current flow the document is always closed without saving,
     * so the restore never persists — it is kept as a cheap defensive measure
     * (ZSM session pattern) in case a future flow ever saves the document.
     * @param {Document} doc - The active Illustrator document.
     */
    endSession: function (doc) {
        var i;

        // Restore item locks by reference. Items removed during processing
        // throw here (reference invalid) and are harmlessly swallowed.
        for (i = 0; i < this._lockedItems.length; i++) {
            try {
                this._lockedItems[i].locked = true;
            } catch (e) {}
        }

        for (i = 0; i < this._lockedLayers.length; i++) {
            try {
                this._lockedLayers[i].locked = true;
            } catch (e) {}
        }

        this._lockedLayers = [];
        this._lockedItems = [];
    },

    /**
     * Unlocks every locked layer in the collection and, recursively, its
     * sublayers. relink() in a locked sublayer throws "Target layer cannot be
     * modified" even when the parent layer is unlocked (measured, AI 30.8.2).
     * Layers are kept by reference — a sublayer has no top-level index to
     * restore by.
     * @param {Layers} layers - A document's or a layer's layer collection.
     */
    _unlockLayers: function (layers) {
        for (var i = 0; i < layers.length; i++) {
            try {
                var layer = layers[i];
                if (layer.locked) {
                    this._lockedLayers.push(layer);
                    layer.locked = false;
                }
                this._unlockLayers(layer.layers);
            } catch (e) {
                this._log("beginSession: layer unlock failed at index " + i);
            }
        }
    },

    /**
     * Reads the PDF import preferences. Opening a document with links and
     * every relink overwrite them with that link's page and crop (measured,
     * AI 30.8.2), so a run would leave the operator's File > Open and Place
     * set to the template's last position.
     * @returns {Object|null} { page, box }, or null when unreadable.
     */
    savePdfPrefs: function () {
        try {
            var po = app.preferences.PDFFileOptions;
            return { page: po.pageToOpen, box: po.pDFCropToBox };
        } catch (e) {
            this._log("savePdfPrefs failed: " + e.message);
            return null;
        }
    },

    /**
     * Puts back the PDF import preferences read by savePdfPrefs().
     * @param {Object|null} saved - Result of savePdfPrefs().
     */
    restorePdfPrefs: function (saved) {
        if (!saved) return;
        try {
            var po = app.preferences.PDFFileOptions;
            po.pageToOpen = saved.page;
            po.pDFCropToBox = saved.box;
        } catch (e) {
            this._log("restorePdfPrefs failed: " + e.message);
        }
    },

    // ---------------------------------------------------------------------
    // Relink pipeline
    // ---------------------------------------------------------------------

    /**
     * The template's positions: visible placed items linked to the file most
     * of them share — the multi-page PDF the sheet was built from. Other
     * links (a logo, marks placed as a file) are not positions and are left
     * alone. A missing link cannot report its file (reading .file throws when
     * the original PDF was moved or deleted), so missing links form a group
     * of their own and a template whose original PDF is gone still finds its
     * positions. When two groups tie, every visible placed item counts, as
     * before this definition existed.
     * @param {Document} doc - The document to inspect.
     * @returns {PlacedItem[]} The positions.
     */
    getPositions: function (doc) {
        var items = doc.placedItems;
        var groups = {}, keys = [], i, item, key;

        for (i = 0; i < items.length; i++) {
            item = items[i];
            if (this._isHidden(item)) continue;
            try {
                key = "file:" + item.file.fsName;
            } catch (e) {
                key = "missing";
            }
            if (!groups.hasOwnProperty(key)) {
                groups[key] = [];
                keys.push(key);
            }
            groups[key].push(item);
        }

        var best = null, tie = false, all = [];
        for (i = 0; i < keys.length; i++) {
            var group = groups[keys[i]];
            all = all.concat(group);
            if (!best || group.length > best.length) {
                best = group;
                tie = false;
            } else if (group.length === best.length) {
                tie = true;
            }
        }
        return (best && !tie) ? best : all;
    },

    /**
     * Reports the template's layout and page map, as saved on disk — the state
     * every sheet is built from. The page map needs the probe, which relinks
     * the positions, so a template that is open in Illustrator is never
     * measured in place: a temporary copy is opened and removed again, and the
     * user's document (saved or not) is not touched.
     * @param {File} file - The template file.
     * @param {Document|null} openDoc - The template if it is already open.
     * @returns {{positions: number, perArtboard: Object, sizes: number[][], pages: number[]|null, pageMap: Object}}
     */
    inspectTemplate: function (file, openDoc) {
        var src = file, copy = null;
        if (openDoc) {
            copy = new File(Folder.temp.fsName + "/bre-template-" + new Date().getTime() + ".ai");
            if (!file.copy(copy.fsName)) throw new Error("cannot copy the template to " + copy.fsName);
            src = copy;
        }
        var doc = null;
        try {
            doc = app.open(src);
            var positions = this.getPositions(doc);
            var n = positions.length;
            if (n === 0) {
                return { positions: 0, perArtboard: this.positionsPerArtboard([], []), sizes: [], pages: null, pageMap: this.describePageMap([], 0) };
            }
            var centers = [], sizes = [], rects = [], i, gb;
            for (i = 0; i < n; i++) {
                sizes.push(this._pageSize(positions[i]));
                try {
                    gb = positions[i].geometricBounds;
                    centers.push([(gb[0] + gb[2]) / 2, (gb[1] + gb[3]) / 2]);
                } catch (e) {
                    this._log("inspectTemplate: bounds " + e.message);
                }
            }
            for (i = 0; i < doc.artboards.length; i++) rects.push(doc.artboards[i].artboardRect);
            var pages = this._readPositionPages(positions);
            return {
                positions: n,
                perArtboard: this.positionsPerArtboard(centers, rects),
                sizes: this.distinctSizes(sizes),
                pages: pages,
                pageMap: this.describePageMap(pages, n)
            };
        } finally {
            try {
                if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
            } catch (ce) {
                BRE.Core._log("inspectTemplate: closing the copy failed: " + ce.message);
            }
            if (copy) copy.remove();
        }
    },

    /**
     * Relinks the template's positions (see getPositions) to the target PDF.
     * When the PDF has fewer pages than the template has positions, the
     * positions for the missing pages would show page 1 again (measured,
     * AI 30.8.2). Their pages are found with the page probe (_positionPages)
     * and they are removed. When the probe cannot tell every position's page,
     * nothing is removed and the caller flags the sheet for manual cleanup.
     *
     * @param {Document} doc - The active document.
     * @param {File} targetPdf - The PDF file to relink to.
     * @param {number} totalPages - Total pages in targetPdf (0 = unknown).
     * @returns {Object} { relinked, skipped, removed, relinkedItems, warnings, errors, ok }
     */
    relinkDocument: function (doc, targetPdf, totalPages) {
        var results = {
            relinked: 0, skipped: 0, removed: 0,
            relinkedItems: [], warnings: [], errors: [], ok: false
        };
        var items = doc.placedItems;
        var positions = this.getPositions(doc);
        var i, item, label;
        var toRemove = [];

        // Hidden placed items are never positions; report each by its
        // layer — an unnamed item's index ("item_3") cannot be found in the
        // document, its layer can.
        var layerName;
        for (i = 0; i < items.length; i++) {
            if (this._isHidden(items[i])) {
                layerName = "?";
                try {
                    layerName = items[i].layer.name;
                } catch (le) {
                    this._log("relinkDocument: layer of hidden item " + i + " unreadable");
                }
                results.warnings.push(BRE.L.format(BRE.L.ERR_HIDDEN_LAYER, layerName));
                results.skipped++;
            }
        }

        // Page sizes for verifyRelink, taken before the probe changes them.
        var sizes = [];
        for (i = 0; i < positions.length; i++) sizes.push(this._pageSize(positions[i]));

        var pages = null;
        if (totalPages > 0 && totalPages < positions.length) {
            pages = this._positionPages(positions);
            if (!pages) {
                results.warnings.push(BRE.L.format(BRE.L.WARN_PAGE_MAP, String(positions.length)));
            }
        }

        for (i = 0; i < positions.length; i++) {
            item = positions[i];
            label = item.name || ("item_" + i);

            // No check on item.file here: when the template's original PDF
            // was moved or deleted, reading .file throws "There is no file
            // associated with this item", yet relink() still works and keeps
            // the page (measured, AI 30.8.2).
            try {
                item.relink(targetPdf);
                results.relinked++;
            } catch (e) {
                results.errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, label, e.message));
                continue;
            }

            if (pages && pages[i] > totalPages) {
                // Excess position. Relinked first, so that if its removal
                // fails it shows page 1 of the source and is counted as a
                // leftover — never a stale page.
                toRemove.push({ item: item, page: pages[i] });
            } else {
                // Keep a reference so verifyRelink checks ONLY the positions
                // we relinked and kept — never the hidden ones, which still
                // point to the old PDF.
                results.relinkedItems.push({ item: item, label: label, size: sizes[i] });
            }
        }

        // Remove the excess positions by reference (safe against live
        // collection mutation). Each position may be the clipped content of a
        // clipping mask — _removePosition removes the whole clip group so no
        // clip path / frame is left behind. The remove-set lets it refuse to
        // delete a clip group that also encloses a position we are keeping.
        // Anything that cannot be removed is reported as a warning; the caller
        // counts the leftover positions and asks the user to remove them by
        // hand — it never refuses the sheet on this account.
        var removeRefs = [];
        for (i = 0; i < toRemove.length; i++) removeRefs.push(toRemove[i].item);
        for (i = 0; i < toRemove.length; i++) {
            try {
                this._removePosition(toRemove[i].item, removeRefs);
                results.removed++;
            } catch (e) {
                results.warnings.push(BRE.L.format(BRE.L.ERR_REMOVE_FAIL, String(toRemove[i].page)));
            }
        }

        results.ok = (results.errors.length === 0);
        return results;
    },

    /**
     * Which page of the template's PDF each position shows. PlacedItem has
     * no page property (measured, AI 30.8.2), so every position is relinked
     * to the page probe (BRE.Pdf.writeProbe) and its page is read from the
     * width of its placed page. The caller relinks the positions to the
     * source right after. Returns null unless the pages are exactly 1..n,
     * each once — a template that shows a page twice, or a page beyond its
     * position count, gets no automatic removal.
     * @param {PlacedItem[]} positions - The template's positions.
     * @returns {number[]|null} Page per position, or null.
     */
    _positionPages: function (positions) {
        var pages = this._readPositionPages(positions);
        if (!pages) return null;
        var n = positions.length, seen = [], i, k;
        for (i = 0; i < n; i++) {
            k = pages[i];
            if (k < 1 || k > n || seen[k]) return null;
            seen[k] = true;
        }
        return pages;
    },

    /**
     * Relinks every position to the page probe and reads which page each one
     * shows — the raw map, with no check that it is 1..n.
     * @param {PlacedItem[]} positions - The template's positions.
     * @returns {number[]|null} Page per position, or null if the probe cannot
     *   be written, a size is unreadable or a relink fails.
     */
    _readPositionPages: function (positions) {
        var n = positions.length, pages = [], i, size;
        var probe = this._probe(n);
        if (!probe) return null;
        try {
            for (i = 0; i < n; i++) {
                positions[i].relink(probe);
                size = this._pageSize(positions[i]);
                if (!size) return null;
                pages.push(BRE.Pdf.pageFromWidth(size[0]));
            }
        } catch (e) {
            this._log("_readPositionPages: " + e.message);
            return null;
        }
        return pages;
    },

    /**
     * The page probe for this run, written to the temp folder on first use.
     * @param {number} n - Pages needed.
     * @returns {File|null} The probe, or null if it could not be written.
     */
    _probe: function (n) {
        if (this._probeFile && this._probePages >= n && this._probeFile.exists) return this._probeFile;
        this.removeProbe();
        var f = new File(Folder.temp.fsName + "/bre-probe-" + new Date().getTime() + ".pdf");
        try {
            if (!BRE.Pdf.writeProbe(f, n)) return null;
        } catch (e) {
            this._log("_probe: " + e.message);
            return null;
        }
        this._probeFile = f;
        this._probePages = n;
        return f;
    },

    /**
     * Deletes the page probe written during this run, if any.
     */
    removeProbe: function () {
        if (this._probeFile) {
            try { this._probeFile.remove(); } catch (e) {}
        }
        this._probeFile = null;
        this._probePages = 0;
    },

    /**
     * Counts managed positions in the document — visible placed items linked
     * to the source PDF the sheet was relinked to. Other links (a logo) are
     * not positions. Used to detect how many extra positions remain on a
     * sheet so the user can be told to remove them.
     * @param {Document} doc - The document to inspect.
     * @param {File} targetPdf - The source PDF the positions were relinked to.
     * @returns {number} Managed position count.
     */
    countManagedPositions: function (doc, targetPdf) {
        var n = 0;
        var items = doc.placedItems;
        for (var i = 0; i < items.length; i++) {
            try {
                if (!this._isHidden(items[i]) && this.samePath(items[i].file.fsName, targetPdf.fsName)) n++;
            } catch (e) {}
        }
        return n;
    },

    /**
     * Removes one position from the sheet. If the placed item is the clipped
     * content of a clipping mask, the whole clip group is removed instead —
     * removing the placed item alone would leave the clip path behind as an
     * empty group (measured, AI 30.8.2), with its frame if it has a stroke.
     *
     * Safety: the climb only ascends into a clip group whose every placed item
     * is itself being removed (removeRefs). A clip group that also encloses a
     * position we are KEEPING is never removed — otherwise good artwork would
     * be silently deleted. In that case only the bare item is removed.
     *
     * @param {PlacedItem} item - The placed item to remove.
     * @param {Array} removeRefs - All placed items scheduled for removal.
     */
    _removePosition: function (item, removeRefs) {
        var target = item;
        var p = item.parent;
        while (p && p.typename === "GroupItem" && p.clipped === true) {
            if (!this._groupContainsOnly(p, removeRefs)) break;
            target = p;
            p = p.parent;
        }
        try { target.locked = false; } catch (e) {}
        try { if (target.parent && target.parent.locked) target.parent.locked = false; } catch (e) {}
        target.remove();
    },

    /**
     * True if every placed item anywhere inside the group is in removeRefs
     * (i.e. removing the group deletes only positions we already intend to
     * remove). Walks pageItems recursively so the result does not depend on
     * whether Illustrator's typed collections are recursive, and so nested
     * groups / nested clip masks are handled correctly. Non-placed items
     * (the clipping path, frames) do not count. Returns false on any access
     * error — the caller then declines to climb (fails safe).
     * @param {GroupItem} group - Candidate clip group.
     * @param {Array} removeRefs - Placed items scheduled for removal.
     * @returns {boolean}
     */
    _groupContainsOnly: function (group, removeRefs) {
        try {
            var kids = group.pageItems;
            for (var k = 0; k < kids.length; k++) {
                var it = kids[k];
                if (it.typename === "PlacedItem") {
                    if (!this._inSet(it, removeRefs)) return false;
                } else if (it.typename === "GroupItem") {
                    if (!this._groupContainsOnly(it, removeRefs)) return false;
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Reference-equality membership test.
     * @param {Object} item - Item to find.
     * @param {Array} refs - Array of references.
     * @returns {boolean}
     */
    _inSet: function (item, refs) {
        for (var m = 0; m < refs.length; m++) {
            if (refs[m] === item) return true;
        }
        return false;
    },

    // ---------------------------------------------------------------------
    // Relink verification
    // ---------------------------------------------------------------------

    /**
     * Verifies that every relinked item now points to the expected PDF and
     * shows a page of the same size as before. relink() does not fail on a
     * page of another size: it keeps the position's centre and scales the new
     * page to the old diagonal, so a source of another format — or one with
     * the bleed baked into the page and no TrimBox — would print shrunk or
     * stretched (measured, AI 30.8.2). The size compared is the placed page's
     * own box (boundingBox), which does not change with the position's
     * rotation or scale.
     * Takes the relinked-items list from relinkDocument() — NOT the whole
     * document — so deliberately-skipped hidden items, which still
     * reference the old PDF, are never wrongly flagged.
     * @param {Array} relinkedItems - [{ item, label, size }] from relinkDocument.
     * @param {File} expectedPdf - The expected linked file.
     * @returns {Object} { ok: boolean, errors: string[] }
     */
    verifyRelink: function (relinkedItems, expectedPdf) {
        var errors = [];
        var expectedPath = expectedPdf.fsName;
        var tol = 0.1 * 72 / 25.4;    // 0.1 mm
        var sizeReported = false;     // one size message per sheet is enough

        for (var i = 0; i < relinkedItems.length; i++) {
            var rec = relinkedItems[i];
            try {
                var actualPath = rec.item.file.fsName;
                if (!this.samePath(actualPath, expectedPath)) {
                    errors.push(
                        BRE.L.format(BRE.L.ERR_RELINK_VERIFY, rec.label, expectedPath, actualPath)
                    );
                    continue;
                }
                var now = this._pageSize(rec.item);
                if (!sizeReported && rec.size && now &&
                        (Math.abs(now[0] - rec.size[0]) > tol || Math.abs(now[1] - rec.size[1]) > tol)) {
                    errors.push(BRE.L.format(BRE.L.ERR_PAGE_SIZE, rec.label,
                        this._mm(now[0]), this._mm(now[1]), this._mm(rec.size[0]), this._mm(rec.size[1])));
                    sizeReported = true;
                }
            } catch (e) {
                errors.push(BRE.L.format(BRE.L.ERR_RELINK_ITEM, rec.label, e.message));
            }
        }

        return { ok: errors.length === 0, errors: errors };
    },

    /**
     * Size of the placed page's own box (after its PDF crop), independent of
     * the position's rotation and scale.
     * @param {PlacedItem} item - A placed item.
     * @returns {number[]|null} [width, height] in points, or null if unreadable.
     */
    _pageSize: function (item) {
        try {
            var bb = item.boundingBox;
            return [bb[2] - bb[0], bb[1] - bb[3]];
        } catch (e) {
            return null;
        }
    },

    /**
     * Points to millimetres with one decimal, in the locale's notation.
     * @param {number} pt - Length in points.
     * @returns {string} e.g. "106" or "99,2".
     */
    _mm: function (pt) {
        return String(Math.round(pt * 254 / 72) / 10).replace(".", BRE.L.DEC_SEP);
    },

    // ---------------------------------------------------------------------
    // Pre-flight scan
    // ---------------------------------------------------------------------

    /**
     * Scans every source PDF and classifies its page count against the
     * template's position count. This is the safety net: it surfaces every
     * file whose page count does not match the number of positions BEFORE
     * any destructive processing, and flags over-page files for hard block.
     * The count comes from the PDF's page tree (BRE.Pdf.pageCount).
     *
     * Status values:
     *   "ok"         pages === slotCount (full sheet)
     *   "partial"    pages < slotCount AND last file (expected short last sheet)
     *   "under"      pages < slotCount AND not last file (likely split error)
     *   "over"       pages > slotCount (would silently drop pages — BLOCKED)
     *   "unreadable" pages === 0 (count could not be read)
     *
     * @param {File[]} pdfFiles - Source PDF files (already sorted).
     * @param {number} slotCount - Number of positions in the template.
     * @returns {Object} { items: [{file, name, pages, status}], counts, processable }
     */
    scanSources: function (pdfFiles, slotCount) {
        var items = [];
        var counts = { ok: 0, partial: 0, under: 0, over: 0, unreadable: 0 };
        var lastIdx = pdfFiles.length - 1;

        for (var i = 0; i < pdfFiles.length; i++) {
            var f = pdfFiles[i];
            var name = f.displayName || decodeURI(f.name);
            var pages = BRE.Pdf.pageCount(f);
            var status;

            if (pages === 0) {
                status = "unreadable";
            } else if (pages > slotCount) {
                status = "over";
            } else if (pages === slotCount) {
                status = "ok";
            } else {
                status = (i === lastIdx) ? "partial" : "under";
            }

            counts[status]++;
            // Carry the File reference so callers iterate scan items directly
            // instead of index-coupling back to the pdfFiles array.
            items.push({ file: f, name: name, pages: pages, status: status });
        }

        // "over" files are hard-blocked; the rest are processable.
        return {
            items: items,
            counts: counts,
            processable: pdfFiles.length - counts.over
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

        var ph = BRE.Config.placeholders;
        var name = pattern;
        name = name.split(ph.N).join(num);
        name = name.split(ph.TEMPLATE).join(templateName);
        name = name.split(ph.SOURCE).join(sourceName);
        return name + ".pdf";
    },

    /**
     * True when an output already exists and is newer than both its source
     * and the template (the skip rule: such an output counts as done).
     * @param {Object} out - File-like {exists, modified}.
     * @param {Object} src - File-like source.
     * @param {Object} tpl - File-like template.
     * @returns {boolean}
     */
    isFinished: function (out, src, tpl) {
        return !!out.exists && out.modified > src.modified && out.modified > tpl.modified;
    },

    /**
     * Full paths of every output the run writes, leaving out those the
     * skip rule protects when skipExisting is on (the caller counts which
     * of them already exist).
     * @param {Object} config - {namingPattern, pdfFiles, templateName,
     *   templateFile, outputFolder, skipExisting}.
     * @returns {string[]} Output paths the run writes.
     */
    overwriteCandidates: function (config) {
        var paths = [];
        for (var i = 0; i < config.pdfFiles.length; i++) {
            var sf = config.pdfFiles[i];
            var sname = sf.displayName || decodeURI(sf.name);
            var name = BRE.Core.buildOutputName(
                config.namingPattern, i, config.pdfFiles.length,
                config.templateName, BRE.Core.stripExtension(sname));
            var path = config.outputFolder.fsName + "/" + name;
            if (config.skipExisting &&
                    BRE.Core.isFinished(new File(path), sf, config.templateFile)) {
                continue;
            }
            paths.push(path);
        }
        return paths;
    },

    /**
     * Whether the file check window must open before a run.
     * @param {Object} counts - scan.counts: {ok, partial, under, over, unreadable}.
     * @param {boolean} mapOk - The template's page map is a permutation.
     * @returns {boolean}
     */
    needsCheck: function (counts, mapOk) {
        return (counts.under + counts.over + counts.unreadable) > 0 || !mapOk;
    },

    // ---------------------------------------------------------------------
    // Template inspection
    // ---------------------------------------------------------------------

    /**
     * Compares the template's page numbers (one per position) with 1..n.
     * @param {number[]|null} pages - Page number per position, null if unknown.
     * @param {number} n - Number of positions.
     * @returns {{ok: boolean, unknown: boolean,
     *   duplicates: Array<{page: number, times: number}>,
     *   missing: number[], beyond: number[]}}
     */
    describePageMap: function (pages, n) {
        var r = { ok: false, unknown: false, duplicates: [], missing: [], beyond: [] };
        if (!pages) { r.unknown = true; return r; }
        var seen = {}, i;
        for (i = 0; i < pages.length; i++) {
            seen[pages[i]] = (seen[pages[i]] || 0) + 1;
            if (pages[i] > n || pages[i] < 1) r.beyond.push(pages[i]);
        }
        for (i = 1; i <= n; i++) {
            if (!seen[i]) r.missing.push(i);
            else if (seen[i] > 1) r.duplicates.push({ page: i, times: seen[i] });
        }
        r.ok = pages.length === n && r.duplicates.length === 0 &&
            r.missing.length === 0 && r.beyond.length === 0;
        return r;
    },

    /**
     * Counts position centres per artboard (first matching rect wins).
     * @param {number[][]} centers - [[x, y]] (y up).
     * @param {number[][]} rects - artboardRects [left, top, right, bottom].
     * @returns {{counts: number[], outside: number}}
     */
    positionsPerArtboard: function (centers, rects) {
        var counts = [], outside = 0, i, j;
        for (j = 0; j < rects.length; j++) counts.push(0);
        for (i = 0; i < centers.length; i++) {
            var x = centers[i][0], y = centers[i][1], hit = false;
            for (j = 0; j < rects.length; j++) {
                var r = rects[j];
                if (x >= r[0] && x <= r[2] && y >= r[3] && y <= r[1]) {
                    counts[j]++; hit = true; break;
                }
            }
            if (!hit) outside++;
        }
        return { counts: counts, outside: outside };
    },

    /**
     * Distinct [w, h] sizes in pt (first kept; equal within 0.1 mm); null skipped.
     * @param {Array<number[]|null>} sizes
     * @returns {number[][]}
     */
    distinctSizes: function (sizes) {
        var tol = 0.1 * 72 / 25.4;    // 0.1 mm, as in verifyRelink
        var out = [];
        for (var i = 0; i < sizes.length; i++) {
            var s = sizes[i];
            if (!s) continue;
            var dup = false;
            for (var j = 0; j < out.length; j++) {
                if (Math.abs(out[j][0] - s[0]) <= tol && Math.abs(out[j][1] - s[1]) <= tol) {
                    dup = true; break;
                }
            }
            if (!dup) out.push(s);
        }
        return out;
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
     * Natural (numeric-aware) comparison of two filenames.
     * Sorts embedded numbers by value so "part_2" precedes "part_10"
     * (a plain lexical sort would order 1, 10, 11, 2…, which looks random
     * to the operator and produces unpredictable sheet numbering).
     * Case-insensitive. Returns -1 / 0 / 1.
     * @param {string} a - First name.
     * @param {string} b - Second name.
     * @returns {number} Comparison result.
     */
    naturalCompare: function (a, b) {
        a = String(a).toLowerCase();
        b = String(b).toLowerCase();
        var ia = 0, ib = 0;
        while (ia < a.length && ib < b.length) {
            var ca = a.charAt(ia), cb = b.charAt(ib);
            var da = (ca >= "0" && ca <= "9");
            var db = (cb >= "0" && cb <= "9");
            if (da && db) {
                var na = "";
                while (ia < a.length && a.charAt(ia) >= "0" && a.charAt(ia) <= "9") { na += a.charAt(ia++); }
                var nb = "";
                while (ib < b.length && b.charAt(ib) >= "0" && b.charAt(ib) <= "9") { nb += b.charAt(ib++); }
                var diff = parseInt(na, 10) - parseInt(nb, 10);
                if (diff !== 0) return diff < 0 ? -1 : 1;
                // Equal value but different digit count → fewer leading zeros first.
                if (na.length !== nb.length) return na.length < nb.length ? -1 : 1;
            } else {
                if (ca !== cb) return ca < cb ? -1 : 1;
                ia++; ib++;
            }
        }
        var ra = a.length - ia, rb = b.length - ib;
        if (ra !== rb) return ra < rb ? -1 : 1;
        return 0;
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
                    if (d.fullName && BRE.Core.samePath(d.fullName.fsName, file.fsName)) return d;
                } catch (e) {}
            }
        } catch (e) {}
        return null;
    },

    /**
     * Builds a human-readable snapshot of every placed item in the document —
     * layer + visibility, parent group / clip state, hidden-layer result,
     * linked file name. Used by diagnostic mode to reveal the real document
     * structure when removal behaves unexpectedly.
     * @param {Document} doc - Document to inspect.
     * @param {number} totalPages - Detected page count of the source PDF.
     * @returns {string} Multi-line report.
     */
    diagnosticReport: function (doc, totalPages) {
        var items = doc.placedItems;
        var lines = [];
        lines.push("  totalPages=" + totalPages + "  placedItems=" + items.length);
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var lay = "?", vis = "?", par = "?", clp = "-", hid = "?", fil = "?";
            try { lay = it.layer.name; } catch (e) {}
            try { vis = it.layer.visible; } catch (e) {}
            try {
                par = it.parent.typename;
                if (par === "GroupItem") clp = it.parent.clipped;
            } catch (e) {}
            try { hid = this._isHidden(it); } catch (e) {}
            try { fil = it.file ? decodeURI(it.file.name) : "NONE"; } catch (e) { fil = "ERR"; }
            lines.push("    [" + i + "] layer='" + lay + "' vis=" + vis +
                       " parent=" + par + " clipped=" + clp + " hidden=" + hid + " file=" + fil);
        }
        return lines.join("\n");
    },

    /**
     * Appends a UTF-8 line of text to a log file in the given folder.
     * @param {Folder} folder - Destination folder.
     * @param {string} fileName - Log file name.
     * @param {string} text - Text to append.
     */
    appendLog: function (folder, fileName, text) {
        try {
            var f = new File(folder.fsName + "/" + fileName);
            f.encoding = "UTF-8";
            if (f.open("a")) {
                f.write(text + "\n");
                f.close();
            }
        } catch (e) {
            this._log("appendLog failed: " + e.message);
        }
    },

    // ---------------------------------------------------------------------
    // Paths in two Unicode forms
    // ---------------------------------------------------------------------

    // Canonical decomposition of every precomposed letter of Latin-1
    // Supplement and Latin Extended-A: triples of the letter, its ASCII base
    // and its combining mark (generated from Unicode NFD, checked against it
    // by tests/test_paths.js).
        _NFD_TABLE: "\u00C0A\u0300\u00C1A\u0301\u00C2A\u0302\u00C3A\u0303\u00C4A\u0308" +
            "\u00C5A\u030A\u00C7C\u0327\u00C8E\u0300\u00C9E\u0301\u00CAE\u0302" +
            "\u00CBE\u0308\u00CCI\u0300\u00CDI\u0301\u00CEI\u0302\u00CFI\u0308" +
            "\u00D1N\u0303\u00D2O\u0300\u00D3O\u0301\u00D4O\u0302\u00D5O\u0303" +
            "\u00D6O\u0308\u00D9U\u0300\u00DAU\u0301\u00DBU\u0302\u00DCU\u0308" +
            "\u00DDY\u0301\u00E0a\u0300\u00E1a\u0301\u00E2a\u0302\u00E3a\u0303" +
            "\u00E4a\u0308\u00E5a\u030A\u00E7c\u0327\u00E8e\u0300\u00E9e\u0301" +
            "\u00EAe\u0302\u00EBe\u0308\u00ECi\u0300\u00EDi\u0301\u00EEi\u0302" +
            "\u00EFi\u0308\u00F1n\u0303\u00F2o\u0300\u00F3o\u0301\u00F4o\u0302" +
            "\u00F5o\u0303\u00F6o\u0308\u00F9u\u0300\u00FAu\u0301\u00FBu\u0302" +
            "\u00FCu\u0308\u00FDy\u0301\u00FFy\u0308\u0100A\u0304\u0101a\u0304" +
            "\u0102A\u0306\u0103a\u0306\u0104A\u0328\u0105a\u0328\u0106C\u0301" +
            "\u0107c\u0301\u0108C\u0302\u0109c\u0302\u010AC\u0307\u010Bc\u0307" +
            "\u010CC\u030C\u010Dc\u030C\u010ED\u030C\u010Fd\u030C\u0112E\u0304" +
            "\u0113e\u0304\u0114E\u0306\u0115e\u0306\u0116E\u0307\u0117e\u0307" +
            "\u0118E\u0328\u0119e\u0328\u011AE\u030C\u011Be\u030C\u011CG\u0302" +
            "\u011Dg\u0302\u011EG\u0306\u011Fg\u0306\u0120G\u0307\u0121g\u0307" +
            "\u0122G\u0327\u0123g\u0327\u0124H\u0302\u0125h\u0302\u0128I\u0303" +
            "\u0129i\u0303\u012AI\u0304\u012Bi\u0304\u012CI\u0306\u012Di\u0306" +
            "\u012EI\u0328\u012Fi\u0328\u0130I\u0307\u0134J\u0302\u0135j\u0302" +
            "\u0136K\u0327\u0137k\u0327\u0139L\u0301\u013Al\u0301\u013BL\u0327" +
            "\u013Cl\u0327\u013DL\u030C\u013El\u030C\u0143N\u0301\u0144n\u0301" +
            "\u0145N\u0327\u0146n\u0327\u0147N\u030C\u0148n\u030C\u014CO\u0304" +
            "\u014Do\u0304\u014EO\u0306\u014Fo\u0306\u0150O\u030B\u0151o\u030B" +
            "\u0154R\u0301\u0155r\u0301\u0156R\u0327\u0157r\u0327\u0158R\u030C" +
            "\u0159r\u030C\u015AS\u0301\u015Bs\u0301\u015CS\u0302\u015Ds\u0302" +
            "\u015ES\u0327\u015Fs\u0327\u0160S\u030C\u0161s\u030C\u0162T\u0327" +
            "\u0163t\u0327\u0164T\u030C\u0165t\u030C\u0168U\u0303\u0169u\u0303" +
            "\u016AU\u0304\u016Bu\u0304\u016CU\u0306\u016Du\u0306\u016EU\u030A" +
            "\u016Fu\u030A\u0170U\u030B\u0171u\u030B\u0172U\u0328\u0173u\u0328" +
            "\u0174W\u0302\u0175w\u0302\u0176Y\u0302\u0177y\u0302\u0178Y\u0308" +
            "\u0179Z\u0301\u017Az\u0301\u017BZ\u0307\u017Cz\u0307\u017DZ\u030C" +
            "\u017Ez\u030C",

    /**
     * A string in the decomposed form (NFD) for the letters of _NFD_TABLE;
     * every other character stays as it is. ES3 has no String.normalize.
     * @param {string} s - Any string, typically a path.
     * @returns {string} The string with those letters decomposed.
     */
    _nfd: function (s) {
        var t = this._NFD_TABLE, out = "", i, c, k;
        s = String(s);
        for (i = 0; i < s.length; i++) {
            c = s.charAt(i);
            k = (c >= "\u00C0" && c <= "\u017F") ? t.indexOf(c) : -1;
            out += (k >= 0 && k % 3 === 0) ? t.substr(k + 1, 2) : c;
        }
        return out;
    },

    /**
     * Whether two paths name the same file. A path with diacritics comes in
     * two forms: Illustrator reports a placed file's and a document's path
     * decomposed (NFD), Folder.getFiles and typed text keep the name as it is
     * stored, often composed (NFC) — measured 2026-11-15, AI 31.0.0. Compared
     * as plain strings, the two forms of one file differ.
     * @param {string} a - A path.
     * @param {string} b - Another path.
     * @param {boolean} [ignoreCase] - Compare without regard to case.
     * @returns {boolean} True when both name the same file.
     */
    samePath: function (a, b, ignoreCase) {
        var x = this._nfd(a), y = this._nfd(b);
        if (ignoreCase) { x = x.toLowerCase(); y = y.toLowerCase(); }
        return x === y;
    },

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Checks whether an item is effectively invisible — the item itself is
     * hidden, or it resides on a hidden layer (or nested hidden parent layer).
     * @param {PlacedItem} item - The item to check.
     * @returns {boolean} True if the item or any ancestor layer is hidden.
     */
    _isHidden: function (item) {
        try {
            if (item.hidden) return true;
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
