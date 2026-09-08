-- ===========================================================================
-- Script:      run-jsx.applescript
-- Version:     1.0.0
-- Author:      Ladislav Osvald
-- Updated:     2026-09-07
--
-- Description:
--   Sends a .jsx file to a running Adobe Illustrator via the `do javascript`
--   Apple event and returns whatever the script's last expression evaluates to.
--   Called by tools/ai-eval.sh — not meant to be run directly.
--
--   The script is passed as TEXT read from disk, never interpolated into the
--   command line: ExtendScript is full of quotes and backslashes and every
--   shell-quoting scheme eventually mangles one of them.
--
--   `with timeout` is mandatory, not defensive. The default Apple event
--   timeout fires after ~2 minutes, but was measured tripping at ~7 s of
--   in-Illustrator work (error -1712), which reads as a hang rather than a
--   timeout. An explicit, generous window makes the failure honest.
--
-- Usage: osascript run-jsx.applescript <absolute-path.jsx> [timeout-seconds]
-- ===========================================================================

on run argv
    if (count of argv) < 1 then error "usage: run-jsx.applescript <path.jsx> [timeout-seconds]"
    set jsPath to item 1 of argv
    set secs to 600
    if (count of argv) > 1 then set secs to (item 2 of argv) as integer

    set js to (read POSIX file jsPath as «class utf8»)

    with timeout of secs seconds
        tell application "Adobe Illustrator"
            do javascript js
        end tell
    end timeout
end run
