// GET /api/archivos?carpeta=videos|fotos|fondos — lista pública desde Backblaze B2
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
    const carpeta = String(req.query.carpeta || "videos").replace(/[^a-z]/g, "");
    if (!process.env.B2_KEY_ID) return res.status(200).json({ archivos: [], videos: [], aviso: "B2 sin configurar" });
    const a = await b2Auth();
    const r = await fetch(a.apiUrl + "/b2api/v2/b2_list_file_names", {
      method: "POST",
      headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID, maxFileCount: 1000, prefix: carpeta + "/" })
    });
    const j = await r.json();
    if (!r.ok) throw new Error("B2 list fallo: " + JSON.stringify(j));
    const base = a.downloadUrl + "/file/" + process.env.B2_BUCKET_NAME + "/";
    const archivos = (j.files || [])
      .filter(f => f.action === "upload" && !f.fileName.endsWith("/"))
      .sort((x, y) => y.uploadTimestamp - x.uploadTimestamp)
      .map(f => ({
        nombre: f.fileName.replace(carpeta + "/", "").replace(/^\d+-/, "").replace(/\.[^.]+$/, "").replace(/-/g, " "),
        url: base + f.fileName.split("/").map(encodeURIComponent).join("/"),
        tipo: f.contentType || "",
        tam: f.contentLength || 0,
        subido: f.uploadTimestamp || 0,
        fileName: f.fileName,
        fileId: f.fileId
      }));
    // subidas grandes que quedaron a medias: no son archivos usables, pero ocupan
    // espacio y hay que poder verlas para cancelarlas
    let incompletos = [];
    if (req.query.incompletos === "1") {
      const ru = await fetch(a.apiUrl + "/b2api/v2/b2_list_unfinished_large_files", {
        method: "POST",
        headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" },
        body: JSON.stringify({ bucketId: process.env.B2_BUCKET_ID, maxFileCount: 100 })
      });
      const ju = await ru.json();
      incompletos = (ju.files || [])
        .filter(f => f.fileName.indexOf(carpeta + "/") === 0)
        .map(f => ({
          nombre: f.fileName.replace(carpeta + "/", "").replace(/^\d+-/, "").replace(/\.[^.]+$/, "").replace(/-/g, " "),
          url: "", tipo: f.contentType || "", tam: 0,
          fileName: f.fileName, fileId: f.fileId, incompleto: true
        }));
    }

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    res.status(200).json({ archivos, videos: archivos, incompletos });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
