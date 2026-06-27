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
        // macOS ScriptUI does not stretch a "fill" edittext that has a trailing
        // control (the Browse button) — the slack goes to the button instead.
        // So path rows use deterministic widths: field + button derived from
        // dialogWidth − margins − label, keeping all three rows aligned.
        browseBtnWidth: 90,
        pathFieldWidth: 184,
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
