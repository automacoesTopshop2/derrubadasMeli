const APP_URL = 'https://app.nubimetrics.com/';

const DASHBOARD_SEARCH_SELECTOR = 'input#ex1_value';

const SEARCH_BUTTON_SELECTOR =
  'a#btn-search.buscar.spriteTools.icBuscar.no-back.no-shadow';

const EXPORT_SELECTOR =
  'a#ToolTables_publications-table_0[class="btn btn-default DTTT_button_text"]';

/*
 * Botão "Sim" do popup que aparece quando a exportação
 * ultrapassa o limite de registros.
 */
const EXPORT_CONFIRM_SELECTOR =
  'button.ngdialog-button.ngdialog-button-primary.pop-primary';

const startButton = document.getElementById('start');
const brandInput = document.getElementById('brand');
const statusBox = document.getElementById('status');
const integrationCard = document.getElementById('integration-card');
const integrationFileInput = document.getElementById('integration-file');
const pendingExportBrand = document.getElementById('pending-export-brand');
const pendingExportName = document.getElementById('pending-export-name');
const pendingExportSize = document.getElementById('pending-export-size');
const pendingExportStatus = document.getElementById('pending-export-status');
const selectedFileResult = document.getElementById('selected-file-result');
const selectedFileMessage = document.getElementById('selected-file-message');
const selectedFileName = document.getElementById('selected-file-name');
const selectedFileSize = document.getElementById('selected-file-size');
const selectedFileType = document.getElementById('selected-file-type');
const selectedFileBrand = document.getElementById('selected-file-brand');
const selectedFileExpectedName = document.getElementById('selected-file-expected-name');
const selectedFileOrigin = document.getElementById('selected-file-origin');
const selectedFileTime = document.getElementById('selected-file-time');
const directoryAccessState = document.getElementById('directory-access-state');
const directoryAccessTitle = document.getElementById('directory-access-title');
const directoryAccessMessage = document.getElementById('directory-access-message');
const authorizeDirectoryButton = document.getElementById('authorize-downloads-directory');
const automaticFileStatus = document.getElementById('automatic-file-status');
const spreadsheetAnalysisBox = document.getElementById('spreadsheet-analysis');
const spreadsheetAnalysisStatus = document.getElementById('spreadsheet-analysis-status');
const spreadsheetAnalysisDetails = document.getElementById('spreadsheet-analysis-details');
const analysisFileName = document.getElementById('analysis-file-name');
const analysisSheetName = document.getElementById('analysis-sheet-name');
const analysisRowCount = document.getElementById('analysis-row-count');
const analysisColumnCount = document.getElementById('analysis-column-count');
const analysisColumns = document.getElementById('analysis-columns');
const analysisFields = document.getElementById('analysis-fields');
const analysisWarnings = document.getElementById('analysis-warnings');

const FILE_SYSTEM_DB_NAME = 'nubimetrics-extension';
const FILE_SYSTEM_DB_VERSION = 1;
const FILE_SYSTEM_STORE_NAME = 'file-system-handles';
const DOWNLOADS_DIRECTORY_KEY = 'downloads-directory';

let running = false;
let pendingExport = null;
let pendingExportVersion = 0;
let downloadsDirectoryHandle = null;
let receivedIntegrationFileState = null;
let spreadsheetAnalysisResult = null;
let spreadsheetAnalysisVersion = 0;

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const setStatus = text => {
  statusBox.textContent = text;
};

const appendStatus = text => {
  statusBox.textContent += `\n${text}`;
};

/* =========================================================
   FILE SYSTEM ACCESS / INDEXEDDB
   ========================================================= */

function openFileSystemDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      FILE_SYSTEM_DB_NAME,
      FILE_SYSTEM_DB_VERSION
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          FILE_SYSTEM_STORE_NAME
        )
      ) {
        database.createObjectStore(
          FILE_SYSTEM_STORE_NAME
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
        new Error('Não foi possível abrir o IndexedDB.')
      );
    };
  });
}

async function saveDownloadsDirectoryHandle(handle) {
  const database = await openFileSystemDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        FILE_SYSTEM_STORE_NAME,
        'readwrite'
      );

      transaction.objectStore(
        FILE_SYSTEM_STORE_NAME
      ).put(
        handle,
        DOWNLOADS_DIRECTORY_KEY
      );

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        transaction.error ||
        new Error('Não foi possível salvar a pasta autorizada.')
      );
      transaction.onabort = () => reject(
        transaction.error ||
        new Error('O salvamento da pasta autorizada foi cancelado.')
      );
    });
  } finally {
    database.close();
  }
}

async function getStoredDownloadsDirectoryHandle() {
  const database = await openFileSystemDatabase();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        FILE_SYSTEM_STORE_NAME,
        'readonly'
      );
      const request = transaction.objectStore(
        FILE_SYSTEM_STORE_NAME
      ).get(DOWNLOADS_DIRECTORY_KEY);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(
        request.error ||
        new Error('Não foi possível recuperar a pasta autorizada.')
      );
    });
  } finally {
    database.close();
  }
}

async function deleteStoredDownloadsDirectoryHandle() {
  const database = await openFileSystemDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(
        FILE_SYSTEM_STORE_NAME,
        'readwrite'
      );

      transaction.objectStore(
        FILE_SYSTEM_STORE_NAME
      ).delete(DOWNLOADS_DIRECTORY_KEY);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        transaction.error ||
        new Error('Não foi possível remover a pasta armazenada.')
      );
      transaction.onabort = () => reject(
        transaction.error ||
        new Error('A remoção da pasta armazenada foi cancelada.')
      );
    });
  } finally {
    database.close();
  }
}

function renderDirectoryAccess(state, message, directoryName = '') {
  const states = {
    'not-configured': {
      title: 'Não configurado',
      button: 'Autorizar pasta de Downloads',
      disabled: false
    },
    prompt: {
      title: 'Autorização necessária',
      button: 'Reautorizar pasta de Downloads',
      disabled: false
    },
    granted: {
      title: 'Pasta autorizada',
      button: 'Alterar pasta autorizada',
      disabled: false
    },
    denied: {
      title: 'Acesso negado',
      button: 'Autorizar outra pasta',
      disabled: false
    },
    unsupported: {
      title: 'Recurso não suportado',
      button: 'Recurso não suportado',
      disabled: true
    },
    error: {
      title: 'Erro no acesso à pasta',
      button: 'Tentar novamente',
      disabled: false
    }
  };
  const view = states[state] || states.error;

  directoryAccessState.className =
    `directory-access-state is-${state}`;
  directoryAccessState.dataset.state = state;
  directoryAccessTitle.textContent = view.title;
  directoryAccessMessage.textContent =
    message ||
    (directoryName
      ? `Pasta selecionada: ${directoryName}`
      : 'A seleção manual continuará disponível.');
  authorizeDirectoryButton.disabled = view.disabled;
  authorizeDirectoryButton.querySelector('span').textContent = view.button;
}

function startAutomaticResolutionForPendingExport() {
  if (!pendingExport) {
    return;
  }

  const version = ++pendingExportVersion;

  void tryResolveDownloadedFile(
    pendingExport,
    version
  );
}

