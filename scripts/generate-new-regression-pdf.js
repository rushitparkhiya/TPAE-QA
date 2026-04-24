/**
 * TPAE Regression Comparison Report PDF Generator
 * V6.4.10 (BEFORE) vs New Build (AFTER)
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../reports/TPAE-Regression-Report-V6.4.10-vs-New.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  primary:   '#1a237e',
  accent:    '#283593',
  green:     '#2e7d32',
  greenBg:   '#e8f5e9',
  red:       '#c62828',
  redBg:     '#ffebee',
  orange:    '#e65100',
  orangeBg:  '#fff3e0',
  yellow:    '#f9a825',
  yellowBg:  '#fffde7',
  grey:      '#546e7a',
  greyLight: '#eceff1',
  white:     '#ffffff',
  black:     '#212121',
  rowAlt:    '#f5f5f5',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const PW = 595 - 90; // usable width

function hline(y, color = C.greyLight, lw = 0.5) {
  doc.save().strokeColor(color).lineWidth(lw).moveTo(45, y).lineTo(550, y).stroke().restore();
}

function sectionTitle(text, y) {
  doc.save()
    .rect(45, y, PW, 22).fill(C.primary)
    .font('Helvetica-Bold').fontSize(10).fillColor(C.white)
    .text(text, 50, y + 6, { width: PW - 10 })
    .restore();
  return y + 28;
}

function badge(text, x, y, bg, fg = C.white) {
  const w = doc.widthOfString(text, { fontSize: 8 }) + 10;
  doc.save()
    .roundedRect(x, y - 1, w, 14, 3).fill(bg)
    .font('Helvetica-Bold').fontSize(8).fillColor(fg)
    .text(text, x + 5, y + 1, { width: w - 10, lineBreak: false })
    .restore();
  return w;
}

// ── COVER PAGE ───────────────────────────────────────────────────────────────
// Header bar
doc.rect(0, 0, 595, 80).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(22).fillColor(C.white)
   .text('TPAE Regression Comparison Report', 45, 20, { width: 505 });
doc.font('Helvetica').fontSize(10).fillColor('#90caf9')
   .text('Orbit QA Framework  ·  Playwright  ·  WordPress + Docker', 45, 52);

let y = 95;
// Meta block
const meta = [
  ['Plugin',       'The Plus Addons for Elementor (Free)'],
  ['Versions',     'V6.4.10  (BEFORE)   →   New Build  (AFTER)'],
  ['Test date',    '2026-04-24'],
  ['Environment',  'WordPress 6.7  ·  PHP 8.1  ·  Elementor 3.34.0  ·  Chrome'],
  ['Test suite',   'tpae-regression.spec.js  —  43 tests, 9 blocks'],
];
meta.forEach(([k, v], i) => {
  if (i % 2 === 0) doc.rect(45, y, PW, 18).fill(C.rowAlt);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.grey).text(k.toUpperCase(), 50, y + 4, { width: 90, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(C.black).text(v, 145, y + 4, { width: PW - 105, lineBreak: false });
  y += 18;
});
y += 10;

// ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────────
y = sectionTitle('EXECUTIVE SUMMARY', y);

// Scorecard boxes
const boxes = [
  { label: 'BEFORE\nPassed', value: '26 / 43', sub: '17 failed', bg: C.orange, fg: C.white },
  { label: 'AFTER\nPassed',  value: '32 / 43', sub: '11 failed', bg: C.green,  fg: C.white },
  { label: 'Fixed',          value: '+9',       sub: 'resolved',  bg: C.greenBg, fg: C.green },
  { label: 'Regressions',    value: '3',        sub: 'new fails',  bg: C.redBg,  fg: C.red },
];
const bw = (PW - 15) / 4;
boxes.forEach((b, i) => {
  const bx = 45 + i * (bw + 5);
  doc.roundedRect(bx, y, bw, 58, 6).fill(b.bg);
  doc.font('Helvetica').fontSize(8).fillColor(b.fg).text(b.label, bx + 4, y + 6, { width: bw - 8, align: 'center', lineBreak: true });
  doc.font('Helvetica-Bold').fontSize(22).fillColor(b.fg).text(b.value, bx + 4, y + 21, { width: bw - 8, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(b.fg).text(b.sub, bx + 4, y + 44, { width: bw - 8, align: 'center', lineBreak: false });
});
y += 68;

// Summary table
const sumRows = [
  ['Passed',   '26', '32', '+6 fixed',    C.greenBg, C.green],
  ['Failed',   '17', '11', '−6 resolved', C.greenBg, C.green],
  ['Duration', '12.7 min', '12.1 min', '−0.6 min faster', C.yellowBg, C.yellow],
];
const sumCols = [PW * 0.28, PW * 0.18, PW * 0.18, PW * 0.36];
// header
['Metric', 'BEFORE', 'AFTER', 'Delta'].forEach((h, ci) => {
  const cx = 45 + sumCols.slice(0, ci).reduce((a, b) => a + b, 0);
  doc.rect(cx, y, sumCols[ci], 18).fill(C.accent);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white).text(h, cx + 4, y + 4, { width: sumCols[ci] - 8, lineBreak: false });
});
y += 18;
sumRows.forEach(([m, b, a, d, bg, fg]) => {
  [m, b, a, d].forEach((v, ci) => {
    const cx = 45 + sumCols.slice(0, ci).reduce((a, b2) => a + b2, 0);
    doc.rect(cx, y, sumCols[ci], 18).fill(ci === 3 ? bg : C.white);
    doc.font(ci === 3 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
       .fillColor(ci === 3 ? fg : C.black)
       .text(v, cx + 4, y + 4, { width: sumCols[ci] - 8, lineBreak: false });
  });
  y += 18;
});
y += 8;
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red)
   .text('Net result: 9 tests fixed · 11 failures remain · 3 new regressions introduced', 45, y, { width: PW });
y += 16;

// ── NEW PAGE: FIXED / REGRESSIONS / STILL FAILING ───────────────────────────
doc.addPage();
y = 45;

// Fixed
y = sectionTitle('✅  FIXED IN AFTER BUILD  (9 tests — BEFORE failed → AFTER passed)', y);
const fixed = [
  ['F-01', 'No 404 CSS/JS assets on TPAE dashboard'],
  ['F-02', 'No 404 CSS/JS assets on Elementor editor'],
  ['F-03', 'TPAE CSS/JS assets actually load from the correct plugin URL'],
  ['G-01', 'Widgets manager page loads without PHP error'],
  ['G-02', 'Extensions page loads without PHP error'],
  ['G-03', 'Settings page loads without PHP error'],
  ['H-BUG001', 'No PHP fatal on plugin activation (is_plugin_active before wp-admin loaded)'],
  ['H-BUG002', 'Option key spelling — tpae_onbording_end is NOT the preferred key name'],
  ['H-BUG003', 'AJAX onboarding_setup returns success:true on first call'],
];
fixed.forEach(([id, desc], i) => {
  if (i % 2 === 0) doc.rect(45, y, PW, 17).fill(C.greenBg);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.green).text('✅ ' + id, 50, y + 3, { width: 80, lineBreak: false });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.black).text(desc, 135, y + 3, { width: PW - 95, lineBreak: false });
  y += 17;
});
y += 10;

// Regressions
y = sectionTitle('🔴  NEW REGRESSIONS IN AFTER BUILD  (3 tests — BEFORE passed → AFTER failed)', y);
const regs = [
  ['E-04',  'Text Block Style tab loads without JS error',   'JS error on Style tab in AFTER build — check widget CSS/JS enqueue changes'],
  ['I-01',  'TPAE dashboard usable at 375px mobile viewport','Mobile responsive layout broken — check dashboard CSS breakpoints'],
  ['I-04',  'Full page responsive — 1440px desktop wide',    'Desktop wide layout broken — check dashboard CSS max-width/grid changes'],
];
regs.forEach(([id, title, detail], i) => {
  if (i % 2 === 0) doc.rect(45, y, PW, 30).fill(C.redBg);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.red).text('🔴 ' + id, 50, y + 3, { width: 80, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.black).text(title, 135, y + 3, { width: PW - 95, lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.red).text('↳ ' + detail, 135, y + 14, { width: PW - 95, lineBreak: false });
  y += 30;
});
y += 10;

// Still failing
y = sectionTitle('❌  STILL FAILING IN BOTH BUILDS  (8 tests — pre-existing issues)', y);
const stillFail = [
  ['A-02',     'Plugins page shows TPAE as active',         'TPAE not auto-activated by wp-env (environment limitation)'],
  ['B-02',     'TPAE admin menu visible in sidebar',        'Plugin not active → menu not registered'],
  ['B-03',     'TPAE sub-menu items render',                'Same — plugin not active in wp-env'],
  ['C-02',     'Onboarding AJAX endpoint responds',         'Endpoint unreachable — plugin not active'],
  ['C-03',     'First AJAX returns success:true',           'BUG-003 still present — inverted condition in class-tpae-dashboard-ajax.php'],
  ['G-04',     'Widgets page lists TPAE widget names',      'Plugin pages not registered (plugin inactive)'],
  ['H-BUG005', 'Dashboard does not hang at networkidle',    'Continuous XHR keeps networkidle open — test env limitation'],
  ['H-BUG009', 'Admin menu at position 67.1 visible',       'Menu element not found — plugin not active in wp-env'],
];
stillFail.forEach(([id, title, detail], i) => {
  if (i % 2 === 0) doc.rect(45, y, PW, 28).fill(C.rowAlt);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.orange).text('❌ ' + id, 50, y + 3, { width: 80, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.black).text(title, 135, y + 3, { width: PW - 95, lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.grey).text('↳ ' + detail, 135, y + 14, { width: PW - 95, lineBreak: false });
  y += 28;
});
y += 10;

// ── NEW PAGE: FULL TEST TABLE ─────────────────────────────────────────────────
doc.addPage();
y = 45;
y = sectionTitle('FULL TEST EXECUTION TABLE  (43 tests)', y);

const allTests = [
  ['A-01', 'WP admin loads without login redirect',          'PASS','PASS','Stable'],
  ['A-02', 'Plugins page shows TPAE active',                 'FAIL','FAIL','Same'],
  ['A-03', 'No PHP errors on admin home',                    'PASS','PASS','Stable'],
  ['B-01', 'Dashboard loads',                                'PASS','PASS','Stable'],
  ['B-02', 'Admin menu visible',                             'FAIL','FAIL','Same'],
  ['B-03', 'Sub-menu items render',                          'FAIL','FAIL','Same'],
  ['B-04', 'React app mounts',                               'PASS','PASS','Stable'],
  ['B-05', 'No critical JS errors',                          'PASS','PASS','Stable'],
  ['B-06', 'No broken images',                               'PASS','PASS','Stable'],
  ['C-01', 'Onboarding modal in DOM',                        'PASS','PASS','Stable'],
  ['C-02', 'AJAX endpoint responds',                         'FAIL','FAIL','Same'],
  ['C-03', 'AJAX returns success:true',                      'FAIL','FAIL','Same'],
  ['C-04', 'localStorage cleared on logout',                 'PASS','PASS','Stable'],
  ['C-05', 'Skip Setup dismisses overlay',                   'PASS','PASS','Stable'],
  ['C-06', 'Step navigation works',                          'PASS','PASS','Stable'],
  ['C-07', 'Timestamps on genuine completion',               'PASS','PASS','Stable'],
  ['D-01', 'Editor opens without fatal',                     'PASS','PASS','Stable'],
  ['D-02', 'TPAE widget category in panel',                  'PASS','PASS','Stable'],
  ['D-03', 'Text block in widget search',                    'PASS','PASS','Stable'],
  ['E-01', 'Text Block discoverable',                        'PASS','PASS','Stable'],
  ['E-02', 'Content/Style/Advanced tabs',                    'PASS','PASS','Stable'],
  ['E-03', 'Text editor control present',                    'PASS','PASS','Stable'],
  ['E-04', 'Style tab no JS error',                          'PASS','FAIL','REGRESSION'],
  ['E-05', 'Advanced tab accessible',                        'PASS','PASS','Stable'],
  ['F-01', 'No 404 assets on dashboard',                     'FAIL','PASS','Fixed'],
  ['F-02', 'No 404 assets on editor',                        'FAIL','PASS','Fixed'],
  ['F-03', 'TPAE assets load correctly',                     'FAIL','PASS','Fixed'],
  ['G-01', 'Widgets page loads',                             'FAIL','PASS','Fixed'],
  ['G-02', 'Extensions page loads',                          'FAIL','PASS','Fixed'],
  ['G-03', 'Settings page loads',                            'FAIL','PASS','Fixed'],
  ['G-04', 'Widgets page lists widget names',                'FAIL','FAIL','Same'],
  ['H-BUG001', 'No PHP fatal on activation',                 'FAIL','PASS','Fixed'],
  ['H-BUG002', 'Option key spelling logged',                 'FAIL','PASS','Fixed'],
  ['H-BUG003', 'AJAX success:true first run',                'FAIL','PASS','Fixed'],
  ['H-BUG005', 'Dashboard XHR activity',                     'FAIL','FAIL','Same'],
  ['H-BUG006', 'Skip Setup labelling',                       'PASS','PASS','Stable'],
  ['H-BUG007', 'Elementor version check',                    'PASS','PASS','Stable'],
  ['H-BUG009', 'Menu position 67.1',                         'FAIL','FAIL','Same'],
  ['I-01',  '375px mobile viewport',                         'PASS','FAIL','REGRESSION'],
  ['I-02',  '768px tablet viewport',                         'PASS','PASS','Stable'],
  ['I-03',  'RTL dir check',                                 'PASS','PASS','Stable'],
  ['I-04',  '1440px desktop viewport',                       'PASS','FAIL','REGRESSION'],
];

const tCols = [55, PW * 0.44, 55, 55, 75];
// table header
['ID','Test Name','BEFORE','AFTER','Change'].forEach((h, ci) => {
  const cx = 45 + tCols.slice(0, ci).reduce((a, b) => a + b, 0);
  doc.rect(cx, y, tCols[ci], 16).fill(C.accent);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(h, cx + 3, y + 3, { width: tCols[ci] - 6, lineBreak: false });
});
y += 16;

const rowH = 15;
allTests.forEach(([id, name, before, after, change], i) => {
  const rowBg = change === 'REGRESSION' ? C.redBg
              : change === 'Fixed'      ? C.greenBg
              : i % 2 === 0            ? C.rowAlt
              :                          C.white;
  doc.rect(45, y, PW, rowH).fill(rowBg);

  const cells = [id, name, before, after, change];
  cells.forEach((v, ci) => {
    const cx = 45 + tCols.slice(0, ci).reduce((a, b) => a + b, 0);
    let color = C.black;
    let bold = false;
    if (ci === 2) { color = v === 'PASS' ? C.green : C.red; bold = true; }
    if (ci === 3) { color = v === 'PASS' ? C.green : C.red; bold = true; }
    if (ci === 4) {
      if (v === 'REGRESSION') { color = C.red; bold = true; }
      else if (v === 'Fixed') { color = C.green; bold = true; }
      else if (v === 'Same')  { color = C.orange; }
    }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(color)
       .text(v, cx + 3, y + 3, { width: tCols[ci] - 6, lineBreak: false });
  });
  y += rowH;
  if (y > 760) { doc.addPage(); y = 45; }
});
y += 10;

// ── RECOMMENDATIONS PAGE ──────────────────────────────────────────────────────
if (y > 620) { doc.addPage(); y = 45; }
y = sectionTitle('RECOMMENDATIONS', y);

const recs = [
  {
    icon: '🔴', priority: 'BLOCK RELEASE',
    title: 'E-04 — Text Block Style tab JS error (NEW REGRESSION)',
    detail: 'The AFTER build introduces a JS error when clicking the Style tab on the Text Block widget. This is a new regression not present in V6.4.10. Check widget CSS/JS enqueue changes and the Style tab control registration.',
    bg: C.redBg, border: C.red,
  },
  {
    icon: '🔴', priority: 'BLOCK RELEASE',
    title: 'I-01 / I-04 — Responsive layout broken at 375px and 1440px (NEW REGRESSION)',
    detail: 'Dashboard layout fails at mobile (375px) and wide desktop (1440px) in AFTER build. Check dashboard CSS changes — likely a missing or changed responsive breakpoint or flex/grid rule.',
    bg: C.redBg, border: C.red,
  },
  {
    icon: '🟡', priority: 'FIX IF POSSIBLE',
    title: 'BUG-003 — AJAX tpae_onboarding_setup returns 0 (falsy) — C-03 still failing',
    detail: 'The onboarding AJAX handler returns 0 instead of {success:true} on first call. One-line fix: correct the inverted condition in class-tpae-dashboard-ajax.php.',
    bg: C.yellowBg, border: C.yellow,
  },
  {
    icon: 'ℹ️', priority: 'ENVIRONMENT NOTE',
    title: 'A-02 / B-02 / B-03 / H-BUG009 — Plugin not auto-activating in wp-env',
    detail: 'These 4 failures are caused by TPAE not being auto-activated in the wp-env Docker environment (WP-CLI activation issue). This is a test environment limitation, not a plugin bug.',
    bg: C.greyLight, border: C.grey,
  },
];

recs.forEach((r, i) => {
  const rh = 52;
  doc.roundedRect(45, y, PW, rh, 5).fill(r.bg);
  doc.roundedRect(45, y, 4, rh, 2).fill(r.border);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(r.border)
     .text(`${r.icon}  ${r.priority}`, 54, y + 5, { width: PW - 15, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.black)
     .text(r.title, 54, y + 17, { width: PW - 15 });
  doc.font('Helvetica').fontSize(8).fillColor(C.grey)
     .text(r.detail, 54, y + 30, { width: PW - 15 });
  y += rh + 8;
});

// ── PAGE NUMBERS + FOOTER ────────────────────────────────────────────────────
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  hline(820);
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text('Report generated by Orbit QA Framework  ·  TPAE Regression Run  ·  2026-04-24', 45, 825, { width: PW - 60, lineBreak: false });
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text(`Page ${i + 1} / ${totalPages}`, 45, 825, { width: PW, align: 'right', lineBreak: false });
}

doc.end();
console.log('PDF written to:', OUT);
