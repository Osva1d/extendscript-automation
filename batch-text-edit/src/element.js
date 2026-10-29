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
        var shapeBounds = [];
        var shapeAreas = [];
        var byKey = {};
        var recs = [];
        var elements = [];
        var i, t, key, bounds, at, rec, ids;

        // Each shape's bounds and area are read once, not once per text.
        for (i = 0; i < shapes.length; i++) {
            shapeBounds.push(shapes[i].bounds);
            shapeAreas.push(BTE.Element.area(shapes[i].bounds));
        }

        for (i = 0; i < texts.length; i++) {
            t = texts[i];
            if (t.group) {
                key = "g:" + t.group.id;
                bounds = t.group.bounds;
            } else {
                at = BTE.Element.smallestShape(t.bounds, shapeBounds, shapeAreas);
                if (at >= 0) {
                    key = "s:" + shapes[at].id;
                    bounds = shapeBounds[at];
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
     * Finds the shape a loose text belongs to: among the shapes whose bounds
     * contain the text's centre (edges inclusive) and whose area is strictly
     * larger than the text's, the one with the smallest area; equal areas go
     * to the lower index.
     * @param {Array.<number>} textBounds - Bounds of the text.
     * @param {Array.<Array.<number>>} shapeBounds - Bounds of every shape.
     * @param {Array.<number>} shapeAreas - Area of every shape, same order.
     * @returns {number} Index into the shape arrays, or -1 when none qualifies.
     */
    smallestShape: function (textBounds, shapeBounds, shapeAreas) {
        var cx = (textBounds[0] + textBounds[2]) / 2;
        var cy = (textBounds[1] + textBounds[3]) / 2;
        var textArea = BTE.Element.area(textBounds);
        var best = -1;
        var i, b;
        for (i = 0; i < shapeBounds.length; i++) {
            if (shapeAreas[i] <= textArea) { continue; }
            if (best >= 0 && shapeAreas[i] >= shapeAreas[best]) { continue; }
            b = shapeBounds[i];
            if (cx >= b[0] && cx <= b[2] && cy <= b[1] && cy >= b[3]) { best = i; }
        }
        return best;
    }
};
