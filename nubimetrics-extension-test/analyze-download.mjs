import * as XLSX from 'xlsx';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DOWNLOADS = path.join(process.env.USERPROFILE, 'Downloads');
const RESULT_DIR = path.join(DOWNLOADS, 'nubimetrics-test');

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const populated = value => value !== null && value !== undefined && String(value).trim() !== '';
const findColumn = (columns, predicate) => columns.find(column => predicate(normalize(column))) ?? null;

async function newestTechnicalResult() {
  const names = (await readdir(RESULT_DIR)).filter(name => /^nubimetrics-test-result-.*\.json$/i.test(name));
  if (!names.length) throw new Error('Nenhum relatório técnico da extensão foi encontrado.');
  const entries = await Promise.all(names.map(async name => ({ name, modified: (await stat(path.join(RESULT_DIR, name))).mtimeMs })));
  entries.sort((a, b) => b.modified - a.modified);
  return JSON.parse(await readFile(path.join(RESULT_DIR, entries[0].name), 'utf8'));
}

async function findDownloadedFile(filename) {
  const direct = path.join(DOWNLOADS, filename);
  if (await stat(direct).then(value => value.isFile()).catch(() => false)) return direct;
  const directories = await readdir(DOWNLOADS, { withFileTypes: true });
  for (const entry of directories.filter(item => item.isDirectory())) {
    const candidate = path.join(DOWNLOADS, entry.name, filename);
    if (await stat(candidate).then(value => value.isFile()).catch(() => false)) return candidate;
  }
  throw new Error(`Arquivo exportado não encontrado em Downloads: ${filename}`);
}

function chooseHeaderRow(matrix) {
  const keywords = ['titulo', 'vendedor', 'seller', 'marca', 'brand', 'anuncio', 'item', 'id', 'preco', 'categoria', 'link', 'url'];
  let selected = { index: 0, score: -1 };
  for (let index = 0; index < Math.min(matrix.length, 20); index += 1) {
    const values = (matrix[index] || []).filter(populated).map(normalize);
    const score = values.length + values.filter(value => keywords.some(keyword => value.includes(keyword))).length * 5;
    if (values.length >= 2 && score > selected.score) selected = { index, score };
  }
  return selected.index;
}

const technical = await newestTechnicalResult();
const spreadsheetPath = await findDownloadedFile(technical.downloadedFilename);
const fileInfo = await stat(spreadsheetPath);
if (!fileInfo.isFile() || fileInfo.size === 0) throw new Error('A exportação existe, mas está vazia.');

const workbook = XLSX.readFile(spreadsheetPath, { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
const headerIndex = chooseHeaderRow(matrix);
const columns = (matrix[headerIndex] || []).map((value, index) => populated(value) ? String(value).trim() : `COLUNA_${index + 1}`);
const rows = matrix.slice(headerIndex + 1).filter(row => row.some(populated));

const sellerIdColumn = findColumn(columns, value => /(id.*(vendedor|seller)|(vendedor|seller).*id)/.test(value));
const sellerColumn = findColumn(columns, value => /(vendedor|seller)/.test(value) && !/\bid\b/.test(value));
const listingIdColumn = findColumn(columns, value => /(id.*(anuncio|publica|item)|(anuncio|publica|item).*id)/.test(value));
const brandColumn = findColumn(columns, value => /(^|\b)(marca|brand)(\b|$)/.test(value));
const titleColumn = findColumn(columns, value => /(titulo|title|nome.*anuncio)/.test(value));
const linkColumn = findColumn(columns, value => /(link|url|permalink)/.test(value));
const columnIndex = column => column ? columns.indexOf(column) : -1;
const example = column => {
  const index = columnIndex(column);
  return index < 0 ? null : rows.find(row => populated(row[index]))?.[index] ?? null;
};
const hasMercadoLivreLink = linkColumn
  ? rows.some(row => /mercadolivre\.com\.br|mercadolibre\.com/i.test(String(row[columnIndex(linkColumn)] ?? '')))
  : rows.some(row => row.some(cell => /https?:\/\/[^\s]*mercadolivre/i.test(String(cell ?? ''))));

const interfaceCount = Number.isFinite(Number(technical.interfaceCount)) ? Number(technical.interfaceCount) : null;
let limitObservation = 'Não foi possível comparar conclusivamente a interface com a exportação.';
if (interfaceCount === rows.length) limitObservation = `A exportação corresponde aos ${rows.length} resultados exibidos.`;
else if (interfaceCount !== null && interfaceCount > rows.length) {
  limitObservation = `${interfaceCount} resultados encontrados, porém ${rows.length} registros foram exportados.`;
  if (interfaceCount > 10000 && rows.length === 10000) limitObservation += ' Limite prático confirmado em exatamente 10.000 registros.';
}

console.log('\n=== TESTE NUBIMETRICS ===');
console.log(`\nMarca pesquisada:\n${technical.brand}`);
console.log(`\nResultados encontrados na interface:\n${interfaceCount ?? 'NÃO IDENTIFICADO'}`);
console.log(`\nArquivo exportado:\n${technical.downloadedFilename}`);
console.log(`\nFormato:\n${path.extname(technical.downloadedFilename).slice(1).toLowerCase() || 'DESCONHECIDO'}`);
console.log(`\nQuantidade de registros exportados:\n${rows.length}`);
console.log(`\nColunas encontradas:\n${columns.join(', ') || 'NENHUMA'}`);
console.log(`\nPossui vendedor:\n${sellerColumn ? 'SIM' : 'NÃO'}`);
console.log(`\nPossui ID do vendedor:\n${sellerIdColumn ? 'SIM' : 'NÃO'}`);
console.log(`\nPossui ID do anúncio:\n${listingIdColumn ? 'SIM' : 'NÃO'}`);
console.log(`\nFormato do ID do anúncio:\n${example(listingIdColumn) ?? 'NÃO IDENTIFICADO'}`);
console.log(`\nPossui marca:\n${brandColumn ? 'SIM' : 'NÃO'}`);
console.log(`\nPossui título:\n${titleColumn ? 'SIM' : 'NÃO'}`);
console.log(`\nPossui link do Mercado Livre:\n${hasMercadoLivreLink ? 'SIM' : 'NÃO'}`);
console.log(`\nPermite relacionar anúncio + vendedor:\n${listingIdColumn && (sellerColumn || sellerIdColumn) ? 'SIM' : 'NÃO'}`);
console.log(`\nLimite de exportação observado:\n${limitObservation}`);
console.log(`\nObservações:\nRótulo do botão: ${technical.exportLimitLabel || 'não identificado'}. Colunas visíveis na interface: ${(technical.visibleColumns || []).join(', ') || 'não identificadas'}. Arquivo confirmado com ${fileInfo.size} bytes.`);
