(() => {
  'use strict';

  const SUPPORTED_EXTENSIONS = new Set(['csv', 'xls', 'xlsx']);

  const normalize = value =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const populated = value =>
    value !== null &&
    value !== undefined &&
    String(value).trim() !== '';

  const findColumn = (columns, predicate) =>
    columns.find(column => predicate(normalize(column))) ?? null;

  const compactHeader = value =>
    normalize(value).replace(/[^a-z0-9]/g, '');

  const findExactColumn = (columns, aliases) => {
    const normalizedAliases = new Set(
      aliases.map(compactHeader)
    );

    return columns.find(column =>
      normalizedAliases.has(compactHeader(column))
    ) ?? null;
  };

  const extensionOf = filename => {
    const match = String(filename || '')
      .trim()
      .toLowerCase()
      .match(/\.([^.]+)$/);

    return match?.[1] || '';
  };

  function detectDelimiter(text) {
    const candidates = [',', ';', '\t', '|'];
    const scores = new Map(
      candidates.map(candidate => [candidate, 0])
    );
    let quoted = false;

    for (let index = 0; index < text.length; index++) {
      const char = text[index];

      if (char === '"') {
        if (quoted && text[index + 1] === '"') {
          index++;
        } else {
          quoted = !quoted;
        }
        continue;
      }

      if (!quoted && (char === '\r' || char === '\n')) {
        break;
      }

      if (!quoted && scores.has(char)) {
        scores.set(char, scores.get(char) + 1);
      }
    }

    return [...scores.entries()]
      .sort((left, right) => right[1] - left[1])[0][0];
  }

  function parseCsv(text, delimiter = detectDelimiter(text)) {
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

      if (row.some(value => value.trim() !== '')) {
        rows.push(row);
      }

      row = [];
    };

    for (let index = 0; index < source.length; index++) {
      const char = source[index];

      if (char === '"') {
        if (quoted && source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        finishField();
      } else if (
        (char === '\n' || char === '\r') &&
        !quoted
      ) {
        if (
          char === '\r' &&
          source[index + 1] === '\n'
        ) {
          index++;
        }

        finishRow();
      } else {
        field += char;
      }
    }

    if (quoted) {
      throw new Error(
        'CSV inválido: existe um campo entre aspas sem fechamento.'
      );
    }

    if (field !== '' || row.length > 0) {
      finishRow();
    }

    return rows;
  }

  function chooseHeaderRow(matrix) {
    const keywords = [
      'titulo',
      'vendedor',
      'seller',
      'marca',
      'brand',
      'anuncio',
      'publicacao',
      'item',
      'id',
      'preco',
      'categoria',
      'link',
      'url'
    ];
    let selected = {
      index: 0,
      score: -1
    };

    for (
      let index = 0;
      index < Math.min(matrix.length, 20);
      index++
    ) {
      const values = (matrix[index] || [])
        .filter(populated)
        .map(normalize);
      const keywordMatches = values.filter(value =>
        keywords.some(keyword => value.includes(keyword))
      ).length;
      const score = values.length + keywordMatches * 5;

      if (
        values.length >= 2 &&
        score > selected.score
      ) {
        selected = {
          index,
          score
        };
      }
    }

    return selected.index;
  }

  function detectFields(columns) {
    const investigationColumn = findExactColumn(
      columns,
      ['Investiga']
    );
    const officialStoreColumn = findExactColumn(
      columns,
      ['L. Oficial']
    );

    return {
      title: investigationColumn || findColumn(
        columns,
        value => /(titulo|title|nome.*anuncio)/.test(value)
      ),
      seller: findExactColumn(columns, ['Nickname']) || findColumn(
        columns,
        value =>
          /(vendedor|seller)/.test(value) &&
          !/\bid\b/.test(value)
      ),
      sellerId: findExactColumn(columns, ['IdSeller']) || findColumn(
        columns,
        value =>
          /(id.*(vendedor|seller)|(vendedor|seller).*id)/.test(value)
      ),
      listingId: findExactColumn(columns, ['Id']) || findColumn(
        columns,
        value =>
          /(id.*(anuncio|publica|item)|(anuncio|publica|item).*id)/.test(value)
      ),
      brand: officialStoreColumn || findColumn(
        columns,
        value => /(^|\b)(marca|brand)(\b|$)/.test(value)
      ),
      link: findColumn(
        columns,
        value => /(link|url|permalink)/.test(value)
      ),
      currency: findExactColumn(columns, ['Moeda']),
      price: findExactColumn(columns, ['Preço']),
      stock: findExactColumn(columns, ['Stock']),
      exposure: findExactColumn(columns, ['Exposição']),
      officialStore: officialStoreColumn,
      condition: findExactColumn(columns, ['Condição']),
      installments: findExactColumn(columns, ['Parcelas']),
      freeShipping: findExactColumn(columns, ['Frete Grátis']),
      daysListed: findExactColumn(columns, ['Dias Anunciados'])
    };
  }

  function matrixFromCsv(buffer) {
    const text = new TextDecoder('utf-8').decode(buffer);

    return {
      matrix: parseCsv(text),
      sheetNames: ['CSV'],
      selectedSheet: 'CSV',
      cellAt: () => null
    };
  }

  function matrixFromWorkbook(buffer) {
    if (!globalThis.XLSX) {
      throw new Error(
        'A biblioteca local SheetJS não está disponível na extensão.'
      );
    }

    const workbook = globalThis.XLSX.read(
      buffer,
      {
        type: 'array',
        cellDates: true
      }
    );
    const sheetNames = [...workbook.SheetNames];
    const selectedSheet = sheetNames[0] || null;

    if (!selectedSheet) {
      throw new Error('A planilha não contém nenhuma aba.');
    }

    const sheet = workbook.Sheets[selectedSheet];
    const range = globalThis.XLSX.utils.decode_range(
      sheet['!ref'] || 'A1:A1'
    );
    const matrix = globalThis.XLSX.utils.sheet_to_json(
      sheet,
      {
        header: 1,
        defval: null,
        blankrows: false
      }
    );

    return {
      matrix,
      sheetNames,
      selectedSheet,
      cellAt: (rowIndex, columnIndex) => {
        const address = globalThis.XLSX.utils.encode_cell({
          r: range.s.r + rowIndex,
          c: range.s.c + columnIndex
        });

        return sheet[address] || null;
      }
    };
  }

  const valueAt = (row, index) =>
    index >= 0 && populated(row[index])
      ? row[index]
      : null;

  function buildRecords(source, matrix, headerRowIndex, columns, fields) {
    const columnIndexes = Object.fromEntries(
      Object.entries(fields).map(([field, column]) => [
        field,
        column ? columns.indexOf(column) : -1
      ])
    );
    const titleIndex = columnIndexes.title;

    return matrix
      .slice(headerRowIndex + 1)
      .map((row, offset) => ({
        row,
        matrixRowIndex: headerRowIndex + 1 + offset
      }))
      .filter(({ row }) => row.some(populated))
      .map(({ row, matrixRowIndex }) => {
        const titleCell = titleIndex >= 0
          ? source.cellAt(matrixRowIndex, titleIndex)
          : null;
        const hyperlink = populated(titleCell?.l?.Target)
          ? String(titleCell.l.Target).trim()
          : null;
        const explicitLink = valueAt(row, columnIndexes.link);

        return {
          title: valueAt(row, columnIndexes.title),
          listingId: valueAt(row, columnIndexes.listingId),
          sellerId: valueAt(row, columnIndexes.sellerId),
          seller: valueAt(row, columnIndexes.seller),
          brand: valueAt(row, columnIndexes.brand),
          link: hyperlink || explicitLink,
          currency: valueAt(row, columnIndexes.currency),
          price: valueAt(row, columnIndexes.price),
          stock: valueAt(row, columnIndexes.stock),
          exposure: valueAt(row, columnIndexes.exposure),
          officialStore: valueAt(row, columnIndexes.officialStore),
          condition: valueAt(row, columnIndexes.condition),
          installments: valueAt(row, columnIndexes.installments),
          freeShipping: valueAt(row, columnIndexes.freeShipping),
          daysListed: valueAt(row, columnIndexes.daysListed)
        };
      });
  }

  async function analyzeSpreadsheetFile(file, options = {}) {
    const extension = extensionOf(file.name);

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw new Error(
        `Formato não suportado para análise: ${extension || 'sem extensão'}.`
      );
    }

    const buffer =
      options.buffer instanceof ArrayBuffer
        ? options.buffer
        : await file.arrayBuffer();
    const source = extension === 'csv'
      ? matrixFromCsv(buffer)
      : matrixFromWorkbook(buffer);
    const matrix = source.matrix;

    if (!matrix.length) {
      throw new Error('A planilha não contém linhas preenchidas.');
    }

    const headerRowIndex = chooseHeaderRow(matrix);
    const columns = (matrix[headerRowIndex] || [])
      .map((value, index) =>
        populated(value)
          ? String(value).trim()
          : `COLUNA_${index + 1}`
      );
    const fields = detectFields(columns);
    const records = buildRecords(
      source,
      matrix,
      headerRowIndex,
      columns,
      fields
    );

    if (
      !fields.link &&
      fields.title &&
      records.some(record => populated(record.link))
    ) {
      fields.link = fields.title;
    }

    const warnings = [];

    if (!records.length) {
      warnings.push('Nenhum registro foi encontrado abaixo do cabeçalho.');
    }

    for (const [field, column] of Object.entries(fields)) {
      if (!column) {
        warnings.push(`Campo não identificado: ${field}.`);
      }
    }

    if (source.sheetNames.length > 1) {
      warnings.push(
        `Apenas a primeira aba foi analisada; o arquivo possui ${source.sheetNames.length} abas.`
      );
    }

    return {
      file: {
        name: file.name,
        size: file.size,
        type: file.type || null,
        extension
      },
      workbook: {
        sheetNames: source.sheetNames,
        selectedSheet: source.selectedSheet
      },
      table: {
        headerRowIndex,
        columns,
        rowCount: records.length
      },
      fields,
      records,
      warnings
    };
  }

  globalThis.SpreadsheetAnalysis = Object.freeze({
    analyzeSpreadsheetFile
  });
})();
