import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(MODULE_DIR, '..');

const FIELD_COLUMNS = {
  titulo: ['Título', 'Titulo'],
  vendedor: ['Vendedor'],
  id_vendedor: ['ID do vendedor'],
  marca: ['Marca'],
  categoria: ['Categoria', 'Categoria final', 'Categoria completa', 'Categoria L1'],
  preco: ['Último preço', 'Ultimo preço'],
  catalogo: ['Catálogo', 'Catalogo'],
  loja_oficial: ['Loja oficial'],
  id_anuncio_nubimetrics: ['ID do anúncio', 'ID do anuncio'],
  sku: ['Sku', 'SKU'],
  gtin: ['Gtin', 'GTIN'],
  link: ['Link', 'URL'],
  vendas: ['Vendas em $'],
  unidades_vendidas: ['Unidades vendidas'],
  vendas_historicas: ['Vendas em $ históricas', 'Vendas em $ historicas'],
  unidades_vendidas_historicas: ['Unidades vendidas históricas', 'Unidades vendidas historicas'],
  exposicao: ['Exposição', 'Exposicao'],
  caracteristicas: ['Características', 'Caracteristicas'],
  data_criacao: ['Data de criação', 'Data de criacao']
};

const ESSENTIAL_FIELDS = ['titulo', 'vendedor', 'id_vendedor', 'marca', 'id_anuncio_nubimetrics'];
const OPTIONAL_FIELDS = Object.keys(FIELD_COLUMNS).filter(field => !ESSENTIAL_FIELDS.includes(field));

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function cleanValue(value) {
  const cleaned = String(value ?? '').trim();
  return cleaned === '' ? null : cleaned;
}

export function detectDelimiter(text) {
  const candidates = [',', ';', '\t', '|'];
  const scores = new Map(candidates.map(candidate => [candidate, 0]));
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (!quoted && (char === '\r' || char === '\n')) break;
    if (!quoted && scores.has(char)) scores.set(char, scores.get(char) + 1);
  }
  return [...scores.entries()].sort((left, right) => right[1] - left[1])[0][0];
}

