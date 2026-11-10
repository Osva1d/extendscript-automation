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

## DOM facts (Task 8)

Measured 2026-10-29 in Adobe Illustrator 30.8.2 (`cs_CZ`), ExtendScript 4.5.6. Probes: `tests/probes/probe_dom.jsx` (facts 1, 3, 4, 5, 6, 7) and `tests/probes/probe_cursor_selection.jsx` (fact 2, read-only half, needs the user to set up the cursor).

Re-running:

    tools/ai-eval.sh -t 30 -e 'app.documents.length'     # must print 0
    tools/ai-eval.sh -t 120 batch-text-edit/tests/probes/probe_dom.jsx

The whole run takes about 3 s and returns one JSON string (non-ASCII escaped). Every part creates its own document and closes only that one, unsaved. `ONLY` at the top of the file limits the run to one part (`uuid`, `linked`, `overflow`, `mask`, `empty`, `editable`). The log goes progressively to `Folder.temp/bte_probe_dom.log`. The `mask` part sets `app.userInteractionLevel = DONTDISPLAYALERTS` around `makeMask` and restores the previous value in `finally`.

| # | fact | answer | consequence |
|---|---|---|---|
| 1 | `uuid` | exists as a string on GroupItem, PathItem, CompoundPathItem and TextFrame; stable; unique in one document | Task 9 keys elements and texts by `uuid`; no object-identity fallback needed |
| 2 | cursor in a text | `selection` is one `TextRange` object (not an array) | text editing = `typename === "TextRange"` |
| 3 | linked frames | `tf.story.textFrames.length > 1` | skip such frames; `nextFrame` is not usable |
| 4 | overflow | the spec's line-sum rule is wrong for any text with a paragraph break; use the walk rule | Task 9 implements the walk rule |
| 5 | clip-group mask | the group's bounds are the content's; the mask child gives the bounds | element centre from the mask child |
| 6 | empty texts | point "", "\r" and U+0003 are zero-width slivers; area text keeps its frame | Task 9 decides whether to pass them |
| 7 | skip test | `editable === false` covers all seven cases | one test is enough |

### 1. uuid

Type `string` on all four types and on children in a group and subpaths of a compound path. Values are small decimal strings (`"473"`, `"474"`, ...) in creation order. Read twice: equal. Unchanged after `app.redraw()`, `translate(10, 0)`, a range write and `tf.contents = ...`. Re-fetched wrappers match: `layer.groupItems[0] === G`, `gt.parent === G`, `doc.textFrames[k] === T`, and the uuids are equal. Over 12 objects in one document (2 groups, 5 paths, 4 texts, 1 compound) there is no duplicate. A duplicate never shares a uuid with its original: `G.duplicate()` is `"481"` against `"473"`, the copied children `"482"`/`"483"` against `"475"`/`"474"`, `T.duplicate()` `"484"` against `"477"`. The numbering is not global: two documents in separate runs both started near 473, so a uuid is unique only inside one document and one run. Not measured: across save and reopen.

### 2. Cursor in a text

Measured 2026-10-29 with the user (Illustrator 30.8.2), `probe_cursor_selection.jsx` run through `tools/ai-eval.sh` on a scratch document holding one point text „Hello world 123“. The probe only reads.

| state | `doc.selection` | `typename` | array | `length` | `contents` |
|---|---|---|---|---|---|
| A: text selected as an object (Esc after typing) | `[TextFrame]` | — (array) | yes | 1 | item: „Hello world 123“ |
| B: cursor blinking in the text, nothing marked | one `TextRange` | `TextRange` | no | 0 | `""` |
| C: 3 characters marked | one `TextRange` | `TextRange` | no | 3 | „123“ |
| D: Cmd+A inside the text | one `TextRange` | `TextRange` | no | 15 | „Hello world 123“ |

`app.selection` reports the same as `doc.selection`. In text editing the selection is a single `TextRange` object, never an array, and its `parent` is the `Story`; reading it did not throw. So `selection.typename === "TextRange"` (equivalently: the selection is not an array) identifies text editing exactly; `BTE.Scope.isTextEditing` already treats a non-array selection as editing. Not measured: starting the script from File › Scripts, which may itself end text editing before the script runs (then the selection is the text object and nothing is refused).

### 3. Linked frames

| situation | `story.textFrames.length` | `nextFrame` | `previousFrame` |
|---|---|---|---|
| point text | 1 | throws "The requested property is not available for this type of text frame." | throws, same message |
| path text | 1 | not measured | not measured |
| unlinked area text | 1 | the frame itself (`nextFrame === tf`) | null |
| first of 2 | 2 | the second | null |
| last of 2 | 2 | the frame itself | the first |
| first, middle, last of 3 | 3, 3, 3 | next, next, itself | null, previous, previous |

The count is 2 even when all the text fits in the first frame and the second is empty. `story.textFrames[i] === tf` holds. `nextFrame !== null` is true for every area text, so it detects nothing. `story.textFrames.length > 1` is the test (for area text `previousFrame !== null || nextFrame !== tf` is the same). A story has no `uuid` (`typeof` is `"undefined"`, so `a.story.uuid === b.story.uuid` is true by accident) and `t1.story === t2.story` is false; the frames of one thread share `tf.story.textFrames[0].uuid`. In a thread `contents`, `characters.length` and `textRange.length` cover only that frame's part (62, 0; with three frames 62, 62, 0), `story.textRange.length` the whole thread. Unexplained, not pursued: after linking, the story held 62 and (three frames) 124 characters, not the 144 assigned; the text beyond the thread's capacity was not in the story. Linked frames are skipped, so nothing depends on it. The link was made with `layer.textFrames.areaText(path, TextOrientation.HORIZONTAL, baseFrame, true)`.

### 4. Overflow: the line-sum rule needs a correction

`lines[i].characters.length` does **not** include the line terminator (`\r`, U+0003). The rule "sum < characters.length" (spec 4.1, research 7.2) therefore reports overflow for any text that fits but has a paragraph break:

