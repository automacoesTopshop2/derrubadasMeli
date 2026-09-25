import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv, processCsvText } from '../processamento/processar-csv.mjs';

const headers = [
  'Título', 'Vendedor', 'ID do vendedor', 'Marca', 'Categoria final', 'Último preço',
  'Catálogo', 'Loja oficial', 'ID do anúncio', 'Sku', 'Gtin', 'Link', 'Vendas em $',
  'Unidades vendidas', 'Vendas em $ históricas', 'Unidades vendidas históricas',
  'Exposição', 'Características', 'Data de criação'
];

test('interpreta BOM, delimitador e campos entre aspas', () => {
  const csv = `\uFEFF${headers.join(';')}\r\n" Produto, teste "; Vendedor ;seller-1; NOW Foods ;Suplementos; R$ 10,00 ;Não;Não;abc123;;;https://exemplo.test;1;2;3;4;Clássico;"A; B";01/01/2026\r\n`;
  const result = processCsvText(csv, 'teste.csv');
  assert.equal(result.resumo.quantidade_total_registros, 1);
  assert.equal(result.registros[0].titulo, 'Produto, teste');
  assert.equal(result.registros[0].vendedor, 'Vendedor');
  assert.equal(result.registros[0].id_anuncio_nubimetrics, 'abc123');
  assert.equal(result.registros[0].mlb, null);
  assert.equal(result.registros[0].caracteristicas, 'A; B');
});

test('preserva registro problemático e contabiliza ausências', () => {
  const emptyRow = headers.map(header => header === 'Título' ? 'Produto' : '').join(',');
  const result = processCsvText(`${headers.join(',')}\n${emptyRow}\n`, 'problemas.csv');
  assert.equal(result.resumo.quantidade_processada, 1);
  assert.equal(result.resumo.linhas_invalidas, 1);
  assert.equal(result.validacao.anuncios_sem_vendedor, 1);
  assert.equal(result.validacao.anuncios_sem_id, 1);
  assert.equal(result.validacao.anuncios_sem_marca, 1);
  assert.equal(result.validacao.anuncios_sem_link, 1);
  assert.equal(result.registros.length, 1);
});

test('parser mantém quebra de linha dentro de campo entre aspas', () => {
  const rows = parseCsv('a,b\n"linha 1\nlinha 2",x\n');
  assert.deepEqual(rows, [['a', 'b'], ['linha 1\nlinha 2', 'x']]);
});
