import {
  groupInput,
  partyInput,
  rulesInput,
  scenarioInput,
  type Json,
} from './scenarios';

export function visualFutureInput(): Json {
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
      groups: [
        groupInput(
          'A',
          '0.6',
          { X: '0.8', Y: '0.2' },
          { turnout: '0.5', growthRate: '0.1' },
        ),
        groupInput('B', '0.4', { X: '0.2', Y: '0.8' }),
      ],
    }),
    name: 'Visual future fixture',
  };
}

/** X rises past half and then falls back below it before year 20. */
export function nonMonotoneFutureInput(): Json {
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 120 }),
      parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
      groups: [
        groupInput('A', '0.45', { X: '1' }, { growthRate: '0.05' }),
        groupInput('B', '0.45', { Y: '1' }, { growthRate: '-0.1' }),
        groupInput('C', '0.1', { Y: '1' }, { growthRate: '0.2' }),
      ],
    }),
    name: 'Nonmonotone future fixture',
  };
}

/** X has 59 seats in year 19 and reaches 62 in year 20. */
export function finalYearCrossingInput(): Json {
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 120 }),
      parties: [partyInput('X', null, 1), partyInput('Y', null, 2)],
      groups: [
        groupInput('A', '0.1', { X: '1' }, { growthRate: '0.12' }),
        groupInput('B', '0.9', { Y: '1' }),
      ],
    }),
    name: 'Final-year future fixture',
  };
}