async function authorizeDownloadsDirectory() {
  if (!('showDirectoryPicker' in window)) {
    renderDirectoryAccess(
      'unsupported',
      'Este Chrome não disponibiliza a File System Access API. Use a seleção manual.'
    );
    return;
  }

  authorizeDirectoryButton.disabled = true;

  try {
    if (downloadsDirectoryHandle) {
      const currentPermission =
        await downloadsDirectoryHandle.queryPermission({
          mode: 'read'
        });

      if (currentPermission === 'prompt') {
        const requestedPermission =
          await downloadsDirectoryHandle.requestPermission({
            mode: 'read'
          });

        if (requestedPermission === 'granted') {
          await saveDownloadsDirectoryHandle(
            downloadsDirectoryHandle
          );
          renderDirectoryAccess(
            'granted',
            `Pasta selecionada: ${downloadsDirectoryHandle.name}`,
            downloadsDirectoryHandle.name
          );
          startAutomaticResolutionForPendingExport();
          return;
        }
      }
    }

    const handle =
      await window.showDirectoryPicker({
        id: 'nubimetrics-downloads',
        startIn: 'downloads',
        mode: 'read'
      });

    await saveDownloadsDirectoryHandle(handle);
    downloadsDirectoryHandle = handle;

    renderDirectoryAccess(
      'granted',
      `Pasta selecionada: ${handle.name}`,
      handle.name
    );
    startAutomaticResolutionForPendingExport();
  } catch (error) {
    if (error?.name === 'AbortError') {
      renderDirectoryAccess(
        downloadsDirectoryHandle ? 'prompt' : 'not-configured',
        'Autorização cancelada. A seleção manual continua disponível.'
      );
      return;
    }

    if (error?.name === 'NotAllowedError') {
      renderDirectoryAccess(
        'denied',
        'O Chrome negou o acesso à pasta. A seleção manual continua disponível.'
      );
      return;
    }

    if (error?.name === 'SecurityError') {
      renderDirectoryAccess(
        'error',
        'A autorização deve ser iniciada pelo botão desta página.'
      );
      return;
    }

    renderDirectoryAccess(
      'error',
      `Falha ao autorizar a pasta: ${error?.message || String(error)}`
    );
    console.error(
      'Falha inesperada ao autorizar a pasta de Downloads.',
      error
    );
  } finally {
    if (
      directoryAccessState.dataset.state !== 'unsupported'
    ) {
      authorizeDirectoryButton.disabled = false;
    }
  }
}

async function initializeDownloadsDirectoryAccess() {
  if (!('showDirectoryPicker' in window)) {
    renderDirectoryAccess(
      'unsupported',
      'Este Chrome não disponibiliza a File System Access API. Use a seleção manual.'
    );
    return;
  }

  try {
    const handle =
      await getStoredDownloadsDirectoryHandle();

    if (!handle) {
      renderDirectoryAccess(
        'not-configured',
        'Autorize a pasta usada pelo Chrome. A seleção manual continua disponível.'
      );
      return;
    }

    downloadsDirectoryHandle = handle;

    const permission =
      await handle.queryPermission({
        mode: 'read'
      });

    if (permission === 'granted') {
      renderDirectoryAccess(
        'granted',
        `Pasta selecionada: ${handle.name}`,
        handle.name
      );
      return;
    }

    if (permission === 'prompt') {
      renderDirectoryAccess(
        'prompt',
        `A pasta ${handle.name} precisa ser autorizada novamente.`
      );
      return;
    }

    renderDirectoryAccess(
      'denied',
      `O acesso à pasta ${handle.name} foi negado.`
    );
  } catch (error) {
    downloadsDirectoryHandle = null;

    console.error(
      'Falha ao recuperar o acesso persistido à pasta de Downloads.',
      error
    );

    await deleteStoredDownloadsDirectoryHandle()
      .catch(() => {});

    renderDirectoryAccess(
      'error',
      `Não foi possível recuperar a pasta autorizada: ${error?.message || String(error)}`
    );
  }
}

/* =========================================================
   ARQUIVO PENDENTE PARA INTEGRAÇÃO
   ========================================================= */

