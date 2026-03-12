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
  };

  async function init() {
    try {
      const csvText = await fetch(DATA_URL).then((res) => {
        if (!res.ok) throw new Error("No se pudo leer invoices.csv");
        return res.text();
      });
      rows = normalizeRows(csvToObjects(csvText));
      fillFilters();
      bindEvents();
      applyFiltersAndRender();
    } catch (error) {
      elements.tableBody.innerHTML = `<tr><td colspan="10">Error cargando datos: ${error.message}</td></tr>`;
    }
  }

  function normalizeRows(data) {
    return data.map((item) => {
      const importe = toNumber(item.importe);
      const pagado = toNumber(item.pagado);
      const saldo = Math.max(importe - pagado, 0);
      const emisionDate = parseDate(item.emision);
      const vencDate = parseDate(item.vencimiento);
      const diasVencido = vencDate ? Math.max(daysBetween(vencDate, today), 0) : 0;

      let estado = "COBRADO";
      if (saldo > 0 && pagado > 0) estado = "PARCIAL";
      if (saldo > 0 && pagado <= 0) estado = "PENDIENTE";

      return {
        cliente: item.cliente || "(Sin cliente)",
        nro_factura: item.nro_factura || "-",
        periodo: item.periodo || "",
        emision: item.emision || "",
        emisionDate,
        vencimiento: item.vencimiento || "",
        vencDate,
        importe,
        pagado,
        saldo,
        estado,
        dias_vencido: diasVencido,
      };
    });
  }

  function fillFilters() {
    const clients = [...new Set(rows.map((r) => r.cliente))].sort((a, b) => a.localeCompare(b));
    clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client;
      option.textContent = client;
      elements.filterClient.appendChild(option);
    });
  }

  function bindEvents() {
    [elements.filterClient, elements.filterStatus, elements.filterOverdue].forEach((el) => {
      el.addEventListener("change", applyFiltersAndRender);
    });
    elements.filterSearch.addEventListener("input", applyFiltersAndRender);

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
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

  function applyFiltersAndRender() {
    const client = elements.filterClient.value;
    const status = elements.filterStatus.value;
    const overdue = elements.filterOverdue.value;
    const search = elements.filterSearch.value.trim().toLowerCase();

    filtered = rows.filter((r) => {
      if (client && r.cliente !== client) return false;
      if (status && r.estado !== status) return false;
      if (overdue === "SI" && r.dias_vencido <= 0) return false;
      if (overdue === "NO" && r.dias_vencido > 0) return false;

      if (search) {
        const blob = [r.cliente, r.nro_factura, r.periodo, r.estado].join(" ").toLowerCase();
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

    elements.kpiGrid.innerHTML = kpis
      .map(
        ([title, value, caption]) =>
          `<article class="card"><strong>${title}</strong><p class="kpi-value">${value}</p><p class="kpi-caption">${caption}</p></article>`,
      )
      .join("");
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

      if (r.emisionDate && r.emisionDate.getMonth() === today.getMonth() && r.emisionDate.getFullYear() === today.getFullYear()) {
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
        datasets: [{ label: "Aging (ARS)", data: Object.values(buckets), backgroundColor: ["#a1324f", "#b45309", "#0f766e", "#7f1d1d"] }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });

    topClientsChart = recreateChart(topClientsChart, "topClientsChart", {
      type: "bar",
      data: {
        labels: topClientes.map(([name]) => name),
        datasets: [{ label: "Deuda vencida", data: topClientes.map(([, amount]) => amount), backgroundColor: "#7a213a" }],
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
    const sorted = [...filtered].sort((a, b) => compareValues(a[sortBy], b[sortBy], sortDir));
    elements.tableBody.innerHTML = sorted
      .map(
        (r) => `<tr>
      <td>${r.cliente}</td>
      <td>${r.nro_factura}</td>
      <td>${r.periodo || "-"}</td>
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
      ? items.map((item) => `<li>${item}</li>`).join("")
      : `<li style="color:#6b7280">${emptyText}</li>`;
  }

  function recreateChart(instance, id, config) {
    if (instance) instance.destroy();
    const ctx = document.getElementById(id);
    return new Chart(ctx, config);
  }

  function compareValues(a, b, dir) {
    const factor = dir === "asc" ? 1 : -1;

    if (a instanceof Date || b instanceof Date) {
      const va = a instanceof Date ? a.getTime() : -Infinity;
      const vb = b instanceof Date ? b.getTime() : -Infinity;
      return (va - vb) * factor;
    }

    if (typeof a === "number" || typeof b === "number") {
      return (Number(a) - Number(b)) * factor;
    }

    return String(a).localeCompare(String(b)) * factor;
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
    return `<span class="status-pill ${map[status] || "status-pending"}">${status}</span>`;
  }

  init();
})();
