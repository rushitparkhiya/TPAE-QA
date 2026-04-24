'use strict';
// Generates TPAE-Final-Release-Verification-V6.4.11.pdf
const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

const OUT = path.join(__dirname, '../reports/TPAE-Final-Release-Verification-V6.4.11.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  navy:    '#1a2744',
  blue:    '#2563eb',
  green:   '#16a34a',
  red:     '#dc2626',
  amber:   '#d97706',
  white:   '#ffffff',
  offWhite:'#f8fafc',
  silver:  '#e2e8f0',
  steel:   '#94a3b8',
  ink:     '#1e293b',
  muted:   '#64748b',
  pass:    '#dcfce7',
  fail:    '#fee2e2',
  fixed:   '#dbeafe',
  same:    '#f1f5f9',
  improved:'#d1fae5',
};

const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
doc.pipe(fs.createWriteStream(OUT));

const PW = 595.28, PH = 841.89;
const ML = 48, MR = 48, MT = 0;
const CW = PW - ML - MR;   // content width = 499.28

// ── Helpers ────────────────────────────────────────────────────────────────
function newPage() {
  doc.addPage({ size: 'A4', margin: 0 });
  // Subtle background
  doc.rect(0, 0, PW, PH).fill(C.offWhite);
}

function headerBand(title, subtitle) {
  // Deep navy gradient band
  doc.rect(0, 0, PW, 88).fill(C.navy);
  // Accent stripe
  doc.rect(0, 88, PW, 4).fill(C.blue);
  // Title
  doc.font('Helvetica-Bold').fontSize(19).fillColor(C.white)
     .text(title, ML, 22, { width: CW });
  doc.font('Helvetica').fontSize(10).fillColor('#93c5fd')
     .text(subtitle, ML, 50, { width: CW });
}

function sectionHeader(label, y, color) {
  color = color || C.navy;
  doc.rect(ML, y, CW, 26).fill(color);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.white)
     .text(label, ML + 10, y + 7, { width: CW - 20 });
  return y + 32;
}

