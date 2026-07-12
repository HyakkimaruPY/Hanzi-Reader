# Arquivos modificados

A baseline original foi mantida intacta. A lista abaixo é o diff real contra a extração preservada.

| Arquivo | Estado | Antes | Depois |
|---|---:|---:|---:|
| `css/practice-engine.css` | novo | 0 B | 4,653 B |
| `index.html` | modificado | 26,089 B | 26,348 B |
| `js/audio-coordination.mjs` | novo | 0 B | 986 B |
| `js/navigation-controller.mjs` | novo | 0 B | 4,193 B |
| `js/performance-engine.mjs` | modificado | 6,046 B | 6,724 B |
| `js/practice-audio-service.mjs` | modificado | 14,607 B | 16,021 B |
| `js/practice-engine.mjs` | novo | 0 B | 25,608 B |
| `js/practice-ui.mjs` | modificado | 7,208 B | 9,043 B |
| `js/script.mjs` | modificado | 1,019,387 B | 1,020,271 B |
| `js/storage-layer.mjs` | modificado | 11,114 B | 15,340 B |
| `js/visual-refresh.js` | modificado | 27,279 B | 27,560 B |
| `package.json` | modificado | 1,804 B | 2,022 B |
| `scripts/test-architecture.mjs` | novo | 0 B | 1,271 B |

**Total:** 13 arquivos novos ou modificados.

## Resumo por responsabilidade

- **Persistência e falha controlada:** `js/script.mjs`, `js/storage-layer.mjs`.
- **Listeners, métricas e descarte:** `js/visual-refresh.js`, `js/performance-engine.mjs`.
- **Áudio:** `js/practice-audio-service.mjs`, `js/audio-coordination.mjs`.
- **Motor e componentes de Prática:** `js/practice-engine.mjs`, `js/practice-ui.mjs`, `css/practice-engine.css`.
- **Navegação:** `js/navigation-controller.mjs`.
- **Integração e validação:** `index.html`, `package.json`, `scripts/test-architecture.mjs`.
