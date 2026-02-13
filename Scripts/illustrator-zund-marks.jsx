/*
 * ===========================================================================
 * Script:      Illustrator Zund Marks
 * Version:     10.0.0
 * Author:      Osva1d
 * Updated:     2026-02-13
 *
 * Description:
 *   Registry marks generator for ECHO/ZUND Board Workflow.
 * ===========================================================================
 */

#target illustrator

function main() {
    if (app.documents.length === 0) {
        alert("Není otevřený žádný dokument.");
        return;
    }

    var doc = app.activeDocument;

    try {
        // =====================================================================
        //  NASTAVENÍ (ECHO/ZUND Board Workflow)
        // =====================================================================
        var CFG = {
            MARK_DIAMETER: 5,        // Průměr značky (mm)
            GAP_GRAPHIC: 10,       // Mezera: Grafika -> Značka (mm)
            GAP_EDGE: 10,          // Mezera: Značka -> Okraj média (mm)
            MAX_DIST: 500,         // Max vzdálenost mezi značkami (mm)
            ORIENT_GAP: 100,       // Mezera pro orientační bod (mm)
            CUT_COLOR_NAME: "Cut"  // Název spot barvy pro přesun do vrstvy CUT
        };
        // =====================================================================

        // 0. VALIDACE BAREV
        try {
            doc.spots.getByName(CFG.CUT_COLOR_NAME);
        } catch (e) {
            // Pouze upozornění, neblokuje běh (uživatel možná barvu teprve vytvoří)
            // alert("Upozornění: Barva '" + CFG.CUT_COLOR_NAME + "' nebyla v dokumentu nalezena.");
        }

        // --- PŘEPOČET JEDNOTEK (mm -> pt) ---
        var mm2pt = 2.834645;
        var markRadiusPt = (CFG.MARK_DIAMETER / 2) * mm2pt;
        var paddingPt = (CFG.GAP_GRAPHIC + CFG.MARK_DIAMETER + CFG.GAP_EDGE) * mm2pt;
        var markOffsetPt = (CFG.GAP_EDGE + (CFG.MARK_DIAMETER / 2)) * mm2pt;
        var orientDistPt = (CFG.ORIENT_GAP + CFG.MARK_DIAMETER) * mm2pt;
        var maxDistPts = CFG.MAX_DIST * mm2pt;

        // 1. PŘÍPRAVA (Unlock & Measure)
        unlockAllLayers(doc);
        doc.selection = null;
        app.executeMenuCommand('unlockAll');
        app.executeMenuCommand('selectall');
        
        var sel = doc.selection;
        if (sel.length === 0) {
            alert("Dokument je prázdný.");
            return;
        }

        var bounds = getSmartBounds(sel);
        doc.selection = null; 

        if (!bounds) {
            alert("Nepodařilo se zaměřit grafiku.");
            return;
        }

        // 2. NASTAVENÍ ARTBOARDU
        var abLeft = bounds[0] - paddingPt;
        var abTop = bounds[1] + paddingPt;
        var abRight = bounds[2] + paddingPt;
        var abBottom = bounds[3] - paddingPt;

        var newRect = [abLeft, abTop, abRight, abBottom];
        doc.artboards[0].artboardRect = newRect;

        // 3. PŘESUN VRSTEV
        var layerReg = getOrCreateLayer(doc, "REGMARKS");
        var layerCut = getOrCreateLayer(doc, "CUT");
        
        layerReg.zOrder(ZOrderMethod.BRINGTOFRONT);
        layerCut.zOrder(ZOrderMethod.BRINGTOFRONT);
        layerCut.move(layerReg, ElementPlacement.PLACEAFTER);
        
        processCutPaths(doc, layerCut, CFG.CUT_COLOR_NAME);

        // 4. VÝPOČET A VYKRESLENÍ ZNAČEK
        doc.activeLayer = layerReg;
        var regColor = getRegistrationColor();

        // Středy značek (odsazené od kraje plátna)
        var xL = newRect[0] + markOffsetPt;
        var xR = newRect[2] - markOffsetPt;
        var yT = newRect[1] - markOffsetPt;
        var yB = newRect[3] + markOffsetPt;

        var pLB = [xL, yB]; 
        var pLT = [xL, yT];
        var pRT = [xR, yT];
        var pRB = [xR, yB];

        // A) 4 Rohy
        drawCircle(doc, pLB[0], pLB[1], markRadiusPt, regColor);
        drawCircle(doc, pLT[0], pLT[1], markRadiusPt, regColor);
        drawCircle(doc, pRT[0], pRT[1], markRadiusPt, regColor);
        drawCircle(doc, pRB[0], pRB[1], markRadiusPt, regColor);

        // B) Průběžné značky
        if (CFG.MAX_DIST < 9999) {
            drawIntermediate(doc, pLB, pLT, maxDistPts, markRadiusPt, regColor);
            drawIntermediate(doc, pLT, pRT, maxDistPts, markRadiusPt, regColor);
            drawIntermediate(doc, pRT, pRB, maxDistPts, markRadiusPt, regColor);
            drawIntermediate(doc, pRB, pLB, maxDistPts, markRadiusPt, regColor);
        }

        // C) 5. Orientační značka (u pLB směrem doprava)
        drawCircle(doc, pLB[0] + orientDistPt, pLB[1], markRadiusPt, regColor);

        doc.selection = null;

    } catch (e) {
        alert("Chyba při běhu skriptu:\n" + e);
    }
}