const formatFileSize = sizeBytes => {
  const size = Number(sizeBytes || 0);

  if (size < 1024) {
    return `${size} bytes`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const fileExtension = filename => {
  const match = String(filename || '')
    .trim()
    .toLowerCase()
    .match(/\.([^.]+)$/);

  return match?.[1] || '';
};

async function tryResolveDownloadedFile(exportState, version) {
  if (version !== pendingExportVersion) {
    return;
  }

  if (!downloadsDirectoryHandle) {
    automaticFileStatus.textContent =
      'Leitura automática indisponível. Autorize a pasta ou selecione o arquivo manualmente.';
    automaticFileStatus.className =
      'automatic-file-status is-fallback';
    return;
  }

  let permission;

  try {
    permission = await downloadsDirectoryHandle.queryPermission({
      mode: 'read'
    });
  } catch (error) {
    automaticFileStatus.textContent =
      `Não foi possível verificar a autorização: ${error?.message || String(error)} Selecione o arquivo manualmente.`;
    automaticFileStatus.className =
      'automatic-file-status is-fallback';
    return;
  }

  if (permission === 'prompt') {
    renderDirectoryAccess(
      'prompt',
      `A pasta ${downloadsDirectoryHandle.name} precisa ser autorizada novamente.`
    );
    automaticFileStatus.textContent =
      'Autorização necessária. Reautorize a pasta ou selecione o arquivo manualmente.';
    automaticFileStatus.className =
      'automatic-file-status is-fallback';
    return;
  }

  if (permission !== 'granted') {
    renderDirectoryAccess(
      'denied',
      `O acesso à pasta ${downloadsDirectoryHandle.name} foi negado.`
    );
    automaticFileStatus.textContent =
      'Acesso negado. Autorize outra pasta ou selecione o arquivo manualmente.';
    automaticFileStatus.className =
      'automatic-file-status is-fallback';
    return;
  }

  const retryDelays = [0, 300, 750, 1500, 3000];
  let lastError = null;

  automaticFileStatus.textContent =
    'Procurando automaticamente o arquivo na pasta autorizada…';
  automaticFileStatus.className =
    'automatic-file-status is-reading';

  for (
    let attempt = 0;
    attempt < retryDelays.length;
    attempt++
  ) {
    if (retryDelays[attempt] > 0) {
      await sleep(retryDelays[attempt]);
    }

    if (version !== pendingExportVersion) {
      return;
    }

    try {
      const fileHandle =
        await downloadsDirectoryHandle.getFileHandle(
          exportState.download.name,
          { create: false }
        );
      const file = await fileHandle.getFile();
      const validation = validateSelectedFile(
        file,
        exportState.download
      );

      if (!validation.valid) {
        if (attempt < retryDelays.length - 1) {
          continue;
        }

        await validateAndRenderIntegrationFile(
          file,
          'automatic',
          exportState,
          version
        );
        automaticFileStatus.textContent =
          'O arquivo localizado não corresponde ao download detectado. Selecione-o manualmente.';
        automaticFileStatus.className =
          'automatic-file-status is-fallback';
        return;
      }

      await validateAndRenderIntegrationFile(
        file,
        'automatic',
        exportState,
        version
      );

      if (version !== pendingExportVersion) {
        return;
      }

      automaticFileStatus.textContent =
        'Leitura automática concluída pela pasta autorizada.';
      automaticFileStatus.className =
        'automatic-file-status is-success';
      return;
    } catch (error) {
      lastError = error;

      if (error?.name === 'NotAllowedError') {
        renderDirectoryAccess(
          'denied',
          'O Chrome não permitiu ler a pasta autorizada.'
        );
        automaticFileStatus.textContent =
          'Acesso negado durante a leitura. Selecione o arquivo manualmente.';
        automaticFileStatus.className =
          'automatic-file-status is-fallback';
        return;
      }

      if (error?.name === 'SecurityError') {
        automaticFileStatus.textContent =
          'O Chrome bloqueou a leitura por segurança. Selecione o arquivo manualmente.';
        automaticFileStatus.className =
          'automatic-file-status is-fallback';
        return;
      }

      if (error?.name !== 'NotFoundError') {
        console.error(
          'Falha ao tentar ler automaticamente o arquivo exportado.',
          error
        );
      }
    }
  }

  if (version !== pendingExportVersion) {
    return;
  }

  automaticFileStatus.textContent =
    lastError?.name === 'NotFoundError'
      ? 'O arquivo ainda não está disponível na pasta autorizada. Selecione-o manualmente.'
      : 'A leitura automática não foi possível. Selecione o arquivo manualmente.';
  automaticFileStatus.className =
    'automatic-file-status is-fallback';
}

/* =========================================================
   ANÁLISE TÉCNICA DA PLANILHA
   ========================================================= */

function resetSpreadsheetAnalysis() {
  ++spreadsheetAnalysisVersion;
  receivedIntegrationFileState = null;
  spreadsheetAnalysisResult = null;
  spreadsheetAnalysisBox.hidden = true;
  spreadsheetAnalysisBox.classList.remove('is-error');
  spreadsheetAnalysisDetails.hidden = true;
  analysisFields.hidden = true;
  analysisWarnings.hidden = true;
  analysisFields.replaceChildren();
  analysisWarnings.replaceChildren();
}

function renderSpreadsheetAnalysisResult(result) {
  const columnLimit = 20;
  const visibleColumns = result.table.columns.slice(0, columnLimit);
  const omittedColumns =
    result.table.columns.length - visibleColumns.length;
  const fieldLabels = {
    title: 'Título',
    seller: 'Seller',
    sellerId: 'Seller ID',
    listingId: 'Listing ID',
    brand: 'Marca',
    link: 'Link',
    currency: 'Moeda',
    price: 'Preço',
    stock: 'Stock',
    exposure: 'Exposição',
    officialStore: 'Loja oficial',
    condition: 'Condição',
    installments: 'Parcelas',
    freeShipping: 'Frete Grátis',
    daysListed: 'Dias anunciados'
  };

  spreadsheetAnalysisBox.hidden = false;
  spreadsheetAnalysisBox.classList.remove('is-error');
  spreadsheetAnalysisStatus.textContent = 'Análise concluída';
  spreadsheetAnalysisDetails.hidden = false;
  analysisFileName.textContent = result.file.name;
  analysisSheetName.textContent =
    result.workbook.selectedSheet || 'Não identificada';
  analysisRowCount.textContent = String(result.table.rowCount);
  analysisColumnCount.textContent = String(result.table.columns.length);
  analysisColumns.textContent =
    visibleColumns.join(', ') +
    (omittedColumns > 0
      ? ` … (+${omittedColumns})`
      : '');

  analysisFields.replaceChildren();

  for (const [field, label] of Object.entries(fieldLabels)) {
    const item = document.createElement('div');
    const name = document.createElement('span');
    const value = document.createElement('strong');
    const column = result.fields[field];

    name.textContent = `${label}:`;
    value.textContent = column
      ? `encontrado (${column})`
      : 'não encontrado';
    value.className = column
      ? 'field-found'
      : 'field-missing';
    item.append(name, value);
    analysisFields.append(item);
  }

  analysisFields.hidden = false;
  analysisWarnings.replaceChildren();

  if (result.warnings.length) {
    const title = document.createElement('strong');
    const list = document.createElement('ul');

    title.textContent = 'Avisos';

    for (const warning of result.warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      list.append(item);
    }

    analysisWarnings.append(title, list);
    analysisWarnings.hidden = false;
  } else {
    analysisWarnings.hidden = true;
  }
}

function renderSpreadsheetAnalysisFailure(error) {
  spreadsheetAnalysisBox.hidden = false;
  spreadsheetAnalysisBox.classList.add('is-error');
  spreadsheetAnalysisStatus.textContent =
    `Não foi possível analisar a planilha: ${error?.message || String(error)}`;
  spreadsheetAnalysisDetails.hidden = true;
  analysisFields.hidden = true;
  analysisWarnings.hidden = true;
}

async function startSpreadsheetAnalysis(
  file,
  source,
  exportState,
  buffer
) {
  const version = ++spreadsheetAnalysisVersion;

  spreadsheetAnalysisBox.hidden = false;
  spreadsheetAnalysisBox.classList.remove('is-error');
  spreadsheetAnalysisStatus.textContent = 'Analisando planilha…';
  spreadsheetAnalysisDetails.hidden = true;
  analysisFields.hidden = true;
  analysisWarnings.hidden = true;

  try {
    if (!globalThis.SpreadsheetAnalysis) {
      throw new Error(
        'O módulo local de análise não foi carregado.'
      );
    }

    const result =
      await globalThis.SpreadsheetAnalysis.analyzeSpreadsheetFile(
        file,
        { buffer }
      );

    if (
      version !== spreadsheetAnalysisVersion ||
      receivedIntegrationFileState?.file !== file
    ) {
      return;
    }

    spreadsheetAnalysisResult = result;
    renderSpreadsheetAnalysisResult(result);
  } catch (error) {
    if (version !== spreadsheetAnalysisVersion) {
      return;
    }

    spreadsheetAnalysisResult = null;
    console.error(
      'Falha na análise técnica da planilha.',
      error
    );
    renderSpreadsheetAnalysisFailure(error);
  }
}

function setPendingExport(brand, download) {
  const version = ++pendingExportVersion;

  pendingExport = {
    brand,
    download: {
      ...download
    }
  };

  resetSpreadsheetAnalysis();

  integrationFileInput.value = '';
  selectedFileResult.hidden = true;
  selectedFileResult.classList.remove('is-error');

  pendingExportBrand.textContent = `Marca: ${brand}`;
  pendingExportName.textContent = `Arquivo detectado: ${download.name}`;
  pendingExportSize.textContent = `Tamanho: ${formatFileSize(download.sizeBytes)}`;
  pendingExportStatus.textContent = 'Arquivo para integração: PENDENTE';

  automaticFileStatus.textContent =
    'Aguardando tentativa de leitura automática.';
  automaticFileStatus.className =
    'automatic-file-status is-reading';

  integrationCard.hidden = false;

  void tryResolveDownloadedFile(
    pendingExport,
    version
  );
}

function validateSelectedFile(file, expectedDownload) {
  const errors = [];
  const warnings = [];
  const selectedExtension = fileExtension(file.name);
  const expectedExtension = String(
    expectedDownload.extension || fileExtension(expectedDownload.name)
  ).toLowerCase();
  const validExtensions = new Set(['csv', 'xls', 'xlsx']);

  if (file.size <= 0) {
    errors.push('O arquivo selecionado está vazio.');
  }

  if (!validExtensions.has(selectedExtension)) {
    errors.push('O formato deve ser CSV, XLS ou XLSX.');
  }

  if (
    file.name.localeCompare(expectedDownload.name, undefined, {
      sensitivity: 'accent'
    }) !== 0
  ) {
    errors.push('O nome não corresponde ao arquivo detectado no download.');
  }

  if (
    expectedExtension &&
    selectedExtension !== expectedExtension
  ) {
    errors.push('A extensão não corresponde ao arquivo detectado no download.');
  }

  if (
    Number(expectedDownload.sizeBytes) > 0 &&
    file.size !== Number(expectedDownload.sizeBytes)
  ) {
    errors.push('O tamanho não corresponde ao arquivo detectado no download.');
  }

  const startedAt = Date.parse(expectedDownload.startedAt || '');
  const completedAt = Date.parse(expectedDownload.completedAt || '');

  if (
    Number.isFinite(startedAt) &&
    Number.isFinite(completedAt) &&
    Number(file.lastModified) > 0 &&
    (
      file.lastModified < startedAt - 5000 ||
      file.lastModified > completedAt + 60000
    )
  ) {
    warnings.push(
      'O horário do arquivo difere da janela observada no download.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    extension: selectedExtension
  };
}

function renderSelectedFile(
  file,
  validation,
  source,
  byteLength = null,
  exportState = pendingExport
) {
  selectedFileResult.hidden = false;
  selectedFileResult.classList.toggle('is-error', !validation.valid);

  selectedFileMessage.textContent = validation.valid
    ? 'Arquivo recebido pela extensão.'
    : `Arquivo não aceito: ${validation.errors.join(' ')}`;

  if (validation.valid) {
    selectedFileMessage.textContent = source === 'automatic'
      ? 'Arquivo recebido automaticamente da pasta autorizada.'
      : 'Arquivo recebido por seleção manual.';
  }

  pendingExportStatus.textContent = validation.valid
    ? 'Arquivo para integração: RECEBIDO'
    : 'Arquivo para integração: PENDENTE';

  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = formatFileSize(file.size);
  selectedFileType.textContent = file.type || validation.extension.toUpperCase();
  selectedFileBrand.textContent = exportState.brand;
  selectedFileExpectedName.textContent = exportState.download.name;
  selectedFileOrigin.textContent = source === 'automatic'
    ? 'Pasta de Downloads autorizada'
    : 'Seleção manual';
  selectedFileTime.textContent = validation.warnings.length
    ? validation.warnings.join(' ')
    : `Última modificação: ${new Date(file.lastModified).toLocaleString('pt-BR')}`;

  if (
    validation.valid &&
    byteLength !== null
  ) {
    selectedFileSize.textContent =
      `${formatFileSize(file.size)} (${byteLength} bytes lidos)`;
  }
}

async function validateAndRenderIntegrationFile(
  file,
  source,
  exportState = pendingExport,
  version = null
) {
  const validation = validateSelectedFile(
    file,
    exportState.download
  );
  let byteLength = null;
  let analysisBuffer = null;

  if (validation.valid) {
    const bytes = await file.arrayBuffer();
    analysisBuffer = bytes;
    byteLength = bytes.byteLength;

    if (byteLength !== file.size) {
      validation.valid = false;
      validation.errors.push(
        'A quantidade de bytes lidos não corresponde ao tamanho do arquivo.'
      );
    }
  }

  if (
    version !== null &&
    version !== pendingExportVersion
  ) {
    return null;
  }

  renderSelectedFile(
    file,
    validation,
    source,
    byteLength,
    exportState
  );

  if (validation.valid) {
    receivedIntegrationFileState = {
      file,
      source,
      brand: exportState.brand,
      download: {
        ...exportState.download
      },
      receivedAt: new Date().toISOString()
    };

    void startSpreadsheetAnalysis(
      file,
      source,
      exportState,
      analysisBuffer
    );
  }

  return validation;
}

async function handleFileSelected(event) {
  const file = event.target.files?.[0];

  if (!file || !pendingExport) {
    return;
  }

  ++pendingExportVersion;
  resetSpreadsheetAnalysis();

  try {
    await validateAndRenderIntegrationFile(
      file,
      'manual'
    );
  } catch (error) {
    console.error(
      'Não foi possível ler o arquivo selecionado manualmente.',
      error
    );
    selectedFileResult.hidden = false;
    selectedFileResult.classList.add('is-error');
    selectedFileMessage.textContent =
      'Não foi possível ler o arquivo selecionado. Tente novamente.';
    pendingExportStatus.textContent =
      'Arquivo para integração: PENDENTE';
  }
}

integrationFileInput.addEventListener(
  'change',
  handleFileSelected
);

authorizeDirectoryButton.addEventListener(
  'click',
  authorizeDownloadsDirectory
);

void initializeDownloadsDirectoryAccess();

/* =========================================================
   EXECUÇÃO SEGURA NO TAB
   ========================================================= */

async function execute(
  tabId,
  func,
  args = [],
  retries = 10
) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const tab = await chrome.tabs.get(tabId);

      if (!tab) {
        throw new Error(
          'A aba do Nubimetrics não existe mais.'
        );
      }

      if (
        tab.status !== 'complete' ||
        !tab.url ||
        tab.url === 'about:blank'
      ) {
        await sleep(500);
        continue;
      }

      const results =
        await chrome.scripting.executeScript({
          target: {
            tabId,
            frameIds: [0]
          },
          func,
          args
        });

      return results[0]?.result;
    } catch (error) {
      lastError = error;

      const message =
        String(
          error?.message || error
        ).toLowerCase();

      const frameWasRemoved =
        message.includes('frame with id') &&
        message.includes('removed');

      const receivingEndMissing =
        message.includes(
          'receiving end does not exist'
        );

      const executionContext =
        message.includes(
          'execution context was destroyed'
        );

      const tabClosed =
        message.includes(
          'no tab with id'
        );

      if (tabClosed) {
        throw error;
      }

      if (
        frameWasRemoved ||
        receivingEndMissing ||
        executionContext
      ) {
        await sleep(800);
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError ||
    new Error(
      'Não foi possível executar a ação na página do Nubimetrics.'
    )
  );
}

/* =========================================================
   ESPERA DA ABA
   ========================================================= */

async function waitForTab(
  tabId,
  timeout = 60000
) {
  const deadline =
    Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const tab =
        await chrome.tabs.get(tabId);

      if (
        tab.status === 'complete' &&
        tab.url &&
        tab.url !== 'about:blank'
      ) {
        return tab;
      }
    } catch {}

    await sleep(400);
  }

  throw new Error(
    'A página não terminou de carregar dentro do prazo.'
  );
}

