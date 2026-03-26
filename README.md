# Tablero General — San Jorge

Sitio estático (HTML/CSS/JS vanilla) para correr en una PC de oficina y publicar por Cloudflare Tunnel.

- URL objetivo: https://tablero.sanjorgelimpieza.com.ar/

## Módulos

- `/index.html`: portada.
- `/cobranzas/`: dashboard de cobranzas (CSV).
- `/proveedores/`: dashboard de proveedores con **carga manual en pantalla** (sin Excel/CSV).

## Cobranzas (CSV + carga manual)

Fuente base:
- `/data/invoices.csv`
- `/data/invoices.sample.csv`

Flujo recomendado:
1. Preparar Excel con pestaña `DATA_COBRANZAS`.
2. Exportar CSV con headers:
   - `cliente,nro_factura,periodo,emision,vencimiento,importe,pagado`
3. Reemplazar `/data/invoices.csv`.

Además, en `/cobranzas/` podés:
- Agregar facturas manualmente con botón **Agregar factura** (sin perder la base del CSV).
- Usar **Vencimiento automático** de 15 / 30 / 60 días desde la fecha de emisión.
- Exportar un archivo **Excel** con todas las facturas cargadas (CSV + manuales) desde el botón **Exportar Excel**.
- Modificar manualmente el **Estado** en la tabla con desplegable: `Pendiente`, `Cobrado`, `Parcial`, `Anulada` (con color visual por estado).

## Proveedores (carga manual)

En `/proveedores/` podés:
- Cargar facturas manualmente desde el botón **Cargar Factura**.
- Seleccionar **solo proveedores existentes** al cargar una factura (evita errores de tipeo).
- Completar automáticamente **CUIT, CBU y Centro de Costos** según el proveedor elegido.
- Filtrar por proveedor, estado, vencidas y **Centro de Costos** (Alquileres, Proveedores fijos, Variables, Servicios, Otros).
- Marcar facturas como pagadas, volver a **Pendiente** y eliminar.
- Ver KPIs y gráficos automáticamente.
- Gestionar **Datos de proveedores** (CUIT, CBU, Centro de Costos, responsable y contacto) con botón **Agregar proveedor**.
- Usar **Cargar ejemplos** para sumar proveedores/facturas de distintos rubros (alquileres, servicios, variables y fijos) sin pisar tus datos existentes.

> Los datos se guardan en `localStorage` del navegador de esa PC.
> Si se borra caché/datos del navegador, se pierden los registros.

## Ejecutar local

```bash
python -m http.server 8000
```

Abrir:
- `http://localhost:8000/`
- `http://localhost:8000/cobranzas/`
- `http://localhost:8000/proveedores/`

## Publicación (PC + Cloudflare Tunnel)

- Mantener la PC encendida y con internet.
- Exponer el puerto local (ej: 8000) por Tunnel.
- Configurar DNS para apuntar `tablero.sanjorgelimpieza.com.ar` al tunnel.
