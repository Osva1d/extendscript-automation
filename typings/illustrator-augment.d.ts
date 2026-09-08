// ---------------------------------------------------------------------------
// Module: Illustrator DOM augment — gaps in types-for-adobe/Illustrator/2022
// Part of: extendscript-automation dev tooling
// Depends on: types-for-adobe (Illustrator/2022, shared/*)
// ---------------------------------------------------------------------------
//
// types-for-adobe ships Illustrator typings up to 2022 (v26); we run v30.
// Measured against `doc.reflect.properties` in Illustrator 30.8.1 on
// 2026-09-07: of 85 real Document properties the 2022 typings know 77 (91 %).
// Only the gaps this codebase actually touches are declared here — the full
// list of the other seven is in docs/extendscript-engine-facts.md, so adding
// one later is a lookup, not a re-measurement.
//
// Declarations only. Nothing here reaches dist/.

/** Large Canvas scale factor. Added in Illustrator 2021, absent from the 2022
 *  typings. Verified present at runtime in 30.8.1 (returns 1 on a normal doc,
 *  10 in Large Canvas mode). Read by ZSM.Utils.getSF(). */
interface Document {
    scaleFactor: number;
}

/** Provided at runtime by shared/lib/json2.js, which every build concatenates
 *  first. It is a polyfill, so no .d.ts upstream declares it. */
declare var JSON: {
    parse(text: string, reviver?: (key: any, value: any) => any): any;
    stringify(value: any, replacer?: any, space?: any): string;
};
