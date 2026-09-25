# Teste isolado do Nubimetrics

Este diretório contém somente um teste manual assistido de navegação, pesquisa e exportação. Não integra BPP, API ou banco de dados e não executa denúncias.

## Executar

```powershell
cd nubimetrics-playwright-test
npm.cmd run test:nubimetrics
```

O script lê `EMAIL` e `SENHA` do arquivo local `.env`, que deve permanecer ignorado pelo Git. O OTP, quando exigido, é digitado manualmente pelo usuário diretamente no navegador e não é lido nem gravado pelo teste. A marca pode ser passada como argumento ou em `NUBIMETRICS_BRAND`; sem esses valores, pode ser digitada na caixa de pesquisa.

Downloads ficam em `downloads/` e capturas de falha em `artifacts/`.
