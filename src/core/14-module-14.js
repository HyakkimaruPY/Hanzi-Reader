
(()=>{
const V38_VERSION='v3.8';
function v38Style(){
 if(document.getElementById('v38-style'))return;
 const css=`
 .rtext{letter-spacing:.01em}.pb{margin:10px 0}.pt{white-space:pre-wrap}.sp{width:.24em}.sp.md{width:.48em}.sp.lg{width:.86em}
 .src-section{margin-bottom:18px}.src-section .sgt{color:#a58a5d}.src-card2{border-radius:16px}.src-title2{line-height:1.28}.src-desc2{line-height:1.48}.src-actions2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}.src-actions2 button,.src-actions2 a{display:inline-flex;align-items:center;gap:6px;justify-content:center;border-radius:11px;min-height:34px}
 .mode-row{position:sticky;top:0;z-index:5;background:rgba(0,0,0,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
 .book-card,.card{touch-action:pan-y}.book-actions,.card-actions{display:flex!important;gap:7px!important;align-items:center!important}.book-actions button,.card-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:32px!important;height:32px!important;padding:0!important}
 /* v4.8.1: o ana-btn (Analytics) ficava colado/atrás do del-btn (lixeira) no modo "Leitura simples",
    dificultando o toque. Força explicitamente layout em linha, lado a lado, com área de toque isolada
    e z-index acima do card para cada botão não roubar o clique do outro. */
 .card.has-actions .card-actions{position:absolute!important;top:10px!important;right:10px!important;transform:none!important;flex-direction:row!important;flex-wrap:nowrap!important;gap:8px!important;z-index:8!important}
 .card.has-actions{padding-right:96px!important}
 .card.has-actions .card-actions button{position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;z-index:9!important;flex:0 0 auto!important}
 .card.has-actions .card-actions .ana-btn{order:1}
 .card.has-actions .card-actions .del-btn{order:2}
 .v38-polish-note{font-size:11px;color:#8e7a5d;margin-top:6px}.reader-next{white-space:nowrap}
 @media(min-width:760px){.bc,.wc,.dict-wrap,.sc{max-width:980px;width:100%;margin:0 auto}.rscroll{max-width:860px;width:100%;margin:0 auto}.src-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lib-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
 `;
 document.head.insertAdjacentHTML('beforeend',`<style id="v38-style">${css}</style>`);
}
function v38Decode(s){const ta=document.createElement('textarea');ta.innerHTML=String(s||'');return ta.value;}
function v38CjkCount(s){return [...String(s||'')].filter(ch=>{try{return isCJK(ch)}catch{return /[\u3400-\u9fff]/.test(ch)}}).length;}
function v38NoiseLine(raw,url=''){
 let l=String(raw||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
 if(!l)return 'blank';
 l=l.replace(/^#{1,6}\s*/,'').replace(/^[-*+•]\s+/,'').trim();
 const low=l.toLowerCase();
 if(/^https?:\/\//i.test(l)||/^www\./i.test(l))return 'drop';
 if(/^(!?\[[^\]]*\]\([^)]*\)|\[[^\]]*\])$/.test(l))return 'drop';
 if(/^\|.*\|$/.test(l))return 'drop';
 if(/^(title|url source|published time|markdown content|images|links|source):/i.test(l))return 'drop';
 if(/^bbc news,?\s*中文\s*-\s*主页$/i.test(l))return 'drop';
 if(/^(skip to content|home|menu|login|sign in|search|share|print|advertisement|cookies?|privacy|terms|copyright)$/i.test(low))return 'drop';
 if(/^(首页|主页|目录|返回|登录|注册|搜索|分享|打印|广告|版权|隐私|条款|联系我们|关于我们|关注我们|更多|视频|图片|音频|相关内容|推荐阅读|热门|阅读排行|责任编辑|来源|编辑|发布于)$/.test(l))return 'drop';
 if(/^(中国|香港|台湾|英国|美国|国际|财经|体育|娱乐|科技|文化|头条新闻|新闻|中文|专题|世界|亚洲)$/.test(l))return 'drop';
 if(/^\d+\s*(秒|分钟|小时|天|周|个月|年)\s*前$/.test(l))return 'drop';
 if(/^\d+\s*(小时前|分钟前|天前|周前|个月前|年前)$/.test(l))return 'drop';
 if(/^\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日$/.test(l))return 'drop';
 const c=v38CjkCount(l);const letters=(l.match(/[A-Za-z]/g)||[]).length;
 if(c===0 && letters>0 && l.length<90)return 'drop';
 if(c===0 && /^[\d\s\p{P}]+$/u.test(l))return 'drop';
 if(c<2 && l.length<6 && !/[。！？!?；;：:，,]/.test(l))return 'drop';
 return '';
}
function v38CleanLine(raw){
 let l=String(raw||'').replace(/\r/g,'').replace(/\u00a0/g,' ');
 l=v38Decode(l);
 l=l.replace(/!\[[^\]]*\]\([^)]+\)/g,'');
 l=l.replace(/\[([^\]]+)\]\((?:https?:\/\/|#|\/)[^)]+\)/g,'$1');
 l=l.replace(/`([^`\n]+)`/g,'$1').replace(/\*{1,3}([^*\n]+)\*{1,3}/g,'$1').replace(/_{1,2}([^_\n]+)_{1,2}/g,'$1');
 l=l.replace(/^#{1,6}\s*/,'').replace(/^[-*+•]\s+/,'');
 l=l.replace(/[ \t]+/g,' ').trim();
 return l;
}
function v38CleanRaw(raw,url=''){
 if(!raw)return'';
 let s=String(raw).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
 s=s.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<\/div>/gi,'\n').replace(/<\/h[1-6]>/gi,'\n');
 s=s.replace(/<[^>]+>/g,' ');
 s=v38Decode(s);
 const rawLines=s.split('\n');
 const out=[];let blank=false;const seen=new Map();
 for(let line of rawLines){
   let cleaned=v38CleanLine(line);
   const noise=v38NoiseLine(cleaned,url);
   if(noise==='blank'){if(out.length&&!blank){out.push('');blank=true;}continue;}
   if(noise==='drop')continue;
   if(cleaned.length>180){
     cleaned=cleaned.replace(/([。！？!?])\s*/g,'$1\n').replace(/([；;])\s*/g,'$1\n');
   }
   for(const part0 of cleaned.split('\n')){
     const part=v38CleanLine(part0);if(!part)continue;if(v38NoiseLine(part,url)==='drop')continue;
     const key=part.replace(/\s+/g,'');const c=v38CjkCount(part);
     if(key.length<18){const n=seen.get(key)||0;if(n>=1&&c<8)continue;seen.set(key,n+1);}
     out.push(part);blank=false;
   }
 }
 while(out.length&&!out[out.length-1])out.pop();
 let joined=out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
 if(v38CjkCount(joined)<20)return joined;
 const lines=joined.split('\n');
 while(lines.length && v38NoiseLine(lines[0],url)==='drop')lines.shift();
 while(lines.length && v38NoiseLine(lines[lines.length-1],url)==='drop')lines.pop();
 return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function v38ExtractBody(doc,url=''){
 const kill='script,style,noscript,iframe,img,video,audio,form,head,meta,link,nav,header,footer,aside,.nav,.navbar,.menu,.footer,.header,.share,.social,.ad,.ads,.advertisement,.promo,.related,.recommend,.cookie,.breadcrumb';
 try{doc.querySelectorAll(kill).forEach(e=>e.remove());}catch{}
 const selectors=['article','main','[role="main"]','.story-body','.article-body','.article__body','.article__body-content','.post-content','.entry-content','.chapter-content','.novel-content','.read-content','.content-main','#content','#main','.chapter','.story','.article'];
 let best=null,score=-1;
 for(const sel of selectors){try{doc.querySelectorAll(sel).forEach(el=>{const t=el.textContent||'';const c=v38CjkCount(t);if(c<40)return;const ps=el.querySelectorAll('p,li').length;const links=el.querySelectorAll('a').length;const sc=c+ps*30-links*12;if(sc>score){score=sc;best=el;}})}catch{}}
 if(!best){try{doc.querySelectorAll('div,section,article,main,td').forEach(el=>{const t=el.textContent||'';const c=v38CjkCount(t);if(c<40)return;const len=t.trim().length||1;const links=el.querySelectorAll('a').length;const ps=el.querySelectorAll('p,li').length;const sc=c*(c/len)+ps*18-links*8;if(sc>score){score=sc;best=el;}})}catch{}}
 return (best||doc.body||doc.documentElement).textContent||'';
}
function v38CleanHTML(html,url=''){
 try{const doc=new DOMParser().parseFromString(String(html||''),'text/html');return v38CleanRaw(v38ExtractBody(doc,url),url);}catch{return v38CleanRaw(html,url);}
}
async function v38FetchText(url){
 const prox=[u=>`https://r.jina.ai/${u}`,u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,u=>`https://corsproxy.io/?${encodeURIComponent(u)}`];
 let last;for(let i=0;i<prox.length;i++){
   try{const res=await fetch(prox[i](url),{signal:AbortSignal.timeout(26000)});if(!res.ok)throw new Error('HTTP '+res.status);const raw=await res.text();let text='';
     const trimmed=raw.trim();
     if(i===0){text=v38CleanRaw(trimmed.replace(/^---[\s\S]*?---\n/m,'').replace(/^Markdown Content:\s*/gmi,''),url);}else{text=(trimmed.startsWith('<')||/<html|<body|<article|<main/i.test(trimmed))?v38CleanHTML(trimmed,url):v38CleanRaw(trimmed,url);}
     if(v38CjkCount(text)<12)throw new Error('texto chinês insuficiente');return text;
   }catch(e){last=e;}
 }
 throw last||new Error('falha ao buscar URL');
}
function v38PageChars(){
 const fs=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||38;
 const vw=Math.min(window.innerWidth||390,900)-36;const vh=Math.max(420,(window.innerHeight||720)-145);
 const charsPerLine=Math.max(8,Math.floor(vw/(fs*.88)));const lines=Math.max(6,Math.floor(vh/(fs*1.42)));
 return Math.max(360,Math.floor(charsPerLine*lines*1.55));
}
function v38SplitText(text,baseTitle='Página'){
 text=v38CleanRaw(String(text||'')).replace(/\n{3,}/g,'\n\n');
 const limit=v38PageChars();if(v38CjkCount(text)<=limit*1.25)return [{num:1,title:baseTitle,content:text}];
 const paras=text.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);const units=[];
 for(const p of paras){if(v38CjkCount(p)>limit*.8){let buf='';for(const ch of [...p]){buf+=ch;if(/[。！？!?；;]/.test(ch)||v38CjkCount(buf)>limit*.55&&/[，,：:\n]/.test(ch)){units.push(buf.trim());buf='';}}if(buf.trim())units.push(buf.trim());}else units.push(p);}
 const pages=[];let cur='',n=1;for(const u of units){const sep=cur?'\n\n':'';if(v38CjkCount(cur+sep+u)>limit&&cur.trim()){pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});n++;cur='';}cur+=(cur?'\n\n':'')+u;}if(cur.trim())pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});return pages;
}
function v38ExpandSeg(){
 const extras=`香港国安法 解密档案 电视认罪 电视节目 新常态 国家安全 特区政府 推出 主题 正值 实施 铜锣湾 书店 林荣基 病逝 贩卖 中国大陆 政治禁书 政治 原因 被羁押 移居台湾 移居 表明 打死 回去 总统 赖清德 发文 表达 深切 哀悼 头条新闻 国安法 档案 认罪 文化 财经 主页 新闻 中国 香港 台湾 英国 BBC 中文 香港人 大陆 国安 安全案件 案件 涉及 宗教 社会 旅行 博物馆 参观 街道 干净 有意思 常用 日常生活 很常用 遗憾 感到遗憾 感情 感觉 表达感情 围棋 棋子 棋盘 网格 交叉点 双方 对弈 胜负 落子 悔棋 规定 过程 黑白 两种 先行 十九条 条线`.split(/\s+/);
 try{extras.forEach(w=>{if(w&&!SEG_WORDS.includes(w))SEG_WORDS.push(w);});SEG_WORDS.sort((a,b)=>b.length-a.length);['香港国安法','国家安全','特区政府','电视节目','中国大陆','政治禁书','头条新闻','有意思','博物馆','日常生活','感到遗憾'].forEach(w=>{if(!HSK_LEVEL.has(w))HSK_LEVEL.set(w,5);});}catch{}
}
const V38_EXTRA_SOURCES=[
 {cat:'Notícias modernas',type:'simple',level:4,title:'BBC 中文 — artigo específico',chars:'variável',url:'https://www.bbc.com/zhongwen/simp',desc:'Use preferencialmente uma notícia específica; o importador agora remove menus, horários e cabeçalhos.'},
 {cat:'Notícias modernas',type:'simple',level:5,title:'人民网 — 中文新闻',chars:'variável',url:'http://www.people.com.cn/',desc:'Fonte chinesa continental; ideal para importar artigos específicos.'},
 {cat:'Notícias modernas',type:'simple',level:5,title:'新华网 — 新闻',chars:'variável',url:'http://www.news.cn/',desc:'Notícias em chinês moderno; adicione artigos individuais para melhor resultado.'},
 {cat:'Notícias modernas',type:'simple',level:5,title:'央视网 — 新闻',chars:'variável',url:'https://news.cctv.com/',desc:'Textos jornalísticos modernos com vocabulário avançado.'},
 {cat:'Leituras graduadas',type:'simple',level:2,title:'Chinese Reading Practice',chars:'variável',url:'https://chinesereadingpractice.com/',desc:'Leituras curtas/médias para estudantes; importe páginas específicas.'},
 {cat:'Leituras graduadas',type:'simple',level:3,title:'Chinese at Ease — readings',chars:'variável',url:'https://www.chinese-at-ease.com/',desc:'Conteúdos de leitura e estudo; extração depende da página.'},
 {cat:'Wikisource',type:'book',level:6,title:'红楼梦 — Wikisource',chars:'muito grande',url:'https://zh.wikisource.org/wiki/%E7%B4%85%E6%A8%93%E5%A4%A2',desc:'Romance clássico público; importar capítulos específicos é recomendado.',chapters:[{num:1,title:'红楼梦 第一回',url:'https://zh.wikisource.org/wiki/%E7%B4%85%E6%A8%93%E5%A4%A2/%E7%AC%AC%E4%B8%80%E5%9B%9E'}]},
 {cat:'Wikisource',type:'book',level:6,title:'西游记 — Wikisource',chars:'muito grande',url:'https://zh.wikisource.org/wiki/%E8%A5%BF%E9%81%8A%E8%A8%98',desc:'Romance clássico público; capítulos longos.',chapters:[{num:1,title:'西游记 第一回',url:'https://zh.wikisource.org/wiki/%E8%A5%BF%E9%81%8A%E8%A8%98/%E7%AC%AC%E4%B8%80%E5%9B%9E'}]},
 {cat:'Clássicos',type:'book',level:6,title:'孟子 — CText',chars:'grande',url:'https://ctext.org/mengzi/zh',desc:'Texto clássico com capítulos; vocabulário avançado.',chapters:[{num:1,title:'梁惠王上',url:'https://ctext.org/mengzi/liang-hui-wang-i/zh'}]},
 {cat:'Clássicos',type:'book',level:6,title:'庄子 — CText',chars:'grande',url:'https://ctext.org/zhuangzi/zh',desc:'Clássico filosófico em capítulos.',chapters:[{num:1,title:'逍遥游',url:'https://ctext.org/zhuangzi/enjoyment-in-untroubled-ease/zh'}]}
];
function v38InstallSources(){try{const existing=new Set(V37_SOURCES.map(s=>s.title));V38_EXTRA_SOURCES.forEach(s=>{if(!existing.has(s.title))V37_SOURCES.push(s);});}catch{}}
async function v38AddSource(i){
 const s=V37_SOURCES[i];if(!s)return;showLoad('Polindo source...');
 try{const chapters=[];const rawCh=s.chapters||[{num:1,title:s.title,url:s.url,content:s.content||''}];
   for(const [idx,ch] of rawCh.entries()){let content=ch.content||'';if(!content&&ch.url){try{content=await v38FetchText(ch.url);}catch(e){content='';}}
     content=v38CleanRaw(content||`A extração automática não encontrou texto suficiente em ${ch.url||s.url}. Abra uma página de artigo/capítulo específico e importe por URL.`,ch.url||s.url);
     const pages=v38SplitText(content,ch.title||s.title||'Página');pages.forEach(p=>chapters.push({id:v29NewId(),num:chapters.length+1,title:pages.length>1?p.title:(ch.title||s.title||'Página'),content:p.content,progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url}));}
   const combined=v38CleanRaw(chapters.map(c=>c.content).join('\n\n'),s.url||'');const onePage=chapters.length<=1 && v38CjkCount(combined)<=v38PageChars()*1.30;
   if(s.type!=='book'||onePage){await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:combined,type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});toast(onePage&&s.type==='book'?'Conteúdo curto salvo em Leitura simples':'Leitura adicionada');v38SetMode('simple');}
   else{await dbPut(STB,{id:v29NewId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});toast(`Livro adicionado com ${chapters.length} páginas`);v38SetMode('books');}
   books=await dbAll(STB);renderLib();}
 catch(e){toast('Falha ao importar: '+(e.message||e));}finally{hideLoad();}
}
function v38RenderDiscover(){const dc=document.getElementById('dc');if(!dc)return;const cats=[...new Set(V37_SOURCES.map(s=>s.cat||'Sources'))];dc.innerHTML=cats.map(cat=>`<div class="src-section"><div class="sgt">${esc(cat)}</div><div class="src-grid">${V37_SOURCES.map((s,i)=>({s,i})).filter(x=>(x.s.cat||'Sources')===cat).map(({s,i})=>`<div class="src-card2 ${s.type==='book'?'long-src':''}"><div class="src-ico2" style="background:linear-gradient(135deg,#26221d,rgba(var(--ac-rgb),.5),var(--ac))">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-badges"><span class="src-badge">HSK ${s.level||'?'}</span><span class="src-badge">${s.type==='book'?'Livro/páginas':'Leitura simples'}</span><span class="src-badge">${esc(s.chars||'variável')} chars</span></div><div class="src-desc2">${esc(s.desc||'')}</div><div class="src-actions2"><button class="pri hr36-noemoji" data-v38-add="${i}">${v37Svg('plus')}Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${v37Svg('link')}Abrir fonte</a>`:''}</div></div></div>`).join('')}</div></div>`).join('');dc.querySelectorAll('[data-v38-add]').forEach(b=>b.onclick=()=>v38AddSource(+b.dataset.v38Add));}
function v38SetMode(mode){try{v29LibMode=mode;localStorage.setItem('hlibMode',mode);showScreen('sl');renderLib();}catch{}}
function v38AddLP(el,fn){let t=0,sx=0,sy=0,fired=false;const cancel=()=>{if(t)clearTimeout(t);t=0};el.addEventListener('touchstart',e=>{fired=false;const p=e.touches&&e.touches[0];sx=p?p.clientX:0;sy=p?p.clientY:0;cancel();t=setTimeout(()=>{if(Date.now()<(window.__v38NoChapterUntil||0))return;fired=true;fn(e);},680);},{passive:true});el.addEventListener('touchmove',e=>{const p=e.touches&&e.touches[0];if(p&&(Math.abs(p.clientX-sx)>12||Math.abs(p.clientY-sy)>12))cancel();},{passive:true});el.addEventListener('touchend',cancel,{passive:true});el.addEventListener('touchcancel',cancel,{passive:true});el.addEventListener('mousedown',e=>{if(e.button!==0)return;fired=false;sx=e.clientX;sy=e.clientY;cancel();t=setTimeout(()=>{if(Date.now()<(window.__v38NoChapterUntil||0))return;fired=true;fn(e);},720);});el.addEventListener('mousemove',e=>{if(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10)cancel();});['mouseup','mouseleave'].forEach(ev=>el.addEventListener(ev,cancel));el.addEventListener('click',e=>{if(fired){e.preventDefault();e.stopPropagation();fired=false;}},true);}
async function v38MigrateStored(){
 try{if(!db){setTimeout(v38MigrateStored,800);return;}if(localStorage.getItem('hmig38')==='1')return;let changed=false;const list=await dbAll(STB);
   for(const b of list){if((h36BookKind(b)==='book')&&h36Chapters(b).length){let combined=v38CleanRaw(h36Chapters(b).map(c=>c.content||'').join('\n\n'),b.source||'');if(!combined)continue;const pages=v38SplitText(combined,b.title||'Página');if(pages.length<=1||v38CjkCount(combined)<=v38PageChars()*1.3){b.kind='simple';b.content=combined;b.type='source';delete b.chapters;b.progress=0;changed=true;await dbPut(STB,b);}else{b.chapters=pages.map((p,i)=>({id:(h36Chapters(b)[i]&&h36Chapters(b)[i].id)||v29NewId(),num:i+1,title:p.title,content:p.content,progress:0,addedAt:Date.now(),sourceUrl:b.source||''}));b.lastChapterIndex=Math.min(b.lastChapterIndex||0,b.chapters.length-1);changed=true;await dbPut(STB,b);}}
     else if(b.content){const c=v38CleanRaw(b.content,b.source||'');if(c&&c!==b.content){b.content=c;changed=true;await dbPut(STB,b);}}
   }
   localStorage.setItem('hmig38','1');if(changed){books=await dbAll(STB);renderLib();toast('Sources salvas foram repolidas');}}
 catch(e){console.warn('mig38',e);}
}
function v38PatchGlobals(){try{cleanRaw=v38CleanRaw;cleanHTML=v38CleanHTML;extractBody=v38ExtractBody;fetchText=v38FetchText;v37Fetch=v38FetchText;v37PageChars=v38PageChars;v37SplitText=v38SplitText;v37AddSource=v38AddSource;renderDiscover=v38RenderDiscover;addLP=v38AddLP;}catch(e){console.warn('v38 globals',e);}try{if(typeof v29OpenChapterPicker==='function'){const old=v29OpenChapterPicker;v29OpenChapterPicker=function(id){if(Date.now()<(window.__v38NoChapterUntil||0))return;return old(id);};}}catch{}}
function v38InstallBackGuard(){document.addEventListener('touchstart',e=>{if(e.target.closest('#bback,#reader-top-back,.reader-top-back'))window.__v38NoChapterUntil=Date.now()+1400;},true);document.addEventListener('click',e=>{if(e.target.closest('#bback,#reader-top-back,.reader-top-back'))window.__v38NoChapterUntil=Date.now()+1400;},true);}
function v38Boot(){v38Style();v38ExpandSeg();v38InstallSources();v38PatchGlobals();v38InstallBackGuard();try{v38RenderDiscover();renderLib();}catch{}const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=V38_VERSION;v38MigrateStored();}
setTimeout(v38Boot,500);setTimeout(v38Boot,1500);setTimeout(v38Boot,3000);window.addEventListener('resize',()=>{try{v38PatchGlobals();renderLib();}catch{}},{passive:true});
})();
