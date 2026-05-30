/*
 * ===========================================================================
 * Script:      Illustrator Tile Panels
 * Version:     1.0.0
 * Author:      Osva1d
 * Updated:     2026-05-30
 *
 * Copyright (c) 2026-2026 Osva1d. All rights reserved.
 * Licensed under a proprietary license. See LICENSE file for details.
 *
 * Description:
 *   Panel tiling script for wide-format print production.
 * ===========================================================================
 */

#target illustrator

// --- JSON POLYFILL (ES3) ---
if (typeof JSON !== "object") {
  JSON = {};
  (function () {
    var rx_one = /^[\],:{}\s]*$/,
      rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
      rx_three =
        /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
      rx_four = /(?:^|:|,)(?:\s*\[)+/g,
      rx_escapable =
        /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      rx_dangerous =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    function f(n) {
      return n < 10 ? "0" + n : n;
    }
    function quote(string) {
      rx_escapable.lastIndex = 0;
      return rx_escapable.test(string)
        ? '"' +
            string.replace(rx_escapable, function (a) {
              var c = meta[a];
              return typeof c === "string"
                ? c
                : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"'
        : '"' + string + '"';
    }
    function str(key, holder) {
      var i,
        k,
        v,
        length,
        mind = gap,
        partial,
        value = holder[key];
      if (
        value &&
        typeof value === "object" &&
        typeof value.toJSON === "function"
      ) {
        value = value.toJSON(key);
      }
      if (typeof value === "string") {
        return quote(value);
      }
      if (typeof value === "number") {
        return isFinite(value) ? String(value) : "null";
      }
      if (typeof value === "boolean" || value === null) {
        return String(value);
      }
      if (value && typeof value === "object") {
        gap += indent;
        partial = [];
        if (Object.prototype.toString.apply(value) === "[object Array]") {
          length = value.length;
          for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value) || "null";
          }
          v =
            partial.length === 0
              ? "[]"
              : gap
                ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
                : "[" + partial.join(",") + "]";
          gap = mind;
          return v;
        }
        for (k in value) {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            v = str(k, value);
            if (v) {
              partial.push(quote(k) + (gap ? ": " : ":") + v);
            }
          }
        }
        v =
          partial.length === 0
            ? "{}"
            : gap
              ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
              : "{" + partial.join(",") + "}";
        gap = mind;
        return v;
      }
    }
    var meta = {
      "\b": "\\b",
      "\t": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\"
    };
    var gap, indent;
    JSON.stringify = function (value, replacer, space) {
      var i;
      gap = "";
      indent = "";
      if (typeof space === "number") {
        for (i = 0; i < space; i += 1) {
          indent += " ";
        }
      } else if (typeof space === "string") {
        indent = space;
      }
      if (
        !replacer ||
        typeof replacer === "function" ||
        (typeof replacer === "object" && typeof replacer.length === "number")
      ) {
        return str("", { "": value });
      }
      throw new Error("JSON.stringify");
    };
    JSON.parse = function (text, reviver) {
      var j;
      function walk(holder, key) {
        var k,
          v,
          value = holder[key];
        if (value && typeof value === "object") {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return reviver.call(holder, key, value);
      }
      text = String(text);
      rx_dangerous.lastIndex = 0;
      if (rx_dangerous.test(text)) {
        text = text.replace(rx_dangerous, function (a) {
          return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        });
      }
      if (
        rx_one.test(
          text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""),
        )
      ) {
        j = eval("(" + text + ")");
        return typeof reviver === "function" ? walk({ "": j }, "") : j;
      }
      throw new SyntaxError("JSON.parse");
    };
  })();
}

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

var TP = TP || {};

TP.Utils = {
    /**
     * Converts millimeters to points.
     * @param {number} mm - Value in millimeters.
     * @returns {number} Value in points.
     */
    mm2pt: function (mm) { return mm * 2.834645669291339; },

    /**
     * Converts points to millimeters.
     * @param {number} pt - Value in points.
     * @returns {number} Value in millimeters.
     */
    pt2mm: function (pt) { return pt / 2.834645669291339; },

    /**
     * Retrieves the scale factor of the active document (Large Canvas support).
     * Returns 1 for standard documents, 10 for Large Canvas mode.
     * @returns {number} Scale factor.
     */
    getSF: function () {
        try {
            if (app.documents.length === 0) return 1;
            return app.activeDocument.scaleFactor || 1;
        } catch (e) {
            return 1;
        }
    },

    /**
     * Rounds a millimeter value for display.
     * @param {number} val - Value to round.
     * @param {number} [decimals=1] - Decimal places.
     * @returns {number} Rounded value.
     */
    roundMM: function (val, decimals) {
        var d = (decimals !== undefined) ? decimals : 1;
        var f = Math.pow(10, d);
        return Math.round(val * f) / f;
    },

    /**
     * Validates a numerical input within a range.
     * Normalizes Czech decimal separator (comma -> dot) before parsing.
     * Returns null and shows alert if invalid; keeps dialog open.
     * @param {string|number} val - The value to validate.
     * @param {number} min - Minimum allowed value (inclusive).
     * @param {number} max - Maximum allowed value (inclusive).
     * @param {string} name - Display name used in error messages.
     * @returns {number|null} Validated number or null if invalid.
     */
    validateNumber: function (val, min, max, name) {
        var str = String(val).replace(/,/g, ".");
        var n = Number(str);
        if (isNaN(n)) {
            alert(TP.L.format(TP.L.ERR_MUST_BE_NUMBER, name));
            return null;
        }
        if (n < min || n > max) {
            alert(TP.L.format(TP.L.ERR_OUT_OF_RANGE, name, min, max));
            return null;
        }
        return n;
    },

    /**
     * Writes a debug message to the ExtendScript console.
     * Only active when TP.Config.debug is true.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        if (TP.Config && TP.Config.debug) {
            $.writeln("[TP] " + msg);
        }
    }
};

var TP = TP || {};

TP.Config = {
    // --- Script metadata ---
    SCRIPT_NAME: "Tile Panels",
    VERSION: "1.0.0",
    AUTHOR: "Osva1d",
    COPYRIGHT_YEAR: "2026",
    debug: false,

    // --- Layer names ---
    LAYER_PREVIEW: "_TileSplitPreview",
    LAYER_MARKS:   "_TileMarks",

    // --- Name prefixes for split line pathItems ---
    SPLIT_V_PREFIX: "SplitV_",
    SPLIT_H_PREFIX: "SplitH_",

    // --- Hidden data textFrame prefix ---
    DATA_FRAME_PREFIX: "__TP_DATA__",

    // --- Split line appearance (Phase 1) ---
    SPLIT_LINE_WEIGHT:  0.5,   // pt
    SPLIT_LINE_DASH:    12,    // pt
    SPLIT_LINE_GAP:     4,     // pt
    SPLIT_LINE_EXTEND:  20,    // mm — extension beyond artwork bounds
    SPLIT_LABEL_SIZE:   7,     // pt — font size for position labels

    // --- Crop mark dimensions ---
    CROP_MARK_LENGTH:   5,     // mm
    CROP_MARK_OFFSET:   3,     // mm — gap between artboard edge and mark start
    CROP_MARK_WEIGHT:   0.25,  // pt

    // --- Panel label dimensions ---
    LABEL_OFFSET:       8,     // mm — offset from artboard corner
    LABEL_FONT_SIZE:    8,     // pt
    LABEL_FONT_NAME:    "Helvetica",

    // --- Overlap indicator ---
    OVERLAP_IND_WEIGHT: 0.25,  // pt
    OVERLAP_IND_DASH:   6,     // pt
    OVERLAP_IND_GAP:    3,     // pt
    OVERLAP_LABEL_SIZE: 6,     // pt

    // --- Registration crosshairs ---
    CROSSHAIR_ARM:      5,     // mm
    CROSSHAIR_WEIGHT:   0.25,  // pt

    // --- Illustrator limits ---
    MAX_ARTBOARDS:      1000,
    MAX_ARTBOARD_PT:    16344, // pt — max artboard dimension (~5765 mm)

    /**
     * Returns default settings for the setup dialog.
     * @returns {Object} Default settings object.
     */
    /**
     * Returns default settings for the setup dialog.
     * All dimensional values (overlap, bleed, panel width) are in REAL mm.
     * The scale factor converts them to document space internally.
     * @returns {Object} Default settings object.
     */
    getDefaults: function () {
        return {
            scale:          1,          // document scale (1 = full size, 10 = 1:10)
            mode:           "maxWidth", // "maxWidth" or "panelCount"
            // Mode: maxWidth
            maxPanelWidth:  1500,       // real mm
            maxPanelHeight: 0,          // real mm (0 = no horizontal splits)
            redistribute:   true,       // redistribute evenly if remainder too narrow
            redistributePct: 30,        // min remainder as % of max width before redistribution
            // Mode: panelCount
            columns:        4,
            rows:           1,          // 1 = no horizontal splits
            // Common
            overlap:        20,         // real mm
            overlapBothSides: false,    // false = right+down only, true = split overlap both sides

            bleedUniform:   true,
            bleed:          3,          // real mm (uniform value)
            bleedTop:       3,          // real mm
            bleedRight:     3,          // real mm
            bleedBottom:    3,          // real mm
            bleedLeft:      3,          // real mm
            keepOriginalArtboard: false,
            markCropMarks:      true,
            markLabels:         true,
            markOverlapIndicators: true,
            markCrosshairs:     false
        };
    },

    // --- Persistent storage ---
    Storage: {
        _folder: "TilePanels",
        _file:   "settings.json",

        /**
         * Returns the settings file handle.
         * @returns {File}
         */
        getFile: function () {
            var folder = new Folder(Folder.userData + "/" + TP.Config.Storage._folder);
            if (!folder.exists) folder.create();
            return new File(folder.fsName + "/" + TP.Config.Storage._file);
        },

        /**
         * Saves settings to disk.
         * @param {Object} data - Settings object.
         * @returns {boolean} True on success.
         */
        save: function (data) {
            try {
                var f = this.getFile();
                f.encoding = "UTF-8";
                f.open("w");
                f.write(JSON.stringify(data, null, 2));
                f.close();
                return true;
            } catch (e) {
                TP.Utils.log("Storage.save failed: " + e.message);
                return false;
            }
        },

        /**
         * Loads settings from disk.
         * @returns {Object|null} Parsed settings or null.
         */
        load: function () {
            try {
                var f = this.getFile();
                if (!f.exists) return null;
                f.encoding = "UTF-8";
                f.open("r");
                var content = f.read();
                f.close();
                if (!content) return null;
                return JSON.parse(content);
            } catch (e) {
                TP.Utils.log("Storage.load failed: " + e.message);
                return null;
            }
        }
    }
};

