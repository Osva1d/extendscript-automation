#target illustrator
// ------------------------------------------------------------------------
// Script:      specimen_ui.jsx
// Version:     1.0.1
// Author:      Ladislav Osvald
// Updated:     2026-11-07
// Description: Component specimen for the family design system (spec
//              docs/specs/2026-11-07-ui-design-system.md). Shows the proposed
//              ScriptUI components in Illustrator so they can be judged by eye
//              in every UI brightness, and a non-functional mock of the
//              two-column Zünd & Summa Marks dialog. Touches no document, no
//              preset file and no preference.
// Usage:       File > Scripts > Other Script…, once per UI brightness
//              (Preferences > User Interface). Close with Hotovo or Esc.
// ------------------------------------------------------------------------
(function () {
    // Status colours: today's single set, and the proposed set per brightness.
    var PAL = {
        now:   { ERR: [0.90, 0.20, 0.20], WARN: [0.96, 0.60, 0.38], OK: [0.36, 0.60, 0.34] },
        dark:  { ERR: [1.00, 0.71, 0.69], WARN: [1.00, 0.78, 0.40], OK: [0.60, 0.88, 0.58] },
        light: { ERR: [0.52, 0.03, 0.03], WARN: [0.40, 0.23, 0.00], OK: [0.05, 0.31, 0.09] }
    };
    var SYMBOL = { ERR: "✗", WARN: "⚠", OK: "✓" };
    var COPY = "© 2025–2026 Ladislav Osvald · specimen 1.0.1";
    var TIGHT = 5;
    var AXIS = 170;   // label axis of this specimen; a real tool measures its longest label

    function background(ctrl) {
        var g = ctrl.graphics;
        try { return g.newBrush(g.BrushType.THEME_COLOR, "background").color; } catch (e) { return null; }
    }
    function proposed(ctrl) {
        var c = background(ctrl);
        return (c && (c[0] + c[1] + c[2]) / 3 < 0.5) ? PAL.dark : PAL.light;
    }
    function pen(ctrl, rgb) {
        var g = ctrl.graphics;
        g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, rgb.concat([1]), 1);
    }
    function font(ctrl, style) {
        var f = ctrl.graphics.font;
        ctrl.graphics.font = ScriptUI.newFont(f.name, style, f.size);
    }
    function lock(ctrl, w) {
        ctrl.preferredSize.width = w;
        ctrl.minimumSize.width = w;
        ctrl.maximumSize.width = w;
    }
    function row(parent, label) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];
        g.alignChildren = ["left", "center"];
        var st = g.add("statictext", undefined, label);
        lock(st, AXIS);
        return g;
    }
    function numberRow(parent, label, value, unit) {
        var g = row(parent, label);
        var inner = g.add("group");
        inner.spacing = TIGHT;
        inner.alignChildren = ["left", "center"];
        var et = inner.add("edittext", undefined, value);
        et.characters = 7;
        if (unit) { inner.add("statictext", undefined, unit); }
        return et;
    }
    function panel(parent, title) {
        var p = parent.add("panel", undefined, title);
        p.alignChildren = ["fill", "top"];
        return p;
    }
    function statusLine(parent) {
        var st = parent.add("statictext", undefined, "");
        st.alignment = ["fill", "top"];
        return st;
    }
    function setStatus(st, kind, text) {
        st.text = SYMBOL[kind] + " " + text;
        pen(st, proposed(st)[kind]);
    }
    function footer(w, buttons) {
        var g = w.add("group");
        g.alignment = ["fill", "top"];
        g.alignChildren = ["left", "center"];
        var st = g.add("statictext", undefined, COPY);
        st.enabled = false;
        st.alignment = ["left", "center"];
        var b = g.add("group");
        b.alignment = ["right", "center"];
        var out = {}, i;
        for (i = 0; i < buttons.length; i++) {
            out[buttons[i][0]] = b.add("button", undefined, buttons[i][1], buttons[i][2] || {});
        }
        return out;
    }

    // ---------------------------------------------------------------------
    // Mock: Zünd & Summa Marks in two columns. One window, one size; a value
    // that does not apply goes grey instead of going away.
    // ---------------------------------------------------------------------
    function showMock() {
        var w = new Window("dialog", "Zünd & Summa Marks — maketa rozložení");
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];

        var cols = w.add("group");
        cols.orientation = "row";
        cols.alignChildren = ["fill", "fill"];
        cols.alignment = ["fill", "top"];
        var L = cols.add("group");
        L.orientation = "column";
        L.alignChildren = ["fill", "top"];
        var R = cols.add("group");
        R.orientation = "column";
        R.alignChildren = ["fill", "top"];

        var pPreset = panel(L, "Předvolby");
        var r1 = pPreset.add("group");
        r1.alignment = ["fill", "top"];
        r1.add("statictext", undefined, "Předvolba:");
        var ddP = r1.add("dropdownlist", undefined, ["[Výchozí]", "Banner role"]);
        ddP.selection = 0;
        ddP.alignment = ["fill", "center"];
        var gRv = r1.add("group");
        gRv.alignment = ["right", "center"];
        lock(gRv.add("button", undefined, "↺"), 30);
        var r2 = pPreset.add("group");
        r2.alignment = ["right", "top"];
        r2.add("button", undefined, "Výchozí");
        r2.add("button", undefined, "Uložit");
        r2.add("button", undefined, "Uložit jako…");
        r2.add("button", undefined, "Smazat");

        var pMode = panel(L, "Režim a zdroj");
        var gMode = row(pMode, "Režim:");
        var rbZ = gMode.add("radiobutton", undefined, "Zünd");
        var rbS = gMode.add("radiobutton", undefined, "Summa");
        rbZ.value = true;
        var gSrc = row(pMode, "Zdroj:");
        var rbA = gSrc.add("radiobutton", undefined, "Dle grafiky");
        var rbF = gSrc.add("radiobutton", undefined, "Dle artboardu");
        rbA.value = true;
        numberRow(pMode, "Měřítko kresby 1:", "1", "");

        var pGeo = panel(L, "Značky a mezery");
        var etGap = numberRow(pGeo, "Mezera od grafiky:", "5", "mm");
        numberRow(pGeo, "Mezera od okraje:", "5", "mm");
        numberRow(pGeo, "Max. rozteč značek:", "500", "mm");
        var szStack = pGeo.add("group");
        szStack.orientation = "stack";
        szStack.alignment = ["fill", "top"];
        var gSzZ = szStack.add("group");
        gSzZ.alignment = ["fill", "top"];
        numberRow(gSzZ, "Průměr značky:", "5", "mm");
        var gSzS = szStack.add("group");
        gSzS.alignment = ["fill", "top"];
        numberRow(gSzS, "Strana značky:", "3", "mm");
        gSzS.visible = false;
        var etOri = numberRow(pGeo, "Mezera k orientační značce:", "10", "mm");
        var gCol = row(pGeo, "Barva značek:");
        var ddC = gCol.add("dropdownlist", undefined, ["[Registrační]", "Cut", "Spot 1"]);
        ddC.selection = 0;
        ddC.preferredSize.width = 150;

        var pLay = panel(R, "Přiřazení vrstev k barvám");
        var cbOnly = pLay.add("checkbox", undefined, "Jen značky (neměnit vrstvy)");
        var head = pLay.add("group");
        head.alignChildren = ["left", "center"];
        lock(head.add("statictext", undefined, "Vrstva"), 170);
        lock(head.add("statictext", undefined, "Barva"), 150);
        var slots = [], MAX = 5, shown = 2, i;
        // "Marks only" greys the mapping, as Zünd & Summa Marks does
        // (applyMarksOnlyState); the rows keep their place.
        function fillSlots() {
            var on = cbOnly.value;
            for (var k = 0; k < MAX; k++) {
                slots[k].group.visible = (k < shown);
                slots[k].group.enabled = !on;
                slots[k].minus.enabled = (shown > 1);
            }
            head.enabled = !on;
            btnAdd.enabled = !on && (shown < MAX);
        }
        cbOnly.onClick = fillSlots;
        for (i = 0; i < MAX; i++) {
            (function () {
                var g = pLay.add("group");
                g.alignChildren = ["left", "center"];
                var a = g.add("dropdownlist", undefined, ["Cut", "Crease", "Spot 1", "Graphics"]);
                a.selection = 0;
                lock(a, 170);
                var b = g.add("dropdownlist", undefined, ["Cut", "Crease", "Spot 1"]);
                b.selection = 0;
                lock(b, 150);
                var m = g.add("button", undefined, "−");
                lock(m, 30);
                m.onClick = function () { shown--; fillSlots(); };
                slots.push({ group: g, minus: m });
            })();
        }
        var btnAdd = pLay.add("button", undefined, "+ Přidat");
        btnAdd.alignment = ["left", "top"];
        btnAdd.onClick = function () { shown++; fillSlots(); };
        fillSlots();

        var pFeed = panel(R, "Role (jen Summa)");
        var etT = numberRow(pFeed, "Horní výjezd:", "100", "mm");
        var etB = numberRow(pFeed, "Spodní nájezd:", "50", "mm");
        var cbRed = pFeed.add("checkbox", undefined, "Přidat ořezové linky");

        var status = statusLine(w);
        var btns = footer(w, [["c", "Storno", { name: "cancel" }], ["o", "Generovat", { name: "ok" }]]);
        function sync() {
            var z = rbZ.value;
            gSrc.enabled = z;
            etGap.parent.parent.enabled = z;
            etOri.parent.parent.enabled = z;
            gSzZ.visible = z;
            gSzS.visible = !z;
            pFeed.enabled = !z;
            setStatus(status, "OK", "Připraveno: grafika 800 × 800 mm, režim " + (z ? "Zünd" : "Summa") + ".");
        }
        rbZ.onClick = sync;
        rbS.onClick = sync;
        sync();
        btns.o.onClick = function () { w.close(0); };
        w.show();
    }

    // ---------------------------------------------------------------------
    // A window with a single button named "ok": does Esc close it?
    // ---------------------------------------------------------------------
    function showCloseOnly() {
        var w = new Window("dialog", "Test Esc");
        w.alignChildren = ["fill", "top"];
        w.add("statictext", undefined, "Zkuste Esc, potom Enter. Co okno zavře?");
        var g = w.add("group");
        g.alignment = ["right", "top"];
        g.add("button", undefined, "Zavřít", { name: "ok" });
        w.show();
    }

    // ---------------------------------------------------------------------
    // Specimen
    // ---------------------------------------------------------------------
    var w = new Window("dialog", "Specimen komponent v1.0.1");
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];

    var cols = w.add("group");
    cols.orientation = "row";
    cols.alignChildren = ["fill", "fill"];
    cols.alignment = ["fill", "top"];
    var left = cols.add("group");
    left.orientation = "column";
    left.alignChildren = ["fill", "top"];
    var right = cols.add("group");
    right.orientation = "column";
    right.alignChildren = ["fill", "top"];

    // 1 Buttons
    var pB = panel(left, "1 Tlačítka");
    var b1 = pB.add("group");
    b1.add("button", undefined, "Vedlejší");
    b1.add("button", undefined, "Uložit jako…");
    var bDis = b1.add("button", undefined, "Šedé");
    bDis.enabled = false;
    b1.add("button", undefined, "Smazat");
    var b2 = pB.add("group");
    var glyphs = ["↺", "+", "−", "↑", "↓"], gi;
    for (gi = 0; gi < glyphs.length; gi++) { lock(b2.add("button", undefined, glyphs[gi]), 30); }
    var b3 = pB.add("group");
    var bRed = b3.add("button", undefined, "Červené pero");
    pen(bRed, [0.85, 0.15, 0.15]);
    var bBold = b3.add("button", undefined, "Tučně");
    font(bBold, "BOLD");

    // 2 Fields
    var pF = panel(left, "2 Pole");
    var etFirst = numberRow(pF, "Číselné pole:", "12,5", "mm");
    var etBad = numberRow(pF, "Neplatná hodnota:", "2,5x", "mm");
    pen(etBad, proposed(etBad).ERR);
    var etOff = numberRow(pF, "Šedé pole:", "10", "mm");
    etOff.enabled = false;
    var gPath = row(pF, "Cílová složka:");
    gPath.alignChildren = ["fill", "center"];
    var etPath = gPath.add("edittext", undefined, "/Volumes/Zakazky/2026/banner");
    etPath.characters = 26;
    var gBr = gPath.add("group");
    gBr.alignment = ["right", "center"];
    gBr.add("button", undefined, "Vybrat…");

    // 3 Choices
    var pC = panel(left, "3 Volby");
    var gCb = row(pC, "");
    gCb.add("checkbox", undefined, "Přeskočit hotové výstupy");
    var gCb2 = row(pC, "");
    var cbOff = gCb2.add("checkbox", undefined, "Šedá volba");
    cbOff.enabled = false;
    var gRb = row(pC, "Směr:");
    var rb1 = gRb.add("radiobutton", undefined, "Svisle");
    gRb.add("radiobutton", undefined, "Vodorovně");
    rb1.value = true;
    var gDd = row(pC, "PDF preset:");
    var ddPdf = gDd.add("dropdownlist", undefined, ["[Kvalitní tisk]", "Starý preset  (chybí)"]);
    ddPdf.selection = 0;
    ddPdf.preferredSize.width = 200;

    // 4 Type
    var pT = panel(left, "4 Písmo");
    pT.add("statictext", undefined, "Běžný text 1234 × 567 mm");
    var tB = pT.add("statictext", undefined, "Tučně přes BOLD 1234 × 567 mm");
    font(tB, "BOLD");
    var tb = pT.add("statictext", undefined, "Tučně přes Bold 1234 × 567 mm");
    font(tb, "Bold");
    var tG = pT.add("statictext", undefined, "Šedý řádek: co skript našel v dokumentu");
    tG.enabled = false;

    // 5 Status colours
    var pS = panel(right, "5 Stavové barvy");
    var bg = background(pS);
    var info = pS.add("statictext", undefined, "Pozadí UI: " + (bg ? Math.round(bg[0] * 1000) / 1000 : "?") +
        "  ·  sada: " + (proposed(pS) === PAL.dark ? "tmavá" : "světlá"));
    info.enabled = false;
    var kinds = ["ERR", "WARN", "OK"];
    var texts = { ERR: "Nejde spustit: 2 chyby, viz níže.", WARN: "Připraveno, 1 upozornění níže.", OK: "Připraveno k exportu: 6 plátů, 1:10." };
    function colourRows(title, set) {
        var h = pS.add("statictext", undefined, title);
        h.enabled = false;
        for (var i = 0; i < kinds.length; i++) {
            var st = pS.add("statictext", undefined, SYMBOL[kinds[i]] + " " + texts[kinds[i]]);
            pen(st, set[kinds[i]]);
        }
    }
    colourRows("Dnes", PAL.now);
    colourRows("Návrh", proposed(pS));

    // 6 Tabs
    var pTab = panel(right, "6 Záložky (tabbedpanel, dnes nikde)");
    var tp = pTab.add("tabbedpanel");
    tp.alignment = ["fill", "top"];
    var t1 = tp.add("tab", undefined, "Zünd");
    t1.add("statictext", undefined, "Obsah první záložky");
    var t2 = tp.add("tab", undefined, "Summa");
    t2.add("statictext", undefined, "Obsah druhé záložky");
    tp.selection = t1;

    // 7 Keyboard
    var pK = panel(right, "7 Klávesnice a dotazy");
    var kHelp = pK.add("statictext", undefined,
        "Po otevření hned pište: kam padl text? Pak Tab po oknech.", { multiline: true });
    kHelp.preferredSize.width = 380;
    var kBtns = pK.add("group");
    var bEsc = kBtns.add("button", undefined, "Okno jen se Zavřít…");
    var bCnf = kBtns.add("button", undefined, "Dotaz na přepsání…");
    var bMock = pK.add("button", undefined, "Maketa ZSM ve dvou sloupcích…");
    bMock.alignment = ["left", "top"];
    bEsc.onClick = showCloseOnly;
    bCnf.onClick = function () {
        confirm("V cílové složce už jsou 3 soubory se stejným názvem. Přepsat je?");
    };
    bMock.onClick = showMock;

    var status = statusLine(w);
    setStatus(status, "OK", "Stavový řádek: jedna věta, přímo nad tlačítky.");
    var bt = footer(w, [["c", "Storno", { name: "cancel" }], ["o", "Hotovo", { name: "ok" }]]);
    bt.o.onClick = function () { w.close(1); };
    w.show();
})();
