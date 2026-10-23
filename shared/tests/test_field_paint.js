#!/usr/bin/env node
/**
 * shared/lib/field_paint.js — status colours on ScriptUI text.
 */
var fs = require("fs");
var path = require("path");

eval(fs.readFileSync(path.join(__dirname, "..", "lib", "field_paint.js"), "utf8"));

var pass = 0, fail = 0, total = 0;
function assert(cond, msg) {
    total++;
    if (cond) { pass++; } else { fail++; console.log("  FAIL: " + msg); }
}
function sameRGB(pen, rgb) {
    return pen && pen.color && pen.color.length === 4 &&
        pen.color[0] === rgb[0] && pen.color[1] === rgb[1] && pen.color[2] === rgb[2] && pen.color[3] === 1;
}

// A ScriptUI control's graphics object, as far as the module uses it. A theme
// pen carries its theme name, as Illustrator's does (measured 2026-10-23);
// `writes` counts every pen written to the control.
// `background` (0-1 grey) gives the control a theme brush "background" of that
// colour, as Illustrator's (0.94 on Light, 0.20 on Dark, measured 2026-10-23).
function mockControl(defaultPen, noThemePens, background) {
    var g = {
        PenType: noThemePens ? { SOLID_COLOR: "solid" } : { SOLID_COLOR: "solid", THEME_COLOR: "theme" },
        writes: 0,
        newPen: function (type, color, width) {
            if (type === "theme") { return { type: type, theme: color, width: width }; }
            return { type: type, color: color, width: width };
        }
    };
    if (background !== undefined) {
        g.BrushType = { SOLID_COLOR: "solid", THEME_COLOR: "theme" };
        g.newBrush = function (type, name) {
            if (type === "theme" && name === "background") { return { type: type, theme: name, color: [background, background, background, 1] }; }
            throw new Error("Chybný argument " + name);
        };
    }
    var current = defaultPen;
    Object.defineProperty(g, "foregroundColor", {
        get: function () { return current; },
        set: function (pen) { current = pen; g.writes++; }
    });
    return { graphics: g };
}
function isThemeText(pen) { return !!pen && pen.type === "theme" && pen.theme === "foreground"; }

var logged = [];
var NS = { Utils: { log: function (m) { logged.push(m); } } };
buildFieldPaint(NS);
var P = NS.FieldPaint;

console.log("\n=== the canon's colours ===");
assert(sameRGB({ color: P.COLORS.ERR.concat([1]) }, [0.90, 0.20, 0.20]), "error red 0.90 0.20 0.20");
assert(sameRGB({ color: P.COLORS.WARN.concat([1]) }, [0.96, 0.60, 0.38]), "warning amber 0.96 0.60 0.38");
assert(sameRGB({ color: P.COLORS.OK.concat([1]) }, [0.36, 0.60, 0.34]), "OK green 0.36 0.60 0.34");

console.log("\n=== field: red while invalid, its own pen back when valid ===");
var own = { own: true };
var et = mockControl(own);
P.field(et, false);
assert(sameRGB(et.graphics.foregroundColor, P.COLORS.ERR), "invalid paints the text red");
assert(et.sharedDefaultPen === own, "the field's own pen is remembered before painting");
P.field(et, true);
assert(et.graphics.foregroundColor === own, "valid gives the field its own pen back, not black");
P.field(et, false);
P.field(et, true);
assert(et.graphics.foregroundColor === own, "and again after a second round");

console.log("\n=== field: a field that was never red is never written ===");
var et0 = mockControl(undefined);
P.field(et0, true);
P.field(et0, true);
assert(et0.graphics.writes === 0, "valid from the start: no pen written, the host draws it in its own colour");
assert(et0.sharedDefaultPen === undefined, "...and nothing remembered yet");

console.log("\n=== field: an own pen that cannot be read comes back as Adobe's text colour ===");
// Illustrator reads a control's own pen back as undefined before show()
// (measured 2026-10-21 and 2026-10-23): after red the field takes the theme's
// text colour ("foreground") of the current UI brightness, not a fixed grey.
var et2 = mockControl(undefined);
P.field(et2, false);
P.field(et2, true);
assert(isThemeText(et2.graphics.foregroundColor), "the theme pen \"foreground\" after red");
P.field(et2, false);
assert(sameRGB(et2.graphics.foregroundColor, P.COLORS.ERR), "red again on the next typo");
P.field(et2, true);
assert(isThemeText(et2.graphics.foregroundColor), "and the theme pen again");

