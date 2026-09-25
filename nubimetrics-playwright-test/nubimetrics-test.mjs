import { chromium } from 'playwright';
import * as XLSX from 'xlsx';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { access, mkdir, stat } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import path from 'node:path';

const BASE_URL = 'https://app.nubimetrics.com/';
const TEST_DIR = path.resolve(import.meta.dirname);
const DOWNLOAD_DIR = path.join(TEST_DIR, 'downloads');
const ARTIFACT_DIR = path.join(TEST_DIR, 'artifacts');
const STORAGE_STATE_PATH = path.join(TEST_DIR, 'storage-state.json');
const MANUAL_PROFILE_PATH = path.join(TEST_DIR, 'manual-browser-profile');
const CHROME_USER_DATA_PATH = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const PROFILE5_SESSION_COPY_PATH = path.join(TEST_DIR, 'profile5-session-copy');

const rl = createInterface({ input, output });
const ask = async (label, envName) => {
  const fromEnv = process.env[envName]?.trim();
  return fromEnv || (await rl.question(label)).trim();
};

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function findColumn(columns, terms) {
  return columns.find((column) => terms.some((term) => normalize(column).includes(term))) ?? null;
}

function parseDisplayedCount(text) {
  const matches = [...text.matchAll(/(?:de|total(?:\s+de)?|encontrad[oa]s?)\s+([\d.]+)\s+resultados?/gi)];
  if (!matches.length) return null;
  return Number(matches.at(-1)[1].replace(/\./g, ''));
}

async function firstVisible(locators) {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) return locator.first();
  }
  return null;
}

let browser;
let context;
let page;
let brand = '';
let interfaceCount = null;
let downloadName = null;
let extension = null;
let exportedCount = null;
let columns = [];
let observations = [];

