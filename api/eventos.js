// Puente con la web de Eventos del shopping.
// Lee en vivo la lista de eventos de esa web (no guarda copia):
// si un evento se borra allá, deja de aparecer acá.
//
// Dirección de la web de eventos: cambiala acá o definí la variable
// de entorno EVENTOS_URL en Vercel (Settings → Environment Variables).
const EVENTOS_URL = process.env.EVENTOS_URL || "https://eventos-bbps.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }

  try {
    const r = await fetch(EVENTOS_URL.replace(/\/+$/, "") + "/api/events", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const list = await r.json();
    // Solo se pasa lo necesario para el calendario
    const out = (Array.isArray(list) ? list : [])
      .filter(e => e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
      .map(e => ({ id: String(e.id), title: String(e.title), date: e.date, time: e.time || "" }));
    return res.json(out);
  } catch (e) {
    return res.status(502).json({ error: "No se pudo leer la web de eventos" });
  }
}
