// ------------------------------------------------------------------------
// Module: UIState (shared) — pure preset state-transition logic
// Part of: shared core (consumed by grommet-marks and zund-summa-marks)
//
// Namespace-neutral factory: buildUIState(NS) registers NS.UIState on the
// namespace object passed in. Each tool's build cats this file and appends
// its own call — buildUIState(GM); / buildUIState(ZSM);. Tests eval this
// file, then call the factory with their mock namespace.
//
// MUST be called after NS.Utils is defined (isModified uses presetEquals).
//
// Extracted from ScriptUI event handlers so it can be unit-tested without
// a real dialog. The dialogs (each tool's ui.js) wire these to button
// onClick handlers; everything UI-specific stays there.
// ------------------------------------------------------------------------
function buildUIState(NS) {
    NS.UIState = {
        // Duplicated from NS.Config (kept local so ui_state stays unit-testable
        // without Config). MUST stay in sync with NS.Config.PRESET_KEY_DEFAULT.
        PRESET_KEY_DEFAULT: "[Default]",
        PRESET_KEY_LAST:    "[Last Settings]",

        /**
         * Validates a preset name.
         * Any fully-bracketed name ([...]) is reserved — the bracket namespace
         * belongs to internal presets. (Canonical policy adopted from ZSM;
         * a deliberate behavior change for GM, which previously reserved only
         * the two known keys.)
         * @param {string} rawName - User-entered name.
         * @returns {string|null} Trimmed name, or null if invalid/reserved.
         */
        validatePresetName: function (rawName) {
            var name = String(rawName == null ? "" : rawName).replace(/^\s+|\s+$/g, "");
            if (!name) return null;
            if (/^\[.+\]$/.test(name)) return null;
            return name;
        },

        /**
         * Returns true if the active preset has unsaved changes.
         * @param {Object} pData - Preset wrapper {activePreset, presets}.
         * @param {Object} currentValues - Current UI values.
         * @returns {boolean}
         */
        isModified: function (pData, currentValues) {
            if (!pData || !currentValues) return false;
            var preset = pData.presets[pData.activePreset];
            if (!preset) return false;
            return !NS.Utils.presetEquals(currentValues, preset);
        },

        /**
         * Builds dropdown list data: ordered keys with display text + modified indicator.
         * @param {Object} pData - Preset wrapper.
         * @param {Object} currentValues - Current UI values.
         * @param {Object} L - Locale (PRESET_DEFAULT for [Default] display).
         * @returns {Array} [{key, displayText, isActive, isModified}, ...]
         */
        formatPresetList: function (pData, currentValues, L) {
            L = L || {};
            var defaultDisplay = L.PRESET_DEFAULT || this.PRESET_KEY_DEFAULT;
            var DEF = this.PRESET_KEY_DEFAULT;
            var keys = [];
            for (var k in pData.presets) {
                if (pData.presets.hasOwnProperty(k) && k !== this.PRESET_KEY_LAST) keys.push(k);
            }
            keys.sort(function (a, b) {
                if (a === DEF) return -1;
                if (b === DEF) return 1;
                return a < b ? -1 : (a > b ? 1 : 0);
            });

            var modified = this.isModified(pData, currentValues);

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
         * If active is [Default] or [Last Settings], returns needs-name.
         * @param {Object} pData - Preset wrapper (mutated).
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
         * @param {Object} pData - Preset wrapper (mutated).
         * @param {string} name - New preset name (raw user input).
         * @param {Object} currentValues - UI values.
         * @param {Function} confirmOverwrite - Optional callback (returns bool).
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
         * @param {Object} pData - Preset wrapper (mutated).
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
         * Switch to a different preset.
         * @param {Object} pData - Preset wrapper (mutated).
         * @param {string} name - Target preset key.
         * @returns {Object} {ok, settings?, reason?}
         */
        selectPreset: function (pData, name) {
            if (!pData) return { ok: false, reason: "missing-input" };
            if (!pData.presets[name]) return { ok: false, reason: "not-found" };
            pData.activePreset = name;
            return { ok: true, settings: pData.presets[name] };
        }
    };
}