/* =========================================================
   LOCALIZA A ABA DO NUBIMETRICS
   ========================================================= */

async function obtainNubimetricsTab() {
  const existing =
    (
      await chrome.tabs.query({
        url: 'https://app.nubimetrics.com/*'
      })
    ).sort(
      (left, right) =>
        (right.lastAccessed || 0) -
        (left.lastAccessed || 0)
    );

  if (existing.length) {
    let selected = null;
    let authenticatedFallback = null;

    for (const candidate of existing) {
      try {
        const loaded =
          await waitForTab(candidate.id);

        const state =
          await execute(
            loaded.id,
            inspectPage,
            [DASHBOARD_SEARCH_SELECTOR]
          );

        if (
          !state.login &&
          !state.otp &&
          !state.challenge &&
          !authenticatedFallback
        ) {
          authenticatedFallback =
            loaded;
        }

        if (
          !state.login &&
          !state.otp &&
          !state.challenge &&
          state.searchVisible
        ) {
          selected = loaded;
          break;
        }
      } catch {}
    }

    selected =
      selected ||
      authenticatedFallback ||
      existing.find(tab => tab.active) ||
      existing[0];

    await chrome.tabs.update(
      selected.id,
      {
        active: true
      }
    );

    await chrome.windows.update(
      selected.windowId,
      {
        focused: true
      }
    );

    return waitForTab(
      selected.id
    );
  }

  const created =
    await chrome.tabs.create({
      url: APP_URL,
      active: true
    });

  return waitForTab(
    created.id
  );
}

