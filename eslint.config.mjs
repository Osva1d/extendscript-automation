// ---------------------------------------------------------------------------
// ESLint — ES3 gate for ExtendScript sources
// Part of: extendscript-automation dev tooling
// ---------------------------------------------------------------------------
//
// Scope is deliberately narrow: */src/** and shared/lib/**. Tests are Node
// programs with Node rules and are linted by running them.
//
// WHY ecmaVersion 5 AND NOT 3 — measured in Illustrator 30.8.1 on 2026-09-07:
// the ExtendScript engine ACCEPTS trailing commas in object and array literals
// ({a:1,} parses, [1,2,].length === 2), so an ES3 parser would reject
// grommet-marks/src/illustrator.js:172 for something that demonstrably runs.
// ES5 parsing still rejects everything that actually breaks the engine —
// `let` ("Bylo očekáváno: ;"), arrow functions, template literals — plus
// `const`, which the engine tolerates but conventions.md bans anyway.
//
// WHY indexOf IS NOT IN THE BANNED LIST, although Array.prototype.indexOf does
// not exist in ExtendScript (measured: typeof [].indexOf === "undefined", and
// calling it throws): ESLint sees property names, not types, so banning it here
// would also reject the four legitimate String.indexOf calls in
// batch-relink-export. That distinction needs type information —
// tools/typecheck.sh makes it correctly.

const EXTENDSCRIPT_GLOBALS = {
    // ExtendScript core
    $: "readonly", app: "readonly", File: "readonly", Folder: "readonly",
    BridgeTalk: "readonly", XML: "readonly", XMLList: "readonly",
    UnitValue: "readonly", ScriptUI: "readonly", Window: "readonly",
    alert: "readonly", confirm: "readonly", prompt: "readonly",
    localize: "readonly",

    // Illustrator DOM globals — every one verified present at runtime in 30.8.1.
    // PageItemType is deliberately absent: it is `undefined` in the engine, so
    // a reference to it should be reported, not silenced.
    ElementPlacement: "readonly", CoordinateSystem: "readonly",
    ZOrderMethod: "readonly", DocumentColorSpace: "readonly",
    SaveOptions: "readonly", StrokeCap: "readonly", StrokeJoin: "readonly",
    RulerUnits: "readonly", UserInteractionLevel: "readonly",
    PDFCompatibility: "readonly", PDFSaveOptions: "readonly",
    CMYKColor: "readonly", RGBColor: "readonly", SpotColor: "readonly",
    GrayColor: "readonly", NoColor: "readonly", ColorModel: "readonly",

    // Polyfilled by shared/lib/json2.js, first in every build order.
    JSON: "readonly",

    // Tool namespaces and the shared-core factory the build wires up.
    ZSM: "writable", GM: "writable", BRE: "writable",
    buildUIState: "readonly"
};

// Methods absent from the ExtendScript engine. Every entry verified by
// `typeof` in Illustrator 30.8.1 — this list is measured, not copied from an
// ES5 compatibility table. Date.now is NOT here: it exists.
const MISSING_METHODS = [
    "forEach", "map", "filter", "reduce", "reduceRight", "some", "every",
    "find", "findIndex", "includes", "flat", "flatMap",
    "trim", "trimStart", "trimEnd", "trimLeft", "trimRight",
    "startsWith", "endsWith", "padStart", "padEnd", "repeat", "bind"
].map((property) => ({
    property,
    message: `"${property}" neexistuje v ExtendScript enginu (ověřeno v Illustratoru 30.8.1) — použij for smyčku nebo NS.Utils.`
}));

const MISSING_STATICS = [
    ["Object", "keys"], ["Object", "values"], ["Object", "entries"],
    ["Object", "assign"], ["Object", "create"], ["Object", "defineProperty"],
    ["Object", "fromEntries"], ["Object", "getOwnPropertyNames"],
    ["Array", "isArray"], ["Array", "from"], ["Array", "of"]
].map(([object, property]) => ({
    object,
    property,
    message: `${object}.${property} neexistuje v ExtendScript enginu (ověřeno v Illustratoru 30.8.1).`
}));

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/dist/**",
            // Vendored third-party code (Crockford's json2) — taken verbatim.
            "shared/lib/json2.js",
            // Skeletons carrying <placeholders>, not parseable JavaScript.
            "templates/**"
        ]
    },
    {
        files: ["*/src/**/*.js", "shared/lib/**/*.js"],
        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script",
            globals: EXTENDSCRIPT_GLOBALS
        },
        linterOptions: { reportUnusedDisableDirectives: true },
        rules: {
            "no-restricted-properties": ["error", ...MISSING_METHODS, ...MISSING_STATICS],
            "no-restricted-globals": [
                "error",
                "Promise", "Map", "Set", "WeakMap", "WeakSet", "Symbol", "Proxy", "Reflect"
            ],
            "no-undef": "error",
            // `catch (e) {}` with an unused binding is the house style for
            // "this failure is expected and handled by falling through".
            // varsIgnorePattern covers the shared-core factories: build.sh
            // appends the `buildUIState(ZSM);` call, so within the file the
            // declaration genuinely has no caller.
            "no-unused-vars": [
                "warn",
                { args: "none", caughtErrors: "none", varsIgnorePattern: "^build[A-Z]" }
            ]
        }
    }
];
