/* CPAL-1.0 — Original Code: Instagram Reel Automations. Copyright (c) 2026 Cesare-ml. See LICENSE Exhibit A and B. Provided AS IS, without warranty. */
const APOSTROPHES = /['’‘‛`´]/gu;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const EMPHATIC_LETTER_RUN = /(\p{L})\1{2,}/gu;

export function normalizeInstagramText(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("it-IT")
    // Instagram comments often stretch a letter for emphasis (for example
    // "mangoooo"). Collapse only runs of 3+ so legitimate double letters
    // such as "palla" remain distinct from "pala".
    .replace(EMPHATIC_LETTER_RUN, "$1")
    .replace(APOSTROPHES, " ")
    .replace(NON_WORD, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function containsWholeTerm(normalizedText, normalizedTerm) {
  return normalizedTerm.length > 0 && ` ${normalizedText} `.includes(` ${normalizedTerm} `);
}

export function matches(comment, keywords, mode="whole") {
 const normalized=normalizeInstagramText(comment);
 return keywords.some(k=>{
  const term=normalizeInstagramText(k);
  return !!term && (mode==="exact" ? normalized===term : mode==="contains" ? normalized.includes(term) : containsWholeTerm(normalized,term));
 });
}
export function selectVariant(variants, mode, cursor, random=Math.random) {
 if (!variants.length) return "";
 return variants[mode==="random" ? Math.floor(random()*variants.length) : cursor%variants.length];
}
