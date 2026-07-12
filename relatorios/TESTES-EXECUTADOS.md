# Testes executados

## Suíte automatizada

- Comando: `npm test`
- Resultado: aprovado.
- Execução comparativa otimizada: 4,33 s; RSS máximo 145.192 KB.
- Validação final do pacote: 4,68 s; RSS máximo 146.172 KB.
- Vulnerabilidades npm: 0.

## Navegação e stress

- Viewport: 390×844.
- 12 ciclos pelas telas primárias.
- Crescimento de listeners: baseline +100; otimizada +48.
- Erros não tratados: baseline 2; otimizada 0.

## Responsividade — Pares mínimos tonais

- 320×700: raiz=1, opções=2, overflow horizontal=False, erros=0.
- 390×844: raiz=1, opções=2, overflow horizontal=False, erros=0.
- 768×1024: raiz=1, opções=2, overflow horizontal=False, erros=0.
- 1440×900: raiz=1, opções=2, overflow horizontal=False, erros=0.

## Limitações

O ambiente não substitui testes físicos em Safari/iOS, Firefox, WebView Android e dispositivos de baixa memória. Os relatórios registram essas lacunas sem tratá-las como aprovadas.
