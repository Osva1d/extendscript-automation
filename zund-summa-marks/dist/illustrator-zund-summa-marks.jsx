/*
 * ===========================================================================
 * Script:      Illustrator Zund & Summa Marks
 * Version:     26.6.0
 * Author:      Osva1d
 * Updated:     2026-06-21
 *
 * Copyright (C) 2025-2026 Ladislav Osvald (Osva1d).
 * Licensed under GNU GPL-3.0-or-later. See LICENSE file or
 * <https://www.gnu.org/licenses/gpl-3.0.txt> for full terms.
 *
 * Description:
 *   Registration marks generator for Zund/Summa cutting tables.
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

var ZSM = ZSM || {};

// ZSM.L — Localization module (IIFE, loaded before all other modules)
// Detects Illustrator locale and returns the active string table.
// Supports: en (default), cs
ZSM.L = (function () {
    var lang = "en";
    try {
        if (app.locale) lang = app.locale.substring(0, 2).toLowerCase();
    } catch (e) {}

    var strings = {
        en: {
            // --- Errors ---
            ERROR_PREFIX:        "ERROR: ",
            WARN_PREFIX:         "WARNING: ",
            ERR_MUST_BE_NUMBER:  "%s must be a number!",
            ERR_MUST_BE_INTEGER: "%s must be a whole number!",
            ERR_OUT_OF_RANGE:    "%s must be between %s and %s!",
            ERR_NO_DOC:          "No document open.",
            ERR_NO_SEL:          "Nothing is selected.",
            ERR_CRITICAL:        "CRITICAL ERROR: ",
            ERR_RENDER_CRITICAL: "Critical error during rendering: ",
            ERR_WRITE_SETTINGS:  "Cannot write settings file.",
            ERR_COLOR_MISSING:   "Assigned color not found in document: %s",
            WARN_COLOR_FALLBACK: "Mark colour '%s' is not in the document — marks drawn in [Registration].",
            ERR_LAY_COLOR:       "No color selected for layer '%s'.",
            ERR_LAY_NAME:        "A layer row has a color ('%s') but no name. Enter a layer name or remove the row.",
            ERR_SWATCH:          "Swatch '%s' not found.",
            ERR_GENERIC:         "ERROR: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Presets",
            PANEL_GEO:    "Mark Geometry & Gaps",
            PANEL_FEED:   "Feed Settings",
            PANEL_LAYERS: "Layer to Color Mapping",

            // --- UI: Technology ---
            LBL_MODE:      "Mode:",
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Select cutting technology (Zünd / Summa).",
            LBL_SOURCE:    "Source:",
            SRC_AUTO:      "Auto-fit to selection",
            SRC_FIXED:     "Fixed to Artboard",
            TIP_SRC_AUTO:  "Marks adapt to selected graphics; Artboard resized automatically.",
            TIP_SRC_FIXED: "Marks placed relative to current Artboard; size unchanged.",
            SCALE_CHECKBOX:     "Work at scale",
            TIP_SCALE_CHECKBOX: "Enable when your document is a scaled-down representation (e.g. a 5 m banner prepared at 1:10 in a 500 mm artboard). Then enter all dimensions in real-world mm.",
            SCALE_FIELD_LABEL:  "1:",
            TIP_SCALE_FIELD:    "Document scale ratio. Enter N where 1 unit in your document equals N units in reality. Range 1–10.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Preset:",
            TIP_PRESET:         "Select a saved preset to load its settings, or pick [Last Settings] to restore the values from your last Generate run.",
            TIP_REVERT:         "Discard unsaved changes and reload the selected preset as saved (enabled only when the preset has unsaved edits).",
            BTN_SAVE:           "Save",
            TIP_SAVE:           "Save changes to the current preset (disabled when no changes).",
            BTN_DEL:            "Delete",
            TIP_DEL:            "Delete currently selected preset.",
            PROMPT_SAVE_AS:     "Save current settings as new preset:",
            PRESET_DEFAULT:     "[Default]",
            ERR_PRESET_DEL_DEF: "You cannot delete the default preset.",
            CONFIRM_DEL_PRESET: "Delete preset '%s'? This cannot be undone.",
            ERR_PRESET_EXISTS:  "Preset already exists. Overwrite?",
            ERR_RESERVED_NAME:  "This name is reserved. Choose a different name.",
            BTN_SAVE_AS:        "Save As…",
            TIP_SAVE_AS:        "Save current settings as a new preset.",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Gap from graphics:",
            TIP_GAP_GZ: "Distance from graphics edge to mark center.",
            GAP_ZO:    "Gap from edge:",
            TIP_GAP_ZO: "Distance from mark outer edge to Artboard edge.",
            MAX_DIST:  "Mark spacing:",
            TIP_MAX_DIST: "Maximum spacing between marks; intermediate marks inserted if exceeded.",
            MARK_SIZE_Z:  "Zünd size:",
            TIP_SIZE_Z:   "Zünd mark diameter.",
            MARK_SIZE_S:  "Summa size:",
            TIP_SIZE_S:   "Summa mark side length.",
            ORIENT_DIST:    "Orientation mark offset:",
            TIP_ORIENT_DIST: "Distance from corner mark to orientation mark.",
            MARK_COLOR:   "Mark color (Spot):",
            TIP_MARK_COLOR: "Spot color for marks. '[Registration]' = all separations.",

            // --- UI: Feed ---
            FEED_TOP:  "Top feed:",
            TIP_FEED_TOP: "Top material overhang for feeder grip.",
            FEED_BOT:  "Bottom feed:",
            TIP_FEED_BOT: "Bottom material overhang for initial feed.",
            DRAW_RED:  "Add trim lines",
            TIP_DRAW_RED: "Red trim lines at sheet boundaries including feed overhang.",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Color",
            COL_LAYER:      "Layer",
            DDL_MISSING_SUFFIX: "(missing)",
            TIP_LAY_COLOR:  "Spot color used to match paths to this layer.",
            TIP_LAY_NAME:   "Layer name. Select from list or type custom.",
            TIP_BTN_REMOVE: "Remove this mapping row.",
            TIP_BTN_ADD:    "Add another layer mapping row.",
            BTN_ADD_LAYER:  "+ Add",
            MARKS_ONLY:     "Marks only (don't modify layers)",
            TIP_MARKS_ONLY: "Draw only the registration marks and leave all layers untouched — no path routing, no renaming. Use when your cut layers are already separated and only the marks are missing.",
            ERR_MIN_ROW:    "At least one mapping row is required.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Cancel",
            TIP_CANCEL: "Close without changes.",
            BTN_OK:     "Generate",
            TIP_OK:     "Calculate and generate marks.",
            PRESET_PLACEHOLDER: "My Preset",
            BTN_REVERT:        "Revert",
            STATUS_INVALID:    "Fix the highlighted fields.",
            STATUS_RANGE:      "%s — allowed range %s–%s.",
            STATUS_LAYER_NAME: "Enter a name for every layer row.",
            STATUS_RANGE_MULTI: "%s fields out of range — fix the highlighted ones.",
            STATUS_OK:         "%s · layers: %s",
            STATUS_OK_MARKS:   "%s · marks only",
            PANEL_OUTPUT:      "Output Settings",
            BTN_RESET:         "Defaults",
            TIP_RESET:         "Load factory default settings into the dialog (does not overwrite any saved preset).",
            DEC_SEP:           "."
        },

        cs: {
            // --- Errors ---
            ERROR_PREFIX:        "CHYBA: ",
            WARN_PREFIX:         "UPOZORNĚNÍ: ",
            ERR_MUST_BE_NUMBER:  "%s musí být číslo!",
            ERR_MUST_BE_INTEGER: "%s musí být celé číslo!",
            ERR_OUT_OF_RANGE:    "%s musí být mezi %s a %s!",
            ERR_NO_DOC:          "Není otevřený dokument.",
            ERR_NO_SEL:          "Nic není vybráno.",
            ERR_CRITICAL:        "KRITICKÁ CHYBA: ",
            ERR_RENDER_CRITICAL: "Kritická chyba při vykreslování: ",
            ERR_WRITE_SETTINGS:  "Nelze zapsat soubor s nastavením.",
            ERR_COLOR_MISSING:   "Přiřazená barva nebyla v dokumentu nalezena: %s",
            WARN_COLOR_FALLBACK: "Barva značek ‘%s’ není v dokumentu — značky vykresleny v [Registration].",
            ERR_LAY_COLOR:       "Chybí barva pro vrstvu ‘%s’. Vyberte barvu z nabídky.",
            ERR_LAY_NAME:        "Řádek vrstvy má barvu (‘%s’), ale nemá název. Zadejte název vrstvy nebo řádek odeberte.",
            ERR_SWATCH:          "Barva ‘%s’ nebyla v dokumentu nalezena.",
            ERR_GENERIC:         "CHYBA: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Předvolby",
            PANEL_GEO:    "Značky a mezery",
            PANEL_FEED:   "Nastavení role (Feed)",
            PANEL_LAYERS: "Přiřazení vrstev k barvám",

            // --- UI: Technology ---
            LBL_MODE:      "Režim:",
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Výběr cílové technologie řezu (Zünd / Summa).",
            LBL_SOURCE:    "Zdroj:",
            SRC_AUTO:      "Dle výběru (Auto-fit)",
            SRC_FIXED:     "Dle Artboardu (Fixed)",
            TIP_SRC_AUTO:  "Pozice značek se určí podle vybrané grafiky a Artboard se automaticky přizpůsobí.",
            TIP_SRC_FIXED: "Pozice značek se určí podle stávajícího Artboardu; jeho velikost se nemění.",
            SCALE_CHECKBOX:     "Pracovat v měřítku",
            TIP_SCALE_CHECKBOX: "Zapněte, pokud je dokument zmenšenou předlohou (např. 5m banner připravený v měřítku 1:10 na 500 mm artboardu). Pak zadávejte všechny rozměry v reálných mm.",
            SCALE_FIELD_LABEL:  "1:",
            TIP_SCALE_FIELD:    "Měřítko dokumentu. Zadejte N, kde 1 jednotka v dokumentu = N jednotek v realitě. Rozsah 1–10.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Předvolba:",
            TIP_PRESET:         "Vyberte uloženou předvolbu pro načtení jejích nastavení, nebo zvolte [Last Settings] pro obnovení hodnot z posledního spuštění.",
            TIP_REVERT:         "Zahodit neuložené změny a načíst vybranou předvolbu znovu (aktivní jen když má předvolba neuložené úpravy).",
            BTN_SAVE:           "Uložit",
            TIP_SAVE:           "Uloží změny do aktuální předvolby (neaktivní, pokud nejsou žádné změny).",
            BTN_DEL:            "Smazat",
            TIP_DEL:            "Smazat aktuálně vybranou předvolbu.",
            PROMPT_SAVE_AS:     "Uložit aktuální nastavení jako novou předvolbu:",
            PRESET_DEFAULT:     "[Výchozí]",
            ERR_PRESET_DEL_DEF: "Výchozí předvolbu nelze smazat.",
            CONFIRM_DEL_PRESET: "Smazat předvolbu ‘%s’? Tuto akci nelze vrátit zpět.",
            ERR_PRESET_EXISTS:  "Předvolba již existuje. Přepsat?",
            ERR_RESERVED_NAME:  "Tento název je rezervovaný. Vyberte jiný.",
            BTN_SAVE_AS:        "Uložit jako…",
            TIP_SAVE_AS:        "Uložit aktuální nastavení jako novou předvolbu.",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Mezera od grafiky:",
            TIP_GAP_GZ: "Vzdálenost středu značky od okraje grafiky.",
            GAP_ZO:    "Mezera od okraje:",
            TIP_GAP_ZO: "Vzdálenost vnějšího okraje značky od hrany artboardu.",
            MAX_DIST:  "Rozteč značek:",
            TIP_MAX_DIST: "Maximální rozteč mezi značkami; při překročení se vloží mezilehlé.",
            MARK_SIZE_Z:  "Velikost Zünd:",
            TIP_SIZE_Z:   "Průměr značky Zünd.",
            MARK_SIZE_S:  "Velikost Summa:",
            TIP_SIZE_S:   "Délka strany značky Summa.",
            ORIENT_DIST:    "Odsazení orientační značky:",
            TIP_ORIENT_DIST: "Vzdálenost od rohové značky k orientační značce.",
            MARK_COLOR:   "Barva značek (Spot):",
            TIP_MARK_COLOR: "Přímá barva značek. ‘[Registration]’ = výchozí pro všechny separace.",

            // --- UI: Feed ---
            FEED_TOP:  "Horní výjezd (Top):",
            TIP_FEED_TOP: "Horní přesah materiálu pro uchycení v podavači.",
            FEED_BOT:  "Spodní nájezd (Bottom):",
            TIP_FEED_BOT: "Spodní přesah materiálu pro počáteční najetí stroje.",
            DRAW_RED:  "Přidat ořezové linky",
            TIP_DRAW_RED: "Vykreslí červené ořezové linky na hranicích archu včetně přesahů.",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Barva",
            COL_LAYER:      "Vrstva",
            DDL_MISSING_SUFFIX: "(chybí)",
            TIP_LAY_COLOR:  "Přímá barva pro rozpoznání cest na této vrstvě.",
            TIP_LAY_NAME:   "Název vrstvy. Vyberte ze seznamu nebo napište vlastní.",
            TIP_BTN_REMOVE: "Odebrat toto mapování.",
            TIP_BTN_ADD:    "Přidat další mapování vrstvy.",
            BTN_ADD_LAYER:  "+ Přidat",
            MARKS_ONLY:     "Pouze značky (neměnit vrstvy)",
            TIP_MARKS_ONLY: "Vykreslí pouze registrační značky a nesáhne na žádné vrstvy — žádné přesouvání cest ani přejmenování. Použijte, když máte řezací vrstvy už separované a schází jen značky.",
            ERR_MIN_ROW:    "Musí existovat alespoň jedno mapování.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Storno",
            TIP_CANCEL: "Zavřít bez změn.",
            BTN_OK:     "Generovat",
            TIP_OK:     "Spustit výpočet a vygenerovat značky.",
            PRESET_PLACEHOLDER: "Moje předvolba",
            BTN_REVERT:        "Vrátit",
            STATUS_INVALID:    "Opravte zvýrazněná pole.",
            STATUS_RANGE:      "%s — povolený rozsah %s–%s.",
            STATUS_LAYER_NAME: "Zadejte název u každého řádku vrstvy.",
            STATUS_RANGE_MULTI: "%s pole mimo rozsah — opravte zvýrazněná.",
            STATUS_OK:         "%s · vrstvy: %s",
            STATUS_OK_MARKS:   "%s · pouze značky",
            PANEL_OUTPUT:      "Nastavení výstupu",
            BTN_RESET:         "Výchozí",
            TIP_RESET:         "Načte tovární výchozí nastavení do dialogu (uloženou předvolbu nepřepíše).",
            DEC_SEP:           ","
        }
    };

    var active = strings[lang] || strings["en"];

    // String formatter: ZSM.L.format(ZSM.L.ERR_OUT_OF_RANGE, "Gap", 0, 100)
    active.format = function (template) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var idx = 0;
        return template.replace(/%s/g, function () {
            return idx < args.length ? String(args[idx++]) : "%s";
        });
    };

    return active;
})();

var ZSM = ZSM || {};

ZSM.Utils = {
    /**
     * Converts millimeters to points.
     * @param {number} mm - Value in millimeters.
     * @returns {number} Value in points.
     */
    mm2pt: function (mm) { return mm * 2.83464567; },

    /**
     * Converts points to millimeters.
     * @param {number} pt - Value in points.
     * @returns {number} Value in millimeters.
     */
    pt2mm: function (pt) { return pt / 2.83464567; },

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
     * Effective scale factor — composes Illustrator Large Canvas factor
     * (auto-detected) with the user's manual 1:N scale (s.scaleN).
     *
     * SINGLE SOURCE OF TRUTH. Every place that converts between
     * "user-entered real-world mm" and "doc-space pt" MUST use this,
     * not raw getSF(). Past bug (v26.4.0 manual test): draw.js used
     * getSF() alone for mark size, so marks were not shrunk in 1:10
     * workflow even though positions were. Fixed by routing both
     * core.js math and draw.js render through this helper.
     *
     * @param {Object} s - Settings object (must carry scaleN; defaults to 1).
     * @returns {number} Composed factor: Large Canvas SF * manual scaleN.
     */
    getEffectiveSF: function (s) {
        var manualN = (s && s.scaleN) ? Number(s.scaleN) : 1;
        if (isNaN(manualN) || manualN < 1) manualN = 1;
        return this.getSF() * manualN;
    },

    /**
     * Validates a numerical input within a range.
     * Normalizes Czech decimal separator (comma → dot) before parsing.
     * Returns null and shows alert if invalid; keeps dialog open.
     * @param {string|number} val - The value to validate.
     * @param {number} min - Minimum allowed value (inclusive).
     * @param {number} max - Maximum allowed value (inclusive).
     * @param {string} name - Display name used in error messages.
     * @returns {number|null} Validated number or null if invalid.
     */
    validateNumber: function (val, min, max, name) {
        // Normalize: comma → dot (CZ locale), trim whitespace
        var str = String(val).replace(/,/g, ".").replace(/^\s+|\s+$/g, "");
        // JS quirk: Number("") === 0 and Number("  ") === 0, NOT NaN.
        // Treat empty/whitespace-only strings as invalid to prevent
        // silent 0-substitution when user clears a UI field.
        var n = (str === "") ? NaN : Number(str);
        if (isNaN(n)) {
            alert(ZSM.L.format(ZSM.L.ERR_MUST_BE_NUMBER, name));
            return null;
        }
        if (n < min || n > max) {
            alert(ZSM.L.format(ZSM.L.ERR_OUT_OF_RANGE, name, min, max));
            return null;
        }
        return n;
    },

    /**
     * Writes a debug message to the ExtendScript console.
     * Only active when ZSM.Config.debug is true.
     * @param {string} msg - Message to log.
     */
    log: function (msg) {
        if (ZSM.Config && ZSM.Config.debug) {
            $.writeln("[ZSM] " + msg);
        }
    },

    /**
     * Displays a user-facing error alert with localized prefix.
     * @param {string} msg - Error message body.
     */
    error: function (msg) {
        alert(ZSM.L.ERROR_PREFIX + msg);
    },

    /**
     * Displays a non-fatal warning alert with a localized "warning" prefix.
     * Distinct from error() so post-completion notices (missing colour →
     * [Registration] fallback, colour assigned to a layer that matched no
     * paths) aren't mislabelled as errors — the operation still succeeded.
     * @param {string} msg - Warning message body.
     */
    warn: function (msg) {
        alert(ZSM.L.WARN_PREFIX + msg);
    },

    /**
     * Deep-equality test for two settings objects.
     * Used by the UI to detect "modified" state (UI values diverged
     * from the stored preset). Numeric coercion via String() so 5
     * and "5" compare equal — UI inputs are strings, stored values
     * may be numbers.
     *
     * Compares fixed schema fields (mode, gaps, sizes, color, etc.)
     * plus layers[] array (name+color per row). Extra fields outside
     * the schema are ignored.
     *
     * @param {Object} a - First settings object.
     * @param {Object} b - Second settings object.
     * @returns {boolean} True if all schema fields are equal.
     */
    presetEquals: function (a, b) {
        if (!a || !b) return false;
        var keys = ["mode", "gapInner", "gapOuter", "maxDist",
                    "feedTop", "feedBottom", "drawRed", "useArtboardBounds",
                    "markSizeZ", "markSizeS", "orientDist", "markColor",
                    "scaleN", "marksOnly"];
        for (var i = 0; i < keys.length; i++) {
            if (String(a[keys[i]]) !== String(b[keys[i]])) return false;
        }
        var aL = a.layers || [], bL = b.layers || [];
        if (aL.length !== bL.length) return false;
        for (var li = 0; li < aL.length; li++) {
            if ((aL[li].name || "")  !== (bL[li].name || ""))  return false;
            if ((aL[li].color || "") !== (bL[li].color || "")) return false;
        }
        return true;
    }
};

var ZSM = ZSM || {};

