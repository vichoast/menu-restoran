#!/usr/bin/env bash
# Arma la app "SJ Panel" a partir de este repo (menu-restoran).
# El panel se edita SOLO aquí (admin.html y assets/). El repo vichoast/sj-panel
# ejecuta este script automáticamente y publica el resultado en vichoast.github.io/sj-panel/.
#
# Uso: bash herramientas/armar-panel.sh <carpeta-de-menu-restoran> <carpeta-de-salida>
set -euo pipefail
O="${1:-.}"
D="${2:-_site}"
SITIO="https://vichoast.github.io/menu-restoran/"

rm -rf "$D"
mkdir -p "$D/assets/css" "$D/assets/js" "$D/assets/img"

cp "$O"/assets/css/{tokens,calendario,admin-sitio}.css "$D/assets/css/"
cp "$O"/assets/js/{firebase,contenido,calendario,admin-sitio,avisos}.js "$D/assets/js/"
cp "$O"/assets/img/panel-*.png "$O/assets/img/insignia-96.png" "$D/assets/img/"
cp "$O/panel/manifest.webmanifest" "$D/manifest.webmanifest"
cp "$O/panel/sw.js" "$D/sw.js"
cp "$O/assets/img/panel-192.png" "$D/favicon.png"

CABECERA='<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" type="image/png" href="favicon.png">\n<link rel="apple-touch-icon" href="assets/img/panel-apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="SJ Panel">'

# admin.html → index.html de la app:
#  - agrega el manifest e íconos de la app
#  - quita el aviso "Ahora el panel es una app" (solo tiene sentido en el sitio)
#  - el enlace "Ver la página" apunta al sitio público
sed -e "s#<!--PANEL-APP-HEAD-->#${CABECERA}#" \
    -e 's#<!--SOLO-SITIO-->.*<!--/SOLO-SITIO-->##' \
    -e "s#class=\"ver-pagina\" href=\"./\"#class=\"ver-pagina\" href=\"${SITIO}\"#" \
    -e 's#<title>Panel de Administración · Menú del Día</title>#<title>SJ Panel · Restaurant San José</title>#' \
    "$O/admin.html" > "$D/index.html"

# Comprobaciones: si algo no calza, el armado falla y no se publica nada roto
grep -q 'href="manifest.webmanifest"' "$D/index.html"
! grep -q 'SOLO-SITIO' "$D/index.html"
grep -q 'assets/js/avisos.js' "$D/index.html"

# admin.html también, por si algún enlace antiguo apunta ahí
cp "$D/index.html" "$D/admin.html"

cat > "$D/404.html" <<'HTML'
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SJ Panel</title><meta http-equiv="refresh" content="0; url=./"></head><body><a href="./">Abrir SJ Panel</a></body></html>
HTML

touch "$D/.nojekyll"
echo "SJ Panel armado en $D desde $(git -C "$O" rev-parse --short HEAD 2>/dev/null || echo 'copia local')"
