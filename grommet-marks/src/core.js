// ------------------------------------------------------------------------
// Module: GM.Core — geometry and math (pure, no DOM)
// Part of: Illustrator Grommet Marks
// Depends on: GM.CONSTANTS
// ------------------------------------------------------------------------
var GM = GM || {};

GM.Core = {
    /**
     * Converts a value between units.
     * @param {number} val - Value to convert
     * @param {string} fromUnit - Source unit name
     * @param {string} toUnit - Target unit name
     * @returns {number} Converted value
     */
    convertVal: function (val, fromUnit, toUnit) {
        if (fromUnit === toUnit) return val;
        return (val * GM.CONSTANTS.UNIT_FACTORS[fromUnit]) / GM.CONSTANTS.UNIT_FACTORS[toUnit];
    },

    /**
     * Rounds value to 6 decimal places to avoid float errors.
     * @param {number} val
     * @returns {number}
     */
    round: function (val) {
        return Math.round(val * 1000000) / 1000000;
    },

    /**
     * Calculates positions of marks along an edge.
     * All positions are measured from the start of the edge (center-to-center).
     *
     * @param {Object} edgeCfg - Edge config { useNumber, number, spacing }
     * @param {number} span - Total edge length in points
     * @param {number} offset - Global offset from both ends in user units (X or Y)
     * @param {number} unitFactor - Conversion factor (user units → points)
     * @returns {Array<number>} Array of positions in points from edge start
     */
    calcPositions: function (edgeCfg, span, offset, unitFactor) {
        // Validation
        var num = Math.max(edgeCfg.number || 1, 1);
        var spacing = Math.max(edgeCfg.spacing || 0, 0);

        var startOff = offset * unitFactor;
        var endOff = startOff; // Symmetric — same offset on both ends
        var available = span - startOff - endOff;

        if (available < 0) available = 0;

        var count, spc;

        if (edgeCfg.useNumber) {
            count = num;
            spc = count > 1 ? available / (count - 1) : 0;
        } else {
            var preferred = spacing * unitFactor;
            if (preferred <= 0) {
                count = 1;
                spc = 0;
            } else {
                var raw = (available / preferred) + 1;
                var floor = Math.max(Math.floor(raw), 1);
                var ceil = Math.max(Math.ceil(raw), 1);
                var sFloor = floor > 1 ? available / (floor - 1) : 0;
                var sCeil = ceil > 1 ? available / (ceil - 1) : 0;

                if (floor <= 1) {
                    count = ceil;
                    spc = sCeil;
                } else if (Math.abs(sFloor - preferred) <= Math.abs(sCeil - preferred)) {
                    count = floor;
                    spc = sFloor;
                } else {
                    count = ceil;
                    spc = sCeil;
                }
                // Safety cap — prevent freeze from very small spacing values
                if (count > GM.CONSTANTS.MAX_MARKS) { count = GM.CONSTANTS.MAX_MARKS; spc = count > 1 ? available / (count - 1) : 0; }
            }
        }

        var positions = [];
        for (var i = 0; i < count; i++) {
            positions.push(startOff + i * spc);
        }
        return positions;
    },

    /**
     * Evaluates a cubic Bezier at parameter t.
     * Segment: {p0,p1,p2,p3} — each [x, y]. Straight lines are encoded as
     * p1 === p0 and p2 === p3 (Illustrator anchors without handles).
     * @param {Object} seg - Segment.
     * @param {number} t - Parameter 0..1.
     * @returns {Array<number>} [x, y]
     */
    bezierPoint: function (seg, t) {
        var u = 1 - t;
        var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        return [
            a * seg.p0[0] + b * seg.p1[0] + c * seg.p2[0] + d * seg.p3[0],
            a * seg.p0[1] + b * seg.p1[1] + c * seg.p2[1] + d * seg.p3[1]
        ];
    },

    /**
     * Builds a circuit: samples every segment into a cumulative arc-length
     * table so positions along the circuit can be resolved by distance.
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...] in draw order.
     * @param {boolean} closed - True for a closed path (wraps around).
     * @returns {Object} {segments:[{seg, len, pts}], totalLen, closed}
     */
    buildCircuit: function (segments, closed) {
        var n = GM.CONSTANTS.SAMPLES_PER_SEGMENT;
        var out = [];
        var total = 0;
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];
            var pts = [];
            var len = 0;
            var prev = GM.Core.bezierPoint(seg, 0);
            pts.push({ s: 0, p: prev });
            for (var j = 1; j <= n; j++) {
                var cur = GM.Core.bezierPoint(seg, j / n);
                var dx = cur[0] - prev[0], dy = cur[1] - prev[1];
                len += Math.sqrt(dx * dx + dy * dy);
                pts.push({ s: len, p: cur });
                prev = cur;
            }
            out.push({ seg: seg, len: len, pts: pts });
            total += len;
        }
        return { segments: out, totalLen: total, closed: closed };
    },

    /**
     * Resolves the point at arc distance s along the circuit (linear
     * interpolation between samples; closed circuits wrap, open clamp).
     * @param {Object} circuit - From buildCircuit.
     * @param {number} s - Distance along the circuit. Closed: any value
     *   (wraps); open: clamped to [0, totalLen].
     * @returns {Array<number>} [x, y]
     */
    pointAtDistance: function (circuit, s) {
        if (!circuit.segments || circuit.segments.length === 0) return [0, 0];
        if (circuit.closed) {
            s = s % circuit.totalLen;
            if (s < 0) s += circuit.totalLen;
        } else {
            if (s < 0) s = 0;
            if (s > circuit.totalLen) s = circuit.totalLen;
        }
        for (var i = 0; i < circuit.segments.length; i++) {
            var sg = circuit.segments[i];
            if (s > sg.len) { s -= sg.len; continue; }
            // Binary search in the sample table
            var pts = sg.pts, lo = 0, hi = pts.length - 1;
            while (hi - lo > 1) {
                var midI = (lo + hi) >> 1;
                if (pts[midI].s < s) lo = midI; else hi = midI;
            }
            var a = pts[lo], b = pts[hi];
            var span = b.s - a.s;
            var f = span > 0 ? (s - a.s) / span : 0;
            return [a.p[0] + (b.p[0] - a.p[0]) * f, a.p[1] + (b.p[1] - a.p[1]) * f];
        }
        var last = circuit.segments[circuit.segments.length - 1];
        return last.pts[last.pts.length - 1].p;
    },

    /**
     * Distributes mark positions over one corner-to-corner span.
     * Returns sorted distances 0..L from the span start; endpoints (corner
     * marks) are always included. The caller deduplicates shared corners.
     *
     * Corner zone: zone.count marks INCLUDING the corner mark at zone.pitch,
     * mirrored from both ends ((count-1)*pitch from each end). Middle region
     * is filled with the preferred pitch using the same count selection as
     * the legacy calcPositions (floor/ceil pick) so that zones-off output is
     * positionally identical to v4 behaviour. Equivalence is a regression
     * contract: existing presets store spacing values users calibrated by eye
     * against v4 output, so zones-off must reproduce v4 positions exactly. Do
     * not replace legacyCount with a Math.round shortcut — the floor/ceil
     * tie-break differs. Count mode (mid.useNumber) applies to the whole span
     * and is only used with zones disabled.
     *
     * All lengths share one unit — the caller pre-converts to points.
     *
     * @param {number} L - Span length (>= 0).
     * @param {Object} zone - {enabled, count, pitch}.
     * @param {Object} mid - {useNumber, number, spacing}.
     * @returns {Array<number>} Sorted distances from span start.
     */
    distributeOnSpan: function (L, zone, mid) {
        var positions = [];
        var seen = {};
        function push(d) {
            if (d < 0) d = 0;
            if (d > L) d = L;
            var key = String(Math.round(d * 1e6));
            if (seen[key]) return;
            seen[key] = true;
            positions.push(d);
        }
        // Legacy count selection over a region of length M with already-placed
        // boundary marks: returns {count, spc} where count includes both
        // boundary marks (mirrors calcPositions' spacing mode exactly).
        function legacyCount(M, preferred) {
            if (preferred <= 0) return { count: 1, spc: 0 };
            var raw = (M / preferred) + 1;
            var floor = Math.max(Math.floor(raw), 1);
            var ceil = Math.max(Math.ceil(raw), 1);
            var sFloor = floor > 1 ? M / (floor - 1) : 0;
            var sCeil = ceil > 1 ? M / (ceil - 1) : 0;
            var count, spc;
            if (floor <= 1) { count = ceil; spc = sCeil; }
            else if (Math.abs(sFloor - preferred) <= Math.abs(sCeil - preferred)) { count = floor; spc = sFloor; }
            else { count = ceil; spc = sCeil; }
            if (count > GM.CONSTANTS.MAX_MARKS) {
                count = GM.CONSTANTS.MAX_MARKS;
                spc = count > 1 ? M / (count - 1) : 0;
            }
            return { count: count, spc: spc };
        }

        // !(L > 0) also catches NaN (a degenerate zero-length Bezier span)
        // so the circuit loop never propagates NaN coordinates downstream.
        if (!(L > 0)) { push(0); return positions; }

        var zoneActive = !!(zone && zone.enabled);
        var zc = zoneActive ? Math.max(zone.count || 1, 1) : 0;
        var zp = zoneActive ? Math.max(zone.pitch || 0, 0) : 0;
        var zoneLen = zoneActive ? (zc - 1) * zp : 0;

        if (zoneActive && zp > 0 && zc > 1 && 2 * zoneLen >= L) {
            // Degradation: zones meet or overlap — mirror from both ends, dedup.
            for (var di = 0; di < zc; di++) {
                var d = di * zp;
                if (d > L) break;
                push(d); push(L - d);
            }
            positions.sort(function (a, b) { return a - b; });
            return positions;
        }

        push(0); push(L);
        if (zoneActive && zp > 0) {
            for (var zi = 1; zi < zc; zi++) { push(zi * zp); push(L - zi * zp); }
        } else {
            zoneLen = 0;
        }

        if (mid.useNumber && !zoneActive) {
            var num = Math.max(mid.number || 1, 1);
            if (num > GM.CONSTANTS.MAX_MARKS) num = GM.CONSTANTS.MAX_MARKS;
            if (num === 1) {
                // Legacy parity: N=1 places a single mark at the span start.
                // Undo the initial push(0)/push(L) above (push closes over the
                // `positions` variable binding, so reassigning it is safe).
                positions = [];
                seen = {};
                push(0);
            } else {
                var cspc = L / (num - 1);
                for (var ci = 0; ci < num; ci++) push(ci * cspc);
            }
        } else {
            var m0 = zoneLen;
            var M = (L - zoneLen) - m0;
            var preferred = Math.max(mid.spacing || 0, 0);
            if (M > 0 && preferred > 0) {
                var sel = legacyCount(M, preferred);
                for (var gi = 1; gi < sel.count - 1; gi++) push(m0 + gi * sel.spc);
            }
        }

        positions.sort(function (a, b) { return a - b; });
        return positions;
    },

    /**
     * Detects corner anchors by tangent deviation. An anchor is a corner when
     * the angle between the incoming and outgoing tangents exceeds
     * minAngleDeg. Geometric truth — independent of Illustrator PointType
     * (which does not guarantee visual sharpness).
     *
     * Returns anchor indices: anchor i joins segments[i-1] -> segments[i]
     * (anchor 0 = start of segments[0]). Open circuits: both endpoints are
     * corners by definition; the last anchor index equals segments.length.
     *
     * Note: for highly curved segments the chord approximation may over- or
     * under-estimate the tangent angle at a degenerate handle by up to ~30°.
     *
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...]
     * @param {boolean} closed - Closed path flag.
     * @param {number} minAngleDeg - Threshold (GM.CONSTANTS.CORNER_ANGLE_MIN).
     * @returns {Array<number>} Sorted corner anchor indices.
     */
    detectCorners: function (segments, closed, minAngleDeg) {
        var n = segments.length;
        var corners = [];
        var minRad = minAngleDeg * Math.PI / 180;

        // Outgoing tangent at segment start; falls back to the chord when the
        // handle collapses onto the anchor (degenerate handle).
        function outTangent(seg) {
            var dx = seg.p1[0] - seg.p0[0], dy = seg.p1[1] - seg.p0[1];
            if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
            return [dx, dy];
        }
        function inTangent(seg) {
            var dx = seg.p3[0] - seg.p2[0], dy = seg.p3[1] - seg.p2[1];
            if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
            return [dx, dy];
        }
        function deviation(a, b) {
            var cross = a[0] * b[1] - a[1] * b[0];
            var dot = a[0] * b[0] + a[1] * b[1];
            return Math.abs(Math.atan2(cross, dot));
        }

        for (var i = 0; i < n; i++) {
            var isEndpoint = !closed && i === 0;
            if (isEndpoint) { corners.push(i); continue; }
            var prev = segments[(i - 1 + n) % n];
            if (deviation(inTangent(prev), outTangent(segments[i])) > minRad) {
                corners.push(i);
            }
        }
        if (!closed) corners.push(n); // last anchor of an open path
        return corners;
    }
};
