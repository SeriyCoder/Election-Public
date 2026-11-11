# Elections: Flexible Turnout And Coalition Simulator

| Field | Value |
| --- | --- |
| Status | Specification — M1, M2 and M7-01 complete; remaining M7 work open; M3 and M4 on hold; not yet hosted |
| Project root | The `Election` workspace folder |
| Revised | 2026-10-31 (M7-01 party-first mode and resolved audit gaps); earlier: 2026-10-30 (Section 14) |
| Document language | English |

## 1. Purpose And Current Deliverable

Create a shareable, interactive simulator showing how electorate composition,
turnout, voting preferences, electoral thresholds and coalition constraints
affect parliamentary representation. The application must generalize beyond the
supplied four-group example. It is an educational mathematical model, not an
election forecast, legal interpretation or recommendation about real voters.

This document is the source of truth for behaviour. Implementation proceeds one
backlog item at a time through the working loop in `doc/work/`; M1 (engine)
is complete and M2 (first usable release, a single offline file) is complete,
including the questionnaire book, time model and Israeli example in Section
14. M7-01 adds exact party-first inputs and preserves older group-first
scenarios; the remaining M7 items are open. Nothing is hosted yet. The
application lives in the `Election` workspace folder, which is the project
root.

The kickoff decisions confirmed on 2026-10-28 are: update this specification
only; support Russian, English and Hebrew; use manually edited voting
distributions with no behavioral inertia parameter; implement a universal
educational model rather than jurisdiction-specific electoral law; build with
TypeScript, Vite and Preact; reach phones through the hosted link in the phone
browser; deliver in milestones. Revised the same day: a free public preview
link (M3) comes before analysis features (M4), and an installable PWA (M5) is
optional, decided after preview feedback. See Section 13.

**Domain risk — the one property that must never break: correctness and
determinism of the seat calculation.** Identical inputs produce identical seats
on every run, browser and locale; every valid allocation sums exactly to
`seatCount`; display rounding never decides who receives a seat. Every other
requirement yields to this one.

## 2. Recommended Delivery

Static browser application. No server, account, database, Python installation
or paid service is required for users.

### 2.1 Stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, `strict` mode |
| Build | Vite; `vite-plugin-singlefile` for the offline distribution |
| UI | Preact (small runtime, inlines cleanly into one HTML file) |
| Engine tests | Vitest, no DOM, no network |
| Browser tests | Playwright, desktop and narrow phone viewports |
| Arithmetic | Project-owned exact rational module on `BigInt` (Section 6.4) |

No CDN URLs. All dependencies are bundled.

### 2.2 Delivery Modes

Two build targets from one source tree:

| Target | Output | Use |
| --- | --- | --- |
| Offline | One self-contained `elections.html` with scripts, styles, icons, translations and default scenarios inlined | Opens from disk without network; desktop sharing by file |
| Hosted | Static site on a free static host, with link preview metadata and an "educational model, not a forecast" notice | Phone-friendly HTTPS link shared publicly (for example in a social post); PWA install and offline-after-first-visit are optional (M5) |

Delivery order: the working offline HTML and a local link to it first; the
hosted build afterwards, as a separate publication gate. Hosting must not delay
the usable offline version.

Keep asset paths relative and avoid server-only APIs so the same build runs from
`file://` and under any hosting subpath (for example GitHub Pages).

- As built in M2-09: `npm run build` writes only `dist/elections.html`; the
  local link is that file opened as a `file://` URL. A build-only step in
  `vite.config.ts` renames the inlined page and injects a Content-Security-Policy
  meta tag (`default-src 'none'`, inline script and style, `blob:`/`data:`
  workers, `data:` images, `connect-src 'none'`). Vite's module-preload
  polyfill is off. `tests/build/offline.test.ts` builds in memory inside
  `npm test` and checks one file, no external reference or network API, the
  exact policy and a 450 kB budget (300 kB until M2-24 added the drawings,
  350 kB until M2-30 added the coalition chooser and pies).
  Since M2-23 that build runs with `NODE_ENV=production`, so it measures the
  file that ships rather than a test-mode build carrying JSX debug data; the
  file was 294.11 kB at M2-23, 307.90 kB at M2-24 and 362.48 kB at M2-30.
  Since M7-03, a build-only compactor stores the Russian translation keys once
  and reconstructs the English and Hebrew tables from their values in that
  key order. Source tables remain separate and type-checked; mismatched keys
  stop the build, and a test checks every value in the transformed bundle.

Since M3-02, `npm run build:hosted` uses the same application and shared build
plugins to prepare `dist-hosted/` with exactly `index.html`, `preview.png` and
`README.md`. Set `HOSTED_BASE_URL` to the planned HTTPS site URL, with a trailing
slash and no credentials, query or fragment; invalid or missing settings fail
explicitly. The hosted index includes static Hebrew crawler metadata and
relative resource paths; the offline file contains no hosted metadata or URLs.
Installed Microsoft Edge captures the real settled app in a fresh offline
context. Both targets retain inline workers, the CSP and local-only processing.

### 2.3 Phone Path

Version 1 reaches phones through the hosted link opened in the phone browser,
not through app stores and not through an installed app.

- Opening a local HTML file on a phone is unreliable (notably on iOS); the
  hosted link is the supported phone route.
- An installable PWA is optional (M5), built only if preview feedback asks for
  it. Service workers do not run from `file://`, so the offline single file has
  no PWA features. If a service worker is built, it caches the versioned build
  only and never caches or transmits scenario data.
- A store-packaged wrapper (e.g. Capacitor) is a deferred option, considered
  only if a store presence becomes a requirement. The UI must therefore not
  depend on browser-only features a WebView lacks.

### 2.4 Publication Rules

The user approved the publication plan in M3-01. The first publication is a
free, non-commercial **public preview** hosted on GitHub Pages under the user's
GitHub account. On 2026-11-11 the user chose a sanitized snapshot in a
separate public MIT source repository,
`https://github.com/SeriyCoder/Election-Public`, while keeping development
history in a private repository.
The planned address is
`https://seriycoder.github.io/Election-Public/`.

The built page's HTML, bundled application code and bundled examples are
visible to visitors. Reviewed source, tests and safe documentation are intended
for the public repository; the remote MIT license must be verified and retained.
Before the first push, inspect the exact publication file set and all history
to be uploaded for secrets, personal data and local/session artifacts.

A push saves source without releasing the site. The prepared GitHub Actions
workflow deploys only `dist-hosted/`, on explicit manual dispatch from `main`,
after tests, types, lint and browser gates. Build permissions are read-only;
only the separate deploy job receives Pages write and OIDC permissions.
Actions are pinned and checkout credentials are not persisted. M3-03 inspects
the destination and integrates non-destructively before any authorized upload,
configures Pages for Actions and verifies the live HTTPS link. Neither M3-01
nor M3-02 uploads or deploys files. The user explicitly approved the first
non-commercial release before the full M3-05 English/Hebrew language review;
that review remains a post-release follow-up, and the translations must not be
described as fully reviewed until it is complete.

The page is shared by link in a Hebrew-language social post. Its first-visit
language is Hebrew when no language choice is saved; Russian and English are
available in the language switcher, and a saved choice is remembered. The
approved public examples are the shipped "8 parties (free names)" and
"2022 (educational)" starts, the fresh no-group example and the historical
2022 reference. The latter uses official published election data and remains
clearly labelled educational. The eight-party example reproduces the user's
submitted scenario, including recognizable real-party names, group and party
percentages and coalition rules. On 2026-11-08 the user explicitly approved
publishing this example and using it in the preview image. No other user-saved
scenarios, notes or files are included or transmitted by the page.

The link preview has Hebrew metadata (`he_IL`):

| Field | Hebrew value |
| --- | --- |
| Title | סימולטור בחירות וקואליציות |
| Description | מודל לימודי: איך אחוזי ההצבעה, ההעדפות ואחוז החסימה משנים את חלוקת המנדטים ואת הקואליציות האפשריות. לא תחזית. |
| Image | 1200 × 630 PNG of the "8 parties" example's Coalitions page, captured from the built app; the image URL is absolute and under the site address |

Both builds display this non-dismissible header notice on the questionnaire
and every main view, in each interface language (M3-02):

| Language | Notice |
| --- | --- |
| ru | Учебная математическая модель, а не прогноз выборов. Расчёты выполняются только в вашем браузере. |
| en | An educational mathematical model, not an election forecast. Everything is calculated in your browser only. |
| he | מודל מתמטי לימודי, לא תחזית בחירות. כל החישובים מתבצעים בדפדפן שלך בלבד. |

The page has no analytics, cookies, trackers, feedback submissions or external requests; the
existing Content-Security-Policy stays. Feedback is collected outside the app,
for example as comments on the post.

### 2.5 Sharing

Share editable scenarios through versioned JSON import/export. Sharing an HTML
snapshot must preserve the current scenario, baseline, electoral rules and UI
language.

An optional compressed URL-fragment scenario may follow later, with size limits
and a JSON-file fallback. Not required for the first release.

A hosted collaborative service or desktop application is a later alternative
only if simultaneous editing, central storage or permissions become
requirements.

## 3. Core Concepts: Do Not Conflate Them

| Concept | Meaning |
| --- | --- |
| Electorate group | A disjoint population cohort with its own size and turnout |
| Party | An electoral list receiving votes and, if eligible, integer seats |
| Political block | A legacy collection of parties retained in imported scenarios and engine calculations |
| Electorate share | A group's share of the full eligible population |
| Turnout | The fraction of that group's electorate casting a ballot |
| Valid-ballot rate | The fraction of ballots that are valid |
| Vote distribution | A group's valid votes allocated across eligible destination parties |
| Final vote share | A party's fraction of all valid votes, before the electoral threshold |
| Seat-allocation share | A party's fraction of votes surviving the threshold |
| Coalition compatibility | Whether parties may govern together; separate from voting behavior |

In group-input scenarios, electorate groups partition the population and sum
to 100%. Party-input scenarios need no groups to calculate baseline seats;
known party compositions describe valid voters rather than asserting population
shares. Each party belongs to one political block or is explicitly unassigned;
blocks must not double-count votes. A block is not automatically an electorate
group. Several groups can vote for one party, and a single group can split
between parties in different blocks.

## 4. Group-Input Voting Models

Both choices below describe legacy groups in `inputMode: groups`. Their stored
mode remains effective but its selector is hidden in the simplified interface.
New groups use open voting and full participation. In party-input scenarios
the authoritative baseline inputs are party vote shares (Sections 6.1 and 11),
rather than group preference weights.

### 4.1 Restricted-Choice Group

A group votes only for a configured set of parties, usually within one block.
The user can change its turnout and split its votes among those parties, but
cannot silently transfer votes outside its allowed destination set.

Example: a 15% cohort supports one dedicated list, or several lists in its
sector. The restriction is a scenario assumption, not a property inferred from
ethnicity, religion, name or any other demographic label.

### 4.2 Open / Split Group With Manual Distribution

A group can allocate votes across multiple blocks. The user directly edits a
`voteWeights` distribution over its allowed destination parties; weights must
sum to 100%. There is no retention control, automatic baseline/target blending
or behavioral inertia calculation in the first version.

Example: a broad 40% cohort assigns 60% of its valid votes to a party in Block 1,
30% to a party in Block 2 and 10% to a party in Block 4. Its turnout is edited
independently. These percentages describe choices within the cohort, not shares
of the whole electorate.

Saving a baseline creates an independent comparison snapshot; it does not
influence the current distribution. Recalculation always uses current inputs
directly and never compounds previous outputs or introduces inferred voter
behavior.

Both models can coexist in a legacy scenario. The editor keeps the stored mode
and blocks changes that would violate a hidden restricted-choice rule; it
does not silently reassign votes or change modes. Section 5.1 describes the
separately confirmed conversion to the simplified model.

## 5. Editable Inputs And Workflow

- Open a default example or import a scenario; immediately show usable controls
  and results.
- Rename groups and parties; edit their colors and optional descriptive notes.
  Their rows have a collapsed plain-text "Notes" disclosure. A duplicate copies
  the notes; new entities start empty. Legacy block names, colors and notes are
  retained and exported, but block management is not exposed.
- Add, duplicate, delete or reorder groups and parties using stable internal IDs.
- Edit population shares, group turnout and vote destinations. The
  valid-ballot rate is a common 99.9% for new inputs and is not shown as a
  field. A nonstandard legacy rate remains effective and is disclosed in the
  legacy notice; it is not silently reset or exposed as an editable field.
- Change parliament size, threshold and coalition rules. The majority is fixed
  at more than half of the seats and Hamilton is the only method; neither is
  offered as a setting. A file whose `majorityMode` is `override` keeps its
  value and identifies the override until explicitly converted.
- Save a baseline, duplicate named scenarios and compare them side by side.
- Sweep one parameter and inspect where seat totals or possible coalitions
  change.
- Export an editable scenario, a shareable HTML snapshot or result tables as
  CSV.

In party mode, adding or copying a group extends each known composition with a
zero share for the new group and leaves unknown compositions unknown. Party
colours remain editable. Group-first preference and participation controls are
unavailable; removing a positive-share party or a group whose removal would
invalidate a known composition is refused rather than silently changing
shares or discarding data. As built in M7-05, a linked basis is suspended when
a group is added or copied. A new zero-vote party is added to its preference
rows without changing existing assumptions or restrictions. Deletion also
protects modeled population and latent preferences, including when a group
currently has zero turnout or population.

Support at least 20 electorate groups, 30 parties and 10 blocks in the first
release. Do not hardcode four rows, demographic names, 120 seats or fixed
coalition partners. Editing a label must not break preferences, comparisons or
coalition references. Deleting a referenced entity requires confirmation and an
explicit reassignment or validation repair. New entities start with explicit
zero/empty values, not invented votes, and an empty name shown as a localized
default label (Section 10, M2-19). A new ID continues numbering above the
highest existing ID of its kind, so IDs never collide but a deleted highest ID
may be reused.

