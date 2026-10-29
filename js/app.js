// Vista principal: línea de tiempo mensual de acciones
(function () {
  const { parseDate, toISO, MONTHS, fmtRange, escapeHTML, normUrl, pad } = window.Util;
  const DOW = ["D", "L", "M", "M", "J", "V", "S"];

  const $ = (id) => document.getElementById(id);
  const board = $("board"), grid = $("grid"), daysEl = $("days"), lanesEl = $("lanes"), emptyEl = $("empty");

  let all = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Mes inicial: ?mes=AAAA-MM o el mes actual
  const q = new URLSearchParams(location.search).get("mes");
  let view = (q && /^\d{4}-\d{2}$/.test(q))
    ? { y: +q.slice(0, 4), m: +q.slice(5, 7) - 1 }
    : { y: today.getFullYear(), m: today.getMonth() };
  let pickerYear = view.y;

  // ---------- Render ----------
  function render(scrollToToday) {
    const { y, m } = view;
    const nDays = new Date(y, m + 1, 0).getDate();
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m, nDays);

    $("monthName").textContent = MONTHS[m].toUpperCase() + (y !== today.getFullYear() ? " " + y : "");
    document.title = `${MONTHS[m]} ${y} · Acciones BBPS`;
    grid.style.setProperty("--days", nDays);

    const isThisMonth = today.getFullYear() === y && today.getMonth() === m;
    const todayIdx = isThisMonth ? today.getDate() : -1;

    // Encabezado de días
    let h = "";
    for (let d = 1; d <= nDays; d++) {
      const dow = new Date(y, m, d).getDay();
      h += `<div class="day${d === todayIdx ? " is-today" : ""}${dow === 0 || dow === 6 ? " is-weekend" : ""}">
              <span class="dnum">${d}</span><span class="dow">${DOW[dow]}</span>
            </div>`;
    }
    daysEl.innerHTML = h;

    // Acciones que tocan este mes
    const items = all
      .map((a, i) => ({ a, i, s: parseDate(a.inicio), e: parseDate(a.cierre) }))
      .filter(x => x.s <= monthEnd && x.e >= monthStart)
      .sort((p, q) => p.s - q.s || q.e - p.e);

    // Reparto en carriles: si dos acciones se pisan, van en filas distintas
    const laneEnds = [];
    items.forEach(x => {
      let lane = laneEnds.findIndex(end => end < x.s);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(x.e); } else laneEnds[lane] = x.e;
      x.lane = lane;
    });
    grid.style.setProperty("--lanes", Math.max(laneEnds.length, 1));

    lanesEl.innerHTML = items.map(x => {
      const startDay = x.s < monthStart ? 1 : x.s.getDate();
      const endDay = x.e > monthEnd ? nDays : x.e.getDate();
      const fromPrev = x.s < monthStart, toNext = x.e > monthEnd;
      const c = window.Store.colorOf(x.a.color, x.i);
      const active = x.s <= today && x.e >= today;
      return `<button type="button" class="bar${fromPrev ? " from-prev" : ""}${toNext ? " to-next" : ""}${active ? " is-active" : ""}"
                data-id="${x.a.id}"
                style="grid-column:${startDay} / ${endDay + 1};grid-row:${x.lane + 1};--c:${c.hex};--t:${c.text}"
                title="${escapeHTML(x.a.titulo)} · ${fmtRange(x.a.inicio, x.a.cierre)}">
                <span class="bar-label">${fromPrev ? "‹ " : ""}${escapeHTML(x.a.titulo)}${toNext ? " ›" : ""}</span>
              </button>`;
    }).join("") + (todayIdx > 0 ? `<div class="today-line" style="left:calc(${todayIdx - 0.5} * var(--col) - 1px)"></div>` : "");

    emptyEl.hidden = items.length > 0;
    emptyEl.textContent = `No hay acciones cargadas en ${MONTHS[m].toLowerCase()}.`;

    if (scrollToToday) {
      requestAnimationFrame(() => {
        const col = daysEl.firstElementChild ? daysEl.firstElementChild.offsetWidth : 0;
        board.scrollTo({ left: todayIdx > 0 ? Math.max(0, (todayIdx - 2) * col) : 0, top: 0, behavior: "auto" });
      });
    }
  }

  function setMonth(y, m) {
    if (m < 0) { y--; m = 11; } if (m > 11) { y++; m = 0; }
    view = { y, m };
    const url = new URL(location.href);
    if (y === today.getFullYear() && m === today.getMonth()) url.searchParams.delete("mes");
    else url.searchParams.set("mes", `${y}-${pad(m + 1)}`);
    history.replaceState(null, "", url);
    render(true);
  }

  // ---------- Selector de mes ----------
  const picker = $("picker");
  function renderPicker() {
    $("pickerYear").textContent = pickerYear;
    const has = new Set();
    all.forEach(a => {
      let d = parseDate(a.inicio); d.setDate(1);
      const e = parseDate(a.cierre);
      while (d <= e) { has.add(`${d.getFullYear()}-${d.getMonth()}`); d.setMonth(d.getMonth() + 1); }
    });
    $("pickerMonths").innerHTML = MONTHS.map((n, i) => {
      const cur = pickerYear === view.y && i === view.m;
      return `<button type="button" data-m="${i}" class="${cur ? "is-current" : ""}">
                ${n.slice(0, 3).toUpperCase()}${has.has(`${pickerYear}-${i}`) ? '<i class="dot"></i>' : ""}
              </button>`;
    }).join("");
  }
  function openPicker() { pickerYear = view.y; renderPicker(); picker.hidden = false; }
  function closePicker() { picker.hidden = true; }
  $("pickMonth").addEventListener("click", openPicker);
  $("prevYear").addEventListener("click", () => { pickerYear--; renderPicker(); });
  $("nextYear").addEventListener("click", () => { pickerYear++; renderPicker(); });
  $("pickerMonths").addEventListener("click", e => {
    const b = e.target.closest("button[data-m]"); if (!b) return;
    closePicker(); setMonth(pickerYear, +b.dataset.m);
  });
  $("goToday").addEventListener("click", () => { closePicker(); setMonth(today.getFullYear(), today.getMonth()); });
  picker.addEventListener("click", e => { if (e.target === picker) closePicker(); });

  // ---------- Detalle (modal) ----------
  const modal = $("modal");
  function openModal(a) {
    $("mTitle").textContent = a.titulo;
    $("mDates").textContent = fmtRange(a.inicio, a.cierre);
    const body = (a.descripcion || "").trim();
    $("mBody").innerHTML = body ? escapeHTML(body) : '<span class="muted">Sin tareas cargadas.</span>';
    $("mBody").scrollTop = 0;
    const links = [["LINK A GRÁFICAS", a.link_graficas], ["LINK AL BRIEF", a.link_brief], ["OTRO LINK", a.link_otro]]
      .filter(([, u]) => u && u.trim())
      .map(([l, u]) => {
        const href = normUrl(u);
        const shown = href.replace(/^https?:\/\/(www\.)?/i, "");
        return `<p><b>${l}:</b> <a href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(shown)}</a></p>`;
      });
    $("mLinks").innerHTML = links.join("");
    $("mLinks").hidden = links.length === 0;
    modal.hidden = false;
    document.body.classList.add("no-scroll");
    $("mClose").focus({ preventScroll: true });
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove("no-scroll"); }
  $("mClose").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closePicker(); } });

  lanesEl.addEventListener("click", e => {
    const b = e.target.closest(".bar"); if (!b) return;
    const a = all.find(x => String(x.id) === b.dataset.id);
    if (a) openModal(a);
  });

  // Rueda del mouse vertical → scroll horizontal cuando no hay más para bajar
  board.addEventListener("wheel", e => {
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const canV = board.scrollHeight > board.clientHeight + 1;
    const atEdge = e.deltaY > 0
      ? board.scrollTop + board.clientHeight >= board.scrollHeight - 1
      : board.scrollTop <= 0;
    if (!canV || atEdge) { board.scrollLeft += e.deltaY; e.preventDefault(); }
  }, { passive: false });

  // ---------- Datos ----------
  async function load(first) {
    try {
      all = await window.Store.list();
    } catch (err) {
      console.error(err);
      emptyEl.hidden = false;
      emptyEl.textContent = "No se pudieron cargar las acciones. Revisá la conexión.";
      return;
    }
    render(first);
  }
  window.Store.subscribe(() => load(false));
  load(true);
})();
