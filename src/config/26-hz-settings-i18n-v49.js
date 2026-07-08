
/* v4.9: internacionalização central + reorganização das Configurações (Sr. Hell) */
(function(){
'use strict';
const HZ_APP={name:'漢讀 · Hanzi Reader',version:'v4.9',author:'Sr. Hell'};
const HZ_I18N={
 pt:{reading:'Leitura',words:'Flash Cards',dict:'Dicionário',sources:'Fontes',practice:'Prática',
     settings:'Ajustes',back:'Voltar',stats:'Estatísticas',profile:'Meu Perfil',guest:'Convidado',
     sec1:'Leitor e leitura',sec2:'Idioma',sec3:'Tema e aparência',sec4:'Ajuda e sobre',sec5:'Gerenciamento e avançado',
     voiceRow:'Voz e leitura em voz alta',voiceSub:'Voz, velocidade, tom e estilo da leitura',
     v2Row:'Voz Natural v2',v2Sub:'Padrão da aplicação. Desative para usar a versão clássica.',
     langRow:'Idioma da interface',langSub:'Automático segue o idioma do navegador',
     langAuto:'Automático',helpRow:'Guia do aplicativo',helpSub:'Como usar leitura, dicionário, fontes e prática',
     author:'Autor',version:'Versão',
     dictTabDefs:'DICIO',dictTabWords:'PALAVRAS',dictTabSents:'FRASES',
     flashDecks:'Baralhos',flashLevels:'Baralhos por níveis',flashTitle:'Flashcards',
     dictEmptyT:'Pesquise uma palavra ou ideograma.',dictEmptyS:'O dicionário usa definições, palavras relacionadas, exemplos e áudio natural quando disponível.',
     searchPh:'字 / 词 / frase'},
 en:{reading:'Reading',words:'Flash Cards',dict:'Dictionary',sources:'Sources',practice:'Practice',
     settings:'Settings',back:'Back',stats:'Stats',profile:'My Profile',guest:'Guest',
     sec1:'Reader & reading',sec2:'Language',sec3:'Theme & appearance',sec4:'Help & about',sec5:'Storage & advanced',
     voiceRow:'Voice & read aloud',voiceSub:'Voice, speed, pitch and reading style',
     v2Row:'Natural Voice v2',v2Sub:'Application default. Turn off to use the classic version.',
     langRow:'Interface language',langSub:'Auto follows your browser language',
     langAuto:'Automatic',helpRow:'App guide',helpSub:'How to use reading, dictionary, sources and practice',
     author:'Author',version:'Version',
     dictTabDefs:'DICT',dictTabWords:'WORDS',dictTabSents:'SENTS',
     flashDecks:'Decks',flashLevels:'Decks by level',flashTitle:'Flashcards',
     dictEmptyT:'Search a word or character.',dictEmptyS:'The dictionary uses definitions, related words, examples and natural audio when available.',
     searchPh:'字 / 词 / phrase'}
};
function hzLang(){
  const saved=localStorage.getItem('hzLang');
  if(saved==='pt'||saved==='en')return saved;
  const nav=(navigator.language||'pt').toLowerCase();
  if(nav.startsWith('en'))return 'en';
  return 'pt'; // idioma-base do app: navegadores sem tradução caem em português
}
function T(k){return (HZ_I18N[hzLang()]||HZ_I18N.en)[k]||HZ_I18N.en[k]||k;}
window.hzT=T;window.hzLang=hzLang;

/* Navegação traduzida: substitui o gerador mantendo estrutura e ícones */
const _nav=window.v29NavHTML;
if(typeof _nav==='function'){
  window.v29NavHTML=function(active){
    let html=_nav(active);
    const map=[['>Leitura<','>'+T('reading')+'<'],['>Words<','>'+T('words')+'<'],['>Dicionário<','>'+T('dict')+'<'],['>Sources<','>'+T('sources')+'<'],['>Prática<','>'+T('practice')+'<']];
    // rótulos ficam após o </svg>
    html=html.replace(/(<\/svg>)Leitura/g,'$1'+T('reading')).replace(/(<\/svg>)Flash Cards/g,'$1'+T('words')).replace(/(<\/svg>)Dicionário/g,'$1'+T('dict')).replace(/(<\/svg>)Sources/g,'$1'+T('sources')).replace(/(<\/svg>)Prática/g,'$1'+T('practice')).replace(/(<\/svg>)Meu Perfil/g,'$1'+T('profile'));
    return html;
  };
}
function hzTranslateChrome(){
  document.querySelectorAll('.bnav:not(.rbnav)').forEach(nav=>{
    const act=nav.querySelector('.ni.on');
    nav.innerHTML=window.v29NavHTML(act?act.dataset.tab:'');
  });
  const sh=document.querySelector('#ss .sh span');if(sh)sh.textContent=T('settings');
  const bb=document.getElementById('bback');if(bb){const tn=[...bb.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(tn)tn.textContent=T('back');}
  const sdT=document.querySelector('#sd .lh h1');if(sdT)sdT.textContent=T('sources');
  const sxT=document.querySelector('#sx .dict-head h1, #sx h1');if(sxT)sxT.textContent=T('dict');
  const fT=document.querySelector('#sw .flash-head h1');if(fT)fT.textContent=T('flashTitle');
  document.querySelectorAll('.dict-tab').forEach(b=>{if(b.dataset.dtab==='defs')b.textContent=T('dictTabDefs');if(b.dataset.dtab==='words')b.textContent=T('dictTabWords');if(b.dataset.dtab==='sents')b.textContent=T('dictTabSents');});
  document.querySelectorAll('.flash-tab').forEach(b=>{if(b.dataset.ftab==='decks')b.textContent=T('flashDecks');if(b.dataset.ftab==='levels')b.textContent=T('flashLevels');});
  const de=document.querySelector('.dict-empty b, .dict-empty strong');if(de)de.textContent=T('dictEmptyT');
  const dq=document.getElementById('dict-q');if(dq)dq.placeholder=T('searchPh');
  if(hzLang()==='en')hzApplyEnMap();
  document.querySelectorAll('#sr .rbnav .ni').forEach(b=>{
    const tn=[...b.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!tn)return;
    const cur=tn.textContent.trim();
    if(/^(Stats|Estatísticas)$/.test(cur))tn.textContent=T('stats');
    if(/^(Settings|Ajustes)$/.test(cur))tn.textContent=T('settings');
    if(/^(Back|Voltar)$/.test(cur))tn.textContent=T('back');
  });
}

/* Reorganização das Configurações em 5 blocos */
function row(el){return el?el.closest('.srow'):null;}
function hzReorgSettings(){
  const sc=document.querySelector('#ss .sc');
  if(!sc||sc.dataset.hzReorg==='1')return;
  const need=['fs-dec','tog-py','btn-manage-storage'];
  if(!need.every(id=>document.getElementById(id)))return; // aguarda installers
  sc.dataset.hzReorg='1';
  const grab={
    fsRow:row(document.getElementById('fs-dec')),
    togPy:document.getElementById('tog-py'),
    togTrans:document.getElementById('tog-auto-trans'),
    togLvl:document.getElementById('tog-lvl-py'),
    hskRow:row(document.getElementById('hsk-min')),
    themeRow:document.getElementById('theme-row-settings-v33'),
    bgRow:document.getElementById('hz-bg-row'),
    bgOpRow:document.getElementById('hz-bg-op-row'),
    helpRow:document.getElementById('help-row-v34'),
    stor:document.getElementById('btn-manage-storage'),
    clrW:document.getElementById('btn-clear-words'),
    clrA:document.getElementById('btn-clear-all'),
    about:[...document.querySelectorAll('#ss .srow')].find(r=>/Hanzi Reader/.test(r.textContent))
  };
  const mk=(title)=>{const g=document.createElement('div');g.className='sg';g.innerHTML='<div class="sgt">'+title+'</div>';return g;};
  const g1=mk(T('sec1')),g2=mk(T('sec2')),g3=mk(T('sec3')),g4=mk(T('sec4')),g5=mk(T('sec5'));
  // G1 — leitor e leitura
  [grab.fsRow,grab.togPy,grab.togLvl,grab.hskRow,grab.togTrans].forEach(el=>{if(el)g1.appendChild(el);});
  g1.insertAdjacentHTML('beforeend',
    '<div class="srow" style="cursor:pointer" id="hz-v2-row"><div><div class="slbl">'+T('v2Row')+'</div><div class="ssub">'+T('v2Sub')+'</div></div><button class="stog" id="hz-v2-tog"></button></div>');
  // G2 — idioma
  g2.insertAdjacentHTML('beforeend',
    '<div class="srow"><div><div class="slbl">'+T('langRow')+'</div><div class="ssub">'+T('langSub')+'</div></div><select class="lvlselect" id="hz-lang-sel"><option value="auto">'+T('langAuto')+'</option><option value="pt">Português</option><option value="en">English</option></select></div>');
  // G3 — tema e aparência
  [grab.themeRow,grab.bgRow,grab.bgOpRow].forEach(el=>{if(el)g3.appendChild(el);});
  // G4 — ajuda e sobre
  if(grab.helpRow){grab.helpRow.querySelector('.slbl').textContent=T('helpRow');grab.helpRow.querySelector('.ssub').textContent=T('helpSub');g4.appendChild(grab.helpRow);}
  g4.insertAdjacentHTML('beforeend',
    '<div class="srow"><div class="slbl">'+HZ_APP.name+'</div><div class="ssub" style="color:#8a8a8a">'+T('version')+' '+HZ_APP.version+'</div></div>'+
    '<div class="srow"><div class="slbl">'+T('author')+'</div><div class="ssub" style="color:#8a8a8a">'+HZ_APP.author+'</div></div>');
  if(grab.about)grab.about.remove();
  // G5 — gerenciamento e avançado
  [grab.stor,grab.clrW,grab.clrA].forEach(el=>{if(el)g5.appendChild(el);});
  // remonta na ordem e remove grupos vazios antigos
  [g2,g1,g3,g4,g5].forEach(g=>sc.appendChild(g));
  [...sc.querySelectorAll('.sg')].forEach(g=>{if(![g2,g1,g3,g4,g5].includes(g)&&!g.querySelector('.srow, .card'))g.remove();});
  // wiring
  const v2=document.getElementById('hz-v2-tog');
  const syncV2=()=>{v2.classList.toggle('on',localStorage.getItem('hzVoiceV2')!=='0');};
  if(v2){syncV2();document.getElementById('hz-v2-row').addEventListener('click',()=>{localStorage.setItem('hzVoiceV2',localStorage.getItem('hzVoiceV2')!=='0'?'0':'1');syncV2();});}
  const ls=document.getElementById('hz-lang-sel');
  if(ls){ls.value=localStorage.getItem('hzLang')||'auto';
    ls.addEventListener('change',()=>{
      if(ls.value==='auto')localStorage.removeItem('hzLang');else localStorage.setItem('hzLang',ls.value);
      hzTranslateChrome();hzRewriteHelp();hzRetitleSections();
    });}
}
function hzRetitleSections(){
  const sc=document.querySelector('#ss .sc');if(!sc||sc.dataset.hzReorg!=='1')return;
  const titles=[T('sec2'),T('sec1'),T('sec3'),T('sec4'),T('sec5')];
  const gs=[...sc.querySelectorAll('.sg')].slice(-5);
  gs.forEach((g,i)=>{const t=g.querySelector('.sgt');if(t&&titles[i])t.textContent=titles[i];});
}
/* Ajuda reescrita: guia direto ao ponto */
function hzRewriteHelp(){
  const modal=document.getElementById('mo-help');if(!modal)return;
  const pt=hzLang()==='pt';
  const docs=pt?{
   comecar:'<h2>Começar</h2><p><b>Leitura:</b> cole um texto em chinês ou um link — o app extrai, limpa e monta a leitura com pinyin por nível HSK.</p><p><b>Fontes:</b> importe leituras prontas em um toque.</p><p>Toque em qualquer palavra para ver pinyin, tradução e salvar no vocabulário.</p>',
   leitor:'<h2>Leitor</h2><p>As cores do pinyin indicam a dificuldade: verde (HSK 1–2), azul (HSK 3–4), vermelho (HSK 5–6).</p><p>Selecione um trecho para <b>Traduzir</b> ou <b>Ler</b> em voz alta. O botão quadrado oculta as barras para leitura imersiva.</p><p>Ajuste fonte, pinyin e voz em Ajustes.</p>',
   estudo:'<h2>Palavras e Dicionário</h2><p><b>Palavras:</b> revise seu vocabulário com flashcards; ao concluir, há uma celebração com música.</p><p><b>Dicionário:</b> pesquise ideogramas; DICT traz definições, WORDS palavras compostas, SENTS frases de exemplo.</p>',
   pratica:'<h2>Prática e Áudio</h2><p><b>Prática:</b> músicas de guzheng e o jogo de tons — ouça e escolha ou desenhe o contorno do tom; acertos de pares tocam frases reais.</p><p>A voz de leitura é natural e com emoção; ajuste velocidade, tom e estilo em Ajustes → Voz.</p>'
  }:{
   comecar:'<h2>Getting started</h2><p><b>Reading:</b> paste Chinese text or a link — the app extracts, cleans and builds the reading with HSK-leveled pinyin.</p><p><b>Sources:</b> one-tap ready readings.</p><p>Tap any word for pinyin, translation and to save it.</p>',
   leitor:'<h2>Reader</h2><p>Pinyin colors show difficulty: green (HSK 1–2), blue (HSK 3–4), red (HSK 5–6).</p><p>Select a passage to <b>Translate</b> or <b>Read aloud</b>. The square button hides bars for immersive reading.</p>',
   estudo:'<h2>Words & Dictionary</h2><p><b>Words:</b> review vocabulary with flashcards; finishing triggers a celebration with music.</p><p><b>Dictionary:</b> DICT for definitions, WORDS for compounds, SENTS for example sentences.</p>',
   pratica:'<h2>Practice & Audio</h2><p><b>Practice:</b> guzheng music and the tone game — listen and pick or draw the tone contour; correct pairs play real phrases.</p><p>The reading voice is natural and emotional; tune it in Settings → Voice.</p>'
  };
  const tabs=pt?[['comecar','Começar'],['leitor','Leitor'],['estudo','Estudo'],['pratica','Prática']]
               :[['comecar','Start'],['leitor','Reader'],['estudo','Study'],['pratica','Practice']];
  modal.innerHTML='<div class="ms"><div class="mbar"><div class="mhd"></div><button class="mx" id="help-x">×</button></div><div class="mtitle">'+HZ_APP.name+'</div><div class="help-actions">'+tabs.map(([k,l],i)=>'<button data-help-tab="'+k+'"'+(i===0?' class="on"':'')+'>'+l+'</button>').join('')+'</div><iframe class="help-frame" id="help-frame" sandbox="allow-same-origin"></iframe></div>';
  const css='<style>body{margin:0;background:#111;color:#eee;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:18px;line-height:1.65}h2{color:var(--hzac,#f5a623);margin-top:0}p{color:#ddd}b{color:#fff}</style>'.replace('var(--hzac,#f5a623)',getComputedStyle(document.documentElement).getPropertyValue('--ac').trim()||'#f5a623');
  const setTab=t=>{modal.querySelectorAll('[data-help-tab]').forEach(b=>b.classList.toggle('on',b.dataset.helpTab===t));document.getElementById('help-frame').srcdoc=css+(docs[t]||docs.comecar);};
  modal.querySelectorAll('[data-help-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.helpTab));
  setTab('comecar');
  document.getElementById('help-x').onclick=()=>modal.classList.remove('open');
  modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open');};
}
const HZ_EN_MAP={'Tamanho da fonte':'Font size','Tamanho dos caracteres':'Character size',
 'Mostrar Pinyin':'Show pinyin','Transcrição acima dos caracteres':'Transcription above characters',
 'Pinyin por nível':'Pinyin by level','Oculta pinyin das palavras já fáceis':'Hides pinyin on easy words',
 'Ocultar até o nível':'Hide up to level','Nível escolhido e inferiores ficam sem pinyin':'Chosen level and below hide pinyin',
 'Traduzir definições automaticamente':'Auto-translate definitions','Sempre em português, sem precisar tocar em PT':'Always translated automatically',
 'Fundo artístico':'Artistic background','Paisagem noturna nas telas do aplicativo (o leitor não é afetado).':'Night landscape on app screens (reader unaffected).',
 'Opacidade do fundo':'Background opacity','O quanto a paisagem aparece atrás do conteúdo.':'How visible the landscape is behind content.',
 'Ativado':'On','Desativado':'Off','Tema':'Theme',
 'Gerenciar armazenamento':'Manage storage','Ver e limpar itens salvos no navegador':'View and clear items saved in the browser',
 'Limpar vocabulário':'Clear vocabulary','Limpar tudo':'Clear everything',
 'Prática':'Practice','Músicas':'Music'};
function hzApplyEnMap(){
  document.querySelectorAll('#ss .slbl, #ss .ssub, #ss .sgt, #hz-bg-toggle, .hzp-title').forEach(el=>{
    const t=el.textContent.trim();
    if(HZ_EN_MAP[t])el.textContent=HZ_EN_MAP[t];
  });
}
function boot(){try{hzReorgSettings();}catch(e){}try{hzTranslateChrome();}catch(e){}try{hzRewriteHelp();}catch(e){}}
setTimeout(boot,900);setTimeout(boot,2600);setTimeout(boot,5200);
})();
