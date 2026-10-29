// Panel /admin: carga, modificación y borrado de acciones
(function () {
  const { fmtRange, escapeHTML } = window.Util;
  const S = window.Store;
  const $ = (id) => document.getElementById(id);

  const form = $("form"), listEl = $("list"), err = $("err"), saveBtn = $("save");
  const f = {
    titulo: $("titulo"), inicio: $("inicio"), cierre: $("cierre"), descripcion: $("descripcion"),
    link_graficas: $("lGraficas"), link_brief: $("lBrief"), link_otro: $("lOtro")
  };
  let all = [], editingId = null, color = S.COLORS[0].id;

  // ---------- Colores ----------
  function renderSwatches() {
    $("swatches").innerHTML = S.COLORS.map(c =>
      `<button type="button" role="radio" aria-checked="${c.id === color}" aria-label="${c.id}"
               data-c="${c.id}" style="--c:${c.hex}" class="sw${c.id === color ? " on" : ""}"></button>`).join("");
  }
  $("swatches").addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    color = b.dataset.c; renderSwatches();
  });
  // Sugiere un color distinto al de la última acción cargada
  function nextColor() {
    const last = all[all.length - 1];
    if (!last) return S.COLORS[0].id;
    const used = all.slice(-3).map(a => a.color);
    return (S.COLORS.find(c => !used.includes(c.id)) || S.COLORS[0]).id;
  }

  // ---------- Formulario ----------
  f.inicio.addEventListener("change", () => {
    if (f.inicio.value && (!f.cierre.value || f.cierre.value < f.inicio.value)) f.cierre.value = f.inicio.value;
    f.cierre.min = f.inicio.value || "";
  });

  function resetForm() {
    form.reset();
    editingId = null;
    f.cierre.min = "";
    $("editing").hidden = true;
    saveBtn.textContent = "GUARDAR";
    err.textContent = "";
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    color = nextColor(); renderSwatches();
    renderList();
  }

  function fillForm(a) {
    editingId = a.id;
    f.titulo.value = a.titulo || "";
    f.inicio.value = a.inicio; f.cierre.value = a.cierre; f.cierre.min = a.inicio;
    f.descripcion.value = a.descripcion || "";
    f.link_graficas.value = a.link_graficas || "";
    f.link_brief.value = a.link_brief || "";
    f.link_otro.value = a.link_otro || "";
    color = S.colorOf(a.color, all.indexOf(a)).id; renderSwatches();
    $("editingName").textContent = a.titulo;
    $("editing").hidden = false;
    saveBtn.textContent = "GUARDAR CAMBIOS";
    err.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => f.titulo.focus({ preventScroll: true }), 300);
  }
  $("cancelEdit").addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    const missing = ["titulo", "inicio", "cierre"].filter(k => !f[k].value.trim());
    missing.forEach(k => f[k].classList.add("invalid"));
    if (missing.length) { err.textContent = "Completá los campos obligatorios."; f[missing[0]].focus(); return; }
    if (f.cierre.value < f.inicio.value) {
      f.cierre.classList.add("invalid");
      err.textContent = "La fecha de cierre no puede ser anterior a la de inicio."; return;
    }
    err.textContent = "";
    const row = {
      titulo: f.titulo.value.trim(),
      inicio: f.inicio.value, cierre: f.cierre.value,
      descripcion: f.descripcion.value.trim() || null,
      link_graficas: f.link_graficas.value.trim() || null,
      link_brief: f.link_brief.value.trim() || null,
      link_otro: f.link_otro.value.trim() || null,
      color
    };
    saveBtn.disabled = true;
    try {
      if (editingId) { await S.update(editingId, row); toast("Acción modificada"); }
      else { await S.create(row); toast("Acción guardada"); }
      await load();
      resetForm();
    } catch (ex) {
      console.error(ex);
      err.textContent = "No se pudo guardar. Revisá la conexión e intentá de nuevo.";
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ---------- Historial ----------
  const pencil = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z"/><path d="M14.5 6.5l3 3M5 16l3 3"/></svg>';
  const xIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8"/></svg>';

  function renderList() {
    if (!all.length) { listEl.innerHTML = '<p class="hist-empty">Todavía no hay acciones cargadas.</p>'; return; }
    // Más recientes primero (por fecha de inicio)
    const rows = [...all].sort((a, b) => b.inicio.localeCompare(a.inicio) || (b.created_at || "").localeCompare(a.created_at || ""));
    listEl.innerHTML = rows.map(a => {
      const c = S.colorOf(a.color, all.indexOf(a));
      return `<div class="row${a.id === editingId ? " is-editing" : ""}" data-id="${a.id}">
        <span class="row-dot" style="--c:${c.hex}"></span>
        <div class="row-main">
          <span class="row-title">${escapeHTML(a.titulo)}</span>
          <span class="row-dates">${fmtRange(a.inicio, a.cierre)}</span>
        </div>
        <button type="button" class="row-edit" data-act="edit">Modificar ${pencil}</button>
        <button type="button" class="row-del" data-act="del" aria-label="Eliminar ${escapeHTML(a.titulo)}">${xIcon}</button>
      </div>`;
    }).join("");
  }

  listEl.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const id = b.closest(".row").dataset.id;
    const a = all.find(x => String(x.id) === id); if (!a) return;
    if (b.dataset.act === "edit") { fillForm(a); renderList(); return; }
    if (!confirm(`¿Eliminar la acción "${a.titulo}"? No se puede deshacer.`)) return;
    try {
      await S.remove(a.id);
      if (editingId === a.id) resetForm();
      toast("Acción eliminada");
      await load();
    } catch (ex) { console.error(ex); alert("No se pudo eliminar. Intentá de nuevo."); }
  });

  // ---------- Toast ----------
  let tt;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- Datos ----------
  async function load() {
    try { all = await S.list(); }
    catch (ex) { console.error(ex); listEl.innerHTML = '<p class="hist-empty">No se pudieron cargar las acciones.</p>'; return; }
    renderList();
  }
  S.subscribe(load);
  load().then(() => { color = nextColor(); renderSwatches(); });
  renderSwatches();

  if (!S.useSupabase) {
    const n = document.createElement("p");
    n.className = "demo-note";
    n.textContent = "Modo prueba: las acciones se guardan solo en este navegador. Configurá Supabase en js/config.js para compartirlas.";
    form.before(n);
  }
})();