/**
 * ZSM.Validation — Pure validation logic for UI-collected settings.
 *
 * Decoupled from ScriptUI so it can be unit-tested in Node without
 * an Illustrator runtime. Numeric checks delegate to ZSM.Utils.validateNumber
 * (which still calls alert() — caller suppresses or mocks as needed).
 *
 * Schema: each numeric field has {min, max, label, mode?}.
 *   - "label" is the key in ZSM.L locale table for user-facing field name.
 *   - "mode" (optional) restricts validation to ZUND or SUMMA. Mode-irrelevant
 *     fields are pulled from `prev` (previously saved settings) instead of
 *     being validated, mirroring the dialog's mode-specific UI.
 */
ZSM.Validation = {
    /**
     * Numeric field validation rules. Single source of truth — used by both
     * the UI dialog (via ZSM.Validation.validate()) and the test suite.
     */
    rules: {
        // Always validated:
        gapOuter:   { min: 0,   max: 1000, label: "GAP_ZO" },
        // maxDist.min lowered from 50 to 5 to unblock 1:10 manual-scale workflows
        // (user enters 40 mm doc-coords representing 400 mm real intent on a
        // 1:10 working file). At true 1:1, a 5 mm spacing produces extremely
        // dense mark grids — acceptable as an explicit user choice. The proper
        // outputScale UI lives in Phase 2.
        maxDist:    { min: 5,   max: 5000, label: "MAX_DIST" },
        // ZUND-only:
        gapInner:   { min: 0,   max: 1000, label: "GAP_GZ",      mode: "ZUND" },
        markSizeZ:  { min: 0.1, max: 50,   label: "MARK_SIZE_Z", mode: "ZUND" },
        orientDist: { min: 10,  max: 2000, label: "ORIENT_DIST", mode: "ZUND" },
        // SUMMA-only:
        markSizeS:  { min: 0.1, max: 50,   label: "MARK_SIZE_S", mode: "SUMMA" },
        feedTop:    { min: 0,   max: 1000, label: "FEED_TOP",    mode: "SUMMA" },
        feedBottom: { min: 0,   max: 1000, label: "FEED_BOT",    mode: "SUMMA" },
        // Phase 2 — manual scale (1:N). Integer 1..10.
        // scaleN=1 = no scaling (UI checkbox unchecked, field disabled).
        // scaleN=2..10 = doc is 1:N (UI checkbox checked, field shows N).
        scaleN:     { min: 1,   max: 10,   label: "SCALE_FIELD_LABEL", integer: true }
    },

    /**
     * Validates raw UI values against the schema and builds a clean settings
     * object. For mode-irrelevant fields, falls back to `prev` (matches the
     * dialog's "preserve other-mode values across mode switch" behavior).
     *
     * @param {Object} raw - Raw UI values (strings or numbers OK, comma-decimal OK).
     *                       Required: mode. Plus all field names in rules + booleans.
     * @param {Object} prev - Previous settings (for mode-irrelevant field preservation).
     *                       Pass {} if no previous state.
     * @param {Object} L    - Locale object (ZSM.L). Used to resolve rule.label
     *                       to the user-facing field name shown in alerts.
     * @returns {Object} { valid: bool, settings: {...}|null, errors: [{field,label}, ...] }
     */
    validate: function (raw, prev, L) {
        if (!raw) return { valid: false, settings: null, errors: [{ field: "_root", label: "missing input" }] };
        // `mode` is the only strictly required field — everything else can
        // fall back to prev or defaults. Without mode we cannot decide which
        // mode-specific rules apply.
        if (!raw.mode)  return { valid: false, settings: null, errors: [{ field: "mode",  label: "mode missing" }] };
        L = L || {};
        prev = prev || {};

        var errors = [];
        var settings = { mode: raw.mode };
        var mode = raw.mode;

        // Numeric fields per rules
        for (var field in this.rules) {
            if (!this.rules.hasOwnProperty(field)) continue;
            var rule = this.rules[field];

            if (rule.mode && rule.mode !== mode) {
                // Mode-irrelevant: preserve from prev (or fall to undefined,
                // caller can fill from defaults if needed)
                settings[field] = prev[field];
                continue;
            }

            // Field not provided in raw input — fall back to prev value.
            // This keeps old presets / partial UIs working without forcing
            // every caller to enumerate every schema field explicitly.
            if (raw[field] === undefined) {
                settings[field] = prev[field];
                continue;
            }

            var label = L[rule.label] || rule.label || field;
            var val = ZSM.Utils.validateNumber(raw[field], rule.min, rule.max, label);
            if (val === null) {
                errors.push({ field: field, label: label });
            } else if (rule.integer && val !== Math.floor(val)) {
                // Integer-only rule (e.g. scaleN): reject decimals. The value
                // passed the range check, so validateNumber showed NO alert —
                // this "must be integer" alert is the only message the user sees.
                try {
                    if (typeof alert === "function" && L.ERR_MUST_BE_INTEGER) {
                        alert(L.format ? L.format(L.ERR_MUST_BE_INTEGER, label) : L.ERR_MUST_BE_INTEGER);
                    }
                } catch (e) {}
                errors.push({ field: field, label: label });
            } else {
                settings[field] = val;
            }
        }

        // Pass-through fields (no numeric validation needed)
        // Boolean fields: explicit cast
        settings.drawRed           = (raw.drawRed === true);
        settings.useArtboardBounds = (raw.useArtboardBounds === true);
        settings.marksOnly         = (raw.marksOnly === true);

        // String / dropdown fields: empty → fallback
        settings.markColor = (raw.markColor && raw.markColor !== "")
            ? raw.markColor
            : "[Registration]";

        // Layers: array passthrough (UI is responsible for shape)
        settings.layers = (raw.layers && raw.layers.length > 0)
            ? raw.layers
            : [{ name: "Cut", color: "[Registration]" }];

        return errors.length === 0
            ? { valid: true,  settings: settings, errors: [] }
            : { valid: false, settings: null,     errors: errors };
    }
};

var ZSM = ZSM || {};

/**
 * ZSM.UIState — Pure state-transition logic for the preset dialog.
 *
 * Extracted from ScriptUI event handlers so it can be unit-tested without
 * a real dialog. Functions take a `pData` (preset wrapper) plus inputs and
 * return a NEW pData (or the same with mutations) representing the post-
 * action state.
 *
 * The dialog (ui.js) wires these to button onClick handlers; everything
 * UI-specific (alerts, prompts, control updates) stays in ui.js.
 *
 * Conventions:
 *   - pData = { activePreset: string, presets: { [name]: settings, ... } }
 *   - "[Default]" and "[Last Settings]" are reserved names
 *   - validatePresetName returns null on invalid (instead of throwing)
 */
ZSM.UIState = {
    // These two are intentionally duplicated from ZSM.Config (kept local so
    // ui_state can be unit-tested without loading Config). MUST stay in sync
    // with ZSM.Config.PRESET_KEY_DEFAULT — if you rename a reserved preset
    // key, change it in BOTH places.
    PRESET_KEY_DEFAULT: "[Default]",
    PRESET_KEY_LAST:    "[Last Settings]",

    /**
     * Validates a preset name.
     * @param {string} rawName - User-entered name.
     * @returns {string|null} Trimmed name, or null if invalid.
     */
    validatePresetName: function (rawName) {
        var name = String(rawName == null ? "" : rawName).replace(/^\s+|\s+$/g, "");
        if (!name) return null;
        // The whole "[...]" namespace is reserved for sentinels — not just the
        // two current keys. A user preset named e.g. "[Foo]" would collide with
        // the localized-default migration in Storage.load (its sentinel regex
        // would rename it to [Default] on a legacy file) and with any future
        // reserved key.
        if (/^\[.+\]$/.test(name)) return null;
        return name;
    },

    /**
     * Returns true if the active preset has unsaved changes (UI values
     * differ from the stored preset). Uses ZSM.Utils.presetEquals.
     */
    isModified: function (pData, currentValues) {
        if (!pData || !currentValues) return false;
        var preset = pData.presets[pData.activePreset];
        if (!preset) return false;
        return !ZSM.Utils.presetEquals(currentValues, preset);
    },

    /**
     * Builds the dropdown list data: ordered keys with display text +
     * modified-indicator (asterisk).
     *
     * @param {Object} pData         - Preset wrapper.
     * @param {Object} currentValues - Current UI values (for modified check).
     * @param {Object} L             - Locale (for [Default] display).
     * @returns {Array} [{ key, displayText, isActive, isModified }, ...]
     */
    formatPresetList: function (pData, currentValues, L) {
        L = L || {};
        var defaultDisplay = L.PRESET_DEFAULT || this.PRESET_KEY_DEFAULT;
        var DEF = this.PRESET_KEY_DEFAULT;
        var keys = [];
        for (var k in pData.presets) {
            if (pData.presets.hasOwnProperty(k) && k !== this.PRESET_KEY_LAST) keys.push(k);
        }
        // [Default] always pinned first; rest alphabetical
        keys.sort(function (a, b) {
            if (a === DEF) return -1;
            if (b === DEF) return 1;
            return a < b ? -1 : (a > b ? 1 : 0);
        });

        var modified = this.isModified(pData, currentValues);

        // ES3-safe loop (ExtendScript has no Array.prototype.map)
        var result = [];
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var displayText = (key === DEF) ? defaultDisplay : key;
            var isActive = (key === pData.activePreset);
            if (isActive && modified) displayText += " *";
            result.push({
                key: key,
                displayText: displayText,
                isActive: isActive,
                isModified: isActive && modified
            });
        }
        return result;
    },

    /**
     * Save current UI values to the active named preset.
     *
     * Behavior:
     *   - If active preset is [Default] or [Last Settings] → returns
     *     {ok: false, reason: "needs-name"} (caller should prompt for name
     *     via saveAs).
     *   - Otherwise → mutates pData.presets[activePreset] = currentValues,
     *     returns {ok: true}.
     *
     * @param {Object} pData         - Preset wrapper (mutated).
     * @param {Object} currentValues - UI values to save.
     * @returns {Object} {ok, reason?}
     */
    save: function (pData, currentValues) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST || !active) {
            return { ok: false, reason: "needs-name" };
        }
        pData.presets[active] = currentValues;
        return { ok: true };
    },

    /**
     * Save current UI values as a new (or replacing existing) named preset.
     *
     * @param {Object}  pData          - Preset wrapper (mutated).
     * @param {string}  name           - New preset name (raw user input).
     * @param {Object}  currentValues  - UI values.
     * @param {Function} confirmOverwrite - Optional callback (returns bool).
     *                                     Called when name already exists.
     *                                     If undefined, overwrite is allowed.
     * @returns {Object} {ok, reason?, name?}
     */
    saveAs: function (pData, name, currentValues, confirmOverwrite) {
        if (!pData || !currentValues) return { ok: false, reason: "missing-input" };
        var clean = this.validatePresetName(name);
        if (!clean) return { ok: false, reason: "invalid-name" };
        if (pData.presets[clean]) {
            if (typeof confirmOverwrite === "function" && !confirmOverwrite(clean)) {
                return { ok: false, reason: "user-cancelled" };
            }
        }
        pData.presets[clean] = currentValues;
        pData.activePreset = clean;
        return { ok: true, name: clean };
    },

    /**
     * Delete the active preset (cannot delete [Default] or [Last Settings]).
     * On success, activePreset reverts to [Default].
     *
     * @returns {Object} {ok, reason?}
     */
    deleteActive: function (pData) {
        if (!pData) return { ok: false, reason: "missing-input" };
        var active = pData.activePreset;
        if (active === this.PRESET_KEY_DEFAULT || active === this.PRESET_KEY_LAST) {
            return { ok: false, reason: "reserved" };
        }
        if (!pData.presets[active]) return { ok: false, reason: "not-found" };
        delete pData.presets[active];
        pData.activePreset = this.PRESET_KEY_DEFAULT;
        return { ok: true };
    },

    /**
     * Switch to a different preset (load its values into UI later).
     * Validates the target exists.
     *
     * @returns {Object} {ok, settings?, reason?}
     */
    selectPreset: function (pData, name) {
        if (!pData) return { ok: false, reason: "missing-input" };
        if (!pData.presets[name]) return { ok: false, reason: "not-found" };
        pData.activePreset = name;
        return { ok: true, settings: pData.presets[name] };
    }
};

var ZSM = ZSM || {};

ZSM.Config = {
    scriptName: "Zünd & Summa Marks",
    // KEEP IN SYNC with package.json "version" — build.sh reads package.json
    // for the dist header; this constant is the runtime source of truth
    // for the dialog title, footer copyright, and any in-script "About" UI.
    version:    "26.6.0",
    zundSize:    5,   // mm, default Zünd mark diameter
    summaSize:   3,   // mm, default Summa mark side

    summaXCenter: 10,  // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,  // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,   // pt: stroke width for trim lines
    rulerBuffer:  0.1,
    debug: false,

    // System layer names — not localized (must match document layer names exactly)
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    layerTrim:     "Trim",
    PRESET_KEY_DEFAULT: "[Default]",

    ui: {
        // Title is composed at runtime so version bump only touches `version` above.
        // Czech-friendly Zünd umlaut is intentional (matches user's print-shop branding).
        title: null   // set below to "Zünd & Summa Marks v" + version
    },

    /**
     * Returns a fresh default settings object.
     * Used when no saved settings exist or as preset baseline.
     * layers[] uses {name, color} format — row existence implies active.
     * @returns {Object} Default settings.
     */
    getDefaults: function () {
        return {
            mode:             "ZUND",
            gapInner:         5,
            gapOuter:         0,
            maxDist:          500,
            feedTop:          70,
            feedBottom:       50,
            drawRed:          true,
            useArtboardBounds: false,
            markSizeZ:        5,
            markSizeS:        3,
            orientDist:       100,
            markColor:        "[Registration]",
            // Phase 2 (v26.4.0): manual scale support for shrunken docs.
            // scaleN = 1  → no scaling (user input == real mm == doc mm)
            // scaleN > 1  → doc is 1:N (user input in real mm; math divides by N
            //               on top of AI's scaleFactor). UI enabled via checkbox.
            scaleN:           1,
            // Phase 3 (v26.5.0): "marks only" — when true, the script ONLY draws
            // registration marks and does NOT touch layers (no path routing, no
            // Graphics rename). For docs whose cut layers are already separated
            // and only the marks are missing. UI checkbox; layer panel disabled.
            marksOnly:        false,
            layers: [
                { name: "Cut", color: "[Registration]" }
            ]
        };
    }
};

// Compose the runtime title (must run AFTER ZSM.Config object literal closes
// so `version` is already on the object).
ZSM.Config.ui.title = "Zünd & Summa Marks v" + ZSM.Config.version;

// Persistence (load/save + migrations) lives in src/lib/storage.js as
// ZSM.Storage. Use ZSM.Storage.{load,save} directly — there is no
// ZSM.Config.Storage anymore.

// ------------------------------------------------------------------------
// Module: ZSM.Storage — settings persistence + migrations
// Part of: Illustrator Zund & Summa Marks
//
// Responsible for reading/writing the JSON settings file at
// `Folder.userData/ZSM/settings.json` and migrating older layouts forward.
// Pure I/O + data transformation; no DOM access, no UI.
//
// Depends on: ZSM.Utils (logging), ZSM.Config (getDefaults, PRESET_KEY_DEFAULT)
// ------------------------------------------------------------------------
var ZSM = ZSM || {};

ZSM.Storage = {
    /**
     * Returns the settings File object, creating the folder if needed.
     * @returns {File} JSON settings file at the canonical path.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/ZSM");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/settings.json");
    },

    /**
     * Returns the legacy v26.3 settings file (used by load() for one-time
     * migration to the new canonical filename).
     * @returns {File} Legacy file path.
     */
    getLegacyFile: function () {
        var folder = new Folder(Folder.userData + "/ZSM");
        return new File(folder.fsName + "/settings_v26_3.json");
    },

    /**
     * Serializes and saves the full preset wrapper to disk.
     * Returns success so CALLERS decide how to surface a failure (alert with
     * context); this module never alerts itself. open(), write() and close()
     * are all checked — File.write returns false on a full disk / permission
     * error without throwing, so an unchecked call would lose settings silently.
     * @param {Object} data - Full preset wrapper {presets, activePreset}.
     * @returns {boolean} True when the file was written completely.
     */
    save: function (data) {
        try {
            var f = this.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                ZSM.Utils.log("Storage.save: open(w) failed for " + f.fsName);
                return false;
            }
            var wrote  = f.write(JSON.stringify(data));
            var closed = f.close();
            if (!wrote || !closed) {
                ZSM.Utils.log("Storage.save: write/close failed for " + f.fsName);
                return false;
            }
            return true;
        } catch (e) {
            ZSM.Utils.log("Storage.save failed: " + e.message);
            return false;
        }
    },

    /**
     * Loads settings from disk and runs format migrations.
     * Migration chain: v26.0 flat → v26.3 layers[] → v26.3 presets wrapper → v27 layers without active
     * Returns null on failure; caller falls back to getDefaults().
     * @returns {Object|null} Full preset wrapper or null.
     */
    load: function () {
        var f = this.getFile();
        // FILENAME MIGRATION: v26.x used settings_v26_3.json. If the new
        // canonical file doesn't exist but the legacy one does, read from
        // legacy (will be re-saved to new path on next save()).
        if (!f.exists) {
            var legacy = this.getLegacyFile();
            if (legacy.exists) f = legacy;
            else return null;
        }
        try {
            f.encoding = "UTF-8";
            f.open("r");
            var content = f.read();
            f.close();
            if (!content) return null;

            var data = JSON.parse(content);

            // MIGRATION 1: v26.0 flat thru/kiss → v26.3 layers[]
            if (data.thruActive !== undefined && data.layers === undefined) {
                data.layers = [
                    { active: data.thruActive,        name: data.thruName || "Cut",      color: "[Registration]" },
                    { active: data.kissActive || false, name: data.kissName || "Kiss-cut", color: "[Registration]" }
                ];
                delete data.thruActive; delete data.thruName;
                delete data.kissActive; delete data.kissName;
            }

            // MIGRATION 2: flat settings object → preset wrapper
            if (!data.presets) {
                var flatData = data;
                var defPreset = ZSM.Config.getDefaults();

                // Merge flat data onto defaults to fill any missing keys
                var migratedPreset = {};
                for (var key in defPreset) {
                    if (defPreset.hasOwnProperty(key)) {
                        migratedPreset[key] = flatData.hasOwnProperty(key) ? flatData[key] : defPreset[key];
                    }
                }

                data = {
                    activePreset: "[Last Settings]",
                    presets: {}
                };
                data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = defPreset;
                data.presets["[Last Settings]"]     = migratedPreset;
            }

            // MIGRATION 3: v26.3 layers {active, name, color} → v27 {name, color}
            // Remove inactive rows (active:false = user had them disabled)
            // and strip the `active` property from remaining rows.
            if (data.presets) {
                for (var pKey in data.presets) {
                    if (!data.presets.hasOwnProperty(pKey)) continue;
                    var preset = data.presets[pKey];
                    if (preset.layers && preset.layers.length > 0) {
                        var migrated = [];
                        for (var li = 0; li < preset.layers.length; li++) {
                            var row = preset.layers[li];
                            // Keep only rows that were active (or have no active property = new format)
                            if (row.active === false) continue;
                            migrated.push({ name: row.name || "", color: row.color || "" });
                        }
                        // Ensure at least one row after migration
                        if (migrated.length === 0) {
                            migrated.push({ name: "Cut", color: "[Registration]" });
                        }
                        preset.layers = migrated;
                    }
                }
            }

            // MIGRATION 4: locale-independent default preset key (W4)
            // Older versions stored the default preset under a localized key
            // (e.g. "[Výchozí]" in Czech, possibly other locales). Detect any
            // bracketed key that looks like a sentinel ("[<text>]") and is NOT
            // the canonical "[Default]" / "[Last Settings]", and rename it to
            // "[Default]" if no canonical default exists.
            // Pattern-based (instead of a hardcoded whitelist) so future
            // localizations migrate automatically without a code change.
            if (data.presets && !data.presets[ZSM.Config.PRESET_KEY_DEFAULT]) {
                var SENTINEL_RE = /^\[.+\]$/;
                var KNOWN_RESERVED = { "[Last Settings]": true };
                for (var sKey in data.presets) {
                    if (!data.presets.hasOwnProperty(sKey)) continue;
                    if (KNOWN_RESERVED[sKey]) continue;
                    if (!SENTINEL_RE.test(sKey)) continue;
                    // First bracketed non-reserved key wins as the localized default
                    data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = data.presets[sKey];
                    delete data.presets[sKey];
                    if (data.activePreset === sKey) {
                        data.activePreset = ZSM.Config.PRESET_KEY_DEFAULT;
                    }
                    break;
                }
            }

            // Forward-fill: add any new default keys missing from all presets
            var defKeys = ZSM.Config.getDefaults();
            for (var pKey2 in data.presets) {
                if (!data.presets.hasOwnProperty(pKey2)) continue;
                var preset2 = data.presets[pKey2];
                for (var k in defKeys) {
                    if (defKeys.hasOwnProperty(k) && typeof preset2[k] === "undefined") {
                        preset2[k] = defKeys[k];
                    }
                }
            }

            return data;
        } catch (e) {
            ZSM.Utils.log("Storage.load failed: " + e.message);
            return null;
        }
    }
};

