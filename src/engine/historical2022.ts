import { STANDARD_VALID_BALLOT_RATE } from './edit';
import { SCHEMA_VERSION } from './schema';

/** A published 2022 electoral list, before any model allocation. */
export interface HistoricalList2022 {
  readonly id: string;
  readonly votes: number;
  readonly officialSeats: number;
}

export interface HistoricalElection2022 {
  readonly year: 2022;
  readonly eligibleVoters: number;
  readonly ballotsCast: number;
  readonly validVotes: number;
  readonly invalidBallots: number;
  readonly lists: readonly HistoricalList2022[];
}

const lists: readonly HistoricalList2022[] = Object.freeze(
  (
    [
      ['likud', 1115336, 32],
      ['yesh-atid', 847435, 24],
      ['religious-zionism', 516470, 14],
      ['national-unity', 432482, 12],
      ['shas', 392964, 11],
      ['utj', 280194, 7],
      ['yisrael-beiteinu', 213687, 6],
      ['raam', 194047, 5],
      ['hadash-taal', 178735, 5],
      ['avoda', 175992, 4],
      ['meretz', 150793, 0],
      ['balad', 138617, 0],
      ['jewish-home', 56775, 0],
      ['economic-freedom', 15801, 0],
      ['brave-for-you', 14694, 0],
      ['new-economy', 13920, 0],
      ['burning-young', 8800, 0],
      ['pirates', 1728, 0],
      ['environment-animal', 1618, 0],
      ['ale-yarok', 1524, 0],
      ['nativ', 1354, 0],
      ['every-vote-counts', 1292, 0],
      ['yesh-kivun', 1215, 0],
      ['israel-free-democratic', 1157, 0],
      ['seder-chadash', 1078, 0],
      ['new-independents', 1020, 0],
      ['social-leadership', 988, 0],
      ['thirty-forty', 939, 0],
      ['ani-veata', 746, 0],
      ['shachar-social-power', 430, 0],
      ['jewish-heart', 415, 0],
      ['biblical-bloc', 411, 0],
      ['human-dignity', 350, 0],
      ['anachnu', 334, 0],
      ['tzomet', 292, 0],
      ['tsav-hashaa', 262, 0],
      ['shma', 255, 0],
      ['ichud-bnei-habrit', 234, 0],
      ['kama', 205, 0],
      ['koach-lehashpia', 153, 0],
    ] as const
  ).map(([id, votes, officialSeats]) =>
    Object.freeze({ id, votes, officialSeats }),
  ),
);

/** Counts published for the 25th Knesset election, not demographic estimates. */
export const HISTORICAL_2022: HistoricalElection2022 = Object.freeze({
  year: 2022,
  eligibleVoters: 6788804,
  ballotsCast: 4794593,
  validVotes: 4764742,
  invalidBallots: 29851,
  lists,
});

/** A fresh editable model with historical shares and unknown compositions. */
export function historical2022Input(
  colors: Readonly<Record<string, string>> = {},
): Record<string, unknown> {
  return {
    schemaVersion: SCHEMA_VERSION,
    inputMode: 'parties',
    id: 'historical-2022',
    name: '',
    notes: '',
    rules: {
      populationTotal: String(HISTORICAL_2022.eligibleVoters),
      seatCount: 120,
      majorityMode: 'default',
      majorityOverride: null,
      threshold: '0.0325',
      allocationMethod: 'hamilton',
      overallTurnout: {
        numerator: String(HISTORICAL_2022.ballotsCast),
        denominator: String(HISTORICAL_2022.eligibleVoters),
      },
      validBallotRate: STANDARD_VALID_BALLOT_RATE,
    },
    groups: [],
    parties: HISTORICAL_2022.lists.map((entry, index) => ({
      id: entry.id,
      name: '',
      notes: '',
      color: colors[entry.id] ?? '#6B7280',
      blockId: null,
      tieBreakOrder: index + 1,
      canJoinGovernment: true,
      voteShare: {
        numerator: String(entry.votes),
        denominator: String(HISTORICAL_2022.validVotes),
      },
      composition: null,
    })),
    blocks: [],
    coalitionRules: {
      incompatiblePartyPairs: [],
      incompatibleBlockPairs: [],
      compatiblePartyOverrides: [],
      partyRefusals: [],
    },
  };
}
