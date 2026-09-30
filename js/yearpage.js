/* Страницы годов (1942.html и т. д.): кнопка «Нашли ошибку», переход к записи по #e123, дата обращения. Сам текст записей уже в HTML. */
(function () {
  "use strict";
  var NK = window.NK;

  document.querySelectorAll(".card[data-id]").forEach(function (c) {
    var foot = c.querySelector(".cardfoot"), first = c.querySelector("p:not(.src)");
    var rb = NK.report && NK.report({ label: "Запись № " + c.dataset.id, hint: c.dataset.year + " год", text: first ? first.textContent : "", path: c.dataset.year + ".html#e" + c.dataset.id });
    if (rb && foot) foot.appendChild(rb);
  });

  // запись могла перейти в другой год: тогда ищем её в общей летописи, она находит запись по номеру
  var h = location.hash;
  if (/^#e\d+$/.test(h)) {
    var n = document.getElementById(h.slice(1));
    if (!n) {
      location.replace("index.html" + h);
    } else {
      var go = function () { n.scrollIntoView({ block: "center" }); n.classList.add("flash"); setTimeout(function () { n.classList.remove("flash"); }, 1700); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 30); }); else window.addEventListener("load", go);
    }
  }

  var d = document.getElementById("citeDate");
  if (d) {
    var t = new Date(), p = function (x) { return (x < 10 ? "0" : "") + x; };
    d.textContent = p(t.getDate()) + "." + p(t.getMonth() + 1) + "." + t.getFullYear();
  }
})();