var ZSM = ZSM || {};

ZSM.Core = {
    /** @type {number} SUMMA_BAR_OFFSET - mm: Distance from graphic bottom edge to bar centerline */
    SUMMA_BAR_OFFSET: 11.5,
    /** @type {number} SUMMA_BAR_WIDTH - mm: Thickness of the Summa registration bar */
    SUMMA_BAR_WIDTH: 3,

    /**
     * Calculates all registration mark positions and the new artboard rectangle.
     * All internal calculations are in document points; physical constants are
     * divided by scaleFactor to handle Large Canvas mode transparently.
     *
     * @param {Object} s - Settings from UI (mode, gaps, sizes, etc.)
     * @param {Array}  b - Graphic bounds [L, T, R, B] in document points.
     * @returns {Object} Geometry: { marksZ[], marksS[], barS, red[], ab[], warnings[] }
     */
    calculateAll: function (s, b) {
        var cfg = ZSM.Config;
        // Effective scale factor — see ZSM.Utils.getEffectiveSF() for the
        // single source of truth. Routes through that helper so core.js and
        // draw.js cannot drift apart again (the bug class fixed in v26.4.0
        // manual test: draw.js used raw getSF(), missed scaleN, marks
        // didn't shrink).
        var sf  = ZSM.Utils.getEffectiveSF(s);

        // Convert physical constants to document-space values
        var rZ    = (s.markSizeZ / 2) / sf;
        var rS    = (s.markSizeS / 2) / sf;
        var offSX = cfg.summaXCenter / sf;
        var offSY = (cfg.summaYVisual / sf) + rS;
        var gapI  = s.gapInner / sf;
        var gapO  = s.gapOuter / sf;

        // Zünd offset: inner gap + mark radius
        var offZX = gapI + rZ;
        var offZY = gapI + rZ;

        // Mode-specific active values
        var outX = (s.mode === "ZUND") ? offZX : offSX;
        var outY = (s.mode === "ZUND") ? offZY : offSY;
        var rMax = (s.mode === "ZUND") ? rZ    : rS;

        var gL = b[0], gT = b[1], gR = b[2], gB = b[3];
        var gW = gR - gL;
        var gCx = (gL + gR) / 2;

        var markTopY = gT + ZSM.Utils.mm2pt(outY);
        var markBotY = gB - ZSM.Utils.mm2pt(outY);

        // Feed contributes to artboard height for Summa only; Zünd uses gapOuter
        var feedT = (s.mode === "SUMMA") ? (s.feedTop  / sf) : gapO;
        var feedB = (s.mode === "SUMMA") ? (s.feedBottom / sf) : gapO;

        var abTop = markTopY + ZSM.Utils.mm2pt(rMax) + ZSM.Utils.mm2pt(feedT);
        var abBot = markBotY - ZSM.Utils.mm2pt(rMax) - ZSM.Utils.mm2pt(feedB);

        // Snap artboard edges to whole millimetres.
        // Use snapCeil helper to round up with 0.01mm tolerance, eliminating
        // floating-point cliff effects from pt↔mm conversion (BUG-2 fix).
        // For vertical edges: when feedTop === feedBottom (Zünd gapOuter),
        // round the total height and centre it to guarantee symmetric margins
        // (BUG-1 fix). SUMMA mode intentionally has asymmetric feeds, so
        // top/bottom are rounded independently there.
        //
        // For fixed bounds we just keep the supplied rectangle.
        var abRect;
        /** Round up to whole mm, but treat values within 0.01mm of an
         *  integer as already there (avoids fp cliff-effect). */
        function snapCeil(v) { return Math.ceil(Math.round(v * 100) / 100); }
        /** Round down with same tolerance. */
        function snapFloor(v) { return Math.floor(Math.round(v * 100) / 100); }

        if (s.useArtboardBounds) {
            abRect = b; // Fixed mode: leave artboard untouched
        } else {
            var abTop_mm = ZSM.Utils.pt2mm(abTop) * sf;
            var abBot_mm = ZSM.Utils.pt2mm(abBot) * sf;

            if (feedT === feedB) {
                // Symmetric feeds (Zünd gapOuter): round total height, then centre
                var abH_mm = snapCeil(abTop_mm - abBot_mm);
                var abMid  = (abTop + abBot) / 2;
                abTop = abMid + ZSM.Utils.mm2pt((abH_mm / 2) / sf);
                abBot = abMid - ZSM.Utils.mm2pt((abH_mm / 2) / sf);
            } else {
                // Asymmetric feeds (Summa): snap each edge independently
                abTop = ZSM.Utils.mm2pt(snapCeil(abTop_mm) / sf);
                abBot = ZSM.Utils.mm2pt(snapFloor(abBot_mm) / sf);
            }

            // horizontal edges: compute required half width then round outwards
            var reqHalfW_mm = ZSM.Utils.pt2mm(gW / 2) * sf + (outX + rMax + gapO) * sf;

            // Ensure artboard covers the Zünd orientation mark (offset from BL corner)
            if (s.mode === "ZUND") {
                var orientRight_mm = -(ZSM.Utils.pt2mm(gW / 2) * sf + outX * sf)
                                     + s.orientDist + s.markSizeZ + (s.markSizeZ / 2) + gapO * sf;
                if (orientRight_mm > reqHalfW_mm) reqHalfW_mm = orientRight_mm;
            }

            var abHalfW_mm = snapCeil(reqHalfW_mm);
            var abLeft  = gCx - ZSM.Utils.mm2pt(abHalfW_mm / sf);
            var abRight = gCx + ZSM.Utils.mm2pt(abHalfW_mm / sf);

            abRect = [abLeft, abTop, abRight, abBot];
        }

        var res = { marksZ: [], marksS: [], barS: null, red: [], ab: abRect, warnings: [] };

        // --- ZÜND marks (circles) ---
        if (s.mode === "ZUND") {
            var xL, xR, yT, yB, distFromEdge;
            if (s.useArtboardBounds) {
                distFromEdge = gapO + rZ;
                xL = gL + ZSM.Utils.mm2pt(distFromEdge);
                xR = gR - ZSM.Utils.mm2pt(distFromEdge);
                yT = gT - ZSM.Utils.mm2pt(distFromEdge);
                yB = gB + ZSM.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - ZSM.Utils.mm2pt(offZX);
                xR = gR + ZSM.Utils.mm2pt(offZX);
                yT = gT + ZSM.Utils.mm2pt(offZY);
                yB = gB - ZSM.Utils.mm2pt(offZY);
            }

            // Four corners + orientation mark (offset from BL corner)
            res.marksZ.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                             { cx: xR, cy: yT }, { cx: xR, cy: yB });
            res.marksZ.push({ cx: xL + ZSM.Utils.mm2pt((s.orientDist + s.markSizeZ) / sf), cy: yB });

            // Intermediate marks along each edge
            this.addSteps(res.marksZ, xL, yB, xL, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xL, yT, xR, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xR, yT, xR, yB, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksZ, xR, yB, xL, yB, ZSM.Utils.mm2pt(s.maxDist / sf));
        }

        // --- SUMMA marks (squares) ---
        if (s.mode === "SUMMA") {
            var xL, xR, yT, yB, distFromEdge;
            if (s.useArtboardBounds) {
                distFromEdge = gapO + rS;
                xL = gL + ZSM.Utils.mm2pt(distFromEdge);
                xR = gR - ZSM.Utils.mm2pt(distFromEdge);
                yT = gT - ZSM.Utils.mm2pt(distFromEdge);
                yB = gB + ZSM.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - ZSM.Utils.mm2pt(offSX);
                xR = gR + ZSM.Utils.mm2pt(offSX);
                yT = gT + ZSM.Utils.mm2pt(offSY);
                yB = gB - ZSM.Utils.mm2pt(offSY);
            }

            res.marksS.push({ cx: xL, cy: yB }, { cx: xL, cy: yT },
                             { cx: xR, cy: yT }, { cx: xR, cy: yB });

            // Summa OPOS reads marks along left/right edges only —
            // material feeds through the cutter in Y direction.
            // No intermediate marks on top/bottom edges.
            this.addSteps(res.marksS, xL, yB, xL, yT, ZSM.Utils.mm2pt(s.maxDist / sf));
            this.addSteps(res.marksS, xR, yT, xR, yB, ZSM.Utils.mm2pt(s.maxDist / sf));

            // Barcode reference line below graphic
            var barY = gB - ZSM.Utils.mm2pt(this.SUMMA_BAR_OFFSET / sf);
            res.barS = { x1: gL, x2: gR, y: barY, w: ZSM.Utils.mm2pt(this.SUMMA_BAR_WIDTH / sf) };
        }

        // --- Trim lines (Summa only, optional) ---
        if (s.mode === "SUMMA" && s.drawRed) {
            var sw   = cfg.redLineWidth / sf;
            var half = sw / 2;
            res.red.push({ x1: abRect[0], y1: abRect[1] - half, x2: abRect[2], y2: abRect[1] - half, w: sw });
            res.red.push({ x1: abRect[0], y1: abRect[3] + half, x2: abRect[2], y2: abRect[3] + half, w: sw });
        }

        return res;
    },

    /**
     * Inserts intermediate mark points along a segment if length exceeds max.
     * Endpoints are NOT pushed (they are already in the array from corner marks).
     * @param {Array}  arr - Target array to push {cx, cy} marks into.
     * @param {number} x1, y1 - Segment start (document points).
     * @param {number} x2, y2 - Segment end (document points).
     * @param {number} max    - Maximum allowed interval (document points).
     */
    addSteps: function (arr, x1, y1, x2, y2, max) {
        var dx = x2 - x1;
        // dy inverted: Illustrator Y-axis increases upward, so y1 - y2
        // gives the downward distance; subtracting it moves toward y2.
        var dy = y1 - y2;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (max > 0 && d > max) {
            var steps = Math.ceil(d / max);
            for (var i = 1; i < steps; i++) {
                arr.push({ cx: x1 + (dx / steps * i), cy: y1 - (dy / steps * i) });
            }
        }
    }
};

// ------------------------------------------------------------------------
// Module: ZSM.Bounds — bounds measurement of Illustrator content
// Part of: Illustrator Zund & Summa Marks
//
// Pure measurement responsibility — reads the document, never mutates it.
// Encapsulates clipping-aware bounds calculation including layer-level
// clipping heuristic for bracket-named layers (Illustrator's auto-named
// <Clip Group> / <Group>) and stack-based traversal of clipped groups.
//
// Public:
//   ZSM.Bounds.get(s)                — main entry; returns [L,T,R,B] or null
//   ZSM.Bounds.isArtifactLayer(l)    — bracket-named layer detection (also
//                                       used by ZSM.Draw render code)
//   ZSM.Bounds.isInsideClippedGroup  — ancestor check (also used by movePaths)
//
// Internal helpers (kept on the namespace for testability):
//   _measureLayer, _getEffectiveBounds
//
// Depends on: ZSM.Config (layerRegmarks, layerGraphics)
// ------------------------------------------------------------------------
var ZSM = ZSM || {};

