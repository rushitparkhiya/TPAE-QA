# Orbit v2.0 — What It Does & Why It Matters

> The shareable one-pager. Point someone here when they ask "what is Orbit?"

---

## In one sentence

**Orbit is a complete QA + UAT platform for WordPress plugins — one command, every perspective, every release.**

---

## The problem it solves

A typical WordPress plugin release gets judged from six angles:

1. Did the **developer** ship clean code?
2. Did **QA** find every broken flow?
3. Did the **PM** verify the user journey works?
4. Did the **analyst** confirm tracking fires?
5. Did the **designer** catch visual regressions?
6. Will the **end user** have a smooth update experience?

Most teams answer 1-2 of these. Serious plugins need all 6. Orbit automates all 6 — from one command.

---

## What it catches (real numbers)

| Threat surface | Coverage |
|---|---|
| **22 WordPress vulnerability patterns** | including the April 2026 EssentialPlugin supply-chain attack (400K sites compromised) |
| **Patchstack 2025 top 5 vuln classes** | XSS (34.7%) · CSRF (19%) · LFI (12.6%) · BAC (10.9%) · SQLi (7.2%) — all detected |
| **PHP 8.0 → 8.5 compatibility** | removed functions, implicit nullable types, property hooks, `array_find` family, `mb_trim`, E_STRICT |
| **WP 6.5 → 7.0 modern features** | Script Modules, Interactivity API, Block Bindings, Plugin Dependencies, Site Health, Connectors/Abilities API |
| **WordPress.org plugin-check canonical rules** | aligned — if Orbit passes, WP.org review passes |
| **8 + 6 + 4 role-specific tests** | Dev static analysis + PM user journey + PA analytics firing + Designer visual regression + QA conflict matrix |

---

## The 20+ automated checks (Gauntlet)

Runs in order. Each step is a Yes/No gate. Severity-classified.

### Static analysis
- **Step 1** PHP lint — zero syntax errors
- **Step 1a** Release metadata — plugin header, readme.txt, version parity, license, block.json, HPOS, WP function compat, PHP 8.x compat, modern WP features
- **Step 1b** Zip hygiene — no `.git/`, `.cursor/`, `.aider/`, source maps, `.DS_Store`, forbidden functions (`eval`, `exec`, `ALLOW_UNFILTERED_UPLOADS`)
- **Step 2** PHPCS + WPCS — WordPress Coding Standards
- **Step 2b** WP.org plugin-check — same tool the WP.org review team runs
- **Step 3** PHPStan L5 — static type analysis

### Asset + i18n
- **Step 4** Asset weight — total JS/CSS
- **Step 5** i18n POT — translatable string coverage

### Functional E2E (Playwright)
- **Step 6** Functional + visual + axe-core accessibility
- **Step 6c** PHP deprecation log scan (catches 8.x runtime deprecations PHPStan misses)

### Performance
- **Step 7** Lighthouse — performance ≥80
- **Step 8** DB profiling — N+1 detection, autoload bloat
- **Step 8b** Peak memory — catches plugins that crash 64MB shared hosting
- **Step 8c** WP-Cron verification

### Compliance
- **Step 8d** GDPR / Privacy API hooks
- **Step 8e** Login page asset leak
- **Step 8f** Runtime translation test (pseudo-locale `.mo`)

### Lifecycle
- **Step 8g** Uninstall cleanup + update path + block deprecation
- **Step 8h** Keyboard nav + admin color schemes + RTL
- **Step 8i** REST Application Passwords auth

### Competitive context
- **Step 9** Competitor comparison
- **Step 10** UI performance
- **Step 11** 6 parallel AI skill audits → one HTML report

---

## The 20+ Playwright specs

Every common WP surface has a spec. Skip gracefully when plugin doesn't have that feature.

**Functional:**
- uninstall-cleanup · update-path · block-deprecation · keyboard-nav · admin-color-schemes · rtl-layout · multisite-activation · app-passwords · wp7-connectors · plugin-conflict (top 20 matrix)

**UX:**
- empty-states · error-states · loading-states · form-validation

**PM / PA:**
- user-journey · onboarding-ftue · analytics-events · visual-regression-release

**Performance:**
- bundle-size (per admin page, per frontend, login-must-be-zero)

---

## The 4 custom Claude skills

Replace mismatched community skills with WordPress-specific reviewers:

| Skill | Role |
|---|---|
| `/orbit-wp-security` | 22 WP vulnerability patterns (PHP source code reviewer, NOT an attacker tool) |
| `/orbit-wp-performance` | 14 WP performance patterns (hooks, queries, transients, Script Modules) |
| `/orbit-wp-database` | `$wpdb`, autoload, dbDelta, uninstall cleanup |
| `/orbit-wp-standards` | Review-mode WP coding standards (not a scaffolder) |
| `/orbit-scaffold-tests` | Read plugin code → write business-logic scenarios |

