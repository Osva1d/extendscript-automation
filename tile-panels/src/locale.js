var TP = TP || {};

TP.L = (function () {

    // Detect Illustrator UI language
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {

        en: {
            // --- Script info ---
            SCRIPT_NAME: "Tile Panels",

            // --- Errors ---
            ERR_NO_DOC:             "Open a document before running the script.",
            ERR_CRITICAL:           "Critical error: ",
            ERR_MUST_BE_NUMBER:     "%s must be a number.",
            ERR_OUT_OF_RANGE:       "%s must be between %s and %s.",
            ERR_NO_ARTWORK:         "No artwork found on the artboard.",
            ERR_ARTWORK_TOO_SMALL:  "Artwork is smaller than panel size. No tiling needed.",
            ERR_PANEL_SIZE_INVALID: "Panel width must be greater than zero.",
            ERR_NO_SPLIT_LINES:     "No split lines found on the preview layer.",
            ERR_NO_STORED_PARAMS:   "Could not read stored parameters. Run setup again.",
            ERR_SPLIT_OUT_OF_BOUNDS: "Split line %s is outside artwork bounds and will be ignored.",
            ERR_OVERLAP_TOO_LARGE:  "Overlap (%s mm) must be less than half the smallest panel width (%s mm).",
            ERR_TOO_MANY_ARTBOARDS: "Tiling would create %s artboards (max 1000). Reduce panel count.",
            ERR_ARTBOARD_TOO_LARGE: "Panel %s exceeds Illustrator max artboard size (5765 mm).",

            // --- Phase 1: Setup dialog ---
            TITLE_SETUP:        "Tile Setup",

            PANEL_SOURCE:       "Source artwork",
            LBL_ARTBOARD_SIZE:  "Artboard:",
            LBL_SCALE:          "Scale:  1 :",
            LBL_REAL_SIZE:      "Real size:",

            PANEL_PANEL_SIZE:   "Panel size",
            LBL_MODE_MAX_WIDTH: "Max panel width",
            LBL_MODE_COUNT:     "Panel count",
            LBL_PANEL_WIDTH:    "Max width:",
            LBL_PANEL_HEIGHT:   "Max height:",
            LBL_HEIGHT_HINT:    "(0 = no horizontal splits)",
            LBL_REDISTRIBUTE:   "Redistribute if remainder <",
            LBL_COLUMNS:        "Columns:",
            LBL_ROWS:           "Rows:",
            LBL_ROWS_HINT:      "(1 = no horizontal splits)",

            PANEL_OVERLAP:      "Overlap",
            LBL_OVERLAP:        "Overlap:",
            LBL_OVERLAP_BOTH:   "Both sides",

            PANEL_BLEED:        "Bleed (outer edges)",
            LBL_BLEED_UNIFORM:  "Uniform",
            LBL_BLEED_PER_EDGE: "Per-edge:",
            LBL_BLEED_TOP:      "T:",
            LBL_BLEED_BOTTOM:   "B:",
            LBL_BLEED_LEFT:     "L:",
            LBL_BLEED_RIGHT:    "R:",

            PANEL_OPTIONS:      "Options",
            LBL_KEEP_ORIGINAL:  "Keep original artboard",

            PANEL_PREVIEW:      "Result preview",
            LBL_PREVIEW_GRID:   "%s columns × %s rows = %s panels",
            LBL_PREVIEW_DIMS:   "Panel size: %s mm",
            LBL_PREVIEW_DIMS_DOC: "(%s mm in document)",
            LBL_PREVIEW_REDIST: "(redistributed from %s mm to avoid narrow remainder)",
            LBL_PREVIEW_NO_TILE: "No tiling needed — artwork fits in one panel.",
            LBL_PREVIEW_WARN_COUNT: "Warning: %s panels (Illustrator max is 1000)",

            BTN_PLACE:          "Place Split Lines",
            BTN_CANCEL:         "Cancel",

            // --- Phase 2: Apply dialog ---
            TITLE_APPLY:        "Apply Tiling",
            PANEL_SPLITS:       "Split lines found",
            LBL_SPLITS_V:       "Vertical splits:",
            LBL_SPLITS_H:       "Horizontal splits:",

            PANEL_MARKS:        "Assembly marks",
            LBL_MARK_CROP:      "Crop marks",
            LBL_MARK_LABELS:    "Panel labels (number, size)",
            LBL_MARK_OVERLAP:   "Overlap indicators",
            LBL_MARK_CROSSHAIRS: "Registration crosshairs in overlap zone",

            BTN_APPLY:          "Apply Tiling",

            // --- Marks text ---
            MARK_PANEL_LABEL:   "Panel R%sC%s  |  %s × %s mm  |  %s/%s",
            MARK_JOB_INFO:      "Job: %s  |  Total: %s×%s = %s panels  |  Overlap: %s mm  |  Scale: 1:%s",
            MARK_OVERLAP_LABEL: "← overlap %s mm →",

            // --- Tooltips ---
            TIP_SCALE:          "Document scale factor. All values are entered in real (printed) millimeters. The script converts to document space automatically.",
            TIP_MODE_MAX_WIDTH: "Split artwork into panels of a given maximum width (e.g. printer width limit).",
            TIP_MODE_COUNT:     "Split artwork into a fixed number of equal panels.",
            TIP_PANEL_WIDTH:    "Maximum width of each panel in real mm. Panels may be narrower if redistributed.",
            TIP_PANEL_HEIGHT:   "Maximum height of each panel in real mm. Set to 0 for vertical splits only.",
            TIP_REDISTRIBUTE:   "If the last panel would be narrower than this percentage of the max width, redistribute all panels to equal widths.",
            TIP_COLUMNS:        "Number of vertical panels (columns).",
            TIP_ROWS:           "Number of horizontal panels (rows). Set to 1 for vertical splits only.",
            TIP_OVERLAP:        "Amount of artwork duplicated between adjacent panels for alignment during installation. Value in real mm.",
            TIP_OVERLAP_BOTH:   "When enabled, overlap is split equally to both sides of each seam (half left, half right). When disabled, overlap extends in one direction only (right and down).",
            TIP_BLEED_UNIFORM:  "Single bleed value applied to all outer edges. Value in real mm.",
            TIP_BLEED_PER_EDGE: "Individual bleed values for each outer edge. Values in real mm.",
            TIP_KEEP_ORIGINAL:  "Keep the original artboard alongside the new tiled artboards.",
            TIP_CROP_MARKS:     "L-shaped crop marks at outer corners of each panel artboard.",
            TIP_LABELS:         "Panel identification and real dimensions placed in the slug area outside each artboard.",
            TIP_OVERLAP_IND:    "Dashed line showing where the net panel ends and the overlap zone begins.",
            TIP_CROSSHAIRS:     "Registration crosshair marks in the overlap zone for alignment during installation.",

            // --- Alerts ---
            ALERT_SETUP_DONE:   "Split lines placed. Adjust them as needed, then run the script again to apply tiling.",
            ALERT_APPLY_DONE:   "Tiling complete: %s panels created.",

            // --- Unit ---
            UNIT_MM:  "mm",
            UNIT_PCT: "%"
        },

        cs: {
            // --- Script info ---
            SCRIPT_NAME: "Tile Panels",

            // --- Errors ---
            ERR_NO_DOC:             "Před spuštěním skriptu otevřete dokument.",
            ERR_CRITICAL:           "Kritická chyba: ",
            ERR_MUST_BE_NUMBER:     "%s musí být číslo.",
            ERR_OUT_OF_RANGE:       "%s musí být mezi %s a %s.",
            ERR_NO_ARTWORK:         "Na ploše nebyl nalezen žádný obsah.",
            ERR_ARTWORK_TOO_SMALL:  "Grafika je menší než velikost panelu. Dělení není potřeba.",
            ERR_PANEL_SIZE_INVALID: "Šířka panelu musí být větší než nula.",
            ERR_NO_SPLIT_LINES:     "Na náhledové vrstvě nebyly nalezeny žádné dělicí čáry.",
            ERR_NO_STORED_PARAMS:   "Nelze načíst uložené parametry. Spusťte nastavení znovu.",
            ERR_SPLIT_OUT_OF_BOUNDS: "Dělicí čára %s je mimo hranice grafiky a bude ignorována.",
            ERR_OVERLAP_TOO_LARGE:  "Překryv (%s mm) musí být menší než polovina nejužšího panelu (%s mm).",
            ERR_TOO_MANY_ARTBOARDS: "Dělení by vytvořilo %s plošek (max 1000). Snižte počet panelů.",
            ERR_ARTBOARD_TOO_LARGE: "Panel %s překračuje maximální velikost plochy Illustratoru (5765 mm).",

            // --- Phase 1: Setup dialog ---
            TITLE_SETUP:        "Nastavení dělení",

            PANEL_SOURCE:       "Zdrojová grafika",
            LBL_ARTBOARD_SIZE:  "Plocha:",
            LBL_SCALE:          "Měřítko:  1 :",
            LBL_REAL_SIZE:      "Reálný rozměr:",

            PANEL_PANEL_SIZE:   "Velikost panelu",
            LBL_MODE_MAX_WIDTH: "Max šířka panelu",
            LBL_MODE_COUNT:     "Počet panelů",
            LBL_PANEL_WIDTH:    "Max šířka:",
            LBL_PANEL_HEIGHT:   "Max výška:",
            LBL_HEIGHT_HINT:    "(0 = jen svislé dělení)",
            LBL_REDISTRIBUTE:   "Přerozdělit pokud zbytek <",
            LBL_COLUMNS:        "Sloupce:",
            LBL_ROWS:           "Řádky:",
            LBL_ROWS_HINT:      "(1 = jen svislé dělení)",

            PANEL_OVERLAP:      "Překryv",
            LBL_OVERLAP:        "Překryv:",
            LBL_OVERLAP_BOTH:   "Oboustranný",

            PANEL_BLEED:        "Spadnávka (vnější okraje)",
            LBL_BLEED_UNIFORM:  "Jednotná",
            LBL_BLEED_PER_EDGE: "Po hranách:",
            LBL_BLEED_TOP:      "H:",
            LBL_BLEED_BOTTOM:   "D:",
            LBL_BLEED_LEFT:     "L:",
            LBL_BLEED_RIGHT:    "P:",

            PANEL_OPTIONS:      "Možnosti",
            LBL_KEEP_ORIGINAL:  "Ponechat původní plochu",

            PANEL_PREVIEW:      "Náhled výsledku",
            LBL_PREVIEW_GRID:   "%s sloupců × %s řádků = %s panelů",
            LBL_PREVIEW_DIMS:   "Rozměr panelu: %s mm",
            LBL_PREVIEW_DIMS_DOC: "(%s mm v dokumentu)",
            LBL_PREVIEW_REDIST: "(přerozděleno z %s mm kvůli úzkému zbytku)",
            LBL_PREVIEW_NO_TILE: "Dělení není potřeba — grafika se vejde do jednoho panelu.",
            LBL_PREVIEW_WARN_COUNT: "Varování: %s panelů (max Illustratoru je 1000)",

            BTN_PLACE:          "Umístit dělicí čáry",
            BTN_CANCEL:         "Storno",

            // --- Phase 2: Apply dialog ---
            TITLE_APPLY:        "Použít dělení",
            PANEL_SPLITS:       "Nalezené dělicí čáry",
            LBL_SPLITS_V:       "Svislé dělení:",
            LBL_SPLITS_H:      "Vodorovné dělení:",

            PANEL_MARKS:        "Montážní značky",
            LBL_MARK_CROP:      "Ořezové značky",
            LBL_MARK_LABELS:    "Štítky panelů (číslo, rozměr)",
            LBL_MARK_OVERLAP:   "Indikátory překryvu",
            LBL_MARK_CROSSHAIRS: "Registrační křížky v zóně překryvu",

            BTN_APPLY:          "Použít dělení",

            // --- Marks text ---
            MARK_PANEL_LABEL:   "Panel R%sC%s  |  %s × %s mm  |  %s/%s",
            MARK_JOB_INFO:      "Soubor: %s  |  Celkem: %s×%s = %s panelů  |  Překryv: %s mm  |  Měřítko: 1:%s",
            MARK_OVERLAP_LABEL: "← překryv %s mm →",

            // --- Tooltips ---
            TIP_SCALE:          "Měřítko dokumentu. Všechny hodnoty se zadávají v reálných (tiskových) milimetrech. Skript automaticky přepočítá na dokumentový prostor.",
            TIP_MODE_MAX_WIDTH: "Rozdělit grafiku na panely o dané maximální šířce (např. limit tiskárny).",
            TIP_MODE_COUNT:     "Rozdělit grafiku na pevný počet stejných panelů.",
            TIP_PANEL_WIDTH:    "Maximální šířka panelu v reálných mm. Panely mohou být užší při přerozdělení.",
            TIP_PANEL_HEIGHT:   "Maximální výška panelu v reálných mm. 0 = pouze svislé dělení.",
            TIP_REDISTRIBUTE:   "Pokud by poslední panel byl užší než toto procento max šířky, přerozdělit všechny panely rovnoměrně.",
            TIP_COLUMNS:        "Počet svislých panelů (sloupců).",
            TIP_ROWS:           "Počet vodorovných panelů (řádků). 1 = pouze svislé dělení.",
            TIP_OVERLAP:        "Množství grafiky duplikované mezi sousedními panely pro zarovnání při instalaci. Hodnota v reálných mm.",
            TIP_OVERLAP_BOTH:   "Překryv rozdělen rovnoměrně na obě strany švu (polovina vlevo, polovina vpravo). Při vypnutí se překryv rozšiřuje jen jedním směrem (vpravo a dolů).",
            TIP_BLEED_UNIFORM:  "Jedna hodnota spadnávky aplikovaná na všechny vnější okraje. Hodnota v reálných mm.",
            TIP_BLEED_PER_EDGE: "Individuální hodnoty spadnávky pro každý vnější okraj. Hodnoty v reálných mm.",
            TIP_KEEP_ORIGINAL:  "Ponechat původní plochu vedle nových dělených ploch.",
            TIP_CROP_MARKS:     "Ořezové značky ve tvaru L na vnějších rozích každé plochy panelu.",
            TIP_LABELS:         "Identifikace a reálné rozměry panelu ve slug oblasti mimo plochu.",
            TIP_OVERLAP_IND:    "Čárkovaná čára ukazující kde končí čistý panel a začíná zóna překryvu.",
            TIP_CROSSHAIRS:     "Registrační křížkové značky v zóně překryvu pro zarovnání při instalaci.",

            // --- Alerts ---
            ALERT_SETUP_DONE:   "Dělicí čáry umístěny. Upravte je podle potřeby a poté spusťte skript znovu pro aplikaci dělení.",
            ALERT_APPLY_DONE:   "Dělení dokončeno: %s panelů vytvořeno.",

            // --- Unit ---
            UNIT_MM:  "mm",
            UNIT_PCT: "%"
        }
    };

    var active = strings[lang] || strings["en"];

    // String formatter: TP.L.format(TP.L.TEMPLATE, arg1, arg2, ...)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? args[idx++] : "%s";
        });
    };

    return active;
})();
