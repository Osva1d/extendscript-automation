// ------------------------------------------------------------------------
// Module: ZSM.Draw — DOM mutations: render(), beginSession(), movePaths()
// Part of: Illustrator Zund & Summa Marks
// Depends on: ZSM.Bounds, ZSM.Config, ZSM.Core, ZSM.Utils
// ------------------------------------------------------------------------
var ZSM = ZSM || {};

ZSM.Draw = {
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
            // Nothing is changed unless the whole geometry is usable. A
            // non-finite mark used to be skipped silently — an incomplete mark
            // set is worse than none.
            if (!this._geometryIsFinite(geo, s)) {
                ZSM.Utils.error(ZSM.L.ERR_GEOMETRY_INVALID);
                return;
            }
            // Nor when marks would print as one shape or partly off the
            // artboard. With the defaults the orientation mark lands on the
            // bottom-right corner mark for 85–95 mm wide artwork, and nothing
            // said so (review K7).
            var conflict = ZSM.Core.findMarkConflict(geo, s);
            if (conflict) {
                var conflictMsg = { overlap: ZSM.L.ERR_MARKS_OVERLAP, orient: ZSM.L.ERR_MARKS_ORIENT,
                                    outside: ZSM.L.ERR_MARKS_OUTSIDE }[conflict.type];
                ZSM.Utils.error(ZSM.L.format(conflictMsg, Math.round(conflict.dist * 10) / 10,
                    (s.mode === "SUMMA") ? s.markSizeS : s.markSizeZ));
                return;
            }

            // 0. Deselect all — removing or reordering items/layers while
            //    Illustrator holds references to selected objects can crash
            //    at C++ level. Clearing selection first prevents this.
            try { doc.selection = null; } catch (ds) {}

            // Layers this run had to unhide to write into (reported at the
            // end) and output objects that failed to draw. A hidden layer
            // rejects writes exactly like a locked one, so both used to fail
            // silently — a re-run with Regmarks hidden deleted the old marks
            // and drew none.
            var unhidden = [];
            var drawFailures = 0;

            // 1. Resize artboard (Auto-fit mode only). This is the FIRST change
            //    of the run: if Illustrator refuses the rectangle (wider or
            //    taller than ~16 300 pt: "CoOA"/"MRAP", measured) the document
            //    is still untouched. The old |coordinate| > 16383 check never
            //    fired — no canvas coordinate gets that large — and the refusal
            //    surfaced as a generic error after the Summa output was gone.
            if (!s.useArtboardBounds) {
                var activeIdx = doc.artboards.getActiveArtboardIndex();
                // The artboard change gets an undo step of its own. Made in
                // the same step as other edits, Undo does not revert it
                // (measured: the layers came back, the artboard stayed
                // enlarged); fenced by redraws it reverts on its own.
                try { app.redraw(); } catch (rdA) {}
                try {
                    doc.artboards[activeIdx].artboardRect = geo.ab;
                    try { app.redraw(); } catch (rdB) {}
                } catch (abErr) {
                    ZSM.Utils.log("render: artboardRect refused — " + abErr.message);
                    var sfAb = ZSM.Utils.getEffectiveSF(s);
                    ZSM.Utils.error(ZSM.L.format(ZSM.L.ERR_ARTBOARD_TOO_LARGE,
                        Math.round(ZSM.Utils.pt2mm(geo.ab[2] - geo.ab[0]) * sfAb),
                        Math.round(ZSM.Utils.pt2mm(geo.ab[1] - geo.ab[3]) * sfAb)));
                    return;
                }
            }

            // 2. Prepare Regmarks layer — mode-specific sublayers.
            //    Each mode draws into its own sublayer ("Zünd" / "Summa")
            //    so running one mode does not destroy the other's marks.
            //    This supports the intended workflow: run ZUND first,
            //    then run SUMMA second — both sets of marks coexist.
            var reg = this.getLay(ZSM.Config.layerRegmarks, unhidden);

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
            if (s.mode === "ZUND") {
                if (zundSub) {
                    try { zundSub.locked = false; zundSub.visible = true; } catch (e) {}
                    try { zundSub.remove(); didRemoveSub = true; } catch (e) {}
                }
                // A Zünd run invalidates any existing Summa output (artboard
                // recompute + OPOS-outermost violation — see removeSummaOutput).
                // Removed here, after the new artboard was accepted; the bounds
                // measurement already left it out.
                if (this.removeSummaOutput()) {
                    geo.warnings.push(ZSM.L.WARN_SUMMA_REMOVED);
                    summaSub = null;
                    didRemoveSub = true;
                }
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
                var routes = [];
                for (var i = 0; i < s.layers.length; i++) {
                    var layDef = s.layers[i];
                    if (layDef.name && layDef.color && layDef.color !== "") {
                        // [Registration] prints on every separation, so it can
                        // never identify cut paths. Routing by it moved trim
                        // marks and other tools' marks onto the cut layer in an
                        // English Illustrator, and matched nothing under a
                        // localized swatch name. Skip the row and say why.
                        if (layDef.color === "[Registration]" || layDef.color === this.getRegistrationName()) {
                            geo.warnings.push(ZSM.L.format(ZSM.L.WARN_REG_ROUTING, layDef.name));
                            continue;
                        }
                        // "l_" prefix keeps user layer names like "toString"
                        // from colliding with inherited Object.prototype members.
                        if (seenTargets["l_" + layDef.name]) continue; // dedupe
                        seenTargets["l_" + layDef.name] = true;

                        var targetLay = this.getLay(layDef.name, unhidden);
                        // Guard against self-move (would happen if getLay
                        // resolved to the same Layer instance as refLayer,
                        // e.g. on the first iteration when targetLay is
                        // somehow Regmarks, or with hand-edited presets).
                        if (targetLay !== refLayer) {
                            try { targetLay.move(refLayer, ElementPlacement.PLACEAFTER); }
                            catch (mvErr) { ZSM.Utils.log("layer move failed: " + mvErr.message); }
                        }
                        refLayer = targetLay;
                        routes.push({ name: layDef.name, color: layDef.color, layer: targetLay });
                    }
                }

                // All rows in ONE pass over the document (was one per row).
                var routed = this.movePaths(routes);
                for (var ri = 0; ri < routes.length; ri++) {
                    var st = routed[ri];
                    var leftInPlace = st.clipped + st.blocked;
                    if (st.moved === 0 && st.mixed === 0 && leftInPlace === 0) {
                        geo.warnings.push(ZSM.L.format(ZSM.L.ERR_COLOR_MISSING, routes[ri].name, routes[ri].color));
                    }
                    if (st.mixed > 0) {
                        geo.warnings.push(ZSM.L.format(ZSM.L.WARN_MIXED_PAINT, routes[ri].color, st.mixed));
                    }
                    if (leftInPlace > 0) {
                        geo.warnings.push(ZSM.L.format(ZSM.L.WARN_PATHS_SKIPPED,
                            routes[ri].name, routes[ri].color, st.clipped, st.blocked));
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

            var marksZ = geo.marksZ;
            for (var z = 0; z < marksZ.length; z++) {
                var m = marksZ[z];
                try {
                    var circle = modeSub.pathItems.ellipse(m.cy + rZ, m.cx - rZ, rZ * 2, rZ * 2);
                    circle.fillColor     = col;
                    circle.fillOverprint = true;
                    circle.stroked       = false;
                } catch (e) {
                    drawFailures++;
                    ZSM.Utils.log("render: failed to draw Zünd mark at index " + z);
                }
            }

            // 5. Draw Summa marks (squares)
            var sSize = (Number(s.markSizeS) || 3.0) / sf;
            var rS   = ZSM.Utils.mm2pt(sSize / 2);

            var marksS = geo.marksS;
            for (var sm = 0; sm < marksS.length; sm++) {
                var m = marksS[sm];
                try {
                    var sq = modeSub.pathItems.rectangle(m.cy + rS, m.cx - rS, rS * 2, rS * 2);
                    sq.fillColor     = col;
                    sq.fillOverprint = true;
                    sq.stroked       = false;
                } catch (e) {
                    drawFailures++;
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
                    drawFailures++;
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
                drawFailures += this._drawTrimTopLevel(geo.red, geo.warnings);
            } else if (s.mode === "SUMMA") {
                this._removeTrimLayer(geo.warnings);
            }

            // 7b. Normal mode only — name the artwork (bottom) layer "Graphics".
            //     Skipped in marks-only (user's layers are left untouched).
            if (!s.marksOnly) {
                // Assumption: the bottom-most layer is the user's artwork layer.
                // A HIDDEN bottom layer is not artwork that prints (a template,
                // a customer proof, an old version) — leave it exactly as it is.
                // It used to be renamed Graphics and made visible, i.e. printed.
                var gfxLayer = doc.layers[doc.layers.length - 1];
                if (gfxLayer.name !== ZSM.Config.layerRegmarks && !ZSM.Bounds.isArtifactLayer(gfxLayer)
                    && gfxLayer.visible) {
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

            if (unhidden.length > 0) {
                geo.warnings.push(ZSM.L.format(ZSM.L.WARN_LAYERS_UNHIDDEN, unhidden.join(", ")));
            }

            // A mark that failed to draw leaves a sheet the cutter cannot
            // register — that is an ERROR, not a debug-log line. Non-fatal
            // notices (missing colour → fallback, unmatched layer colour,
            // unhidden layers) ride along; on their own they are a WARNING.
            if (drawFailures > 0) {
                var failMsg = ZSM.L.format(ZSM.L.ERR_MARKS_FAILED, drawFailures);
                if (geo.warnings.length > 0) failMsg += "\n\n" + geo.warnings.join("\n");
                ZSM.Utils.error(failMsg);
            } else if (geo.warnings.length > 0) {
                ZSM.Utils.warn(geo.warnings.join("\n"));
            }
            app.redraw();

        } catch (e) {
            ZSM.Utils.error(ZSM.L.format(ZSM.L.ERR_RENDER_CRITICAL, e.message));
        }
    },

    /**
     * True if every coordinate the render would use is a finite number.
     * @param {Object} geo - Geometry from ZSM.Core.calculateAll().
     * @param {Object} s   - Settings (useArtboardBounds decides if geo.ab is used).
     * @returns {boolean}
     * @private
     */
    _geometryIsFinite: function (geo, s) {
        var ok = function (v) { return typeof v === "number" && isFinite(v); };
        var lists = [geo.marksZ || [], geo.marksS || []];
        for (var l = 0; l < lists.length; l++) {
            for (var i = 0; i < lists[l].length; i++) {
                if (!ok(lists[l][i].cx) || !ok(lists[l][i].cy)) return false;
            }
        }
        if (geo.barS && !(ok(geo.barS.x1) && ok(geo.barS.x2) && ok(geo.barS.y) && ok(geo.barS.w))) return false;
        var red = geo.red || [];
        for (var r = 0; r < red.length; r++) {
            if (!(ok(red[r].x1) && ok(red[r].y1) && ok(red[r].x2) && ok(red[r].y2) && ok(red[r].w))) return false;
        }
        if (!s.useArtboardBounds) {
            for (var a = 0; a < 4; a++) {
                if (!ok(geo.ab[a])) return false;
            }
        }
        return true;
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
     * @param {Array} warnings - Optional; receives a notice when the layer
     *                           holds objects the script did not create.
     * @returns {number} Trim lines that could not be drawn.
     * @private
     */
    _drawTrimTopLevel: function (redLines, warnings) {
        if (!redLines || redLines.length === 0) return 0;
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
            // Refresh: drop only the script's own lines — foreign content stays.
            if (this._clearOwnTrimLines(trimLayer) > 0 && warnings) warnings.push(ZSM.L.WARN_TRIM_FOREIGN);
            try { app.redraw(); } catch (rd) {}
        } else {
            try {
                trimLayer = doc.layers.add();
                trimLayer.name = ZSM.Config.layerTrim;
                try { app.redraw(); } catch (rd2) {}   // commit layer creation
            } catch (eAdd) {
                ZSM.Utils.log("trim: top-level layer add failed — " + eAdd.message);
                return redLines.length;
            }
        }
        return this._paintRedLines(trimLayer, redLines);
    },

    /**
     * Removes the top-level "Trim" layer if present. Called when a SUMMA run
     * has trim lines OFF — stale lines from a previous run sit at outdated
     * artboard edges. Same C++ crash guard as _drawTrimTopLevel: deselect,
     * move activeLayer OFF the layer being removed, commit, then remove.
     * Only the script's own lines are removed; a layer that still holds
     * foreign content (a user's own "Trim" layer) is kept as it was found.
     * @param {Array} warnings - Optional; receives a notice when kept.
     * @private
     */
    _removeTrimLayer: function (warnings) {
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
            var wasVisible = trimLayer.visible, wasLocked = trimLayer.locked;
            trimLayer.locked = false; trimLayer.visible = true;
            if (this._clearOwnTrimLines(trimLayer) > 0) {
                trimLayer.visible = wasVisible;   // a user's layer — leave it as found
                trimLayer.locked  = wasLocked;
                if (warnings) warnings.push(ZSM.L.WARN_TRIM_FOREIGN);
            } else {
                trimLayer.remove();
            }
            try { app.redraw(); } catch (rd) {}
        } catch (e4) {
            ZSM.Utils.log("trim: stale layer remove failed — " + e4.message);
        }
    },

    /**
     * Removes the Summa output a Zünd run would invalidate: the Regmarks/Summa
     * sublayer (marks + OPOS bar) and the top-level Trim layer. The Zünd run
     * recomputes the artboard without feed and places its marks outside the
     * measured content — an existing Summa set would end up INSIDE the Zünd
     * circles (OPOS requires the Summa marks to be outermost) with trim lines
     * stranded at the old artboard edges. Removing the stale set and telling
     * the operator to re-run SUMMA last is the only safe resolution.
     *
     * Touches ONLY our own output layers (Regmarks/Summa, Trim) — never user
     * artwork or mapped cut layers. The main flow calls this BEFORE measuring
     * bounds so the Zünd marks land exactly where a clean run would put them;
     * render() calls it again defensively (second call is a no-op).
     *
     * @returns {boolean} True if any Summa output was removed.
     */
    removeSummaOutput: function () {
        var removed = false;
        try {
            var doc = app.activeDocument;
            var reg = null;
            try { reg = doc.layers.getByName(ZSM.Config.layerRegmarks); } catch (e0) {}
            if (reg) {
                var summaSub = null;
                try { summaSub = reg.layers.getByName("Summa"); } catch (e1) {}
                if (summaSub) {
                    // Held selection refs can crash the remove at C++ level.
                    try { doc.selection = null; } catch (ds) {}
                    // `.remove()` on a locked/hidden sublayer can crash AI.
                    try { summaSub.locked = false; summaSub.visible = true; } catch (e2) {}
                    try {
                        summaSub.remove();
                        removed = true;
                        try { app.redraw(); } catch (rd) {}
                    } catch (e3) {
                        ZSM.Utils.log("removeSummaOutput: sublayer remove failed — " + e3.message);
                    }
                }
            }
            // The Trim layer belongs to the Summa sheet layout — remove it only
            // together with that layout, never on its own.
            if (removed) this._removeTrimLayer();
        } catch (e) {}
        return removed;
    },

    /**
     * Draws red trim lines as direct children of the given layer.
     * @param {Layer} layer    - Host layer.
     * @param {Array} redLines - geo.red entries ({x1,y1,x2,y2,w}).
     * @returns {number} Lines that could not be drawn.
     * @private
     */
    _paintRedLines: function (layer, redLines) {
        var redColor = new CMYKColor();
        redColor.magenta = 100;
        redColor.yellow  = 100;
        var failed = 0;
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
                line.note        = ZSM.Config.trimNote;
            } catch (e) {
                failed++;
                ZSM.Utils.log("render: failed to draw trim line at index " + r);
            }
        }
        return failed;
    },

    /**
     * Removes the script's own trim lines from a layer and leaves everything
     * else: a user's own layer called "Trim" (a pre-separated cut layer, say)
     * used to be cleared wholesale. Own = stamped with ZSM.Config.trimNote, or
     * an unmarked line from an older version (see _isOwnTrimLine).
     * @param {Layer} layer - The Trim layer (unlocked and visible).
     * @returns {number} Items and sublayers left that are not the script's.
     * @private
     */
    _clearOwnTrimLines: function (layer) {
        var foreign = 0;
        try {
            var items = layer.pageItems;
            for (var i = items.length - 1; i >= 0; i--) {
                if (!this._isOwnTrimLine(items[i])) { foreign++; continue; }
                try { items[i].remove(); } catch (e) { foreign++; }
            }
            foreign += layer.layers.length;
        } catch (e) {
            ZSM.Utils.log("_clearOwnTrimLines: " + e.message);
        }
        return foreign;
    },

    /**
     * True for a trim line drawn by this script: stamped with the trim note,
     * or — drawn before the stamp existed — exactly what _paintRedLines draws:
     * an open two-point horizontal path, no fill, stroked C0 M100 Y100 K0.
     * @param {PageItem} item
     * @returns {boolean}
     * @private
     */
    _isOwnTrimLine: function (item) {
        try {
            if (item.note === ZSM.Config.trimNote) return true;
            if (item.typename !== "PathItem" || item.filled || !item.stroked || item.closed) return false;
            var pp = item.pathPoints;
            if (pp.length !== 2 || pp[0].anchor[1] !== pp[1].anchor[1]) return false;
            var c = item.strokeColor;
            return c.typename === "CMYKColor" && Math.round(c.cyan) === 0 && Math.round(c.magenta) === 100
                && Math.round(c.yellow) === 100 && Math.round(c.black) === 0;
        } catch (e) {
            return false;
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
     * The first mapping-row layer name that is one of the script's own output
     * layers (Regmarks, Trim), or null. The script rewrites those layers'
     * content, so paths routed there were deleted in the same run. Rows the
     * run ignores (no name or colour; marks-only mode) don't count.
     * @param {Object} s - Settings.
     * @returns {string|null}
     */
    reservedMappingName: function (s) {
        if (!s || s.marksOnly || !s.layers) return null;
        for (var i = 0; i < s.layers.length; i++) {
            var n = s.layers[i].name;
            if (n && s.layers[i].color && (n === ZSM.Config.layerRegmarks || n === ZSM.Config.layerTrim)) return n;
        }
        return null;
    },

    /**
     * Gets an existing layer by name or creates it if it doesn't exist.
     * An existing HIDDEN layer is made visible: Illustrator rejects writes
     * into a hidden layer exactly like into a locked one ("Cannot modify a
     * layer that is locked", measured), so marks or moved paths would fail.
     * @param {string} name     - Layer name.
     * @param {Array}  unhidden - Optional collector; receives `name` when the
     *                            layer had to be made visible.
     * @returns {Layer} Illustrator Layer object.
     */
    getLay: function (name, unhidden) {
        var layer = null;
        try { layer = app.activeDocument.layers.getByName(name); } catch (e) { layer = null; }
        if (!layer) {
            layer = app.activeDocument.layers.add();
            layer.name = name;
            return layer;
        }
        if (!layer.visible) {
            layer.visible = true;
            if (unhidden) unhidden.push(name);
        }
        return layer;
    },

    /**
     * True if the item lives on (or under) a reserved output layer — Regmarks
     * (marks + their mode sublayers) or Trim. movePaths must never route FROM
     * these: the marks and trim lines legitimately share the user's spot colours
     * by design (e.g. white marks drawn in "Spot 1" alongside a "White" cut layer
     * also mapped to "Spot 1"). A colour match alone must not pull them onto a
     * cut layer, or a re-run would cannibalise the other mode's existing marks.
     * Walks the ancestor layer chain because marks sit on a SUBLAYER, so
     * item.layer is the sublayer (e.g. "Zünd"), not the top-level Regmarks.
     *
     * @param {PageItem} item - Path/compound to test.
     * @returns {boolean} True if on Regmarks/Trim (or a sublayer of them).
     * @private
     */
    _isOnReservedLayer: function (item) {
        try {
            var lay = item.layer;
            while (lay && lay.typename === "Layer") {
                if (lay.name === ZSM.Config.layerRegmarks || lay.name === ZSM.Config.layerTrim) return true;
                lay = lay.parent;
            }
            return false;
        } catch (e) {
            // Unreadable layer chain → treat as reserved (skip from routing).
            // Fail-closed matches isArtifactLayer's safe default for mutating
            // operations: better to leave an odd item in place than to risk
            // pulling a mark off Regmarks because its ancestry couldn't be read.
            return true;
        }
    },

    /**
     * Routes spot-coloured paths to their mapped layers in ONE pass over the
     * document. It used to rescan every path once per mapping row, with
     * several DOM reads per path each time — on a large document that
     * multiplied tens of thousands of DOM calls by the number of rows.
     *
     * A path is moved only when it is painted EXCLUSIVELY in its route's
     * colour; a path that also carries printable paint (see _hasOtherPaint)
     * stays with the artwork. Every matching path that stays behind is
     * counted, so the caller can tell the operator — a cut layer that
     * silently misses paths is a bad cut. Uses a snapshot to avoid
     * live-collection issues during iteration.
     *
     * @param {Array} routes - [{color: spot name (case-insensitive), layer: Layer}]
     * @returns {Array} Per route, same order: {moved, mixed, clipped, blocked} —
     *   paths moved; matching paths left in place because they also carry
     *   printable paint (mixed), sit inside a clipping mask or on an artifact
     *   layer (clipped), or could not be moved off a locked sublayer / hidden
     *   layer (blocked).
     */
    movePaths: function (routes) {
        var stats = [], byKey = {};
        for (var r = 0; r < routes.length; r++) {
            stats.push({ moved: 0, mixed: 0, clipped: 0, blocked: 0 });
            // "c_" prefix keeps colour names like "toString" from colliding
            // with inherited Object.prototype members. First row wins (the
            // dialog blocks two rows with the same colour).
            var key = "c_" + String(routes[r].color).toLowerCase();
            if (byKey[key] === undefined) byKey[key] = r;
        }
        // Route index of a path by its spot paint (stroke or fill), -1 if none.
        var routeOf = function (p) {
            var ri = -1, k;
            if (p.stroked && p.strokeColor.typename === "SpotColor") {
                k = byKey["c_" + p.strokeColor.spot.name.toLowerCase()];
                if (k !== undefined) ri = k;
            }
            if (p.filled && p.fillColor.typename === "SpotColor") {
                k = byKey["c_" + p.fillColor.spot.name.toLowerCase()];
                if (k !== undefined && (ri < 0 || k < ri)) ri = k;
            }
            return ri;
        };
        try {
            var doc = app.activeDocument;

            // --- 1. CompoundPathItems (move as atomic units) ---
            var compounds = doc.compoundPathItems;
            var cpSnap = [];
            for (var ci = 0; ci < compounds.length; ci++) cpSnap.push(compounds[ci]);

            for (var ci = 0; ci < cpSnap.length; ci++) {
                var cp = cpSnap[ci];
                if (cp.pathItems.length === 0) continue;

                // Match by first sub-path color (all sub-paths share the same
                // color). Colour first: only matching paths are worth the
                // checks below, and only they belong in the report.
                var first = cp.pathItems[0];
                var cri = routeOf(first);
                if (cri < 0) continue;
                if (this._isOnReservedLayer(cp)) continue;   // never route FROM marks/trim

                // Skip items on artifact layers — moving them could crash AI.
                // isArtifactLayer treats an unreadable layer name as artifact
                // (returns true) so a transient/broken layer item is skipped
                // rather than risked — the safe default for a mutating op.
                if (ZSM.Bounds.isArtifactLayer(cp.layer) || ZSM.Bounds.isInsideClippedGroup(cp)) {
                    stats[cri].clipped++;
                    continue;
                }
                if (this._hasOtherPaint(first, [routes[cri].color])) { stats[cri].mixed++; continue; }
                try {
                    cp.move(routes[cri].layer, ElementPlacement.PLACEATEND);
                    // Only cut-colour paint reaches this point, so the
                    // overprint cannot hit a printable fill or stroke.
                    for (var sp = 0; sp < cp.pathItems.length; sp++) {
                        if (cp.pathItems[sp].filled)  cp.pathItems[sp].fillOverprint   = true;
                        if (cp.pathItems[sp].stroked) cp.pathItems[sp].strokeOverprint = true;
                    }
                    stats[cri].moved++;
                } catch (e) {
                    stats[cri].blocked++;   // locked sublayer / hidden layer (see below)
                }
            }

            // --- 2. Standalone PathItems ---
            var items    = doc.pathItems;
            var snapshot = [];
            for (var i = 0; i < items.length; i++) snapshot.push(items[i]);

            for (var i = 0; i < snapshot.length; i++) {
                var item = snapshot[i];

                // Colour first (see the compound loop).
                var ri = routeOf(item);
                if (ri < 0) continue;

                // Never route FROM the marks (Regmarks) or Trim layers — they
                // legitimately share the user's spot colours (see _isOnReservedLayer).
                if (this._isOnReservedLayer(item)) continue;

                // Skip sub-paths of a CompoundPathItem — handled as a unit above
                var inCompound = false;
                try {
                    if (item.parent && item.parent.typename === "CompoundPathItem") inCompound = true;
                } catch (e) {}
                if (inCompound) continue;

                // Skip items on artifact layers — moving them could crash AI
                // (see compound-path loop above for the unreadable-name
                // rationale) — and items nested inside clipped groups — moving
                // them out would break the group structure and trigger MRAP
                // errors. Both are reported.
                if (ZSM.Bounds.isArtifactLayer(item.layer) || ZSM.Bounds.isInsideClippedGroup(item)) {
                    stats[ri].clipped++;
                    continue;
                }

                if (this._hasOtherPaint(item, [routes[ri].color])) { stats[ri].mixed++; continue; }
                try {
                    item.move(routes[ri].layer, ElementPlacement.PLACEATEND);
                    if (item.filled)  item.fillOverprint   = true;
                    if (item.stroked) item.strokeOverprint = true;
                    stats[ri].moved++;
                } catch (e) {
                    // A path on a locked sublayer or a hidden layer cannot be
                    // moved: "Target layer cannot be modified" (measured).
                    stats[ri].blocked++;
                }
            }
        } catch (e) {
            ZSM.Utils.log("movePaths error: " + e.message);
        }
        return stats;
    },

    /**
     * True if a path carries paint OTHER than the given spot colours: a
     * printable fill under a cut stroke (the typical sticker background shape
     * with a CutContour stroke), or a cut fill with a printable stroke. Moving
     * such a path to the cut layer puts its printable paint ABOVE the artwork,
     * and the overprint set there changes the print (rendered in AI 30.8.1:
     * the art underneath vanished, or changed colour with overprint on).
     * @param {PathItem} item  - Path to test (first sub-path of a compound).
     * @param {Array}    names - Spot color names (case-insensitive).
     * @returns {boolean}
     * @private
     */
    _hasOtherPaint: function (item, names) {
        var isCut = function (color) {
            if (color.typename !== "SpotColor") return false;
            var n = color.spot.name.toLowerCase();
            for (var i = 0; i < names.length; i++) {
                if (n === names[i].toLowerCase()) return true;
            }
            return false;
        };
        return (item.filled && !isCut(item.fillColor)) || (item.stroked && !isCut(item.strokeColor));
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