/* =========================================================
   AUTENTICAÇÃO
   ========================================================= */

async function waitForAuthentication(
  tabId
) {
  let waitingForHuman = false;

  const deadline =
    Date.now() + 600000;

  while (Date.now() < deadline) {
    let state;

    try {
      state =
        await execute(
          tabId,
          inspectPage,
          [DASHBOARD_SEARCH_SELECTOR]
        );
    } catch {
      await sleep(1000);
      continue;
    }

    if (
      state.login ||
      state.otp ||
      state.challenge
    ) {
      if (!waitingForHuman) {
        appendStatus(
          'Autenticação necessária. Conclua login, reCAPTCHA e OTP manualmente na aba do Nubimetrics.'
        );

        appendStatus(
          'A extensão aguardará e continuará automaticamente após a autenticação.'
        );

        waitingForHuman = true;
      }

      await sleep(1000);
      continue;
    }

    if (waitingForHuman) {
      appendStatus(
        'Autenticação concluída. Continuando o teste…'
      );
    }

    return state;
  }

  throw new Error(
    'A autenticação manual não foi concluída dentro de 10 minutos.'
  );
}

/* =========================================================
   INSPEÇÃO DA PÁGINA
   ========================================================= */

function inspectPage(
  searchSelector
) {
  const visible = element =>
    Boolean(
      element &&
      element.getClientRects().length &&
      getComputedStyle(element).visibility !==
        'hidden'
    );

  const text =
    document.body?.innerText || '';

  const input =
    document.querySelector(
      searchSelector
    );

  const countMatches = [
    ...text.matchAll(
      /(?:\bde\s+|\btotal(?:\s+de)?\s+)?([\d.]+)\s+resultados?/gi
    )
  ];

  const count =
    countMatches.length
      ? Number(
          countMatches
            .at(-1)[1]
            .replace(/\./g, '')
        )
      : null;

  return {
    url:
      location.href,

    path:
      location.pathname,

    login:
      visible(
        document.querySelector('#email')
      ) ||
      /\/account\/login/i.test(
        location.pathname
      ),

    otp:
      visible(
        document.querySelector('#otp-0')
      ) ||
      /\/account\/verify/i.test(
        location.pathname
      ),

    challenge:
      /recaptcha|não conseguiu confirmar que você é uma pessoa|captcha/i.test(
        text
      ),

    dashboardVisible:
      visible(input),

    searchVisible:
      visible(input),

    interfaceCount:
      Number.isFinite(count)
        ? count
        : null
  };
}

/* =========================================================
   ESPERA PELO DASHBOARD
   ========================================================= */

async function waitForDashboard(
  tabId,
  timeout = 60000
) {
  const deadline =
    Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const tab =
        await chrome.tabs.get(
          tabId
        );

      if (
        tab.status === 'complete'
      ) {
        const state =
          await execute(
            tabId,
            inspectPage,
            [DASHBOARD_SEARCH_SELECTOR]
          );

        if (
          state.searchVisible
        ) {
          return state;
        }
      }
    } catch {}

    await sleep(500);
  }

  throw new Error(
    'O campo de pesquisa #ex1_value não ficou visível dentro de 60 segundos.'
  );
}

/* =========================================================
   PESQUISA DA MARCA
   ========================================================= */

function submitBrand(
  searchSelector,
  brand,
  searchButtonSelector
) {
  const input =
    document.querySelector(
      searchSelector
    );

  if (!input) {
    throw new Error(
      'Campo de pesquisa #ex1_value não encontrado.'
    );
  }

  const button =
    document.querySelector(
      searchButtonSelector
    );

  if (!button) {
    throw new Error(
      'Botão de pesquisa #btn-search não encontrado.'
    );
  }

  const setter =
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;

  if (!setter) {
    throw new Error(
      'Não foi possível acessar o setter do campo de pesquisa.'
    );
  }

  input.focus();

  setter.call(
    input,
    brand
  );

  input.dispatchEvent(
    new InputEvent(
      'input',
      {
        bubbles: true,
        inputType: 'insertText',
        data: brand
      }
    )
  );

  input.dispatchEvent(
    new Event(
      'change',
      {
        bubbles: true
      }
    )
  );

  button.scrollIntoView({
    block: 'center',
    inline: 'center'
  });

  button.click();

  return {
    value:
      input.value,

    clicked:
      true
  };
}

/* =========================================================
   ESPERA A RECONSTRUÇÃO DA PÁGINA
   ========================================================= */

async function waitForSearchNavigation(
  tabId,
  timeout = 30000
) {
  const deadline =
    Date.now() + timeout;

  let lastUrl = '';

  try {
    const initialTab =
      await chrome.tabs.get(
        tabId
      );

    lastUrl =
      initialTab.url || '';
  } catch {}

  while (
    Date.now() < deadline
  ) {
    try {
      const tab =
        await chrome.tabs.get(
          tabId
        );

      const currentUrl =
        tab.url || '';

      if (
        currentUrl &&
        currentUrl !== lastUrl &&
        currentUrl.includes(
          'app.nubimetrics.com'
        )
      ) {
        await sleep(1500);
        return;
      }

      if (
        tab.status === 'complete'
      ) {
        await sleep(1500);
        return;
      }
    } catch {}

    await sleep(500);
  }

  await sleep(1500);
}

/* =========================================================
   DIAGNÓSTICO DOS RESULTADOS
   ========================================================= */

function collectResultDiagnostics(
  searchSelector,
  exportSelector
) {
  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const text =
    document.body?.innerText || '';

  const countTexts =
    text
      .split(/\r?\n/)
      .map(clean)
      .filter(
        line =>
          /resultados?|anúncios?/i.test(
            line
          )
      )
      .slice(0, 20);

  const countMatches = [
    ...text.matchAll(
      /(?:\bde\s+|\btotal(?:\s+de)?\s+)?([\d.,]+)\s+(?:resultados?|anúncios?)/gi
    )
  ];

  const count =
    countMatches.length
      ? Number(
          countMatches
            .at(-1)[1]
            .replace(/[.,]/g, '')
        )
      : null;

  const headers = [
    ...document.querySelectorAll(
      'table thead th,[role="columnheader"]'
    )
  ]
    .map(
      element =>
        clean(
          element.innerText ||
          element.textContent
        )
    )
    .filter(Boolean);

  const rowCandidates = [
    ...document.querySelectorAll(
      'table tbody tr,[role="row"],.MuiTableRow-root'
    )
  ]
    .map(
      element =>
        clean(
          element.innerText ||
          element.textContent
        )
    )
    .filter(
      value =>
        value &&
        !headers.includes(value)
    );

  const fallbackItems =
    text
      .split(/\r?\n/)
      .map(clean)
      .filter(
        line =>
          /\bML[AB]\d{6,}\b/i.test(
            line
          ) ||
          /^MLB\d+/i.test(line)
      );

  const input =
    document.querySelector(
      searchSelector
    );

  const exportButton =
    document.querySelector(
      exportSelector
    );

  return {
    url:
      location.href,

    title:
      document.title,

    searchedValue:
      input?.value?.trim() || '',

    interfaceCount:
      Number.isFinite(count)
        ? count
        : null,

    countTexts,

    headers: [
      ...new Set(headers)
    ],

    firstItems: [
      ...new Set([
        ...rowCandidates,
        ...fallbackItems
      ])
    ].slice(0, 10),

    exportReady:
      Boolean(
        exportButton &&
        exportButton.getClientRects().length
      )
  };
}

