# Memo — M3-01 Publication decisions

| Field | Value |
| --- | --- |
| item | M3-01 |
| epic | M3 |
| phase | Phase 4 — M3 public preview |
| status | closed |

<!-- status: draft → approved (user) → closed (/4-close). -->
| created | 2026-10-28 |
| closed | 2026-11-08 |

**History.** Drafted 2026-10-28; put on hold 2026-10-29 (“M3,4 poka on Hold”). Host plan revised 2026-11-04 (“ya poka ne hochu vikladivat kod … esli github eto podderzhivaet my vikladivaem tam … cel eto prilozhenie dostupnoe komu ugodno po kliku s facebook”). Restored by `/1-memo M3-01` on 2026-11-04 after the user answered the revision's questions: “approved, default ostaetsa ivrit”. Recorded decisions: repository `elections` (fallback `coalition-sim`); the user creates the repository and uploads, the agent prepares the folder and verifies the link; D6 and D7 updated to the current app; Hebrew stays the default language. A source-code link for a résumé is a later, separate request.

**Approval.** Approved by the user on 2026-11-04: “approved. vse po moemu horosho … Post gde vilozhu link budet na ivrite … Russkojazichnie poimut.” All recommendations of Open Questions 1, 3, 4 and 5 are accepted. Question 2 is answered differently: the audience is first Russian speakers who read Hebrew, then Hebrew-only readers, and the post itself is in Hebrew, so the preview card is in Hebrew (D8 revised; see Deviations).

**Public-example clarification.** On 2026-11-08 the user selected `keep` after
being informed that the eight-party start reproduces the submitted scenario,
including its names, percentages and rules, and contains recognizable real
party names. The user approved keeping that example in the public app and
using its Coalitions page in the preview image.

<!-- No code anywhere in this memo: prose, tables and file paths only. -->

## Problem

M2 delivered a working offline file, but phones need an HTTPS link (spec 2.3)
and M3 shares that link publicly in a social post. Spec 2.4 leaves five
decisions open and forbids any upload until they are made: the static host and
account, whether a public repository is needed, the site address, which example
scenarios are public, and the public text (link preview title, description and
image, and the "educational model, not a forecast" notice). M3-02 cannot start
without them: the preview image URL must be absolute, so the address must be
known before the hosted build is designed.

## Scope

**In scope**

- Choose the host, the account owner and the upload method.
- Decide whether a public repository is needed.
- Choose the site address and a fallback.
- Approve the public example scenarios.
- Fix the public text: preview title and description, preview image content,
  and the not-a-forecast notice in ru, en and he.
- Record the privacy position of the hosted page.
- Record the decisions in spec 2.4 and 13.2; propose ADR 0002.

**Out of scope** (at least two)

- Building the hosted variant, `index.html`, preview metadata tags or the notice
  in the app (M3-02).
- Creating the account, uploading or verifying the link (M3-03; the account is
  created by the user).
- Screenshots and post text (M3-04).
- A custom domain, PWA or another host (M5).
- Any feedback channel inside the app.

## Approach

Each decision is weighed against what the preview needs: free, no commercial
use, survives a traffic spike from one social post, no public development
source repository (the user keeps it local for now), and an upload a
non-specialist can repeat without git.

