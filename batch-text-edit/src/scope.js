// ------------------------------------------------------------------------
// Module: BTE.Scope — reads the texts of the chosen scope from the document,
//         skips the ones that must not be written and turns the rest into
//         ordered elements and the plain state the step chain runs on
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.Utils, BTE.Element, BTE.Order
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Scope = {
    /**
     * Typenames of every Illustrator page item. A selection holding anything
     * else (TextRange, InsertionPoint, ...) means the user is editing text.
     */
    PAGE_ITEMS: {
        CompoundPathItem: true, GraphItem: true, GroupItem: true, LegacyTextItem: true,
        MeshItem: true, NonNativeItem: true, PathItem: true, PlacedItem: true,
        PluginItem: true, RasterItem: true, SymbolItem: true, TextFrame: true
    },

    /** The soft line break, a line terminator like "\r". */
    ETX: String.fromCharCode(3),

    /**
     * Everything the dialog needs for one scope, in one call: the texts that
     * can be written, grouped into elements (BTE.Element), ordered by position
     * (BTE.Order), with the plain state for BTE.Steps.run and the matching
     * TextFrames for the writer. Row k of `state` and of `tfs` belongs to
     * elements[k]; inside a row the texts run as in elements[k].textIds (top
     * to bottom, left to right). Skipped texts are in neither.
     *
     * For "artboard" only the elements whose centre lies on the active
     * artboard are kept, and a skipped text counts only when the element it
     * would belong to is one of them. A skipped text never changes the
     * elements: an element left without texts is dropped.
     *
     * @param {Document} doc - The document.
     * @param {string} kind - "selection", "artboard" or "document".
     * @param {string} [order] - "rows" (default) or "cols".
     * @returns {{elements: Array.<{key: string, textIds: Array.<string>, bounds: Array.<number>, tie: number}>,
     *     state: Array.<Array.<string>>, tfs: Array.<Array.<TextFrame>>,
     *     skipped: {locked: number, overflow: number, linked: number},
     *     cursorInText: boolean, textCount: number}}
     * @throws {Error} For an unknown kind or order, or when the DOM fails;
     *     the message names what was being read.
     */
    prepare: function (doc, kind, order) {
        var mode = (order === undefined) ? "rows" : order;
        var c = BTE.Scope.collect(doc, kind);
        var onBoard = (kind === "artboard");
        var pool = onBoard ? c.texts.concat(c.skippedTexts) : c.texts;
        var out = {
            elements: [], state: [], tfs: [],
            skipped: onBoard ? { locked: 0, overflow: 0, linked: 0 } : c.skipped,
            cursorInText: c.cursorInText,
            textCount: 0
        };
        var recById = {}, loose = false, shapes = [], kept = [], byKey = {};
        var els, keys, el, textIds, tie, rec, row, tfRow, i, j;

        if (pool.length === 0) { return out; }

        for (i = 0; i < pool.length; i++) {
            recById[pool[i].id] = pool[i];
            if (pool[i].group === null) { loose = true; }
        }
        // Reading every path is the slow part; texts that all sit in groups never need it.
        if (loose) { shapes = BTE.Scope.shapes(doc); }

        els = BTE.Element.build(pool, shapes);
        if (onBoard) { els = BTE.Element.inRect(els, BTE.Scope.activeArtboardRect(doc)); }

        for (i = 0; i < els.length; i++) {
            el = els[i];
            textIds = [];
            tie = -1;
            for (j = 0; j < el.textIds.length; j++) {
                rec = recById[el.textIds[j]];
                if (rec.reason) {
                    out.skipped[rec.reason]++;
                    continue;
                }
                textIds.push(rec.id);
                if (tie < 0 || rec.tie < tie) { tie = rec.tie; }
            }
            if (textIds.length > 0) {
                el = { key: el.key, textIds: textIds, bounds: el.bounds, tie: tie };
                kept.push(el);
                byKey[el.key] = el;
            }
        }

        keys = BTE.Order.sort(kept, mode);
        for (i = 0; i < keys.length; i++) {
            el = byKey[keys[i]];
            row = [];
            tfRow = [];
            for (j = 0; j < el.textIds.length; j++) {
                rec = recById[el.textIds[j]];
                row.push(rec.contents);
                tfRow.push(rec.tf);
            }
            out.elements.push(el);
            out.state.push(row);
            out.tfs.push(tfRow);
            out.textCount += row.length;
        }
        return out;
    },

    /**
     * Reads the texts of a scope. "artboard" returns every text of the
     * document: prepare() keeps the elements on the artboard, because only
     * the element, not the text, says where a text belongs.
     *
     * A text is skipped, for the first reason that applies, when it is locked
     * or hidden (editable === false, which also covers its group, layer and
     * sublayer), threaded with another frame, or overflowing.
     *
     * @param {Document} doc - The document.
     * @param {string} kind - "selection", "artboard" or "document".
     * @returns {{cursorInText: boolean,
     *     texts: Array.<{id: string, tf: TextFrame, group: ?{id: string, bounds: Array.<number>}, bounds: Array.<number>, tie: number, contents: string}>,
     *     skipped: {locked: number, overflow: number, linked: number},
     *     skippedTexts: Array.<Object>}}
     *     tie is the index in doc.textFrames; group is the lowest group
     *     above the text (bounds of the mask for a clip group), null for a
     *     text directly in a layer. skippedTexts are records of the same
     *     shape plus `reason` ("locked", "overflow", "linked"); their
     *     contents are not read.
     * @throws {Error} For an unknown kind, or when the DOM fails.
     */
    collect: function (doc, kind) {
        var out = {
            cursorInText: false,
            texts: [],
            skipped: { locked: 0, overflow: 0, linked: 0 },
            skippedTexts: []
        };
        var groups = {};
        var all, n, sel, picked, ties, i;

        if (kind !== "selection" && kind !== "artboard" && kind !== "document") {
            throw new Error("BTE.Scope.collect: unknown kind \"" + kind + "\"");
        }
        try {
            all = doc.textFrames;
            n = all.length;
        } catch (e) {
            throw new Error("BTE.Scope: reading the document's texts failed: " + e.message);
        }

        if (kind !== "selection") {
            for (i = 0; i < n; i++) { BTE.Scope.take(all[i], i, groups, out); }
            return out;
        }

        try {
            sel = doc.selection;
        } catch (e) {
            throw new Error("BTE.Scope: reading the selection failed: " + e.message);
        }
        if (BTE.Scope.isTextEditing(sel)) {
            out.cursorInText = true;
            return out;
        }
        picked = BTE.Scope.selectedTexts(sel || []);
        if (picked.length === 0) { return out; }
        ties = BTE.Scope.tieMap(all, n);
        for (i = 0; i < picked.length; i++) {
            // A text outside doc.textFrames (not seen so far) sorts after all of them.
            BTE.Scope.take(picked[i].tf,
                ties.hasOwnProperty(picked[i].id) ? ties[picked[i].id] : n + i, groups, out);
        }
        return out;
    },

    /**
     * Whether a selection is text being edited (a cursor or selected
     * characters) rather than objects. How Illustrator reports a cursor in a
     * text is not measured yet (findings.md, Task 8 fact 2), so anything that
     * is not an array of page items counts as editing.
     * @param {*} sel - doc.selection.
     * @returns {boolean} False for null, an empty array or page items only.
     */
    isTextEditing: function (sel) {
        var i;
        if (sel === null || sel === undefined) { return false; }
        if (!BTE.Utils.isArray(sel)) { return true; }
        for (i = 0; i < sel.length; i++) {
            if (!sel[i] || !BTE.Scope.PAGE_ITEMS.hasOwnProperty(sel[i].typename)) { return true; }
        }
        return false;
    },

    /**
     * The TextFrames in a selection, through groups and clip groups at any
     * depth. A text reached twice (a group and its own text both selected)
     * is listed once.
     * @param {Array} sel - Page items.
     * @returns {Array.<{id: string, tf: TextFrame}>} In selection order.
     */
    selectedTexts: function (sel) {
        var out = [], seen = {}, i;
        function walk(item) {
            var type = item.typename, kids, n, k, id;
            if (type === "TextFrame") {
                id = item.uuid;
                if (!seen.hasOwnProperty(id)) {
                    seen[id] = true;
                    out.push({ id: id, tf: item });
                }
            } else if (type === "GroupItem") {
                kids = item.pageItems;
                n = kids.length;
                for (k = 0; k < n; k++) { walk(kids[k]); }
            }
        }
        for (i = 0; i < sel.length; i++) {
            try {
                walk(sel[i]);
            } catch (e) {
                throw new Error("BTE.Scope: reading selected object " + (i + 1) + " failed: " + e.message);
            }
        }
        return out;
    },

    /**
     * Index of every text in doc.textFrames by uuid.
     * @param {TextFrames} all - doc.textFrames.
     * @param {number} n - Its length.
     * @returns {Object.<string, number>} uuid -> index.
     */
    tieMap: function (all, n) {
        var map = {}, i;
        for (i = 0; i < n; i++) {
            try {
                map[all[i].uuid] = i;
            } catch (e) {
                throw new Error("BTE.Scope: reading text " + (i + 1) + " of the document failed: " + e.message);
            }
        }
        return map;
    },

    /**
     * Reads one text into `out.texts`, or counts it in `out.skipped` and
     * keeps its record in `out.skippedTexts`.
     * @param {TextFrame} tf - The frame.
     * @param {number} tie - Its index in doc.textFrames.
     * @param {Object} groups - Group records by uuid, shared across calls.
     * @param {Object} out - The collect() result being filled.
     */
    take: function (tf, tie, groups, out) {
        var reason = null, contents = null, rec;
        try {
            if (tf.editable === false) {
                reason = "locked";
            } else if (tf.story.textFrames.length > 1) {
                reason = "linked";
            } else {
                contents = tf.contents;
                // A point text never overflows (findings.md, Task 8 fact 4).
                if (tf.kind !== TextType.POINTTEXT && BTE.Scope.overflows(tf, contents)) {
                    reason = "overflow";
                }
            }
            rec = {
                id: tf.uuid,
                tf: tf,
                group: BTE.Scope.groupOf(tf, groups),
                bounds: tf.geometricBounds,
                tie: tie,
                contents: contents
            };
        } catch (e) {
            throw new Error("BTE.Scope: reading text " + (tie + 1) + " of the document failed: " + e.message);
        }
        if (reason === null) {
            out.texts.push(rec);
        } else {
            rec.reason = reason;
            out.skipped[reason]++;
            out.skippedTexts.push(rec);
        }
    },

    /**
     * Whether a frame hides part of its text. lines[i].characters.length
     * leaves out the line's terminator, so the walk adds it back when a "\r"
     * or a soft line break follows; whatever the walk does not reach is not
     * shown (findings.md, Task 8 fact 4; the line-sum rule is wrong).
     * @param {TextFrame} tf - An area or path text.
     * @param {string} contents - tf.contents, already read.
     * @returns {boolean} True when the frame overflows.
     */
    overflows: function (tf, contents) {
        var lines = tf.lines, n = lines.length, p = 0, i, ch;
        for (i = 0; i < n; i++) {
            p += lines[i].characters.length;
            ch = contents.charAt(p);
            if (ch === "\r" || ch === BTE.Scope.ETX) { p++; }
        }
        return p < tf.characters.length;
    },

    /**
     * The lowest group above a text, read once per group.
     * @param {TextFrame} tf - The frame.
     * @param {Object} groups - Group records by uuid, shared across calls.
     * @returns {?{id: string, bounds: Array.<number>}} null for a text
     *     directly in a layer.
     */
    groupOf: function (tf, groups) {
        var p = tf.parent, id, bounds;
        if (p.typename !== "GroupItem") { return null; }
        id = p.uuid;
        if (!groups.hasOwnProperty(id)) {
            bounds = (p.clipped === true) ? BTE.Scope.maskBounds(p) : null;
            groups[id] = { id: id, bounds: bounds || p.geometricBounds };
        }
        return groups[id];
    },

    /**
     * Bounds of a clip group's mask. The group's own geometricBounds are the
     * content's, not the mask's (findings.md, Task 8 fact 5). For a compound
     * mask the compound's own bounds count: its pathItems[0] can be a hole.
     * @param {GroupItem} g - A group with clipped === true.
     * @returns {?Array.<number>} null when no path or compound path is the
     *     mask (a text used as a mask, unmeasured); the caller then takes the
     *     group's own bounds.
     */
    maskBounds: function (g) {
        var kids = g.pageItems, n = kids.length, i, k;
        for (i = 0; i < n; i++) {
            k = kids[i];
            if (k.typename === "PathItem" && k.clipping === true) { return k.geometricBounds; }
            if (k.typename === "CompoundPathItem" && BTE.Scope.isCompoundMask(k)) { return k.geometricBounds; }
        }
        return null;
    },

    /**
     * Whether a compound path is a clipping mask. It has no `clipping` of its
     * own (undefined, measured); its subpaths carry it.
     * @param {CompoundPathItem} c - The compound path.
     * @returns {boolean}
     */
    isCompoundMask: function (c) {
        var subs = c.pathItems;
        return subs.length > 0 && subs[0].clipping === true;
    },

    /**
     * The shapes a loose text can belong to (spec 4.2 rule 2): closed paths
     * that are not masks and not subpaths of a compound path, then compound
     * paths that are not masks, anywhere in the document. Bounds are read
     * once here; BTE.Element compares in plain JS.
     *
     * Walks layers, sublayers and groups through their typed collections
     * instead of reading doc.pathItems: indexing a document-level collection
     * gets slower the further in the item is (9500 paths: 2.7-3.1 s against
     * 0.7-1.0 s for the walk, same 9000 shapes; docs/findings.md, Task 9). The
     * walk never enters a compound path, so its subpaths are left out by
     * construction.
     * @param {Document} doc - The document.
     * @returns {Array.<{id: string, bounds: Array.<number>}>}
     */
    shapes: function (doc) {
        var paths = [], compounds = [], layers, n, i = 0;
        function visit(c, isLayer) {
            var list = c.pathItems, m = list.length, k, p;
            for (k = 0; k < m; k++) {
                p = list[k];
                if (p.closed === true && p.clipping !== true) {
                    paths.push({ id: p.uuid, bounds: p.geometricBounds });
                }
            }
            list = c.compoundPathItems;
            m = list.length;
            for (k = 0; k < m; k++) {
                p = list[k];
                if (!BTE.Scope.isCompoundMask(p)) {
                    compounds.push({ id: p.uuid, bounds: p.geometricBounds });
                }
            }
            list = c.groupItems;
            m = list.length;
            for (k = 0; k < m; k++) { visit(list[k], false); }
            if (isLayer) {
                list = c.layers;
                m = list.length;
                for (k = 0; k < m; k++) { visit(list[k], true); }
            }
        }
        try {
            layers = doc.layers;
            n = layers.length;
            for (i = 0; i < n; i++) { visit(layers[i], true); }
        } catch (e) {
            throw new Error("BTE.Scope: reading the paths of top-level layer " + (i + 1) + " failed: " + e.message);
        }
        return paths.concat(compounds);
    },

    /**
     * The active artboard's rectangle.
     * @param {Document} doc - The document.
     * @returns {Array.<number>} [left, top, right, bottom].
     */
    activeArtboardRect: function (doc) {
        var boards;
        try {
            boards = doc.artboards;
            return boards[boards.getActiveArtboardIndex()].artboardRect;
        } catch (e) {
            throw new Error("BTE.Scope: reading the active artboard failed: " + e.message);
        }
    }
};
