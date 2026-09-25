# Teste local do Nubimetrics por extensão

Teste isolado de navegação e pesquisa usando o Chrome normal e uma sessão autenticada pelo operador. A etapa atual para antes da exportação.

## Limites

- Não automatiza login, senha, reCAPTCHA ou OTP.
- Não consulta endpoints privados.
- Não integra BPP, API ou banco de dados.
- Não envia denúncias e não cria execução recorrente.

## Instalação manual

1. Abra o Chrome no perfil autenticado.
2. Acesse `chrome://extensions` e ative o modo do desenvolvedor.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta `nubimetrics-extension-test/extension`.
5. Clique no ícone **Teste local Nubimetrics**.
6. Informe a marca e clique em **Pesquisar e diagnosticar**.

O diagnóstico é salvo em `Downloads/nubimetrics-test`. Execute `npm.cmd run report:navigation` para mostrá-lo no terminal. Nenhum clique em **Exportar** é feito nesta etapa.