var TP = TP || {};

/**
 * Pure math module — zero Illustrator API calls.
 * All inputs/outputs are plain numbers and arrays.
 * Positions are in document points unless noted otherwise.
 *
 * Dimensional inputs to calculateGrid are in REAL mm (user-facing values).
 * The scale factor converts them to document mm internally.
 */
TP.Core = {

    /**
     * Calculates split positions along one axis using max panel dimension.
     * Optionally redistributes when the remainder panel would be too narrow.
     *
     * @param {number} artworkDimMM - Artwork dimension in real mm.
     * @param {number} maxPanelDimMM - Maximum panel dimension in real mm.
     * @param {boolean} redistribute - Whether to redistribute if remainder is narrow.
     * @param {number} redistributePct - Min remainder as % (0–100) of max width before redistribution.
     * @returns {Object} { splits: number[], panelDimMM: number, count: number, redistributed: boolean }
     */
    calculateSplitsByMaxWidth: function (artworkDimMM, maxPanelDimMM, redistribute, redistributePct) {
        if (maxPanelDimMM <= 0 || artworkDimMM <= 0) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        // No split needed
        if (artworkDimMM <= maxPanelDimMM) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        var numPanels = Math.ceil(artworkDimMM / maxPanelDimMM);
        var remainder = artworkDimMM - (numPanels - 1) * maxPanelDimMM;
        var redistributed = false;
        var panelDim = maxPanelDimMM;

        // Check if remainder is too narrow and redistribution is enabled
        if (redistribute && redistributePct > 0) {
            var minRemainder = (redistributePct / 100) * maxPanelDimMM;
            if (remainder < minRemainder) {
                panelDim = artworkDimMM / numPanels;
                redistributed = true;
            }
        }

        // Generate split positions (real mm from artwork origin)
        var splits = [];
        for (var i = 1; i < numPanels; i++) {
            splits.push(i * panelDim);
        }

        return {
            splits: splits,
            panelDimMM: panelDim,
            count: numPanels,
            redistributed: redistributed
        };
    },

    /**
     * Calculates split positions along one axis by dividing into N equal panels.
     *
     * @param {number} artworkDimMM - Artwork dimension in real mm.
     * @param {number} count - Number of panels (>= 1).
     * @returns {Object} { splits: number[], panelDimMM: number, count: number, redistributed: false }
     */
    calculateSplitsByCount: function (artworkDimMM, count) {
        if (count <= 1 || artworkDimMM <= 0) {
            return { splits: [], panelDimMM: artworkDimMM, count: 1, redistributed: false };
        }

        var panelDim = artworkDimMM / count;
        var splits = [];
        for (var i = 1; i < count; i++) {
            splits.push(i * panelDim);
        }

        return {
            splits: splits,
            panelDimMM: panelDim,
            count: count,
            redistributed: false
        };
    },

    /**
     * Calculates the full tile grid from setup parameters.
     * Supports two modes: "maxWidth" and "panelCount".
     * All dimensional values in params are in REAL mm.
     *
     * @param {Object} params
     *   params.artworkWidthMM  {number} - Artwork width in real mm.
     *   params.artworkHeightMM {number} - Artwork height in real mm.
     *   params.mode            {string} - "maxWidth" or "panelCount".
     *   // Mode: maxWidth
     *   params.maxPanelWidth   {number} - Max panel width in real mm.
     *   params.maxPanelHeight  {number} - Max panel height in real mm (0 = no horizontal splits).
     *   params.redistribute    {boolean} - Whether to redistribute.
     *   params.redistributePct {number} - Redistribution threshold (% of max width).
     *   // Mode: panelCount
     *   params.columns         {number} - Number of columns.
     *   params.rows            {number} - Number of rows (1 = no horizontal splits).
     * @returns {Object} { vResult, hResult, columns, rows, totalPanels }
     */
    calculateGrid: function (params) {
        var vResult, hResult;

        if (params.mode === "panelCount") {
            vResult = this.calculateSplitsByCount(
                params.artworkWidthMM,
                params.columns || 1
            );
            hResult = this.calculateSplitsByCount(
                params.artworkHeightMM,
                params.rows || 1
            );
        } else {
            // mode === "maxWidth" (default)
            vResult = this.calculateSplitsByMaxWidth(
                params.artworkWidthMM,
                params.maxPanelWidth,
                params.redistribute,
                params.redistributePct
            );

            if (params.maxPanelHeight > 0) {
                hResult = this.calculateSplitsByMaxWidth(
                    params.artworkHeightMM,
                    params.maxPanelHeight,
                    params.redistribute,
                    params.redistributePct
                );
            } else {
                hResult = { splits: [], panelDimMM: params.artworkHeightMM, count: 1, redistributed: false };
            }
        }

        return {
            vResult: vResult,
            hResult: hResult,
            columns: vResult.count,
            rows: hResult.count,
            totalPanels: vResult.count * hResult.count
        };
    },

    /**
     * Calculates artboard rectangles for all panels from split positions.
     * Applies overlap on inner edges and bleed on outer edges.
     *
     * Overlap model (right/downward extension):
     *   Panel 0 right = splitsV[0] + overlap
     *   Panel i left  = splitsV[i-1], right = splitsV[i] + overlap
     *   Panel last left = splitsV[last], right = artworkRight + bleedRight
     *   Same vertically: top panel top = artworkTop + bleedTop,
     *   bottom extends overlap downward past split.
     *
     * @param {Object} params
     *   params.splitsV       {number[]} - Vertical split X positions in points.
     *   params.splitsH       {number[]} - Horizontal split Y positions in points.
     *   params.artworkBounds {number[]} - [left, top, right, bottom] in points.
     *   params.overlapPt     {number}   - Overlap in points.
     *   params.bleedTopPt    {number}   - Top bleed in points.
     *   params.bleedBottomPt {number}   - Bottom bleed in points.
     *   params.bleedLeftPt   {number}   - Left bleed in points.
     *   params.bleedRightPt  {number}   - Right bleed in points.
     *   params.overlapBothSides {boolean} - If true, overlap is split ov/2 on each side of seam.
     * @returns {Object[]} Array of panel objects
     */
    calculateArtboardRects: function (params) {
        var sv = params.splitsV;
        var sh = params.splitsH;
        var ab = params.artworkBounds; // [left, top, right, bottom]
        var ov = params.overlapPt;
        var bT = params.bleedTopPt;
        var bB = params.bleedBottomPt;
        var bL = params.bleedLeftPt;
        var bR = params.bleedRightPt;
        var both = params.overlapBothSides || false;
        var halfOv = both ? ov / 2 : 0;

        var numCols = sv.length + 1;
        var numRows = sh.length + 1;

        // Build column boundaries (X positions in points)
        var colEdges = [ab[0]]; // artwork left
        for (var c = 0; c < sv.length; c++) colEdges.push(sv[c]);
        colEdges.push(ab[2]); // artwork right

        // Build row boundaries (Y positions in points, descending: top > bottom)
        var rowEdges = [ab[1]]; // artwork top
        for (var r = 0; r < sh.length; r++) rowEdges.push(sh[r]);
        rowEdges.push(ab[3]); // artwork bottom

        var panels = [];

        for (var row = 0; row < numRows; row++) {
            for (var col = 0; col < numCols; col++) {
                var isLeft   = (col === 0);
                var isRight  = (col === numCols - 1);
                var isTop    = (row === 0);
                var isBottom = (row === numRows - 1);

                // Net panel boundaries (artwork area this panel covers)
                var netLeft   = colEdges[col];
                var netRight  = colEdges[col + 1];
                var netTop    = rowEdges[row];
                var netBottom = rowEdges[row + 1];

                var left, right, top, bottom;

                if (both) {
                    // Both-sides overlap: ov/2 on every inner edge
                    left   = isLeft   ? netLeft   - bL : netLeft   - halfOv;
                    right  = isRight  ? netRight  + bR : netRight  + halfOv;
                    top    = isTop    ? netTop    + bT : netTop    + halfOv;
                    bottom = isBottom ? netBottom - bB : netBottom - halfOv;
                } else {
                    // One-directional overlap (right+down):
                    //   Outer edge        → outer bleed
                    //   Inner overlap side → overlap (right/bottom)
                    //   Inner non-overlap  → flush (left/top of non-first panels)
                    left   = isLeft   ? netLeft   - bL : netLeft;
                    right  = isRight  ? netRight  + bR : netRight  + ov;
                    top    = isTop    ? netTop    + bT : netTop;
                    bottom = isBottom ? netBottom - bB : netBottom - ov;
                }

                panels.push({
                    row: row,
                    col: col,
                    label: "Tile_R" + (row + 1) + "C" + (col + 1),
                    rect: [left, top, right, bottom],
                    netRect: [netLeft, netTop, netRight, netBottom],
                    isLeftEdge: isLeft,
                    isRightEdge: isRight,
                    isTopEdge: isTop,
                    isBottomEdge: isBottom
                });
            }
        }

        return panels;
    },

    /**
     * Calculates L-shaped crop mark segments for one panel.
     * Crop marks are placed only on outer edges (bleed edges).
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} lengthPt - Crop mark arm length in points.
     * @param {number} offsetPt - Gap between artboard edge and mark start in points.
     * @returns {Object[]} Array of line segments: { p1: [x,y], p2: [x,y] }
     */
    calculateCropMarks: function (panel, lengthPt, offsetPt) {
        var r = panel.rect; // [L, T, R, B]
        var marks = [];

        // Each corner: horizontal arm shows if the vertical edge at that corner is outer,
        // vertical arm shows if the horizontal edge at that corner is outer.
        var corners = [
            { x: r[0], y: r[1], hDir:  1, vDir: -1, showH: panel.isLeftEdge,  showV: panel.isTopEdge },
            { x: r[2], y: r[1], hDir: -1, vDir: -1, showH: panel.isRightEdge, showV: panel.isTopEdge },
            { x: r[2], y: r[3], hDir: -1, vDir:  1, showH: panel.isRightEdge, showV: panel.isBottomEdge },
            { x: r[0], y: r[3], hDir:  1, vDir:  1, showH: panel.isLeftEdge,  showV: panel.isBottomEdge }
        ];

        for (var i = 0; i < corners.length; i++) {
            var c = corners[i];

            // Horizontal arm (extending outward from corner)
            if (c.showH) {
                var hx1 = c.x - c.hDir * offsetPt;
                var hx2 = hx1 - c.hDir * lengthPt;
                marks.push({ p1: [hx1, c.y], p2: [hx2, c.y] });
            }

            // Vertical arm (extending outward from corner)
            if (c.showV) {
                var vy1 = c.y - c.vDir * offsetPt;
                var vy2 = vy1 - c.vDir * lengthPt;
                marks.push({ p1: [c.x, vy1], p2: [c.x, vy2] });
            }
        }

        return marks;
    },

    /**
     * Calculates overlap indicator line positions.
     * These show where the net panel ends and the overlap zone begins.
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} overlapPt - Overlap in document points (full value).
     * @param {number} scale - Scale factor for real mm display.
     * @param {boolean} bothSides - If true, indicators on all inner edges.
     * @returns {Object[]} Array of indicator objects
     */
    calculateOverlapIndicators: function (panel, overlapPt, scale, bothSides) {
        var r = panel.rect;     // [L, T, R, B]
        var nr = panel.netRect; // [L, T, R, B]
        var indicators = [];
        var sc = scale || 1;
        var u = TP.Utils;
        var overlapRealMM = u.roundMM(u.pt2mm(overlapPt) * sc, 1);
        var labelText = TP.L.format(TP.L.MARK_OVERLAP_LABEL, overlapRealMM);
        var effOv = bothSides ? overlapPt / 2 : overlapPt;

        // Right inner edge
        if (!panel.isRightEdge) {
            var x = nr[2];
            indicators.push({
                p1: [x, r[1]], p2: [x, r[3]],
                labelPos: [x + effOv / 2, r[1] - u.mm2pt(2 / sc)],
                labelText: labelText
            });
        }

        // Bottom inner edge
        if (!panel.isBottomEdge) {
            var y = nr[3];
            indicators.push({
                p1: [r[0], y], p2: [r[2], y],
                labelPos: [r[0] + u.mm2pt(5 / sc), y - effOv / 2],
                labelText: labelText
            });
        }

        // Both-sides mode: also show indicators on left and top inner edges
        if (bothSides) {
            if (!panel.isLeftEdge) {
                var xl = nr[0];
                indicators.push({
                    p1: [xl, r[1]], p2: [xl, r[3]],
                    labelPos: [xl - effOv / 2, r[1] - u.mm2pt(2 / sc)],
                    labelText: labelText
                });
            }
            if (!panel.isTopEdge) {
                var yt = nr[1];
                indicators.push({
                    p1: [r[0], yt], p2: [r[2], yt],
                    labelPos: [r[0] + u.mm2pt(5 / sc), yt + effOv / 2],
                    labelText: labelText
                });
            }
        }

        return indicators;
    },

    /**
     * Calculates registration crosshair positions in the overlap zone.
     * Crosshairs at 1/4 and 3/4 of panel height/width within the overlap zone.
     *
     * @param {Object} panel - Panel object from calculateArtboardRects.
     * @param {number} overlapPt - Overlap in points (full value).
     * @param {number} armPt - Crosshair arm length in points.
     * @param {boolean} bothSides - If true, crosshairs on all inner edges.
     * @returns {Object[]} Array of crosshair objects: { center: [x,y], armPt: number }
     */
    calculateCrosshairPositions: function (panel, overlapPt, armPt, bothSides) {
        var r = panel.rect;
        var nr = panel.netRect;
        var positions = [];
        var effOv = bothSides ? overlapPt / 2 : overlapPt;

        var panelH = r[1] - r[3];
        var panelW = r[2] - r[0];

        // Right overlap zone crosshairs
        if (!panel.isRightEdge) {
            var cx = nr[2] + effOv / 2;
            positions.push({ center: [cx, r[3] + panelH * 0.25], armPt: armPt });
            positions.push({ center: [cx, r[3] + panelH * 0.75], armPt: armPt });
        }

        // Bottom overlap zone crosshairs
        if (!panel.isBottomEdge) {
            var cy = nr[3] - effOv / 2;
            positions.push({ center: [r[0] + panelW * 0.25, cy], armPt: armPt });
            positions.push({ center: [r[0] + panelW * 0.75, cy], armPt: armPt });
        }

        // Both-sides: also on left and top inner edges
        if (bothSides) {
            if (!panel.isLeftEdge) {
                var cxl = nr[0] - effOv / 2;
                positions.push({ center: [cxl, r[3] + panelH * 0.25], armPt: armPt });
                positions.push({ center: [cxl, r[3] + panelH * 0.75], armPt: armPt });
            }
            if (!panel.isTopEdge) {
                var cyt = nr[1] + effOv / 2;
                positions.push({ center: [r[0] + panelW * 0.25, cyt], armPt: armPt });
                positions.push({ center: [r[0] + panelW * 0.75, cyt], armPt: armPt });
            }
        }

        return positions;
    }
};

