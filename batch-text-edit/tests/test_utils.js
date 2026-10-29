var h = require("./lib/harness"), BTE = h.load(["src/lib/utils.js"]);
h.eq(BTE.Utils.indexOf(["a", "b"], "b"), 1, "indexOf finds");
h.eq(BTE.Utils.indexOf([], "z"), -1, "indexOf missing");
h.eq(BTE.Utils.escapeRegExp("{a+b}.$"), "\\{a\\+b\\}\\.\\$", "escapeRegExp");
h.eq(BTE.Utils.pad(3, 7), "007", "pad");
h.eq(BTE.Utils.pad(1, 120), "120", "pad never truncates");
h.eq(BTE.Utils.trim("  x \r"), "x", "trim");
h.done();
