var TP = TP || {};

/**
 * Pure math module — zero Illustrator API calls.
 * All inputs/outputs are plain numbers and arrays.
 * Positions are in document points unless noted otherwise.
 *
 * Dimensional inputs to calculateGrid are in REAL mm (user-facing values).
 * The scale factor converts them to document mm internally.
 */
TP.Core = {

    /**
     * Calculates split positions along one axis using max panel dimension.
     * Optionally redistributes when the remainder panel would be too narrow.
     *
     * @param {number} artworkDimMM - Artwork dimension in real mm.
     * @param {number} maxPanelDimMM - Maximum panel dimension in real mm.
     * @param {boolean} redistribute - Whether to redistribute if remainder is narrow.
     * @param {number} redistributePct - Min remainder as % (0–100) of max width before redistribution.
     * @returns {Object} { splits: number[], panelDimMM: number, count: number, redistributed: boolean }
     */
    calculateSplitsByMaxWidth: function (artworkDimMM, maxPanelDimMM, redistribute, redistributePct) {
        if (maxPanelDimMM <= 0 || artworkDimMM <= 0) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        // No split needed
        if (artworkDimMM <= maxPanelDimMM) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        var numPanels = Math.ceil(artworkDimMM / maxPanelDimMM);
        var remainder = artworkDimMM - (numPanels - 1) * maxPanelDimMM;
        var redistributed = false;
        var panelDim = maxPanelDimMM;

        // Check if remainder is too narrow and redistribution is enabled
        if (redistribute && redistributePct > 0) {
            var minRemainder = (redistributePct / 100) * maxPanelDimMM;
            if (remainder < minRemainder) {
                panelDim = artworkDimMM / numPanels;
                redistributed = true;
            }
        }

        // Generate split positions (real mm from artwork origin)
        var splits = [];
        for (var i = 1; i < numPanels; i++) {
            splits.push(i * panelDim);
        }

        return {
            splits: splits,
            panelDimMM: panelDim,
            count: numPanels,
            redistributed: redistributed
        };
    },

    /**
     * Calculates split positions along one axis by dividing into N equal panels.
     *
     * @param {number} artworkDimMM - Artwork dimension in real mm.
     * @param {number} count - Number of panels (>= 1).
     * @returns {Object} { splits: number[], panelDimMM: number, count: number, redistributed: false }
     */
    calculateSplitsByCount: function (artworkDimMM, count) {
        if (count <= 1 || artworkDimMM <= 0) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        var panelDim = artworkDimMM / count;
        var splits = [];
        for (var i = 1; i < count; i++) {
            splits.push(i * panelDim);
        }

        return {
            splits: splits,
            panelDimMM: panelDim,
            count: count,
            redistributed: false
        };
    },

    /**
     * Calculates the full tile grid from setup parameters.
     * Supports two modes: "maxWidth" and "panelCount".
     * All dimensional values in params are in REAL mm.
     *
     * @param {Object} params
     *   params.artworkWidthMM  {number} - Artwork width in real mm.
     *   params.artworkHeightMM {number} - Artwork height in real mm.
     *   params.mode            {string} - "maxWidth" or "panelCount".
     *   // Mode: maxWidth
     *   params.maxPanelWidth   {number} - Max panel width in real mm.
     *   params.maxPanelHeight  {number} - Max panel height in real mm (0 = no horizontal splits).
     *   params.redistribute    {boolean} - Whether to redistribute.
     *   params.redistributePct {number} - Redistribution threshold (% of max width).
     *   // Mode: panelCount
     *   params.columns         {number} - Number of columns.
     *   params.rows            {number} - Number of rows (1 = no horizontal splits).
     * @returns {Object} { vResult, hResult, columns, rows, totalPanels }
     */
    calculateGrid: function (params) {
        var vResult, hResult;

        if (params.mode === "panelCount") {
            vResult = this.calculateSplitsByCount(
                params.artworkWidthMM,
                params.columns || 1
            );
            hResult = this.calculateSplitsByCount(
                params.artworkHeightMM,
                params.rows || 1
            );
        } else {
            // mode === "maxWidth" (default)
            vResult = this.calculateSplitsByMaxWidth(
                params.artworkWidthMM,
                params.maxPanelWidth,
                params.redistribute,
                params.redistributePct
            );

            if (params.maxPanelHeight > 0) {
                hResult = this.calculateSplitsByMaxWidth(
                    params.artworkHeightMM,
                    params.maxPanelHeight,
                    params.redistribute,
                    params.redistributePct
                );
            } else {
                hResult = { splits: [], panelDimMM: params.artworkHeightMM, count: 1, redistributed: false };
            }
        }

        return {
            vResult: vResult,
            hResult: hResult,
            columns: vResult.count,
            rows: hResult.count,
            totalPanels: vResult.count * hResult.count
        };
    },

    /**
     * Calculates artboard rectangles for all panels from split positions.
     * Applies overlap on inner edges and bleed on outer edges.
     *
     * Overlap model (right/downward extension):
     *   Panel 0 right = splitsV[0] + overlap
     *   Panel i left  = splitsV[i-1], right = splitsV[i] + overlap
     *   Panel last left = splitsV[last], right = artworkRight + bleedRight
     *   Same vertically: top panel top = artworkTop + bleedTop,
     *   bottom extends overlap downward past split.
     *
     * @param {Object} params
     *   params.splitsV       {number[]} - Vertical split X positions in points.
     *   params.splitsH       {number[]} - Horizontal split Y positions in points.
     *   params.artworkBounds {number[]} - [left, top, right, bottom] in points.
     *   params.overlapPt     {number}   - Overlap in points.
     *   params.bleedTopPt    {number}   - Top bleed in points.
     *   params.bleedBottomPt {number}   - Bottom bleed in points.
     *   params.bleedLeftPt   {number}   - Left bleed in points.
     *   params.bleedRightPt  {number}   - Right bleed in points.
     * @returns {Object[]} Array of panel objects
     */
    calculateArtboardRects: function (params) {
        var sv = params.splitsV;
        var sh = params.splitsH;
        var ab = params.artworkBounds; // [left, top, right, bottom]
        var ov = params.overlapPt;
        var bT = params.bleedTopPt;
        var bB = params.bleedBottomPt;
        var bL = params.bleedLeftPt;
        var bR = params.bleedRightPt;

        var numCols = sv.length + 1;
        var numRows = sh.length + 1;

        // Build column boundaries (X positions in points)
        var colEdges = [ab[0]]; // artwork left
        for (var c = 0; c < sv.length; c++) colEdges.push(sv[c]);
        colEdges.push(ab[2]); // artwork right

        // Build row boundaries (Y positions in points, descending: top > bottom)
        var rowEdges = [ab[1]]; // artwork top
        for (var r = 0; r < sh.length; r++) rowEdges.push(sh[r]);
        rowEdges.push(ab[3]); // artwork bottom

        var panels = [];

        for (var row = 0; row < numRows; row++) {
            for (var col = 0; col < numCols; col++) {
                var isLeft   = (col === 0);
                var isRight  = (col === numCols - 1);
                var isTop    = (row === 0);
                var isBottom = (row === numRows - 1);

                // Net panel boundaries (artwork area this panel covers)
                var netLeft   = colEdges[col];
                var netRight  = colEdges[col + 1];
                var netTop    = rowEdges[row];
                var netBottom = rowEdges[row + 1];

                // Artboard boundaries with overlap/bleed
                var left, right, top, bottom;

                if (isLeft)  { left = netLeft - bL; }
                else         { left = netLeft; }

                if (isRight) { right = netRight + bR; }
                else         { right = netRight + ov; }

                if (isTop)    { top = netTop + bT; }
                else          { top = netTop; }

                if (isBottom) { bottom = netBottom - bB; }
                else          { bottom = netBottom - ov; }

                panels.push({
                    row: row,
                    col: col,
                    label: "Tile_R" + (row + 1) + "C" + (col + 1),
                    rect: [left, top, right, bottom],
                    netRect: [netLeft, netTop, netRight, netBottom],
                    isLeftEdge: isLeft,
                    isRightEdge: isRight,
                    isTopEdge: isTop,
                    isBottomEdge: isBottom
                });
            }
        }

        return panels;
    },

    /**
     * Calculates L-shaped crop mark segments for one panel.
     * Crop marks are placed only on outer edges (bleed edges).
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} lengthPt - Crop mark arm length in points.
     * @param {number} offsetPt - Gap between artboard edge and mark start in points.
     * @returns {Object[]} Array of line segments: { p1: [x,y], p2: [x,y] }
     */
    calculateCropMarks: function (panel, lengthPt, offsetPt) {
        var r = panel.rect; // [L, T, R, B]
        var marks = [];

        // Each corner: horizontal arm shows if the vertical edge at that corner is outer,
        // vertical arm shows if the horizontal edge at that corner is outer.
        var corners = [
            { x: r[0], y: r[1], hDir:  1, vDir: -1, showH: panel.isLeftEdge,  showV: panel.isTopEdge },
            { x: r[2], y: r[1], hDir: -1, vDir: -1, showH: panel.isRightEdge, showV: panel.isTopEdge },
            { x: r[2], y: r[3], hDir: -1, vDir:  1, showH: panel.isRightEdge, showV: panel.isBottomEdge },
            { x: r[0], y: r[3], hDir:  1, vDir:  1, showH: panel.isLeftEdge,  showV: panel.isBottomEdge }
        ];

        for (var i = 0; i < corners.length; i++) {
            var c = corners[i];

            // Horizontal arm (extending outward from corner)
            if (c.showH) {
                var hx1 = c.x - c.hDir * offsetPt;
                var hx2 = hx1 - c.hDir * lengthPt;
                marks.push({ p1: [hx1, c.y], p2: [hx2, c.y] });
            }

            // Vertical arm (extending outward from corner)
            if (c.showV) {
                var vy1 = c.y - c.vDir * offsetPt;
                var vy2 = vy1 - c.vDir * lengthPt;
                marks.push({ p1: [c.x, vy1], p2: [c.x, vy2] });
            }
        }

        return marks;
    },

    /**
     * Calculates overlap indicator line positions.
     * These show where the net panel ends and the overlap zone begins.
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} overlapPt - Overlap in document points.
     * @param {number} scale - Scale factor for real mm display.
     * @returns {Object[]} Array of indicator objects
     */
    calculateOverlapIndicators: function (panel, overlapPt, scale) {
        var r = panel.rect;     // [L, T, R, B]
        var nr = panel.netRect; // [L, T, R, B]
        var indicators = [];
        var sc = scale || 1;
        var overlapRealMM = TP.Utils.roundMM(TP.Utils.pt2mm(overlapPt) * sc, 1);
        var labelText = TP.L.format(TP.L.MARK_OVERLAP_LABEL, overlapRealMM);

        // Right inner edge: overlap zone runs from netRight to netRight + overlap
        if (!panel.isRightEdge) {
            var x = nr[2]; // net right = split position
            indicators.push({
                p1: [x, r[1]],
                p2: [x, r[3]],
                labelPos: [x + overlapPt / 2, r[1] - TP.Utils.mm2pt(2 / sc)],
                labelText: labelText
            });
        }

        // Bottom inner edge: overlap zone runs from netBottom downward
        if (!panel.isBottomEdge) {
            var y = nr[3]; // net bottom = split position
            indicators.push({
                p1: [r[0], y],
                p2: [r[2], y],
                labelPos: [r[0] + TP.Utils.mm2pt(5 / sc), y - overlapPt / 2],
                labelText: labelText
            });
        }

        return indicators;
    },

    /**
     * Calculates registration crosshair positions in the overlap zone.
     * Crosshairs at 1/4 and 3/4 of panel height/width within the overlap zone.
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} overlapPt - Overlap in points.
     * @param {number} armPt - Crosshair arm length in points.
     * @returns {Object[]} Array of crosshair objects: { center: [x,y], armPt: number }
     */
    calculateCrosshairPositions: function (panel, overlapPt, armPt) {
        var r = panel.rect;
        var nr = panel.netRect;
        var positions = [];

        var panelH = r[1] - r[3]; // top - bottom (positive)
        var panelW = r[2] - r[0]; // right - left

        // Right overlap zone crosshairs
        if (!panel.isRightEdge) {
            var cx = nr[2] + overlapPt / 2; // center of overlap zone
            positions.push({ center: [cx, r[3] + panelH * 0.25], armPt: armPt });
            positions.push({ center: [cx, r[3] + panelH * 0.75], armPt: armPt });
        }

        // Bottom overlap zone crosshairs
        if (!panel.isBottomEdge) {
            var cy = nr[3] - overlapPt / 2; // center of overlap zone
            positions.push({ center: [r[0] + panelW * 0.25, cy], armPt: armPt });
            positions.push({ center: [r[0] + panelW * 0.75, cy], armPt: armPt });
        }

        return positions;
    }
};
