// ------------------------------------------------------------------------
// Module: GM.L — localization (EN/CS string tables)
// Part of: Illustrator Grommet Marks
// Depends on: (none — self-contained IIFE)
// ------------------------------------------------------------------------
var GM = GM || {};

GM.L = (function () {
    // Detect Illustrator UI language
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // Sentinel display strings
            PRESET_DEFAULT: "[Default]",

            // Units
            UNIT_MM: "Millimeters",
            UNIT_CM: "Centimeters",
            UNIT_IN: "Inches",

            // Edges panel
            EDGES_PANEL: "Edges",
            EDGE_TOP: "Top",
            EDGE_LEFT: "Left",
            EDGE_BOTTOM: "Bottom",
            EDGE_RIGHT: "Right",
            OFFSET_X: "Offset X:",
            OFFSET_Y: "Offset Y:",

            // Edge labels
            TOP: "Top",
            LEFT: "Left",
            BOTTOM_MIRROR: "Mirror top",
            RIGHT_MIRROR: "Mirror left",

            // Edge fields
            COUNT: "Count:",
            SPACING: "Spacing:",
            EDGE_COUNT_HDR: "Count",
            EDGE_SPACING_HDR: "Spacing",
            OFFSET_LABEL: "Edge offset:",
            MIRROR_GROUP_LABEL: "Mirror:",
            MIRROR_TOP: "top ↓ bottom",
            MIRROR_LEFT: "left → right",
            MIRROR_TOP_ACTIVE: "mirrors top",
            MIRROR_LEFT_ACTIVE: "mirrors left",

            // Mark panel
            MARK_PANEL: "Mark",
            UNIT_LABEL: "Units:",
            TIP_UNITS: "Units for offsets, spacing and mark size. Stroke weights are always in points.",
            SIZE_LABEL: "Size:",
            MARK_SHAPE_LABEL: "Shape:",
            MARK_CIRCLE: "Circle",
            MARK_CROSS: "Cross",
            REG_WEIGHT: "Reg. stroke (pt):",
            HALO_WEIGHT: "White halo (pt):",
            TIP_MARK_SHAPE: "Mark shape — circle, cross, or both (registration over a white halo).",
            TIP_REG_WEIGHT: "Registration stroke weight in points (overprints).",
            TIP_HALO_WEIGHT: "White halo (knockout) stroke weight in points — keeps the mark legible on artwork.",

            // Placement panel
            PLACEMENT_PANEL: "Placement",
            MODE_ARTBOARD: "Artboard edges",
            MODE_PATH: "Selected path",

            // Drawing scale 1:N (spec 4) — dialog values are real-world size; the
            // document remembers the scale. SCALE_FIELD names the field in a reason.
            SCALE_LABEL: "Drawing scale 1:",
            TIP_SCALE: "The scale the document is drawn at: 1:10 means the artwork is ten times smaller than the real thing. The document remembers it. Every value in the dialog is entered at real-world size, mark size and stroke weights included.",
            SCALE_FIELD: "Drawing scale",

            // Path panel
            PATH_PANEL: "Path",
            PATH_INFO_CLOSED: "Closed path",
            PATH_INFO_OPEN: "Open path",
            PATH_INFO_NO_CORNERS: "no corners",
            PATH_INFO_LENGTH: "perimeter ≈ %s %s",
            TIP_PATH_COUNT_DISABLED: "On a path with corners the count is dictated by the corners — marks land on the corners only.",
            TIP_PATH_COUNT_PARTIAL: "With only part of the outline, marks follow the spacing — a count would give just the ends and the corners.",

            // Corner zones panel
            ZONES_PANEL: "Corner zones",
            ZONES_ENABLE: "Densify at corners",
            ZONES_COUNT: "Count:",
            ZONES_PITCH: "Spacing:",
            ZONES_FIRST: "— first",
            ZONES_MARKS_PITCH: "marks, spacing",
            TIP_ZONES: "First N marks from every corner use this spacing; the rest uses the edge/path spacing.",
            TIP_ZONES_NO_CORNERS: "The selected path has no corners — marks are distributed evenly along the whole perimeter.",
            TIP_ZONES_CORNERS_ONLY: "With Count selected on a path with corners, marks sit on the corners only and zones have nothing to densify. Choose Spacing to use zones.",
            TIP_COUNT_ZONES: "With corner zones on, the edge is filled by spacing and Count is not used.",

            // Settings panel
            SETTINGS_PANEL: "Presets",
            LOAD: "Load:",
            DELETE: "Delete",
            SAVE: "Save",
            BTN_SAVE_AS: "Save As…",
            TIP_SAVE_AS: "Save current settings as a new preset.",
            TIP_DELETE: "Delete the selected preset.",
            TIP_REVERT: "Discard unsaved changes and reload the selected preset.",
            PROMPT_SAVE_AS: "Name of the new preset:",

            // Buttons
            OK: "Generate",
            CANCEL: "Cancel",

            // Tooltips
            TIP_OFFSET_X: "Distance of mark centers from left and right artboard edges",
            TIP_OFFSET_Y: "Distance of mark centers from top and bottom artboard edges",
            TIP_COUNT: "Fixed number of marks per edge (spacing is calculated)",
            TIP_SPACING: "Preferred distance between mark centers (count is calculated)",
            TIP_MIRROR_BOTTOM: "Use same settings as top edge",
            TIP_MIRROR_RIGHT: "Use same settings as left edge",
            TIP_SIZE: "Circle diameter and cross arm span, in the units above.",
            TIP_EDGE_ENABLE: "Enable/disable mark placement on this edge",
            TIP_PRESET_LOAD: "Select saved preset",
            TIP_SAVE: "Save settings to the active preset.",

            // Errors
            ERR_PREFIX: "ERROR: ",
            DOC_UNCHANGED: "The document was not changed.",
            ERR_NO_DOC: "Open a document before running the script.",
            ERR_NO_EDGE: "At least one edge must be enabled.",
            ERR_NO_APPEARANCE: "Marks must have at least one shape — circle and/or cross.",
            ERR_CRITICAL: "The script stopped on an unexpected error: %s (line %s).\n\nThe document may be partly changed — check it, or undo the changes (Cmd+Z). Send this message to the script's maintainer.",
            ERR_WRITE_SETTINGS: "The settings could not be saved — next time the dialog opens without them.",
            WARN_MARKS_FAILED: "%s mark(s) could not be placed — check the target layer.",
            WARN_LAYER_UNHIDDEN: "The hidden layer \"%s\" was made visible so the new marks can be seen and printed.",
            WARN_DUPLICATE_MARKS: "New marks overlap marks already on the layer (count: %s) — probably a repeated run. Undo (Cmd+Z) reverts this run; for a new layout, delete the old marks and run the script again.",
            WARN_ALL_ARTBOARDS: "Marks were placed on every artboard in the document (count: %s).",
            WARN_PREFIX: "WARNING: ",
            ERR_CANNOT_DELETE_DEFAULT: "The default preset cannot be deleted.",
            ERR_ENTER_NAME: "Enter a preset name.",
            ERR_RESERVED_NAME: "Names in square brackets are reserved. Choose another name.",
            ERR_MUST_BE_NUMBER: "Field \"%s\" must be a number.",
            ERR_MUST_BE_INTEGER: "Field \"%s\" must be a whole number.",
            ERR_OUT_OF_RANGE: "Field \"%s\" must be between %s and %s.",
            ERR_PATH_NO_SELECTION: "Nothing is selected. Select one path and run the script again.",
            ERR_PATH_NOT_A_PATH: "The selection is not a single simple path. Pick a path inside a group with the Direct Selection tool (A), release a compound path (Object ▸ Compound Path ▸ Release), or keep one object selected.",
            ERR_PATH_TOO_SHORT: "The selected path has fewer than 2 points.",
            ERR_PATH_GONE: "The selected path is no longer available — select it again and rerun.",
            WARN_MODE_FALLBACK: "The preset uses Selected path mode, but no path is selected — switched to Artboard edges.",

            // Path info line, offset and partial selection
            INFO_ARTBOARDS_1: "%s artboard",
            INFO_ARTBOARDS_2: "%s artboards",
            INFO_ARTBOARDS_5: "%s artboards",
            INFO_ALL_ARTBOARDS: "marks go on every one",
            INFO_SIZE: "%s × %s %s",
            // Short on purpose: " · scale 1:N" widened the dialog by 32 px
            // (docs/extendscript-engine-facts.md, measured 2026-10-21).
            INFO_SCALE: " · 1:%s",
            INFO_FALLBACK: "The preset wants a path, none is selected — marking the artboard.",
            INFO_CORNERS_1: "%s corner",
            INFO_CORNERS_2: "%s corners",
            INFO_CORNERS_5: "%s corners",
            INFO_ROUND_1: "%s rounded corner",
            INFO_ROUND_2: "%s rounded corners",
            INFO_ROUND_5: "%s rounded corners",
            INFO_ROUND_SHORT_1: "%s rounded",
            INFO_ROUND_SHORT_2: "%s rounded",
            INFO_ROUND_SHORT_5: "%s rounded",
            INFO_TOP_START: "first mark at the top",
            INFO_ON_PATH: "marks sit on the path",
            DEC_SEP: ".",
            PATH_PARTIAL: "Selected part of the outline only",
            PATH_PARTIAL_COUNT: " (%s of %s segments)",
            TIP_PATH_OFFSET: "Distance of the mark centers from the cut line, inside the shape. 0 = marks sit on the path.",
            TIP_PATH_OFFSET_OPEN: "An open path has no inside to offset towards — marks sit on the path.",
            TIP_PARTIAL: "Marks only on segments whose two end anchors are selected. The default is the whole outline; this choice is not saved in the preset.",
            TIP_PARTIAL_NONE: "Select part of the outline with the Direct Selection tool (A): the anchors at both ends of every segment.",
            TIP_PARTIAL_LONE: "Only a lone anchor is selected — select the other end of the segment too, with the Direct Selection tool.",
            ERR_OFFSET_COLLAPSE: "An offset of %s is too large for this shape — the eyelet line would collapse at its narrowest point. Reduce the offset. The document was not changed.",
            ERR_OFFSET_SPLIT: "The eyelet line breaks into several parts (%s) at a narrow point. Reduce the offset. The document was not changed.",
            ERR_OFFSET_FAILED: "Illustrator could not offset the path (%s). No marks were made.",

            // Why Generate is grey — the placement line says it in the error colour
            // (canon 12.3, 12.6). %s: a field's label without the colon, its limits,
            // the unit with its space ("" for counts); the count of invalid fields.
            REASON_MARK: "✗ ",
            REASON_FIELD: "%s: enter a number from %s to %s%s.",
            REASON_FIELD_INT: "%s: enter a whole number from %s to %s.",
            REASON_MANY: "Invalid fields: %s — fix the red fields.",
            REASON_NO_SHAPE: "The mark has no shape — turn on Circle or Cross.",
            REASON_NO_EDGE: "No edge is turned on.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Delete preset \"%s\"? This cannot be undone.",
            CONFIRM_OVERWRITE_PRESET: "Preset \"%s\" already exists. Replace it?"
        },

        cs: {
            // Sentinel display strings
            PRESET_DEFAULT: "[Výchozí]",

            // Units
            UNIT_MM: "Milimetry",
            UNIT_CM: "Centimetry",
            UNIT_IN: "Palce",

            // Edges panel
            EDGES_PANEL: "Hrany",
            EDGE_TOP: "Horní",
            EDGE_LEFT: "Levá",
            EDGE_BOTTOM: "Dolní",
            EDGE_RIGHT: "Pravá",
            OFFSET_X: "Odsazení X:",
            OFFSET_Y: "Odsazení Y:",

            // Edge labels
            TOP: "Horní",
            LEFT: "Levá",
            BOTTOM_MIRROR: "Zrcadlit horní",
            RIGHT_MIRROR: "Zrcadlit levou",

            // Edge fields
            COUNT: "Počet ok:",
            SPACING: "Rozteč:",
            EDGE_COUNT_HDR: "Počet ok",
            EDGE_SPACING_HDR: "Rozteč",
            OFFSET_LABEL: "Odsazení od kraje:",
            MIRROR_GROUP_LABEL: "Zrcadlit:",
            MIRROR_TOP: "horní ↓ dolní",
            MIRROR_LEFT: "levou → pravou",
            MIRROR_TOP_ACTIVE: "zrcadlí horní",
            MIRROR_LEFT_ACTIVE: "zrcadlí levou",

            // Mark panel
            MARK_PANEL: "Značka",
            UNIT_LABEL: "Jednotky:",
            TIP_UNITS: "Jednotky pro odsazení, rozteče a velikost značky. Tloušťky tahů jsou vždy v bodech.",
            SIZE_LABEL: "Velikost:",
            MARK_SHAPE_LABEL: "Tvar:",
            MARK_CIRCLE: "Kruh",
            MARK_CROSS: "Kříž",
            REG_WEIGHT: "Reg. tah (pt):",
            HALO_WEIGHT: "Bílé halo (pt):",
            TIP_MARK_SHAPE: "Tvar značky — kruh, kříž, nebo oba (registrace přes bílé halo).",
            TIP_REG_WEIGHT: "Tloušťka registračního tahu v bodech (přetiskuje).",
            TIP_HALO_WEIGHT: "Tloušťka bílého podkladu (knockout) v bodech — udrží značku čitelnou na motivu.",

            // Placement panel
            PLACEMENT_PANEL: "Umístění",
            MODE_ARTBOARD: "Hrany artboardu",
            MODE_PATH: "Vybraná cesta",

            // Měřítko kresby 1:N (spec 4) — hodnoty v dialogu jsou ve skutečné velikosti;
            // dokument si měřítko pamatuje. SCALE_FIELD je název pole v důvodu.
            SCALE_LABEL: "Měřítko kresby 1:",
            TIP_SCALE: "V jakém měřítku je dokument nakreslený: 1:10 znamená, že grafika je desetkrát menší než ve skutečnosti. Dokument si ho zapamatuje. Hodnoty v dialogu se zadávají ve skutečné velikosti, včetně velikosti značky a tloušťky tahů.",
            SCALE_FIELD: "Měřítko kresby",

            // Path panel
            PATH_PANEL: "Cesta",
            PATH_INFO_CLOSED: "Uzavřená cesta",
            PATH_INFO_OPEN: "Otevřená cesta",
            PATH_INFO_NO_CORNERS: "bez rohů",
            PATH_INFO_LENGTH: "obvod ≈ %s %s",
            TIP_PATH_COUNT_DISABLED: "Na cestě s rohy je počet dán rohy — značky padnou jen na rohy.",
            TIP_PATH_COUNT_PARTIAL: "U vybrané části obvodu se značky řídí roztečí — počet by dal jen konce a rohy.",

            // Corner zones panel
            ZONES_PANEL: "Rohové zóny",
            ZONES_ENABLE: "Zhustit u rohů",
            ZONES_COUNT: "Počet:",
            ZONES_PITCH: "Rozteč:",
            ZONES_FIRST: "— prvních",
            ZONES_MARKS_PITCH: "značek, rozteč",
            TIP_ZONES: "Prvních N značek od každého rohu dostane tuto rozteč; zbytek hrany nebo cesty se rozmístí podle rozteče.",
            TIP_ZONES_NO_CORNERS: "Vybraná cesta nemá rohy — značky se rozmístí rovnoměrně po obvodu.",
            TIP_ZONES_CORNERS_ONLY: "Když je na cestě s rohy zvolený Počet ok, leží značky jen v rozích a zóny nemají co zhustit. Pro zóny zvolte Rozteč.",
            TIP_COUNT_ZONES: "Se zapnutými rohovými zónami se hrana plní podle rozteče a Počet ok se nepoužije.",

            // Settings panel
            SETTINGS_PANEL: "Předvolby",
            LOAD: "Načíst:",
            DELETE: "Smazat",
            SAVE: "Uložit",
            BTN_SAVE_AS: "Uložit jako…",
            TIP_SAVE_AS: "Uložit aktuální nastavení jako novou předvolbu.",
            TIP_DELETE: "Smazat vybranou předvolbu.",
            TIP_REVERT: "Zahodit neuložené změny a znovu načíst předvolbu.",
            PROMPT_SAVE_AS: "Název nové předvolby:",

            // Buttons
            OK: "Generovat",
            CANCEL: "Storno",

            // Tooltips
            TIP_OFFSET_X: "Vzdálenost středu značek od levého a pravého okraje artboardu",
            TIP_OFFSET_Y: "Vzdálenost středu značek od horního a dolního okraje artboardu",
            TIP_COUNT: "Pevný počet značek na hraně (rozteč se dopočítá)",
            TIP_SPACING: "Preferovaná vzdálenost mezi středy značek (počet se dopočítá)",
            TIP_MIRROR_BOTTOM: "Použije stejné nastavení jako horní strana",
            TIP_MIRROR_RIGHT: "Použije stejné nastavení jako levá strana",
            TIP_SIZE: "Průměr kruhu a délka ramen kříže, v jednotkách nahoře.",
            TIP_EDGE_ENABLE: "Zapne/vypne umístění značek na tuto hranu",
            TIP_PRESET_LOAD: "Vyberte uloženou předvolbu",
            TIP_SAVE: "Uložit nastavení do aktivní předvolby.",

            // Errors
            ERR_PREFIX: "CHYBA: ",
            DOC_UNCHANGED: "Dokument nebyl změněn.",
            ERR_NO_DOC: "Před spuštěním skriptu otevřete dokument.",
            ERR_NO_EDGE: "Musí být zapnutá alespoň jedna hrana.",
            ERR_NO_APPEARANCE: "Značka musí mít aspoň jeden tvar — kruh a/nebo kříž.",
            ERR_CRITICAL: "Skript se zastavil kvůli neočekávané chybě: %s (řádek %s).\n\nDokument může být částečně změněný — zkontrolujte ho, případně změny vraťte (Cmd+Z). Pošlete tuto hlášku správci skriptu.",
            ERR_WRITE_SETTINGS: "Nastavení se nepodařilo uložit — příště se dialog otevře bez něj.",
            WARN_MARKS_FAILED: "Značek, které se nepodařilo umístit: %s — zkontrolujte cílovou vrstvu.",
            WARN_LAYER_UNHIDDEN: "Skrytá vrstva „%s“ byla zviditelněna, aby byly nové značky vidět a vytiskly se.",
            WARN_DUPLICATE_MARKS: "Nové značky se kryjí se značkami, které už ve vrstvě byly (počet: %s) — nejspíš opakovaný běh. Zpět (Cmd+Z) tento běh vrátí; pro nové rozmístění smažte staré značky a spusťte skript znovu.",
            WARN_ALL_ARTBOARDS: "Značky se vytvořily na všech artboardech dokumentu (počet: %s).",
            WARN_PREFIX: "UPOZORNĚNÍ: ",
            ERR_CANNOT_DELETE_DEFAULT: "Výchozí předvolbu nejde smazat.",
            ERR_ENTER_NAME: "Zadejte název předvolby.",
            ERR_RESERVED_NAME: "Názvy v hranatých závorkách jsou vyhrazené. Zvolte jiný název.",
            ERR_MUST_BE_NUMBER: "Pole „%s“ musí být číslo.",
            ERR_MUST_BE_INTEGER: "Pole „%s“ musí být celé číslo.",
            ERR_OUT_OF_RANGE: "Pole „%s“ musí být mezi %s a %s.",
            ERR_PATH_NO_SELECTION: "Nic není vybráno. Vyberte jednu cestu a spusťte skript znovu.",
            ERR_PATH_NOT_A_PATH: "Výběr není jedna jednoduchá cesta. Cestu ze skupiny vyberte nástrojem Přímý výběr (A), složenou cestu rozdělte (Objekt ▸ Složená cesta ▸ Uvolnit), z více objektů nechte vybraný jeden.",
            ERR_PATH_TOO_SHORT: "Vybraná cesta má méně než 2 body.",
            ERR_PATH_GONE: "Vybraná cesta už není dostupná — vyberte ji znovu a spusťte skript.",
            WARN_MODE_FALLBACK: "Předvolba používá režim Vybraná cesta, ale žádná cesta není vybraná — přepnuto na Hrany artboardu.",

            // Path info line, offset and partial selection
            INFO_ARTBOARDS_1: "%s artboard",
            INFO_ARTBOARDS_2: "%s artboardy",
            INFO_ARTBOARDS_5: "%s artboardů",
            INFO_ALL_ARTBOARDS: "značky dostanou všechny",
            INFO_SIZE: "%s × %s %s",
            // Schválně krátké: „ · měřítko 1:N“ rozšířilo dialog o 48 px
            // (docs/extendscript-engine-facts.md, naměřeno 2026-10-21).
            INFO_SCALE: " · 1:%s",
            INFO_FALLBACK: "Předvolba chce cestu, žádná není vybraná — značí se artboard.",
            INFO_CORNERS_1: "%s roh",
            INFO_CORNERS_2: "%s rohy",
            INFO_CORNERS_5: "%s rohů",
            INFO_ROUND_1: "%s zaoblený roh",
            INFO_ROUND_2: "%s zaoblené rohy",
            INFO_ROUND_5: "%s zaoblených rohů",
            INFO_ROUND_SHORT_1: "%s zaoblený",
            INFO_ROUND_SHORT_2: "%s zaoblené",
            INFO_ROUND_SHORT_5: "%s zaoblených",
            INFO_TOP_START: "první značka nahoře",
            INFO_ON_PATH: "značky leží na cestě",
            DEC_SEP: ",",
            PATH_PARTIAL: "Jen vybraná část obvodu",
            PATH_PARTIAL_COUNT: " (%s z %s úseků)",
            TIP_PATH_OFFSET: "Vzdálenost středu značek od řezové linky, dovnitř tvaru. 0 = značky leží přímo na cestě.",
            TIP_PATH_OFFSET_OPEN: "U otevřené cesty nejde určit, na kterou stranu odsadit — značky leží na cestě.",
            TIP_PARTIAL: "Značky jen na úsecích, které mají vybrané obě koncové kotvy. Výchozí je celý obvod; volba se do předvolby neukládá.",
            TIP_PARTIAL_NONE: "Část obvodu vyberte nástrojem Přímý výběr (A): kotvy na začátku i konci každého úseku.",
            TIP_PARTIAL_LONE: "Vybraná je jen samostatná kotva — označte Přímým výběrem i druhý konec úseku.",
            ERR_OFFSET_COLLAPSE: "Odsazení %s je na tento tvar moc velké — linka ok by se v nejužším místě zhroutila. Zmenšete odsazení. Dokument nebyl změněn.",
            ERR_OFFSET_SPLIT: "Linka ok se v úzkém místě rozpadá na víc částí (%s). Zmenšete odsazení. Dokument nebyl změněn.",
            ERR_OFFSET_FAILED: "Illustrator nedokázal cestu odsadit (%s). Žádná značka nevznikla.",

            // Proč je Generovat šedé — řádek v panelu Umístění to říká barvou chyby
            // (kánon 12.3, 12.6). %s: popisek pole bez dvojtečky, meze, jednotka
            // s mezerou ("" u počtů); počet neplatných polí.
            REASON_MARK: "✗ ",
            REASON_FIELD: "%s: zadejte číslo od %s do %s%s.",
            REASON_FIELD_INT: "%s: zadejte celé číslo od %s do %s.",
            REASON_MANY: "Neplatná pole: %s — opravte červená pole.",
            REASON_NO_SHAPE: "Značka nemá tvar — zapněte Kruh nebo Kříž.",
            REASON_NO_EDGE: "Není zapnutá žádná hrana.",

            // Confirmations
            CONFIRM_DELETE_PRESET: "Smazat předvolbu „%s“? Smazání nejde vrátit.",
            CONFIRM_OVERWRITE_PRESET: "Předvolba „%s“ už existuje. Přepsat?"
        }
    };

    var active = strings[lang] || strings["en"];

    // Simple string formatter: GM.L.format(GM.L.WARN_MARKS_FAILED, count)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? args[idx++] : "%s";
        });
    };

    // Czech plural: GM.L.count("INFO_CORNERS", n) -> "1 roh" / "3 rohy" / "5 rohů".
    // Every counted key exists in both tables with _1, _2 and _5 forms.
    active.count = function (base, n) {
        var suffix = "_5";
        if (n === 1) suffix = "_1";
        else if (n >= 2 && n <= 4) suffix = "_2";
        return active.format(active[base + suffix], n);
    };

    return active;
})();
