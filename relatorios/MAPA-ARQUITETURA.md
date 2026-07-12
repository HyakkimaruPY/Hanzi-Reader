# Mapa técnico da arquitetura

## Entrada e composição

- **Entrada:** `index.html`.
- **Núcleo legado/funcional:** `js/script.mjs` (1,020,271 bytes).
- **CSS em camadas:** base, source, visual refresh, learning engine, music player, refinamento e extensão de Prática.
- **APIs serverless:** `api/tts-edge.js`, `api/tatoeba.js` e `api/sogou.js`.

## Navegação e ciclo de vida

`showScreen()` continua sendo a função compatível usada pela aplicação. Ela emite `hz:screen-change`; `ui-lifecycle.mjs` e `performance-engine.mjs` observam o ciclo visível. `navigation-controller.mjs` foi adicionado como camada final incremental, com token de geração, `AbortSignal`, bloqueio de navegação duplicada e contratos `mount`, `pause`, `resume` e `unmount`, sem substituir a função original.

## Estado e persistência

- Estado histórico ainda se concentra em variáveis do `script.mjs` e chaves legadas.
- Preferências pequenas continuam no `localStorage`.
- `storage-layer.mjs` expõe `PreferencesStore`, `ContentRepository`, `DictionaryCache`, `PracticeRepository`, `StorageMigration` e `StorageFallback`.
- O banco legado de livros/flashcards ganhou fallback em memória quando IndexedDB está bloqueado, evitando falha fatal.
- Sessões persistidas pela camada nova têm retenção máxima de 800 registros.

## Áudio

- `practice-audio-service.mjs`: fila, cancelamento por escopo, análise de buffers, timeout de rede, cache limitado e descarte no `pagehide`.
- `music-player.mjs`: instância persistente de Música durante a navegação.
- `audio-coordination.mjs`: ducking da Música enquanto voz ou exercício tonal estiver ativo.

## Prática

- Existentes: identificação de tons, sequência tonal e escrita de Hanzi.
- Compartilhados: `practice-ui.mjs` para ajuda e resumo; `practice-audio-service.mjs` para áudio.
- Novo: `practice-engine.mjs`, com registry, controle de sessão, cálculo de score, provider de desafios e persistência.
- Primeira atividade adicionada: **Pares mínimos tonais**, completa em PT/EN/ES.

## Dicionário, leitura e fontes

- Dicionário e leitor permanecem principalmente em `script.mjs`, com `source-adapter.mjs` para sources e `manualSearch*.mjs` para reconhecimento manual.
- TTS e frases usam pontes same-origin em `/api`.
- Bancos locais: HSK expandido, gramática, tradicional→simplificado e fallbacks de dicionário.

## Módulos de maior risco por tamanho

- `js/script.mjs` — 1,020,271 bytes, 10,140 linhas, 162 adições de listener, 52 chamadas `fetch`.
- `js/manualSearch.mjs` — 77,618 bytes, 1,501 linhas, 29 adições de listener, 0 chamadas `fetch`.
- `js/manualSearchCore.mjs` — 70,384 bytes, 1,442 linhas, 27 adições de listener, 0 chamadas `fetch`.
- `js/learning-engine.mjs` — 47,522 bytes, 554 linhas, 26 adições de listener, 1 chamadas `fetch`.
- `js/hanzi-writing.mjs` — 45,698 bytes, 815 linhas, 6 adições de listener, 0 chamadas `fetch`.
- `js/refine-v51.js` — 29,393 bytes, 564 linhas, 8 adições de listener, 3 chamadas `fetch`.
- `js/visual-refresh.js` — 27,560 bytes, 335 linhas, 19 adições de listener, 0 chamadas `fetch`.
- `js/practice-engine.mjs` — 25,608 bytes, 444 linhas, 5 adições de listener, 0 chamadas `fetch`.


## Dependências e acoplamento

- Ciclos ESM detectados: **0**.
- Dependências npm com vulnerabilidades: **0**.
- Domínios externos encontrados no código/documentação: ${lang}.wiktionary.org, ${region}.tts.speech.microsoft.com, ..., SEU_PROXY, api.allorigins.win, api.codetabs.com, api.mymemory.translated.net, api.tatoeba.org, archive.org, audio.tatoeba.org, cccedict.vercel.app, cdn.jsdelivr.net, cdnjs.cloudflare.com, chineseboost.com, chinesereadingpractice.com, cn.chinadaily.com.cn, commons.wikimedia.org, cors-anywhere.herokuapp.com.
- Risco remanescente principal: o núcleo de 1 MB ainda mistura apresentação, domínio, persistência e integração. Uma quebra ampla foi evitada nesta etapa porque a baseline é a primeira versão totalmente estável.

## Classificação de responsabilidade

- **Apresentação:** CSS, `visual-refresh.js`, `practice-ui.mjs`, renderizações do `script.mjs`.
- **Estado/domínio:** `learning-core.mjs`, estado legado no `script.mjs`.
- **Serviços:** áudio de prática, Música, source adapter, voice bridge.
- **Persistência:** `storage-layer.mjs` e camada IDB legada protegida.
- **Integrações externas:** APIs em `/api`, pinyin carregado sob demanda, fontes e mídia externa.
- **Compatibilidade:** fallbacks de IndexedDB, Web Audio, Speech Synthesis, `requestIdleCallback` e observers.
