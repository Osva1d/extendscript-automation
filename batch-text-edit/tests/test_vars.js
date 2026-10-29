var h = require("./lib/harness"), BTE = h.load(["src/lib/utils.js", "src/vars.js"]);
h.eq(BTE.Vars.inText("Série {série}/{rok}").join(","), "{série},{rok}", "inside longer text");
h.eq(BTE.Vars.inText("{název produktu} {1}").join(","), "{název produktu},{1}", "spaces, digits, diacritics");
h.eq(BTE.Vars.inText("{a{b}} {x").join(","), "{b}", "nested and lone brace");
h.eq(BTE.Vars.inText("{a\rb} {c\u0003d}").length, 0, "no paragraph or soft break inside");
var f = BTE.Vars.find([["{kód}", "{n}"], ["{kód}", "x"], ["{n}", "{n}"]]);
h.eq(JSON.stringify(f), '[{"name":"{kód}","count":2},{"name":"{n}","count":2}]', "order and per-element count");
// Review Focus: empty texts
h.eq(BTE.Vars.find([[""], ["\r"], ["   "]]).length, 0, "empty texts");
h.done();
