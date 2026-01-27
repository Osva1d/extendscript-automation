/*
  Script: Automatizace pro ECHO/ZUND - Board Workflow (v9 - Commented)
  Popis: Vytváří ořezové značky, třídí vrstvy a upravuje velikost plátna.
*/

// @target illustrator

function main() {
    // Kontrola otevřeného dokumentu
    if (app.documents.length === 0) {
        alert("Není otevřený žádný dokument.");
        return;
    }

    var doc = app.activeDocument;

    // =========================================================================
    //  NASTAVENÍ - ZDE MŮŽETE MĚNIT PARAMETRY
    // =========================================================================
    
    // 1. VELIKOST ZNAČKY
    // Průměr registrační tečky v mm. Standard pro iEcho/Zund je 5-6mm.
    var markDiameterMm = 5;       
    
    // 2. POZICE ZNAČKY OD KRAJE MÉDIA (STŘED ZNAČKY)
    // Určuje, jak daleko bude střed značky od okraje papíru/řezu.
    // Příklad: Pokud chcete 10mm čistého místa a značka má poloměr 2.5mm,
    // nastavte zde 12.5 (10 + 2.5).
    var markFromEdgeMm = 12.5;    

    // 3. CELKOVÝ OKRAJ (PADDING)
    // O kolik mm se má zvětšit plátno na každou stranu od vaší grafiky.
    // Toto číslo musí být VĚTŠÍ než 'markFromEdgeMm'.
    // Rozdíl mezi 'totalPaddingMm' a 'markFromEdgeMm' určuje mezeru mezi grafikou a značkou.
    // Příklad: 25 - 12.5 = 12.5mm (vzdálenost středu značky od grafiky).
    var totalPaddingMm = 25;      
    
    // 4. PRŮBĚŽNÉ ZNAČKY (INTERMEDIATE MARKS)
    // Maximální vzdálenost mezi značkami v mm.
    // Pokud je strana delší než toto číslo, skript přidá další značky.
    // Nastavte např. 300 pro značku každých 30cm.
    // Nastavte 9000 pro vypnutí této funkce.
    var maxDistanceMm = 500; 

    // 5. ORIENTAČNÍ BOD (ASYMETRIE)
    // Vzdálenost 5. značky od startovního bodu (Levý dolní roh) směrem doprava.
    var orientationDistMm = 100;

    // 6. NÁZEV BARVY PRO OŘEZ
    // Skript hledá tahy (stroke) s touto přímou barvou a přesouvá je do vrstvy CUT.
    var spotColorName = "Cut";    

    // =========================================================================
    //  KONEC NASTAVENÍ - NÍŽE UŽ NENÍ TŘEBA ZASAHOVAT
    // =========================================================================

    var mm2pt = 2.834645;
    var padding = totalPaddingMm * mm2pt;
    var markOffset = markFromEdgeMm * mm2pt;
    var markRadius = (markDiameterMm * mm2pt) / 2;
    var orientDist = orientationDistMm * mm2pt;
    var maxDistPts = maxDistanceMm * mm2pt;

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
    var abLeft = bounds[0] - padding;
    var abTop = bounds[1] + padding;
    var abRight = bounds[2] + padding;
    var abBottom = bounds[3] - padding;

    var newRect = [abLeft, abTop, abRight, abBottom];
    doc.artboards[0].artboardRect = newRect;

    // 3. PŘESUN VRSTEV
    var layerReg = getOrCreateLayer(doc, "REGMARKS");
    var layerCut = getOrCreateLayer(doc, "CUT");
    
    layerReg.zOrder(ZOrderMethod.BRINGTOFRONT);
    layerCut.zOrder(ZOrderMethod.BRINGTOFRONT);
    layerCut.move(layerReg, ElementPlacement.PLACEAFTER);
    
    processCutPaths(doc, layerCut, spotColorName);

    // 4. VÝPOČET A VYKRESLENÍ ZNAČEK
    doc.activeLayer = layerReg;
    var regColor = getRegistrationColor();

    var rLeft = newRect[0];
    var rTop = newRect[1];
    var rRight = newRect[2];
    var rBottom = newRect[3];

    // Souřadnice pro značky (odsazené od kraje dovnitř)
    var xL = rLeft + markOffset;
    var xR = rRight - markOffset;
    var yT = rTop - markOffset;
    var yB = rBottom + markOffset;

    var pLB = [xL, yB]; // Start Point
    var pLT = [xL, yT];
    var pRT = [xR, yT];
    var pRB = [xR, yB];

    // A) 4 Rohy
    drawCircle(doc, pLB[0], pLB[1], markRadius, regColor);
    drawCircle(doc, pLT[0], pLT[1], markRadius, regColor);
    drawCircle(doc, pRT[0], pRT[1], markRadius, regColor);
    drawCircle(doc, pRB[0], pRB[1], markRadius, regColor);

    // B) Průběžné značky
    drawIntermediate(doc, pLB, pLT, maxDistPts, markRadius, regColor);
    drawIntermediate(doc, pLT, pRT, maxDistPts, markRadius, regColor);
    drawIntermediate(doc, pRT, pRB, maxDistPts, markRadius, regColor);
    drawIntermediate(doc, pRB, pLB, maxDistPts, markRadius, regColor);

    // C) 5. Orientační značka
    drawCircle(doc, pLB[0] + orientDist, pLB[1], markRadius, regColor);

    doc.selection = null;
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