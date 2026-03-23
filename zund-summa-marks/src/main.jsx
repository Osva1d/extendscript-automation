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
