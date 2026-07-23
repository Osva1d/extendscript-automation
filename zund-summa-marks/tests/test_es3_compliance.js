#!/usr/bin/env node
/**
 * ES3 Compliance Linter — guards against ExtendScript runtime errors.
 *
 * Adobe ExtendScript runs ES3 with a few ES5 extras. Many modern Array/
 * Object methods are MISSING and using them throws "X is not a function"
 * at runtime — try/catch in production code does NOT prevent the script
 * from crashing the document.
 *
 * KNOWN-MISSING in ExtendScript:
 *   - Array.prototype.map, filter, forEach, reduce, find, findIndex,
 *     includes, flat, flatMap, fill, copyWithin
 *   - Array.isArray, Array.from, Array.of
 *   - String.prototype.includes, startsWith, endsWith, padStart, padEnd,
 *     repeat, trimStart, trimEnd
 *   - Object.keys, values, entries, assign, freeze (sometimes), getOwn-
 *     PropertyNames partial, fromEntries
 *   - JSON.* — POLYFILLED via shared/lib/json2.js (so JSON.parse/stringify OK)
 *   - Promise, Map, Set, WeakMap, WeakSet
 *   - let, const, arrow functions (=>), template literals (`${...}`),
 *     destructuring, spread/rest (...), default params, classes, async/await
 *
 * SAFE in ExtendScript:
 *   - Array.prototype.push, pop, shift, unshift, splice, slice, concat,
 *     join, reverse, sort, indexOf (ES5 but supported), lastIndexOf
 *   - String.prototype.indexOf, charAt, charCodeAt, replace, split, slice,
 *     substring, substr, toLowerCase, toUpperCase
 *   - Object literal {}, hasOwnProperty, in, for-in
 *   - try/catch, var, function expressions
 *
 * This test scans every src/*.js file (excluding json2.js polyfill and
 * test infrastructure) for forbidden patterns and fails if any are found.
 *
 * Usage: node tests/test_es3_compliance.js
 */

var fs   = require("fs");
var path = require("path");

// ===== TEST FRAMEWORK =====
var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; }
    else { fail++; console.log("  FAIL: " + msg); }
}


