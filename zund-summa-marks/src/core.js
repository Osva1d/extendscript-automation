var ZSM = ZSM || {};

ZSM.Core = {
    /** @type {number} SUMMA_BAR_OFFSET - mm: Distance from graphic bottom edge to bar centerline */
    SUMMA_BAR_OFFSET: 11.5,
    /** @type {number} SUMMA_BAR_WIDTH - mm: Thickness of the Summa registration bar */
    SUMMA_BAR_WIDTH: 3,

    /**
     * Calculates all registration mark positions and the new artboard rectangle.
     * All internal calculations are in document points; physical constants are
     * divided by scaleFactor to handle Large Canvas mode transparently.
     *
     * @param {Object} s - Settings from UI (mode, gaps, sizes, etc.)
     * @param {Array}  b - Graphic bounds [L, T, R, B] in document points.
     * @returns {Object} Geometry: { marksZ[], marksS[], barS, red[], ab[], warnings[] }
     */
    calculateAll: function (s, b) {
        var cfg = ZSM.Config;
        var sf  = ZSM.Utils.getSF(); // 1 for standard, 10 for Large Canvas

        // Convert physical constants to document-space values
        var rZ    = (s.markSizeZ / 2) / sf;
        var rS    = (s.markSizeS / 2) / sf;
        var offSX = cfg.summaXCenter / sf;
        var offSY = (cfg.summaYVisual / sf) + rS;
        var gapI  = s.gapInner / sf;
        var gapO  = s.gapOuter / sf;

        // Zünd offset: inner gap + mark radius
        var offZX = gapI + rZ;
        var offZY = gapI + rZ;

        // Mode-specific active values
        var outX = (s.mode === "ZUND") ? offZX : offSX;
        var outY = (s.mode === "ZUND") ? offZY : offSY;
        var rMax = (s.mode === "ZUND") ? rZ    : rS;

        var gL = b[0], gT = b[1], gR = b[2], gB = b[3];
        var gW = gR - gL;
        var gCx = (gL + gR) / 2;

        var markTopY = gT + ZSM.Utils.mm2pt(outY);
        var markBotY = gB - ZSM.Utils.mm2pt(outY);

        // Feed contributes to artboard height for Summa only; Zünd uses gapOuter
        var feedT = (s.mode === "SUMMA") ? (s.feedTop  / sf) : gapO;
        var feedB = (s.mode === "SUMMA") ? (s.feedBottom / sf) : gapO;

        var abTop = markTopY + ZSM.Utils.mm2pt(rMax) + ZSM.Utils.mm2pt(feedT);
        var abBot = markBotY - ZSM.Utils.mm2pt(rMax) - ZSM.Utils.mm2pt(feedB);

        // Snap artboard edges to whole millimetres.
        // Use snapCeil helper to round up with 0.01mm tolerance, eliminating
        // floating-point cliff effects from pt↔mm conversion (BUG-2 fix).
        // For vertical edges: when feedTop === feedBottom (Zünd gapOuter),
        // round the total height and centre it to guarantee symmetric margins
        // (BUG-1 fix). SUMMA mode intentionally has asymmetric feeds, so
        // top/bottom are rounded independently there.
        //
        // For fixed bounds we just keep the supplied rectangle.
        var abRect;
        /** Round up to whole mm, but treat values within 0.01mm of an
         *  integer as already there (avoids fp cliff-effect). */
        function snapCeil(v) { return Math.ceil(Math.round(v * 100) / 100); }
        /** Round down with same tolerance. */
        function snapFloor(v) { return Math.floor(Math.round(v * 100) / 100); }

        if (s.useArtboardBounds) {
            abRect = b; // Fixed mode: leave artboard untouched
        } else {
            var abTop_mm = ZSM.Utils.pt2mm(abTop) * sf;
            var abBot_mm = ZSM.Utils.pt2mm(abBot) * sf;

            if (feedT === feedB) {
                // Symmetric feeds (Zünd gapOuter): round total height, then centre
                var abH_mm = snapCeil(abTop_mm - abBot_mm);
                var abMid  = (abTop + abBot) / 2;
                abTop = abMid + ZSM.Utils.mm2pt((abH_mm / 2) / sf);
                abBot = abMid - ZSM.Utils.mm2pt((abH_mm / 2) / sf);
            } else {
                // Asymmetric feeds (Summa): snap each edge independently
                abTop = ZSM.Utils.mm2pt(snapCeil(abTop_mm) / sf);
                abBot = ZSM.Utils.mm2pt(snapFloor(abBot_mm) / sf);
            }

            // horizontal edges: compute required half width then round outwards
            var reqHalfW_mm = ZSM.Utils.pt2mm(gW / 2) * sf + (outX + rMax + gapO) * sf;

            // Ensure artboard covers the Zünd orientation mark (offset from BL corner)
            if (s.mode === "ZUND") {
                var orientRight_mm = -(ZSM.Utils.pt2mm(gW / 2) * sf + outX * sf)
                                     + s.orientDist + s.markSizeZ + (s.markSizeZ / 2) + gapO * sf;
                if (orientRight_mm > reqHalfW_mm) reqHalfW_mm = orientRight_mm;
            }

            var abHalfW_mm = snapCeil(reqHalfW_mm);
            var abLeft  = gCx - ZSM.Utils.mm2pt(abHalfW_mm / sf);
            var abRight = gCx + ZSM.Utils.mm2pt(abHalfW_mm / sf);

            abRect = [abLeft, abTop, abRight, abBot];
        }

        var res = { marksZ: [], marksS: [], barS: null, red: [], ab: abRect, warnings: [] };

        // --- ZÜND marks (circles) ---
        if (s.mode === "ZUND") {
            var xL, xR, yT, yB, distFromEdge;
            if (s.useArtboardBounds) {
                distFromEdge = gapO + rZ;
                xL = gL + ZSM.Utils.mm2pt(distFromEdge);
                xR = gR - ZSM.Utils.mm2pt(distFromEdge);
                yT = gT - ZSM.Utils.mm2pt(distFromEdge);
                yB = gB + ZSM.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - ZSM.Utils.mm2pt(offZX);
                xR = gR + ZSM.Utils.mm2pt(offZX);
                yT = gT + ZSM.Utils.mm2pt(offZY);
                yB = gB - ZSM.Utils.mm2pt(offZY);
            }

            // Four corners + orientation mark (offset from BL corner)
            res.marksZ.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                             { cx: xR, cy: yT }, { cx: xR, cy: yB });
            res.marksZ.push({ cx: xL + ZSM.Utils.mm2pt((s.orientDist + s.markSizeZ) / sf), cy: yB });

            // Intermediate marks along each edge
            this.addSteps(res.marksZ, xL, yB, xL, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xL, yT, xR, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xR, yT, xR, yB, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xR, yB, xL, yB, ZSM.Utils.mm2pt(s.maxDist / sf));
        }

        // --- SUMMA marks (squares) ---
        if (s.mode === "SUMMA") {
            var xL, xR, yT, yB, distFromEdge;
            if (s.useArtboardBounds) {
                distFromEdge = gapO + rS;
                xL = gL + ZSM.Utils.mm2pt(distFromEdge);
                xR = gR - ZSM.Utils.mm2pt(distFromEdge);
                yT = gT - ZSM.Utils.mm2pt(distFromEdge);
                yB = gB + ZSM.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - ZSM.Utils.mm2pt(offSX);
                xR = gR + ZSM.Utils.mm2pt(offSX);
                yT = gT + ZSM.Utils.mm2pt(offSY);
                yB = gB - ZSM.Utils.mm2pt(offSY);
            }

            res.marksS.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                             { cx: xR, cy: yT }, { cx: xR, cy: yB });

            // Summa OPOS reads marks along left/right edges only —
            // material feeds through the cutter in Y direction.
            // No intermediate marks on top/bottom edges.
            this.addSteps(res.marksS, xL, yB, xL, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksS, xR, yT, xR, yB, ZSM.Utils.mm2pt(s.maxDist / sf));

            // Barcode reference line below graphic
            var barY = gB - ZSM.Utils.mm2pt(this.SUMMA_BAR_OFFSET / sf);
            res.barS = { x1: gL, x2: gR, y: barY, w: ZSM.Utils.mm2pt(this.SUMMA_BAR_WIDTH / sf) };
        }

        // --- Trim lines (Summa only, optional) ---
        if (s.mode === "SUMMA" && s.drawRed) {
            var sw   = cfg.redLineWidth / sf;
            var half = sw / 2;
            res.red.push({ x1: abRect[0], y1: abRect[1] - half, x2: abRect[2], y2: abRect[1] - half, w: sw });
            res.red.push({ x1: abRect[0], y1: abRect[3] + half, x2: abRect[2], y2: abRect[3] + half, w: sw });
        }

        return res;
    },

    /**
     * Inserts intermediate mark points along a segment if length exceeds max.
     * Endpoints are NOT pushed (they are already in the array from corner marks).
     * @param {Array}  arr - Target array to push {cx, cy} marks into.
     * @param {number} x1, y1 - Segment start (document points).
     * @param {number} x2, y2 - Segment end (document points).
     * @param {number} max    - Maximum allowed interval (document points).
     */
    addSteps: function (arr, x1, y1, x2, y2, max) {
        var dx = x2 - x1;
        // dy inverted: Illustrator Y-axis increases upward, so y1 - y2
        // gives the downward distance; subtracting it moves toward y2.
        var dy = y1 - y2;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (max > 0 && d > max) {
            var steps = Math.ceil(d / max);
            for (var i = 1; i < steps; i++) {
                arr.push({ cx: x1 + (dx / steps * i), cy: y1 - (dy / steps * i) });
            }
        }
    }
};
