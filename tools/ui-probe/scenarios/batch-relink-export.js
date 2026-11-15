    // batch-relink-export 1.3.0: the dialog's states, one window size in all.
    // makeDoc saves its own template (.ai) and one source PDF into __OUT__,
    // so the template, source and output fields can be valid.
    function makeDoc() {
        var src = new Folder("__OUT__/bre-src"), dst = new Folder("__OUT__/bre-vystup");
        if (!src.exists) { src.create(); }
        if (!dst.exists) { dst.create(); }
        var d = app.documents.add(DocumentColorSpace.CMYK, 300, 200);
        d.pathItems.rectangle(-10, 10, 50, 50);
        d.saveAs(new File("__OUT__/bre-src/a.pdf"), new PDFSaveOptions());
        d.saveAs(new File("__OUT__/bre-sablona.ai"), new IllustratorSaveOptions());
        return d;
    }
    function scenario(w, n, H) {
        if (w.text.indexOf("Batch") !== 0) { return; }
        var ets = [];
        H.walk(w, function (c) { if (c.type === "edittext") { ets.push(c); } });
        var T = ets[0], S = ets[1], O = ets[2], P = ets[3];
        function status() {
            var st = null;
            H.walk(w, function (c) { if (!st && c.type === "statictext" && /^[\u2717\u26a0\u2713] /.test(String(c.text))) { st = c; } });
            return st;
        }
        function runBtn() {
            var b = null;
            H.walk(w, function (c) { if (c.type === "button" && c.properties && c.properties.name === "ok") { b = c; } });
            return b;
        }
        function set(f, v) { f.text = v; if (f.onChanging) { f.onChanging(); } }
        function snap(label) {
            H.snap(w, label);
            var s = status();
            H.note(label + ": Spustit " + (runBtn().enabled ? "zive" : "sede") + " | " + (s ? s.text : "(zadny stav)"));
        }
        H.note("fokus v poli zdroje: " + S.active);
        snap("otevreni");
        set(T, ""); set(S, ""); set(O, ""); snap("prazdne");
        set(T, "__OUT__/bre-sablona.ai"); set(S, "__OUT__/bre-src"); set(O, "__OUT__/bre-vystup"); snap("platne");
        set(O, "__OUT__/bre-novy"); snap("upozorneni");
        set(O, "__OUT__/bre-src"); set(P, "bez cisla"); snap("chyba");
        set(P, "{n}_{template}_{source}"); set(O, "__OUT__/bre-vystup"); set(T, "");
        H.click(H.find(w, "button", /aktivn|Active/i)); snap("aktivni dokument");

        // Long status texts against the line, with "Dal\u0161\u00ed chyby: 2." added.
        var s = status() || ets[0], keys = ["ERR_OUTPUT_IS_SOURCE", "WARN_TEMPLATE_UNSAVED", "ERR_ACTIVE_NEVER_SAVED",
            "ERR_NAMING_PATTERN", "WARN_OUTPUT_NEW", "ERR_PDF_PRESET_MISSING", "ERR_OUTPUT_FAIL"];
        for (var i = 0; i < keys.length; i++) {
            var t = "\u2717 " + BRE.L.format(BRE.L[keys[i]], "[Kvalitni tisk]") + " " + BRE.L.format(BRE.L.STATUS_MORE_ERRORS, 2);
            H.note("sirka " + keys[i] + ": " + Math.ceil(s.graphics.measureString(t)[0]) + " / radek " + s.size.width);
        }
        // Any label narrower than its own text.
        H.walk(w, function (c) {
            if (c.type === "statictext" && c.text && !(c.properties && c.properties.truncate)) {
                var m = Math.ceil(c.graphics.measureString(c.text)[0]);
                if (c.size.width < m) { H.note("uzky popisek: '" + c.text + "' " + c.size.width + " < " + m); }
            }
        });
    }