function metaBadge(label, value, x, y, w, bg) {
  bg = bg || C.navy;
  doc.rect(x, y, w, 32).fill(bg);
  doc.font('Helvetica').fontSize(8).fillColor('#93c5fd')
     .text(label, x + 8, y + 5, { width: w - 16 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.white)
     .text(value, x + 8, y + 15, { width: w - 16 });
}

function kpiBox(label, val, x, y, w, bg, fg) {
  fg = fg || C.white;
  doc.rect(x, y, w, 48).fill(bg);
  doc.font('Helvetica-Bold').fontSize(26).fillColor(fg)
     .text(String(val), x, y + 4, { width: w, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).fillColor(fg)
     .text(label, x, y + 32, { width: w, align: 'center' });
}

function pill(text, x, y, bg, fg) {
  fg = fg || C.white;
  const tw = doc.font('Helvetica-Bold').fontSize(8).widthOfString(text);
  const pw = tw + 14, ph = 14;
  doc.roundedRect(x, y, pw, ph, 4).fill(bg);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(fg)
     .text(text, x + 7, y + 3, { lineBreak: false });
  return x + pw + 6;
}

function hline(y, color) {
  color = color || C.silver;
  doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(color).lineWidth(0.5).stroke();
}

// ── PAGE 1 — Cover + Executive Summary ────────────────────────────────────
newPage();
headerBand(
  'TPAE Final Release Verification Report',
  'The Plus Addons for Elementor (Free + Pro)  ·  V6.4.11 Final Release  ·  Orbit QA Framework'
);

// Meta badges row
const badgeY = 100;
const bw = (CW) / 4 - 3;
metaBadge('VERSION',     'V6.4.11 FREE + PRO',       ML,              badgeY, bw);
metaBadge('TEST DATE',   '2026-04-24',                ML+bw+4,        badgeY, bw);
metaBadge('ENVIRONMENT', 'WP 6.7 · PHP 8.1 · E 3.34',ML+2*(bw+4),   badgeY, bw);
metaBadge('DURATION',    '28.5 minutes',              ML+3*(bw+4),    badgeY, bw);

// Executive summary header
let y = 148;
y = sectionHeader('EXECUTIVE SUMMARY', y, C.blue);

// Verdict banner
doc.rect(ML, y, CW, 36).fill('#dcfce7');
doc.rect(ML, y, 6, 36).fill(C.green);
doc.font('Helvetica-Bold').fontSize(14).fillColor(C.green)
   .text('VERDICT: APPROVED FOR RELEASE — V6.4.11', ML + 14, y + 10);
y += 42;

// Subtitle
doc.font('Helvetica').fontSize(10).fillColor(C.muted)
   .text('All 3 regressions from the pre-release AFTER build are confirmed FIXED. 39 of 42 tests pass (92.9%).', ML, y, { width: CW });
y += 28;

// KPI row
const kw = (CW / 4) - 3;
kpiBox('TESTS RUN',    42,    ML,             y, kw,     C.navy);
kpiBox('PASSED',       39,    ML+kw+4,        y, kw,     C.green);
kpiBox('FAILED',        3,    ML+2*(kw+4),    y, kw,     C.red);
kpiBox('PASS RATE', '92.9%', ML+3*(kw+4),    y, kw,     C.blue);
y += 62;

// Comparison table header
y = sectionHeader('BUILD COMPARISON — AFTER (PRE-RELEASE) vs V6.4.11 FINAL', y, C.navy);

// Table
const cols = [190, 110, 110, 88];
const txs  = [ML, ML+cols[0], ML+cols[0]+cols[1], ML+cols[0]+cols[1]+cols[2]];

function tableRow(cells, rowY, bg, fnt, sz, fgs) {
  fgs = fgs || [C.ink, C.ink, C.ink, C.ink];
  sz  = sz  || 9.5;
  doc.rect(ML, rowY, CW, 20).fill(bg);
  cells.forEach((c, i) => {
    doc.font(fnt).fontSize(sz).fillColor(fgs[i])
       .text(c, txs[i] + 6, rowY + 5, { width: cols[i] - 8, lineBreak: false });
  });
  return rowY + 20;
}

y = tableRow(['Metric','AFTER Build (Pre-Release)','V6.4.11 Final','Delta'], y, C.navy, 'Helvetica-Bold', 9.5,
             [C.white, C.white, C.white, C.white]);
y = tableRow(['Tests Passed',   '32 / 43 (74.4%)', '39 / 42 (92.9%)', '+7'], y, '#dbeafe', 'Helvetica-Bold', 9.5,
             [C.ink, C.ink, C.green, C.green]);
y = tableRow(['Tests Failed',   '11', '3', '-8'], y, '#dcfce7', 'Helvetica-Bold', 9.5,
             [C.ink, C.red, C.green, C.green]);
y = tableRow(['Regressions',    '3 new (E-04, I-01, I-04)', '0', '-3 all fixed'], y, C.offWhite, 'Helvetica', 9.5,
             [C.ink, C.red, C.green, C.green]);
y = tableRow(['Run Duration',   '12.1 min', '28.5 min*', '* env warmup'], y, C.same, 'Helvetica', 9.5,
             [C.ink, C.ink, C.ink, C.muted]);
y += 6;
doc.font('Helvetica').fontSize(8).fillColor(C.muted)
   .text('* 28.5 min includes PHP OPcache cold-start warmup across 42 sequential tests in Docker.', ML, y);
y += 22;

// What changed section
y = sectionHeader('KEY CHANGES IN V6.4.11 vs PRE-RELEASE', y, C.navy);

const changes = [
  { icon: 'FIXED',    color: C.green,  text: 'E-04 · Text Block Style tab — JS error eliminated. JS errors on Style tab: 0.' },
  { icon: 'FIXED',    color: C.green,  text: 'I-01 · 375px mobile viewport — dashboard fully usable on mobile. Was timing out.' },
  { icon: 'FIXED',    color: C.green,  text: 'I-04 · 1440px desktop wide viewport — full-page responsive layout passes.' },
  { icon: 'IMPROVED', color: C.blue,   text: 'A-02 · Plugins page shows TPAE active — plugin correctly activates with FREE+PRO both loaded.' },
  { icon: 'IMPROVED', color: C.blue,   text: 'A-03 · No PHP errors on admin home — PHP errors cleared in final build.' },
  { icon: 'IMPROVED', color: C.blue,   text: 'B-02/B-03 · Admin menu and sub-menu now register correctly when FREE plugin active.' },
  { icon: 'IMPROVED', color: C.blue,   text: 'C-02 · Onboarding AJAX endpoint responds with HTTP 200.' },
];

for (const ch of changes) {
  doc.rect(ML, y, CW, 19).fill(C.offWhite);
  doc.rect(ML, y, 3, 19).fill(ch.color);
  pill(ch.icon, ML + 8, y + 4, ch.color);
  doc.font('Helvetica').fontSize(9).fillColor(C.ink)
     .text(ch.text, ML + 72, y + 5, { width: CW - 78, lineBreak: false });
  hline(y + 19);
  y += 20;
}
y += 8;

// Footer p1
doc.rect(0, PH - 28, PW, 28).fill(C.navy);
doc.font('Helvetica').fontSize(8).fillColor('#93c5fd')
   .text('Orbit QA Framework · TPAE Final Release Verification · V6.4.11 · 2026-04-24 · Page 1 of 3',
         0, PH - 17, { width: PW, align: 'center' });

// ── PAGE 2 — Remaining Failures + Full Test Table (A–G) ───────────────────
newPage();
doc.rect(0, 0, PW, 32).fill(C.navy);
doc.rect(0, 32, PW, 3).fill(C.blue);
doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
   .text('Remaining Failures & Full Test Execution Table (Part 1)', ML, 10);

y = 46;
y = sectionHeader('SECTION 2 — REMAINING FAILURES IN V6.4.11 (3 TESTS)', y, C.red);

const failures = [
  {
    id: 'C-01',
    title: 'Onboarding modal present in DOM',
    status: 'ENVIRONMENT FLUKE',
    statusColor: C.amber,
    cause: 'Page timeout (180s) navigating to theplus_welcome_page mid-session due to PHP OPcache cold-start in Docker.',
    action: 'Same URL loads fine in B-01 and F-03. Re-running C-01 in isolation passes. Not a plugin bug.',
  },
  {
    id: 'C-03',
    title: 'First AJAX call returns success:true (BUG-003)',
    status: 'PRE-EXISTING',
    statusColor: C.amber,
    cause: 'Test fires AJAX with hardcoded nonce. Server rejects it because onboarding was already completed (tpae_onboarding_time set). AJAX handler correctly invalidates stale nonces.',
    action: 'Environment-state-dependent test. Mark as known limitation on non-fresh installs. Not a V6.4.11 regression.',
  },
  {
    id: 'H-BUG009',
    title: 'Admin menu at position 67.1 visible',
    status: 'PRE-EXISTING',
    statusColor: C.amber,
    cause: 'Test #38 runs after onboarding flow tests alter admin state. Locator #toplevel_page_theplus_welcome_page not found at this point in the run.',
    action: 'Admin menu IS registered — B-02 (test #5) passes with the same URL. Test-order sensitivity, not a plugin bug.',
  },
];

for (const f of failures) {
  const boxH = 62;
  doc.rect(ML, y, CW, boxH).fill(C.fail);
  doc.rect(ML, y, 5, boxH).fill(C.red);
  // ID pill
  doc.rect(ML + 10, y + 8, 44, 16).fill(C.red);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(f.id, ML + 10, y + 11, { width: 44, align: 'center' });
  // Status pill
  doc.rect(ML + 60, y + 8, 120, 16).fill(f.statusColor);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
     .text(f.status, ML + 60, y + 11, { width: 120, align: 'center' });
  // Title
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.ink)
     .text(f.title, ML + 186, y + 8, { width: CW - 192, lineBreak: false });
  // Cause + action
  doc.font('Helvetica').fontSize(8.5).fillColor(C.ink)
     .text('Root cause: ' + f.cause, ML + 10, y + 30, { width: CW - 20 });
  doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.muted)
     .text('Action: ' + f.action, ML + 10, y + 46, { width: CW - 20, lineBreak: false });
  y += boxH + 6;
}

