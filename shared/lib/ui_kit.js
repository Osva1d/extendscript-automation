// ------------------------------------------------------------------------
// Module: UiKit (shared) — the parts the family's dialogs are built from
// Part of: shared core (no consumer yet; batch-relink-export is the first,
//          docs/specs/2026-11-07-ui-design-system.md §7 and §10)
//
// Namespace-neutral factory: buildUiKit(NS) registers NS.UiKit on the
// namespace object passed in. A tool's build cats this file and appends its
// own call — buildUiKit(BRE);. Tests eval this file, then call the factory
// with their mock namespace.
//
// Dependencies, read only when used: NS.FieldPaint (setStatus), NS.Numbers
// (numberRow with a number value), NS.Utils.log (optional). A tool without
// number rows does not need Numbers in its build.
//
// Four tools built these parts four ways (audit U29): the footer and button
// row, the status line, the label axis, the rows of a panel — a number and
// its unit, a text, a path with Vybrat…, a list, radio buttons, a checkbox —
// and none of them asked before overwriting files (U5). Spacing and heights
// stay native and are never written here (design system §2.4, §2.5); only
// the widths the design system names are. Texts come in as arguments, so each
// tool keeps its own locale keys. The preset panel comes with its first
// consumer, grommet-marks (§10, step 3): the four tools store presets four
// different ways, and an interface guessed before that would be rewritten.
// ------------------------------------------------------------------------
function buildUiKit(NS) {
    function log(msg) {
        try { if (NS.Utils && NS.Utils.log) { NS.Utils.log(msg); } } catch (e) {}
    }

    // A row: a group across its panel with the label first. The label's
    // width comes later from axis(), across every row of the block.
    function labelRow(parent, label, tip) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];
        var st = g.add("statictext", undefined, label);
        if (tip) { st.helpTip = tip; }
        return { row: g, label: st };
    }

    NS.UiKit = {
        // px between a field and its unit (design system §2.4); every other
        // gap is ScriptUI's native 10 and is not written.
        TIGHT: 5,
        // Field widths in characters (§2.5): a number 7 = 72 px, a path
        // 26 = 224 px; a short count in grommet-marks' edge row may take 4.
        NUMBER_CHARS: 7,
        TEXT_CHARS: 24,
        PATH_CHARS: 26,
        // px cap of Vybrat…: in a fill row the slack goes to the field, not
        // the button (§2.5).
        BROWSE_MAX: 90,
        // px of a one-glyph button, ↺ + − ↑ ↓; it is drawn as a circle and
        // needs a tip (§2.6).
        GLYPH_W: 30,
        // The family's footer: the author as in the dist header, the version,
        // no tool name — the title has it (extendscript-ui-standards §9).
        COPYRIGHT: "© 2025–2026 Ladislav Osvald · v",
        // The symbol a status starts with (§2.3); colour alone is not enough.
        SYMBOL: { ERR: "✗", WARN: "⚠", OK: "✓" },

        /**
         * Hard-locks a control's width. ScriptUI keeps sibling groups in
         * columns only when their cells are pinned: without minimumSize the
         * cell collapses below preferredSize, without maximumSize a label
         * stretches it.
         * @param {Object} ctrl - Any ScriptUI control.
         * @param {number} w - Width in px.
         */
        lockW: function (ctrl, w) {
            ctrl.preferredSize.width = w;
            ctrl.minimumSize.width = w;
            ctrl.maximumSize.width = w;
        },

        /**
         * One alignment axis: every label of a block gets the width of the
         * widest, measured in the dialog's own font and language, so the
         * Czech and English labels both fit (batch-text-edit's axis). An
         * unsized statictext lays out exactly as wide as measureString says,
         * so no margin is added. An empty label — a checkbox row's — is
         * locked without being measured. Call it before the window is shown.
         * @param {Array} labels - The rows' label statictexts.
         * @returns {number} The axis width in px.
         */
        axis: function (labels) {
            var w = 0, i, m;
            for (i = 0; i < labels.length; i++) {
                if (!labels[i].text) { continue; }
                m = Math.ceil(labels[i].graphics.measureString(labels[i].text)[0]);
                if (m > w) { w = m; }
            }
            for (i = 0; i < labels.length; i++) { NS.UiKit.lockW(labels[i], w); }
            return w;
        },

        /**
         * A number row: label, field of 7 characters, unit 5 px after it.
         * The field and the unit share a group, so a row without a unit puts
         * its field in the same place. Needs NS.Numbers for a number value.
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {label, value, tip, unit, chars}. value: a
         *     number goes in with the language's separator, unrounded
         *     (Numbers.format); a string as it is. chars overrides 7.
         * @returns {Object} {row, label, field, unit}; unit is null without one.
         */
        numberRow: function (parent, o) {
            var r = labelRow(parent, o.label, o.tip);
            var g = r.row.add("group");
            g.spacing = NS.UiKit.TIGHT;
            var text = (typeof o.value === "number") ? NS.Numbers.format(o.value)
                : (o.value === undefined ? "" : String(o.value));
            r.field = g.add("edittext", undefined, text);
            r.field.characters = o.chars || NS.UiKit.NUMBER_CHARS;
            if (o.tip) { r.field.helpTip = o.tip; }
            r.unit = o.unit ? g.add("statictext", undefined, o.unit) : null;
            return r;
        },

        /**
         * A text row: label and a field of 24 characters that takes the rest
         * of the row.
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {label, value, tip}.
         * @returns {Object} {row, label, field}.
         */
        textRow: function (parent, o) {
            var r = labelRow(parent, o.label, o.tip);
            r.field = r.row.add("edittext", undefined, o.value === undefined ? "" : String(o.value));
            r.field.characters = NS.UiKit.TEXT_CHARS;
            r.field.alignment = ["fill", "center"];
            if (o.tip) { r.field.helpTip = o.tip; }
            return r;
        },

        /**
         * A path row: label, a path field of 26 characters that takes the
         * rest of the row, and Vybrat… capped at 90 px. A picked path fills
         * the field and calls onPick; a picked path does not fire the field's
         * onChanging, so a tool that checks the field live does it there.
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {label, value, tip, tipButton, button, folder,
         *     ext, prompt, onPick}. folder true picks a folder, otherwise
         *     a file of the type ext ("*.ai"); prompt is what the picker asks.
         * @returns {Object} {row, label, field, button}.
         */
        pathRow: function (parent, o) {
            var r = labelRow(parent, o.label, o.tip);
            var field = r.row.add("edittext", undefined, o.value || "");
            field.characters = NS.UiKit.PATH_CHARS;
            field.alignment = ["fill", "center"];
            if (o.tip) { field.helpTip = o.tip; }
            var btn = r.row.add("button", undefined, o.button);
            btn.maximumSize.width = NS.UiKit.BROWSE_MAX;
            if (o.tipButton) { btn.helpTip = o.tipButton; }
            btn.onClick = function () {
                var sel;
                try {
                    sel = o.folder ? Folder.selectDialog(o.prompt) : File.openDialog(o.prompt, o.ext);
                } catch (e) {
                    log("UiKit.pathRow: " + e.message);
                    return;
                }
                if (!sel) { return; }
                field.text = sel.fsName;
                if (o.onPick) { o.onPick(field); }
            };
            r.field = field;
            r.button = btn;
            return r;
        },

        /**
         * A list row: label and a dropdownlist that takes the rest of the
         * row. Select its value with selectItem().
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {label, items, tip}.
         * @returns {Object} {row, label, list}.
         */
        listRow: function (parent, o) {
            var r = labelRow(parent, o.label, o.tip);
            r.list = r.row.add("dropdownlist", undefined, o.items || []);
            r.list.alignment = ["fill", "center"];
            if (o.tip) { r.list.helpTip = o.tip; }
            return r;
        },

        /**
         * Selects a value in a list. A value the list lacks — a preset this
         * Illustrator does not have — is added as "name  (chybí)" and
         * selected, instead of a silent switch to another item
         * (extendscript-ui-standards §12.3); a missing item from an earlier
         * call is removed first. No value selects the first item.
         * tile-export's selectItem, which the other tools wrote again.
         * @param {Object} dd - The dropdownlist.
         * @param {string} text - The value.
         * @param {string} suffix - The tool's "(chybí)".
         * @param {Function} [same] - Comparison of an item's text and the
         *     value; exact by default.
         */
        selectItem: function (dd, text, suffix, same) {
            var i;
            for (i = dd.items.length - 1; i >= 0; i--) {
                if (dd.items[i].kitMissing) { dd.remove(i); }
            }
            if (!text) {
                if (dd.items.length > 0) { dd.selection = 0; }
                return;
            }
            for (i = 0; i < dd.items.length; i++) {
                if (same ? same(dd.items[i].text, text) : dd.items[i].text === text) {
                    dd.selection = i;
                    return;
                }
            }
            var missing = dd.add("item", text + "  " + suffix);
            missing.kitMissing = true;
            missing.kitValue = text;
            dd.selection = missing;
        },

        /**
         * The value a list stands for: the selected item's text, or the
         * name of a missing one without its suffix. Whether it is missing
         * says dd.selection.kitMissing.
         * @param {Object} dd - The dropdownlist.
         * @returns {string} The value, "" when nothing is selected.
         */
        listValue: function (dd) {
            var it = dd.selection;
            if (!it) { return ""; }
            return it.kitMissing ? it.kitValue : it.text;
        },

        /**
         * A radio row: label and the options in one row, for up to three
         * short options (§4). The label sits at the top of the row: macOS
         * draws a button's text about 2 px above the middle of its 19 px,
         * and a centred label stood lower (tile-export, user's screenshot
         * 2026-10-17).
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {label, options, selected, tip}.
         * @returns {Object} {row, label, buttons}.
         */
        radioRow: function (parent, o) {
            var r = labelRow(parent, o.label, o.tip);
            r.label.alignment = ["left", "top"];
            r.buttons = [];
            var i, rb;
            for (i = 0; i < o.options.length; i++) {
                rb = r.row.add("radiobutton", undefined, o.options[i]);
                if (o.tip) { rb.helpTip = o.tip; }
                rb.value = (i === o.selected);
                r.buttons.push(rb);
            }
            return r;
        },

        /**
         * A checkbox among rows on an axis: an empty label, which axis()
         * locks to the axis width, then the checkbox, so the box starts where
         * the fields start and its text is on it (§4; audit U13). A panel of
         * checkboxes alone adds them directly.
         * @param {Object} parent - ScriptUI container.
         * @param {Object} o - {text, value, tip}.
         * @returns {Object} {row, label, box}; label goes into axis().
         */
        checkRow: function (parent, o) {
            var g = parent.add("group");
            g.alignment = ["fill", "top"];
            var pad = g.add("statictext", undefined, "");
            var cb = g.add("checkbox", undefined, o.text);
            cb.value = !!o.value;
            if (o.tip) { cb.helpTip = o.tip; }
            return { row: g, label: pad, box: cb };
        },

        /**
         * The status line: one line across the dialog above the footer, the
         * one place that says why the primary button is grey (§4). Laid out
         * with its first text and never resized; a longer text is cut at the
         * end, the details belong in the tool's panel.
         * @param {Object} parent - The window or the column it ends.
         * @param {string} [text] - The first text; a space keeps the height.
         * @returns {Object} The statictext.
         */
        statusLine: function (parent, text) {
            var st = parent.add("statictext", undefined, text || " ", { truncate: "end" });
            st.alignment = ["fill", "top"];
            return st;
        },

        /**
         * Writes a status: the symbol of its state, the text, and the colour
         * of the state for the current UI brightness (FieldPaint.status). No
         * bold: ScriptUI does not draw it (§2.2). An empty text clears the
         * line.
         * @param {Object} line - From statusLine().
         * @param {string} kind - "ERR", "WARN" or "OK".
         * @param {string} text - Without the symbol.
         */
        setStatus: function (line, kind, text) {
            line.text = text ? NS.UiKit.SYMBOL[kind] + " " + text : "";
            NS.FieldPaint.status(line, kind);
        },

        /**
         * The last row of a dialog: the greyed author and version on the
         * left, the buttons on the right in a group of their own, so the
         * row's slack never widens a button (§3 G7; batch-relink-export).
         * Options do not belong here, they go into a panel.
         * @param {Object} w - The window.
         * @param {string} version - "1.3.0".
         * @param {Array} buttons - {text, name, tip} left to right: Storno
         *     with name "cancel" first, the primary with name "ok" last, a
         *     side action between them.
         * @returns {Object} {row, copy, buttons} with the buttons in order.
         */
        footerRow: function (w, version, buttons) {
            var g = w.add("group");
            g.alignment = ["fill", "top"];
            var copy = g.add("statictext", undefined, NS.UiKit.COPYRIGHT + version);
            copy.enabled = false;
            copy.alignment = ["left", "center"];
            var slack = g.add("group");
            slack.alignment = ["fill", "center"];
            var gb = g.add("group");
            gb.alignment = ["right", "center"];
            var out = [], i, d, b;
            for (i = 0; i < buttons.length; i++) {
                d = buttons[i];
                b = d.name ? gb.add("button", undefined, d.text, { name: d.name })
                    : gb.add("button", undefined, d.text);
                if (d.tip) { b.helpTip = d.tip; }
                out.push(b);
            }
            return { row: g, copy: copy, buttons: out };
        },

        /**
         * How many of the run's output files are there already. A file that
         * cannot be checked counts as there: asking once too often is
         * cheaper than overwriting without asking.
         * @param {Array} paths - Full paths of the files the run will write,
         *     without those Přeskočit hotové výstupy leaves alone.
         * @returns {number}
         */
        existingCount: function (paths) {
            var n = 0, i;
            for (i = 0; i < paths.length; i++) {
                try {
                    if (new File(paths[i]).exists) { n++; }
                } catch (e) {
                    log("UiKit.existingCount: " + e.message);
                    n++;
                }
            }
            return n;
        },

        /**
         * Asks before a run that overwrites files, and only then (§5.5;
         * decision Q5): the native question with Ne and Ano, Ano the default
         * (seen 2026-11-07). Ano writes, Ne goes back to the dialog.
         * @param {number} n - Files the run will overwrite.
         * @param {string} question - The tool's question with the count in
         *     it: "V cílové složce už je: 3 soubory. Přepsat?".
         * @returns {boolean} True to go on.
         */
        confirmOverwrite: function (n, question) {
            if (!(n > 0)) { return true; }
            return confirm(question, false) === true;
        }
    };
}