ZSM.Bounds = {
    /**
     * Computes a single bounding rectangle that contains every layer's
     * top-level content (after applying skip rules for our own output
     * layer, the other-mode marks, the trim sublayer, etc.).
     *
     * Skip rules:
     *   - Regmarks (our output layer) → only OTHER mode's sublayer is
     *     measured (so a second run places marks outside the first run)
     *   - Graphics → the "Trim" sublayer (our own trim lines) is skipped
     *   - guide paths and PluginItem/NonNativeItem are skipped
     *
     * Hidden layers ARE measured — script intent is to encompass the full
     * graphic extent regardless of visibility.
     *
     * @param {Object} s - Settings (uses s.useArtboardBounds, s.mode).
     * @returns {Array|null} [L, T, R, B] in document points, or null.
     */
    get: function (s) {
        var doc = app.activeDocument;

        if (s && s.useArtboardBounds) {
            var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            return ab.artboardRect;
        }

        // Clear any prior selection — held refs can crash later DOM access
        // at C++ level if items they reference get moved/removed.
        try { doc.selection = null; } catch (ds1) {}

        var b = [Infinity, -Infinity, -Infinity, Infinity];
        var bRef = { found: false };
        var currentMode = (s && s.mode === "SUMMA") ? "Summa" : "Zünd";

        // Per-layer skip rules for sublayer recursion
        var regmarksSkip = {};
        regmarksSkip[currentMode] = true;
        // Legacy: pre-v26.5.0 versions drew trim as a Graphics/Trim SUBLAYER —
        // keep skipping it so old documents don't inflate bounds either.
        var graphicsSkip = {};
        graphicsSkip[ZSM.Config.layerTrim] = true;

        for (var li = 0; li < doc.layers.length; li++) {
            try {
                var layer = doc.layers[li];
                // Bracket-named layers ARE measured (read-only) — only state
                // mutation on them is dangerous and is guarded in
                // beginSession()/render bottom-layer rename/movePaths.
                // Reading geometricBounds is safe and lets the layer-clip
                // heuristic in _measureLayer detect <Clip Group> wrappers.

                var layName = layer.name;

                // Top-level "Trim" is OUR trim-line layer (v26.5.0+). Its lines
                // sit at the artboard edges — beyond the graphic — so measuring
                // them would inflate bounds on every re-run (artboard grows each
                // time = idempotence violation). Never measure it.
                if (layName === ZSM.Config.layerTrim) continue;

                if (layName === ZSM.Config.layerRegmarks) {
                    // Regmarks is OUR output layer. Skip its direct items
                    // (legacy/migrated marks would inflate bounds onto themselves).
                    // Recurse only into the OTHER mode's sublayer — those marks
                    // act as a boundary so a second-mode run places its marks
                    // outside the first run's marks.
                    var regSubs = layer.layers;
                    for (var rsi = 0; rsi < regSubs.length; rsi++) {
                        try {
                            var rsub = regSubs[rsi];
                            if (regmarksSkip[rsub.name]) continue;  // skip current mode
                            this._measureLayer(rsub, b, bRef, null);
                        } catch (rse) {}
                    }
                    continue;
                }

                var skipNames = null;
                if (layName === ZSM.Config.layerGraphics) skipNames = graphicsSkip;

                this._measureLayer(layer, b, bRef, skipNames);
            } catch (le) {
                // Skip unreadable top-level layer
            }
        }

        return bRef.found ? b : null;
    },

    /**
     * Recursively measures top-level items of a layer (and its sublayers),
     * updating the bounds accumulator `b` and setting `bRef.found = true`
     * when at least one item contributes.
     *
     * Top-level filter (`item.parent === layer`) excludes items nested
     * inside groups/compound paths, which are accounted for by their
     * parent group via `_getEffectiveBounds()`.
     *
     * Layer-level clipping handling: a Layer/sublayer with a bracket-
     * prefixed name (auto-generated by Illustrator: <Clip Group>, <Group>,
     * <Compound Path>) is by convention layer-clipped — its top-most
     * pageItem is the clip mask and the rest is the clipped content. The
     * DOM does not expose Layer-level `clipped` (only GroupItem has that),
     * so we infer it from the bracket name and measure ONLY the top-most
     * direct child. Otherwise the unclipped content would inflate bounds
     * far beyond the visible clipped area.
     *
     * @param {Layer}  layer     - Layer to measure.
     * @param {Array}  b         - Bounds accumulator [L, T, R, B].
     * @param {Object} bRef      - {found: bool} flag updated on first hit.
     * @param {Object} skipNames - Map of sublayer names to skip (or null).
     * @private
     */
    _measureLayer: function (layer, b, bRef, skipNames) {
        try {
            var addBounds = function (g) {
                if (!g) return;
                b[0] = Math.min(b[0], g[0]);
                b[1] = Math.max(b[1], g[1]);
                b[2] = Math.max(b[2], g[2]);
                b[3] = Math.min(b[3], g[3]);
                bRef.found = true;
            };

            var items = layer.pageItems;

            // Layer-level clipping heuristic: bracket-named layer = clipped.
            // Measure ONLY the top-most direct child (the assumed clip mask).
            // This matches what's visually inside the clipped area and
            // prevents the inner artwork's full unclipped bounds from
            // inflating the measurement.
            if (this.isArtifactLayer(layer)) {
                for (var li = 0; li < items.length; li++) {
                    try {
                        var top = items[li];
                        var direct = false;
                        try { direct = (top.parent === layer); } catch (pe) { continue; }
                        if (!direct) continue;

                        var tnT = top.typename;
                        if (tnT === "PluginItem" || tnT === "NonNativeItem") continue;
                        if ((tnT === "PathItem" || tnT === "CompoundPathItem") && top.guides) continue;

                        addBounds(this._getEffectiveBounds(top));
                        break; // measured the clip mask — done
                    } catch (ie1) {}
                }
                return;
            }

            // Normal layer: measure all top-level direct children.
            for (var i = 0; i < items.length; i++) {
                try {
                    var item = items[i];

                    var isDirect = false;
                    try { isDirect = (item.parent === layer); } catch (pe2) { continue; }
                    if (!isDirect) continue;

                    var tn = item.typename;
                    if (tn === "PluginItem" || tn === "NonNativeItem") continue;
                    if ((tn === "PathItem" || tn === "CompoundPathItem") && item.guides) continue;

                    addBounds(this._getEffectiveBounds(item));
                } catch (ie) {}
            }

            // Recurse into sublayers (incl. bracket-named ones — they get
            // their own layer-clip heuristic in the recursive call above).
            var subs = layer.layers;
            for (var sli = 0; sli < subs.length; sli++) {
                try {
                    var sub = subs[sli];
                    if (skipNames && skipNames[sub.name]) continue;
                    this._measureLayer(sub, b, bRef, skipNames);
                } catch (se) {}
            }
        } catch (le) {}
    },

    /**
     * Detects "artifact" layers — those auto-generated by Illustrator with
     * bracket-prefixed names (<Clip Group>, <Group>, <Compound Path>) or
     * paren-prefixed names. Used by:
     *   - bounds: layer-clip heuristic (measure only top child)
     *   - draw render: skip during state mutation (rename/move) to avoid
     *     breaking Illustrator's auto-management of these wrappers
     *
     * @param {Layer} layer - Layer to test.
     * @returns {boolean}
     */
    isArtifactLayer: function (layer) {
        try {
            var c = layer.name.charAt(0);
            // Defensive: empty layer name → c === "" → falsy on both
            // comparisons → returns false. The catch handles missing/
            // unreadable name (returns true, treating it as artifact).
            return c === '<' || c === '(';
        } catch (e) { return true; }
    },

    /**
     * Returns effective geometric bounds of an item, respecting clipping
     * masks at any nesting depth. For a clipped group, returns the clip
     * mask bounds. For a non-clipped group, recursively merges children's
     * effective bounds (so a clipped subgroup inside a plain group is
     * handled correctly). For leaf items, returns geometricBounds directly.
     *
     * Iterative traversal using an explicit stack to avoid stack overflow:
     * ExtendScript has a call stack limit of ~100-200 frames; deeply nested
     * groups (common in programmatically generated or imported SVG files)
     * would crash with a recursive approach.
     *
     * @param {PageItem} item - Item to measure.
     * @returns {Array|null} [L, T, R, B] in document points, or null on failure.
     * @private
     */
    _getEffectiveBounds: function (item) {
        try {
            var stack = [item];
            var b = [Infinity, -Infinity, -Infinity, Infinity];
            var found = false;

            while (stack.length > 0) {
                var cur = stack.pop();
                try {
                    if (cur.typename === "GroupItem") {
                        if (cur.clipped) {
                            // Clip mask is always pageItems[0] (topmost child)
                            var cb = cur.pageItems[0].geometricBounds;
                            b[0] = Math.min(b[0], cb[0]);
                            b[1] = Math.max(b[1], cb[1]);
                            b[2] = Math.max(b[2], cb[2]);
                            b[3] = Math.min(b[3], cb[3]);
                            found = true;
                        } else {
                            // Non-clipped group: push children for processing
                            for (var i = 0; i < cur.pageItems.length; i++) {
                                stack.push(cur.pageItems[i]);
                            }
                        }
                    } else {
                        var lb = cur.geometricBounds;
                        b[0] = Math.min(b[0], lb[0]);
                        b[1] = Math.max(b[1], lb[1]);
                        b[2] = Math.max(b[2], lb[2]);
                        b[3] = Math.min(b[3], lb[3]);
                        found = true;
                    }
                } catch (ie) {
                    // Skip items whose bounds can't be read (corrupt, PluginItem, etc.)
                }
            }
            return found ? b : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Checks whether an item is nested inside a clipped group.
     * Walks up the parent chain from the item to the layer root.
     * Returns true if any ancestor is a GroupItem with clipping enabled.
     * Used by getBounds() to skip children whose unclipped geometric bounds
     * would inflate the measured area beyond the visible clip boundary,
     * and by movePaths() to avoid extracting items from clipped groups
     * (which would break the group structure and trigger MRAP errors).
     *
     * @param {PageItem} item - Item to check.
     * @returns {boolean} True if item is inside a clipped group.
     */
    isInsideClippedGroup: function (item) {
        try {
            var p = item.parent;
            while (p) {
                if (p.typename === "GroupItem" && p.clipped) return true;
                // Stop at layer level — no need to check further
                if (p.typename === "Layer") return false;
                p = p.parent;
            }
        } catch (e) {}
        return false;
    }
};

var ZSM = ZSM || {};

ZSM.Draw = {
    /**
     * Illustrator hard coordinate limit. Anything beyond this in artboardRect or
     * pathItem positions crashes at C++ level (no JS try/catch can intercept).
     * 16383 pt ≈ 227 in ≈ 5765 mm — Large Canvas Mode upper bound.
     */
    MAX_ARTBOARD_COORD: 16383,

    /** @private Storage for layers locked at session start {idx, name}, restored on end. */
    _lockedLayers: [],

    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    /**
     * Unlocks all layers before rendering.
     * Stores locked layer names so endSession() can restore them.
     * Hidden layers are left hidden — their items are excluded from
     * bounds calculation and movePaths() cannot move from them.
     */
    beginSession: function () {
        var doc = app.activeDocument;
        this._lockedLayers = [];
        for (var i = 0; i < doc.layers.length; i++) {
            try {
                // Skip artifact layers (bracket-prefixed names like <Clip Group>)
                // — modifying their state can crash Illustrator at C++ level.
                if (ZSM.Bounds.isArtifactLayer(doc.layers[i])) continue;

                if (doc.layers[i].locked) {
                    this._lockedLayers.push({ idx: i, name: doc.layers[i].name });
                    doc.layers[i].locked = false;
                }
            } catch (e) {
                ZSM.Utils.log("beginSession: failed to unlock layer — " + doc.layers[i].name);
            }
        }
    },

    /**
     * Restores layer locks that were cleared by beginSession().
     */
    endSession: function () {
        var doc = app.activeDocument;
        // Restore by index first (stable after script adds/removes layers at
        // the top of the stack). Fall back to getByName if the index no longer
        // points to the same layer (e.g. user layers were reordered by render).
        for (var i = 0; i < this._lockedLayers.length; i++) {
            try {
                var rec = this._lockedLayers[i];
                var lay = (rec.idx < doc.layers.length && doc.layers[rec.idx].name === rec.name)
                    ? doc.layers[rec.idx]
                    : doc.layers.getByName(rec.name);
                lay.locked = true;
            } catch (e) {}
        }
        this._lockedLayers = [];
    },

    // -------------------------------------------------------------------------
    // Bounds (delegates to ZSM.Bounds — see src/lib/bounds.js)
    // -------------------------------------------------------------------------

    /**
     * Backward-compatible delegate to ZSM.Bounds.get(). The bounds-measurement
     * logic lives in src/lib/bounds.js so it can be tested in isolation from
     * the render code; this thin wrapper preserves the public ZSM.Draw API.
     *
     * @param {Object} s - Settings (uses s.useArtboardBounds, s.mode).
     * @returns {Array|null} [L, T, R, B] in document points, or null.
     */
    getBounds: function (s) {
        return ZSM.Bounds.get(s);
    },

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    /**
     * Renders all geometry into the Illustrator document.
     * Draw order: resize artboard → layers → Zünd marks → Summa marks →
     *             Summa bar → trim lines → redraw.
     *
     * @param {Object} geo - Geometry from ZSM.Core.calculateAll().
     * @param {Object} s   - Settings from UI.
     */
    render: function (geo, s) {
        var doc = app.activeDocument;

        try {
            // 0. Deselect all — removing or reordering items/layers while
            //    Illustrator holds references to selected objects can crash
            //    at C++ level. Clearing selection first prevents this.
            try { doc.selection = null; } catch (ds) {}

            // 1. Resize artboard (Auto-fit mode only)
            // Validate bounds before setting — see ZSM.Draw.MAX_ARTBOARD_COORD.
            if (!s.useArtboardBounds) {
                var abMax = this.MAX_ARTBOARD_COORD;
                if (Math.abs(geo.ab[0]) > abMax || Math.abs(geo.ab[1]) > abMax ||
                    Math.abs(geo.ab[2]) > abMax || Math.abs(geo.ab[3]) > abMax) {
                    ZSM.Utils.log("render: artboard rect " + geo.ab.join(",") +
                        " exceeds MAX_ARTBOARD_COORD=" + abMax + "pt — aborting.");
                    ZSM.Utils.error(ZSM.L.ERR_GENERIC
                        ? ZSM.L.format(ZSM.L.ERR_GENERIC, "Artboard exceeds maximum size (5765 mm).")
                        : "Artboard exceeds maximum size.");
                    return;
                }
                var activeIdx = doc.artboards.getActiveArtboardIndex();
                doc.artboards[activeIdx].artboardRect = geo.ab;
            }

            // 2. Prepare Regmarks layer — mode-specific sublayers.
            //    Each mode draws into its own sublayer ("Zünd" / "Summa")
            //    so running one mode does not destroy the other's marks.
            //    This supports the intended workflow: run ZUND first,
            //    then run SUMMA second — both sets of marks coexist.
            var reg = this.getLay(ZSM.Config.layerRegmarks);

            var modeSubName = (s.mode === "SUMMA") ? "Summa" : "Zünd";
            var zundSub = null, summaSub = null;
            try { zundSub = reg.layers.getByName("Zünd"); } catch (e) {}
            try { summaSub = reg.layers.getByName("Summa"); } catch (e) {}

            // Legacy cleanup: if no mode sublayers exist, there may be
            // marks placed directly on Regmarks from a pre-sublayer version.
            // Clear them once so they don't coexist with the new sublayers.
            if (!zundSub && !summaSub) {
                this._clearLayer(reg);
            }

            // Remove current mode's sublayer (preserves the other mode).
            // Unlock & unhide first — `.remove()` on a locked or hidden
            // sublayer can crash AI at C++ level in some versions.
            var didRemoveSub = false;
            if (s.mode === "ZUND" && zundSub) {
                try { zundSub.locked = false; zundSub.visible = true; } catch (e) {}
                try { zundSub.remove(); didRemoveSub = true; } catch (e) {}
            } else if (s.mode === "SUMMA" && summaSub) {
                try { summaSub.locked = false; summaSub.visible = true; } catch (e) {}
                try { summaSub.remove(); didRemoveSub = true; } catch (e) {}
            }

            // Force AI to commit the sublayer removal before further mutations.
            // Without this, subsequent operations operate on transient DOM state
            // which AI's C++ pipeline may flag as inconsistent — sporadic crash.
            if (didRemoveSub) {
                try { app.redraw(); } catch (rd1) {}
            }

            // Create fresh sublayer for current mode
            var modeSub = reg.layers.add();
            modeSub.name = modeSubName;

            // Z-order Regmarks to front, but only if not already there.
            // Skipping the no-op call reduces C++ pipeline pressure on
            // every render and is a documented sporadic crash vector.
            if (doc.layers.length > 0 && doc.layers[0] !== reg) {
                try { app.redraw(); } catch (rd2) {}  // commit pending state
                try { reg.zOrder(ZOrderMethod.BRINGTOFRONT); } catch (zo) {
                    ZSM.Utils.log("render: zOrder BRINGTOFRONT failed — " + zo.message);
                }
            }
            var refLayer = reg;

            // 3. Dynamic layer mapping — move spot-colored paths to named layers
            // Row existence = active (no checkbox in new UI design).
            // Skipped entirely in "marks only" mode: the user's cut layers are
            // already separated; we must not move paths or rename anything.
            if (!s.marksOnly && s.layers && s.layers.length > 0) {
                // Track which target layer names were already processed so a
                // duplicate row in s.layers (e.g. two "Cut" entries) doesn't
                // attempt a self-move (`targetLay.move(targetLay)` would
                // self-reference and can crash AI at C++ level).
                var seenTargets = {};
                for (var i = 0; i < s.layers.length; i++) {
                    var layDef = s.layers[i];
                    if (layDef.name && layDef.color && layDef.color !== "") {
                        if (seenTargets[layDef.name]) continue; // dedupe
                        seenTargets[layDef.name] = true;

                        var targetLay = this.getLay(layDef.name);
                        var hit = this.movePaths(targetLay, [layDef.color]);
                        if (!hit) {
                            geo.warnings.push(ZSM.L.format(ZSM.L.ERR_COLOR_MISSING, layDef.color));
                        }
                        // Guard against self-move (would happen if getLay
                        // resolved to the same Layer instance as refLayer,
                        // e.g. on the first iteration when targetLay is
                        // somehow Regmarks, or with hand-edited presets).
                        if (targetLay !== refLayer) {
                            try { targetLay.move(refLayer, ElementPlacement.PLACEAFTER); }
                            catch (mvErr) { ZSM.Utils.log("layer move failed: " + mvErr.message); }
                        }
                        refLayer = targetLay;
                    }
                }
            }

            // 3b. Remove empty layers left behind by movePaths.
            //     Only truly empty (no items, no sublayers), visible,
            //     non-system layers are removed. Skip Regmarks, target
            //     layers just created above, artifact layers, and hidden layers.
            var sysNames = {};
            sysNames[ZSM.Config.layerRegmarks] = true;
            for (var si = 0; si < s.layers.length; si++) {
                if (s.layers[si].name) sysNames[s.layers[si].name] = true;
            }
            // Skip empty-layer cleanup in marks-only mode — never remove the
            // user's pre-separated layers.
            if (!s.marksOnly) {
                for (var ei = doc.layers.length - 1; ei >= 0; ei--) {
                    if (doc.layers.length <= 1) break; // Illustrator requires at least 1 layer
                    try {
                        var elay = doc.layers[ei];
                        if (sysNames[elay.name]) continue;
                        if (ZSM.Bounds.isArtifactLayer(elay)) continue;
                        if (!elay.visible) continue;
                        if (elay.pageItems.length === 0 && elay.layers.length === 0) {
                            elay.remove();
                        }
                    } catch (e) {}
                }
            }

            // 4. Draw Zünd marks (circles)
            var col = this.getCol(s.markColor);
            // Non-blocking warning if the chosen mark colour isn't in the
            // document — getCol fell back to [Registration]. We draw a valid
            // mark rather than aborting, but never swap the colour silently.
            var regName = this.getRegistrationName();
            if (s.markColor && s.markColor !== "[Registration]" && s.markColor !== regName
                && !this.swatchExists(s.markColor)) {
                geo.warnings.push(ZSM.L.format(ZSM.L.WARN_COLOR_FALLBACK, s.markColor));
            }
            // Setting activeLayer can crash at C++ level if the layer is
            // in transient state (just created/added). Wrap defensively;
            // failure here is non-fatal — pathItems.* calls below target
            // modeSub directly via the explicit reference.
            try { doc.activeLayer = modeSub; } catch (al) {
                ZSM.Utils.log("render: setting activeLayer failed — " + al.message);
            }

            // Same effective SF as core.js — must include s.scaleN, else
            // marks ignore manual 1:N scaling (regression caught in v26.4.0
            // manual test). Single source of truth: ZSM.Utils.getEffectiveSF.
            var sf   = ZSM.Utils.getEffectiveSF(s);
            var zSize = (Number(s.markSizeZ) || 5.0) / sf;
            var rZ   = ZSM.Utils.mm2pt(zSize / 2);

            // Validate mark coords against Illustrator's hard limit before drawing.
            var MAX_COORD = this.MAX_ARTBOARD_COORD;

            var marksZ = geo.marksZ;
            for (var z = 0; z < marksZ.length; z++) {
                var m = marksZ[z];
                if (isNaN(m.cx) || isNaN(m.cy) || Math.abs(m.cx) > MAX_COORD || Math.abs(m.cy) > MAX_COORD) continue;
                try {
                    var circle = modeSub.pathItems.ellipse(m.cy + rZ, m.cx - rZ, rZ * 2, rZ * 2);
                    circle.fillColor     = col;
                    circle.fillOverprint = true;
                    circle.stroked       = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Zünd mark at index " + z);
                }
            }

            // 5. Draw Summa marks (squares)
            var sSize = (Number(s.markSizeS) || 3.0) / sf;
            var rS   = ZSM.Utils.mm2pt(sSize / 2);

            var marksS = geo.marksS;
            for (var sm = 0; sm < marksS.length; sm++) {
                var m = marksS[sm];
                if (isNaN(m.cx) || isNaN(m.cy) || Math.abs(m.cx) > MAX_COORD || Math.abs(m.cy) > MAX_COORD) continue;
                try {
                    var sq = modeSub.pathItems.rectangle(m.cy + rS, m.cx - rS, rS * 2, rS * 2);
                    sq.fillColor     = col;
                    sq.fillOverprint = true;
                    sq.stroked       = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Summa mark at index " + sm);
                }
            }

            // 6. Draw Summa registration bar
            if (geo.barS) {
                try {
                    var bar = modeSub.pathItems.add();
                    bar.setEntirePath([[geo.barS.x1, geo.barS.y], [geo.barS.x2, geo.barS.y]]);
                    bar.strokeColor     = col;
                    bar.strokeOverprint = true;
                    bar.strokeWidth     = geo.barS.w;
                    bar.filled          = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw OPOS bar");
                }
            }

            // 7a. Trim lines → always a DEDICATED top-level "Trim" layer (both
            //     modes). Never Regmarks (would collide with mark reading) nor a
            //     cut layer — and consistent placement regardless of mode.
            //     With trim OFF in SUMMA, remove any stale Trim layer from a
            //     previous run — its lines sit at outdated artboard edges and
            //     would mislead the operator. ZUND leaves an existing Trim
            //     alone (it belongs to the SUMMA layout, not ours to delete).
            if (geo.red && geo.red.length > 0) {
                this._drawTrimTopLevel(geo.red);
            } else if (s.mode === "SUMMA") {
                this._removeTrimLayer();
            }

            // 7b. Normal mode only — name the artwork (bottom) layer "Graphics".
            //     Skipped in marks-only (user's layers are left untouched).
            if (!s.marksOnly) {
                // Assumption: the bottom-most layer is the user's artwork layer.
                var gfxLayer = doc.layers[doc.layers.length - 1];
                if (gfxLayer.name !== ZSM.Config.layerRegmarks && !ZSM.Bounds.isArtifactLayer(gfxLayer)) {
                    // Don't auto-rename a layer the user explicitly mapped in the
                    // layer table. The move/remove passes above can leave a real,
                    // user-named target layer at the bottom — renaming THAT to
                    // "Graphics" surprised the user. sysNames holds Regmarks +
                    // every mapped name, so skip the rename for any of them; only
                    // a genuine leftover artwork layer gets named Graphics.
                    if (!sysNames[gfxLayer.name]) {
                        // Track rename so endSession() can restore lock state (W3)
                        var oldGfxName = gfxLayer.name;
                        gfxLayer.name    = ZSM.Config.layerGraphics;
                        for (var li = 0; li < this._lockedLayers.length; li++) {
                            if (this._lockedLayers[li].name === oldGfxName) {
                                this._lockedLayers[li].name = ZSM.Config.layerGraphics; break;
                            }
                        }
                    }
                    gfxLayer.locked  = false;
                    gfxLayer.visible = true;
                    // Send Graphics layer to back, but only if not already there.
                    if (doc.layers.length > 0
                        && doc.layers[doc.layers.length - 1] !== gfxLayer) {
                        try { app.redraw(); } catch (rd3) {}  // commit pending state
                        try { gfxLayer.zOrder(ZOrderMethod.SENDTOBACK); } catch (zo2) {
                            ZSM.Utils.log("render: zOrder SENDTOBACK failed — " + zo2.message);
                        }
                    }
                }
            }

            // Non-fatal notices (missing colour → fallback, unmatched layer
            // colour) — surface as a WARNING, not an error: the marks rendered.
            if (geo.warnings.length > 0) ZSM.Utils.warn(geo.warnings.join("\n"));
            app.redraw();

        } catch (e) {
            ZSM.Utils.error(ZSM.L.ERR_RENDER_CRITICAL + e.message);
        }
    },

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Draws the red trim lines into a DEDICATED top-level "Trim" layer — never
     * into Regmarks (would collide with mark reading) nor into a cut layer.
     * Same placement in both normal and marks-only mode (consistent for the
     * operator). Refreshes the layer if it already exists (idempotent re-runs).
     * No-op when there are no trim lines.
     * @param {Array} redLines - geo.red entries ({x1,y1,x2,y2,w}).
     * @private
     */
    _drawTrimTopLevel: function (redLines) {
        if (!redLines || redLines.length === 0) return;
        var doc = app.activeDocument;
        // CRITICAL (C++ crash guard): mark drawing leaves doc.activeLayer pointing
        // at a SUBLAYER (the mode sublayer). Calling doc.layers.add() to create a
        // TOP-LEVEL layer while a sublayer is active crashes Illustrator at the
        // C++ level. Reset the active layer to a top-level layer, clear selection,
        // and commit pending mutations BEFORE any structural change.
        try { doc.selection = null; } catch (e1) {}
        try { if (doc.layers.length > 0) doc.activeLayer = doc.layers[0]; } catch (e2) {}
        try { app.redraw(); } catch (e3) {}

        var trimLayer = null;
        try { trimLayer = doc.layers.getByName(ZSM.Config.layerTrim); } catch (e) { trimLayer = null; }
        if (trimLayer) {
            try { trimLayer.locked = false; trimLayer.visible = true; } catch (eu) {}
            this._clearLayer(trimLayer);          // refresh — drop old trim lines
            try { app.redraw(); } catch (rd) {}
        } else {
            try {
                trimLayer = doc.layers.add();
                trimLayer.name = ZSM.Config.layerTrim;
                try { app.redraw(); } catch (rd2) {}   // commit layer creation
            } catch (eAdd) {
                ZSM.Utils.log("trim: top-level layer add failed — " + eAdd.message);
                return;
            }
        }
        this._paintRedLines(trimLayer, redLines);
    },

    /**
     * Removes the top-level "Trim" layer if present. Called when a SUMMA run
     * has trim lines OFF — stale lines from a previous run sit at outdated
     * artboard edges. Same C++ crash guard as _drawTrimTopLevel: deselect,
     * move activeLayer OFF the layer being removed, commit, then remove.
     * @private
     */
    _removeTrimLayer: function () {
        var doc = app.activeDocument;
        var trimLayer = null;
        try { trimLayer = doc.layers.getByName(ZSM.Config.layerTrim); } catch (e) { return; }
        if (!trimLayer || doc.layers.length <= 1) return;  // AI needs >= 1 layer
        try { doc.selection = null; } catch (e1) {}
        // activeLayer must NOT be the layer being removed
        try {
            for (var i = 0; i < doc.layers.length; i++) {
                if (doc.layers[i] !== trimLayer) { doc.activeLayer = doc.layers[i]; break; }
            }
        } catch (e2) {}
        try { app.redraw(); } catch (e3) {}
        try {
            trimLayer.locked = false; trimLayer.visible = true;
            trimLayer.remove();
            try { app.redraw(); } catch (rd) {}
        } catch (e4) {
            ZSM.Utils.log("trim: stale layer remove failed — " + e4.message);
        }
    },

    /**
     * Draws red trim lines as direct children of the given layer.
     * @param {Layer} layer    - Host layer.
     * @param {Array} redLines - geo.red entries ({x1,y1,x2,y2,w}).
     * @private
     */
    _paintRedLines: function (layer, redLines) {
        var redColor = new CMYKColor();
        redColor.magenta = 100;
        redColor.yellow  = 100;
        for (var r = 0; r < redLines.length; r++) {
            try {
                var line = layer.pathItems.add();
                line.setEntirePath([
                    [redLines[r].x1, redLines[r].y1],
                    [redLines[r].x2, redLines[r].y2]
                ]);
                line.strokeColor = redColor;
                line.strokeWidth = redLines[r].w;
                line.filled      = false;
            } catch (e) {
                ZSM.Utils.log("render: failed to draw trim line at index " + r);
            }
        }
    },

    /**
     * Removes all page items and sublayers from a layer, leaving it empty.
     * Used to clear old Regmarks before re-rendering.
     * @param {Layer} layer - Layer to clear.
     * @private
     */
    _clearLayer: function (layer) {
        try {
            // Remove sublayers first. Unlock & unhide each before remove —
            // .remove() on a locked or hidden sublayer can crash AI at C++.
            while (layer.layers.length > 0) {
                try {
                    var sub = layer.layers[0];
                    try { sub.locked = false; sub.visible = true; } catch (eu) {}
                    sub.remove();
                } catch (e) { break; }
            }
            // Remove page items (iterate backwards to avoid index shifts)
            var items = layer.pageItems;
            for (var i = items.length - 1; i >= 0; i--) {
                try { items[i].remove(); } catch (e) {}
            }
        } catch (e) {
            ZSM.Utils.log("_clearLayer: " + e.message);
        }
    },

    // _isArtifactLayer / _getEffectiveBounds / _isInsideClippedGroup —
    // moved to ZSM.Bounds (src/lib/bounds.js). Render code in this file
    // now references them as ZSM.Bounds.isArtifactLayer / .isInsideClippedGroup
    // directly (see callers in beginSession, render, movePaths).

    /**
     * Gets an existing layer by name or creates it if it doesn't exist.
     * @param {string} name - Layer name.
     * @returns {Layer} Illustrator Layer object.
     */
    getLay: function (name) {
        try {
            return app.activeDocument.layers.getByName(name);
        } catch (e) {
            var layer = app.activeDocument.layers.add();
            layer.name = name;
            return layer;
        }
    },

    /**
     * Moves all paths whose fill or stroke matches any of the given spot color
     * names (case-insensitive) to the target layer.
     * Uses a snapshot to avoid live-collection issues during iteration.
     *
     * @param {Layer}  targetLayer - Destination layer.
     * @param {Array}  names       - Spot color names to match.
     * @returns {boolean} True if at least one path was moved.
     */
    movePaths: function (targetLayer, names) {
        try {
            var doc = app.activeDocument;
            var found = false;

            // --- 1. CompoundPathItems (move as atomic units) ---
            var compounds = doc.compoundPathItems;
            var cpSnap = [];
            for (var ci = 0; ci < compounds.length; ci++) cpSnap.push(compounds[ci]);

            // Track moved compound parents so we skip their children in step 2
            var movedCompounds = [];

            for (var ci = 0; ci < cpSnap.length; ci++) {
                var cp = cpSnap[ci];
                // Skip items on artifact layers — moving them could crash AI.
                // isArtifactLayer treats an unreadable layer name as artifact
                // (returns true) so a transient/broken layer item is skipped
                // rather than risked — the safe default for a mutating op.
                if (ZSM.Bounds.isArtifactLayer(cp.layer)) continue;
                if (ZSM.Bounds.isInsideClippedGroup(cp)) continue;
                if (cp.pathItems.length === 0) continue;

                // Match by first sub-path color (all sub-paths share the same color)
                var first = cp.pathItems[0];
                if (this._matchesSpotColor(first, names)) {
                    try {
                        cp.move(targetLayer, ElementPlacement.PLACEATEND);
                        for (var sp = 0; sp < cp.pathItems.length; sp++) {
                            if (cp.pathItems[sp].filled)  cp.pathItems[sp].fillOverprint   = true;
                            if (cp.pathItems[sp].stroked) cp.pathItems[sp].strokeOverprint = true;
                        }
                        movedCompounds.push(cp);
                        found = true;
                    } catch (e) {}
                }
            }

            // --- 2. Standalone PathItems ---
            var items    = doc.pathItems;
            var snapshot = [];
            for (var i = 0; i < items.length; i++) snapshot.push(items[i]);

            for (var i = 0; i < snapshot.length; i++) {
                var item = snapshot[i];

                // Skip items on artifact layers — moving them could crash AI
                // (see compound-path loop above for the unreadable-name rationale).
                if (ZSM.Bounds.isArtifactLayer(item.layer)) continue;

                // Skip items nested inside clipped groups — moving them out
                // would break the group structure and trigger MRAP errors.
                if (ZSM.Bounds.isInsideClippedGroup(item)) continue;

                // Skip items already moved as part of a CompoundPathItem
                var alreadyMoved = false;
                try {
                    if (item.parent && item.parent.typename === "CompoundPathItem") alreadyMoved = true;
                } catch (e) {}
                if (alreadyMoved) continue;

                if (this._matchesSpotColor(item, names)) {
                    try {
                        item.move(targetLayer, ElementPlacement.PLACEATEND);
                        if (item.filled)  item.fillOverprint   = true;
                        if (item.stroked) item.strokeOverprint = true;
                        found = true;
                    } catch (e) {}
                }
            }
            return found;
        } catch (e) {
            ZSM.Utils.log("movePaths error: " + e.message);
            return false;
        }
    },

    /**
     * Checks if a path's fill or stroke matches any of the given spot color names.
     * @param {PathItem} item  - Path to test.
     * @param {Array}    names - Spot color names (case-insensitive).
     * @returns {boolean} True if match found.
     * @private
     */
    _matchesSpotColor: function (item, names) {
        for (var n = 0; n < names.length; n++) {
            var target = names[n].toLowerCase();
            if (item.stroked && item.strokeColor.typename === "SpotColor") {
                if (item.strokeColor.spot.name.toLowerCase() === target) return true;
            }
            if (item.filled && item.fillColor.typename === "SpotColor") {
                if (item.fillColor.spot.name.toLowerCase() === target) return true;
            }
        }
        return false;
    },

    /**
     * Resolves a color name to an Illustrator Color object.
     * Resolution order: existing swatch → [Registration] fallback.
     *
     * IMPORTANT — does NOT auto-create a swatch for an unknown name. Silently
     * minting a magenta spot for a missing reference is unsafe in prepress: it
     * mutates the document, produces an arbitrary colour that can mis-separate
     * on a cutter, and pollutes every file in a batch. Instead a missing colour
     * falls back to [Registration] (always a valid, cutter-readable mark colour)
     * and the caller (render) surfaces a non-blocking warning naming the colour
     * so the operator can fix it. See ZSM.Draw.swatchExists for the detection.
     *
     * @param {string} name - Swatch or spot color name.
     * @returns {Color} Illustrator Color object (never null).
     */
    getCol: function (name) {
        var doc = app.activeDocument;
        if (!name) name = this.getRegistrationName();
        try {
            return doc.swatches.getByName(name).color;
        } catch (e) {
            // Missing swatch → safe [Registration] fallback, never auto-create.
            return this.registrationColor();
        }
    },

    /**
     * Returns the document's [Registration] swatch colour, or 100% K CMYK as a
     * last-resort fallback if it cannot be read. Used wherever a missing or
     * empty colour must degrade to a safe, universally valid mark colour.
     *
     * @returns {Color} Registration (or black) Color object.
     */
    registrationColor: function () {
        try {
            return app.activeDocument.swatches.getByName(this.getRegistrationName()).color;
        } catch (e) {
            var k = new CMYKColor();
            k.black = 100;
            return k;
        }
    },

    /**
     * True if a swatch with the given name exists in the active document.
     * Used by render() to decide whether a missing-colour warning is needed
     * without a second resolution pass through getCol().
     *
     * @param {string} name - Swatch name.
     * @returns {boolean}
     */
    swatchExists: function (name) {
        try { app.activeDocument.swatches.getByName(name); return true; }
        catch (e) { return false; }
    },

    /**
     * Returns the localized name of the [Registration] swatch.
     * Registration is always at swatches index 1 in any Illustrator locale
     * (index 0 = [None]). This avoids hardcoding locale-specific names
     * like [Registrační] (CS), [Passermarke] (DE), etc.
     *
     * @returns {string} Localized Registration swatch name.
     */
    getRegistrationName: function () {
        try {
            return app.activeDocument.swatches[1].name;
        } catch (e) {
            return "[Registration]";
        }
    },

    /**
     * Detects the most likely cut-path spot color in the active document.
     * Checks document spots against a priority list of industry-standard
     * cut color names (case-insensitive). Returns the first match.
     * Falls back to localized Registration name if no match found.
     *
     * Priority: CutContour (Versaworks/Onyx/Caldera) → Thru-cut (Zünd) →
     *           Kiss-cut (Zünd) → Cut (generic)
     *
     * @returns {string} Detected spot color name or Registration fallback.
     */
    detectCutColor: function () {
        var priority = ["cutcontour", "thru-cut", "kiss-cut", "cut"];
        try {
            var spots = app.activeDocument.spots;
            for (var p = 0; p < priority.length; p++) {
                for (var i = 0; i < spots.length; i++) {
                    try {
                        if (spots[i].name.toLowerCase() === priority[p]) {
                            return spots[i].name; // preserve original case
                        }
                    } catch (e2) {}
                }
            }
        } catch (e) {}
        return this.getRegistrationName();
    },

    /**
     * Returns a map of spot-color name → [r,g,b,1] (0–1 floats) for swatch
     * preview chips in the layer-mapping UI. Registration maps to the sentinel
     * "REG" so the UI can render it with a distinct (e.g. ring) treatment.
     * RGB conversion is delegated to ZSM.UI.colorToRGB.
     *
     * @returns {Object} name → "REG" | [r,g,b,1].
     */
    getSwatchRGBMap: function () {
        var map = {};
        var regName = this.getRegistrationName();
        map[regName] = "REG";
        map["[Registration]"] = "REG";
        try {
            var spots = app.activeDocument.spots;
            for (var i = 0; i < spots.length; i++) {
                try {
                    var n = spots[i].name;
                    if (n.charAt(0) === "[") continue;
                    var rgb = ZSM.UI.colorToRGB(spots[i].color);
                    if (rgb) map[n] = rgb;
                } catch (e2) {}
            }
        } catch (e) {}
        return map;
    },

    /**
     * Returns all non-system swatch names from the active document,
     * prepended with [Registration].
     * Used to populate the spot color dropdown in layer mapping UI.
     *
     * Iterates doc.spots (not doc.swatches) so only spot colors appear.
     * This prevents process CMYK colors from showing in the dropdown —
     * movePaths() matches by SpotColor typename, so process colors
     * would never match and confuse the user (fixes Bug B).
     *
     * @returns {Array} Array of spot color name strings.
     */
    getSwatchNames: function () {
        var regName = this.getRegistrationName();
        var names = [regName];
        try {
            var spots = app.activeDocument.spots;
            for (var i = 0; i < spots.length; i++) {
                try {
                    var n = spots[i].name;
                    // Skip system spots (wrapped in brackets) — Registration already added
                    if (n.charAt(0) === "[") continue;
                    var duplicate = false;
                    for (var j = 0; j < names.length; j++) {
                        if (names[j] === n) { duplicate = true; break; }
                    }
                    if (!duplicate) names.push(n);
                } catch (e2) {
                    // Skip unreadable spots (corrupt, unresolved library refs)
                }
            }
        } catch (e) {}
        return names;
    },

    /**
     * Returns suggested layer names for the editable layer dropdown.
     *
     * Structure: document layers first (what user already has),
     * then predefined industry-standard cutting/processing method names
     * that are not already present in the document.
     * System layers (Regmarks, Graphics) are excluded.
     *
     * Predefined names follow Zünd Design Center v7.2 method list
     * plus common print-related layers (White, Varnish).
     * Order: most common cutting first, then processing, then print.
     *
     * @returns {Array} Array of layer name strings.
     */
    getLayerNames: function () {
        // Predefined industry-standard names (not localized — these are technical terms)
        var predefined = [
            // Common cutting
            "Cut", "Thru-cut", "Kiss-cut", "CutContour",
            // Processing
            "Score", "Crease", "Perforation", "V-cut", "Bevel-cut",
            "Route", "Engrave", "Draw", "Punch", "Drill",
            // Registration
            "Register",
            // Print-related
            "White", "Varnish"
        ];

        // 1. Collect document layers (excluding system layers)
        var docNames = [];
        try {
            var layers = app.activeDocument.layers;
            for (var i = 0; i < layers.length; i++) {
                var n = layers[i].name;
                if (n === ZSM.Config.layerRegmarks || n === ZSM.Config.layerGraphics
                    || n === ZSM.Config.layerTrim) continue;
                // Skip artifact layers (bracket-prefixed names like <Clip Group>)
                if (ZSM.Bounds.isArtifactLayer(layers[i])) continue;
                docNames.push(n);
            }
        } catch (e) {}

        // 2. Build final list: doc layers + predefined (skip duplicates)
        var names = [];
        for (var i = 0; i < docNames.length; i++) names.push(docNames[i]);
        for (var i = 0; i < predefined.length; i++) {
            var exists = false;
            for (var j = 0; j < names.length; j++) {
                if (names[j] === predefined[i]) { exists = true; break; }
            }
            if (!exists) names.push(predefined[i]);
        }
        return names;
    }
};

var ZSM = ZSM || {};

ZSM.UI = {

    // =====================================================================
    // Public entry point
    // =====================================================================

    /**
     * Builds and displays the settings dialog for the active mode.
     * Switching modes closes the current dialog and reopens with the new
     * layout — no hidden panels, no ghost spacing.
     *
     * @param {Object} pData - Preset wrapper from Storage.load() or getDefaults().
     * @returns {Object|null} Updated preset wrapper, or null on cancel.
     */
    show: function (pData) {
        var c = ZSM.Config;

        // Safety: ensure wrapper structure is valid
        if (!pData || !pData.presets) {
            pData = { activePreset: c.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        }
        if (!pData.presets[pData.activePreset]) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }

        // Fetch live document data once (expensive DOM queries — getSwatchNames
        // iterates doc.spots, getLayerNames iterates doc.layers, detectCutColor
        // does both). Computed here at show() entry so the mode-switch loop
        // below reuses the same docData on every iteration without re-querying
        // the DOM. Runs in front of any UI construction.
        var docData = {
            swatches:      ZSM.Draw.getSwatchNames(),
            swatchRGB:     ZSM.Draw.getSwatchRGBMap(),
            layers:        ZSM.Draw.getLayerNames(),
            detectedColor: ZSM.Draw.detectCutColor()
        };

        // Determine initial mode from [Last Settings] or active preset
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        var mode = (initPreset && initPreset.mode === "SUMMA") ? "SUMMA" : "ZUND";

        // Mode-switch loop: buildDialog returns result or a switch signal
        for (;;) {
            var outcome = this.buildDialog(mode, pData, docData);
            if (outcome && outcome._switchTo) {
                mode = outcome._switchTo;
                continue;
            }
            return outcome; // null (cancel) or pData (OK)
        }
    },

    // =====================================================================
    // Dialog builder — creates a mode-specific dialog
    // =====================================================================

    /**
     * Constructs and shows a dialog tailored to the given mode.
     * Returns the updated pData wrapper on OK, null on Cancel,
     * or {_switchTo: "ZUND"|"SUMMA"} when the user switches mode.
     *
     * @param {string} mode    - "ZUND" or "SUMMA"
     * @param {Object} pData   - Preset wrapper (mutated in place on OK/Save)
     * @param {Object} docData - {swatches, layers, detectedColor}
     * @returns {Object|null}
     */
    buildDialog: function (mode, pData, docData) {
        var c = ZSM.Config;
        var l = ZSM.L;
        var self = this;
        var isZ = (mode === "ZUND");
        var isS = (mode === "SUMMA");

        // Resolve initial values: [Last Settings] → active preset → defaults
        var sData = pData.presets["[Last Settings]"]
                 || pData.presets[pData.activePreset]
                 || c.getDefaults();

        // =================================================================
        // Window
        // =================================================================
        var w = new Window("dialog", c.ui.title);
        w.orientation    = "column";
        w.alignChildren  = ["fill", "top"];
        w.margins        = [20, 14, 20, 12];
        w.spacing        = 10;
        w.preferredSize.width = 390;

        // =================================================================
        // Panel: Presets
        // =================================================================
        var pPreset = w.add("panel", undefined, l.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        pPreset.margins = 12;
        pPreset.spacing = 8;

        // Row 1: label + dropdown (full width)
        var grpPresetTop = pPreset.add("group");
        grpPresetTop.alignment = ["fill", "top"];
        grpPresetTop.spacing   = 8;
        grpPresetTop.add("statictext", undefined, l.PRESET_LABEL);

        var ddPreset = grpPresetTop.add("dropdownlist", undefined, []);
        ddPreset.alignment = ["fill", "center"];
        ddPreset.helpTip = l.TIP_PRESET;

        // Revert (↺) — reload the active preset as saved, discarding unsaved
        // edits. Compact icon-only button (N7) so it no longer crowds the preset
        // dropdown; the helpTip carries the meaning. Enabled only when the preset
        // has unsaved changes (gated in refreshModifiedIndicator). Distinct from
        // Reset/Defaults (which loads factory defaults).
        var btnRevert = grpPresetTop.add("button", undefined, "↺");
        btnRevert.preferredSize = [30, 24];
        btnRevert.alignment = ["right", "center"];
        btnRevert.helpTip = l.TIP_REVERT;

        // Row 2: action buttons. "Defaults" (factory reset, N8) sits on the left
        // — it's a different class of action from the per-preset Save/Save As/
        // Delete cluster on the right, so it gets its own visual slot instead of
        // being hidden behind a [Default] dropdown pick (low discoverability).
        var grpPresetBtns = pPreset.add("group");
        grpPresetBtns.alignment = ["fill", "top"];
        grpPresetBtns.spacing = 8;

        var btnReset = grpPresetBtns.add("button", undefined, l.BTN_RESET);
        btnReset.preferredSize.width = 80;
        btnReset.alignment = ["left", "center"];
        btnReset.helpTip = l.TIP_RESET;

        var grpPresetBtnsR = grpPresetBtns.add("group");
        grpPresetBtnsR.alignment = ["right", "center"];
        grpPresetBtnsR.spacing = 8;

        // Uniform width so the three buttons line up evenly (text-based widths
        // made them ragged: "Uložit" vs "Uložit jako…" vs "Smazat").
        var PRESET_BTN_W = 92;
        var btnSave = grpPresetBtnsR.add("button", undefined, l.BTN_SAVE);
        btnSave.preferredSize.width = PRESET_BTN_W;
        btnSave.helpTip = l.TIP_SAVE;

        var btnSaveAs = grpPresetBtnsR.add("button", undefined, l.BTN_SAVE_AS);
        btnSaveAs.preferredSize.width = PRESET_BTN_W;
        btnSaveAs.helpTip = l.TIP_SAVE_AS;

        var btnDel = grpPresetBtnsR.add("button", undefined, l.BTN_DEL);
        btnDel.preferredSize.width = PRESET_BTN_W;
        btnDel.helpTip = l.TIP_DEL;

        // =================================================================
        // Panel: Output Settings (merges the former Technology + Document panels)
        // Mode, source and scale all describe HOW the job is emitted, so one
        // bordered block groups them and lowers the dialog by one panel border.
        // =================================================================
        var pOutput = w.add("panel", undefined, l.PANEL_OUTPUT);
        pOutput.alignChildren = ["left", "top"];
        pOutput.margins = 12;
        pOutput.spacing = 8;

        // Shared left-column width: "Režim:", "Zdroj:" and the scale spacer all
        // reserve this, so the controls after them share one left edge. A
        // statictext (not a group) carries the width — ScriptUI honours
        // preferredSize on leaf controls but ignores it on groups.
        var LABEL_COL_W = 72;

        // Mode row: label + segmented-style selector (H2). ScriptUI has no
        // native segmented control, so two mutually-exclusive radio buttons in
        // one group give the same one-glance "pick a technology" affordance
        // without the extra click a dropdown costs.
        var grpMode = pOutput.add("group");
        grpMode.orientation   = "row";
        grpMode.alignChildren = ["left", "center"];
        grpMode.spacing       = 8;
        var stMode = grpMode.add("statictext", undefined, l.LBL_MODE);
        stMode.preferredSize.width = LABEL_COL_W;
        stMode.helpTip = l.TIP_MODE;
        var rbZund  = grpMode.add("radiobutton", undefined, l.MODE_ZUND);
        var rbSumma = grpMode.add("radiobutton", undefined, l.MODE_SUMMA);
        rbZund.preferredSize.width  = 70;
        rbSumma.preferredSize.width = 70;
        rbZund.value  = isZ;
        rbSumma.value = isS;
        rbZund.helpTip  = l.TIP_MODE;
        rbSumma.helpTip = l.TIP_MODE;

        // --- ZUND only: source radio buttons ---
        var grpSrc, rbAuto, rbFixed;
        if (isZ) {
            grpSrc = pOutput.add("group");
            grpSrc.orientation   = "row";
            grpSrc.alignChildren = ["left", "center"];
            grpSrc.spacing       = 8;
            // Leading "Zdroj:" label (72px) under "Režim:" — the unlabelled
            // second radio row was ambiguous about what it selected.
            var stSource = grpSrc.add("statictext", undefined, l.LBL_SOURCE);
            stSource.preferredSize.width = LABEL_COL_W;
            rbAuto  = grpSrc.add("radiobutton", undefined, l.SRC_AUTO);
            rbFixed = grpSrc.add("radiobutton", undefined, l.SRC_FIXED);
            if (sData.useArtboardBounds) rbFixed.value = true;
            else rbAuto.value = true;
            rbAuto.helpTip  = l.TIP_SRC_AUTO;
            rbFixed.helpTip = l.TIP_SRC_FIXED;
        }

        // --- Scale row (Phase 2): 72px spacer + checkbox + 1:N field ---
        // Scale describes the document, but lives in the merged Output panel now.
        // Derived state: scaleN > 1 → checkbox checked, field enabled.
        // scaleN === 1 → checkbox unchecked, field disabled at "1".
        // Single source of truth: scaleN value (no extra checkbox state stored).
        var grpScale = pOutput.add("group");
        grpScale.orientation   = "row";
        grpScale.alignChildren = ["left", "center"];
        grpScale.spacing       = 10;   // breathing room between checkbox and the ratio

        // Leading spacer (LABEL_COL_W) aligns the checkbox's left edge with the
        // radios above. A statictext carries the width reliably (groups ignore it).
        var stScaleSpacer = grpScale.add("statictext", undefined, "");
        stScaleSpacer.preferredSize.width = LABEL_COL_W;

        var cbScale = grpScale.add("checkbox", undefined, l.SCALE_CHECKBOX);
        cbScale.helpTip = l.TIP_SCALE_CHECKBOX;

        // "1:" hugs its field as one unit (tight spacing) instead of floating
        // with equal gaps on both sides.
        var grpRatio = grpScale.add("group");
        grpRatio.orientation   = "row";
        grpRatio.alignChildren = ["left", "center"];
        grpRatio.spacing       = 3;

        var stScaleLabel = grpRatio.add("statictext", undefined, l.SCALE_FIELD_LABEL);
        stScaleLabel.helpTip = l.TIP_SCALE_FIELD;

        var etScale = grpRatio.add("edittext", undefined, "1");
        etScale.preferredSize.width = 60;   // match the other numeric inputs (addRow)
        etScale.helpTip = l.TIP_SCALE_FIELD;

        /** Enable/disable the ratio field AND its "1:" label together, so the
         *  whole "1:N" unit greys out as one when scaling is off. */
        function setScaleEnabled(on) {
            etScale.enabled      = on;
            stScaleLabel.enabled = on;
        }

        // Sync UI to initial scaleN value
        var initScaleN = parseInt(sData.scaleN, 10);
        if (isNaN(initScaleN) || initScaleN < 1) initScaleN = 1;
        if (initScaleN > 1) {
            cbScale.value   = true;
            etScale.text    = String(initScaleN);
            setScaleEnabled(true);
        } else {
            cbScale.value   = false;
            etScale.text    = "1";
            setScaleEnabled(false);
        }

        /** Read current scaleN from the UI controls (clean integer 1..10). */
        function readScaleN() {
            if (!cbScale.value) return 1;
            var n = parseInt(etScale.text, 10);
            if (isNaN(n) || n < 1) return 1;
            if (n > 10) return 10;
            return n;
        }

        /** Apply title suffix when scaling is active. */
        function applyTitleSuffix() {
            var n = readScaleN();
            var baseTitle = c.ui.title || "";
            // Strip any previous suffix " — 1:N"
            var base = baseTitle.replace(/\s*—\s*1:\d+\s*$/, "");
            try {
                w.text = (n > 1) ? (base + " — 1:" + n) : base;
            } catch (e) {}
        }
        applyTitleSuffix();   // initial

        cbScale.onClick = function () {
            if (cbScale.value) {
                setScaleEnabled(true);
                // Auto-suggest "10" when activating from "1"
                var cur = parseInt(etScale.text, 10);
                if (isNaN(cur) || cur <= 1) etScale.text = "10";
            } else {
                setScaleEnabled(false);
                etScale.text = "1";
            }
            applyTitleSuffix();
            refreshModifiedIndicator();
        };

        // onChange (commit, focus leaves the field) vs onChanging (every
        // keystroke) MUST differ here: the auto-uncheck on "1" may only run on
        // commit. If it ran per keystroke, typing "12" would disable the field
        // after the first "1" — mid-typing lockout. liveValidateAll paints the
        // field red / gates Generate for out-of-range values (e.g. 50).
        etScale.onChange = function () {
            var n = parseInt(etScale.text, 10);
            // Auto-uncheck when user explicitly commits 1
            if (n === 1) {
                cbScale.value   = false;
                setScaleEnabled(false);
            }
            applyTitleSuffix();
            refreshModifiedIndicator();
            liveValidateAll();
        };
        etScale.onChanging = function () {
            applyTitleSuffix();
            refreshModifiedIndicator();
            liveValidateAll();
        };

        // =================================================================
        // Panel: Gap / Geometry (mode-specific rows)
        // =================================================================
        var pGeo = w.add("panel", undefined, l.PANEL_GEO);
        pGeo.alignChildren = ["fill", "top"];
        pGeo.margins = 12;
        pGeo.spacing = 10;

        // ZUND only: gap from graphic
        var rGapGZ;
        if (isZ) {
            rGapGZ = self.addRow(pGeo, l.GAP_GZ, sData.gapInner, l.TIP_GAP_GZ);
            // Gap from graphic is irrelevant in Fixed mode
            rGapGZ.inp.enabled = !(sData.useArtboardBounds);
        }

        // Shared rows
        var rGapZO = self.addRow(pGeo, l.GAP_ZO,  sData.gapOuter, l.TIP_GAP_ZO);
        var rMaxD  = self.addRow(pGeo, l.MAX_DIST, sData.maxDist,  l.TIP_MAX_DIST);

        // Mode-specific mark size
        var rMarkSize;
        if (isZ) {
            rMarkSize = self.addRow(pGeo, l.MARK_SIZE_Z, sData.markSizeZ || 5, l.TIP_SIZE_Z);
        } else {
            rMarkSize = self.addRow(pGeo, l.MARK_SIZE_S, sData.markSizeS || 3, l.TIP_SIZE_S);
        }

        // ZUND only: orientation mark offset
        var rOrientDist;
        if (isZ) {
            rOrientDist = self.addRow(pGeo, l.ORIENT_DIST, sData.orientDist !== undefined ? sData.orientDist : 100, l.TIP_ORIENT_DIST);
        }

        // Shared: mark color
        var rColor = self.addColorRow(pGeo, l.MARK_COLOR, sData.markColor, docData.swatches, l.TIP_MARK_COLOR, docData.swatchRGB);

        // =================================================================
        // Panel: Feed (SUMMA only — not created for ZUND)
        // =================================================================
        var rFT, rFB, chRed;
        if (isS) {
            var pFeed = w.add("panel", undefined, l.PANEL_FEED);
            pFeed.alignChildren = ["fill", "top"];
            pFeed.margins = 12;
            pFeed.spacing = 10;

            rFT   = self.addRow(pFeed, l.FEED_TOP, sData.feedTop,    l.TIP_FEED_TOP);
            rFB   = self.addRow(pFeed, l.FEED_BOT, sData.feedBottom, l.TIP_FEED_BOT);
            chRed = pFeed.add("checkbox", undefined, l.DRAW_RED);
            chRed.value   = sData.drawRed;
            chRed.helpTip = l.TIP_DRAW_RED;
        }

        // =================================================================
        // Panel: Layer to Color mapping (shared, dynamic rows)
        // =================================================================
        var pLay = w.add("panel", undefined, l.PANEL_LAYERS);
        pLay.alignChildren = ["fill", "top"];
        pLay.margins = 12;
        pLay.spacing = 10;

        // "Marks only" toggle — sits atop the mapping table it controls. When on,
        // the script draws only marks and never touches layers, so the mapping
        // below is irrelevant and gets greyed out (see applyMarksOnlyState).
        var cbMarksOnly = pLay.add("checkbox", undefined, l.MARKS_ONLY);
        cbMarksOnly.helpTip = l.TIP_MARKS_ONLY;
        cbMarksOnly.value   = (sData.marksOnly === true);

        // Column headers
        var grpHeaders = pLay.add("group");
        grpHeaders.alignment = "fill";
        grpHeaders.spacing   = 5;
        var hdrLayer = grpHeaders.add("statictext", undefined, l.COL_LAYER);
        hdrLayer.preferredSize.width = 178;
        var hdrColor = grpHeaders.add("statictext", undefined, l.COL_COLOR);
        hdrColor.preferredSize.width = 120;
        var hdrSpacer = grpHeaders.add("statictext", undefined, "");
        hdrSpacer.preferredSize.width = 30;

        // Row container (add button lives outside — ScriptUI limitation)
        var layContainer = pLay.add("group");
        layContainer.orientation   = "column";
        layContainer.alignChildren = ["fill", "top"];
        layContainer.spacing       = 6;

        var layRows    = [];
        var MAX_LAYERS = 8;

        function updateRemoveButtons() {
            var canRemove = layRows.length > 1;
            for (var r = 0; r < layRows.length; r++) {
                layRows[r].btnRemove.enabled = canRemove;
            }
        }

        /**
         * Builds a single layer-to-color mapping row (Harbs pattern).
         * @param {Object} def - {name, color}
         */
        function buildLayerRow(def) {
            var grp = layContainer.add("group");
            grp.alignment = "fill";
            grp.spacing   = 5;

            var stack = grp.add("group");
            stack.orientation   = "stack";
            stack.alignChildren = ["left", "center"];
            // Stack width follows its widest child — ScriptUI ignores
            // preferredSize on GROUP containers, so the column width (178, the
            // same left edge as the spot swatch and numeric fields) is set on
            // ddLayer directly, not on the stack.

            var ddLayer = stack.add("dropdownlist", undefined, docData.layers);
            ddLayer.preferredSize.width = 178;
            ddLayer.helpTip = l.TIP_LAY_NAME;

            var etLayer = stack.add("edittext", undefined, def.name || "");
            // Narrower than the dropdown behind it (178) so a long custom layer
            // name never runs under the dropdown's expand arrow (N6).
            etLayer.preferredSize.width = 152;
            etLayer.helpTip = l.TIP_LAY_NAME;

            ddLayer.onChange = function () {
                // Use ddlValue so picking a synthetic "(missing)" item copies the
                // raw layer name into the edittext, not the display marker.
                if (ddLayer.selection) etLayer.text = ZSM.UI.ddlValue(ddLayer);
            };
            ZSM.UI.selectDDL(ddLayer, def.name || "");

            var swColor = ZSM.UI.makeSwatch(grp);
            var ddColor = grp.add("dropdownlist", undefined, docData.swatches);
            ddColor.preferredSize.width = 112;
            ddColor.helpTip = l.TIP_LAY_COLOR;
            ZSM.UI.selectDDL(ddColor, def.color || (docData.swatches.length > 0 ? docData.swatches[0] : ""));
            ZSM.UI.setSwatch(swColor, ZSM.UI.ddlValue(ddColor), docData.swatchRGB);

            var btnRemove = grp.add("button", undefined, "\u2212");
            btnRemove.preferredSize = [24, 22];
            btnRemove.alignment = ["right", "center"];
            btnRemove.helpTip = l.TIP_BTN_REMOVE;

            btnRemove.onClick = function () {
                if (layRows.length <= 1) return;
                for (var r = 0; r < layRows.length; r++) {
                    if (layRows[r].grp === grp) {
                        layContainer.remove(grp);
                        layRows.splice(r, 1);
                        break;
                    }
                }
                btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
                updateRemoveButtons();
                w.layout.layout(true);
                w.size.height = w.preferredSize.height + 10;
            };

            return { grp: grp, ddColor: ddColor, swColor: swColor, etLayer: etLayer, ddLayer: ddLayer, btnRemove: btnRemove };
        }

        // Populate initial layer rows
        var initLayers = (sData.layers && sData.layers.length > 0)
            ? sData.layers
            : [{ name: "Cut", color: docData.detectedColor }];

        for (var i = 0; i < initLayers.length; i++) {
            layRows.push(buildLayerRow(initLayers[i]));
        }
        updateRemoveButtons();

        var btnAddLayer = pLay.add("button", undefined, l.BTN_ADD_LAYER);
        btnAddLayer.alignment = "left";
        btnAddLayer.helpTip   = l.TIP_BTN_ADD;
        if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;

        btnAddLayer.onClick = function () {
            if (layRows.length >= MAX_LAYERS) return;
            var newRow = buildLayerRow({ name: "", color: docData.detectedColor });
            layRows.push(newRow);
            if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;
            updateRemoveButtons();
            w.layout.layout(true);
            w.size.height = w.preferredSize.height + 10;
        };

        /** Grey out the mapping table when "marks only" is active (it has no
         *  effect then). The checkbox itself stays interactive (it's outside the
         *  disabled groups). Restores the normal Add-button gating when off. */
        function applyMarksOnlyState() {
            var on = cbMarksOnly.value;
            grpHeaders.enabled   = !on;
            layContainer.enabled = !on;
            btnAddLayer.enabled  = on ? false : (layRows.length < MAX_LAYERS);
        }
        cbMarksOnly.onClick = function () {
            applyMarksOnlyState();
            refreshModifiedIndicator();
            liveValidateAll();   // marks-only toggles whether layer names are required
        };
        applyMarksOnlyState();   // initial state from sData.marksOnly

        // =================================================================
        // Footer — copyright (greyed) + action buttons
        // =================================================================
        // Copyright footer per extendscript-ui-standards §5: dynamic string
        // composed from constants (never hardcoded), enabled=false greys it
        // intentionally to visually distinguish from active controls.
        // Status line (V2) — explains *why* Generate is disabled and names the
        // offending field + its valid range. Sits directly above the footer so
        // the cause and the greyed button are seen together. Updated by
        // liveValidateAll; empty (reserved space) while everything is valid.
        var grpStatus = w.add("group");
        grpStatus.alignment = ["fill", "top"];
        var stStatus = grpStatus.add("statictext", undefined, "", { truncate: "end" });
        stStatus.preferredSize.width = 340;
        stStatus.alignment = ["fill", "center"];

        var grpFooterCopy = w.add("group");
        grpFooterCopy.alignment = ["fill", "top"];
        var stCopy = grpFooterCopy.add("statictext", undefined,
            "© 2025–2026 Osva1d — " + c.scriptName + " v" + c.version);
        stCopy.enabled = false;

        // Cancel (left) | Generate (right), right-aligned. Factory defaults load
        // via the "Defaults" button in the preset panel (N8); reverting a preset's
        // unsaved edits is the ↺ button next to the preset dropdown.
        var grpButtons = w.add("group");
        grpButtons.alignment = ["right", "center"];
        grpButtons.spacing   = 8;

        var btnCan = grpButtons.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        btnCan.helpTip = l.TIP_CANCEL;
        var btnOk  = grpButtons.add("button", undefined, l.BTN_OK,     { name: "ok" });
        btnOk.helpTip  = l.TIP_OK;

        // =================================================================
        // Internal helpers
        // =================================================================

        /** Parse a numeric edittext value (comma-safe). */
        function parseNum(et) {
            return parseFloat(et.text.replace(/,/g, "."));
        }

        /**
         * Normalise a colour read from a dropdown back to the canonical
         * "[Registration]" token. selectDDL's registration alias selects the
         * document's LOCALIZED registration swatch (e.g. CS "[Registrace]"), so
         * ddlValue reads that localized name back — but presets store the
         * canonical English token. Without this, a localized Illustrator would
         * see every registration colour as "changed" (a permanent "*" on every
         * preset, including [Default]). Maps the localized reg name → canonical;
         * leaves all other swatch names untouched.
         */
        function canonColor(name) {
            if (!name) return name;
            var regName;
            try {
                regName = (ZSM.Draw && ZSM.Draw.getRegistrationName)
                    ? ZSM.Draw.getRegistrationName() : "[Registration]";
            } catch (e) { regName = "[Registration]"; }
            return (name === regName) ? "[Registration]" : name;
        }

        /**
         * Reads current UI state into a flat settings object.
         * Only reads controls that exist in the current mode;
         * missing-mode values are preserved from the previous preset.
         */
        function getUIValues() {
            var prev = pData.presets[pData.activePreset] || c.getDefaults();
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var cSel = canonColor(ZSM.UI.ddlValue(layRows[i].ddColor)) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: cSel });
            }
            var markColorSel = canonColor(ZSM.UI.ddlValue(rColor.ddl)) || "[Registration]";

            return {
                mode:              mode,
                gapInner:          isZ ? parseNum(rGapGZ.inp) : prev.gapInner,
                gapOuter:          parseNum(rGapZO.inp),
                maxDist:           parseNum(rMaxD.inp),
                feedTop:           isS ? parseNum(rFT.inp)    : prev.feedTop,
                feedBottom:        isS ? parseNum(rFB.inp)    : prev.feedBottom,
                drawRed:           isS ? chRed.value          : prev.drawRed,
                useArtboardBounds: isZ ? rbFixed.value        : false,
                markSizeZ:         isZ ? parseNum(rMarkSize.inp) : prev.markSizeZ,
                markSizeS:         isS ? parseNum(rMarkSize.inp) : prev.markSizeS,
                orientDist:        isZ ? parseNum(rOrientDist.inp) : prev.orientDist,
                markColor:         markColorSel,
                scaleN:            readScaleN(),
                marksOnly:         cbMarksOnly.value,
                layers:            layers
            };
        }

        /**
         * Fills the UI from a flat settings object.
         * Only writes to controls that exist in the current mode.
         */
        function setUIValues(obj) {
            if (!obj) return;

            // Mode selector (visual only — actual mode is fixed for this dialog;
            // reflect the dialog's own mode so the radios never desync from it).
            rbZund.value  = isZ;
            rbSumma.value = isS;

            // Shared controls
            rGapZO.inp.text = String(obj.gapOuter  !== undefined ? obj.gapOuter  : 0);
            rMaxD.inp.text  = String(obj.maxDist   !== undefined ? obj.maxDist   : 500);
            ZSM.UI.selectDDL(rColor.ddl, obj.markColor || "[Registration]");
            if (rColor.refresh) rColor.refresh();

            // ZUND-specific
            if (isZ) {
                rbFixed.value   = !!obj.useArtboardBounds;
                rbAuto.value    = !obj.useArtboardBounds;
                rGapGZ.inp.text = String(obj.gapInner  !== undefined ? obj.gapInner  : 5);
                rGapGZ.inp.enabled = !rbFixed.value;
                rMarkSize.inp.text = String(obj.markSizeZ !== undefined ? obj.markSizeZ : 5);
                rOrientDist.inp.text = String(obj.orientDist !== undefined ? obj.orientDist : 100);
            }

            // SUMMA-specific
            if (isS) {
                rFT.inp.text    = String(obj.feedTop    !== undefined ? obj.feedTop    : 70);
                rFB.inp.text    = String(obj.feedBottom !== undefined ? obj.feedBottom : 50);
                chRed.value     = !!obj.drawRed;
                rMarkSize.inp.text = String(obj.markSizeS !== undefined ? obj.markSizeS : 3);
            }

            // Scale (Phase 2) — sync checkbox + field from scaleN value.
            var newScaleN = parseInt(obj.scaleN, 10);
            if (isNaN(newScaleN) || newScaleN < 1) newScaleN = 1;
            if (newScaleN > 10) newScaleN = 10;
            if (newScaleN > 1) {
                cbScale.value   = true;
                etScale.text    = String(newScaleN);
                setScaleEnabled(true);
            } else {
                cbScale.value   = false;
                etScale.text    = "1";
                setScaleEnabled(false);
            }
            applyTitleSuffix();

            // Rebuild layer rows
            while (layContainer.children.length > 0) {
                layContainer.remove(layContainer.children[0]);
            }
            layRows = [];

            var newLayers = (obj.layers && obj.layers.length > 0)
                ? obj.layers
                : [{ name: "Cut", color: docData.detectedColor }];
            for (var i = 0; i < newLayers.length; i++) {
                layRows.push(buildLayerRow(newLayers[i]));
            }
            btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
            updateRemoveButtons();

            // Marks-only — sync checkbox and grey/enable the freshly-rebuilt
            // mapping controls to match.
            cbMarksOnly.value = (obj.marksOnly === true);
            applyMarksOnlyState();

            // Refresh the window layout so the rebuilt rows actually render.
            // The Add/Remove handlers do this inline and work; setUIValues must
            // do the SAME unconditionally. (An earlier `if (w.visible)` guard was
            // the bug: Window.visible is unreliable for "dialog" windows in
            // ExtendScript, so the relayout was skipped during Reset/preset-switch
            // — the rebuilt rows stayed un-laid-out, looking "cleared", and the
            // next Add was what finally revealed them, reading as "added two".)
            // Pre-show (initial load) this is a harmless no-op that w.show()
            // re-layouts anyway. Wrapped in try/catch defensively.
            try {
                w.layout.layout(true);
                w.size.height = w.preferredSize.height + 10;
            } catch (e) {}

            // Re-run live validation after a programmatic value change. setUIValues
            // sets .text directly, which does NOT fire the edittext onChange that
            // normally drives validation — so without this, a stale "invalid" red +
            // disabled Generate button would persist after Reset / Revert / preset
            // switch even though the freshly-loaded values are valid (the dialog
            // looked permanently broken). No-op during the initial build (guarded).
            liveValidateAll();
        }

        // =================================================================
        // Preset logic — all state transitions delegated to ZSM.UIState.
        // ScriptUI-specific code (alerts, prompts, dropdown updates) lives here;
        // pure pData mutations and validation live in ZSM.UIState (testable).
        // =================================================================
        var sortedKeys = [];

        /** True if current UI values differ from the active preset. */
        function isModified() {
            try { return ZSM.UIState.isModified(pData, getUIValues()); } catch (e) { return false; }
        }

        /** Rebuild the preset dropdown from pData (using formatPresetList for ordering + asterisk). */
        function updatePresetList() {
            ddPreset.removeAll();
            var entries = ZSM.UIState.formatPresetList(pData, getUIValues(), l);
            sortedKeys = [];
            var selIdx = 0;
            for (var i = 0; i < entries.length; i++) {
                ddPreset.add("item", entries[i].displayText);
                sortedKeys.push(entries[i].key);
                if (entries[i].isActive) selIdx = i;
            }
            if (ddPreset.items.length > 0) ddPreset.selection = selIdx;
            btnDel.enabled = (pData.activePreset !== c.PRESET_KEY_DEFAULT);
        }

        /**
         * Refresh the active dropdown item's text + Save button state.
         * Lighter than updatePresetList(); call from input onChange handlers.
         */
        function refreshModifiedIndicator() {
            var modified = isModified();
            try { btnSave.enabled   = modified; } catch (e) {}
            try { btnRevert.enabled = modified; } catch (e) {}

            if (!ddPreset.selection) return;
            var idx = ddPreset.selection.index;
            var key = sortedKeys[idx];
            if (key !== pData.activePreset) return;
            var displayText = (key === c.PRESET_KEY_DEFAULT) ? l.PRESET_DEFAULT : key;
            if (modified) displayText += " *";
            try { ddPreset.items[idx].text = displayText; } catch (e) {
                // Some ScriptUI versions don't allow direct mutation
                updatePresetList();
            }
        }

        /**
         * Persist the preset wrapper to disk with consistent error reporting.
         * Single source of truth for all save call-sites (Save / Save As /
         * Delete) so a failed write is never silently swallowed — a stale
         * on-disk state that "resurrects" a deleted preset after restart is a
         * data-integrity bug, not a cosmetic one.
         */
        function persistSettings() {
            var ok = false;
            try { ok = ZSM.Storage.save(pData); } catch (e) { ok = false; }
            if (!ok) alert(l.ERR_WRITE_SETTINGS);
        }

        ddPreset.onChange = function () {
            if (!ddPreset.selection) return;
            var key = sortedKeys[ddPreset.selection.index];
            if (!key || key === pData.activePreset) return;
            var r = ZSM.UIState.selectPreset(pData, key);
            if (!r.ok) return;
            btnDel.enabled = (key !== c.PRESET_KEY_DEFAULT);
            setUIValues(r.settings);
            // setUIValues rebuilds the dynamic layer rows with only their base
            // handlers — re-attach the modified-indicator wrappers, else editing
            // a layer row after a preset switch wouldn't flag changes / enable Save.
            wireLayerRows();
            refreshModifiedIndicator();
        };

        /**
         * Save = update current named preset (silent overwrite, no prompt).
         * On [Default] / [Last Settings] degrades to Save As (needs a name).
         * Disabled by refreshModifiedIndicator when no unsaved changes.
         */
        btnSave.onClick = function () {
            var r = ZSM.UIState.save(pData, getUIValues());
            if (r.ok) {
                updatePresetList();
                // Saved → UI now matches the preset; Save/Revert must grey out
                // (updatePresetList refreshes the asterisk but not the buttons).
                refreshModifiedIndicator();
                persistSettings();
                return;
            }
            if (r.reason === "needs-name") btnSaveAs.onClick();
        };

        /**
         * Save As = create a new preset (always prompts for name).
         * Existing-name conflicts go through confirm(); cancellation preserves state.
         */
        btnSaveAs.onClick = function () {
            var raw = prompt(l.PROMPT_SAVE_AS, "");
            if (raw === null || raw === "") return;

            // Pre-validate to give a localized alert for reserved names
            // (UIState.saveAs returns "invalid-name" but no alert).
            var clean = ZSM.UIState.validatePresetName(raw);
            if (!clean) {
                alert(l.ERR_RESERVED_NAME);
                return;
            }

            var r = ZSM.UIState.saveAs(pData, raw, getUIValues(), function (existingName) {
                return confirm(l.ERR_PRESET_EXISTS);
            });
            if (!r.ok) return;
            updatePresetList();
            refreshModifiedIndicator();
            persistSettings();
        };

        btnDel.onClick = function () {
            // Guard reserved preset before prompting (no point confirming a
            // delete that will be rejected anyway).
            if (pData.activePreset === c.PRESET_KEY_DEFAULT) {
                alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            // Destructive + persisted to disk immediately → require explicit
            // confirmation (extendscript-ui-standards §10, ui-ux-principles §5).
            if (!confirm(ZSM.L.format(l.CONFIRM_DEL_PRESET, pData.activePreset))) {
                return;
            }
            var r = ZSM.UIState.deleteActive(pData);
            if (!r.ok) {
                if (r.reason === "reserved") alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            updatePresetList();
            setUIValues(pData.presets[c.PRESET_KEY_DEFAULT]);
            // Re-attach layer-row modified-indicator wrappers after the rebuild
            // (see ddPreset.onChange) — otherwise post-delete layer edits silently
            // wouldn't flag as modified.
            wireLayerRows();
            refreshModifiedIndicator();
            persistSettings();
        };

        /**
         * Revert = reload the ACTIVE preset's saved values, discarding the
         * current unsaved UI edits. Distinct from Reset (factory defaults):
         * Revert restores exactly what the selected preset holds on disk, so the
         * user can undo experimental edits without re-picking the preset. Enabled
         * only when modified (see refreshModifiedIndicator). Does NOT persist.
         */
        btnRevert.onClick = function () {
            var preset = pData.presets[pData.activePreset];
            if (!preset) return;
            setUIValues(preset);
            wireLayerRows();
            refreshModifiedIndicator();
        };

        /**
         * Reset = load factory defaults into the dialog (N8). Keeps the current
         * mode (switching modes is a separate control) and does NOT persist or
         * alter any named preset; the change simply shows as unsaved edits ("*")
         * until the user explicitly saves.
         */
        btnReset.onClick = function () {
            var d = c.getDefaults();
            d.mode = mode;
            setUIValues(d);
            wireLayerRows();
            refreshModifiedIndicator();
            liveValidateAll();
        };

        // =================================================================
        // Mode switch handler
        // =================================================================
        var switchTarget = null;

        function requestModeSwitch(newMode) {
            if (newMode === mode) return;

            // Snapshot current UI state into [Last Settings] so nothing is lost
            pData.presets["[Last Settings]"] = getUIValues();
            // Tag the snapshot with the TARGET mode so the next dialog opens correctly
            pData.presets["[Last Settings]"].mode = newMode;

            // Preserve window position across mode switch
            docData._lastBounds = w.bounds;

            switchTarget = newMode;
            w.close(2); // code 2 = mode switch (not OK, not Cancel)
        }

        // Segmented selector (H2): each radio requests the switch; the guard in
        // requestModeSwitch makes re-clicking the active mode a no-op.
        rbZund.onClick  = function () { requestModeSwitch("ZUND"); };
        rbSumma.onClick = function () { requestModeSwitch("SUMMA"); };

        // ZUND: source radio buttons update gapGZ enabled state
        if (isZ) {
            rbAuto.onClick  = function () { rGapGZ.inp.enabled = true; };
            rbFixed.onClick = function () { rGapGZ.inp.enabled = false; };
        }

        // =================================================================
        // OK: validate → build result → close
        // =================================================================
        var result = null;

        btnOk.onClick = function () {
            // Collect raw UI values (everything as written by user, no validation yet)
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = canonColor(ZSM.UI.ddlValue(layRows[i].ddColor)) || "[Registration]";
                layers.push({ name: layRows[i].etLayer.text || "", color: colorSel });
            }

            // Every row carries a colour (defaults to [Registration]); a row with
            // a colour but a blank/whitespace name is an incomplete mapping that
            // render would silently drop. Block with a clear message so the user
            // names it or removes the row (symmetric to ERR_LAY_COLOR). Skipped
            // in marks-only mode — the mapping is ignored there.
            if (!cbMarksOnly.value) {
                for (var lc = 0; lc < layers.length; lc++) {
                    if ((layers[lc].name || "").replace(/^\s+|\s+$/g, "") === "") {
                        alert(ZSM.L.format(ZSM.L.ERR_LAY_NAME, layers[lc].color));
                        return;
                    }
                }
            }

            var markColorSel = canonColor(ZSM.UI.ddlValue(rColor.ddl)) || "[Registration]";

            var raw = {
                mode:              mode,
                gapOuter:          rGapZO.inp.text,
                maxDist:           rMaxD.inp.text,
                // gapInner is irrelevant (and its field disabled) in Fixed mode —
                // pass undefined so validation falls back to prev instead of
                // blocking Generate on a stale out-of-range value the user
                // cannot even edit.
                gapInner:          (isZ && rGapGZ.inp.enabled) ? rGapGZ.inp.text : undefined,
                markSizeZ:         isZ ? rMarkSize.inp.text  : undefined,
                orientDist:        isZ ? rOrientDist.inp.text: undefined,
                markSizeS:         isS ? rMarkSize.inp.text  : undefined,
                feedTop:           isS ? rFT.inp.text        : undefined,
                feedBottom:        isS ? rFB.inp.text        : undefined,
                drawRed:           isS ? !!chRed.value       : undefined,
                useArtboardBounds: isZ ? !!rbFixed.value     : false,
                markColor:         markColorSel,
                // scaleN: derived from checkbox + field state (1 when unchecked)
                scaleN:            readScaleN(),
                marksOnly:         cbMarksOnly.value,
                layers:            layers
            };

            // Run validation (alerts shown by validateNumber on failure).
            // Mode-irrelevant fields are pulled from prevOk (active preset).
            var prevOk = pData.presets[pData.activePreset] || c.getDefaults();
            var result_v = ZSM.Validation.validate(raw, prevOk, l);
            if (!result_v.valid) return;  // Errors already shown via alerts

            var finalSettings = result_v.settings;

            // Pass-through fields that ZSM.Validation doesn't currently handle
            // (mode-conditional booleans). Match prior behavior: keep prev value
            // when in opposite mode, otherwise read from UI.
            finalSettings.drawRed = isS ? !!chRed.value : (prevOk.drawRed === true);

            // Persist last run state — but DO NOT modify named presets.
            // Presets are immutable until explicitly saved via btnSave.
            // [Last Settings] is the runtime memory; activePreset stays
            // pointing at whatever named preset (or [Default]) was active.
            pData.presets["[Last Settings]"] = finalSettings;

            result = pData;
            w.close(1);
        };

        // =================================================================
        // Init and show
        // =================================================================

        // 1. Populate preset dropdown
        updatePresetList();

        // 2. Load initial values
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        if (initPreset) setUIValues(initPreset);

        // 3. Sync dropdown selection to activePreset
        for (var initIdx = 0; initIdx < sortedKeys.length; initIdx++) {
            if (sortedKeys[initIdx] === pData.activePreset) {
                ddPreset.selection = initIdx;
                break;
            }
        }

        // -----------------------------------------------------------------
        // Live validation — visual feedback + OK-button gating
        // -----------------------------------------------------------------
        //
        // Every numeric edittext is paired with its ZSM.Validation rule.
        // On each keystroke we check value ∈ [min, max] and:
        //   - paint the edittext text red on invalid, default colour on valid
        //   - disable the Generate button if ANY visible numeric field is
        //     invalid (so the user can't submit an unprocessable value).
        //
        // graphics.foregroundColor is wrapped in try/catch — Adobe's API
        // can throw on certain Illustrator versions and graphics objects
        // not yet "realised". Failure to colour is non-fatal: the
        // OK-disable still works and protects from bad input.
        //
        // Mode-specific fields (rGapGZ etc.) are conditionally added so
        // the numericRows array only contains rows that exist for the
        // current mode.
        var numericRows = [];
        if (isZ) {
            numericRows.push({ row: rGapGZ,      rule: ZSM.Validation.rules.gapInner   });
            numericRows.push({ row: rOrientDist, rule: ZSM.Validation.rules.orientDist });
            numericRows.push({ row: rMarkSize,   rule: ZSM.Validation.rules.markSizeZ  });
        } else {
            numericRows.push({ row: rMarkSize, rule: ZSM.Validation.rules.markSizeS });
            numericRows.push({ row: rFT,       rule: ZSM.Validation.rules.feedTop   });
            numericRows.push({ row: rFB,       rule: ZSM.Validation.rules.feedBottom });
        }
        numericRows.push({ row: rGapZO, rule: ZSM.Validation.rules.gapOuter });
        numericRows.push({ row: rMaxD,  rule: ZSM.Validation.rules.maxDist  });
        // Scale field (1:N) — without this an out-of-range N (e.g. 50) would be
        // silently clamped to 10 by readScaleN with no visual signal. Wrapped in
        // {inp:} to match the row shape; skipped automatically when the checkbox
        // is off (the field is disabled then).
        numericRows.push({ row: { inp: etScale }, rule: ZSM.Validation.rules.scaleN });

        function isValueInRange(et, rule) {
            var raw = String(et.text || "").replace(/,/g, ".");
            var n   = parseFloat(raw);
            if (isNaN(n)) return false;
            return (n >= rule.min && n <= rule.max);
        }

        function markFieldValidity(et, valid) {
            // Try to repaint the edittext. Wrapped because Adobe's graphics
            // API can throw "no graphics yet" until the window is realised
            // and on some legacy versions doesn't support newPen at all.
            try {
                var g = et.graphics;
                if (!g || !g.newPen) return;
                // Capture the field's DEFAULT foreground pen once (after graphics
                // is realised). "Valid" must restore that theme default — forcing
                // black [0,0,0] is wrong on Illustrator's dark UI (text vanishes)
                // and visually fails to clear the red. Light-grey is a safe
                // fallback if the default pen can't be read.
                if (et._zsmDefPen === undefined) {
                    et._zsmDefPen = g.foregroundColor || null;
                }
                if (valid) {
                    g.foregroundColor = et._zsmDefPen
                        ? et._zsmDefPen
                        : g.newPen(g.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                } else {
                    g.foregroundColor = g.newPen(g.PenType.SOLID_COLOR, [0.90, 0.20, 0.20, 1.0], 1);
                }
            } catch (e) { /* graphics not ready or unsupported — ignored */ }
        }

        function liveValidateAll() {
            // numericRows is assigned below this function in source order; the
            // initial setUIValues() call (during dialog build) runs before that,
            // so guard against the not-yet-wired state — it re-runs after init.
            if (!numericRows) return true;
            var allValid = true;
            var invalidCount = 0;
            var firstMsg = "";
            for (var i = 0; i < numericRows.length; i++) {
                var nr = numericRows[i];
                if (!nr.row || !nr.row.inp) continue;
                // Skip disabled rows (e.g. gapInner is disabled in Fixed mode)
                if (!nr.row.inp.enabled) {
                    markFieldValidity(nr.row.inp, true);
                    continue;
                }
                var ok = isValueInRange(nr.row.inp, nr.rule);
                markFieldValidity(nr.row.inp, ok);
                if (!ok) {
                    allValid = false;
                    invalidCount++;
                    if (!firstMsg) {
                        // scaleN's rule label is the bare "1:" ratio prefix — swap
                        // it for the checkbox caption so the message reads sensibly.
                        var lblKey = nr.rule && nr.rule.label;
                        if (lblKey === "SCALE_FIELD_LABEL") lblKey = "SCALE_CHECKBOX";
                        var lbl = (lblKey && l[lblKey]) ? l[lblKey] : "";
                        lbl = String(lbl).replace(/:\s*$/, "");
                        firstMsg = ZSM.L.format(l.STATUS_RANGE, lbl, nr.rule.min, nr.rule.max);
                    }
                }
            }

            // Layer-name live validation (V4): a mapping row with a colour but a
            // blank name is incomplete and render would silently drop it. Flag it
            // live (red) and gate Generate, mirroring the numeric fields — instead
            // of only catching it via a modal alert on Generate. Skipped in
            // marks-only mode, where the mapping table is ignored entirely.
            var marksOnlyOn = false;
            try { marksOnlyOn = cbMarksOnly.value; } catch (em) {}
            for (var li = 0; li < layRows.length; li++) {
                var etL = layRows[li].etLayer;
                if (!etL) continue;
                if (marksOnlyOn) { markFieldValidity(etL, true); continue; }
                var nameOk = String(etL.text || "").replace(/^\s+|\s+$/g, "") !== "";
                markFieldValidity(etL, nameOk);
                if (!nameOk) {
                    allValid = false;
                    invalidCount++;
                    if (!firstMsg) firstMsg = l.STATUS_LAYER_NAME;
                }
            }

            try { btnOk.enabled = allValid; } catch (e) {}

            // Status line. When everything is valid it no longer sits empty (N1) —
            // it shows a subtle, default-coloured context summary (mode · scale ·
            // layer count) so the reserved row carries meaning. When invalid it
            // turns amber; with more than one bad field it aggregates the count
            // (N3) instead of naming only the first. Graphics access is wrapped —
            // Adobe's API can throw before the control is realised.
            try {
                var msg, amber;
                if (allValid) {
                    amber = false;
                    var ctx = mode;
                    var sN  = readScaleN();
                    if (sN > 1) ctx += " · 1:" + sN;
                    var marksOnlyCtx = false;
                    try { marksOnlyCtx = cbMarksOnly.value; } catch (emc) {}
                    msg = marksOnlyCtx
                        ? ZSM.L.format(l.STATUS_OK_MARKS, ctx)
                        : ZSM.L.format(l.STATUS_OK, ctx, layRows.length);
                } else {
                    amber = true;
                    msg = (invalidCount > 1)
                        ? ("\u26A0 " + ZSM.L.format(l.STATUS_RANGE_MULTI, invalidCount))
                        : ("\u26A0 " + (firstMsg || l.STATUS_INVALID));
                }
                stStatus.text = msg;
                var sg = stStatus.graphics;
                if (sg && sg.newPen) {
                    // Capture the realised default pen once. It is often null on
                    // first read, so the valid branch must NOT gate on it — it has
                    // to set an explicit pen every time, otherwise the amber pen
                    // from a previous error state is never overwritten and the
                    // status text stays orange after the error clears (matches the
                    // per-field fallback at the geometry rows).
                    if (stStatus._zsmDefPen === undefined) stStatus._zsmDefPen = sg.foregroundColor || null;
                    if (!amber) {
                        sg.foregroundColor = stStatus._zsmDefPen
                            ? stStatus._zsmDefPen
                            : sg.newPen(sg.PenType.SOLID_COLOR, [0.75, 0.75, 0.75, 1.0], 1);
                    } else {
                        sg.foregroundColor = sg.newPen(sg.PenType.SOLID_COLOR, [0.96, 0.60, 0.38, 1.0], 1);
                    }
                }
            } catch (e) {}

            return allValid;
        }

        // 4. Wire input change handlers — refresh modified indicator (asterisk)
        //    in dropdown whenever any field changes. Layer rows are dynamic;
        //    they're wired in buildLayerRow() and the Add/Remove handlers below.
        var wireInputs = function () {
            var addOnChange = function (et) {
                if (!et) return;
                et.onChange  = function () { refreshModifiedIndicator(); liveValidateAll(); };
                et.onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
            };
            addOnChange(rGapZO.inp);
            addOnChange(rMaxD.inp);
            if (isZ) {
                addOnChange(rGapGZ.inp);
                addOnChange(rMarkSize.inp);
                addOnChange(rOrientDist.inp);
                // Source toggle changes rGapGZ.enabled → re-run validation so
                // a previously-invalid disabled gapInner stops blocking OK.
                if (rbAuto)  rbAuto.onClick  = (function (orig) { return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); }; })(rbAuto.onClick);
                if (rbFixed) rbFixed.onClick = (function (orig) { return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); }; })(rbFixed.onClick);
            }
            if (isS) {
                addOnChange(rFT.inp);
                addOnChange(rFB.inp);
                if (chRed) chRed.onClick = refreshModifiedIndicator;
                addOnChange(rMarkSize.inp);
            }
            if (rColor && rColor.ddl) {
                rColor.ddl.onChange = (function (orig) {
                    return function () { if (orig) orig(); if (rColor.refresh) rColor.refresh(); refreshModifiedIndicator(); };
                })(rColor.ddl.onChange);
            }
            // Layer rows: hook into existing handlers via wrapper.
            // Add/Remove buttons modify layRows length → also need refresh.
            var origAdd = btnAddLayer.onClick;
            btnAddLayer.onClick = function () {
                if (origAdd) origAdd();
                wireLayerRows();
                refreshModifiedIndicator();
                liveValidateAll();   // recompute footer count after a row is added
            };
        };

        var wireLayerRows = function () {
            for (var ri = 0; ri < layRows.length; ri++) {
                var row = layRows[ri];
                // Wire each row exactly once. wireLayerRows() runs after every
                // Add and after each setUIValues rebuild; without this guard the
                // already-wired rows get their onChange/onClick re-wrapped on
                // every Add, nesting handlers unboundedly. Fresh rows (from
                // buildLayerRow) have no _zsmWired flag, so they get wired;
                // existing ones are skipped.
                if (row._zsmWired) continue;
                row._zsmWired = true;
                row.etLayer.onChange   = function () { refreshModifiedIndicator(); liveValidateAll(); };
                row.etLayer.onChanging = function () { refreshModifiedIndicator(); liveValidateAll(); };
                // ddLayer's onChange already updates etLayer; chain refresh after
                var origDD = row.ddLayer.onChange;
                row.ddLayer.onChange = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); };
                })(origDD);
                row.ddColor.onChange = (function (rw) {
                    return function () {
                        ZSM.UI.setSwatch(rw.swColor, ZSM.UI.ddlValue(rw.ddColor), docData.swatchRGB);
                        refreshModifiedIndicator();
                    };
                })(row);
                var origRm = row.btnRemove.onClick;
                row.btnRemove.onClick = (function (orig) {
                    return function () { if (orig) orig(); refreshModifiedIndicator(); liveValidateAll(); };
                })(origRm);
            }
        };

        wireInputs();
        wireLayerRows();

        // Initialize Save button state (disabled when UI matches active preset)
        refreshModifiedIndicator();

        // Initialize live validation state — paints any out-of-range stored
        // values red on first paint and disables OK if needed. Runs after
        // wireInputs so onChanging handlers are already attached.
        liveValidateAll();

        // Restore window position from previous mode-switch (if any)
        if (docData._lastBounds) {
            w.layout.layout(true);
            w.location = [docData._lastBounds.x, docData._lastBounds.y];
        }

        // Initial keyboard focus on the first editable geometry field so Tab
        // walks the dialog in creation order (N9: explicit, predictable focus
        // start instead of relying on the platform default).
        try { (isZ ? rGapGZ : rGapZO).inp.active = true; } catch (e) {}

        w.show();

        // Interpret close code
        if (switchTarget) return { _switchTo: switchTarget };
        return result;
    },

    // =====================================================================
    // Shared UI helpers
    // =====================================================================

    /**
     * Adds a labeled edittext row with a "mm" suffix.
     * @param {Object} parent - ScriptUI container.
     * @param {string} label  - Row label.
     * @param {number} value  - Initial value.
     * @param {string} tip    - HelpTip string.
     * @returns {Object} {inp: EditText, group: Group}
     */
    addRow: function (parent, label, value, tip) {
        var g  = parent.add("group");
        g.alignment = "fill";
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 178;
        if (tip) st.helpTip = tip;
        // Value sub-group with a FIXED width so its right edge lines up with the
        // colour dropdown below it (N5 — consistent right edges in the geometry
        // panel). Holds the input, the "mm" unit and the greyed range hint.
        var vg = g.add("group");
        vg.orientation   = "row";
        vg.alignChildren = ["left", "center"];
        vg.spacing       = 6;
        vg.preferredSize.width = 130;
        var et = vg.add("edittext", undefined, String(value));
        et.preferredSize.width = 56;
        if (tip) et.helpTip = tip;
        vg.add("statictext", undefined, "mm");
        return { inp: et, group: g };
    },

    /**
     * Converts an Illustrator colour object to an [r,g,b] triple (0–255).
     * Best-effort across CMYK / RGB / Gray / Spot. Returns null if unreadable.
     * Powers the colour-swatch previews next to the colour dropdowns (M1).
     * @param {Object} col - Illustrator Color object.
     * @returns {Array|null} [r,g,b] 0–255, or null.
     */
    colorToRGB: function (col) {
        try {
            if (!col) return null;
            var t = col.typename;
            if (t === "RGBColor")  return [col.red, col.green, col.blue];
            if (t === "GrayColor") { var v = Math.round(255 * (1 - col.gray / 100)); return [v, v, v]; }
            if (t === "CMYKColor") {
                var c = col.cyan / 100, m = col.magenta / 100, y = col.yellow / 100, k = col.black / 100;
                return [
                    Math.round(255 * (1 - c) * (1 - k)),
                    Math.round(255 * (1 - m) * (1 - k)),
                    Math.round(255 * (1 - y) * (1 - k))
                ];
            }
            if (t === "SpotColor") return ZSM.UI.colorToRGB(col.spot.color);
        } catch (e) {}
        return null;
    },

    /**
     * Creates a 16×16 colour-swatch preview control (M1). Uses an iconbutton
     * with a custom onDraw so no temp image files are needed. The painted value
     * lives in `._rgb`:
     *   • [r,g,b] (0–255) → solid fill
     *   • "REG"           → white tile + black crosshair (the [Registration] colour)
     *   • null / other    → grey tile + red slash (missing / unresolved)
     * All drawing is wrapped — a graphics failure must never break the dialog.
     * @param {Object} parent - ScriptUI container.
     * @returns {Object} the swatch control.
     */
    makeSwatch: function (parent) {
        var sw;
        try {
            sw = parent.add("iconbutton", undefined, undefined, { style: "toolbutton", toggle: false });
        } catch (e) {
            sw = parent.add("iconbutton", undefined, undefined);
        }
        sw.preferredSize = [16, 16];
        sw.minimumSize   = [16, 16];
        sw.maximumSize   = [16, 16];
        sw._rgb = null;
        sw.onDraw = function () {
            try {
                var g = this.graphics;
                var w = this.size[0], h = this.size[1];
                var border = g.newPen(g.PenType.SOLID_COLOR, [0.45, 0.45, 0.45, 1], 1);
                var val = this._rgb;
                if (val === "REG") {
                    var wb = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(wb);
                    var cp = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0, 1], 1);
                    g.newPath(); g.moveTo(w / 2, 2); g.lineTo(w / 2, h - 2); g.strokePath(cp);
                    g.newPath(); g.moveTo(2, h / 2); g.lineTo(w - 2, h / 2); g.strokePath(cp);
                } else if (val && val.length === 3) {
                    var b = g.newBrush(g.BrushType.SOLID_COLOR, [val[0] / 255, val[1] / 255, val[2] / 255, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(b);
                } else {
                    var gb = g.newBrush(g.BrushType.SOLID_COLOR, [0.82, 0.82, 0.82, 1]);
                    g.newPath(); g.rectPath(0, 0, w, h); g.fillPath(gb);
                    var rp = g.newPen(g.PenType.SOLID_COLOR, [0.7, 0.25, 0.2, 1], 1);
                    g.newPath(); g.moveTo(2, h - 2); g.lineTo(w - 2, 2); g.strokePath(rp);
                }
                g.newPath(); g.rectPath(0, 0, w - 1, h - 1); g.strokePath(border);
            } catch (e) {}
        };
        return sw;
    },

    /**
     * Repaints a swatch (from makeSwatch) to show colour `name`, resolved through
     * `rgbMap` (name → [r,g,b] | "REG"). Toggling visibility forces onDraw to
     * re-run — ScriptUI has no direct "invalidate" call.
     * @param {Object} sw     - Swatch control.
     * @param {string} name   - Colour name to display.
     * @param {Object} rgbMap - name → colour map.
     */
    setSwatch: function (sw, name, rgbMap) {
        if (!sw) return;
        var val = null;
        if (name && rgbMap && rgbMap[name] !== undefined) val = rgbMap[name];
        sw._rgb = val;
        try { sw.hide(); sw.show(); } catch (e) {}
    },

    /**
     * Adds a labeled color row using a dropdownlist of document swatches.
     * @param {Object} parent      - ScriptUI container.
     * @param {string} label       - Row label.
     * @param {string} value       - Initial swatch name.
     * @param {Array}  swatchNames - List from ZSM.Draw.getSwatchNames().
     * @param {string} tip         - HelpTip string.
     * @param {Object} rgbMap      - Optional name→RGB map; when present a colour
     *                               swatch preview is drawn before the dropdown (M1).
     * @returns {Object} {ddl, group, sw, refresh}
     */
    addColorRow: function (parent, label, value, swatchNames, tip, rgbMap) {
        var g  = parent.add("group");
        g.alignment = "fill";
        // Match the layer-table row rhythm (grp.spacing = 5) so the swatch hugs
        // its dropdown identically in both places — one consistent colour-picker.
        g.spacing = 5;
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 178;
        if (tip) st.helpTip = tip;
        var sw = rgbMap ? this.makeSwatch(g) : null;
        var ddl = g.add("dropdownlist", undefined, swatchNames);
        ddl.preferredSize.width = sw ? 112 : 130;   // swatch+gap+ddl keeps the right edge aligned
        if (tip) ddl.helpTip = tip;
        this.selectDDL(ddl, value || "[Registration]");
        var self = this;
        var refresh = function () { if (sw) self.setSwatch(sw, self.ddlValue(ddl), rgbMap); };
        refresh();
        return { ddl: ddl, group: g, sw: sw, refresh: refresh };
    },

    /**
     * Selects a dropdownlist item by text value.
     *
     * When the requested value is NOT present in the current document (e.g. a
     * preset references swatch "MyOrange" but this document has no such spot),
     * we do NOT silently fall back to item 0 — that would swap the user's saved
     * choice for an unrelated swatch/layer with no signal. Instead we insert a
     * synthetic item that preserves the saved name with a "(missing)" marker and
     * select it. The marker is display-only; ZSM.UI.ddlValue() reads back the
     * raw name, so downstream resolution and isModified() both see the original
     * value — no false "modified" asterisk, no silent colour swap. A missing
     * mark colour degrades to [Registration] with a warning (see ZSM.Draw.getCol);
     * a missing layer is auto-created by getLay (layers are low-risk containers).
     *
     * @param {DropDownList} ddl  - Target control.
     * @param {string}       text - Item text to select.
     */
    selectDDL: function (ddl, text) {
        // Purge any stale synthetic "missing" item from a previous selection so
        // they don't accumulate across preset switches on a persistent dropdown.
        for (var k = ddl.items.length - 1; k >= 0; k--) {
            if (ddl.items[k]._zsmMissing) ddl.remove(k);
        }
        if (!text) { if (ddl.items.length > 0) ddl.selection = 0; return; }
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === text) { ddl.selection = i; return; }
        }
        // [Registration] alias — the canonical English token and the document's
        // localized registration swatch name (e.g. CS "[Registrace]") are the
        // SAME colour. getSwatchNames lists the localized name, but presets/
        // defaults store canonical "[Registration]"; match them interchangeably
        // so the default doesn't render as a bogus "(missing)" item in a
        // non-English Illustrator. (ZSM.Draw guard keeps selectDDL unit-testable.)
        var regName = (typeof ZSM !== "undefined" && ZSM.Draw && ZSM.Draw.getRegistrationName)
            ? ZSM.Draw.getRegistrationName() : "[Registration]";
        if (text === "[Registration]" || text === regName) {
            for (var r = 0; r < ddl.items.length; r++) {
                var rt = ddl.items[r].text;
                if (rt === "[Registration]" || rt === regName) { ddl.selection = r; return; }
            }
        }
        // Not in the document — preserve the saved name as a flagged item.
        var suffix = (ZSM.L && ZSM.L.DDL_MISSING_SUFFIX) ? ZSM.L.DDL_MISSING_SUFFIX : "(missing)";
        var missing = ddl.add("item", text + "  " + suffix);
        missing._zsmRawValue = text;
        missing._zsmMissing  = true;
        ddl.selection = missing;
    },

    /**
     * Reads the resolved value of a dropdown selection. For a synthetic
     * "missing" item (added by selectDDL when a saved value wasn't in the
     * document), returns the raw saved name without the display marker;
     * otherwise returns the selection text. Empty string when nothing selected.
     *
     * @param {DropDownList} ddl - Target control.
     * @returns {string} Resolved value.
     */
    ddlValue: function (ddl) {
        var sel = ddl.selection;
        if (!sel) return "";
        return (sel._zsmRawValue != null) ? sel._zsmRawValue : sel.text;
    }
};

