/* 휴대폰 서랍 메뉴 · 받는 나라 고르기(한국어·영어 쪽, 쪽을 옮겨도 기억) · 문의 양식 보내기 · 문의 단추 누른 횟수.
   받는 메일 주소는 서버 설정에만 있고 여기에는 없다. 스크립트가 없어도 내용과 메뉴 링크는 모두 보인다. */
(function () {
  var root = document.documentElement;

  // 홈 아래쪽 카드가 화면에 들어올 때 톡 튀어나오는 모션. 지원하지 않는 브라우저에서는 처음부터 보인다
  var pops = document.querySelectorAll(".pop");
  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    pops.forEach(function (el) { seen.observe(el); });
  } else {
    pops.forEach(function (el) { el.classList.add("in"); });
  }

  // 서랍 메뉴 (860px 아래). 열면 첫 링크로 초점, Tab 은 서랍 안에서만, Esc·닫기·바깥 누름으로 닫고 초점은 메뉴 단추로
  var menuBtn = document.querySelector(".menu-btn");
  var drawer = document.getElementById("drawer");
  if (menuBtn && drawer) {
    var panel = drawer.querySelector(".drawer-panel");
    var focusables = function () {
      return Array.prototype.filter.call(panel.querySelectorAll("a[href], button"), function (el) {
        return el.offsetWidth || el.offsetHeight;
      });
    };
    var setInert = function (on) {
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== drawer && el.tagName !== "SCRIPT") el.inert = on;
      });
    };
    var openDrawer = function () {
      drawer.hidden = false;
      menuBtn.setAttribute("aria-expanded", "true");
      root.classList.add("locked");
      setInert(true);
      var first = panel.querySelector("a[href]");
      if (first) first.focus();
    };
    var closeDrawer = function (giveBack) {
      if (drawer.hidden) return;
      drawer.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
      root.classList.remove("locked");
      setInert(false);
      if (giveBack !== false) menuBtn.focus();
    };
    menuBtn.addEventListener("click", function () {
      if (drawer.hidden) openDrawer(); else closeDrawer();
    });
    drawer.querySelector(".drawer-close").addEventListener("click", function () { closeDrawer(); });
    drawer.addEventListener("click", function (e) {
      if (e.target === drawer) closeDrawer();                       // 어두운 바깥을 누름
      else if (e.target.closest && e.target.closest("a[href]")) closeDrawer(false);   // 링크로 이동
    });
    document.addEventListener("keydown", function (e) {
      if (drawer.hidden) return;
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); closeDrawer(); return; }
      if (e.key !== "Tab") return;
      var list = focusables();
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1], at = document.activeElement;
      if (e.shiftKey && (at === first || !panel.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !panel.contains(at))) { e.preventDefault(); first.focus(); }
    });
    // 화면이 넓어지면(가로로 돌림 등) 서랍을 닫는다 — 넓은 화면에는 머리글 메뉴가 있다
    if (window.matchMedia) {
      var wide = window.matchMedia("(min-width: 860px)");
      var onWide = function () { if (wide.matches) closeDrawer(false); };
      if (wide.addEventListener) wide.addEventListener("change", onWide); else if (wide.addListener) wide.addListener(onWide);
    }
  }

  // 받는 나라 — 한국어·영어 쪽에서 고른 나라를 기억해 다른 쪽에서도 그 나라로 시작한다(저장이 안 되면 첫 나라)
  var KEY = "haeyo_country";
  var remember = document.body.hasAttribute("data-remember");
  function load() { try { return remember ? localStorage.getItem(KEY) : null; } catch (e) { return null; } }
  function save(cc) { try { if (remember) localStorage.setItem(KEY, cc); } catch (e) {} }
  var radios = document.querySelectorAll('input[name="pick"]');
  var sel = document.querySelector('select[name="country"]');
  function show(cc) {
    document.querySelectorAll("[data-country]").forEach(function (el) {
      el.hidden = el.dataset.country !== cc;
    });
    if (sel && sel.querySelector('option[value="' + cc + '"]')) sel.value = cc;
  }
  var stored = load();
  if (radios.length) {
    var start = null;
    radios.forEach(function (r) {
      if (r.value === stored) start = r;
      r.addEventListener("change", function () { save(r.value); show(r.value); });
    });
    start = start || document.querySelector('input[name="pick"]:checked') || radios[0];
    start.checked = true;
    show(start.value);
  }
  if (sel) {
    if (stored && sel.querySelector('option[value="' + stored + '"]')) sel.value = stored;
    sel.addEventListener("change", function () {
      save(sel.value);
      radios.forEach(function (r) { if (r.value === sel.value) { r.checked = true; show(r.value); } });
    });
  }

  // 아직 주소가 없는 접점 단추는 눌러도 이동하지 않는다
  document.querySelectorAll('.btn[aria-disabled="true"]').forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); });
  });

  var endpoint = document.body.dataset.endpoint || "";

  // 문의 단추를 누른 횟수만 센다(어느 단추·어느 언어 쪽인지). 누가 눌렀는지는 보내지 않는다.
  document.querySelectorAll("[data-click]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!endpoint || !navigator.sendBeacon) return;
      try {
        navigator.sendBeacon(endpoint, JSON.stringify({
          event: "click", button: b.dataset.click, lang: document.body.dataset.lang
        }));
      } catch (e) {}
    });
  });

  var form = document.querySelector("form.ask");
  if (!form) return;
  var status = form.querySelector(".status");
  function say(key, bad) {
    status.textContent = status.dataset[key];
    status.classList.toggle("bad", !!bad);
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var ok = ["name", "contact", "country", "message"].every(function (k) { return String(d.get(k) || "").trim(); });
    if (!ok || !form.consent.checked) { say("need", true); return; }
    if (!endpoint) { say("off", true); return; }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        name: d.get("name"), contact: d.get("contact"), country: d.get("country"),
        message: d.get("message"), consent: true, lang: document.body.dataset.lang,
        website: d.get("website") || ""
      })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) { form.reset(); if (sel && load()) sel.value = load(); say("sent"); } else { say("fail", true); }
    }).catch(function () { say("fail", true); }).then(function () { btn.disabled = false; });
  });
})();
