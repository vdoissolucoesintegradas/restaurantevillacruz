const path = require('node:path');
const ExcelJS = require('exceljs');

const templates = [
  {
    name: 'Faturamento',
    headers: [
      ['Data do faturamento', 'Obrigatório. Use uma data válida no formato DD/MM/AAAA.'],
      ['Faturamento', 'Obrigatório. Informe o valor total do dia em reais, como número.'],
      ['Canal', 'Opcional. Ex.: Salão, Delivery ou Aplicativo.'],
      ['Meta', 'Opcional. Informe a meta diária em reais.'],
      ['Observações', 'Opcional. Texto livre para contextualizar o lançamento.'],
    ],
    widths: [22, 18, 20, 16, 38],
    dateColumns: [1],
    moneyColumns: [2, 4],
  },
  {
    name: 'Despesas',
    headers: [
      ['Fornecedor', 'Obrigatório. Nome do fornecedor da despesa.'],
      ['Nº documento', 'Opcional. Número da nota ou outro documento.'],
      ['Emissão', 'Obrigatório. Data válida no formato DD/MM/AAAA.'],
      ['Vencimento', 'Opcional. Data válida no formato DD/MM/AAAA.'],
      ['Descrição', 'Opcional. Se vazio, o nome do fornecedor será usado.'],
      ['Valor total', 'Obrigatório. Informe o valor em reais, como número.'],
    ],
    widths: [28, 20, 16, 16, 38, 19],
    dateColumns: [3, 4],
    moneyColumns: [6],
  },
  {
    name: 'Produtos',
    headers: [
      ['Nome do produto', 'Obrigatório. Nome que será exibido no estoque.'],
      ['SKU', 'Opcional. Código interno ou código de barras.'],
      ['Unidade-base', 'Opcional. Ex.: unidade, kg, g, litro ou ml.'],
    ],
    widths: [34, 22, 20],
    dateColumns: [],
    moneyColumns: [],
  },
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Villa Cruz';
  workbook.subject = 'Modelo de importação de dados';
  workbook.title = 'Modelo para importar planilhas · Villa Cruz';
  workbook.description = 'Preencha uma aba e importe somente o tipo de dado correspondente.';

  for (const template of templates) {
    const sheet = workbook.addWorksheet(template.name);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: template.headers.length },
    };
    sheet.addRow(template.headers.map(([heading]) => heading));
    sheet.getRow(1).height = 30;
    sheet.getRow(1).eachCell((cell, columnNumber) => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183C40' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.note = template.headers[columnNumber - 1][1];
      cell.border = { bottom: { style: 'medium', color: { argb: 'FFED951B' } } };
    });

    template.widths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
    for (const index of template.dateColumns) {
      sheet.getColumn(index).numFmt = 'dd/mm/yyyy';
    }
    for (const index of template.moneyColumns) {
      sheet.getColumn(index).numFmt = '"R$" #,##0.00';
    }
  }

  const target = path.join(__dirname, '..', 'public', 'modelo-importacao-villa-cruz.xlsx');
  await workbook.xlsx.writeFile(target);
  process.stdout.write(`Planilha modelo gerada em ${target}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