(function (ZSM) {
    var draw = ZSM.Draw;
    try {
        if (app.documents.length === 0) {
            alert(ZSM.L.ERR_NO_DOC);
            return;
        }

        // Pin coordinate system to Y-up Cartesian (origin bottom-left, Y grows
        // upward) — the convention assumed throughout core.js (see addSteps
        // comment) and bounds.js (Math.max for top, Math.min for bottom).
        // CC's API default is already Y-up, but a per-document
        // "Y origin from Artboard top-left" preference (Edit > Preferences >
        // Units, since Illustrator 2017+) or a previous script in the session
        // can flip it. Setting it explicitly makes the script bulletproof.
        // Wrapped in try/catch because CS6 throws on this assignment
        // (CoordinateSystem enum doesn't exist) — CS6 is always Y-up by
        // definition, so the swallow is safe.
        try {
            app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        } catch (csErr) {
            ZSM.Utils.log("coordinateSystem pin skipped: " + csErr.message);
        }

        // Load saved settings (returns full preset wrapper or null)
        var pData = ZSM.Storage.load();
        if (!pData) {
            // First run: build minimal wrapper from defaults
            pData = { activePreset: ZSM.Config.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[ZSM.Config.PRESET_KEY_DEFAULT] = ZSM.Config.getDefaults();
        }

        // Show dialog — returns updated wrapper or null on cancel
        var resultWrapper = ZSM.UI.show(pData);
        if (!resultWrapper) return;

        // Persist settings before rendering (so a crash doesn't lose the config).
        // Alert on failure but continue with the render — the user already
        // submitted the dialog, blocking the render because we cannot persist
        // would surprise them. The next run can re-save. Storage.save never
        // throws; it returns false on any open/write/close failure.
        if (!ZSM.Storage.save(resultWrapper)) {
            alert(ZSM.L.ERR_WRITE_SETTINGS);
        }

        // Extract runtime settings. Source: `[Last Settings]` always reflects
        // what the user just submitted via Generate (btnOk.onClick stores
        // current UI values there). The active named preset is intentionally
        // NOT used here — Tier 2 made named presets immutable except via
        // explicit Save, so they may be stale relative to current UI.
        // Fallback to activePreset only if [Last Settings] is somehow missing
        // (shouldn't happen on a normal Generate run, but defensive).
        var res = resultWrapper.presets["[Last Settings]"]
               || resultWrapper.presets[resultWrapper.activePreset];

        // Unlock layers, set ruler origin. The [0,0] origin is intentional and
        // NOT restored afterwards — all geometry math assumes it, and a restored
        // custom origin would visually desync the rulers from the marks just
        // placed. Document-state side effect, accepted by design.
        draw.beginSession();
        app.activeDocument.rulerOrigin = [0, 0];

        var bounds = draw.getBounds(res);
        if (!bounds) {
            alert(ZSM.L.ERR_NO_SEL);
            return;
        }

        var geo = ZSM.Core.calculateAll(res, bounds);
        draw.render(geo, res);

    } catch (e) {
        // e.line is undefined for non-Error throws — append only when present.
        alert(ZSM.L.ERR_CRITICAL + e.message + (e.line ? " (line " + e.line + ")" : ""));
    } finally {
        // Always restore layer locks, even if render throws
        if (app.documents.length > 0) draw.endSession();
    }
})(ZSM);