export function parseCsv(text, delimiter = detectDelimiter(text)) {
  const source = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  const finishField = () => {
    row.push(field);
    field = '';
  };
  const finishRow = () => {
    finishField();
    if (row.some(value => value.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      finishField();
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV inválido: existe um campo entre aspas sem fechamento.');
  if (field !== '' || row.length > 0) finishRow();
  return rows;
}

function resolveColumns(headers) {
  const positions = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const resolved = {};
  for (const [field, candidates] of Object.entries(FIELD_COLUMNS)) {
    resolved[field] = candidates
      .map(candidate => positions.get(normalizeHeader(candidate)))
      .find(index => index !== undefined) ?? null;
  }
  return resolved;
}

function displayColumn(field) {
  return FIELD_COLUMNS[field][0];
}

export function processCsvText(text, sourceName = 'entrada.csv', sourcePath = null) {
  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text, delimiter);
  if (!rows.length) throw new Error('O CSV está vazio.');

  const rawHeaders = rows.shift();
  const headers = rawHeaders.map(header => String(header).replace(/^\uFEFF/, '').trim());
  const columns = resolveColumns(headers);
  const missingEssential = ESSENTIAL_FIELDS.filter(field => columns[field] === null);
  if (missingEssential.length) {
    throw new Error(`Colunas essenciais ausentes: ${missingEssential.map(displayColumn).join(', ')}`);
  }

  const missingOptional = OPTIONAL_FIELDS.filter(field => columns[field] === null);
  const metrics = {
    anuncios_sem_vendedor: 0,
    anuncios_sem_id: 0,
    anuncios_sem_id_vendedor: 0,
    anuncios_sem_marca: 0,
    anuncios_sem_link: 0
  };
  let invalidRows = 0;
  let rowsWithProblems = 0;

  const records = rows.map((row, rowIndex) => {
    const value = field => columns[field] === null ? null : cleanValue(row[columns[field]]);
    const record = {
      titulo: value('titulo'),
      vendedor: value('vendedor'),
      id_vendedor: value('id_vendedor'),
      marca: value('marca'),
      categoria: value('categoria'),
      preco: value('preco'),
      catalogo: value('catalogo'),
      loja_oficial: value('loja_oficial'),
      id_anuncio_nubimetrics: value('id_anuncio_nubimetrics'),
      mlb: null,
      sku: value('sku'),
      gtin: value('gtin'),
      link: value('link'),
      vendas: value('vendas'),
      unidades_vendidas: value('unidades_vendidas'),
      vendas_historicas: value('vendas_historicas'),
      unidades_vendidas_historicas: value('unidades_vendidas_historicas'),
      exposicao: value('exposicao'),
      caracteristicas: value('caracteristicas'),
      data_criacao: value('data_criacao'),
      linha_origem: rowIndex + 2,
      problemas_validacao: []
    };

    if (!record.vendedor) {
      metrics.anuncios_sem_vendedor += 1;
      record.problemas_validacao.push('vendedor_ausente');
    }
    if (!record.id_anuncio_nubimetrics) {
      metrics.anuncios_sem_id += 1;
      record.problemas_validacao.push('id_anuncio_ausente');
    }
    if (!record.id_vendedor) {
      metrics.anuncios_sem_id_vendedor += 1;
      record.problemas_validacao.push('id_vendedor_ausente');
    }
    if (!record.marca) {
      metrics.anuncios_sem_marca += 1;
      record.problemas_validacao.push('marca_ausente');
    }
    if (!record.link) {
      metrics.anuncios_sem_link += 1;
      record.problemas_validacao.push('link_ausente');
    }
    if (!record.titulo) record.problemas_validacao.push('titulo_ausente');
    if (row.length !== headers.length) record.problemas_validacao.push(`quantidade_colunas_${row.length}_esperado_${headers.length}`);

    const invalid = ESSENTIAL_FIELDS.some(field => !record[field]) || row.length !== headers.length;
    if (invalid) invalidRows += 1;
    if (record.problemas_validacao.length) rowsWithProblems += 1;
    return record;
  });

  return {
    versao_schema: '1.0',
    processado_em: new Date().toISOString(),
    arquivo_origem: {
      nome: sourceName,
      caminho: sourcePath
    },
    resumo: {
      quantidade_total_registros: rows.length,
      quantidade_processada: records.length,
      quantidade_com_erro: invalidRows,
      quantidade_com_problemas: rowsWithProblems,
      linhas_validas: rows.length - invalidRows,
      linhas_invalidas: invalidRows
    },
    validacao: {
      codificacao: 'UTF-8',
      possui_bom_utf8: String(text).charCodeAt(0) === 0xFEFF,
      delimitador: delimiter === '\t' ? 'TAB' : delimiter,
      quantidade_colunas: headers.length,
      colunas_encontradas: headers,
      colunas_essenciais_ausentes: missingEssential.map(displayColumn),
      colunas_opcionais_ausentes: missingOptional.map(displayColumn),
      ...metrics,
      observacao_mlb: 'Não resolvido nesta etapa; o ID do anúncio foi preservado em id_anuncio_nubimetrics.'
    },
    registros: records
  };
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--entrada') options.input = argv[++index];
    else if (argv[index] === '--saida') options.output = argv[++index];
    else throw new Error(`Argumento desconhecido: ${argv[index]}`);
  }
  return options;
}

function findDefaultInput() {
  const inputDir = path.join(PROJECT_DIR, 'dados', 'entrada');
  const files = fs.readdirSync(inputDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map(entry => ({
      path: path.join(inputDir, entry.name),
      modified: fs.statSync(path.join(inputDir, entry.name)).mtimeMs
    }))
    .sort((left, right) => right.modified - left.modified);
  if (!files.length) throw new Error(`Nenhum CSV encontrado em ${inputDir}. Use --entrada para informar outro arquivo.`);
  return files[0].path;
}

function printReport(result, outputPath) {
  const summary = result.resumo;
  const validation = result.validacao;
  console.log('\n=== PROCESSAMENTO CSV NUBIMETRICS ===\n');
  console.log(`Arquivo processado: ${result.arquivo_origem.nome}`);
  console.log(`Quantidade total: ${summary.quantidade_total_registros}`);
  console.log(`Quantidade processada: ${summary.quantidade_processada}`);
  console.log(`Quantidade com problemas: ${summary.quantidade_com_problemas}`);
  console.log(`Linhas válidas: ${summary.linhas_validas}`);
  console.log(`Linhas inválidas: ${summary.linhas_invalidas}`);
  console.log(`Sem vendedor: ${validation.anuncios_sem_vendedor}`);
  console.log(`Sem ID do anúncio: ${validation.anuncios_sem_id}`);
  console.log(`Sem marca: ${validation.anuncios_sem_marca}`);
  console.log(`Sem link: ${validation.anuncios_sem_link}`);
  console.log(`Colunas encontradas: ${validation.colunas_encontradas.join(', ')}`);
  console.log(`JSON gerado: ${outputPath}`);
}

export function processFile(inputPath, outputPath) {
  const absoluteInput = path.resolve(inputPath);
  const absoluteOutput = path.resolve(outputPath);
  const bytes = fs.readFileSync(absoluteInput);
  const text = bytes.toString('utf8');
  const result = processCsvText(text, path.basename(absoluteInput), absoluteInput);
  result.validacao.possui_bom_utf8 = bytes.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF]));
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  fs.writeFileSync(absoluteOutput, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  printReport(result, absoluteOutput);
  return result;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const input = options.input ? path.resolve(options.input) : findDefaultInput();
    const output = options.output
      ? path.resolve(options.output)
      : path.join(PROJECT_DIR, 'dados', 'processados', 'anuncios.json');
    processFile(input, output);
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    process.exitCode = 1;
  }
}
