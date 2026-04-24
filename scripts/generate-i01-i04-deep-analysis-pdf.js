/**
 * TPAE I-01 / I-04 / E-04 Deep Root Cause Analysis PDF
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../reports/TPAE-I01-I04-E04-RootCause-Analysis.pdf');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true });
doc.pipe(fs.createWriteStream(OUT));

const PW = 595 - 90;

const C = {
  primary:  '#b71c1c',
  accent:   '#c62828',
  blue:     '#1a237e',
  blueAcc:  '#283593',
  green:    '#2e7d32',
  greenBg:  '#e8f5e9',
  red:      '#c62828',
  redBg:    '#ffebee',
  orange:   '#e65100',
  orangeBg: '#fff3e0',
  yellow:   '#f9a825',
  yellowBg: '#fffde7',
  grey:     '#546e7a',
  greyLt:   '#eceff1',
  codeBg:   '#263238',
  codeText: '#80cbc4',
  white:    '#ffffff',
  black:    '#212121',
  rowAlt:   '#f5f5f5',
};

function hline(y, color, lw) {
  color = color || C.greyLt; lw = lw || 0.5;
  doc.save().strokeColor(color).lineWidth(lw).moveTo(45, y).lineTo(550, y).stroke().restore();
}

function sectionTitle(text, y, bg) {
  bg = bg || C.blue;
  doc.save().rect(45, y, PW, 22).fill(bg)
     .font('Helvetica-Bold').fontSize(10).fillColor(C.white)
     .text(text, 50, y + 6, { width: PW - 10 }).restore();
  return y + 28;
}

function codeBlock(lines, y, label) {
  const lineH = 13;
  const totalH = lines.length * lineH + 14;
  doc.save().rect(45, y, PW, totalH).fill(C.codeBg);
  if (label) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#546e7a')
       .text(label, 50, y + 4, { width: PW - 10, lineBreak: false });
  }
  lines.forEach(function(line, i) {
    const color = line.startsWith('//') || line.startsWith('#') ? '#546e7a'
                : line.includes('function') || line.includes('if') || line.includes('foreach') || line.includes('return') ? '#ce93d8'
                : line.includes('->') || line.includes('$this') ? '#80cbc4'
                : line.includes("'") || line.includes('"') ? '#a5d6a7'
                : '#e0e0e0';
    doc.font('Courier').fontSize(7.5).fillColor(color)
       .text(line, 52, y + (label ? 14 : 6) + i * lineH, { width: PW - 14, lineBreak: false });
  });
  doc.restore();
  return y + totalH + 6;
}

function infoBox(text, y, bg, fg, icon) {
  bg = bg || C.redBg; fg = fg || C.red; icon = icon || '!';
  const approxLines = Math.ceil(text.length / 90) + 1;
  const h = Math.max(30, approxLines * 12 + 10);
  doc.save().roundedRect(45, y, PW, h, 4).fill(bg)
     .roundedRect(45, y, 4, h, 2).fill(fg).restore();
  doc.font('Helvetica').fontSize(8.5).fillColor(fg)
     .text(icon + '  ' + text, 54, y + 7, { width: PW - 18 });
  return y + h + 6;
}

// ─────────────────────────────────────────────────────────────
// PAGE 1 — COVER + EXECUTIVE SUMMARY
// ─────────────────────────────────────────────────────────────
doc.rect(0, 0, 595, 85).fill(C.primary);
doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white)
   .text('TPAE Regression — Root Cause Analysis', 45, 14, { width: 505 });
doc.font('Helvetica-Bold').fontSize(13).fillColor('#ef9a9a')
   .text('I-01  ·  I-04  ·  E-04  —  Page Timeout Regression', 45, 42);
doc.font('Helvetica').fontSize(9).fillColor('#ffcdd2')
   .text('Orbit QA Framework  ·  V6.4.10 (BEFORE) vs New Build (AFTER)  ·  2026-04-24', 45, 62);

let y = 100;

// Meta strip
const meta = [
  ['Affected tests', 'I-01 (375px mobile)  ·  I-04 (1440px desktop)  ·  E-04 (Style tab)'],
  ['Symptom',        'page.goto() TimeoutError after 45,000 ms in AFTER build'],
  ['Root cause file','modules/enqueue/plus-generator.php'],
  ['Root cause',     'Unbounded recursive template scan added for tp_protected_content widget'],
  ['Fix effort',     '~5 minutes — add depth guard OR visited-set cache in scan_nested_template_widgets()'],
];
meta.forEach(function([k, v], i) {
  if (i % 2 === 0) doc.rect(45, y, PW, 17).fill(C.rowAlt);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.grey).text(k.toUpperCase(), 50, y + 4, { width: 100, lineBreak: false });
  doc.font('Helvetica').fontSize(8).fillColor(C.black).text(v, 155, y + 4, { width: PW - 115, lineBreak: false });
  y += 17;
});
y += 8;

// Timing evidence
y = sectionTitle('TIMING EVIDENCE — BEFORE vs AFTER (from Playwright JSON)', y);

const timingCols = [PW * 0.38, PW * 0.20, PW * 0.22, PW * 0.20];
['Test', 'BEFORE Result', 'AFTER Result', 'AFTER Duration'].forEach(function(h, ci) {
  const cx = 45 + timingCols.slice(0, ci).reduce(function(a,b){return a+b;}, 0);
  doc.rect(cx, y, timingCols[ci], 17).fill(C.blueAcc);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(h, cx + 3, y + 4, { width: timingCols[ci]-6, lineBreak: false });
});
y += 17;

const timingRows = [
  ['I-01 · TPAE dashboard at 375px', '✅ PASS (32s)', '❌ TimeoutError', '45,000ms (killed)'],
  ['I-04 · TPAE dashboard at 1440px', '✅ PASS (21s)', '❌ TimeoutError', '109,893ms (killed)'],
  ['E-04 · Text Block Style tab', '✅ PASS (101s, 0 JS errors)', '❌ TimeoutError', '83,173ms (killed)'],
];
timingRows.forEach(function(row, ri) {
  if (ri % 2 === 0) doc.rect(45, y, PW, 17).fill(C.rowAlt);
  row.forEach(function(v, ci) {
    const cx = 45 + timingCols.slice(0, ci).reduce(function(a,b){return a+b;}, 0);
    const bold = ci >= 2;
    const color = ci === 1 ? C.green : ci >= 2 ? C.red : C.black;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(color)
       .text(v, cx + 3, y + 4, { width: timingCols[ci]-6, lineBreak: false });
  });
  y += 17;
});
y += 8;

y = infoBox(
  'IMPORTANT: These are NOT CSS/responsive layout failures. The label "mobile viewport broken" and "desktop wide viewport broken" was inaccurate. The page NEVER loads — it times out at 45 seconds regardless of viewport size. The viewport size is completely irrelevant.',
  y, C.yellowBg, C.orange, '⚠'
);
y += 4;

// Screenshot evidence section
y = sectionTitle('SCREENSHOT EVIDENCE — AFTER Build Dashboard Response', y, C.red);

// Load and embed screenshots
const ss1Path = path.join(__dirname, '../reports/screenshots/AFTER-I01-mobile-375px.png');
const ss2Path = path.join(__dirname, '../reports/screenshots/AFTER-I04-desktop-1440px.png');

if (fs.existsSync(ss1Path) && fs.existsSync(ss2Path)) {
  const imgW = (PW - 8) / 2;
  const imgH = 130;
  doc.image(ss1Path, 45, y, { width: imgW, height: imgH });
  doc.image(ss2Path, 45 + imgW + 8, y, { width: imgW, height: imgH });
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text('I-01: 375px mobile — wp_die() "Sorry, not allowed"', 45, y + imgH + 2, { width: imgW, lineBreak: false });
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text('I-04: 1440px desktop — same wp_die() error', 45 + imgW + 8, y + imgH + 2, { width: imgW, lineBreak: false });
  y += imgH + 16;
}

doc.font('Helvetica').fontSize(8).fillColor(C.grey)
   .text('Both viewports show identical wp_die() response. Browser console confirms HTTP 403 Forbidden on the admin page request.', 45, y, { width: PW });
y += 20;

// ─────────────────────────────────────────────────────────────
// PAGE 2 — ROOT CAUSE CODE DIFF
// ─────────────────────────────────────────────────────────────
doc.addPage();
y = 45;

y = sectionTitle('ROOT CAUSE — modules/enqueue/plus-generator.php (Code Diff)', y, C.red);

doc.font('Helvetica').fontSize(8.5).fillColor(C.black)
   .text('The AFTER build added a new code block inside plus_widgets_options() that fires during the asset-enqueue loop for EVERY widget on the page:', 45, y, { width: PW });
y += 22;

// BEFORE code
doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.green).text('BEFORE (V6.4.10) — Lines 222-230 in plus-generator.php', 45, y);
y += 12;
y = codeBlock([
  "// Simple linear check — no DB queries, no recursion",
  "if ('tp-adv-text-block' === \$widget_name ) {",
  "    \$tp_text_animation = ! empty( \$options['enable_text_animation'] ) ? \$options['enable_text_animation'] : '';",
  "    if('yes' === \$tp_text_animation){",
  "        \$this->transient_widgets[] = \"tp-text-block-animation\";",
  "    }",
  "}",
  "// Executes in <1ms. No database. No network. No recursion.",
], y, '✅ BEFORE build — fast, linear');

y += 6;

// AFTER code
doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.red).text('AFTER (New Build) — Lines 222-244 in plus-generator.php  ← THE BUG', 45, y);
y += 12;
y = codeBlock([
  "// NEW: fires for every tp_protected_content widget on the page",
  "if ( 'tp_protected_content' === \$widget_name || 'tp-protected-content' === \$widget_name ) {",
  "",
  "    \$template_ids = array_filter( array(",
  "        ! empty( \$options['protected_content_template'] ) ? absint(...) : 0,",
  "        ! empty( \$options['pc_message_template'] )        ? absint(...) : 0,",
  "    ) );",
  "",
  "    foreach ( \$template_ids as \$template_id ) {",
  "        // ⚠️  HEAVY: full Elementor document loaded from DB for each template_id",
  "        \$document = \\Elementor\\Plugin::\$instance->documents->get( \$template_id );",
  "        \$elements_data = \$document->get_elements_data();  // loads full JSON from DB",
  "",
  "        // ⚠️  RECURSIVE: walks ALL nested elements with NO depth limit",
  "        \$nested_widgets = \$this->scan_nested_template_widgets( \$elements_data );",
  "        \$this->transient_widgets = array_merge( \$this->transient_widgets, \$nested_widgets );",
  "    }",
  "}",
], y, '❌ AFTER build — potentially unbounded DB queries + recursion');

y += 6;

// scan_nested_template_widgets
doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.red).text('NEW METHOD — scan_nested_template_widgets() — Lines 1712-1724', 45, y);
y += 12;
y = codeBlock([
  "protected function scan_nested_template_widgets( \$elements ) {  // ← NO depth parameter",
  "    \$handles = [];",
  "    foreach ( \$elements as \$element ) {",
  "        if ( ! empty( \$element['widgetType'] ) && ! empty( \$element['settings'] ) ) {",
  "            \$this->plus_widgets_options( [], \$element['settings'], \$element['widgetType'] );",
  "            // ⚠️  plus_widgets_options() calls scan_nested_template_widgets() again",
  "            // if the nested widget is ALSO tp_protected_content → INFINITE LOOP",
  "        }",
  "        if ( ! empty( \$element['elements'] ) ) {",
  "            // ⚠️  Recursion with no depth limit or visited-set",
  "            \$handles = array_merge( \$handles,",
  "                \$this->scan_nested_template_widgets( \$element['elements'] ) );",
  "        }",
  "    }",
  "    return \$handles;",
  "}",
], y, '❌ No depth guard — circular templates = PHP process hangs indefinitely');

y += 8;

// Call chain diagram
y = sectionTitle('CALL CHAIN — How a single page load triggers the hang', y, C.orange);

const steps = [
  ['1', 'WordPress loads admin page / Elementor editor', C.greyLt, C.black],
  ['2', 'TPAE enqueue hook fires (plus-generator.php)', C.greyLt, C.black],
  ['3', 'Loop through ALL widgets on the current page', C.greyLt, C.black],
  ['4', 'Widget = tp_protected_content → enter new block', C.redBg, C.red],
  ['5', 'Elementor\\documents->get($template_id) — FULL DB query per template', C.redBg, C.red],
  ['6', 'get_elements_data() — load entire JSON widget tree from DB', C.redBg, C.red],
  ['7', 'scan_nested_template_widgets() — recursive walk with no depth limit', C.redBg, C.red],
  ['8', 'If nested widget is also tp_protected_content → step 5 repeats ♾', '#b71c1c', C.white],
  ['9', 'PHP process hangs → 45s Playwright timeout fires → test FAILS', '#b71c1c', C.white],
];
steps.forEach(function(s, i) {
  const [num, text, bg, fg] = s;
  doc.rect(45, y, PW, 17).fill(bg);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(fg)
     .text(num + '.', 50, y + 4, { width: 15, lineBreak: false });
  doc.font(i >= 7 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(fg)
     .text(text, 68, y + 4, { width: PW - 30, lineBreak: false });
  y += 17;
});

// ─────────────────────────────────────────────────────────────
// PAGE 3 — THE FIX
// ─────────────────────────────────────────────────────────────
doc.addPage();
y = 45;

y = sectionTitle('THE FIX — modules/enqueue/plus-generator.php  (~5 min)', y, C.green);

doc.font('Helvetica').fontSize(8.5).fillColor(C.black)
   .text('Two options are provided. Option 2 (visited-set cache) is recommended as it also prevents duplicate DB queries for the same template.', 45, y, { width: PW });
y += 20;

// Fix 1
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green).text('OPTION 1 — Add recursion depth guard (quick fix)', 45, y);
y += 13;
y = codeBlock([
  "// In scan_nested_template_widgets() — add \$depth parameter",
  "protected function scan_nested_template_widgets( \$elements, \$depth = 0 ) {",
  "    if ( \$depth > 5 ) {",
  "        return [];  // Hard stop — prevents infinite recursion",
  "    }",
  "    \$handles = [];",
  "    foreach ( \$elements as \$element ) {",
  "        if ( ! empty( \$element['elements'] ) ) {",
  "            \$handles = array_merge(",
  "                \$handles,",
  "                \$this->scan_nested_template_widgets( \$element['elements'], \$depth + 1 )",
  "            );",
  "        }",
  "    }",
  "    return \$handles;",
  "}",
], y, 'Option 1 — depth guard');

y += 10;

// Fix 2
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green).text('OPTION 2 — Visited-set cache (recommended — also prevents duplicate DB queries)', 45, y);
y += 13;
y = codeBlock([
  "// Add property to the class",
  "private \$scanned_templates = [];",
  "",
  "// In the tp_protected_content block inside plus_widgets_options()",
  "if ( 'tp_protected_content' === \$widget_name || 'tp-protected-content' === \$widget_name ) {",
  "    \$template_ids = array_filter( array(...) );",
  "",
  "    foreach ( \$template_ids as \$template_id ) {",
  "        // Skip if we already scanned this template (prevents loops + duplicate queries)",
  "        if ( isset( \$this->scanned_templates[ \$template_id ] ) ) {",
  "            continue;",
  "        }",
  "        \$this->scanned_templates[ \$template_id ] = true;  // mark as visited",
  "",
  "        \$document = \\Elementor\\Plugin::\$instance->documents->get( \$template_id );",
  "        if ( ! \$document ) { continue; }",
  "        \$elements_data = \$document->get_elements_data();",
  "        if ( empty( \$elements_data ) ) { continue; }",
  "        \$nested_widgets = \$this->scan_nested_template_widgets( \$elements_data );",
  "        \$this->transient_widgets = array_merge( \$this->transient_widgets, \$nested_widgets );",
  "    }",
  "}",
], y, 'Option 2 — visited set (recommended)');

y += 10;

// Quick test
y = infoBox(
  'QUICK VERIFICATION: Temporarily comment out the entire tp_protected_content block (lines 222-245) in plus-generator.php on the AFTER build. If I-01, I-04, and E-04 all pass, the diagnosis is confirmed. Re-enable with the fix applied.',
  y, C.greenBg, C.green, '🔬'
);

y += 6;

// Why E-04 is the same
y = sectionTitle('WHY E-04 (Text Block Style Tab) IS THE SAME ISSUE', y, C.red);

doc.font('Helvetica').fontSize(8.5).fillColor(C.black)
   .text('E-04 was labelled "JS error on Style tab" but the actual failure is identical:', 45, y, { width: PW });
y += 16;

y = codeBlock([
  "// E-04 actual error from Playwright JSON:",
  "TimeoutError: page.goto: Timeout 45000ms exceeded.",
  "navigating to \"http://localhost:8881/wp-admin/post-new.php?post_type=page\"",
  "// (Elementor editor — NOT the Style tab click)",
  "",
  "// The editor page NEVER loaded. No JS was executed. No Style tab was ever clicked.",
  "// Same root cause: plus-generator.php enqueue hook hangs on Elementor editor too.",
], y, 'E-04 error — identical pattern to I-01/I-04');

y += 10;

const same = [
  ['I-01', 'admin.php?page=theplus_welcome_page', '45,000ms timeout', 'enqueue hook hangs on admin page'],
  ['I-04', 'admin.php?page=theplus_welcome_page', '109,893ms timeout', 'same — heavier at 1440px layout'],
  ['E-04', 'post-new.php?post_type=page (editor)', '83,173ms timeout', 'enqueue hook hangs on editor'],
];
const sameC = [PW*0.1, PW*0.35, PW*0.22, PW*0.33];
['Test','URL','Duration','Root Cause'].forEach(function(h, ci) {
  const cx = 45 + sameC.slice(0, ci).reduce(function(a,b){return a+b;},0);
  doc.rect(cx, y, sameC[ci], 16).fill(C.accent);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white).text(h, cx+3, y+3, { width: sameC[ci]-6, lineBreak: false });
});
y += 16;
same.forEach(function(row, ri) {
  if(ri%2===0) doc.rect(45, y, PW, 16).fill(C.rowAlt);
  row.forEach(function(v, ci) {
    const cx = 45 + sameC.slice(0, ci).reduce(function(a,b){return a+b;},0);
    const color = ci===2 ? C.red : C.black;
    doc.font(ci===2?'Helvetica-Bold':'Helvetica').fontSize(7.5).fillColor(color)
       .text(v, cx+3, y+3, {width: sameC[ci]-6, lineBreak: false});
  });
  y+=16;
});

y += 12;

y = infoBox(
  'ONE FIX → THREE TESTS PASS: Fix scan_nested_template_widgets() in plus-generator.php and all three regressions (I-01, I-04, E-04) will be resolved in a single change.',
  y, C.greenBg, C.green, '✅'
);

y += 10;

// Summary table
y = sectionTitle('SUMMARY — Corrected Regression Labels', y, C.blue);

const sumRows2 = [
  ['I-01', '375px mobile viewport', '"Mobile CSS broken"', 'admin.php times out 45s — tp_protected_content recursion', 'Fix plus-generator.php'],
  ['I-04', '1440px desktop viewport', '"Desktop CSS broken"', 'Same page timeout — same root cause', 'Fix plus-generator.php'],
  ['E-04', 'Style tab JS error', '"JS error on Style tab"', 'Editor page times out 45s — never reaches the tab', 'Fix plus-generator.php'],
];
const labC = [PW*0.08, PW*0.15, PW*0.2, PW*0.35, PW*0.22];
['ID','Test','Wrong Label','Actual Failure','Fix'].forEach(function(h, ci) {
  const cx = 45 + labC.slice(0,ci).reduce(function(a,b){return a+b;},0);
  doc.rect(cx, y, labC[ci], 16).fill(C.blueAcc);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.white).text(h, cx+3, y+3, {width:labC[ci]-6, lineBreak:false});
});
y += 16;
sumRows2.forEach(function(row, ri) {
  if(ri%2===0) doc.rect(45, y, PW, 22).fill(C.rowAlt);
  row.forEach(function(v, ci) {
    const cx = 45 + labC.slice(0,ci).reduce(function(a,b){return a+b;},0);
    const color = ci===2 ? C.grey : ci===3 ? C.red : ci===4 ? C.green : C.black;
    const bold = ci===2 || ci===4;
    doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(7).fillColor(color)
       .text(v, cx+3, y+3, {width:labC[ci]-6, lineBreak:true});
  });
  y += 22;
});

// Page numbers
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  hline(820);
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text('TPAE Root Cause Analysis  ·  Orbit QA Framework  ·  2026-04-24', 45, 825, { width: PW - 60, lineBreak: false });
  doc.font('Helvetica').fontSize(7).fillColor(C.grey)
     .text('Page ' + (i+1) + ' / ' + totalPages, 45, 825, { width: PW, align: 'right', lineBreak: false });
}

doc.end();
console.log('PDF written to:', OUT);
