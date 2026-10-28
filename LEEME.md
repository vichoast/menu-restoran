# Restaurant San José · sitio web

Sitio estático para GitHub Pages con Firebase (la misma base de datos y el mismo login que ya usa el menú).

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: portada roja, quiénes somos, galería, eventos, horario, ubicación y contacto. Los links viejos de convenio (`?empresa=foodpro`) redirigen solos a `pedido.html`. |
| `carta.html` | La carta: el menú del día publicado desde el panel (solo lectura). |
| `eventos.html` | Calendario de disponibilidad y formulario de consulta. |
| `pedido.html` | Pedido: la misma lógica del `index.html` anterior, con el estilo nuevo. El único cambio en el código es el texto del botón ("Enviar pedido"). |
| `admin.html` | El panel de siempre más 4 pestañas nuevas: Textos, Fotos, Calendario de eventos y Solicitudes. Lo anterior no se tocó (solo se agregaron líneas). |
| `reporte.html` | Sin cambios. |

El código nuevo del panel está en `assets/js/admin-sitio.js`, y los estilos en `assets/css/`. Los colores y tipografías están copiados del design system en `assets/css/tokens.css`.

## Datos nuevos en Firebase (Realtime Database)

```
sitio/textos                     textos editables de la página
sitio/fotos/{id}                 { url, ruta, alt, seccion: hero|galeria|eventos, orden, creado }
eventos/franjas/{id}             { nombre, detalle, orden }   (si está vacío se usan Día y Noche)
eventos/disponibilidad/{fecha}/{franja}   'bloqueado' | 'reservado'   (si no hay dato = libre)
eventos/notas/{fecha}            { texto }   solo el panel
eventos/solicitudes/{id}         { tipo, nombre, telefono, correo, fecha, franja, franjaNombre,
                                   invitados, mensaje, estado, creado }
```

`menu`, `menu/info` y `pedidos` siguen exactamente igual.

## Antes de publicar (una sola vez)

1. **Reglas de la base de datos.** Ya están publicadas (28-oct-2026). Se mantuvieron tal cual las de `admins`, `rrhh`, `menu` y `pedidos`, y solo se agregaron `sitio` y `eventos`. Solo los usuarios que están en `admins` pueden editar la página. `database.rules.json` es la copia de lo publicado.
2. **Fotos (Storage).** En la consola de Firebase, ve a Storage y luego a Comenzar. Firebase pide pasar al plan **Blaze** (hay que registrar una tarjeta). Lo que usa un restaurante cabe en la cuota gratis. Crea una alerta de presupuesto de US$1 en Google Cloud, en Facturación y luego Presupuestos y alertas. Después pega `storage.rules` en Storage, en la pestaña Reglas.
3. **Datos del local.** En el panel, abre "Datos del local" y revisa que el horario diga **14:30 a 16:30**; es el mismo que se muestra en Inicio. En "Textos de la página", completa la dirección, el teléfono, el correo y las redes.

## Dominio restaurantsanjose.cl (cuando esté comprado)

1. Cómpralo en NIC Chile.
2. En NIC Chile, en DNS, crea 4 registros **A** para `@` que apunten a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`. Crea también un **CNAME** para `www` que apunte a `vichoast.github.io`.
3. En GitHub, ve a la configuración del repo, luego a Pages y luego a Custom domain. Escribe `restaurantsanjose.cl` y activa "Enforce HTTPS".
4. Al hacerlo, GitHub redirige solo los links viejos (`vichoast.github.io/menu-restoran/...`), así que los links de convenio de FoodPro y Europer siguen funcionando.
5. En Firebase, ve a Authentication, luego a Configuración y luego a Dominios autorizados, y agrega `restaurantsanjose.cl`.

## Apps en el celular (PWA)

- **San José** (clientes): se instala desde cualquier página con el botón "Instalar la app" del pie (Android) o con Compartir → "Agregar a pantalla de inicio" (iPhone). Usa `manifest.webmanifest`.
- **SJ Panel** (familia): es una app aparte en https://vichoast.github.io/sj-panel/ (botón "Instalar el panel"). **Se edita aquí mismo**: `admin.html`, `assets/` y `panel/` (manifest y service worker de la app). El repo `vichoast/sj-panel` la arma con `herramientas/armar-panel.sh` y la publica sola en unos minutos. El `admin.html` de este sitio sigue funcionando y muestra un enlace a la app.
- `sw.js` hace que se abran sin internet (con la última versión guardada) y muestra los avisos.

## Avisos de pedidos y eventos

1. En el panel, en el recuadro "Este celular", toca **Activar avisos**. En iPhone, primero instala el panel en la pantalla de inicio y ábrelo desde ese ícono (iOS 16.4 o más nuevo).
2. Los celulares quedan guardados en `avisos/{uid}`. La caja (`admins`) recibe pedidos y consultas de eventos; RRHH (`rrhh`) recibe solo pedidos.
3. El envío lo hace `functions/index.js` (Cloud Functions). **Necesita el plan Blaze.** Para publicarlo, con Node instalado:
   ```
   npm install -g firebase-tools
   firebase login
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
   No cambia nada de los pedidos: solo lee el pedido nuevo y manda el aviso.
