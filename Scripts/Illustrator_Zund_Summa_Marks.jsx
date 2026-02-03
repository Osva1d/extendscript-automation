/*
  Script: Illustrator_Zund_Summa_Marks_Refactor.jsx
  Generated: Tue Feb  3 10:18:38 CET 2026
  Description: Modular refactor of Zund/Summa marks generator.
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

var Utils = {
    mm2pt: function(mm) { return mm * 2.83464567; },
    pt2mm: function(pt) { return pt / 2.83464567; },
    
    // Logger stub for future enhancement
    log: function(msg) {
        // $.writeln(msg); // Omitted for production speed unless debug is on
    },
    
    error: function(msg) {
        alert(msg);
    }
};

var Config = {
    scriptName: "Zund & Summa Automation",
    zundSize: 5,         
    summaSize: 3,
    orientDist: 100,     
    hybridGap: 5,        
    summaXCenter: 10,    // 10mm from graph edge to MARK CENTER
    summaYVisual: 10,    // 10mm gap graph edge to MARK EDGE
    redLineWidth: 1,     // 1pt
    rulerBuffer: 0.1,    
    
    ui: {
        title: "PMA v26.3 Unified",
        labels: {
            gapGZ: "Mezera od grafiky:",
            gapZO: "Mezera od okraje:",
            maxDist: "Rozte\u010D zna\u010Dek:",
            feedTop: "Horn\u00ED v\u00FDjezd (Top):",
            feedBottom: "Spodn\u00ED n\u00E1jezd (Bottom):",
            redLines: "P\u0159idat o\u0159ezov\u00E9 linky"
        }
    },

    getDefaults: function() {
        return {
            mode: "ZUND", gapInner: 10, gapOuter: 0, maxDist: 400,
            feedTop: 70, feedBottom: 50, drawRed: false,
            thruActive: true, thruName: "cut",
            kissActive: false, kissName: "",
            useArtboardBounds: false
        };
    },
    
    // Storage logic moved here to keep Main clean
    Storage: {
        getFile: function() {
            var f = new Folder(Folder.userData + "/PMA"); if (!f.exists) f.create();
            return new File(f.fsName + "/settings_v26_2.json");
        },
        save: function(d) { var f=this.getFile(); f.open('w'); f.encoding='UTF-8'; f.write(JSON.stringify(d)); f.close(); },
        load: function() { var f=this.getFile(); if(!f.exists) return null; try{f.open('r'); var c=f.read(); f.close(); return c?JSON.parse(c):null;}catch(e){return null;} }
    }
};

var Core = {
    calculateAll: function(s, b) {
        var cfg = Config; // dependency
        var rZ = cfg.zundSize / 2, rS = cfg.summaSize / 2;
        
        var offSX = cfg.summaXCenter; 
        var offSY = cfg.summaYVisual + rS; 
        
        var offZX = (s.mode === "ZUND") ? (s.gapInner + rZ) : (offSX + rS + cfg.hybridGap + rZ);
        var offZY = (s.mode === "ZUND") ? (s.gapInner + rZ) : (offSY + rS + cfg.hybridGap + rZ);

        var outX = (s.mode !== "SUMMA") ? offZX : offSX;
        var outY = (s.mode !== "SUMMA") ? offZY : offSY;
        var rMax = (s.mode !== "SUMMA") ? rZ : rS;

        var gL=b[0], gT=b[1], gR=b[2], gB=b[3];
        var gW=gR-gL, gH=gT-gB;
        var gCx=(gL+gR)/2, gCy=(gT+gB)/2;

        var markTopY = gT + Utils.mm2pt(outY); 
        var markBotY = gB - Utils.mm2pt(outY); 
        
        var feedT = (s.mode !== "ZUND") ? s.feedTop : s.gapOuter + cfg.rulerBuffer;
        var feedB = (s.mode !== "ZUND") ? s.feedBottom : s.gapOuter + cfg.rulerBuffer;
        
        var abTop = markTopY + Utils.mm2pt(rMax) + Utils.mm2pt(feedT); 
        var abBot = markBotY - Utils.mm2pt(rMax) - Utils.mm2pt(feedB);

        var reqHalfW = Utils.pt2mm(gW/2) + outX + rMax + s.gapOuter + cfg.rulerBuffer;
        var abW_mm = Math.ceil(reqHalfW * 2); 
        var abH_mm = Math.ceil(Utils.pt2mm(abTop - abBot));
        
        var finalW = Utils.mm2pt(abW_mm);
        var finalH = Utils.mm2pt(abH_mm);
        
        // v26.2.1 Fixed Rect Logic [L, T, R, B]
        var abRect;
        if (s.useArtboardBounds) {
            // Fixed Mode: Artboard is the reference and does not change
            abRect = b; 
        } else {
            // Auto Mode: Artboard expands to fit marks
            abRect = [
                gCx - finalW/2, 
                abTop,
                gCx + finalW/2,
                abTop - finalH
            ];
        }

        var res = { marksZ: [], marksS: [], barS: null, red: [], ab: abRect, warnings: [] };
        
        if(s.mode !== "SUMMA") {
            var xL, xR, yT, yB;
            if(s.useArtboardBounds) {
                // Fixed Mode: INWARDS from Artboard using GAP OUTER
                // Distance from Edge to Mark Center = gapOuter + rZ
                var distFromEdge = s.gapOuter + rZ;
                xL = gL + Utils.mm2pt(distFromEdge); xR = gR - Utils.mm2pt(distFromEdge);
                yT = gT - Utils.mm2pt(distFromEdge); yB = gB + Utils.mm2pt(distFromEdge);
            } else {
                // Auto Mode: OUTWARDS from Selection using GAP INNER (standard offZX)
                xL = gL - Utils.mm2pt(offZX); xR = gR + Utils.mm2pt(offZX);
                yT = gT + Utils.mm2pt(offZY); yB = gB - Utils.mm2pt(offZY);
            }
            
            res.marksZ.push({cx:xL, cy:yB}, {cx:xL, cy:yT}, {cx:xR, cy:yT}, {cx:xR, cy:yB});
            res.marksZ.push({cx:xL + Utils.mm2pt(cfg.orientDist + cfg.zundSize), cy:yB});
            this.addSteps(res.marksZ, xL, yB, xL, yT, Utils.mm2pt(s.maxDist));
            this.addSteps(res.marksZ, xL, yT, xR, yT, Utils.mm2pt(s.maxDist));
            this.addSteps(res.marksZ, xR, yT, xR, yB, Utils.mm2pt(s.maxDist));
            this.addSteps(res.marksZ, xR, yB, xL, yB, Utils.mm2pt(s.maxDist));
        }

        if(s.mode !== "ZUND") {
            var xL, xR, yT, yB;
            if(s.useArtboardBounds) {
                // Fixed Mode: INWARDS from Artboard using GAP OUTER
                // For Summa, logic is complex, simplified to: GapOuter + rS
                var distFromEdge = s.gapOuter + rS;
                xL = gL + Utils.mm2pt(distFromEdge); xR = gR - Utils.mm2pt(distFromEdge);
                yT = gT - Utils.mm2pt(distFromEdge); yB = gB + Utils.mm2pt(distFromEdge);
            } else {
                // Auto Mode: OUTWARDS from Selection
                xL = gL - Utils.mm2pt(offSX); xR = gR + Utils.mm2pt(offSX);
                yT = gT + Utils.mm2pt(offSY); yB = gB - Utils.mm2pt(offSY);
            }
            
            res.marksS.push({cx:xL, cy:yB}, {cx:xL, cy:yT}, {cx:xR, cy:yT}, {cx:xR, cy:yB});
            this.addSteps(res.marksS, xL, yB, xL, yT, Utils.mm2pt(s.maxDist));
            this.addSteps(res.marksS, xR, yT, xR, yB, Utils.mm2pt(s.maxDist));
            
            var barY = gB - Utils.mm2pt(11.5); 
            res.barS = { x1: gL, x2: gR, y: barY, w: Utils.mm2pt(3) };
        }

        if(s.mode !== "ZUND" && s.drawRed) {
            var sw = 1.0; 
            var half = sw/2;
            res.red.push({x1:abRect[0], y1:abRect[1]-half, x2:abRect[2], y2:abRect[1]-half, w:sw});
            res.red.push({x1:abRect[0], y1:abRect[3]+half, x2:abRect[2], y2:abRect[3]+half, w:sw});
        }

        return res;
    },

    addSteps: function(arr, x1, y1, x2, y2, max) {
        var dx=x2-x1, dy=y2-y1, d=Math.sqrt(dx*dx+dy*dy);
        if(max>0 && d>max){ var s=Math.ceil(d/max); for(var i=1;i<s;i++) arr.push({cx:x1+(dx/s*i), cy:y1+(dy/s*i)}); }
    }
};

var Draw = {
    getBounds: function(s) {
        if (s && s.useArtboardBounds) {
             return app.activeDocument.artboards[0].artboardRect;
        }
        app.executeMenuCommand('selectall'); var sel = app.activeDocument.selection; if(!sel || sel.length===0) return null;
        var b=[Infinity,-Infinity,-Infinity,Infinity], f=false;
        for(var i=0; i<sel.length; i++){
            if(sel[i].layer && sel[i].layer.name==="Regmarks") continue;
            var g=sel[i].geometricBounds;
            if(sel[i].typename==="GroupItem" && sel[i].clipped){
                for(var j=0; j<sel[i].pageItems.length; j++) if(sel[i].pageItems[j].clipping){ g=sel[i].pageItems[j].geometricBounds; break;}
            }
            if(g){ b[0]=Math.min(b[0],g[0]); b[1]=Math.max(b[1],g[1]); b[2]=Math.max(b[2],g[2]); b[3]=Math.min(b[3],g[3]); f=true; }
        }
        app.activeDocument.selection=null; return f?b:null;
    },

    render: function(geo, s) {
        var doc=app.activeDocument;
        for(var i=0;i<doc.layers.length;i++){ doc.layers[i].locked=false; doc.layers[i].visible=true; }
        
        if (!s.useArtboardBounds) {
             doc.artboards[0].artboardRect = geo.ab;
        }
        
        var reg = this.getLay("Regmarks"); reg.zOrder(ZOrderMethod.BRINGTOFRONT);
        var refLayer = reg; 

        // Layer Mapping - Thru-cut
        if(s.thruActive && s.thruName) {
            var thru = this.getLay("Thru-cut"); 
            var hit = this.movePaths(thru, [s.thruName]);
            if(!hit) geo.warnings.push("Nenalezena barva pro Thru-cut: " + s.thruName);
            thru.move(refLayer, ElementPlacement.PLACEAFTER);
            refLayer = thru;
        }

        // Layer Mapping - Kiss-cut
        if(s.kissActive && s.kissName) {
            var kiss = this.getLay("Kiss-cut");
            var hit = this.movePaths(kiss, [s.kissName]);
            if(!hit) geo.warnings.push("Nenalezena barva pro Kiss-cut: " + s.kissName);
            kiss.move(refLayer, ElementPlacement.PLACEAFTER);
        }

        var col = this.getCol(); doc.activeLayer = reg;
        
        // Draw Marks
        var rZ = Utils.mm2pt(Config.zundSize/2);
        for(var z=0; z<geo.marksZ.length; z++){ var m=geo.marksZ[z]; var c=reg.pathItems.ellipse(m.cy+rZ, m.cx-rZ, rZ*2, rZ*2); c.fillColor=col; c.stroked=false; }
        
        var rS = Utils.mm2pt(Config.summaSize/2);
        for(var sm=0; sm<geo.marksS.length; sm++){ var m=geo.marksS[sm]; var q=reg.pathItems.rectangle(m.cy+rS, m.cx-rS, rS*2, rS*2); q.fillColor=col; q.stroked=false; }
        
        if(geo.barS){ var l=reg.pathItems.add(); l.setEntirePath([[geo.barS.x1, geo.barS.y], [geo.barS.x2, geo.barS.y]]); l.strokeColor=col; l.strokeWidth=geo.barS.w; l.filled=false; }
        
        // Standardize Bottom Layer (Graphics) and Draw Red Lines
        var gfxLayer = doc.layers[doc.layers.length-1];
        if(gfxLayer.name !== "Regmarks") {
            gfxLayer.name = "Graphics";
            gfxLayer.locked = false;
            gfxLayer.visible = true;
            gfxLayer.zOrder(ZOrderMethod.SENDTOBACK);
            
            if(geo.red.length > 0) {
                var red=new CMYKColor(); red.magenta=100; red.yellow=100;
                for(var r=0; r<geo.red.length; r++){ 
                    var p=gfxLayer.pathItems.add(); 
                    p.setEntirePath([[geo.red[r].x1, geo.red[r].y1], [geo.red[r].x2, geo.red[r].y2]]); 
                    p.strokeColor=red; p.strokeWidth=geo.red[r].w; p.filled=false; 
                }
            }
        }


        
        if(geo.warnings.length) alert(geo.warnings.join("\n"));
    },

    getLay: function(n){ try{return app.activeDocument.layers.getByName(n);}catch(e){ var l=app.activeDocument.layers.add(); l.name=n; return l;} },
    movePaths: function(t, names) {
        var items = app.activeDocument.pathItems;
        var snapshot = [];
        
        // 1. Snapshot Pattern: Collect references first to avoid Live Collection Trap
        for (var i = 0; i < items.length; i++) {
            snapshot.push(items[i]);
        }

        var found = false;
        for (var i = 0; i < snapshot.length; i++) {
            var item = snapshot[i];
            var m = false;
            
            // 2. Performance Optimization: Eliminate try-catch in loop
            for (var n = 0; n < names.length; n++) {
                var s = names[n].toLowerCase();
                
                // Check Stroke
                if (item.stroked && item.strokeColor.typename === "SpotColor") {
                     if (item.strokeColor.spot.name.toLowerCase() === s) m = true;
                }
                
                // Check Fill (if not already matched)
                if (!m && item.filled && item.fillColor.typename === "SpotColor") {
                    if (item.fillColor.spot.name.toLowerCase() === s) m = true;
                }
            }

            if (m) {
                try {
                    item.move(t, ElementPlacement.PLACEATEND);
                    found = true;
                } catch(e) {
                     // Fallback for rare cases where item might have become invalid
                }
            }
        }
        return found;
    },
    getCol: function(){ try{return app.activeDocument.swatches.getByName("[Registration]").color;}catch(e){var b=new CMYKColor(); b.black=100; return b;} }
};

var UI = {
  show: function (init) {
    var c = Config,
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
      "Spodn\u00ED p\u0159esah materi\u00E1lu pro po\u010D\u00E1te\u010Dn\u00ED n\u00E1jezd stroje (Feed).",
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
      init.thruActive || true,
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
    var btnOk = grpB.add("button", undefined, "Generovat data", { name: "ok" });
    btnOk.helpTip =
      "Spust\u00ED v\u00FDpo\u010Det a vygeneruje zna\u010Dky do dokumentu.";

    // LOGIC
    function update() {
      var m = dMode.selection.text;
      var isZ = m === "ZUND";

      // Toggle Rows/Panels
      rGapGZ.group.visible = isZ;
      rGapGZ.group.maximumSize.height = isZ ? 1000 : 0;

      grpSrc.visible = isZ;
      grpSrc.maximumSize.height = isZ ? 1000 : 0;



      pFeed.visible = !isZ;
      pFeed.maximumSize.height = !isZ ? 1000 : 0;

      // Layout refresh
      w.layout.layout(true);
      w.preferredSize.height = -1;
      w.layout.layout(true);

      var ps = w.preferredSize;
      if (ps.height > 0) {
        w.size.height = ps.height + 10;
      }
    }

    dMode.onChange = function () {
      update();
      // Apply defaults on mode switch
      var m = dMode.selection.text;
      if (m === "ZUND") {
        tLay.chk.value = true;
        tLay.inp.text = "cut";
        kLay.chk.value = false;
        kLay.inp.text = "";
      } else {
        tLay.chk.value = false;
        tLay.inp.text = "";
        kLay.chk.value = true;
        kLay.inp.text = "cut";
      }
    };

    rbAuto.onClick = update;
    rbFixed.onClick = update;

    update();

    if (w.show() == 1) {
      var isZ = dMode.selection.text === "ZUND";
      return {
        mode: dMode.selection.text,
        gapInner: Number(rGapGZ.inp.text) || 0,
        gapOuter: Number(rGapZO.inp.text) || 0,
        maxDist: Number(rMaxD.inp.text) || 400,
        feedTop: !isZ ? Number(rFT.inp.text) : 0,
        feedBottom: !isZ ? Number(rFB.inp.text) : 0,
        drawRed: !isZ ? chRed.value : false,
        thruActive: tLay.chk.value,
        thruName: tLay.inp.text,
        kissActive: kLay.chk.value,
        kissName: kLay.inp.text,
        useArtboardBounds: isZ && rbFixed.value,
        drawGuide: false,
      };
    }
    return null;
  },

  addRow: function (p, lbl, val, id, init, tip) {
    var g = p.add("group");
    g.alignment = "fill";
    var st = g.add("statictext", undefined, lbl);
    st.preferredSize.width = 140;
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
};

var Main = function () {
  try {
    if (app.documents.length === 0) {
      alert("Nen\u00ED otev\u0159en\u00FD dokument.");
      return;
    }
    app.activeDocument.rulerOrigin = [0, 0];

    var settings = Config.Storage.load() || Config.getDefaults();
    var res = UI.show(settings);
    if (!res) return;

    Config.Storage.save(res);

    var bounds = Draw.getBounds(res);
    if (!bounds) {
      alert("Nic nen\u00ED vybr\u00E1no.");
      return;
    }

    var geo = Core.calculateAll(res, bounds);
    Draw.render(geo, res);
  } catch (e) {
    alert("ERROR: " + e.message + " (line " + e.line + ")");
  }
};

Main();
