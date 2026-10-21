export type CellValue = string | number | boolean | null;

export type PreviewRow = {
  sourceRowNumber: number;
  sourceValues: Record<string, CellValue>;
  messages: string[];
  state: "pending" | "warning";
};

export function inspectRows(rows: Array<Record<string, CellValue>>): PreviewRow[] {
  const signatures = new Set<string>();
  return rows.map((sourceValues, index) => {
    const messages: string[] = [];
    const values = Object.values(sourceValues);

    if (values.every((value) => value === null || value === "")) {
      messages.push("Linha vazia preservada; não será interpretada como zero.");
    }
    if (values.some((value) => typeof value === "string" && /^\s*x\s*$/i.test(value))) {
      messages.push('Contém o marcador "X"; confirme o significado antes de importar.');
    }
    if (values.some((value) => typeof value === "string" && /#(REF!|VALUE!|DIV\/0!|NAME\?)/i.test(value))) {
      messages.push("A linha contém um erro de fórmula do Excel.");
    }
    if (values.some((value) => typeof value === "string" && value.startsWith("="))) {
      messages.push("A linha contém fórmula; o valor não será calculado nesta prévia.");
    }
    const signature = JSON.stringify(Object.entries(sourceValues).sort(([a], [b]) => a.localeCompare(b)));
    if (signatures.has(signature)) messages.push("Esta linha é idêntica a outra linha da mesma aba; revise possível duplicidade.");
    signatures.add(signature);

    return {
      sourceRowNumber: index + 2,
      sourceValues,
      messages,
      state: messages.length ? "warning" : "pending",
    };
  });
}

export function validateMappedRows(rows: PreviewRow[], mapping: Record<string, string>): PreviewRow[] {
  return rows.map((row) => {
    const messages = row.messages.filter((message) => !message.startsWith("Campo mapeado"));
    const dateColumn = mapping.data;
    const amountColumn = mapping.valor;
    if (dateColumn) {
      const value = row.sourceValues[dateColumn];
      if (value !== null && value !== "" && typeof value === "string" && !isDateText(value)) {
        messages.push(`Campo mapeado Data não reconhecido na linha ${row.sourceRowNumber}; valor original mantido.`);
      }
    }
    if (amountColumn) {
      const value = row.sourceValues[amountColumn];
      if (value !== null && value !== "" && typeof value === "string" && !isMoneyText(value)) {
        messages.push(`Campo mapeado Valor está em texto na linha ${row.sourceRowNumber}; confirme a conversão.`);
      }
    }
    return { ...row, messages, state: messages.length ? "warning" : "pending" };
  });
}

function isDateText(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value);
}

function isMoneyText(value: string) {
  const normalized = value.trim().replace(/^R\$\s*/i, "");
  return /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized) || /^-?\d+(?:\.\d{1,2})?$/.test(normalized);
}

export function safeCellValue(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  if (typeof value === "object" && "formula" in value && typeof value.formula === "string") {
    const result = "result" in value ? value.result : null;
    if (typeof result === "string" && result.startsWith("#")) return `=${value.formula} [resultado armazenado: ${result}]`;
    return `=${value.formula}`;
  }
  return String(value);
}
