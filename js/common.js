/* Общее для всех страниц: навигация, тема, мелкие помощники. */
(function () {
  "use strict";

  // ---- тема (светлая по умолчанию) ----
  function getTheme() { try { return localStorage.getItem("nk-theme") || "light"; } catch (e) { return "light"; } }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("nk-theme", t); } catch (e) {}
    var b = document.getElementById("themeBtn");
    if (b) { b.textContent = t === "dark" ? "☀" : "☾"; b.title = t === "dark" ? "Светлая тема" : "Тёмная тема"; }
  }
  document.documentElement.setAttribute("data-theme", getTheme());

  // ---- навигация ----
  var PAGES = [
    ["index.html", "Летопись"],
    ["chapter.html", "Главы"],
    ["life.html", "Жизнь"],
    ["map.html", "Карта"],
    ["play.html", "Игра"],
    ["help.html", "Справка"]
  ];
  var here = (location.pathname.split("/").pop() || "index.html");
  var nav = document.createElement("nav");
  nav.className = "topnav";
  nav.id = "top";
  var inner = document.createElement("div");
  inner.className = "wrap";
  var brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "index.html";
  brand.innerHTML = "<span class=\"bn\">Николаевск-на-Амуре</span><span class=\"sep\"> · </span><b>советские годы</b>";
  inner.appendChild(brand);
  var links = document.createElement("div");   // ссылки в отдельном блоке: на телефоне он уходит на вторую строку
  links.className = "navlinks";
  PAGES.forEach(function (p) {
    var a = document.createElement("a");
    a.className = "nl";
    a.href = p[0];
    a.textContent = p[1];
    if (p[0].split("#")[0] === here) a.setAttribute("aria-current", "page");
    links.appendChild(a);
  });
  inner.appendChild(links);
  // мягкое затухание по краям, когда меню на телефоне прокручивается
  function fade() {
    var max = links.scrollWidth - links.clientWidth;
    links.classList.toggle("fade-l", links.scrollLeft > 4);
    links.classList.toggle("fade-r", max > 4 && links.scrollLeft < max - 4);
  }
  links.addEventListener("scroll", fade, { passive: true });
  window.addEventListener("resize", fade);
  window.addEventListener("load", fade);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fade);
  var tb = document.createElement("button");
  tb.className = "theme-btn";
  tb.id = "themeBtn";
  tb.type = "button";
  tb.setAttribute("aria-label", "Переключить тему");
  tb.addEventListener("click", function () { setTheme(getTheme() === "dark" ? "light" : "dark"); });
  inner.appendChild(tb);
  nav.appendChild(inner);
  document.body.insertBefore(nav, document.body.firstChild);
  setTheme(getTheme());
  fade();
  var cur = links.querySelector("[aria-current]");   // текущий пункт меню не должен прятаться за краем
  if (cur && cur.scrollIntoView && links.scrollWidth > links.clientWidth) links.scrollLeft = Math.max(0, cur.offsetLeft - 24);
  fade();

  // ---- неразрывные пробелы: «1 174», «1941 г.», «50 т», «№ 5» не рвутся на конце строки ----
  var NB = "\u00A0";
  function nbsp(s) {
    s = s.replace(/(^|[^\d.,])(\d{1,3}(?: \d{3})+)(?!\d)/g, function (m, a, b) { return a + b.replace(/ /g, NB); });
    s = s.replace(/(\d) (?=(?:г\.|гг\.|т|чел\.|тыс\.|млн|млрд|₽|руб\.|коп\.|км|кв\.|га|шт\.|кг|м|%)(?![а-яёА-ЯЁ]))/g, "$1" + NB);
    s = s.replace(/(тыс\.|млн|млрд) (?=(?:т|₽|руб\.|чел\.|кв\.|га|шт\.|кг|км|человек|рублей|тонн|коек)(?![а-яёА-ЯЁ]))/g, "$1" + NB);   // «163 тыс. т» не рвём между «тыс.» и «т»
    return s.replace(/(№|§) (?=\d)/g, "$1" + NB);
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, svg: 1, SVG: 1 };
  function fixNode(n) {
    if (n.nodeType === 3) { var v = n.nodeValue; if (v.indexOf(" ") >= 0) { var w = nbsp(v); if (w !== v) n.nodeValue = w; } return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName]) return;
    for (var c = n.firstChild; c; c = c.nextSibling) fixNode(c);
  }
  var pend = [], busy = false;
  function flush() { busy = false; var list = pend; pend = []; list.forEach(fixNode); }
  if (window.MutationObserver) {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) pend.push(m.addedNodes[i]); });
      if (!busy && pend.length) { busy = true; (window.requestAnimationFrame || setTimeout)(flush); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", function () { fixNode(document.body); });
  if (document.readyState !== "loading") fixNode(document.body);

  // ---- помощники ----
  window.NK = {
    el: function (tag, cls, txt) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (txt != null) n.textContent = txt;
      return n;
    },
    plural: function (n, a, b, c) {
      var m = n % 100, d = n % 10;
      if (m >= 11 && m <= 14) return c;
      if (d === 1) return a;
      if (d >= 2 && d <= 4) return b;
      return c;
    },
    eventById: function () {
      var map = {};
      (window.SITE_DATA ? window.SITE_DATA.events : []).forEach(function (e) { map[e.id] = e; });
      return map;
    },
    // цвета эпох (в том же порядке, что в meta.eras)
    ERA_COLORS: ["#b3392e", "#25709b", "#5b6470", "#c07a2c", "#2f8060", "#7d4f93", "#1f8a8a", "#8a7a2a"]
  };

  // ---- «Нашли ошибку или знаете больше?» ----
  // Ничего никуда не отправляется: текст копируется в буфер, и открывается чат автора (window.SITE.contact из data/site.js).
  // ctx: {label: "Запись № 123", hint: "1942 год", text: "...", path: "index.html#e123", prompt: "Что нужно исправить или дополнить:"}
  function shorten(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "").replace(/[\s.,;:–—-]+$/, "") + "…" : s; }   // без «с.…»: точку и запятую перед многоточием убираем
  function copyText(text) {
    return new Promise(function (resolve) {
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta); resolve(!!ok);
        } catch (e) { resolve(false); }
      }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback);
      else fallback();
    });
  }
  window.NK.shorten = shorten;
  window.NK.nbsp = nbsp;
  window.NK.fixText = fixNode;
  window.NK.reportSend = function (ctx, out) {
    var S = window.SITE || {};
    if (!S.contact) return;
    var base = S.url || (location.origin + location.pathname.replace(/[^\/]*$/, ""));
    var lines = ["Николаевск-на-Амуре. Советские годы", ctx.label + (ctx.hint ? " (" + ctx.hint + ")" : "")];
    if (ctx.text) lines.push("«" + shorten(ctx.text, 220) + "»");
    lines.push("Ссылка: " + base + ctx.path, "", ctx.prompt || "Что нужно исправить или дополнить:", "");
    var text = lines.join("\n");
    var url = S.contact;
    if (/^mailto:/i.test(url)) url += "?subject=" + encodeURIComponent("Николаевск-на-Амуре: " + ctx.label) + "&body=" + encodeURIComponent(text);
    out.hidden = false; out.textContent = "";
    copyText(text).then(function (ok) {
      out.textContent = "";
      var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = S.contactLabel || "Написать автору";
      if (ok) {
        out.appendChild(document.createTextNode("Описание записи скопировано. Откройте чат с автором, вставьте текст и допишите, что нужно исправить: "));
        out.appendChild(a);
      } else {
        out.appendChild(document.createTextNode("Не удалось скопировать автоматически. Скопируйте текст ниже, откройте чат с автором и вставьте его: "));
        out.appendChild(a);
        var ta = document.createElement("textarea"); ta.readOnly = true; ta.rows = 6; ta.value = text;
        out.appendChild(ta); ta.focus(); ta.select();
      }
      // чат открываем после копирования: пока открыта другая вкладка, браузер мог бы отказать в записи в буфер
      window.open(url, "_blank", "noopener");
    });
  };
  window.NK.report = function (ctx) {
    if (!(window.SITE && window.SITE.contact)) return null;
    var box = document.createElement("div"); box.className = "report";
    var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "✎ Нашли ошибку или знаете больше?";
    var out = document.createElement("span"); out.className = "rmsg"; out.hidden = true; out.setAttribute("role", "status");
    btn.addEventListener("click", function () { window.NK.reportSend(ctx, out); });
    box.appendChild(btn); box.appendChild(out);
    return box;
  };
})();
