// GET /api/subir — entrega una URL de subida directa a Backblaze B2.
// Solo funciona con sesión de admin (token de Supabase en Authorization).
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

export default async function handler(req, res) {
  try {
    if (!process.env.B2_KEY_ID) return res.status(503).json({ error: "B2 sin configurar en Vercel" });
    if (!(await esAdmin(req))) return res.status(401).json({ error: "Sesión de admin requerida" });
    const a = await b2Auth();
    const r = await fetch(a.apiUrl + "/b2api/v2/b2_get_upload_url", {
      method: "POST",
      headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID })
    });
    const j = await r.json();
    if (!r.ok) throw new Error("B2 upload_url fallo: " + JSON.stringify(j));
    res.status(200).json({
      uploadUrl: j.uploadUrl,
      token: j.authorizationToken,
      base: a.downloadUrl + "/file/" + process.env.B2_BUCKET_NAME + "/"
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
