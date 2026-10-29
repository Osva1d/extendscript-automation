// ------------------------------------------------------------------------
// Module: BTE.Storage — the preset format (step objects), repairing a stored
//         preset, and the settings file
// Part of: Illustrator Batch Text Edit
// Depends on: BTE.L, BTE.Config, BTE.Utils, JSON; File and Folder in load/save
//
// A preset is {order: "rows"|"cols", steps: [Step]}. The Rozsah (selection,
// artboard, document) is not part of it: it belongs to a run, not to a recipe
// (spec 6.4). The file at Folder.userData/batch-text-edit/settings.json holds
// {activePreset, presets: {name: preset}}; the default preset is built from
// the code on every open and never written (extendscript-ui-standards 12.4).
// No migrations: this tool has no older format. normalize() is the whole
// defence against a file from another job, a hand edit or a future version.
// The design rationale for the file layout lives in docs/persistence.md.
// ------------------------------------------------------------------------
var BTE = BTE || {};

BTE.Storage = {
    /** @type {string} Folder under Folder.userData. */
    FOLDER: "batch-text-edit",

    /** @type {string} File in that folder. */
    FILE: "settings.json",

    /**
     * The "Kde" kinds each step type has (spec 5.2). "auto" is not one of
     * them: it only stands for "pick the default", see defaultPreset().
     * @type {Object.<string, Array.<string>>}
     */
    KINDS: {
        "replace": ["var", "text", "regex"],
        "number": ["var", "first", "text", "regex"],
        "case": ["all", "var", "text", "regex"]
    },

    /**
     * The "Kde" kind of a new step when the text holds no variable (spec 5.2).
     * @type {Object.<string, string>}
     */
    FALLBACK_KIND: { "replace": "text", "number": "first", "case": "all" },

    /**
     * Whether a step type is one this version knows.
     * @param {*} type - Anything.
     * @returns {boolean} True for "replace", "number" and "case".
     */
    isType: function (type) {
        return typeof type === "string" && Object.prototype.hasOwnProperty.call(BTE.Storage.KINDS, type);
    },

    /**
     * A step of the given type with every field at its factory value (spec
     * 5.2 to 5.5). Numeric fields are field text, as the dialog holds them.
     * The "Kde" is "auto": whoever shows the step resolves it with
     * BTE.UIModel.defaultWhere, which knows the variables of the text.
     * @param {string} type - "replace", "number" or "case".
     * @returns {Object} A new step.
     */
    newStep: function (type) {
        var s = { type: type, active: true, where: { kind: "auto", text: "" } };
        if (type === "replace") {
            s.replace = "";
            s.matchCase = false;
            s.firstOnly = false;
        } else if (type === "number") {
            s.from = "1";
            s.to = "";
            s.step = "1";
            s.digits = "3";
            s.repeats = "1";
            s.reset = "";
            s.format = "1";
        } else if (type === "case") {
            s.mode = "upper";
        } else {
            throw new Error("BTE.Storage: unknown step type \"" + type + "\"");
        }
        return s;
    },

    /**
     * The factory preset, [Výchozí]: one Number step with the factory values
     * (spec 6.4). Its "Kde" is {kind: "auto"}; the dialog resolves it with
     * defaultWhere when it opens, so a saved preset always holds a concrete
     * "Kde". Built on every call, so nobody can change the factory values.
     * @returns {{order: string, steps: Array}} A new preset.
     */
    defaultPreset: function () {
        return { order: "rows", steps: [BTE.Storage.newStep("number")] };
    },

    /**
     * Makes any stored value into a preset the dialog and BTE.Steps.run can
     * take. Never throws, never changes its input. Missing fields come from
     * newStep(); a step of an unknown type is dropped; a "Kde" the step type
     * does not have is replaced by the type's default; an unknown order
     * becomes "rows" (BTE.Order.sort throws on anything else). A variable
     * name is kept exactly as stored, also when no text has it: the dialog
     * shows it as "(nenalezeno)" and nothing is swapped silently (spec 5.1).
     * Fields that are not part of a preset (the Rozsah, anything from a
     * newer version) are not kept. An invalid Formát or Režim becomes the
     * default without a note, an invalid Kde or order with one. A preset
     * with no step left gets one Number step, so the dialog always has a
     * selected step. "auto" passes through, so the default preset is a fixed
     * point. A second pass changes nothing and has no notes.
     * @param {*} values - A stored preset, or anything.
     * @returns {{values: {order: string, steps: Array}, notes: Array.<string>}}
     *     The preset, and what was repaired, in the user's language and
     *     without the preset's name (load() adds it).
     */
    normalize: function (values) {
        var L = BTE.L;
        var v = (values !== null && typeof values === "object") ? values : {};
        var notes = [];
        var out = { order: "rows", steps: [] };
        var raw, i, step, fallback;

        if (v.order === "rows" || v.order === "cols") {
            out.order = v.order;
        } else {
            notes.push(L.NOTE_ORDER_RESET);
        }

        raw = BTE.Utils.isArray(v.steps) ? v.steps : [];
        for (i = 0; i < raw.length; i++) {
            step = BTE.Storage.normalizeStep(raw[i], i + 1, notes);
            if (step !== null) { out.steps.push(step); }
        }

        if (out.steps.length === 0) {
            fallback = BTE.Storage.newStep("number");
            fallback.where = { kind: BTE.Storage.FALLBACK_KIND["number"], text: "" };
            out.steps.push(fallback);
            notes.push(L.NOTE_NO_STEPS);
        }
        return { values: out, notes: notes };
    },

    /**
     * One stored step made into a complete one (see normalize).
     * @param {*} raw - The stored step.
     * @param {number} no - Its position, from 1, for the notes.
     * @param {Array.<string>} notes - Collects what was repaired.
     * @returns {Object|null} The step, or null when its type is unknown.
     */
    normalizeStep: function (raw, no, notes) {
        var L = BTE.L;
        var S = BTE.Storage;
        var type = (raw !== null && typeof raw === "object") ? raw.type : undefined;
        var shown, s, i, fields;

        function str(value, def) {
            if (typeof value === "string") { return value; }
            if (typeof value === "number" && isFinite(value)) { return String(value); }
            return def;
        }
        function bool(value, def) {
            return typeof value === "boolean" ? value : def;
        }
        function oneOf(value, allowed, def) {
            return BTE.Utils.indexOf(allowed, value) === -1 ? def : value;
        }

        if (!S.isType(type)) {
            shown = typeof type === "string" ? type : "?";
            if (shown.length > 20) { shown = shown.substring(0, 19) + "…"; }
            notes.push(L.format(L.NOTE_STEP_DROPPED, no, shown));
            return null;
        }

        s = S.newStep(type);
        s.active = bool(raw.active, true);
        s.where = S.normalizeWhere(type, raw.where, no, notes);
        if (type === "replace") {
            s.replace = str(raw.replace, s.replace);
            s.matchCase = bool(raw.matchCase, s.matchCase);
            s.firstOnly = bool(raw.firstOnly, s.firstOnly);
        } else if (type === "number") {
            fields = ["from", "to", "step", "digits", "repeats", "reset"];
            for (i = 0; i < fields.length; i++) {
                s[fields[i]] = str(raw[fields[i]], s[fields[i]]);
            }
            s.format = oneOf(raw.format, ["1", "A", "a"], s.format);
        } else {
            s.mode = oneOf(raw.mode, ["upper", "lower", "title", "sentence"], s.mode);
        }
        return s;
    },

    /**
     * A stored "Kde" made valid for its step type. A missing one is the
     * type's default without a note; a present one that is not valid gets
     * the default and a note.
     * @param {string} type - The step type, one isType() accepts.
     * @param {*} raw - The stored {kind, text}.
     * @param {number} no - The step's position, from 1, for the note.
     * @param {Array.<string>} notes - Collects what was repaired.
     * @returns {{kind: string, text: string}} A "Kde" the type has.
     */
    normalizeWhere: function (type, raw, no, notes) {
        var S = BTE.Storage;
        var fallback = { kind: S.FALLBACK_KIND[type], text: "" };
        var kind, text, known, named;

        if (raw === undefined || raw === null) { return fallback; }
        kind = typeof raw === "object" ? raw.kind : undefined;
        text = raw.text;
        if (typeof text === "number" && isFinite(text)) { text = String(text); }
        if (typeof text !== "string") { text = ""; }

        known = kind === "auto" || BTE.Utils.indexOf(S.KINDS[type], kind) !== -1;
        // Only these kinds carry text; a variable must have a name.
        named = kind === "var" || kind === "text" || kind === "regex";
        if (known && !(kind === "var" && text === "")) {
            return { kind: kind, text: named ? text : "" };
        }
        notes.push(BTE.L.format(BTE.L.NOTE_WHERE_RESET, no));
        return fallback;
    },

    /**
     * The settings File, creating its folder if needed.
     * @returns {File} The file at the canonical path.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/" + BTE.Storage.FOLDER);
        if (!folder.exists) { folder.create(); }
        return new File(folder.fsName + "/" + BTE.Storage.FILE);
    },

    /**
     * Writes a failure where a debugger can see it. A failed read or write
     * never alerts from here: the caller decides what to tell the user.
     * @param {string} msg - What failed.
     */
    log: function (msg) {
        if (typeof $ !== "undefined" && $.writeln) { $.writeln("[BTE] Storage." + msg); }
    },

    /**
     * A wrapper with nothing stored: the default preset, active.
     * @returns {{activePreset: string, presets: Object, notes: Array}} A new wrapper.
     */
    fresh: function () {
        var key = BTE.Config.PRESET_KEY_DEFAULT;
        var pData = { activePreset: key, presets: {}, notes: [] };
        pData.presets[key] = BTE.Storage.defaultPreset();
        return pData;
    },

    /**
     * Loads the preset wrapper from disk. Always returns a wrapper the dialog
     * can use: no file, an empty file, or one that cannot be read gives the
     * default preset alone (the last case with a note). Every stored preset
     * goes through normalize(), so a preset from another job or a newer
     * version cannot crash the dialog, and what was repaired is in `notes`,
     * each led by the preset's name. The stored default preset is ignored and
     * rebuilt from the code, so a change of factory values reaches everyone.
     * An active preset that is gone is replaced by the default.
     * @returns {{activePreset: string, presets: Object.<string, Object>, notes: Array.<string>}}
     *     `notes` is not part of the file; save() does not write it.
     */
    load: function () {
        var S = BTE.Storage;
        var L = BTE.L;
        var defKey = BTE.Config.PRESET_KEY_DEFAULT;
        var pData = S.fresh();
        var data, f, content, key, r, i;

        try {
            f = S.getFile();
            if (!f.exists) { return pData; }
            f.encoding = "UTF-8";
            if (!f.open("r")) {
                S.log("load: open(r) failed for " + f.fsName);
                pData.notes.push(L.NOTE_UNREADABLE);
                return pData;
            }
            content = f.read();
            f.close();
            if (!content) { return pData; }
            data = JSON.parse(content);
        } catch (e) {
            S.log("load failed: " + e.message);
            pData.notes.push(L.NOTE_UNREADABLE);
            return pData;
        }

        if (data === null || typeof data !== "object" || BTE.Utils.isArray(data)) {
            pData.notes.push(L.NOTE_UNREADABLE);
            return pData;
        }
        if (data.presets === undefined) { return pData; }
        if (data.presets === null || typeof data.presets !== "object" || BTE.Utils.isArray(data.presets)) {
            pData.notes.push(L.NOTE_UNREADABLE);
            return pData;
        }

        for (key in data.presets) {
            if (Object.prototype.hasOwnProperty.call(data.presets, key) && key !== defKey) {
                r = S.normalize(data.presets[key]);
                pData.presets[key] = r.values;
                for (i = 0; i < r.notes.length; i++) {
                    pData.notes.push(L.format(L.NOTE_PRESET, key, r.notes[i]));
                }
            }
        }
        if (typeof data.activePreset === "string" && Object.prototype.hasOwnProperty.call(pData.presets, data.activePreset)) {
            pData.activePreset = data.activePreset;
        }
        return pData;
    },

    /**
     * Saves the wrapper: {activePreset, presets} without the default preset
     * and without `notes`. Returns success rather than alerting, so the
     * caller says what it means for the user (extendscript-ui-standards
     * 12.2). open(), write() and close() are all checked: File.write returns
     * false on a full disk or a permission error without throwing, so an
     * unchecked call would lose the presets silently.
     * @param {{activePreset: string, presets: Object}} pData - The wrapper.
     * @returns {boolean} True when the file was written completely.
     */
    save: function (pData) {
        var S = BTE.Storage;
        var defKey = BTE.Config.PRESET_KEY_DEFAULT;
        var out = { activePreset: "", presets: {} };
        var key, f, wrote, closed;

        if (!pData || pData.presets === null || typeof pData.presets !== "object") { return false; }
        out.activePreset = pData.activePreset;
        for (key in pData.presets) {
            if (Object.prototype.hasOwnProperty.call(pData.presets, key) && key !== defKey) {
                out.presets[key] = pData.presets[key];
            }
        }

        try {
            f = S.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                S.log("save: open(w) failed for " + f.fsName);
                return false;
            }
            wrote = f.write(JSON.stringify(out));
            closed = f.close();
            if (!wrote || !closed) {
                S.log("save: write/close failed for " + f.fsName);
                return false;
            }
            return true;
        } catch (e) {
            S.log("save failed: " + e.message);
            return false;
        }
    }
};