| text (fits) | characters | sum of lines | spec rule |
|---|---|---|---|
| `ab\rcd` | 5 | 4 | overflow (wrong) |
| `ab\r` | 3 | 2 | overflow (wrong) |
| `\r` | 1 | 0 | overflow (wrong) |
| `ab` U+0003 `cd` | 5 | 4 | overflow (wrong) |
| wrapped text + `\r` | 80 | 79 | overflow (wrong) |
| point text `a\rb\rc` | 5 | 3 | overflow (wrong) |
| wrapped text, no break | 79 | 79 | fits |

Soft wraps lose nothing (the trailing space stays in the line). The exact rule is a walk:

    p = 0
    for each line: p += line.characters.length
                   if contents.charAt(p) is "\r" or U+0003: p += 1
    overflow  =  p < characters.length

18 texts that fit (empty, one char, spaces, tab, `\r`, eight `\r`, trailing `\r`, soft break, wrapped, wrapped + `\r`, two paragraphs) gave 0 false alarms. 7 overflows were all caught: 27/120 in 100 x 30, 0/120 when no line fits (`lines.length` is 0), empty paragraphs pushing the tail out, a first paragraph that fits and a second that does not (21/123), two paragraphs with a hidden tail (56/159), a tail of `\r` only (4/10), a soft break then overflow (6/11). The simpler "sum + number of `\r` and U+0003 in contents < characters.length" differs in one case only: a hidden tail made of `\r` only counts as fitting.

Exact fit: frame height 4 to 80 pt in steps of 1 pt, 100 pt wide, wrapped text. The verdict flips once and stays: 1 line from 9 pt, 2 from 23, 3 from 38, 4 from 52, 5 from 67, then stable. At the smallest height where all lines show, the walk equals the total (79/79, with a trailing `\r` 80/80); no off-by-one. The spec rule gives false overflow there for the trailing-`\r` variants. Point text never overflows under the walk (6 cases, one of 360 characters). Path text: 5/5 fits, 18 of 240 visible overflows; the walk applies there too.

### 5. Clip-group mask bounds

Content 500 x 500 (50..550, 200..700), mask 200 x 200.

| mask | `group.geometricBounds` | children (top first) | mask bounds |
|---|---|---|---|
| PathItem (100..300, 400..600) | `[50,700,550,200]` = the content; `visibleBounds` `[49.5,700.5,550.5,199.5]` | [0] PathItem `clipping === true`, [1] TextFrame, [2] PathItem `clipping === false` | `child.geometricBounds` `[100,600,300,400]` |
| CompoundPathItem (outer 200 x 200, hole 100 x 100) | `[450,700,950,200]` = the content | [0] CompoundPathItem (`clipping` is undefined), [1] PathItem `clipping === false` | `child.geometricBounds` `[500,600,700,400]` |

In the compound mask `pathItems[0]` is the hole (`[550,550,650,450]`) and `pathItems[1]` the outer outline; both have `clipping === true`. So never take the bounds of `pathItems[0]`: use the CompoundPathItem's own `geometricBounds`, which equals the union of its subpaths. Find the mask child: `PathItem` with `clipping === true`, or `CompoundPathItem` with `pathItems.length > 0 && pathItems[0].clipping === true`. The compound mask exists only through `executeMenuCommand("makeMask")`; `group.clipped = false` on it throws "The top item in the group must be a path item to create a mask". A text in a clip group is `editable === true`.

### 6. Bounds of empty texts

| text | left, top, right, bottom | width | height |
|---|---|---|---|
| point `""` | 100, 710.04, 100, 697 | 0 | 13.04 |
| point `\r` | 100, 650.04, 100, 622.6 | 0 | 27.44 |
| point U+0003 | 100, 470.04, 100, 442.6 | 0 | 27.44 |
| point `" "` | 100, 590.04, 102.54, 577 | 2.54 | 13.04 |
| point `"   "` | width 7.63 | 7.63 | 13.04 |
| point `"a"` (control) | width 5.78 | 5.78 | 13.04 |
| area `""`, `\r`, `"a"` | the frame, 120 x 40 | 120 | 40 |

A point text with no visible character is a zero-width sliver one or two lines high, with a valid position, not a point and not NaN. Spaces give a non-zero width. An area text always has its frame's bounds. `visibleBounds` equals `geometricBounds` for point text. The empty texts stay in `doc.textFrames` (9 of 9). Zero area is `right - left === 0` for point text.

### 7. `editable` as the single skip test

12 texts in one document, `typeof editable` is `boolean`.

| text | `editable` | own `locked` / `hidden` |
|---|---|---|
| (a) locked itself | false | true / false |
| (b) hidden itself | false | false / true |
| (c) in a locked group | false | false / false |
| (d) in a hidden group | false | false / false |
| (e) on a locked layer | false | false / false |
| (f) on a hidden layer | false | false / false |
| (g) on a locked sublayer (parent unlocked) | false | false / false |
| (h) on a hidden sublayer | false | false / false |
| (i) on an unlocked sublayer of a locked layer | false | false / false |
| plain text on a layer | true | false / false |
| text in a clip group | true | false / false |
| text in a nested group G1 > G2 | true | false / false |

`tf.locked` and `tf.hidden` show only the object's own flags, so inherited state (c to i) is visible through `editable` alone. All 12 texts are in `doc.textFrames`.

## Scope probe (Task 9)

Measured 2026-10-29 in Adobe Illustrator 30.8.2 (`cs_CZ`). Probe: `tests/probes/probe_scope.jsx`. It runs the real `BTE.Scope.prepare` on a document it builds itself and closes that document unsaved. Every prefab is a 312 pt box with a code text above the centre and a number below it, a clip group holding the graphic (290 pt mask circle over a 312 pt square) and a 283 pt cut circle on the same layer. One part per run.

### Elements and times

`prepare` time is the first call on the freshly built document. Parts were timed afterwards (warm).