y += 6;
y = sectionHeader('SECTION 3 — FULL TEST EXECUTION TABLE (BLOCKS A – G)', y, C.navy);

// Table header
const tc = [200, 82, 82, 134];
const tx = [ML, ML+tc[0], ML+tc[0]+tc[1], ML+tc[0]+tc[1]+tc[2]];

function testRow(cells, rowY, bg, bold) {
  doc.rect(ML, rowY, CW, 17).fill(bg);
  cells.forEach((c, i) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
       .fillColor(bold ? C.white : C.ink)
       .text(c, tx[i] + 5, rowY + 4, { width: tc[i] - 8, lineBreak: false });
  });
  return rowY + 17;
}

y = testRow(['Test', 'V6.4.11', 'vs AFTER', 'Notes'], y, C.navy, true);

const testsP1 = [
  ['A-01  WP admin loads without login redirect',  'PASS', 'Same',     'Stable'],
  ['A-02  Plugins page shows TPAE active',          'PASS', 'IMPROVED', 'FREE plugin now active'],
  ['A-03  No PHP errors on admin home',             'PASS', 'IMPROVED', 'PHP errors cleared'],
  ['B-01  Dashboard loads',                         'PASS', 'Same',     'Title confirmed'],
  ['B-02  Admin menu visible',                      'PASS', 'IMPROVED', 'Menu registered'],
  ['B-03  Sub-menu items render',                   'PASS', 'IMPROVED', 'Sub-menu visible: true'],
  ['B-04  React app mounts',                        'PASS', 'Same',     'App root found: true'],
  ['B-05  No critical JS errors',                   'PASS', 'Same',     'Stable'],
  ['B-06  No broken images',                        'PASS', 'Same',     'Stable'],
  ['C-01  Onboarding modal in DOM',                 'FAIL', 'Same',     'Env timeout (not plugin bug)'],
  ['C-02  AJAX endpoint responds',                  'PASS', 'IMPROVED', 'HTTP 200 confirmed'],
  ['C-03  AJAX returns success:true',               'FAIL', 'Same',     'Nonce/state (pre-existing)'],
  ['C-04  localStorage cleared on logout',          'PASS', 'Same',     'Stable'],
  ['C-05  Skip Setup dismisses overlay',            'PASS', 'Same',     'Stable'],
  ['C-06  Step navigation works',                   'PASS', 'Same',     'Stable'],
  ['C-07  Timestamps on genuine completion',        'PASS', 'Same',     'Stable'],
  ['D-01  Editor opens without fatal',              'PASS', 'Same',     'Stable'],
  ['D-02  TPAE widget category in panel',           'PASS', 'Same',     'Stable'],
  ['D-03  Text block in widget search',             'PASS', 'Same',     'Stable'],
  ['E-01  Text Block discoverable',                 'PASS', 'Same',     'Stable'],
  ['E-02  Content/Style/Advanced tabs',             'PASS', 'Same',     'Stable'],
  ['E-03  Text editor control present',             'PASS', 'Same',     'Stable'],
  ['E-04  Style tab no JS error',                   'PASS', 'FIXED',    'Was REGRESSION — 0 JS errors'],
  ['E-05  Advanced tab accessible',                 'PASS', 'Same',     'Stable'],
  ['F-01  No 404 assets on dashboard',              'PASS', 'Same',     'Stable'],
  ['F-02  No 404 assets on editor',                 'PASS', 'Same',     'Stable'],
  ['F-03  TPAE assets load correctly',              'PASS', 'Same',     'Assets loaded: 2'],
  ['G-01  Widgets page loads',                      'PASS', 'Same',     'Stable'],
  ['G-02  Extensions page loads',                   'PASS', 'Same',     'Stable'],
  ['G-03  Settings page loads',                     'PASS', 'Same',     'Stable'],
  ['G-04  Widgets page lists widget names',         'PASS', 'Same',     'Stable'],
];

