// ------------------------------------------------------------------------
// Module: Registration (shared) — the document's registration swatch, by type
// Part of: shared core (no consumer yet; manipulating-illustrator-items §2)
//
// Namespace-neutral factory: buildRegistration(NS) registers NS.Registration
// on the namespace object passed in. A tool's build cats this file and
// appends its own call — buildRegistration(GM);. Tests eval this file, then
// call the factory with their mock namespace.
//
// Optional dependency: NS.Utils.log, for an unreadable swatch list.
//
// The registration swatch is found by its colour TYPE, never by name or
// position. Its name is localized ([Registrační] in Czech) and its place in
// the Swatches panel is not fixed: where index 1 holds White, a tool trusting
// the position draws marks the cutter's camera cannot see. tile-export got
// this fix first, zund-summa-marks the same one on 2026-10-03, and
// grommet-marks still reads swatches[1] — the "fix once, holds there too"
// criterion docs/decisions.md asks for. Taken from tile-export's
// TE.Draw.getRegistrationName.
// ------------------------------------------------------------------------
function buildRegistration(NS) {
    function log(msg) {
        try { if (NS.Utils && NS.Utils.log) { NS.Utils.log(msg); } } catch (e) {}
    }

    NS.Registration = {
        // The English name a document without a registration swatch falls back
        // to. It names nothing on a Czech install, so a lookup by it fails and
        // the caller's own fallback applies — never a neighbouring swatch.
        FALLBACK_NAME: "[Registration]",

        /**
         * The swatch that holds the registration colour, found by type.
         * @param {Document} doc - Document to read from.
         * @returns {Swatch|null} The swatch, or null when the document has none.
         */
        swatch: function (doc) {
            var sw, n, i, c;
            try {
                sw = doc.swatches;
                n = sw.length;
            } catch (e) {
                log("Registration.swatch: swatches unreadable: " + e.message);
                return null;
            }
            for (i = 0; i < n; i++) {
                // One swatch whose colour cannot be read must not end the
                // search: the registration swatch may sit behind it.
                try {
                    c = sw[i].color;
                    if (c && c.typename === "SpotColor" && c.spot &&
                            c.spot.colorType === ColorModel.REGISTRATION) {
                        return sw[i];
                    }
                } catch (e2) {
                    log("Registration.swatch: swatch " + i + " unreadable: " + e2.message);
                }
            }
            return null;
        },

        /**
         * The localized name of the registration swatch, or "[Registration]"
         * when the document has none.
         * @param {Document} doc - Document to read from.
         * @returns {string} Swatch name.
         */
        name: function (doc) {
            var s = this.swatch(doc);
            return s ? s.name : this.FALLBACK_NAME;
        },

        /**
         * The registration colour to paint with: the swatch's colour, or 100 %
         * black when the document has no registration swatch.
         * @param {Document} doc - Document to read from.
         * @returns {Color} Registration colour, or a CMYKColor 0/0/0/100.
         */
        color: function (doc) {
            var s = this.swatch(doc);
            if (s) { return s.color; }
            var k = new CMYKColor();
            k.cyan = 0; k.magenta = 0; k.yellow = 0; k.black = 100;
            return k;
        }
    };
}
