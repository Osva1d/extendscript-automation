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

        // A Zünd run invalidates any existing Summa output (the artboard
        // recompute drops the feed and the Summa marks would no longer be
        // outermost — an OPOS requirement). Remove it BEFORE measuring bounds,
        // otherwise the stale Summa marks/bar would inflate the measurement and
        // push the Zünd marks away from the artwork. Warning surfaces with the
        // other render warnings after the run.
        var summaInvalidated = (res.mode === "ZUND") && draw.removeSummaOutput();

        var bounds = draw.getBounds(res);
        if (!bounds) {
            alert(ZSM.L.ERR_NO_SEL);
            return;
        }

        var geo = ZSM.Core.calculateAll(res, bounds);
        if (summaInvalidated) geo.warnings.push(ZSM.L.WARN_SUMMA_REMOVED);
        draw.render(geo, res);

    } catch (e) {
        // e.line is undefined for non-Error throws — append only when present.
        alert(ZSM.L.ERR_CRITICAL + e.message + (e.line ? " (line " + e.line + ")" : ""));
    } finally {
        // Always restore layer locks, even if render throws
        if (app.documents.length > 0) draw.endSession();
    }
})(ZSM);
