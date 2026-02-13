/*
 * ===========================================================================
 * Script:      Illustrator Zund & Summa Marks
 * Version:     26.3.0
 * Author:      Osva1d
 * Updated:     2026-02-13
 *
 * Description:
 *   Registration marks generator for Zund/Summa cutting tables.
 * ===========================================================================
 */

#target illustrator

// --- JSON POLYFILL (ES3) ---
if (typeof JSON !== "object") {
  JSON = {};
  (function () {
    var rx_one = /^[\],:{}\s]*$/,
      rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
      rx_three =
        /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
      rx_four = /(?:^|:|,)(?:\s*\[)+/g,
      rx_escapable =
        /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      rx_dangerous =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    function f(n) {
      return n < 10 ? "0" + n : n;
    }
    function quote(string) {
      rx_escapable.lastIndex = 0;
      return rx_escapable.test(string)
        ? '"' +
            string.replace(rx_escapable, function (a) {
              var c = meta[a];
              return typeof c === "string"
                ? c
                : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"'
        : '"' + string + '"';
    }
    function str(key, holder) {
      var i,
        k,
        v,
        length,
        mind = gap,
        partial,
        value = holder[key];
      if (
        value &&
        typeof value === "object" &&
        typeof value.toJSON === "function"
      ) {
        value = value.toJSON(key);
      }
      if (typeof value === "string") {
        return quote(value);
      }
      if (typeof value === "number") {
        return isFinite(value) ? String(value) : "null";
      }
      if (typeof value === "boolean" || value === null) {
        return String(value);
      }
      if (value && typeof value === "object") {
        gap += indent;
        partial = [];
        if (Object.prototype.toString.apply(value) === "[object Array]") {
          length = value.length;
          for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value) || "null";
          }
          v =
            partial.length === 0
              ? "[]"
              : gap
                ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
                : "[" + partial.join(",") + "]";
          gap = mind;
          return v;
        }
        for (k in value) {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            v = str(k, value);
            if (v) {
              partial.push(quote(k) + (gap ? ": " : ":") + v);
            }
          }
        }
        v =
          partial.length === 0
            ? "{}"
            : gap
              ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
              : "{" + partial.join(",") + "}";
        gap = mind;
        return v;
      }
    }
    var meta = {
      "\b": "\\b",
      "\t": "\\t",
      "\n": "\\n",
      "\f": "\\f",
      "\r": "\\r",
      '"': '\\"',
      "\\": "\\\\",
    };
    var gap, indent;
    JSON.stringify = function (value, replacer, space) {
      var i;
      gap = "";
      indent = "";
      if (typeof space === "number") {
        for (i = 0; i < space; i += 1) {
          indent += " ";
        }
      } else if (typeof space === "string") {
        indent = space;
      }
      if (
        !replacer ||
        typeof replacer === "function" ||
        (typeof replacer === "object" && typeof replacer.length === "number")
      ) {
        return str("", { "": value });
      }
      throw new Error("JSON.stringify");
    };
    JSON.parse = function (text, reviver) {
      var j;
      function walk(holder, key) {
        var k,
          v,
          value = holder[key];
        if (value && typeof value === "object") {
          for (k in value) {
            if (Object.prototype.hasOwnProperty.call(value, k)) {
              v = walk(value, k);
              if (v !== undefined) {
                value[k] = v;
              } else {
                delete value[k];
              }
            }
          }
        }
        return reviver.call(holder, key, value);
      }
      text = String(text);
      rx_dangerous.lastIndex = 0;
      if (rx_dangerous.test(text)) {
        text = text.replace(rx_dangerous, function (a) {
          return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        });
      }
      if (
        rx_one.test(
          text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""),
        )
      ) {
        j = eval("(" + text + ")");
        return typeof reviver === "function" ? walk({ "": j }, "") : j;
      }
      throw new SyntaxError("JSON.parse");
    };
  })();
}

var PMA = PMA || {};

PMA.Utils = {
    /**
     * Converts millimeters to points.
     * @param {number} mm - Value in millimeters.
     * @returns {number} Value in points.
     */
    mm2pt: function(mm) { return mm * 2.83464567; },

    /**
     * Converts points to millimeters.
     * @param {number} pt - Value in points.
     * @returns {number} Value in millimeters.
     */
    pt2mm: function(pt) { return pt / 2.83464567; },
    
    /**
     * Retrieves the scale factor of the active document (handling Large Canvas).
     * @returns {number} Scale factor (1 or 10).
     */
    getSF: function() {
        try {
            if (app.documents.length === 0) return 1;
            return app.activeDocument.scaleFactor || 1;
        } catch(e) {
            return 1;
        }
    },
    
    /**
     * Validates a numerical input within a range.
     * @param {string|number} val - The value to validate.
     * @param {number} min - Minimum allowed value.
     * @param {number} max - Maximum allowed value.
     * @param {string} name - Display name for error messages.
     * @returns {number|null} Validated number or null if invalid.
     */
    validateNumber: function(val, min, max, name) {
        var n = Number(val);
        if (isNaN(n)) {
            alert(name + " mus\u00ED b\u00FDt \u010D\u00EDslo!");
            return null;
        }
        if (n < min || n > max) {
            alert(name + " mus\u00ED b\u00FDt mezi " + min + " a " + max + "!");
            return null;
        }
        return n;
    },

    log: function(msg) {
        if (PMA.Config && PMA.Config.debug) {
            $.writeln("[PMA] " + msg);
        }
    },
    
    error: function(msg) {
        alert("CHYBA: " + msg);
    }
};

