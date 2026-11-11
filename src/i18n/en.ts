import type { ru } from './ru';

export const en = {
  'notice.forecast':
    'An educational mathematical model, not an election forecast. Everything is calculated in your browser only.',
  'book.growth.warning': 'Unusual rate — check the assumption.',
  'book.compact.turnout.question': 'Group turnout',
  'book.compact.turnout.explain':
    'Choose what share of each group votes. These are assumptions, not facts about its name.',
  'book.turnout.derived':
    'Overall turnout is calculated exactly when the data determine it. Otherwise 70% is used as an explicit fallback assumption.',
  'book.compact.growth.question': 'Annual group population change',
  'book.compact.growth.explain':
    'Start at 0%. Move a slider in 0.25-point steps, or type an exact rate. The slider spans −5% to +5%; the field also retains valid values outside that range.',
  'book.growth.visual':
    '− shrinks · 0 stays level · + grows. Rates compound each year; future turnout change is zero in this new setup.',
  'book.compact.coalitions.question': 'Who is willing to cooperate?',
  'book.compact.coalitions.explain':
    'Select a party. Each end is that party’s own decision: ✓ willing, ✗ refuses. Click either end to change only that decision.',
  'book.compact.compose.question': 'Who are the voters of each party?',
  'book.compact.compose.explain':
    'Choose a party: of 100 of its voters, how many come from each group? Each party adds up to 100%; you can go on once every party is distributed.',
  'book.compose.party': 'Party',
  'book.compose.align': 'Align to 100%',
  'book.compose.assumption':
    'The starting value assumes equal shares of the groups. It is not a statistic: change it to your own picture.',
  'book.pair.decision': '{from}: refusal to cooperate with {to}',
  'book.pair.summary':
    'Cooperation follows the individual pair-end decisions; initially everyone is willing.',
  'book.review.growthRates': 'Annual growth: {items}.',
  'unit.percentagePoints': 'pp',
  'panel.variantChange': '{before} before, {after} now',
  'panel.alphabet': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'panel.sourceChanged':
    'Source data changed: the previous experiment was reset. The next turnout edit starts a new experiment.',
  'panel.unusualGrowth':
    'Unusual rate — check the assumption. This guide is not a demographic law.',
  'panel.largestGap': 'Largest population gap',
  'panel.populationLegend':
    'Solid: voted. Hatched: did not vote. Black tick: source population share; dashed box: shortfall; solid box: excess. Differences are assumptions, not statistical findings.',
  'panel.enlarge': 'Enlarge',
  'panel.votes': 'Party votes',
  'panel.supporters': 'Supporter turnout',
  'panel.population': 'Population and voters',
  'panel.populationShort': 'Pop.',
  'panel.populationAll': 'All voters (if everyone came)',
  'panel.populationVoters': 'Who came to vote',
  'panel.populationPiesNote':
    '«All voters» shows group shares if everyone voted; «Who came» shows shares among those who voted (legend: all / came). Both follow from party votes, their compositions and group turnout; party votes do not change. Hover a slice to see the group.',
  'panel.voters': 'Voters',
  'panel.align': 'Align to 100%',
  'panel.smooth': 'Smooth',
  'panel.undo': 'Undo smoothing',
  'panel.stale': 'Results are waiting for valid entries and exact 100% totals.',
  'panel.experimentNote':
    'The first change freezes party/group cohorts. Targets change their turnout, held constant in experimental futures: saved annual turnout changes are neither applied nor deleted. Any source edit, including alignment, ends the experiment; the next target starts a new one.',
  'panel.resetExperiment': 'Reset experiment',
  'panel.correctTurnout': 'Correct baseline group turnout',
  'panel.correctionNote':
    'Group turnout is a secondary picture-of-the-world assumption, not direct statistics. Applying changes population and overall turnout, not party vote shares, compositions or seats. Smoothing or a supporter experiment can change compositions later.',
  'panel.guide':
    '45–85% is only your scenario guide, not a statistical norm or a limit.',
  'panel.confirmCorrection':
    'Apply these assumptions to the shared scenario and reset previous experiments?',
  'panel.confirm': 'Confirm',
  'panel.apply': 'Apply',
  'panel.source': 'As in source',
  'panel.unknown':
    'Population or composition is unknown. Supply explicit assumptions; no equal split is invented.',
  'panel.refused': 'Cannot apply',
  'panel.matched':
    'Rows total 100% and the population matches the reference exactly.',
  'panel.fallback':
    'Rows total 100%; these groups cannot match the reference with the current locks',
  'panel.lock': 'Lock this value',
  'panel.locked': 'Locked',
  'panel.movable': 'Movable',
  'panel.previous': 'Previous party',
  'panel.next': 'Next party',
  'panel.populationNote':
    'Population inferred from votes, composition and turnout is a scenario assumption, not evidence about real voters.',
  'panel.tiles': 'Coalition tiles',
  'panel.nearest': 'Nearest',
  'panel.add': '+ Add',
  'panel.remove': 'Remove tile',
  'panel.favourites': 'Favourites',
  'panel.variantCount': 'Compatible variants: {count}',
  'panel.incomplete': 'Bounded search: the list may be incomplete',
  'panel.custom': '+ Build your own…',
  'panel.own': 'Custom',
  'panel.suspended':
    'The group model is switched off: after your edit of votes, composition or turnout, the saved linked model (for example from the Data tab) no longer matches the numbers. Supporter turnout and the projection are unavailable. Press the button below to rebuild the model from the current votes, compositions and group turnout; the shares you entered do not change.',
  'panel.rebuild': 'Rebuild the model from current numbers',
  'panel.existing': 'This coalition already exists — {label} will be shown',
  'panel.existingShown': 'This coalition is already shown: {label}',
  'panel.parliament': 'Share of all parliament seats',
  'panel.inside': 'Share within coalition',
  'panel.pivotal': 'Pivotal',
  'panel.joiners': 'Could join',
  'panel.refusedBy': 'Refusal by',
  'panel.relations': 'Party decisions',
  'panel.growthMode': 'Demographic future · up to 4 coalitions',
  'panel.experimentMode': 'Turnout experiment · 1 coalition',
  'panel.play': 'Play / pause',
  'panel.speed': 'Years per second',
  'panel.original': 'Original present',
  'panel.today': 'Changed turnout today',
  'panel.future': 'Changed turnout in the future',
  'panel.series': 'Population shares over 50 years',
  'panel.advanced': 'Previous linked controls and comparisons',
  'panel.shareSum': 'Sum of party shares',
  'panel.agreed': 'Agreed',
  'panel.notHundred': 'Not 100%',
  'panel.turnoutNow': 'Turnout · base → now',
  'panel.turnoutShare': 'share of the whole population',
  'panel.votesHint': '% of valid votes · step 0.25 pp · locks',
  'panel.locksKept': 'keeps locks',
  'panel.beforeTurnout': 'before turnout',
  'panel.now': 'now',
  'panel.decrease': 'decrease by 0.25 pp',
  'panel.increase': 'increase by 0.25 pp',
  'panel.compositionTitle': 'voter composition',
  'panel.compositionHint':
    'Step 0.25 pp. Enter the composition freely; a lock marks a share you are sure of. Smooth changes only unlocked shares.',
  'panel.turnoutValue': 'turnout {value}%',
  'panel.byGroup': 'How each group votes',
  'panel.byGroupNote':
    'Each pie is 100% of the group’s voters, split by party.',
  'panel.rulesHint':
    'The chosen party decides on the left, the party in the row on the right. ✓ ready to sit together, ✗ refuses.',
  'panel.surplus': '+{count} above majority',
  'panel.shortBy': '{count} short',
  'panel.timeline': 'Today → in {years}',
  'unit.years.one': '{n} year',
  'unit.years.two': '{n} years',
  'unit.years.few': '{n} years',
  'unit.years.many': '{n} years',
  'unit.years.other': '{n} years',
  'panel.years': 'Years: 0 — {max}',
  'panel.toStart': 'To start',
  'panel.speedValue': '{value} years/s',
  'panel.growthTitle': 'Voter group growth',
  'panel.growthHint':
    'Growth per year, % · share on the right: today → chosen year',
  'panel.sameCoalitions': 'The same coalitions over the years',
  'panel.sameNote':
    'Year 0 on the left is frozen. Only group sizes change; turnout and preferences within groups stay constant.',
  'panel.coefLegend': '−1: no one · 0: as in the base · +1: everyone',
  'panel.resetTurnout': 'Reset turnout',
  'panel.coefficient': 'Turnout coefficient',
  'panel.zeroTurnout': 'Return turnout to the base',
  'panel.rulesTitle': 'Rules: who will not sit with whom',
  'panel.rulesParty': 'Selected party',
  'panel.more': 'More',
  'panel.allResults': 'All coalitions, pivotal parties and refusals',
  'panel.majorityYes': 'majority reached',
  'panel.noSeats': 'no result',
  'panel.seatsOf': '{seats} of {total}; majority {majority}',
  'panel.overallTurnout': 'Overall turnout',
  'panel.majorityOf': 'Majority: {count} of {seats}',
  'panel.thresholdLine': 'Threshold: {value}%',
  'panel.pp': 'pp',
  'panel.fromStart': 'Population from the start',
  'panel.growthSource': 'Growth as in source',
  'panel.trendNote':
    'Line colours are the groups above; share of all voters, %. The vertical line is the chosen year.',
  'panel.seatChange': '{change} seats',
  'panel.nationalVotes': 'national vote',
  'panel.cardLabel': 'Coalition in card {number}',
  'panel.removeCard': 'Nothing — remove the card',
  'panel.originalToday': 'Original · today',
  'panel.inYears': 'In {years}',
  'panel.newToday': 'New turnout · today',
  'panel.newFuture': 'New turnout · in {years}',
  'panel.experimentChoice': 'One coalition for the experiment',
  'panel.experimentSplit':
    'Turnout: {turnout} seats; then demography: {demography} seats.',
  'panel.experimentTable':
    'Seats of the chosen coalition parties and their shares within it',
  'panel.colParty': 'Party',
  'panel.colOriginal': 'Original',
  'panel.colNew': 'New turnout',
  'panel.groupTurnouts': 'Resulting group turnout: base → experiment',
  'panel.nationalAll':
    'National vote of all parties: original → experiment in {years}',
  'panel.pieNote':
    'The pie is all seats in parliament; grey is the other parties. The black mark is the majority. Having the seats does not mean the parties agree to work together.',
  'panel.futureDetails': 'Detailed tables, charts and coalition choice',
  'app.title': 'Election simulator',
  'app.untitled': 'Untitled scenario',
  'region.editor': 'Inputs',
  'region.results': 'Results',
  'nav.label': 'Sections',
  'language.label': 'Interface language',
  'storage.clear': 'Clear saved data',
  'storage.cleared': 'Saved data cleared. The next visit opens in Hebrew.',
  'storage.failed':
    'Saved data could not be cleared: the browser blocked access to storage.',
  'validity.valid': 'Scenario is valid',
  'validity.invalid': 'Scenario has errors',
  'status.allocated': 'Seats allocated: {seats}',
  'status.invalid':
    'Errors in the scenario: {count}. Results are hidden until they are fixed.',
  'status.noAllocation.no-valid-votes':
    'No seats allocated: there are no valid votes.',
  'status.noAllocation.no-party-qualifies':
    'No seats allocated: no party passed the threshold.',
  'view.inputs': 'Data',
  'view.seats': 'Seats',
  'view.coalitions': 'Coalitions',
  'view.compare': 'Comparison',
  'view.composition': 'Composition',
  'view.future': 'Coalition simulations',
  'legacy.title': 'Scenario with older settings',
  'legacy.notice':
    'The original calculation is retained. The new rules apply only after you review and confirm the conversion.',
  'legacy.groupMode': 'Party shares are still calculated from group votes.',
  'legacy.participation':
    'The saved participation factor still affects the number of voters.',
  'legacy.restrictions':
    'Earlier selection and compatibility restrictions still apply; effective prohibitions are shown as party pairs.',
  'legacy.restricted':
    'Some choices are unavailable under a saved restriction. Conversion opens all parties while keeping the current weights.',
  'legacy.validity':
    'The saved ballot-validity rates apply, rather than the standard 99.9%.',
  'legacy.majority': 'The saved nonstandard majority still applies.',
  'legacy.majorityRule': 'Earlier majority rule: {value} seats.',
  'legacy.turnoutChange':
    'The earlier annual turnout change affects the projection; conversion resets it to zero.',
  'legacy.prepare': 'Review conversion',
  'legacy.preview': 'Before and after conversion',
  'legacy.previewNote':
    'Stored party shares and effective pair restrictions are preserved. The original can have no allocated seats while the converted version does. Valid votes, the majority and projections may change. Displayed numbers are rounded.',
  'legacy.before': 'Before conversion',
  'legacy.after': 'After conversion',
  'legacy.current': 'Current results',
  'legacy.future': 'Demographic future: year {year}',
  'legacy.futureSearch':
    'New coalitions are not searched in the future year; the selected coalition is recalculated from that year’s seats.',
  'legacy.groupTurnout': 'Group turnout, %',
  'legacy.pairs': 'Effective forbidden pairs',
  'legacy.pairsPage': 'Page {page} of {pages}',
  'legacy.previous': 'Previous pairs',
  'legacy.next': 'Next pairs',
  'legacy.noSelection': 'No coalition selected.',
  'legacy.searchIdle': 'Coalition search has not started.',
  'legacy.searchPartial':
    'The search is incomplete; absence of a coalition is not established.',
  'legacy.confirm': 'Confirm conversion',
  'legacy.cancel': 'Cancel',
  'legacy.exportOriginal': 'Download original scenario',
  'legacy.exportError':
    'The original scenario could not be downloaded. The current scenario was not changed.',
  'legacy.searchUnavailable':
    'The coalition search for the converted scenario is unavailable without a worker.',
  'legacy.error.invalid-scenario':
    'Correct the scenario errors first. Nothing was changed.',
  'legacy.error.no-valid-votes':
    'There are no valid votes, so party shares cannot be derived. Nothing was changed.',
  'legacy.error.unrepresentable-vote-matrix':
    'The group vote distribution cannot be represented exactly. Check shares and ballot validity; nothing was changed.',
  'legacy.error.precision-limit':
    'Exact values exceed the format’s precision limit. Nothing was rounded or changed.',
  'legacy.error.pair-limit':
    'There are too many restrictions for the new format. Nothing was changed.',
  'legacy.error.invalid-candidate':
    'The converted scenario did not validate. The original was not changed.',
  'legacy.error.stale-preview':
    'The input, year or selected coalition changed. Review the conversion again.',
  'legacy.issueCount': 'Validation issues: {count}.',
  'workspace.title': 'Parties and turnout',
  'workspace.partyShare': 'Vote share for {name}, %',
  'workspace.overallTurnout': 'Overall turnout, %',
  'workspace.groupTurnout': 'Turnout for {name}, %',
  'workspace.groups': 'Group turnout',
  'workspace.noGroups':
    'No groups are specified. Party results remain available without them.',
  'workspace.legacy':
    'This scenario uses group inputs: party shares are calculated from group votes. Direct party-share and overall-turnout edits are unavailable here; the original rules are retained.',
  'workspace.assumption':
    'With an active linked model, changing a party share redistributes votes within groups as an assumption. Locks do not prevent turnout-driven changes.',
  'workspace.baselineShare': 'Change from baseline, pp',
  'workspace.baselineSeats': 'Seat change from baseline',
  'workspace.majorityNote':
    'Educational calculation: Hamilton, not the Israeli Bader–Ofer method. A majority of seats does not guarantee political cooperation.',
  'compare.empty':
    'Save the current scenario as a baseline, then change the inputs to see what moves.',
  'compare.save': 'Save as baseline',
  'compare.saveAgain': 'Save current as baseline',
  'compare.reset': 'Reset to baseline',
  'compare.clear': 'Clear baseline',
  'compare.baselineLabel': 'Baseline:',
  'compare.totals': 'Totals',
  'compare.groups': 'Groups',
  'compare.parties': 'Parties',
  'compare.coalitions': 'Coalitions',
  'compare.column.baseline': 'Baseline',
  'compare.column.current': 'Current',
  'compare.column.change': 'Change',
  'compare.column.name': 'Name',
  'compare.column.votes': 'Votes',
  'compare.column.voteShare': 'Vote share, %',
  'compare.column.seats': 'Seats',
  'compare.column.status': 'Threshold',
  'compare.column.turnout': 'Turnout, %',
  'compare.total.population': 'Eligible voters',
  'compare.total.cast': 'Ballots cast',
  'compare.total.valid': 'Valid votes',
  'compare.total.turnout': 'Turnout, %',
  'compare.total.majority': 'Seats for a majority',
  'compare.presence.added': 'new',
  'compare.presence.removed': 'removed',
  'compare.coalitions.pending': 'Waiting for the search',
  'compare.coalitions.inconclusive':
    'A search stopped early, so a coalition missing on one side is not proven to be gone.',
  'composition.target': 'Party or list',
  'composition.caption': 'Who votes for {name}',
  'composition.column.group': 'Group',
  'composition.column.potentialShare': 'Share of supporters, %',
  'composition.column.potential': 'Supporters before turnout',
  'composition.column.validShare': 'Share of votes, %',
  'composition.column.knownValidShare': 'Known share of all votes, %',
  'composition.column.valid': 'Valid votes',
  'composition.total': 'Total',
  'composition.unknown': 'Composition unknown',
  'composition.partyBasis':
    'Shares refer to valid votes for the selected party. They describe voters, not the whole population; unknown composition is not the Other group.',
  'composition.unknownExplanation':
    'The composition of these votes is unknown: individual group shares cannot be treated as zero.',
  'composition.partial':
    'Only part of the composition is known. The shares use all votes as their denominator; the unknown part is shown separately.',
  'composition.noValidVotes': 'This list has no valid votes.',
  'composition.demographics.consistent':
    'The initial population agrees with the entered compositions and group turnout. This checks assumptions, not their real-world plausibility.',
  'composition.demographics.unknown-party-composition':
    'Group population cannot be checked because the composition of one or more parties with votes is unknown. This does not establish plausibility.',
  'composition.demographics.unknown-population':
    'Data are missing or turnout is zero, so group population cannot be determined. This does not establish plausibility.',
  'composition.demographics.inconsistent-demographics':
    'The entered compositions and group turnout imply a population inconsistent with the total number of eligible voters. Current election results remain available.',
  'composition.demographics.suspended-model':
    'The linked model is suspended after a composition change. Current results remain available, but demographic calculations require rebuilding the model.',
  'linkedTurnout.ready':
    'Changing group turnout recalculates party votes. This is an illustrative model; long fractions are displayed approximately but stored exactly.',
  'linkedTurnout.unknown-party-composition':
    'Linked turnout is unavailable because the composition of one or more parties with votes is unknown. Party results remain available.',
  'linkedTurnout.unknown-population':
    'There is not enough information to determine group populations and preferences. Party results remain available.',
  'linkedTurnout.inconsistent-demographics':
    'The entered compositions and group turnout do not agree with overall turnout. Check the assumptions.',
  'linkedTurnout.suspended-model':
    'The linked model is suspended and its assumptions are retained. Rebuilding proportionally aligns the group turnout profile with overall turnout.',
  'linkedTurnout.rebuild': 'Rebuild linked model',
  'linkedTurnout.invalid-scenario':
    'Correct the scenario errors first; the change was not applied.',
  'linkedTurnout.party-mode-required':
    'This setting is available only in party mode.',
  'linkedTurnout.unknown-group': 'The group no longer exists.',
  'linkedTurnout.unknown-party': 'The party no longer exists.',
  'linkedTurnout.unknown-lock': 'A locked party no longer exists.',
  'linkedTurnout.invalid-percent':
    'Enter a percentage from 0 to 100. The change was not applied.',
  'linkedTurnout.locked-total-exceeded':
    'The requested and locked shares exceed 100%.',
  'linkedTurnout.no-unlocked-recipient':
    'No unlocked party can receive the redistribution.',
  'linkedTurnout.precision-limit':
    'The supported precision was exceeded. Enter fewer digits.',
  'linkedTurnout.invalid-result':
    'The change could not be saved. Check the scenario data.',
  'linkedTurnout.turnout-overflow':
    'That overall turnout would require turnout over 100% in a group. The change was not applied.',
  'linkedTurnout.forbidden-transfer':
    'The group restrictions make this redistribution impossible. The change was not applied.',
  'linkedTurnout.search-limit':
    'The search for a permitted redistribution exceeded its limit. The change was not applied.',
  'partyComposition.title': 'Party voter composition — optional',
  'partyComposition.unknown':
    'Composition is unknown. This is not the same as the Other group.',
  'partyComposition.begin': 'Create equal illustrative shares',
  'partyComposition.assumption':
    'Enter an assumed composition of the party’s valid votes. Changing it does not change the party’s votes or seats in the current election.',
  'partyComposition.rule':
    'Changing one share adjusts the others proportionally; if all are zero, the remainder is divided equally.',
  'partyComposition.groupLabel': 'Share of {name} in the party’s votes, %',
  'partyComposition.chart': 'Illustrative party vote composition by group',
  'partyComposition.approximate':
    'Long fractions are displayed approximately; viewing them does not change their exact values. Legend shares are rounded to hundredths while preserving a 100% total.',
  'partyComposition.markUnknown': 'Mark composition unknown',
  'partyComposition.confirmUnknown':
    'Remove the entered shares and mark the composition unknown?',
  'partyComposition.confirm': 'Mark unknown',
  'partyComposition.error.invalid-scenario':
    'First correct the scenario errors; the entered shares have not changed.',
  'partyComposition.error.party-mode-required':
    'This editor is available only in party mode.',
  'partyComposition.error.unknown-party': 'The party no longer exists.',
  'partyComposition.error.unknown-group': 'The group no longer exists.',
  'partyComposition.error.no-groups': 'First add at least one group.',
  'partyComposition.error.already-known': 'Composition is already specified.',
  'partyComposition.error.composition-unknown': 'First specify a composition.',
  'partyComposition.error.invalid-percent':
    'Enter a percentage from 0 to 100. The change was not applied.',
  'partyComposition.error.no-unlocked-recipient':
    'There is no other group to receive the remainder: a single group must remain at 100%.',
  'partyComposition.error.precision-limit':
    'The supported precision was exceeded. Enter fewer digits.',
  'partyComposition.error.invalid-result':
    'The shares could not be saved. Check the scenario data.',
  'composition.basis':
    'Supporters before turnout: the group size times its preference for this list. Valid votes: what the group cast after turnout, participation and ballot validity.',
  'composition.noVotes':
    'This list has no supporters and no votes, so the shares are not defined.',
  'future.year': 'Projection year',
  'futureVisual.population': 'Group populations: today and future',
  'futureVisual.votes': 'Valid party votes: today and future',
  'futureVisual.unavailable': 'Unavailable',
  'futureVisual.zero': 'Total 0: the chart is empty.',
  'futureCritical.red': 'Red party set',
  'futureCritical.orange': 'Orange party set',
  'futureCritical.empty': 'No parties selected.',
  'futureCritical.half': 'At least half the seats: {value}',
  'futureCritical.majority': 'Majority ({needed} seats): {value}',
  'futureCritical.yes': 'yes',
  'futureCritical.no': 'no',
  'futureCritical.progress': 'Checking year {year} of {max}',
  'futureCritical.cancel': 'Cancel search',
  'futureCritical.retry': 'Retry search',
  'futureCritical.idle': 'Search not started.',
  'futureCritical.done': 'Search finished. Results are below.',
  'futureCritical.cancelled': 'Search cancelled. The range is incomplete.',
  'futureCritical.failed': 'Search failed: {message}',
  'futureCritical.proven':
    'First reaches at least half the seats in year {year}.',
  'futureCritical.firstKnown':
    'First known half-seat crossing: year {year}. Earlier years have missing results.',
  'futureCritical.incomplete':
    'The range is incomplete; no claim of an unreachable half can be made.',
  'futureCritical.notReached':
    'Half the seats is not reached in any year from 0 to {max}.',
  'futureCritical.workerUnavailable':
    'Background calculation unavailable. The range search has not started, to keep the page responsive.',
  'futureCritical.notGuarantee':
    'Sets are independent and may overlap. Half the seats is not necessarily a majority; seats do not establish willingness to cooperate.',
  'legacy.turnoutChangeActive':
    'This file retains annual turnout changes. They affect future results until you explicitly confirm scenario conversion.',
  'future.heading': 'In {year} years compared with year 0',
  'future.column.base': 'Year 0',
  'future.column.year': 'Year {year}',
  'future.column.population': 'Population',
  'future.totals': 'Totals',
  'future.note':
    'A projection uses assumptions, not a forecast. Growth applies annually. New scenarios hold turnout fixed; old files retain saved changes. Chosen coalitions use the selected year’s seats; new coalitions are not searched.',
  'future.unavailable.unknown-party-composition':
    'Projection unavailable: the voter composition of one or more parties is unknown.',
  'future.unavailable.unknown-population':
    'Projection unavailable: the starting population of one or more groups is unknown.',
  'future.unavailable.inconsistent-demographics':
    'Projection unavailable: the demographic starting data are inconsistent.',
  'future.unavailable.suspended-model':
    'Projection unavailable: the linked model is suspended. Check composition and turnout, then rebuild it.',
  'chooser.title': 'Coalitions to project',
  'chooser.hint':
    'Tick up to four coalitions — the results show how many seats they would hold in the chosen year.',
  'chooser.own': 'Your coalition from the Coalitions tab',
  'chooser.seats': 'seats today: {seats}',
  'chooser.running': 'Searching for today’s winning coalitions…',
  'chooser.none': 'No winning coalition today.',
  'chooser.limit': 'You can tick at most four. Untick one to choose another.',
  'futureCoalitions.title': 'Chosen coalitions',
  'futureCoalitions.empty': 'Tick up to four coalitions in the coalition list.',
  'futureCoalitions.seats': '{seats} of {total} seats',
  'futureCoalitions.majority': 'majority',
  'futureCoalitions.noMajority': 'no majority',
  'futureCoalitions.others': 'Other parties',
  'futureCoalitions.total': 'Coalition total',
  'futureCoalitions.needed': 'Needed for a majority',
  'futureCoalitions.breach': 'Breaks the coalition rules (Coalitions tab)',
  'futureCoalitions.pie':
    '{year}: the coalition holds {seats} of {total} seats, {needed} are needed for a majority, {majority}.',
  'futureCoalitions.pieNone': 'Chart, {year}: {reason}',
  'preset.label': 'Example',
  'preset.load': 'Load example',
  'preset.baseline': 'Baseline scenario (Section 8)',
  'preset.turnoutZero': 'Group 3 turnout zero (Section 8)',
  'preset.share7': 'Group 3 final share 7% (Section 8)',
  'preset.share8': 'Group 3 final share 8% (Section 8)',
  'preset.split': 'Group splits votes between parties',
  'preset.multiBlock': 'Example with several parties',
  'preset.israelExample': 'Israeli educational example (2022)',
  'preset.historical2022': '2022 election — historical preset',
  'history.title': 'Historical reference: the 2022 election',
  'history.source':
    'Sources: the Central Elections Committee of Israel and the published Israel Democracy Institute table. These are 2022 results, not the current political situation.',
  'history.presetNote':
    'Initial shares come from the 2022 results. An edited scenario is a model, not historical results; party voter compositions are unknown.',
  'history.eligible': 'Eligible voters',
  'history.cast': 'Ballots cast',
  'history.valid': 'Valid ballots',
  'history.invalid': 'Invalid ballots',
  'history.turnout': 'Historical turnout, %',
  'history.validity':
    'The model assumes 99.9% valid ballots, so its valid-vote count differs from the historical count.',
  'history.official': 'Official 2022 seats (Bader–Ofer)',
  'history.hamilton': 'Educational seats for the same shares (Hamilton)',
  'history.details': 'All 40 lists and seats',
  'history.list': '2022 list',
  'history.votes': 'Valid votes in 2022',
  'history.share': '2022 vote share, %',
  'history.currentList': 'Current party',
  'history.historicalList': '2022 list to match',
  'history.choose': 'Select',
  'history.match': 'Match',
  'history.resetMatch': 'Remove match',
  'history.restoreMatch': 'Restore default matching',
  'history.matchHelp':
    'An ID is matched only for an unchanged list. Match renamed or split lists manually; each 2022 list may be assigned only once.',
  'history.automatic': 'By list ID',
  'history.explicit': 'Chosen by the user',
  'history.unmatched': 'Unmatched',
  'history.currentShare': 'Current share, %',
  'history.shareChange': 'Change from 2022, pp',
  'history.currentSeats': 'Current seats',
  'history.officialChange': 'Change from official seats',
  'history.hamiltonChange': 'Change from educational seats',
  'history.currentUnavailable':
    'The current scenario is invalid; historical facts remain available.',
  'history.error.duplicate-current': 'The current party was specified twice.',
  'history.error.duplicate-reference':
    'This 2022 list is already matched to another party.',
  'history.error.unknown-current': 'The current party no longer exists.',
  'history.error.unknown-reference': 'This 2022 list does not exist.',
  'history.error.invalid-current': 'Fix the current scenario before matching.',
  'example.israel.note':
    'An educational example after the 2022 Knesset election, not its results and not a poll. Group shares follow the Israel Central Bureau of Statistics for 2022, preferences are assumptions; you can change all of them.',
  'catalog.line': 'List in the 25th Knesset (2022): {about}',
  'catalog.party.likud': 'Likud',
  'catalog.party.likud.about': 'Large right-wing party',
  'catalog.party.yesh-atid': 'Yesh Atid',
  'catalog.party.yesh-atid.about': 'Centrist party with a liberal agenda',
  'catalog.party.religious-zionism': 'Religious Zionism — Otzma Yehudit',
  'catalog.party.religious-zionism.about':
    'Joint 2022 list of the national-religious and right-wing streams: Religious Zionism, Otzma Yehudit and Noam',
  'catalog.party.national-unity': 'National Unity',
  'catalog.party.national-unity.about': 'Centrist joint list',
  'catalog.party.shas': 'Shas',
  'catalog.party.shas.about':
    'Religious party of the Sephardi ultra-Orthodox stream',
  'catalog.party.utj': 'United Torah Judaism',
  'catalog.party.utj.about': 'Ashkenazi ultra-Orthodox list',
  'catalog.party.yisrael-beiteinu': 'Yisrael Beiteinu',
  'catalog.party.yisrael-beiteinu.about': 'Secular right-wing party',
  'catalog.party.raam': 'Ra’am',
  'catalog.party.raam.about': 'Arab party of the Islamic stream',
  'catalog.party.hadash-taal': 'Hadash–Ta’al',
  'catalog.party.hadash-taal.about': 'Arab and Arab-Jewish left-wing list',
  'catalog.party.avoda': 'Labor (Avoda)',
  'catalog.party.avoda.about': 'Social democratic party',
  'catalog.party.meretz': 'Meretz',
  'catalog.party.balad': 'Balad',
  'catalog.party.jewish-home': 'The Jewish Home',
  'catalog.party.economic-freedom': 'Economic Freedom',
  'catalog.party.brave-for-you': 'Brave for You',
  'catalog.party.new-economy': 'New Economy',
  'catalog.party.burning-young': 'Burning Young',
  'catalog.party.pirates': 'The Pirates',
  'catalog.party.environment-animal': 'Environment & Animal Voice',
  'catalog.party.ale-yarok': 'Ale Yarok',
  'catalog.party.nativ': 'Nativ',
  'catalog.party.every-vote-counts': 'Every Vote Counts',
  'catalog.party.yesh-kivun': 'Yesh Kivun',
  'catalog.party.israel-free-democratic': 'Israel Free & Democratic',
  'catalog.party.seder-chadash': 'Seder Chadash',
  'catalog.party.new-independents': 'New Independents',
  'catalog.party.social-leadership': 'Manhigut Chevratit',
  'catalog.party.thirty-forty': '30–40 List',
  'catalog.party.ani-veata': 'Ani VeAta — Israel’s People Party',
  'catalog.party.shachar-social-power': 'Shachar Social Power',
  'catalog.party.jewish-heart': 'Jewish Heart',
  'catalog.party.biblical-bloc': 'Biblical Bloc Party',
  'catalog.party.human-dignity': 'Kvod HaAdam',
  'catalog.party.anachnu': 'Anachnu',
  'catalog.party.tzomet': 'Tzomet',
  'catalog.party.tsav-hashaa': 'Tsav HaSha’a',
  'catalog.party.shma': 'Shma',
  'catalog.party.ichud-bnei-habrit': 'Ichud Bnei HaBrit',
  'catalog.party.kama': 'Kama',
  'catalog.party.koach-lehashpia': 'Koach Lehashpia',
  'catalog.group.secular': 'Secular Jews',
  'catalog.group.traditional':
    'Traditional Jews (Masorti, traditional-religious)',
  'catalog.group.religious': 'Religious Jews, not Haredi',
  'catalog.group.knitted-kippot': 'Knitted kippot, settlers',
  'catalog.group.haredi': 'Ultra-Orthodox Jews (Haredim)',
  'catalog.group.arab': 'Arab citizens',
  'catalog.group.other': 'Other / unclassified',
  'entity.group': 'Group {n}',
  'entity.party': 'Party {n}',
  'entity.block': 'Block {n}',
  'entity.notes.filled': 'Notes (written)',
  'entity.notes.label': 'Notes: {name}',
  'editor.scenario': 'Scenario',
  'editor.scenarioName': 'Scenario name',
  'editor.notes': 'Notes',
  'editor.groups': 'Electorate groups',
  'editor.parties': 'Parties',
  'editor.blocks': 'Blocks',
  'editor.page.of': 'Page {n} of {count}',
  'editor.page.prev': 'Back',
  'editor.page.next': 'Next',
  'editor.page.jump': 'Go to page',
  'editor.page.scenario': 'Scenario and rules',
  'editor.page.group': 'Voter group: {name}',
  'editor.page.groups': 'Voter groups',
  'editor.groupPicture':
    'How a group splits its votes between parties is your picture of the world. The simulator knows nothing about real voters: it shows which seats and coalitions that picture leads to.',
  'editor.partyModeGroupNote':
    'When a consistent linked group model can be built, changing group turnout recalculates overall turnout, party votes and shares, and seats. If party-composition or population data are missing or inconsistent, or the model is suspended, group-turnout editing is unavailable; ordinary party results remain available. Demographic projections are assumptions, not descriptions or predictions of real voters.',
  'editor.name': 'Name',
  'editor.color': 'Color',
  'editor.block': 'Block',
  'editor.noBlock': 'No block',
  'editor.canJoinGovernment': 'Can join the government',
  'editor.add.group': 'Add group',
  'editor.add.party': 'Add party',
  'editor.add.block': 'Add block',
  'editor.limit': 'Limit reached: {count}',
  'editor.notEditable':
    'The scenario structure is damaged, so the editor is unavailable. Load an example.',
  'action.moveUp': 'Up',
  'action.moveDown': 'Down',
  'action.duplicate': 'Copy',
  'action.delete': 'Delete',
  'action.moveUp.label': 'Move up: {name}',
  'action.moveDown.label': 'Move down: {name}',
  'action.duplicate.label': 'Copy: {name}',
  'action.delete.label': 'Delete: {name}',
  'confirm.title': 'Delete “{name}”?',
  'confirm.references.group': 'Used by groups: {count}',
  'confirm.references.party': 'Parties in the block: {count}',
  'confirm.references.pair':
    'Coalition rule pairs: {count} (they will be removed)',
  'confirm.references.composition':
    'The composition of {count} parties uses this group; edit those compositions first.',
  'confirm.references.share':
    'This party has a positive vote share; change the shares first.',
  'confirm.references.model-population':
    'The saved model assigns population to this group even if it currently casts no votes. It cannot be deleted.',
  'confirm.references.model-group-preference':
    'The saved model retains party preferences for this group even if its population is zero. It cannot be deleted.',
  'confirm.references.model-preference':
    'The saved model retains a preference for this party even if it currently receives no votes. It cannot be deleted.',
  'confirm.repair.reassign': 'Hand over to another entry',
  'confirm.repair.remove':
    'Delete with its votes (the scenario stays invalid until fixed)',
  'confirm.repair.unassign': 'Leave the parties without a block',
  'confirm.target': 'Recipient',
  'confirm.confirm': 'Delete',
  'confirm.cancel': 'Cancel',
  'confirm.failed': 'The repair could not be applied. Check the data.',
  'issues.title': 'Errors in the scenario',
  'issue.invalid-json': 'The file is not valid JSON.',
  'issue.too-large': 'The scenario is too large.',
  'issue.unreadable': 'The file could not be read.',
  'transfer.label': 'Scenario file',
  'transfer.export': 'Export Set Up',
  'transfer.import': 'Import Set Up',
  'transfer.issues.title': 'File not loaded',
  'transfer.more': '{count} more problems not shown.',
  'transfer.dismiss': 'Dismiss',
  'issue.not-an-object': 'An object is expected.',
  'issue.unsupported-version': 'This schema version is not supported.',
  'issue.invalid-version': 'The schema version is invalid.',
  'issue.missing-field': 'A required field is missing.',
  'issue.wrong-type': 'The value has the wrong type.',
  'issue.not-an-integer': 'A whole number is required.',
  'issue.invalid-id': 'The identifier is invalid.',
  'issue.duplicate-id': 'The identifier is used twice.',
  'issue.dangling-reference': 'This refers to an entry that does not exist.',
  'issue.duplicate-reference': 'The reference appears twice.',
  'issue.invalid-color': 'Colors must use the #RRGGBB format.',
  'issue.invalid-decimal': 'A decimal number is required.',
  'issue.out-of-range': 'The value is out of range.',
  'issue.invalid-total': 'The shares do not add up to 100%.',
  'issue.too-many': 'There are too many entries.',
  'issue.too-long': 'The text is too long.',
  'issue.invalid-enum': 'This value is not allowed.',
  'issue.inconsistent-majority': 'The majority rule is inconsistent.',
  'issue.empty-destinations': 'The group votes for no party.',
  'issue.disallowed-destination':
    'Votes go to a party this group is not allowed to choose.',
  'issue.restricted-mixed-blocks':
    'A saved restriction does not allow this choice of parties.',
  'issue.invalid-pair': 'A pair needs two different existing entries.',
  'issue.duplicate-pair': 'The pair appears twice.',
  'issue.conflicting-pair': 'The override contradicts an incompatibility.',
  'editor.rules': 'Rules',
  'rules.seatCount': 'Seats',
  'rules.populationTotal': 'Eligible voters',
  'rules.threshold': 'Threshold, %',
  'rules.majority': 'Majority',
  'rules.majority.default': 'Simple (more than half)',
  'rules.majority.override': 'Custom seat count',
  'rules.majorityOverride': 'Seats for a majority',
  'rules.majority.fixed': 'A majority needs more than half of the seats.',
  'validity.note':
    'We assume 0.1% of ballots are invalid — the same for every group and party.',
  'group.populationShare': 'Population share, %',
  'group.turnout': 'Turnout, %',
  'group.validBallotRate': 'Valid ballots, %',
  'group.participationFactor': 'Participation factor, %',
  'group.growthRate': 'Population growth, % a year',
  'group.turnoutChange': 'Turnout change, points a year',
  'group.mode': 'How the group votes',
  'mode.restricted': 'Only for allowed parties',
  'mode.open': 'Freely',
  'group.destinations': 'Where the votes go',
  'group.weight': 'Vote share for {name}, %',
  'total.shares': 'Total of shares:',
  'total.weights': 'Total of votes:',
  'lock.label.on': 'Locked: {name}',
  'lock.label.off': 'Lock: {name}',
  'lock.on': 'Locked',
  'lock.off': 'Lock',
  'rebalance.shares': 'Rebalance to 100%',
  'rebalance.weights': 'Rebalance to 100%',
  'rebalance.refused':
    'Cannot rebalance: locked values exceed 100% or nothing is unlocked.',
  'turnout.shortcut': 'Turnout',
  'turnout.of': 'Turnout of {name}, %',
  'turnout.changes': 'This edit changes:',
  'turnout.sharedParty':
    'Not changed: these groups also vote for other parties.',
  'turnout.sharedBlock':
    'Not changed: these groups also vote outside this block.',
  'turnout.value': 'New turnout, %',
  'turnout.apply': 'Set turnout of the listed groups',
  'turnout.noneParty': 'No group votes for this party.',
  'turnout.noneBlock': 'No group votes for the parties of this block.',
  'results.summary': 'Vote totals',
  'results.parties': 'Parties',
  'results.blocks': 'Blocks',
  'results.hamilton': 'Hamilton calculation',
  'results.votesBar': 'Vote shares',
  'results.seatsBar': 'Seat shares',
  'results.legend': 'Legend',
  'legend.select': 'Show details: {name}',
  'details.title': 'Details: {name}',
  'details.block': 'Block',
  'details.close': 'Close details',
  'results.cutoffTie':
    'The last seat went to one of several parties with equal remainders; the tie-break order decided it.',
  'results.unassigned': 'No block',
  'results.empty': '-',
  'summary.population': 'Eligible voters',
  'hint.open': 'Explanation: {label}',
  'hint.population':
    'Everyone with the right to vote: those who will vote and those who will not. How many of them vote is set by the turnout of the groups.',
  'hint.populationShare':
    "The group's part of everyone with the right to vote, including those who will not vote.",
  'summary.unavailable': 'Unable to vote',
  'summary.abstaining': 'Stayed home',
  'summary.cast': 'Ballots cast',
  'summary.invalid': 'Invalid ballots',
  'summary.valid': 'Valid votes',
  'summary.turnout': 'Turnout, %',
  'summary.threshold': 'Threshold, %',
  'summary.majority': 'Seats for a majority',
  'column.party': 'Party',
  'column.block': 'Block',
  'column.votes': 'Votes',
  'column.voteShare': 'Votes, %',
  'column.status': 'Status',
  'column.seats': 'Seats',
  'column.seatShare': 'Seats, %',
  'column.quota': 'Quota',
  'column.floorSeats': 'Whole seats',
  'column.remainder': 'Remainder',
  'column.remainderSeat': 'Remainder seat',
  'remainder.yes': 'Yes',
  'remainder.no': 'No',
  'qualification.qualified': 'Passed the threshold',
  'qualification.below-threshold': 'Below the threshold',
  'qualification.no-votes': 'No votes',
  'diagram.title': 'Seats in parliament',
  'diagram.caption':
    'Seat chart: {seats} seats, {majority} needed for a majority.',
  'diagram.majority': 'The seat that makes a majority',
  'coalition.status.feasible': 'Feasible majority coalitions exist',
  'coalition.status.deadlock': 'Deadlock: no feasible majority coalition',
  'coalition.status.unknown': 'Unknown: the search did not finish',
  'coalition.status.no-allocation': 'No seats were allocated',
  'coalition.source.party': 'party pair rule',
  'coalition.source.block': 'from a block pair rule',
  'coalition.source.refusal': 'refusal',
  'coalition.idle': 'The coalition search starts after the scenario changes.',
  'coalition.searching': 'Searching coalitions: {nodes} combinations checked',
  'coalition.progress': 'Coalition search progress',
  'coalition.cancel': 'Stop the search',
  'coalition.rerun': 'Run the search again',
  'coalition.cancelled': 'The coalition search was stopped.',
  'coalition.failed': 'The coalition search failed.',
  'coalition.inPage':
    'No background worker is available, so the search ran in the page.',
  'coalition.summary.status': 'Outcome',
  'coalition.summary.search': 'Search',
  'coalition.summary.majority': 'Seats for a majority',
  'coalition.summary.eligible': 'Can join a government',
  'coalition.summary.nodes': 'Combinations checked',
  'coalition.complete': 'Complete',
  'coalition.incomplete.budget':
    'Incomplete: the combination limit was reached',
  'coalition.incomplete.eligible':
    'Incomplete: more than 20 parties can join a government',
  'coalition.overridden': '(set manually)',
  'coalition.minimalWinning': 'Minimal winning coalitions',
  'coalition.noneFound': 'No feasible majority coalition was found.',
  'coalition.rowLimit': 'Showing the first {shown} of {total}.',
  'coalition.column.members': 'Members',
  'coalition.column.seats': 'Seats',
  'coalition.column.margin': 'Margin',
  'coalition.column.opposition': 'Opposition',
  'coalition.balancing':
    'Balancing parties: can govern with either side of a forbidden pair',
  'coalition.forbidden': 'Forbidden pairs',
  'coalition.noForbidden': 'No forbidden pairs.',
  'coalition.larger': 'Larger coalitions ({count})',
  'coalition.larger.none': 'No larger feasible coalition was found.',
  'coalition.larger.partial':
    'Built only from the listed minimal winning coalitions, so the list may be incomplete.',
  'coalition.blocked': 'Majorities blocked by the rules ({count})',
  'coalition.blocked.intro':
    'These parties hold a majority together, but the coalition rules forbid this government.',
  'coalition.blocked.none': 'The coalition rules block no majority.',
  'coalition.blocked.partial':
    'The search reached its combination limit, so the list may be incomplete.',
  'coalition.column.reason': 'Reason',
  'coalition.reason.forbidden': 'Forbidden pair',
  'coalition.reason.ineligible': 'Cannot join a government',
  'coalition.pivotal': 'Pivotal parties',
  'coalition.pivotal.intro':
    'For each party: how many of the {total} permitted minimal winning coalitions include it. Every member is pivotal: without it, its coalition loses the majority.',
  'coalition.pivotal.none':
    'No permitted minimal winning coalition was found, so no party is pivotal in one.',
  'coalition.pivotal.partial':
    'The search was incomplete: counts are lower bounds, and a party in every coalition found may be missing from one not found.',
  'coalition.pivotal.atLeast': 'at least {count}',
  'coalition.column.party': 'Party',
  'coalition.column.coalitions': 'Coalitions',
  'coalition.column.indispensable': 'Needed by every coalition',
  'coalition.unknown': 'Unknown',
  'coalition.choose': 'Your coalition',
  'coalition.evaluation.seats': 'Seats',
  'coalition.evaluation.margin': 'Margin',
  'coalition.evaluation.opposition': 'Opposition',
  'coalition.evaluation.reachesMajority': 'Has a majority',
  'coalition.evaluation.feasible': 'Feasible',
  'coalition.evaluation.minimal': 'Minimal',
  'coalition.evaluation.ineligible': 'Cannot join a government',
  'coalition.evaluation.forbidden': 'Forbidden pairs inside',
  'coalition.yes': 'Yes',
  'coalition.no': 'No',
  'coalition.none': 'None',
  'editor.coalitionRules': 'Coalition rules',
  'pairs.incompatiblePartyPairs': 'Incompatible parties',
  'pairs.incompatibleBlockPairs': 'Incompatible blocks',
  'pairs.compatiblePartyOverrides': 'Allowed exceptions',
  'pairs.effective': 'Pairs in force',
  'pairs.first': 'First',
  'pairs.second': 'Second',
  'pairs.add': 'Add pair',
  'pairs.remove': 'Remove the pair {first} and {second}',
  'pairs.allow': 'Allow {first} and {second}',
  'pairs.empty': 'No pairs.',
  'pairs.unavailable':
    'This rule is unavailable: choose distinct parties without a duplicate or conflicting rule, or check the limit. Legacy exceptions remain until conversion.',
  'pairs.partyRefusals': 'Party refusals',
  'pairs.refuser': 'Who refuses',
  'pairs.refused': 'Whom',
  'pairs.addRefusal': 'Add refusal',
  'pairs.removeRefusal': 'Remove the refusal of {first} to work with {second}',
  'book.scenarioTitle': 'My simulation',
  'book.note':
    'Overall turnout is derived from group composition and turnout when possible; otherwise, 70% is assumed initially. After the questionnaire it is an independent assumption. All numbers are assumptions, not election results or polls.',
  'book.open': 'Questionnaire',
  'book.suggested': 'Example',
  'book.chapter.0': 'Introduction',
  'book.chapter.1': 'Parties',
  'book.chapter.2': 'Electorate',
  'book.chapter.3': 'Turnout',
  'book.chapter.4': 'Party voters',
  'book.chapter.5': 'Future',
  'book.chapter.6': 'Rules',
  'book.chapter.7': 'Coalitions',
  'book.chapter.8': 'Review',
  'book.chapter.label': 'Chapter {n} of {count} · {name}',
  'book.step.group': 'Group {n} of {count}',
  'book.step.party': 'Party {n} of {count}',
  'book.page.intro.question': 'Let us put together your election simulation',
  'book.page.intro.explain':
    'Start with an empty questionnaire, take a ready example or go straight to coalitions. An example can be leafed through and any value changed.',
  'book.page.parties.count.question':
    'How many parties will your simulation have?',
  'book.page.parties.count.explain':
    'With four it is easier to learn the main rules. More parties keep more differences but need more settings. Choose from {min} to {max}.',
  'book.page.parties.naming.question': 'What shall we call the parties?',
  'book.page.parties.naming.explain':
    'You can invent your own names or take familiar ones from Israeli elections. A name alone does not decide who supports a party.',
  'book.page.parties.names.question': 'What are the parties called?',
  'book.page.parties.names.explain':
    'Type your own name or press ▾ to choose a ready list. An empty field keeps the suggested name.',
  'book.page.people.set.question': 'Which voter groups shall we use?',
  'book.page.people.set.explain':
    'Take the Basic set for Israel or describe your own groups. On the right: example group shares from the CBS.',
  'book.page.people.count.question': 'How many voter groups will there be?',
  'book.page.people.count.explain':
    'Every voter belongs to exactly one group. Choose from {min} to {max}.',
  'book.page.people.names.question': 'What shall we call the groups?',
  'book.page.people.names.explain':
    'Type your own name or press ▾ to choose a teaching group. An empty field keeps the suggested name.',
  'book.page.turnout.question':
    'What part of the group “{name}” will come to vote?',
  'book.page.turnout.explain':
    'This is your assumption. Complete party compositions and turnout may determine overall turnout and group sizes; otherwise set overall turnout separately. Initial seats follow party shares.',
  'book.page.overall.turnout.question': 'What is the overall turnout?',
  'book.page.overall.turnout.explain':
    'The share of all eligible voters who voted. 70% is a teaching example. Turnout does not change the party shares you set.',
  'book.page.votes.shares.question': 'How many votes does each party get?',
  'book.page.votes.shares.explain':
    'The share of all valid votes each party gets. Together the parties get 100%; the pie follows the numbers.',
  'book.page.votes.check.question': 'What does the electorate look like?',
  'book.page.votes.check.explain':
    'Known contributions use all valid votes as the denominator. Group shares among eligible voters can be estimated only with sufficient composition and turnout assumptions.',
  'book.check.group': 'Group',
  'book.check.voters': 'Of valid votes',
  'book.check.share': 'Of eligible voters',
  'book.check.stat': '2022 population estimate',
  'book.check.unknownValue': 'unknown',
  'book.check.unknown': 'Unknown composition: {share} of all votes.',
  'book.check.populationUnavailable':
    'Group sizes are unavailable: composition or turnout assumptions are insufficient. Linked group turnout and projections need complete, consistent assumptions.',
  'book.check.none': 'No party gets votes from this group, so its share is 0%.',
  'book.check.invalid':
    'The structure cannot be worked out: check the party votes and the turnout.',
  'book.page.growth.ask.question': 'Will the size of the groups change?',
  'book.page.growth.ask.explain':
    'If a group has 1000 voters today, 2% growth gives 1020 a year later. This changes the number of voters, not their preferences.',
  'book.page.growth.question':
    'How does the size of the group “{name}” change per year?',
  'book.page.growth.explain':
    'Growth of 2% a year gives 1020 voters a year later instead of 1000. A negative number means the group shrinks.',
  'book.page.turnoutChange.ask.question':
    'Will participation in elections change?',
  'book.page.turnoutChange.ask.explain':
    'A turnout of 70% rising by 1 percentage point becomes 71% a year later. This is a separate setting, not population growth.',
  'book.page.turnoutChange.question':
    'How does the turnout of the group “{name}” change per year?',
  'book.page.turnoutChange.explain':
    'The value is in percentage points: +1 turns 70% into 71% a year later. A negative number means turnout falls.',
  'book.page.rules.seats.question': 'How many seats does the parliament have?',
  'book.page.rules.seats.explain':
    'Seats are shared among the lists by their votes. The Knesset has 120 seats. Choose from {min} to {max}.',
  'book.page.rules.threshold.question': 'What minimum result does a list need?',
  'book.page.rules.threshold.explain':
    'The threshold decides who takes part in the seat allocation. Votes for a list below it stay valid.',
  'book.page.coalitions.mode.question': 'Which parties can work together?',
  'book.page.coalitions.mode.explain':
    'Several parties together can form a majority. You set the allowed combinations; the app does not infer them from names.',
  'book.page.coalitions.question':
    'Who is the party “{name}” ready to work with?',
  'book.page.coalitions.explain':
    'Tick the parties it is ready to share a coalition with. An unticked box is the refusal of this party only: the other party answers on its own page. If either of the two refuses, no coalition includes both.',
  'book.page.review.question': 'Shall we check your answers?',
  'book.page.review.explain':
    'Only your settings are here, no results. Press “Build my simulation” to see the calculated outcome.',
  'book.choice.parties.naming.own': 'Invent my own names',
  'book.choice.parties.naming.catalog': 'Pick names from Israel',
  'book.choice.parties.naming.example':
    'Educational example of six lists (2022)',
  'book.choice.people.set.example': 'Basic (Israel)',
  'book.choice.people.set.own': 'Describe my own groups',
  'book.choice.growth.ask.no': 'No, the size stays the same',
  'book.choice.growth.ask.yes': 'Yes, I will set growth for each group',
  'book.choice.turnoutChange.ask.no': 'No, turnout stays the same',
  'book.choice.turnoutChange.ask.yes':
    'Yes, I will set a change for each group',
  'book.choice.coalitions.mode.all': 'Any parties can work together',
  'book.choice.coalitions.mode.custom': 'I will set the limits myself',
  'book.field.name': 'Name {n}',
  'book.coalition.canJoin': 'Can join the government',
  'book.coalition.partners': 'Ready to work with:',
  'book.unit.growth': '% a year',
  'book.unit.turnoutChange': 'pp a year',
  'book.remainder.done': 'Total: 100%',
  'book.remainder.left': 'Left to share: {rest}%',
  'book.remainder.over': 'Over 100% by {over}%',
  'book.remainder.invalid': 'The total cannot be counted: check the numbers.',
  'book.error.count': 'Enter a whole number from {min} to {max}.',
  'book.error.percent': 'Enter a number from {min} to {max}.',
  'book.error.sumUnder':
    'Together they must make 100%: {rest}% is left to share.',
  'book.error.sumOver':
    'Together they must make 100%: now it is over by {over}%.',
  'book.error.length': 'A name can be at most {max} characters long.',
  'book.error.choice': 'Choose one of the options.',
  'book.narrator.count.small':
    'Parties in your simulation: {count}. This is a small educational example that makes the main rules easier to follow. For comparison: in 2021, {won2021} of {ran2021} competing lists entered the 24th Knesset, and in 2022, {won2022} of {ran2022} entered the 25th. So few parties do not reproduce all the differences of those elections.',
  'book.narrator.count.medium':
    'Parties in your simulation: {count}. This keeps more differences but needs more settings. For comparison: in 2021, {won2021} of {ran2021} competing lists entered the 24th Knesset, and in 2022, {won2022} of {ran2022} entered the 25th.',
  'book.narrator.count.large':
    'Parties in your simulation: {count}. This is close to the number of lists that enter the Knesset, and there will be many settings. For comparison: in 2021, {won2021} of {ran2021} competing lists entered the 24th Knesset, and in 2022, {won2022} of {ran2022} entered the 25th.',
  'book.narrator.naming.own':
    'You will invent your own names. You may describe the voters of each party separately, but it is optional.',
  'book.narrator.naming.catalog':
    'The names will come from the lists of the 25th Knesset (2022). These are names only: the votes of that election are not carried over.',
  'book.narrator.naming.example':
    'You chose the educational example of six lists after the 2022 election. It is a shortened example, not a copy of its results: many lists of that election are missing.',
  'book.narrator.set.example':
    'We will use teaching groups based on 2022 statistics. Party compositions remain unknown unless you enter your own assumptions.',
  'book.narrator.set.own':
    'You will describe your own groups. Every voter will belong to exactly one of them.',
  'book.narrator.growth.no':
    'The size of the groups will stay the same in all future years.',
  'book.narrator.growth.yes':
    'You will set a yearly growth in percent for each group. Preferences do not change with it.',
  'book.narrator.turnoutChange.no':
    'The turnout of the groups will stay the same in all future years.',
  'book.narrator.turnoutChange.yes':
    'You will set a yearly turnout change in percentage points for each group.',
  'book.narrator.coalitions.all':
    'The coalition search will consider any combination of parties.',
  'book.narrator.coalitions.custom':
    'For each party you will mark whether it can join the government and whom it is ready to work with.',
  'book.narrator.turnout':
    'Turnout {turnout}%: of every 100 voters in the group, {turnout} will vote and {rest} will stay home but still belong to the group.',
  'book.narrator.threshold.israel':
    'This is the Israeli threshold. The Israeli seat allocation procedure itself is not reproduced here.',
  'book.narrator.threshold.none':
    'Without a threshold, every list with votes takes part in the seat allocation.',
  'book.narrator.threshold.other':
    'Lists with less than {threshold}% of the valid votes take no part in the seat allocation. Their votes stay valid.',
  'book.facts.open': 'Historical facts',
  'book.facts.title': 'Historical facts',
  'book.facts.explain':
    'Official results of two Knesset elections. They explain your choice but are not part of the simulation.',
  'book.facts.election': '{year}, {knesset}th Knesset',
  'book.facts.ran': 'Lists competing',
  'book.facts.won': 'Entered the Knesset',
  'book.facts.eligible': 'Eligible voters',
  'book.facts.turnout': 'Turnout',
  'book.facts.threshold':
    'Since {since}, the threshold has been {percent}% of the valid votes.',
  'book.facts.source':
    'Source: Central Elections Committee for the Knesset, official results of the 2021 and 2022 elections.',
  'book.facts.close': 'Back to the question',
  'book.review.parties': 'Parties ({count}): {names}',
  'book.review.groups': 'Groups ({count}): {names}',
  'book.review.noGroups': 'No demographic groups',
  'book.review.item': '{name}: {percent}%',
  'book.review.turnout': 'Turnout: {items}',
  'book.review.overallTurnout': 'Overall turnout: {percent}%',
  'book.review.votes': 'Party votes: {items}',
  'book.review.derived': 'Among eligible voters: {items}',
  'book.review.populationUnavailable': 'Group sizes unavailable',
  'book.review.noDemographics': 'Demographic projection not configured',
  'book.review.growth.no': 'Group sizes do not change',
  'book.review.growth.yes': 'Group sizes change over the years',
  'book.review.turnoutChange.no': 'Turnout does not change',
  'book.review.turnoutChange.yes': 'Turnout changes over the years',
  'book.review.seats': 'Seats in parliament: {seats}',
  'book.review.threshold': 'Threshold: {threshold}%',
  'book.review.coalitions.all': 'Any parties can work together',
  'book.review.coalitions.custom': 'Cooperation is set for each party',
  'book.review.edit': 'Change',
  'book.restart': 'Start the questionnaire again',
  'book.confirm.example-count':
    'The educational example has {count} lists. Change the number of parties to {count}?',
  'book.confirm.replace-build':
    'Build the simulation from the questionnaire? The current scenario in the editor will be replaced.',
  'book.confirm.replace-skip':
    'Go to the editor with the questionnaire answers? The current scenario in the editor will be replaced.',
  'book.confirm.restart':
    'Start the questionnaire again? All answers will be removed.',
  'book.confirm.yes': 'Continue',
  'book.confirm.no': 'Cancel',
  'book.nav': 'Questionnaire navigation',
  'book.back': 'Back',
  'book.next': 'Next',
  'book.skip': 'Skip the questionnaire',
  'book.start.label': 'Where to start',
  'book.start.blank.title': 'From scratch',
  'book.start.blank.text':
    'An empty questionnaire: you set the parties, groups and percentages.',
  'book.start.begin': 'Start the questionnaire',
  'book.start.eight.title': '8 parties (free names)',
  'book.start.eight.text':
    'Eight lists, seven groups, turnout, growth and coalition refusals already filled in.',
  'book.start.israel.title': '2022 (educational)',
  'book.start.israel.text': 'The six 2022 lists and the basic Israeli groups.',
  'book.start.skip.title': 'No questionnaire',
  'book.start.skip.text':
    'Straight to coalitions, where you can import your own file.',
  'book.start.book': 'Fill in the questionnaire',
  'book.start.open': 'To coalitions',
  'book.build': 'Build my simulation',
  'book.filled.title': 'Filled in automatically',
  'book.filled.note':
    'A scenario with automatically filled values is an educational example, not a forecast. You can change these settings below.',
  'book.filled.dismiss': 'Hide',
  'book.filled.parties.count': 'Number of parties',
  'book.filled.parties.naming': 'How names are chosen',
  'book.filled.parties.names': 'Party names',
  'book.filled.people.set': 'Group set',
  'book.filled.people.count': 'Number of groups',
  'book.filled.people.names': 'Group names',
  'book.filled.turnout': 'Turnout: {name}',
  'book.filled.overall.turnout': 'Overall turnout',
  'book.filled.votes.shares': 'Party votes',
  'book.filled.compose': 'Party voters: {name}',
  'book.filled.growth.ask': 'Size change',
  'book.filled.growth': 'Size growth: {name}',
  'book.filled.turnoutChange.ask': 'Turnout change',
  'book.filled.turnoutChange': 'Turnout change: {name}',
  'book.filled.rules.seats': 'Number of seats',
  'book.filled.rules.threshold': 'Threshold',
  'book.filled.coalitions.mode': 'Party cooperation',
  'book.filled.coalitions': 'Cooperation: {name}',
  'preset.replace.text':
    'Load “{name}”? Changes to the current scenario will be lost.',
  'preset.replace.confirm': 'Replace',
  'preset.replace.cancel': 'Cancel',
  'book.part': 'Part {n} of {count}',
  'book.caption.turnout':
    'Example: of 10 people in a group, 7 came to vote, a turnout of 70%.',
  'book.caption.voterMix': 'Valid votes; grey represents unknown composition.',
  'book.caption.growth':
    'Example: a group of 1,000 voters growing by 2% a year has 1,020 voters a year later.',
  'book.caption.turnoutChange':
    'Example: a turnout of 70% rising by 1 percentage point a year is 71% a year later.',
  'book.caption.threshold':
    'Example: the dashed line is the threshold. Lists below it win no seats, yet their votes stay valid.',
  'book.suggested.more.names':
    'An empty field gets the grey name. To take a ready list, press ▾ beside the field.',
  'book.suggested.more.choice':
    'The suggested option is already marked. Keep it and press Next, or choose another.',
  'book.suggested.more.value':
    'This is an example value. Keep it and press Next, type your own or choose from the ▾ list.',
  'book.suggested.more.review':
    'This chapter still holds example values; they go into the simulation. Press Change to answer yourself.',
  'book.names.range': 'Names {from}–{to} of {count}',
  'book.names.more': '{n} more after Next',
  'book.pick': 'Choose from the list',
  'book.pick.for': 'Choose from the list: {name}',
  'book.pick.own': 'Own name',
  'book.pick.rest': 'Rest to 100%: {rest}%',
  'book.pick.taken': '{name} (field {n})',
  'book.pick.knesset': '{value}, as in the Knesset',
  'book.pick.israel': '{value}%, the Israeli threshold',
  'book.pick.growth': '{value}% a year',
  'book.pick.turnoutChange': '{value} pp a year',
  'book.page.people.about.question': 'What is a voter group?',
  'book.page.people.about.explain':
    'Social groups are an optional way to describe your view of the electorate. Assumptions about group turnout and party composition help explore overall turnout; names do not determine preferences.',
  'book.lesson.about.share':
    'Size: a group’s share of eligible voters can be estimated when composition and turnout assumptions are sufficient.',
  'book.lesson.about.turnout':
    'Turnout: what part of the group comes to vote (chapter 3).',
  'book.lesson.about.compose':
    'Party make-up: you may assume which groups a party’s voters come from.',
  'book.lesson.about.future':
    'Future: how the size and turnout of the group change by year (chapter 5).',
  'book.lesson.about.note':
    'These are model assumptions, not data on real people; nothing is inferred from the name of a group.',
  'book.page.people.mix.question': 'Where does a party get its votes?',
  'book.page.people.mix.explain':
    'One party draws votes from several voter groups, each in its own share; another draws almost all of them from one group.',
  'book.set.title': 'Example: group shares from the 2022 CBS figures',
  'book.set.source':
    'Source: Israel Central Bureau of Statistics, approximate shares of eligible voters in 2022. “Other / unclassified” completes 100%; the source does not specify party compositions.',
  'book.lesson.mix.title':
    'Example: how the voters of two parties can be pictured — {first} and {second}',
  'book.lesson.mix.caption':
    "The Israeli teaching example; the simulator computed the shares. A bar is all of a party's valid votes (100%), a colour is a voter group (see the key below).",
  'book.lesson.mix.line':
    '{party}: votes from {groups} groups; most from “{top}”, {share}%.',
} as const satisfies Record<keyof typeof ru, string>;
