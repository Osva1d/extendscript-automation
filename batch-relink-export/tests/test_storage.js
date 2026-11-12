#!/usr/bin/env node
/** BRE.Storage — defaults, typed load and save with a fake settings file. */
var T = require("./lib/load.js");
T.boot();
global.JSON = JSON;
T.load("src/storage.js");

var pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}

var written = null;
function fakeFile(content) {
    return {
        exists: content !== null, encoding: "", fsName: "/fake/settings.json",
        open: function () { return true; },
        read: function () { return content; },
        write: function (s) { written = s; return true; },
        close: function () { return true; }
    };
}
function withStored(content) {
    BRE.Storage.getFile = function () { return fakeFile(content); };
    return BRE.Storage.load();
}

assert(BRE.Storage.defaults().skip === false, "defaults().skip is false");
assert(withStored('{"skip": true}').skip === true, "stored skip:true loads as true");
assert(withStored('{"skip": "yes"}').skip === false, "stored skip of wrong type keeps the default");
assert(withStored(null).skip === false, "no file: skip default");

BRE.Storage.getFile = function () { return fakeFile(null); };
var ok = BRE.Storage.save({
    templateFile: { fsName: "/t.ai" }, outputFolder: { fsName: "/o" },
    namingPattern: "{n}", preset: "p", openAfter: true, skipExisting: true
});
assert(ok === true, "save returns true");
var data = JSON.parse(written);
assert(data.skip === true, "save writes skip: true");
assert(data.template === "/t.ai" && data.output === "/o" && data.pattern === "{n}" &&
    data.preset === "p" && data.openAfter === true, "save keeps the other fields");

console.log("test_storage: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
