var h = require("./lib/harness"), BTE = h.load(["src/lib/utils.js"]);
h.eq(BTE.Utils.indexOf(["a", "b"], "b"), 1, "indexOf finds");
h.eq(BTE.Utils.indexOf([], "z"), -1, "indexOf missing");
h.eq(BTE.Utils.escapeRegExp("{a+b}.$"), "\\{a\\+b\\}\\.\\$", "escapeRegExp");
h.eq(BTE.Utils.pad(3, 7), "007", "pad");
h.eq(BTE.Utils.pad(1, 120), "120", "pad never truncates");
h.eq(BTE.Utils.strip("  x \r"), "x", "strip");

// ---- stamp -------------------------------------------------------------------
h.eq(BTE.Utils.stamp(new Date(2026, 9, 31, 15, 4, 9)), "2026-10-31 15:04:09", "stamp: local time, zero padded");
h.eq(BTE.Utils.stamp(new Date(2027, 0, 2, 0, 0, 0)), "2027-01-02 00:00:00", "stamp: midnight and January");

// ---- log: console and file, never throws ---------------------------------------
// A File and Folder stub: the folder is created on demand, "a" appends, the
// failures the log must survive are switched on one by one.
var disk = {}, folders = {}, modes = [], fail = {}, console_ = [];
function MockFolder(p) { this.fsName = p; }
Object.defineProperty(MockFolder.prototype, "exists", { get: function () { return folders[this.fsName] === true; } });
MockFolder.prototype.create = function () { folders[this.fsName] = true; return !fail.create; };
MockFolder.userData = "/ud";
function MockFile(p) { this.fsName = p; }
MockFile.prototype.open = function (mode) { modes.push(mode + ":" + this.encoding); return !fail.open; };
MockFile.prototype.writeln = function (t) {
    if (fail.throwWrite) { throw new Error("disk full"); }
    if (fail.write) { return false; }
    // writeln ends a line with CR unless lineFeed says otherwise (measured in Illustrator)
    disk[this.fsName] = (disk[this.fsName] || "") + t + (this.lineFeed === "Unix" ? "\n" : "\r");
    return true;
};
MockFile.prototype.close = function () { return !fail.close; };
global.Folder = MockFolder;
global.File = MockFile;
global.$ = { writeln: function (t) { console_.push(t); } };
var LOG = "/ud/batch-text-edit/bte.log";

function reset() { disk = {}; folders = {}; modes = []; fail = {}; console_ = []; }

reset();
BTE.Utils.log("first entry");
h.eq(folders["/ud/batch-text-edit"], true, "log: creates the folder");
h.eq(modes.join(","), "a:UTF-8", "log: opens for append, as UTF-8");
h.eq(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d first entry\n$/.test(disk[LOG]), true, "log: one line, stamp then message");
h.eq(console_.join("|"), "[BTE] first entry", "log: the console gets it too");
BTE.Utils.log("second\r\nentry\nwith breaks Zápis");
h.eq(disk[LOG].split("\n").length, 3, "log: appends, one line per entry (two lines and the empty rest)");
h.eq(/ second entry with breaks Zápis\n$/.test(disk[LOG]), true, "log: line breaks become spaces, Czech kept");
BTE.Utils.log(42);
h.eq(/ 42\n$/.test(disk[LOG]), true, "log: a non-string is written as its text");

// the file cannot be opened: no throw, the console says so, nothing is written
reset();
fail.open = true;
var threw = false;
try { BTE.Utils.log("lost"); } catch (e) { threw = true; }
h.eq(threw, false, "log: a failing open does not throw");
h.eq(disk[LOG], undefined, "log: and writes nothing");
h.eq(console_.length, 2, "log: the console has the entry and the reason");
h.eq(console_[0], "[BTE] lost", "log: the entry itself is still on the console");
h.eq(console_[1].indexOf("log file not written: open(a) failed for " + LOG) !== -1, true, "log: the reason names the file");

// write or close report false, write throws
reset();
fail.write = true;
BTE.Utils.log("x");
h.eq(console_[1].indexOf("write/close failed") !== -1, true, "log: a failed write is reported");
reset();
fail.close = true;
BTE.Utils.log("x");
h.eq(console_[1].indexOf("write/close failed") !== -1, true, "log: a failed close is reported");
reset();
fail.throwWrite = true;
threw = false;
try { BTE.Utils.log("x"); } catch (e2) { threw = true; }
h.eq(threw, false, "log: a throwing write does not throw");
h.eq(console_[1], "[BTE] Utils.log: log file not written: disk full", "log: the cause is on the console");

// no File and Folder at all (not in Illustrator), and no $: still no throw
reset();
delete global.File;
delete global.Folder;
threw = false;
try { BTE.Utils.log("x"); } catch (e3) { threw = true; }
h.eq(threw, false, "log: without File and Folder it does not throw");
h.eq(console_.length, 2, "log: and says why on the console");
delete global.$;
threw = false;
try { BTE.Utils.log("x"); } catch (e4) { threw = true; }
h.eq(threw, false, "log: without $ it does not throw either");

h.done();
