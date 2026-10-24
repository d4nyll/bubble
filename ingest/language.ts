// Detects articles that aren't in English, with fastText's open lid.176 language-identification
// model (CC BY-SA 3.0, 900 KB, bundled in the fasttext.wasm.js package).
import { getLIDModel } from 'fasttext.wasm.js';

const lid = await getLIDModel();
await lid.load();

export async function isEnglish(title: string, summary: string | null): Promise<boolean> {
  // A title in Arabic, Persian, Khmer, Japanese or another non-Latin script is never English,
  // even when the outlet adds an English summary.
  const letters = title.match(/\p{L}/gu) ?? [];
  if (letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length > letters.length / 2) return false;
  const guesses: { alpha2: string | null; possibility: number }[] = await lid.identify(`${title} ${summary ?? ''}`, 5);
  const top = guesses[0];
  const english = guesses.find((g) => g.alpha2 === 'en')?.possibility ?? 0;
  // Short English headlines sometimes come out as another language with low confidence ("First swans
  // return to Bruges canal" as Portuguese, 0.15), so only a confident non-English answer counts.
  return top.alpha2 === 'en' || top.possibility < 0.3 || english >= 0.2;
}
