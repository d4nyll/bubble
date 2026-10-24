// credibility_score: how likely an article is a credible, factual news report. The website's API
// hides articles below its threshold (see README.md).
import type { NoulAnswer, NoulQuestion } from '@receptron/laya';

export const CREDIBILITY_QUESTIONS = {
  notNews: { type: 'noul', instructions: 'Is this a horoscope, quiz, podcast episode, recipe, advert, sponsored post or live blog?' } as NoulQuestion,
  opinion: { type: 'noul', instructions: 'Is this an opinion column or personal essay?' } as NoulQuestion,
  clickbait: { type: 'noul', instructions: 'Is this headline clickbait or a miracle claim?' } as NoulQuestion,
};

export function credibilityScore(a: Record<keyof typeof CREDIBILITY_QUESTIONS, NoulAnswer>): number {
  return (1 - a.notNews.noul) * (1 - 0.5 * a.opinion.noul) * (1 - a.clickbait.noul);
}
