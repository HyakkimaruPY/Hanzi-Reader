
/* v3.2: remove modo lento do popup, reforça HSK 3.0 comum, fontes públicas, lixeira visível e leitor contínuo. */
(function(){
const V32_STYLE=`
#tip-audio,#tip-slow,.tone-actions{display:none!important}
.tip-actions{margin:4px 0 10px;display:flex;justify-content:flex-start}
#tip-natural{padding:8px 11px;border-radius:999px;font-size:12px;gap:6px;min-width:auto;background:#2a2a2a;color:var(--ac)}
#tip-natural.pri{background:#2a2a2a;color:var(--ac)}
.tone-word-row{display:flex;align-items:center;gap:8px;margin:2px 0 5px}.tone-word-row .tone-word{margin:0}.tone-mini-audio{border:0;background:#2d2a24;color:#f4c36f;border-radius:50%;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.del-btn,.book-del{position:absolute;top:8px;right:8px;width:31px;height:31px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.42);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;z-index:5;cursor:pointer;font-size:16px}.card,.book-card{position:relative}.card .del-btn{right:10px;top:10px}.card .bi{padding-right:38px}.book-card .book-edit{right:45px}.book-card .book-cover{border:1px solid rgba(220,220,220,.38);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 10px 28px rgba(0,0,0,.25)}
.reader-top-back{border:0;background:rgba(61,43,31,.08);color:var(--rp);width:34px;height:34px;border-radius:50%;font-size:25px;line-height:1;margin-right:7px;display:flex;align-items:center;justify-content:center;cursor:pointer}.reader-top-back:active{background:rgba(61,43,31,.18)}
.reader-ctrl{display:flex;align-items:center;justify-content:center;gap:10px;background:rgba(24,24,24,.96);border-top:1px solid #292929;padding:7px 12px}.reader-ctrl button{border:1px solid #363636;background:#242424;color:#ddd;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:750;display:inline-flex;align-items:center;gap:6px;min-width:84px;justify-content:center}.reader-ctrl button.on{background:var(--ac);border-color:var(--ac);color:#111}.reader-ctrl .small{min-width:0;width:38px;height:38px;padding:0;border-radius:50%;font-size:18px}.reading-hi{outline:2px solid rgba(var(--ac-rgb),.35);background:rgba(var(--ac-rgb),.08)}
.src-grid{display:grid;gap:10px}.src-card2{background:var(--lc);border:1px solid var(--lcb);border-radius:15px;padding:13px 14px;display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:start}.src-ico2{width:48px;height:54px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--rf);font-size:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}.src-title2{font-size:15px;font-weight:800;margin-bottom:3px}.src-meta2{font-size:11px;color:#8a8a8a;margin-bottom:6px}.src-desc2{font-size:12px;color:#aaa;line-height:1.45}.src-actions2{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.src-actions2 button,.src-actions2 a{border:none;border-radius:9px;background:#252525;color:#ddd;padding:8px 10px;font-size:12px;font-weight:750;text-decoration:none}.src-actions2 .pri{background:var(--ac);color:#111}.src-level{display:inline-flex;padding:2px 6px;border-radius:6px;background:#1f2b20;color:#7edc91;font-size:10px;font-weight:900;margin-right:5px}
@media (min-width:760px){.reader-ctrl{max-width:1020px;margin:0 auto;width:100%;border-radius:18px 18px 0 0}.src-grid{grid-template-columns:repeat(2,minmax(0,1fr));max-width:1020px;margin:0 auto}.del-btn,.book-del{opacity:.82}.del-btn:hover,.book-del:hover{opacity:1;background:rgba(180,50,50,.65)}}`;
const st=document.createElement('style');st.textContent=V32_STYLE;document.head.appendChild(st);

const V32_HSK30={
1:'我 你 他 她 它 我们 你们 他们 这 那 这里 那里 哪 哪里 谁 什么 为什么 怎么 怎么样 多少 几 一 二 三 四 五 六 七 八 九 十 百 千 万 零 个 些 本 只 条 张 块 元 岁 年 月 日 天 星期 点 分 时候 上午 中午 下午 晚上 早上 今天 昨天 明天 今年 去年 明年 现在 以前 以后 刚才 已经 正在 家 学校 教室 老师 学生 同学 朋友 爸爸 妈妈 哥哥 姐姐 弟弟 妹妹 儿子 女儿 孩子 人 男人 女人 中国 中国人 中文 汉语 普通话 名字 书 水 茶 饭 米饭 菜 水果 苹果 东西 衣服 钱 手机 电脑 电视 桌子 椅子 房间 门 车 出租车 公共汽车 火车 飞机 机场 医院 商店 饭店 天气 雨 雪 字 词 句子 语言 工作 身体 眼睛 耳朵 手 口 是 有 在 去 来 回 看 听 说 读 写 学 认识 知道 喜欢 爱 吃 喝 买 坐 住 叫 开 关 进 出 上 下 前 后 左 右 里 外 中 中间 旁边 比 和 的 了 吗 呢 也 都 很 太 不 没 没有 会 能 可以 想 要 请 谢谢 对不起 没关系 再见 你好 好 大 小 多 少 高 矮 长 短 热 冷 快 慢 新 旧 白 黑 红 绿 蓝 黄 好吃 漂亮 高兴',
2:'半 两 第一 第二 次 每 别 真 最 还 就 再 一起 一点 一点儿 有点 有一点儿 因为 所以 但是 如果 虽然 然后 可能 应该 需要 觉得 希望 告诉 问 回答 帮 帮助 介绍 认识 找 到 等 准备 开始 完 玩 休息 睡觉 起床 上班 下班 生病 运动 跑步 游泳 踢足球 打篮球 唱歌 跳舞 旅游 考试 课 题 问题 事情 时间 小时 分钟 路 远 近 离 从 到 给 让 送 票 火车票 服务员 公司 生日 快乐 新年 羊肉 鸡蛋 西瓜 咖啡 颜色 黑色 白色 男 女 旁边 左边 右边 外面 里面 早 晚 忙 累 贵 便宜 错 对 快 慢 阴 晴 可能 可以 已经 正在 一下 意思',
3:'一般 一边 一定 一直 其实 其他 奇怪 如果 认为 认真 重要 主要 注意 自己 总是 最后 最近 作用 作业 选择 要求 影响 愿意 遇到 了解 明白 记得 忘记 发现 觉得 需要 应该 决定 完成 解决 参加 关系 关心 关于 国家 城市 世界 地方 地图 地铁 街道 公园 图书馆 银行 超市 宾馆 办公室 会议 经理 司机 客人 邻居 同事 新闻 节目 音乐 电影 照片 信用卡 行李箱 护照 历史 文化 普通话 句子 词语 声音 故事 机会 季节 春 夏 秋 冬 太阳 月亮 动物 熊猫 鸟 马 鱼 河 花 花园 南 北 东 西 方便 简单 清楚 健康 感冒 发烧 认真 容易 难 难过 热情 可爱 年轻 新鲜 安静 干净 满意',
4:'安排 安全 按时 按照 标准 表示 保护 保证 抱歉 报名 本来 毕业 变化 表格 表演 参加 餐厅 超过 成功 成为 诚实 乘坐 出差 出发 出生 出现 传统 窗户 从来 答案 打扰 打印 打折 大概 大约 当时 到底 道歉 地址 掉 调查 动作 对话 儿童 发生 发展 法律 翻译 反对 方法 方面 放弃 丰富 父亲 负责 复杂 改变 感动 感觉 感情 感谢 高级 各 格式 工资 共同 购物 够 估计 鼓励 关键 管理 广播 广告 规定 国际 过程 海洋 害羞 航班 好处 合适 后悔 互联网 活动 回忆 怀疑 获得 积极 积累 即使 继续 计划 记者 技术 家具 价格 坚持 建议 将来 降低 交流 交通 教育 接受 结果 解释 进行 禁止 精彩 经济 经历 经验 竞争 举办 举行 距离 看法 考虑 科学 可是 肯定 空气 困难 来得及 浪费 理解 理想 联系 另外 流利 流行 旅行 律师 麻烦 满 年龄 能力 农村 排队 判断 陪 批评 平时 普遍 其次 其中 气候 千万 签证 情况 区别 全部 缺点 缺少 确实 然而 任何 任务 日记 森林 社会 申请 甚至 生活 生命 生意 省 使用 失败 失望 实际 实在 适合 适应 世纪 收入 首先 受到 数字 速度 顺利 顺序 说明 死 随便 随着 所有 态度 讨论 讨厌 特点 提供 提醒 条件 停止 通过 通知 推迟 完全 网站 危险 温度 文章 污染 无论 误会 吸引 现金 羡慕 相反 相同 详细 消息 小说 效果 心情 信心 信息 信任 兴奋 幸福 性格 修理 许多 学期 压力 严格 严重 研究 演出 演员 阳光 邀请 要是 也许 一切 以 引起 印象 赢 应聘 永远 勇敢 优点 优秀 由于 尤其 有趣 友好 友谊 愉快 于是 语法 语言 预习 原因 约会 阅读 允许 杂志 暂时 责任 增加 招聘 真正 正常 正确 正式 证明 支持 知识 值得 直接 职业 植物 指出 只好 只要 质量 至少 重点 重视 周围 主意 祝贺 著名 专业 专门 准确 准时 仔细 自然 总结 尊重 左右 作者',
5:'爱惜 安慰 安装 保持 保存 保留 抱怨 背景 比例 必然 避免 编辑 表面 病毒 博物馆 不断 不如 不足 步骤 部门 财产 采访 采取 参考 参与 差距 产品 产生 常识 长途 彻底 沉默 充分 充满 重复 抽象 出色 出示 出席 处理 传播 创造 此外 次要 刺激 匆忙 从此 促进 存在 错误 达到 大方 大厦 贷款 单独 单位 担任 耽误 当地 导演 等待 等于 敌人 地道 地理 地区 地位 地震 电视剧 独立 独特 度过 对待 对方 对手 对象 兑换 多亏 多余 恶劣 发表 发达 发挥 发明 发票 法院 翻译 繁荣 反而 范围 方言 方式 妨碍 仿佛 辩论 费用 分别 分布 分配 风格 风险 扶 辅导 复制 改革 改善 改正 概括 概念 感激 感受 干燥 赶紧 高速公路 革命 个别 个人 公式 公平 公寓 功能 贡献 沟通 构成 古代 股票 固定 观察 观点 广场 归纳 规则 规模 国庆节 海关 海鲜 行业 好奇 合法 合理 合同 合作 核心 忽然 忽视 化学 话题 缓解 恢复 汇率 婚礼 婚姻 活跃 伙伴 基本 基础 机器 激烈 及格 集体 集中 记忆 计算 记录 纪律 寂寞 家务 假如 坚决 艰苦 简历 健身 建立 建设 建筑 讲座 交换 交际 交往 接触 结构 结合 结论 解放 尽快 尽量 紧急 经典 经营 景色 具体 绝对 决心 开发 开放 看望 靠 可见 控制 口味 夸张 会计 宽 扩大 劳动 老百姓 老板 老实 类型 冷淡 立即 立刻 利益 利用 连续 联合 良好 粮食 灵活 领导 领域 浏览 录取 论文 逻辑 落后 旅游 贸易 魅力 秘书 秘密 面对 面积 面临 描写 明显 明星 目标 目前 难怪 能干 能源 年代 农业 拍摄 培训 培养 配合 佩服 批 平等 平衡 平常 平均 评价 迫切 期待 期间 其余 启发 企业 气氛 汽油 谦虚 前途 强调 强烈 起初 起码 签订 签字 前进 欠 青春 轻易 请求 取得 取消 权力 劝 确认 确定 热爱 热烈 人生 人口 人才 人物 日常 如今 弱 删除 善良 商品 商业 设备 设计 设施 身份 深刻 生产 生动 生长 省略 胜利 失眠 失去 失业 时代 时刻 实现 实验 始终 市场 事实 事物 收获 舒服 舒适 属于 数量 数学 思考 思想 私人 似乎 损失 所谓 谈判 逃避 特殊 特征 提倡 提交 体现 挑战 通常 统一 痛苦 投资 透明 突出 土地 推广 推荐 外交 完美 完善 完整 万一 网络 往返 危害 维护 未来 位于 位置 温暖 温柔 文件 文明 文学 稳定 问候 无数 物理 物质 系统 细节 现代 现实 现象 项目 消费 消失 销售 效率 写作 压缩 摇头 要不 夜 一致 依然 移动 疑问 艺术 议论 引用 隐藏 迎接 营养 应用 拥抱 拥挤 优惠 优势 悠久 预报 预订 原料 原则 圆 运气 运输 赞成 造成 则 责备 展开 占 账户 掌握 招待 争论 征求 整个 整体 证件 制定 制度 制造 制作 智慧 中介 中心 种类 重大 主题 主观 追求 资料 资源 自愿 综合 组成 组合 组织 祖国 作品 作为',
6:'爱戴 安置 案件 案例 昂贵 摆脱 拜访 败坏 颁布 伴侣 伴随 半途而废 扮演 绑架 榜样 包围 包装 保管 保密 保姆 保守 保卫 保养 保障 报酬 报答 报复 报考 报销 抱负 暴力 暴露 悲惨 悲观 本能 本质 彼此 必定 必要 辩护 辩解 辨认 标记 表决 表态 表彰 别墅 别致 冰雹 并非 并列 波浪 波涛 博大精深 搏斗 不顾 不禁 不堪 不可思议 不愧 不料 不时 不惜 不相上下 不屑一顾 补偿 补救 部署 财富 财务 裁判 采购 苍白 操劳 操纵 操作 草案 策划 测量 层出不穷 差别 差异 柴油 常年 常务 尝试 偿还 场合 场面 敞开 倡导 倡议 超越 朝气 嘲笑 撤退 沉淀 沉闷 陈列 陈述 称赞 承办 承包 承诺 承认 承受 成本 成交 成效 成员 呈现 诚恳 诚挚 程序 惩罚 耻辱 充当 充沛 充实 崇拜 崇高 崇敬 出卖 出身 初步 除夕 处境 储备 触犯 传达 传授 创业 慈善 辞职 此起彼伏 从容 摧残 脆弱 达成 打击 大胆 大街小巷 代理 逮捕 怠慢 担保 胆怯 当场 当初 当代 当面 当前 当事人 当务之急 档案 档次 倒闭 导航 导弹 岛屿 捣乱 得不偿失 得力 得天独厚 得罪 登陆 登载 等候 等级 抵达 抵抗 抵制 地步 地势 地质 颠簸 典礼 典型 奠定 电源 点缀 调节 调解 对策 对称 对付 对抗 对立 对联 队伍 顿时 多元化 额外 恶化 恩怨 发布 发誓 发行 发扬 法定 法人 法规 法则 方位 防守 防御 访问 放大 放射 飞翔 飞跃 分辨 分寸 分红 分解 分裂 分量 分歧 分散 风度 风光 风气 风趣 封闭 丰满 风味 奉献 否决 夫妇 服从 俯视 辅助 腐败 腐烂 腐蚀 负担 覆盖 富裕 循环 究竟 局部 乃至 难免 确切 权衡 终身 逐步 资格 总而言之 总之 对弈 棋盘 棋子 交叉点 悔棋 胜负 围棋 落子 网格 围地 吃子'
};
function v32ApplyHsk30(){
  try{
    Object.entries(V32_HSK30).forEach(([lv,txt])=>txt.split(/\s+/).filter(Boolean).forEach(w=>{const n=+lv;const old=HSK_LEVEL.get(w);if(!old||n<old)HSK_LEVEL.set(w,n);}));
    const force={中:1,半:2,中间:3,之间:3,里面:1,外面:2,左右:4,月:1,圆:5,规定:4,过程:4,双方:4,先行:5,大小:3,决定:3,黑白:3,两种:2,交叉:5,条线:4,十九:2,十九条:6,棋盘:6,棋子:6,围棋:6,对弈:6,交叉点:6,胜负:6};
    Object.entries(force).forEach(([w,lv])=>HSK_LEVEL.set(w,lv));
    const extra=[...Object.values(V32_HSK30).join(' ').split(/\s+/),...Object.keys(force),'一半','中部','中方','中心','中学','月亮','月饼','月光','月球','圆形','圆圈'];
    extra.forEach(w=>{if(w&&!SEG_WORDS.includes(w))SEG_WORDS.push(w);});
    SEG_WORDS.sort((a,b)=>b.length-a.length);
  }catch(e){console.warn('HSK 3.0 patch falhou',e);}
}
v32ApplyHsk30();

const V32_LOCAL_MORE={
 '中':{pos:'NOUN / ADJ',defs:['middle; center','inside; among','China; Chinese'],pinyin:'zhōng'},
 '半':{pos:'NOUN / ADJ',defs:['half; semi-; incomplete'],pinyin:'bàn'},
 '中间':{pos:'NOUN',defs:['middle; center; among; between'],pinyin:'zhōngjiān'},
 '一半':{pos:'NOUN',defs:['half; one half'],pinyin:'yíbàn'},
 '之间':{pos:'NOUN',defs:['between; among'],pinyin:'zhījiān'},
 '左右':{pos:'NOUN / ADV',defs:['left and right','approximately; about','to influence'],pinyin:'zuǒyòu'},
 '过程':{pos:'NOUN',defs:['process; course'],pinyin:'guòchéng'},
 '规定':{pos:'NOUN / VERB',defs:['rule; regulation','to stipulate; to prescribe'],pinyin:'guīdìng'},
 '双方':{pos:'NOUN',defs:['both sides; the two parties'],pinyin:'shuāngfāng'},
 '先行':{pos:'VERB',defs:['to go first; to precede; to be carried out in advance'],pinyin:'xiānxíng'},
 '落子':{pos:'VERB / NOUN',defs:['to place a stone/piece in a board game','a move in Go or chess'],pinyin:'luòzǐ'},
 '悔棋':{pos:'VERB',defs:['to take back a move in chess or Go'],pinyin:'huǐqí'},
 '网格':{pos:'NOUN',defs:['grid; lattice'],pinyin:'wǎnggé'}
};
const oldLookupAll32=lookupAll;
lookupAll=async function(word){
  try{const r=await oldLookupAll32(word);if(r)return r;}catch{}
  const loc=(typeof v30LocalEntry==='function'?v30LocalEntry(word):null);
  if(loc&&loc.defs&&loc.defs.length)return{defs:[{pos:loc.pos||'',defs:loc.defs.map(t=>({text:t,ex:[]}))}],src:loc.src||'Local'};
  const m=V32_LOCAL_MORE[word];
  if(m)return{defs:[{pos:m.pos,defs:m.defs.map(t=>({text:t,ex:[]}))}],src:'Local'};
  return null;
};

const oldSpeakWordMode32=speakWordMode;
speakWordMode=async function(word,mode='natural'){
  if(mode==='slow')mode='natural';
  return oldSpeakWordMode32(word,'natural');
};
speakWord=function(word){return speakWordMode(word,'natural');};

renderToneBox=function(info,word){
  const box=document.getElementById('tone-box');const body=document.getElementById('tone-body');const pill=document.getElementById('tone-pill');
  if(!box||!body)return;
  if(!info||!info.changed){box.classList.remove('vis','open');body.innerHTML='';return;}
  box.classList.add('vis');box.classList.remove('open');
  if(pill)pill.textContent=(info.changes&&info.changes.length?info.changes.length:1)+' regra';
  body.innerHTML=`<div class="tone-word-row"><div class="tone-word">${esc(word)}</div><button class="tone-mini-audio" type="button" id="tone-pron" aria-label="Pronúncia">▶</button></div>
    <div class="tone-line"><span class="tone-lbl">Original</span><span class="tone-py-old">${esc(info.oldPy||'')}</span></div>
    <div class="tone-line"><span class="tone-lbl">Pronúncia</span><span class="tone-py-new">${esc(info.py||info.newPy||'')}</span></div>
    <div class="tone-reasons">${(info.changes||[]).map(x=>`• ${esc(x)}`).join('<br>')}</div>`;
  const b=document.getElementById('tone-pron');if(b)b.addEventListener('click',e=>{e.stopPropagation();speakWordMode(defWord,'natural');});
};

drillChar=async function(ch,py){
  if(!py)py=getWordPY(ch);
  setTipWord(ch,py,{oldPy:py,newPy:py,py,changed:false,changes:[]});
  tipLoading();
  speakWordMode(ch,'natural');
  try{defDefs=await lookupAll(ch);}catch{defDefs=null;}
  renderTipDefs(defDefs);
  requestAnimationFrame(()=>positionTip(tipAnchor));
};

function v32UiCleanup(){
  const nat=document.getElementById('tip-natural');
  if(nat){nat.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>Pronúncia';}
  const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.2';
}

const V32_SOURCES=[
 {type:'simple',level:1,title:'HSK 1 — Minha família',icon:'家',desc:'Leitura curta com vocabulário muito comum.',url:'',content:'我家有三个人。爸爸、妈妈和我。今天是星期六，我们在家喝茶、看书。晚上，我们一起吃米饭和菜。'},
 {type:'simple',level:2,title:'HSK 2 — Um dia de estudo',icon:'学',desc:'Texto simples com tempo, rotina e perguntas.',url:'',content:'今天上午我去学校上课。老师问了一个问题，我回答错了。下课以后，我和朋友一起去饭店吃饭。下午我回家复习中文。'},
 {type:'simple',level:3,title:'HSK 3 — Viagem curta',icon:'旅',desc:'Leitura de uma página com conectores e verbos comuns.',url:'',content:'上个周末，我和朋友坐火车去一个小城市旅行。那里的天气很好，街道很干净。我们先去了公园，然后参观了一个小博物馆。虽然时间不长，但是我觉得这次旅行很有意思。'},
 {type:'book',level:4,title:'围棋入门',icon:'棋',desc:'Livro curto dividido em capítulos sobre o texto de 围棋.',url:'',cover:'',chapters:[{num:1,title:'规则',content:'围棋有黑白两种棋子。规定由执黑色棋子的先行。双方在十九乘十九条线的棋盘网格上的交叉点交替放置黑色及白色的棋子。'},{num:2,title:'胜负',content:'落子完毕后，不能悔棋。对弈过程中围地吃子，以所围地的大小决定胜负。'}]},
 {type:'book',level:5,title:'三字经（节选）',icon:'三',desc:'Clássico público; texto curto para treino de ritmo e caracteres.',url:'https://ctext.org/three-character-classic/zh',chapters:[{num:1,title:'开篇',content:'人之初，性本善。性相近，习相远。苟不教，性乃迁。教之道，贵以专。'},{num:2,title:'学习',content:'昔孟母，择邻处。子不学，断机杼。窦燕山，有义方。教五子，名俱扬。'}]},
 {type:'book',level:6,title:'论语（节选）',icon:'论',desc:'Fonte clássica pública; nível alto por vocabulário e estilo.',url:'https://ctext.org/analects/zh',chapters:[{num:1,title:'学而',content:'子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？'},{num:2,title:'为政',content:'子曰：为政以德，譬如北辰，居其所而众星共之。'}]},
 {type:'book',level:6,title:'道德经（节选）',icon:'道',desc:'Clássico público com frases curtas, mas alta densidade semântica.',url:'https://ctext.org/dao-de-jing/zh',chapters:[{num:1,title:'第一章',content:'道可道，非常道。名可名，非常名。无名天地之始；有名万物之母。'},{num:2,title:'第二章',content:'天下皆知美之为美，斯恶已。皆知善之为善，斯不善已。'}]}
];
function v32ClassLevel(item){return item.level<=2?'l12':item.level<=4?'l34':'l56';}
async function v32AddSource(i){
  const s=V32_SOURCES[i];if(!s)return;
  if(s.type==='book'){
    const b={id:v29NewId(),kind:'book',title:s.title,source:s.url||'Fonte pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters:(s.chapters||[]).map(ch=>({id:v29NewId(),num:ch.num,title:ch.title,content:cleanRaw(ch.content),progress:0,addedAt:Date.now()})),lastRead:null,addedAt:Date.now(),lastChapterIndex:0};
    await dbPut(STB,b);books=await dbAll(STB);toast('Livro adicionado');
  }else{
    await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:cleanRaw(s.content||''),type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});
    books=await dbAll(STB);toast('Leitura adicionada');
  }
  renderLib();
}
renderDiscover=function(){
  const dc=document.getElementById('dc');if(!dc)return;
  dc.innerHTML=`<div class="src-grid">${V32_SOURCES.map((s,i)=>`<div class="src-card2"><div class="src-ico2" style="background:linear-gradient(135deg,#26384d,#6b547d,#d8a35a)">${esc(s.icon)}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-meta2"><span class="src-level ${v32ClassLevel(s)}">HSK ${s.level}</span>${s.type==='book'?'Livro':'Leitura simples'} • classificado por vocabulário dominante</div><div class="src-desc2">${esc(s.desc)}</div><div class="src-actions2"><button class="pri" data-add-src="${i}">＋ Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div></div></div>`).join('')}</div>`;
  dc.querySelectorAll('[data-add-src]').forEach(btn=>btn.onclick=()=>v32AddSource(parseInt(btn.dataset.addSrc)));
};

renderLib=function(){
 const bc=document.getElementById('bc'); if(!bc)return; const q=(searchQ||'').toLowerCase();
 const mode=v29LibMode==='books'?'books':'simple';
 const base=books.filter(b=>mode==='books'?v29Kind(b)==='book':v29Kind(b)!=='book');
 const list=q?base.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.source||'').toLowerCase().includes(q)||(b.synopsis||'').toLowerCase().includes(q)):base;
 if(mode==='simple')list.sort((a,b)=>((b.lastRead||b.addedAt||0)-(a.lastRead||a.addedAt||0)));else list.sort((a,b)=>((a.order??a.addedAt??0)-(b.order??b.addedAt??0)));
 document.getElementById('mode-simple')?.classList.toggle('on',mode==='simple'); document.getElementById('mode-books')?.classList.toggle('on',mode==='books');
 document.getElementById('plus-simple')?.classList.toggle('on',mode==='simple'); document.getElementById('plus-books')?.classList.toggle('on',mode==='books');
 if(mode==='simple'){
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Leitura simples</div><button class="lib-chip" id="simple-import-chip">Importar</button></div><div class="simple-list" id="simple-list"></div>`;
   document.getElementById('simple-import-chip').onclick=()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');};
   const wrap=document.getElementById('simple-list');
   if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhuma leitura simples.</b><br>Toque em + para importar URL, TXT, PDF textual ou texto colado.</div>';return;}
   list.forEach(b=>{const pct=Math.round((b.progress||0)*100);const el=document.createElement('div');el.className='card';el.innerHTML=`<button class="del-btn" title="Excluir" aria-label="Excluir">🗑</button><div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${v29Svg('book')}</svg></div><div class="bi"><div class="bt">${esc(b.title||'Sem título')}</div><div class="bs">${esc(b.source||'Leitura')}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;el.querySelector('.del-btn').onclick=e=>{e.stopPropagation();confirmDelBook(b.id);};el.onclick=e=>{if(e.target.closest('.del-btn'))return;openBook(b.id);};wrap.appendChild(el);});
 }else{
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;
   document.getElementById('view-cover').onclick=()=>{v29BookView='cover';localStorage.setItem('hbookView',v29BookView);renderLib();};document.getElementById('view-list').onclick=()=>{v29BookView='list';localStorage.setItem('hbookView',v29BookView);renderLib();};
   const wrap=document.getElementById('book-wrap'); if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em + em Livros para criar uma capa, sinopse e capítulos.</div>';return;}
   list.forEach(b=>{const ch=v29GetChapters(b);const pct=Math.round(v29BookProgress(b)*100);const el=document.createElement('div');el.className='book-card';el.innerHTML=`<button class="book-del" title="Excluir" aria-label="Excluir">🗑</button><button class="book-edit" data-edit-book="${b.id}" title="Editar">✎</button><div class="book-cover ${b.cover?'':'gen'}" style="${v29CoverStyle(b)}"></div><div><div class="book-name">${esc(b.title||'Sem título')}</div><div class="book-syn">${esc(b.synopsis||'Sem sinopse')}</div><div class="book-meta"><span>${ch.length} cap.</span><span>${pct}%</span></div></div>`;el.dataset.bookId=b.id;el.querySelector('.book-meta span').classList.add('chap-ind');el.onclick=e=>{if(document.body.classList.contains('hz-organize'))return;if(e.target.closest('.book-del')){confirmDelBook(b.id);return;}if(e.target.closest('[data-edit-book]')){v29OpenBookEditor(b.id);return;}if(e.target.closest('.chap-ind')){v29OpenChapterPicker(b.id);return;}if(ch.length)openBook(b.id);else toast('Adicione pelo menos um capítulo');};addLP(el,()=>{if(typeof hzEnterOrganize==='function')hzEnterOrganize();else v29OpenChapterPicker(b.id);});wrap.appendChild(el);});
   if(typeof hzDecorateOrganize==='function')hzDecorateOrganize();
 }
};