var TP = TP || {};

TP.Draw = {

    /** @private Storage for layer names locked at session start, restored on end. */
    _lockedLayers: [],
    /** @private Storage for layer names hidden at session start, restored on end. */
    _hiddenLayers: [],

    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    /**
     * Unlocks and makes all layers visible before manipulation.
     * Stores locked/hidden layer names so endSession() can restore them.
     */
    beginSession: function () {
        var doc = app.activeDocument;
        this._lockedLayers = [];
        this._hiddenLayers = [];
        for (var i = 0; i < doc.layers.length; i++) {
            try {
                if (doc.layers[i].locked) {
                    this._lockedLayers.push(doc.layers[i].name);
                    doc.layers[i].locked = false;
                }
                if (!doc.layers[i].visible) {
                    this._hiddenLayers.push(doc.layers[i].name);
                    doc.layers[i].visible = true;
                }
            } catch (e) {
                TP.Utils.log("beginSession: failed on layer — " + doc.layers[i].name);
            }
        }
    },

    /**
     * Restores layer locks/visibility cleared by beginSession().
     */
    endSession: function () {
        try {
            var doc = app.activeDocument;
            for (var i = 0; i < this._lockedLayers.length; i++) {
                try { doc.layers.getByName(this._lockedLayers[i]).locked = true; } catch (e) {}
            }
            for (var i = 0; i < this._hiddenLayers.length; i++) {
                try { doc.layers.getByName(this._hiddenLayers[i]).visible = false; } catch (e) {}
            }
        } catch (e) {}
        this._lockedLayers = [];
        this._hiddenLayers = [];
    },

    // -------------------------------------------------------------------------
    // Phase detection
    // -------------------------------------------------------------------------

    /**
     * Detects which phase to run by checking for the preview layer.
     * @returns {string} "SETUP" or "APPLY"
     */
    detectPhase: function () {
        try {
            app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            return "APPLY";
        } catch (e) {
            return "SETUP";
        }
    },

    // -------------------------------------------------------------------------
    // Artwork bounds
    // -------------------------------------------------------------------------

    /**
     * Returns the first artboard's rect as the artwork bounds.
     * @returns {Array} [left, top, right, bottom] in points.
     */
    getArtworkBounds: function () {
        var doc = app.activeDocument;
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        return ab.artboardRect; // [L, T, R, B]
    },

    // -------------------------------------------------------------------------
    // Layer helpers
    // -------------------------------------------------------------------------

    /**
     * Gets or creates a layer by name.
     * @param {string} name - Layer name.
     * @returns {Layer} The found or created layer.
     */
    getOrCreateLayer: function (name) {
        var doc = app.activeDocument;
        try {
            return doc.layers.getByName(name);
        } catch (e) {
            var lay = doc.layers.add();
            lay.name = name;
            return lay;
        }
    },

    /**
     * Removes a layer by name if it exists.
     * @param {string} name - Layer name.
     */
    removeLayer: function (name) {
        try {
            var lay = app.activeDocument.layers.getByName(name);
            lay.locked = false;
            lay.visible = true;
            lay.remove();
        } catch (e) {}
    },

    // -------------------------------------------------------------------------
    // Color helpers
    // -------------------------------------------------------------------------

    /**
     * Creates an RGB color.
     * @param {number} r - Red (0–255).
     * @param {number} g - Green (0–255).
     * @param {number} b - Blue (0–255).
     * @returns {RGBColor}
     */
    makeRGB: function (r, g, b) {
        var c = new RGBColor();
        c.red = r; c.green = g; c.blue = b;
        return c;
    },

    /**
     * Creates a CMYK color.
     * @param {number} c - Cyan (0–100).
     * @param {number} m - Magenta (0–100).
     * @param {number} y - Yellow (0–100).
     * @param {number} k - Black (0–100).
     * @returns {CMYKColor}
     */
    makeCMYK: function (c, m, y, k) {
        var col = new CMYKColor();
        col.cyan = c; col.magenta = m; col.yellow = y; col.black = k;
        return col;
    },

    /**
     * Returns Registration color (CMYK 100/100/100/100).
     * @returns {CMYKColor}
     */
    makeRegistration: function () {
        return this.makeCMYK(100, 100, 100, 100);
    },

    /**
     * Returns Cyan color (CMYK 100/0/0/0).
     * @returns {CMYKColor}
     */
    makeCyan: function () {
        return this.makeCMYK(100, 0, 0, 0);
    },

    // -------------------------------------------------------------------------
    // Phase 1: Split lines
    // -------------------------------------------------------------------------

    /**
     * Draws split lines and position labels on the preview layer.
     * Also stores params in a hidden textFrame.
     *
     * Split positions in grid are in REAL mm. Labels show real mm.
     * Document positions are calculated by dividing by the effective scale.
     *
     * @param {Object} grid - Result from TP.Core.calculateGrid.
     * @param {Array} artworkBounds - [L, T, R, B] in points.
     * @param {Object} params - Settings to store for Phase 2 (includes .scale).
     */
    drawSplitLines: function (grid, artworkBounds, params) {
        var doc = app.activeDocument;
        var lay = this.getOrCreateLayer(TP.Config.LAYER_PREVIEW);
        lay.locked = false;
        lay.printable = false;
        lay.visible = true;

        var cfg = TP.Config;
        var u = TP.Utils;
        // Effective scale: user scale combined with Illustrator's Large Canvas factor
        var scale = (params.scale || 1) * u.getSF();
        var extPt = u.mm2pt(cfg.SPLIT_LINE_EXTEND / scale);

        var aL = artworkBounds[0];
        var aT = artworkBounds[1];
        var aR = artworkBounds[2];
        var aB = artworkBounds[3];

        var strokeCol = this.makeRGB(255, 0, 0);

        // Vertical split lines (real mm → document points)
        var vSplits = grid.vResult.splits;
        for (var i = 0; i < vSplits.length; i++) {
            var xPt = aL + u.mm2pt(vSplits[i] / scale);
            var line = lay.pathItems.add();
            line.setEntirePath([[xPt, aT + extPt], [xPt, aB - extPt]]);
            line.stroked = true;
            line.strokeColor = strokeCol;
            line.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
            line.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
            line.filled = false;
            line.name = cfg.SPLIT_V_PREFIX + (i + 1);

            // Position label above the line — shows REAL mm
            var label = lay.textFrames.add();
            label.contents = u.roundMM(vSplits[i], 1) + " mm";
            label.textRange.characterAttributes.size = cfg.SPLIT_LABEL_SIZE;
            try { label.textRange.characterAttributes.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
            label.textRange.characterAttributes.fillColor = strokeCol;
            label.position = [xPt - u.mm2pt(8 / scale), aT + extPt + u.mm2pt(5 / scale)];
            label.name = cfg.SPLIT_V_PREFIX + (i + 1) + "_label";
        }

        // Horizontal split lines (real mm → document points)
        var hSplits = grid.hResult.splits;
        for (var i = 0; i < hSplits.length; i++) {
            var yPt = aT - u.mm2pt(hSplits[i] / scale);
            var line = lay.pathItems.add();
            line.setEntirePath([[aL - extPt, yPt], [aR + extPt, yPt]]);
            line.stroked = true;
            line.strokeColor = strokeCol;
            line.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
            line.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
            line.filled = false;
            line.name = cfg.SPLIT_H_PREFIX + (i + 1);

            // Position label to the left — shows REAL mm
            var label = lay.textFrames.add();
            label.contents = u.roundMM(hSplits[i], 1) + " mm";
            label.textRange.characterAttributes.size = cfg.SPLIT_LABEL_SIZE;
            try { label.textRange.characterAttributes.textFont = app.textFonts.getByName("Helvetica"); } catch (e) {}
            label.textRange.characterAttributes.fillColor = strokeCol;
            label.position = [aL - extPt - u.mm2pt(25 / scale), yPt + u.mm2pt(5 / scale)];
            label.name = cfg.SPLIT_H_PREFIX + (i + 1) + "_label";
        }

        // Overlap zone boundary lines (cyan dashed)
        var overlapPt = u.mm2pt((params.overlap || 0) / scale);
        if (overlapPt > 0) {
            var cyanCol = this.makeCMYK(100, 0, 0, 0);
            var bothSides = params.overlapBothSides;

            var _addCyanLine = function (p1, p2, name) {
                var ovLine = lay.pathItems.add();
                ovLine.setEntirePath([p1, p2]);
                ovLine.stroked = true;
                ovLine.strokeColor = cyanCol;
                ovLine.strokeWidth = cfg.SPLIT_LINE_WEIGHT;
                ovLine.strokeDashes = [cfg.SPLIT_LINE_DASH, cfg.SPLIT_LINE_GAP];
                ovLine.filled = false;
                ovLine.name = name;
            };

            for (var i = 0; i < vSplits.length; i++) {
                var xPt = aL + u.mm2pt(vSplits[i] / scale);
                if (bothSides) {
                    // Two cyan lines: ov/2 on each side of red split
                    _addCyanLine([xPt - overlapPt / 2, aT + extPt], [xPt - overlapPt / 2, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_ovL");
                    _addCyanLine([xPt + overlapPt / 2, aT + extPt], [xPt + overlapPt / 2, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_ovR");
                } else {
                    // One cyan line at right edge of overlap zone
                    _addCyanLine([xPt + overlapPt, aT + extPt], [xPt + overlapPt, aB - extPt],
                        cfg.SPLIT_V_PREFIX + (i + 1) + "_overlap");
                }
            }

            for (var i = 0; i < hSplits.length; i++) {
                var yPt = aT - u.mm2pt(hSplits[i] / scale);
                if (bothSides) {
                    // Two cyan lines: ov/2 on each side of red split
                    _addCyanLine([aL - extPt, yPt + overlapPt / 2], [aR + extPt, yPt + overlapPt / 2],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_ovT");
                    _addCyanLine([aL - extPt, yPt - overlapPt / 2], [aR + extPt, yPt - overlapPt / 2],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_ovB");
                } else {
                    // One cyan line at bottom edge of overlap zone
                    _addCyanLine([aL - extPt, yPt - overlapPt], [aR + extPt, yPt - overlapPt],
                        cfg.SPLIT_H_PREFIX + (i + 1) + "_overlap");
                }
            }
        }

        // Store params for Phase 2
        this.storeParams(lay, params);
    },

    /**
     * Stores parameters as a hidden textFrame on the given layer.
     * @param {Layer} layer - Target layer.
     * @param {Object} params - Settings object.
     */
    storeParams: function (layer, params) {
        var tf = layer.textFrames.add();
        tf.contents = TP.Config.DATA_FRAME_PREFIX + JSON.stringify(params);
        tf.position = [-10000, -10000];
        tf.textRange.characterAttributes.size = 1;
        tf.name = TP.Config.DATA_FRAME_PREFIX;
    },

    /**
     * Reads stored parameters from the hidden textFrame on the preview layer.
     * @returns {Object|null} Parsed settings or null.
     */
    readStoredParams: function () {
        try {
            var lay = app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            for (var i = 0; i < lay.textFrames.length; i++) {
                var tf = lay.textFrames[i];
                if (tf.name === TP.Config.DATA_FRAME_PREFIX) {
                    var raw = tf.contents;
                    var prefix = TP.Config.DATA_FRAME_PREFIX;
                    if (raw.indexOf(prefix) === 0) {
                        return JSON.parse(raw.substring(prefix.length));
                    }
                }
            }
        } catch (e) {
            TP.Utils.log("readStoredParams failed: " + e.message);
        }
        return null;
    },

    // -------------------------------------------------------------------------
    // Phase 2: Read split positions
    // -------------------------------------------------------------------------

    /**
     * Reads current positions of split line pathItems from the preview layer.
     * Filters by name prefix, sorts, deduplicates.
     *
     * @returns {Object} { splitsV: number[], splitsH: number[] } in document points.
     */
    readSplitPositions: function () {
        var splitsV = [];
        var splitsH = [];

        try {
            var lay = app.activeDocument.layers.getByName(TP.Config.LAYER_PREVIEW);
            var items = lay.pathItems;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var name = item.name;

                // Only match pure split lines (SplitV_1, SplitH_2, etc.)
                // Skip overlap preview lines (_overlap, _ovL, _ovR, _ovT, _ovB)
                if (name.indexOf(TP.Config.SPLIT_V_PREFIX) === 0) {
                    var suffix = name.substring(TP.Config.SPLIT_V_PREFIX.length);
                    if (suffix.indexOf("_") !== -1) continue; // skip _overlap, _ovL, _ovR
                    var gb = item.geometricBounds;
                    var xPos = (gb[0] + gb[2]) / 2;
                    splitsV.push(xPos);
                } else if (name.indexOf(TP.Config.SPLIT_H_PREFIX) === 0) {
                    var suffix = name.substring(TP.Config.SPLIT_H_PREFIX.length);
                    if (suffix.indexOf("_") !== -1) continue; // skip _overlap, _ovT, _ovB
                    var gb = item.geometricBounds;
                    var yPos = (gb[1] + gb[3]) / 2;
                    splitsH.push(yPos);
                }
            }
        } catch (e) {
            TP.Utils.log("readSplitPositions failed: " + e.message);
        }

        // Sort: V splits ascending (left to right), H splits descending (top to bottom)
        splitsV.sort(function (a, b) { return a - b; });
        splitsH.sort(function (a, b) { return b - a; });

        // Deduplicate: remove positions closer than 1pt
        splitsV = this._deduplicate(splitsV);
        splitsH = this._deduplicate(splitsH);

        return { splitsV: splitsV, splitsH: splitsH };
    },

    /**
     * Removes duplicate positions that are within 1pt of each other.
     * @param {number[]} arr - Sorted array of positions.
     * @returns {number[]} Deduplicated array.
     */
    _deduplicate: function (arr) {
        if (arr.length < 2) return arr;
        var result = [arr[0]];
        for (var i = 1; i < arr.length; i++) {
            if (Math.abs(arr[i] - result[result.length - 1]) > 1) {
                result.push(arr[i]);
            }
        }
        return result;
    },

    // -------------------------------------------------------------------------
    // Phase 2: Create artboards
    // -------------------------------------------------------------------------

    /**
     * Creates artboards for all panels. Optionally removes the original artboard.
     *
     * @param {Object[]} panels - Panel array from TP.Core.calculateArtboardRects.
     * @param {boolean} keepOriginal - If true, keep the original artboard.
     */
    createArtboards: function (panels, keepOriginal) {
        var doc = app.activeDocument;

        // Suppress alerts during batch creation
        var prevLevel = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        try {
            // Store original artboard index
            var origIdx = doc.artboards.getActiveArtboardIndex();

            // Create new artboards
            for (var i = 0; i < panels.length; i++) {
                var p = panels[i];
                var ab = doc.artboards.add(p.rect);
                ab.name = p.label;
            }

            // Remove original artboard if requested
            if (!keepOriginal) {
                doc.artboards.remove(origIdx);
            }
        } finally {
            app.userInteractionLevel = prevLevel;
        }
    },

    // -------------------------------------------------------------------------
    // Phase 2: Assembly marks
    // -------------------------------------------------------------------------

    /**
     * Draws all assembly marks for the given panels.
     *
     * @param {Object[]} panels - Panel array from TP.Core.calculateArtboardRects.
     * @param {Object} options - Mark options from Apply dialog (includes .scale).
     * @param {number} overlapPt - Overlap in document points.
     * @param {string} filename - Document filename for job info label.
     */
    drawAllMarks: function (panels, options, overlapPt, filename) {
        var lay = this.getOrCreateLayer(TP.Config.LAYER_MARKS);
        lay.locked = false;
        lay.printable = true;
        lay.visible = true;

        var cfg = TP.Config;
        var u = TP.Utils;
        // Effective scale: user scale × Illustrator Large Canvas factor
        var scale = (options.scale || 1) * u.getSF();
        var lengthPt = u.mm2pt(cfg.CROP_MARK_LENGTH / scale);
        var offsetPt = u.mm2pt(cfg.CROP_MARK_OFFSET / scale);
        var armPt = u.mm2pt(cfg.CROSSHAIR_ARM / scale);
        var labelOffPt = u.mm2pt(cfg.LABEL_OFFSET / scale);

        var numCols = 0;
        var numRows = 0;
        for (var i = 0; i < panels.length; i++) {
            if (panels[i].col + 1 > numCols) numCols = panels[i].col + 1;
            if (panels[i].row + 1 > numRows) numRows = panels[i].row + 1;
        }

        for (var i = 0; i < panels.length; i++) {
            var p = panels[i];

            if (options.markCropMarks) {
                this._drawCropMarks(lay, p, lengthPt, offsetPt);
            }

            if (options.markLabels) {
                this._drawPanelLabel(lay, p, numCols, numRows, panels.length, filename, labelOffPt, scale);
            }

            if (options.markOverlapIndicators) {
                var indicators = TP.Core.calculateOverlapIndicators(p, overlapPt, scale, options.overlapBothSides);
                this._drawOverlapIndicators(lay, indicators);
            }

            if (options.markCrosshairs) {
                var crosshairs = TP.Core.calculateCrosshairPositions(p, overlapPt, armPt, options.overlapBothSides);
                this._drawCrosshairs(lay, crosshairs);
            }
        }

        // Job info on first panel
        if (options.markLabels && panels.length > 0) {
            this._drawJobInfo(lay, panels[0], numCols, numRows, panels.length,
                              overlapPt, filename, labelOffPt, scale, options.scale || 1);
        }

        lay.locked = true;
    },

    /**
     * Draws L-shaped crop marks for one panel.
     * @private
     */
    _drawCropMarks: function (layer, panel, lengthPt, offsetPt) {
        var marks = TP.Core.calculateCropMarks(panel, lengthPt, offsetPt);
        var regColor = this.makeRegistration();

        for (var i = 0; i < marks.length; i++) {
            var m = marks[i];
            var line = layer.pathItems.add();
            line.setEntirePath([m.p1, m.p2]);
            line.stroked = true;
            line.strokeColor = regColor;
            line.strokeWidth = TP.Config.CROP_MARK_WEIGHT;
            line.filled = false;
        }
    },

    /**
     * Draws panel identification label in slug area.
     * Dimensions shown in real mm (document pt × scale).
     * @private
     */
    _drawPanelLabel: function (layer, panel, numCols, numRows, total, filename, labelOffPt, scale) {
        var r = panel.rect;
        var u = TP.Utils;
        // Convert document points to real mm: pt → doc mm → × scale = real mm
        var wMM = u.roundMM(u.pt2mm(r[2] - r[0]) * scale, 1);
        var hMM = u.roundMM(u.pt2mm(r[1] - r[3]) * scale, 1);
        var colNum = panel.col + 1;
        var rowNum = panel.row + 1;
        var totalCols = numCols;

        var text = TP.L.format(TP.L.MARK_PANEL_LABEL,
            rowNum, colNum, wMM, hMM, colNum, totalCols);

        var tf = layer.textFrames.add();
        tf.contents = text;
        tf.textRange.characterAttributes.size = TP.Config.LABEL_FONT_SIZE;
        try {
            tf.textRange.characterAttributes.textFont =
                app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
        } catch (e) {}
        tf.textRange.characterAttributes.fillColor = this.makeCMYK(0, 0, 0, 100);
        tf.position = [r[0] + labelOffPt, r[1] + labelOffPt];
    },

    /**
     * Draws job info label on the first panel.
     * @private
     */
    _drawJobInfo: function (layer, panel, numCols, numRows, total, overlapPt, filename, labelOffPt, scale, userScale) {
        var u = TP.Utils;
        var overlapMM = u.roundMM(u.pt2mm(overlapPt) * scale, 1);
        var text = TP.L.format(TP.L.MARK_JOB_INFO,
            filename, numCols, numRows, total, overlapMM, userScale);

        var r = panel.rect;
        var tf = layer.textFrames.add();
        tf.contents = text;
        tf.textRange.characterAttributes.size = TP.Config.LABEL_FONT_SIZE;
        try {
            tf.textRange.characterAttributes.textFont =
                app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
        } catch (e) {}
        tf.textRange.characterAttributes.fillColor = this.makeCMYK(0, 0, 0, 100);
        // Place below the panel label (toward artboard = subtract Y in Y-up)
        tf.position = [r[0] + labelOffPt, r[1] + labelOffPt - u.mm2pt(5 / scale)];
    },

    /**
     * Draws overlap indicator lines and labels.
     * @private
     */
    _drawOverlapIndicators: function (layer, indicators) {
        var cyanColor = this.makeCyan();
        var cfg = TP.Config;

        for (var i = 0; i < indicators.length; i++) {
            var ind = indicators[i];

            // Dashed line at split boundary
            var line = layer.pathItems.add();
            line.setEntirePath([ind.p1, ind.p2]);
            line.stroked = true;
            line.strokeColor = cyanColor;
            line.strokeWidth = cfg.OVERLAP_IND_WEIGHT;
            line.strokeDashes = [cfg.OVERLAP_IND_DASH, cfg.OVERLAP_IND_GAP];
            line.filled = false;

            // Label
            var tf = layer.textFrames.add();
            tf.contents = ind.labelText;
            tf.textRange.characterAttributes.size = cfg.OVERLAP_LABEL_SIZE;
            try {
                tf.textRange.characterAttributes.textFont =
                    app.textFonts.getByName(TP.Config.LABEL_FONT_NAME);
            } catch (e) {}
            tf.textRange.characterAttributes.fillColor = cyanColor;
            tf.position = ind.labelPos;
        }
    },

    /**
     * Draws registration crosshairs in the overlap zone.
     * @private
     */
    _drawCrosshairs: function (layer, positions) {
        var regColor = this.makeRegistration();

        for (var i = 0; i < positions.length; i++) {
            var ch = positions[i];
            var cx = ch.center[0];
            var cy = ch.center[1];
            var arm = ch.armPt;

            // Horizontal arm
            var hLine = layer.pathItems.add();
            hLine.setEntirePath([[cx - arm, cy], [cx + arm, cy]]);
            hLine.stroked = true;
            hLine.strokeColor = regColor;
            hLine.strokeWidth = TP.Config.CROSSHAIR_WEIGHT;
            hLine.filled = false;

            // Vertical arm
            var vLine = layer.pathItems.add();
            vLine.setEntirePath([[cx, cy + arm], [cx, cy - arm]]);
            vLine.stroked = true;
            vLine.strokeColor = regColor;
            vLine.strokeWidth = TP.Config.CROSSHAIR_WEIGHT;
            vLine.filled = false;
        }
    },

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    /**
     * Removes the preview layer and all its contents.
     */
    removePreviewLayer: function () {
        this.removeLayer(TP.Config.LAYER_PREVIEW);
    }
};

var TP = TP || {};

TP.UI = {

    // =====================================================================
    // Row helper — standard labeled input row
    // =====================================================================

    /**
     * Adds a labeled numeric input row with optional unit suffix.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label - Row label (from locale).
     * @param {*} value - Initial value.
     * @param {string} tip - HelpTip string (from locale).
     * @param {string} [unit] - Unit suffix, e.g. "mm" (optional).
     * @returns {Object} { inp: EditText, group: Group }
     */
    addRow: function (parent, label, value, tip, unit) {
        var g = parent.add("group");
        g.alignment = ["fill", "top"];
        g.spacing = 8;
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var et = g.add("edittext", undefined, String(value));
        et.preferredSize.width = 60;
        if (tip) et.helpTip = tip;
        if (unit) g.add("statictext", undefined, unit);
        return { inp: et, group: g };
    },

    // =====================================================================
    // Phase 1: Setup dialog
    // =====================================================================

    /**
     * Shows the Phase 1 setup dialog.
     *
     * @param {Object} defaults - Default/saved settings.
     * @param {Object} artworkInfo - { widthMM, heightMM } (document mm, not real).
     * @returns {Object|null} Settings object or null on cancel.
     */
    showSetup: function (defaults, artworkInfo) {
        var l = TP.L;
        var cfg = TP.Config;
        var self = this;
        var u = TP.Utils;

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", l.TITLE_SETUP);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 20;
        w.spacing = 15;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Source artwork + Scale
        // =================================================================
        var pSource = w.add("panel", undefined, l.PANEL_SOURCE);
        pSource.alignChildren = ["fill", "top"];
        pSource.margins = 15;
        pSource.spacing = 10;

        // Artboard size (document mm)
        var grpAb = pSource.add("group");
        grpAb.alignment = ["fill", "top"];
        grpAb.spacing = 8;
        var stAbLabel = grpAb.add("statictext", undefined, l.LBL_ARTBOARD_SIZE);
        stAbLabel.preferredSize.width = 160;
        var stAbSize = grpAb.add("statictext", undefined,
            u.roundMM(artworkInfo.widthMM, 1) + " \u00d7 " +
            u.roundMM(artworkInfo.heightMM, 1) + " " + l.UNIT_MM);

        // Scale
        var grpScale = pSource.add("group");
        grpScale.alignment = ["fill", "top"];
        grpScale.spacing = 8;
        var stScaleLabel = grpScale.add("statictext", undefined, l.LBL_SCALE);
        stScaleLabel.preferredSize.width = 160;
        stScaleLabel.helpTip = l.TIP_SCALE;
        var etScale = grpScale.add("edittext", undefined, String(defaults.scale));
        etScale.preferredSize.width = 60;
        etScale.helpTip = l.TIP_SCALE;

        // Real size (dynamic)
        var grpReal = pSource.add("group");
        grpReal.alignment = ["fill", "top"];
        grpReal.spacing = 8;
        var stRealLabel = grpReal.add("statictext", undefined, l.LBL_REAL_SIZE);
        stRealLabel.preferredSize.width = 160;
        var stRealSize = grpReal.add("statictext", undefined, "");
        stRealSize.preferredSize.width = 180;

        function getScale() {
            var s = parseFloat(String(etScale.text).replace(/,/g, ".")) || 1;
            return s < 1 ? 1 : s;
        }

        function updateRealSize() {
            var sc = getScale();
            var rw = u.roundMM(artworkInfo.widthMM * sc, 1);
            var rh = u.roundMM(artworkInfo.heightMM * sc, 1);
            stRealSize.text = rw + " \u00d7 " + rh + " " + l.UNIT_MM;
        }
        updateRealSize();

        // =================================================================
        // Panel: Panel size (mode radio)
        // =================================================================
        var pPanel = w.add("panel", undefined, l.PANEL_PANEL_SIZE);
        pPanel.alignChildren = ["fill", "top"];
        pPanel.margins = 15;
        pPanel.spacing = 10;

        // Mode radio buttons
        var grpMode = pPanel.add("group");
        grpMode.alignment = ["fill", "top"];
        grpMode.spacing = 8;
        var rbMaxWidth = grpMode.add("radiobutton", undefined, l.LBL_MODE_MAX_WIDTH);
        rbMaxWidth.helpTip = l.TIP_MODE_MAX_WIDTH;
        var rbCount = grpMode.add("radiobutton", undefined, l.LBL_MODE_COUNT);
        rbCount.helpTip = l.TIP_MODE_COUNT;
        rbMaxWidth.value = (defaults.mode !== "panelCount");
        rbCount.value = (defaults.mode === "panelCount");

        // --- Max width fields ---
        var grpMW = pPanel.add("group");
        grpMW.orientation = "column";
        grpMW.alignment = ["fill", "top"];
        grpMW.alignChildren = ["fill", "top"];
        grpMW.spacing = 10;

        var rWidth = self.addRow(grpMW, l.LBL_PANEL_WIDTH, defaults.maxPanelWidth,
                                 l.TIP_PANEL_WIDTH, l.UNIT_MM);
        var rHeight = self.addRow(grpMW, l.LBL_PANEL_HEIGHT,
                                  defaults.maxPanelHeight || 0,
                                  l.TIP_PANEL_HEIGHT, l.UNIT_MM);

        var stHintH = grpMW.add("statictext", undefined, l.LBL_HEIGHT_HINT);
        stHintH.alignment = ["fill", "top"];

        // Redistribution checkbox + percentage
        var grpRedist = grpMW.add("group");
        grpRedist.alignment = ["fill", "top"];
        grpRedist.spacing = 8;
        var cbRedist = grpRedist.add("checkbox", undefined, l.LBL_REDISTRIBUTE);
        cbRedist.value = defaults.redistribute;
        cbRedist.helpTip = l.TIP_REDISTRIBUTE;
        var etRedistPct = grpRedist.add("edittext", undefined, String(defaults.redistributePct));
        etRedistPct.preferredSize.width = 40;
        etRedistPct.helpTip = l.TIP_REDISTRIBUTE;
        grpRedist.add("statictext", undefined, l.UNIT_PCT);

        // --- Panel count fields ---
        var grpPC = pPanel.add("group");
        grpPC.orientation = "column";
        grpPC.alignment = ["fill", "top"];
        grpPC.alignChildren = ["fill", "top"];
        grpPC.spacing = 10;

        var rCols = self.addRow(grpPC, l.LBL_COLUMNS, defaults.columns,
                                l.TIP_COLUMNS, "");
        var rRows = self.addRow(grpPC, l.LBL_ROWS, defaults.rows,
                                l.TIP_ROWS, "");
        var stHintR = grpPC.add("statictext", undefined, l.LBL_ROWS_HINT);
        stHintR.alignment = ["fill", "top"];

        // Mode toggle
        function updateMode() {
            var isMW = rbMaxWidth.value;
            grpMW.visible = isMW;
            grpPC.visible = !isMW;
            updatePreview();
        }

        rbMaxWidth.onClick = updateMode;
        rbCount.onClick = updateMode;
        updateMode();

        // =================================================================
        // Panel: Overlap
        // =================================================================
        var pOverlap = w.add("panel", undefined, l.PANEL_OVERLAP);
        pOverlap.alignChildren = ["fill", "top"];
        pOverlap.margins = 15;
        pOverlap.spacing = 10;

        var rOverlap = self.addRow(pOverlap, l.LBL_OVERLAP, defaults.overlap,
                                   l.TIP_OVERLAP, l.UNIT_MM);

        var grpOvBoth = pOverlap.add("group");
        grpOvBoth.alignment = ["fill", "top"];
        var cbOverlapBoth = grpOvBoth.add("checkbox", undefined, l.LBL_OVERLAP_BOTH);
        cbOverlapBoth.value = defaults.overlapBothSides || false;
        cbOverlapBoth.helpTip = l.TIP_OVERLAP_BOTH;

        // =================================================================
        // Panel: Bleed
        // =================================================================
        var pBleed = w.add("panel", undefined, l.PANEL_BLEED);
        pBleed.alignChildren = ["fill", "top"];
        pBleed.margins = 15;
        pBleed.spacing = 10;

        // Uniform row
        var grpUni = pBleed.add("group");
        grpUni.alignment = ["fill", "top"];
        grpUni.spacing = 8;
        var cbUniform = grpUni.add("checkbox", undefined, l.LBL_BLEED_UNIFORM);
        cbUniform.value = defaults.bleedUniform;
        cbUniform.helpTip = l.TIP_BLEED_UNIFORM;
        var etBleedUni = grpUni.add("edittext", undefined, String(defaults.bleed));
        etBleedUni.preferredSize.width = 60;
        etBleedUni.helpTip = l.TIP_BLEED_UNIFORM;
        grpUni.add("statictext", undefined, l.UNIT_MM);

        // Per-edge row
        var grpEdge = pBleed.add("group");
        grpEdge.alignment = ["fill", "top"];
        grpEdge.spacing = 4;
        var stEdge = grpEdge.add("statictext", undefined, l.LBL_BLEED_PER_EDGE);
        stEdge.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_TOP);
        var etBT = grpEdge.add("edittext", undefined, String(defaults.bleedTop));
        etBT.preferredSize.width = 40; etBT.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_BOTTOM);
        var etBB = grpEdge.add("edittext", undefined, String(defaults.bleedBottom));
        etBB.preferredSize.width = 40; etBB.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_LEFT);
        var etBL = grpEdge.add("edittext", undefined, String(defaults.bleedLeft));
        etBL.preferredSize.width = 40; etBL.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_RIGHT);
        var etBR = grpEdge.add("edittext", undefined, String(defaults.bleedRight));
        etBR.preferredSize.width = 40; etBR.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.UNIT_MM);

        function updateBleedState() {
            var uni = cbUniform.value;
            etBleedUni.enabled = uni;
            etBT.enabled = !uni;
            etBB.enabled = !uni;
            etBL.enabled = !uni;
            etBR.enabled = !uni;
        }
        cbUniform.onClick = function () {
            updateBleedState();
            updatePreview();
        };
        updateBleedState();

        // =================================================================
        // Panel: Options
        // =================================================================
        var pOpts = w.add("panel", undefined, l.PANEL_OPTIONS);
        pOpts.alignChildren = ["fill", "top"];
        pOpts.margins = 15;
        pOpts.spacing = 10;

        var grpKeep = pOpts.add("group");
        grpKeep.alignment = ["fill", "top"];
        var cbKeep = grpKeep.add("checkbox", undefined, l.LBL_KEEP_ORIGINAL);
        cbKeep.value = defaults.keepOriginalArtboard;
        cbKeep.helpTip = l.TIP_KEEP_ORIGINAL;

        // =================================================================
        // Panel: Preview (dynamically updated)
        // =================================================================
        var pPreview = w.add("panel", undefined, l.PANEL_PREVIEW);
        pPreview.alignChildren = ["fill", "top"];
        pPreview.margins = 15;
        pPreview.spacing = 6;

        var stPreviewGrid = pPreview.add("statictext", undefined, "");
        var stPreviewDims = pPreview.add("statictext", undefined, "");
        var stPreviewDoc = pPreview.add("statictext", undefined, "");
        var stPreviewNote = pPreview.add("statictext", undefined, "");

        function updatePreview() {
            if (!stPreviewGrid) return; // Guard: preview panel not yet constructed
            var sc = getScale();
            var realW = artworkInfo.widthMM * sc;
            var realH = artworkInfo.heightMM * sc;

            updateRealSize();

            var gridParams = {
                artworkWidthMM: realW,
                artworkHeightMM: realH
            };

            if (rbMaxWidth.value) {
                gridParams.mode = "maxWidth";
                gridParams.maxPanelWidth = parseFloat(String(rWidth.inp.text).replace(/,/g, ".")) || 0;
                gridParams.maxPanelHeight = parseFloat(String(rHeight.inp.text).replace(/,/g, ".")) || 0;
                gridParams.redistribute = cbRedist.value;
                gridParams.redistributePct = parseFloat(String(etRedistPct.text).replace(/,/g, ".")) || 30;
            } else {
                gridParams.mode = "panelCount";
                gridParams.columns = parseInt(rCols.inp.text, 10) || 1;
                gridParams.rows = parseInt(rRows.inp.text, 10) || 1;
            }

            if (gridParams.mode === "maxWidth" && gridParams.maxPanelWidth <= 0) {
                stPreviewGrid.text = "";
                stPreviewDims.text = "";
                stPreviewDoc.text = "";
                stPreviewNote.text = "";
                return;
            }

            var grid = TP.Core.calculateGrid(gridParams);
            var total = grid.totalPanels;

            if (total <= 1 && grid.columns <= 1 && grid.rows <= 1) {
                stPreviewGrid.text = l.LBL_PREVIEW_NO_TILE;
                stPreviewDims.text = "";
                stPreviewDoc.text = "";
                stPreviewNote.text = "";
                return;
            }

            stPreviewGrid.text = l.format(l.LBL_PREVIEW_GRID,
                grid.columns, grid.rows, total);

            // Show real panel dimensions
            var dimParts = [];
            if (grid.columns > 1 || gridParams.mode === "panelCount") {
                dimParts.push(u.roundMM(grid.vResult.panelDimMM, 1));
            }
            if (grid.rows > 1) {
                dimParts.push(u.roundMM(grid.hResult.panelDimMM, 1));
            }
            stPreviewDims.text = l.format(l.LBL_PREVIEW_DIMS,
                dimParts.join(" \u00d7 "));

            // Show document dimensions if scale > 1
            if (sc > 1) {
                var docParts = [];
                if (dimParts.length > 0) {
                    docParts.push(u.roundMM(grid.vResult.panelDimMM / sc, 1));
                }
                if (grid.rows > 1) {
                    docParts.push(u.roundMM(grid.hResult.panelDimMM / sc, 1));
                }
                stPreviewDoc.text = l.format(l.LBL_PREVIEW_DIMS_DOC,
                    docParts.join(" \u00d7 "));
            } else {
                stPreviewDoc.text = "";
            }

            var noteText = "";
            if (grid.vResult.redistributed) {
                noteText += l.format(l.LBL_PREVIEW_REDIST, gridParams.maxPanelWidth);
            }
            if (grid.hResult.redistributed) {
                if (noteText) noteText += " ";
                noteText += l.format(l.LBL_PREVIEW_REDIST, gridParams.maxPanelHeight);
            }
            if (total > 100) {
                if (noteText) noteText += "\n";
                noteText += l.format(l.LBL_PREVIEW_WARN_COUNT, total);
            }
            stPreviewNote.text = noteText;
        }

        // Wire onChange listeners for dynamic preview
        rWidth.inp.onChanging = updatePreview;
        rHeight.inp.onChanging = updatePreview;
        rCols.inp.onChanging = updatePreview;
        rRows.inp.onChanging = updatePreview;
        etScale.onChanging = updatePreview;
        cbRedist.onClick = updatePreview;
        etRedistPct.onChanging = updatePreview;

        // Initial preview
        updatePreview();

        // =================================================================
        // Footer
        // =================================================================
        var grpFooter = w.add("group");
        grpFooter.alignment = ["fill", "top"];
        var stCopy = grpFooter.add("statictext", undefined,
            "\u00a9 " + cfg.COPYRIGHT_YEAR + " " + cfg.AUTHOR +
            " \u2014 " + cfg.SCRIPT_NAME + " v" + cfg.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Buttons
        // =================================================================
        var grpBtns = w.add("group");
        grpBtns.alignment = "right";
        grpBtns.spacing = 8;
        grpBtns.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        grpBtns.add("button", undefined, l.BTN_PLACE, { name: "ok" });

        // =================================================================
        // Validation and result
        // =================================================================
        w.defaultElement = grpBtns.children[1]; // OK button
        grpBtns.children[1].onClick = function () {
            var v = TP.Utils.validateNumber;

            var scale = v(etScale.text, 1, 1000, l.LBL_SCALE);
            if (scale === null) return;

            var mode = rbMaxWidth.value ? "maxWidth" : "panelCount";
            var maxW = 0, maxH = 0, cols = 1, rows = 1;
            var redist = false, redistPct = 30;

            if (mode === "maxWidth") {
                maxW = v(rWidth.inp.text, 1, 999999, l.LBL_PANEL_WIDTH);
                if (maxW === null) return;

                var maxHRaw = String(rHeight.inp.text).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
                if (maxHRaw !== "" && maxHRaw !== "0") {
                    maxH = v(maxHRaw, 1, 999999, l.LBL_PANEL_HEIGHT);
                    if (maxH === null) return;
                }

                redist = cbRedist.value;
                if (redist) {
                    redistPct = v(etRedistPct.text, 1, 90, l.LBL_REDISTRIBUTE);
                    if (redistPct === null) return;
                }
            } else {
                cols = v(rCols.inp.text, 1, 999, l.LBL_COLUMNS);
                if (cols === null) return;
                cols = Math.round(cols);

                rows = v(rRows.inp.text, 1, 999, l.LBL_ROWS);
                if (rows === null) return;
                rows = Math.round(rows);
            }

            var overlap = v(rOverlap.inp.text, 0, 99999, l.LBL_OVERLAP);
            if (overlap === null) return;

            var bleedUni = cbUniform.value;
            var bleedVal, bT, bB, bL, bR;

            if (bleedUni) {
                bleedVal = v(etBleedUni.text, 0, 9999, l.LBL_BLEED_UNIFORM);
                if (bleedVal === null) return;
                bT = bB = bL = bR = bleedVal;
            } else {
                bT = v(etBT.text, 0, 9999, l.LBL_BLEED_TOP);    if (bT === null) return;
                bB = v(etBB.text, 0, 9999, l.LBL_BLEED_BOTTOM);  if (bB === null) return;
                bL = v(etBL.text, 0, 9999, l.LBL_BLEED_LEFT);    if (bL === null) return;
                bR = v(etBR.text, 0, 9999, l.LBL_BLEED_RIGHT);   if (bR === null) return;
                bleedVal = bT;
            }

            w.result = {
                scale:           scale,
                mode:            mode,
                maxPanelWidth:   maxW,
                maxPanelHeight:  maxH,
                redistribute:    redist,
                redistributePct: redistPct,
                columns:         cols,
                rows:            rows,
                overlap:         overlap,
                overlapBothSides: cbOverlapBoth.value,
                bleedUniform:    bleedUni,
                bleed:           bleedVal,
                bleedTop:        bT,
                bleedBottom:     bB,
                bleedLeft:       bL,
                bleedRight:      bR,
                keepOriginalArtboard: cbKeep.value,
                markCropMarks:      defaults.markCropMarks,
                markLabels:         defaults.markLabels,
                markOverlapIndicators: defaults.markOverlapIndicators,
                markCrosshairs:     defaults.markCrosshairs
            };
            w.close(1);
        };

        if (w.show() === 1) {
            return w.result;
        }
        return null;
    },

    // =====================================================================
    // Phase 2: Apply dialog
    // =====================================================================

    /**
     * Shows the Phase 2 apply dialog.
     *
     * @param {Object} storedParams - Params from Phase 1 (pre-fills).
     * @param {Object} splitInfo - { splitsV: [], splitsH: [] } counts.
     * @returns {Object|null} Options object or null on cancel.
     */
    showApply: function (storedParams, splitInfo) {
        var l = TP.L;
        var cfg = TP.Config;
        var self = this;
        var defaults = storedParams || cfg.getDefaults();

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", l.TITLE_APPLY);
        w.orientation = "column";
        w.alignChildren = ["fill", "top"];
        w.margins = 20;
        w.spacing = 15;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Split lines found
        // =================================================================
        var pSplits = w.add("panel", undefined, l.PANEL_SPLITS);
        pSplits.alignChildren = ["fill", "top"];
        pSplits.margins = 15;
        pSplits.spacing = 10;

        var grpSV = pSplits.add("group");
        grpSV.spacing = 8;
        grpSV.add("statictext", undefined, l.LBL_SPLITS_V);
        grpSV.add("statictext", undefined, String(splitInfo.splitsV.length));

        var grpSH = pSplits.add("group");
        grpSH.spacing = 8;
        grpSH.add("statictext", undefined, l.LBL_SPLITS_H);
        grpSH.add("statictext", undefined, String(splitInfo.splitsH.length));

        // =================================================================
        // Panel: Overlap
        // =================================================================
        var pOverlap = w.add("panel", undefined, l.PANEL_OVERLAP);
        pOverlap.alignChildren = ["fill", "top"];
        pOverlap.margins = 15;
        pOverlap.spacing = 10;

        var rOverlap = self.addRow(pOverlap, l.LBL_OVERLAP, defaults.overlap,
                                   l.TIP_OVERLAP, l.UNIT_MM);

        var grpOvBoth = pOverlap.add("group");
        grpOvBoth.alignment = ["fill", "top"];
        var cbOverlapBoth = grpOvBoth.add("checkbox", undefined, l.LBL_OVERLAP_BOTH);
        cbOverlapBoth.value = defaults.overlapBothSides || false;
        cbOverlapBoth.helpTip = l.TIP_OVERLAP_BOTH;

        // =================================================================
        // Panel: Bleed
        // =================================================================
        var pBleed = w.add("panel", undefined, l.PANEL_BLEED);
        pBleed.alignChildren = ["fill", "top"];
        pBleed.margins = 15;
        pBleed.spacing = 10;

        var grpUni = pBleed.add("group");
        grpUni.alignment = ["fill", "top"];
        grpUni.spacing = 8;
        var cbUniform = grpUni.add("checkbox", undefined, l.LBL_BLEED_UNIFORM);
        cbUniform.value = defaults.bleedUniform;
        cbUniform.helpTip = l.TIP_BLEED_UNIFORM;
        var etBleedUni = grpUni.add("edittext", undefined, String(defaults.bleed));
        etBleedUni.preferredSize.width = 60;
        etBleedUni.helpTip = l.TIP_BLEED_UNIFORM;
        grpUni.add("statictext", undefined, l.UNIT_MM);

        var grpEdge = pBleed.add("group");
        grpEdge.alignment = ["fill", "top"];
        grpEdge.spacing = 4;
        var stEdge = grpEdge.add("statictext", undefined, l.LBL_BLEED_PER_EDGE);
        stEdge.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_TOP);
        var etBT = grpEdge.add("edittext", undefined, String(defaults.bleedTop));
        etBT.preferredSize.width = 40; etBT.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_BOTTOM);
        var etBB = grpEdge.add("edittext", undefined, String(defaults.bleedBottom));
        etBB.preferredSize.width = 40; etBB.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_LEFT);
        var etBL = grpEdge.add("edittext", undefined, String(defaults.bleedLeft));
        etBL.preferredSize.width = 40; etBL.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.LBL_BLEED_RIGHT);
        var etBR = grpEdge.add("edittext", undefined, String(defaults.bleedRight));
        etBR.preferredSize.width = 40; etBR.helpTip = l.TIP_BLEED_PER_EDGE;

        grpEdge.add("statictext", undefined, l.UNIT_MM);

        function updateBleedState() {
            var uni = cbUniform.value;
            etBleedUni.enabled = uni;
            etBT.enabled = !uni;
            etBB.enabled = !uni;
            etBL.enabled = !uni;
            etBR.enabled = !uni;
        }
        cbUniform.onClick = updateBleedState;
        updateBleedState();

        // =================================================================
        // Panel: Assembly marks
        // =================================================================
        var pMarks = w.add("panel", undefined, l.PANEL_MARKS);
        pMarks.alignChildren = ["fill", "top"];
        pMarks.margins = 15;
        pMarks.spacing = 10;

        var cbCrop = pMarks.add("checkbox", undefined, l.LBL_MARK_CROP);
        cbCrop.value = defaults.markCropMarks;
        cbCrop.helpTip = l.TIP_CROP_MARKS;

        var cbLabels = pMarks.add("checkbox", undefined, l.LBL_MARK_LABELS);
        cbLabels.value = defaults.markLabels;
        cbLabels.helpTip = l.TIP_LABELS;

        var cbOverlap = pMarks.add("checkbox", undefined, l.LBL_MARK_OVERLAP);
        cbOverlap.value = defaults.markOverlapIndicators;
        cbOverlap.helpTip = l.TIP_OVERLAP_IND;

        var cbCross = pMarks.add("checkbox", undefined, l.LBL_MARK_CROSSHAIRS);
        cbCross.value = defaults.markCrosshairs;
        cbCross.helpTip = l.TIP_CROSSHAIRS;

        // =================================================================
        // Footer
        // =================================================================
        var grpFooter = w.add("group");
        grpFooter.alignment = ["fill", "top"];
        var stCopy = grpFooter.add("statictext", undefined,
            "\u00a9 " + cfg.COPYRIGHT_YEAR + " " + cfg.AUTHOR +
            " \u2014 " + cfg.SCRIPT_NAME + " v" + cfg.VERSION);
        stCopy.enabled = false;

        // =================================================================
        // Buttons
        // =================================================================
        var grpBtns = w.add("group");
        grpBtns.alignment = "right";
        grpBtns.spacing = 8;
        grpBtns.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        grpBtns.add("button", undefined, l.BTN_APPLY, { name: "ok" });

        // =================================================================
        // Validation and result
        // =================================================================
        grpBtns.children[1].onClick = function () {
            var v = TP.Utils.validateNumber;

            var overlap = v(rOverlap.inp.text, 0, 99999, l.LBL_OVERLAP);
            if (overlap === null) return;

            var bleedUni = cbUniform.value;
            var bleedVal, bT, bB, bL, bR;

            if (bleedUni) {
                bleedVal = v(etBleedUni.text, 0, 9999, l.LBL_BLEED_UNIFORM);
                if (bleedVal === null) return;
                bT = bB = bL = bR = bleedVal;
            } else {
                bT = v(etBT.text, 0, 9999, l.LBL_BLEED_TOP);    if (bT === null) return;
                bB = v(etBB.text, 0, 9999, l.LBL_BLEED_BOTTOM);  if (bB === null) return;
                bL = v(etBL.text, 0, 9999, l.LBL_BLEED_LEFT);    if (bL === null) return;
                bR = v(etBR.text, 0, 9999, l.LBL_BLEED_RIGHT);   if (bR === null) return;
                bleedVal = bT;
            }

            w.result = {
                scale:          defaults.scale,
                overlap:        overlap,
                overlapBothSides: cbOverlapBoth.value,
                bleedUniform:   bleedUni,
                bleed:          bleedVal,
                bleedTop:       bT,
                bleedBottom:    bB,
                bleedLeft:      bL,
                bleedRight:     bR,
                keepOriginalArtboard: defaults.keepOriginalArtboard,
                markCropMarks:      cbCrop.value,
                markLabels:         cbLabels.value,
                markOverlapIndicators: cbOverlap.value,
                markCrosshairs:     cbCross.value
            };
            w.close(1);
        };

        if (w.show() === 1) {
            return w.result;
        }
        return null;
    }
};

