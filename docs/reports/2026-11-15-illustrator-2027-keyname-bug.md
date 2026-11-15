# Hlášení chyby pro Adobe — Illustrator 2027: `keyName` nepojmenuje drženou klávesu

Připraveno 2026-11-15 z měření v [engine-facts](../extendscript-engine-facts.md)
(sekce „Illustrator 2027: `keyName` drženou klávesu nepojmenuje“). Odeslat musí
uživatel sám: Illustrator Desktop Bugs na UserVoice
(<https://illustrator.uservoice.com/forums/601447-illustrator-desktop-bugs>),
nebo komunita Adobe → Create a post → Report a bug. Text níže je anglicky, jak
to Adobe čeká; skript se vloží do hlášení jako text.

---

**Title:** ScriptUI `keyboardState.keyName` no longer names a held key while Illustrator is in front (Illustrator 2027 / 31.0.0, macOS)

**Environment**

- Adobe Illustrator 2027, version 31.0.0
- macOS 27.2, Apple M3 Pro (arm64)
- Keyboard layouts tested: Czech and ABC (U.S.) — same result
- Script run from File > Scripts > Other Script…

**What happens**

`ScriptUI.environment.keyboardState` is the documented way to read the
keyboard while a script runs ("global access to the keyboard state during
function execution"). Scripts use it to let the user stop a long batch by
holding Esc, because a palette receives no clicks or key events while the
script runs.

In Illustrator 31.0.0, while Illustrator is the frontmost application:

- With no key held, `keyName` returns `"A"` (expected: an empty string).
- With Esc held, `keyName` returns `undefined` (expected: `"Escape"`). The
  same for Return, Backspace, the arrow keys and the space bar.
- In some runs `keyName` is `undefined` even with no key held, so a held key
  cannot be told apart from no key at all.
- Modifier flags are still correct: `shiftKey`, `altKey` and `ctrlKey` are
  `true` while the key is held.
- A `keydown` listener on the palette receives no events while the script
  runs.

When another application is in front (Finder, Notes) and Esc is held there,
the same running script reads `keyName === "Escape"` correctly (59 of 60 and
60 of 60 reads).

**Expected**

`keyName` returns the name of the held key (`"Escape"`) while Illustrator is
in front, as it did before: the same check worked in Illustrator 30.8.2
(macOS 27.0) on 2026-09-28. Since then macOS was updated to 27.2 and
Illustrator to 2027 (31.0.0); the change in behaviour depends on which
application is in front, which points to Illustrator.

**Steps to reproduce**

1. Close all documents. Run the script below from File > Scripts > Other Script…
2. When the palette says so, hold Esc with Illustrator in front for 3 seconds.
3. Then switch to Finder and hold Esc there for 3 seconds.
4. Read the result in the alert.

```javascript
#target illustrator
(function () {
    var w = new Window("palette", "keyName test", undefined, { closeButton: false });
    var st = w.add("statictext", undefined, " ");
    st.preferredSize.width = 420;
    w.show();
    function measure(label, prompt) {
        var seen = {}, i, k, key, out = [];
        for (i = 30; i > 0; i--) { st.text = prompt + " (" + Math.ceil(i / 10) + ")"; w.update(); $.sleep(100); }
        for (i = 0; i < 30; i++) {
            st.text = label + ": measuring…"; w.update(); $.sleep(100);
            k = ScriptUI.environment.keyboardState;
            key = String(k.keyName);
            seen[key] = (seen[key] || 0) + 1;
        }
        for (key in seen) { if (seen.hasOwnProperty(key)) { out.push(key + " x" + seen[key]); } }
        return label + ": " + out.join(", ");
    }
    var r = [];
    r.push(measure("no key", "Do not hold any key"));
    r.push(measure("Esc, Illustrator in front", "Hold Esc now (Illustrator in front)"));
    r.push(measure("Esc, Finder in front", "Switch to Finder and hold Esc there"));
    w.close();
    alert(r.join("\n"));
})();
```

**Result on our machine**

<!-- Před odesláním spusťte skript výše (uložený jako
~/Dev/extendscript-automation/batch-relink-export/dist/adobe-keyname-repro.jsx)
a jeho výstup vložte sem místo těchto řádků. Níže jsou čísla z našich delších sond. -->

From our longer probes (reads every 100 ms):

```
no key, Illustrator in front:  "A" 30/30 (in one run with a document open: undefined 24/24)
Esc held, Illustrator in front: undefined 30/30 (Czech and ABC layouts alike)
Esc held, Finder/Notes in front: "Escape" 59/60 and 60/60
Shift/Option/Control held:      shiftKey/altKey/ctrlKey true 30/30, keyName "A"
```

**Impact**

Batch scripts can no longer offer "hold Esc to stop". The only working
workaround is a modifier key (`ctrlKey`), which is read correctly.
