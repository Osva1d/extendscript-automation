// ------------------------------------------------------------------------
// Module: BRE.Storage — remembers the dialog settings between runs
// Part of: Illustrator Batch Relink Export
// Depends on: BRE.Config (defaultNamingPattern, debug), JSON (json2.js)
//
// Reads and writes `Folder.userData/batch-relink-export/settings.json`.
// Pure I/O; no DOM, no UI. The source folder changes with every job and
// "Skip existing" is a per-run decision, so neither is remembered. The design
// rationale for settings files lives in docs/persistence.md.
// ------------------------------------------------------------------------
var BRE = BRE || {};

BRE.Storage = {
    /**
     * The settings the dialog opens with when nothing is remembered.
     * @returns {Object} { template, output, pattern, preset, openAfter }
     */
    defaults: function () {
        return {
            template: "",
            output: "",
            pattern: BRE.Config.defaultNamingPattern,
            preset: "",
            openAfter: true
        };
    },

    /**
     * Returns the settings File, creating its folder if needed.
     * @returns {File} JSON settings file at the canonical path.
     */
    getFile: function () {
        var folder = new Folder(Folder.userData + "/batch-relink-export");
        if (!folder.exists) folder.create();
        return new File(folder.fsName + "/settings.json");
    },

    /**
     * Loads the remembered settings. Each stored value replaces its default
     * only when it has the default's type, so a missing, unreadable or
     * hand-edited file still yields a complete, usable set.
     * @returns {Object} { template, output, pattern, preset, openAfter }
     */
    load: function () {
        var out = this.defaults();
        var stored = null;
        try {
            var f = this.getFile();
            if (!f.exists) return out;
            f.encoding = "UTF-8";
            if (!f.open("r")) {
                this._log("load: open(r) failed for " + f.fsName);
                return out;
            }
            var content = f.read();
            f.close();
            if (content) stored = JSON.parse(content);
        } catch (e) {
            this._log("load failed: " + e.message);
            return out;
        }
        if (!stored || typeof stored !== "object") return out;
        for (var k in out) {
            if (out.hasOwnProperty(k) && stored.hasOwnProperty(k) &&
                    typeof stored[k] === typeof out[k]) {
                out[k] = stored[k];
            }
        }
        return out;
    },

    /**
     * Remembers the settings of a validated dialog. Returns success rather
     * than alerting, so the caller decides how to surface a failure. open(),
     * write() and close() are all checked — File.write returns false on a full
     * disk or a permission error without throwing.
     * @param {Object} config - Validated config from BRE.UI.show().
     * @returns {boolean} True when the file was written completely.
     */
    save: function (config) {
        var data = {
            template: config.templateFile.fsName,
            output: config.outputFolder.fsName,
            pattern: config.namingPattern,
            preset: config.preset,
            openAfter: config.openAfter
        };
        try {
            var f = this.getFile();
            f.encoding = "UTF-8";
            if (!f.open("w")) {
                this._log("save: open(w) failed for " + f.fsName);
                return false;
            }
            var wrote = f.write(JSON.stringify(data));
            var closed = f.close();
            if (!wrote || !closed) {
                this._log("save: write/close failed for " + f.fsName);
                return false;
            }
            return true;
        } catch (e) {
            this._log("save failed: " + e.message);
            return false;
        }
    },

    /**
     * Debug logger — writes to the ExtendScript console when debug is enabled.
     * @param {string} msg - Message to log.
     */
    _log: function (msg) {
        if (BRE.Config && BRE.Config.debug) {
            $.writeln("[BRE] Storage." + msg);
        }
    }
};
