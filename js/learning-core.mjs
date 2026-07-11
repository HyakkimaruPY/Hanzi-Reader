/**
 * Pure learning/reader primitives shared by the browser runtime and Node tests.
 * No DOM or network access belongs in this file.
 */

export const TONE_ITEMS = Object.freeze([
  {id:'ma1',hanzi:'妈',pinyin:'mā',tones:[1],meaning:'mãe',level:1},
  {id:'ma2',hanzi:'麻',pinyin:'má',tones:[2],meaning:'cânhamo',level:1},
  {id:'ma3',hanzi:'马',pinyin:'mǎ',tones:[3],meaning:'cavalo',level:1},
  {id:'ma4',hanzi:'骂',pinyin:'mà',tones:[4],meaning:'repreender',level:1},
  {id:'ma5',hanzi:'吗',pinyin:'ma',tones:[5],meaning:'partícula de pergunta',level:1},
  {id:'shu1',hanzi:'书',pinyin:'shū',tones:[1],meaning:'livro',level:1},
  {id:'cha2',hanzi:'茶',pinyin:'chá',tones:[2],meaning:'chá',level:1},
  {id:'shui3',hanzi:'水',pinyin:'shuǐ',tones:[3],meaning:'água',level:1},
  {id:'kan4',hanzi:'看',pinyin:'kàn',tones:[4],meaning:'ver / assistir',level:1},
  {id:'zhongguo',hanzi:'中国',pinyin:'zhōng guó',tones:[1,2],meaning:'China',level:2},
  {id:'xuexi',hanzi:'学习',pinyin:'xué xí',tones:[2,2],meaning:'estudar',level:2},
  {id:'laoshi',hanzi:'老师',pinyin:'lǎo shī',tones:[3,1],meaning:'professor',level:2},
  {id:'zaijian',hanzi:'再见',pinyin:'zài jiàn',tones:[4,4],meaning:'até logo',level:2},
  {id:'pengyou',hanzi:'朋友',pinyin:'péng you',tones:[2,5],meaning:'amigo',level:2},
  {id:'xiexie',hanzi:'谢谢',pinyin:'xiè xie',tones:[4,5],meaning:'obrigado',level:2},
  {id:'kafei',hanzi:'咖啡',pinyin:'kā fēi',tones:[1,1],meaning:'café',level:2},
  {id:'mingtian',hanzi:'明天',pinyin:'míng tiān',tones:[2,1],meaning:'amanhã',level:2},
  {id:'shouji',hanzi:'手机',pinyin:'shǒu jī',tones:[3,1],meaning:'celular',level:2},
  {id:'dianying',hanzi:'电影',pinyin:'diàn yǐng',tones:[4,3],meaning:'filme',level:2},
  {id:'xihuan',hanzi:'喜欢',pinyin:'xǐ huan',tones:[3,5],meaning:'gostar',level:2},
  {id:'tushuguan',hanzi:'图书馆',pinyin:'tú shū guǎn',tones:[2,1,3],meaning:'biblioteca',level:3},
  {id:'meiguanxi',hanzi:'没关系',pinyin:'méi guān xi',tones:[2,1,5],meaning:'não tem problema',level:3},
  {id:'duibuqi',hanzi:'对不起',pinyin:'duì bu qǐ',tones:[4,5,3],meaning:'desculpe',level:3},
  {id:'hengaoxing',hanzi:'很高兴',pinyin:'hěn gāo xìng',tones:[3,1,4],meaning:'muito feliz',level:3},
  {id:'jintiantianqi',hanzi:'今天天气',pinyin:'jīn tiān tiān qì',tones:[1,1,1,4],meaning:'o tempo hoje',level:4},
  {id:'wohekafei',hanzi:'我喝咖啡',pinyin:'wǒ hē kā fēi',tones:[3,1,1,1],meaning:'eu bebo café',level:4},
  {id:'nikandianying',hanzi:'你看电影',pinyin:'nǐ kàn diàn yǐng',tones:[3,4,4,3],meaning:'você assiste a um filme',level:4},
  {id:'tashilaoshi',hanzi:'他是老师',pinyin:'tā shì lǎo shī',tones:[1,4,3,1],meaning:'ele é professor',level:4}
]);

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const DAY=86_400_000;

const TONE_MARKS=Object.freeze({
  'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,'ī':1,'í':2,'ǐ':3,'ì':4,
  'ō':1,'ó':2,'ǒ':3,'ò':4,'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4,
  'Ā':1,'Á':2,'Ǎ':3,'À':4,'Ē':1,'É':2,'Ě':3,'È':4,'Ī':1,'Í':2,'Ǐ':3,'Ì':4,
  'Ō':1,'Ó':2,'Ǒ':3,'Ò':4,'Ū':1,'Ú':2,'Ǔ':3,'Ù':4,'Ǖ':1,'Ǘ':2,'Ǚ':3,'Ǜ':4
});

