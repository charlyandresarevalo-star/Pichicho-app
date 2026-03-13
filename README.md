# Tablero General — San Jorge

Sitio estático (HTML/CSS/JS vanilla) pensado para correr en una PC de oficina y publicarse por Cloudflare Tunnel en:

- https://tablero.sanjorgelimpieza.com.ar/

## Estructura

- `/index.html`: portada con módulos.
- `/cobranzas/index.html`: tablero de cobranzas.
- `/css/styles.css`: estilos globales (bordó/blanco/grises).
- `/js/app.js`: utilidades globales (CSV, fechas, moneda).
- `/cobranzas/cobranzas.js`: lógica de KPIs, gráficos, filtros y alertas.
- `/data/invoices.csv`: archivo de datos activo que consume el módulo.
- `/data/invoices.sample.csv`: ejemplo de plantilla con datos de muestra.

## Flujo de datos desde Excel

1. Preparar un archivo de Excel con una pestaña llamada **`DATA_COBRANZAS`**.
2. La fila 1 debe contener los headers exactos:
   - `cliente,nro_factura,periodo,emision,vencimiento,importe,pagado`
3. Verificar formato sugerido:
   - Fechas: `YYYY-MM-DD` (recomendado)
   - Montos: numéricos, sin símbolo `$`
4. Exportar la pestaña **DATA_COBRANZAS** como CSV (delimitado por coma).
5. Reemplazar el archivo:
   - `/data/invoices.csv`

> El tablero se actualiza leyendo ese CSV. No requiere backend ni base de datos.

## Ejecutar localmente

Desde la raíz del proyecto:

```bash
python -m http.server 8000
```

Luego abrir:

- `http://localhost:8000/`
- `http://localhost:8000/cobranzas/`

## Publicación recomendada (PC oficina + Cloudflare Tunnel)

- Mantener la PC encendida y conectada a internet.
- Servir esta carpeta por HTTP local (por ejemplo puerto 8000).
- Apuntar Cloudflare Tunnel al servicio local.
- Configurar DNS para que `tablero.sanjorgelimpieza.com.ar` resuelva al tunnel.

## Notas

- Todo funciona con rutas relativas para navegación entre portada y módulo.
- No se usan imágenes binarias ni frameworks.
- Los gráficos se renderizan con Chart.js desde CDN.
