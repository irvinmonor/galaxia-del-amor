// API de subida a Backblaze B2 — solo con sesión de admin.
//   GET  /api/subir                          → URL para subida simple (archivos ≤ 5 GB)
//   POST /api/subir?accion=iniciar           → empieza un archivo grande (multiparte)
//   GET  /api/subir?accion=parte&fileId=...  → URL para subir una parte
//   POST /api/subir?accion=finalizar         → cierra el archivo grande
const SUPA_URL = "https://cucohhqkbjssjidafjwy.supabase.co";
const SUPA_KEY = "sb_publishable_wR0GEFnB-T6HtFfUaREqJw_mcy0f-ZA";

let cache = { t: 0, auth: null };

async function b2Auth() {
  if (cache.auth && Date.now() - cache.t < 20 * 60 * 1000) return cache.auth;
  const r = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: {
      Authorization: "Basic " + Buffer.from(process.env.B2_KEY_ID + ":" + process.env.B2_APP_KEY).toString("base64")
    }
  });
  if (!r.ok) throw new Error("B2 auth fallo: " + r.status);
  const j = await r.json();
  cache = { t: Date.now(), auth: j };
  return j;
}

async function esAdmin(req) {
  const tok = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!tok) return false;
  const r = await fetch(SUPA_URL + "/auth/v1/user", {
    headers: { apikey: SUPA_KEY, Authorization: "Bearer " + tok }
  });
  return r.ok;
}

async function b2(a, ruta, cuerpo) {
  const r = await fetch(a.apiUrl + "/b2api/v2/" + ruta, {
    method: "POST",
    headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(ruta + " fallo: " + JSON.stringify(j));
  return j;
}

export default async function handler(req, res) {
  try {
    if (!process.env.B2_KEY_ID) return res.status(503).json({ error: "B2 sin configurar en Vercel" });
    if (!(await esAdmin(req))) return res.status(401).json({ error: "Sesión de admin requerida" });

    const a = await b2Auth();
    const accion = req.query.accion || "simple";
    const base = a.downloadUrl + "/file/" + process.env.B2_BUCKET_NAME + "/";

    if (accion === "iniciar") {
      const { fileName, contentType } = req.body || {};
      if (!fileName) return res.status(400).json({ error: "Falta fileName" });
      const j = await b2(a, "b2_start_large_file", {
        bucketId: process.env.B2_BUCKET_ID,
        fileName,
        contentType: contentType || "b2/x-auto"
      });
      return res.status(200).json({
        fileId: j.fileId,
        base,
        tamParte: a.recommendedPartSize,
        tamMinParte: a.absoluteMinimumPartSize
      });
    }

    if (accion === "parte") {
      const fileId = req.query.fileId;
      if (!fileId) return res.status(400).json({ error: "Falta fileId" });
      const j = await b2(a, "b2_get_upload_part_url", { fileId });
      return res.status(200).json({ uploadUrl: j.uploadUrl, token: j.authorizationToken });
    }

    if (accion === "finalizar") {
      const { fileId, sha1s } = req.body || {};
      if (!fileId || !Array.isArray(sha1s)) return res.status(400).json({ error: "Faltan fileId o sha1s" });
      const j = await b2(a, "b2_finish_large_file", { fileId, partSha1Array: sha1s });
      return res.status(200).json({ ok: true, fileName: j.fileName });
    }

    if (accion === "cancelar") {
      const { fileId } = req.body || {};
      if (fileId) { try { await b2(a, "b2_cancel_large_file", { fileId }); } catch (e) {} }
      return res.status(200).json({ ok: true });
    }

    // subida simple
    const j = await b2(a, "b2_get_upload_url", { bucketId: process.env.B2_BUCKET_ID });
    res.status(200).json({
      uploadUrl: j.uploadUrl,
      token: j.authorizationToken,
      base,
      tamParte: a.recommendedPartSize
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
