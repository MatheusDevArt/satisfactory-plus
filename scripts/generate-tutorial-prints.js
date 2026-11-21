/**
 * Script reproduzível para gerar prints reais (2x retina, WebP otimizado)
 * usados no Tutorial Interativo do Satisfactory+.
 *
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

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Navegador Chrome/Edge não encontrado. Defina CHROME_PATH.');
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
      throw new Error(`Eval error: ${r.exceptionDetails.text}`);
    }
    return r.result ? r.result.value : undefined;
  }
  async captureWebp(filename, clip = null, quality = 84) {
    const params = {
      format: 'webp',
      quality,
      fromSurface: true
    };
    if (clip) {
      params.clip = {
        x: Math.max(0, Math.round(clip.x)),
        y: Math.max(0, Math.round(clip.y)),
        width: Math.max(100, Math.round(clip.width)),
        height: Math.max(100, Math.round(clip.height)),
        scale: 1
      };
    }
    const { data } = await this.send('Page.captureScreenshot', params);
    const buf = Buffer.from(data, 'base64');
    const outPath = path.join(OUT_DIR, filename);
    fs.writeFileSync(outPath, buf);
    const kb = (buf.length / 1024).toFixed(1);
    console.log(`  [OK] ${filename} (${kb} KB)`);
    return { filename, kb: Number(kb) };
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function waitForDevTools(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('Timeout aguardando Chrome DevTools.');
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const chromePath = findChrome();
  const { server, url } = await startStaticServer();
  const debugPort = 9244;
  const userDataDir = path.join(ROOT, '.tmp-chrome-prints');

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    '--force-device-scale-factor=2',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], { stdio: 'ignore' });

  let cdp;
  try {
    const wsUrl = await waitForDevTools(debugPort);
    cdp = new CDPClient(wsUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false
    });

    console.log(`Abrindo ${url} ...`);
    await cdp.send('Page.navigate', { url });
    await sleep(2600);

    // Remove splash, body.home-active e QUALQUER modal de patch notes antes de qualquer captura
    await cdp.eval(`(() => {
      try {
        const pn = ${JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'patch-notes.json'), 'utf8'))[0]?.id || 'latest')};
        localStorage.setItem('splus_last_seen_patch_id', pn);
      } catch {}
      if (typeof dismissIntroSplash === 'function') dismissIntroSplash();
      document.getElementById('intro-splash')?.remove();
      document.getElementById('patch-auto-modal')?.remove();
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
      document.body.classList.remove('home-active');
      document.documentElement.classList.remove('home-active');
      const root = document.getElementById('app-layout-root');
      if (root) { root.style.opacity = '1'; root.style.visibility = 'visible'; }
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
    })()`);
    await sleep(600);

    // 1. Tela inicial limpa
    await cdp.captureWebp('tutorial-01-inicio.webp', { x: 0, y: 0, width: 1440, height: 900 }, 82);

    // 2. Barra de abas (painel esquerdo superior)
    await cdp.captureWebp('tutorial-02-abas.webp', { x: 0, y: 0, width: 460, height: 340 }, 86);

    // 3. Gerando sua primeira linha (Chapa de Ferro na taxa base real de 1 Construtor = 20/min)
    await cdp.eval(`(() => {
      AppState.mode = 'production';
      AppState.production.driver = 'product';
      AppState.production.mounted = false;
      const baseRate = typeof getBaseRecipeRateForItem === 'function' ? getBaseRecipeRateForItem('Desc_IronPlate_C') : 20;
      AppState.pull.targets = [{ id: uid(), itemId: 'Desc_IronPlate_C', rate: baseRate }];
      renderAll();
    })()`);
    await sleep(600);
    await cdp.captureWebp('tutorial-03-primeira-linha.webp', { x: 0, y: 0, width: 460, height: 640 }, 84);

    // Monta linha de Chapa de Ferro 20/min na orientação padrão Esquerda -> Direita (LR)
    await cdp.eval(`(() => {
      AppState.production.mounted = true;
      AppState.showAllMachines = true;
      AppState.orientation = 'LR';
      renderAll(true);
    })()`);
    await sleep(1100);
    await cdp.eval(`(() => { fitCanvasToScreen(); })()`);
    await sleep(600);

    // 4. Fluxo completo (área de trabalho à direita)
    await cdp.captureWebp('tutorial-04-fluxo.webp', { x: 420, y: 0, width: 1020, height: 900 }, 82);

    // Captura posições das cartas para recortes precisos de 5, 6a, 7, 8 + coords relativas em %
    const rects = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.magnific-card')).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          title: el.querySelector('.mcard-title')?.textContent?.trim() || '',
          isFinal: el.classList.contains('final-product-card'),
          isResource: el.classList.contains('resource-node-card'),
          x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
          pctInCanvas: {
            x: Math.round(((r.left + r.width * 0.5 - 420) / 1020) * 100),
            y: Math.round(((r.top + r.height * 0.5) / 900) * 100)
          }
        };
      });
      const pills = Array.from(document.querySelectorAll('.wire-belt-pill')).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent.trim(),
          x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
          pctInCanvas: {
            x: Math.round(((r.left + r.width * 0.5 - 420) / 1020) * 100),
            y: Math.round(((r.top + r.height * 0.5) / 900) * 100)
          }
        };
      });
      return { cards, pills };
    })()`);
    console.log('Cards detectados:', JSON.stringify(rects.cards.map(c => ({ title: c.title, isFinal: c.isFinal, isResource: c.isResource, pct: c.pctInCanvas }))));
    console.log('Pills detectadas:', JSON.stringify(rects.pills.map(p => ({ text: p.text, pct: p.pctInCanvas }))));

    // 5. Etiquetas das esteiras (recorte em volta da primeira pílula + máquinas vizinhas)
    if (rects.pills.length > 0) {
      const p = rects.pills[0];
      await cdp.captureWebp('tutorial-05-etiquetas.webp', {
        x: Math.max(420, p.x - 240),
        y: Math.max(20, p.y - 160),
        width: 560,
        height: 360
      }, 86);
    } else {
      await cdp.captureWebp('tutorial-05-etiquetas.webp', { x: 560, y: 180, width: 620, height: 420 }, 84);
    }

    // 6a. Card de máquina (FORNALHA #1)
    const midCard = rects.cards.find((c) => /FORNALHA|CONSTRUTOR/i.test(c.title)) || rects.cards[2] || rects.cards[0];
    if (midCard) {
      await cdp.captureWebp('tutorial-06a-card-maquina.webp', {
        x: Math.max(420, midCard.x - 90),
        y: Math.max(20, midCard.y - 50),
        width: midCard.w + 180,
        height: midCard.h + 100
      }, 86);
    }

    // 7. Nó de recurso
    const resCard = rects.cards.find((c) => /^Nó de/i.test(c.title)) || rects.cards[0];
    if (resCard) {
      await cdp.captureWebp('tutorial-07-no-recurso.webp', {
        x: Math.max(420, resCard.x - 90),
        y: Math.max(20, resCard.y - 50),
        width: resCard.w + 180,
        height: resCard.h + 100
      }, 86);
    }

    // 8. Produto final em laranja
    const finalCard = rects.cards.find((c) => /CHAPA DE FERRO|🎯/i.test(c.title)) || rects.cards[rects.cards.length - 1];
    if (finalCard) {
      await cdp.captureWebp('tutorial-08-produto-final.webp', {
        x: Math.max(420, finalCard.x - 110),
        y: Math.max(20, finalCard.y - 50),
        width: finalCard.w + 220,
        height: finalCard.h + 100
      }, 86);
    }

    // 11a. Navegação (barra inferior + topo direito + fluxo)
    await cdp.captureWebp('tutorial-11a-navegacao.webp', { x: 420, y: 0, width: 1020, height: 900 }, 80);

    // 11b. Modo Foco (destacando a máquina intermediária)
    if (midCard) {
      await cdp.eval(`(() => {
        if (typeof highlightConnectedNodes === 'function') {
          highlightConnectedNodes('${midCard.id}', true);
        }
      })()`);
      await sleep(350);
      await cdp.captureWebp('tutorial-11b-foco.webp', { x: 420, y: 0, width: 1020, height: 900 }, 80);
      await cdp.eval(`(() => {
        if (typeof highlightConnectedNodes === 'function') {
          highlightConnectedNodes('${midCard.id}', false);
        }
      })()`);
    }

    // 6b. Máquinas agrupadas (Todas Máquinas: NÃO com 90/min de Chapa de Ferro para mostrar agrupamento)
    await cdp.eval(`(() => {
      AppState.pull.targets = [{ id: uid(), itemId: 'Desc_IronPlate_C', rate: 90 }];
      AppState.showAllMachines = false;
      renderAll(true);
    })()`);
    await sleep(1000);
    await cdp.eval(`(() => { fitCanvasToScreen(); })()`);
    await sleep(450);
    await cdp.captureWebp('tutorial-06b-agrupado.webp', { x: 420, y: 0, width: 1020, height: 900 }, 80);

    // 9. Quadro de Status e Excesso (Combustível 40/min -> gera excesso de Resina Polimérica!)
    await cdp.eval(`(() => {
      AppState.showAllMachines = false;
      AppState.pull.targets = [{ id: uid(), itemId: 'Desc_LiquidFuel_C', rate: 40 }];
      AppState.production.mounted = true;
      renderAll(true);
    })()`);
    await sleep(1000);
    await cdp.captureWebp('tutorial-09-excesso.webp', { x: 0, y: 120, width: 450, height: 680 }, 84);

    // 10. Modo Livre (2 máquinas conectadas + barra de Divisor/Unificador/Junção)
    await cdp.eval(`(() => {
      switchMode('free');
      AppState.free.blocks = [];
      AppState.free.customEdges = [];
      addFreeBlock('extractor', { itemId: 'Desc_OreIron_C', x: 180, y: 100 });
      addFreeBlock('machine', { recipeId: 'Recipe_IngotIron_C', x: 180, y: 460 });
      if (AppState.free.blocks.length >= 2) {
        const b1 = AppState.free.blocks[0];
        const b2 = AppState.free.blocks[1];
        AppState.free.customEdges.push({
          id: uid(),
          fromNodeId: 'free_' + b1.id + '_0',
          toNodeId: 'free_' + b2.id + '_0',
          itemId: 'Desc_OreIron_C',
          beltTier: 1
        });
      }
      renderAll(true);
    })()`);
    await sleep(800);
    await cdp.eval(`(() => { fitCanvasToScreen(); })()`);
    await sleep(450);
    await cdp.captureWebp('tutorial-10-modo-livre.webp', { x: 420, y: 0, width: 1020, height: 900 }, 80);

    // 12. Conta, Projetos e Reportar (volta para produção montada mostrando topo direito + Salvar)
    await cdp.eval(`(() => {
      switchMode('production');
      AppState.pull.targets = [{ id: uid(), itemId: 'Desc_IronPlate_C', rate: 30 }];
      AppState.production.mounted = true;
      renderAll(true);
    })()`);
    await sleep(800);
    await cdp.captureWebp('tutorial-12-conta-projetos.webp', { x: 0, y: 0, width: 1440, height: 340 }, 84);

    console.log('ALL_PRINTS_DONE');
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
    server.close();
    setTimeout(() => {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }, 500);
  }
}

run().catch((err) => {
  console.error('PRINTS_ERROR:', err);
  process.exit(1);
});