// --- FUNKCE ---

function drawIntermediate(doc, p1, p2, maxDist, radius, color) {
    var dx = p2[0] - p1[0];
    var dy = p2[1] - p1[1];
    var dist = Math.sqrt(dx*dx + dy*dy);

    if (dist <= maxDist) return;

    var segments = Math.ceil(dist / maxDist);
    var stepX = dx / segments;
    var stepY = dy / segments;

    for (var i = 1; i < segments; i++) {
        var newX = p1[0] + (stepX * i);
        var newY = p1[1] + (stepY * i);
        drawCircle(doc, newX, newY, radius, color);
    }
}

function getSmartBounds(items) {
    var minX = Infinity, maxY = -Infinity, maxX = -Infinity, minY = Infinity;
    var found = false;
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.layer.name === "REGMARKS") continue;
        var b = null;
        if (item.typename === "GroupItem" && item.clipped) {
            b = getClippingPathBounds(item);
        }
        if (!b) b = item.visibleBounds;

        if (b) {
            if (b[0] < minX) minX = b[0];
            if (b[1] > maxY) maxY = b[1];
            if (b[2] > maxX) maxX = b[2];
            if (b[3] < minY) minY = b[3];
            found = true;
        }
    }
    if (!found) return null;
    return [minX, maxY, maxX, minY];
}

function getClippingPathBounds(groupItem) {
    try {
        var subItems = groupItem.pageItems;
        for (var j = 0; j < subItems.length; j++) {
            var sub = subItems[j];
            if ((sub.typename === "PathItem" || sub.typename === "CompoundPathItem") && sub.clipping) {
                return sub.geometricBounds;
            }
        }
    } catch (e) { return null; }
    return null;
}

function unlockAllLayers(doc) {
    for (var i = 0; i < doc.layers.length; i++) {
        doc.layers[i].locked = false;
        doc.layers[i].visible = true;
    }
}

function processCutPaths(doc, targetLayer, colorName) {
    var paths = doc.pathItems;
    var moveList = [];
    var colorNameLower = colorName.toLowerCase();
    for (var i = 0; i < paths.length; i++) {
        var p = paths[i];
        if (p.stroked && p.strokeColor.typename === "SpotColor") {
            if (p.strokeColor.spot.name.toLowerCase().indexOf(colorNameLower) !== -1) {
                moveList.push(p);
            }
        }
    }
    for (var j = 0; j < moveList.length; j++) {
        try { moveList[j].locked = false; moveList[j].move(targetLayer, ElementPlacement.PLACEATEND); } catch(e) {}
    }
}

function getOrCreateLayer(doc, name) {
    try {
        var layer = doc.layers.getByName(name);
        layer.locked = false; layer.visible = true;
        return layer;
    } catch (e) {
        var newLayer = doc.layers.add();
        newLayer.name = name; return newLayer;
    }
}

function drawCircle(doc, x, y, radius, color) {
    var circle = doc.activeLayer.pathItems.ellipse(y + radius, x - radius, radius * 2, radius * 2);
    circle.fillColor = color; circle.stroked = false;
}

function getRegistrationColor() {
    var regColor = new SpotColor();
    try { regColor.spot = app.activeDocument.spots.getByName("[Registration]"); regColor.tint = 100; } 
    catch(e) { var black = new CMYKColor(); black.black = 100; return black; }
    return regColor;
}

main();