/** Extract one tone per pinyin syllable. Neutral/unspecified syllables become 5. */
export function extractToneSequence(pinyin){
  return String(pinyin||'')
    .replace(/[·•]/g,' ')
    .split(/[\s'’-]+/)
    .map(token=>token.trim())
    .filter(Boolean)
    .map(token=>{
      const numeric=token.match(/([0-5])$/);
      if(numeric)return Number(numeric[1])||5;
      for(const ch of token){if(TONE_MARKS[ch])return TONE_MARKS[ch];}
      return /[a-zü]/i.test(token)?5:0;
    })
    .filter(tone=>tone>=1&&tone<=5);
}

export function defaultLearningState(){
  return {v:1,items:{},toneConfusions:{},aggregate:{correct:0,wrong:0,replays:0,totalResponseMs:0},sessions:{count:0,lastAt:0},recent:[]};
}

export function sanitizeLearningState(raw){
  const base=defaultLearningState();
  if(!raw||typeof raw!=='object')return base;
  return {
    v:1,
    items:raw.items&&typeof raw.items==='object'?raw.items:{},
    toneConfusions:raw.toneConfusions&&typeof raw.toneConfusions==='object'?raw.toneConfusions:{},
    aggregate:{...base.aggregate,...(raw.aggregate||{})},
    sessions:{...base.sessions,...(raw.sessions||{})},
    recent:Array.isArray(raw.recent)?raw.recent.slice(-60):[]
  };
}

export function unlockedToneLevel(state){
  const s=sanitizeLearningState(state),answered=(Number(s.aggregate.correct)||0)+(Number(s.aggregate.wrong)||0);
  const accuracy=answered?(Number(s.aggregate.correct)||0)/answered:0;
  if(answered>=70&&accuracy>=.78)return 4;
  if(answered>=35&&accuracy>=.68)return 3;
  if(answered>=10)return 2;
  return 1;
}

function itemScore(item,state,now,rng){
  const rec=state.items[item.id];
  if(!rec)return 42-(item.level*2)+(rng()*5);
  const attempts=(rec.correct||0)+(rec.wrong||0);
  const errorRate=attempts?(rec.wrong||0)/attempts:.5;
  const overdue=Math.max(0,now-(rec.dueAt||0));
  const dueBoost=(rec.dueAt||0)<=now?55+Math.min(28,overdue/DAY*5):0;
  const unstable=(5-(rec.mastery||0))*6;
  const age=Math.min(18,Math.max(0,now-(rec.lastReview||0))/DAY*2);
  const repetitionPenalty=state.recent.slice(-3).includes(item.id)?-70:0;
  return dueBoost+errorRate*45+unstable+age+repetitionPenalty+(rng()*7);
}

export function selectAdaptiveToneItem(items=TONE_ITEMS,state=defaultLearningState(),options={}){
  const safe=sanitizeLearningState(state),now=Number(options.now)||Date.now(),rng=options.rng||Math.random;
  const maxLevel=Number(options.maxLevel)||unlockedToneLevel(safe);
  let pool=items.filter(item=>item.level<=maxLevel);
  if(!pool.length)pool=[...items];
  return pool.map(item=>({item,score:itemScore(item,safe,now,rng)})).sort((a,b)=>b.score-a.score)[0]?.item||null;
}

export function updateReviewItem(state,item,result,options={}){
  const next=sanitizeLearningState(structuredCloneSafe(state));
  const now=Number(options.now)||Date.now(),id=item.id;
  const prev=next.items[id]||{id,type:'tone-sequence',lastReview:0,dueAt:0,intervalHours:0,mastery:0,correct:0,wrong:0,difficulty:item.level||1};
  const correct=Boolean(result.correct),replays=Math.max(0,Number(result.replays)||0),responseMs=Math.max(0,Number(result.responseMs)||0);
  const mastery=clamp((prev.mastery||0)+(correct?1:-1),0,5);
  const correctIntervals=[24,72,168,336,720,1440];
  let intervalHours;
  if(correct)intervalHours=Math.max(Number(prev.intervalHours)||0,correctIntervals[mastery]||1440);
  else intervalHours=mastery>=3?6:(1/6);
  const difficulty=clamp(
    (Number(prev.difficulty)||item.level||1)+(correct?-.08:.28)+(replays*.06)+(responseMs>12000?.08:0),
    1,5
  );
  next.items[id]={...prev,id,type:'tone-sequence',lastReview:now,dueAt:now+intervalHours*3_600_000,intervalHours,mastery,correct:(prev.correct||0)+(correct?1:0),wrong:(prev.wrong||0)+(correct?0:1),difficulty:Number(difficulty.toFixed(2))};
  next.aggregate.correct=(Number(next.aggregate.correct)||0)+(correct?1:0);
  next.aggregate.wrong=(Number(next.aggregate.wrong)||0)+(correct?0:1);
  next.aggregate.replays=(Number(next.aggregate.replays)||0)+replays;
  next.aggregate.totalResponseMs=(Number(next.aggregate.totalResponseMs)||0)+responseMs;
  if(!correct&&Array.isArray(result.answer)&&Array.isArray(item.tones)){
    item.tones.forEach((expected,index)=>{
      const actual=Number(result.answer[index]);
      if(actual&&actual!==Number(expected)){
        const key=`${expected}>${actual}`;
        next.toneConfusions[key]=(Number(next.toneConfusions[key])||0)+1;
      }
    });
  }
  next.recent=[...next.recent,id].slice(-60);
  trimLearningItems(next,240);
  return next;
}

function structuredCloneSafe(value){
  try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value||{}));}
}
function trimLearningItems(state,max){
  const entries=Object.entries(state.items||{});
  if(entries.length<=max)return;
  entries.sort((a,b)=>(b[1].lastReview||0)-(a[1].lastReview||0));
  state.items=Object.fromEntries(entries.slice(0,max));
}