| part | structure | elements × texts | prepare | parts (collect / shapes / build / sort) |
|---|---|---|---|---|
| group | 240 prefab groups | 240 × 2 | 64 ms | 18 / not read / 28 / 7 |
| sheets | the same inside 20 sheet groups of 12 | 240 × 2 | 71 ms | 16 / not read / 31 / 6 |
| loose | 240 prefabs, no prefab group | 240 × 2 (cut circles) | 182 ms | 13 / 7 (480 shapes) / 90 / 7 |
| select | sheets; selection = all 260 top-level items | 240 × 2 | 97 ms | 29 / not read / 34 / 7 |
| artboard | groups; active artboard over 6 × 10 prefabs, cutting columns 7 and rows 11 through their centres | 60 × 2 (document scope: 240) | 72 ms | — |
| loose1000 | 500 loose prefabs: 1000 texts, 1500 paths | 500 × 2 | 505 ms | 35 / 19 (1000) / 279 / 27 |
| loose10k | the same plus 16 circles of 60 pt per prefab: 9500 paths | 500 × 2 | 2539 ms | 46 / 181 (9000) / 811 / 28 |

In every structure the elements come out in row order of the grid (element k sits at prefab k). With the parts timed first on loose10k (cold), the parts took 147 / 1079 / 1458 / 29 ms; `prepare` afterwards took 1029 ms. The spec target of 2 s for 1000 loose texts and 10 000 paths holds warm, not on the first read of a fresh document.

Edge cases (part `mixed`), all as expected:

- Skipped: 3 locked (locked text, text in a locked group, text on a hidden layer), 1 overflow, 2 linked.
- A group with one locked and one editable text is one element whose row holds only `{n} free`.
- A text in a clip group gets the mask's bounds `[400,250,500,150]`, not the content's.
- Point texts `""`, `\r` and U+0003 are passed as their own elements; an area text `ab\rcd\r` that fits is kept.

### Optimisation applied

Before: `BTE.Element.build` compared every loose text with every shape (96.8 s for 1000 texts and 9000 shapes); `BTE.Scope.shapes` read `doc.pathItems` (2.5–3.1 s for 9500 paths); `prepare` on loose10k took 93.4 s in total.

Now: `build` buckets the shapes into a grid of about one cell per shape (one record per shape, one array per cell) and a text searches only the cell under its centre; the result equals the full comparison (300 random cases in `test_element.js`). `shapes` walks layers, sublayers and groups through `pathItems`, `compoundPathItems`, `groupItems` and `layers`; it never enters a compound path, so subpaths are left out by construction. Same 9000 shapes in 0.7–1.0 s.

### Engine facts behind it

- **Array access slows down as an array grows.** 2 million reads of a number array:

  | length | 250 | 500 | 1000 | 1500 | 2000 | 3000 | 4000 | 9000 |
  |---|---|---|---|---|---|---|---|---|
  | ms | 188 | 226 | 502 | 892 | 1345 | 2362 | 3435 | 8392 |

  An array of objects behaves the same: 627 ms at 1000, 9123 ms at 9000.
- **Indexing a document-level collection slows down further in.** Over 3000 paths: `doc.pathItems[i]` for the first 500 indices took 10 ms, for the last 500 39 ms. Reading `closed`, `clipping`, `parent.typename`, `uuid` and `geometricBounds` costs little next to the indexing.
- **Document-level collections lag until a redraw.** `doc.pathItems.length` was 0 after creating 3000 ellipses in one script, and 3000 after `app.redraw()`; `layer.pathItems` was current at once (confirms `docs/extendscript-engine-facts.md`). The probe calls `app.redraw()` after building.
- **Garbage-collection pauses dominate the variance.** The same `grid()` call took 121 ms once and 1214 ms the next time. The first `build` on a fresh document took 1.4–1.9 s, a later one 0.44–0.8 s. Copying the bounds into plain arrays changed nothing.
- **Globals survive between `ai-eval` runs.** A `var PARTS_FIRST = true` from one run was still true in the next, so the probe resets the flags it reads.
- **The text-kind enum compares with `===`.** `tf.kind === TextType.POINTTEXT` is `true`; `typeof tf.kind` is `"object"`, `String(tf.kind)` is `"TextType.POINTTEXT"`.
- **`doc.selection` is always a plain array** when no text is being edited: `[object Array]` when nothing is selected, after `doc.selection = null`, and with one text, two texts, or a group plus a text. `tf.selected = true` on a just-created text did not select it; `doc.selection = [items]` does. A child of a selected group reports `selected === false`, so the selection is walked recursively.
- **Compound subpaths are in `doc.pathItems`** (2 of 2).
- **Skipped texts can still be read.** `geometricBounds`, `parent` and `story` are readable for locked texts, hidden texts and texts on a hidden layer.
- **Observed, cause not isolated:** after `d.layers.add()`, a text on the new layer and `visible = false`, `L.textFrames.areaText(L.pathItems.rectangle(...))` on the original visible layer failed with "Target layer cannot be modified". The probe builds the hidden layer last.

### Re-measuring

From the repo root, with 0 documents open:

    tools/ai-eval.sh -t 30 -e 'app.documents.length'     # must print 0
    P=batch-text-edit
    { echo 'var PART = "loose10k"; var PARTS_FIRST = false;'
      cat shared/lib/json2.js $P/src/lib/utils.js $P/src/order.js \
          $P/src/element.js $P/src/scope.js $P/tests/probes/probe_scope.jsx
    } > "$TMPDIR/probe_scope_run.jsx"
    tools/ai-eval.sh -t 600 "$TMPDIR/probe_scope_run.jsx"

Parts: `group`, `sheets`, `loose`, `select`, `artboard`, `loose1000`, `loose10k`, `mixed`, `groupbounds`. Building loose10k takes about 35–60 s. The result is one JSON string; the progress log goes to `Folder.temp/bte_probe_scope.log` unless `LOG_PATH` is set.

### What a plain group covers (ruling R24)

Part `groupbounds` of `probe_scope.jsx`. Structure: outer plain group > { text, plain group > { text `{n}`, clip group: 600 × 600 content square, 100 × 100 mask off-centre } }.

