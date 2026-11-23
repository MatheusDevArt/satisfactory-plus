const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const targets = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) targets.push(full);
  }
}

walk(path.join(root, 'js'));
walk(path.join(root, 'api'));

let failed = 0;
for (const file of targets) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (res.status !== 0) {
    failed++;
    console.error(`[FAIL] ${path.relative(root, file)}\n${res.stderr || ''}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} arquivo(s) com erro de sintaxe.`);
  process.exit(1);
}
console.log(`OK: ${targets.length} arquivos JS verificados sem erros de sintaxe.`);