var PMA = PMA || {};

PMA.Config = {
  scriptName: "Zund & Summa Automation",
  zundSize: 5,
  summaSize: 3,
  orientDist: 100,
  hybridGap: 5,
  summaXCenter: 10, // 10mm from graph edge to MARK CENTER
  summaYVisual: 10, // 10mm gap graph edge to MARK EDGE
  redLineWidth: 1, // 1pt
  rulerBuffer: 0.1,
  debug: false,

  ui: {
    title: "PMA v26.3 Unified",
    labels: {
      gapGZ: "Mezera od grafiky:",
      gapZO: "Mezera od okraje:",
      maxDist: "Rozte\u010D zna\u010Dek:",
      feedTop: "Horn\u00ED v\u00FDjezd (Top):",
      feedBottom: "Spodn\u00ED n\u00E1jezd (Bottom):",
      redLines: "P\u0159idat o\u0159ezov\u00E9 linky",
      markSizeZ: "Velikost Z\u00FCnd:",
      markSizeS: "Velikost Summa:",
      markColor: "Barva zna\u010Dek (Spot):",
    },
  },

  getDefaults: function () {
    return {
      mode: "ZUND",
      gapInner: 10,
      gapOuter: 0,
      maxDist: 400,
      feedTop: 70,
      feedBottom: 50,
      drawRed: false,
      thruActive: true,
      thruName: "cut",
      kissActive: false,
      kissName: "",
      useArtboardBounds: false,
      markSizeZ: 5,
      markSizeS: 3,
      markColor: "[Registration]",
    };
  },

  Storage: {
    getFile: function () {
      var f = new Folder(Folder.userData + "/PMA");
      if (!f.exists) f.create();
      return new File(f.fsName + "/settings_v26_3.json");
    },
    save: function (d) {
      var f = this.getFile();
      f.open("w");
      f.encoding = "UTF-8";
      f.write(JSON.stringify(d));
      f.close();
    },
    load: function () {
      var f = this.getFile();
      if (!f.exists) return null;
      try {
        f.open("r");
        var c = f.read();
        f.close();
        if (!c) return null;
        
        var data = JSON.parse(c);
        // FIX AUD-10: Merge with defaults to ensure new properties exist
        var defaults = PMA.Config.getDefaults();
        for (var k in defaults) {
            if (defaults.hasOwnProperty(k) && typeof data[k] === "undefined") {
                data[k] = defaults[k];
            }
        }
        return data;
      } catch (e) {
        return null;
      }
    },
  },
};

var PMA = PMA || {};

