// ------------------------------------------------------------------------
// Script:      probe_case.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-29
// Description: Engine probe for Batch Text Edit (Task 5). Measures what
//              textRange.changeCaseTo(CaseChangeType.X) really produces on a
//              Czech input set (whole text and sub-range), plus five pure
//              language checks the Replace/Vars code relies on (String.match
//              with g, the \u0003 negated class, String.replace function
//              arguments layout, RegExp round-trip, non-participating group).
//              Creates its own document and closes only that one, unsaved.
// Usage:       tools/ai-eval.sh -t 120 batch-text-edit/tests/probes/probe_case.jsx
//              (run only with 0 open documents; the last expression is the
//              result, a JSON string with every non-ASCII character escaped)
// ------------------------------------------------------------------------
(function () {
    // Progress log, written as it goes: an AppleEvent timeout has lost whole results before.
    var LOG = Folder.temp.fsName + "/bte_probe_case.log";
    var WHOLE = ["čau světe", "ČAU SVĚTE", "žluťoučký kůň-úpěl", "a. b. c",
        "ŘEDITEL ŠKOLY. DRUHÁ VĚTA", "{kód} ABC"];
    var EXTRA = ["straße", "ǆ ǅ Ǆ", "o'neil don't", "x1y2 3abc", "a.b. c", "hello  world",
        "Ahoj! jak se máš? dobře", "ŠKOLA\rdruhý odstavec. třetí", "a_b-c/d", "(abc) \"def\" ghi",
        "ǉudi ﬁlm", "  úvod", "i̇ İ ı", "ÁÉÍÓÚ áéíóú"];
    // Second run: where the sentence and word boundaries of the engine lie.
    // Characters that are awkward in a source file are built from code points.
    var NB = String.fromCharCode(0x00a0), EL = String.fromCharCode(0x2026), AP = String.fromCharCode(0x2019);
    var LQ = String.fromCharCode(0x201e), RQ = String.fromCharCode(0x201c), ND = String.fromCharCode(0x2013);
    var EDGE = ["škola. druhá věta", "škola. Druhá věta", "ŠKOLA.DRUHÁ", "škola.druhá", "škola.Druhá",
        "škola.  druhá", "škola. 1 druhá", "škola. (druhá)", "škola. \"Druhá\"", "škola! druhá", "škola? druhá",
        "škola" + EL + " druhá", "škola.\rdruhá", "škola.\r\rdruhá", "a! b? c", "3abc def", "123 abc", "1. abc",
        "škola." + NB + "druhá", "škola." + NB + "Druhá", "a. B. c", LQ + "ahoj" + RQ + " svět",
        "ahoj. " + LQ + "druhá" + RQ, "ahoj. " + LQ + "Druhá" + RQ, "tel. 123", "e.g. abc", "Dr. novák",
        "a:b c:d", "1,5 a,b", "don" + AP + "t stop", "1.5x 2nd", "a1 b2c _x __y", "ab" + ND + "cd", "ab‑cd",
        "kód" + NB + "abc", "x+y=z", "ab@cd.cz www.example.cz", "3D tisk", "A4 formát", "i7 cpu", "ŘEDITEL-ŠKOLY",
        "{kód}-{název} {x_y}", "\tabc\tdef", "a\rb", "", "ÓČ", "ABC DEF. ghi"];
    // Third run: the rules behind the second (sentence terminators and their
    // exceptions, what joins a word).
    var BR = String.fromCharCode(3), SH = String.fromCharCode(0xad);
    var EDGE2 = ["škola.. druhá", "škola.. Druhá", "škola. - druhá", "škola. , Druhá", "3.14 abc", "cena 3.14. další věta",
        "cena 3.14. Další věta", "ŠKOLA?! DRUHÁ", "škola?! druhá", "škola.) druhá", "(škola.) Druhá", "(škola.) druhá",
        "škola.\" druhá", "škola.\" Druhá", "škola. a Druhá", "škola." + BR + "Druhá", "škola." + BR + "druhá",
        "A.B. Smith", "U.S. firma", "p. 12", "škola.\r\n" + "druhá", "škola! a druhá",
        "ab'cd 'ef' gh", "l'été", "a-b-c", "a/b", "(a)(b)", "ab" + SH + "cd", "ab_cd_ef", "a__b", "1_a", "a_1",
        "1a_b2", "x.1", "1.x", "a.1b", "ab.cd.ef", "a:1", "1:a", "1,a", "a,1", "1'2", "a'1"];
    // Case mapping of the ExtendScript string functions themselves (no document needed).
    var CASEMAP = ["ß", "ǆ", "ǅ", "Ǆ", "ǉ", "ﬁ", "ﬂ", "ı", "İ", "ŉ", "ǰ", "ς", "ΑΣ", "Ǳ", "ᾳ", "ÿ", "µ"];
    var MODES = [["upper", CaseChangeType.UPPERCASE], ["lower", CaseChangeType.LOWERCASE],
        ["title", CaseChangeType.TITLECASE], ["sentence", CaseChangeType.SENTENCECASE]];
    // [text, start, length]: a range inside a longer text, written the way
    // the tool will write it (characters[start], then length = n).
    var SUB = [["abc def ghi", 4, 3], ["ABC DEF GHI", 4, 3], ["abcdef", 2, 2], ["ABCDEF", 2, 2],
        ["{kód} ABC", 0, 5], ["{KÓD} abc", 0, 5], ["abc. def ghi", 5, 7], ["ABC. DEF GHI", 5, 7],
        ["x {kód}-ab cd", 2, 5]];
    var out = { engine: {}, casemap: [], whole: [], extra: [], edge: [], edge2: [], sub: [], note: "" };
    var doc = null;

    function hex(n) { var h = n.toString(16); while (h.length < 4) { h = "0" + h; } return h; }
    function q(s) {
        var r = "\"", i, c, code;
        for (i = 0; i < s.length; i++) {
            c = s.charAt(i); code = s.charCodeAt(i);
            if (c === "\"") { r += "\\\""; }
            else if (c === "\\") { r += "\\\\"; }
            else if (code < 32 || code > 126) { r += "\\u" + hex(code); }
            else { r += c; }
        }
        return r + "\"";
    }
    function j(v) {
        var a = [], k, i;
        if (v === null || v === undefined) { return "null"; }
        if (typeof v === "string") { return q(v); }
        if (typeof v === "number" || typeof v === "boolean") { return String(v); }
        if (v instanceof Array) {
            for (i = 0; i < v.length; i++) { a.push(j(v[i])); }
            return "[" + a.join(",") + "]";
        }
        for (k in v) { if (v.hasOwnProperty(k)) { a.push(q(k) + ":" + j(v[k])); } }
        return "{" + a.join(",") + "}";
    }
    function log(s) {
        var f = new File(LOG);
        f.encoding = "UTF-8";
        if (f.open("a")) { f.writeln(s); f.close(); }
    }
    function fresh(text) {
        var tf = doc.textFrames.pointText([20, -20]);
        tf.contents = text;
        return tf;
    }
    function wholeRun(list, into) {
        var i, k, tf, row;
        for (i = 0; i < list.length; i++) {
            row = { input: list[i] };
            for (k = 0; k < MODES.length; k++) {
                tf = fresh(list[i]);
                try {
                    tf.textRange.changeCaseTo(MODES[k][1]);
                    row[MODES[k][0]] = tf.contents;
                } catch (e) {
                    row[MODES[k][0]] = "ERROR " + e.message;
                }
                tf.remove();
            }
            into.push(row);
            log("case: " + j(row));
        }
    }
    function subRun() {
        var i, k, tf, row, r;
        for (i = 0; i < SUB.length; i++) {
            row = { input: SUB[i][0], start: SUB[i][1], length: SUB[i][2] };
            for (k = 0; k < MODES.length; k++) {
                tf = fresh(SUB[i][0]);
                try {
                    r = tf.characters[SUB[i][1]];
                    r.length = SUB[i][2];
                    r.changeCaseTo(MODES[k][1]);
                    row[MODES[k][0]] = tf.contents;
                } catch (e) {
                    row[MODES[k][0]] = "ERROR " + e.message;
                }
                tf.remove();
            }
            out.sub.push(row);
            log("sub: " + j(row));
        }
    }
    function engineChecks() {
        var SRC = "\\{[^{}\\r\\u0003]+\\}";
        var e = out.engine, calls, re, rt, n;
        e.c1_match_g = "a{x}b{y}".match(new RegExp(SRC, "g"));
        e.c2_negated_u0003 = ("{a" + String.fromCharCode(3) + "b} {c}").match(new RegExp(SRC, "g"));
        calls = [];
        "xaby ab".replace(/(a)(b)/g, function () {
            calls.push([arguments.length, arguments[arguments.length - 2], arguments[0], arguments[1], arguments[2]]);
            return arguments[0];
        });
        e.c3_two_groups = calls;
        calls = [];
        "abcb".replace(/b/g, function () {
            calls.push([arguments.length, arguments[arguments.length - 2], arguments[0]]);
            return arguments[0];
        });
        e.c3_zero_groups = calls;
        calls = [];
        "xaby ab".replace(/(a)(b)/g, function () {
            calls.push(arguments[arguments.length - 1]);
            return arguments[0];
        });
        e.c3_last_arg_is_string = calls;
        re = /a.b/i;
        rt = new RegExp(re.source, re.ignoreCase ? "gi" : "g");
        e.c4_roundtrip = { source: re.source, ignoreCase: re.ignoreCase, matchesA_B: "A-B".match(rt), matchesAxb: "AxB".match(rt) };
        e.c5_nonparticipating = "ab".replace(/(a)(x)?(b)/, function () {
            return typeof arguments[2] + ":" + String(arguments[2]);
        });
        "ab".replace(/(a)(x)?(b)/, function () { n = arguments.length; return ""; });
        e.c5_nonparticipating_length = n;
    }

    function caseMap() {
        var i;
        for (i = 0; i < CASEMAP.length; i++) {
            out.casemap.push({ input: CASEMAP[i], up: CASEMAP[i].toUpperCase(), low: CASEMAP[i].toLowerCase() });
        }
    }

    engineChecks();
    caseMap();
    log("engine: " + j(out.engine));

    if (app.documents.length !== 0) { return "PRERUSENO: otevrene dokumenty"; }
    try {
        doc = app.documents.add();
        out.note = "version " + app.version + ", doc " + doc.name;
        wholeRun(WHOLE, out.whole);
        wholeRun(EXTRA, out.extra);
        wholeRun(EDGE, out.edge);
        wholeRun(EDGE2, out.edge2);
        subRun();
    } catch (err) {
        out.note += " | FAILED: " + err.message;
    } finally {
        if (doc) {
            try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.note += " | close failed: " + e2.message; }
        }
    }
    log("done: documents=" + app.documents.length);
    return j(out);
})();