Group turnout is the canonical value. An optional party turnout shortcut is
available only where a dedicated cohort mapping is unambiguous. For shared
cohorts, show the underlying groups instead of a misleading party-level turnout.
The engine retains block cohort calculations for legacy compatibility, but
the simplified interface has no block-level shortcut.

As built in M2-18 and simplified in M7-09: every group-mode party row has a
closed "Turnout" disclosure. A group feeds a party when the party is an allowed
destination and its weight is not exactly zero (an unreadable weight counts as
a vote). A group is dedicated to a party when every party it feeds is that
party; otherwise it is shared. With one dedicated group the
disclosure shows that group's own turnout field and slider. With several it
lists them and offers one explicit button that writes the typed percent to each
listed group once; a second click changes nothing. Shared groups are listed with
the reason and never changed. Nothing is stored: the lists are recomputed from
the current weights.

Use number inputs alongside sliders for exact values. If an edited share makes a
total invalid, show the error. An explicit proportional rebalance command may
adjust unlocked rows while preserving locked rows; never normalize silently as
the user types. Rebalanced fractions are rounded to 18 decimal places by largest
remainder (ties to the earlier row) so the total is exactly 100%. The command is
refused, and says so, when locked rows exceed 100% or no row is unlocked. Locks
are editing state only and are not saved in the scenario.

As built in M7-02, the party-input engine also offers an exact, share-only
edit: the selected party keeps its entered value, other locked shares remain
fixed, and the remaining parties share the balance proportionally, or equally
when all their previous shares are zero. The selected party can be changed
directly even when it is locked. All scenario parties participate, including
below-threshold lists. Infeasible edits and outputs beyond the schema's exact
fraction limits are explicitly refused without changing the input. The
candidate is canonical and does not change recognized composition or turnout
data. M7-05 applies that candidate through a separate linked group edit when a
current group basis exists; M7-03 exposes the national party controls.

As built in M7-04, a party-input scenario has an optional collapsed composition
editor for each party. Unknown stays unknown until the user explicitly creates
equal model assumptions over the existing groups; with no groups the action is
unavailable and explains why. An entered group percentage is kept exactly and
the other groups receive the remainder in proportion to their previous shares,
or equally when all recipients were zero. A single group must remain at 100%.
Invalid or over-precision edits are refused visibly without changing the last
valid input or seats. Marking a known composition unknown requires confirmation.
The exact composition alone is applied to the original draft, preserving
unrelated and draft-only data. Rounded input text and the colour-keyed pie are
display only; opening, focusing or blurring a field does not save rounding.

As built in M7-05, a party scenario can derive an exact linked group basis
only from complete, consistent party compositions, turnout and population
assumptions. Unknown or inconsistent data leave ordinary party results
available but disable and explain the group-turnout experiment. The existing
group field and slider both call the linked edit; an invalid edit is shown
without changing the last valid input. A group-turnout change recomputes party
shares and positive-party compositions from stored group population shares
and preferences, not previous rounded results. Overall turnout scales the
group profile proportionally without changing seats; an edit that would
exceed 100% in any group is refused. The last nonzero profile permits a return
from zero.

Direct party-share edits use the exact locked national redistribution, then
transfer votes within groups without changing group totals. Existing
contributions are used proportionally where feasible; an exact, bounded
stable-ID residual search reroutes transfers when needed and respects explicit
destination restrictions. Zero prior support alone is not a restriction.
An impossible, over-precision or over-budget edit is refused without mutation.
An explicit composition edit suspends the basis without changing party votes
or seats. Its assumptions remain saved; future projections are unavailable
until an explicit consistent rebuild. Rebuilds can retain known dormant
groups, use the saved nonzero profile at zero turnout, and align a suspended
profile proportionally to a separately changed overall turnout. They refuse
contradictory inputs or scaling above 100%.

As built in M7-03, a direct party-share or overall-turnout edit may create a
derivable linked basis atomically with the edit. A refused edit commits neither.
Unknown, inconsistent or unavailable demographic assumptions leave ordinary
party and overall-turnout edits available; a suspended basis is not silently
rebuilt. Party locks affect direct share redistribution only, not changes due
to group turnout.

A panel edit that suspends a saved basis shows the reason and an explicit
"rebuild from current numbers" action where the supporter or projection view
would be. That rebuild discards the saved profile and builds a fresh basis
from the current party shares, compositions and group turnout, keeping the
saved destination restrictions; it changes no entered value and is refused
without mutation when the current numbers are inconsistent.

### 5.1 Legacy Conversion

As built in M7-09, loading a legacy scenario preserves its stored
participation factors, restricted destinations, validity rates, majority
override, block rules, party exceptions and directed refusals. Results and
future projections continue to use those original values. A notice identifies
the applicable legacy assumptions and effective party-pair restrictions; the
hidden settings are not silently changed. Invalid drafts retain their
validation messages and cannot be converted.

The user may explicitly prepare a candidate, inspect the original and
candidate side by side, cancel, or confirm. The preview shows turnout, cast and
valid ballots, party votes, shares, qualification and seats, effective
restrictions, the chosen-coalition evaluation and the selected future year.
Unavailable allocations or projections and incomplete or unavailable
coalition searches are identified rather than presented as zero or complete.
A separate cancellable worker searches the candidate; if that worker is
unavailable, the preview reports this rather than blocking the interface.
A preview cannot be confirmed after its input, selected year or chosen
coalition changes.

For group-input scenarios, conversion combines each group's participation
factor and turnout, preserves the exact current relative group-by-party valid
vote matrix, stores its population and preference assumptions in the linked
basis, and derives exact party shares and known positive-vote compositions.
Zero-vote compositions remain unknown; known preferences of zero-turnout
groups remain stored. Existing party-mode shares, compositions and linked
assumptions are preserved. The candidate uses open destinations, the standard
99.9% valid-ballot rate, default half-plus-one majority and zero annual
turnout change. Therefore absolute valid votes, majority, allocations or
future projections may differ and are shown in the preview; an original
party-mode zero-validity result can acquire an allocation after normalization.

Effective legacy block prohibitions are expanded to party pairs after their
compatible overrides, while direct prohibitions and both directions of party
refusal are retained. Conversion refuses invalid inputs, zero group-mode valid
votes, an unrepresentable exact vote matrix, schema precision or pair limits,
and invalid candidates with an explicit reason; it never rounds or drops a
restriction to succeed.

Confirmation atomically installs the validated candidate and retains an
independent, downloadable copy of the validated original for the current
visit. It does not replace the separately saved baseline or alter the user's
original file. Replacing the scenario later clears the conversion snapshot.

## 6. Deterministic Calculation Contract

### 6.1 Ballots And Denominators

Percentages are fractions internally. In group-input scenarios, for electorate
group `g`:

| Quantity | Definition |
| --- | --- |
| `population[g]` | `populationTotal × populationShare[g]` |
| `cast[g]` | `population[g] × turnout[g] × participationFactor[g]` |
| `valid[g]` | `cast[g] × validBallotRate[g]` |
| `votes[p]` | sum over `g` of `valid[g] × voteWeights[g,p]` |
| `allValidVotes` | sum over `p` of `votes[p]` |
| `voteShare[p]` | `votes[p] / allValidVotes` |

In a party-input scenario, baseline `cast = populationTotal × overallTurnout`,
`valid = cast × validBallotRate` and `votes[p] = valid × voteShare[p]`.
Party shares are exact fractions of all valid votes, including votes below the
threshold; known or unknown composition does not change baseline votes or
seats. Overall turnout and a common valid-ballot rate are scenario inputs.
Zero cast or zero validity gives no valid-vote allocation, not invented seats.

Defaults: `populationTotal = 1000000`, `participationFactor = 1`, turnout
100%, and valid-ballot rate 99.9% (`STANDARD_VALID_BALLOT_RATE`, `'0.999'`, in
`src/engine/edit.ts`) for new groups, every preset and the questionnaire build.
Fractional votes are allowed in educational mode; do not
round votes before allocation. The population total changes scale, not shares.
`populationTotal` is everyone with the right to vote, voters and non-voters
alike; the editor labels it «Избиратели с правом голоса» and the results
«Имеют право голоса» (en "Eligible voters").
As built in M2-31: an (i) hint beside each of those labels says so in the
program («Все, у кого есть право голоса: и те, кто придёт голосовать, и те,
кто не придёт. Сколько из них проголосует, задаёт явка групп.»), and one
beside a group's «Доля населения, %» says the share is of everyone with the
right to vote, including those who will not vote.

As built in M2-28: `isStandardValidity(value)` parses the decimal string and
compares it with 999/1000 exactly (`'0.9990'` counts; unreadable text, a
number or a missing value does not). A uniform rate multiplies every party's
votes by the same exact factor, so vote shares, qualification, quotas and seats
are unchanged; only the vote counts shown drop by 0.1%. While every group is at
the standard rate, the editor rules and the line under the results summary say
that 0.1% of ballots are assumed invalid for every group and party; with any
other rate the line is not shown.

`participationFactor` is an explicit analytical availability multiplier, not a
statement about legal voting rights. Normally change turnout to model
abstention. If an availability counterfactual is enabled, display it separately
from turnout and never describe the result as endorsement of exclusion.

Calculate overall turnout against the full scenario electorate; show
unavailable, abstaining, invalid, valid and below-threshold vote totals
separately. Preserve the original population denominator when availability
changes.

Per group, `available = population × participationFactor`; `unavailable`,
`abstaining = available − cast` and `invalid = cast − valid` are differences, so
each group's population splits exactly into unavailable + abstaining + invalid +
valid. Overall turnout is total `cast` over the sum of group populations.
`allValidVotes` is the sum of party votes; it equals total valid ballots when
vote weights sum exactly to one and differs only within the input tolerance
(Section 11), which is never normalized away. With no valid votes, vote shares
are undefined rather than zero.

### 6.2 Electoral Threshold

- Default threshold: 0%, for the simplified educational preset.
- A party qualifies if it has positive votes and its pre-threshold valid-vote
  share is greater than or equal to the threshold.
- Test the threshold per party, never on a block total, unless a separately
  specified joint electoral-list model is introduced later.
- Below-threshold valid votes remain in `allValidVotes` but not in
  `qualifyingVotes`.
- Seat-allocation shares are computed only over qualifying votes.
- Distinguish zero turnout, a disabled participation factor and failure to cross
  the threshold: similar seat outcomes do not mean identical events.
- If no valid votes exist or no party qualifies, report no allocation. Do not
  divide by zero, fabricate seats or label the case a coalition deadlock.
- Each party has exactly one status: `qualified`, `below-threshold` (positive
  votes, share under the threshold) or `no-votes` (zero votes, at any
  threshold). The no-allocation reason is `no-valid-votes` or
  `no-party-qualifies`.

### 6.3 Integer Seats

Hamilton / largest remainder is the required educational method:

1. `quota[p] = seatCount × votes[p] / qualifyingVotes`
2. `seats[p] = floor(quota[p])`
3. `remaining = seatCount − Σ seats[p]`
4. Give one extra seat to each of the first `remaining` qualifying parties,
   ranked by descending fractional remainder.
5. Resolve exact ties by persisted party `tieBreakOrder` (lower first), then by
   party ID compared by UTF-16 code unit (so `P10` precedes `P2` and `B`
   precedes `a`). Array order and locale never decide a seat.

Every valid allocation sums exactly to `seatCount`. Show exact quotas separately
from integer seats. Never round each party's quota independently. Allocate seats
to parties first and aggregate to blocks afterwards. Zero-vote parties never
receive remainder seats. The result carries a `cutoffTie` indicator: true when
the last party to receive a remainder seat and the first party denied one have
exactly equal remainders, so the tie rule decided a seat. Block aggregation
lists blocks in scenario order and appends one unassigned entry
(`blockId: null`) after them only when some party has no block. When no
allocation is possible (Section 6.2), every party receives zero seats, quotas
are absent and the reason is carried through.

As built in M2-28: Hamilton is the only method and is not shown as a setting;
the results summary has no method row (the calculation table that explains the
seats stays). The majority is `majorityRequired`, more than half of the seats;
the editor shows a fixed line saying so for standard scenarios. The `override`
mode stays effective for imported files and is disclosed when in use; its
setting remains hidden, and an explicitly confirmed conversion normalizes it.

Default `seatCount = 120`; default majority is `floor(seatCount / 2) + 1`, i.e.
61. An advanced explicit majority override is allowed and must be visibly
identified. This is not a certified Israeli election calculator.
Country-specific divisor rules, surplus-vote agreements, joint lists and legal
tie rules need their own validated adapter. Setting the threshold to 3.25% does
not implement Israeli electoral law.

### 6.4 Exact Arithmetic

All engine values are exact rationals: a `BigInt` numerator and denominator,
normalized by GCD, with a positive denominator.

- Exact engine inputs are plain base-10 decimal strings: an optional leading
  `-`, ASCII digits, and an optional `.` followed by at least one digit. No
  leading `+`, exponent, whitespace or grouping separators; at most 18
  fractional digits and 128 characters in total. A JavaScript number is not
  accepted for an exact value, because parsing it may already have lost the
  user's decimal token. Field-specific ranges belong to schema validation
  (Section 11). Strings convert to rationals exactly, without passing through
  binary floating point.
- Mathematical floor rounds toward negative infinity.
- Threshold comparisons, quota floors, remainder ordering and tie detection are
  exact rational comparisons. No epsilon participates in any of them.
- Floating point is used only to format values for display and charts, after
  every decision has been made.
