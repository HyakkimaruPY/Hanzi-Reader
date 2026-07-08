
(function(){
'use strict';
const H48_VERSION='v4.8-extractor-generate-selection-tts';
const H48_BLOCK_TAGS=new Set('P DIV SECTION ARTICLE MAIN HEADER FOOTER ASIDE LI UL OL H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE TD TR BR'.split(' '));
let H48_full={state:'idle',key:'',text:'',chunks:[],idx:0,audio:null,error:''};
let H48_sel={key:'',text:'',state:'idle',chunks:[],idx:0,audio:null,timer:0};
let H48_mutObs=null;
function H48_log(kind,title,data,status){try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}catch{}}
function H48_toast(msg){try{(window.h42Toast||window.h41Toast||window.toast||alert)(String(msg||''));}catch{try{console.warn(msg);}catch{}}}
function H48_cjkCount(s){return [...String(s||'')].filter(ch=>/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)).length;}
function H48_hash(s){s=String(s||'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+'-'+s.length+'-'+H48_cjkCount(s);}
function H48_decode(s){s=String(s||'');try{const ta=document.createElement('textarea');ta.innerHTML=s;return ta.value;}catch{return s;}}
function H48_lineNoise(line,url=''){
 line=String(line||'').trim();if(!line)return'blank';
 const cjk=H48_cjkCount(line), len=[...line].length;
 if(/^https?:\/\//i.test(line)||/^(www\.|mailto:)/i.test(line))return'drop';
 if(/(?:https?:\/\/|www\.|\.com\b|\.cn\b|\.org\b|\.net\b)/i.test(line)&&cjk<16)return'drop';
 if(/^(Title|URL Source|Markdown Content|Published Time|Image|Skip to content|Jump to content|Menu|Search)$/i.test(line))return'drop';
 if(/^(首页|主菜单|菜单|导航|搜索|登录|注册|个人工具|工具|跳转到内容|移至侧栏|隐藏|显示|阅读|查看源代码|查看历史|讨论|编辑|帮助|联系我们|隐私|资助|下载为PDF|可打印版|打开|关闭|更多|上一页|下一页|上一篇|下一篇|返回|目录|分类|标签|评论|分享|订阅|广告|推荐|相关新闻|相关阅读|版权|免责声明|来源|作者|发布时间|浏览次数|扫一扫|二维码|客户端|手机版)$/.test(line))return'drop';
 if(/^(当前位置|您的位置|面包屑|专题|频道|栏目|友情链接|ICP备案|公安备案|Copyright|©)/i.test(line))return'drop';
 if(/[|｜]{2,}/.test(line)&&cjk<28)return'drop';
 if((line.match(/[\[\]{}<>]/g)||[]).length>3&&cjk<20)return'drop';
 if(cjk<2&&len<80)return'drop';
 if(cjk>0){const ratio=cjk/Math.max(1,len);if(ratio<0.18&&cjk<12)return'drop';}
 if(len<=6&&/^(更多|详情|全文|收起|展开|原文|来源|作者|分享|评论)$/.test(line))return'drop';
 return'keep';
}
function H48_cleanLine(line){
 let s=H48_decode(line);
 s=s.replace(/[\u200b-\u200f\ufeff]/g,'')
    .replace(/&(?:nbsp|ensp|emsp);/gi,' ')
    .replace(/https?:\/\/\S+/gi,' ')
    .replace(/\bwww\.[^\s，。！？；：、]+/gi,' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]\n]{1,120})\]\([^)]*\)/g,'$1')
    .replace(/!\[[^\]]*\]\([^)]*$/,' ')
    .replace(/\[([^\]\n]{0,120})\]\($/,'$1')
    .replace(/^\s*\)\s*/,'')
    .replace(/^\s{0,3}#{1,6}\s*/,'')
    .replace(/^[\s>*_`~•·\-—–]+/,'')
    .replace(/[\t\v\f]+/g,' ')
    .replace(/[ ]{2,}/g,' ')
    .replace(/\s+([，。！？、；：）】》」』])/g,'$1')
    .replace(/([（【《「『])\s+/g,'$1')
    .trim();
 return s;
}
function H48_cleanText(raw,url='',opts={}){
 if(raw==null)return'';
 let s=String(raw).replace(/\r\n/g,'\n').replace(/\r/g,'\n');
 s=s.replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi,'\n')
    .replace(/<[^>]+>/g,' ');
 s=H48_decode(s);
 s=s.replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g,'')
    .replace(/[\ue000-\uf8ff]/g,'')
    .replace(/\[(?:\d{1,3}|注\s?\d{0,3}|citation needed|编辑|來源請求)\]/gi,'')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF」』”’）】》])[ \t]*,+[ \t]*/g,'$1，')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF」』”’）】》])[ \t]*\.(?=[ \t]|$)/gm,'$1。')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF])[ \t]*;[ \t]*/g,'$1；')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF])[ \t]*\?+[ \t]*/g,'$1？')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF])[ \t]*!+[ \t]*/g,'$1！')
    .replace(/([，。！？；：、])\1+/g,'$1')
    .replace(/([\u3400-\u9fff\uF900-\uFAFF])[ \t]+(?=[\u3400-\u9fff\uF900-\uFAFF，。！？；：、])/g,'$1');
 s=s.replace(/^---[\s\S]*?---\s*/,'')
    .replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gmi,'')
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/`([^`\n]+)`/g,'$1')
    .replace(/\|[^\n]+\|/g,' ');
 const input=s.split('\n');
 const out=[];let blank=false;const seen=new Set();
 for(let line of input){
   line=H48_cleanLine(line);
   if(line.length>220){line=line.replace(/([。！？!?；;])\s*/g,'$1\n').replace(/([，,：:])\s+/g,'$1\n');}
   const parts=line.split('\n');
   for(let part of parts){
     part=H48_cleanLine(part);
     const noise=H48_lineNoise(part,url);
     if(noise==='blank'){if(out.length&&!blank){out.push('');blank=true;}continue;}
     if(noise==='drop')continue;
     const cjk=H48_cjkCount(part);
     if(opts.strictChinese&&cjk<2)continue;
     const key=part.replace(/\s+/g,'');
     if(key.length<90&&seen.has(key))continue;
     if(key)seen.add(key);
     out.push(part);blank=false;
   }
 }
 while(out.length&&!out[out.length-1])out.pop();
 return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function H48_nodeText(root){
 const skip='script,style,noscript,iframe,img,video,audio,form,button,input,textarea,select,nav,header,footer,aside,svg,canvas,.nav,.navbar,.menu,.footer,.header,.share,.social,.ad,.ads,.advertisement,.promo,.related,.recommend,.cookie,.breadcrumb,.comment,.comments,.sidebar,.toolbar,.pagination,.mw-editsection,.metadata,.catlinks,.printfooter,#toc,#footer,#mw-navigation,#p-navigation,#p-tb,#p-personal';
 function walk(node){
   if(!node)return'';
   if(node.nodeType===Node.TEXT_NODE)return node.nodeValue||'';
   if(node.nodeType!==Node.ELEMENT_NODE)return'';
   const el=node;
   try{if(el.matches(skip)||el.closest('[aria-hidden="true"],[hidden]'))return'';}catch{}
   if(el.tagName==='BR')return'\n';
   let out='';
   const block=H48_BLOCK_TAGS.has(el.tagName);
   if(block)out+='\n';
   for(const ch of el.childNodes)out+=walk(ch);
   if(block)out+='\n';
   return out;
 }
 return walk(root);
}
function H48_scoreElement(el,url=''){
 let t=H48_cleanText(H48_nodeText(el),url,{strictChinese:false});
 const cjk=H48_cjkCount(t);if(cjk<30)return {score:-1,text:t,cjk};
 const len=[...t].length||1;
 let linkCjk=0,linkLen=0,links=0;try{el.querySelectorAll('a').forEach(a=>{links++;const at=a.textContent||'';linkCjk+=H48_cjkCount(at);linkLen+=at.length;});}catch{}
 const paras=(t.match(/\n/g)||[]).length+1;
 const punct=(t.match(/[。！？；]/g)||[]).length;
 const cls=((el.id||'')+' '+(el.className||'')).toString().toLowerCase();
 const bad=/(nav|menu|foot|head|side|comment|share|related|recommend|breadcrumb|toolbar|pagination|login|search)/.test(cls)?250:0;
 const linkDensity=linkCjk/Math.max(1,cjk);
 const cjkRatio=cjk/len;
 const score=cjk*1.6 + punct*12 + paras*14 + cjkRatio*80 - links*3 - linkDensity*420 - linkLen*0.08 - bad;
 return {score,text:t,cjk};
}
function H48_extractHtml(html,url=''){
 let doc;try{doc=new DOMParser().parseFromString(String(html||''),'text/html');}catch{return H48_cleanText(html,url,{strictChinese:true});}
 try{doc.querySelectorAll('script,style,noscript,iframe,img,video,audio,form,head,meta,link,nav,header,footer,aside,.nav,.navbar,.menu,.footer,.header,.share,.social,.ad,.ads,.advertisement,.promo,.related,.recommend,.cookie,.breadcrumb,.comment,.comments,.sidebar,.toolbar,.pagination,.mw-editsection,.metadata,.catlinks,.printfooter,#toc,#footer,#mw-navigation,#p-navigation,#p-tb,#p-personal').forEach(e=>e.remove());}catch{}
 const selectors=['article','main','[role="main"]','#mw-content-text','.mw-parser-output','.mw-body-content','.poem','.mw-content-ltr','.story-body','.article-body','.article__body','.article__body-content','.post-content','.entry-content','.chapter-content','.novel-content','.read-content','.content-main','#content','#main','.chapter','.story','.article','.content','.text'];
 const cands=[];
 for(const sel of selectors){try{doc.querySelectorAll(sel).forEach(el=>cands.push(el));}catch{}}
 try{doc.querySelectorAll('div,section,article,main,td,body').forEach(el=>{if((el.textContent||'').length>80)cands.push(el);});}catch{}
 let best={score:-1,text:'',cjk:0};const seen=new Set();
 for(const el of cands){if(!el||seen.has(el))continue;seen.add(el);const sc=H48_scoreElement(el,url);if(sc.score>best.score)best=sc;}
 let text=best.text||H48_nodeText(doc.body||doc.documentElement);
 text=H48_cleanText(text,url,{strictChinese:true});
 if(H48_cjkCount(text)<30){
   const fallback=H48_cleanText((doc.body||doc.documentElement).textContent||'',url,{strictChinese:true});
   if(H48_cjkCount(fallback)>H48_cjkCount(text))text=fallback;
 }
 H48_log('source.extract.h48','HTML extraído',{url,chars:text.length,cjk:H48_cjkCount(text),score:best.score,preview:text.slice(0,600)},H48_cjkCount(text)>20?'ok':'warn');
 return text;
}
function H48_jsonCollect(obj,url='',depth=0,bag=[]){
 if(depth>8||obj==null)return bag;
 if(typeof obj==='string'){const s=obj.trim();if(!s)return bag;if(/<html|<body|<article|<main|<p[\s>]|<div[\s>]/i.test(s))bag.push(H48_extractHtml(s,url));else bag.push(H48_cleanText(s,url,{strictChinese:false}));return bag;}
 if(Array.isArray(obj)){obj.forEach(x=>H48_jsonCollect(x,url,depth+1,bag));return bag;}
 if(typeof obj==='object'){
   const priority=['contents','content','body','text','html','markdown','article','chapter','chapterContent','paragraphs','plain','data','result','results','items','response','message','summary','description','title'];
   for(const k of priority){if(Object.prototype.hasOwnProperty.call(obj,k))H48_jsonCollect(obj[k],url,depth+1,bag);}
   for(const [k,v] of Object.entries(obj)){if(!priority.includes(k)&&!/^(url|href|src|link|id|guid|uuid|date|time|author|avatar|image|thumbnail)$/i.test(k))H48_jsonCollect(v,url,depth+1,bag);}
 }
 return bag;
}
function H48_parseJsonish(raw){let t=String(raw||'').replace(/^\uFEFF/,'').trim();if(!t)throw new Error('resposta vazia');try{return JSON.parse(t);}catch{}let a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1));}catch{}}a=t.indexOf('[');b=t.lastIndexOf(']');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1));}catch{}}throw new Error('JSON inválido');}
function H48_textFromRaw(raw,contentType='',url='',proxyId=''){
 const trimmed=String(raw||'').trim();if(!trimmed)return'';
 let parsed=null;if(/json/i.test(contentType)||/^[{\[]/.test(trimmed)){try{parsed=H48_parseJsonish(trimmed);}catch{}}
 if(parsed!=null){
   const parts=H48_jsonCollect(parsed,url).map(x=>H48_cleanText(x,url,{strictChinese:true})).filter(x=>H48_cjkCount(x)>2);
   const uniq=[],seen=new Set();for(const p of parts){const k=p.replace(/\s+/g,'').slice(0,240);if(k&&!seen.has(k)){seen.add(k);uniq.push(p);}}
   const joined=H48_cleanText(uniq.join('\n\n'),url,{strictChinese:true});if(H48_cjkCount(joined)>8)return joined;
 }
 if(/^\s*</.test(trimmed)||/<html|<body|<article|<main|<p[\s>]|<div[\s>]/i.test(trimmed))return H48_extractHtml(trimmed,url);
 return H48_cleanText(trimmed,url,{strictChinese:true});
}
const H48_TEXT_PROXIES=[
 {id:'direct',direct:true,url:u=>u,timeout:8500},
 {id:'jina-reader',url:u=>'https://r.jina.ai/'+u,timeout:22000},
 {id:'jina-reader-http-path',url:u=>'https://r.jina.ai/http://'+u.replace(/^https?:\/\//i,''),timeout:22000},
 {id:'allorigins-raw',url:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),timeout:20000},
 {id:'allorigins-get-json',url:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u),timeout:20000},
 {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u),timeout:20000},
 {id:'codetabs',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u),timeout:20000},
 {id:'isomorphic-git',url:u=>'https://cors.isomorphic-git.org/'+u,timeout:18000},
 {id:'thingproxy',url:u=>'https://thingproxy.freeboard.io/fetch/'+u,timeout:18000},
 {id:'cors-eu',url:u=>'https://cors.eu.org/'+u,timeout:18000}
];
function H48_customTextProxies(){try{const arr=JSON.parse(localStorage.getItem('h48.textProxies')||localStorage.getItem('h46.textProxies')||'[]');if(!Array.isArray(arr))return[];return arr.filter(Boolean).map((base,i)=>({id:'custom-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),timeout:20000}));}catch{return[];}}
async function H48_fetchTimeout(url,init={},ms=14000){const ctl=new AbortController();const t=setTimeout(()=>{try{ctl.abort('timeout')}catch{}},ms);try{return await fetch(url,{...init,signal:ctl.signal});}finally{clearTimeout(t);}}
async function H48_fetchText(url){
 url=String(url||'').trim();if(!/^https?:\/\//i.test(url))throw new Error('URL inválida: use http/https');
 const routes=H48_TEXT_PROXIES.concat(H48_customTextProxies());let last=null;const failures=[];
 for(const p of routes){const target=p.url(url);try{
   H48_log('source.fetch.h48','tentando extrair source',{proxy:p.id,target},'');
   const r=await H48_fetchTimeout(target,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{Accept:'text/html,application/json,text/plain,*/*'}},p.timeout||18000);
   const raw=await r.text();if(!r.ok)throw new Error('HTTP '+r.status);
   const text=H48_textFromRaw(raw,r.headers.get('content-type')||'',url,p.id);
   const cjk=H48_cjkCount(text);H48_log('source.fetch.h48','parser final',{proxy:p.id,chars:text.length,cjk,preview:text.slice(0,900)},cjk>=10?'ok':'warn');
   if(!text||cjk<10)throw new Error('texto chinês insuficiente depois do parser');
   return text;
 }catch(e){last=e;failures.push({proxy:p.id,error:e.message||String(e)});H48_log('source.fetch.h48','rota falhou',{proxy:p.id,error:e.message||String(e)},'error');}}
 H48_log('source.fetch.h48','todas as rotas falharam',{url,failures},'error');
 throw new Error('falha ao buscar/extrair texto. Último erro: '+(last?.message||last||'desconhecido'));
}
function H48_readerDomText(){
 const root=document.getElementById('rtext');if(!root)return'';
 function read(el){
   if(!el)return'';if(el.nodeType===Node.TEXT_NODE)return el.nodeValue||'';if(el.nodeType!==Node.ELEMENT_NODE)return'';
   const cl=el.classList;if(cl&&cl.contains('wunit')){return [...el.querySelectorAll('.hzch')].map(x=>x.textContent||'').join('')||(el.querySelector('.hzrow')?.textContent||'');}
   if(cl&&cl.contains('hzch'))return el.textContent||'';if(cl&&cl.contains('pt'))return el.textContent||'';if(cl&&cl.contains('sp'))return cl.contains('lg')?'  ':' ';if(cl&&cl.contains('pb'))return'\n';
   if(el.matches('script,style,svg,button,nav,input,textarea,select,.pyrow,.pychar,rt,.rbnav,.reader-ctrl,.selbar,.tip,.toast,.lo'))return'';
   let out='';for(const ch of el.childNodes)out+=read(ch);return out;
 }
 return H48_cleanText([...root.childNodes].map(read).join('\n'),'',{strictChinese:true});
}
function H48_readerBookText(){try{const b=(typeof curBook!=='undefined'&&curBook)?curBook:window.curBook;if(!b)return'';const idx=b._readingChapterIndex??b.lastChapterIndex??b.lastChapter??0;const chs=b.chapters||b.pages||b.sections;if(chs&&chs[idx])return H48_cleanText(chs[idx].content||chs[idx].text||chs[idx].body||chs[idx].html||chs[idx].markdown||'',b.source||'',{strictChinese:true});return H48_cleanText(b.content||b.text||b.body||b.html||b.markdown||'',b.source||'',{strictChinese:true});}catch{return'';}}
function H48_readerText(){
 let dom=H48_readerDomText();if(H48_cjkCount(dom)>=5)return dom;
 let book=H48_readerBookText();if(H48_cjkCount(book)>=5)return book;
 try{if(Array.isArray(readerTokens)&&readerTokens.length)return H48_cleanText(readerTokens.map(x=>x.word||x.char||'').join(''),'',{strictChinese:true});}catch{}
 return'';
}
function H48_splitText(text,maxLen=1650){
 text=H48_cleanText(text,'',{strictChinese:true});if(!text)return[];
 const blocks=text.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);const units=[];
 for(const b of blocks){if(b.length>maxLen*.75){let cur='';for(const ch of [...b]){cur+=ch;if(/[。！？!?；;]/.test(ch)||cur.length>maxLen*.62&&/[，,：:、]/.test(ch)){units.push(cur.trim());cur='';}}if(cur.trim())units.push(cur.trim());}else units.push(b);}
 const out=[];let cur='';for(const u of units){const sep=cur?'\n\n':'';if((cur+sep+u).length>maxLen&&cur){out.push(cur.trim());cur=u;}else cur+=sep+u;}if(cur.trim())out.push(cur.trim());return out;
}
async function H48_edgeBlobs(text,onProgress){
 const build=window.h42BuildSsml||window.H46_buildSsml;const audio=window.h42AudioFromSsml||window.H46_audioFromSsml;const settings=(window.h42Settings?window.h42Settings():{});
 if(typeof build!=='function'||typeof audio!=='function')throw new Error('motor Edge TTS não expôs geração por SSML');
 const chunks=H48_splitText(text,1650);if(!chunks.length)throw new Error('sem texto limpo para gerar');
 const blobs=[];for(let i=0;i<chunks.length;i++){onProgress&&onProgress(i,chunks.length);const ssml=build(chunks[i],settings);blobs.push(await audio(ssml,settings));await new Promise(r=>setTimeout(r,70));}
 return blobs;
}
function H48_revoke(obj){try{if(obj.audio)obj.audio.pause();}catch{}try{(obj.chunks||[]).forEach(c=>{if(c.url)URL.revokeObjectURL(c.url);});}catch{}obj.audio=null;obj.chunks=[];obj.idx=0;}
/* v4.8.2: antes, todos os blobs de audio gerados por bloco eram concatenados num unico Blob e tocados
   como um so <audio>. Isso corta a leitura no meio do texto: containers como webm/opus nao concatenam
   corretamente (cada arquivo tem seu proprio cabecalho/duracao), e ate mp3 pode ser cortado cedo pelos
   metadados (Xing/LAME) do primeiro bloco. Agora guardamos uma "playlist" de blobs/URLs e tocamos um
   atras do outro no MESMO elemento <audio>, avançando automaticamente no evento 'ended'. */
function H48_playPlaylist(obj,onUpdate){
 if(!obj.audio)obj.audio=new Audio();
 const a=obj.audio;
 const playIdx=(i)=>{
   if(i<0)i=0;
   if(i>=obj.chunks.length){obj.idx=obj.chunks.length;obj.state='ready';onUpdate&&onUpdate();return;}
   obj.idx=i;a.src=obj.chunks[i].url;
   a.play().then(()=>{obj.state='playing';onUpdate&&onUpdate();}).catch(e=>{obj.state='error';obj.error=e.message||String(e);onUpdate&&onUpdate();});
 };
 a.onended=()=>playIdx(obj.idx+1);
 a.onerror=()=>{obj.state='error';onUpdate&&onUpdate();};
 playIdx(obj.idx||0);
}
function H48_setMainSub(txt){const s=document.getElementById('read-speed');if(s&&!s.classList.contains('h48-hidden'))s.textContent=txt||'';}
function H48_updateMainButton(){
 const b=document.getElementById('read-play'),s=document.getElementById('read-speed');if(!b)return;
 b.classList.add('h48-tts-main');b.disabled=H48_full.state==='generating';b.classList.toggle('h48-working',H48_full.state==='generating');b.classList.toggle('on',H48_full.state==='playing');
 if(H48_full.state==='generating')b.innerHTML='<span class="h48-spin"></span>Gerando…';
 else if(H48_full.state==='ready')b.textContent=H48_full.idx>=H48_full.chunks.length&&H48_full.chunks.length?'Reproduzir áudio':'Reproduzir áudio';
 else if(H48_full.state==='playing')b.textContent='Pausar';
 else if(H48_full.state==='error')b.textContent='Gerar novamente';
 else b.textContent='Gerar áudio';
 if(s){s.classList.add('h48-substatus');s.style.display='inline-flex';if(!s.textContent||H48_full.state==='idle')s.textContent='Texto limpo via ideogramas';}
}
function H48_currentKey(text){let id='';try{const b=(typeof curBook!=='undefined'&&curBook)?curBook:window.curBook;id=(b?.id||'')+':'+(b?._readingChapterIndex??b?.lastChapterIndex??0);}catch{}return id+':'+H48_hash(text);}
async function H48_prepareFull(){
 const text=H48_readerText();const cjk=H48_cjkCount(text);if(cjk<1){H48_toast('Não encontrei ideogramas limpos para gerar áudio.');return;}
 const key=H48_currentKey(text);if(H48_full.state==='ready'&&H48_full.key===key&&H48_full.chunks.length)return;
 H48_revoke(H48_full);H48_full={state:'generating',key,text,chunks:[],idx:0,audio:null,error:''};H48_updateMainButton();H48_log('edge.full.generate.h48','gerando áudio completo',{chars:text.length,cjk,preview:text.slice(0,900)},'ok');
 try{
   const blobs=await H48_edgeBlobs(text,(i,n)=>H48_setMainSub(`Gerando bloco ${i+1}/${n}…`));
   H48_full.chunks=blobs.map(b=>({blob:b,url:URL.createObjectURL(b)}));H48_full.state='ready';H48_full.idx=0;
   H48_setMainSub(`${blobs.length} bloco(s) • ${Math.ceil(text.length/100)/10}k chars • pronto`);
 }
 catch(e){H48_full.state='error';H48_full.error=e.message||String(e);H48_setMainSub('Falha: '+H48_full.error);H48_log('edge.full.generate.h48','falha ao gerar áudio completo',{error:H48_full.error},'error');H48_toast('Falha ao gerar áudio: '+H48_full.error);}
 finally{H48_updateMainButton();}
}
async function H48_playFull(){
 const text=H48_readerText();const key=H48_currentKey(text);
 if(H48_full.state==='playing'){try{H48_full.audio.pause();}catch{}H48_full.state='ready';H48_updateMainButton();return;}
 if(H48_full.key!==key||!H48_full.chunks.length){await H48_prepareFull();if(H48_full.state!=='ready')return;}
 try{const old=(window.curAudio||null);if(old&&old!==H48_full.audio)old.pause();}catch{}
 if(!H48_full.audio)H48_full.audio=new Audio();
 try{curAudio=H48_full.audio;}catch{}window.curAudio=H48_full.audio;
 if(H48_full.idx>=H48_full.chunks.length)H48_full.idx=0;
 H48_playPlaylist(H48_full,()=>{
   if(H48_full.state==='playing')H48_setMainSub(`Reproduzindo bloco ${H48_full.idx+1}/${H48_full.chunks.length}`);
   else if(H48_full.state==='ready'&&H48_full.idx>=H48_full.chunks.length)H48_setMainSub('Áudio completo — fim da leitura');
   else if(H48_full.state==='error')H48_setMainSub('Falha ao reproduzir bloco '+(H48_full.idx+1));
   H48_updateMainButton();
 });
}
async function H48_mainClick(){if(H48_full.state==='idle'||H48_full.state==='error')await H48_prepareFull();else if(H48_full.state==='generating')return;else await H48_playFull();}
function H48_resetFull(){H48_revoke(H48_full);H48_full={state:'idle',key:'',text:'',chunks:[],idx:0,audio:null,error:''};H48_setMainSub('Texto limpo via ideogramas');H48_updateMainButton();}
function H48_selectionText(){
 const sel=window.getSelection&&window.getSelection();if(!sel||sel.rangeCount===0||sel.isCollapsed)return'';
 const root=document.getElementById('rtext');if(!root)return'';
 try{let ok=false;for(let i=0;i<sel.rangeCount;i++){const r=sel.getRangeAt(i);if(root.contains(r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentNode)){ok=true;break;}}if(!ok)return'';}catch{}
 return H48_cleanText(sel.toString(),'',{strictChinese:true});
}
function H48_ensureSelectionBar(){let bar=document.getElementById('h48-selbar');if(bar)return bar;document.body.insertAdjacentHTML('beforeend','<div id="h48-selbar" class="h48-selbar"><div class="h48-sel-text" id="h48-sel-text">Trecho selecionado</div><button id="h48-sel-btn" type="button">Gerar trecho</button><button id="h48-sel-x" type="button" aria-label="Fechar">×</button></div>');bar=document.getElementById('h48-selbar');document.getElementById('h48-sel-x').onclick=()=>{bar.classList.remove('show');};document.getElementById('h48-sel-btn').onclick=()=>H48_playSelection();return bar;}
function H48_updateSelectionBar(label){const bar=H48_ensureSelectionBar();const t=document.getElementById('h48-sel-text'),b=document.getElementById('h48-sel-btn');if(t)t.textContent=(H48_sel.text||'').slice(0,42)+(H48_sel.text&&H48_sel.text.length>42?'…':'');if(b){b.disabled=H48_sel.state==='generating';if(H48_sel.state==='generating')b.innerHTML='<span class="h48-spin"></span>Gerando';else if(H48_sel.state==='ready')b.textContent=label||(H48_sel.idx>=H48_sel.chunks.length?'Reproduzir trecho':'Reproduzir trecho');else if(H48_sel.state==='playing')b.textContent='Pausar trecho';else b.textContent='Gerar trecho';}bar.classList.add('show');}
async function H48_prepareSelection(text,autoplay=true){
 text=H48_cleanText(text,'',{strictChinese:true});if(H48_cjkCount(text)<1)return;const key=H48_hash(text);if(H48_sel.key===key&&H48_sel.state==='ready'&&H48_sel.chunks.length){if(autoplay)await H48_playSelection();return;}
 H48_revoke(H48_sel);H48_sel={key,text,state:'generating',chunks:[],idx:0,audio:null};H48_updateSelectionBar();H48_log('edge.selection.h48','gerando trecho selecionado',{chars:text.length,cjk:H48_cjkCount(text),preview:text.slice(0,300)},'ok');
 try{
   const blobs=await H48_edgeBlobs(text);
   H48_sel.chunks=blobs.map(b=>({blob:b,url:URL.createObjectURL(b)}));H48_sel.state='ready';H48_sel.idx=0;H48_updateSelectionBar();
   if(autoplay)await H48_playSelection();
 }
 catch(e){H48_sel.state='idle';H48_updateSelectionBar('Gerar de novo');H48_toast('Falha no trecho: '+(e.message||e));H48_log('edge.selection.h48','falha trecho',{error:e.message||String(e)},'error');}
}
async function H48_playSelection(){
 if(H48_sel.state==='playing'){try{H48_sel.audio.pause();}catch{}H48_sel.state='ready';H48_updateSelectionBar();return;}
 if(H48_sel.state!=='ready'||!H48_sel.chunks.length){const text=H48_selectionText()||H48_sel.text;if(text)await H48_prepareSelection(text,true);return;}
 try{const old=(window.curAudio||null);if(old&&old!==H48_sel.audio)old.pause();}catch{}
 if(!H48_sel.audio)H48_sel.audio=new Audio();
 try{curAudio=H48_sel.audio;}catch{}window.curAudio=H48_sel.audio;
 if(H48_sel.idx>=H48_sel.chunks.length)H48_sel.idx=0;
 try{H48_playPlaylist(H48_sel,()=>H48_updateSelectionBar());}
 catch(e){H48_sel.state='ready';H48_updateSelectionBar();H48_toast('Falha ao reproduzir trecho: '+(e.message||e));}
}
function H48_scheduleSelection(){clearTimeout(H48_sel.timer);H48_sel.timer=setTimeout(()=>{const text=H48_selectionText();if(H48_cjkCount(text)<1)return;const key=H48_hash(text);H48_sel.text=text;H48_updateSelectionBar('Preparando…');if(key!==H48_sel.key||H48_sel.state==='idle')H48_prepareSelection(text,true);},720);}
const H48_EXTRA_SOURCES=[
 {cat:'Notícias / chinês moderno',type:'simple',level:5,title:'中国新闻网 — artigos',chars:'variável',url:'https://www.chinanews.com.cn/',desc:'Fonte jornalística chinesa; melhor importar a URL do artigo.'},
 {cat:'Notícias / chinês moderno',type:'simple',level:5,title:'光明网 — artigos',chars:'variável',url:'https://www.gmw.cn/',desc:'Textos modernos; parser tenta remover menus e rodapés.'},
 {cat:'Notícias / chinês moderno',type:'simple',level:5,title:'中国日报中文网',chars:'variável',url:'https://cn.chinadaily.com.cn/',desc:'Artigos modernos; use páginas específicas.'},
 {cat:'Notícias / chinês moderno',type:'simple',level:5,title:'CRI 中文',chars:'variável',url:'https://news.cri.cn/',desc:'Notícias modernas em chinês; importação via URL.'},
 {cat:'Sites 100% em chinês (extração fácil)',type:'simple',level:5,title:'人民网 — notícias',chars:'variável',url:'https://www.people.com.cn/',desc:'Portal de notícias 100% chinês; importe a URL de um artigo específico para melhor extração.'},
 {cat:'Sites 100% em chinês (extração fácil)',type:'simple',level:5,title:'新华网 — notícias',chars:'variável',url:'https://www.xinhuanet.com/',desc:'Agência de notícias chinesa; conteúdo denso e 100% em mandarim.'},
 {cat:'Sites 100% em chinês (extração fácil)',type:'simple',level:5,title:'澎湃新闻',chars:'variável',url:'https://www.thepaper.cn/',desc:'Portal de notícias moderno, 100% chinês; importe artigos específicos.'},
 {cat:'Sites 100% em chinês (extração fácil)',type:'simple',level:5,title:'中国政府网 — comunicados',chars:'variável',url:'https://www.gov.cn/',desc:'Textos institucionais 100% em chinês, formatação simples e limpa.'},
 {cat:'Sites 100% em chinês (extração fácil)',type:'simple',level:5,title:'趣历史 — histórias/curiosidades',chars:'variável',url:'https://www.qulishi.com/',desc:'Artigos de história e curiosidades, 100% em chinês, bons parágrafos corridos para leitura.'}
];
function H48_installSources(){try{const arr=window.V37_SOURCES||V37_SOURCES;if(!Array.isArray(arr))return;const seen=new Set(arr.map(s=>s.title));H48_EXTRA_SOURCES.forEach(s=>{if(!seen.has(s.title)){arr.push(s);seen.add(s.title);}});}catch{}}
async function H48_addSource(i){
 const arr=(window.V37_SOURCES||V37_SOURCES),s=arr&&arr[i];if(!s)return;try{showLoad('Extraindo source com parser limpo…');}catch{}
 try{const chapters=[];const rawCh=s.chapters||[{num:1,title:s.title,url:s.url,content:s.content||''}];for(const [idx,ch] of rawCh.entries()){let content=ch.content||'';if(!content&&ch.url)content=await H48_fetchText(ch.url);content=H48_cleanText(content||'',ch.url||s.url,{strictChinese:true});if(!content)content=`未能自动提取正文。请打开具体文章或章节页面，再用 URL 导入。`;const splitter=typeof v38SplitText==='function'?v38SplitText:(typeof v37SplitText==='function'?v37SplitText:null);const pages=splitter?splitter(content,ch.title||s.title||'Página'):[{num:1,title:ch.title||s.title||'Página',content}];pages.forEach(p=>chapters.push({id:(typeof v29NewId==='function'?v29NewId():Date.now().toString(36)+Math.random().toString(36).slice(2)),num:chapters.length+1,title:pages.length>1?p.title:(ch.title||s.title||'Página'),content:H48_cleanText(p.content,ch.url||s.url,{strictChinese:true}),progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url}));}
 const combined=H48_cleanText(chapters.map(c=>c.content).join('\n\n'),s.url||'',{strictChinese:true});const pageLimit=(typeof v38PageChars==='function'?v38PageChars():(typeof v37PageChars==='function'?v37PageChars():900));const onePage=chapters.length<=1&&H48_cjkCount(combined)<=pageLimit*1.30;const newId=()=>typeof v29NewId==='function'?v29NewId():Date.now().toString(36)+Math.random().toString(36).slice(2);
 if(s.type!=='book'||onePage){await dbPut(STB,{id:newId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:combined,type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});try{v29LibMode='simple';localStorage.setItem('hlibMode','simple');}catch{}H48_toast('Leitura adicionada com texto limpo');}
 else{await dbPut(STB,{id:newId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});try{v29LibMode='books';localStorage.setItem('hlibMode','books');}catch{}H48_toast(`Livro adicionado com ${chapters.length} páginas limpas`);}books=await dbAll(STB);showScreen('sl');renderLib();}
 catch(e){H48_toast('Falha ao importar source: '+(e.message||e));}
 finally{try{hideLoad();}catch{}}
}
function H48_renderDiscover(){try{H48_installSources();}catch{}const arr=(window.V37_SOURCES||V37_SOURCES),dc=document.getElementById('dc');if(!dc||!Array.isArray(arr))return;const cats=[...new Set(arr.map(s=>s.cat||'Sources'))];dc.innerHTML=cats.map(cat=>`<div class="src-section"><div class="sgt">${esc(cat)}</div><div class="src-grid">${arr.map((s,i)=>({s,i})).filter(x=>(x.s.cat||'Sources')===cat).map(({s,i})=>`<div class="src-card2 ${s.type==='book'?'long-src':''}"><div class="src-ico2" style="background:linear-gradient(135deg,#26221d,rgba(var(--ac-rgb),.5),var(--ac))">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-badges"><span class="src-badge">HSK ${s.level||'?'}</span><span class="src-badge">${s.type==='book'?'Livro/páginas':'Leitura simples'}</span><span class="src-badge">${esc(s.chars||'variável')}</span></div><div class="src-desc2">${esc(s.desc||'')}</div><div class="v38-polish-note">Parser H48: remove links, menus, cabeçalhos e espaços vazios antes de salvar.</div><div class="src-actions2"><button class="pri hr36-noemoji" data-h48-add="${i}">＋ Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div></div></div>`).join('')}</div></div>`).join('');dc.querySelectorAll('[data-h48-add]').forEach(b=>b.onclick=()=>H48_addSource(+b.dataset.h48Add));}
function H48_css(){if(document.getElementById('h48-css'))return;document.head.insertAdjacentHTML('beforeend',`<style id="h48-css">
#reader-ctrl{gap:8px!important;align-items:center!important;justify-content:center!important;padding:8px 10px calc(8px + var(--sb))!important;background:rgba(24,24,24,.94)!important;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
#read-play.h48-tts-main{min-width:136px!important;border:1px solid rgba(var(--ac-rgb),.45)!important;background:var(--ac)!important;color:#111!important;border-radius:999px!important;font-weight:900!important;padding:10px 16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;font-size:13px!important;line-height:1!important}
#read-play.h48-tts-main.on{background:#2b2b2b!important;color:var(--ac)!important}#read-play.h48-tts-main:disabled{opacity:.78!important}.h48-spin{width:14px;height:14px;border:2px solid rgba(0,0,0,.22);border-top-color:currentColor;border-radius:50%;display:inline-block;animation:h48spin .8s linear infinite}.h48-substatus{border:1px solid #3a3a3a!important;background:#252525!important;color:#aaa!important;border-radius:999px!important;font-size:11px!important;font-weight:750!important;min-width:120px!important;padding:10px 12px!important;justify-content:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:48vw!important}@keyframes h48spin{to{transform:rotate(360deg)}}
.h48-selbar{position:fixed;left:12px;right:12px;bottom:calc(64px + var(--sb));z-index:250;display:none;align-items:center;gap:9px;background:rgba(19,19,19,.96);border:1px solid rgba(var(--ac-rgb),.28);box-shadow:0 14px 50px rgba(0,0,0,.55);border-radius:17px;padding:9px 10px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}.h48-selbar.show{display:flex}.h48-sel-text{flex:1;min-width:0;color:#ddd;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.h48-selbar button{border:none;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;display:inline-flex;align-items:center;gap:6px;justify-content:center;cursor:pointer}.h48-selbar #h48-sel-btn{background:var(--ac);color:#111;min-width:112px}.h48-selbar #h48-sel-x{background:#2b2b2b;color:#aaa;width:34px;height:34px;padding:0;font-size:20px}body{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
button,a,svg,.stog,.mode-btn,.pri,.dict-audio,.lexi-audio,.v34-icon-btn,.sfbtn{-webkit-touch-callout:none!important}
button,svg,.lexi-audio,.dict-audio,.lexi-save-btn,.lexi-steps-btn,.lexi-steps-expand-btn,.lexi-acc-chev,.auto-trans-btn,.v41-trace-btn,.v34-icon-btn,.stog,.sfbtn{user-select:none!important;-webkit-user-select:none!important}
.rtext,.rscroll,#rtext{user-select:text!important;-webkit-user-select:text!important}
.dict-results-lexi .lexi-zh,.dict-results-lexi .lexi-py,.dict-results-lexi .lexi-def,.dict-results-lexi .lexi-pos,.dict-results-lexi .lexi-def-label,.dict-results-lexi .lexi-def-reading,.dict-results-lexi .lexi-trad,.dict-results-lexi .lexi-variants,.dict-results-lexi .lexi-acc-zh,.dict-results-lexi .lexi-acc-py,.dict-results-lexi .lexi-acc-mean,.dict-results-lexi .lexi-acc-defs,.dict-results-lexi .lexi-acc-row-label,.dict-results-lexi .dict-item .zh,.dict-results-lexi .dict-item .py,.dict-results-lexi .dict-item .en,.dict-results-lexi .dict-item .trad,.dict-results-lexi .sent-zh,.dict-results-lexi .sent-py,.dict-results-lexi .sent-tr,.dict-results-lexi .trad-diff,.tip-body .tip-def,.tip-body .tip-translation,.tip-body .tip-pos,.tip-body .tip-ex-zh,.tip-body .tip-ex-py,.tip-body .tip-ex-tr,#tip-wd,#tip-py{user-select:text!important;-webkit-user-select:text!important}
.wunit,.pt,.ptc{user-select:text!important;-webkit-user-select:text!important;-webkit-touch-callout:default}
/* v4.8.2: o pinyin nao deve ser selecionavel junto com o ideograma - o usuario so deve conseguir
   marcar a linha dos hanzi (hzrow). O pyrow (pinyin) fica com user-select:none. */
.pyrow,.pt-ghost{user-select:none!important;-webkit-user-select:none!important}
.hzrow{user-select:text!important;-webkit-user-select:text!important}
</style>`);}
function H48_hookReaderOpen(){
 try{
   if(typeof v29OpenSimpleReading==='function'&&!v29OpenSimpleReading.__h48){
     const orig=v29OpenSimpleReading;
     const wrapped=async function(...args){const r=await orig.apply(this,args);try{H48_resetFull();H48_patchGlobals();H48_watchReader();}catch{}return r;};
     wrapped.__h48=true;
     v29OpenSimpleReading=wrapped;window.v29OpenSimpleReading=wrapped;
   }
 }catch{}
 try{
   if(typeof v29OpenBookChapter==='function'&&!v29OpenBookChapter.__h48){
     const orig=v29OpenBookChapter;
     const wrapped=async function(...args){const r=await orig.apply(this,args);try{H48_resetFull();H48_patchGlobals();H48_watchReader();}catch{}return r;};
     wrapped.__h48=true;
     v29OpenBookChapter=wrapped;window.v29OpenBookChapter=wrapped;
   }
 }catch{}
}
function H48_patchGlobals(){
 H48_css();H48_installSources();H48_hookReaderOpen();
 try{window.H48_fetchText=H48_fetchText;window.fetchText=H48_fetchText;fetchText=H48_fetchText;}catch{window.fetchText=H48_fetchText;}
 try{window.H48_cleanText=H48_cleanText;window.cleanRaw=H48_cleanText;cleanRaw=H48_cleanText;}catch{}
 try{window.H48_extractHtml=H48_extractHtml;window.cleanHTML=H48_extractHtml;cleanHTML=H48_extractHtml;}catch{}
 try{window.v38FetchText=H48_fetchText;v38FetchText=H48_fetchText;window.v37Fetch=H48_fetchText;v37Fetch=H48_fetchText;}catch{}
 try{v38CleanRaw=H48_cleanText;v38CleanHTML=H48_extractHtml;v38ExtractBody=(doc,url)=>H48_extractHtml(doc.documentElement.outerHTML,url);}catch{}
 try{window.importURL=async function(url){try{showLoad('Extraindo texto limpo…');const text=await H48_fetchText(url);const host=(()=>{try{return new URL(url).hostname;}catch{return url;}})();const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);const title=(lines[0]&&lines[0].length<70?lines[0]:host);await saveBook({title,source:host,content:text,type:'url'});closeModals();H48_toast('Importado com parser limpo!');await loadLib();}catch(e){H48_toast('Erro: '+(e.message||e));}finally{try{hideLoad();}catch{}}};importURL=window.importURL;}catch{}
 try{window.renderDiscover=H48_renderDiscover;renderDiscover=H48_renderDiscover;window.v38RenderDiscover=H48_renderDiscover;v38RenderDiscover=H48_renderDiscover;window.v37AddSource=H48_addSource;v37AddSource=H48_addSource;window.v38AddSource=H48_addSource;v38AddSource=H48_addSource;}catch{}
 const p=document.getElementById('read-play');if(p){p.onclick=H48_mainClick;p.title='Gerar áudio do texto completo com Edge TTS';p.dataset.h48='generate-first';}
 const sp=document.getElementById('read-speed');if(sp){sp.onclick=()=>H48_resetFull();sp.title='Descartar áudio gerado e gerar novamente';if(!sp.dataset.h48){sp.textContent='Texto limpo via ideogramas';sp.dataset.h48='status';}}
 H48_updateMainButton();try{H48_renderDiscover();}catch{}
 try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H48_VERSION;}catch{}
 H48_log('v48.boot','parser limpo + gerar áudio + seleção carregados',{version:H48_VERSION,sources:(window.V37_SOURCES||window.V32_SOURCES||[]).length,proxies:H48_TEXT_PROXIES.map(x=>x.id)},'ok');
}
function H48_installSelection(){/* v4.9: dock de seleção nativo (#selbar) assume esse papel; H48 não instala mais o seu próprio. */}
function H48_watchReader(){try{if(H48_mutObs)H48_mutObs.disconnect();const root=document.getElementById('rtext');if(!root)return;H48_mutObs=new MutationObserver(()=>H48_resetFull());H48_mutObs.observe(root,{childList:true,subtree:true});}catch{}}
function H48_boot(){H48_patchGlobals();H48_installSelection();H48_watchReader();setTimeout(()=>{H48_patchGlobals();H48_watchReader();},600);setTimeout(()=>{H48_patchGlobals();H48_watchReader();},1800);setTimeout(()=>{H48_patchGlobals();H48_watchReader();},3600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H48_boot);else H48_boot();
})();
