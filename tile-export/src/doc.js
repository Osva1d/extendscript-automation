// ------------------------------------------------------------------------
// Module: TE.Doc — reads the document: artboard, graphic, overhang, guides
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Doc = {
    /**
     * The clean-format artboard: the first one WITHOUT the panel prefix.
     * Panels are added as new artboards, so the user's original survives and
     * stays the single source of truth on a second run.
     *
     * @param {Document} doc - Active document.
     * @returns {Object|null} {index, rect} or null when only panels exist.
     */
    findCleanArtboard: function (doc) {
        var p = TE.Config.tilePrefix, i, name;
        for (i = 0; i < doc.artboards.length; i++) {
            name = String(doc.artboards[i].name);
            if (name.substring(0, p.length) !== p) {
                return { index: i, rect: doc.artboards[i].artboardRect };
            }
        }
        return null;
    },

    /**
     * Indices of artboards that ARE generated panels.
     * @param {Document} doc - Active document.
     * @returns {Array} Indices into doc.artboards.
     */
    findTileArtboards: function (doc) {
        var p = TE.Config.tilePrefix, out = [], i, name;
        for (i = 0; i < doc.artboards.length; i++) {
            name = String(doc.artboards[i].name);
            if (name.substring(0, p.length) === p) { out.push(i); }
        }
        return out;
    },

    /**
     * Placed (linked) graphics in the document.
     * @param {Document} doc - Active document.
     * @returns {Array} Placed items.
     */
    readGraphics: function (doc) {
        var out = [], i;
        try {
            for (i = 0; i < doc.placedItems.length; i++) { out.push(doc.placedItems[i]); }
        } catch (e) {
            TE.Utils.log("readGraphics failed: " + e.message);
        }
        return out;
    },

    /**
     * How far the graphic reaches past the clean format on each edge.
     * This is the material available for the adds — the supplied PDF carries
     * bleed of its own and only that much can be used.
     *
     * Measured: geometricBounds on an unmasked placed PDF reports the real
     * data edge and visibleBounds agrees. They diverge only for clipped
     * groups, which this workflow does not produce.
     *
     * A negative value means the graphic does not even reach the artboard
     * edge. It is returned as-is; TE.Validate decides what that means.
     *
     * @param {Array} g - Graphic bounds [l, t, r, b].
     * @param {Array} c - Clean rect [l, t, r, b].
     * @returns {Object} {left, right, top, bottom} in document points.
     */
    computeOverhang: function (g, c) {
        return {
            left:   c[0] - g[0],
            right:  g[2] - c[2],
            top:    g[1] - c[1],
            bottom: c[3] - g[3]
        };
    },

    /**
     * Guide positions perpendicular to the split direction.
     *
     * Three measured facts drive this (docs/extendscript-engine-facts.md):
     *   - a hand-dragged guide IS a pathItem with guides === true
     *   - it overhangs the artboard by orders of magnitude, so bounds cannot
     *     filter it — only the cut coordinate matters
     *   - guides on locked AND hidden layers are both readable; hidden ones
     *     must be ignored, because the user cannot see what they would split on
     *
     * @param {Document} doc - Active document.
     * @param {string} direction - "horizontal" (wants vertical guides) or "vertical".
     * @returns {Object} {positions: Array, hiddenCount: number}
     */
    readGuides: function (doc, direction) {
        var wantVertical = (direction === "horizontal");
        var positions = [], hiddenCount = 0;
        var eps = 1e-6;
        var i, p, a, b;

        for (i = 0; i < doc.pathItems.length; i++) {
            p = doc.pathItems[i];
            if (!p.guides) { continue; }
            if (p.pathPoints.length < 2) { continue; }

            a = p.pathPoints[0].anchor;
            b = p.pathPoints[1].anchor;

            if (!p.layer.visible) { hiddenCount++; continue; }

            if (wantVertical && Math.abs(a[0] - b[0]) < eps) {
                positions.push(a[0]);
            } else if (!wantVertical && Math.abs(a[1] - b[1]) < eps) {
                positions.push(a[1]);
            }
        }
        return { positions: positions, hiddenCount: hiddenCount };
    }
};
