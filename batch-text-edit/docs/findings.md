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
| 2 | cursor in a text | PENDING (user) | Task 9 reads `selection` defensively until measured |
| 3 | linked frames | `tf.story.textFrames.length > 1` | skip such frames; `nextFrame` is not usable |
| 4 | overflow | the spec's line-sum rule is wrong for any text with a paragraph break; use the walk rule | Task 9 implements the walk rule |
| 5 | clip-group mask | the group's bounds are the content's; the mask child gives the bounds | element centre from the mask child |
| 6 | empty texts | point "", "\r" and U+0003 are zero-width slivers; area text keeps its frame | Task 9 decides whether to pass them |
| 7 | skip test | `editable === false` covers all seven cases | one test is enough |

### 1. uuid

Type `string` on all four types and on children in a group and subpaths of a compound path. Values are small decimal strings (`"473"`, `"474"`, ...) in creation order. Read twice: equal. Unchanged after `app.redraw()`, `translate(10, 0)`, a range write and `tf.contents = ...`. Re-fetched wrappers match: `layer.groupItems[0] === G`, `gt.parent === G`, `doc.textFrames[k] === T`, and the uuids are equal. Over 12 objects in one document (2 groups, 5 paths, 4 texts, 1 compound) there is no duplicate. A duplicate never shares a uuid with its original: `G.duplicate()` is `"481"` against `"473"`, the copied children `"482"`/`"483"` against `"475"`/`"474"`, `T.duplicate()` `"484"` against `"477"`. The numbering is not global: two documents in separate runs both started near 473, so a uuid is unique only inside one document and one run. Not measured: across save and reopen.

### 2. Cursor in a text

PENDING. `probe_cursor_selection.jsx` only reads `doc.selection` and `app.selection`. The controller runs it with the user in four states: text object selected, cursor in the text, 3 characters selected, all characters selected. Record the four JSON results here.

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