| # | Decision | Recommendation | Reason |
| --- | --- | --- | --- |
| D1 | Host | GitHub Pages, free plan, user account `SeriyCoder` | Free static hosting under HTTPS, works on phones, opens from a Facebook link with one tap. GitHub Pages on a free account requires a public repository, so D2 keeps that repository to the built page only |
| D2 | Public repository | A separate public repository with only the built `index.html` (plus the preview image and a short README); the source repository stays local and private | Visitors can inspect the built page and its bundled application code and examples. Development source files, tests, docs and history are not uploaded |
| D3 | Account | The user's own GitHub account, signed in by the user | Publication and its credentials stay with the owner; the agent never holds them |
| D4 | Upload method | GitHub web interface: "Add file → Upload files", drag in the prepared folder, commit; Pages set to deploy from branch `main`, folder `/ (root)` | No git or command line needed on the user's side. Updating the app is the same drag and drop of a new `index.html` |
| D5 | Site address | Repository `elections`, giving `https://seriycoder.github.io/elections/`; fallback `coalition-sim` | Short and neutral. M3-02 reads the address from one build setting, so a different name changes one place |
| D6 | Public examples | The two ready starts on the opening page, "8 parties (free names)" and "2022 (educational)", the fresh editable no-group example and the historical 2022 reference | The hosted build derives from the existing app; M3-02 adds the notice and metadata. The eight-party example reproduces the user's submitted scenario and includes recognizable real-party names, percentages and rules; its publication was expressly confirmed on 2026-11-08. The 2022 example and reference use official published 2022 Knesset lists and results (spec 14.4), labelled educational. Other user-saved scenarios, notes and files are not included or transmitted |
| D7 | Default language on first visit | Hebrew, as the app does today when no language is saved; the switcher offers Russian and English, and a saved choice is remembered | User decision 2026-11-04 (“default ostaetsa ivrit”). Matches spec 14.1 and the current startup in `src/main.tsx`; the flag buttons of M3-06 stay a separate item |
| D8 | Preview metadata language | Hebrew only: one title, one description, `he_IL` locale | A social post shows one preview card. The post is in Hebrew and its audience is Russian speakers who read Hebrew and Hebrew-only readers (user, 2026-11-04), so Hebrew serves everyone; it also matches the page's default language (D7). Russian and English are one tap away in the switcher |
| D9 | Preview image | 1200 × 630 PNG of the "8 parties" example's Coalitions page, generated from the built app, no text burned in except what the app shows; absolute URL under the site address | Social crawlers need an absolute image URL. The screenshot uses the user's example with recognizable party names; the user confirmed this choice on 2026-11-08 |
| D10 | Privacy | No analytics, cookies, trackers, forms or external requests; no GitHub Pages analytics exist to turn on; the page's existing Content-Security-Policy stays. Feedback is collected as comments on the post (spec 2.4) | The page sends nothing anywhere; scenario data never leaves the browser |

**Public text (proposed wording)**

| Text | ru | en | he |
| --- | --- | --- | --- |
| Preview title | (reference) Симулятор выборов и коалиций | — | סימולטור בחירות וקואליציות |
| Preview description | (reference) Учебная модель: как явка, предпочтения и электоральный порог меняют распределение мест и возможные коалиции. Не прогноз. | — | מודל לימודי: איך אחוזי ההצבעה, ההעדפות ואחוז החסימה משנים את חלוקת המנדטים ואת הקואליציות האפשריות. לא תחזית. |
| In-app notice | Учебная математическая модель, а не прогноз выборов. Расчёты выполняются только в вашем браузере. | An educational mathematical model, not an election forecast. Everything is calculated in your browser only. | מודל מתמטי לימודי, לא תחזית בחירות. כל החישובים מתבצעים בדפדפן שלך בלבד. |

The notice is always visible in the header area, not a dismissible pop-up, so
a screenshot never shows results without it.

**Constraints passed to M3-02** (not decided here):

- Pages serves `index.html` at the site root, but the offline build writes
  `elections.html`. The hosted build needs `index.html` plus the preview image
  in one folder, while `npm run build` keeps producing the offline file
  unchanged.
- The offline file's Content-Security-Policy blocks all page requests. The
  preview image is fetched by the crawler, not the page, so the policy can stay.

**Rejected alternatives:** publishing the whole source repository (the user
does not want to publish code yet; it can be added later for a résumé);
Cloudflare Pages Direct Upload (the previous recommendation: no repository at
all and unmetered traffic, but a second account when GitHub already fits; it
stays the fallback if GitHub Pages limits are ever hit, about 100 GB of
traffic a month, soft limit); Netlify (drag-and-drop works, but since September 2025 the free plan
is credit-based, about 15 GB of traffic a month, and when credits run out all
sites are paused until the next month — the wrong failure for a post that goes
well).

## Data / Schema Delta

| Entity / field | Change | Schema version impact |
| --- | --- | --- |
| — | None | None |

## Interface Delta

None in this item. M3-02 adds the notice keys (`notice.forecast` in ru, en and
he), preview metadata in the hosted page and a hosted build command.

## Seat-Calculation Correctness

