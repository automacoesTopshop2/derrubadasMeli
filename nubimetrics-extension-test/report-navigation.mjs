import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const resultDirectory = path.join(process.env.USERPROFILE, 'Downloads', 'nubimetrics-test');
const names = (await readdir(resultDirectory)).filter(name => /^nubimetrics-navigation-result-.*\.json$/i.test(name));
if (!names.length) throw new Error('Nenhum diagnóstico de navegação concluída foi encontrado.');
const files = await Promise.all(names.map(async name => ({ name, modified: (await stat(path.join(resultDirectory, name))).mtimeMs })));
files.sort((a, b) => b.modified - a.modified);
const result = JSON.parse(await readFile(path.join(resultDirectory, files[0].name), 'utf8'));

console.log('\n=== DIAGNÓSTICO DE NAVEGAÇÃO NUBIMETRICS ===');
console.log(`\nMarca:\n${result.brand}`);
console.log(`\nURL atual:\n${result.url}`);
console.log(`\nTítulo da página:\n${result.title}`);
console.log(`\nQuantidade de resultados:\n${result.interfaceCount ?? 'NÃO IDENTIFICADA'}`);
console.log(`\nTexto visível da quantidade:\n${(result.countTexts || []).join(' | ') || 'NÃO IDENTIFICADO'}`);
console.log(`\nColunas/cabeçalhos visíveis:\n${(result.headers || []).join(', ') || 'NÃO IDENTIFICADOS'}`);
console.log(`\nPrimeiros elementos relevantes:\n${(result.firstItems || []).join('\n---\n') || 'NÃO IDENTIFICADOS'}`);
console.log('\nExportação:\nNÃO EXECUTADA (fora do escopo desta etapa)');
