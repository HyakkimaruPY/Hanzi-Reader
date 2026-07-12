# Auditoria técnica e otimização estrutural — Hanzi Reader

## Escopo executado

A versão `Hanzi-Reader-main (15)` foi extraída em duas árvores: **baseline preservada** e **versão otimizada**. O ZIP original não foi modificado. Todas as mudanças foram comparadas por hash, suíte interna, roteiro automatizado de navegação e smoke tests responsivos.

Esta etapa priorizou correções comprováveis e de baixo risco. Não houve reescrita total, troca de framework, remoção de identidade visual ou implementação de várias atividades incompletas.

## Problemas encontrados e causas raízes

1. **Falha não tratada quando IndexedDB está bloqueado.** `dbtx()` executava `db.transaction()` mesmo após falha na abertura. Causa raiz: contrato implícito de que `initDB()` sempre produziria conexão válida. Correção: inicialização tolerante a falha, operações protegidas e fallback em memória para livros e flashcards.
2. **Listeners excessivos nos selects customizados.** Cada opção recebia listener próprio e o teclado era tratado simultaneamente no menu e no contêiner por propagação. Correção: delegação de clique e um único listener de teclado por seletor.
3. **Métricas cresciam indefinidamente.** Amostras de tela eram acumuladas sem retenção. Correção: 120 amostras globais e 40 por tela, além de desconexão do `PerformanceObserver`.
4. **Sessões de prática sem política de retenção.** Correção: limite de 800 sessões, remoção incremental das mais antigas e stores especializadas no IndexedDB v2.
5. **Áudio remoto sem timeout uniforme e descarte incompleto.** Correção: timeout de 12 s para análise, sinalização de atividade, cancelamento por escopo, liberação de buffers/blobs/contexto no encerramento.
6. **Música competia com exercícios auditivos.** Correção: ducking automático durante áudio de Prática, restaurando o volume ao terminar.
7. **Infraestrutura de Prática duplicaria sessão, ajuda, score e persistência.** Correção: registry e controladores compartilhados, usados pela primeira atividade nova completa.
8. **Foco de modais podia ocorrer antes da classe visual de abertura.** Correção: abertura e foco no mesmo `requestAnimationFrame`, preservando a animação e evitando foco em estrutura ainda não apresentada.

## Melhorias arquiteturais aplicadas

- Controlador incremental de navegação com tokens, cancelamento e contratos de ciclo de vida.
- Repositórios padronizados para conteúdo, cache de dicionário e progresso de Prática.
- Fallback explícito para IndexedDB indisponível.
- Retenção de métricas, sessões e caches de áudio.
- Delegação de eventos nos selects.
- Motor comum de atividades com `PracticeSessionController`, `PracticeActivityRegistry`, `PracticeScoreCalculator` e `PracticeChallengeProvider`.
- Coordenação desacoplada entre Música e áudio de exercícios.
- Teste de arquitetura adicionado à suíte `npm test`.

## Nova atividade adicionada

### Pares mínimos tonais

- Três formatos alternados: igual/diferente, sequência de tons e par Hanzi→áudio.
- Sessão de 8 desafios, score, precisão, sequência, repetições e tempo.
- Ajuda e tela de conclusão compartilhadas.
- Persistência no `PracticeRepository` com fallback compatível.
- Cancelamento de áudio e limpeza ao sair.
- Tradução PT-BR, inglês e espanhol.
- Validada em 320×700, 390×844, 768×1024 e 1440×900 sem overflow horizontal.

## Melhorias da área Lazer

A estrutura visual da aba Lazer foi preservada. A melhoria aplicada nesta etapa foi funcional: o player de Guzheng continua persistente durante a navegação, mas agora reduz o volume automaticamente enquanto uma voz ou atividade tonal reproduz áudio. Nenhum conteúdo de Lazer incompleto foi adicionado.

## Métricas A/B

