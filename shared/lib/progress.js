// ------------------------------------------------------------------------
// Module: Progress (shared) — a progress palette that stops on held Control or Esc
// Part of: shared core (consumed by tile-export and batch-relink-export;
//          extendscript-ui-standards §12.5)
//
// Namespace-neutral factory: buildProgress(NS) registers NS.Progress on the
// namespace object passed in. A tool's build cats this file and appends its
// own call — buildProgress(TE);. Tests eval this file, then call the factory
// with their mock namespace.
//
// Taken from batch-relink-export's BRE.UI.createProgress, where the canon
// points (§12.5: "when a second tool needs it, move it to shared/lib"). The
// texts come in as an argument, so each tool keeps its own locale keys.
// Illustrator dispatches no clicks to a palette button while the script
// runs, however the loop redraws or waits, but the keyboard state can be
// read (both measured in BRE, AI 30.8.2): the run stops on a held key, after
// the item in progress. Illustrator 2027 (31.0.0, macOS 27.2) no longer names
// a key held while it is in front — keyName reads undefined, and undefined
// also with no key held — so held Esc stops the run there only from another
// app; held Control is read either way (docs/extendscript-engine-facts.md,
// measured 2026-11-15). The run stops on Control, or on Esc where it is named
// ("Escape" on macOS, "Esc" reported on Windows).
// ------------------------------------------------------------------------
function buildProgress(NS) {
    NS.Progress = {
        // [deviation] live text (extendscript-ui-standards §4, reason 2): the
        // status line changes after the palette is shown, so its width is
        // reserved, and a name longer than NAME_CHARS is shortened in the
        // middle — the same 450 px and 38 characters as batch-relink-export.
        WIDTH: 450,
        NAME_CHARS: 38,

        /**
         * A name short enough for the status line: its start and its end with
         * "…" between, so a file's number and extension stay visible.
         * PURE FUNCTION.
         * @param {string} name - Item name.
         * @returns {string} The name, shortened when too long.
         */
        shorten: function (name) {
            var n = String(name);
            if (n.length <= this.NAME_CHARS) { return n; }
            return n.substr(0, 18) + "…" + n.substr(n.length - 17);
        },

        /**
         * Creates and shows the palette.
         * @param {number} total - How many items the run has.
         * @param {Object} texts - {title, init, item, hint, stopping}; item has
         *        three %s: the item's name, its position and the total.
         * @returns {Object} {isCancelled(), poll(), update(index, name),
         *          finish(), close()}.
         */
        create: function (total, texts) {
            var self = this;
            var dlg = new Window("palette", texts.title, undefined, { closeButton: false });
            dlg.orientation = "column";
            dlg.alignChildren = ["fill", "top"];

            var statusText = dlg.add("statictext", undefined, texts.init);
            statusText.preferredSize.width = this.WIDTH;
            var bar = dlg.add("progressbar", undefined, 0, total);
            bar.preferredSize.width = this.WIDTH;
            var stopHint = dlg.add("statictext", undefined, texts.hint);
            stopHint.preferredSize.width = this.WIDTH;
            stopHint.justify = "center";

            var cancelled = false;

            // Latches a stop request while Control or Esc is held. The run
            // acts on it between items, so the item in progress is finished.
            function poll() {
                if (cancelled) { return; }
                try {
                    var k = ScriptUI.environment.keyboardState;
                    if (k.ctrlKey === true || k.keyName === "Escape" || k.keyName === "Esc") {
                        cancelled = true;
                        stopHint.text = texts.stopping;
                        dlg.update();
                    }
                } catch (e) {}
            }

            function fill(tpl, a, b, c) {
                var args = [a, b, c], i = 0;
                return String(tpl).replace(/%s/g, function () {
                    return i < args.length ? String(args[i++]) : "%s";
                });
            }

            dlg.show();

            return {
                isCancelled: function () {
                    poll();
                    return cancelled;
                },
                poll: poll,
                update: function (index, name) {
                    statusText.text = fill(texts.item, self.shorten(name), index + 1, total);
                    bar.value = index;
                    dlg.update();
                    poll();
                },
                finish: function () {
                    bar.value = total;
                    dlg.update();
                },
                close: function () {
                    try { dlg.close(); } catch (e) {}
                }
            };
        }
    };
}