console.log("\n=== field: on the dark UI the light grey, which matches the host's own text there ===");
// On Dark the theme's "foreground" is 0.60, visibly dimmer than the white the
// host draws its fields in; light grey 0.75 looked like that white (user
// screenshots 2026-10-23). The theme background tells the two apart.
var etL = mockControl(undefined, false, 0.94);
P.field(etL, false); P.field(etL, true);
assert(isThemeText(etL.graphics.foregroundColor), "light background 0.94: the theme text pen");
var etD = mockControl(undefined, false, 0.196);
P.field(etD, false); P.field(etD, true);
assert(sameRGB(etD.graphics.foregroundColor, P.FALLBACK), "dark background 0.20: light grey");
var etM = mockControl(undefined, false, 0.72);
P.field(etM, false); P.field(etM, true);
assert(isThemeText(etM.graphics.foregroundColor), "Medium Light-like background 0.72: the theme text pen");
var etB = mockControl(undefined, false, 0.94);
etB.graphics.newBrush = function () { throw new Error("brush refused"); };
logged.length = 0;
P.field(etB, false); P.field(etB, true);
assert(isThemeText(etB.graphics.foregroundColor), "a refused background brush: the theme text pen");
assert(logged.length === 1 && /isDarkUI: brush refused/.test(logged[0]), "...and the refusal is logged");
var etO = mockControl({ own: true }, false, 0.196);
P.field(etO, false); P.field(etO, true);
assert(etO.graphics.foregroundColor && etO.graphics.foregroundColor.own === true, "a readable own pen wins on the dark UI too");

console.log("\n=== field: light grey only where the host has no theme pens ===");
var et3 = mockControl(undefined, true);
P.field(et3, false);
P.field(et3, true);
assert(sameRGB(et3.graphics.foregroundColor, P.FALLBACK), "no THEME_COLOR pen type: light grey");
var et4 = mockControl(undefined);
var make = et4.graphics.newPen;
et4.graphics.newPen = function (type, color, width) {
    if (type === "theme") { throw new Error("theme refused"); }
    return make(type, color, width);
};
logged.length = 0;
P.field(et4, false);
P.field(et4, true);
assert(sameRGB(et4.graphics.foregroundColor, P.FALLBACK), "a refused theme pen: light grey");
assert(logged.length === 1 && /themeText: theme refused/.test(logged[0]), "...and the refusal is logged");

console.log("\n=== field and text never throw ===");
logged.length = 0;
var threw = false;
try {
    P.field(null, false);
    P.field({}, false);
    P.field({ graphics: {} }, false);
    var hostile = mockControl({});
    hostile.graphics.newPen = function () { throw new Error("pen refused"); };
    P.field(hostile, false);
    P.text(hostile, "ERR");
    P.text(null, "OK");
    P.text(mockControl({}), "NOPE");
} catch (e) { threw = true; }
assert(!threw, "missing graphics, a refused pen and an unknown kind are all quiet");
assert(logged.length === 2, "a refused pen is logged, twice: field and text");

console.log("\n=== text: a status line in the colour of its state ===");
var st = mockControl({});
P.text(st, "OK");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.OK), "OK paints green");
P.text(st, "WARN");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.WARN), "WARN paints amber");
P.text(st, "ERR");
assert(sameRGB(st.graphics.foregroundColor, P.COLORS.ERR), "ERR paints red");

var NS2 = {};
buildFieldPaint(NS2);
var hostile2 = mockControl({});
hostile2.graphics.newPen = function () { throw new Error("pen refused"); };
threw = false;
try { NS2.FieldPaint.field(hostile2, false); } catch (e2) { threw = true; }
assert(!threw, "without NS.Utils a refused pen is still quiet");

console.log("\n--- " + pass + "/" + total + " passed, " + fail + " failed ---");
process.exit(fail === 0 ? 0 : 1);
