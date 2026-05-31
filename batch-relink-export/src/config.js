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
        labelWidth: 160,
        fieldWidth: 300,
        dropdownWidth: 200,
        namingWidth: 160,
        dialogMargins: 20,
        dialogSpacing: 15,
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
