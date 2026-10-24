// Compare good_score with the scores Daniel and Vat gave the examples in good.ts. Run: npm run calibrate
import { Laya } from '@receptron/laya';
import { EXAMPLES, GOOD_QUESTIONS, goodScore } from './good.ts';

const laya = await Laya.load();
let totalError = 0;
for (const ex of EXAMPLES) {
  const { answers } = await laya.systemOne({ title: ex.title, summary: ex.summary ?? '' }, GOOD_QUESTIONS);
  const score = goodScore(answers);
  const error = Math.abs(score - ex.target);
  totalError += error;
  console.log(`${error > 0.25 ? 'OFF ' : '    '}want ${ex.target.toFixed(2)}  got ${score.toFixed(2)}  ${ex.title}`);
}
console.log(`\nMean error: ${(totalError / EXAMPLES.length).toFixed(3)} across ${EXAMPLES.length} examples`);
await laya.close();
