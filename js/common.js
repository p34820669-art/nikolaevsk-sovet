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
  function shorten(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s; }
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
    var btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Нашли ошибку или знаете больше?";
    var out = document.createElement("span"); out.className = "rmsg"; out.hidden = true; out.setAttribute("role", "status");
    btn.addEventListener("click", function () { window.NK.reportSend(ctx, out); });
    box.appendChild(btn); box.appendChild(out);
    return box;
  };
})();
