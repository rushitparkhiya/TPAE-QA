# Orbit — Complete Getting Started Guide

> The only QA framework built specifically for WordPress plugins. One command runs security audits, browser tests, performance checks, AI code review, accessibility scans, and database profiling — then writes everything to HTML reports your whole team can open.

---

## Table of Contents

1. [What Orbit Is and Why It Exists](#1-what-orbit-is-and-why-it-exists)
2. [How the Whole System Works](#2-how-the-whole-system-works)
3. [Who Uses What — Role Guide](#3-who-uses-what--role-guide)
4. [Installation — Complete Setup](#4-installation--complete-setup)
5. [Configure Your Plugin](#5-configure-your-plugin)
6. [Start a Test Site](#6-start-a-test-site)
7. [Multi-Plugin Testing](#7-multi-plugin-testing)
8. [The Gauntlet — All 11 Steps Explained](#8-the-gauntlet--all-11-steps-explained)
9. [The 6 AI Skill Audits — Deep Dive](#9-the-6-ai-skill-audits--deep-dive)
10. [All Add-On Skills by Plugin Type](#10-all-add-on-skills-by-plugin-type)
11. [Writing Tests for Your Plugin](#11-writing-tests-for-your-plugin)
12. [Plugin-Type Playbooks](#12-plugin-type-playbooks)
13. [Reading Every Report](#13-reading-every-report)
14. [Pre-Release Checklist](#14-pre-release-checklist)
15. [Real-World Walkthrough](#15-real-world-walkthrough)
16. [Troubleshooting](#16-troubleshooting)
17. [Full Command Reference](#17-full-command-reference)

---

## 1. What Orbit Is and Why It Exists

Orbit is a QA framework purpose-built for WordPress plugins. It combines four layers of automated analysis into a single pipeline:

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR PLUGIN CODE                     │
└─────────────────────────────────────────────────────────┘
           │                │               │
     ┌─────▼──────┐  ┌──────▼──────┐  ┌───▼────────┐
     │  STATIC    │  │  BROWSER    │  │    AI      │
     │  ANALYSIS  │  │  TESTING    │  │  SKILL     │
     │            │  │             │  │  AUDITS    │
     │ PHP lint   │  │ Playwright  │  │ 6 agents   │
     │ PHPCS/WPCS │  │ functional  │  │ in parallel│
     │ PHPStan    │  │ visual diff │  │            │
     │ i18n check │  │ axe-core    │  │ Security   │
     └────────────┘  │ video UAT   │  │ Performance│
                     └─────────────┘  │ Database   │
                                      │ WP Standards│
     ┌──────────────────────────────┐  │ A11y       │
     │       PERFORMANCE            │  │ Code Quality│
     │ Lighthouse · DB profiling    │  └────────────┘
     │ TTFB · asset weight · TTFB   │
     └──────────────────────────────┘
```

All output goes to files — HTML reports, markdown audits, screenshots, videos. Nothing lives only in your terminal.

### The Problem It Solves

WordPress plugin QA is usually ad-hoc. A developer clicks around the admin panel, ships it. The same bugs appear in every plugin:

| Bug | How common | What Orbit catches it with |
|-----|-----------|---------------------------|
| Unescaped output (XSS) | Very common | PHPCS + `/wordpress-penetration-testing` |
| Missing nonce on forms | Common | PHPCS + skill audit |
| REST endpoints without auth | Common | Playwright test + skill audit |
| N+1 query in post loop | Very common | `db-profile.sh` + `/database-optimizer` |
| Assets loading on every page | Very common | Lighthouse TBT + `/performance-engineer` |
| WCAG failures | Nearly universal | axe-core in Playwright + `/accessibility-compliance-accessibility-audit` |
| PHP error on deactivation | Occasional | Playwright activation test |
| No uninstall cleanup | Common | `/wordpress-plugin-development` skill |

### Why wp-env Instead of Local by Flywheel

| Criterion | Local by Flywheel | wp-now | wp-env (Orbit uses this) |
|-----------|------------------|--------|--------------------------|
| Startup time | GUI clicks | 10 seconds | 45 seconds |
| Database | MySQL (real) | SQLite (fake) | MariaDB (real) |
| Scriptable | ❌ | ✅ | ✅ |
| DB profiling | ✅ | ❌ | ✅ |
| Lighthouse accuracy | ✅ | ❌ | ✅ |
| Multi-PHP versions | Manual | ❌ | ✅ one flag |
| Zero-click automation | ❌ | ✅ | ✅ |
| Used by Gutenberg core | ❌ | ❌ | ✅ |

**Bottom line:** Local by Flywheel is great for manual QA. For automated testing, DB profiling, and repeatable CI-ready audits, you need real MariaDB and a real scriptable environment. wp-env is that.

---

## 2. How the Whole System Works

### The Full Pipeline

```
bash scripts/gauntlet.sh --plugin /path/to/your-plugin --mode full
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1   PHP Lint             php -l on every .php file         │
│ STEP 2   PHPCS / WPCS         WordPress coding standards         │
│ STEP 3   PHPStan              Static type analysis               │
│ STEP 4   Asset Weight         JS/CSS bundle size check           │
│ STEP 5   i18n / POT           Translation strings audit          │
│ STEP 6   Playwright           Browser: functional + visual + a11y│
│ STEP 7   Lighthouse           Performance score + Core Web Vitals│
│ STEP 8   DB Profiling         Query count + slow query log       │
│ STEP 9   Competitor Compare   Side-by-side flow screenshots      │
│ STEP 10  UI Performance       TTFB + editor load time            │
│ STEP 11  Skill Audits         6 AI agents running in parallel    │
│          └─ /wordpress-plugin-development  → wp-standards.md     │
│          └─ /wordpress-penetration-testing → security.md         │
│          └─ /performance-engineer          → performance.md       │
│          └─ /database-optimizer            → database.md         │
│          └─ /accessibility-compliance-*    → accessibility.md    │
│          └─ /code-review-excellence        → code-quality.md     │
│             │                                                    │
│             └──► reports/skill-audits/index.html  (HTML report) │
└──────────────────────────────────────────────────────────────────┘
                │
                ▼
         reports/
         ├── qa-report-20240601-143022.md        ← master gauntlet log
         ├── playwright-html/index.html          ← browser test HTML
         ├── skill-audits/index.html             ← 6 skill tabs in one HTML
         ├── skill-audits/security.md            ← raw markdown per skill
         ├── skill-audits/wp-standards.md
         ├── skill-audits/performance.md
         ├── skill-audits/database.md
         ├── skill-audits/accessibility.md
         ├── skill-audits/code-quality.md
         ├── lighthouse/lh-20240601-143022.json
         ├── db-profile-20240601-143022.txt
         ├── screenshots/flows-compare/          ← UAT flow screenshots
         ├── videos/                             ← UAT recordings
         └── uat-report-20240601.html            ← PM-ready HTML with videos
```

### How Authentication Works

Playwright logs in once, saves cookies, reuses them for every test:

```
┌──────────────────────────────────────────────────────┐
│  auth.setup.js (runs first, always)                  │
│                                                      │
│  navigate to /wp-login.php                           │
│  fill #user_login / #user_pass                       │
│  click #wp-submit                                    │
│  wait for /wp-admin/                                 │
│  save cookies → .auth/wp-admin.json                  │
└──────────────────────────────────────────────────────┘
                        │
                        ▼ (injected into all test projects)
┌──────────────────────────────────────────────────────┐
│  chromium project    ← your functional tests         │
│  visual project      ← screenshot regression         │
│  mobile-chrome       ← responsive tests              │
│  elementor-widgets   ← Elementor editor tests        │
│  video project       ← UAT flow recordings           │
└──────────────────────────────────────────────────────┘
```

If any test fails with "redirected to login": `rm .auth/wp-admin.json` then re-run — it recreates automatically.

### How Skill Audits Work

```
STEP 11 launches 6 Claude Code processes simultaneously:

claude "/wordpress-plugin-development  Audit..."  > wp-standards.md  &  PID=1001
claude "/wordpress-penetration-testing Audit..."  > security.md      &  PID=1002
claude "/performance-engineer          Analyze..." > performance.md   &  PID=1003
claude "/database-optimizer            Review..."  > database.md      &  PID=1004
claude "/accessibility-compliance-*    Audit..."   > accessibility.md &  PID=1005
claude "/code-review-excellence        Review..."  > code-quality.md  &  PID=1006
                                                                         │
wait  ──── all 6 finish ────────────────────────────────────────────────┘
                │
                ▼
python3 (inline) reads all 6 .md files
        → generates reports/skill-audits/index.html
           ├── Header: severity totals (Critical/High/Medium/Low)
           ├── Tab 1: WP Standards
           ├── Tab 2: Security
           ├── Tab 3: Performance
           ├── Tab 4: Database
           ├── Tab 5: Accessibility
           └── Tab 6: Code Quality
```

Each skill agent reads your actual PHP source files, understands WordPress patterns, and finds issues that grep and regex never could.

### The AGENTS.md Hard-Lock

`AGENTS.md` in the project root is read automatically by Claude Code at every session start. It hard-codes which 6 skills must always run. This means: even if you just type `claude "audit this plugin"` with no skill mentioned, all 6 mandatory skills fire. No reminders needed.

---

## 3. Who Uses What — Role Guide

### Developer

You're writing PHP and need fast feedback.

**Your daily commands:**

```bash
# Quick smoke: PHP lint + PHPCS + skill audits (no browser, no Lighthouse)
bash scripts/gauntlet.sh --plugin /path/to/plugin --mode quick

# Iterate on tests in UI mode
npx playwright test --ui

# Run just one test by name
WP_TEST_URL=http://localhost:8881 npx playwright test -g "settings page loads"

# Run your specific test suite
WP_TEST_URL=http://localhost:8881 npx playwright test tests/playwright/my-plugin/
```

**What to read in reports:**
- `reports/qa-report-*.md` → Step 1 (PHP errors) and Step 2 (PHPCS errors)
- `reports/skill-audits/index.html` → Security tab → any Critical or High findings
- `reports/playwright-html/index.html` → which tests are failing and why

**Feedback loop:**
```
Write code → gauntlet --mode quick → fix PHPCS/skill errors → commit
```

---

### QA Engineer

You're signing off on releases and finding what developers missed.

**Your pre-release workflow:**

```bash
# 1. Full environment (real DB, real PHP)
bash scripts/create-test-site.sh --plugin /path/to/plugin --mode full

# 2. Full gauntlet — every check, every report
bash scripts/gauntlet.sh --plugin /path/to/plugin --mode full

# 3. Specific browser tests — watch them live
npx playwright test --headed

# 4. View all reports
npx playwright show-report reports/playwright-html
open reports/skill-audits/index.html
open reports/uat-report-*.html

# 5. Compare DB queries vs previous release
TEST_PAGES="/,/shop/,/blog/" bash scripts/db-profile.sh

# 6. Test multiple plugins at once
bash scripts/batch-test.sh --plugins-dir ~/plugins
```

**Decision matrix:**

| What you see | Action |
|-------------|--------|
| 0 Critical, 0 High, 0 Playwright failures | ✅ Clear to ship |
| Any Critical (any skill tab) | 🚫 Block release |
| High in Security tab | 🚫 Block release |
| High in other tabs | 🟡 Fix if possible, else document |
| Medium findings | 🟡 Fix if < 30 min, else log |
| Playwright failures | 🚫 Block unless proven flaky |

---

### Product Manager

You need to know: is it safe to ship? You don't read code.

**Your workflow:** Open reports. Read the severity summary. Make the call.

```bash
# Generate everything (run by QA, then share the folder)
bash scripts/gauntlet.sh --mode full

# You just open these files:
open reports/uat-report-*.html          # videos + screenshots of user flows
open reports/skill-audits/index.html    # severity summary + all findings
open reports/playwright-html/index.html # pass/fail per test
```

**The UAT report** is specifically built for you: browser-video recordings of every user flow, side-by-side with competitor, screenshots at each step. No code. No terminal.

**Severity guide:**

```
🔴 CRITICAL → Block release. Fix immediately.
              Example: SQL injection, unauthenticated data access

🟠 HIGH     → Block release. Fix in this PR.
              Example: XSS, missing nonce, broken checkout flow

🟡 MEDIUM   → Fix if under 30 min. Otherwise log.
              Example: Accessibility warning, slow admin page load

🟢 LOW/INFO → Log in tech debt. Defer.
              Example: Code style, minor optimization suggestion
```

---

### Designer

You check visual output, spacing, responsive behavior, and accessibility.

**Your commands:**

```bash
# Generate snapshots at all viewport sizes
npx playwright test --project=visual

# After an intentional design change, update the baseline
npm run test:visual

# Generate UAT video report — every flow recorded
npm run uat
open reports/uat-report-*.html

# Check accessibility violations
open reports/skill-audits/index.html  # → Accessibility tab
```

**What to look at:**
- `reports/screenshots/` — full-page PNGs at 1440px, 768px, 375px
- UAT report — video of each flow (are transitions smooth, are things loading correctly)
- Accessibility tab in skill audits — WCAG violations with exact element selectors you can inspect

---

## 4. Installation — Complete Setup

### Prerequisites Table

| Tool | Min version | Required for | Install |
|------|------------|-------------|---------|
| Node.js | 18+ | Playwright, wp-env, Lighthouse | [nodejs.org](https://nodejs.org) or `nvm install --lts` |
| PHP | 7.4+ | PHP lint, PHPCS, PHPStan | `brew install php` (Mac) |
| Composer | Any | PHPCS, PHPStan packages | `brew install composer` |
| Docker Desktop | Any | wp-env full mode | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| Python 3 | 3.8+ | Report generation scripts | Usually pre-installed |
| Claude Code CLI | Any | Skill audits (Step 11) | `npm install -g @anthropic-ai/claude-code` |

Docker Desktop is required for `--mode full` (real MariaDB). For quick smoke tests without Docker, use `--mode quick` (SQLite, no DB profiling).

### Clone and Install

```bash
git clone https://github.com/adityaarsharma/orbit.git
cd orbit

# One-command install of all tools
bash setup/install.sh
```

**What `install.sh` does:**

```
Node.js       ← verified / installed via nvm if missing
PHP           ← verified (you install manually if missing)
Composer      ← verified / installed
WP-CLI        ← installed globally
Playwright    ← npm install + browser binaries (Chromium + Firefox)
PHPCS + WPCS  ← composer global require squizlabs/php_codesniffer + WPCS + VIP + PHPCompat
PHPStan       ← composer global require phpstan/phpstan + WP stubs
Lighthouse    ← npm install -g @lhci/cli lighthouse
axe-core CLI  ← npm install -g @axe-core/cli
Local npm deps ← npm install (package.json in this repo)
```

### Install the Antigravity Skill Collection

This is what powers Step 11. The 6 mandatory skills must be installed in Claude Code:

```bash
# Option A: Antigravity CLI (recommended — handles updates)
npx antigravity-awesome-skills

# Option B: Manual clone + symlink
git clone https://github.com/VoltAgent/awesome-agent-skills ~/Claude/awesome-agent-skills
ln -sf ~/Claude/awesome-agent-skills/skills/* ~/.claude/skills/
```

**Verify the 6 required skills are installed:**

```bash
ls ~/.claude/skills/wordpress-plugin-development          # ← must exist
ls ~/.claude/skills/wordpress-penetration-testing         # ← must exist
ls ~/.claude/skills/performance-engineer                  # ← must exist
ls ~/.claude/skills/database-optimizer                    # ← must exist
ls ~/.claude/skills/accessibility-compliance-accessibility-audit  # ← must exist
ls ~/.claude/skills/code-review-excellence                # ← must exist
```

If any are missing, Step 11 skips that agent.

**Add-on skills (optional, for specific plugin types):**

```bash
ls ~/.claude/skills/antigravity-design-expert             # UI-heavy / Elementor
ls ~/.claude/skills/wordpress-theme-development           # Themes / FSE / Gutenberg
ls ~/.claude/skills/wordpress-woocommerce-development     # WooCommerce extensions
ls ~/.claude/skills/api-security-testing                  # REST API / headless
ls ~/.claude/skills/php-pro                               # Complex PHP / OOP
```

### Verify Your Full Setup

```bash
node --version          # v18.0.0+
php --version           # 7.4.0+
composer --version
phpcs --version
phpstan --version
wp --version
npx playwright --version
claude --version
docker --version && docker info | head -3
```

---

## 5. Configure Your Plugin

Every plugin you test gets a `qa.config.json` file. This is gitignored — stays on your machine only.

```bash
cp qa.config.example.json qa.config.json
```

### Full Configuration Reference

```json
{
  "plugin": {
    "name": "My Plugin",
    "slug": "my-plugin",
    "type": "general",
    "path": "/Users/yourname/projects/my-plugin",
    "version": "1.2.0",
    "hasPro": false,
    "proZip": "",
    "textDomain": "my-plugin",
    "requiresAtLeast": "5.8",
    "testedUpTo": "6.9",
    "requiresPHP": "7.4"
  },

  "environment": {
    "testUrl": "http://localhost:8881",
    "wpEnvPort": 8881,
    "adminUser": "admin",
    "adminPass": "password",
    "multisite": false,
    "stagingUrl": "https://staging.yoursite.com"
  },

  "companions": [
    "woocommerce",
    "elementor"
  ],

  "upgrade": {
    "test": true,
    "fromVersion": "1.1.0"
  },

  "competitors": [
    "competitor-plugin-slug"
  ],

  "qaFocus": {
    "priority": "full",
    "testAreas": [
      "activation",
      "admin-panel-load",
      "frontend-output",
      "rest-api-auth"
    ]
  },

  "thresholds": {
    "lighthouse": { "performance": 75, "accessibility": 85 },
    "dbQueriesPerPage": 60,
    "jsBundleKb": 500,
    "cssBundleKb": 200
  }
}
```

### Plugin Type → Skills Matrix

Setting `plugin.type` activates the right test templates and add-on skills:

```
plugin.type           Mandatory 6 Core Skills    Add-on Skills
─────────────────────────────────────────────────────────────────────
general               ✅ all 6                   —
elementor-addon       ✅ all 6                   + /antigravity-design-expert
gutenberg-blocks      ✅ all 6                   + /wordpress-theme-development
woocommerce           ✅ all 6                   + /wordpress-woocommerce-development
rest-api              ✅ all 6                   + /api-security-testing
seo-plugin            ✅ all 6                   + /php-pro
theme                 ✅ all 6                   + /wordpress-theme-development
page-builder          ✅ all 6                   + /antigravity-design-expert
```

### Companions

List WP.org slugs of plugins that must be active during testing. This catches conflicts:

```json
"companions": ["woocommerce", "elementor", "yoast", "rank-math"]
```

The test site creator installs these automatically alongside your plugin.

---

## 6. Start a Test Site

### Quick Mode — No Docker (10 seconds)

```bash
bash scripts/create-test-site.sh --plugin /path/to/my-plugin --mode quick
```

- Uses SQLite (not MySQL)
- Fine for: Playwright tests, skill audits, quick smoke tests
- Not suitable for: DB profiling, Lighthouse benchmarking

### Full Mode — Real WordPress (45 seconds, Docker required)

```bash
# Start Docker Desktop first, then:
bash scripts/create-test-site.sh --plugin /path/to/my-plugin --mode full
```

Creates:
- MariaDB (same as production for most WordPress hosts)
- `WP_DEBUG=true`, `WP_DEBUG_LOG=true`, `SAVEQUERIES=true`, `SCRIPT_DEBUG=true`
- Query Monitor plugin auto-installed for DB profiling
- Your plugin installed as a bind-mount (edit locally, see changes instantly)

Site available at:
- Frontend: `http://localhost:8881`
- Admin: `http://localhost:8881/wp-admin` (`admin` / `password`)
- MySQL CLI: `cd .wp-env-site/default && wp-env run cli wp db cli`

### Auto Mode (Default — Detects Docker)

```bash
bash scripts/create-test-site.sh --plugin /path/to/my-plugin
```

Uses full mode if Docker is running, quick mode if not.

### Daily Site Management

```bash
# From the .wp-env-site/default/ directory:
wp-env stop           # pause the containers (frees RAM)
wp-env start          # resume
wp-env clean all      # reset DB to fresh WordPress install
wp-env destroy        # delete everything and start fresh

# Run WP-CLI inside the environment
wp-env run cli wp plugin list
wp-env run cli wp option get siteurl
wp-env run cli wp user list
wp-env run cli wp post create --post_title="Test Page" --post_status=publish
```

### Install Companion Plugins After Site Start

```bash
cd .wp-env-site/default

# Install from WP.org
wp-env run cli wp plugin install woocommerce --activate
wp-env run cli wp plugin install elementor --activate
wp-env run cli wp plugin install query-monitor --activate

# Install from local zip
wp-env run cli wp plugin install /path/to/companion.zip --activate
```

---

## 7. Multi-Plugin Testing

Testing a product suite — multiple plugins at once — is a first-class Orbit workflow.

### Batch Testing — All Plugins in a Folder

```bash
# Test every plugin in a directory
bash scripts/batch-test.sh --plugins-dir ~/code/my-company/plugins

# Test a specific list
bash scripts/batch-test.sh --plugins "plugin-a,plugin-b,plugin-c"

# Control parallelism (default: half your CPU cores, max 4)
bash scripts/batch-test.sh --plugins-dir ~/plugins --concurrency 3
```

**How it works:**

```
batch-test.sh
    │
    ├── Plugin A → port 8881 → spin up wp-env → gauntlet → reports/plugin-a/ → stop
    ├── Plugin B → port 8891 → spin up wp-env → gauntlet → reports/plugin-b/ → stop
    └── Plugin C → port 8901 → spin up wp-env → gauntlet → reports/plugin-c/ → stop
                                                                    │
                                                                    ▼
                                                        reports/batch-TIMESTAMP.md
                                                        (aggregated grid: pass/warn/fail per plugin)
```

Each plugin gets its own isolated wp-env on a unique port. Sites run in parallel up to the concurrency cap, then clean up after themselves.

**Batch report format:**

```
# Batch QA Report — 2024-06-01 14:30

| Plugin         | PHP Lint | PHPCS | Playwright | Lighthouse | DB  | Skills | Overall |
|----------------|----------|-------|------------|------------|-----|--------|---------|
| my-seo         | ✓        | ✓     | ✓ 24/24    | 83         | 31q | 2 HIGH | ⚠ WARN |
| my-blocks      | ✓        | ✗ 2e  | ✓ 18/18    | 77         | 18q | 0      | ✗ FAIL |
| my-forms       | ✓        | ✓     | ✓ 31/31    | 91         | 22q | 1 MED  | ✓ PASS |
```

### Testing a Plugin Across Multiple PHP Versions

```bash
# Test same plugin on PHP 7.4, 8.0, 8.1, 8.2 simultaneously
for PHP_VER in 7.4 8.0 8.1 8.2; do
  mkdir -p ".wp-env-site/php-${PHP_VER}"
  cd ".wp-env-site/php-${PHP_VER}"

  cat > .wp-env.json << EOF
{
  "core": null,
  "phpVersion": "${PHP_VER}",
  "plugins": ["/path/to/my-plugin"],
  "port": $((8880 + ${PHP_VER/./}))
}
EOF

  wp-env start &
  cd ../..
done

wait
echo "All 4 PHP environments running"

# Run gauntlet against each
for PHP_VER in 7.4 8.0 8.1 8.2; do
  PORT=$((8880 + ${PHP_VER/./}))
  WP_TEST_URL=http://localhost:$PORT bash scripts/gauntlet.sh \
    --plugin /path/to/my-plugin \
    --mode full 2>&1 | tee reports/php-${PHP_VER}.md &
done
wait
```

### Testing with Companion Plugins Active (Conflict Testing)

```bash
# Add companions to qa.config.json:
"companions": ["woocommerce", "elementor", "yoast", "acf"]

# Start the site — companions auto-install
bash scripts/create-test-site.sh --mode full

# Run just the activation/deactivation test suite
WP_TEST_URL=http://localhost:8881 npx playwright test -g "activate"
WP_TEST_URL=http://localhost:8881 npx playwright test -g "conflict"
```

### Pulling Competitor Zips for Comparison

```bash
# Reads "competitors" from qa.config.json → downloads from WP.org
bash scripts/pull-plugins.sh
# → plugins/free/rank-math/rank-math-4.0.2.zip
# → plugins/free/yoast-seo/yoast-seo-22.5.zip

# Drop Pro zips manually
cp ~/Downloads/competitor-pro-1.2.zip plugins/pro/
```

---

## 8. The Gauntlet — All 11 Steps Explained

```bash
# Standard run (reads qa.config.json for plugin path)
bash scripts/gauntlet.sh --mode full

# Explicit path
bash scripts/gauntlet.sh --plugin /path/to/my-plugin --mode full

# Quick (skip Lighthouse + DB profiling)
bash scripts/gauntlet.sh --plugin /path/to/my-plugin --mode quick
```

---

### Step 1 — PHP Lint

**Tool:** `php -l` on every `.php` file  
**Excludes:** vendor/, node_modules/, build/, dist/, tests/

**What it catches:**
```
Parse errors        → syntax error, unexpected token "}" on line 147
Unclosed brackets   → fatal on any page load
Typos in keywords   → "functoin" instead of "function"
Bad string literals → unterminated heredoc
```

**Example failure:**
```
❌ PHP lint — ERRORS FOUND:
Parse error: syntax error, unexpected token "}" in
includes/class-settings.php on line 147
```

**How to fix:** Open the file at that line. Usually a missing semicolon or unmatched brace 10–20 lines above the reported line.

**Pass condition:** Zero syntax errors across all PHP files.

---

### Step 2 — WordPress Coding Standards (PHPCS)

**Tool:** PHP_CodeSniffer with `config/phpcs.xml`  
**Standards applied:** WordPress, WordPress-VIP-Minimum, PHPCompatibilityWP

**Security rules (never excluded):**

| Rule | What it flags |
|------|--------------|
| `WordPress.Security.EscapeOutput` | `echo $value` without `esc_html()`, `esc_attr()`, `wp_kses_post()` |
| `WordPress.Security.NonceVerification` | `$_POST` access without `check_admin_referer()` |
| `WordPress.DB.PreparedSQL` | SQL string concatenation without `$wpdb->prepare()` |
| `WordPress.WP.Capabilities` | Missing `current_user_can()` before privileged actions |

**Performance rules:**

| Rule | What it flags |
|------|--------------|
| `WordPress.WP.EnqueuedResourceParameters` | Assets without version parameter |
| `WordPress.DB.SlowDBQuery` | `meta_query` / `tax_query` without `compare` parameter |

**Example output:**
```
❌ PHPCS — 3 errors, 12 warnings

ERROR | WordPress.Security.EscapeOutput
  includes/admin/class-admin-ui.php:89 | echo $_GET['tab'];

ERROR | WordPress.Security.NonceVerification
  includes/admin/class-settings.php:134 | if (isset($_POST['submit']))

WARNING | WordPress.DB.SlowDBQuery
  includes/class-query.php:67 | 'meta_query' used without optimization
```

**Pass condition:** Zero ERRORS. Warnings under 10 pass with a `⚠ WARN` flag.

---

### Step 3 — PHPStan Static Analysis

**Tool:** PHPStan at level 5 with WordPress stubs

**What it catches:**
```
Method called on null         → get_post() returns WP_Post|null — you called ->ID on null
Wrong argument types          → wp_schedule_event($non-integer, ...)
Undefined variables           → $settings used before assignment
Inconsistent return types     → says returns array, sometimes returns false
```

**Example finding:**
```
⚠ PHPStan — issues found

includes/class-admin.php:89
  Cannot call method get_ID() on WP_Post|null.
  Add null check: if ($post instanceof WP_Post) { ... }

includes/class-data-processor.php:203
  Method get_cached_data() should return array but return statement
  is missing. Add: return []; as a fallback.
```

---

### Step 4 — Asset Weight Audit

**Tool:** `wc -c` on all JS/CSS files

Counts total bytes of all `.js` and `.css` files in your plugin (excluding minified files and node_modules). Informational — warns if you exceed thresholds in `qa.config.json`.

```
✓ JS total: 0.24MB | CSS total: 187KB
```

If this looks high, Lighthouse (Step 7) shows you the real-world impact on page performance. The `/performance-engineer` skill tells you which specific file and which hook is loading it unnecessarily.

---

### Step 5 — i18n / POT File

**Tool:** `wp i18n make-pot` + grep for untranslated echo strings

**What it catches:**
- Raw `echo "English string"` calls not wrapped in `__()` or `esc_html__()`
- Text domain mismatch between plugin header and translation calls
- Missing POT file (required for .org submission)

```
✓ POT generated — 247 translatable strings
⚠ 14 possibly untranslated echo strings — review
```

**Fix:**
```php
// Before
echo "Save Settings";
echo '<button>' . $label . '</button>';

// After
echo esc_html__( 'Save Settings', 'my-plugin' );
echo '<button>' . esc_html( $label ) . '</button>';
```

---

### Step 6 — Playwright Functional + Visual + Accessibility Tests

**Tool:** Playwright with 5 test projects  
**Auth:** Reuses `.auth/wp-admin.json` (created by `setup` project on first run)

**Test projects:**

| Project | What it runs | When |
|---------|-------------|------|
| `setup` | auth.setup.js — logs in once, saves cookies | Before all others |
| `chromium` | All `.spec.js` files — functional tests | Every run |
| `visual` | `tests/playwright/visual/*.spec.js` — screenshot diffs | Every run |
| `elementor-widgets` | `tests/playwright/elementor/*.spec.js` | If file exists |
| `mobile-chrome` | `responsive.spec.js` at 375×812 | If file exists |
| `video` | `tests/playwright/flows/*.spec.js` with video recording | `npm run uat` |

**Reports generated:**
- `reports/playwright-html/index.html` — HTML report with screenshots + traces on failure
- `reports/playwright-results.json` — machine-readable for CI

**View the HTML report:**
```bash
npx playwright show-report reports/playwright-html
```

**What the HTML report shows:**
```
Each test:
├── ✅ Pass / ❌ Fail / ⚠️ Flaky label
├── Duration
├── Screenshot (auto-captured on failure)
├── Console logs during the test
├── Network requests (for checking 404s)
└── Trace link → click to open time-travel debugger
```

**Step 6b — Flow recordings** (if `tests/playwright/flows/*.spec.js` exist):

Runs all flow specs with video. Each test in flows/ gets a full `.webm` recording. Then a UAT HTML report is generated at `reports/uat-report-TIMESTAMP.html`.

---

### Step 7 — Lighthouse Performance

**Tool:** Google Lighthouse CLI

```bash
# Standalone
lighthouse http://localhost:8881 --output=json --output-path=reports/lighthouse/lh-manual.json
```

**Metrics checked:**

| Metric | What it measures | Your plugin's impact |
|--------|-----------------|---------------------|
| Performance score | Overall (0–100) | JS/CSS loading overhead |
| FCP (First Contentful Paint) | When first text/image appears | Render-blocking resources |
| LCP (Largest Contentful Paint) | When main content appears | Image size, server speed |
| TBT (Total Blocking Time) | JS blocking the main thread | Large synchronous JS |
| CLS (Cumulative Layout Shift) | Layout jumps | Async image/content loads |

**Example output:**
```
✓ Lighthouse performance: 83/100
```

or

```
⚠ Lighthouse performance: 61/100 (target: 80+)
```

A score under 80 almost always means undeferred JS, render-blocking CSS, or a synchronous external API call in your plugin.

---

### Step 8 — Database Profiling

**Tool:** `db-profile.sh` + WordPress `SAVEQUERIES` + MySQL `performance_schema`

```bash
# Standalone with custom pages
TEST_PAGES="/,/shop/,/blog/,/wp-admin/admin.php?page=my-plugin" bash scripts/db-profile.sh
```

**Report format:**
```
Page,Query Count,Load Time (ms),Notes
/,23,184,
/shop/,87,612,⚠ HIGH queries ⚠ SLOW load
/blog/,41,290,
/wp-admin/admin.php?page=my-plugin,31,210,
```

**Thresholds:**
- Query count > 60 per page → `⚠ HIGH queries`
- Load time > 500ms → `⚠ SLOW load`

**Also captures top 10 slowest queries from MySQL:**
```
SQL_TEXT                    | EXEC_COUNT | TOTAL_LATENCY
SELECT * FROM wp_postmeta   | 847        | 4.23s
WHERE meta_key = '_price'
```

This tells you which exact query is running the most and costing the most time.

---

### Step 9 — Competitor Comparison

**Tool:** `compare-versions.sh` + Playwright flow specs in `tests/playwright/flows/`

If `competitors` is defined in `qa.config.json`, this step runs side-by-side comparison flows. Screenshots are saved with the `pair-NN-slug-a/b.png` naming convention so the report generator pairs them correctly.

**Skip if:** No competitors configured.

---

### Step 10 — UI / Frontend Performance

**Tool:** `curl` for TTFB + frontend load; `editor-perf.sh` for Elementor/Gutenberg

```
✓ Frontend: total 312ms | TTFB 89ms
```

For Elementor and Gutenberg plugins, also measures editor load time (how long until the editor is interactive). Saved to `reports/editor-perf-*.json`.

TTFB above 200ms on a local site suggests: synchronous work on `init`, autoloaded bloat, or a blocking DB query on first load.

---

### Step 11 — Claude Skill Audits (6 Parallel AI Agents)

The deepest layer. 3–6 minutes. 6 agents read your actual PHP source files simultaneously.

**After all 6 finish:**

```
reports/skill-audits/
├── wp-standards.md
├── security.md
├── performance.md
├── database.md
├── accessibility.md
├── code-quality.md
└── index.html          ← consolidated tabbed HTML report
```

Open the HTML:
```bash
open reports/skill-audits/index.html
```

See full detail on what each skill finds in [Section 9](#9-the-6-ai-skill-audits--deep-dive) below.

---

### Gauntlet Final Output

```
=================================
Results: 9 passed | 2 warnings | 0 failed

Reports generated:
  MD report:      reports/qa-report-20240601-143022.md
  Playwright:     reports/playwright-html/index.html
  Skill audits:   reports/skill-audits/index.html
  Screenshots:    reports/screenshots/
  Videos:         reports/videos/

View Playwright:   npx playwright show-report reports/playwright-html
View skill audits: open reports/skill-audits/index.html

⚠ GAUNTLET PASSED WITH WARNINGS — review before release
```

**Exit codes:**
- `0` = Passed (with or without warnings) → can release
- `1` = Failed → do not release

---

## 9. The 6 AI Skill Audits — Deep Dive

Each skill is a specialized Claude Code agent. It reads your plugin source, understands WordPress internals, and writes a full markdown report with a severity table at the top.

```
Severity table (always at top of each report):

| Critical | High | Medium | Low |
|---------|------|--------|-----|
| 0       | 2    | 7      | 12  |
```

---

### Skill 1: WordPress Plugin Development (`/wordpress-plugin-development`)

**Focus:** WordPress-specific coding patterns, hook conventions, API usage

**What it reviews:**

```
Naming conventions
└── Functions/classes without plugin prefix → global namespace collision risk
└── Options keys without prefix → can overwrite other plugins' data

Plugin structure
└── Direct file access not blocked (ABSPATH check missing)
└── Plugin header missing or incomplete → breaks auto-updates
└── Text domain doesn't match folder slug → .org review rejection

Hooks and APIs
└── Wrong hook for registering post types (should be 'init', not 'plugins_loaded')
└── Elementor widgets registered on 'init' instead of 'elementor/widgets/register'
└── Using deprecated functions: get_currentuserinfo(), wp_cache_flush() patterns
└── Registering admin pages on wrong capability checks

i18n
└── Strings not wrapped in __() or esc_html__()
└── Dynamic strings concatenated instead of using sprintf() with translation
└── Missing text domain on translation calls

Cleanup
└── No uninstall.php → options/tables remain after plugin deletion
└── Custom DB tables not removed on uninstall
└── Transients not cleared on deactivation
```

**Example finding:**
```
### HIGH — Unprefixed global function: get_settings()
File: includes/functions.php, Line: 23

get_settings() has no plugin prefix. If another plugin or WordPress core
defines the same function name, activation causes a fatal error.

Fix: rename to myplugin_get_settings() and update all callsites.
Also apply prefixes to: save_settings(), load_config(), handle_ajax()
```

---

### Skill 2: WordPress Penetration Testing (`/wordpress-penetration-testing`)

**Focus:** OWASP Top 10 as applied to WordPress. Critical and High findings here always block release.

**Vulnerability matrix:**

| Vulnerability | What it looks for | Common location |
|--------------|------------------|-----------------|
| **XSS** | Output without `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()` | Admin templates, widget output, REST responses |
| **CSRF** | Forms/AJAX without `check_admin_referer()` / `check_ajax_referer()` | Settings save handlers, any `$_POST` processor |
| **SQLi** | `$wpdb->query()` with string concat, no `$wpdb->prepare()` | Custom queries, search/filter features |
| **Auth bypass** | REST endpoints without `permission_callback`, admin pages without `current_user_can()` | REST routes, admin menus |
| **IDOR** | Post/user data fetched without ownership check | REST GET endpoints, AJAX data fetchers |
| **Path traversal** | File operations with user-supplied path | File managers, import features, template loaders |
| **Open redirect** | `wp_redirect()` with unvalidated `$_GET['redirect_to']` | Login flows, action confirmations |
| **Privilege escalation** | Role changes without strict capability check | User management features |

**Example finding (Critical):**
```
### CRITICAL — SQL Injection via unfiltered GET parameter
File: includes/class-data.php, Line: 94

$wpdb->get_results(
    "SELECT * FROM $wpdb->postmeta WHERE meta_key = '" . $_GET['key'] . "'"
);

An attacker passes ' OR '1'='1 as key and reads any post meta from the DB.
This is remotely exploitable with no authentication.

Fix:
$wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM $wpdb->postmeta WHERE meta_key = %s",
        sanitize_key( $_GET['key'] )
    )
);

CVSS: 9.1 (Critical) — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
```

**Example finding (High):**
```
### HIGH — Unauthenticated REST endpoint exposes private data
File: includes/rest-api/class-endpoint.php, Line: 34

register_rest_route( 'my-plugin/v1', '/settings', [
    'methods'  => 'GET',
    'callback' => 'my_plugin_get_settings',
    // permission_callback missing → defaults to __return_true
] );

Any unauthenticated HTTP request can read plugin settings including
any API keys or credentials stored there.

Fix:
'permission_callback' => function() {
    return current_user_can( 'manage_options' );
},
```

---

### Skill 3: Performance Engineer (`/performance-engineer`)

**Focus:** Hook callbacks, asset loading, blocking operations, memory usage

**What it reviews:**

```
Hook performance
└── Expensive operations in 'init', 'wp_head', 'get_header' (fire on every request)
└── DB queries inside 'the_content' filter (fires per post in loops)
└── Complex regex in 'wp_nav_menu_items' (fires on every menu render)

Asset loading
└── CSS/JS enqueued on all pages without conditional check
└── Large libraries loaded when only a small function is needed
└── Missing 'in_footer' => true for non-critical scripts

External HTTP
└── wp_remote_get() / wp_remote_post() called synchronously
└── No timeout parameter set (defaults to 5s, blocks page render)
└── API calls not wrapped in transient cache

Memory patterns
└── get_posts(['numberposts' => -1]) loading thousands of posts into memory
└── Fetching entire post objects when only IDs are needed
└── WP_Query without 'fields' => 'ids' when you only need IDs
```

**Example finding:**
```
### HIGH — Synchronous external HTTP call on every page load
File: includes/class-license.php, Line: 56

add_action('init', function() {
    $response = wp_remote_get('https://api.example.com/license/verify');
    ...
});

Fires on every page load including frontend, admin, REST, and cron.
If the external API is slow or down, every single page blocks.

Fix: Cache with a transient. Only re-verify when transient expires.

function myplugin_get_license_status() {
    $cached = get_transient( 'myplugin_license_status' );
    if ( false !== $cached ) return $cached;

    $response = wp_remote_get( 'https://api.example.com/verify', [
        'timeout' => 5,
    ] );

    if ( is_wp_error( $response ) ) return 'unknown';

    $status = wp_remote_retrieve_body( $response );
    set_transient( 'myplugin_license_status', $status, 12 * HOUR_IN_SECONDS );
    return $status;
}
```

---

### Skill 4: Database Optimizer (`/database-optimizer`)

**Focus:** Query patterns, indexes, autoload, schema design

**What it reviews:**

```
Query patterns
└── get_post_meta() inside loops without pre-warming cache (N+1)
└── WP_Query in loops (nested queries)
└── SELECT * when only specific columns needed
└── No LIMIT clause on potentially large result sets

Raw SQL
└── $wpdb->query() / get_results() without $wpdb->prepare()
└── LIKE clause without $wpdb->esc_like() for user-supplied values
└── Custom queries that bypass WordPress caching layer

Table design
└── Custom table creation without dbDelta() (not upgrade-safe)
└── Missing indexes on columns used in WHERE clauses
└── Text columns used where VARCHAR is sufficient
└── Storing serialized PHP in TEXT columns instead of JSON

Options and autoload
└── Large data stored with autoload=yes (default)
└── Logs, caches, or frequently-updated data with autoload=yes
└── Options that grow unbounded (log tables in wp_options)
```

**Example finding:**
```
### HIGH — N+1 Query Pattern: 200 products = 600 DB queries
File: includes/class-catalog.php, Lines: 78–93

$products = get_posts(['post_type' => 'product', 'numberposts' => -1]);
foreach ($products as $product) {
    $price   = get_post_meta($product->ID, '_price', true);
    $sku     = get_post_meta($product->ID, '_sku', true);
    $gallery = get_post_meta($product->ID, '_gallery', true);
}

For 200 products: 600 individual meta queries.
At ~100μs each: 60ms of pure DB overhead before any rendering.

Fix: Pre-warm the cache with a single query before the loop.

$products  = get_posts(['post_type' => 'product', 'numberposts' => -1]);
$post_ids  = wp_list_pluck($products, 'ID');
update_postmeta_cache($post_ids); // 1 query loads all meta into cache

foreach ($products as $product) {
    $price = get_post_meta($product->ID, '_price', true); // cache hit: 0 queries
    $sku   = get_post_meta($product->ID, '_sku', true);   // cache hit: 0 queries
}
```

---

### Skill 5: Accessibility Compliance (`/accessibility-compliance-accessibility-audit`)

**Standard:** WCAG 2.2 Level AA  
**Focus:** Admin UI, frontend output, block editor output, keyboard navigation

**What it reviews:**

```
Keyboard navigation
└── Buttons or links not reachable via Tab key
└── Custom interactive elements (divs, spans) without tabindex and keyboard handler
└── Focus not managed on modal open/close
└── Focus not visible (outline: none without replacement)

Labels and names
└── Form inputs without associated <label>
└── Buttons with only icon (no aria-label or visible text)
└── Images without alt attribute
└── Decorative images without alt="" (screen readers announce filename)

ARIA usage
└── role="button" on div without tabindex="0" and keyboard event
└── aria-expanded not toggled when accordion opens
└── aria-hidden used incorrectly (hides visible content from screen readers)
└── ARIA live regions missing for dynamic content updates

Color contrast
└── Text below 4.5:1 contrast ratio (WCAG AA for normal text)
└── Interactive elements below 3:1 contrast ratio
└── Placeholder text below 4.5:1 (often fails — placeholders are gray)

Structure
└── Skipped heading levels (h1 → h3, no h2)
└── Tables without headers (no <th> with scope)
└── Links with generic text ("click here", "read more" — not unique in context)
```

**Example finding:**
```
### HIGH — Icon buttons with no accessible label
File: admin/templates/settings-page.php, Lines: 45–52

<button class="myplugin-delete-btn">
    <svg><!-- trash icon SVG --></svg>
</button>

Screen readers announce: "button" with no action description.
Keyboard-only users can Tab to it but cannot know what it does.

Fix:
<button
    class="myplugin-delete-btn"
    aria-label="<?php esc_attr_e( 'Delete item', 'my-plugin' ); ?>"
>
    <svg aria-hidden="true" focusable="false"><!-- trash icon --></svg>
</button>

WCAG 2.2: 4.1.2 Name, Role, Value (Level A)
```

---

### Skill 6: Code Review Excellence (`/code-review-excellence`)

**Focus:** Engineering quality — complexity, error handling, maintainability, PHP 8.x

**What it reviews:**

```
Complexity
└── Functions with cyclomatic complexity > 10
└── Methods longer than 100 lines
└── Nesting depth > 4 levels (callback inside if inside foreach inside filter)
└── Long parameter lists (> 5 params → use $args array)

Error handling
└── wp_remote_get() result not checked for WP_Error
└── json_decode() result not checked for null
└── file_get_contents() without @ operator or existence check
└── Database operations not checked for false return

Dead code
└── Functions defined but never called
└── Commented-out code blocks (should be deleted, not commented)
└── Variables assigned but never used
└── Imports of classes that don't exist

PHP 8.x compatibility
└── ${var} string interpolation (deprecated in 8.2)
└── Implicit nullable parameters (function foo(string $x = null))
└── Dynamic properties without #[AllowDynamicProperties] attribute
└── Passing null to non-nullable parameters

Code clarity
└── Magic numbers (what does 86400 mean? use DAY_IN_SECONDS)
└── Magic strings (repeated 'my_plugin_option' — use a constant)
└── Boolean parameter anti-pattern (load_assets(true) — what does true mean?)
```

**Example finding:**
```
### MEDIUM — WP_Error not handled after remote request
File: includes/class-api.php, Line: 67

$response = wp_remote_get( $url );
$body     = wp_remote_retrieve_body( $response );
$data     = json_decode( $body, true );
return $data['items'];

If the request fails: wp_remote_get() returns WP_Error.
wp_remote_retrieve_body(WP_Error) → empty string.
json_decode('') → null.
$data['items'] → PHP fatal: Cannot use null as array.

Fix:
$response = wp_remote_get( $url, [ 'timeout' => 10 ] );

if ( is_wp_error( $response ) ) {
    error_log( 'myplugin: API failed: ' . $response->get_error_message() );
    return [];
}

$body = wp_remote_retrieve_body( $response );
$data = json_decode( $body, true );

if ( ! is_array( $data ) || ! isset( $data['items'] ) ) {
    error_log( 'myplugin: unexpected response: ' . substr( $body, 0, 200 ) );
    return [];
}

return $data['items'];
```

---

## 10. All Add-On Skills by Plugin Type

Beyond the 6 mandatory core skills, add these based on what your plugin does:

### `/antigravity-design-expert` — For UI-Heavy Plugins and Elementor Addons

**When to use:** Any plugin with custom admin UI, Elementor widgets, or custom post type editors.

**What it adds beyond the 6 core:**
```
Interaction design
└── Minimum touch target size: 44×44px (mobile WCAG requirement)
└── Hit area extends beyond visible element? (common with small icons)
└── Adequate spacing between interactive elements (prevent mis-taps)

Motion and animation
└── GSAP animation quality and performance
└── Respects prefers-reduced-motion media query
└── Animation duration appropriate (not too fast, not too slow)
└── Layout shift during animation

Visual consistency
└── Spacing scale follows a rhythm (4px/8px/16px/24px pattern)
└── Font sizes proportional and readable
└── Color usage consistent with plugin's design system
└── Border radius consistent (not 4px in some places, 8px in others)
└── Shadow usage consistent and proportional
```

**How to invoke:**
```bash
claude "/antigravity-design-expert Review the admin UI at /path/to/my-plugin/admin/
Check: 44px hit areas, spacing rhythm, motion quality, visual consistency.
Rate each finding Critical / High / Medium / Low. Output markdown."
```

---

### `/wordpress-theme-development` — For Themes, FSE, and Block Plugins

**When to use:** Themes, Full Site Editing (FSE) plugins, Gutenberg block collections.

**What it adds:**
```
Template hierarchy
└── Template files in correct locations (templates/ for block themes)
└── theme.json properly structured
└── Block templates follow FSE conventions
└── theme.json tokens referenced correctly in blocks

FSE / Full Site Editing
└── block.json apiVersion is current (3 as of WP 6.3)
└── Block supports declared correctly (color, typography, spacing)
└── Template parts registered in block.json
└── Editor styles properly enqueued

Customizer / Settings
└── Customizer controls use sanitization callbacks
└── Selective refresh implemented for preview
└── Settings registered with correct type and capability
```

---

### `/wordpress-woocommerce-development` — For WooCommerce Extensions

**When to use:** Any plugin that extends WooCommerce: payment gateways, shipping methods, product add-ons, checkout fields.

**What it adds:**
```
WooCommerce hooks
└── Correct hooks used (not WordPress core hooks for WC data)
└── woocommerce_loaded vs woocommerce_init vs woocommerce_after_checkout_form
└── Payment gateway hooks properly implemented

Template overrides
└── Template files in /woocommerce/ subfolder
└── wc_get_template() used instead of include
└── Version comments in template overrides (shows stale templates)

Gateway security
└── Payment data not stored in plain text
└── Gateway response validation before order completion
└── Webhook signature verification before processing
└── SSL enforcement for gateway endpoints

Cart and checkout safety
└── add_to_cart actions have nonce and capability checks
└── Order status changes validated and logged
└── Refund handlers check permissions
```

---

### `/api-security-testing` — For REST API and Headless Plugins

**When to use:** Plugins that register custom REST routes, provide headless endpoints, or expose data via API.

**What it adds:**
```
Endpoint security
└── Every route has permission_callback (not __return_true)
└── Route parameters sanitized with sanitize_text_field / absint / etc.
└── Rate limiting considerations flagged
└── CORS headers appropriate (not Access-Control-Allow-Origin: *)

Input validation
└── JSON body parsed with json_decode and validated
└── Required fields checked before processing
└── Data types validated (int vs string vs bool)
└── Array inputs have depth limits

Authentication patterns
└── Application passwords usage reviewed
└── JWT implementation reviewed if present
└── OAuth patterns checked for security
└── Cookie-based auth for browser requests uses nonce
```

---

### `/php-pro` — For Complex PHP Plugins

**When to use:** Plugins with significant OOP architecture, interfaces, traits, or heavy PHP logic.

**What it adds:**
```
PHP 8.x patterns
└── Typed properties used where possible
└── Named arguments used for clarity in complex function calls
└── match() expression used where switch() is verbose
└── Nullsafe operator (?->) used to avoid null checks

SOLID principles
└── Single responsibility: one class does one thing
└── Open/closed: extension without modification
└── Dependency injection vs static method calls
└── Interface segregation: small focused interfaces

Modern PHP
└── Constructor property promotion (PHP 8.0+)
└── Fibers usage reviewed if present (PHP 8.1+)
└── Enums used for fixed sets of values (PHP 8.1+)
└── First class callables (...) used where appropriate
```

---

### Running Add-On Skills

Add-on skills run the same way as core skills — but you invoke them manually or add them to AGENTS.md for your specific plugin type:

```bash
# Run a single add-on skill
claude "/antigravity-design-expert
Review the admin UI of the WordPress plugin at: /path/to/my-plugin/admin/
Check: 44px touch targets, spacing rhythm, animation quality, visual polish.
Rate each finding Critical / High / Medium / Low.
Output a full markdown report to: reports/skill-audits/design.md" \
> reports/skill-audits/design.md

# Run all 6 core + 1 add-on in parallel
P=/path/to/my-plugin
SKILL_DIR="reports/skill-audits"
mkdir -p $SKILL_DIR

claude "/wordpress-plugin-development Audit $P — WP standards. Output markdown." > $SKILL_DIR/wp-standards.md &
claude "/wordpress-penetration-testing Security audit $P — OWASP Top 10. Output markdown." > $SKILL_DIR/security.md &
claude "/performance-engineer Analyze $P — hooks, N+1, assets. Output markdown." > $SKILL_DIR/performance.md &
claude "/database-optimizer Review $P — queries, indexes, autoload. Output markdown." > $SKILL_DIR/database.md &
claude "/accessibility-compliance-accessibility-audit Audit $P admin UI + frontend. Output markdown." > $SKILL_DIR/accessibility.md &
claude "/code-review-excellence Review $P — quality, complexity, patterns. Output markdown." > $SKILL_DIR/code-quality.md &
claude "/antigravity-design-expert Review $P/admin/ UI — 44px, spacing, motion. Output markdown." > $SKILL_DIR/design.md &
wait
echo "All 7 audits complete"
```

---

## 11. Writing Tests for Your Plugin

### Step 1 — Copy the Right Template

```bash
# Pick the template closest to your plugin type
cp -r tests/playwright/templates/generic-plugin     tests/playwright/my-plugin
cp -r tests/playwright/templates/elementor-addon    tests/playwright/my-plugin
cp -r tests/playwright/templates/gutenberg-block    tests/playwright/my-plugin
cp -r tests/playwright/templates/seo-plugin         tests/playwright/my-plugin
cp -r tests/playwright/templates/woocommerce        tests/playwright/my-plugin
cp -r tests/playwright/templates/theme              tests/playwright/my-plugin
```

### Step 2 — Run Discovery to Get Exact URLs

Before writing any assertion, discover what URLs your plugin actually uses:

```js
const { discoverNavLinks, gotoAdmin } = require('../../helpers');

test('discovery — print all admin nav links', async ({ page }) => {
  await gotoAdmin(page, 'my-plugin-admin-slug');
  const links = await discoverNavLinks(page);
  console.log(JSON.stringify(links, null, 2));
});
```

```bash
WP_TEST_URL=http://localhost:8881 npx playwright test -g "discovery" --headed
```

Output:
```json
[
  { "text": "Dashboard",    "href": "admin.php?page=my-plugin" },
  { "text": "Settings",     "href": "admin.php?page=my-plugin-settings" },
  { "text": "Integrations", "href": "admin.php?page=my-plugin#/integrations" },
  { "text": "Import/Export","href": "admin.php?page=my-plugin&tab=import" }
]
```

Use these exact `href` values in your tests. Never guess.

### Step 3 — Write Tests in UI Mode (Best DX)

```bash
npx playwright test --ui
```

A GUI opens. Click your test. Edit the spec file. Save. It auto-reruns. Iterate until green.

### Step 4 — Essential Test Patterns

#### Admin page loads without PHP errors

```js
test('settings page loads without PHP errors', async ({ page }) => {
  const phpErrors = [];
  page.on('console', msg => {
    if (/PHP (Warning|Notice|Fatal|Parse error)/.test(msg.text())) {
      phpErrors.push(msg.text());
    }
  });

  await page.goto('/wp-admin/admin.php?page=my-plugin');
  await page.waitForLoadState('networkidle');

  expect(phpErrors, `PHP errors:\n${phpErrors.join('\n')}`).toHaveLength(0);
});
```

#### Setting saves and persists

```js
test('setting saves and persists after reload', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=my-plugin-settings');

  await page.fill('input[name="mp_api_key"]', 'test-key-abc123');
  await page.click('button:has-text("Save Changes")');

  await expect(page.locator('.notice-success')).toBeVisible();

  await page.reload();
  await expect(page.locator('input[name="mp_api_key"]')).toHaveValue('test-key-abc123');
});
```

#### Plugin activates and deactivates cleanly

```js
test('plugin deactivates and reactivates cleanly', async ({ page }) => {
  await page.goto('/wp-admin/plugins.php');

  await page.locator(`tr[data-slug="my-plugin"] a:has-text("Deactivate")`).click();
  await page.waitForLoadState('networkidle');

  const deactivateBody = await page.evaluate(() => document.body.innerText);
  expect(deactivateBody).not.toMatch(/Fatal error|Call to undefined function/i);

  await page.locator(`tr[data-slug="my-plugin"] a:has-text("Activate")`).click();
  await page.waitForLoadState('networkidle');

  const reactivateBody = await page.evaluate(() => document.body.innerText);
  expect(reactivateBody).not.toMatch(/Fatal error/i);
});
```

#### No 404s on plugin-enqueued assets

```js
test('no 404s on plugin assets', async ({ page }) => {
  const broken = [];
  page.on('response', r => {
    if (r.status() === 404 && r.url().includes('my-plugin')) {
      broken.push(r.url());
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  expect(broken, `404 assets:\n${broken.join('\n')}`).toHaveLength(0);
});
```

#### REST endpoint requires authentication

```js
test('REST endpoint requires auth', async ({ request }) => {
  // Without auth → should be 401
  const unauth = await request.get('/wp-json/my-plugin/v1/data');
  expect([401, 403]).toContain(unauth.status());

  // With auth → should be 200
  const authed = await request.get('/wp-json/my-plugin/v1/data', {
    headers: {
      'Authorization': 'Basic ' + Buffer.from('admin:password').toString('base64')
    }
  });
  expect(authed.status()).toBe(200);
});
```

#### AJAX handler rejects missing nonce

```js
test('AJAX handler rejects missing nonce', async ({ request }) => {
  const response = await request.post('/wp-admin/admin-ajax.php', {
    form: {
      action: 'my_plugin_save',
      value: 'test',
      // nonce deliberately omitted
    }
  });
  const text = await response.text();
  expect(text).toContain('-1'); // WordPress nonce failure returns -1
});
```

#### WCAG accessibility check

```js
const AxeBuilder = require('@axe-core/playwright').default;

test('admin settings page passes WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=my-plugin');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
```

#### Visual regression snapshot

```js
test('settings page visual baseline', async ({ page }) => {
  await page.goto('/wp-admin/admin.php?page=my-plugin');
  await page.waitForLoadState('networkidle');

  // First run → saves PNG baseline
  // Future runs → diffs against it, fails if > 2% pixel difference
  await expect(page).toHaveScreenshot('settings-page.png', {
    maxDiffPixelRatio: 0.02,
    fullPage: true
  });
});
```

Update baselines after intentional UI changes:
```bash
npm run test:visual
```

#### Performance budget test

```js
test('admin dashboard loads under 3 seconds', async ({ page }) => {
  const start = Date.now();
  await page.goto('/wp-admin/admin.php?page=my-plugin');
  await page.waitForLoadState('networkidle');
  const ms = Date.now() - start;

  expect(ms, `Dashboard took ${ms}ms — investigate with /performance-engineer`).toBeLessThan(3000);
});
```

#### Run same test across multiple pages

```js
const PAGES_TO_CHECK = ['/', '/shop/', '/blog/', '/contact/', '/about/'];

for (const path of PAGES_TO_CHECK) {
  test(`no errors on ${path}`, async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const pluginErrors = errors.filter(e => e.includes('my-plugin'));
    expect(pluginErrors, pluginErrors.join('\n')).toHaveLength(0);
  });
}
```

---

## 12. Plugin-Type Playbooks

### Elementor Addon — Complete Test Coverage

```js
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const WIDGET_NAMES = ['My Widget', 'My Grid Widget', 'My Slider'];
const TEST_PAGE    = '/elementor-test-page/';

test.describe('Elementor addon', () => {

  // Widget discovery in Elementor panel
  for (const name of WIDGET_NAMES) {
    test(`widget "${name}" appears in panel search`, async ({ page }) => {
      await page.goto('/wp-admin/post-new.php?post_type=page');
      await page.click('#elementor-switch-mode-button');
      await page.waitForSelector('#elementor-panel-elements-wrapper');

      await page.fill('#elementor-panel-elements-search-input', name);
      await expect(
        page.locator(`.elementor-element:has-text("${name}")`)
      ).toBeVisible({ timeout: 10000 });
    });
  }

  // Frontend render — no JS errors
  test('all widgets render on frontend without JS errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(TEST_PAGE);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.elementor-widget')).not.toHaveCount(0);
    expect(errors.filter(e => e.includes('my-plugin'))).toHaveLength(0);
  });

  // Responsive — no horizontal scroll at mobile
  test('mobile: no horizontal scroll at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(TEST_PAGE);
    await page.waitForLoadState('networkidle');

    const hasHScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHScroll).toBe(false);
  });

  // Visual snapshots at 3 viewports
  test('visual snapshots at desktop / tablet / mobile', async ({ page }) => {
    for (const [vw, vh] of [[1440, 900], [768, 1024], [375, 667]]) {
      await page.setViewportSize({ width: vw, height: vh });
      await page.goto(TEST_PAGE);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`test-page-${vw}x${vh}.png`, {
        maxDiffPixelRatio: 0.03, fullPage: true
      });
    }
  });

  // Elementor editor doesn't break on non-test pages
  test('Elementor editor opens on clean page', async ({ page }) => {
    await page.goto('/wp-admin/post-new.php?post_type=page');
    await page.click('#elementor-switch-mode-button');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#elementor-editor-wrapper')).toBeVisible();
  });

  // WCAG on frontend
  test('frontend output passes WCAG 2.2 AA', async ({ page }) => {
    await page.goto(TEST_PAGE);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

});
```

---

### Gutenberg Block Plugin — Complete Test Coverage

```js
const { test, expect } = require('@playwright/test');

const BLOCK_NAMES = ['My Block', 'My Grid Block'];
const TEST_PAGE   = '/block-test-page/';

test.describe('Gutenberg block plugin', () => {

  // Block appears in inserter
  for (const name of BLOCK_NAMES) {
    test(`block "${name}" in inserter`, async ({ page }) => {
      await page.goto('/wp-admin/post-new.php');

      // Dismiss welcome modal
      const modal = page.locator('button[aria-label="Close"]');
      if (await modal.isVisible().catch(() => false)) await modal.click();

      await page.click('button[aria-label="Toggle block inserter"]');
      await page.fill('input[placeholder="Search"]', name);

      await expect(
        page.locator(`button.block-editor-block-types-list__item:has-text("${name}")`)
      ).toBeVisible({ timeout: 8000 });
    });
  }

  // Block can be inserted and saved without errors
  test('block inserts and saves cleanly', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto('/wp-admin/post-new.php');
    const modal = page.locator('button[aria-label="Close"]');
    if (await modal.isVisible().catch(() => false)) await modal.click();

    // Insert first block
    await page.click('button[aria-label="Toggle block inserter"]');
    await page.fill('input[placeholder="Search"]', BLOCK_NAMES[0]);
    await page.click(`button.block-editor-block-types-list__item:has-text("${BLOCK_NAMES[0]}")`);
    await page.waitForTimeout(1000);

    // Publish
    await page.click('button.editor-post-publish-button, button:has-text("Publish")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Publish"):not([disabled])').catch(() => {});

    const blockErrors = errors.filter(e =>
      e.includes('my-plugin') || e.includes('my-block') || e.includes('Uncaught')
    );
    expect(blockErrors).toHaveLength(0);
  });

  // Block renders on frontend
  test('block renders correctly on frontend', async ({ page }) => {
    await page.goto(TEST_PAGE);
    await expect(page.locator('.wp-block-my-plugin-my-block')).toBeVisible();

    // No layout shift
    const height = await page.locator('.wp-block-my-plugin-my-block').boundingBox();
    expect(height?.height).toBeGreaterThan(0);
  });

});
```

---

### SEO Plugin — Complete Test Coverage

```js
const { test, expect } = require('@playwright/test');

test.describe('SEO plugin output', () => {

  // Meta tags on frontend
  test('meta title and description on homepage', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeLessThan(65);

    const desc = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
    expect(desc, 'meta description missing').toBeTruthy();
    expect(desc.length).toBeLessThan(160);
  });

  // JSON-LD schema
  test('JSON-LD schema is present and valid on homepage', async ({ page }) => {
    await page.goto('/');
    const schemas = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean)
    );
    expect(schemas.length, 'No JSON-LD schema blocks found').toBeGreaterThan(0);
    console.log('Schema types:', schemas.map(s => s['@type']).join(', '));
  });

  // Sitemap
  test('XML sitemap returns 200 and valid XML', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('<?xml');
    expect(text).toMatch(/<urlset|<sitemapindex/);
  });

  // Open Graph
  test('Open Graph tags are present', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => null);
    const ogDesc  = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => null);
    expect(ogTitle, 'og:title missing').toBeTruthy();
    expect(ogDesc,  'og:description missing').toBeTruthy();
  });

  // Canonical
  test('canonical URL is set on homepage', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);
    expect(canonical, 'canonical missing').toBeTruthy();
  });

  // Admin settings load
  test('SEO plugin settings page loads without PHP errors', async ({ page }) => {
    const errors = [];
    page.on('console', m => { if (/PHP (Warning|Notice|Fatal)/.test(m.text())) errors.push(m.text()); });
    await page.goto('/wp-admin/admin.php?page=my-seo');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

});
```

---

### WooCommerce Extension — Complete Test Coverage

```js
const { test, expect } = require('@playwright/test');

const WC_PAGES = ['/shop/', '/cart/', '/checkout/', '/my-account/'];

test.describe('WooCommerce extension', () => {

  // No PHP errors on any WC page
  for (const path of WC_PAGES) {
    test(`no PHP errors on ${path}`, async ({ page }) => {
      const errors = [];
      page.on('console', m => {
        if (/PHP (Warning|Notice|Fatal)/.test(m.text())) errors.push(m.text());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(errors, errors.join('\n')).toHaveLength(0);
    });
  }

  // Full purchase flow
  test('add to cart → checkout renders correctly', async ({ page }) => {
    await page.goto('/shop/');
    await page.locator('.add_to_cart_button').first().click();
    await page.waitForTimeout(800);

    await page.goto('/checkout/');
    await expect(page.locator('form.checkout, form.woocommerce-checkout')).toBeVisible();
    await expect(page.locator('#billing_first_name')).toBeVisible();
    await expect(page.locator('#billing_email')).toBeVisible();
  });

  // Extension settings in WC admin
  test('extension settings tab loads in WC admin', async ({ page }) => {
    await page.goto('/wp-admin/admin.php?page=wc-settings&tab=my-extension');
    await page.waitForLoadState('networkidle');
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/Fatal error|Call to undefined function/i);
  });

  // Cart doesn't break
  test('cart page functions correctly with extension active', async ({ page }) => {
    await page.goto('/shop/');
    await page.locator('.add_to_cart_button').first().click();
    await page.waitForTimeout(500);
    await page.goto('/cart/');
    await expect(page.locator('.cart_item, table.shop_table')).toBeVisible();
    await expect(page.locator('.woocommerce-cart-form__cart-item')).not.toHaveCount(0);
  });

});
```

---

### REST API Plugin — Security-Focused Tests

```js
const { test, expect } = require('@playwright/test');

const BASE = process.env.WP_TEST_URL || 'http://localhost:8881';

const PROTECTED_ENDPOINTS = [
  '/wp-json/my-plugin/v1/settings',
  '/wp-json/my-plugin/v1/users',
  '/wp-json/my-plugin/v1/delete',
];

const AUTH = 'Basic ' + Buffer.from('admin:password').toString('base64');

test.describe('REST API security', () => {

  // All protected endpoints require auth
  for (const endpoint of PROTECTED_ENDPOINTS) {
    test(`${endpoint} requires authentication`, async ({ request }) => {
      const unauth = await request.get(`${BASE}${endpoint}`);
      expect([401, 403], `${endpoint} is publicly accessible!`).toContain(unauth.status());
    });
  }

  // Authenticated access works
  test('authenticated request returns expected structure', async ({ request }) => {
    const response = await request.get(`${BASE}/wp-json/my-plugin/v1/settings`, {
      headers: { 'Authorization': AUTH }
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('settings');
  });

  // Input validation
  test('endpoint validates input types', async ({ request }) => {
    const response = await request.post(`${BASE}/wp-json/my-plugin/v1/save`, {
      headers: { 'Authorization': AUTH, 'Content-Type': 'application/json' },
      data: { count: 'not-a-number' } // intentionally wrong type
    });
    expect([400, 422]).toContain(response.status());
  });

  // No server errors on any endpoint
  test('no 500 errors on any registered endpoint', async ({ request }) => {
    const routeResponse = await request.get(`${BASE}/wp-json/my-plugin/v1`);
    if (routeResponse.status() !== 200) return;

    const routes = await routeResponse.json();
    const endpoints = Object.keys(routes.routes || {});

    for (const route of endpoints.slice(0, 10)) { // test first 10
      const r = await request.get(`${BASE}/wp-json${route}`).catch(() => null);
      if (r) expect(r.status()).not.toBe(500);
    }
  });

});
```

---

## 13. Reading Every Report

### `reports/skill-audits/index.html` — Primary Report

```bash
open reports/skill-audits/index.html
```

**Structure:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Orbit Skill Audit Report                                        │
│ Plugin: my-plugin · Generated: 2024-06-01 14:30 · 6 skills run │
│                                                                 │
│  [0 Critical]  [2 High]  [7 Medium]  [12 Low]                  │
└─────────────────────────────────────────────────────────────────┘
│ WP Standards │ Security │ Performance │ Database │ A11y │ Code  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ## Severity Summary                                            │
│  | Critical | High | Medium | Low |                            │
│  |---------|------|--------|-----|                             │
│  | 0       | 1    | 3      | 8   |                            │
│                                                                 │
│  ### HIGH — finding title                                       │
│  File: path/to/file.php, Line: 45                              │
│                                                                 │
│  Description of what's wrong...                                 │
│                                                                 │
│  ```php                                                         │
│  // Bad code                                                    │
│  // Fixed code                                                  │
│  ```                                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Decision flow:**
```
Severity Header
    │
    ├── Critical > 0?  → Block release immediately
    │
    ├── Security tab: High > 0?  → Block release
    │
    ├── Other tabs: High > 0?    → Fix before release if possible
    │
    ├── Medium > 0?  → Fix if < 30 min, else log
    │
    └── Low only?    → Log in tech debt, ship
```

---

### `reports/playwright-html/index.html` — Browser Test Report

```bash
npx playwright show-report reports/playwright-html
```

**For each test:**
```
Test: "settings page loads without PHP errors"   ✅ PASS  (1.2s)
Test: "no 404s on plugin assets"                 ✅ PASS  (0.8s)
Test: "AJAX handler rejects missing nonce"        ❌ FAIL  (2.1s)
    └── Error: Expected response to contain "-1"
        Received: "1" (the nonce check passed when it shouldn't)
    └── Screenshot: [attached]
    └── Trace: [click to open time-travel debugger]
```

**The trace viewer** lets you time-travel through every action: click it on any failed test to see exactly what the browser saw at every step, including the full DOM before and after each action.

---

### `reports/uat-report-*.html` — UAT Report (for PMs and Designers)

```bash
open reports/uat-report-*.html
```

Contains:
- Side-by-side screenshots paired by feature (your plugin vs competitor)
- Embedded video for each flow
- Flow title, timestamp, and status per pair

No code. No terminal output. Share this file directly with stakeholders.

---

### `reports/db-profile-*.txt` — Database Report

```
Page,Query Count,Load Time (ms),Notes
/,23,184,
/shop/,87,612,⚠ HIGH queries ⚠ SLOW load
/my-plugin-page/,44,320,
```

Compare across releases by running db-profile on old and new and diffing:
```bash
diff reports/db-profile-v1.0.txt reports/db-profile-v1.1.txt
```

An increase of more than 10 queries per page is a regression worth investigating.

---

### `reports/qa-report-*.md` — Master Gauntlet Log

The machine-readable summary of all 11 steps. Use for:
- Adding to PR descriptions as QA evidence
- CI/CD gates (`exit 1` = fail the pipeline)
- Comparison between versions

---

## 14. Pre-Release Checklist

Before tagging any release, every item must be checked:

### Automated (Must Pass)

- [ ] `bash scripts/gauntlet.sh` exits with code 0
- [ ] PHP lint: zero syntax errors
- [ ] PHPCS: zero ERROR-level violations
- [ ] Playwright: zero failing tests
- [ ] Skill audits HTML: zero Critical findings
- [ ] Skill audits HTML: zero High findings in Security tab

### Security (Manual Verification)

- [ ] All user-facing inputs sanitized before storage (`sanitize_text_field`, `absint`, `esc_url_raw`)
- [ ] All outputs escaped before display (`esc_html`, `esc_attr`, `wp_kses_post`)
- [ ] Every form and AJAX handler has nonce verification
- [ ] Every REST endpoint has `permission_callback`
- [ ] No `$wpdb->query()` without `$wpdb->prepare()`
- [ ] No `eval()`, `system()`, `exec()`, `shell_exec()`

### Database

- [ ] Query count per page not regressed vs previous release
- [ ] No queries over 100ms on key pages (from db-profile output)
- [ ] No new N+1 patterns in added code
- [ ] New options have correct `autoload` (false for caches/logs)

### Performance

- [ ] Lighthouse performance score ≥ 75 (target: 85+)
- [ ] No CSS/JS 404s on any page
- [ ] JS bundle size not increased >10% without justification
- [ ] New assets enqueued conditionally, not on every page

### Compatibility

- [ ] Tested on PHP 7.4, 8.0, 8.1, 8.2
- [ ] Tested on WordPress latest and latest-1
- [ ] Tested with companion plugins active (list in `qa.config.json`)
- [ ] No fatal errors with `WP_DEBUG=true`

### Version and Release

- [ ] Version bumped in: plugin header comment, `MY_PLUGIN_VERSION` constant, `readme.txt` Stable tag
- [ ] CHANGELOG.md updated with `## [X.Y.Z] - YYYY-MM-DD`
- [ ] Branch is `release/vX.Y.Z` — not pushing directly to main
- [ ] Plugin zip root folder matches plugin slug exactly

---

## 15. Real-World Walkthrough

### Scenario: Auditing an SEO Plugin Before a Major Release

**Starting state:** Plugin `my-seo` v2.4.0 is ready to ship. You need to audit it.

#### 1. Configure

```bash
cd ~/Claude/orbit
cat > qa.config.json << 'EOF'
{
  "plugin": {
    "name": "My SEO Plugin",
    "slug": "my-seo",
    "type": "seo-plugin",
    "path": "/Users/dev/projects/my-seo"
  },
  "environment": {
    "testUrl": "http://localhost:8881",
    "wpEnvPort": 8881,
    "adminUser": "admin",
    "adminPass": "password"
  },
  "companions": ["yoast"],
  "competitors": ["rank-math"],
  "thresholds": {
    "lighthouse": { "performance": 80 },
    "dbQueriesPerPage": 50
  }
}
EOF
```

#### 2. Start Test Site

```bash
bash scripts/create-test-site.sh --mode full
# → http://localhost:8881 running with MariaDB
```

#### 3. Run Full Gauntlet

```bash
WP_TEST_URL=http://localhost:8881 bash scripts/gauntlet.sh --mode full
```

**10 minutes later — terminal output:**

```
[ Step 1: PHP Lint ]
✓ PHP lint — no syntax errors

[ Step 2: WordPress Coding Standards (PHPCS) ]
✗ PHPCS — 2 errors, 18 warnings

[ Step 3: PHPStan Static Analysis ]
⚠ PHPStan — issues found (review)

[ Step 4: Asset Weight Audit ]
✓ JS total: 0.18MB | CSS total: 94KB

[ Step 5: i18n / POT File ]
✓ POT generated — 312 translatable strings
⚠ 3 possibly untranslated strings — review

[ Step 6: Playwright Functional + Visual ]
✓ Playwright — 24 tests passed
  HTML report: reports/playwright-html/index.html

[ Step 7: Lighthouse Performance ]
✓ Lighthouse performance: 79/100

[ Step 8: Database Profiling ]
Saved to: reports/db-profile-20240601-143022.txt

[ Step 10: UI / Frontend Performance ]
✓ Frontend: total 298ms | TTFB 76ms

[ Step 11: Claude Skill Audits (6 parallel) ]
Running 6 parallel skill audits...
✓ Skill audits complete — 6 reports written
✓ Skill audit HTML: reports/skill-audits/index.html
  Open: open /path/to/orbit/reports/skill-audits/index.html
⚠ Critical findings — review security.md before release

=================================
Results: 8 passed | 3 warnings | 1 failed
✗ GAUNTLET FAILED — do not release
```

#### 4. Fix Step 2 — PHPCS Errors

```bash
phpcs --standard=config/phpcs.xml /Users/dev/projects/my-seo --report=full | grep ERROR
```

```
FILE: includes/class-redirect.php:78
  ERROR | WordPress.Security.NonceVerification
  → Processing $_POST without nonce check

FILE: admin/class-settings.php:134
  ERROR | WordPress.Security.EscapeOutput
  → echo get_option('ms_redirect_url')
```

**Fix class-redirect.php line 78:**
```php
// Before
if ( isset( $_POST['ms_redirect_url'] ) ) {
    update_option( 'ms_redirect_url', $_POST['ms_redirect_url'] );
}

// After
if ( isset( $_POST['ms_redirect_url'] ) && check_admin_referer( 'ms_save_redirect', 'ms_nonce' ) ) {
    update_option( 'ms_redirect_url', esc_url_raw( wp_unslash( $_POST['ms_redirect_url'] ) ) );
}
```

**Fix admin/class-settings.php line 134:**
```php
// Before
echo get_option('ms_redirect_url');

// After
echo esc_url( get_option( 'ms_redirect_url' ) );
```

#### 5. Fix Skill Audit — Critical Security Finding

Open `reports/skill-audits/index.html` → Security tab:

```
CRITICAL — REST endpoint exposes private post meta without authentication
File: includes/rest-api/class-meta-endpoint.php, Line: 34

register_rest_route( 'my-seo/v1', '/post-meta/(?P<id>\d+)', [
    'methods'  => 'GET',
    'callback' => 'my_seo_get_post_meta',
    // permission_callback absent → defaults to __return_true
] );

Fix:
'permission_callback' => function() {
    return current_user_can( 'edit_posts' );
},
```

Apply the fix.

#### 6. Re-Run Gauntlet

```bash
WP_TEST_URL=http://localhost:8881 bash scripts/gauntlet.sh --mode full
```

```
Results: 11 passed | 1 warning | 0 failed
⚠ GAUNTLET PASSED WITH WARNINGS — review before release
```

Remaining warning: PHPStan level-5 type issue in non-critical utility function. Log it, note it in the CHANGELOG, ship.

#### 7. Sign Off

```bash
# Open final reports for review
open reports/skill-audits/index.html
npx playwright show-report reports/playwright-html
```

Skill audit shows: 0 Critical, 0 High, 5 Medium, 14 Low.
Playwright shows: 24/24 tests passing.

Pre-release checklist checked. Tag the release.

---

## 16. Troubleshooting

### "Redirected to login — auth cookies are stale"

```bash
rm -f .auth/wp-admin.json
WP_TEST_URL=http://localhost:8881 npx playwright test --project=setup
```

---

### "Plugin path not found"

Check `qa.config.json` has an absolute path with no `~`:

```json
"path": "/Users/yourname/projects/my-plugin"  ✅
"path": "~/projects/my-plugin"                 ❌ (shell expansion doesn't work here)
```

---

### "wp-env start hangs / fails"

```bash
docker ps                               # is Docker running?
docker info | head -3                   # Docker daemon responding?
cd .wp-env-site/default
wp-env destroy && wp-env start          # nuclear reset
docker system prune -af                 # reclaim disk if low
```

---

### "Port 8881 already in use"

```bash
lsof -i :8881                           # find what's using it
kill -9 PID                             # kill the process
# OR use a different port:
bash scripts/create-test-site.sh --port 8882
# update testUrl in qa.config.json to match
```

---

### "Skill audits produced no output"

```bash
# Check Claude CLI is installed and authenticated
claude --version
claude auth status

# Check skills are installed
ls ~/.claude/skills/wordpress-penetration-testing

# Run one skill manually to see the error
claude "/wordpress-penetration-testing Security audit /path/to/plugin — output markdown." \
  > /tmp/test-skill-output.md
cat /tmp/test-skill-output.md
```

---

### "PHPCS command not found"

```bash
# Add Composer global bin to PATH
export PATH="$(composer global config bin-dir --absolute 2>/dev/null):$PATH"
# Add to ~/.zshrc or ~/.bashrc to persist

# Verify
phpcs --version
phpcs -i | grep WordPress
```

---

### "Playwright: Failed to connect to browser"

```bash
# Reinstall browser binaries
npx playwright install chromium

# Or reinstall all
npx playwright install
```

---

### "Lighthouse: not installed"

```bash
npm install -g lighthouse
lighthouse --version
```

---

## 17. Full Command Reference

### Gauntlet

```bash
bash scripts/gauntlet.sh --plugin /path/to/plugin --mode full   # full 11-step audit
bash scripts/gauntlet.sh --plugin /path/to/plugin --mode quick  # skip Lighthouse + DB
bash scripts/gauntlet.sh                                         # uses qa.config.json
```

### Test Site

```bash
bash scripts/create-test-site.sh --plugin /path --mode full     # Docker + MariaDB
bash scripts/create-test-site.sh --plugin /path --mode quick    # SQLite, no Docker
bash scripts/create-test-site.sh --plugin /path --port 8882     # custom port
```

### Playwright

```bash
WP_TEST_URL=http://localhost:8881 npx playwright test           # all tests
WP_TEST_URL=http://localhost:8881 npx playwright test --ui      # GUI mode (best DX)
WP_TEST_URL=http://localhost:8881 npx playwright test --headed  # visible browser
npx playwright test -g "settings page"                          # test by name
npx playwright test tests/playwright/my-plugin/                 # specific folder
npx playwright test --debug                                      # debug inspector
npm run test:visual                                              # update snapshots
npm run uat                                                      # video UAT flows
```

### Reports

```bash
npx playwright show-report reports/playwright-html              # browser test report
open reports/skill-audits/index.html                            # skill audit HTML
open reports/uat-report-*.html                                  # UAT video report
cat reports/qa-report-*.md                                      # gauntlet log
```

### DB Profiling

```bash
bash scripts/db-profile.sh                                           # default pages
TEST_PAGES="/,/shop/,/blog/" bash scripts/db-profile.sh              # custom pages
WP_TEST_URL=https://staging.site.com bash scripts/db-profile.sh      # staging
```

### Multi-Plugin

```bash
bash scripts/batch-test.sh --plugins-dir ~/plugins                   # all plugins
bash scripts/batch-test.sh --plugins "a,b,c"                         # specific list
bash scripts/batch-test.sh --plugins-dir ~/plugins --concurrency 3   # limit parallelism
bash scripts/pull-plugins.sh                                          # download competitor zips
```

### Skill Audits (Manual)

```bash
# All 6 core in parallel
P=/path/to/plugin && D=reports/skill-audits && mkdir -p $D
claude "/wordpress-plugin-development Audit $P — WP standards. Output markdown."          > $D/wp-standards.md &
claude "/wordpress-penetration-testing Security audit $P — OWASP Top 10. Output markdown." > $D/security.md &
claude "/performance-engineer Analyze $P — hooks, N+1, assets. Output markdown."          > $D/performance.md &
claude "/database-optimizer Review $P — queries, indexes, autoload. Output markdown."      > $D/database.md &
claude "/accessibility-compliance-accessibility-audit Audit $P. Output markdown."          > $D/accessibility.md &
claude "/code-review-excellence Review $P — quality, complexity, patterns. Output markdown." > $D/code-quality.md &
wait

# Single skill
claude "/wordpress-penetration-testing Security audit /path/to/plugin — rate Critical/High/Medium/Low. Output markdown."
```

### Changelog-Based Test Planning

```bash
bash scripts/changelog-test.sh --changelog /path/to/CHANGELOG.md
bash scripts/changelog-test.sh --changelog /path/to/CHANGELOG.md --version 2.4.0
```

### Version Comparison

```bash
bash scripts/compare-versions.sh --old plugin-1.0.zip --new plugin-1.1.zip
```

### wp-env Lifecycle

```bash
# From .wp-env-site/default/
wp-env stop                                              # pause
wp-env start                                             # resume
wp-env clean all                                         # reset DB
wp-env destroy                                           # delete everything
wp-env run cli wp plugin list                            # WP-CLI
wp-env run cli wp option get siteurl                     # get option
wp-env run cli wp plugin install woocommerce --activate  # install plugin
```

---

*Orbit is plugin-agnostic. Your `qa.config.json`, plugin code, and generated reports stay local and are gitignored. Only generic tools, templates, and scripts live in the shared repository.*
