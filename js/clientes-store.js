(function () {
  const MASTER_URL = "../data/clientes.json";
  const STORAGE_CLIENTES = "sj_clientes_master_v1";

  function normalizeClientName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function buildClientId(name) {
    const norm = normalizeClientName(name).toLowerCase();
    return `cli_${norm.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "nuevo"}`;
  }

  function normalizeClientRecord(client) {
    const cliente = normalizeClientName(client.cliente || client.nombre || "");
    return {
      id_cliente: client.id_cliente || buildClientId(cliente),
      cliente,
      razon_social: String(client.razon_social || "").trim(),
      cuit: String(client.cuit || "").trim(),
      estado: String(client.estado || "ACTIVO").toUpperCase() === "INACTIVO" ? "INACTIVO" : "ACTIVO",
      fecha_alta: String(client.fecha_alta || "").trim(),
      observaciones: String(client.observaciones || "").trim(),
      alias: String(client.alias || "").trim(),
      rubro: String(client.rubro || "").trim(),
      zona: String(client.zona || "").trim(),
      activo: String(client.estado || "ACTIVO").toUpperCase() !== "INACTIVO",
    };
  }

  async function loadMasterClients() {
    let base = [];
    try {
      const resp = await fetch(MASTER_URL);
      if (resp.ok) base = await resp.json();
    } catch (_error) {
      base = [];
    }

    const storedRaw = localStorage.getItem(STORAGE_CLIENTES);
    let stored = [];
    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw);
      } catch (_error) {
        stored = [];
      }
    }

    const normalized = [...base, ...stored].map(normalizeClientRecord);
    const byNorm = new Map();
    normalized.forEach((client) => {
      const key = normalizeClientName(client.cliente);
      if (!key) return;
      if (!byNorm.has(key)) byNorm.set(key, client);
      else byNorm.set(key, { ...byNorm.get(key), ...client });
    });

    return [...byNorm.values()].sort((a, b) => a.cliente.localeCompare(b.cliente, "es"));
  }

  function saveMasterClients(clients) {
    const normalized = clients.map(normalizeClientRecord);
    localStorage.setItem(STORAGE_CLIENTES, JSON.stringify(normalized));
  }

  window.SJClientsStore = {
    loadMasterClients,
    saveMasterClients,
    normalizeClientName,
    normalizeClientRecord,
    buildClientId,
  };
})();
