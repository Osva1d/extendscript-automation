// ------------------------------------------------------------------------
// Module: DrawingScale (shared) — the drawing scale 1:N kept in the document
// Part of: shared core (grommet-marks, tile-export, zund-summa-marks;
//          extendscript-ui-standards §12.9)
//
// Namespace-neutral factory: buildDrawingScale(NS) registers NS.DrawingScale
// on the namespace object passed in. A tool's build cats this file and
// appends its own call — buildDrawingScale(TE);. Tests eval this file, then
// call the factory with their mock namespace.
//
// Optional dependency: NS.Utils.log, for an unreadable or unwritable packet.
//
// The drawing scale is one property of the document for every tool (decided
// 2026-10-17, follow-up audit §5, variant C). Its key is the one tile-export
// 1.1.0 already writes, so documents it has written need no migration: the
// namespace URI is an identifier nobody sees, its "tile-export" part is
// history, not ownership. Taken from tile-export's TE.Doc (scalePatterns,
// readDrawingScale, writeDrawingScale, loadDrawingScale, saveDrawingScale),
// unchanged apart from the namespace constant living here. Never copy it: a
// fix in it — like the renamed prefix below (N43) — must hold for every tool.
// ------------------------------------------------------------------------
function buildDrawingScale(NS) {
    function log(msg) {
        try { if (NS.Utils && NS.Utils.log) { NS.Utils.log(msg); } } catch (e) {}
    }

    NS.DrawingScale = {
        // The family key: namespace of tile-export 1.1.0, key drawingScale.
        NAMESPACE: "https://codeberg.org/Osva1d/extendscript-automation/ns/tile-export/1.0/",
        KEY: "drawingScale",

        /**
         * Where the drawing scale can stand in an XMP packet: one entry for
         * each prefix the packet binds to the family namespace. PURE FUNCTION.
         * Illustrator re-serializes a packet written into it and may rename
         * the prefix: "te" came back as "te_1_" (measured 2026-10-11, AI
         * 30.8.2, tile-export N43). So the value is found through its
         * namespace, never a fixed prefix.
         * @param {string} x - XMP packet.
         * @returns {Array} {prefix, el, at}: the element and the attribute
         *          form, each capturing the value.
         */
        patterns: function (x) {
            function esc(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&"); }
            var decl = new RegExp("xmlns:([A-Za-z_][\\w.\\-]*)\\s*=\\s*\""
                + esc(this.NAMESPACE) + "\"", "g");
            var out = [], m, p, k = this.KEY;
            while ((m = decl.exec(x)) !== null) {
                p = esc(m[1]);
                out.push({
                    prefix: m[1],
                    el: new RegExp("<" + p + ":" + k + ">\\s*([^<\\s]*)\\s*</" + p + ":" + k + ">"),
                    at: new RegExp("\\b" + p + ":" + k + "=\"([^\"]*)\"")
                });
            }
            return out;
        },

        /**
         * The drawing scale N of 1:N stored in an XMP packet. PURE FUNCTION.
         * Reads the element form write() writes, and the attribute form an
         * XMP toolkit may turn it into.
         * @param {string} xmp - A document's XMPString.
         * @returns {number|null} N > 0, or null when none is stored.
         */
        read: function (xmp) {
            var x = String(xmp || ""), ps = this.patterns(x), i, m, n;
            for (i = 0; i < ps.length; i++) {
                m = ps[i].el.exec(x) || ps[i].at.exec(x);
                if (m) {
                    n = Number(m[1]);
                    return (isFinite(n) && n > 0) ? n : null;
                }
            }
            return null;
        },

        /**
         * The XMP packet with the drawing scale set. PURE FUNCTION.
         * An existing value is replaced where it is; otherwise a description
         * of the family's own goes in before the end of the RDF.
         * @param {string} xmp - A document's XMPString.
         * @param {number} n - N of 1:N.
         * @returns {string|null} The new packet, or null when it has no RDF.
         */
        write: function (xmp, n) {
            var x = String(xmp || ""), v = String(n), ps = this.patterns(x), i, p, k = this.KEY;
            for (i = 0; i < ps.length; i++) {
                p = ps[i].prefix;
                if (ps[i].el.test(x)) {
                    return x.replace(ps[i].el, "<" + p + ":" + k + ">" + v + "</" + p + ":" + k + ">");
                }
                if (ps[i].at.test(x)) { return x.replace(ps[i].at, p + ":" + k + "=\"" + v + "\""); }
            }
            if (x.indexOf("</rdf:RDF>") === -1) { return null; }
            return x.replace("</rdf:RDF>", "<rdf:Description rdf:about=\"\" xmlns:te=\""
                + this.NAMESPACE + "\"><te:" + k + ">" + v
                + "</te:" + k + "></rdf:Description></rdf:RDF>");
        },

        /**
         * The drawing scale this document remembers. Measured 2026-10-10: a
         * value written into doc.XMPString survives saving and reopening.
         * @param {Document} doc - The document.
         * @returns {number|null} N, or null when the document has none.
         */
        load: function (doc) {
            try { return this.read(doc.XMPString); }
            catch (e) { log("DrawingScale.load: XMP unreadable: " + e.message); return null; }
        },

        /**
         * Stores the drawing scale in the document, unless it is already
         * there. A failure only costs typing the scale again next time.
         * @param {Document} doc - The document.
         * @param {number} n - N of 1:N.
         * @returns {boolean} True when the document holds n afterwards.
         */
        save: function (doc, n) {
            try {
                if (this.read(doc.XMPString) === Number(n)) { return true; }
                var x = this.write(doc.XMPString, n);
                if (x === null) { log("DrawingScale.save: XMP without RDF, scale not stored"); return false; }
                doc.XMPString = x;
                return true;
            } catch (e) {
                log("DrawingScale.save: XMP not writable: " + e.message);
                return false;
            }
        }
    };
}