try {
  await mkdir(DOWNLOAD_DIR, { recursive: true });
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const manualLogin = args.includes('--manual-login');
  const useManualProfile = args.includes('--use-manual-profile');
  const useChromeProfile5 = args.includes('--use-chrome-profile-5');
  const useProfile5Copy = args.includes('--use-profile5-copy');
  const brandArgs = args.filter((arg) => !['--manual-login', '--use-manual-profile', '--use-chrome-profile-5', '--use-profile5-copy'].includes(arg));
  const hasSavedSession = await access(STORAGE_STATE_PATH).then(() => true).catch(() => false);

  if (!manualLogin && !useManualProfile && !useChromeProfile5 && !useProfile5Copy && !hasSavedSession) loadEnvFile(path.join(TEST_DIR, '.env'));
  const email = process.env.EMAIL;
  const password = process.env.SENHA;
  if (!manualLogin && !useManualProfile && !useChromeProfile5 && !useProfile5Copy && !hasSavedSession && (!email || !password)) {
    throw new Error('As variáveis EMAIL e SENHA não foram encontradas no arquivo .env.');
  }

  brand = brandArgs.join(' ').trim() || process.env.NUBIMETRICS_BRAND?.trim() || '';

  if (useProfile5Copy) {
    context = await chromium.launchPersistentContext(PROFILE5_SESSION_COPY_PATH, {
      channel: 'chrome',
      args: ['--profile-directory=Profile 5'],
      headless: false,
      acceptDownloads: true,
      locale: 'pt-BR'
    });
    page = context.pages()[0] ?? await context.newPage();
  } else if (useChromeProfile5) {
    context = await chromium.launchPersistentContext(CHROME_USER_DATA_PATH, {
      channel: 'chrome',
      args: ['--profile-directory=Profile 5'],
      headless: false,
      acceptDownloads: true,
      locale: 'pt-BR'
    });
    page = context.pages()[0] ?? await context.newPage();
  } else if (useManualProfile) {
    context = await chromium.launchPersistentContext(MANUAL_PROFILE_PATH, {
      channel: 'msedge',
      headless: false,
      acceptDownloads: true,
      locale: 'pt-BR'
    });
    page = context.pages()[0] ?? await context.newPage();
  } else {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      acceptDownloads: true,
      locale: 'pt-BR',
      ...(hasSavedSession ? { storageState: STORAGE_STATE_PATH } : {})
    });
    page = await context.newPage();
  }
  console.log(`[1/6] Abrindo ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  console.log(`Rota carregada: ${new URL(page.url()).pathname}`);
  if (await page.locator('#email').isVisible().catch(() => false)) {
    throw new Error('A sessão copiada não foi aceita: o Nubimetrics redirecionou para o login.');
  }
  if (manualLogin) {
    console.log('Conclua login, reCAPTCHA e OTP manualmente na janela. Tempo máximo: 10 minutos.');
  } else if (!useManualProfile && !useChromeProfile5 && !useProfile5Copy && !hasSavedSession) {
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();

    const otpFirst = page.locator('#otp-0');
    const otpRequested = await otpFirst.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true).catch(() => false);
    if (otpRequested) {
      console.log('OTP necessário. Digite o código manualmente na janela do navegador.');
      console.log('O teste continuará automaticamente após a verificação. Tempo máximo: 10 minutos.');
      await otpFirst.waitFor({ state: 'hidden', timeout: 600_000 });
    }
  } else {
    console.log('Tentando reutilizar a sessão local salva.');
  }

  const directSearch = page.getByRole('textbox', { name: /buscar anúncios, codinome do vendedor, marcas e muito mais/i });
  const explorerText = page.getByText('Explorador de anúncios', { exact: true });
  await Promise.race([
    directSearch.waitFor({ state: 'visible', timeout: 600_000 }),
    explorerText.waitFor({ state: 'visible', timeout: 600_000 })
  ]);
  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log('Sessão autenticada salva localmente para reutilização.');
  const explorerLink = await firstVisible([
    page.getByText('Explorador de anúncios', { exact: true }),
    page.getByRole('link', { name: /explorador de anúncios/i }),
    page.getByRole('button', { name: /explorador de anúncios/i })
  ]);
  if (explorerLink) await explorerLink.click();

  const search = directSearch;
  await search.waitFor({ state: 'visible', timeout: 60_000 });
  console.log('[2/6] Explorador de anúncios aberto.');
  if (brand) {
    await search.fill(brand);
    await search.press('Enter');
  } else {
    console.log('Digite a marca na caixa de pesquisa do navegador e pressione Enter.');
    await page.waitForFunction(() => {
      const field = document.querySelector('input[aria-label="Buscar anúncios, codinome do vendedor, marcas e muito mais"]');
      return field && field.value.trim().length > 0;
    }, null, { timeout: 600_000 });
    brand = (await search.inputValue()).trim();
  }
  console.log(`[3/6] Pesquisa enviada: ${brand}`);

  const exportButton = page.locator('#publication-explorer-exportBtn');
  await exportButton.waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('#publication-explorer-exportBtn');
    return button && !button.disabled && button.getAttribute('aria-disabled') !== 'true';
  }, null, { timeout: 120_000 });

  const bodyText = await page.locator('body').innerText();
  interfaceCount = parseDisplayedCount(bodyText);
  console.log(`[4/6] Resultados carregados. Quantidade informada: ${interfaceCount ?? 'não identificada'}`);

  const visibleHeaders = await page.locator('table thead th, [role="columnheader"]').allInnerTexts().catch(() => []);
  if (visibleHeaders.length) console.log(`Colunas visíveis na interface: ${visibleHeaders.map((h) => h.trim()).filter(Boolean).join(', ')}`);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    exportButton.click()
  ]);
  downloadName = download.suggestedFilename();
  extension = path.extname(downloadName).slice(1).toLowerCase() || 'desconhecido';
  const downloadPath = path.join(DOWNLOAD_DIR, downloadName);
  await download.saveAs(downloadPath);
  const fileStat = await stat(downloadPath);
  if (!fileStat.isFile() || fileStat.size === 0) throw new Error('O download não gerou um arquivo válido.');
  console.log(`[5/6] Download confirmado: ${downloadName} (${fileStat.size} bytes)`);

  const workbook = XLSX.readFile(downloadPath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  columns = rows.length ? Object.keys(rows[0]) : XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] ?? [];
  exportedCount = rows.length;

  const sellerCol = findColumn(columns, ['vendedor', 'seller']);
  const sellerIdCol = findColumn(columns, ['id do vendedor', 'id vendedor', 'seller id', 'seller_id']);
  const listingIdCol = findColumn(columns, ['id do anuncio', 'id anuncio', 'publication id', 'item id', 'item_id']);
  const brandCol = findColumn(columns, ['marca', 'brand']);
  const titleCol = findColumn(columns, ['titulo', 'title']);
  const linkCol = findColumn(columns, ['link', 'url', 'permalink']);
  const listingExample = listingIdCol ? rows.find((row) => row[listingIdCol] != null)?.[listingIdCol] : null;
  const limitObservation = interfaceCount != null && interfaceCount > exportedCount
    ? `${interfaceCount} resultados encontrados, porém ${exportedCount} registros foram exportados.`
    : interfaceCount === exportedCount
      ? `A exportação corresponde aos ${exportedCount} resultados exibidos.`
      : 'Não foi possível comparar conclusivamente a interface com a exportação.';
  observations.push(limitObservation);
  if (interfaceCount > 10_000 && exportedCount === 10_000) observations.push('Limite prático confirmado em exatamente 10.000 registros.');
  else if (interfaceCount > 10_000) observations.push(`Busca acima de 10.000; exportação observada: ${exportedCount}.`);
  else observations.push('Esta busca não permite confirmar na prática o limite de 10.000 registros.');

  console.log('\n=== TESTE NUBIMETRICS ===');
  console.log(`\nMarca pesquisada:\n${brand}`);
  console.log(`\nResultados encontrados na interface:\n${interfaceCount ?? 'NÃO IDENTIFICADO'}`);
  console.log(`\nArquivo exportado:\n${downloadName}`);
  console.log(`\nFormato:\n${extension}`);
  console.log(`\nQuantidade de registros exportados:\n${exportedCount}`);
  console.log(`\nColunas encontradas:\n${columns.join(', ') || 'NENHUMA'}`);
  console.log(`\nPossui vendedor:\n${sellerCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nPossui ID do vendedor:\n${sellerIdCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nPossui ID do anúncio:\n${listingIdCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nFormato do ID do anúncio:\n${listingExample ?? 'NÃO IDENTIFICADO'}`);
  console.log(`\nPossui marca:\n${brandCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nPossui título:\n${titleCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nPossui link do Mercado Livre:\n${linkCol ? 'SIM' : 'NÃO'}`);
  console.log(`\nLimite de exportação observado:\n${limitObservation}`);
  console.log(`\nObservações:\n${observations.join(' ')}`);
  console.log('\n[6/6] Teste concluído.');
} catch (error) {
  console.error('\n=== TESTE INTERROMPIDO ===');
  console.error(`O que foi tentado: navegação, pesquisa e exportação controladas pelo Playwright.`);
  console.error(`Onde falhou: ${page?.url() ?? 'antes de abrir o navegador'}`);
  console.error(`Mensagem/erro: ${error?.stack ?? error}`);
  if (page && !/\/account\/(?:login|verify)/i.test(page.url())) {
    const screenshotPath = path.join(ARTIFACT_DIR, `falha-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.error(`Evidência: ${screenshotPath}`);
  }
  process.exitCode = 1;
} finally {
  rl.close();
  if (context) await context.close().catch(() => {});
  else if (browser) await browser.close();
}
