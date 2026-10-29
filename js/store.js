// Capa de datos: Supabase si está configurado, si no localStorage (modo prueba).
(function () {
  const cfg = window.APP_CONFIG || {};
  const useSupabase = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const TABLE = cfg.TABLE || "acciones";
  const LS_KEY = "bbps_acciones_v1";
  const client = useSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  // Paleta de colores disponibles para las barras
  const COLORS = [
    { id: "azul",     hex: "#38A9DF", text: "#fff" },
    { id: "verde",    hex: "#46FF94", text: "#0b3b22" },
    { id: "rojo",     hex: "#FF1A33", text: "#fff" },
    { id: "violeta",  hex: "#7B5CFF", text: "#fff" },
    { id: "naranja",  hex: "#FF8A1F", text: "#fff" },
    { id: "amarillo", hex: "#FFD21F", text: "#3d3000" },
    { id: "rosa",     hex: "#FF4FB0", text: "#fff" },
    { id: "gris",     hex: "#3A3A3A", text: "#fff" }
  ];
  const colorOf = (id, idx) => COLORS.find(c => c.id === id) || COLORS[(idx || 0) % COLORS.length];

  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }
  function lsWrite(rows) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch (e) {}
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  const FIELDS = ["titulo", "inicio", "cierre", "descripcion", "link_graficas", "link_brief", "link_otro", "color"];
  const clean = (obj) => { const o = {}; FIELDS.forEach(k => { o[k] = obj[k] ?? null; }); return o; };

  async function list() {
    if (useSupabase) {
      const { data, error } = await client.from(TABLE).select("*")
        .order("inicio", { ascending: true }).order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return lsRead().sort((a, b) => a.inicio.localeCompare(b.inicio) || a.created_at.localeCompare(b.created_at));
  }

  async function create(row) {
    const r = clean(row);
    if (useSupabase) {
      const { data, error } = await client.from(TABLE).insert(r).select().single();
      if (error) throw error;
      return data;
    }
    const now = new Date().toISOString();
    const full = { id: uid(), created_at: now, updated_at: now, ...r };
    const rows = lsRead(); rows.push(full); lsWrite(rows);
    return full;
  }

  async function update(id, row) {
    const r = { ...clean(row), updated_at: new Date().toISOString() };
    if (useSupabase) {
      const { data, error } = await client.from(TABLE).update(r).eq("id", id).select().single();
      if (error) throw error;
      return data;
    }
    const rows = lsRead().map(x => (x.id === id ? { ...x, ...r } : x));
    lsWrite(rows);
    return rows.find(x => x.id === id);
  }

  async function remove(id) {
    if (useSupabase) {
      const { error } = await client.from(TABLE).delete().eq("id", id);
      if (error) throw error;
      return;
    }
    lsWrite(lsRead().filter(x => x.id !== id));
  }

  // Avisa cuando cambian los datos (otra persona carga algo, u otra pestaña)
  function subscribe(cb) {
    if (useSupabase) {
      client.channel("acciones-live")
        .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => cb())
        .subscribe();
    } else {
      window.addEventListener("storage", e => { if (e.key === LS_KEY) cb(); });
    }
  }

  // Utilidades de fecha (siempre como fecha local YYYY-MM-DD, sin husos horarios)
  const parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const fmt = (s) => { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3).toLowerCase()} ${d.getFullYear()}`; };
  const fmtRange = (a, b) => a === b ? fmt(a) : `${fmt(a)} → ${fmt(b)}`;

  const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const normUrl = (u) => { u = (u || "").trim(); if (!u) return ""; return /^https?:\/\//i.test(u) ? u : "https://" + u; };

  window.Store = { list, create, update, remove, subscribe, useSupabase, COLORS, colorOf };
  window.Util = { parseDate, toISO, MONTHS, fmt, fmtRange, escapeHTML, normUrl, pad };
})();