let v32Reading=false,v32ReadIndex=0,v32ReadSpeed='natural';
function v32InstallReaderControls(){
  const sr=document.getElementById('sr');if(!sr)return;
  const top=document.querySelector('#sr .rtop');
  if(top&&!document.getElementById('reader-top-back')){top.insertAdjacentHTML('afterbegin','<button class="reader-top-back" id="reader-top-back" title="Voltar">‹</button>');document.getElementById('reader-top-back').onclick=()=>{v32StopReading();showScreen('sl');renderLib();};}
  if(!document.getElementById('reader-ctrl')){
    const nav=document.querySelector('#sr .rbnav');
    nav?.insertAdjacentHTML('beforebegin','<div class="reader-ctrl" id="reader-ctrl"><button class="small" id="read-play" title="Ler">▶</button><button id="read-speed" title="Velocidade">Natural</button></div>');
    document.getElementById('read-play').onclick=()=>{if(v32Reading)v32StopReading();else v32StartReading();};
    document.getElementById('read-speed').onclick=()=>{v32ReadSpeed=v32ReadSpeed==='natural'?'paused':'natural';v32UpdateReadUi();};
  }
  v32UpdateReadUi();
}
function v32UpdateReadUi(){const p=document.getElementById('read-play'),s=document.getElementById('read-speed');if(p){p.textContent=v32Reading?'Ⅱ':'▶';p.classList.toggle('on',v32Reading);}if(s){s.textContent=v32ReadSpeed==='natural'?'Natural':'Pausado';s.classList.toggle('on',v32ReadSpeed==='paused');}}
function v32StopReading(){v32Reading=false;v32UpdateReadUi();try{if(curAudio)curAudio.pause();}catch{}document.querySelectorAll('.reading-hi').forEach(x=>x.classList.remove('reading-hi'));}
function v32VisibleToken(){const sc=document.getElementById('rscroll');const units=[...document.querySelectorAll('#rtext .wunit[data-tid]')];if(!sc||!units.length)return 0;const top=sc.getBoundingClientRect().top+8;for(const u of units){if(u.getBoundingClientRect().bottom>=top){return parseInt(u.dataset.tid)||0;}}return 0;}
async function v32StartReading(){if(!readerTokens.length)return;v32Reading=true;v32ReadIndex=v32VisibleToken();v32UpdateReadUi();while(v32Reading&&v32ReadIndex<readerTokens.length){const tok=readerTokens[v32ReadIndex];const el=document.querySelector(`#rtext .wunit[data-tid="${v32ReadIndex}"]`);document.querySelectorAll('.reading-hi').forEach(x=>x.classList.remove('reading-hi'));if(el){el.classList.add('reading-hi');el.scrollIntoView({block:'center',behavior:'smooth'});}await speakWordMode(tok.word,'natural');await delay(v32ReadSpeed==='paused'?170:55);v32ReadIndex++;}v32StopReading();}

