// ------------------------------------------------------------------------
// Module: Summary (shared) — the window a run ends with
// Part of: shared core (consumed by tile-export and batch-relink-export;
//          extendscript-ui-standards §12.5)
//
// Namespace-neutral factory: buildSummary(NS) registers NS.Summary on the
// namespace object passed in. A tool's build cats this file and appends its
// own call — buildSummary(TE);. Tests eval this file, then call the factory
// with their mock namespace.
//
// Optional dependency: NS.FieldPaint, for the canon's red; without it the
// same red is set here.
//
// Taken from batch-relink-export's BRE.UI.showSummary (§12.5): counts as
// label and value pairs, a count of errors in red, the details in a
// scrolling box — and a stopped run never says that everything went fine.
// The texts come in as an argument, so each tool keeps its own locale keys.
// ------------------------------------------------------------------------
function buildSummary(NS) {
    NS.Summary = {
        // [deviation] alignment axis (§4, reason 1): the values line up after
        // labels of one width; the same 150 + 60 px as batch-relink-export.
        LABEL_W: 150,
        VALUE_W: 60,
        // [deviation] wrap width (§4, reason 3): a note in one line of 500 px;
        // the details box 480 x 200 px scrolls past that. Only a floor for
        // the intro, which may be longer (see show).
        NOTE_W: 500,
        DETAILS: [480, 200],
        // The canon's red (§12.6), used when NS.FieldPaint is not built.
        ERR_RGB: [0.90, 0.20, 0.20],

        /**
         * The pairs a summary shows: those with a value, and those it must
         * always show. PURE FUNCTION.
         * @param {Array} pairs - {label, value, alert, always}.
         * @returns {Array} The pairs to show, in order.
         */
        visiblePairs: function (pairs) {
            var out = [], i;
            for (i = 0; i < pairs.length; i++) {
                if (pairs[i].always || pairs[i].value !== 0) { out.push(pairs[i]); }
            }
            return out;
        },

        /**
         * Shows the summary and waits for it to be closed.
         * @param {Object} o - {title, intro, pairs, note, details,
         *        detailsTitle, allOk, close}. intro is an optional first line,
         *        such as the output folder; pairs as visiblePairs(); a pair with alert
         *        and a value above 0 is red. note says that the run stopped;
         *        details are lines for the scrolling box; allOk shows only
         *        when there is neither a note nor a detail.
         */
        show: function (o) {
            var w = new Window("dialog", o.title);
            w.orientation = "column";
            w.alignChildren = ["fill", "top"];

            if (o.intro) {
                var stIntro = w.add("statictext", undefined, o.intro);
                // Its own width, at least NOTE_W: the intro names a folder,
                // and at a fixed 500 px a path past ~62 characters was cut
                // (2026-10-27). The text is set before show(), so the label
                // measures it; a long path widens the window instead.
                stIntro.minimumSize.width = this.NOTE_W;
            }

            var gPairs = w.add("group");
            gPairs.orientation = "column";
            gPairs.alignChildren = ["left", "center"];
            var pairs = this.visiblePairs(o.pairs || []), i, g, ls, vs;
            for (i = 0; i < pairs.length; i++) {
                g = gPairs.add("group");
                g.alignChildren = ["left", "center"];
                ls = g.add("statictext", undefined, pairs[i].label);
                ls.preferredSize.width = this.LABEL_W;
                vs = g.add("statictext", undefined, String(pairs[i].value));
                vs.preferredSize.width = this.VALUE_W;
                if (pairs[i].alert && pairs[i].value > 0) { this.red(vs); }
            }

            if (o.note) {
                var stNote = w.add("statictext", undefined, o.note);
                stNote.preferredSize.width = this.NOTE_W;
            }

            var details = o.details || [];
            if (details.length > 0) {
                var p = w.add("panel", undefined, o.detailsTitle || "");
                p.alignChildren = ["fill", "fill"];
                var box = p.add("edittext", undefined, details.join("\n"),
                    { multiline: true, scrolling: true, readonly: true });
                box.preferredSize = this.DETAILS;
            } else if (!o.note) {
                w.add("statictext", undefined, o.allOk);
            }

            var gBtn = w.add("group");
            gBtn.alignment = ["right", "center"];
            gBtn.add("button", undefined, o.close, { name: "ok" });
            w.show();
        },

        /**
         * Paints a count red. Cosmetic: never throws.
         * @param {Object} ctrl - The statictext.
         */
        red: function (ctrl) {
            if (NS.FieldPaint && NS.FieldPaint.text) { NS.FieldPaint.text(ctrl, "ERR"); return; }
            try {
                var g = ctrl.graphics;
                g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, this.ERR_RGB.concat([1]), 1);
            } catch (e) {}
        }
    };
}
