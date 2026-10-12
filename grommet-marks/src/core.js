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
     * Drops zero-length segments: consecutive anchors on the same spot with
     * retracted handles, as left by a path closed with a copy of its first
     * anchor (typical of PDF/DXF contours). Their tangent is [0, 0], so
     * detectCorners would miss the corner they sit on.
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...]
     * @param {number} eps - Coincidence tolerance (document units).
     * @returns {Array<Object>} The segments without the degenerate ones.
     */
    dropDegenerateSegments: function (segments, eps) {
        function same(a, b) { return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps; }
        var out = [];
        for (var i = 0; i < segments.length; i++) {
            var s = segments[i];
            if (same(s.p0, s.p1) && same(s.p0, s.p2) && same(s.p0, s.p3)) continue;
            out.push(s);
        }
        return out;
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
     * Distributes marks over a whole circuit.
     * - With corners: every corner gets a mandatory mark; each corner-to-corner
     *   span is filled by distributeOnSpan (zones + preferred middle). Count
     *   mode on a cornered path places the corners only (1.1.0).
     * - Without corners + closed: even ring — count mode places exactly N,
     *   spacing mode places round(totalLen/spacing), starting at distance 0.
     * Marks are deduplicated by rounded coordinate (spans share corner anchors)
     * and capped at GM.CONSTANTS.MAX_MARKS.
     * Delegates to placeAlong with the corners' arc distances (start at distance 0).
     *
     * @param {Object} circuit - From buildCircuit.
     * @param {Array<number>} corners - Corner anchor indices (detectCorners).
     * @param {Object} zone - {enabled, count, pitch} (already unit-converted).
     * @param {Object} dist - {useNumber, number, spacing} (unit-converted).
     * @returns {Array<Array<number>>} [[x, y], ...]
     */
    distributeOnCircuit: function (circuit, corners, zone, dist) {
        // Anchor indices -> arc distances; the distribution itself lives in
        // placeAlong, shared with the path pipeline (start at distance 0 keeps
        // the 1.2.0 positions for callers of this function).
        var anchorDist = [0];
        for (var a = 0; a < circuit.segments.length; a++) {
            anchorDist.push(anchorDist[a] + circuit.segments[a].len);
        }
        var cd = [];
        for (var c = 0; c < corners.length; c++) cd.push(anchorDist[corners[c]]);
        return GM.Core.placeAlong(circuit, cd, circuit.closed, zone, dist, 0);
    },

    /**
     * Distributes marks along a circuit between given corner positions.
     * - No corners on a loop: an even ring starting at startDist — count
     *   mode places exactly N, spacing mode round(total/spacing).
     * - Count mode with corners: the marks ARE the corners (1.1.0 rule).
     * - Otherwise every corner-to-corner span is filled by distributeOnSpan
     *   (zones + preferred spacing); a loop wraps from the last corner to the
     *   first. An open run passes its two ends as the first and last corner.
     * Marks are deduplicated by rounded coordinate and capped at MAX_MARKS.
     *
     * @param {Object} circuit - From buildCircuit.
     * @param {Array<number>} cornerDists - Ascending arc distances; may run past
     *   totalLen on a closed circuit (pointAtDistance wraps).
     * @param {boolean} loop - True: spans wrap last -> first corner.
     * @param {Object} zone - {enabled, count, pitch} (document units).
     * @param {Object} dist - {useNumber, number, spacing} (document units).
     * @param {number} startDist - First mark of a cornerless loop.
     * @returns {Array<Array<number>>} [[x, y], ...]
     */
    placeAlong: function (circuit, cornerDists, loop, zone, dist, startDist) {
        var marks = [];
        var seen = {};
        function place(p) {
            var key = Math.round(p[0] * 10) / 10 + "|" + Math.round(p[1] * 10) / 10;
            if (seen[key]) return;
            seen[key] = true;
            marks.push(p);
        }
        var total = circuit.totalLen;
        if (total <= 0) return marks;

        if (cornerDists.length === 0) {
            if (!loop) return marks;
            var count;
            if (dist.useNumber) {
                count = Math.max(dist.number || 1, 1);
            } else {
                var sp = Math.max(dist.spacing || 0, 0);
                // round() yields 0 when spacing > 2*perimeter — clamp to 1 mark.
                count = sp > 0 ? Math.round(total / sp) : 1;
                if (count < 1) count = 1;
            }
            if (count > GM.CONSTANTS.MAX_MARKS) count = GM.CONSTANTS.MAX_MARKS;
            var step = total / count;
            for (var i = 0; i < count; i++) place(GM.Core.pointAtDistance(circuit, startDist + i * step));
            return marks;
        }

        if (dist.useNumber) {
            for (var kc = 0; kc < cornerDists.length; kc++) {
                if (marks.length >= GM.CONSTANTS.MAX_MARKS) return marks;
                place(GM.Core.pointAtDistance(circuit, cornerDists[kc]));
            }
            return marks;
        }

        var spans = [];
        for (var ci = 0; ci < cornerDists.length; ci++) {
            var from = cornerDists[ci], to;
            if (ci + 1 < cornerDists.length) {
                to = cornerDists[ci + 1];
            } else if (loop) {
                to = total + cornerDists[0];
            } else {
                break;
            }
            spans.push({ from: from, len: to - from });
        }
        for (var si = 0; si < spans.length; si++) {
            var pos = GM.Core.distributeOnSpan(spans[si].len, zone,
                { useNumber: false, number: 1, spacing: dist.spacing });
            for (var pi = 0; pi < pos.length; pi++) {
                if (marks.length >= GM.CONSTANTS.MAX_MARKS) return marks;
                place(GM.Core.pointAtDistance(circuit, spans[si].from + pos[pi]));
            }
        }
        return marks;
    },

    /**
     * Arc distance of the highest point of a circuit (largest Y — the
     * document coordinate system is Y-up). On a flat top it is the middle of
     * the highest run, so the result does not depend on drawing direction or
     * the first anchor. Otherwise it is refined on the Bezier in the sample
     * intervals on both sides of the highest sample — the apex may lie just
     * past an anchor, in the next segment.
     * @param {Object} circuit - From buildCircuit.
     * @returns {number} Distance along the circuit.
     */
    topmostDist: function (circuit) {
        var n = GM.CONSTANTS.SAMPLES_PER_SEGMENT, segs = circuit.segments;
        // One entry per distinct sample in path order: {seg, t, s, y}. A
        // segment's first sample repeats the previous segment's last one; on
        // a closed circuit the very first sample repeats the last one too.
        var list = [], acc = 0, i, j;
        for (i = 0; i < segs.length; i++) {
            var pts = segs[i].pts;
            for (j = (i === 0 && !circuit.closed) ? 0 : 1; j < pts.length; j++) {
                list.push({ seg: i, t: j / n, s: acc + pts[j].s, y: pts[j].p[1] });
            }
            acc += segs[i].len;
        }
        if (list.length === 0) return 0;
        var N = list.length, total = circuit.totalLen, EPS = 1e-7, k = 0;
        for (i = 1; i < N; i++) {
            if (list[i].y > list[k].y) k = i;
        }
        function at(x) { return circuit.closed ? list[(x % N + N) % N] : list[x]; }

        var lo = k, hi = k, top = list[k].y;
        while ((circuit.closed || lo > 0) && hi - lo + 1 < N && at(lo - 1).y >= top - EPS) lo--;
        while ((circuit.closed || hi < N - 1) && hi - lo + 1 < N && at(hi + 1).y >= top - EPS) hi++;
        if (hi > lo) {
            var sLo = at(lo).s, sHi = at(hi).s;
            if (sHi < sLo) sHi += total;            // the run crosses the start
            var mid = (sLo + sHi) / 2;
            return total > 0 ? mid % total : mid;
        }

        var best = { y: -Infinity, s: list[k].s };
        function refine(p, q) {                     // sample interval p -> q lies in segment q.seg
            var si = q.seg, seg = segs[si].seg, sp = segs[si].pts;
            var l = (p.seg === q.seg) ? p.t : 0, h = q.t;
            for (var it = 0; it < 40; it++) {
                var m1 = l + (h - l) / 3, m2 = h - (h - l) / 3;
                if (GM.Core.bezierPoint(seg, m1)[1] < GM.Core.bezierPoint(seg, m2)[1]) l = m1; else h = m2;
            }
            var t = (l + h) / 2, y = GM.Core.bezierPoint(seg, t)[1];
            if (y > best.y) {
                var f = t * n, j0 = Math.min(Math.floor(f), n - 1);
                var segStart = q.s - sp[Math.round(q.t * n)].s;
                best = { y: y, s: segStart + sp[j0].s + (sp[j0 + 1].s - sp[j0].s) * (f - j0) };
            }
        }
        if (circuit.closed || k > 0) refine(at(k - 1), list[k]);
        if (circuit.closed || k < N - 1) refine(list[k], at(k + 1));
        return best.s;
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
