# Correções cirúrgicas — 12/07/2026

## Escopo

Esta atualização parte de `Hanzi-Reader-otimizado.zip` e modifica somente os módulos necessários para três problemas reproduzidos no mobile:

1. Pinyin ausente ou tardio no leitor e em componentes já renderizados.
2. Traduções de frases do dicionário retornando em idiomas aleatórios.
3. Camadas pretas ou componentes parcialmente ausentes no Chromium Android até uma nova interação.

## Arquivos alterados

- `js/script.mjs`
- `api/tatoeba.js`
- `js/performance-engine.mjs`
- `css/visual-refresh.css`
- `scripts/test-tatoeba-api.cjs`
- `vendor/pinyin-pro.mjs` (novo)
- `vendor/pinyin-pro.LICENSE` (novo)

## Correções aplicadas

### Pinyin

- A biblioteca de Pinyin passa a ser carregada primeiro de uma cópia local e usa CDN apenas como fallback.
- Componentes que já estavam montados são atualizados quando a biblioteca termina de carregar.
- A atualização cobre leitor, frases, cartões, exemplos, detalhes do dicionário e tooltip do leitor.
- O carregamento continua com orçamento curto, sem bloquear a primeira renderização.

### Idioma das frases

- Português da aplicação solicita e exibe português.
- Espanhol solicita e exibe espanhol.
- Inglês solicita e exibe inglês.
- Qualquer outro idioma do navegador usa inglês.
- Traduções em idioma incompatível são descartadas e retraduzidas.
- A ponte `/api/tatoeba` agora aceita `to=por|spa|eng` e filtra o resultado.
- Ao trocar o idioma com a aba Frases aberta, os resultados são renderizados novamente.

### Falha visual no Chromium Android

- Overlays fechados deixam de participar da composição visual.
- `backdrop-filter`, `content-visibility`, `contain` e `will-change` agressivos são neutralizados somente no Chromium Android nos pontos problemáticos.
- As transições, texturas e identidade visual foram mantidas.
- Não foram adicionados atrasos artificiais.

## Validação

- `npm test`: aprovado integralmente.
- Teste de navegador em viewport 390 × 844 com user agent Android Chromium: aprovado.
- Pinyin produzido no leitor: `nǐ hǎo`, com atributos e pseudo-elementos visíveis.
- Frases validadas em português, inglês e espanhol.
- Locale `ja-JP` sem preferência salva: fallback confirmado para inglês.
- Overlay fechado: `visibility: hidden`; aberto: `visibility: visible`.
- Classe de segurança do compositor Android aplicada corretamente.

As falhas de recursos externos registradas no teste de navegador foram provocadas pelo bloqueio deliberado de imagens, fontes e mídia remotas no ambiente de teste; não houve exceção JavaScript da aplicação.
