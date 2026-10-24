// What Bubble counts as good news, and how good_score is worked out from Laya's answers.
// Tune it with `npm run calibrate`, which compares good_score with the labelled examples below.
//
// "Good" means good for humanity: real progress that gives people hope and inspires them to act.
// A feel-good story that exposes a failing system (a fundraiser so a teacher can buy supplies) is
// not good. Small acts of kindness are mildly good, the low end of the mood dial.
//
// Laya follows short yes/no questions better than one long definition, so good_score combines
// several of them.
import type { NoulAnswer, NoulQuestion } from '@receptron/laya';

const yes = (instructions: string): NoulQuestion => ({ type: 'noul', instructions });

export const GOOD_QUESTIONS = {
  progress: yes('Does this report real progress that helps people or the planet?'),
  good: {
    type: 'noul',
    instructions: 'Is this news good for humanity as a whole?',
    criteria: { true: 'real progress for people or the planet', false: 'bad, partisan, commercial, trivial or neutral news' },
  } as NoulQuestion,
  inspiring: yes('Does a person or group here set an example that inspires others to do good?'),
  tribal: yes('Is this a sports match result or an election result?'),
  commercial: yes("Is this mainly about a company's profits, shares or a new product?"),
  crowdfunding: yes('Is this a crowdfunding campaign, GoFundMe or donation drive by members of the public?'),
};

type GoodAnswers = Record<keyof typeof GOOD_QUESTIONS, NoulAnswer>;

export function goodScore(a: GoodAnswers): number {
  // How much progress and inspiration the story carries...
  const base = Math.min(1, 0.15 + 0.5 * a.progress.noul + 0.4 * a.good.noul + 0.3 * a.inspiring.noul);
  // ...pulled down for winners and losers (tribal), company news, and stories that expose a failing system.
  return base
    * (1 - a.tribal.noul) ** 3
    * (1 - 0.8 * a.commercial.noul)
    * (1 - 0.8 * a.crowdfunding.noul);
}

// target: the good_score Daniel and Vat want, from 0 (not good for humanity) to 1 (major progress).
export type Example = { title: string; summary?: string; target: number; why: string };

export const EXAMPLES: Example[] = [
  // Round 0: the definition's own examples
  { title: 'Fundraiser raises $4,000 so teacher can buy every pupil stationery', target: 0.2, why: 'Feel-good, but exposes underfunded schools' },
  { title: 'Department of Education raises classroom budgets so teachers no longer pay for supplies', target: 0.85, why: 'Fixes the underfunding at its root' },
  { title: 'Inspired by her teacher, 15-year-old starts free tutoring club for 200 younger pupils', target: 0.85, why: 'An example that inspires others to do good' },
  // Round 1
  { title: 'Fishermen rescue 40 people from capsized ferry off Lagos coast; 12 still missing', target: 0.5, why: 'Still a tragedy, but more good outcomes than bad' },
  { title: 'Tech giant shares jump 18% after record quarterly profits', target: 0.3, why: 'Good for the company, not necessarily for humanity' },
  { title: 'Opposition party wins landslide in national election, ending 20-year rule', target: 0, why: "Partisan: we can't know whether the change is good" },
  { title: "New drug clears Alzheimer's plaques in mice, raising hopes for human trials", target: 0.7, why: 'Scientific progress; higher if it were in humans' },
  { title: 'Knife crime in London falls to lowest level in a decade', target: 0.65, why: 'Progress: fewer people dying' },
  { title: 'Arsenal beat Chelsea 3-0 to go top of the Premier League', target: 0, why: 'Tribal, like politics' },
  { title: 'Retired teacher, 82, knits 1,000 hats for premature babies', target: 0.5, why: 'Feel-good, but very impactful' },
  { title: 'Government pledges £2bn to end rough sleeping by 2030', target: 0.8, why: 'Large scale and helps many people, though a pledge is not yet delivery' },
  { title: 'Ceasefire holds for third day as aid trucks enter Gaza', target: 0.6, why: 'War is not good, but fewer people dying is progress to peace' },
  { title: 'Humpback whale numbers in South Atlantic recover to pre-whaling levels', target: 0.6, why: 'Conservation working; good for nature is good for humanity' },
  { title: "Pope Francis' body lies in state as thousands pay respects", target: 0.2, why: 'A death' },
  { title: 'Apple unveils thinner iPhone with longer battery life', target: 0.1, why: 'Incremental product, not progress (the first touchscreen iPhone would be 0.8)' },
];
