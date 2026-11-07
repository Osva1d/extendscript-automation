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
    function scenario(w, n, H) {
        H.snap(w, "otevreni #" + n);
        if (n === 1) {
            var z = H.find(w, "radiobutton", /^ZUND/), s = H.find(w, "radiobutton", /^SUMMA/);
            var target = (z && z.value) ? s : z;
            target.value = true; target.onClick();
        } else {
            addAll(w, H, "SUMMA vrstvy");
            var last = null;
            H.walk(w, function (c) { if (c.type === "statictext" && /Ladislav Osvald/.test(c.text)) { last = H.abs(c); } });
            H.note("footer y " + (last ? last[1] : "?"));
        }
    }
