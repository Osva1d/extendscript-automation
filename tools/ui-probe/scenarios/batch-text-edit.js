    function makeDoc() {
        var d = app.documents.add(DocumentColorSpace.CMYK, 1000, 1000);
        var t = d.textFrames.pointText([100, 800]); t.contents = "A1";
        return d;
    }
    function scenario(w, n, H) {
        H.snap(w, "otevreni");
        var dd = null;
        H.walk(w, function (c) { if (!dd && c.type === "dropdownlist" && c.items.length === 3 && c.selection !== null && c.enabled) { dd = c; } });
        if (dd) { try { dd.selection = (dd.selection.index + 1) % 3; H.snap(w, "typ kroku +1"); } catch (e) { H.note("dd: " + e.message); } }
    }