| item | geometricBounds |
|---|---|
| text `{n}` | [100, 1310.04, 113.48, 1297] |
| content | [100, 1400, 700, 800] |
| mask | [500, 1000, 600, 900] |
| clip group | [100, 1400, 700, 800] (the content, fact 5) |
| plain group (text + clip group) | [100, 1400, 700, 800]: text ∪ content, not text ∪ mask [100, 1310.04, 600, 900] |
| outer plain group | [100, 1400, 949.14, 800], the content again |

`visibleBounds` are the same ± 0.5 (stroke). A plain group's own bounds therefore include the clipped-away content of any clip group inside it. A hidden child counts too: a group of a shown square [1000, 500, 1100, 400] and a hidden one [1300, 300, 1400, 200] reports [1000, 500, 1400, 200].

So `BTE.Scope.groupBounds` takes, for a clip group, its mask. For a plain group it takes the union of its children: a child clip group counts with its mask, a child plain group with its own union, every other child with its bounds, hidden ones included. After the change, `prepare` reports [100, 1310.04, 600, 900] for the `{n}` element and [100, 1310.04, 949.14, 900] for the outer one. Cost: grouped scopes of 240 prefabs went from 64–71 ms to 247–340 ms on the first call (timings of this round were noisier: building the probe documents took 5–50 s against 0.2–4 s before). Closed guides (`guides === true`) are no longer shapes (ruling R23); reading the flag added nothing measurable (shapes 181 → 190 ms warm for 9500 paths).

The probe refuses to run with a document open, and it uses `BTE` only behind its own header (`var BTE = undefined; var BTE_PROBE_FRESH = true;`), because the engine keeps globals from one run to the next. Re-run with `PART = "groupbounds"`.

## Write probe (Task 10)

Measured 2026-10-29 in Adobe Illustrator 30.8.2 (`cs_CZ`). Probe: `tests/probes/probe_write.jsx`. It runs the real `BTE.Scope.prepare`, `BTE.Steps.run`, `BTE.Write.apply` and `BTE.Write.verify` on a document it builds itself, reads every text and the fill colour and size of every character back, and closes only that document, unsaved. One part per run.

| part | what | result |
|---|---|---|
| chain | „{kód} {n} Série {série}“ ({kód} red 20 pt, rest black 12 pt) and „Díl {n} {série}“ (the `{` of {n} blue 16 pt, `{s` of {série} green 14 pt, rest black 12 pt); chain Replace {série} → 2026, Number {n} (Číslic 3), Case {kód} upper, Replace {KÓD} → abc | „abc 001 Série 2026“: abc red 20 pt, the rest black 12 pt. „Díl 002 2026“: 002 blue 16 pt, 2026 green 14 pt, the rest unchanged. Every character as expected; `textsWritten` 2, `verify` `[]`, apply 2–4 ms |
| chain | a locked text, a text in a locked group, a text on a hidden layer, same contents | `editable === false` for all three, none in `tfs`, `skipped.locked` 3, contents and every character's format unchanged |
| case | „straße {kód} Ab“ with its own format on every character (size 10 + i, colour by i % 3), „ABC“, „x {kód} y“; chain Case {kód} title, Case Celý text upper | „STRASSE {KÓD} AB“, „ABC“, „X {KÓD} Y“; `verify` `[]`; `textsWritten` 2 (the upper case of „ABC“ changes nothing and is not written) |
| bulk | 240 groups of „{kód}“ (red 14 pt) + „{n}“ (black 10 pt), Replace {kód} → SNB, Number {n} | prepare 408 ms, apply 81 ms for 480 writes, verify 2 ms over 480 texts, 0 differences; 001 … 240 in row order; format kept |
| edge | „a“ + U+1F600 + „b {n}“ | `contents.length` 8 and `characters.length` 8: a surrogate pair is two characters in both, so the indexes match; Replace {n} → 7 written and verified |
| edge | `r = tf.characters[1]; r.length = 10` on „abc“ | throws "the value would result in an illegal text range." (no clamping). `writeEdit` checks the range against the text it read first and names the cause |

**changeCaseTo moves formatting when the length changes.** Upper case of „straße …“ with its own format on every character: the letters after the ß keep their own format, but each letter before it takes its left neighbour's (T has s's, R has t's, A has r's, the first S has a's) and the second S has the ß's. The text is right and the check after the write passes, because it compares only text. Only a length-changing letter (ß, ligatures, digraphs) inside a range with mixed formatting is affected; Czech text has none.

**Undo is not measured by this probe.** `app.executeMenuCommand("undo")` inside the probe's own run took back the whole run, the document's setup included (5 texts → 0), although `app.redraw()` closed the setup before the write. That run also stalled Illustrator for about 18 minutes (AppleEvent timeout, "start" in the log and nothing more); the same part without the Undo finishes at once, so the command is the likely cause. No dialog appeared in Illustrator during the stall (the user, who was at the machine, 2026-10-30). Undo inside the running script therefore does not show what Cmd+Z does after a run; that is left to the manual test (spec §7 item 3). The probe no longer calls Undo.

### Re-measuring

From the repo root, with 0 documents open:

    tools/ai-eval.sh -t 30 -e 'app.documents.length'     # must print 0
    P=batch-text-edit
    { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true; var PART = "chain";'
      cat shared/lib/json2.js $P/src/locale.js $P/src/lib/utils.js shared/lib/numbers.js
      echo 'buildNumbers(BTE);'
      cat $P/src/vars.js $P/src/steps.js $P/src/order.js $P/src/element.js \
          $P/src/scope.js $P/src/write.js $P/tests/probes/probe_write.jsx
    } > "$TMPDIR/probe_write_run.jsx"
    tools/ai-eval.sh -t 300 "$TMPDIR/probe_write_run.jsx"

Parts: `chain`, `case`, `bulk`, `edge`. Building the bulk document takes about 2 minutes. The result is one JSON string (non-ASCII escaped); the progress log goes to `Folder.temp/bte_probe_write.log` unless `LOG_PATH` is set.

## Dialog probe (Task 12)