// ===== ES5+ patterns that crash ExtendScript =====
// Each pattern: { name, regex, ok-message }
var FORBIDDEN_PATTERNS = [
    // Array methods
    { name: "Array.prototype.map",        re: /\.map\s*\(/g },
    { name: "Array.prototype.filter",     re: /\.filter\s*\(/g },
    { name: "Array.prototype.forEach",    re: /\.forEach\s*\(/g },
    { name: "Array.prototype.reduce",     re: /\.reduce\s*\(/g },
    { name: "Array.prototype.find",       re: /\.find\s*\(/g },
    { name: "Array.prototype.findIndex",  re: /\.findIndex\s*\(/g },
    { name: "Array.prototype.includes",   re: /\.includes\s*\(/g },
    { name: "Array.prototype.flat",       re: /\.flat\s*\(/g },
    { name: "Array.prototype.flatMap",    re: /\.flatMap\s*\(/g },
    { name: "Array.from",                 re: /\bArray\.from\s*\(/g },
    { name: "Array.of",                   re: /\bArray\.of\s*\(/g },
    { name: "Array.isArray",              re: /\bArray\.isArray\s*\(/g },

    // String methods (ES5+)
    // Note: negative lookbehind `(?<![a-zA-Z_$])` is ES2018 — fine here because
    // this linter runs on Node ≥14 (see engines in package.json), not in
    // ExtendScript. The patterns it MATCHES are what's banned in src/.
    { name: "String.prototype.includes",  re: /(?<![a-zA-Z_$])\.includes\s*\(/g },
    { name: "String.prototype.startsWith",re: /\.startsWith\s*\(/g },
    { name: "String.prototype.endsWith",  re: /\.endsWith\s*\(/g },
    { name: "String.prototype.padStart",  re: /\.padStart\s*\(/g },
    { name: "String.prototype.padEnd",    re: /\.padEnd\s*\(/g },
    { name: "String.prototype.repeat",    re: /\.repeat\s*\(/g },

    // Object methods (ES5+)
    { name: "Object.keys",                re: /\bObject\.keys\s*\(/g },
    { name: "Object.values",              re: /\bObject\.values\s*\(/g },
    { name: "Object.entries",             re: /\bObject\.entries\s*\(/g },
    { name: "Object.assign",              re: /\bObject\.assign\s*\(/g },
    { name: "Object.fromEntries",         re: /\bObject\.fromEntries\s*\(/g },

    // Modern syntax
    { name: "Arrow function",             re: /\)\s*=>\s*[{\(a-zA-Z_$]/g },
    { name: "Template literal",           re: /`[^`]*\$\{/g },
    { name: "let declaration",            re: /\blet\s+[a-zA-Z_$]/g },
    { name: "const declaration",          re: /\bconst\s+[a-zA-Z_$]/g },
    { name: "for...of loop",              re: /\bfor\s*\([^)]*\bof\s+/g },
    { name: "Spread operator (array)",    re: /\[\s*\.\.\./g },
    { name: "Rest parameter",             re: /\([^)]*\.\.\./g },

    // Modern globals
    { name: "Promise",                    re: /\bnew\s+Promise\s*\(/g },
    { name: "Map (ES6)",                  re: /\bnew\s+Map\s*\(/g },
    { name: "Set (ES6)",                  re: /\bnew\s+Set\s*\(/g },
    { name: "async function",             re: /\basync\s+function\b/g },
    { name: "await keyword",              re: /(^|\s|\()\s*await\s+/g }
];

// Files to scan: all .js / .jsx in src/ AND the shared core (shared/lib/),
// except json2.js — vendored third-party code (Crockford's json2); we don't
// lint foreign code, we take it verbatim.
var SRC_DIR    = path.join(__dirname, "..", "src");
var SHARED_DIR = path.join(__dirname, "..", "..", "shared", "lib");
function listJS(dir) {
    var out = [];
    var entries = fs.readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
        var p = path.join(dir, entries[i]);
        var st = fs.statSync(p);
        if (st.isDirectory()) {
            out = out.concat(listJS(p));
        } else if (/\.(js|jsx)$/.test(entries[i])) {
            if (entries[i] === "json2.js") continue;
            out.push(p);
        }
    }
    return out;
}

var files = listJS(SRC_DIR);
if (fs.existsSync(SHARED_DIR)) files = files.concat(listJS(SHARED_DIR));
console.log("\nScanning " + files.length + " source files for ES3 compliance...");

// Strip comments (// and /* */) so patterns inside docstrings don't trigger
function stripComments(code) {
    // Block comments (non-greedy)
    code = code.replace(/\/\*[\s\S]*?\*\//g, "");
    // Line comments — preserve newlines for accurate line counting
    code = code.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
    return code;
}

// Get line number of a regex match
function lineOf(text, idx) {
    var ln = 1;
    for (var i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) ln++;
    return ln;
}


// =====================================================
// TEST: scan each file against each pattern
// =====================================================
console.log("\n=== ES3 Compliance Scan ===");

var totalViolations = 0;
for (var fi = 0; fi < files.length; fi++) {
    var filePath = files[fi];
    var rel = path.relative(SRC_DIR, filePath);
    var content = fs.readFileSync(filePath, "utf8");
    var stripped = stripComments(content);

    for (var pi = 0; pi < FORBIDDEN_PATTERNS.length; pi++) {
        var pattern = FORBIDDEN_PATTERNS[pi];
        pattern.re.lastIndex = 0;
        var m;
        var found = [];
        while ((m = pattern.re.exec(stripped)) !== null) {
            // For ".includes" (could be String OR Array), accept since both are bad in ES3
            found.push({ idx: m.index, text: m[0] });
        }
        if (found.length > 0) {
            for (var fii = 0; fii < found.length; fii++) {
                var line = lineOf(stripped, found[fii].idx);
                console.log("  VIOLATION: " + rel + ":" + line +
                    " — " + pattern.name + " (\"" + found[fii].text.trim() + "\")");
                totalViolations++;
            }
            assert(false, rel + ": " + pattern.name + " (" + found.length + " occurrence(s))");
        } else {
            // Don't print PASS per file/pattern — too noisy
        }
    }
}

if (totalViolations === 0) {
    pass++; total++;
    console.log("  PASS: All " + files.length + " source files are ES3-compliant.");
}


// =====================================================
// TEST: presence of #target illustrator directive in dist
// =====================================================
console.log("\n=== Dist Build Sanity ===");
try {
    var distPath = path.join(__dirname, "..", "dist", "illustrator-zund-summa-marks.jsx");
    if (fs.existsSync(distPath)) {
        var dist = fs.readFileSync(distPath, "utf8");
        assert(dist.indexOf("#target illustrator") !== -1, "dist has #target illustrator directive");
        // UTF-8 BOM (0xEF 0xBB 0xBF)
        var first3 = dist.charCodeAt(0).toString(16) + " " +
                     dist.charCodeAt(1).toString(16) + " " +
                     dist.charCodeAt(2).toString(16);
        // Note: Node strips BOM on text read sometimes; check via Buffer
        var buf = fs.readFileSync(distPath);
        var hasBOM = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
        assert(hasBOM, "dist starts with UTF-8 BOM (required for ExtendScript Unicode)");
    } else {
        console.log("  (skip: dist not built)");
    }
} catch (e) {
    assert(false, "Dist sanity check threw: " + e.message);
}


// =====================================================
// SUMMARY
// =====================================================
console.log("\n" + "=".repeat(50));
console.log("ES3 COMPLIANCE TEST RESULTS: " + pass + "/" + total + " PASSED, " + fail + " FAILED");
if (totalViolations > 0) {
    console.log("Found " + totalViolations + " ES5+ pattern occurrences in src/");
    console.log("ExtendScript runs ES3 — these will crash Illustrator at runtime.");
}
console.log("=".repeat(50));
process.exit(fail > 0 ? 1 : 0);
