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
    },

    /**
     * True when a segment is a straight line: both handles lie on the chord
     * (retracted handles included).
     * @param {Object} seg - {p0,p1,p2,p3}.
     * @param {number} eps - Distance tolerance (document units).
     * @returns {boolean}
     */
    isStraightSegment: function (seg, eps) {
        var dx = seg.p3[0] - seg.p0[0], dy = seg.p3[1] - seg.p0[1];
        var len = Math.sqrt(dx * dx + dy * dy);
        function off(p) {
            var ux = p[0] - seg.p0[0], uy = p[1] - seg.p0[1];
            if (len === 0) return Math.sqrt(ux * ux + uy * uy);
            return Math.abs(ux * dy - uy * dx) / len;
        }
        return off(seg.p1) <= eps && off(seg.p2) <= eps;
    },

    /** Outgoing tangent at a segment start (chord when the handle is retracted). */
    _tangentOut: function (seg) {
        var dx = seg.p1[0] - seg.p0[0], dy = seg.p1[1] - seg.p0[1];
        if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
        return [dx, dy];
    },

    /** Incoming tangent at a segment end (chord when the handle is retracted). */
    _tangentIn: function (seg) {
        var dx = seg.p3[0] - seg.p2[0], dy = seg.p3[1] - seg.p2[1];
        if (dx === 0 && dy === 0) { dx = seg.p3[0] - seg.p0[0]; dy = seg.p3[1] - seg.p0[1]; }
        return [dx, dy];
    },

    /** Signed angle from vector a to vector b, in (-PI, PI]. */
    _signedAngle: function (a, b) {
        return Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
    },

    /**
     * Where the corner marks of a path go (spec §4, §5.2). Sharp corners are
     * the anchors detectCorners finds (open-path ends included). A rounded
     * corner is a run of curved segments joining straight segments smoothly
     * at both ends and turning by more than minAngleDeg in total; its mark
     * sits at the run's arc-length midpoint. An arc between two sharp corners
     * is a side, not a corner. Arcs drawn as many short lines are not
     * recognised (each bend stays under the threshold).
     *
     * @param {Array<Object>} segments - [{p0,p1,p2,p3}, ...] (degenerate dropped).
     * @param {boolean} closed - Closed path flag.
     * @param {number} minAngleDeg - GM.CONSTANTS.CORNER_ANGLE_MIN.
     * @param {Object} circuit - buildCircuit(segments, closed).
     * @returns {Object} {dists: ascending arc distances, sharp: n, round: n}
     */
    findCorners: function (segments, closed, minAngleDeg, circuit) {
        var n = segments.length, res = { dists: [], sharp: 0, round: 0 };
        if (n === 0) return res;
        var minRad = minAngleDeg * Math.PI / 180, i;
        var sharpIdx = GM.Core.detectCorners(segments, closed, minAngleDeg);
        var isSharp = {};
        for (i = 0; i < sharpIdx.length; i++) isSharp[sharpIdx[i]] = true;
        var anchorDist = [0];
        for (i = 0; i < n; i++) anchorDist.push(anchorDist[i] + circuit.segments[i].len);
        for (i = 0; i < sharpIdx.length; i++) res.dists.push(anchorDist[sharpIdx[i]]);
        res.sharp = sharpIdx.length;

        var straight = [];
        for (i = 0; i < n; i++) straight.push(GM.Core.isStraightSegment(segments[i], GM.CONSTANTS.SEGMENT_EPS));

        // Path order; a closed path starts on a straight segment so a curved
        // run that wraps past index 0 is seen whole.
        var order = [];
        if (closed) {
            var first = -1;
            for (i = 0; i < n; i++) { if (straight[i]) { first = i; break; } }
            if (first >= 0) { for (i = 0; i < n; i++) order.push((first + i) % n); }
        } else {
            for (i = 0; i < n; i++) order.push(i);
        }

        var total = circuit.totalLen, p = 0;
        while (p < order.length) {
            if (straight[order[p]]) { p++; continue; }
            var r = p, turn = 0, len = 0;
            while (r < order.length && !straight[order[r]] && (r === p || !isSharp[order[r]])) {
                var sg = segments[order[r]];
                turn += GM.Core._signedAngle(GM.Core._tangentOut(sg), GM.Core._tangentIn(sg));
                if (r > p) turn += GM.Core._signedAngle(GM.Core._tangentIn(segments[order[r - 1]]), GM.Core._tangentOut(sg));
                len += circuit.segments[order[r]].len;
                r++;
            }
            var before = p > 0 ? order[p - 1] : -1;
            var after = -1;
            if (r < order.length) after = order[r];
            else if (closed) after = order[0];
            var startAnchor = order[p];
            var endAnchor = closed ? (order[r - 1] + 1) % n : order[r - 1] + 1;
            if (before >= 0 && after >= 0 && straight[before] && straight[after] &&
                    !isSharp[startAnchor] && !isSharp[endAnchor] && Math.abs(turn) > minRad) {
                var d = anchorDist[startAnchor] + len / 2;
                res.dists.push(closed && total > 0 ? d % total : d);
                res.round++;
            }
            p = r;
        }
        res.dists.sort(function (a, b) { return a - b; });
        return res;
    },

    /** Projection of q onto chord a-b: {t (0..1), d2 (squared distance)}. */
    _projectOnChord: function (a, b, q) {
        var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
        var t = l2 > 0 ? ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2 : 0;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        var x = a[0] + dx * t - q[0], y = a[1] + dy * t - q[1];
        return { t: t, d2: x * x + y * y };
    },

    /** Bounding box of every segment's samples, cached on the circuit. */
    _segBoxes: function (circuit) {
        if (circuit._boxes) return circuit._boxes;
        var boxes = [];
        for (var i = 0; i < circuit.segments.length; i++) {
            var pts = circuit.segments[i].pts, b = [Infinity, Infinity, -Infinity, -Infinity];
            for (var j = 0; j < pts.length; j++) {
                var p = pts[j].p;
                if (p[0] < b[0]) b[0] = p[0];
                if (p[1] < b[1]) b[1] = p[1];
                if (p[0] > b[2]) b[2] = p[0];
                if (p[1] > b[3]) b[3] = p[1];
            }
            boxes.push(b);
        }
        circuit._boxes = boxes;
        return boxes;
    },

    /**
     * The circuit as one polygon for the inside test and the signed area:
     * a straight segment adds only its end point, a curved one every 4th
     * sample and its end. Kept small on purpose — in the ExtendScript engine
     * a point-in-polygon test over thousands of vertices costs tens of ms per
     * mark (measured 2026-10-12: 5 761 vertices 80 ms). Cached on the
     * circuit. The last vertex repeats the first (harmless for both uses).
     */
    _samplePolygon: function (circuit) {
        if (circuit._poly) return circuit._poly;
        var poly = [], segs = circuit.segments, eps = GM.CONSTANTS.SEGMENT_EPS;
        if (segs.length > 0) poly.push(segs[0].pts[0].p);
        for (var i = 0; i < segs.length; i++) {
            var pts = segs[i].pts, last = pts.length - 1;
            if (!GM.Core.isStraightSegment(segs[i].seg, eps)) {
                for (var j = 4; j < last; j += 4) poly.push(pts[j].p);
            }
            poly.push(pts[last].p);
        }
        circuit._poly = poly;
        return poly;
    },

    /**
     * Arc distance of the point on the circuit nearest to q (sample chords).
     * @returns {number}
     */
    nearestDistance: function (circuit, q) {
        var best = Infinity, at = 0, acc = 0;
        for (var i = 0; i < circuit.segments.length; i++) {
            var pts = circuit.segments[i].pts;
            for (var j = 1; j < pts.length; j++) {
                var r = GM.Core._projectOnChord(pts[j - 1].p, pts[j].p, q);
                if (r.d2 < best) { best = r.d2; at = acc + pts[j - 1].s + (pts[j].s - pts[j - 1].s) * r.t; }
            }
            acc += circuit.segments[i].len;
        }
        return at;
    },

    /**
     * Shortest distance from q to the circuit's sampled line (64 chords per
     * segment, bounding boxes skip far segments). Measured to the chords on
     * purpose: marks are placed on chords of the sampled eyelet line
     * (pointAtDistance interpolates linearly), so chord to chord keeps the
     * check consistent — measuring to the curve itself would add the eyelet
     * chords' sagitta (≈0.45 pt on a 2 m circle) as false error.
     * @returns {number}
     */
    distanceToCircuit: function (circuit, q) {
        var boxes = GM.Core._segBoxes(circuit);
        var best = Infinity;
        for (var i = 0; i < circuit.segments.length; i++) {
            var b = boxes[i];
            var bx = Math.max(b[0] - q[0], 0, q[0] - b[2]), by = Math.max(b[1] - q[1], 0, q[1] - b[3]);
            if (bx * bx + by * by >= best) continue;
            var pts = circuit.segments[i].pts;
            for (var j = 1; j < pts.length; j++) {
                var r = GM.Core._projectOnChord(pts[j - 1].p, pts[j].p, q);
                if (r.d2 < best) best = r.d2;
            }
        }
        return Math.sqrt(best);
    },

    /** Ray-casting point-in-polygon. */
    pointInPolygon: function (poly, q) {
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
            if (((yi > q[1]) !== (yj > q[1])) && (q[0] < (xj - xi) * (q[1] - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    },

    /** Signed area of the sampled circuit: positive = counter-clockwise. */
    signedArea: function (circuit) {
        var poly = GM.Core._samplePolygon(circuit), a = 0;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
        }
        return a / 2;
    },

    /**
     * The run's promise, checked before anything is drawn (spec §7): every
     * mark lies inside the cut line, its distance from the cut line differs
     * from D by at most tol. Catches Illustrator's silent "no offset" (the
     * original handed back when the offset collapses).
     * Call only with D > 0: at D = 0 the marks lie on the cut line, where the
     * inside test is undefined (the caller skips the check). On reason
     * "outside" worst is Infinity — do not show it in a message.
     * @param {Array<Array<number>>} marks - [[x, y], ...].
     * @param {Object} cutCircuit - Closed circuit of the cut line.
     * @param {number} D - Offset (document units).
     * @param {number} tol - Tolerance (document units).
     * @returns {Object} {ok, worst, reason: ""|"outside"|"distance"}
     */
    checkMarks: function (marks, cutCircuit, D, tol) {
        var poly = GM.Core._samplePolygon(cutCircuit), worst = 0;
        for (var i = 0; i < marks.length; i++) {
            if (!GM.Core.pointInPolygon(poly, marks[i])) return { ok: false, worst: Infinity, reason: "outside" };
            var e = Math.abs(GM.Core.distanceToCircuit(cutCircuit, marks[i]) - D);
            if (e > worst) worst = e;
        }
        if (worst <= tol) return { ok: true, worst: worst, reason: "" };
        return { ok: false, worst: worst, reason: "distance" };
    },

    /**
     * Runs of selected segments (spec §5.4). Each segment carries `sel`
     * (both end anchors selected). Nothing or everything selected means the
     * whole outline: returns []. A closed path is scanned from just after an
     * unselected segment so a run across the first anchor stays whole.
     * @returns {Array<Object>} [{from, len, segs}] in circuit distances.
     */
    selectedRuns: function (segments, closed, circuit) {
        var n = segments.length, runs = [], i, all = true, any = false;
        for (i = 0; i < n; i++) {
            if (segments[i].sel) any = true; else all = false;
        }
        if (!any || all) return runs;
        var anchorDist = [0];
        for (i = 0; i < n; i++) anchorDist.push(anchorDist[i] + circuit.segments[i].len);
        var start = 0;
        if (closed) {
            for (i = 0; i < n; i++) { if (!segments[i].sel) { start = (i + 1) % n; break; } }
        }
        var cur = null;
        for (var k = 0; k < n; k++) {
            var idx = closed ? (start + k) % n : k;
            if (segments[idx].sel) {
                if (!cur) cur = { from: anchorDist[idx], len: 0, segs: 0 };
                cur.len += circuit.segments[idx].len;
                cur.segs++;
            } else if (cur) {
                runs.push(cur);
                cur = null;
            }
        }
        if (cur) runs.push(cur);
        return runs;
    },

    /**
     * Carries a run of the cut line onto the eyelet line: each end goes to
     * its nearest point there. The eyelet line may run the other way round
     * (Illustrator's offset decides), so orientation is matched by the sign
     * of the areas.
     * @returns {Object} {from, len} on lineCircuit.
     */
    mapRun: function (cutCircuit, run, lineCircuit) {
        var a = GM.Core.pointAtDistance(cutCircuit, run.from);
        var b = GM.Core.pointAtDistance(cutCircuit, run.from + run.len);
        var sa = GM.Core.nearestDistance(lineCircuit, a);
        var sb = GM.Core.nearestDistance(lineCircuit, b);
        var same = (GM.Core.signedArea(cutCircuit) > 0) === (GM.Core.signedArea(lineCircuit) > 0);
        var from = same ? sa : sb, to = same ? sb : sa;
        var len = to - from;
        if (len <= 0) len += lineCircuit.totalLen;
        return { from: from, len: len };
    },

    /**
     * Corner positions for one run: its two ends plus the corners strictly
     * inside it, unwrapped past totalLen where the run crosses the start.
     * @returns {Array<number>} Ascending distances.
     */
    runCorners: function (cornerDists, run, total) {
        var eps = 1e-6, inner = [];
        for (var i = 0; i < cornerDists.length; i++) {
            var c = cornerDists[i];
            if (c < run.from) c += total;
            if (c > run.from + eps && c < run.from + run.len - eps) inner.push(c);
        }
        inner.sort(function (a, b) { return a - b; });
        return [run.from].concat(inner).concat([run.from + run.len]);
    }
};
