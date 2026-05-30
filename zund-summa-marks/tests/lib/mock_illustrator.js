/**
 * Mock Illustrator DOM for unit testing draw.js in Node.js.
 *
 * Capabilities:
 *   - Read-only traversal: getBounds, _measureLayer, _getEffectiveBounds
 *   - Mutation: layer add/remove, item creation (ellipse/rectangle/add),
 *     item move, name changes — sufficient for testing render() side effects
 *
 * NOT modeled:
 *   - C++ crash semantics
 *   - app.redraw timing / order of effects
 *   - Real ScriptUI behavior
 *   - Undo / redo state
 *
 * Usage:
 *   var Mock = require('./lib/mock_illustrator.js');
 *   Mock.install();
 *   var doc = Mock.buildDoc({ layers: [...] });
 *   global.app.activeDocument = doc;
 *   eval(...);  // load production code
 *   ZSM.Draw.render(geo, settings);
 *   Mock.uninstall();
 *
 * Mutation tracking: every doc keeps `doc._mutationLog` as an append-only
 * record of operations (add/remove/move/setName) for assertion in tests.
 */

(function () {
    "use strict";

    var nextId = 1;

    // ===== Helpers =====
    function arrayRemove(arr, item) {
        var i = arr.indexOf(item);
        if (i >= 0) arr.splice(i, 1);
        return i >= 0;
    }
    function logMutation(doc, op) {
        if (doc && doc._mutationLog) doc._mutationLog.push(op);
    }
    function findDoc(node) {
        while (node && node.typename !== "Document") node = node.parent;
        return node;
    }

    // ===== Mock collections =====
    /**
     * Builds a "live" collection wrapping a backing array.
     * Length and indexing reflect the array. Mutations on the array
     * are visible. Adds methods like getByName(), add().
     *
     * IMPORTANT: returns a fresh wrapper on each call. Tests that hold
     * a reference may go stale after mutations. Production code does
     * `for (var i = 0; i < x.length; i++)` per iteration which is safe
     * because length re-reads.
     */
    function wrapCollection(arr, opts) {
        opts = opts || {};
        var coll = arr.slice();   // snapshot — production reads length once at iteration start
        coll.getByName = function (name) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].name === name) return arr[i];
            }
            throw new Error("Not found: " + name);
        };
        if (opts.add)        coll.add        = opts.add;
        if (opts.ellipse)    coll.ellipse    = opts.ellipse;
        if (opts.rectangle)  coll.rectangle  = opts.rectangle;
        if (opts.removeAll)  coll.removeAll  = opts.removeAll;
        return coll;
    }

    // ===== Mock Layer =====
    function MockLayer(spec, parent) {
        spec = spec || {};
        this._id = nextId++;
        this.typename = "Layer";
        this.name = spec.name || "Layer";
        this.locked = !!spec.locked;
        this.visible = spec.visible !== false;
        this.parent = parent || null;

        // Backing storage — all mutations operate on these arrays
        this._items = [];      // direct child items (PathItem/GroupItem/CompoundPathItem)
        this._sublayers = [];

        // Build initial structure from spec
        var self = this;
        (spec.items || []).forEach(function (it) {
            self._items.push(makeItem(it, self));
        });
        (spec.sublayers || []).forEach(function (sl) {
            self._sublayers.push(new MockLayer(sl, self));
        });
    }

    /** Returns recursive list of all PageItems within this layer (incl. sublayers, groups). */
    MockLayer.prototype._allItems = function () {
        var all = [];
        for (var i = 0; i < this._items.length; i++) {
            all.push(this._items[i]);
            // Recurse into groups / compound paths
            collectChildren(this._items[i], all);
        }
        for (var si = 0; si < this._sublayers.length; si++) {
            var subItems = this._sublayers[si]._allItems();
            for (var sii = 0; sii < subItems.length; sii++) all.push(subItems[sii]);
        }
        return all;
    };
    function collectChildren(item, out) {
        if (item.typename === "GroupItem" && item._items) {
            for (var i = 0; i < item._items.length; i++) {
                out.push(item._items[i]);
                collectChildren(item._items[i], out);
            }
        }
        if (item.typename === "CompoundPathItem" && item._items) {
            for (var ci = 0; ci < item._items.length; ci++) out.push(item._items[ci]);
        }
    }

    // Use defineProperty for live getters
    Object.defineProperty(MockLayer.prototype, "pageItems", {
        get: function () {
            var items = this._allItems();
            var self = this;
            return wrapCollection(items, {
                ellipse: function (top, left, w, h) {
                    var p = new MockPathItem({
                        bounds: [left, top, left + w, top - h]
                    }, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path-ellipse", layer: self.name, bounds: p.geometricBounds });
                    return p;
                },
                rectangle: function (top, left, w, h) {
                    var p = new MockPathItem({
                        bounds: [left, top, left + w, top - h]
                    }, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path-rectangle", layer: self.name, bounds: p.geometricBounds });
                    return p;
                },
                add: function () {
                    var p = new MockPathItem({}, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path", layer: self.name });
                    return p;
                }
            });
        }
    });
    Object.defineProperty(MockLayer.prototype, "pathItems", {
        get: function () {
            var all = this._allItems().filter(function (i) { return i.typename === "PathItem"; });
            var self = this;
            return wrapCollection(all, {
                add: function () {
                    var p = new MockPathItem({}, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path", layer: self.name });
                    return p;
                },
                ellipse: function (top, left, w, h) {
                    var p = new MockPathItem({ bounds: [left, top, left + w, top - h] }, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path-ellipse", layer: self.name, bounds: p.geometricBounds });
                    return p;
                },
                rectangle: function (top, left, w, h) {
                    var p = new MockPathItem({ bounds: [left, top, left + w, top - h] }, self);
                    self._items.push(p);
                    logMutation(findDoc(self), { op: "add-path-rectangle", layer: self.name, bounds: p.geometricBounds });
                    return p;
                }
            });
        }
    });
    Object.defineProperty(MockLayer.prototype, "compoundPathItems", {
        get: function () {
            return wrapCollection(this._allItems().filter(function (i) { return i.typename === "CompoundPathItem"; }));
        }
    });
    Object.defineProperty(MockLayer.prototype, "groupItems", {
        get: function () {
            return wrapCollection(this._allItems().filter(function (i) { return i.typename === "GroupItem"; }));
        }
    });
    Object.defineProperty(MockLayer.prototype, "layers", {
        get: function () {
            var self = this;
            return wrapCollection(self._sublayers, {
                add: function () {
                    // Match AI: layers.add() inserts at top (index 0).
                    var newLay = new MockLayer({ name: "Layer " + (self._sublayers.length + 1) }, self);
                    self._sublayers.unshift(newLay);
                    logMutation(findDoc(self), { op: "add-sublayer", parent: self.name });
                    return newLay;
                }
            });
        }
    });

    MockLayer.prototype.remove = function () {
        var p = this.parent;
        if (!p) return;
        if (p._sublayers) {
            // Removing a sublayer
            arrayRemove(p._sublayers, this);
        } else if (p._layers) {
            // Removing a top-level doc layer
            arrayRemove(p._layers, this);
        }
        logMutation(findDoc(p), { op: "remove-layer", name: this.name });
    };
    MockLayer.prototype.move = function () {};   // stub for reorder
    MockLayer.prototype.zOrder = function (method) {
        logMutation(findDoc(this.parent), { op: "zOrder", layer: this.name, method: method });
    };

    // ===== Mock Items =====
    function MockPathItem(spec, parent) {
        spec = spec || {};
        this._id = nextId++;
        this.typename = "PathItem";
        this.name = spec.name || "";
        this.parent = parent || null;
        this.geometricBounds = spec.bounds || [0, 0, 0, 0];
        this.guides = !!spec.guides;
        this.filled = spec.filled !== false;
        this.stroked = !!spec.stroked;
        this.fillOverprint = false;
        this.strokeOverprint = false;
        this.strokeWidth = spec.strokeWidth || 0;
        // Default colors: CMYK black if no spot specified — never null, since
        // production code reads .typename without null-checks (matches AI behavior).
        this.fillColor = spec.fillColor
            || (spec.spot ? makeSpotColor(spec.spot) : { typename: "CMYKColor", cyan: 0, magenta: 0, yellow: 0, black: 100 });
        this.strokeColor = spec.strokeColor
            || (spec.strokeSpot ? makeSpotColor(spec.strokeSpot) : { typename: "CMYKColor", cyan: 0, magenta: 0, yellow: 0, black: 100 });
    }
    /** `.layer` returns nearest enclosing Layer (matches AI semantics). */
    Object.defineProperty(MockPathItem.prototype, "layer", {
        get: function () { return findEnclosingLayer(this); }
    });
    function findEnclosingLayer(item) {
        var p = item.parent;
        while (p) {
            if (p.typename === "Layer") return p;
            p = p.parent;
        }
        return null;
    }
    MockPathItem.prototype.move = function (target, placement) {
        var oldParent = this.parent;
        // Remove from old parent
        if (oldParent && oldParent._items) arrayRemove(oldParent._items, this);
        // Add to new parent
        if (target && target._items) target._items.push(this);
        this.parent = target;
        logMutation(findDoc(target), { op: "move-item", from: oldParent && oldParent.name, to: target && target.name });
    };
    MockPathItem.prototype.remove = function () {
        if (this.parent && this.parent._items) arrayRemove(this.parent._items, this);
        logMutation(findDoc(this.parent), { op: "remove-item", layer: this.parent && this.parent.name });
    };
    MockPathItem.prototype.setEntirePath = function (points) {
        // Update bounds from points
        if (!points || !points.length) return;
        var l = points[0][0], t = points[0][1], r = l, b = t;
        for (var i = 1; i < points.length; i++) {
            var x = points[i][0], y = points[i][1];
            if (x < l) l = x; if (x > r) r = x;
            if (y > t) t = y; if (y < b) b = y;
        }
        this.geometricBounds = [l, t, r, b];
    };
    MockPathItem.prototype.zOrder = function () {};

    function MockCompoundPathItem(spec, parent) {
        spec = spec || {};
        this._id = nextId++;
        this.typename = "CompoundPathItem";
        this.name = spec.name || "";
        this.parent = parent || null;
        this.geometricBounds = spec.bounds || [0, 0, 0, 0];
        this.guides = !!spec.guides;
        this._items = [];
        var self = this;
        (spec.children || []).forEach(function (c) {
            self._items.push(makeItem(c, self));
        });
    }
    Object.defineProperty(MockCompoundPathItem.prototype, "layer", {
        get: function () { return findEnclosingLayer(this); }
    });
    Object.defineProperty(MockCompoundPathItem.prototype, "pathItems", {
        get: function () { return wrapCollection(this._items); }
    });
    MockCompoundPathItem.prototype.move = function (target) {
        if (this.parent && this.parent._items) arrayRemove(this.parent._items, this);
        if (target && target._items) target._items.push(this);
        this.parent = target;
        logMutation(findDoc(target), { op: "move-compound", to: target && target.name });
    };
    MockCompoundPathItem.prototype.remove = function () {
        if (this.parent && this.parent._items) arrayRemove(this.parent._items, this);
    };

    function MockGroupItem(spec, parent) {
        spec = spec || {};
        this._id = nextId++;
        this.typename = "GroupItem";
        this.name = spec.name || "";
        this.parent = parent || null;
        this.clipped = !!spec.clipped;
        this.geometricBounds = spec.bounds || [0, 0, 0, 0];
        this.guides = false;
        this._items = [];
        var self = this;
        (spec.children || []).forEach(function (c) {
            self._items.push(makeItem(c, self));
        });
    }
    Object.defineProperty(MockGroupItem.prototype, "layer", {
        get: function () { return findEnclosingLayer(this); }
    });
    Object.defineProperty(MockGroupItem.prototype, "pageItems", {
        get: function () { return wrapCollection(this._items); }
    });
    Object.defineProperty(MockGroupItem.prototype, "pathItems", {
        get: function () {
            return wrapCollection(this._items.filter(function (i) { return i.typename === "PathItem"; }));
        }
    });
    MockGroupItem.prototype.move = function () {};
    MockGroupItem.prototype.remove = function () {
        if (this.parent && this.parent._items) arrayRemove(this.parent._items, this);
    };

    function makeItem(spec, parent) {
        switch (spec.type) {
            case "path":     return new MockPathItem(spec, parent);
            case "compound": return new MockCompoundPathItem(spec, parent);
            case "group":    return new MockGroupItem(spec, parent);
            default: throw new Error("makeItem: unknown spec.type: " + spec.type);
        }
    }
    function makeSpotColor(name) {
        return { typename: "SpotColor", spot: { name: name || "" }, tint: 100 };
    }

    // ===== Mock Document =====
    function MockDocument(spec) {
        spec = spec || {};
        this._id = nextId++;
        this.typename = "Document";
        this.parent = null;
        this.scaleFactor = spec.scaleFactor || 1;
        this._layers = [];
        this._mutationLog = [];   // append-only operation log

        var self = this;
        (spec.layers || []).forEach(function (l) {
            self._layers.push(new MockLayer(l, self));
        });

        // Artboards
        this.artboards = [{ artboardRect: spec.artboardRect || [0, 100, 100, 0] }];
        this.artboards.getActiveArtboardIndex = function () { return 0; };

        // Spots / swatches
        this.spots = wrapCollection(spec.spots || [], {
            add: function () {
                var s = { typename: "Spot", name: "", color: {}, colorType: null };
                self.spots.push(s);
                return s;
            }
        });
        this.swatches = wrapCollection(
            [{ name: "[None]" }, { name: "[Registration]", color: {} }].concat(spec.swatches || []),
            {
                add: function () { var s = {}; self.swatches.push(s); return s; }
            }
        );

        this.selection = null;
        this.activeLayer = this._layers[0] || null;
        this.rulerOrigin = [0, 0];
    }
    Object.defineProperty(MockDocument.prototype, "layers", {
        get: function () {
            var self = this;
            return wrapCollection(self._layers, {
                add: function () {
                    // In Illustrator, `app.activeDocument.layers.add()` inserts
                    // the new layer at the TOP of the stack (index 0). The
                    // bottom-most layer (highest index) is the artwork layer.
                    var newLay = new MockLayer({ name: "Layer " + (self._layers.length + 1) }, self);
                    self._layers.unshift(newLay);
                    logMutation(self, { op: "add-toplevel-layer" });
                    return newLay;
                }
            });
        }
    });
    Object.defineProperty(MockDocument.prototype, "pageItems", {
        get: function () {
            var all = [];
            for (var i = 0; i < this._layers.length; i++) {
                var li = this._layers[i]._allItems();
                for (var j = 0; j < li.length; j++) all.push(li[j]);
            }
            return wrapCollection(all);
        }
    });
    Object.defineProperty(MockDocument.prototype, "pathItems", {
        get: function () {
            var all = [];
            for (var i = 0; i < this._layers.length; i++) {
                var li = this._layers[i]._allItems();
                for (var j = 0; j < li.length; j++) {
                    if (li[j].typename === "PathItem") all.push(li[j]);
                }
            }
            return wrapCollection(all);
        }
    });
    Object.defineProperty(MockDocument.prototype, "compoundPathItems", {
        get: function () {
            var all = [];
            for (var i = 0; i < this._layers.length; i++) {
                var li = this._layers[i]._allItems();
                for (var j = 0; j < li.length; j++) {
                    if (li[j].typename === "CompoundPathItem") all.push(li[j]);
                }
            }
            return wrapCollection(all);
        }
    });

    function buildDoc(spec) { return new MockDocument(spec); }

    // ===== Globals install / uninstall =====
    var origGlobals = {};
    function install() {
        var keys = ["app", "Layer", "GroupItem", "PathItem", "CompoundPathItem",
                    "ZOrderMethod", "ElementPlacement", "CMYKColor", "SpotColor"];
        for (var i = 0; i < keys.length; i++) {
            origGlobals[keys[i]] = global[keys[i]];
        }

        global.app = {
            documents: { length: 1 },
            activeDocument: null,
            executeMenuCommand: function () {},
            redraw: function () {},
            locale: "en_US"
        };
        global.ZOrderMethod = {
            BRINGTOFRONT: "BRINGTOFRONT",
            SENDTOBACK:   "SENDTOBACK",
            BRINGFORWARD: "BRINGFORWARD",
            SENDBACKWARD: "SENDBACKWARD"
        };
        global.ElementPlacement = {
            PLACEAFTER:  "PLACEAFTER",
            PLACEBEFORE: "PLACEBEFORE",
            PLACEATEND:  "PLACEATEND",
            PLACEATBEGINNING: "PLACEATBEGINNING"
        };
        global.CMYKColor = function () {
            this.typename = "CMYKColor";
            this.cyan = this.magenta = this.yellow = this.black = 0;
        };
        global.SpotColor = function () {
            this.typename = "SpotColor";
            this.spot = null;
            this.tint = 100;
        };
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
        buildDoc: buildDoc,
        MockLayer: MockLayer,
        MockPathItem: MockPathItem,
        MockGroupItem: MockGroupItem,
        MockCompoundPathItem: MockCompoundPathItem
    };
})();
