// ------------------------------------------------------------------------
// Module: BTE.Order — orders elements on the artboard into rows or columns
// Part of: Illustrator Batch Text Edit
// Depends on: —
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Order = {
    /**
     * Orders items by position, by rows (top to bottom, left to right inside
     * a row) or by columns (left to right, top to bottom inside a column).
     *
     * Clustering is transitive: items are sorted along the cluster axis and a
     * new row starts when an item's centre is more than the tolerance away
     * from the centre of the FIRST item of the current row, not from the
     * previous item. Comparing neighbours would let a slowly drifting line of
     * items chain into one row and make the result depend on the input order.
     * The tolerance is half the median item height (rows) or width (cols);
     * for an even count the median is the lower middle element.
     *
     * The engine's sort is not guaranteed stable, so every comparison ends in
     * `tie`; the result is fully determined when ties are unique. The input is
     * not modified.
     *
     * @param {Array.<{key: *, bounds: Array.<number>, tie: number}>} items -
     *     bounds are [left, top, right, bottom] in Illustrator coordinates
     *     (top > bottom, Y grows upward); tie is an integer, unique per item,
     *     that decides between identical positions.
     * @param {string} mode - "rows" or "cols".
     * @returns {Array} The keys of the items in order.
     * @throws {Error} For any other mode.
     */
    sort: function (items, mode) {
        var rows = (mode === "rows");
        var recs = [];
        var sizes = [];
        var keys = [];
        var i, b, cx, cy, tolerance, start, first, group, j;

        if (!rows && mode !== "cols") {
            throw new Error("BTE.Order.sort: unknown mode \"" + mode + "\"");
        }

        // major = position on the cluster axis, minor = position inside a
        // cluster, both ascending. Rows: Y descending is -cy ascending.
        for (i = 0; i < items.length; i++) {
            b = items[i].bounds;
            cx = (b[0] + b[2]) / 2;
            cy = (b[1] + b[3]) / 2;
            recs.push({
                key: items[i].key,
                tie: items[i].tie,
                major: rows ? -cy : cx,
                minor: rows ? cx : -cy
            });
            sizes.push(rows ? b[1] - b[3] : b[2] - b[0]);
        }
        if (recs.length === 0) { return keys; }

        // Items with equal major always land in the same row and are re-sorted
        // by byMinor, so the tie here only makes the intermediate order total.
        function byMajor(p, q) { return (p.major - q.major) || (p.tie - q.tie); }
        function byMinor(p, q) { return (p.minor - q.minor) || (p.tie - q.tie); }

        sizes.sort(function (p, q) { return p - q; });
        tolerance = sizes[Math.floor((sizes.length - 1) / 2)] / 2;

        recs.sort(byMajor);

        // Sorted along the cluster axis, so the distance to the first item of
        // the row is never negative and needs no Math.abs.
        start = 0;
        first = recs[0].major;
        for (i = 1; i <= recs.length; i++) {
            if (i < recs.length && recs[i].major - first <= tolerance) { continue; }
            group = recs.slice(start, i);
            group.sort(byMinor);
            for (j = 0; j < group.length; j++) { keys.push(group[j].key); }
            if (i < recs.length) {
                start = i;
                first = recs[i].major;
            }
        }
        return keys;
    }
};
