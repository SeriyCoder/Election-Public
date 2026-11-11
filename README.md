# Election-Public

Offline-first educational simulator of Israeli elections, turnout, seat allocation, and coalitions. Not an election forecast.

An educational offline-first browser simulator for exploring turnout, vote
shares, electoral thresholds, Hamilton seat allocation and coalition
feasibility. It is a mathematical model, not a legal calculator. It makes no
inference about real voters from demographic labels.

## Status

The offline application is built locally as `dist/elections.html`. The planned
GitHub Pages address is
<https://seriycoder.github.io/Election-Public/>; it is not claimed to
be live. The interface translations have not completed their publication
review, and the simulator is not legally certified.

## Local development

Install the locked dependencies with `npm ci`, then use:

```powershell
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` creates the single-file offline app. To prepare the separate
Pages upload folder, set the planned HTTPS base URL and run the hosted build:

```powershell
$env:HOSTED_BASE_URL = 'https://seriycoder.github.io/Election-Public/'
npm run build:hosted
npm run test:e2e
```

The hosted output is `dist-hosted/`, containing only `index.html`, `preview.png`
and `README.md`. Hosted building and the full browser suite require the same
base setting and the installed Microsoft Edge browser.
Scenario data stays in the browser; this project does not send scenario data to
a server.

## Source publication and Pages releases

The approved publication plan is to release the source under the MIT License.
Before the first public push, verify and retain the repository's MIT license
file. The release uses a sanitized source snapshot committed on top of the
existing public `main`; it does not upload the private development history.
Pushing the source does not publish the site. Pages is released separately
only by manually dispatching the branch-restricted workflow from `main`, after
its validation and build checks pass. Do not treat the planned URL as live
until the first release has been verified.

The user approved releasing this non-commercial MVP before the full English
and Hebrew wording review. Those translations have not received that complete
human review; report wording or usability issues for follow-up correction.
