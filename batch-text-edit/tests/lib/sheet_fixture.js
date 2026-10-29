/**
 * Sheet fixture — reproduces the three real files of spec section 4.2 as plain
 * data, in the shape BTE.Element.build consumes (no Illustrator needed).
 *
 * Every prefab is a 312 pt box (the pitch) holding two texts, a code above the
 * centre and a number below it, plus a 283 pt closed cut path at the same
 * centre. Illustrator coordinates: Y grows upward, so row r sits at negative Y
 * and bounds are [left, top, right, bottom] with top > bottom.
 *
 *   makeSheet(mode, cols, rows, perSheet) -> { texts, shapes, outerGroups }
 *
 *   mode "group"   both texts of a prefab share that prefab's group.
 *   mode "sheets"  as "group". The user's file also has an outer group per
 *                  `perSheet` prefabs; texts point at their LOWEST group, so
 *                  the outer groups are returned separately in `outerGroups`
 *                  and never appear in `texts`.
 *   mode "none"    group is null for every text; only the cut paths remain.
 *
 * The cut paths are in `shapes` in every mode: in the real files they lie in a
 * layer of their own, and grouped texts must ignore them.
 *
 * Ids are unique per kind and start far apart, so a key mixed up between
 * texts, groups and shapes would show. A text's `tie` is its running index.
 */
var PITCH = 312;
var CUT = 283;
var TEXT_W = 120;
var TEXT_H = 24;
var TEXT_OFFSET = 40;     // distance of a text's centre from the prefab centre

var TEXT_ID0 = 1;
var GROUP_ID0 = 100000;
var SHAPE_ID0 = 200000;
var OUTER_ID0 = 300000;

// [left, top, right, bottom] of a w x h box centred on (cx, cy).
function around(cx, cy, w, h) {
    return [cx - w / 2, cy + h / 2, cx + w / 2, cy - h / 2];
}

function makeSheet(mode, cols, rows, perSheet) {
    var texts = [], shapes = [], outerGroups = [], boxes = [];
    var n = cols * rows;
    var i, c, r, cx, cy, box, group, k, tie, first, last, b;

    if (mode !== "group" && mode !== "sheets" && mode !== "none") {
        throw new Error("sheet_fixture: unknown mode \"" + mode + "\"");
    }

    for (i = 0; i < n; i++) {
        c = i % cols;
        r = Math.floor(i / cols);
        cx = c * PITCH + PITCH / 2;
        cy = -(r * PITCH + PITCH / 2);
        box = around(cx, cy, PITCH, PITCH);
        boxes.push(box);

        group = (mode === "none") ? null : { id: GROUP_ID0 + i, bounds: box };
        for (k = 0; k < 2; k++) {
            tie = i * 2 + k;
            texts.push({
                id: TEXT_ID0 + tie,
                group: group,
                // k 0 = code above the centre, k 1 = number below it
                bounds: around(cx, cy + (k === 0 ? TEXT_OFFSET : -TEXT_OFFSET), TEXT_W, TEXT_H),
                tie: tie
            });
        }
        shapes.push({ id: SHAPE_ID0 + i, bounds: around(cx, cy, CUT, CUT) });
    }

    if (mode === "sheets") {
        for (first = 0; first < n; first += perSheet) {
            last = Math.min(first + perSheet, n) - 1;
            b = boxes[first].slice();
            for (i = first + 1; i <= last; i++) {
                b[0] = Math.min(b[0], boxes[i][0]);
                b[1] = Math.max(b[1], boxes[i][1]);
                b[2] = Math.max(b[2], boxes[i][2]);
                b[3] = Math.min(b[3], boxes[i][3]);
            }
            outerGroups.push({ id: OUTER_ID0 + outerGroups.length, bounds: b });
        }
    }

    return { texts: texts, shapes: shapes, outerGroups: outerGroups };
}

module.exports = { makeSheet: makeSheet, PITCH: PITCH, CUT: CUT };
