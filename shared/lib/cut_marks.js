// ------------------------------------------------------------------------
// Module: CutMarks (shared) — registration-mark geometry, pure maths, no DOM
// Part of: shared core (consumed by zund-summa-marks and tile-export)
//
// Namespace-neutral factory: buildCutMarks(NS) registers NS.Core on the
// namespace object passed in. Each tool's build cats this file and appends
// its own call — buildCutMarks(ZSM); / buildCutMarks(TE);. Tests eval this
// file, then call the factory with their mock namespace.
//
// MUST be called after NS.Utils and NS.Config are defined.
//
// Moved out of zund-summa-marks/src/core.js on 2026-09-13, unchanged apart
// from the namespace. tile-export needs the same geometry for its Zünd mode,
// and a wrong mark position would be wrong in both tools — that is the
// "fix once, holds there too" criterion docs/decisions.md asks for.
// ------------------------------------------------------------------------
function buildCutMarks(NS) {
    NS.Core = {
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
         * @param {number} [scale] - Real mm per document mm. Omitted, it is
         *        NS.Utils.getEffectiveSF(s), which reads the ACTIVE document —
         *        right for zund-summa-marks, wrong for tile-export, which
         *        draws into a temporary document and passes it (N11).
         * @returns {Object} Geometry: { marksZ[], marksS[], barS, red[], ab[], warnings[] }
         */
        calculateAll: function (s, b, scale) {
            var cfg = NS.Config;
            // Effective scale factor — see NS.Utils.getEffectiveSF() for the
            // single source of truth. Routes through that helper so core.js and
            // draw.js cannot drift apart again (the bug class fixed in v26.4.0
            // manual test: draw.js used raw getSF(), missed scaleN, marks
            // didn't shrink).
            var sf  = (Number(scale) > 0) ? Number(scale) : NS.Utils.getEffectiveSF(s);

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

            var markTopY = gT + NS.Utils.mm2pt(outY);
            var markBotY = gB - NS.Utils.mm2pt(outY);

            // Feed contributes to artboard height for Summa only; Zünd uses gapOuter
            var feedT = (s.mode === "SUMMA") ? (s.feedTop  / sf) : gapO;
            var feedB = (s.mode === "SUMMA") ? (s.feedBottom / sf) : gapO;

            var abTop = markTopY + NS.Utils.mm2pt(rMax) + NS.Utils.mm2pt(feedT);
            var abBot = markBotY - NS.Utils.mm2pt(rMax) - NS.Utils.mm2pt(feedB);

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
                var abTop_mm = NS.Utils.pt2mm(abTop) * sf;
                var abBot_mm = NS.Utils.pt2mm(abBot) * sf;

                if (feedT === feedB) {
                    // Symmetric feeds (Zünd gapOuter): round total height, then centre
                    var abH_mm = snapCeil(abTop_mm - abBot_mm);
                    var abMid  = (abTop + abBot) / 2;
                    abTop = abMid + NS.Utils.mm2pt((abH_mm / 2) / sf);
                    abBot = abMid - NS.Utils.mm2pt((abH_mm / 2) / sf);
                } else {
                    // Asymmetric feeds (Summa): snap each edge independently
                    abTop = NS.Utils.mm2pt(snapCeil(abTop_mm) / sf);
                    abBot = NS.Utils.mm2pt(snapFloor(abBot_mm) / sf);
                }

                // horizontal edges: compute required half width then round outwards
                var reqHalfW_mm = NS.Utils.pt2mm(gW / 2) * sf + (outX + rMax + gapO) * sf;

                // Ensure artboard covers the Zünd orientation mark (offset from BL corner)
                if (s.mode === "ZUND") {
                    var orientRight_mm = -(NS.Utils.pt2mm(gW / 2) * sf + outX * sf)
                                         + s.orientDist + s.markSizeZ + (s.markSizeZ / 2) + gapO * sf;
                    if (orientRight_mm > reqHalfW_mm) reqHalfW_mm = orientRight_mm;
                }

                var abHalfW_mm = snapCeil(reqHalfW_mm);
                var abLeft  = gCx - NS.Utils.mm2pt(abHalfW_mm / sf);
                var abRight = gCx + NS.Utils.mm2pt(abHalfW_mm / sf);

                abRect = [abLeft, abTop, abRight, abBot];
            }

            var res = { marksZ: [], marksS: [], barS: null, red: [], ab: abRect, warnings: [] };

            // --- ZÜND marks (circles) ---
            if (s.mode === "ZUND") {
                var xL, xR, yT, yB, distFromEdge;
                if (s.useArtboardBounds) {
                    distFromEdge = gapO + rZ;
                    xL = gL + NS.Utils.mm2pt(distFromEdge);
                    xR = gR - NS.Utils.mm2pt(distFromEdge);
                    yT = gT - NS.Utils.mm2pt(distFromEdge);
                    yB = gB + NS.Utils.mm2pt(distFromEdge);
                } else {
                    xL = gL - NS.Utils.mm2pt(offZX);
                    xR = gR + NS.Utils.mm2pt(offZX);
                    yT = gT + NS.Utils.mm2pt(offZY);
                    yB = gB - NS.Utils.mm2pt(offZY);
                }

                // Four corners + orientation mark (offset from BL corner)
                res.marksZ.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                                 { cx: xR, cy: yT }, { cx: xR, cy: yB });
                res.marksZ.push({ cx: xL + NS.Utils.mm2pt((s.orientDist + s.markSizeZ) / sf), cy: yB });

                // Intermediate marks along each edge
                this.addSteps(res.marksZ, xL, yB, xL, yT, NS.Utils.mm2pt(s.maxDist / sf));
                this.addSteps(res.marksZ, xL, yT, xR, yT, NS.Utils.mm2pt(s.maxDist / sf));
                this.addSteps(res.marksZ, xR, yT, xR, yB, NS.Utils.mm2pt(s.maxDist / sf));
                this.addSteps(res.marksZ, xR, yB, xL, yB, NS.Utils.mm2pt(s.maxDist / sf));
            }

            // --- SUMMA marks (squares) ---
            if (s.mode === "SUMMA") {
                var xL, xR, yT, yB, distFromEdge;
                if (s.useArtboardBounds) {
                    distFromEdge = gapO + rS;
                    xL = gL + NS.Utils.mm2pt(distFromEdge);
                    xR = gR - NS.Utils.mm2pt(distFromEdge);
                    yT = gT - NS.Utils.mm2pt(distFromEdge);
                    yB = gB + NS.Utils.mm2pt(distFromEdge);
                } else {
                    xL = gL - NS.Utils.mm2pt(offSX);
                    xR = gR + NS.Utils.mm2pt(offSX);
                    yT = gT + NS.Utils.mm2pt(offSY);
                    yB = gB - NS.Utils.mm2pt(offSY);
                }

                res.marksS.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                                 { cx: xR, cy: yT }, { cx: xR, cy: yB });

                // Summa OPOS reads marks along left/right edges only —
                // material feeds through the cutter in Y direction.
                // No intermediate marks on top/bottom edges.
                this.addSteps(res.marksS, xL, yB, xL, yT, NS.Utils.mm2pt(s.maxDist / sf));
                this.addSteps(res.marksS, xR, yT, xR, yB, NS.Utils.mm2pt(s.maxDist / sf));

                // Barcode reference line below graphic
                var barY = gB - NS.Utils.mm2pt(this.SUMMA_BAR_OFFSET / sf);
                res.barS = { x1: gL, x2: gR, y: barY, w: NS.Utils.mm2pt(this.SUMMA_BAR_WIDTH / sf) };
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
         * Finds marks that would print as one shape, or partly off the
         * artboard. Only overlap and touch count: that two such marks merge is
         * certain, how much clear space the camera needs between marks is not
         * known (review K7).
         *
         * @param {Object} geo - Geometry from calculateAll().
         * @param {Object} s   - Settings (mode, markSizeZ, markSizeS).
         * @param {number} [scale] - Real mm per document mm, as in calculateAll().
         * @returns {Object|null} The first conflict, { type, dist } with dist in
         *          real mm: "overlap" and "orient" (the orientation mark against
         *          another mark) give the centre distance, "outside" how far the
         *          worst mark sticks out of the artboard.
         */
        findMarkConflict: function (geo, s, scale) {
            var sf     = (Number(scale) > 0) ? Number(scale) : NS.Utils.getEffectiveSF(s);
            var zund   = (s.mode === "ZUND");
            var marks  = (zund ? geo.marksZ : geo.marksS) || [];
            var size   = zund ? s.markSizeZ : s.markSizeS;
            var tol    = 0.01;   // mm; "touching" comes out a hair either side of size
            // calculateAll pushes the orientation mark right after the four corners
            var orient = (zund && marks.length > 4) ? 4 : -1;
            var i, j, d;

            function distMm(a, b) {
                var dx = a.cx - b.cx, dy = a.cy - b.cy;
                return NS.Utils.pt2mm(Math.sqrt(dx * dx + dy * dy)) * sf;
            }

            // Spacing too tight for any mark is the root cause — report it
            // before the orientation mark's own conflicts.
            for (i = 0; i < marks.length; i++) {
                if (i === orient) continue;
                for (j = i + 1; j < marks.length; j++) {
                    if (j === orient) continue;
                    d = distMm(marks[i], marks[j]);
                    if (d < size + tol) return { type: "overlap", dist: d };
                }
            }
            if (orient >= 0) {
                for (i = 0; i < marks.length; i++) {
                    if (i === orient) continue;
                    d = distMm(marks[orient], marks[i]);
                    if (d < size + tol) return { type: "orient", dist: d };
                }
            }

            // Auto-fit sizes the artboard around the marks; a Fixed artboard
            // can be too small for the orientation mark.
            var ab = geo.ab, r = size / 2, worst = 0;
            for (i = 0; i < marks.length; i++) {
                worst = Math.max(worst,
                    NS.Utils.pt2mm(ab[0] - marks[i].cx) * sf + r,
                    NS.Utils.pt2mm(marks[i].cx - ab[2]) * sf + r,
                    NS.Utils.pt2mm(marks[i].cy - ab[1]) * sf + r,
                    NS.Utils.pt2mm(ab[3] - marks[i].cy) * sf + r);
            }
            return (worst > tol) ? { type: "outside", dist: worst } : null;
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
}
