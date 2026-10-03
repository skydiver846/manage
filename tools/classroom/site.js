// 교육생용 사이트 공통 동작: 복사 버튼, 체크박스 기억, 휴대폰 목차
(function () {
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // 코드·프롬프트 상자마다 [복사] 버튼
  document.querySelectorAll("article pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy"; btn.textContent = "복사";
    btn.addEventListener("click", function () {
      var text = (pre.querySelector("code") || pre).innerText;
      var done = function () { btn.textContent = "복사됨"; setTimeout(function () { btn.textContent = "복사"; }, 1500); };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(pre.querySelector("code") || pre);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        btn.textContent = "Ctrl+C 누르기";
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
    pre.appendChild(btn);
  });

  // 체크박스: 이 PC 브라우저에 기억
  var page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll('article li input[type="checkbox"]').forEach(function (c, i) {
    var key = "classroom-" + page + "-" + i;
    var saved = store.get(key);
    if (saved !== null) c.checked = saved === "1";
    c.addEventListener("change", function () { store.set(key, c.checked ? "1" : "0"); });
  });

  // 휴대폰·좁은 화면: 목차 서랍
  var side = document.getElementById("side"), menu = document.getElementById("menu");
  if (menu) menu.addEventListener("click", function () { side.classList.toggle("open"); });
  document.addEventListener("click", function (e) {
    if (side.classList.contains("open") && !e.target.closest("#side, #menu")) side.classList.remove("open");
  });
})();
