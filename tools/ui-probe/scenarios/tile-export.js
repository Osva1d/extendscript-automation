    function makeDoc() {
        var d = app.documents.add(DocumentColorSpace.CMYK, 2000, 1000);
        var pi = d.placedItems.add();
        pi.file = new File("__OUT__/1x1.png");
        pi.width = 2000; pi.height = 1000; pi.position = [d.artboards[0].artboardRect[0], d.artboards[0].artboardRect[1]];
        return d;
    }
    function scenario(w, n, H) {
        H.snap(w, "otevreni");
        var z = H.find(w, "radiobutton", /^Z.nd$/), m = H.find(w, "radiobutton", /^Ru/);
        H.setRadio(z); H.snap(w, "Zund");
        H.setRadio(m); H.snap(w, "Rucni orez");
    }
