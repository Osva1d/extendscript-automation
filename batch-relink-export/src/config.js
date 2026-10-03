// ------------------------------------------------------------------------
// Module: BRE.Config — Configuration
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "1.1.0",
    debug: false,

    ui: {
        title: null,
        labelWidth: 96,
        dialogWidth: 460,
        browseBtnWidth: 90,
        // Fields stretch (fill) to one shared right edge; this floor stops a
        // field from collapsing. The Browse button is capped (maximumSize) so
        // the row's slack flows into the field, not the button — that capping
        // is what makes fill behave (the earlier "fat button" symptom).
        fieldMinWidth: 180,
        // Natural width of the path, pattern and name-preview fields. Without
        // it a field is as wide as its text, so remembered paths widened the
        // dialog (753 px for the real job's paths instead of 460). 20 chars =
        // 176 px, under fieldMinWidth: fill decides the width, as when empty.
        fieldChars: 20,
        dialogMargins: 20,
        dialogSpacing: 12,
        panelMargins: 15,
        panelSpacing: 10
    },

    // High Quality Print in both languages. Its Czech name is [Kvalitní tisk];
    // [Tisková kvalita] is Press Quality (order in app.PDFPresetsList, engine-facts).
    presetSearchPatterns: ["High Quality", "Kvalitní tisk"],

    artboardRange: "",

    // {source} keeps two jobs made with the same template from sharing names.
    defaultNamingPattern: "{n}_{template}_{source}",

    placeholders: {
        N: "{n}",
        TEMPLATE: "{template}",
        SOURCE: "{source}"
    }
};

BRE.Config.ui.title = BRE.Config.scriptName + " v" + BRE.Config.version;
