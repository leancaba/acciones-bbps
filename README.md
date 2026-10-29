# Acciones de Marketing · Bahía Blanca Plaza Shopping

Calendario visual de acciones de marketing (scroll horizontal por días del mes) con panel de carga en `/admin`.

- **`/`** → calendario del mes. Tocá una barra para ver tareas y links. "ELEGIR MES" cambia de mes.
- **`/admin`** → cargar, modificar y eliminar acciones (sin contraseña, uso interno).

## Estructura

```
index.html          calendario
admin/index.html    panel de carga + historial
css/styles.css
js/config.js        ← acá van los datos de Supabase
js/store.js         guardado (Supabase o, si no está configurado, el navegador)
js/app.js           lógica del calendario
js/admin.js         lógica del panel
assets/logo.png
supabase.sql        tabla y permisos
vercel.json
```

## Puesta en marcha

1. **Supabase**: creá un proyecto → *SQL Editor* → pegá el contenido de `supabase.sql` → *Run*.
2. En *Project Settings → API* copiá la **Project URL** y la **anon public key** y pegalas en `js/config.js`.
3. Subí la carpeta a un repo de **GitHub** e importalo en **Vercel** (Framework: *Other*, sin build). Listo.

> Sin configurar Supabase la web funciona igual en "modo prueba": las acciones quedan guardadas solo en el navegador donde se cargaron.

## Notas

- Cuando dos acciones se pisan en fechas, cada una ocupa su propia fila; si no se pisan, comparten fila para que el calendario quede compacto.
- Las acciones que vienen del mes anterior o siguen en el próximo se ven con el borde recto y una flecha (‹ ›).
- El link `/admin` no tiene contraseña: cualquiera que lo conozca puede editar. No lo publiques fuera del equipo.
- Para ver un mes puntual se puede compartir el link con `?mes=2026-11`.
