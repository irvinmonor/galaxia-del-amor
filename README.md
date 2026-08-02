# 💖 Nuestra Galaxia de Amor

Página romántica: galaxia 3D interactiva con **fotos orbitando**, corazones, stickers kawaii, frases de amor, carta con efecto máquina de escribir y música opcional.

**Sitio en vivo:** https://jenifferbragg.com
**Panel admin (oculto):** https://jenifferbragg.com/admin

## 🔐 Panel /admin

Desde el panel puedes, sin tocar código:
- Subir y borrar todas las fotos que quieras (giran alrededor de la galaxia)
- Editar nombre, título, carta, firma y todas las frases
- Activar/desactivar la música y cambiar la canción
- Cambiar tu correo y contraseña de admin

## ⚙️ Configuración inicial (una sola vez)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com)
2. En **SQL Editor**, pega el contenido de `setup-supabase.sql` y dale **Run**
3. En **Project Settings → API**, copia el **Project URL** y la **anon public key**, y pégalos en `config.js`
4. Sube el cambio (`git push`) y entra a `/admin` → "Primera vez: crear cuenta"
5. Después de crear tu cuenta, en Supabase ve a **Authentication → Sign In / Up** y desactiva **"Allow new users to sign up"** para que nadie más pueda registrarse

Si Supabase no está configurado, la página pública sigue funcionando con los textos por defecto (sin fotos).

## 🚀 Deploy

Hosteado en Vercel. Cada push a `main` se publica automáticamente.
