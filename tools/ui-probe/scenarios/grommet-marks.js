    function makeDoc() {
        var d = app.documents.add(DocumentColorSpace.CMYK, 2000, 1000);
        var r = d.pathItems.rectangle(900, 100, 1800, 800);
        r.filled = false; r.stroked = true;
        d.selection = [r];
        return d;
    }
    function scenario(w, n, H) {
        var snap = H.snap, find = H.find;
        snap(w, "otevreni");
        var art = find(w, "radiobutton", /^Hrany/), path = find(w, "radiobutton", /^Vybran/);
        var mt = find(w, "checkbox", /^horn/), ml = find(w, "checkbox", /^levou/);
        H.setRadio(path); snap(w, "cesta");
        H.setRadio(art); snap(w, "hrany");
        if (mt && ml) {
            mt.value = true; H.click(mt); ml.value = true; H.click(ml); snap(w, "hrany, zrcadleni oboje");
            mt.value = false; H.click(mt); snap(w, "hrany, bez horni-dolni");
            ml.value = false; H.click(ml); snap(w, "hrany, bez zrcadleni");
        } else { H.note("mirror checkboxes not found"); }
    }
