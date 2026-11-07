    function makeDoc() {
        var d = app.documents.add(DocumentColorSpace.CMYK, 1000, 1000);
        var r = d.pathItems.rectangle(900, 100, 800, 800);
        r.filled = true; r.stroked = false;
        return d;
    }
    function addAll(w, H, label) {
        var add = H.find(w, "button", /^\+ P/);
        var guard = 0;
        while (add && add.enabled && guard < 10) { H.click(add); guard++; H.snap(w, label + ", po pridani " + guard); }
    }
    function toggleMode(w, H) {
        var z = H.find(w, "radiobutton", /^ZUND/), s = H.find(w, "radiobutton", /^SUMMA/);
        var target = (z && z.value) ? s : z;
        target.value = true; target.onClick();
    }
    function footer(w, H) {
        var last = null;
        H.walk(w, function (c) { if (c.type === "statictext" && /Ladislav Osvald/.test(c.text)) { last = H.abs(c); } });
        H.note("footer y " + (last ? last[1] : "?"));
    }
    // #1 the first mode as it opens; #2 the other mode, rows added up to the
    // limit; #3 the first mode again, opened with those rows, then one row
    // removed and added back (the relayout path).
    function scenario(w, n, H) {
        H.snap(w, "otevreni #" + n);
        if (n === 1) {
            toggleMode(w, H);
        } else if (n === 2) {
            addAll(w, H, "#2 vrstvy");
            footer(w, H);
            toggleMode(w, H);
        } else {
            var rm = H.find(w, "button", /^\u2212$/);
            if (rm && rm.enabled) { H.click(rm); H.snap(w, "#3 po odebrani"); }
            addAll(w, H, "#3 vrstvy");
            footer(w, H);
        }
    }
