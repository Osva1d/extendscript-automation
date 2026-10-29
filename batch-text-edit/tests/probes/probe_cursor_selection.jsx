// ------------------------------------------------------------------------
// Script:      probe_cursor_selection.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-29
// Description: Read-only half of fact (2) for Batch Text Edit (Task 8): what
//              app.activeDocument.selection (and app.selection) is while the
//              user has a text cursor or a text range selected inside a text
//              (edit mode). It only READS - no document is created, closed or
//              changed, nothing is selected. A script cannot place a text
//              cursor, so the USER sets the state up first.
// Usage:       1. File > New: a scratch document (any size).
//              2. Type tool (T), click on the artboard, type a few words
//                 (e.g. "Hello world 123"), then press Esc once. Do NOT
//                 deselect. The text is now a selected object.
//              3. State A (object selected): run the probe (below).
//              4. With the Type tool double-click into the text so the cursor
//                 blinks inside it (edit mode), place the cursor and do not
//                 select any characters. State B (cursor): run the probe.
//              5. Select 3 characters with the mouse (drag, or Shift+Right x3).
//                 State C (3 characters selected): run the probe.
//              6. Select all text inside the frame (Cmd+A while editing).
//                 State D (all characters selected): run the probe.
//              Run it from a terminal, with the document and the state
//              untouched in between:
//                  tools/ai-eval.sh -t 30 batch-text-edit/tests/probes/probe_cursor_selection.jsx
//              The result is one JSON string. Close the scratch document
//              without saving afterwards.
// ------------------------------------------------------------------------
(function () {
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
        if (v === null) { return "null"; }
        if (v === undefined) { return "\"<undefined>\""; }
        if (typeof v === "string") { return q(v); }
        if (typeof v === "number") { return isFinite(v) ? String(v) : q(String(v)); }
        if (typeof v === "boolean") { return String(v); }
        if (v instanceof Array) {
            for (i = 0; i < v.length; i++) { a.push(j(v[i])); }
            return "[" + a.join(",") + "]";
        }
        for (k in v) { if (v.hasOwnProperty(k)) { a.push(q(k) + ":" + j(v[k])); } }
        return "{" + a.join(",") + "}";
    }
    function safe(fn) {
        try { return fn(); } catch (e) { return "ERR: " + e.message; }
    }
    function head(s, n) { s = String(s); return s.length > n ? s.substring(0, n) : s; }

    // Everything that can be known about one object, each property read on its own.
    function describe(o) {
        var d = {};
        if (o === null || o === undefined) { return { value: o === null ? "null" : "undefined" }; }
        d.typeof = typeof o;
        d.typename = safe(function () { return o.typename; });
        d.constructorName = safe(function () { return o.constructor ? o.constructor.name : "<no constructor>"; });
        d.isArray = (o instanceof Array);
        d.length = safe(function () { return o.length; });
        d.toString = safe(function () { return head(o.toString(), 80); });
        // TextRange-like properties
        d.contents = safe(function () { return head(o.contents, 60); });
        d.characters = safe(function () { return o.characters.length; });
        d.parentTypename = safe(function () { return o.parent.typename; });
        d.storyTypename = safe(function () { return o.story.typename; });
        d.storyFrames = safe(function () { return o.story.textFrames.length; });
        d.textFramesLength = safe(function () { return o.textFrames.length; });
        d.insertionPoints = safe(function () { return o.insertionPoints.length; });
        d.editable = safe(function () { return o.editable; });
        return d;
    }

    var out = { app: "Illustrator " + app.version, documents: app.documents.length };
    if (app.documents.length === 0) { out.note = "no document open - create one, put a text in it and set up the state first"; return j(out); }

    var doc = app.activeDocument;
    out.doc = safe(function () { return doc.name; });

    // doc.selection and app.selection: the same thing?
    var s1 = safe(function () { return doc.selection; });
    var s2 = safe(function () { return app.selection; });
    out.docSelection = describe(s1);
    out.appSelection = describe(s2);
    out.sameObject = safe(function () { return s1 === s2; });

    // If it is an array, describe what is in it (first 5 items).
    out.items = [];
    safe(function () {
        var i;
        if (s1 instanceof Array || (s1 && typeof s1.length === "number" && typeof s1.typename === "undefined")) {
            for (i = 0; i < s1.length && i < 5; i++) { out.items.push(describe(s1[i])); }
        }
        return null;
    });

    // Does the selected text frame (the one holding the cursor) show up some other way?
    out.textFramesInDoc = safe(function () { return doc.textFrames.length; });
    out.frame0 = safe(function () {
        var tf = doc.textFrames[0];
        return { contents: head(tf.contents, 60), editable: tf.editable, selected: tf.selected };
    });
    out.text0Selected = safe(function () { return doc.textFrames[0].selected; });
    return j(out);
})();
