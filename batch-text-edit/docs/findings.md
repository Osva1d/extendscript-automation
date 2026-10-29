# Batch Text Edit — measured findings

What the engine really does, measured instead of remembered. Every claim here can be repeated: the probe and the way to run it are named in each section. Measured 2026-10-29 in Adobe Illustrator 30.8.2 (`cs_CZ`), ExtendScript `$.version` 4.5.6. Sections are appended per task. Task 8 adds its own below.

## Engine checks

Pure language, no document needed. Queued from Tasks 2 and 3 because `vars.js` and `steps.js` rely on them. Probe: `tests/probes/probe_case.jsx` (function `engineChecks`), run with `tools/ai-eval.sh`.

| # | check | expected | measured | |
|---|---|---|---|---|
| 1 | `"a{x}b{y}".match(new RegExp("\\{[^{}\\r\\u0003]+\\}", "g"))` | `{x}`, `{y}` | `["{x}","{y}"]` | ✓ |
| 2 | the same pattern on `"{a" + ETX + "b} {c}"` (ETX = U+0003) | only `{c}` | `["{c}"]` | ✓ |
| 3a | `"xaby ab".replace(/(a)(b)/g, fn)`: `arguments.length`, offset (`arguments[length-2]`) per call | 5; offsets 1 and 5 | `[5, 1]`, `[5, 5]`; last argument is the whole string | ✓ |
| 3b | `"abcb".replace(/b/g, fn)` | 3; offsets 1 and 3 | `[3, 1]`, `[3, 3]` | ✓ |
| 4 | `new RegExp(re.source, re.ignoreCase ? "gi" : "g")` from `/a.b/i` | matches `"A-B"` | `source` `"a.b"`, `ignoreCase` `true`, `"A-B".match(...)` is `["A-B"]` | ✓ |
| 5 | `"ab".replace(/(a)(x)?(b)/, fn)`, the group that does not take part | — | `typeof arguments[2]` is `"undefined"`, the value `undefined` (not `""`); `arguments.length` 6 | recorded |

Check 5 is why `BTE.Steps.matches()` turns an `undefined` or `null` group into `""`: the replacer receives `undefined`, never an empty string. Checks 1–4 agree with what `vars.js` and `steps.js` assume; nothing in them was changed.

## changeCaseTo

`textRange.changeCaseTo(CaseChangeType.UPPERCASE | LOWERCASE | TITLECASE | SENTENCECASE)` against `BTE.Steps.caseText(mode, s)`, the JS emulation the preview uses (spec 5.5).

Probe: `tests/probes/probe_case.jsx`. It opens its own document, writes each input into a fresh point text, applies one `CaseChangeType` to `tf.textRange`, reads `tf.contents` back and closes only that document without saving. The recorded pairs (109 inputs x 4 modes, plus 9 ranges x 4 modes = 472) are the expected values of `tests/test_steps_case.js`; the same table was also run through `caseText` inside the ExtendScript engine itself (472 pairs, no difference), because the host's string functions differ from Node's (below).

### The brief's set

| input | UPPERCASE | LOWERCASE | TITLECASE | SENTENCECASE |
|---|---|---|---|---|
| `čau světe` | `ČAU SVĚTE` | `čau světe` | `Čau Světe` | `Čau světe` |
| `ČAU SVĚTE` | `ČAU SVĚTE` | `čau světe` | `Čau Světe` | `Čau světe` |
| `žluťoučký kůň-úpěl` | `ŽLUŤOUČKÝ KŮŇ-ÚPĚL` | `žluťoučký kůň-úpěl` | `Žluťoučký Kůň-Úpěl` | `Žluťoučký kůň-úpěl` |
| `a. b. c` | `A. B. C` | `a. b. c` | `A. B. C` | `A. b. c` |
| `ŘEDITEL ŠKOLY. DRUHÁ VĚTA` | `ŘEDITEL ŠKOLY. DRUHÁ VĚTA` | `ředitel školy. druhá věta` | `Ředitel Školy. Druhá Věta` | `Ředitel školy. Druhá věta` |
| `{kód} ABC` | `{KÓD} ABC` | `{kód} abc` | `{Kód} Abc` | `{Kód} abc` |

Two things are not what one would guess: TITLECASE lowercases the rest of each word (`ČAU` is `Čau`), and SENTENCECASE of `a. b. c` capitalises only the first letter, because a full stop followed by a small letter does not end a sentence.

### A range is a text of its own

