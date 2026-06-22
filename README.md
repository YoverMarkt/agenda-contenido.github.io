# Agenda de Contenido — Guía de configuración

App de planificación de contenido multi-marca con datos compartidos en la nube
(Supabase). Dos personas ven y editan lo mismo en tiempo real.

## Archivos

| Archivo               | Qué es                                                        |
|-----------------------|--------------------------------------------------------------|
| `index.html`          | Estructura de la app (HTML). Es el archivo que abre el navegador. |
| `styles.css`          | Todos los estilos (CSS).                                      |
| `app.js`              | Toda la lógica de la app (JavaScript).                        |
| `config.js`           | Las 3 credenciales/clave que debes completar.                |
| `supabase-setup.sql`  | Script para crear la tabla en Supabase.                      |

> El antiguo `agenda-cloud.html` (todo en un solo archivo) ya no se usa: quedó
> separado en `index.html` + `styles.css` + `app.js`. Puedes borrarlo.

### Orden de carga (no lo cambies)

`index.html` carga, al final del `<body>`:

```html
<script src="config.js"></script>  <!-- primero: define las credenciales -->
<script src="app.js"></script>     <!-- después: usa esas credenciales -->
```

---

## Paso 1 — Crear el proyecto en Supabase

1. Entra a https://supabase.com y crea un proyecto (plan gratis sirve).
2. Cuando esté listo, ve a **SQL Editor → New query**.
3. Pega todo el contenido de `supabase-setup.sql` y pulsa **Run**.
   Esto crea la tabla `agenda` con la fila compartida y las políticas RLS.

## Paso 2 — Obtener las credenciales

En Supabase ve a **Project Settings → API** y copia:

- **Project URL** (algo como `https://abcdxyz.supabase.co`)
- **anon / publishable key** (la llave pública, NO la `service_role`)

## Paso 3 — Configurar la app

Abre **`config.js`** con un editor de texto y completa estos 3 valores:

```js
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";  // tu Project URL
const SUPABASE_KEY = "TU_ANON_O_PUBLISHABLE_KEY";        // tu anon/publishable key
const CLAVE_ACCESO = "cambia-esta-clave";                // la clave que ambos escriben para entrar
```

- `CLAVE_ACCESO` es la contraseña simple que tú y tu colaborador escriben
  al abrir la app. Elijan una entre ustedes.

## Paso 4 — Subir a GitHub Pages

1. Crea un repositorio y sube **todos** los archivos:
   `index.html`, `styles.css`, `app.js`, `config.js` y `supabase-setup.sql`.
   (Como el archivo principal ya se llama `index.html`, GitHub Pages lo carga directo.)
2. En el repo: **Settings → Pages → Source: Deploy from branch → main → / (root)**.
3. En unos minutos tendrás una URL pública. Compártela con tu colaborador.
4. Ambos abren la URL, escriben la clave de acceso y listo: ven lo mismo.

### Subir con Git (rápido)

```bash
git init
git add .
git commit -m "Agenda de contenido"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

---

## Cómo funciona el guardado

- Cualquier cambio (agregar pieza, cambiar estado, nueva marca, etc.) se guarda
  solo en Supabase a los pocos segundos.
- Si la otra persona hace un cambio, a ti se te actualiza automáticamente
  (tiempo real). El indicador arriba muestra el estado: 🟢 Conectado /
  ⏳ Guardando / 🔄 Actualizado por tu equipo.
- Al recargar la página nada se pierde: todo vive en la nube.

## Notas de seguridad (importante)

- La `anon key` es pública por diseño; está bien que vaya en `config.js` y en GitHub.
- NUNCA pongas la `service_role` key en `config.js` ni en GitHub.
- La protección real entre ustedes es la `CLAVE_ACCESO`. Como son 2 personas
  de confianza, es suficiente. Si en el futuro entra más gente o manejas datos
  sensibles, conviene migrar a Supabase Auth (login con correo).

## Respaldo

El botón **💾 Respaldo (JSON)** descarga una copia de todo por si quieres
guardar una versión de seguridad localmente.
