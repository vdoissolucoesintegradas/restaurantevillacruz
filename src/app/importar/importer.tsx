"use client";

import ExcelJS from "exceljs";
import { useMemo, useRef, useState } from "react";
import { saveImportDraft } from "@/app/actions";
import { inspectRows, safeCellValue, validateMappedRows, type CellValue, type PreviewRow } from "@/lib/importer";

type Props = { companies: Array<{ id: string; name: string }> };

export function Importer({ companies }: Props) {
  const [fileName, setFileName] = useState("");
  const [fileSha256, setFileSha256] = useState("");
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [sheetName, setSheetName] = useState("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const workbookRef = useRef<ExcelJS.Workbook | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const mappedRows = useMemo(() => validateMappedRows(rows, mapping), [rows, mapping]);
  const warnings = useMemo(() => mappedRows.filter((row) => row.state === "warning").length, [mappedRows]);

  async function readFile(file?: File) {
    setMessage("");
    setRows([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setMessage("Escolha um arquivo .xlsx. Outros formatos ainda não são aceitos.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMessage("O arquivo excede o limite de 25 MB.");
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const fileBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(fileBuffer);
      const digest = await crypto.subtle.digest("SHA-256", fileBuffer);
      setFileSha256(Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""));
      workbookRef.current = workbook;
      const names = workbook.worksheets.map((sheet) => sheet.name);
      setFileName(file.name);
      setSheetNames(names);
      loadSheet(workbook, names[0]);
    } catch {
      setMessage("Não foi possível ler o arquivo. Verifique se ele é uma planilha .xlsx válida.");
    }
  }

  function loadSheet(workbook: ExcelJS.Workbook, name: string) {
      const sheet = workbook.getWorksheet(name);
      if (!sheet) return;
      setSheetName(sheet.name);
      const first = sheet.getRow(1);
      const columnCount = Math.max(first.cellCount, sheet.columnCount);
      const nextHeaders = Array.from({ length: columnCount }, (_, index) => {
        const value = safeCellValue(first.getCell(index + 1).value);
        return value === null || String(value).trim() === "" ? `Coluna ${index + 1}` : String(value);
      });
      setHeaders(nextHeaders);
      setMapping((previous) => Object.fromEntries(Object.entries(previous).filter(([, value]) => nextHeaders.includes(value))));
      const rawRows: Array<Record<string, CellValue>> = [];
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        if (row.cellCount === 0) continue;
        const values: Record<string, CellValue> = {};
        nextHeaders.forEach((header, index) => { values[header] = safeCellValue(row.getCell(index + 1).value); });
        rawRows.push(values);
      }
      setRows(inspectRows(rawRows));
      setMessage(`Prévia pronta: ${rawRows.length} linhas. O arquivo foi lido no navegador; nenhum dado foi importado.`);
  }

  function changeSheet(nextName: string) {
    if (workbookRef.current) loadSheet(workbookRef.current, nextName);
  }

  async function saveDraft() {
    if (!companyId || !rows.length) return;
    setBusy(true);
    const result = await saveImportDraft({
      companyId, fileName, fileSha256, sheetName,
      mapping,
      rows: mappedRows.map((row) => ({ rowNumber: row.sourceRowNumber, values: row.sourceValues, messages: row.messages, state: row.state })),
    });
    setMessage(result.message);
    setBusy(false);
  }

  return (
    <div className="import-workspace">
      <section className="panel import-controls">
        <label className="field">
          <span>Arquivo Excel (.xlsx)</span>
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => readFile(event.target.files?.[0])} />
          <small>Leitura local no navegador · limite 25 MB</small>
        </label>
        <label className="field">
          <span>Aba</span>
          <select value={sheetName} onChange={(event) => changeSheet(event.target.value)} disabled={!sheetNames.length}>
            {sheetNames.length ? sheetNames.map((name) => <option key={name}>{name}</option>) : <option value="">Selecione um arquivo</option>}
          </select>
        </label>
        <label className="field">
          <span>Empresa/unidade</span>
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} disabled={!companies.length}>
            {companies.length ? companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>) : <option value="">Configure uma empresa para importar</option>}
          </select>
        </label>
        <div className="notice"><strong>Revisão obrigatória</strong><span>Esta etapa preserva os valores da planilha. Nenhum saldo ou fórmula é confirmado automaticamente.</span></div>
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="button button-primary" onClick={saveDraft} disabled={!rows.length || !companies.length || busy}>
          {busy ? "Salvando…" : "Guardar rascunho"}
        </button>
      </section>

      <section className="panel preview-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">PRÉ-VISUALIZAÇÃO</p><h2>{fileName || "Nenhum arquivo selecionado"}</h2></div>
          <div className="preview-count"><strong>{rows.length}</strong><span>linhas</span><em>{warnings} alertas</em></div>
        </div>
        {rows.length ? (
          <div className="table-scroll"><table><thead><tr><th>Linha</th>{headers.map((header) => <th key={header}>{header}</th>)}<th>Validação</th></tr></thead>
            <tbody>{mappedRows.slice(0, 100).map((row) => <tr key={row.sourceRowNumber}>
              <th>{row.sourceRowNumber}</th>
              {headers.map((header) => <td key={header}>{formatValue(row.sourceValues[header])}</td>)}
              <td>{row.messages.length ? <span className="tag tag-warning">{row.messages.join(" ")}</span> : <span className="tag tag-neutral">Pendente</span>}</td>
            </tr>)}</tbody></table></div>
        ) : <div className="empty-preview"><div className="file-icon">XLSX</div><p>Escolha uma planilha para conferir abas, valores e avisos antes de criar o rascunho.</p></div>}
        {rows.length > 100 && <p className="table-note">Mostrando as primeiras 100 linhas. O rascunho inclui {rows.length} linhas.</p>}
      </section>
      {headers.length > 0 && <section className="panel mapping-panel">
        <div className="panel-heading"><div><p className="eyebrow">MAPEAMENTO INICIAL</p><h2>Associe colunas, sem transformar valores</h2></div><span className="tag tag-neutral">Opcional nesta prévia</span></div>
        <div className="mapping-grid">{[
          ["data", "Data"], ["valor", "Valor"], ["categoria", "Categoria"], ["fornecedor", "Fornecedor"], ["documento", "Nº do documento"], ["vencimento", "Vencimento"],
        ].map(([key, label]) => <label className="field" key={key}><span>{label}</span><select value={mapping[key] ?? ""} onChange={(event) => setMapping((previous) => ({ ...previous, [key]: event.target.value }))}><option value="">Não mapeado</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
        <p className="table-note">O rascunho mantém as células de origem. Este mapeamento ainda não aplica regras contábeis nem converte datas ou valores.</p>
      </section>}
    </div>
  );
}

function formatValue(value: CellValue) {
  if (value === null) return <span className="muted">Vazio</span>;
  return String(value);
}
