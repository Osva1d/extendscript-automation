// ------------------------------------------------------------------------
// Module: GM.Illustrator — Adobe Illustrator DOM adapter
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L, GM.DrawingScale (getDocInfo)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Illustrator = {
    doc: null,

    /**
     * Initializes the module by getting active document.
     * @returns {boolean} True if document exists.
     */
    init: function () {
        if (app.documents.length === 0) {
            return false;
        }
        GM.Illustrator.doc = app.activeDocument;
        return true;
    },

    /**
     * Returns the fixed "Grommet Marks" layer, creating it if absent.
     * @returns {Layer} Target layer.
     */
    getOrCreateLayer: function () {
        var doc = GM.Illustrator.doc;
        try {
            return doc.layers.getByName(GM.CONSTANTS.LAYER_NAME);
        } catch (e) {
            var l = doc.layers.add();
            l.name = GM.CONSTANTS.LAYER_NAME;
            return l;
        }
    },

    /**
     * Centres of the items already on a layer (direct children), so a
     * repeated run can be told from a first one. Reads bounds only.
     * @param {Layer} layer - Mark layer.
     * @returns {Array<Array<number>>} [[x, y], ...] in document units.
     */
    itemCentres: function (layer) {
        var out = [];
        try {
            var items = layer.pageItems;
            for (var i = 0; i < items.length; i++) {
                var b = items[i].geometricBounds;   // [left, top, right, bottom]
                out.push([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]);
            }
        } catch (e) {
            GM.Utils.log("itemCentres: " + e.message);
        }
        return out;
    },

    /**
     * Segments of a path item as plain data; `sel` marks a segment whose two
     * end anchors are both selected (Direct Selection, spec §5.4).
     * @param {PathItem} item
     * @returns {Array<Object>} [{p0,p1,p2,p3,sel}, ...]
     */
    _segmentsOf: function (item) {
        var ANCHOR = null;
        try { ANCHOR = PathPointSelection.ANCHORPOINT; } catch (eEnum) {
            GM.Utils.log("_segmentsOf: no PathPointSelection — " + eEnum.message);
        }
        var pts = item.pathPoints, n = pts.length, closed = !!item.closed;
        var segs = [], segCount = closed ? n : n - 1;
        for (var i = 0; i < segCount; i++) {
            var aP = pts[i], bP = pts[(i + 1) % n];
            segs.push({
                p0: [aP.anchor[0], aP.anchor[1]],
                p1: [aP.rightDirection[0], aP.rightDirection[1]],
                p2: [bP.leftDirection[0], bP.leftDirection[1]],
                p3: [bP.anchor[0], bP.anchor[1]],
                sel: ANCHOR !== null && aP.selected === ANCHOR && bP.selected === ANCHOR
            });
        }
        return segs;
    },

    /**
     * Artboard count and the first artboard's size, for the dialog's summary
     * line, and the drawing scale the document remembers. Raw document units
     * plus the scale factor — on a Large Canvas the caller divides by `scale`.
     * @returns {Object} {artboards, width, height, scale, drawingScale}
     *     scale = the document's scaleFactor (Large Canvas); drawingScale = N
     *     of the drawing scale 1:N, 1 when the document has none.
     */
    getDocInfo: function () {
        var doc = GM.Illustrator.doc, r = doc.artboards[0].artboardRect;
        return { artboards: doc.artboards.length, width: r[2] - r[0], height: r[1] - r[3],
                 scale: doc.scaleFactor || 1, drawingScale: GM.DrawingScale.load(doc) || 1 };
    },

    /**
     * Inspects the current selection for path-mode placement. A selected
     * group holding nothing but one path (groups nested that way included)
     * counts as that path.
     * Pure read — never mutates the selection. Everything computable is
     * delegated to GM.Core so this stays a thin DOM extraction layer.
     *
     * @returns {Object} {ok:true, circuit, corners, closed, cornerCount,
     *                    sharpCount, roundCount, cornerDists, segments,
     *                    partial:{state:"none"|"runs"|"lone", runs, selectedSegs,
     *                    totalSegs}, pointSel, totalLen, pathRef}
     *                   cornerCount = cornerDists.length (sharp + rounded);
     *                   pointSel = the anchors' selection states, kept for restoring
     *                   or {ok:false, reason:"no-selection"|"not-a-path"|"too-short"}
     */
    getSelectedPathInfo: function () {
        var sel, item;
        // Whole selection probe in one try — typename on a stale/deleted ref
        // can throw ("no such element"); treat any such failure as not-a-path.
        try {
            sel = GM.Illustrator.doc.selection;
            if (!sel || sel.length === 0) return { ok: false, reason: "no-selection" };
            if (sel.length !== 1) return { ok: false, reason: "not-a-path" };
            item = sel[0];
            // A path alone in its group is often reported as the group itself:
            // it depends on how it was selected, and handing a direct
            // selection back can flip it (measured 2026-10-17). It is the
            // path the user means.
            while (item.typename === "GroupItem" && !item.clipped && item.pageItems.length === 1) {
                item = item.pageItems[0];
            }
            if (item.typename !== "PathItem") return { ok: false, reason: "not-a-path" };
        } catch (eSel) {
            return { ok: false, reason: "not-a-path" };
        }
        var pts;
        try { pts = item.pathPoints; } catch (ePts) { return { ok: false, reason: "not-a-path" }; }
        if (!pts || pts.length < 2) return { ok: false, reason: "too-short" };

        var closed = !!item.closed;
        // sel must be set before dropDegenerateSegments: it keeps the same
        // objects, so the flags stay aligned with the circuit built from them.
        var segments = GM.Core.dropDegenerateSegments(GM.Illustrator._segmentsOf(item),
            GM.CONSTANTS.SEGMENT_EPS);
        var circuit = GM.Core.buildCircuit(segments, closed);
        var corners = GM.Core.detectCorners(segments, closed, GM.CONSTANTS.CORNER_ANGLE_MIN);
        var feat = GM.Core.findCorners(segments, closed, GM.CONSTANTS.CORNER_ANGLE_MIN, circuit);

        // Point selection: read once, for the part-of-outline choice and so
        // offsetPath can hand the selection back as it was.
        var ANCHOR = null;
        try { ANCHOR = PathPointSelection.ANCHORPOINT; } catch (eEnum) {
            GM.Utils.log("getSelectedPathInfo: no PathPointSelection — " + eEnum.message);
        }
        var pointSel = [], anchorsSel = 0;
        for (var k = 0; k < pts.length; k++) {
            var st = pts[k].selected;
            pointSel.push(st);
            if (ANCHOR !== null && st === ANCHOR) anchorsSel++;
        }
        var partial = { state: "none", runs: [], selectedSegs: 0, totalSegs: segments.length };
        if (anchorsSel > 0 && anchorsSel < pts.length) {
            partial.runs = GM.Core.selectedRuns(segments, closed, circuit);
            partial.state = partial.runs.length > 0 ? "runs" : "lone";
            for (var r = 0; r < partial.runs.length; r++) partial.selectedSegs += partial.runs[r].segs;
        }
        return {
            ok: true,
            circuit: circuit,
            corners: corners,
            closed: closed,
            cornerCount: feat.dists.length,
            sharpCount: feat.sharp,
            roundCount: feat.round,
            cornerDists: feat.dists,
            segments: segments,
            partial: partial,
            pointSel: pointSel,
            totalLen: circuit.totalLen,
            pathRef: item
        };
    },

    /**
     * The eyelet line of a closed path (spec §6.1): Illustrator's own Offset
     * Path, D inward, on a clean copy of the cut line — fill only, no
     * appearance. Live effects stack, so a duplicate would carry the cut
     * line's own effects into the offset; a filled and stroked object would
     * expand into a group of two paths (engine-facts). The copy lives on the
     * cut line's layer for the length of the call and nothing of it stays.
     * Effect parameters are undocumented; measured in Illustrator 30.8.2
     * (2026-10-09 and 2026-10-13, engine-facts): the result ignores the cut
     * line's own appearance, `ofst` takes document units as they are (also on a
     * Large Canvas, so D is divided by the scale factor before the call), and
     * `doc.selection = null` does not clear a direct selection.
     * @param {Object} pathInfo - getSelectedPathInfo() result of a closed path.
     * @param {number} D - Inward offset, document units, > 0.
     * @returns {Object} {ok:true, segments, loops} or {ok:false, message};
     *                   `segments` is [] unless loops === 1.
     */
    offsetPath: function (pathInfo, D) {
        if (!(D > 0)) return { ok: false, message: "offset must be greater than 0" };
        var doc = GM.Illustrator.doc, src = pathInfo.pathRef, tmp = null, made = [];
        try {
            tmp = src.layer.pathItems.add();
            var sp = src.pathPoints;
            for (var i = 0; i < sp.length; i++) {
                var p = tmp.pathPoints.add();
                p.anchor = sp[i].anchor;
                p.leftDirection = sp[i].leftDirection;
                p.rightDirection = sp[i].rightDirection;
            }
            tmp.closed = true;
            tmp.filled = true;
            tmp.stroked = false;
            tmp.applyEffect('<LiveEffect name="Adobe Offset Path"><Dict data="R mlim ' +
                GM.CONSTANTS.OFFSET_MITER_LIMIT + ' R ofst ' + (-D) + ' I jntp 2 "/></LiveEffect>');
            // doc.selection = null leaves a path with direct-selected anchors
            // selected (measured 2026-10-13), so the cut line is deselected
            // itself; otherwise expandStyle would act on it as well and the
            // cleanup below would delete it. Then the invariant itself is
            // checked: one selected object, the copy is selected, the cut line
            // is not (a count alone would pass with the cut line as that object).
            src.selected = false;
            doc.selection = null;
            tmp.selected = true;
            var iso = doc.selection;
            if (!iso || iso.length !== 1 || !tmp.selected || src.selected) {
                throw new Error("could not isolate the offset copy");
            }
            // expandStyle acts on the active document's selection (spec §6.1).
            if (app.activeDocument.name !== doc.name) throw new Error("active document changed");
            app.executeMenuCommand("expandStyle");
            var sel = doc.selection || [];
            for (var s = 0; s < sel.length; s++) made.push(sel[s]);
            if (made.length === 0) throw new Error("expandStyle left no result selected");
            tmp = null;                              // replaced by the expanded result
            var paths = [];
            for (var m = 0; m < made.length; m++) GM.Illustrator._collectPaths(made[m], paths);
            var segs = paths.length === 1 ? GM.Illustrator._segmentsOf(paths[0]) : [];
            return { ok: true, segments: segs, loops: paths.length };
        } catch (e) {
            return { ok: false, message: e.message };
        } finally {
            for (var r = 0; r < made.length; r++) {
                try { made[r].remove(); } catch (eR) { GM.Utils.log("offsetPath cleanup: " + eR.message); }
            }
            if (tmp) {
                try { tmp.remove(); } catch (eT) { GM.Utils.log("offsetPath copy: " + eT.message); }
            }
            GM.Illustrator._restoreSelection(pathInfo);
        }
    },

    /** Every PathItem inside an item (path, compound path or group). */
    _collectPaths: function (item, out) {
        if (item.typename === "PathItem") { out.push(item); return; }
        if (item.typename === "CompoundPathItem") {
            for (var i = 0; i < item.pathItems.length; i++) out.push(item.pathItems[i]);
            return;
        }
        if (item.typename === "GroupItem") {
            for (var j = 0; j < item.pageItems.length; j++) GM.Illustrator._collectPaths(item.pageItems[j], out);
        }
    },

    /**
     * Hands the cut line's selection back as it was before offsetPath:
     * point by point, so a direct selection survives and a second run
     * behaves like the first (measured 2026-10-13, Illustrator 30.8.2:
     * setting a point's state selects the path, and the neighbours' handle
     * states read back as saved; if nothing ends up selected, the whole path
     * is selected instead).
     */
    _restoreSelection: function (pathInfo) {
        var doc = GM.Illustrator.doc;
        try {
            doc.selection = null;
            var pts = pathInfo.pathRef.pathPoints, saved = pathInfo.pointSel || [];
            for (var i = 0; i < pts.length && i < saved.length; i++) pts[i].selected = saved[i];
            var after = doc.selection;
            if (!after || after.length === 0) pathInfo.pathRef.selected = true;
        } catch (e) {
            GM.Utils.log("restoreSelection: " + e.message);
            try { pathInfo.pathRef.selected = true; } catch (e2) {
                GM.Utils.log("restoreSelection fallback: " + e2.message);
            }
        }
    },

    /**
     * Returns the document's registration colour, the stroke colour of every
     * mark: the swatch of colorType REGISTRATION wherever it sits in the
     * Swatches panel ([Registration], [Registrační]; index 1 may hold White),
     * or 100% K CMYK when the document has none. The lookup is the shared
     * GM.Registration, by type, never by name or position.
     * A script cannot remove [Registration] (measured: remove() passes with no
     * effect); whether the Swatches panel can is unverified, so the fallback stays.
     * @returns {Color} Registration (or black) colour.
     */
    registrationColor: function () {
        return GM.Registration.color(GM.Illustrator.doc);
    },

    /**
     * Places one Esko-style registration eyelet mark as a GroupItem centred at
     * (x, y) in document space. White halo strokes (knockout) sit BELOW the
     * registration strokes (overprint) so the mark stays legible on any
     * artwork. Draws a circle and/or a cross per opts flags.
     *
     * @param {Layer} targetLayer - Destination layer.
     * @param {number} x - Centre X (document space, points).
     * @param {number} y - Centre Y (document space, points).
     * @param {number} size - Diameter / cross arm span (points).
     * @param {Object} opts - {circle, cross, regWeight, haloWeight} (weights in pt).
     * @returns {boolean} True on success — caller counts failures.
     */
    placeMarkGroup: function (targetLayer, x, y, size, opts) {
        try {
            var grp = targetLayer.groupItems.add();
            var regCol = GM.Illustrator.registrationColor();
            var white = new CMYKColor();
            white.cyan = 0; white.magenta = 0; white.yellow = 0; white.black = 0;
            // bottom -> top: white halo (knockout), then registration (overprint)
            if (opts.circle) GM.Illustrator._strokeEllipse(grp, x, y, size, white,  opts.haloWeight, false);
            if (opts.cross)  GM.Illustrator._strokeCross(grp,   x, y, size, white,  opts.haloWeight, false);
            if (opts.circle) GM.Illustrator._strokeEllipse(grp, x, y, size, regCol, opts.regWeight,  true);
            if (opts.cross)  GM.Illustrator._strokeCross(grp,   x, y, size, regCol, opts.regWeight,  true);
            return true;
        } catch (e) {
            $.writeln("placeMarkGroup [" + x + ", " + y + "]: " + e.message);
            return false;
        }
    },

    /**
     * Resets the stroke style a new path inherits from the document. Scripted
     * paths take the dashes and caps of whatever was last selected (measured
     * in Illustrator 30.8.1: a selected dashed die-line gives dashed marks).
     * Joins and the miter limit are inherited too but do not apply here: the
     * circle is smooth and the cross arms have no inner corners.
     * @param {PathItem} p - Freshly created path.
     */
    _plainStroke: function (p) {
        p.strokeDashes = [];
        p.strokeCap = StrokeCap.BUTTENDCAP;
    },

    /** Stroked (unfilled) circle centred at (x,y); size = diameter. */
    _strokeEllipse: function (grp, x, y, size, color, weight, overprint) {
        var r = size / 2;
        var el = grp.pathItems.ellipse(y + r, x - r, size, size); // top, left, w, h
        el.filled = false;
        el.stroked = true;
        el.strokeColor = color;
        el.strokeWidth = weight;
        el.strokeOverprint = overprint;
        GM.Illustrator._plainStroke(el);
        return el;
    },

    /** Crosshair centred at (x,y); arm span = size (radius each direction). */
    _strokeCross: function (grp, x, y, size, color, weight, overprint) {
        var r = size / 2;
        var hLine = grp.pathItems.add();
        hLine.setEntirePath([[x - r, y], [x + r, y]]);
        hLine.filled = false; hLine.stroked = true;
        hLine.strokeColor = color; hLine.strokeWidth = weight;
        hLine.strokeOverprint = overprint;
        GM.Illustrator._plainStroke(hLine);
        var vLine = grp.pathItems.add();
        vLine.setEntirePath([[x, y - r], [x, y + r]]);
        vLine.filled = false; vLine.stroked = true;
        vLine.strokeColor = color; vLine.strokeWidth = weight;
        vLine.strokeOverprint = overprint;
        GM.Illustrator._plainStroke(vLine);
    },

};