PMA.Core = {
    /** @type {number} SUMMA_BAR_OFFSET - mm: Distance from bottom edge to bar centerline */
    SUMMA_BAR_OFFSET: 11.5,
    /** @type {number} SUMMA_BAR_WIDTH - mm: Thickness of the Summa barcode/bar */
    SUMMA_BAR_WIDTH: 3,
    
    /**
     * Calculates all registration mark and artboard coordinates.
     * @param {Object} s - Settings from UI.
     * @param {Array} b - Bounds [L, T, R, B].
     * @returns {Object} Geometry object with marks, ab, and warnings.
     */
    calculateAll: function(s, b) {
        var cfg = PMA.Config; 
        var sf = PMA.Utils.getSF(); // Large Canvas handling (1.0 or 10.0)
        
        // Normalize physical constants by scaleFactor for Document Space
        var rZ = (s.markSizeZ / 2) / sf;
        var rS = (s.markSizeS / 2) / sf;
        var offSX = cfg.summaXCenter / sf; 
        var offSY = (cfg.summaYVisual / sf) + rS; 
        
        var gapI = s.gapInner / sf;
        var gapO = s.gapOuter / sf;
        var hGap = cfg.hybridGap / sf;
        
        // CORRECTION V26.3.3: Symmetric Hybrid Offsets
        // Zund marks should be spaced from Summa marks by hGap + radii
        var offZX = (s.mode === "ZUND") ? (gapI + rZ) : (offSX + rS + hGap + rZ);
        // For Y, use the same visual spacing logic as X to keep it symmetric relative to the corner
        var offZY = (s.mode === "ZUND") ? (gapI + rZ) : (offSY + rS + hGap + rZ);

        var outX = (s.mode !== "SUMMA") ? offZX : offSX;
        var outY = (s.mode !== "SUMMA") ? offZY : offSY;
        var rMax = (s.mode !== "SUMMA") ? rZ : rS;

        var gL=b[0], gT=b[1], gR=b[2], gB=b[3];
        var gW=gR-gL, gH=gT-gB;
        var gCx=(gL+gR)/2, gCy=(gT+gB)/2;

        var markTopY = gT + PMA.Utils.mm2pt(outY); 
        var markBotY = gB - PMA.Utils.mm2pt(outY); 
        
        var feedT = (s.mode !== "ZUND") ? (s.feedTop / sf) : gapO;
        var feedB = (s.mode !== "ZUND") ? (s.feedBottom / sf) : gapO;
        
        var abTop = markTopY + PMA.Utils.mm2pt(rMax) + PMA.Utils.mm2pt(feedT); 
        var abBot = markBotY - PMA.Utils.mm2pt(rMax) - PMA.Utils.mm2pt(feedB);

        // Required physical half-width in mm
        var reqHalfW_mm = PMA.Utils.pt2mm(gW/2)*sf + (outX + rMax + gapO)*sf;
        var abW_mm = Math.ceil(reqHalfW_mm * 2); 
        var abH_mm = Math.ceil(PMA.Utils.pt2mm(abTop - abBot) * sf);
        
        var finalW = PMA.Utils.mm2pt(abW_mm / sf);
        var finalH = PMA.Utils.mm2pt(abH_mm / sf);
        
        var abRect;
        if (s.useArtboardBounds) {
            abRect = b; 
        } else {
            abRect = [
                gCx - finalW/2, 
                gCy + finalH/2,
                gCx + finalW/2,
                gCy - finalH/2
            ];
        }

        var res = { marksZ: [], marksS: [], barS: null, red: [], ab: abRect, warnings: [] };
        
        if(s.mode !== "SUMMA") {
            var xL, xR, yT, yB;
            if(s.useArtboardBounds) {
                var distFromEdge = gapO + rZ;
                xL = gL + PMA.Utils.mm2pt(distFromEdge); xR = gR - PMA.Utils.mm2pt(distFromEdge);
                yT = gT - PMA.Utils.mm2pt(distFromEdge); yB = gB + PMA.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - PMA.Utils.mm2pt(offZX); xR = gR + PMA.Utils.mm2pt(offZX);
                yT = gT + PMA.Utils.mm2pt(offZY); yB = gB - PMA.Utils.mm2pt(offZY);
            }
            
            res.marksZ.push({cx:xL, cy:yB}, {cx:xL, cy:yT}, {cx:xR, cy:yT}, {cx:xR, cy:yB});
            res.marksZ.push({cx:xL + PMA.Utils.mm2pt((cfg.orientDist + s.markSizeZ)/sf), cy:yB});
            this.addSteps(res.marksZ, xL, yB, xL, yT, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksZ, xL, yT, xR, yT, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksZ, xR, yT, xR, yB, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksZ, xR, yB, xL, yB, PMA.Utils.mm2pt(s.maxDist/sf));
        }

        if(s.mode !== "ZUND") {
            var xL, xR, yT, yB;
            if(s.useArtboardBounds) {
                var distFromEdge = gapO + rS;
                xL = gL + PMA.Utils.mm2pt(distFromEdge); xR = gR - PMA.Utils.mm2pt(distFromEdge);
                yT = gT - PMA.Utils.mm2pt(distFromEdge); yB = gB + PMA.Utils.mm2pt(distFromEdge);
            } else {
                xL = gL - PMA.Utils.mm2pt(offSX); xR = gR + PMA.Utils.mm2pt(offSX);
                yT = gT + PMA.Utils.mm2pt(offSY); yB = gB - PMA.Utils.mm2pt(offSY);
            }
            
            res.marksS.push({cx:xL, cy:yB}, {cx:xL, cy:yT}, {cx:xR, cy:yT}, {cx:xR, cy:yB});
            this.addSteps(res.marksS, xL, yB, xL, yT, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksS, xL, yT, xR, yT, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksS, xR, yT, xR, yB, PMA.Utils.mm2pt(s.maxDist/sf));
            this.addSteps(res.marksS, xR, yB, xL, yB, PMA.Utils.mm2pt(s.maxDist/sf));
            
            var barY = gB - PMA.Utils.mm2pt(this.SUMMA_BAR_OFFSET / sf); 
            res.barS = { x1: gL, x2: gR, y: barY, w: PMA.Utils.mm2pt(this.SUMMA_BAR_WIDTH / sf) };
        }

        if(s.mode !== "ZUND" && s.drawRed) {
            var sw = cfg.redLineWidth / sf; 
            var half = sw/2;
            res.red.push({x1:abRect[0], y1:abRect[1]-half, x2:abRect[2], y2:abRect[1]-half, w:sw});
            res.red.push({x1:abRect[0], y1:abRect[3]+half, x2:abRect[2], y2:abRect[3]+half, w:sw});
        }

        return res;
    },

    /**
     * Adds intermediate marks if distance exceeds maximum.
     * @param {Array} arr - Array to push marks to.
     * @param {number} x1 - Start X.
     * @param {number} y1 - Start Y.
     * @param {number} x2 - End X.
     * @param {number} y2 - End Y.
     * @param {number} max - Maximum allowed distance.
     */
    addSteps: function(arr, x1, y1, x2, y2, max) {
        var dx=x2-x1, dy=y1-y2, d=Math.sqrt(dx*dx+dy*dy);
        if(max>0 && d>max){ var s=Math.ceil(d/max); for(var i=1;i<s;i++) arr.push({cx:x1+(dx/s*i), cy:y1-(dy/s*i)}); }
    }
};

