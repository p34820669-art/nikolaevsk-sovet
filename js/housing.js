/* Страница «Жильё»: фильтр таблицы по территории и кнопка «расскажите» (NK.report). */
(function () {
  var chips = document.querySelectorAll("#hsChips .chip"), rows = document.querySelectorAll("#hsTable tbody tr");
  function show(g) {
    rows.forEach(function (r) { r.hidden = !!g && r.getAttribute("data-g") !== g; });
    chips.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-g") === g ? "true" : "false"); });
  }
  chips.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-g")); }); });
  var box = document.getElementById("hsAsk");
  if (box && window.NK && NK.report) {
    var r = NK.report({
      label: "Жильё: моя история", hint: "как получали квартиру", path: "housing.html#want",
      prompt: "Расскажите: когда и где вы (или ваши родные) получили квартиру, когда встали на учёт, сколько ждали, от кого получали ордер:"
    });
    if (r) { r.querySelector("button").textContent = "Рассказать, как получали квартиру"; box.appendChild(r); }
  }
})();
