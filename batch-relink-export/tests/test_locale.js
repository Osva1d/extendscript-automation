#!/usr/bin/env node
/** BRE.L — both tables have the same keys and %s slots; counted keys are complete. */
var T = require("./lib/load.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

function snapshot(locale) {
    T.boot({ locale: locale });
    var t = {}, k;
    for (k in BRE.L) {
        if (typeof BRE.L[k] === "string") t[k] = BRE.L[k];
    }
    return { table: t, L: BRE.L };
}
function slots(s) { var m = s.match(/%s/g); return m ? m.length : 0; }

var cs = snapshot("cs_CZ");
var csL = cs.L;
var en = snapshot("en_US");

var k;
for (k in cs.table) assert(en.table.hasOwnProperty(k), "key " + k + " is missing in en");
for (k in en.table) assert(cs.table.hasOwnProperty(k), "key " + k + " is missing in cs");
for (k in en.table) {
    if (cs.table.hasOwnProperty(k)) {
        assert(slots(en.table[k]) === slots(cs.table[k]), "%s count differs for " + k);
    }
}
var tables = [cs.table, en.table], i;
for (i = 0; i < 2; i++) {
    for (k in tables[i]) {
        if (/_1$/.test(k)) {
            var base = k.slice(0, -2);
            assert(tables[i].hasOwnProperty(base + "_2"), base + "_2 missing");
            assert(tables[i].hasOwnProperty(base + "_5"), base + "_5 missing");
        }
    }
}

assert(csL.count("PDF_READY", 1) === "Ve zdrojové složce je 1 PDF.", "PDF_READY 1");
assert(csL.count("PDF_READY", 3) === "Ve zdrojové složce jsou 3 PDF.", "PDF_READY 3");
assert(csL.count("POSITIONS", 5) === "5 pozic", "POSITIONS 5");
assert(cs.table.ERROR_PREFIX === "CHYBA: " && en.table.ERROR_PREFIX === "ERROR: ", "ERROR_PREFIX");

console.log("test_locale: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
