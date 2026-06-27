// ------------------------------------------------------------------------
// Module: BRE.Config — Configuration
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "3.0.0",
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
        dialogMargins: 20,
        dialogSpacing: 12,
        panelMargins: 15,
        panelSpacing: 10
    },

    presetSearchPatterns: ["High Quality", "Tisková kvalita"],

    artboardRange: "",

    defaultNamingPattern: "{n}_{template}",

    placeholders: {
        N: "{n}",
        TEMPLATE: "{template}",
        SOURCE: "{source}"
    }
};

BRE.Config.ui.title = BRE.Config.scriptName + " v" + BRE.Config.version;
