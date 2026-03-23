/*
 * ===========================================================================
 * Script:      Illustrator Zund & Summa Marks
 * Version:     26.3.1
 * Author:      Osva1d
 * Updated:     2026-03-23
 *
 * Copyright (c) 2025-2026 Osva1d. All rights reserved.
 * Licensed under a proprietary license. See LICENSE file for details.
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
            ERR_MUST_BE_NUMBER:  "%s must be a number!",
            ERR_OUT_OF_RANGE:    "%s must be between %s and %s!",
            ERR_NO_DOC:          "No document open.",
            ERR_NO_SEL:          "Nothing is selected.",
            ERR_CRITICAL:        "CRITICAL ERROR: ",
            ERR_RENDER_CRITICAL: "Critical error during rendering: ",
            ERR_WRITE_SETTINGS:  "Cannot write settings file.",
            ERR_COLOR_MISSING:   "Associated color not found: %s",
            ERR_LAY_COLOR:       "Color missing for layer '%s'. Please select a color from the dropdown.",
            ERR_SWATCH:          "Swatch '%s' not found.",
            ERR_GENERIC:         "ERROR: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Presets",
            PANEL_TECH:   "Technology Selection",
            PANEL_GEO:    "Gap Settings",
            PANEL_FEED:   "Feed Settings",
            PANEL_LAYERS: "Layer to Color Mapping",

            // --- UI: Technology ---
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Target cutting technology selection (Zünd / Summa).",
            SRC_AUTO:      "Auto-fit to selection",
            SRC_FIXED:     "Fixed to Artboard",
            TIP_SRC_AUTO:  "Mark position adapts to selected graphics, Artboard automatically resized.",
            TIP_SRC_FIXED: "Mark position based on current Artboard; size remains unchanged.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Preset:",
            BTN_SAVE:           "Save",
            TIP_SAVE:           "Save current settings as new preset.",
            BTN_DEL:            "Delete",
            TIP_DEL:            "Delete currently selected preset.",
            PROMPT_NEW_PRESET:  "Enter name for new preset:",
            PRESET_DEFAULT:     "[Default]",
            ERR_PRESET_DEL_DEF: "You cannot delete the default preset.",
            ERR_PRESET_EXISTS:  "Preset already exists. Overwrite?",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Gap from graphics:",
            TIP_GAP_GZ: "Distance of marks from the clean format boundaries (graphics).",
            GAP_ZO:    "Gap from edge:",
            TIP_GAP_ZO: "Distance of the outer edge of marks from the Artboard edge.",
            MAX_DIST:  "Mark spacing:",
            TIP_MAX_DIST: "Maximum allowed spacing between marks. Intermediate points will be inserted if exceeded.",
            MARK_SIZE_Z:  "Zünd Size:",
            TIP_SIZE_Z:   "Physical size of Zünd mark (diameter).",
            MARK_SIZE_S:  "Summa Size:",
            TIP_SIZE_S:   "Physical size of Summa mark (side).",
            MARK_COLOR:   "Mark Color (Spot):",
            TIP_MARK_COLOR: "Spot color name for marks. Use '[Registration]' for standard.",

            // --- UI: Feed ---
            FEED_TOP:  "Top Feed:",
            TIP_FEED_TOP: "Top material excess for safe gripping in the feeder.",
            FEED_BOT:  "Bottom Feed:",
            TIP_FEED_BOT: "Bottom material excess for initial machine feed.",
            DRAW_RED:  "Add trim lines",
            TIP_DRAW_RED: "Draws red trim lines indicating physical boundaries including feed.",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Color",
            COL_LAYER:      "Layer",
            TIP_LAY_COLOR:  "Spot color assigned to this layer for path matching.",
            TIP_LAY_NAME:   "Layer name (primary identifier). Select from list or type a custom name.",
            TIP_BTN_REMOVE: "Remove this mapping row.",
            TIP_BTN_ADD:    "Add another layer mapping row.",
            BTN_ADD_LAYER:  "+ Add",
            ERR_MIN_ROW:    "At least one mapping row is required.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Cancel",
            TIP_CANCEL: "Cancel script without changes.",
            BTN_OK:     "Generate",
            TIP_OK:     "Run calculation and generate marks.",
            PRESET_PLACEHOLDER: "My Preset"
        },

        cs: {
            // --- Errors ---
            ERROR_PREFIX:        "CHYBA: ",
            ERR_MUST_BE_NUMBER:  "%s musí být číslo!",
            ERR_OUT_OF_RANGE:    "%s musí být mezi %s a %s!",
            ERR_NO_DOC:          "Není otevřený dokument.",
            ERR_NO_SEL:          "Nic není vybráno.",
            ERR_CRITICAL:        "KRITICKÁ CHYBA: ",
            ERR_RENDER_CRITICAL: "Kritická chyba při vykreslování: ",
            ERR_WRITE_SETTINGS:  "Nelze zapsat soubor s nastavením.",
            ERR_COLOR_MISSING:   "Nenalezena barva pro výřez (%s).",
            ERR_LAY_COLOR:       "Chybí barva pro vrstvu ‘%s’. Zadejte platný název nebo vyberte z nabídky.",
            ERR_SWATCH:          "Barva ‘%s’ nebyla v dokumentu nalezena.",
            ERR_GENERIC:         "CHYBA: %s",

            // --- UI: Panels ---
            PANEL_PRESET: "Předvolby",
            PANEL_TECH:   "Výběr technologie",
            PANEL_GEO:    "Nastavení mezer",
            PANEL_FEED:   "Nastavení role (Feed)",
            PANEL_LAYERS: "Přiřazení vrstev k barvám",

            // --- UI: Technology ---
            MODE_ZUND:     "ZUND",
            MODE_SUMMA:    "SUMMA",
            TIP_MODE:      "Výběr cílové technologie řezu (Zünd / Summa).",
            SRC_AUTO:      "Dle výběru (Auto-fit)",
            SRC_FIXED:     "Dle Artboardu (Fixed)",
            TIP_SRC_AUTO:  "Pozice značek se určí podle vybrané grafiky a Artboard se automaticky přizpůsobí.",
            TIP_SRC_FIXED: "Pozice značek se určí podle stávajícího Artboardu; jeho velikost se nemění.",

            // --- UI: Presets ---
            PRESET_LABEL:       "Předvolba:",
            BTN_SAVE:           "Uložit",
            TIP_SAVE:           "Uložit aktuální nastavení jako novou předvolbu.",
            BTN_DEL:            "Smazat",
            TIP_DEL:            "Smazat aktuálně vybranou předvolbu.",
            PROMPT_NEW_PRESET:  "Zadejte název nové předvolby:",
            PRESET_DEFAULT:     "[Výchozí]",
            ERR_PRESET_DEL_DEF: "Výchozí předvolbu nelze smazat.",
            ERR_PRESET_EXISTS:  "Předvolba již existuje. Přepsat?",

            // --- UI: Gap Settings ---
            GAP_GZ:    "Mezera od grafiky:",
            TIP_GAP_GZ: "Vzdálenost značek od hranic čistého formátu (grafiky).",
            GAP_ZO:    "Mezera od okraje:",
            TIP_GAP_ZO: "Vzdálenost vnějšího okraje značek od hrany Artboardu.",
            MAX_DIST:  "Roztek značek:",
            TIP_MAX_DIST: "Maximální povolená rozteč mezi značkami. Při překročení budou vloženy mezilehlé body.",
            MARK_SIZE_Z:  "Velikost Zünd:",
            TIP_SIZE_Z:   "Fyzická velikost značky Zünd (průměr).",
            MARK_SIZE_S:  "Velikost Summa:",
            TIP_SIZE_S:   "Fyzická velikost značky Summa (strana).",
            MARK_COLOR:   "Barva značek (Spot):",
            TIP_MARK_COLOR: "Název přímé barvy pro značky. Použijte ‘[Registration]’ pro standard.",

            // --- UI: Feed ---
            FEED_TOP:  "Horní výjezd (Top):",
            TIP_FEED_TOP: "Horní přesah materiálu pro bezpečné uchopení v podavači (Feed).",
            FEED_BOT:  "Spodní nájezd (Bottom):",
            TIP_FEED_BOT: "Spodní nájezd materiálu pro počáteční nájezd stroje (Feed).",
            DRAW_RED:  "Přidat ořezové linky",
            TIP_DRAW_RED: "Vykreslí červené ořezové linky označující fyzické hranice archu včetně přesahů (feedu).",

            // --- UI: Layer mapping ---
            COL_COLOR:      "Barva",
            COL_LAYER:      "Vrstva",
            TIP_LAY_COLOR:  "Přímá barva přiřazená k této vrstvě pro rozpoznání cest.",
            TIP_LAY_NAME:   "Název vrstvy (primární identifikátor). Vyberte ze seznamu nebo napište vlastní název.",
            TIP_BTN_REMOVE: "Odebrat toto mapování.",
            TIP_BTN_ADD:    "Přidat další mapování vrstvy.",
            BTN_ADD_LAYER:  "+ Přidat",
            ERR_MIN_ROW:    "Musí existovat alespoň jedno mapování.",
            DEF_CUT:        "Cut",
            DEF_KISS:       "Kiss-cut",

            // --- UI: Footer ---
            BTN_CANCEL: "Zrušit",
            TIP_CANCEL: "Zruší skript bez provedení změn.",
            BTN_OK:     "Generovat",
            TIP_OK:     "Spustí výpočet a vygeneruje značky do dokumentu.",
            PRESET_PLACEHOLDER: "Moje předvolba"
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
        var str = String(val).replace(/,/g, ".");
        var n = Number(str);
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
    }
};

var ZSM = ZSM || {};

ZSM.Config = {
    scriptName: "Zund & Summa Marks",
    zundSize:    5,   // mm, default Zünd mark diameter
    summaSize:   3,   // mm, default Summa mark side
    orientDist:  100, // mm, orientation mark offset from corner

    summaXCenter: 10,  // mm: distance from graphic edge to Summa mark center (X)
    summaYVisual: 10,  // mm: gap from graphic edge to Summa mark outer edge (Y)
    redLineWidth: 1,   // pt: stroke width for trim lines
    rulerBuffer:  0.1,
    debug: false,

    // System layer names — not localized (must match document layer names exactly)
    layerRegmarks: "Regmarks",
    layerGraphics: "Graphics",
    PRESET_KEY_DEFAULT: "[Default]",

    ui: {
        title: "Zünd & Summa Marks v26.3.1"
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
            markColor:        "[Registration]",
            layers: [
                { name: "Cut", color: "[Registration]" }
            ]
        };
    },

    Storage: {
        /**
         * Returns the settings File object, creating the folder if needed.
         * @returns {File} JSON settings file.
         */
        getFile: function () {
            var folder = new Folder(Folder.userData + "/ZSM");
            if (!folder.exists) folder.create();
            return new File(folder.fsName + "/settings_v26_3.json");
        },

        /**
         * Serializes and saves the full preset wrapper to disk.
         * @param {Object} data - Full preset wrapper {presets, activePreset}.
         */
        save: function (data) {
            try {
                var f = this.getFile();
                f.encoding = "UTF-8";
                if (!f.open("w")) {
                    ZSM.Utils.error(ZSM.L.ERR_WRITE_SETTINGS);
                    return;
                }
                f.write(JSON.stringify(data));
                f.close();
            } catch (e) {
                ZSM.Utils.log("Storage.save failed: " + e.message);
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
            if (!f.exists) return null;
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
                // (e.g. "[Výchozí]" in Czech). Rename to the fixed key "[Default]".
                if (data.presets) {
                    var knownLocalized = ["[Výchozí]"];
                    for (var ld = 0; ld < knownLocalized.length; ld++) {
                        var localKey = knownLocalized[ld];
                        if (data.presets[localKey] && !data.presets[ZSM.Config.PRESET_KEY_DEFAULT]) {
                            data.presets[ZSM.Config.PRESET_KEY_DEFAULT] = data.presets[localKey];
                            delete data.presets[localKey];
                            if (data.activePreset === localKey) {
                                data.activePreset = ZSM.Config.PRESET_KEY_DEFAULT;
                            }
                        }
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
        var sf  = ZSM.Utils.getSF(); // 1 for standard, 10 for Large Canvas

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

        // We want to snap artboard edges to whole millimetres, but not
        // blindly centre the box: vertical offsets differ when feedTop/
        // feedBottom aren’t equal.  Compute left/right margin based on
        // symmetric horizontal requirements, but handle top/bottom
        // independently.
        //
        // For fixed bounds we just keep the supplied rectangle.
        var abRect;
        if (s.useArtboardBounds) {
            abRect = b; // Fixed mode: leave artboard untouched
        } else {
            // snap top/bottom individually
            var abTop_mm = ZSM.Utils.pt2mm(abTop) * sf;
            var abBot_mm = ZSM.Utils.pt2mm(abBot) * sf;
            abTop = ZSM.Utils.mm2pt(Math.ceil(abTop_mm) / sf);
            abBot = ZSM.Utils.mm2pt(Math.floor(abBot_mm) / sf);

            // horizontal edges: compute required half width then round outwards
            var reqHalfW_mm = ZSM.Utils.pt2mm(gW / 2) * sf + (outX + rMax + gapO) * sf;

            // Ensure artboard covers the Zünd orientation mark (offset from BL corner)
            if (s.mode === "ZUND") {
                var orientRight_mm = -(ZSM.Utils.pt2mm(gW / 2) * sf + outX * sf)
                                     + cfg.orientDist + s.markSizeZ + (s.markSizeZ / 2) + gapO * sf;
                if (orientRight_mm > reqHalfW_mm) reqHalfW_mm = orientRight_mm;
            }

            var abHalfW_mm = Math.ceil(reqHalfW_mm);
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
            res.marksZ.push({ cx: xL + ZSM.Utils.mm2pt((cfg.orientDist + s.markSizeZ) / sf), cy: yB });

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

var ZSM = ZSM || {};

ZSM.Draw = {
    /** @type {Array} AUTO_SPOT_COLOR - CMYK fallback for auto-created spot swatches [C,M,Y,K] */
    AUTO_SPOT_COLOR: [0, 100, 0, 0],

    /** @private Storage for layer names locked at session start, restored on end. */
    _lockedLayers: [],
    /** @private Storage for layer names hidden at session start, restored on end. */
    _hiddenLayers: [],

    // -------------------------------------------------------------------------
    // Session management
    // -------------------------------------------------------------------------

    /**
     * Unlocks and makes all layers visible before rendering.
     * Stores locked layer names so endSession() can restore them.
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
                ZSM.Utils.log("beginSession: failed to unlock layer — " + doc.layers[i].name);
            }
        }
    },

    /**
     * Restores layer locks that were cleared by beginSession().
     */
    endSession: function () {
        var doc = app.activeDocument;
        for (var i = 0; i < this._lockedLayers.length; i++) {
            try {
                doc.layers.getByName(this._lockedLayers[i]).locked = true;
            } catch (e) {}
        }
        for (var i = 0; i < this._hiddenLayers.length; i++) {
            try {
                doc.layers.getByName(this._hiddenLayers[i]).visible = false;
            } catch (e) {}
        }
        this._lockedLayers = [];
        this._hiddenLayers = [];
    },

    // -------------------------------------------------------------------------
    // Bounds
    // -------------------------------------------------------------------------

    /**
     * Returns combined geometric bounds of current selection or all page items.
     * In Fixed/Artboard mode returns the active artboard rect directly.
     * Skips items on the Regmarks layer to avoid measuring our own output.
     * Handles clipped groups by measuring the clip mask path, not the group.
     *
     * Uses selectall + doc.selection (not doc.pageItems) because doc.selection
     * provides a hierarchical view where clipped groups appear as single
     * GroupItem entries. doc.pageItems is a flat recursive collection that
     * exposes group children individually — their .parent chain is unreliable
     * in Illustrator's ExtendScript DOM, so _isInsideClippedGroup() cannot
     * safely filter them out. Unfiltered children would contribute their full
     * unclipped geometricBounds, inflating the measured area.
     *
     * @param {Object} s - Settings (uses s.useArtboardBounds).
     * @returns {Array|null} [L, T, R, B] in document points, or null.
     */
    getBounds: function (s) {
        var doc = app.activeDocument;

        if (s && s.useArtboardBounds) {
            var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
            return ab.artboardRect;
        }

        // Use selectall to get a hierarchical selection — groups as atomic
        // units, children not exposed. This is the only reliable way to
        // measure clipping groups by their mask bounds in ExtendScript.
        app.executeMenuCommand('selectall');
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
            doc.selection = null;
            return null;
        }

        var b = [Infinity, -Infinity, -Infinity, Infinity];
        var found = false;

        for (var i = 0; i < sel.length; i++) {
            var item = sel[i];
            if (item.layer && item.layer.name === ZSM.Config.layerRegmarks) continue;

            // Skip guide paths — guides placed far outside the canvas would
            // inflate bounds to extreme values, causing artboard resize to fail.
            // PathItem and CompoundPathItem expose .guides; other types return
            // undefined (falsy) so the check is safe for any item typename.
            if ((item.typename === "PathItem" || item.typename === "CompoundPathItem") && item.guides) continue;

            // Skip items from layers that were hidden before session started (C2)
            if (item.layer) {
                var wasHidden = false;
                for (var h = 0; h < this._hiddenLayers.length; h++) {
                    if (item.layer.name === this._hiddenLayers[h]) { wasHidden = true; break; }
                }
                if (wasHidden) continue;
            }

            // For clipped groups (including nested), measure the clip mask
            // path instead of the whole group. Clip mask is always the
            // first child (top-most) in a clipping group — AI convention.
            var g = this._getEffectiveBounds(item);

            if (g) {
                b[0] = Math.min(b[0], g[0]);
                b[1] = Math.max(b[1], g[1]);
                b[2] = Math.max(b[2], g[2]);
                b[3] = Math.min(b[3], g[3]);
                found = true;
            }
        }

        doc.selection = null;
        return found ? b : null;
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
            // 1. Resize artboard (Auto-fit mode only)
            if (!s.useArtboardBounds) {
                var activeIdx = doc.artboards.getActiveArtboardIndex();
                doc.artboards[activeIdx].artboardRect = geo.ab;
            }

            // 2. Prepare Regmarks layer at front
            var reg = this.getLay(ZSM.Config.layerRegmarks);
            reg.zOrder(ZOrderMethod.BRINGTOFRONT);
            var refLayer = reg;

            // 3. Dynamic layer mapping — move spot-colored paths to named layers
            // Row existence = active (no checkbox in new UI design)
            if (s.layers && s.layers.length > 0) {
                for (var i = 0; i < s.layers.length; i++) {
                    var layDef = s.layers[i];
                    if (layDef.name && layDef.color && layDef.color !== "") {
                        var targetLay = this.getLay(layDef.name);
                        var hit = this.movePaths(targetLay, [layDef.color]);
                        if (!hit) {
                            geo.warnings.push(ZSM.L.format(ZSM.L.ERR_COLOR_MISSING, layDef.color));
                        }
                        targetLay.move(refLayer, ElementPlacement.PLACEAFTER);
                        refLayer = targetLay;
                    }
                }
            }

            // 4. Draw Zünd marks (circles)
            var col = this.getCol(s.markColor);
            doc.activeLayer = reg;

            var sf   = ZSM.Utils.getSF();
            var zSize = (Number(s.markSizeZ) || 5.0) / sf;
            var rZ   = ZSM.Utils.mm2pt(zSize / 2);

            // Snapshot to avoid live-collection mutation during iteration
            var marksZ = [];
            for (var i = 0; i < geo.marksZ.length; i++) marksZ.push(geo.marksZ[i]);

            for (var z = 0; z < marksZ.length; z++) {
                var m = marksZ[z];
                try {
                    var circle = reg.pathItems.ellipse(m.cy + rZ, m.cx - rZ, rZ * 2, rZ * 2);
                    circle.fillColor = col;
                    circle.stroked   = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Zünd mark at index " + z);
                }
            }

            // 5. Draw Summa marks (squares)
            var sSize = (Number(s.markSizeS) || 3.0) / sf;
            var rS   = ZSM.Utils.mm2pt(sSize / 2);

            var marksS = [];
            for (var i = 0; i < geo.marksS.length; i++) marksS.push(geo.marksS[i]);

            for (var sm = 0; sm < marksS.length; sm++) {
                var m = marksS[sm];
                try {
                    var sq = reg.pathItems.rectangle(m.cy + rS, m.cx - rS, rS * 2, rS * 2);
                    sq.fillColor = col;
                    sq.stroked   = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw Summa mark at index " + sm);
                }
            }

            // 6. Draw Summa registration bar
            if (geo.barS) {
                try {
                    var bar = reg.pathItems.add();
                    bar.setEntirePath([[geo.barS.x1, geo.barS.y], [geo.barS.x2, geo.barS.y]]);
                    bar.strokeColor = col;
                    bar.strokeWidth = geo.barS.w;
                    bar.filled      = false;
                } catch (e) {
                    ZSM.Utils.log("render: failed to draw OPOS bar");
                }
            }

            // 7. Name bottom layer as Graphics and draw trim lines into it.
            //    Assumption: the bottom-most layer is the user's artwork layer.
            //    In multi-layer documents, only the absolute bottom layer is renamed.
            var gfxLayer = doc.layers[doc.layers.length - 1];
            if (gfxLayer.name !== ZSM.Config.layerRegmarks) {
                // Track rename so endSession() can restore locks/visibility (W3)
                var oldGfxName = gfxLayer.name;
                gfxLayer.name    = ZSM.Config.layerGraphics;
                for (var li = 0; li < this._lockedLayers.length; li++) {
                    if (this._lockedLayers[li] === oldGfxName) {
                        this._lockedLayers[li] = ZSM.Config.layerGraphics; break;
                    }
                }
                for (var li = 0; li < this._hiddenLayers.length; li++) {
                    if (this._hiddenLayers[li] === oldGfxName) {
                        this._hiddenLayers[li] = ZSM.Config.layerGraphics; break;
                    }
                }
                gfxLayer.locked  = false;
                gfxLayer.visible = true;
                gfxLayer.zOrder(ZOrderMethod.SENDTOBACK);

                if (geo.red.length > 0) {
                    // Draw trim lines into a sublayer to keep them
                    // separate from artwork but inside the print layer.
                    var trimLayer = gfxLayer.layers.add();
                    trimLayer.name = "Trim";

                    var redColor = new CMYKColor();
                    redColor.magenta = 100;
                    redColor.yellow  = 100;
                    for (var r = 0; r < geo.red.length; r++) {
                        try {
                            var line = trimLayer.pathItems.add();
                            line.setEntirePath([
                                [geo.red[r].x1, geo.red[r].y1],
                                [geo.red[r].x2, geo.red[r].y2]
                            ]);
                            line.strokeColor = redColor;
                            line.strokeWidth = geo.red[r].w;
                            line.filled      = false;
                        } catch (e) {
                            ZSM.Utils.log("render: failed to draw trim line at index " + r);
                        }
                    }
                }
            }

            if (geo.warnings.length > 0) ZSM.Utils.error(geo.warnings.join("\n"));
            app.redraw();

        } catch (e) {
            ZSM.Utils.error(ZSM.L.ERR_RENDER_CRITICAL + e.message);
        }
    },

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Returns effective geometric bounds of an item, respecting clipping
     * masks at any nesting depth. For a clipped group, returns the clip
     * mask bounds. For a non-clipped group, recursively merges children's
     * effective bounds (so a clipped subgroup inside a plain group is
     * handled correctly). For leaf items, returns geometricBounds directly.
     *
     * @param {PageItem} item - Item to measure.
     * @returns {Array|null} [L, T, R, B] in document points, or null on failure.
     * @private
     */
    _getEffectiveBounds: function (item) {
        try {
            if (item.typename === "GroupItem") {
                if (item.clipped) {
                    // Clip mask is always pageItems[0] (topmost child)
                    return item.pageItems[0].geometricBounds;
                }
                // Non-clipped group: merge effective bounds of children
                var b = [Infinity, -Infinity, -Infinity, Infinity];
                var found = false;
                for (var i = 0; i < item.pageItems.length; i++) {
                    var cb = this._getEffectiveBounds(item.pageItems[i]);
                    if (cb) {
                        b[0] = Math.min(b[0], cb[0]);
                        b[1] = Math.max(b[1], cb[1]);
                        b[2] = Math.max(b[2], cb[2]);
                        b[3] = Math.min(b[3], cb[3]);
                        found = true;
                    }
                }
                return found ? b : item.geometricBounds;
            }
            return item.geometricBounds;
        } catch (e) {
            return item.geometricBounds;
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
     * @private
     */
    _isInsideClippedGroup: function (item) {
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
    },

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
                if (this._isInsideClippedGroup(cp)) continue;
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

                // Skip items nested inside clipped groups — moving them out
                // would break the group structure and trigger MRAP errors.
                if (this._isInsideClippedGroup(item)) continue;

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
     * Resolution order: existing swatch → [Registration] fallback → auto-create spot.
     * When auto-creating, sanitizes the name and returns a SpotColor wrapper.
     *
     * @param {string} name - Swatch or spot color name.
     * @returns {Color} Illustrator Color object.
     */
    getCol: function (name) {
        var doc = app.activeDocument;
        var regName = this.getRegistrationName();
        if (!name) name = regName;

        try {
            return doc.swatches.getByName(name).color;
        } catch (e) {
            // Accept both localized and English Registration name
            if (name === regName || name === "[Registration]") {
                var reg = new CMYKColor();
                reg.black = 100;
                return reg;
            }
            // Auto-create a spot swatch as fallback
            try {
                var spot      = doc.spots.add();
                var cleanName = name.replace(/[\[\]\(\)\,\.]/g, "_");
                spot.name     = cleanName;
                var c         = new CMYKColor();
                c.cyan        = this.AUTO_SPOT_COLOR[0];
                c.magenta     = this.AUTO_SPOT_COLOR[1];
                c.yellow      = this.AUTO_SPOT_COLOR[2];
                c.black       = this.AUTO_SPOT_COLOR[3];
                spot.color     = c;
                spot.colorType = ColorModel.SPOT;
                var sc  = new SpotColor();
                sc.spot = spot;
                sc.tint = 100;
                return sc;
            } catch (e2) {
                var fallback = new CMYKColor();
                fallback.black = 100;
                return fallback;
            }
        }
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
                if (n === ZSM.Config.layerRegmarks || n === ZSM.Config.layerGraphics) continue;
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

    /**
     * Builds and displays the main settings dialog.
     * Receives and returns the full preset wrapper {presets, activePreset},
     * not a flat settings object. Returns null if the user cancels.
     *
     * @param {Object} pData - Preset wrapper from Storage.load() or getDefaults().
     * @returns {Object|null} Updated preset wrapper, or null on cancel.
     */
    show: function (pData) {
        var c = ZSM.Config;
        var l = ZSM.L;

        // Safety: ensure wrapper structure is valid
        if (!pData || !pData.presets) {
            pData = { activePreset: c.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[c.PRESET_KEY_DEFAULT] = c.getDefaults();
        }
        if (!pData.presets[pData.activePreset]) {
            pData.activePreset = c.PRESET_KEY_DEFAULT;
        }

        var sData = pData.presets[pData.activePreset]; // Current preset values

        // -----------------------------------------------------------------------
        // Live document data (swatches, layers) — fetched once at dialog open
        // -----------------------------------------------------------------------
        var docSwatches   = ZSM.Draw.getSwatchNames();
        var docLayers     = ZSM.Draw.getLayerNames();
        var detectedColor = ZSM.Draw.detectCutColor();

        // -----------------------------------------------------------------------
        // Window
        // -----------------------------------------------------------------------
        var w = new Window("dialog", c.ui.title);
        w.orientation    = "column";
        w.alignChildren  = ["fill", "top"];
        w.margins        = 20;
        w.spacing        = 15;
        w.preferredSize.width = 390;

        // -----------------------------------------------------------------------
        // Panel: Presets
        // -----------------------------------------------------------------------
        var pPreset = w.add("panel", undefined, l.PANEL_PRESET);
        pPreset.alignChildren = ["fill", "top"];
        pPreset.margins = 15;

        var grpPresetRow = pPreset.add("group");
        grpPresetRow.alignment = ["fill", "top"];
        grpPresetRow.spacing   = 8;
        grpPresetRow.add("statictext", undefined, l.PRESET_LABEL);

        var ddPreset = grpPresetRow.add("dropdownlist", undefined, []);
        ddPreset.preferredSize.width = 170;

        var btnSave = grpPresetRow.add("button", undefined, l.BTN_SAVE);
        btnSave.helpTip = l.TIP_SAVE;

        var btnDel = grpPresetRow.add("button", undefined, l.BTN_DEL);
        btnDel.helpTip = l.TIP_DEL;

        // -----------------------------------------------------------------------
        // Panel 1: Technology
        // -----------------------------------------------------------------------
        var pSystem = w.add("panel", undefined, l.PANEL_TECH);
        pSystem.alignChildren = ["fill", "top"];
        pSystem.margins = 15;

        var dMode = pSystem.add("dropdownlist", undefined, [l.MODE_ZUND, l.MODE_SUMMA]);
        dMode.selection = (sData.mode === "SUMMA") ? 1 : 0;
        dMode.helpTip   = l.TIP_MODE;

        var grpSrc = pSystem.add("group");
        grpSrc.orientation   = "row";
        grpSrc.alignChildren = "left";
        var rbAuto  = grpSrc.add("radiobutton", undefined, l.SRC_AUTO);
        var rbFixed = grpSrc.add("radiobutton", undefined, l.SRC_FIXED);
        if (sData.useArtboardBounds) rbFixed.value = true;
        else rbAuto.value = true;
        rbAuto.helpTip  = l.TIP_SRC_AUTO;
        rbFixed.helpTip = l.TIP_SRC_FIXED;

        // -----------------------------------------------------------------------
        // Panel 2: Gap / Geometry
        // -----------------------------------------------------------------------
        var pGeo = w.add("panel", undefined, l.PANEL_GEO);
        pGeo.alignChildren = ["fill", "top"];
        pGeo.margins = 15;
        pGeo.spacing = 10;

        var rGapGZ = this.addRow(pGeo, l.GAP_GZ,      sData.gapInner,       l.TIP_GAP_GZ);
        var rGapZO = this.addRow(pGeo, l.GAP_ZO,      sData.gapOuter,       l.TIP_GAP_ZO);
        var rMaxD  = this.addRow(pGeo, l.MAX_DIST,     sData.maxDist,        l.TIP_MAX_DIST);
        var rSizeZ = this.addRow(pGeo, l.MARK_SIZE_Z,  sData.markSizeZ || 5, l.TIP_SIZE_Z);
        var rSizeS = this.addRow(pGeo, l.MARK_SIZE_S,  sData.markSizeS || 3, l.TIP_SIZE_S);

        // Mark color — dropdown from live document swatches (fixes UX-03)
        var rColor = this.addColorRow(pGeo, l.MARK_COLOR, sData.markColor, docSwatches, l.TIP_MARK_COLOR);

        // -----------------------------------------------------------------------
        // Panel 3: Feed (Summa only)
        // -----------------------------------------------------------------------
        var pFeed = w.add("panel", undefined, l.PANEL_FEED);
        pFeed.alignChildren = ["fill", "top"];
        pFeed.margins = 15;
        pFeed.spacing = 10;

        var rFT   = this.addRow(pFeed, l.FEED_TOP, sData.feedTop,    l.TIP_FEED_TOP);
        var rFB   = this.addRow(pFeed, l.FEED_BOT, sData.feedBottom, l.TIP_FEED_BOT);
        var chRed = pFeed.add("checkbox", undefined, l.DRAW_RED);
        chRed.value   = sData.drawRed;
        chRed.helpTip = l.TIP_DRAW_RED;

        // -----------------------------------------------------------------------
        // Panel 4: Layer to Color mapping (dynamic rows)
        // -----------------------------------------------------------------------
        var pLay = w.add("panel", undefined, l.PANEL_LAYERS);
        pLay.alignChildren = ["fill", "top"];
        pLay.margins = 15;
        pLay.spacing = 10;

        // Column headers above rows (enterprise table convention)
        // Spacer mirrors the minus-button column so ScriptUI compresses
        // header and data rows at the same ratio → columns stay aligned.
        var grpHeaders = pLay.add("group");
        grpHeaders.alignment = "fill";
        grpHeaders.spacing   = 5;
        var hdrLayer = grpHeaders.add("statictext", undefined, l.COL_LAYER);
        hdrLayer.preferredSize.width = 200;
        var hdrColor = grpHeaders.add("statictext", undefined, l.COL_COLOR);
        hdrColor.preferredSize.width = 150;
        var hdrSpacer = grpHeaders.add("statictext", undefined, "");
        hdrSpacer.preferredSize.width = 30;

        // Dedicated container for mapping rows — add button lives outside
        // so we never need to remove/re-add it (ScriptUI limitation).
        var layContainer = pLay.add("group");
        layContainer.orientation   = "column";
        layContainer.alignChildren = ["fill", "top"];
        layContainer.spacing       = 6;

        var layRows    = [];
        var MAX_LAYERS = 8;

        /**
         * Updates minus button enabled state across all rows.
         * Disabled when only 1 row remains (minimum-one enforcement).
         */
        function updateRemoveButtons() {
            var canRemove = layRows.length > 1;
            for (var r = 0; r < layRows.length; r++) {
                layRows[r].btnRemove.enabled = canRemove;
            }
        }

        /**
         * Builds a single layer-to-color mapping row inside layContainer.
         * Row structure: [layer edittext/dropdown stack] [spot color dropdown] [minus btn]
         *
         * Layer name uses Harbs pattern: edittext overlaid on dropdownlist
         * via stack orientation. Edittext is narrower to expose dropdown arrow.
         * User can type a custom name or pick from the predefined list.
         *
         * @param {Object} def - {name, color}
         * @returns {Object} {grp, ddColor, etLayer, ddLayer, btnRemove}
         */
        function buildLayerRow(def) {
            var grp = layContainer.add("group");
            grp.alignment = "fill";
            grp.spacing   = 5;

            // Layer name — Harbs pattern (edittext stacked over dropdownlist)
            var stack = grp.add("group");
            stack.orientation   = "stack";
            stack.alignChildren = ["left", "center"];
            stack.preferredSize.width = 200;

            // Dropdown first (bottom of stack, full width)
            var ddLayer = stack.add("dropdownlist", undefined, docLayers);
            ddLayer.preferredSize.width = 200;
            ddLayer.helpTip = l.TIP_LAY_NAME;

            // Edittext on top, narrower to expose dropdown arrow (~20px)
            var etLayer = stack.add("edittext", undefined, def.name || "");
            etLayer.preferredSize.width = 180;
            etLayer.helpTip = l.TIP_LAY_NAME;

            // Dropdown selection syncs into edittext
            ddLayer.onChange = function () {
                if (ddLayer.selection) etLayer.text = ddLayer.selection.text;
            };

            // Pre-select dropdown if saved name matches a list item
            ZSM.UI.selectDDL(ddLayer, def.name || "");

            // Spot color dropdown (attribute — what to match)
            var ddColor = grp.add("dropdownlist", undefined, docSwatches);
            ddColor.preferredSize.width = 150;
            ddColor.helpTip = l.TIP_LAY_COLOR;
            ZSM.UI.selectDDL(ddColor, def.color || (docSwatches.length > 0 ? docSwatches[0] : ""));

            // Remove button (Unicode minus sign, not hyphen)
            var btnRemove = grp.add("button", undefined, "\u2212");
            btnRemove.preferredSize = [30, 25];
            btnRemove.helpTip = l.TIP_BTN_REMOVE;

            btnRemove.onClick = function () {
                if (layRows.length <= 1) return; // safety guard
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

            return { grp: grp, ddColor: ddColor, etLayer: etLayer, ddLayer: ddLayer, btnRemove: btnRemove };
        }

        // Populate initial rows from saved settings
        var initLayers = (sData.layers && sData.layers.length > 0)
            ? sData.layers
            : [{ name: "Cut", color: detectedColor }];

        for (var i = 0; i < initLayers.length; i++) {
            layRows.push(buildLayerRow(initLayers[i]));
        }
        updateRemoveButtons();

        // Add button — lives in pLay below layContainer, never removed
        var btnAddLayer = pLay.add("button", undefined, l.BTN_ADD_LAYER);
        btnAddLayer.alignment = "left";
        btnAddLayer.helpTip   = l.TIP_BTN_ADD;
        if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;

        btnAddLayer.onClick = function () {
            if (layRows.length >= MAX_LAYERS) return;
            var newRow = buildLayerRow({ name: "", color: detectedColor });
            layRows.push(newRow);
            if (layRows.length >= MAX_LAYERS) btnAddLayer.enabled = false;
            updateRemoveButtons();
            w.layout.layout(true);
            w.size.height = w.preferredSize.height + 10;
        };

        // -----------------------------------------------------------------------
        // Footer — action buttons
        // -----------------------------------------------------------------------
        var grpButtons = w.add("group");
        grpButtons.alignment = ["right", "center"];
        grpButtons.spacing   = 8;
        var btnCan = grpButtons.add("button", undefined, l.BTN_CANCEL, { name: "cancel" });
        btnCan.helpTip = l.TIP_CANCEL;
        var btnOk  = grpButtons.add("button", undefined, l.BTN_OK,     { name: "ok" });
        btnOk.helpTip  = l.TIP_OK;

        // -----------------------------------------------------------------------
        // Internal helpers
        // -----------------------------------------------------------------------

        /**
         * Reads current UI state and returns a flat settings object.
         * @returns {Object} Flat settings (mode, gaps, layers, etc.)
         */
        function getUIValues() {
            var mode = dMode.selection.text;
            var isZ  = (mode === "ZUND");
            var isS  = (mode === "SUMMA");
            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                // Layer name comes from edittext (user may have typed a custom name)
                var layName = layRows[i].etLayer.text || "";
                layers.push({
                    name:   layName,
                    color:  colorSel
                });
            }
            var colorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text
                : "[Registration]";
            var prev = pData.presets[pData.activePreset] || c.getDefaults();
            return {
                mode:             mode,
                gapInner:         parseFloat(rGapGZ.inp.text.replace(/,/g, ".")),
                gapOuter:         parseFloat(rGapZO.inp.text.replace(/,/g, ".")),
                maxDist:          parseFloat(rMaxD.inp.text.replace(/,/g, ".")),
                feedTop:          isS ? parseFloat(rFT.inp.text.replace(/,/g, ".")) : prev.feedTop,
                feedBottom:       isS ? parseFloat(rFB.inp.text.replace(/,/g, ".")) : prev.feedBottom,
                drawRed:          isS ? chRed.value : prev.drawRed,
                useArtboardBounds: isZ && rbFixed.value,
                markSizeZ:        isZ ? parseFloat(rSizeZ.inp.text.replace(/,/g, ".")) : prev.markSizeZ,
                markSizeS:        isS ? parseFloat(rSizeS.inp.text.replace(/,/g, ".")) : prev.markSizeS,
                markColor:        colorSel,
                layers:           layers
            };
        }

        /**
         * Fills the UI from a flat settings object.
         * Rebuilds layer rows (remove old → insert new before button).
         * @param {Object} obj - Flat settings object.
         */
        function setUIValues(obj) {
            if (!obj) return;
            dMode.selection = (obj.mode === "SUMMA") ? 1 : 0;
            rbFixed.value   = !!obj.useArtboardBounds;
            rbAuto.value    = !obj.useArtboardBounds;
            rGapGZ.inp.text = String(obj.gapInner  !== undefined ? obj.gapInner  : 5);
            rGapZO.inp.text = String(obj.gapOuter  !== undefined ? obj.gapOuter  : 0);
            rMaxD.inp.text  = String(obj.maxDist   !== undefined ? obj.maxDist   : 500);
            rSizeZ.inp.text = String(obj.markSizeZ !== undefined ? obj.markSizeZ : 5);
            rSizeS.inp.text = String(obj.markSizeS !== undefined ? obj.markSizeS : 3);
            ZSM.UI.selectDDL(rColor.ddl, obj.markColor || "[Registration]");
            rFT.inp.text    = String(obj.feedTop    !== undefined ? obj.feedTop    : 70);
            rFB.inp.text    = String(obj.feedBottom !== undefined ? obj.feedBottom : 50);
            chRed.value     = !!obj.drawRed;

            // Clear layer rows from container (button stays in pLay untouched)
            while (layContainer.children.length > 0) {
                layContainer.remove(layContainer.children[0]);
            }
            layRows = [];

            var newLayers = (obj.layers && obj.layers.length > 0)
                ? obj.layers
                : [{ name: "Cut", color: detectedColor }];
            for (var i = 0; i < newLayers.length; i++) {
                layRows.push(buildLayerRow(newLayers[i]));
            }
            btnAddLayer.enabled = (layRows.length < MAX_LAYERS);
            updateRemoveButtons();

            update();
        }

        // -----------------------------------------------------------------------
        // Visibility / enabled logic (called on mode change)
        // -----------------------------------------------------------------------
        function update() {
            var isZ = (dMode.selection.text === "ZUND");
            var isS = (dMode.selection.text === "SUMMA");

            rGapGZ.group.visible            = isZ;
            rGapGZ.group.maximumSize.height = isZ ? 1000 : 0;
            // Gap from graphic is irrelevant in Fixed mode (marks measure from artboard edge)
            rGapGZ.inp.enabled              = isZ && !rbFixed.value;
            grpSrc.visible                  = isZ;
            grpSrc.maximumSize.height       = isZ ? 1000 : 0;
            rSizeZ.group.visible            = isZ;
            rSizeZ.group.maximumSize.height = isZ ? 1000 : 0;
            rSizeS.group.visible            = isS;
            rSizeS.group.maximumSize.height = isS ? 1000 : 0;
            pFeed.visible                   = isS;
            pFeed.maximumSize.height        = isS ? 1000 : 0;
            chRed.enabled                   = isS;

            // Reset hidden mode inputs to preset values (not defaults)
            // so switching modes doesn't lose custom values (fixes H/I visual)
            var prevU = pData.presets[pData.activePreset] || c.getDefaults();
            if (!isZ) rSizeZ.inp.text = String(prevU.markSizeZ);
            if (!isS) {
                rSizeS.inp.text = String(prevU.markSizeS);
                chRed.value = prevU.drawRed;
            }

            w.layout.layout(true);
            w.preferredSize.height = -1;
            w.layout.layout(true);
            if (w.preferredSize.height > 0) w.size.height = w.preferredSize.height + 10;
        }

        // -----------------------------------------------------------------------
        // Preset logic
        // -----------------------------------------------------------------------
        // sortedKeys is shared between updatePresetList and init sync below.
        // Declared here so the init block can reference it after the first call.
        var sortedKeys = [];

        function updatePresetList() {
            ddPreset.removeAll();
            sortedKeys = [];
            var keys = [];
            for (var k in pData.presets) {
                // [Last Settings] is an internal auto-save key — never shown in dropdown
                if (pData.presets.hasOwnProperty(k) && k !== "[Last Settings]") keys.push(k);
            }
            keys.sort();
            var selIdx = 0;
            for (var i = 0; i < keys.length; i++) {
                var displayText = (keys[i] === c.PRESET_KEY_DEFAULT) ? l.PRESET_DEFAULT : keys[i];
                ddPreset.add("item", displayText);
                sortedKeys.push(keys[i]);
                if (keys[i] === pData.activePreset) selIdx = i;
            }
            if (ddPreset.items.length > 0) ddPreset.selection = selIdx;
            btnDel.enabled = (pData.activePreset !== c.PRESET_KEY_DEFAULT);
        }

        ddPreset.onChange = function () {
            if (!ddPreset.selection) return;
            var sel = sortedKeys[ddPreset.selection.index];
            if (!sel || sel === pData.activePreset) return;
            // Load only — no auto-save (matches Adobe standard: switching never overwrites)
            pData.activePreset = sel;
            btnDel.enabled = (sel !== c.PRESET_KEY_DEFAULT);
            if (pData.presets[sel]) setUIValues(pData.presets[sel]);
        };

        btnSave.onClick = function () {
            var name = prompt(l.PROMPT_NEW_PRESET,
                (pData.activePreset !== c.PRESET_KEY_DEFAULT ? pData.activePreset : l.PRESET_PLACEHOLDER));
            if (!name) return;
            if (pData.presets[name] && name !== pData.activePreset) {
                if (!confirm(l.ERR_PRESET_EXISTS)) return;
            }
            pData.presets[name] = getUIValues();
            pData.activePreset  = name;
            updatePresetList();
        };

        btnDel.onClick = function () {
            if (pData.activePreset === c.PRESET_KEY_DEFAULT || pData.activePreset === "[Last Settings]") {
                alert(l.ERR_PRESET_DEL_DEF);
                return;
            }
            delete pData.presets[pData.activePreset];
            pData.activePreset = c.PRESET_KEY_DEFAULT;
            updatePresetList();
            setUIValues(pData.presets[c.PRESET_KEY_DEFAULT]);
        };

        // -----------------------------------------------------------------------
        // Event wiring
        // -----------------------------------------------------------------------
        dMode.onChange   = function () { update(); };
        rbAuto.onClick   = function () { update(); };
        rbFixed.onClick  = function () { update(); };

        // -----------------------------------------------------------------------
        // OK: validate → build result → close
        // -----------------------------------------------------------------------
        var result = null;

        btnOk.onClick = function () {
            var mode = dMode.selection.text;
            var isZ  = (mode === "ZUND");
            var isS  = (mode === "SUMMA");

            // Validation — each call shows a localized alert and returns null on failure
            var gapI   = ZSM.Utils.validateNumber(rGapGZ.inp.text, 0,   1000, l.GAP_GZ);    if (gapI   === null) return;
            var gapO   = ZSM.Utils.validateNumber(rGapZO.inp.text, 0,   1000, l.GAP_ZO);    if (gapO   === null) return;
            var maxD   = ZSM.Utils.validateNumber(rMaxD.inp.text,  50,  5000, l.MAX_DIST);  if (maxD   === null) return;
            var prevOk = pData.presets[pData.activePreset] || c.getDefaults();
            var markSZ = isZ ? ZSM.Utils.validateNumber(rSizeZ.inp.text, 0.1, 50, l.MARK_SIZE_Z) : prevOk.markSizeZ;
            if (isZ && markSZ === null) return;
            var markSS = isS ? ZSM.Utils.validateNumber(rSizeS.inp.text, 0.1, 50, l.MARK_SIZE_S) : prevOk.markSizeS;
            if (isS && markSS === null) return;
            var fTop = prevOk.feedTop || 0, fBot = prevOk.feedBottom || 0;
            if (isS) {
                fTop = ZSM.Utils.validateNumber(rFT.inp.text, 0, 1000, l.FEED_TOP); if (fTop === null) return;
                fBot = ZSM.Utils.validateNumber(rFB.inp.text, 0, 1000, l.FEED_BOT); if (fBot === null) return;
            }

            var layers = [];
            for (var i = 0; i < layRows.length; i++) {
                var colorSel = layRows[i].ddColor.selection
                    ? layRows[i].ddColor.selection.text
                    : (layRows[i].ddColor.items.length > 0 ? layRows[i].ddColor.items[0].text : "[Registration]");
                var layName = layRows[i].etLayer.text || "";
                layers.push({
                    name:   layName,
                    color:  colorSel
                });
            }

            var colorSel = rColor.ddl.selection
                ? rColor.ddl.selection.text
                : "[Registration]";

            var finalSettings = {
                mode:              mode,
                gapInner:          gapI,
                gapOuter:          gapO,
                maxDist:           maxD,
                feedTop:           fTop,
                feedBottom:        fBot,
                drawRed:           isS ? chRed.value : prevOk.drawRed,
                useArtboardBounds: isZ && rbFixed.value,
                markSizeZ:         markSZ,
                markSizeS:         markSS,
                markColor:         colorSel,
                layers:            layers
            };

            // Always persist last run as [Last Settings]
            pData.presets["[Last Settings]"] = finalSettings;

            // Auto-save modifications back to the active named preset
            if (pData.activePreset !== c.PRESET_KEY_DEFAULT && pData.activePreset !== "[Last Settings]") {
                pData.presets[pData.activePreset] = finalSettings;
            } else {
                pData.activePreset = "[Last Settings]";
            }

            result = pData;
            w.close(1);
        };

        // -----------------------------------------------------------------------
        // Init and show
        // -----------------------------------------------------------------------

        // 1. Populate dropdown (without [Last Settings])
        updatePresetList();

        // 2. Load values from [Last Settings] if it exists (transparent state restore),
        //    otherwise fall back to the active preset
        var initPreset = pData.presets["[Last Settings]"] || pData.presets[pData.activePreset];
        if (initPreset) setUIValues(initPreset);

        // 3. Sync dropdown selection to activePreset — setUIValues() does not touch the dropdown
        for (var initIdx = 0; initIdx < sortedKeys.length; initIdx++) {
            if (sortedKeys[initIdx] === pData.activePreset) {
                ddPreset.selection = initIdx;
                break;
            }
        }

        update();
        w.show();
        return result;
    },

    // -------------------------------------------------------------------------
    // Shared UI helpers (also used inside show() via ZSM.UI.x)
    // -------------------------------------------------------------------------

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
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var et = g.add("edittext", undefined, String(value));
        et.preferredSize.width = 60;
        if (tip) et.helpTip = tip;
        g.add("statictext", undefined, "mm");
        return { inp: et, group: g };
    },

    /**
     * Adds a labeled color row using a dropdownlist of document swatches.
     * Replaces the old edittext-based addColorRow (fixes UX-03).
     * @param {Object} parent      - ScriptUI container.
     * @param {string} label       - Row label.
     * @param {string} value       - Initial swatch name.
     * @param {Array}  swatchNames - List from ZSM.Draw.getSwatchNames().
     * @param {string} tip         - HelpTip string.
     * @returns {Object} {ddl: DropDownList, group: Group}
     */
    addColorRow: function (parent, label, value, swatchNames, tip) {
        var g  = parent.add("group");
        g.alignment = "fill";
        var st = g.add("statictext", undefined, label);
        st.preferredSize.width = 160;
        if (tip) st.helpTip = tip;
        var ddl = g.add("dropdownlist", undefined, swatchNames);
        ddl.preferredSize.width = 130;
        if (tip) ddl.helpTip = tip;
        this.selectDDL(ddl, value || "[Registration]");
        return { ddl: ddl, group: g };
    },

    /**
     * Selects a dropdownlist item by text value.
     * Falls back to first item if not found.
     * @param {DropDownList} ddl  - Target control.
     * @param {string}       text - Item text to select.
     */
    selectDDL: function (ddl, text) {
        if (!text) { if (ddl.items.length > 0) ddl.selection = 0; return; }
        for (var i = 0; i < ddl.items.length; i++) {
            if (ddl.items[i].text === text) { ddl.selection = i; return; }
        }
        if (ddl.items.length > 0) ddl.selection = 0;
    }
};

(function (ZSM) {
    var draw = ZSM.Draw;
    try {
        if (app.documents.length === 0) {
            alert(ZSM.L.ERR_NO_DOC);
            return;
        }

        // Load saved settings (returns full preset wrapper or null)
        var pData = ZSM.Config.Storage.load();
        if (!pData) {
            // First run: build minimal wrapper from defaults
            pData = { activePreset: ZSM.Config.PRESET_KEY_DEFAULT, presets: {} };
            pData.presets[ZSM.Config.PRESET_KEY_DEFAULT] = ZSM.Config.getDefaults();
        }

        // Show dialog — returns updated wrapper or null on cancel
        var resultWrapper = ZSM.UI.show(pData);
        if (!resultWrapper) return;

        // Persist settings before rendering (so a crash doesn't lose the config)
        ZSM.Config.Storage.save(resultWrapper);

        // Extract the flat settings object for the active preset
        var res = resultWrapper.presets[resultWrapper.activePreset];

        // Unlock layers, set ruler origin
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
        alert(ZSM.L.ERR_CRITICAL + e.message + " (line " + e.line + ")");
    } finally {
        // Always restore layer locks, even if render throws
        if (app.documents.length > 0) draw.endSession();
    }
})(ZSM);