- The sum-to-one input tolerance (Section 11) applies only to validating user
  totals, never to qualification or seat ties.
- The module is small, pure and project-owned; it is tested against
  independently computed fixtures, including remainder ties and threshold
  equality.

This replaces the earlier "decimal library" option: rationals make the
determinism guarantee exact and add no dependency.

## 7. Coalition Engine

- Configure a symmetric party-pair compatibility matrix and a per-party
  `canJoinGovernment` flag. No incompatibility is inferred from labels.
- A legacy block-level rule may expand to member pairs. Preserve its existing
  party overrides and show the effective party rules without a block editor.
- A feasible coalition contains only government-eligible parties, has no
  forbidden pair and reaches the configured majority. Party seats are
  indivisible in version 1.
- List minimal winning coalitions, selected larger coalitions and incompatible
  combinations on request. Do not imply the largest party automatically governs.
- Minimal winning: removing any member makes the coalition lose its majority.
- For every result show members, seats, majority margin and opposition seats.
- Majority margin is `coalitionSeats − majorityRequired`: a 66-seat coalition
  has margin 5; it can lose five seats and still reach 61, but not six.
- Report whether the configured government model has a feasible majority.
  Describe deadlock only relative to the configured rules.
- A balancing party may appear in alternatives with both rival blocks; detect
  this instead of naming a unique winner. An optional pivotal-party view must
  define its metric.
- Version 1 excludes minority governments, external confidence support,
  abstention rules, defections and office bargaining.
- Prune incompatible branches and branches that cannot reach the majority. Above
  20 government-eligible parties, require selected partners or constrained
  search, or return a bounded result explicitly marked incomplete. A truncated
  search cannot prove deadlock or support a claim about all pivotal parties.
  Run long searches in a cancellable Web Worker.
- As built in M2-06: the seats result is computed synchronously in the UI; the
  coalition search runs in an inline worker bundled into the single file, after
  a short debounce. A new edit cancels the running search by terminating the
  worker. The search reports the visited node count at a fixed interval, shown
  as progress. Where no worker can be created, the search runs on the main
  thread with a visible note. The conversion preview is the exception: its
  independent candidate search reports an unavailable worker rather than
  falling back to the main thread.
- As built in M2-16: the coalition view offers two closed disclosures after the
  minimal winning list. "Larger coalitions" extends each listed minimal winning
  coalition by one more seated, government-eligible party compatible with all
  its members (deduplicated; seats descending, then persisted party order); it
  is marked possibly incomplete when the minimal list was truncated or capped.
  "Majorities blocked by the rules" lists every seat-minimal majority of seated
  parties that contains a party unable to join a government or a forbidden
  pair, with those reasons per row; its search has its own budget of 250,000
  visited nodes and is marked incomplete when the budget runs out. Both lists
  hand the page at most 200 rows with their full count, like the minimal list.
- As built in M2-17: a closed "Pivotal parties" disclosure after the balancing
  parties states its metric: for each seated, government-eligible party, the
  number of permitted minimal winning coalitions that include it. Every member
  of a minimal winning coalition is pivotal in it (the counting form of the
  Holler public good index). The worker counts over the full list, not the 200
  listed rows; rows are ordered by count descending, then persisted party
  order. "Needed by every coalition" is yes only when the search was complete
  and the party is in every coalition found; no when a found coalition leaves
  it out or the complete search found none; unknown when the search was
  incomplete and the party is in every coalition found. After an incomplete
  search counts are shown as "at least n". The balancing-party heading now
  states the engine definition, a party that can govern with either side of a
  forbidden pair, instead of claiming that every winning coalition needs it.
- As built in M2-33: besides the symmetric pairs, the scenario records
  directed party refusals, each naming the party that refuses and the party it
  refuses. A pair is forbidden when either side refuses the other, exactly as
  an incompatible pair, so the coalitions found are the same; but every
  forbidden pair the engine reports also says who refused (`refusedBy`: none,
  one or both parties, in persisted party order). The coalition view's
  forbidden list, the reasons of blocked majorities, the chosen-coalition
  evaluation and the editor's effective rules show "отказ: <party>" (or both
  parties) in place of the source label. An override never lifts a refusal.

Engine rules fixed in M1-07:

- Required majority is the override in override mode, otherwise
  `floor(seatCount / 2) + 1`.
- Effective forbidden pairs are the explicit party pairs plus the refused pairs
  in either direction (since M2-33) plus every member pair of an incompatible
  block pair, minus compatible party overrides (which only lift block
  defaults). A pair forbidden by a party rule (explicit or refusal) and a block
  rule is reported once, as a party rule. Pairs are listed in persisted party
  order.
- Government-eligible parties have `canJoinGovernment = true` and at least one
  seat. The 20-party limit counts only these.
- Minimal winning coalitions list members in persisted party order and are
  ordered by seats descending, then by search order (largest eligible parties
  first; equal seats by persisted party order).
- Status is `feasible` when any permitted majority was found, `deadlock` only
  when the search was complete and found none, `unknown` when a truncated search
  found none, and `no-allocation` when Section 6.2 allocates no seats.
- Search is bounded by a node budget (default 1,000,000 visited nodes). An
  exhausted budget or more than 20 eligible parties marks the result incomplete.
- A balancing party belongs to two found minimal winning coalitions whose union
  contains a forbidden pair, so it can govern with either side of that pair.
- A user-chosen coalition can be evaluated on request: seats, margin,
  opposition, whether it reaches the majority, members that cannot govern,
  forbidden pairs inside it, feasibility and minimality.

## 8. Required Example Presets And Corrections

Use neutral editable names by default. The supplied discussion is represented as
an explicitly labeled example; its demographic label is not needed by the model.
One dedicated cohort and one party per block for the initial fixtures.

| ID / name | Electorate share | Baseline turnout | Baseline destination |
| --- | --- | --- | --- |
| B1 / Block 1 | 38% | 100% | Party 1 |
| B2 / Block 2 | 42% | 100% | Party 2 |
| B3 / Group 3 | 15% | 100% | Party 3 |
| B4 / Block 4 | 5% | 100% | Party 4 |

Every group's valid-ballot rate is 99.9% (M2-28), so the baseline has 999 000
valid votes of a million (379 620 / 419 580 / 149 850 / 49 950); the uniform
rate changes no share or seat below. Threshold is 0%; Hamilton allocates 120 seats. Parties 1
and 2 cannot govern together. Party 3 has `canJoinGovernment = false` in these
example presets only. Party 4 is compatible with both 1 and 2. Without the
Party 3 assumption, the baseline deadlock conclusion does not follow from the
percentages alone.

| Preset | Final vote shares B1 / B2 / B3 / B4 | Seats B1 / B2 / B3 / B4 | Permitted majority pairs |
| --- | --- | --- | --- |
| Baseline | 38 / 42 / 15 / 5% | 46 / 50 / 18 / 6 | None |
| Group 3 turnout zero | 44.705882 / 49.411765 / 0 / 5.882353% | 54 / 59 / 0 / 7 | B1+B4 = 61; B2+B4 = 66 |
| Group 3 final vote share 7% | 41.576471 / 45.952941 / 7 / 5.470588% | 50 / 55 / 8 / 7 | B2+B4 = 62 |
| Group 3 final vote share 8% | 41.129412 / 45.458824 / 8 / 5.411765% | 49 / 55 / 10 / 6 | B2+B4 = 61 |

Displayed percentages are rounded; compute from exact inputs, not table text.

As built in M2-11: all four rows are loadable from the example menu, in table order, followed by the open-split and multi-block examples. The 7% and 8% rows set Group 3 turnout to 119/279 and 34/69 truncated to 18 decimals; nothing else differs from the baseline.

### 8.1 Turnout Is Not Final Vote Share

With all other cohorts voting fully, let Group 3 turnout be `t` and desired
final vote share be `s`. For its population share of 0.15:

- `s = (0.15 × t) / (0.85 + 0.15 × t)`
- `t = (0.85 × s) / (0.15 × (1 − s))`

A final share of 7% requires turnout ≈ 42.652330%, not 7% and not 50%. Turnout
of 50% gives ≈ 8.108108% of valid votes. A final-share target control is an
advanced inverse solver, available only when the affected cohort and fixed
remainder make the inverse unambiguous. Reject unreachable targets. Because the
inverse is a rational function, the solver returns an exact rational turnout.

### 8.2 Claims Not To Copy From The Discussion

- At zero Group 3 participation, both rival blocks can reach a majority with
  Block 4. The result is not a unique Block 2 victory.
- Several rows in the source sweep use inconsistent independent seat rounding.
  The 8% row gives Group 3 ten seats under Hamilton. Every sweep row uses the
  same allocation engine.
- Do not hardcode 8% as an exact critical boundary. The first majority depends
  on allocation, tie rules, threshold, party splitting and the swept parameter.
- Reduced turnout is not the only route to a majority: preferences, coalition
  permissions and other turnout rates can change.
- Below-threshold votes are not transferred to other voters or parties; they are
  excluded from the seat-allocation denominator under this simplified rule.
- Claims that a group is mathematically excluded from power apply only to the
  specified coalition restrictions.

## 9. Sensitivity And Scenario Comparison

- One-dimensional sweep over group turnout, one destination share, or the
  threshold. A synthetic final-share sweep is allowed only with an explicitly
  defined inverse transformation such as Section 8.1.
- Users choose range and step. When varying one destination share, require an
  explicit choice of which unlocked destinations rebalance proportionally;
  reject impossible rows rather than changing the scenario silently.
- Show parameter value, final vote shares, integer seats, selected coalition
  totals and majority status. Distinguish a sampled transition interval from an
  exact analytical boundary. Show seat jumps and ties; do not imply continuous
  seat counts or monotonic party seat changes.
- Compare at least three saved scenarios with the baseline: changes in votes,
  turnout, seats and coalition feasibility. Store complete independent snapshots
  so editing one cannot mutate others. Reset restores the selected baseline.
- As built in M2-07: one baseline in memory (not persisted or exported), saved
  only from a valid input, compared with the current scenario in
  `src/engine/compare.ts`. Changes are rounded from the exact difference; rows
  match by ID; coalition outcomes come from a second worker runner and are
  marked inconclusive when either search is truncated. Several saved scenarios
  remain M3 work.
- As built in M7-06: the comparison holds an immutable, separately
  labelled 2022 reference that does not require or replace the saved baseline.
  An unchanged known 2022 list ID is matched automatically; renamed or split
  lists require an explicit one-to-one choice. Unmatched and unavailable
  values are not represented as zero. Match choices are temporary, clear on
  scenario replacement and are pruned on party deletion; the historical facts
  remain visible even while the current draft is invalid.
- As built in M7-03: comparison and the historical reference are separate
  disclosures in the coalition workspace. The saved baseline, its full tables
  and save, reset and clear operations remain independent of the historical
  reference; reset and clear remain available with an invalid current draft.

## 10. Interface And Accessibility

- The questionnaire is the first screen (Section 14.5); the editor has a
  compact scenario toolbar and immediate results, with no promotional hero.
- As integrated in M7-12, the views are Coalitions, Demographic Future and
  Data, in that order. Composition remains a contextual report in Coalitions,
  not a navigation tab. Completing or skipping the questionnaire
  opens Coalitions. Data retains the full seat report alongside the editor;
  comparison and the 2022 reference are disclosures in Coalitions.
- M7-13 makes Questionnaire the prominent toolbar action and hides both the
  preset selector and Load example. The underlying preset APIs remain.
  Validated scenario-file transfer is labelled Export Set Up / Import Set Up
  (localized consistently in Russian and Hebrew). All three tabs operate on
  the same authoritative scenario; switching tabs never synchronizes copies.
- The coalition workspace places party names, colours, exact inputs, sliders,
  transient locks, vote-share bars and seats beside the chosen and available
  coalitions. It labels changes from the user's saved baseline and from the
  2022 reference separately; unavailable values are not zero. Overall and group
  turnout remain in an advanced disclosure; baseline group turnout is corrected
  in an explained, previewed and explicitly confirmed dialog (Section 14.3.1).
  Group-mode
  scenarios retain their original semantics and expose their existing group
  turnout while national shares and overall turnout remain read-only.
  A majority of seats does not guarantee political cooperation. Controls are
  physically left of the population results within the integrated deck on
  desktop, including RTL, and precede them on phones. The old coalition analysis
  remains below the deck, and the full Data results remain accessible there.
- Tables for exact values, stacked vote/seat bars and a seat diagram. Render
  calculated data, not decorative imagery. A flow diagram is optional.
- As reviewed in M7-08, the ru/en/he workspace notice explicitly identifies
  educational Hamilton rather than Israeli Bader–Ofer and distinguishes seat
  majority from political cooperation. Linked redistribution requires an active
  linked basis. Future notices distinguish fixed new-model turnout from saved
  legacy changes and describe projections as assumptions, not forecasts.
  Clearing saved data accurately announces the Hebrew fallback on next opening.
  Full human English/Hebrew publication review remains M3-05. The user
  explicitly deferred it until after the first non-commercial release; this
  exception does not imply that the translations have been fully reviewed.
- Displayed values are rounded exactly from the rational results, half away
  from zero: whole people and votes, two places for percentages, four for quota
  and remainder. A rounded share that appears to meet the threshold never
  changes the engine's qualification status. The first-release seat diagram is
  a wrapping grid in block-then-party order with the majority seat marked; a
  hemicycle layout is deferred.
- Clearly distinguish population share, turnout, final vote share and seat share
  in labels and exports. Show coalition assumptions; the allocation method is
  fixed and not shown as a setting (M2-28).
- Distinct editable party colors, always paired with text labels and values. No
  automatic association of a color with a real political identity.
- Toggles for eligibility, sliders with numeric inputs, color swatches and
  labeled or tooltip-equipped icon actions; legacy mode selectors are hidden.
