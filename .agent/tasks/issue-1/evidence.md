# Issue 1 Evidence

## Release summary

- Repository: `kiku-jw/word-runner-web`
- Public repository URL: <https://github.com/kiku-jw/word-runner-web>
- Public GitHub Pages URL: <https://kiku-jw.github.io/word-runner-web/>
- Prototype release commit: `9a1271baa658710b68a3e2b6b087ab04004504b0`
- Prior build commit: `67438202f6467d716c5a65e11e97825afe979b21`
- Publication date: 2026-07-31

## GitHub Pages deployment proof

- Actions run: <https://github.com/kiku-jw/word-runner-web/actions/runs/30591713510>
- Attempt: `2`
- Build job: `91036279777` (`success`)
- Deploy job: `91037200077` (`success`)
- Live deployment verification step: `Verify the live page` (`success`)

## Command proof

### Local verification

```bash
npm ci && npm run qa
```

Observed result before publication:

- Clean lockfile install: 62 packages, 0 vulnerabilities
- Vitest: 4 files and 20 tests passed
- TypeScript and Vite production build: passed
- Playwright: 64 tests passed across phone, tablet, and desktop projects

### Deployment verification

```bash
gh run view 30591713510 --repo kiku-jw/word-runner-web --json attempt,status,conclusion,jobs,url,updatedAt
curl -I -L --max-time 20 https://kiku-jw.github.io/word-runner-web/
curl -sL https://kiku-jw.github.io/word-runner-web/ | rg -n "<title>|Словобіг" -n -S
```

Observed result on 2026-07-31:

- Workflow attempt `2` finished with overall conclusion `success`
- Build and deploy jobs both finished with conclusion `success`
- `curl -I -L` returned `HTTP/2 200`
- Live HTML contained `<title>Словобіг</title>`
- Live JavaScript and CSS SHA-256 hashes matched the local `dist` artifacts
- Fresh browser readback reported 0 console errors and 0 third-party requests

The earlier run for the prior build commit failed on a temporary TypeScript
error in a Playwright test under construction:
<https://github.com/kiku-jw/word-runner-web/actions/runs/30591368784>.
The accepted workflow attempt above contains the fixed test and the complete
final verification set.

## Lighthouse proof

### Local preview audit

- Source file: `.agent/tasks/issue-1/raw/lighthouse-local.json`
- Performance: `100`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- FCP: `901.41 ms`
- LCP: `901.41 ms`
- Speed Index: `1598.73 ms`
- TBT: `0 ms`
- CLS: `0`
- TTI: `901.41 ms`

### Live Pages audit

- Source file: `.agent/tasks/issue-1/raw/lighthouse-live.json`
- Performance: `100`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- FCP: `1026.00 ms`
- LCP: `1476.00 ms`
- Speed Index: `2774.74 ms`
- TBT: `0 ms`
- CLS: `0`
- TTI: `1521.00 ms`

## Visual proof

- Mobile welcome: `.agent/tasks/issue-1/raw/welcome-390.png`
- Mobile gameplay: `.agent/tasks/issue-1/raw/gameplay-360x640.png`
- Alternate mobile gameplay: `.agent/tasks/issue-1/raw/run-390.png`
- Desktop welcome: `.agent/tasks/issue-1/raw/welcome-1280.png`
- Desktop gameplay: `.agent/tasks/issue-1/raw/gameplay-desktop-1280x800.png`
- README screenshot: `docs/images/gameplay-mobile.png`

## Product boundary confirmed

- No account, backend, ads, cookies, remote analytics, or automatic gameplay telemetry transmission
- Parent metrics remain browser-local and export only on explicit adult action
- Child-facing content remains Ukrainian source to English target
- Content remains prototype-reviewed and still requires human bilingual review before any broader child pilot

## Adversarial review resolution

The independent review found four actionable edges. All are fixed and covered
by the final browser suite:

1. Vertical drags no longer fall through as taps.
2. A final-two mistake remains prioritized after returning to lessons.
3. Browsers without speech synthesis show fallback copy and no dead buttons.
4. The deployment workflow performs a post-deploy live-page smoke.