var PMA = PMA || {};

PMA.Draw = {
  /** @type {Array} AUTO_SPOT_COLOR - CMYK values for automatically created spots */
  AUTO_SPOT_COLOR: [0, 100, 0, 0],

  /** @private @type {Array} _lockedLayers - Storage for session lock state */
  _lockedLayers: [],

  /**
   * Captures and clears layer locks for the current session.
   */
  beginSession: function () {
    var doc = app.activeDocument;
    this._lockedLayers = [];
    for (var i = 0; i < doc.layers.length; i++) {
      try {
        if (doc.layers[i].locked) {
          this._lockedLayers.push(doc.layers[i].name);
          doc.layers[i].locked = false;
        }
        doc.layers[i].visible = true;
      } catch (e) {
        PMA.Utils.log("Failed to unlock layer: " + doc.layers[i].name);
      }
    }
  },

  /**
   * Restores layer locks captured at the beginning of the session.
   */
  endSession: function () {
    var doc = app.activeDocument;
    for (var i = 0; i < this._lockedLayers.length; i++) {
      try {
        doc.layers.getByName(this._lockedLayers[i]).locked = true;
      } catch (e) {}
    }
    this._lockedLayers = [];
  },

  /**
   * Calculates combined geometric bounds of selection or active artboard.
   * @param {Object} s - UI settings.
   * @returns {Array|null} [L, T, R, B] or null.
   */
  getBounds: function (s) {
    var doc = app.activeDocument;
    var sf = PMA.Utils.getSF();

    if (s && s.useArtboardBounds) {
      var activeArtboard =
        doc.artboards[doc.artboards.getActiveArtboardIndex()];
      return activeArtboard.artboardRect;
    }

    var sel = doc.selection;
    var items;
    if (sel && sel.length > 0) {
      items = sel;
    } else {
      // If no selection, check all visible pageItems except Regmarks
      items = doc.pageItems;
    }

    if (!items || items.length === 0) return null;

    var b = [Infinity, -Infinity, -Infinity, Infinity],
      f = false;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      // Skip regmarks (locked layers are already unlocked by beginSession)
      if (item.layer && item.layer.name === "Regmarks") continue;

      var g = item.geometricBounds;

      // Robust Mask Detection
      if (item.typename === "GroupItem" && item.clipped) {
        try {
          for (var c = 0; c < item.pageItems.length; c++) {
            if (item.pageItems[c].isClipMask) {
              g = item.pageItems[c].geometricBounds;
              break;
            }
          }
        } catch (e) {}
      }
      if (g) {
        b[0] = Math.min(b[0], g[0]);
        b[1] = Math.max(b[1], g[1]);
        b[2] = Math.max(b[2], g[2]);
        b[3] = Math.min(b[3], g[3]);
        f = true;
      }
    }
    return f ? b : null;
  },

  /**
   * Performs final layout and rendering of all marks and lines.
   * @param {Object} geo - Geometry from Core.
   * @param {Object} s - UI settings.
   */
  render: function (geo, s) {
    var doc = app.activeDocument;

    try {
      if (!s.useArtboardBounds) {
        var activeIdx = doc.artboards.getActiveArtboardIndex();
        doc.artboards[activeIdx].artboardRect = geo.ab;
      }

      var reg = this.getLay("Regmarks");
      reg.zOrder(ZOrderMethod.BRINGTOFRONT);
      var refLayer = reg;

      // Layer Mapping - Thru-cut
      if (s.thruActive && s.thruName) {
        var thru = this.getLay("Thru-cut");
        var hit = this.movePaths(thru, [s.thruName]);
        if (!hit)
          geo.warnings.push("Nenalezena barva pro Thru-cut: " + s.thruName);
        thru.move(refLayer, ElementPlacement.PLACEAFTER);
        refLayer = thru;
      }

      // Layer Mapping - Kiss-cut
      if (s.kissActive && s.kissName) {
        var kiss = this.getLay("Kiss-cut");
        var hit = this.movePaths(kiss, [s.kissName]);
        if (!hit)
          geo.warnings.push("Nenalezena barva pro Kiss-cut: " + s.kissName);
        kiss.move(refLayer, ElementPlacement.PLACEAFTER);
      }

      var col = this.getCol(s.markColor);
      doc.activeLayer = reg;

      // 2. Snapshot Pattern / Avoid Live Collection Trap
      var sf = PMA.Utils.getSF();
      var zSize = (Number(s.markSizeZ) || 5.0) / sf;
      var rZ = PMA.Utils.mm2pt(zSize / 2);

      var marksZ = [];
      for (var i = 0; i < geo.marksZ.length; i++) marksZ.push(geo.marksZ[i]);

      for (var z = 0; z < marksZ.length; z++) {
        var m = marksZ[z];
        try {
          var c = reg.pathItems.ellipse(m.cy + rZ, m.cx - rZ, rZ * 2, rZ * 2);
          c.fillColor = col;
          c.stroked = false;
        } catch (e) {
          PMA.Utils.log("Failed to draw Zund mark at index " + z);
        }
      }

      var sSize = (Number(s.markSizeS) || 3.0) / sf;
      var rS = PMA.Utils.mm2pt(sSize / 2);

      var marksS = [];
      for (var i = 0; i < geo.marksS.length; i++) marksS.push(geo.marksS[i]);

      for (var sm = 0; sm < marksS.length; sm++) {
        var m = marksS[sm];
        try {
          var q = reg.pathItems.rectangle(m.cy + rS, m.cx - rS, rS * 2, rS * 2);
          q.fillColor = col;
          q.stroked = false;
        } catch (e) {
          PMA.Utils.log("Failed to draw Summa mark at index " + sm);
        }
      }

      if (geo.barS) {
        try {
          var l = reg.pathItems.add();
          l.setEntirePath([
            [geo.barS.x1, geo.barS.y],
            [geo.barS.x2, geo.barS.y],
          ]);
          l.strokeColor = col;
          l.strokeWidth = geo.barS.w;
          l.filled = false;
        } catch (e) {}
      }

      // Standardize Bottom Layer (Graphics) and Draw Red Lines
      var gfxLayer = doc.layers[doc.layers.length - 1];
      if (gfxLayer.name !== "Regmarks") {
        gfxLayer.name = "Graphics";
        gfxLayer.locked = false;
        gfxLayer.visible = true;
        gfxLayer.zOrder(ZOrderMethod.SENDTOBACK);

        if (geo.red.length > 0) {
          var red = new CMYKColor();
          red.magenta = 100;
          red.yellow = 100;
          for (var r = 0; r < geo.red.length; r++) {
            try {
              var p = gfxLayer.pathItems.add();
              p.setEntirePath([
                [geo.red[r].x1, geo.red[r].y1],
                [geo.red[r].x2, geo.red[r].y2],
              ]);
              p.strokeColor = red;
              p.strokeWidth = geo.red[r].w;
              p.filled = false;
            } catch (e) {}
          }
        }
      }

      if (geo.warnings.length) PMA.Utils.error(geo.warnings.join("\n"));
      app.redraw();
    } catch (e) {
      PMA.Utils.error(
        "Kritick\u00E1 chyba p\u0159i vykreslov\u00E1n\u00ED: " + e.message,
      );
    }
  },

  getLay: function (n) {
    try {
      return app.activeDocument.layers.getByName(n);
    } catch (e) {
      var l = app.activeDocument.layers.add();
      l.name = n;
      return l;
    }
  },

  /**
   * Moves paths of specific spot colors to a target layer.
   * @param {Layer} t - Target layer object.
   * @param {Array} names - Spot color names to match.
   * @returns {boolean} True if any paths were moved.
   */
  movePaths: function (t, names) {
    try {
      var items = app.activeDocument.pathItems;
      var snapshot = [];
      for (var i = 0; i < items.length; i++) snapshot.push(items[i]);

      var found = false;
      for (var i = 0; i < snapshot.length; i++) {
        var item = snapshot[i];
        var m = false;
        for (var n = 0; n < names.length; n++) {
          var s = names[n].toLowerCase();
          if (item.stroked && item.strokeColor.typename === "SpotColor") {
            if (item.strokeColor.spot.name.toLowerCase() === s) m = true;
          }
          if (!m && item.filled && item.fillColor.typename === "SpotColor") {
            if (item.fillColor.spot.name.toLowerCase() === s) m = true;
          }
        }
        if (m) {
          try {
            item.move(t, ElementPlacement.PLACEATEND);
            found = true;
          } catch (e) {}
        }
      }
      return found;
    } catch (e) {
      PMA.Utils.log("Error in movePaths: " + e.message);
      return false;
    }
  },

  /**
   * Gets or creates a color by name (supports [Registration] and auto Spot creation).
   * @param {string} name - Color name.
   * @returns {Color} Illustrator color object.
   */
  getCol: function (name) {
    var doc = app.activeDocument;
    if (!name) name = "[Registration]";
    try {
      return doc.swatches.getByName(name).color;
    } catch (e) {
      if (name === "[Registration]") {
        var b = new CMYKColor();
        b.black = 100;
        return b;
      }
      try {
        var spot = doc.spots.add();
        // Sanitize spot name: replace characters that may cause issues [ ] ( ) , . 
        var cleanName = name.replace(/[\[\]\(\)\,\.]/g, "_");
        spot.name = cleanName;
        var c = new CMYKColor();
        c.cyan = this.AUTO_SPOT_COLOR[0];
        c.magenta = this.AUTO_SPOT_COLOR[1];
        c.yellow = this.AUTO_SPOT_COLOR[2];
        c.black = this.AUTO_SPOT_COLOR[3];
        spot.color = c;
        spot.colorType = ColorModel.SPOT;
        
        // FIX AUD-09: Return SpotColor wrapper, not the internal color
        var sc = new SpotColor();
        sc.spot = spot;
        sc.tint = 100;
        return sc;
      } catch (e2) {
        var b = new CMYKColor();
        b.black = 100;
        return b;
      }
    }
  },
};

