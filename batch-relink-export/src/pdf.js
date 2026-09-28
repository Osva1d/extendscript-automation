// ------------------------------------------------------------------------
// Module: BRE.Pdf — PDF page count and the page probe
// Part of: Illustrator Batch Relink Export
// Depends on: —
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Pdf = {

    /** Page k of the probe is (PROBE_BASE + k * PROBE_STEP) x 100 pt. */
    PROBE_BASE: 100,
    PROBE_STEP: 10,
    _ch: null,

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
    },

    // ---------------------------------------------------------------------
    // Page count
    // ---------------------------------------------------------------------

    /**
     * Number of pages of a PDF, read the way a viewer does: last startxref ->
     * cross-reference sections (newest first, following /XRefStm and /Prev,
     * so an incremental update counts as saved) -> trailer /Root -> catalog
     * /Pages -> /Count of the page tree root. Reads cross-reference streams
     * and object streams (PDF 1.5+; Flate with or without a PNG predictor).
     * Only the objects on that path are read, wherever they sit in the file.
     * Returns 0 when the count cannot be read (damaged file, another filter,
     * encryption) — never a guess.
     * @param {File} file - The PDF.
     * @returns {number} Page count, or 0 when unreadable.
     */
    pageCount: function (file) {
        var r = this._reader(file);
        if (!r) return 0;
        try {
            return this._countFromReader(r);
        } catch (e) {
            return 0;
        } finally {
            r.close();
        }
    },

    /**
     * Random-access byte reader over a file (one character per byte).
     * @param {File} file - The file to read.
     * @returns {Object|null} { length, read(off, n), close() }, or null.
     */
    _reader: function (file) {
        try {
            file.encoding = "BINARY";
            if (!file.open("r")) return null;
        } catch (e) {
            return null;
        }
        return {
            length: file.length,
            read: function (off, n) {
                file.seek(off, 0);
                return file.read(n);
            },
            close: function () {
                try { file.close(); } catch (e) {}
            }
        };
    },

    /**
     * Page count through a reader (see pageCount). Separate from the File
     * handling so it can be exercised on any byte source.
     * @param {Object} r - Reader from _reader().
     * @returns {number} Page count, or 0.
     */
    _countFromReader: function (r) {
        var tailLen = Math.min(r.length, 4096);
        var tail = r.read(r.length - tailLen, tailLen);
        var at = tail.lastIndexOf("startxref");
        if (at < 0) return 0;
        var first = parseInt(tail.substring(at + 9).replace(/^\s+/, ""), 10);

        var xref = {}, root = null, queue = [first], seen = {}, rounds = 0, sec, off;
        while (queue.length > 0 && rounds++ < 200) {
            off = queue.shift();
            if (isNaN(off) || off < 0 || off >= r.length || seen[off]) continue;
            seen[off] = true;
            sec = this._xrefSection(r, off, xref);
            if (!sec) return 0;
            if (!root) root = sec.root;
            // A hybrid file's stream belongs to the same revision as its
            // table, so it goes before the older /Prev revision.
            if (sec.xrefStm !== null) queue.push(sec.xrefStm);
            if (sec.prev !== null) queue.push(sec.prev);
        }
        if (!root) return 0;

        var cache = {};
        var catalog = this._object(r, xref, root, cache);
        var pagesRef = catalog && this._ref(catalog, "Pages");
        var pages = pagesRef && this._object(r, xref, pagesRef, cache);
        if (!pages) return 0;
        var count = this._ref(pages, "Count");
        if (count) {
            var body = this._object(r, xref, count, cache);
            return body ? (parseInt(body, 10) || 0) : 0;
        }
        var m = /\/Count\s+(\d+)/.exec(pages);
        return m ? parseInt(m[1], 10) : 0;
    },

    /**
     * Reads one cross-reference section — a classic table or a stream — and
     * adds the entries not known yet (newer sections are read first).
     * @param {Object} r - Reader.
     * @param {number} off - Offset from startxref, /Prev or /XRefStm.
     * @param {Object} xref - objnum -> {type, off} | {type, stm, idx}.
     * @returns {Object|null} { root, prev, xrefStm }, or null when unreadable.
     */
    _xrefSection: function (r, off, xref) {
        var head = r.read(off, 64);
        var lead = /^\s*/.exec(head)[0].length;
        if (head.substring(lead, lead + 4) === "xref") return this._xrefTable(r, off + lead + 4, xref);
        if (/^\s*\d+\s+\d+\s+obj/.test(head)) return this._xrefStream(r, off, xref);
        return null;
    },

    _xrefTable: function (r, off, xref) {
        var text = "", pos = off, cut;
        while ((cut = text.indexOf("trailer")) < 0) {
            if (pos >= r.length) return null;
            text += r.read(pos, 65536);
            pos += 65536;
        }
        var trailer = this._dictAt(text + r.read(pos, 4096), cut);
        if (!trailer) return null;

        var t = text.substring(0, cut).replace(/^\s+|\s+$/g, "").split(/\s+/);
        var i = 0, start, count, k, num;
        while (i + 1 < t.length) {
            start = parseInt(t[i], 10);
            count = parseInt(t[i + 1], 10);
            if (isNaN(start) || isNaN(count)) return null;
            i += 2;
            for (k = 0; k < count; k++, i += 3) {
                if (i + 2 >= t.length) return null;
                num = start + k;
                if (!xref.hasOwnProperty(num)) {
                    xref[num] = (t[i + 2] === "n") ? { type: 1, off: parseInt(t[i], 10) } : { type: 0 };
                }
            }
        }
        return {
            root: this._ref(trailer, "Root"),
            prev: this._int(trailer, "Prev"),
            xrefStm: this._int(trailer, "XRefStm")
        };
    },

    _xrefStream: function (r, off, xref) {
        var obj = this._objectAt(r, off, xref);
        if (!obj || !obj.dict || !/\/Type\s*\/XRef/.test(obj.dict)) return null;
        var data = this._streamData(r, obj, xref);
        if (data === null) return null;
        var w = /\/W\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(obj.dict);
        if (!w) return null;
        var w1 = parseInt(w[1], 10), w2 = parseInt(w[2], 10), w3 = parseInt(w[3], 10);
        var size = this._int(obj.dict, "Size");
        var index = [0, size === null ? 0 : size];
        var im = /\/Index\s*\[([^\]]*)\]/.exec(obj.dict);
        if (im) index = im[1].replace(/^\s+|\s+$/g, "").split(/\s+/);

        var p = 0, rowLen = w1 + w2 + w3, j, k, num, type, f2, f3;
        for (j = 0; j + 1 < index.length; j += 2) {
            for (k = 0; k < parseInt(index[j + 1], 10); k++) {
                if (p + rowLen > data.length) return null;
                type = w1 ? this._uint(data, p, w1) : 1;
                f2 = this._uint(data, p + w1, w2);
                f3 = this._uint(data, p + w1 + w2, w3);
                p += rowLen;
                num = parseInt(index[j], 10) + k;
                if (xref.hasOwnProperty(num)) continue;
                if (type === 1) xref[num] = { type: 1, off: f2 };
                else if (type === 2) xref[num] = { type: 2, stm: f2, idx: f3 };
                else xref[num] = { type: 0 };
            }
        }
        return { root: this._ref(obj.dict, "Root"), prev: this._int(obj.dict, "Prev"), xrefStm: null };
    },

    /**
     * Body of an indirect object, wherever it lives: at a file offset or
     * inside an object stream.
     * @returns {string|null} The object's dictionary or other body text.
     */
    _object: function (r, xref, ref, cache) {
        var e = xref[ref.num];
        if (!e) return null;
        if (e.type === 1) {
            var obj = this._objectAt(r, e.off, xref);
            return obj ? (obj.dict || obj.body) : null;
        }
        if (e.type === 2) {
            if (!cache.hasOwnProperty(e.stm)) cache[e.stm] = this._objectStream(r, xref, e.stm);
            var bodies = cache[e.stm];
            return (bodies && e.idx < bodies.length) ? bodies[e.idx] : null;
        }
        return null;
    },

    _objectStream: function (r, xref, num) {
        var e = xref[num];
        if (!e || e.type !== 1) return null;
        var obj = this._objectAt(r, e.off, xref);
        if (!obj || !obj.dict) return null;
        var data = this._streamData(r, obj, xref);
        var n = this._int(obj.dict, "N"), firstOff = this._int(obj.dict, "First");
        if (data === null || n === null || firstOff === null) return null;
        var t = data.substring(0, firstOff).replace(/^\s+|\s+$/g, "").split(/\s+/);
        var bodies = [], i, from, to;
        for (i = 0; i < n; i++) {
            from = firstOff + parseInt(t[2 * i + 1], 10);
            to = (i + 1 < n) ? firstOff + parseInt(t[2 * i + 3], 10) : data.length;
            bodies.push(data.substring(from, to).replace(/^\s+|\s+$/g, ""));
        }
        return bodies;
    },

    /**
     * Parses "n g obj ... endobj" at an offset: its dictionary (if any), its
     * other body text, and where its stream data starts.
     * @returns {Object|null} { dict, body, dataStart, dataEnd }.
     */
    _objectAt: function (r, off, xref) {
        var chunk = r.read(off, 8192);
        var m = /^\s*\d+\s+\d+\s+obj\s*/.exec(chunk);
        if (!m) return null;
        var bodyStart = m[0].length;
        var res = { dict: null, body: null, dataStart: -1, dataEnd: -1, lengthRef: null, length: null };
        if (chunk.substring(bodyStart, bodyStart + 2) === "<<") {
            var extra = 0;
            while ((res.dict = this._dictAt(chunk, bodyStart)) === null && extra < 16) {
                chunk += r.read(off + chunk.length, 65536);
                extra++;
            }
            if (!res.dict) return null;
            var after = bodyStart + res.dict.length;
            var sm = /^\s*stream(\r\n|\n|\r)/.exec(chunk.substring(after, after + 16));
            if (sm) {
                res.dataStart = off + after + sm[0].length;
                res.lengthRef = this._ref(res.dict, "Length");
                res.length = res.lengthRef ? null : this._int(res.dict, "Length");
            }
        } else {
            var end = chunk.indexOf("endobj", bodyStart);
            res.body = chunk.substring(bodyStart, end < 0 ? chunk.length : end).replace(/^\s+|\s+$/g, "");
        }
        return res;
    },

    /**
     * Decoded stream data of an object from _objectAt: Flate (zlib) with an
     * optional PNG predictor, or no filter.
     * @returns {string|null} Decoded bytes, or null when unsupported.
     */
    _streamData: function (r, obj, xref) {
        if (obj.dataStart < 0) return null;
        var len = obj.length;
        if (len === null && obj.lengthRef) {
            var body = this._object(r, xref, obj.lengthRef, {});
            len = body === null ? null : parseInt(body, 10);
        }
        var raw;
        if (len !== null && !isNaN(len)) {
            raw = r.read(obj.dataStart, len);
        } else {
            var rest = r.read(obj.dataStart, r.length - obj.dataStart);
            var e = rest.indexOf("endstream");
            if (e < 0) return null;
            raw = rest.substring(0, e).replace(/(\r\n|\n|\r)$/, "");
        }
        var filter = /\/Filter\s*\[?\s*\/(\w+)/.exec(obj.dict);
        if (filter && (filter[1] !== "FlateDecode" || /\/Filter\s*\[[^\]]*\/\w+\s*\/\w+/.test(obj.dict))) return null;
        var data = filter ? this._inflate(raw) : raw;
        var pred = this._int(obj.dict, "Predictor");
        if (pred !== null && pred >= 10) {
            var cols = this._int(obj.dict, "Columns");
            data = this._unpredict(data, cols === null ? 1 : cols);
        } else if (pred !== null && pred !== 1) {
            return null;
        }
        return data;
    },

    /**
     * Reverses the PNG predictors (filter byte per row) for 8-bit, one-byte
     * samples — what cross-reference streams use. Output is built in blocks
     * of at most 4096 characters: ExtendScript arrays slow down
     * quadratically as they grow (measured, AI 30.8.2).
     */
    _unpredict: function (data, cols) {
        var CH = this._chars(), chunks = [], cur = [], prev = [], row;
        var rowLen = cols + 1, r0, c, f, x, a, b, d, p, pa, pb, pc;
        for (c = 0; c < cols; c++) prev[c] = 0;
        for (r0 = 0; r0 + rowLen <= data.length; r0 += rowLen) {
            f = data.charCodeAt(r0);
            row = [];
            for (c = 0; c < cols; c++) {
                x = data.charCodeAt(r0 + 1 + c);
                a = c > 0 ? row[c - 1] : 0;
                b = prev[c];
                d = c > 0 ? prev[c - 1] : 0;
                if (f === 1) x += a;
                else if (f === 2) x += b;
                else if (f === 3) x += (a + b) >> 1;
                else if (f === 4) {
                    p = a + b - d;
                    pa = Math.abs(p - a); pb = Math.abs(p - b); pc = Math.abs(p - d);
                    x += (pa <= pb && pa <= pc) ? a : ((pb <= pc) ? b : d);
                }
                row[c] = x & 255;
                cur[cur.length] = CH[row[c]];
            }
            prev = row;
            if (cur.length >= 4096) {
                chunks[chunks.length] = cur.join("");
                cur = [];
            }
        }
        chunks[chunks.length] = cur.join("");
        return chunks.join("");
    },

    /**
     * Inflates zlib or raw deflate data (RFC 1950/1951) — after Mark Adler's
     * puff. Throws on corrupt input. Output goes into blocks of 4096
     * characters and back-references read a 32 KB window kept as a string:
     * ExtendScript arrays slow down quadratically as they grow (measured,
     * AI 30.8.2), so no large array is ever built. Bytes are taken with
     * charCodeAt, never charAt: charAt returns "" for a NUL character.
     * @param {string} s - Compressed bytes, one character per byte.
     * @returns {string} Decompressed bytes.
     */
    _inflate: function (s) {
        var CH = this._chars();
        var pos = 0, bitbuf = 0, bitcnt = 0;
        var chunks = [], cur = [], tail = "", tailStart = 0, done = 0;
        if (s.length > 2 && (s.charCodeAt(0) & 15) === 8 &&
                ((s.charCodeAt(0) << 8) | s.charCodeAt(1)) % 31 === 0) pos = 2;

        function bits(need) {
            var val = bitbuf;
            while (bitcnt < need) {
                if (pos >= s.length) throw new Error("inflate: unexpected end of data");
                val |= s.charCodeAt(pos++) << bitcnt;
                bitcnt += 8;
            }
            bitbuf = val >> need;
            bitcnt -= need;
            return val & ((1 << need) - 1);
        }
        // Moves the current output block into the result and the window.
        function finish() {
            var chunk = cur.join("");
            chunks[chunks.length] = chunk;
            tail += chunk;
            done += cur.length;
            cur = [];
            if (tail.length > 65536) {
                tailStart += tail.length - 32768;
                tail = tail.substring(tail.length - 32768);
            }
        }
        function construct(h, lengths, n) {
            var sym, len, left, offs = [];
            h.count = []; h.symbol = [];
            for (len = 0; len <= 15; len++) h.count[len] = 0;
            for (sym = 0; sym < n; sym++) h.count[lengths[sym]]++;
            if (h.count[0] === n) return 0;
            left = 1;
            for (len = 1; len <= 15; len++) {
                left <<= 1;
                left -= h.count[len];
                if (left < 0) return left;
            }
            offs[1] = 0;
            for (len = 1; len < 15; len++) offs[len + 1] = offs[len] + h.count[len];
            for (sym = 0; sym < n; sym++) {
                if (lengths[sym] !== 0) h.symbol[offs[lengths[sym]]++] = sym;
            }
            return left;
        }
        // Canonical Huffman decode, bit by bit from a local copy of the bit buffer.
        function decode(h) {
            var code = 0, firstCode = 0, index = 0, len, count;
            var cnt = h.count, buf = bitbuf, left = bitcnt;
            for (len = 1; len <= 15; len++) {
                if (left === 0) {
                    if (pos >= s.length) throw new Error("inflate: unexpected end of data");
                    buf = s.charCodeAt(pos++);
                    left = 8;
                }
                code |= buf & 1;
                buf >>= 1;
                left--;
                count = cnt[len];
                if (code - count < firstCode) {
                    bitbuf = buf;
                    bitcnt = left;
                    return h.symbol[index + (code - firstCode)];
                }
                index += count;
                firstCode += count;
                firstCode <<= 1;
                code <<= 1;
            }
            throw new Error("inflate: bad code");
        }
        var LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
        var LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
        var DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
        var DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
        function codes(lencode, distcode) {
            var sym, len, dist, from, k;
            for (;;) {
                sym = decode(lencode);
                if (sym < 256) {
                    cur[cur.length] = CH[sym];
                    if (cur.length === 4096) finish();
                } else if (sym === 256) {
                    return;
                } else {
                    sym -= 257;
                    if (sym >= 29) throw new Error("inflate: bad length");
                    len = LBASE[sym] + bits(LEXT[sym]);
                    sym = decode(distcode);
                    if (sym >= 30) throw new Error("inflate: bad distance");
                    dist = DBASE[sym] + bits(DEXT[sym]);
                    from = done + cur.length - dist;
                    if (from < 0) throw new Error("inflate: distance too far back");
                    for (k = 0; k < len; k++, from++) {
                        cur[cur.length] = (from >= done) ? cur[from - done] : CH[tail.charCodeAt(from - tailStart)];
                        if (cur.length === 4096) finish();
                    }
                }
            }
        }
        var fixedLen = null, fixedDist = null, ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
        var last, type, i, n, lengths, lencode, distcode, nlen, ndist, ncode, sym, rep, len;
        do {
            last = bits(1);
            type = bits(2);
            if (type === 0) {
                bitbuf = 0; bitcnt = 0;
                if (pos + 4 > s.length) throw new Error("inflate: unexpected end of data");
                n = s.charCodeAt(pos) | (s.charCodeAt(pos + 1) << 8);
                pos += 4;
                if (pos + n > s.length) throw new Error("inflate: unexpected end of data");
                for (i = 0; i < n; i++) {
                    cur[cur.length] = CH[s.charCodeAt(pos++)];
                    if (cur.length === 4096) finish();
                }
            } else if (type === 1) {
                if (!fixedLen) {
                    lengths = [];
                    for (i = 0; i < 144; i++) lengths[i] = 8;
                    for (; i < 256; i++) lengths[i] = 9;
                    for (; i < 280; i++) lengths[i] = 7;
                    for (; i < 288; i++) lengths[i] = 8;
                    fixedLen = {}; construct(fixedLen, lengths, 288);
                    lengths = [];
                    for (i = 0; i < 30; i++) lengths[i] = 5;
                    fixedDist = {}; construct(fixedDist, lengths, 30);
                }
                codes(fixedLen, fixedDist);
            } else if (type === 2) {
                nlen = bits(5) + 257;
                ndist = bits(5) + 1;
                ncode = bits(4) + 4;
                if (nlen > 286 || ndist > 30) throw new Error("inflate: bad counts");
                lengths = [];
                for (i = 0; i < 19; i++) lengths[i] = 0;
                for (i = 0; i < ncode; i++) lengths[ORDER[i]] = bits(3);
                lencode = {};
                if (construct(lencode, lengths, 19) !== 0) throw new Error("inflate: bad code lengths");
                lengths = [];
                i = 0;
                while (i < nlen + ndist) {
                    sym = decode(lencode);
                    if (sym < 16) {
                        lengths[i++] = sym;
                    } else {
                        len = 0;
                        if (sym === 16) {
                            if (i === 0) throw new Error("inflate: repeat with no first length");
                            len = lengths[i - 1];
                            rep = 3 + bits(2);
                        } else if (sym === 17) {
                            rep = 3 + bits(3);
                        } else {
                            rep = 11 + bits(7);
                        }
                        if (i + rep > nlen + ndist) throw new Error("inflate: too many lengths");
                        while (rep--) lengths[i++] = len;
                    }
                }
                lencode = {}; distcode = {};
                var llen = lengths.slice(0, nlen), dlen = lengths.slice(nlen);
                if (construct(lencode, llen, nlen) < 0) throw new Error("inflate: bad literal lengths");
                if (construct(distcode, dlen, ndist) < 0) throw new Error("inflate: bad distance lengths");
                codes(lencode, distcode);
            } else {
                throw new Error("inflate: bad block type");
            }
        } while (!last);
        chunks[chunks.length] = cur.join("");
        return chunks.join("");
    },

    /** One-character strings for byte values 0-255, built once. */
    _chars: function () {
        if (!this._ch) {
            this._ch = [];
            for (var i = 0; i < 256; i++) this._ch[i] = String.fromCharCode(i);
        }
        return this._ch;
    },

    /** Big-endian unsigned integer of `w` bytes at `p`. */
    _uint: function (data, p, w) {
        var v = 0;
        for (var i = 0; i < w; i++) v = v * 256 + data.charCodeAt(p + i);
        return v;
    },

    /**
     * The balanced "<< ... >>" dictionary starting at or after `from`,
     * skipping literal and hex strings.
     * @returns {string|null} The dictionary text, or null if it is cut off.
     */
    _dictAt: function (s, from) {
        var start = s.indexOf("<<", from);
        if (start < 0) return null;
        var i = start, depth = 0, n = s.length, c, pd, close;
        while (i < n) {
            c = s.charAt(i);
            if (c === "(") {
                pd = 1;
                i++;
                while (i < n && pd > 0) {
                    c = s.charAt(i);
                    if (c === "\\") i++;
                    else if (c === "(") pd++;
                    else if (c === ")") pd--;
                    i++;
                }
            } else if (c === "<") {
                if (s.charAt(i + 1) === "<") {
                    depth++;
                    i += 2;
                } else {
                    close = s.indexOf(">", i + 1);
                    if (close < 0) return null;
                    i = close + 1;
                }
            } else if (c === ">" && s.charAt(i + 1) === ">") {
                depth--;
                i += 2;
                if (depth === 0) return s.substring(start, i);
            } else {
                i++;
            }
        }
        return null;
    },

    /** Indirect reference "/Key n g R" in a dictionary, as { num, gen }. */
    _ref: function (dict, key) {
        var m = new RegExp("/" + key + "\\s+(\\d+)\\s+(\\d+)\\s+R").exec(dict);
        return m ? { num: parseInt(m[1], 10), gen: parseInt(m[2], 10) } : null;
    },

    /** Direct integer "/Key 123" in a dictionary, or null. */
    _int: function (dict, key) {
        var m = new RegExp("/" + key + "\\s+(\\d+)(?![\\d.]|\\s+\\d+\\s+R)").exec(dict);
        return m ? parseInt(m[1], 10) : null;
    }
};
