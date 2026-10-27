/**
 * The few ScriptUI pieces the shared progress and summary windows use:
 * Window, add() of statictext, progressbar, panel, group, edittext and
 * button, show/close/update, and ScriptUI.environment.keyboardState.
 */
function Control(type, text, props) {
    this.type = type;
    this.text = text;
    this.props = props;
    this.children = [];
    this.preferredSize = {};
    this.minimumSize = {};
    this.graphics = {
        PenType: { SOLID_COLOR: "solid" },
        newPen: function (t, color) { return { color: color }; }
    };
}
Control.prototype.add = function (type, bounds, a, b) {
    var c;
    if (type === "progressbar") {
        c = new Control(type, "");
        c.value = a;
        c.maxvalue = b;
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

module.exports = { windows: windows };
