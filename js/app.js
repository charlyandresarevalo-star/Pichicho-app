(function () {
  const LOCALE = "es-AR";
  const CURRENCY = "ARS";

  function toNumber(value) {
    if (typeof value === "number") return value;
    const normalized = String(value || "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: CURRENCY,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = parseDate(value);
    if (!date) return "-";
    return new Intl.DateTimeFormat(LOCALE).format(date);
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    const raw = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const date = new Date(raw + "T00:00:00");
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parts = raw.split(/[/-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts.map(Number);
      if (String(parts[0]).length === 4) {
        const date = new Date(a, b - 1, c);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      const date = new Date(c, b - 1, a);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function daysBetween(dateA, dateB) {
    const one = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
    const two = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
    const ms = two.getTime() - one.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function csvToObjects(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map((item) => item.trim());
    };

    const headers = parseLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseLine(line);
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] || "";
        return obj;
      }, {});
    });
  }

  window.SJUtils = {
    toNumber,
    formatMoney,
    parseDate,
    formatDate,
    daysBetween,
    csvToObjects,
  };
})();