/* =========================================================
   ESPERA PELOS RESULTADOS
   ========================================================= */

async function waitForResults(
  tabId,
  timeout = 120000
) {
  const deadline =
    Date.now() + timeout;

  let lastError = null;

  while (
    Date.now() < deadline
  ) {
    try {
      const details =
        await execute(
          tabId,
          collectResultDiagnostics,
          [
            DASHBOARD_SEARCH_SELECTOR,
            EXPORT_SELECTOR
          ]
        );

      const hasResultsPage =
        details.exportReady ||
        details.headers.length > 0 ||
        details.firstItems.length > 0 ||
        /Anúncios|resultados/i.test(
          details.countTexts.join(' ')
        );

      if (
        hasResultsPage
      ) {
        return details;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(1000);
  }

  throw new Error(
    `Os resultados não ficaram prontos dentro de 120 segundos.${
      lastError
        ? ` Último erro: ${
            lastError.message ||
            lastError
          }`
        : ''
    }`
  );
}

/* =========================================================
   INSPEÇÃO DO EXPORTAR + POPUP
   ========================================================= */

function inspectExportControl(
  exportSelector,
  confirmSelector
) {
  const visible = element =>
    Boolean(
      element &&
      element.getClientRects().length &&
      getComputedStyle(element).visibility !==
        'hidden'
    );

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const button =
    document.querySelector(
      exportSelector
    );

  const exportLabel =
    clean(
      button
        ?.querySelector('span')
        ?.textContent
    );

  /*
   * Procura o botão "Sim" do popup de limite.
   */
  const confirmButtons = [
    ...document.querySelectorAll(
      confirmSelector
    )
  ];

  const confirmButton =
    confirmButtons.find(
      element =>
        visible(element) &&
        clean(
          element.innerText ||
          element.textContent
        ).toLowerCase() === 'sim'
    ) || null;

  const surfaces = [
    ...document.querySelectorAll(
      [
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[role="alert"]',
        '[role="menu"]',
        '.MuiDialog-root',
        '.MuiModal-root',
        '.MuiSnackbar-root',
        '.MuiPopover-root',
        '.ngdialog'
      ].join(',')
    )
  ]
    .filter(visible)
    .map(element => ({
      role:
        element.getAttribute(
          'role'
        ) || null,

      tag:
        element.tagName.toLowerCase(),

      text:
        clean(
          element.innerText ||
          element.textContent
        ).slice(0, 4000)
    }))
    .filter(
      surface =>
        surface.text
    );

  return {
    button:
      button
        ? {
            found:
              exportLabel ===
              'Exportar',

            visible:
              visible(button),

            disabled:
              Boolean(
                button.disabled ||
                button.getAttribute(
                  'aria-disabled'
                ) === 'true'
              ),

            text:
              clean(
                button.innerText ||
                button.textContent
              ),

            ariaLabel:
              button.getAttribute(
                'aria-label'
              ) || null
          }
        : {
            found: false
          },

    confirmation:
      confirmButton
        ? {
            found: true,

            visible:
              visible(
                confirmButton
              ),

            text:
              clean(
                confirmButton.innerText ||
                confirmButton.textContent
              ),

            className:
              confirmButton.className || null
          }
        : {
            found: false
          },

    surfaces
  };
}

/* =========================================================
   CLIQUE NO EXPORTAR
   ========================================================= */

function clickExportButton(
  exportSelector
) {
  const button =
    document.querySelector(
      exportSelector
    );

  if (
    !button ||
    !button.getClientRects().length
  ) {
    return {
      clicked: false,
      reason:
        'not-visible'
    };
  }

  const label =
    String(
      button
        .querySelector('span')
        ?.textContent || ''
    ).trim();

  if (
    label !== 'Exportar'
  ) {
    return {
      clicked: false,
      reason:
        `unexpected-label:${label}`
    };
  }

  if (
    button.disabled ||
    button.getAttribute(
      'aria-disabled'
    ) === 'true'
  ) {
    return {
      clicked: false,
      reason:
        'disabled'
    };
  }

  button.scrollIntoView({
    block: 'center',
    inline: 'center'
  });

  button.click();

  button.dispatchEvent(
    new MouseEvent(
      'mousedown',
      {
        bubbles: true,
        cancelable: true,
        view: window
      }
    )
  );

  button.dispatchEvent(
    new MouseEvent(
      'mouseup',
      {
        bubbles: true,
        cancelable: true,
        view: window
      }
    )
  );

  return {
    clicked:
      true,

    label
  };
}

/* =========================================================
   CLIQUE NO "SIM" DO POPUP
   ========================================================= */

function clickExportConfirmation(
  confirmSelector
) {
  const buttons = [
    ...document.querySelectorAll(
      confirmSelector
    )
  ];

  const clean = value =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const visible = element =>
    Boolean(
      element &&
      element.getClientRects().length &&
      getComputedStyle(element).visibility !==
        'hidden'
    );

  const button =
    buttons.find(
      element =>
        visible(element) &&
        clean(
          element.innerText ||
          element.textContent
        ).toLowerCase() === 'sim'
    ) || null;

  if (!button) {
    return {
      clicked: false,
      reason:
        'confirmation-not-found'
    };
  }

  if (
    button.disabled ||
    button.getAttribute(
      'aria-disabled'
    ) === 'true'
  ) {
    return {
      clicked: false,
      reason:
        'confirmation-disabled'
    };
  }

  button.scrollIntoView({
    block: 'center',
    inline: 'center'
  });

  /*
   * Primeiro click normal.
   */
  button.click();

  /*
   * Eventos extras para compatibilidade
   * com a implementação Angular/ngDialog.
   */
  button.dispatchEvent(
    new MouseEvent(
      'mousedown',
      {
        bubbles: true,
        cancelable: true,
        view: window
      }
    )
  );

  button.dispatchEvent(
    new MouseEvent(
      'mouseup',
      {
        bubbles: true,
        cancelable: true,
        view: window
      }
    )
  );

  return {
    clicked: true,

    text:
      clean(
        button.innerText ||
        button.textContent
      )
  };
}

/* =========================================================
   DOWNLOADS EXISTENTES
   ========================================================= */

async function getDownloadSnapshot() {
  const downloads =
    await chrome.downloads.search({
      orderBy: ['-startTime'],
      limit: 100
    });

  return downloads.map(
    item => ({
      id:
        item.id,

      filename:
        item.filename || '',

      startTime:
        item.startTime || null,

      endTime:
        item.endTime || null,

      state:
        item.state,

      fileSize:
        Number(
          item.fileSize ||
          item.totalBytes ||
          0
        ),

      totalBytes:
        Number(
          item.totalBytes || 0
        )
    })
  );
}

/* =========================================================
   ESPERA PELO DOWNLOAD / POPUP
   ========================================================= */

async function waitForExportOutcome(
  tabId,
  knownDownloads,
  baselineSurfaceTexts,
  clickedAt,
  timeout = 120000
) {
  const deadline =
    Date.now() + timeout;

  const knownById =
    new Map(
      knownDownloads.map(
        item => [
          item.id,
          item
        ]
      )
    );

  let lastDownloadState = null;

  /*
   * Evita clicar no "Sim" mais de uma vez.
   */
  let confirmationHandled = false;

  while (
    Date.now() < deadline
  ) {
    /* =====================================================
       1. VERIFICA DOWNLOADS
       ===================================================== */

    let downloads = [];

    try {
      downloads =
        await getDownloadSnapshot();
    } catch {
      downloads = [];
    }

    const exportCandidates =
      downloads.filter(
        item => {
          const filename =
            String(
              item.filename || ''
            ).toLowerCase();

          if (
            !/\.(?:csv|xlsx|xls)$/.test(filename)
          ) {
            return false;
          }

          const startedAt =
            Date.parse(
              item.startTime || ''
            );

          const startedAfterClick =
            Number.isFinite(
              startedAt
            ) &&
            startedAt >=
              clickedAt - 3000;

          const wasKnown =
            knownById.has(
              item.id
            );

          const previous =
            knownById.get(
              item.id
            );

          const stateChanged =
            wasKnown &&
            previous &&
            previous.state !==
              item.state;

          const sizeChanged =
            wasKnown &&
            previous &&
            previous.fileSize !==
              item.fileSize;

          return (
            startedAfterClick ||
            stateChanged ||
            sizeChanged
          );
        }
      );

    const completedExport =
      exportCandidates.find(
        item =>
          item.state ===
            'complete' &&
          Number(
            item.fileSize ||
            item.totalBytes ||
            0
          ) > 0
      );

    if (
      completedExport
    ) {
      return {
        type:
          'download',

        download:
          completedExport
      };
    }

    if (
      exportCandidates.length
    ) {
      lastDownloadState =
        exportCandidates.map(
          item => ({
            id:
              item.id,

            filename:
              item.filename,

            state:
              item.state,

            fileSize:
              item.fileSize,

            startTime:
              item.startTime,

            endTime:
              item.endTime
          })
        );
    }

    /* =====================================================
       2. VERIFICA POPUP / INTERFACE
       ===================================================== */

    let state = null;

    try {
      state =
        await execute(
          tabId,
          inspectExportControl,
          [
            EXPORT_SELECTOR,
            EXPORT_CONFIRM_SELECTOR
          ]
        );
    } catch {
      await sleep(700);
      continue;
    }

    /* =====================================================
       3. DETECTA O POPUP DE LIMITE
       ===================================================== */

    if (
      !confirmationHandled &&
      state.confirmation?.found &&
      state.confirmation?.visible
    ) {
      /*
       * Encontramos exatamente o botão "Sim".
       * O fluxo continua automaticamente.
       */
      const confirmation =
        await execute(
          tabId,
          clickExportConfirmation,
          [EXPORT_CONFIRM_SELECTOR]
        );

      if (
        confirmation?.clicked
      ) {
        confirmationHandled = true;

        appendStatus(
          'Popup de limite detectado. Botão “Sim” clicado. Aguardando o arquivo de exportação dos primeiros 3800 itens…'
        );

        await sleep(1000);

        continue;
      }
    }

    /* =====================================================
       4. VERIFICA OUTRAS SUPERFÍCIES
       ===================================================== */

    const newSurfaces =
      state.surfaces.filter(
        surface =>
          !baselineSurfaceTexts.has(
            surface.text
          )
      );

    /*
     * Se existe uma interface nova, mas NÃO é o popup
     * tratado acima, interrompemos para diagnóstico.
     */
    if (
      newSurfaces.length &&
      !confirmationHandled
    ) {
      return {
        type:
          'ui-interruption',

        surfaces:
          newSurfaces
      };
    }

    await sleep(500);
  }

  /* =======================================================
     TIMEOUT COM DIAGNÓSTICO
     ======================================================= */

  const diagnosticMessage =
    lastDownloadState
      ? ` Downloads de exportação detectados durante a espera: ${JSON.stringify(
          lastDownloadState
        )}`
      : ' Nenhum arquivo de exportação novo foi detectado pelo Chrome durante a espera.';

  throw new Error(
    'Nenhum arquivo de exportação novo foi concluído, nem foi possível concluir a confirmação da exportação dentro de 120 segundos após clicar em Exportar.' +
      diagnosticMessage
  );
}

/* =========================================================
   DIAGNÓSTICO DO DOWNLOAD
   ========================================================= */

function downloadDiagnostic(
  item
) {
  const filename =
    item.filename || '';

  const basename =
    filename.split(
      /[\\\/]/
    ).pop() ||
    filename;

  const lastDot =
    basename.lastIndexOf('.');

  return {
    id:
      item.id,

    name:
      basename,

    path:
      filename,

    sizeBytes:
      Number(
        item.fileSize ||
        item.totalBytes ||
        0
      ),

    extension:
      lastDot > 0
        ? basename
            .slice(
              lastDot + 1
            )
            .toLowerCase()
        : '',

    startedAt:
      item.startTime ||
      null,

    completedAt:
      item.endTime ||
      null,

    state:
      item.state,

    exists:
      item.exists !== false
  };
}

/* =========================================================
   SALVA DIAGNÓSTICO DE SUCESSO
   ========================================================= */

async function saveExportResult(
  result
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const dataUrl =
    `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(
        result,
        null,
        2
      )
    )}`;

  await chrome.downloads.download({
    url:
      dataUrl,

    filename:
      `nubimetrics-test/nubimetrics-export-result-${timestamp}.json`,

    conflictAction:
      'uniquify',

    saveAs:
      false
  });
}

/* =========================================================
   SALVA DIAGNÓSTICO DE FALHA
   ========================================================= */

async function saveFailureResult(
  message,
  diagnostics = []
) {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const dataUrl =
    `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(
        {
          status:
            'error',

          message,

          diagnostics,

          observedAt:
            new Date().toISOString()
        },
        null,
        2
      )
    )}`;

  await chrome.downloads.download({
    url:
      dataUrl,

    filename:
      `nubimetrics-test/nubimetrics-test-failure-${timestamp}.json`,

    conflictAction:
      'uniquify',

    saveAs:
      false
  });
}

/* =========================================================
   FLUXO PRINCIPAL
   ========================================================= */

async function runTest(
  brand
) {
  setStatus(
    'Abrindo o Nubimetrics no perfil autenticado…'
  );

  let tab =
    await obtainNubimetricsTab();

  const authenticated =
    await waitForAuthentication(
      tab.id
    );

  appendStatus(
    `Página autenticada confirmada em ${
      authenticated.path ||
      '/'
    }; abrindo o Dashboard…`
  );

  /*
   * Abrimos o Dashboard.
   */

  tab =
    await chrome.tabs.update(
      tab.id,
      {
        url:
          APP_URL,

        active:
          true
      }
    );

  await chrome.windows.update(
    tab.windowId,
    {
      focused:
        true
    }
  );

  const dashboardState =
    await waitForDashboard(
      tab.id
    );

  appendStatus(
    `Dashboard confirmado em ${
      dashboardState.path ||
      '/'
    }; campo #ex1_value visível.`
  );

  /* =====================================================
     PESQUISA
     ===================================================== */

  appendStatus(
    `Pesquisando: ${brand}`
  );

  const submitted =
    await execute(
      tab.id,
      submitBrand,
      [
        DASHBOARD_SEARCH_SELECTOR,
        brand,
        SEARCH_BUTTON_SELECTOR
      ]
    );

  if (
    !submitted?.clicked ||
    submitted.value !==
      brand
  ) {
    throw new Error(
      'Não foi possível preencher a marca e clicar em Pesquisar.'
    );
  }

  appendStatus(
    'Botão #btn-search clicado. Aguardando o Nubimetrics reconstruir a página…'
  );

  await waitForSearchNavigation(
    tab.id
  );

  appendStatus(
    'Página de pesquisa estabilizada. Aguardando os resultados…'
  );

  /* =====================================================
     RESULTADOS
     ===================================================== */

  const result =
    await waitForResults(
      tab.id
    );

  result.brand =
    brand;

  result.resultsConfirmedAt =
    new Date()
      .toISOString();

  appendStatus(
    `Resultados confirmados na interface: ${
      result.interfaceCount ??
      'não identificado'
    }. Localizando “Exportar”…`
  );

  /* =====================================================
     EXPORTAR
     ===================================================== */

  const exportState =
    await execute(
      tab.id,
      inspectExportControl,
      [
        EXPORT_SELECTOR,
        EXPORT_CONFIRM_SELECTOR
      ]
    );

  if (
    !exportState.button.found ||
    !exportState.button.visible
  ) {
    const error =
      new Error(
        'O botão #ToolTables_publications-table_0 não foi encontrado ou não está visível.'
      );

    error.diagnostics = {
      exportState,

      results:
        result
    };

    throw error;
  }

  if (
    exportState.button.disabled
  ) {
    const error =
      new Error(
        'O botão #ToolTables_publications-table_0 está desabilitado.'
      );

    error.diagnostics = {
      exportState,

      results:
        result
    };

    throw error;
  }

  /* =====================================================
     REGISTRA DOWNLOADS ANTES DO CLIQUE
     ===================================================== */

  const knownDownloads =
    await getDownloadSnapshot();

  const baselineSurfaceTexts =
    new Set(
      exportState.surfaces.map(
        surface =>
          surface.text
      )
    );

  const clickedAt =
    Date.now();

  /* =====================================================
     CLIQUE
     ===================================================== */

  const exportClick =
    await execute(
      tab.id,
      clickExportButton,
      [EXPORT_SELECTOR]
    );

  if (
    !exportClick?.clicked
  ) {
    throw new Error(
      `Não foi possível clicar em Exportar: ${
        exportClick?.reason ||
        'motivo não informado'
      }.`
    );
  }

  appendStatus(
    'Botão “Exportar” clicado; verificando limite de exportação e aguardando o arquivo…'
  );

  /* =====================================================
     AGUARDA POPUP / DOWNLOAD
     ===================================================== */

  const outcome =
    await waitForExportOutcome(
      tab.id,
      knownDownloads,
      baselineSurfaceTexts,
      clickedAt
    );

  /* =====================================================
     DIAGNÓSTICO
     ===================================================== */

  const exportDiagnostic = {
    status:
      outcome.type ===
      'download'
        ? 'success'
        : 'ui_interruption',

    brand,

    url:
      result.url,

    title:
      result.title,

    interfaceCount:
      result.interfaceCount,

    countTexts:
      result.countTexts,

    exportButton:
      exportState.button,

    clickedAt:
      new Date(
        clickedAt
      ).toISOString(),

    observedAt:
      new Date()
        .toISOString(),

    download:
      outcome.type ===
      'download'
        ? downloadDiagnostic(
            outcome.download
          )
        : null,

    interfaceMessage:
      outcome.type ===
      'ui-interruption'
        ? outcome.surfaces
        : null
  };

  await saveExportResult(
    exportDiagnostic
  );

  /* =====================================================
     RESULTADO DA EXPORTAÇÃO
     ===================================================== */

  if (
    outcome.type ===
    'ui-interruption'
  ) {
    setStatus(
      [
        'EXPORTAÇÃO PAUSADA PELA INTERFACE.',

        `Marca: ${brand}`,

        `Resultados na interface: ${
          result.interfaceCount ??
          'não identificado'
        }`,

        `Mensagem/opção exibida: ${
          outcome.surfaces
            .map(
              surface =>
                surface.text
            )
            .join(
              ' | '
            )
        }`,

        'Nenhuma opção adicional foi acionada. Diagnóstico salvo em Downloads/nubimetrics-test.'
      ].join('\n')
    );

    return;
  }

  /* =====================================================
     SUCESSO
     ===================================================== */

  const file =
    exportDiagnostic.download;

  setStatus(
    [
      'DOWNLOAD DE EXPORTAÇÃO CONCLUÍDO.',

      `Marca: ${brand}`,

      `Resultados na interface: ${
        result.interfaceCount ??
        'não identificado'
      }`,

      `Arquivo: ${file.name}`,

      `Caminho: ${file.path}`,

      `Tamanho: ${file.sizeBytes} bytes`,

      `Extensão: ${
        file.extension ||
        'não identificada'
      }`,

      `Concluído em: ${
        file.completedAt ||
        'horário não informado'
      }`,

      'A planilha não foi analisada. Diagnóstico salvo em Downloads/nubimetrics-test.'
    ].join('\n')
  );

  try {
    setPendingExport(
      brand,
      file
    );
  } catch (error) {
    console.error(
      'Não foi possível preparar a seleção do arquivo exportado.',
      error
    );
  }
}

/* =========================================================
   BOTÃO DA EXTENSÃO
   ========================================================= */

startButton.addEventListener(
  'click',
  async () => {
    if (running) {
      return;
    }

    const brand =
      brandInput.value.trim();

    if (!brand) {
      setStatus(
        'Informe uma marca antes de iniciar.'
      );

      brandInput.focus();

      return;
    }

    running =
      true;

    startButton.disabled =
      true;

    brandInput.disabled =
      true;

    try {
      await runTest(
        brand
      );
    } catch (error) {
      const message =
        error?.message ||
        String(error);

      setStatus(
        `TESTE INTERROMPIDO\n${message}`
      );

      await saveFailureResult(
        message,
        error?.diagnostics ||
          []
      ).catch(
        () => {}
      );
    } finally {
      running =
        false;

      startButton.disabled =
        false;

      brandInput.disabled =
        false;
    }
  }
);

/* =========================================================
   VALOR PADRÃO
   ========================================================= */

brandInput.value =
  'NOW Foods';

/* =========================================================
   AUTORUN
   ========================================================= */

const controlParameters =
  new URLSearchParams(
    location.search
  );

if (
  controlParameters.get(
    'autorun'
  ) === '1'
) {
  const requestedBrand =
    controlParameters
      .get('brand')
      ?.trim();

  if (
    requestedBrand
  ) {
    brandInput.value =
      requestedBrand.slice(
        0,
        40
      );
  }

  setTimeout(
    () =>
      startButton.click(),
    500
  );
}
