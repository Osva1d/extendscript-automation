    function makeDoc() { return null; }
    function scenario(w, n, H) {
        H.snap(w, "okno #" + n + " " + w.text);
        if (n === 1) {
            var b = H.find(w, "button", /^Maketa/);
            b.onClick();
        }
        if (w.text.indexOf("maketa") >= 0) {
            var sum = H.find(w, "radiobutton", /^Summa/);
            sum.value = true; sum.onClick(); H.snap(w, "maketa Summa");
            var add = H.find(w, "button", /^\+ P/), g = 0;
            while (add.enabled && g < 10) { add.onClick(); g++; }
            H.snap(w, "maketa 8 vrstev");
            var cut = 0;
            H.walk(w, function (c) {
                if (c.type === "statictext" && c.visible && c.text !== "") {
                    var m = c.graphics.measureString(c.text)[0];
                    if (m > c.size.width + 1) { cut++; H.note("uzke: " + c.text + " " + m + ">" + c.size.width); }
                }
            });
            H.note("orezane popisky: " + cut);
        }
    }
