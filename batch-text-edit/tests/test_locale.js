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

// ---- plural(): Czech 1 / 2-4 / 0 and 5+, English 1 / other -----------------
var cs = ["jedna", "několik", "mnoho"];
function csForm(n) { return CS.plural(n, cs); }
h.eq(csForm(1), "jedna", "cs 1");
h.eq(csForm(2) + csForm(3) + csForm(4), "několikněkolikněkolik", "cs 2-4");
h.eq(csForm(0), "mnoho", "cs 0 takes the many form");
h.eq(csForm(5) + csForm(6) + csForm(11) + csForm(24) + csForm(240), "mnohomnohomnohomnohomnoho", "cs 5 and more");
h.eq(csForm(21) + csForm(22), "mnohomnoho", "cs 21 and 22 are not few: only exactly 2-4 is");
h.eq(csForm(-1) + csForm(-3), "mnohomnoho", "cs negative takes the many form");
h.eq(csForm(1.5) + csForm(2.5), "mnohomnoho", "cs fractions take the many form");
h.eq(csForm("3"), "několik", "a count given as text");
h.eq(csForm(NaN), "mnoho", "cs NaN takes the many form");

var en = ["one", "other"];
h.eq(EN.plural(1, en), "one", "en 1");
h.eq(EN.plural(0, en) + EN.plural(2, en) + EN.plural(5, en) + EN.plural(-1, en), "otherotherotherother", "en everything else");
h.eq(DE.plural(2, en), "other", "unknown language plurals like en");
h.eq(EN.plural(3, ["only"]), "only", "too few forms fall back to the last one");

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
function formsOf(v) { return typeof v === "string" ? [v] : v; }

var ck = keysOf(CS), ek = keysOf(EN);
h.eq(ck.join(","), ek.join(","), "cs and en have the same keys");

var bad = [], i, j, k, cf, ef, n;
for (i = 0; i < ck.length; i++) {
    k = ck[i];
    cf = formsOf(CS[k]);
    ef = formsOf(EN[k]);
    n = slots(cf[0]);
    for (j = 0; j < cf.length; j++) { if (slots(cf[j]) !== n) { bad.push(k + " cs form " + j); } }
    for (j = 0; j < ef.length; j++) { if (slots(ef[j]) !== n) { bad.push(k + " en form " + j); } }
    if (typeof CS[k] !== "string" && typeof CS[k] !== "object") { bad.push(k + " type"); }
    if (typeof CS[k] === "object" && cf.length !== 3 && cf.length !== 2) { bad.push(k + " cs form count"); }
    if (typeof EN[k] === "object" && ef.length !== 2) { bad.push(k + " en form count"); }
}
h.eq(bad.join("; "), "", "every key has the same %s slots in every form and language");

// ---- every message key steps.js can emit has copy --------------------------
var src = fs.readFileSync(path.join(__dirname, "..", "src", "steps.js"), "utf8");
var re = /msg\("([A-Z_]+)"/g, m, missing = [];
while ((m = re.exec(src)) !== null) {
    if (CS[m[1]] === undefined || EN[m[1]] === undefined) { missing.push(m[1]); }
}
h.eq(missing.join(","), "", "every BTE.Steps.msg key exists in both tables");
h.done();