- Population share, turnout, each editable vote weight and the threshold have a
  0–100% slider beside the exact number input. Participation, validity, voting
  mode and majority-mode controls are hidden for legacy inputs; their original
  values remain effective and are disclosed. The results summary marks an
  overridden majority "(set manually)", as the coalition view does.
- Stable control and chart regions while names or values change. Long names wrap
  without overlapping charts or pushing actions off-screen.
- Keyboard operation, visible focus, accessible table alternatives, touch
  targets of at least 44×44 CSS px, chart details dismissible by Escape or
  outside click.
- As built in M2-14: a click or tap on a vote-bar segment, seat-bar segment or
  seat selects that party; each legend entry is a toggle button for the same
  selection, which is the keyboard and screen-reader path (segments and seats
  are not focusable). A details panel under the seat diagram shows the party's
  votes, vote share, status, seats, seat share and quota exactly as the
  tables print them. Escape, the Close button or a click outside the panel and
  the selectable chart parts closes it; focus inside the panel returns to the
  legend button. Selection is view state: not exported, saved or persisted.
- As built in M2-31: an explanation hint is an (i) button (`src/ui/Hint.tsx`)
  beside its label, never inside a `label` element, named «Пояснение: label».
  Its `title` shows the text on hover; a click, tap, Enter or Space opens the
  same text under the label and a second one closes it; Escape closes it with
  focus kept on the button. The text stays in the page, hidden while closed,
  so `aria-controls` always resolves. Hints sit on the eligible-voter total
  (editor rule, results summary, comparison and demographic-future totals)
  and on a group's population share; the editor field that holds one is a
  `div`, its input named by its own label. The button is 24 px on a desktop
  and 44 px on a phone; its open state is not stored.
- Desktop: aligned editor/result layout. Phone: stacked sections with a bottom
  view switcher reachable by thumb. Dense matrices scroll within a labeled
  region, never the whole page.
- As built in M2-29: the input editor turns pages. In order: "Scenario and
  rules", one page per voter group in stored order ("Voter group: name"; a
  single "Voter groups" page when there are none), "Parties", "Coalition rules".
  A pager above the sections reads "Page n of N · title",
  with Back and Next side by side (disabled at the ends) and a select of every
  page by number and title. The issue list and the automatically filled list
  stay above the pager. A page turn moves focus to the pager title and scrolls
  the column to its top. Other pages and other groups' rows stay rendered but
  hidden. Adding or duplicating a group opens its page; deleting one opens the
  group now at its position, else the last group, else the empty groups page;
  a moved group keeps its page. The page is view state: not saved or exported,
  and set back to page 1 by a preset, an import or the questionnaire build. On
  a desktop (768 px and wider) the input column is at most one viewport high,
  sticks while the window scrolls and scrolls on its own with the pager pinned
  to its top. On a phone the pager scrolls with the page. Each group page
  explains, above the vote split, that the split is the user's picture of the
  world and the simulator knows nothing about real voters.
- Russian, English and Hebrew are first-release languages, switchable without
  resetting the scenario or questionnaire. A valid saved or explicit language
  takes precedence; otherwise the initial language is Hebrew. Persist an
  explicit choice and offer the selector from the opening questionnaire page,
  including inside its confirmation dialogs.
  All UI strings, validation messages, chart labels,
  tooltips and export labels are centralized; no partial translations. A test
  fails the build when any key is missing in any locale.
- Hebrew uses RTL layout; Russian and English use LTR. Use CSS logical
  properties throughout. Isolate mixed-direction names and numbers with
  bidirectional isolation. Numeric inputs, percentages and expressions stay
  readable in every locale.
- Custom names and notes accept Unicode and are not translated. Displayed
  numbers are localized; exported JSON is locale-independent; CSV is UTF-8 with
  BOM and stable column meanings. HTML snapshots preserve the selected language.
  All translations are bundled.
- As built in M2-19: the app never writes interface-language text into a
  scenario. The examples, the startup scenario and added groups and parties
  store an empty name; legacy blocks may also retain an empty name. Wherever a
  name is shown, an empty or
  whitespace-only name appears as the localized kind label with the digits of
  its ID ("Party 3" for `P3`; the whole ID when it is not prefix plus digits),
  so it follows a language switch and never renumbers on reorder. An empty
  scenario name appears as the example title when the scenario ID is an example
  ID, otherwise as "Untitled scenario". Name fields keep the stored value and
  show the default as a placeholder. Results, coalitions and comparison receive
  a display copy with names resolved; the coalition search and exports use the
  stored scenario. A duplicate of a custom name gets the language-neutral
  suffix " (n)" with the smallest free n from 2; a duplicate of an empty name
  stays empty. Files exported before M2-19 keep their stored names as custom
  names. Only the language buttons show other scripts, as endonyms.
- Errors identify the invalid field and preserve edits. Stale results are never
  presented as current while the scenario is invalid.

## 11. Data And Architecture Contract

One versioned scenario object, with group-input and party-input variants:

| Entity | Required content |
| --- | --- |
| Scenario | `schemaVersion`, `inputMode` (`groups` or `parties`), `id`, `name`, `notes`, `rules`, `groups`, `parties`, `blocks`, `coalitionRules` |
| Application settings | `uiLanguage` (`ru`, `en`, `he`); included in HTML snapshots, separate from electoral rules |
| Rules | `populationTotal`, `seatCount`, `majorityMode`, `majorityOverride`, `threshold`, `allocationMethod`; party mode also has exact `overallTurnout` and one `validBallotRate` |
| Group | Identity and `turnout`, with `notes`, `growthRate` and `turnoutChange` optional on import; group mode additionally has `populationShare`, `validBallotRate`, `participationFactor`, `votingMode`, `allowedPartyIds` and `voteWeights` |
| Linked party basis | Optional `current` or `suspended` model with exact group population shares, party preferences, allowed destinations and a last nonzero turnout profile |
| Party | `id`, `name`, `notes` (optional), `color`, `blockId`, `tieBreakOrder`, `canJoinGovernment`; party mode adds exact `voteShare` and `composition` |
| Block | `id`, `name`, `notes` (optional), `color` |
| Coalition rules | `incompatiblePartyPairs`, `incompatibleBlockPairs` (block defaults), `compatiblePartyOverrides` (party overrides of a block default) and `partyRefusals` (directed: the party that refuses, then the party it refuses; since M2-33) |
| Saved comparison | Complete baseline and scenario snapshots, not shared references |
| Sweep request | Parameter path, range, step, rebalance policy, selected coalition IDs |

Percentages are fractions in the data contract; the UI presents percentages.
Ordinary fractions are serialized as decimal strings. Party-mode turnout,
party shares and known composition shares use exact numerator / denominator
digit-string objects so non-terminating ratios survive import and export.
Sparse group-mode preference maps use party IDs as keys, not labels. User
inputs and method identifiers are authoritative; derived results may be
exported for inspection but are recomputed after import. A snapshot includes
all rules and tie ordering.

Schema version 5 field rules (enforced by the `schema` module):

- Group-mode fractions (`populationShare`, `turnout`, `validBallotRate`,
  `participationFactor`, `threshold`, vote weights) are decimal strings in
  [0, 1]; `populationTotal` is a positive decimal string.
- `growthRate` and `turnoutChange` (Section 14.2) are decimal strings in
  [−1, 1], optional on import and read as `0` when absent. The validated group
  carries both; in group mode `growthRate` follows `populationShare`, and in
  both modes `turnoutChange` follows `turnout`.
- `schemaVersion` 1–3 are accepted and migrated to group mode. Version 1
  defaults the two later group fields to `0`; older files without directed
  refusals receive an empty list. Version 4 preserves its input mode, and its
  party-group decimal turnouts migrate exactly. The validator and exports use
  version 5; later versions are refused as unsupported.
- In party mode, `overallTurnout`, group turnout and each party's `voteShare`
  are exact numerator / positive-denominator objects. `composition` is either `null`
  (unknown) or a complete group-ID map of exact shares. Party shares and
  every known composition sum to one exactly. Fraction components are at
  most 256 digits, with at most 2,048 digits across distinct denominators.
  The raw bound is checked before exact conversion, and the same bound is
  checked again after fractions are reduced; exceeding it gives a path-specific
  issue and an import leaves the existing scenario unchanged. No new bound is
  applied to migrated group-mode decimal inputs.
- A current `linkedModel` contains every group and each party preference;
  modeled population shares sum exactly to one and populated preference rows
  sum exactly to one. Allowed destinations are unique existing party IDs.
  Current group turnout, overall turnout, party shares and known positive-vote
  compositions must agree exactly with the model. At zero overall turnout the
  stored nonzero profile must agree with the retained party shares and
  compositions. A suspended basis preserves its previous assumptions but is
  never used by projection. Group turnout, model fractions and saved profiles
  participate in both exact-component and aggregate-denominator limits.
- `seatCount` is an integer 1–10000. `majorityMode` is `default` (with
  `majorityOverride: null`) or `override` (with an integer 1–`seatCount`).
  `allocationMethod` is `hamilton`. `tieBreakOrder` is a safe integer;
  duplicates are allowed and resolved by party ID.
- IDs are 1–64 ASCII letters, digits, `_` or `-`, unique within their kind.
  Colors are `#RRGGBB`. Names are at most 200 characters, notes 10000.
- Group, party and block `notes` are optional on import: an absent field is
  read as an empty string, so files written before M2-13 import unchanged.
  The validated scenario always carries the field, right after `name`.
- In group mode, `votingMode` is `restricted` or `open`. `allowedPartyIds` is
  non-empty and duplicate-free; `voteWeights` keys must be allowed parties. A
  restricted group's allowed parties all belong to one block (or are all
  unassigned).
- Coalition pairs name two different existing IDs, appear once per list
  (unordered), and an override may not repeat an explicitly incompatible pair.
- `partyRefusals` entries are ordered, [refusing party, refused party], and
  appear once per direction: A refusing B and B refusing A are two entries and
  may both be present. The list is optional on import and read as empty when
  absent; the validated scenario always carries it, after
  `compatiblePartyOverrides`. An override may not repeat a refused pair in
  either direction.
- Limits: 100 groups, 100 parties, 50 blocks, 5000 pairs per list.
- Unknown fields are dropped; the validated scenario is rebuilt from known
  fields only. Errors carry a path, a code and a message.

Module boundaries — each pure and independently testable, with no DOM access:

| Module | Responsibility |
| --- | --- |
| `rational` | Exact arithmetic (Section 6.4) |
| `schema` | Types, versioning, import validation |
| `votes` | Ballots and denominators (6.1); votes for a year (14.2) |
| `composition` | Electorate composition of a party or legacy block (14.2); the UI offers party targets |
| `legacyConversion` | Pure exact legacy analysis, candidate conversion and typed refusals (5.1) |
| `linkedTurnout`, `linkedFlow` | Exact linked group and party edits, saved-basis lifecycle and bounded constrained transfers (5) |
| `threshold` | Qualification (6.2) |
| `allocate` | Hamilton seats and ties (6.3) |
| `coalitions` | Search, minimal winning, margins (7) |
| `inverse` | Final-share inverse solver (8.1) |
| `sweep` | Parameter sweeps (9) |
| `i18n` | String tables and number formatting |

Rendering never contains a second implementation of electoral arithmetic.

Imports reject unsupported future schema versions, duplicate IDs, dangling
references, invalid colors, nonfinite or out-of-range values and invalid totals.
The documented sum tolerance is at most 1e-9 in fractional units and applies to
group-mode user totals only; party-mode share totals are exact. JSON import is
limited to 2 MiB; entity counts are validated before calculating.

- As built in M2-08: the toolbar exports the current valid scenario as
  `<scenario id>.json` and imports one JSON file. The file is the validated
  scenario only (no baseline, no language, no results), printed by
  `serializeScenario` in the validator's field order with two-space
  indentation and a trailing newline; export → import → export is byte-stable.
  A file over 2 MiB is refused before it is read. A rejected import keeps the
  current input and lists up to 20 issues plus a count of the rest; a valid
  import replaces the input like a preset load and keeps the saved baseline.

Render user names and notes as text, never executable HTML. Exported snapshots
escape embedded data safely, including closing script tags. Never execute
imported code, fetch URLs from imports or record personal voting data. Local
storage is an opt-in convenience, never the only persistence mechanism; provide
a clear-data action.

As built in M2-15: the app keeps one thing in local storage, the language the
user clicked, under `elections-simulator.language`. Every app key starts with
`elections-simulator.`, and only `src/ui/storage.ts` touches storage. The
toolbar action "Clear saved data" removes every key with that prefix and no
other key, because other sites can share the origin (`file://` pages, project
sites under one `<user>.github.io`). The current visit keeps its language,
scenario and baseline; the next visit opens in the default language. A status
line reports "cleared" or "could not be cleared" and disappears on the next
change. Choosing a language afterwards stores it again.

## 12. Acceptance And Verification

The implementation is complete only when these checks pass. The milestone that
owns each check is in brackets.

- [M1] All four Section 8 fixtures reproduce the specified integer seats and
  coalition pairs.
- [M1] **Determinism:** each fixture yields byte-identical result JSON across
  repeated runs, after a JSON round trip, and under every UI locale.
- [M1] A 50% Group 3 turnout gives ≈ 8.108108% final share.
- [M1] A manual 60% / 30% / 10% split sends exactly those fractions of a
  cohort's valid votes to the selected parties. Editing preferences does not
  change turnout or total valid votes; no inertia control exists.
- [M1] Restricted-choice groups cannot send votes to forbidden destinations; an
  open group can split between opposing blocks without changing coalition
  constraints.
