// Illustrator Batch Relink & Export Script (Revize 22)
// Zjednodušený relink a export s přehledným UI dialogem (všechna pole najednou).

#target illustrator

function main() {
    
    // --- 1. PŘÍPRAVA DIALOGU (Lepší UX/UI) ---
    
    var dialog = new Window("dialog", "Dávkové Zpracování PDF", undefined, {closeButton: true});
    dialog.orientation = "column";
    dialog.alignChildren = "fill";

    // Skupina pro vstupy souborů/slozek
    var inputPanel = dialog.add("panel", undefined, "1. Výběr Vstupů a Složek");
    inputPanel.orientation = "column";
    inputPanel.alignChildren = ["fill", "top"];
    
    // Funkce pro vytvoření zarovnaného pole
    function addFileSelectionGroup(parent, labelText, defaultText, isFolder, fileExtension) {
        var group = parent.add("group");
        group.alignChildren = ["left", "center"];
        
        group.add("statictext", [0, 0, 150, 20], labelText + ":");
        var pathField = group.add("edittext", [0, 0, 300, 20], defaultText);
        var button = group.add("button", undefined, "Vybrat...");
        
        button.onClick = function() {
            var selected;
            if (isFolder) {
                selected = Folder.selectDialog("Vyberte složku:");
            } else {
                selected = File.openDialog("Vyberte soubor:", fileExtension);
            }
            if (selected) { pathField.text = decodeURI(selected.fsName); }
        }
        return pathField;
    }

    // Šablona
    var templatePath = addFileSelectionGroup(inputPanel, "Šablona (.ai)", "Cesta k souboru šablony...", false, "*.ai");
    
    // Zdrojová složka
    var sourcePath = addFileSelectionGroup(inputPanel, "Zdrojová složka (PDF)", "Cesta ke složce s PDF...", true);
    
    // Výstupní složka
    var outputPath = addFileSelectionGroup(inputPanel, "Výstupní složka", "Cesta pro uložení exportů...", true);


    // Skupina pro konfiguraci
    var configPanel = dialog.add("panel", undefined, "2. Konfigurace Exportu");
    configPanel.orientation = "column";
    configPanel.alignChildren = ["fill", "top"];

    // Výstupní prefix
    var prefixGroup = configPanel.add("group");
    prefixGroup.add("statictext", [0, 0, 150, 20], "Prefix výstupního souboru:");
    var prefixInput = prefixGroup.add("edittext", [0, 0, 100, 20], "arch_");

    // PDF Preset
    var presetGroup = configPanel.add("group");
    presetGroup.add("statictext", [0, 0, 150, 20], "Název PDF Presetu:");
    var presetInput = presetGroup.add("edittext", [0, 0, 200, 20], "[Tisková kvalita]"); 
    
    // Tlačítka
    var buttonGroup = dialog.add("group");
    buttonGroup.add("button", undefined, "Spustit", {name: "ok"});
    buttonGroup.add("button", undefined, "Zrušit", {name: "cancel"});

    // Zobrazení dialogu a kontrola zrušení
    if (dialog.show() == 2) {
        alert("Skript zrušen uživatelem.");
        return;
    }
    
    // --- 2. VALIDACE A PŘÍPRAVA DAT ---
    
    var templateFile = new File(templatePath.text);
    var sourceFolder = new Folder(sourcePath.text);
    var outputFolder = new Folder(outputPath.text);
    var prefix = prefixInput.text;
    var preset = presetInput.text;

    if (!templateFile.exists || !templateFile.name.match(/\.ai$/i)) {
        alert("Chyba: Neplatná šablona AI."); return;
    }
    if (!sourceFolder.exists) {
        alert("Chyba: Zdrojová složka neexistuje."); return;
    }
    if (!outputFolder.exists) {
        alert("Chyba: Výstupní složka neexistuje."); return;
    }
    if (preset === "") {
        alert("Chyba: Název PDF Presetu nesmí být prázdný."); return;
    }

    var pdfFiles = sourceFolder.getFiles("*.pdf");
    
    if (pdfFiles.length === 0) {
        alert("Ve vybrané složce nebyly nalezeny žádné PDF soubory.");
        return;
    }
    
    // --- 3. PROCESNÍ SMYČKA ---
    
    var successCount = 0;
    var errorCount = 0;
    var errors = [];
    var totalFiles = pdfFiles.length;
    
    // Progress Bar pro hlášení
    var progressDialog = new Window("palette", "Zpracování souborů...", undefined, {closeButton: false});
    progressDialog.orientation = "column";
    progressDialog.alignChildren = ["fill", "top"];
    var statusText = progressDialog.add("statictext", undefined, "Připravuji...");
    var progressBar = progressDialog.add("progressbar", [0, 0, 400, 10], 0, totalFiles);
    progressDialog.show();
    
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    var doc = null;

    for (var i = 0; i < totalFiles; i++) {
        var currentFile = pdfFiles[i];
        var sourceFileName = decodeURI(currentFile.name);
        
        statusText.text = "Zpracovávám: " + sourceFileName + " (" + (i + 1) + " z " + totalFiles + ")";
        progressBar.value = i;
        progressDialog.update(); 
        
        try {
            // 1. Otevřít šablonu
            doc = app.open(templateFile);
            var links = doc.placedItems;
            
            if (links.length === 0) {
                 doc.close(SaveOptions.DONOTSAVECHANGES);
                 throw new Error("V šabloně nebyly nalezeny propojené objekty.");
            }
            
            var relinked = false;
            
            // 2. Relinkovat
            for (var j = 0; j < links.length; j++) {
                var currentLink = links[j];
                
                if (currentLink.typename === "PlacedItem" && currentLink.file) {
                    currentLink.relink(currentFile);
                    
                    // Nastavení stránky (zachovává původní číslo stránky z šablony, pokud není definováno)
                    if (currentLink.pageNumber !== undefined && currentLink.pageNumber < 1) {
                         currentLink.pageNumber = 1; 
                    }
                    relinked = true;
                }
            }
            
            if (!relinked) {
                 doc.close(SaveOptions.DONOTSAVECHANGES);
                 throw new Error("Žádné linked objekty nebyly nalezeny k relinkování.");
            }
            
            // 3. Uložit PDF
            var outputName = prefix + sourceFileName.replace(/\.pdf$/i, "") + ".pdf";
            var outputFile = new File(outputFolder.fsName + "/" + outputName);
            
            var pdfSaveOpts = new PDFSaveOptions();
            
            try {
                // Pokusí se použít zadaný preset
                pdfSaveOpts.pDFPreset = preset;
            } catch (e) {
                // Pokud preset selže, použije se záložní bezpečné nastavení
                pdfSaveOpts.compatibility = PDFCompatibility.ACROBAT7;
                pdfSaveOpts.preserveEditability = false;
                errors.push(sourceFileName + ": PDF Preset '" + preset + "' nebyl nalezen. Použito záložní nastavení.");
            }

            pdfSaveOpts.artboardRange = "";  
            pdfSaveOpts.saveMultipleArtboards = true;
            
            doc.saveAs(outputFile, pdfSaveOpts);
            
            // 4. Zavřít
            doc.close(SaveOptions.DONOTSAVECHANGES);
            doc = null; 
            
            successCount++;
            
        } catch (e) {
            
            errorCount++;
            errors.push(sourceFileName + ": Chyba při zpracování (" + e.message + ")"); 
            
            try {
                if (doc) {
                    doc.close(SaveOptions.DONOTSAVECHANGES);
                    doc = null;
                }
            } catch (closeError) {}
        }
    }
    
    // --- 4. FINÁLNÍ ZPRÁVA ---
    
    progressBar.value = totalFiles;
    progressDialog.close();

    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;

    var summaryMessage = "Zpracování dokončeno!\n\n" +
                         "Úspěšně zpracováno: " + successCount + "\n" +
                         "Chyby: " + errorCount;
    
    if (errorCount > 0) {
        summaryMessage += "\n\nDetaily chyb:\n" + errors.join("\n");
    }

    alert(summaryMessage);
}

// Spustit skript
try {
    main();
} catch (e) {
    app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
    alert("Kritická chyba: " + e.message + "\n\nŘádek: " + e.line);
}