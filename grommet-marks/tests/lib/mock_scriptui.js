/**
 * Mock ScriptUI for structural testing of ui.js dialog layouts.
 *
 * Records the control tree (Window > Panel > Group > Button/EditText/...) with
 * the layout + state properties ui.js touches. Does NOT render pixels.
 *
 * IMPORTANT — radio-button behaviour:
 *   Real ScriptUI auto-groups radio buttons only when they are CONSECUTIVE
 *   siblings in a container. Modelling that exactly is fragile and version-
 *   dependent. This mock deliberately makes every radio button INDEPENDENT
 *   (its own .value, no auto-exclusion). That is the conservative model: it
 *   forces production code to make exclusivity explicit in its onClick
 *   handlers instead of leaning on ScriptUI's implicit grouping. A dialog that
 *   relies on implicit grouping (as the cycle-2 Count/Spacing row did) will
 *   therefore FAIL here — which is exactly the regression class we want caught.
 *
 * Usage:
 *   var SUI = require('./lib/mock_scriptui.js');
 *   SUI.install();
 *   // load ui.js + deps, call GM.UI.buildDialog(...)
 *   var w = SUI.lastWindow();
 *   // assert on w.find(...), click handlers, etc.
 *   SUI.uninstall();
 */

(function () {
    "use strict";

    var lastWindow = null;
    var origGlobals = {};

    // A minimal ScriptUIGraphics stub so ui.js paintField()/newPen() calls are
    // harmless no-ops in tests (real colouring needs a realised OS control).
    function makeGraphics() {
        return {
            newPen: function () { return {}; },
            newBrush: function () { return {}; },
            foregroundColor: null,
            PenType: { SOLID_COLOR: 0 },
            BrushType: { SOLID_COLOR: 0 }
        };
    }

    function MockControl(type, parent, opts) {
        opts = opts || {};
        this.type = type;
        this.parent = parent || null;
        this.children = [];

        // Layout properties
        this.margins = 0;
        this.spacing = 0;
        this.orientation = "row";
        this.alignment = undefined;
        this.alignChildren = undefined;
        this.preferredSize = { width: -1, height: -1 };
        this.maximumSize = { width: 10000, height: 10000 };
        this.size = { width: -1, height: -1 };
        this.location = [0, 0];
        this.bounds = { x: 0, y: 0, width: 0, height: 0 };

        // Common control-state
        this.text = opts.text != null ? opts.text : "";
        this.value = false;
        this.enabled = true;
        this.visible = true;
        this.helpTip = "";
        this.name = opts.name || "";
        this.graphics = makeGraphics();

        // Event handlers
        this.onClick = null;
        this.onChange = null;
        this.onChanging = null;

        this.layout = { layout: function () {}, resize: function () {} };
    }

    MockControl.prototype.add = function (childType) {
        var args = Array.prototype.slice.call(arguments, 1);
        var child = makeChild(childType, this, args);
        this.children.push(child);
        return child;
    };

    MockControl.prototype.remove = function (childOrIndex) {
        var idx = (typeof childOrIndex === "number")
            ? childOrIndex
            : this.children.indexOf(childOrIndex);
        if (idx >= 0 && idx < this.children.length) {
            this.children.splice(idx, 1);
        }
    };

    MockControl.prototype.show = function () { return 0; };
    MockControl.prototype.close = function () {};
    MockControl.prototype.hide = function () {};
    MockControl.prototype.notify = function (event) {
        var fn = this["on" + (event || "").replace(/^on/, "")];
        // Support both "onDraw" and "Draw" spellings; default to onDraw.
        if (typeof this.onDraw === "function" && (event === "onDraw" || event === "Draw")) {
            this.onDraw();
        } else if (typeof fn === "function") {
            fn();
        }
    };

    MockControl.prototype.find = function (predicate) {
        var hits = [];
        function walk(c) {
            if (predicate(c)) hits.push(c);
            for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
        }
        walk(this);
        return hits;
    };
    MockControl.prototype.findOne = function (predicate) {
        var r = this.find(predicate);
        return r.length > 0 ? r[0] : null;
    };

    // ===== Specialized controls =====
    function MockDropDownList(parent, opts) {
        MockControl.call(this, "dropdownlist", parent, opts);
        this.items = [];
        this.selection = null;
        var self = this;
        this.add = function (kind, label) {
            if (kind === "item") {
                var item = { type: "listitem", text: label, index: self.items.length };
                self.items.push(item);
                return item;
            }
            return MockControl.prototype.add.call(self, kind, label);
        };
        this.remove = function (childOrIndex) {
            var idx = (typeof childOrIndex === "number")
                ? childOrIndex : self.items.indexOf(childOrIndex);
            if (idx >= 0 && idx < self.items.length) {
                self.items.splice(idx, 1);
                for (var i = 0; i < self.items.length; i++) self.items[i].index = i;
            }
        };
        this.removeAll = function () { self.items = []; self.selection = null; };
    }
    MockDropDownList.prototype = Object.create(MockControl.prototype);

    function MockEditText(parent, opts) {
        MockControl.call(this, "edittext", parent, opts);
        // Real ScriptUI coerces an assigned .text to a string (e.g. et.text = 7
        // stores "7"). Model that with an accessor so gatherAll()'s
        // .text.replace(...) always sees a string.
        var _text = opts && opts.text != null ? String(opts.text) : "";
        Object.defineProperty(this, "text", {
            get: function () { return _text; },
            set: function (v) { _text = (v == null) ? "" : String(v); },
            enumerable: true,
            configurable: true
        });
    }
    MockEditText.prototype = Object.create(MockControl.prototype);

    function MockCheckbox(parent, opts) {
        MockControl.call(this, "checkbox", parent, opts);
        this.value = !!(opts && opts.value);
    }
    MockCheckbox.prototype = Object.create(MockControl.prototype);

    // Independent radio (see header note): no auto-exclusion.
    function MockRadioButton(parent, opts) {
        MockControl.call(this, "radiobutton", parent, opts);
        this.value = !!(opts && opts.value);
    }
    MockRadioButton.prototype = Object.create(MockControl.prototype);

    function MockButton(parent, opts) {
        MockControl.call(this, "button", parent, opts);
    }
    MockButton.prototype = Object.create(MockControl.prototype);

    function MockStatic(parent, opts) {
        MockControl.call(this, "statictext", parent, opts);
    }
    MockStatic.prototype = Object.create(MockControl.prototype);

    function MockPanel(parent, opts) {
        MockControl.call(this, "panel", parent, opts);
        this.text = opts && opts.text != null ? opts.text : "";
    }
    MockPanel.prototype = Object.create(MockControl.prototype);

    function MockGroup(parent, opts) {
        MockControl.call(this, "group", parent, opts);
    }
    MockGroup.prototype = Object.create(MockControl.prototype);

    function makeChild(kind, parent, args) {
        var label = "";
        var props = {};
        var initialItems = null;
        for (var i = 0; i < args.length; i++) {
            var a = args[i];
            if (typeof a === "string") {
                label = a;
            } else if (Array.isArray(a)) {
                initialItems = a;
            } else if (a && typeof a === "object") {
                props = a;
            }
        }
        var opts = { text: label, name: props.name };
        var ctrl;
        switch (kind) {
            case "panel":         ctrl = new MockPanel(parent, opts); break;
            case "group":         ctrl = new MockGroup(parent, opts); break;
            case "button":        ctrl = new MockButton(parent, opts); break;
            case "checkbox":      ctrl = new MockCheckbox(parent, opts); break;
            case "radiobutton":   ctrl = new MockRadioButton(parent, opts); break;
            case "edittext":      ctrl = new MockEditText(parent, opts); break;
            case "statictext":    ctrl = new MockStatic(parent, opts); break;
            case "dropdownlist":
            case "listbox":       ctrl = new MockDropDownList(parent, opts); break;
            default:              ctrl = new MockControl(kind, parent, opts);
        }
        if (initialItems && (kind === "dropdownlist" || kind === "listbox")) {
            for (var ii = 0; ii < initialItems.length; ii++) {
                ctrl.add("item", initialItems[ii]);
            }
        }
        return ctrl;
    }

    function MockWindow(kind, title) {
        MockControl.call(this, "window", null, { text: title });
        this.kind = kind;
        this.text = title || "";
        this.title = this.text;
        this.preferredSize = { width: -1, height: -1 };
        lastWindow = this;
    }
    MockWindow.prototype = Object.create(MockControl.prototype);

    function install() {
        var keys = ["Window", "ScriptUI", "$", "alert", "prompt", "confirm"];
        for (var i = 0; i < keys.length; i++) origGlobals[keys[i]] = global[keys[i]];
        global.Window = MockWindow;
        global.ScriptUI = {};
        if (!global.alert)   global.alert = function () {};
        if (!global.prompt)  global.prompt = function () { return null; };
        if (!global.confirm) global.confirm = function () { return false; };
        if (!global.$)       global.$ = { writeln: function () {} };
        lastWindow = null;
    }

    function uninstall() {
        for (var k in origGlobals) {
            if (origGlobals.hasOwnProperty(k)) {
                if (origGlobals[k] === undefined) delete global[k];
                else global[k] = origGlobals[k];
            }
        }
    }

    module.exports = {
        install: install,
        uninstall: uninstall,
        lastWindow: function () { return lastWindow; },
        MockWindow: MockWindow,
        MockControl: MockControl
    };
})();
