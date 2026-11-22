/* 받는 나라 고르기(영어·한국어 페이지) + 문의 양식 보내기. 받는 메일 주소는 서버 설정에만 있고 여기에는 없다. */
(function () {
  // 화면에 들어올 때 톡 튀어나오는 모션. 지원하지 않는 브라우저에서는 처음부터 보인다
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

  // 받는 나라를 고르면 그 나라의 세금 안내와 접점 단추만 보인다
  var radios = document.querySelectorAll('input[name="pick"]');
  function show(cc) {
    document.querySelectorAll("[data-country]").forEach(function (el) {
      el.hidden = el.dataset.country !== cc;
    });
    var sel = document.querySelector('select[name="country"]');
    if (sel && sel.querySelector('option[value="' + cc + '"]')) sel.value = cc;
  }
  if (radios.length) {
    radios.forEach(function (r) { r.addEventListener("change", function () { show(r.value); }); });
    var first = document.querySelector('input[name="pick"]:checked') || radios[0];
    first.checked = true;
    show(first.value);
  }

  // 아직 주소가 없는 접점 단추는 눌러도 이동하지 않는다
  document.querySelectorAll('.btn[aria-disabled="true"]').forEach(function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); });
  });

  var endpoint = document.body.dataset.endpoint || "";

  // 문의 단추를 누른 횟수만 센다(어느 단추·어느 언어 페이지인지). 누가 눌렀는지는 보내지 않는다.
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
      if (j && j.ok) { form.reset(); say("sent"); } else { say("fail", true); }
    }).catch(function () { say("fail", true); }).then(function () { btn.disabled = false; });
  });
})();