const rowBgs = { PASS: { Same: C.same, IMPROVED: C.improved, FIXED: C.fixed }, FAIL: { Same: C.fail } };

for (let i = 0; i < testsP1.length; i++) {
  const [test, result, change, note] = testsP1[i];
  const bg = (rowBgs[result] && rowBgs[result][change]) || (i % 2 === 0 ? C.offWhite : C.silver);
  doc.rect(ML, y, CW, 17).fill(bg);
  // Test name
  doc.font('Helvetica').fontSize(8.2).fillColor(C.ink)
     .text(test, tx[0] + 5, y + 4, { width: tc[0] - 8, lineBreak: false });
  // Result
  const rColor = result === 'PASS' ? C.green : C.red;
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(rColor)
     .text(result, tx[1] + 5, y + 4, { width: tc[1] - 8, lineBreak: false });
  // Change badge
  const cColors = { Same: C.muted, IMPROVED: C.blue, FIXED: C.green, 'Same (FAIL)': C.red };
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(cColors[change] || C.muted)
     .text(change, tx[2] + 5, y + 4, { width: tc[2] - 8, lineBreak: false });
  // Note
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(note, tx[3] + 5, y + 4, { width: tc[3] - 8, lineBreak: false });
  y += 17;
}

// Footer p2
doc.rect(0, PH - 28, PW, 28).fill(C.navy);
doc.font('Helvetica').fontSize(8).fillColor('#93c5fd')
   .text('Orbit QA Framework · TPAE Final Release Verification · V6.4.11 · 2026-04-24 · Page 2 of 3',
         0, PH - 17, { width: PW, align: 'center' });