const oldOpenSimple32=v29OpenSimpleReading;
v29OpenSimpleReading=async function(id){await oldOpenSimple32(id);v32InstallReaderControls();};
const oldOpenChapter32=v29OpenBookChapter;
v29OpenBookChapter=async function(id,idx){await oldOpenChapter32(id,idx);v32InstallReaderControls();};

function v32Boot(){v32ApplyHsk30();v32UiCleanup();v32InstallReaderControls();try{renderDiscover();renderLib();}catch(e){}}
setTimeout(v32Boot,260);
})();


/* v3.3: mini-popup de ideograma, HSK 3.0 reforçado, leitura sem saltar caracteres, formatação preservada, tela cheia e temas. */
(function(){
const V33_STYLE=`
.tip{overflow:visible}.tip-actions{justify-content:flex-start}.tip-actions .audbtn{flex:0 0 auto;min-width:118px;padding:7px 10px;border-radius:999px;font-size:12px}#tip-natural{max-width:142px}#tip-audio,#tip-slow{display:none!important}
.tip-ch{display:inline-flex;align-items:center;justify-content:center;min-width:.86em;border:1px solid transparent;border-radius:6px;padding:1px 2px;margin:0 1px;transition:border-color .12s,background .12s}.tip-ch.sel{border-color:rgba(var(--ac-rgb),.9);background:rgba(var(--ac-rgb),.12)}
.tip-py{margin-top:2px;margin-bottom:8px;font-family:var(--pyf)}.tip-py-grid{display:flex;align-items:flex-start;gap:2px;flex-wrap:wrap}.tip-py-cell{display:inline-flex;justify-content:center;align-items:center;min-width:2.18em;padding:0 2px;font-size:13px;font-family:var(--pyf);color:var(--ac);line-height:1.25;text-align:center;white-space:nowrap}.tip-py-cell.blank{min-width:.8em;color:#8a8a8a}.tip-py-cell.non{color:#777;min-width:1em}
.char-pop{position:absolute;z-index:260;width:min(256px,calc(100vw - 44px));background:#111;border:1px solid rgba(var(--ac-rgb),.42);box-shadow:0 14px 42px rgba(0,0,0,.72);border-radius:14px;padding:10px 11px;color:#ddd}.char-pop .cp-top{display:flex;align-items:flex-start;gap:8px}.char-pop .cp-hz{font-family:var(--rf);font-size:32px;color:#fff;line-height:1}.char-pop .cp-main{flex:1;min-width:0}.char-pop .cp-py{font-size:13px;color:var(--ac);font-weight:750;margin-bottom:3px}.char-pop .cp-def{font-size:12px;line-height:1.45;color:#cfcfcf;margin-top:4px}.char-pop .cp-src{font-size:10px;color:#8a8a8a;text-align:right;margin-top:4px}.char-pop .cp-btn,.char-pop .cp-x{border:0;border-radius:999px;background:#252525;color:var(--ac);width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}.char-pop .cp-x{color:#aaa;background:#202020;width:24px;height:24px}.char-pop .cp-empty{font-size:12px;color:#777;padding:8px 0}.char-pop .spin.sm{margin:6px auto}
#reader-fs{position:fixed;right:12px;bottom:calc(76px + var(--sb));z-index:80;width:34px;height:34px;border:1px solid rgba(255,255,255,.16);background:rgba(24,24,24,.72);backdrop-filter:blur(12px);color:#ddd;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px}.reader-fullscreen #reader-fs{bottom:calc(12px + var(--sb));background:rgba(0,0,0,.48)}.reader-fullscreen #sr .rtop,.reader-fullscreen #sr .reader-ctrl,.reader-fullscreen #sr .rbnav{display:none!important}.reader-fullscreen.reader-bars #sr .rbnav{display:flex!important;position:fixed;left:0;right:0;bottom:0;z-index:75}.reader-fullscreen #rscroll{padding-top:calc(12px + var(--st));padding-bottom:calc(42px + var(--sb))}.reader-fullscreen #sr{background:var(--rb)}
.theme-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.theme-btn{border:1px solid #3a3a3a;background:#252525;color:#ddd;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:750;cursor:pointer}.theme-btn.on{border-color:var(--ac);color:#111;background:var(--ac)}
.v44-swatch{display:inline-flex;align-items:center;gap:6px}
.v44-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;display:inline-block;border:1px solid rgba(255,255,255,.25)}
body.reader-theme-dark #sr{--rb:#0b0d10;--rc:#ece7df;--rp:#a99f90;--rn:#111316}body.reader-theme-dark .rtop{background:var(--rb);border-bottom-color:rgba(255,255,255,.08)}body.reader-theme-dark .pt,body.reader-theme-dark .hzrow{color:var(--rc)}
body.reader-theme-sepia #sr{--rb:#eadcc3;--rc:#2d2117;--rp:#80664c;--rn:#201812}body.reader-theme-green #sr{--rb:#edf2e5;--rc:#213024;--rp:#748267;--rn:#182018}
.pb{margin:16px 0}.sp{white-space:pre}
`;
const st=document.createElement('style');st.textContent=V33_STYLE;document.head.appendChild(st);

const V33_HSK30_MORE={
1:'一 一些 一点儿 一下 一个 一天 一年 一月 一日 上 下 中 里 外 前 后 左 右 东 西 南 北 里面 外面 上面 下面 前面 后面 旁边 之间 以后 以前 时候 时间 小时 分钟 秒 年 月 日 天 星期 今天 昨天 明天 现在 刚才 家 人 老师 学生 同学 朋友 爸爸 妈妈 哥哥 姐姐 弟弟 妹妹 儿子 女儿 孩子 男 女 男人 女人 中国 中国人 中文 汉语 普通话 字 词 句子 书 钱 水 茶 饭 菜 米饭 水果 苹果 手机 电脑 电视 房间 门 车 学校 医院 商店 饭店 天气 工作 身体 手 眼睛 耳朵 口 是 有 在 去 来 回 看 听 说 读 写 学 会 能 想 要 喜欢 爱 认识 知道 吃 喝 买 坐 住 叫 开 关 进 出 上 下 给 请 谢谢 对不起 没关系 再见 的 了 吗 呢 吧 和 也 都 很 太 不 没 没有 好 大 小 多 少 高 长 白 黑 红 绿 蓝 黄 快 慢 热 冷 新 旧 对 错 半 两 每 中间',
2:'因为 所以 但是 如果 虽然 然后 已经 正在 可能 可以 应该 需要 觉得 希望 告诉 问 回答 帮 帮助 介绍 找 到 等 准备 开始 完 完成 玩 休息 睡觉 起床 上班 下班 生病 运动 跑步 游泳 旅游 考试 课 问题 事情 路 远 近 离 从 到 让 送 票 服务员 公司 生日 快乐 新年 颜色 黑色 白色 左边 右边 外面 早 晚 忙 累 贵 便宜 真 最 还 就 再 一起 有点 有一点儿 意思 次 第一 第二',
3:'一般 一定 一直 一边 其实 其他 奇怪 认为 认真 重要 主要 注意 自己 总是 最后 最近 作业 作用 选择 要求 影响 愿意 遇到 了解 明白 记得 忘记 发现 决定 解决 参加 关系 关心 关于 国家 城市 世界 地方 地图 地铁 街道 公园 图书馆 银行 超市 宾馆 办公室 会议 经理 司机 客人 邻居 同事 新闻 节目 音乐 电影 照片 历史 文化 声音 故事 机会 季节 春 夏 秋 冬 太阳 月亮 动物 河 花 花园 方便 简单 清楚 健康 感冒 发烧 容易 难 难过 热情 可爱 年轻 新鲜 安静 干净 满意 大小',
4:'安排 安全 按时 按照 标准 表示 保护 保证 报名 本来 毕业 变化 表格 表演 参加 餐厅 超过 成功 成为 诚实 出差 出发 出生 出现 传统 从来 答案 打扰 大概 大约 当时 到底 道歉 地址 调查 对话 发生 发展 法律 翻译 反对 方法 方面 放弃 丰富 负责 复杂 改变 感觉 感情 感谢 高级 共同 购物 够 估计 鼓励 关键 管理 规定 国际 过程 好处 合适 后悔 互联网 活动 怀疑 获得 积极 积累 继续 计划 技术 价格 坚持 建议 将来 交流 交通 教育 接受 结果 解释 进行 禁止 精彩 经济 经历 经验 竞争 举办 举行 距离 看法 考虑 科学 肯定 困难 理解 理想 联系 流利 流行 旅行 麻烦 能力 排队 判断 批评 平时 普遍 其次 其中 情况 区别 全部 缺点 缺少 确实 然而 任何 任务 社会 申请 甚至 生活 生命 使用 失败 失望 实际 适合 适应 收入 首先 受到 数字 速度 顺利 说明 随便 随着 所有 态度 讨论 讨厌 特点 提供 提醒 条件 停止 通过 通知 完全 危险 温度 文章 污染 无论 误会 吸引 相反 相同 详细 消息 小说 效果 心情 信心 信息 信任 幸福 性格 压力 严格 严重 研究 演出 阳光 邀请 一切 引起 印象 赢 永远 勇敢 优点 优秀 由于 尤其 有趣 友好 友谊 语法 语言 原因 阅读 责任 增加 正常 正确 支持 知识 值得 直接 职业 植物 质量 至少 重点 重视 周围 主意 著名 专业 准确 准时 仔细 自然 总结 尊重 左右',
5:'保持 保存 保留 抱怨 背景 比例 必然 避免 编辑 表面 病毒 博物馆 不断 不如 不足 步骤 部门 财产 采访 采取 参考 参与 差距 产品 产生 常识 彻底 沉默 充分 充满 重复 抽象 出色 出席 处理 传播 创造 此外 刺激 促进 存在 错误 达到 大方 单独 单位 担任 当地 导演 等待 等于 地道 地理 地区 地位 电视剧 独立 独特 度过 对待 对方 对手 对象 多余 发表 发达 发挥 发明 法院 反而 范围 方言 方式 费用 分别 分布 分配 风格 风险 辅导 复制 改革 改善 改正 概括 概念 感激 感受 干燥 赶紧 个别 公式 公平 公寓 功能 贡献 沟通 构成 古代 固定 观察 观点 广场 归纳 规则 规模 行业 合法 合理 合同 合作 核心 忽然 忽视 化学 话题 缓解 恢复 婚礼 婚姻 活跃 伙伴 基本 基础 机器 激烈 集体 集中 记忆 计算 记录 纪律 寂寞 家务 假如 坚决 简历 建立 建设 建筑 讲座 交换 交际 交往 接触 结构 结合 结论 尽快 尽量 经典 经营 具体 绝对 决心 开发 开放 控制 扩大 劳动 老百姓 老板 类型 立即 利益 利用 连续 联合 良好 领导 领域 浏览 录取 论文 逻辑 旅游 贸易 秘书 秘密 面对 面积 面临 明显 目标 目前 能源 年代 农业 培训 培养 配合 批 平等 平衡 平均 评价 期待 期间 企业 气氛 谦虚 前途 强调 强烈 签订 签字 青春 轻易 请求 取得 取消 权力 确认 确定 热爱 热烈 人生 人口 人才 人物 日常 如今 商品 商业 设备 设计 设施 身份 深刻 生产 生动 胜利 失去 时代 实现 实验 市场 事实 事物 收获 舒服 属于 数量 数学 思考 思想 损失 所谓 谈判 特殊 特征 提倡 提交 体现 挑战 通常 统一 投资 突出 土地 推广 推荐 完美 完善 完整 网络 危害 维护 未来 位于 位置 温暖 文件 文明 文学 稳定 无数 物理 物质 系统 细节 现代 现实 现象 项目 消费 销售 效率 写作 一致 依然 移动 疑问 艺术 议论 引用 隐藏 营养 应用 优惠 优势 预报 预订 原则 圆 运输 赞成 造成 掌握 争论 整个 整体 制定 制度 制造 制作 智慧 中心 种类 重大 主题 追求 资料 资源 综合 组成 组织 作品 作为',
6:'案件 案例 摆脱 拜访 败坏 颁布 伴随 半途而废 扮演 绑架 榜样 包围 包装 保管 保密 保守 保卫 保障 报酬 报答 报复 抱负 暴力 暴露 悲惨 悲观 本质 彼此 必定 必要 辩护 辩解 辨认 标记 表决 表态 表彰 别墅 并非 并列 波浪 博大精深 搏斗 不顾 不禁 不堪 不可思议 不愧 不料 不时 不惜 不相上下 补偿 补救 部署 财富 财务 裁判 采购 操纵 操作 草案 策划 测量 层出不穷 差别 差异 常年 常务 尝试 偿还 场合 场面 倡导 倡议 超越 朝气 嘲笑 撤退 沉淀 陈列 陈述 称赞 承办 承包 承诺 承认 承受 成本 成交 成效 成员 呈现 诚恳 程序 惩罚 充当 充沛 充实 崇拜 崇高 崇敬 出卖 出身 初步 处境 储备 触犯 传达 传授 创业 慈善 辞职 此起彼伏 从容 摧残 脆弱 达成 打击 大胆 代理 逮捕 怠慢 担保 当场 当初 当代 当前 当事人 当务之急 档案 倒闭 导航 导弹 得不偿失 得力 得天独厚 得罪 登陆 登载 等候 等级 抵达 抵抗 抵制 地步 地势 地质 典礼 典型 奠定 电源 调节 调解 对策 对称 对付 对抗 对立 队伍 顿时 多元化 额外 恶化 发布 发誓 发行 发扬 法定 法人 法规 法则 方位 防守 防御 访问 飞跃 分辨 分寸 分解 分裂 分量 分歧 分散 风度 风光 风气 风趣 封闭 丰满 风味 奉献 否决 夫妇 服从 俯视 辅助 腐败 腐烂 腐蚀 负担 覆盖 富裕 循环 究竟 局部 乃至 难免 确切 权衡 终身 逐步 资格 总而言之 总之 对弈 棋盘 棋子 交叉点 悔棋 胜负 围棋 落子 网格 围地 吃子'
};
function v33ApplyHsk30(){
  Object.entries(V33_HSK30_MORE).forEach(([lv,txt])=>txt.split(/\s+/).filter(Boolean).forEach(w=>{const n=+lv;const old=HSK_LEVEL.get(w);if(!old||n<old)HSK_LEVEL.set(w,n);}));
  Object.entries({的:1,地:1,得:2,有:1,在:1,中:1,上:1,下:1,半:2,了:1,着:2,过:2,吧:2,呢:1,啊:2,呀:2,吗:1,也:1,都:1,就:2,还:2,再:2,很:1,太:1,最:2,会:1,能:1,要:1,想:1,可以:2,因为:2,所以:2,但是:2,如果:2,虽然:2,然后:2,现在:1,已经:2,正在:2,没有:1,不是:1,不要:2,不能:2,不会:2,里面:1,中间:3,月:1,圆:5}).forEach(([w,lv])=>HSK_LEVEL.set(w,lv));
  const extra=[...Object.values(V33_HSK30_MORE).join(' ').split(/\s+/)];
  extra.forEach(w=>{if(w&&!SEG_WORDS.includes(w))SEG_WORDS.push(w);});SEG_WORDS.sort((a,b)=>b.length-a.length);
  if(window.readerTokens&&readerTokens.length){document.querySelectorAll('#rtext .wunit[data-tid]').forEach(el=>{const tok=readerTokens[+el.dataset.tid];if(!tok)return;tok.level=getWordLevel(tok.word);el.classList.remove('lv1','lv2','lv3','lv4','lv5','lv6','lvx');el.classList.add(levelClass(tok.level));el.dataset.lv=tok.level>=1&&tok.level<=6?String(tok.level):'x';});try{applyPinyin();}catch{}}
}
v33ApplyHsk30();

const oldCleanRaw33=cleanRaw;
cleanRaw=function(raw){
  if(!raw)return'';
  let s=String(raw).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/[\u200B\u200C\u200D]/g,'');
  const lines=s.split('\n').map(l=>/^https?:\/\//i.test(l.trim())?'':l.replace(/[\t ]+$/g,''));
  while(lines.length&&!lines[0].trim())lines.shift();
  while(lines.length&&!lines[lines.length-1].trim())lines.pop();
  return lines.join('\n');
};

function v33PinyinArray(word,py){
  const chars=[...String(word||'')];let arr=(py||getWordPY(word)||'').trim().split(/\s+/).filter(Boolean);
  if(arr.length<chars.filter(isCJK).length){arr=chars.map(ch=>isCJK(ch)?getWordPY(ch):'');}
  let k=0;return chars.map(ch=>{if(isCJK(ch))return arr[k++]||getWordPY(ch)||'';return ch.trim()?ch:'';});
}
function v33RenderTipPy(word,py){const chars=[...String(word||'')];const pys=v33PinyinArray(word,py);return '<div class="tip-py-grid">'+chars.map((ch,i)=>`<span class="tip-py-cell ${isCJK(ch)?'':'non'}${!String(ch).trim()?' blank':''}">${esc(pys[i]||'')}</span>`).join('')+'</div>';}
const oldSetTipWord33=setTipWord;
setTipWord=function(word,py,toneInfo){
  closeCharPop();
  const tone=toneInfo||applyToneSandhi(word,py||getWordPY(word));
  defWord=word;defOriginalPy=tone.oldPy||py||'';defNaturalPy=tone.py||tone.newPy||py||'';defPy=defNaturalPy;defToneInfo=tone;
  const chars=[...String(word||'')];const pys=v33PinyinArray(word,defNaturalPy||py);const isM=chars.filter(isCJK).length>1;
  const wd=document.getElementById('tip-wd');
  if(isM){wd.innerHTML=chars.map((c,i)=>isCJK(c)?`<span class="tip-ch" data-tip-char="${esc(c)}" data-tip-py="${esc(pys[i]||getWordPY(c)||'')}">${esc(c)}</span>`:esc(c)).join('');}
  else{wd.textContent=word;}
  document.getElementById('tip-py').innerHTML=v33RenderTipPy(word,defNaturalPy||py);
  wd.querySelectorAll('.tip-ch').forEach(sp=>sp.addEventListener('click',e=>drillChar(e,sp.dataset.tipChar,sp.dataset.tipPy)));
  renderToneBox(tone,word);
};
function closeCharPop(){const p=document.getElementById('char-pop');if(p)p.remove();document.querySelectorAll('.tip-ch.sel').forEach(x=>x.classList.remove('sel'));}
function v33CharDefsHtml(result){
  if(!result||!result.defs||!result.defs.length)return'<div class="cp-empty">Sem definição encontrada para este ideograma isolado.</div>';
  let html='';
  result.defs.slice(0,3).forEach(s=>{if(s.pos)html+=`<div class="cp-def"><b>${esc(s.pos)}</b></div>`;(s.defs||[]).slice(0,4).forEach((d,i)=>{html+=`<div class="cp-def"><b>${i+1}.</b> ${esc(d.text||'')}</div>`;});});
  if(result.src)html+=`<div class="cp-src">${esc(result.src)}</div>`;return html;
}
async function v33LookupChar(ch){try{return await lookupAll(ch);}catch{return null;}}
drillChar=async function(evOrCh,chArg,pyArg){
  let ev=null,ch='',py='';
  if(typeof evOrCh==='object'&&evOrCh){ev=evOrCh;ch=chArg;py=pyArg||'';}else{ch=evOrCh;py=chArg||'';}
  if(ev){ev.preventDefault();ev.stopPropagation();}
  closeCharPop();
  const anchor=ev?.currentTarget||[...document.querySelectorAll('.tip-ch')].find(x=>x.dataset.tipChar===ch);
  if(anchor)anchor.classList.add('sel');
  py=py||getWordPY(ch);
  const tip=document.getElementById('tip');const pop=document.createElement('div');pop.id='char-pop';pop.className='char-pop';
  pop.innerHTML=`<div class="cp-top"><div class="cp-hz">${esc(ch)}</div><div class="cp-main"><div class="cp-py">${esc(py)}</div><div id="cp-body"><div class="spin sm"></div></div></div><button class="cp-btn" id="cp-aud" title="Pronúncia">▶</button><button class="cp-x" id="cp-x" title="Fechar">×</button></div>`;
  tip.appendChild(pop);
  const place=()=>{if(!anchor)return;const tr=tip.getBoundingClientRect(),ar=anchor.getBoundingClientRect();let left=ar.left-tr.left+ar.width/2-pop.offsetWidth/2;left=Math.max(8,Math.min(left,tip.offsetWidth-pop.offsetWidth-8));let top=ar.top-tr.top-pop.offsetHeight-8;if(top<6)top=ar.bottom-tr.top+8;pop.style.left=left+'px';pop.style.top=top+'px';};
  requestAnimationFrame(place);
  document.getElementById('cp-x').onclick=e=>{e.stopPropagation();closeCharPop();};
  document.getElementById('cp-aud').onclick=e=>{e.stopPropagation();speakWordMode(ch,'char');};
  speakWordMode(ch,'char');
  const res=await v33LookupChar(ch);const body=document.getElementById('cp-body');if(body)body.innerHTML=v33CharDefsHtml(res);requestAnimationFrame(place);
};
document.addEventListener('click',e=>{if(document.getElementById('char-pop')&&!e.target.closest('#char-pop')&&!e.target.closest('.tip-ch'))closeCharPop();},true);
const oldHideTip33=hideTip;hideTip=function(){closeCharPop();oldHideTip33();};

async function v33LookupWiktLang(word,lang){
  try{const r=await fetch(`https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,{signal:AbortSignal.timeout(5200)});if(!r.ok)return null;const d=await r.json();const sec=d.zh||d.cmn||d['Chinese']||d['Mandarin']||null;if(!sec||!sec.length)return null;const defs=[];sec.forEach(s=>{const ds=(s.definitions||[]).map(x=>({text:String(x.definition||'').replace(/<[^>]*>/g,'').trim(),ex:(x.examples||[]).map(e=>String(e.example||e.text||'').replace(/<[^>]*>/g,'').trim()).filter(Boolean).slice(0,1)})).filter(x=>x.text);if(ds.length)defs.push({pos:s.partOfSpeech||'',defs:ds});});return defs.length?{defs,src:(lang==='pt'?'Wikcionário':'Wiktionary')}:null;}catch{return null;}
}
const oldLookupAll33=lookupAll;
lookupAll=async function(word){
  const groups=[],srcs=[];const seen=new Set();
  function add(res){if(!res||!res.defs)return;srcs.push(res.src||'');for(const g of res.defs){const pos=g.pos||'';const defs=[];for(const d of g.defs||[]){const text=(d.text||'').trim();if(!text||seen.has(pos+'|'+text))continue;seen.add(pos+'|'+text);defs.push({text,ex:d.ex||[],pyHint:d.pyHint||null});}if(defs.length)groups.push({pos,defs});}}
  try{if(typeof V30_LOCAL_DICT==='object'&&V30_LOCAL_DICT[word]){const e=V30_LOCAL_DICT[word];add({src:'Local',defs:[{pos:e.pos||'',defs:(e.defs||[]).map(t=>({text:t,ex:[]}))}]});}}catch{}
  try{add(await lookupCEDICT(word));}catch{}
  const hasEnough=()=>groups.reduce((n,g)=>n+g.defs.length,0)>=2;
  if(!hasEnough())add(await v33LookupWiktLang(word,'pt'));
  if(!hasEnough())add(await v33LookupWiktLang(word,'en'));
  if(!hasEnough())try{add(await lookupCC(word));}catch{}
  if(!hasEnough())try{add(await lookupGT(word));}catch{}
  if(!groups.length)try{add(await oldLookupAll33(word));}catch{}
  if(!groups.length)return null;
  const result={defs:groups.slice(0,8),src:[...new Set(srcs.filter(Boolean))].join(' + ')};
  const cjkChars=[...word].filter(isCJK);
  let isMultiToken=false;
  try{const run=cjkChars.join('');isMultiToken=run&&segmentChineseRun(run).length>1;}catch{}
  const [sogou,tatoeba]=await Promise.all([
    (async()=>{try{return await lookupSogouSuggestions(word);}catch{return[];}})(),
    (async()=>{try{return await lookupTatoebaExamples(word,4);}catch{return[];}})()
  ]);
  if(sogou&&sogou.length)result.sogou=sogou;
  if(tatoeba&&tatoeba.length)result.tatoeba=tatoeba;
  if((isMultiToken||cjkChars.length>1)&&cjkChars.length<=6){
    const uniqueChars=[...new Set(cjkChars)];
    try{
      const charDefs=await Promise.all(uniqueChars.map(async ch=>{
        try{const r=await lookupCEDICT(ch);return{ch,text:r?.defs?.[0]?.defs?.[0]?.text||null};}
        catch{return{ch,text:null};}
      }));
      if(charDefs.some(c=>c.text))result.charDefs=charDefs;
    }catch{}
  }
  return result;
};

const oldSpeakWordMode33=speakWordMode;
async function v33PlayChar(ch){let ok=false;try{ok=await playNaturalDb(ch,{discover:false});}catch{}if(!ok)try{ok=await playNaturalDb(ch,{discover:true});}catch{}if(!ok){try{ok=await oldSpeakWordMode33(ch,'natural').then(()=>true).catch(()=>false);}catch{}}await delay(120);return ok;}
async function v33SpeakTextNatural(text){const parts=(typeof v30AudioSegments==='function'?v30AudioSegments(text):String(text).split('')).filter(Boolean);let ok=false;for(const p of parts){if(/[，,、；;：:]/.test(p)){await delay(90);continue;}if(/[。！？!?]/.test(p)){await delay(190);continue;}if([...p].filter(isCJK).length===1)ok=await v33PlayChar([...p].find(isCJK))||ok;else {let got=false;try{got=await playNaturalDb(p,{discover:false});}catch{}if(!got)try{got=await playCjkSequence([...p].filter(isCJK),42,{discover:false});}catch{}ok=got||ok;}await delay(60);}return ok;}
speakWordMode=async function(word,mode='natural'){
  if(mode==='slow')mode='natural';
  const s=String(word||'');const cjk=[...s].filter(isCJK);if(!cjk.length)return;
  if(mode==='char'||cjk.length===1){setAudioBusy('natural',true);try{await v33PlayChar(cjk[0]);}finally{setAudioBusy('natural',false);}return;}
  setAudioBusy('natural',true);try{let ok=false;try{ok=await playNaturalDb(s,{discover:true});}catch{}if(!ok)ok=await v33SpeakTextNatural(s);if(!ok)toast('Não consegui reproduzir este trecho nas rotas atuais.');}finally{setAudioBusy('natural',false);}
};
speakWord=function(word){return speakWordMode(word,'natural');};

function v33ApplyTheme(name){name=name||localStorage.getItem('readerTheme')||'paper';document.body.classList.remove('reader-theme-dark','reader-theme-sepia','reader-theme-green');if(name!=='paper')document.body.classList.add('reader-theme-'+name);localStorage.setItem('readerTheme',name);document.querySelectorAll('[data-reader-theme]').forEach(b=>b.classList.toggle('on',b.dataset.readerTheme===name));}
function v33InstallThemeControls(){
  const html='<div class="style-row" id="theme-row-v33"><div><div class="style-lbl">Tema de leitura</div><div class="style-sub">Papel, sépia, verde suave ou escuro</div><div class="theme-row"><button class="theme-btn" data-reader-theme="paper">Papel</button><button class="theme-btn" data-reader-theme="sepia">Sépia</button><button class="theme-btn" data-reader-theme="green">Verde</button><button class="theme-btn" data-reader-theme="dark">Escuro</button></div></div></div>';
  const ms=document.querySelector('#mo-style #style-scroll')||document.querySelector('#mo-style .ms');if(ms&&!document.getElementById('theme-row-v33'))ms.insertAdjacentHTML('beforeend',html);
  const sg=document.querySelector('#ss .sg');if(sg&&!document.getElementById('theme-row-settings-v33'))sg.insertAdjacentHTML('beforeend',html.replace('theme-row-v33','theme-row-settings-v33'));
  document.querySelectorAll('[data-reader-theme]').forEach(b=>b.onclick=()=>v33ApplyTheme(b.dataset.readerTheme));v33ApplyTheme();
}
// Tema do aplicativo (cor de destaque em toda a interface, EXCETO o papel do
// leitor, que é um sistema separado e não é afetado). Pensado com cores mais
// maduras/calmas — terrosas e um vermelho suave — ao lado do laranja atual.
const V44_THEMES={
  earth:{ac:'#e8875d',rgb:'232,135,93',label:'Terra'},
  red:{ac:'#e58374',rgb:'229,131,116',label:'Vermelho'},
  orange:{ac:'#f5a623',rgb:'245,166,35',label:'Antigo'}
};
function v44ApplyAppTheme(name){
  if(!name&&!localStorage.getItem('appThemeMigratedV2')){
    try{localStorage.setItem('appThemeMigratedV2','1');}catch{}
    if((localStorage.getItem('appTheme')||'orange')==='orange')name='earth';
  }
  name=(name&&V44_THEMES[name])?name:(localStorage.getItem('appTheme')||'earth');
  const t=V44_THEMES[name]||V44_THEMES.earth;
  document.documentElement.style.setProperty('--ac',t.ac);
  document.documentElement.style.setProperty('--ac-rgb',t.rgb);
  try{localStorage.setItem('appTheme',name);}catch{}
  document.querySelectorAll('[data-app-theme]').forEach(b=>b.classList.toggle('on',b.dataset.appTheme===name));
}
function v44InstallAppThemeControls(){
  const sg=document.querySelector('#ss .sg');
  if(!sg||document.getElementById('theme-row-app-v44'))return;
  const html=`<div class="style-row" id="theme-row-app-v44"><div><div class="style-lbl">Tema do aplicativo</div><div class="style-sub">Cor de destaque em toda a interface — não afeta o papel do leitor</div><div class="theme-row">${Object.entries(V44_THEMES).map(([k,t])=>`<button class="theme-btn v44-swatch" data-app-theme="${k}"><span class="v44-dot" style="background:${t.ac}"></span>${esc(t.label)}</button>`).join('')}</div></div></div>`;
  sg.insertAdjacentHTML('beforeend',html);
  document.querySelectorAll('[data-app-theme]').forEach(b=>b.onclick=()=>v44ApplyAppTheme(b.dataset.appTheme));
  v44ApplyAppTheme();
}
v44ApplyAppTheme();
function v33InstallFullscreenControls(){
  const sr=document.getElementById('sr');if(!sr)return;
  const dock=document.getElementById('mini-dock');
  if(dock&&!document.getElementById('reader-fs')){
    dock.insertAdjacentHTML('beforeend','<button class="mini-dock-btn" id="reader-fs" title="Tela cheia">⛶</button>');
  }
  const btn=document.getElementById('reader-fs');
  if(btn&&!btn._v33){
    btn._v33=true;
    const toggle=()=>{const on=!document.body.classList.contains('reader-fullscreen');document.body.classList.toggle('reader-fullscreen',on);document.body.classList.remove('reader-bars');btn.textContent=on?'×':'⛶';};
    btn.onclick=e=>{e.stopPropagation();toggle();};
  }
  if(!sr._v33Swipe){
    sr._v33Swipe=true;
    let sy=0;const sc=document.getElementById('rscroll');
    sc?.addEventListener('touchstart',e=>{sy=e.touches?.[0]?.clientY||0;},{passive:true});
    sc?.addEventListener('touchend',e=>{const ey=e.changedTouches?.[0]?.clientY||sy;if(sy-ey>46&&document.body.classList.contains('reader-fullscreen')){document.body.classList.add('reader-bars');setTimeout(()=>document.body.classList.remove('reader-bars'),5200);}},{passive:true});
    sc?.addEventListener('contextmenu',e=>{if(document.body.classList.contains('reader-fullscreen')){e.preventDefault();document.body.classList.add('reader-bars');setTimeout(()=>document.body.classList.remove('reader-bars'),5200);}});
  }
}
const oldV32Install33=typeof v32InstallReaderControls==='function'?v32InstallReaderControls:null;
if(oldV32Install33){v32InstallReaderControls=function(){oldV32Install33();v33InstallFullscreenControls();};}
const oldStartReading33=typeof v32StartReading==='function'?v32StartReading:null;
v32StartReading=async function(){if(!readerTokens.length)return;v32Reading=true;v32ReadIndex=v32VisibleToken();v32UpdateReadUi();while(v32Reading&&v32ReadIndex<readerTokens.length){const tok=readerTokens[v32ReadIndex];const el=document.querySelector(`#rtext .wunit[data-tid="${v32ReadIndex}"]`);document.querySelectorAll('.reading-hi').forEach(x=>x.classList.remove('reading-hi'));if(el){el.classList.add('reading-hi');el.scrollIntoView({block:'center',behavior:'smooth'});}const w=tok.word||tok.char;if([...w].filter(isCJK).length===1)await speakWordMode(w,'char');else await speakWordMode(w,'natural');await delay(v32ReadSpeed==='paused'?220:85);v32ReadIndex++;}v32StopReading();};
function v33Boot(){v33ApplyHsk30();v33InstallThemeControls();v44InstallAppThemeControls();v33InstallFullscreenControls();try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.3';const nat=document.getElementById('tip-natural');if(nat)nat.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>Pronúncia';}catch{}}
setTimeout(v33Boot,420);
})();
