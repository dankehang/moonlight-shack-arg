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

// 1) 每页加载 + 截图 + 收集错误
for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${p}.png`, fullPage: false });
  const title = await page.title();
  results.push(`PAGE ${p} -> "${title}"`);
}

// 2) 检查所有站内链接是否 200
const links = new Set();
for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
  for (const h of hrefs) {
    if (h && h.startsWith('/') && !h.startsWith('//')) links.add(BASE + h.split('#')[0]);
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

// 3) 谜题流：档案 JZ-0714
await page.goto(`${BASE}/archive.html`, { waitUntil: 'networkidle' });
await page.fill('#caseId', 'JZ-0714');
await page.click('button:has-text("查 询")');
await page.waitForTimeout(300);
const secretVisible = await page.isVisible('#secretCase');
results.push(`PUZZLE archive JZ-0714 unlock -> ${secretVisible ? 'OK' : 'FAIL'}`);
await page.screenshot({ path: `${SHOTS}/archive-unlocked.png` });

// 4) 谜题流：结局 A（正确灯词）
await page.goto(`${BASE}/night.html`, { waitUntil: 'networkidle' });
await page.fill('#word', '河灯照水 魂归故里');
await page.click('button:has-text("诵 灯 词")');
await page.waitForTimeout(1500);
const endingA = await page.evaluate(() => document.getElementById('ritualMsg').innerText);
results.push(`PUZZLE night 结局A -> ${endingA.includes('谢谢') ? 'OK' : 'CHECK: ' + endingA.slice(0, 40)}`);
await page.screenshot({ path: `${SHOTS}/night-endingA.png` });

// 5) 谜题流：结局 B（拒绝）
await page.goto(`${BASE}/night.html`, { waitUntil: 'networkidle' });
await page.click('a:has-text("我不引路")');
await page.waitForTimeout(1500);
const endingB = await page.evaluate(() => document.getElementById('ritualMsg').innerText);
results.push(`PUZZLE night 结局B -> ${endingB.includes('一直回') ? 'OK' : 'CHECK: ' + endingB.slice(0, 40)}`);
await page.screenshot({ path: `${SHOTS}/night-endingB.png` });

// 6) 谜题流：相册第七张
await page.goto(`${BASE}/gallery.html`, { waitUntil: 'networkidle' });
await page.click('#photo7');
await page.waitForTimeout(200);
const p7 = await page.isVisible('#photo7Modal');
results.push(`PUZZLE gallery photo7 modal -> ${p7 ? 'OK' : 'FAIL'}`);
await page.screenshot({ path: `${SHOTS}/gallery-photo7.png` });

// 7) 谜题流：留言板灯词
await page.goto(`${BASE}/guestbook.html`, { waitUntil: 'networkidle' });
await page.fill('#gbMsg', '河灯照水 魂归故里');
await page.click('button:has-text("发送留言")');
await page.waitForTimeout(200);
const gb = await page.evaluate(() => document.getElementById('gbTip').innerText);
results.push(`PUZZLE guestbook 灯词 -> ${gb.includes('去河边') ? 'OK' : 'CHECK: ' + gb}`);

// 8) 截图各站首屏，供人工检查视觉
for (const p of PAGES) {
  await page.goto(`${BASE}/${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/shot-${p}.png`, fullPage: false });
}

console.log('=== 验证结果 ===');
console.log(results.join('\n'));
console.log('\n=== 错误/警告（非0即有问题） ===');
console.log(errors.length ? errors.slice(0, 20).join('\n') : '（无）');

await browser.close();
