// ------------------------------------------------------------------------
// Module: BTE.Element — groups texts into elements, the unit that gets one
//         number and is ordered by position
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.Order
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Element = {
    /**
     * Groups texts into elements. Pure data in, data out: the caller reads the
     * DOM once and passes plain objects, so nothing here touches Illustrator.
     *
     * The rule, per text (spec section 4.2):
     *   1. A text in a group belongs to the lowest group above it ("g:<id>").
     *      `group` must already be that lowest group.
     *   2. A text directly in a layer belongs to the smallest shape whose
     *      bounds contain the text's centre and whose area is strictly larger
     *      than the text's bounds ("s:<id>"). Edges count as inside. Equal
     *      areas go to the shape that comes first in `shapes`. Loose texts
     *      that share a shape form one element.
     *   3. Otherwise the text is its own element ("t:<id>").
     *
     * Known failure, by design: loose texts on one big background shape with
     * no shape of their own merge into a single element.
     *
     * The result is in a deterministic order (ascending element tie, then
     * key); ordering by position is the caller's job (BTE.Order.sort). The
     * inputs are not modified and the result shares no arrays with them.
     *
     * Speed: shapes are bucketed by position (grid()) and a text only looks
     * at the shapes over its own centre. Comparing every text with every
     * shape took 97 s for 1000 texts and 9000 shapes in the engine, whose
     * array access slows down as an array grows (docs/findings.md, Task 9).
     *
     * @param {Array.<{id: *, group: ?{id: *, bounds: Array.<number>}, bounds: Array.<number>, tie: number}>} texts -
     *     bounds are [left, top, right, bottom] in Illustrator coordinates
     *     (top > bottom); tie is an integer, unique per text.
     * @param {Array.<{id: *, bounds: Array.<number>}>} shapes - closed paths
     *     and compound paths that are not clipping masks.
     * @returns {Array.<{key: string, textIds: Array, bounds: Array.<number>, tie: number}>}
     *     textIds run top to bottom, left to right; bounds are those of the
     *     group, the shape or the lone text; tie is the smallest text tie.
     */
    build: function (texts, shapes) {
        var byKey = {};
        var recs = [];
        var elements = [];
        var grid = null;
        var i, t, key, bounds, at, rec, ids;

        for (i = 0; i < texts.length; i++) {
            t = texts[i];
            if (t.group) {
                key = "g:" + t.group.id;
                bounds = t.group.bounds;
            } else {
                // Built on the first loose text: grouped texts never need it.
                if (grid === null) { grid = BTE.Element.grid(shapes); }
                at = BTE.Element.findShape(t.bounds, grid);
                if (at >= 0) {
                    key = "s:" + shapes[at].id;
                    bounds = shapes[at].bounds;
                } else {
                    key = "t:" + t.id;
                    bounds = t.bounds;
                }
            }

            // Keys carry a prefix, so none can collide with an Object.prototype name.
            if (!byKey.hasOwnProperty(key)) {
                rec = { key: key, bounds: bounds, tie: t.tie, items: [] };
                byKey[key] = rec;
                recs.push(rec);
            }
            rec = byKey[key];
            rec.items.push({ key: t.id, bounds: t.bounds, tie: t.tie });
            if (t.tie < rec.tie) { rec.tie = t.tie; }
        }

        recs.sort(function (p, q) {
            if (p.tie !== q.tie) { return p.tie - q.tie; }
            if (p.key < q.key) { return -1; }
            if (p.key > q.key) { return 1; }
            return 0;
        });

        for (i = 0; i < recs.length; i++) {
            rec = recs[i];
            ids = BTE.Order.sort(rec.items, "rows");
            elements.push({
                key: rec.key,
                textIds: ids,
                bounds: [rec.bounds[0], rec.bounds[1], rec.bounds[2], rec.bounds[3]],
                tie: rec.tie
            });
        }
        return elements;
    },

    /**
     * Keeps the elements whose centre lies in a rectangle, edges included. An
     * element half on the artboard but with its centre outside is dropped.
     * @param {Array.<{bounds: Array.<number>}>} elements - From build().
     * @param {Array.<number>} rect - [left, top, right, bottom], top > bottom.
     * @returns {Array} The matching element objects, in input order.
     */
    inRect: function (elements, rect) {
        var out = [];
        var i, b, cx, cy;
        for (i = 0; i < elements.length; i++) {
            b = elements[i].bounds;
            cx = (b[0] + b[2]) / 2;
            cy = (b[1] + b[3]) / 2;
            if (cx >= rect[0] && cx <= rect[2] && cy <= rect[1] && cy >= rect[3]) {
                out.push(elements[i]);
            }
        }
        return out;
    },

    /**
     * Area of a [left, top, right, bottom] box with top > bottom.
     * @param {Array.<number>} b - Bounds.
     * @returns {number} Width times height.
     */
    area: function (b) {
        return (b[2] - b[0]) * (b[1] - b[3]);
    },

    /**
     * Buckets shapes by position: about one cell per shape, square-ish over
     * the union of all shape bounds. A shape is listed in every cell its
     * bounds touch, edges included, so the cell under a point lists every
     * shape whose bounds contain that point. Inside a cell the shapes keep
     * their order in `shapes`, which findShape() needs for equal areas.
     *
     * One record per shape, one array per cell: every array stays small,
     * because the engine's array access slows down as an array grows, and
     * few objects are made, because the engine pauses to collect garbage
     * (docs/findings.md, Task 9).
     * @param {Array.<{bounds: Array.<number>}>} shapes - As for build().
     * @returns {Object} Index for findShape().
     */
    grid: function (shapes) {
        var n = shapes.length;
        var g = { count: n, cells: [] };
        var side = Math.max(1, Math.ceil(Math.sqrt(n)));
        var i, b, rec, c, r, c0, c1, r0, r1, row;

        if (n === 0) { return g; }
        b = shapes[0].bounds;
        g.minX = b[0]; g.maxX = b[2]; g.minY = b[3]; g.maxY = b[1];
        for (i = 1; i < n; i++) {
            b = shapes[i].bounds;
            if (b[0] < g.minX) { g.minX = b[0]; }
            if (b[2] > g.maxX) { g.maxX = b[2]; }
            if (b[3] < g.minY) { g.minY = b[3]; }
            if (b[1] > g.maxY) { g.maxY = b[1]; }
        }
        g.cols = side;
        g.rows = side;
        g.cw = (g.maxX - g.minX) / side;
        g.ch = (g.maxY - g.minY) / side;
        for (r = 0; r < side; r++) {
            row = [];
            for (c = 0; c < side; c++) { row.push(null); }
            g.cells.push(row);
        }

        for (i = 0; i < n; i++) {
            b = shapes[i].bounds;
            rec = { bounds: b, area: BTE.Element.area(b), index: i };
            c0 = BTE.Element.slot(b[0], g.minX, g.cw, side);
            c1 = BTE.Element.slot(b[2], g.minX, g.cw, side);
            r0 = BTE.Element.slot(b[3], g.minY, g.ch, side);
            r1 = BTE.Element.slot(b[1], g.minY, g.ch, side);
            for (r = r0; r <= r1; r++) {
                row = g.cells[r];
                for (c = c0; c <= c1; c++) {
                    if (row[c] === null) { row[c] = [rec]; }
                    else { row[c].push(rec); }
                }
            }
        }
        return g;
    },

    /**
     * The cell a coordinate falls in, clamped to the grid. The same formula
     * places shapes and looks up points, so a point on a shape's edge lands
     * in a cell that lists the shape.
     * @param {number} v - The coordinate.
     * @param {number} min - The grid's lowest coordinate on that axis.
     * @param {number} size - Cell size on that axis (0 when every shape is
     *     flat on that axis: one cell).
     * @param {number} n - Number of cells on that axis.
     * @returns {number} 0 .. n - 1.
     */
    slot: function (v, min, size, n) {
        var k;
        if (size <= 0) { return 0; }
        k = Math.floor((v - min) / size);
        if (k < 0) { return 0; }
        if (k >= n) { return n - 1; }
        return k;
    },

    /**
     * Finds the shape a loose text belongs to: among the shapes whose bounds
     * contain the text's centre (edges inclusive) and whose area is strictly
     * larger than the text's, the one with the smallest area; equal areas go
     * to the lower index. Only the cell under the centre is searched; it
     * lists every shape that can contain the centre, in index order, so the
     * answer is the same as over all shapes.
     * @param {Array.<number>} textBounds - Bounds of the text.
     * @param {Object} g - From grid().
     * @returns {number} Index into `shapes`, or -1 when none qualifies.
     */
    findShape: function (textBounds, g) {
        var cx = (textBounds[0] + textBounds[2]) / 2;
        var cy = (textBounds[1] + textBounds[3]) / 2;
        var textArea = BTE.Element.area(textBounds);
        var best = null;
        var cell, k, s, b;
        if (g.count === 0 || cx < g.minX || cx > g.maxX || cy < g.minY || cy > g.maxY) { return -1; }
        cell = g.cells[BTE.Element.slot(cy, g.minY, g.ch, g.rows)][BTE.Element.slot(cx, g.minX, g.cw, g.cols)];
        if (cell === null) { return -1; }
        for (k = 0; k < cell.length; k++) {
            s = cell[k];
            if (s.area <= textArea) { continue; }
            if (best !== null && s.area >= best.area) { continue; }
            b = s.bounds;
            if (cx >= b[0] && cx <= b[2] && cy <= b[1] && cy >= b[3]) { best = s; }
        }
        return (best === null) ? -1 : best.index;
    }
};