Measured 2026-10-30 in Adobe Illustrator 30.8.2 (`cs_CZ`). Probe: `tests/probes/probe_dialog.jsx`. It builds its own document of 240 prefabs (12 × 20 groups, „{kód}“ above „{n}“, the builder of `probe_scope.jsx`). It then builds the real `BTE.UI` dialog without showing it, once with the Czech and once with the English locale table, and drives its handlers. It closes only its own document, unsaved. `Storage.load` and `save` are stubbed, so the preset file is neither read nor written.

### The host's layout was broken for unshown windows

In this session ScriptUI reported `$.screens` as one screen [0, 31, 756, 474]; the display is 3024 × 1964 Retina, 1512 × 982 logical. Every new window and control got a default `maximumSize` of 4294967246 × 4294967246 (2^32 − 50). `layout.layout(true)` then gave every unsized control −50 px; a window with one label came out 50 × −5. Setting the maxima afterwards and calling `layout(true)` again did not recover: a test window measured 366 × 253 with the maxima set before its first layout, 74 × 99 after.

The probe therefore raises every made-up maximum to 4000 px before the dialog's first layout, through `BTE.UI.firstLayout`, a one-line method that exists for this reason. The result says `"lifted": true`. Not known: what puts the host in this state, and whether a shown dialog is affected; the family's dialogs are in daily use. Assigning to the global `Window` is silently ignored, so the constructor cannot be swapped.

### Size and texts

| | CS | EN |
|---|---|---|
| window (`window.size`, no title bar) | 1008 × 768 | 1008 × 768 |
| Kroky panel / Náhled panel | 978 × 217 / 978 × 316 | same |
| step list / editor | 528 × 150 / 406 × 187 | 496 × 150 / 438 × 187 |
| editor stack: Číslovat, Nahradit, Velikost písmen | 406 × 154 (154 / 146 / 88 px tall) | 438 × 154 |
| statictext, button, checkbox or radio wider than its control | none | none |

- The preview table (columns 40/300/300/300 px) sets the width.
- An unsized statictext lays out exactly as wide as `graphics.measureString` says (six labels, CS and EN, 0 px apart), so the editor's label axes need no margin.
- The longest step label measured (Nahradit … → 30 × W, cut to 24 characters, with ✗) is 364 px in a 528 px list (EN 358 / 496).
- Kde dropdowns are 220 px wide, items up to 106 px (EN 163). `dropdownlist.add("separator")` gives an item whose `type` is "separator".

### Behaviour

- Right after opening, the list says „[Výchozí]“ (EN „[Default]“) without `*`, and ↺ and Uložit are grey: the in-memory [Výchozí] is resolved with the same variables as the fields.
- Starting from [Výchozí] (Číslovat {kód}), the real handlers built the chain Nahradit {kód} → ABC, Číslovat {n}, Velikost písmen Celý text → malá: row 1 went from „{kód} | {n}“ to „abc | 001“, row 240 reads „abc | 240“; Po sloupcích makes row 2 „abc | 002“.
- „1O“ in Od: ✗ status line, Použít and Uložit jako… grey, and the step's list line ends in ✗.
- Výběr with nothing selected: „0 prvků, 0 textů“, ✗, Použít grey. Back to Celý dokument: 240 rows again.
- Použít right after typing in Od without Enter, and right after Enter (onChange, then Použít at once): the dialog stays, and the preview shows the new value (007, then 008). 500 ms later, Použít closes the dialog and returns the run the preview shows (`run === state.run`): 240 elements, 240 rows of tfs, 4 states. It saves [Last Settings] once.

### Times (ms, 240 elements, a chain of three steps)

| what | CS | EN |
|---|---|---|
| build the dialog (prepare included) | 2847 | 2579 |
| Od committed (keystroke + Enter), 12 times | 237–670, median 306 | 214–622, median 305 |
| refresh with unchanged values, 5 times | 215–589, median 220 | 209–595, median 300 |
| `Steps.run` alone, 8 times | median 24, max 505 | median 24, max 485 |
| select a step | 218–577 | 229–641 |
| change Pořadí | 128–219 | 144–291 |
| Rozsah → Celý dokument (prepare alone 1.8–2.1 s) | 1885 | 1920 |

An instrumented copy split a refresh into phases: the run plus the status took 118–480 ms in steps of about 100 ms against 23 ms for the run alone; the preview update took either 6 or about 100 ms, alternately; every control setter took under 1 ms and `UIModel.rows` 5–6 ms. The 100 ms steps read as garbage-collection pauses. A refresh is over the ~200 ms of spec §6.2, so the preview follows on `onChange` (`BTE.UI.LIVE_EVENT`). Použít holds back a preview that was not yet computed from the current values, or that a text field refreshed less than 400 ms earlier (`BTE.UI.HOLD_MS`). Building the probe document took 3–24 s across runs, and `Scope.prepare` took 1.7–2.1 s here against 0.25–0.41 s for the same structure in Tasks 9 and 10 — a noisy machine; re-measure.

### The arguments object costs about 2 ms per use

Before `94ee5ec` a refresh took 0.4–4 s, because `BTE.Steps.matches` read its replacer's `arguments` and the engine pays about 2 ms for every use:

| 480 calls of | time |
|---|---|
| a function reading `arguments.length` | 984 ms |
| a replace whose callback reads `arguments[0]` | 1061 ms |
| the same replace when nothing matches | 5 ms |
| `matches` through `arguments` | 1.7–3.5 s |
| `matches` with named parameters | 2 ms, identical offsets („ab{n}cd{n}“ → 2 and 7) |

