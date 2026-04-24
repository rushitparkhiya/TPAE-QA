const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist) {
  filelist = filelist || [];
  fs.readdirSync(dir).forEach(function(file) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkSync(fullPath, filelist);
    } else if (file.endsWith('.php')) {
      filelist.push(fullPath);
    }
  });
  return filelist;
}

const afterBase  = 'C:\\Users\\Posim\\Downloads\\tpae-after-new\\theplus_elementor_addon';
const beforeBase = 'C:\\Users\\Posim\\Downloads\\tpae-before-new\\theplus_elementor_addon';

const afterFiles = walkSync(afterBase);
let diffCount = 0;
const diffs = [];

afterFiles.forEach(function(af) {
  const rel = af.slice(afterBase.length);
  const bf  = beforeBase + rel;
  if (!fs.existsSync(bf)) { diffs.push('NEW: ' + rel); return; }
  const a = fs.readFileSync(af, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const b = fs.readFileSync(bf, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (a !== b) {
    diffCount++;
    diffs.push('DIFF|' + Math.abs(a.length - b.length) + '|' + rel);
  }
});

console.log('Total PHP files with real content diffs: ' + diffCount);
diffs
  .filter(function(d) { return d.startsWith('DIFF'); })
  .sort(function(a, b) { return parseInt(b.split('|')[1]) - parseInt(a.split('|')[1]); })
  .slice(0, 30)
  .forEach(function(d) { console.log(d); });
diffs
  .filter(function(d) { return d.startsWith('NEW'); })
  .forEach(function(d) { console.log(d); });
