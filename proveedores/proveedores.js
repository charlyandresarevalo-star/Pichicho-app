(function () {
  const { formatMoney, formatDate, parseDate, daysBetween, toNumber } = window.SJUtils;
  const STORAGE_INVOICES = "sj_proveedores_facturas_v1";
  const STORAGE_SUPPLIERS = "sj_proveedores_datos_v1";
  const today = new Date();

  let rows = [];
  let suppliers = [];
  let filtered = [];
  let sortBy = "vencDate";
  let sortDir = "asc";
  let agingChart;
  let topSuppliersChart;
  let paidVsPendingChart;

  const elements = {
    toggleInvoiceForm: document.getElementById("toggleInvoiceForm"),
    invoiceFormSection: document.getElementById("invoiceFormSection"),
    toggleSuppliersPanel: document.getElementById("toggleSuppliersPanel"),
    suppliersPanel: document.getElementById("suppliersPanel"),
    toggleSupplierForm: document.getElementById("toggleSupplierForm"),
    supplierForm: document.getElementById("supplierForm"),
    suppliersBody: document.getElementById("suppliersBody"),
    supplierNames: document.getElementById("supplierNames"),

    form: document.getElementById("invoiceForm"),
    fProveedor: document.getElementById("fProveedor"),
    fFactura: document.getElementById("fFactura"),
    fConcepto: document.getElementById("fConcepto"),
    fEmision: document.getElementById("fEmision"),
    fVencimiento: document.getElementById("fVencimiento"),
    fImporte: document.getElementById("fImporte"),
    fPagado: document.getElementById("fPagado"),

    sNombre: document.getElementById("sNombre"),
    sCuit: document.getElementById("sCuit"),
    sCbu: document.getElementById("sCbu"),
    sResponsable: document.getElementById("sResponsable"),
    sContacto: document.getElementById("sContacto"),

    filterSupplier: document.getElementById("filterSupplier"),
    filterStatus: document.getElementById("filterStatus"),
    filterOverdue: document.getElementById("filterOverdue"),
    filterSearch: document.getElementById("filterSearch"),
    tableBody: document.getElementById("tableBody"),
    kpiGrid: document.getElementById("kpiGrid"),
  };

  init();

  function init() {
    rows = loadInvoices();
    suppliers = loadSuppliers();
    bindEvents();
    refreshAll();
  }

  function loadInvoices() {
    const raw = localStorage.getItem(STORAGE_INVOICES);
    if (raw) {
      try {
        return JSON.parse(raw).map(normalizeInvoice);
      } catch (_err) {
        localStorage.removeItem(STORAGE_INVOICES);
      }
    }

    const seed = [
      { proveedor: "LimpioQuim", nro_factura: "P-1001", concepto: "Insumos enero", emision: "2026-02-01", vencimiento: "2026-02-25", importe: 420000, pagado: 180000 },
      { proveedor: "Textil Norte", nro_factura: "P-1002", concepto: "Uniformes", emision: "2026-02-10", vencimiento: "2026-03-15", importe: 260000, pagado: 0 },
      { proveedor: "Eco Bolsas", nro_factura: "P-1003", concepto: "Bolsas residuos", emision: "2026-03-02", vencimiento: "2026-03-30", importe: 180000, pagado: 180000 },
    ];

    const normalized = seed.map(normalizeInvoice);
    saveInvoices(normalized);
    return normalized;
  }

  function loadSuppliers() {
    const raw = localStorage.getItem(STORAGE_SUPPLIERS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (_err) {
        localStorage.removeItem(STORAGE_SUPPLIERS);
      }
    }

    const seed = [
      { nombre: "LimpioQuim", cuit: "30-71234567-8", cbu: "2850590940090418135201", responsable: "Marina López", contacto: "marina@limpioquim.com / 11-5566-7788" },
      { nombre: "Textil Norte", cuit: "30-70111222-3", cbu: "0720169720000003456789", responsable: "Iván Torres", contacto: "ventas@textilnorte.com" },
    ];

    saveSuppliers(seed);
    return seed;
  }

  function bindEvents() {
    elements.toggleInvoiceForm.addEventListener("click", () => {
      elements.invoiceFormSection.classList.toggle("hidden");
    });

    elements.toggleSuppliersPanel.addEventListener("click", () => {
      elements.suppliersPanel.classList.toggle("hidden");
    });

    elements.toggleSupplierForm.addEventListener("click", () => {
      elements.supplierForm.classList.toggle("hidden");
    });

    elements.form.addEventListener("submit", (e) => {
      e.preventDefault();
      rows.unshift(
        normalizeInvoice({
          proveedor: elements.fProveedor.value,
          nro_factura: elements.fFactura.value,
          concepto: elements.fConcepto.value,
          emision: elements.fEmision.value,
          vencimiento: elements.fVencimiento.value,
          importe: elements.fImporte.value,
          pagado: elements.fPagado.value,
        }),
      );
      saveInvoices(rows);
      elements.form.reset();
      elements.fPagado.value = 0;
      refreshAll();
    });

    elements.supplierForm.addEventListener("submit", (e) => {
      e.preventDefault();
      suppliers.unshift({
        nombre: elements.sNombre.value.trim(),
        cuit: elements.sCuit.value.trim(),
        cbu: elements.sCbu.value.trim(),
        responsable: elements.sResponsable.value.trim(),
        contacto: elements.sContacto.value.trim(),
      });
      saveSuppliers(suppliers);
      elements.supplierForm.reset();
      elements.supplierForm.classList.add("hidden");
      refreshAll();
    });

    [elements.filterSupplier, elements.filterStatus, elements.filterOverdue].forEach((el) =>
      el.addEventListener("change", refreshAll),
    );
    elements.filterSearch.addEventListener("input", refreshAll);

    document.querySelectorAll("th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort === "emision" ? "emisionDate" : th.dataset.sort === "vencimiento" ? "vencDate" : th.dataset.sort;
        if (sortBy === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
          sortBy = key;
          sortDir = "asc";
        }
        renderTable();
      });
    });

    elements.tableBody.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const item = rows.find((r) => r.id === id);
      if (!item) return;

      if (btn.dataset.action === "pay") {
        item.pagado = item.importe;
      } else if (btn.dataset.action === "pending") {
        item.pagado = 0;
      } else if (btn.dataset.action === "delete") {
        rows = rows.filter((r) => r.id !== id);
      }

      rows = rows.map(normalizeInvoice);
      saveInvoices(rows);
      refreshAll();
    });
  }

  function normalizeInvoice(row) {
    const importe = Math.max(toNumber(row.importe), 0);
    const pagado = Math.max(toNumber(row.pagado), 0);
    const saldo = Math.max(importe - pagado, 0);
    const emisionDate = parseDate(row.emision);
    const vencDate = parseDate(row.vencimiento);
    const diasVencido = vencDate && saldo > 0 ? Math.max(daysBetween(vencDate, today), 0) : 0;
    const estado = saldo <= 0 ? "PAGADO" : pagado > 0 ? "PARCIAL" : "PENDIENTE";

    return {
      id: row.id || crypto.randomUUID(),
      proveedor: row.proveedor || "(Sin proveedor)",
      nro_factura: row.nro_factura || "-",
      concepto: row.concepto || "",
      emision: row.emision || "",
      emisionDate,
      vencimiento: row.vencimiento || "",
      vencDate,
      importe,
      pagado,
      saldo,
      estado,
      dias_vencido: diasVencido,
    };
  }

  function refreshAll() {
    renderSupplierData();
    fillSupplierFilter();
    applyFilters();
    renderKPIs();
    renderCharts();
    renderTable();
  }

  function renderSupplierData() {
    elements.suppliersBody.innerHTML = suppliers.length
      ? suppliers
          .map(
            (s) => `<tr><td>${s.nombre}</td><td>${s.cuit}</td><td>${s.cbu}</td><td>${s.responsable}</td><td>${s.contacto}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" style="color:#6b7280">Sin proveedores cargados.</td></tr>';

    elements.supplierNames.innerHTML = suppliers
      .map((s) => `<option value="${s.nombre}"></option>`)
      .join("");
  }

  function fillSupplierFilter() {
    const current = elements.filterSupplier.value;
    elements.filterSupplier.innerHTML = '<option value="">Todos</option>';

    [...new Set(rows.map((r) => r.proveedor))]
      .sort((a, b) => a.localeCompare(b, "es"))
      .forEach((supplier) => {
        const option = document.createElement("option");
        option.value = supplier;
        option.textContent = supplier;
        elements.filterSupplier.appendChild(option);
      });

    elements.filterSupplier.value = current;
  }

  function applyFilters() {
    const supplier = elements.filterSupplier.value;
    const status = elements.filterStatus.value;
    const overdue = elements.filterOverdue.value;
    const search = elements.filterSearch.value.trim().toLowerCase();

    filtered = rows.filter((r) => {
      if (supplier && r.proveedor !== supplier) return false;
      if (status && r.estado !== status) return false;
      if (overdue === "SI" && r.dias_vencido <= 0) return false;
      if (overdue === "NO" && r.dias_vencido > 0) return false;
      if (search && ![r.proveedor, r.nro_factura, r.concepto].join(" ").toLowerCase().includes(search)) return false;
      return true;
    });
  }

  function renderKPIs() {
    const pendiente = sum(filtered, (r) => r.saldo);
    const vencido = sum(filtered, (r) => (r.dias_vencido > 0 ? r.saldo : 0));
    const porcentaje = pendiente ? (vencido / pendiente) * 100 : 0;
    const pagadoMes = sum(filtered, (r) => (sameMonth(r.emisionDate) ? r.pagado : 0));

    elements.kpiGrid.innerHTML = [
      ["Pendiente total", formatMoney(pendiente)],
      ["Vencido total", formatMoney(vencido)],
      ["% vencido", `${porcentaje.toFixed(1)}%`],
      ["Pagado mes actual", formatMoney(pagadoMes)],
      ["Facturas", String(filtered.length)],
    ]
      .map(([title, value]) => `<article class="card"><strong>${title}</strong><p class="kpi-value">${value}</p></article>`)
      .join("");
  }

  function renderCharts() {
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "+90": 0 };
    const bySupplier = {};
    let paidMonth = 0;
    let pendingMonth = 0;

    filtered.forEach((r) => {
      if (r.saldo > 0) {
        if (r.dias_vencido <= 30) buckets["0-30"] += r.saldo;
        else if (r.dias_vencido <= 60) buckets["31-60"] += r.saldo;
        else if (r.dias_vencido <= 90) buckets["61-90"] += r.saldo;
        else buckets["+90"] += r.saldo;
      }

      bySupplier[r.proveedor] = (bySupplier[r.proveedor] || 0) + r.saldo;
      if (sameMonth(r.emisionDate)) {
        paidMonth += r.pagado;
        pendingMonth += r.saldo;
      }
    });

    const topSuppliers = Object.entries(bySupplier)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    agingChart = recreateChart(agingChart, "agingChart", "bar", Object.keys(buckets), Object.values(buckets), ["#a1324f", "#b45309", "#0f766e", "#7f1d1d"], "Aging (ARS)");
    topSuppliersChart = recreateChart(topSuppliersChart, "topSuppliersChart", "bar", topSuppliers.map((x) => x[0]), topSuppliers.map((x) => x[1]), "#7a213a", "Top proveedores", { indexAxis: "y" });
    paidVsPendingChart = recreateChart(paidVsPendingChart, "paidVsPendingChart", "doughnut", ["Pagado", "Pendiente"], [paidMonth, pendingMonth], ["#0f766e", "#a1324f"], "Mes actual");
  }

  function recreateChart(current, id, type, labels, data, backgroundColor, label, extraOptions) {
    if (current) current.destroy();
    return new Chart(document.getElementById(id), {
      type,
      data: { labels, datasets: [{ label, data, backgroundColor }] },
      options: { responsive: true, maintainAspectRatio: false, ...extraOptions },
    });
  }

  function renderTable() {
    const sorted = [...filtered].sort((a, b) => compare(a[sortBy], b[sortBy], sortDir));
    elements.tableBody.innerHTML = sorted
      .map(
        (r) => `<tr>
      <td>${r.proveedor}</td>
      <td>${r.nro_factura}</td>
      <td>${r.concepto || "-"}</td>
      <td>${formatDate(r.emisionDate)}</td>
      <td>${formatDate(r.vencDate)}</td>
      <td>${formatMoney(r.importe)}</td>
      <td>${formatMoney(r.pagado)}</td>
      <td>${formatMoney(r.saldo)}</td>
      <td>${statePill(r.estado)}</td>
      <td>${r.dias_vencido}</td>
      <td>
        <div class="action-row">
          <button class="secondary-btn" data-action="pay" data-id="${r.id}">Pagar</button>
          <button class="warning-btn" data-action="pending" data-id="${r.id}">Pendiente</button>
          <button class="danger-btn" data-action="delete" data-id="${r.id}">Eliminar</button>
        </div>
      </td>
    </tr>`,
      )
      .join("");
  }

  function statePill(status) {
    const cls = status === "PAGADO" ? "status-paid" : status === "PARCIAL" ? "status-partial" : "status-pending";
    return `<span class="status-pill ${cls}">${status}</span>`;
  }

  function sameMonth(date) {
    return date && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }

  function compare(a, b, dir) {
    const factor = dir === "asc" ? 1 : -1;
    if (a instanceof Date || b instanceof Date) {
      const aa = a instanceof Date ? a.getTime() : -Infinity;
      const bb = b instanceof Date ? b.getTime() : -Infinity;
      return (aa - bb) * factor;
    }
    if (typeof a === "number" || typeof b === "number") return (Number(a) - Number(b)) * factor;
    return String(a).localeCompare(String(b), "es", { numeric: true }) * factor;
  }

  function sum(list, fn) {
    return list.reduce((acc, item) => acc + fn(item), 0);
  }

  function saveInvoices(data) {
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(data));
  }

  function saveSuppliers(data) {
    localStorage.setItem(STORAGE_SUPPLIERS, JSON.stringify(data));
  }
})();
