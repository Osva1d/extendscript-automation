    function makeDoc() { return null; }
    function scenario(w, n, H) {
        var R = w.kitRefs, K = R.K, rows = R.rows, k, r, x, s;
        H.snap(w, "kit " + w.text);
        H.note("osa Soubory " + R.axisFiles + ", osa Cisla " + R.axisNum);
        // Where each row's field (or box) starts, and the label's width.
        for (k in rows) {
            if (!rows.hasOwnProperty(k)) { continue; }
            r = rows[k];
            x = r.field ? H.abs(r.field)[0] : (r.list ? H.abs(r.list)[0] : (r.box ? H.abs(r.box)[0] : H.abs(r.buttons[0])[0]));
            H.note(k + ": pole x " + x + ", popisek " + r.label.size.width + "x" + r.label.size.height +
                ", radek y " + H.abs(r.row)[1] + " v " + r.row.size.height);
        }
        H.note("jednotka mezera " + (rows.gap.unit.bounds.x - (rows.gap.field.bounds.x + rows.gap.field.size.width)) +
            ", pole 7 znaku " + rows.gap.field.size.width + ", 4 znaky " + rows.shortCnt.field.size.width);
        H.note("Vybrat " + rows.tpl.button.size.width + ", cesta " + rows.tpl.field.size.width +
            ", konec cesty " + (H.abs(rows.out.button)[0] + rows.out.button.size.width) +
            ", konec vzoru " + (H.abs(rows.pat.field)[0] + rows.pat.field.size.width) +
            ", konec seznamu " + (H.abs(rows.pdf.list)[0] + rows.pdf.list.size.width));
        H.note("seznam " + rows.pdf.list.selection.text + " chybi " + rows.pdf.list.selection.kitMissing +
            " hodnota " + K.listValue(rows.pdf.list));
        H.note("prazdny measureString " + rows.skip.label.graphics.measureString("")[0] + "x" +
            rows.skip.label.graphics.measureString("")[1]);
        H.note("radio popisek y " + H.abs(rows.dir.label)[1] + ", tlacitko y " + H.abs(rows.dir.buttons[0])[1]);
        H.note("stav " + R.status.size.width + "x" + R.status.size.height + " y " + H.abs(R.status)[1] +
            ", tmave UI " + R.NS.FieldPaint.isDarkUI(R.status.graphics));
        s = "Nejde spustit: chybí cílová složka, vzor pojmenování nemá {n} a předvolba PDF v tomto Illustratoru chybí, takže by se nic neuložilo.";
        K.setStatus(R.status, "ERR", s);
        H.note("stav po textu " + R.status.size.width + "x" + R.status.size.height +
            ", text " + Math.ceil(R.status.graphics.measureString(R.status.text)[0]));
        H.note("paticka copy x " + H.abs(R.foot.copy)[0] + " sirka " + R.foot.copy.size.width +
            ", tlacitka " + H.abs(R.foot.buttons[0])[0] + " az " +
            (H.abs(R.foot.buttons[2])[0] + R.foot.buttons[2].size.width) + ", okno " + w.size.width +
            ", sirky " + R.foot.buttons[0].size.width + "/" + R.foot.buttons[1].size.width + "/" + R.foot.buttons[2].size.width);
        var cut = 0;
        H.walk(w, function (c) {
            if (c.type === "statictext" && c.visible && c.text !== "" && c !== R.status) {
                var m = c.graphics.measureString(c.text)[0];
                if (m > c.size.width + 1) { cut++; H.note("uzke: " + c.text + " " + m + ">" + c.size.width); }
            }
        });
        H.note("orezane popisky: " + cut);
        H.snap(w, "kit po stavu");
    }
