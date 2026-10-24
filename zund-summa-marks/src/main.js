// ------------------------------------------------------------------------
// Module: Entry point — IIFE, orchestration
// Part of: Illustrator Zund & Summa Marks
// Depends on: ZSM.Config, ZSM.Core, ZSM.Draw, ZSM.Storage, ZSM.UI, ZSM.Utils,
//             ZSM.DrawingScale (shared: the scale the document remembers)
// ------------------------------------------------------------------------
(function (ZSM) {
    var draw = ZSM.Draw;
    try {
        if (app.documents.length === 0) {
            alert(ZSM.L.ERR_NO_DOC);
            return;
        }

        // Pin the coordinate system to DOCUMENT — the one core.js (see
        // addSteps comment) and bounds.js (Math.max for top, Math.min for
        // bottom) are written for. Y grows upward in BOTH systems (measured,
        // docs/extendscript-engine-facts.md); ARTBOARD would only move the
        // origin to the artboard's top-left corner, so every coordinate the
        // script reads and writes would be off by that shift. The default is
        // DOCUMENT, but a previous script in the session could have switched
        // it. Wrapped in try/catch because CS6 throws on this assignment
        // (CoordinateSystem enum doesn't exist) — CS6 has only the document
        // system, so the skip is safe (and logged).
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

        // The drawing scale the document held when the run began (none = 1:1),
        // to tell whether the run changes it.
        var docScale = ZSM.DrawingScale.load(app.activeDocument) || 1;

        // Persist settings before rendering (so a crash doesn't lose the config).
        // Alert on failure but continue with the render — the user already
        // submitted the dialog, blocking the render because we cannot persist
        // would surprise them. The next run can re-save. Storage.save never
        // throws; it returns false on any open/write/close failure.
        if (!ZSM.Storage.save(resultWrapper)) {
            alert(ZSM.L.ERR_WRITE_SETTINGS_RUN);
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

        // A mapping row onto the script's own output layer (Regmarks, Trim)
        // would get its routed paths deleted in the same run — refuse before
        // anything in the document changes.
        var reserved = draw.reservedMappingName(res);
        if (reserved) {
            ZSM.Utils.error(ZSM.L.format(ZSM.L.ERR_RESERVED_LAYER, reserved));
            return;
        }

        // Unlock layers, set ruler origin. The geometry reads document
        // coordinates from the [0, 0] origin, so it is set before anything is
        // measured. After a run that drew it is NOT restored — a restored
        // custom origin would visually desync the rulers from the marks just
        // placed (accepted by design). A run refused before changing anything
        // promises "the document was not changed": it gives the operator's
        // origin back (below). The original is remembered here; a read that
        // fails only means there is nothing to give back.
        draw.beginSession();
        var origRuler = null;
        try {
            var ro = app.activeDocument.rulerOrigin;
            origRuler = [ro[0], ro[1]];
        } catch (eRoRead) {
            ZSM.Utils.log("rulerOrigin read failed — " + eRoRead.message);
        }
        var restoreRulerOrigin = function () {
            if (!origRuler) return;
            try {
                app.activeDocument.rulerOrigin = origRuler;
            } catch (eRoWrite) {
                ZSM.Utils.log("rulerOrigin restore failed — " + eRoWrite.message);
            }
        };
        app.activeDocument.rulerOrigin = [0, 0];

        // A Zünd run invalidates any existing Summa output (the artboard
        // recompute drops the feed and the Summa marks would no longer be
        // outermost — an OPOS requirement). ZSM.Bounds leaves it out of the
        // measurement and render() removes it once the new artboard is
        // accepted — it used to be deleted here, before anything was checked.
        var bounds = draw.getBounds(res);
        if (!bounds) {
            restoreRulerOrigin();
            ZSM.Utils.error(ZSM.L.ERR_NO_SEL);
            return;
        }

        var geo = ZSM.Core.calculateAll(res, bounds);
        // true = drew, false = refused with the document untouched, null = crashed
        // mid-draw (render has said so; the document may be partly changed).
        var drew = draw.render(geo, res);
        if (drew === false) restoreRulerOrigin();

        // The document remembers the scale for the next run — only when it
        // differs from what the document held (a document without a scale and
        // a run at 1:1 stays untouched) and only after a run that drew: a
        // refusal promises "the document was not changed". res.scaleN is the
        // dialog's validated field; it is never in the settings file.
        if (drew === true && res.scaleN !== docScale) {
            ZSM.DrawingScale.save(app.activeDocument, res.scaleN);
        }

    } catch (e) {
        // The canon's template (extendscript-ui-standards 12.2), as in
        // grommet-marks; e.line is undefined for non-Error throws — "?" then.
        alert(ZSM.L.format(ZSM.L.ERR_CRITICAL, e.message, String(e.line || "?")));
    } finally {
        // Always restore layer locks, even if render throws
        if (app.documents.length > 0) draw.endSession();
    }
})(ZSM);
