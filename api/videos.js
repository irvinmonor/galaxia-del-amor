// GET /api/videos — lista pública de videos guardados en Backblaze B2
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

export default async function handler(req, res) {
  try {
    if (!process.env.B2_KEY_ID) return res.status(200).json({ videos: [], aviso: "B2 sin configurar" });
    const a = await b2Auth();
    const r = await fetch(a.apiUrl + "/b2api/v2/b2_list_file_names", {
      method: "POST",
      headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID, maxFileCount: 1000, prefix: "videos/" })
    });
    const j = await r.json();
    if (!r.ok) throw new Error("B2 list fallo: " + JSON.stringify(j));
    const base = a.downloadUrl + "/file/" + process.env.B2_BUCKET_NAME + "/";
    const videos = (j.files || [])
      .filter(f => f.action === "upload")
      .sort((x, y) => y.uploadTimestamp - x.uploadTimestamp)
      .map(f => ({
        nombre: f.fileName.replace(/^videos\//, "").replace(/^\d+-/, "").replace(/\.[^.]+$/, "").replace(/-/g, " "),
        url: base + f.fileName.split("/").map(encodeURIComponent).join("/"),
        tipo: f.contentType || "",
        fileName: f.fileName,
        fileId: f.fileId
      }));
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    res.status(200).json({ videos });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