`Steps.run` for the three-step chain went from 3.9 s to 23 ms. A pattern that may capture (an unescaped „(“) keeps the general path, about 2 ms per text with a match. Side observations: `new RegExp("(?:x)|").exec("")` returns null (an empty alternative did not match the empty string); a `for (k in undefined)` loop threw „undefined není objekt“ with the line before reported.

### Re-measuring

Assemble the runner as in the probe's Usage header and run it with `tools/ai-eval.sh -t 600`, with 0 documents open; the probe builds and closes its own. A run takes several minutes. If the AppleEvent times out (−1712), the last "done {...}" line of `Folder.temp/bte_probe_dialog.log` holds the result. In a session where the host's default maximumSize is sane, "lifted" is false and the sizes come from the plain layout; one such re-run would confirm 1008 × 768.

### Fix round 1 (2026-10-30)

The same probe, after `b6fccfa`. The host still gave a default maximumSize of 2^32 − 50, so the maxima were lifted again (`"lifted": true`). The window is 1008 × 768 px in Czech and English, and no text is cut.

| text (CS / EN) | width / its control |
|---|---|
| scope line with the cursor text | 255 / 464 px · 362 / 476 px |
| ✗ cursor error in the messages box | 566 / 944 px · 564 / 944 px |
| hold hint | 485 / 944 px · 480 / 944 px |

In the Number editor (Od, Do, Krok / Formát, Číslic / Opakovat, Znovu po) the first-column controls are 74 px each and the second labels start at x 154 in every row (EN 171).

- **Tick without an event:** a tick set on a list item without any event, then Použít: the dialog settles it first. Step 1 turns off, the preview is recomputed and the hint is the first message line; nothing is applied.
- **„1O“ without Enter:** Uložit jako… still read as live, because no refresh had seen the edit. After `settle()` it and Uložit are grey and both handlers return before the name prompt.
- **Hold:** typing then Použít, and Enter then Použít, hold with the hint as before. 500 ms later Použít applies the run the preview shows.
- **Times:** a refresh took 225–709 ms (median 246–346); a Rozsah change about 2 s.
- Reading the messages box after the hint was cleared gave no line at all (probably `"".split(regex)` returns no element in the engine); harmless, noted.

## End-to-end probe (Task 13)

Probe: `tests/probes/probe_e2e.jsx`, Illustrator 30.8.2, locale cs, run 2026-10-31. The real modules and the real `src/main.js` ran together (the file read from disk and run through `new Function` with its own `alert` and `$`). Only `BTE.UI.show` and `BTE.Summary.show` were stubbed; the `UI.show` stub uses the real `Scope.prepare` and `Steps.run`. Each part ran in its own `ai-eval` call, started at 0 open documents, closed the probe's own document unsaved and left 0 documents. No Undo command was called.

| part | setup | result |
|---|---|---|
| main | 240 prefab groups of „{kód}“, „{n}“, „Série {série}“, chain Replace {kód}→ABC, Number {n} Číslic 3, Replace {série}→2026 | calls in order: ui.show, apply, verify, summary. Preview: 240 elements, 720 texts, canApply true. `textsWritten` 720, `verify` `[]`. One summary with pairs 240 changed elements, 720 changed texts, 0 skipped, 0 mismatches; no note, no details; no alert, nothing logged. 0 of 240 elements wrong: element 1 „ABC \| 001 \| Série 2026“, element 240 „ABC \| 240 \| Série 2026“ |
| locked | 3 prefabs, the {kód} text of prefab 2 locked | skipped `{locked: 1}`; pairs 3 elements, 8 texts, 1 skipped, 0 mismatches; details exactly `⚠ ` + `L.count("SKIP_LOCKED", 1)`; `textsWritten` 8, `verify` `[]`; the locked text stayed „{kód}“ while element 2 still took part (002, 2026) |
| fail-dom | 20 prefabs; `BTE.Write.writeEdit` wrapped so its 15th call throws | calls ui.show, apply, summary (no verify). Summary „Chyby: 1“, note „Zápis se zastavil před koncem.“, details „Zápis se zastavil u prvku 15, zapsáno 14 textů. Zpět (Cmd+Z) vrátí celý běh.“ (= `ERR_WRITE_AT`); the simulated failure text appears nowhere in the summary; the log has one line `[BTE] BTE.Write.apply: step 1, element 15, text 1: …`; 14 elements hold ABC, as expected |
| fail-drift | 20 prefabs; the {kód} text of element 10 changed by hand after the preview | same path; „…u prvku 10, zapsáno 9 textů…“; the log has the drift detail (first difference at character 5; 6 characters in the document, 5 in the preview); 9 elements hold ABC and element 10 is untouched |
| note | widths in the dialog font via `graphics.measureString` | notes 316 / 180 / 137 px against 500 px (`Summary.NOTE_W`); labels Změněné prvky: 93, Změněné texty: 91, Přeskočené texty: 103, Neshoda po zápisu: 116, Chyby: 40 px against the 150 px label column — everything fits |

Part main took 5.2 s in total incl. the stub dialog's `prepare` and `Steps.run`. One Cmd+Z reverting the whole run is left to the manual test, as are the `⚠`/`✗` glyphs in the Summary's details box (the Summary window was not rendered headless).

After the fix round (`ca9e586`, 2026-11-03) part main took 228 ms in total; the difference to 5.2 s was not investigated (the machine was noisy during the first run).

### Log file (`BTE.Utils.log`)

`File.writeln` ends lines with CR on macOS by default (measured 2026-11-03, Illustrator 30.8.2); with `f.lineFeed = "Unix"` a second real run wrote LF. Append mode (`open("a")`), UTF-8 Czech and creating `Folder.userData/batch-text-edit/` were confirmed in the same run. The e2e probe sends the log to its own temp file, so the user's `bte.log` is never written by a probe.

## Dialog probe (1.1.0)

Measured 2026-11-10 in Adobe Illustrator 30.8.2 (`cs_CZ`) with `tests/probes/probe_dialog.jsx` 1.1.0. The probe document now holds the 240 prefabs in 20 aršíky of 3 × 4 (4 across, 5 down, 100 pt apart; a sheet group on the layer, prefab groups in it, the blocks of `test_scope.js`). The probe reports the checks (a)–(h) per language in `checks`; all are true in Czech and English. The host's default maximumSize was 1462 × 932 this time, so nothing was lifted (`"lifted": false`), and the plain layout gives the same 1008 × 768 px as the lifted one of 2026-10-30.

### Size and texts

| | CS | EN |
|---|---|---|
| window, at open and after every check | 1008 × 768 | 1008 × 768 |
| Po aršících / By sheet (text / checkbox) | 63 / 81 px | 49 / 67 px |
| v každém aršíku / in every sheet | 96 / 114 px | 81 / 99 px |
| longest scope line (99999 prvků, textů, aršíků, přeskočené) / its line | 397 / 507 px | 396 / 515 px |
| step list / editor | 515 × 150 / 419 × 187 | 484 × 150 / 450 × 187 |
| texts wider than their control | none | none |

- Po aršících is the last control of the Pořadí row. v každém aršíku is the last control of the Opakovat / Znovu po row and starts at x 305 (EN 339), where Krok starts in the first row; the editor grew by 1 px in Czech and not at all in English.
- The # column holds "20 · 240" (50 px). It is 68 px now, 28 px taken from Původní (columns 68/272/300/300), so the window keeps its width; no separate Aršík column. Other samples: "99 · 999" 50 px, "– · 240" 41 px, "999 · 9999" 65 px. The 17 px kept beside the text is the spare the 1.0 column left around "240" (23 px in 40); a rendered cell cannot be measured headless.

### Behaviour

- Ticking Po aršících re-sorts without reading the document (39 ms): row 13 is "2 · 13", row 12 "1 · 12", and the scope line says "240 prvků, 480 textů, 20 aršíků". Unticking gives "13" again and the line without aršíky.
- v každém aršíku is grey while Po aršících is off and live with it on. On, with Od 1, row 13's final column is "abc | 001" again (row 12 "abc | 012", row 240 "abc | 012").
- Do 10 with v každém aršíku: "⚠ Krok 2: 40 prvků zůstane beze změny, řada končí na Do 10.", Použít stays on.
- A handler that throws a plain string shows it: "✗ Dialog narazil na chybu (probe: a plain string). …", and Použít, Uložit and Uložit jako… are grey. When drawing the status fails as well, the three buttons are still grey (before M6 they stayed live and the message read "(undefined)").
- "1O" typed in Od, then Použít: the dialog stays, Použít is grey, and the hold hint is not shown (M5); before, the hint asked to confirm a grey Použít.
- Opened on a last run with Po aršících and v každém aršíku (Do 10): the checkbox is ticked, row 13 is "2 · 13", the after column "{kód} | 001", the cut line counts 40. ↺ to [Výchozí] turns both off and re-sorts, and the list shows "[Výchozí]" without "*".
- Right after opening, [Výchozí] shows no "*": the dialog's values now carry `bySheet` like every loaded preset.

### Times (ms, 240 elements, a chain of three steps; CS / EN)

| what | CS | EN |
|---|---|---|
| build the dialog (prepare included) | 586 | 523 |
| Po aršících on | 39 | 40 |
| Od committed, 12 times | 67–149, median 83 | 71–154, median 90 |
| refresh with unchanged values, 5 times | 66–84 | 71–94 |
| change Pořadí | 59–67 | 60–61 |
| Rozsah → Celý dokument (prepare alone) | 442 (406) | 489 (459) |

A refresh took a third of what it took on 2026-10-30 (190–670 ms), under the ~200 ms of spec §6.2. `BTE.UI.LIVE_EVENT` stays `onChange`; that decision was not re-made here.

### Re-measuring

As before: assemble the runner from the probe's Usage header and run it with `tools/ai-eval.sh -t 600`, with 0 documents open; the probe builds and closes its own document (2.6 s to build it this time). The result's `cs.checks` and `en.checks` hold (a)–(h), `noStar`, `noClipped`, `size` and `holds`.

## By-sheet probe (1.1.0)

Measured 2026-11-10 in Adobe Illustrator 30.8.2 (`cs_CZ`). Probe: `tests/probes/probe_scope.jsx` (parts `bysheet`, `bysheetclip`, `bysheetmasked`, `bysheetcliptexts`, `real`). It runs the real `BTE.Scope.prepare(doc, "document", "rows", bySheet)` on 20 sheets (aršíky) of 3 x 4 prefabs laid out 4 across and 5 down (240 prefabs, 480 texts), and on the user's three test files opened read-only (alerts off, PDF options saved and restored, closed unsaved, never saved). A sheet is the nearest group above an element's group. Each synthetic result carries an `expect` object of booleans computed in code and an overall `ok`; all four were `ok: true`.

### Synthetic sheets

| part | structure | sheetCount on | first 13 sheet numbers | element 49 |
|---|---|---|---|---|
| bysheet | sheet group > prefab group > texts | 20 (12 each) | 1 x12, 2 | sheet 5 |
| bysheetclip | the same, the sheet group is a clip group | 20 (12 each) | 1 x12, 2 | sheet 5 |
| bysheetmasked | sheet group > sticker clip group > plain group > texts (spec 4.3) | 240 = elements | 1..13 | sheet 49 |
| bysheetcliptexts | texts directly in the sticker's clip group | 240 = elements | 1..13 | sheet 49 |

Option off: `sheets` is null and `sheetCount` 0. In bysheet and bysheetclip element 4 without the option is element 13 with it (the 4th prefab of the first row lies in sheet 2); the key set is the same, the order differs. In the masked structures every sheet holds one element and the key order is identical off and on. Repeated runs give identical results.

### Time of prepare on 240 prefabs (ms, off / on)

| part | cold (first call) | warm (second call) |
|---|---|---|
| bysheet | 870 / 485 | 487 / 489 |
| bysheetclip | 864 / 472 | 481 / 518 |
| bysheetmasked | 890 / 731 | 519 / 757 |
| bysheetcliptexts | 903 / 708 | 563 / 743 |

With ordinary 12-element sheets the option costs about nothing warm (489 against 487 ms). The cost shows with one-element sheets (every sticker its own sheet): warm 519 -> 757 ms and 563 -> 743 ms, about 0.2-0.24 s more, because every element then has its own sheet whose bounds are read.

### The user's files

| file | elements | sheetCount | first 13 | keys off vs on | prepare off / on cold | off / on warm |
|---|---|---|---|---|---|---|
| Zund_Summa_Test_geoup.ai (sticker = group) | 240 | 0 | all 0 | same order | 989 / 456 | 461 / 508 |
| Zund_Summa_Test_geoup arch.ai (stickers in groups of 12) | 240 | 20 (12 each) | 1 x12, 2 (element 49 in sheet 5) | same set, different order | 882 / 512 | 493 / 475 |
| Zund_Summa_Test.ai (no groups) | 240 | 0 | all 0 | same order | 2258 / 579 | 572 / 573 |

All as spec 4.4 expects. Not checked geometrically: that sheet 1 of the arch file is the top-left one. The cold range of `prepare` on these files was 0.46-2.3 s; the first call on a freshly opened document is the slow one.

### Timing against 1.0

On 2026-10-29 the same probe measured group 64 ms and sheets 71 ms; today it measures group 694 and 741 ms and sheets 693 ms, about 10x more. The same probe with the modules from before the by-sheet commit (0fa634f^) gave 767 and 773 ms, so the difference is not reading the sheet (Task 3). `Element.build` alone takes 291-323 ms now against 28 ms then. The numbers of 2026-10-29 look like the outlier: the dialog probe of 2026-10-30 already measured `Scope.prepare` at 1.7-2.1 s against 0.25-0.41 s in Tasks 9 and 10 ("a noisy machine; re-measure"), and `docs/manual-test.md` 9.1 expects 1.7-2.1 s of text collection when the dialog opens (that is an expectation taken from the probe; no manual-test measurement is recorded). Today's cold prepare on 240 prefabs is 0.7-1.0 s on the synthetic parts, over the 0.5 s of the task brief. The cause of the machine difference was not investigated; re-measure on a fresh Illustrator before treating it as a code problem.

### Re-measuring

From the worktree root, with 0 documents open:

    tools/ai-eval.sh -e 'app.documents.length'     # must print 0
    P=batch-text-edit
    { echo 'var BTE = undefined; var BTE_PROBE_FRESH = true;'
      echo 'var PART = "bysheet"; var PARTS_FIRST = false;'
      # for part real: var REAL_FILES = ["/abs/one.ai", "/abs/two.ai"];
      cat shared/lib/json2.js $P/src/lib/utils.js $P/src/order.js \
          $P/src/element.js $P/src/scope.js $P/tests/probes/probe_scope.jsx
    } > "$TMPDIR/probe_scope_run.jsx"
    tools/ai-eval.sh -t 600 "$TMPDIR/probe_scope_run.jsx"

One part per run. The first run builds the 240 prefabs slowly (about 40 s once, then 0.4-2.5 s).

## Manual-test probe (1.1.0a)

Measured 2026-11-10 in Adobe Illustrator 30.8.2 (`cs_CZ`). Probe: `tests/probes/probe_manual.jsx`, run on the modules of the 1.1.0a test build (a build of the same sources gives its SHA-256 `eb7b3067…`). It opens a copy of one of the user's three test files, builds the real dialog without showing it, drives it the way `docs/manual-test.md` does (field text with onChanging/onChange, dropdown selection, onClick), clicks Použít after `BTE.UI.HOLD_MS`, runs the real `src/main.js` and captures only the summary window. The written document is read back by position (reading order of the text frames' centres; aršík = the group above the sticker), not from the tool's own order, and every text's font, size, colour, horizontal scale, tracking and anchor and every path's bounds are compared before and after. The settings file and the log are files of the probe's own; `alert`, `confirm` and `prompt` are locals of the wrapper (the globals cannot be reassigned). 15 parts, one write at most per part, every document closed unsaved; the user's `settings.json` and the three originals stayed byte for byte.

