# Election-Public

Offline-first educational simulator of Israeli elections, turnout, seat allocation, and coalitions. Not an election forecast.

An educational offline-first browser simulator for exploring turnout, vote
shares, electoral thresholds, Hamilton seat allocation and coalition
feasibility. It is a mathematical model, not a legal calculator. It makes no
inference about real voters from demographic labels.

## Status

The offline application is built locally as `dist/elections.html`. The public
preview is live at <https://seriycoder.github.io/Election-Public/>, deployed
from a sanitized source snapshot in the public repository
`SeriyCoder/Election-Public`. The interface translations have not completed
their publication review, and the simulator is not legally certified.

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

The source is released under the MIT License as a sanitized snapshot in the
public `Election-Public` repository; the local development history is not
uploaded. Pushing the source does not publish the site. Pages is released
separately only by manually dispatching the branch-restricted workflow from
`main`, after its validation and build checks pass.

The user approved releasing this non-commercial MVP before the full English
and Hebrew wording review. Those translations have not received that complete
human review; report wording or usability issues for follow-up correction.