var PMA = PMA || {};

PMA.UI = {
    /**
     * Display the main ScriptUI dialog.
     * @param {Object} init - Initial settings for the dialog.
     * @returns {Object|null} User-selected settings or null if cancelled.
     */
  show: function (init) {
    var c = PMA.Config,
      l = c.ui.labels;
    var w = new Window("dialog", c.ui.title);
    w.orientation = "column";
    w.alignChildren = ["fill", "top"];
    w.margins = 20;
    w.spacing = 15;
    w.preferredSize.width = 350;

    // PANEL 1: SYSTEM
    var pSystem = w.add("panel", undefined, "V\u00FDber technologie");
    pSystem.alignChildren = ["fill", "top"];
    pSystem.margins = 15;
    var dMode = pSystem.add("dropdownlist", undefined, [
      "ZUND",
      "SUMMA",
      "HYBRID",
    ]);
    dMode.selection =
      init.mode === "SUMMA" ? 1 : init.mode === "HYBRID" ? 2 : 0;
    dMode.helpTip =
      "V\u00FDber c\u00EDlov\u00E9 technologie \u0159ezu (Z\u00FCnd / Summa).";

    // 1.1 SOURCE DEFINITION (Auto-fit vs Fixed AB)
    var grpSrc = pSystem.add("group");
    grpSrc.orientation = "row";
    grpSrc.alignChildren = "left";
    var rbAuto = grpSrc.add(
      "radiobutton",
      undefined,
      "Dle v\u00FDberu (Auto-fit)",
    );
    var rbFixed = grpSrc.add("radiobutton", undefined, "Dle Artboardu (Fixed)");
    if (init.useArtboardBounds) rbFixed.value = true;
    else rbAuto.value = true;
    rbAuto.helpTip =
      "Pozice zna\u010Dek se ur\u010D\u00ED podle vybran\u00E9 grafiky a Artboard se automaticky p\u0159izp\u016Fsob\u00ED.";
    rbFixed.helpTip =
      "Pozice zna\u010Dek se ur\u010D\u00ED podle st\u00E1vaj\u00EDc\u00EDho Artboardu; jeho velikost se nem\u011Bn\u00ED.";

    // PANEL 2: GEOMETRY (Merged)
    var pGeo = w.add("panel", undefined, "Nastaven\u00ED mezer");
    pGeo.alignChildren = ["fill", "top"];
    pGeo.margins = 15;
    pGeo.spacing = 10;

    var rGapGZ = this.addRow(
      pGeo,
      l.gapGZ,
      init.gapInner,
      "gapInner",
      init,
      "Vzd\u00E1lenost zna\u010Dek od hranic \u010Dist\u00E9ho form\u00E1tu (grafiky).",
    );
    var rGapZO = this.addRow(
      pGeo,
      l.gapZO,
      init.gapOuter,
      "gapOuter",
      init,
      "Vzd\u00E1lenost vn\u011Bj\u0161\u00EDho okraje zna\u010Dek od hrany Artboardu.",
    );
    var rMaxD = this.addRow(
      pGeo,
      l.maxDist,
      init.maxDist,
      "maxDist",
      init,
      "Maxim\u00E1ln\u00ED povolen\u00E1 rozte\u010D mezi zna\u010Dkami. P\u0159i p\u0159ekro\u010Den\u00ED budou vlo\u017Eeny mezilehl\u00E9 body.",
    );
    var rSizeZ = this.addRow(
      pGeo,
      l.markSizeZ,
      init.markSizeZ || 5,
      "markSizeZ",
      init,
      "Fyzick\u00E1 velikost zna\u010Dky Z\u00FCnd (pr\u016Fm\u011Br).",
    );
    var rSizeS = this.addRow(
      pGeo,
      l.markSizeS,
      init.markSizeS || 3,
      "markSizeS",
      init,
      "Fyzick\u00E1 velikost zna\u010Dky Summa (strana).",
    );
    var rColor = this.addColorRow(
      pGeo,
      l.markColor,
      init.markColor,
      "markColor",
      init,
      "N\u00E1zev p\u0159\u00EDm\u00E9 barvy pro zna\u010Dky. Pou\u017Eijte '[Registration]' pro standard.",
    );

    // PANEL 3: FEED (Summa Only)
    var pFeed = w.add("panel", undefined, "Nastaven\u00ED role (Feed)");
    pFeed.alignChildren = ["fill", "top"];
    pFeed.margins = 15;
    pFeed.spacing = 10;

    var rFT = this.addRow(
      pFeed,
      l.feedTop,
      init.feedTop,
      "feedTop",
      init,
      "Horn\u00ED p\u0159esah materi\u00E1lu pro bezpe\u010Dn\u00E9 uchopen\u00ED v podava\u010Di (Feed).",
    );
    var rFB = this.addRow(
      pFeed,
      l.feedBottom,
      init.feedBottom,
      "feedBottom",
      init,
      "Spodn\u00ED n\u00E1jezd materi\u00E1lu pro po\u010D\u00E1te\u010Dn\u00ED n\u00E1jezd stroje (Feed).",
    );
    var chRed = pFeed.add("checkbox", undefined, l.redLines);
    chRed.value = init.drawRed;
    chRed.helpTip =
      "Vykresl\u00ED \u010Derven\u00E9 o\u0159ezov\u00E9 linky ozna\u010Duj\u00EDc\u00ED fyzick\u00E9 hranice archu v\u010Detn\u011B p\u0159esah\u016F (feedu).";

    // PANEL 4: LAYERS (Merged)
    var pLay = w.add("panel", undefined, "Spr\u00E1va vrstev");
    pLay.alignChildren = ["fill", "top"];
    pLay.margins = 15;
    pLay.spacing = 10;

    var tLay = this.addLayerRow(
      pLay,
      "Thru-cut",
      init.thruActive !== undefined ? init.thruActive : true,
      init.thruName || "cut",
      "Aktivovat vrstvu pro naskrzov\u00FD \u0159ez (Thru-cut).",
      "N\u00E1zev p\u0159\u00EDm\u00E9 barvy (Spot Color) definuj\u00EDc\u00ED cesty pro naskrzov\u00FD \u0159ez.",
    );
    var kLay = this.addLayerRow(
      pLay,
      "Kiss-cut",
      init.kissActive || false,
      init.kissName || "",
      "Aktivovat vrstvu pro polovi\u010Dn\u00ED \u0159ez / n\u00E1sek (Kiss-cut).",
      "N\u00E1zev p\u0159\u00EDm\u00E9 barvy (Spot Color) definuj\u00EDc\u00ED cesty pro polovi\u010Dn\u00ED \u0159ez.",
    );

    // FOOTER
    var grpB = w.add("group");
    grpB.alignment = "right";
    grpB.spacing = 20;
    var btnCan = grpB.add("button", undefined, "Zru\u0161it", {
      name: "cancel",
    });
    btnCan.helpTip = "Zru\u0161\u00ED skript bez proveden\u00ED zm\u011Bn.";
    var btnOk = grpB.add("button", undefined, "Generovat", { name: "ok" });
    btnOk.helpTip =
      "Spust\u00ED v\u00FDpo\u010Det a vygeneruje zna\u010Dky do dokumentu.";

    // LOGIC
    function update() {
      var m = dMode.selection.text;
      var isZ = m === "ZUND";
      var isS = m === "SUMMA";
      var isH = m === "HYBRID";

      // Panel & Row Visibility
      rGapGZ.group.visible = isZ || isH;
      rGapGZ.group.maximumSize.height = (isZ || isH) ? 1000 : 0;

      grpSrc.visible = isZ;
      grpSrc.maximumSize.height = isZ ? 1000 : 0;

      pFeed.visible = !isZ;
      pFeed.maximumSize.height = !isZ ? 1000 : 0;

      rSizeZ.group.visible = isZ || isH;
      rSizeZ.group.maximumSize.height = (isZ || isH) ? 1000 : 0;

      rSizeS.group.visible = isS || isH;
      rSizeS.group.maximumSize.height = (isS || isH) ? 1000 : 0;

      // Group/Enabled logic
      chRed.enabled = !isZ;

      tLay.chk.enabled = isZ || isH;
      tLay.inp.enabled = (isZ || isH) && tLay.chk.value;

      kLay.chk.enabled = isS || isH;
      kLay.inp.enabled = (isS || isH) && kLay.chk.value;

      w.layout.layout(true);
      w.preferredSize.height = -1;
      w.layout.layout(true);

      var ps = w.preferredSize;
      if (ps.height > 0) {
        w.size.height = ps.height + 10;
      }

      // FIX UI-03: Reset red lines for Zund
      if (isZ) chRed.value = false;
      
      // FIX UI-04: Reset hidden inputs to defaults
      if (!(isZ || isH)) rSizeZ.inp.text = String(init.markSizeZ || 5);
      if (!(isS || isH)) rSizeS.inp.text = String(init.markSizeS || 3);
    }

    dMode.onChange = function () {
      var m = dMode.selection.text;
      if (m === "ZUND") {
        tLay.chk.value = true;
        tLay.inp.text = "cut";
        kLay.chk.value = false;
        kLay.inp.text = "";
      } else if (m === "SUMMA") {
        tLay.chk.value = false;
        tLay.inp.text = "";
        kLay.chk.value = true;
        kLay.inp.text = "cut";
      } else { // HYBRID
        tLay.chk.value = true;
        tLay.inp.text = "cut";
        kLay.chk.value = true;
        kLay.inp.text = "kiss";
      }
      update();
    };

    tLay.chk.onClick = function() {
        tLay.inp.enabled = tLay.chk.value && tLay.chk.enabled;
        update();
    };
    kLay.chk.onClick = function() {
        kLay.inp.enabled = kLay.chk.value && kLay.chk.enabled;
        update();
    };
    rbAuto.onClick = update;
    rbFixed.onClick = update;

    update();

    // FIX UI-05: Validation inside onClick
    var result = null;
    
    btnOk.onClick = function() {
      var m = dMode.selection.text;
      var isZ = m === "ZUND";
      
      // Validation
      var gapI = PMA.Utils.validateNumber(rGapGZ.inp.text, 0, 1000, l.gapGZ); 
      if(gapI === null) return; // Dialog stays open
      
      var gapO = PMA.Utils.validateNumber(rGapZO.inp.text, 0, 1000, l.gapZO); 
      if(gapO === null) return;
      
      var maxD = PMA.Utils.validateNumber(rMaxD.inp.text, 50, 5000, l.maxDist); 
      if(maxD === null) return;
      
      var markSZ = 0;
      if (isZ || m === "HYBRID") {
          markSZ = PMA.Utils.validateNumber(rSizeZ.inp.text, 1, 50, l.markSizeZ); 
          if(markSZ === null) return;
      } else {
          markSZ = init.markSizeZ || 5; 
      }
      
      var markSS = 0;
      if (m === "SUMMA" || m === "HYBRID") {
          markSS = PMA.Utils.validateNumber(rSizeS.inp.text, 1, 50, l.markSizeS); 
          if(markSS === null) return;
      } else {
          markSS = init.markSizeS || 3; 
      }
      
      var fTop = 0, fBot = 0;
      if (!isZ) {
          fTop = PMA.Utils.validateNumber(rFT.inp.text, 0, 1000, l.feedTop); 
          if(fTop === null) return;
          fBot = PMA.Utils.validateNumber(rFB.inp.text, 0, 1000, l.feedBottom); 
          if(fBot === null) return;
      }

      result = {
        mode: m,
        gapInner: gapI,
        gapOuter: gapO,
        maxDist: maxD,
        feedTop: fTop,
        feedBottom: fBot,
        drawRed: !isZ ? chRed.value : false,
        thruActive: tLay.chk.value,
        thruName: tLay.inp.text,
        kissActive: kLay.chk.value,
        kissName: kLay.inp.text,
        useArtboardBounds: isZ && rbFixed.value,
        markSizeZ: markSZ,
        markSizeS: markSS,
        markColor: rColor.inp.text || "[Registration]",
      };
      
      w.close(1);
    };

    w.show();
    return result;
  },

    /**
     * Internal helper to add a labeled row with an edittext.
     * @private
     */
  addRow: function (p, lbl, val, id, init, tip) {
    var g = p.add("group");
    g.alignment = "fill";
    var st = g.add("statictext", undefined, lbl);
    st.preferredSize.width = 160;
    if (tip) st.helpTip = tip;
    var et = g.add("edittext", undefined, String(val));
    et.preferredSize.width = 60;
    if (tip) et.helpTip = tip;
    g.add("statictext", undefined, "mm");
    return { inp: et, group: g };
  },

  addLayerRow: function (p, title, defChk, defTxt, tipChk, tipInp) {
    var g = p.add("group");
    g.alignment = "fill";
    var c = g.add("checkbox", undefined, title);
    c.value = defChk;
    c.preferredSize.width = 100;
    if (tipChk) c.helpTip = tipChk;
    var t = g.add("edittext", undefined, defTxt);
    t.preferredSize.width = 140;
    if (tipInp) t.helpTip = tipInp;
    return { chk: c, inp: t };
  },

  addColorRow: function (p, lbl, val, id, init, tip) {
    var g = p.add("group");
    g.alignment = "fill";
    var st = g.add("statictext", undefined, lbl);
    st.preferredSize.width = 160;
    if (tip) st.helpTip = tip;
    var et = g.add("edittext", undefined, String(val));
    et.preferredSize.width = 110;
    if (tip) et.helpTip = tip;
    return { inp: et, group: g };
  },
};

(function(PMA) {
    var draw = PMA.Draw;
    try {
        if (app.documents.length === 0) {
            alert("Nen\u00ED otev\u0159en\u00FD dokument.");
            return;
        }

        var settings = PMA.Config.Storage.load() || PMA.Config.getDefaults();
        var res = PMA.UI.show(settings);
        if (!res) return;

        PMA.Config.Storage.save(res);
        
        // Start Document Session (unlocks layers, sets origin)
        draw.beginSession();
        app.activeDocument.rulerOrigin = [0, 0];

        var bounds = draw.getBounds(res);
        if (!bounds) {
            alert("Nic nen\u00ED vybr\u00E1no.");
            draw.endSession();
            return;
        }

        var geo = PMA.Core.calculateAll(res, bounds);
        draw.render(geo, res);
        
    } catch (e) {
        alert("KRITICK\u00C1 CHYBA: " + e.message + " (line " + e.line + ")");
    } finally {
        draw.endSession();
    }
})(PMA);
