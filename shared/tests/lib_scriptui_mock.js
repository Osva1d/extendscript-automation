/**
 * The few ScriptUI pieces the shared progress and summary windows and the UI
 * kit use: Window, add() of any control, a dropdownlist's items, the three
 * size objects, graphics.measureString, show/close/update, and
 * ScriptUI.environment.keyboardState.
 */
// A width per character for measureString; the real one depends on the font.
var CHAR_W = 6;

function Control(type, text, props) {
    this.type = type;
    this.text = text;
    this.props = props;
    this.children = [];
    this.preferredSize = {};
    this.minimumSize = {};
    this.maximumSize = {};
    this.graphics = {
        PenType: { SOLID_COLOR: "solid" },
        newPen: function (t, color) { return { color: color }; },
        measureString: function (s) { return [String(s).length * CHAR_W, 15]; }
    };
}
Control.prototype.add = function (type, bounds, a, b) {
    var c;
    if (this.type === "dropdownlist" && type === "item") {
        c = { text: bounds, index: this.items.length };   // add("item", text)
        this.items.push(c);
        return c;
    }
    if (type === "progressbar") {
        c = new Control(type, "");
        c.value = a;
        c.maxvalue = b;
    } else if (type === "dropdownlist") {
        c = makeList(a || [], b);
    } else {
        c = new Control(type, a, b);
    }
    this.children.push(c);
    return c;
};
/** Every control of a type, depth first. */
Control.prototype.all = function (type) {
    var out = [], i;
    for (i = 0; i < this.children.length; i++) {
        if (this.children[i].type === type) { out.push(this.children[i]); }
        out = out.concat(this.children[i].all(type));
    }
    return out;
};

// A dropdownlist: selection reads back as the item, as ScriptUI's does, also
// when an index was written.
function makeList(texts, props) {
    var dd = new Control("dropdownlist", undefined, props);
    var selected = null, i;
    dd.items = [];
    for (i = 0; i < texts.length; i++) { dd.add("item", texts[i]); }
    dd.remove = function (n) {
        var k;
        dd.items.splice(n, 1);
        for (k = 0; k < dd.items.length; k++) { dd.items[k].index = k; }
    };
    Object.defineProperty(dd, "selection", {
        get: function () { return selected; },
        set: function (v) { selected = (typeof v === "number") ? (dd.items[v] || null) : v; }
    });
    return dd;
}

var windows = [];
global.Window = function (type, title, bounds, props) {
    var w = new Control("window", title, props);
    w.windowType = type;
    w.shown = 0;
    w.closed = false;
    w.updates = 0;
    w.show = function () { this.shown++; return 1; };
    w.close = function () { this.closed = true; };
    w.update = function () { this.updates++; };
    windows.push(w);
    return w;
};
global.ScriptUI = { environment: { keyboardState: { keyName: undefined } } };

module.exports = { windows: windows, CHAR_W: CHAR_W };
