// ------------------------------------------------------------------------
// Script:      probe_dom.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-29
// Description: DOM facts probe for Batch Text Edit (Task 8). Measures what
//              collecting texts into elements (Task 9) and writing (Task 10)
//              rely on: (1) uuid on GroupItem, PathItem, CompoundPathItem and
//              TextFrame (existence, stability, duplicates), (3) linked
//              frames, (4) overflow by the line-sum rule, (5) bounds of the
//              clip-group mask (PathItem and CompoundPathItem), (6) bounds of
//              empty texts, (7) editable as the single skip test. Fact (2),
//              the cursor in a text, needs the user: probe_cursor_selection.jsx.
//              Every part creates its own document and closes only that one,
//              unsaved. Nothing is written to the user's documents.
// Usage:       tools/ai-eval.sh -t 120 batch-text-edit/tests/probes/probe_dom.jsx
//              Run only with 0 open documents. The result is one JSON string,
//              every non-ASCII character escaped. To run a single part, set
//              ONLY below (e.g. "mask"); empty runs all parts.
// ------------------------------------------------------------------------
(function () {
    var ONLY = "";
    // Progress log, written as it goes: an AppleEvent timeout has lost whole results before.
    var LOG = Folder.temp.fsName + "/bte_probe_dom.log";
    var out = { app: "", uuid: {}, linked: {}, overflow: {}, mask: {}, editable: {}, empty: {}, notes: [] };
    var oldUIL = null;

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
    function log(s) {
        var f = new File(LOG);
        f.encoding = "UTF-8";
        if (f.open("a")) { f.writeln(s); f.close(); }
    }
    function r2(v) { return Math.round(v * 100) / 100; }
    function bnd(b) {
        var i, a = [];
        for (i = 0; i < b.length; i++) { a.push(r2(b[i])); }
        return a;
    }
    // Run fn; on a throw return "ERR: message" so one failing fact never hides the rest.
    function safe(fn) {
        try { return fn(); } catch (e) { return "ERR: " + e.message; }
    }
    // One part = one own document, closed (unsaved) in finally.
    function inDoc(name, w, h, fn) {
        var d = null;
        if (ONLY !== "" && ONLY !== name) { return; }
        log("part " + name + " start");
        try {
            d = app.documents.add(DocumentColorSpace.RGB, w, h);
            fn(d, out[name]);
        } catch (e) {
            out[name].FAILED = e.message + " (line " + e.line + ")";
        } finally {
            if (d) {
                try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.notes.push("close failed in " + name + ": " + e2.message); }
            }
        }
        log("part " + name + " done: " + j(out[name]));
        log("documents=" + app.documents.length);
    }
    function point(container, x, y, text) {
        var tf = container.textFrames.pointText([x, y]);
        tf.contents = text;
        return tf;
    }
    function area(container, top, left, w, h, text) {
        var tf = container.textFrames.areaText(container.pathItems.rectangle(top, left, w, h));
        tf.contents = text;
        return tf;
    }
    function linesSum(tf) {
        var s = 0, i, ls = tf.lines;
        for (i = 0; i < ls.length; i++) { s += ls[i].characters.length; }
        return s;
    }
    function type(v) { return (v === null) ? "null" : typeof v; }
    // Three candidate overflow rules, all evaluated on the same frame:
    //   spec   - sum of lines[i].characters.length < characters.length (rešerše 7.2, spec 4.1)
    //   count  - the same sum plus every CR / U+0003 in contents < characters.length
    //   walk   - walk contents line by line: add the line length, then one more character when
    //            the next one is CR or U+0003 (a line terminator is not part of the line);
    //            overflow when the walk ends before the last character
    function overflowVerdicts(tf) {
        var ETX = String.fromCharCode(3);
        var c = tf.contents, ls = tf.lines, total = tf.characters.length, sum = 0, term = 0, p = 0, i, ch;
        for (i = 0; i < c.length; i++) { ch = c.charAt(i); if (ch === "\r" || ch === ETX) { term++; } }
        for (i = 0; i < ls.length; i++) {
            sum += ls[i].characters.length;
            p += ls[i].characters.length;
            ch = c.charAt(p);
            if (ch === "\r" || ch === ETX) { p++; }
        }
        return { total: total, sum: sum, lines: ls.length, terminators: term, walkVisible: p,
            spec: sum < total, count: (sum + term) < total, walk: p < total };
    }

    // ---------------------------------------------------------------- (1) uuid
    function partUuid(d, u) {
        var L = d.layers[0], G, gt, gp, P, C, T, G2, all = [], names = [], base = {}, i, k, step;
        var steps = {};

        G = L.groupItems.add();
        gt = point(G, 50, 700, "in group");
        gp = G.pathItems.rectangle(680, 40, 60, 30);
        P = L.pathItems.rectangle(600, 50, 100, 50);
        T = point(L, 50, 500, "plain text");
        C = safe(function () {
            var c = L.compoundPathItems.add();
            c.pathItems.rectangle(400, 50, 100, 100);
            c.pathItems.rectangle(380, 70, 30, 30);
            return c;
        });
        if (typeof C === "string") {
            u.compoundBuild = C + " (fallback: menu command)";
            C = safe(function () {
                var r1 = L.pathItems.rectangle(400, 50, 100, 100), r2b = L.pathItems.rectangle(380, 70, 30, 30);
                d.selection = [r1, r2b];
                app.executeMenuCommand("compoundPath");
                return d.selection[0];
            });
        }
        u.compoundBuild = u.compoundBuild || "compoundPathItems.add() + pathItems.rectangle() x2";
        u.compoundType = (typeof C === "string") ? C : C.typename;

        all.push(["GroupItem", G]);
        all.push(["PathItem", P]);
        all.push(["CompoundPathItem", C]);
        all.push(["TextFrame", T]);
        all.push(["GroupItem.child TextFrame", gt]);
        all.push(["GroupItem.child PathItem", gp]);

        // existence + stability: read twice, compare
        u.items = [];
        for (i = 0; i < all.length; i++) {
            (function (label, item) {
                var row = { label: label };
                if (typeof item === "string") { row.error = item; u.items.push(row); return; }
                row.typename = item.typename;
                row.typeofUuid = type(safe(function () { return item.uuid; }));
                row.u1 = safe(function () { return item.uuid; });
                row.u2 = safe(function () { return item.uuid; });
                row.sameTwice = (row.u1 === row.u2);
                row.hasProp = safe(function () { return ("uuid" in item); });
                base[label] = row.u1;
                u.items.push(row);
            })(all[i][0], all[i][1]);
        }

        // stability under: redraw, move, text write, re-fetch from the collection
        steps.afterRedraw = safe(function () { app.redraw(); return null; });
        steps.afterRedrawSame = {};
        for (i = 0; i < all.length; i++) {
            if (typeof all[i][1] !== "string") { steps.afterRedrawSame[all[i][0]] = safe(function () { return all[i][1].uuid === base[all[i][0]]; }); }
        }
        steps.afterTranslateSame = {};
        for (i = 0; i < all.length; i++) {
            (function (label, item) {
                if (typeof item === "string") { return; }
                steps.afterTranslateSame[label] = safe(function () { item.translate(10, 0); return item.uuid === base[label]; });
            })(all[i][0], all[i][1]);
        }
        steps.afterWriteSame = safe(function () {
            var r = T.characters[0];
            r.length = 5;
            r.contents = "PLAIN";
            return T.uuid === base["TextFrame"] && T.contents === "PLAIN text";
        });
        steps.afterContentsAssignSame = safe(function () { T.contents = "whole new text"; return T.uuid === base["TextFrame"]; });
        steps.refetch = {
            groupItems0_uuid_eq: safe(function () { return L.groupItems[0].uuid === base["GroupItem"]; }),
            groupItems0_identity: safe(function () { return L.groupItems[0] === G; }),
            childParent_uuid_eq: safe(function () { return gt.parent.uuid === base["GroupItem"]; }),
            childParent_identity: safe(function () { return gt.parent === G; }),
            groupPageItemsFirstTextOrPath_identity: safe(function () { return (G.pageItems[0] === gt) || (G.pageItems[0] === gp) || (G.pageItems[1] === gt) || (G.pageItems[1] === gp); }),
            textFrames_doc_identity: safe(function () { return d.textFrames[0] === T || d.textFrames[1] === T; }),
            textFrames_doc_uuid_in: safe(function () { var n = 0, x; for (x = 0; x < d.textFrames.length; x++) { if (d.textFrames[x].uuid === base["TextFrame"]) { n++; } } return n; }),
            pathItems_doc_uuid_in: safe(function () { var n = 0, x; for (x = 0; x < d.pathItems.length; x++) { if (d.pathItems[x].uuid === base["PathItem"]) { n++; } } return n; }),
            compound_pathItems0_typeof_uuid: safe(function () { return typeof C.pathItems[0].uuid; })
        };
        u.steps = steps;

        // uniqueness over everything in the document, and over a duplicated group
        G2 = safe(function () { return G.duplicate(); });
        u.duplicate = {};
        if (typeof G2 === "string") {
            u.duplicate.error = G2;
        } else {
            u.duplicate.typename = G2.typename;
            u.duplicate.groupUuidDiffers = (G2.uuid !== G.uuid);
            u.duplicate.G = G.uuid;
            u.duplicate.G2 = G2.uuid;
            u.duplicate.childCount = [G.pageItems.length, G2.pageItems.length];
            u.duplicate.childPairs = [];
            for (i = 0; i < G.pageItems.length && i < G2.pageItems.length; i++) {
                u.duplicate.childPairs.push({
                    typename: G.pageItems[i].typename,
                    orig: G.pageItems[i].uuid,
                    copy: G2.pageItems[i].uuid,
                    differs: G.pageItems[i].uuid !== G2.pageItems[i].uuid
                });
            }
            u.duplicate.textDup = safe(function () {
                var T2 = T.duplicate();
                return { orig: T.uuid, copy: T2.uuid, differs: T.uuid !== T2.uuid };
            });
        }
        // every item reachable from the layer, counted by uuid
        (function () {
            var seen = {}, dup = [], total = 0, byType = {};
            function walk(it) {
                var x, id, tn = it.typename;
                id = safe(function () { return it.uuid; });
                total++;
                byType[tn] = (byType[tn] || 0) + 1;
                if (seen[id]) { dup.push(id + " (" + tn + ")"); } else { seen[id] = tn; }
                if (tn === "GroupItem") { for (x = 0; x < it.pageItems.length; x++) { walk(it.pageItems[x]); } }
                if (tn === "CompoundPathItem") { for (x = 0; x < it.pathItems.length; x++) { walk(it.pathItems[x]); } }
            }
            for (k = 0; k < L.pageItems.length; k++) { walk(L.pageItems[k]); }
            u.allItems = { total: total, byType: byType, duplicateUuids: dup };
        })();
        u.sampleFormat = base["GroupItem"];
    }

    // ---------------------------------------------------------------- (3) linked
    function partLinked(d, r) {
        var L = d.layers[0];
        var LONG = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam";
        var SHORT = "Short text";
        var p, t1, t2, t3, i;

        function frameInfo(tf) {
            var o = {};
            o.kind = String(tf.kind);
            o.storyFrames = safe(function () { return tf.story.textFrames.length; });
            o.contentsLen = tf.contents.length;
            o.charactersLen = safe(function () { return tf.characters.length; });
            o.textRangeLen = safe(function () { return tf.textRange.length; });
            o.storyLen = safe(function () { return tf.story.textRange.length; });
            o.linesSum = safe(function () { return linesSum(tf); });
            o.nextFrameType = safe(function () { return type(tf.nextFrame); });
            o.prevFrameType = safe(function () { return type(tf.previousFrame); });
            o.nextFrameIsSelf = safe(function () { return tf.nextFrame === tf; });
            o.nextFrameUuid = safe(function () { return tf.nextFrame ? tf.nextFrame.uuid : "<none>"; });
            o.ownUuid = safe(function () { return tf.uuid; });
            o.nextFrameTypename = safe(function () { return tf.nextFrame ? tf.nextFrame.typename : "<none>"; });
            o.prevFrameTypename = safe(function () { return tf.previousFrame ? tf.previousFrame.typename : "<none>"; });
            return o;
        }

        // baselines: unlinked area text and point text
        r.baselineArea = frameInfo(area(L, 700, 50, 120, 40, LONG));
        r.baselinePoint = frameInfo(point(L, 300, 700, LONG));

        // two-frame thread
        p = [L.pathItems.rectangle(600, 50, 120, 40), L.pathItems.rectangle(540, 50, 120, 40), L.pathItems.rectangle(480, 50, 120, 40)];
        t1 = L.textFrames.areaText(p[0]);
        t1.contents = LONG;
        r.beforeLink = frameInfo(t1);
        r.linkApi = "areaText(path, TextOrientation.HORIZONTAL, baseFrame, true)";
        t2 = safe(function () { return L.textFrames.areaText(p[1], TextOrientation.HORIZONTAL, t1, true); });
        if (typeof t2 === "string") {
            r.linkApiError = t2;
            r.linkApi = "t1.nextFrame = t2";
            t2 = safe(function () {
                var f = L.textFrames.areaText(p[1]);
                t1.nextFrame = f;
                return f;
            });
        }
        if (typeof t2 === "string") { r.linkError = t2; return; }
        r.afterLink = { t1: frameInfo(t1), t2: frameInfo(t2) };
        r.sameStory = safe(function () { return t1.story === t2.story; });
        // a story has no uuid (undefined === undefined would say "same"), so threads are grouped by the first frame
        r.storyUuidType = safe(function () { return typeof t1.story.uuid; });
        r.sameFirstFrameUuid = safe(function () { return t1.story.textFrames[0].uuid === t2.story.textFrames[0].uuid; });
        r.storyFramesIdentity = safe(function () {
            return [t1.story.textFrames[0] === t1, t1.story.textFrames[1] === t2, t2.story.textFrames[0] === t1, t2.story.textFrames[1] === t2];
        });
        r.nextPrevIdentity = safe(function () { return [t1.nextFrame === t2, t2.previousFrame === t1]; });
        r.docTextFrames = d.textFrames.length;

        // a thread where the text fits in the first frame: is the empty second frame still linked?
        t1.contents = SHORT;
        r.shortInThread = { t1: frameInfo(t1), t2: frameInfo(t2) };
        t1.contents = LONG;

        // three frames, text fills two of them
        t3 = safe(function () { return L.textFrames.areaText(p[2], TextOrientation.HORIZONTAL, t2, true); });
        if (typeof t3 === "string") { r.t3Error = t3; } else {
            r.threeFrames = { t1: frameInfo(t1), t2: frameInfo(t2), t3: frameInfo(t3) };
            r.threeFramesMiddle = {
                storyFramesAll: [t1.story.textFrames.length, t2.story.textFrames.length, t3.story.textFrames.length],
                nextPrev: [t2.nextFrame !== null, t2.previousFrame !== null]
            };
        }

        // simpler detection candidates, evaluated for every frame
        r.simple = [];
        r.simple.push({ frame: "t1", story: t1.story.textFrames.length > 1, nextOrPrev: (t1.nextFrame !== null) || (t1.previousFrame !== null) });
        r.simple.push({ frame: "t2", story: t2.story.textFrames.length > 1, nextOrPrev: (t2.nextFrame !== null) || (t2.previousFrame !== null) });
        r.simple.push({ frame: "plain area", story: r.baselineArea.storyFrames > 1, nextOrPrev: r.baselineArea.nextFrameType !== "null" || r.baselineArea.prevFrameType !== "null" });
        // path text: a story of one frame?
        r.pathText = safe(function () {
            var pth = L.pathItems.add(), pt;
            pth.setEntirePath([[50, 200], [250, 200]]);
            pt = L.textFrames.pathText(pth);
            pt.contents = "on a path";
            return { kind: String(pt.kind), storyFrames: pt.story.textFrames.length };
        });
        // per frame in doc.textFrames: kind, uuid of the first frame of its story, frames in the story
        r.docTextFramesFirstFrameUuids = safe(function () {
            var o = [], k;
            for (k = 0; k < d.textFrames.length; k++) { o.push([String(d.textFrames[k].kind), d.textFrames[k].story.textFrames[0].uuid, d.textFrames[k].story.textFrames.length]); }
            return o;
        });
    }

    // ---------------------------------------------------------------- (4) overflow
    function partOverflow(d, r) {
        var L = d.layers[0];
        var LONG = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
        var WRAP = "aaa bbb ccc ddd eee fff ggg hhh iii jjj kkk lll mmm nnn ooo ppp qqq rrr sss ttt";
        var ETX = String.fromCharCode(3);
        var i, cases, scans;

        // FITS: text that does not overflow (generous frame 160 x 400). A rule that says
        // "overflow" on any of these is a false positive.
        cases = [
            ["empty", ""], ["one char", "a"], ["one line", "abc def"], ["wrapped", WRAP], ["two paragraphs", "ab\rcd"],
            ["trailing CR", "ab\r"], ["CR only", "\r"], ["two CR", "\r\r"], ["empty paragraph between", "ab\r\rcd"],
            ["leading spaces", "   ab"], ["trailing spaces", "ab   "], ["only spaces", "     "], ["soft break U+0003", "ab" + ETX + "cd"],
            ["tab", "a\tb"], ["wrapped + trailing CR", WRAP + "\r"], ["wrapped, two paragraphs", WRAP + "\r" + WRAP],
            ["double spaces wrap", "aaa  bbb  ccc  ddd  eee  fff  ggg  hhh  iii  jjj  kkk"], ["many CR only", "\r\r\r\r\r\r\r\r"]
        ];
        r.areaFits = [];
        for (i = 0; i < cases.length; i++) {
            (function (label, text) {
                var tfx = area(L, 780, 20, 160, 400, text);
                var v = overflowVerdicts(tfx);
                v.label = label;
                r.areaFits.push(v);
                tfx.remove();
            })(cases[i][0], cases[i][1]);
        }
        log("overflow fits: " + j(r.areaFits));

        // OVERFLOWS: a rule that says "fits" on any of these is a false negative.
        // [label, frame height, text]; frame 100 wide, 14.4 pt lines, so 30 pt = two lines.
        cases = [
            ["LONG in 100x30", 30, LONG], ["LONG in 100x5 (no line fits)", 5, LONG],
            ["empty paragraphs push the tail out", 30, "ab\r\r\r\r\r\rcd"],
            ["first paragraph fits, second overflows", 30, "ab\r" + LONG], ["two paragraphs, tail hidden", 40, WRAP + "\r" + WRAP],
            ["tail of CR only is hidden", 30, "ab\r\r\r\r\r\r\r\r"], ["soft break then overflow", 30, "ab" + ETX + "cd" + ETX + "ef" + ETX + "gh"],
            ["short in 100x30 (fits, control)", 30, "short"]
        ];
        r.areaOverflow = [];
        for (i = 0; i < cases.length; i++) {
            (function (label, h, text) {
                var tfx = area(L, 780, 20, 100, h, text);
                var v = overflowVerdicts(tfx);
                v.label = label;
                v.kind = String(tfx.kind);
                r.areaOverflow.push(v);
                tfx.remove();
            })(cases[i][0], cases[i][1], cases[i][2]);
        }
        log("overflow cases: " + j(r.areaOverflow));

        // EXACT FIT: scan the frame height in 1 pt steps; report each change of the verdict
        function scan(label, text) {
            var h2, tfx, v, last = null, trans = [], key;
            for (h2 = 4; h2 <= 80; h2++) {
                tfx = area(L, 780, 20, 100, h2, text);
                v = overflowVerdicts(tfx);
                key = v.sum + "/" + v.walkVisible + "/" + v.total;
                if (key !== last) { trans.push({ h: h2, sum: v.sum, walkVisible: v.walkVisible, total: v.total, lines: v.lines, spec: v.spec, count: v.count, walk: v.walk }); last = key; }
                tfx.remove();
            }
            return { label: label, transitions: trans };
        }
        scans = [];
        scans.push(scan("WRAP (no trailing CR), frame 100 wide", WRAP));
        scans.push(scan("WRAP + trailing CR", WRAP + "\r"));
        scans.push(scan("two paragraphs, wrapped", "aaa bbb ccc ddd eee fff\rggg hhh iii jjj kkk lll"));
        r.exactFitScan = scans;
        log("overflow scan: " + j(r.exactFitScan));

        // POINT text: a rule must never call it overflow
        r.point = [];
        cases = [["long single line", LONG + LONG + LONG], ["paragraphs", "a\rb\rc"], ["trailing CR", "a\r"], ["empty", ""], ["soft break", "a" + ETX + "b"], ["CR only", "\r"]];
        for (i = 0; i < cases.length; i++) {
            (function (label, text, y) {
                var tfx = point(L, 20, y, text);
                var v = overflowVerdicts(tfx);
                v.label = label;
                v.kind = String(tfx.kind);
                r.point.push(v);
            })(cases[i][0], cases[i][1], 600 - i * 30);
        }

        // PATH text (not asked, recorded: the element rule may meet it)
        r.pathText = safe(function () {
            var pth = L.pathItems.add();
            pth.setEntirePath([[20, 200], [120, 200]]);
            var pt = L.textFrames.pathText(pth);
            var res = {}, v;
            pt.contents = "short";
            v = overflowVerdicts(pt); v.kind = String(pt.kind); res.fits = v;
            pt.contents = LONG + LONG;
            res.overflow = overflowVerdicts(pt);
            return res;
        });
    }

    // ---------------------------------------------------------------- (5) mask
    function describeGroup(G) {
        var o = { clipped: G.clipped, geometricBounds: bnd(G.geometricBounds), visibleBounds: bnd(G.visibleBounds), width: r2(G.width), height: r2(G.height), children: [] };
        var i, c, row;
        for (i = 0; i < G.pageItems.length; i++) {
            c = G.pageItems[i];
            row = { index: i, typename: c.typename, geometricBounds: bnd(c.geometricBounds) };
            if (c.typename === "PathItem") { row.clipping = c.clipping; }
            if (c.typename === "CompoundPathItem") {
                row.clipping = type(c.clipping) === "undefined" ? "<undefined>" : c.clipping;
                row.subpaths = [];
                var k;
                for (k = 0; k < c.pathItems.length; k++) {
                    row.subpaths.push({ clipping: c.pathItems[k].clipping, geometricBounds: bnd(c.pathItems[k].geometricBounds) });
                }
            }
            o.children.push(row);
        }
        return o;
    }
    function partMask(d, r) {
        var L = d.layers[0], G1, G2, content, mask, tf, comp, g, i;

        // (a) PathItem mask: content 500 x 500 at (50..550, 200..700); mask 200 x 200 at (100..300, 400..600)
        G1 = L.groupItems.add();
        content = G1.pathItems.rectangle(700, 50, 500, 500);
        tf = point(G1, 60, 650, "inside");
        mask = G1.pathItems.rectangle(600, 100, 200, 200);
        G1.clipped = true;
        r.pathMask = describeGroup(G1);
        r.pathMask.expectedMaskBounds = [100, 600, 300, 400];
        r.pathMask.maskFoundByClipping = safe(function () {
            var n = [], x;
            for (x = 0; x < G1.pageItems.length; x++) { if (G1.pageItems[x].typename === "PathItem" && G1.pageItems[x].clipping === true) { n.push(x); } }
            return n;
        });
        r.pathMask.maskIsTopmostChild = safe(function () { return G1.pageItems[0] === mask; });
        r.pathMask.groupBoundsEqualMask = safe(function () { return bnd(G1.geometricBounds).join() === bnd(mask.geometricBounds).join(); });
        r.pathMask.groupBoundsEqualContent = safe(function () { return bnd(G1.geometricBounds).join() === bnd(content.geometricBounds).join(); });
        r.pathMask.groupVisibleEqualsMask = safe(function () { return bnd(G1.visibleBounds).join() === bnd(mask.visibleBounds).join(); });
        r.pathMask.textEditable = safe(function () { return tf.editable; });

        // (b) CompoundPathItem mask: outer 200 x 200 (100..300, 400..600), hole 100 x 100, content 500 x 500 below
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
        r.compoundMaskBuild = safe(function () {
            var cnt, c1, c2, cmp, sel;
            cnt = L.pathItems.rectangle(700, 450, 500, 500);
            // two rectangles first, then compound path through the menu command (DOM cannot make one with a mask role)
            c1 = L.pathItems.rectangle(600, 500, 200, 200);
            c2 = L.pathItems.rectangle(550, 550, 100, 100);
            d.selection = [c1, c2];
            app.executeMenuCommand("compoundPath");
            cmp = d.selection[0];
            r.compoundCreated = cmp.typename;
            cmp.zOrder(ZOrderMethod.BRINGTOFRONT);
            d.selection = [cnt, cmp];
            app.executeMenuCommand("makeMask");
            sel = d.selection;
            r.afterMakeMask = { selectionLength: sel.length, typename: sel.length ? sel[0].typename : "<none>" };
            return sel.length ? sel[0] : "no selection";
        });
        g = r.compoundMaskBuild;
        delete r.compoundMaskBuild;
        if (typeof g === "string") { r.compoundMaskError = g; } else {
            r.compoundMask = describeGroup(g);
            r.compoundMask.expectedMaskBounds = [500, 600, 700, 400];
            r.compoundMask.findByTopmost = safe(function () { return g.pageItems[0].typename; });
            r.compoundMask.findByPathItem0Clipping = safe(function () {
                var n = [], x, c;
                for (x = 0; x < g.pageItems.length; x++) {
                    c = g.pageItems[x];
                    if (c.typename === "CompoundPathItem" && c.pathItems.length > 0 && c.pathItems[0].clipping === true) { n.push(x); }
                    if (c.typename === "PathItem" && c.clipping === true) { n.push(x); }
                }
                return n;
            });
            r.compoundMask.maskItemBounds = safe(function () { return bnd(g.pageItems[0].geometricBounds); });
            r.compoundMask.maskUnionOfSubpaths = safe(function () {
                var c = g.pageItems[0], x, b, u = null;
                for (x = 0; x < c.pathItems.length; x++) {
                    b = c.pathItems[x].geometricBounds;
                    if (!u) { u = [b[0], b[1], b[2], b[3]]; } else {
                        u = [Math.min(u[0], b[0]), Math.max(u[1], b[1]), Math.max(u[2], b[2]), Math.min(u[3], b[3])];
                    }
                }
                return bnd(u);
            });
            r.compoundMask.groupBoundsEqualMaskItem = safe(function () { return bnd(g.geometricBounds).join() === bnd(g.pageItems[0].geometricBounds).join(); });
            r.compoundMask.groupBoundsEqualContent = safe(function () { return bnd(g.geometricBounds).join() === bnd(g.pageItems[1].geometricBounds).join(); });
            r.compoundMask.clippedSetFalseError = safe(function () { g.clipped = false; return "no error, clipped=" + g.clipped; });
        }
        d.selection = null;
    }

    // ---------------------------------------------------------------- (6) empty text bounds
    function partEmpty(d, r) {
        var L = d.layers[0], ETX = String.fromCharCode(3), cases, i;
        cases = [
            ["point, contents ''", "point", ""], ["point, contents CR", "point", "\r"], ["point, contents ' '", "point", " "],
            ["point, contents 'a' (control)", "point", "a"], ["point, contents U+0003", "point", ETX], ["point, contents 3 spaces", "point", "   "],
            ["area, contents ''", "area", ""], ["area, contents CR", "area", "\r"], ["area, contents 'a' (control)", "area", "a"]
        ];
        r.rows = [];
        for (i = 0; i < cases.length; i++) {
            (function (label, kind, text) {
                var row = { label: label };
                var tf = (kind === "point") ? point(L, 100, 700 - i * 60, text) : area(L, 700 - i * 60, 300, 120, 40, text);
                row.kind = String(tf.kind);
                row.contentsLen = tf.contents.length;
                row.charactersLen = tf.characters.length;
                row.geometricBounds = bnd(tf.geometricBounds);
                row.visibleBounds = bnd(tf.visibleBounds);
                row.width = r2(tf.width);
                row.height = r2(tf.height);
                row.position = bnd(tf.position);
                row.zeroArea = (row.width === 0 || row.height === 0);
                row.widthZero = (row.width === 0);
                row.heightZero = (row.height === 0);
                r.rows.push(row);
            })(cases[i][0], cases[i][1], cases[i][2]);
        }
        r.docTextFramesAfter = d.textFrames.length;
        r.createdCount = cases.length;
    }

    // ---------------------------------------------------------------- (7) editable
    function partEditable(d, r) {
        var L = d.layers[0], rows = [], i;
        var tp, cg, cgText, cgMask, g1, g2, nestedText, lockedText, hiddenText, lg, lgText, hg, hgText;
        var Lk, Hd, Pr, SubLk, Pr2, SubHd, Pr3, Sub3, LkParent, SubUnder;
        var tfLk, tfHd, tfSubLk, tfSubHd, tfUnderLkParent;

        L.name = "L_plain";
        tp = point(L, 50, 750, "plain"); tp.name = "plain";

        cg = L.groupItems.add(); cg.name = "clipgroup";
        cgText = point(cg, 50, 700, "in clip"); cgText.name = "in clip group";
        cgMask = cg.pathItems.rectangle(720, 40, 200, 60);
        cg.clipped = true;

        g1 = L.groupItems.add(); g1.name = "G1";
        g2 = g1.groupItems.add(); g2.name = "G2";
        nestedText = point(g2, 50, 650, "nested"); nestedText.name = "in nested group";

        lockedText = point(L, 50, 600, "locked itself"); lockedText.name = "(a) locked itself"; lockedText.locked = true;
        hiddenText = point(L, 50, 550, "hidden itself"); hiddenText.name = "(b) hidden itself"; hiddenText.hidden = true;

        lg = L.groupItems.add(); lg.name = "lockedGroup";
        lgText = point(lg, 50, 500, "in locked group"); lgText.name = "(c) in locked group";
        lg.locked = true;

        hg = L.groupItems.add(); hg.name = "hiddenGroup";
        hgText = point(hg, 50, 450, "in hidden group"); hgText.name = "(d) in hidden group";
        hg.hidden = true;

        // layers: each new layer goes to index 0
        Lk = d.layers.add(); Lk.name = "L_locked";
        tfLk = point(Lk, 300, 750, "on locked layer"); tfLk.name = "(e) on locked layer";
        Lk.locked = true;

        Hd = d.layers.add(); Hd.name = "L_hidden";
        tfHd = point(Hd, 300, 700, "on hidden layer"); tfHd.name = "(f) on hidden layer";
        Hd.visible = false;

        Pr = d.layers.add(); Pr.name = "L_parent_unlocked";
        SubLk = Pr.layers.add(); SubLk.name = "sub_locked";
        tfSubLk = point(SubLk, 300, 650, "on locked sublayer"); tfSubLk.name = "(g) on locked sublayer";
        SubLk.locked = true;

        Pr2 = d.layers.add(); Pr2.name = "L_parent2_unlocked";
        SubHd = Pr2.layers.add(); SubHd.name = "sub_hidden";
        tfSubHd = point(SubHd, 300, 600, "on hidden sublayer"); tfSubHd.name = "(h) on hidden sublayer";
        SubHd.visible = false;

        LkParent = d.layers.add(); LkParent.name = "L_locked_parent";
        SubUnder = LkParent.layers.add(); SubUnder.name = "sub_unlocked_under_locked";
        tfUnderLkParent = point(SubUnder, 300, 550, "unlocked sublayer of locked layer"); tfUnderLkParent.name = "(i) unlocked sublayer under locked layer";
        LkParent.locked = true;

        r.counts = { created: 12, docTextFrames: d.textFrames.length };
        for (i = 0; i < d.textFrames.length; i++) {
            (function (tf) {
                var o = {};
                o.name = tf.name;
                o.editable = tf.editable;
                o.typeofEditable = typeof tf.editable;
                o.locked = tf.locked;
                o.hidden = tf.hidden;
                o.parentTypename = tf.parent.typename;
                o.layer = safe(function () { return tf.layer.name; });
                rows.push(o);
            })(d.textFrames[i]);
        }
        r.rows = rows;
        r.summary = { editableFalse: [], editableTrue: [] };
        for (i = 0; i < rows.length; i++) {
            if (rows[i].editable === false) { r.summary.editableFalse.push(rows[i].name); }
            else if (rows[i].editable === true) { r.summary.editableTrue.push(rows[i].name); }
        }
        // unlock everything again so the close does not depend on it (document is discarded anyway)
    }

    // ---------------------------------------------------------------- run
    if (app.documents.length !== 0) { return "PRERUSENO: otevrene dokumenty"; }
    out.app = "Illustrator " + app.version + ", ExtendScript " + $.version + ", locale " + $.locale;
    try { oldUIL = app.userInteractionLevel; } catch (eu) { oldUIL = null; }
    try {
        inDoc("uuid", 800, 800, partUuid);
        inDoc("linked", 800, 800, partLinked);
        inDoc("overflow", 800, 800, partOverflow);
        inDoc("mask", 1000, 1000, partMask);
        inDoc("empty", 800, 800, partEmpty);
        inDoc("editable", 800, 800, partEditable);
    } finally {
        if (oldUIL !== null) { try { app.userInteractionLevel = oldUIL; } catch (ev) { out.notes.push("could not restore userInteractionLevel: " + ev.message); } }
    }
    out.documentsAtEnd = app.documents.length;
    log("done: documents=" + app.documents.length);
    return j(out);
})();
