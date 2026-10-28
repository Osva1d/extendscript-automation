// ------------------------------------------------------------------------
// Module: BRE.Config — Configuration
// Part of: Illustrator Batch Relink Export v3.0.0
// ------------------------------------------------------------------------

var BRE = BRE || {};

BRE.Config = {
    scriptName: "Batch Relink Export",
    version: "1.2.0",
    debug: false,

    // The window title; the dialogs' layout values live in BRE.UI.M.
    ui: {
        title: null
    },

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
