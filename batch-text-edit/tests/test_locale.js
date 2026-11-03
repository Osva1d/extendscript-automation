var h = require("./lib/harness");
var fs = require("fs");
var path = require("path");

// BTE.L reads app.locale once, when locale.js loads, so each language is its
// own load. In Node there is no `app`; the tests set one around the load.
function loadL(locale) {
    global.app = { locale: locale };
    try {
        return h.load(["src/locale.js"]).L;
    } finally {
        delete global.app;
    }
}
var CS = loadL("cs_CZ");
var EN = loadL("en_US");
var DE = loadL("de_DE");

h.eq(CS.DEC_SEP + EN.DEC_SEP + DE.DEC_SEP, ",..", "cs and en load, an unknown language falls back to en");

// ---- count(): the canon's _1 / _2 / _5 (1 / 2-4 / everything else) ----------
function csCount(n) { return CS.count("SKIP_LOCKED", n); }
h.eq(csCount(1), "Přeskočen 1 zamčený nebo skrytý text.", "cs 1");
h.eq(csCount(2), "Přeskočeny 2 zamčené nebo skryté texty.", "cs 2");
h.eq(csCount(3), "Přeskočeny 3 zamčené nebo skryté texty.", "cs 3");
h.eq(csCount(4), "Přeskočeny 4 zamčené nebo skryté texty.", "cs 4");
h.eq(csCount(0), "Přeskočeno 0 zamčených nebo skrytých textů.", "cs 0 takes _5");
h.eq(csCount(5), "Přeskočeno 5 zamčených nebo skrytých textů.", "cs 5");
h.eq(csCount(11), "Přeskočeno 11 zamčených nebo skrytých textů.", "cs 11");
h.eq(csCount(24), "Přeskočeno 24 zamčených nebo skrytých textů.", "cs 24");
h.eq(csCount(240), "Přeskočeno 240 zamčených nebo skrytých textů.", "cs 240");
h.eq(csCount(-1), "Přeskočeno -1 zamčených nebo skrytých textů.", "cs negative takes _5");
h.eq(csCount(NaN), "Přeskočeno NaN zamčených nebo skrytých textů.", "cs NaN takes _5");
h.eq(CS.countForm("SKIP_LOCKED", 21), CS.countForm("SKIP_LOCKED", 5), "cs 21 is not 2-4");

h.eq(EN.count("SKIP_LOCKED", 1), "Skipped 1 locked or hidden text.", "en 1");
h.eq(EN.count("SKIP_LOCKED", 0), "Skipped 0 locked or hidden texts.", "en 0");
h.eq(EN.count("SKIP_LOCKED", 3), "Skipped 3 locked or hidden texts.", "en 3");
h.eq(EN.count("SKIP_LOCKED", 6), "Skipped 6 locked or hidden texts.", "en 6");
h.eq(DE.count("SKIP_LOCKED", 3), "Skipped 3 locked or hidden texts.", "unknown language counts like en");

// countForm hands back the template, for messages with more than the count in them
h.eq(CS.format(CS.countForm("STATUS_CHANGED", 1), 1, 1), "Změní se 1 z 1 prvku.", "countForm: cs one");
h.eq(CS.format(CS.countForm("STATUS_CHANGED", 5), 3, 5), "Změní se 3 z 5 prvků.", "countForm: cs five");
h.eq(CS.countForm("WARN_EXTRA", 1), "Prvků je o %s víc.", "countForm leaves the placeholder");

// The R17 examples
h.eq(CS.count("WARN_MISSING", 1), "Chybí 1 prvek.", "Chybí 1 prvek.");
h.eq(CS.count("WARN_MISSING", 3), "Chybí 3 prvky.", "Chybí 3 prvky.");
h.eq(CS.count("WARN_MISSING", 6), "Chybí 6 prvků.", "Chybí 6 prvků.");
h.eq(EN.count("WARN_MISSING", 1), "1 element missing.", "en 1 element missing");
h.eq(EN.count("WARN_MISSING", 3), "3 elements missing.", "en 3 elements missing");

// ---- both tables carry the same keys and the same %s slots -----------------
function slots(s) {
    var m = String(s).match(/%s/g);
    return m === null ? 0 : m.length;
}
function keysOf(t) {
    var a = [], k;
    for (k in t) { if (t.hasOwnProperty(k) && typeof t[k] !== "function") { a.push(k); } }
    a.sort();
    return a;
}

var ck = keysOf(CS), ek = keysOf(EN);
h.eq(ck.join(","), ek.join(","), "cs and en have the same keys");

var bad = [], i, k, base, suffixes, s, n;
for (i = 0; i < ck.length; i++) {
    k = ck[i];
    if (typeof CS[k] !== "string" || typeof EN[k] !== "string") { bad.push(k + " is not a string"); }
    // a counted key has all three forms, with the same slots in each, in both languages
    if (/_1$/.test(k)) {
        base = k.substring(0, k.length - 2);
        n = slots(CS[k]);
        suffixes = ["_1", "_2", "_5"];
        for (s = 0; s < suffixes.length; s++) {
            if (typeof CS[base + suffixes[s]] !== "string" || typeof EN[base + suffixes[s]] !== "string") {
                bad.push(base + suffixes[s] + " missing");
            } else if (slots(CS[base + suffixes[s]]) !== n || slots(EN[base + suffixes[s]]) !== n) {
                bad.push(base + suffixes[s] + " slots");
            }
        }
    }
}
h.eq(bad.join("; "), "", "every counted key has _1/_2/_5 in both languages with the same %s slots");

// no counted form is orphaned (a _2 or _5 without its _1)
var orphans = [];
for (i = 0; i < ck.length; i++) {
    if (/_[25]$/.test(ck[i])) {
        base = ck[i].substring(0, ck[i].length - 2);
        if (CS[base + "_1"] === undefined) { orphans.push(ck[i]); }
    }
}
h.eq(orphans.join(","), "", "no _2 or _5 form without its _1");

// ---- every message key steps.js can emit has copy --------------------------
// A counted message has no entry under its own key, only base_1/_2/_5.
var src = fs.readFileSync(path.join(__dirname, "..", "src", "steps.js"), "utf8");
var re = /msg\("([A-Z_]+)"/g, m, missing = [];
function has(T, key) { return T[key] !== undefined || T[key + "_5"] !== undefined; }
while ((m = re.exec(src)) !== null) {
    if (!has(CS, m[1]) || !has(EN, m[1])) { missing.push(m[1]); }
}
h.eq(missing.join(","), "", "every BTE.Steps.msg key exists in both tables");
h.done();
