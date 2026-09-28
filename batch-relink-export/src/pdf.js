// ------------------------------------------------------------------------
// Module: BRE.Pdf — PDF files the script writes itself
// Part of: Illustrator Batch Relink Export
// Depends on: —
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Pdf = {

    /** Page k of the probe is (PROBE_BASE + k * PROBE_STEP) x 100 pt. */
    PROBE_BASE: 100,
    PROBE_STEP: 10,

    /**
     * Writes the page probe: an n-page PDF whose page k (1-based) is
     * (PROBE_BASE + k * PROBE_STEP) points wide. Only a MediaBox is given, so
     * every other PDF box equals the page, and the page is filled edge to
     * edge, so its artwork bounds equal the page too. A position relinked to
     * the probe keeps its page number and its PDF crop setting (measured,
     * AI 30.8.2), so the width of its boundingBox tells which page of the
     * template's PDF it shows — see pageFromWidth().
     * @param {File} file - Where to write the probe.
     * @param {number} n - Number of pages.
     * @returns {boolean} True when the file was written.
     */
    writeProbe: function (file, n) {
        var out = "%PDF-1.4\n";
        var offsets = [];
        var kids = [];
        var k, w, pageNum, contentNum, ops;

        function add(num, body) {
            offsets[num] = out.length;
            out += num + " 0 obj\n" + body + "\nendobj\n";
        }

        add(1, "<< /Type /Catalog /Pages 2 0 R >>");
        for (k = 1; k <= n; k++) {
            w = this.PROBE_BASE + k * this.PROBE_STEP;
            pageNum = 1 + 2 * k;
            contentNum = pageNum + 1;
            kids.push(pageNum + " 0 R");
            ops = "0.5 g 0 0 " + w + " 100 re f";
            add(pageNum, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + w + " 100] /Contents " +
                contentNum + " 0 R >>");
            add(contentNum, "<< /Length " + ops.length + " >>\nstream\n" + ops + "\nendstream");
        }
        add(2, "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>");

        var size = 2 * n + 2;
        var xref = out.length;
        out += "xref\n0 " + size + "\n0000000000 65535 f \n";
        for (var num = 1; num < size; num++) {
            out += ("000000000" + offsets[num]).slice(-10) + " 00000 n \n";
        }
        out += "trailer\n<< /Size " + size + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";

        // Byte offsets above assume one byte per character and "\n" as is.
        file.encoding = "BINARY";
        file.lineFeed = "Unix";
        if (!file.open("w")) return false;
        var ok = file.write(out);
        file.close();
        return ok;
    },

    /**
     * Page number a position shows, from the width of its placed page after
     * it was relinked to the probe (writeProbe).
     * @param {number} width - boundingBox width in points.
     * @returns {number} Page number (may be out of range for a wrong input).
     */
    pageFromWidth: function (width) {
        return Math.round((width - this.PROBE_BASE) / this.PROBE_STEP);
    }
};