Not affected: this item records decisions only and changes no source; the
hosted build in M3-02 will reuse the same engine bundle, and M3-03 checks
hosted results are identical to the local build (spec 12 [M3]).

| Question | Answer |
| --- | --- |
| Arithmetic paths touched (votes, threshold, quota, remainder, ties, coalitions) | None |
| Where exact rationals are required | Unchanged |
| Ordering / tie rules relied on | Unchanged |
| Any display rounding near a decision? | No |
| How determinism across runs, round trip and locale is proven | Unchanged suite; M3-03 compares hosted and local results |

## Files

| Path | Change |
| --- | --- |
| `doc/spec/elections-simulator.md` | Sections 2.4 and 13.2: record D1–D10 and public text; Section 13.1: correct the resumed M3 status |
| `doc/backlog.md` | Ticked at close only |
| `doc/adr/0002-public-preview-hosting.md` | Accepted decision: GitHub Pages, publish-only repository, address and privacy |
| `.github/copilot-instructions.md` | Add the site address and "the public repository holds only the built page; source stays local" to the project brief |
| `doc/work/STATUS.md` | Track the step, closed item and stage |
| `doc/work/archive/phase-4/M3-01-memo.md`, `doc/work/archive/phase-4/M3-01-test-plan.md` | This memo and its plan, moved from `active/` at close |

No file under `src/`, `tests/` or the build configuration changes.

## Definition of Done

- [x] Tests written first and seen red
- [x] Mandatory seat-calculation correctness tests present where applicable (not applicable; no engine or import/export changes)
- [x] Suite, type check and lint green
- [x] No electoral arithmetic outside `src/engine/`
- [x] Spec and project brief synced
- [x] Deviations recorded

## Open Questions

Answered on 2026-11-04 (“approved, default ostaetsa ivrit”): host GitHub
Pages from a separate public repository with only the built page (D1, D2);
repository `elections` with fallback `coalition-sim` (D5); the user creates
the repository and uploads, the agent prepares the folder and verifies the
link (D3, D4); Hebrew stays the default language (D7).

Resolved recommendations:

1. Public examples as listed in D6, including the 2022 example with real list
   names and official results? — **Answered 2026-11-04:** yes. It is public
   data, labelled educational, and the notice is always visible. Publication
   of the user-supplied eight-party example was separately confirmed after
   clarification on 2026-11-08.
2. Preview card language (D8)? — **Answered 2026-11-04:** Hebrew, because
   the post is in Hebrew and every reader of it reads Hebrew. The Russian
   wording stays in the table as a reference translation only.
3. Preview image from the "8 parties" Coalitions page (D9)? —
   **Confirmed 2026-11-08:** yes, after the user was informed that the example
   includes recognizable real-party names.
4. Is the proposed ru/en/he notice wording acceptable? — **Answered
   2026-11-04:** yes. The approval proposed a full language review after first
   feedback, while M3-05 and the project workflow currently require that
   review before publication. Resolve this timing separately before sharing.
5. How does `/2-tests` test an item with no code? — **Answered 2026-11-04:**
   use a checklist of document checks. Executable checks for the notice and
   metadata belong to M3-02.

## Deviations

| Step | Deviation | Reason |
| --- | --- | --- |
| /1-memo approval | D8 changed from Russian to Hebrew preview card (`he_IL`); Hebrew title and description added | User, 2026-11-04: the post is in Hebrew; the audience is Russian speakers who read Hebrew, then Hebrew-only readers |
| /3-implement | ADR 0002 created during implementation rather than `/4-close` | The approved test plan's C11 requires the accepted ADR to exist for this step's green result; user approval was already recorded |
| /4-close | Corrected the description of the eight-party example and preview | The example reproduces the user's scenario and contains recognizable party names; after being informed, the user explicitly selected `keep` for both the public example and preview on 2026-11-08 |
| /4-close | The proposal to review English and Hebrew after first feedback conflicts with the existing M3-05 schedule | The backlog and project workflow require the review before publication; its timing is surfaced rather than silently changed |
| /4-close | Spec 13.1 and the backlog's M3 hold marker are updated alongside the planned spec sections and backlog tick | M3 resumed on 2026-11-04, so the former hold markers were stale |
