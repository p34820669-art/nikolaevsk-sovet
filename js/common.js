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
    ["play.html", "Игра"]
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
  brand.innerHTML = "Николаевск-на-Амуре · <b>советские годы</b>";
  inner.appendChild(brand);
  PAGES.forEach(function (p) {
    var a = document.createElement("a");
    a.className = "nl";
    a.href = p[0];
    a.textContent = p[1];
    if (p[0].split("#")[0] === here) a.setAttribute("aria-current", "page");
    inner.appendChild(a);
  });
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
})();
