// ------------------------------------------------------------------------
// Module: TE.Storage — settings persistence
// Part of: Illustrator Tile Export
//
// Reads and writes the JSON settings file at
// `Folder.userData/tile-export/settings.json`. Pure I/O; no DOM, no UI.
// No migrations — this tool has no older format to migrate from. The design
// rationale for this layout lives in docs/persistence.md.
//
// Depends on: TE.Config (getDefaults, preset keys), TE.Utils (logging), JSON
// ------------------------------------------------------------------------
var TE = TE || {};

TE.Storage = {
    /**
     * Returns the settings File, creating the folder if needed.
     * @returns {File} JSON settings file at the canonical path.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/tile-export");
        if (!folder.exists) { folder.create(); }
        return new File(folder.fsName + "/settings.json");
    },

    /**
     * Serializes and saves the full preset wrapper.
     *
     * Returns success rather than alerting, so the CALLER decides how to
     * surface a failure with its own context. open(), write() and close() are
     * all checked — File.write returns false on a full disk or permission
     * error without throwing, so an unchecked call loses settings silently.
     *
     * @param {Object} data - Full preset wrapper {activePreset, presets}.
     * @returns {boolean} True when the file was written completely.
     */
    save: function (data) {
        try {
            var f = this.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                TE.Utils.log("Storage.save: open(w) failed for " + f.fsName);
                return false;
            }
            var wrote = f.write(JSON.stringify(data));
            var closed = f.close();
            if (!wrote || !closed) {
                TE.Utils.log("Storage.save: write/close failed for " + f.fsName);
                return false;
            }
            return true;
        } catch (e) {
            TE.Utils.log("Storage.save failed: " + e.message);
            return false;
        }
    },

    /**
     * Loads the preset wrapper from disk.
     *
     * Any preset found is merged onto current defaults, so a settings file
     * written by an older build gains new keys instead of handing the tool an
     * undefined where it expects a number.
     *
     * @returns {Object|null} Full preset wrapper, or null when unreadable.
     */
    load: function () {
        var f = this.getFile();
        if (!f.exists) { return null; }

        try {
            f.encoding = "UTF-8";
            if (!f.open("r")) {
                TE.Utils.log("Storage.load: open(r) failed for " + f.fsName);
                return null;
            }
            var content = f.read();
            f.close();
            if (!content) { return null; }

            var data = JSON.parse(content);
            if (!data || !data.presets) { return null; }

            var key;
            for (key in data.presets) {
                if (data.presets.hasOwnProperty(key)) {
                    data.presets[key] = this.fillDefaults(data.presets[key]);
                }
            }
            return data;
        } catch (e) {
            TE.Utils.log("Storage.load failed: " + e.message);
            return null;
        }
    },

    /**
     * Merges a stored preset onto current defaults — every default key is
     * present, stored values win where they exist.
     * @param {Object} preset - Stored preset, possibly incomplete.
     * @returns {Object} Complete settings object.
     */
    fillDefaults: function (preset) {
        var def = TE.Config.getDefaults();
        var out = {}, k;
        for (k in def) {
            if (def.hasOwnProperty(k)) {
                out[k] = (preset && preset.hasOwnProperty(k)) ? preset[k] : def[k];
            }
        }
        return out;
    }
};
