(function () {
    if (app.documents.length !== 0) { return "PRERUSENO: otevrene dokumenty"; }
    var P = { snaps: [], alerts: [], confirms: 0, prompts: 0, shows: 0, notes: [] };
    var pdfOpts = null;
    try { pdfOpts = { c: app.preferences.PDFFileOptions.pDFCropToBox, p: app.preferences.PDFFileOptions.pageToOpen }; } catch (e) {}
    function abs(c) {
        var x = c.bounds.x, y = c.bounds.y, p = c.parent;
        while (p && p.type !== "dialog" && p.type !== "window") { x += p.bounds.x; y += p.bounds.y; p = p.parent; }
        return [x, y];
    }
    function walk(c, fn) { fn(c); if (c.children) { for (var i = 0; i < c.children.length; i++) { walk(c.children[i], fn); } } }
    function find(w, type, re, nth) {
        var hit = null, k = nth || 0;
        walk(w, function (c) { if (!hit && c.type === type && re.test(String(c.text))) { if (k === 0) { hit = c; } else { k--; } } });
        return hit;
    }
    var laid = {};
    function snap(w, label) {
        if (!w.__laid) { w.layout.layout(true); w.__laid = true; }
        var r = { label: label, size: [w.size.width, w.size.height], pref: [w.preferredSize.width, w.preferredSize.height], max: [w.maximumSize.width, w.maximumSize.height], panels: [] };
        walk(w, function (c) {
            if (c.type === "button" && c.properties && c.properties.name === "ok") { var a = abs(c); r.primary = [a[0], a[1], c.size.width, c.size.height, c.text]; }
            if (c.type === "button" && c.properties && c.properties.name === "cancel") { var b = abs(c); r.cancel = [b[0], b[1], c.size.width, c.size.height]; }
            if (c.type === "panel" && c.visible !== false) { var q = abs(c); r.panels.push([c.text, q[0], q[1], c.size.width, c.size.height]); }
        });
        P.snaps.push(r);
        return r;
    }
    function click(c) { if (c && c.onClick) { c.onClick(); return true; } return false; }
    function setRadio(rb) { if (!rb) { return false; } rb.value = true; if (rb.onClick) { rb.onClick(); } return true; }
    var H = { abs: abs, walk: walk, find: find, snap: snap, click: click, setRadio: setRadio, note: function (s) { P.notes.push(s); } };
    /*SCENARIO*/
    $.global.__PW = function (type, title, bounds, props) {
        var w = new Window(type, title, bounds, props);
        if (type === "dialog") {
            w.show = function () { P.shows++; try { scenario(w, P.shows, H); } catch (e) { P.notes.push("scenario: " + e.message + " line " + e.line); } return 0; };
            w.center = function () {};
        } else {
            w.show = function () {};
        }
        return w;
    };
    $.global.__PA = function (m) { P.alerts.push(String(m).substr(0, 300)); };
    $.global.__PC = function () { P.confirms++; return false; };
    $.global.__PP = function () { P.prompts++; return null; };
    var doc = null;
    try {
        doc = makeDoc();
        $.evalFile(new File("__PATCHED__"));
    } catch (e2) {
        P.notes.push("run: " + e2.message + " line " + e2.line);
    } finally {
        try { if (doc) { doc.close(SaveOptions.DONOTSAVECHANGES); } } catch (e3) { P.notes.push("close: " + e3.message); }
        try { if (pdfOpts) { app.preferences.PDFFileOptions.pDFCropToBox = pdfOpts.c; app.preferences.PDFFileOptions.pageToOpen = pdfOpts.p; } } catch (e4) {}
        $.global.__PW = undefined; $.global.__PA = undefined; $.global.__PC = undefined; $.global.__PP = undefined;
        try { __NS__ = undefined; } catch (e5) {}
    }
    function hex(n) { var x = n.toString(16); while (x.length < 4) { x = "0" + x; } return x; }
    function ascii(s) { var r = "", i, c; s = String(s); for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); r += (c < 32 || c > 126) ? "\\u" + hex(c) : s.charAt(i); } return r; }
    function j(v) { var a = [], k, i; if (v === null) { return "null"; } if (v === undefined) { return '"<undef>"'; } if (typeof v === "string") { return '"' + ascii(v).replace(/"/g, "'") + '"'; } if (typeof v !== "object") { return String(v); } if (v instanceof Array) { for (i = 0; i < v.length; i++) { a.push(j(v[i])); } return "[" + a.join(",") + "]"; } for (k in v) { if (v.hasOwnProperty(k)) { a.push('"' + k + '":' + j(v[k])); } } return "{" + a.join(",") + "}"; }
    var res = j(P);
    var f = new File("__OUT__/result___TOOL__.json"); f.encoding = "UTF-8"; if (f.open("w")) { f.write(res); f.close(); }
    return res.length + " chars, snaps " + P.snaps.length + ", notes " + P.notes.length + ", alerts " + P.alerts.length;
})();
