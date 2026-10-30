// ------------------------------------------------------------------------
// Module: BTE.Write — writes the step chain's edits into the document and
//         reads every text back to check it against the preview
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.Steps
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Write = {
    /**
     * Checks the whole edit list before the first write, so a bug in the
     * caller never leaves a half-written document: every step has an edit
     * list; every edit has a string text, a start of at least 0, a length of
     * at least 1 (an empty range cannot be written: steps skip empty
     * matches) and, for a case edit, a known caseMode whose CaseChangeType
     * member exists; the edits of a step are ordered by element, text and
     * start, do not overlap and end inside the step's input text in
     * `states`; every text they aim at has a frame, and no such frame is
     * locked or hidden (editable === false; Scope leaves those out, so one
     * here is a bug). Messages count steps, edits, elements and texts from 1.
     * @param {Array.<Array.<TextFrame>>} tfs - From BTE.Scope.prepare.
     * @param {Array.<{edits: Array}>} info - From BTE.Steps.run.
     * @param {Array.<Array.<Array.<string>>>} states - From BTE.Steps.run:
     *     states[k] is the input of step k.
     * @throws {Error} Naming the step, the edit and the slip.
     */
    check: function (tfs, info, states) {
        var CASE_MAP = BTE.Steps.CASE_MAP;
        var k, m, edits, e, prev, tf, editable, where, s;

        if (!states || typeof states.length !== "number") {
            throw new Error("BTE.Write: no states (BTE.Steps.run's states) to check the document against");
        }
        for (k = 0; k < info.length; k++) {
            edits = info[k].edits;
            if (!edits || typeof edits.length !== "number") {
                throw new Error("BTE.Write: step " + (k + 1) + " has no edit list");
            }
            prev = null;
            for (m = 0; m < edits.length; m++) {
                e = edits[m];
                where = "BTE.Write: step " + (k + 1) + ", edit " + (m + 1) + " (element " + (e.el + 1) +
                    ", text " + (e.tx + 1) + ", start " + e.start + ")";
                if (typeof e.text !== "string") { throw new Error(where + " has no text"); }
                if (!(e.start >= 0)) { throw new Error(where + " has no valid start"); }
                if (!(e.length >= 1)) { throw new Error(where + " has no valid length: an empty range cannot be written"); }
                if (e.caseMode !== undefined &&
                        (!CASE_MAP.hasOwnProperty(e.caseMode) || CaseChangeType[CASE_MAP[e.caseMode]] === undefined)) {
                    throw new Error(where + " has an unknown caseMode \"" + e.caseMode + "\"");
                }
                if (prev !== null && (e.el < prev.el || (e.el === prev.el && (e.tx < prev.tx ||
                        (e.tx === prev.tx && e.start < prev.start + prev.length))))) {
                    throw new Error(where + " is out of order or overlaps the edit before it");
                }
                s = (states[k] && states[k][e.el]) ? states[k][e.el][e.tx] : undefined;
                if (typeof s !== "string") { throw new Error(where + " has no input text in states"); }
                if (e.start + e.length > s.length) {
                    throw new Error(where + " reaches past the end of its input text (" + s.length + " characters)");
                }
                if (prev === null || e.el !== prev.el || e.tx !== prev.tx) {
                    tf = tfs[e.el] ? tfs[e.el][e.tx] : undefined;
                    if (!tf) { throw new Error(where + " aims at a text that has no frame"); }
                    try {
                        editable = tf.editable;
                    } catch (err) {
                        throw new Error(where + ": reading editable failed: " + err.message);
                    }
                    if (editable === false) {
                        throw new Error(where + " aims at a text whose frame is not editable (locked or hidden)");
                    }
                }
                prev = e;
            }
        }
    },

    /**
     * Where two texts first differ, for the drift message.
     * @param {string} a - One text.
     * @param {string} b - The other.
     * @returns {number} Index of the first different character (the shorter
     *     length when one is the start of the other).
     */
    firstDifference: function (a, b) {
        var n = Math.min(a.length, b.length);
        var i;
        for (i = 0; i < n; i++) {
            if (a.charAt(i) !== b.charAt(i)) { return i; }
        }
        return n;
    },

    /**
     * Writes one edit, unless it changes nothing. A replacement goes through
     * the range: `r = tf.characters[start]; r.length = n; r.contents = text`,
     * which takes the formatting of the range's first character and leaves
     * the rest of the text alone (measured); an empty text deletes the range.
     * A case edit calls changeCaseTo on the range, which keeps the
     * formatting; the range is a text of its own for it (measured), as the
     * preview's emulation assumes.
     * @param {TextFrame} tf - The frame.
     * @param {Object} e - The edit (checked by check()).
     * @param {string} s - The frame's contents before this step wrote into
     *     it, equal to the step's input (apply() makes sure). The edits of a
     *     step go from the highest start down, so the characters before the
     *     written ranges are still these.
     * @returns {boolean} True when the edit was written; false when the
     *     range already holds its text (a case change or a replacement that
     *     changes nothing).
     * @throws {Error} When the DOM fails.
     */
    writeEdit: function (tf, e, s) {
        var r;
        if (s.substring(e.start, e.start + e.length) === e.text) { return false; }
        r = tf.characters[e.start];
        r.length = e.length;
        if (e.caseMode !== undefined) {
            r.changeCaseTo(CaseChangeType[BTE.Steps.CASE_MAP[e.caseMode]]);
        } else {
            r.contents = e.text;
        }
        return true;
    },

    /**
     * Writes the edits of every step into the document: the steps in order,
     * each step's edits relative to its input states[k], the texts the steps
     * before it left (as BTE.Steps.run made them). Before step k writes into
     * a text, the frame's contents are read and must equal states[k][el][tx]:
     * when the document has drifted from the preview (changeCaseTo mapped a
     * letter otherwise than the emulation, say), the step's ranges would land
     * on the wrong characters, so the write stops there and nothing of that
     * step is written into that text. Inside one text the edits of one step
     * go from the highest start down, because a replacement or a case change
     * can change the length (straße -> STRASSE). An edit whose range already
     * holds its text is not written and does not make its text count.
     * Nothing redraws the document between the first and the last write,
     * because a redraw splits the Undo history (engine facts; research 7.5:
     * 600 writes, one app.undo()). One Cmd+Z after a run from File › Scripts
     * is left to the manual test (spec 7.3).
     *
     * The edit list is checked as a whole first (check()): a bug there throws
     * before anything is written. A drift or a DOM error during the write
     * stops it at once and throws an Error whose message is ERR_WRITE_AT
     * alone (the element, counted from 1, and the texts written so far), for
     * the user; `detail` names the step, element and text and carries the
     * cause's own words (English, for the log), and the Error carries
     * `written`, `el`, `tx` and `step` (0-based) and `cause`.
     * @param {Array.<Array.<TextFrame>>} tfs - From BTE.Scope.prepare (or
     *     reorder): tfs[el][tx] is the frame of state[el][tx].
     * @param {Array.<{edits: Array}>} info - From BTE.Steps.run; only
     *     `edits` is read. Inactive and failed steps have none.
     * @param {Array.<Array.<Array.<string>>>} states - From BTE.Steps.run:
     *     states[k] is the input of step k (states[0] the scope's texts).
     * @returns {{textsWritten: number}} Texts with at least one write.
     * @throws {Error} For a broken edit list, a drift or a failed write.
     */
    apply: function (tfs, info, states) {
        var W = BTE.Write;
        var written = 0;
        var done = {};
        var at = { step: -1, el: -1, tx: -1 };
        var k, a, b, m, edits, tf, s, want, key;

        W.check(tfs, info, states);
        try {
            for (k = 0; k < info.length; k++) {
                edits = info[k].edits;
                a = 0;
                while (a < edits.length) {
                    // [a, b) are this step's edits of one text.
                    b = a + 1;
                    while (b < edits.length && edits[b].el === edits[a].el && edits[b].tx === edits[a].tx) { b++; }
                    at.step = k;
                    at.el = edits[a].el;
                    at.tx = edits[a].tx;
                    tf = tfs[at.el][at.tx];
                    s = tf.contents;
                    want = states[k][at.el][at.tx];
                    if (s !== want) {
                        throw new Error("the text differs from the preview this step was computed on (first " +
                            "difference at character " + W.firstDifference(s, want) + "; " + s.length +
                            " characters in the document, " + want.length + " in the preview)");
                    }
                    for (m = b - 1; m >= a; m--) {
                        if (W.writeEdit(tf, edits[m], s)) {
                            key = at.el + "," + at.tx;
                            if (!done[key]) {
                                done[key] = true;
                                written++;
                            }
                        }
                    }
                    a = b;
                }
            }
        } catch (err) {
            throw W.stopped(err, at, written);
        }
        return { textsWritten: written };
    },

    /**
     * The Error apply() throws when a write stops.
     * @param {*} cause - What was thrown: the drift check or the DOM.
     * @param {{step: number, el: number, tx: number}} at - Where (0-based).
     * @param {number} written - Texts written before it.
     * @returns {Error} message: ERR_WRITE_AT, nothing else (shown to the
     *     user); detail: the step, element and text (from 1) and the cause's
     *     message (for the log).
     */
    stopped: function (cause, at, written) {
        var L = BTE.L;
        var why = (cause && cause.message !== undefined) ? cause.message : String(cause);
        // Cast: the Error carries fields of its own besides the message.
        var err = /** @type {*} */ (new Error(L.format(L.countForm("ERR_WRITE_AT", written), at.el + 1, written)));
        err.detail = "BTE.Write.apply: step " + (at.step + 1) + ", element " + (at.el + 1) + ", text " +
            (at.tx + 1) + ": " + why;
        err.written = written;
        err.el = at.el;
        err.tx = at.tx;
        err.step = at.step;
        err.cause = cause;
        return err;
    },

    /**
     * Reads every text of the scope back and compares it with the preview's
     * final state. Every text, not only the ones apply() wrote: one read per
     * text is cheap, and a text the preview changes but the document does
     * not (or one a write reached by mistake) shows as a difference too.
     * @param {Array.<Array.<TextFrame>>} tfs - The frames apply() wrote.
     * @param {Array.<Array.<string>>} finalState - The last state of
     *     BTE.Steps.run (states[states.length - 1]).
     * @returns {Array.<{el: number, tx: number, expected: string, actual: string}>}
     *     The texts that differ (el and tx 0-based), in order; empty when the
     *     document is the preview.
     * @throws {Error} When the frames and the state have other shapes (a bug)
     *     or a read fails; the message names the text, counted from 1.
     */
    verify: function (tfs, finalState) {
        var bad = [];
        var i, j, actual;

        if (tfs.length !== finalState.length) {
            throw new Error("BTE.Write.verify: " + tfs.length + " rows of frames against " +
                finalState.length + " rows of the preview");
        }
        for (i = 0; i < tfs.length; i++) {
            if (tfs[i].length !== finalState[i].length) {
                throw new Error("BTE.Write.verify: element " + (i + 1) + " has " + tfs[i].length +
                    " frames against " + finalState[i].length + " texts of the preview");
            }
            for (j = 0; j < tfs[i].length; j++) {
                try {
                    actual = tfs[i][j].contents;
                } catch (e) {
                    throw new Error("BTE.Write.verify: element " + (i + 1) + ", text " + (j + 1) +
                        ": reading the text failed: " + e.message);
                }
                if (actual !== finalState[i][j]) {
                    bad.push({ el: i, tx: j, expected: finalState[i][j], actual: actual });
                }
            }
        }
        return bad;
    }
};
