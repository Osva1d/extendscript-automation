/**
 * Mock ScriptUI for structural testing of ui.js dialog layouts.
 *
 * Records the tree of controls (Window > Panel > Group > Button/EditText/...)
 * with all their layout-relevant properties: margins, spacing, alignment,
 * preferredSize, helpTip, name, text, value. Does NOT render or simulate
 * pixel layout — for that you'd need a real OS dialog.
 *
 * Usage:
 *   var SUI = require('./lib/mock_scriptui.js');
 *   SUI.install();
 *   // load ui.js (and its deps), call ZSM.UI.show(pData)
 *   var w = SUI.lastWindow();   // captured root window
 *   // assert on w.children, w.margins, etc.
 *   SUI.uninstall();
 */

(function () {
    "use strict";

    var lastWindow = null;
    var origGlobals = {};

    // Common control base — all properties used by ui.js are pre-declared
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

        // Event handlers
        this.onClick = null;
        this.onChange = null;
        this.onChanging = null;

        // Stub layout API (ui.js calls w.layout.layout(true))
        this.layout = {
            layout: function () {},
            resize: function () {}
        };
    }

    MockControl.prototype.add = function (childType /*, label, props*/) {
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

    MockControl.prototype.show = function () {
        // No-op — must return without blocking. Real ScriptUI is modal but
        // for structural tests we never wait. buildDialog returns immediately
        // with null (result is unset until btnOk fires, which we don't trigger).
        return 0;
    };
    MockControl.prototype.close = function () {};
    MockControl.prototype.hide = function () {};

    /** Returns descendants matching predicate (for assertions). */
    MockControl.prototype.find = function (predicate) {
        var hits = [];
        function walk(c) {
            if (predicate(c)) hits.push(c);
            for (var i = 0; i < c.children.length; i++) walk(c.children[i]);
        }
        walk(this);
        return hits;
    };
    /** First descendant matching predicate, or null. */
    MockControl.prototype.findOne = function (predicate) {
        var r = this.find(predicate);
        return r.length > 0 ? r[0] : null;
    };

    // ===== Specialized controls =====
    function MockDropDownList(parent, opts) {
        MockControl.call(this, "dropdownlist", parent, opts);
        this.items = [];        // ListItem array
        var self = this;
        // Real ScriptUI resolves `selection = <index>` to the ListItem object
        // (and accepts a ListItem directly, or null). Mirror that so ddlValue()
        // reads the selected item's text / _zsmRawValue, not a bare index number.
        var _sel = null;
        Object.defineProperty(this, "selection", {
            configurable: true, enumerable: true,
            get: function () { return _sel; },
            set: function (v) {
                if (v === null || v === undefined) { _sel = null; }
                else if (typeof v === "number") { _sel = self.items[v] || null; }
                else { _sel = v; }
            }
        });
        this.add = function (kind, label) {
            if (kind === "item") {
                var item = { type: "listitem", text: label, index: self.items.length };
                self.items.push(item);
                return item;
            }
            // fallback to generic add (shouldn't happen for ddl)
            return MockControl.prototype.add.call(self, kind, label);
        };
        this.removeAll = function () { self.items = []; self.selection = null; };
    }
    MockDropDownList.prototype = Object.create(MockControl.prototype);

    function MockEditText(parent, opts) {
        MockControl.call(this, "edittext", parent, opts);
        this.text = opts && opts.text != null ? String(opts.text) : "";
    }
    MockEditText.prototype = Object.create(MockControl.prototype);

    function MockCheckbox(parent, opts) {
        MockControl.call(this, "checkbox", parent, opts);
        this.value = !!(opts && opts.value);
    }
    MockCheckbox.prototype = Object.create(MockControl.prototype);

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
        this.text = opts && opts.text != null ? opts.text : "";   // panel title
    }
    MockPanel.prototype = Object.create(MockControl.prototype);

    function MockGroup(parent, opts) {
        MockControl.call(this, "group", parent, opts);
    }
    MockGroup.prototype = Object.create(MockControl.prototype);

    /**
     * Factory: dispatches `add(kind, label, props)` to specialized constructors.
     * ScriptUI signature: add(kind, bounds_or_undefined, text, props) for most;
     * dropdownlist passes an array of items as 3rd arg. We accept all variants.
     */
    function makeChild(kind, parent, args) {
        // ScriptUI .add() signatures vary:
        //   add(kind)
        //   add(kind, bounds, text)
        //   add(kind, bounds, text, props)
        //   add(kind, bounds, items[]) for dropdownlist
        // We extract a label/text, items array (for dropdowns), and optional props.
        var label = "";
        var props = {};
        var initialItems = null;
        for (var i = 0; i < args.length; i++) {
            var a = args[i];
            if (typeof a === "string") {
                label = a;
            } else if (Array.isArray(a)) {
                initialItems = a;       // dropdown items
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
        // Populate dropdown items from add(...) third arg array
        if (initialItems && (kind === "dropdownlist" || kind === "listbox")) {
            for (var ii = 0; ii < initialItems.length; ii++) {
                ctrl.add("item", initialItems[ii]);
            }
        }
        return ctrl;
    }

    /** Mock Window constructor — captured as last-built window. */
    function MockWindow(kind, title, bounds, props) {
        MockControl.call(this, "window", null, { text: title });
        this.kind = kind;            // "dialog" / "palette"
        this.text = title || "";
        this.title = this.text;
        this.preferredSize = { width: -1, height: -1 };
        lastWindow = this;
    }
    MockWindow.prototype = Object.create(MockControl.prototype);

    // ===== Install / Uninstall =====
    function install() {
        ["Window", "ScriptUI", "$", "alert", "prompt", "confirm"].forEach(function (k) {
            origGlobals[k] = global[k];
        });
        global.Window = MockWindow;
        global.ScriptUI = {};
        // alert/prompt/confirm — no-op stubs returning safe defaults
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

    function getLastWindow() { return lastWindow; }

    module.exports = {
        install: install,
        uninstall: uninstall,
        lastWindow: getLastWindow,
        MockWindow: MockWindow,
        MockControl: MockControl
    };
})();