- [M1] Every valid allocation has exactly `seatCount` nonnegative integer seats,
  including ties and odd parliament sizes. A property test over randomized
  scenarios asserts the sum.
- [M1] Below, exactly at and above threshold are tested; a joint block total
  cannot rescue individually nonqualifying parties. Zero-vote parties never
  receive remainder seats.
- [M1] All-zero turnout and all-parties-below-threshold produce an explicit
  no-allocation state. Invalid totals, NaN and missing destinations produce
  actionable errors.
- [M1] On small fixtures, coalition search matches exhaustive enumeration and
  distinguishes minimal winning, forbidden and incomplete-search results.
- [M2] Adding, renaming and deleting parties/groups preserves IDs and references
  or blocks the action with an explicit repair path. At least one open/split
  group preset and one multi-party block preset are included.
- [M2] Tie resolution and all inputs survive JSON export/import and reproduce
  results in a second browser session. Malicious labels and notes, including
  script-tag strings, remain inert text.
- [M2] The distributed HTML works with the network disabled and no external
  fonts, libraries or data. Its working local file link is delivered.
- [M2] Russian, English and Hebrew have complete translations and work offline.
  Switching languages preserves inputs and results. Hebrew RTL, mixed-script
  names, numeric entry and desktop/phone layout are tested in all three
  languages.
- [M2] Browser automation checks desktop and narrow phone widths, long Unicode
  names, all views, keyboard actions, chart details and intentional matrix
  scrolling; screenshots and geometry checks show no overlap or page overflow.
- [M2] On a documented reference machine, ordinary edits at 20 groups / 30
  parties update votes and seats within 200 ms. Coalition search does not block
  input; it shows progress, cancellation and incomplete status.
- [M7-06] The historical preset retains 40 separate exact vote shares and
  unknown compositions. Official historical seats are distinguished from the
  Hamilton result; reference identity matching, baseline independence, invalid
  drafts, keyboard and phone layout, RTL and offline behavior are tested.
- [M7-09] Legacy imports retain their results and restrictions until a
  separately confirmed, exactly representable conversion. Preview, cancellation,
  stale-input protection, explicit refusals, original export and unchanged
  baseline are tested in the engine, UI and offline browser suites.
- As built in M2-10: `npm run test:e2e` builds `dist/elections.html` and runs
  Playwright against it from `file://` with the network off, in the installed
  Edge (`msedge` channel), at 1280 x 800 and at 360 x 740 with touch. axe-core
  fails the run on serious or critical findings. Reference machine: Intel
  i9-13900HX, 32 GB, Windows 11 Pro, Edge 155.0.4283.45. At 20 groups / 30
  parties / 10 blocks the median edit-to-seats time was 15–17 ms; a search
  over 30 eligible parties stops at the node budget in about 0.9 s with no
  main-thread stall over 200 ms. A finished search hands at most 200 minimal
  winning coalitions to the page with the total found; the tables say "first
  200 of N" and a comparison with a cut list is reported as inconclusive. Chart
  detail popovers were not built in M2-05, so that check does not apply.
  Firefox and Safari are checked with the hosted link in M3.
- [M3] With approval, the public preview URL is verified over HTTPS on desktop
  and phone browsers in all three languages, including assets under its path,
  the not-a-forecast notice, the link preview metadata and scenario results
  identical to the local build.
- [M4] The 7% inverse solver returns ≈ 42.652330% turnout and round-trips
  exactly.
- [M4] Sweeps reproduce single-scenario calculations at every sampled point. A
  reported boundary states whether it is exact or bracketed by the step.
- [M4] HTML snapshots preserve inputs, baseline and language and reproduce
  results when reopened.
- [M5] If built, the PWA installs on Android Chrome and iOS Safari, opens
  offline after the first visit, and its service worker caches no scenario
  data.

## 13. Implementation Sequence And Deferred Decisions

Work proceeds through the backlog in [doc/backlog.md](../backlog.md), one item
at a time, starting with milestone M1.

### 13.1 Milestones

| Milestone | Contents | Exit |
| --- | --- | --- |
| M1 — Engine | `rational`, `schema`, `votes`, `threshold`, `allocate`, `coalitions`, `run`; Section 8 fixtures; no UI | All [M1] checks green in Vitest |
| M2 — First usable release | Preact editor and results, preferences and seats views, coalition view with worker, baseline compare, ru/en/he with RTL from the start, JSON import/export, single-file build; review fixes M2-11 … M2-18 added and closed 2026-10-29 (Section 8 presets, rate controls, entity notes, chart details, clear saved data, larger and blocked coalitions, pivotal parties, turnout shortcut); M2-19 language consistency; M2-20 … M2-24 added 2026-10-30 (Section 14: time model, composition and future views, Israeli example, questionnaire book, visual world and page fit) | Local HTML link delivered; all [M2] checks green |
| M3 — Public preview (resumed 2026-11-04) | Publication decisions, hosted build with link preview metadata and not-a-forecast notice, publication, screenshots and post text | Separate user approval; link shared; all [M3] checks green; feedback triaged into the backlog |
| M4 — Analysis (on hold since 2026-10-29) | Multi-scenario comparison, sweep, inverse solver, CSV, HTML snapshot export; contents revisited after M3 feedback | All [M4] checks green |
| M5 — Installable app and advanced hosting (optional) | PWA manifest and service worker, install checks, hosting upgrade; started only if feedback asks for it | Separate user approval; all [M5] checks green |

Implement the pure engine and fixtures before designing result graphics.

The engine has one entry point, `runScenario`, which runs votes, threshold,
allocation and coalition analysis for a validated scenario. `serializeResult`
turns the result into canonical JSON: key order is fixed by the engine and every
exact rational is printed as a fraction string (`228/5`), never as a decimal.
The Section 12 determinism checks compare these bytes. The 7% and 8% Section 8
fixtures use Group 3 turnouts 119/279 and 34/69 truncated to 18 decimal places;
their tests prove every remainder decision is far from the truncation error.

### 13.2 Kickoff Decisions Confirmed On 2026-10-28

| Question | Confirmed decision |
| --- | --- |
| Current output | Originally this specification only; superseded on 2026-10-28 when implementation started through the backlog loop (M1 engine complete) |
| Interface languages | Russian, English and Hebrew, including RTL for Hebrew |
| Preference behavior | Direct manual distributions; no behavioral inertia parameter |
| Electoral rules | Universal educational model, not an Israeli legal-rules adapter |
| Delivery | Offline HTML and a free GitHub Pages public preview planned at `https://seriycoder.github.io/Election-Public/`; a sanitized public MIT source snapshot and manual Actions release, upload and live verification pending |
| Project location | The `Election` workspace folder is the project root |
| Stack | TypeScript + Vite + Preact; Vitest; Playwright |
| Phone path | Hosted link in the phone browser; installable PWA optional after feedback (M5); no app store in version 1 |
| Delivery plan | Milestones M1–M5 (Section 13.1); public preview before analysis, revised 2026-10-28 |
| Domain risk | Correctness and determinism of the seat calculation |
| Initial UI language | Russian at kickoff; Hebrew fallback since M7-07, after any valid saved or explicit choice |
| Document language | English |

Publication decisions, revised in M3-02, are recorded in Section 2.4.
The two build targets are prepared locally; M3-03 handles gated source upload,
Pages configuration and live HTTPS verification before the link is shared.

