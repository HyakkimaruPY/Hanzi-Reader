(async function(){
  'use strict';
  async function install(mod, source){
    if(!mod || !mod.pinyin) throw new Error('módulo sem pinyin()');
    window.pinyinFn = mod.pinyin;
    window.pinyinSeg = mod.segment || mod.pinyin?.getSegment || mod.getSegment || null;
    window.pinyinOutputFormat = mod.OutputFormat || {};
    window.__pinyinSource = source;
    document.dispatchEvent(new Event('pinyin-ready'));
    try{ console.info('[Hanzi Reader] pinyin ativo:', source); }catch{}
  }
  const sources = [
    ['local-vendor', '../vendor/pinyin-local.mjs'],
    ['jsdelivr-fallback', 'https://cdn.jsdelivr.net/npm/pinyin-pro@3/+esm'],
    ['unpkg-fallback', 'https://unpkg.com/pinyin-pro@3/+esm']
  ];
  let lastErr = null;
  for(const [name,url] of sources){
    try{ await install(await import(url), name); return; }
    catch(e){ lastErr = e; try{ console.warn('[Hanzi Reader] pinyin falhou em', name, e); }catch{} }
  }
  console.warn('pinyin indisponível', lastErr);
})();
