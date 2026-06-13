// ------------------------------------------------------------------------
// Module: GM.Illustrator — Adobe Illustrator DOM adapter
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS, GM.L
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
     * Inspects the current selection for path-mode placement.
     * Pure read — never mutates the selection. Everything computable is
     * delegated to GM.Core so this stays a thin DOM extraction layer.
     *
     * @returns {Object} {ok:true, circuit, corners, closed, cornerCount,
     *                    totalLen, pathRef}
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
            if (item.typename !== "PathItem") return { ok: false, reason: "not-a-path" };
        } catch (eSel) {
            return { ok: false, reason: "not-a-path" };
        }
        var pts;
        try { pts = item.pathPoints; } catch (ePts) { return { ok: false, reason: "not-a-path" }; }
        if (!pts || pts.length < 2) return { ok: false, reason: "too-short" };

        // Extract anchors/handles into plain arrays — core stays DOM-free.
        var segments = [];
        var n = pts.length;
        var segCount = item.closed ? n : n - 1;
        for (var i = 0; i < segCount; i++) {
            var aP = pts[i], bP = pts[(i + 1) % n];
            segments.push({
                p0: [aP.anchor[0], aP.anchor[1]],
                p1: [aP.rightDirection[0], aP.rightDirection[1]],
                p2: [bP.leftDirection[0], bP.leftDirection[1]],
                p3: [bP.anchor[0], bP.anchor[1]]
            });
        }

        var circuit = GM.Core.buildCircuit(segments, !!item.closed);
        var corners = GM.Core.detectCorners(segments, !!item.closed,
            GM.CONSTANTS.CORNER_ANGLE_MIN);
        return {
            ok: true,
            circuit: circuit,
            corners: corners,
            closed: !!item.closed,
            cornerCount: corners.length,
            totalLen: circuit.totalLen,
            pathRef: item
        };
    },

    /**
     * Returns the document's [Registration] swatch colour (swatches[1] in any
     * AI locale; index 0 is [None]), or 100% K CMYK as a last-resort fallback.
     * The index assumption is VERIFIED (spot.colorType must be REGISTRATION) —
     * the user can delete [Registration] from the Swatches panel, and then
     * swatches[1] is an arbitrary swatch that would silently mis-colour the
     * fallback marks. Used when a named fill/stroke swatch is missing — marks
     * degrade to a safe, cutter-readable colour instead of being dropped.
     * @returns {Color} Registration (or black) colour.
     */
    registrationColor: function () {
        try {
            var c = GM.Illustrator.doc.swatches[1].color;
            if (c && c.typename === "SpotColor" && c.spot &&
                c.spot.colorType === ColorModel.REGISTRATION) {
                return c;
            }
        } catch (e) {}
        var k = new CMYKColor();
        k.cyan = 0; k.magenta = 0; k.yellow = 0; k.black = 100;
        return k;
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

    /** Stroked (unfilled) circle centred at (x,y); size = diameter. */
    _strokeEllipse: function (grp, x, y, size, color, weight, overprint) {
        var r = size / 2;
        var el = grp.pathItems.ellipse(y + r, x - r, size, size); // top, left, w, h
        el.filled = false;
        el.stroked = true;
        el.strokeColor = color;
        el.strokeWidth = weight;
        el.strokeOverprint = overprint;
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
        var vLine = grp.pathItems.add();
        vLine.setEntirePath([[x, y - r], [x, y + r]]);
        vLine.filled = false; vLine.stroked = true;
        vLine.strokeColor = color; vLine.strokeWidth = weight;
        vLine.strokeOverprint = overprint;
    },

};
