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

// 모듈 안 "지금 여기": 큰 절(h2)마다 칩을 만들고, 스크롤하면 지금 읽는 절을 빨갛게 표시한다
(function () {
  var hero = document.querySelector("article .hero");
  if (!hero) return;
  var heads = Array.prototype.filter.call(document.querySelectorAll("article h2"), function (h) {
    var t = h.textContent.trim();
    return !h.closest("details") && !/^(자주 막히는 곳|✅)/.test(t);
  });
  if (heads.length < 2) return;
  function label(t) {
    t = t.replace(/\s*\([^)]*\)\s*/g, " ").replace(/[⭐]/g, "").trim();
    var i = t.indexOf(":");
    if (i > 0) {
      var head = t.slice(0, i).trim(), rest = t.slice(i + 1).trim();
      if (/^(\d+(-\d+)*\.?|\d+단계(-B)?)$/.test(head)) {
        var words = rest.replace(/\s*=.*$/, "").split(/\s+/), pick = [];
        while (words.length && pick.join(" ").length < 5) pick.push(words.shift());
        t = head + " " + pick.join(" ");
      } else t = head;
    }
    return t.length > 16 ? t.slice(0, 15) + "…" : t;
  }
  var bar = document.createElement("nav");
  bar.className = "steps-bar"; bar.setAttribute("aria-label", "이 모듈 안의 순서");
  var links = heads.map(function (h, i) {
    if (!h.id) h.id = "s" + (i + 1);
    var a = document.createElement("a");
    a.href = "#" + h.id;
    var isDo = !!h.closest("section.do");
    if (isDo) a.className = "is-do";
    a.textContent = (isDo ? "✋ " : "") + label(h.textContent);
    bar.appendChild(a);
    return a;
  });
  hero.insertAdjacentElement("afterend", bar);
  var cur = -1;
  function update() {
    var top = bar.getBoundingClientRect().bottom + 24, k = 0;
    heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= top) k = i; });
    if (k === cur) return;
    cur = k;
    links.forEach(function (a, i) { if (i === k) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); });
    var a = links[k], l = a.offsetLeft - bar.offsetLeft;
    if (l < bar.scrollLeft || l + a.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = l - 16;
  }
  window.addEventListener("scroll", update, { passive: true });
  update();
})();