`changeCaseTo` on a sub-range (written as the tool will write it, `tf.characters[start]` with `.length = n`) treats the range as the whole text. `cd` inside `abcdef` is `Cd` in TITLECASE and SENTENCECASE (`abCdef`), `def ghi` after `abc. ` is `Def ghi` in SENTENCECASE. So `caseText` takes only the matched text and needs no context, and a text changed through several matches is the same as each match changed alone. Nine ranges in the test table.

### What the engine follows

The output is that of ICU titlecasing with the Unicode word and sentence breaks (UAX 29). The emulation implements the rules the measurements support:

- Words (TITLECASE): letters and digits run together; `_` joins them; `.` `'` `‘` `’` between two letters (`a.b`, `o'neil`) or two digits (`1.5`), and `:` `·` between two letters, and `,` `;` between two digits do not end a word; a hyphen, slash, space, bracket, `@`, `+`, `=` and a paragraph break do. Combining marks and the soft hyphen stay with their letter.
- In each word or sentence the first letter *or digit* gets the titlecase form and everything after it is lowercased; what stands before it (`_`, `(`, `"`, spaces) is left alone. So `_x` is `_X`, but `3abc` is `3abc`, `3D` is `3d` and `1. abc` stays `1. abc`.
- Sentences (SENTENCECASE): a paragraph break (`\r`) ends one. `!` and `?` end one after any closing quotes or brackets and spaces. A full stop does too, except when a digit follows at once (`3.14`), a capital follows a letter and the stop at once (`A.B`), or the next letter after the spaces, quotes and digits is small (`a. b`, `odstavec. třetí`, `Dr. novák`, `škola. (druhá)`). No stop ends a sentence when a comma, hyphen, colon, semicolon, dash or another stop follows it (`škola. , Druhá`: one sentence). `…` is not a stop. The soft line break U+0003 is an ordinary character.
- Whether a break is there is decided on the original text, before the rest is lowercased: `ŠKOLY. DRUHÁ` breaks, `škola. druhá` does not.

### Letters that do not map one to one

The engine does the full Unicode mapping; the ExtendScript engine's own `toUpperCase` / `toLowerCase` is the simple one and even leaves the titlecase digraph `ǅ` alone (`"ß".toUpperCase() === "ß"`, `"ǅ".toLowerCase() === "ǅ"`, measured). Node does the full mapping, so the tests alone would not show the difference. `caseText` therefore carries three small tables (`BTE.Steps.CASE_UPPER`, `CASE_LOWER`, `CASE_TITLE`) and takes the rest from the host:

| input | UPPERCASE | LOWERCASE | TITLECASE | SENTENCECASE |
|---|---|---|---|---|
| `straße` | `STRASSE` | `straße` | `Straße` | `Straße` |
| `ǆ ǅ Ǆ` | `Ǆ Ǆ Ǆ` | `ǆ ǆ ǆ` | `ǅ ǅ ǅ` | `ǅ ǆ ǆ` |
| `ǉudi ﬁlm` | `ǇUDI FILM` | `ǉudi ﬁlm` | `ǈudi Film` | `ǈudi ﬁlm` |

The Turkish dotted/dotless set, input `i` U+0307, space, U+0130, space, U+0131: UPPERCASE gives `I` U+0307, U+0130, `I`; LOWERCASE gives `i` U+0307, `i` U+0307, U+0131; TITLECASE the same as UPPERCASE; SENTENCECASE gives `I` U+0307, `i` U+0307, U+0131 (so U+0130 lowercases to `i` plus the combining dot).

### Not matched, not measured

No pair of the 472 recorded differs from the emulation. What the table does not cover:

- Table entries that are the same Unicode rule for sibling letters but were not themselves measured: `ß` at the start of a word (`Ss`), the ligatures other than `ﬁ`, the digraph families `ǈ`/`ǉ`, `ǋ`/`ǌ`, `ǲ`/`ǳ` in every direction.
- Letters with a full mapping that are not in the tables: `ŉ`, `ǰ`, Greek with iota subscript and the final sigma, Armenian ligatures. Czech, Slovak, German and Polish text does not contain them.
- Sentence stops beyond `.` `!` `?` (`‼`, `⁇`, CJK full stops, the one dot leader U+2024) and word-joining characters beyond the list above. Letters without a case (CJK, Hebrew) count as "not a letter" in the break rules.
- A text with `\r\n`: the engine stores it as `\r` (measured), so text read from a document never has it.
- The post-write check (Task 10) is the net for all of these: a difference shows there at run time.

### Re-measuring

    tools/ai-eval.sh -t 30 -e 'app.documents.length'     # must print 0
    tools/ai-eval.sh -t 240 batch-text-edit/tests/probes/probe_case.jsx

The result is one JSON string, every non-ASCII character as `\uXXXX`. Run it with no document open: it creates one and closes it unsaved.
