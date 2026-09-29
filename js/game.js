/* Игровой слой сайта: очки опыта, уровни, печати за главы, значки, задания дня, «Паспорт краеведа».
   Прогресс хранится только в браузере (localStorage) — никуда не отправляется. */
(function () {
  "use strict";
  var KEY = "nk-game-v1";
  var LEVELS = [
    { xp: 0, name: "Новичок" }, { xp: 40, name: "Краевед" }, { xp: 120, name: "Знаток эпох" },
    { xp: 260, name: "Хронист" }, { xp: 450, name: "Исследователь" }, { xp: 700, name: "Хранитель истории" }
  ];
  var CHAPTERS = [   // порядок и цвета печатей — как на странице глав
    ["foundation", "1918–1940", "#b3392e"], ["war", "1941–1945", "#5b6470"], ["postwar", "1946–1953", "#c07a2c"],
    ["growth", "1954–1964", "#2f8060"], ["builders", "1965–1975", "#7d4f93"], ["shipyard", "1976–1985", "#1f8a8a"],
    ["perestroika", "1986–1991", "#8a7a2a"]
  ];
  var BADGES = [
    { id: "start", ico: "🧭", name: "Первый шаг", d: "Заработайте первые очки", ok: function (s) { return s.xp > 0; } },
    { id: "reader", ico: "📖", name: "Читатель", d: "Прочитайте 10 разделов глав", ok: function (s) { return count(s, "read:") >= 10; } },
    { id: "stamp1", ico: "🏅", name: "Первая печать", d: "Получите печать за викторину (6 из 8)", ok: function (s) { return stamps(s) >= 1; } },
    { id: "stamp4", ico: "🥈", name: "Четыре эпохи", d: "Соберите 4 печати", ok: function (s) { return stamps(s) >= 4; } },
    { id: "stamp7", ico: "🏆", name: "Хранитель эпох", d: "Соберите все 7 печатей", ok: function (s) { return stamps(s) >= 7; } },
    { id: "map8", ico: "🗺", name: "Картограф", d: "Откройте 8 мест на карте", ok: function (s) { return count(s, "map:") >= 8; } },
    { id: "life", ico: "🏠", name: "Знаток быта", d: "Изучите все разделы «Жизни людей»", ok: function (s) { return count(s, "life:") - (s.done["life:slider"] ? 1 : 0) >= 6; } },
    { id: "chrono", ico: "🎯", name: "Точный хронометр", d: "Наберите 500+ очков в игре «Угадай год»", ok: function (s) { return (s.best.year || 0) >= 500; } },
    { id: "streak", ico: "⚡", name: "Безошибочный", d: "Серия из 7 ответов в «Раньше или позже?»", ok: function (s) { return (s.best.pair || 0) >= 7; } },
    { id: "quests", ico: "📅", name: "Упорный", d: "Выполните 5 заданий дня", ok: function (s) { return (s.questsDone || 0) >= 5; } }
  ];
  var QUESTS = [
    { id: "chapter:read", t: "Прочитать любой раздел главы" },
    { id: "map:open", t: "Открыть место на карте" },
    { id: "game:year", t: "Сыграть в «Угадай год»" },
    { id: "game:pair", t: "Сыграть в «Раньше или позже?»" },
    { id: "life:open", t: "Изучить раздел «Жизнь людей»" },
    { id: "quiz:done", t: "Пройти викторину главы" }
  ];

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    s = s || {};
    s.xp = s.xp || 0; s.done = s.done || {}; s.badges = s.badges || {}; s.stamps = s.stamps || {};
    s.best = s.best || {}; s.quiz = s.quiz || {}; s.daily = s.daily || {}; s.questsDone = s.questsDone || 0;
    return s;
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function count(s, prefix) { return Object.keys(s.done).filter(function (k) { return k.indexOf(prefix) === 0; }).length; }
  function stamps(s) { return Object.keys(s.stamps).length; }
  function levelOf(xp) { var i = 0; LEVELS.forEach(function (l, k) { if (xp >= l.xp) i = k; }); return i; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function dailyQuests() {
    var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    var pool = QUESTS.slice(), out = [];
    for (var i = 0; i < 3; i++) { var k = (seed * (i + 3) + i * 7) % pool.length; out.push(pool.splice(k, 1)[0]); }
    return out;
  }
  if (S.daily.date !== today()) { S.daily = { date: today(), done: {} }; save(); }

  // ---------- уведомления ----------
  var toastBox;
  function toast(text, big) {
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "toasts"; toastBox.setAttribute("aria-live", "polite"); document.body.appendChild(toastBox); }
    var t = document.createElement("div"); t.className = "toast" + (big ? " big" : ""); t.textContent = text;
    toastBox.appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, big ? 3600 : 2200);
  }

  // ---------- логика ----------
  function checkBadges() {
    BADGES.forEach(function (b) {
      if (!S.badges[b.id] && b.ok(S)) { S.badges[b.id] = Date.now(); toast("Значок: " + b.ico + " " + b.name, true); }
    });
  }
  function addXp(n, label) {
    var before = levelOf(S.xp);
    S.xp += n;
    var after = levelOf(S.xp);
    if (label) toast("+" + n + " · " + label);
    if (after > before) toast("🎉 Новый уровень: " + LEVELS[after].name, true);
    checkBadges(); save(); render();
  }
  function action(id) {   // задания дня
    QUESTS.forEach(function (q) {
      if (q.id === id && dailyQuests().indexOf(q) >= 0 && !S.daily.done[id]) {
        S.daily.done[id] = 1; S.questsDone++; addXp(20, "Задание дня выполнено");
      }
    });
  }
  var NKG = {
    once: function (id, xp, label, act) { if (act) action(act); if (S.done[id]) return false; S.done[id] = 1; addXp(xp, label); return true; },
    action: action,
    quizDone: function (slug, score, total) {
      action("quiz:done");
      var prev = S.quiz[slug] || 0;
      if (score > prev) { S.quiz[slug] = score; addXp((score - prev) * 5, "Викторина: " + score + " из " + total); }
      if (score >= Math.ceil(total * 0.75) && !S.stamps[slug]) { S.stamps[slug] = score; toast("🏅 Печать за главу получена!", true); checkBadges(); save(); render(); }
    },
    gameResult: function (kind, value, max) {
      action("game:" + kind);
      var prev = S.best[kind] || 0;
      if (value > prev) { S.best[kind] = value; addXp(Math.min(60, Math.round((value - prev) / (max || 1) * 60) + 5), "Новый рекорд"); }
      else addXp(3, "Игра сыграна");
    },
    hasStamp: function (slug) { return !!S.stamps[slug]; },
    quizBest: function (slug) { return S.quiz[slug] || 0; },
    state: function () { return S; }
  };
  window.NKG = NKG;

  // ---------- HUD и паспорт ----------
  var hudBtn, panel;
  function render() {
    if (!hudBtn) return;
    var lv = levelOf(S.xp), next = LEVELS[lv + 1];
    var pct = next ? Math.round((S.xp - LEVELS[lv].xp) / (next.xp - LEVELS[lv].xp) * 100) : 100;
    hudBtn.querySelector(".hud-lv").textContent = "Ур. " + (lv + 1);
    hudBtn.querySelector(".hud-xp").textContent = S.xp + " XP";
    hudBtn.querySelector(".hud-bar i").style.width = pct + "%";
    if (panel && !panel.hidden) fillPanel();
  }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function fillPanel() {
    var lv = levelOf(S.xp), next = LEVELS[lv + 1], box = panel.querySelector(".pass-body");
    box.textContent = "";
    var head = el("div", "pass-head");
    head.appendChild(el("div", "pass-lv", LEVELS[lv].name));
    head.appendChild(el("div", "pass-xp", S.xp + " XP" + (next ? " · до уровня «" + next.name + "»: " + (next.xp - S.xp) : " · максимальный уровень")));
    var bar = el("div", "hud-bar wide"); var fill = el("i"); fill.style.width = (next ? Math.round((S.xp - LEVELS[lv].xp) / (next.xp - LEVELS[lv].xp) * 100) : 100) + "%"; bar.appendChild(fill);
    head.appendChild(bar); box.appendChild(head);

    box.appendChild(el("h3", null, "Печати за эпохи (" + stamps(S) + " из 7)"));
    var st = el("div", "stamps");
    CHAPTERS.forEach(function (c) {
      var a = el("a", "stamp" + (S.stamps[c[0]] ? " on" : "")); a.href = "chapter.html?c=" + c[0]; a.style.setProperty("--c", c[2]);
      a.appendChild(el("b", null, S.stamps[c[0]] ? "✔" : "?")); a.appendChild(el("span", null, c[1]));
      a.title = S.stamps[c[0]] ? "Печать получена" : "Пройдите викторину главы: нужно 6 верных ответов из 8";
      st.appendChild(a);
    });
    box.appendChild(st);

    box.appendChild(el("h3", null, "Задания дня"));
    var ql = el("ul", "quests");
    dailyQuests().forEach(function (q) { var li = el("li", S.daily.done[q.id] ? "done" : "", q.t); ql.appendChild(li); });
    box.appendChild(ql);
    box.appendChild(el("p", "muted-s", "За каждое задание — 20 XP. Новые появляются каждый день."));

    box.appendChild(el("h3", null, "Значки (" + Object.keys(S.badges).length + " из " + BADGES.length + ")"));
    var bl = el("div", "badges");
    BADGES.forEach(function (b) {
      var d = el("div", "badge" + (S.badges[b.id] ? " on" : "")); d.title = b.d;
      d.appendChild(el("span", "ico", S.badges[b.id] ? b.ico : "🔒")); var t = el("div"); t.appendChild(el("b", null, b.name)); t.appendChild(el("small", null, b.d)); d.appendChild(t);
      bl.appendChild(d);
    });
    box.appendChild(bl);

    var reset = el("button", "reset", "Сбросить прогресс"); reset.type = "button";
    reset.addEventListener("click", function () { if (confirm("Стереть очки, печати и значки на этом устройстве?")) { S = { xp: 0 }; try { localStorage.removeItem(KEY); } catch (e) {} S = load(); S.daily = { date: today(), done: {} }; save(); render(); fillPanel(); } });
    box.appendChild(reset);
  }
  function build() {
    var nav = document.querySelector(".topnav .wrap"); if (!nav) return;
    hudBtn = el("button", "hud"); hudBtn.type = "button"; hudBtn.setAttribute("aria-label", "Паспорт краеведа: уровень и очки");
    hudBtn.appendChild(el("span", "hud-lv")); hudBtn.appendChild(el("span", "hud-xp"));
    var bar = el("span", "hud-bar"); bar.appendChild(el("i")); hudBtn.appendChild(bar);
    var theme = document.getElementById("themeBtn"); nav.insertBefore(hudBtn, theme || null);
    panel = el("div", "pass"); panel.hidden = true;
    var card = el("div", "pass-card"); card.setAttribute("role", "dialog"); card.setAttribute("aria-label", "Паспорт краеведа");
    var top = el("div", "pass-top"); top.appendChild(el("h2", null, "Паспорт краеведа"));
    var close = el("button", "pass-x", "✕"); close.type = "button"; close.setAttribute("aria-label", "Закрыть"); close.addEventListener("click", function () { panel.hidden = true; });
    top.appendChild(close); card.appendChild(top); card.appendChild(el("div", "pass-body"));
    panel.appendChild(card); panel.addEventListener("click", function (e) { if (e.target === panel) panel.hidden = true; });
    document.body.appendChild(panel);
    hudBtn.addEventListener("click", function () { fillPanel(); panel.hidden = !panel.hidden; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") panel.hidden = true; });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
