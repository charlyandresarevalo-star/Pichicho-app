(function () {
  const { formatMoney, formatDate, daysBetween } = window.SJUtils;

  const DATA_URL = "../data/invoices.csv";
  const STORAGE_MANUAL_INVOICES = "sj_cobranzas_manual_v1";

  let clients = [];
  let invoices = [];
  let rows = [];
  let sortBy = "facturacion";
  let sortDir = "desc";
  let selectedClient = null;

  let evolutionChart;
  let topBillingChart;
  let topDebtChart;
  let activeInactiveChart;
  let shareChart;
  let growthChart;

  const el = {
    kpiGrid: document.getElementById("kpiGrid"),
    filterCliente: document.getElementById("filterCliente"),
    filterEstadoCliente: document.getElementById("filterEstadoCliente"),
    filterDesde: document.getElementById("filterDesde"),
    filterHasta: document.getElementById("filterHasta"),
    filterAnio: document.getElementById("filterAnio"),
    filterMes: document.getElementById("filterMes"),
    filterEstadoFactura: document.getElementById("filterEstadoFactura"),
    filterSearch: document.getElementById("filterSearch"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    tableBody: document.getElementById("tableBody"),
    clientDetailBody: document.getElementById("clientDetailBody"),
    toggleClientForm: document.getElementById("toggleClientForm"),
    clientFormSection: document.getElementById("clientFormSection"),
    clientForm: document.getElementById("clientForm"),
    exportClientsBtn: document.getElementById("exportClientsBtn"),

    cNombre: document.getElementById("cNombre"),
    cRazonSocial: document.getElementById("cRazonSocial"),
    cCuit: document.getElementById("cCuit"),
    cEstado: document.getElementById("cEstado"),
    cFechaAlta: document.getElementById("cFechaAlta"),
    cAlias: document.getElementById("cAlias"),
    cRubro: document.getElementById("cRubro"),
    cZona: document.getElementById("cZona"),
    cObservaciones: document.getElementById("cObservaciones"),
  };

  init();

  async function init() {
    clients = await window.SJClientsStore.loadMasterClients();
    invoices = await loadInvoices();
    bindEvents();
    fillMonthFilter();
    refresh();
  }

  function bindEvents() {
    [
      el.filterCliente,
      el.filterEstadoCliente,
      el.filterDesde,
      el.filterHasta,
      el.filterAnio,
      el.filterMes,
      el.filterEstadoFactura,
    ].forEach((n) => n.addEventListener("change", refresh));

    el.filterSearch.addEventListener("input", refresh);
    el.clearFiltersBtn.addEventListener("click", () => {
      [el.filterCliente, el.filterEstadoCliente, el.filterDesde, el.filterHasta, el.filterAnio, el.filterMes, el.filterEstadoFactura, el.filterSearch].forEach((n) => (n.value = ""));
      refresh();
    });

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (sortBy === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
          sortBy = key;
          sortDir = "desc";
        }
        renderTable();
      });
    });

    el.tableBody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr[data-client]");
      if (!tr) return;
      selectedClient = tr.dataset.client;
      renderDetail();
    });

    el.toggleClientForm.addEventListener("click", () => el.clientFormSection.classList.toggle("hidden"));
    el.clientForm.addEventListener("submit", handleNewClient);
    el.exportClientsBtn.addEventListener("click", exportClients);
  }

  async function loadInvoices() {
    const csvText = await fetch(DATA_URL).then((res) => res.text());
    const csvRows = parseCsv(csvText).map(normalizeInvoice);
    const manualRaw = localStorage.getItem(STORAGE_MANUAL_INVOICES);
    let manualRows = [];
    if (manualRaw) {
      try {
        manualRows = JSON.parse(manualRaw).map(normalizeInvoice);
      } catch (_error) {
        manualRows = [];
      }
    }
    return [...manualRows, ...csvRows];
  }

  function parseCsv(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const parseLine = (line) => {
      const out = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === '"') {
          if (q && next === '"') {
            cur += '"';
            i += 1;
          } else q = !q;
        } else if (ch === sep && !q) {
          out.push(cur);
          cur = "";
        } else cur += ch;
      }
      out.push(cur);
      return out.map((v) => v.trim());
    };

    const headers = parseLine(lines[0]).map((h) => String(h).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    return lines.slice(1).map((line) => {
      const vals = parseLine(line);
      const row = {};
      headers.forEach((h, i) => (row[h] = vals[i] || ""));
      return row;
    });
  }

  function normalizeInvoice(row) {
    const clienteRaw = row.cliente || "(Sin cliente)";
    const clienteNorm = window.SJClientsStore.normalizeClientName(clienteRaw);
    const master = clients.find((c) => window.SJClientsStore.normalizeClientName(c.cliente) === clienteNorm);
    const cliente = master ? master.cliente : clienteRaw;

    const emisionDate = parseDate(row.emision || row.fecha_emision);
    const vencDate = parseDate(row.vencimiento || row.fecha_vencimiento);
    const fechaPago = parseDate(row.fecha_pago);
    const importe = toNumber(row.importe_total || row.importe);
    const pagado = toNumber(row.importe_pagado || row.pagado);
    const saldo = Math.max(importe - pagado, 0);
    const estado = String(row.estado || "").toUpperCase() || (saldo <= 0 ? "COBRADO" : pagado > 0 ? "PARCIAL" : "PENDIENTE");

    return { cliente, emisionDate, vencDate, fechaPago, importe, pagado, saldo, estado, nro: row.nro_factura || "-" };
  }

  function parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function toNumber(value) {
    return Number(String(value || "0").replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
  }

  function fillMonthFilter() {
    el.filterMes.innerHTML = '<option value="">Todos</option>';
    for (let i = 1; i <= 12; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i).padStart(2, "0");
      el.filterMes.appendChild(opt);
    }
  }

  function refresh() {
    const filteredInvoices = filterInvoices();
    const filteredClients = filterClients(filteredInvoices);
    rows = buildAnalyticsRows(filteredClients, filteredInvoices);
    fillClientFilter(filteredClients);
    renderKPIs(filteredClients, filteredInvoices, rows);
    renderCharts(filteredInvoices, rows, filteredClients);
    renderTable();
    renderDetail();
  }

  function filterInvoices() {
    const selectedClient = el.filterCliente.value;
    const from = parseDate(el.filterDesde.value);
    const to = parseDate(el.filterHasta.value);
    const year = Number(el.filterAnio.value || 0);
    const month = Number(el.filterMes.value || 0);
    const invoiceStatus = el.filterEstadoFactura.value;

    return invoices.filter((inv) => {
      if (selectedClient && inv.cliente !== selectedClient) return false;
      if (from && (!inv.emisionDate || inv.emisionDate < from)) return false;
      if (to && (!inv.emisionDate || inv.emisionDate > to)) return false;
      if (year && (!inv.emisionDate || inv.emisionDate.getFullYear() !== year)) return false;
      if (month && (!inv.emisionDate || inv.emisionDate.getMonth() + 1 !== month)) return false;

      if (invoiceStatus === "VENCIDO") {
        if (!(inv.saldo > 0 && inv.vencDate && daysBetween(inv.vencDate, new Date()) > 0)) return false;
      } else if (invoiceStatus && inv.estado !== invoiceStatus) return false;

      return true;
    });
  }

  function filterClients(filteredInvoices) {
    const status = el.filterEstadoCliente.value;
    const search = String(el.filterSearch.value || "").toLowerCase();

    const allClients = clients.map((client) => ({ ...client, hasInvoices: filteredInvoices.some((i) => i.cliente === client.cliente) }));
    return allClients.filter((client) => {
      if (status && client.estado !== status) return false;
      if (search && !client.cliente.toLowerCase().includes(search)) return false;
      return true;
    });
  }

  function buildAnalyticsRows(filteredClients, filteredInvoices) {
    return filteredClients.map((client) => {
      const invs = filteredInvoices.filter((i) => i.cliente === client.cliente);
      const facturacion = sum(invs, (i) => i.importe);
      const cobrado = sum(invs, (i) => i.pagado);
      const pendiente = sum(invs, (i) => i.saldo);
      const vencidas = invs.filter((i) => i.saldo > 0 && i.vencDate && daysBetween(i.vencDate, new Date()) > 0).length;
      const ultimaFactura = invs.map((i) => i.emisionDate).filter(Boolean).sort((a, b) => b - a)[0] || null;
      const ultimoPago = invs.map((i) => i.fechaPago).filter(Boolean).sort((a, b) => b - a)[0] || null;
      const promedioFactura = invs.length ? facturacion / invs.length : 0;
      const porcentajeCobrado = facturacion ? (cobrado / facturacion) * 100 : 0;
      const promedioMensual = monthlyAverage(invs, 12);
      const crecimiento = growthVsPrevious(invs);

      return {
        cliente: client.cliente,
        estado: client.estado,
        facturas: invs.length,
        facturacion,
        promedio_factura: promedioFactura,
        cobrado,
        pendiente,
        porcentaje_cobrado: porcentajeCobrado,
        vencidas,
        ultima_factura: ultimaFactura,
        ultimo_pago: ultimoPago,
        promedio_mensual: promedioMensual,
        crecimiento,
        estado_general: pendiente > 0 ? (vencidas > 0 ? "Con atraso" : "Pendiente") : "Al día",
      };
    });
  }

  function renderKPIs(filteredClients, filteredInvoices, analytics) {
    const total = filteredClients.length;
    const activos = filteredClients.filter((c) => c.estado === "ACTIVO").length;
    const inactivos = filteredClients.filter((c) => c.estado === "INACTIVO").length;
    const facturacionTotal = sum(filteredInvoices, (i) => i.importe);
    const promedioCliente = total ? facturacionTotal / total : 0;
    const ticket = filteredInvoices.length ? facturacionTotal / filteredInvoices.length : 0;
    const top = [...analytics].sort((a, b) => b.facturacion - a.facturacion)[0];
    const topGrowth = [...analytics].sort((a, b) => b.crecimiento - a.crecimiento)[0];
    const topDebt = [...analytics].sort((a, b) => b.pendiente - a.pendiente)[0];
    const clientesVencidos = analytics.filter((a) => a.vencidas > 0).length;
    const sinFactRecent = analytics.filter((a) => !a.ultima_factura || monthsSince(a.ultima_factura) >= 3).length;
    const top5Concentration = concentrationTop(analytics, 5);
    const avg3 = averageMonths(filteredInvoices, 3);
    const avg6 = averageMonths(filteredInvoices, 6);
    const avg12 = averageMonths(filteredInvoices, 12);

    const cards = [
      ["Total clientes", total],
      ["Clientes activos", activos],
      ["Clientes inactivos", inactivos],
      ["Facturación total", formatMoney(facturacionTotal)],
      ["Promedio por cliente", formatMoney(promedioCliente)],
      ["Ticket promedio", formatMoney(ticket)],
      ["Mejor cliente", top ? `${top.cliente} (${formatMoney(top.facturacion)})` : "-"],
      ["Mayor crecimiento", topGrowth ? `${topGrowth.cliente} (${topGrowth.crecimiento.toFixed(1)}%)` : "-"],
      ["Mayor deuda", topDebt ? `${topDebt.cliente} (${formatMoney(topDebt.pendiente)})` : "-"],
      ["Clientes vencidos", clientesVencidos],
      ["Sin facturación 3+ meses", sinFactRecent],
      ["Concentración top 5", `${top5Concentration.toFixed(1)}%`],
      ["Promedio últimos 3 meses", formatMoney(avg3)],
      ["Promedio últimos 6 meses", formatMoney(avg6)],
      ["Promedio últimos 12 meses", formatMoney(avg12)],
    ];

    el.kpiGrid.innerHTML = cards.map(([t, v]) => `<article class="card"><strong>${t}</strong><p class="kpi-value">${v}</p></article>`).join("");
  }

  function renderCharts(filteredInvoices, analytics, filteredClients) {
    const monthlyTotals = aggregateByMonth(filteredInvoices);
    const labels = Object.keys(monthlyTotals).sort();
    const values = labels.map((k) => monthlyTotals[k]);

    evolutionChart = repaint(evolutionChart, "evolutionChart", {
      type: "line",
      data: { labels, datasets: [{ label: "Evolución mensual", data: values, borderColor: "#7a213a", backgroundColor: "rgba(122,33,58,0.25)" }] },
      options: { responsive: true, maintainAspectRatio: false },
    });

    const topFact = [...analytics].sort((a, b) => b.facturacion - a.facturacion).slice(0, 10);
    topBillingChart = repaint(topBillingChart, "topBillingChart", chartTop(topFact, "facturacion", "Top facturación"));

    const topDebt = [...analytics].sort((a, b) => b.pendiente - a.pendiente).slice(0, 10);
    topDebtChart = repaint(topDebtChart, "topDebtChart", chartTop(topDebt, "pendiente", "Top deuda pendiente"));

    const activeCount = filteredClients.filter((c) => c.estado === "ACTIVO").length;
    const inactiveCount = filteredClients.filter((c) => c.estado === "INACTIVO").length;
    activeInactiveChart = repaint(activeInactiveChart, "activeInactiveChart", {
      type: "doughnut",
      data: { labels: ["Activos", "Inactivos"], datasets: [{ data: [activeCount, inactiveCount], backgroundColor: ["#0f766e", "#9ca3af"] }] },
      options: { responsive: true, maintainAspectRatio: false },
    });

    shareChart = repaint(shareChart, "shareChart", {
      type: "pie",
      data: { labels: topFact.map((x) => x.cliente), datasets: [{ data: topFact.map((x) => x.facturacion), backgroundColor: topFact.map((_, i) => `hsl(${(i * 37) % 360} 55% 55%)`) }] },
      options: { responsive: true, maintainAspectRatio: false },
    });

    const growthTop = [...analytics].sort((a, b) => b.crecimiento - a.crecimiento).slice(0, 10);
    growthChart = repaint(growthChart, "growthChart", {
      type: "bar",
      data: { labels: growthTop.map((x) => x.cliente), datasets: [{ label: "% crecimiento", data: growthTop.map((x) => x.crecimiento), backgroundColor: "#0f766e" }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" },
    });
  }

  function chartTop(data, key, label) {
    return {
      type: "bar",
      data: { labels: data.map((x) => x.cliente), datasets: [{ label, data: data.map((x) => x[key]), backgroundColor: "#7a213a" }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" },
    };
  }

  function renderTable() {
    const sorted = [...rows].sort((a, b) => compare(a[sortBy], b[sortBy], sortDir));
    if (!sorted.length) {
      el.tableBody.innerHTML = '<tr><td colspan="14" style="color:#6b7280">Sin datos para filtros seleccionados.</td></tr>';
      return;
    }

    el.tableBody.innerHTML = sorted
      .map(
        (r) => `<tr data-client="${escapeHtml(r.cliente)}">
      <td>${escapeHtml(r.cliente)}</td>
      <td>${escapeHtml(r.estado)}</td>
      <td>${r.facturas}</td>
      <td>${formatMoney(r.facturacion)}</td>
      <td>${formatMoney(r.promedio_factura)}</td>
      <td>${formatMoney(r.cobrado)}</td>
      <td>${formatMoney(r.pendiente)}</td>
      <td>${r.porcentaje_cobrado.toFixed(1)}%</td>
      <td>${r.vencidas}</td>
      <td>${formatDate(r.ultima_factura)}</td>
      <td>${formatDate(r.ultimo_pago)}</td>
      <td>${formatMoney(r.promedio_mensual)}</td>
      <td>${r.crecimiento.toFixed(1)}%</td>
      <td>${escapeHtml(r.estado_general)}</td>
    </tr>`,
      )
      .join("");
  }

  function renderDetail() {
    const row = rows.find((r) => r.cliente === selectedClient) || rows[0];
    if (!row) {
      el.clientDetailBody.textContent = "Sin cliente seleccionado.";
      return;
    }

    const client = clients.find((c) => c.cliente === row.cliente);
    const invs = invoices.filter((i) => i.cliente === row.cliente);
    const totalVencido = sum(invs.filter((i) => i.saldo > 0 && i.vencDate && daysBetween(i.vencDate, new Date()) > 0), (i) => i.saldo);

    el.clientDetailBody.innerHTML = `
      <p><strong>${escapeHtml(row.cliente)}</strong> · Estado: ${escapeHtml(client?.estado || row.estado)}</p>
      <p>Fecha alta: ${formatDate(client?.fecha_alta || null)} · Facturas: ${row.facturas}</p>
      <p>Total cobrado: ${formatMoney(row.cobrado)} · Pendiente: ${formatMoney(row.pendiente)} · Vencido: ${formatMoney(totalVencido)}</p>
      <p>Última factura: ${formatDate(row.ultima_factura)} · Último pago: ${formatDate(row.ultimo_pago)}</p>
      <p>Observaciones: ${escapeHtml(client?.observaciones || "-")}</p>
    `;
  }

  function handleNewClient(event) {
    event.preventDefault();

    const name = window.SJClientsStore.normalizeClientName(el.cNombre.value);
    if (!name) return;

    const exact = clients.find((c) => window.SJClientsStore.normalizeClientName(c.cliente) === name);
    if (exact) {
      alert("Ya existe un cliente con ese nombre.");
      return;
    }

    const similar = clients.find((c) => levenshtein(window.SJClientsStore.normalizeClientName(c.cliente), name) <= 2);
    if (similar) {
      alert(`Nombre muy similar a cliente existente: ${similar.cliente}. Revisá antes de crear.`);
      return;
    }

    const record = window.SJClientsStore.normalizeClientRecord({
      id_cliente: window.SJClientsStore.buildClientId(name),
      cliente: name,
      razon_social: el.cRazonSocial.value,
      cuit: el.cCuit.value,
      estado: el.cEstado.value,
      fecha_alta: el.cFechaAlta.value,
      observaciones: el.cObservaciones.value,
      alias: el.cAlias.value,
      rubro: el.cRubro.value,
      zona: el.cZona.value,
    });

    clients.push(record);
    window.SJClientsStore.saveMasterClients(clients);
    alert("Cliente guardado correctamente.");
    el.clientForm.reset();
    el.clientFormSection.classList.add("hidden");
    refresh();
  }

  function exportClients() {
    const data = rows.map((r) => ({
      Cliente: r.cliente,
      Estado: r.estado,
      Facturas: r.facturas,
      Facturacion: r.facturacion,
      Cobrado: r.cobrado,
      Pendiente: r.pendiente,
      Vencidas: r.vencidas,
      "Ultima factura": formatDate(r.ultima_factura),
      "Ultimo pago": formatDate(r.ultimo_pago),
      "Crecimiento %": r.crecimiento,
      "Estado general": r.estado_general,
    }));

    if (window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(data);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      window.XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
      return;
    }
  }

  function fillClientFilter(filteredClients) {
    const current = el.filterCliente.value;
    el.filterCliente.innerHTML = '<option value="">Todos</option>';
    filteredClients.forEach((client) => {
      const opt = document.createElement("option");
      opt.value = client.cliente;
      opt.textContent = client.cliente;
      el.filterCliente.appendChild(opt);
    });
    el.filterCliente.value = current;
  }

  function monthlyAverage(invoicesList, months) {
    if (!invoicesList.length) return 0;
    return averageMonths(invoicesList, months);
  }

  function averageMonths(invoicesList, months) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const total = sum(invoicesList.filter((i) => i.emisionDate && i.emisionDate >= from), (i) => i.importe);
    return total / months;
  }

  function aggregateByMonth(invoicesList) {
    return invoicesList.reduce((acc, inv) => {
      if (!inv.emisionDate) return acc;
      const key = `${inv.emisionDate.getFullYear()}-${String(inv.emisionDate.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] || 0) + inv.importe;
      return acc;
    }, {});
  }

  function growthVsPrevious(invoicesList) {
    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const curr = sum(invoicesList.filter((i) => i.emisionDate && i.emisionDate >= currStart), (i) => i.importe);
    const prev = sum(invoicesList.filter((i) => i.emisionDate && i.emisionDate >= prevStart && i.emisionDate <= prevEnd), (i) => i.importe);
    if (!prev) return curr ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }

  function concentrationTop(analytics, n) {
    const total = sum(analytics, (a) => a.facturacion);
    if (!total) return 0;
    const top = sum([...analytics].sort((a, b) => b.facturacion - a.facturacion).slice(0, n), (a) => a.facturacion);
    return (top / total) * 100;
  }

  function monthsSince(date) {
    if (!date) return 999;
    const now = new Date();
    return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  }

  function repaint(prev, id, config) {
    const ctx = document.getElementById(id);
    if (!ctx) return prev;
    if (prev) prev.destroy();
    return new Chart(ctx, config);
  }

  function compare(a, b, dir) {
    const f = dir === "asc" ? 1 : -1;
    if (a instanceof Date || b instanceof Date) {
      const av = a instanceof Date ? a.getTime() : -Infinity;
      const bv = b instanceof Date ? b.getTime() : -Infinity;
      return (av - bv) * f;
    }
    if (typeof a === "number" || typeof b === "number") return (Number(a || 0) - Number(b || 0)) * f;
    return String(a || "").localeCompare(String(b || ""), "es", { numeric: true }) * f;
  }

  function sum(arr, fn) {
    return arr.reduce((acc, item) => acc + fn(item), 0);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }
})();