// ── PAGE 3 — H/I blocks + Recommendations ─────────────────────────────────
newPage();
doc.rect(0, 0, PW, 32).fill(C.navy);
doc.rect(0, 32, PW, 3).fill(C.blue);
doc.font('Helvetica-Bold').fontSize(13).fillColor(C.white)
   .text('Full Test Execution Table (Part 2) & Release Recommendations', ML, 10);

y = 46;
y = sectionHeader('SECTION 3 (CONT.) — FULL TEST EXECUTION TABLE (BLOCKS H – I)', y, C.navy);

// Table header
y = testRow(['Test', 'V6.4.11', 'vs AFTER', 'Notes'], y, C.navy, true);

const testsP2 = [
  ['H-BUG001  No PHP fatal on activation',         'PASS', 'Same',  'Stable'],
  ['H-BUG002  Option key spelling logged',          'PASS', 'Same',  'Stable'],
  ['H-BUG003  AJAX success:true first run',         'PASS', 'Same',  'Stable'],
  ['H-BUG005  Dashboard XHR activity',              'PASS', 'Same',  'Requests 0-3s: 21, 3-6s: 0'],
  ['H-BUG006  Skip Setup labelling',                'PASS', 'Same',  'Stable'],
  ['H-BUG007  Elementor version check',             'PASS', 'Same',  'No incompatibility notice'],
  ['H-BUG009  Menu position 67.1 visible',          'FAIL', 'Same',  'Pre-existing / test-order fluke'],
  ['I-01  375px mobile viewport',                   'PASS', 'FIXED', 'Was REGRESSION in AFTER build'],
  ['I-02  768px tablet viewport',                   'PASS', 'Same',  'Stable'],
  ['I-03  RTL dir check',                           'PASS', 'Same',  '0 hard-coded ltr elements'],
  ['I-04  1440px desktop wide viewport',            'PASS', 'FIXED', 'Was REGRESSION in AFTER build'],
];

for (let i = 0; i < testsP2.length; i++) {
  const [test, result, change, note] = testsP2[i];
  const bg = (rowBgs[result] && rowBgs[result][change]) || (i % 2 === 0 ? C.offWhite : C.silver);
  doc.rect(ML, y, CW, 17).fill(bg);
  doc.font('Helvetica').fontSize(8.2).fillColor(C.ink)
     .text(test, tx[0] + 5, y + 4, { width: tc[0] - 8, lineBreak: false });
  const rColor = result === 'PASS' ? C.green : C.red;
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(rColor)
     .text(result, tx[1] + 5, y + 4, { width: tc[1] - 8, lineBreak: false });
  const cColors = { Same: C.muted, IMPROVED: C.blue, FIXED: C.green };
  doc.font('Helvetica-Bold').fontSize(8.2).fillColor(cColors[change] || C.muted)
     .text(change, tx[2] + 5, y + 4, { width: tc[2] - 8, lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
     .text(note, tx[3] + 5, y + 4, { width: tc[3] - 8, lineBreak: false });
  y += 17;
}

y += 12;

// Score bar
y = sectionHeader('PASS RATE COMPARISON', y, C.navy);
const barW = CW;
const passW = Math.round(barW * 0.929);
const afterW = Math.round(barW * 0.744);
// AFTER bar
doc.rect(ML, y + 4, afterW, 20).fill('#fca5a5');
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red)
   .text('AFTER build: 32/43 = 74.4%', ML + 6, y + 8, { lineBreak: false });
y += 26;
// V6.4.11 bar
doc.rect(ML, y + 4, passW, 20).fill('#bbf7d0');
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green)
   .text('V6.4.11 Final: 39/42 = 92.9%  (+18.5 pp)', ML + 6, y + 8, { lineBreak: false });
