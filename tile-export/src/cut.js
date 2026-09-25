// ------------------------------------------------------------------------
// Module: TE.Cut — cut contour detection and per-panel clipping
// Part of: Illustrator Tile Export
// Depends on: TE.Config, TE.Draw, TE.L, TE.Utils
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Cut = {
    /**
     * Cut-contour items, identified by spot colour regardless of layer — the
     * same mechanism zund-summa-marks uses to route paths onto cut layers.
     *
     * Checks both stroke and fill: a contour is normally a stroke, but data
     * arriving from another workflow can carry the colour as a fill.
     *
     * @param {Document} doc - Document to search.
     * @param {string} spotName - Spot colour name.
     * @returns {Array} Matching page items. A compound path counts once, not
     *          once per sub-path.
     */
    findContour: function (doc, spotName) {
        var out = [], i;

        function matches(item) {
            var c;
            try {
                c = item.strokeColor;
                if (c && c.typename === "SpotColor" && c.spot.name === spotName) { return true; }
            } catch (e) {}
            try {
                c = item.fillColor;
                if (c && c.typename === "SpotColor" && c.spot.name === spotName) { return true; }
            } catch (e2) {}
            return false;
        }

        try {
            for (i = 0; i < doc.pathItems.length; i++) {
                if (matches(doc.pathItems[i])) { out.push(doc.pathItems[i]); }
            }
        } catch (e3) {
            TE.Utils.log("findContour: pathItems unreadable: " + e3.message);
        }

        try {
            for (i = 0; i < doc.compoundPathItems.length; i++) {
                // A compound path reports its colour on the first sub-path —
                // measured on a real ring built through Make Compound Path.
                if (matches(doc.compoundPathItems[i].pathItems[0])) {
                    out.push(doc.compoundPathItems[i]);
                }
            }
        } catch (e4) {
            TE.Utils.log("findContour: compoundPathItems unreadable: " + e4.message);
        }

        return out;
    },


    /**
     * Transfers the contour into a panel's temporary document and clips it to
     * the panel by subtracting a covering frame.
     *
     * Subtraction, not intersection — measured: Intersect leaves compound
     * paths and multiple shapes uncropped, Subtract handles both and keeps
     * holes. It is also what the user does by hand.
     *
     * @param {Document} tmpDoc - The panel's temporary document.
     * @param {Array} sourceItems - Contour items in the SOURCE document.
     * @param {Object} tf - Transform from TE.Export.tileTransform().
     * @param {Object} s - Settings; cutSpot names the contour's spot colour.
     * @returns {number} How many paths the clipped contour ended up as.
     *          Zero means the contour does not reach this panel — not an
     *          error, but the caller should say so in the summary.
     * @throws {Error} TE_CUT:<message>
     */
    renderTileContour: function (tmpDoc, sourceItems, tf, s) {
        var copies = [];
        var i, dup, srcB, dupB, wantX, wantY;

        try {
            // 1. Transfer. duplicate() works across documents and keeps the
            //    spot colour, but positions the copy relative to the ARTBOARD
            //    CENTRE, not absolutely — measured: a contour at x = 44…815
            //    landed at −168…603 in a half-width document, off by exactly
            //    the difference between the two artboard centres.
            //
            //    So the offset is measured rather than predicted: read the
            //    copy's bounds and move it where the same transform puts the
            //    graphic. That holds however Illustrator computes it.
            for (i = 0; i < sourceItems.length; i++) {
                srcB = sourceItems[i].geometricBounds;
                dup = sourceItems[i].duplicate(tmpDoc.layers[0],
                                               ElementPlacement.PLACEATEND);
                // Scale with the artwork. It used to be only MOVED by k, so a
                // 1:10 document exported 1:1 got a contour ten times too small
                // (N22). resize(), not width/height — no size cap (N7).
                if (tf.k !== 1) { dup.resize(tf.k * 100, tf.k * 100); }
                dupB = dup.geometricBounds;
                wantX = (srcB[0] - tf.tileOrigin[0]) * tf.k;
                wantY = (srcB[1] - tf.tileOrigin[1]) * tf.k;
                dup.translate(wantX - dupB[0], wantY - dupB[1]);
                // 2. Pathfinder works on areas, not strokes.
                dup.filled = true;
                copies.push(dup);
            }
            if (copies.length === 0) { return 0; }

            // 3. Covering frame: outer rectangle with the panel as a hole.
            //    The PANEL rect, not the artboard: by now exportTile has grown
            //    the artboard for the marks, and cutting against it put the
            //    cut data a mark-width into the neighbour (N21).
            var fr = this.frameRects(tf.artboard, 20000);
            var outer = tmpDoc.pathItems.rectangle(
                fr.outer[1], fr.outer[0],
                fr.outer[2] - fr.outer[0], fr.outer[1] - fr.outer[3]);
            var hole = tmpDoc.pathItems.rectangle(
                fr.hole[1], fr.hole[0],
                fr.hole[2] - fr.hole[0], fr.hole[1] - fr.hole[3]);
            outer.filled = true; outer.stroked = false;
            hole.filled = true; hole.stroked = false;

            tmpDoc.selection = null;
            outer.selected = true; hole.selected = true;
            app.executeMenuCommand("compoundPath");
            var frame = tmpDoc.compoundPathItems[0];
            frame.zOrder(ZOrderMethod.BRINGTOFRONT);

            // 4. Subtract. Grouping is mandatory — without it the live effect
            //    is not applied and the shape comes back uncropped.
            tmpDoc.selection = null;
            for (i = 0; i < copies.length; i++) { copies[i].selected = true; }
            frame.selected = true;
            app.executeMenuCommand("group");
            app.executeMenuCommand("Live Pathfinder Subtract");
            app.executeMenuCommand("expandStyle");

            // 5. Back to a hairline stroke in the spot colour. Cut paths are
            //    read by the machine, not the eye, so thinner is more precise —
            //    the opposite of the trim line, which a person has to see.
            var spot = TE.Draw.getOrCreateSpot(tmpDoc, s.cutSpot);
            var n = 0;
            for (i = 0; i < tmpDoc.pathItems.length; i++) {
                if (tmpDoc.pathItems[i].name === "TE_line") { continue; }
                if (tmpDoc.pathItems[i].name === "TE_mark") { continue; }
                tmpDoc.pathItems[i].filled = false;
                tmpDoc.pathItems[i].stroked = true;
                tmpDoc.pathItems[i].strokeColor = spot;
                tmpDoc.pathItems[i].strokeWidth = 0.125;
                tmpDoc.pathItems[i].name = "TE_cut";
                n++;
            }
            return n;
        } catch (e) {
            throw new Error("TE_CUT:" + e.message);
        }
    },

    /**
     * Whether the document defines this spot colour.
     * @param {Document} doc - Document to check.
     * @param {string} spotName - Spot colour name.
     * @returns {boolean} True when present.
     */
    hasSpot: function (doc, spotName) {
        var i;
        try {
            for (i = 0; i < doc.spots.length; i++) {
                if (doc.spots[i].name === spotName) { return true; }
            }
        } catch (e) {}
        return false;
    },

    /**
     * Rectangles for the covering frame: everything outside the panel.
     *
     * PURE FUNCTION. The frame is one compound path — an outer rectangle with
     * the panel as a hole — not four separate rectangles. Four would overlap
     * at the corners, and what Pathfinder does there is one more thing to
     * reason about for no gain.
     *
     * @param {Array} tileRect - Panel rect [l, t, r, b] in the temporary document.
     * @param {number} margin - How far the outer rectangle reaches beyond the
     *        panel. Must exceed anything the contour can reach, or a piece of
     *        it survives outside the frame and never gets subtracted.
     * @returns {Object} {outer: [l,t,r,b], hole: [l,t,r,b]}
     */
    frameRects: function (tileRect, margin) {
        return {
            outer: [tileRect[0] - margin, tileRect[1] + margin,
                    tileRect[2] + margin, tileRect[3] - margin],
            hole: [tileRect[0], tileRect[1], tileRect[2], tileRect[3]]
        };
    }
};
