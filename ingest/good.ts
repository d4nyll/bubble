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
  need: yes('Does this show more people struggling, going hungry or in need?'),
};

type GoodAnswers = Record<keyof typeof GOOD_QUESTIONS, NoulAnswer>;

export function goodScore(a: GoodAnswers): number {
  // How much progress and inspiration the story carries...
  const base = Math.min(1, 0.15 + 0.5 * a.progress.noul + 0.4 * a.good.noul + 0.3 * a.inspiring.noul);
  // ...pulled down for winners and losers (tribal), company news, and stories that expose a failing
  // system: people filling a gap with donations, or growing need.
  return base
    * (1 - a.tribal.noul) ** 3
    * (1 - 0.8 * a.commercial.noul)
    * (1 - 0.8 * a.crowdfunding.noul)
    * (1 - 0.8 * a.need.noul);
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
  // Round 2
  { title: 'Malaria vaccine rollout cuts child deaths by 13% across eight African countries', summary: 'WHO data from the first two years of the R21 vaccine programme show 13% fewer deaths among children under five in areas where it was given.', target: 0.85, why: 'Fewer people dying or suffering; good, not great, progress' },
  { title: 'Strangers pay off school lunch debt for every pupil in Texas district', summary: 'A viral appeal raised $86,000 in two days to clear the debts of 4,000 children who had been denied hot meals.', target: 0.3, why: 'Feel-good, but one-off philanthropy instead of systemic change' },
  { title: "Solar overtakes coal as the EU's biggest source of electricity for the first time", summary: "Solar panels generated 22% of the bloc's power in June, more than coal, according to energy think tank Ember.", target: 0.6, why: 'Good progress' },
  { title: 'Man pulled alive from earthquake rubble after three days as death toll passes 2,000', summary: 'Rescuers in western Afghanistan freed the 34-year-old shopkeeper as aid agencies warned of worsening shortages.', target: 0.2, why: 'One feel-good moment in what is largely a tragedy' },
  { title: 'Billionaire pledges $1bn of his fortune to climate research', summary: 'The tech founder said the money would fund carbon removal start-ups and university research over the next decade.', target: 0.6, why: 'Good, but a pledge may not be realised' },
  { title: 'Food bank breaks donation record as demand soars to all-time high', summary: 'The Trussell Trust handed out a record 3.1 million parcels this year, with volunteers collecting more food than ever.', target: 0.2, why: 'Generosity is good, but record demand shows the system failing' },
  { title: 'Qatar reveals 9 visa options available to foreigners arriving at the airport', target: 0, why: 'Irrelevant to humanity' },
  { title: 'French police arrest 135 people, seize weapons: minister', target: 0, why: 'Violence' },
  { title: 'Tourism meets conservation as Sheraton Kampala joins CTPH to protect endangered mountain gorillas', target: 0.7, why: 'Conservation successes are typically 0.7' },
];
