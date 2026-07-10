#!/usr/bin/env node
import assert from 'node:assert/strict';
import {TONE_ITEMS,defaultLearningState,selectAdaptiveToneItem,segmentChineseText,updateReviewItem,unlockedToneLevel} from '../js/learning-core.mjs';

const short=segmentChineseText('你好。今天好吗？我很好！',{target:8,min:4,hardMax:12});
assert.deepEqual(short,['你好。 今天好吗？ 我很好！']);
const longSentence='这是一个用于验证长句分割行为的测试，'.repeat(30)+'结束。';
const chunks=segmentChineseText(longSentence,{target:180,min:70,hardMax:240});
assert.ok(chunks.length>1);
assert.ok(chunks.every(x=>x.length<=240));
assert.equal(chunks.join('').replace(/\s/g,''),longSentence.replace(/\s/g,''));

const state=defaultLearningState();
assert.equal(unlockedToneLevel(state),1);
const selected=selectAdaptiveToneItem(TONE_ITEMS,state,{rng:()=>0,now:1});
assert.ok(selected&&selected.level===1);
const item=TONE_ITEMS[0];
const afterWrong=updateReviewItem(state,item,{correct:false,answer:[2],replays:2,responseMs:14000},{now:1_000});
assert.equal(afterWrong.items[item.id].wrong,1);
assert.equal(afterWrong.toneConfusions['1>2'],1);
assert.ok(afterWrong.items[item.id].dueAt>1_000);
const afterRight=updateReviewItem(afterWrong,item,{correct:true,answer:[1],replays:0,responseMs:3000},{now:2_000});
assert.equal(afterRight.items[item.id].correct,1);
assert.ok(afterRight.items[item.id].intervalHours>=24);
assert.equal(Object.keys(afterRight.items).length,1);
console.log('✓ learning-core: segmentação, adaptação e revisão espaçada');