function normalizeReaderText(text){
  return String(text||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\r\n?/g,'\n')
    .replace(/[ \t\f\v]+/g,' ')
    .replace(/ *\n */g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function splitLongUnit(unit,hardMax){
  if(unit.length<=hardMax)return[unit];
  const pieces=[];let rest=unit;
  while(rest.length>hardMax){
    const area=rest.slice(0,hardMax+1);
    const candidates=['，',',','、','：',':','；',';',' '];
    let cut=-1;
    for(const token of candidates)cut=Math.max(cut,area.lastIndexOf(token));
    if(cut<Math.floor(hardMax*.55))cut=hardMax;
    else cut+=1;
    pieces.push(rest.slice(0,cut).trim());
    rest=rest.slice(cut).trim();
  }
  if(rest)pieces.push(rest);
  return pieces.filter(Boolean);
}

function sentenceUnits(text,hardMax){
  const units=[];let current='';
  const terminal=/[。！？!?；;]/;
  const closer=/[”’」』》】）)\]]/;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    current+=ch;
    if(terminal.test(ch)){
      while(i+1<text.length&&closer.test(text[i+1]))current+=text[++i];
      if(current.trim())units.push(...splitLongUnit(current.trim(),hardMax));
      current='';
    }else if(ch==='\n'){
      if(current.trim())units.push(...splitLongUnit(current.trim(),hardMax));
      current='';
      if(text[i+1]==='\n'){units.push('\n\n');while(text[i+1]==='\n')i++;}
    }
  }
  if(current.trim())units.push(...splitLongUnit(current.trim(),hardMax));
  return units;
}

/**
 * Semantic Chinese text segmentation. Sentence/paragraph boundaries are kept,
 * while tiny clauses are combined and oversized sentences split at soft stops.
 */
export function segmentChineseText(text,options={}){
  const normalized=normalizeReaderText(text);
  if(!normalized)return[];
  const target=clamp(Number(options.target)||300,120,520);
  const min=clamp(Number(options.min)||90,30,target);
  const hardMax=clamp(Number(options.hardMax)||620,target,900);
  const units=sentenceUnits(normalized,hardMax);
  const out=[];let current='';
  const flush=()=>{const v=current.trim();if(v)out.push(v);current='';};
  for(const unit of units){
    if(unit==='\n\n'){
      if(current)current+='\n\n';
      continue;
    }
    const separator=current?(current.endsWith('\n\n')?'':' '):'';
    const candidate=current+separator+unit;
    if(candidate.length>hardMax){flush();current=unit;continue;}
    if(current.length>=min&&candidate.length>target){flush();current=unit;continue;}
    current=candidate;
  }
  flush();
  return out.flatMap(unit=>splitLongUnit(unit,hardMax)).filter(Boolean);
}

export function toneLabel(tone){
  return ({1:'1º · alto',2:'2º · sobe',3:'3º · baixo',4:'4º · cai',5:'neutro'})[Number(tone)]||String(tone);
}