Plus community skills: `/security-auditor` · `/security-scanning-security-sast` · `/vibe-code-auditor` · `/accessibility-compliance-accessibility-audit` · `/web-performance-optimization`.

---

## Auto-scaffolding — Orbit reads your plugin

```bash
bash scripts/scaffold-tests.sh ~/plugins/my-plugin [--deep]
```

Reads every entry point:
`add_menu_page` → `register_rest_route` → `add_shortcode` → `wp_ajax_` → `wp_schedule_event` → `block.json` → `register_post_type`

Outputs:
- `qa.config.json` — prefilled config (40+ fields)
- `qa-scenarios.md` — 40-80 structured scenarios
- Draft Playwright smoke spec
- (with `--deep`) AI-written business-logic scenarios with file:line refs

**Never starts from a blank page again.**

---

## Developer workflow

```bash
# Once — installs deps, validates env
bash scripts/gauntlet-dry-run.sh

# Per release — full gate (45-60 min)
bash scripts/gauntlet.sh --plugin ~/plugins/my-plugin --mode full

# Per commit — pre-commit hook (<10s, auto)
bash scripts/install-pre-commit-hook.sh   # one-time setup
git commit                                 # runs automatically

# PR — self-validation CI
.github/workflows/ci.yml                   # runs on every PR

# Before WP.org submission — release gate only (5 min)
bash scripts/gauntlet.sh --plugin . --mode release
```

---

## What makes Orbit different

| Other tools | Orbit |
|---|---|
| Run one check (linter OR E2E OR security) | Orchestrates 20+ in one command |
| Framework-agnostic, shallow WP coverage | WP-native: `$wpdb`, `dbDelta`, hooks, Gutenberg, HPOS |
| Developer-only outputs | 6-perspective outputs (Dev/QA/PM/PA/Designer/End User) |
| Static analysis only | Static + E2E + performance + AI-augmented review |
| Attack tools (WPScan / Metasploit) | Static **code** review skill — different domain |
| Stale checklist | Evergreen research log, 90-day cadence |
| Blank page when you start | Auto-scaffolder generates 80 scenarios from your code |
| One release | Diffs vs previous git tag for visual regression |

---

## Who Orbit is for

- **Plugin teams** shipping to wordpress.org — pre-tag gate matches WP.org review
- **Agencies** running multi-plugin pipelines — batch + matrix support
- **Product teams** wanting UAT — PM/PA/Designer roles get HTML reports
- **Solo devs** — VISION.md scoped principles + `--dry-run` keeps it approachable

---

## Who Orbit is NOT for

- Penetration-testing live sites (use WPScan, Metasploit)
- Site monitoring (use Jetpack, Site Health)
- Hosted CI-as-a-service (Orbit runs locally + in your CI)
- Learning WordPress — assumes working knowledge

---

## Today's state (April 2026)

**v2.0 — the mature release.** 7 commits today closed every known gap:

- Security: 17 → **22 patterns** (April 2026 supply-chain attack covered)
- Release gate: 3 → **9 checks** (version parity, license, HPOS, WP function compat, PHP 8.x, modern WP)
- Playwright: 6 → **20+ specs** (every UX state, every lifecycle event, every role)
- Custom skills: 0 → **5** (replaced broken community skills with WP-native ones)
- Auto-scaffolder, VISION.md, evergreen security log, GitHub Actions CI all shipped

See [CHANGELOG.md](../CHANGELOG.md) for the full history.

---

## Where to go from here

| If you're… | Start here |
|---|---|
| Running Orbit for the first time | [GETTING-STARTED.md](../GETTING-STARTED.md) |
| Writing tests for a specific plugin | [docs/19-business-logic-guide.md](19-business-logic-guide.md) |
| Understanding what reads your code | [docs/20-auto-test-generation.md](20-auto-test-generation.md) |
| Preparing a release | [docs/18-release-checklist.md](18-release-checklist.md) |
| Evaluating framework principles | [VISION.md](../VISION.md) |
| Tracking security research | [docs/21-evergreen-security.md](21-evergreen-security.md) |
| Adding CI to your plugin | [docs/15-ci-cd.md](15-ci-cd.md) |

---

## The bottom line

Orbit turns a 40-hour manual QA cycle into a 60-minute automated one, while covering perspectives most teams skip entirely. If it passes Orbit's full gate, it passes WP.org review, handles real-world scale, respects user data, works alongside the top 20 plugins, survives a plugin update, and renders correctly in Arabic.

You don't hope the release is good. You know.