| Métrica | Baseline | Otimizada | Variação |
|---|---:|---:|---:|
| Boot do roteiro sintético | 2352.50 ms | 2345.65 ms | -0.3% |
| Listeners antes do stress | 328 | 270 | -17.7% |
| Listeners após o stress | 428 | 318 | -25.7% |
| Crescimento no stress | +100 | +48 | -52.0% |
| Nós DOM antes | 3370 | 3374 | +0.1% |
| Nós DOM depois | 3468 | 3485 | +0.5% |
| Erros JS não tratados | 2 | 0 | removidos |

O tempo de boot ficou estatisticamente equivalente nesta única amostra. O ganho comprovado está na redução de listeners e na eliminação da exceção de IndexedDB. Long tasks variaram entre execuções e não foram usadas como alegação de melhora.

## Testes executados

- `npm test`: sintaxe, validação estrutural, bancos, aprendizagem, score de escrita, áudio, UI, refinamento, estabilidade, arquitetura e APIs.
- Resultado otimizado: **aprovado**, 4,33 s, RSS máximo de 145.192 KB.
- `npm audit --omit=dev`: **0 vulnerabilidades**.
- Navegação automatizada: 12 ciclos por Leitura, Flashcards, Dicionário, Descobrir, Prática, Perfil e Configurações.
- Teste de IndexedDB indisponível: interface manteve operação com fallback e sem erro não tratado.
- Smoke responsivo da nova atividade em quatro viewports.
- Validação de uma única raiz de atividade, opções renderizadas, conclusão e ausência de overflow horizontal.

## Problemas não reproduzidos ou medições limitadas

- Não foi possível obter heap snapshots completos equivalentes aos DevTools; o valor de `performance.memory` no Chromium headless ficou quantizado e não serve para afirmar redução de heap.
- Safari, Firefox, WebView Android real e Chromium antigo não estavam disponíveis neste ambiente. A validação foi por feature detection, sintaxe e Chromium.
- FCP/LCP/INP/CLS de produção não foram medidos com Lighthouse em rede real; o teste usou ambiente local e bloqueio deliberado de serviços externos.
- Áudios remotos reais, Tatoeba e fontes externas foram bloqueados no roteiro A/B; as APIs locais foram testadas separadamente.
- Importação de um livro extremamente grande não foi executada com arquivo real nesta etapa.

## Orçamento de desempenho adotado

- Métricas: máximo de 120 eventos globais e 40 amostras por tela.
- Sessões: máximo de 800 registros.
- Metadados de áudio: 48; buffers decodificados: 8; blobs TTS: 20.
- Timeout de análise de áudio: 12 s; timeout de reprodução por mídia: 20 s.
- Nenhuma raiz de atividade duplicada.
- Nenhum erro não tratado quando IndexedDB estiver indisponível.
- Nenhum overflow horizontal da nova atividade nos viewports validados.

## Riscos conhecidos restantes

1. `script.mjs` permanece um monólito de aproximadamente 1 MB e ainda mistura camadas. Refatoração ampla continua sendo risco de regressão e deve ocorrer por extrações pequenas com testes A/B.
2. Há vários wrappers históricos de `showScreen()`. O controlador novo estabiliza o ponto final, mas os wrappers legados devem ser removidos apenas depois de testes de dependência mais completos.
3. Partes antigas da UI ainda acessam IndexedDB e `localStorage` diretamente. A camada padronizada foi criada e usada nas novas funcionalidades, mas uma migração total não foi forçada.
4. O DOM inicial continua grande, acima de 3.300 nós. Redução exige lazy mounting por tela e comparação visual rigorosa.
5. Mídias e fontes externas ainda podem falhar offline; o conteúdo principal permanece funcional, mas a experiência visual pode usar fallback.
6. O teste sintético mostra observers persistentes já existentes; cada observer precisa ser migrado gradualmente para contratos explícitos de descarte.

## Decisões descartadas

- Restaurar automaticamente a última categoria de Prática foi descartado porque alterava o comportamento validado da baseline, que sempre inicia em “Tons”.
- Nenhum framework foi adicionado.
- Nenhuma animação ou textura foi removida para melhorar métricas.
- Nenhuma nova atividade além de Pares mínimos foi iniciada, evitando recursos incompletos.
