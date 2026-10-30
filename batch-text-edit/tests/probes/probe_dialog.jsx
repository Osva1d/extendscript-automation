// ------------------------------------------------------------------------
// Script:      probe_dialog.jsx
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-10-30
// Description: Dialog probe for Batch Text Edit (Task 12). Builds its own
//              document with 240 prefabs (12 x 20 groups of "{kód}" over
//              "{n}", the builder of probe_scope.jsx), then builds the real
//              BTE.UI dialog WITHOUT showing it, in Czech and in English, and
//              reports: the window size, whether [Výchozí] shows "*" right
//              after opening, the time of every kind of refresh with 240
//              preview rows (a field committed with Enter, selecting a step,
//              Pořadí, Rozsah, adding a step) and of their parts, every
//              statictext, button, checkbox and radio button whose text is
//              wider than its control (graphics.measureString), the widest
//              dropdown item against its control, how wide an unsized
//              statictext lays out against measureString, and whether
//              Použít holds back a preview nobody has seen (BTE.UI.HOLD_MS).
//              When the host makes up the default maximumSize (2^32 - 50 in
//              the session of 2026-10-30), every such maximum is raised to
//              4000 px before the first layout (BTE.UI.firstLayout) and the
//              result says "lifted": true. The preset file is never read or
//              written: Storage.load and save are stubbed. Creates one
//              document and closes only that one, unsaved.
// Usage:       From the repo root, with 0 open documents (it refuses to run
//              otherwise; check with tools/ai-eval.sh -e 'app.documents.length'
//              first):
//                  P=batch-text-edit
//                  { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true;'
//                    for LC in cs_CZ en_US; do
//                      printf 'var BTE_L_%s = (function (app) { var BTE = {};\n' "${LC%%_*}"
//                      cat $P/src/locale.js
//                      printf '\nreturn BTE.L; })({ locale: "%s" });\n' "$LC"
//                    done
//                    cat shared/lib/json2.js $P/src/locale.js $P/src/lib/utils.js shared/lib/ui_state.js
//                    echo 'buildUIState(BTE);'
//                    cat shared/lib/numbers.js; echo 'buildNumbers(BTE);'
//                    cat shared/lib/field_paint.js; echo 'buildFieldPaint(BTE);'
//                    cat $P/src/config.js $P/src/lib/storage.js $P/src/vars.js $P/src/steps.js \
//                        $P/src/order.js $P/src/element.js $P/src/ui_model.js $P/src/scope.js \
//                        $P/src/ui.js $P/tests/probes/probe_dialog.jsx
//                  } > "$TMPDIR/probe_dialog_run.jsx"
//                  tools/ai-eval.sh -t 600 "$TMPDIR/probe_dialog_run.jsx"
//              The header resets BTE, which the engine keeps between runs, so
//              the modules that follow load fresh; the two wrapped copies of
//              locale.js are the Czech and the English table, whatever
//              app.locale is. A run takes a few minutes and the AppleEvent
//              can time out (-1712) before the result comes back; the last
//              line of the progress log then holds it ("done {...}").
//              Optional: var LOG_PATH = "..."; for the progress log (default
//              Folder.temp/bte_probe_dialog.log).
// ------------------------------------------------------------------------
(function () {
    // Never next to the user's work: run only with no document open. The
    // marker is dropped here too, so a refused run leaves nothing to reuse.
    if (app.documents.length !== 0) {
        if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
        return "PRERUSENO: otevrene dokumenty";
    }

    var fresh = (typeof BTE_PROBE_FRESH === "boolean") && BTE_PROBE_FRESH;
    var logPath = (typeof LOG_PATH === "string" && LOG_PATH !== "") ? LOG_PATH : Folder.temp.fsName + "/bte_probe_dialog.log";
    // The engine keeps globals from one run to the next, so every flag is
    // reset once read, and BTE counts only when this run's header reset it.
    if (typeof BTE_PROBE_FRESH === "boolean") { BTE_PROBE_FRESH = false; }
    if (typeof LOG_PATH === "string") { LOG_PATH = ""; }
    var PITCH = 312, CUT = 283, MASK = 290;
    var out = { app: app.version, locale: app.locale, notes: [], saveCalls: 0 };
    var d = null;
    var realLoad = null, realSave = null;

    function now() { return new Date().getTime(); }
    function log(s) {
        var f = new File(logPath);
        f.encoding = "UTF-8";
        if (f.open("a")) { f.writeln(s); f.close(); }
    }
    function hex(n) { var x = n.toString(16); while (x.length < 4) { x = "0" + x; } return x; }
    // Every non-ASCII character escaped, so the AppleEvent result stays ASCII.
    function ascii(s) {
        var r = "", i, code;
        s = String(s);
        for (i = 0; i < s.length; i++) {
            code = s.charCodeAt(i);
            r += (code < 32 || code > 126) ? "\\u" + hex(code) : s.charAt(i);
        }
        return r;
    }
    function j(v) {
        var a = [], k, i;
        if (v === null) { return "null"; }
        if (v === undefined) { return "\"<undefined>\""; }
        if (typeof v === "string") { return "\"" + ascii(v).replace(/"/g, "\\\"") + "\""; }
        if (typeof v === "number" || typeof v === "boolean") { return String(v); }
        if (v instanceof Array) {
            for (i = 0; i < v.length; i++) { a.push(j(v[i])); }
            return "[" + a.join(",") + "]";
        }
        for (k in v) { if (v.hasOwnProperty(k)) { a.push("\"" + k + "\":" + j(v[k])); } }
        return "{" + a.join(",") + "}";
    }
    function circle(container, cx, cy, size) {
        return container.pathItems.ellipse(cy + size / 2, cx - size / 2, size, size);
    }
    function point(container, x, y, text) {
        var tf = container.textFrames.pointText([x, y]);
        tf.contents = text;
        return tf;
    }
    // probe_scope.jsx's builder, mode "group": one group per prefab with a
    // clip group (the graphic), a code text above the centre and a number
    // below it, and a cut circle on the layer.
    function buildSheet(L, cols, rows, H) {
        var n = cols * rows, i, cx, cy, parent, clip;
        for (i = 0; i < n; i++) {
            cx = (i % cols) * PITCH + PITCH / 2;
            cy = H - (Math.floor(i / cols) * PITCH + PITCH / 2);
            parent = L.groupItems.add();
            clip = parent.groupItems.add();
            clip.pathItems.rectangle(cy + PITCH / 2, cx - PITCH / 2, PITCH, PITCH);
            circle(clip, cx, cy, MASK);
            clip.clipped = true;
            point(parent, cx - 30, cy + 35, "{k" + String.fromCharCode(243) + "d}");
            point(parent, cx - 10, cy - 45, "{n}");
            circle(L, cx, cy, CUT);
        }
        app.redraw();
    }

    function size(c) { return c && c.size ? [c.size.width, c.size.height] : null; }
    function stats(list) {
        var s = list.slice().sort(function (a, b) { return a - b; });
        return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1] };
    }
    function timed(fn) {
        var t = now();
        fn();
        return now() - t;
    }
    // What a keystroke and then Enter (or leaving the field) fire.
    function commit(et) {
        et.onChanging();
        et.onChange();
    }

    // Every text control whose text is wider than the control, and the widest
    // dropdown item against its control.
    function clipped(c, acc, drops) {
        var kids = c.children, k, ch, t, tw, cw, box, m, it, widest;
        for (k = 0; k < kids.length; k++) {
            ch = kids[k];
            t = ch.type;
            if ((t === "statictext" || t === "button" || t === "checkbox" || t === "radiobutton") && ch.text !== "") {
                tw = Math.ceil(ch.graphics.measureString(ch.text)[0]);
                cw = ch.size ? ch.size.width : -1;
                // The box of a checkbox or radio button and its gap: ~18 px (not measured here).
                box = (t === "checkbox" || t === "radiobutton") ? 18 : 0;
                if (tw + box > cw) { acc.push({ type: t, text: ascii(ch.text), textW: tw, ctrlW: cw }); }
            }
            if (t === "dropdownlist" && ch.items && ch.items.length > 0) {
                widest = 0;
                for (m = 0; m < ch.items.length; m++) {
                    it = ch.items[m];
                    if (it.text) { widest = Math.max(widest, Math.ceil(ch.graphics.measureString(it.text)[0])); }
                }
                drops.push({ first: ascii(ch.items[0].text), items: ch.items.length, widestItemW: widest, ctrlW: ch.size ? ch.size.width : -1 });
            }
            if (ch.children && ch.children.length > 0) { clipped(ch, acc, drops); }
        }
    }

    // A maximumSize the host made up: 2^32 - 50 (or negative) in the session
    // of 2026-10-30, where $.screens said 756 x 443.
    function broken(n) { return n > 100000 || n < 0; }
    // Every maximum the host made up raised to LIFT px, before the first
    // layout; a maximum the dialog set (lockW) stays. A free maximum is
    // what a working host gives, as far as any size here is concerned.
    var LIFT = 4000;
    function liftMax(el) {
        var m = el.maximumSize, k;
        if (m) {
            if (broken(m.width)) { m.width = LIFT; }
            if (broken(m.height)) { m.height = LIFT; }
            el.maximumSize = m;
        }
        if (el.children) {
            for (k = 0; k < el.children.length; k++) { liftMax(el.children[k]); }
        }
    }
    function hostMax() {
        var w = new Window("dialog", "max");
        var m = w.maximumSize;
        var r = [m.width, m.height];
        w.close();
        return r;
    }

    // How much wider than measureString a statictext lays out on its own.
    function labelPad(texts) {
        var w = new Window("dialog", "pad");
        var res = [], sts = [], i, st;
        for (i = 0; i < texts.length; i++) { sts.push(w.add("statictext", undefined, texts[i])); }
        if (out.lifted) { liftMax(w); }
        w.layout.layout(true);
        for (i = 0; i < sts.length; i++) {
            st = sts[i];
            res.push({ text: ascii(texts[i]), natural: st.size.width, measured: st.graphics.measureString(texts[i])[0] });
        }
        w.close();
        return res;
    }

    function measure(lang, table) {
        var r = { lang: lang };
        var dlg, w, R, S, t, i, k, times, presetItems, sepTypes, dd, labelW, lbW, res;

        BTE.L = table;
        t = now();
        dlg = BTE.UI.build(d);
        r.buildMs = now() - t;
        w = dlg.win;
        R = dlg.refs;
        S = dlg.state;
        w.layout.layout(true);
        r.window = size(w);
        r.parts = {
            steps: size(R.pSteps), preview: size(R.pPrev), stepList: size(R.lbSteps), editor: size(R.colEdit),
            stack: size(R.gStack), previewList: size(R.lbPrev), messages: size(R.etMsgs),
            groups: { replace: size(R.ed.replace.group), number: size(R.ed.number.group), "case": size(R.ed["case"].group) }
        };

        // --- right after open: [Výchozí] without "*" (Task 11 carry) --------
        presetItems = [];
        for (i = 0; i < R.ddPreset.items.length; i++) { presetItems.push(ascii(R.ddPreset.items[i].text)); }
        r.open = {
            kind: S.kind, presetItems: presetItems,
            selected: R.ddPreset.selection ? ascii(R.ddPreset.selection.text) : null,
            revertEnabled: R.btnRevert.enabled, saveEnabled: R.btnSave.enabled,
            step1: ascii(R.lbSteps.items[0].text), step1Checked: R.lbSteps.items[0].checked,
            scopeLine: ascii(R.stScope.text), status: ascii(R.stStatus.text),
            previewRows: R.lbPrev.items.length, okEnabled: R.btnOk.enabled
        };
        r.open.noStar = r.open.selected !== null && r.open.selected.indexOf("*") === -1;

        // --- the Kde list: separator items ---------------------------------
        dd = R.ed.number.dd;
        sepTypes = [];
        for (i = 0; i < dd.items.length; i++) { sepTypes.push(dd.items[i].type + ":" + ascii(dd.items[i].text)); }
        r.whereItems = sepTypes;

        // --- a three-step chain through the real handlers -------------------
        // Step 1 Number {kód} (from [Výchozí]) becomes Replace {kód} -> ABC.
        t = now();
        R.ddType.selection = 0;
        r.chainTypeSwitchMs = now() - t;
        R.ed.replace.etReplace.text = "ABC";
        r.chainTypeReplaceMs = timed(function () { commit(R.ed.replace.etReplace); });
        R.ddAddType.selection = 1;
        r.addNumberMs = timed(function () { R.btnAdd.onClick(); });
        R.ddAddType.selection = 2;
        r.addCaseMs = timed(function () { R.btnAdd.onClick(); });
        R.ed["case"].ddMode.selection = 1;
        r.chain = [];
        for (i = 0; i < R.lbSteps.items.length; i++) { r.chain.push(ascii(R.lbSteps.items[i].text)); }
        r.afterChain = { status: ascii(R.stStatus.text), messages: ascii(R.etMsgs.text), rows: R.lbPrev.items.length,
            row1: R.lbPrev.items.length ? ascii(R.lbPrev.items[0].text + " | " + R.lbPrev.items[0].subItems[0].text + " | " +
                R.lbPrev.items[0].subItems[1].text + " | " + R.lbPrev.items[0].subItems[2].text) : null,
            row240: R.lbPrev.items.length >= 240 ? ascii(R.lbPrev.items[239].subItems[2].text) : null,
            selected: S.sel };

        // --- select step 2 (Number {n}), then time typing in Od --------------
        r.selectStepMs = [];
        r.selectStepMs.push(timed(function () { R.lbSteps.selection = 1; }));
        times = [];
        for (k = 2; k <= 13; k++) {
            R.ed.number.fields.from.text = String(k);
            times.push(timed(function () { commit(R.ed.number.fields.from); }));
        }
        r.typeFrom = stats(times);
        times = [];
        for (k = 0; k < 8; k++) { times.push(timed(function () { dlg.refresh(); })); }
        r.refreshDirect = stats(times);
        // the pure part of a refresh, for comparison
        times = [];
        for (k = 0; k < 8; k++) { times.push(timed(function () { BTE.Steps.run(S.prepared.state, S.steps); })); }
        r.stepsRunOnly = stats(times);
        // where the rest of a refresh goes
        r.parts2 = {
            rows: stats([timed(function () { BTE.UIModel.rows(S.run.states, S.sel); }), timed(function () { BTE.UIModel.rows(S.run.states, S.sel); }), timed(function () { BTE.UIModel.rows(S.run.states, S.sel); })]),
            status: timed(function () { BTE.UIModel.status(S.run, S.steps, S.prepared.skipped, false); }),
            whereItems: timed(function () { BTE.UIModel.whereItems(S.steps[S.sel], S.run.info[S.sel].vars); }),
            itemAccess240: timed(function () { var q, it, items = R.lbPrev.items; for (q = 0; q < 240; q++) { it = items[q]; } }),
            itemsProp240: timed(function () { var q, it; for (q = 0; q < 240; q++) { it = R.lbPrev.items[q]; } }),
            subItemRead240: timed(function () { var q, x, items = R.lbPrev.items; for (q = 0; q < 240; q++) { x = items[q].subItems[2].text; } }),
            subItemSet240: timed(function () { var q, items = R.lbPrev.items; for (q = 0; q < 240; q++) { items[q].subItems[2].text = "x" + q; } }),
            copySteps: timed(function () { BTE.UI.copy(S.steps); }),
            presetEquals: timed(function () { BTE.Utils.presetEquals({ order: "rows", steps: BTE.UI.copy(S.steps) }, { order: "rows", steps: S.steps }); }),
            stepLabels: timed(function () { var q; for (q = 0; q < S.steps.length; q++) { BTE.UIModel.stepLabel(S.steps[q], S.run.info[q], q); } })
        };
        // the control setters a refresh makes, five times each
        function five(fn) { return timed(function () { var q; for (q = 0; q < 5; q++) { fn(q); } }); }
        r.setters5 = {
            statusText: five(function (q) { R.stStatus.text = "x" + q; }),
            statusPaint: five(function () { BTE.FieldPaint.text(R.stStatus, "OK"); }),
            messagesText: five(function (q) { R.etMsgs.text = "m" + q; }),
            okEnabled: five(function (q) { R.btnOk.enabled = (q % 2 === 0); }),
            fieldPaintValid: five(function () { BTE.FieldPaint.field(R.ed.number.fields.from, true); }),
            rowVisible: five(function (q) { R.ed.number.row.visible = (q % 2 === 0); }),
            digitsEnabled: five(function (q) { R.ed.number.fields.digits.enabled = (q % 2 === 0); }),
            stepItemText: five(function (q) { R.lbSteps.items[0].text = "s" + q; }),
            stepItemChecked: five(function (q) { R.lbSteps.items[0].checked = (q % 2 === 0); }),
            presetItemText: five(function (q) { R.ddPreset.items[0].text = "p" + q; }),
            ddSelectionRead: five(function () { var x = R.ed.number.dd.selection; }),
            revertEnabled: five(function (q) { R.btnRevert.enabled = (q % 2 === 0); })
        };
        dlg.refresh();
        // refresh with the same values: nothing to set but the status
        times = [];
        for (k = 0; k < 5; k++) { times.push(timed(function () { dlg.refresh(); })); }
        r.refreshSame = stats(times);
        dlg.refresh();
        // an invalid field: red, Použít off
        R.ed.number.fields.from.text = "1O";
        commit(R.ed.number.fields.from);
        r.invalidFrom = { status: ascii(R.stStatus.text), ok: R.btnOk.enabled, save: R.btnSaveAs.enabled, label2: ascii(R.lbSteps.items[1].text) };
        R.ed.number.fields.from.text = "1";
        commit(R.ed.number.fields.from);
        r.selectStepMs.push(timed(function () { R.lbSteps.selection = 0; }));
        r.selectStepMs.push(timed(function () { R.lbSteps.selection = 2; }));
        r.selectStepMs.push(timed(function () { R.lbSteps.selection = 1; }));

        // --- Pořadí: reorder only -------------------------------------------
        r.orderMs = [];
        R.rbOrder[1].value = true;
        r.orderMs.push(timed(function () { R.rbOrder[1].onClick(); }));
        r.colsRow2 = R.lbPrev.items.length > 1 ? ascii(R.lbPrev.items[1].subItems[2].text) : null;
        R.rbOrder[0].value = true;
        r.orderMs.push(timed(function () { R.rbOrder[0].onClick(); }));

        // --- Rozsah: reads the document again --------------------------------
        R.rbKind[0].value = true;
        r.toSelectionMs = timed(function () { R.rbKind[0].onClick(); });
        r.selectionState = { scopeLine: ascii(R.stScope.text), status: ascii(R.stStatus.text), rows: R.lbPrev.items.length, ok: R.btnOk.enabled };
        R.rbKind[2].value = true;
        r.toDocumentMs = timed(function () { R.rbKind[2].onClick(); });
        r.prepareOnlyMs = timed(function () { BTE.Scope.prepare(d, "document", "rows"); });
        r.afterDocument = { rows: R.lbPrev.items.length, status: ascii(R.stStatus.text) };

        // --- step list labels against the list -------------------------------
        labelW = 0;
        for (i = 0; i < R.lbSteps.items.length; i++) {
            labelW = Math.max(labelW, Math.ceil(R.lbSteps.graphics.measureString(R.lbSteps.items[i].text)[0]));
        }
        lbW = R.lbSteps.size.width;
        r.stepLabels = { widestW: labelW, listW: lbW };
        // a long label: Replace with fields at MAX_FIELD and an error mark
        R.lbSteps.selection = 0;
        R.ed.replace.dd.selection = R.ed.replace.items.length - 2;   // Jiný text…
        R.ed.replace.et.text = "";
        commit(R.ed.replace.et);
        R.ed.replace.etReplace.text = "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW";
        commit(R.ed.replace.etReplace);
        r.longLabel = { text: ascii(R.lbSteps.items[0].text), w: Math.ceil(R.lbSteps.graphics.measureString(R.lbSteps.items[0].text)[0]), listW: lbW,
            fieldShown: R.ed.replace.row.visible };

        // --- the window did not change size through all this ----------------
        w.layout.layout(true);
        r.windowAfter = size(w);

        // --- clipped texts, with every type group laid out -------------------
        r.clipped = [];
        r.dropdowns = [];
        clipped(w, r.clipped, r.dropdowns);

        // --- Použít: a preview nobody has seen is shown, not applied ----------
        R.lbSteps.selection = 0;
        R.ed.replace.dd.selection = 0;   // back to {kód}: the chain can apply again
        R.lbSteps.selection = 1;
        r.hold = { okBefore: R.btnOk.enabled };
        R.ed.number.fields.from.text = "7";
        R.ed.number.fields.from.onChanging();   // typed, not committed
        R.btnOk.onClick();
        r.hold.typedThenOk = { closed: dlg.result() !== null, after: R.lbPrev.items.length ? ascii(R.lbPrev.items[0].subItems[1].text) : null };
        R.ed.number.fields.from.text = "8";
        commit(R.ed.number.fields.from);       // Enter: onChange, then Použít at once
        R.btnOk.onClick();
        r.hold.enterThenOk = { closed: dlg.result() !== null, after: R.lbPrev.items.length ? ascii(R.lbPrev.items[0].subItems[1].text) : null };
        $.sleep(BTE.UI.HOLD_MS + 100);
        R.btnOk.onClick();                      // the preview has been seen: applies
        res = dlg.result();
        r.hold.laterOk = res === null ? null : {
            scope: res.scope, order: res.order, steps: res.steps.length, states: res.run.states.length,
            rows: res.run.states[0].length, elements: res.prepared.elements.length, tfs: res.prepared.tfs.length,
            row1: ascii(res.run.states[res.run.states.length - 1][0].join(" | ")),
            sameRun: res.run === S.run
        };
        r.saveCallsAfterOk = out.saveCalls;
        if (res === null) { w.close(); }
        return r;
    }

    if (!fresh || typeof BTE === "undefined" || !BTE.UI || typeof BTE_L_cs === "undefined" || typeof BTE_L_en === "undefined") {
        return "probe_dialog: run it behind the header in Usage (resets BTE, sets BTE_PROBE_FRESH, the two locale tables, then the modules)";
    }
    log("start " + new Date() + ", documents=" + app.documents.length);
    var realFirst = BTE.UI.firstLayout;
    try {
        realLoad = BTE.Storage.load;
        realSave = BTE.Storage.save;
        BTE.Storage.load = function () { return BTE.Storage.fresh(); };
        BTE.Storage.save = function () { out.saveCalls++; return true; };
        out.screens = [$.screens[0].left, $.screens[0].top, $.screens[0].right, $.screens[0].bottom];
        out.hostMaxDefault = hostMax();
        out.lifted = broken(out.hostMaxDefault[0]) || broken(out.hostMaxDefault[1]);
        if (out.lifted) {
            BTE.UI.firstLayout = function (w) {
                liftMax(w);
                realFirst(w);
            };
        }

        d = app.documents.add(DocumentColorSpace.RGB, 12 * PITCH, 20 * PITCH);
        out.buildDocMs = timed(function () { buildSheet(d.layers[0], 12, 20, 20 * PITCH); });
        d.selection = null;
        out.texts = d.textFrames.length;
        log("document built: " + out.texts + " texts");

        out.pad = labelPad(["Opakovat:", "Znovu po:", "Restart after:", "Nahradit:", "Replace with:", "Od:"]);
        out.cs = measure("cs", BTE_L_cs);
        log("cs " + j(out.cs));
        out.en = measure("en", BTE_L_en);
        log("en " + j(out.en));
    } catch (e) {
        out.FAILED = e.message + " (line " + e.line + ")";
        log("FAILED " + out.FAILED);
    } finally {
        BTE.UI.firstLayout = realFirst;
        if (realLoad) { BTE.Storage.load = realLoad; }
        if (realSave) { BTE.Storage.save = realSave; }
        if (d) {
            try { d.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) { out.notes.push("close failed: " + e2.message); }
        }
    }
    out.documentsAtEnd = app.documents.length;
    log("done " + j(out));
    return j(out);
})();
