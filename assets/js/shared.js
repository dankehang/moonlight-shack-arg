/* ============================================================
   月光小筑 · 共享脚本
   表面：千禧年装饰（气泡、光标拖尾、闪烁星星、计数器）
   里子：控制台低语 / 光标偶尔拖出不该出现的字
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 气泡背景 ---------- */
  function spawnBubbles() {
    const field = document.querySelector('.bubble-field');
    if (!field) return;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size = 12 + Math.random() * 42;
      b.style.setProperty('--s', size + 'px');
      b.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
      b.style.left = (Math.random() * 100) + '%';
      b.style.animationDuration = (9 + Math.random() * 14) + 's';
      b.style.animationDelay = (-Math.random() * 20) + 's';
      field.appendChild(b);
    }
  }

  /* ---------- 静态点缀星星 ---------- */
  function spawnSparkles() {
    const host = document.querySelector('.page');
    if (!host) return;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.style.left = (4 + Math.random() * 92) + '%';
      s.style.top = (4 + Math.random() * 90) + '%';
      s.style.animationDelay = (Math.random() * 2) + 's';
      host.appendChild(s);
    }
  }

  /* ---------- 光标拖尾（千禧年闪亮） ---------- */
  const trailEls = [];
  function spawnTrail(x, y) {
    const t = document.createElement('div');
    t.style.cssText =
      'position:fixed;left:' + x + 'px;top:' + y + 'px;width:10px;height:10px;border-radius:50%;' +
      'background:radial-gradient(circle,#fff,#ffe28a 60%,transparent);' +
      'pointer-events:none;z-index:9998;box-shadow:0 0 8px #ffe28a;' +
      'transform:translate(-50%,-50%);transition:opacity .7s, transform .7s;';
    document.body.appendChild(t);
    trailEls.push(t);
    if (trailEls.length > 24) {
      const old = trailEls.shift();
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }
    setTimeout(() => {
      if (t.parentNode) {
        t.style.opacity = '0';
        t.style.transform = 'translate(-50%,-50%) scale(.2)';
      }
    }, 60);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 800);
  }

  /* 不吉利的时候，拖尾会拖出"字" */
  const UNLUCKY_GLYPHS = ['鬼', '阴', '回', '灯', '魂', '死', '门'];
  let unluckyTimer = null;
  function maybeUnluckyTrail(x, y) {
    if (document.body.classList.contains('cursed') && Math.random() < 0.07) {
      const g = document.createElement('div');
      g.textContent = UNLUCKY_GLYPHS[(Math.random() * UNLUCKY_GLYPHS.length) | 0];
      g.style.cssText =
        'position:fixed;left:' + x + 'px;top:' + y + 'px;font-size:20px;color:rgba(176,18,36,.6);' +
        'pointer-events:none;z-index:9999;transform:translate(-50%,-120%);' +
        'transition:opacity 2s;font-family:仿宋,serif;';
      document.body.appendChild(g);
      setTimeout(() => { g.style.opacity = '0'; }, 100);
      setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, 2200);
    }
  }

  let trailThrottle = 0;
  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - trailThrottle < 28) return;
    trailThrottle = now;
    spawnTrail(e.clientX, e.clientY);
    if (unluckyTimer) { clearTimeout(unluckyTimer); unluckyTimer = null; }
    unluckyTimer = setTimeout(() => maybeUnluckyTrail(e.clientX, e.clientY), 80);
  });

  /* ---------- 访客计数器 ---------- */
  function initCounters() {
    document.querySelectorAll('[data-counter]').forEach((el) => {
      let base = parseInt(el.getAttribute('data-counter'), 10) || 0;
      if (!localStorage.getItem('ms_counter_done')) {
        base += Math.floor(Math.random() * 80);
        localStorage.setItem('ms_counter_done', '1');
      }
      const digits = String(base).padStart(6, '0').split('');
      el.innerHTML = digits.map((d) => '<b>' + d + '</b>').join('');
    });
  }

  /* ---------- 控制台低语 ---------- */
  const CONSOLE_MAIN = [
    '%c月光小筑 · 2003 年建成，请善待',
    'color:#2ea8d8;font-size:14px;font-weight:bold;letter-spacing:2px;',
    '',
    '你看源代码的样子，很像她当年写这页的样子。',
    '留言板的第一条留言，你读了吗？',
    '有些照片，右键「另存为」会看到不一样的东西。',
    '',
    '—— 她还在这里。'
  ];
  function sayConsole(extra) {
    const lines = (extra && extra.length) ? extra : CONSOLE_MAIN;
    lines.forEach((l) => console.log(l));
  }

  /* ---------- 全局初始化 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    spawnBubbles();
    spawnSparkles();
    initCounters();

    const pageKey = document.body.getAttribute('data-page') || 'default';
    const notes = window.__ms_console_notes || [];
    sayConsole(notes);
    window.__ms_page = pageKey;
  });

  window.Moonlight = {
    spawnBubbles, spawnSparkles, sayConsole, initCounters
  };
})();