Deferred options: jurisdiction-certified allocation, other allocation methods
(D'Hondt, Sainte-Laguë), surplus-vote agreements, within-party defections,
confidence-only support, probabilistic voting, time-series behavior, multi-user
editing, URL-fragment sharing, store-packaged phone app, additional export image
formats. None is implied by the first educational version.

## 14. Questionnaire, Time Model And Israeli Example (Added 2026-10-30)

On 2026-10-30 the user supplied four requirement texts in Russian and asked for
all of them before M3: (a) a refinement list (languages, political block
templates, a start questionnaire, distinct statuses, sound, block / group /
future screens, undo, time changes); (b) an electorate composition, turnout
and growth model; (c) a step wizard with an Israeli example; (d) an
illustrated questionnaire book. They are reconciled here. Backlog items
M2-20 … M2-24 implement them; the deferred parts have their own items.

### 14.1 Precedence And Decisions

| Topic | Decision |
| --- | --- |
| Results while answering | (d) is the latest text and wins over (c): no user votes, seats, coalitions, comparison or future charts appear before "Построить мою симуляцию". The wizard's live result panels are dropped |
| First screen | The questionnaire book opens at startup; completion or "Пропустить анкету" opens Coalitions; since M7-16 the opening page also opens either ready example (prefilled questionnaire or straight to Coalitions) |
| Language | The path is reviewed in Russian (CONTOUR-11), with strings in all three tables; the user deferred M3-05's full English and Hebrew review until after the first non-commercial release (2026-11-11). Do not claim that review is complete. Since M7-07, Hebrew is the fallback and language choices are available on the opening page; flag artwork remains M3-06 |
| Israeli example | (c)'s six groups, six lists and preference table form an educational preset, not a calibrated one; the year catalog of (d) supplies list names. Since M2-26 the group shares follow official 2022 statistics (Section 14.4); the preferences stay assumptions |
| Images | (d) asks for photographs or raster illustrations with verified rights. Rights cannot be verified in this offline build, so it uses original SVG drawings: stylized, not replicas of a banknote, coin die or the State emblem. Swapping in licensed images later is a content change |
| Historical facts | Only official facts of the Central Elections Committee, each with year and denominator (Section 14.4). The example group shares may follow official Central Bureau of Statistics figures, named with source and year (Section 14.4). The survey figures in (b) (IDI, Pew) stay reference material outside the interface (M6-05) |
| Projection horizon | Since M7-12, the future year 0–50 is a view setting kept in the interface, not a scenario field |
| Deferred | Flag artwork (M3-06); block templates (M6-01); sound (M6-02); undo / redo and per-parameter reset (M6-03); nested subgroups (M6-04); survey reference data (M6-05). The status distinctions of (a) (majority found, confirmed deadlock, incomplete search, no allocation) already exist since M2-06 and M2-16 |

### 14.2 Time Model

For group-input scenarios, for group g in year k (an integer, 0 ≤ k ≤ 50), with
N0 = `populationTotal`,
q_g = `populationShare`, a_g = `participationFactor`, v_g = `validBallotRate`,
w_g,p = vote weight, r_g = `growthRate` and δ_g = `turnoutChange`:

- N_g(k) = N0 · q_g · (1 + r_g)^k
- t_g(k) = clamp(t_g(0) + k · δ_g, 0, 1)
- V_g,p(k) = N_g(k) · a_g · t_g(k) · v_g · w_g,p

Shares, preferences, participation and validity do not change with k. Year 0
is the stored scenario, so k = 0 reproduces today's results byte for byte.
Everything is exact rational; (1 + r)^k is repeated exact multiplication.
Overall turnout is ballots cast divided by population, both summed from the
groups; it is never a second multiplier. Threshold, allocation and coalitions
run unchanged on the year-k votes. A growth of −100% empties a group.

Schema version 2 added two group fields after M2-20: `growthRate` (annual
fraction, decimal string in [−1, 1]) and `turnoutChange` (annual change in
percentage points as a fraction, decimal string in [−1, 1]). Both are optional
on import and read as `0` when absent. Version 1 files are accepted and
migrated with zero growth and zero turnout change. The current schema is
version 5 (Section 11); versions 1–3 migrate to group mode and version 4 keeps
its input mode.

Composition of a party's electorate: C_g,p = V_g,p / Σ_h V_h,p, undefined when
the party has no votes; for a block, the sums run over its parties. Two bases
are shown and labelled in group mode: *potential supporters at the given
preferences* (N_g · w_g,p, before availability, turnout and validity) and
*valid votes* (V_g,p). In group mode, composition is derived from the single
group → party preference matrix. Party mode stores each party's voter
composition directly and reports valid voters only; an unknown composition is
not replaced with an invented group.

In party mode, year-zero seats do not depend on composition. A later-year
projection uses the exact current linked population and preferences, including
preferences saved for a group temporarily at zero turnout. Without a linked
basis it derives group contributions only when the required populations are
determined and consistent with the total. A suspended basis or missing
assumptions produces an explicit unavailable reason instead of omitting votes
or inventing a population.

Acceptance fixtures from (b): groups A = 600 and B = 400 (N0 = 1000), turnout
50% and 100%, preference for X 80% and 20% (the rest for Y): X = 320, Y = 380,
turnout 70%, X composition 75% A and 25% B. With A growing 10% a year, year 1:
X = 344, Y = 386, population 1060, ballots 730, turnout 73/106 ≈ 68.867925%.

As built in M2-20: `computeVotes(scenario, year)` and `runSeats(scenario,
year)` take an optional year (default 0) and refuse anything but an integer
0–`LIMITS.projectionYears` (50 since M7-12) with a range error; the coalition search is not
run for a future year. `rational.pow` raises a fraction to an integer power
exactly. `electorateComposition(scenario, votes, target, basis)` in
`src/engine/composition.ts` takes the vote result of the year shown, a party or
block target and the basis `potential` or `valid`, and returns one row per
group in scenario order with the exact amount and its share of the target's
total (null when the total is zero) plus the total; an unknown target is
refused. In party mode the potential basis is unavailable, entirely unknown
positive-vote compositions give unavailable group cells, and a partially
known block retains the exact known contributions plus a separate unknown
amount. The two group fields default to `0` in new groups and presets; the
current serialized version is 5.

### 14.3 Composition And Future Views

**Composition** picks a party and lists every group with its share and rounded
amount of valid votes; in group mode it also shows potential supporters. A party
without votes says so instead of showing a share. The engine retains legacy
block composition calculations without offering block targets in the UI.
**Future** picks a year 0–50
(default 4) and shows, per group, population and turnout in that year beside year 0, and
per party the votes and seats in that year beside year 0 with the change. The
editor gains growth and turnout-change controls per group. Group colours come
from a fixed palette by position, or from the catalog for catalog groups; they
mark people, party colours mark the parties, and the two legends stay apart.

As integrated in M7-12, the view switcher has three views; Composition is a
contextual report and its selector offers parties only.
`buildCompositionReport(scenario,
votes, target)` in `src/engine/composition.ts` rounds both bases (counts and
percent shares at the display places); the target select opens on the first
party and falls back to it when the chosen party is gone; a target with neither
supporters nor votes shows a note and
empty shares. The planned "no parties" message was dropped as unreachable,
since a valid scenario always has a party. `buildFutureReport(scenario, base,
projected, year)` in `src/engine/future.ts` reuses the comparison for totals
and parties and adds each group's population and `groupTurnout(group, year)`
from `votes.ts`. The store caches the projection by input and year; the year is
chosen with a select and a 0–50 slider, and a line under the heading reports
whether that year allocates seats. Growth (% a year) and turnout change
(percentage points a year) have text fields for −100 … +100 and sliders for
−10 … +10. Group markers are round and take one of twelve palette colours by
position (`src/ui/groupColors.ts`); catalog colours come with M2-22.

As built in M7-04, party-mode composition labels the reported shares as the
selected list's valid voters, not the population. Unknown contributions have a
separate row and are never the ordinary "Other / unclassified" group. The
engine still labels a partially known legacy block's contributions as partial
and uses all its votes as the denominator.
An independent demographic-consistency message uses the same exact
availability and population checks as the future projection. It reports
missing or inconsistent assumptions without blocking baseline results; a
consistent result does not establish real-world plausibility.

As built in M2-30: the view is labelled «Демографическое будущее» ("Demographic
future", "עתיד דמוגרפי"); on a phone its switcher label wraps at the space. On
this view the left column shows a coalition chooser in place of the input
editor (src/ui/FutureChooser.tsx): today's minimal winning coalitions in the
search's order (at most LISTED_COALITIONS), the set put together on the
«Коалиции» tab first and marked, and any followed set the list no longer holds,
each with a checkbox, its member names and today's seats. Up to four sets are
followed (MAX_FUTURE_COALITIONS in src/ui/coalitionChoice.ts); once four
are ticked the rest are disabled and a note says so. The store keeps them in
tick order outside the scenario, drops a set when one of its parties is
deleted, and clears them when the input is replaced (a preset, an import,
setInput, a reset to the baseline, the questionnaire build). Each followed
set gets a card in the view: two pies of the whole parliament, year 0 and the
chosen year, with the members in party colours, the rest grey and a mark at the
majority seat, then an exact table of member seats, the total and the seats
needed. buildCoalitionFuture(scenario, base, projected, partyIds) in
src/engine/future.ts gives the seats, the majority flag, the pie stops and
the majority stop from the two runSeats results and evaluateCoalition; a
year without an allocation shows its reason instead of a pie. No coalition
search runs for future years. The offline budget became 450 kB with this item.
In party mode, the future report uses the same exact population derivation as
the projection when the required assumptions determine a group's population.
Known zero is shown as zero; genuinely unknown values remain unknown.

As built in M7-10 (2026-11-01), the future chooser region also shows two
independently labelled visual comparisons: group populations and all parties'
valid votes for year 0 and the selected year. Each uses an absolute total scale
for its two bars and provides exact-source amounts, rounded labels, shares and
changes in an accessible table. Below-threshold party votes remain in the vote
chart. Zero totals are empty, and unavailable populations or projections show
their reason instead of fabricated slices or amounts.

The same region offers two independent, initially empty party sets, red and
orange. They may overlap and are transient view state, not scenario fields.
Ordinary edits retain the sets, deleting a party prunes it, and replacing the
scenario clears them. Each nonempty set shows its valid votes and share plus
its seats for year 0 and the selected year. It reports half of all seats
separately from the configured majority and makes clear that a seat total
does not establish political cooperation.

A dedicated inlined worker checks every integer year 0–50 in order for the
first half-seat crossing, without assuming monotonicity. A proven first
crossing requires an available allocation for every earlier year; after a
missing year the result is only the first known crossing. An incomplete search
never claims that no crossing exists. Progress, cancellation, retry, stale
message rejection and a visible worker-unavailable state keep the scan
responsive and its result tied to the current scenario and selected sets.
Changing only language or the displayed year does not restart the scan.
M7-12 explicitly expands the former three-coalition, 0–20 main-app contract
to four coalitions and 0–50. The 0–20 calculations and nonmonotone crossing
semantics are unchanged. Scan progress rerenders only the critical-results
component, not the whole application.

### 14.3.1 Integrated Coalition And Demographic Panels

M7-12 integrates the accepted prototypes without embedding their arithmetic
or HTML. `panel.ts`, `supporterTurnout.ts` and `coalitionVariants.ts` own the
pure exact operations. `PanelControls.tsx`, `CoalitionTiles.tsx` and
`FutureWorkspace.tsx` edit the store's one authoritative input: Data reflects
changes immediately, without synchronizing copies on a tab switch.

**Free entries and smoothing.** Vote shares and composition cells have exact
fields, 0.25-point sliders and transient locks. Typing changes only that cell;
invalid text or an off-100% total suspends affected results. Repair links focus
Align or Smooth without activating it. Align proportionally fills unlocked
vote shares to exactly 100%, preserving locks. Composition displays its sum,
locked/movable shares, signed shifts, hatched shortfall and a marked 100% edge
for excess. Smooth acts on every row, preserving locked cells, party votes and
group turnout. It matches the frozen source population through bounded exact
flow on a fine rational lattice; if that population is infeasible it normalizes
rows and names unmatched groups. Impossible locked rows name their parties and
refuse atomically. Settled inputs are unchanged. Undo restores compositions
only, never later vote/rule/growth changes. Missing compositions remain unknown.

The population reference uses saved source linked populations, explicit source
group shares, or a determinable original party-source population. It never
invents equal shares. Population and voter bars have separate denominators;
four group voter pies per row use party colours, with larger sets scrolling
in at most two compact rows. Group bars distinguish voters/non-voters, source
ticks and signed shortfall/excess; the largest reference gap is named.
Enlarged panels keep live fields, locks and sliders with a 10% guide.
The composition editor shows at most five group cards per row and at most
two rows in its own vertical scroll area, reduced further on short screens.
Narrow screens use fewer columns. The party controls and full coloured
composition summary remain outside that scroll area in both panel sizes.

**Baseline correction and experiments.** The group-turnout dialog describes
its picture-of-the-world assumptions and a nonbinding 45–85% guide. It previews
population, overall turnout, abstention and reference gaps before a second,
explicit confirmation. Cancel/Escape discards edits; source reset restores
source values. Applied correction preserves party vote shares, compositions
and seats, but updates determinable population/turnout and ends any experiment.
An active experiment makes correction read-only with an explicit reset action.

The first party target freezes exact party/group population cohorts. If a
party's frozen average is a and its requested target is t, its coefficient is
(t−a)/(1−a) for an increase, (t−a)/a for a decrease, or zero when unchanged.
For each frozen group turnout u, a positive coefficient c gives u+c(1−u);
a negative coefficient gives u(1+c). Population counts are not reassigned.
Coalition-panel experiments show raw shares relative to original valid votes,
so changing one target does not normalize other parties. Explicit alignment
repairs the total. Future-mode targets normalize all competing parties and
compare original today, changed today and changed future; parliamentary-seat
and within-coalition percentages label their different denominators.

All authored source edits, including alignment, end the experiment with a
notice. A new target freezes the new source. This avoids applying an obsolete
basis after a locked alignment. Saved linked restrictions/bases are suspended
rather than discarded; their reuse requires explicit rebuild. Replacement
clears experiments, locks, identities and favourites; deletion prunes obsolete
memberships. Invalid text remains recoverable through navigation/enlargement.
Experiments, favourites, labels and locks are transient and are not exported.

**Coalitions and future.** Zero to four tiles support removal, add-nearest,
restore-nearest, stable numbered candidates, letter-labelled custom sets,
favourites and favourite-only lists. Custom sets may conflict with the rules;
details name directed refusals, member seats, pivotal roles and possible
joiners. Majority tiles are green; shortfall affects red intensity. Prepared
candidates obey effective pair/block/directed rules and deterministic order.
The existing worker bounds enumeration to 20 eligible parties and 250,000
visits, listing at most 200; incomplete/capped lists are explicitly labelled.
Directed decisions change one end at a time; source reset prunes deleted IDs.

Growth mode retains up to four fixed memberships; experiment mode compares
one, while every allocation includes all competitors. Annual population growth
compounds exactly through year 50. Experiment futures retain cohort turnouts,
not a constant party average: imported annual turnout changes are preserved
in the shared scenario but are not applied inside that explicit experiment.
Outside experiments, imported legacy projection semantics remain unchanged.
The 51-year population chart compounds known baseline counts directly; it
does not rerun seat allocation for every chart point. Integer playback runs at
1/2/5 years per second, stops at 50 and pauses on edits, view changes and page
hiding. Unavailable population/allocation reasons remain distinct from zero.

The shipped HTML remains a single file at or below 460,800 bytes. Build-only
translation compression is lossless DEFLATE, decoded as inert JSON through
standard browser Compression Streams; no runtime network, executable decoder
or extra asset is introduced. Since M7-16 the Russian table's keys travel
inside its deflated payload as well. Exact transformed-table and offline browser gates
cover the installed modern Edge runtime.

**Prototype look (M7-14).** Both tabs follow the accepted standalone
prototypes with `ws-` classes: rounded cards with soft backgrounds; a share-sum
tile with an agreed badge and a turnout tile (base → now); party cards with
styled vertical sliders, before/now bars, a decimal box, −/+ steppers and a
lock; an Align button that turns red while the sum is not exactly 100%; the
composition card with a ‹ party › selector, stacked bar, per-group rows and
Smooth; population bars (population / as in the file / came) and group pies;
coalition tiles with badge, mini bar and majority mark; directed rule strips
with a ✓/✗ end per party; enlarged dialogs; and on Demographic Future the
growth rows, a timeline with start, play/pause and speed, and year-0/year-k
donut pairs. Every shown value comes from the scenario or exact engine results:
the steppers call `stepPanelPercent` (exact ±0.25 points, clamped to 0–100),
displayed shares use `panelDisplay`, and tile seats needed and the majority
mark come from `coalitionVariants.ts`. The prototypes' own model code is not
used. To stay within the unchanged limit, the build also packs the inlined
stylesheet with lossless DEFLATE as base64; startup decodes it with
`DecompressionStream('deflate')` as inert text into one `<style>` element
before the first render, in the same startup path that awaits the locale
tables. The content security policy is unchanged.

**Second fidelity pass (M7-17).** Supporter turnout on Coalitions is a per-party
coefficient c from −1 (no one votes) through 0 (as in the base) to +1
(everyone votes), shown with two decimals and stepped exactly by 0.05; below it
the resulting turnout is rounded for display only. `turnoutAt` maps a frozen
turnout t exactly to t + c(1 − t) for c ≥ 0 and t(1 + c) for c < 0, and
the coefficient feeds the same frozen supporter experiment, lifecycle and reset
as a target. Demographic Future opens with a full-width timeline bar (years
0–50, start, play/pause, year, speed), a growth card with exact rate fields,
share today → year, population change, reset to file and a 51-year share
chart (`populationTrend`), and four coalition cards whose default memberships
are the Coalitions tiles (shared `useTileSets`). Each card draws year-0 and
year-k rings of all seats with members coloured, the seat total, a majority
tick, majority or shortfall (`missing`), seat change and national vote share
(`voteShare`) from `buildCoalitionFuture`. Experiment mode compares one
coalition. The previous tables, the chooser and the Coalitions result lists,
composition, comparison and historical sections stay available in closed
disclosures. Directed rules show all relations of one chosen party in two
columns, each end independent.

### 14.4 Israeli Example And Catalog

Preset "Israeli educational example": 120 seats, threshold 3.25%, population
1 000 000, every group at 70% turnout, zero growth and turnout change, full
availability and 99.9% validity, open voting with all six lists allowed, no blocks
and no coalition restrictions. It is labelled in the interface as an
educational example after the 2022 election, not its results or a poll, and
names the source of its group shares. The shares follow official Central
Bureau of Statistics (CBS) figures for the 2022 electorate; the preferences
are assumptions; a zero is an editable assumption, not a ban.

| Group (catalog ID) | Share | Likud | Yesh Atid | Avoda | RZ / Otzma | Shas | Ra'am |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Secular Jews (`secular`) | 33.6% | 25% | 45% | 20% | 5% | 5% | 0% |
| Traditional Jews, masorti (`traditional`) | 24.5% | 45% | 20% | 5% | 15% | 15% | 0% |
| Religious Jews, not Haredi (`religious`) | 7.9% | 20% | 5% | 0% | 55% | 20% | 0% |
| Ultra-Orthodox Jews, Haredim (`haredi`) | 11% | 10% | 5% | 0% | 15% | 70% | 0% |
| Arab citizens with the right to vote (`arab`) | 17% | 10% | 10% | 5% | 0% | 0% | 75% |
| Other / unclassified (`other`) | 6% | 30% | 35% | 15% | 10% | 5% | 5% |

Shares (M2-26), from two CBS releases of 2022: eligible voters for the 25th
Knesset are 77% Jews, Haredim among them 11% of all eligible voters, 17% Arabs
and 6% others, non-Arab Christians and residents without a religion
classification (media release 342/2022, "Number of voters in Israel before the
elections to the 25th Knesset"); Jews aged 20 and over define themselves as
secular 45.3%, traditional 19.2%, traditional-religious 13.9%, religious 10.7%
and Haredi 10.5% (release of 20 September 2022). Haredim and Arabs are taken
directly. The other 66%, Jews who are not Haredi, is split 45.3 : 33.1 : 10.7
(both traditional categories in `traditional`) and rounded to one decimal;
`other` is the exact remainder to 100%, which equals the CBS "others". The
self-definition of Jews aged 20 and over is applied to voters aged 18 and
over, an approximation. The shares sum to exactly 1 and the example set
always ends with `other`; own groups are free. `EXAMPLE_GROUPS` in
`src/ui/presets.ts` is the single source of these rows for the preset, the
questionnaire and the lesson. Since M2-27 the questionnaire asks the example
from the party side: `describeElectorate` in `src/engine/electorate.ts` turns
these rows at 70% turnout into party vote shares, suggested to two decimals
(25.61 / 24.77 / 9.69 / 11.95 / 14.93 / 13.05%), and each list's composition by
group, suggested to one decimal; built back they give group shares of
33.5821 / 24.5047 / 7.9165 / 10.9991 / 17.002 / 5.9956%, the CBS shares at one
decimal, and the same 31 / 30 / 11 / 14 / 18 / 16 seats, also with Arab
turnout at 50%.

Catalog group colours from (b): `secular` #0891B2, `traditional` #D97706,
`religious` #7C3AED, `haredi` #262626, `arab` #15803D, `other` #6B7280.

Since M7-15 the catalog has a seventh group, `knitted-kippot` ("Вязаные кипы,
поселенцы", #BE185D), and the Basic (Israel) set of the questionnaire lists
seven groups in the order secular, traditional, religious, knitted kippot,
Arab, Haredi, other. The catalog names of `traditional` and `arab` became
"Традиционные евреи, масорти ле дати" and "Арабские граждане" (in all three
languages). The CBS releases above do not count knitted-kippa voters or
settlers separately, so no figure is invented for the new group. Since
2026-11-04 (user request) the source panel on the group-set page shows only
the six groups the source counts, titled as an example of CBS 2022 shares, and
no longer lists the new group with "—"; it appears beside both Basic and
custom choices. The six-group preset and the table above
are unchanged.

The list catalog is tagged "lists that won seats in the 25th Knesset (2022)",
in seat order, each with a short neutral description: Likud (a large
right-wing party), Yesh Atid (a centrist party), Religious Zionism (a 2022
joint list of national-religious and right-wing parties), National Unity (a
centrist joint list), Shas (a Sephardi ultra-Orthodox religious party), United
Torah Judaism (an Ashkenazi ultra-Orthodox list), Yisrael Beiteinu (a secular
right-wing party), Ra'am (an Arab party of Islamic orientation), Hadash–Ta'al
(an Arab and Arab-Jewish left-wing list) and Avoda (a social-democratic
party). Descriptions never set voters or coalition bans. Catalog groups and
lists are stored with their catalog ID and an empty name, and the interface
shows the catalog name in its language (the M2-19 rule); a typed name wins.

Official facts used by the narrator, from the Central Elections Committee
results: 2021, 24th Knesset — 39 lists ran, 13 won seats, 6 578 084 eligible
voters, turnout 67.44%; 2022, 25th Knesset — 40 lists ran, 10 won seats,
6 788 804 eligible voters, turnout 70.63%. The threshold has been 3.25% of
valid votes since 2014. Historical facts, examples and user assumptions carry
different labels; no statistic is invented.

As built in M2-22: `src/ui/catalog.ts` holds the catalog without any
translation import (`CATALOG_YEAR`, `CATALOG_GROUPS`, `CATALOG_LISTS` in seat
order, `EXAMPLE_LISTS` in table order) and looks entries up through maps, so a
prototype key such as `constructor` finds nothing. The catalog ID is the
entity ID; no schema field or version was added. List colours, close to the
familiar hues but not official: `likud` #1D4ED8, `yesh-atid` #38BDF8,
`religious-zionism` #CA8A04, `national-unity` #0D9488, `shas` #475569, `utj`
#1E293B, `yisrael-beiteinu` #4338CA, `raam` #65A30D, `hadash-taal` #9D174D,
`avoda` #DC2626. The preset `israelExample` (scenario ID `israel-example`) is
the seventh in the picker; with the M2-26 shares and the M2-28 valid-ballot
rate of 99.9% it gives 700 000 ballots, 699 300 valid, split as 179 235 /
173 355 / 67 865 / 83 650 / 104 545 / 91 350 × 999/1000, and 31 / 30 / 11 /
14 / 18 / 16 seats (Likud, Yesh Atid, Avoda, Religious Zionism, Shas, Ra'am),
with no tie at the cut-off: remainders .922, .726, .718 and .66 take the four
remaining seats ahead of .634 and .34. The joint list is named "Религиозный сионизм — Оцма Йехудит" and its description
names Religious Zionism, Otzma Yehudit and Noam. `entityName` in
`src/ui/names.ts` resolves a typed name, then the catalog name, then the
numbered default. A party row in the editor shows the catalog description line
"List in the 25th Knesset (2022): …" only while the name is empty. The results
region shows the example note for as long as the scenario ID is
`israel-example`, edits included. Composition and Future colour group markers
by `groupColorOf(id, index)`: the catalog colour first, then the palette by
position.

#### Historical 2022 preset and reference (M7-06)

The separate `historical2022` preset represents the 25th Knesset election,
not the current political situation. It retains all 40 lists separately,
including every list below the 3.25% threshold. For each list the exact party
share is its published valid votes divided by the historical 4,764,742 valid
votes; no rounded published percentage or aggregate "Other" list is used.
The first 13 lists total 4,693,527 votes and the remaining 27 total 71,215.
There are no groups, each party's composition is unknown, and no demographic
preference or coalition restriction is inferred.

The historical reference shows 6,788,804 eligible voters, 4,794,593 ballots
cast, 4,764,742 valid and 29,851 invalid. Turnout is the exact cast-to-eligible
ratio, displayed as 70.63%. The editable model preserves the standard 99.9%
valid-ballot assumption: at the historical turnout it has 4,789,798.407 model
valid ballots, not the historical valid-ballot total.

The first ten qualifying lists' published seats using Bader–Ofer are
32 / 24 / 14 / 12 / 11 / 7 / 6 / 5 / 5 / 4. The same vote shares give
31 / 23 / 14 / 12 / 11 / 8 / 6 / 5 / 5 / 5 under this educational model's
Hamilton method. The interface labels both methods and their comparison
deltas separately; Hamilton is not presented as the official Israeli method.

The [Central Elections Committee results](https://votes25.bechirot.gov.il/nationalresults)
returned HTTP 403 in the implementation environment. The full list, votes and
official seats were independently transcribed and checked against the
[Israel Democracy Institute's 2022 results table](https://en.idi.org.il/israeli-elections-and-parties/elections/2022/).
The built offline app shows source attribution as text and performs no request.

### 14.5 Questionnaire Book

A book-like questionnaire replaces the editor as the first screen. Each page
has a small chapter number, one question, two or three short sentences on
what it means and why it matters, one main input or a compact overview of
related controls, and an illustration or meaningful visual controls. Back,
Next and "Пропустить анкету" are always visible. Pages change only on the
user's action; animations never delay the buttons or choose for the user.
After an answer a narrator reply may comment on it ("Вы выбрали четыре
партии…"); it is never a computed result. A longer story or source opens as a
separate page with a way back.

As built in M7-16: the opening page offers four choices — start from scratch;
the ready eight-party example "8 партий (свободные названия)" (the user's
"New 8 parties" set: eight lists with their own names — verbatim in Russian,
translated in English and Hebrew by the interface language at the moment the
example is chosen (user request 2026-11-04) — seven
groups, turnout, vote shares, full compositions, growth and 20 directed
refusals); the ready "2022 (учебный)" example (the six-list party-mode
educational example with the 2022 seats); and skipping the questionnaire,
after which import stays available on Coalitions. Each example is stored as
exact questionnaire answers, not as a scenario. "К коалициям" builds it
through the same edit functions and opens Coalitions; "Заполнить анкету" opens
page 1 with every page answered and editable, and leaving every value as it is
builds a scenario identical to the example (for the eight-party set in
Russian, to importing the user's file; in English and Hebrew only the names
differ). Both example buttons act at once, without a
confirmation, even over existing answers or a changed scenario (user decision
2026-11-04); only an empty start over given answers still asks.

Chapters: parties (count; names — the 2022 catalog, suggested since M2-32,
own names, or the six-list educational set, which changes the count only
after confirmation); the electorate, titled "Состав избирателей" (two lesson
pages, then Basic (Israel), selected by default, or custom groups; the
no-group choice was removed on 2026-11-04 at the user's request); a
simultaneous group-turnout overview; party vote shares
and each party's composition (since M7-15 always distributed, on one page;
since 2026-11-04 each group cell has a lock that keeps its exact value when
the party is aligned to 100%, the others sharing the rest in proportion, and
the percent sliders move in steps of 0.25);
a check of known voter contributions and, only when
determinable, the implied population. Overall turnout has no question: the
engine derives it exactly when determined; otherwise the explicit fallback
assumption is 70%. Growth appears as a simultaneous group overview, initially
zero, without a preliminary yes/no question. Fresh questionnaire scenarios
have zero annual turnout change and no question for it; hiding that control
never changes an imported legacy scenario.
Seats and threshold follow (3.25% suggested and called the Israeli threshold);
then a visual selected-party relationship editor with two independent ends
per pair, initially everyone willing;
review of the answers by chapter only, with
"Построить мою симуляцию". Content that does not fit becomes another page.

The answers are a draft apart from the scenario. Only "Построить мою
симуляцию" builds the scenario from them and opens Coalitions. "Пропустить
анкету" opens Coalitions: with no answers the current scenario stays (a
labelled, editable no-group educational party example at fresh startup);
otherwise the scenario is built from the confirmed answers and every missing
or invalid one is filled with the value its page
suggests — keeping the chosen party count and IDs, and every entered sum at
100% — and the editor lists what was filled automatically. Since M7-15 the
questionnaire offers no unknown composition: an unconfirmed composition takes
its page's stated starting assumption (Section 14.5, M7-15); imported
scenarios with unknown compositions stay valid and unchanged.
A page counts as answered when the user leaves it forward with a valid input.
Returning to the questionnaire keeps the draft. Replacing a scenario the user
has changed, and starting the questionnaire over, each need confirmation. The
same answers give the same results as the same values typed in the editor.

As built in M2-23: `src/ui/book.ts` holds the questionnaire without any
translation or Preact import. The draft is a language-free record of the texts
typed on each page with the shape they were typed for; an unset page shows its
suggestion, and a stored answer whose shape no longer fits the current counts
counts as missing. `buildBook` turns the draft into a scenario through the
editor's own edit functions, so a questionnaire build and the same values
typed in the editor give the same input text; the scenario ID is
`questionnaire` and its title "Моя симуляция". The questionnaire accepts 2 to
10 parties (up to eight names per part since M2-25, names up to 60 characters
since M2-24),
0 groups or 1 to 8 own groups, seats 1 to 10 000,
percents 0 to 100 and yearly changes −100 to +100; the editor keeps its full
limits. Suggestions: four parties named after the first four 2022 lists in
seat order (since M2-32; four own names before); four own groups with even
shares when the user explicitly chooses own groups, or the six default Basic
groups with the Section 14.4 source disclosure; party compositions are
unknown unless individually entered, with illustrative ready values if
requested; overall turnout 70% when it cannot be derived,
no growth and no turnout change, 120 seats, a 3.25% threshold, and everyone
may cooperate. `src/ui/BookView.tsx` renders one page (the file name avoids
`book.ts` on case-insensitive paths); `src/main.tsx` opens the store on the
questionnaire, while `createStore()` still starts on the editor. The book
renders in the current interface language and shares the accessible language
selector with the editor; changing language preserves answers, page, part and
an open confirmation. The
toolbar button "Анкета" returns with the draft kept. A preset load over
a changed scenario asks first. The editor lists what was filled automatically
until the list is dismissed or the scenario is replaced, and the results of a
questionnaire scenario carry a note that every number is the user's
assumption. Each page names a motif, drawn as described in Section 14.6. The
2021 and 2022 facts page cites the Central Elections Committee:
39 and 40 lists ran, 13 and 10 won seats.

As built in M2-25: the navigation bar puts "Пропустить анкету" (and "Начать
анкету заново" where shown) at the start, and Back beside Next or the build
button at the end, kept together when the bar wraps. "Пример" is a disclosure:
a click opens one sentence, by page kind (names, choices, values, review), on
what the example means and how to change it. Party names and group names are
one page each (`parties.names`, `people.names`), shown in balanced parts of at
most eight numbered fields, with a range line ("Названия 1–5 из 10") and a cue
for the rest ("Ещё 5 — после «Далее»"). Every typed field has a ▾ list of
ready values joined to it and stays open to typing. A names field offers
"Своё название" and the ten 2022 lists (or the six example groups) with their
descriptions, marking a list another field holds; a pick is kept as the
catalog ID and builds as that list or group, a typed name makes an own entry,
and picking a list held elsewhere swaps the two fields. Number fields offer
party counts 2 to 10, group counts 1 to 8, seats 50 / 100 / 120 (marked as in
the Knesset) / 150 / 200, thresholds 0 to 5% with 3.25% marked as the Israeli
threshold, turnout 50 to 90%, yearly changes −2 to +2, and shares in whole
fives with the exact rest to 100% first; the list shows the option equal to
the field's value by exact comparison, and a picked number is written in the
notation of the interface language. Choice, coalition, lesson, opening and
review pages have no list. Chapter 2 opens with two lessons that take no
answer and are passed by Next and Back without recording anything: "Что такое
группа избирателей?" (a party's voters divide into social subgroups by
national and socio-economic identity, which shapes their worldview; their
fears, goals and consolidation shape their turnout, and the overall turnout is
made up of each subgroup's turnout; in the simulator such a subgroup is an
optional voter-group assumption; nothing is inferred from a group's name) and
"Откуда партия получает голоса?", which shows, as bars in a frame titled as an example
("Пример: как можно представить избирателей двух партий — Ликуд и РААМ", with
the party names resolved like any other name), the engine's composition of the
valid votes of Likud (six groups, most from traditional Jews, 43.06%) and
Ra'am (two groups, 97.70% from Arab citizens) in the Israeli example, with a
key of colour squares as tall as the bars. The group count and
the largest share come from the engine (`voteSources` in
`src/engine/composition.ts`). The review's "Изменить" for chapter 2 opens the
group set, past the lessons.

As built in M2-26: the group-set page (`people.set`), which follows the
lessons, shows alongside its three choices, whichever is chosen, a frame titled
"Учебный набор — те же шесть групп, что в примере на прошлой странице". It
lists the six example groups in lesson order, each with its colour key,
catalog name and share in the notation of the interface language, "Другие /
не классифицированы" last, and ends with a source line naming the Central
Bureau of Statistics, the 2022 eligible voters and the remainder to 100%. The
book model gives the list as group IDs with percent texts
(`exampleGroupSet`). The narrator reply for the example set says the shares
come from 2022 statistics and the preferences are assumptions.

As built in M2-27 and revised in M7-07: the electorate is described party
first; group descriptions are optional and do not claim to measure society.
Chapter 3 "Явка" asks one page per
group (`turnout.N`, 1% to 100% in the questionnaire, since a group that casts
votes needs a size; the editor keeps 0%). Chapter 4 "Избиратели партий" asks
"Сколько голосов получает каждая партия?" (`votes.shares`), then offers
unknown composition for all parties or an individual unknown/enter choice.
An entered `compose.N` row sums to 100%. With groups the chapter ends with
`votes.check`, which takes no answer. The group-shares page
(`people.shares`) and the per-group preference pages (`prefs.N`) are gone.
`describeVoterMix` in `src/engine/electorate.ts` computes each known group's
contribution from party vote shares and compositions, using all valid votes
as denominator and keeping any unknown contribution separate. Known
contributions are not renormalized to 100%. When the necessary assumptions
are complete and determinate, `deriveElectorate` also computes group population
shares from votes divided by turnout and each group's party weights. The check
rounds displayed percentages to one decimal using sum-preserving rounding;
display values never decide seats. A group no party draws from gets share 0%
and even weights only in a determinate derived check;
`castingGroups` tells which groups cast votes. The M7-01 build introduced party
mode with the entered exact party shares and compositions, not the
rounded check values. It derives initial overall turnout exactly when possible
and otherwise lists the 70% example as an assumption; since M7-05 it writes
version 5 with exact group turnouts. The
[2026-10-30 audit](../work/audits/2026-10-30-audit.md) recorded the old
3.25% threshold error; the new questionnaire regression retains the entered
share and allocates 4 / 116 seats. The separate
[audit gaps](../work/audits/2026-10-31-audit.md) were covered and corrected
before M7-01 closed.
Turnout shapes the group assumptions and, where determined, later years.
Suggestions: the Section 14.4 party side when both the six-list
set and the example groups are chosen; otherwise even party shares, and each
composition suggests the group set's shares (the CBS shares for the example
groups, whole even percents for own groups). The check page reads confirmed
answers, labels known valid-voter contributions and the unknown portion
separately, and shows the implied electorate
population and its comparison with the educational 2022 population reference
only when determinable. Missing data never block ordinary coalition results.
The percents pages and the check page show a pie of their values in list or
group colours (exact cumulative boundaries from `percentStops` in
`src/engine/numeric.ts`, a grey rest below 100%, scaled above 100%) in place
of the drawing, with a colour key on each row; on the phone the pie shows
under the rows. The closing list of "Что такое группа избирателей?" follows
the new order: size derived and checked in chapter 4, turnout in chapter 3,
party composition in chapter 4, future in chapter 5. The review lists the
group names in chapter 2, the turnouts in chapter 3, and the party vote
shares and derived group shares in chapter 4, where a typed name over 32
characters is cut to 24 characters and "…". In the editor's automatically
filled list a `compose.N` item is named after its party.

As built in M2-32: «Как назовём участников?» suggests «Подобрать названия из
Израиля». An unanswered naming page, an unreadable answer, or the six-list set
kept with a party count other than six all take the 2022 lists: the names page
starts with one list per field in seat order (Likud, Yesh Atid, Religious
Zionism, National Unity for four; all ten for ten), and a build or a skip
makes them catalog parties with their IDs, catalog colours and empty names.
`tieBreakOrder` stays by position, so the default build gives each position
the seats the own-name build gave it. «Придумать свои названия» stays a choice
and, once chosen, is kept; the six-list set stays a choice; since M7-07 the
group set defaulted to none regardless of the list choice until M7-13 restored
the Basic default. The preset model remains unchanged; its toolbar is hidden.

As built in M2-33: a coalition page («С кем готова сотрудничать партия
«…»?») keeps only its own answers. Unticking B on A's page no longer changes
B's page, and B's «yes» to A no longer withdraws A's refusal. The build writes
one directed refusal per unticked party (Section 7), by refusing party and then
refused party in persisted order, through the editor's edit functions, and no
longer writes incompatible pairs; the same refusals typed in the editor's
«Отказы партий» list give the same input text. The page explanation says that
each party answers for itself, that one refusal is enough to keep the pair out
of a government, and that the results show who refused.

As built in M7-13: the compact turnout and growth pages reuse the same indexed
draft answers internally and confirm their rows together, without copying the
live scenario between tabs. The six default group turnouts fit on one desktop
page; larger or long-named custom sets use accessible parts, and phone controls
stack. Growth sliders span −5% to +5% in 0.25-point steps, alongside exact text
fields that retain valid values outside the slider span. Each group is softly
highlighted strictly above +2.5% or below −0.5%, using the exact engine helper;
the boundaries themselves are not highlighted. These are assumption-check
guidelines, not demographic laws or input prohibitions. No aggregate growth
is displayed in the questionnaire, since unknown population must not be
silently treated as a known weighting.

The composition mode lists Distribute for each party first/default and Leave
composition unknown second. Four fictional-party examples on the same page
distinguish current votes/seats/coalitions (available without composition) from
population and future calculations (requiring sufficient assumptions). Merely
selecting distribution never materializes a known row: the explicit per-party
known/unknown choice remains. The group source and assumption disclosures stay.

The shared DirectedRelations renderer lets the learner select a party and flip
either end of a pair; only that party's own refusal changes. Four pairs are
shown at a time with accessible previous/next controls for larger lists.
Imported directed refusals and legacy growth/turnout-change values remain
intact through navigation and unrelated shared-scenario edits. The renderer is
also used in the live coalition panel. Internal preset and Composition APIs
remain for legacy surfaces and regression coverage.

As built in M7-15 (supersedes the M7-13 composition-mode and paged-pair
paragraphs above): the questionnaire pages are `intro`, `parties.count`,
`parties.naming`, `parties.names`, `people.about`, `people.mix`,
`people.set`, `people.count` and `people.names` (own groups only), `turnout`,
`votes.shares`, `compose`, `votes.check`, `growth`, `rules.seats`,
`rules.threshold`, `coalitions` and `review`; `turnout`, `compose`,
`votes.check` and `growth` appear only with groups. The `compose.mode` and `compose.known.N` choice pages and the
"leave unknown" option are gone: with groups every party gets a composition.
One `compose` page ("Из кого состоят избиратели партий?") has a ‹ party
select › over all parties (each option marked complete or with its
remainder), a stacked bar of the shown party, every group's exact field,
slider and ▾ ready values, "Осталось распределить" and "Выровнять до 100%",
which scales the party's values exactly in proportion to 100 and rounds them
to two decimals by largest remainder (`scalePercents` in
`src/engine/numeric.ts`). The page says that its starting values are an
assumption to edit: the Section 14.4 party-side example by group ID (0 for
knitted kippot) when the six lists and the Basic groups are both chosen,
otherwise the whole even split (15 / 15 / 14 / 14 / 14 / 14 / 14 for seven
groups). Next checks every party; a party not at exactly 100% is a typed
`sum` or `percent` error and the selector turns to it. The draft keeps the
indexed `compose.N` answers (index party × groups + group), and the build is
unchanged. Turnout, vote shares and growth show every group or party in one
card grid of field and slider; the vote-share and composition pies are
replaced by stacked bars; `votes.check` is one table of all groups with its
pie, the 2022 statistic column showing "—" for knitted kippot; growth keeps
−5..+5 in 0.25 steps and the soft warnings. The coalition page uses the
unpaged DirectedRelations strips (◀ party ▶, two columns, independent ✓/✗ per
end, dashed red or solid green line). None of these pages has parts; names
pages and the review keep theirs. Demographic Future says "через N лет" with
the plural form of each language (`formatYears`, `pluralCategory` with
`Intl.PluralRules`) and shows growth values with the locale formatter while
editing stays exact.

### 14.6 Visual World And Page Fit

Light Israeli palette: white, blue, palm green and the metal tones of a coin.
Motifs vary by page and never appear all at once: palms at the edges, the two
sides of a stylized one-shekel coin with a short flip, the Knesset building
on representation and closing pages, a seven-branched menorah on opening and
transition pages, neutral people figures without ethnic features, a ballot
box, a calendar, a threshold line, a round table, an open book. No motif is
tied to a party. Animations are short, run once on page entry and are dropped
under `prefers-reduced-motion`; there is no sound and nothing imitates an
official state service. Drawings are inline SVG, so the offline file needs no
image or font downloads.

Every questionnaire page fits without vertical or horizontal scrolling at
1280 × 720, 1366 × 768 and 1440 × 900, at 100% and 125% zoom, including long
names, input errors and narrator replies, with all actions visible. Below
those sizes the page may scroll while the navigation stays reachable.

As built in M2-24: `src/ui/motifs.tsx` holds original inline SVG drawings,
decorative (`aria-hidden`, not focusable, no external reference): menorah on
the opening page, ballots for parties, people for the electorate, a pie for
preferences, a ballot box with a queue for turnout, a calendar for growth and
turnout change, the Knesset for seats and the review, a threshold line, a
round table for coalitions, and the lily and "1" sides of the one new shekel
coin, without lettering, on the facts page. Palms frame the motif on the
opening and review pages. Fixed captions starting with "Пример" sit under the
drawing on the preferences (40 of 100), turnout (7 of 10), growth (1 000 to
1 020), turnout change (70% to 71%) and threshold pages; they never read the
answers. On page entry the drawing fades in (600 ms), each coin side turns
over once (900 ms, the second 300 ms later) and the palm leaves sway once
(1 600 ms); with `prefers-reduced-motion: reduce` nothing animates. The page is
a compact head, a text and answer column beside an illustration column (2:1;
3:1 on the review) and a bottom navigation bar that also holds "Начать анкету
заново"; the illustration column is hidden on the phone layout. A percents or
coalition page with more than four rows is shown in balanced parts of at most
four rows ("часть n из m"), a names page in balanced parts of at most eight
names (since M2-25), and the review in parts by whole chapter, packed by
an estimated line count (`BOOK_LIMITS` in `src/ui/book.ts`). Next walks the
parts and checks only the current part's fields until the last part, which
runs the full page check; a field error in an earlier part returns to that
part; Back from a first part goes to the previous page's last part; the build
button shows on the last review part. Confirmations open as a dialog over the
page with the head, body and navigation inert. `tests/e2e/bookFit.spec.ts`
walks every page with ten parties, eight own groups and 60-character names,
and again with ten catalog lists, with the ready-value lists and both lessons
(since M2-25), at
1280 × 720, 1366 × 768 and 1440 × 900 CSS pixels, and at 1024 × 576,
1092 × 614 and 1152 × 720 CSS pixels with device scale 1.25 for 125%, and
checks entry animation with and without reduced motion.

As built in M2-27 and revised in M7-07: percent pages are shown in balanced
parts of at most eight rows, four when a typed name is longer than 32
characters. The wider voter/population check uses at most four rows for
names longer than 20 characters and two for names longer than 32
(`BOOK_LIMITS.percentRows`, `partRows`, `checkName`, `longName`), with the range
line and "Ещё N — после «Далее»" cue of the names pages, the cue on the line
of the remainder. Next walks the parts of
the check page before turning it. Pages with a pie use 3:1 columns, like the
review. The preferences caption (40 of 100) went with its pages. The fit walk
with ten 60-character party names and eight 60-character group names reaches
every part of `votes.shares`, `compose.N` and `votes.check` at the six sizes.

As built in M2-33: a coalition page is one part, with "may join a government"
and every other party (at most nine) on one screen and no "часть n из m"; it
uses the 3:1 columns of the pie and review pages, and its check rows keep the
44 px touch size. In a window at least 768 px wide and under 720 px high the
round-table drawing is hidden there, so the answers take the full width and the
partners sit in three columns instead of two. The fit walk with ten
60-character names reaches every coalition page in one part at the six sizes.

As built in M7-15: turnout, vote shares, composition, the check and growth are
single screens with no parts (`BOOK_LIMITS` keeps only the names and review
limits). On windows at least 768 px wide the compact cells, rate rows and
cooperation strips use 2rem controls and 14 px names in up to four columns so
that ten 60-character parties and eight 60-character groups fit at the six
sizes; phones keep 44 px targets and may scroll within the page. The fit walk
checks the error states on `compose`, every refusal end of each selected
party and every growth warning without a second part.
