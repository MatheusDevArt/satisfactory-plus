/**
 * Script reproduzível para gerar todos os 42 prints reais (WebP) do Tutorial Interativo.
 * Uso: npm run tutorial:prints (ou: node scripts/generate-tutorial-prints.js)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'tutorial');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const DEMO_PROJECTS = [
  {
    id: 'proj_demo_1',
    name: 'Armação Modular Pesada 10/min',
    sourceMode: 'production',
    summary: 'Produção · Armação modular pesada (10/min) · 341 máquinas',
    createdAt: '2026-10-12T14:20:00.000Z',
    updatedAt: '2026-11-18T19:45:00.000Z'
  },
  {
    id: 'proj_demo_2',
    name: 'Usina de Carvão 1.200 MW',
    sourceMode: 'free',
    summary: 'Oficina · 16× Gerador a Carvão + 6× Bomba d’água',
    createdAt: '2026-10-25T10:15:00.000Z',
    updatedAt: '2026-11-19T11:30:00.000Z'
  }
];

const DEMO_REPORTS = [
  {
    id: 'rep_demo_1',
    type: 'suggestion',
    title: 'Atalho rápido para duplicar blocos na Oficina',
    message: 'Seria ótimo poder usar Ctrl+C e Ctrl+V diretamente nos blocos selecionados.',
    status: 'resolvido',
    adminReply: 'Implementado! Agora você pode usar Ctrl+C, Ctrl+V e Shift+arrastar na Oficina.',
    createdAt: '2026-11-10T16:00:00.000Z',
    updatedAt: '2026-11-12T09:15:00.000Z',
    images: []
  },
  {
    id: 'rep_demo_2',
    type: 'bug',
    title: 'Filtro de receitas alternativas no seletor',
    message: 'Faltava um chip para filtrar somente receitas ALT ao trocar a receita.',
    status: 'lido',
    adminReply: 'Recebido! Estamos aplicando o novo seletor unificado com filtros Padrão e ALT.',
    createdAt: '2026-11-17T18:40:00.000Z',
    updatedAt: '2026-11-18T10:00:00.000Z',
    images: []
  }
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Navegador Chrome/Edge não encontrado. Defina CHROME_PATH.');
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
      const urlPath = decodeURIComponent(urlObj.pathname);
      if (urlPath.startsWith('/api/projects')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ projects: DEMO_PROJECTS, maxProjects: 20 }));
        return;
      }
      if (urlPath.startsWith('/api/reports')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ reports: DEMO_REPORTS, unreadCount: 1 }));
        return;
      }
      if (urlPath.startsWith('/api/')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ user: null }));
        return;
      }
      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const fullPath = path.join(ROOT, rel);
      if (!fullPath.startsWith(ROOT) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      fs.createReadStream(fullPath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { res, rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) {
      throw new Error(`Eval error: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description || ''}`);
    }
    return r.result ? r.result.value : undefined;
  }
  async highlight(selectors) {
    const arr = Array.isArray(selectors) ? selectors : [selectors];
    await this.eval(`
      (() => {
        document.querySelectorAll('.tut-cap-hl').forEach(el => {
          el.classList.remove('tut-cap-hl');
          el.style.outline = '';
          el.style.outlineOffset = '';
        });
        const sels = ${JSON.stringify(arr)};
        sels.forEach(s => {
          const el = document.querySelector(s);
          if (el) {
            el.classList.add('tut-cap-hl');
            el.style.outline = '3px solid #EA580C';
            el.style.outlineOffset = '3px';
          }
        });
      })();
    `);
  }
  async clearHighlights() {
    await this.eval(`
      document.querySelectorAll('.tut-cap-hl').forEach(el => {
        el.classList.remove('tut-cap-hl');
        el.style.outline = '';
        el.style.outlineOffset = '';
      });
    `);
  }
  async captureWebp(filename, quality = 85) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'webp',
      quality
    });
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`  ✓ ${filename}`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { server, url } = await startStaticServer();
  const port = 9244;
  const userDataDir = path.join(ROOT, '.tmp-tut-chrome');
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const proc = spawn(findChrome(), [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1440,900',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(250);
  }
  if (!wsUrl) throw new Error('CDP websocket não disponível');

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await cdp.send('Page.navigate', { url });
  await sleep(1600);

  // Dark mode + dismiss splash/patch notes
  await cdp.eval(`
    localStorage.setItem('splus_theme', 'dark');
    document.documentElement.dataset.theme = 'dark';
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    if (typeof dismissIntroSplash === 'function') dismissIntroSplash();
    if (typeof closePatchAutoCard === 'function') closePatchAutoCard(true);
  `);
  await sleep(400);

  console.log('Gerando 42 prints reais do Tutorial...');

  /* ================= 1. INTERFACE GERAL ================= */
  await cdp.eval(`
    switchMode('production');
    AppState.pull.targets = [{ id: 't1', itemId: 'Desc_IronPlate_C', rate: 60 }];
    AppState.production.driver = 'product';
    AppState.production.mounted = true;
    renderAll(true);
  `);
  await sleep(500);
  await cdp.captureWebp('tut-iface-01-overview.webp');

  await cdp.highlight(['.sidebar-brand', '.tabs-bar-container']);
  await sleep(150);
  await cdp.captureWebp('tut-iface-02-tabs.webp');

  await cdp.highlight(['#top-right-floating-actions']);
  await sleep(150);
  await cdp.captureWebp('tut-iface-03-topbar.webp');

  await cdp.highlight(['#spaces-hud-controls', '#factory-status-footer']);
  await sleep(150);
  await cdp.captureWebp('tut-iface-04-hud.webp');
  await cdp.clearHighlights();

  /* ================= 2. PRODUÇÃO ================= */
  await cdp.eval(`
    AppState.pull.targets = [];
    AppState.push.inputs = [];
    AppState.production.driver = null;
    AppState.production.mounted = false;
    switchMode('production');
  `);
  await sleep(350);
  await cdp.captureWebp('tut-prod-01-intro.webp');

  await cdp.eval(`openPullAddTargetModal();`);
  await sleep(500);
  await cdp.captureWebp('tut-prod-02-picker.webp');
  await cdp.eval(`closePickerModal();`);

  await cdp.eval(`
    AppState.pull.targets = [{ id: 't1', itemId: 'Desc_ModularFrameHeavy_C', rate: 2 }];
    AppState.production.driver = 'product';
    AppState.production.mounted = false;
    renderAll(false);
  `);
  await sleep(350);
  await cdp.highlight(['.sidebar-config-card input[type="number"]']);
  await sleep(150);
  await cdp.captureWebp('tut-prod-03-rate.webp');
  await cdp.clearHighlights();

  await cdp.eval(`document.querySelector('.rp-trigger-btn')?.click();`);
  await sleep(400);
  await cdp.captureWebp('tut-prod-04-recipe.webp');
  await cdp.eval(`document.getElementById('recipe-picker-modal')?.classList.add('hidden');`);

  await cdp.eval(`
    AppState.production.mounted = true;
    AppState.production.expandedGroups = { extracao: false, producao: true };
    AppState.production.expandedRowKey = null;
    renderAll(true);
    const cards = document.querySelectorAll('#left-sidebar-content .ds-section-card');
    if (cards[2]) cards[2].scrollIntoView({ behavior: 'instant' });
  `);
  await sleep(450);
  await cdp.highlight(['#left-sidebar-content .ds-section-card:nth-child(3)']);
  await sleep(150);
  await cdp.captureWebp('tut-prod-05-machines.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    const sb = document.getElementById('left-sidebar-content');
    if (sb) sb.scrollTop = 0;
  `);
  await sleep(200);
  await cdp.highlight(['#sidebar-action-section .btn-mount-flow']);
  await sleep(150);
  await cdp.captureWebp('tut-prod-06-mount.webp');

  await cdp.highlight(['#factory-status-footer']);
  await sleep(150);
  await cdp.captureWebp('tut-prod-07-status.webp');

  await cdp.highlight(['#sidebar-action-section .btn-clear-flow']);
  await sleep(150);
  await cdp.captureWebp('tut-prod-08-clear.webp');
  await cdp.clearHighlights();

  /* ================= 3. ENERGIA ================= */
  await cdp.eval(`
    AppState.power.generatorId = null;
    AppState.power.mounted = false;
    switchMode('power');
  `);
  await sleep(350);
  await cdp.captureWebp('tut-pwr-01-intro.webp');

  await cdp.eval(`
    AppState.power.generatorId = 'Build_GeneratorCoal_C';
    AppState.power.fuelItemId = 'Desc_Coal_C';
    AppState.power.calcMode = 'by_mw';
    AppState.power.targetMW = 1200;
    AppState.power.mounted = false;
    renderAll(false);
  `);
  await sleep(400);
  await cdp.highlight(['#left-sidebar-content']);
  await sleep(150);
  await cdp.captureWebp('tut-pwr-02-config.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    AppState.power.mounted = true;
    renderAll(true);
  `);
  await sleep(500);
  await cdp.highlight(['#factory-status-footer']);
  await sleep(150);
  await cdp.captureWebp('tut-pwr-03-result.webp');
  await cdp.clearHighlights();

  /* ================= 4. OFICINA ================= */
  await cdp.eval(`
    AppState.free.blocks = [];
    AppState.free.customEdges = [];
    switchMode('free');
  `);
  await sleep(350);
  await cdp.captureWebp('tut-ofi-01-intro.webp');

  await cdp.highlight(['#left-sidebar-content .ds-section-card:first-child']);
  await sleep(150);
  await cdp.captureWebp('tut-ofi-02-addbar.webp');
  await cdp.clearHighlights();

  await cdp.eval(`openAddMachineModal({ quickFilter: 'all' });`);
  await sleep(450);
  await cdp.captureWebp('tut-ofi-03-modal.webp');
  await cdp.eval(`closeAddMachineModal();`);

  await cdp.eval(`
    AppState.free.blocks = [
      { id: 'b1', blockType: 'extractor', itemId: 'Desc_OreIron_C', minerMark: 'mk2', purity: 'normal', count: 1, clockPercent: 100, floor: 1, x: 80, y: 200 },
      { id: 'b2', blockType: 'machine', machineId: 'Build_SmelterMk1_C', recipeId: 'Recipe_IngotIron_C', count: 4, clockPercent: 100, floor: 1, x: 420, y: 180 },
      { id: 'b3', blockType: 'machine', machineId: 'Build_ConstructorMk1_C', recipeId: 'Recipe_IronPlate_C', count: 4, clockPercent: 100, floor: 1, x: 780, y: 180 },
      { id: 'b4', blockType: 'storage', logisticsId: 'Build_StorageContainerMk1_C', count: 1, clockPercent: 100, floor: 1, x: 1120, y: 200 }
    ];
    AppState.free.customEdges = [
      { id: 'e1', from: 'b1', to: 'b2', itemId: 'Desc_OreIron_C' },
      { id: 'e2', from: 'b2', to: 'b3', itemId: 'Desc_IronIngot_C' },
      { id: 'e3', from: 'b3', to: 'b4', itemId: 'Desc_IronPlate_C' }
    ];
    AppState.free.groupBy = 'type';
    AppState.free.expandedGroups = { maquinas: true, armazenamento: true };
    renderAll(true);
  `);
  await sleep(500);
  await cdp.highlight(['#left-sidebar-content .ds-section-card:nth-child(2)']);
  await sleep(150);
  await cdp.captureWebp('tut-ofi-04-blocks.webp');
  await cdp.clearHighlights();

  /* ================= 5. MAPA ================= */
  await cdp.eval(`switchMode('map');`);
  await sleep(800);
  await cdp.captureWebp('tut-map-01-intro.webp');

  await cdp.highlight(['#left-sidebar-content']);
  await sleep(150);
  await cdp.captureWebp('tut-map-02-filters.webp');
  await cdp.clearHighlights();

  /* ================= 6. RECEITAS ================= */
  await cdp.eval(`switchMode('recipes');`);
  await sleep(600);
  await cdp.captureWebp('tut-rec-01-intro.webp');

  await cdp.highlight(['#left-sidebar-content .ds-section-card:first-child']);
  await sleep(150);
  await cdp.captureWebp('tut-rec-02-filters.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    const firstCard = document.querySelector('#recipes-workspace-view .lib-card');
    if (firstCard) firstCard.click();
  `);
  await sleep(450);
  await cdp.captureWebp('tut-rec-03-detail.webp');

  /* ================= 7. BIBLIOTECA ================= */
  await cdp.eval(`switchMode('library');`);
  await sleep(700);
  await cdp.captureWebp('tut-lib-01-intro.webp');

  await cdp.highlight(['#left-sidebar-content .ds-section-card:nth-child(2)']);
  await sleep(150);
  await cdp.captureWebp('tut-lib-02-cats.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    const firstLib = document.querySelector('#library-workspace-view .lib-card');
    if (firstLib) firstLib.click();
  `);
  await sleep(450);
  await cdp.captureWebp('tut-lib-03-detail.webp');

  /* ================= 8. CALCULADORA ================= */
  await cdp.eval(`switchMode('calculator'); setCalcTool('numeric');`);
  await sleep(400);
  await cdp.captureWebp('tut-calc-01-intro.webp');

  await cdp.eval(`setCalcTool('production');`);
  await sleep(350);
  await cdp.highlight(['#left-sidebar-content .ds-section-card']);
  await sleep(150);
  await cdp.captureWebp('tut-calc-02-menu.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    AppState.calculator.prodMachineId = 'Build_ConstructorMk1_C';
    AppState.calculator.prodRecipeId = 'Recipe_IronPlate_C';
    AppState.calculator.prodMachineCount = 4;
    AppState.calculator.prodClock = 150;
    renderCalculatorWorkspace();
  `);
  await sleep(400);
  await cdp.highlight(['#calc-result-panel']);
  await sleep(150);
  await cdp.captureWebp('tut-calc-03-result.webp');
  await cdp.clearHighlights();

  /* ================= 9. PROJETOS (SIMULA USUÁRIO LOGADO) ================= */
  await cdp.eval(`
    AccountState.user = { username: 'Engenheiro', isAdmin: false };
    AccountState.projects.list = ${JSON.stringify(DEMO_PROJECTS)};
    AccountState.projects.loading = false;
    AccountState.projects.error = null;
    if (typeof updateAccountUI === 'function') updateAccountUI();
    switchMode('production');
    AppState.pull.targets = [{ id: 't1', itemId: 'Desc_IronPlate_C', rate: 60 }];
    AppState.production.driver = 'product';
    AppState.production.mounted = true;
    renderAll(true);
  `);
  await sleep(450);
  await cdp.highlight(['#tab-projects']);
  await sleep(150);
  await cdp.captureWebp('tut-proj-01-tab.webp');

  await cdp.highlight(['#sidebar-action-section button[onclick*="openSaveProjectModal"], #sidebar-action-section .btn-save-project']);
  await sleep(150);
  await cdp.captureWebp('tut-proj-02-savebtn.webp');
  await cdp.clearHighlights();

  await cdp.eval(`handleSaveProjectClick('production', false);`);
  await sleep(350);
  await cdp.highlight(['#save-project-body input']);
  await sleep(150);
  await cdp.captureWebp('tut-proj-03-modal.webp');

  await cdp.eval(`
    const inp = document.querySelector('#save-project-body input');
    if (inp) inp.value = 'Chapa de Ferro 60/min';
  `);
  await cdp.highlight(['#save-project-body button[type="submit"], #save-project-body .btn-mount-flow']);
  await sleep(150);
  await cdp.captureWebp('tut-proj-04-confirm.webp');
  await cdp.clearHighlights();
  await cdp.eval(`closeSaveProjectModal();`);

  await cdp.eval(`
    switchMode('projects');
    AccountState.projects.list = ${JSON.stringify(DEMO_PROJECTS)};
    AccountState.projects.loading = false;
    renderProjectsWorkspace();
  `);
  await sleep(450);
  await cdp.captureWebp('tut-proj-05-list.webp');

  await cdp.highlight(['.project-saved-card .project-card-actions']);
  await sleep(150);
  await cdp.captureWebp('tut-proj-06-actions.webp');
  await cdp.clearHighlights();

  /* ================= 10. REPORTAR ================= */
  await cdp.eval(`switchMode('production');`);
  await sleep(300);
  await cdp.highlight(['#btn-open-report']);
  await sleep(150);
  await cdp.captureWebp('tut-rep-01-btn.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    AccountState.reportModal.myReports = ${JSON.stringify(DEMO_REPORTS)};
    AccountState.reportModal.myReportsLoaded = true;
    AccountState.reportModal.tab = 'new';
    openReportModal();
  `);
  await sleep(400);
  await cdp.highlight(['#report-modal-body form, #report-modal-body .field-group']);
  await sleep(150);
  await cdp.captureWebp('tut-rep-02-form.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    const body = document.getElementById('report-modal-body');
    if (body) body.scrollTop = body.scrollHeight;
  `);
  await sleep(200);
  await cdp.highlight(['#report-modal-body input[type="file"], #report-modal-body button[type="submit"]']);
  await sleep(150);
  await cdp.captureWebp('tut-rep-03-images.webp');
  await cdp.clearHighlights();

  await cdp.eval(`
    AccountState.reportModal.tab = 'mine';
    AccountState.reportModal.myReports = ${JSON.stringify(DEMO_REPORTS)};
    AccountState.reportModal.myReportsLoaded = true;
    if (typeof renderReportModalBody === 'function') renderReportModalBody();
  `);
  await sleep(400);
  await cdp.captureWebp('tut-rep-04-status.webp');
  await cdp.eval(`closeReportModal();`);

  /* ================= 11. CONTA E LOGIN ================= */
  await cdp.eval(`
    AccountState.user = null;
    if (typeof updateAccountUI === 'function') updateAccountUI();
    switchMode('production');
  `);
  await sleep(300);
  await cdp.highlight(['#btn-auth-login']);
  await sleep(150);
  await cdp.captureWebp('tut-acc-01-btn.webp');
  await cdp.clearHighlights();

  await cdp.eval(`openAuthModal('login');`);
  await sleep(350);
  await cdp.captureWebp('tut-acc-02-modal.webp');
  await cdp.eval(`closeAuthModal();`);

  cdp.ws.close();
  proc.kill();
  server.close();
  await sleep(400);
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  console.log('Todos os 42 prints do tutorial foram gerados com sucesso!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