(function (TP) {
    var draw = TP.Draw;
    var u = TP.Utils;
    var cfg = TP.Config;
    var l = TP.L;

    try {
        if (app.documents.length === 0) {
            alert(l.ERR_NO_DOC);
            return;
        }

        var doc = app.activeDocument;
        var phase = draw.detectPhase();

        // =================================================================
        // PHASE 1: SETUP — calculate grid, place interactive split lines
        // =================================================================
        if (phase === "SETUP") {

            // Read artwork bounds from active artboard (document points)
            var artworkBounds = draw.getArtworkBounds();
            // Document mm (without any scale)
            var artworkInfo = {
                widthMM:  u.pt2mm(artworkBounds[2] - artworkBounds[0]),
                heightMM: u.pt2mm(artworkBounds[1] - artworkBounds[3])
            };

            // Load saved settings or defaults
            var saved = cfg.Storage.load();
            var defaults = saved || cfg.getDefaults();

            // Show setup dialog — artworkInfo is in document mm,
            // dialog shows real size = document mm × scale
            var params = TP.UI.showSetup(defaults, artworkInfo);
            if (!params) return;

            // Persist settings
            cfg.Storage.save(params);

            // Calculate grid — all dimensions in REAL mm
            var scale = params.scale || 1;
            var realW = artworkInfo.widthMM * scale;
            var realH = artworkInfo.heightMM * scale;

            var gridParams = {
                artworkWidthMM:  realW,
                artworkHeightMM: realH,
                mode:            params.mode,
                maxPanelWidth:   params.maxPanelWidth,
                maxPanelHeight:  params.maxPanelHeight,
                redistribute:    params.redistribute,
                redistributePct: params.redistributePct,
                columns:         params.columns,
                rows:            params.rows
            };

            var grid = TP.Core.calculateGrid(gridParams);

            // Check if tiling is needed
            if (grid.totalPanels <= 1) {
                alert(l.ERR_ARTWORK_TOO_SMALL);
                return;
            }

            // Draw split lines (positions in real mm, converted to doc pts inside)
            draw.beginSession();
            draw.removePreviewLayer();
            draw.drawSplitLines(grid, artworkBounds, params);
            draw.endSession();

            app.redraw();
            alert(l.ALERT_SETUP_DONE);

        // =================================================================
        // PHASE 2: APPLY — read adjusted splits, create artboards, add marks
        // =================================================================
        } else {

            draw.beginSession();

            // Read stored params and split positions
            var storedParams = draw.readStoredParams();
            var splitInfo = draw.readSplitPositions();
            var artworkBounds = draw.getArtworkBounds();

            if (!storedParams) {
                alert(l.ERR_NO_STORED_PARAMS);
                return;
            }

            if (splitInfo.splitsV.length === 0 && splitInfo.splitsH.length === 0) {
                alert(l.ERR_NO_SPLIT_LINES);
                return;
            }

            // Show apply dialog
            var options = TP.UI.showApply(storedParams, splitInfo);
            if (!options) return;

            // Effective scale: user scale × Illustrator Large Canvas factor
            var scale = (options.scale || 1) * u.getSF();

            // Convert real mm values to document points
            // realMM / scale = documentMM, then mm2pt
            var overlapPt     = u.mm2pt(options.overlap / scale);
            var bleedTopPt    = u.mm2pt(options.bleedTop / scale);
            var bleedBottomPt = u.mm2pt(options.bleedBottom / scale);
            var bleedLeftPt   = u.mm2pt(options.bleedLeft / scale);
            var bleedRightPt  = u.mm2pt(options.bleedRight / scale);

            // Calculate artboard rects from split positions
            var panels = TP.Core.calculateArtboardRects({
                splitsV:       splitInfo.splitsV,
                splitsH:       splitInfo.splitsH,
                artworkBounds: artworkBounds,
                overlapPt:     overlapPt,
                overlapBothSides: options.overlapBothSides || false,
                bleedTopPt:    bleedTopPt,
                bleedBottomPt: bleedBottomPt,
                bleedLeftPt:   bleedLeftPt,
                bleedRightPt:  bleedRightPt
            });

            // Validate artboard count
            var totalNew = panels.length + (options.keepOriginalArtboard ? 1 : 0);
            if (doc.artboards.length - 1 + totalNew > cfg.MAX_ARTBOARDS) {
                alert(l.format(l.ERR_TOO_MANY_ARTBOARDS, totalNew));
                return;
            }

            // Validate artboard dimensions
            for (var i = 0; i < panels.length; i++) {
                var r = panels[i].rect;
                var pw = r[2] - r[0];
                var ph = r[1] - r[3];
                if (pw <= 0 || ph <= 0) {
                    alert("Panel " + panels[i].label + " has invalid dimensions: pw=" + pw + " ph=" + ph);
                    return;
                }
                if (pw > cfg.MAX_ARTBOARD_PT || ph > cfg.MAX_ARTBOARD_PT) {
                    alert(l.format(l.ERR_ARTBOARD_TOO_LARGE, panels[i].label) +
                        "\npw=" + u.roundMM(u.pt2mm(pw), 1) + "mm ph=" + u.roundMM(u.pt2mm(ph), 1) + "mm");
                    return;
                }
            }

            // Remove preview layer first (before artboard manipulation)
            draw.removePreviewLayer();

            // Create artboards
            draw.createArtboards(panels, options.keepOriginalArtboard);

            // Draw assembly marks (options.scale is passed through for label display)
            var filename = doc.name || "Untitled";
            draw.drawAllMarks(panels, options, overlapPt, filename);

            draw.endSession();
            app.redraw();
            alert(l.format(l.ALERT_APPLY_DONE, panels.length));
        }

    } catch (e) {
        alert(l.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    } finally {
        // Safety net: restore layer locks even if an error occurred mid-session
        if (app.documents.length > 0) {
            try { draw.endSession(); } catch (e) {}
        }
    }
})(TP);