All 48 checks passed:

| manual test | what the probe checked |
|---|---|
| 1.0 | a 1.0.0 settings file (no `bySheet`, no `perSheet`) opens without a repair note; "*" only when the last run differs; the file is not rewritten |
| 1.1–1.4 | title, Rozsah, "240 prvků, 480 textů", Po aršících off, footer; no statictext, button or checkbox wider than its control; Kde items with counts; 37 controls, each with a helpTip of at most two sentences, none on Použít and Storno |
| 1.5 | wiring only: Storno is the button named "cancel" |
| 2.1–2.5, 3.1–3.3 | preview, status and messages; 240 / 480 / 0 in the summary; 001–240 and SNB SK 101–340 in reading order on the sheet; format, anchors and the artwork unchanged |
| 5.1–5.5 | the arch file numbered by rows across aršíky; one selected aršík = 12 elements, 001–012; the file without groups pairs code and number (240 of 240) and numbers by columns; a second artboard over the left half holds 120 elements |
| 6.2, 6.6–6.8 | ↑ ↓ + −; "1O": ✗ in the status and on the step, Použít, Uložit and Uložit jako… grey, no hold hint, the field's pen red (0.9, 0.2, 0.2) and grey 0.75 again after the fix; Do 230 cuts 10 with both warnings; lower case written, format unchanged |
| 6.5 | logic only: the step's tick cleared in the list without any event, Použít holds with the hint, the next Použít writes without that step |
| 7.2 | a locked text: "· přeskočené texty: 1", summary 1 skipped with a ⚠ line, the text unchanged, its sticker numbered |
| 8.1–8.4 | "*" after the last run, ↺, [Výchozí] with Uložit asking for a name and the file unchanged, the delete question word for word, the preset gone from list and file |
| 10.1–10.6 | Do 100: 001–100 by rows, 140 `{n}`, both warnings in the summary details; Po aršících: "20 aršíků", # from "1 · 1" to "20 · 240", aršík s holds 12s+1…12s+12; v každém aršíku + Do 10: 001–010 and two `{n}` in every aršík; "v každém aršíku" grey with its tick and the warning; the warning without aršíky and the same order; preset „Aršíky“ keeps both ticks |

Times: dialog build 0.8–1.4 s (2.9 s on the file without groups), a committed field 52–91 ms (median 83), Po aršících 84–117 ms, write + check + summary 3.6–6.4 s.

Not covered, by nature: Cmd+Z (4.1, 4.2), a real click, Enter and focus change (6.1, 6.3–6.5), a cursor in a text (7.1: a script cannot place one), and how things look on screen: a truncated cell (# column 68 px against 50 px of "20 · 240" is a measurement, not a rendering), the red field, the ⚠ glyph (summary.js unchanged since 1.0.0).
