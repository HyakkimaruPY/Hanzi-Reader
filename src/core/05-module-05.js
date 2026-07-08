
try{
  const m=await import('https://cdn.jsdelivr.net/npm/pinyin-pro@3/+esm');
  window.pinyinFn=m.pinyin;
  window.pinyinSeg=m.segment||m.pinyin?.getSegment||m.getSegment||null;
  window.pinyinOutputFormat=m.OutputFormat||{};
  document.dispatchEvent(new Event('pinyin-ready'));
}catch(e){
  try{
    const m=await import('https://unpkg.com/pinyin-pro@3/+esm');
    window.pinyinFn=m.pinyin;
    window.pinyinSeg=m.segment||m.pinyin?.getSegment||m.getSegment||null;
    window.pinyinOutputFormat=m.OutputFormat||{};
    document.dispatchEvent(new Event('pinyin-ready'));
  }catch(e2){console.warn('pinyin-pro falhou',e2);}
}
