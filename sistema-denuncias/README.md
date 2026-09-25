# Sistema 1.0 — processamento Nubimetrics

Esta etapa transforma um CSV exportado pelo Nubimetrics em uma estrutura JSON padronizada de anúncios. Ela não acessa o Nubimetrics, não altera a extensão Chrome e não executa denúncias.

## Estrutura

- `dados/entrada/`: local padrão para colocar um CSV do Nubimetrics.
- `dados/processados/anuncios.json`: saída padrão.
- `processamento/processar-csv.mjs`: processador e validações.
- `coleta/nubimetrics/`: reservado para a coleta, ainda não implementada.
- `sellers/`, `regras/`, `buybox/`, `bpp/` e `acompanhamento/`: reservados para etapas futuras.

## Como executar

Coloque um único arquivo `.csv` em `dados/entrada/` e execute:

```powershell
npm run processar
```

Também é possível indicar explicitamente a entrada e a saída:

```powershell
node processamento/processar-csv.mjs --entrada "C:\caminho\arquivo.csv" --saida "dados\processados\anuncios.json"
```

O processador aceita UTF-8 com ou sem BOM, detecta delimitador, valida os cabeçalhos, preserva registros com problemas e mostra um resumo no terminal.

## Limitações atuais

- Não há banco de dados.
- Não há Buy Box, BPP, regras de sellers ou automação de denúncias.
- O campo `ID do anúncio` é preservado como `id_anuncio_nubimetrics`.
- `mlb` permanece `null`: o MLB não é descoberto nem convertido nesta etapa.
- Campos ausentes no CSV, como `Link` ou `Características`, permanecem `null` e são registrados nas validações.
