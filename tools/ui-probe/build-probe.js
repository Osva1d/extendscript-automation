#!/usr/bin/env node
// ------------------------------------------------------------------------
// Script:      build-probe.js
// Version:     1.0.0
// Author:      Ladislav Osvald
// Updated:     2026-11-07
// Description: Measures a tool's real dialog without showing it. Takes the
//              built dist/*.jsx, redirects `new Window`, alert, confirm and
//              prompt to the harness, and writes a probe that creates its own
//              document, runs the tool, walks the states in
//              scenarios/<tool>.js and records the window size, the primary
//              button's position and every panel. The dialog ends as Storno,
//              so no preset file is written (settings checked by SHA on
//              2026-11-07). Refuses to run with any document open and closes
//              only the document it made.
// Usage:       node tools/ui-probe/build-probe.js <tool> [path/to/dist.jsx]
//              tools/ai-eval.sh -t 120 "<printed path>"
//              node tools/ui-probe/build-probe.js --report <tool>
//              Check tools/ai-eval.sh -e 'app.documents.length' on its own
//              first, and read the answer. <tool> is a folder name,
//              "specimen" for shared/tests/probes/specimen_ui.jsx, or
//              "ui-kit" for shared/tests/probes/ui_kit_dialog.jsx behind
//              the shared modules it is built from.
// ------------------------------------------------------------------------
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(os.tmpdir(), "ui-probe");
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC";
// The tool's namespace, cleared after the run: the engine keeps globals, and
// these hold the patched code until the tool's next real run replaces them.
const NAMESPACE = {
    "grommet-marks": "GM", "zund-summa-marks": "ZSM", "batch-relink-export": "BRE",
    "tile-export": "TE", "batch-text-edit": "BTE", specimen: "UI_SPECIMEN",
    "ui-kit": "UI_KIT_PROBE"
};

function fail(msg) {
    console.error("ERROR: " + msg);
    process.exit(1);
}

function report(tool) {
    const file = path.join(OUT, "result_" + tool + ".json");
    if (!fs.existsSync(file)) { fail("no result at " + file); }
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log("shows " + d.shows + ", alerts " + d.alerts.length + ", notes: " + JSON.stringify(d.notes));
    d.snaps.forEach(function (s) {
        const p = s.primary;
        console.log(s.label + ": " + s.size.join(" x ") + " (pref " + s.pref.join(" x ") + ", max " + s.max.join(" x ") + ")" +
            (p ? ", primary y " + p[1] + "-" + (p[1] + p[3]) : ""));
        s.panels.forEach(function (q) { console.log("    " + q[0] + ": " + q.slice(1).join(", ")); });
    });
}

// The kit's dialog behind the shared modules it needs, as a tool's build
// would cat them.
function kitDist() {
    const parts = ["shared/lib/numbers.js", "shared/lib/field_paint.js", "shared/lib/ui_kit.js",
        "shared/tests/probes/ui_kit_dialog.jsx"];
    const file = path.join(OUT, "ui-kit.dist.jsx");
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(file, parts.map(function (p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }).join("\n"));
    return file;
}

function build(tool, distArg) {
    const dist = distArg || (tool === "specimen"
        ? path.join(ROOT, "shared/tests/probes/specimen_ui.jsx")
        : (tool === "ui-kit" ? kitDist() : path.join(ROOT, tool, "dist", "illustrator-" + tool + ".jsx")));
    if (!fs.existsSync(dist)) { fail("no build at " + dist); }
    const scenario = path.join(__dirname, "scenarios", tool + ".js");
    if (!fs.existsSync(scenario)) { fail("no scenario at " + scenario); }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "1x1.png"), Buffer.from(PNG, "base64"));

    const src = fs.readFileSync(dist, "utf8").replace(/^﻿/, "")
        .replace(/(^|[^\w.$])alert\(/g, "$1$.global.__PA(")
        .replace(/(^|[^\w.$])confirm\(/g, "$1$.global.__PC(")
        .replace(/(^|[^\w.$])prompt\(/g, "$1$.global.__PP(")
        .replace(/new Window\(/g, "$.global.__PW(");
    const patched = path.join(OUT, tool + ".patched.jsx");
    fs.writeFileSync(patched, "﻿" + src);

    const out = path.join(OUT, "run_" + tool + ".jsx");
    const runner = fs.readFileSync(path.join(__dirname, "runner.template.js"), "utf8")
        .split("/*SCENARIO*/").join(fs.readFileSync(scenario, "utf8"))
        .split("__PATCHED__").join(patched)
        .split("__NS__").join(NAMESPACE[tool] || "UI_PROBE_NONE")
        .split("__TOOL__").join(tool)
        .split("__OUT__").join(OUT);
    fs.writeFileSync(out, runner);
    console.log(out);
}

if (process.argv[2] === "--report") { report(process.argv[3]); }
else if (process.argv[2]) { build(process.argv[2], process.argv[3]); }
else { fail("usage: build-probe.js <tool> [dist.jsx] | --report <tool>"); }