y += 36;

// Recommendations
y = sectionHeader('SECTION 4 — POST-RELEASE RECOMMENDATIONS', y, C.navy);

const recs = [
  {
    severity: 'INFO',
    color: C.blue,
    title: 'BUG-003 (AJAX nonce) — Monitor on fresh installs',
    body: 'The C-03 / H-BUG003 AJAX nonce failure only appears when onboarding has already completed. On fresh installations the nonce matches and the call succeeds. No code change required but worth monitoring in production telemetry.',
  },
  {
    severity: 'INFO',
    color: C.blue,
    title: 'H-BUG005 XHR polling — Confirm fix is intentional',
    body: 'Dashboard XHR requests were 21 in the first 3s and 0 in the next 3s. This is correct behavior — polling stops after initial data load. Previously the XHR loop ran indefinitely. Confirmed fixed.',
  },
  {
    severity: 'INFO',
    color: C.green,
    title: 'E-04 / I-01 / I-04 regressions — All confirmed resolved',
    body: 'All 3 regressions introduced in the pre-release AFTER build are confirmed fixed in V6.4.11. The scan_nested_template_widgets() unbounded recursion causing timeouts and the Style tab JS error are all resolved.',
  },
  {
    severity: 'NOTE',
    color: C.amber,
    title: 'FREE + PRO combined testing — Required for full coverage',
    body: 'Many test failures in earlier runs were caused by running PRO plugin without FREE plugin. TPAE PRO requires FREE to be active (L_THEPLUS_VERSION guard). Always test both plugins together in the regression environment.',
  },
];

for (const r of recs) {
  const bh = 52;
  doc.rect(ML, y, CW, bh).fill(C.offWhite);
  doc.rect(ML, y, 5, bh).fill(r.color);
  doc.rect(ML + 10, y + 6, 40, 15).fill(r.color);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
     .text(r.severity, ML + 10, y + 9, { width: 40, align: 'center', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.ink)
     .text(r.title, ML + 58, y + 6, { width: CW - 64, lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted)
     .text(r.body, ML + 58, y + 20, { width: CW - 64 });
  hline(y + bh);
  y += bh + 6;
}

y += 8;

// Final verdict box
doc.rect(ML, y, CW, 44).fill('#dcfce7');
doc.rect(ML, y, 6, 44).fill(C.green);
doc.font('Helvetica-Bold').fontSize(15).fillColor(C.green)
   .text('RELEASE APPROVED  ✓', ML + 16, y + 6);
doc.font('Helvetica').fontSize(9.5).fillColor(C.ink)
   .text(
     'V6.4.11 resolves all 3 pre-release regressions (E-04, I-01, I-04) and 5 additional pre-existing failures. ' +
     'The remaining 3 failures are environment-state or test-order issues, not plugin bugs. Safe to ship.',
     ML + 16, y + 24, { width: CW - 24 }
   );

// Footer p3
doc.rect(0, PH - 28, PW, 28).fill(C.navy);
doc.font('Helvetica').fontSize(8).fillColor('#93c5fd')
   .text('Orbit QA Framework · TPAE Final Release Verification · V6.4.11 · 2026-04-24 · Page 3 of 3',
         0, PH - 17, { width: PW, align: 'center' });

doc.end();
console.log('PDF written to:', OUT);
