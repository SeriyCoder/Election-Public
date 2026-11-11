import { partyModeInput, type Json } from './scenarios';

const fraction = (numerator: string, denominator: string) => ({
  numerator,
  denominator,
});

export function workspaceParties(): Json {
  const input = partyModeInput(
    [
      ['1', '5'],
      ['3', '10'],
      ['1', '2'],
    ],
    {
      populationTotal: '1000',
      turnout: '0.6',
      threshold: '0',
      seatCount: 101,
    },
  );
  input.name = 'Workspace parties';
  input.extraDraftData = { retained: 'yes' };
  (input.parties as Json[])[0]!.extraPartyData = 'keep';
  return input;
}

export function workspaceLinked(known = true): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    {
      populationTotal: '1000',
      turnout: '0.6',
      threshold: '0',
      seatCount: 101,
    },
  );
  input.name = 'Workspace linked';
  input.extraDraftData = { retained: 'yes' };
  input.groups = ['G1', 'G2'].map((id) => ({
    id,
    name: id,
    notes: '',
    turnout: '0.6',
    growthRate: '0',
    turnoutChange: '0',
  }));
  const parties = input.parties as Json[];
  parties[0]!.extraPartyData = 'keep';
  if (known) {
    parties[0]!.composition = {
      G1: fraction('4', '5'),
      G2: fraction('1', '5'),
    };
    parties[1]!.composition = {
      G1: fraction('1', '5'),
      G2: fraction('4', '5'),
    };
  }
  return input;
}
