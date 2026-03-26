(function () {
  const { toNumber, formatMoney, parseDate, formatDate, daysBetween, csvToObjects } = window.SJUtils;

  const DATA_URL = "../data/invoices.csv";
  const today = new Date();

  let rows = [];
  let filtered = [];
  let sortBy = "vencimiento";
  let sortDir = "asc";

  let agingChart;
  let topClientsChart;
  let monthChart;

  function pickElement(ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  const elements = {
    kpiGrid: document.getElementById("kpiGrid"),
    alert90: document.getElementById("alert90"),
    alertUpcoming: document.getElementById("alertUpcoming"),
    alertNoPeriod: document.getElementById("alertNoPeriod"),
    filterClient: document.getElementById("filterClient"),
    filterStatus: document.getElementById("filterStatus"),
    filterOverdue: document.getElementById("filterOverdue"),
    filterSearch: document.getElementById("filterSearch"),
    tableBody: document.getElementById("tableBody"),

    // Filtros opcionales de fecha/emisión/vencimiento
    filterEmissionFrom: pickElement(["filterEmissionFrom", "filterFechaEmisionDesde", "fechaEmisionDesde", "emisionDesde"]),
    filterEmissionTo: pickElement(["filterEmissionTo", "filterFechaEmisionHasta", "fechaEmisionHasta", "emisionHasta"]),
    filterDueFrom: pickElement(["filterDueFrom", "filterFechaVencimientoDesde", "fechaVencimientoDesde", "vencimientoDesde"]),
    filterDueTo: pickElement(["filterDueTo", "filterFechaVencimientoHasta", "fechaVencimientoHasta", "vencimientoHasta"]),
  };

  const SORT_KEY_MAP = {
    cliente: "cliente",
    nro_factura: "nro_factura",
    factura: "nro_factura",
    periodo: "periodo",
    emision: "emisionDate",
    fecha_emision: "emisionDate",
    emisionDate: "emisionDate",
    vencimiento: "vencDate",
    fecha_vencimiento: "vencDate",
    vencDate: "vencDate",
    importe: "importe",
    importe_total: "importe",
    pagado: "pagado",
    importe_pagado: "pagado",
    saldo: "saldo",
    estado: "estado",
    dias_vencido: "dias_vencido",
    diasVencido: "dias_vencido",
  };

  async function init() {
    try {
      const csvText = await fetch(DATA_URL).then((res) => {
        if (!res.ok) throw new Error("No se pudo leer invoices.csv");
        return res.text();
      });

      rows = normalizeRows(parseCsv(csvText));
      fillFilters();
      bindEvents();
      applyFiltersAndRender();
    } catch (error) {
      if (elements.tableBody) {
        elements.tableBody.innerHTML = `<tr><td colspan="10">Error cargando datos: ${error.message}</td></tr>`;
      }
    }
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function parseCsv(text) {
    const cleanText = String(text || "")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const lines = cleanText.split("\n").filter((line) => line.trim() !== "");
    if (!lines.length) return [];

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ";" : ",";

    const parseLine = (line) => {
      const out = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        const next = line[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            current += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === separator && !inQuotes) {
          out.push(current);
          current = "";
        } else {
          current += ch;
        }
      }

      out.push(current);
      return out.map((value) => value.trim());
    };

    const headers = parseLine(lines[0]).map((h) => normalizeHeader(h));

    return lines.slice(1).map((line) => {
      const values = parseLine(line);
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] ?? "";
      });
      return row;
    });
  }

  function normalizeHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function parseAmount(value) {
    if (value === null || value === undefined) return 0;

    let str = String(value).trim();
    if (!str || str === "-") return 0;

    str = str.replace(/\s/g, "").replace(/\$/g, "");

    const hasComma = str.includes(",");
    const hasDot = str.includes(".");

    if (hasComma && hasDot) {
      if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
        // Formato AR: 11.990.340,29
        str = str.replace(/\./g, "").replace(",", ".");
      } else {
        // Formato EN: 11,990,340.29
        str = str.replace(/,/g, "");
      }
    } else if (hasComma) {
      // 12345,67
      str = str.replace(/\./g, "").replace(",", ".");
    } else if ((str.match(/\./g) || []).length > 1) {
      // 11.990.340
      const parts = str.split(".");
      str = parts.join("");
    }

    const num = Number(str);
    return Number.isFinite(num) ? num : 0;
  }

  function parseLocalDate(value) {
    if (!value) return null;

    const str = String(value).trim();
    if (!str || str === "-") return null;

    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return startOfDay(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    const localMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (localMatch) {
      const [, d, m, y] = localMatch;
      return startOfDay(new Date(Number(y), Number(m) - 1, Number(d)));
    }

    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
  }

  function normalizeRows(data) {
    return data.map((item) => {
      const importe = parseAmount(item.importe_total || item.importe);
      const pagado = parseAmount(item.importe_pagado || item.pagado);
      const retenido = parseAmount(item.importe_retenido || 0);
      const saldo = Math.max(importe - pagado - retenido, 0);

      const emisionRaw = item.fecha_emision || item.emision || "";
      const vencimientoRaw = item.fecha_vencimiento || item.vencimiento || "";
      const emisionDate = parseLocalDate(emisionRaw);
      const vencDate = parseLocalDate(vencimientoRaw);
      const diasVencido = vencDate && saldo > 0 ? Math.max(daysBetween(vencDate, today), 0) : 0;

      let estado = String(item.estado || "").toUpperCase().trim();
      if (estado === "PAGADA" || estado === "PAGADO") estado = "COBRADO";

      if (!estado) {
        if (saldo <= 0) estado = "COBRADO";
        else if (pagado > 0 || retenido > 0) estado = "PARCIAL";
        else estado = "PENDIENTE";
      }

      const periodoRaw = String(item.periodo || "").trim();
      const periodo = /^\d{5}$/.test(periodoRaw) ? `0${periodoRaw}` : periodoRaw;

      return {
        cliente: item.cliente || "(Sin cliente)",
        nro_factura: item.nro_factura || "-",
        periodo,
        emision: emisionRaw,
        emisionDate,
        vencimiento: vencimientoRaw,
        vencDate,
        importe,
        pagado,
        retenido,
        saldo,
        estado,
        dias_vencido: diasVencido,
      };
    });
  }

  function fillFilters() {
    if (!elements.filterClient) return;

    // Evita duplicar opciones si el script se reinicializa
    const firstOption = elements.filterClient.querySelector('option[value=""]');
    elements.filterClient.innerHTML = "";
    if (firstOption) elements.filterClient.appendChild(firstOption.cloneNode(true));
    else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Todos";
      elements.filterClient.appendChild(option);
    }

    const clients = [...new Set(rows.map((r) => r.cliente).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );

    clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client;
      option.textContent = client;
      elements.filterClient.appendChild(option);
    });
  }

  function bindEvents() {
    [
      elements.filterClient,
      elements.filterStatus,
      elements.filterOverdue,
      elements.filterEmissionFrom,
      elements.filterEmissionTo,
      elements.filterDueFrom,
      elements.filterDueTo,
    ]
      .filter(Boolean)
      .forEach((el) => {
        el.addEventListener("change", applyFiltersAndRender);
        el.addEventListener("input", applyFiltersAndRender);
      });

    if (elements.filterSearch) {
      elements.filterSearch.addEventListener("input", applyFiltersAndRender);
    }

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const rawKey = th.dataset.sort;
        const key = resolveSortKey(rawKey);

        if (sortBy === key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortBy = key;
          sortDir = "asc";
        }
        renderTable();
      });
    });
  }

  function resolveSortKey(key) {
    return SORT_KEY_MAP[key] || key;
  }

  function getValue(el) {
    return el ? String(el.value || "").trim() : "";
  }

  function applyFiltersAndRender() {
    const client = getValue(elements.filterClient);
    const status = getValue(elements.filterStatus).toUpperCase();
    const overdue = getValue(elements.filterOverdue).toUpperCase();
    const search = getValue(elements.filterSearch).toLowerCase();

    const emissionFrom = parseLocalDate(getValue(elements.filterEmissionFrom));
    const emissionTo = parseLocalDate(getValue(elements.filterEmissionTo));
    const dueFrom = parseLocalDate(getValue(elements.filterDueFrom));
    const dueTo = parseLocalDate(getValue(elements.filterDueTo));

    filtered = rows.filter((r) => {
      if (client && r.cliente !== client) return false;
      if (status && r.estado !== status) return false;

      if (overdue === "SI" && r.dias_vencido <= 0) return false;
      if (overdue === "NO" && r.dias_vencido > 0) return false;

      if (emissionFrom && (!r.emisionDate || r.emisionDate < emissionFrom)) return false;
      if (emissionTo && (!r.emisionDate || r.emisionDate > emissionTo)) return false;
      if (dueFrom && (!r.vencDate || r.vencDate < dueFrom)) return false;
      if (dueTo && (!r.vencDate || r.vencDate > dueTo)) return false;

      if (search) {
        const blob = [
          r.cliente,
          r.nro_factura,
          r.periodo,
          r.estado,
          formatDate(r.emisionDate),
          formatDate(r.vencDate),
        ]
          .join(" ")
          .toLowerCase();

        if (!blob.includes(search)) return false;
      }

      return true;
    });

    renderKPIs(filtered);
    renderCharts(filtered);
    renderAlerts(filtered);
    renderTable();
  }

  function renderKPIs(data) {
    const pendienteTotal = sum(data, (r) => r.saldo);
    const vencidoTotal = sum(data, (r) => (r.dias_vencido > 0 ? r.saldo : 0));
    const porcentajeVencido = pendienteTotal ? (vencidoTotal / pendienteTotal) * 100 : 0;

    const sameMonth = (date) =>
      date && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const cobradoMes = sum(data, (r) => (sameMonth(r.emisionDate) ? r.pagado : 0));

    const facturas90 = data.filter((r) => r.dias_vencido > 90 && r.saldo > 0).length;

    const kpis = [
      ["Pendiente total", formatMoney(pendienteTotal), "Saldo abierto de facturas"],
      ["Vencido total", formatMoney(vencidoTotal), "Facturas con vencimiento superado"],
      ["% vencido", `${porcentajeVencido.toFixed(1)}%`, "Sobre total pendiente"],
      ["Cobrado mes actual", formatMoney(cobradoMes), "Pagos registrados en mes actual"],
      ["Cantidad facturas +90", String(facturas90), "Con más de 90 días vencidas"],
    ];

    if (elements.kpiGrid) {
      elements.kpiGrid.innerHTML = kpis
        .map(
          ([title, value, caption]) =>
            `<article class="card"><strong>${title}</strong><p class="kpi-value">${value}</p><p class="kpi-caption">${caption}</p></article>`,
        )
        .join("");
    }
  }

  function renderCharts(data) {
    const buckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "+90": 0,
    };

    const vencidaPorCliente = {};
    let pendienteMes = 0;
    let cobradoMes = 0;

    data.forEach((r) => {
      if (r.saldo > 0) {
        if (r.dias_vencido <= 30) buckets["0-30"] += r.saldo;
        else if (r.dias_vencido <= 60) buckets["31-60"] += r.saldo;
        else if (r.dias_vencido <= 90) buckets["61-90"] += r.saldo;
        else buckets["+90"] += r.saldo;
      }

      if (r.dias_vencido > 0 && r.saldo > 0) {
        vencidaPorCliente[r.cliente] = (vencidaPorCliente[r.cliente] || 0) + r.saldo;
      }

      if (
        r.emisionDate &&
        r.emisionDate.getMonth() === today.getMonth() &&
        r.emisionDate.getFullYear() === today.getFullYear()
      ) {
        pendienteMes += r.saldo;
        cobradoMes += r.pagado;
      }
    });

    const topClientes = Object.entries(vencidaPorCliente)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    agingChart = recreateChart(agingChart, "agingChart", {
      type: "bar",
      data: {
        labels: Object.keys(buckets),
        datasets: [
          {
            label: "Aging (ARS)",
            data: Object.values(buckets),
            backgroundColor: ["#a1324f", "#b45309", "#0f766e", "#7f1d1d"],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    topClientsChart = recreateChart(topClientsChart, "topClientsChart", {
      type: "bar",
      data: {
        labels: topClientes.map(([name]) => name),
        datasets: [
          {
            label: "Deuda vencida",
            data: topClientes.map(([, amount]) => amount),
            backgroundColor: "#7a213a",
          },
        ],
      },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false },
    });

    monthChart = recreateChart(monthChart, "monthChart", {
      type: "doughnut",
      data: {
        labels: ["Cobrado", "Pendiente"],
        datasets: [{ data: [cobradoMes, pendienteMes], backgroundColor: ["#0f766e", "#a1324f"] }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  function renderAlerts(data) {
    if (!elements.alert90 || !elements.alertUpcoming || !elements.alertNoPeriod) return;

    const clients90 = aggregateByClient(data.filter((r) => r.dias_vencido > 90 && r.saldo > 0));
    const upcoming = data.filter((r) => {
      if (!r.vencDate || r.saldo <= 0) return false;
      const daysToDue = daysBetween(today, r.vencDate);
      return daysToDue >= 0 && daysToDue <= 7;
    });
    const withoutPeriod = data.filter((r) => !r.periodo);

    writeList(
      elements.alert90,
      Object.entries(clients90).map(([name, amount]) => `${name}: ${formatMoney(amount)}`),
      "Sin alertas +90.",
    );

    writeList(
      elements.alertUpcoming,
      upcoming.map((r) => `${r.cliente} · ${r.nro_factura} · vence ${formatDate(r.vencDate)}`),
      "No hay vencimientos próximos.",
    );

    writeList(
      elements.alertNoPeriod,
      withoutPeriod.map((r) => `${r.cliente} · ${r.nro_factura}`),
      "No hay facturas sin período.",
    );
  }

  function renderTable() {
    if (!elements.tableBody) return;

    const sortKey = resolveSortKey(sortBy);
    const sorted = [...filtered].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));

    if (!sorted.length) {
      elements.tableBody.innerHTML =
        '<tr><td colspan="10" style="color:#6b7280">No hay resultados para los filtros aplicados.</td></tr>';
      return;
    }

    elements.tableBody.innerHTML = sorted
      .map(
        (r) => `<tr>
      <td>${escapeHtml(r.cliente)}</td>
      <td>${escapeHtml(r.nro_factura)}</td>
      <td>${escapeHtml(r.periodo || "-")}</td>
      <td>${formatDate(r.emisionDate)}</td>
      <td>${formatDate(r.vencDate)}</td>
      <td>${formatMoney(r.importe)}</td>
      <td>${formatMoney(r.pagado)}</td>
      <td>${formatMoney(r.saldo)}</td>
      <td>${statePill(r.estado)}</td>
      <td>${r.dias_vencido}</td>
    </tr>`,
      )
      .join("");
  }

  function aggregateByClient(data) {
    return data.reduce((acc, row) => {
      acc[row.cliente] = (acc[row.cliente] || 0) + row.saldo;
      return acc;
    }, {});
  }

  function writeList(el, items, emptyText) {
    el.innerHTML = items.length
      ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : `<li style="color:#6b7280">${escapeHtml(emptyText)}</li>`;
  }

  function recreateChart(instance, id, config) {
    const ctx = document.getElementById(id);
    if (!ctx || typeof Chart === "undefined") return instance || null;
    if (instance) instance.destroy();
    return new Chart(ctx, config);
  }

  function compareValues(a, b, dir) {
    const factor = dir === "asc" ? 1 : -1;

    const aIsDate = a instanceof Date && !Number.isNaN(a.getTime());
    const bIsDate = b instanceof Date && !Number.isNaN(b.getTime());

    if (aIsDate || bIsDate) {
      const va = aIsDate ? a.getTime() : -Infinity;
      const vb = bIsDate ? b.getTime() : -Infinity;
      return (va - vb) * factor;
    }

    if (typeof a === "number" || typeof b === "number") {
      return (Number(a || 0) - Number(b || 0)) * factor;
    }

    return String(a || "").localeCompare(String(b || ""), "es", { numeric: true }) * factor;
  }

  function sum(data, selector) {
    return data.reduce((acc, row) => acc + selector(row), 0);
  }

  function statePill(status) {
    const map = {
      COBRADO: "status-paid",
      PARCIAL: "status-partial",
      PENDIENTE: "status-pending",
    };
    return `<span class="status-pill ${map[status] || "status-pending"}">${escapeHtml(status)}</span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  init();
})();
