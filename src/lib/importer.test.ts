import { describe, expect, it } from "vitest";
import { inspectRows, safeCellValue, validateMappedRows } from "./importer";

describe("Excel import preview validation", () => {
  it("keeps empty cells distinct and flags rows containing X", () => {
    const [row] = inspectRows([
      { fornecedor: "Fornecedor", vencimento: "X", valor: null },
    ]);
    expect(row.state).toBe("warning");
    expect(row.messages.some((message) => message.includes('"X"'))).toBe(true);
    expect(row.sourceValues.valor).toBeNull();
  });

  it("preserves formula text and does not calculate the formula", () => {
    expect(safeCellValue({ formula: "SUM(B2:B5)", result: 120 })).toBe("=SUM(B2:B5)");
    const [row] = inspectRows([{ total: "=SUM(B2:B5)" }]);
    expect(row.messages[0]).toContain("fórmula");
  });

  it("warns about formula errors without replacing them with zero", () => {
    const [row] = inspectRows([{ total: "#REF!" }]);
    expect(row.state).toBe("warning");
    expect(row.sourceValues.total).toBe("#REF!");
  });

  it("warns about text dates and amounts after mapping", () => {
    const rows = inspectRows([{ dia: "ontem", total: "valor pendente" }]);
    const [row] = validateMappedRows(rows, { data: "dia", valor: "total" });
    expect(row.messages.some((message) => message.includes("Data não reconhecido"))).toBe(true);
    expect(row.messages.some((message) => message.includes("Valor está em texto"))).toBe(true);
  });
});
