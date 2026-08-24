import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const SHOTS = '/tmp/ms_verify';
mkdirSync(SHOTS, { recursive: true });

const PAGES = [
  'index.html', 'gallery.html', 'guestbook.html', 'forum.html',
  'archive.html', 'missing.html', '404.html', 'night.html'
];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console.error] ' + m.text());
});
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
page.on('requestfailed', (r) => errors.push('[reqfail] ' + r.url() + ' :: ' + (r.failure()?.errorText || '')));

const results = [];

// 1) 每页加载 + 截图 + 标题 + 关键内容检查
const CHECK_TEXTS = {
  'index.html': ['阿满', '废弃大楼', '电子河灯'],
  'gallery.html': ['阿满', '废弃楼'],
  'guestbook.html': ['阿满', '留言'],
  'forum.html': ['阿满', '求助'],
  'archive.html': ['档案', '阿满'],
  'missing.html': ['阿满', '查无此人'],
  '404.html': ['404', '阿满'],
  'night.html': ['引路灯', '灯词'],
};

for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${p}.png`, fullPage: false });
  const title = await page.title();
  // 检查关键内容是否存在
  const body = await page.textContent('body');
  const missingTexts = (CHECK_TEXTS[p] || []).filter((t) => !body.includes(t));
  const contentOk = missingTexts.length === 0 ? 'OK' : `MISSING: ${missingTexts.join(', ')}`;
  results.push(`PAGE ${p} -> "${title}" | content: ${contentOk}`);
}

// 2) 检查所有站内链接是否 200
const links = new Set();
for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'load' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  for (const h of hrefs) {
    if (!h) continue;
    const clean = h.split('#')[0];
    if (!clean) continue;
    if (clean.startsWith('/')) {
      if (!clean.startsWith('//')) links.add(BASE + clean);
    } else if (!/^(https?:|javascript:|mailto:|tel:)/.test(clean)) {
      links.add(new URL(clean, BASE).href);
    }
  }
}
let broken = 0;
for (const u of links) {
  const res = await page.goto(u, { waitUntil: 'domcontentloaded' }).catch(() => null);
  if (!res || res.status() >= 400) {
    broken++;
    results.push(`BROKEN ${res ? res.status() : 'n/a'} ${u}`);
  }
}
results.push(`LINKS checked: ${links.size} (${broken} broken)`);

// 3) 截图各站首屏，供人工检查视觉
for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/shot-${p}.png`, fullPage: false });
}

console.log('=== 验证结果 ===');
console.log(results.join('\n'));
console.log('\n=== 错误/警告（非0即有问题） ===');
console.log(errors.length ? errors.slice(0, 20).join('\n') : '（无）');

await browser.close();
