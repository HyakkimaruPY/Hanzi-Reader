
/* ===== Hanzi Reader: TTS bridge client helper ===== */
(function(){
'use strict';
window.HZ_TTS_API_ROUTE = window.HZ_TTS_API_ROUTE || '/api/tts-edge';
window.hzTtsEdgeApiBlob = async function hzTtsEdgeApiBlob(ssml, settings){
  settings = settings || {};
  const outputFormat = settings.outputFormat || settings.format || settings.quality || settings.ttsQuality || 'audio-24khz-48kbitrate-mono-mp3';
  const payload = { ssml: String(ssml || ''), outputFormat, format: outputFormat };
  const r = await fetch(window.HZ_TTS_API_ROUTE, {
    method: 'POST',
    headers: {'Content-Type':'application/json','X-Hanzi-Reader':'1'},
    body: JSON.stringify(payload)
  });
  if(!r.ok){
    let detail='';
    try{ const j=await r.json(); detail = (j.step?('step: '+j.step+' | '):'') + (j.error || JSON.stringify(j)); }
    catch(e){ try{ detail = await r.text(); }catch(_){} }
    throw new Error('Serviço de voz: '+r.status+(detail?' — '+detail:''));
  }
  const blob = await r.blob();
  if(!blob || blob.size < 100) throw new Error('Serviço de voz retornou áudio vazio.');
  return blob;
};
})();


/* ===== inline-1 ===== */
const DB='hanzi_r2',DBV=3,STB='books',STW='words';
let db=null,books=[],words=[],curBook=null;
let fontSize=38,showPinyin=true,pinyinLevelMode=false,pinyinMinLevel=2;
let defWord='',defDefs=null,defPy='',defOriginalPy='',defNaturalPy='',defToneInfo=null;
let readerTokens=[],readerCharRefs=[];
let searchQ='';
let curAudio=null;

// Agenda bancos e migrações não críticos para um período ocioso. Isso mantém a
// primeira pintura responsiva sem retirar os fallbacks internos usados pela UI.
function hzScheduleIdle(task, timeout=1800){
  const run=()=>Promise.resolve().then(task).catch(e=>{try{console.warn('[idle-task]',e);}catch{}});
  if(typeof requestIdleCallback==='function')return requestIdleCallback(run,{timeout});
  return setTimeout(run,Math.min(timeout,650));
}
try{window.hzScheduleIdle=hzScheduleIdle;}catch{}

const TABS=['sl','sw','sd','ss'];
const TLBL={sl:'Library',sw:'Words',sd:'Discover',ss:'Settings'};
const TSVG={
  sl:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  sw:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z"/>',
  sd:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  ss:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>'
};
const DISC=[
  {n:'Du Chinese',url:'https://duchinese.net',d:'Histórias graduadas com pinyin e tradução',lv:['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6'],ic:'读',c:'#1e3a5f'},
  {n:"Chairman's Bao",url:'https://thechairmansbao.com',d:'Jornal em chinês classificado por nível HSK',lv:['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6'],ic:'报',c:'#3a1a1a'},
  {n:'Mandarin Bean',url:'https://mandarinbean.com',d:'Diálogos e histórias graduadas com áudio',lv:['HSK1','HSK2','HSK3','HSK4','HSK5'],ic:'话',c:'#1a3a1a'},
  {n:'Heavenly Path',url:'https://heavenlypath.info',d:'Textos gratuitos com vocabulário controlado',lv:['HSK1','HSK2','HSK3'],ic:'道',c:'#2a2a1a'},
  {n:'Chinese Boost',url:'https://chineseboost.com',d:'Leituras graduadas com notas gramaticais',lv:['HSK1','HSK2','HSK3','HSK4','HSK5'],ic:'学',c:'#1a1a3a'},
  {n:'Mandarin Corner',url:'https://mandarincorner.org',d:'Transcrições de conteúdo autêntico',lv:['HSK3','HSK4','HSK5','HSK6'],ic:'角',c:'#2d1a2d'},
  {n:'Purple Culture',url:'https://purple-culture.net',d:'Literatura clássica com tradução paralela',lv:['HSK4','HSK5','HSK6'],ic:'文',c:'#2d1a3a'},
  {n:'Chinese Text Project',url:'https://ctext.org',d:'Textos filosóficos e literários clássicos',lv:['HSK5','HSK6'],ic:'典',c:'#3a2a1a'},
  {n:'LingQ Chinese',url:'https://www.lingq.com/zh-cn',d:'Biblioteca com milhares de textos da comunidade',lv:['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6'],ic:'语',c:'#1a3a2a'},
];

const HSK_WORDS={
1:'我 你 您 他 她 它 我们 你们 他们 她们 这 那 这里 那里 哪 谁 什么 多少 几 怎么 怎么样 现在 今天 明天 昨天 年 月 日 星期 点 分 时候 早上 中午 下午 晚上 中国 中国人 中文 汉语 北京 家 学校 商店 饭店 医院 机场 车站 老师 学生 同学 朋友 爸爸 妈妈 儿子 女儿 先生 小姐 人 名字 书 钱 水 茶 菜 米饭 苹果 电影 天气 狗 猫 东西 桌子 椅子 出租车 电视 电脑 手机 衣服 工作 身体 眼睛 耳朵 口 会 能 想 要 是 有 在 去 来 回 看 听 说 读 写 学 认识 知道 喜欢 爱 吃 喝 买 坐 住 叫 开 下 雨 睡觉 打电话 做 很 太 都 不 没 和 也 的 了 吗 呢 喂 谢谢 不客气 再见 对不起 没关系 没问题 一 二 三 四 五 六 七 八 九 十 零 个 本 些 块 岁',
2:'吧 白 百 帮 报纸 比 别 长 唱歌 出 川菜 次 从 错 打篮球 大家 到 得 等 弟弟 第一 懂 对 房间 非常 服务员 高 高兴 告诉 哥哥 给 公共汽车 公司 贵 过 还 孩子 好吃 黑 红 火车票 机场 鸡蛋 件 教室 姐姐 介绍 进 近 就 觉得 咖啡 开始 考试 可能 可以 课 快 快乐 累 离 两 路 旅游 卖 慢 忙 每 妹妹 门 男人 女人 旁边 跑步 便宜 票 妻子 起床 千 铅笔 晴 去年 让 日 上班 生病 生日 时间 事情 手表 手机 送 虽然 但是 它 踢足球 题 跳舞 外 完 玩 晚 为什么 问 问题 西瓜 希望 洗 小时 笑 新 姓 休息 雪 颜色 药 眼睛 羊肉 已经 一起 意思 因为 所以 阴 游泳 右边 鱼 远 运动 再 早 早上 丈夫 找 着 真 正在 只 知道 准备 走 最 左边',
3:'阿姨 啊 矮 爱好 安静 把 班 搬 半 办法 办公室 包 饱 北方 被 鼻子 比较 比赛 必须 变化 表示 表演 别人 宾馆 冰箱 才 菜单 参加 草层 差 超市 衬衫 成绩 城市 迟到 船 春 词语 聪明 打扫 打算 带 担心 蛋糕 当然 地 灯 地方 地铁 地图 电梯 电子邮件 东 冬 动物 短 段 锻炼 多么 饿 耳朵 发烧 发现 方便 放心 分 附近 复习 干净 感冒 感兴趣 刚才 个子 根据 跟 更 公园 故事 刮风 关 关系 关心 关于 国家 果汁 过去 还是 害怕 河 黑板 护照 花 花园 画画 坏 欢迎 环境 换 黄 会议 或者 机会 极 记得 季节 检查 简单 健康 见面 讲 角 脚 接 街道 结婚 结束 节目 节日 解决 借 经常 经过 经理 久 旧 句子 决定 可爱 渴 刻 客人 空调 口 蓝 老 离开 礼物 历史 脸 练习 辆 聊天 了解 邻居 留学 楼 绿 马上 满意 帽子 米 面包 明白 拿 南 难 难过 年级 年轻 鸟 努力 爬山 盘子 啤酒 葡萄 普通话 骑 其实 其他 奇怪 起飞 清楚 请假 秋 裙子 然后 热情 认为 认真 容易 如果 伞 上网 生气 声音 世界 试 司机 太阳 特别 疼 提高 体育 同事 同意 头发 突然 图书馆 腿 完成 碗 万 忘记 为 为了 位 文化 西 习惯 洗手间 洗澡 夏 先 相信 香蕉 向 像 小心 校长 新闻 新鲜 信用卡 行李箱 熊猫 需要 选择 要求 一般 一边 一定 音乐 银行 饮料 应该 影响 用 游戏 有名 又 遇到 元 愿意 月亮 越 站 张 照顾 照片 只 中间 终于 种 重要 周末 主要 注意 自己 自行车 总是 嘴 最后 最近 作业 作用',
4:'爱情 安排 安全 按时 按照 百分之 棒 包括 保护 保证 抱 抱歉 报名 倍 本来 笨 毕业 遍 标准 表格 表示 表扬 饼干 并且 博士 不但 不过 不得不 部分 擦 猜 材料 参观 餐厅 厕所 差不多 长城 长江 尝 场 超过 成功 成为 诚实 乘坐 吃惊 重新 抽烟 出差 出发 出生 出现 厨房 传 传统 窗户 粗心 存 从来 措施 答案 打扮 打扰 打印 打折 打针 大概 大使馆 大约 戴 当 当时 刀 导游 到处 到底 道歉 得意 登机牌 等等 低 底 地球 地址 掉 调查 丢 动作 堵车 肚子 短信 对话 对面 儿童 发生 发展 法律 翻译 烦恼 反对 方法 方面 放弃 放暑假 份 丰富 否则 符合 父亲 付款 负责 复印 复杂 富 附件 改变 干杯 感动 感觉 感情 感谢 干活儿 刚 高级 各 格式 工资 共同 购物 够 估计 鼓励 故意 挂 关键 观众 管理 光 广播 广告 逛 规定 国际 果然 过程 海洋 害羞 寒假 汗 航班 好处 好像 合格 合适 盒子 后悔 厚 互联网 互相 怀疑 回忆 活动 活泼 火 获得 积极 积累 即使 寄 继续 计划 记者 技术 既然 家具 假 价格 坚持 减肥 减少 建议 将来 奖金 降低 交 交流 交通 骄傲 饺子 教授 教育 接受 结果 节约 解释 尽管 紧张 进行 禁止 精彩 经济 经历 经验 警察 竟然 竞争 镜子 究竟 举办 拒绝 举行 距离 开玩笑 看法 考虑 科学 棵 咳嗽 可怜 可是 肯定 空气 恐怕 苦 矿泉水 困难 拉 垃圾 来不及 来得及 浪费 浪漫 老虎 冷静 理发 理解 理想 力气 厉害 例如 联系 俩 连 另外 留 流利 流行 旅行 律师 麻烦 马虎 满 毛巾 美丽 梦想 迷路 密码 免费 民族 目的 母亲 耐心 难道 难受 内 内容 能力 年龄 农村 弄 暖和 偶尔 排队 排列 判断 陪 批评 皮肤 脾气 篇 骗 乒乓球 平时 瓶 破 普遍 普通 其次 其中 气候 千万 签证 敲 桥 巧克力 亲戚 轻 轻松 情况 穷 取 区别 全部 缺点 缺少 却 确实 群 然而 热闹 任何 任务 扔 仍然 日记 入口 散步 森林 沙发 伤心 商量 稍微 社会 深 申请 甚至 生活 生命 生意 省 剩 使用 失败 失望 师傅 十分 实际 实在 使 适合 适应 世纪 收入 收拾 首都 首先 受不了 受到 售货员 输 熟悉 数字 速度 顺便 顺利 顺序 说明 硕士 死 速度 塑料袋 酸 随便 随着 孙子 所有 台 抬 态度 谈 弹钢琴 汤 躺 趟 讨论 讨厌 特点 提供 提醒 填 条件 停止 挺 通过 通知 同情 推 推迟 脱 袜子 完全 往 往往 网球 网站 危险 味道 温度 文章 污染 无 无聊 无论 误会 西红柿 吸引 咸 现金 羡慕 相反 相同 香 详细 响 消息 小说 笑话 效果 心情 信心 信息 信封 信任 兴奋 行 信用卡 幸福 性别 性格 修理 许多 学期 压力 牙膏 亚洲 严格 严重 研究 演出 演员 阳光 养成 样子 邀请 要是 钥匙 也许 叶子 页 一切 以 引起 印象 赢 应聘 永远 勇敢 优点 优秀 由于 邮局 尤其 有趣 友好 友谊 愉快 于是 与此同时 语法 语言 羽毛球 预习 原来 原谅 原因 约会 阅读 允许 杂志 咱们 暂时 脏 责任 增加 占线 招聘 照 照相机 真正 整理 正常 正好 正确 正式 证明 支持 知识 值得 直接 职业 植物 指 指出 只好 只要 质量 至少 重 重点 重视 周围 主意 祝贺 著名 专业 专门 转赚 准确 准时 仔细 自然 总结 租 嘴 最好 尊重 左右 作者 座',
5:'爱惜 爱心 安慰 安装 岸 暗 熬夜 把握 摆 傍晚 宝贝 保持 保存 保留 报到 报社 抱怨 背 景 背景 被子 本科 比例 必然 毕竟 避免 编辑 鞭炮 便 便条 便于 表面 病毒 玻璃 博物馆 不安 不必 不断 不见得 不耐烦 不然 不如 不足 布 步骤 部门 财产 采访 采取 彩虹 踩 参考 参与 惭愧 操场 操心 册 曾经 差距 产品 产生 常识 长途 彻底 沉默 趁 称 充分 充满 重复 抽屉 抽象 出口 出色 出示 出席 处理 传染 传播 创造 吹 此外 次要 刺激 匆忙 从此 从而 促进 促使 存在 错误 达到 打工 大方 大厦 贷款 单纯 单调 单独 单位 担任 耽误 胆小 淡 当地 当心 导演 倒霉 递 等待 等于 滴 敌人 的确 地道 地理 地区 地位 地震 点心 电池 电视剧 电视台 顶 动画片 冻 逗 独立 独特 度过 断 对待 对方 对手 对象 兑换 吨 蹲 多亏 多余 恶劣 发表 发愁 发达 发挥 发明 发票 发言 罚款 法院 翻 翻译 繁荣 反而 反复 范围 方 方言 方式 妨碍 仿佛 非 辩论 废话 费用 分别 分布 分配 分手 风格 风景 风俗 风险 疯狂 扶 服装 辅导 妇女 复制 改革 改善 改正 概括 概念 干脆 感激 感受 干燥 赶紧 赶快 高速公路 革命 个别 个人 公式 公布 公开 公平 公寓 功能 恭喜 贡献 沟通 构成 姑娘 古代 古典 股票 骨头 固定 挂号 乖 观察 观点 官 广场 广大 归纳 规则 规模 滚 锅 国庆节 果实 海关 海鲜 喊 行业 豪华 好奇 合法 合理 合同 合影 合作 何必 何况 和平 核心 恨 猴子 后背 后果 呼吸 忽然 忽视 壶 胡说 胡同 花生 华裔 滑 化学 话题 怀念 缓解 幻想 慌张 黄金 灰 恢复 汇率 婚礼 婚姻 活跃 伙伴 基本 基础 机器 肌肉 激烈 及格 集体 集中 急忙 纪录 记忆 计算 记录 纪律 寂寞 家务 嘉宾 甲 假如 坚决 艰巨 艰苦 剪刀 简历 健身 建立 建设 建筑 讲座 酱油 交换 交际 交往 叫 角度 教材 接触 接待 结构 结合 结论 结账 解放 解说 届 借口 戒烟 金属 尽快 尽量 紧急 谨慎 经典 经营 景色 敬爱 酒吧 救 巨大 具备 具体 据说 捐 绝对 决赛 决心 军事 卡车 开发 开放 开幕式 看不起 看望 靠 颗 可见 空闲 控制 口味 夸夸其谈 夸张 会计 宽 昆虫 扩大 辣 烂 朗读 劳动 老百姓 老板 老实 老鼠 了不起 类型 冷淡 梨 离婚 立即 立刻 利润 利益 利用 俩 粒 连续 联合 恋爱 良好 粮食 了不起 临时 灵活 领导 领域 浏览 龙 漏 录取 论文 逻辑 落后 旅游 码头 骂 麦克风 漫画 毛病 矛盾 冒险 贸易 眉毛 魅力 梦想 秘书 密切 秘密 面对 面积 面临 描写 明显 明星 命令 摸 摩托车 目标 目录 目前 哪怕 难怪 能干 能源 年代 念 宁可 牛仔裤 农业 浓 偶然 拍 摄 盼望 培训 培养 赔偿 配合 佩服 盆 碰 批 平 平等 平衡 平常 平方 平均 评价 凭 迫切 破产 期待 期间 期末 其余 启发 企图 企业 气氛 汽油 谦虚 前途 浅 强调 强烈 抢 悄悄 瞧 起初 起码 起码 起源 气质 签订 签字 前进 前面 欠 墙 桥梁 巧妙 亲爱 亲切 青春 青少年 轻视 轻易 清淡 情景 请求 取得 取消 娶 权力 劝 确认 确定 燃烧 绕 热爱 热烈 人生 人口 人才 人物 忍不住 日常 日程 日历 如今 弱 洒 嗓子 色彩 沙漠 晒 删除 闪电 善良 扇子 商品 商务 商业 上当 设备 设计 设施 射击 伸 身材 身份 深刻 神话 神秘 升 上升 生产 生动 生长 绳子 省略 胜利 失眠 失去 失业 诗 狮子 湿润 石头 时差 时代 时刻 实话 实用 食品 实现 实验 始终 市场 似的 事实 事物 事先 收获 手工 手续 手指 受伤 舒服 舒适 书架 输入 熟练 鼠标 属于 数量 数学 率 顺利 瞬间 说不定 思考 思想 私人 似乎 速度 宿舍 随手 损失 缩小 所谓 塔 台阶 太极拳 谈判 坦率 烫 逃 逃避 桃 讨价还价 套 特殊 特征 提倡 提纲 提交 体会 体贴 体现 天真 调整 挑战 通常 统一 痛苦 偷 偷偷 投资 透明 突出 土地 土豆 吐兔 推广 推荐 推辞 外交 弯 完美 完善 完整 玩具 万一 王子 网络 往返 危害 微笑 维持 维护 尾巴 委屈 未必 未来 位于 位置 胃 温暖 温柔 文件 文具 文明 文学 吻 稳定 问候 卧室 屋子 无奈 无数 武术 物理 物质 系统 细节 戏剧 瞎 下载 夏令营 鲜艳 显得 显然 显示 县 现代 现金 现实 现象 项 项链 项目 象棋 消费 消失 销售 小吃 小伙子 小麦 效率 歇 斜 写作 血 压缩 摇 摇头 咬 要不 要不然 夜 而已 一致 依然 移动 疑问 乙 艺术 议论 引用 隐藏 迎接 营养 营业 影子 应用 硬件 拥抱 拥挤 优惠 优势 悠久 邮件 油炸 犹豫 有利 有趣 幼儿园 娱乐 语气 预报 预订 玉米 员工 原料 原则 圆 晕 运气 运输 赞成 赞美 糟糕 造成 则 责备 摘 窄 展开 展览 占 账户 涨 掌握 招待 着火 争论 征求 整个 整体 正 证件 挣钱 支 直 直到 指导 制定 制度 制造 制止 制作 智慧 中介 中心 中旬 种类 重大 周到 猪 主持 主任 主题 主观 祝福 追求 资料 资源 自愿 综合 总裁 总共 组成 组合 组织 祖国 阻止 醉 尊敬 遵守 作品 作为',
6:'挨 爱戴 暧昧 安宁 安详 安置 按摩 案件 案例 昂贵 熬 摆脱 拜访 败坏 颁布 版本 伴侣 伴随 半途而废 办公 班主任 扮演 绑架 榜样 包庇 包袱 包围 包装 饱和 保管 保密 保姆 保守 保卫 保养 保障 保重 报仇 报酬 报答 报复 报告 报考 报销 报效 抱负 暴力 暴露 悲哀 悲惨 悲观 北极 辈子 奔波 本能 本钱 本人 本身 本事 本质 笔试 彼此 必定 必经 必要 闭塞 边疆 边界 边境 编织 扁 扁担 变故 变化多端 便利 便民 辩护 辩解 辨认 辫子 标本 标记 表决 表决 表态 表彰 憋 别墅 别致 濒临 冰雹 并非 并列 拨 拨打 波浪 波涛 剥削 博大精深 博览会 搏斗 不顾 不禁 不堪 不可思议 不愧 不料 不时 不惜 不相上下 不屑一顾 补偿 补救 补贴 捕捉 不安 不免 不如 步伐 步骤 部署 才干 财富 财务 裁判 裁缝 采集 采购 彩色 苍白 仓库 操劳 操纵 操作 草案 草率 策划 测量 层出不穷 曾经 差别 差异 柴油 搀 常年 常务 尝试 偿还 场合 场面 敞开 倡导 倡议 超越 朝气 嘲笑 撤退 沉淀 沉闷 陈旧 陈列 陈述 称号 称赞 承办 承包 承诺 承认 承受 成本 成交 成天 成效 成心 成员 呈现 诚恳 诚挚 乘务员 程序 惩罚 吃苦 耻辱 赤字 充当 充沛 充实 崇拜 崇高 崇敬 稠密 丑恶 出路 出卖 出身 出神 出息 初步 除夕 处分 处境 储备 触犯 传达 传授 喘气 串 创业 吹牛 春节 纯粹 慈善 辞职 此刻 此起彼伏 从容 凑合 窜 粗鲁 摧残 脆弱 存放 搭档 答辩 答复 达成 打包 打官司 打击 打架 打量 打猎 打仗 大不了 大臣 大胆 大伙儿 大街小巷 大力 大体 大意 带领 代价 代理 逮捕 怠慢 贷款 担保 担忧 胆怯 诞辰 淡季 蛋白质 当场 当初 当代 当面 当前 当事人 当务之急 党 档案 档次 倒闭 导航 导弹 岛屿 捣乱 稻谷 得不偿失 得力 得天独厚 得罪 灯笼 登陆 登载 等候 等级 瞪 瞪眼 低级 低碳 堤坝 抵达 抵抗 抵制 递增 地步 地势 地铁 地质 颠簸 颠倒 典礼 典型 奠定 电源 垫 叼 雕刻 调动 跌 值得 颠簸 颠倒 点缀 玷污 惦记 奠定 殿堂 调节 调解 调料 吊 锻炼 对策 对称 对付 对抗 对立 对联 队伍 顿时 多元化 额外 恶心 恶化 恩怨 而已 而且 发布 发誓 发行 发炎 发扬 发育 发源地 法定 法人 法规 法则 番 方位 防守 防御 纺织 访问 放大 放射 飞禽走兽 飞翔 飞跃 分辨 分寸 分红 分解 分裂 分量 分明 分歧 分散 分手 分外 分子 风度 风光 风气 风趣 风土人情 封闭 丰满 风味 奉献 否决 夫妇 服从 服气 俯视 辅助 腐败 腐烂 腐蚀 负担 覆盖 富裕 副 丰收 否定 循环 尽管 究竟 局部 具体 乃至 难免 确切 权衡 终身 逐步 诸位 卓有成效 资格 总而言之 总之'
};
const HSK_LEVEL=new Map();
Object.entries(HSK_WORDS).forEach(([lv,txt])=>txt.split(/\s+/).filter(Boolean).forEach(w=>{if(!HSK_LEVEL.has(w))HSK_LEVEL.set(w,+lv);}));
Object.entries({
  '围棋':6,'黑白':3,'两种':2,'棋子':6,'规定':4,'先行':5,'对弈':6,'双方':4,
  '十九':2,'十九条':6,'条线':4,'棋盘':6,'网格':6,'交叉点':6,'交叉':5,'交替':6,'放置':5,
  '黑色':2,'白色':2,'落子':6,'完毕':5,'悔棋':6,'过程':4,'围地':6,'吃子':6,'以所围':6,'大小':3,'决定':3,'胜负':5,
  '普通话':3,'汉语':1,'中文':1,'听错':4,'没听错':4,'遗憾':5,'做梦':3,'梦里':3,'怪物':5,'宠物':5,'一生':4
}).forEach(([w,lv])=>HSK_LEVEL.set(w,lv));
const SEG_WORDS=[...HSK_LEVEL.keys(),'中国人','普通话','汉语','中文','小朋友','没关系','看起来','听起来','说起来','越来越','一边','一边儿','因为','所以','但是','如果','虽然','然后','现在','已经','正在','觉得','知道','认识','喜欢','需要','应该','可以','可能','不能','不会','没有','不是','不要','不用','一起','一下','一点儿','有一点儿','一点','这个','那个','这些','那些','这里','那里','哪里','什么','为什么','怎么样','怎么办','的时候','的话','自己的','我的','你的','他的','她的','它的','我们的','你们的','他们的','对不起','没问题','谢谢','再见','早上好','晚上好','下午好','生日快乐','新年快乐','没听错','听错','遗憾','风中','奇怪','怪物','开心','宠物','做梦','梦里','一生','没有遗憾','围棋','黑白','两种','棋子','规定','先行','对弈','双方','十九条','条线','棋盘','网格','交叉点','交叉','交替','放置','黑色','白色','落子','完毕','悔棋','围地','吃子','以所围','大小','决定','胜负','父母','兄弟','姐妹','长辈','晚辈','孩子们','老人','年轻人','大人','小孩','孤儿','养父','养母','义父','义母','师父','师傅','师兄','师姐','师弟','师妹','弟子','门派','长老','掌门','宗门','宗主','弟子们','修炼','修为','功法','心法','内力','真气','灵力','灵气','武功','武学','武道','剑法','剑术','拳法','招式','绝招','秘籍','境界','突破','瓶颈','天赋','资质','悟性','根骨','丹田','经脉','穴位','走火入魔','闭关','历练','试炼','妖兽','魔兽','灵兽','神兽','法宝','灵药','丹药','炼丹','炼器','阵法','结界','传送阵','禁地','秘境','仙人','仙界','仙途','仙子','妖怪','魔王','魔族','人族','天才','废物','强者','高手','宗师','大师','青云门','风回峰','通天峰','五位长老','掌门人','现任','历代','愤怒','悲伤','高兴','兴奋','紧张','害怕','恐惧','惊讶','惊喜','失望','绝望','希望','喜悦','痛苦','尴尬','羞愧','愧疚','后悔','担忧','焦虑','平静','冷静','激动','感动','感激','嫉妒','怨恨','厌恶','站起来','坐下来','走过去','跑过去','看着','说着','笑着','哭着','想着','听着','转身','回头','抬头','低头','睁开','闭上','张开','伸手','握紧','放开','拿起','放下','打开','关上','推开','拉开','扔掉','捡起','出现','消失','离开','回来','进入','出去','上去','下来','起来','过来','过去','醒来','睡着','死去','活着','突然间','忽然','立刻','马上','瞬间','片刻','许久','良久','终于','最终','原来','其实','果然','难道','不由得','忍不住','情不自禁','不知不觉','渐渐地','慢慢地','静静地','默默地','悄悄地','轻轻地','眼神','目光','神情','表情','神色','脸色','身影','身形','身躯','身体','声音','话语','言语','话音','心情','心思','心里','心中','脑海','脑中','记忆','回忆','梦境','现实','世界','天下','江湖','世间','故事','事情','事件','情况','状况','局面','局势','形势','消息','传闻','谣言','秘密','真相','真实','一瞬间','一刹那','一转眼','一下子','一直以来','从此以后','从今以后','自从','直到','之后','之前','期间','与此同时','就在这时','就在此时','这时候','那时候','当时','此刻','如今','未来','曾经','一向','心想','暗想','冷笑','微笑','苦笑','大笑','怒吼','低语','喃喃','嘟囔','叹息','叹气','沉默','沉思','开口','闭嘴','插话','打断','继续','停顿','犹豫','迟疑','坚定','肯定','否定','拒绝','答应','同意'].sort((a,b)=>b.length-a.length);
let SEG_WORD_SET=new Set(SEG_WORDS);

/* ===== HSK Expanded DB loader (local db/) =====
   Complementa a base interna com palavras compostas e níveis 7–9.
   O objetivo é segmentar primeiro a palavra inteira; assim, um ideograma HSK 1
   dentro de uma palavra HSK 5 não força ocultação indevida de pinyin. */
const HSK_DB_STATE={loaded:false,loading:null,error:null,colors:{}};
let SEG_INDEX=new Map();
function rebuildSegIndex(){
  try{
    SEG_INDEX=new Map();
    for(const w of SEG_WORDS){
      if(!w||[...w].length<=1)continue;
      const k=[...w][0];
      if(!SEG_INDEX.has(k))SEG_INDEX.set(k,[]);
      SEG_INDEX.get(k).push(w);
    }
    for(const arr of SEG_INDEX.values())arr.sort((a,b)=>[...b].length-[...a].length||String(a).localeCompare(String(b),'zh-Hans-CN'));
  }catch(e){SEG_INDEX=new Map();}
}
rebuildSegIndex();
function hskDbApplyColors(colors){
  if(!colors||typeof colors!=='object')return;
  HSK_DB_STATE.colors=colors;
  try{
    const root=document.documentElement;
    for(const [lv,meta] of Object.entries(colors)){
      const color=meta&&((meta.text)||(meta.onLight)||(meta.color));
      if(color)root.style.setProperty(`--lv${lv}`,color);
      const dark=meta&&((meta.onDark)||(meta.text)||(meta.color));
      if(dark)root.style.setProperty(`--lv${lv}-dark`,dark);
    }
  }catch{}
}
function hskDbMerge(db){
  if(!db||typeof db!=='object')return false;
  hskDbApplyColors(db.colors||{});
  const words=db.words||db.levels||{};
  let added=0;
  for(const [lvRaw,list] of Object.entries(words)){
    const lv=Math.max(1,Math.min(9,parseInt(lvRaw,10)||99));
    const arr=Array.isArray(list)?list:(list&&Array.isArray(list.words)?list.words:[]);
    for(const raw of arr){
      const w=String(raw||'').trim();
      if(!w||!/[\u3400-\u9fff]/.test(w))continue;
      const old=HSK_LEVEL.get(w);
      if(!old||lv<old)HSK_LEVEL.set(w,lv);
      if(!SEG_WORD_SET.has(w)){SEG_WORD_SET.add(w);SEG_WORDS.push(w);added++;}
    }
  }
  if(added){
    SEG_WORDS.sort((a,b)=>[...b].length-[...a].length||String(a).localeCompare(String(b),'zh-Hans-CN'));
    SEG_WORD_SET=new Set(SEG_WORDS);
    rebuildSegIndex();
  }
  try{window.HSK_EXPANDED_DB_INFO={version:db.version||'',added,words:SEG_WORDS.length,levels:9};}catch{}
  return true;
}
async function loadHskExpandedDb(){
  if(HSK_DB_STATE.loaded)return true;
  if(HSK_DB_STATE.loading)return HSK_DB_STATE.loading;
  HSK_DB_STATE.loading=(async()=>{
    try{
      const r=await fetch('db/hsk-expanded.json',{cache:'force-cache'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const db=await r.json();
      hskDbMerge(db);
      HSK_DB_STATE.loaded=true;
      return true;
    }catch(e){
      HSK_DB_STATE.error=e&&e.message||String(e);
      try{console.warn('[HSK DB] fallback para base interna:',e);}catch{}
      return false;
    }
  })();
  return HSK_DB_STATE.loading;
}
hzScheduleIdle(()=>loadHskExpandedDb(),1800);


function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function isCJK(c){const n=c.codePointAt(0);return(n>=0x4E00&&n<=0x9FFF)||(n>=0x3400&&n<=0x4DBF)||(n>=0x20000&&n<=0x2A6DF)||(n>=0xF900&&n<=0xFAFF)||(n>=0x2E80&&n<=0x2EFF);}
function frame(){return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
function readFile(f,enc){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=()=>rej(r.error);if(enc)r.readAsText(f,enc);else r.readAsArrayBuffer(f);});}
function buf2b64(b){const u=new Uint8Array(b);let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.slice(i,i+8192));return btoa(s);}
function b642buf(b){const s=atob(b),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;}
function timeAgo(ts){if(!ts)return'Nunca lido';const m=Math.floor((Date.now()-ts)/60000);if(m<1)return'agora';if(m<60)return m+'m atrás';const h=Math.floor(m/60);if(h<24)return h+'h atrás';return Math.floor(h/24)+'d atrás';}
function lvlC(l){const n=+l.replace('HSK','');return n<=2?'l12':n<=4?'l34':'l56';}

function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,DBV);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STB))d.createObjectStore(STB,{keyPath:'id'});if(!d.objectStoreNames.contains(STW))d.createObjectStore(STW,{keyPath:'id'});};r.onsuccess=e=>{db=e.target.result;res();};r.onerror=()=>rej(r.error);});}
const dbtx=(st,m,fn)=>new Promise((res,rej)=>{const t=db.transaction(st,m),s=t.objectStore(st),r=fn(s);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
const dbAll=st=>dbtx(st,'readonly',s=>s.getAll());
const dbPut=(st,v)=>dbtx(st,'readwrite',s=>s.put(v));
const dbDel=(st,id)=>dbtx(st,'readwrite',s=>s.delete(id));
const dbClr=st=>dbtx(st,'readwrite',s=>s.clear());

function buildNav(el,active){el.innerHTML=TABS.map(t=>`<button class="ni${t===active?' on':''}" data-tab="${t}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${TSVG[t]}</svg>${TLBL[t]}</button>`).join('');}
function renderDiscover(){document.getElementById('dc').innerHTML=DISC.map(s=>`<div class="dcard" onclick="window.open('${s.url}','_blank')"><div class="dico" style="background:${s.c}">${s.ic}</div><div class="dinfo"><div class="dname">${esc(s.n)}</div><div class="ddesc">${esc(s.d)}</div><div class="dlevels">${s.lv.map(l=>`<span class="dlvl ${lvlC(l)}">${l}</span>`).join('')}</div></div></div>`).join('');}

function loadSettings(){try{fontSize=parseInt(localStorage.getItem('hfs')||'38');showPinyin=localStorage.getItem('hspy')!=='0';pinyinLevelMode=localStorage.getItem('hpl')==='1';pinyinMinLevel=parseInt(localStorage.getItem('hplv')||'2');}catch{}applyFontSize();applyPinyin();}
function saveSettings(){try{localStorage.setItem('hfs',fontSize);localStorage.setItem('hspy',showPinyin?'1':'0');localStorage.setItem('hpl',pinyinLevelMode?'1':'0');localStorage.setItem('hplv',pinyinMinLevel);}catch{};}
function applyFontSize(){document.documentElement.style.setProperty('--fs',fontSize+'px');['fs-val','sfs-val'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fontSize;});}
function syncSettingControls(){
  ['tog-py-btn','sty-py-btn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('on',showPinyin);});
  ['tog-lvl-py-btn','sty-lvl-btn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('on',pinyinLevelMode);});
  ['hsk-min','sty-hsk-min'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=String(pinyinMinLevel);});
}
function wordShouldShowPinyin(tok){if(!showPinyin)return false;if(!pinyinLevelMode)return true;const lv=tok&&tok.level?tok.level:99;return lv>pinyinMinLevel;}
function v37FixPinyinOverlap(){
  const root=document.getElementById('rtext');
  if(!root)return;
  const chars=Array.from(root.querySelectorAll('.hzch[data-py]'));
  if(!chars.length)return;
  const curFs=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||38;
  const pySizePx=curFs*.52;
  let measurer=document.getElementById('v37-py-measurer');
  if(!measurer){
    measurer=document.createElement('span');
    measurer.id='v37-py-measurer';
    measurer.style.cssText='position:absolute;visibility:hidden;top:-9999px;left:-9999px;white-space:nowrap;font-family:var(--pyf);font-weight:600;letter-spacing:.02px;';
    document.body.appendChild(measurer);
  }
  measurer.style.fontSize=pySizePx+'px';
  const MIN_SCALE=0.88;
  const CHUNK=500;
  const items=new Array(chars.length);
  let lineMinScale;
  let i=0;
  // Fase 1 (só escrita, em pedaços): reseta tudo antes de medir, sem travar a
  // rolagem — em textos longos (importados de site), fazer tudo de uma vez só
  // trava a tela por vários segundos; espalhando em pedaços por quadro, o
  // usuário já consegue rolar a tela enquanto o ajuste continua em segundo plano.
  function resetChunk(){
    const end=Math.min(i+CHUNK,chars.length);
    for(;i<end;i++){ chars[i].style.removeProperty('--pyscale'); }
    if(i<chars.length)requestAnimationFrame(resetChunk);
    else{ i=0; requestAnimationFrame(measureChunk); }
  }
  // Fase 2 (só leitura, em pedaços): mede o caractere e a sílaba dele juntos —
  // ambos são leituras, então não forçam recálculo de layout entre si.
  function measureChunk(){
    const end=Math.min(i+CHUNK,chars.length);
    for(;i<end;i++){
      const c=chars[i];
      const py=c.dataset.py;
      const natural=c.getBoundingClientRect().width;
      let needed=0;
      if(py){ measurer.textContent=py; needed=measurer.getBoundingClientRect().width; }
      items[i]={c,natural,needed};
    }
    if(i<chars.length)requestAnimationFrame(measureChunk);
    else{ i=0; requestAnimationFrame(writeChunk); }
  }
  // Fase 3 (leitura + escrita, em pedaços): agrupa por linha visual (mesmo
  // "top" na tela) e aplica a MESMA escala pra todos os caracteres da mesma
  // linha — a menor escala necessária entre eles. Isso evita a inconsistência
  // de "um pinyin grande do lado de um pequeno" na mesma linha, que fica com
  // aparência de erro mesmo não sendo — cada linha fica com um tamanho só,
  // consistente, calculado apenas o suficiente pra nada vazar.
  function writeChunk(){
    const end=Math.min(i+CHUNK,items.length);
    for(;i<end;i++){ const r=items[i].c.getBoundingClientRect(); items[i].top=Math.round(r.top); items[i].left=r.left; items[i].width=r.width; }
    if(i<items.length){requestAnimationFrame(writeChunk);return;}
    lineMinScale=new Map();
    for(const it of items){
      if(it.needed>it.natural&&it.natural>0){
        const s=Math.max(MIN_SCALE,it.natural/it.needed);
        const cur=lineMinScale.get(it.top);
        if(cur===undefined||s<cur)lineMinScale.set(it.top,s);
      }
    }
    for(const it of items){ it.scale=lineMinScale.get(it.top)??1; }
    // Passo extra: mesmo com o tamanho por linha já certo, a sílaba do FINAL
    // de uma palavra pode encostar na sílaba do COMEÇO da próxima (o próprio
    // limite entre palavras diferentes). Em vez de baixar o tamanho de todo
    // mundo por causa de só um encontro apertado, aperta só esse par
    // específico — o resto da linha continua no tamanho confortável.
    const BOUNDARY_MIN=0.62;
    for(let k=0;k<items.length-1;k++){
      const a=items[k],b=items[k+1];
      if(a.top!==b.top||!a.needed||!b.needed)continue;
      const aPyW=a.needed*a.scale,bPyW=b.needed*b.scale;
      const aCenter=a.left+a.width/2,bCenter=b.left+b.width/2;
      const overlap=(aCenter+aPyW/2)-(bCenter-bPyW/2);
      if(overlap>0.1){
        const reduceFrac=Math.min(0.75,(2*overlap)/(aPyW+bPyW));
        a.scale=Math.max(BOUNDARY_MIN,a.scale*(1-reduceFrac));
        b.scale=Math.max(BOUNDARY_MIN,b.scale*(1-reduceFrac));
      }
    }
    i=0;applyChunk();
  }
  function applyChunk(){
    const end=Math.min(i+CHUNK,items.length);
    for(;i<end;i++){
      const it=items[i];
      if(it.scale!==undefined&&it.scale!==1)it.c.style.setProperty('--pyscale',it.scale.toFixed(3));
    }
    if(i<items.length)requestAnimationFrame(applyChunk);
  }
  resetChunk();
}
function applyPinyin(){
  document.querySelectorAll('ruby rt').forEach(rt=>{rt.style.visibility=showPinyin?'':'hidden';rt.style.height=showPinyin?'auto':'0';rt.style.marginBottom=showPinyin?'6px':'0';});
  document.querySelectorAll('.wunit[data-tid]').forEach(el=>{const tok=readerTokens[parseInt(el.dataset.tid)];const sh=wordShouldShowPinyin(tok);el.classList.toggle('pyhide',!sh);el.classList.toggle('pytarget',showPinyin&&pinyinLevelMode&&sh);});
  syncSettingControls();
  requestAnimationFrame(()=>requestAnimationFrame(v37FixPinyinOverlap));
}

function getCharPY(ch){
  if(!window.pinyinFn)return{py:'',unc:false};
  try{
    const py=window.pinyinFn(ch,{toneType:'symbol'})||'';
    const multi=(window.pinyinFn(ch,{toneType:'symbol',multiple:true})||'').trim().split(/\s+/).filter(Boolean);
    return{py,unc:multi.length>1};
  }catch{return{py:'',unc:false};}
}
function getWordPY(word){
  try{word=v40ToSimplified(word);}catch{}
  if(!window.pinyinFn)return'';
  try{
    const arr=window.pinyinFn(word,{toneType:'symbol',type:'array'});
    if(Array.isArray(arr)&&arr.length)return arr.join(' ').replace(/\s+/g,' ').trim();
  }catch{}
  try{
    const txt=window.pinyinFn(word,{toneType:'symbol'})||'';
    if(txt)return String(txt).replace(/\s+/g,' ').trim();
  }catch{}
  try{return[...word].map(c=>isCJK(c)?(window.pinyinFn(c,{toneType:'symbol'})||''):c).join(' ').replace(/\s+/g,' ').trim();}catch{return'';}
}

const TONE_MARKS={
  'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],
  'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],
  'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['ü',1],'ǘ':['ü',2],'ǚ':['ü',3],'ǜ':['ü',4],
  'Ā':['A',1],'Á':['A',2],'Ǎ':['A',3],'À':['A',4],'Ē':['E',1],'É':['E',2],'Ě':['E',3],'È':['E',4],
  'Ī':['I',1],'Í':['I',2],'Ǐ':['I',3],'Ì':['I',4],'Ō':['O',1],'Ó':['O',2],'Ǒ':['O',3],'Ò':['O',4],
  'Ū':['U',1],'Ú':['U',2],'Ǔ':['U',3],'Ù':['U',4],'Ǖ':['Ü',1],'Ǘ':['Ü',2],'Ǚ':['Ü',3],'Ǜ':['Ü',4]
};
const TONE_VOWELS={
  a:['a','ā','á','ǎ','à'],e:['e','ē','é','ě','è'],i:['i','ī','í','ǐ','ì'],o:['o','ō','ó','ǒ','ò'],u:['u','ū','ú','ǔ','ù'],'ü':['ü','ǖ','ǘ','ǚ','ǜ'],
  A:['A','Ā','Á','Ǎ','À'],E:['E','Ē','É','Ě','È'],I:['I','Ī','Í','Ǐ','Ì'],O:['O','Ō','Ó','Ǒ','Ò'],U:['U','Ū','Ú','Ǔ','Ù'],'Ü':['Ü','Ǖ','Ǘ','Ǚ','Ǜ']
};
function parseToneSyllable(syl){
  let tone=5,base='';
  for(const ch of String(syl||'')){
    if(TONE_MARKS[ch]){base+=TONE_MARKS[ch][0];tone=TONE_MARKS[ch][1];}
    else if(/[1-5]/.test(ch)){tone=parseInt(ch);}
    else base+=ch;
  }
  return{base,tone};
}
function markTone(base,tone){
  base=String(base||'').replace(/u:/g,'ü').replace(/v/g,'ü');
  if(!tone||tone===5)return base;
  const chars=[...base];
  const lower=base.toLowerCase();
  let idx=-1;
  for(const v of['a','e']){const p=lower.indexOf(v);if(p>=0){idx=[...base.slice(0,p)].length;break;}}
  if(idx<0){const p=lower.indexOf('ou');if(p>=0)idx=[...base.slice(0,p)].length;}
  if(idx<0){for(let i=chars.length-1;i>=0;i--){if('aeiouüAEIOUÜ'.includes(chars[i])){idx=i;break;}}}
  if(idx<0)return base;
  const ch=chars[idx];const table=TONE_VOWELS[ch]||TONE_VOWELS[ch.toLowerCase()];
  if(!table)return base;
  chars[idx]=table[tone]||ch;
  return chars.join('');
}
function changeTone(syl,tone){const p=parseToneSyllable(syl);return markTone(p.base,tone);}
function applyToneSandhi(word,py){
  const chars=[...word].filter(isCJK);
  const original=(py||getWordPY(word)).split(/\s+/).filter(Boolean);
  const sylls=chars.map((_,i)=>original[i]||'');
  const tones=sylls.map(s=>parseToneSyllable(s).tone||5);
  const natural=sylls.slice();
  const changes=[];
  for(let i=0;i<chars.length;i++){
    const nextTone=tones[i+1]||5;
    if(chars[i]==='不'&&nextTone===4){natural[i]=changeTone(natural[i]||'bù',2);changes.push('不 antes de 4º tom: bù → bú');}
    if(chars[i]==='一'&&i<chars.length-1&&!(i>0&&chars[i-1]==='第')){
      if(nextTone===4){natural[i]=changeTone(natural[i]||'yī',2);changes.push('一 antes de 4º tom: yī → yí');}
      else if(nextTone>=1&&nextTone<=3){natural[i]=changeTone(natural[i]||'yī',4);changes.push('一 antes de 1º/2º/3º tom: yī → yì');}
    }
  }
  for(let i=0;i<chars.length-1;i++){
    const cur=parseToneSyllable(natural[i]).tone||tones[i];
    const next=parseToneSyllable(natural[i+1]).tone||tones[i+1];
    if(cur===3&&next===3){natural[i]=changeTone(natural[i],2);changes.push('Dois 3º tons seguidos: o primeiro vira 2º tom');}
  }
  const oldPy=sylls.join(' ').trim();
  const newPy=natural.join(' ').trim();
  return{oldPy,newPy,py:newPy||oldPy,changed:!!newPy&&newPy!==oldPy,changes:[...new Set(changes)]};
}
function getWordLevel(word){
  if(HSK_LEVEL.has(word))return HSK_LEVEL.get(word);
  return 99;
}
function bestDictAt(run,i){
  const first=[...String(run||'').slice(i)][0]||run[i]||'';
  const list=SEG_INDEX&&SEG_INDEX.get(first);
  if(list&&list.length){for(const w of list){if(run.startsWith(w,i))return w;}}
  // Fallback em caso de índice ainda não pronto.
  for(const w of SEG_WORDS){if(w.length>1&&run.startsWith(w,i))return w;}
  return'';
}
function segByPinyinPro(run){
  if(!window.pinyinSeg)return null;
  const formats=[];
  if(window.pinyinOutputFormat&&window.pinyinOutputFormat.ZhSegment)formats.push({format:window.pinyinOutputFormat.ZhSegment});
  formats.push(undefined,{});
  for(const opt of formats){
    try{
      const raw=opt===undefined?window.pinyinSeg(run):window.pinyinSeg(run,opt);
      const out=[];
      if(Array.isArray(raw)){
        for(const seg of raw){
          if(typeof seg==='string')out.push(seg);
          else if(Array.isArray(seg))out.push(seg.map(x=>typeof x==='string'?x:(x.origin||x.word||x.segment||x.target||'')).join(''));
          else if(seg&&typeof seg==='object')out.push(String(seg.origin||seg.word||seg.segment||seg.target||''));
        }
      }else if(raw&&typeof raw==='object'&&raw.origin){out.push(...String(raw.origin).split(/\s+/));}
      const clean=out.map(x=>String(x||'')).filter(x=>x&&[...x].some(isCJK));
      if(clean.length&&clean.join('')===run)return clean;
    }catch{}
  }
  return null;
}
function segByIntl(run){
  try{
    if(typeof Intl==='undefined'||!Intl.Segmenter)return null;
    const sg=new Intl.Segmenter('zh',{granularity:'word'});
    const out=[...sg.segment(run)].map(x=>x.segment).filter(Boolean);
    if(out.length&&out.join('')===run)return out;
  }catch{}
  return null;
}
function overlayDictSegments(run,base){
  const startMap=new Map();let pos=0;
  for(const w of base||[]){startMap.set(pos,w);pos += [...w].length;}
  const out=[];let i=0;
  while(i<run.length){
    const hit=bestDictAt(run,i);
    const b=startMap.get(i);
    if(hit&&(!b||[...hit].length>[...b].length)){out.push(hit);i += [...hit].length;continue;}
    if(b){out.push(b);i += [...b].length;continue;}
    if(hit){out.push(hit);i += [...hit].length;continue;}
    out.push(run[i]);i++;
  }
  return out;
}
function segmentChineseRun(run){
  if(!run)return[];
  try{run=v40ToSimplified(run);}catch{}
  const base=segByPinyinPro(run)||segByIntl(run)||[];
  return overlayDictSegments(run,base);
}
function tokenSpace(n,ci){return`<span class="sp" data-ci="${ci}" data-cilen="${n}" style="white-space:pre">${' '.repeat(n)}</span>`;}
function tokenPunct(ch,ci){
  let cls='punc';
  if(/[0-9]/.test(ch))cls='num';
  else if(/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(ch))cls='ascii';
  return`<span class="pt ${cls}" data-ci="${ci}" data-cilen="1"><span class="ptc ${cls}">${esc(ch)}</span></span>`;
}
function computeWordPyString(word,py){
  const chars=[...word];
  const pys=(py||getWordPY(word)).split(/\s+/).filter(Boolean);
  let anyUnc=false;
  const parts=chars.map((ch,i)=>{
    let p=pys[i]||'';
    if(isCJK(ch)){
      const g=getCharPY(ch);if(!p)p=g.py;if(g.unc)anyUnc=true;
    }
    return p;
  });
  return {text:parts.join(' '),unc:anyUnc,parts};
}
function buildHanziCells(word,parts){return[...word].map((ch,i)=>{const py=parts&&parts[i]?` data-py="${esc(parts[i])}"`:'';return`<span class="hzch"${py}>${esc(ch)}</span>`;}).join('');}
function levelClass(level){return level>=1&&level<=9?'lv'+level:'lvx';}
function pushWordToken(word,ci){
  const py=getWordPY(word);
  const tone=applyToneSandhi(word,py);
  const level=getWordLevel(word);
  const tid=readerTokens.length;
  const token={char:[...word].find(isCJK)||word[0]||'',word,py:tone.py||py,originalPy:tone.oldPy||py,naturalPy:tone.py||py,toneInfo:tone,idx:ci,charStart:readerCharRefs.length,level};
  readerTokens.push(token);
  [...word].forEach(ch=>{if(isCJK(ch))readerCharRefs.push({ch,tid});});
  const hidden=wordShouldShowPinyin(token)?'':' pyhide';
  const target=showPinyin&&pinyinLevelMode&&wordShouldShowPinyin(token)?' pytarget':'';
  const lvcls=levelClass(level);
  const pyInfo=computeWordPyString(word,token.naturalPy||token.py);
  const uncls=pyInfo.unc?' pyu':'';
  return`<span class="wunit ${lvcls}${hidden}${target}${uncls}" data-tid="${tid}" data-lv="${level>=1&&level<=9?level:'x'}" data-ci="${ci}" data-cilen="${[...word].length}" onclick="onTap(this)"><span class="hzrow">${buildHanziCells(word,pyInfo.parts)}</span></span>`;
}
async function waitPinyin(){
  if(typeof loadTradSimpDb==='function'){
    try{await Promise.race([loadTradSimpDb(),delay(900)]);}catch{}
  }
  if(typeof loadHskExpandedDb==='function'){
    try{await Promise.race([loadHskExpandedDb(),delay(1600)]);}catch{}
  }
  if(window.pinyinFn)return;
  // A biblioteca externa melhora a segmentação, mas não pode bloquear o leitor.
  // Intl.Segmenter + os bancos locais continuam sendo o fallback imediato.
  try{await Promise.race([ensurePinyinLib(),delay(850)]);}catch{}
}
function buildHTML(text){
  text=v40NormalizeText(String(text||''));
  window.__rtextRaw=text;
  readerTokens=[];readerCharRefs=[];
  const paragraphs=text.split('\n');
  let ci=0;
  const paraHtml=[];
  // Só marca espaço grande quando existia uma linha em branco DE VERDADE no
  // texto original (quebra de estrofe/parágrafo) — uma quebra de linha comum
  // dentro da mesma estrofe fica com o espaçamento mínimo, só o suficiente
  // pra não confundir a qual linha o pinyin pertence.
  let pendingGap=false;
  for(let p=0;p<paragraphs.length;p++){
    const para=paragraphs[p];
    if(!para.trim()){
      pendingGap=true;
      ci+=[...para].length;
      if(p<paragraphs.length-1)ci++;
      continue;
    }
    const paraStart=ci;
    let html='',run='';
    const flush=()=>{
      if(!run)return;
      const words=segmentChineseRun(run);
      for(const w of words){html+=pushWordToken(w,ci);ci+=[...w].length;}
      run='';
    };
    const chars=[...para];
    for(let i=0;i<chars.length;i++){
      const ch=chars[i];
      if(isCJK(ch)){run+=ch;continue;}
      flush();
      if(ch==='\r')continue;
      if(/\s/.test(ch)){
        const spStart=ci;
        let n=1;while(i+1<chars.length&&/\s/.test(chars[i+1])&&chars[i+1]!=="\r"){n++;i++;ci++;}
        html+=tokenSpace(n,spStart);ci++;continue;
      }
      html+=tokenPunct(ch,ci);ci++;
    }
    flush();
    if(html)paraHtml.push(`<p class="rpara${pendingGap?' rpara-gap':''}" data-ci="${paraStart}" data-cilen="${ci-paraStart}">${html}</p>`);
    pendingGap=false;
    if(p<paragraphs.length-1)ci++; // conta o '\n' separador para manter os índices do texto bruto corretos
  }
  return paraHtml.join('');
}
function buildFromSegs(segs,chars){return buildHTML((segs||[]).map(s=>s.origin||s.word||s.segment||'').join('')||chars.join(''));}
function buildFromChars(chars){return buildHTML(chars.join(''));}

async function lookupWikt(word){
  const r=await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,{signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw new Error(r.status);
  const d=await r.json();
  const sec=d['zh']||d['cmn']||d['yue']||null;
  if(!sec||!sec.length)throw new Error('nf');
  const res=sec.map(s=>({pos:s.partOfSpeech||'',defs:(s.definitions||[]).map(d=>({text:(d.definition||'').replace(/<[^>]*>/g,'').trim(),ex:(d.examples||[]).map(e=>(e.example||e.text||'').replace(/<[^>]*>/g,'').trim()).filter(Boolean).slice(0,1)})).filter(d=>d.text)})).filter(s=>s.defs.length);
  if(!res.length)throw new Error('nf');
  return{defs:res,src:'Wiktionary'};
}

async function lookupGT(word){
  for(const tl of['pt','en']){
    try{
      const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${tl}&dt=t&q=${encodeURIComponent(word)}`,{signal:AbortSignal.timeout(5000)});
      if(!r.ok)continue;
      const d=await r.json();
      const tr=d?.[0]?.[0]?.[0];
      if(tr&&tr!==word)return{defs:[{pos:tl==='pt'?'tradução':'translation',defs:[{text:tr,ex:[]}]}],src:'Google Translate'};
    }catch{}
  }
  return null;
}

async function lookupMM(word){
  try{
    const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=zh-CN|pt-BR`,{signal:AbortSignal.timeout(5000)});
    if(!r.ok)return null;
    const d=await r.json();
    const tr=d?.responseData?.translatedText;
    if(tr&&tr!==word&&d?.responseStatus===200)return{defs:[{pos:'tradução',defs:[{text:tr,ex:[]}]}],src:'MyMemory'};
  }catch{}
  return null;
}

function v41NumToDiacritic(syl){
  const m=String(syl||'').trim().match(/^([a-zA-Z:]+)([0-5]?)$/);
  if(!m)return syl;
  let base=m[1].replace(/u:/gi,'ü').replace(/v/gi,'ü');
  const tone=m[2]?parseInt(m[2],10):0;
  if(!tone||tone<1||tone>4)return base;
  let idx=-1,vowel=null;
  const lower=base.toLowerCase();
  if(lower.includes('a')){idx=lower.indexOf('a');vowel=base[idx];}
  else if(lower.includes('e')){idx=lower.indexOf('e');vowel=base[idx];}
  else if(lower.includes('ou')){idx=lower.indexOf('o');vowel=base[idx];}
  else{for(let i=base.length-1;i>=0;i--){if('aeiouüAEIOUÜ'.includes(base[i])){idx=i;vowel=base[i];break;}}}
  if(idx<0)return base;
  const table=TONE_VOWELS[vowel];
  if(!table)return base;
  return base.slice(0,idx)+table[tone]+base.slice(idx+1);
}
function v41PyHintToDiacritic(pyStr){
  return String(pyStr||'').split(/\s+/).filter(Boolean).map(v41NumToDiacritic).join(' ');
}
async function lookupCEDICT(word){
  try{
    const exactUrl=`https://cdn.jsdelivr.net/gh/krmanik/cedict-json@master/v2/${encodeURIComponent(word)}.json`;
    const r=await fetch(exactUrl,{signal:AbortSignal.timeout(6000)});
    if(r.ok){
      const d=await r.json();
      if(d&&d.simplified){
        const pinyinList=Array.isArray(d.pinyin)?d.pinyin.join(' / '):(d.pinyin||'');
        const defsObj=d.definitions||{};
        const rows=Object.entries(defsObj).map(([py,def])=>({text:String(def).replace(/;\s*$/,''),ex:[],pyHint:v41PyHintToDiacritic(py)}));
        if(rows.length)return{defs:[{pos:'',defs:rows}],src:'CC-CEDICT',pinyin:pinyinList,traditional:d.traditional&&d.traditional!==d.simplified?d.traditional:''};
      }
    }
  }catch{}
  // Fallback: termo completo não encontrado — tenta caractere por caractere,
  // igual ao auxiliar (cada caractere pode ter sua própria entrada no CC-CEDICT).
  try{
    const chars=[...new Set([...word].filter(isCJK))].slice(0,8);
    const found=[];
    for(const ch of chars){
      try{
        const r=await fetch(`https://cdn.jsdelivr.net/gh/krmanik/cedict-json@master/v2/${encodeURIComponent(ch)}.json`,{signal:AbortSignal.timeout(5000)});
        if(r.ok){const d=await r.json();if(d&&d.simplified)found.push(d);}
      }catch{}
    }
    if(found.length){
      const sections=found.map(entry=>{
        const rows=Object.entries(entry.definitions||{}).map(([py,def])=>({text:String(def).replace(/;\s*$/,''),ex:[],pyHint:py}));
        return{pos:entry.simplified,defs:rows};
      }).filter(s=>s.defs.length);
      if(sections.length)return{defs:sections,src:'CC-CEDICT (por caractere)'};
    }
  }catch{}
  return null;
}
async function lookupSogouSuggestions(word){
  try{
    const proxy='https://proxy.cors.sh/';
    const endpoint='https://fanyi.sogou.com/reventondc/suggV3';
    const body=new URLSearchParams({from:'auto',to:'en',client:'wap',text:word,uuid:'null',pid:'sogou-dict-vr',addSugg:'on'}).toString();
    const r=await fetch(proxy+endpoint,{method:'POST',headers:{'accept':'application/json','content-type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(6000)});
    if(!r.ok)return[];
    const d=await r.json();
    const sugg=Array.isArray(d?.sugg)?d.sugg:[];
    return sugg.map(x=>({word:x.k||'',hint:x.v||''})).filter(x=>x.word).slice(0,8);
  }catch{return[];}
}
// Animação de ordem de traços (StrokeOrder.com) — só faz sentido pra um único
// ideograma (o site é organizado por caractere, não por palavra composta).
// Reaproveita o mesmo proxy CORS já usado pra Sogou.
async function lookupStrokeOrder(char){
  const chars=[...String(char||'')].filter(isCJK);
  if(chars.length!==1)return null;
  const ch=chars[0];
  const url=`https://www.strokeorder.com/chinese/${encodeURIComponent(ch)}`;
  const proxy='https://proxy.cors.sh/';
  let html=null;
  try{
    const r=await fetch(proxy+url,{signal:AbortSignal.timeout(8000)});
    if(r.ok)html=await r.text();
  }catch{}
  if(!html)return null;
  const gifMatch=html.match(/\/assets\/bishun\/animation\/(\d+)\.gif/);
  if(!gifMatch)return null;
  const guideMatch=html.match(/\/assets\/bishun\/guide\/(\d+)\.png/);
  const strokeMatch=html.match(/\/assets\/bishun\/stroke\/(\d+)\.png/);
  const strokesCountMatch=html.match(/>(\d+)\s*strokes?</i)||html.match(/"description":"[^"]*?(\d+)\s*strokes/i);
  return{
    gif:`https://www.strokeorder.com${gifMatch[0]}`,
    guide:guideMatch?`https://www.strokeorder.com${guideMatch[0]}`:null,
    strokeDiagram:strokeMatch?`https://www.strokeorder.com${strokeMatch[0]}`:null,
    strokeCount:strokesCountMatch?strokesCountMatch[1]:null
  };
}
// Busca uma imagem através do proxy e devolve como blob local — evita que o
// canvas fique "contaminado" (tainted) por causa de CORS, já que uma blob: URL
// é sempre tratada como mesma origem para fins de leitura de pixels.
async function v41FetchImageObjectUrl(url){
  try{
    const r=await fetch('https://proxy.cors.sh/'+url,{signal:AbortSignal.timeout(10000)});
    if(!r.ok)return null;
    const blob=await r.blob();
    return URL.createObjectURL(blob);
  }catch{return null;}
}
// Corta a imagem única de "passo a passo" em cards individuais. O layout é
// sempre 5 colunas; a altura de cada célula é a altura total dividida pela
// quantidade de linhas necessárias pra caber (traços + 1 célula de marca
// d'água no final, que é descartada). Calibrado e conferido com 4 imagens
// reais do próprio site (13, 10, 23 e 36 traços) — todas bateram exatamente.
function v41EnhanceImageData(ctx,w,h){
  const imgData=ctx.getImageData(0,0,w,h);
  const d=imgData.data;
  const contrast=1.18,saturation=1.3;
  for(let i=0;i<d.length;i+=4){
    let r=d[i],g=d[i+1],b=d[i+2];
    r=(r-128)*contrast+128;g=(g-128)*contrast+128;b=(b-128)*contrast+128;
    const gray=0.299*r+0.587*g+0.114*b;
    r=gray+(r-gray)*saturation;g=gray+(g-gray)*saturation;b=gray+(b-gray)*saturation;
    d[i]=r<0?0:r>255?255:r;d[i+1]=g<0?0:g>255?255:g;d[i+2]=b<0?0:b>255?255:b;
  }
  ctx.putImageData(imgData,0,0);
}
async function v41SliceStrokeGuide(imgUrl,strokeCount){
  if(!imgUrl||!strokeCount)return[];
  const objUrl=await v41FetchImageObjectUrl(imgUrl);
  if(!objUrl)return[];
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        const cols=5;
        const totalCells=strokeCount+1;
        const rows=Math.ceil(totalCells/cols);
        const cellW=img.naturalWidth/cols;
        const cellH=img.naturalHeight/rows;
        const slices=[];
        for(let i=0;i<strokeCount;i++){
          const row=Math.floor(i/cols);
          const col=i%cols;
          const canvas=document.createElement('canvas');
          canvas.width=cellW;canvas.height=cellH;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,col*cellW,row*cellH,cellW,cellH,0,0,cellW,cellH);
          try{v41EnhanceImageData(ctx,cellW,cellH);}catch{}
          slices.push(canvas.toDataURL('image/png'));
        }
        URL.revokeObjectURL(objUrl);
        resolve(slices);
      }catch{URL.revokeObjectURL(objUrl);resolve([]);}
    };
    img.onerror=()=>{URL.revokeObjectURL(objUrl);resolve([]);};
    img.src=objUrl;
  });
}
let v41ModalImages=[],v41ModalIdx=0;
function v41RenderStepModal(){
  const img=document.getElementById('v41-modal-img');
  const label=document.getElementById('v41-modal-label');
  if(!img||!v41ModalImages.length)return;
  img.src=v41ModalImages[v41ModalIdx];
  if(label)label.textContent=`Passo ${v41ModalIdx+1} de ${v41ModalImages.length}`;
}
function v41OpenStepModal(images,startIndex){
  v41ModalImages=images;v41ModalIdx=startIndex;
  let modal=document.getElementById('v41-step-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='v41-step-modal';
    modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px';
    modal.innerHTML=`
      <button id="v41-modal-close" style="position:absolute;top:16px;right:16px;width:38px;height:38px;border-radius:50%;border:1px solid #444;background:#181818;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
      <div style="display:flex;align-items:center;gap:14px;max-width:100%">
        <button id="v41-modal-prev" style="flex-shrink:0;width:42px;height:42px;border-radius:50%;border:1px solid #444;background:#181818;color:#fff;font-size:20px;cursor:pointer">‹</button>
        <img id="v41-modal-img" style="max-width:min(78vw,420px);max-height:60vh;border-radius:12px;background:#fff">
        <button id="v41-modal-next" style="flex-shrink:0;width:42px;height:42px;border-radius:50%;border:1px solid #444;background:#181818;color:#fff;font-size:20px;cursor:pointer">›</button>
      </div>
      <div id="v41-modal-label" style="color:#ccc;font-size:13px;font-weight:700"></div>`;
    document.body.appendChild(modal);
    document.getElementById('v41-modal-close').onclick=()=>modal.remove();
    modal.onclick=(e)=>{if(e.target===modal)modal.remove();};
    document.getElementById('v41-modal-prev').onclick=()=>{v41ModalIdx=(v41ModalIdx-1+v41ModalImages.length)%v41ModalImages.length;v41RenderStepModal();};
    document.getElementById('v41-modal-next').onclick=()=>{v41ModalIdx=(v41ModalIdx+1)%v41ModalImages.length;v41RenderStepModal();};
  }
  v41RenderStepModal();
}
function v41DrawPracticeGrid(ctx,size){
  ctx.clearRect(0,0,size,size);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#e3a0ae';ctx.lineWidth=1;ctx.setLineDash([5,4]);
  ctx.beginPath();
  ctx.moveTo(size/2,2);ctx.lineTo(size/2,size-2);
  ctx.moveTo(2,size/2);ctx.lineTo(size-2,size/2);
  ctx.moveTo(2,2);ctx.lineTo(size-2,size-2);
  ctx.moveTo(size-2,2);ctx.lineTo(2,size-2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle='#c9a25f';ctx.lineWidth=2;
  ctx.strokeRect(1,1,size-2,size-2);
}
function v41ToggleTraceSection(){
  const section=document.getElementById('v41-trace-section');
  if(!section)return;
  const isOpen=section.dataset.open==='1';
  if(isOpen){section.dataset.open='0';section.style.display='none';section.innerHTML='';return;}
  section.dataset.open='1';section.style.display='flex';
  const size=Math.min(300,Math.floor(window.innerWidth*0.7));
  section.innerHTML=`<canvas id="v41-trace-canvas" width="${size}" height="${size}" style="border-radius:12px;touch-action:none;display:block"></canvas>
    <div style="display:flex;gap:10px;margin-top:10px">
      <button id="v41-trace-undo" class="v41-trace-btn">Voltar</button>
      <button id="v41-trace-clear" class="v41-trace-btn">Apagar</button>
    </div>`;
  const canvas=document.getElementById('v41-trace-canvas');
  const ctx=canvas.getContext('2d');
  v41DrawPracticeGrid(ctx,size);
  let paths=[],currentPath=null,drawing=false;
  const activePointers=new Set();
  function redraw(){
    v41DrawPracticeGrid(ctx,size);
    ctx.strokeStyle='#1c1c1c';ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';
    paths.forEach(path=>{
      if(path.length<2)return;
      ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);
      for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);
      ctx.stroke();
    });
  }
  function getPos(e){
    const rect=canvas.getBoundingClientRect();
    return{x:(e.clientX-rect.left)*(size/rect.width),y:(e.clientY-rect.top)*(size/rect.height)};
  }
  canvas.addEventListener('pointerdown',e=>{
    activePointers.add(e.pointerId);
    if(activePointers.size>=2){paths=[];redraw();drawing=false;return;}
    drawing=true;currentPath=[getPos(e)];paths.push(currentPath);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drawing||activePointers.size>=2)return;
    currentPath.push(getPos(e));redraw();
  });
  const endStroke=e=>{activePointers.delete(e.pointerId);drawing=false;};
  canvas.addEventListener('pointerup',endStroke);
  canvas.addEventListener('pointercancel',endStroke);
  canvas.addEventListener('pointerleave',endStroke);
  document.getElementById('v41-trace-undo').onclick=()=>{paths.pop();redraw();};
  document.getElementById('v41-trace-clear').onclick=()=>{paths=[];redraw();};
}
function v41OpenGifModal(gifUrl,char){
  let modal=document.getElementById('v41-gif-modal');
  if(modal)modal.remove();
  modal=document.createElement('div');
  modal.id='v41-gif-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.9);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;padding:20px;overflow-y:auto';
  modal.innerHTML=`<button id="v41-gif-modal-close" style="position:absolute;top:16px;right:16px;width:38px;height:38px;border-radius:50%;border:1px solid #444;background:#181818;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1">✕</button>
    <div style="position:relative;margin-top:36px;max-width:min(66vw,300px)">
      <img src="${esc(gifUrl)}" class="v41-enhance-img" style="display:block;width:100%;border-radius:14px;background:#fff">
      <button id="v41-gif-pencil-btn" title="Treinar traços" style="position:absolute;bottom:8px;right:8px;padding:6px 10px;border-radius:10px;border:1px solid rgba(var(--ac-rgb),.5);background:#1c1c1c;color:var(--ac);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.5)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      </button>
    </div>
    <div id="v41-trace-section" data-open="0" style="display:none;flex-direction:column;align-items:center"></div>`;
  document.body.appendChild(modal);
  document.getElementById('v41-gif-modal-close').onclick=()=>modal.remove();
  modal.onclick=e=>{if(e.target===modal)modal.remove();};
  document.getElementById('v41-gif-pencil-btn').onclick=()=>v41ToggleTraceSection();
}
// Conversão Tradicional -> Simplificado. O Tatoeba mistura frases em escrita
// tradicional e simplificada sob o mesmo idioma "cmn" — como o leitor não
// exibe tradicional corretamente, convertemos antes de mostrar ou de mandar
// pra voz, garantindo que o texto na tela e o áudio fiquem sempre coerentes.
const V40_TRAD_TO_SIMP={
  '龜':'龟','蓋子':'盖子','嗆':'呛','嘗':'尝','嚇':'吓','囑':'嘱','嬌':'娇','孫':'孙','將來':'将来',
  '尷':'尴','尬':'尬','屆':'届','層次':'层次','嶄':'崭','幣':'币','幾乎':'几乎','廟':'庙','廢':'废',
  '弊':'弊','彌':'弥','徵':'征','恆':'恒','愴':'怆','愷':'恺','憂':'忧','憊':'惫','懇':'恳','懶':'懒',
  '戀':'恋','戲劇':'戏剧','戶':'户','拋':'抛','拚':'拼','拳':'拳','挾':'挟','捨':'舍','捲':'卷',
  '掛':'挂','據':'据','擋':'挡','擠':'挤','擬':'拟','攏':'拢','敘':'叙','斕':'斓','斬':'斩','斯':'斯',
  '曬':'晒','曆':'历','會計':'会计','朧':'胧','杰':'杰','極':'极','構':'构','樑':'梁','樺':'桦',
  '橫':'横','檢':'检','歐':'欧','歸':'归','殘':'残','殼':'壳','毀':'毁','氈':'毡','氫':'氢','氧':'氧',
  '污':'污','決定':'决定','沒':'没','沖擊':'冲击','沿':'沿','洩':'泄','活動':'活动','浹':'浃','淚':'泪',
  '淺':'浅','渙':'涣','渦':'涡','測驗':'测验','溝':'沟','滅':'灭','滬':'沪','滯':'滞','滲':'渗',
  '滷':'卤','漲':'涨','潑':'泼','潤':'润','澀':'涩','濁':'浊','濘':'泞','瀉':'泻','瀋':'沈','灘':'滩',
  '災':'灾','炮':'炮','為何':'为何','為此':'为此','烏':'乌','烴':'烃','煉':'炼','煒':'炜','燁':'烨',
  '燦':'灿','爍':'烁','爐':'炉','爺':'爷','牘':'牍','狹':'狭','狽':'狈','猙':'狰','猥':'猥','獅':'狮',
  '獎':'奖','率':'率','瑯':'琅','璽':'玺','瓔':'璎','瓚':'瓒','甌':'瓯','畢':'毕','畫':'画','痙':'痉',
  '痛':'痛','瘋':'疯','瘓':'痪','瘧':'疟','癟':'瘪','癱':'瘫','皚':'皑','皺':'皱','盞':'盏','盡量':'尽量',
  '眥':'眦','瞞':'瞒','矯正':'矫正','礙':'碍','禍':'祸','禱':'祷','秈':'籼','稈':'秆','稻':'稻','穀':'谷',
  '穌':'稣','穎':'颖','窩':'窝','窪':'洼','竄':'窜','競賽':'竞赛','筆':'笔','筍':'笋','筧':'笕','箋':'笺',
  '箏':'筝','篤':'笃','簀':'箦','簞':'箪','簣':'篑','簫':'箫','籟':'籁','粵語':'粤语','糝':'糁','糞':'粪',
  '糾':'纠','紆':'纡','紇':'纥','紈':'纨','紋理':'纹理','紓':'纾','紺':'绀','絀':'绌','絆':'绊','絞':'绞',
  '統一':'统一','綺':'绮','綻':'绽','綽':'绰','綾':'绫','緄':'绲','緘':'缄','緙':'缂','緲':'缈','緹':'缇',
  '緻':'致','縈':'萦','縉':'缙','縝':'缜','縛':'缚','縞':'缟','縣長':'县长','縭':'缡','縴':'纤','縵':'缦',
  '縷':'缕','縹':'缥','總結':'总结','繆':'缪','繒':'缯','繕':'缮','繚':'缭','繹':'绎','繽':'缤','繾':'缱',
  '纈':'缬','纘':'缵','罎':'坛','羨':'羡','翬':'翚','翽':'翙','耬':'耧','聳':'耸','聶':'聂','聾':'聋',
  '肯':'肯','脛':'胫','腎':'肾','腫':'肿','膽':'胆','膾':'脍','臉色':'脸色','臍':'脐','臘':'腊','臚':'胪',
  '與否':'与否','舖':'铺','艤':'舣','艦艇':'舰艇','蒼':'苍','蓯':'苁','蔦':'茑','蔭':'荫','蕁':'荨',
  '蕆':'蒇','蕎':'荞','蕕':'莸','蕩':'荡','薈':'荟','薊':'蓟','薟':'莶','薩':'萨','藪':'薮','藹':'蔼',
  '蘀':'萚','蘄':'蕲','蘆':'芦','蘊':'蕴','蘚':'藓','虜':'虏','虧':'亏','蟄':'蛰','蟎':'螨','蟯':'蛲',
  '蠅':'蝇','蠆':'虿','蠐':'蛴','蠑':'蝾','衊':'蔑','術數':'术数','衚':'胡','袞':'衮','裊':'袅','裡':'里',
  '裏':'里','褌':'裈','褘':'袆','褲':'裤','襖':'袄','襤':'褴','襪':'袜','覈':'核','覎':'觃','覘':'觇',
  '覡':'觋','覥':'觍','覦':'觎','覯':'觏','覿':'觌','觴':'觞','觶':'觯','訐':'讦','訌':'讧','訏':'讦',
  '訒':'讱','詁':'诂','詆':'诋','詎':'讵','詐':'诈','詖':'诐','詘':'诎','詛':'诅','詝':'𬣙','詡':'诩',
  '誆':'诓','誄':'诔','誅':'诛','誇':'夸','誒':'诶','誚':'诮','誦':'诵','誥':'诰','諂':'谄','諄':'谆',
  '諉':'诿','諍':'诤','諑':'诼','諕':'诰','諗':'谂','諛':'谀','諜':'谍','諞':'谝','諟':'𬤝','諠':'谖',
  '諡':'谥','諢':'诨','諦':'谛','諧':'谐','諩':'𬣞','謅':'诌','謊':'谎','謐':'谧','謔':'谑','謖':'谡',
  '謗':'谤','謙':'谦','謚':'谥','謫':'谪','謭':'谫','謬':'谬','譁':'哗','譎':'谲','譏':'讥','譖':'谮',
  '譙':'谯','譚':'谭','譫':'谵','譬':'譬','譭':'毁','譴':'谴','譽':'誉','讁':'谪','讅':'审','讆':'𬣡',
  '讌':'䜩','讎':'雠','讒':'谗','讖':'谶','讜':'谠','讞':'谳','豈':'岂','豎':'竖','豐':'丰','豬':'猪',
  '貝':'贝','貞':'贞','負責':'负责','財':'财','貢':'贡','貧':'贫','貨':'货','販':'贩','貪':'贪','貫':'贯',
  '責任':'责任','貯':'贮','貲':'赀','貳':'贰','貴':'贵','買賣':'买卖','貶':'贬','貸':'贷','費':'费',
  '賀':'贺','貼':'贴','賃':'赁','賄':'贿','賅':'赅','資訊':'资讯','賈':'贾','賊':'贼','賑':'赈','賒':'赊',
  '賓客':'宾客','賕':'赇','賚':'赉','賜':'赐','賞金':'赏金','賡':'赓','賢':'贤','賣力':'卖力','賤':'贱',
  '賦':'赋','質量':'质量','賬':'账','賭':'赌','賴':'赖','賻':'赙','賺':'赚','賽':'赛','購':'购',
  '賾':'赜','贄':'贽','贅':'赘','贇':'赟','贈送':'赠送','贊助':'赞助','贋':'赝','贍':'赡','贏得':'赢得',
  '贐':'赆','贓':'赃','贔':'赑','贖':'赎','贛':'赣','起來':'起来','跡':'迹','踐':'践','蹌':'跄','蹕':'跸',
  '蹣':'蹒','蹤':'踪','躍':'跃','躒':'跞','躉':'趸','較量':'较量','輅':'辂','輊':'轾','輓':'挽',
  '輒':'辄','輔':'辅','輕鬆':'轻松','輛':'辆','輝':'辉','輞':'辋','輟':'辍','輥':'辊','輦':'辇','輩':'辈',
  '輪流':'轮流','輬':'辌','輯':'辑','輳':'辏','輸出':'输出','輻':'辐','輾':'辗','輿':'舆','轀':'辒',
  '轂':'毂','轄':'辖','轅':'辕','轆':'辘','轉變':'转变','轌':'𨏥','轎':'轿','轑':'辂','轔':'辚',
  '轢':'轹','轣':'轹','轡':'辔','轤':'轳','辦':'办','辨':'辨','辭':'辞','農曆':'农历','迴':'回',
  '這種':'这种','進行':'进行','連續':'连续','週':'周','違':'违','遙':'遥','遜':'逊','遠':'远','適':'适',
  '遲':'迟','遺':'遗','遼':'辽','邁':'迈','還是':'还是','邇':'迩','邊界':'边界','鄆':'郓','鄉村':'乡村',
  '鄒':'邹','鄔':'邬','鄖':'郧','鄧':'邓','鄭':'郑','鄰':'邻','鄲':'郸','鄶':'郐','鄺':'邝','酈':'郦',
  '釀':'酿','釁':'衅','釃':'𨤾','釅':'酽','釋放':'释放','裏面':'里面',
  '貓':'猫','處':'处','劃':'划','貍':'狸','貔':'貔','貘':'貘','貛':'獾','豺':'豺','貂':'貂','狸':'狸',
  '雞蛋':'鸡蛋','鴉':'鸦','鴿':'鸽','鵑':'鹃','鵬':'鹏','鶯':'莺','鶴':'鹤','鷗':'鸥','鷹':'鹰','鸚':'鹦',
  '鸝':'鹂','鸞':'鸾','麥':'麦','麩':'麸','麯':'曲','黴':'霉','鼉':'鼍','齣':'出','齦':'龈','齧':'啮',
  '龐':'庞','嚴':'严','喪':'丧','嘖':'啧','嘟':'嘟','嘩':'哗','噁':'恶','噴':'喷','嚨':'咙','嚀':'咛',
  '囉':'啰','囊':'囊','嵐':'岚','崙':'仑','嶇':'岖','嶙':'嶙','巒':'峦','幟':'帜','幫':'帮','庫':'库',
  '弒':'弑','徹':'彻','慘':'惨','慚':'惭','慟':'恸','慣':'惯','慳':'悭','慶':'庆','憐':'怜','憤':'愤',
  '憫':'悯','憶起':'忆起','懋':'懋','懲':'惩','戔':'戋','拿':'拿','捫':'扪','搗':'捣','摑':'掴','摟':'搂',
  '撇':'撇','撲':'扑','擁擠':'拥挤','攔':'拦','攙':'搀','敵':'敌','斂':'敛','曉':'晓','曇':'昙','會議':'会议',
  '朮':'术','枴':'拐','柵':'栅','桿':'杆','梘':'枧','棗':'枣','槍支':'枪支','樞':'枢','檁':'檩','歐洲':'欧洲',
  '殞':'殒','毆':'殴','氬':'氩','汙':'污','決心':'决心','沒有':'没有','洶':'汹','浬':'海里','淪':'沦',
  '溈':'沩','潷':'滗','澗':'涧','濃':'浓','瀆':'渎','灑':'洒','煥':'焕','熾':'炽','爿':'爿','牽':'牵',
  '狀態':'状态','獵':'猎','瑣':'琐','甕':'瓮','痺':'痹','癥':'症','皰':'疱','盜':'盗','瞽':'瞽','矇':'蒙',
  '碟':'碟','磧':'碛','禪':'禅','稟':'禀','穆':'穆','窯':'窑','竅':'窍','篳':'筚','簣土':'篑土','糜':'糜',
  '紘':'纮','紵':'纻','絹':'绢','綏':'绥','緣分':'缘分','縑':'缣','纊':'纩','羈':'羁','翬羽':'翚羽',
  '聯合':'联合','肅靜':'肃静','脹':'胀','腖':'胨','膩':'腻','臏':'膑','艫':'舻','蒓':'莼','蔣':'蒋',
  '蕘':'荛','薔':'蔷','藶':'苈','虯':'虬','蟣':'虮','蠍':'蝎','衆':'众','裊裊':'袅袅','覃':'覃',
  '訃':'讣','詖辭':'诐辞','諮':'咨','謹':'谨','讕':'谰','貳心':'贰心','贛江':'赣江','趾高':'趾高',
  '軌':'轨','輕重':'轻重','轟':'轰','辮':'辫','逕':'径','鄰居':'邻居','醞':'酝','釐':'厘','釗':'钊',
  '釘':'钉','釙':'钋','釤':'钐','釩':'钒','鈀':'钯','鈁':'钫','鈄':'钭','鈅':'钥','鈆':'铅','鈇':'鈇',
  '鈈':'钚','鈉':'钠','鈊':'钦','鈍':'钝','鈎':'钩','鈐':'钤','鈑':'钣','鈔':'钞','鈕':'钮','鈖':'鈖',
  '鈞':'钧','鈣':'钙','鈥':'钬','鈦':'钛','鈧':'钪','鈮':'铌','鈰':'铈','鈳':'钶','鈴':'铃','鈷':'钴',
  '鈸':'钹','鈹':'铍','鈺':'钰','鈽':'钸','鈾':'铀','鈿':'钿','鉀':'钾','鉅':'巨','鉆':'钻','鉈':'铊',
  '鉉':'铉','鉋':'刨','鉍':'铋','鉑':'铂','鉕':'钷','鉗':'钳','鉚':'铆','鉛筆':'铅笔','鉞':'钺','鉢':'钵',
  '們':'们','個':'个','來':'来','時':'时','會':'会','為':'为','這':'这','那個':'那个','說':'说','對':'对',
  '國':'国','學':'学','經':'经','過':'过','還':'还','後':'后','現':'现','發':'发','實':'实','業':'业',
  '長':'长','開':'开','關':'关','電':'电','門':'门','東':'东','車':'车','進':'进','出來':'出来','員':'员',
  '動':'动','見':'见','點':'点','問':'问','應':'应','該':'该','機':'机','種':'种','總':'总','無':'无',
  '從':'从','讓':'让','當':'当','兒':'儿','間':'间','樣':'样','歲':'岁','幾':'几','麼':'么','萬':'万',
  '氣':'气','買':'买','賣':'卖','錢':'钱','飛':'飞','馬':'马','鳥':'鸟','魚':'鱼','蟲':'虫','龍':'龙',
  '風':'风','雲':'云','電腦':'电脑','網':'网','書':'书','讀':'读','寫':'写','語':'语','認':'认','識':'识',
  '記':'记','憶':'忆','覺':'觉','聽':'听','聲':'声','樂':'乐','愛':'爱','親':'亲','戲':'戏','劇':'剧',
  '藝':'艺','術':'术','醫':'医','療':'疗','護':'护','師':'师','員工':'员工','廠':'厂','場':'场','館':'馆',
  '館子':'馆子','鐘':'钟','錶':'表','屬':'属','於':'于','與':'与','將':'将','領':'领','導':'导','歷':'历',
  '史':'史','傳':'传','統':'统','約':'约','紀':'纪','錄':'录','檔':'档','案':'案','號':'号','碼':'码',
  '規':'规','則':'则','標':'标','準':'准','質':'质','量':'量','價':'价','值':'值','資':'资','產':'产',
  '權':'权','責':'责','務':'务','負':'负','擔':'担','險':'险','試':'试','驗':'验','測':'测','較':'较',
  '確':'确','認為':'认为','決':'决','斷':'断','選':'选','擇':'择','擁':'拥','護士':'护士','術語':'术语',
  '樓':'楼','層':'层','梯':'梯','橋':'桥','鐵':'铁','鋼':'钢','銀':'银','銅':'铜','鑰':'钥','匙':'匙',
  '燈':'灯','熱':'热','涼':'凉','溫':'温','濕':'湿','乾':'干','淨':'净','髒':'脏','臟':'脏','腦':'脑',
  '臉':'脸','頭':'头','頸':'颈','肩':'肩','臂':'臂','腿':'腿','腳':'脚','趾':'趾','齒':'齿','舌':'舌',
  '嘴':'嘴','鼻':'鼻','眼':'眼','眉':'眉','髮':'发','鬚':'须','鬍':'胡','頰':'颊','額':'额','顏':'颜',
  '顯':'显','隱':'隐','藏':'藏','躲':'躲','逃':'逃','趕':'赶','追':'追','趣':'趣','趙':'赵','趨':'趋',
  '較量':'较量','觀':'观','察':'察','視':'视','覽':'览','親眼':'亲眼','鑑':'鉴','賞':'赏','贊':'赞','讚':'赞',
  '嘆':'叹','歎':'叹','喚':'唤','叫':'叫','喊':'喊','嘯':'啸','啞':'哑','嗎':'吗','嘛':'嘛','啊':'啊',
  '嗯':'嗯','唉':'唉','嘿':'嘿','哦':'哦','喔':'喔','哪':'哪','啥':'啥','咱':'咱','俺':'俺','咋':'咋',
  '這裡':'这里','這樣':'这样','這麼':'这么','那裡':'那里','那樣':'那样','那麼':'那么','甚麼':'什么',
  '怎麼':'怎么','為什麼':'为什么','為何':'为何','為了':'为了','因為':'因为','所謂':'所谓','雖然':'虽然',
  '雖':'虽','雖說':'虽说','儘管':'尽管','儘':'尽','盡':'尽','僅':'仅','僅僅':'仅仅','只有':'只有',
  '雙':'双','對方':'对方','對於':'对于','關於':'关于','關係':'关系','聯':'联','聯繫':'联系','連':'连',
  '連接':'连接','絡':'络','網絡':'网络','絕':'绝','絕對':'绝对','經濟':'经济','經歷':'经历','經過':'经过',
  '結':'结','結果':'结果','結束':'结束','終':'终','終於':'终于','繼':'继','繼續':'继续','續':'续',
  '斷絕':'断绝','斷開':'断开','醫院':'医院','醫生':'医生','護理':'护理','護士長':'护士长','園':'园',
  '習':'习','複':'复','蘇':'苏','衝':'冲','沖':'冲','燒':'烧','煙':'烟','煩':'烦','熟':'熟','熱情':'热情',
  '態':'态','狀':'状','獨':'独','獲':'获','獄':'狱','猶':'犹','獻':'献','環':'环','現金':'现金','琴':'琴',
  '瓊':'琼','瓦':'瓦','甦':'苏','異':'异','當然':'当然','疊':'叠','癢':'痒','癮':'瘾','發現':'发现',
  '發生':'发生','發展':'发展','盤':'盘','監':'监','鹽':'盐','眾':'众','睜':'睁','瞭':'了','矯':'矫',
  '硯':'砚','碩':'硕','確定':'确定','磚':'砖','礦':'矿','禮':'礼','稱':'称','稅':'税','種類':'种类',
  '積':'积','窮':'穷','競':'竞','籃':'篮','簡':'简','簽':'签','籠':'笼','粵':'粤','糧':'粮','系統':'系统',
  '納':'纳','紳':'绅','絨':'绒','綁':'绑','綵':'彩','緒':'绪','緝':'缉','緯':'纬','練':'练','縫':'缝',
  '縮':'缩','績':'绩','繁':'繁','繩':'绳','繳':'缴','罷':'罢','羅':'罗','義':'义','習慣':'习惯','翹':'翘',
  '耀':'耀','聞':'闻','聘':'聘','肅':'肃','脅':'胁','腸':'肠','膚':'肤','興':'兴','興趣':'兴趣','舊':'旧',
  '艙':'舱','萊':'莱','著':'著','葉':'叶','蓋':'盖','蓮':'莲','薑':'姜','藉':'借','蟬':'蝉','蠟':'蜡',
  '衛生':'卫生','裝':'装','製':'制','複雜':'复杂','親愛':'亲爱','覺得':'觉得','覆':'覆','觸':'触',
  '訂':'订','計':'计','訊':'讯','討':'讨','訓':'训','訪':'访','設':'设','許':'许','訴':'诉','診':'诊',
  '註':'注','評':'评','詞':'词','詩':'诗','試驗':'试验','詳':'详','誠':'诚','誌':'志','誓':'誓','誘':'诱',
  '語言':'语言','誤':'误','說話':'说话','課':'课','誰':'谁','調':'调','談':'谈','請':'请','諒':'谅',
  '論':'论','諾':'诺','謀':'谋','謎':'谜','講':'讲','謝':'谢','證':'证','識別':'识别','譯':'译','議':'议',
  '護照':'护照','讀書':'读书','變':'变','讓步':'让步','賓':'宾','贈':'赠','贏':'赢','趕快':'赶快',
  '轉':'转','較為':'较为','輕':'轻','輪':'轮','輸':'输','轍':'辙','農村':'农村','逐漸':'逐渐','邏':'逻',
  '郵':'邮','醜':'丑','釋':'释','鑽':'钻','門口':'门口','閉':'闭','開始':'开始','間隔':'间隔','閃':'闪',
  '閱':'阅','闊':'阔','陣':'阵','陰':'阴','陸':'陆','雞':'鸡','雜':'杂','霧':'雾','靈':'灵','靜':'静',
  '頂':'顶','項':'项','須':'须','頑':'顽','預':'预','領導':'领导','頻':'频','題':'题','願':'愿',
  '飢':'饥','飯':'饭','飼':'饲','飽':'饱','餃':'饺','餅':'饼','餐':'餐','餘':'余','館藏':'馆藏',
  '驅':'驱','驚':'惊','驕':'骄','體':'体','髒亂':'脏乱','鬧':'闹','魂':'魂','鮮':'鲜','鳳':'凤',
  '鴨':'鸭','鵝':'鹅','鹹':'咸','麗':'丽','麵':'面','黨':'党','齡':'龄','齊':'齐',
  '公園':'公园','花園':'花园','動物':'动物','植物':'植物','農':'农','農民':'农民','農業':'农业',
  '條':'条','個':'个','塊':'块','張':'张','隻':'只','頭數':'头数','匹':'匹','輛':'辆','棟':'栋','座':'座',
  '漢':'汉','漢語':'汉语','漢字':'汉字','華':'华','華人':'华人','僑':'侨','華僑':'华侨','臺':'台',
  '臺灣':'台湾','灣':'湾','島':'岛','嶼':'屿','峽':'峡','嶺':'岭','嶽':'岳','巖':'岩','壩':'坝',
  '軍':'军','隊':'队','戰':'战','爭':'争','鬥':'斗','勝':'胜','負傷':'负伤','傷':'伤','兵':'兵',
  '槍':'枪','彈':'弹','砲':'炮','艦':'舰','潛':'潜','衛':'卫','護衛':'护卫','營':'营','連隊':'连队',
  '師團':'师团','將軍':'将军','領導人':'领导人','總統':'总统','總理':'总理','總裁':'总裁','總部':'总部',
  '總是':'总是','總共':'总共','區':'区','縣':'县','鄉':'乡','鎮':'镇','邊':'边','境':'境','線':'线',
  '緣':'缘','緊':'紧','鬆':'松','鬆開':'松开','緩':'缓','慢':'慢','急':'急','趕緊':'赶紧','緊急':'紧急',
  '網頁':'网页','網站':'网站','網路':'网路','網球':'网球','綱':'纲','細':'细','細節':'细节','紐':'纽',
  '紐約':'纽约','約定':'约定','約會':'约会','級':'级','班級':'班级','年級':'年级','紙':'纸','紗':'纱',
  '紋':'纹','素':'素','紫':'紫','紅':'红','紅色':'红色','綠':'绿','綠色':'绿色','藍':'蓝','藍色':'蓝色',
  '黃':'黄','黃色':'黄色','橙':'橙','紛':'纷','紜':'纭','純':'纯','純粹':'纯粹','絲':'丝','綢':'绸',
  '緞':'缎','織':'织','繡':'绣','編':'编','編輯':'编辑','纖':'纤','維':'维','維持':'维持','維護':'维护',
  '臉色':'脸色','認為':'认为','認識':'认识','認真':'认真','願意':'愿意','希望':'希望','決定':'决定',
  '討論':'讨论','討厭':'讨厌','試試':'试试','試著':'试着','準備':'准备','準確':'准确','讓步':'让步',
  '讓人':'让人','負責':'负责','負擔':'负担','傷心':'伤心','傷害':'伤害','慶祝':'庆祝','麻煩':'麻烦',
  '簡單':'简单','簡直':'简直','緊張':'紧张','輕鬆':'轻松','輕易':'轻易','較好':'较好','較差':'较差',
  '繼續':'继续','斷了':'断了','斷開':'断开','聯繫':'联系','聯絡':'联络','聯合':'联合','關心':'关心',
  '關注':'关注','關閉':'关闭','關掉':'关掉','開心':'开心','開始':'开始','開學':'开学','開會':'开会',
  '離開':'离开','離婚':'离婚','適合':'适合','適應':'适应','適當':'适当','導致':'导致','導演':'导演',
  '導遊':'导游','報告':'报告','報紙':'报纸','報名':'报名','趕快':'赶快','趕緊':'赶紧','趕上':'赶上',
  '選擇':'选择','選舉':'选举','舉行':'举行','舉辦':'举办','舉手':'举手','鼓勵':'鼓励','努力':'努力',
  '態度':'态度','狀況':'状况','狀態':'状态','獨立':'独立','獨自':'独自','環境':'环境','環保':'环保',
  '現實':'现实','現代':'现代','現場':'现场','現金':'现金','發現':'发现','發生':'发生','發展':'发展',
  '發表':'发表','發送':'发送','發布':'发布','實現':'实现','實際':'实际','實在':'实在','實習':'实习',
  '業務':'业务','業績':'业绩','經濟':'经济','經理':'经理','經常':'经常','經過':'经过','經驗':'经验',
  '學習':'学习','學校':'学校','學生':'学生','學期':'学期','學位':'学位','機會':'机会','機場':'机场',
  '機器':'机器','種類':'种类','種子':'种子','總是':'总是','總共':'总共','總算':'总算','無論':'无论',
  '無法':'无法','無聊':'无聊','讓我':'让我','當時':'当时','當然':'当然','當作':'当作','間接':'间接',
  '樣子':'样子','歲月':'岁月','幾乎':'几乎','萬一':'万一','氣氛':'气氛','氣候':'气候','買房':'买房',
  '賣掉':'卖掉','錢包':'钱包','飛機':'飞机','馬上':'马上','龍蝦':'龙虾','漢堡':'汉堡','網站':'网站',
  '網路':'网路','網球':'网球','讀者':'读者','寫作':'写作','語法':'语法','認錯':'认错','記得':'记得',
  '記錄':'记录','記憶':'记忆','覺得':'觉得','聽說':'听说','聲音':'声音','音樂':'音乐','愛情':'爱情',
  '親近':'亲近','親人':'亲人','親戚':'亲戚','戲院':'戏院','醫療':'医疗','護照':'护照','師傅':'师傅',
  '廠商':'厂商','場合':'场合','場地':'场地','場面':'场面','館子':'馆子','鐘頭':'钟头','屬於':'属于',
  '約會':'约会','紀念':'纪念','檔案':'档案','號碼':'号码','規則':'规则','標準':'标准','質量':'质量',
  '價值':'价值','價格':'价格','資源':'资源','資料':'资料','責任':'责任','險些':'险些','測試':'测试',
  '較量':'较量','確定':'确定','確認':'确认','確實':'确实','決心':'决心','選出':'选出','擁護':'拥护',
  '樓上':'楼上','樓下':'楼下','層樓':'层楼','橋樑':'桥梁','鐵路':'铁路','鋼鐵':'钢铁','銀行':'银行',
  '燈光':'灯光','熱情':'热情','熱鬧':'热闹','涼快':'凉快','溫暖':'温暖','濕潤':'湿润','乾淨':'干净',
  '腦子':'脑子','臉上':'脸上','頭髮':'头发','肩膀':'肩膀','腿部':'腿部','腳步':'脚步','嘴巴':'嘴巴',
  '鼻子':'鼻子','眼睛':'眼睛','眉毛':'眉毛','顯示':'显示','隱藏':'隐藏','觀察':'观察','觀點':'观点',
  '觀眾':'观众','讚美':'赞美','讚賞':'赞赏','喚醒':'唤醒','嗎啡':'吗啡','這裡':'这里','那裡':'那里',
  '哪裡':'哪里','怎麼':'怎么','為什麼':'为什么','雖然':'虽然','儘管':'尽管','雙方':'双方','聯繫方式':'联系方式',
  '難':'难','準':'准','麗':'丽','鑽':'钻','鑰':'钥','鑲':'镶','鑄':'铸','鑒':'鉴','鑼':'锣','鑿':'凿',
  '钁':'镢','驛':'驿','驟':'骤','驢':'驴','驥':'骥','驦':'骦','驤':'骧','驪':'骊','驫':'骉','鬥':'斗',
  '鬧':'闹','鬮':'阄','鬱':'郁','魘':'魇','魎':'魉','魍':'魍','魚':'鱼','鮫':'鲛','鮮':'鲜','鯨':'鲸',
  '鯉':'鲤','鯊':'鲨','鰲':'鳌','鰭':'鳍','鱉':'鳖','鱔':'鳝','鱗':'鳞','鱷':'鳄','鳥':'鸟','鳳':'凤',
  '鳴':'鸣','鴉':'鸦','鴻':'鸿','鴿':'鸽','鵝':'鹅','鵬':'鹏','鶴':'鹤','鷗':'鸥','鷹':'鹰','鸚':'鹦',
  '鹹':'咸','鹼':'碱','麥':'麦','麵':'面','麻煩':'麻烦','黴':'霉','點':'点','齊':'齐','齋':'斋','齡':'龄',
  '齣':'出','齦':'龈','齪':'龊','齬':'龉','齲':'龋','齶':'腭','龍':'龙','龐':'庞','龔':'龚','龕':'龛'
};
const V40_MAX_KEY_LEN=(()=>{let m=1;for(const k of Object.keys(V40_TRAD_TO_SIMP)){const l=[...k].length;if(l>m)m=l;}return m;})();
let V40_DYNAMIC_MAX_KEY_LEN=V40_MAX_KEY_LEN;
const V40_TRAD_DB_STATE={loaded:false,loading:null,error:null,chars:0,phrases:0};
function v40RecalcMaxKeyLen(){
  let m=1;
  try{for(const k of Object.keys(V40_TRAD_TO_SIMP)){const l=[...k].length;if(l>m)m=l;}}catch{}
  V40_DYNAMIC_MAX_KEY_LEN=m;
  return m;
}
function v40MergeTradSimpDb(db){
  if(!db||typeof db!=='object')return false;
  let chars=0,phrases=0;
  const merge=obj=>{
    if(!obj||typeof obj!=='object')return;
    for(const [rawK,rawV] of Object.entries(obj)){
      const k=String(rawK||'').trim(),v=String(rawV||'').trim();
      if(!k||!v||k===v)continue;
      V40_TRAD_TO_SIMP[k]=v;
      if([...k].length>1)phrases++;else chars++;
    }
  };
  merge(db.phrases||db.phraseMap||{});
  merge(db.chars||db.charMap||{});
  V40_TRAD_DB_STATE.chars=chars;
  V40_TRAD_DB_STATE.phrases=phrases;
  v40RecalcMaxKeyLen();
  try{window.HZ_TRAD_SIMP_DB_INFO={version:db.version||'',chars,phrases,maxPhraseLen:V40_DYNAMIC_MAX_KEY_LEN};}catch{}
  return true;
}
async function loadTradSimpDb(){
  if(V40_TRAD_DB_STATE.loaded)return true;
  if(V40_TRAD_DB_STATE.loading)return V40_TRAD_DB_STATE.loading;
  V40_TRAD_DB_STATE.loading=(async()=>{
    try{
      const r=await fetch('db/traditional-simplified.json',{cache:'force-cache'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const db=await r.json();
      v40MergeTradSimpDb(db);
      V40_TRAD_DB_STATE.loaded=true;
      return true;
    }catch(e){
      V40_TRAD_DB_STATE.error=e&&e.message||String(e);
      try{console.warn('[Trad->Simp DB] fallback para mapa interno:',e);}catch{}
      return false;
    }
  })();
  return V40_TRAD_DB_STATE.loading;
}
try{hzScheduleIdle(()=>loadTradSimpDb(),2200);}catch{}
function v40ToSimplified(text){
  if(!text)return text;
  const chars=[...String(text)];
  let out='';
  let i=0;
  while(i<chars.length){
    let matched=false;
    for(let len=Math.min(V40_DYNAMIC_MAX_KEY_LEN||V40_MAX_KEY_LEN,chars.length-i);len>1;len--){
      const sub=chars.slice(i,i+len).join('');
      if(V40_TRAD_TO_SIMP[sub]){out+=V40_TRAD_TO_SIMP[sub];i+=len;matched=true;break;}
    }
    if(matched)continue;
    out+=V40_TRAD_TO_SIMP[chars[i]]||chars[i];
    i++;
  }
  return out;
}
function v40NormalizeText(text){return v40ToSimplified(String(text||''));}
function v40WordDisplayHtml(word){
  const raw=String(word||'');
  const simp=v40ToSimplified(raw);
  if(!raw||simp===raw)return esc(raw);
  return `${esc(simp)} <span class="trad-diff">(${esc(raw)})</span>`;
}
async function lookupTatoebaExamples(word,limit=6){
  try{word=v40ToSimplified(word);}catch{}
  const makeUrl=mode=>{
    const p=new URLSearchParams();
    p.set('lang','cmn');p.set('q',word);p.set('trans:lang','por');p.set('showtrans','matching');p.set('sort','relevance');p.set('limit',String(limit));
    if(mode==='enriched')p.set('include','audios,transcriptions');
    return `https://api.tatoeba.org/v1/sentences?${p.toString()}`;
  };
  const rows=json=>Array.isArray(json?.data)?json.data:[];
  try{
    let r=await fetch(makeUrl('basic'),{signal:AbortSignal.timeout(7000)});
    let json=r.ok?await r.json():null;
    if(!rows(json).length){
      const r2=await fetch(makeUrl('enriched'),{signal:AbortSignal.timeout(7000)});
      if(r2.ok){const j2=await r2.json();if(rows(j2).length)json=j2;}
    }
    if(!rows(json).length){
      const rp=await fetch('https://proxy.cors.sh/'+makeUrl('basic'),{signal:AbortSignal.timeout(7000)});
      if(rp.ok){const jp=await rp.json();if(rows(jp).length)json=jp;}
    }
    return rows(json).map(row=>{
      const translations=(row.translations||[]).filter(t=>t&&t.lang==='por'&&!t.is_unapproved).map(t=>t.text).filter(Boolean);
      return{text:v40ToSimplified(row.text||''),translations:[...new Set(translations)].slice(0,2),id:row.id||null};
    }).filter(e=>e.text&&v41SentenceLooksReadable(e.text)).slice(0,limit);
  }catch{return[];}
}
// Defesa contra ideogramas tradicionais que a tabela de conversão ainda não
// cobre: se o motor de pinyin não reconhece algum caractere da frase, é sinal
// forte de que é um caractere raro ou ainda tradicional — melhor descartar a
// frase inteira do que arriscar ler com o tom errado.
function v41SentenceLooksReadable(text){
  if(!window.pinyinFn)return true;
  const chars=[...text].filter(isCJK);
  for(const ch of chars){
    try{
      const py=window.pinyinFn(ch,{toneType:'symbol'});
      if(!py||py===ch)return false;
    }catch{return false;}
  }
  return true;
}
// Botão de tradução sob demanda (inglês -> português) para a tela de
// Dicionário: o texto (definição em inglês) fica marcado com um id único, e o
// botão troca só aquele texto no lugar quando clicado — nunca mexe no
// ideograma/pinyin, que ficam em elementos totalmente separados.
// Dicionário de gramática — curado à mão, cobrindo estruturas comuns do HSK
// 1 ao 5 (novo). Não é exaustivo (gramática chinesa tem centenas de padrões),
// mas cobre as estruturas mais frequentes e de maior valor pra quem estuda.
const V42_GRAMMAR_DICT=[
  {trigger:'了',level:'HSK 1',title:'Partícula aspectual 了 (le)',pattern:'Verbo + 了  /  Frase + 了',explanation:'Indica que uma ação foi concluída, ou que uma situação mudou/começou a valer agora. Não é "tempo passado" no sentido europeu — é sobre conclusão ou mudança de estado, e pode até aparecer em frases sobre o futuro.',example:'我吃了晚饭。',exampleTr:'Eu já comi o jantar.'},
  {trigger:'的',level:'HSK 1',title:'Partícula 的 (de) — posse e modificação',pattern:'Substantivo/Pronome + 的 + Substantivo',explanation:'Liga um modificador (posse, descrição) ao substantivo que vem depois, funcionando como "de"/"do"/"da" em português.',example:'这是我的书。',exampleTr:'Este é o meu livro.'},
  {trigger:'地',level:'HSK 4',title:'Partícula 地 (de) — advérbio',pattern:'Adjetivo + 地 + Verbo',explanation:'Transforma um adjetivo em advérbio, modificando o verbo que vem depois — equivalente ao sufixo "-mente" em português.',example:'他慢慢地走。',exampleTr:'Ele anda lentamente.'},
  {trigger:'得',level:'HSK 3',title:'Partícula 得 (de) — complemento de grau/resultado',pattern:'Verbo/Adjetivo + 得 + Complemento',explanation:'Liga um verbo ou adjetivo a um complemento que descreve o GRAU ou RESULTADO da ação — como "tão...que" ou "de forma tão...".',example:'他跑得很快。',exampleTr:'Ele corre muito rápido.'},
  {trigger:'把',level:'HSK 3',title:'Construção com 把 (bǎ)',pattern:'Sujeito + 把 + Objeto + Verbo + Complemento',explanation:'Destaca o que acontece COM um objeto específico, geralmente quando ele muda de posição, estado, ou é afetado de forma definida. O objeto aparece ANTES do verbo, invertendo a ordem normal.',example:'我把书放在桌子上。',exampleTr:'Eu coloquei o livro em cima da mesa.'},
  {trigger:'被',level:'HSK 3',title:'Voz passiva com 被 (bèi)',pattern:'Sujeito (paciente) + 被 + (Agente) + Verbo',explanation:'Marca a voz passiva: o sujeito da frase RECEBE a ação em vez de praticá-la — equivalente a "ser/foi + particípio".',example:'杯子被打破了。',exampleTr:'O copo foi quebrado.'},
  {trigger:'是...的',level:'HSK 3',title:'Construção 是...的 (shì...de) — ênfase',pattern:'是 + [detalhe enfatizado] + 的',explanation:'Usada para enfatizar UM DETALHE específico de uma ação que já aconteceu — quando, onde, como ou por quem — não a ação em si.',example:'我是昨天来的。',exampleTr:'Foi ontem que eu vim.'},
  {trigger:'比',level:'HSK 2',title:'Comparação com 比 (bǐ)',pattern:'A + 比 + B + Adjetivo',explanation:'Estrutura padrão para comparar duas coisas, equivalente a "mais ... que" em português.',example:'今天比昨天冷。',exampleTr:'Hoje está mais frio que ontem.'},
  {trigger:'越来越',level:'HSK 3',title:'越来越 (yuè lái yuè) — cada vez mais',pattern:'越来越 + Adjetivo/Verbo',explanation:'Indica que algo está mudando progressivamente, se intensificando com o tempo — "cada vez mais".',example:'天气越来越热。',exampleTr:'O tempo está cada vez mais quente.'},
  {trigger:'越',level:'HSK 4',title:'越...越... (yuè...yuè) — quanto mais...mais',pattern:'越 + A + 越 + B',explanation:'Relaciona duas mudanças proporcionais — "quanto mais A, mais B".',example:'越学越有意思。',exampleTr:'Quanto mais se estuda, mais interessante fica.'},
  {trigger:'不但',level:'HSK 4',title:'不但...而且... (búdàn...érqiě) — não só...mas também',pattern:'不但 + A，而且 + B',explanation:'Conecta duas ideias, com a segunda reforçando/ampliando a primeira — "não só...como também".',example:'她不但漂亮，而且聪明。',exampleTr:'Ela não é só bonita, como também inteligente.'},
  {trigger:'虽然',level:'HSK 3',title:'虽然...但是... (suīrán...dànshì) — embora...mas',pattern:'虽然 + A，但是 + B',explanation:'Introduz uma concessão seguida de contraste — "embora A, B" (mesmo assim).',example:'虽然下雨，但是我们还是出去了。',exampleTr:'Embora estivesse chovendo, saímos mesmo assim.'},
  {trigger:'因为',level:'HSK 2',title:'因为...所以... (yīnwèi...suǒyǐ) — causa e efeito',pattern:'因为 + Causa，所以 + Efeito',explanation:'Estrutura clássica de causa e consequência — "porque...então/por isso".',example:'因为下雨，所以我没出门。',exampleTr:'Porque estava chovendo, eu não saí.'},
  {trigger:'如果',level:'HSK 3',title:'如果...就... (rúguǒ...jiù) — condicional',pattern:'如果 + Condição，就 + Resultado',explanation:'Estrutura condicional — "se A, então B".',example:'如果明天下雨，我就不去了。',exampleTr:'Se amanhã chover, eu não vou.'},
  {trigger:'一边',level:'HSK 3',title:'一边...一边... (yìbiān...yìbiān) — ao mesmo tempo',pattern:'一边 + Ação A，一边 + Ação B',explanation:'Descreve duas ações acontecendo simultaneamente, feitas pela mesma pessoa.',example:'他一边吃饭一边看电视。',exampleTr:'Ele come enquanto assiste TV.'},
  {trigger:'又',level:'HSK 3',title:'又...又... (yòu...yòu) — tanto...quanto',pattern:'又 + Adjetivo A + 又 + Adjetivo B',explanation:'Combina duas qualidades ou ações que coexistem — "tanto A quanto B".',example:'这个菜又好吃又便宜。',exampleTr:'Esse prato é tanto gostoso quanto barato.'},
  {trigger:'着',level:'HSK 3',title:'Partícula aspectual 着 (zhe)',pattern:'Verbo + 着',explanation:'Indica uma ação ou estado EM CURSO/continuado — algo que permanece acontecendo ou numa determinada condição.',example:'门开着。',exampleTr:'A porta está aberta (permanece aberta).'},
  {trigger:'过',level:'HSK 2',title:'Partícula aspectual 过 (guo) — experiência',pattern:'Verbo + 过',explanation:'Indica que algo JÁ ACONTECEU pelo menos uma vez na vida/experiência do falante — "já fiz X (alguma vez)".',example:'我去过中国。',exampleTr:'Eu já fui à China (alguma vez).'},
  {trigger:'快要',level:'HSK 3',title:'快要...了 (kuàiyào...le) — prestes a',pattern:'快要 + Verbo/Situação + 了',explanation:'Indica que algo está prestes a acontecer, num futuro bem próximo.',example:'火车快要到了。',exampleTr:'O trem está prestes a chegar.'},
  {trigger:'除了',level:'HSK 4',title:'除了...以外 (chúle...yǐwài) — além de / exceto',pattern:'除了 + A + 以外，(也/都) + B',explanation:'Pode significar "além de A" (incluindo) ou "exceto A" (excluindo), dependendo do contexto e da partícula que segue.',example:'除了他以外，大家都来了。',exampleTr:'Exceto ele, todo mundo veio.'},
  {trigger:'只有',level:'HSK 4',title:'只有...才... (zhǐyǒu...cái) — só se...então',pattern:'只有 + Condição única，才 + Resultado',explanation:'Indica uma condição NECESSÁRIA E ÚNICA para que algo aconteça — "só se A, então B" (sem A, nunca B).',example:'只有努力，才能成功。',exampleTr:'Só com esforço é que se consegue ter sucesso.'},
  {trigger:'无论',level:'HSK 4',title:'无论...都... (wúlùn...dōu) — não importa',pattern:'无论 + Pergunta aberta，都 + Resultado',explanation:'Indica que o resultado se mantém independentemente da variável mencionada — "não importa o quê/quem/quando, sempre B".',example:'无论天气怎么样，我们都要去。',exampleTr:'Não importa como esteja o tempo, nós vamos de qualquer forma.'},
  {trigger:'一...就',level:'HSK 3',title:'一...就... (yī...jiù) — assim que',pattern:'一 + Ação A，就 + Ação B',explanation:'Indica que a Ação B acontece IMEDIATAMENTE após a Ação A — "assim que A, logo B".',example:'我一到家就睡觉了。',exampleTr:'Assim que cheguei em casa, fui dormir.'},
  {trigger:'连',level:'HSK 4',title:'连...都/也... (lián...dōu/yě) — até mesmo',pattern:'连 + Item extremo + 都/也 + Verbo',explanation:'Enfatiza um caso extremo para reforçar uma afirmação — "até mesmo X faz/tem Y".',example:'他连饭都不吃。',exampleTr:'Ele nem sequer come (chega a esse ponto).'},
  {trigger:'在',level:'HSK 1',title:'在 + Verbo — ação em progresso',pattern:'(正)在 + Verbo (+呢)',explanation:'Marca uma ação em andamento no momento da fala, equivalente ao gerúndio "-ando" em português.',example:'我在吃饭。',exampleTr:'Eu estou comendo.'},
  {trigger:'一点儿',level:'HSK 2',title:'一点儿 (yìdiǎnr) — um pouco',pattern:'Adjetivo + 一点儿  /  Verbo + 一点儿',explanation:'Suaviza uma comparação ou pedido, indicando uma pequena quantidade ou grau — "um pouco".',example:'这个便宜一点儿。',exampleTr:'Este é um pouco mais barato.'},
  {trigger:'应该',level:'HSK 3',title:'应该 (yīnggāi) — dever/deveria',pattern:'应该 + Verbo',explanation:'Expressa obrigação moral ou expectativa — "deveria/deve".',example:'你应该多休息。',exampleTr:'Você deveria descansar mais.'}
];
let V42_GRAMMAR_EXT_LOADING=null;
function v42AddGrammarHelpers(list){
  if(!Array.isArray(list))return;
  const seen=new Set(V42_GRAMMAR_DICT.map(g=>(g.trigger||'')+'|'+(g.title||'')));
  for(const g of list){
    if(!g||!g.trigger||!g.title)continue;
    const key=g.trigger+'|'+g.title;
    if(seen.has(key))continue;
    seen.add(key);
    V42_GRAMMAR_DICT.push({
      trigger:String(g.trigger),level:String(g.level||'HSK ?'),title:String(g.title||g.trigger),
      pattern:String(g.pattern||''),explanation:String(g.explanation||''),example:String(g.example||''),exampleTr:String(g.exampleTr||''),aliases:Array.isArray(g.aliases)?g.aliases:[]
    });
  }
}
async function v42LoadGrammarHelpers(){
  if(V42_GRAMMAR_EXT_LOADING)return V42_GRAMMAR_EXT_LOADING;
  V42_GRAMMAR_EXT_LOADING=(async()=>{
    try{
      const r=await fetch('db/grammar-helpers.json',{cache:'force-cache'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const db=await r.json();
      v42AddGrammarHelpers(db.patterns||db.items||[]);
      return true;
    }catch(e){try{console.warn('[Grammar DB] fallback para base interna:',e);}catch{} return false;}
  })();
  return V42_GRAMMAR_EXT_LOADING;
}
hzScheduleIdle(()=>v42LoadGrammarHelpers(),2400);
function v42FindGrammar(word){
  if(!word)return[];
  try{v42LoadGrammarHelpers();}catch{}
  const q=String(word||'');
  return V42_GRAMMAR_DICT.filter(g=>q.includes(g.trigger)||(g.aliases||[]).some(a=>a&&q.includes(a))).slice(0,6);
}
// Pequena melodia pentatônica gerada por síntese (Web Audio API), evocando a
// escala tradicional chinesa gong-shang-jue-zhi-yu, com um envelope que imita
// o dedilhado de uma corda (tipo guzheng/koto). Sendo honesto: isso não é uma
// gravação de um instrumento real (não tenho como obter/baixar uma amostra de
// áudio aqui), é uma síntese própria que evoca aquele universo sonoro.
const V43_TRACKS=[
{id:0,num:'01',title:'女兒情',dur:162,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/01.%20%E5%A5%B3%E5%85%92%E6%83%85.wav'},
{id:1,num:'02',title:'夢江南',dur:206,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/02.%20%E5%A4%A2%E6%B1%9F%E5%8D%97.wav'},
{id:2,num:'03',title:'一簾幽夢',dur:246,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/03.%20%E4%B8%80%E7%B0%BE%E5%B9%BD%E5%A4%A2.wav'},
{id:3,num:'04',title:'梅花三弄',dur:177,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/04.%20%E6%A2%85%E8%8A%B1%E4%B8%89%E5%BC%84.wav'},
{id:4,num:'05',title:'東海漁歌',dur:315,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/05.%20%E6%9D%B1%E6%B5%B7%E6%BC%81%E6%AD%8C.wav'},
{id:5,num:'06',title:'梅花引',dur:288,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/06.%20%E6%A2%85%E8%8A%B1%E5%BC%95.wav'},
{id:6,num:'07',title:'戰颱風',dur:307,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/07.%20%E6%88%B0%E9%A2%B1%E9%A2%A8.wav'},
{id:7,num:'08',title:'寒鴉戲水',dur:396,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/08.%20%E5%AF%92%E9%B4%89%E6%88%B2%E6%B0%B4.wav'},
{id:8,num:'09',title:'倩女幽魂',dur:309,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/09.%20%E5%80%A9%E5%A5%B3%E5%B9%BD%E9%AD%82.wav'},
{id:9,num:'10',title:'滄海一聲笑',dur:247,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/10.%20%E6%BB%84%E6%B5%B7%E4%B8%80%E8%81%B2%E7%AC%91.wav'},
{id:10,num:'11',title:'高山流水',dur:402,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/11.%20%E9%AB%98%E5%B1%B1%E6%B5%81%E6%B0%B4.wav'},
{id:11,num:'12',title:'平湖秋月',dur:393,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/12.%20%E5%B9%B3%E6%B9%96%E7%A7%8B%E6%9C%88.wav'},
{id:12,num:'13',title:'天上掉個林妹妹',dur:274,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/13.%20%E5%A4%A9%E4%B8%8A%E6%8E%89%E5%80%8B%E6%9E%97%E5%A6%B9%E5%A6%B9.wav'},
{id:13,num:'14',title:'山丹丹花開紅艷艷',dur:296,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/14.%20%E5%B1%B1%E4%B8%B9%E4%B8%B9%E8%8A%B1%E9%96%8B%E7%B4%85%E8%89%B7%E8%89%B7.wav'},
{id:14,num:'15',title:'草原上升起不落的太陽',dur:198,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/15.%20%E8%8D%89%E5%8E%9F%E4%B8%8A%E5%8D%87%E8%B5%B7%E4%B8%8D%E8%90%BD%E7%9A%84%E5%A4%AA%E9%99%BD.wav'},
{id:15,num:'16',title:'坐上火車去拉薩',dur:328,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/16%E5%9D%90%E4%B8%8A%E7%81%AB%E8%BB%8A%E5%8E%BB%E6%8B%89%E8%96%A9.wav'},
{id:16,num:'17',title:'天堂',dur:346,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/17.%20%E5%A4%A9%E5%A0%82.wav'},
{id:17,num:'18',title:'天路',dur:316,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/18.%20%E5%A4%A9%E8%B7%AF.wav'},
{id:18,num:'19',title:'十送紅軍',dur:377,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/19.%20%E5%8D%81%E9%80%81%E7%B4%85%E8%BB%8D.wav'},
{id:19,num:'20',title:'牧羊曲',dur:295,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/20.%20%E7%89%A7%E7%BE%8A%E6%9B%B2.wav'},
{id:20,num:'21',title:'神奇的九寨',dur:336,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/21.%20%E7%A5%9E%E5%A5%87%E7%9A%84%E4%B9%9D%E5%AF%A8.wav'},
{id:21,num:'22',title:'康定情歌',dur:289,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/22.%20%E5%BA%B7%E5%AE%9A%E6%83%85%E6%AD%8C.wav'},
{id:22,num:'23',title:'茉莉花',dur:250,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/23.%20%E8%8C%89%E8%8E%89%E8%8A%B1.wav'},
{id:23,num:'24',title:'天竺少女',dur:258,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/24.%20%E5%A4%A9%E7%AB%BA%E5%B0%91%E5%A5%B3.wav'},
{id:24,num:'25',title:'月光下的鳳尾竹',dur:291,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/25.%20%E6%9C%88%E5%85%89%E4%B8%8B%E7%9A%84%E9%B3%B3%E5%B0%BE%E7%AB%B9.wav'},
{id:25,num:'26',title:'蝴蝶泉邊',dur:326,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/26.%20%E8%9D%B4%E8%9D%B6%E6%B3%89%E9%82%8A.wav'},
{id:26,num:'27',title:'山路十八彎',dur:243,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/27.%20%E5%B1%B1%E8%B7%AF%E5%8D%81%E5%85%AB%E5%BD%8E.wav'},
{id:27,num:'28',title:'映山紅',dur:290,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/28.%20%E6%98%A0%E5%B1%B1%E7%B4%85.wav'},
{id:28,num:'29',title:'好日子',dur:228,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/29.%20%E5%A5%BD%E6%97%A5%E5%AD%90.wav'},
{id:29,num:'30',title:'不愛胭脂愛乾坤',dur:305,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/30.%20%E4%B8%8D%E6%84%9B%E8%83%AD%E8%84%82%E6%84%9B%E4%B9%BE%E5%9D%A4.wav'},
{id:30,num:'31',title:'荷塘月色',dur:247,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/31.%20%E8%8D%B7%E5%A1%98%E6%9C%88%E8%89%B2.wav'},
{id:31,num:'32',title:'愛江山更愛美人',dur:356,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/32.%20%E6%84%9B%E6%B1%9F%E5%B1%B1%E6%9B%B4%E6%84%9B%E7%BE%8E%E4%BA%BA.wav'},
{id:32,num:'33',title:'願君心記取',dur:270,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/33.%20%E9%A1%98%E5%90%9B%E5%BF%83%E8%A8%98%E5%8F%96.wav'},
{id:33,num:'34',title:'梅花雪',dur:266,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/34.%20%E6%A2%85%E8%8A%B1%E9%9B%AA.wav'},
{id:34,num:'35',title:'飛雪千年',dur:275,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/35.%20%E9%A3%9B%E9%9B%AA%E5%8D%83%E5%B9%B4.wav'},
{id:35,num:'36',title:'伶人歌',dur:328,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/36.%20%E4%BC%B6%E4%BA%BA%E6%AD%8C.wav'},
{id:36,num:'37',title:'望春風',dur:340,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/37.%20%E6%9C%9B%E6%98%A5%E9%A2%A8.wav'},
{id:37,num:'38',title:'紅豆曲',dur:276,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/38.%20%E7%B4%85%E8%B1%86%E6%9B%B2.wav'},
{id:38,num:'39',title:'一水隔天涯',dur:248,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/39.%20%E4%B8%80%E6%B0%B4%E9%9A%94%E5%A4%A9%E6%B6%AF.wav'},
{id:39,num:'40',title:'初一到十五',dur:251,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/40.%20%E5%88%9D%E4%B8%80%E5%88%B0%E5%8D%81%E4%BA%94.wav'},
{id:40,num:'41',title:'月滿西樓',dur:328,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/41.%20%E6%9C%88%E6%BB%BF%E8%A5%BF%E6%A8%93.wav'},
{id:41,num:'42',title:'梅花夢',dur:267,url:'https://archive.org/download/fu-na-fever-guzheng-3cd/42.%20%E6%A2%85%E8%8A%B1%E5%A4%A2.wav'}
];
window.HZ_GUZHENG_TRACKS=V43_TRACKS;
const V43_COVER='assets/guzheng.svg';
// --- Player de música (álbum de guzheng) ---
const V43_SEG_LEN=30;
function v43CandidateStarts(track){
  // evita os primeiros ~15% (geralmente introdução) e os últimos ~15%
  // (geralmente final/fade), gerando alguns pontos de início possíveis
  // dentro do miolo da música pra variar entre repetições.
  const safeStart=track.dur*0.15;
  const safeEnd=Math.max(safeStart+V43_SEG_LEN,track.dur*0.85-V43_SEG_LEN);
  const span=Math.max(0,safeEnd-safeStart);
  const count=Math.min(5,Math.max(1,Math.floor(span/V43_SEG_LEN)||1));
  const starts=[];
  for(let i=0;i<count;i++)starts.push(Math.round(safeStart+(count>1?span*i/(count-1):0)));
  return[...new Set(starts)];
}
function v43GetUsedStarts(trackId){try{return JSON.parse(localStorage.getItem('v43UsedStarts:'+trackId)||'[]');}catch{return[];}}
function v43MarkUsedStart(trackId,start){
  try{
    let used=v43GetUsedStarts(trackId);
    used.push(start);
    const candidates=v43CandidateStarts(V43_TRACKS[trackId]);
    if(used.length>=candidates.length)used=[start];
    try{localStorage.setItem('v43UsedStarts:'+trackId,JSON.stringify(used));}catch{}
  }catch{}
}
function v43PickSegmentStart(trackId){
  const track=V43_TRACKS[trackId];
  const candidates=v43CandidateStarts(track);
  const used=v43GetUsedStarts(trackId);
  const unused=candidates.filter(c=>!used.includes(c));
  const pool=unused.length?unused:candidates;
  const start=pool[Math.floor(Math.random()*pool.length)];
  v43MarkUsedStart(trackId,start);
  return start;
}
function v43Fmt(t){t=Math.max(0,Math.floor(t||0));return`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;}
let v43Audio=null,v43CurrentTrackId=null,v43CelebrationMode=false,v43CelebEndTimer=null,v43CelebSegEnd=0;
let v43PreloadedInfo=null,v43PreloadPending=false,v43PreloadGeneration=0,v43PreloadTimer=0;
function v43GetAudioEl(){
  if(!v43Audio){
    v43Audio=new Audio();
    v43Audio.preload='auto';
    v43Audio.addEventListener('ended',v43OnTrackEnded);
    v43Audio.addEventListener('timeupdate',v43OnTimeUpdate);
  }
  return v43Audio;
}
function v43ClearPreloadTimer(){if(v43PreloadTimer){clearTimeout(v43PreloadTimer);v43PreloadTimer=0;}}
function v43SchedulePreload(delay=650){
  v43ClearPreloadTimer();
  v43PreloadTimer=setTimeout(()=>{v43PreloadTimer=0;v43StartPreload();},Math.max(0,delay));
}
function v43BufferedEnough(audio,start){
  try{for(let i=0;i<audio.buffered.length;i++)if(audio.buffered.start(i)<=start+.25&&audio.buffered.end(i)>=start+V43_SEG_LEN-1)return true;}catch{}
  return audio.readyState>=4;
}
function v43StartPreload(){
  if(v43CelebrationMode||v43CurrentTrackId!=null||v43PreloadedInfo||v43PreloadPending||document.hidden)return;
  const generation=++v43PreloadGeneration;
  v43PreloadPending=true;
  const trackId=Math.floor(Math.random()*V43_TRACKS.length),track=V43_TRACKS[trackId],start=v43PickSegmentStart(trackId),audio=v43GetAudioEl();
  let settleTimer=0;
  const finish=(ready=true)=>{
    if(generation!==v43PreloadGeneration||v43CelebrationMode||v43CurrentTrackId!=null)return;
    cleanup();try{audio.currentTime=start;}catch{}
    v43PreloadedInfo={trackId,track,start,ready:Boolean(ready&&v43BufferedEnough(audio,start)),preparedAt:Date.now()};
    v43PreloadPending=false;
  };
  const fail=()=>{if(generation!==v43PreloadGeneration)return;cleanup();v43PreloadPending=false;v43PreloadedInfo=null;v43SchedulePreload(2500);};
  const onMeta=()=>{try{audio.currentTime=start;}catch{}if(v43BufferedEnough(audio,start))finish(true);};
  const onCan=()=>{if(v43BufferedEnough(audio,start))finish(true);};
  const onProgress=()=>{if(v43BufferedEnough(audio,start))finish(true);};
  const onError=()=>fail();
  const cleanup=()=>{if(settleTimer)clearTimeout(settleTimer);audio.removeEventListener('loadedmetadata',onMeta);audio.removeEventListener('canplay',onCan);audio.removeEventListener('canplaythrough',onCan);audio.removeEventListener('progress',onProgress);audio.removeEventListener('error',onError);};
  cleanup();
  audio.pause();audio.preload='auto';audio.src=track.url;
  audio.addEventListener('loadedmetadata',onMeta,{once:true});
  audio.addEventListener('canplay',onCan);audio.addEventListener('canplaythrough',onCan);audio.addEventListener('progress',onProgress);audio.addEventListener('error',onError,{once:true});
  settleTimer=setTimeout(()=>{if(generation===v43PreloadGeneration&&v43PreloadPending)finish(false);},9000);
  try{audio.load();}catch{fail();}
}
function v43ReleasePreload(){
  if(v43CelebrationMode||v43CurrentTrackId!=null)return;
  ++v43PreloadGeneration;v43PreloadPending=false;v43PreloadedInfo=null;v43ClearPreloadTimer();
  if(v43Audio){try{v43Audio.pause();v43Audio.removeAttribute('src');v43Audio.load();}catch{}}
}
function v43StopMusic({keepPreload=false}={}){
  if(v43Audio){try{v43Audio.pause();}catch{}}
  if(v43CelebEndTimer){clearTimeout(v43CelebEndTimer);v43CelebEndTimer=null;}
  v43CelebrationMode=false;v43CurrentTrackId=null;v43CelebSegEnd=0;
  document.getElementById('v43-mini-player')?.remove();
  document.documentElement.classList.remove('hz-celebrating');
  document.body?.classList.remove('hz-celebrating');
  if(!keepPreload){v43PreloadedInfo=null;v43PreloadPending=false;v43SchedulePreload(550);}
}
function v43OnTrackEnded(){
  if(!v43CelebrationMode)return;
  v43CelebrationMode=false;v43CurrentTrackId=null;document.documentElement.classList.remove('hz-celebrating');document.body?.classList.remove('hz-celebrating');v43SchedulePreload(700);
}
function v43OnTimeUpdate(){
  if(!v43CelebrationMode||!v43Audio)return;
  const start=v43CelebSegEnd-V43_SEG_LEN,fill=document.getElementById('v43-mini-fill'),timeEl=document.getElementById('v43-mini-time');
  if(fill){const pct=Math.min(100,((v43Audio.currentTime-start)/V43_SEG_LEN)*100);fill.style.width=Math.max(0,pct)+'%';}
  if(timeEl)timeEl.textContent=`${v43Fmt(v43Audio.currentTime-start)} / ${v43Fmt(V43_SEG_LEN)}`;
  if(v43Audio.currentTime>=v43CelebSegEnd){try{v43Audio.pause();}catch{}v43OnTrackEnded();}
}
function v43PlayCelebrationTrack(){
  const audio=v43GetAudioEl();
  let trackId,track,start,alreadyPrepared=false;
  if(v43PreloadedInfo&&audio.src&&audio.src===new URL(v43PreloadedInfo.track.url,location.href).href){
    ({trackId,track,start}=v43PreloadedInfo);alreadyPrepared=true;
  }else{
    trackId=Math.floor(Math.random()*V43_TRACKS.length);track=V43_TRACKS[trackId];start=v43PickSegmentStart(trackId);
    audio.preload='auto';audio.src=track.url;try{audio.load();}catch{}
  }
  ++v43PreloadGeneration;v43ClearPreloadTimer();v43PreloadedInfo=null;v43PreloadPending=false;
  v43CelebrationMode=true;v43CurrentTrackId=trackId;v43CelebSegEnd=start+V43_SEG_LEN;
  document.documentElement.classList.add('hz-celebrating');document.body?.classList.add('hz-celebrating');
  const doPlay=()=>{try{audio.currentTime=start;}catch{}return audio.play().catch(()=>false);};
  if(alreadyPrepared||audio.readyState>=2)void doPlay();
  else{const onReady=()=>{audio.removeEventListener('loadedmetadata',onReady);void doPlay();};audio.addEventListener('loadedmetadata',onReady,{once:true});}
  if(v43CelebEndTimer)clearTimeout(v43CelebEndTimer);
  v43CelebEndTimer=setTimeout(()=>{try{audio.pause();}catch{}v43CelebEndTimer=null;v43OnTrackEnded();},V43_SEG_LEN*1000+350);
  return{trackId,track,start,preloaded:alreadyPrepared};
}

document.addEventListener('visibilitychange',()=>{if(document.hidden){if(!v43CelebrationMode)v43ReleasePreload();}else v43SchedulePreload(450);});
window.hzPreloadCelebration=()=>{v43StartPreload();return Boolean(v43PreloadedInfo||v43PreloadPending);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>v43SchedulePreload(700),{once:true});else v43SchedulePreload(700);

function v42PlayCelebrationChime(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    const ctx=new Ctx();
    // escala pentatônica (gong-shang-jue-zhi-yu) a partir de Dó
    const notes=[261.63,293.66,329.63,392.00,440.00,523.25];
    const seq=[0,2,4,5,4,2,0].map(i=>notes[i]);
    let t=ctx.currentTime;
    seq.forEach((freq,i)=>{
      const dur=i===seq.length-1?0.55:0.22;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type='triangle';
      osc.frequency.value=freq;
      osc.connect(gain);gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(0.22,t+0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      osc.start(t);osc.stop(t+dur+0.05);
      t+=dur*0.72;
    });
    setTimeout(()=>{try{ctx.close();}catch{}},2200);
  }catch{}
}
function v42BambooSvg(seed){
  const h=130+((seed*37)%60);
  const w=10+((seed*17)%3)*3;
  const lean=((seed%2===0)?1:-1)*(6+(seed*11)%10);
  const segs=5+(seed%3);
  const nodes=[];
  for(let i=1;i<segs;i++){
    const y=(h/segs)*i;
    const xoff=(lean*(y/h));
    nodes.push(`<line x1="${xoff-w/2-1}" y1="${y}" x2="${xoff+w/2+1}" y2="${y}" stroke="#254a2a" stroke-width="2.4" opacity=".8"/>`);
  }
  const midX=lean*0.5,topX=lean;
  return `<svg class="v42-bamboo v42-bamboo-sway" style="height:${58+((seed*23)%30)}%;animation-delay:${(seed*90)}ms" viewBox="${-30} 0 ${60} ${h}" preserveAspectRatio="xMidYMax meet">
    <defs><linearGradient id="bg${seed}" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#2f5a34"/><stop offset="100%" stop-color="#7fb582"/></linearGradient></defs>
    <path d="M${-w/2} ${h} Q${midX-w/2} ${h*.5} ${topX-w/2} 0 L${topX+w/2} 0 Q${midX+w/2} ${h*.5} ${w/2} ${h} Z" fill="url(#bg${seed})" opacity=".92"/>
    <g>${nodes.join('')}</g>
    <path d="M${topX+w/2} ${h*.12} q26 -10 36 -26" stroke="#6fa572" stroke-width="3.5" fill="none" opacity=".95" stroke-linecap="round"/>
    <path d="M${topX-w/2} ${h*.28} q-28 -8 -38 -24" stroke="#6fa572" stroke-width="3.5" fill="none" opacity=".95" stroke-linecap="round"/>
    <path d="M${topX+w/2} ${h*.45} q22 -8 30 -22" stroke="#5c9160" stroke-width="3" fill="none" opacity=".85" stroke-linecap="round"/>
  </svg>`;
}
async function v39TranslateEnToPt(text){
  try{
    const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`,{signal:AbortSignal.timeout(6000)});
    if(!r.ok)return null;
    const d=await r.json();
    const tr=Array.isArray(d?.[0])?d[0].map(seg=>seg&&seg[0]||'').join(''):null;
    return tr&&tr.trim()?tr.trim():null;
  }catch{return null;}
}
function v41TranslateWordExpandHtml(term,result){
  const py=(typeof getWordPY==='function'?getWordPY(term):'')||'';
  let html=`<div class="lexi-acc-detail"><div class="lexi-acc-zh">${esc(term)}</div>`;
  if(py)html+=`<div class="lexi-acc-py">${esc(py)}</div>`;
  html+=`<div class="lexi-acc-divider"></div>`;
  if(result&&result.defs&&result.defs.length){
    const flatDefs=[];result.defs.forEach(s=>(s.defs||[]).forEach(d=>flatDefs.push(d.text)));
    if(flatDefs.length){
      html+=`<div class="lexi-acc-mean">${v39TransButton(flatDefs[0])}</div><div class="lexi-acc-divider"></div>`;
      if(flatDefs.length>1)html+=`<div class="lexi-acc-defs">`+flatDefs.slice(1,6).map((t,i)=>`<div class="lexi-def"><span class="lexi-num">${i+2}.</span>${v39TransButton(t)}</div>`).join('')+`</div>`;
    }else html+=`<div class="dict-empty" style="padding:6px 0">Sem definição encontrada.</div>`;
  }else html+=`<div class="dict-empty" style="padding:6px 0">Sem definição encontrada.</div>`;
  if(result&&result.tatoeba&&result.tatoeba.length){
    html+=`<div class="lexi-acc-divider"></div><div class="lexi-section-title">Frases de exemplo</div><div class="tip-tatoeba">`;
    html+=result.tatoeba.slice(0,4).map((ex,i)=>{
      const spy=(typeof getWordPY==='function'?getWordPY(ex.text):'')||'';
      return `<div class="tip-ex-card"><div class="tip-ex-actions"><button class="tip-ex-play" data-sent-play="${esc(ex.text)}" title="Ouvir frase"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg></button>${v41SaveSentenceButtonHtml(ex.text,ex.translations,term)}</div><div class="tip-ex-body"><div class="tip-ex-zh">${v41RenderSentenceWithHighlight(ex.text,term)}</div>${spy?`<div class="tip-ex-py">${esc(spy)}</div>`:''}${ex.translations&&ex.translations.length?`<div class="tip-ex-tr">${esc(ex.translations[0])}</div>`:''}</div></div>`;
    }).join('');
    html+=`</div>`;
  }
  html+=`</div>`;
  return html;
}
function v39ExpandedPanelHtml(term,result){
  const py=(typeof getWordPY==='function'?getWordPY(term):'')||'';
  let html=`<div class="lexi-acc-detail"><div class="lexi-acc-zh">${v40WordDisplayHtml(term)}</div>`;
  if(py)html+=`<div class="lexi-acc-py">${esc(py)}</div>`;
  html+=`<div class="lexi-acc-divider"></div>`;
  if(result&&result.defs&&result.defs.length){
    const flatDefs=[];result.defs.forEach(s=>(s.defs||[]).forEach(d=>flatDefs.push(d)));
    const allPyHints=new Set(flatDefs.map(d=>d.pyHint).filter(Boolean));
    const hasMultipleReadings=allPyHints.size>1;
    if(flatDefs.length){
      const first=flatDefs[0];
      const firstReading=hasMultipleReadings&&first.pyHint?` <span class="lexi-def-reading">— ${esc(term)}: ${esc(first.pyHint)}</span>`:'';
      html+=`<div class="lexi-def-label">Significado${firstReading}</div><div class="lexi-acc-mean">${v39TransButton(first.text)}</div><div class="lexi-acc-divider"></div>`;
      if(flatDefs.length>1){
        html+=`<div class="lexi-acc-defs">`+flatDefs.slice(1,6).map((d,i)=>{
          const reading=hasMultipleReadings&&d.pyHint?` <span class="lexi-def-reading">— ${esc(term)}: ${esc(d.pyHint)}</span>`:'';
          return `<div class="lexi-def"><div class="lexi-def-label">Definição ${i+2}${reading}</div>${v39TransButton(d.text)}</div>`;
        }).join('')+`</div>`;
      }
    }else{
      html+=`<div class="dict-empty" style="padding:6px 0">Sem definição encontrada.</div>`;
    }
  }else{
    html+=`<div class="dict-empty" style="padding:6px 0">Sem definição encontrada.</div>`;
  }
  html+=`</div>`;
  return html;
}
function v39BindAccordion(root,terms){
  root.querySelectorAll('[data-acc-idx]').forEach(row=>{
    const idx=parseInt(row.dataset.accIdx);
    row.onclick=async(e)=>{
      if(e.target.closest('button'))return;
      const panel=root.querySelector(`#acc-panel-${idx}`);
      if(!panel)return;
      const wasOpen=row.classList.contains('open');
      root.querySelectorAll('.lexi-acc-row.open').forEach(r=>r.classList.remove('open'));
      root.querySelectorAll('.lexi-acc-panel.open').forEach(p=>p.classList.remove('open'));
      if(wasOpen)return;
      row.classList.add('open');panel.classList.add('open');
      if(!panel.dataset.loaded){
        panel.innerHTML='<div class="spin sm" style="margin:10px auto"></div>';
        const term=terms[idx],requestId=`${Date.now()}-${Math.random()}`;panel.dataset.requestId=requestId;
        let result=null;try{result=window.resolveDictionaryEntry?await window.resolveDictionaryEntry(term):await lookupAll(term);}catch{}
        if(!panel.isConnected||panel.dataset.requestId!==requestId||!row.classList.contains('open'))return;
        panel.innerHTML=v39ExpandedPanelHtml(term,result);
        v39BindTransButtons(panel);
        panel.dataset.loaded='1';
      }
    };
  });
}
function v39SaveButtonHtml(word){return `<button class="lexi-save-btn" data-v39-save="${esc(word)}" title="Salvar no baralho"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;}
function v39BindSaveButtons(root){
  root.querySelectorAll('[data-v39-save]').forEach(btn=>{
    if(btn._v39save)return;btn._v39save=true;
    btn.onclick=async(e)=>{
      e.stopPropagation();
      const word=btn.dataset.v39Save;
      if(!word)return;
      const original=btn.innerHTML;
      btn.disabled=true;
      try{
        let result=null;try{result=window.resolveDictionaryEntry?await window.resolveDictionaryEntry(word):await lookupAll(word);}catch{}
        await saveWord(word,(typeof getWordPY==='function'?getWordPY(word):''),result);
        btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>';
      }catch(err){btn.disabled=false;btn.innerHTML=original;try{toast('Falha ao salvar: '+(err.message||err));}catch{}}
    };
  });
}

let v39TransSeq=0;
let v39DictSearchToken=0;
function v39TransButton(text){
  text=String(text||'');
  if(!text.trim())return esc(text);
  const id='v39tx'+(++v39TransSeq);
  return `<span class="auto-row"><span id="${id}">${esc(text)}</span><button class="auto-trans-btn" data-v39-target="${id}" data-v39-orig="${esc(text)}">PT</button></span>`;
}
function v39BindTransButtons(root){
  (root||document).querySelectorAll('[data-v39-target]').forEach(btn=>{
    if(btn._v39bound)return;btn._v39bound=true;
    const doTranslate=async()=>{
      if(btn.disabled)return;
      const span=document.getElementById(btn.dataset.v39Target);
      if(!span)return;
      const orig=btn.dataset.v39Orig;
      btn.disabled=true;const prevLabel=btn.textContent;btn.textContent='…';
      try{
        const pt=await v39TranslateEnToPt(orig);
        if(pt){span.textContent=pt;if(typeof v40AutoTransDefs!=='undefined'&&v40AutoTransDefs)btn.style.display='none';else btn.textContent='✓';}
        else{btn.textContent=prevLabel;btn.disabled=false;try{toast('Não foi possível traduzir agora.');}catch{}}
      }catch{btn.textContent=prevLabel;btn.disabled=false;}
    };
    btn.onclick=(e)=>{e.stopPropagation();doTranslate();};
    if(typeof v40AutoTransDefs!=='undefined'&&v40AutoTransDefs)doTranslate();
  });
}

async function lookupCC(word){
  try{word=v40ToSimplified(word);}catch{}
  try{
    const r=await fetch(`https://cccedict.vercel.app/api/dict?q=${encodeURIComponent(word)}`,{signal:AbortSignal.timeout(5000)});
    if(!r.ok)return null;
    const d=await r.json();
    if(!d||!d.length)return null;
    const entry=d[0];
    const defs=(entry.english||[]).filter(Boolean);
    if(!defs.length)return null;
    return{defs:[{pos:'',defs:defs.slice(0,6).map(t=>({text:t,ex:[]}))}],src:'CC-CEDICT'};
  }catch{}
  return null;
}

async function lookupAll(word){
  try{word=v40ToSimplified(word);}catch{}
  const cjkChars=[...word].filter(isCJK);
  let isMultiToken=false;
  try{const run=cjkChars.join('');isMultiToken=run&&segmentChineseRun(run).length>1;}catch{}
  const [cedict,sogou,tatoeba]=await Promise.all([
    lookupCEDICT(word).catch(()=>null),
    lookupSogouSuggestions(word).catch(()=>[]),
    lookupTatoebaExamples(word,4).catch(()=>[])
  ]);
  let primary=cedict;
  if(!primary){try{primary=await lookupWikt(word);}catch{}}
  if(!primary)primary=await lookupCC(word);
  if(!primary)primary=await lookupGT(word);
  if(!primary)primary=await lookupMM(word);
  if(!primary)return null;
  primary.sogou=sogou;
  primary.tatoeba=tatoeba;
  // Para palavras compostas/frases, também traz o significado literal de cada
  // ideograma separado — assim o usuário vê o sentido conjunto E o de cada
  // caractere, ao invés de só uma tradução literal do trecho inteiro.
  if((isMultiToken||cjkChars.length>1)&&cjkChars.length<=6){
    const uniqueChars=[...new Set(cjkChars)];
    try{
      primary.charDefs=await Promise.all(uniqueChars.map(async ch=>{
        try{const r=await lookupCEDICT(ch);return{ch,text:r?.defs?.[0]?.defs?.[0]?.text||null};}
        catch{return{ch,text:null};}
      }));
    }catch{primary.charDefs=null;}
  }
  return primary;
}

async function tryNearby(tokenIdx){
  const tok=readerTokens[tokenIdx];
  if(!tok)return null;
  const base=tok.charStart||0;
  for(const len of[4,3,2]){
    for(const start of[base,base-1,base-len+1]){
      if(start<0)continue;
      const refs=readerCharRefs.slice(start,start+len);
      if(refs.length<len)continue;
      const w=refs.map(r=>r.ch).join('');
      if(![...w].every(isCJK)||w===tok.word)continue;
      try{const r=await lookupWikt(w);if(r)return{word:w,py:getWordPY(w),...r};}catch{}
      const cc=await lookupCC(w);if(cc)return{word:w,py:getWordPY(w),...cc};
    }
  }
  return null;
}

const NATURAL_AUDIO_DIRECT=[
  {name:'Youdao dictvoice 1',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`},
  {name:'Youdao dictvoice 2',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`}
];
const naturalAudioCache=new Map();
function stopAudio(){if(curAudio){try{curAudio.pause();}catch{}curAudio=null;}}
function setAudioBusy(mode,on){
  ['tip-audio','tip-natural','tip-slow','tone-natural','tone-slow'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('pl');});
  if(on){const ids=mode==='slow'?['tip-slow','tone-slow']:['tip-audio','tip-natural','tone-natural'];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('pl');});}
}
function playUrl(url){return new Promise((res,rej)=>{const a=new Audio(url);curAudio=a;a.preload='auto';const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;rej(new Error('to'));},6500);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
async function fetchJson(url,ms=5200){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)throw new Error('http '+r.status);return await r.json();}finally{clearTimeout(t);}}
function isAudioTitle(t){return /\.(ogg|oga|mp3|wav|webm)$/i.test(String(t||''));}
function normalizeAudioUrl(u){if(!u)return'';u=String(u);if(u.startsWith('//'))return 'https:'+u;return u;}
function flatPages(data){const p=data&&data.query&&data.query.pages;if(!p)return[];return Array.isArray(p)?p:Object.values(p);}
async function imageInfoUrls(api,titles){
  titles=[...new Set((titles||[]).filter(isAudioTitle))].slice(0,12);
  if(!titles.length)return[];
  const url=api+'?origin=*&action=query&format=json&prop=imageinfo&iiprop=url|mime|mediatype&titles='+encodeURIComponent(titles.join('|'));
  const data=await fetchJson(url,5200);
  const urls=[];
  for(const page of flatPages(data)){
    const info=page.imageinfo&&page.imageinfo[0];
    const u=normalizeAudioUrl(info&&info.url);
    const mime=(info&&info.mime)||'';
    if(u&&(/audio|ogg|mpeg|wav|webm/i.test(mime)||isAudioTitle(u)))urls.push(u);
  }
  return [...new Set(urls)];
}
async function wiktionaryAudioUrls(word){
  const key='wikt:'+word;if(naturalAudioCache.has(key))return naturalAudioCache.get(key);
  let urls=[];
  try{
    const api='https://en.wiktionary.org/w/api.php';
    const data=await fetchJson(api+'?origin=*&action=query&format=json&prop=images&imlimit=max&titles='+encodeURIComponent(word),5200);
    const titles=[];
    for(const page of flatPages(data)){for(const img of page.images||[]){if(isAudioTitle(img.title))titles.push(img.title);}}
    urls=await imageInfoUrls(api,titles);
  }catch{}
  naturalAudioCache.set(key,urls);
  return urls;
}
async function commonsAudioUrls(word){
  const key='commons:'+word;if(naturalAudioCache.has(key))return naturalAudioCache.get(key);
  let urls=[];
  try{
    const api='https://commons.wikimedia.org/w/api.php';
    const q=`${word} Mandarin Chinese pronunciation`;
    const data=await fetchJson(api+'?origin=*&action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|mediatype&gsrsearch='+encodeURIComponent(q),5600);
    const scored=[];
    for(const page of flatPages(data)){
      const title=page.title||'';const info=page.imageinfo&&page.imageinfo[0];const u=normalizeAudioUrl(info&&info.url);
      if(!u||!isAudioTitle(u))continue;
      let score=0;const low=title.toLowerCase();
      if(title.includes(word))score+=5;if(/mandarin|chinese|cmn|zh|putonghua|lingua libre|pronunciation/i.test(low))score+=3;
      scored.push({u,score});
    }
    urls=scored.sort((a,b)=>b.score-a.score).map(x=>x.u);
  }catch{}
  urls=[...new Set(urls)];
  naturalAudioCache.set(key,urls);
  return urls;
}
async function playNaturalDirect(word){
  for(const src of NATURAL_AUDIO_DIRECT){try{await playUrl(src.url(word));return true;}catch{}}
  return false;
}
async function playNaturalDiscovered(word){
  for(const getUrls of [wiktionaryAudioUrls,commonsAudioUrls]){
    const urls=await getUrls(word);
    for(const u of urls){try{await playUrl(u);return true;}catch{}}
  }
  return false;
}
async function playNaturalDb(word,{discover=true}={}){
  if(await playNaturalDirect(word))return true;
  if(discover&&await playNaturalDiscovered(word))return true;
  return false;
}
async function playCjkSequence(chars,pauseMs,{discover=false}={}){
  let ok=false;
  for(const ch of chars){
    if(!isCJK(ch))continue;
    const got=await playNaturalDb(ch,{discover});
    if(got)ok=true;
    await delay(pauseMs);
  }
  return ok;
}
async function speakWordMode(word,mode='natural'){
  stopAudio();
  setAudioBusy(mode,true);
  const cjk=[...word].filter(isCJK);
  try{
    if(!cjk.length)return;
    let ok=false;
    if(mode==='natural'){
      ok=await playNaturalDb(word,{discover:true});
      if(!ok)ok=await playCjkSequence(cjk,34,{discover:false});
    }else{
      ok=await playCjkSequence(cjk,105,{discover:false});
      if(!ok)ok=await playNaturalDb(word,{discover:true});
    }
    if(!ok)toast('Áudio natural não encontrado');
  }finally{setAudioBusy(mode,false);}
}
function speakWord(word){return speakWordMode(word,'natural');}

function positionTip(anchor){
  const tip=document.getElementById('tip');
  const arr=document.getElementById('tip-arr');
  if(!anchor){tip.style.left=Math.max(14,(window.innerWidth-316)/2)+'px';tip.style.top=Math.max(70,(window.innerHeight-360)/2)+'px';arr.style.display='none';return;}
  arr.style.display='';
  const rec=anchor.getBoundingClientRect();
  const vw=window.innerWidth,vh=window.innerHeight;
  const tw=Math.min(316,vw-28);tip.style.width=tw+'px';
  const cx=rec.left+rec.width/2;
  let left=cx-tw/2;left=Math.max(14,Math.min(left,vw-tw-14));
  const al=Math.max(10,Math.min(cx-left,tw-28));
  arr.style.left=al+'px';arr.style.transform='none';
  const th=tip.offsetHeight||290;
  const above=rec.top-16,below=vh-rec.bottom-16;
  let top;
  if(above>=th+8){top=rec.top-th-10;arr.className='tip-arr dn';}
  else if(below>=th+8){top=rec.bottom+10;arr.className='tip-arr up';}
  else{top=Math.max(60,Math.min(vh/2-th/2,vh-th-16));arr.style.display='none';}
  tip.style.left=left+'px';tip.style.top=top+'px';
}

let tipAnchor=null;
function showTip(anchor){
  tipAnchor=anchor;
  document.getElementById('tip').classList.add('open');
  document.getElementById('tip-ov').classList.add('open');
  requestAnimationFrame(()=>positionTip(anchor));
}
function hideTip(){
  document.getElementById('tip').classList.remove('open');
  document.getElementById('tip-ov').classList.remove('open');
  tipAnchor=null;
  stopAudio();
  setAudioBusy('natural',false);
}

function renderToneBox(info,word){
  const box=document.getElementById('tone-box');const body=document.getElementById('tone-body');const pill=document.getElementById('tone-pill');
  if(!box||!body)return;
  if(!info||!info.changed){box.classList.remove('vis','open');body.innerHTML='';return;}
  box.classList.add('vis');box.classList.remove('open');
  if(pill)pill.textContent=(info.changes&&info.changes.length?info.changes.length:1)+' regra';
  body.innerHTML=`<div class="tone-word">${esc(word)}</div>
    <div class="tone-line"><span class="tone-lbl">Original</span><span class="tone-py-old">${esc(info.oldPy||'')}</span></div>
    <div class="tone-line"><span class="tone-lbl">Natural</span><span class="tone-py-new">${esc(info.py||info.newPy||'')}</span></div>
    <div class="tone-reasons">${(info.changes||[]).map(x=>`• ${esc(x)}`).join('<br>')}</div>
    <div class="tone-actions"><button class="audbtn" id="tone-slow" type="button">Lento</button><button class="audbtn pri" id="tone-natural" type="button">Natural</button></div>`;
  const slow=document.getElementById('tone-slow');const nat=document.getElementById('tone-natural');
  if(slow)slow.addEventListener('click',e=>{e.stopPropagation();speakWordMode(defWord,'slow');});
  if(nat)nat.addEventListener('click',e=>{e.stopPropagation();speakWordMode(defWord,'natural');});
}
function setTipWord(word,py,toneInfo){
  const tone=toneInfo||applyToneSandhi(word,py||getWordPY(word));
  defWord=word;defOriginalPy=tone.oldPy||py||'';defNaturalPy=tone.py||tone.newPy||py||'';defPy=defNaturalPy;defToneInfo=tone;
  const chars=[...word];const pys=(defNaturalPy||'').split(' ');
  const isM=chars.filter(isCJK).length>1;
  const hasTrad=chars.some(c=>V40_TRAD_TO_SIMP[c]);
  let html='';
  if(isM){chars.forEach((c,i)=>{if(isCJK(c)){const simp=V40_TRAD_TO_SIMP[c]||c;html+=`<span class="tip-ch" onclick="drillChar('${esc(simp)}','${esc(pys[i]||'')}')">${esc(simp)}</span>`;}else html+=esc(c);});}
  else html=esc(V40_TRAD_TO_SIMP[word]||word);
  if(hasTrad){
    const diffChars=chars.map(c=>V40_TRAD_TO_SIMP[c]?c:'-');
    html+=` <span class="trad-diff">(${esc(diffChars.join(''))})</span>`;
  }
  document.getElementById('tip-wd').innerHTML=html;
  document.getElementById('tip-py').textContent=defNaturalPy||py||'';
  renderToneBox(tone,word);
}

function tipLoading(){document.getElementById('tip-body').innerHTML='<div class="tip-none"><div class="spin sm" style="margin:0 auto"></div></div>';}

function renderTipDefs(result){
  const el=document.getElementById('tip-body');
  if(!result||!result.defs||!result.defs.length){el.innerHTML='<div class="tip-none">Sem definição</div>';return;}
  let html='';
  result.defs.slice(0,3).forEach(s=>{
    if(s.pos)html+=`<div class="tip-pos">${esc(s.pos)}</div>`;
    s.defs.slice(0,5).forEach((d,i)=>{
      html+=`<div class="tip-def"><span class="tip-num">${i+1}.</span>${esc(d.text)}`;
      if(d.ex&&d.ex[0])html+=`<div class="tip-ex">${esc(d.ex[0])}</div>`;
      html+='</div>';
    });
  });
  if(result.charDefs&&result.charDefs.length){
    html+=`<div class="tip-sec-title">Ideograma por ideograma</div><div class="tip-chardefs">`;
    html+=result.charDefs.map(c=>`<div class="tip-chardef"><span class="tip-chardef-ch">${esc(c.ch)}</span><span class="tip-chardef-def">${c.text?esc(c.text):'—'}</span></div>`).join('');
    html+=`</div>`;
  }
  if(result.sogou&&result.sogou.length){
    html+=`<div class="tip-sec-title">Termos relacionados</div><div class="tip-sogou">`;
    html+=result.sogou.slice(0,6).map(s=>`<span class="tip-sogou-chip">${esc(s.word)}${s.hint?' — '+esc(s.hint):''}</span>`).join('');
    html+=`</div>`;
  }
  if(result.tatoeba&&result.tatoeba.length){
    html+=`<div class="tip-sec-title">Frases de exemplo</div><div class="tip-tatoeba">`;
    html+=result.tatoeba.slice(0,3).map(ex=>`<div class="tip-ex-card"><div class="tip-ex-zh">${esc(ex.text)}</div>${ex.translations&&ex.translations.length?`<div class="tip-ex-tr">${esc(ex.translations[0])}</div>`:''}</div>`).join('');
    html+=`</div>`;
  }
  if(result.src)html+=`<div class="tip-src">${esc(result.src)}</div>`;
  el.innerHTML=html;
}

async function onTap(el){
  try{const activeSel=(window.getSelection()?.toString()||'').trim();if(activeSel)return;}catch{}
  const tid=parseInt(el.dataset.tid);
  const tok=readerTokens[tid];
  if(!tok)return;
  const initialWord=tok.word||tok.char;
  setTipWord(initialWord,tok.naturalPy||tok.py||getWordPY(initialWord),tok.toneInfo);tipLoading();showTip(el);defDefs=null;
  let result=await lookupAll(initialWord);
  if(!result&&initialWord.length===1){
    const nb=await tryNearby(tid);
    if(nb&&nb.word&&nb.word.length>1){setTipWord(nb.word,nb.py,applyToneSandhi(nb.word,nb.py));result={defs:nb.defs,src:nb.src};}
  }
  if(!result&&initialWord.length>1){
    const nb=await tryNearby(tid);
    if(nb&&nb.word&&nb.word.length>1){setTipWord(nb.word,nb.py,applyToneSandhi(nb.word,nb.py));result={defs:nb.defs,src:nb.src};}
  }
  if(!result&&initialWord.length===1){
    result=await lookupAll(tok.char);
    setTipWord(tok.char,tok.py?tok.py.split(' ')[0]||'':getWordPY(tok.char),applyToneSandhi(tok.char,tok.py?tok.py.split(' ')[0]||'':getWordPY(tok.char)));
  }
  defDefs=result;
  renderTipDefs(result);
  requestAnimationFrame(()=>positionTip(el));
}

async function drillChar(ch,py){
  if(!py)py=getWordPY(ch);
  setTipWord(ch,py);tipLoading();
  defDefs=await lookupAll(ch);
  renderTipDefs(defDefs);
}

let selTxt='',selRaw='',selTimer=null;
function v37ClosestCi(node){
  while(node&&node.nodeType!==1)node=node.parentNode;
  while(node&&node!==document){
    if(node.dataset&&node.dataset.ci!=null){
      const start=parseInt(node.dataset.ci,10);
      const len=parseInt(node.dataset.cilen||'1',10);
      if(!Number.isNaN(start))return{start,len};
    }
    node=node.parentNode;
  }
  return null;
}
function v37RawSelectionSlice(sel){
  try{
    const raw=window.__rtextRaw;
    if(!raw||!sel||sel.rangeCount===0)return'';
    const root=document.getElementById('rtext');
    if(!root)return'';
    const range=sel.getRangeAt(0);
    if(!root.contains(range.commonAncestorContainer))return'';
    const startInfo=v37ClosestCi(range.startContainer);
    const endInfo=v37ClosestCi(range.endContainer);
    if(!startInfo||!endInfo)return'';
    let a=startInfo.start,b=endInfo.start+endInfo.len;
    if(b<a){const t=a;a=endInfo.start;b=t+startInfo.len;}
    if(b<=a)return'';
    return raw.slice(a,b);
  }catch(e){return'';}
}
let selCaptureScheduled=false;
document.addEventListener('selectionchange',()=>{
  if(!document.getElementById('sr').classList.contains('active'))return;
  if(selCaptureScheduled)return;
  selCaptureScheduled=true;
  requestAnimationFrame(()=>{
    selCaptureScheduled=false;
    const sel=window.getSelection();
    const domTxt=(sel?sel.toString():'').trim();
    const ok=domTxt.length>0&&[...domTxt].some(isCJK);
    if(ok){
      const raw=v37RawSelectionSlice(sel);
      selRaw=raw||domTxt;
      selTxt=domTxt;
    }else{selRaw='';selTxt='';}
    // Só a parte visual (mostrar/esconder ícones) continua com um pequeno atraso,
    // pra não ficar piscando enquanto o usuário ainda está arrastando a seleção.
    clearTimeout(selTimer);
    selTimer=setTimeout(()=>{
      document.getElementById('mini-dock-flag')?.classList.toggle('show',ok);
      const cjkCount=ok?[...(selRaw||selTxt)].filter(isCJK).length:0;
      const transBtn=document.getElementById('sel-translate');
      if(transBtn)transBtn.style.display=cjkCount>=2?'inline-flex':'none';
    },150);
  });
});
function v37PrepareForSpeech(text){
  try{text=v40ToSimplified(text);}catch{}
  // Uma quebra de linha só deve virar uma pausa de bloco quando ela realmente
  // fecha uma frase (depois de pontuação terminal). Quebras "soltas" — comuns
  // em texto extraído da web, onde uma frase única fica dividida em várias
  // linhas — viram espaço, senão cada linha vira um bloco com pausa própria
  // e a leitura fica cortada em vários pedaços em vez de fluir contínua.
  return String(text||'')
    .replace(/([^。！？!?\n])\n+/g,'$1 ')
    .replace(/\n{2,}/g,'\n')
    .replace(/[ \t]{2,}/g,' ');
}
async function v37DoRead(text){
  text=v37PrepareForSpeech(text);
  const btn=document.getElementById('sel-read');
  const original=btn.innerHTML;
  btn.disabled=true;btn.innerHTML='<span class="spin sm" style="width:14px;height:14px;border-width:2px"></span> Lendo…';
  try{
    if(typeof window.v36Speak==='function')await window.v36Speak(text,'sentence');
    else if(typeof speakWordMode==='function')await speakWordMode(text,'natural');
  }catch(e){try{toast('Falha ao ler: '+(e.message||e));}catch{}}
  finally{btn.disabled=false;btn.innerHTML=original;}
}
let selReadHandled=false;
function v37TriggerRead(e){
  if(selReadHandled)return;
  selReadHandled=true;
  setTimeout(()=>{selReadHandled=false;},700);
  if(e&&e.cancelable){try{e.preventDefault();}catch{}}
  try{
    const liveSel=window.getSelection();
    const liveTxt=(liveSel?liveSel.toString():'').trim();
    if(liveTxt&&[...liveTxt].some(isCJK)){
      const raw=v37RawSelectionSlice(liveSel);
      selRaw=raw||liveTxt;
      selTxt=liveTxt;
    }
  }catch{}
  const text=selRaw||selTxt;
  if(!text){try{toast('Selecione um trecho de texto para ler');}catch{}return;}
  Promise.resolve().then(()=>v37DoRead(text)).catch(err=>{try{toast('Erro ao ler: '+(err&&err.message||err));}catch{}});
}
document.addEventListener('touchstart',e=>{const b=e.target.closest&&e.target.closest('#sel-read');if(b)v37TriggerRead(e);},{passive:false,capture:true});
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;const b=e.target.closest&&e.target.closest('#sel-read');if(b)v37TriggerRead(e);},true);
document.addEventListener('mousedown',e=>{if(window.PointerEvent)return;const b=e.target.closest&&e.target.closest('#sel-read');if(b)v37TriggerRead(e);},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#sel-read');if(b){e.preventDefault();v37TriggerRead(e);}},true);

async function v37ShowTranslate(text){
  try{text=v40ToSimplified(text);}catch{}
  const chars=[...text].filter(isCJK);
  if(chars.length<2)return;
  const scroll=document.getElementById('translate-scroll');
  if(!scroll)return;
  scroll.innerHTML='<div class="style-sub" style="padding:14px 0">Traduzindo...</div>';
  document.getElementById('mo-translate').classList.add('open');
  const phrase=chars.join('');
  let combined=null;
  try{ combined=await lookupGT(phrase); }catch{}
  const combinedText=combined?.defs?.[0]?.defs?.[0]?.text;
  const phrasePy=(typeof getWordPY==='function'?getWordPY(phrase):'')||'';
  let words=[];
  try{ words=segmentChineseRun(phrase).filter(w=>[...w].some(isCJK)); }catch{ words=chars; }
  if(!words.length)words=chars;
  let html=`<div class="style-row" style="flex-direction:column;align-items:flex-start;gap:5px">
    <div class="style-lbl" style="font-size:22px">${esc(phrase)}</div>
    ${phrasePy?`<div class="style-sub" style="color:var(--ac);font-family:var(--pyf);font-weight:700">${esc(phrasePy)}</div>`:''}
    <div class="style-sub">${combinedText?esc(combinedText):'Tradução indisponível para o trecho completo.'}</div>
  </div>`;
  html+=`<div class="h36-section" style="margin-top:14px">Palavra por palavra</div>`;
  html+=`<div id="v37-trans-words"></div>`;
  html+=`<div class="style-sub" style="margin-top:10px;opacity:.6">Tradução automática via Google Translate.</div>`;
  scroll.innerHTML=html;
  const wordsContainer=document.getElementById('v37-trans-words');
  wordsContainer.innerHTML=words.map((w,i)=>`<div class="lexi-acc-row" data-acc-idx="${i}" style="padding:11px 0"><div class="lexi-acc-row-label" style="font-size:17px" id="v37-word-def-${i}">${esc(w)} <span style="color:#8a8170">•</span> <span class="spin sm" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle"></span></div><svg class="lexi-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="lexi-acc-panel" id="v37-panel-${i}"></div>`).join('');
  const wordResults=new Array(words.length);
  await Promise.all(words.map(async(w,i)=>{
    let r=null;
    try{ r=await lookupAll(w); }catch{}
    wordResults[i]=r;
    const label=document.getElementById(`v37-word-def-${i}`);
    if(!label)return;
    const firstDef=r?.defs?.[0]?.defs?.[0]?.text;
    label.innerHTML=`${esc(w)} <span style="color:#8a8170">•</span> ${firstDef?v39TransButton(firstDef):'<span style="color:#665f54">sem definição</span>'}`;
    v39BindTransButtons(label);
  }));
  wordsContainer.querySelectorAll('[data-acc-idx]').forEach(row=>{
    row.onclick=(e)=>{
      if(e.target.closest('button'))return;
      const idx=parseInt(row.dataset.accIdx);
      const panel=document.getElementById(`v37-panel-${idx}`);
      if(!panel)return;
      const wasOpen=row.classList.contains('open');
      wordsContainer.querySelectorAll('.lexi-acc-row.open').forEach(r=>r.classList.remove('open'));
      wordsContainer.querySelectorAll('.lexi-acc-panel.open').forEach(p=>p.classList.remove('open'));
      if(wasOpen)return;
      row.classList.add('open');panel.classList.add('open');
      if(!panel.dataset.loaded){
        panel.innerHTML=v41TranslateWordExpandHtml(words[idx],wordResults[idx]);
        v39BindTransButtons(panel);
        v41BindSaveSentenceButtons(panel);
        panel.querySelectorAll('[data-sent-play]').forEach(btn=>{
          btn.onclick=async(e)=>{
            e.stopPropagation();
            if(btn.disabled)return;
            const t=btn.dataset.sentPlay;
            const orig=btn.innerHTML;
            btn.disabled=true;btn.innerHTML='<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';
            try{ if(typeof window.v36Speak==='function')await window.v36Speak(t,'sentence'); else await speakWordMode(t,'natural'); }catch{}
            finally{btn.disabled=false;btn.innerHTML=orig;}
          };
        });
        panel.dataset.loaded='1';
      }
    };
  });
}
let selTranslateHandled=false;
function v37TriggerTranslate(e){
  if(selTranslateHandled)return;
  selTranslateHandled=true;
  setTimeout(()=>{selTranslateHandled=false;},700);
  if(e&&e.cancelable){try{e.preventDefault();}catch{}}
  let text='';
  try{
    const liveSel=window.getSelection();
    const liveTxt=(liveSel?liveSel.toString():'').trim();
    if(liveTxt&&[...liveTxt].some(isCJK)){
      const raw=v37RawSelectionSlice(liveSel);
      text=raw||liveTxt;
    }
  }catch{}
  if(!text)text=selRaw||selTxt;
  if(!text){try{toast('Selecione um trecho com pelo menos 2 ideogramas');}catch{}return;}
  try{window.getSelection().removeAllRanges();}catch{}
  v37ShowTranslate(text).catch(err=>{try{toast('Erro ao traduzir: '+(err&&err.message||err));}catch{}});
}
document.addEventListener('touchstart',e=>{const b=e.target.closest&&e.target.closest('#sel-translate');if(b)v37TriggerTranslate(e);},{passive:false,capture:true});
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;const b=e.target.closest&&e.target.closest('#sel-translate');if(b)v37TriggerTranslate(e);},true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#sel-translate');if(b){e.preventDefault();v37TriggerTranslate(e);}},true);


async function saveWord(word,py,result){
  const defText=result&&result.defs&&result.defs.length?result.defs[0].defs.slice(0,4).map((d,i)=>`${i+1}. ${d.text}`).join('\n'):'';
  const type=[...word].filter(isCJK).length>1?'phrase':'word';
  await dbPut(STW,{id:Date.now().toString(36)+Math.random().toString(36).slice(2),word,pinyin:py,definition:defText,type,savedAt:Date.now(),bookTitle:curBook?curBook.title:''});
  words=await dbAll(STW);
  toast(`"${word}" salvo!`);
}
// Frases curtas (até 7 ideogramas) podem ser salvas num baralho próprio,
// guardando a palavra de origem que levou o usuário a encontrar aquela frase
// — assim ele consegue reconectar a frase com uma palavra que já conhece.
async function saveSentence(sentenceText,translations,originWord){
  await dbPut(STW,{
    id:Date.now().toString(36)+Math.random().toString(36).slice(2),
    word:sentenceText,
    type:'sentence',
    deckType:'sentence',
    originWord:originWord||'',
    translation:(translations&&translations[0])||'',
    savedAt:Date.now()
  });
  words=await dbAll(STW);
  toast('Frase salva!');
}
function v41RenderSentenceWithHighlight(text,originWord){
  if(!originWord)return esc(text);
  const idx=text.indexOf(originWord);
  if(idx<0)return esc(text);
  const before=text.slice(0,idx),match=text.slice(idx,idx+originWord.length),after=text.slice(idx+originWord.length);
  return `${esc(before)}<span class="sent-origin-hl">${esc(match)}</span>${esc(after)}`;
}
function v41SaveSentenceButtonHtml(sentenceText,translations,originWord){
  const cjkLen=[...sentenceText].filter(isCJK).length;
  if(cjkLen>7||cjkLen<1)return'';
  return`<button class="v41-save-sent-btn" data-sent-text="${esc(sentenceText)}" data-sent-tr="${esc((translations&&translations[0])||'')}" data-sent-origin="${esc(originWord||'')}" title="Salvar frase"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></button>`;
}
function v41BindSaveSentenceButtons(root){
  (root||document).querySelectorAll('.v41-save-sent-btn').forEach(btn=>{
    if(btn._v41bound)return;btn._v41bound=true;
    btn.onclick=async(e)=>{
      e.stopPropagation();
      if(btn.disabled)return;
      btn.disabled=true;
      try{
        await saveSentence(btn.dataset.sentText,[btn.dataset.sentTr].filter(Boolean),btn.dataset.sentOrigin);
        btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>';
      }catch(err){btn.disabled=false;try{toast('Falha ao salvar: '+(err.message||err));}catch{}}
    };
  });
}

async function h36WeeklyConsolidate(force){
  const last=parseInt(localStorage.getItem('h36LastWeeklyCleanup')||'0');
  if(!force&&Date.now()-last<7*86400000)return false;
  const all=await dbAll(STW);
  const groups=new Map();
  for(const w of all){
    if(w.mergedInto)continue;
    const key=(w.wordKey||w.word)+'|'+(w.type||'word');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(w);
  }
  let changed=false;
  for(const arr of groups.values()){
    if(arr.length<=1)continue;
    arr.sort((a,b)=>a.savedAt-b.savedAt);
    const primary=arr[0];
    let totalOcc=0;const defsSet=new Set();let latestUpdated=primary.updatedAt||primary.savedAt;
    for(const w of arr){
      totalOcc+=(w.occurrences||1);
      if(w.definition)defsSet.add(w.definition);
      const u=w.updatedAt||w.savedAt;if(u>latestUpdated)latestUpdated=u;
    }
    primary.occurrences=totalOcc;
    primary.updatedAt=latestUpdated;
    if(!primary.definition&&defsSet.size)primary.definition=[...defsSet][0];
    await dbPut(STW,primary);
    for(let i=1;i<arr.length;i++){arr[i].mergedInto=primary.id;await dbPut(STW,arr[i]);}
    changed=true;
  }
  localStorage.setItem('h36LastWeeklyCleanup',String(Date.now()));
  if(changed)words=await dbAll(STW);
  return changed;
}
async function loadWords(){await h36WeeklyConsolidate(false);words=await dbAll(STW);words.sort((a,b)=>b.savedAt-a.savedAt);renderWords();}
function renderWords(){
  const wc=document.getElementById('wc');const em=document.getElementById('wempty');
  if(!words.length){wc.innerHTML='';wc.appendChild(em);em.style.display='flex';return;}
  em.style.display='none';wc.innerHTML='';
  words.forEach(w=>{
    const el=document.createElement('div');el.className='wcard';
    el.innerHTML=`<div class="ww">${esc(w.word)}</div><div class="wpy">${esc(w.pinyin||'')}</div>${w.definition?`<div class="wdf">${esc(w.definition)}</div>`:'<div class="wdf" style="color:#8a8a8a">Sem definição</div>'}<div><span class="wtag">${w.type==='phrase'?'frase':'palavra'}</span>${w.bookTitle?`<span class="wtag" style="margin-left:4px">${esc(w.bookTitle)}</span>`:''}</div>`;
    el.addEventListener('click',()=>showWordDef(w));
    addLP(el,()=>confirmDelWord(w.id));
    wc.appendChild(el);
  });
}
async function showWordDef(w){
  setTipWord(w.word,w.pinyin||'');tipLoading();
  showTip(null);
  if(w.definition){defDefs={defs:[{pos:'',defs:w.definition.split('\n').map(l=>({text:l.replace(/^\d+\.\s*/,''),ex:[]}))}],src:''};renderTipDefs(defDefs);}
  else{defDefs=await lookupAll(w.word);renderTipDefs(defDefs);}
}
async function confirmDelWord(id){if(confirm('Remover esta palavra?')){await dbDel(STW,id);await loadWords();toast('Removido');}}
function addLP(el,fn){let t;el.addEventListener('touchstart',()=>{t=setTimeout(fn,700);},{passive:true});el.addEventListener('touchend',()=>clearTimeout(t));el.addEventListener('touchmove',()=>clearTimeout(t),{passive:true});}

async function loadLib(){books=await dbAll(STB);books.sort((a,b)=>(b.lastRead||b.addedAt)-(a.lastRead||a.addedAt));renderLib();}
function renderLib(){
  const bc=document.getElementById('bc'),em=document.getElementById('empty');
  const q=searchQ.toLowerCase();
  const list=q?books.filter(b=>b.title.toLowerCase().includes(q)||b.source.toLowerCase().includes(q)):books;
  if(!list.length){bc.innerHTML='';bc.appendChild(em);em.style.display='flex';return;}
  em.style.display='none';bc.innerHTML='';
  list.forEach(b=>{
    const pct=Math.round((b.progress||0)*100);
    const el=document.createElement('div');el.className='card';
    el.innerHTML=`<div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${v29Svg('bookClosed')}</svg></div><div class="bi"><div class="bt">${esc(b.title)}</div><div class="bs">${esc(b.source)}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;
    el.addEventListener('click',()=>openBook(b.id));
    addLP(el,()=>confirmDelBook(b.id));
    bc.appendChild(el);
  });
}
async function confirmDelBook(id){if(confirm('Remover este livro?')){await dbDel(STB,id);await loadLib();toast('Removido');}}

async function openBook(id){
  curBook=books.find(b=>b.id===id);if(!curBook)return;
  showScreen('sr');
  document.getElementById('rsrc').textContent=curBook.source;
  document.getElementById('rpct').textContent=Math.round((curBook.progress||0)*100)+'%';
  document.getElementById('rtext').innerHTML='';
  try{
    if(curBook.type==='pdf-scanned'){
      showLoad('Renderizando páginas...');
      const lib=await ensurePDFLib();
      const pdfObj=await lib.getDocument({data:b642buf(curBook.pdfData)}).promise;
      await renderPDFPages(pdfObj);
    }else{
      showLoad('Aguardando pinyin...');
      await waitPinyin();
      showLoad('Processando texto...');
      await frame();
      document.getElementById('rtext').innerHTML=buildHTML(curBook.content||'');
      applyPinyin();
    }
  }catch(e){toast('Erro: '+e.message);}
  finally{hideLoad();}
  await frame();
  const rs=document.getElementById('rscroll');
  const maxS=rs.scrollHeight-rs.clientHeight;
  rs.scrollTop=(curBook.progress||0)*maxS;
  rs.onscroll=()=>{
    const max=rs.scrollHeight-rs.clientHeight;if(max<=0)return;
    const pct=rs.scrollTop/max;
    document.getElementById('rpct').textContent=Math.round(pct*100)+'%';
    clearTimeout(rs._st);rs._st=setTimeout(async()=>{
      curBook.progress=pct;curBook.lastRead=Date.now();
      curBook.charsRead=Math.floor(pct*(curBook.content||'').length);
      await dbPut(STB,curBook);
    },500);
  };
  curBook.lastRead=Date.now();await dbPut(STB,curBook);
}
let HZ_PDF_LIB_PROMISE=null;
function getPDFLib(){
  const l=window.pdfjsLib||window['pdfjs-dist/build/pdf'];
  if(l)l.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return l;
}
function ensurePDFLib(){
  const ready=getPDFLib();
  if(ready)return Promise.resolve(ready);
  if(HZ_PDF_LIB_PROMISE)return HZ_PDF_LIB_PROMISE;
  HZ_PDF_LIB_PROMISE=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-hz-pdfjs]');
    const script=existing||document.createElement('script');
    let settled=false;
    const finish=(err)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      const lib=getPDFLib();
      if(!err&&lib)resolve(lib);
      else{HZ_PDF_LIB_PROMISE=null;reject(err||new Error('PDF.js não ficou disponível'));}
    };
    script.addEventListener('load',()=>finish(),{once:true});
    script.addEventListener('error',()=>finish(new Error('Não foi possível carregar o leitor de PDF. Verifique a conexão.')),{once:true});
    const timer=setTimeout(()=>finish(new Error('Tempo esgotado ao carregar o leitor de PDF.')),15000);
    if(!existing){
      script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async=true;script.crossOrigin='anonymous';script.dataset.hzPdfjs='1';
      document.head.appendChild(script);
    }
  });
  return HZ_PDF_LIB_PROMISE;
}
async function renderPDFPages(pdfObj){
  const wrap=document.createElement('div');wrap.className='pdf-viewer';
  const old=document.getElementById('rtext');old.parentNode.replaceChild(wrap,old);wrap.id='rtext';
  for(let p=1;p<=pdfObj.numPages;p++){
    const page=await pdfObj.getPage(p);const vp=page.getViewport({scale:2});
    const cv=document.createElement('canvas');cv.className='pdf-canvas';const ctx=cv.getContext('2d');
    cv.width=vp.width;cv.height=vp.height;await page.render({canvasContext:ctx,viewport:vp}).promise;wrap.appendChild(cv);
  }
}

function isCJKText(t){return[...t].some(isCJK);}
function cleanRaw(raw){
  if(!raw)return'';
  const lines=raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map(l=>l.trim());
  const out=[];let lb=false;
  for(let l of lines){
    if(!l){if(!lb&&out.length){out.push('');lb=true;}continue;}
    if(/^https?:\/\//i.test(l))continue;
    // Remove sintaxe de markdown que vaza de conteúdo "markdown-ificado" (sites
    // que servem a página já convertida): imagens ![alt](url), links [texto](url)
    // — mantém só o texto visível, descarta a URL. Um link/imagem MAL FECHADO
    // (parêntese sem fechar, comum quando a URL é cortada no meio) também é
    // removido, já que não sobra texto útil ali.
    l=l.replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
       .replace(/\[([^\]\n]{1,150})\]\([^)]*\)/g,'$1')
       .replace(/!\[[^\]]*\]\([^)]*$/,' ')
       .replace(/\[[^\]\n]{0,150}\]\($/,' ')
       .trim();
    if(!l)continue;
    if(l.length<3&&!isCJKText(l))continue;
    out.push(l);lb=false;
  }
  while(out.length&&!out[out.length-1])out.pop();
  return v40NormalizeText(out.join('\n').replace(/\n{3,}/g,'\n\n').trim());
}
function extractBody(doc){
  const sels=['article','main','[role="main"]','.article-content','.post-content','.entry-content','.article-body','.novel-content','.read-content','.chapter-content','.content','#content','#main','.chapter','#chapter','.text','.story'];
  for(const s of sels){try{const el=doc.querySelector(s);if(el){const t=el.textContent||'';if([...t].filter(isCJK).length>80)return t;}}catch{}}
  let best=doc.body,bs=0;
  doc.querySelectorAll('div,section,article,p,td').forEach(el=>{
    const t=el.textContent||'';const tot=t.trim().length;if(tot<50)return;
    const cjk=[...t].filter(isCJK).length;const sc=cjk*(cjk/tot);
    if(sc>bs){bs=sc;best=el;}
  });
  return(best||doc.body).textContent||'';
}
function cleanHTML(html){
  let doc;try{doc=new DOMParser().parseFromString(html,'text/html');}catch{return cleanRaw(html);}
  doc.querySelectorAll('script,style,noscript,iframe,img,video,audio,form,head,meta,link').forEach(e=>e.remove());
  return cleanRaw(extractBody(doc));
}
async function fetchText(url){
  const proxies=[
    u=>`https://r.jina.ai/${u}`,
    u=>`https://corsproxy.io/?${encodeURIComponent(u)}`,
    u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];
  let lastErr;
  for(let i=0;i<proxies.length;i++){
    try{
      const res=await fetch(proxies[i](url),{signal:AbortSignal.timeout(22000)});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const raw=await res.text();
      let text;
      if(i===0){
        text=raw.replace(/^---[\s\S]*?---\n/m,'').replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gm,'').replace(/```[\s\S]*?```/g,'').replace(/`[^`\n]+`/g,m=>m.slice(1,-1)).replace(/^#{1,6}\s+/gm,'').replace(/!\[[^\]]*\]\([^)]+\)/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*{1,3}([^*\n]+)\*{1,3}/g,'$1').replace(/_{1,2}([^_\n]+)_{1,2}/g,'$1').replace(/^\s*[-*+]\s+/gm,'').replace(/^\s*\d+\.\s+/gm,'').replace(/^\s*>\s*/gm,'').replace(/\|[^\n]+\|/g,'');
        text=cleanRaw(text);
      }else{
        const t=raw.trim();
        text=(t.startsWith('<')||t.includes('</html>'))?cleanHTML(raw):cleanRaw(raw);
      }
      if(!text||text.length<20)throw new Error('texto insuficiente');
      return text;
    }catch(e){lastErr=e;}
  }
  throw lastErr||new Error('falha ao buscar URL');
}

async function saveBook(data){
  await dbPut(STB,{id:Date.now().toString(36)+Math.random().toString(36).slice(2),title:data.title,source:data.source,content:data.content||'',type:data.type,pdfData:data.pdfData||null,progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});
}
// Textos "de livro" (várias páginas de conteúdo) são grandes demais pra fazer
// sentido como leitura simples — a partir desse tamanho, o mesmo botão de
// importar já manda direto pra Livros, sem o usuário precisar escolher a aba certa.
const V37_BOOK_LENGTH_THRESHOLD=12000;
async function v37AutoSaveText(title,source,content,type){
  if(content.length>=V37_BOOK_LENGTH_THRESHOLD){
    const book={id:v29NewId(),kind:'book',title,source,cover:'',synopsis:'',chapters:[{id:v29NewId(),num:1,title:'Texto completo',content,progress:0,addedAt:Date.now()}],lastRead:null,addedAt:Date.now(),lastChapterIndex:0};
    await dbPut(STB,book);
    return{kind:'book'};
  }
  await saveBook({title,source,content,type});
  return{kind:'simple'};
}

async function importURL(url){
  showLoad('Extraindo texto...');
  try{
    const text=await fetchText(url);
    const host=(()=>{try{return new URL(url).hostname;}catch{return url;}})();
    const lines=text.split('\n').filter(l=>l.trim());
    const title=lines[0]&&lines[0].length<80?lines[0]:host;
    await saveBook({title,source:host,content:text,type:'url'});
    closeModals();toast('Importado!');await loadLib();
  }catch(e){toast('Erro: '+e.message);}
  finally{hideLoad();}
}
async function importTxt(file){
  showLoad('Lendo arquivo...');
  try{
    let text=await readFile(file,'UTF-8');
    if(!isCJKText(text)){try{const buf=await readFile(file);const gbk=new TextDecoder('gbk').decode(buf);if(isCJKText(gbk))text=gbk;}catch{}}
    const clean=cleanRaw(text);
    if(!clean)throw new Error('nenhum texto encontrado');
    const r=await v37AutoSaveText(file.name.replace(/\.[^.]+$/,''),file.name,clean,'txt');
    closeModals();toast(r.kind==='book'?'Arquivo longo — adicionado aos Livros!':'Arquivo importado!');await loadLib();
  }catch(e){toast('Erro: '+e.message);}
  finally{hideLoad();}
}
async function importPDF(file){
  showLoad('Processando PDF...');
  try{
    const buf=await readFile(file);
    const lib=await ensurePDFLib();
    const pdfObj=await lib.getDocument({data:buf.slice(0)}).promise;
    let full='';
    for(let p=1;p<=pdfObj.numPages;p++){const page=await pdfObj.getPage(p);const c=await page.getTextContent();full+=c.items.map(i=>i.str).join('')+'\n';}
    const scanned=full.trim().length<50;
    const title=file.name.replace(/\.pdf$/i,'');
    if(scanned)await saveBook({title,source:file.name,content:'',type:'pdf-scanned',pdfData:buf2b64(buf)});
    else{const clean=cleanRaw(full);if(!clean)throw new Error('nenhum texto extraído');await saveBook({title,source:file.name,content:clean,type:'pdf'});}
    closeModals();toast('PDF importado!');await loadLib();
  }catch(e){toast('Erro PDF: '+e.message);}
  finally{hideLoad();}
}
async function importPaste(){
  const text=document.getElementById('paste-ta').value.trim();
  if(!text){toast('Caixa de texto vazia');return;}
  const clean=cleanRaw(text);
  if(!clean||!isCJKText(clean)){toast('Nenhum texto chinês encontrado');return;}
  const lines=clean.split('\n').filter(l=>l.trim());
  const title=lines[0]&&lines[0].length<80?lines[0]:'Texto colado';
  const r=await v37AutoSaveText(title,'Colado',clean,'txt');
  document.getElementById('paste-ta').value='';
  closeModals();toast(r.kind==='book'?'Texto longo — adicionado aos Livros!':'Texto importado!');await loadLib();
}

let hzScreenGeneration=0;
function showScreen(id){
  const next=document.getElementById(id);if(!next)return;
  const active=[...document.querySelectorAll('.screen.active')],previous=active[0]?.id||'';
  if(active.length===1&&active[0]===next){
    const generation=++hzScreenGeneration;
    requestAnimationFrame(()=>{if(generation===hzScreenGeneration&&next.classList.contains('active'))document.dispatchEvent(new CustomEvent('hz:screen-visible',{bubbles:true,detail:{id,previous:id,generation,refresh:true}}));});
    return;
  }
  active.forEach(screen=>{if(screen!==next)screen.classList.remove('active');});
  next.classList.add('active');document.documentElement.dataset.activeScreen=id;
  const generation=++hzScreenGeneration;
  document.dispatchEvent(new CustomEvent('hz:screen-change',{bubbles:true,detail:{id,previous,generation}}));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(generation!==hzScreenGeneration||!next.classList.contains('active'))return;
    document.dispatchEvent(new CustomEvent('hz:screen-visible',{bubbles:true,detail:{id,previous,generation}}));
  }));
}
function showModal(id){
  if(id!=='mo-music')window.hzMusicPlayer?.minimizeIfExpanded?.();
  document.querySelectorAll('.mo.open').forEach(modal=>modal.classList.remove('open'));
  const modal=document.getElementById(id);if(modal){modal.classList.add('open');modal.setAttribute('aria-hidden','false');}
}
function closeModals(){
  window.hzMusicPlayer?.minimizeIfExpanded?.();
  document.querySelectorAll('.mo.open').forEach(modal=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');});
}
function showLoad(msg){document.getElementById('ltxt').textContent=msg;document.getElementById('lo').classList.add('vis');}
function hideLoad(){document.getElementById('lo').classList.remove('vis');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);}
function updateStats(){const tc=books.reduce((a,b)=>a+(b.charsRead||0),0);document.getElementById('st-chars').textContent=tc>999?Math.floor(tc/1000)+'k':tc;document.getElementById('st-words').textContent=words.length;document.getElementById('st-books').textContent=books.length;document.getElementById('st-prog').textContent=curBook?Math.round((curBook.progress||0)*100)+'%':'—';}

const _bs=document.getElementById('bsearch');if(_bs)_bs.addEventListener('click',()=>{
  const sb=document.getElementById('sbar');sb.classList.toggle('vis');
  if(sb.classList.contains('vis'))document.getElementById('sin').focus();
  else{searchQ='';document.getElementById('sin').value='';renderLib();}
});
document.addEventListener('click',(e)=>{
  const toggle=e.target.closest('#v43-search-toggle');
  if(toggle){
    const wrap=document.getElementById('sbar');
    if(!wrap)return;
    const willOpen=!wrap.classList.contains('open');
    wrap.classList.toggle('open',willOpen);
    const input=document.getElementById('sin');
    if(willOpen)input.focus();
    else{searchQ='';input.value='';renderLib();}
  }
});
{const _sin=document.getElementById('sin');if(_sin)_sin.addEventListener('input',e=>{searchQ=e.target.value.trim();renderLib();});}
document.getElementById('badd').addEventListener('click',()=>showModal('mo-import'));
document.querySelectorAll('.mo').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals();}));
document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));
document.getElementById('ourl').addEventListener('click',()=>{const a=document.getElementById('url-area');a.classList.toggle('vis');if(a.classList.contains('vis'))setTimeout(()=>document.getElementById('url-in').focus(),300);});
document.getElementById('bfetch').addEventListener('click',()=>{const v=document.getElementById('url-in').value.trim();if(!v){toast('Digite uma URL');return;}importURL(v);});
document.getElementById('url-in').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('bfetch').click();});
document.getElementById('otxt').addEventListener('click',()=>document.getElementById('fi-txt').click());
document.getElementById('fi-txt').addEventListener('change',e=>{const f=e.target.files[0];if(f)importTxt(f);e.target.value='';});
document.getElementById('opdf').addEventListener('click',()=>document.getElementById('fi-pdf').click());
document.getElementById('fi-pdf').addEventListener('change',e=>{const f=e.target.files[0];if(f)importPDF(f);e.target.value='';});
document.getElementById('oclip').addEventListener('click',()=>{const a=document.getElementById('paste-area');a.classList.toggle('vis');if(a.classList.contains('vis'))setTimeout(()=>document.getElementById('paste-ta').focus(),200);});
document.getElementById('paste-ok').addEventListener('click',importPaste);

// Quando o usuário escolher importar de uma source local (Read Sources) a partir
// do modal de importação, fechamos o modal e abrimos a tela de Sources (sd).
// Isso permite que o usuário navegue pelos conteúdos locais disponíveis e
// importe diretamente para Leitura simples.  Este recurso foi restaurado
// comparando com index-2.2.html, em que os usuários podiam escolher diferentes
// tipos de importação.  Agora, Read Sources aparece ao lado das outras opções.
const _osrc = document.getElementById('osrc');
if (_osrc) {
  _osrc.addEventListener('click', () => {
    try { closeModals(); } catch {}
    try { showScreen('sd'); } catch {}
  });
}
document.getElementById('tip-x').addEventListener('click',hideTip);
document.getElementById('tip-ov').addEventListener('click',hideTip);
document.getElementById('tip-audio').addEventListener('click',()=>speakWordMode(defWord,'natural'));
document.getElementById('tip-natural').addEventListener('click',()=>speakWordMode(defWord,'natural'));
document.getElementById('tip-slow').addEventListener('click',()=>speakWordMode(defWord,'slow'));
document.getElementById('tone-head').addEventListener('click',()=>document.getElementById('tone-box').classList.toggle('open'));
document.getElementById('tip-save').addEventListener('click',async()=>{await saveWord(defWord,defPy,defDefs);hideTip();});
document.getElementById('bback').addEventListener('click',()=>{document.getElementById('mini-dock-flag')?.classList.remove('show');showScreen('sl');loadLib();});
document.getElementById('btn-stats').addEventListener('click',()=>{updateStats();showModal('mo-stats');});
document.getElementById('btn-rset').addEventListener('click',()=>{document.getElementById('sfs-val').textContent=fontSize;syncSettingControls();showModal('mo-style');});
document.getElementById('sfs-dec').addEventListener('click',()=>{if(fontSize>18){fontSize-=2;applyFontSize();saveSettings();}});
document.getElementById('sfs-inc').addEventListener('click',()=>{if(fontSize<64){fontSize+=2;applyFontSize();saveSettings();}});
document.getElementById('sty-py-row').addEventListener('click',()=>{showPinyin=!showPinyin;applyPinyin();saveSettings();});
document.getElementById('sty-lvl-row').addEventListener('click',()=>{pinyinLevelMode=!pinyinLevelMode;applyPinyin();saveSettings();});
document.getElementById('sty-hsk-min').addEventListener('change',e=>{pinyinMinLevel=parseInt(e.target.value||'2');applyPinyin();saveSettings();});
document.getElementById('fs-dec').addEventListener('click',()=>{if(fontSize>18){fontSize-=2;applyFontSize();saveSettings();}});
document.getElementById('fs-inc').addEventListener('click',()=>{if(fontSize<64){fontSize+=2;applyFontSize();saveSettings();}});
document.getElementById('tog-py').addEventListener('click',()=>{showPinyin=!showPinyin;applyPinyin();saveSettings();});
document.getElementById('tog-lvl-py').addEventListener('click',()=>{pinyinLevelMode=!pinyinLevelMode;applyPinyin();saveSettings();});
document.getElementById('hsk-min').addEventListener('change',e=>{pinyinMinLevel=parseInt(e.target.value||'2');applyPinyin();saveSettings();});
document.getElementById('btn-clear-words').addEventListener('click',async()=>{if(confirm('Limpar vocabulário?')){await dbClr(STW);await loadWords();toast('Vocabulário limpo');}});
function v40FormatBytes(n){if(n<1024)return n+' B';if(n<1024*1024)return(n/1024).toFixed(1)+' KB';return(n/1024/1024).toFixed(2)+' MB';}
function v40FriendlyStorageKeyLabel(key){
  if(key.startsWith('link-reader-cache:v6-clean:'))return'Página em cache (importação)';
  if(key==='h36Decks')return'Baralhos (metadados)';
  if(key==='h36ActiveDeck')return'Baralho ativo';
  if(key==='hbookView'||key==='hlibMode')return'Preferência de visualização';
  if(key.startsWith('h41VoiceSettings')||key.startsWith('v40VoiceSettings')||key.startsWith('v36tts:'))return'Configurações de voz';
  if(key==='h36FlashTab')return'Aba de Palavras selecionada';
  return key;
}
function v40RenderStorageManager(){
  const list=document.getElementById('storage-list');
  const sub=document.getElementById('storage-total-sub');
  if(!list||!sub)return;
  const entries=[];
  let total=0;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k)continue;
    const v=localStorage.getItem(k)||'';
    const bytes=(k.length+v.length)*2;
    total+=bytes;
    entries.push({key:k,bytes});
  }
  entries.sort((a,b)=>b.bytes-a.bytes);
  sub.textContent=`${entries.length} itens • ${v40FormatBytes(total)} no total`;
  if(!entries.length){list.innerHTML='<div class="dict-empty">Nenhum item armazenado.</div>';return;}
  list.innerHTML=entries.map((e,i)=>`<div class="srow" data-storage-row="${i}"><div style="min-width:0;flex:1"><div class="slbl" style="word-break:break-all">${esc(v40FriendlyStorageKeyLabel(e.key))}</div><div class="ssub">${esc(v40FormatBytes(e.bytes))}</div></div><button class="ib" data-storage-del="${esc(e.key)}" style="flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div>`).join('');
  list.querySelectorAll('[data-storage-del]').forEach(btn=>btn.onclick=()=>{
    try{localStorage.removeItem(btn.dataset.storageDel);}catch{}
    toast('Item removido');
    v40RenderStorageManager();
  });
}
document.getElementById('btn-manage-storage').addEventListener('click',()=>{showModal('mo-storage');v40RenderStorageManager();});
document.getElementById('v43-settings-back')?.addEventListener('click',()=>{
  showScreen('sl');
  document.querySelectorAll('.ni[data-tab]').forEach(n=>n.classList.remove('on'));
  document.querySelectorAll(`.ni[data-tab="sl"]`).forEach(n=>n.classList.add('on'));
  loadLib();
});
document.addEventListener('click',(e)=>{
  const btn=e.target.closest('#v43-music-entry');
  if(btn){window.hzOpenMusic?.();}
});
let v40AutoTransDefs=localStorage.getItem('h40AutoTransDefs')==='1';
function v40SyncAutoTransBtn(){const b=document.getElementById('tog-auto-trans-btn');if(b)b.classList.toggle('on',v40AutoTransDefs);}
document.getElementById('tog-auto-trans').addEventListener('click',()=>{v40AutoTransDefs=!v40AutoTransDefs;localStorage.setItem('h40AutoTransDefs',v40AutoTransDefs?'1':'0');v40SyncAutoTransBtn();});
v40SyncAutoTransBtn();
document.getElementById('btn-clear-all').addEventListener('click',async()=>{if(confirm('Apagar tudo?')){await dbClr(STB);await dbClr(STW);await loadLib();await loadWords();toast('Dados apagados');}});
document.getElementById('bwclear').addEventListener('click',async()=>{if(confirm('Limpar todas as palavras?')){await dbClr(STW);await loadWords();toast('Vocabulário limpo');}});
document.body.addEventListener('click',e=>{
  const btn=e.target.closest('[data-tab]');if(!btn)return;
  const tab=btn.dataset.tab;
  if(tab==='practice'){if(typeof hzOpenPractice==='function')hzOpenPractice();return;}
  if(tab==='profile'){if(typeof hzOpenProfile==='function')hzOpenProfile();return;}
  document.querySelectorAll('.ni[data-tab]').forEach(n=>n.classList.remove('on'));
  document.querySelectorAll(`.ni[data-tab="${tab}"]`).forEach(n=>n.classList.add('on'));
  showScreen(tab);
  if(tab==='sw')loadWords();
  if(tab==='sl')loadLib();
});

(async()=>{
  buildNav(document.getElementById('lib-nav'),'sl');
  buildNav(document.getElementById('words-nav'),'sw');
  buildNav(document.getElementById('disc-nav'),'sd');
  buildNav(document.getElementById('set-nav'),'ss');
  renderDiscover();loadSettings();
  await initDB();await loadLib();await loadWords();
})();


/* ===== inline-2 ===== */
let HZ_PINYIN_LIB_PROMISE=null;
let HZ_PINYIN_LIB_STATE='idle';
function installPinyinModule(m){
  if(!m||typeof m.pinyin!=='function')throw new Error('Módulo pinyin-pro inválido');
  window.pinyinFn=m.pinyin;
  window.pinyinSeg=m.segment||m.pinyin?.getSegment||m.getSegment||null;
  window.pinyinOutputFormat=m.OutputFormat||{};
  HZ_PINYIN_LIB_STATE='ready';
  document.dispatchEvent(new Event('pinyin-ready'));
  return true;
}
function ensurePinyinLib(){
  if(window.pinyinFn){HZ_PINYIN_LIB_STATE='ready';return Promise.resolve(true);}
  if(HZ_PINYIN_LIB_PROMISE)return HZ_PINYIN_LIB_PROMISE;
  HZ_PINYIN_LIB_STATE='loading';
  HZ_PINYIN_LIB_PROMISE=(async()=>{
    try{
      return installPinyinModule(await import('https://cdn.jsdelivr.net/npm/pinyin-pro@3/+esm'));
    }catch(firstError){
      try{
        return installPinyinModule(await import('https://unpkg.com/pinyin-pro@3/+esm'));
      }catch(secondError){
        HZ_PINYIN_LIB_STATE='failed';
        // Falha externa é esperada offline; o leitor segue com Intl.Segmenter e DB local.
        document.dispatchEvent(new Event('pinyin-settled'));
        return false;
      }
    }
  })();
  return HZ_PINYIN_LIB_PROMISE;
}
window.hzEnsurePinyinLib=ensurePinyinLib;
window.hzPinyinLibState=()=>HZ_PINYIN_LIB_STATE;


/* ===== v29-script ===== */
/* v2.9 Library refactor + dictionary overlay. Built as an enhancement layer over v2.8. */
let v29LibMode=localStorage.getItem('hlibMode')||'simple';
let v29BookView=localStorage.getItem('hbookView')||'cover';
let v29EditingBookId=null;
let v29ChapterDragId=null;
let v29DictTab='defs';
let v29DictTerm='';
let v29ImportContext='simple';
const V29_EXAMPLE_COVER='https://picsum.photos/320/480';
const V29_SOURCE_IMPORTS={
  'Du Chinese':{title:'Du Chinese',cover:'',synopsis:'Fonte graduada para leitura em mandarim.',chapters:[{title:'Página inicial',num:1,url:'https://duchinese.net'}]},
  'Mandarin Bean':{title:'Mandarin Bean',cover:'',synopsis:'Textos graduados com áudio.',chapters:[{title:'Página inicial',num:1,url:'https://mandarinbean.com'}]},
  'Heavenly Path':{title:'Heavenly Path',cover:'',synopsis:'Guia de leituras graduadas.',chapters:[{title:'Página inicial',num:1,url:'https://heavenlypath.info'}]}
};
const V29_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
function v29Svg(name){
 const icons={
  book:'<path d="M12 6.6C10 4.9 7 4.4 4 5.1v13.2c3-.7 6-.2 8 1.6 2-1.8 5-2.3 8-1.6V5.1c-3-.7-5.9-.2-8 1.5z"/><path d="M12 6.6v13.3"/><path d="M7 9.6c1.6-.25 3.2-.05 4.6.7M14.4 10.3c1.4-.75 3-.95 4.6-.7"/>',
  word:'<rect x="3" y="3.4" width="12.6" height="9.4" rx="2"/><rect x="5.7" y="6.4" width="12.6" height="9.4" rx="2" fill="var(--nb,#0d0d0d)"/><rect x="8.4" y="9.4" width="12.6" height="9.4" rx="2" fill="var(--nb,#0d0d0d)"/><path d="M11.4 14.1h6.6"/>',
  dict:'<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.2 13.2 8.5 15.5 10.8 10.8 15.5 8.5"/>',
  src:'<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="16" rx="1"/><rect x="16" y="4" width="4" height="16" rx="1"/>',
  set:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.96 3.3l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  music:'<circle cx="6.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="16.5" r="2.5"/><path d="M9 18.5V6l11-2.5v12.5"/>',
  profile:'<circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.2c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
  practice:'<path d="M2.8 15.9L21.2 12.7"/><path d="M2.8 15.9l.3 2.4a1.25 1.25 0 001.42 1.08l15.5-2.5a1.25 1.25 0 001.05-1.4l-.35-2.78"/><path d="M7.3 15.1l-.9-1.55M12.1 14.3l-.9-1.6M16.9 13.5l-.9-1.65"/><path d="M14.7 7.3q2.35-1.85 4.7 0"/><path d="M13.3 4.5q3.75-2.9 7.5 0"/>',
  bookClosed:'<path d="M6.2 3h11.6A1.7 1.7 0 0119.5 4.7v14.6a1.7 1.7 0 01-1.7 1.7H6.2A1.7 1.7 0 014.5 19.3V4.7A1.7 1.7 0 016.2 3z"/><path d="M8.4 3v18"/><path d="M11.6 7.6h4.6M11.6 10.8h3.2"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
 };
 return icons[name]||icons.book;
}
function v29NavHTML(active='sl'){
 const tabs=[['sl','Leitura',v29Svg('book')],['sw','Flash Cards',v29Svg('word')],['sx','Dicionário',v29Svg('dict')],['practice','Prática',v29Svg('practice')],['profile','Meu Perfil',v29Svg('profile')]];
 return tabs.map(([id,label,svg])=>`<button class="ni${id===active?' on':''}" data-tab="${id}" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${svg}</svg><span>${label}</span></button>`).join('');
}
function v29InstallShell(){
 const sl=document.getElementById('sl');
 if(sl&&!document.getElementById('v29-head')){
   const old=sl.querySelector('.lh');
   if(old)old.outerHTML=`<div class="app-shell"><div class="app-head" id="v29-head"><div class="v43-header-row"><button class="v43-icon-btn" id="v43-settings-icon" data-tab="ss" title="Configurações"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06A2 2 0 016.96 3.3l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button><div class="mode-row hz-inline"><button class="mode-btn" id="mode-simple">Leitura simples</button><button class="mode-btn" id="mode-books">Livros</button></div><button class="v43-icon-btn" id="v43-search-toggle" title="Buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div><div class="v43-search-wrap" id="sbar"><input class="v43-search-expand" id="sin" type="search" placeholder="Buscar..." autocomplete="off"></div></div></div>`;
   const bc=document.getElementById('bc');
   if(bc&&!bc.parentElement.classList.contains('app-shell')){
     const shell=document.querySelector('#sl .app-shell');shell.appendChild(bc);shell.appendChild(document.getElementById('lib-nav'));
   }
 }
 if(!document.getElementById('sx')){
  const sx=document.createElement('div');sx.id='sx';sx.className='screen';
  sx.innerHTML=`<div class="dict-head"><h1>Dicionário</h1></div><div class="dict-wrap"><div class="dict-search"><input id="dict-q" placeholder="字 / 词 / frase" autocomplete="off"><button id="dict-go">⌕</button></div><div class="dict-tabs"><button class="dict-tab on" data-dtab="defs">Definições</button><button class="dict-tab" data-dtab="words">Palavras</button><button class="dict-tab" data-dtab="sents">Frases</button></div><div id="dict-results" class="dict-list"><div class="emptyx"><b>Pesquise uma palavra ou ideograma.</b><br>O dicionário usa definições, palavras relacionadas, exemplos e áudio natural quando disponível.</div></div></div><nav class="bnav" id="dict-nav"></nav>`;
  document.body.insertBefore(sx,document.getElementById('sr'));
 }
 document.querySelectorAll('.bnav').forEach(nav=>{if(!nav.classList.contains('rbnav'))nav.innerHTML=v29NavHTML(nav.id==='lib-nav'?'sl':'');});
 const dn=document.getElementById('dict-nav'); if(dn)dn.innerHTML=v29NavHTML('sx');
 const sn=document.getElementById('set-nav'); if(sn)sn.innerHTML=v29NavHTML('ss');
 const wn=document.getElementById('words-nav'); if(wn)wn.innerHTML=v29NavHTML('sw');
 const disn=document.getElementById('disc-nav'); if(disn)disn.innerHTML=v29NavHTML('sd');
 const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]'); if(about)about.textContent='v2.9';
}
function v29InstallModals(){
 if(!document.getElementById('mo-book')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-book"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Livro</div><div class="mscroll"><div class="form"><div class="cover-preview book-cover gen" id="book-cover-prev"></div><div class="fld"><label>Link direto da capa</label><input id="book-cover" placeholder="https://site.com/capa.jpg"><a class="ex-link" href="${V29_EXAMPLE_COVER}" target="_blank" rel="noopener">Ver exemplo de link direto</a></div><div class="fld"><label>Título</label><input id="book-title" placeholder="Nome do livro"></div><div class="fld"><label>Sinopse <span id="syn-count">0/100</span></label><textarea id="book-syn" maxlength="100" placeholder="Até 100 caracteres"></textarea></div><div class="row2"><button class="plain-btn" id="book-add-chap" type="button">Adicionar capítulos</button><button class="plain-btn" id="book-edit-chap" type="button">Editar capítulos</button></div><div class="small-note" id="book-chap-count">Capítulos: 0</div></div></div><div class="modal-actions"><button class="btn-sec" id="book-cancel">Cancelar</button><button class="btn-pri" id="book-save">Salvar</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chapter')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chapter"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Adicionar capítulo</div><div class="mscroll"><div class="form"><div class="row2"><div class="fld"><label>Número</label><input id="chap-num" type="number" min="1" value="1"></div><div class="fld"><label>Nome</label><input id="chap-title" placeholder="Capítulo 1"></div></div><div class="fld"><label>Importar por URL</label><div class="url-row"><input id="chap-url" placeholder="https://..."><button class="plain-btn" id="chap-fetch" type="button">Buscar</button></div></div><div class="row2"><button class="plain-btn" id="chap-file-txt" type="button">TXT</button><button class="plain-btn" id="chap-file-pdf" type="button">PDF</button></div><div class="fld"><label>Texto do capítulo</label><textarea id="chap-text" style="min-height:190px" placeholder="Cole ou importe o texto chinês aqui..."></textarea></div><input type="file" id="chap-fi-txt" accept=".txt,text/plain" style="display:none"><input type="file" id="chap-fi-pdf" accept=".pdf,application/pdf" style="display:none"></div></div><div class="modal-actions"><button class="btn-sec" id="chap-close">Fechar</button><button class="btn-pri" id="chap-save">Salvar capítulo</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chapters')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chapters"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Capítulos</div><div class="mscroll"><div id="chapters-edit-list" class="chapter-list"></div></div><div class="modal-actions"><button class="btn-sec" id="chapters-cancel">Cancelar</button><button class="btn-pri" id="chapters-save">Salvar ordem</button></div></div></div>`);
 }
 if(!document.getElementById('mo-chap-pick')){
  document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-chap-pick"><div class="ms wide"><div class="mbar"><div class="mhd"></div><button class="mx" type="button" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Escolher capítulo</div><div class="chap-pop-list" id="chap-pick-list"></div></div></div>`);
 }
}
function v29Bind(){
 const on=(id,ev,fn)=>{const el=document.getElementById(id); if(el&&!el._v29){el.addEventListener(ev,fn);el._v29=true;}};
 on('mode-simple','click',()=>{v29LibMode='simple';localStorage.setItem('hlibMode',v29LibMode);renderLib();});
 on('mode-books','click',()=>{v29LibMode='books';localStorage.setItem('hlibMode',v29LibMode);renderLib();});
 on('plus-simple','click',()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');});
 on('plus-books','click',()=>v29OpenBookEditor());
 const sin=document.getElementById('sin'); if(sin&&!sin._v29){sin.addEventListener('input',e=>{searchQ=e.target.value.trim();renderLib();});sin._v29=true;}
 document.body.addEventListener('click',e=>{if(e.target.closest('[data-v29-close]'))closeModals();});
 on('book-cancel','click',closeModals); on('book-save','click',async()=>{await v29SaveBookForm();closeModals();await loadLib();toast('Livro salvo');});
 ['book-cover','book-title','book-syn'].forEach(id=>{const el=document.getElementById(id); if(el&&!el._v29){el.addEventListener('input',()=>{v29PreviewBookForm();v29AutoSaveBookForm();});el._v29=true;}});
 on('book-add-chap','click',()=>v29OpenChapterImport(v29EditingBookId)); on('book-edit-chap','click',()=>v29OpenChaptersEditor(v29EditingBookId));
 on('chap-fetch','click',async()=>{const url=document.getElementById('chap-url').value.trim();if(!url){toast('Digite uma URL');return;}showLoad('Extraindo capítulo...');try{document.getElementById('chap-text').value=await fetchText(url);if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=new URL(url).hostname;}catch(e){toast('Erro: '+e.message);}finally{hideLoad();}});
 on('chap-file-txt','click',()=>document.getElementById('chap-fi-txt').click()); on('chap-file-pdf','click',()=>document.getElementById('chap-fi-pdf').click());
 on('chap-fi-txt','change',async e=>{const f=e.target.files[0];if(f){showLoad('Lendo TXT...');try{document.getElementById('chap-text').value=cleanRaw(await readFile(f,'UTF-8'));if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=f.name.replace(/\.[^.]+$/,'');}catch(er){toast('Erro: '+er.message);}finally{hideLoad();}}e.target.value='';});
 on('chap-fi-pdf','change',async e=>{const f=e.target.files[0];if(f){showLoad('Extraindo PDF...');try{document.getElementById('chap-text').value=await v29ReadPdfText(f);if(!document.getElementById('chap-title').value)document.getElementById('chap-title').value=f.name.replace(/\.pdf$/i,'');}catch(er){toast('Erro PDF: '+er.message);}finally{hideLoad();}}e.target.value='';});
 on('chap-save','click',async()=>{await v29SaveChapter();}); on('chap-close','click',closeModals);
 on('chapters-save','click',async()=>{await v29SaveChaptersFromEditor();closeModals();toast('Capítulos salvos');}); on('chapters-cancel','click',closeModals);
 on('dict-go','click',()=>v29RunDict(document.getElementById('dict-q').value.trim()));
 const dq=document.getElementById('dict-q'); if(dq&&!dq._v29){dq.addEventListener('keydown',e=>{if(e.key==='Enter')v29RunDict(dq.value.trim());});dq._v29=true;}
 document.querySelectorAll('.dict-tab').forEach(b=>{if(!b._v29){b.addEventListener('click',()=>{v29DictTab=b.dataset.dtab;document.querySelectorAll('.dict-tab').forEach(x=>x.classList.toggle('on',x.dataset.dtab===v29DictTab));v29RenderDictCurrent();});b._v29=true;}});
 const rtop=document.querySelector('#sr .rtop'); if(rtop&&!rtop._v29){rtop.addEventListener('click',()=>{if(curBook&&v29GetChapters(curBook).length>1)v29OpenChapterPicker(curBook.id);});rtop._v29=true;}
}
function v29PrepImport(title){const mt=document.querySelector('#mo-import .mtitle'); if(mt)mt.textContent=title||'Adicionar texto';}
function v29BookColors(id){const n=[...String(id||'x')].reduce((a,c)=>a+c.charCodeAt(0),0);const sets=[['#384256','#7a5c91','#d9a868'],['#355c4d','#829a61','#d6b36a'],['#4b384c','#97626e','#d7a66e'],['#324b61','#5b8da0','#e1c27a'],['#473c2f','#8e664e','#d8b063']];return sets[n%sets.length];}
function v29CoverStyle(b){if(b.cover)return `background-image:url('${esc(String(b.cover).replace(/'/g,'%27'))}')`;const [g1,g2,g3]=v29BookColors(b.id);return `--g1:${g1};--g2:${g2};--g3:${g3}`;}
function v29GetChapters(b){return Array.isArray(b?.chapters)?b.chapters:[];}
function v29Kind(b){return b.kind||(b.chapters?'book':'simple');}
function v29BookProgress(b){const ch=v29GetChapters(b); if(!ch.length)return b.progress||0; const idx=b.lastChapterIndex||0; return Math.max(0,Math.min(1,ch[idx]?.progress||0));}
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
   list.forEach(b=>{const pct=Math.round((b.progress||0)*100);const el=document.createElement('div');el.className='card';el.innerHTML=`<div class="thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">${v29Svg('book')}</svg></div><div class="bi"><div class="bt">${esc(b.title||'Sem título')}</div><div class="bs">${esc(b.source||'Leitura')}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;el.onclick=()=>openBook(b.id);addLP(el,()=>confirmDelBook(b.id));wrap.appendChild(el);});
 }else{
   // Build toolbar for livros with Importar button.  The new Importar button
   // navigates to the Discover page (sd) to allow importing books from local
   // sources.  Preserve the existing New book button and view toggles.
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-import-chip">Importar</button><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;
   {
     const imp=document.getElementById('book-import-chip');
     if(imp) imp.onclick=()=>{ try{ showScreen('sd'); }catch(e){} };
   }
   document.getElementById('view-cover').onclick=()=>{v29BookView='cover';localStorage.setItem('hbookView',v29BookView);renderLib();};
   document.getElementById('view-list').onclick=()=>{v29BookView='list';localStorage.setItem('hbookView',v29BookView);renderLib();};
   const wrap=document.getElementById('book-wrap'); if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em Importar ou Novo livro para adicionar.</div>';return;}
   list.forEach(b=>{const ch=v29GetChapters(b);const pct=Math.round(v29BookProgress(b)*100);const el=document.createElement('div');el.className='book-card';el.innerHTML=`<button class="book-edit" data-edit-book="${b.id}" title="Editar">✎</button><div class="book-cover ${b.cover?'':'gen'}" style="${v29CoverStyle(b)}"></div><div><div class="book-name">${esc(b.title||'Sem título')}</div><div class="book-syn">${esc(b.synopsis||'Sem sinopse')}</div><div class="book-meta"><span>${ch.length} cap.</span><span>${pct}%</span></div></div>`;el.onclick=e=>{if(e.target.closest('[data-edit-book]')){v29OpenBookEditor(b.id);return;}if(ch.length)openBook(b.id);else toast('Adicione pelo menos um capítulo');};addLP(el,()=>v29OpenChapterPicker(b.id));wrap.appendChild(el);});
 }
};
async function v29LoadBook(id){books=await dbAll(STB);return books.find(b=>b.id===id);}
function v29NewId(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
async function v29OpenBookEditor(id){
 let b=id?await v29LoadBook(id):null;
 if(!b){b={id:v29NewId(),kind:'book',title:'Novo livro',source:'Livro',cover:'',synopsis:'',chapters:[],lastRead:null,addedAt:Date.now(),lastChapterIndex:0};await dbPut(STB,b);books=await dbAll(STB);}
 v29EditingBookId=b.id;document.getElementById('book-cover').value=b.cover||'';document.getElementById('book-title').value=b.title||'';document.getElementById('book-syn').value=b.synopsis||'';v29PreviewBookForm();showModal('mo-book');renderLib();
}
function v29PreviewBookForm(){const cover=document.getElementById('book-cover').value.trim();const prev=document.getElementById('book-cover-prev');if(prev){prev.className='cover-preview book-cover '+(cover?'':'gen');prev.setAttribute('style',cover?`background-image:url('${cover.replace(/'/g,'%27')}')`:'--g1:#384256;--g2:#7a5c91;--g3:#d9a868');}const syn=document.getElementById('book-syn').value||'';const c=document.getElementById('syn-count');if(c)c.textContent=syn.length+'/100';const b=books.find(x=>x.id===v29EditingBookId);const count=document.getElementById('book-chap-count');if(count)count.textContent='Capítulos: '+(v29GetChapters(b).length||0);}
let v29AutoTimer=null;function v29AutoSaveBookForm(){clearTimeout(v29AutoTimer);v29AutoTimer=setTimeout(v29SaveBookForm,350);}
async function v29SaveBookForm(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;b.kind='book';b.title=document.getElementById('book-title').value.trim()||'Novo livro';b.cover=document.getElementById('book-cover').value.trim();b.synopsis=(document.getElementById('book-syn').value||'').slice(0,100);b.source='Livro';b.updatedAt=Date.now();await dbPut(STB,b);books=await dbAll(STB);}
async function v29OpenChapterImport(id){await v29SaveBookForm();const b=books.find(x=>x.id===id)||await v29LoadBook(id);if(!b)return;v29EditingBookId=b.id;const n=(v29GetChapters(b).length||0)+1;document.getElementById('chap-num').value=n;document.getElementById('chap-title').value='Capítulo '+n;document.getElementById('chap-url').value='';document.getElementById('chap-text').value='';showModal('mo-chapter');}
async function v29ReadPdfText(file){const buf=await readFile(file);const lib=await ensurePDFLib();const pdfObj=await lib.getDocument({data:buf.slice(0)}).promise;let full='';for(let p=1;p<=pdfObj.numPages;p++){const page=await pdfObj.getPage(p);const c=await page.getTextContent();full+=c.items.map(i=>i.str).join('')+'\n';}const clean=cleanRaw(full);if(!clean)throw new Error('PDF sem texto embutido; OCR ainda não está ativo neste pacote');return clean;}
async function v29SaveChapter(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;const text=cleanRaw(document.getElementById('chap-text').value||'');if(!text){toast('Capítulo vazio');return;}const n=parseInt(document.getElementById('chap-num').value||((v29GetChapters(b).length||0)+1));const title=document.getElementById('chap-title').value.trim()||('Capítulo '+n);b.chapters=v29GetChapters(b);b.chapters.push({id:v29NewId(),num:n,title,content:text,progress:0,addedAt:Date.now()});b.chapters.sort((a,b)=>(+a.num||0)-(+b.num||0));b.kind='book';b.updatedAt=Date.now();await dbPut(STB,b);books=await dbAll(STB);toast('Capítulo salvo');document.getElementById('chap-num').value=(b.chapters.length+1);document.getElementById('chap-title').value='Capítulo '+(b.chapters.length+1);document.getElementById('chap-text').value='';v29PreviewBookForm();renderLib();}
async function v29OpenChaptersEditor(id){await v29SaveBookForm();let b=books.find(x=>x.id===id)||await v29LoadBook(id);if(!b)return;v29EditingBookId=b.id;v29RenderChaptersEditor(b);showModal('mo-chapters');}
function v29RenderChaptersEditor(b){const list=document.getElementById('chapters-edit-list');const ch=v29GetChapters(b);if(!ch.length){list.innerHTML='<div class="emptyx">Nenhum capítulo ainda.</div>';return;}list.innerHTML='';ch.forEach((c,i)=>{const row=document.createElement('div');row.className='chap-row';row.draggable=true;row.dataset.cid=c.id;row.innerHTML=`<button class="chap-del" title="Excluir">×</button><input class="chap-num" type="number" min="1" value="${esc(c.num||i+1)}"><div class="chap-title">${esc(c.title||('Capítulo '+(i+1)))}</div><button class="chap-drag" title="Arrastar">☰</button>`;row.addEventListener('dragstart',()=>{v29ChapterDragId=c.id;row.classList.add('dragging');});row.addEventListener('dragend',()=>row.classList.remove('dragging'));row.addEventListener('dragover',e=>{e.preventDefault();const dragging=list.querySelector('.dragging');if(dragging&&dragging!==row){const rect=row.getBoundingClientRect();list.insertBefore(dragging,(e.clientY-rect.top)>rect.height/2?row.nextSibling:row);}});row.querySelector('.chap-del').onclick=async()=>{if(confirm('Você realmente deseja excluir este capítulo?')){let b=books.find(x=>x.id===v29EditingBookId);b.chapters=v29GetChapters(b).filter(x=>x.id!==c.id);await dbPut(STB,b);books=await dbAll(STB);v29RenderChaptersEditor(b);renderLib();}};list.appendChild(row);});}
async function v29SaveChaptersFromEditor(){let b=books.find(x=>x.id===v29EditingBookId)||await v29LoadBook(v29EditingBookId);if(!b)return;const old=new Map(v29GetChapters(b).map(c=>[c.id,c]));const rows=[...document.querySelectorAll('#chapters-edit-list .chap-row')];b.chapters=rows.map((r,i)=>{const c=old.get(r.dataset.cid);c.num=parseInt(r.querySelector('.chap-num').value||i+1);return c;});b.chapters.sort((a,b)=>(+a.num||0)-(+b.num||0));await dbPut(STB,b);books=await dbAll(STB);renderLib();}
function v29OpenChapterPicker(id){const b=books.find(x=>x.id===id);if(!b||!v29GetChapters(b).length)return;const list=document.getElementById('chap-pick-list');list.innerHTML='';v29GetChapters(b).forEach((c,i)=>{const btn=document.createElement('button');btn.className='chap-pick';btn.innerHTML=`${esc(c.title||('Capítulo '+(i+1)))}<small>Cap. ${esc(c.num||i+1)} • ${Math.round((c.progress||0)*100)}%</small>`;btn.onclick=()=>{closeModals();v29OpenBookChapter(b.id,i);};list.appendChild(btn);});showModal('mo-chap-pick');}
openBook=async function(id){const b=books.find(x=>x.id===id);if(!b)return;if(v29Kind(b)==='book'){const idx=Math.max(0,Math.min((b.lastChapterIndex||0),v29GetChapters(b).length-1));return v29OpenBookChapter(id,idx);}return v29OpenSimpleReading(id);};
async function v29OpenSimpleReading(id){curBook=books.find(b=>b.id===id);if(!curBook)return;showScreen('sr');document.getElementById('rsrc').textContent=curBook.source||curBook.title;document.getElementById('rpct').textContent=Math.round((curBook.progress||0)*100)+'%';document.querySelector('#sr .rtop')?.classList.remove('clickable');document.getElementById('rtext').innerHTML='';const rs=document.getElementById('rscroll');rs.onscroll=()=>v29SaveReaderProgress(rs,null);
 try{
  if(window.hzProgressiveReader){
   // v5.1: renderização progressiva — o trecho inicial aparece na hora, a
   // interface é liberada e o restante entra em lotes (rAF/idle) em segundo
   // plano. A restauração do ponto de leitura acontece ao final, se o
   // usuário ainda não tiver rolado por conta própria.
   await window.hzProgressiveReader.render(curBook.content||'',{scroller:rs,progress:curBook.progress||0,chapterLabel:false});
  }else{
   showLoad('Aguardando pinyin...');await waitPinyin();showLoad('Processando texto...');await frame();document.getElementById('rtext').innerHTML=buildHTML(curBook.content||'');applyPinyin();await frame();const maxS=rs.scrollHeight-rs.clientHeight;rs.scrollTop=(curBook.progress||0)*maxS;
  }
 }catch(e){toast('Erro: '+e.message);}finally{hideLoad();}
 curBook.lastRead=Date.now();await dbPut(STB,curBook);}
async function v29OpenBookChapter(id,idx){curBook=books.find(b=>b.id===id)||await v29LoadBook(id);if(!curBook)return;const ch=v29GetChapters(curBook);const c=ch[idx];if(!c)return;curBook._readingChapterIndex=idx;showScreen('sr');document.querySelector('#sr .rtop')?.classList.add('clickable');document.getElementById('rsrc').textContent=(c.title||('Capítulo '+(idx+1)))+' • '+(curBook.title||'Livro');document.getElementById('rpct').textContent=Math.round((c.progress||0)*100)+'%';document.getElementById('rtext').innerHTML='';const rs=document.getElementById('rscroll');rs.onscroll=()=>v29SaveReaderProgress(rs,idx);
 try{
  if(window.hzProgressiveReader){
   await window.hzProgressiveReader.render(c.content||'',{scroller:rs,progress:c.progress||0,chapterLabel:true});
  }else{
   showLoad('Aguardando pinyin...');await waitPinyin();showLoad('Processando capítulo...');await frame();document.getElementById('rtext').innerHTML=buildHTML(c.content||'');applyPinyin();await frame();const maxS=rs.scrollHeight-rs.clientHeight;rs.scrollTop=(c.progress||0)*maxS;
  }
 }catch(e){toast('Erro: '+e.message);}finally{hideLoad();}
 curBook.lastRead=Date.now();curBook.lastChapterIndex=idx;await dbPut(STB,curBook);}
function v29SaveReaderProgress(rs,chapterIdx){
  if(!rs)return;
  rs._hzReaderChapter=chapterIdx;
  if(rs._hzReaderFrame)return;
  rs._hzReaderFrame=requestAnimationFrame(()=>{
    rs._hzReaderFrame=0;
    const max=Math.max(0,rs.scrollHeight-rs.clientHeight);if(max<=0)return;
    const pct=Math.max(0,Math.min(1,rs.scrollTop/max));
    const pctEl=document.getElementById('rpct');const label=Math.round(pct*100)+'%';if(pctEl&&pctEl.textContent!==label)pctEl.textContent=label;
    clearTimeout(rs._st);rs._st=setTimeout(async()=>{
      if(!curBook)return;const activeChapter=rs._hzReaderChapter;
      if(activeChapter==null){curBook.progress=pct;curBook.charsRead=Math.floor(pct*(curBook.content||'').length);}
      else if(curBook.chapters?.[activeChapter]){curBook.chapters[activeChapter].progress=pct;curBook.lastChapterIndex=activeChapter;curBook.charsRead=Math.max(curBook.charsRead||0,Math.floor(pct*(curBook.chapters[activeChapter].content||'').length));}
      curBook.lastRead=Date.now();try{await dbPut(STB,curBook);}catch{}
    },650);
  });
}
// Override import saves: simple reading by default, chapter when explicitly inside chapter modal.
saveBook=async function(data){await dbPut(STB,{id:v29NewId(),kind:'simple',title:data.title,source:data.source,content:data.content||'',type:data.type,pdfData:data.pdfData||null,progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});};
function v29TradMask(simp,trad){if(!trad||!simp||trad===simp)return'';const a=[...simp],b=[...trad];return '（'+a.map((c,i)=>b[i]&&b[i]!==c?b[i]:'－').join('')+'）';}
async function v29CedictRaw(q){try{const r=await fetch(`https://cccedict.vercel.app/api/dict?q=${encodeURIComponent(q)}`,{signal:AbortSignal.timeout(6000)});if(!r.ok)return[];return await r.json();}catch{return[];}}
async function v29RunDict(q){try{q=v40ToSimplified(q);}catch{}if(!q){toast('Digite uma palavra');return;}v29DictTerm=q;document.getElementById('dict-results').innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';await v29RenderDictCurrent(true);}
async function v29RenderDictCurrent(force=false){const q=v29DictTerm;if(!q)return;document.querySelectorAll('.dict-tab').forEach(x=>x.classList.toggle('on',x.dataset.dtab===v29DictTab));const out=document.getElementById('dict-results');if(v29DictTab==='defs')return v29RenderDictDefs(q,out);if(v29DictTab==='words')return v29RenderDictWords(q,out);return v29RenderDictSentences(q,out);}
async function v29RenderDictDefs(q,out){const raw=await v29CedictRaw(q);const res=await lookupAll(q);let html='';const entry=raw&&raw[0];const py=entry?.pinyin||getWordPY(q);html+=`<div class="dict-card"><div class="dict-word">${esc(q)} <button class="dict-audio" onclick="speakWordMode('${esc(q)}','natural')">▶</button></div><div class="dict-py">${esc(py||'')}</div>${entry?`<div class="dict-trad">Tradicional ${esc(v29TradMask(entry.simplified||q,entry.traditional||''))}</div>`:''}`;if(res&&res.defs){res.defs.slice(0,5).forEach(s=>{if(s.pos)html+=`<div class="dict-pos">${esc(s.pos)}</div>`;(s.defs||[]).slice(0,7).forEach(d=>html+=`<div class="dict-def">${esc(d.text)}</div>`);});}else html+='<div class="dict-def">Sem definição encontrada nos bancos atuais.</div>';html+='</div>';out.innerHTML=html;}
async function v29RenderDictWords(q,out){const isOne=[...q].filter(isCJK).length===1;let words=[...HSK_LEVEL.keys()].filter(w=>isOne?w.includes(q):w.includes(q[0])&&w!==q).sort((a,b)=>a.length-b.length).slice(0,60);if(!words.length)words=[q];out.innerHTML=words.map(w=>{const py=getWordPY(w);const lv=HSK_LEVEL.get(w)||'?';return `<div class="dict-item"><div class="dict-item-main"><div class="zh">${esc(w)}</div><div class="py">${esc(py)} • HSK ${lv}</div><div class="en">Toque em definições para consultar o significado completo.</div></div><button class="dict-audio" onclick="speakWordMode('${esc(w)}','natural')">▶</button></div>`}).join('');}
async function v29Tatoeba(q){try{const url=`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&has_audio=&word_count_max=20`;const r=await fetch(url,{signal:AbortSignal.timeout(6500)});if(!r.ok)return[];const d=await r.json();return (d.results||[]).slice(0,8).map(x=>{let tr='';try{tr=(x.translations||[]).flat()[0]?.text||'';}catch{}return{zh:x.text||'',tr};}).filter(x=>x.zh);}catch{return[];}}
async function v29RenderDictSentences(q,out){let sents=await v29Tatoeba(q);if(!sents.length)sents=V29_LOCAL_SENTENCES.filter(s=>s.zh.includes(q));if(!sents.length)sents=V29_LOCAL_SENTENCES.slice(0,3).map(s=>({zh:s.zh.replace('这个词',q),tr:s.tr}));out.innerHTML=sents.slice(0,10).map(s=>`<div class="sent-card"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py">${esc(getWordPY(s.zh))}</div></div><button class="dict-audio" onclick="speakWordMode('${esc(s.zh)}','natural')">▶</button></div><div class="sent-tr">${esc(s.tr||'Tradução humana indisponível nesta fonte.')}</div></div>`).join('');}
// Better discover cards: keep source links and allow quick book creation from a source.
renderDiscover=function(){const dc=document.getElementById('dc');if(!dc)return;dc.innerHTML=DISC.map(s=>`<div class="dcard"><div class="dico" style="background:${s.c}">${s.ic}</div><div class="dinfo"><div class="dname">${esc(s.n)}</div><div class="ddesc">${esc(s.d)}</div><div class="dlevels">${s.lv.map(l=>`<span class="dlvl ${lvlC(l)}">${l}</span>`).join('')}</div><button class="src-add" data-src-book="${esc(s.n)}">Criar livro-fonte</button></div></div>`).join('');dc.querySelectorAll('[data-src-book]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const name=b.dataset.srcBook;const s=DISC.find(x=>x.n===name);const data=V29_SOURCE_IMPORTS[name]||{title:name,cover:'',synopsis:s?.d||'',chapters:[{title:'Página inicial',num:1,url:s?.url||''}]};const book={id:v29NewId(),kind:'book',title:data.title,source:'Fonte',cover:data.cover||'',synopsis:(data.synopsis||'').slice(0,100),chapters:[],lastRead:null,addedAt:Date.now(),lastChapterIndex:0};for(const [i,ch] of data.chapters.entries()){book.chapters.push({id:v29NewId(),num:ch.num||i+1,title:ch.title||('Capítulo '+(i+1)),content:`Fonte: ${ch.url}\n\nAbra o link e importe os capítulos desejados.`,progress:0,addedAt:Date.now()});}await dbPut(STB,book);books=await dbAll(STB);toast('Livro-fonte criado');});};
lookupAll=async function(word){try{const r=await lookupWikt(word);if(r)return r;}catch{}const cc=await lookupCC(word);if(cc)return cc;const mm=await lookupMM(word);if(mm)return mm;return null;};
function v29Boot(){v29InstallShell();v29InstallModals();v29Bind();document.querySelectorAll('.mo').forEach(m=>{if(!m._v29back){m.addEventListener('click',e=>{if(e.target===m)closeModals();});m._v29back=true;}});renderDiscover();renderLib();try{window.hzAppReady&&window.hzAppReady();}catch{}}
setTimeout(v29Boot,120);


/* ===== inline-4 ===== */
/* v3.0 estilo cartão dictionary + strict sentence filtering + restored natural audio routes */
(function(){
const V30_STYLE=`
/* v3.0 dictionary/audio polish */
#sx{background:#000}.dict-head{background:#000;border-bottom:1px solid #1e1e1e;padding:calc(var(--st) + 12px) 16px 8px}.dict-head h1{font-size:24px;font-weight:800;color:#fff}.dict-wrap{background:#000;color:#fff}.dict-search{grid-template-columns:42px 1fr 46px;align-items:center}.dict-back-mini{display:none;border:none;background:transparent;color:#fff;font-size:28px;line-height:1}.dict-search input{background:#1e1e1f;border:1px solid #333;border-radius:4px;padding:10px 42px 10px 12px;color:#fff;font-size:20px;font-weight:650}.dict-search button{border-radius:8px;background:#fff;color:#000;font-size:20px}.dict-tabs{position:sticky;top:0;z-index:3;background:#000;border:0;border-bottom:1px solid #2a2a2a;border-radius:0;padding:0;margin:2px -16px 0;grid-template-columns:repeat(3,1fr)}.dict-tab{border-radius:0;color:#047cc0;background:transparent;font-size:13px;font-weight:900;padding:13px 2px 11px;border-bottom:3px solid transparent;text-transform:uppercase;letter-spacing:.2px}.dict-tab.on{background:transparent;color:#18aaff;border-bottom-color:#16a7ff}.dict-results-lexi{display:flex;flex-direction:column;gap:0;margin:0 -16px}.lexi-hero{padding:22px 28px 12px;border-bottom:1px solid #2a2a2a}.lexi-zh{font-family:var(--rf);font-size:54px;line-height:1;color:#e583ff;font-weight:500}.lexi-zh.small{font-size:34px}.lexi-py{font-size:20px;color:#fff;font-weight:800;margin-top:10px;display:flex;align-items:center;gap:7px}.lexi-audio{border:none;background:transparent;color:#10a7ff;font-size:21px;font-weight:900;min-width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.lexi-audio.pl{color:var(--ac);transform:scale(1.08)}.lexi-source{margin-left:auto;color:#18aaff;font-size:13px;font-weight:900}.lexi-entry{padding:16px 28px;border-bottom:1px solid #2a2a2a}.lexi-pos{font-size:17px;letter-spacing:1px;color:#cfcfcf;font-weight:950;text-transform:uppercase;margin-bottom:12px}.lexi-def{font-size:24px;line-height:1.38;color:#f5f5f5;margin:10px 0}.lexi-num{font-size:26px;font-weight:950;color:#fff;margin-right:10px}.lexi-see{font-size:14px;color:#999;margin-top:7px}.lexi-ex{border-left:3px solid #11aaff;padding:8px 0 8px 13px;margin:10px 0 0}.lexi-ex-zh{font-family:var(--rf);color:#11aaff;font-size:23px;line-height:1.45}.lexi-ex-py{font-size:15px;color:#fff;font-weight:800;margin-top:4px}.lexi-ex-tr{font-size:19px;color:#e6e6e6;line-height:1.35;margin-top:5px}.lexi-meta{font-size:12px;color:#777;margin-top:10px}.dict-item,.sent-card{background:#000;border:0;border-bottom:1px solid #2a2a2a;border-radius:0;padding:14px 28px}.dict-item{grid-template-columns:1fr 42px}.dict-item .zh{font-size:30px;color:#e583ff}.dict-item .trad{color:#bfbfbf}.dict-item .py{font-size:19px;color:#fff;font-weight:850}.dict-item .en{font-size:19px;color:#eaeaea}.dict-item .posline{font-size:13px;color:#eee;font-weight:950;text-transform:uppercase;letter-spacing:1px;margin-right:4px}.sent-card{border-radius:0}.sent-zh{font-size:26px;color:#10a7ff;line-height:1.4}.sent-py{font-size:20px;color:#fff;font-weight:850;line-height:1.35}.sent-tr{font-size:23px;color:#f2f2f2;line-height:1.35;border-top:none;padding-top:3px}.sent-src{font-size:11px;color:#777;margin-top:8px}.dict-empty{padding:28px;color:#8b8b8b;line-height:1.6}.inline-plus{float:right;color:#fff;font-size:18px;border:1px solid #aaa;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;line-height:1;margin-top:5px}.dict-subtitle{font-size:15px;color:#18aaff;font-weight:900;text-align:right;padding:10px 28px 6px;border-bottom:1px solid #1c1c1c}.lexi-trad{font-size:17px;color:#aaa;margin-top:8px}.dict-audio{background:transparent;color:#10a7ff;font-size:21px}.dict-audio.pl{color:var(--ac)}.lexi-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #263746;background:#071521;border-radius:14px;color:#1ca7ff;font-size:11px;font-weight:800;padding:3px 8px;margin-right:6px;margin-top:8px}.lexi-variants{font-size:15px;color:#a7a7a7;margin-top:8px}.lexi-variants b{color:#ddd}.dict-word-click{cursor:pointer}.dict-word-click:active{opacity:.6}@media (min-width:760px){.dict-wrap{max-width:880px}.dict-results-lexi{margin-left:0;margin-right:0}.dict-tabs{margin-left:0;margin-right:0}.lexi-entry,.lexi-hero,.dict-item,.sent-card,.dict-subtitle,.dict-empty{padding-left:34px;padding-right:34px}.lexi-def{font-size:23px}.sent-tr{font-size:21px}}`;
const st=document.createElement('style');st.textContent=V30_STYLE;document.head.appendChild(st);

const V30_LOCAL_DICT={
 '月':{trad:'月',simp:'月',pinyin:'yuè',pos:'NOUN',defs:['moon','month','monthly','fullmoon-shaped; round'],examples:[['月下散步','yuè xià sànbù','take a walk in the moonlight'],['本月','běn yuè','this month'],['月是故乡明。','yuè shì gùxiāng míng','The moon is brightest in one’s hometown.']]},
 '圆':{trad:'圓',simp:'圆',pinyin:'yuán',pos:'NOUN / VERB / ADJECTIVE',defs:['circle; sphere; ring','coin of fixed value and weight','make plausible; justify','round; circular; spherical'],examples:[['圆圈','yuánquān','circle; ring'],['圆形','yuánxíng','round shape'],['月圆了。','yuè yuán le','The moon is full.']]},
 '月亮':{trad:'月亮',simp:'月亮',pinyin:'yuèliang',pos:'NOUN',defs:['moon'],examples:[['今晚的月亮很圆。','jīnwǎn de yuèliang hěn yuán','The moon is very round tonight.']]},
 '月饼':{trad:'月餅',simp:'月饼',pinyin:'yuèbǐng',pos:'NOUN',defs:['moon cake, especially for the Mid-Autumn Festival'],examples:[['中秋节吃月饼。','zhōngqiū jié chī yuèbǐng','People eat mooncakes at Mid-Autumn Festival.']]},
 '围棋':{trad:'圍棋',simp:'围棋',pinyin:'wéiqí',pos:'NOUN',defs:['go; the board game weiqi'],examples:[['我喜欢下围棋。','wǒ xǐhuān xià wéiqí','I like playing Go.'],['围棋有黑白两种棋子。','wéiqí yǒu hēibái liǎng zhǒng qízǐ','Go has black and white stones.']]},
 '棋子':{trad:'棋子',simp:'棋子',pinyin:'qízǐ',pos:'NOUN',defs:['chess piece; game piece; stone in Go'],examples:[['黑色棋子先行。','hēisè qízǐ xiānxíng','The black stones move first.']]},
 '对弈':{trad:'對弈',simp:'对弈',pinyin:'duìyì',pos:'VERB / NOUN',defs:['to play chess or Go; a game between two sides'],examples:[['双方在棋盘上对弈。','shuāngfāng zài qípán shàng duìyì','The two sides play on the board.']]},
 '棋盘':{trad:'棋盤',simp:'棋盘',pinyin:'qípán',pos:'NOUN',defs:['chessboard; Go board'],examples:[['棋盘上有十九条线。','qípán shàng yǒu shíjiǔ tiáo xiàn','There are nineteen lines on the board.']]},
 '交叉点':{trad:'交叉點',simp:'交叉点',pinyin:'jiāochādiǎn',pos:'NOUN',defs:['intersection point; crossing point'],examples:[['棋子放在交叉点上。','qízǐ fàng zài jiāochādiǎn shàng','The stone is placed on an intersection.']]},
 '胜负':{trad:'勝負',simp:'胜负',pinyin:'shèngfù',pos:'NOUN',defs:['victory or defeat; outcome of a contest'],examples:[['围地的大小决定胜负。','wéidì de dàxiǎo juédìng shèngfù','The size of surrounded territory decides the outcome.']]}
};
const V30_EXTRA_WORDS=['月下散步','本月','隔月','逐月','月光','月初','月底','月份','月球','月台','月宫','月圆','圆形','圆圈','团圆','圆满','规定','黑白','两种','黑色','白色','落子','悔棋','完毕','交替','放置','网格','围地','吃子','大小','决定','十九条','条线'];
const V30_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
function v30IsCjkTerm(q){return [...String(q||'')].some(isCJK)}
function v30ContainsTerm(text,q){text=String(text||'');q=String(q||'').trim();if(!q)return false;const c=[...q].filter(isCJK).join('');if(c.length>1)return text.includes(c);if(c.length===1)return text.includes(c);return text.toLowerCase().includes(q.toLowerCase());}
function v30Js(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');}
function v30CleanDef(t){return String(t||'').replace(/^to be /i,'to be ').replace(/\s+/g,' ').trim();}
function v30GuessPos(defs){const joined=(defs||[]).join('; ').toLowerCase();if(/^(to |to be |be |make |have |put |take |walk|play|decide)/.test(joined))return'VERB';if(/round|circular|spherical|bright|clear|black|white/.test(joined))return'ADJECTIVE';if(/quickly|slowly|monthly|often/.test(joined))return'ADVERB';return'NOUN';}
function v30DefListFromEntry(e){let defs=[];if(!e)return defs;if(Array.isArray(e.defs))defs=e.defs;if(Array.isArray(e.english))defs=e.english;if(Array.isArray(e.definitions))defs=e.definitions;if(typeof e.definition==='string')defs=e.definition.split(/[;/]/);if(typeof e.english==='string')defs=e.english.split(/[;/]/);return defs.map(v30CleanDef).filter(Boolean);}
function v30NormalizeCedict(e,q){if(!e)return null;const simp=e.simplified||e.simp||e.s||e.word||e.chinese||q;const trad=e.traditional||e.trad||e.t||'';const py=e.pinyin||e.py||getWordPY(simp||q);const defs=v30DefListFromEntry(e);if(!simp&&!defs.length)return null;return{simp,trad,pinyin:py,defs,pos:e.pos||v30GuessPos(defs),src:'CC-CEDICT'};}
function v30LocalEntry(q){const x=V30_LOCAL_DICT[q];if(!x)return null;return{simp:x.simp||q,trad:x.trad||'',pinyin:x.pinyin||getWordPY(q),defs:x.defs||[],pos:x.pos||v30GuessPos(x.defs||[]),src:'Local',examples:x.examples||[]};}
try{window.v30LocalEntry=v30LocalEntry;window.V30_LOCAL_DICT=V30_LOCAL_DICT;}catch{}
function v30ExactEntryFirst(entries,q){const seen=new Set(),out=[];for(const e of entries){if(!e)continue;const key=(e.simp||'')+'|'+(e.trad||'')+'|'+(e.pinyin||'')+'|'+(e.defs||[]).join('/');if(seen.has(key))continue;seen.add(key);out.push(e);}out.sort((a,b)=>{const ae=(a.simp===q||a.trad===q)?0:1;const be=(b.simp===q||b.trad===q)?0:1;return ae-be||((a.simp||'').length-(b.simp||'').length);});return out;}
async function v30LookupEntries(q){let raw=[];try{raw=await v29CedictRaw(q)}catch{}let entries=(raw||[]).map(e=>v30NormalizeCedict(e,q)).filter(Boolean);const loc=v30LocalEntry(q);if(loc)entries.unshift(loc);if(!entries.length){const res=await lookupAll(q);if(res&&res.defs){const defs=[];res.defs.forEach(s=>(s.defs||[]).forEach(d=>defs.push(d.text)));entries.push({simp:q,trad:'',pinyin:getWordPY(q),defs, pos:v30GuessPos(defs),src:res.src||'Wiktionary'});}}
return v30ExactEntryFirst(entries,q);
}
function v30EntryHtml(e,i,q){const trad=e.trad&&e.trad!==e.simp?v29TradMask(e.simp,e.trad):'';let html=`<div class="lexi-entry"><div class="lexi-pos">${esc(e.pos||v30GuessPos(e.defs))}<span class="lexi-source">${esc(e.src||'DICT')}</span></div>`;if(trad)html+=`<div class="lexi-trad">Tradicional ${esc(trad)}</div>`;(e.defs||[]).slice(0,10).forEach((d,k)=>{html+=`<div class="lexi-def"><span class="lexi-num">${k+1}</span>${esc(d)}</div>`;});const examples=(e.examples||[]).filter(x=>x&&x[0]&&v30ContainsTerm(x[0],q)).slice(0,4);for(const ex of examples){const key=v30CacheSentenceAudio(ex[0],[]);html+=`<div class="lexi-ex"><div class="lexi-ex-zh">${esc(ex[0])} <button class="lexi-audio" onclick="v30SpeakSentence('${key}')">▶</button></div><div class="lexi-ex-py">${esc(ex[1]||getWordPY(ex[0]))}</div><div class="lexi-ex-tr">${esc(ex[2]||'')}</div></div>`;}html+=`<div class="lexi-meta"><span class="lexi-chip">${esc(e.pinyin||getWordPY(e.simp))}</span>${e.trad&&e.trad!==e.simp?`<span class="lexi-chip">${esc(e.trad)}</span>`:''}</div></div>`;return html;}
async function v29RenderDictDefs(q,out){const entries=await v30LookupEntries(q);const main=entries[0]||{simp:q,trad:'',pinyin:getWordPY(q),defs:[],pos:'',src:'—'};const heroWord=main.simp||q;let html=`<div class="dict-results-lexi"><div class="lexi-hero"><div class="lexi-zh ${[...heroWord].length>3?'small':''}">${esc(heroWord)}</div><div class="lexi-py">PY ${esc(main.pinyin||getWordPY(q))}<button class="lexi-audio" onclick="speakWordMode('${v30Js(heroWord)}','natural')">▶</button><span class="lexi-source">${esc(main.src||'DICT')}</span></div>${main.trad&&main.trad!==main.simp?`<div class="lexi-variants"><b>Trad.</b> ${esc(v29TradMask(main.simp,main.trad))}</div>`:''}</div>`;if(entries.length){entries.slice(0,8).forEach((e,i)=>html+=v30EntryHtml(e,i,q));}else{html+=`<div class="dict-empty">Sem definição encontrada nos bancos atuais. Tente uma palavra composta ou um ideograma isolado.</div>`;}html+=`</div>`;out.innerHTML=html;}
async function v30WordCandidates(q){let entries=[];try{entries=(await v29CedictRaw(q)||[]).map(e=>v30NormalizeCedict(e,q)).filter(Boolean)}catch{}const locKeys=[...Object.keys(V30_LOCAL_DICT),...V30_EXTRA_WORDS,...HSK_LEVEL.keys()];const map=new Map();function add(w,meta={}){if(!w||w===q)return;if(v30ContainsTerm(w,q)){const old=map.get(w)||{};map.set(w,{...old,...meta,word:w});}}
for(const e of entries){add(e.simp,{entry:e}); if(e.trad)add(e.trad,{entry:e});}
for(const w of locKeys)add(w,{level:HSK_LEVEL.get(w)||''});
const arr=[...map.values()].sort((a,b)=>{const aw=a.word.startsWith(q)?0:1,bw=b.word.startsWith(q)?0:1;return aw-bw||a.word.length-b.word.length||a.word.localeCompare(b.word);}).slice(0,80);
return arr;
}
async function v29RenderDictWords(q,out){const words=await v30WordCandidates(q);if(!words.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras formadas com esse termo nos bancos atuais.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">▼ Words containing / beginning</div>'+words.map(item=>{const w=item.word;const e=item.entry||v30LocalEntry(w);const py=(e&&e.pinyin)||getWordPY(w);const defs=(e&&e.defs&&e.defs.length?e.defs.slice(0,3).join('; '):'Toque para consultar a definição completa.');const trad=e&&e.trad&&e.trad!==e.simp?v29TradMask(e.simp,e.trad):'';return `<div class="dict-item dict-word-click" onclick="v30DictJump('${v30Js(w)}')"><div class="dict-item-main"><div class="zh">${esc(w)}${trad?` <span class="trad">${esc(trad)}</span>`:''}</div><div class="py">${esc(py)}</div><div class="en"><span class="posline">${esc(e?.pos||'')}</span>${esc(defs)}</div></div><button class="dict-audio" onclick="event.stopPropagation();speakWordMode('${v30Js(w)}','natural')">▶</button></div>`;}).join('')+'</div>';}
function v30DictJump(w){v29DictTerm=w;const q=document.getElementById('dict-q');if(q)q.value=w;v29DictTab='defs';v29RenderDictCurrent(true);}
function v30ExtractTranslation(x){try{const fl=(x.translations||[]).flat(Infinity).filter(Boolean);const pref=fl.find(t=>/^(eng|por|pt|en)$/i.test(t.lang||t.lang_tag||''))||fl[0];return pref?.text||'';}catch{return'';}}
function v30ExtractTatoebaAudio(x){const urls=[];function add(u){if(u&&typeof u==='string')urls.push(u.startsWith('//')?'https:'+u:u);}function scan(o){if(!o||typeof o!=='object')return;if(Array.isArray(o)){o.forEach(scan);return;}['url','download_url','audio_url','file','path','mp3'].forEach(k=>add(o[k]));if(o.id){add(`https://tatoeba.org/en/audio/download/${o.id}`);} }
scan(x.audios);scan(x.audio);if(x.id&&(x.has_audio||x.hasAudio||String(x.audio||'').length)){add(`https://audio.tatoeba.org/sentences/cmn/${x.id}.mp3`);add(`https://tatoeba.org/en/audio/download/${x.id}`);}return [...new Set(urls)];}
async function v29Tatoeba(q){const queries=[`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&has_audio=yes&word_count_max=28`,`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(q)}&trans_to=eng&sort=relevance&orphans=no&word_count_max=28`];const found=[];for(const url of queries){try{const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(!r.ok)continue;const d=await r.json();for(const x of d.results||[]){const zh=x.text||'';if(!v30ContainsTerm(zh,q))continue;found.push({zh,tr:v30ExtractTranslation(x),audioUrls:v30ExtractTatoebaAudio(x),src:(x.has_audio||x.audios?.length)?'Tatoeba áudio':'Tatoeba'});} }catch{}}
const seen=new Set();return found.filter(s=>{if(seen.has(s.zh))return false;seen.add(s.zh);return true;}).slice(0,12);}
function v30CacheSentenceAudio(zh,urls){const key='s'+Math.random().toString(36).slice(2);window.V30_SENT_AUDIO=window.V30_SENT_AUDIO||{};window.V30_SENT_AUDIO[key]={zh,urls:urls||[]};return key;}
async function v29RenderDictSentences(q,out){let sents=await v29Tatoeba(q);const local=V30_LOCAL_SENTENCES.filter(s=>v30ContainsTerm(s.zh,q));for(const s of local){if(!sents.some(x=>x.zh===s.zh))sents.push({...s,audioUrls:[]});}sents=sents.filter(s=>v30ContainsTerm(s.zh,q));if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente esse termo. Para palavra composta, agora o app não mostra frase aproximada sem a palavra pesquisada.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">▼ Frases com o termo pesquisado</div>'+sents.slice(0,14).map(s=>{const key=v30CacheSentenceAudio(s.zh,s.audioUrls||[]);return `<div class="sent-card"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)} <button class="lexi-audio" onclick="v30SpeakSentence('${key}')">▶</button></div><div class="sent-py">${esc(getWordPY(s.zh))}</div></div></div><div class="sent-tr">${esc(s.tr||'Tradução humana indisponível nesta fonte.')}</div><div class="sent-src">${esc(s.src||'Banco de frases')} • filtrado por presença real de “${esc(q)}”</div></div>`;}).join('')+'</div>';}

const V30_AUDIO_SOURCES=[
 {name:'Youdao dictvoice 1',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`},
 {name:'Youdao dictvoice 2',url:w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`},
 {name:'Youdao fanyivoice zh',url:w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh&keyfrom=speaker-target`},
 {name:'Youdao fanyivoice',url:w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`}
];
playUrl=function(url){return new Promise((res,rej)=>{try{stopAudio();}catch{}const a=new Audio();curAudio=a;a.preload='auto';a.crossOrigin='anonymous';a.referrerPolicy='no-referrer';let done=false;const finish=(ok,err)=>{if(done)return;done=true;clearTimeout(t);if(ok)res();else rej(err||new Error('audio'));};const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;finish(false,new Error('timeout'));},10500);a.onended=()=>{curAudio=null;finish(true);};a.onerror=()=>{curAudio=null;finish(false,new Error('audio'));};a.oncanplaythrough=()=>{};a.src=url;const p=a.play();if(p&&p.catch)p.catch(e=>{curAudio=null;finish(false,e);});});};
playNaturalDirect=async function(word){for(const src of V30_AUDIO_SOURCES){try{await playUrl(src.url(word));return true;}catch(e){}}return false;};
async function v30PlayUrls(urls){for(const u of urls||[]){try{await playUrl(u);return true;}catch{}}return false;}
playNaturalDb=async function(word,{discover=true}={}){if(await playNaturalDirect(word))return true;if(discover&&await playNaturalDiscovered(word))return true;return false;};
function v30AudioSegments(text){const parts=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){parts.push(...segmentChineseRun(run));run='';}if(/[，,、；;：:。！？!?]/.test(ch))parts.push(ch);}if(run)parts.push(...segmentChineseRun(run));return parts.filter(Boolean);}
async function v30PlayTextNatural(text){const parts=v30AudioSegments(text);let ok=false;for(const p of parts){if(/[，,、；;：:]/.test(p)){await delay(95);continue;}if(/[。！？!?]/.test(p)){await delay(190);continue;}const got=await playNaturalDb(p,{discover:false})||([...p].length>1?await playCjkSequence([...p].filter(isCJK),28,{discover:false}):false);if(got)ok=true;await delay(42);}return ok;}
speakWordMode=async function(word,mode='natural'){stopAudio();setAudioBusy(mode,true);const cjk=[...String(word)].filter(isCJK);try{if(!cjk.length)return;let ok=false;if(mode==='natural'){ok=await playNaturalDb(word,{discover:true});if(!ok&&cjk.length>1)ok=await v30PlayTextNatural(word);if(!ok)ok=await playCjkSequence(cjk,28,{discover:false});}else{ok=await playCjkSequence(cjk,115,{discover:false});if(!ok)ok=await playNaturalDb(word,{discover:true});}if(!ok)toast('Áudio natural não encontrado nas rotas atuais');}finally{setAudioBusy(mode,false);}};
speakWord=function(word){return speakWordMode(word,'natural');};
window.v30SpeakSentence=async function(key){const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;setAudioBusy('natural',true);try{let ok=await v30PlayUrls(data.urls||[]);if(!ok)ok=await playNaturalDb(data.zh,{discover:true});if(!ok)ok=await v30PlayTextNatural(data.zh);if(!ok)toast('Áudio natural da frase não encontrado; fallback por palavras também falhou');}finally{setAudioBusy('natural',false);}};

function v30Boot(){try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.0';const h=document.querySelector('#sx .dict-head h1');if(h)h.textContent='Dicionário';const ds=document.querySelector('.dict-search');if(ds&&!ds.querySelector('.dict-back-mini')){const b=document.createElement('button');b.className='dict-back-mini';b.textContent='‹';ds.insertBefore(b,ds.firstChild);}document.querySelectorAll('.dict-tab').forEach(btn=>{if(btn.dataset.dtab==='defs')btn.textContent='DICT';if(btn.dataset.dtab==='words')btn.textContent='WORDS';if(btn.dataset.dtab==='sents')btn.textContent='SENTS';});}catch{}}
window.v30DictJump=v30DictJump;
setTimeout(v30Boot,320);
})();



/* v3.1 HOTFIX: restaura o motor de áudio estável das versões 2.5/2.6.
   O bug das versões novas vinha do player reescrito com crossOrigin/referrerPolicy,
   que pode fazer endpoints de áudio antigos falharem no Android/WebView. */
(function(){
const HR31_AUDIO_SOURCES=[
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`,
  w=>`https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=zh-CN&q=${encodeURIComponent(w)}&client=tw-ob`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`,
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh`
];
function hr31StopAudio(){
  if(curAudio){try{curAudio.pause();}catch{} curAudio=null;}
  try{speechSynthesis?.cancel();}catch{}
}
function hr31SetBusy(mode,on){
  ['tip-audio','tip-natural','tip-slow','tone-natural','tone-slow'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('pl');});
  if(on){const ids=mode==='slow'?['tip-slow','tone-slow']:['tip-audio','tip-natural','tone-natural'];ids.forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('pl');});}
}
function hr31PlayUrl(url){
  return new Promise((res,rej)=>{
    const a=new Audio(url);
    curAudio=a;
    const t=setTimeout(()=>{try{a.pause();}catch{} curAudio=null;rej(new Error('to'));},7000);
    a.onended=()=>{clearTimeout(t);curAudio=null;res();};
    a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};
    const p=a.play();
    if(p&&p.catch)p.catch(e=>{clearTimeout(t);curAudio=null;rej(e);});
  });
}
async function hr31PlayFromStableSources(text){
  for(const src of HR31_AUDIO_SOURCES){try{await hr31PlayUrl(src(text));return true;}catch(e){}}
  return false;
}
async function hr31PlayChars(chars,pauseMs){
  let ok=false;
  for(const ch of chars){
    if(!isCJK(ch))continue;
    if(await hr31PlayFromStableSources(ch))ok=true;
    await delay(pauseMs);
  }
  return ok;
}
function hr31Segments(text){
  const out=[];let run='';
  for(const ch of [...String(text||'')]){
    if(isCJK(ch)){run+=ch;continue;}
    if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}run='';}
    if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);
  }
  if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}}
  return out.filter(Boolean);
}
async function hr31PlayText(text){
  const parts=hr31Segments(text);let ok=false;
  for(const p of parts){
    if(/[，,、；;：:]/.test(p)){await delay(80);continue;}
    if(/[。！？!?]/.test(p)){await delay(170);continue;}
    const got=await hr31PlayFromStableSources(p)||([...p].some(isCJK)?await hr31PlayChars([...p].filter(isCJK),35):false);
    if(got)ok=true;
    await delay(36);
  }
  return ok;
}
playUrl=hr31PlayUrl;
playNaturalDirect=async function(word){return await hr31PlayFromStableSources(word);};
playNaturalDb=async function(word,{discover=true}={}){
  if(await hr31PlayFromStableSources(word))return true;
  if(discover&&typeof playNaturalDiscovered==='function'&&await playNaturalDiscovered(word))return true;
  return false;
};
playCjkSequence=async function(chars,pauseMs,{discover=false}={}){return await hr31PlayChars(chars,pauseMs);};
speakWordMode=async function(word,mode='natural'){
  hr31StopAudio();hr31SetBusy(mode,true);
  const cjk=[...String(word||'')].filter(isCJK);
  try{
    if(!cjk.length)return;
    let ok=false;
    if(mode==='slow'){
      ok=await hr31PlayChars(cjk,150);
      if(!ok)ok=await hr31PlayFromStableSources(word);
    }else{
      ok=await hr31PlayFromStableSources(word);
      if(!ok&&cjk.length>1)ok=await hr31PlayChars(cjk,38);
      if(!ok&&cjk.length===1)ok=await hr31PlayFromStableSources(cjk[0]);
    }
    if(!ok)toast('Não consegui reproduzir nas rotas de áudio desta conexão.');
  }finally{hr31SetBusy(mode,false);}
};
speakWord=function(word){return speakWordMode(word,'natural');};
window.v30SpeakSentence=async function(key){
  const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;
  hr31StopAudio();hr31SetBusy('natural',true);
  try{
    let ok=false;
    for(const u of data.urls||[]){try{await hr31PlayUrl(u);ok=true;break;}catch(e){}}
    if(!ok)ok=await hr31PlayFromStableSources(data.zh);
    if(!ok)ok=await hr31PlayText(data.zh);
    if(!ok)toast('Não consegui reproduzir o áudio da frase nas rotas atuais.');
  }finally{hr31SetBusy('natural',false);}
};
try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.1';}catch{}
})();


/* ===== v32-script ===== */
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
   // Rebuild toolbar for books: add Importar button before Novo livro so users can
   // import local book sources.  Keep existing Novo livro and view toggles.
   bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-import-chip">Importar</button><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;
   document.getElementById('view-cover').onclick=()=>{v29BookView='cover';localStorage.setItem('hbookView',v29BookView);renderLib();};document.getElementById('view-list').onclick=()=>{v29BookView='list';localStorage.setItem('hbookView',v29BookView);renderLib();};
   const wrap=document.getElementById('book-wrap'); if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em Importar ou Novo livro para adicionar.</div>';return;}
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
  if(window.readerTokens&&readerTokens.length){document.querySelectorAll('#rtext .wunit[data-tid]').forEach(el=>{const tok=readerTokens[+el.dataset.tid];if(!tok)return;tok.level=getWordLevel(tok.word);el.classList.remove('lv1','lv2','lv3','lv4','lv5','lv6','lv7','lv8','lv9','lvx');el.classList.add(levelClass(tok.level));el.dataset.lv=tok.level>=1&&tok.level<=9?String(tok.level):'x';});try{applyPinyin();}catch{}}
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


/* Cache local para acelerar dicionário/definições: evita repetir chamadas externas quando o usuário toca várias vezes no mesmo termo. */
const HZ_DICT_CACHE_TTL=1000*60*60*24*14;
const HZ_DICT_MEM_CACHE=new Map();
function hzDictCacheKey(kind,word){return 'hzdict.cache.'+kind+'.'+String(word||'').trim();}
function hzDictCacheRead(kind,word){
  const k=hzDictCacheKey(kind,word);
  if(HZ_DICT_MEM_CACHE.has(k))return HZ_DICT_MEM_CACHE.get(k);
  try{const raw=localStorage.getItem(k);if(!raw)return null;const o=JSON.parse(raw);if(!o||Date.now()-o.t>HZ_DICT_CACHE_TTL)return null;HZ_DICT_MEM_CACHE.set(k,o.v);return o.v;}catch{return null;}
}
function hzDictCacheWrite(kind,word,val){
  const k=hzDictCacheKey(kind,word);
  HZ_DICT_MEM_CACHE.set(k,val);
  try{localStorage.setItem(k,JSON.stringify({t:Date.now(),v:val}));}catch{}
  return val;
}
const HZ_LOOKUP_ALL_CORE=lookupAll;
function hzFastLocalLookup(word){
  const q=String(word||'').trim();
  let e=null;
  try{e=(typeof window.v34EntryLocal==='function'&&window.v34EntryLocal(q))||null;}catch{}
  try{if(!e&&typeof window.v30LocalEntry==='function')e=window.v30LocalEntry(q);}catch{}
  try{if(!e&&typeof window.V32_LOCAL_MORE==='object')e=window.V32_LOCAL_MORE[q]||null;}catch{}
  if(!e)return null;
  const raw=Array.isArray(e.pt)&&e.pt.length?e.pt:(Array.isArray(e.defs)?e.defs:(Array.isArray(e.en)?e.en:[]));
  const defs=raw.map(x=>typeof x==='string'?x:(x&&x.text)||'').filter(Boolean).map(text=>({text,ex:[]}));
  if(!defs.length)return null;
  return{defs:[{pos:e.pos||'',defs}],src:'Dicionário local',pinyin:e.pinyin||e.py||'',traditional:e.trad||''};
}
lookupAll=async function(word){
  const q=String(word||'').trim();
  if(!q)return null;
  const cached=hzDictCacheRead('lookupAll',q);
  if(cached)return cached;
  const local=hzFastLocalLookup(q);
  const core=Promise.resolve().then(()=>HZ_LOOKUP_ALL_CORE(q)).then(res=>{
    if(res)hzDictCacheWrite('lookupAll',q,res);
    return res||null;
  }).catch(()=>null);
  const budget=local?1800:6500;
  const res=await Promise.race([core,new Promise(resolve=>setTimeout(()=>resolve(null),budget))]);
  return res||local;
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


/* ===== v34-script ===== */
(function(){
'use strict';
const V34_VERSION='v3.5';
function v34Svg(name){
 const sv={search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="11" cy="11" r="7"></circle><line x1="20" y1="20" x2="16.2" y2="16.2"></line></svg>',play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"></path></svg>',sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 010 7"></path></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>',full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5"></path><path d="M16 3h5v5"></path><path d="M21 16v5h-5"></path><path d="M3 16v5h5"></path></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="10" x2="12" y2="16"></line><circle cx="12" cy="7" r="1"></circle></svg>'};return sv[name]||'';
}
function v34Decode(s){s=String(s||'');try{const ta=document.createElement('textarea');ta.innerHTML=s.replace(/&nbsp;/g,' ');s=ta.value;}catch{}return s.replace(/<[^>]*>/g,' ').replace(/\bCL:\s*/gi,'Classifier: ').replace(/\s*m;\s*/g,'; ').replace(/\s+/g,' ').replace(/\s+([,.;:!?，。；：！？])/g,'$1').trim();}
function v34CleanDef(s){s=v34Decode(s);s=s.replace(/\(Classifier:\s*([^)]*)\)/gi,(m,x)=>{x=x.replace(/\|/g,' / ').replace(/\s+/g,' ').trim();return x?'(Classifier: '+x+')':'';});return s.replace(/\s+/g,' ').trim();}
function v34Cjk(q){return [...String(q||'')].filter(ch=>typeof isCJK==='function'?isCJK(ch):/[\u3400-\u9fff]/.test(ch)).join('');}
function v34Contains(text,q){text=String(text||'');const c=v34Cjk(q);if(c)return text.includes(c);return text.toLowerCase().includes(String(q||'').trim().toLowerCase());}
function v34SafeId(){return 'v34_'+Math.random().toString(36).slice(2)+Date.now().toString(36);}
function v34EntryLocal(q){return V34_DICT[q]||null;}
try{window.v34EntryLocal=v34EntryLocal;window.V34_DICT=V34_DICT;}catch{}
function v34MakeGroup(pos,defs){return {pos:pos||'',defs:(defs||[]).map(t=>({text:v34CleanDef(t),ex:[]})).filter(x=>x.text)};}
const V34_DICT={
 '意思':{simp:'意思',trad:'意思',pinyin:'yìsi',pos:'NOUN',pt:['significado; sentido','ideia; intenção','opinião; ponto de vista'],en:['meaning; sense','idea; intention','opinion; view'],examples:[['这个词是什么意思？','zhè ge cí shì shénme yìsi?','What does this word mean?','O que esta palavra significa?'],['这句话的意思很清楚。','zhè jù huà de yìsi hěn qīngchu.','The meaning of this sentence is very clear.','O sentido desta frase é muito claro.'],['这次旅行很有意思。','zhè cì lǚxíng hěn yǒu yìsi.','This trip was very interesting.','Esta viagem foi muito interessante.']]},
 '有意思':{simp:'有意思',trad:'有意思',pinyin:'yǒu yìsi',pos:'ADJECTIVE',pt:['interessante; divertido','ter sentido; ser significativo'],en:['interesting; enjoyable','meaningful; to make sense'],examples:[['这本书很有意思。','zhè běn shū hěn yǒu yìsi.','This book is very interesting.','Este livro é muito interessante.']]},
 '遗憾':{simp:'遗憾',trad:'遺憾',pinyin:'yíhàn',pos:'NOUN / VERB / ADJECTIVE',pt:['arrependimento; pesar; pena','lamentar; sentir pena','lamentável'],en:['regret; pity; remorse','to regret; to be sorry','regrettable'],examples:[['我对这件事感到遗憾。','wǒ duì zhè jiàn shì gǎndào yíhàn.','I feel regret about this matter.','Eu sinto pesar por esse assunto.'],['他的话里带着遗憾。','tā de huà lǐ dàizhe yíhàn.','There was regret in his words.','Havia arrependimento nas palavras dele.'],['最大的遗憾是没有早点开始。','zuì dà de yíhàn shì méiyǒu zǎodiǎn kāishǐ.','The greatest regret is not having started earlier.','O maior arrependimento é não ter começado mais cedo.']]},
 '感情':{simp:'感情',trad:'感情',pinyin:'gǎnqíng',pos:'NOUN',pt:['sentimento; emoção','afeto; vínculo emocional'],en:['feeling; emotion','affection; emotional attachment'],examples:[['他不太会表达感情。','tā bú tài huì biǎodá gǎnqíng.','He is not very good at expressing feelings.','Ele não sabe muito bem expressar sentimentos.']]},
 '感觉':{simp:'感觉',trad:'感覺',pinyin:'gǎnjué',pos:'NOUN / VERB',pt:['sensação; sentimento','sentir; achar'],en:['feeling; sensation','to feel; to think'],examples:[['我感觉今天很冷。','wǒ gǎnjué jīntiān hěn lěng.','I feel it is cold today.','Eu sinto que hoje está frio.']]},
 '月':{simp:'月',trad:'月',pinyin:'yuè',pos:'NOUN',pt:['lua','mês'],en:['moon','month','monthly'],examples:[['这个月我想多读中文。','zhè ge yuè wǒ xiǎng duō dú zhōngwén.','This month I want to read more Chinese.','Este mês quero ler mais chinês.']]},
 '圆':{simp:'圆',trad:'圓',pinyin:'yuán',pos:'NOUN / ADJECTIVE / VERB',pt:['círculo; esfera','redondo; circular','tornar plausível; justificar'],en:['circle; sphere; ring','round; circular','to make plausible; to justify'],examples:[['今晚的月亮很圆。','jīnwǎn de yuèliang hěn yuán.','The moon is very round tonight.','A lua está bem redonda hoje à noite.']]},
 '旅行':{simp:'旅行',trad:'旅行',pinyin:'lǚxíng',pos:'VERB / NOUN',pt:['viajar; viagem'],en:['to travel; journey; trip'],examples:[['上个周末，我和朋友去旅行。','shàng ge zhōumò, wǒ hé péngyou qù lǚxíng.','Last weekend, I went traveling with a friend.','No último fim de semana, viajei com um amigo.']]},
 '博物馆':{simp:'博物馆',trad:'博物館',pinyin:'bówùguǎn',pos:'NOUN',pt:['museu'],en:['museum'],examples:[['我们参观了一个小博物馆。','wǒmen cānguān le yí ge xiǎo bówùguǎn.','We visited a small museum.','Nós visitamos um pequeno museu.']]},
 '参观':{simp:'参观',trad:'參觀',pinyin:'cānguān',pos:'VERB',pt:['visitar; fazer uma visita'],en:['to visit; to look around'],examples:[['他们今天参观学校。','tāmen jīntiān cānguān xuéxiào.','They are visiting the school today.','Eles estão visitando a escola hoje.']]},
 '围棋':{simp:'围棋',trad:'圍棋',pinyin:'wéiqí',pos:'NOUN',pt:['go; jogo de tabuleiro weiqi'],en:['Go; the board game weiqi'],examples:[['我喜欢下围棋。','wǒ xǐhuān xià wéiqí.','I like playing Go.','Eu gosto de jogar Go.'],['围棋有黑白两种棋子。','wéiqí yǒu hēibái liǎng zhǒng qízǐ.','Go has black and white stones.','O Go tem peças pretas e brancas.']]},
 '棋子':{simp:'棋子',trad:'棋子',pinyin:'qízǐ',pos:'NOUN',pt:['peça de jogo; pedra do Go'],en:['game piece; chess piece; stone in Go'],examples:[['黑色棋子先行。','hēisè qízǐ xiānxíng.','The black stones move first.','As peças pretas jogam primeiro.']]},
 '规定':{simp:'规定',trad:'規定',pinyin:'guīdìng',pos:'NOUN / VERB',pt:['regra; regulamento','estipular; determinar'],en:['rule; regulation','to stipulate; to prescribe'],examples:[['比赛有自己的规定。','bǐsài yǒu zìjǐ de guīdìng.','The match has its own rules.','A partida tem suas próprias regras.']]},
 '过程':{simp:'过程',trad:'過程',pinyin:'guòchéng',pos:'NOUN',pt:['processo; curso'],en:['process; course'],examples:[['学习是一个过程。','xuéxí shì yí ge guòchéng.','Learning is a process.','Aprender é um processo.']]},
 '有':{simp:'有',trad:'有',pinyin:'yǒu',pos:'VERB',pt:['ter; haver; existir'],en:['to have; there is; to exist']},
 '在':{simp:'在',trad:'在',pinyin:'zài',pos:'VERB / PREP',pt:['estar em; estar presente','em; no; na'],en:['to be at/in/on','at; in; on']},
 '的':{simp:'的',trad:'的',pinyin:'de',pos:'PARTICLE',pt:['partícula possessiva/descritiva'],en:['possessive/descriptive particle']}
};
const V34_SENTENCES=[...Object.values(V34_DICT).flatMap(e=>(e.examples||[]).map(x=>({zh:x[0],py:x[1],en:x[2],pt:x[3],src:'Local'}))),{zh:'遗憾在日常生活中很常用。',py:'yíhàn zài rìcháng shēnghuó zhōng hěn chángyòng.',en:'“Regret” is very commonly used in daily life.',pt:'“Arrependimento” é muito usado no dia a dia.',src:'Local'}];
function v34LocalResult(word){const e=v34EntryLocal(word);if(!e)return null;const groups=[];if(e.pt)groups.push(v34MakeGroup('TRADUÇÃO',e.pt));if(e.en)groups.push(v34MakeGroup(e.pos||'DEFINIÇÃO',e.en));return {defs:groups,src:'Local',entry:e};}
async function v34CedictEntries(q){const arr=[];try{if(typeof v29CedictRaw==='function'){const raw=await v29CedictRaw(q)||[];for(const e of raw){const simp=e.simplified||e.simp||e.s||e.word||e.chinese||q;const trad=e.traditional||e.trad||e.t||'';const pinyin=e.pinyin||e.py||getWordPY(simp);let defs=[];if(Array.isArray(e.english))defs=e.english;else if(Array.isArray(e.definitions))defs=e.definitions;else if(Array.isArray(e.defs))defs=e.defs;else if(e.definition)defs=String(e.definition).split(/[;\/]/);defs=defs.map(v34CleanDef).filter(Boolean);if(simp&&defs.length)arr.push({simp,trad,pinyin,pos:'CC-CEDICT',en:defs,src:'CC-CEDICT'});}}}catch{}return arr;}
async function v34LookupEntries(q){const entries=[];const loc=v34EntryLocal(q);if(loc)entries.push({...loc,src:'Local'});const ced=await v34CedictEntries(q);for(const e of ced){if(!entries.some(x=>(x.simp||'')===(e.simp||'')))entries.push(e);}if(!entries.length){try{const res=await lookupAll(q);if(res&&res.defs){const defs=[];res.defs.forEach(g=>(g.defs||[]).forEach(d=>{const t=v34CleanDef(d.text);if(t)defs.push(t);}));if(defs.length)entries.push({simp:q,trad:'',pinyin:getWordPY(q),pos:'Wiktionary',en:[...new Set(defs)],src:res.src||'Wiktionary'});}}catch{}}
 return entries;}
function v34TransButton(text){const id=v34SafeId();return `<span class="auto-row"><span id="${id}">${esc(text||'')}</span><button class="auto-trans-btn" data-auto-trans="${id}" data-auto-text="${esc(text||'')}">PT</button></span>`;}
function v34BindAuto(root){(root||document).querySelectorAll('[data-auto-trans]').forEach(btn=>{if(btn._v34)return;btn._v34=true;btn.onclick=async e=>{e.stopPropagation();const id=btn.dataset.autoTrans;const text=btn.dataset.autoText||'';const target=document.getElementById(id);if(!target||!text)return;const pop=document.createElement('span');pop.className='auto-pop';pop.textContent='tradução automática';btn.appendChild(pop);btn.disabled=true;try{const lp=v34Cjk(text)?'zh-CN|pt-BR':'en|pt-BR';const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(lp)}`,{signal:AbortSignal.timeout(7000)});const d=await r.json();const tr=d?.responseData?.translatedText;if(tr&&tr!==text)target.textContent=tr;else target.textContent='Tradução automática indisponível';}catch{target.textContent='Tradução automática indisponível';}finally{setTimeout(()=>pop.remove(),550);btn.remove();}};});}
function v34BindAudio(root){(root||document).querySelectorAll('[data-v34-speak]').forEach(btn=>{if(btn._v34a)return;btn._v34a=true;btn.onclick=e=>{e.stopPropagation();speakWordMode(btn.dataset.v34Speak||'',btn.dataset.v34Mode||'natural');};});}
function v34AudioButton(text,label=''){return `<button class="lexi-audio ${label?'':'v34-svg-only'}" data-v34-speak="${esc(text||'')}" data-v34-mode="natural" title="Pronúncia">${v34Svg('sound')}${label?`<span>${esc(label)}</span>`:''}</button>`;}
function v34EntryHtml(e,q){const word=e.simp||q;const trad=e.trad&&e.trad!==word?(typeof v29TradMask==='function'?v29TradMask(word,e.trad):e.trad):'';let html='<div class="lexi-entry">';if(e.pt&&e.pt.length){html+='<div class="lexi-section-title">Tradução</div>';e.pt.slice(0,5).forEach((d,i)=>html+=`<div class="lexi-def"><span class="lexi-num">${i+1}</span>${esc(v34CleanDef(d))}</div>`);}else if(e.en&&e.en.length){html+='<div class="lexi-section-title">Tradução / EN</div>';e.en.slice(0,5).forEach((d,i)=>html+=`<div class="lexi-def"><span class="lexi-num">${i+1}</span>${v34TransButton(v34CleanDef(d))}</div>`);}html+=`<div class="lexi-pos">${esc(e.pos||'DEFINIÇÃO')}<span class="lexi-source">${esc(e.src||'DICT')}</span></div>`;(e.en||[]).slice(0,8).forEach((d,i)=>html+=`<div class="lexi-def"><span class="lexi-num">${i+1}</span>${esc(v34CleanDef(d))}</div>`);if(trad)html+=`<div class="lexi-trad"><b>Tradicional</b> ${esc(trad)}</div>`;html+=`<div class="lexi-meta"><span class="lexi-chip">${esc(e.pinyin||getWordPY(word))}</span></div>`;html+='</div>';return html;}
v29RenderDictDefs=async function(q,out){q=String(q||'').trim();if(!out)return;out.innerHTML='<div class="dict-empty"><div class="spin sm"></div></div>';const entries=await v34LookupEntries(q);const main=entries[0]||{simp:q,trad:'',pinyin:getWordPY(q),en:[],src:'—'};let html=`<div class="dict-results-lexi"><div class="lexi-hero"><div><div class="lexi-zh ${[...(main.simp||q)].length>3?'small':''}">${esc(main.simp||q)}</div></div>${v34AudioButton(main.simp||q)}<div class="lexi-py">PY ${esc(main.pinyin||getWordPY(q))}<span class="lexi-source">${esc(main.src||'DICT')}</span></div>${main.trad&&main.trad!==main.simp?`<div class="lexi-variants"><b>Trad.</b> ${esc(typeof v29TradMask==='function'?v29TradMask(main.simp,main.trad):main.trad)}</div>`:''}</div>`;if(entries.length)entries.slice(0,10).forEach(e=>html+=v34EntryHtml(e,q));else html+='<div class="dict-empty">Sem definição encontrada nos bancos atuais.</div>';html+='</div>';out.innerHTML=html;v34BindAudio(out);v34BindAuto(out);};
function v34CandidateWords(q){const keys=new Set(Object.keys(V34_DICT));try{if(typeof SEG_WORDS!=='undefined')SEG_WORDS.forEach(w=>keys.add(w));}catch{}['月亮','月饼','月光','月下','月份','本月','隔月','逐月','月球','月台','有意思','意思','感情','感觉','遗憾','后悔','旅行','博物馆','参观','围棋','棋子','棋盘','对弈','交叉点','胜负','规定','过程'].forEach(w=>keys.add(w));return [...keys].filter(w=>w&&w!==q&&v34Contains(w,q)).sort((a,b)=>a.length-b.length||a.localeCompare(b,'zh')).slice(0,60);}
v29RenderDictWords=async function(q,out){if(!out)return;let words=v34CandidateWords(q);try{const ced=await v34CedictEntries(q);for(const e of ced){if(e.simp&&e.simp!==q&&v34Contains(e.simp,q)&&!words.includes(e.simp))words.unshift(e.simp);}}catch{}if(!words.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras relacionadas nos bancos atuais.</div>';return;}let html='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que contêm o termo pesquisado</div>';for(const w of words.slice(0,40)){const e=v34EntryLocal(w)||{};const defs=(e.pt||e.en||[]).slice(0,2).join('; ');const trad=e.trad&&e.trad!==w?`<span class="trad">〔${esc(typeof v29TradMask==='function'?v29TradMask(w,e.trad):e.trad)}〕</span>`:'';html+=`<div class="dict-item"><div class="dict-item-main dict-word-click" data-dict-word="${esc(w)}"><div class="zh">${esc(w)}${trad}</div><div class="py">${esc(e.pinyin||getWordPY(w))}</div><div class="en"><span class="posline">${esc(e.pos||'')}</span>${defs?esc(defs):'Toque para pesquisar esta palavra.'}</div></div>${v34AudioButton(w)}</div>`;}html+='</div>';out.innerHTML=html;v34BindAudio(out);out.querySelectorAll('[data-dict-word]').forEach(el=>el.onclick=()=>{const qin=document.getElementById('dict-q');if(qin)qin.value=el.dataset.dictWord;try{v29DoDictSearch(el.dataset.dictWord);}catch{}});};
async function v34Tatoeba(q){const found=[];try{const url=`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(v34Cjk(q)||q)}&trans_to=eng&sort=relevance&orphans=no&word_count_max=28`;const r=await fetch(url,{signal:AbortSignal.timeout(6500)});if(r.ok){const d=await r.json();for(const x of d.results||[]){const zh=x.text||'';if(!v34Contains(zh,q))continue;let en='';try{en=(x.translations||[]).flat().find(t=>t&&t.lang==='eng')?.text||(x.translations||[]).flat()[0]?.text||'';}catch{}found.push({zh,py:getWordPY(zh),en:v34CleanDef(en),pt:'',src:'Tatoeba'});}}}catch{}return found;}
v29RenderDictSentences=async function(q,out){if(!out)return;out.innerHTML='<div class="dict-empty"><div class="spin sm"></div></div>';let sents=V34_SENTENCES.filter(s=>v34Contains(s.zh,q));const ext=await v34Tatoeba(q);for(const s of ext){if(!sents.some(x=>x.zh===s.zh))sents.push(s);}sents=sents.filter(s=>v34Contains(s.zh,q));if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente esse termo. O app não mostra mais frases aproximadas sem a palavra pesquisada.</div>';return;}let html='<div class="dict-results-lexi"><div class="dict-subtitle">Frases com o termo pesquisado</div>';for(const s of sents.slice(0,16)){html+=`<div class="sent-card"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py">${esc(s.py||getWordPY(s.zh))}</div></div>${v34AudioButton(s.zh)}</div><div class="sent-tr">${s.pt?esc(s.pt):(s.en?v34TransButton(s.en):'Tradução humana indisponível nesta fonte.')}</div><div class="sent-src">${esc(s.src||'Banco de frases')} • contém “${esc(q)}”</div></div>`;}html+='</div>';out.innerHTML=html;v34BindAudio(out);v34BindAuto(out);};
const v34OldRenderTipDefs=typeof renderTipDefs==='function'?renderTipDefs:null;
renderTipDefs=function(result){const el=document.getElementById('tip-body');if(!el)return;const word=typeof defWord!=='undefined'?defWord:'';const loc=v34EntryLocal(word);let html='';
 // 1) TRADUÇÃO
 if(loc&&loc.pt){html+='<div class="tip-translation"><div class="tip-pos">TRADUÇÃO</div>';loc.pt.slice(0,4).forEach((d,i)=>html+=`<div class="tip-def"><span class="tip-num">${i+1}.</span>${esc(v34CleanDef(d))}</div>`);html+='</div>';}
 // 2) DEFINIÇÕES
 const seen=new Set();let defCounter=0;
 const allHints=new Set();
 if(result&&result.defs)result.defs.forEach(g=>(g.defs||[]).forEach(d=>{if(d&&d.pyHint)allHints.add(d.pyHint);}));
 const hasMultiReading=allHints.size>1;
 function addGroup(pos,defs){
   defs=(defs||[]).map(d=>typeof d==='string'?{text:d,pyHint:null}:{text:(d&&d.text)||'',pyHint:(d&&d.pyHint)||null}).map(o=>({text:v34CleanDef(o.text),pyHint:o.pyHint})).filter(o=>o.text).filter(o=>!(word!=='意思'&&/^significa\.?$/i.test(o.text)));
   if(!defs.length)return;
   if(pos)html+=`<div class="tip-pos">${esc(pos)}</div>`;
   defs.slice(0,5).forEach(o=>{
     const k=(pos||'')+'|'+o.text;if(seen.has(k))return;seen.add(k);
     defCounter++;
     const reading=hasMultiReading&&o.pyHint?` <span class="lexi-def-reading">— ${esc(word)}: ${esc(o.pyHint)}</span>`:'';
     html+=`<div class="tip-def"><div class="lexi-def-label">Definição ${defCounter}${reading}</div>${loc&&loc.pt?esc(o.text):v34TransButton(o.text)}</div>`;
   });
 }
 if(loc&&loc.en)addGroup(loc.pos||'DEFINIÇÃO',loc.en);if(result&&result.defs){result.defs.slice(0,5).forEach(g=>addGroup(g.pos,(g.defs||[])));}
 if(!html)html='<div class="tip-none">Sem definição</div>';
 // 3) FRASES DE EXEMPLO (no máximo 6, cada uma numa borda com botão de ouvir
 // independente — a borda existe justamente pra dar um contêiner de referência
 // e centralizar o botão dentro dele)
 if(result&&result.tatoeba&&result.tatoeba.length){
   const sents=result.tatoeba.slice(0,6);
   html+=`<div class="tip-sec-title">Frases de exemplo</div><div class="tip-tatoeba" id="tip-sent-list">`;
   html+=sents.map((ex,i)=>{
     const spy=(typeof getWordPY==='function'?getWordPY(ex.text):'')||'';
     return `<div class="tip-ex-card"><div class="tip-ex-actions"><button class="tip-ex-play" data-ex-text="${esc(ex.text)}" title="Ouvir frase"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg></button>${v41SaveSentenceButtonHtml(ex.text,ex.translations,word)}</div><div class="tip-ex-body"><div class="tip-ex-zh">${v41RenderSentenceWithHighlight(ex.text,word)}</div>${spy?`<div class="tip-ex-py">${esc(spy)}</div>`:''}${ex.translations&&ex.translations.length?`<div class="tip-ex-tr">${esc(ex.translations[0])}</div>`:''}</div></div>`;
   }).join('');
   html+=`</div>`;
 }
 if(result&&result.src)html+=`<div class="tip-src">${esc(result.src)}</div>`;
 el.innerHTML=html;
 v34BindAuto(el);
 v41BindSaveSentenceButtons(el);
 el.querySelectorAll('.tip-ex-play').forEach(btn=>{
   btn.onclick=async(e)=>{
     e.stopPropagation();
     if(btn.disabled)return;
     const text=btn.dataset.exText;
     const original=btn.innerHTML;
     btn.disabled=true;btn.innerHTML='<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';
     try{if(typeof window.v36Speak==='function')await window.v36Speak(text,'sentence');else if(typeof speakWordMode==='function')await speakWordMode(text,'natural');}
     catch(err){try{toast('Falha ao reproduzir: '+(err.message||err));}catch{}}
     finally{btn.disabled=false;btn.innerHTML=original;}
   };
 });
 // Indicador de rolagem: só aparece quando o conteúdo realmente ultrapassa a
 // altura visível do popup.
 requestAnimationFrame(()=>{try{document.getElementById('tip')?.classList.toggle('has-more-below',el.scrollHeight>el.clientHeight+2);}catch{}});
 el.onscroll=()=>{try{const atBottom=el.scrollTop+el.clientHeight>=el.scrollHeight-2;document.getElementById('tip')?.classList.toggle('has-more-below',!atBottom&&el.scrollHeight>el.clientHeight+2);}catch{}};
};
function v34PatchDictSearch(){const btn=document.getElementById('dict-go');if(btn){btn.innerHTML=v34Svg('search');btn.classList.add('v34-svg-only');}const inp=document.getElementById('dict-q');if(inp)inp.placeholder='字 / 词 / frase';document.querySelectorAll('.dict-tab').forEach(b=>{const T=window.hzT||((k)=>({dictTabDefs:'DICT',dictTabWords:'WORDS',dictTabSents:'SENTS'})[k]);if(b.dataset.dtab==='defs')b.textContent=T('dictTabDefs');if(b.dataset.dtab==='words')b.textContent=T('dictTabWords');if(b.dataset.dtab==='sents')b.textContent=T('dictTabSents');});}
const V34_SOURCES=[
 {type:'simple',level:1,title:'HSK 1 — Minha família',icon:'家',desc:'Leitura curta com família, casa e rotina.',url:'',content:'我家有三个人。爸爸、妈妈和我。今天是星期六，我们在家喝茶、看书。晚上，我们一起吃米饭和菜。'},
 {type:'simple',level:2,title:'HSK 2 — Um dia de estudo',icon:'学',desc:'Rotina simples com escola, pergunta e revisão.',url:'',content:'今天上午我去学校上课。老师问了一个问题，我回答错了。下课以后，我和朋友一起去饭店吃饭。下午我回家复习中文。'},
 {type:'simple',level:3,title:'HSK 3 — Viagem curta',icon:'旅',desc:'Viagem curta com conectores e vocabulário comum.',url:'',content:'上个周末，我和朋友坐火车去一个小城市旅行。那里的天气很好，街道很干净。我们先去了公园，然后参观了一个小博物馆。虽然时间不长，但是我觉得这次旅行很有意思。'},
 {type:'book',level:4,title:'围棋入门',icon:'棋',desc:'Livro curto dividido em capítulos sobre regras básicas de 围棋.',url:'',chapters:[{num:1,title:'规则',content:'围棋有黑白两种棋子。规定由执黑色棋子的先行。双方在十九乘十九条线的棋盘网格上的交叉点交替放置黑色及白色的棋子。'},{num:2,title:'胜负',content:'落子完毕后，不能悔棋。对弈过程中围地吃子，以所围地的大小决定胜负。'}]},
 {type:'book',level:4,title:'弟子规（节选）',icon:'弟',desc:'Texto tradicional curto, bom para frases paralelas.',url:'https://zh.wikisource.org/wiki/弟子規',chapters:[{num:1,title:'总叙',content:'弟子规，圣人训。首孝悌，次谨信。泛爱众，而亲仁。有余力，则学文。'},{num:2,title:'入则孝',content:'父母呼，应勿缓。父母命，行勿懒。父母教，须敬听。父母责，须顺承。'}]},
 {type:'book',level:5,title:'三字经（节选）',icon:'三',desc:'Clássico público; caracteres frequentes em estilo literário.',url:'https://ctext.org/three-character-classic/zh',chapters:[{num:1,title:'开篇',content:'人之初，性本善。性相近，习相远。苟不教，性乃迁。教之道，贵以专。'},{num:2,title:'学习',content:'昔孟母，择邻处。子不学，断机杼。窦燕山，有义方。教五子，名俱扬。'}]},
 {type:'book',level:5,title:'千字文（节选）',icon:'千',desc:'Clássico com alta variedade de caracteres.',url:'https://zh.wikisource.org/wiki/千字文',chapters:[{num:1,title:'天地',content:'天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。寒来暑往，秋收冬藏。'},{num:2,title:'学问',content:'尺璧非宝，寸阴是竞。资父事君，曰严与敬。孝当竭力，忠则尽命。'}]},
 {type:'book',level:6,title:'论语（节选）',icon:'论',desc:'Fonte clássica pública de alta densidade semântica.',url:'https://ctext.org/analects/zh',chapters:[{num:1,title:'学而',content:'子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？'},{num:2,title:'为政',content:'子曰：为政以德，譬如北辰，居其所而众星共之。'}]},
 {type:'book',level:6,title:'道德经（节选）',icon:'道',desc:'Frases curtas, vocabulário filosófico e estilo clássico.',url:'https://ctext.org/dao-de-jing/zh',chapters:[{num:1,title:'第一章',content:'道可道，非常道。名可名，非常名。无名天地之始；有名万物之母。'},{num:2,title:'第二章',content:'天下皆知美之为美，斯恶已。皆知善之为善，斯不善已。'}]},
 {type:'book',level:6,title:'庄子（节选）',icon:'庄',desc:'Texto clássico para leitura avançada.',url:'https://ctext.org/zhuangzi/zh',chapters:[{num:1,title:'逍遥游',content:'北冥有鱼，其名为鲲。鲲之大，不知其几千里也。化而为鸟，其名为鹏。'}]},
 {type:'simple',level:4,title:'Wikisource — poesia curta',icon:'诗',desc:'Entrada manual de texto público via Wikisource.',url:'https://zh.wikisource.org/',content:'床前明月光，疑是地上霜。举头望明月，低头思故乡。'}
];
async function v34AddSource(i){const s=V34_SOURCES[i];if(!s)return;if(s.type==='book'){const b={id:v29NewId(),kind:'book',title:s.title,source:s.url||'Fonte pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters:(s.chapters||[]).map(ch=>({id:v29NewId(),num:ch.num,title:ch.title,content:cleanRaw(ch.content),progress:0,addedAt:Date.now()})),lastRead:null,addedAt:Date.now(),lastChapterIndex:0};await dbPut(STB,b);books=await dbAll(STB);toast('Livro adicionado');}else{await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Fonte pública',content:cleanRaw(s.content||''),type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});books=await dbAll(STB);toast('Leitura adicionada');}renderLib();}
window.V34_SOURCES=V34_SOURCES;window.v34AddSource=v34AddSource;
renderDiscover=function(){const dc=document.getElementById('dc');if(!dc)return;dc.innerHTML=`<div class="src-grid">${V34_SOURCES.map((s,i)=>`<div class="src-card2"><div class="src-ico2" style="background:linear-gradient(135deg,#26221d,rgba(var(--ac-rgb),.5),var(--ac))">${esc(s.icon)}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-meta2"><span class="src-level ${s.level<=2?'l12':s.level<=4?'l34':'l56'}">HSK ${s.level}</span>${s.type==='book'?'Livro':'Leitura simples'} • fonte pública/manual</div><div class="src-desc2">${esc(s.desc)}</div><div class="src-actions2"><button class="pri" data-v34-add-src="${i}">${v34Svg('plus')}Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div></div></div>`).join('')}</div>`;dc.querySelectorAll('[data-v34-add-src]').forEach(b=>b.onclick=()=>v34AddSource(+b.dataset.v34AddSrc));};
function v34InstallFullscreen(){const dock=document.getElementById('mini-dock');if(!dock)return;let btn=document.getElementById('reader-fs');if(!btn){dock.insertAdjacentHTML('beforeend','<button class="mini-dock-btn" id="reader-fs" title="Tela cheia"></button>');btn=document.getElementById('reader-fs');}btn.innerHTML=v34Svg(document.body.classList.contains('reader-fullscreen')?'close':'full');btn.classList.add('v34-svg-only');(function(sv){if(sv){sv.setAttribute('width','30');sv.setAttribute('height','30');sv.style.cssText='width:30px;height:30px';}})(btn.querySelector('svg'));if(!btn._v34){btn._v34=true;btn.onclick=e=>{e.stopPropagation();const on=!document.body.classList.contains('reader-fullscreen');document.body.classList.toggle('reader-fullscreen',on);document.body.classList.remove('reader-bars');btn.innerHTML=v34Svg(on?'close':'full');(function(sv){if(sv){sv.setAttribute('width','30');sv.setAttribute('height','30');sv.style.cssText='width:30px;height:30px';}})(btn.querySelector('svg'));};}}
if(typeof showScreen==='function'){const oldShowScreen=showScreen;showScreen=function(id){oldShowScreen(id);setTimeout(()=>{v34PatchDictSearch();v34InstallFullscreen();},80);};}
function v34PatchReaderButtons(){const p=document.getElementById('read-play');if(p){p.innerHTML=(typeof v32Reading!=='undefined'&&v32Reading)?v34Svg('pause'):v34Svg('play');p.classList.add('v34-svg-only');}const fs=document.getElementById('reader-fs');if(fs){fs.innerHTML=v34Svg(document.body.classList.contains('reader-fullscreen')?'close':'full');const sv=fs.querySelector('svg');if(sv){sv.setAttribute('width','30');sv.setAttribute('height','30');sv.style.cssText='width:30px;height:30px';}}}
if(typeof v32UpdateReadUi==='function'){const old=v32UpdateReadUi;v32UpdateReadUi=function(){old();v34PatchReaderButtons();};}
function v34InstallHelp(){const ss=document.querySelector('#ss .sc');if(ss&&!document.getElementById('help-row-v34')){const row=document.createElement('div');row.className='sg';row.innerHTML=`<div class="sgt">Ajuda</div><div class="srow help-row" id="help-row-v34"><div><div class="slbl">Informações e guia</div><div class="ssub">Objetivo, leitura, dicionário, sources e áudio</div></div>${v34Svg('info')}</div>`;ss.insertBefore(row,ss.firstChild?.nextSibling||null);}if(!document.getElementById('mo-help')){const div=document.createElement('div');div.className='mo help-modal';div.id='mo-help';document.body.appendChild(div);}
 const modal=document.getElementById('mo-help');modal.innerHTML=`<div class="ms"><div class="mbar"><div class="mhd"></div><button class="mx" id="help-x">${v34Svg('close')}</button></div><div class="mtitle">Guia do Hanzi Reader</div><div class="help-actions"><button data-help-tab="leitura" class="on">Leitura</button><button data-help-tab="dicionario">Dicionário</button><button data-help-tab="livros">Livros</button><button data-help-tab="audio">Áudio</button></div><iframe class="help-frame" id="help-frame"></iframe></div>`;const docs={leitura:`<h2>Leitura</h2><p>Importe texto, TXT, PDF textual ou fontes públicas. O leitor segmenta palavras, coloca pinyin por nível HSK e preserva espaços/pontuação.</p><p>Use o botão de tela cheia para ocultar barras. Arraste para cima para mostrar o rodapé principal.</p>`,dicionario:`<h2>Dicionário</h2><p>Pesquise ideogramas ou palavras. DICT mostra tradução primeiro e definições depois. WORDS lista palavras formadas pelo termo. SENTS só mostra frases que contêm exatamente o termo pesquisado.</p><p>Quando não houver português humano/local, o botão PT aciona tradução automática sob demanda.</p>`,livros:`<h2>Livros</h2><p>Crie livros com capa, sinopse e capítulos. Cada livro guarda último capítulo e progresso.</p><p>Sources pode adicionar leituras simples ou livros públicos em um toque.</p>`,audio:`<h2>Áudio</h2><p>A pronúncia usa as rotas naturais restauradas. Para palavras compostas, tenta a palavra inteira; se não houver áudio, cai para ideogramas com pausas curtas.</p>`};function setTab(t){document.querySelectorAll('[data-help-tab]').forEach(b=>b.classList.toggle('on',b.dataset.helpTab===t));const css='<style>body{margin:0;background:#111;color:#eee;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:18px;line-height:1.6}h2{color:#f5a623;margin-top:0}p{color:#ddd}</style>';document.getElementById('help-frame').srcdoc=css+(docs[t]||docs.leitura);}modal.querySelectorAll('[data-help-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.helpTab));setTab('leitura');document.getElementById('help-x').onclick=()=>modal.classList.remove('open');modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open');};document.getElementById('help-row-v34')?.addEventListener('click',()=>modal.classList.add('open'));}
function v34RemoveEmojiSymbols(){document.querySelectorAll('button').forEach(b=>{if(b.childNodes.length===1&&b.textContent.trim()==='▶'){b.innerHTML=v34Svg('play');b.classList.add('v34-svg-only');}if(b.textContent.trim()==='⛶'){b.innerHTML=v34Svg('full');b.classList.add('v34-svg-only');}});}
function v34Boot(){try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=V34_VERSION;}catch{}v34PatchDictSearch();v34InstallFullscreen();v34InstallHelp();v34RemoveEmojiSymbols();try{renderDiscover();}catch{} }
setTimeout(v34Boot,650);setTimeout(v34Boot,1500);
})();


/* ===== v35-ttsfree-natural-script ===== */
/* v3.5: TTS natural para frases/palavras via proxy Vercel.
   Ordem nova: áudio real/banco curto -> TTSFree/Azure proxy para frases -> fallback por palavras/ideogramas.
   Não hardcoda cookies/CSRF do navegador: o web-flow do TTSFree é experimental e fica no backend. */
(function(){
const HR35_STYLE=`
.tts-status-dot{display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#8b7355;border:1px solid rgba(var(--ac-rgb),.22);border-radius:999px;padding:3px 7px;margin-left:6px;background:rgba(var(--ac-rgb),.06)}
.tts-status-dot.on{color:var(--ac);border-color:rgba(var(--ac-rgb),.45);background:rgba(var(--ac-rgb),.12)}
`;
const st=document.createElement('style');st.textContent=HR35_STYLE;document.head.appendChild(st);
const HR35_WORD_SOURCES=[
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=1`,
  w=>`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(w)}&type=2`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}`,
  w=>`https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(w)}&le=zh`
];
const HR35_TTS_ENDPOINT='/api/tts-edge';
const HR35_TTS_CACHE=new Map();
function hr35CjkText(t){return [...String(t||'')].filter(isCJK).join('');}
function hr35LooksSentence(t){t=String(t||'');const c=hr35CjkText(t);return c.length>=5||/[，。！？；：,.!?;:]/.test(t);}
function hr35SetBusy(on){document.querySelectorAll('[data-v34-speak],.lexi-audio,.dict-audio,#tip-natural,#tone-pron').forEach(el=>el&&el.classList.toggle('pl',!!on));}
function hr35StopAudio(){if(curAudio){try{curAudio.pause();}catch{}curAudio=null;}try{speechSynthesis?.cancel();}catch{}}
function hr35PlayUrl(url){return new Promise((res,rej)=>{const a=new Audio(url);curAudio=a;const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;rej(new Error('timeout'));},12000);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};const p=a.play();if(p&&p.catch)p.catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
function hr35PlayBlob(blob){return new Promise((res,rej)=>{const url=URL.createObjectURL(blob);const a=new Audio(url);curAudio=a;const cleanup=()=>{try{URL.revokeObjectURL(url);}catch{}};const t=setTimeout(()=>{try{a.pause();}catch{}cleanup();curAudio=null;rej(new Error('timeout'));},18000);a.onended=()=>{clearTimeout(t);cleanup();curAudio=null;res();};a.onerror=()=>{clearTimeout(t);cleanup();curAudio=null;rej(new Error('audio'));};const p=a.play();if(p&&p.catch)p.catch(e=>{clearTimeout(t);cleanup();curAudio=null;rej(e);});});}
async function hr35PlayWordSource(text){for(const src of HR35_WORD_SOURCES){try{await hr35PlayUrl(src(text));return true;}catch{}}return false;}
async function hr35PlayChars(chars,pause=42){let ok=false;for(const ch of chars){if(!isCJK(ch))continue;if(await hr35PlayWordSource(ch))ok=true;else if(await hr35PlayProxy(ch,{force:false,shortOk:true}))ok=true;await delay(pause);}return ok;}
function hr35Segments(text){const out=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}run='';}if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(run);}}return out.filter(Boolean);}
async function hr35PlaySegmented(text){let ok=false;for(const p of hr35Segments(text)){if(/[，,、；;：:]/.test(p)){await delay(80);continue;}if(/[。！？!?]/.test(p)){await delay(165);continue;}const c=[...p].filter(isCJK);const got=await hr35PlayWordSource(p)||(c.length?await hr35PlayChars(c,30):false);if(got)ok=true;await delay(36);}return ok;}
async function hr35FetchProxyBlob(text,opts={}){text=String(text||'').trim();if(!text)return null;if(text.length>480)text=text.slice(0,480);const cacheKey=`${opts.voice||'zh-CN-XiaoxiaoNeural'}|${text}`;if(HR35_TTS_CACHE.has(cacheKey))return HR35_TTS_CACHE.get(cacheKey).slice(0);
  const r=await fetch(HR35_TTS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang:'zh-CN',voice:opts.voice||'zh-CN-XiaoxiaoNeural',style:opts.style||'chat',provider:opts.provider||'auto'})});
  if(!r.ok)throw new Error('tts proxy '+r.status);
  const ct=(r.headers.get('content-type')||'').toLowerCase();
  let blob=null;
  if(ct.includes('audio'))blob=await r.blob();
  else{const d=await r.json();if(d.audioData){const bin=atob(String(d.audioData).replace(/^data:audio\/\w+;base64,/,''));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);blob=new Blob([u],{type:d.mime||'audio/mpeg'});}else if(d.audioUrl){await hr35PlayUrl(d.audioUrl);return 'played-url';}}
  if(blob){HR35_TTS_CACHE.set(cacheKey,blob);return blob.slice(0);}return null;
}
async function hr35PlayProxy(text,opts={}){try{if(!opts.force&&!hr35LooksSentence(text)&&!opts.shortOk)return false;const b=await hr35FetchProxyBlob(text,opts);if(!b)return false;if(b==='played-url')return true;await hr35PlayBlob(b);return true;}catch(e){return false;}}
async function hr35Speak(text,mode='natural'){
  hr35StopAudio();hr35SetBusy(true);text=String(text||'').trim();const cjk=[...text].filter(isCJK);
  try{if(!cjk.length)return;
    let ok=false;
    if(hr35LooksSentence(text)){
      ok=await hr35PlayProxy(text,{force:true});
      if(!ok)ok=await hr35PlayWordSource(text);
      if(!ok)ok=await hr35PlaySegmented(text);
    }else{
      ok=await hr35PlayWordSource(text);
      if(!ok)ok=await hr35PlayProxy(text,{force:false,shortOk:cjk.length>1});
      if(!ok)ok=await hr35PlayChars(cjk,cjk.length===1?44:34);
    }
    if(!ok)toast('Áudio não encontrado nas rotas naturais atuais.');
  }finally{hr35SetBusy(false);}
}
// Exporta sobre o motor anterior, sem remover o comportamento estável de palavras curtas.
speakWordMode=function(word,mode='natural'){return hr35Speak(word,mode);};
speakWord=function(word){return hr35Speak(word,'natural');};
window.v30SpeakSentence=async function(key){const data=(window.V30_SENT_AUDIO||{})[key];if(!data)return;hr35StopAudio();hr35SetBusy(true);try{let ok=false;for(const u of data.urls||[]){try{await hr35PlayUrl(u);ok=true;break;}catch{}}if(!ok)ok=await hr35PlayProxy(data.zh,{force:true});if(!ok)ok=await hr35PlayWordSource(data.zh);if(!ok)ok=await hr35PlaySegmented(data.zh);if(!ok)toast('Áudio natural da frase não disponível nesta conexão.');}finally{hr35SetBusy(false);}};
// Pequeno marcador em Settings para deixar claro que o proxy neural é opcional no Vercel.
function hr35MarkSettings(){try{const about=[...document.querySelectorAll('#ss .srow')].find(r=>/Hanzi Reader/.test(r.textContent));if(about&&!about.querySelector('.tts-status-dot')){const b=document.createElement('span');b.className='tts-status-dot';b.textContent='TTS neural via /api/tts-edge';about.appendChild(b);if(location.protocol==='http:'||location.protocol==='https:'){fetch(HR35_TTS_ENDPOINT+'?health=1').then(r=>{if(r.ok){b.classList.add('on');b.textContent='TTS neural ativo';}}).catch(()=>{});}}}catch{}}
setTimeout(hr35MarkSettings,700);
try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.5';}catch{}
})();


/* ===== v36-audio-books-flashcards-fix ===== */
/* v3.8: restaura áudio robusto sem depender de /api/tts, corrige Livros, adiciona Analytics e Flashcards. */
(function(){
const HR36_STYLE=`
.book-actions{position:absolute;right:12px;top:12px;display:flex;gap:7px;z-index:6}.book-actions button,.card-actions button{width:32px;height:32px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(0,0,0,.56);color:#f0f0f0;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.book-actions button svg,.card-actions button svg{width:16px;height:16px;stroke:currentColor}.book-list .book-actions{position:static;grid-column:3;grid-row:1 / span 2;flex-direction:column;justify-content:center;align-items:center;height:100%;gap:6px}
.book-list .book-actions button{width:30px;height:30px}.card.has-actions{position:relative;padding-right:92px}.card-actions{position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;gap:7px}.reader-ctrl{gap:8px;flex-wrap:wrap}.reader-ctrl .reader-next{border:1px solid rgba(var(--ac-rgb),.26);background:rgba(var(--ac-rgb),.08);color:var(--ac);border-radius:999px;padding:8px 11px;font-weight:800;font-size:12px}.analytics-modal .ms{max-width:min(620px,calc(100vw - 20px));background:linear-gradient(165deg,#1c1c1c,#121212)}.ana-title{font-size:13px;color:#aaa;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}.ana-bars{display:flex;flex-direction:column;gap:13px}.ana-row{display:grid;grid-template-columns:104px 1fr 40px;gap:10px;align-items:center}.ana-lbl{font-size:11.5px;color:#bbb;font-weight:700}.ana-bar{height:18px;background:linear-gradient(180deg,#1a1a1a,#252525);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,255,255,.03)}.ana-fill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--ac),#ffcf7a);box-shadow:0 0 10px rgba(var(--ac-rgb),.45),inset 0 1px 0 rgba(255,255,255,.35);transition:width .4s cubic-bezier(.22,.9,.3,1)}.ana-fill.beg{background:linear-gradient(90deg,#4f8158,#8fc99a);box-shadow:0 0 10px rgba(106,156,114,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-fill.mid{background:linear-gradient(90deg,#a3782f,#e8b866);box-shadow:0 0 10px rgba(192,147,79,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-fill.adv{background:linear-gradient(90deg,#8f3d5f,#d97ea8);box-shadow:0 0 10px rgba(180,86,125,.4),inset 0 1px 0 rgba(255,255,255,.3)}.ana-val{font-size:12.5px;color:#ddd;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}.ana-list{margin-top:16px;border-top:1px solid rgba(255,255,255,.06);padding-top:12px;font-size:12.5px;color:#bbb;line-height:1.7}.flash-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(var(--st) + 14px) 20px 10px}.flash-head h1{font-size:24px}.flash-tabs{display:flex;gap:8px;padding:0 16px 10px}.flash-tab{flex:1;border:1px solid #2d2d2d;background:#171717;color:#777;border-radius:12px;padding:10px;font-weight:850}.flash-tab.on{background:rgba(var(--ac-rgb),.12);border-color:rgba(var(--ac-rgb),.4);color:var(--ac)}.deck-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.deck-card{background:#1a1a1a;border:1px solid #2d2d2d;border-radius:16px;padding:14px;min-height:118px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}.deck-card.on{border-color:rgba(var(--ac-rgb),.55);box-shadow:0 0 0 1px rgba(var(--ac-rgb),.12) inset}.deck-name{font-weight:900;color:#fff}.deck-meta{font-size:12px;color:#888;margin-top:5px}.deck-actions{display:flex;gap:8px;margin-top:10px}.deck-actions button,.flash-small-btn{border:0;background:#292929;color:#ddd;border-radius:10px;padding:8px 10px;font-size:12px;font-weight:800}.study-card{background:#151515;border:1px solid #2d2d2d;border-radius:20px;padding:24px 18px;text-align:center;min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center}.study-word{font-family:var(--rf);font-size:56px;color:#fff;line-height:1.08}.study-py{font-size:18px;color:var(--ac);margin-top:10px;font-weight:800}.study-def{font-size:15px;color:#ddd;line-height:1.55;margin-top:16px;white-space:pre-wrap}.study-grades{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.study-grades button{border:0;border-radius:12px;padding:11px 6px;font-weight:900}.g-again{background:#4b2020;color:#ffb3b3}.g-hard{background:#4b3c20;color:#ffe0a0}.g-good{background:#1f4528;color:#b8f5c1}.g-easy{background:#1f314a;color:#b7d9ff}.flash-word-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.move-word-btn{border:1px solid #333;background:#242424;color:#aaa;border-radius:10px;padding:8px}.book-card .book-edit{display:none!important}.book-card .book-del{display:none!important}.hr36-noemoji{font-size:0}.hr36-noemoji svg{font-size:initial}.src-card2{position:relative}.src-char-count{display:inline-flex;border:1px solid rgba(var(--ac-rgb),.22);border-radius:999px;padding:2px 7px;color:#b99a65;font-size:11px;margin-left:6px}.src-cat{font-size:11px;color:#8c8170;text-transform:uppercase;letter-spacing:.7px;margin-top:4px}.tts-status-dot{display:none!important}@media(min-width:760px){.deck-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.study-card{max-width:620px;margin:0 auto}.study-grades{max-width:620px;margin-left:auto;margin-right:auto}}
`;
const st=document.createElement('style');st.textContent=HR36_STYLE;document.head.appendChild(st);
const SVG={trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',ana:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'};
function h36Stop(){if(curAudio){try{curAudio.pause();}catch{}curAudio=null;}try{speechSynthesis?.cancel();}catch{}}
function h36Busy(on){document.querySelectorAll('.lexi-audio,.dict-audio,[data-v34-speak],#tip-natural,#tone-pron,#read-play').forEach(el=>el&&el.classList.toggle('pl',!!on));}
function h36PlayUrl(url,timeout=9000){return new Promise((res,rej)=>{try{const a=new Audio(url);curAudio=a;const t=setTimeout(()=>{try{a.pause();}catch{}curAudio=null;rej(new Error('timeout'));},timeout);a.onended=()=>{clearTimeout(t);curAudio=null;res(true);};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('audio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});}catch(e){rej(e);}});}
const toneMarks={'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['v',1],'ǘ':['v',2],'ǚ':['v',3],'ǜ':['v',4],'ü':['v',5],'ń':['n',2],'ň':['n',3],'ǹ':['n',4],'ḿ':['m',2]};
function h36MarkedToNum(py){py=String(py||'').trim().toLowerCase();if(!py)return'';let tone='5',base='';for(const ch of [...py]){if(toneMarks[ch]){base+=toneMarks[ch][0];tone=String(toneMarks[ch][1]);}else if(/[1-5]$/.test(ch)){tone=ch;}else{base+=ch==='ü'?'v':ch;}}base=base.replace(/[^a-zv]/g,'');return base?base+tone:'';}
function h36PinyinNums(text){let arr=[];try{if(window.pinyinFn){const r=window.pinyinFn(text,{toneType:'num',type:'array'});if(Array.isArray(r))arr=r;else arr=String(r||'').split(/\s+/);}}catch{} if(!arr.length){try{arr=(getWordPY(text)||'').split(/\s+/).map(h36MarkedToNum);}catch{}} return arr.map(x=>/[1-5]$/.test(x)?x:h36MarkedToNum(x)).filter(Boolean);}
function h36AudioUrls(text){
  const raw=String(text||'').trim();
  const q=encodeURIComponent(raw);
  const isSentence=/[。！？!?，,；;]/.test(raw)||[...raw].filter(isCJK).length>3;
  const urls=[
    `https://fanyi.baidu.com/gettts?lan=zh&text=${q}&spd=5&source=web`,
    `https://dict.youdao.com/dictvoice?audio=${q}&type=1`,
    `https://dict.youdao.com/dictvoice?audio=${q}&type=2`,
    `https://tts.youdao.com/fanyivoice?word=${q}&le=zh&keyfrom=speaker-target`,
    `https://tts.youdao.com/fanyivoice?word=${q}&le=zh`,
    `https://tts.youdao.com/fanyivoice?word=${q}`,
    `https://fanyi.sogou.com/reventondc/synthesis?text=${q}&speed=1&lang=zh-CHS&from=translateweb&speaker=6`,
    `https://fanyi.qq.com/api/tts?text=${q}&lang=zh`
  ];
  if(!isSentence && [...raw].filter(isCJK).length<=3){
    h36PinyinNums(raw).forEach(p=>{
      urls.push(`https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/${p}.mp3`);
      urls.push(`https://resources.allsetlearning.com/pronwiki/resources/pinyin-audio/${p.replace('v','u')}.mp3`);
    });
  }
  return [...new Set(urls)];
}
async function h36TryDirect(text){for(const u of h36AudioUrls(text)){try{await h36PlayUrl(u,/[。！？!?，,；;]/.test(text)||String(text).length>8?14000:8500);return true;}catch{}}return false;}
function h36Seg(text){let out=[];let run='';for(const ch of [...String(text||'')]){if(isCJK(ch)){run+=ch;continue;}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(...run);}run='';}if(/[，,、；;：:。！？!?]/.test(ch))out.push(ch);}if(run){try{out.push(...segmentChineseRun(run));}catch{out.push(...run);}}return out.filter(Boolean);}
async function h36Speak(text,opts={}){h36Stop();h36Busy(true);text=String(text||'').trim();try{if(![...text].some(isCJK))return;let ok=false;if(text.length<=8)ok=await h36TryDirect(text);if(!ok && text.length>1){for(const part of h36Seg(text)){if(/[，,、；;：:]/.test(part)){await delay(75);continue;}if(/[。！？!?]/.test(part)){await delay(150);continue;}if(await h36TryDirect(part))ok=true;else{for(const ch of [...part].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}await delay(32);}}if(!ok){for(const ch of [...text].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}if(!ok)toast('Nenhuma rota de áudio respondeu agora.');}finally{h36Busy(false);}}
speakWordMode=function(word,mode='natural'){return h36Speak(word,{mode});};speakWord=function(word){return h36Speak(word);};window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h36Speak((d&&d.zh)||key);};window.hr36Speak=h36Speak;
// Captura botões de áudio que ficaram presos a funções antigas.
document.addEventListener('click',function(e){const sp=e.target.closest('[data-v34-speak]');if(sp){e.preventDefault();e.stopPropagation();h36Speak(sp.getAttribute('data-v34-speak'));return;}const ba=e.target.closest('.lexi-audio,.dict-audio');if(ba){if(ba.dataset.sentPlay!=null||ba.dataset.wordIdx!=null||ba.dataset.exText!=null||ba.dataset.sentIdx!=null||ba.id==='dict-main-audio')return;const txt=ba.dataset.word||ba.dataset.zh||ba.getAttribute('aria-label')||defWord||'';if(txt){e.preventDefault();e.stopPropagation();h36Speak(txt);}}},true);

function h36BookKind(b){try{return v29Kind(b);}catch{return b.kind||((b.chapters&&b.chapters.length)?'book':'simple');}}
function h36Chapters(b){try{return v29GetChapters(b);}catch{return b.chapters||[];}}
function h36Progress(b){try{return Math.round(v29BookProgress(b)*100);}catch{return Math.round((b.progress||0)*100);}}
function h36IconBtn(cls,svg,title){return `<button class="${cls} hr36-noemoji" title="${esc(title)}" aria-label="${esc(title)}">${svg}</button>`;}
function h36AnalyzeText(text){const freq={beg:0,mid:0,adv:0,unk:0,total:0,top:new Map()};let toks=[];try{const runs=String(text||'').match(/[\u3400-\u9fff\uF900-\uFAFF]+/g)||[];for(const run of runs){toks.push(...segmentChineseRun(run));}if(!toks.length)throw new Error('no runs');}catch{toks=[...String(text||'')].filter(isCJK);}for(const w of toks){const lv=(typeof getWordLevel==='function'?getWordLevel(w):0)||0;freq.total++;if(lv<=2&&lv>0)freq.beg++;else if(lv<=4&&lv>0)freq.mid++;else if(lv<=9&&lv>0)freq.adv++;else freq.unk++;freq.top.set(w,(freq.top.get(w)||0)+1);}return freq;}
function h36ShowAnalytics(title,text){if(!document.getElementById('mo-analytics'))document.body.insertAdjacentHTML('beforeend',`<div class="mo analytics-modal" id="mo-analytics"><div class="ms"><div class="mbar"><div class="mhd"></div><button class="mx" data-v29-close aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div class="mtitle">Analytics</div><div class="mscroll" id="ana-body"></div></div></div>`);const a=h36AnalyzeText(text);const max=Math.max(1,a.beg,a.mid,a.adv,a.unk);const top=[...a.top.entries()].sort((x,y)=>y[1]-x[1]).slice(0,18).map(([w,n])=>`${esc(w)}×${n}`).join(' · ');document.getElementById('ana-body').innerHTML=`<div class="ana-title">${esc(title)} • ${a.total} tokens analisados</div><div class="ana-bars">${[['beg','HSK 1–2 / iniciante'],['mid','HSK 3–4 / intermediário'],['adv','HSK 5–9 / avançado'],['unk','Fora da base']].map(([k,l])=>`<div class="ana-row"><div class="ana-lbl">${l}</div><div class="ana-bar"><div class="ana-fill ${k}" style="width:${Math.round(a[k]/max*100)}%"></div></div><div class="ana-val">${a[k]}</div></div>`).join('')}</div><div class="ana-list"><b>Mais frequentes:</b><br>${top||'—'}</div>`;showModal('mo-analytics');}
window.showAnalyticsForBook=function(id){const b=books.find(x=>x.id===id);if(!b)return;const text=h36BookKind(b)==='book'?h36Chapters(b).map(c=>c.content||'').join('\n'):b.content||'';h36ShowAnalytics(b.title||'Conteúdo',text);};
const oldRenderLib36=renderLib;
function v39SetBookView(mode){
  if(mode!=='cover'&&mode!=='list')return;
  v29BookView=mode;
  localStorage.setItem('hbookView',mode);
  const vc=document.getElementById('view-cover'),vl=document.getElementById('view-list'),bw=document.getElementById('book-wrap');
  if(vc)vc.classList.toggle('on',mode==='cover');
  if(vl)vl.classList.toggle('on',mode==='list');
  if(bw)bw.className=mode==='cover'?'lib-grid':'simple-list book-list';
  requestAnimationFrame(()=>renderLib());
}
renderLib=function(){const bc=document.getElementById('bc');if(!bc)return;const q=(searchQ||'').toLowerCase();const mode=v29LibMode==='books'?'books':'simple';const base=books.filter(b=>mode==='books'?h36BookKind(b)==='book':h36BookKind(b)!=='book');const list=q?base.filter(b=>(b.title||'').toLowerCase().includes(q)||(b.source||'').toLowerCase().includes(q)||(b.synopsis||'').toLowerCase().includes(q)):base;document.getElementById('mode-simple')?.classList.toggle('on',mode==='simple');document.getElementById('mode-books')?.classList.toggle('on',mode==='books');document.getElementById('plus-simple')?.classList.toggle('on',mode==='simple');document.getElementById('plus-books')?.classList.toggle('on',mode==='books');if(mode==='simple'){bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Leitura simples</div><button class="lib-chip" id="simple-import-chip">Importar</button></div><div class="simple-list" id="simple-list"></div>`;document.getElementById('simple-import-chip').onclick=()=>{v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');};const wrap=document.getElementById('simple-list');if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhuma leitura simples.</b><br>Toque em Importar ou adicione uma source.</div>';return;}list.forEach(b=>{const pct=Math.round((b.progress||0)*100);const el=document.createElement('div');el.className='card has-actions';el.innerHTML=`<div class="card-actions">${h36IconBtn('ana-btn',SVG.ana,'Analytics')}${h36IconBtn('del-btn',SVG.trash,'Excluir')}</div><div class="thumb">${SVG.book}</div><div class="bi"><div class="bt">${esc(b.title||'Sem título')}</div><div class="bs">${esc(b.source||'Leitura')}</div><div class="bm">${timeAgo(b.lastRead)}</div><div class="bpb"><div class="bpf" style="width:${pct}%"></div></div></div>`;el.querySelector('.del-btn').onclick=e=>{e.stopPropagation();confirmDelBook(b.id);};el.querySelector('.ana-btn').onclick=e=>{e.stopPropagation();h36ShowAnalytics(b.title||'Leitura',b.content||'');};el.onclick=e=>{if(e.target.closest('button'))return;openBook(b.id);};wrap.appendChild(el);});}else{bc.innerHTML=`<div class="lib-tools"><div class="lib-title">Livros</div><button class="lib-chip" id="book-new-chip">Novo livro</button><button class="lib-chip ${v29BookView==='cover'?'on':''}" id="view-cover">Capas</button><button class="lib-chip ${v29BookView==='list'?'on':''}" id="view-list">Lista</button></div><div class="${v29BookView==='cover'?'lib-grid':'simple-list book-list'}" id="book-wrap"></div>`;const bnc=document.getElementById('book-new-chip');if(bnc)bnc.onclick=()=>{try{v29OpenBookEditor();}catch(e){}};document.getElementById('view-cover').onclick=()=>v39SetBookView('cover');document.getElementById('view-list').onclick=()=>v39SetBookView('list');const wrap=document.getElementById('book-wrap');if(!list.length){wrap.innerHTML='<div class="emptyx"><b>Nenhum livro.</b><br>Toque em Novo livro ou adicione uma source de livro.</div>';return;}list.forEach(b=>{const ch=h36Chapters(b);const pct=h36Progress(b);const el=document.createElement('div');el.className='book-card';el.innerHTML=`<div class="book-actions">${h36IconBtn('book-ana',SVG.ana,'Analytics')}${h36IconBtn('book-edit2',SVG.edit,'Editar')}${h36IconBtn('book-del2',SVG.trash,'Excluir')}</div><div class="book-cover ${b.cover?'':'gen'}" style="${v29CoverStyle(b)}"></div><div><div class="book-name">${esc(b.title||'Sem título')}</div><div class="book-syn">${esc(b.synopsis||'Sem sinopse')}</div><div class="book-meta"><span>${ch.length} cap.</span><span>${pct}%</span></div></div>`;el.querySelector('.book-del2').onclick=e=>{e.stopPropagation();confirmDelBook(b.id);};el.querySelector('.book-edit2').onclick=e=>{e.stopPropagation();v29OpenBookEditor(b.id);};el.querySelector('.book-ana').onclick=e=>{e.stopPropagation();showAnalyticsForBook(b.id);};el.onclick=e=>{if(e.target.closest('button'))return;if(ch.length)openBook(b.id);else toast('Adicione pelo menos um capítulo');};addLP(el,()=>v29OpenChapterPicker(b.id));wrap.appendChild(el);});}};
document.addEventListener('click',e=>{if(e.target.closest('#mode-books')){v29LibMode='books';localStorage.setItem('hlibMode','books');renderLib();}if(e.target.closest('#mode-simple')){v29LibMode='simple';localStorage.setItem('hlibMode','simple');renderLib();}},true);
function h36EnsureFsStack(){
  const dock=document.getElementById('mini-dock');
  if(!dock)return null;
  let stack=document.getElementById('mini-dock-fs-stack');
  if(!stack){
    stack=document.createElement('div');
    stack.id='mini-dock-fs-stack';
    stack.style.cssText='display:flex;flex-direction:column;align-items:center;gap:6px';
    dock.appendChild(stack);
  }
  const fs=document.getElementById('reader-fs');
  if(fs&&fs.parentElement!==stack)stack.appendChild(fs);
  return stack;
}
function h36InstallNext(){
  const stack=h36EnsureFsStack();
  if(!stack)return;
  let b=document.getElementById('reader-next-chap');
  if(!b){
    b=document.createElement('button');
    b.id='reader-next-chap';
    b.className='mini-dock-btn mini-dock-mini hr36-noemoji';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>Próximo';
    b.onclick=async()=>{
      if(!(curBook&&h36BookKind(curBook)==='book'))return;
      const idx=(curBook._readingChapterIndex||0)+1;
      const ch=h36Chapters(curBook);
      if(idx>=ch.length){toast('Livro concluído');return;}
      await v29OpenBookChapter(curBook.id,idx);
      h36InstallNext();
    };
    stack.insertBefore(b,stack.firstChild);
  }
  const has=curBook&&h36BookKind(curBook)==='book'&&((curBook._readingChapterIndex||0)+1<h36Chapters(curBook).length);
  b.style.display=has?'inline-flex':'none';
}
const oldOpenCh36=v29OpenBookChapter;v29OpenBookChapter=async function(id,idx){await oldOpenCh36(id,idx);h36InstallNext();};const oldSimple36=v29OpenSimpleReading;v29OpenSimpleReading=async function(id){await oldSimple36(id);h36InstallNext();};

const HR36_SOURCES=[
 {cat:'Leituras graduadas',type:'simple',level:2,title:'Mandarin Bean — textos graduados',chars:'variável',url:'https://mandarinbean.com/category/reading/',desc:'Índice externo com textos graduados; ao adicionar, o app tenta extrair a página.'},
 {cat:'Leituras graduadas',type:'simple',level:3,title:'Chinese Boost — reading practice',chars:'variável',url:'https://www.chineseboost.com/chinese-reading-practice/',desc:'Página pública com leituras e notas.'},
 {cat:'Leituras graduadas',type:'simple',level:3,title:'HSKReading — artigos por nível',chars:'variável',url:'https://hskreading.com/',desc:'Fonte online de leituras por nível HSK.'},
 {cat:'Novels / web',type:'simple',level:5,title:'Wikisource — 中文维基文库',chars:'grande',url:'https://zh.wikisource.org/wiki/Wikisource:%E9%A6%96%E9%A1%B5',desc:'Biblioteca pública de textos chineses; ideal para importar uma página específica.'},
 {cat:'Clássicos',type:'book',level:5,title:'三字经 — CText',chars:'~1.2k',url:'https://ctext.org/three-character-classic/zh',desc:'Clássico público. Adiciona por URL se a extração funcionar.',chapters:[{num:1,title:'三字经',url:'https://ctext.org/three-character-classic/zh'}]},
 {cat:'Clássicos',type:'book',level:6,title:'千字文 — Wikisource',chars:'~1k',url:'https://zh.wikisource.org/wiki/%E5%8D%83%E5%AD%97%E6%96%87',desc:'Texto clássico de mil caracteres.',chapters:[{num:1,title:'千字文',url:'https://zh.wikisource.org/wiki/%E5%8D%83%E5%AD%97%E6%96%87'}]},
 {cat:'Clássicos',type:'book',level:6,title:'论语 — CText',chars:'grande',url:'https://ctext.org/analects/zh',desc:'Livro clássico em capítulos.',chapters:[{num:1,title:'学而',url:'https://ctext.org/analects/xue-er/zh'},{num:2,title:'为政',url:'https://ctext.org/analects/wei-zheng/zh'}]},
 {cat:'Clássicos',type:'book',level:6,title:'道德经 — CText',chars:'~5k',url:'https://ctext.org/dao-de-jing/zh',desc:'Texto completo público em chinês clássico.',chapters:[{num:1,title:'第一章',url:'https://ctext.org/dao-de-jing/zh#n11600'},{num:2,title:'第二章',url:'https://ctext.org/dao-de-jing/zh#n11601'}]},
 {cat:'Uso moderno',type:'simple',level:4,title:'BBC 中文 — notícia curta',chars:'variável',url:'https://www.bbc.com/zhongwen/simp',desc:'Fonte jornalística moderna; use páginas específicas para melhor extração.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'The Chairman’s Bao',chars:'variável',url:'https://www.thechairmansbao.com/',desc:'Fonte graduada externa; pode exigir acesso no site.'}
];
async function h36AddSource(i){const s=HR36_SOURCES[i]||V32_SOURCES[i];if(!s)return;showLoad('Importando source...');try{if(s.type==='book'){const chapters=[];for(const [idx,ch] of (s.chapters||[{num:1,title:s.title,url:s.url}]).entries()){let content=ch.content||'';if(!content&&ch.url)try{content=await fetchText(ch.url);}catch(e){content='';}chapters.push({id:v29NewId(),num:ch.num||idx+1,title:ch.title||('Capítulo '+(idx+1)),content:cleanRaw(content||`Fonte: ${ch.url||s.url}\n\nAbra o link da source e importe uma página específica se a extração automática falhar.`),progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url});}await dbPut(STB,{id:v29NewId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});toast('Livro adicionado');}else{let content=s.content||'';if(!content&&s.url)content=await fetchText(s.url);await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:cleanRaw(content),type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});toast('Leitura adicionada');}books=await dbAll(STB);renderLib();}catch(e){toast('Falha ao importar: '+(e.message||e));}finally{hideLoad();}}
renderDiscover=function(){const dc=document.getElementById('dc');if(!dc)return;const all=HR36_SOURCES;dc.innerHTML=`<div class="src-grid">${all.map((s,i)=>`<div class="src-card2"><div class="src-ico2" style="background:linear-gradient(135deg,#3a2a1a,#7b5b2a,#f5a623)">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-meta2"><span class="src-level ${s.level<=2?'l12':s.level<=4?'l34':'l56'}">HSK ${s.level}</span>${s.type==='book'?'Livro':'Leitura simples'}<span class="src-char-count">${esc(s.chars||'—')} chars</span></div><div class="src-cat">${esc(s.cat||'source')}</div><div class="src-desc2">${esc(s.desc||'')}</div><div class="src-actions2"><button class="pri hr36-noemoji" data-add36="${i}">${SVG.plus} Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">Abrir fonte</a>`:''}</div></div></div>`).join('')}</div>`;dc.querySelectorAll('[data-add36]').forEach(b=>b.onclick=()=>h36AddSource(+b.dataset.add36));};

function h36Decks(){try{return JSON.parse(localStorage.getItem('h36Decks')||'[]');}catch{return[];}}
function v40FreeStorageSpace(){
  try{
    const prefix='link-reader-cache:v6-clean:';
    const entries=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.startsWith(prefix)){
        let savedAt=0;
        try{savedAt=JSON.parse(localStorage.getItem(k)||'{}').savedAt||0;}catch{}
        entries.push({k,savedAt});
      }
    }
    entries.sort((a,b)=>a.savedAt-b.savedAt);
    // remove os mais antigos primeiro, até um terço deles (o suficiente pra abrir espaço
    // sem apagar todo o cache de textos importados de uma vez)
    const toRemove=Math.max(1,Math.ceil(entries.length/3));
    for(let i=0;i<toRemove&&i<entries.length;i++)localStorage.removeItem(entries[i].k);
    return toRemove>0;
  }catch{return false;}
}
function v40SafeLocalStorageSet(key,value){
  try{localStorage.setItem(key,value);return true;}
  catch(e){
    try{
      if(v40FreeStorageSpace()){
        localStorage.setItem(key,value);
        return true;
      }
    }catch{}
    try{toast('Armazenamento cheio — não foi possível salvar agora.');}catch{}
    return false;
  }
}
function h36SaveDecks(d){v40SafeLocalStorageSet('h36Decks',JSON.stringify(d));}
function h36EnsureDeck(){let d=h36Decks();if(!d.length){d=[{id:'default',name:'Padrão',createdAt:Date.now(),newLimit:20}];h36SaveDecks(d);}if(!localStorage.getItem('h36ActiveDeck'))v40SafeLocalStorageSet('h36ActiveDeck',d[0].id);return d;}
function h36ActiveDeck(){h36EnsureDeck();return localStorage.getItem('h36ActiveDeck')||'default';}
function h36TodayKey(){const d=new Date();const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function h36EnsureDailyDeck(){
  const key='daily-'+h36TodayKey();
  const decks=h36Decks();
  if(!decks.find(d=>d.id===key)){decks.push({id:key,name:'Hoje — '+h36TodayKey(),createdAt:Date.now(),newLimit:20,daily:true});h36SaveDecks(decks);}
  return key;
}
const oldSaveWord36=saveWord;
saveWord=async function(word,py,result){
  const defText=result&&result.defs&&result.defs.length?result.defs[0].defs.slice(0,4).map((d,i)=>`${i+1}. ${d.text}`).join('\n'):'';
  const defsFlat=result&&result.defs?result.defs.flatMap(s=>(s.defs||[]).map(d=>d.text)):[];
  let segCount=1;
  try{const run=[...word].filter(isCJK).join('');if(run&&typeof segmentChineseRun==='function')segCount=segmentChineseRun(run).length||1;}catch{}
  const type=segCount>1?'phrase':'word';
  const lv=(typeof getWordLevel==='function'?getWordLevel(word):0)||99;
  const levelLabel=(lv>=1&&lv<=9)?('HSK '+lv):'Fora da base';
  const deckId=h36EnsureDailyDeck();
  const existing=words.find(w=>w.word===word&&(w.deckId||'default')===deckId);
  if(existing){
    existing.occurrences=(existing.occurrences||1)+1;
    existing.updatedAt=Date.now();
    if(!existing.definition&&defText){existing.definition=defText;existing.definitions=defsFlat;}
    await dbPut(STW,existing);
  }else{
    await dbPut(STW,{
      id:Date.now().toString(36)+Math.random().toString(36).slice(2),
      word,wordKey:word,pinyin:py,definition:defText,definitions:defsFlat,
      type,level:lv,levelLabel,
      source:curBook?curBook.title:'',savedAt:Date.now(),updatedAt:Date.now(),
      bookTitle:curBook?curBook.title:'',deckId,deckType:'daily',occurrences:1,
      reps:0,ease:2.5,due:Date.now()
    });
  }
  words=await dbAll(STW);
  try{if(document.getElementById('sw')&&document.getElementById('sw').classList.contains('active'))renderWords();}catch{}
  toast(`"${word}" salvo no baralho de hoje`);
};
function h36DayKeyFromTimestamp(value){
  const d=new Date(Number(value)||Date.now()),pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function h36EnsureDailyDeckForTimestamp(value){
  const date=h36DayKeyFromTimestamp(value),key='daily-'+date,decks=h36Decks();
  if(!decks.find(d=>d.id===key)){decks.push({id:key,name:(date===h36TodayKey()?'Hoje — ':'')+date,createdAt:Number(value)||Date.now(),newLimit:20,daily:true});h36SaveDecks(decks);}
  return key;
}
async function h36MigrateUnassignedCards(){
  const all=await dbAll(STW);let changed=0;
  for(const card of all){
    if(card.mergedInto||card.deckId)continue;
    card.deckId=h36EnsureDailyDeckForTimestamp(card.savedAt||card.updatedAt||Date.now());
    card.deckType='daily';card.updatedAt=card.updatedAt||Date.now();card.due=card.due||Date.now();card.reps=Number(card.reps)||0;card.ease=Number(card.ease)||2.5;
    if(card.type==='sentence'){
      card.pinyin=card.pinyin||(typeof getWordPY==='function'?getWordPY(card.word):'');
      card.definition=card.definition||card.translation||'';
      card.level=card.level||99;card.levelLabel=card.levelLabel||'Frase salva';
    }
    await dbPut(STW,card);changed++;
  }
  if(changed)words=await dbAll(STW);
  return changed;
}
const h36BaseSaveSentence=saveSentence;
saveSentence=async function(sentenceText,translations,originWord){
  sentenceText=String(sentenceText||'').trim();if(!sentenceText)return;
  const now=Date.now(),deckId=h36EnsureDailyDeck(),translation=(translations&&translations[0])||'',py=(typeof getWordPY==='function'?getWordPY(sentenceText):'')||'';
  const all=words.length?words:await dbAll(STW);
  const existing=all.find(card=>card.type==='sentence'&&card.word===sentenceText&&(card.deckId||'')===deckId);
  if(existing){
    existing.occurrences=(existing.occurrences||1)+1;existing.updatedAt=now;existing.originWord=existing.originWord||originWord||'';existing.translation=existing.translation||translation;existing.definition=existing.definition||translation;existing.pinyin=existing.pinyin||py;
    await dbPut(STW,existing);
  }else{
    await dbPut(STW,{id:now.toString(36)+Math.random().toString(36).slice(2),word:sentenceText,wordKey:sentenceText,pinyin:py,definition:translation,translation,type:'sentence',deckType:'daily',deckId,originWord:originWord||'',savedAt:now,updatedAt:now,level:99,levelLabel:'Frase salva',occurrences:1,reps:0,ease:2.5,due:now,bookTitle:curBook?curBook.title:''});
  }
  words=await dbAll(STW);
  try{if(document.getElementById('sw')?.classList.contains('active'))h36RenderFlash();}catch{}
  toast('Frase salva no baralho de hoje!');
};
window.h36MigrateUnassignedCards=h36MigrateUnassignedCards;
function h36MoveWord(id,deckId){const w=words.find(x=>x.id===id);if(!w)return;w.deckId=deckId;dbPut(STW,w).then(loadWords);}
function h36RenderFlash(){h36EnsureDeck();const wc=document.getElementById('wc');if(!wc)return;const tab=(()=>{const t=localStorage.getItem('h36FlashTab');return(t==='decks'||t==='levels')?t:'decks';})();wc.innerHTML=`<div class="flash-tabs"><button class="flash-tab ${tab==='decks'?'on':''}" data-ftab="decks">Baralhos</button><button class="flash-tab ${tab==='levels'?'on':''}" data-ftab="levels">Baralhos por níveis</button></div><div id="flash-body"></div>`;wc.querySelectorAll('[data-ftab]').forEach(b=>b.onclick=()=>{localStorage.setItem('h36FlashTab',b.dataset.ftab);h36RenderFlash();});const body=document.getElementById('flash-body');
  if(tab==='decks'){
    const daily=h36DailyDecksFromWords();
    if(!daily.length){body.innerHTML='<div class="emptyx">Nenhuma palavra salva ainda.<br>Toque numa palavra no texto e salve — ela vira o baralho de hoje.</div>';return;}
    body.innerHTML=`<div class="deck-grid">${daily.map(d=>{const label=h36DateLabel(d.date);return `<div class="deck-card"><div><div class="deck-name">${esc(label)}${label!==d.date?' — '+d.date:''}</div><div class="deck-meta">${d.count} carta${d.count===1?'':'s'}</div></div><div class="deck-actions"><button data-study-daily="${esc(d.id)}">Estudar</button><button data-view-daily="${esc(d.id)}">Ver palavras</button></div></div>`;}).join('')}</div>`;
    body.querySelectorAll('[data-study-daily]').forEach(b=>b.onclick=()=>h36StudyDeck(b.dataset.studyDaily));
    body.querySelectorAll('[data-view-daily]').forEach(b=>b.onclick=()=>h36ViewDeckWords(b.dataset.viewDaily));
  }else{
    const order=[1,2,3,4,5,6,7,8,9,99,'phrase','sentence'];
    const labels={1:'HSK 1',2:'HSK 2',3:'HSK 3',4:'HSK 4',5:'HSK 5',6:'HSK 6',7:'HSK 7',8:'HSK 8',9:'HSK 9',99:'Fora da base',phrase:'Expressões',sentence:'Frases salvas'};
    const counts=order.map(k=>h36WordsByLevelDeduped(k).length);
    body.innerHTML=`<div class="deck-grid">${order.map((k,i)=>`<div class="deck-card"><div><div class="deck-name">${labels[k]}</div><div class="deck-meta">${counts[i]} palavra${counts[i]===1?'':'s'}</div></div><div class="deck-actions"><button data-study-level="${k}" ${counts[i]?'':'disabled'}>Estudar</button><button data-view-level="${k}" ${counts[i]?'':'disabled'}>Ver palavras</button></div></div>`).join('')}</div>`;
    body.querySelectorAll('[data-study-level]').forEach(b=>b.onclick=()=>{if(!b.disabled)h36StudyLevel(b.dataset.studyLevel);});
    body.querySelectorAll('[data-view-level]').forEach(b=>b.onclick=()=>{if(!b.disabled)h36ViewLevelWords(b.dataset.viewLevel);});
  }
}
function h36RunStudySession(allCards,exitFn){
  try{window.hzPreloadCelebration?.();}catch{}
  const body=document.getElementById('flash-body');
  if(!allCards.length){body.innerHTML='<div class="emptyx">Este baralho ainda não tem cartas.</div><button class="plain-btn" id="exit-study" style="margin-top:12px">Sair</button>';document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};return;}
  const now=Date.now();
  const shuffle=arr=>arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  // Só entram na fila cartas realmente "devidas": nunca estudadas (sem due) ou
  // cuja data de revisão já passou. Isso é o que faltava — antes o baralho
  // reciclava tudo sempre, sem noção de "já revisei isso hoje".
  let queue=shuffle(allCards.filter(c=>!c.due||c.due<=now));
  // Baralhos grandes (100+ cartas) liberam algumas cartas extras mesmo antes
  // do horário, misturadas com as já devidas, pra sempre ter o que estudar.
  if(allCards.length>100){
    const notDue=shuffle(allCards.filter(c=>c.due&&c.due>now));
    const extra=notDue.slice(0,Math.max(0,20-queue.length));
    queue=shuffle([...queue,...extra]);
  }
  let i=0,show=false;
  if(!queue.length){
    body.innerHTML='<div class="study-card"><div class="deck-meta" style="font-size:16px;text-align:center">Nenhuma carta pra revisar agora.<br>Volte mais tarde!</div></div><button class="plain-btn" id="study-anyway" style="margin-top:12px">Estudar mesmo assim</button><button class="plain-btn" id="exit-study" style="margin-top:8px">Sair</button>';
    document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
    document.getElementById('study-anyway').onclick=()=>{queue=shuffle(allCards);i=0;show=false;draw();};
    return;
  }
  function draw(){
    if(i>=queue.length){
      body.innerHTML=`<div class="study-card v42-celebrate"><div class="v42-bamboo-field">${[0,1,2,3,4].map(v42BambooSvg).join('')}</div><div class="v42-celebrate-msg"><div class="deck-meta v42-gold" style="font-size:17px">Você terminou a revisão de hoje!</div></div></div><button class="plain-btn" id="exit-study" style="margin-top:12px">Sair</button><div id="v43-mini-player-slot"></div>`;
      try{
        const{trackId,track}=v43PlayCelebrationTrack();
        const slot=document.getElementById('v43-mini-player-slot');
        if(slot){
          slot.innerHTML=`<div class="v43-mini-player" id="v43-mini-player"><img class="v43-mini-cover" src="${V43_COVER}"><div class="v43-mini-info"><div class="v43-mini-title">${esc(track.num)} · ${esc(track.title)}</div><div class="v43-mini-progress"><div class="v43-mini-progress-fill" id="v43-mini-fill"></div></div><div class="v43-mini-time" id="v43-mini-time">0:00 / 0:30</div></div></div>`;
          document.getElementById('v43-mini-player').onclick=()=>{
            v43StopMusic();
            window.hzOpenMusic?.();
            window.hzMusicPlayer?.playTrack?.(trackId);
          };
        }
      }catch{}
      document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
      return;
    }
    const c=queue[i];
    const isSentence=c.type==='sentence';
    const cardPy=c.pinyin||(isSentence&&typeof getWordPY==='function'?getWordPY(c.word):'');
    const cardDef=isSentence?(c.translation||'Sem tradução'):(c.definition||'Sem definição');
    const wordHtml=isSentence&&c.originWord&&typeof v41RenderSentenceWithHighlight==='function'?v41RenderSentenceWithHighlight(c.word,c.originWord):esc(c.word);
    body.innerHTML=`<div class="study-card"><div class="study-word">${wordHtml}</div>${show?`<div class="study-py">${esc(cardPy)}</div><div class="study-def">${esc(cardDef)}</div>`:'<div class="deck-meta">Toque para revelar</div>'}</div>${show?'<div class="study-grades"><button class="g-again" data-g="again">Again</button><button class="g-hard" data-g="hard">Hard</button><button class="g-good" data-g="good">Good</button><button class="g-easy" data-g="easy">Easy</button></div>':'<button class="plain-btn" id="reveal-card">Revelar</button>'}<button class="plain-btn" id="exit-study" style="margin-top:8px">Sair</button>`;
    document.getElementById('exit-study').onclick=()=>{try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}exitFn();};
    const rev=document.getElementById('reveal-card');
    if(rev)rev.onclick=()=>{show=true;draw();};
    body.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{
      const grade=b.dataset.g;
      try{window.hzStat&&window.hzStat.bump('wRev');}catch(e){}
      const days=grade==='again'?0.02:grade==='hard'?1:grade==='good'?3:7;
      c.reps=(c.reps||0)+1;
      c.due=Date.now()+days*86400000;
      dbPut(STW,c);
      i++;show=false;draw();
    });
  }
  draw();
}
window.h36RunStudySession=h36RunStudySession;
function h36StudyDeck(deckId){const cards=words.filter(w=>(w.deckId||'default')===deckId).sort((a,b)=>(a.due||0)-(b.due||0));h36RunStudySession(cards,h36RenderFlash);}
function h36LevelKeyOf(w){if(w.type==='sentence')return'sentence';return w.type==='phrase'?'phrase':((w.level>=1&&w.level<=9)?w.level:99);}
function h36WordsByLevelDeduped(levelKey){const seen=new Set();const out=[];for(const w of words){if(w.mergedInto)continue;if(h36LevelKeyOf(w)!==levelKey)continue;const key=w.wordKey||w.word;if(seen.has(key))continue;seen.add(key);out.push(w);}return out;}
function h36StudyLevel(levelKey){const normalized=(levelKey==='phrase'||levelKey==='sentence')?levelKey:parseInt(levelKey);const cards=h36WordsByLevelDeduped(normalized).sort((a,b)=>(a.due||0)-(b.due||0));h36RunStudySession(cards,h36RenderFlash);}
function h36ViewWordsList(list,emptyMsg){const body=document.getElementById('flash-body');if(!list.length){body.innerHTML=`<button class="plain-btn" id="back-to-decks">← Voltar</button><div class="emptyx">${esc(emptyMsg||'Nenhuma palavra aqui ainda.')}</div>`;document.getElementById('back-to-decks').onclick=h36RenderFlash;return;}
  body.innerHTML=`<button class="plain-btn" id="back-to-decks">← Voltar</button>`+list.map(w=>`<div class="wcard"><div class="flash-word-row"><div><div class="ww">${esc(w.word)}</div><div class="wpy">${esc(w.pinyin||(w.type==='sentence'&&typeof getWordPY==='function'?getWordPY(w.word):''))}</div></div></div><div class="wdf">${esc(w.definition||w.translation||'Sem definição')}</div><div><span class="wtag">${esc(w.levelLabel||(w.type==='sentence'?'Frase salva':w.type==='phrase'?'Expressão':'Palavra'))}</span>${w.occurrences>1?`<span class="wtag" style="margin-left:6px">${w.occurrences}×</span>`:''}</div></div>`).join('');
  document.getElementById('back-to-decks').onclick=h36RenderFlash;
}
function h36ViewDeckWords(deckId){h36ViewWordsList(words.filter(w=>(w.deckId||'default')===deckId).sort((a,b)=>b.savedAt-a.savedAt));}
function h36ViewLevelWords(levelKey){const normalized=(levelKey==='phrase'||levelKey==='sentence')?levelKey:parseInt(levelKey);h36ViewWordsList(h36WordsByLevelDeduped(normalized));}
function h36DailyDecksFromWords(){const map=new Map();for(const w of words){const id=w.deckId||'default';if(!id.startsWith('daily-'))continue;if(!map.has(id))map.set(id,{id,date:id.slice(6),count:0});map.get(id).count++;}return[...map.values()].sort((a,b)=>b.date.localeCompare(a.date));}
function h36DateLabel(dateStr){const today=h36TodayKey();const y=new Date();y.setDate(y.getDate()-1);const pad=n=>String(n).padStart(2,'0');const yesterday=`${y.getFullYear()}-${pad(y.getMonth()+1)}-${pad(y.getDate())}`;if(dateStr===today)return'Hoje';if(dateStr===yesterday)return'Ontem';return dateStr;}
renderWords=function(){loadWordsOnce=false;h36RenderFlash();};
function h36InstallFlashHead(){const sw=document.getElementById('sw');if(sw&&!sw.querySelector('.flash-head')){const wh=sw.querySelector('.wh');if(wh)wh.outerHTML=`<div class="flash-head"><h1>Flashcards</h1><button class="ib" id="bwclear" title="Limpar palavras">${SVG.trash}</button></div>`;const b=document.getElementById('bwclear');if(b)b.onclick=()=>{if(confirm('Limpar todas as palavras salvas?')){dbClr(STW).then(loadWords);}};}}
// boot
setTimeout(()=>{try{h36EnsureDeck();h36InstallFlashHead();renderDiscover();renderLib();h36MigrateUnassignedCards().then(loadWords);h36InstallNext();const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent='v3.8';}catch(e){console.warn('v3.8 boot',e);}},900);
})();


/* ===== v37-baidu-books-sources-script ===== */
/* v3.8: Baidu gettts prioritized, robust library mode buttons, smarter source import/page splitting, richer exact sentence search. */
(function(){
const V37_VERSION='v3.8';
const V37_BAIDU_TTS=text=>`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(String(text||'').trim())}&spd=5&source=web`;
function v37Svg(name){
 const icons={
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  ana:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
  link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
 };
 return icons[name]||icons.plus;
}
function v37InstallCss(){
 if(document.getElementById('v37-css'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="v37-css">
 .mode-row{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important}.mode-btn,.mode-plus{touch-action:manipulation}.mode-btn.on,.mode-plus.on{border-color:rgba(var(--ac-rgb),.52)!important;color:var(--ac)!important;background:rgba(var(--ac-rgb),.10)!important}.mode-plus svg{width:18px;height:18px}.book-actions,.card-actions{align-items:center!important}.book-actions button,.card-actions button{font-size:0!important}.book-actions svg,.card-actions svg{width:16px!important;height:16px!important}.src-grid{gap:12px}.src-card2{display:grid!important;grid-template-columns:54px 1fr!important;align-items:start!important}.src-ico2{width:48px!important;height:60px!important;border-radius:14px!important;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--rf);font-size:24px;font-weight:800}.src-card2.long-src{border-color:rgba(var(--ac-rgb),.25)!important}.src-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}.src-badge{border:1px solid rgba(var(--ac-rgb),.24);background:rgba(var(--ac-rgb),.06);color:#cda76b;border-radius:999px;padding:2px 7px;font-size:10.5px;font-weight:800}.src-actions2 button svg,.src-actions2 a svg{width:14px;height:14px}.sent-card.v37{border-color:rgba(var(--ac-rgb),.15)!important}.sent-src b{color:var(--ac)}.dict-empty small{color:#8b7355}.reader-next{display:inline-flex;align-items:center;gap:5px}.reader-next svg{width:16px;height:16px}.v37-audio-note{font-size:11px;color:#8c7b63;margin-top:6px}
 </style>`);
}
function v37SetMode(mode){
 try{showScreen('sl');}catch{}
 window.v29LibMode=mode==='books'?'books':'simple';
 try{localStorage.setItem('hlibMode',window.v29LibMode);}catch{}
 try{renderLib();}catch(e){console.warn('renderLib v37',e);}
 setTimeout(()=>{try{renderLib();}catch{}},50);
}
function v37InstallModeButtons(){
 const pairs=[['mode-simple','simple'],['mode-books','books']];
 pairs.forEach(([id,mode])=>{const el=document.getElementById(id);if(el&&!el._v37){el._v37=true;el.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode(mode);},true);}});
 const ps=document.getElementById('plus-simple');if(ps&&!ps._v37){ps._v37=true;ps.innerHTML=v37Svg('plus');ps.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode('simple');try{window.v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');}catch{}},true);} 
 const pb=document.getElementById('plus-books');if(pb&&!pb._v37){pb._v37=true;pb.innerHTML=v37Svg('plus');pb.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();v37SetMode('books');try{v29OpenBookEditor();}catch{}},true);} 
}
document.addEventListener('click',e=>{const ms=e.target.closest('#mode-simple'), mb=e.target.closest('#mode-books'), ps=e.target.closest('#plus-simple'), pb=e.target.closest('#plus-books');if(ms){e.preventDefault();e.stopPropagation();v37SetMode('simple');}if(mb){e.preventDefault();e.stopPropagation();v37SetMode('books');}if(ps){e.preventDefault();e.stopPropagation();v37SetMode('simple');try{window.v29ImportContext='simple';v29PrepImport('Adicionar leitura simples');showModal('mo-import');}catch{}}if(pb){e.preventDefault();e.stopPropagation();v37SetMode('books');try{v29OpenBookEditor();}catch{}}},true);

function v37PageChars(){
 const fs=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||38;
 const vw=Math.min(window.innerWidth||390, 900)-36;
 const vh=Math.max(420,(window.innerHeight||720)-165);
 const charsPerLine=Math.max(7,Math.floor(vw/(fs*.92)));
 const lines=Math.max(5,Math.floor(vh/(fs*1.55)));
 return Math.max(170,Math.floor(charsPerLine*lines*1.18));
}
function v37CjkLen(t){return ([...String(t||'')].filter(isCJK).length);}
function v37SplitText(text,baseTitle='Página'){
 text=cleanRaw(String(text||'')).replace(/\n{3,}/g,'\n\n');
 const limit=v37PageChars();
 if(v37CjkLen(text)<=limit*1.18)return [{num:1,title:baseTitle,content:text}];
 const units=[];let buf='';
 for(const ch of [...text]){buf+=ch;if(/[。！？!?]\s*$/.test(buf)||buf.length>=limit*.55&&/[，,；;：:\n]/.test(ch)){units.push(buf);buf='';}}
 if(buf)units.push(buf);
 const pages=[];let cur='',n=1;
 for(const u of units){if(v37CjkLen(cur+u)>limit && cur.trim()){pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});n++;cur='';}cur+=u;}
 if(cur.trim())pages.push({num:n,title:`${baseTitle} ${n}`,content:cur.trim()});
 return pages.length?pages:[{num:1,title:baseTitle,content:text}];
}
async function v37Fetch(url){return await fetchText(url);}
const V37_SOURCES=[
 {cat:'Leituras graduadas',type:'simple',level:1,title:'故事365 — histórias infantis',chars:'variável',url:'https://www.gushi365.com/',desc:'Site chinês nativo (mainland) de histórias infantis, mandarim simplificado, frases curtas — ótimo para nível iniciante.'},
 {cat:'Leituras graduadas',type:'simple',level:1,title:'故事365 — histórias curtas',chars:'variável',url:'https://www.gushi365.com/xiaogushi/',desc:'Seção específica de histórias curtas do 故事365 — página com texto corrido, sem listagem de links apenas.'},
 {cat:'Leituras graduadas',type:'simple',level:1,title:'七故事网 — contos e fábulas',chars:'variável',url:'https://www.qigushi.com/',desc:'Site 100% chinês (mainland), contos infantis/fábulas/ditados em mandarim simplificado — vocabulário básico.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'人民网 — notícias',chars:'variável',url:'https://www.people.com.cn/',desc:'Portal de notícias oficial da China continental, 100% mandarim simplificado; importe a URL de um artigo específico.'},
 {cat:'Uso moderno',type:'simple',level:5,title:'新华网 — notícias',chars:'variável',url:'https://www.xinhuanet.com/',desc:'Agência de notícias estatal chinesa (mainland); conteúdo denso e 100% em mandarim simplificado.'}
];
window.V37_SOURCES=V37_SOURCES;
async function v37AddSource(i){
 const s=V37_SOURCES[i];if(!s)return;
 showLoad('Importando source...');
 try{
   const chapters=[];
   const rawCh=s.chapters||[{num:1,title:s.title,url:s.url,content:s.content||''}];
   for(const [idx,ch] of rawCh.entries()){
     let content=ch.content||'';
     if(!content && ch.url){try{content=await v37Fetch(ch.url);}catch(e){content='';}}
     content=cleanRaw(content||`Fonte: ${ch.url||s.url}\n\nA extração automática não conseguiu capturar o texto completo. Abra a fonte e importe a página específica pelo modo URL.`);
     const pages=v37SplitText(content,ch.title||s.title||'Página');
     pages.forEach((p,j)=>chapters.push({id:v29NewId(),num:chapters.length+1,title:pages.length>1?p.title:(ch.title||s.title||'Página'),content:p.content,progress:0,addedAt:Date.now(),sourceUrl:ch.url||s.url}));
   }
   const combined=chapters.map(c=>c.content).join('\n\n');
   const onePage=chapters.length<=1 && v37CjkLen(combined)<=v37PageChars()*1.18;
   if(s.type!=='book' || onePage){
     await dbPut(STB,{id:v29NewId(),kind:'simple',title:s.title,source:s.url||'Source pública',content:combined,type:'source',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});
     toast(onePage&&s.type==='book'?'Conteúdo curto salvo em Leitura simples':'Leitura adicionada');
     v37SetMode('simple');
   }else{
     await dbPut(STB,{id:v29NewId(),kind:'book',title:s.title,source:s.url||'Source pública',cover:s.cover||'',synopsis:(s.desc||'').slice(0,100),chapters,lastRead:null,addedAt:Date.now(),lastChapterIndex:0});
     toast(`Livro adicionado com ${chapters.length} páginas`);
     v37SetMode('books');
   }
   books=await dbAll(STB);renderLib();
 }catch(e){toast('Falha ao importar: '+(e.message||e));}
 finally{hideLoad();}
}
renderDiscover=function(){
 const dc=document.getElementById('dc');if(!dc)return;
 const cats=[...new Set(V37_SOURCES.map(s=>s.cat))];
 dc.innerHTML=cats.map(cat=>`<div class="src-section"><div class="sgt">${esc(cat)}</div><div class="src-grid">${V37_SOURCES.map((s,i)=>({s,i})).filter(x=>x.s.cat===cat).map(({s,i})=>`<div class="src-card2 ${s.type==='book'?'long-src':''}"><div class="src-ico2" style="background:linear-gradient(135deg,#26221d,rgba(var(--ac-rgb),.5),var(--ac))">${esc((s.title||'?')[0])}</div><div><div class="src-title2">${esc(s.title)}</div><div class="src-badges"><span class="src-badge">HSK ${s.level}</span><span class="src-badge">${s.type==='book'?'Livro/páginas':'Leitura simples'}</span><span class="src-badge">${esc(s.chars||'—')} chars</span></div><div class="src-desc2">${esc(s.desc||'')}</div><div class="src-actions2"><button class="pri hr36-noemoji" data-v37-add="${i}">${v37Svg('plus')}Adicionar</button>${s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${v37Svg('link')}Abrir fonte</a>`:''}</div></div></div>`).join('')}</div></div>`).join('');
 dc.querySelectorAll('[data-v37-add]').forEach(b=>b.onclick=()=>v37AddSource(+b.dataset.v37Add));
};

function v37Contains(zh,q){const needle=[...String(q||'').trim()].filter(isCJK).join('');if(!needle)return false;return String(zh||'').includes(needle);}
const V37_LOCAL_SENTENCES=[]/*v4.8: banco local de exemplo removido (nao usado mais - app e online-first)*/;
async function v37Tatoeba(q){
 const found=[];try{const n=[...String(q||'')].filter(isCJK).join('');const url=`https://tatoeba.org/en/api_v0/search?from=cmn&query=${encodeURIComponent(n)}&trans_to=eng&sort=relevance&orphans=no&word_count_max=32`;const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(r.ok){const d=await r.json();for(const x of d.results||[]){const zh=x.text||'';if(!v37Contains(zh,n))continue;let en='';try{en=(x.translations||[]).flat().find(t=>t&&t.lang==='eng')?.text||(x.translations||[]).flat()[0]?.text||'';}catch{}found.push({zh,py:getWordPY(zh),en:en||'',pt:'',src:'Tatoeba'});}}}catch{}
 return found;
}
async function v37Jukuu(q){
 const n=[...String(q||'')].filter(isCJK).join('');if(!n)return[];
 const out=[];const urls=[`https://r.jina.ai/http://www.jukuu.com/search.php?q=${encodeURIComponent(n)}`,`https://r.jina.ai/http://dict.youdao.com/example/blng/eng/${encodeURIComponent(n)}/`];
 for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(7500)});if(!r.ok)continue;const txt=await r.text();const lines=txt.split(/\n+/).map(x=>x.trim()).filter(Boolean);for(let i=0;i<lines.length;i++){const zh=(lines[i].match(/[\u3400-\u9fff][\u3400-\u9fff，。！？、；：“”《》（）\s]{3,80}/)||[])[0];if(zh&&v37Contains(zh,n)&&!out.some(s=>s.zh===zh)){const en=(lines[i+1]||'').replace(/[#*_`>]/g,'').trim();out.push({zh:zh.replace(/\s+/g,''),py:getWordPY(zh),en:/[a-zA-Z]/.test(en)?en:'',pt:'',src:url.includes('jukuu')?'Jukuu via reader':'Youdao examples via reader'});if(out.length>=8)return out;}}}catch{}}
 return out;
}
function v37TransButton(en){return (typeof v34TransButton==='function')?v34TransButton(en):esc(en||'');}
function v37AudioButton(text){return `<button class="dict-audio v34-svg-only" data-v34-speak="${esc(text||'')}" title="Pronúncia">${v37Svg('sound')}</button>`;}
v29RenderDictSentences=async function(q,out){
 if(!out)return;const n=[...String(q||'').trim()].filter(isCJK).join('');out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases exatas…</small></div>';
 let sents=[];try{if(Array.isArray(V34_SENTENCES))sents=sents.concat(V34_SENTENCES.filter(s=>v37Contains(s.zh,n)));}catch{}
 sents=sents.concat(V37_LOCAL_SENTENCES.filter(s=>v37Contains(s.zh,n)));
 const ext=[...(await v37Tatoeba(n)),...(await v37Jukuu(n))];
 for(const s of ext){if(v37Contains(s.zh,n)&&!sents.some(x=>x.zh===s.zh))sents.push(s);}
 sents=sents.filter(s=>v37Contains(s.zh,n));
 if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente esse termo. O app não mostra frases aproximadas sem a palavra pesquisada.</div>';return;}
 out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases que contêm “'+esc(n)+'”</div>'+sents.slice(0,18).map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py">${esc(s.py||getWordPY(s.zh))}</div></div>${v37AudioButton(s.zh)}</div><div class="sent-tr">${s.pt?esc(s.pt):(s.en?v37TransButton(s.en):'Tradução humana indisponível nesta fonte.')}</div><div class="sent-src"><b>${esc(s.src||'Banco de frases')}</b> • contém “${esc(n)}”</div></div>`).join('')+'</div>';
 try{v34BindAudio(out);v34BindAuto(out);}catch{}
};

// Reinstala o botão Próximo e garante que abrir livro vá ao último ponto, enquanto segurar mostra capítulos.
if(typeof openBook==='function'){
 const oldOpenBook37=openBook;
 openBook=function(id){const b=(books||[]).find(x=>x.id===id);if(!b)return oldOpenBook37(id);const kind=(typeof h36BookKind==='function'?h36BookKind(b):(b.kind||''));if(kind==='book'){const ch=(typeof h36Chapters==='function'?h36Chapters(b):(b.chapters||[]));if(ch.length){return v29OpenBookChapter(id,Math.max(0,Math.min(b.lastChapterIndex||0,ch.length-1)));}}return oldOpenBook37(id);};
}
function v37Boot(){v37InstallCss();v37InstallModeButtons();try{renderDiscover();renderLib();}catch{}const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=V37_VERSION;}
setTimeout(v37Boot,1200);setTimeout(v37Boot,2300);window.addEventListener('resize',()=>{try{renderLib();}catch{}},{passive:true});
})();


/* ===== inline-10 ===== */
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


/* ===== v39-dict-sents-term-audio-patch ===== */
/* v3.9: frase inteira no TTS, frases externas primeiro, DICT por palavra + ideogramas, WORDS online, termos maiores e pontuação ajustada. */
(function(){
const HR39_VERSION='v3.9';
function hr39Css(){
 if(document.getElementById('hr39-css'))return;
 document.head.insertAdjacentHTML('beforeend',`<style id="hr39-css">
 .sent-py{font-weight:950!important;color:#f4c36f!important;letter-spacing:.1px}.sent-card .sent-top{grid-template-columns:minmax(0,1fr) 38px!important}.sent-zh{word-break:keep-all!important;overflow-wrap:break-word}.dict-audio,.lexi-audio,[data-v34-speak]{touch-action:manipulation}.dict-char-grid{display:flex;flex-direction:column;gap:10px;margin:0 -16px}.char-card{background:#111;border-bottom:1px solid #2a2a2a;padding:14px 28px}.char-head{display:flex;align-items:center;gap:10px}.char-hz{font-family:var(--rf);font-size:42px;color:#e583ff;line-height:1}.char-py{font-size:18px;color:#fff;font-weight:900}.char-def{font-size:16px;color:#ddd;line-height:1.48;margin-top:8px}.dict-word-note{font-size:12px;color:#8c7b63;margin:6px 28px 0}.term-box{border:1px solid rgba(var(--ac-rgb),.26);background:#211e19;border-radius:13px;margin:0 0 10px;overflow:hidden}.term-head{width:100%;border:0;background:transparent;color:#f5c879;display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;padding:10px 12px;font-weight:900}.term-body{display:none;padding:0 12px 12px;color:#ddd;font-size:13px;line-height:1.55}.term-box.open .term-body{display:block}.term-big{font-family:var(--rf);font-size:24px;color:#fff;display:inline-flex;align-items:center;gap:8px}.term-py{color:#f4c36f;font-weight:900;margin:4px 0}.term-def{border-top:1px solid #34302a;padding-top:7px;margin-top:7px}.term-audio{width:30px;height:30px;border:0;border-radius:50%;background:#2d2a24;color:#f4c36f;display:inline-flex;align-items:center;justify-content:center}.dict-src-tag{font-size:11px;color:#8f7a5e;margin-top:6px}.online-first{font-size:11px;color:#8c7b63;margin:0 28px 12px}.term-muted{font-size:11px;color:#82745f;margin-top:5px}
 </style>`);
}
function hr39Cjk(s){return [...String(s||'')].filter(ch=>{try{return isCJK(ch)}catch{return /[\u3400-\u9fff]/.test(ch)}}).join('');}
function hr39Contains(zh,q){const n=hr39Cjk(q);if(!n)return false;return String(zh||'').includes(n);}
function hr39CleanLine(s){return String(s||'').replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function hr39AudioButton(text){return `<button class="dict-audio v34-svg-only" data-v34-speak="${esc(text||'')}" title="Pronúncia">${(typeof v37Svg==='function'?v37Svg('sound'):'▶')}</button>`;}
function hr39DefsFromEntry(e){let defs=[];try{defs=Array.isArray(e.english)?e.english:(e.definitions||e.defs||[]);}catch{}return defs.map(hr39CleanLine).filter(Boolean);}
async function hr39Cedict(q){try{if(typeof v29CedictRaw==='function'){const a=await v29CedictRaw(q);if(Array.isArray(a)&&a.length)return a;}}catch{}try{const r=await fetch(`https://cccedict.vercel.app/api/dict?q=${encodeURIComponent(q)}`,{signal:AbortSignal.timeout(7500)});if(!r.ok)return[];return await r.json();}catch{return[];}}
async function hr39LookupShort(q){let out=[];try{const raw=await hr39Cedict(q);for(const e of raw||[]){const simp=e.simplified||e.simp||e.word||q;const trad=e.traditional||e.trad||'';const py=e.pinyin||e.py||getWordPY(simp);const defs=hr39DefsFromEntry(e);if(defs.length)out.push({word:simp,trad,py,defs,src:'CC-CEDICT'});}}catch{}if(!out.length){try{const r=await lookupAll(q);if(r&&r.defs){const defs=[];(r.defs||[]).forEach(g=>(g.defs||[]).forEach(d=>defs.push(hr39CleanLine(d.text))));if(defs.length)out.push({word:q,trad:'',py:getWordPY(q),defs,src:r.src||'Dicionário'});}}catch{}}
 return out;
}
async function hr39RenderCharBreakdown(chars){const cards=[];for(const ch of chars){const res=await hr39LookupShort(ch);const best=res[0]||{word:ch,py:getWordPY(ch),defs:['Sem definição isolada encontrada nesta consulta.'],src:'—'};cards.push(`<div class="char-card"><div class="char-head"><span class="char-hz">${esc(ch)}</span><span class="char-py">${esc(best.py||getWordPY(ch))}</span>${hr39AudioButton(ch)}</div>${best.defs.slice(0,4).map((d,i)=>`<div class="char-def"><b>${i+1}.</b> ${esc(d)}</div>`).join('')}<div class="dict-src-tag">${esc(best.src||'')}</div></div>`);}return cards.join('');}
async function hr39RenderDictDefs(q,out){const clean=hr39Cjk(q)||String(q||'').trim();if(!clean){out.innerHTML='<div class="dict-empty">Digite uma palavra ou ideograma.</div>';return;}out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const entries=await hr39LookupShort(clean);const best=entries[0];let html='<div class="dict-results-lexi">';
 if(best){html+=`<div class="lexi-hero"><div class="lexi-zh ${clean.length>3?'small':''}">${esc(clean)} ${hr39AudioButton(clean)}</div><div class="lexi-py">${esc(best.py||getWordPY(clean))}<span class="lexi-source">${esc(best.src||'')}</span></div>${best.trad?`<div class="dict-trad">Tradicional ${esc(typeof v29TradMask==='function'?v29TradMask(clean,best.trad):best.trad)}</div>`:''}</div><div class="lexi-entry"><div class="lexi-pos">TRADUÇÃO / DEFINIÇÕES</div>${best.defs.slice(0,10).map((d,i)=>`<div class="lexi-def"><span class="lexi-num">${i+1}</span>${esc(d)}</div>`).join('')}</div>`;
 }else{html+=`<div class="lexi-hero"><div class="lexi-zh ${clean.length>3?'small':''}">${esc(clean)} ${hr39AudioButton(clean)}</div><div class="lexi-py">${esc(getWordPY(clean))}</div></div><div class="lexi-entry"><div class="lexi-def">Sem definição exata encontrada nos bancos atuais.</div></div>`;}
 const chars=[...clean].filter(ch=>isCJK(ch));if(chars.length>1){html+=`<div class="dict-subtitle">Ideogramas separadamente</div><div class="dict-char-grid">${await hr39RenderCharBreakdown(chars)}</div>`;}
 html+='</div>';out.innerHTML=html;try{v34BindAuto(out);}catch{}
}
async function hr39MdbgWords(q){const n=hr39Cjk(q);if(!n)return[];const found=[];const urls=[`https://r.jina.ai/http://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(n)}`,`https://r.jina.ai/http://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=1&wdqb=${encodeURIComponent(n)}`];for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(8500)});if(!r.ok)continue;const txt=await r.text();const re=/([\u3400-\u9fff]{1,8})\s+\[([^\]]{1,80})\]\s+([^\n]{2,160})/g;let m;while((m=re.exec(txt))&&found.length<60){if(!m[1].includes(n))continue;found.push({word:m[1],py:m[2],defs:[hr39CleanLine(m[3])],src:'MDBG/CC-CEDICT'});}}catch{}}return found;}
async function hr39WordCandidates(q){const n=hr39Cjk(q);const map=new Map();function add(x){const w=x.word||x.simplified||x.simp||'';if(!w||!w.includes(n))return;const old=map.get(w)||{};map.set(w,{...old,...x,word:w,defs:x.defs||hr39DefsFromEntry(x)});}try{(await hr39Cedict(n)).forEach(add);}catch{}try{(await hr39MdbgWords(n)).forEach(add);}catch{}try{[...HSK_LEVEL.keys()].filter(w=>w.includes(n)).slice(0,80).forEach(w=>add({word:w,py:getWordPY(w),defs:['HSK/local word; toque em DICT para consultar.'],src:'HSK'}));}catch{}return [...map.values()].sort((a,b)=>a.word.length-b.word.length||a.word.localeCompare(b.word,'zh')).slice(0,80);}
async function hr39RenderDictWords(q,out){const n=hr39Cjk(q);if(!n){out.innerHTML='<div class="dict-empty">Digite um ideograma ou palavra.</div>';return;}out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const words=await hr39WordCandidates(n);if(!words.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras formadas com esse termo nas fontes online atuais.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que contêm “'+esc(n)+'”</div><div class="online-first">Busca online em CC-CEDICT/MDBG, com fallback HSK/local.</div>'+words.map(w=>`<div class="dict-item"><div class="dict-item-main"><div class="zh">${esc(w.word)}${w.trad&&w.trad!==w.word?` <span class="trad">〔${esc(w.trad)}〕</span>`:''}</div><div class="py">${esc(w.py||w.pinyin||getWordPY(w.word))}</div><div class="en"><span class="posline">${esc((w.pos||'').toString().toUpperCase())}</span>${esc((w.defs||[]).slice(0,3).join('; ')||'Consultar em DICT.')}</div><div class="dict-src-tag">${esc(w.src||'CC-CEDICT')}</div></div>${hr39AudioButton(w.word)}</div>`).join('')+'</div>';}
async function hr39TatoebaApi(q){const n=hr39Cjk(q);const urls=[`https://tatoeba.org/en/api_v0/search?from=cmn&to=eng&query=${encodeURIComponent(n)}&sort=relevance&orphans=no&word_count_max=40`,`https://tatoeba.org/en/api_v0/search?from=cmn&trans_to=eng&query=${encodeURIComponent(n)}&sort=relevance&orphans=no&word_count_max=40`];const out=[];for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(8500)});if(!r.ok)continue;const d=await r.json();for(const x of d.results||[]){const zh=hr39CleanLine(x.text||x.sentence||'');if(!hr39Contains(zh,n))continue;let en='';try{const flat=(x.translations||[]).flat(Infinity);en=(flat.find(t=>t&&t.lang==='eng')||flat.find(t=>t&&t.text)||{}).text||'';}catch{}out.push({zh,py:getWordPY(zh),en:hr39CleanLine(en),pt:'',src:'Tatoeba API'});}}catch{}}return out;}
async function hr39TatoebaScrape(q){const n=hr39Cjk(q);const out=[];const url=`https://r.jina.ai/http://tatoeba.org/en/sentences/search?query=${encodeURIComponent(n)}&from=cmn&to=eng`;try{const r=await fetch(url,{signal:AbortSignal.timeout(9000)});if(!r.ok)return[];const lines=(await r.text()).split(/\n+/).map(hr39CleanLine).filter(Boolean);for(let i=0;i<lines.length&&out.length<18;i++){const zh=(lines[i].match(/[\u3400-\u9fff][\u3400-\u9fff，。！？、；：“”《》（）\s]{2,90}/)||[])[0];if(zh&&hr39Contains(zh,n)&&!out.some(s=>s.zh===zh)){let en='';for(let j=i+1;j<Math.min(i+5,lines.length);j++){if(/[A-Za-z]/.test(lines[j])&&!/[\u3400-\u9fff]/.test(lines[j])){en=lines[j];break;}}out.push({zh:zh.replace(/\s+/g,''),py:getWordPY(zh),en,pt:'',src:'Tatoeba via reader'});}}}catch{}return out;}
async function hr39JukuuYoudao(q){const n=hr39Cjk(q);const out=[];const urls=[`https://r.jina.ai/http://www.jukuu.com/search.php?q=${encodeURIComponent(n)}`,`https://r.jina.ai/http://dict.youdao.com/example/blng/eng/${encodeURIComponent(n)}/`];for(const url of urls){try{const r=await fetch(url,{signal:AbortSignal.timeout(8500)});if(!r.ok)continue;const lines=(await r.text()).split(/\n+/).map(hr39CleanLine).filter(Boolean);for(let i=0;i<lines.length&&out.length<18;i++){const zh=(lines[i].match(/[\u3400-\u9fff][\u3400-\u9fff，。！？、；：“”《》（）\s]{3,110}/)||[])[0];if(!zh||!hr39Contains(zh,n)||out.some(s=>s.zh===zh))continue;let en='';for(let j=i+1;j<Math.min(i+4,lines.length);j++){if(/[A-Za-z]/.test(lines[j])&&!/[\u3400-\u9fff]{2,}/.test(lines[j])){en=lines[j];break;}}out.push({zh:zh.replace(/\s+/g,''),py:getWordPY(zh),en,pt:'',src:url.includes('jukuu')?'Jukuu via reader':'Youdao examples via reader'});}}catch{}}return out;}
async function hr39SentenceSearch(q){const n=hr39Cjk(q);const map=new Map();for(const fetcher of [hr39TatoebaApi,hr39TatoebaScrape,hr39JukuuYoudao]){try{const arr=await fetcher(n);for(const s of arr){if(!hr39Contains(s.zh,n))continue;if(!map.has(s.zh))map.set(s.zh,s);}}catch{}}return [...map.values()].slice(0,24);}
async function hr39RenderDictSentences(q,out){const n=hr39Cjk(q);if(!n){out.innerHTML='<div class="dict-empty">Digite uma palavra para buscar frases.</div>';return;}out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases em bancos externos…</small></div>';let sents=await hr39SentenceSearch(n);if(!sents.length){try{sents=(V37_LOCAL_SENTENCES||[]).filter(s=>hr39Contains(s.zh,n)).map(s=>({...s,src:'fallback local'}));}catch{}}
 if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases externas que contenham exatamente esse termo nesta conexão.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases que contêm “'+esc(n)+'”</div><div class="online-first">Online first: Tatoeba/Jukuu/Youdao. Fallback local só se a rede não retornar exemplos.</div>'+sents.map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py"><b>${esc(s.py||getWordPY(s.zh))}</b></div></div>${hr39AudioButton(s.zh)}</div><div class="sent-tr">${s.pt?esc(s.pt):(s.en?((typeof v37TransButton==='function')?v37TransButton(s.en):esc(s.en)):'Tradução indisponível nesta fonte.')}</div><div class="sent-src"><b>${esc(s.src||'Banco externo')}</b> • frase completa enviada ao áudio</div></div>`).join('')+'</div>';try{v34BindAuto(out);}catch{}}
function hr39Composite(w){const chars=[...w];if(chars.length<4)return false;for(let i=2;i<=chars.length-2;i++){const a=chars.slice(0,i).join(''),b=chars.slice(i).join('');try{if((HSK_LEVEL.has(a)||SEG_WORDS.includes(a))&&(HSK_LEVEL.has(b)||SEG_WORDS.includes(b)))return true;}catch{}}return false;}
function hr39PatchSeg(){try{const old=bestDictAt;bestDictAt=function(run,i){for(const w of SEG_WORDS){if(w.length>1&&run.startsWith(w,i)){if(hr39Composite(w))continue;return w;}}return '';};}catch{}}
async function hr39FindTerm(tid){try{const tok=readerTokens[tid];if(!tok)return null;const tokens=readerTokens;const cands=[];function add(start,end){if(start<0||end>=tokens.length||start>end)return;const w=tokens.slice(start,end+1).map(t=>t.word).join('');if(w&&w.length>(tok.word||'').length&&w.length<=12&&!cands.includes(w))cands.push(w);}add(tid-1,tid);add(tid,tid+1);add(tid-1,tid+1);add(tid,tid+2);add(tid-2,tid);for(const w of cands){const raw=await hr39Cedict(w);const exact=(raw||[]).find(e=>(e.simplified||e.simp||e.word)===w||(e.traditional||e.trad)===w);if(exact){return {word:w,py:exact.pinyin||getWordPY(w),defs:hr39DefsFromEntry(exact),src:'CC-CEDICT',tone:applyToneSandhi(w,exact.pinyin||getWordPY(w))};}}}catch{}return null;}
async function hr39RenderTermBox(tid){const body=document.getElementById('tip-body');if(!body||document.getElementById('term-box'))return;const term=await hr39FindTerm(tid);if(!term)return;const changed=term.tone&&term.tone.changed;const html=`<div class="term-box" id="term-box"><button class="term-head" type="button"><span>Termo maior detectado</span><span>${esc(term.word)}</span></button><div class="term-body"><div class="term-big">${esc(term.word)} <button class="term-audio" data-v34-speak="${esc(term.word)}">${(typeof v37Svg==='function'?v37Svg('sound'):'▶')}</button></div><div class="term-py">${esc(term.py||getWordPY(term.word))}</div><div class="term-def">${esc((term.defs||[]).slice(0,3).join('; ')||'Sem definição curta.')}</div>${changed?`<div class="term-muted">Tom original: ${esc(term.tone.oldPy||'')}<br>Pronúncia natural: ${esc(term.tone.py||'')}<br>${esc((term.tone.changes||[]).join(' • '))}</div>`:''}<div class="dict-src-tag">${esc(term.src)}</div></div></div>`;body.insertAdjacentHTML('afterbegin',html);const box=document.getElementById('term-box');box.querySelector('.term-head').onclick=()=>box.classList.toggle('open');}
function hr39PatchTap(){if(typeof onTap!=='function'||onTap._hr39)return;const old=onTap;onTap=async function(el){await old(el);const tid=parseInt(el&&el.dataset?el.dataset.tid:'-1');setTimeout(()=>hr39RenderTermBox(tid),120);};onTap._hr39=true;}
function hr39PatchAudio(){if(typeof h36TryDirect!=='function'||typeof h36Seg!=='function')return;window.hr39SpeakWhole=async function(text){h36Stop();h36Busy(true);text=String(text||'').trim();try{if(![...text].some(isCJK))return;let ok=await h36TryDirect(text);if(!ok&&text.length>1){for(const part of h36Seg(text)){if(/[，,、；;：:]/.test(part)){await delay(75);continue;}if(/[。！？!?]/.test(part)){await delay(150);continue;}if(await h36TryDirect(part))ok=true;else{for(const ch of [...part].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}await delay(32);}}if(!ok){for(const ch of [...text].filter(isCJK)){if(await h36TryDirect(ch))ok=true;await delay(34);}}if(!ok)toast('Nenhuma rota de áudio respondeu agora.');}finally{h36Busy(false);}};h36Speak=window.hr39SpeakWhole;speakWordMode=function(word,mode='natural'){return h36Speak(word,{mode});};speakWord=function(word){return h36Speak(word);};window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h36Speak((d&&d.zh)||key);};window.hr36Speak=h36Speak;}
function hr39PatchPunct(){/* v4.9: desativado — sobrescrevia tokenPunct com uma versão sem a estrutura
   de caixa uniforme (wunit>pyrow fantasma+hzrow) e sem data-ci, desfazendo a correção de alinhamento
   de pontuação e quebrando o mapeamento de seleção para o texto bruto, a cada 300/1200/2600ms. */}
function hr39Install(){hr39Css();hr39PatchAudio();hr39PatchPunct();hr39PatchSeg();hr39PatchTap();try{v29RenderDictDefs=(v29RenderDictDefs&&v29RenderDictDefs.__h52Final)?v29RenderDictDefs:hr39RenderDictDefs;v29RenderDictWords=(v29RenderDictWords&&v29RenderDictWords.__h52Final)?v29RenderDictWords:hr39RenderDictWords;v29RenderDictSentences=(v29RenderDictSentences&&v29RenderDictSentences.__h52Final)?v29RenderDictSentences:hr39RenderDictSentences;}catch{}try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=HR39_VERSION;}catch{}}
setTimeout(hr39Install,300);setTimeout(hr39Install,1200);setTimeout(hr39Install,2600);
})();


/* ===== v41-edge-sogou-voice-fix ===== */
(()=>{
const H41_VERSION='v4.1';
const H41_DEFAULT={voice:'zh-CN-XiaoxiaoNeural',speed:1,pitch:0,volume:0,style:'general',format:'audio-24khz-48kbitrate-mono-mp3',chunkMode:'line'};
const H41_FEMALE=[['zh-CN-XiaoxiaoNeural','晓晓 Xiaoxiao · feminina suave'],['zh-CN-XiaoyiNeural','晓伊 Xiaoyi · feminina doce'],['zh-CN-XiaochenNeural','晓辰 Xiaochen · feminina知性'],['zh-CN-XiaohanNeural','晓涵 Xiaohan · feminina elegante'],['zh-CN-XiaomengNeural','晓梦 Xiaomeng · feminina'],['zh-CN-XiaomoNeural','晓墨 Xiaomo · feminina literária'],['zh-CN-XiaoqiuNeural','晓秋 Xiaoqiu · feminina madura'],['zh-CN-XiaoruiNeural','晓睿 Xiaorui · feminina séria'],['zh-CN-XiaoshuangNeural','晓双 Xiaoshuang · feminina viva'],['zh-CN-XiaoxuanNeural','晓萱 Xiaoxuan · feminina clara'],['zh-CN-XiaoyanNeural','晓颜 Xiaoyan · feminina'],['zh-CN-XiaoyouNeural','晓悠 Xiaoyou · feminina'],['zh-CN-XiaozhenNeural','晓甄 Xiaozhen · feminina formal']];
const H41_MALE=[['zh-CN-YunxiNeural','云希 Yunxi · masculina jovem'],['zh-CN-YunyangNeural','云扬 Yunyang · masculina narrador'],['zh-CN-YunjianNeural','云健 Yunjian · masculina firme'],['zh-CN-YunfengNeural','云枫 Yunfeng · masculina'],['zh-CN-YunhaoNeural','云皓 Yunhao · masculina'],['zh-CN-YunxiaNeural','云夏 Yunxia · masculina'],['zh-CN-YunyeNeural','云野 Yunye · masculina'],['zh-CN-YunzeNeural','云泽 Yunze · masculina grave']];
const H41_CACHE=new Map();
let h41TokenInfo={endpoint:null,token:null,expiredAt:null};
let h41Url=null;
function h41Svg(n){const m={mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>',sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'};return m[n]||'';}
function h41Css(){if(document.getElementById('h41-css'))return;document.head.insertAdjacentHTML('beforeend',`<style id="h41-css">.h41-acc{border-top:1px solid #292929}.h41-acc-h{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;background:transparent;color:#fff;padding:14px 0;font-weight:850;font-size:15px}.h41-acc-h svg{width:18px;height:18px;color:var(--ac)}.h41-acc-b{display:none;padding-bottom:14px}.h41-acc.open .h41-acc-b{display:block}.h41-tabs{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.h41-tab{height:34px;border-radius:10px;border:1px solid #333;background:#222;color:#aaa;font-weight:850}.h41-tab.on{background:var(--ac);border-color:var(--ac);color:#111}.h41-select{width:100%;border:1px solid #373737;background:#252525;color:#fff;border-radius:10px;padding:10px 11px;font-size:14px;margin:6px 0 10px}.h41-lab{font-size:11px;color:#8b7355;font-weight:850;text-transform:uppercase;letter-spacing:.7px}.h41-note,.h41-src{font-size:11px;color:#8b7355;margin-top:5px}.h41-online{color:#c8a66a}.h41-working{opacity:.68;pointer-events:none}.sent-py b{font-weight:900}.dict-src-tag.online,.online-first{color:#9c8158}</style>`);}
function h41Toast(msg){try{toast(msg)}catch{console.warn(msg)}}
function h41GetSettings(){try{return {...H41_DEFAULT,...JSON.parse(localStorage.getItem('h41VoiceSettings')||localStorage.getItem('v40VoiceSettings')||'{}')}}catch{return {...H41_DEFAULT}}}
function h41SaveSettings(s){localStorage.setItem('h41VoiceSettings',JSON.stringify({...h41GetSettings(),...s}));}
function h41Rate(speed){const p=parseInt(String((Number(speed||1)-1)*100),10);return p>=0?`+${p}%`:`${p}%`;}
function h41Pitch(v){const n=parseInt(v||0,10);return n>=0?`+${n}Hz`:`${n}Hz`;}
function h41Volume(v){const p=parseInt(String(Number(v||0)*100),10);return p>=0?`+${p}%`:`${p}%`;}
function h41Xml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function h41Uuid(){if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function h41Date(){return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt';}
function h41B64ToBytes(b64){const bin=atob(b64);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
function h41BytesToB64(bytes){let bin='';for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);return btoa(bin);}
async function h41Hmac(keyBytes,data){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:{name:'SHA-256'}},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data));return new Uint8Array(sig);}
async function h41Sign(urlStr){throw new Error('Assinatura movida para /api/tts-edge');}
async function h41Endpoint(){throw new Error('Endpoint movido para /api/tts-edge');}
async function h41AudioChunk(text,settings){settings=settings||{};return window.hzTtsEdgeApiBlob(h41Ssml(text,settings),{format:settings.format||H41_DEFAULT.format});}
async function h41EdgeBlobDirect(text,settings){const chunks=settings.chunkMode==='auto'?h41SplitSmart(text,1600):h41SplitLine(text);if(!chunks.length)throw new Error('Nenhum texto válido para gerar.');const audio=[];for(const c of chunks)audio.push(await h41AudioChunk(c,settings));return new Blob(audio,{type:'audio/mpeg'});}
async function h41EdgeBlobApi(text,settings){const r=await fetch('/api/tts-edge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,...settings})});if(!r.ok)throw new Error('API Edge TTS HTTP '+r.status+': '+await r.text().catch(()=>''));return r.blob();}
async function h41EdgeBlob(text,settings=h41GetSettings()){const t=String(text||'').trim();if(!t)throw new Error('Sem texto para TTS.');const key=JSON.stringify([t,settings.voice,settings.speed,settings.pitch,settings.volume,settings.style,settings.format,settings.chunkMode]);if(H41_CACHE.has(key))return H41_CACHE.get(key);let last=null;try{const b=await h41EdgeBlobDirect(t,settings);H41_CACHE.set(key,b);return b;}catch(e){last=e;}if(location.protocol.startsWith('http')){try{const b=await h41EdgeBlobApi(t,settings);H41_CACHE.set(key,b);return b;}catch(e){last=e;}}throw last||new Error('Edge TTS falhou.');}
function h41PlayBlob(blob){return new Promise((res,rej)=>{try{if(curAudio)curAudio.pause();}catch{}if(h41Url)try{URL.revokeObjectURL(h41Url)}catch{}h41Url=URL.createObjectURL(blob);const a=new Audio(h41Url);curAudio=a;const timeout=Math.max(15000,Math.min(180000,blob.size*10));const t=setTimeout(()=>{try{a.pause()}catch{}curAudio=null;rej(new Error('timeout de áudio'));},timeout);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
async function h41Baidu(text){const t=String(text||'').trim();if(!t)return false;const urls=[`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(t)}&spd=5&source=web`,...(typeof h36AudioUrls==='function'?h36AudioUrls(t):[])];for(const u of urls){try{if(typeof h36PlayUrl==='function')await h36PlayUrl(u,/[。！？!?，,；;]/.test(t)||t.length>8?16000:9000);else await new Promise((res,rej)=>{const a=new Audio(u);curAudio=a;const tm=setTimeout(()=>{try{a.pause()}catch{};rej(new Error('timeout'))},12000);a.onended=()=>{clearTimeout(tm);res()};a.onerror=()=>{clearTimeout(tm);rej(new Error('audio'))};a.play().catch(rej);});return true;}catch{}}return false;}
function h41Len(text){return [...String(text||'')].filter(ch=>typeof isCJK==='function'&&isCJK(ch)).length;}
async function h41SpeakText(text,kind='auto'){text=String(text||'').trim();if(!text)return false;try{if(typeof h36Busy==='function')h36Busy(true);if(kind==='char'||h41Len(text)<=1){if(await h41Baidu(text))return true;}if(kind==='full'||kind==='sentence'||kind==='compound'||kind==='phrase'||h41Len(text)>1){try{const b=await h41EdgeBlob(text,h41GetSettings());await h41PlayBlob(b);return true;}catch(e){console.warn('Edge TTS falhou:',e);if(await h41Baidu(text))return true;}}
 if(await h41Baidu(text))return true;h41Toast('Nenhuma rota de áudio respondeu agora.');return false;}finally{if(typeof h36Busy==='function')h36Busy(false);}}
function h41CurrentReaderText(){try{if(curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}try{const t=(readerTokens||[]).map(x=>x.word||x.char||'').join('');if(t)return t;}catch{}try{return document.getElementById('rtext')?.innerText||''}catch{return''}}
async function h41StartReading(){const text=h41CurrentReaderText();if(!String(text).trim())return h41Toast('Sem texto para ler.');v32Reading=true;try{v32UpdateReadUi&&v32UpdateReadUi()}catch{}const b=document.getElementById('read-play');if(b){b.classList.add('h41-working');b.innerHTML=h41Svg('pause');}try{await h41SpeakText(text,'full');}catch(e){h41Toast('Falha ao gerar áudio: '+(e.message||e));}finally{v32Reading=false;try{v32UpdateReadUi&&v32UpdateReadUi()}catch{}if(b)b.classList.remove('h41-working');}}
function h41StopReading(){v32Reading=false;try{if(curAudio)curAudio.pause();}catch{}try{v32UpdateReadUi&&v32UpdateReadUi()}catch{}}
function h41InstallVoiceUi(){h41Css();const ms=document.querySelector('#mo-style #style-scroll')||document.querySelector('#mo-style .ms');if(!ms||document.getElementById('h41-voice'))return;ms.insertAdjacentHTML('beforeend',`<div class="h41-acc" id="h41-voice"><button type="button" class="h41-acc-h"><span>${h41Svg('mic')} Voice</span>${h41Svg('chev')}</button><div class="h41-acc-b"><div class="h41-tabs"><button type="button" class="h41-tab on" data-h41-g="f">Feminina</button><button type="button" class="h41-tab" data-h41-g="m">Masculina</button></div><div class="h41-lab">Voz</div><select class="h41-select" id="h41-voice-select"></select><div class="h41-note">Usada para texto completo, frases do dicionário e palavras compostas.</div></div></div><div class="h41-acc" id="h41-voice-settings"><button type="button" class="h41-acc-h"><span>Configurações da voz</span>${h41Svg('chev')}</button><div class="h41-acc-b"><div class="h41-lab">Velocidade</div><select class="h41-select" id="h41-speed"><option value="0.5">0.5x · muito lento</option><option value="0.75">0.75x · lento</option><option value="1">1.0x · normal</option><option value="1.15">1.15x · natural rápido</option><option value="1.25">1.25x · rápido</option><option value="1.5">1.5x · muito rápido</option></select><div class="h41-lab">Tom</div><select class="h41-select" id="h41-pitch"><option value="-50">-50Hz · bem grave</option><option value="-25">-25Hz · grave</option><option value="0">0Hz · normal</option><option value="25">+25Hz · agudo</option><option value="50">+50Hz · bem agudo</option></select><div class="h41-lab">Estilo</div><select class="h41-select" id="h41-style"><option value="general">general · comum</option><option value="assistant">assistant · assistente</option><option value="chat">chat · conversa</option><option value="newscast">newscast · noticiário</option><option value="calm">calm · calmo</option><option value="cheerful">cheerful · alegre</option><option value="gentle">gentle · gentil</option><option value="serious">serious · sério</option></select></div></div>`);const fill=g=>{const list=g==='m'?H41_MALE:H41_FEMALE;const sel=document.getElementById('h41-voice-select');const set=h41GetSettings();sel.innerHTML=list.map(v=>`<option value="${v[0]}">${v[1]}</option>`).join('');sel.value=list.some(v=>v[0]===set.voice)?set.voice:list[0][0];h41SaveSettings({voice:sel.value});};fill('f');ms.querySelectorAll('.h41-acc-h').forEach(x=>x.onclick=()=>x.parentElement.classList.toggle('open'));ms.querySelectorAll('.h41-tab').forEach(t=>t.onclick=()=>{ms.querySelectorAll('.h41-tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');fill(t.dataset.h41G||t.dataset.h41_g||t.getAttribute('data-h41-g')||'f');});['h41-voice-select','h41-speed','h41-pitch','h41-style'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const key=id.replace('h41-voice-select','voice').replace('h41-','');const set=h41GetSettings();if(set[key]!=null)el.value=String(set[key]);el.onchange=()=>h41SaveSettings({[key]:el.value});});}
function h41CleanDef(s){try{return (typeof v34CleanDef==='function'?v34CleanDef(s):String(s||''));}catch{}return String(s||'').replace(/&nbsp;/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
async function h41SogouFetch(q){q=String(q||'').trim();if(!q)return null;const body='from=auto&to=en&client=wap&text='+encodeURIComponent(q)+'&uuid=null&pid=sogou-dict-vr&addSugg=on';if(location.protocol.startsWith('http')){try{const r=await fetch('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:q})});if(r.ok)return await r.json();}catch{}}
 const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};const url='https://fanyi.sogou.com/reventondc/suggV3';try{const r=await fetch(url,{method:'POST',mode:'cors',headers,body});if(r.ok)return await r.json();}catch{}
 for(const p of ['https://corsproxy.io/?','https://api.codetabs.com/v1/proxy?quest=']){try{const r=await fetch(p+encodeURIComponent(url),{method:'POST',headers,body});if(r.ok){const txt=await r.text();try{return JSON.parse(txt)}catch{return JSON.parse(txt.replace(/^[^{]+/,''))}}}catch{}}
 return null;}
function h41DeepSugg(x,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h41DeepSugg(v,arr));return arr;}if(typeof x==='object'){const k=x.k||x.key||x.word||x.phrase||x.text;const v=x.v||x.value||x.translation||x.trans||x.mean||x.meaning||x.en;if(k&&v)arr.push({k:String(k),v:String(v)});Object.values(x).forEach(v=>h41DeepSugg(v,arr));}return arr;}
function h41DeepSents(x,q,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h41DeepSents(v,q,arr));return arr;}if(typeof x==='object'){const vals=Object.values(x).filter(v=>typeof v==='string');const zh=vals.find(v=>/[\u3400-\u9fff]/.test(v)&&v.includes(q)&&v.length>=q.length+2&&/[。！？!?，,]/.test(v));const en=vals.find(v=>/[A-Za-z]/.test(v)&&!/[\u3400-\u9fff]{2,}/.test(v));if(zh)arr.push({zh:zh.trim(),py:getWordPY(zh),en:h41CleanDef(en||''),src:'Sogou'});Object.values(x).forEach(v=>h41DeepSents(v,q,arr));}else if(typeof x==='string'){const ms=x.match(/[\u3400-\u9fff][\u3400-\u9fff\s，。！？、；：“”《》（）]{2,160}[。！？!?]?/g)||[];ms.forEach(s=>{s=s.replace(/\s+/g,'');if(s.includes(q)&&/[。！？!?，,]/.test(s))arr.push({zh:s,py:getWordPY(s),en:'',src:'Sogou'});});}return arr;}
async function h41DictData(q){const n=[...String(q||'')].filter(ch=>typeof isCJK==='function'&&isCJK(ch)).join('');const data=await h41SogouFetch(n);const sugg=h41DeepSugg(data,[]).filter(x=>x.k&&x.v);const uniq=[];const seen=new Set();for(const x of sugg){const key=x.k+'|'+x.v;if(!seen.has(key)){seen.add(key);uniq.push(x);}}const sents=h41DeepSents(data,n,[]).filter(s=>s.zh&&s.zh.includes(n));return {data,sugg:uniq,sents};}
async function h41RenderDefs(q,out){const n=[...String(q||'')].filter(ch=>typeof isCJK==='function'&&isCJK(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const dd=await h41DictData(n);const exact=dd.sugg.find(x=>x.k===n)||dd.sugg.find(x=>String(x.k).startsWith(n))||dd.sugg[0];let html=`<div class="dict-card"><div class="dict-word">${esc(n)} <button class="dict-audio v34-svg-only" data-v34-speak="${esc(n)}">${h41Svg('sound')}</button></div><div class="dict-py">${esc(getWordPY(n))}</div>`;if(exact)html+=`<div class="dict-pos">TRADUÇÃO / SOGOU</div><div class="dict-def strong">${esc(h41CleanDef(exact.v))}</div>`;else html+='<div class="dict-def">A Sogou não retornou definição agora.</div>';const related=dd.sugg.filter(x=>x.k!==n).slice(0,12);if(related.length)html+='<div class="dict-pos">PALAVRAS / USOS RELACIONADOS</div>'+related.map((x,i)=>`<div class="dict-def"><b>${i+1}. ${esc(x.k)}</b> — ${esc(h41CleanDef(x.v))}</div>`).join('');if(n.length>1){html+='<div class="dict-pos">IDEOGRAMAS ISOLADOS</div>';for(const ch of [...n]){if(!isCJK(ch))continue;const cd=await h41DictData(ch);const ce=cd.sugg.find(x=>x.k===ch)||cd.sugg[0];html+=`<div class="dict-def"><button class="dict-audio v34-svg-only" data-v34-speak="${esc(ch)}">${h41Svg('sound')}</button> <b>${esc(ch)}</b> <span class="dict-py">${esc(getWordPY(ch))}</span> ${ce?esc(h41CleanDef(ce.v)):''}</div>`;}}
 html+='<div class="dict-src-tag online">Sogou online-first</div></div>';out.innerHTML=html;try{v34BindAudio(out)}catch{}}
async function h41RenderWords(q,out){const n=[...String(q||'')].filter(ch=>typeof isCJK==='function'&&isCJK(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const dd=await h41DictData(n);let words=dd.sugg.filter(x=>x.k&&String(x.k).includes(n)).map(x=>({word:x.k,py:getWordPY(x.k),defs:[h41CleanDef(x.v)],src:'Sogou'}));try{if(!words.length&&typeof hr39MdbgWords==='function'){const extra=await hr39MdbgWords(n);words=extra.filter(w=>String(w.word||'').includes(n)).map(w=>({...w,src:w.src||'MDBG'}));}}catch{}words=words.slice(0,80);if(!words.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras online para este termo agora.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que contêm “'+esc(n)+'”</div><div class="online-first">Sogou online-first</div>'+words.map(w=>`<div class="dict-item"><div class="dict-item-main"><div class="zh">${esc(w.word)}</div><div class="py">${esc(w.py||getWordPY(w.word))}</div><div class="en">${esc((w.defs||[]).slice(0,3).join('; '))}</div><div class="dict-src-tag">${esc(w.src||'Sogou')}</div></div><button class="dict-audio v34-svg-only" data-v34-speak="${esc(w.word)}">${h41Svg('sound')}</button></div>`).join('')+'</div>';try{v34BindAudio(out)}catch{}}
async function h41RenderSents(q,out){const n=[...String(q||'')].filter(ch=>typeof isCJK==='function'&&isCJK(ch)).join('');out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases…</small></div>';const dd=await h41DictData(n);const map=new Map();for(const s of dd.sents){if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,s);}try{if(typeof hr39SentenceSearch==='function'){const ex=await hr39SentenceSearch(n);ex.forEach(s=>{if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,{...s,src:s.src||'externa'});});}}catch{}const arr=[...map.values()].slice(0,24);if(!arr.length){out.innerHTML='<div class="dict-empty">Nenhuma frase contendo exatamente este termo foi retornada agora.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases com “'+esc(n)+'”</div><div class="online-first">O botão de áudio envia a frase inteira para a voz neural.</div>'+arr.map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${esc(s.zh)}</div><div class="sent-py"><b>${esc(s.py||getWordPY(s.zh))}</b></div></div><button class="dict-audio v34-svg-only" data-v34-speak="${esc(s.zh)}">${h41Svg('sound')}</button></div><div class="sent-tr">${s.en?((typeof v37TransButton==='function')?v37TransButton(s.en):esc(s.en)):'Tradução indisponível nesta fonte.'}</div><div class="sent-src"><b>${esc(s.src||'Sogou')}</b> • contém “${esc(n)}”</div></div>`).join('')+'</div>';try{v34BindAuto(out);v34BindAudio(out)}catch{}}
function h41PatchAudio(){window.h41SpeakText=h41SpeakText;try{h36Speak=async function(text){return h41SpeakText(text,h41Len(text)<=1?'char':'compound')};window.h36Speak=h36Speak;window.hr39SpeakWhole=h36Speak;}catch{}try{speakWordMode=async function(word){return h41SpeakText(word,h41Len(word)<=1?'char':'compound')};speakWord=function(word){return speakWordMode(word,'natural')};}catch{}window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h41SpeakText((d&&d.zh)||key,'sentence')};}
function h41PatchReader(){/* v4.8: leitura completa do botao agora e controlada exclusivamente pelo H48, para evitar a corrida entre implementacoes que fazia o botao voltar a uma versao antiga (por vezes com texto poluido por pinyin) a cada resize/timeout. */}
function h41PatchDict(){try{v29RenderDictDefs=(v29RenderDictDefs&&v29RenderDictDefs.__h52Final)?v29RenderDictDefs:h41RenderDefs;v29RenderDictWords=(v29RenderDictWords&&v29RenderDictWords.__h52Final)?v29RenderDictWords:h41RenderWords;v29RenderDictSentences=(v29RenderDictSentences&&v29RenderDictSentences.__h52Final)?v29RenderDictSentences:h41RenderSents;}catch{}}
function h41PatchPunct(){/* v4.9: a estrutura de caixa uniforme (wunit>pyrow fantasma+hzrow) e o data-ci
   agora fazem parte do tokenPunct base; este patch atrasado foi desativado porque sobrescrevia
   tokenPunct com uma versao sem data-ci, quebrando o mapeamento de selecao para o texto bruto. */}
function h41Boot(){h41Css();h41InstallVoiceUi();h41PatchAudio();h41PatchReader();h41PatchDict();h41PatchPunct();try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H41_VERSION;}catch{}}
setTimeout(h41Boot,150);setTimeout(h41Boot,800);setTimeout(h41Boot,1800);setTimeout(h41Boot,3200);
})();


/* ===== v42-edge-sogou-finalfix ===== */
(()=>{
'use strict';
const H42_VERSION='v4.3-debug';
const H42_SECRET='server-side:/api/tts-edge';
const H42_TOKEN_REFRESH_BEFORE_EXPIRY=3*60;
let h42TokenInfo={endpoint:null,token:null,expiredAt:null};
let h42AudioUrl=null;
const h42$=s=>document.querySelector(s);

const H43_DEBUG_VERSION='v4.3-debug';
let h43DebugOpen=false;
function h43DebugText(v){try{return typeof v==='string'?v:JSON.stringify(v,null,2);}catch(e){return String(v)}}
function h43DebugShort(s,n=9000){s=String(s??'');return s.length>n?s.slice(0,n)+'\n…[cortado: '+(s.length-n)+' caracteres restantes]':s;}
function h43DebugInit(){
  if(document.getElementById('h43-debug-btn'))return;
  const css=document.createElement('style');css.id='h43-debug-css';css.textContent=`
  #h43-debug-btn{position:fixed;right:14px;bottom:calc(92px + var(--sb,0px));z-index:10001;border:1px solid rgba(var(--ac-rgb),.55);background:#191919;color:#f5a623;border-radius:999px;padding:8px 11px;font:800 11px system-ui;letter-spacing:.04em;box-shadow:0 8px 24px rgba(0,0,0,.35)}
  #h43-debug-panel{position:fixed;left:0;right:0;bottom:0;height:min(74vh,680px);z-index:10000;background:#111;border-top:1px solid #333;border-radius:18px 18px 0 0;box-shadow:0 -18px 58px rgba(0,0,0,.7);transform:translateY(104%);transition:.24s transform;display:flex;flex-direction:column;color:#eee;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
  #h43-debug-panel.open{transform:translateY(0)}
  .h43-dbg-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #252525}.h43-dbg-title{font-weight:900;color:#f5a623;flex:1}.h43-dbg-actions{display:flex;gap:6px;flex-wrap:wrap}.h43-dbg-actions button,.h43-dbg-copy{border:1px solid #333;background:#202020;color:#eee;border-radius:9px;padding:7px 9px;font-weight:800;font-size:11px}.h43-dbg-actions button:active{opacity:.7}
  #h43-debug-body{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px}.h43-dbg-item{border:1px solid #2b2b2b;background:#181818;border-radius:13px;overflow:hidden}.h43-dbg-meta{display:flex;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px solid #282828}.h43-dbg-kind{font-size:10px;font-weight:900;color:#f5a623;text-transform:uppercase;letter-spacing:.05em}.h43-dbg-time{font-size:10px;color:#777;margin-left:auto}.h43-dbg-title2{font-size:12px;font-weight:800;color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:58vw}.h43-dbg-pre{white-space:pre-wrap;word-break:break-word;font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfcfcf;line-height:1.45;padding:10px;max-height:220px;overflow:auto}.h43-dbg-error .h43-dbg-kind{color:#ff6b6b}.h43-dbg-ok .h43-dbg-kind{color:#7ee787}.h43-dbg-warn .h43-dbg-kind{color:#ffd166}
  .h43-dbg-paste{display:grid;gap:8px;padding:10px;border-top:1px solid #242424;background:#151515}.h43-dbg-paste textarea{width:100%;min-height:86px;border:1px solid #333;border-radius:10px;background:#0c0c0c;color:#eee;padding:9px;font:12px ui-monospace,monospace}.h43-dbg-paste .row{display:flex;gap:8px;flex-wrap:wrap}.h43-dbg-paste button{border:1px solid #333;background:#222;color:#eee;border-radius:9px;padding:8px 10px;font-weight:800;font-size:12px}.h43-dbg-note{font-size:11px;color:#888;line-height:1.45;padding:0 2px}
/* Leitor: Tradução e Leitura como retângulos gêmeos */
.mini-dock{gap:9px}
#sel-translate,#sel-read{display:inline-flex;width:118px;height:42px;border-radius:10px;justify-content:center;align-items:center;gap:7px;padding:0 8px;font-size:12.5px;font-weight:800;background:rgba(24,24,24,.92);color:#eee;border:1px solid rgba(var(--ac-rgb),.45);box-shadow:0 6px 20px rgba(0,0,0,.35)}
#sel-read.pri{background:rgba(24,24,24,.92);color:#eee}
#sel-translate svg,#sel-read svg{width:16px;height:16px}
/* Expandir/ocultar: quadrado, SVG maior, sempre visível */
#reader-fs{width:44px!important;height:44px!important;border-radius:10px!important;font-size:0}
#reader-fs svg{width:22px!important;height:22px!important}
/* Rodapé oculto: botão desce colado ao canto inferior direito */
.reader-fullscreen #reader-fs{right:0!important;bottom:calc(0px + var(--sb))!important;border-radius:12px 0 0 0!important;border-right:0!important;border-bottom:0!important}
/* Rodapé oculto: Tradução/Leitura só aparecem durante seleção de texto */
.reader-fullscreen #sel-translate,.reader-fullscreen #sel-read{display:none!important}
.reader-fullscreen.hz-selecting #sel-translate,.reader-fullscreen.hz-selecting #sel-read{display:inline-flex!important}
.reader-fullscreen .mini-dock{right:10px;bottom:calc(56px + var(--sb))}
/* Responsividade ampla: tablet 4:3, desktop, ultrawide, super ultrawide */
@media(min-width:760px) and (max-width:1024px){.lib-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.ms{max-width:600px}}
@media(min-width:1400px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1200px!important}#sr .rscroll{max-width:980px}.simple-list{max-width:980px}.lib-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}.ms{max-width:700px}#mo-music .ms{max-width:620px}.hzp-card,.hzp-title,.hzp-waves{max-width:720px}}
@media(min-width:2000px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1400px!important}#sr .rscroll{max-width:1060px}.rtop{padding-left:max(18px,calc((100vw - 1060px)/2))!important;padding-right:max(18px,calc((100vw - 1060px)/2))!important}html.hz-bgart #sl,html.hz-bgart #sw,html.hz-bgart #sd,html.hz-bgart #ss,html.hz-bgart #sx,html.hz-bgart #sp{background-position:center!important}}
@media(min-width:2560px){.app-shell,.bc,.wc,.sc,.dict-wrap{max-width:1560px!important}}

/* Calha lateral segura e simétrica em todas as proporções */
:root{--gx:clamp(14px,3.2vw,26px)}
.bc,.wc,.sc,.dict-wrap{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important;box-sizing:border-box}
#sr .rscroll{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important;box-sizing:border-box}
.rtop{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important}
.lh,.wh,.sh{padding-left:max(var(--gx),env(safe-area-inset-left,0px))!important;padding-right:max(var(--gx),env(safe-area-inset-right,0px))!important}
.bnav{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
.mo{padding-left:max(10px,env(safe-area-inset-left,0px));padding-right:max(10px,env(safe-area-inset-right,0px));box-sizing:border-box}
.ms{max-width:min(92vw,var(--hz-ms-max,560px))}
.mini-dock{right:max(14px,env(safe-area-inset-right,0px))!important}
.reader-fullscreen #reader-fs{right:0!important}
@media(min-width:700px) and (max-width:1180px){
 .app-shell,.bc,.wc,.sc,.dict-wrap{max-width:min(92vw,960px)!important;margin-left:auto!important;margin-right:auto!important}
 #sr .rscroll,.simple-list{max-width:min(92vw,860px)!important;margin-left:auto!important;margin-right:auto!important}
 .hzp-card,.hzp-title,.hzp-waves{max-width:min(88vw,640px)}
}

/* Frases do dicionário: salvar empilhado abaixo do ouvir (sem vazar à direita) */
.hz-sent-actions{display:flex;flex-direction:column;gap:7px;align-items:center;flex-shrink:0}
.sent-card .sent-top{grid-template-columns:minmax(0,1fr) 40px!important;align-items:start!important}
.hz-sent-actions .dict-audio,.hz-sent-actions .v41-save-sent-btn{width:34px;height:34px}

/* Header compacto: Config | Leitura simples | Livros | Busca */
.v43-header-row{padding:8px 12px 8px!important}
.v43-header-row .mode-row.hz-inline{flex:1;margin:0!important;padding:4px!important;border-radius:14px!important;gap:5px!important}
.mode-row.hz-inline .mode-btn{padding:9px 6px!important;font-size:13px!important;border-radius:11px!important}
.app-head{padding-bottom:2px}
/* Busca como linha abaixo do header; seção desce junto (fluxo normal) */
.v43-search-wrap{display:none;padding:2px 12px 8px}
.v43-search-wrap.open,.v43-search-wrap.vis{display:flex}
.v43-search-wrap .v43-search-expand{width:100%!important;opacity:1!important;padding:11px 15px!important;margin:0!important;border:1px solid #333!important;border-radius:13px!important;font-size:15px!important}
.v43-search-wrap.open .v43-search-expand{width:100%!important}
/* Linha da seção mais colada ao topo */
.lib-tools{margin-top:2px}

/* Header não expande: a seção e a lista sobem coladas ao topo */
/* Shell = coluna flex da tela: header auto, conteúdo rola por dentro, nav sempre no fim */
#sl .app-shell{flex:1 1 auto!important;min-height:0!important;display:flex!important;flex-direction:column!important}
#sl .app-shell .app-head{flex:0 0 auto}
#sl #bc{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;padding-top:6px!important}
#sl .app-shell .bnav{flex-shrink:0}
.lib-tools{padding-top:4px!important}
`;document.head.appendChild(css);
  const btn=document.createElement('button');btn.id='h43-debug-btn';btn.type='button';btn.textContent='DBG';btn.title='Abrir console de debug';document.body.appendChild(btn);
  const panel=document.createElement('div');panel.id='h43-debug-panel';panel.innerHTML=`<div class="h43-dbg-head"><div class="h43-dbg-title">Debug API / Parse</div><div class="h43-dbg-actions"><button type="button" id="h43-debug-copy-all">Copiar tudo</button><button type="button" id="h43-debug-copy-last">Copiar último</button><button type="button" id="h43-debug-clear">Limpar</button><button type="button" id="h43-debug-close">Fechar</button></div></div><div id="h43-debug-body"></div><div class="h43-dbg-paste"><div class="h43-dbg-note">Cole aqui o JSON bruto que aparecer no Network/Preview caso o navegador bloqueie CORS. O parser abaixo usa as mesmas funções internas do dicionário.</div><textarea id="h43-debug-paste" placeholder="Cole a resposta JSON da Sogou aqui..."></textarea><div class="row"><button type="button" id="h43-debug-parse-paste">Parsear JSON colado</button><button type="button" id="h43-debug-copy-parse">Copiar parse</button></div></div>`;document.body.appendChild(panel);
  const toggle=()=>{h43DebugOpen=!panel.classList.contains('open');panel.classList.toggle('open',h43DebugOpen);localStorage.setItem('h43DebugOpen',h43DebugOpen?'1':'0')};
  btn.onclick=toggle;document.getElementById('h43-debug-close').onclick=toggle;
  document.getElementById('h43-debug-clear').onclick=()=>{window.HANZI_DEBUG_EVENTS=[];h43DebugRender()};
  document.getElementById('h43-debug-copy-all').onclick=()=>h43DebugCopy(h43DebugText(window.HANZI_DEBUG_EVENTS||[]));
  document.getElementById('h43-debug-copy-last').onclick=()=>{const a=window.HANZI_DEBUG_EVENTS||[];h43DebugCopy(h43DebugText(a[a.length-1]||{}));};
  document.getElementById('h43-debug-parse-paste').onclick=h43DebugParsePaste;
  document.getElementById('h43-debug-copy-parse').onclick=()=>h43DebugCopy(document.getElementById('h43-debug-paste').dataset.lastParse||'');
  window.HANZI_DEBUG_EVENTS=window.HANZI_DEBUG_EVENTS||[];
  if(localStorage.getItem('h43DebugOpen')==='1'||/[?&]debug=1\b/.test(location.search)){panel.classList.add('open');h43DebugOpen=true;}
  h43DebugRender();
}
function h43DebugCopy(txt){try{navigator.clipboard.writeText(String(txt||''));h42Toast('Debug copiado');}catch{const ta=document.createElement('textarea');ta.value=String(txt||'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();h42Toast('Debug copiado')}}
function h43DebugLog(kind,title,data,status=''){
  const ev={time:new Date().toISOString(),kind,title,status,data};
  window.HANZI_DEBUG_EVENTS=window.HANZI_DEBUG_EVENTS||[];window.HANZI_DEBUG_EVENTS.push(ev);if(window.HANZI_DEBUG_EVENTS.length>120)window.HANZI_DEBUG_EVENTS.shift();
  
  h43DebugRender();
  return ev;
}
function h43DebugRender(){const body=document.getElementById('h43-debug-body');if(!body)return;const arr=(window.HANZI_DEBUG_EVENTS||[]).slice().reverse();if(!arr.length){body.innerHTML='<div class="h43-dbg-note">Sem eventos ainda. Faça uma busca no dicionário ou toque em Play para gerar TTS.</div>';return;}body.innerHTML=arr.map((e,i)=>`<div class="h43-dbg-item h43-dbg-${e.status||''}"><div class="h43-dbg-meta"><span class="h43-dbg-kind">${h42Esc(e.kind||'log')}</span><span class="h43-dbg-title2">${h42Esc(e.title||'')}</span><button class="h43-dbg-copy" data-h43-copy="${i}">copiar</button><span class="h43-dbg-time">${h42Esc(new Date(e.time).toLocaleTimeString())}</span></div><pre class="h43-dbg-pre">${h42Esc(h43DebugShort(h43DebugText(e.data)))}</pre></div>`).join('');body.querySelectorAll('[data-h43-copy]').forEach(b=>b.onclick=()=>{const ev=arr[Number(b.dataset.h43Copy)];h43DebugCopy(h43DebugText(ev));});}
function h43DebugParsePaste(){const ta=document.getElementById('h43-debug-paste');const q=(document.getElementById('dict-q')?.value||'').trim();try{const raw=ta.value.trim();const data=JSON.parse(raw);const sugg=(typeof h42DeepSugg==='function'?h42DeepSugg(data,[]):[]);const sents=(typeof h42DeepSents==='function'?h42DeepSents(data,q,[]):[]);const parsed={query:q,sugg,sents,rootKeys:data&&typeof data==='object'?Object.keys(data):[],data};const out=h43DebugText(parsed);ta.dataset.lastParse=out;h43DebugLog('manual.parse','JSON colado parseado',parsed,'ok');}catch(e){h43DebugLog('manual.parse','Erro ao parsear JSON colado',{error:e.message,raw:ta.value.slice(0,1200)},'error');}}
/* v4.9: modo debug removido a pedido do usuário — h43DebugInit não é mais chamado. */

function h42Toast(msg){try{toast(msg)}catch{console.warn(msg)}}
function h42Esc(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&#39;','"':'&quot;'}[c]));}
function h42Xml(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function h42Svg(n){const m={sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',pause:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>'};return m[n]||'';}
function h42Settings(){let base={voice:'zh-CN-XiaoxiaoNeural',speed:1,pitch:0,volume:0,style:'general',degree:1.35,role:'',format:'audio-24khz-48kbitrate-mono-mp3',chunkMode:'full',linePause:0};try{base={...base,...JSON.parse(localStorage.getItem('h41VoiceSettings')||localStorage.getItem('v40VoiceSettings')||'{}')}}catch{}try{const v=document.getElementById('h41-voice-select')?.value;if(v)base.voice=v;const sp=document.getElementById('h41-speed')?.value;if(sp)base.speed=Number(sp);const pi=document.getElementById('h41-pitch')?.value;if(pi!=null&&pi!=='')base.pitch=Number(pi);const st=document.getElementById('h41-style')?.value;if(st)base.style=st;}catch{}return base;}
function h42Signed(n,suffix){n=Number(n)||0;return (n>=0?'+':'')+n+suffix;}
function h42Rate(speed){return h42Signed(Math.trunc((Number(speed||1)-1)*100),'%');}
function h42Pitch(v){return h42Signed(parseInt(v||0,10),'Hz');}
function h42Volume(v){return h42Signed(Math.trunc(Number(v||0)*100),'%');}
function h42Uuid(){if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function h42Date(){return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt';}
function h42B64ToBytes(b64){const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return bytes;}
function h42BytesToB64(bytes){let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s);}
async function h42Hmac(keyBytes,data){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:{name:'SHA-256'}},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));}
async function h42Sign(urlStr){throw new Error('Assinatura movida para /api/tts-edge');}
async function h42Endpoint(){throw new Error('Endpoint movido para /api/tts-edge');}
function h42Express(text,o){const style=o.style&&o.style!=='general'?o.style:'';const role=o.role||'';const attrs=[];if(style)attrs.push(`style="${h42Xml(style)}"`);if(style&&o.degree)attrs.push(`styledegree="${h42Xml(o.degree)}"`);if(role)attrs.push(`role="${h42Xml(role)}"`);const prosody=`<prosody rate="${h42Xml(h42Rate(o.speed))}" pitch="${h42Xml(h42Pitch(o.pitch))}" volume="${h42Xml(h42Volume(o.volume))}">${h42Xml(text)}</prosody>`;return attrs.length?`<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>`:prosody;}
function h42BuildSsml(text,o=h42Settings()){const voice=o.voice||'zh-CN-XiaoxiaoNeural';const lang=voice.split('-').slice(0,2).join('-')||'zh-CN';const linePause=Math.max(0,Math.min(2000,Number(o.linePause??450)));const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);let body='';if((o.chunkMode||'line')==='line'&&lines.length>1){body=lines.map((line,i)=>`    ${h42Express(line,o)}${i<lines.length-1&&linePause>0?`\n    <break time="${linePause}ms"/>`:''}`).join('\n');}else{body=`    ${h42Express(String(text||'').trim(),o)}`;}return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${h42Xml(lang)}">\n  <voice name="${h42Xml(voice)}">\n${body}\n  </voice>\n</speak>`;}
function h42SplitSmart(text,maxLen=1800){const clean=String(text||'').replace(/[ \t]+/g,' ').trim();if(!clean)return[];const parts=[];let cur='';for(const s of clean.split(/(?<=[。！？!?\.])\s*/)){if(!s)continue;if((cur+s).length<=maxLen)cur+=s;else{if(cur)parts.push(cur.trim());if(s.length<=maxLen)cur=s;else{for(let i=0;i<s.length;i+=maxLen)parts.push(s.slice(i,i+maxLen));cur='';}}}if(cur)parts.push(cur.trim());return parts;}
async function h42AudioFromSsml(ssml,o=h42Settings()){try{h43DebugLog&&h43DebugLog('edge.api','request /api/tts-edge',{route:window.HZ_TTS_API_ROUTE,format:o&&o.format},'');}catch{}const blob=await window.hzTtsEdgeApiBlob(ssml,{format:o&&o.format});try{h43DebugLog&&h43DebugLog('edge.api','áudio recebido via /api/tts-edge',{size:blob.size,type:blob.type},'ok');}catch{}return blob;}
async function h42EdgeDirect(text,o=h42Settings()){text=String(text||'').trim();if(!text)throw new Error('Sem texto para TTS.');if(text.length<1800){return h42AudioFromSsml(h42BuildSsml(text,o),o);}const chunks=h42SplitSmart(text,1800);const blobs=[];for(const c of chunks)blobs.push(await h42AudioFromSsml(h42BuildSsml(c,o),o));return new Blob(blobs,{type:'audio/mpeg'});}
async function h42EdgeApi(text,o=h42Settings()){return h42EdgeDirect(text,o);}
async function h42Edge(text,o=h42Settings()){let last=null;try{return await h42EdgeDirect(text,o);}catch(e){last=e;console.warn('Edge direto falhou:',e);}try{return await h42EdgeApi(text,o);}catch(e){last=e;console.warn('Edge API falhou:',e);}throw last||new Error('Edge TTS falhou.');}
function h42PlayBlob(blob){return new Promise((res,rej)=>{try{if(curAudio)curAudio.pause();}catch{}try{if(h42AudioUrl)URL.revokeObjectURL(h42AudioUrl)}catch{}h42AudioUrl=URL.createObjectURL(blob);const a=new Audio(h42AudioUrl);curAudio=a;const timeout=Math.max(15000,Math.min(240000,blob.size*12));const t=setTimeout(()=>{try{a.pause()}catch{}curAudio=null;rej(new Error('timeout de áudio'));},timeout);a.onended=()=>{clearTimeout(t);curAudio=null;res();};a.onerror=()=>{clearTimeout(t);curAudio=null;rej(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(t);curAudio=null;rej(e);});});}
async function h42Baidu(text){const t=String(text||'').trim();if(!t)return false;const urls=[`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(t)}&spd=5&source=web`,...(typeof h36AudioUrls==='function'?h36AudioUrls(t):[])];for(const u of urls){try{if(typeof h36PlayUrl==='function')await h36PlayUrl(u);else await new Promise((res,rej)=>{const a=new Audio(u);a.onended=res;a.onerror=rej;a.play().catch(rej);});return true;}catch{}}return false;}
function h42CjkLen(t){return [...String(t||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).length;}
async function h42Speak(text,kind='auto'){text=String(text||'').trim();if(!text)return false;try{if(typeof h36Busy==='function')h36Busy(true);if(kind==='char'||h42CjkLen(text)<=1){if(await h42Baidu(text))return true;}try{const blob=await h42Edge(text,h42Settings());await h42PlayBlob(blob);return true;}catch(e){console.warn('Edge TTS final falhou:',e);}if(await h42Baidu(text))return true;h42Toast('Nenhuma rota de áudio respondeu agora.');return false;}finally{if(typeof h36Busy==='function')h36Busy(false);}}
function h42ReaderText(){try{if(curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}try{const t=(readerTokens||[]).map(x=>x.word||x.char||'').join('');if(t)return t;}catch{}return document.getElementById('rtext')?.innerText||'';}
async function h42StartReading(){const text=h42ReaderText();if(!String(text).trim())return h42Toast('Sem texto para ler.');try{v32Reading=true;v32UpdateReadUi&&v32UpdateReadUi()}catch{}const b=document.getElementById('read-play');if(b){b.classList.add('h41-working');b.innerHTML=h42Svg('pause');}try{await h42Speak(text,'full');}catch(e){h42Toast('Falha ao gerar áudio: '+(e.message||e));}finally{try{v32Reading=false;v32UpdateReadUi&&v32UpdateReadUi()}catch{}if(b)b.classList.remove('h41-working');}}
function h42StopReading(){try{v32Reading=false;if(curAudio)curAudio.pause();v32UpdateReadUi&&v32UpdateReadUi()}catch{}}
function h42CleanDef(s){return String(s||'').replace(/&nbsp;|&#160;/gi,' ').replace(/<[^>]+>/g,' ').replace(/\\[rn]/g,' ').replace(/\s+/g,' ').trim();}
async function h42SogouFetch(q){
 q=String(q||'').trim();if(!q)return null;
 const form='from=auto&to=en&client=wap&text='+encodeURIComponent(q)+'&uuid=null&pid=sogou-dict-vr&addSugg=on';
 const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
 const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
 h43DebugLog('sogou.prepare','payload preparada',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:(location.protocol==='http:'||location.protocol==='https:')});
 if(location.protocol==='http:'||location.protocol==='https:'){
   try{
     const payload={text:q,rawBody:form};h43DebugLog('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload});
     const r=await fetch('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     const raw=await r.text().catch(e=>'[erro ao ler resposta backend: '+(e.message||e)+']');
     h43DebugLog('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:h43DebugShort(raw,16000)},r.ok?'ok':'error');
     if(r.ok){try{return JSON.parse(raw);}catch(e){h43DebugLog('sogou.backend','JSON inválido do backend',{error:e.message,raw},'error');}}
   }catch(e){h43DebugLog('sogou.backend','fetch backend falhou',{error:e.message||String(e)},'error');}
 }
 try{
   h43DebugLog('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form});
   const r=await fetch(directUrl,{method:'POST',mode:'cors',headers,body:form});
   const raw=await r.text();
   h43DebugLog('sogou.direct','response direta Sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:h43DebugShort(raw,16000)},r.ok?'ok':'error');
   if(r.ok){try{return JSON.parse(raw);}catch(e){h43DebugLog('sogou.direct','JSON inválido direto',{error:e.message,raw},'error');}}
 }catch(e){
   h43DebugLog('sogou.direct','CORS/fetch direto bloqueado',{error:e.message||String(e),explanation:'Se o Network mostra 200 mas o console acusa CORS, o JavaScript não consegue ler o corpo. Use o painel para copiar a payload e cole a resposta bruta do Network no campo manual.'},'error');
 }
 return null;
}
function h42DeepSugg(x,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h42DeepSugg(v,arr));return arr;}if(typeof x==='object'){const k=x.k||x.key||x.word||x.phrase||x.text||x.src;const v=x.v||x.value||x.translation||x.trans||x.mean||x.meaning||x.en||x.dst;if(k&&v)arr.push({k:String(k),v:String(v)});Object.values(x).forEach(v=>h42DeepSugg(v,arr));}return arr;}
function h42DeepSents(x,q,arr=[]){if(!x)return arr;if(Array.isArray(x)){x.forEach(v=>h42DeepSents(v,q,arr));return arr;}if(typeof x==='object'){const vals=Object.values(x).filter(v=>typeof v==='string');const zh=vals.find(v=>/[\u3400-\u9fff]/.test(v)&&v.includes(q)&&v.length>=q.length+2&&/[。！？!?，,]/.test(v));const en=vals.find(v=>/[A-Za-z]/.test(v)&&!/[\u3400-\u9fff]{2,}/.test(v));if(zh)arr.push({zh:zh.trim(),py:typeof getWordPY==='function'?getWordPY(zh):'',en:h42CleanDef(en||''),src:'Sogou'});Object.values(x).forEach(v=>h42DeepSents(v,q,arr));}return arr;}
async function h42DictData(q){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');const data=await h42SogouFetch(n);const raw=h42DeepSugg(data,[]);const seen=new Set(), sugg=[];for(const x of raw){const k=x.k+'|'+x.v;if(!seen.has(k)){seen.add(k);sugg.push(x);}}const sents=h42DeepSents(data,n,[]);return {n,data,sugg,sents,online:!!data};}
async function h42RenderDefs(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';
 /* v4.8.1: busca Sogou e CC-CEDICT em paralelo (nao so como fallback quando Sogou falha). Ideogramas
    isolados costumam bater em regras anti-bot mais duras na Sogou, mas quase sempre existem no
    CC-CEDICT, entao juntar as duas fontes sempre resolve o caso de "1 caractere sem definição". */
 const [dd,cedictEntries]=await Promise.all([h42DictData(n),(async()=>{try{if(typeof hr39LookupShort==='function')return await hr39LookupShort(n);}catch{}return [];})()]);
 let exact=dd.sugg.find(x=>x.k===n)||dd.sugg.find(x=>String(x.k).startsWith(n))||dd.sugg[0];
 const fallbackDef=(cedictEntries&&cedictEntries[0])||null;
 let html=`<div class="dict-card"><div class="dict-word">${h42Esc(n)} <button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(n)}">${h42Svg('sound')}</button></div><div class="dict-py">${h42Esc(typeof getWordPY==='function'?getWordPY(n):'')}</div>`;
 if(exact)html+=`<div class="dict-pos">TRADUÇÃO / DEFINIÇÃO</div><div class="dict-def strong">${h42Esc(h42CleanDef(exact.v))}</div>`;
 if(fallbackDef&&(fallbackDef.en||fallbackDef.defs)){const cedictText=fallbackDef.en||(fallbackDef.defs||[]).join('; ');if(!exact||h42CleanDef(exact.v)!==h42CleanDef(cedictText))html+=`<div class="dict-pos">TRADUÇÃO / CC-CEDICT</div><div class="dict-def strong">${h42Esc(cedictText)}</div>`;}
 if(!exact&&!fallbackDef)html+='<div class="dict-def">Nenhuma fonte online respondeu agora para este termo. Toque em pesquisar novamente em alguns segundos — as fontes públicas (Sogou/CC-CEDICT) às vezes ficam temporariamente indisponíveis.</div>';
 const related=dd.sugg.filter(x=>x.k!==n).slice(0,18);if(related.length)html+='<div class="dict-pos">PALAVRAS / USOS RELACIONADOS</div>'+related.map((x,i)=>`<div class="dict-def"><b>${i+1}. ${h42Esc(x.k)}</b> — ${h42Esc(h42CleanDef(x.v))}</div>`).join('');
 if(n.length>1){html+='<div class="dict-pos">IDEOGRAMAS ISOLADOS</div>';for(const ch of [...n]){if(!/[\u3400-\u9fff]/.test(ch))continue;html+=`<div class="dict-def"><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(ch)}">${h42Svg('sound')}</button> <b>${h42Esc(ch)}</b> <span class="dict-py">${h42Esc(typeof getWordPY==='function'?getWordPY(ch):'')}</span></div>`;}}
 html+=`<div class="dict-src-tag online">${dd.online&&fallbackDef?'Sogou + CC-CEDICT':dd.online?'Sogou online':(fallbackDef?'CC-CEDICT (fallback)':'Sem resposta online agora')}</div></div>`;out.innerHTML=html;try{v34BindAudio(out)}catch{}}
async function h42RenderWords(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';const dd=await h42DictData(n);let words=dd.sugg.filter(x=>x.k&&String(x.k).includes(n)).map(x=>({word:x.k,py:typeof getWordPY==='function'?getWordPY(x.k):'',defs:[h42CleanDef(x.v)],src:'Sogou'}));
 /* v4.8.1: junta MDBG/CC-CEDICT sempre, nao so quando a Sogou volta vazia - ideogramas isolados tem
    mais chance de a Sogou nao formar sugestões, e o MDBG cobre esse buraco. */
 try{if(typeof hr39MdbgWords==='function'){const ex=await hr39MdbgWords(n);const seen=new Set(words.map(w=>w.word));for(const w of ex){if(String(w.word||'').includes(n)&&!seen.has(w.word)){seen.add(w.word);words.push(w);}}}}catch{}
 words=words.slice(0,80);if(!words.length){out.innerHTML='<div class="dict-empty">Nenhuma palavra retornada agora pelas fontes online (Sogou/CC-CEDICT). Tente novamente em alguns segundos.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que contêm “'+h42Esc(n)+'”</div>'+words.map(w=>`<div class="dict-item"><div class="dict-item-main"><div class="zh">${h42Esc(w.word)}</div><div class="py">${h42Esc(w.py||((typeof getWordPY==='function')?getWordPY(w.word):''))}</div><div class="en">${h42Esc((w.defs||[]).slice(0,3).join('; '))}</div><div class="dict-src-tag">${h42Esc(w.src||'Sogou')}</div></div><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(w.word)}">${h42Svg('sound')}</button></div>`).join('')+'</div>';try{v34BindAudio(out)}catch{}}
async function h42RenderSents(q,out){const n=[...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('');out.innerHTML='<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases…</small></div>';const dd=await h42DictData(n);const map=new Map();dd.sents.forEach(s=>{if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,s);});try{if(typeof hr39SentenceSearch==='function'){const ex=await hr39SentenceSearch(n);ex.forEach(s=>{if(s.zh&&s.zh.includes(n)&&!map.has(s.zh))map.set(s.zh,{...s,src:s.src||'externa'});});}}catch{}const arr=[...map.values()].slice(0,24);if(!arr.length){out.innerHTML='<div class="dict-empty">Nenhuma frase contendo exatamente este termo foi retornada agora pelas fontes online. Tente novamente em alguns segundos.</div>';return;}out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases com “'+h42Esc(n)+'”</div><div class="online-first">O botão envia a frase inteira para a voz neural.</div>'+arr.map(s=>`<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${h42Esc(s.zh)}</div><div class="sent-py"><b>${h42Esc(s.py||((typeof getWordPY==='function')?getWordPY(s.zh):''))}</b></div></div><button class="dict-audio v34-svg-only" data-v34-speak="${h42Esc(s.zh)}">${h42Svg('sound')}</button></div><div class="sent-tr">${s.en?h42Esc(s.en):'Tradução indisponível nesta fonte.'}</div><div class="sent-src"><b>${h42Esc(s.src||'Sogou')}</b> • contém “${h42Esc(n)}”</div></div>`).join('')+'</div>';try{v34BindAudio(out)}catch{}}
function h42Patch(){window.h42Speak=h42Speak;try{h36Speak=async function(text){return h42Speak(text,h42CjkLen(text)<=1?'char':'compound')};window.h36Speak=h36Speak;window.hr39SpeakWhole=h36Speak;}catch{}try{speakWordMode=async function(word){return h42Speak(word,h42CjkLen(word)<=1?'char':'compound')};speakWord=function(word){return speakWordMode(word,'natural')};}catch{}try{window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return h42Speak((d&&d.zh)||key,'sentence')};}catch{}/* v4.8: nao reatribuir mais o onclick de #read-play aqui - o H48 e o unico dono do botao de leitura completa. */try{v29RenderDictDefs=(v29RenderDictDefs&&v29RenderDictDefs.__h52Final)?v29RenderDictDefs:h42RenderDefs;v29RenderDictWords=(v29RenderDictWords&&v29RenderDictWords.__h52Final)?v29RenderDictWords:h42RenderWords;v29RenderDictSentences=(v29RenderDictSentences&&v29RenderDictSentences.__h52Final)?v29RenderDictSentences:h42RenderSents;}catch{}try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H42_VERSION;}catch{}}
setTimeout(h42Patch,80);setTimeout(h42Patch,700);setTimeout(h42Patch,1600);setTimeout(h42Patch,3200);
})();


/* ===== v44-sogou-debug-bridge-fix ===== */
(function(){
'use strict';
const H44_VERSION='v4.5-debug-bridge';
function H44_isCjkText(s){return /[\u3400-\u9fff]/.test(String(s||''));}
function H44_normQuery(q){return [...String(q||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).join('') || String(q||'').trim();}
function H44_cacheKey(q){return 'h44.sogou.raw.'+H44_normQuery(q);}
function H44_now(){return new Date().toISOString();}
function H44_dbg(kind,title,data,status=''){try{if(typeof h43DebugLog==='function')h43DebugLog(kind,title,data,status);;}catch(e){}}
function H44_copy(txt){try{if(typeof h43DebugCopy==='function')return h43DebugCopy(txt);navigator.clipboard.writeText(String(txt||''));}catch(e){}}
function H44_parseData(data,q){
  const sugg=(typeof h42DeepSugg==='function'?h42DeepSugg(data,[]):[]);
  const sents=(typeof h42DeepSents==='function'?h42DeepSents(data,H44_normQuery(q),[]):[]);
  return {query:H44_normQuery(q),sugg,sents,rootKeys:data&&typeof data==='object'?Object.keys(data):[],data};
}
function H44_getCachedSogou(q){
  q=H44_normQuery(q); if(!q) return null;
  try{const raw=localStorage.getItem(H44_cacheKey(q)); if(!raw)return null; const box=JSON.parse(raw); if(!box||!box.data)return null; H44_dbg('sogou.cache','usando resposta Sogou colada/cached',{query:q,savedAt:box.savedAt,parsed:H44_parseData(box.data,q)},'ok'); return box.data;}catch(e){H44_dbg('sogou.cache','cache inválido',{query:q,error:e.message},'error');return null;}
}
function H44_storeSogou(q,data,source='manual-paste'){
  q=H44_normQuery(q); if(!q||!data)return false;
  try{localStorage.setItem(H44_cacheKey(q),JSON.stringify({query:q,source,savedAt:H44_now(),data}));H44_dbg('sogou.cache','resposta Sogou salva no HTML local',{query:q,source,parsed:H44_parseData(data,q)},'ok');return true;}catch(e){H44_dbg('sogou.cache','falha ao salvar cache',{query:q,error:e.message},'error');return false;}
}
window.H44_storeSogou=H44_storeSogou;
window.H44_getCachedSogou=H44_getCachedSogou;
function H44_openDebug(){try{const p=document.getElementById('h43-debug-panel'); if(p&&!p.classList.contains('open')){p.classList.add('open');localStorage.setItem('h43DebugOpen','1');}}catch(e){}}
function H44_renderCurrentDict(){try{if(typeof v29RenderDictCurrent==='function')v29RenderDictCurrent(true);}catch(e){H44_dbg('manual.render','não consegui rerenderizar dicionário',{error:e.message},'error');}}
function H44_installManualParser(){
  const old=window.h43DebugParsePaste || (typeof h43DebugParsePaste==='function'?h43DebugParsePaste:null);
  window.h43DebugParsePaste=function(){
    const ta=document.getElementById('h43-debug-paste');
    const q=(document.getElementById('dict-q')?.value||window.v29DictTerm||'').trim();
    try{
      const raw=(ta&&ta.value||'').trim();
      const data=JSON.parse(raw);
      const parsed=H44_parseData(data,q);
      if(ta){ta.dataset.lastParse=JSON.stringify(parsed,null,2);}      
      H44_storeSogou(q,data,'debug-paste');
      H44_dbg('manual.parse','JSON colado parseado e aplicado ao dicionário',parsed,'ok');
      H44_renderCurrentDict();
    }catch(e){
      H44_dbg('manual.parse','Erro ao parsear JSON colado',{error:e.message,raw:(ta&&ta.value||'').slice(0,2000)},'error');
      if(old)try{old();}catch{}
    }
  };
  try{const btn=document.getElementById('h43-debug-parse-paste'); if(btn)btn.onclick=window.h43DebugParsePaste;}catch(e){}
}
function H44_sogouForm(q){return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H44_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}
async function H44_sogouFetch(q){
  q=H44_normQuery(q); if(!q)return null;
  const cached=H44_getCachedSogou(q); if(cached)return cached;
  const form=H44_sogouForm(q);
  const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
  const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
  const isHttp=location.protocol==='http:'||location.protocol==='https:';
  H44_dbg('sogou.prepare','payload preparada v4.5',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:isHttp,protocol:location.protocol},'');
  if(isHttp){
    try{
      const payload={text:q,rawBody:form};
      H44_dbg('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload});
      const r=await fetch('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const raw=await r.text();
      H44_dbg('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:String(raw).slice(0,18000)},r.ok?'ok':'error');
      if(r.ok){const data=JSON.parse(raw);H44_storeSogou(q,data,'vercel-backend');return data;}
    }catch(e){H44_dbg('sogou.backend','backend indisponível ou retornou inválido',{error:e.message||String(e)},'error');}
  }
  // Em arquivo local/content://, a Sogou pode aparecer como 200 OK no Network, mas sem Access-Control-Allow-Origin.
  // O JS não consegue ler esse corpo. A tentativa abaixo fica só para registrar exatamente o bloqueio.
  try{
    H44_dbg('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form});
    const r=await fetch(directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form});
    const raw=await r.text();
    H44_dbg('sogou.direct','response direta Sogou legível',{status:r.status,ok:r.ok,headers:Object.fromEntries([...r.headers.entries()].slice(0,50)),raw:String(raw).slice(0,18000)},r.ok?'ok':'error');
    if(r.ok){const data=JSON.parse(raw);H44_storeSogou(q,data,'direct-cors-readable');return data;}
  }catch(e){
    H44_dbg('sogou.direct','CORS/fetch direto bloqueado no HTML local',{error:e.message||String(e),query:q,body:form,whatToDo:'Abra o painel DBG, copie a resposta bruta do Network > suggV3 > Preview/Response, cole no campo manual e clique em Parsear JSON colado. A partir daí o HTML usa esse JSON e salva no cache local.'},'error');
    H44_openDebug();
  }
  return H44_getCachedSogou(q);
}
try{window.h42SogouFetch=H44_sogouFetch; if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H44_sogouFetch;}catch(e){window.h42SogouFetch=H44_sogouFetch;}
function H44_installTtsLabParity(){
  // Pequenos ajustes para ficar ainda mais próximo do laboratório TTS enviado.
  try{
    if(typeof h42Endpoint==='function'){
      const oldEndpoint=h42Endpoint;
      window.h42Endpoint=async function(){
        H44_dbg('edge.endpoint.v44','usando fluxo Edge TTS do laboratório',{note:'EdgeTTSBridge + server-side /api/tts-edge + SSML server-side speech synthesis'});
        return oldEndpoint();
      };
      try{h42Endpoint=window.h42Endpoint;}catch{}
    }
  }catch(e){H44_dbg('edge.patch','falha ao instalar wrapper Edge',{error:e.message},'error');}
}
function H44_boot(){H44_installManualParser();H44_installTtsLabParity();try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H44_VERSION;}catch{}H44_dbg('v44.boot','patch de debug/manual Sogou carregado',{version:H44_VERSION,protocol:location.protocol},'ok');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H44_boot);else setTimeout(H44_boot,50);
setTimeout(H44_boot,800);
})();


/* ===== inline-15 ===== */
(function(){
'use strict';
const H45_VERSION='v4.5-public-proxy';
function H45_dbg(kind,title,data,status){try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}catch(e){}}
function H45_normQuery(q){try{return (window.H44_normQuery?window.H44_normQuery(q):String(q||'').replace(/[^\u3400-\u9fff]/g,'')).trim();}catch{return String(q||'').trim();}}
function H45_form(q){try{return (window.H44_sogouForm?window.H44_sogouForm(q):'from=auto&to=en&client=wap&text='+encodeURIComponent(H45_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on');}catch{return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H45_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}}
function H45_cache(q){try{return window.H44_getCachedSogou?window.H44_getCachedSogou(q):null;}catch{return null;}}
function H45_store(q,data,source){try{return window.H44_storeSogou?window.H44_storeSogou(q,data,source):false;}catch{return false;}}
function H45_headersObj(h){try{return Object.fromEntries(Array.from(h.entries()).slice(0,60));}catch{return {};}}
function H45_trimRaw(raw,max=22000){raw=String(raw??'');return raw.length>max?raw.slice(0,max)+'\n…[cortado '+(raw.length-max)+' chars]':raw;}
function H45_parseJsonish(raw){
  if(raw==null)throw new Error('resposta vazia');
  let txt=String(raw).replace(/^\uFEFF/,'').trim();
  if(!txt)throw new Error('resposta vazia');
  try{return JSON.parse(txt);}catch(e){}
  try{const wrap=JSON.parse(txt); if(wrap&&typeof wrap.contents==='string')return H45_parseJsonish(wrap.contents); if(wrap&&typeof wrap.data==='string')return H45_parseJsonish(wrap.data);}catch(e){}
  const a=txt.indexOf('{'), b=txt.lastIndexOf('}');
  if(a>=0&&b>a){try{return JSON.parse(txt.slice(a,b+1));}catch(e){}}
  throw new Error('não consegui parsear JSON: '+txt.slice(0,160));
}
const H45_PROXIES=[
  {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u),body:true},
  {id:'thingproxy.freeboard.io',url:u=>'https://thingproxy.freeboard.io/fetch/'+u,body:true},
  {id:'cors.isomorphic-git.org',url:u=>'https://cors.isomorphic-git.org/'+u,body:true},
  {id:'cors-anywhere.herokuapp.com',url:u=>'https://cors-anywhere.herokuapp.com/'+u,body:true},
  {id:'api.codetabs.com',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u),body:true},
  {id:'cors.eu.org',url:u=>'https://cors.eu.org/'+u,body:true},
  {id:'corsproxy.fly.dev',url:u=>'https://corsproxy.fly.dev/'+u,body:true}
];
function H45_customProxies(){
  try{
    const raw=localStorage.getItem('h45.publicProxies');
    if(!raw)return [];
    const arr=JSON.parse(raw);
    if(!Array.isArray(arr))return [];
    return arr.filter(Boolean).map((base,i)=>({id:'custom-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),body:true,custom:true}));
  }catch(e){H45_dbg('sogou.proxy.custom','lista custom inválida',{error:e.message},'error');return [];}
}
async function H45_fetchWithTimeout(url,init,ms){
  const ctl=new AbortController();
  const t=setTimeout(()=>{try{ctl.abort('timeout')}catch{}},ms||9000);
  try{return await fetch(url,{...init,signal:ctl.signal});}
  finally{clearTimeout(t);}
}
async function H45_tryProxy(proxy,targetUrl,form,q){
  const proxyUrl=proxy.url(targetUrl,form,q);
  const init={method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json,text/plain,*/*'},body:form};
  H45_dbg('sogou.proxy','request via proxy público',{proxy:proxy.id,proxyUrl,targetUrl,method:'POST',body:form,custom:!!proxy.custom},'');
  const r=await H45_fetchWithTimeout(proxyUrl,init,11000);
  const raw=await r.text();
  H45_dbg('sogou.proxy','response via proxy público',{proxy:proxy.id,status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
  if(!r.ok)throw new Error(proxy.id+' HTTP '+r.status);
  const data=H45_parseJsonish(raw);
  return data;
}
async function H45_sogouFetch(q){
  q=H45_normQuery(q); if(!q)return null;
  const cached=H45_cache(q); if(cached)return cached;
  const form=H45_form(q);
  const headers={'accept':'application/json','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
  const directUrl='https://fanyi.sogou.com/reventondc/suggV3';
  const isHttp=location.protocol==='http:'||location.protocol==='https:';
  H45_dbg('sogou.prepare','payload preparada v4.5 + proxies públicos',{query:q,directUrl,method:'POST',headers,body:form,backendAvailable:isHttp,protocol:location.protocol,proxyCount:H45_PROXIES.length,customProxyHint:'opcional: localStorage.h45.publicProxies = JSON array. Use {url} para URL codificada ou {raw} para URL crua.'},'');
  if(isHttp){
    try{
      const payload={text:q,rawBody:form};
      H45_dbg('sogou.backend','request /api/sogou',{url:'/api/sogou',method:'POST',payload},'');
      const r=await H45_fetchWithTimeout('/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},9000);
      const raw=await r.text();
      H45_dbg('sogou.backend','response /api/sogou',{status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
      if(r.ok){const data=H45_parseJsonish(raw);H45_store(q,data,'vercel-backend');return data;}
    }catch(e){H45_dbg('sogou.backend','backend não respondeu/indisponível',{error:e.message||String(e)},'error');}
  }
  try{
    H45_dbg('sogou.direct','request direta Sogou',{url:directUrl,method:'POST',headers,body:form},'');
    const r=await H45_fetchWithTimeout(directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},6000);
    const raw=await r.text();
    H45_dbg('sogou.direct','response direta Sogou legível',{status:r.status,ok:r.ok,headers:H45_headersObj(r.headers),raw:H45_trimRaw(raw)},r.ok?'ok':'error');
    if(r.ok){const data=H45_parseJsonish(raw);H45_store(q,data,'direct-cors-readable');return data;}
  }catch(e){H45_dbg('sogou.direct','CORS/fetch direto bloqueado; iniciando proxies públicos',{error:e.message||String(e),query:q,body:form},'error');}
  const proxies=H45_customProxies().concat(H45_PROXIES);
  const failures=[];
  for(const proxy of proxies){
    try{
      const data=await H45_tryProxy(proxy,directUrl,form,q);
      H45_store(q,data,'public-proxy:'+proxy.id);
      H45_dbg('sogou.proxy','proxy público funcionou e foi salvo no cache',{proxy:proxy.id,query:q},'ok');
      return data;
    }catch(e){
      failures.push({proxy:proxy.id,error:e.message||String(e)});
      H45_dbg('sogou.proxy','proxy público falhou',{proxy:proxy.id,error:e.message||String(e)},'error');
    }
  }
  H45_dbg('sogou.proxy','todos os proxies falharam; use o campo manual DBG ou adicione proxies customizados',{query:q,failures,customProxyExample:['https://SEU_PROXY/?{url}','https://SEU_PROXY/{raw}']},'error');
  try{if(window.H44_openDebug)window.H44_openDebug();}catch{}
  return H45_cache(q);
}
window.H45_sogouFetch=H45_sogouFetch;
try{window.h42SogouFetch=H45_sogouFetch;if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H45_sogouFetch;}catch(e){window.h42SogouFetch=H45_sogouFetch;}
try{window.H44_sogouFetch=H45_sogouFetch;if(typeof H44_sogouFetch!=='undefined')H44_sogouFetch=H45_sogouFetch;}catch(e){}
function H45_boot(){H45_dbg('v45.boot','patch de proxies públicos Sogou carregado',{version:H45_VERSION,protocol:location.protocol,proxies:H45_PROXIES.map(p=>p.id)},'ok');try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H45_VERSION;}catch{}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H45_boot);else setTimeout(H45_boot,80);
})();


/* ===== h46-edge-tts-fetch-proxy-fix ===== */
(function(){
'use strict';
const H46_VERSION='v4.6-edge-tts-fetch-proxy-fixed';
const H46_TOKEN_REFRESH_BEFORE_EXPIRY=180;
let H46_TOKEN={endpoint:null,token:null,expiredAt:0};
let H46_AUDIO_URL=null;

function H46_log(kind,title,data,status){
  try{(window.H44_dbg||window.h43DebugLog||function(){})(kind,title,data,status||'');}
  catch(e){}
}
function H46_toast(msg){try{(window.h42Toast||window.h41Toast||window.toast||alert)(String(msg||''));}catch{try{console.warn(msg);}catch{}}}
function H46_cjkCount(s){return [...String(s||'')].filter(ch=>/[\u3400-\u9fff]/.test(ch)).length;}
function H46_esc(s){try{return (window.esc?window.esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));}catch{return String(s??'');}}
function H46_xml(s){return String(s??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','\"':'&quot;'}[c]));}
function H46_headersObj(h){try{return Object.fromEntries(Array.from(h.entries()).slice(0,60));}catch{return {};}}
function H46_short(raw,max=22000){raw=String(raw??'');return raw.length>max?raw.slice(0,max)+'\n…[cortado '+(raw.length-max)+' chars]':raw;}
function H46_delay(ms){return new Promise(r=>setTimeout(r,ms));}
function H46_getAudio(){try{return curAudio;}catch{return window.curAudio||null;}}
function H46_setAudio(a){try{curAudio=a;}catch{}try{window.curAudio=a;}catch{}}
function H46_uuid(){try{if(crypto.randomUUID)return crypto.randomUUID().replace(/-/g,'');}catch{}const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');}
function H46_b64ToBytes(b64){const bin=atob(b64);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
function H46_bytesToB64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
function H46_date(){return new Date().toUTCString().replace(/GMT/,'').trim().toLowerCase()+' gmt';}
async function H46_hmac(keyBytes,data){const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:{name:'SHA-256'}},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)));}
const H46_SECRET='server-side:/api/tts-edge';
async function H46_sign(urlStr){throw new Error('Assinatura movida para /api/tts-edge');}
function H46_css(){
 if(document.getElementById('h46-css'))return;
 const css=document.createElement('style');css.id='h46-css';css.textContent=`
 :root{--rf:'Noto Sans SC','Noto Sans CJK SC','Source Han Sans SC','PingFang SC','Microsoft YaHei','Segoe UI',Arial,sans-serif!important;--pyf:'Noto Sans','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif!important;}
 body,#sr,.rtext,.hzrow,.hzch,.pt,.sp,.ww,.dict-word,.dict-item .zh,.sent-zh,.lexi-zh,.study-word{font-family:var(--rf)!important;font-variant-numeric:tabular-nums!important;font-feature-settings:'tnum' 1,'kern' 1!important;}
 .hzrow,.wunit,.rtext{font-variant-numeric:tabular-nums!important;}
 .h46-grid2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.h46-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}
 .h46-row{margin:8px 0 11px}.h46-lab{font-size:11px;color:#9c8158;font-weight:900;text-transform:uppercase;letter-spacing:.75px;margin:6px 0 4px}.h46-note{font-size:11px;color:#8b806f;line-height:1.45;margin-top:4px}.h46-out{font-size:12px;color:var(--ac);font-weight:850;text-align:right}.h46-range{display:grid;grid-template-columns:1fr 56px;gap:8px;align-items:center}.h46-range input{width:100%}.h46-select,.h46-input{width:100%;border:1px solid #373737;background:#252525;color:#fff;border-radius:10px;padding:10px 11px;font-size:14px;margin:0 0 6px;outline:none}.h46-select:focus,.h46-input:focus{border-color:var(--ac)}
 .h41-acc.h46-open .h41-acc-b,.h41-acc.open .h41-acc-b{display:block!important}.h46-status{border:1px solid rgba(var(--ac-rgb),.24);background:rgba(var(--ac-rgb),.07);color:#d7bd8a;border-radius:12px;padding:9px 10px;font-size:12px;line-height:1.45;margin-top:8px;white-space:pre-wrap}.h46-mini-btn{border:1px solid rgba(var(--ac-rgb),.38);background:rgba(var(--ac-rgb),.10);color:var(--ac);border-radius:10px;padding:9px 10px;font-weight:850;font-size:12px;cursor:pointer}.h46-mini-btn:active{filter:brightness(1.15)}
 @media(max-width:520px){.h46-grid2,.h46-grid3{grid-template-columns:1fr}}
 `;document.head.appendChild(css);
}

const H46_VOICES=[
 {name:'zh-CN-XiaoxiaoNeural',label:'晓晓 · Xiaoxiao — feminina expressiva',gender:'F',styles:['general','affectionate','angry','assistant','calm','chat','chat-casual','cheerful','customerservice','disgruntled','excited','fearful','friendly','gentle','lyrical','newscast','poetry-reading','sad','serious','sorry','whispering'],roles:[]},
 {name:'zh-CN-XiaoyiNeural',label:'晓伊 · Xiaoyi — feminina doce',gender:'F',styles:['general','affectionate','angry','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'],roles:[]},
 {name:'zh-CN-YunyangNeural',label:'云扬 · Yunyang — masculino narração/notícia',gender:'M',styles:['general','customerservice','narration-professional','newscast-casual'],roles:[]},
 {name:'zh-CN-XiaochenNeural',label:'晓辰 · Xiaochen — feminina comercial',gender:'F',styles:['general','livecommercial','live-commercial'],roles:[]},
 {name:'zh-CN-XiaohanNeural',label:'晓涵 · Xiaohan — feminina emocional',gender:'F',styles:['general','affectionate','angry','calm','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'],roles:[]},
 {name:'zh-CN-XiaomengNeural',label:'晓梦 · Xiaomeng — feminina chat',gender:'F',styles:['general','chat'],roles:[]},
 {name:'zh-CN-XiaomoNeural',label:'晓墨 · Xiaomo — feminina + roles',gender:'F',styles:['general','affectionate','angry','calm','cheerful','depressed','disgruntled','embarrassed','envious','fearful','gentle','sad','serious'],roles:['Boy','Girl','YoungAdultFemale','YoungAdultMale','OlderAdultFemale','OlderAdultMale','SeniorFemale','SeniorMale']},
 {name:'zh-CN-XiaoruiNeural',label:'晓睿 · Xiaorui — feminina sóbria',gender:'F',styles:['general','angry','calm','fearful','sad'],roles:[]},
 {name:'zh-CN-XiaoshuangNeural',label:'晓双 · Xiaoshuang — criança/chat',gender:'F',styles:['general','chat'],roles:[]},
 {name:'zh-CN-XiaoxuanNeural',label:'晓萱 · Xiaoxuan — feminina',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaoyanNeural',label:'晓颜 · Xiaoyan — feminina',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaoyouNeural',label:'晓悠 · Xiaoyou — criança',gender:'F',styles:['general'],roles:[]},
 {name:'zh-CN-XiaozhenNeural',label:'晓甄 · Xiaozhen — feminina formal',gender:'F',styles:['general','angry','cheerful','disgruntled','fearful','sad','serious'],roles:[]},
 {name:'zh-CN-YunxiNeural',label:'云希 · Yunxi — masculino jovem',gender:'M',styles:['general','cheerful','depressed','embarrassed','fearful','narration-relaxed','sad','serious'],roles:[]},
 {name:'zh-CN-YunjianNeural',label:'云健 · Yunjian — masculino firme',gender:'M',styles:['general','narration-relaxed','sports-commentary','sports-commentary-excited'],roles:[]},
 {name:'zh-CN-YunfengNeural',label:'云枫 · Yunfeng — masculino emocional',gender:'M',styles:['general','angry','cheerful','depressed','disgruntled','fearful','sad','serious'],roles:[]},
 {name:'zh-CN-YunhaoNeural',label:'云皓 · Yunhao — masculino propaganda',gender:'M',styles:['general','advertisement-upbeat','advertisement_upbeat'],roles:[]},
 {name:'zh-CN-YunxiaNeural',label:'云夏 · Yunxia — masculino emocional',gender:'M',styles:['general','angry','calm','cheerful','fearful','sad'],roles:[]},
 {name:'zh-CN-YunyeNeural',label:'云野 · Yunye — masculino + roles',gender:'M',styles:['general','angry','calm','cheerful','disgruntled','embarrassed','fearful','sad','serious'],roles:['Boy','Girl','YoungAdultFemale','YoungAdultMale','OlderAdultFemale','OlderAdultMale','SeniorFemale','SeniorMale']},
 {name:'zh-CN-YunzeNeural',label:'云泽 · Yunze — masculino idoso/roles',gender:'M',styles:['general','angry','calm','cheerful','depressed','disgruntled','documentary-narration','fearful','sad','serious'],roles:['OlderAdultMale','SeniorMale']},
 {name:'zh-CN-XiaoxiaoMultilingualNeural',label:'晓晓 Multilingual — experimental',gender:'F',styles:['general','affectionate','cheerful','empathetic','excited','poetry-reading','sorry','story'],roles:[]},
 {name:'zh-CN-XiaoyouMultilingualNeural',label:'晓悠 Multilingual — experimental',gender:'F',styles:['general','angry','chat','cheerful','cute','poetry-reading','sad','story'],roles:[]},
 {name:'zh-CN-Bo:MAI-Voice-2',label:'Bo MAI Voice 2 — experimental',gender:'M',styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'],roles:[]},
 {name:'zh-CN-Mei:MAI-Voice-2',label:'Mei MAI Voice 2 — experimental',gender:'F',styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'],roles:[]}
];
const H46_STYLE_LABELS={general:'通用 / neutro',affectionate:'亲切 / carinhoso',angry:'生气 / bravo',assistant:'助手 / assistente',calm:'平静 / calmo',chat:'聊天 / conversa','chat-casual':'casual',cheerful:'开心 / alegre',customerservice:'客服 / atendimento',disgruntled:'不满 / descontente',excited:'兴奋 / animado',fearful:'害怕 / medo',friendly:'友好 / amigável',gentle:'温柔 / gentil',lyrical:'抒情 / lírico',newscast:'新闻 / jornal','newscast-casual':'notícia casual','narration-professional':'narração profissional','narration-relaxed':'narração relaxada','documentary-narration':'documentário','poetry-reading':'poesia',sad:'伤心 / triste',serious:'严肃 / sério',sorry:'抱歉 / arrependido',whispering:'耳语 / sussurro',depressed:'低落 / deprimido',embarrassed:'尴尬 / constrangido',envious:'羡慕 / invejoso',livecommercial:'comercial ao vivo','live-commercial':'comercial ao vivo','advertisement-upbeat':'propaganda animada',advertisement_upbeat:'propaganda animada',cute:'fofo',story:'história',happy:'feliz',confused:'confuso',determined:'determinado',disgusted:'nojo',hopeful:'esperançoso',jealous:'ciumento',joyful:'alegria',regretful:'arrependido',relieved:'aliviado',shouting:'gritando',softvoice:'voz suave',surprised:'surpreso','sports-commentary':'comentário esportivo','sports-commentary-excited':'comentário animado',empathetic:'empático'};
const H46_ROLE_LABELS={'':'Sem role',Girl:'Menina',Boy:'Menino',YoungAdultFemale:'Jovem mulher',YoungAdultMale:'Jovem homem',OlderAdultFemale:'Mulher adulta',OlderAdultMale:'Homem adulto',SeniorFemale:'Mulher idosa',SeniorMale:'Homem idoso'};
function H46_voiceMeta(name){return H46_VOICES.find(v=>v.name===name)||H46_VOICES[0];}
function H46_defaultSettings(){return {voice:'zh-CN-XiaoxiaoNeural',speed:1,pitch:0,volume:0,style:'general',degree:1.35,role:'',format:'audio-24khz-48kbitrate-mono-mp3',chunkMode:'full',linePause:0};}
function H46_loadSettings(){let s=H46_defaultSettings();try{s={...s,...JSON.parse(localStorage.getItem('h41VoiceSettings')||localStorage.getItem('v40VoiceSettings')||'{}')}}catch{}return s;}
function H46_saveSettings(patch){const next={...H46_loadSettings(),...patch};try{localStorage.setItem('h41VoiceSettings',JSON.stringify(next));}catch{}return next;}
function H46_applyVoiceOptions(){
 const voiceSel=document.getElementById('h41-voice-select'),styleSel=document.getElementById('h41-style'),roleSel=document.getElementById('h41-role'),roleHint=document.getElementById('h46-role-hint');
 if(!voiceSel||!styleSel||!roleSel)return;
 const settings=H46_loadSettings();
 const gender=(document.querySelector('.h41-tab.on')?.dataset.h41G)||H46_voiceMeta(settings.voice).gender.toLowerCase();
 const list=H46_VOICES.filter(v=>v.gender.toLowerCase()===(gender==='m'?'m':'f'));
 voiceSel.innerHTML=list.map(v=>`<option value="${H46_esc(v.name)}">${H46_esc(v.label)}</option>`).join('');
 voiceSel.value=list.some(v=>v.name===settings.voice)?settings.voice:list[0].name;
 const meta=H46_voiceMeta(voiceSel.value);
 const oldStyle=settings.style||'general';
 styleSel.innerHTML=meta.styles.map(s=>`<option value="${H46_esc(s)}">${H46_esc(H46_STYLE_LABELS[s]||s)}</option>`).join('');
 styleSel.value=meta.styles.includes(oldStyle)?oldStyle:(meta.styles.includes('cheerful')?'cheerful':meta.styles[0]||'general');
 roleSel.innerHTML=[''].concat(meta.roles||[]).map(r=>`<option value="${H46_esc(r)}">${H46_esc(H46_ROLE_LABELS[r]||r)}</option>`).join('');
 roleSel.disabled=!(meta.roles&&meta.roles.length);
 roleSel.value=(meta.roles||[]).includes(settings.role)?settings.role:'';
 if(roleHint)roleHint.textContent=(meta.roles&&meta.roles.length)?'Esta voz aceita role/personagem no SSML.':'Role desativado para esta voz, evitando atributo ignorado.';
 H46_saveSettings({voice:voiceSel.value,style:styleSel.value,role:roleSel.value});
}
function H46_refreshVoiceOutputs(){
 const s=H46_getSettings();
 const map={
  'h46-degree-out':Number(s.degree||1).toFixed(2),
  'h46-linepause-out':`${Number(s.linePause||0)}ms`,
  'h46-speed-out':`${Number(s.speed||1).toFixed(2)}x`,
  'h46-pitch-out':`${Number(s.pitch||0)>=0?'+':''}${Number(s.pitch||0)}Hz`,
  'h46-volume-out':`${Number(s.volume||0)>=0?'+':''}${Math.round(Number(s.volume||0)*100)}%`
 };
 Object.entries(map).forEach(([id,val])=>{const el=document.getElementById(id);if(el)el.textContent=val;});
}
function H46_installVoiceUi(){/* v4.9: substituído pelo painel v36 (ícones SVG, seções organizadas). */}
function H46_getSettings(){
 let base=H46_loadSettings();
 try{const ids={voice:'h41-voice-select',style:'h41-style',role:'h41-role',speed:'h41-speed',pitch:'h41-pitch',volume:'h41-volume',degree:'h41-degree',linePause:'h41-linePause',format:'h41-format',chunkMode:'h41-chunkMode'};Object.entries(ids).forEach(([k,id])=>{const el=document.getElementById(id);if(!el||el.value==null||el.value==='')return;base[k]=['speed','pitch','volume','degree','linePause'].includes(k)?Number(el.value):el.value;});}catch{}
 // v3: áudio em bloco completo. Normaliza configurações antigas que ainda
 // tenham chunkMode:'line', evitando pausas artificiais linha/frase por frase.
 if(!base.chunkMode||base.chunkMode==='line')base.chunkMode='full';
 if(base.linePause==null||Number(base.linePause)===450)base.linePause=0;
 return {...H46_defaultSettings(),...base};
}
function H46_signed(n,suffix){n=Number(n)||0;return (n>=0?'+':'')+n+suffix;}
function H46_rate(speed){return H46_signed(Math.round((Number(speed||1)-1)*100),'%');}
function H46_pitch(v){return H46_signed(parseInt(v||0,10),'Hz');}
function H46_volume(v){return H46_signed(Math.round(Number(v||0)*100),'%');}
function H46_express(text,o){const meta=H46_voiceMeta(o.voice);const style=(o.style&&o.style!=='general'&&(meta.styles||[]).includes(o.style))?o.style:'';const role=(o.role&&(meta.roles||[]).includes(o.role))?o.role:'';const attrs=[];if(style)attrs.push(`style="${H46_xml(style)}"`);if(style&&o.degree)attrs.push(`styledegree="${H46_xml(o.degree)}"`);if(role)attrs.push(`role="${H46_xml(role)}"`);const prosody=`<prosody rate="${H46_xml(H46_rate(o.speed))}" pitch="${H46_xml(H46_pitch(o.pitch))}" volume="${H46_xml(H46_volume(o.volume))}">${H46_xml(text)}</prosody>`;return attrs.length?`<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>`:prosody;}
function H46_buildSsml(text,o=H46_getSettings()){const voice=o.voice||'zh-CN-XiaoxiaoNeural';const lang=voice.split('-').slice(0,2).join('-')||'zh-CN';const linePause=Math.max(0,Math.min(2000,Number(o.linePause??450)));const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);let body='';if((o.chunkMode||'line')==='line'&&lines.length>1){body=lines.map((line,i)=>`    ${H46_express(line,o)}${i<lines.length-1&&linePause>0?`\n    <break time="${linePause}ms"/>`:''}`).join('\n');}else{body=`    ${H46_express(String(text||'').trim(),o)}`;}return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${H46_xml(lang)}">\n  <voice name="${H46_xml(voice)}">\n${body}\n  </voice>\n</speak>`;}
function H46_splitText(text,maxLen=1750){const clean=String(text||'').replace(/[ \t]+/g,' ').trim();if(!clean)return[];const out=[];let cur='';const sentences=clean.split(/(?<=[。！？!?\.])\s*/);for(const s of sentences){if(!s)continue;if((cur+s).length<=maxLen){cur+=s;}else{if(cur)out.push(cur.trim());if(s.length<=maxLen)cur=s;else{for(let i=0;i<s.length;i+=maxLen)out.push(s.slice(i,i+maxLen));cur='';}}}if(cur)out.push(cur.trim());return out;}
async function H46_endpoint(){throw new Error('Endpoint movido para /api/tts-edge');}
async function H46_audioFromSsml(ssml,o=H46_getSettings()){const blob=await window.hzTtsEdgeApiBlob(ssml,{format:o&&o.format});try{H46_log&&H46_log('edge.api.h46','áudio recebido via /api/tts-edge',{size:blob.size,type:blob.type,format:o&&o.format},'ok');}catch{}return blob;}
async function H46_edgeBlob(text,o=H46_getSettings()){text=String(text||'').trim();if(!text)throw new Error('Sem texto para TTS.');const chunks=text.length<1750?[text]:H46_splitText(text,1750);const blobs=[];for(let i=0;i<chunks.length;i++){H46_log('edge.chunk.h46','gerando bloco '+(i+1)+'/'+chunks.length,{chars:chunks[i].length,cjk:H46_cjkCount(chunks[i])},'');blobs.push(await H46_audioFromSsml(H46_buildSsml(chunks[i],o),o));await H46_delay(80);}return blobs.length===1?blobs[0]:new Blob(blobs,{type:o.format&&o.format.includes('opus')?(o.format.includes('ogg')?'audio/ogg':'audio/webm'):'audio/mpeg'});}
function H46_playBlob(blob){return new Promise((res,rej)=>{try{const old=H46_getAudio();if(old)old.pause();}catch{}try{if(H46_AUDIO_URL)URL.revokeObjectURL(H46_AUDIO_URL);}catch{}H46_AUDIO_URL=URL.createObjectURL(blob);const a=new Audio(H46_AUDIO_URL);H46_setAudio(a);const timeout=Math.max(20000,Math.min(300000,blob.size*13));const t=setTimeout(()=>{try{a.pause();}catch{}H46_setAudio(null);rej(new Error('timeout de áudio'));},timeout);a.onended=()=>{clearTimeout(t);H46_setAudio(null);res();};a.onerror=()=>{clearTimeout(t);H46_setAudio(null);rej(new Error('falha no player de áudio'));};a.play().catch(e=>{clearTimeout(t);H46_setAudio(null);rej(e);});});}
async function H46_baidu(text){const t=String(text||'').trim();if(!t)return false;const urls=[`https://fanyi.baidu.com/gettts?lan=zh&text=${encodeURIComponent(t)}&spd=5&source=web`,...(typeof h36AudioUrls==='function'?h36AudioUrls(t):[])];for(const u of urls){try{if(typeof h36PlayUrl==='function')await h36PlayUrl(u);else await new Promise((res,rej)=>{const a=new Audio(u);a.onended=res;a.onerror=rej;a.play().catch(rej);});return true;}catch{}}return false;}
async function H46_speak(text,kind='auto'){text=String(text||'').trim();if(!text)return false;try{if(typeof h36Busy==='function')h36Busy(true);const one=H46_cjkCount(text)<=1;if((kind==='char'||one)&&await H46_baidu(text))return true;const blob=await H46_edgeBlob(text,H46_getSettings());await H46_playBlob(blob);return true;}catch(e){H46_log('edge.tts.h46','Edge TTS final falhou',{error:e.message||String(e),kind,textPreview:text.slice(0,180)},'error');if(await H46_baidu(text))return true;H46_toast('Falha no Edge TTS: '+(e.message||e));return false;}finally{if(typeof h36Busy==='function')h36Busy(false);}}
function H46_readerText(){try{if(typeof curBook!=='undefined'&&curBook){const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;const chs=curBook.chapters||curBook.pages;if(chs&&chs[idx])return chs[idx].content||chs[idx].text||chs[idx].body||'';if(curBook.content)return curBook.content;}}catch{}try{const raw=document.getElementById('rtext')?.innerText||'';if(raw.trim())return raw;}catch{}try{if(typeof readerTokens!=='undefined')return (readerTokens||[]).map(x=>x.word||x.char||'').join('');}catch{}return '';}
async function H46_startReading(){const text=H46_readerText();if(!String(text).trim())return H46_toast('Sem texto para ler.');try{v32Reading=true;}catch{}try{window.v32Reading=true;}catch{}try{if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}const b=document.getElementById('read-play');if(b){b.classList.add('h41-working');b.innerHTML=(typeof h42Svg==='function'?h42Svg('pause'):'Ⅱ');}try{await H46_speak(text,'full');}finally{try{v32Reading=false;}catch{}try{window.v32Reading=false;}catch{}try{if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}if(b)b.classList.remove('h41-working');}}
function H46_stopReading(){try{v32Reading=false;}catch{}try{window.v32Reading=false;}catch{}try{const a=H46_getAudio();if(a)a.pause();H46_setAudio(null);if(typeof v32UpdateReadUi==='function')v32UpdateReadUi();}catch{}}

const H46_TEXT_PROXIES=[
 {id:'direct',direct:true,url:u=>u},
 {id:'jina-reader',url:u=>'https://r.jina.ai/'+u},
 {id:'allorigins-raw',url:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)},
 {id:'allorigins-get',url:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u)},
 {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u)},
 {id:'codetabs',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)},
 {id:'thingproxy',url:u=>'https://thingproxy.freeboard.io/fetch/'+u},
 {id:'isomorphic-git',url:u=>'https://cors.isomorphic-git.org/'+u},
 {id:'corsproxy-fly',url:u=>'https://corsproxy.fly.dev/'+u},
 {id:'cors-eu',url:u=>'https://cors.eu.org/'+u}
];
function H46_customTextProxies(){try{const arr=JSON.parse(localStorage.getItem('h46.textProxies')||'[]');if(!Array.isArray(arr))return[];return arr.filter(Boolean).map((base,i)=>({id:'custom-text-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),custom:true}));}catch{return[];}}
function H46_cleanMarkdown(raw,url=''){let s=String(raw||'').replace(/^---[\s\S]*?---\n/m,'').replace(/^(Title|URL Source|Published Time|Markdown Content):.*$/gmi,'').replace(/```[\s\S]*?```/g,'').replace(/`([^`\n]+)`/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*{1,3}([^*\n]+)\*{1,3}/g,'$1').replace(/_{1,2}([^_\n]+)_{1,2}/g,'$1').replace(/^\s*[-*+•]\s+/gm,'').replace(/^\s*\d+\.\s+/gm,'').replace(/^\s*>\s*/gm,'').replace(/\|[^\n]+\|/g,'');return H46_cleanRaw(s,url);}
function H46_cleanRaw(raw,url=''){try{if(typeof v38CleanRaw==='function')return v38CleanRaw(raw,url);}catch{}try{if(typeof cleanRaw==='function')return cleanRaw(raw);}catch{}return String(raw||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\n{3,}/g,'\n\n').trim();}
function H46_cleanHtml(raw,url=''){try{if(typeof v38CleanHTML==='function')return v38CleanHTML(raw,url);}catch{}try{if(typeof cleanHTML==='function')return cleanHTML(raw);}catch{}return H46_cleanRaw(String(raw||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' '),url);}
function H46_jsonText(obj,url='',depth=0,bag=[]){
 if(depth>7||obj==null)return bag;
 if(typeof obj==='string'){const s=obj.trim();if(!s)return bag;if(/<html|<body|<article|<main|<p[\s>]/i.test(s))bag.push(H46_cleanHtml(s,url));else if(H46_cjkCount(s)>3||s.length>80)bag.push(H46_cleanMarkdown(s,url));return bag;}
 if(Array.isArray(obj)){obj.forEach(x=>H46_jsonText(x,url,depth+1,bag));return bag;}
 if(typeof obj==='object'){
  const priority=['content','text','body','article','chapter','chapterContent','html','markdown','plain','raw','description','summary','title'];
  for(const k of priority){if(obj[k]!=null)H46_jsonText(obj[k],url,depth+1,bag);}
  for(const [k,v] of Object.entries(obj)){if(!priority.includes(k))H46_jsonText(v,url,depth+1,bag);}
 }
 return bag;
}
function H46_parseJsonish(raw){if(raw==null)throw new Error('resposta vazia');let txt=String(raw).replace(/^\uFEFF/,'').trim();if(!txt)throw new Error('resposta vazia');try{return JSON.parse(txt);}catch{}const a=txt.indexOf('{'),b=txt.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(txt.slice(a,b+1));}catch{}}const aa=txt.indexOf('['),bb=txt.lastIndexOf(']');if(aa>=0&&bb>aa){try{return JSON.parse(txt.slice(aa,bb+1));}catch{}}throw new Error('JSON inválido');}
function H46_textFromRaw(raw,contentType='',url='',proxyId=''){
 const trimmed=String(raw||'').trim();if(!trimmed)return'';
 let parsed=null;
 if(/json/i.test(contentType)||/^[{\[]/.test(trimmed)){try{parsed=H46_parseJsonish(trimmed);}catch{}}
 if(parsed!=null){
  if(parsed&&typeof parsed==='object'){
   for(const k of ['contents','content','body','data','result','response','html','markdown','text']){
    if(typeof parsed[k]==='string'&&parsed[k].trim()){const nested=H46_textFromRaw(parsed[k],k==='html'?'text/html':'',url,proxyId);if(H46_cjkCount(nested)>5||nested.length>80)return nested;}
   }
  }
  const parts=H46_jsonText(parsed,url).map(x=>String(x||'').trim()).filter(Boolean);
  const uniq=[];const seen=new Set();for(const p of parts){const key=p.replace(/\s+/g,'').slice(0,180);if(key&&!seen.has(key)){seen.add(key);uniq.push(p);}}
  const joined=H46_cleanRaw(uniq.join('\n\n'),url);if(joined)return joined;
 }
 if(proxyId==='jina-reader')return H46_cleanMarkdown(trimmed,url);
 if(/^\s*</.test(trimmed)||/<html|<body|<article|<main|<p[\s>]/i.test(trimmed))return H46_cleanHtml(trimmed,url);
 return H46_cleanMarkdown(trimmed,url);
}
async function H46_fetchTimeout(url,init={},ms=14000){const ctl=new AbortController();const t=setTimeout(()=>{try{ctl.abort('timeout')}catch{}},ms);try{return await fetch(url,{...init,signal:ctl.signal});}finally{clearTimeout(t);}}
async function H46_fetchText(url){
 url=String(url||'').trim();if(!/^https?:\/\//i.test(url))throw new Error('URL inválida: use http/https');
 const proxies=H46_TEXT_PROXIES.concat(H46_customTextProxies());let last=null;const failures=[];
 for(const p of proxies){
  const target=p.url(url);
  try{
   H46_log('source.fetch.h46','buscando texto',{proxy:p.id,url:target,direct:!!p.direct},'');
   const r=await H46_fetchTimeout(target,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'text/html,application/json,text/plain,*/*'}},p.direct?9000:18000);
   const raw=await r.text();
   H46_log('source.fetch.h46','resposta source',{proxy:p.id,status:r.status,ok:r.ok,headers:H46_headersObj(r.headers),raw:H46_short(raw,6000)},r.ok?'ok':'error');
   if(!r.ok)throw new Error('HTTP '+r.status);
   const text=H46_textFromRaw(raw,r.headers.get('content-type')||'',url,p.id);
   if(!text||H46_cjkCount(text)<8&&text.length<80)throw new Error('texto insuficiente após parser');
   return text;
  }catch(e){last=e;failures.push({proxy:p.id,error:e.message||String(e)});H46_log('source.fetch.h46','rota falhou',{proxy:p.id,error:e.message||String(e)},'error');}
 }
 throw new Error('falha ao buscar/extrair URL. Último erro: '+(last?.message||last||'desconhecido'));
}
async function H46_importURL(url){try{if(typeof showLoad==='function')showLoad('Extraindo texto com fallback CORS/proxy...');const text=await H46_fetchText(url);const host=(()=>{try{return new URL(url).hostname;}catch{return url;}})();const lines=text.split('\n').map(x=>x.trim()).filter(Boolean);const title=lines[0]&&lines[0].length<80?lines[0]:host;if(typeof saveBook==='function')await saveBook({title,source:host,content:text,type:'url'});else if(typeof dbPut==='function'&&window.STB)await dbPut(STB,{id:Date.now().toString(36)+Math.random().toString(36).slice(2),title,source:host,content:text,type:'url',progress:0,lastRead:null,addedAt:Date.now(),charsRead:0});try{closeModals();}catch{}H46_toast('Importado!');try{await loadLib();}catch{}}catch(e){H46_toast('Erro: '+(e.message||e));}finally{try{hideLoad();}catch{}}}

function H46_normQuery(q){try{return (window.H44_normQuery?window.H44_normQuery(q):String(q||'').replace(/[^\u3400-\u9fff]/g,''))||String(q||'').trim();}catch{return String(q||'').trim();}}
function H46_sogouForm(q){try{return (window.H44_sogouForm?window.H44_sogouForm(q):'from=auto&to=en&client=wap&text='+encodeURIComponent(H46_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on');}catch{return 'from=auto&to=en&client=wap&text='+encodeURIComponent(H46_normQuery(q))+'&uuid=null&pid=sogou-dict-vr&addSugg=on';}}
function H46_cacheSogou(q){try{return window.H44_getCachedSogou?window.H44_getCachedSogou(q):null;}catch{return null;}}
function H46_storeSogou(q,data,source){try{return window.H44_storeSogou?window.H44_storeSogou(q,data,source):false;}catch{return false;}}
const H46_SOGOU_PROXIES=[
 {id:'corsproxy.io',url:u=>'https://corsproxy.io/?'+encodeURIComponent(u)},
 {id:'thingproxy',url:u=>'https://thingproxy.freeboard.io/fetch/'+u},
 {id:'isomorphic-git',url:u=>'https://cors.isomorphic-git.org/'+u},
 {id:'corsproxy-fly',url:u=>'https://corsproxy.fly.dev/'+u},
 {id:'cors-eu',url:u=>'https://cors.eu.org/'+u},
 {id:'codetabs',url:u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)},
 {id:'allorigins-raw',url:u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u)},
 {id:'allorigins-get',url:u=>'https://api.allorigins.win/get?url='+encodeURIComponent(u)}
];
function H46_customSogouProxies(){try{const arr=JSON.parse(localStorage.getItem('h46.sogouProxies')||localStorage.getItem('h45.publicProxies')||'[]');if(!Array.isArray(arr))return[];return arr.filter(Boolean).map((base,i)=>({id:'custom-sogou-'+(i+1),url:u=>String(base).replace('{url}',encodeURIComponent(u)).replace('{raw}',u),custom:true}));}catch{return[];}}
async function H46_trySogouRoute(id,url,init,q){const r=await H46_fetchTimeout(url,init,12000);const raw=await r.text();H46_log('sogou.fetch.h46','response '+id,{status:r.status,ok:r.ok,headers:H46_headersObj(r.headers),raw:H46_short(raw)},r.ok?'ok':'error');if(!r.ok)throw new Error(id+' HTTP '+r.status);return H46_parseJsonish(raw);}
async function H46_sogouFetch(q){
 q=H46_normQuery(q);if(!q)return null;const cached=H46_cacheSogou(q);if(cached)return cached;
 const directUrl='https://fanyi.sogou.com/reventondc/suggV3';const form=H46_sogouForm(q);const headers={'accept':'application/json,text/plain,*/*','accept-language':'zh-CN','content-type':'application/x-www-form-urlencoded'};
 const failures=[];H46_log('sogou.prepare.h46','payload preparada com direct + proxies públicos',{query:q,directUrl,method:'POST',body:form},'');
 try{H46_log('sogou.direct.h46','request direta Sogou',{url:directUrl,method:'POST',headers,body:form},'');const data=await H46_trySogouRoute('direct',directUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},q);H46_storeSogou(q,data,'direct-cors-readable-h46');return data;}catch(e){failures.push({route:'direct',error:e.message||String(e)});H46_log('sogou.direct.h46','direto bloqueado/falhou; iniciando proxies',{error:e.message||String(e)},'error');}
 if(location.protocol==='http:'||location.protocol==='https:'){
  /* v4.8.1: o header Referer nao pode ser setado via fetch() no navegador (forbidden header), e e
     exatamente esse header que a Sogou usa para autorizar/contextualizar a consulta (visto nos dois
     curls: referer=.../text?...keyword=<palavra>...). Por isso mandamos o referer pronto pro backend
     serverless (/api/sogou), que roda em Node e PODE setar esse header manualmente, igual o curl faz.
     O backend precisa montar a chamada assim:
       fetch('https://fanyi.sogou.com/reventondc/suggV3',{method:'POST',headers:{
         'content-type':'application/x-www-form-urlencoded','referer':payload.referer,
         'origin':'https://fanyi.sogou.com','accept':'application/json'
       },body:payload.rawBody})
     Sem isso a rota direta do navegador e os proxies publicos sempre batem sem o referer certo, o que
     explica por que ideogramas isolados (regra anti-bot mais agressiva da Sogou p/ 1 caractere) falham
     com mais frequencia que palavras compostas. */
  const refererUrl='https://fanyi.sogou.com/text?fr=default&keyword='+encodeURIComponent(q)+'&transfrom=auto&transto=en&model=general';
  try{const payload={text:q,rawBody:form,referer:refererUrl};H46_log('sogou.backend.h46','request /api/sogou',{url:'/api/sogou',method:'POST',payload},'');const data=await H46_trySogouRoute('backend','/api/sogou',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},q);H46_storeSogou(q,data,'backend-h46');return data;}catch(e){failures.push({route:'backend',error:e.message||String(e)});}
 }
 const proxies=H46_customSogouProxies().concat(H46_SOGOU_PROXIES);
 for(const p of proxies){
  const postUrl=p.url(directUrl);try{H46_log('sogou.proxy.h46','request POST via proxy',{proxy:p.id,url:postUrl,body:form},'');const data=await H46_trySogouRoute('proxy-post-'+p.id,postUrl,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers,body:form},q);H46_storeSogou(q,data,'proxy-post-h46:'+p.id);return data;}catch(e){failures.push({route:'proxy-post:'+p.id,error:e.message||String(e)});H46_log('sogou.proxy.h46','POST proxy falhou',{proxy:p.id,error:e.message||String(e)},'error');}
  const getTarget=directUrl+'?'+form;const getUrl=p.url(getTarget);try{H46_log('sogou.proxy.h46','request GET via proxy',{proxy:p.id,url:getUrl,target:getTarget},'');const data=await H46_trySogouRoute('proxy-get-'+p.id,getUrl,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:{'Accept':'application/json,text/plain,*/*'}},q);H46_storeSogou(q,data,'proxy-get-h46:'+p.id);return data;}catch(e){failures.push({route:'proxy-get:'+p.id,error:e.message||String(e)});H46_log('sogou.proxy.h46','GET proxy falhou',{proxy:p.id,error:e.message||String(e)},'error');}
 }
 H46_log('sogou.proxy.h46','todas as rotas falharam',{query:q,failures},'error');try{if(window.H44_openDebug)window.H44_openDebug();}catch{}return H46_cacheSogou(q);
}
function H46_patchGlobals(){
 H46_css();H46_installVoiceUi();
 try{window.H46_fetchText=H46_fetchText;window.fetchText=H46_fetchText;fetchText=H46_fetchText;}catch{window.fetchText=H46_fetchText;}
 try{window.v38FetchText=H46_fetchText;v38FetchText=H46_fetchText;}catch{}
 try{window.v37Fetch=H46_fetchText;v37Fetch=H46_fetchText;}catch{}
 try{window.importURL=H46_importURL;importURL=H46_importURL;}catch{window.importURL=H46_importURL;}
 try{window.H46_sogouFetch=H46_sogouFetch;window.H45_sogouFetch=H46_sogouFetch;window.H44_sogouFetch=H46_sogouFetch;window.h42SogouFetch=H46_sogouFetch;if(typeof H45_sogouFetch!=='undefined')H45_sogouFetch=H46_sogouFetch;if(typeof H44_sogouFetch!=='undefined')H44_sogouFetch=H46_sogouFetch;if(typeof h42SogouFetch!=='undefined')h42SogouFetch=H46_sogouFetch;}catch{}
 try{window.H46_speak=H46_speak;window.h42Speak=H46_speak;window.h41SpeakText=H46_speak;window.h36Speak=async function(text){return H46_speak(text,H46_cjkCount(text)<=1?'char':'compound')};h36Speak=window.h36Speak;window.hr39SpeakWhole=window.h36Speak;}catch{}
 try{window.speakWordMode=async function(word,mode){return H46_speak(word,H46_cjkCount(word)<=1?'char':'compound')};window.speakWord=function(word){return window.speakWordMode(word,'natural')};speakWordMode=window.speakWordMode;speakWord=window.speakWord;}catch{}
 /* v4.8: nao reatribuir mais o onclick de #read-play aqui - o H48 e o unico dono do botao de leitura completa. */
 try{window.h42Settings=H46_getSettings;h42Settings=H46_getSettings;window.h42BuildSsml=H46_buildSsml;h42BuildSsml=H46_buildSsml;window.h42Endpoint=H46_endpoint;h42Endpoint=H46_endpoint;window.h42AudioFromSsml=H46_audioFromSsml;h42AudioFromSsml=H46_audioFromSsml;}catch{}
 try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H46_VERSION;}catch{}
 H46_log('v46.boot','patch final Edge TTS + fetch/proxy carregado',{version:H46_VERSION,textProxies:H46_TEXT_PROXIES.map(x=>x.id),sogouProxies:H46_SOGOU_PROXIES.map(x=>x.id)},'ok');
}
function H46_boot(){H46_patchGlobals();setTimeout(H46_patchGlobals,600);setTimeout(H46_patchGlobals,1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H46_boot);else H46_boot();
window.addEventListener('resize',()=>setTimeout(()=>{try{H46_css();}catch{}},50),{passive:true});
})();


/* ===== h48-extractor-sources-generate-selection-tts ===== */
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
function H48_splitText(text,maxLen=3800){
 text=H48_cleanText(text,'',{strictChinese:true});if(!text)return[];
 // Correção V3: não quebrar a leitura em cada vírgula/ponto. Para seleção
 // e capítulos curtos, mantém o trecho inteiro em uma única chamada de voz.
 // Só divide quando o texto ultrapassa um limite seguro de SSML, preferindo
 // quebras reais de parágrafo. A pontuação só é usada como último recurso
 // quando um parágrafo gigante passa do limite.
 if(text.length<=maxLen)return [text];
 const blocks=text.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
 const units=[];
 for(const b of blocks){
   if(b.length<=maxLen){units.push(b);continue;}
   let cur='';
   for(const ch of [...b]){
     cur+=ch;
     if(cur.length>=maxLen){
       // tenta recuar até uma pontuação terminal próxima, mas nunca até vírgula;
       // isso evita a leitura picotada dentro da estrofe.
       let cut=-1;
       const min=Math.floor(maxLen*0.72);
       for(let i=cur.length-1;i>=min;i--){if(/[。！？!?；;]/.test(cur[i])){cut=i+1;break;}}
       if(cut>0){units.push(cur.slice(0,cut).trim());cur=cur.slice(cut).trim();}
       else{units.push(cur.trim());cur='';}
     }
   }
   if(cur.trim())units.push(cur.trim());
 }
 const out=[];let cur='';
 for(const u of units){
   const sep=cur?'\n\n':'';
   if((cur+sep+u).length>maxLen&&cur){out.push(cur.trim());cur=u;}
   else cur+=sep+u;
 }
 if(cur.trim())out.push(cur.trim());
 return out;
}
async function H48_edgeBlobs(text,onProgress){
 text=H48_cleanText(text,'',{strictChinese:true});
 const chunks=H48_splitText(text,3900);if(!chunks.length)throw new Error('sem texto limpo para gerar');
 // Voz unificada: H48 não monta mais SSML próprio nem cai no fluxo H46/h42 antigo.
 // Ele usa o mesmo construtor emocional que a seleção, palavras, frases e dicionário.
 const build=window.hzEmotionBuildSsml||window.v36BuildSsmlAuto||window.h42BuildSsml||window.H46_buildSsml;
 const audio=window.hzEmotionAudioFromSsml||window.h42AudioFromSsml||window.H46_audioFromSsml;
 const settings=(window.v36GetSettings?window.v36GetSettings():(window.h42Settings?window.h42Settings():{}));
 if(typeof build!=='function'||typeof audio!=='function')throw new Error('motor emocional não expôs geração por SSML');
 const blobs=[];
 for(let i=0;i<chunks.length;i++){
   onProgress&&onProgress(i,chunks.length);
   const ssml=build(chunks[i],settings);
   blobs.push(await audio(ssml,settings));
   await new Promise(r=>setTimeout(r,10));
 }
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
 // Usa o mesmo texto bruto usado pelo mini-dock (#sel-read). Assim leitura simples
 // e livros alimentam o motor emocional com a MESMA string real do leitor, sem
 // pinyin, rt ou fragmentos visuais do DOM.
 try{const raw=(typeof v37RawSelectionSlice==='function')?v37RawSelectionSlice(sel):'';if(raw&&H48_cjkCount(raw)>=1)return H48_cleanText(raw,'',{strictChinese:true});}catch{}
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
 try{
   const localDiscover=window.hsrcRenderDiscoverLocal;
   const discoverFn=(typeof localDiscover==='function')?localDiscover:H48_renderDiscover;
   window.renderDiscover=discoverFn;renderDiscover=discoverFn;window.v38RenderDiscover=discoverFn;v38RenderDiscover=discoverFn;window.H48_renderDiscover=discoverFn;
   window.v37AddSource=H48_addSource;v37AddSource=H48_addSource;window.v38AddSource=H48_addSource;v38AddSource=H48_addSource;
 }catch{}
 const p=document.getElementById('read-play');if(p){p.onclick=H48_mainClick;p.title='Gerar áudio do texto completo com Edge TTS';p.dataset.h48='generate-first';}
 const sp=document.getElementById('read-speed');if(sp){sp.onclick=()=>H48_resetFull();sp.title='Descartar áudio gerado e gerar novamente';if(!sp.dataset.h48){sp.textContent='Texto limpo via ideogramas';sp.dataset.h48='status';}}
 H48_updateMainButton();try{(window.hsrcRenderDiscoverLocal||renderDiscover)();}catch{}
 try{const about=document.querySelector('#ss .ssub[style*="color:#8a8a8a"]');if(about)about.textContent=H48_VERSION;}catch{}
 H48_log('v48.boot','parser limpo + gerar áudio + seleção carregados',{version:H48_VERSION,sources:(window.V37_SOURCES||window.V32_SOURCES||[]).length,proxies:H48_TEXT_PROXIES.map(x=>x.id)},'ok');
}
function H48_installSelection(){/* v4.9: dock de seleção nativo (#selbar) assume esse papel; H48 não instala mais o seu próprio. */}
function H48_watchReader(){try{if(H48_mutObs)H48_mutObs.disconnect();const root=document.getElementById('rtext');if(!root)return;H48_mutObs=new MutationObserver(()=>H48_resetFull());H48_mutObs.observe(root,{childList:true,subtree:true});}catch{}}
function H48_boot(){H48_patchGlobals();H48_installSelection();H48_watchReader();setTimeout(()=>{H48_patchGlobals();H48_watchReader();},600);setTimeout(()=>{H48_patchGlobals();H48_watchReader();},1800);setTimeout(()=>{H48_patchGlobals();H48_watchReader();},3600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',H48_boot);else H48_boot();
})();


/* ===== v35-script ===== */
(function(){
'use strict';
      const PROXY_BASE = 'https://proxy.cors.sh/';
      const CORSPROXY_IO_BASE = 'https://corsproxy.io/';
      const JINA_READER_BASE = 'https://r.jina.ai/';
      const FETCH_TIMEOUT = 42000;
      const DIRECT_TIMEOUT = 2800;
      const HEDGE_DELAY = 1600;
      const AJAX_TIMEOUT = 16000;
      const CACHE_PREFIX = 'link-reader-cache:v6-clean:';
      const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
      const MAX_CACHE_CHARS = 300000;

      /*
       * Camada de conexão no modo compatível.
       * Ordem: proxy do usuário primeiro; corsproxy.io em formato oficial (?url=ENCODED);
       * depois proxies públicos de emergência. Não usamos extract/input/output/ttl aqui, porque
       * esses parâmetros podem exigir plano/API key e gerar 403.
       */
      const EXTRA_PROXY_ROUTES = [
        /* Ponte de leitura server-side: resolve o caso mostrado no print, onde o alvo responde 200 mas o navegador bloqueia por CORS. */
        { id: 'jina-reader', label: 'Jina Reader', delay: 950, timeout: 36000, kind: 'text', parser: 'jina', build: buildJinaReaderUrl },
        { id: 'jina-reader-alt-format', label: 'Jina Reader encoded', delay: 2300, timeout: 36000, kind: 'text', parser: 'jina', build: buildJinaReaderUrlEncoded },
        { id: 'corsproxy-io', label: 'corsproxy.io', delay: 4200, timeout: 30000, kind: 'arraybuffer', build: buildCorsProxyIoUrl },
        { id: 'corsproxy-io-html-accept', label: 'corsproxy.io accept html', delay: 6200, timeout: 30000, kind: 'arraybuffer', build: buildCorsProxyIoHtmlUrl },
        { id: 'allorigins-raw', label: 'AllOrigins raw', delay: 9200, timeout: 26000, kind: 'arraybuffer', build: url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url) },
        { id: 'allorigins-json', label: 'AllOrigins json', delay: 10200, timeout: 26000, kind: 'json-contents', build: url => 'https://api.allorigins.win/get?url=' + encodeURIComponent(url) },
        { id: 'codetabs', label: 'CodeTabs proxy', delay: 11600, timeout: 26000, kind: 'arraybuffer', build: url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url) }
      ];

      const $ = id => document.getElementById(id);
      const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','BUTTON','CODE','PRE','SVG','CANVAS','HEAD','MATH','OPTION','SELECT','IFRAME','VIDEO','AUDIO','PICTURE','IMG','OBJECT','EMBED']);
      const BLOCK_TAGS_R = new Set(['P','DIV','SECTION','ARTICLE','MAIN','ASIDE','LI','TD','TH','BLOCKQUOTE','FIGCAPTION','DT','DD','H1','H2','H3','H4','H5','H6','HEADER','FOOTER','NAV','TR','FORM']);

      const MAIN_SELECTORS = [
        'article','[role="main"]','main','section[itemprop="articleBody"]','[itemprop="articleBody"]',
        '.article-content','.post-content','.entry-content','.article-body','.post-body','.text-content',
        '.chapter-content','.chapter-body','.chapter_txt','.chaptertxt','.chapter-content-box','.chapter','.read-content','.readcotent','.readcontent',
        '.novel-content','.novel-body','.book-content','.booktext','#booktext','.booktext','#chaptercontent','#chapterContent','#content','#article','#main','#post',
        '.content-area','.main-content','.page-content','.content','#nr1','#htmlContent','#readercontent','#read_tpc'
      ];

      const NON_CONTENT_SELECTOR = [
        'script','style','template','iframe','svg','canvas','video','audio','picture','img','form','input','button','select','textarea','object','embed',
        'nav','footer','header','aside','[role="navigation"]','[role="banner"]','[role="complementary"]','[aria-hidden="true"]','[hidden]',
        '.nav','.navbar','.menu','.menubar','.top','.topbar','.header','.footer','.sidebar','.side-bar','.sidenav','.breadcrumb','.breadcrumbs',
        '.comment','.comments','.reply','.share','.shares','.related','.recommend','.recommendation','.ads','.ad','.advertisement','.banner','.cookie','.modal','.popup','.toolbar','.tool-bar',
        '.pagination','.pagebar','.pager','.login','.register','.search','.notice','.announcement','.qr','.app-download','.download-app'
      ].join(',');

      const NOISE_ATTR_RE = /(^|[-_\s])(nav|menu|header|footer|sidebar|side|bar|breadcrumb|crumb|comment|reply|share|related|recommend|ads?|advert|banner|cookie|modal|popup|toolbar|pager|pagination|login|register|search|notice|announcement|qrcode|download|copyright|chapterlist|bookrack)([-_\s]|$)/i;
      const CONTENT_HINT_RE = /(article|post|chapter|content|read|reader|novel|book|entry|text|main|body|story|section|page)/i;
      const HAN_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/g;
      const PUNC_RE = /[。！？.!?；;，,、：:“”‘’《》]/g;

      const NAV_KW = {
        next: ['next','next chapter','next page','下一章','下一页','下一話','下一节','次の章','siguiente capítulo','siguiente','suivant','weiter','successivo','다음','следующая','следующая глава','volgende','nästa','ileri','tiếp theo','lanjut','próximo','próximo capítulo','avanti','forward'],
        prev: ['prev','previous','previous chapter','previous page','上一章','上一页','前の章','capítulo anterior','anterior','précédent','zurück','precedente','이전','предыдущая','предыдущая глава','vorige','föregående','geri','trước','sebelumnya','capítulo anterior','indietro','back']
      };

      let currentUrl = '';
      let currentTitle = '';
      let readerNextHref = null;
      let readerPrevHref = null;
      let loadingToken = 0;

      const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;
      const TTS_SETTINGS_PREFIX = 'reader-tts:';
      const VOICES = [
        { name:'zh-CN-XiaoxiaoNeural', label:'晓晓 · Xiaoxiao — feminina expressiva', styles:['general','affectionate','angry','assistant','calm','chat','chat-casual','cheerful','customerservice','disgruntled','excited','fearful','friendly','gentle','lyrical','newscast','poetry-reading','sad','serious','sorry','whispering'] },
        { name:'zh-CN-XiaoyiNeural', label:'晓伊 · Xiaoyi — feminina doce', styles:['general','affectionate','angry','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'] },
        { name:'zh-CN-YunyangNeural', label:'云扬 · Yunyang — masculino narração/notícia', styles:['general','customerservice','narration-professional','newscast-casual'] },
        { name:'zh-CN-XiaochenNeural', label:'晓辰 · Xiaochen — feminina comercial', styles:['general','livecommercial','live-commercial'] },
        { name:'zh-CN-XiaohanNeural', label:'晓涵 · Xiaohan — feminina emocional', styles:['general','affectionate','angry','calm','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'] },
        { name:'zh-CN-XiaomengNeural', label:'晓梦 · Xiaomeng — feminina chat', styles:['general','chat'] },
        { name:'zh-CN-XiaomoNeural', label:'晓墨 · Xiaomo — feminina dramática', styles:['general','affectionate','angry','calm','cheerful','depressed','disgruntled','embarrassed','envious','fearful','gentle','sad','serious'] },
        { name:'zh-CN-XiaoruiNeural', label:'晓睿 · Xiaorui — feminina sóbria', styles:['general','angry','calm','fearful','sad'] },
        { name:'zh-CN-XiaoshuangNeural', label:'晓双 · Xiaoshuang — criança/chat', styles:['general','chat'] },
        { name:'zh-CN-XiaoxuanNeural', label:'晓萱 · Xiaoxuan — feminina', styles:['general'] },
        { name:'zh-CN-XiaoyanNeural', label:'晓颜 · Xiaoyan — feminina', styles:['general'] },
        { name:'zh-CN-XiaoyouNeural', label:'晓悠 · Xiaoyou — criança', styles:['general'] },
        { name:'zh-CN-XiaozhenNeural', label:'晓甄 · Xiaozhen — feminina formal', styles:['general','angry','cheerful','disgruntled','fearful','sad','serious'] },
        { name:'zh-CN-YunfengNeural', label:'云枫 · Yunfeng — masculino emocional', styles:['general','angry','cheerful','depressed','disgruntled','fearful','sad','serious'] },
        { name:'zh-CN-YunhaoNeural', label:'云皓 · Yunhao — masculino propaganda', styles:['general','advertisement-upbeat','advertisement_upbeat'] },
        { name:'zh-CN-YunxiaNeural', label:'云夏 · Yunxia — masculino emocional', styles:['general','angry','calm','cheerful','fearful','sad'] },
        { name:'zh-CN-YunyeNeural', label:'云野 · Yunye — masculino dramático', styles:['general','angry','calm','cheerful','disgruntled','embarrassed','fearful','sad','serious'] },
        { name:'zh-CN-YunzeNeural', label:'云泽 · Yunze — masculino idoso', styles:['general','angry','calm','cheerful','depressed','disgruntled','documentary-narration','fearful','sad','serious'] },
        { name:'zh-CN-XiaoxiaoMultilingualNeural', label:'晓晓 Multilingual — experimental', styles:['general','affectionate','cheerful','empathetic','excited','poetry-reading','sorry','story'] },
        { name:'zh-CN-XiaoyouMultilingualNeural', label:'晓悠 Multilingual — experimental', styles:['general','angry','chat','cheerful','cute','poetry-reading','sad','story'] },
        { name:'zh-CN-Bo:MAI-Voice-2', label:'Bo MAI Voice 2 — experimental', styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'] },
        { name:'zh-CN-Mei:MAI-Voice-2', label:'Mei MAI Voice 2 — experimental', styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'] },
        { name:'zh-CN-Lan:MAI-Voice-2', label:'Lan MAI Voice 2 — feminina alternativa', styles:['general','angry','confused','disgusted','embarrassed','excited','fearful','happy','joyful','sad','surprised'] },
        { name:'zh-CN-Wei:MAI-Voice-2', label:'Wei MAI Voice 2 — masculino alternativo', styles:['general','angry','confused','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','sad','surprised'] }
      ];
      const STYLE_LABELS = {
        general:'通用 / neutro', affectionate:'亲切 / carinhoso', angry:'生气 / bravo', assistant:'助手 / assistente', calm:'平静 / calmo', chat:'聊天 / conversa', 'chat-casual':'casual', cheerful:'开心 / alegre', customerservice:'客服 / atendimento', disgruntled:'不满 / descontente', excited:'兴奋 / animado', fearful:'害怕 / medo', friendly:'友好 / amigável', gentle:'温柔 / gentil', lyrical:'抒情 / lírico', newscast:'新闻 / jornal', 'newscast-casual':'notícia casual', 'narration-professional':'narração profissional', 'documentary-narration':'documentário', 'poetry-reading':'诗歌朗读 / poesia', sad:'伤心 / triste', serious:'严肃 / sério', sorry:'抱歉 / arrependido', whispering:'耳语 / sussurro', depressed:'低落 / deprimido', embarrassed:'尴尬 / constrangido', envious:'羡慕 / invejoso', livecommercial:'comercial ao vivo', 'live-commercial':'comercial ao vivo', 'advertisement-upbeat':'propaganda animada', advertisement_upbeat:'propaganda animada', cute:'fofo', story:'história', happy:'feliz', confused:'confuso', determined:'determinado', disgusted:'nojo', hopeful:'esperançoso', jealous:'ciumento', joyful:'alegria', regretful:'arrependido', relieved:'aliviado', shouting:'gritando', softvoice:'voz suave', surprised:'surpreso', empathetic:'empático'
      };
      // Vozes do modo expressivo. A análise emocional permanece a mesma; esta
      // tabela só escolhe a voz final. O perfil "regional" fica como padrão
      // porque as MAI Voice 2 preservam melhor o dinamismo emocional. O perfil
      // "neutral" usa vozes zh-CN neurais padrão para reduzir sotaque regional.
      const EXPRESSIVE_VOICES = [
        { name:'zh-CN-Mei:MAI-Voice-2', gender:'F', dialect:'regional', label:'Mei · feminina MAI mais expressiva', isDefault:true },
        { name:'zh-CN-Lan:MAI-Voice-2', gender:'F', dialect:'regional', label:'Lan · feminina MAI alternativa' },
        { name:'zh-CN-XiaomoNeural', gender:'F', dialect:'neutral', label:'Xiaomo · feminina emocional neutra', isDefault:true },
        { name:'zh-CN-XiaoxiaoNeural', gender:'F', dialect:'neutral', label:'Xiaoxiao · feminina narrativa neutra' },
        { name:'zh-CN-Bo:MAI-Voice-2', gender:'M', dialect:'regional', label:'Bo · masculino MAI mais expressivo', isDefault:true },
        { name:'zh-CN-Wei:MAI-Voice-2', gender:'M', dialect:'regional', label:'Wei · masculino MAI alternativo' },
        { name:'zh-CN-YunyeNeural', gender:'M', dialect:'neutral', label:'Yunye · masculino dramático neutro', isDefault:true },
        { name:'zh-CN-YunzeNeural', gender:'M', dialect:'neutral', label:'Yunze · masculino maduro neutro' }
      ];

      // Regras de detecção de sentimento por frase (sistema de peso: mais ocorrências/peso vencem).
      const EMOTION_RULES = [
        { id:'sad', label:'tristeza', styles:['sad','depressed','regretful','sorry','serious'], weight:5, priority:100, rate:-10, pitch:-4, volume:0, keywords:['遗憾','后悔','难过','伤心','悲伤','痛苦','心痛','失望','绝望','孤独','寂寞','哭','流泪','眼泪','泪','可惜','惋惜','遗恨','不舍','离别','分手','离开','失去','错过','怀念','想念','悲哀','悲痛','哀伤','哀愁','忧伤','忧愁','忧郁','低落','沮丧','郁闷','难受','心酸','酸楚','委屈','凄凉','凄惨','惨','苦','可怜','无助','无奈','生离死别','不幸','死亡','去世','逝去','再也','再见','永别','破碎','崩溃','沉默','叹气','唉','唉呀','可悲','悲剧','痛心','抱歉','对不起','歉意','亏欠','愧疚','内疚','悔恨','悔','悔意','遗憾的是','很遗憾'] },
        { id:'fearful', label:'medo', styles:['fearful','serious','sad'], weight:4, priority:92, rate:-5, pitch:+2, volume:0, keywords:['害怕','怕','恐怖','恐惧','惊恐','惊吓','吓','吓人','担心','担忧','忧虑','紧张','危险','危机','逃','快跑','救命','别过来','不要','小心','注意安全','可怕','不安','惊慌','慌张','心慌','胆小','发抖','颤抖','噩梦','怪物','鬼','恶魔','恐慌','害怕极了'] },
        { id:'angry', label:'raiva', styles:['angry','disgruntled','disgusted','serious'], weight:4, priority:88, rate:+2, pitch:+1, volume:+3, keywords:['生气','愤怒','怒','火大','气死','讨厌','恨','可恶','混蛋','滚','闭嘴','烦','烦死','厌烦','不满','抱怨','怨','责怪','怪你','指责','吵架','争吵','骂','恶心','反感','不爽','不服','忍不了','受够','够了','别烦我','气愤','怒火','暴怒','恼火','发火','臭','垃圾'] },
        { id:'disgusted', label:'nojo', styles:['disgusted','angry','disgruntled'], weight:4, priority:84, rate:-1, pitch:-1, volume:+1, keywords:['恶心','作呕','呕吐','恶臭','肮脏','脏死了','恶心死了','讨厌死了','恶心极了','令人作呕','反胃','恶劣','丑陋','下贱','卑鄙','龌龊','恶心透了','不堪入目','变态','恶人','恶行','丑恶'] },
        { id:'serious', label:'sério', styles:['serious','calm','newscast','narration-professional'], weight:3, priority:78, rate:-3, pitch:-2, volume:0, keywords:['必须','一定','应该','需要','重要','认真','严肃','决定','确定','责任','承诺','原则','规则','事实','真相','证明','结果','原因','问题','答案','计划','目标','任务','工作','学习','考试','注意','警告','告诉你','听着','记住','别忘了','从现在开始','现实','命运','人生','这一生','一生','永远','从来','绝不','不能','不要'] },
        { id:'surprised', label:'surpresa', styles:['surprised','excited','cheerful'], weight:3, priority:74, rate:+6, pitch:+4, volume:+1, keywords:['真的吗','真的假的','不会吧','天呐','我的天','哇','哇塞','惊讶','惊喜','意外','没想到','居然','竟然','突然','怎么会','我没听错吧','听错','不可能','太巧了','奇怪','好奇怪','神奇','奇迹','原来如此','啊','呀','咦','欸'] },
        { id:'excited', label:'empolgação', styles:['excited','cheerful','surprised'], weight:3, priority:66, rate:+9, pitch:+5, volume:+2, keywords:['冲','加油','快点','赶紧','马上','立刻','振奋','燃起来','激动人心','热血','冲啊','来吧','拼了','全力以赴','紧张刺激','热烈','沸腾','高潮','爆发','冲刺','冲锋','冲上去'] },
        { id:'cheerful', label:'alegria', styles:['cheerful','happy','joyful','excited','friendly'], weight:3, priority:60, rate:+7, pitch:+3, volume:+1, keywords:['开心','高兴','快乐','幸福','喜悦','欢乐','欢喜','愉快','兴奋','激动','喜欢','爱','可爱','太好了','真好','棒','厉害','成功','赢','胜利','庆祝','笑','微笑','哈哈','哈哈哈','呵呵','嘿嘿','甜','甜蜜','美好','幸运','满足','舒服','轻松','放心','祝福','欢迎','期待','希望','梦想','实现','赞','漂亮','完美','喜欢你','爱你','开心死了','乐','喜','悦','欣慰','好棒','棒极了'] },
        { id:'determined', label:'determinação', styles:['determined','serious','excited'], weight:3, priority:58, rate:+1, pitch:0, volume:+2, keywords:['一定要','必须做到','绝不放弃','拼到底','咬牙','坚定','决心','下定决心','义无反顾','不惜一切','排除万难','说到做到','不达目的','誓死','背水一战','孤注一掷','非做不可','全力以赴','咬紧牙关'] },
        { id:'hopeful', label:'esperança', styles:['hopeful','cheerful','gentle','calm'], weight:3, priority:56, rate:+2, pitch:+2, volume:0, keywords:['希望','愿望','梦想','期待','盼望','相信','一定会','会好的','未来','明天','机会','可能','也许','重新开始','加油','坚持','努力','勇气','光','阳光','温暖','前方','陪你','等你','回来','早去早回','一路平安','祝你','好运','成功','不要放弃','没关系','没事','放心','会过去','总有一天'] },
        { id:'calm', label:'calma/gentileza', styles:['calm','gentle','affectionate','friendly','softvoice'], weight:2, priority:48, rate:-4, pitch:0, volume:-1, keywords:['平静','安静','冷静','慢慢','温柔','轻轻','柔和','舒服','安慰','陪伴','关心','照顾','放心','没事','别怕','乖','亲爱','宝贝','谢谢','感谢','请','麻烦','可以吗','好吗','晚安','早安','休息','睡吧','月亮','风','雨','云','花','梦','温暖','拥抱','想你','陪你','珍惜','守护'] },
        { id:'embarrassed', label:'constrangimento', styles:['embarrassed','sorry','gentle'], weight:3, priority:44, rate:-3, pitch:+1, volume:-1, keywords:['尴尬','不好意思','害羞','脸红','羞','羞愧','丢脸','难为情','惭愧','抱歉','对不起','打扰','误会','算了','没什么','别看我','别说了','糟糕','完了','出丑','不好说','说错','听错'] },
        { id:'jealous', label:'inveja/ciúme', styles:['jealous','envious','disgruntled'], weight:3, priority:42, rate:0, pitch:-1, volume:0, keywords:['羡慕','嫉妒','吃醋','酸','凭什么','不公平','眼红','嫉恨','不甘心','比不上','抢走','属于我','别碰','讨厌你们','为什么是他','为什么不是我'] },
        { id:'relieved', label:'alívio', styles:['relieved','calm','cheerful'], weight:2, priority:38, rate:-1, pitch:+1, volume:0, keywords:['终于','总算','还好','幸好','放心了','松了一口气','没事了','安全了','过去了','结束了','解决了','好了','可以了','没关系','逃过','平安','安心','谢天谢地'] },
        { id:'confused', label:'confusão', styles:['confused','serious','calm'], weight:2, priority:34, rate:-1, pitch:+2, volume:0, keywords:['为什么','怎么','什么','哪里','谁','哪个','不知道','不明白','不懂','奇怪','迷茫','糊涂','困惑','疑惑','难道','到底','什么意思','怎么办','怎么回事','搞不懂','听不懂','看不懂'] }
      ];

      // Camada opcional do modo emoção avançada. Ela não altera o detector base:
      // só interpreta as palavras-chave já existentes e converte a intensidade
      // em parâmetros SSML de prosódia. Cada emoção tem um perfil padrão para
      // todas as palavras do dicionário e alguns gatilhos fortes que recebem
      // parâmetros próprios quando aparecem no fragmento.
      const ADVANCED_EMOTION_PROFILES = {
        sad: {
          base:{ degree:0.10, rate:-3, pitch:-7, range:-8, volume:-2 },
          keyword:{ rate:-0.7, pitch:-1.1, range:-0.9, volume:-0.2, degree:0.025 },
          hot:{ '绝望':{degree:0.20, rate:-5, pitch:-10, range:-12, volume:-3}, '痛苦':{degree:0.16, rate:-4, pitch:-9, range:-10, volume:-2}, '崩溃':{degree:0.18, rate:-5, pitch:-8, range:-13, volume:-2}, '眼泪':{degree:0.12, rate:-3, pitch:-7, range:-8, volume:-1}, '永别':{degree:0.18, rate:-6, pitch:-11, range:-14, volume:-3}, '遗憾':{degree:0.09, rate:-2, pitch:-5, range:-6, volume:-1} }
        },
        fearful: {
          base:{ degree:0.16, rate:+5, pitch:+10, range:+13, volume:+2 },
          keyword:{ rate:+0.9, pitch:+1.5, range:+1.6, volume:+0.4, degree:0.03 },
          hot:{ '救命':{degree:0.28, rate:+10, pitch:+18, range:+22, volume:+6}, '快跑':{degree:0.24, rate:+12, pitch:+14, range:+20, volume:+5}, '恐惧':{degree:0.18, rate:+6, pitch:+14, range:+18, volume:+3}, '发抖':{degree:0.14, rate:+4, pitch:+10, range:+16, volume:+2}, '害怕极了':{degree:0.24, rate:+8, pitch:+17, range:+22, volume:+4} }
        },
        angry: {
          base:{ degree:0.18, rate:+4, pitch:+9, range:+11, volume:+5 },
          keyword:{ rate:+0.8, pitch:+1.2, range:+1.2, volume:+0.9, degree:0.035 },
          hot:{ '愤怒':{degree:0.22, rate:+6, pitch:+13, range:+16, volume:+8}, '气死':{degree:0.24, rate:+7, pitch:+14, range:+17, volume:+9}, '滚':{degree:0.25, rate:+8, pitch:+16, range:+18, volume:+10}, '闭嘴':{degree:0.25, rate:+8, pitch:+15, range:+18, volume:+10}, '受够':{degree:0.20, rate:+5, pitch:+11, range:+14, volume:+7}, '混蛋':{degree:0.23, rate:+7, pitch:+14, range:+16, volume:+9} }
        },
        disgusted: {
          base:{ degree:0.14, rate:-2, pitch:-5, range:+5, volume:+3 },
          keyword:{ rate:-0.3, pitch:-0.8, range:+0.7, volume:+0.4, degree:0.025 },
          hot:{ '恶心':{degree:0.17, rate:-3, pitch:-8, range:+7, volume:+4}, '作呕':{degree:0.20, rate:-4, pitch:-9, range:+8, volume:+5}, '反胃':{degree:0.18, rate:-4, pitch:-8, range:+8, volume:+4}, '恶臭':{degree:0.19, rate:-3, pitch:-8, range:+9, volume:+4} }
        },
        serious: {
          base:{ degree:0.08, rate:-3, pitch:-4, range:-4, volume:+1 },
          keyword:{ rate:-0.4, pitch:-0.5, range:-0.4, volume:+0.2, degree:0.015 },
          hot:{ '必须':{degree:0.10, rate:-2, pitch:-4, range:-4, volume:+2}, '一定':{degree:0.08, rate:-2, pitch:-3, range:-3, volume:+1}, '警告':{degree:0.15, rate:-4, pitch:-5, range:-6, volume:+4}, '记住':{degree:0.12, rate:-3, pitch:-4, range:-5, volume:+3}, '绝不':{degree:0.14, rate:-3, pitch:-5, range:-5, volume:+3} }
        },
        surprised: {
          base:{ degree:0.16, rate:+6, pitch:+13, range:+18, volume:+3 },
          keyword:{ rate:+0.9, pitch:+1.7, range:+2.0, volume:+0.4, degree:0.03 },
          hot:{ '真的吗':{degree:0.18, rate:+6, pitch:+15, range:+20, volume:+3}, '我的天':{degree:0.22, rate:+8, pitch:+19, range:+24, volume:+5}, '哇':{degree:0.20, rate:+7, pitch:+18, range:+24, volume:+4}, '不会吧':{degree:0.18, rate:+6, pitch:+16, range:+21, volume:+3}, '我没听错吧':{degree:0.22, rate:+7, pitch:+19, range:+24, volume:+4} }
        },
        excited: {
          base:{ degree:0.20, rate:+9, pitch:+12, range:+16, volume:+5 },
          keyword:{ rate:+1.2, pitch:+1.4, range:+1.5, volume:+0.7, degree:0.035 },
          hot:{ '冲啊':{degree:0.26, rate:+13, pitch:+17, range:+22, volume:+8}, '燃起来':{degree:0.23, rate:+11, pitch:+15, range:+20, volume:+7}, '全力以赴':{degree:0.20, rate:+8, pitch:+12, range:+16, volume:+6}, '爆发':{degree:0.22, rate:+10, pitch:+14, range:+19, volume:+7} }
        },
        cheerful: {
          base:{ degree:0.13, rate:+5, pitch:+9, range:+12, volume:+3 },
          keyword:{ rate:+0.7, pitch:+1.0, range:+1.2, volume:+0.4, degree:0.025 },
          hot:{ '哈哈':{degree:0.17, rate:+7, pitch:+12, range:+15, volume:+4}, '太好了':{degree:0.18, rate:+7, pitch:+13, range:+16, volume:+5}, '幸福':{degree:0.12, rate:+4, pitch:+8, range:+11, volume:+2}, '爱你':{degree:0.14, rate:+3, pitch:+8, range:+10, volume:+2}, '棒极了':{degree:0.18, rate:+7, pitch:+13, range:+16, volume:+5} }
        },
        determined: {
          base:{ degree:0.15, rate:+2, pitch:+4, range:+8, volume:+4 },
          keyword:{ rate:+0.4, pitch:+0.7, range:+1.0, volume:+0.6, degree:0.03 },
          hot:{ '绝不放弃':{degree:0.22, rate:+4, pitch:+7, range:+12, volume:+7}, '拼到底':{degree:0.22, rate:+5, pitch:+8, range:+12, volume:+7}, '下定决心':{degree:0.16, rate:+3, pitch:+5, range:+9, volume:+5}, '全力以赴':{degree:0.18, rate:+4, pitch:+6, range:+10, volume:+6} }
        },
        hopeful: {
          base:{ degree:0.11, rate:+2, pitch:+7, range:+10, volume:+1 },
          keyword:{ rate:+0.4, pitch:+0.9, range:+1.0, volume:+0.25, degree:0.02 },
          hot:{ '希望':{degree:0.10, rate:+2, pitch:+7, range:+9, volume:+1}, '一定会':{degree:0.13, rate:+3, pitch:+8, range:+11, volume:+2}, '未来':{degree:0.10, rate:+2, pitch:+7, range:+10, volume:+1}, '不要放弃':{degree:0.16, rate:+3, pitch:+8, range:+12, volume:+3} }
        },
        calm: {
          base:{ degree:0.07, rate:-4, pitch:-2, range:-5, volume:-1 },
          keyword:{ rate:-0.5, pitch:-0.3, range:-0.5, volume:-0.1, degree:0.012 },
          hot:{ '温柔':{degree:0.09, rate:-4, pitch:-2, range:-6, volume:-1}, '慢慢':{degree:0.10, rate:-6, pitch:-2, range:-7, volume:-1}, '晚安':{degree:0.08, rate:-5, pitch:-3, range:-7, volume:-2}, '没事':{degree:0.08, rate:-4, pitch:-2, range:-5, volume:-1} }
        },
        embarrassed: {
          base:{ degree:0.10, rate:-3, pitch:+4, range:+5, volume:-1 },
          keyword:{ rate:-0.4, pitch:+0.8, range:+0.7, volume:-0.1, degree:0.02 },
          hot:{ '不好意思':{degree:0.14, rate:-4, pitch:+6, range:+8, volume:-2}, '尴尬':{degree:0.13, rate:-3, pitch:+6, range:+7, volume:-1}, '脸红':{degree:0.14, rate:-4, pitch:+7, range:+8, volume:-2}, '对不起':{degree:0.10, rate:-3, pitch:+3, range:+5, volume:-1} }
        },
        jealous: {
          base:{ degree:0.11, rate:0, pitch:-3, range:+5, volume:+1 },
          keyword:{ rate:+0.1, pitch:-0.5, range:+0.7, volume:+0.2, degree:0.02 },
          hot:{ '凭什么':{degree:0.16, rate:+2, pitch:-2, range:+7, volume:+4}, '不公平':{degree:0.15, rate:+1, pitch:-2, range:+7, volume:+3}, '吃醋':{degree:0.13, rate:0, pitch:-3, range:+5, volume:+2}, '抢走':{degree:0.17, rate:+2, pitch:-2, range:+8, volume:+4} }
        },
        relieved: {
          base:{ degree:0.08, rate:-1, pitch:+3, range:+5, volume:0 },
          keyword:{ rate:-0.2, pitch:+0.5, range:+0.5, volume:+0.1, degree:0.015 },
          hot:{ '终于':{degree:0.10, rate:-1, pitch:+4, range:+6, volume:+1}, '幸好':{degree:0.11, rate:-1, pitch:+5, range:+7, volume:+1}, '没事了':{degree:0.09, rate:-2, pitch:+3, range:+5, volume:0}, '松了一口气':{degree:0.12, rate:-2, pitch:+4, range:+6, volume:0} }
        },
        confused: {
          base:{ degree:0.09, rate:-1, pitch:+7, range:+9, volume:0 },
          keyword:{ rate:-0.1, pitch:+0.9, range:+1.0, volume:0, degree:0.018 },
          hot:{ '为什么':{degree:0.11, rate:-1, pitch:+8, range:+11, volume:0}, '到底':{degree:0.13, rate:0, pitch:+9, range:+12, volume:+1}, '什么意思':{degree:0.12, rate:-1, pitch:+8, range:+11, volume:0}, '怎么回事':{degree:0.13, rate:0, pitch:+9, range:+12, volume:+1} }
        },
        general: { base:{ degree:0, rate:0, pitch:0, range:0, volume:0 }, keyword:{ rate:0, pitch:0, range:0, volume:0, degree:0 }, hot:{} }
      };

      let tokenInfo = { endpoint:null, token:null, expiredAt:null };
      let selectedTtsText = '';
      let capturedTtsText = '';
      let selectionTimer = null;
      let selectionClearTimer = null;
      let ttsBusy = false;
      let lastTtsAudioUrl = null;

      const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const strip = s => String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/[ \t\f\v]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/[\u200b\u200c\u200d\ufeff]/g, '').trim();
      const compact = s => String(s == null ? '' : s).replace(/\s+/g, '').trim();
      const hasLetters = s => /[A-Za-zÀ-ÖØ-öø-ÿ\u0100-\uFFFF]/.test(s || '');
      const cjkCount = s => ((s || '').match(HAN_RE) || []).length;
      const punctuationCount = s => ((s || '').match(PUNC_RE) || []).length;
      const isCJKEdge = (a, b) => /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]$/.test(a || '') && /^[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(b || '');
      const URL_READER_JUNK_RE = /(?:https?:\/\/|www\.)[^\s<>()\[\]{}"'，。！？、；：]+/i;

      function stripReaderLinkJunk(text) {
        let s = String(text == null ? '' : text);
        if (!s) return '';
        s = s.replace(/!\[[^\]]*\]\((?:\\.|[^)])*\)/g, '');
        s = s.replace(/\[\s*\]\(\s*(?:https?:\/\/|www\.)[^)]*\)/ig, '');
        s = s.replace(/\[([^\]\n]{1,260})\]\(\s*(?:https?:\/\/|www\.)[^)]*\)/ig, '$1');
        s = s.replace(/^\s*\[[^\]]*\]:\s*(?:https?:\/\/|www\.)\S+.*$/gmi, '');
        s = s.replace(/(^|\n)\s*(?:\[\s*\]\s*)?[（(]?\s*(?:https?:\/\/|www\.)\S+(?:\s+["“][^"”]*["”])?\s*[）)]?\s*(?=\n|$)/ig, '$1');
        s = s.replace(/(^|[\s（(])(?:https?:\/\/|www\.)\S+/ig, '$1');
        // Restos de markdown com colchetes vazios e qualquer coisa dentro dos
        // parênteses (id de âncora, título entre aspas, etc.) — não só URLs.
        // É o que sobrava de coisas como [](#cite_note-1 "曾书书") depois que
        // a extração converte HTML pra Markdown de forma incompleta.
        s = s.replace(/\[\s*\]\([^)]*\)/g, '');
        s = s.replace(/\[\s*\]/g, '');
        s = s.replace(/[（(]\s*[）)]/g, '');
        return s;
      }

      function isLinkJunkOnly(text) {
        let t = strip(String(text == null ? '' : text));
        if (!t) return true;
        if (/^\[\s*\]$/.test(t)) return true;
        if (/^\s*(?:\[\s*\]\s*)?[（(]?\s*(?:https?:\/\/|www\.)\S+(?:\s+["“][^"”]*["”])?\s*[）)]?\s*$/i.test(t)) return true;
        const withoutLinks = compact(stripReaderLinkJunk(t).replace(/[\[\]()（）"'“”.,，。:：;；|｜·•*\-—_=+~～]/g, ''));
        return !withoutLinks;
      }

      function normalizeReaderText(text) {
        return strip(stripReaderLinkJunk(decodeEntities(String(text == null ? '' : text)))
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/^[>*+-]\s+/gm, '')
          .replace(/[ \t\f\v]+/g, ' ')
          .replace(/\n[ \t]+/g, '\n')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n'));
      }


      // setStatus original (dependia de statusEl, removido) — versão adaptada definida mais abaixo.

      function normalizeUrl(raw) {
        const val = String(raw || '').trim();
        if (!val) throw new Error('Cole um link primeiro.');
        const withProtocol = /^https?:\/\//i.test(val) ? val : 'https://' + val;
        const url = new URL(withProtocol);
        if (!/^https?:$/i.test(url.protocol)) throw new Error('Use um link HTTP ou HTTPS.');
        return url.href;
      }

      function proxify(url) { return PROXY_BASE + url; }
      function proxifyEncoded(url) { return PROXY_BASE + encodeURIComponent(url); }
      function proxifyParam(url) { return PROXY_BASE + '?url=' + encodeURIComponent(url); }
      function buildCorsProxyIoUrl(url) { return CORSPROXY_IO_BASE + '?url=' + encodeURIComponent(url); }
      function buildCorsProxyIoHtmlUrl(url) {
        return CORSPROXY_IO_BASE + '?url=' + encodeURIComponent(url) + '&reqHeaders=' + encodeURIComponent('accept:text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7');
      }
      function buildJinaReaderUrl(url) {
        return JINA_READER_BASE + String(url || '').replace(/#/g, '%23');
      }
      function buildJinaReaderUrlEncoded(url) {
        return JINA_READER_BASE + encodeURIComponent(String(url || ''));
      }
      function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

      function safeStorageGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
      }
      function safeStorageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (_) {}
      }

      function makeCacheKey(url) {
        return CACHE_PREFIX + btoa(unescape(encodeURIComponent(url))).replace(/=+$/g, '').slice(0, 180);
      }
      function readCache(url) {
        try {
          const raw = localStorage.getItem(makeCacheKey(url));
          if (!raw) return null;
          const cached = JSON.parse(raw);
          if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) {
            localStorage.removeItem(makeCacheKey(url));
            return null;
          }
          if (!cached.title || !Array.isArray(cached.blocks)) return null;
          return cached;
        } catch (_) { return null; }
      }
      function writeCache(url, payload) {
        try {
          const compactPayload = { title: payload.title, blocks: payload.blocks, nextHref: payload.nextHref, prevHref: payload.prevHref, url, routeName: payload.routeName || '', warning: payload.warning || null, savedAt: Date.now() };
          const raw = JSON.stringify(compactPayload);
          if (raw.length > MAX_CACHE_CHARS) return;
          localStorage.setItem(makeCacheKey(url), raw);
        } catch (_) {}
      }

      function alternateProtocolUrl(url) {
        try {
          const u = new URL(url);
          if (u.protocol === 'https:') u.protocol = 'http:';
          else if (u.protocol === 'http:') u.protocol = 'https:';
          else return null;
          return u.href === url ? null : u.href;
        } catch (_) { return null; }
      }

      function canTryDirect(url) {
        try {
          if (location.protocol === 'file:' || location.origin === 'null') return false;
          return new URL(url).origin === location.origin;
        } catch (_) { return false; }
      }

      function normalizeCharset(cs) {
        const c = String(cs || 'utf-8').trim().toLowerCase().replace(/["']/g, '');
        if (['gb2312','gbk','gb18030','hz-gb-2312'].includes(c)) return 'gb18030';
        if (['big5','big5-hkscs'].includes(c)) return 'big5';
        if (['shift_jis','shift-jis','sjis','x-sjis'].includes(c)) return 'shift_jis';
        if (['euc-jp'].includes(c)) return 'euc-jp';
        if (['euc-kr','ks_c_5601-1987'].includes(c)) return 'euc-kr';
        if (['utf8','utf-8'].includes(c)) return 'utf-8';
        return c || 'utf-8';
      }
      function detectCharset(buffer, response) {
        const contentType = response.headers.get('content-type') || '';
        const headerMatch = /charset\s*=\s*['"]?([^;'"\s]+)/i.exec(contentType);
        const fromHeader = headerMatch ? headerMatch[1] : '';
        const head = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 8192));
        const metaMatchA = /<meta[^>]+charset\s*=\s*['"]?([^\s'"\/>]+)/i.exec(head);
        const metaMatchB = /<meta[^>]+content\s*=\s*['"][^'"]*charset\s*=\s*([^\s'";>]+)/i.exec(head);
        const fromMeta = metaMatchA ? metaMatchA[1] : (metaMatchB ? metaMatchB[1] : '');
        return normalizeCharset(fromMeta || fromHeader || 'utf-8');
      }
      function decodeBuffer(buffer, response) {
        const charset = detectCharset(buffer, response);
        try { return new TextDecoder(charset, { fatal: false }).decode(buffer); }
        catch (_) { return new TextDecoder('utf-8', { fatal: false }).decode(buffer); }
      }

      function buildFetchRoutes(url, shortMode = false) {
        const alt = alternateProtocolUrl(url);
        const mainTimeout = shortMode ? AJAX_TIMEOUT : FETCH_TIMEOUT;
        const routes = [
          /* A rota principal volta a ser exatamente o proxy fornecido pelo usuário. */
          { id: 'cors-sh-raw', label: 'proxy.cors.sh', target: url, delay: 0, timeout: mainTimeout, kind: 'arraybuffer', build: proxify },

          /* Algumas URLs chinesas quebram quando query/string ou caracteres especiais passam no caminho puro. */
          { id: 'cors-sh-encoded', label: 'proxy.cors.sh encoded', target: url, delay: shortMode ? 500 : 900, timeout: mainTimeout, kind: 'arraybuffer', build: proxifyEncoded },
          { id: 'cors-sh-param', label: 'proxy.cors.sh url-param', target: url, delay: shortMode ? 900 : 1500, timeout: mainTimeout, kind: 'arraybuffer', build: proxifyParam }
        ];

        /* Rota direta só é útil em mesma origem. Em sites chineses ela aparece 200 no DevTools, mas o JS não pode ler o corpo sem CORS. */
        if (!shortMode && canTryDirect(url)) {
          routes.push({ id: 'direct', label: 'direto', target: url, delay: 250, timeout: DIRECT_TIMEOUT, kind: 'arraybuffer', silentError: true, build: u => u });
        }

        if (alt) {
          routes.push({ id: 'cors-sh-alt', label: 'proxy.cors.sh protocolo alternativo', target: alt, delay: shortMode ? 1200 : HEDGE_DELAY, timeout: mainTimeout, kind: 'arraybuffer', build: proxify });
          if (!shortMode) routes.push({ id: 'cors-sh-alt-encoded', label: 'proxy.cors.sh protocolo alternativo encoded', target: alt, delay: HEDGE_DELAY + 900, timeout: mainTimeout, kind: 'arraybuffer', build: proxifyEncoded });
        }

        if (!shortMode) {
          for (const route of EXTRA_PROXY_ROUTES) {
            routes.push({ ...route, target: url });
            if (alt) routes.push({ ...route, id: route.id + '-alt-protocol', label: route.label + ' protocolo alternativo', target: alt, delay: route.delay + 1200 });
          }
        }
        return routes;
      }

      function looksUsefulHtml(html) {
        const text = String(html || '');
        const plainLen = compact(text.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).length;
        return plainLen > 120 || /<(article|main|body|p|div|h1|h2)\b/i.test(text) || /<(rss|feed|item|entry)\b/i.test(text) || /articleBody|chapterContent|content_text/i.test(text);
      }

      async function readResponseByKind(resp, route) {
        if (route.kind === 'json-contents') {
          const data = await resp.json();
          return String((data && (data.contents || data.html || data.body || data.text)) || '');
        }
        if (route.kind === 'text') return await resp.text();
        const buffer = await resp.arrayBuffer();
        return decodeBuffer(buffer, resp);
      }

      async function fetchRoute(route, controller) {
        if (route.delay) await sleep(route.delay);
        if (controller.signal.aborted) throw new DOMException('Abortado', 'AbortError');
        const timer = setTimeout(() => controller.abort(), route.timeout);
        try {
          const fetchUrl = route.build(route.target);
          const opts = {
            method: 'GET',
            credentials: 'omit',
            redirect: 'follow',
            signal: controller.signal,
            cache: 'no-store'
          };
          /*
           * De propósito não enviamos headers customizados no fetch do navegador.
           * Alguns proxies respondem melhor sem preflight; quando precisamos sugerir Accept
           * ao upstream, fazemos isso pelo próprio parâmetro reqHeaders do corsproxy.io.
           */
          const resp = await fetch(fetchUrl, opts);
          if (!resp.ok) throw new Error(route.label + ' retornou HTTP ' + resp.status + '.');
          const html = await readResponseByKind(resp, route);
          if (!looksUsefulHtml(html)) throw new Error(route.label + ' respondeu sem texto suficiente.');
          return { html, routeName: route.label, finalUrl: route.target, contentType: resp.headers.get('content-type') || '', parser: route.parser || 'html' };
        } catch (err) {
          if (err && err.name === 'AbortError') throw err;
          const msg = err && err.message ? err.message : String(err);
          if (msg.indexOf(route.label) === 0) throw err;
          throw new Error(route.label + ': ' + msg);
        } finally { clearTimeout(timer); }
      }

      async function fetchHtmlFast(url, shortMode = false) {
        const routes = buildFetchRoutes(url, shortMode);
        const controllers = [];
        const errors = [];
        return new Promise((resolve, reject) => {
          let done = false;
          let finished = 0;
          const finishFail = () => {
            if (!done && finished >= routes.length) {
              const visible = errors.length ? errors.slice(0, 5).join(' | ') : 'Nenhuma rota conseguiu carregar a página.';
              reject(new Error(visible));
            }
          };
          for (const route of routes) {
            const controller = new AbortController();
            controllers.push(controller);
            fetchRoute(route, controller).then(result => {
              if (done) return;
              done = true;
              controllers.forEach(c => { if (c !== controller) c.abort(); });
              resolve(result);
            }).catch(err => {
              finished++;
              if (!done && route && !route.silentError) {
                const msg = (err && err.name === 'AbortError') ? (route.label + ' demorou demais.') : ((err && err.message) || String(err));
                errors.push(msg);
              }
              finishFail();
            });
          }
        });
      }

      function htmlToText(html) {
        const text = String(html || '')
          .replace(/<\s*br\s*\/?\s*>/gi, '\n')
          .replace(/<\/(p|div|section|article|main|li|h[1-6]|blockquote|td|tr)>/gi, '\n')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ');
        return decodeEntities(strip(text.replace(/\n{3,}/g, '\n\n')));
      }

      function decodeEntities(text) {
        const el = document.createElement('textarea');
        el.innerHTML = String(text || '');
        return el.value;
      }

      function prepareDocument(html, url) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let base = doc.querySelector('base');
        if (!base) {
          base = doc.createElement('base');
          (doc.head || doc.documentElement).prepend(base);
        }
        base.href = url;
        hardCleanDocument(doc);
        return doc;
      }

      function hardCleanDocument(doc) {
        doc.querySelectorAll(NON_CONTENT_SELECTOR).forEach(el => el.remove());
        doc.querySelectorAll('[class],[id],[role]').forEach(el => {
          const sig = `${el.id || ''} ${el.className || ''} ${el.getAttribute('role') || ''}`;
          if (NOISE_ATTR_RE.test(sig) && !CONTENT_HINT_RE.test(sig)) el.remove();
        });
        doc.querySelectorAll('a').forEach(a => {
          const t = nodeText(a);
          const href = a.getAttribute('href') || '';
          if (!t || /^javascript:/i.test(href) || href === '#') a.remove();
        });
      }

      function nodeText(el) { return strip((el && (el.innerText || el.textContent)) || ''); }
      function linkDensity(el, textLen = null) {
        const len = textLen == null ? compact(nodeText(el)).length : textLen;
        if (!len) return 1;
        const linkLen = Array.from(el.querySelectorAll('a')).reduce((s, a) => s + compact(nodeText(a)).length, 0);
        return Math.min(1, linkLen / len);
      }
      function attrSig(el) {
        if (!el) return '';
        const cls = typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal ? el.className.baseVal : '');
        const role = el.getAttribute ? (el.getAttribute('role') || '') : '';
        return `${el.tagName || ''} ${el.id || ''} ${cls || ''} ${role}`;
      }

      function scoreCandidate(el) {
        const text = nodeText(el);
        const len = compact(text).length;
        if (len < 80) return -Infinity;
        const ld = linkDensity(el, len);
        if (ld > 0.62 && len < 2500) return -Infinity;
        const sig = attrSig(el);
        const pCount = el.querySelectorAll('p,br,blockquote,div,section').length;
        const headings = el.querySelectorAll('h1,h2,h3').length;
        const punct = punctuationCount(text);
        const han = cjkCount(text);
        const avgTextChunk = len / Math.max(1, pCount);
        const contentHint = CONTENT_HINT_RE.test(sig) ? 520 : 0;
        const noisePenalty = NOISE_ATTR_RE.test(sig) ? 1400 : 0;
        const linkPenalty = ld * len * 1.9;
        const menuWordPenalty = menuScore(text) * 55;
        const proseBonus = Math.min(900, punct * 12 + han * 0.32 + Math.max(0, avgTextChunk - 18) * 2);
        return len + pCount * 34 + headings * 30 + contentHint + proseBonus - linkPenalty - noisePenalty - menuWordPenalty;
      }

      function findMainContent(doc) {
        const candidates = [];
        for (const sel of MAIN_SELECTORS) {
          try { doc.querySelectorAll(sel).forEach(el => candidates.push(el)); } catch (_) {}
        }
        let best = null, bestScore = -Infinity;
        for (const el of candidates) {
          const score = scoreCandidate(el) + 260;
          if (score > bestScore) { bestScore = score; best = el; }
        }
        for (const el of doc.querySelectorAll('article,main,section,div,td,body')) {
          const score = scoreCandidate(el);
          if (score > bestScore) { bestScore = score; best = el; }
        }
        return best || doc.body;
      }

      function makeWalker(doc, root, extraSkip) {
        return doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            if (extraSkip && p.closest(extraSkip)) return NodeFilter.FILTER_REJECT;
            if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
            if (p.closest('[translate="no"],nav,footer,header,aside,[role="navigation"],[role="banner"],[role="complementary"],.nav,.navbar,.menu,.footer,.header,.sidebar,.comments,.comment,.share,.related,.recommend,.ads,.ad,.breadcrumb,.pager,.pagination,.login,.register,.search,.notice,.announcement')) return NodeFilter.FILTER_REJECT;
            const sig = attrSig(p);
            if (NOISE_ATTR_RE.test(sig) && !CONTENT_HINT_RE.test(sig)) return NodeFilter.FILTER_REJECT;
            const text = strip(node.textContent);
            if (!text || !hasLetters(text)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
      }

      function getClosestBlock(node) {
        let el = node.parentElement;
        while (el) { if (BLOCK_TAGS_R.has(el.tagName)) return el; el = el.parentElement; }
        return node.parentElement || node;
      }
      function joinParts(parts) {
        let out = '';
        for (const part of parts.map(strip).filter(Boolean)) {
          if (!out) out = part;
          else out += isCJKEdge(out, part) ? part : ' ' + part;
        }
        return strip(out);
      }
      function textWithBreaks(root) {
        const out = [];
        const blockTags = new Set(['P','DIV','SECTION','ARTICLE','MAIN','LI','TD','TH','BLOCKQUOTE','FIGCAPTION','DT','DD','H1','H2','H3','H4','H5','H6']);
        const walk = node => {
          if (node.nodeType === Node.TEXT_NODE) { out.push(node.textContent || ''); return; }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node, tag = el.tagName;
          if (SKIP_TAGS.has(tag)) return;
          if (el.closest && el !== root && el.closest('nav,footer,header,aside,[role="navigation"],[role="banner"],[role="complementary"],.nav,.navbar,.menu,.footer,.header,.sidebar,.comments,.comment,.share,.related,.recommend,.ads,.ad,.breadcrumb,.pager,.pagination')) return;
          const sig = attrSig(el);
          if (el !== root && NOISE_ATTR_RE.test(sig) && !CONTENT_HINT_RE.test(sig)) return;
          if (tag === 'BR') { out.push('\n'); return; }
          const isBlock = blockTags.has(tag);
          if (isBlock && out.length && !/\n$/.test(out[out.length - 1])) out.push('\n');
          for (const child of el.childNodes) walk(child);
          if (isBlock) out.push('\n');
        };
        walk(root);
        return strip(out.join('').replace(/\n{3,}/g, '\n\n'));
      }
      function preserveBlockText(el, fallback) {
        const raw = textWithBreaks(el);
        if (!raw || !raw.includes('\n')) return fallback;
        const a = compact(raw).length, b = compact(fallback).length;
        if (Math.abs(a - b) < (b * 0.20 + 12)) return raw;
        return fallback;
      }

      function menuScore(text) {
        const t = strip(text).toLowerCase();
        const hits = [
          '首页','目录','书架','排行榜','登录','注册','搜索','上一章','下一章','返回','分享','评论','报错','加入书签','最新网址','阅读记录','客户端','手机阅读','投票','推荐票','月票',
          'home','menu','login','register','search','share','comment','previous','next','copyright','all rights reserved'
        ].reduce((n, kw) => n + (t.includes(kw.toLowerCase()) ? 1 : 0), 0);
        return hits;
      }
      function isProseLike(text) {
        const t = strip(text), len = compact(t).length;
        if (len >= 80) return true;
        if (cjkCount(t) >= 28 && punctuationCount(t) >= 1) return true;
        if (len >= 45 && punctuationCount(t) >= 2) return true;
        return false;
      }
      /* Frases de "placeholder" usadas por templates de romance chinês (笔趣阁-clones e afins)
       * quando o texto real ainda não foi injetado por JS (ex.: lenglengbb.com e sites do mesmo
       * template "RBGsectionThree"). Ficam entre a prévia real e o rodapé, então precisam ser
       * removidas explicitamente para não aparecerem misturadas ao capítulo. */
      const LOADING_PLACEHOLDER_RE = [
        /^loading\.{2,}$/i,
        /未加载完/, /退出阅读模式/, /关闭广告屏蔽/,
        /更换.*(firefox|edge).*浏览器/i,
        /移动流量偶尔打不开/, /切换电信.*联通.*wifi/i,
        /^收藏网址[:：]/, /^\(?[＞>]人[＜<][;；]?\)?$/,
        /^-{2,}\s*正文\s*-{2,}$/
      ];
      const isLoadingPlaceholder = t => LOADING_PLACEHOLDER_RE.some(re => re.test(t));

      function isBoilerplate(text, tag = 'p', el = null) {
        const t = strip(text);
        if (!t) return true;
        if (isLinkJunkOnly(t)) return true;
        if (isLoadingPlaceholder(t)) return true;
        const len = compact(t).length;
        if (!/^h[1-6]$/i.test(tag) && len < 8) return true;
        if (/^(copyright|©|all rights reserved|login|sign in|menu|home|search|share|comments?|previous|next|首页|目录|书架|上一章|下一章|返回|分享|评论|发表评论|登录|注册|搜索|报错|加入书签|最新网址|手机阅读|客户端|投票推荐|推荐票|月票)$/i.test(t)) return true;
        if (/^[（(]?\s*(https?:\/\/|www\.)/i.test(t) && len < 160) return true;
        if (URL_READER_JUNK_RE.test(t) && compact(stripReaderLinkJunk(t)).length < 18) return true;
        if (menuScore(t) >= 3 && len < 220) return true;
        if (el && linkDensity(el) > 0.52 && len < 600) return true;
        /* CORREÇÃO: a versão antiga usava /^[\s\W\d_]+$/u, mas \W no JS só exclui letras
         * ASCII — então QUALQUER parágrafo 100% em chinês/CJK (sem nenhuma letra latina ou
         * dígito) batia nessa regex e era descartado como "lixo", mesmo sendo texto real.
         * hasLetters() já reconhece letras de qualquer script (inclusive CJK via \u0100-\uFFFF),
         * então usamos ela para manter só linhas puramente decorativas (----, ***, ......, etc). */
        if (!hasLetters(t) && !cjkCount(t)) return true;
        return false;
      }

      function extractReadableBlocks(doc, root) {
        const walker = makeWalker(doc, root, 'nav,footer,header,aside,[role="navigation"],[role="banner"],[role="complementary"]');
        const blockMap = new Map();
        const blockOrder = [];
        let n;
        while ((n = walker.nextNode())) {
          const blk = getClosestBlock(n);
          if (!blockMap.has(blk)) { blockMap.set(blk, []); blockOrder.push(blk); }
          blockMap.get(blk).push(n.textContent);
        }
        const blocks = [];
        const seen = new Set();
        for (const el of blockOrder) {
          const parts = blockMap.get(el) || [];
          let combined = joinParts(parts);
          if (!combined) continue;
          const originalTag = /^H[1-6]$/.test(el.tagName) ? el.tagName.toLowerCase() : (el.tagName === 'BLOCKQUOTE' ? 'blockquote' : 'p');
          let finalStr = preserveBlockText(el, combined);
          const paragraphs = originalTag === 'p' || originalTag === 'blockquote' ? finalStr.split(/\n{2,}/) : [finalStr];
          for (const paragraph of paragraphs) {
            let text = cleanParagraphText(paragraph);
            if (!text) continue;
            const tag = originalTag;
            const key = compact(text).slice(0, 900);
            if (!key || seen.has(key) || isBoilerplate(text, tag, el)) continue;
            seen.add(key);
            blocks.push({ tag, text, score: blockTextScore(text, tag) });
          }
        }
        return trimBoilerplateBlocks(blocks).map(({ tag, text }) => ({ tag, text }));
      }

      function cleanParagraphText(text) {
        return normalizeReaderText(String(text || '')
          .replace(/^[\s\u3000|｜·•*\-—_=+~～:：,，.。]+/g, '')
          .replace(/[\s\u3000|｜·•*\-—_=+~～]+$/g, '')
          .replace(/\n{3,}/g, '\n\n'));
      }
      function blockTextScore(text, tag) {
        const len = compact(text).length;
        const punct = punctuationCount(text);
        const han = cjkCount(text);
        let s = len + punct * 16 + han * 0.45;
        if (/^h[1-6]$/i.test(tag)) s -= 120;
        if (isProseLike(text)) s += 180;
        if (menuScore(text)) s -= menuScore(text) * 80;
        return s;
      }
      function trimBoilerplateBlocks(blocks) {
        if (!blocks.length) return blocks;
        const good = blocks.map(b => isProseLike(b.text) && !isBoilerplate(b.text, b.tag));
        let start = good.findIndex(Boolean);
        if (start < 0) start = 0;
        let end = good.length - 1;
        while (end > start && !good[end]) end--;
        let sliced = blocks.slice(start, end + 1);
        sliced = sliced.filter((b, i) => {
          const len = compact(b.text).length;
          if (isBoilerplate(b.text, b.tag)) return false;
          if (i < 4 && !isProseLike(b.text) && menuScore(b.text) > 0) return false;
          if (i > sliced.length - 6 && !isProseLike(b.text) && menuScore(b.text) > 0) return false;
          if (!/^h[1-6]$/i.test(b.tag) && len < 16 && !/[。！？.!?]/.test(b.text)) return false;
          return true;
        });
        return sliced;
      }
      function blocksStrength(blocks) {
        if (!Array.isArray(blocks) || !blocks.length) return 0;
        const total = blocks.reduce((s, b) => s + compact(b.text).length, 0);
        const prose = blocks.filter(b => isProseLike(b.text)).length;
        const noise = blocks.reduce((s, b) => s + menuScore(b.text), 0);
        return total + prose * 220 - noise * 90;
      }

      function getTitle(doc, mainEl, url) {
        const h1 = mainEl.querySelector('h1') || doc.querySelector('h1');
        const ogEl = doc.querySelector('meta[property="og:title"],meta[name="twitter:title"]');
        const og = ogEl ? ogEl.getAttribute('content') : '';
        const title = strip(h1 ? nodeText(h1) : (og || doc.title || url));
        return title.replace(/\s+[|_-]\s+.*$/, '').replace(/最新章节.*$/i, '').trim() || url;
      }

      function findNavLink(doc, type, baseUrl) {
        const rel = doc.querySelector(`a[rel~="${type === 'next' ? 'next' : 'prev'}"]`);
        if (rel && rel.getAttribute('href')) return resolveHref(rel.getAttribute('href'), baseUrl);
        const keywords = NAV_KW[type];
        const links = Array.from(doc.querySelectorAll('a[href]')).filter(a => {
          const href = a.getAttribute('href') || '';
          return href && href !== '#' && !/^javascript:/i.test(href);
        });
        for (const a of links) {
          const box = [nodeText(a), a.getAttribute('aria-label'), a.getAttribute('title'), a.className, a.id].join(' ').toLowerCase();
          if (keywords.some(k => box.includes(k))) return resolveHref(a.getAttribute('href'), baseUrl);
        }
        return null;
      }
      function resolveHref(href, baseUrl) { try { return new URL(href, baseUrl).href; } catch (_) { return null; } }

      function blocksFromPlainText(text, title = '') {
        const lines = String(text || '').split(/\n+/).map(cleanParagraphText).filter(Boolean);
        const merged = [];
        let buf = '';
        for (const line of lines) {
          if (isBoilerplate(line)) continue;
          const isHeading = compact(line).length < 42 && !/[。！？.!?]/.test(line) && menuScore(line) === 0;
          if (isHeading && buf) { merged.push(buf); buf = ''; merged.push(line); continue; }
          if (!buf) buf = line;
          else if (compact(buf).length < 45 && !/[。！？.!?]$/.test(buf)) buf += isCJKEdge(buf, line) ? line : ' ' + line;
          else { merged.push(buf); buf = line; }
        }
        if (buf) merged.push(buf);
        const blocks = merged.map((text, i) => {
          const tag = (i < 2 && compact(text).length < 50 && !/[。！？.!?]/.test(text)) ? 'h2' : 'p';
          return { tag, text, score: blockTextScore(text, tag) };
        }).filter(b => compact(b.text) !== compact(title));
        return trimBoilerplateBlocks(blocks).map(({ tag, text }) => ({ tag, text }));
      }

      function extractFromJsonLd(doc) {
        const blocks = [];
        for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
          try {
            const data = JSON.parse(s.textContent.trim());
            const arr = Array.isArray(data) ? data : [data];
            for (const sourceItem of arr) {
              const flatItems = flattenGraph(sourceItem);
              for (const item of flatItems) {
              const body = item && (item.articleBody || item.text || item.description);
              if (body && compact(body).length > 120) blocks.push(...blocksFromPlainText(htmlToText(body)));
              }
            }
          } catch (_) {}
        }
        return blocks;
      }
      function flattenGraph(obj) {
        if (!obj || typeof obj !== 'object') return [];
        const out = [obj];
        if (Array.isArray(obj['@graph'])) out.push(...obj['@graph']);
        return out;
      }

      function safeJsonString(s) {
        try { return JSON.parse('"' + s.replace(/"/g, '\"') + '"'); }
        catch (_) { return s.replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\t/g, ' ').replace(/\\\//g, '/').replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))); }
      }
      function extractFromEmbeddedState(rawHtml) {
        const out = [];
        const scripts = [];
        const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let sm;
        while ((sm = scriptRe.exec(String(rawHtml || '')))) scripts.push(sm[1]);
        const keyRe = /["'](?:articleBody|chapterContent|chapter_content|contentText|content_text|pageContent|bookContent|body|content|text|html)["']\s*:\s*["']((?:\\.|(?!["']).){180,})["']/gi;
        for (const script of scripts) {
          let m;
          while ((m = keyRe.exec(script))) {
            const decoded = htmlToText(safeJsonString(m[1]));
            if (compact(decoded).length > 140 && menuScore(decoded) < 4) out.push(...blocksFromPlainText(decoded));
          }
        }
        return out;
      }
      function extractFromRSSOrAtom(rawHtml, doc) {
        const isFeed = /<(rss|feed|item|entry)\b/i.test(rawHtml || '') || doc.querySelector('rss,feed,item,entry');
        if (!isFeed) return [];
        const chunks = [];
        const re = /<(?:content:encoded|description|summary|content)[^>]*>([\s\S]*?)<\/(?:content:encoded|description|summary|content)>/gi;
        let m;
        while ((m = re.exec(rawHtml))) chunks.push(m[1].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, ''));
        return blocksFromPlainText(htmlToText(chunks.join('\n\n')));
      }
      function extractFromPlainHtml(rawHtml) {
        return blocksFromPlainText(htmlToText(rawHtml));
      }

      function discoverAjaxCandidates(rawHtml, doc, baseUrl) {
        const found = new Set();
        const add = value => {
          if (!value) return;
          const v = decodeEntities(String(value).trim()).replace(/\\\//g, '/');
          if (!v || v.length > 240 || /^(#|javascript:|data:|mailto:)/i.test(v)) return;
          if (/\.(png|jpe?g|gif|webp|svg|css|woff2?|ttf|ico|mp4|mp3)(\?|$)/i.test(v)) return;
          const hint = /(ajax|api|chapter|content|read|reader|book|novel|txt|json|page|article)/i.test(v);
          if (!hint) return;
          const url = resolveHref(v, baseUrl);
          if (url && new URL(url).origin === new URL(baseUrl).origin) found.add(url);
        };
        doc.querySelectorAll('[data-url],[data-href],[data-src],a[href]').forEach(el => add(el.getAttribute('data-url') || el.getAttribute('data-href') || el.getAttribute('data-src') || el.getAttribute('href')));
        const srcRe = /(?:url|href|src|api|contentUrl|chapterUrl)\s*[:=]\s*["']([^"']{2,240})["']/gi;
        let m;
        while ((m = srcRe.exec(rawHtml || ''))) add(m[1]);
        return Array.from(found).filter(u => u !== baseUrl).slice(0, 4);
      }

      /* Detecta o padrão de "DRM" client-side usado por vários templates de sites de romance
       * chinês (o mesmo template desse chapter da lenglengbb.com usa a classe
       * "RBGsectionThree-content"): o HTML estático só traz uma prévia + um aviso falso de
       * "carregando"; o texto completo real fica criptografado (normalmente AES via CryptoJS,
       * chave derivada de MD5) dentro de um <script>, e só é decodificado e injetado no DOM
       * via `algumId.html(d("blob_base64..."))` depois de checar dispositivo/user-agent/horário.
       * Isso é fundamentalmente impossível de recuperar buscando o HTML puro (via proxy CORS ou
       * mesmo via leitores que renderizam JS de forma genérica como o Jina Reader), porque a
       * chave de decodificação normalmente está em outro arquivo JS do site e o gatilho depende
       * de fingerprint de navegador real. Quando detectamos isso, mostramos um aviso claro em vez
       * de deixar o usuário achar que o leitor "comeu" parte do capítulo. */
      function detectClientSideCipherGate(rawHtml) {
        const html = String(rawHtml || '');
        const signals = [];
        if (/CryptoJS\.AES\.decrypt/i.test(html)) signals.push('AES (CryptoJS) embutido no HTML');
        if (/\.html\(\s*[a-zA-Z_$][\w$]*\(\s*["'][A-Za-z0-9+/=]{60,}["']\s*\)\s*\)/.test(html)) signals.push('troca de conteúdo por função decodificadora (ex.: .html(d("...")))');
        if (/eval\(function\(p,a,c,k,e,[dr]\)/i.test(html)) signals.push('packer de JavaScript (eval/p,a,c,k,e,d)');
        if (/isDesktopPlatform|isSpecialUserAgent|isNightTime/i.test(html) && /\.html\(/i.test(html)) {
          signals.push('injeção de conteúdo condicionada a dispositivo/user-agent/horário (anti-scraping)');
        }
        return signals;
      }

      async function extractFallbacks(rawHtml, doc, baseUrl, currentBlocks) {
        const candidates = [];
        const add = (name, blocks) => { if (blocks && blocks.length) candidates.push({ name, blocks, strength: blocksStrength(blocks) }); };
        add('json-ld', extractFromJsonLd(doc));
        add('estado embutido', extractFromEmbeddedState(rawHtml));
        add('rss/atom', extractFromRSSOrAtom(rawHtml, doc));
        add('texto plano', extractFromPlainHtml(rawHtml));

        const currentStrength = blocksStrength(currentBlocks);
        if (currentStrength < 850) {
          const endpoints = discoverAjaxCandidates(rawHtml, doc, baseUrl).slice(0, 3);
          if (endpoints.length) {
            setStatus('Conteúdo fraco; testando fallbacks Ajax/JSON detectados...', 'work');
            const loaded = await Promise.allSettled(endpoints.map(async endpoint => {
              const { html } = await fetchHtmlFast(endpoint, true);
              const endpointDoc = prepareDocument(html, endpoint);
              const root = findMainContent(endpointDoc);
              let blocks = extractReadableBlocks(endpointDoc, root);
              if (blocksStrength(blocks) < 500) blocks = extractFromEmbeddedState(html).concat(extractFromPlainHtml(html));
              return { endpoint, blocks: trimBoilerplateBlocks(blocks.map(b => ({ ...b, score: blockTextScore(b.text, b.tag) }))).map(({ tag, text }) => ({ tag, text })) };
            }));
            for (const r of loaded) if (r.status === 'fulfilled') add('ajax/json', r.value.blocks);
          }
        }
        candidates.sort((a, b) => b.strength - a.strength);
        return candidates[0] && candidates[0].strength > currentStrength * 1.12 ? candidates[0] : null;
      }


      function cleanMarkdownLine(line) {
        let raw = String(line || '');
        const wasHeading = /^#{1,6}\s+/.test(raw);
        raw = stripReaderLinkJunk(raw)
          .replace(/^#{1,6}\s+/, '')
          .replace(/^[-*+]\s+/, '')
          .replace(/^>\s?/, '');
        return { text: cleanParagraphText(raw), wasHeading };
      }

      function parseJinaTitle(lines, fallbackUrl) {
        for (const line of lines) {
          const m = /^Title:\s*(.+)$/i.exec(line);
          if (m && strip(m[1])) return strip(m[1]).replace(/\s+[|_-]\s+.*$/, '');
        }
        for (const line of lines) {
          const m = /^#\s+(.+)$/i.exec(line);
          if (m && strip(m[1])) return strip(m[1]).replace(/\s+[|_-]\s+.*$/, '');
        }
        try { return new URL(fallbackUrl).hostname; } catch (_) { return fallbackUrl || 'Leitura'; }
      }

      function findNavFromMarkdown(raw, type, baseUrl) {
        const keywords = NAV_KW[type];
        const re = /\[([^\]]{1,80})\]\((https?:\/\/[^)]+|[^)]+)\)/g;
        let m;
        while ((m = re.exec(String(raw || '')))) {
          const text = strip(m[1]).toLowerCase();
          if (!text) continue;
          if (keywords.some(k => text.includes(k))) return resolveHref(m[2], baseUrl);
        }
        return null;
      }

      function parseJinaReaderPayload(raw, url, routeName) {
        const normalized = String(raw || '').replace(/\r/g, '');
        const allLines = normalized.split('\n').map(line => strip(line)).filter(Boolean);
        const title = parseJinaTitle(allLines, url);
        let start = allLines.findIndex(line => /^Markdown Content:/i.test(line));
        if (start < 0) start = allLines.findIndex(line => /^#\s+/.test(line));
        const contentLines = allLines.slice(start >= 0 ? start + 1 : 0);
        const blocks = [];
        let buf = '';
        let linkDumpMode = false;
        function flush() {
          const text = cleanParagraphText(buf);
          if (text && compact(text) !== compact(title) && !isBoilerplate(text, 'p')) blocks.push({ tag: 'p', text, score: blockTextScore(text, 'p') });
          buf = '';
        }
        for (const originalLine of contentLines) {
          if (/^(Title|URL Source|Markdown Content|Published Time|Warning):/i.test(originalLine)) continue;
          if (/^(Links\/Buttons|Images?|References?|External Links|Related Links):/i.test(originalLine)) { flush(); linkDumpMode = true; continue; }
          if (linkDumpMode) continue;
          if (/^={3,}$|^-{3,}$/.test(originalLine)) continue;
          if (isLinkJunkOnly(originalLine)) continue;
          const cleaned = cleanMarkdownLine(originalLine);
          const text = cleaned.text;
          if (!text || isBoilerplate(text, cleaned.wasHeading ? 'h2' : 'p')) continue;
          const headingLike = cleaned.wasHeading || (compact(text).length < 52 && !/[。！？.!?]/.test(text) && menuScore(text) === 0 && cjkCount(text) < 24);
          if (headingLike) {
            flush();
            if (compact(text) !== compact(title)) blocks.push({ tag: 'h2', text, score: blockTextScore(text, 'h2') });
            continue;
          }
          if (!buf) buf = text;
          else if (compact(buf).length < 70 && !/[。！？.!?]$/.test(buf)) buf += isCJKEdge(buf, text) ? text : ' ' + text;
          else { flush(); buf = text; }
        }
        flush();
        const trimmed = trimBoilerplateBlocks(blocks).map(({ tag, text }) => ({ tag, text }));
        return {
          title,
          blocks: trimmed.length ? trimmed : blocksFromPlainText(normalized, title),
          nextHref: findNavFromMarkdown(normalized, 'next', url),
          prevHref: findNavFromMarkdown(normalized, 'prev', url),
          url,
          routeName: routeName || 'Jina Reader'
        };
      }


      function setStatus(msg, type = '') {
        try{ if(typeof showLoad==='function') showLoad(msg); }catch(_){}
      }

      function blocksToText(blocks){
        return (blocks||[]).map(b=>b&&b.text?String(b.text).trim():'').filter(Boolean).join('\n');
      }

      async function fetchTextAdvanced(rawUrl){
        const url = normalizeUrl(rawUrl);
        const cached = readCache(url);
        if(cached && cached.blocks && cached.blocks.length){
          return { title: cached.title||url, text: blocksToText(cached.blocks), fromCache:true };
        }
        const result = await fetchHtmlFast(url);
        const html = result.html;
        const routeName = result.routeName;
        const finalUrl = result.finalUrl;
        const parser = result.parser || 'html';
        if(parser === 'jina'){
          const payload = parseJinaReaderPayload(html, url, routeName);
          writeCache(url, payload);
          return { title: payload.title||url, text: blocksToText(payload.blocks), fromCache:false };
        }
        const baseUrl = finalUrl || url;
        const doc = prepareDocument(html, baseUrl);
        const mainEl = findMainContent(doc);
        const title = getTitle(doc, mainEl, baseUrl);
        let blocks = extractReadableBlocks(doc, mainEl);
        const fallback = await extractFallbacks(html, doc, baseUrl, blocks);
        if(fallback) blocks = fallback.blocks;
        const payload = { title, blocks, nextHref:null, prevHref:null, url };
        writeCache(url, payload);
        return { title: title||url, text: blocksToText(blocks), fromCache:false };
      }

      window.fetchTextAdvanced = fetchTextAdvanced;

      fetchText = async function(url){
        setStatus('Extraindo texto (rota avançada)...');
        try{
          const r = await fetchTextAdvanced(url);
          const clean = cleanRaw(r.text);
          if(!clean || clean.length < 20) throw new Error('texto insuficiente extraído da página');
          fetchText._lastTitle = r.title;
          return clean;
        }catch(e){
          throw e;
        }
      };

      const oldImportURL35 = importURL;
      importURL = async function(url){
        showLoad('Extraindo texto...');
        try{
          const text = await fetchText(url);
          const host = (()=>{ try{ return new URL(url).hostname; }catch{ return url; } })();
          const guessedTitle = fetchText._lastTitle;
          const title = (guessedTitle && guessedTitle.length < 90 && guessedTitle !== url) ? guessedTitle : (()=>{
            const lines = text.split('\n').filter(l=>l.trim());
            return lines[0] && lines[0].length < 80 ? lines[0] : host;
          })();
          const r = await v37AutoSaveText(title, host, text, 'url');
          closeModals(); toast(r.kind==='book' ? 'Texto longo — adicionado aos Livros!' : 'Importado!'); await loadLib();
        }catch(e){ toast('Erro: '+e.message); }
        finally{ hideLoad(); }
      };
})();


/* ===== v36-script ===== */
(function(){
'use strict';
      const VOICES = [
        { name:'zh-CN-XiaoxiaoNeural', label:'晓晓 · Xiaoxiao — feminina expressiva', styles:['general','affectionate','angry','assistant','calm','chat','chat-casual','cheerful','customerservice','disgruntled','excited','fearful','friendly','gentle','lyrical','newscast','poetry-reading','sad','serious','sorry','whispering'] },
        { name:'zh-CN-XiaoyiNeural', label:'晓伊 · Xiaoyi — feminina doce', styles:['general','affectionate','angry','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'] },
        { name:'zh-CN-YunyangNeural', label:'云扬 · Yunyang — masculino narração/notícia', styles:['general','customerservice','narration-professional','newscast-casual'] },
        { name:'zh-CN-XiaochenNeural', label:'晓辰 · Xiaochen — feminina comercial', styles:['general','livecommercial','live-commercial'] },
        { name:'zh-CN-XiaohanNeural', label:'晓涵 · Xiaohan — feminina emocional', styles:['general','affectionate','angry','calm','cheerful','disgruntled','embarrassed','fearful','gentle','sad','serious'] },
        { name:'zh-CN-XiaomengNeural', label:'晓梦 · Xiaomeng — feminina chat', styles:['general','chat'] },
        { name:'zh-CN-XiaomoNeural', label:'晓墨 · Xiaomo — feminina dramática', styles:['general','affectionate','angry','calm','cheerful','depressed','disgruntled','embarrassed','envious','fearful','gentle','sad','serious'] },
        { name:'zh-CN-XiaoruiNeural', label:'晓睿 · Xiaorui — feminina sóbria', styles:['general','angry','calm','fearful','sad'] },
        { name:'zh-CN-XiaoshuangNeural', label:'晓双 · Xiaoshuang — criança/chat', styles:['general','chat'] },
        { name:'zh-CN-XiaoxuanNeural', label:'晓萱 · Xiaoxuan — feminina', styles:['general'] },
        { name:'zh-CN-XiaoyanNeural', label:'晓颜 · Xiaoyan — feminina', styles:['general'] },
        { name:'zh-CN-XiaoyouNeural', label:'晓悠 · Xiaoyou — criança', styles:['general'] },
        { name:'zh-CN-XiaozhenNeural', label:'晓甄 · Xiaozhen — feminina formal', styles:['general','angry','cheerful','disgruntled','fearful','sad','serious'] },
        { name:'zh-CN-YunfengNeural', label:'云枫 · Yunfeng — masculino emocional', styles:['general','angry','cheerful','depressed','disgruntled','fearful','sad','serious'] },
        { name:'zh-CN-YunhaoNeural', label:'云皓 · Yunhao — masculino propaganda', styles:['general','advertisement-upbeat','advertisement_upbeat'] },
        { name:'zh-CN-YunxiaNeural', label:'云夏 · Yunxia — masculino emocional', styles:['general','angry','calm','cheerful','fearful','sad'] },
        { name:'zh-CN-YunyeNeural', label:'云野 · Yunye — masculino dramático', styles:['general','angry','calm','cheerful','disgruntled','embarrassed','fearful','sad','serious'] },
        { name:'zh-CN-YunzeNeural', label:'云泽 · Yunze — masculino idoso', styles:['general','angry','calm','cheerful','depressed','disgruntled','documentary-narration','fearful','sad','serious'] },
        { name:'zh-CN-XiaoxiaoMultilingualNeural', label:'晓晓 Multilingual — experimental', styles:['general','affectionate','cheerful','empathetic','excited','poetry-reading','sorry','story'] },
        { name:'zh-CN-XiaoyouMultilingualNeural', label:'晓悠 Multilingual — experimental', styles:['general','angry','chat','cheerful','cute','poetry-reading','sad','story'] },
        { name:'zh-CN-Bo:MAI-Voice-2', label:'Bo MAI Voice 2 — experimental', styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'] },
        { name:'zh-CN-Mei:MAI-Voice-2', label:'Mei MAI Voice 2 — experimental', styles:['general','angry','confused','determined','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','relieved','sad','shouting','softvoice','surprised','whispering'] },
        { name:'zh-CN-Lan:MAI-Voice-2', label:'Lan MAI Voice 2 — feminina alternativa', styles:['general','angry','confused','disgusted','embarrassed','excited','fearful','happy','joyful','sad','surprised'] },
        { name:'zh-CN-Wei:MAI-Voice-2', label:'Wei MAI Voice 2 — masculino alternativo', styles:['general','angry','confused','disgusted','embarrassed','excited','fearful','happy','hopeful','jealous','joyful','regretful','sad','surprised'] }
      ];
      const STYLE_LABELS = {
        general:'通用 / neutro', affectionate:'亲切 / carinhoso', angry:'生气 / bravo', assistant:'助手 / assistente', calm:'平静 / calmo', chat:'聊天 / conversa', 'chat-casual':'casual', cheerful:'开心 / alegre', customerservice:'客服 / atendimento', disgruntled:'不满 / descontente', excited:'兴奋 / animado', fearful:'害怕 / medo', friendly:'友好 / amigável', gentle:'温柔 / gentil', lyrical:'抒情 / lírico', newscast:'新闻 / jornal', 'newscast-casual':'notícia casual', 'narration-professional':'narração profissional', 'documentary-narration':'documentário', 'poetry-reading':'诗歌朗读 / poesia', sad:'伤心 / triste', serious:'严肃 / sério', sorry:'抱歉 / arrependido', whispering:'耳语 / sussurro', depressed:'低落 / deprimido', embarrassed:'尴尬 / constrangido', envious:'羡慕 / invejoso', livecommercial:'comercial ao vivo', 'live-commercial':'comercial ao vivo', 'advertisement-upbeat':'propaganda animada', advertisement_upbeat:'propaganda animada', cute:'fofo', story:'história', happy:'feliz', confused:'confuso', determined:'determinado', disgusted:'nojo', hopeful:'esperançoso', jealous:'ciumento', joyful:'alegria', regretful:'arrependido', relieved:'aliviado', shouting:'gritando', softvoice:'voz suave', surprised:'surpreso', empathetic:'empático'
      };
      // Vozes do modo expressivo. A análise emocional permanece a mesma; esta
      // tabela só escolhe a voz final. O perfil "regional" fica como padrão
      // porque as MAI Voice 2 preservam melhor o dinamismo emocional. O perfil
      // "neutral" usa vozes zh-CN neurais padrão para reduzir sotaque regional.
      const EXPRESSIVE_VOICES = [
        { name:'zh-CN-Mei:MAI-Voice-2', gender:'F', dialect:'regional', label:'Mei · feminina MAI mais expressiva', isDefault:true },
        { name:'zh-CN-Lan:MAI-Voice-2', gender:'F', dialect:'regional', label:'Lan · feminina MAI alternativa' },
        { name:'zh-CN-XiaomoNeural', gender:'F', dialect:'neutral', label:'Xiaomo · feminina emocional neutra', isDefault:true },
        { name:'zh-CN-XiaoxiaoNeural', gender:'F', dialect:'neutral', label:'Xiaoxiao · feminina narrativa neutra' },
        { name:'zh-CN-Bo:MAI-Voice-2', gender:'M', dialect:'regional', label:'Bo · masculino MAI mais expressivo', isDefault:true },
        { name:'zh-CN-Wei:MAI-Voice-2', gender:'M', dialect:'regional', label:'Wei · masculino MAI alternativo' },
        { name:'zh-CN-YunyeNeural', gender:'M', dialect:'neutral', label:'Yunye · masculino dramático neutro', isDefault:true },
        { name:'zh-CN-YunzeNeural', gender:'M', dialect:'neutral', label:'Yunze · masculino maduro neutro' }
      ];

      // Regras de detecção de sentimento por frase (sistema de peso: mais ocorrências/peso vencem).
      const EMOTION_RULES = [
        { id:'sad', label:'tristeza', styles:['sad','depressed','regretful','sorry','serious'], weight:5, priority:100, rate:-10, pitch:-4, volume:0, keywords:['遗憾','后悔','难过','伤心','悲伤','痛苦','心痛','失望','绝望','孤独','寂寞','哭','流泪','眼泪','泪','可惜','惋惜','遗恨','不舍','离别','分手','离开','失去','错过','怀念','想念','悲哀','悲痛','哀伤','哀愁','忧伤','忧愁','忧郁','低落','沮丧','郁闷','难受','心酸','酸楚','委屈','凄凉','凄惨','惨','苦','可怜','无助','无奈','生离死别','不幸','死亡','去世','逝去','再也','再见','永别','破碎','崩溃','沉默','叹气','唉','唉呀','可悲','悲剧','痛心','抱歉','对不起','歉意','亏欠','愧疚','内疚','悔恨','悔','悔意','遗憾的是','很遗憾','心碎','悲从中来','泪流满面','泣不成声','黯然神伤','伤感','愁苦','悲从心来','心如刀割','痛失','告别','再无','独自','冷清','荒凉','思念','怅然','失魂落魄','萎靡','消沉'] },
        { id:'fearful', label:'medo', styles:['fearful','serious','sad'], weight:4, priority:92, rate:-5, pitch:+2, volume:0, keywords:['害怕','怕','恐怖','恐惧','惊恐','惊吓','吓','吓人','担心','担忧','忧虑','紧张','危险','危机','逃','快跑','救命','别过来','不要','小心','注意安全','可怕','不安','惊慌','慌张','心慌','胆小','发抖','颤抖','噩梦','怪物','鬼','恶魔','恐慌','害怕极了','惊魂未定','毛骨悚然','胆战心惊','心惊肉跳','不寒而栗','惶恐','惊惧','畏惧','心有余悸','提心吊胆','战栗','惊魂','瑟瑟发抖','惊悚','险些','差点','千钧一发','命悬一线'] },
        { id:'angry', label:'raiva', styles:['angry','disgruntled','disgusted','serious'], weight:4, priority:88, rate:+2, pitch:+1, volume:+3, keywords:['生气','愤怒','怒','火大','气死','讨厌','恨','可恶','混蛋','滚','闭嘴','烦','烦死','厌烦','不满','抱怨','怨','责怪','怪你','指责','吵架','争吵','骂','恶心','反感','不爽','不服','忍不了','受够','够了','别烦我','气愤','怒火','暴怒','恼火','发火','臭','垃圾','气疯了','火冒三丈','怒不可遏','咬牙切齿','恼羞成怒','怒气冲冲','大发雷霆','气得发抖','忍无可忍','岂有此理','荒唐','无耻','放肆','找死','找打','活该','该死','废物','蠢货','白痴'] },
        { id:'disgusted', label:'nojo', styles:['disgusted','angry','disgruntled'], weight:4, priority:84, rate:-1, pitch:-1, volume:+1, keywords:['恶心','作呕','呕吐','恶臭','肮脏','脏死了','恶心死了','讨厌死了','恶心极了','令人作呕','反胃','恶劣','丑陋','下贱','卑鄙','龌龊','恶心透了','不堪入目','变态','恶人','恶行','丑恶','令人厌恶','恶心巴拉','不堪','污秽','肮脏不堪','丑陋不堪','恶心到','吐了','想吐','嫌弃','鄙视','鄙夷','不齿','厌恶至极'] },
        { id:'serious', label:'sério', styles:['serious','calm','newscast','narration-professional'], weight:3, priority:78, rate:-3, pitch:-2, volume:0, keywords:['必须','一定','应该','需要','重要','认真','严肃','决定','确定','责任','承诺','原则','规则','事实','真相','证明','结果','原因','问题','答案','计划','目标','任务','工作','学习','考试','注意','警告','告诉你','听着','记住','别忘了','从现在开始','现实','命运','人生','这一生','一生','永远','从来','绝不','不能','不要','务必','切记','严格','谨慎','郑重','庄重','肃穆','明确','规定','纪律','法律','义务','使命','职责','宗旨','立场','态度','原则性','不容置疑','毫无疑问'] },
        { id:'surprised', label:'surpresa', styles:['surprised','excited','cheerful'], weight:3, priority:74, rate:+6, pitch:+4, volume:+1, keywords:['真的吗','真的假的','不会吧','天呐','我的天','哇','哇塞','惊讶','惊喜','意外','没想到','居然','竟然','突然','怎么会','我没听错吧','听错','不可能','太巧了','奇怪','好奇怪','神奇','奇迹','原来如此','啊','呀','咦','欸','吃惊','大吃一惊','出乎意料','匪夷所思','难以置信','不敢相信','万万没想到','这么巧','怎么可能','天哪','我的老天','我天','卧槽','绝了','离谱','真没想到'] },
        { id:'excited', label:'empolgação', styles:['excited','cheerful','surprised'], weight:3, priority:66, rate:+9, pitch:+5, volume:+2, keywords:['冲','加油','快点','赶紧','马上','立刻','振奋','燃起来','激动人心','热血','冲啊','来吧','拼了','全力以赴','紧张刺激','热烈','沸腾','高潮','爆发','冲刺','冲锋','冲上去','激情澎湃','热情高涨','摩拳擦掌','跃跃欲试','斗志昂扬','士气高涨','群情激昂','沸腾了','燃爆了','冲刺吧','拼命','使劲','用力','嗨起来','燃'] },
        { id:'cheerful', label:'alegria', styles:['cheerful','happy','joyful','excited','friendly'], weight:3, priority:60, rate:+7, pitch:+3, volume:+1, keywords:['开心','高兴','快乐','幸福','喜悦','欢乐','欢喜','愉快','兴奋','激动','喜欢','爱','可爱','太好了','真好','棒','厉害','成功','赢','胜利','庆祝','笑','微笑','哈哈','哈哈哈','呵呵','嘿嘿','甜','甜蜜','美好','幸运','满足','舒服','轻松','放心','祝福','欢迎','期待','希望','梦想','实现','赞','漂亮','完美','喜欢你','爱你','开心死了','乐','喜','悦','欣慰','好棒','棒极了','乐开花','喜出望外','眉开眼笑','心花怒放','其乐融融','和睦','温馨','惊喜万分','幸福感','满心欢喜','乐呵呵','美滋滋','爽','痛快','舒畅','愉悦','欢快','雀跃'] },
        { id:'determined', label:'determinação', styles:['determined','serious','excited'], weight:3, priority:58, rate:+1, pitch:0, volume:+2, keywords:['一定要','必须做到','绝不放弃','拼到底','咬牙','坚定','决心','下定决心','义无反顾','不惜一切','排除万难','说到做到','不达目的','誓死','背水一战','孤注一掷','非做不可','全力以赴','咬紧牙关','势在必行','破釜沉舟','矢志不渝','坚持到底','永不言弃','咬定','一往无前','勇往直前','决一死战','拼命三郎','铁了心','认定','坚守','不动摇','初心不改'] },
        { id:'hopeful', label:'esperança', styles:['hopeful','cheerful','gentle','calm'], weight:3, priority:56, rate:+2, pitch:+2, volume:0, keywords:['希望','愿望','梦想','期待','盼望','相信','一定会','会好的','未来','明天','机会','可能','也许','重新开始','加油','坚持','努力','勇气','光','阳光','温暖','前方','陪你','等你','回来','早去早回','一路平安','祝你','好运','成功','不要放弃','没关系','没事','放心','会过去','总有一天','曙光','转机','柳暗花明','否极泰来','苦尽甘来','再接再厉','明天会更好','终会','总会','会实现','有盼头','有奔头','光明','希望之光','一线生机'] },
        { id:'calm', label:'calma/gentileza', styles:['calm','gentle','affectionate','friendly','softvoice'], weight:2, priority:48, rate:-4, pitch:0, volume:-1, keywords:['平静','安静','冷静','慢慢','温柔','轻轻','柔和','舒服','安慰','陪伴','关心','照顾','放心','没事','别怕','乖','亲爱','宝贝','谢谢','感谢','请','麻烦','可以吗','好吗','晚安','早安','休息','睡吧','月亮','风','雨','云','花','梦','温暖','拥抱','想你','陪你','珍惜','守护','心平气和','平心静气','不紧不慢','从容','淡定','安宁','宁静','静谧','悠然','安详','稳重','沉稳','踏实','静下心来','放宽心','别急','慢慢来','静静地'] },
        { id:'embarrassed', label:'constrangimento', styles:['embarrassed','sorry','gentle'], weight:3, priority:44, rate:-3, pitch:+1, volume:-1, keywords:['尴尬','不好意思','害羞','脸红','羞','羞愧','丢脸','难为情','惭愧','抱歉','对不起','打扰','误会','算了','没什么','别看我','别说了','糟糕','完了','出丑','不好说','说错','听错','无地自容','面红耳赤','窘迫','手足无措','汗颜','难堪','出糗','丢人','社死','社死了','尴尬癌','红着脸','低下头','支支吾吾'] },
        { id:'jealous', label:'inveja/ciúme', styles:['jealous','envious','disgruntled'], weight:3, priority:42, rate:0, pitch:-1, volume:0, keywords:['羡慕','嫉妒','吃醋','酸','凭什么','不公平','眼红','嫉恨','不甘心','比不上','抢走','属于我','别碰','讨厌你们','为什么是他','为什么不是我','心里不是滋味','醋意大发','眼馋','看不惯','妒忌','红眼病','争风吃醋','心态失衡','不忿','气不过'] },
        { id:'relieved', label:'alívio', styles:['relieved','calm','cheerful'], weight:2, priority:38, rate:-1, pitch:+1, volume:0, keywords:['终于','总算','还好','幸好','放心了','松了一口气','没事了','安全了','过去了','结束了','解决了','好了','可以了','没关系','逃过','平安','安心','谢天谢地','如释重负','放下心来','悬着的心','终于放心','化险为夷','转危为安','虚惊一场','没事就好','平安无事','熬过来了','挺过来了'] },
        { id:'confused', label:'confusão', styles:['confused','serious','calm'], weight:2, priority:34, rate:-1, pitch:+2, volume:0, keywords:['为什么','怎么','什么','哪里','谁','哪个','不知道','不明白','不懂','奇怪','迷茫','糊涂','困惑','疑惑','难道','到底','什么意思','怎么办','怎么回事','搞不懂','听不懂','看不懂','一头雾水','摸不着头脑','云里雾里','百思不得其解','匪夷所思','搞不明白','弄不清楚','稀里糊涂','丈二和尚','不明所以','怎么会这样','这是怎么回事'] }
      ];

      // Camada opcional do modo emoção avançada. Ela não altera o detector base:
      // só interpreta as palavras-chave já existentes e converte a intensidade
      // em parâmetros SSML de prosódia. Cada emoção tem um perfil padrão para
      // todas as palavras do dicionário e alguns gatilhos fortes que recebem
      // parâmetros próprios quando aparecem no fragmento.
      const ADVANCED_EMOTION_PROFILES = {
        sad: {
          base:{ degree:0.10, rate:-3, pitch:-7, range:-8, volume:-2 },
          keyword:{ rate:-0.7, pitch:-1.1, range:-0.9, volume:-0.2, degree:0.025 },
          hot:{ '绝望':{degree:0.20, rate:-5, pitch:-10, range:-12, volume:-3}, '痛苦':{degree:0.16, rate:-4, pitch:-9, range:-10, volume:-2}, '崩溃':{degree:0.18, rate:-5, pitch:-8, range:-13, volume:-2}, '眼泪':{degree:0.12, rate:-3, pitch:-7, range:-8, volume:-1}, '永别':{degree:0.18, rate:-6, pitch:-11, range:-14, volume:-3}, '遗憾':{degree:0.09, rate:-2, pitch:-5, range:-6, volume:-1} }
        },
        fearful: {
          base:{ degree:0.16, rate:+5, pitch:+10, range:+13, volume:+2 },
          keyword:{ rate:+0.9, pitch:+1.5, range:+1.6, volume:+0.4, degree:0.03 },
          hot:{ '救命':{degree:0.28, rate:+10, pitch:+18, range:+22, volume:+6}, '快跑':{degree:0.24, rate:+12, pitch:+14, range:+20, volume:+5}, '恐惧':{degree:0.18, rate:+6, pitch:+14, range:+18, volume:+3}, '发抖':{degree:0.14, rate:+4, pitch:+10, range:+16, volume:+2}, '害怕极了':{degree:0.24, rate:+8, pitch:+17, range:+22, volume:+4} }
        },
        angry: {
          base:{ degree:0.18, rate:+4, pitch:+9, range:+11, volume:+5 },
          keyword:{ rate:+0.8, pitch:+1.2, range:+1.2, volume:+0.9, degree:0.035 },
          hot:{ '愤怒':{degree:0.22, rate:+6, pitch:+13, range:+16, volume:+8}, '气死':{degree:0.24, rate:+7, pitch:+14, range:+17, volume:+9}, '滚':{degree:0.25, rate:+8, pitch:+16, range:+18, volume:+10}, '闭嘴':{degree:0.25, rate:+8, pitch:+15, range:+18, volume:+10}, '受够':{degree:0.20, rate:+5, pitch:+11, range:+14, volume:+7}, '混蛋':{degree:0.23, rate:+7, pitch:+14, range:+16, volume:+9} }
        },
        disgusted: {
          base:{ degree:0.14, rate:-2, pitch:-5, range:+5, volume:+3 },
          keyword:{ rate:-0.3, pitch:-0.8, range:+0.7, volume:+0.4, degree:0.025 },
          hot:{ '恶心':{degree:0.17, rate:-3, pitch:-8, range:+7, volume:+4}, '作呕':{degree:0.20, rate:-4, pitch:-9, range:+8, volume:+5}, '反胃':{degree:0.18, rate:-4, pitch:-8, range:+8, volume:+4}, '恶臭':{degree:0.19, rate:-3, pitch:-8, range:+9, volume:+4} }
        },
        serious: {
          base:{ degree:0.08, rate:-3, pitch:-4, range:-4, volume:+1 },
          keyword:{ rate:-0.4, pitch:-0.5, range:-0.4, volume:+0.2, degree:0.015 },
          hot:{ '必须':{degree:0.10, rate:-2, pitch:-4, range:-4, volume:+2}, '一定':{degree:0.08, rate:-2, pitch:-3, range:-3, volume:+1}, '警告':{degree:0.15, rate:-4, pitch:-5, range:-6, volume:+4}, '记住':{degree:0.12, rate:-3, pitch:-4, range:-5, volume:+3}, '绝不':{degree:0.14, rate:-3, pitch:-5, range:-5, volume:+3} }
        },
        surprised: {
          base:{ degree:0.16, rate:+6, pitch:+13, range:+18, volume:+3 },
          keyword:{ rate:+0.9, pitch:+1.7, range:+2.0, volume:+0.4, degree:0.03 },
          hot:{ '真的吗':{degree:0.18, rate:+6, pitch:+15, range:+20, volume:+3}, '我的天':{degree:0.22, rate:+8, pitch:+19, range:+24, volume:+5}, '哇':{degree:0.20, rate:+7, pitch:+18, range:+24, volume:+4}, '不会吧':{degree:0.18, rate:+6, pitch:+16, range:+21, volume:+3}, '我没听错吧':{degree:0.22, rate:+7, pitch:+19, range:+24, volume:+4} }
        },
        excited: {
          base:{ degree:0.20, rate:+9, pitch:+12, range:+16, volume:+5 },
          keyword:{ rate:+1.2, pitch:+1.4, range:+1.5, volume:+0.7, degree:0.035 },
          hot:{ '冲啊':{degree:0.26, rate:+13, pitch:+17, range:+22, volume:+8}, '燃起来':{degree:0.23, rate:+11, pitch:+15, range:+20, volume:+7}, '全力以赴':{degree:0.20, rate:+8, pitch:+12, range:+16, volume:+6}, '爆发':{degree:0.22, rate:+10, pitch:+14, range:+19, volume:+7} }
        },
        cheerful: {
          base:{ degree:0.13, rate:+5, pitch:+9, range:+12, volume:+3 },
          keyword:{ rate:+0.7, pitch:+1.0, range:+1.2, volume:+0.4, degree:0.025 },
          hot:{ '哈哈':{degree:0.17, rate:+7, pitch:+12, range:+15, volume:+4}, '太好了':{degree:0.18, rate:+7, pitch:+13, range:+16, volume:+5}, '幸福':{degree:0.12, rate:+4, pitch:+8, range:+11, volume:+2}, '爱你':{degree:0.14, rate:+3, pitch:+8, range:+10, volume:+2}, '棒极了':{degree:0.18, rate:+7, pitch:+13, range:+16, volume:+5} }
        },
        determined: {
          base:{ degree:0.15, rate:+2, pitch:+4, range:+8, volume:+4 },
          keyword:{ rate:+0.4, pitch:+0.7, range:+1.0, volume:+0.6, degree:0.03 },
          hot:{ '绝不放弃':{degree:0.22, rate:+4, pitch:+7, range:+12, volume:+7}, '拼到底':{degree:0.22, rate:+5, pitch:+8, range:+12, volume:+7}, '下定决心':{degree:0.16, rate:+3, pitch:+5, range:+9, volume:+5}, '全力以赴':{degree:0.18, rate:+4, pitch:+6, range:+10, volume:+6} }
        },
        hopeful: {
          base:{ degree:0.11, rate:+2, pitch:+7, range:+10, volume:+1 },
          keyword:{ rate:+0.4, pitch:+0.9, range:+1.0, volume:+0.25, degree:0.02 },
          hot:{ '希望':{degree:0.10, rate:+2, pitch:+7, range:+9, volume:+1}, '一定会':{degree:0.13, rate:+3, pitch:+8, range:+11, volume:+2}, '未来':{degree:0.10, rate:+2, pitch:+7, range:+10, volume:+1}, '不要放弃':{degree:0.16, rate:+3, pitch:+8, range:+12, volume:+3} }
        },
        calm: {
          base:{ degree:0.07, rate:-4, pitch:-2, range:-5, volume:-1 },
          keyword:{ rate:-0.5, pitch:-0.3, range:-0.5, volume:-0.1, degree:0.012 },
          hot:{ '温柔':{degree:0.09, rate:-4, pitch:-2, range:-6, volume:-1}, '慢慢':{degree:0.10, rate:-6, pitch:-2, range:-7, volume:-1}, '晚安':{degree:0.08, rate:-5, pitch:-3, range:-7, volume:-2}, '没事':{degree:0.08, rate:-4, pitch:-2, range:-5, volume:-1} }
        },
        embarrassed: {
          base:{ degree:0.10, rate:-3, pitch:+4, range:+5, volume:-1 },
          keyword:{ rate:-0.4, pitch:+0.8, range:+0.7, volume:-0.1, degree:0.02 },
          hot:{ '不好意思':{degree:0.14, rate:-4, pitch:+6, range:+8, volume:-2}, '尴尬':{degree:0.13, rate:-3, pitch:+6, range:+7, volume:-1}, '脸红':{degree:0.14, rate:-4, pitch:+7, range:+8, volume:-2}, '对不起':{degree:0.10, rate:-3, pitch:+3, range:+5, volume:-1} }
        },
        jealous: {
          base:{ degree:0.11, rate:0, pitch:-3, range:+5, volume:+1 },
          keyword:{ rate:+0.1, pitch:-0.5, range:+0.7, volume:+0.2, degree:0.02 },
          hot:{ '凭什么':{degree:0.16, rate:+2, pitch:-2, range:+7, volume:+4}, '不公平':{degree:0.15, rate:+1, pitch:-2, range:+7, volume:+3}, '吃醋':{degree:0.13, rate:0, pitch:-3, range:+5, volume:+2}, '抢走':{degree:0.17, rate:+2, pitch:-2, range:+8, volume:+4} }
        },
        relieved: {
          base:{ degree:0.08, rate:-1, pitch:+3, range:+5, volume:0 },
          keyword:{ rate:-0.2, pitch:+0.5, range:+0.5, volume:+0.1, degree:0.015 },
          hot:{ '终于':{degree:0.10, rate:-1, pitch:+4, range:+6, volume:+1}, '幸好':{degree:0.11, rate:-1, pitch:+5, range:+7, volume:+1}, '没事了':{degree:0.09, rate:-2, pitch:+3, range:+5, volume:0}, '松了一口气':{degree:0.12, rate:-2, pitch:+4, range:+6, volume:0} }
        },
        confused: {
          base:{ degree:0.09, rate:-1, pitch:+7, range:+9, volume:0 },
          keyword:{ rate:-0.1, pitch:+0.9, range:+1.0, volume:0, degree:0.018 },
          hot:{ '为什么':{degree:0.11, rate:-1, pitch:+8, range:+11, volume:0}, '到底':{degree:0.13, rate:0, pitch:+9, range:+12, volume:+1}, '什么意思':{degree:0.12, rate:-1, pitch:+8, range:+11, volume:0}, '怎么回事':{degree:0.13, rate:0, pitch:+9, range:+12, volume:+1} }
        },
        general: { base:{ degree:0, rate:0, pitch:0, range:0, volume:0 }, keyword:{ rate:0, pitch:0, range:0, volume:0, degree:0 }, hot:{} }
      };

      // ---- helpers portados (cópia local, sem depender de outros módulos) ----
      const v36esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const v36strip = s => String(s == null ? '' : s).replace(/\u00a0/g, ' ').replace(/[ \t\f\v]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/[\u200b\u200c\u200d\ufeff]/g, '').trim();
      const v36compact = s => String(s == null ? '' : s).replace(/\s+/g, '').trim();
      const compact = v36compact;
      const HAN_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/g;

      const TOKEN_REFRESH_BEFORE_EXPIRY = 3 * 60;
      const TTS_SETTINGS_PREFIX = 'v36tts:';
      let tokenInfo = { endpoint: null, token: null, expiredAt: null };

      function ttsStorageGet(key, fallback = '') {
        try { const v = localStorage.getItem(TTS_SETTINGS_PREFIX + key); return v == null ? fallback : v; } catch { return fallback; }
      }
      function ttsStorageSet(key, value) {
        try { localStorage.setItem(TTS_SETTINGS_PREFIX + key, String(value)); } catch {}
      }

      // ---- configurações (substitui os selects/inputs do arquivo auxiliar) ----
      function v36DefaultSettings() {
        return {
          expressiveOn: true,          // modo com emoção — vem ativado por padrão
          advancedOn: true,            // emoção avançada (camadas de intensidade) — junto do expressivo
          emotionV2On: false,          // experimental: blend ponderado + contorno de pitch + ênfase
          emotionV3On: true,           // Voz Emocional v3 Beta — ativa por padrão com dicionários expandidos
          emotionSensitivity: 1.0,     // 0.5–1.5 — quão fácil uma palavra-chave dispara reação forte
          emotionIntensity: 1.0,       // 0.5–1.5 — força final dos efeitos (rate/pitch/range/volume)
          gender: 'F',
          dialect: 'regional',
          expressiveVoice: '',         // vazio = escolher automaticamente por gênero/dialeto
          classicVoice: 'zh-CN-XiaoxiaoNeural',
          classicStyle: 'general',
          classicDegree: 1.35,
          volumeBoost: 0,
          quality: 'audio-48khz-192kbitrate-mono-mp3'
        };
      }
      function v36GetSettings() {
        const d = v36DefaultSettings();
        try {
          const raw = ttsStorageGet('settings', '');
          if (raw) return { ...d, ...JSON.parse(raw) };
        } catch {}
        return d;
      }
      function v36SaveSettings(patch) {
        const next = { ...v36GetSettings(), ...patch };
        ttsStorageSet('settings', JSON.stringify(next));
        return next;
      }

      function getVoiceMeta(name) { return VOICES.find(v => v.name === name) || VOICES[0]; }
      function escapeXml(s) { return String(s == null ? '' : s).replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c] || c)); }
      function fmtSigned(n, suffix) { n = Number(n) || 0; const r = Math.round(n * 10) / 10; return (r >= 0 ? '+' : '') + r + suffix; }
      function clampNum(value, min, max, fallback = 0) { const n = Number(value); if (!Number.isFinite(n)) return fallback; return Math.max(min, Math.min(max, n)); }

      function getTtsVolumeBoost() { return clampNum(v36GetSettings().volumeBoost, -20, 35, 0); }
      function isAdvancedEmotionOn() { const s = v36GetSettings(); return !!(s.expressiveOn && s.advancedOn); }
      function safeTtsStyle(style) { return style && style !== 'general' ? style : ''; }

      function getDefaultExpressiveVoiceName(gender, dialect) {
        const candidates = EXPRESSIVE_VOICES.filter(v => v.gender === gender && v.dialect === dialect);
        const meta = candidates.find(v => v.isDefault) || candidates[0] || EXPRESSIVE_VOICES[0];
        return meta ? meta.name : 'zh-CN-Mei:MAI-Voice-2';
      }
      function getExpressiveVoiceName() {
        const s = v36GetSettings();
        if (s.expressiveVoice && EXPRESSIVE_VOICES.some(v => v.name === s.expressiveVoice)) return s.expressiveVoice;
        return getDefaultExpressiveVoiceName(s.gender || 'F', s.dialect || 'regional') || 'zh-CN-Mei:MAI-Voice-2';
      }

      function cleanSelectedText(text) { return v36strip(String(text || '').replace(/\s*\n\s*/g, '\n').replace(/[ \t\f\v]+/g, ' ')).slice(0, 4000); }
      function hasMandarinText(text) { return ((String(text || '').match(HAN_RE)) || []).length > 0; }

      function setTtsStatus(msg) { try { if (typeof toast === 'function') { /* silencioso por padrão, log apenas */ }  } catch {} }
      function makeTtsExpressBlock(text, opts) {
        const style = safeTtsStyle(opts.style);
        const attrs = [];
        if (style) attrs.push(`style="${escapeXml(style)}"`);
        if (style && opts.degree) attrs.push(`styledegree="${escapeXml(opts.degree)}"`);
        const prosody = `<prosody rate="+0%" pitch="+0Hz" volume="${fmtSigned(getTtsVolumeBoost(), '%')}">${escapeXml(text)}</prosody>`;
        return attrs.length ? `<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>` : prosody;
      }
      const GENERAL_RULE = { id:'general', label:'neutro', styles:['general'], weight:0, priority:0, rate:0, pitch:0, volume:0 };
      function splitIntoBlocks(text) {
        // Mantém o mesmo fluxo emocional validado no index-2.2: a análise divide
        // o texto em blocos de frase para escolher emoção/estilo, mas tudo continua
        // sendo enviado dentro de um único SSML. Isso não é envio de áudio por
        // pedaços; é apenas marcação expressiva interna para a Microsoft.
        const raw = String(text || '').split(/(?<=[。！？!?])|\n+/);
        const out = [];
        for (let piece of raw) {
          piece = piece.trim();
          if (piece) out.push(piece);
        }
        return out.length ? out : (String(text || '').trim() ? [String(text).trim()] : []);
      }

      function splitBlockIntoFragments(block) {
        // v51: não dividir por vírgula/、 para emissão de voz.
        // A Azure já interpreta pontuação naturalmente e também permite controlar
        // vírgula com mstts:silence. Fragmentar em vírgulas fazia a estrofe virar
        // vários <express-as>/<prosody> + <break>, causando pausas longas e saltos
        // de velocidade quando sobrava um fragmento curto no fim.
        const piece = String(block || '').trim();
        return piece ? [piece] : [];
      }

      function chooseExpressiveStyle(voiceName, ruleStyles) {
        const meta = getVoiceMeta(voiceName);
        for (const st of ruleStyles || []) {
          if (meta.styles.includes(st)) return st;
        }
        return meta.styles.includes('general') ? 'general' : (meta.styles[0] || 'general');
      }

      function fallbackRuleByPunctuation(text) {
        if (/[？?]/.test(text)) return getEmotionRules().find(r => r.id === 'confused') || null;
        if (/[！!]/.test(text)) return getEmotionRules().find(r => r.id === 'surprised') || null;
        return null;
      }

      // ---- Voz Natural v2: padrão da aplicação (hzVoiceV2, opt-out) ----
      function hzV2On(){ try{return localStorage.getItem('hzVoiceV2')!=='0';}catch(e){return true;} } // v2 é o padrão; '0' = versão clássica
      // Léxico adicional: cobre intenção emocional que o dicionário base não pega.
      const HZV2_EXTRA = {
        cheerful:['太开心','好开心','超棒','真棒','好耶','太喜欢','美妙','灿烂','阳光明媚','笑容','欢呼','庆功','喜讯','好消息'],
        sad:['心灰意冷','泪水','哽咽','独自一人','空荡荡','物是人非','曾经','回不去','来不及','葬礼','诀别'],
        angry:['凭什么','太过分','欺人太甚','忍够了','气炸','怒吼','咆哮','翻脸','算账'],
        fearful:['阴森','诡异','黑影','脚步声','背后','冷汗','心跳加速','屏住呼吸','僵住','动弹不得'],
        surprised:['震惊','惊呆','目瞪口呆','反转','没料到','出人意料','瞠目结舌'],
        excited:['迫不及待','摩肩擦掌','热血沸腾','开战','决赛','倒计时','开始了'],
        hopeful:['星光','黎明','春天','新的开始','重新出发','终点','彼岸','守望'],
        calm:['深呼吸','缓缓','静静','徐徐','轻声','低语','夜色','湖面','微风'],
        serious:['后果','代价','慎重','权衡','关键时刻','千万','不得','禁止'],
        confused:['莫名其妙','蹊跷','谜团','疑点','说不通','讲不清']
      };
      // ---- Voz Emocional v3 Beta: dicionário expandido no MESMO ESCOPO da voz ----
      // Esta função precisa ficar antes de scoreAllRules/analyzeBlockEmotion, no mesmo IIFE
      // onde EMOTION_RULES e HZV2_EXTRA existem. Na build anterior ela foi parar em outro
      // módulo/escopo, gerando o erro: getEmotionRules is not defined.
      function emotionV3Enabled() {
        try {
          const settings = (typeof v36GetSettings === 'function') ? v36GetSettings() : {};
          return !!settings.emotionV3On;
        } catch {
          return false;
        }
      }

      function buildEmotionRulesV3() {
        try {
          if (buildEmotionRulesV3._cache) return buildEmotionRulesV3._cache;
          const suffixes = ['', '啊', '呀', '呢', '吧', '嘛', '了', '啊！', '呀！', '？', '！', '...', '~~'];
          const rulesV3 = EMOTION_RULES.map(rule => {
            const extras = HZV2_EXTRA[rule.id] || [];
            const baseList = (rule.keywords || []).concat(extras);
            const seen = new Set();
            const keywords = [];
            for (const word of baseList) {
              for (const suf of suffixes) {
                const kw = String(word || '') + suf;
                if (kw && !seen.has(kw)) {
                  seen.add(kw);
                  keywords.push(kw);
                }
              }
            }
            return { ...rule, keywords };
          });
          buildEmotionRulesV3._cache = rulesV3;
          return rulesV3;
        } catch (err) {
          try { console.warn('[voz-v3] fallback para dicionário padrão:', err); } catch {}
          return EMOTION_RULES;
        }
      }

      function getEmotionRules() {
        try {
          return emotionV3Enabled() ? buildEmotionRulesV3() : EMOTION_RULES;
        } catch {
          return EMOTION_RULES;
        }
      }

      function hzV2Keys(rule){
        if(!hzV2On())return rule.keywords;
        const extra=HZV2_EXTRA[rule.id];
        if(!extra)return rule.keywords;
        if(!rule._hzAll)rule._hzAll=rule.keywords.concat(extra);
        return rule._hzAll;
      }
      function scoreAllRules(text) {
        const scores = [];
        for (const rule of getEmotionRules()) {
          let count = 0;
          let firstIndex = 999999;
          const hits = [];
          for (const kw of hzV2Keys(rule)) {
            const idx = text.indexOf(kw);
            if (idx >= 0) { count++; firstIndex = Math.min(firstIndex, idx); hits.push(kw); }
          }
          if (!count) continue;
          const score = count * rule.weight * 100 + rule.priority - Math.min(firstIndex, 999) / 1000;
          scores.push({ ...rule, count, hits, score });
        }
        scores.sort((a, b) => b.score - a.score);
        return scores;
      }

      // Um fragmento só "puxa" a emoção pra si (em vez de herdar o contexto do
      // bloco) quando: (a) o sinal local bate com a própria emoção do bloco
      // (contexto confirmado ali), ou (b) o sinal local é real (pelo menos uma
      // palavra-chave de peso relevante) E claramente mais forte do que o
      // quanto a emoção do bloco pontuaria naquele mesmo fragmento. Comparar
      // contra "o bloco pontuado neste fragmento" (em vez do agregado do bloco
      // inteiro) evita que blocos com muitos fragmentos abafem injustamente
      // uma mudança de emoção pontual e válida em um trecho menor.
      const MIN_LOCAL_SIGNAL = 150;
      const LOCAL_OVERRIDE_MARGIN = 40;

      function analyzeBlockEmotion(block) {
        const fragments = splitBlockIntoFragments(block);
        const fragScores = fragments.map(f => scoreAllRules(f));

        // Contexto do bloco inteiro: agrega ocorrências × peso de cada regra
        // através de todos os fragmentos do bloco, não só de um pedaço isolado.
        const aggregate = new Map();
        fragScores.forEach(scores => {
          scores.forEach(s => aggregate.set(s.id, (aggregate.get(s.id) || 0) + s.count * s.weight));
        });
        let blockRule = null, blockAggScore = 0;
        for (const rule of getEmotionRules()) {
          const agg = aggregate.get(rule.id) || 0;
          if (!agg) continue;
          const total = agg * 100 + rule.priority;
          if (!blockRule || total > blockAggScore) { blockRule = rule; blockAggScore = total; }
        }
        if (!blockRule) blockRule = fallbackRuleByPunctuation(block) || GENERAL_RULE;

        const entries = fragments.map((fragment, i) => {
          const scores = fragScores[i];
          const local = scores[0] || null;
          const blockRuleHere = scores.find(s => s.id === blockRule.id);
          const blockRuleLocalScore = blockRuleHere ? blockRuleHere.score : 0;
          let rule, source;
          if (local && local.id === blockRule.id) {
            rule = local; source = 'contexto-confirmado';
          } else if (local && local.score >= MIN_LOCAL_SIGNAL && local.score > blockRuleLocalScore + LOCAL_OVERRIDE_MARGIN) {
            rule = local; source = 'local';
          } else if (blockRule.id !== 'general') {
            rule = blockRule; source = 'contexto';
          } else {
            rule = local || fallbackRuleByPunctuation(fragment) || GENERAL_RULE;
            source = local ? 'local-fraco' : 'geral';
          }
          return { fragment, rule, localScore: local ? local.score : 0, source, index: i, count: fragments.length };
        });

        // v2 beta: marca transições emocionais para suavizar a entrada da nova
        // emoção (ease-in) e sinaliza clímax quando o sinal local é forte.
        if (hzV2On()) {
          for (let i = 0; i < entries.length; i++) {
            const prev = entries[i-1];
            entries[i].hzTrans = prev && prev.rule.id !== entries[i].rule.id;
            entries[i].hzPeak = entries[i].source === 'local' && entries[i].localScore >= 300;
          }
        }
        return { blockRule, blockAggScore, entries };
      }

      // Intensidade variável: em vez de um styledegree fixo, ela combina a
      // força do próprio sinal (mais palavras-chave = mais ênfase), uma leve
      // cadência alternada entre fragmentos (pra não soar em "degrau único" o
      // tempo todo) e um teto mais baixo pra emoção herdada do contexto do que
      // pra uma mudança local — reforçando que a variação local é o "pico".
      function computeStyleDegree(entry) {
        // v51: intensidade de estilo em modo leitura/narração.
        // O range 0.01–2 existe, mas usar 1.7/2 em muitas frases deixa a voz
        // teatral/lenta. Mantemos emoção, porém com teto menor para fluxo natural.
        if (!hzV2On()) {
          if (entry.rule.id === 'general') return 0.60;
          const base = entry.source === 'local' ? 1.02 : 0.88;
          const strength = Math.max(0, Math.min(0.28, (entry.localScore || entry.rule.priority || 0) / 1200));
          const cadence = ((entry.index % 3) - 1) * 0.035;
          return Math.max(0.55, Math.min(1.32, base + strength + cadence));
        }
        const frag = String(entry.fragment || '');
        if (entry.rule.id === 'general') {
          const arcN = Math.sin(Math.PI * ((entry.index + 0.5) / Math.max(1, entry.count))) * 0.035;
          return Math.max(0.58, Math.min(0.78, 0.64 + arcN + (/[！!]$/.test(frag) ? 0.04 : 0)));
        }
        const base = entry.source === 'local' ? 1.05 : 0.92;
        const strength = Math.max(0, Math.min(0.30, (entry.localScore || entry.rule.priority || 0) / 1150));
        const arc = Math.sin(Math.PI * ((entry.index + 0.5) / Math.max(1, entry.count))) * 0.055;
        let h = 0; for (let i = 0; i < frag.length; i++) h = (h * 31 + frag.charCodeAt(i)) >>> 0;
        const cadence = ((h % 15) - 7) / 220; // ~ -0.03 .. +0.03
        let punct = 0;
        if (/[！!]{2,}\s*$/.test(frag)) punct += 0.08; else if (/[！!]\s*$/.test(frag)) punct += 0.045;
        if (/[？?]\s*$/.test(frag)) punct += 0.035;
        if (/(……|\.\.\.|…)\s*$/.test(frag)) punct -= 0.055;
        if ((frag.match(/[，,、]/g) || []).length >= 3) punct -= 0.025;
        if (/[「『“"].+[」』”"]/.test(frag)) punct += 0.025;
        const trans = entry.hzTrans ? -0.04 : 0;
        const peak = entry.hzPeak ? 0.06 : 0;
        return Math.max(0.58, Math.min(1.42, base + strength + arc + cadence + punct + trans + peak));
      }

      function scaledProsody(rule, degree) {
        // v51: dicionário maior detecta mais emoção; por isso a prosódia base
        // precisa ser mais sutil. A emoção principal vem do express-as; rate/pitch
        // só dão cor, não podem dominar a cadência de leitura.
        const factor = Math.max(0.35, Math.min(1.05, degree / 1.35));
        return {
          rate: (rule.rate || 0) * factor * 0.38,
          pitch: (rule.pitch || 0) * factor * 0.52,
          range: 0,
          volume: (rule.volume || 0) * factor * 0.55
        };
      }

      function addProsody(a, b, factor = 1) {
        return {
          rate: (a.rate || 0) + (b.rate || 0) * factor,
          pitch: (a.pitch || 0) + (b.pitch || 0) * factor,
          range: (a.range || 0) + (b.range || 0) * factor,
          volume: (a.volume || 0) + (b.volume || 0) * factor,
          degree: (a.degree || 0) + (b.degree || 0) * factor
        };
      }

      function isEmotionV2On() {
        // v4.9: a modulação v2 (blend ponderado + contorno + ênfase) deixou de
        // ser experimental — agora é o comportamento padrão sempre que a
        // emoção avançada está ativa, sem opção separada para a versão antiga.
        const s = v36GetSettings();
        return !!(s.expressiveOn && s.advancedOn);
      }

      function findKeywordProsody(rule, fragment) {
        const profile = ADVANCED_EMOTION_PROFILES[rule.id] || ADVANCED_EMOTION_PROFILES.general;
        const v2 = isEmotionV2On();
        let total = { rate:0, pitch:0, range:0, volume:0, degree:0 };
        const hits = [];
        let weightSum = 0;
        const text = String(fragment || '');
        for (const kw of rule.keywords || []) {
          if (!kw || !text.includes(kw)) continue;
          const hot = profile.hot && profile.hot[kw];
          const base = hot || profile.keyword || ADVANCED_EMOTION_PROFILES.general.keyword;
          // v2: uma palavra "hot" (com ajuste próprio, curado) pesa mais na soma
          // do que uma genérica — então 2 sinais fortes se reforçam mais do que
          // 2 sinais fracos, em vez de todo hit valer o mesmo peso.
          const w = v2 ? (hot ? 1.4 : 1.0) : 1;
          total = addProsody(total, base, 1);
          weightSum += w;
          hits.push({ keyword:kw, hot:!!hot, weight:w });
        }
        if (hits.length > 1) {
          const compress = v2 ? (1 / Math.sqrt(Math.max(1, weightSum))) : (1 / Math.sqrt(hits.length));
          total = {
            rate: total.rate * compress,
            pitch: total.pitch * compress,
            range: total.range * compress,
            volume: total.volume * compress,
            degree: total.degree * compress
          };
        }
        return { total, hits };
      }

      function computeAdvancedEmotionParams(entry, degree, previousState) {
        const rule = entry.rule || GENERAL_RULE;
        const profile = ADVANCED_EMOTION_PROFILES[rule.id] || ADVANCED_EMOTION_PROFILES.general;
        const keyword = findKeywordProsody(rule, entry.fragment);
        const s = v36GetSettings();
        const sensitivity = clampNum(s.emotionSensitivity, 0.5, 1.5, 1);
        const intensityMul = clampNum(s.emotionIntensity, 0.5, 1.5, 1);
        const sourceBoost = entry.source === 'local' ? 1.06 : (entry.source === 'contexto-confirmado' ? 1.00 : 0.74);
        const signal = Math.max(0, Math.min(1.0, (entry.localScore || rule.priority || 0) / 1100 * sensitivity));
        const density = Math.max(0.82, Math.min(1.08, compact(entry.fragment).length / 26));
        const intensity = Math.max(0.40, Math.min(1.10, (0.58 + signal * 0.32 + (degree - 1) * 0.10) * sourceBoost * density)) * intensityMul;
        let out = addProsody({}, profile.base || {}, intensity);
        out = addProsody(out, keyword.total || {}, intensity);

        // Suavização tipo "herança de estado" (não é uma cadeia de Markov formal,
        // é uma média ponderada com o fragmento anterior): a emoção atual herda
        // um pouco da prosódia anterior para não dar saltos robóticos entre
        // fragmentos próximos; se a emoção se repete, a continuidade é maior,
        // se muda, a herança cai.
        if (previousState && previousState.ruleId) {
          const carry = previousState.ruleId === rule.id ? 0.28 : 0.12;
          out = {
            rate: out.rate * (1 - carry) + previousState.rate * carry,
            pitch: out.pitch * (1 - carry) + previousState.pitch * carry,
            range: out.range * (1 - carry) + previousState.range * carry,
            volume: out.volume * (1 - carry) + previousState.volume * carry,
            degree: out.degree
          };
        }
        return {
          ruleId: rule.id,
          hits: keyword.hits,
          rate: Math.max(-8, Math.min(12, out.rate)),
          pitch: Math.max(-18, Math.min(20, out.pitch)),
          range: Math.max(-12, Math.min(18, out.range)),
          volume: Math.max(-8, Math.min(12, out.volume)),
          degree: Math.max(-0.10, Math.min(0.22, out.degree || 0))
        };
      }

      function buildContourFromPitch(pitchHz) {
        const peak = clampNum(pitchHz * 1.35, -45, 45, 0);
        const settle = clampNum(pitchHz, -45, 45, 0);
        return `(0%,+0Hz) (35%,${fmtSigned(peak,'Hz')}) (100%,${fmtSigned(settle,'Hz')})`;
      }

      function wrapHotKeywordEmphasis(text, hits) {
        // v51: não usar <emphasis> em chinês. A documentação da Microsoft limita
        // o suporte de ênfase de palavra a vozes EN específicas; em zh-CN isso pode
        // ser ignorado ou alterar a cadência de modo imprevisível.
        return null;
      }

      function buildProsodyTag(text, vals, opts) {
        opts = opts || {};
        const volume = clampNum((vals.volume || 0) + getTtsVolumeBoost(), -45, 55, 0);
        const attrs = [`rate="${fmtSigned(clampNum(vals.rate, -12, 16, 0), '%')}"`];
        if (opts.contour) attrs.push(`contour="${opts.contour}"`);
        else attrs.push(`pitch="${fmtSigned(clampNum(vals.pitch, -24, 26, 0), 'Hz')}"`);
        attrs.push(`volume="${fmtSigned(volume, '%')}"`);
        if (Math.abs(vals.range || 0) >= 0.5) attrs.push(`range="${fmtSigned(clampNum(vals.range, -18, 20, 0), '%')}"`);
        const inner = opts.innerXml != null ? opts.innerXml : escapeXml(text);
        return `<prosody ${attrs.join(' ')}>${inner}</prosody>`;
      }

      // Pausas curadas do index-2.2: elas ficam dentro do MESMO SSML e servem
      // apenas como respiração natural da voz emocional. O problema de leitura
      // "bloco por bloco" vinha do H48 gerando vários blobs/playlist para texto
      // longo, não desta marcação interna.
      function breakTimeForFragmentEnd(fragment, index) {
        const last = fragment.slice(-1);
        const jitter = (index % 2 === 0) ? 15 : -10;
        if (last === '、') return Math.max(90, 120 + jitter) + 'ms';
        if (last === '；' || last === ';') return Math.max(150, 220 + jitter) + 'ms';
        return Math.max(120, 165 + jitter) + 'ms';
      }

      function breakTimeForBlockEnd(block, index) {
        const last = block.slice(-1);
        const jitter = (index % 2 === 0) ? 20 : -15;
        if (last === '？' || last === '?') return Math.max(320, 420 + jitter) + 'ms';
        if (last === '！' || last === '!') return Math.max(280, 360 + jitter) + 'ms';
        return Math.max(300, 390 + jitter) + 'ms';
      }

      function buildExpressiveSsml(text) {
        const voice = getExpressiveVoiceName();
        const blocks = splitIntoBlocks(cleanSelectedText(text));
        const allEntries = [];
        const bodyParts = [];

        const advancedOn = isAdvancedEmotionOn();
        const v2On = isEmotionV2On();
        let advancedHits = 0;
        let advancedState = null;

        blocks.forEach((block, blockIndex) => {
          const { entries } = analyzeBlockEmotion(block);
          entries.forEach((entry, fragIndex) => {
            allEntries.push(entry);
            let degree = computeStyleDegree(entry);
            let prosodyVals = scaledProsody(entry.rule, degree);
            let hotHits = null;
            if (advancedOn) {
              const adv = computeAdvancedEmotionParams(entry, degree, advancedState);
              advancedState = adv;
              advancedHits += adv.hits ? adv.hits.length : 0;
              hotHits = adv.hits;
              degree = Math.max(0.01, Math.min(2, degree + adv.degree));
              prosodyVals = {
                rate: prosodyVals.rate + adv.rate,
                pitch: prosodyVals.pitch + adv.pitch,
                range: prosodyVals.range + adv.range,
                volume: prosodyVals.volume + adv.volume
              };
            }
            const style = safeTtsStyle(chooseExpressiveStyle(voice, entry.rule.styles || ['general']));
            const attrs = [];
            const safeDegree = clampNum(degree, 0.58, 1.42, 1.0);
            if (style) attrs.push(`style="${escapeXml(style)}"`, `styledegree="${safeDegree.toFixed(2)}"`);
            const prosodyOpts = {};
            if (v2On && hotHits && hotHits.some(h => h.hot) && compact(entry.fragment).length >= 8) {
              prosodyOpts.contour = buildContourFromPitch(prosodyVals.pitch);
              const emphasized = wrapHotKeywordEmphasis(entry.fragment, hotHits);
              if (emphasized) prosodyOpts.innerXml = emphasized;
            }
            const prosody = buildProsodyTag(entry.fragment, prosodyVals, prosodyOpts);
            const express = attrs.length ? `<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>` : prosody;
            // v51: não adicionar <break> após cada pontuação.
            // A engine já pausa na pontuação; as durações abaixo são controladas
            // no nível da voz por mstts:silence para manter fluxo natural.
            bodyParts.push(`    ${express}`);
          });

        });

        if (allEntries.length) {
          const counts = new Map();
          allEntries.forEach(e => counts.set(e.rule.label, (counts.get(e.rule.label) || 0) + 1));
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          setTtsStatus(advancedOn ? `Modo emoção avançada v3: ${blocks.length} bloco(s), ${allEntries.length} fragmento(s), ${advancedHits} gatilho(s) de intensidade — predominante "${top ? top[0] : 'neutro'}".` : `Modo expressivo v3: ${blocks.length} bloco(s) e ${allEntries.length} fragmento(s) analisados — emoção predominante "${top ? top[0] : 'neutro'}".`, '');
        }
        const silenceControls = [
          '    <mstts:silence type="comma-exact" value="45ms"/>',
          '    <mstts:silence type="semicolon-exact" value="90ms"/>',
          '    <mstts:silence type="enumerationcomma-exact" value="65ms"/>',
          '    <mstts:silence type="Sentenceboundary" value="120ms"/>'
        ].join('\n');
        return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">\n  <voice name="${escapeXml(voice)}">\n${silenceControls}\n${bodyParts.join('\n')}\n  </voice>\n</speak>`;
      }

      function buildTtsSsml(text) {
        const s = v36GetSettings();
        const voice = s.classicVoice || 'zh-CN-XiaoxiaoNeural';
        const opts = { style: s.classicStyle || 'general', degree: s.classicDegree || 1.35 };
        const lines = cleanSelectedText(text).split(/\n+/).map(s => s.trim()).filter(Boolean);
        const body = lines.map((line, i) => `    ${makeTtsExpressBlock(line, opts)}${i < lines.length - 1 ? '\n    <break time="360ms"/>' : ''}`).join('\n');
        return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">\n  <voice name="${escapeXml(voice)}">\n${body}\n  </voice>\n</speak>`;
      }

      async function getTtsAudioFromSsml(ssml, outputFormat) {
        return await window.hzTtsEdgeApiBlob(ssml, { outputFormat });
      }

      async function getTtsEndpoint() {
        throw new Error('Endpoint movido para /api/tts-edge');
      }

      function makeUuidHex() {
        if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      }

      async function hmacSha256(key, data) {
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name:'HMAC', hash:{ name:'SHA-256' } }, false, ['sign']);
        return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data)));
      }

      function base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }

      function bytesToBase64(bytes) {
        let s = '';
        for (const b of bytes) s += String.fromCharCode(b);
        return btoa(s);
      }

      function dateFormat() {
        return new Date().toUTCString().replace(/GMT/, '').trim().toLowerCase() + ' gmt';
      }

      async function signTtsEndpoint(urlStr) {
        const url = urlStr.split('://')[1];
        const encodedUrl = encodeURIComponent(url);
        const uuidStr = makeUuidHex();
        const formattedDate = dateFormat();
        const bytesToSign = `EdgeTTSBridge${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
        const decode = base64ToBytes('server-side-secret');
        const signData = await hmacSha256(decode, bytesToSign);
        return `EdgeTTSBridge::${bytesToBase64(signData)}::${formattedDate}::${uuidStr}`;
      }


      // ---- construção automática (expressivo x clássico) ----
      function v36BuildSsmlAuto(text) {
        return v36GetSettings().expressiveOn ? buildExpressiveSsml(text) : buildTtsSsml(text);
      }

      // ---- reprodução ----
      let v36LastUrl = null;
      function v36PlayBlob(blob) {
        return new Promise((resolve, reject) => {
          try { if (typeof stopAudio === 'function') stopAudio(); } catch {}
          try { if (v36LastUrl) URL.revokeObjectURL(v36LastUrl); } catch {}
          v36LastUrl = URL.createObjectURL(blob);
          const a = new Audio(v36LastUrl);
          try { curAudio = a; } catch {}
          try { window.curAudio = a; } catch {}
          const timeout = setTimeout(() => { try { a.pause(); } catch {} reject(new Error('timeout de áudio')); }, Math.max(20000, Math.min(300000, blob.size * 13)));
          a.onended = () => { clearTimeout(timeout); resolve(); };
          a.onerror = () => { clearTimeout(timeout); reject(new Error('falha no player de áudio')); };
          a.play().catch(e => { clearTimeout(timeout); reject(e); });
        });
      }

      async function v36Speak(text, kind) {
        text = String(text || '').trim();
        if (!text) return false;
        try { if (typeof setAudioBusy === 'function') setAudioBusy(kind === 'char' ? 'char' : 'natural', true); } catch {}
        try {
          const ssml = v36BuildSsmlAuto(text);
          const blob = await getTtsAudioFromSsml(ssml, v36GetSettings().quality);
          await v36PlayBlob(blob);
          return true;
        } catch (e) {
          console.warn('[v36 voz] falhou', e);
          try { toast('Falha na voz com emoção: ' + (e.message || e)); } catch {}
          return false;
        } finally {
          try { if (typeof setAudioBusy === 'function') setAudioBusy(kind === 'char' ? 'char' : 'natural', false); } catch {}
        }
      }
      window.v36Speak = v36Speak;
      window.v36GetSettings = v36GetSettings;
      window.v36SaveSettings = v36SaveSettings;
      window.v36BuildSsmlAuto = v36BuildSsmlAuto;

      // ---- painel de voz (substitui o painel antigo de Edge TTS) ----
      function v36ClassicVoiceOptions(selected) {
        return VOICES.map(v => `<option value="${v36esc(v.name)}"${v.name===selected?' selected':''}>${v36esc(v.label)}</option>`).join('');
      }
      function v36ClassicStyleOptions(voiceName, selected) {
        const meta = getVoiceMeta(voiceName);
        return meta.styles.map(s => `<option value="${v36esc(s)}"${s===selected?' selected':''}>${v36esc(STYLE_LABELS[s]||s)}</option>`).join('');
      }
      function v36SectionIcon(name) {
        const icons = {
          general: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
          emotion: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
          advanced: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
          chevron: '<polyline points="6 9 12 15 18 9"/>'
        };
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]||''}</svg>`;
      }
      function v36SectionHeader(name, title) {
        return `<div class="h36-section"><span class="h36-section-ico">${v36SectionIcon(name)}</span>${title}</div>`;
      }
      function v36BuildPanelHtml() {
        const s = v36GetSettings();
        const expressiveVoice = s.expressiveVoice || getDefaultExpressiveVoiceName(s.gender, s.dialect);
        const expressiveVoicesForGender = EXPRESSIVE_VOICES.filter(v => v.gender === s.gender);
        return `
          <button type="button" class="h41-acc-h"><span class="h36-acc-h-ico">${v36SectionIcon('emotion')}</span><span>Voz com emoção</span><span class="h36-chev">${v36SectionIcon('chevron')}</span></button>
          <div class="h41-acc-b">
            ${v36SectionHeader('general','Configurações gerais')}
            <div class="h46-row">
              <label class="h46-note" style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="v36-expressive-toggle" ${s.expressiveOn?'checked':''}>
                Ativar voz com emoção (recomendado)
              </label>
            </div>
            <div id="v36-expressive-fields" style="display:${s.expressiveOn?'block':'none'}">
              <div class="h41-tabs">
                <button type="button" class="h41-tab ${s.gender==='F'?'on':''}" data-v36-gender="F">Feminina</button>
                <button type="button" class="h41-tab ${s.gender==='M'?'on':''}" data-v36-gender="M">Masculina</button>
              </div>
              <div class="h46-grid2">
                <div>
                  <div class="h46-lab">Perfil</div>
                  <select class="h46-select" id="v36-dialect">
                    <option value="regional" ${s.dialect==='regional'?'selected':''}>Mais expressivo (regional)</option>
                    <option value="neutral" ${s.dialect==='neutral'?'selected':''}>Sotaque neutro</option>
                  </select>
                </div>
                <div>
                  <div class="h46-lab">Voz</div>
                  <select class="h46-select" id="v36-expressive-voice">
                    ${expressiveVoicesForGender.map(v=>`<option value="${v36esc(v.name)}"${v.name===expressiveVoice?' selected':''}>${v36esc(v.label)}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div id="v36-classic-fields" style="display:${s.expressiveOn?'none':'block'}">
              <div class="h46-grid2">
                <div>
                  <div class="h46-lab">Voz neural (Microsoft)</div>
                  <select class="h46-select" id="v36-classic-voice">${v36ClassicVoiceOptions(s.classicVoice)}</select>
                </div>
                <div>
                  <div class="h46-lab">Estilo</div>
                  <select class="h46-select" id="v36-classic-style">${v36ClassicStyleOptions(s.classicVoice, s.classicStyle)}</select>
                </div>
              </div>
            </div>
            <div class="h46-grid2">
              <div>
                <div class="h46-lab">Qualidade do áudio</div>
                <select class="h46-select" id="v36-quality">
                  <option value="audio-24khz-48kbitrate-mono-mp3" ${s.quality==='audio-24khz-48kbitrate-mono-mp3'?'selected':''}>MP3 24kHz (leve)</option>
                  <option value="audio-48khz-192kbitrate-mono-mp3" ${s.quality==='audio-48khz-192kbitrate-mono-mp3'?'selected':''}>MP3 48kHz (alta)</option>
                </select>
              </div>
              <div>
                <div class="h46-lab">Reforço de volume</div>
                <div class="h46-range"><input id="v36-volume" type="range" min="-20" max="35" step="1" value="${v36esc(s.volumeBoost)}"><output id="v36-volume-out" class="h46-out">${fmtSigned(s.volumeBoost,'%')}</output></div>
              </div>
            </div>

            ${v36SectionHeader('emotion','Modulação emocional')}
            <label class="h46-note" style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="v36-advanced-toggle" ${s.advancedOn?'checked':''}>
              Emoção avançada (camadas de intensidade por palavra-chave)
            </label>
            <div class="v37-audio-note">Combina os pesos de várias palavras-chave de forma ponderada (as mais fortes pesam mais), e dá contorno de tom + ênfase nos pontos de pico da frase.</div>

            <!-- Voz Emocional v3 Beta -->
            <label class="h46-note" style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="v36-emotion-v3-toggle" ${s.emotionV3On?'checked':''}>
              Ativar Voz Emocional v3 Beta
            </label>
            <div class="v37-audio-note">Usa um dicionário emocional expandido para tornar a leitura mais expressiva. Recurso experimental.</div>

            ${v36SectionHeader('advanced','Parâmetros avançados')}
            <div class="h46-grid2">
              <div>
                <div class="h46-lab">Sensibilidade da detecção</div>
                <div class="h46-range"><input id="v36-sensitivity" type="range" min="0.5" max="1.5" step="0.05" value="${v36esc(s.emotionSensitivity)}"><output id="v36-sensitivity-out" class="h46-out">${Math.round(s.emotionSensitivity*100)}%</output></div>
              </div>
              <div>
                <div class="h46-lab">Intensidade dos efeitos</div>
                <div class="h46-range"><input id="v36-intensity" type="range" min="0.5" max="1.5" step="0.05" value="${v36esc(s.emotionIntensity)}"><output id="v36-intensity-out" class="h46-out">${Math.round(s.emotionIntensity*100)}%</output></div>
              </div>
            </div>
            <button type="button" class="h46-mini-btn" id="v36-test-voice">Testar voz</button>
            <div class="h46-status" id="v36-status">Voz com emoção pronta.</div>
          </div>`;
      }

      function v36BindPanel(box) {
        const toggle = box.querySelector('#v36-expressive-toggle');
        const expField = box.querySelector('#v36-expressive-fields');
        const classicField = box.querySelector('#v36-classic-fields');
        if (toggle) toggle.onchange = () => {
          v36SaveSettings({ expressiveOn: toggle.checked });
          if (expField) expField.style.display = toggle.checked ? 'block' : 'none';
          if (classicField) classicField.style.display = toggle.checked ? 'none' : 'block';
        };
        box.querySelectorAll('[data-v36-gender]').forEach(btn => btn.onclick = () => {
          box.querySelectorAll('[data-v36-gender]').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          v36SaveSettings({ gender: btn.dataset.v36Gender, expressiveVoice: '' });
          v36InstallPanel();
        });
        const dialect = box.querySelector('#v36-dialect');
        if (dialect) dialect.onchange = () => { v36SaveSettings({ dialect: dialect.value, expressiveVoice: '' }); v36InstallPanel(); };
        const expVoice = box.querySelector('#v36-expressive-voice');
        if (expVoice) expVoice.onchange = () => v36SaveSettings({ expressiveVoice: expVoice.value });
        const adv = box.querySelector('#v36-advanced-toggle');
        if (adv) adv.onchange = () => { v36SaveSettings({ advancedOn: adv.checked }); v36InstallPanel(); };

        // V3 Beta toggle: ativa ou desativa o dicionário expandido
        const v3toggle = box.querySelector('#v36-emotion-v3-toggle');
        if (v3toggle) v3toggle.onchange = () => {
          v36SaveSettings({ emotionV3On: v3toggle.checked });
          v36InstallPanel();
        };
        const sensitivity = box.querySelector('#v36-sensitivity');
        if (sensitivity) sensitivity.oninput = () => { const val = Number(sensitivity.value); v36SaveSettings({ emotionSensitivity: val }); const out = box.querySelector('#v36-sensitivity-out'); if (out) out.textContent = Math.round(val*100) + '%'; };
        const intensity = box.querySelector('#v36-intensity');
        if (intensity) intensity.oninput = () => { const val = Number(intensity.value); v36SaveSettings({ emotionIntensity: val }); const out = box.querySelector('#v36-intensity-out'); if (out) out.textContent = Math.round(val*100) + '%'; };
        const classicVoice = box.querySelector('#v36-classic-voice');
        if (classicVoice) classicVoice.onchange = () => { v36SaveSettings({ classicVoice: classicVoice.value }); v36InstallPanel(); };
        const classicStyle = box.querySelector('#v36-classic-style');
        if (classicStyle) classicStyle.onchange = () => v36SaveSettings({ classicStyle: classicStyle.value });
        const volume = box.querySelector('#v36-volume');
        if (volume) volume.oninput = () => { v36SaveSettings({ volumeBoost: Number(volume.value) }); const out = box.querySelector('#v36-volume-out'); if (out) out.textContent = fmtSigned(Number(volume.value), '%'); };
        const quality = box.querySelector('#v36-quality');
        if (quality) quality.onchange = () => v36SaveSettings({ quality: quality.value });
        const test = box.querySelector('#v36-test-voice');
        if (test) test.onclick = async () => {
          const st = box.querySelector('#v36-status');
          if (st) st.textContent = 'Testando voz com emoção...';
          try { await v36Speak('我做了一个很奇怪的梦，醒来的时候松了一口气。', 'sentence'); if (st) st.textContent = 'Teste concluído.'; }
          catch (e) { if (st) st.textContent = 'Falha no teste: ' + (e.message || e); }
        };
        box.querySelectorAll('.h41-acc-h').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
      }
      function v36InstallPanel() {
        const ms = document.querySelector('#mo-style #style-scroll');
        if (!ms) return;
        try { document.getElementById('h41-voice')?.remove(); } catch {}
        try { document.getElementById('h41-voice-settings')?.remove(); } catch {}
        let box = document.getElementById('v36-voice-box');
        if (!box) { ms.insertAdjacentHTML('beforeend', '<div class="h41-acc h46-open open" id="v36-voice-box"></div>'); box = document.getElementById('v36-voice-box'); }
        box.innerHTML = v36BuildPanelHtml();
        v36BindPanel(box);
      }
      window.v36InstallPanel = v36InstallPanel;

      // ---- patch final: reassume fetchText/importURL (fase 1) e voz (fase 2) ----
      function v36FinalPatch() {
        // fase 1: extração de link — reafirma por cima de H46/H48
        try {
          if (typeof window.fetchTextAdvanced === 'function') {
            fetchText = async function (url) {
              const r = await window.fetchTextAdvanced(url);
              const clean = cleanRaw(r.text);
              if (!clean || clean.length < 20) throw new Error('texto insuficiente extraído da página');
              fetchText._lastTitle = r.title;
              return clean;
            };
            window.fetchText = fetchText;
            importURL = async function (url) {
              showLoad('Extraindo texto...');
              try {
                const text = await fetchText(url);
                const host = (() => { try { return new URL(url).hostname; } catch { return url; } })();
                const guessedTitle = fetchText._lastTitle;
                const title = (guessedTitle && guessedTitle.length < 90 && guessedTitle !== url) ? guessedTitle : (() => {
                  const lines = text.split('\n').filter(l => l.trim());
                  return lines[0] && lines[0].length < 80 ? lines[0] : host;
                })();
                const r = await v37AutoSaveText(title, host, text, 'url');
                closeModals(); toast(r.kind === 'book' ? 'Texto longo — adicionado aos Livros!' : 'Importado!'); await loadLib();
              } catch (e) { toast('Erro: ' + e.message); }
              finally { hideLoad(); }
            };
            window.importURL = importURL;
          }
        } catch (e) { console.warn('[v36] falha ao reafirmar fetchText/importURL', e); }

        // fase 2: voz com emoção — reassume por cima de H46/H48/h42
        try {
          window.v36Speak = v36Speak; // exporta a voz principal (motor emocional + Voz Natural v2 por padrão)
          window.speakWordMode = function (word, mode) { const cjkLen = (typeof isCJK === 'function') ? [...String(word)].filter(isCJK).length : [...String(word)].length; return v36Speak(word, cjkLen <= 1 ? 'char' : 'compound'); };
          window.speakWord = function (word) { return window.speakWordMode(word, 'natural'); };
          speakWordMode = window.speakWordMode;
          speakWord = window.speakWord;
          window.h36Speak = function (text) { return v36Speak(text, 'compound'); };
          h36Speak = window.h36Speak;
          window.hr39SpeakWhole = window.h36Speak;
          window.v30SpeakSentence = function (key) { const d = (window.V30_SENT_AUDIO || {})[key]; return v36Speak((d && d.zh) || key, 'sentence'); };
          // H48 (dock/leitura completa e seleção) lê estas globais:
          window.h42Settings = function () { return v36GetSettings(); };
          window.h42BuildSsml = function (text) { return v36BuildSsmlAuto(text); };
          window.h42AudioFromSsml = function (ssml, o) { return getTtsAudioFromSsml(ssml, (o && o.quality) || v36GetSettings().quality); };
        } catch (e) { console.warn('[v36] falha ao reafirmar voz', e); }

        try { v36InstallPanel(); } catch (e) { console.warn('[v36] falha ao instalar painel de voz', e); }
        try { const about = document.querySelector('#ss .ssub[style*="color:#8a8a8a"]'); if (about) about.textContent = 'v4.9 · Sr. Hell'; } catch {}

        // O resolvedor H52 é a camada final compartilhada pelas três abas. As
        // reafirmações legadas de v36 continuam úteis durante o boot antigo, mas não
        // podem reassumir o dicionário depois que a camada final já foi montada.
        if (v29RenderDictWords && v29RenderDictWords.__h52Final && v29RenderDictSentences && v29RenderDictSentences.__h52Final) return;

        // v39: a tela de Dicionário (aba própria, separada do popup de leitura) usava um
        // pipeline mais antigo (h42DictData/hr39*) que dependia só da Sogou via proxy — quando
        // ela falhava, aparecia a mensagem padrão de "nenhuma fonte respondeu". Reaproveita aqui
        // o mesmo pipeline multi-fonte (CC-CEDICT + Sogou + Tatoeba) já validado no popup de
        // leitura, para que a tela de Dicionário use exatamente a mesma lógica que já funciona bem.
        try {
          v29RenderDictDefs = async function(q, out) {
            q = String(q || '').trim();
            if (!out) return;
            if (!q) { out.innerHTML = '<div class="dict-empty">Pesquise uma palavra ou ideograma.</div>'; return; }
            const myToken = (v39DictSearchToken = (v39DictSearchToken || 0) + 1);
            const py = (typeof getWordPY === 'function' ? getWordPY(q) : '') || '';
            const playIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
            // Fase 1 — nada disso depende de rede, então aparece na hora: palavra,
            // pinyin e os botões de ouvir/salvar já ficam prontos pra usar
            // enquanto as definições ainda estão sendo buscadas.
            out.innerHTML = `<div class="dict-results-lexi"><div class="lexi-hero"><div class="lexi-word-col"><div class="lexi-zh ${[...q].length > 3 ? 'small' : ''}">${v40WordDisplayHtml(q)}</div><div class="lexi-py">${esc(py)}</div><div class="lexi-source-label" id="lexi-source-label"></div></div><div id="dict-stroke-slot"></div><div class="lexi-hero-actions"><button class="dict-audio v34-svg-only" id="dict-main-audio">${playIcon}</button>${v39SaveButtonHtml(q)}</div></div><div id="dict-steps-section"></div><div id="dict-defs-slot"><div class="lexi-entry"><div class="spin sm" style="margin:6px auto"></div></div></div></div>`;
            if ([...q].filter(isCJK).length === 1) {
              (async () => {
                let stroke = null;
                try { stroke = await lookupStrokeOrder(q); } catch {}
                if (myToken !== v39DictSearchToken) return;
                const slot = document.getElementById('dict-stroke-slot');
                if (!slot) return;
                if (!stroke || !stroke.gif) {
                  // Sem GIF disponível pra este ideograma: mostra um placeholder
                  // no lugar, pra não deixar um espaço quebrado/vazio, e não
                  // mostra o botão de Passos (não tem o que expandir).
                  slot.innerHTML = `<div class="lexi-stroke-wrap"><div class="lexi-stroke-card lexi-stroke-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M12 8v8" opacity=".4"/></svg></div></div>`;
                  return;
                }
                slot.innerHTML = `<div class="lexi-stroke-wrap"><div class="lexi-stroke-card" id="lexi-gif-card"><img src="${esc(stroke.gif)}" alt="Ordem dos traços" class="v41-enhance-img"></div>${stroke.strokeDiagram && stroke.strokeCount ? `<button class="lexi-steps-btn" id="lexi-steps-toggle">Passos<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>` : ''}</div>`;
                const gifCard = document.getElementById('lexi-gif-card');
                if (gifCard) gifCard.onclick = () => v41OpenGifModal(stroke.gif, q);
                const toggleBtn = document.getElementById('lexi-steps-toggle');
                const stepsSection = document.getElementById('dict-steps-section');
                if (toggleBtn && stepsSection) {
                  let loaded = false, slices = [], expanded = false;
                  const renderRow = () => {
                    stepsSection.innerHTML = `<div class="lexi-steps-block"><button class="lexi-steps-expand-btn" id="lexi-steps-expand">Expandir<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button><div class="lexi-steps-row">${slices.map((s, i) => `<img src="${s}" alt="Passo ${i + 1}" data-step-idx="${i}">`).join('')}</div></div>`;
                    document.getElementById('lexi-steps-expand').onclick = () => { expanded = true; renderGrid(); };
                    bindStepClicks();
                  };
                  const renderGrid = () => {
                    stepsSection.innerHTML = `<div class="lexi-steps-block"><button class="lexi-steps-expand-btn" id="lexi-steps-collapse">Recolher<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button><div class="lexi-steps-grid">${slices.map((s, i) => `<img src="${s}" alt="Passo ${i + 1}" data-step-idx="${i}">`).join('')}</div></div>`;
                    document.getElementById('lexi-steps-collapse').onclick = () => { expanded = false; renderRow(); };
                    bindStepClicks();
                  };
                  const bindStepClicks = () => {
                    stepsSection.querySelectorAll('[data-step-idx]').forEach(im => im.onclick = () => v41OpenStepModal(slices, parseInt(im.dataset.stepIdx, 10)));
                  };
                  toggleBtn.onclick = async () => {
                    toggleBtn.classList.toggle('open');
                    const nowOpen = toggleBtn.classList.contains('open');
                    if (!nowOpen) { stepsSection.innerHTML = ''; return; }
                    if (!loaded) {
                      stepsSection.innerHTML = `<div class="lexi-steps-block"><div class="spin sm" style="margin:14px auto"></div></div>`;
                      loaded = true;
                      slices = await v41SliceStrokeGuide(stroke.strokeDiagram, parseInt(stroke.strokeCount, 10));
                      if (!slices.length) { stepsSection.innerHTML = '<div class="lexi-entry"><div class="dict-empty">Não foi possível carregar os passos agora.</div></div>'; return; }
                    }
                    expanded ? renderGrid() : renderRow();
                  };
                }
              })();
            }
            const mainBtn = document.getElementById('dict-main-audio');
            if (mainBtn) mainBtn.onclick = async () => {
              if (mainBtn.disabled) return;
              const original = mainBtn.innerHTML;
              mainBtn.disabled = true; mainBtn.innerHTML = '<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';
              try { await speakWordMode(q, 'natural'); } catch {}
              finally { mainBtn.disabled = false; mainBtn.innerHTML = original; }
            };
            v39BindSaveButtons(out);
            // Fase 2 — busca de verdade; se o usuário já pesquisou outra coisa
            // enquanto isso (myToken ficou desatualizado), não sobrescreve a tela.
            let result = null;
            try { result = window.resolveDictionaryEntry ? await window.resolveDictionaryEntry(q) : await lookupAll(q); } catch {}
            if (myToken !== v39DictSearchToken) return;
            const slot = document.getElementById('dict-defs-slot');
            if (!slot) return;
            const heroSrc = document.getElementById('lexi-source-label');
            if (heroSrc && result && result.src) heroSrc.textContent = result.src;
            let html = '';
            if (result && result.defs && result.defs.length) {
              const allPyHints = new Set();
              result.defs.forEach(s => (s.defs || []).forEach(d => { if (d.pyHint) allPyHints.add(d.pyHint); }));
              const hasMultipleReadings = allPyHints.size > 1;
              let counter = 0;
              result.defs.slice(0, 6).forEach(s => {
                html += `<div class="lexi-entry">`;
                if (s.pos) html += `<div class="lexi-pos">${esc(s.pos)}</div>`;
                (s.defs || []).slice(0, 6).forEach(d => {
                  counter++;
                  const readingNote = hasMultipleReadings && d.pyHint ? ` <span class="lexi-def-reading">— ${esc(q)}: ${esc(d.pyHint)}</span>` : '';
                  html += `<div class="lexi-def"><div class="lexi-def-label">Definição ${counter}${readingNote}</div>${v39TransButton(d.text)}</div>`;
                });
                html += `</div>`;
              });
            } else {
              html += `<div class="dict-empty">Sem definição encontrada nos bancos atuais para este termo.</div>`;
            }
            const grammarMatches = v42FindGrammar(q);
            if (grammarMatches.length) {
              html += grammarMatches.map(g => `<div class="lexi-entry"><div class="lexi-section-title">Gramática — ${esc(g.title)} <span style="opacity:.6;text-transform:none;font-weight:700">· ${esc(g.level)}</span></div><div class="lexi-grammar-pattern">${esc(g.pattern)}</div><div class="lexi-def" style="border-bottom:0">${esc(g.explanation)}</div><div class="lexi-grammar-ex"><div class="lexi-grammar-ex-zh">${esc(g.example)}</div><div class="lexi-grammar-ex-tr">${esc(g.exampleTr)}</div></div></div>`).join('');
            }
            if (result && result.charDefs && result.charDefs.length) {
              html += `<div class="lexi-entry"><div class="lexi-section-title">Ideograma por ideograma</div>`;
              html += result.charDefs.map(c => `<div class="lexi-def"><b>${esc(c.ch)}</b> — ${c.text ? v39TransButton(c.text) : '—'}</div>`).join('');
              html += `</div>`;
            }
            let relatedTerms = [];
            if (result && result.sogou && result.sogou.length) {
              relatedTerms = result.sogou.map(s => s.word).filter(Boolean).slice(0, 10);
              html += `<div class="lexi-entry"><div class="lexi-section-title">Termos relacionados</div><div class="lexi-acc-hint">Toque numa palavra para ver a definição completa</div>`;
              html += relatedTerms.map((w, i) => `<div class="lexi-acc-row" data-acc-idx="${i}"><div class="lexi-acc-row-label">${v40WordDisplayHtml(w)}</div>${v39SaveButtonHtml(w)}<svg class="lexi-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="lexi-acc-panel" id="acc-panel-${i}"></div>`).join('');
              html += `</div>`;
            }
            slot.innerHTML = html;
            v39BindTransButtons(slot);
            v39BindSaveButtons(slot);
            v39BindAccordion(slot, relatedTerms);
          };
          v29RenderDictWords = async function(q, out) {
            q = String(q || '').trim();
            if (!out) return;
            if (!q) { out.innerHTML = '<div class="dict-empty">Pesquise uma palavra ou ideograma.</div>'; return; }
            out.innerHTML = '<div class="dict-card"><div class="spin sm" style="margin:0 auto"></div></div>';
            const qChars = [...q].filter(isCJK);
            const local = [...new Set([...HSK_LEVEL.keys(), ...SEG_WORDS])].filter(w => w !== q && w.length > 1 && qChars.some(ch => w.includes(ch)));
            let sogouWords = [];
            try { sogouWords = (await lookupSogouSuggestions(q)).map(s => s.word).filter(w => w && w !== q); } catch {}
            const combined = [...new Set([...sogouWords, ...local])].slice(0, 60);
            if (!combined.length) { out.innerHTML = '<div class="dict-empty">Não encontrei palavras relacionadas a este termo.</div>'; return; }
            const playIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
            const html = '<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que usam “' + esc(q) + '”</div><div class="lexi-acc-hint" style="margin:0 0 8px">Toque numa palavra para ver a definição completa</div><div class="lexi-entry">' + combined.map((w, i) => {
              const wpy = (typeof getWordPY === 'function' ? getWordPY(w) : '') || '';
              const lv = HSK_LEVEL.get(w);
              return `<div class="lexi-acc-row" data-acc-idx="${i}"><div class="lexi-acc-row-label">${v40WordDisplayHtml(w)}<span style="color:#8a8170;font-size:12px;margin-left:8px">${esc(wpy)}${lv ? ' • HSK ' + lv : ''}</span></div>${v39SaveButtonHtml(w)}<button class="dict-audio v34-svg-only" data-word-idx="${i}" style="margin-right:6px">${playIcon}</button><svg class="lexi-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="lexi-acc-panel" id="acc-panel-${i}"></div>`;
            }).join('') + '</div></div>';
            out.innerHTML = html;
            out.querySelectorAll('[data-word-idx]').forEach(btn => {
              const w = combined[parseInt(btn.dataset.wordIdx)];
              if (!w) return;
              btn.onclick = async (e) => {
                e.stopPropagation();
                if (btn.disabled) return;
                const original = btn.innerHTML;
                btn.disabled = true; btn.innerHTML = '<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';
                try { await speakWordMode(w, 'natural'); }
                catch (err) { try { toast('Falha ao reproduzir: ' + (err.message || err)); } catch {} }
                finally { btn.disabled = false; btn.innerHTML = original; }
              };
            });
            v39BindSaveButtons(out);
            v39BindAccordion(out, combined);
          };
          v29RenderDictSentences = async function(q, out) {
            q = String(q || '').trim();
            if (!out) return;
            if (!q) { out.innerHTML = '<div class="dict-empty">Pesquise uma palavra ou ideograma.</div>'; return; }
            out.innerHTML = '<div class="dict-empty"><div class="spin sm"></div><small>Buscando frases…</small></div>';
            let sents = [];
            try { sents = await lookupTatoebaExamples(q, 15); } catch {}
            const localBanks = [];
            try { if (typeof V34_SENTENCES !== 'undefined') localBanks.push(...V34_SENTENCES); } catch {}
            try { if (typeof V29_LOCAL_SENTENCES !== 'undefined') localBanks.push(...V29_LOCAL_SENTENCES.map(s => ({ text: s.zh, translations: s.tr ? [s.tr] : [] }))); } catch {}
            for (const s of localBanks) { if (s.text && s.text.includes(q) && !sents.some(x => x.text === s.text)) sents.push(s); }
            sents = sents.filter(s => s.text && s.text.includes(q)).slice(0, 20);
            if (!sents.length) { out.innerHTML = '<div class="dict-empty">Não encontrei frases que contenham exatamente este termo agora.</div>'; return; }
            const playIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
            const html = '<div class="dict-results-lexi"><div class="dict-subtitle">Frases com “' + esc(q) + '”</div>' + sents.map((s, i) => {
              const spy = (typeof getWordPY === 'function' ? getWordPY(s.text) : '') || '';
              return `<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${v41RenderSentenceWithHighlight(s.text, q)}</div><div class="sent-py"><b>${esc(spy)}</b></div></div><div class="hz-sent-actions"><button class="dict-audio v34-svg-only" data-sent-idx="${i}">${playIcon}</button>${v41SaveSentenceButtonHtml(s.text, s.translations, q)}</div></div><div class="sent-tr">${s.translations && s.translations.length ? esc(s.translations[0]) : 'Tradução indisponível nesta fonte.'}</div><div class="sent-src">Tatoeba • contém “${esc(q)}”</div></div>`;
            }).join('') + '</div>';
            out.innerHTML = html;
            v41BindSaveSentenceButtons(out);
            // Cada botão tem seu próprio handler, fechando sobre a frase certa (s.text) e
            // com seu próprio estado de "tocando" — um botão nunca afeta o estado visual
            // dos outros. Frases usam a voz emocional/avançada (v36Speak com kind='sentence'),
            // igual ao botão de Ler dentro da leitura, em vez do classificador de palavra
            // (que nunca escolhe 'sentence' para textos com mais de 1 caractere).
            out.querySelectorAll('[data-sent-idx]').forEach(btn => {
              const s = sents[parseInt(btn.dataset.sentIdx)];
              if (!s) return;
              btn.onclick = async (e) => {
                e.stopPropagation();
                if (btn.disabled) return;
                const original = btn.innerHTML;
                btn.disabled = true; btn.innerHTML = '<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';
                try {
                  if (typeof window.v36Speak === 'function') await window.v36Speak(s.text, 'sentence');
                  else await speakWordMode(s.text, 'natural');
                } catch (err) { try { toast('Falha ao reproduzir: ' + (err.message || err)); } catch {} }
                finally { btn.disabled = false; btn.innerHTML = original; }
              };
            });
          };
        } catch (e) { console.warn('[v39] falha ao reafirmar dicionário', e); }
      }

      function v36Boot() {
        // roda depois de H46 (até 1800ms) e H48 (até 3600ms) para vencer a race de reatribuição
        v36FinalPatch();
        setTimeout(v36FinalPatch, 900);
        setTimeout(v36FinalPatch, 2200);
        setTimeout(v36FinalPatch, 4200);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', v36Boot);
      else v36Boot();
})();


/* ===== hz-practice-module ===== */
/* Prática: hub (músicas + jogo de tons), fundo artístico e integração de voz. */
(function(){
const HZP_GAME_B64='PCFkb2N0eXBlIGh0bWw+CjxodG1sIGxhbmc9InB0LUJSIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9InV0Zi04IiAvPgo8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEsIHZpZXdwb3J0LWZpdD1jb3ZlciwgaW50ZXJhY3RpdmUtd2lkZ2V0PXJlc2l6ZXMtY29udGVudCIgLz4KPHRpdGxlPlBpbnlpbiBUb25lIExhYjwvdGl0bGU+CjxzdHlsZT4KICA6cm9vdHsKICAgIGNvbG9yLXNjaGVtZTogZGFyazsKICAgIC0tYmc6IzAwMDsKICAgIC0tc3VyZmFjZTojMGYxMDEyOwogICAgLS1zdXJmYWNlLTI6IzE1MTYxYTsKICAgIC0tc3VyZmFjZS0zOiMxYjFjMjA7CiAgICAtLWxpbmU6cmdiYSgyMDksMjEzLDIxOSwuNjIpOwogICAgLS1saW5lLXNvZnQ6cmdiYSgyMDksMjEzLDIxOSwuMjgpOwogICAgLS10eHQ6I2Y1ZjVmNzsKICAgIC0tbXV0ZWQ6I2E0YThiMjsKICAgIC0tbXV0ZWQyOiM3Mzc3ODI7CiAgICAtLXNpbHZlcjojZDFkNWRiOwogICAgLS1nb29kOiNhOGY0YzY7CiAgICAtLWJhZDojZmY5YmE3OwogICAgLS1yYWRpdXM6OXB4OwogICAgLS1zaGFkb3c6MCAyMnB4IDcwcHggcmdiYSgwLDAsMCwuNTQpOwogIH0KCiAgKntib3gtc2l6aW5nOmJvcmRlci1ib3g7LXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50fQogIGh0bWwsYm9keXtoZWlnaHQ6MTAwJTttaW4taGVpZ2h0OjEwMCU7bWFyZ2luOjA7YmFja2dyb3VuZDojMDAwO2NvbG9yOnZhcigtLXR4dCk7Zm9udC1mYW1pbHk6SW50ZXIsdWktc2Fucy1zZXJpZixzeXN0ZW0tdWksLWFwcGxlLXN5c3RlbSxCbGlua01hY1N5c3RlbUZvbnQsIlNlZ29lIFVJIixSb2JvdG8sQXJpYWwsc2Fucy1zZXJpZjtvdmVyZmxvdzpoaWRkZW47fQogIGJvZHl7CiAgICBtaW4taGVpZ2h0OjEwMGR2aDsKICAgIGJhY2tncm91bmQ6CiAgICAgIHJhZGlhbC1ncmFkaWVudChjaXJjbGUgYXQgNTAlIC0yMCUscmdiYSgxMTAsMTE2LDEzMCwuMTYpLHRyYW5zcGFyZW50IDM0JSksCiAgICAgIGxpbmVhci1ncmFkaWVudCgxODBkZWcsIzExMTIxNSAwJSwjMDcwNzA4IDQyJSwjMDAwIDEwMCUpOwogIH0KICBidXR0b24saW5wdXQsc2VsZWN0e2ZvbnQ6aW5oZXJpdDtjb2xvcjppbmhlcml0fQogIGJ1dHRvbntib3JkZXI6MDtiYWNrZ3JvdW5kOm5vbmU7Y3Vyc29yOnBvaW50ZXJ9CgogIC5zY3JlZW57ZGlzcGxheTpub25lO21pbi1oZWlnaHQ6MTAwZHZoO3dpZHRoOjEwMCU7cGFkZGluZzoxNHB4O30KICAuc2NyZWVuLmFjdGl2ZXtkaXNwbGF5OmZsZXh9CgogIC5ob21le2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO292ZXJmbG93OmF1dG87fQogIC5ob21lLWNhcmR7CiAgICB3aWR0aDptaW4oMTAwJSw1NDBweCk7CiAgICBtYXgtaGVpZ2h0OmNhbGMoMTAwZHZoIC0gMjhweCk7CiAgICBvdmVyZmxvdzphdXRvOwogICAgYm9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lLXNvZnQpOwogICAgYm9yZGVyLXJhZGl1czp2YXIoLS1yYWRpdXMpOwogICAgYmFja2dyb3VuZDpyZ2JhKDE0LDE1LDE3LC45Nik7CiAgICBib3gtc2hhZG93OnZhcigtLXNoYWRvdyk7CiAgICBwYWRkaW5nOjIwcHg7CiAgfQogIC5icmFuZC1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmZsZXgtc3RhcnQ7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47Z2FwOjE0cHg7bWFyZ2luLWJvdHRvbToxNnB4fQogIC5icmFuZCBoMXttYXJnaW46MDtmb250LXNpemU6MjZweDtsZXR0ZXItc3BhY2luZzotLjAyZW07Zm9udC13ZWlnaHQ6NzgwO2xpbmUtaGVpZ2h0OjEuMDZ9CiAgLmJyYW5kIHB7bWFyZ2luOjhweCAwIDA7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtc2l6ZToxM3B4O2xpbmUtaGVpZ2h0OjEuNDI7bWF4LXdpZHRoOjM0ZW19CiAgLmJlc3QtYm94e21pbi13aWR0aDo4NnB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtib3JkZXItcmFkaXVzOjhweDtwYWRkaW5nOjlweCAxMXB4O3RleHQtYWxpZ246cmlnaHQ7YmFja2dyb3VuZDojMTAxMTE0O30KICAuYmVzdC1ib3ggc3BhbntkaXNwbGF5OmJsb2NrO2NvbG9yOnZhcigtLW11dGVkMik7Zm9udC1zaXplOjEwcHg7bGV0dGVyLXNwYWNpbmc6LjE0ZW07dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0Ojc4MH0KICAuYmVzdC1ib3ggc3Ryb25ne2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjI4cHg7bGluZS1oZWlnaHQ6MS4wNTttYXJnaW4tdG9wOjNweH0KCiAgLmZpZWxke21hcmdpbjoxNnB4IDAgMH0KICAuZmllbGQtbGFiZWx7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6MTJweDttYXJnaW46MCAwIDhweDtjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC1zaXplOjExcHg7bGV0dGVyLXNwYWNpbmc6LjEzZW07dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0OjgwMH0KICAuZmllbGQtbGFiZWwgc21hbGx7bGV0dGVyLXNwYWNpbmc6MDt0ZXh0LXRyYW5zZm9ybTpub25lO2ZvbnQtd2VpZ2h0OjYyMDtjb2xvcjp2YXIoLS1tdXRlZDIpfQogIC5zZWd7ZGlzcGxheTpncmlkO2dhcDo3cHh9CiAgLnNlZy5jb2xzLTJ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgyLG1pbm1heCgwLDFmcikpfQogIC5zZWcuY29scy0ze2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMyxtaW5tYXgoMCwxZnIpKX0KICAuc2VnLmNvbHMtNHtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDQsbWlubWF4KDAsMWZyKSl9CiAgLnNlZyBidXR0b257CiAgICBtaW4taGVpZ2h0OjQycHg7CiAgICBib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUtc29mdCk7CiAgICBib3JkZXItcmFkaXVzOjhweDsKICAgIGJhY2tncm91bmQ6IzBiMGMwZTsKICAgIGNvbG9yOnZhcigtLW11dGVkKTsKICAgIGZvbnQtc2l6ZToxM3B4OwogICAgZm9udC13ZWlnaHQ6NzIwOwogICAgdHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjE0cyBlYXNlLGJhY2tncm91bmQgLjE0cyBlYXNlLGNvbG9yIC4xNHMgZWFzZSxib3gtc2hhZG93IC4xNHMgZWFzZTsKICB9CiAgLnNlZyBidXR0b246aG92ZXJ7Ym9yZGVyLWNvbG9yOnZhcigtLWxpbmUpO2NvbG9yOnZhcigtLXR4dCk7YmFja2dyb3VuZDojMTIxMzE2fQogIC5zZWcgYnV0dG9uLmFjdGl2ZXtjb2xvcjojZmZmO2JvcmRlci1jb2xvcjpyZ2JhKDI1NSwyNTUsMjU1LC45KTtiYWNrZ3JvdW5kOiMxNzE4MWM7Ym94LXNoYWRvdzppbnNldCAwIDAgMThweCByZ2JhKDI1NSwyNTUsMjU1LC4wNiksIGluc2V0IDAgMXB4IDAgcmdiYSgyNTUsMjU1LDI1NSwuMTApfQoKICAuc3RhcnQtcm93e2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIGF1dG87Z2FwOjlweDttYXJnaW4tdG9wOjIwcHh9CiAgLnN0YXJ0LWJ0biwubWluaS1idG57aGVpZ2h0OjUwcHg7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LC44OCk7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojZjJmM2Y1O2NvbG9yOiMwNTA1MDY7Zm9udC13ZWlnaHQ6ODUwO2xldHRlci1zcGFjaW5nOi4wMWVtO30KICAubWluaS1idG57d2lkdGg6NTZweDtiYWNrZ3JvdW5kOiMwZDBlMTA7Y29sb3I6dmFyKC0tdHh0KTtib3JkZXItY29sb3I6dmFyKC0tbGluZS1zb2Z0KTtmb250LXNpemU6MTlweH0KICAuaGludHttYXJnaW46MTJweCAycHggMDtjb2xvcjp2YXIoLS1tdXRlZDIpO2ZvbnQtc2l6ZToxMnB4O2xpbmUtaGVpZ2h0OjEuNDh9CgogIC5nYW1le2FsaWduLWl0ZW1zOnN0cmV0Y2g7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjA7b3ZlcmZsb3c6aGlkZGVuO30KICAuZ2FtZS1zaGVsbHtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDoxMDAlO2hlaWdodDoxMDBkdmg7bWluLWhlaWdodDoxMDBkdmg7bWF4LWhlaWdodDoxMDBkdmg7ZGlzcGxheTpmbGV4O2ZsZXgtZGlyZWN0aW9uOmNvbHVtbjtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcsIzBiMGMwZSAwJSwjMDMwMzA0IDU0JSwjMDAwIDEwMCUpO292ZXJmbG93OmhpZGRlbjt9CgogIEBtZWRpYSAobWluLXdpZHRoOjc2MHB4KXsKICAgIGJvZHl7b3ZlcmZsb3c6YXV0b30KICAgIC5nYW1le3BhZGRpbmc6MjhweDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtvdmVyZmxvdzphdXRvfQogICAgLmdhbWUtc2hlbGx7d2lkdGg6bWluKDEwMCUsNjYwcHgpO2hlaWdodDptaW4oODYwcHgsY2FsYygxMDBkdmggLSA1NnB4KSk7bWluLWhlaWdodDowO21heC1oZWlnaHQ6Y2FsYygxMDBkdmggLSA1NnB4KTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUtc29mdCk7Ym9yZGVyLXJhZGl1czp2YXIoLS1yYWRpdXMpO2JveC1zaGFkb3c6dmFyKC0tc2hhZG93KTtvdmVyZmxvdzpoaWRkZW47fQogIH0KCiAgLmdhbWUtdG9we2ZsZXg6MCAwIGF1dG87ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczozOHB4IDFmciBhdXRvIDM4cHg7Z2FwOjEwcHg7YWxpZ24taXRlbXM6Y2VudGVyO21pbi1oZWlnaHQ6NTRweDtwYWRkaW5nOjhweCBtYXgoMTJweCxlbnYoc2FmZS1hcmVhLWluc2V0LWxlZnQpKSA4cHggbWF4KDEycHgsZW52KHNhZmUtYXJlYS1pbnNldC1yaWdodCkpO2JvcmRlci1ib3R0b206MXB4IHNvbGlkIHJnYmEoMjA5LDIxMywyMTksLjE1KTtiYWNrZ3JvdW5kOiMxMDExMTQ7fQogIC5pY29uLWJ0bnt3aWR0aDozOHB4O2hlaWdodDozOHB4O2JvcmRlci1yYWRpdXM6OHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtiYWNrZ3JvdW5kOiMwYjBjMGU7Y29sb3I6I2ZmZjtmb250LXNpemU6MjBweDtmb250LXdlaWdodDo3MDA7ZGlzcGxheTpncmlkO3BsYWNlLWl0ZW1zOmNlbnRlcjt9CiAgLmljb24tYnRuOmFjdGl2ZXt0cmFuc2Zvcm06c2NhbGUoLjk3KX0KICAucmVwbGF5LWJ0bntmb250LXNpemU6MTVweDtqdXN0aWZ5LXNlbGY6c3RhcnR9CiAgLnNjb3JlYm94e3RleHQtYWxpZ246Y2VudGVyO2xpbmUtaGVpZ2h0OjE7anVzdGlmeS1zZWxmOmNlbnRlcn0KICAuc2NvcmVib3ggc3BhbiwucmVjb3JkYm94IHNwYW57ZGlzcGxheTpibG9jaztjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC1zaXplOjEwcHg7bGV0dGVyLXNwYWNpbmc6LjEyZW07dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0Ojc4MDttYXJnaW4tYm90dG9tOjNweH0KICAuc2NvcmVib3ggc3Ryb25ne2ZvbnQtc2l6ZToyOHB4fS5yZWNvcmRib3h7dGV4dC1hbGlnbjpyaWdodDtsaW5lLWhlaWdodDoxO21pbi13aWR0aDo1OHB4fS5yZWNvcmRib3ggc3Ryb25ne2ZvbnQtc2l6ZToyMnB4O2NvbG9yOiNkOWRlZWF9CgogIC5jaGFsbGVuZ2V7ZmxleDoxIDEgYXV0bzttaW4taGVpZ2h0OjA7cGFkZGluZzoxMnB4IG1heCgxMnB4LGVudihzYWZlLWFyZWEtaW5zZXQtbGVmdCkpIG1heCgxMnB4LGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSkgbWF4KDEycHgsZW52KHNhZmUtYXJlYS1pbnNldC1yaWdodCkpO2Rpc3BsYXk6ZmxleDtmbGV4LWRpcmVjdGlvbjpjb2x1bW47b3ZlcmZsb3cteTphdXRvO292ZXJzY3JvbGwtYmVoYXZpb3I6Y29udGFpbjtzY3JvbGxiYXItd2lkdGg6bm9uZTt9CiAgLmNoYWxsZW5nZTo6LXdlYmtpdC1zY3JvbGxiYXJ7ZGlzcGxheTpub25lfQogIC50YXNrLWhlYWR7ZmxleDowIDAgYXV0bzt0ZXh0LWFsaWduOmNlbnRlcjttYXJnaW46MCAwIDEwcHg7cG9zaXRpb246cmVsYXRpdmU7ei1pbmRleDoyfQogIC50YXNrLWhlYWQgLmtpY2tlcntjb2xvcjp2YXIoLS1tdXRlZDIpO2ZvbnQtc2l6ZTo5cHg7bGV0dGVyLXNwYWNpbmc6LjE4ZW07dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2ZvbnQtd2VpZ2h0Ojg1MH0KICAudGFzay1oZWFkIGgye21hcmdpbjozcHggMCAwO2ZvbnQtc2l6ZTpjbGFtcCgyNHB4LDcuMXZ3LDM2cHgpO2xpbmUtaGVpZ2h0OjEuMDU7Zm9udC13ZWlnaHQ6ODUwO2xldHRlci1zcGFjaW5nOi0uMDNlbX0KCiAgLmNob2ljZS13cmFwe2ZsZXg6MSAxIGF1dG87bWluLWhlaWdodDowO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjAgMCA2cHg7fQogIC5jaG9pY2UtZ3JpZHt3aWR0aDoxMDAlO2Rpc3BsYXk6Z3JpZDtnYXA6MTBweDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjthbGlnbi1jb250ZW50OmNlbnRlcjtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDIsdmFyKC0tY2hvaWNlLWNlbGwpKTstLWNob2ljZS1jZWxsOm1pbig0MnZ3LCAxNjZweCk7fQogIC5jaG9pY2UtZ3JpZC5jb3VudC0yey0tY2hvaWNlLWNlbGw6bWluKDQydncsIDIxMHB4KX0KICAuY2hvaWNlLWdyaWQuY291bnQtMywuY2hvaWNlLWdyaWQuY291bnQtNHstLWNob2ljZS1jZWxsOm1pbig0MnZ3LCAxNzhweCl9CiAgLmNob2ljZS1ncmlkLmNvdW50LTUsLmNob2ljZS1ncmlkLmNvdW50LTZ7LS1jaG9pY2UtY2VsbDptaW4oNDJ2dywgY2FsYygoMTAwZHZoIC0gMjEwcHgpLzMpLCAxNjBweCl9CiAgQG1lZGlhIChtYXgtd2lkdGg6MzYwcHgpey5jaG9pY2UtZ3JpZHtnYXA6OHB4Oy0tY2hvaWNlLWNlbGw6bWluKDQydncsMTUwcHgpfS5jaG9pY2UtZ3JpZC5jb3VudC01LC5jaG9pY2UtZ3JpZC5jb3VudC02ey0tY2hvaWNlLWNlbGw6bWluKDQydncsIGNhbGMoKDEwMGR2aCAtIDIwNXB4KS8zKSwgMTQycHgpfX0KICBAbWVkaWEgKG1pbi13aWR0aDo3NjBweCl7LmNob2ljZS1ncmlke2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMix2YXIoLS1jaG9pY2UtY2VsbCkpOy0tY2hvaWNlLWNlbGw6MjEwcHh9LmNob2ljZS1ncmlkLmNvdW50LTUsLmNob2ljZS1ncmlkLmNvdW50LTZ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgzLHZhcigtLWNob2ljZS1jZWxsKSk7LS1jaG9pY2UtY2VsbDoxNzBweH0uY2hvaWNlLWdyaWQuY291bnQtM3tncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsdmFyKC0tY2hvaWNlLWNlbGwpKTstLWNob2ljZS1jZWxsOjE3MHB4fX0KICAuY2hvaWNlLWNhcmR7d2lkdGg6dmFyKC0tY2hvaWNlLWNlbGwpO2hlaWdodDp2YXIoLS1jaG9pY2UtY2VsbCk7YXNwZWN0LXJhdGlvOjEvMTtib3JkZXItcmFkaXVzOjlweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUtc29mdCk7YmFja2dyb3VuZDojMGIwYzBlO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjtwYWRkaW5nOjhweDt0cmFuc2l0aW9uOnRyYW5zZm9ybSAuMTJzIGVhc2UsYm9yZGVyLWNvbG9yIC4xMnMgZWFzZSxiYWNrZ3JvdW5kIC4xMnMgZWFzZSxib3gtc2hhZG93IC4xMnMgZWFzZTtwb3NpdGlvbjpyZWxhdGl2ZTtvdmVyZmxvdzpoaWRkZW47fQogIC5jaG9pY2UtY2FyZDphY3RpdmV7dHJhbnNmb3JtOnNjYWxlKC45ODUpfQogIC5jaG9pY2UtY2FyZC5zZWxlY3RlZHtib3JkZXItY29sb3I6cmdiYSgyNTUsMjU1LDI1NSwuOTYpO2JhY2tncm91bmQ6IzE1MTYxYTtib3gtc2hhZG93Omluc2V0IDAgMCAyNHB4IHJnYmEoMjU1LDI1NSwyNTUsLjEyKSwgaW5zZXQgMCAxcHggMCByZ2JhKDI1NSwyNTUsMjU1LC4xNiksMCAwIDAgMXB4IHJnYmEoMjU1LDI1NSwyNTUsLjAzKTt9CiAgLmNob2ljZS1jYXJkLnNlbGVjdGVkOmFmdGVye2NvbnRlbnQ6IiI7cG9zaXRpb246YWJzb2x1dGU7aW5zZXQ6MDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcscmdiYSgyNTUsMjU1LDI1NSwuMTIpLHRyYW5zcGFyZW50IDM4JSk7cG9pbnRlci1ldmVudHM6bm9uZTt9CiAgLmNob2ljZS1jYXJkLmdvb2R7Ym9yZGVyLWNvbG9yOnJnYmEoMTY4LDI0NCwxOTgsLjk1KTtib3gtc2hhZG93Omluc2V0IDAgMCAwIDk5OXB4IHJnYmEoMTY4LDI0NCwxOTgsLjEwKSwgaW5zZXQgMCAwIDE4cHggcmdiYSgxNjgsMjQ0LDE5OCwuMTUpfQogIC5jaG9pY2UtY2FyZC5iYWR7Ym9yZGVyLWNvbG9yOnJnYmEoMjU1LDE1NSwxNjcsLjk1KTtib3gtc2hhZG93Omluc2V0IDAgMCAwIDk5OXB4IHJnYmEoMjU1LDE1NSwxNjcsLjEwKSwgaW5zZXQgMCAwIDE4cHggcmdiYSgyNTUsMTU1LDE2NywuMTUpfQogIC5jaG9pY2UtY2FyZCAucGlue2ZvbnQtc2l6ZTpjbGFtcCgzMXB4LDEwdncsNThweCk7Zm9udC13ZWlnaHQ6ODUwO2xldHRlci1zcGFjaW5nOi0uMDFlbTtsaW5lLWhlaWdodDoxO2NvbG9yOiNlZWYxZjY7d2hpdGUtc3BhY2U6bm93cmFwO3Bvc2l0aW9uOnJlbGF0aXZlO3otaW5kZXg6MTt9CgogIC5kcmF3LXdyYXB7ZmxleDoxIDEgYXV0bzttaW4taGVpZ2h0OjA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO3BhZGRpbmc6MnB4IDAgNnB4O30KICAuZHJhdy1ncmlke3dpZHRoOjEwMCU7ZGlzcGxheTpncmlkO2dhcDoxMnB4O2FsaWduLWl0ZW1zOmNlbnRlcjthbGlnbi1jb250ZW50OmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO30KICAuZHJhdy1ncmlkLnNpbmdsZXtncmlkLXRlbXBsYXRlLWNvbHVtbnM6dmFyKC0tZHJhdy1zaXplLXNpbmdsZSk7LS1kcmF3LXNpemUtc2luZ2xlOm1pbig5MHZ3LCBjYWxjKDEwMGR2aCAtIDI1MnB4KSwgNDAwcHgpO30KICAuZHJhdy1ncmlkLmRvdWJsZXtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDIsdmFyKC0tZHJhdy1zaXplLWRvdWJsZSkpOy0tZHJhdy1zaXplLWRvdWJsZTptaW4oNDV2dywgY2FsYygxMDBkdmggLSAyNTBweCksIDM0MHB4KTtnYXA6MTBweDt9CiAgQG1lZGlhIChtaW4td2lkdGg6NjIwcHgpey5kcmF3LWdyaWQuZG91Ymxle2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMix2YXIoLS1kcmF3LXNpemUtZG91YmxlLXcpKTstLWRyYXctc2l6ZS1kb3VibGUtdzptaW4oNDJ2dywgY2FsYygxMDBkdmggLSAzMDBweCksIDM2MHB4KX19CiAgLnRvbmUtYm94e3dpZHRoOjEwMCU7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lLXNvZnQpO2JvcmRlci1yYWRpdXM6OHB4O2JhY2tncm91bmQ6IzBhMGIwZDtwYWRkaW5nOjdweDttaW4taGVpZ2h0OjA7dHJhbnNpdGlvbjpib3JkZXItY29sb3IgLjE2cyBlYXNlLGJveC1zaGFkb3cgLjE2cyBlYXNlLGJhY2tncm91bmQgLjE2cyBlYXNlO30KICAudG9uZS1ib3guZ29vZHtib3JkZXItY29sb3I6cmdiYSgxNjgsMjQ0LDE5OCwuODApO2JveC1zaGFkb3c6aW5zZXQgMCAwIDAgOTk5cHggcmdiYSgxNjgsMjQ0LDE5OCwuMDcpLCBpbnNldCAwIDAgMThweCByZ2JhKDE2OCwyNDQsMTk4LC4xMyl9CiAgLnRvbmUtYm94LmJhZHtib3JkZXItY29sb3I6cmdiYSgyNTUsMTU1LDE2NywuODIpO2JveC1zaGFkb3c6aW5zZXQgMCAwIDAgOTk5cHggcmdiYSgyNTUsMTU1LDE2NywuMDgpLCBpbnNldCAwIDAgMThweCByZ2JhKDI1NSwxNTUsMTY3LC4xNCl9CiAgLnRvbmUtYm94LndhaXRpbmd7b3BhY2l0eTouODh9CiAgLmNhbnZhcy1mcmFtZXtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDoxMDAlO2FzcGVjdC1yYXRpbzoxLzE7Ym9yZGVyOjFweCBkYXNoZWQgcmdiYSgyMDksMjEzLDIxOSwuMjYpO2JvcmRlci1yYWRpdXM6N3B4O292ZXJmbG93OmhpZGRlbjtiYWNrZ3JvdW5kOiMwNzA4MDk7fQogIGNhbnZhc3t3aWR0aDoxMDAlO2hlaWdodDoxMDAlO2Rpc3BsYXk6YmxvY2s7dG91Y2gtYWN0aW9uOm5vbmV9CiAgLmNhbnZhcy1mcmFtZTpiZWZvcmUsLmNhbnZhcy1mcmFtZTphZnRlcntjb250ZW50OiIiO3Bvc2l0aW9uOmFic29sdXRlO3BvaW50ZXItZXZlbnRzOm5vbmU7YmFja2dyb3VuZDpyZ2JhKDIwOSwyMTMsMjE5LC4wNyl9CiAgLmNhbnZhcy1mcmFtZTpiZWZvcmV7bGVmdDo1MCU7dG9wOjE2JTtib3R0b206MTYlO3dpZHRoOjFweH0uY2FudmFzLWZyYW1lOmFmdGVye3RvcDo1MCU7bGVmdDoxNiU7cmlnaHQ6MTYlO2hlaWdodDoxcHh9CiAgLmRvdC1jZW50ZXJ7cG9zaXRpb246YWJzb2x1dGU7bGVmdDo1MCU7dG9wOjUwJTt3aWR0aDo3cHg7aGVpZ2h0OjdweDttYXJnaW46LTMuNXB4IDAgMCAtMy41cHg7Ym9yZGVyLXJhZGl1czo1MCU7YmFja2dyb3VuZDpyZ2JhKDIwOSwyMTMsMjE5LC4xMSk7cG9pbnRlci1ldmVudHM6bm9uZX0KICAuY2xlYXItdG9uZXttYXJnaW4tdG9wOjZweDt3aWR0aDoxMDAlO2hlaWdodDozMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtib3JkZXItcmFkaXVzOjZweDtiYWNrZ3JvdW5kOiMwODA5MGE7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtd2VpZ2h0OjcyMDtmb250LXNpemU6MTJweDt0ZXh0LXRyYW5zZm9ybTpsb3dlcmNhc2U7fQogIEBtZWRpYSAobWluLXdpZHRoOjc2MHB4KXsuZHJhdy13cmFwe2FsaWduLWl0ZW1zOmNlbnRlcn0uZHJhdy1ncmlke2FsaWduLWNvbnRlbnQ6Y2VudGVyfS5kcmF3LWdyaWQuZG91Ymxle2dyaWQtdGVtcGxhdGUtY29sdW1uczpyZXBlYXQoMiwzMDBweCl9LmRyYXctZ3JpZC5zaW5nbGV7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjM5MHB4fX0KICBAbWVkaWEgKG1heC1oZWlnaHQ6NjkwcHgpey5nYW1lLXRvcHttaW4taGVpZ2h0OjQ2cHg7cGFkZGluZy10b3A6NXB4O3BhZGRpbmctYm90dG9tOjVweH0udGFzay1oZWFkIGgye21hcmdpbi10b3A6MH0uZHJhdy13cmFwe3BhZGRpbmctdG9wOjB9Lmljb24tYnRue3dpZHRoOjM2cHg7aGVpZ2h0OjM2cHh9LmNoYWxsZW5nZXtwYWRkaW5nLXRvcDo5cHh9LnRhc2staGVhZHttYXJnaW4tYm90dG9tOjhweH0udGFzay1oZWFkIC5raWNrZXJ7Zm9udC1zaXplOjhweH0udGFzay1oZWFkIGgye2ZvbnQtc2l6ZToyM3B4fS5jaG9pY2UtZ3JpZC5jb3VudC01LC5jaG9pY2UtZ3JpZC5jb3VudC02ey0tY2hvaWNlLWNlbGw6bWluKDQydncsIGNhbGMoKDEwMGR2aCAtIDIwMHB4KS8zKSwgMTQycHgpfS5kcmF3LWdyaWR7Z2FwOjhweH0uZHJhdy1ncmlkLnNpbmdsZXstLWRyYXctc2l6ZS1zaW5nbGU6bWluKDkwdncsY2FsYygxMDBkdmggLSAyMjZweCksMzQwcHgpfS5kcmF3LWdyaWQuZG91Ymxley0tZHJhdy1zaXplLWRvdWJsZTptaW4oNDV2dyxjYWxjKDEwMGR2aCAtIDIyNnB4KSwzMDBweCl9LnRvbmUtYm94e3BhZGRpbmc6NnB4fS5jbGVhci10b25le2hlaWdodDoyOHB4O21hcmdpbi10b3A6NXB4fX0KCiAgLmFuc3dlci1zdHJpcHtwb3NpdGlvbjpmaXhlZDtsZWZ0OjE2cHg7cmlnaHQ6MTZweDt0b3A6YXV0bztib3R0b206Y2FsYygxNnB4ICsgZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sMHB4KSk7ei1pbmRleDo2MDt3aWR0aDphdXRvO21heC13aWR0aDo1NjBweDttYXJnaW4taW5saW5lOmF1dG87Ym94LXNoYWRvdzowIDE4cHggNTBweCByZ2JhKDAsMCwwLC41NSk7bWluLWhlaWdodDozOHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtib3JkZXItcmFkaXVzOjhweDtiYWNrZ3JvdW5kOiMwZDBlMTA7Y29sb3I6I2ZmZjtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo3cHggMTJweDtmb250LXdlaWdodDo4NTA7Zm9udC1zaXplOmNsYW1wKDE3cHgsNXZ3LDI2cHgpO21heC1oZWlnaHQ6MzRkdmg7b3ZlcmZsb3c6YXV0bztmbGV4LWRpcmVjdGlvbjpjb2x1bW47Z2FwOjJweDtsZXR0ZXItc3BhY2luZzouMDFlbTtvcGFjaXR5OjA7dmlzaWJpbGl0eTpoaWRkZW47dHJhbnNmb3JtOnRyYW5zbGF0ZVkoNHB4KTtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuMTZzIGVhc2UsdHJhbnNmb3JtIC4xNnMgZWFzZSx2aXNpYmlsaXR5IC4xNnMgZWFzZTt9CiAgLmFuc3dlci1zdHJpcC5zaG93e29wYWNpdHk6MTt2aXNpYmlsaXR5OnZpc2libGU7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9CiAgLmFuc3dlci1zdHJpcC5nb29ke2JvcmRlci1jb2xvcjpyZ2JhKDE2OCwyNDQsMTk4LC42Mik7Y29sb3I6I2Q4ZmZlNztiYWNrZ3JvdW5kOiMwYjE1MTB9CiAgLmFuc3dlci1zdHJpcC5iYWR7Ym9yZGVyLWNvbG9yOnJnYmEoMjU1LDE1NSwxNjcsLjYyKTtjb2xvcjojZmZlMGU0O2JhY2tncm91bmQ6IzE3MGIwZH0KCgogIEBtZWRpYSAobWF4LXdpZHRoOjc1OXB4KXsKICAgIC50YXNrLWhlYWQgaDJ7Zm9udC1zaXplOmNsYW1wKDIzcHgsN3Z3LDMycHgpfQogICAgLmNob2ljZS13cmFwLC5kcmF3LXdyYXB7bWluLWhlaWdodDphdXRvfQogIH0KCiAgLnRvYXN0e2Rpc3BsYXk6bm9uZX0KICAubG9hZGluZ3tmbGV4OjE7ZGlzcGxheTpncmlkO3BsYWNlLWl0ZW1zOmNlbnRlcjtjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC13ZWlnaHQ6NzUwO2xldHRlci1zcGFjaW5nOi4wOGVtO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250LXNpemU6MTJweDt9Cjwvc3R5bGU+CjxzdHlsZSBpZD0iaHotdGhlbWUtYnJpZGdlIj4KOnJvb3R7LS1hY2c6I2Y1YTYyMzstLWFjZy1yZ2I6MjQ1LDE2NiwzNX0KYm9keXtiYWNrZ3JvdW5kOnJhZGlhbC1ncmFkaWVudChjaXJjbGUgYXQgNTAlIC0xOCUscmdiYSh2YXIoLS1hY2ctcmdiKSwuMTEpLHRyYW5zcGFyZW50IDQyJSksbGluZWFyLWdyYWRpZW50KDE4MGRlZywjMTUxMjBlIDAlLCMwYTA5MDcgNDUlLCMwMDAgMTAwJSl9Ci5icmFuZCBoMXtmb250LWZhbWlseTonTm90byBTZXJpZiBTQycsR2VvcmdpYSwnVGltZXMgTmV3IFJvbWFuJyxzZXJpZjtmb250LXdlaWdodDo3MDA7Y29sb3I6I2YwZTdkODtsZXR0ZXItc3BhY2luZzouMDFlbX0KLmJyYW5kIHAsLmhpbnR7Y29sb3I6IzljOTI3Zn0KLmhvbWUtY2FyZHtib3JkZXItY29sb3I6cmdiYSh2YXIoLS1hY2ctcmdiKSwuMjApO2JhY2tncm91bmQ6cmdiYSgxNiwxMywxMCwuOTQpfQouYmVzdC1ib3h7Ym9yZGVyLWNvbG9yOnJnYmEodmFyKC0tYWNnLXJnYiksLjIyKTtiYWNrZ3JvdW5kOiMxNDExMGR9Ci5iZXN0LWJveCBzdHJvbmcsLnNjb3JlYm94IHN0cm9uZ3tjb2xvcjp2YXIoLS1hY2cpfQoucmVjb3JkYm94IHN0cm9uZ3tjb2xvcjojZThkY2M0fQouc2VnIGJ1dHRvbi5hY3RpdmV7Ym9yZGVyLWNvbG9yOnJnYmEodmFyKC0tYWNnLXJnYiksLjYyKSFpbXBvcnRhbnQ7Y29sb3I6dmFyKC0tYWNnKSFpbXBvcnRhbnQ7YmFja2dyb3VuZDpyZ2JhKHZhcigtLWFjZy1yZ2IpLC4xMCkhaW1wb3J0YW50fQouc3RhcnQtYnRue2JhY2tncm91bmQ6bGluZWFyLWdyYWRpZW50KDE4MGRlZyx2YXIoLS1hY2cpLHJnYmEodmFyKC0tYWNnLXJnYiksLjc4KSk7Ym9yZGVyLWNvbG9yOnJnYmEodmFyKC0tYWNnLXJnYiksLjYpO2NvbG9yOiMxNzEzMTB9Ci5taW5pLWJ0bntiYWNrZ3JvdW5kOiMxYzE4MTM7Ym9yZGVyLWNvbG9yOnJnYmEodmFyKC0tYWNnLXJnYiksLjMpO2NvbG9yOnZhcigtLWFjZyl9Ci5hbnN3ZXItc3RyaXAuZ29vZHtjb2xvcjojYjhmNWMxfS5hbnN3ZXItc3RyaXAuYmFke2NvbG9yOiNmZjliYTd9Ci5yZXBsYXktYnRue2NvbG9yOnZhcigtLWFjZyl9CiNoei1waHJhc2V7ZGlzcGxheTpibG9jazttYXJnaW4tdG9wOjZweDtmb250LWZhbWlseTonTm90byBTZXJpZiBTQycsc2VyaWY7Zm9udC1zaXplOjE5cHg7Y29sb3I6I2YwZTdkODtsZXR0ZXItc3BhY2luZzouMDZlbX0KLmhvbWUtY2FyZHtwb3NpdGlvbjpyZWxhdGl2ZX0KLmNmZy1nZWFye3Bvc2l0aW9uOmFic29sdXRlO3RvcDoxNHB4O3JpZ2h0OjE0cHg7d2lkdGg6MzZweDtoZWlnaHQ6MzZweDtib3JkZXI6MXB4IHNvbGlkIHJnYmEodmFyKC0tYWNnLXJnYiksLjMpO2JvcmRlci1yYWRpdXM6NTAlO2NvbG9yOnZhcigtLWFjZyk7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuMjUpO3otaW5kZXg6Mn0KLmJyYW5kLmhlcm97dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggMCAycHh9Ci5oZXJvLWFydHtjb2xvcjp2YXIoLS1hY2cpO29wYWNpdHk6Ljk7bWFyZ2luOi00cHggYXV0byAycHg7bWF4LXdpZHRoOjMwMHB4fQouYnJhbmQuaGVybyBoMXtmb250LXNpemU6MzRweDtsaW5lLWhlaWdodDoxLjA4fQouYnJhbmQuaGVybyBwe21hcmdpbjo5cHggYXV0byAwfQouYmVzdC1jYXJke2JvcmRlcjoxcHggc29saWQgcmdiYSh2YXIoLS1hY2ctcmdiKSwuMjQpO2JhY2tncm91bmQ6IzE0MTEwZDtib3JkZXItcmFkaXVzOjEwcHg7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzoxMnB4O21hcmdpbjoxNnB4IDAgNHB4fQouYmVzdC1jYXJkIHNwYW57ZGlzcGxheTpibG9jaztjb2xvcjp2YXIoLS1tdXRlZDIpO2ZvbnQtc2l6ZToxMHB4O2xldHRlci1zcGFjaW5nOi4xNGVtO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtmb250LXdlaWdodDo3ODB9Ci5iZXN0LWNhcmQgc3Ryb25ne2Rpc3BsYXk6YmxvY2s7Zm9udC1zaXplOjMwcHg7bWFyZ2luLXRvcDo0cHg7Y29sb3I6dmFyKC0tYWNnKX0KLmNmZy1wYW5lbHtkaXNwbGF5Om5vbmU7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1saW5lLXNvZnQpO2JvcmRlci1yYWRpdXM6MTBweDtwYWRkaW5nOjJweCAxNHB4IDE0cHg7bWFyZ2luLXRvcDoxNHB4O2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuMjgpfQouY2ZnLXBhbmVsLm9wZW57ZGlzcGxheTpibG9ja30KLnN0YXJ0LWJ0bntmb250LXNpemU6MTZweDtsZXR0ZXItc3BhY2luZzouMDhlbTt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9Ci5ob21lLWZvb3R7ZGlzcGxheTpmbGV4O2p1c3RpZnktY29udGVudDpjZW50ZXI7bWFyZ2luLXRvcDoxMnB4fQouZm9vdC1jaGlwe2Rpc3BsYXk6aW5saW5lLWZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo3cHg7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKHZhcigtLWFjZy1yZ2IpLC4zMik7Ym9yZGVyLXJhZGl1czo5OTlweDtwYWRkaW5nOjhweCAxNXB4O2NvbG9yOnZhcigtLWFjZyk7Zm9udC13ZWlnaHQ6ODAwO2ZvbnQtc2l6ZToxMi41cHg7YmFja2dyb3VuZDpyZ2JhKHZhcigtLWFjZy1yZ2IpLC4wNil9Ci5zZXNzLW92e3Bvc2l0aW9uOmZpeGVkO2luc2V0OjA7ei1pbmRleDoxMjA7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO2JhY2tncm91bmQ6cmdiYSgwLDAsMCwuNzIpO29wYWNpdHk6MDt2aXNpYmlsaXR5OmhpZGRlbjtwb2ludGVyLWV2ZW50czpub25lO3RyYW5zaXRpb246b3BhY2l0eSAuMTZzIGVhc2UsdmlzaWJpbGl0eSAwcyBsaW5lYXIgLjE2c30KLnNlc3Mtb3Yub3BlbntvcGFjaXR5OjE7dmlzaWJpbGl0eTp2aXNpYmxlO3BvaW50ZXItZXZlbnRzOmF1dG87dHJhbnNpdGlvbi1kZWxheTowc30KLnNlc3MtY2FyZHtwb3NpdGlvbjpyZWxhdGl2ZTt3aWR0aDptaW4oOTJ2dyw0MzBweCk7bWF4LWhlaWdodDo5MGR2aDtvdmVyZmxvdzphdXRvO2JvcmRlcjoxcHggc29saWQgcmdiYSh2YXIoLS1hY2ctcmdiKSwuMzQpO2JvcmRlci1yYWRpdXM6MTRweDtiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcsIzE3MTMwZSwjMGIwOTA2KTtib3gtc2hhZG93OjAgMzBweCA5MHB4IHJnYmEoMCwwLDAsLjcpO3BhZGRpbmc6MjZweCAyMHB4IDIwcHg7dGV4dC1hbGlnbjpjZW50ZXI7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMTBweCk7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjE2cyBlYXNlfQouc2Vzcy1vdi5vcGVuIC5zZXNzLWNhcmR7dHJhbnNmb3JtOnRyYW5zbGF0ZVkoMCl9Ci5zZXNzLXh7cG9zaXRpb246YWJzb2x1dGU7dG9wOjEwcHg7cmlnaHQ6MTBweDt3aWR0aDozNHB4O2hlaWdodDozNHB4O2JvcmRlci1yYWRpdXM6NTAlO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtjb2xvcjp2YXIoLS1tdXRlZCk7Zm9udC1zaXplOjE5cHh9Ci5zZXNzLXRpdGxle2ZvbnQtZmFtaWx5OidOb3RvIFNlcmlmIFNDJyxHZW9yZ2lhLHNlcmlmO2ZvbnQtc2l6ZToyNXB4O2NvbG9yOiNmMGU3ZDh9Ci5zZXNzLXRyb3BoeXtjb2xvcjp2YXIoLS1hY2cpO21hcmdpbjoxNHB4IGF1dG8gNHB4O3dpZHRoOjg2cHg7aGVpZ2h0Ojg2cHg7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKHZhcigtLWFjZy1yZ2IpLC40KTtib3JkZXItcmFkaXVzOjUwJTtkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpjZW50ZXI7Ym94LXNoYWRvdzowIDAgNDBweCByZ2JhKHZhcigtLWFjZy1yZ2IpLC4yMikgaW5zZXQsMCAwIDI2cHggcmdiYSh2YXIoLS1hY2ctcmdiKSwuMTQpfQouc2Vzcy1zY29yZXtmb250LXNpemU6NDBweDtmb250LXdlaWdodDo4NTA7Y29sb3I6dmFyKC0tYWNnKTttYXJnaW4tdG9wOjhweH0KLnNlc3MtbmV3e2NvbG9yOiNiOGY1YzE7Zm9udC1zaXplOjEyLjVweDtmb250LXdlaWdodDo4MDA7bWFyZ2luLXRvcDoycHg7bWluLWhlaWdodDoxNnB4fQouc2Vzcy16aHtmb250LWZhbWlseTonTm90byBTZXJpZiBTQycsc2VyaWY7Zm9udC1zaXplOjE4cHg7Y29sb3I6I2U5ZGNjMzttYXJnaW4tdG9wOjEwcHg7bGV0dGVyLXNwYWNpbmc6LjA4ZW19Ci5zZXNzLWdyaWR7ZGlzcGxheTpncmlkO2dyaWQtdGVtcGxhdGUtY29sdW1uczoxZnIgMWZyO2dhcDo5cHg7bWFyZ2luLXRvcDoxNnB4fQouc2Vzcy1jZWxse2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZS1zb2Z0KTtib3JkZXItcmFkaXVzOjEwcHg7cGFkZGluZzoxMHB4O2JhY2tncm91bmQ6IzEwMGQwYTt0ZXh0LWFsaWduOmxlZnR9Ci5zZXNzLWNlbGwgc3BhbntkaXNwbGF5OmJsb2NrO2ZvbnQtc2l6ZToxMHB4O2xldHRlci1zcGFjaW5nOi4xMmVtO3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtjb2xvcjp2YXIoLS1tdXRlZDIpO2ZvbnQtd2VpZ2h0Ojc4MH0KLnNlc3MtY2VsbCBzdHJvbmd7ZGlzcGxheTpibG9jaztmb250LXNpemU6MjBweDttYXJnaW4tdG9wOjNweDtjb2xvcjojZWNkZmM2fQouc2Vzcy1tdXNpY3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjttYXJnaW4tdG9wOjE0cHg7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtc2l6ZToxMnB4O21pbi1oZWlnaHQ6MTZweH0KLnNlc3MtYWN0aW9uc3tkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmciAxZnI7Z2FwOjlweDttYXJnaW4tdG9wOjE0cHh9LnNlc3MtaG9tZSwuc2Vzcy1hZ2Fpbnt3aWR0aDoxMDAlO2hlaWdodDo0NnB4O2JvcmRlcjoxcHggc29saWQgcmdiYSh2YXIoLS1hY2ctcmdiKSwuNSk7Ym9yZGVyLXJhZGl1czo5cHg7Zm9udC13ZWlnaHQ6ODUwO2xldHRlci1zcGFjaW5nOi4wNTVlbTt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9LnNlc3MtaG9tZXtiYWNrZ3JvdW5kOiMxNzEzMGU7Y29sb3I6dmFyKC0tYWNnKX0uc2Vzcy1hZ2FpbntiYWNrZ3JvdW5kOmxpbmVhci1ncmFkaWVudCgxODBkZWcsdmFyKC0tYWNnKSxyZ2JhKHZhcigtLWFjZy1yZ2IpLC43OCkpO2NvbG9yOiMxNzEzMTB9QG1lZGlhKG1heC13aWR0aDozNjBweCl7LnNlc3MtYWN0aW9uc3tncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyfX0KPC9zdHlsZT4KPHN0eWxlIGlkPSJoei1jb21wYXQiPgovKiBDb21wYXQgcHJvZ3Jlc3NpdmE6IGR2aCAtPiB2aCBmYWxsYmFjayAoU2FmYXJpIGFudGlnbywgV2ViVmlld3MgbGltaXRhZGFzKSAqLwpAc3VwcG9ydHMgbm90IChoZWlnaHQ6IDEwMGR2aCl7CiAgLmRyYXctZ3JpZC5zaW5nbGV7LS1kcmF3LXNpemUtc2luZ2xlOm1pbig4NnZ3LCBjYWxjKDEwMHZoIC0gMzAwcHgpLCAzODBweCkhaW1wb3J0YW50fQogIC5kcmF3LWdyaWQuZG91Ymxley0tZHJhdy1zaXplLWRvdWJsZTptaW4oODR2dywgY2FsYygoMTAwdmggLSAzMzBweCkvMiksIDMzMHB4KSFpbXBvcnRhbnR9CiAgLnNlc3MtY2FyZHttYXgtaGVpZ2h0Ojg4dmghaW1wb3J0YW50fQogIC5hbnN3ZXItc3RyaXB7bWF4LWhlaWdodDozNHZoIWltcG9ydGFudH0KfQo8L3N0eWxlPjwvaGVhZD4KPGJvZHk+CiAgPHNlY3Rpb24gaWQ9ImhvbWUiIGNsYXNzPSJzY3JlZW4gaG9tZSBhY3RpdmUiPgogICAgPGRpdiBjbGFzcz0iaG9tZS1jYXJkIj4KICAgICAgPGJ1dHRvbiBpZD0iYmFja0h1YiIgY2xhc3M9ImNmZy1nZWFyIiBzdHlsZT0icmlnaHQ6YXV0bztsZWZ0OjE0cHgiIHRpdGxlPSJWb2x0YXIiPjxzdmcgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xOSAxMkg1TTExIDE4bC02LTYgNi02Ii8+PC9zdmc+PC9idXR0b24+CiAgICAgIDxidXR0b24gaWQ9ImNmZ0J0biIgY2xhc3M9ImNmZy1nZWFyIiB0aXRsZT0iQ29uZmlndXJhw6fDtWVzIj48c3ZnIHdpZHRoPSIxOSIgaGVpZ2h0PSIxOSIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjciPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiLz48cGF0aCBkPSJNMTkuNCAxNWExLjY1IDEuNjUgMCAwMC4zMyAxLjgybC4wNi4wNmEyIDIgMCAwMS0yLjgzIDIuODNsLS4wNi0uMDZhMS42NSAxLjY1IDAgMDAtMS44Mi0uMzMgMS42NSAxLjY1IDAgMDAtMSAxLjUxVjIxYTIgMiAwIDAxLTQgMHYtLjA5QTEuNjUgMS42NSAwIDAwOSAxOS40YTEuNjUgMS42NSAwIDAwLTEuODIuMzNsLS4wNi4wNmEyIDIgMCAwMS0yLjgzLTIuODNsLjA2LS4wNkExLjY1IDEuNjUgMCAwMDQuNjggMTVhMS42NSAxLjY1IDAgMDAtMS41MS0xSDNhMiAyIDAgMDEwLTRoLjA5QTEuNjUgMS42NSAwIDAwNC42IDlhMS42NSAxLjY1IDAgMDAtLjMzLTEuODJsLS4wNi0uMDZBMiAyIDAgMDE2Ljk2IDMuM2wuMDYuMDZBMS42NSAxLjY1IDAgMDA5IDQuNjhhMS42NSAxLjY1IDAgMDAxLTEuNTFWM2EyIDIgMCAwMTQgMHYuMDlhMS42NSAxLjY1IDAgMDAxIDEuNTEgMS42NSAxLjY1IDAgMDAxLjgyLS4zM2wuMDYtLjA2YTIgMiAwIDAxMi44MyAyLjgzbC0uMDYuMDZBMS42NSAxLjY1IDAgMDAxOS40IDlhMS42NSAxLjY1IDAgMDAxLjUxIDFIMjFhMiAyIDAgMDEwIDRoLS4wOWExLjY1IDEuNjUgMCAwMC0xLjUxIDF6Ii8+PC9zdmc+PC9idXR0b24+CiAgICAgIDxkaXYgY2xhc3M9ImJyYW5kIGhlcm8iPgogICAgICAgIDxkaXYgY2xhc3M9Imhlcm8tYXJ0IiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHN2ZyB2aWV3Qm94PSIwIDAgMzAwIDkwIiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciI+PHBhdGggZD0iTTAgNzQgUTcwIDQ2IDE1MCA2MiBUMzAwIDU4IiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9Ii41Ii8+PHBhdGggZD0iTTAgODIgUTkwIDYwIDE3MCA3MiBUMzAwIDcwIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9Ii4zIi8+PGNpcmNsZSBjeD0iMjI2IiBjeT0iMzAiIHI9IjExIiBzdHJva2Utd2lkdGg9IjEuMSIgb3BhY2l0eT0iLjkiLz48Y2lyY2xlIGN4PSIyMjYiIGN5PSIzMCIgcj0iNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2U9Im5vbmUiIG9wYWNpdHk9Ii42NSIvPjxwYXRoIGQ9Ik0yMCA2MCBxMTAtMTQgMjItMTYgTTMyIDU1IHE1LTggMTItOSIgb3BhY2l0eT0iLjU1IiBzdHJva2Utd2lkdGg9IjEuMiIvPjxjaXJjbGUgY3g9IjQ3IiBjeT0iNDMiIHI9IjEuNyIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2U9Im5vbmUiIG9wYWNpdHk9Ii43Ii8+PGNpcmNsZSBjeD0iMzkiIGN5PSI0OSIgcj0iMS4zIiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0cm9rZT0ibm9uZSIgb3BhY2l0eT0iLjUiLz48L3N2Zz48L2Rpdj4KICAgICAgICA8aDE+UGlueWluPGJyPlRvbmUgTGFiPC9oMT4KICAgICAgICA8cD5Eb21pbmUgb3MgdG9ucy4gRmFsZSBjb20gcHJlY2lzw6NvLjwvcD4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImJlc3QtY2FyZCI+CiAgICAgICAgPHNwYW4+TWVsaG9yIHBvbnR1YcOnw6NvPC9zcGFuPgogICAgICAgIDxzdHJvbmc+PHNwYW4gaWQ9ImhvbWVCZXN0Ij4wPC9zcGFuPiA8c3ZnIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0eWxlPSJ2ZXJ0aWNhbC1hbGlnbjotMnB4Ij48cGF0aCBkPSJNOCAyMWg4TTEyIDE3djRNNyA0aDEwdjVhNSA1IDAgMDEtMTAgMFY0eiIvPjxwYXRoIGQ9Ik03IDZINHYyYTMgMyAwIDAwMyAzTTE3IDZoM3YyYTMgMyAwIDAxLTMgMyIvPjwvc3ZnPjwvc3Ryb25nPgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBpZD0iY2ZnUGFuZWwiIGNsYXNzPSJjZmctcGFuZWwiPgogICAgICAgIDxkaXYgY2xhc3M9ImZpZWxkIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImZpZWxkLWxhYmVsIj5UaXBvIGRlIGRlc2FmaW8gPHNtYWxsPnVtIHBvciByb2RhZGE8L3NtYWxsPjwvZGl2PgogICAgICAgICAgPGRpdiBjbGFzcz0ic2VnIGNvbHMtMyIgZGF0YS1zZXR0aW5nPSJ0YXNrTW9kZSI+CiAgICAgICAgICAgIDxidXR0b24gZGF0YS12YWx1ZT0icmFuZG9tIiBjbGFzcz0iYWN0aXZlIj5BbGVhdMOzcmlvPC9idXR0b24+CiAgICAgICAgICAgIDxidXR0b24gZGF0YS12YWx1ZT0iZHJhdyI+RGVzZW5oYXI8L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLXZhbHVlPSJjaG9pY2UiPkVzY29saGVyPC9idXR0b24+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJmaWVsZCI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJmaWVsZC1sYWJlbCI+w4F1ZGlvIDxzbWFsbD5zaW5nbGUgb3UgcGFyPC9zbWFsbD48L2Rpdj4KICAgICAgICAgIDxkaXYgY2xhc3M9InNlZyBjb2xzLTMiIGRhdGEtc2V0dGluZz0idW5pdE1vZGUiPgogICAgICAgICAgICA8YnV0dG9uIGRhdGEtdmFsdWU9InJhbmRvbSIgY2xhc3M9ImFjdGl2ZSI+TWlzdG88L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLXZhbHVlPSJzaW5nbGUiPlNpbmdsZTwvYnV0dG9uPgogICAgICAgICAgICA8YnV0dG9uIGRhdGEtdmFsdWU9ImRvdWJsZSI+RG91YmxlPC9idXR0b24+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgICA8ZGl2IGNsYXNzPSJmaWVsZCI+CiAgICAgICAgICA8ZGl2IGNsYXNzPSJmaWVsZC1sYWJlbCI+Vm96IDxzbWFsbD52YXJpYcOnw6NvIGFsdGEgcG9yIHBhZHLDo288L3NtYWxsPjwvZGl2PgogICAgICAgICAgPGRpdiBjbGFzcz0ic2VnIGNvbHMtNCIgZGF0YS1zZXR0aW5nPSJzb3VyY2VNb2RlIj4KICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLXZhbHVlPSJhdXRvIiBjbGFzcz0iYWN0aXZlIj5BbHRhPC9idXR0b24+CiAgICAgICAgICAgIDxidXR0b24gZGF0YS12YWx1ZT0ieW95byI+WW9ZbzwvYnV0dG9uPgogICAgICAgICAgICA8YnV0dG9uIGRhdGEtdmFsdWU9InlhYmxhIj5ZYWJsYTwvYnV0dG9uPgogICAgICAgICAgICA8YnV0dG9uIGRhdGEtdmFsdWU9InN0dWR5Y2xpIj5DTEk8L2J1dHRvbj4KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICAgIDxkaXYgY2xhc3M9ImZpZWxkIj4KICAgICAgICAgIDxkaXYgY2xhc3M9ImZpZWxkLWxhYmVsIj5EaWZpY3VsZGFkZTwvZGl2PgogICAgICAgICAgPGRpdiBjbGFzcz0ic2VnIGNvbHMtMiIgZGF0YS1zZXR0aW5nPSJkaWZmaWN1bHR5Ij4KICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLXZhbHVlPSJub3JtYWwiPk5hdHVyYWw8L2J1dHRvbj4KICAgICAgICAgICAgPGJ1dHRvbiBkYXRhLXZhbHVlPSJoYXJkIiBjbGFzcz0iYWN0aXZlIj5BbHRhPC9idXR0b24+CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InN0YXJ0LXJvdyI+CiAgICAgICAgPGJ1dHRvbiBpZD0ic3RhcnRCdG4iIGNsYXNzPSJzdGFydC1idG4iPkluaWNpYXIgPHNwYW4gc3R5bGU9ImZvbnQtc2l6ZToxN3B4Ij7ihpI8L3NwYW4+PC9idXR0b24+CiAgICAgICAgPGJ1dHRvbiBpZD0icXVpY2tCdG4iIGNsYXNzPSJtaW5pLWJ0biIgdGl0bGU9IkFsZWF0w7NyaW8gcsOhcGlkbyI+4oa7PC9idXR0b24+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJob21lLWZvb3QiPgogICAgICAgIDxidXR0b24gaWQ9Im11c2ljQ2hpcCIgY2xhc3M9ImZvb3QtY2hpcCI+PHN2ZyB3aWR0aD0iMTUiIGhlaWdodD0iMTUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS43Ij48Y2lyY2xlIGN4PSI2LjUiIGN5PSIxOC41IiByPSIyLjUiLz48Y2lyY2xlIGN4PSIxNy41IiBjeT0iMTYuNSIgcj0iMi41Ii8+PHBhdGggZD0iTTkgMTguNVY2bDExLTIuNXYxMi41Ii8+PC9zdmc+TcO6c2ljYXMgwrcgPHNwYW4gc3R5bGU9ImZvbnQtZmFtaWx5OidOb3RvIFNlcmlmIFNDJyxzZXJpZiI+5Y+k562dPC9zcGFuPjwvYnV0dG9uPgogICAgICA8L2Rpdj4KICAgICAgPHAgY2xhc3M9ImhpbnQiPkRpY2E6IHRvcXVlIGN1cnRvIG5vIGNlbnRybyBtYXJjYSB0b20gbmV1dHJvLiBFbSBwYXJlcywgZGVzZW5oZSBuYSBtZXNtYSBvcmRlbSBkbyDDoXVkaW8uPC9wPgogICAgPC9kaXY+CiAgPC9zZWN0aW9uPgoKICA8c2VjdGlvbiBpZD0iZ2FtZSIgY2xhc3M9InNjcmVlbiBnYW1lIj4KICAgIDxkaXYgY2xhc3M9ImdhbWUtc2hlbGwiPgogICAgICA8aGVhZGVyIGNsYXNzPSJnYW1lLXRvcCI+CiAgICAgICAgPGJ1dHRvbiBpZD0icmVwbGF5QnRuIiBjbGFzcz0iaWNvbi1idG4gcmVwbGF5LWJ0biIgdGl0bGU9Ik91dmlyIG5vdmFtZW50ZSI+4pa2PC9idXR0b24+CiAgICAgICAgPGRpdiBjbGFzcz0ic2NvcmVib3giPjxzcGFuPlNjb3JlPC9zcGFuPjxzdHJvbmcgaWQ9InNjb3JlVmFsIj4wPC9zdHJvbmc+PC9kaXY+CiAgICAgICAgPGRpdiBjbGFzcz0icmVjb3JkYm94Ij48c3Bhbj5SZWNvcmRlPC9zcGFuPjxzdHJvbmcgaWQ9ImJlc3RWYWwiPjA8L3N0cm9uZz48L2Rpdj4KICAgICAgICA8YnV0dG9uIGlkPSJleGl0QnRuIiBjbGFzcz0iaWNvbi1idG4iIHRpdGxlPSJTYWlyIj7DlzwvYnV0dG9uPgogICAgICA8L2hlYWRlcj4KICAgICAgPG1haW4gaWQ9ImNoYWxsZW5nZSIgY2xhc3M9ImNoYWxsZW5nZSI+PGRpdiBjbGFzcz0ibG9hZGluZyI+cHJlcGFyYW5kbyDDoXVkaW/igKY8L2Rpdj48L21haW4+CiAgICAgIDxkaXYgaWQ9InRvYXN0IiBjbGFzcz0idG9hc3QiPjwvZGl2PgogICAgICA8ZGl2IGlkPSJhbnN3ZXJTdHJpcCIgY2xhc3M9ImFuc3dlci1zdHJpcCI+PC9kaXY+CiAgICA8L2Rpdj4KICA8L3NlY3Rpb24+Cgo8c2NyaXB0PgooKCkgPT4gewogICd1c2Ugc3RyaWN0JzsKICBjb25zdCBIWl9HTEFORz0oKCk9Pnt0cnl7Y29uc3QgZmU9d2luZG93LmZyYW1lRWxlbWVudDtyZXR1cm4gKGZlJiZmZS5kYXRhc2V0JiZmZS5kYXRhc2V0LmxhbmcpPT09J2VuJz8nZW4nOidwdCc7fWNhdGNoKGUpe3JldHVybiAncHQnO319KSgpOwogIGNvbnN0IEhaX0dUPXtwdDp7c2NvcmU6J1BPTlRPUycsYmVzdDonUkVDT1JERScsc3RhcnQ6J0luaWNpYXInLGJlc3RTY29yZTonTWVsaG9yIHBvbnR1YcOnw6NvJyxiYWNrU3RhcnQ6J1ZvbHRhciBhbyBpbsOtY2lvJyxkb25lOidTZXNzw6NvIGNvbmNsdcOtZGEhJyxwdHM6J1BvbnR1YcOnw6NvJyxyZWM6J1JlY29yZGUnLGFjYzonUHJlY2lzw6NvJyxzZXE6J1NlcXXDqm5jaWEnLGNsZWFyOidsaW1wYXInLGRyYXc6J2Rlc2VuaGUgbyB0b20nLG5ld0Jlc3Q6J05vdm8gbWVsaG9yIHJlc3VsdGFkbyEnfSwKICAgICAgICAgICAgICAgZW46e3Njb3JlOidTQ09SRScsYmVzdDonQkVTVCcsc3RhcnQ6J1N0YXJ0JyxiZXN0U2NvcmU6J0Jlc3Qgc2NvcmUnLGJhY2tTdGFydDonQmFjayB0byBzdGFydCcsZG9uZTonU2Vzc2lvbiBjb21wbGV0ZSEnLHB0czonU2NvcmUnLHJlYzonQmVzdCcsYWNjOidBY2N1cmFjeScsc2VxOidTdHJlYWsnLGNsZWFyOidjbGVhcicsZHJhdzonZHJhdyB0aGUgdG9uZScsbmV3QmVzdDonTmV3IHBlcnNvbmFsIGJlc3QhJ319OwogIGNvbnN0IEdUPWs9PkhaX0dUW0haX0dMQU5HXVtrXXx8azsKICB0cnl7Y29uc3QgZmU9d2luZG93LmZyYW1lRWxlbWVudDtpZihmZSYmZmUuZGF0YXNldCYmZmUuZGF0YXNldC5hYyl7ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLWFjZycsZmUuZGF0YXNldC5hYyk7aWYoZmUuZGF0YXNldC5hY3JnYilkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tYWNnLXJnYicsZmUuZGF0YXNldC5hY3JnYik7fX1jYXRjaHt9CgogIGNvbnN0ICQgPSAocywgcm9vdD1kb2N1bWVudCkgPT4gcm9vdC5xdWVyeVNlbGVjdG9yKHMpOwogIGNvbnN0ICQkID0gKHMsIHJvb3Q9ZG9jdW1lbnQpID0+IFsuLi5yb290LnF1ZXJ5U2VsZWN0b3JBbGwocyldOwoKICBjb25zdCBTVE9SQUdFX0tFWSA9ICdwaW55aW5Ub25lTGFiLmJlc3QudjcnOwogIGNvbnN0IHN0YXRlID0gewogICAgc2NyZWVuOiAnaG9tZScsCiAgICBzZXR0aW5nczogewogICAgICB0YXNrTW9kZTogJ3JhbmRvbScsCiAgICAgIHVuaXRNb2RlOiAncmFuZG9tJywKICAgICAgc291cmNlTW9kZTogJ2F1dG8nLAogICAgICBkaWZmaWN1bHR5OiAnaGFyZCcKICAgIH0sCiAgICBxdWV1ZTogW10sCiAgICBxdWV1ZVNpemU6IDYsCiAgICBzdGF0czp7dG90YWw6MCxjb3JyZWN0OjAsbWF4U3RyZWFrOjB9LAogICAgY3VycmVudDogbnVsbCwKICAgIGJ1c3k6IGZhbHNlLAogICAgc2NvcmU6IDAsCiAgICBiZXN0OiBOdW1iZXIobG9jYWxTdG9yYWdlLmdldEl0ZW0oU1RPUkFHRV9LRVkpIHx8IDApLAogICAgYXVkaW9DYWNoZTogbmV3IE1hcCgpLAogICAgZHJhd1BhZHM6IFtdLAogICAgZHJhd1ZhbGlkYXRlVGltZXI6IG51bGwKICB9OwoKICBjb25zdCBlbHMgPSB7CiAgICBob21lOiAkKCcjaG9tZScpLCBnYW1lOiAkKCcjZ2FtZScpLCBjaGFsbGVuZ2U6ICQoJyNjaGFsbGVuZ2UnKSwgdG9hc3Q6ICQoJyN0b2FzdCcpLCBhbnN3ZXJTdHJpcDogJCgnI2Fuc3dlclN0cmlwJyksCiAgICBzdGFydEJ0bjogJCgnI3N0YXJ0QnRuJyksIHF1aWNrQnRuOiAkKCcjcXVpY2tCdG4nKSwgZXhpdEJ0bjogJCgnI2V4aXRCdG4nKSwgcmVwbGF5QnRuOiAkKCcjcmVwbGF5QnRuJyksCiAgICBzY29yZVZhbDogJCgnI3Njb3JlVmFsJyksIGJlc3RWYWw6ICQoJyNiZXN0VmFsJyksIGhvbWVCZXN0OiAkKCcjaG9tZUJlc3QnKQogIH07CgogIGNvbnN0IEJBU0VfU1lMTEFCTEVTID0gWwogICAgWydtYScsJ29wZW4nXSxbJ2JhJywnb3BlbiddLFsncGEnLCdvcGVuJ10sWydmYScsJ29wZW4nXSxbJ2RhJywnb3BlbiddLFsndGEnLCdvcGVuJ10sWyduYScsJ29wZW4nXSxbJ2xhJywnb3BlbiddLFsnZ2EnLCdvcGVuJ10sWydrYScsJ29wZW4nXSxbJ2hhJywnb3BlbiddLAogICAgWydibycsJ29wZW4nXSxbJ3BvJywnb3BlbiddLFsnbW8nLCdvcGVuJ10sWydmbycsJ29wZW4nXSxbJ2RlJywnb3BlbiddLFsndGUnLCdvcGVuJ10sWyduZScsJ29wZW4nXSxbJ2xlJywnb3BlbiddLFsnZ2UnLCdvcGVuJ10sWydrZScsJ29wZW4nXSxbJ2hlJywnb3BlbiddLAogICAgWydtaScsJ29wZW4nXSxbJ2JpJywnb3BlbiddLFsncGknLCdvcGVuJ10sWydkaScsJ29wZW4nXSxbJ3RpJywnb3BlbiddLFsnbmknLCdvcGVuJ10sWydsaScsJ29wZW4nXSxbJ2ppJywncGFsYXRhbCddLFsncWknLCdwYWxhdGFsJ10sWyd4aScsJ3BhbGF0YWwnXSwKICAgIFsnbXUnLCdvcGVuJ10sWydidScsJ29wZW4nXSxbJ3B1Jywnb3BlbiddLFsnZnUnLCdvcGVuJ10sWydkdScsJ29wZW4nXSxbJ3R1Jywnb3BlbiddLFsnbnUnLCdvcGVuJ10sWydsdScsJ29wZW4nXSxbJ2d1Jywnb3BlbiddLFsna3UnLCdvcGVuJ10sWydodScsJ29wZW4nXSwKICAgIFsnemh1JywncmV0cm8nXSxbJ2NodScsJ3JldHJvJ10sWydzaHUnLCdyZXRybyddLFsncnUnLCdyZXRybyddLFsnenUnLCdhbHZlb2xhciddLFsnY3UnLCdhbHZlb2xhciddLFsnc3UnLCdhbHZlb2xhciddLAogICAgWyd6aGknLCdyZXRybyddLFsnY2hpJywncmV0cm8nXSxbJ3NoaScsJ3JldHJvJ10sWydyaScsJ3JldHJvJ10sWyd6aScsJ2FsdmVvbGFyJ10sWydjaScsJ2FsdmVvbGFyJ10sWydzaScsJ2FsdmVvbGFyJ10sCiAgICBbJ3lhJywnb3BlbiddLFsneWUnLCdvcGVuJ10sWyd5YW8nLCdvcGVuJ10sWyd5b3UnLCdvcGVuJ10sWyd5YW4nLCduYXNhbCddLFsneWFuZycsJ25hc2FsJ10sWyd5aW4nLCduYXNhbCddLFsneWluZycsJ25hc2FsJ10sWyd5b25nJywnbmFzYWwnXSxbJ3dhJywnb3BlbiddLFsnd28nLCdvcGVuJ10sWyd3YWknLCdvcGVuJ10sWyd3ZWknLCdvcGVuJ10sWyd3YW4nLCduYXNhbCddLFsnd2FuZycsJ25hc2FsJ10sWyd3ZW4nLCduYXNhbCddLFsnd2VuZycsJ25hc2FsJ10sCiAgICBbJ2FpJywnb3BlbiddLFsnZWknLCdvcGVuJ10sWydhbycsJ29wZW4nXSxbJ291Jywnb3BlbiddLFsnYW4nLCduYXNhbCddLFsnZW4nLCduYXNhbCddLFsnYW5nJywnbmFzYWwnXSxbJ2VuZycsJ25hc2FsJ10sWydlcicsJ29wZW4nXSwKICAgIFsnYmFpJywnb3BlbiddLFsnYmVpJywnb3BlbiddLFsnYmFvJywnb3BlbiddLFsnYmFuJywnbmFzYWwnXSxbJ2JlbicsJ25hc2FsJ10sWydiYW5nJywnbmFzYWwnXSxbJ3BlbmcnLCduYXNhbCddLFsncGluZycsJ25hc2FsJ10sWydtaW5nJywnbmFzYWwnXSwKICAgIFsnZG9uZycsJ25hc2FsJ10sWyd0b25nJywnbmFzYWwnXSxbJ25vbmcnLCduYXNhbCddLFsnbG9uZycsJ25hc2FsJ10sWydnb25nJywnbmFzYWwnXSxbJ2tvbmcnLCduYXNhbCddLFsnaG9uZycsJ25hc2FsJ10sCiAgICBbJ2ppYScsJ3BhbGF0YWwnXSxbJ3FpYScsJ3BhbGF0YWwnXSxbJ3hpYScsJ3BhbGF0YWwnXSxbJ2ppZScsJ3BhbGF0YWwnXSxbJ3FpZScsJ3BhbGF0YWwnXSxbJ3hpZScsJ3BhbGF0YWwnXSxbJ2ppYW8nLCdwYWxhdGFsJ10sWydxaWFvJywncGFsYXRhbCddLFsneGlhbycsJ3BhbGF0YWwnXSxbJ2ppdScsJ3BhbGF0YWwnXSxbJ3FpdScsJ3BhbGF0YWwnXSxbJ3hpdScsJ3BhbGF0YWwnXSxbJ2ppYW4nLCdwYWxhdGFsJ10sWydxaWFuJywncGFsYXRhbCddLFsneGlhbicsJ3BhbGF0YWwnXSxbJ2ppbicsJ3BhbGF0YWwnXSxbJ3FpbicsJ3BhbGF0YWwnXSxbJ3hpbicsJ3BhbGF0YWwnXSxbJ2ppYW5nJywncGFsYXRhbCddLFsncWlhbmcnLCdwYWxhdGFsJ10sWyd4aWFuZycsJ3BhbGF0YWwnXSxbJ2ppbmcnLCdwYWxhdGFsJ10sWydxaW5nJywncGFsYXRhbCddLFsneGluZycsJ3BhbGF0YWwnXSxbJ2ppb25nJywncGFsYXRhbCddLFsncWlvbmcnLCdwYWxhdGFsJ10sWyd4aW9uZycsJ3BhbGF0YWwnXSwKICAgIFsnemhhJywncmV0cm8nXSxbJ2NoYScsJ3JldHJvJ10sWydzaGEnLCdyZXRybyddLFsncmUnLCdyZXRybyddLFsnemhlJywncmV0cm8nXSxbJ2NoZScsJ3JldHJvJ10sWydzaGUnLCdyZXRybyddLFsnemhhbycsJ3JldHJvJ10sWydjaGFvJywncmV0cm8nXSxbJ3NoYW8nLCdyZXRybyddLFsnemhvdScsJ3JldHJvJ10sWydjaG91JywncmV0cm8nXSxbJ3Nob3UnLCdyZXRybyddLFsnemhhbicsJ3JldHJvJ10sWydjaGFuJywncmV0cm8nXSxbJ3NoYW4nLCdyZXRybyddLFsncmVuJywncmV0cm8nXSxbJ3poYW5nJywncmV0cm8nXSxbJ2NoYW5nJywncmV0cm8nXSxbJ3NoYW5nJywncmV0cm8nXSxbJ3pob25nJywncmV0cm8nXSxbJ2Nob25nJywncmV0cm8nXSxbJ3JvbmcnLCdyZXRybyddLAogICAgWyd6YScsJ2FsdmVvbGFyJ10sWydjYScsJ2FsdmVvbGFyJ10sWydzYScsJ2FsdmVvbGFyJ10sWyd6ZScsJ2FsdmVvbGFyJ10sWydjZScsJ2FsdmVvbGFyJ10sWydzZScsJ2FsdmVvbGFyJ10sWyd6YW8nLCdhbHZlb2xhciddLFsnY2FvJywnYWx2ZW9sYXInXSxbJ3NhbycsJ2FsdmVvbGFyJ10sWyd6b3UnLCdhbHZlb2xhciddLFsnY291JywnYWx2ZW9sYXInXSxbJ3NvdScsJ2FsdmVvbGFyJ10sWyd6YW4nLCdhbHZlb2xhciddLFsnY2FuJywnYWx2ZW9sYXInXSxbJ3NhbicsJ2FsdmVvbGFyJ10sWyd6ZW4nLCdhbHZlb2xhciddLFsnY2VuJywnYWx2ZW9sYXInXSxbJ3NlbicsJ2FsdmVvbGFyJ10sWyd6YW5nJywnYWx2ZW9sYXInXSxbJ2NhbmcnLCdhbHZlb2xhciddLFsnc2FuZycsJ2FsdmVvbGFyJ10sWyd6b25nJywnYWx2ZW9sYXInXSxbJ2NvbmcnLCdhbHZlb2xhciddLFsnc29uZycsJ2FsdmVvbGFyJ10sCiAgICBbJ2d1YScsJ29wZW4nXSxbJ2t1YScsJ29wZW4nXSxbJ2h1YScsJ29wZW4nXSxbJ2d1bycsJ29wZW4nXSxbJ2t1bycsJ29wZW4nXSxbJ2h1bycsJ29wZW4nXSxbJ2d1YWknLCdvcGVuJ10sWydrdWFpJywnb3BlbiddLFsnaHVhaScsJ29wZW4nXSxbJ2d1YW4nLCduYXNhbCddLFsna3VhbicsJ25hc2FsJ10sWydodWFuJywnbmFzYWwnXSxbJ2d1YW5nJywnbmFzYWwnXSxbJ2t1YW5nJywnbmFzYWwnXSxbJ2h1YW5nJywnbmFzYWwnXQogIF0ubWFwKChbYmFzZSwgZ3JvdXBdKSA9PiAoe2Jhc2UsIGdyb3VwfSkpOwoKICBjb25zdCBCWV9HUk9VUCA9IEJBU0VfU1lMTEFCTEVTLnJlZHVjZSgoYSwgcykgPT4geyAoYVtzLmdyb3VwXSB8fD0gW10pLnB1c2gocyk7IHJldHVybiBhOyB9LCB7fSk7CiAgY29uc3QgVE9ORVMgPSBbMSwyLDMsNCw1XTsKICBjb25zdCBUT05FX1dFSUdIVFMgPSBbMC4yMywwLjI3LDAuMjQsMC4yMiwwLjA0XTsKICBjb25zdCBUUkFOU0lUSU9OUyA9IHsKICAgIG9wZW46ICAgICBbWydvcGVuJywuMzZdLFsnbmFzYWwnLC4yN10sWydwYWxhdGFsJywuMTddLFsncmV0cm8nLC4xMF0sWydhbHZlb2xhcicsLjEwXV0sCiAgICBuYXNhbDogICAgW1snb3BlbicsLjI2XSxbJ25hc2FsJywuMjZdLFsncGFsYXRhbCcsLjIwXSxbJ3JldHJvJywuMTVdLFsnYWx2ZW9sYXInLC4xM11dLAogICAgcGFsYXRhbDogIFtbJ29wZW4nLC4yNF0sWyduYXNhbCcsLjIyXSxbJ3BhbGF0YWwnLC4yNF0sWydyZXRybycsLjE1XSxbJ2FsdmVvbGFyJywuMTVdXSwKICAgIHJldHJvOiAgICBbWydvcGVuJywuMjZdLFsnbmFzYWwnLC4yMF0sWydwYWxhdGFsJywuMTZdLFsncmV0cm8nLC4yNF0sWydhbHZlb2xhcicsLjE0XV0sCiAgICBhbHZlb2xhcjogW1snb3BlbicsLjI2XSxbJ25hc2FsJywuMjBdLFsncGFsYXRhbCcsLjE4XSxbJ3JldHJvJywuMTVdLFsnYWx2ZW9sYXInLC4yMV1dCiAgfTsKCiAgY29uc3QgU0lNX0lOSVRJQUxTID0gWwogICAgWyd6aCcsJ2NoJywnc2gnLCdyJ10sWyd6JywnYycsJ3MnXSxbJ2onLCdxJywneCddLFsnZycsJ2snLCdoJ10sWydiJywncCcsJ20nLCdmJ10sWydkJywndCcsJ24nLCdsJ10KICBdOwogIGNvbnN0IFNJTV9GSU5BTFMgPSBbCiAgICBbJ2FuJywnYW5nJ10sWydlbicsJ2VuZyddLFsnaW4nLCdpbmcnXSxbJ2lhbicsJ2lhbmcnXSxbJ3VhbicsJ3VhbmcnXSxbJ291JywndW8nXSxbJ2FvJywnaWFvJ10sWydhaScsJ2VpJ10sWyd1Jywnb3UnXSxbJ2knLCdpZSddLFsnYScsJ2lhJ10sWydlJywnaWUnXSxbJ29uZycsJ2lvbmcnXSxbJ3VpJywndWVpJ10KICBdOwoKICBmdW5jdGlvbiByYW5kKG4peyByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKm4pOyB9CiAgZnVuY3Rpb24gcGljayhhcnIpeyByZXR1cm4gYXJyW3JhbmQoYXJyLmxlbmd0aCldOyB9CiAgZnVuY3Rpb24gd2VpZ2h0ZWQoaXRlbXMpewogICAgbGV0IHIgPSBNYXRoLnJhbmRvbSgpICogaXRlbXMucmVkdWNlKChzLCBpdCkgPT4gcyArIGl0WzFdLCAwKTsKICAgIGZvcihjb25zdCBbdix3XSBvZiBpdGVtcyl7IHIgLT0gdzsgaWYociA8PSAwKSByZXR1cm4gdjsgfQogICAgcmV0dXJuIGl0ZW1zW2l0ZW1zLmxlbmd0aC0xXVswXTsKICB9CiAgZnVuY3Rpb24gd2VpZ2h0ZWRUb25lKCl7CiAgICBsZXQgciA9IE1hdGgucmFuZG9tKCk7CiAgICBmb3IobGV0IGk9MDtpPFRPTkVTLmxlbmd0aDtpKyspeyByIC09IFRPTkVfV0VJR0hUU1tpXTsgaWYociA8PSAwKSByZXR1cm4gVE9ORVNbaV07IH0KICAgIHJldHVybiA0OwogIH0KICBmdW5jdGlvbiBzaHVmZmxlKGFycil7CiAgICBjb25zdCBhID0gYXJyLnNsaWNlKCk7CiAgICBmb3IobGV0IGk9YS5sZW5ndGgtMTtpPjA7aS0tKXsgY29uc3Qgaj1yYW5kKGkrMSk7IFthW2ldLGFbal1dPVthW2pdLGFbaV1dOyB9CiAgICByZXR1cm4gYTsKICB9CgogIGZ1bmN0aW9uIHRvbmVNYXJrKGJhc2UsIHRvbmUpewogICAgaWYodG9uZSA9PT0gNSkgcmV0dXJuIGJhc2UucmVwbGFjZSgndicsJ8O8Jyk7CiAgICBjb25zdCBtYXJrcyA9IHsKICAgICAgYTpbJ8SBJywnw6EnLCfHjicsJ8OgJ10sIGU6WyfEkycsJ8OpJywnxJsnLCfDqCddLCBpOlsnxKsnLCfDrScsJ8eQJywnw6wnXSwgbzpbJ8WNJywnw7MnLCfHkicsJ8OyJ10sIHU6WyfFqycsJ8O6Jywnx5QnLCfDuSddLCB2Olsnx5YnLCfHmCcsJ8eaJywnx5wnXQogICAgfTsKICAgIGxldCBzID0gYmFzZTsKICAgIGxldCBpZHggPSAtMTsKICAgIGlmKHMuaW5jbHVkZXMoJ2EnKSkgaWR4ID0gcy5pbmRleE9mKCdhJyk7CiAgICBlbHNlIGlmKHMuaW5jbHVkZXMoJ2UnKSkgaWR4ID0gcy5pbmRleE9mKCdlJyk7CiAgICBlbHNlIGlmKHMuaW5jbHVkZXMoJ291JykpIGlkeCA9IHMuaW5kZXhPZignbycpOwogICAgZWxzZSB7CiAgICAgIGZvcihsZXQgaT1zLmxlbmd0aC0xO2k+PTA7aS0tKXsgaWYoJ2lvdXYnLmluY2x1ZGVzKHNbaV0pKXsgaWR4PWk7IGJyZWFrOyB9IH0KICAgIH0KICAgIGlmKGlkeCA8IDApIHJldHVybiBzOwogICAgY29uc3QgY2ggPSBzW2lkeF07CiAgICByZXR1cm4gKHMuc2xpY2UoMCxpZHgpICsgbWFya3NbY2hdW3RvbmUtMV0gKyBzLnNsaWNlKGlkeCsxKSkucmVwbGFjZSgndicsJ8O8Jyk7CiAgfQoKICAKICBmdW5jdGlvbiBjaG9vc2VWb2ljZSh0b25lKXsKICAgIGlmKHRvbmUgPT09IDUpIHJldHVybiBwaWNrKFsncHVycGxlJywnYXJjaCddKTsKICAgIGlmKHN0YXRlLnNldHRpbmdzLnNvdXJjZU1vZGUgPT09ICdhdXRvJykgcmV0dXJuIHBpY2soWyd5b3lvJywneWFibGEnLCdzdHVkeWNsaSddKTsKICAgIHJldHVybiBzdGF0ZS5zZXR0aW5ncy5zb3VyY2VNb2RlOwogIH0KCiAgZnVuY3Rpb24gc3lsbGFibGUoYmFzZSwgdG9uZSwgdm9pY2UpewogICAgcmV0dXJuIHtiYXNlLCB0b25lLCBtYXJrOnRvbmVNYXJrKGJhc2UsdG9uZSksIGtleTpiYXNlICsgdG9uZSwgdm9pY2U6IHZvaWNlIHx8IGNob29zZVZvaWNlKHRvbmUpfTsKICB9CgogIGZ1bmN0aW9uIHJhbmRvbVN5bGxhYmxlRnJvbShsaXN0KXsKICAgIGNvbnN0IHMgPSBwaWNrKGxpc3QgfHwgQkFTRV9TWUxMQUJMRVMpOwogICAgcmV0dXJuIHN5bGxhYmxlKHMuYmFzZSwgd2VpZ2h0ZWRUb25lKCkpOwogIH0KICBmdW5jdGlvbiByYW5kb21TeWxsYWJsZSgpeyByZXR1cm4gcmFuZG9tU3lsbGFibGVGcm9tKEJBU0VfU1lMTEFCTEVTKTsgfQoKICBmdW5jdGlvbiByYW5kb21QYWlyKCl7CiAgICBjb25zdCBmaXJzdE1ldGEgPSBwaWNrKEJBU0VfU1lMTEFCTEVTKTsKICAgIGNvbnN0IG5leHRHcm91cCA9IHdlaWdodGVkKFRSQU5TSVRJT05TW2ZpcnN0TWV0YS5ncm91cF0gfHwgVFJBTlNJVElPTlMub3Blbik7CiAgICBsZXQgc2Vjb25kTWV0YSA9IHBpY2soQllfR1JPVVBbbmV4dEdyb3VwXSB8fCBCQVNFX1NZTExBQkxFUyk7CiAgICBsZXQgZ3VhcmQgPSAwOwogICAgd2hpbGUoc2Vjb25kTWV0YS5iYXNlID09PSBmaXJzdE1ldGEuYmFzZSAmJiBndWFyZCsrIDwgOCkgc2Vjb25kTWV0YSA9IHBpY2soQllfR1JPVVBbbmV4dEdyb3VwXSB8fCBCQVNFX1NZTExBQkxFUyk7CiAgICBjb25zdCB0b25lMSA9IHdlaWdodGVkVG9uZSgpOwogICAgY29uc3QgdG9uZTIgPSBzdGF0ZS5zZXR0aW5ncy5kaWZmaWN1bHR5ID09PSAnaGFyZCcgJiYgTWF0aC5yYW5kb20oKSA8IC42MiA/IG5lYXJUb25lKHRvbmUxKSA6IHdlaWdodGVkVG9uZSgpOwogICAgcmV0dXJuIFtzeWxsYWJsZShmaXJzdE1ldGEuYmFzZSwgdG9uZTEpLCBzeWxsYWJsZShzZWNvbmRNZXRhLmJhc2UsIHRvbmUyKV07CiAgfQoKICBmdW5jdGlvbiBhdWRpb1VybHMoc3lsKXsKICAgIGNvbnN0IHlveW8gPSBgaHR0cHM6Ly9jZG4ueW95b2NoaW5lc2UuY29tL2F1ZGlvL3B5Y2hhcnQvJHtzeWwuYmFzZX0ke3N5bC50b25lfS5tcDNgOwogICAgY29uc3QgeWFibGEgPSBgaHR0cHM6Ly95YWJsYS5iLWNkbi5uZXQvbWVkaWEueWFibGEuY29tL2NoaW5lc2Vfc3RhdGljL2F1ZGlvL2FsaWNpYS8ke3N5bC5iYXNlfSR7c3lsLnRvbmV9Lm1wM2A7CiAgICBjb25zdCBzdHVkeWNsaSA9IGBodHRwczovL3N0dWR5Y2xpLm9yZy93cC1jb250ZW50L3VwbG9hZHMvbXAzLyR7c3lsLmJhc2V9JHtzeWwudG9uZX0ubXAzYDsKICAgIGNvbnN0IHB1cnBsZSA9IGBodHRwczovL3d3dy5wdXJwbGVjdWx0dXJlLm5ldC9tcDMvJHtzeWwuYmFzZX0ke3N5bC50b25lfS5tcDNgOwogICAgY29uc3QgYXJjaCA9IGBodHRwczovL3d3dy5hcmNoY2hpbmVzZS5jb20vc3dmLyR7c3lsLmJhc2V9JHtzeWwudG9uZX0ubXAzYDsKCiAgICBpZihzeWwudG9uZSA9PT0gNSl7CiAgICAgIGNvbnN0IG5ldXRyYWwgPSBzeWwudm9pY2UgPT09ICdhcmNoJyA/IFthcmNoLCBwdXJwbGVdIDogW3B1cnBsZSwgYXJjaF07CiAgICAgIHJldHVybiBuZXV0cmFsOwogICAgfQoKICAgIGNvbnN0IHBvb2wgPSB7eW95bywgeWFibGEsIHN0dWR5Y2xpfTsKICAgIGNvbnN0IGNob3NlbiA9IHBvb2xbc3lsLnZvaWNlXSA/IHN5bC52b2ljZSA6IChzdGF0ZS5zZXR0aW5ncy5zb3VyY2VNb2RlID09PSAnYXV0bycgPyBwaWNrKFsneW95bycsJ3lhYmxhJywnc3R1ZHljbGknXSkgOiBzdGF0ZS5zZXR0aW5ncy5zb3VyY2VNb2RlKTsKICAgIGNvbnN0IHJlc3QgPSBbJ3lveW8nLCd5YWJsYScsJ3N0dWR5Y2xpJ10uZmlsdGVyKHYgPT4gdiAhPT0gY2hvc2VuKTsKICAgIHJldHVybiBbcG9vbFtjaG9zZW5dLCAuLi5yZXN0Lm1hcCh2ID0+IHBvb2xbdl0pXTsKICB9CgogIGZ1bmN0aW9uIHByZWxvYWRVcmwodXJsKXsKICAgIGlmKHN0YXRlLmF1ZGlvQ2FjaGUuaGFzKHVybCkpIHJldHVybiBzdGF0ZS5hdWRpb0NhY2hlLmdldCh1cmwpOwogICAgLy8gUHLDqS1jYXJyZWdhIHBvciBmZXRjaC9XZWJBdWRpbyB1bWEgw7puaWNhIHZlei4gTyBlbGVtZW50byA8YXVkaW8+IHPDsyBuYXNjZQogICAgLy8gY29tbyBmYWxsYmFjayBubyBtb21lbnRvIGRhIHJlcHJvZHXDp8OjbywgZXZpdGFuZG8gZG93bmxvYWQgZHVwbGljYWRvLgogICAgY29uc3QgaXRlbSA9IHthdWRpbzpudWxsLCB1cmwsIHJlYWR5OmZhbHNlLCBmYWlsZWQ6ZmFsc2V9OwogICAgc3RhdGUuYXVkaW9DYWNoZS5zZXQodXJsLCBpdGVtKTsKICAgIGh6RGVjb2RlKGl0ZW0pOwogICAgcmV0dXJuIGl0ZW07CiAgfQoKICBmdW5jdGlvbiBwcmVsb2FkU3lsbGFibGUoc3lsKXsKICAgIGNvbnN0IHByaW1hcnk9YXVkaW9VcmxzKHN5bClbMF07CiAgICBpZihwcmltYXJ5KXByZWxvYWRVcmwocHJpbWFyeSk7CiAgfQogIGZ1bmN0aW9uIHByZWxvYWRDaGFsbGVuZ2UoY2gpeyBjaC5zeWxsYWJsZXMuZm9yRWFjaChwcmVsb2FkU3lsbGFibGUpOyB9CgogIC8vIEZvbnRlcyB0w6ptIGxvdWRuZXNzIGRpZmVyZW50ZTsgZ2FuaG8gZXN0w6F0aWNvIHBvciBob3N0ICsgY29tcHJlc3NvciBuaXZlbGFtLgogIGNvbnN0IEhPU1RfR0FJTj1bWy9wdXJwbGVjdWx0dXJlL2ksMS41XSxbL2FyY2hjaGluZXNlL2ksMS42XSxbL3N0dWR5Y2xpL2ksMS4zXSxbL3lhYmxhL2ksMS4wNV0sWy95b3lvY2hpbmVzZS9pLDEuMF1dOwogIGZ1bmN0aW9uIHVybEdhaW4odSl7Zm9yKGNvbnN0W3IsZ11vZiBIT1NUX0dBSU4paWYoci50ZXN0KHUpKXJldHVybiBnO3JldHVybiAxO30KICBsZXQgaHpBQz1udWxsLGh6Q29tcD1udWxsLGh6TG91ZFJlZj0wOyAvLyBSTVMgZG8gw6F1ZGlvIG1haXMgYWx0byBqw6EgYW5hbGlzYWRvID0gYWx2byBkZSBuaXZlbGFtZW50bwogIGNvbnN0IGh6SG9zdFJtcz17fTsgLy8gbcOpZGlhIGRlIFJNUyBwb3IgaG9zdDogZGV0ZWN0YSBzb3VyY2VzIGNvbnNpc3RlbnRlbWVudGUgYmFpeGFzCiAgZnVuY3Rpb24gaHpIb3N0T2YodSl7dHJ5e3JldHVybiBuZXcgVVJMKHUpLmhvc3Q7fWNhdGNoKGUpe3JldHVybiBTdHJpbmcodSkuc3BsaXQoJy8nKVsyXXx8dTt9fQogIGZ1bmN0aW9uIGh6Q3R4KCl7dHJ5e2lmKCFoekFDKXtjb25zdCBDPXdpbmRvdy5BdWRpb0NvbnRleHR8fHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7aWYoIUMpcmV0dXJuIG51bGw7aHpBQz1uZXcgQygpO2h6Q29tcD1oekFDLmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO2h6Q29tcC50aHJlc2hvbGQudmFsdWU9LTI0O2h6Q29tcC5rbmVlLnZhbHVlPTIwO2h6Q29tcC5yYXRpby52YWx1ZT03O2h6Q29tcC5hdHRhY2sudmFsdWU9LjAwNDtoekNvbXAucmVsZWFzZS52YWx1ZT0uMjtoekNvbXAuY29ubmVjdChoekFDLmRlc3RpbmF0aW9uKTt9aWYoaHpBQy5zdGF0ZT09PSdzdXNwZW5kZWQnKWh6QUMucmVzdW1lKCkuY2F0Y2goKCk9Pnt9KTtyZXR1cm4gaHpBQzt9Y2F0Y2goZSl7cmV0dXJuIG51bGw7fX0KICBmdW5jdGlvbiBoekRlY29kZShpdGVtKXsKICAgIGlmKGl0ZW0uYnVmfHxpdGVtLl9kcHx8aXRlbS5fZGYpcmV0dXJuOwogICAgaXRlbS5fZHA9dHJ1ZTsKICAgIGZldGNoKGl0ZW0udXJsLHttb2RlOidjb3JzJ30pLnRoZW4ocj0+e2lmKCFyLm9rKXRocm93IDA7cmV0dXJuIHIuYXJyYXlCdWZmZXIoKTt9KQogICAgICAudGhlbihhYj0+e2NvbnN0IGM9aHpDdHgoKTtpZighYyl0aHJvdyAwO3JldHVybiBuZXcgUHJvbWlzZSgocmVzLHJlaik9PmMuZGVjb2RlQXVkaW9EYXRhKGFiLHJlcyxyZWopKTt9KQogICAgICAudGhlbihidWY9PnsKICAgICAgICAvLyBtZWRlIGxvdWRuZXNzIHJlYWw6IFJNUyBlIHBpY28KICAgICAgICBsZXQgcGVhaz0wLHN1bT0wLG49MDsKICAgICAgICBmb3IobGV0IGM9MDtjPGJ1Zi5udW1iZXJPZkNoYW5uZWxzO2MrKyl7Y29uc3QgZD1idWYuZ2V0Q2hhbm5lbERhdGEoYyk7Zm9yKGxldCBpPTA7aTxkLmxlbmd0aDtpKz00KXtjb25zdCB2PU1hdGguYWJzKGRbaV0pO2lmKHY+cGVhaylwZWFrPXY7c3VtKz12KnY7bisrO319CiAgICAgICAgY29uc3Qgcm1zPW4/TWF0aC5zcXJ0KHN1bS9uKTowOwogICAgICAgIGlmKHBlYWs8MC4wMTJ8fHJtczwwLjAwMil7aXRlbS5zaWxlbnQ9dHJ1ZTtpdGVtLl9kZj10cnVlO3JldHVybjt9IC8vIGZvbnRlIG11ZGE6IGRlc2NhcnRhIGUgZm9yw6dhIGZhbGxiYWNrIGRlIHNvdXJjZQogICAgICAgIGl0ZW0ucm1zPXJtcztpdGVtLnBlYWs9cGVhazsKICAgICAgICBpZihybXM+aHpMb3VkUmVmKWh6TG91ZFJlZj1ybXM7IC8vIG8gbWFpcyBhbHRvIHZpcmEgYSByZWZlcsOqbmNpYQogICAgICAgIGNvbnN0IGg9aHpIb3N0T2YoaXRlbS51cmwpO2NvbnN0IHN0PWh6SG9zdFJtc1toXXx8KGh6SG9zdFJtc1toXT17c3VtOjAsbjowfSk7c3Quc3VtKz1ybXM7c3QubisrOwogICAgICAgIGl0ZW0uYnVmPWJ1ZjsKICAgICAgfSkuY2F0Y2goKCk9PntpdGVtLl9kZj10cnVlO30pLmZpbmFsbHkoKCk9PntpdGVtLl9kcD1mYWxzZTt9KTsKICB9CiAgZnVuY3Rpb24gaHpQbGF5QnVmZmVyKGl0ZW0pewogICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLHJlamVjdCk9PnsKICAgICAgY29uc3QgYz1oekN0eCgpO2lmKCFjfHwhaXRlbS5idWYpcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ25vYnVmJykpOwogICAgICB0cnl7CiAgICAgICAgY29uc3Qgc3JjPWMuY3JlYXRlQnVmZmVyU291cmNlKCk7c3JjLmJ1ZmZlcj1pdGVtLmJ1ZjsKICAgICAgICBsZXQgZ3Y9MTsKICAgICAgICBpZihpdGVtLnJtcyYmaHpMb3VkUmVmPjApewogICAgICAgICAgZ3Y9aHpMb3VkUmVmL2l0ZW0ucm1zOyAgICAgICAgICAgICAvLyBhcHJveGltYSBkbyBtYWlzIGFsdG8KICAgICAgICAgIGlmKGl0ZW0ucGVhaz4wKWd2PU1hdGgubWluKGd2LDAuOTUvaXRlbS5wZWFrKTsgLy8gdHJhdmEgYW50aS1jbGlwcGluZwogICAgICAgICAgZ3Y9TWF0aC5tYXgoMSxNYXRoLm1pbig0LGd2KSk7ICAgICAvLyBzw7MgZWxldmE7IGxpbWl0ZSBzZWd1cm8gZGUgKzEyZEIKICAgICAgICB9ZWxzZSBndj11cmxHYWluKGl0ZW0udXJsKTsKICAgICAgICBjb25zdCBnPWMuY3JlYXRlR2FpbigpO2cuZ2Fpbi52YWx1ZT1ndjsKICAgICAgICBzcmMuY29ubmVjdChnKTtnLmNvbm5lY3QoaHpDb21wKTsKICAgICAgICBsZXQgZG9uZT1mYWxzZTtjb25zdCBmaW49KCk9PntpZighZG9uZSl7ZG9uZT10cnVlO3Jlc29sdmUoKTt9fTsKICAgICAgICBzcmMub25lbmRlZD1maW47c3JjLnN0YXJ0KCk7CiAgICAgICAgc2V0VGltZW91dChmaW4saXRlbS5idWYuZHVyYXRpb24qMTAwMCszMDApOwogICAgICB9Y2F0Y2goZSl7cmVqZWN0KGUpO30KICAgIH0pOwogIH0KICBmdW5jdGlvbiBwbGF5VXJsKHVybCl7CiAgICBjb25zdCBjYWNoZWQ9cHJlbG9hZFVybCh1cmwpOwogICAgaWYoY2FjaGVkLnNpbGVudClyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdzaWxlbnQgc291cmNlJykpOwogICAgY29uc3QgZ289KCk9PnsKICAgICAgaWYoY2FjaGVkLnNpbGVudClyZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdzaWxlbnQgc291cmNlJykpOwogICAgICBpZihjYWNoZWQuYnVmJiZoekN0eCgpKXJldHVybiBoelBsYXlCdWZmZXIoY2FjaGVkKS5jYXRjaCgoKT0+cGxheVVybEVsKGNhY2hlZCkpOwogICAgICByZXR1cm4gcGxheVVybEVsKGNhY2hlZCk7CiAgICB9OwogICAgaWYoY2FjaGVkLl9kcCl7IC8vIGFuw6FsaXNlIGVtIGFuZGFtZW50bzogYWd1YXJkYSBicmV2ZW1lbnRlIHBhcmEgdG9jYXIgasOhIG5vcm1hbGl6YWRvCiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXM9PntsZXQgdz0wO2NvbnN0IHQ9c2V0SW50ZXJ2YWwoKCk9PntpZighY2FjaGVkLl9kcHx8Kyt3Pjkpe2NsZWFySW50ZXJ2YWwodCk7cmVzKCk7fX0sNTApO30pLnRoZW4oZ28pOwogICAgfQogICAgcmV0dXJuIGdvKCk7CiAgfQogIGZ1bmN0aW9uIHBsYXlVcmxFbChjYWNoZWQpewogICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHsKICAgICAgbGV0IGEgPSBjYWNoZWQuYXVkaW87CiAgICAgIGlmKCFhKXsKICAgICAgICBhPW5ldyBBdWRpbygpO2EucHJlbG9hZD0nYXV0byc7YS5zcmM9Y2FjaGVkLnVybDtjYWNoZWQuYXVkaW89YTsKICAgICAgICB0cnl7YS5sb2FkKCk7fWNhdGNoKGUpe30KICAgICAgfQogICAgICBsZXQgZG9uZSA9IGZhbHNlOwogICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4geyBpZighZG9uZSl7IGRvbmUgPSB0cnVlOyB0cnl7YS5wYXVzZSgpfWNhdGNoe307IHJlamVjdChuZXcgRXJyb3IoJ2F1ZGlvIHRpbWVvdXQnKSk7IH0gfSwgMjYwMCk7CiAgICAgIHRyeSB7IGEucGF1c2UoKTsgYS5jdXJyZW50VGltZSA9IDA7IH0gY2F0Y2goZSkge30KICAgICAgYS5vbmVuZGVkID0gKCkgPT4geyBpZighZG9uZSl7IGRvbmUgPSB0cnVlOyBjbGVhclRpbWVvdXQodGltZXIpOyByZXNvbHZlKCk7IH0gfTsKICAgICAgYS5vbmVycm9yID0gKCkgPT4geyBpZighZG9uZSl7IGRvbmUgPSB0cnVlOyBjbGVhclRpbWVvdXQodGltZXIpOyByZWplY3QobmV3IEVycm9yKCdhdWRpbyBlcnJvcicpKTsgfSB9OwogICAgICBhLnBsYXkoKS5jYXRjaChlcnIgPT4geyBpZighZG9uZSl7IGRvbmUgPSB0cnVlOyBjbGVhclRpbWVvdXQodGltZXIpOyByZWplY3QoZXJyKTsgfSB9KTsKICAgIH0pOwogIH0KCiAgLy8gUmFucXVlaWEgc291cmNlczogbWVkaWRhIGluZGl2aWR1YWwgPiBtw6lkaWEgZG8gaG9zdCA+IG9yZGVtIG9yaWdpbmFsLgogIC8vIFNvdXJjZXMgbXVkYXMgdsOjbyBwYXJhIG8gZmltOyBiYWl4YXMgc8OzIHRvY2FtIHNlIG7Do28gaG91dmVyIGFsdGVybmF0aXZhLgogIGZ1bmN0aW9uIGh6UmFua1NvdXJjZXModXJscyl7CiAgICBjb25zdCBzY29yZT0odSk9PnsKICAgICAgY29uc3QgaXQ9c3RhdGUuYXVkaW9DYWNoZS5nZXQodSk7CiAgICAgIGlmKGl0KXsKICAgICAgICBpZihpdC5zaWxlbnQpcmV0dXJuIC0xOwogICAgICAgIGlmKHR5cGVvZiBpdC5ybXM9PT0nbnVtYmVyJylyZXR1cm4gaXQucm1zOwogICAgICB9CiAgICAgIGNvbnN0IHN0PWh6SG9zdFJtc1toekhvc3RPZih1KV07CiAgICAgIHJldHVybiBzdCYmc3Qubj49MT8oc3Quc3VtL3N0Lm4pKjAuOTI6MC4wMDAxOyAvLyBzZW0gbWVkacOnw6NvOiBlc3RpbWEgcGVsbyBob3N0CiAgICB9OwogICAgcmV0dXJuIHVybHMubWFwKCh1LGkpPT4oe3UsaSxzOnNjb3JlKHUpfSkpCiAgICAgIC5zb3J0KChhLGIpPT57IGlmKE1hdGguYWJzKGEucy1iLnMpPjAuMDIpcmV0dXJuIGIucy1hLnM7IHJldHVybiBhLmktYi5pOyB9KQogICAgICAubWFwKHg9PngudSk7CiAgfQogIGZ1bmN0aW9uIGh6V2FpdEFuYWx5c2lzKHVybHMsbXMpewogICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlcz0+ewogICAgICBjb25zdCB0MD1EYXRlLm5vdygpOwogICAgICBjb25zdCB0PXNldEludGVydmFsKCgpPT57CiAgICAgICAgY29uc3QgcGVuZD11cmxzLnNvbWUodT0+e2NvbnN0IGl0PXN0YXRlLmF1ZGlvQ2FjaGUuZ2V0KHUpO3JldHVybiBpdCYmaXQuX2RwO30pOwogICAgICAgIGlmKCFwZW5kfHxEYXRlLm5vdygpLXQwPm1zKXtjbGVhckludGVydmFsKHQpO3JlcygpO30KICAgICAgfSw0MCk7CiAgICB9KTsKICB9CiAgYXN5bmMgZnVuY3Rpb24gcGxheVN5bGxhYmxlKHN5bCl7CiAgICBjb25zdCB1cmxzID0gYXVkaW9VcmxzKHN5bCk7CiAgICAvLyBUZW50YSBhcyBmb250ZXMgZW0gc2VxdcOqbmNpYS4gQW50ZXMsIGFzIHRyw6pzIGVyYW0gYmFpeGFkYXMgZSBhbmFsaXNhZGFzCiAgICAvLyBhbyBtZXNtbyB0ZW1wbyBwYXJhIGNhZGEgc8OtbGFiYSwgbXVsdGlwbGljYW5kbyB0csOhZmVnbyBlIHVzbyBkZSBtZW3Ds3JpYS4KICAgIGZvcihjb25zdCB1cmwgb2YgdXJscyl7CiAgICAgIGNvbnN0IGl0ZW09cHJlbG9hZFVybCh1cmwpOwogICAgICBhd2FpdCBoeldhaXRBbmFseXNpcyhbdXJsXSw0MjApOwogICAgICB0cnkgeyBhd2FpdCBwbGF5VXJsKHVybCk7IHJldHVybiB0cnVlOyB9CiAgICAgIGNhdGNoKGUpIHsgaXRlbS5mYWlsZWQ9dHJ1ZTsgfQogICAgfQogICAgcmV0dXJuIGZhbHNlOwogIH0KICBmdW5jdGlvbiBzbGVlcChtcyl7IHJldHVybiBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgbXMpKTsgfQogIGxldCBoelBsYXlTZXE9MCxoekZsb3dHYXRlPTA7CiAgYXN5bmMgZnVuY3Rpb24gcGxheUN1cnJlbnQoKXsKICAgIGlmKCFzdGF0ZS5jdXJyZW50KSByZXR1cm47CiAgICBjb25zdCB0b2s9KytoelBsYXlTZXE7CiAgICBmb3IoY29uc3Qgc3lsIG9mIHN0YXRlLmN1cnJlbnQuc3lsbGFibGVzKXsKICAgICAgaWYodG9rIT09aHpQbGF5U2VxKXJldHVybjsKICAgICAgYXdhaXQgcGxheVN5bGxhYmxlKHN5bCk7CiAgICAgIGlmKHRvayE9PWh6UGxheVNlcSlyZXR1cm47CiAgICAgIGF3YWl0IHNsZWVwKDIwMCk7CiAgICB9CiAgfQoKICBmdW5jdGlvbiBzaW1pbGFyQmFzZShiYXNlKXsKICAgIGxldCBjYW5kaWRhdGVzID0gW107CiAgICBmb3IoY29uc3QgZ3JvdXAgb2YgU0lNX0lOSVRJQUxTKXsKICAgICAgY29uc3QgaW5pdGlhbCA9IGdyb3VwLmZpbmQoeCA9PiBiYXNlLnN0YXJ0c1dpdGgoeCkpOwogICAgICBpZihpbml0aWFsKXsKICAgICAgICBjb25zdCByZXN0ID0gYmFzZS5zbGljZShpbml0aWFsLmxlbmd0aCk7CiAgICAgICAgY2FuZGlkYXRlcy5wdXNoKC4uLmdyb3VwLmZpbHRlcih4ID0+IHggIT09IGluaXRpYWwpLm1hcCh4ID0+IHggKyByZXN0KSk7CiAgICAgIH0KICAgIH0KICAgIGZvcihjb25zdCBncm91cCBvZiBTSU1fRklOQUxTKXsKICAgICAgY29uc3QgZmluYWwgPSBncm91cC5maW5kKHggPT4gYmFzZS5lbmRzV2l0aCh4KSk7CiAgICAgIGlmKGZpbmFsKXsKICAgICAgICBjb25zdCBzdGVtID0gYmFzZS5zbGljZSgwLCBiYXNlLmxlbmd0aCAtIGZpbmFsLmxlbmd0aCk7CiAgICAgICAgY2FuZGlkYXRlcy5wdXNoKC4uLmdyb3VwLmZpbHRlcih4ID0+IHggIT09IGZpbmFsKS5tYXAoeCA9PiBzdGVtICsgeCkpOwogICAgICB9CiAgICB9CiAgICBjb25zdCB2YWxpZCA9IG5ldyBTZXQoQkFTRV9TWUxMQUJMRVMubWFwKHMgPT4gcy5iYXNlKSk7CiAgICBjYW5kaWRhdGVzID0gY2FuZGlkYXRlcy5maWx0ZXIoeCA9PiB2YWxpZC5oYXMoeCkpOwogICAgcmV0dXJuIGNhbmRpZGF0ZXMubGVuZ3RoID8gcGljayhjYW5kaWRhdGVzKSA6IHBpY2soQkFTRV9TWUxMQUJMRVMpLmJhc2U7CiAgfQoKICBmdW5jdGlvbiBuZWFyVG9uZSh0b25lKXsKICAgIGNvbnN0IG1hcCA9IHsKICAgICAgMTpbMiw0LDMsNV0sCiAgICAgIDI6WzMsMSw0LDVdLAogICAgICAzOlsyLDQsMSw1XSwKICAgICAgNDpbMSwzLDIsNV0sCiAgICAgIDU6WzEsMiwzLDRdCiAgICB9OwogICAgcmV0dXJuIHBpY2sobWFwW3RvbmVdIHx8IFRPTkVTLmZpbHRlcih4ID0+IHggIT09IHRvbmUpKTsKICB9CgogIGZ1bmN0aW9uIG1ha2VEaXN0cmFjdG9yKHRhcmdldHMsIHVzZWQpewogICAgY29uc3QgdCA9IHBpY2sodGFyZ2V0cyk7CiAgICBsZXQgYmFzZSA9IHQuYmFzZTsKICAgIGxldCB0b25lID0gdC50b25lOwogICAgY29uc3QgaGFyZCA9IHN0YXRlLnNldHRpbmdzLmRpZmZpY3VsdHkgPT09ICdoYXJkJzsKICAgIGNvbnN0IG1vZGUgPSBNYXRoLnJhbmRvbSgpOwoKICAgIGlmKGhhcmQpewogICAgICBpZihtb2RlIDwgLjQ0KXsKICAgICAgICAvLyBNZXNtbyBzb20sIHRvbSBwcm9wZW5zbyBhIGNvbmZ1c8Ojby4KICAgICAgICB0b25lID0gbmVhclRvbmUodC50b25lKTsKICAgICAgfSBlbHNlIGlmKG1vZGUgPCAuNzMpewogICAgICAgIC8vIFNvbSBwYXJlY2lkbywgbWVzbW8gdG9tLgogICAgICAgIGJhc2UgPSBzaW1pbGFyQmFzZSh0LmJhc2UpOwogICAgICB9IGVsc2UgaWYobW9kZSA8IC45NCl7CiAgICAgICAgLy8gU29tIHBhcmVjaWRvICsgdG9tIHZpemluaG8uCiAgICAgICAgYmFzZSA9IHNpbWlsYXJCYXNlKHQuYmFzZSk7CiAgICAgICAgdG9uZSA9IG5lYXJUb25lKHQudG9uZSk7CiAgICAgIH0gZWxzZSB7CiAgICAgICAgY29uc3QgcGVlciA9IHJhbmRvbVN5bGxhYmxlRnJvbShCWV9HUk9VUFsoQkFTRV9TWUxMQUJMRVMuZmluZCh4ID0+IHguYmFzZSA9PT0gdC5iYXNlKXx8e30pLmdyb3VwXSB8fCBCQVNFX1NZTExBQkxFUyk7CiAgICAgICAgYmFzZSA9IHBlZXIuYmFzZTsKICAgICAgICB0b25lID0gbmVhclRvbmUodC50b25lKTsKICAgICAgfQogICAgfSBlbHNlIHsKICAgICAgaWYobW9kZSA8IC40NikgdG9uZSA9IG5lYXJUb25lKHQudG9uZSk7CiAgICAgIGVsc2UgaWYobW9kZSA8IC43OCkgYmFzZSA9IHNpbWlsYXJCYXNlKHQuYmFzZSk7CiAgICAgIGVsc2UgeyBiYXNlID0gcmFuZG9tU3lsbGFibGUoKS5iYXNlOyB0b25lID0gd2VpZ2h0ZWRUb25lKCk7IH0KICAgIH0KCiAgICBsZXQgZCA9IHN5bGxhYmxlKGJhc2UsIHRvbmUpOwogICAgbGV0IGd1YXJkID0gMDsKICAgIHdoaWxlKHVzZWQuaGFzKGQua2V5KSAmJiBndWFyZCsrIDwgMjgpewogICAgICBjb25zdCByZXRyeUJhc2UgPSBNYXRoLnJhbmRvbSgpIDwgLjcwID8gc2ltaWxhckJhc2UodC5iYXNlKSA6IHJhbmRvbVN5bGxhYmxlKCkuYmFzZTsKICAgICAgZCA9IHN5bGxhYmxlKHJldHJ5QmFzZSwgTWF0aC5yYW5kb20oKSA8IC43MiA/IG5lYXJUb25lKHQudG9uZSkgOiB3ZWlnaHRlZFRvbmUoKSk7CiAgICB9CiAgICB1c2VkLmFkZChkLmtleSk7CiAgICByZXR1cm4gZDsKICB9CgogIGZ1bmN0aW9uIG1ha2VDaG9pY2VPcHRpb25zKHN5bGxhYmxlcyl7CiAgICBjb25zdCB1c2VkID0gbmV3IFNldChzeWxsYWJsZXMubWFwKHMgPT4gcy5rZXkpKTsKICAgIGNvbnN0IG9wdGlvbnMgPSBzeWxsYWJsZXMuc2xpY2UoKTsKICAgIGNvbnN0IHNpbmdsZSA9IHN5bGxhYmxlcy5sZW5ndGggPT09IDE7CiAgICBjb25zdCB0YXJnZXRDb3VudCA9IHNpbmdsZSA/IChzdGF0ZS5zZXR0aW5ncy5kaWZmaWN1bHR5ID09PSAnaGFyZCcgPyBwaWNrKFsyLDMsMyw0XSkgOiBwaWNrKFsyLDIsM10pKSA6IChzdGF0ZS5zZXR0aW5ncy5kaWZmaWN1bHR5ID09PSAnaGFyZCcgPyBwaWNrKFs1LDYsNl0pIDogcGljayhbNCw1XSkpOwogICAgd2hpbGUob3B0aW9ucy5sZW5ndGggPCB0YXJnZXRDb3VudCl7IG9wdGlvbnMucHVzaChtYWtlRGlzdHJhY3RvcihzeWxsYWJsZXMsIHVzZWQpKTsgfQogICAgcmV0dXJuIHNodWZmbGUob3B0aW9ucyk7CiAgfQoKICBmdW5jdGlvbiBnZW5lcmF0ZUNoYWxsZW5nZSgpewogICAgY29uc3QgdGFzayA9IHN0YXRlLnNldHRpbmdzLnRhc2tNb2RlID09PSAncmFuZG9tJyA/IChNYXRoLnJhbmRvbSgpIDwgLjUgPyAnY2hvaWNlJyA6ICdkcmF3JykgOiBzdGF0ZS5zZXR0aW5ncy50YXNrTW9kZTsKICAgIGNvbnN0IHVuaXQgPSBzdGF0ZS5zZXR0aW5ncy51bml0TW9kZSA9PT0gJ3JhbmRvbScgPyAoTWF0aC5yYW5kb20oKSA8IC41OCA/ICdzaW5nbGUnIDogJ2RvdWJsZScpIDogc3RhdGUuc2V0dGluZ3MudW5pdE1vZGU7CiAgICBjb25zdCBzeWxsYWJsZXMgPSB1bml0ID09PSAnc2luZ2xlJyA/IFtyYW5kb21TeWxsYWJsZSgpXSA6IHJhbmRvbVBhaXIoKTsKICAgIGNvbnN0IGNoID0gewogICAgICBpZDogY3J5cHRvUmFuZG9tKCksIHRhc2ssIHVuaXQsIHN5bGxhYmxlcywKICAgICAgYW5zd2VyVGV4dDogc3lsbGFibGVzLm1hcChzID0+IHMubWFyaykuam9pbignLycpLAogICAgICBvcHRpb25zOiBudWxsCiAgICB9OwogICAgaWYodGFzayA9PT0gJ2Nob2ljZScpIGNoLm9wdGlvbnMgPSBtYWtlQ2hvaWNlT3B0aW9ucyhzeWxsYWJsZXMpOwogICAgcmV0dXJuIGNoOwogIH0KCiAgZnVuY3Rpb24gY3J5cHRvUmFuZG9tKCl7CiAgICBpZih3aW5kb3cuY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpewogICAgICBjb25zdCBhID0gbmV3IFVpbnQzMkFycmF5KDEpOyBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGEpOyByZXR1cm4gYVswXS50b1N0cmluZygzNik7CiAgICB9CiAgICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMik7CiAgfQoKICBmdW5jdGlvbiBmaWxsUXVldWUoKXsKICAgIHdoaWxlKHN0YXRlLnF1ZXVlLmxlbmd0aCA8IHN0YXRlLnF1ZXVlU2l6ZSl7CiAgICAgIGNvbnN0IGNoID0gZ2VuZXJhdGVDaGFsbGVuZ2UoKTsKICAgICAgaWYoY2gudW5pdD09PSdkb3VibGUnKXtjaC5waHJhc2U9cGlja1BocmFzZShjaC5zeWxsYWJsZXMpfHxudWxsO30KICAgICAgc3RhdGUucXVldWUucHVzaChjaCk7CiAgICAgIC8vIEEgZmlsYSBtYW50w6ltIHNvbWVudGUgZGFkb3MuIMOBdWRpbyBlIGZyYXNlIHPDo28gcHJlcGFyYWRvcyBhcGVuYXMKICAgICAgLy8gcGFyYSBvIGRlc2FmaW8gYXR1YWwsIGV2aXRhbmRvIGRlemVuYXMgZGUgZG93bmxvYWRzIGFudGVjaXBhZG9zLgogICAgfQogIH0KCiAgZnVuY3Rpb24gcmVmaWxsU29vbigpewogICAgaWYoJ3JlcXVlc3RJZGxlQ2FsbGJhY2snIGluIHdpbmRvdykgcmVxdWVzdElkbGVDYWxsYmFjayhmaWxsUXVldWUsIHt0aW1lb3V0OjcwMH0pOwogICAgZWxzZSBzZXRUaW1lb3V0KGZpbGxRdWV1ZSwgNjApOwogIH0KCiAgZnVuY3Rpb24gc2V0U2NyZWVuKG5hbWUpewogICAgc3RhdGUuc2NyZWVuID0gbmFtZTsKICAgIGVscy5ob21lLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIG5hbWUgPT09ICdob21lJyk7CiAgICBlbHMuZ2FtZS5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLCBuYW1lID09PSAnZ2FtZScpOwogIH0KCiAgZnVuY3Rpb24gdXBkYXRlU2NvcmVzKCl7CiAgICBlbHMuc2NvcmVWYWwudGV4dENvbnRlbnQgPSBzdGF0ZS5zY29yZTsKICAgIGVscy5iZXN0VmFsLnRleHRDb250ZW50ID0gc3RhdGUuYmVzdDsKICAgIGVscy5ob21lQmVzdC50ZXh0Q29udGVudCA9IHN0YXRlLmJlc3Q7CiAgfQoKICBmdW5jdGlvbiBzYXZlQmVzdCgpewogICAgaWYoc3RhdGUuc2NvcmUgPiBzdGF0ZS5iZXN0KXsKICAgICAgc3RhdGUuYmVzdCA9IHN0YXRlLnNjb3JlOwogICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwgU3RyaW5nKHN0YXRlLmJlc3QpKTsKICAgIH0KICAgIHVwZGF0ZVNjb3JlcygpOwogIH0KCiAgZnVuY3Rpb24gaGlkZUFuc3dlcigpewogICAgZWxzLmFuc3dlclN0cmlwLmNsYXNzTmFtZSA9ICdhbnN3ZXItc3RyaXAnOwogICAgZWxzLmFuc3dlclN0cmlwLnRleHRDb250ZW50ID0gJyc7CiAgfQoKICBmdW5jdGlvbiBzaG93QW5zd2VyKG9rLCB0ZXh0KXsKICAgIGNvbnN0IGEgPSBlbHMuYW5zd2VyU3RyaXA7CiAgICBhLnRleHRDb250ZW50ID0gdGV4dDsKICAgIGEuY2xhc3NOYW1lID0gJ2Fuc3dlci1zdHJpcCBzaG93ICcgKyAob2sgPyAnZ29vZCcgOiAnYmFkJyk7CiAgICBjbGVhclRpbWVvdXQoYS5fdGltZXIpOwogICAgYS5fdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IGEuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpLCAxNDUwKTsKICB9CgogIGZ1bmN0aW9uIHNob3dUb2FzdChvaywgdGV4dCl7CiAgICAvLyBNYW50aWRvIHPDsyBjb21vIGZhbGxiYWNrIHZpc3VhbCBpbnRlcm5vOyBvIGZlZWRiYWNrIHByaW5jaXBhbCBhZ29yYSDDqSBvIGNhbXBvIGluZmVyaW9yLgogICAgc2hvd0Fuc3dlcihvaywgdGV4dCk7CiAgfQoKICBmdW5jdGlvbiBzdGFydEdhbWUoKXsKICAgIHN0YXRlLnN0YXRzPXt0b3RhbDowLGNvcnJlY3Q6MCxtYXhTdHJlYWs6MH07CiAgICB0cnl7aWYod2luZG93LnBhcmVudCYmdHlwZW9mIHdpbmRvdy5wYXJlbnQuaHpQcmVsb2FkQ2VsZWJyYXRpb249PT0nZnVuY3Rpb24nKXdpbmRvdy5wYXJlbnQuaHpQcmVsb2FkQ2VsZWJyYXRpb24oKTt9Y2F0Y2goZSl7fQogICAgY2dQcmVsb2FkKCk7CiAgICBzdGF0ZS5zY29yZSA9IDA7CiAgICBzdGF0ZS5jdXJyZW50ID0gbnVsbDsKICAgIHN0YXRlLmJ1c3kgPSBmYWxzZTsKICAgIHN0YXRlLmRyYXdQYWRzID0gW107CiAgICBjbGVhclRpbWVvdXQoc3RhdGUuZHJhd1ZhbGlkYXRlVGltZXIpOwogICAgaGlkZUFuc3dlcigpOwogICAgdXBkYXRlU2NvcmVzKCk7CiAgICBzZXRTY3JlZW4oJ2dhbWUnKTsKICAgIGZpbGxRdWV1ZSgpOwogICAgbmV4dENoYWxsZW5nZSgpOwogIH0KCiAgY29uc3QgU0VTU19aSD1bJ+eGn+iDveeUn+W3pycsJ+WKoOayue+8gScsJ+WBmuW+l+Wlve+8gScsJ+e7p+e7reWKquWKm++8gScsJ+S9oOW+iOajku+8gScsJ+WdmuaMgeWwseaYr+iDnOWIqScsJ+i2iuadpei2iuWlveS6hiddOwogIGZ1bmN0aW9uIGh6U2Vzc09wZW4oKXsKICAgIGNvbnN0IHN0PXN0YXRlLnN0YXRzLG92PWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXNzT3YnKTsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXNzU2NvcmUnKS50ZXh0Q29udGVudD1TdHJpbmcoc3QuY29ycmVjdCk7CiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RDb3JyZWN0JykudGV4dENvbnRlbnQ9U3RyaW5nKHN0LmNvcnJlY3QpOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0QmVzdCcpLnRleHRDb250ZW50PVN0cmluZyhzdGF0ZS5iZXN0KTsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdEFjYycpLnRleHRDb250ZW50PXN0LnRvdGFsP01hdGgucm91bmQoMTAwKnN0LmNvcnJlY3Qvc3QudG90YWwpKyclJzon4oCUJzsKICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdFN0cmVhaycpLnRleHRDb250ZW50PVN0cmluZyhzdC5tYXhTdHJlYWspOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nlc3NOZXcnKS50ZXh0Q29udGVudD0oc3QubWF4U3RyZWFrPj1zdGF0ZS5iZXN0JiZzdC5tYXhTdHJlYWs+MCk/J05vdm8gbWVsaG9yIHJlc3VsdGFkbyEnOicnOwogICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nlc3NaaCcpLnRleHRDb250ZW50PXBpY2soU0VTU19aSCk7CiAgICBjb25zdCBtaT1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2Vzc011c2ljJyk7bWkudGV4dENvbnRlbnQ9Jyc7CiAgICB0cnl7CiAgICAgIGlmKHdpbmRvdy5wYXJlbnQmJnR5cGVvZiB3aW5kb3cucGFyZW50Lmh6Q2VsZWJyYXRlPT09J2Z1bmN0aW9uJyl7CiAgICAgICAgY29uc3QgaW5mbz13aW5kb3cucGFyZW50Lmh6Q2VsZWJyYXRlKCk7CiAgICAgICAgaWYoaW5mbyYmaW5mby50cmFjayltaS5pbm5lckhUTUw9Jzxzdmcgd2lkdGg9IjEzIiBoZWlnaHQ9IjEzIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNyI+PGNpcmNsZSBjeD0iNi41IiBjeT0iMTguNSIgcj0iMi41Ii8+PGNpcmNsZSBjeD0iMTcuNSIgY3k9IjE2LjUiIHI9IjIuNSIvPjxwYXRoIGQ9Ik05IDE4LjVWNmwxMS0yLjV2MTIuNSIvPjwvc3ZnPiAnKyhpbmZvLnRyYWNrLnRpdGxlfHwn5Y+k562dJyk7CiAgICAgIH0KICAgIH1jYXRjaChlKXt9CiAgICBvdi5jbGFzc0xpc3QuYWRkKCdvcGVuJyk7CiAgfQogIGZ1bmN0aW9uIGh6U2Vzc0Nsb3NlKHJlc3RhcnQ9ZmFsc2UpewogICAgY29uc3Qgb3Y9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nlc3NPdicpO292LmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKTsKICAgIHRyeXtpZih3aW5kb3cucGFyZW50JiZ0eXBlb2Ygd2luZG93LnBhcmVudC5oelN0b3BDZWxlYnJhdGU9PT0nZnVuY3Rpb24nKXdpbmRvdy5wYXJlbnQuaHpTdG9wQ2VsZWJyYXRlKCk7fWNhdGNoKGUpe30KICAgIHN0YXRlLnN0YXRzPXt0b3RhbDowLGNvcnJlY3Q6MCxtYXhTdHJlYWs6MH07CiAgICB0cnl7aWYod2luZG93LnBhcmVudCYmdHlwZW9mIHdpbmRvdy5wYXJlbnQuaHpQcmVsb2FkQ2VsZWJyYXRpb249PT0nZnVuY3Rpb24nKXdpbmRvdy5wYXJlbnQuaHpQcmVsb2FkQ2VsZWJyYXRpb24oKTt9Y2F0Y2goZSl7fQogICAgaWYocmVzdGFydClyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc3RhcnRHYW1lKTsKICB9CiAgZnVuY3Rpb24gZXhpdEdhbWUoKXsKICAgIGh6Rmxvd0dhdGUrKzsKICAgIHRyeXtzdGF0ZS5hdWRpb0NhY2hlLmZvckVhY2goaXQ9Pnt0cnl7aXQuYXVkaW8mJml0LmF1ZGlvLnBhdXNlKCk7fWNhdGNoKGUpe319KTt9Y2F0Y2goZSl7fQogICAgcGhDbGVhcigpO2NnQ2xlYXIoKTsKICAgIHNldFNjcmVlbignaG9tZScpOwogICAgdXBkYXRlU2NvcmVzKCk7CiAgICBpZihzdGF0ZS5zdGF0cy50b3RhbD4wKWh6U2Vzc09wZW4oKTsKICB9CgogIGZ1bmN0aW9uIG5leHRDaGFsbGVuZ2UoKXsKICAgIGlmKHN0YXRlLnNjcmVlbiAhPT0gJ2dhbWUnKSByZXR1cm47CiAgICBzdGF0ZS5idXN5ID0gZmFsc2U7CiAgICBoaWRlQW5zd2VyKCk7CiAgICBjbGVhclRpbWVvdXQoc3RhdGUuZHJhd1ZhbGlkYXRlVGltZXIpOwogICAgZmlsbFF1ZXVlKCk7CiAgICBzdGF0ZS5jdXJyZW50ID0gc3RhdGUucXVldWUuc2hpZnQoKSB8fCBnZW5lcmF0ZUNoYWxsZW5nZSgpOwogICAgaWYoc3RhdGUuY3VycmVudC5waHJhc2UpcGhFbnN1cmUoc3RhdGUuY3VycmVudC5waHJhc2UpOwogICAgcHJlbG9hZENoYWxsZW5nZShzdGF0ZS5jdXJyZW50KTsKICAgIHJlZmlsbFNvb24oKTsKICAgIHJlbmRlckNoYWxsZW5nZShzdGF0ZS5jdXJyZW50KTsKICAgIHNldFRpbWVvdXQoKCkgPT4gcGxheUN1cnJlbnQoKSwgMTUwKTsKICB9CgoKICAvLyBGcmFzZXMgY3VydGFzIG5hdHVyYWlzLCBpbmRleGFkYXMgcGVsYXMgc8OtbGFiYXMgKGNvbSB0b20pIHByZXNlbnRlcy4KICBjb25zdCBQSFJBU0VTPVsKe3o6J+WmiOWmiOmqgumprCcsazpbJ21hMScsJ21hNCcsJ21hMyddfSx7ejon5L2g5aW95ZCX77yfJyxrOlsnbmkzJywnbWE1J119LHt6OifniLjniLjllp3ojLYnLGs6WydiYTQnLCdoZTEnLCdjaGEyJ119LAp7ejon5oiR54ix5L2gJyxrOlsnd28zJywnYWk0JywnbmkzJ119LHt6Oifku5bmnInkuIDmnKzkuaYnLGs6Wyd0YTEnLCd5b3UzJywnc2h1MSddfSx7ejon5L2g5Y675ZOq6YeM77yfJyxrOlsnbmkzJywnbmEzJywnbGkzJ119LAp7ejon5oiR5LiN55+l6YGTJyxrOlsnd28zJywnYnU0JywnemhpMSddfSx7ejon6LCi6LCi5L2gJyxrOlsneGllNCcsJ25pMyddfSx7ejon6K+36L+bJyxrOlsncWluZzMnLCdqaW40J119LAp7ejon5LuK5aSp5b6I54OtJyxrOlsnamluMScsJ3JlNCddfSx7ejon5LuW5Zyo5YyX5LqsJyxrOlsndGExJywnYmVpMycsJ2ppbmcxJ119LHt6OifmiJHlkIPnsbPppa0nLGs6Wyd3bzMnLCdjaGkxJywnbWkzJ119LAp7ejon54yr5Zyo5a626YeMJyxrOlsnamlhMScsJ2xpMyddfSx7ejon5bGx5LiK5pyJ5qCRJyxrOlsnc2hhbjEnLCdzaGFuZzQnLCd5b3UzJywnc2h1NCddfSx7ejon5rKz6YeM5pyJ6bG8JyxrOlsnaGUyJywnbGkzJywneW91MyddfSwKe3o6J+S4reWbveW+iOWkpycsazpbJ3pob25nMScsJ2d1bzInLCdkYTQnXX0se3o6J+aIkeS7rOS4iuivvicsazpbJ3dvMycsJ3NoYW5nNCcsJ2tlNCddfSx7ejon6Iqx5b6I6aaZJyxrOlsnaHVhMScsJ3hpYW5nMSddfSwKe3o6J+ivt+WWneiMticsazpbJ3FpbmczJywnaGUxJywnY2hhMiddfSx7ejon5oiR5aeT5bygJyxrOlsnd28zJywneGluZzQnLCd6aGFuZzEnXX0se3o6J+S9oOWHoOWyge+8nycsazpbJ25pMycsJ2ppMyddfSwKe3o6J+Wwj+eLl+WPq+S6hicsazpbJ3hpYW8zJywnamlhbzQnLCdsZTUnXX0se3o6J+S5neaciOingScsazpbJ2ppdTMnLCdqaWFuNCddfSx7ejon5YWI6LWw5LiA5q2lJyxrOlsneGlhbjEnLCd6b3UzJywnYnU0J119LAp7ejon5paw5bm05b+r5LmQJyxrOlsneGluMScsJ2t1YWk0JywnbGU0J119LHt6OifkuJzopb/lvojlpJonLGs6Wydkb25nMScsJ3hpMSddfSx7ejon57qi6Imy55qE6IqxJyxrOlsnaG9uZzInLCdzZTQnLCdodWExJ119LAp7ejon5bel5Lq65b6I5b+ZJyxrOlsnZ29uZzEnLCdyZW4yJ119LHt6OiflkIzlrabku6zlpb0nLGs6Wyd0b25nMiddfSx7ejon55m96ams5b6I5b+rJyxrOlsnYmFpMicsJ21hMycsJ2t1YWk0J119LAp7ejon5YyX6L655pyJ5bGxJyxrOlsnYmVpMycsJ3lvdTMnLCdzaGFuMSddfSx7ejon5piO5aSp6KeBJyxrOlsnbWluZzInLCdqaWFuNCddfSx7ejon5omL5py65Zyo5YyF6YeMJyxrOlsnc2hvdTMnLCdqaTEnLCdiYW8xJywnbGkzJ119LAp7ejon5ZGo5pyr5oSJ5b+rJyxrOlsnemhvdTEnLCdrdWFpNCddfSx7ejon5bCR5Zad6YWSJyxrOlsnc2hhbzMnLCdoZTEnLCdqaXUzJ119LHt6Oifplb/ln47lvojplb8nLGs6WydjaGFuZzInXX0sCnt6OifkuIrmtbflvojlpKcnLGs6WydzaGFuZzQnLCdkYTQnXX0se3o6J+awtOW+iOeDrScsazpbJ3JlNCddfSx7ejon5Lq65b6I5aSaJyxrOlsncmVuMiddfSwKe3o6J+aXpeWtkOW+iOWlvScsazpbJ3JpNCcsJ3ppNSddfSx7ejon5Zub5Y2B5ZubJyxrOlsnc2k0Jywnc2hpMiddfSx7ejon5a2X5b6I5bCPJyxrOlsnemk0JywneGlhbzMnXX0sCnt6OifkuK3ljYjlkIPppa0nLGs6Wyd6aG9uZzEnLCdjaGkxJ119LHt6OifpuK3lrZDmuLjmsLQnLGs6Wyd5YTEnLCd6aTUnLCd5b3UyJ119LHt6OiflpJzph4zlvojlronpnZknLGs6Wyd5ZTQnLCdsaTMnLCdhbjEnLCdqaW5nNCddfSwKe3o6J+ecvOedm+W+iOWkpycsazpbJ3lhbjMnLCdqaW5nMScsJ2RhNCddfSx7ejon6Z+z5LmQ5b6I576OJyxrOlsneWluMSddfSx7ejon5LuW546p5ri45oiPJyxrOlsndGExJywnd2FuMicsJ3lvdTInLCd4aTQnXX0sCnt6OifmiJHpl67pl67popgnLGs6Wyd3bzMnLCd3ZW40JywndGkyJ119LHt6OifniLHmg4XmlYXkuosnLGs6WydhaTQnLCdxaW5nMicsJ2d1NCcsJ3NoaTQnXX0se3o6J+WMheWtkOW+iOWkpycsazpbJ2JhbzEnLCd6aTUnLCdkYTQnXX0sCnt6OifmmJ/mmJ/lvojkuq4nLGs6Wyd4aW5nMSddfSx7ejon6KGX5LiK5Lq65aSaJyxrOlsnamllMScsJ3NoYW5nNCcsJ3JlbjInXX0se3o6J+Wwj+W/g+S4gOeCuScsazpbJ3hpYW8zJywneGluMSddfSwKe3o6J+WKoOayue+8gScsazpbJ2ppYTEnLCd5b3UyJ119LHt6OifkuIvpm6jkuoYnLGs6Wyd4aWE0JywnbGU1J119LHt6OifosKLosKLlpKflrrYnLGs6Wyd4aWU0JywnZGE0JywnamlhMSddfSwKe3o6J+mSseS4jeWkmicsazpbJ3FpYW4yJywnYnU0J119LHt6OifliY3pnaLmnInmuZYnLGs6WydxaWFuMicsJ3lvdTMnLCdodTInXX0se3o6J+WPpOiAgeeahOS5picsazpbJ2d1MycsJ3NodTEnXX0sCnt6Oifkuablupflvojov5EnLGs6WydzaHUxJywnamluNCddfSx7ejon5Y2B54K56KeBJyxrOlsnc2hpMicsJ2ppYW40J119LHt6OiflrZflhbjlnKjlk6rvvJ8nLGs6Wyd6aTQnLCduYTMnXX0sCnt6Oifngavovablvojlv6snLGs6WydodW8zJywnY2hlMScsJ2t1YWk0J119LHt6OifnlJ/ml6Xlv6vkuZAnLGs6WydyaTQnLCdrdWFpNCcsJ2xlNCddfSx7ejon5aSp5rCU5b6I54OtJyxrOlsncWk0JywncmU0J119LAp7ejon5rG96L2m5b6I5b+rJyxrOlsncWk0JywnY2hlMScsJ2t1YWk0J119LHt6Oifopb/nk5zlvojnlJwnLGs6Wyd4aTEnLCdndWExJ119LHt6Oiflk6Xlk6Xllp3lj6/kuZAnLGs6WydnZTEnLCdoZTEnLCdrZTMnLCdsZTQnXX0sCnt6Oiflp5Dlp5DlnKjlrrYnLGs6WydqaWUzJywnamlhMSddfSx7ejon5Ye65Y67546p5YS/JyxrOlsnY2h1MScsJ3dhbjInXX0se3o6J+WWneS4gOWPo+axpCcsazpbJ2hlMScsJ2tvdTMnXX0sCnt6Oifku5bor7TkuK3mlocnLGs6Wyd0YTEnLCdzaHVvMScsJ3pob25nMScsJ3dlbjInXX0se3o6J+ivt+eci+i/memHjCcsazpbJ3FpbmczJywna2FuNCcsJ3poZTQnLCdsaTMnXX0se3o6J+mjjuW+iOWkpycsazpbJ2RhNCddfSwKe3o6J+iMtuW+iOWlveWWnScsazpbJ2NoYTInLCdoZTEnXX0se3o6J+mxvOWcqOa5lumHjCcsazpbJ2h1MicsJ2xpMyddfSx7ejon6K+35YaN6K+05LiA5qyhJyxrOlsncWluZzMnLCdzaHVvMScsJ2NpNCddfQpdOwogIGNvbnN0IFBIX0JZX0tFWT17fTtQSFJBU0VTLmZvckVhY2gocD0+cC5rLmZvckVhY2goaz0+eyhQSF9CWV9LRVlba109UEhfQllfS0VZW2tdfHxbXSkucHVzaChwKTt9KSk7CiAgZnVuY3Rpb24gcGlja1BocmFzZShzeWxzKXsKICAgIGNvbnN0IGtleXM9c3lscy5tYXAoeD0+eC5rZXkpLGJhc2VzPXN5bHMubWFwKHg9PnguYmFzZSk7CiAgICBjb25zdCBib3RoPVBIUkFTRVMuZmlsdGVyKHA9PmtleXMuZXZlcnkoaz0+cC5rLmluY2x1ZGVzKGspKSk7CiAgICBpZihib3RoLmxlbmd0aCYmTWF0aC5yYW5kb20oKTwuOTIpcmV0dXJuIHBpY2soYm90aCk7CiAgICBjb25zdCBvbmU9Wy4uLm5ldyBTZXQoa2V5cy5mbGF0TWFwKGs9PlBIX0JZX0tFWVtrXXx8W10pKV07CiAgICBpZihvbmUubGVuZ3RoJiZNYXRoLnJhbmRvbSgpPC42KXJldHVybiBwaWNrKG9uZSk7CiAgICBjb25zdCBibT1QSFJBU0VTLmZpbHRlcihwPT5wLmsuc29tZShrPT5iYXNlcy5pbmNsdWRlcyhrLnJlcGxhY2UoL1swLTldJC8sJycpKSkpOwogICAgaWYoYm0ubGVuZ3RoJiZNYXRoLnJhbmRvbSgpPC4zNSlyZXR1cm4gcGljayhibSk7CiAgICByZXR1cm4gbnVsbDsKICB9CgogIC8vIEZyYXNlczogcHLDqS1nZXJhZGFzIGNvbSBhIHZveiBlbW9jaW9uYWwgZG8gYXBwLW3Do2U7IDUgcHJvbnRhcywgcmVwb3Npw6fDo28gY29udMOtbnVhLgogIGNvbnN0IFBIQ0FDSEU9bmV3IE1hcCgpO2NvbnN0IFBIX1JFQURZPTE7CiAgLy8gRnJhc2VzIGRlIGNvbWVtb3Jhw6fDo28gKHJlY29yZGUgYmF0aWRvIC8gc2VxdcOqbmNpYSBkZSBhY2VydG9zKSwgcHLDqS1nZXJhZGFzCiAgY29uc3QgQ0dfWkg9WyflpKrmo5LkuobvvIEnLCfkvaDotoXotorkuoboh6rlt7HvvIEnLCfnnJ/ljonlrrPvvIEnLCfnu6fnu63liqDmsrnvvIEnLCflroznvo7vvIEnLCfkuobkuI3otbfvvIEnLCfotormnaXotorlpb3kuobvvIEnLCfkvaDnnJ/mo5LvvIEnXTsKICBjb25zdCBDR0NBQ0hFPVtdO2xldCBjZ0xhc3Q9MDsKICBmdW5jdGlvbiBjZ1ByZWxvYWQoKXsKICAgIHdoaWxlKENHQ0FDSEUubGVuZ3RoPDEpewogICAgICBjb25zdCB6aD1waWNrKENHX1pIKTsKICAgICAgaWYoQ0dDQUNIRS5zb21lKGM9PmMuemg9PT16aCkpe2lmKENHX1pILmxlbmd0aDwzKWJyZWFrO2NvbnRpbnVlO30KICAgICAgY29uc3QgcmVjPXt6aCx1cmw6bnVsbCxhdWRpbzpudWxsfTtDR0NBQ0hFLnB1c2gocmVjKTsKICAgICAgKGFzeW5jKCk9Pnt0cnl7CiAgICAgICAgaWYod2luZG93LnBhcmVudCYmd2luZG93LnBhcmVudCE9PXdpbmRvdyYmdHlwZW9mIHdpbmRvdy5wYXJlbnQuaHpQaHJhc2VHZW49PT0nZnVuY3Rpb24nKXsKICAgICAgICAgIGNvbnN0IHVybD1hd2FpdCB3aW5kb3cucGFyZW50Lmh6UGhyYXNlR2VuKHpoKTsKICAgICAgICAgIGlmKHVybCl7cmVjLnVybD11cmw7Y29uc3QgYT1uZXcgQXVkaW8odXJsKTthLnByZWxvYWQ9J2F1dG8nO3RyeXthLmxvYWQoKTt9Y2F0Y2goZSl7fXJlYy5hdWRpbz1hO30KICAgICAgICB9CiAgICAgIH1jYXRjaChlKXt9fSkoKTsKICAgIH0KICB9CiAgZnVuY3Rpb24gY2dTcGVhaygpewogICAgY29uc3Qgbm93PURhdGUubm93KCk7aWYobm93LWNnTGFzdDwxNTAwMClyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IC8vIG7Do28gcmVwZXRlIGVtIHJhamFkYQogICAgY2dMYXN0PW5vdzsKICAgIGNvbnN0IHJlYz1DR0NBQ0hFLnNoaWZ0KCk7CiAgICBsZXQgd2FpdD1Qcm9taXNlLnJlc29sdmUoKTsKICAgIGlmKHJlYyYmcmVjLmF1ZGlvKXt0cnl7cmVjLmF1ZGlvLmN1cnJlbnRUaW1lPTA7cmVjLmF1ZGlvLnBsYXkoKS5jYXRjaCgoKT0+c3BlYWtQaHJhc2UocmVjLnpoKSk7d2FpdD1oekF3YWl0QXVkaW8ocmVjLmF1ZGlvLDYwMDApO31jYXRjaChlKXtzcGVha1BocmFzZShyZWMuemgpO3dhaXQ9bmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLDIyMDApKTt9fQogICAgZWxzZSBpZihyZWMpe3NwZWFrUGhyYXNlKHJlYy56aCk7d2FpdD1uZXcgUHJvbWlzZShyPT5zZXRUaW1lb3V0KHIsMjIwMCkpO30KICAgIGlmKHJlYyYmcmVjLnVybClzZXRUaW1lb3V0KCgpPT57dHJ5e1VSTC5yZXZva2VPYmplY3RVUkwocmVjLnVybCk7fWNhdGNoKGUpe319LDEyMDAwKTsKICAgIGNnUHJlbG9hZCgpOwogICAgcmV0dXJuIHdhaXQ7CiAgfQogIGZ1bmN0aW9uIGNnQ2xlYXIoKXtDR0NBQ0hFLmZvckVhY2gocj0+e3RyeXtpZihyLmF1ZGlvKXIuYXVkaW8ucGF1c2UoKTtpZihyLnVybClVUkwucmV2b2tlT2JqZWN0VVJMKHIudXJsKTt9Y2F0Y2goZSl7fX0pO0NHQ0FDSEUubGVuZ3RoPTA7fQogIGZ1bmN0aW9uIHBoRW5zdXJlKHBoKXsKICAgIGlmKCFwaHx8UEhDQUNIRS5oYXMocGgueil8fFBIQ0FDSEUuc2l6ZT49UEhfUkVBRFkrMilyZXR1cm47CiAgICBjb25zdCByZWM9e3VybDpudWxsLGF1ZGlvOm51bGwscGVuZGluZzp0cnVlfTtQSENBQ0hFLnNldChwaC56LHJlYyk7CiAgICAoYXN5bmMoKT0+ewogICAgICB0cnl7CiAgICAgICAgaWYod2luZG93LnBhcmVudCYmd2luZG93LnBhcmVudCE9PXdpbmRvdyYmdHlwZW9mIHdpbmRvdy5wYXJlbnQuaHpQaHJhc2VHZW49PT0nZnVuY3Rpb24nKXsKICAgICAgICAgIGNvbnN0IHVybD1hd2FpdCB3aW5kb3cucGFyZW50Lmh6UGhyYXNlR2VuKHBoLnopOwogICAgICAgICAgaWYodXJsKXtyZWMudXJsPXVybDtjb25zdCBhPW5ldyBBdWRpbyh1cmwpO2EucHJlbG9hZD0nYXV0byc7dHJ5e2EubG9hZCgpO31jYXRjaChlKXt9cmVjLmF1ZGlvPWE7fQogICAgICAgIH0KICAgICAgfWNhdGNoKGUpe30KICAgICAgcmVjLnBlbmRpbmc9ZmFsc2U7CiAgICB9KSgpOwogIH0KICBmdW5jdGlvbiBoekF3YWl0QXVkaW8oYSxtYXhNcyl7CiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzPT57CiAgICAgIGxldCBkb25lPWZhbHNlO2NvbnN0IGZpbj0oKT0+e2lmKCFkb25lKXtkb25lPXRydWU7cmVzKCk7fX07CiAgICAgIHRyeXthLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJyxmaW4se29uY2U6dHJ1ZX0pO2EuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLGZpbix7b25jZTp0cnVlfSk7fWNhdGNoKGUpe30KICAgICAgY29uc3QgZHVyPShhJiZpc0Zpbml0ZShhLmR1cmF0aW9uKSYmYS5kdXJhdGlvbj4wKT9hLmR1cmF0aW9uKjEwMDArNDAwOm1heE1zOwogICAgICBzZXRUaW1lb3V0KGZpbixNYXRoLm1pbihtYXhNcyxkdXJ8fG1heE1zKSk7CiAgICB9KTsKICB9CiAgZnVuY3Rpb24gcGhQbGF5KHBoKXsKICAgIGxldCB3YWl0PVByb21pc2UucmVzb2x2ZSgpOwogICAgY29uc3QgcmVjPVBIQ0FDSEUuZ2V0KHBoLnopOwogICAgaWYocmVjJiZyZWMuYXVkaW8pewogICAgICB0cnl7cmVjLmF1ZGlvLmN1cnJlbnRUaW1lPTA7cmVjLmF1ZGlvLnBsYXkoKS5jYXRjaCgoKT0+c3BlYWtQaHJhc2UocGgueikpO3dhaXQ9aHpBd2FpdEF1ZGlvKHJlYy5hdWRpbyw3MDAwKTt9CiAgICAgIGNhdGNoKGUpe3NwZWFrUGhyYXNlKHBoLnopO3dhaXQ9bmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLDI2MDApKTt9CiAgICB9ZWxzZXtzcGVha1BocmFzZShwaC56KTt3YWl0PW5ldyBQcm9taXNlKHI9PnNldFRpbWVvdXQociwyNjAwKSk7fQogICAgLy8gY29uc29tZSBlIHJlcMO1ZTogZ2VyYSBhIGZyYXNlIGRvIHByw7N4aW1vIGRlc2FmaW8gZGUgcGFyIGRhIGZpbGEKICAgIHNldFRpbWVvdXQoKCk9PnsKICAgICAgdHJ5ewogICAgICAgIGNvbnN0IHJlYzI9UEhDQUNIRS5nZXQocGgueik7CiAgICAgICAgaWYocmVjMil7UEhDQUNIRS5kZWxldGUocGgueik7aWYocmVjMi51cmwpc2V0VGltZW91dCgoKT0+e3RyeXtVUkwucmV2b2tlT2JqZWN0VVJMKHJlYzIudXJsKTt9Y2F0Y2goZSl7fX0sMTUwMDApO30KICAgICAgICBmb3IoY29uc3QgY2ggb2Ygc3RhdGUucXVldWUpe2lmKGNoJiZjaC5waHJhc2UmJiFQSENBQ0hFLmhhcyhjaC5waHJhc2Uueikpe3BoRW5zdXJlKGNoLnBocmFzZSk7YnJlYWs7fX0KICAgICAgfWNhdGNoKGUpe30KICAgIH0sNDAwKTsKICAgIHJldHVybiB3YWl0OwogIH0KICBmdW5jdGlvbiBwaENsZWFyKCl7CiAgICBQSENBQ0hFLmZvckVhY2gocmVjPT57dHJ5e2lmKHJlYy5hdWRpbylyZWMuYXVkaW8ucGF1c2UoKTtpZihyZWMudXJsKVVSTC5yZXZva2VPYmplY3RVUkwocmVjLnVybCk7fWNhdGNoKGUpe319KTsKICAgIFBIQ0FDSEUuY2xlYXIoKTsKICB9CiAgZnVuY3Rpb24gc3BlYWtQaHJhc2UoemgpewogICAgdHJ5e2lmKHdpbmRvdy5wYXJlbnQmJndpbmRvdy5wYXJlbnQhPT13aW5kb3cmJnR5cGVvZiB3aW5kb3cucGFyZW50Lmh6U3BlYWtQaHJhc2U9PT0nZnVuY3Rpb24nKXt3aW5kb3cucGFyZW50Lmh6U3BlYWtQaHJhc2UoemgpO3JldHVybjt9fWNhdGNoe30KICAgIHRyeXtjb25zdCB1PW5ldyBTcGVlY2hTeW50aGVzaXNVdHRlcmFuY2UoemgpO3UubGFuZz0nemgtQ04nO3UucmF0ZT0uOTtzcGVlY2hTeW50aGVzaXMuY2FuY2VsKCk7c3BlZWNoU3ludGhlc2lzLnNwZWFrKHUpO31jYXRjaHt9CiAgfQogIGZ1bmN0aW9uIGZpbmlzaChvayl7CiAgICBpZihzdGF0ZS5idXN5KSByZXR1cm47CiAgICBzdGF0ZS5idXN5ID0gdHJ1ZTsKICAgIGlmKG9rKXsgc3RhdGUuc2NvcmUrKzsgc2F2ZUJlc3QoKTsgfQogICAgZWxzZSB7IHN0YXRlLnNjb3JlID0gMDsgdXBkYXRlU2NvcmVzKCk7IH0KICAgIC8vIGVzdGF0w61zdGljYXMgZGEgc2Vzc8OjbwogICAgY29uc3QgcHJldkJlc3Q9c3RhdGUuYmVzdDsKICAgIHN0YXRlLnN0YXRzLnRvdGFsKys7aWYob2spe3N0YXRlLnN0YXRzLmNvcnJlY3QrKztzdGF0ZS5zdGF0cy5tYXhTdHJlYWs9TWF0aC5tYXgoc3RhdGUuc3RhdHMubWF4U3RyZWFrLHN0YXRlLnNjb3JlKTt9CiAgICBjb25zdCBjb25ncmF0PW9rJiYoKHByZXZCZXN0PjImJnN0YXRlLnNjb3JlPT09cHJldkJlc3QrMSl8fChzdGF0ZS5zY29yZT4wJiZzdGF0ZS5zY29yZSU4PT09MCkpOyAvLyByZWNvcmRlIGJhdGlkbyBvdSBzZXF1w6puY2lhCiAgICAvLyBQYXIgY29ycmV0bzogZnJhc2UgcHLDqS1kZWNpZGlkYSBlIHByw6ktZ2VyYWRhIHRvY2EgbmEgaG9yYS4KICAgIGNvbnN0IHBoPShvayYmc3RhdGUuY3VycmVudC51bml0PT09J2RvdWJsZScpP3N0YXRlLmN1cnJlbnQucGhyYXNlOm51bGw7CiAgICBzaG93QW5zd2VyKG9rLCBzdGF0ZS5jdXJyZW50LmFuc3dlclRleHQpOwogICAgLy8gRmlsYSBhc3PDrW5jcm9uYTogbmFkYSBkZSBzb2JyZXBvc2nDp8OjbyDigJQgbyBwcsOzeGltbyBkZXNhZmlvIHPDsyBjYXJyZWdhCiAgICAvLyBkZXBvaXMgcXVlIGEgZnJhc2UgZGUgcHJvbsO6bmNpYSAoZSBhIGNvbWVtb3Jhw6fDo28sIHNlIGhvdXZlcikgVEVSTUlOQVIuCiAgICAoYXN5bmMoKT0+ewogICAgICBjb25zdCBnYXRlPSsraHpGbG93R2F0ZTsKICAgICAgdHJ5ewogICAgICAgIGlmKHBoKXsKICAgICAgICAgIGNvbnN0IHN0cmlwPWVscy5hbnN3ZXJTdHJpcDsKICAgICAgICAgIHN0cmlwLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywnPHNwYW4gaWQ9Imh6LXBocmFzZSI+JytwaC56Kyc8L3NwYW4+Jyk7CiAgICAgICAgICBjbGVhclRpbWVvdXQoc3RyaXAuX3RpbWVyKTsKICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHI9PnNldFRpbWVvdXQociwzMDApKTsKICAgICAgICAgIGNvbnN0IHdhaXQ9cGhQbGF5KHBoKTsKICAgICAgICAgIGNsZWFyVGltZW91dChzdHJpcC5fdGltZXIpOyAvLyBwZXJtYW5lY2UgbmEgdGVsYSBkdXJhbnRlIFRPREEgYSBmcmFzZQogICAgICAgICAgYXdhaXQgd2FpdDsgICAgICAgICAgICAgICAgICAvLyBmcmFzZSB0ZXJtaW5vdSBkZSBzZXIgZGl0YQogICAgICAgICAgc3RyaXAuX3RpbWVyPXNldFRpbWVvdXQoKCk9PnN0cmlwLmNsYXNzTGlzdC5yZW1vdmUoJ3Nob3cnKSwzODApOwogICAgICAgIH1lbHNlewogICAgICAgICAgYXdhaXQgbmV3IFByb21pc2Uocj0+c2V0VGltZW91dChyLDEzNTApKTsKICAgICAgICB9CiAgICAgICAgaWYoY29uZ3JhdCl7IGF3YWl0IGNnU3BlYWsoKTsgfQogICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHI9PnNldFRpbWVvdXQociwyNzApKTsKICAgICAgfWNhdGNoKGUpe30KICAgICAgaWYoZ2F0ZSE9PWh6Rmxvd0dhdGUpcmV0dXJuOyAvLyB1c3XDoXJpbyBzYWl1L3JlaW5pY2lvdSBubyBtZWlvCiAgICAgIG5leHRDaGFsbGVuZ2UoKTsKICAgIH0pKCk7CiAgfQoKICBmdW5jdGlvbiByZW5kZXJDaGFsbGVuZ2UoY2gpewogICAgc3RhdGUuZHJhd1BhZHMgPSBbXTsKICAgIGlmKGNoLnRhc2sgPT09ICdjaG9pY2UnKSByZW5kZXJDaG9pY2UoY2gpOwogICAgZWxzZSByZW5kZXJEcmF3KGNoKTsKICB9CgogIGZ1bmN0aW9uIHJlbmRlckNob2ljZShjaCl7CiAgICBjb25zdCBpc1NpbmdsZSA9IGNoLnVuaXQgPT09ICdzaW5nbGUnOwogICAgY29uc3QgbGFiZWwgPSBpc1NpbmdsZSA/ICd1bWEgc8OtbGFiYScgOiAnZHVhcyBzw61sYWJhcyc7CiAgICBlbHMuY2hhbGxlbmdlLmlubmVySFRNTCA9IGAKICAgICAgPGRpdiBjbGFzcz0idGFzay1oZWFkIj4KICAgICAgICA8ZGl2IGNsYXNzPSJraWNrZXIiPiR7bGFiZWx9PC9kaXY+CiAgICAgICAgPGgyPmVzY29saGE8L2gyPgogICAgICA8L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0iY2hvaWNlLXdyYXAiPgogICAgICAgIDxkaXYgY2xhc3M9ImNob2ljZS1ncmlkICR7aXNTaW5nbGUgPyAnc2luZ2xlJyA6ICdkb3VibGUnfSBjb3VudC0ke2NoLm9wdGlvbnMubGVuZ3RofSIgaWQ9ImNob2ljZUdyaWQiPjwvZGl2PgogICAgICA8L2Rpdj5gOwogICAgZWxzLmNoYWxsZW5nZS5hcHBlbmRDaGlsZChlbHMuYW5zd2VyU3RyaXApOwogICAgY29uc3QgZ3JpZCA9ICQoJyNjaG9pY2VHcmlkJyk7CiAgICBjb25zdCBzZWxlY3RlZCA9IG5ldyBTZXQoKTsKICAgIGNvbnN0IHNlbGVjdGVkT3JkZXIgPSBbXTsKICAgIGxldCBjb25maXJtVGltZXIgPSBudWxsOwogICAgY29uc3QgYW5zd2VyS2V5cyA9IG5ldyBTZXQoY2guc3lsbGFibGVzLm1hcChzID0+IHMua2V5KSk7CiAgICBjb25zdCBuZWVkZWQgPSBhbnN3ZXJLZXlzLnNpemU7CgogICAgZnVuY3Rpb24gY2xlYXJDb25maXJtKCl7CiAgICAgIGlmKGNvbmZpcm1UaW1lcil7IGNsZWFyVGltZW91dChjb25maXJtVGltZXIpOyBjb25maXJtVGltZXIgPSBudWxsOyB9CiAgICB9CiAgICBmdW5jdGlvbiByZW1vdmVLZXkoa2V5KXsKICAgICAgc2VsZWN0ZWQuZGVsZXRlKGtleSk7CiAgICAgIGNvbnN0IGlkeCA9IHNlbGVjdGVkT3JkZXIuaW5kZXhPZihrZXkpOwogICAgICBpZihpZHggPj0gMCkgc2VsZWN0ZWRPcmRlci5zcGxpY2UoaWR4LCAxKTsKICAgICAgY29uc3QgY2FyZCA9ICQoYC5jaG9pY2UtY2FyZFtkYXRhLWtleT0iJHtrZXl9Il1gLCBncmlkKTsKICAgICAgaWYoY2FyZCkgY2FyZC5jbGFzc0xpc3QucmVtb3ZlKCdzZWxlY3RlZCcpOwogICAgfQogICAgZnVuY3Rpb24gYWRkS2V5KGtleSwgY2FyZCl7CiAgICAgIHNlbGVjdGVkLmFkZChrZXkpOwogICAgICBzZWxlY3RlZE9yZGVyLnB1c2goa2V5KTsKICAgICAgY2FyZC5jbGFzc0xpc3QuYWRkKCdzZWxlY3RlZCcpOwogICAgfQogICAgZnVuY3Rpb24gc2NoZWR1bGVWYWxpZGF0aW9uKCl7CiAgICAgIGNsZWFyQ29uZmlybSgpOwogICAgICBpZihzZWxlY3RlZC5zaXplICE9PSBuZWVkZWQpIHJldHVybjsKICAgICAgY29uZmlybVRpbWVyID0gc2V0VGltZW91dCh2YWxpZGF0ZUNob2ljZSwgaXNTaW5nbGUgPyA2ODAgOiA4NjApOwogICAgfQogICAgZnVuY3Rpb24gdmFsaWRhdGVDaG9pY2UoKXsKICAgICAgaWYoc3RhdGUuYnVzeSkgcmV0dXJuOwogICAgICBjb25zdCBvayA9IFsuLi5hbnN3ZXJLZXlzXS5ldmVyeShrID0+IHNlbGVjdGVkLmhhcyhrKSkgJiYgWy4uLnNlbGVjdGVkXS5ldmVyeShrID0+IGFuc3dlcktleXMuaGFzKGspKTsKICAgICAgJCQoJy5jaG9pY2UtY2FyZCcsIGdyaWQpLmZvckVhY2goY2FyZCA9PiB7CiAgICAgICAgaWYoYW5zd2VyS2V5cy5oYXMoY2FyZC5kYXRhc2V0LmtleSkpIGNhcmQuY2xhc3NMaXN0LmFkZCgnZ29vZCcpOwogICAgICAgIGVsc2UgaWYoc2VsZWN0ZWQuaGFzKGNhcmQuZGF0YXNldC5rZXkpKSBjYXJkLmNsYXNzTGlzdC5hZGQoJ2JhZCcpOwogICAgICB9KTsKICAgICAgc2V0VGltZW91dCgoKSA9PiBmaW5pc2gob2spLCAzNjApOwogICAgfQoKICAgIGNoLm9wdGlvbnMuZm9yRWFjaChvcHQgPT4gewogICAgICBjb25zdCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTsKICAgICAgYnRuLmNsYXNzTmFtZSA9ICdjaG9pY2UtY2FyZCc7CiAgICAgIGJ0bi5kYXRhc2V0LmtleSA9IG9wdC5rZXk7CiAgICAgIGJ0bi5pbm5lckhUTUwgPSBgPGRpdiBjbGFzcz0icGluIj4ke29wdC5tYXJrfTwvZGl2PmA7CiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsKICAgICAgICBpZihzdGF0ZS5idXN5KSByZXR1cm47CiAgICAgICAgY2xlYXJDb25maXJtKCk7CiAgICAgICAgaWYoaXNTaW5nbGUpewogICAgICAgICAgc2VsZWN0ZWQuY2xlYXIoKTsgc2VsZWN0ZWRPcmRlci5zcGxpY2UoMCk7CiAgICAgICAgICAkJCgnLmNob2ljZS1jYXJkJywgZ3JpZCkuZm9yRWFjaChjYXJkID0+IGNhcmQuY2xhc3NMaXN0LnJlbW92ZSgnc2VsZWN0ZWQnKSk7CiAgICAgICAgICBhZGRLZXkob3B0LmtleSwgYnRuKTsKICAgICAgICAgIHNjaGVkdWxlVmFsaWRhdGlvbigpOwogICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICBpZihzZWxlY3RlZC5oYXMob3B0LmtleSkpewogICAgICAgICAgcmVtb3ZlS2V5KG9wdC5rZXkpOwogICAgICAgICAgcmV0dXJuOwogICAgICAgIH0KICAgICAgICBpZihzZWxlY3RlZC5zaXplID49IG5lZWRlZCAmJiBzZWxlY3RlZE9yZGVyLmxlbmd0aCl7CiAgICAgICAgICByZW1vdmVLZXkoc2VsZWN0ZWRPcmRlclswXSk7CiAgICAgICAgfQogICAgICAgIGFkZEtleShvcHQua2V5LCBidG4pOwogICAgICAgIHNjaGVkdWxlVmFsaWRhdGlvbigpOwogICAgICB9KTsKICAgICAgZ3JpZC5hcHBlbmRDaGlsZChidG4pOwogICAgfSk7CiAgfQoKICBmdW5jdGlvbiByZW5kZXJEcmF3KGNoKXsKICAgIGNsZWFyVGltZW91dChzdGF0ZS5kcmF3VmFsaWRhdGVUaW1lcik7CiAgICBjb25zdCBpc1NpbmdsZSA9IGNoLnVuaXQgPT09ICdzaW5nbGUnOwogICAgY29uc3QgbGFiZWwgPSBpc1NpbmdsZSA/ICd1bWEgc8OtbGFiYScgOiAnZHVhcyBzw61sYWJhcyc7CiAgICBzdGF0ZS5kcmF3QWN0aXZlSW5kZXggPSAwOwogICAgZWxzLmNoYWxsZW5nZS5pbm5lckhUTUwgPSBgCiAgICAgIDxkaXYgY2xhc3M9InRhc2staGVhZCI+CiAgICAgICAgPGRpdiBjbGFzcz0ia2lja2VyIj4ke2xhYmVsfTwvZGl2PgogICAgICAgIDxoMj5kZXNlbmhlIG8gdG9tPC9oMj4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9ImRyYXctd3JhcCI+CiAgICAgICAgPGRpdiBjbGFzcz0iZHJhdy1ncmlkICR7aXNTaW5nbGUgPyAnc2luZ2xlJyA6ICdkb3VibGUnfSIgaWQ9ImRyYXdHcmlkIj48L2Rpdj4KICAgICAgPC9kaXY+YDsKICAgIGNvbnN0IGdyaWQgPSAkKCcjZHJhd0dyaWQnKTsKICAgIGNoLnN5bGxhYmxlcy5mb3JFYWNoKChzeWwsIGkpID0+IHsKICAgICAgY29uc3QgYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7CiAgICAgIGJveC5jbGFzc05hbWUgPSAndG9uZS1ib3gnOwogICAgICBpZihpID4gMCkgYm94LmNsYXNzTGlzdC5hZGQoJ3dhaXRpbmcnKTsKICAgICAgYm94LmlubmVySFRNTCA9IGAKICAgICAgICA8ZGl2IGNsYXNzPSJjYW52YXMtZnJhbWUiPjxjYW52YXM+PC9jYW52YXM+PGkgY2xhc3M9ImRvdC1jZW50ZXIiPjwvaT48L2Rpdj4KICAgICAgICA8YnV0dG9uIGNsYXNzPSJjbGVhci10b25lIj5saW1wYXI8L2J1dHRvbj5gOwogICAgICBncmlkLmFwcGVuZENoaWxkKGJveCk7CiAgICAgIGNvbnN0IGNhbnZhcyA9ICQoJ2NhbnZhcycsIGJveCk7CiAgICAgIGNvbnN0IHBhZCA9IG1ha2VQYWQoY2FudmFzLCBzeWwudG9uZSwgaSwgKCkgPT4gaGFuZGxlUGFkQWRqdXN0ZWQoaSkpOwogICAgICAkKCcuY2xlYXItdG9uZScsIGJveCkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7CiAgICAgICAgY2xlYXJUaW1lb3V0KHN0YXRlLmRyYXdWYWxpZGF0ZVRpbWVyKTsKICAgICAgICBmb3IobGV0IGo9aTtqPHN0YXRlLmRyYXdQYWRzLmxlbmd0aDtqKyspIHN0YXRlLmRyYXdQYWRzW2pdLmNsZWFyKGZhbHNlKTsKICAgICAgICBzdGF0ZS5kcmF3QWN0aXZlSW5kZXggPSBpOwogICAgICAgIHVwZGF0ZVBhZEZvY3VzKCk7CiAgICAgIH0pOwogICAgICBzdGF0ZS5kcmF3UGFkcy5wdXNoKHBhZCk7CiAgICB9KTsKICAgIGVscy5jaGFsbGVuZ2UuYXBwZW5kQ2hpbGQoZWxzLmFuc3dlclN0cmlwKTsKICAgIHVwZGF0ZVBhZEZvY3VzKCk7CiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gc3RhdGUuZHJhd1BhZHMuZm9yRWFjaChwID0+IHAucmVzaXplKCkpKTsKICB9CgogIGZ1bmN0aW9uIHVwZGF0ZVBhZEZvY3VzKCl7CiAgICBzdGF0ZS5kcmF3UGFkcy5mb3JFYWNoKChwLCBpKSA9PiB7CiAgICAgIHAuYm94LmNsYXNzTGlzdC50b2dnbGUoJ3dhaXRpbmcnLCBpID4gc3RhdGUuZHJhd0FjdGl2ZUluZGV4KTsKICAgIH0pOwogIH0KCiAgZnVuY3Rpb24gaGFuZGxlUGFkQWRqdXN0ZWQoaW5kZXgpewogICAgaWYoc3RhdGUuYnVzeSB8fCAhc3RhdGUuZHJhd1BhZHMubGVuZ3RoKSByZXR1cm47CiAgICBjbGVhclRpbWVvdXQoc3RhdGUuZHJhd1ZhbGlkYXRlVGltZXIpOwogICAgY29uc3QgcGFkcyA9IHN0YXRlLmRyYXdQYWRzOwogICAgaWYoaW5kZXggPCBwYWRzLmxlbmd0aCAtIDEpewogICAgICBzdGF0ZS5kcmF3QWN0aXZlSW5kZXggPSBpbmRleCArIDE7CiAgICAgIHVwZGF0ZVBhZEZvY3VzKCk7CiAgICAgIHJldHVybjsKICAgIH0KICAgIGlmKHBhZHMuZXZlcnkocCA9PiBwLmFkanVzdGVkICYmIHAuZGV0ZWN0ZWQgIT09IG51bGwgJiYgIXAuZHJhd2luZykpewogICAgICBzdGF0ZS5kcmF3VmFsaWRhdGVUaW1lciA9IHNldFRpbWVvdXQodmFsaWRhdGVEcmF3LCA3MjApOwogICAgfQogIH0KCiAgZnVuY3Rpb24gdmFsaWRhdGVEcmF3KCl7CiAgICBpZihzdGF0ZS5idXN5IHx8ICFzdGF0ZS5kcmF3UGFkcy5sZW5ndGgpIHJldHVybjsKICAgIGNvbnN0IG9rID0gc3RhdGUuZHJhd1BhZHMuZXZlcnkocCA9PiBwLmRldGVjdGVkID09PSBwLmV4cGVjdGVkKTsKICAgIHN0YXRlLmRyYXdQYWRzLmZvckVhY2gocCA9PiBwLnNob3dSZXN1bHQocC5kZXRlY3RlZCA9PT0gcC5leHBlY3RlZCkpOwogICAgc2V0VGltZW91dCgoKSA9PiBmaW5pc2gob2spLCA1NjApOwogIH0KCiAgZnVuY3Rpb24gbWFrZVBhZChjYW52YXMsIGV4cGVjdGVkLCBpbmRleCwgb25Eb25lKXsKICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpOwogICAgY29uc3QgYm94ID0gY2FudmFzLmNsb3Nlc3QoJy50b25lLWJveCcpOwogICAgY29uc3QgcGFkID0gewogICAgICBjYW52YXMsIGN0eCwgYm94LCBleHBlY3RlZCwKICAgICAgZGV0ZWN0ZWQ6bnVsbCwgcG9pbnRzOltdLCBkcmF3aW5nOmZhbHNlLCBhZGp1c3RlZDpmYWxzZSwgcmVzdWx0Om51bGwsIGFkanVzdFRva2VuOjAsCiAgICAgIHJlc2l6ZSgpewogICAgICAgIGNvbnN0IHIgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7CiAgICAgICAgY29uc3QgZHByID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oMywgd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSkpOwogICAgICAgIGNhbnZhcy53aWR0aCA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3Ioci53aWR0aCAqIGRwcikpOwogICAgICAgIGNhbnZhcy5oZWlnaHQgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKHIuaGVpZ2h0ICogZHByKSk7CiAgICAgICAgY3R4LnNldFRyYW5zZm9ybShkcHIsMCwwLGRwciwwLDApOwogICAgICAgIHRoaXMucmVkcmF3KCk7CiAgICAgIH0sCiAgICAgIGNsZWFyKHJlc2V0QWN0aXZlPXRydWUpewogICAgICAgIHRoaXMucG9pbnRzPVtdOyB0aGlzLmRldGVjdGVkPW51bGw7IHRoaXMuYWRqdXN0ZWQ9ZmFsc2U7IHRoaXMucmVzdWx0PW51bGw7IHRoaXMuYWRqdXN0VG9rZW4rKzsKICAgICAgICBib3guY2xhc3NMaXN0LnJlbW92ZSgnZ29vZCcsJ2JhZCcpOwogICAgICAgIGNsZWFyVGltZW91dChzdGF0ZS5kcmF3VmFsaWRhdGVUaW1lcik7CiAgICAgICAgaWYocmVzZXRBY3RpdmUpIHN0YXRlLmRyYXdBY3RpdmVJbmRleCA9IE1hdGgubWluKHN0YXRlLmRyYXdBY3RpdmVJbmRleCA/PyAwLCBpbmRleCk7CiAgICAgICAgdGhpcy5yZWRyYXcoKTsKICAgICAgfSwKICAgICAgcmVkcmF3KCl7CiAgICAgICAgY29uc3QgciA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgICAgICBjdHguY2xlYXJSZWN0KDAsMCxyLndpZHRoLHIuaGVpZ2h0KTsKICAgICAgICBpZih0aGlzLnJlc3VsdCAhPT0gbnVsbCl7CiAgICAgICAgICBjdHguc2F2ZSgpOwogICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMucmVzdWx0ID8gJ3JnYmEoMTY4LDI0NCwxOTgsLjEwKScgOiAncmdiYSgyNTUsMTU1LDE2NywuMTEpJzsKICAgICAgICAgIGN0eC5maWxsUmVjdCgwLDAsci53aWR0aCxyLmhlaWdodCk7CiAgICAgICAgICBjdHgucmVzdG9yZSgpOwogICAgICAgIH0KICAgICAgICBpZih0aGlzLmRldGVjdGVkICE9PSBudWxsICYmIHRoaXMuYWRqdXN0ZWQpewogICAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLnJlc3VsdCA9PT0gbnVsbCA/ICcjZThlZGY3JyA6ICh0aGlzLnJlc3VsdCA/ICcjOWRmMmM2JyA6ICcjZmY5YWE2Jyk7CiAgICAgICAgICBkcmF3Q2Fub25pY2FsKGN0eCwgdGhpcy5kZXRlY3RlZCwgci53aWR0aCwgci5oZWlnaHQsIGNvbG9yKTsKICAgICAgICB9IGVsc2UgaWYodGhpcy5wb2ludHMubGVuZ3RoID4gMSkgewogICAgICAgICAgZHJhd1BvbHlsaW5lKGN0eCwgdGhpcy5wb2ludHMsICcjZThlZGY3JywgNyk7CiAgICAgICAgfQogICAgICB9LAogICAgICBzaG93QWRqdXN0ZWQoKXsKICAgICAgICB0aGlzLmFkanVzdGVkID0gdHJ1ZTsKICAgICAgICB0aGlzLnJlc3VsdCA9IG51bGw7CiAgICAgICAgYm94LmNsYXNzTGlzdC5yZW1vdmUoJ2dvb2QnLCdiYWQnKTsKICAgICAgICB0aGlzLnJlZHJhdygpOwogICAgICB9LAogICAgICBzaG93UmVzdWx0KG9rKXsKICAgICAgICB0aGlzLnJlc3VsdCA9IG9rOwogICAgICAgIGJveC5jbGFzc0xpc3QudG9nZ2xlKCdnb29kJywgb2spOwogICAgICAgIGJveC5jbGFzc0xpc3QudG9nZ2xlKCdiYWQnLCAhb2spOwogICAgICAgIHRoaXMucmVkcmF3KCk7CiAgICAgIH0KICAgIH07CgogICAgZnVuY3Rpb24gcG9zKGV2KXsKICAgICAgY29uc3QgciA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTsKICAgICAgcmV0dXJuIHt4OmV2LmNsaWVudFggLSByLmxlZnQsIHk6ZXYuY2xpZW50WSAtIHIudG9wfTsKICAgIH0KICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIGV2ID0+IHsKICAgICAgaWYoc3RhdGUuYnVzeSB8fCBpbmRleCAhPT0gc3RhdGUuZHJhd0FjdGl2ZUluZGV4KSByZXR1cm47CiAgICAgIGNsZWFyVGltZW91dChzdGF0ZS5kcmF3VmFsaWRhdGVUaW1lcik7CiAgICAgIGNhbnZhcy5zZXRQb2ludGVyQ2FwdHVyZShldi5wb2ludGVySWQpOwogICAgICBwYWQuYWRqdXN0VG9rZW4rKzsKICAgICAgcGFkLnBvaW50cyA9IFtwb3MoZXYpXTsgcGFkLmRldGVjdGVkID0gbnVsbDsgcGFkLmFkanVzdGVkID0gZmFsc2U7IHBhZC5yZXN1bHQgPSBudWxsOyBwYWQuZHJhd2luZyA9IHRydWU7CiAgICAgIGJveC5jbGFzc0xpc3QucmVtb3ZlKCdnb29kJywnYmFkJyk7CiAgICAgIHBhZC5yZWRyYXcoKTsKICAgIH0pOwogICAgY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgZXYgPT4gewogICAgICBpZighcGFkLmRyYXdpbmcgfHwgc3RhdGUuYnVzeSkgcmV0dXJuOwogICAgICBjb25zdCBwID0gcG9zKGV2KTsKICAgICAgY29uc3QgbGFzdCA9IHBhZC5wb2ludHNbcGFkLnBvaW50cy5sZW5ndGgtMV07CiAgICAgIGlmKCFsYXN0IHx8IE1hdGguaHlwb3QocC54LWxhc3QueCwgcC55LWxhc3QueSkgPiAyKXsgcGFkLnBvaW50cy5wdXNoKHApOyBwYWQucmVkcmF3KCk7IH0KICAgIH0pOwogICAgY29uc3QgZW5kID0gZXYgPT4gewogICAgICBpZighcGFkLmRyYXdpbmcgfHwgc3RhdGUuYnVzeSkgcmV0dXJuOwogICAgICBwYWQuZHJhd2luZyA9IGZhbHNlOwogICAgICBpZihldikgcGFkLnBvaW50cy5wdXNoKHBvcyhldikpOwogICAgICBjb25zdCB0b2tlbiA9ICsrcGFkLmFkanVzdFRva2VuOwogICAgICBwYWQuZGV0ZWN0ZWQgPSBjbGFzc2lmeVRvbmUocGFkLnBvaW50cywgY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpKTsKICAgICAgLy8gUHJpbWVpcm8gbWFudMOpbSBvIHRyYcOnbyBkbyB1c3XDoXJpbyBwb3IgdW0gaW5zdGFudGUuIFPDsyBkZXBvaXMgbGltcGEgZSBhanVzdGEuCiAgICAgIHNldFRpbWVvdXQoKCkgPT4gewogICAgICAgIGlmKHRva2VuICE9PSBwYWQuYWRqdXN0VG9rZW4gfHwgc3RhdGUuYnVzeSkgcmV0dXJuOwogICAgICAgIHBhZC5zaG93QWRqdXN0ZWQoKTsKICAgICAgICBvbkRvbmUoKTsKICAgICAgfSwgMjQwKTsKICAgIH07CiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcnVwJywgZW5kKTsKICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyY2FuY2VsJywgZW5kKTsKICAgIHJldHVybiBwYWQ7CiAgfQoKICBmdW5jdGlvbiBkcmF3UG9seWxpbmUoY3R4LCBwdHMsIGNvbG9yLCB3aWR0aCl7CiAgICBpZihwdHMubGVuZ3RoIDwgMikgcmV0dXJuOwogICAgY3R4LnNhdmUoKTsKICAgIGN0eC5saW5lQ2FwID0gJ3JvdW5kJzsgY3R4LmxpbmVKb2luID0gJ3JvdW5kJzsgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7IGN0eC5saW5lV2lkdGggPSB3aWR0aDsKICAgIGN0eC5zaGFkb3dDb2xvciA9IGNvbG9yOyBjdHguc2hhZG93Qmx1ciA9IDEyOwogICAgY3R4LmJlZ2luUGF0aCgpOyBjdHgubW92ZVRvKHB0c1swXS54LCBwdHNbMF0ueSk7CiAgICBmb3IobGV0IGk9MTtpPHB0cy5sZW5ndGg7aSsrKSBjdHgubGluZVRvKHB0c1tpXS54LCBwdHNbaV0ueSk7CiAgICBjdHguc3Ryb2tlKCk7IGN0eC5yZXN0b3JlKCk7CiAgfQoKICBmdW5jdGlvbiBkcmF3Q2Fub25pY2FsKGN0eCwgdG9uZSwgdywgaCwgY29sb3IpewogICAgY3R4LnNhdmUoKTsKICAgIGN0eC5saW5lQ2FwID0gJ3JvdW5kJzsgY3R4LmxpbmVKb2luID0gJ3JvdW5kJzsgY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7IGN0eC5maWxsU3R5bGUgPSBjb2xvcjsgY3R4LmxpbmVXaWR0aCA9IE1hdGgubWF4KDcsIE1hdGgubWluKHcsaCkgKiAuMDQ1KTsgY3R4LnNoYWRvd0NvbG9yID0gY29sb3I7IGN0eC5zaGFkb3dCbHVyID0gMTI7CiAgICBjdHguYmVnaW5QYXRoKCk7CiAgICBpZih0b25lID09PSAxKXsgY3R4Lm1vdmVUbyh3Ki4yNixoKi40NCk7IGN0eC5saW5lVG8odyouNzQsaCouNDQpOyBjdHguc3Ryb2tlKCk7IH0KICAgIGVsc2UgaWYodG9uZSA9PT0gMil7IGN0eC5tb3ZlVG8odyouMzAsaCouNzApOyBjdHgubGluZVRvKHcqLjc0LGgqLjM0KTsgY3R4LnN0cm9rZSgpOyB9CiAgICBlbHNlIGlmKHRvbmUgPT09IDMpeyBjdHgubW92ZVRvKHcqLjI4LGgqLjM4KTsgY3R4LnF1YWRyYXRpY0N1cnZlVG8odyouNTAsaCouNzIsdyouNzIsaCouMzgpOyBjdHguc3Ryb2tlKCk7IH0KICAgIGVsc2UgaWYodG9uZSA9PT0gNCl7IGN0eC5tb3ZlVG8odyouMzAsaCouMzQpOyBjdHgubGluZVRvKHcqLjc0LGgqLjcwKTsgY3R4LnN0cm9rZSgpOyB9CiAgICBlbHNlIHsgY3R4LmFyYyh3Ki41MCxoKi41MCxNYXRoLm1heCg2LE1hdGgubWluKHcsaCkqLjA0NSksMCxNYXRoLlBJKjIpOyBjdHguZmlsbCgpOyB9CiAgICBjdHgucmVzdG9yZSgpOwogIH0KCiAgZnVuY3Rpb24gY2xhc3NpZnlUb25lKHBvaW50cywgcmVjdCl7CiAgICBpZighcG9pbnRzIHx8IHBvaW50cy5sZW5ndGggPCAyKSByZXR1cm4gNTsKICAgIGNvbnN0IHRvdGFsID0gcG9pbnRzLnNsaWNlKDEpLnJlZHVjZSgocyxwLGkpID0+IHMgKyBNYXRoLmh5cG90KHAueC1wb2ludHNbaV0ueCwgcC55LXBvaW50c1tpXS55KSwgMCk7CiAgICBjb25zdCBtaW5YID0gTWF0aC5taW4oLi4ucG9pbnRzLm1hcChwPT5wLngpKSwgbWF4WCA9IE1hdGgubWF4KC4uLnBvaW50cy5tYXAocD0+cC54KSk7CiAgICBjb25zdCBtaW5ZID0gTWF0aC5taW4oLi4ucG9pbnRzLm1hcChwPT5wLnkpKSwgbWF4WSA9IE1hdGgubWF4KC4uLnBvaW50cy5tYXAocD0+cC55KSk7CiAgICBjb25zdCBjeCA9IHBvaW50cy5yZWR1Y2UoKHMscCk9PnMrcC54LDApL3BvaW50cy5sZW5ndGg7CiAgICBjb25zdCBjeSA9IHBvaW50cy5yZWR1Y2UoKHMscCk9PnMrcC55LDApL3BvaW50cy5sZW5ndGg7CiAgICBjb25zdCBjZW50ZXJPayA9IE1hdGguYWJzKGN4LXJlY3Qud2lkdGgvMikgPCByZWN0LndpZHRoKi4yMiAmJiBNYXRoLmFicyhjeS1yZWN0LmhlaWdodC8yKSA8IHJlY3QuaGVpZ2h0Ki4yMjsKICAgIGlmKHRvdGFsIDwgcmVjdC53aWR0aCouMTggJiYgKG1heFgtbWluWCkgPCByZWN0LndpZHRoKi4xMiAmJiAobWF4WS1taW5ZKSA8IHJlY3QuaGVpZ2h0Ki4xMiAmJiBjZW50ZXJPaykgcmV0dXJuIDU7CgogICAgY29uc3QgZmlyc3QgPSBwb2ludHNbMF0sIGxhc3QgPSBwb2ludHNbcG9pbnRzLmxlbmd0aC0xXTsKICAgIGNvbnN0IGR4ID0gbGFzdC54IC0gZmlyc3QueDsKICAgIGNvbnN0IGR5ID0gbGFzdC55IC0gZmlyc3QueTsKICAgIGlmKE1hdGguYWJzKGR4KSA8IHJlY3Qud2lkdGgqLjA4ICYmIE1hdGguYWJzKGR5KSA8IHJlY3QuaGVpZ2h0Ki4wOCkgcmV0dXJuIDU7CgogICAgY29uc3QgbWlkU3RhcnQgPSBNYXRoLmZsb29yKHBvaW50cy5sZW5ndGgqLjIpLCBtaWRFbmQgPSBNYXRoLmNlaWwocG9pbnRzLmxlbmd0aCouOCk7CiAgICBjb25zdCBtaWRkbGUgPSBwb2ludHMuc2xpY2UobWlkU3RhcnQsIG1pZEVuZCk7CiAgICBjb25zdCBtYXhNaWRZID0gTWF0aC5tYXgoLi4ubWlkZGxlLm1hcChwPT5wLnkpKTsKICAgIGNvbnN0IG1pbkVuZFkgPSBNYXRoLm1pbihmaXJzdC55LGxhc3QueSk7CiAgICBjb25zdCB2RGVwdGggPSBtYXhNaWRZIC0gbWluRW5kWTsKICAgIGNvbnN0IGhhc1YgPSB2RGVwdGggPiByZWN0LmhlaWdodCouMTYgJiYgTWF0aC5hYnMoZmlyc3QueS1sYXN0LnkpIDwgcmVjdC5oZWlnaHQqLjI0OwogICAgaWYoaGFzVikgcmV0dXJuIDM7CgogICAgaWYoTWF0aC5hYnMoZHkpIDwgcmVjdC5oZWlnaHQqLjE2KSByZXR1cm4gMTsKICAgIGlmKGR5IDwgLXJlY3QuaGVpZ2h0Ki4xNCkgcmV0dXJuIDI7CiAgICBpZihkeSA+IHJlY3QuaGVpZ2h0Ki4xNCkgcmV0dXJuIDQ7CiAgICByZXR1cm4gMTsKICB9CgogIGZ1bmN0aW9uIGJpbmRTZXR0aW5ncygpewogICAgJCQoJy5zZWcnKS5mb3JFYWNoKHNlZyA9PiB7CiAgICAgIHNlZy5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ID0+IHsKICAgICAgICBjb25zdCBidG4gPSBldi50YXJnZXQuY2xvc2VzdCgnYnV0dG9uW2RhdGEtdmFsdWVdJyk7CiAgICAgICAgaWYoIWJ0bikgcmV0dXJuOwogICAgICAgIGNvbnN0IGtleSA9IHNlZy5kYXRhc2V0LnNldHRpbmc7CiAgICAgICAgc3RhdGUuc2V0dGluZ3Nba2V5XSA9IGJ0bi5kYXRhc2V0LnZhbHVlOwogICAgICAgICQkKCdidXR0b24nLCBzZWcpLmZvckVhY2goYiA9PiBiLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIGIgPT09IGJ0bikpOwogICAgICAgIHN0YXRlLnF1ZXVlID0gW107CiAgICAgICAgZmlsbFF1ZXVlKCk7CiAgICAgIH0pOwogICAgfSk7CiAgfQoKICBmdW5jdGlvbiBxdWlja1JhbmRvbWl6ZSgpewogICAgY29uc3Qgc2V0cyA9IFsKICAgICAgWyd0YXNrTW9kZScsIFsncmFuZG9tJywnZHJhdycsJ2Nob2ljZSddXSwKICAgICAgWyd1bml0TW9kZScsIFsncmFuZG9tJywnc2luZ2xlJywnZG91YmxlJ11dLAogICAgICBbJ2RpZmZpY3VsdHknLCBbJ25vcm1hbCcsJ2hhcmQnXV0KICAgIF07CiAgICBzZXRzLmZvckVhY2goKFtrZXksIHZhbHNdKSA9PiB7CiAgICAgIHN0YXRlLnNldHRpbmdzW2tleV0gPSBwaWNrKHZhbHMpOwogICAgICBjb25zdCBzZWcgPSAkKGAuc2VnW2RhdGEtc2V0dGluZz0iJHtrZXl9Il1gKTsKICAgICAgJCQoJ2J1dHRvbicsIHNlZykuZm9yRWFjaChiID0+IGIuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgYi5kYXRhc2V0LnZhbHVlID09PSBzdGF0ZS5zZXR0aW5nc1trZXldKSk7CiAgICB9KTsKICAgIHN0YXRlLnF1ZXVlID0gW107CiAgICBmaWxsUXVldWUoKTsKICB9CgogIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCAoKSA9PiBzdGF0ZS5kcmF3UGFkcy5mb3JFYWNoKHAgPT4gcC5yZXNpemUoKSkpOwogIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldiA9PiB7CiAgICBpZihzdGF0ZS5zY3JlZW4gIT09ICdnYW1lJykgcmV0dXJuOwogICAgaWYoZXYua2V5ID09PSAnRXNjYXBlJykgZXhpdEdhbWUoKTsKICAgIGlmKGV2LmNvZGUgPT09ICdTcGFjZScpeyBldi5wcmV2ZW50RGVmYXVsdCgpOyBwbGF5Q3VycmVudCgpOyB9CiAgfSk7CgogIGVscy5zdGFydEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHN0YXJ0R2FtZSk7CiAgZWxzLnF1aWNrQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcXVpY2tSYW5kb21pemUpOwogIGVscy5leGl0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXhpdEdhbWUpOwogIHRyeXsgLy8gaTE4biBsZXZlIGRvcyByw7N0dWxvcyB2aXPDrXZlaXMKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zY29yZWJveCBzcGFuLC5yZWNvcmRib3ggc3BhbiwuYmVzdC1jYXJkIHNwYW4sLnN0YXJ0LWJ0biwuc2Vzcy1ob21lLC5zZXNzLXRpdGxlLC5jbGVhci10b25lLC50YXNrLWhlYWQgaDIsI3Nlc3NOZXcsLnNlc3MtY2VsbCBzcGFuJykuZm9yRWFjaCgoKT0+e30pOwogICAgY29uc3QgbWFwPVtbJy5zY29yZWJveCAubGFiLCAuc2NvcmVib3ggc3BhbicsJ3Njb3JlJ10sWycucmVjb3JkYm94IC5sYWIsIC5yZWNvcmRib3ggc3BhbicsJ2Jlc3QnXV07CiAgICBjb25zdCBidD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYmVzdC1jYXJkIHNwYW4nKTtpZihidClidC50ZXh0Q29udGVudD1HVCgnYmVzdFNjb3JlJyk7CiAgICBjb25zdCBzYj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RhcnRCdG4nKTtpZihzYilzYi5maXJzdENoaWxkJiYoc2IuZmlyc3RDaGlsZC50ZXh0Q29udGVudD1HVCgnc3RhcnQnKSsnICcpOwogICAgY29uc3Qgc2g9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Nlc3NIb21lJyk7aWYoc2gpc2gudGV4dENvbnRlbnQ9R1QoJ2JhY2tTdGFydCcpOwogICAgY29uc3Qgc3Q9ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNlc3MtdGl0bGUnKTtpZihzdClzdC50ZXh0Q29udGVudD1HVCgnZG9uZScpOwogICAgY29uc3QgY2VsbHM9ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNlc3MtY2VsbCBzcGFuJyk7CiAgICBpZihjZWxscy5sZW5ndGg9PT00KXtjZWxsc1swXS50ZXh0Q29udGVudD1HVCgncHRzJyk7Y2VsbHNbMV0udGV4dENvbnRlbnQ9R1QoJ3JlYycpO2NlbGxzWzJdLnRleHRDb250ZW50PUdUKCdhY2MnKTtjZWxsc1szXS50ZXh0Q29udGVudD1HVCgnc2VxJyk7fQogICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNjb3JlYm94IHNwYW46bm90KHN0cm9uZyksIC5zY29yZWJveCAuaycpLmZvckVhY2goZT0+e2lmKC9zY29yZS9pLnRlc3QoZS50ZXh0Q29udGVudCkpZS50ZXh0Q29udGVudD1HVCgnc2NvcmUnKTt9KTsKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5yZWNvcmRib3ggc3Bhbjpub3Qoc3Ryb25nKSwgLnJlY29yZGJveCAuaycpLmZvckVhY2goZT0+e2lmKC9yZWNvcmRlfGJlc3QvaS50ZXN0KGUudGV4dENvbnRlbnQpKWUudGV4dENvbnRlbnQ9R1QoJ2Jlc3QnKTt9KTsKICB9Y2F0Y2goZSl7fQogIGNvbnN0IGNmZ0J0bj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2ZnQnRuJyk7CiAgaWYoY2ZnQnRuKWNmZ0J0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsKCk9PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjZmdQYW5lbCcpLmNsYXNzTGlzdC50b2dnbGUoJ29wZW4nKSk7CiAgY29uc3QgbXVzaWNDaGlwPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtdXNpY0NoaXAnKTsKICBpZihtdXNpY0NoaXApbXVzaWNDaGlwLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywoKT0+e3RyeXtpZih3aW5kb3cucGFyZW50JiZ0eXBlb2Ygd2luZG93LnBhcmVudC5oek9wZW5NdXNpYz09PSdmdW5jdGlvbicpd2luZG93LnBhcmVudC5oek9wZW5NdXNpYygpO31jYXRjaChlKXt9fSk7CiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLGU9PnsKICAgIGNvbnN0IHQ9ZS50YXJnZXQ7CiAgICBpZighdClyZXR1cm47CiAgICBpZih0LmlkPT09J3Nlc3NYJ3x8dC5jbG9zZXN0JiZ0LmNsb3Nlc3QoJyNzZXNzWCcpKXJldHVybiBoelNlc3NDbG9zZSgpOwogICAgaWYodC5pZD09PSdzZXNzSG9tZScpcmV0dXJuIGh6U2Vzc0Nsb3NlKCk7CiAgICBpZih0LmlkPT09J3Nlc3NBZ2FpbicpcmV0dXJuIGh6U2Vzc0Nsb3NlKHRydWUpOwogICAgaWYodC5pZD09PSdzZXNzT3YnKXJldHVybiBoelNlc3NDbG9zZSgpOwogICAgaWYodC5pZD09PSdiYWNrSHViJ3x8dC5jbG9zZXN0JiZ0LmNsb3Nlc3QoJyNiYWNrSHViJykpe3RyeXtpZih3aW5kb3cucGFyZW50JiZ0eXBlb2Ygd2luZG93LnBhcmVudC5oekJhY2tUb0h1Yj09PSdmdW5jdGlvbicpd2luZG93LnBhcmVudC5oekJhY2tUb0h1YigpO31jYXRjaChlcnIpe319CiAgfSk7CiAgZWxzLnJlcGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHBsYXlDdXJyZW50KTsKCiAgdHJ5e2lmKHdpbmRvdy5wYXJlbnQmJnR5cGVvZiB3aW5kb3cucGFyZW50Lmh6UHJlbG9hZENlbGVicmF0aW9uPT09J2Z1bmN0aW9uJyl3aW5kb3cucGFyZW50Lmh6UHJlbG9hZENlbGVicmF0aW9uKCk7fWNhdGNoKGUpe30KICBiaW5kU2V0dGluZ3MoKTsKICB1cGRhdGVTY29yZXMoKTsKICBmaWxsUXVldWUoKTsKfSkoKTsKPC9zY3JpcHQ+CjxkaXYgY2xhc3M9InNlc3Mtb3YiIGlkPSJzZXNzT3YiPgogIDxkaXYgY2xhc3M9InNlc3MtY2FyZCI+CiAgICA8YnV0dG9uIGNsYXNzPSJzZXNzLXgiIGlkPSJzZXNzWCIgYXJpYS1sYWJlbD0iRmVjaGFyIj7DlzwvYnV0dG9uPgogICAgPGRpdiBjbGFzcz0ic2Vzcy10aXRsZSI+U2Vzc8OjbyBjb25jbHXDrWRhITwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2Vzcy10cm9waHkiPjxzdmcgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjEuNiI+PHBhdGggZD0iTTggMjFoOE0xMiAxN3Y0TTcgNGgxMHY1YTUgNSAwIDAxLTEwIDBWNHoiLz48cGF0aCBkPSJNNyA2SDR2MmEzIDMgMCAwMDMgM00xNyA2aDN2MmEzIDMgMCAwMS0zIDMiLz48cGF0aCBkPSJNMTIgOC4ybC44IDEuNiAxLjguMy0xLjMgMS4zLjMgMS44LTEuNi0uOS0xLjYuOS4zLTEuOC0xLjMtMS4zIDEuOC0uM3oiIHN0cm9rZS13aWR0aD0iMS4xIi8+PC9zdmc+PC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzZXNzLXNjb3JlIiBpZD0ic2Vzc1Njb3JlIj4wPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzZXNzLW5ldyIgaWQ9InNlc3NOZXciPjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2Vzcy16aCIgaWQ9InNlc3NaaCI+54af6IO955Sf5benPC9kaXY+CiAgICA8ZGl2IGNsYXNzPSJzZXNzLWdyaWQiPgogICAgICA8ZGl2IGNsYXNzPSJzZXNzLWNlbGwiPjxzcGFuPlBvbnR1YcOnw6NvPC9zcGFuPjxzdHJvbmcgaWQ9InN0Q29ycmVjdCI+MDwvc3Ryb25nPjwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJzZXNzLWNlbGwiPjxzcGFuPlJlY29yZGU8L3NwYW4+PHN0cm9uZyBpZD0ic3RCZXN0Ij4wPC9zdHJvbmc+PC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InNlc3MtY2VsbCI+PHNwYW4+UHJlY2lzw6NvPC9zcGFuPjxzdHJvbmcgaWQ9InN0QWNjIj7igJQ8L3N0cm9uZz48L2Rpdj4KICAgICAgPGRpdiBjbGFzcz0ic2Vzcy1jZWxsIj48c3Bhbj5TZXF1w6puY2lhPC9zcGFuPjxzdHJvbmcgaWQ9InN0U3RyZWFrIj4wPC9zdHJvbmc+PC9kaXY+CiAgICA8L2Rpdj4KICAgIDxkaXYgY2xhc3M9InNlc3MtbXVzaWMiIGlkPSJzZXNzTXVzaWMiPjwvZGl2PgogICAgPGRpdiBjbGFzcz0ic2Vzcy1hY3Rpb25zIj48YnV0dG9uIGNsYXNzPSJzZXNzLWhvbWUiIGlkPSJzZXNzSG9tZSI+Vm9sdGFyIGFvIGluw61jaW88L2J1dHRvbj48YnV0dG9uIGNsYXNzPSJzZXNzLWFnYWluIiBpZD0ic2Vzc0FnYWluIj5Ob3ZhIHBhcnRpZGE8L2J1dHRvbj48L2Rpdj4KICA8L2Rpdj4KPC9kaXY+CjwvYm9keT4KPC9odG1sPgo=';
function hzGameDoc(){try{const bin=atob(HZP_GAME_B64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(bytes);}catch(e){return'';}}
function hzAccent(){const cs=getComputedStyle(document.documentElement);return{ac:(cs.getPropertyValue('--ac')||'#f5a623').trim(),rgb:(cs.getPropertyValue('--ac-rgb')||'245,166,35').trim()};}
/* Voz natural com emoção para as frases do jogo */
/* Gera áudio de frase com a voz natural/emocional (blob URL) — usado pelo pré-cache do jogo */
window.hzPhraseGen=async function(zh){
  try{
    const gen=window.H46_edgeBlob||window.h42EdgeDirect;
    if(!gen)return null;
    let o=undefined;
    if(localStorage.getItem('hzVoiceV2')!=='0'&&window.H46_getSettings){ // Voz Natural v2 (padrão)
      o=Object.assign({},H46_getSettings());o.style='cheerful';o.degree='1.8';
    }
    const blob=await gen(String(zh||'').trim(),o);
    return blob?URL.createObjectURL(blob):null;
  }catch(e){return null;}
};

      /*
       * ---- Voz Emocional v3 Beta ----
       *
       * Esta versão expande o léxico de palavras-chave para cada categoria emocional
       * combinando o dicionário original, o dicionário extra HZV2_EXTRA e várias
       * variações morfológicas simples. O objetivo é tornar a detecção de sentimentos
       * mais sensível e expressiva.  Caso a expansão cause algum erro ou consuma
       * muitos recursos, a aplicação volta automaticamente para a lista padrão.
       */

      // Indica se o modo V3 está ativo nas configurações (emotionV3On)
      function emotionV3Enabled() {
        try {
          const settings = v36GetSettings();
          return !!settings.emotionV3On;
        } catch {
          return false;
        }
      }

      // Gera um novo conjunto de regras com dicionários expandidos.  Utiliza caching
      // para não recomputar em chamadas subsequentes.
      function buildEmotionRulesV3() {
        try {
          if (buildEmotionRulesV3._cache) return buildEmotionRulesV3._cache;
          // Sufixos a anexar em cada palavra‑chave para aumentar a cobertura.
          const suffixes = ['','啊','啊啊','呀','呀呀','呢','吧','吧吧','啊！','呀！','?!','？','！','...','~~','嘛','罢了'];
          const rulesV3 = EMOTION_RULES.map(rule => {
            const extras = HZV2_EXTRA[rule.id] || [];
            const baseList = (rule.keywords || []).concat(extras);
            const seen = new Set();
            const newKeywords = [];
            for (const word of baseList) {
              // gera variações com diferentes sufixos
              for (const suf of suffixes) {
                const kw = word + suf;
                if (!seen.has(kw)) { newKeywords.push(kw); seen.add(kw); }
              }
            }
            // garante que as palavras base estejam presentes
            for (const word of baseList) {
              if (!seen.has(word)) { newKeywords.push(word); seen.add(word); }
            }
            return { ...rule, keywords: newKeywords };
          });
          buildEmotionRulesV3._cache = rulesV3;
          return rulesV3;
        } catch (err) {
          // Em caso de falha, retorna a lista padrão
          console.error('Falha ao construir EMOTION_RULES_V3:', err);
          return EMOTION_RULES;
        }
      }

      // Seleciona o conjunto de regras conforme a configuração atual
      function getEmotionRules() {
        return emotionV3Enabled() ? buildEmotionRulesV3() : EMOTION_RULES;
      }
window.hzOpenMusic=function(){try{if(window.hzMusicPlayer?.open)return window.hzMusicPlayer.open();showModal('mo-music');}catch(e){}};
window.hzMusicController={
  stop(){try{if(window.hzMusicPlayer?.close)return window.hzMusicPlayer.close();v43StopMusic();}catch{}},
  openPicker(){try{window.hzOpenMusic();}catch{}},
  isPlaying(){try{return window.hzMusicPlayer?.isPlaying?.()??!!(v43Audio&&!v43Audio.paused);}catch{return false;}}
};
window.hzCelebrate=function(){try{return v43PlayCelebrationTrack();}catch(e){return null;}};
window.hzStopCelebrate=function(){try{v43StopMusic();}catch(e){}};
window.hzSpeakPhrase=function(zh){
  try{if(typeof window.v36Speak==='function'){window.v36Speak(zh,'sentence');return;}}catch{}
  try{if(typeof window.speakWordMode==='function'){window.speakWordMode(zh,'natural');return;}}catch{}
  try{const u=new SpeechSynthesisUtterance(zh);u.lang='zh-CN';u.rate=.9;speechSynthesis.cancel();speechSynthesis.speak(u);}catch{}
};
/* SVGs proprietários */
const SVG_WAVES='<svg viewBox="0 0 320 54" fill="none" stroke="currentColor" aria-hidden="true" style="width:100%;height:44px;opacity:.75"><path d="M8 40 Q160 6 312 40" stroke-width="1" opacity=".85"/><path d="M20 44 Q160 14 300 44" stroke-width="1" opacity=".55"/><path d="M34 48 Q160 22 286 48" stroke-width="1" opacity=".35"/><path d="M50 51 Q160 30 270 51" stroke-width="1" opacity=".2"/><circle cx="284" cy="13" r="6" stroke-width="1.2"/><circle cx="284" cy="13" r="2.2" fill="currentColor" stroke="none" opacity=".8"/></svg>';
/* O SVG original do Guzheng foi movido para assets/guzheng.svg. */
const SVG_TONECARDS='<svg fill="currentColor" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1536"><path d="M1122,1154L1107,1157L1108,1159L1117,1158L1122,1156Z M1167,1147L1151,1147L1137,1152L1130,1157L1158,1148L1167,1149Z M1178,1146L1167,1134L1160,1134L1123,1150L1133,1148L1160,1137L1166,1137L1173,1144Z M407,1118L407,1121L409,1121L415,1117L423,1117L447,1126L473,1128L473,1126L459,1125L440,1121L422,1114L414,1114Z M1200,1141L1185,1127L1176,1116L1170,1113L1163,1113L1115,1134L1125,1133L1143,1126L1162,1116L1173,1117L1178,1123L1178,1125L1183,1128L1183,1131L1176,1130L1176,1128L1168,1124L1161,1124L1122,1141L1107,1146L1098,1147L1093,1150L1099,1150L1109,1146L1124,1143L1160,1127L1168,1127L1173,1130L1185,1144L1188,1145L1186,1140L1181,1135L1183,1133L1188,1133L1197,1142L1200,1143Z M663,1114L663,1116L666,1116L680,1107L688,1106L694,1108L704,1116L708,1116L708,1114L695,1105L687,1103L679,1104Z M1207,1138L1183,1110L1177,1105L1169,1102L1162,1103L1127,1120L1101,1128L1090,1133L1085,1133L1081,1136L1097,1133L1106,1129L1116,1127L1135,1120L1162,1106L1171,1105L1176,1107L1203,1137Z M394,1118L397,1118L409,1106L414,1104L420,1104L457,1117L469,1118L484,1122L488,1121L489,1119L453,1113L439,1109L422,1101L414,1101L409,1103Z M642,1115L651,1112L665,1102L681,1094L694,1095L729,1116L735,1115L713,1104L698,1094L688,1090L683,1090L674,1093L644,1112Z M627,1109L632,1109L670,1085L680,1080L687,1079L701,1085L717,1097L753,1117L756,1115L743,1109L705,1084L691,1077L677,1078L637,1103L629,1106Z M369,967L362,987L362,993L371,991L376,992L377,997L382,996L381,989L383,988L383,985L378,984L374,967Z M371,979L374,984L373,987L368,985Z M364,952L352,958L343,969L341,976L342,993L347,1003L359,1012L365,1014L382,1013L390,1009L398,1001L403,989L402,973L397,963L387,955L373,951Z M365,955L372,954L385,958L396,969L399,977L399,988L395,999L389,1005L378,1011L366,1011L356,1006L349,999L344,987L344,979L348,968L355,960Z M1061,946L1061,950L1063,952L1100,971L1103,974L1109,976L1123,985L1140,993L1204,1029L1210,1031L1212,1036L1208,1037L1208,1041L1227,1040L1229,1037L1220,1020L1216,1021L1216,1028L1214,1028L1200,1019L1192,1016L1191,1014L1183,1011L1169,1002L1143,989L1140,986L1134,984L1129,980L1094,962L1091,959L1066,946Z M482,944L473,944L463,951L461,948L459,948L450,953L450,957L455,958L460,977L461,986L458,988L458,991L475,987L475,984L471,984L469,982L468,974L464,963L465,955L472,950L477,950L483,957L483,962L487,975L487,979L484,982L484,984L501,980L501,977L497,977L495,975L490,953L488,949Z M852,912L848,914L846,922L849,927L857,928L859,927L858,924L852,925L851,921L861,920L860,914Z M828,913L828,928L831,928L831,918L834,915L838,917L839,928L842,928L841,914L838,912Z M810,913L807,919L809,926L812,928L819,928L823,923L822,915L818,912Z M814,915L818,916L820,919L820,922L817,925L813,925L811,923L811,918Z M758,912L749,913L749,928L752,928L752,918L754,916L758,916Z M807,906L790,909L796,910L797,928L800,928L801,909L807,908Z M699,906L699,909L706,910L706,928L709,928L710,909L716,908L716,906Z M742,905L739,908L741,910L739,914L740,928L743,927Z M720,905L720,928L723,928L723,920L726,915L730,917L731,928L734,928L734,915L730,912L723,912L724,907L723,905Z M776,904L773,904L772,912L766,912L761,916L761,924L764,928L776,928Z M767,915L770,915L773,918L772,924L767,925L764,922L764,918Z M337,848L330,853L331,857L334,857L338,852L341,852L344,855L344,858L338,862L339,865L346,865L348,867L348,873L342,876L339,874L334,876L339,880L344,880L352,876L354,873L354,866L349,862L348,851L345,848Z M329,834L316,845L311,856L312,874L316,882L323,889L330,893L337,895L354,893L361,889L367,883L372,874L372,853L368,845L360,837L352,833L336,832Z M343,835L356,839L364,846L369,857L369,871L363,882L357,887L349,891L340,892L328,888L320,881L315,871L314,859L317,850L326,840L334,836Z M1085,829L1085,834L1127,883L1140,893L1150,898L1163,901L1181,900L1200,894L1232,876L1262,855L1267,854L1268,858L1270,858L1272,856L1275,846L1275,840L1269,842L1256,843L1256,846L1261,848L1256,853L1224,875L1193,891L1172,896L1165,896L1147,891L1133,881L1123,871L1089,829Z M456,826L451,824L444,824L437,829L432,831L431,828L420,834L419,836L426,840L431,861L431,867L427,869L427,871L434,871L446,867L446,865L442,865L440,863L434,839L436,835L441,832L448,831L452,836L458,859L455,862L456,865L471,861L472,858L468,858L466,856L461,834Z M483,815L472,821L472,824L478,827L483,847L482,854L479,855L479,858L498,854L498,851L494,851L491,847Z M486,794L481,795L475,803L468,798L464,799L476,811L480,810Z M952,793L952,795L954,796L960,795L959,792Z M933,793L934,796L942,795L941,792Z M913,792L914,796L922,795L921,792Z M861,792L862,795L869,795L869,792Z M841,792L842,796L850,795L849,792Z M822,792L823,796L830,795L830,792Z M803,792L803,795L805,796L811,795L811,792Z M785,795L792,795L792,792Z M748,795L755,795L755,792Z M728,793L728,795L730,796L737,795L737,792Z M709,793L710,796L714,796L718,793Z M690,794L692,796L698,795L698,792Z M647,793L647,795L654,795L653,792Z M630,793L630,795L640,795L640,793L638,792Z M616,792L616,795L618,796L623,795L622,792Z M598,795L605,796L606,792L598,793Z M766,792L767,796L774,795L774,792Z M312,727L306,728L302,730L300,733L301,739L304,738L304,735L307,732L311,732L314,735L313,744L305,757L305,760L307,761L325,756L324,752L313,754L319,740L319,733L316,729Z M299,714L292,718L282,731L280,740L282,756L292,769L301,774L317,775L327,772L337,763L343,750L342,734L334,721L321,713L306,712Z M306,715L316,715L327,720L336,730L340,743L337,756L332,763L326,768L316,772L307,772L294,766L287,758L283,746L284,736L289,726L298,718Z M1305,715L1291,708L1287,709L1289,716L1259,719L1253,721L1175,731L1170,733L1146,735L1128,739L1105,741L1101,745L1102,747L1111,747L1132,744L1137,742L1162,740L1174,737L1241,729L1276,723L1292,723L1289,728L1292,730Z M962,707L959,704L955,704L953,706L947,707L922,717L921,721L924,724L928,724L938,720L941,722L886,786L850,822L832,837L817,847L804,853L781,858L754,853L743,848L729,839L714,827L682,795L681,792L604,713L600,714L598,716L598,719L664,788L666,792L664,793L665,796L671,796L702,828L721,844L735,854L748,860L771,866L786,866L810,860L829,850L862,823L889,795L899,795L899,793L893,791L933,745L938,742L938,739L947,729L951,728L951,745L953,747L957,747L959,745L960,739L960,718Z M425,705L414,704L402,711L401,708L390,714L390,717L396,720L402,746L399,752L416,748L416,745L410,744L404,719L412,711L418,711L423,716L423,720L428,735L428,740L425,742L425,745L439,742L442,738L438,738L436,736L430,711Z M453,695L441,701L442,704L447,705L449,710L451,723L454,733L451,735L452,739L455,737L468,734L467,731L464,731L461,727Z M1075,688L1071,691L1071,694L1080,692L1082,693L1083,698L1067,711L1067,714L1079,717L1085,715L1084,713L1081,713L1076,709L1079,708L1086,701L1087,693L1082,688Z M454,673L450,673L448,675L445,682L444,691L447,691L455,677Z M720,622L718,625L728,630L728,679L726,681L720,682L718,685L719,687L750,687L751,684L748,681L744,681L741,678L741,637L749,628L754,626L767,627L773,633L774,637L773,680L766,682L766,687L796,686L795,682L792,682L788,679L788,639L785,626L779,619L773,616L759,616L741,626L741,616L737,616L732,619Z M834,615L814,622L814,627L820,628L823,633L822,679L820,681L812,683L813,687L845,686L844,682L838,681L836,679L836,617Z M277,605L270,613L271,615L277,614L283,637L286,637L287,634L279,605Z M1131,594L1132,596L1149,600L1302,628L1303,632L1300,635L1302,637L1319,631L1320,627L1306,615L1303,616L1305,623L1298,621L1275,618L1266,615L1249,613L1240,610L1191,602L1188,600L1163,597L1160,595L1133,591Z M276,590L268,592L263,595L254,604L249,615L249,628L251,635L262,648L273,653L286,653L297,649L304,643L310,632L312,620L310,609L303,599L293,592L287,590Z M269,594L290,594L302,603L307,612L308,627L303,638L295,646L285,650L277,650L267,647L257,638L252,626L252,615L255,607L263,598Z M394,582L383,581L371,588L370,586L368,586L359,591L358,594L364,596L370,618L370,624L366,628L370,629L383,626L386,623L381,622L378,619L376,605L373,596L381,588L386,588L391,592L397,617L394,619L395,622L411,618L410,615L405,614L400,591Z M810,580L811,585L825,605L834,604L840,593L848,583L848,580L845,579L841,581L830,592L828,592L815,580Z M423,572L420,572L411,578L412,581L415,581L418,585L419,594L423,605L422,611L419,613L421,616L438,611L438,608L432,607Z M1104,571L1099,572L1096,575L1099,577L1100,584L1097,599L1101,599L1102,597L1102,590L1104,586L1106,573Z M425,556L407,560L403,562L403,564L407,566L411,564L426,561Z M1122,504L1123,507L1128,511L1148,517L1162,534L1171,539L1184,540L1193,537L1202,546L1209,548L1216,547L1203,543L1196,536L1195,533L1200,525L1200,516L1203,513L1210,510L1218,511L1221,514L1222,518L1219,520L1216,517L1211,517L1208,521L1208,527L1213,533L1219,535L1228,532L1233,524L1233,521L1230,521L1229,526L1224,531L1216,531L1210,525L1211,521L1215,519L1219,523L1223,522L1224,513L1219,507L1213,506L1213,502L1209,497L1204,497L1200,493L1195,493L1191,495L1187,500L1177,500L1173,505L1173,510L1175,512L1182,512L1183,517L1179,521L1174,521L1171,519L1162,508L1163,498L1171,490L1183,489L1185,486L1193,486L1201,482L1207,483L1217,491L1220,498L1222,499L1224,497L1229,504L1237,510L1238,522L1241,525L1241,528L1243,530L1248,531L1257,544L1240,540L1219,548L1224,549L1239,543L1245,543L1258,547L1263,547L1267,545L1267,543L1260,540L1250,529L1243,525L1242,515L1239,508L1227,496L1223,495L1220,489L1214,483L1207,480L1198,480L1192,483L1185,483L1180,487L1169,488L1162,494L1159,501L1151,501L1135,505Z M1197,525L1195,529L1185,537L1173,537L1163,531L1152,517L1147,513L1133,510L1133,507L1145,506L1153,503L1159,504L1159,508L1162,514L1169,522L1181,523L1186,518L1186,511L1181,509L1177,510L1176,506L1178,503L1186,502L1191,505L1197,513Z M1191,500L1194,496L1200,497L1202,502L1204,500L1208,500L1210,502L1209,507L1199,511L1196,505Z M481,471L469,472L453,466L434,466L432,454L426,447L416,442L405,442L397,435L389,432L379,433L369,437L359,450L353,450L347,453L343,459L336,464L333,474L325,480L323,485L319,488L314,489L305,498L298,501L298,503L302,505L316,505L320,503L326,503L337,509L343,508L355,515L366,516L382,509L391,500L402,505L412,505L423,502L430,498L443,485L451,481L464,481L475,478L481,474Z M389,474L394,467L400,462L408,462L412,465L412,470L405,470L402,473L401,477L402,481L408,486L418,486L423,484L430,478L434,471L441,469L453,469L465,474L468,477L447,479L440,483L433,491L423,499L414,502L403,502L395,499L392,496L393,489Z M371,460L376,456L383,460L383,456L385,453L391,453L395,458L395,461L387,471L379,466L373,465L371,463Z M430,458L431,466L429,473L425,478L418,483L409,483L404,478L406,473L415,471L416,466L414,462L407,458L397,458L397,454L392,450L385,450L382,452L375,453L370,456L366,464L358,466L353,471L354,480L359,482L365,480L368,483L368,489L364,493L352,493L343,485L342,481L339,479L338,482L346,493L354,497L362,497L370,492L372,488L371,480L367,477L357,478L355,475L357,471L365,467L370,467L379,470L385,476L386,481L388,483L388,493L385,501L375,510L368,512L355,512L350,510L345,505L338,506L325,500L315,502L308,500L318,490L325,489L327,483L337,476L339,466L345,463L346,460L352,454L357,452L364,452L366,445L376,436L385,434L392,436L398,440L403,447L407,447L408,445L415,445L423,449Z M893,429L894,432L897,434L906,433L909,430L908,427L904,427L903,425L898,425Z M966,470L964,467L957,465L952,457L944,456L941,458L939,462L929,466L927,470L927,474L929,477L928,480L921,480L919,477L921,474L918,474L911,479L888,484L867,480L866,476L875,477L881,473L882,466L877,463L870,465L863,475L856,478L848,478L841,475L827,475L816,469L801,466L796,462L808,453L816,450L821,445L836,438L846,438L862,434L870,435L871,438L877,442L886,440L884,433L875,428L889,415L893,415L900,410L901,403L900,401L896,400L890,402L886,407L887,413L870,427L853,433L846,430L851,425L852,421L850,417L843,417L839,419L837,422L836,431L825,439L822,438L821,431L816,425L820,421L823,414L823,410L818,404L818,402L814,398L803,398L801,400L798,399L795,393L790,390L784,389L775,392L771,398L770,408L763,410L758,415L757,430L762,438L746,454L743,454L743,450L739,448L741,459L737,464L733,464L730,457L725,453L713,453L707,457L704,462L703,468L694,468L686,472L684,479L682,481L684,495L664,502L655,503L645,501L658,482L667,482L671,480L674,476L674,472L665,467L669,459L679,452L681,448L680,439L678,434L676,434L668,440L665,445L667,457L654,482L649,484L649,469L644,462L636,461L632,467L632,472L634,476L640,480L645,480L647,488L640,498L632,505L624,506L598,516L596,522L598,527L602,527L628,515L643,512L660,511L677,518L681,522L681,526L684,531L688,534L696,534L699,530L700,524L710,524L719,518L728,524L736,524L745,518L747,514L747,504L745,500L746,497L751,494L755,488L755,481L753,477L755,475L772,473L781,470L799,470L818,475L833,486L833,494L839,501L851,502L851,489L845,484L836,484L835,479L847,482L858,481L866,484L886,486L893,490L895,494L904,498L907,498L909,494L897,485L908,482L931,484L932,490L935,494L942,495L948,492L952,495L956,495L965,492L963,490L962,481L966,475Z M689,523L695,526L694,531L688,530L687,527Z M692,502L690,507L690,512L692,516L690,519L682,519L676,514L668,511L668,508L680,504L682,502Z M731,496L737,497L742,502L743,507L742,514L737,516L734,520L725,518L721,514L720,510L723,503L724,506L726,506L727,503L731,503Z M705,496L708,498L706,499L707,504L714,507L717,506L717,512L710,520L703,520L699,515L695,514L694,510L697,501Z M848,490L849,496L846,499L840,498L838,494L845,489Z M958,482L958,489L952,491L950,490L950,485L953,485L954,482Z M936,482L940,482L946,487L946,489L944,491L937,490L935,488Z M734,473L745,472L749,476L751,485L750,488L743,494L736,494L733,490L736,489L736,486L732,481L730,483L726,482Z M692,473L702,472L707,476L709,484L704,482L702,486L704,494L695,495L688,490L686,483L689,480L689,476Z M955,468L960,468L962,470L963,475L960,478L955,477L953,470Z M938,467L940,472L934,479L930,471L933,467Z M872,467L877,466L879,468L879,471L874,473Z M638,464L641,464L645,467L644,470L642,470L640,473L636,473L635,468Z M945,459L949,459L952,462L950,469L948,467L942,466L942,462Z M714,457L723,457L726,459L730,468L727,476L723,477L720,471L712,479L708,472L708,464Z M789,460L779,466L762,467L754,469L748,469L745,466L758,448L768,440L772,441L773,452L777,457Z M675,440L677,442L677,448L675,449L669,444Z M780,435L783,436L784,439L789,441L795,440L795,447L788,454L780,453L776,448L776,440Z M804,426L811,426L817,432L818,439L810,448L802,447L797,439L799,436L802,437L805,433Z M848,420L848,425L845,426L841,422L843,420Z M770,412L775,413L779,420L776,420L776,428L780,431L775,434L767,434L761,428L763,424L762,417Z M891,405L893,403L897,404L898,407L895,409Z M804,402L813,403L815,409L818,410L817,418L810,423L802,420L806,418L806,415L802,414L802,412L796,414L799,406Z M787,393L795,399L795,409L791,413L790,408L786,410L783,409L784,413L782,416L775,408L774,401L778,395L782,396L785,393Z M539,386L539,400L554,402L553,411L538,412L539,435L553,436L552,449L536,450L535,1056L537,1058L546,1057L552,1059L551,1071L538,1071L537,1073L538,1095L554,1096L553,1106L538,1107L539,1126L557,1124L558,1110L561,1109L567,1110L568,1125L571,1126L591,1126L593,1124L594,1110L605,1111L606,1127L957,1127L959,1110L969,1110L971,1112L970,1124L972,1126L994,1126L995,1111L997,1109L1005,1110L1007,1126L1025,1125L1025,1107L1009,1105L1010,1095L1025,1095L1024,1071L1011,1070L1010,1058L1008,1058L1006,1072L994,1072L992,1074L991,1092L982,1091L974,1093L974,1104L972,1106L954,1106L952,1123L878,1122L853,1109L824,1088L825,1085L829,1085L838,1081L851,1082L866,1079L869,1080L870,1085L879,1092L886,1092L894,1088L900,1092L905,1093L913,1089L916,1085L916,1070L929,1070L938,1065L946,1071L953,1071L956,1068L958,1068L963,1060L962,1050L966,1048L970,1043L970,1032L965,1026L954,1023L952,1015L945,1010L936,1010L932,1012L928,1020L919,1019L913,1022L911,1025L911,1029L909,1031L909,1036L915,1043L916,1047L913,1048L905,1046L903,1039L899,1036L889,1035L883,1038L880,1047L873,1047L865,1052L863,1061L866,1068L871,1070L872,1072L869,1075L859,1078L838,1077L823,1083L816,1083L803,1073L797,1071L794,1068L789,1067L774,1068L759,1077L756,1077L723,1056L712,1045L694,1035L678,1035L666,1041L637,1062L625,1058L604,1042L592,1036L578,1035L561,1043L562,1046L565,1046L577,1039L584,1038L594,1040L623,1061L629,1063L630,1067L623,1070L592,1050L576,1049L569,1052L567,1054L567,1057L577,1052L590,1052L616,1069L618,1074L611,1077L602,1071L600,1068L591,1063L578,1063L577,1065L590,1066L606,1077L607,1079L601,1083L600,1086L636,1067L667,1044L677,1039L690,1038L698,1040L722,1056L731,1065L750,1078L752,1081L748,1083L743,1083L729,1073L722,1070L713,1061L700,1052L689,1048L683,1048L675,1050L645,1071L611,1090L609,1094L617,1091L638,1079L669,1057L682,1051L691,1051L704,1058L741,1086L733,1090L698,1065L692,1062L681,1062L670,1067L666,1071L636,1089L632,1093L621,1098L621,1100L625,1100L630,1096L634,1095L661,1077L665,1076L673,1069L682,1065L690,1065L699,1069L718,1084L755,1107L781,1118L785,1123L610,1122L610,1112L608,1106L589,1105L588,1092L571,1091L570,1072L556,1071L555,1055L539,1053L540,451L556,451L558,434L569,434L571,432L572,415L588,415L590,413L591,400L610,399L610,383L612,381L946,380L953,382L954,399L973,400L974,414L991,415L992,432L994,434L1003,433L1007,435L1009,450L1023,451L1023,1054L1014,1055L1014,1057L1026,1058L1028,1056L1027,484L1025,449L1010,448L1010,436L1012,434L1023,435L1025,433L1025,411L1009,410L1010,400L1025,399L1024,381L1006,382L1004,396L995,395L994,380L971,380L970,395L957,394L956,378L608,378L606,380L607,386L605,396L593,395L592,382L586,383L590,384L590,395L588,397L584,396L583,392L580,393L578,397L571,396L570,383L568,383L567,397L557,396L557,386L554,382L550,383L555,384L553,397L541,396Z M572,1110L579,1111L580,1114L583,1113L585,1110L589,1111L589,1120L587,1122L571,1121Z M990,1109L992,1112L992,1120L990,1122L976,1122L974,1120L975,1110L983,1114L986,1109Z M1020,1108L1022,1110L1021,1122L1009,1121L1010,1109Z M542,1108L553,1110L553,1120L551,1122L542,1121L540,1119L540,1110Z M978,1096L992,1098L990,1106L977,1105Z M572,1096L586,1097L585,1105L571,1105Z M997,1095L1004,1095L1006,1097L1005,1105L996,1105Z M558,1095L567,1096L567,1104L565,1106L557,1104Z M997,1076L1007,1077L1006,1090L1004,1092L996,1091Z M557,1076L567,1077L566,1092L557,1091Z M1012,1075L1022,1076L1022,1090L1020,1092L1009,1091Z M542,1075L550,1075L552,1077L550,1082L551,1085L554,1086L553,1092L543,1092L541,1090Z M907,1070L913,1076L913,1083L911,1085L908,1085L906,1089L901,1089L895,1084L896,1077L902,1076L905,1070Z M876,1072L880,1071L883,1076L887,1076L888,1078L892,1079L891,1084L887,1088L881,1089L873,1083L873,1076Z M739,1091L748,1087L768,1074L779,1070L788,1070L797,1073L847,1109L861,1117L864,1117L868,1120L868,1123L829,1123L825,1121L823,1123L795,1123L784,1116L766,1109L765,1105L776,1098L786,1097L797,1102L816,1117L818,1114L801,1101L788,1094L776,1095L761,1104L757,1104L752,1101L752,1098L775,1085L786,1083L801,1090L839,1117L842,1115L831,1109L802,1088L800,1085L789,1081L777,1081L771,1083L747,1098L739,1094Z M909,1050L915,1052L919,1060L918,1064L913,1068L906,1067L908,1062L902,1055Z M874,1050L879,1050L884,1055L879,1062L880,1068L873,1068L867,1062L867,1058L870,1052Z M952,1048L958,1053L959,1059L957,1064L948,1068L940,1063L939,1057L942,1054L945,1055L946,1053L949,1053L949,1048Z M924,1045L929,1047L929,1051L932,1052L932,1054L937,1054L936,1061L930,1066L922,1065L922,1055L919,1051L920,1047Z M898,1040L902,1046L902,1050L898,1053L896,1051L890,1051L889,1054L886,1054L884,1051L884,1044L888,1040Z M950,1031L954,1028L963,1029L966,1033L965,1036L967,1038L965,1044L959,1047L951,1045L951,1042L955,1040L952,1035L949,1034Z M919,1023L925,1023L930,1027L928,1032L926,1033L926,1042L922,1043L918,1041L913,1035L915,1026Z M936,1014L939,1013L947,1015L950,1020L950,1025L947,1030L944,1030L944,1027L933,1028L932,1019Z M558,415L567,416L566,430L556,429Z M1010,414L1022,415L1021,430L1011,429L1012,424L1010,421Z M997,414L1006,415L1006,430L996,429Z M542,415L546,414L554,416L551,425L553,426L552,431L541,430Z M997,400L1004,400L1006,402L1005,410L1001,411L996,409Z M560,400L567,402L566,411L557,410L558,402Z M571,402L576,399L580,401L586,401L585,411L571,410Z M1010,383L1020,383L1022,385L1021,397L1014,397L1009,395Z M976,383L991,384L991,396L989,397L991,401L990,410L977,409L978,399L985,399L983,393L976,396L974,394L974,385Z M135,457L129,474L129,487L140,526L141,535L153,576L157,596L161,606L163,619L171,644L179,680L181,683L186,706L189,713L190,722L199,752L201,764L203,767L208,791L210,794L219,834L232,879L234,892L249,945L251,958L254,964L255,973L265,1007L273,1043L275,1046L278,1063L281,1069L284,1086L287,1092L287,1098L291,1109L295,1128L297,1131L305,1168L310,1180L315,1187L323,1194L325,1194L328,1197L339,1200L357,1200L367,1196L394,1190L417,1182L424,1182L430,1179L442,1177L447,1174L507,1159L528,1152L532,1152L536,1155L543,1157L898,1156L935,1157L939,1159L945,1159L948,1162L963,1164L965,1166L998,1174L1004,1177L1014,1178L1020,1181L1025,1181L1043,1187L1060,1190L1065,1193L1089,1198L1100,1202L1105,1202L1108,1204L1128,1208L1145,1214L1151,1214L1179,1223L1192,1225L1195,1227L1201,1227L1203,1229L1215,1232L1230,1231L1232,1229L1236,1229L1246,1224L1257,1212L1263,1198L1265,1183L1267,1180L1270,1163L1273,1157L1273,1152L1281,1124L1282,1115L1285,1110L1286,1099L1296,1063L1298,1050L1301,1043L1303,1030L1307,1020L1308,1010L1312,999L1314,986L1317,980L1317,974L1323,952L1323,947L1327,936L1341,878L1342,867L1350,842L1350,836L1352,833L1352,828L1366,774L1369,756L1373,745L1381,705L1383,702L1390,667L1399,635L1403,612L1411,584L1412,575L1415,568L1419,546L1421,543L1425,523L1425,511L1420,495L1416,489L1407,481L1396,475L1359,466L1353,463L1341,461L1339,459L1331,458L1328,456L1292,447L1289,445L1285,445L1272,440L1268,440L1174,412L1131,401L1125,398L1109,395L1103,392L1054,379L1049,369L1040,358L1031,352L1019,348L976,347L673,349L669,344L663,322L642,326L633,318L624,314L591,314L578,317L575,319L560,322L538,330L527,332L497,342L466,350L463,352L452,354L446,357L394,371L391,373L380,375L370,379L338,387L332,390L317,393L314,395L299,398L293,401L282,403L258,411L243,414L219,422L162,437L147,444Z M1220,1184L1230,1186L1230,1194L1226,1198L1219,1197L1217,1195Z M1186,1180L1189,1177L1192,1181L1195,1181L1197,1178L1202,1179L1200,1190L1197,1191L1184,1187Z M1211,1167L1217,1168L1219,1170L1217,1178L1212,1178L1208,1176L1209,1169Z M1194,1163L1206,1166L1204,1175L1199,1175L1191,1172Z M1027,1153L1030,1154L1030,1159L1026,1159Z M349,1153L351,1155L352,1160L351,1166L345,1168L340,1167L338,1160L339,1155Z M1230,1152L1239,1154L1235,1169L1225,1166L1226,1161L1229,1160L1228,1154Z M1223,1150L1225,1154L1221,1164L1217,1165L1212,1163L1214,1152L1216,1150Z M385,1147L385,1157L373,1160L369,1158L367,1150L369,1148L375,1148L377,1151L379,1151L382,1146Z M360,1138L361,1147L352,1148L350,1142L351,1139L357,1137Z M378,1134L380,1141L378,1143L373,1143L369,1145L365,1144L364,1135L376,1132Z M339,1122L341,1124L341,1130L344,1131L343,1137L336,1139L332,1136L331,1124Z M346,1120L355,1120L358,1130L357,1133L352,1135L348,1134L347,1128L344,1124Z M507,1088L506,1097L486,1098L483,1095L491,1086L496,1084L500,1084Z M506,1081L496,1081L490,1083L478,1096L474,1096L469,1093L485,1077L493,1073L499,1073L503,1075Z M506,1066L505,1071L496,1070L486,1073L475,1082L465,1093L458,1092L457,1090L477,1070L487,1063L499,1062L503,1063Z M1376,538L1387,541L1384,554L1380,555L1374,553L1374,551L1377,548L1377,546L1374,543L1374,540Z M1363,534L1370,536L1370,551L1360,548Z M1366,521L1373,522L1374,526L1372,532L1365,531L1364,527Z M1349,516L1360,518L1362,521L1360,527L1356,528L1349,526L1347,524Z M1384,508L1393,511L1394,515L1391,523L1381,521L1380,517L1382,510Z M176,501L182,502L182,517L174,518L172,516L170,503Z M1349,501L1352,499L1364,502L1366,504L1364,513L1362,515L1358,515L1354,508L1351,511L1347,510Z M195,498L197,512L188,515L186,513L186,499L190,497Z M190,483L192,485L193,492L187,495L184,494L182,486L184,484Z M210,479L210,488L200,491L197,490L195,482L197,480L206,478Z M174,471L177,482L175,484L168,486L164,485L162,473L171,470Z M209,463L211,469L210,473L202,471L200,477L193,476L191,468L192,465L205,461Z M1056,414L1081,420L1115,431L1217,459L1223,462L1235,464L1262,473L1266,473L1329,491L1330,494L1327,508L1330,510L1341,512L1345,515L1342,524L1343,528L1354,530L1359,533L1355,550L1357,552L1368,555L1366,565L1367,572L1377,574L1381,577L1369,631L1366,639L1365,648L1361,660L1360,669L1356,681L1343,742L1339,753L1333,785L1330,792L1305,902L1302,909L1294,948L1291,955L1290,964L1248,1132L1245,1135L1236,1132L1230,1133L1227,1146L1212,1146L1209,1159L1206,1162L1197,1159L1190,1160L1187,1170L1183,1171L1171,1167L1168,1168L1165,1180L1161,1183L1062,1157L1057,1154L1053,1154L1050,1151L1043,1151L1038,1148L1040,1146L1044,1146L1044,1142L1048,1140L1048,1137L1052,1131L1055,1118L1057,1116L1057,1112L1055,1111L1056,1103L1098,1083L1109,1084L1121,1097L1122,1100L1128,1105L1128,1110L1116,1115L1106,1117L1101,1120L1070,1127L1064,1130L1064,1132L1107,1121L1124,1115L1165,1095L1174,1095L1178,1097L1189,1108L1198,1120L1214,1134L1218,1134L1210,1127L1211,1124L1227,1118L1232,1118L1237,1121L1239,1120L1233,1115L1227,1115L1206,1123L1194,1111L1186,1100L1177,1093L1172,1092L1159,1094L1137,1106L1133,1106L1123,1096L1120,1091L1112,1083L1108,1081L1099,1080L1066,1095L1060,1093L1055,1088L1055,838L1062,832L1061,821L1063,819L1062,811L1056,808L1054,538Z M1056,391L1061,391L1075,396L1093,400L1099,403L1107,404L1113,407L1132,411L1155,419L1167,421L1170,423L1202,431L1212,435L1244,443L1247,445L1255,446L1275,453L1279,453L1285,456L1300,459L1327,468L1394,486L1402,491L1409,498L1415,512L1415,523L1388,633L1386,647L1384,650L1376,690L1373,697L1370,715L1368,718L1360,758L1357,764L1354,783L1352,786L1350,799L1338,845L1338,850L1334,861L1327,896L1325,899L1321,922L1319,925L1316,942L1313,949L1311,963L1307,973L1305,988L1297,1015L1295,1028L1292,1034L1290,1048L1285,1064L1283,1077L1280,1084L1278,1098L1273,1113L1272,1123L1268,1133L1268,1138L1259,1169L1254,1194L1247,1208L1237,1217L1227,1221L1210,1220L1067,1181L1055,1179L1052,1177L1036,1174L1029,1170L1023,1170L1021,1168L1007,1166L1000,1159L1003,1158L1016,1161L1011,1161L1017,1162L1018,1159L1022,1159L1026,1163L1023,1163L1024,1167L1027,1166L1033,1155L1042,1155L1160,1187L1167,1186L1169,1176L1171,1172L1182,1175L1182,1180L1179,1187L1180,1190L1198,1195L1203,1194L1207,1180L1214,1181L1216,1184L1213,1192L1213,1199L1227,1203L1231,1202L1235,1184L1232,1182L1224,1181L1221,1178L1223,1172L1228,1171L1239,1173L1243,1159L1243,1151L1232,1148L1231,1144L1234,1136L1239,1136L1247,1139L1251,1136L1253,1123L1257,1112L1258,1102L1262,1092L1275,1040L1276,1031L1279,1024L1281,1011L1285,1000L1292,967L1295,960L1297,946L1300,939L1314,875L1317,868L1324,833L1335,792L1339,770L1362,677L1363,667L1368,651L1376,612L1385,575L1383,573L1373,571L1369,568L1373,557L1386,560L1389,552L1391,538L1382,536L1378,534L1377,531L1379,524L1393,528L1395,526L1398,514L1397,509L1381,506L1379,508L1376,519L1373,519L1368,517L1367,514L1370,505L1369,502L1350,495L1347,495L1345,503L1341,508L1334,507L1331,503L1334,494L1334,489L1195,450L1192,448L1157,439L1147,435L1139,434L1126,429L1097,422L1084,417L1059,411L1055,409L1054,393Z M1028,363L1035,369L1041,377L1045,390L1045,1116L1040,1130L1029,1141L1016,1146L545,1146L531,1140L522,1130L518,1121L517,1114L518,387L524,373L535,363L548,359L995,358L1017,359Z M616,345L615,349L606,346Z M653,334L657,335L659,343L657,348L650,341L649,337Z M617,322L629,328L635,334L641,345L640,349L623,349L621,347L619,340L603,343L599,346L598,349L543,349L528,355L513,368L485,375L475,379L467,380L454,385L411,396L380,406L372,407L359,412L351,413L314,425L231,448L224,451L227,463L226,468L216,471L214,469L211,457L207,457L187,463L187,469L190,478L188,480L180,481L177,469L169,468L167,470L159,472L158,474L162,490L167,490L174,487L178,488L178,497L165,501L170,522L175,523L179,521L185,521L187,532L182,536L192,534L189,522L190,518L202,514L202,509L198,496L200,494L216,490L217,487L214,480L215,475L232,470L228,456L229,452L315,427L327,425L372,411L380,410L390,406L429,396L432,394L443,392L509,372L512,374L508,385L508,658L506,921L504,921L500,917L494,918L494,920L503,927L504,932L507,933L507,936L501,940L502,944L506,945L507,968L507,1038L505,1061L492,1059L481,1063L460,1084L452,1090L430,1083L422,1079L408,1079L396,1085L375,1106L372,1107L364,1104L359,1104L359,1106L363,1106L368,1109L369,1112L372,1112L401,1085L414,1081L424,1083L437,1089L460,1096L488,1101L506,1102L503,1109L466,1105L440,1098L421,1090L410,1090L401,1095L382,1114L382,1116L384,1116L403,1097L415,1092L462,1107L488,1111L498,1111L505,1113L505,1121L507,1123L506,1126L503,1125L502,1122L499,1123L501,1124L500,1127L435,1144L410,1152L406,1149L403,1137L396,1137L389,1140L383,1140L380,1129L377,1128L368,1131L361,1130L358,1116L355,1114L345,1117L342,1116L337,1103L325,1105L321,1103L292,986L285,964L282,947L279,941L276,924L274,921L260,862L258,859L254,839L252,836L249,820L241,794L238,777L236,774L233,758L230,751L227,734L225,732L222,716L219,709L212,676L208,666L200,630L198,627L190,592L186,582L186,577L176,542L178,536L173,538L173,544L180,572L183,579L192,619L205,664L208,681L211,688L219,723L221,726L224,742L227,749L229,762L232,769L235,785L237,788L240,804L254,853L267,909L269,912L273,932L281,958L284,975L292,1001L293,1010L296,1017L299,1033L303,1043L304,1052L314,1086L316,1099L322,1108L332,1105L336,1106L338,1115L337,1119L325,1122L331,1143L333,1144L342,1141L345,1141L347,1143L347,1151L336,1153L334,1155L337,1170L339,1172L344,1172L356,1168L354,1153L359,1150L363,1151L367,1165L391,1159L389,1144L397,1141L401,1144L404,1156L417,1154L487,1134L501,1132L504,1130L511,1136L515,1137L517,1143L514,1147L417,1172L389,1181L380,1182L359,1189L340,1190L329,1185L322,1179L318,1173L314,1163L309,1141L307,1138L304,1120L296,1093L292,1073L290,1070L283,1038L279,1027L272,994L268,983L260,948L258,945L255,928L252,922L250,909L241,879L238,863L236,860L234,847L219,794L216,777L214,774L205,735L203,732L200,716L197,709L196,700L192,690L183,650L181,647L179,635L168,598L167,589L165,586L162,570L160,567L157,551L154,544L151,527L149,524L146,508L140,488L141,470L145,461L152,454L165,447L190,441L204,436L212,435L218,432L226,431L295,410L307,408L334,399L384,386L392,382L397,382L418,375L423,375L439,369L443,369L463,362L499,353L512,348L533,343L535,341L554,337L595,324L605,322Z" fill="#dbb090" fill-rule="evenodd" stroke="none"/></svg>';
/* Fundo artístico (mobile 9:16+ / desktop 16:9+), desligável nas Configurações */
const HZ_BG_MOBILE='https://i.ibb.co/hJ8yxk58/mobile.webp';
const HZ_BG_DESKTOP='https://i.ibb.co/DHLHG5hG/descktop.webp';
const css=document.createElement('style');css.id='hz-practice-css';css.textContent=`
.hzp-card,.hzp-title,.hzp-waves{max-width:640px;margin-left:auto;margin-right:auto}.hzp-card{margin-bottom:14px}
#hz-sp-host{background:var(--lb)}
.hzp-waves{color:var(--ac);margin:2px 0 0}
.hzp-title{text-align:center;font-family:var(--rf);font-size:22px;font-weight:800;color:#efe7d6;letter-spacing:.14em;margin:2px 0 18px}
.hzp-card{display:grid;grid-template-columns:84px 1fr 34px;align-items:center;gap:14px;border:1px solid rgba(var(--ac-rgb),.28);background:linear-gradient(180deg,rgba(26,22,17,.85),rgba(15,13,10,.9));border-radius:18px;padding:16px 16px;margin-bottom:14px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:border-color .18s,transform .12s}
.hzp-card:active{transform:scale(.985)}
.hzp-card:hover{border-color:rgba(var(--ac-rgb),.55)}
.hzp-ico{color:var(--ac);width:84px;height:84px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 6px rgba(var(--ac-rgb),.28))}
.hzp-ico svg{width:100%;height:100%}
.hzp-lbl{font-family:var(--rf);font-size:16.5px;font-weight:750;color:#ece3d2;line-height:1.35}
.hzp-sub{display:inline-flex;align-items:center;gap:7px;margin-top:9px;border:1px solid rgba(var(--ac-rgb),.35);border-radius:999px;padding:4px 12px;color:var(--ac);font-size:13.5px;font-weight:850;font-variant-numeric:tabular-nums}
.hzp-chev{width:34px;height:34px;border:1px solid rgba(var(--ac-rgb),.4);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ac)}
#sp{background:var(--lb)}
#sp .bc::-webkit-scrollbar{width:0}
#mo-tonegame .ms{max-width:760px;height:min(92vh,860px);max-height:92vh;padding:10px 10px calc(10px + var(--sb))}
#hz-game-frame{flex:1;width:100%;border:0;border-radius:14px;background:#000;min-height:0}
html{--hzvis:.5}
html.hz-bgart #sl,html.hz-bgart #sw,html.hz-bgart #sd,html.hz-bgart #ss,html.hz-bgart #sx,html.hz-bgart #sp{background:linear-gradient(180deg,rgba(0,0,0,calc(.92 - var(--hzvis)*.58)),rgba(0,0,0,calc(1 - var(--hzvis)*.42))),url('${HZ_BG_MOBILE}') center top/cover no-repeat!important}
@media(min-width:760px){html.hz-bgart #sl,html.hz-bgart #sw,html.hz-bgart #sd,html.hz-bgart #ss,html.hz-bgart #sx,html.hz-bgart #sp{background:linear-gradient(180deg,rgba(0,0,0,calc(.92 - var(--hzvis)*.58)),rgba(0,0,0,calc(1 - var(--hzvis)*.42))),url('${HZ_BG_DESKTOP}') center/cover no-repeat fixed!important}}
#sp .hzp-card{backdrop-filter:none;-webkit-backdrop-filter:none}
#hz-bg-op-row input[type=range]{width:100%;accent-color:var(--ac)}
`;document.head.appendChild(css);
/* Modais */
function hzEnsureModals(){
 if(document.getElementById('mo-tonegame'))return;
 document.body.insertAdjacentHTML('beforeend',`
 <div class="mo" id="mo-tonegame"><div class="ms">
   <div class="mbar"><div class="mhd"></div><button class="mx" type="button" id="hzg-close" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
   <div id="hz-game-slot" style="display:flex;flex:1;min-height:0"></div>
 </div></div>`);
 document.getElementById('hzg-close').onclick=hzCloseGame;
}
function hzBestScore(){try{return Number(localStorage.getItem('pinyinToneLab.best.v7')||0);}catch{return 0;}}
function hzEnsureScreen(){
 if(document.getElementById('sp'))return;
 const anchor=document.getElementById('ss')||document.getElementById('sx')||document.getElementById('sd');
 if(!anchor||!anchor.parentNode)return;
 const sec=document.createElement('div');sec.id='sp';sec.className='screen';
 sec.innerHTML=`<div class="bc" id="hz-sp-hub" style="flex:1;overflow-y:auto;padding:calc(var(--st) + 26px) 18px 26px">
   <div class="hzp-waves">${SVG_WAVES}</div>
   <div class="hzp-title">Prática</div>
   <div class="hzp-card" id="hzp-game"><div class="hzp-ico">${SVG_TONECARDS}</div><div class="hzp-lbl">Pratique a Audição dos Tons<br><span class="hzp-sub"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"/></svg><span id="hzp-best">0</span></span></div><div class="hzp-chev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg></div></div>
 </div><div id="hz-sp-host" style="flex:1;display:none;min-height:0;background:var(--lb)"></div><nav class="bnav" id="prac-nav"></nav>`;
 anchor.parentNode.insertBefore(sec,anchor.nextSibling);
 hzSyncNav();
 document.getElementById('hzp-game').addEventListener('click',()=>{hzShowGame();});
}
let hzActivePracticeActivity='';
let hzPracticeCleanup=null;
function hzUnmountPracticeActivity(){
  const host=document.getElementById('hz-sp-host');
  try{if(typeof hzPracticeCleanup==='function')hzPracticeCleanup();}catch(e){}
  hzPracticeCleanup=null;hzActivePracticeActivity='';
  if(host){
    const frame=host.querySelector('#hz-sp-frame');
    if(frame){try{frame.src='about:blank';}catch(e){}}
    host.replaceChildren();
    host.removeAttribute('data-practice-activity');
  }
  try{hzStopCelebrate();}catch(e){}
}
function hzMountPracticeActivity(activity,mount){
  const hub=document.getElementById('hz-sp-hub'),host=document.getElementById('hz-sp-host');
  if(!hub||!host||typeof mount!=='function')return null;
  hzUnmountPracticeActivity();
  const root=document.createElement('div');
  root.className='hz-practice-activity-root';
  root.dataset.practiceActivity=String(activity||'');
  host.replaceChildren(root);host.dataset.practiceActivity=String(activity||'');
  hub.style.display='none';host.style.display='flex';
  hzActivePracticeActivity=String(activity||'');
  const cleanup=mount(root);
  hzPracticeCleanup=typeof cleanup==='function'?cleanup:null;
  requestAnimationFrame(()=>root.classList.add('is-mounted'));
  window.dispatchEvent(new CustomEvent('hz:practice-activity-change',{detail:{activity:hzActivePracticeActivity}}));
  return root;
}
window.hzMountPracticeActivity=hzMountPracticeActivity;
window.hzUnmountPracticeActivity=hzUnmountPracticeActivity;
window.hzGetActivePracticeActivity=()=>hzActivePracticeActivity;
function hzShowGame(){
  hzMountPracticeActivity('tone-recognition',root=>{
    const fr=document.createElement('iframe');fr.id='hz-sp-frame';
    fr.className='tone-recognition-game';
    fr.style.cssText='flex:1;width:100%;border:0;background:transparent;min-height:0';
    const a=hzAccent();fr.dataset.ac=a.ac;fr.dataset.acrgb=a.rgb;fr.dataset.lang=(window.hzLang?window.hzLang():'pt');
    fr.setAttribute('allow','autoplay');fr.srcdoc=hzGameDoc();root.appendChild(fr);
    return()=>{try{fr.src='about:blank';}catch(e){}fr.remove();};
  });
}
window.hzBackToHub=function(){
  hzUnmountPracticeActivity();
  const hub=document.getElementById('hz-sp-hub'),host=document.getElementById('hz-sp-host');
  if(host)host.style.display='none';
  if(hub){hub.style.display='block';const b=document.getElementById('hzp-best');if(b)b.textContent=hzBestScore().toLocaleString('pt-BR');}
};
function hzUnloadGame(){hzUnmountPracticeActivity();}
function hzSyncNav(){
 const pn=document.getElementById('prac-nav');
 if(pn&&typeof v29NavHTML==='function'&&!pn.querySelector('.ni'))pn.innerHTML=v29NavHTML('practice');
}
window.hzOpenPractice=function(){
 hzEnsureModals();hzEnsureScreen();
 window.hzBackToHub();
 const pn=document.getElementById('prac-nav');
 if(pn&&typeof v29NavHTML==='function')pn.innerHTML=v29NavHTML('practice');
 showScreen('sp');
 document.querySelectorAll('.ni[data-tab]').forEach(n=>n.classList.remove('on'));
 document.querySelectorAll('.ni[data-tab="practice"]').forEach(n=>n.classList.add('on'));
};
const _hzPrevShowScreen=window.showScreen;
window.showScreen=function(id){
 if(id!=='sp')hzUnloadGame();
 return _hzPrevShowScreen(id);
};
function hzOpenGame(){
 hzEnsureModals();
 const slot=document.getElementById('hz-game-slot');
 slot.innerHTML='';
 const fr=document.createElement('iframe');fr.id='hz-game-frame';
 const a=hzAccent();fr.dataset.ac=a.ac;fr.dataset.acrgb=a.rgb;fr.dataset.lang=(window.hzLang?window.hzLang():'pt');
 fr.setAttribute('allow','autoplay');
 fr.srcdoc=hzGameDoc();
 slot.appendChild(fr);
 document.getElementById('mo-tonegame').classList.add('open');
}
function hzCloseGame(){
 const slot=document.getElementById('hz-game-slot');if(slot)slot.innerHTML='';
 document.getElementById('mo-tonegame').classList.remove('open');
 const b=document.getElementById('hzp-best');if(b)b.textContent=hzBestScore().toLocaleString('pt-BR');
}
/* Toggle do fundo nas Configurações */
function hzBgApply(){
 const on=localStorage.getItem('hzBgArt')!=='0';
 document.documentElement.classList.toggle('hz-bgart',on);
 const vis=Math.min(100,Math.max(10,parseInt(localStorage.getItem('hzBgVis')||'100',10)))/100;
 document.documentElement.style.setProperty('--hzvis',String(vis));
 const t=document.getElementById('hz-bg-toggle');if(t){t.textContent=on?'Ativado':'Desativado';t.classList.toggle('on',on);}
 const r=document.getElementById('hz-bg-op-row');if(r)r.style.opacity=on?'1':'0.4';
 const lb=document.getElementById('hz-bg-op-val');if(lb)lb.textContent=Math.round(vis*100)+'%';
}
function hzInstallSetting(){
 if(document.getElementById('hz-bg-row'))return;
 const sc=document.querySelector('#ss .sc');if(!sc)return;
 sc.insertAdjacentHTML('beforeend',`<div class="card" id="hz-bg-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px"><div><div style="font-weight:800;color:#eee">Fundo artístico</div><div class="ssub" style="color:#8a8a8a;font-size:12px;margin-top:3px">Paisagem noturna nas telas do aplicativo (o leitor não é afetado).</div></div><button class="lib-chip" id="hz-bg-toggle" style="flex-shrink:0"></button></div>`);
 document.getElementById('hz-bg-toggle').onclick=()=>{const on=localStorage.getItem('hzBgArt')!=='0';localStorage.setItem('hzBgArt',on?'0':'1');hzBgApply();};
 hzBgApply();
 sc.insertAdjacentHTML('beforeend',`<div class="card" id="hz-bg-op-row" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;color:#eee">Opacidade do fundo</div><div id="hz-bg-op-val" style="color:var(--ac);font-weight:850;font-size:13px">50%</div></div><div class="ssub" style="color:#8a8a8a;font-size:12px;margin:3px 0 10px">O quanto a paisagem aparece atrás do conteúdo.</div><input type="range" min="10" max="100" step="5" id="hz-bg-op"></div>`);
 const sl=document.getElementById('hz-bg-op');
 sl.value=Math.min(100,Math.max(10,parseInt(localStorage.getItem('hzBgVis')||'100',10)));
 sl.oninput=()=>{localStorage.setItem('hzBgVis',String(sl.value));hzBgApply();};
 hzBgApply();
}
document.addEventListener('selectionchange',()=>{
  try{
    if(!document.body.classList.contains('reader-fullscreen'))return;
    const sel=window.getSelection();
    const has=sel&&!sel.isCollapsed&&String(sel).trim().length>0&&(()=>{const n=sel.anchorNode;return n&&document.getElementById('sr')&&document.getElementById('sr').contains(n.nodeType===1?n:n.parentNode);})();
    document.body.classList.toggle('hz-selecting',!!has);
  }catch(e){}
});
document.addEventListener('click',e=>{
  const tr=e.target.closest&&e.target.closest('#sel-translate');
  const rd=e.target.closest&&e.target.closest('#sel-read');
  if(tr)setTimeout(()=>{document.body.classList.remove('hz-selecting');try{window.getSelection().removeAllRanges();}catch(err){}},650);
  if(rd)setTimeout(()=>{document.body.classList.remove('hz-selecting');try{window.getSelection().removeAllRanges();}catch(err){}},900);
},true);
function hzBoot(){try{hzEnsureModals();}catch(e){}try{hzEnsureScreen();}catch(e){}try{hzSyncNav();}catch(e){}try{hzInstallSetting();}catch(e){}try{hzBgApply();}catch(e){}}
setTimeout(hzBoot,600);setTimeout(hzBoot,2000);setTimeout(hzBoot,4000);
})();


/* ===== hz-settings-i18n-v49 ===== */
/* v4.9: internacionalização central + reorganização das Configurações (Sr. Hell) */
(function(){
'use strict';
const HZ_APP={name:'漢讀 · Hanzi Reader',version:'v4.9',author:'Sr. Hell'};
const HZ_I18N={
 pt:{reading:'Leitura',words:'Flash Cards',dict:'Dicionário',sources:'Fontes',practice:'Prática',music:'Música',
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
 en:{reading:'Reading',words:'Flash Cards',dict:'Dictionary',sources:'Sources',practice:'Practice',music:'Music',
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
     searchPh:'字 / 词 / phrase'},
 es:{reading:'Lectura',words:'Flash Cards',dict:'Diccionario',sources:'Fuentes',practice:'Práctica',music:'Música',
     settings:'Ajustes',back:'Volver',stats:'Estadísticas',profile:'Mi perfil',guest:'Invitado',
     sec1:'Lector y lectura',sec2:'Idioma',sec3:'Tema y apariencia',sec4:'Ayuda y acerca de',sec5:'Almacenamiento y avanzado',
     voiceRow:'Voz y lectura en voz alta',voiceSub:'Voz, velocidad, tono y estilo de la lectura',
     v2Row:'Voz Natural v2',v2Sub:'Valor predeterminado. Desactívala para usar la versión clásica.',
     langRow:'Idioma de la interfaz',langSub:'Automático sigue el idioma del navegador',
     langAuto:'Automático',helpRow:'Guía de la aplicación',helpSub:'Cómo usar lectura, diccionario, fuentes y práctica',
     author:'Autor',version:'Versión',
     dictTabDefs:'DICC',dictTabWords:'PALABRAS',dictTabSents:'FRASES',
     flashDecks:'Mazos',flashLevels:'Mazos por nivel',flashTitle:'Flashcards',
     dictEmptyT:'Busca una palabra o un ideograma.',dictEmptyS:'El diccionario usa definiciones, palabras relacionadas, ejemplos y audio natural cuando está disponible.',
     searchPh:'字 / 词 / frase'}
};
function hzLang(){
  const saved=localStorage.getItem('hzLang');
  if(saved==='pt'||saved==='en'||saved==='es')return saved;
  // Detecção automática do navegador: usada somente enquanto o usuário não
  // escolheu manualmente um idioma nas Configurações.
  const nav=(navigator.language||'pt').toLowerCase();
  if(nav.startsWith('en'))return 'en';
  if(nav.startsWith('es'))return 'es';
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
  hzApplyLangMap();
  try{hzSyncLangAccordion();}catch(e){}
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
  // G2 — idioma (sanfona acessível: toque, mouse e teclado)
  g2.insertAdjacentHTML('beforeend',hzLangAccordionHtml());
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
  hzWireLangAccordion();
}
const HZ_LANG_NAMES={pt:'Português',en:'English',es:'Español'};
function hzLangAccordionHtml(){
  const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>';
  const opts=['pt','en','es'].map(code=>'<button type="button" class="hz-lang-opt" role="option" data-lang="'+code+'" aria-selected="false">'+HZ_LANG_NAMES[code]+check+'</button>').join('');
  return '<div class="srow hz-lang-acc" id="hz-lang-acc">'
    +'<button type="button" class="hz-lang-head" id="hz-lang-head" aria-expanded="false" aria-controls="hz-lang-list">'
    +'<span><span class="slbl">'+T('langRow')+'</span><span class="ssub" id="hz-lang-current"></span></span>'
    +'<svg class="hz-lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>'
    +'<div class="hz-lang-list" id="hz-lang-list" role="listbox" aria-label="'+T('langRow')+'"><div>'+opts+'</div></div></div>';
}
function hzSyncLangAccordion(){
  const acc=document.getElementById('hz-lang-acc');if(!acc)return;
  const saved=localStorage.getItem('hzLang');
  const active=hzLang();
  const head=acc.querySelector('.hz-lang-head .slbl');if(head)head.textContent=T('langRow');
  const cur=document.getElementById('hz-lang-current');
  if(cur)cur.textContent=saved?HZ_LANG_NAMES[saved]:(T('langAuto')+' · '+HZ_LANG_NAMES[active]);
  acc.querySelectorAll('.hz-lang-opt').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.lang===active)));
  const list=document.getElementById('hz-lang-list');if(list)list.setAttribute('aria-label',T('langRow'));
}
function hzWireLangAccordion(){
  const acc=document.getElementById('hz-lang-acc');if(!acc||acc.dataset.wired==='1')return;acc.dataset.wired='1';
  const head=document.getElementById('hz-lang-head');
  const setOpen=open=>{acc.classList.toggle('open',open);head.setAttribute('aria-expanded',String(open));if(open)acc.querySelector('.hz-lang-opt[aria-selected="true"]')?.focus();};
  head.addEventListener('click',()=>setOpen(!acc.classList.contains('open')));
  acc.addEventListener('keydown',e=>{
    const opts=[...acc.querySelectorAll('.hz-lang-opt')];
    if(e.key==='Escape'){setOpen(false);head.focus();return;}
    if(!opts.length||!opts.includes(document.activeElement))return;
    const i=opts.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){e.preventDefault();opts[(i+1)%opts.length].focus();}
    if(e.key==='ArrowUp'){e.preventDefault();opts[(i-1+opts.length)%opts.length].focus();}
  });
  acc.querySelectorAll('.hz-lang-opt').forEach(btn=>btn.addEventListener('click',()=>{
    localStorage.setItem('hzLang',btn.dataset.lang);        // escolha manual persiste
    setOpen(false);                                          // fecha após a seleção
    hzTranslateChrome();hzRewriteHelp();hzRetitleSections();hzSyncLangAccordion();
    try{document.dispatchEvent(new CustomEvent('hz:lang-change',{detail:{lang:btn.dataset.lang}}));}catch(e){}
  }));
  hzSyncLangAccordion();
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
  const L=hzLang();const pt=L==='pt';
  const esDocs={
   comecar:'<h2>Empezar</h2><p><b>Lectura:</b> pega un texto en chino o un enlace — la app extrae, limpia y monta la lectura con pinyin por nivel HSK.</p><p><b>Fuentes:</b> importa lecturas listas con un toque.</p><p>Toca cualquier palabra para ver pinyin, traducción y guardarla en el vocabulario.</p>',
   leitor:'<h2>Lector</h2><p>Los colores del pinyin indican la dificultad: verde/teal (HSK 1–2), azul/violeta (HSK 3–4), magenta/rojo (HSK 5–6) y ámbar/carmín/vino (HSK 7–9).</p><p>Selecciona un fragmento para <b>Traducir</b> o <b>Leer</b> en voz alta. El botón cuadrado oculta las barras para una lectura inmersiva.</p>',
   estudo:'<h2>Palabras y Diccionario</h2><p><b>Palabras:</b> repasa tu vocabulario con flashcards; al terminar hay una celebración con música.</p><p><b>Diccionario:</b> DICC trae definiciones, PALABRAS palabras compuestas, FRASES frases de ejemplo.</p>',
   pratica:'<h2>Práctica y Música</h2><p><b>Práctica:</b> actividades por habilidad, incluyendo tonos, secuencia tonal y escritura de Hanzi. Cada desafío usa recuperación activa y guarda el progreso local.</p><p><b>Música:</b> biblioteca de guzheng con reproducción, búsqueda, favoritos, aleatorio y repetición.</p>'
  };
  const docs=L==='es'?esDocs:pt?{
   comecar:'<h2>Começar</h2><p><b>Leitura:</b> cole um texto em chinês ou um link — o app extrai, limpa e monta a leitura com pinyin por nível HSK.</p><p><b>Fontes:</b> importe leituras prontas em um toque.</p><p>Toque em qualquer palavra para ver pinyin, tradução e salvar no vocabulário.</p>',
   leitor:'<h2>Leitor</h2><p>As cores do pinyin indicam a dificuldade: verde/teal (HSK 1–2), azul/violeta (HSK 3–4), magenta/vermelho (HSK 5–6) e âmbar/carmim/vinho (HSK 7–9).</p><p>Selecione um trecho para <b>Traduzir</b> ou <b>Ler</b> em voz alta. O botão quadrado oculta as barras para leitura imersiva.</p><p>Ajuste fonte, pinyin e voz em Ajustes.</p>',
   estudo:'<h2>Palavras e Dicionário</h2><p><b>Palavras:</b> revise seu vocabulário com flashcards; ao concluir, há uma celebração com música.</p><p><b>Dicionário:</b> pesquise ideogramas; DICT traz definições, WORDS palavras compostas, SENTS frases de exemplo.</p>',
   pratica:'<h2>Prática e Música</h2><p><b>Prática:</b> atividades organizadas por habilidade, incluindo tons, sequência tonal e escrita de Hanzi. Cada desafio usa recuperação ativa e registra o progresso local.</p><p><b>Música:</b> biblioteca própria de guzheng com reprodução, busca, favoritos, embaralhamento e repetição. A voz de leitura pode ser ajustada em Ajustes → Voz.</p>'
  }:{
   comecar:'<h2>Getting started</h2><p><b>Reading:</b> paste Chinese text or a link — the app extracts, cleans and builds the reading with HSK-leveled pinyin.</p><p><b>Sources:</b> one-tap ready readings.</p><p>Tap any word for pinyin, translation and to save it.</p>',
   leitor:'<h2>Reader</h2><p>Pinyin colors show difficulty: green/teal (HSK 1–2), blue/violet (HSK 3–4), magenta/red (HSK 5–6), amber/crimson/wine (HSK 7–9).</p><p>Select a passage to <b>Translate</b> or <b>Read aloud</b>. The square button hides bars for immersive reading.</p>',
   estudo:'<h2>Words & Dictionary</h2><p><b>Words:</b> review vocabulary with flashcards; finishing triggers a celebration with music.</p><p><b>Dictionary:</b> DICT for definitions, WORDS for compounds, SENTS for example sentences.</p>',
   pratica:'<h2>Practice & Music</h2><p><b>Practice:</b> skill-based activities including tones, tone sequence and Hanzi writing. Challenges use active recall and save progress locally.</p><p><b>Music:</b> a dedicated guzheng library with playback, search, favorites, shuffle and repeat. Tune the reading voice in Settings → Voice.</p>'
  };
  const tabs=L==='es'?[['comecar','Empezar'],['leitor','Lector'],['estudo','Estudio'],['pratica','Práctica']]
              :pt?[['comecar','Começar'],['leitor','Leitor'],['estudo','Estudo'],['pratica','Prática']]
                 :[['comecar','Start'],['leitor','Reader'],['estudo','Study'],['pratica','Practice']];
  modal.innerHTML='<div class="ms"><div class="mbar"><div class="mhd"></div><button class="mx" id="help-x">×</button></div><div class="mtitle">'+HZ_APP.name+'</div><div class="help-actions">'+tabs.map(([k,l],i)=>'<button data-help-tab="'+k+'"'+(i===0?' class="on"':'')+'>'+l+'</button>').join('')+'</div><iframe class="help-frame" id="help-frame"></iframe></div>';
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
const HZ_ES_MAP={'Tamanho da fonte':'Tamaño de fuente','Tamanho dos caracteres':'Tamaño de los caracteres',
 'Mostrar Pinyin':'Mostrar pinyin','Transcrição acima dos caracteres':'Transcripción sobre los caracteres',
 'Pinyin por nível':'Pinyin por nivel','Oculta pinyin das palavras já fáceis':'Oculta el pinyin de palabras fáciles',
 'Ocultar até o nível':'Ocultar hasta el nivel','Nível escolhido e inferiores ficam sem pinyin':'El nivel elegido e inferiores quedan sin pinyin',
 'Traduzir definições automaticamente':'Traducir definiciones automáticamente','Sempre em português, sem precisar tocar em PT':'Traducción automática, sin tocar PT',
 'Fundo artístico':'Fondo artístico','Paisagem noturna nas telas do aplicativo (o leitor não é afetado).':'Paisaje nocturno en las pantallas (el lector no cambia).',
 'Opacidade do fundo':'Opacidad del fondo','O quanto a paisagem aparece atrás do conteúdo.':'Cuánto se ve el paisaje detrás del contenido.',
 'Ativado':'Activado','Desativado':'Desactivado','Tema':'Tema',
 'Gerenciar armazenamento':'Gestionar almacenamiento','Ver e limpar itens salvos no navegador':'Ver y limpiar lo guardado en el navegador',
 'Limpar vocabulário':'Limpiar vocabulario','Limpar tudo':'Limpiar todo',
 'Prática':'Práctica','Músicas':'Música'};
// Mapas EN/ES cobrem os rótulos instalados originalmente em português.
function hzApplyLangMap(){
  const lang=hzLang();
  const map=lang==='en'?HZ_EN_MAP:lang==='es'?HZ_ES_MAP:null;
  if(!map)return;
  document.querySelectorAll('#ss .slbl, #ss .ssub, #ss .sgt, #hz-bg-toggle, .hzp-title').forEach(el=>{
    const t=el.textContent.trim();
    if(map[t])el.textContent=map[t];
  });
}
function hzApplyEnMap(){hzApplyLangMap();}
function boot(){try{hzReorgSettings();}catch(e){}try{hzTranslateChrome();}catch(e){}try{hzRewriteHelp();}catch(e){}}
setTimeout(boot,900);setTimeout(boot,2600);setTimeout(boot,5200);
})();


/* ===== hz-stats-v50 ===== */
/* Estatísticas de uso: tempo útil, contadores e gráfico — armazenamento agregado leve */
(function(){
'use strict';

/* Busca: esconder ao concluir ou ao interagir com o conteúdo */
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='sin'){
    const sb=document.getElementById('sbar');if(sb)sb.classList.remove('open','vis');
    try{e.target.blur();}catch(err){}
  }
},true);
document.addEventListener('click',e=>{
  const sb=document.getElementById('sbar');
  if(!sb||(!sb.classList.contains('open')&&!sb.classList.contains('vis')))return;
  if(e.target.closest('#sbar')||e.target.closest('#v43-search-toggle'))return;
  if(e.target.closest('#bc .card, #bc .book-card, .bnav .ni')){
    sb.classList.remove('open','vis');
    try{if(typeof searchQ!=='undefined'){searchQ='';const sin=document.getElementById('sin');if(sin)sin.value='';renderLib();}}catch(err){}
  }
},true);

/* Configurações do leitor em blocos temáticos */
(function(){
const CSSR=document.createElement('style');CSSR.textContent='.h50-sec{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:rgba(var(--ac-rgb),.85);margin:16px 2px 8px;padding-top:12px;border-top:1px solid #262626}.h50-sec:first-child{margin-top:2px;border-top:0;padding-top:0}';
document.head.appendChild(CSSR);
function organizeReaderSettings(){
  const sc=document.getElementById('style-scroll');
  if(!sc||sc.dataset.h50==='1')return;
  const fsRow=document.getElementById('sfs-dec')?.closest('.style-row');
  const voice=document.getElementById('h41-voice');
  if(!fsRow||!voice)return; // aguarda instaladores
  sc.dataset.h50='1';
  const mk=t=>{const d=document.createElement('div');d.className='h50-sec';d.textContent=t;return d;};
  sc.insertBefore(mk('Aparência do leitor'),fsRow);
  const theme=document.getElementById('theme-row-v33');
  if(theme)sc.insertBefore(theme,voice); // tema do papel junto da aparência
  sc.insertBefore(mk('Voz e leitura em áudio'),voice);
  const last=[...sc.children].find(el=>el.id==='h41-voice-settings');
  const exp=document.getElementById('v36-expressive-toggle')?.closest('.style-row,.h41-acc,div');
  const after=(last&&last.nextElementSibling)||null;
  if(after&&!after.classList.contains('h50-sec'))sc.insertBefore(mk('Comportamento durante a leitura'),after);
}
let hzReaderSettingsQueued=false;
function hzQueueReaderSettings(){
  if(hzReaderSettingsQueued)return;hzReaderSettingsQueued=true;
  requestAnimationFrame(()=>{hzReaderSettingsQueued=false;try{organizeReaderSettings();}catch(e){}});
}
const hzReaderSettingsObserver=new MutationObserver(records=>{
  if(records.some(record=>record.target?.closest?.('#style-scroll')||[...record.addedNodes].some(node=>node.nodeType===1&&(node.id==='mo-style'||node.id==='h41-voice'||node.querySelector?.('#mo-style,#h41-voice')))))hzQueueReaderSettings();
});
hzReaderSettingsObserver.observe(document.body,{childList:true,subtree:true});
hzQueueReaderSettings();
})();

const KEY='hzStats.v1';
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&d.v===1)return d;}catch(e){}return{v:1,tot:{useful:0,read:0,game:0,dict:0,rev:0,audio:0,wSearch:0,wRev:0,sRev:0},days:{}};}
let ST=load(),dirty=false;
function ymd(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function day(){const k=ymd();return ST.days[k]||(ST.days[k]={u:0,r:0,g:0,d:0,v:0});}
function prune(){const ks=Object.keys(ST.days).sort();while(ks.length>60){delete ST.days[ks.shift()];}}
function save(){if(!dirty)return;dirty=false;try{prune();localStorage.setItem(KEY,JSON.stringify(ST));}catch(e){}}
setInterval(save,20000);window.addEventListener('beforeunload',save);
window.hzStat={
  bump(k,n){n=n||1;if(k in ST.tot){ST.tot[k]+=n;dirty=true;}},
  addTime(cat,sec){ // cat: read|game|dict|rev|audio
    if(!(cat in ST.tot))return;
    ST.tot[cat]+=sec;ST.tot.useful+=sec;
    const d=day();d.u+=sec;
    if(cat==='read')d.r+=sec;else if(cat==='game')d.g+=sec;else if(cat==='dict')d.d+=sec;else if(cat==='rev')d.v+=sec;
    dirty=true;
  },
  data(){return ST;}
};
/* ---- tempo útil: tique de 15s condicionado a contexto + interação recente ---- */
let lastAct=Date.now(),readSession=0;
['pointerdown','keydown','wheel','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,()=>{lastAct=Date.now();},{capture:true,passive:true}));
function activeScreen(){const sc=document.querySelector('.screen.active');return sc?sc.id:null;}
setInterval(()=>{
  try{
    if(document.visibilityState!=='visible')return;
    if(Date.now()-lastAct>90000)return; // ocioso
    const id=activeScreen();
    if(id==='sr'){ // leitura: só conta depois de 4 min contínuos
      readSession+=15;
      if(readSession>240)window.hzStat.addTime('read',15);
    }else{
      readSession=0;
      if(id==='sp'&&document.getElementById('hz-sp-frame'))window.hzStat.addTime('game',15);
      else if(id==='sx')window.hzStat.addTime('dict',15);
      else if(id==='sw'&&document.querySelector('.study-card'))window.hzStat.addTime('rev',15);
      /* sl (listas), ss (configurações) e demais: não contam */
    }
  }catch(e){}
},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){readSession=0;save();}});
/* ---- tempo de áudio reproduzido (mesmo sem interação ativa) ---- */
const AMAP=new WeakMap();
document.addEventListener('play',e=>{const a=e.target;if(a&&a.tagName==='AUDIO')AMAP.set(a,a.currentTime||0);},true);
function flushAudio(e){
  const a=e.target;if(!a||a.tagName!=='AUDIO')return;
  const t0=AMAP.get(a);if(t0==null)return;AMAP.delete(a);
  const dt=Math.max(0,Math.min(120,(a.currentTime||0)-t0));
  if(dt>=1)window.hzStat.addTime('audio',Math.round(dt));
}
document.addEventListener('pause',flushAudio,true);
document.addEventListener('ended',flushAudio,true);
/* ---- contadores por interação (com dedupe curto) ---- */
let lastKey='',lastKeyAt=0;
function once(k){const n=Date.now();if(k===lastKey&&n-lastKeyAt<5000)return false;lastKey=k;lastKeyAt=n;return true;}
document.addEventListener('click',e=>{
  try{
    const t=e.target;
    if(t.closest('#rtext .wunit')){const w=t.closest('.wunit').textContent.trim();if(once('w:'+w))window.hzStat.bump('wSearch');return;}
    if(t.closest('#dict-go')){const q=(document.getElementById('dict-q')||{}).value||'';if(q.trim()&&once('q:'+q))window.hzStat.bump('wSearch');return;}
    if(t.closest('.dict-item')||t.closest('.dict-word-click')){if(once('di:'+Date.now()%3))window.hzStat.bump('wSearch');return;}
    if(t.closest('[data-sent-play],[data-sent-idx],[data-ex-text],.tip-ex-play')||
       (t.closest('.lexi-audio')&&t.closest('.sent-card'))){window.hzStat.bump('sRev');return;}
    if(t.closest('.v41-save-sent-btn')){window.hzStat.bump('sRev');return;}
  }catch(err){}
},true);
document.addEventListener('keydown',e=>{
  try{if(e.key==='Enter'&&e.target&&e.target.id==='dict-q'){const q=e.target.value||'';if(q.trim()&&once('q:'+q))window.hzStat.bump('wSearch');}}catch(err){}
},true);
/* ---- perfil + gráfico nas configurações gerais ---- */
function fmtMin(sec){const m=Math.round(sec/60);if(m<60)return m+' min';const h=Math.floor(m/60);return h+'h '+String(m%60).padStart(2,'0')+'m';}
function chartSvg(){
  const ks=[];const d=new Date();
  for(let i=13;i>=0;i--){const t=new Date(d);t.setDate(d.getDate()-i);ks.push(t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'));}
  const vals=ks.map(k=>(ST.days[k]?ST.days[k].u:0)/60);
  const max=Math.max(10,...vals);
  const W=308,H=88,bw=W/14;
  let bars='';
  vals.forEach((v,i)=>{
    const h=Math.max(2,Math.round(v/max*(H-18)));
    const peak=v===Math.max(...vals)&&v>0;
    bars+='<rect x="'+(i*bw+3).toFixed(1)+'" y="'+(H-14-h)+'" width="'+(bw-6).toFixed(1)+'" height="'+h+'" rx="3" fill="rgba(var(--ac-rgb),'+(peak?'0.95':(v>0?'0.55':'0.18'))+'"/>';
  });
  const labels='<text x="3" y="'+(H-2)+'" fill="#8a8172" font-size="9">'+ks[0].slice(5)+'</text><text x="'+(W-34)+'" y="'+(H-2)+'" fill="#8a8172" font-size="9">'+ks[13].slice(5)+'</text>';
  return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'+bars+labels+'</svg>';
}
function profileHTML(){
  const t=ST.tot;
  const cell=(l,v)=>'<div class="hz-stat-cell"><span>'+l+'</span><strong>'+v+'</strong></div>';
  return '<div class="sgt" style="margin-top:4px">Resumo</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-hero"><div class="hz-stat-big">'+fmtMin(t.useful)+'</div><div class="hz-stat-sub">tempo útil de estudo</div></div>'+
   '</div>'+
   '<div class="sgt">Atividades</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-grid" style="margin-bottom:0">'+
      cell('Leitura',fmtMin(t.read))+cell('Jogo de pinyin',fmtMin(t.game))+
      cell('Dicionário',fmtMin(t.dict))+cell('Revisão',fmtMin(t.rev))+
    '</div>'+
   '</div>'+
   '<div class="sgt">Estudo acumulado</div>'+
   '<div class="hz-profile hz-block">'+
    '<div class="hz-stat-grid" style="margin-bottom:0">'+
      cell('Áudio ouvido',fmtMin(t.audio))+cell('Palavras pesquisadas',t.wSearch.toLocaleString("pt-BR"))+
      cell('Palavras revisadas',t.wRev.toLocaleString("pt-BR"))+cell('Frases revisadas',t.sRev.toLocaleString("pt-BR"))+
    '</div>'+
   '</div>'+
   '<div class="sgt">Atividade · últimos 14 dias</div>'+
   '<div class="hz-profile hz-block">'+chartSvg()+'</div>';
}
const pcss=document.createElement('style');pcss.textContent=`
.hz-profile{border:1px solid rgba(var(--ac-rgb),.26);background:linear-gradient(180deg,rgba(26,22,17,.9),rgba(15,13,10,.92));border-radius:18px;padding:16px 15px 13px;margin-bottom:6px}
.hz-profile.hz-block{margin-bottom:14px;padding:14px}
#spf .sgt{font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:rgba(var(--ac-rgb),.85);margin:2px 2px 8px}
.hz-stat-hero{text-align:center;margin-bottom:12px}
.hz-stat-big{font-size:30px;font-weight:850;color:var(--ac);font-variant-numeric:tabular-nums}
.hz-stat-sub{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a8172;font-weight:800;margin-top:2px}
.hz-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:13px}
.hz-stat-cell{border:1px solid #262320;background:#12100d;border-radius:11px;padding:8px 10px}
.hz-stat-cell span{display:block;font-size:10px;color:#8a8172;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.hz-stat-cell strong{display:block;font-size:15px;color:#ece3d2;margin-top:2px;font-variant-numeric:tabular-nums}
.hz-chart-title{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a8172;font-weight:800;margin:2px 0 6px}
@media(min-width:760px){.hz-stat-grid{grid-template-columns:repeat(4,1fr)}}
`;document.head.appendChild(pcss);
function renderProfile(){
  const host=document.getElementById('spf-stats');
  if(!host)return;
  host.innerHTML=profileHTML();
}
window.hzStatsRender=renderProfile;
const _pss=window.showScreen;
if(typeof _pss==='function')window.showScreen=function(id){if(id==='spf'){try{renderProfile();}catch(e){}}return _pss(id);};
})();


/* ===== hz-v50-profile-sources ===== */
/* v5.0: Meu Perfil, sources compactas, importar online, organizar livros */
(function(){
'use strict';
const T=k=>window.hzT?window.hzT(k):({profile:'Meu Perfil',guest:'Convidado'})[k]||k;
const css=document.createElement('style');css.textContent=`
/* Perfil */
#spf{background:var(--lb)}
.spf-head{display:flex;align-items:center;gap:16px;border:1px solid rgba(var(--ac-rgb),.28);background:linear-gradient(180deg,rgba(26,22,17,.9),rgba(15,13,10,.92));border-radius:18px;padding:16px;margin-bottom:14px}
.spf-ava{width:74px;height:74px;border-radius:50%;border:2px solid rgba(var(--ac-rgb),.55);background:#191510 center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:var(--ac);flex-shrink:0;cursor:pointer;position:relative;overflow:hidden}
.spf-ava svg{width:36px;height:36px}
.spf-ava .cam{position:absolute;right:-1px;bottom:-1px;width:24px;height:24px;border-radius:50%;background:var(--ac);color:#171310;display:flex;align-items:center;justify-content:center}
.spf-ava .cam svg{width:13px;height:13px}
.spf-name{flex:1;min-width:0}
.spf-name input{width:100%;background:transparent;border:0;border-bottom:1px dashed rgba(var(--ac-rgb),.4);color:#efe7d6;font-size:20px;font-weight:850;font-family:var(--rf);padding:4px 2px;outline:none}
.spf-sub{font-size:11px;color:#8a8172;letter-spacing:.1em;text-transform:uppercase;font-weight:800;margin-top:5px}
.spf-hint{display:flex;align-items:flex-start;gap:6px;font-size:11.5px;color:#9a8f7c;line-height:1.45;margin-top:9px;padding-top:8px;border-top:1px dashed rgba(var(--ac-rgb),.22)}
.spf-hint svg{flex-shrink:0;margin-top:2px;color:var(--ac)}
/* Sources compactas */
.osrc-list{display:flex;flex-direction:column;gap:9px}
.osrc-item{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:11px;align-items:center;border:1px solid #2a2a2a;background:#161616;border-radius:14px;padding:10px 11px}
.osrc-ico{width:44px;height:44px;border-radius:11px;border:1px solid rgba(var(--ac-rgb),.35);background:rgba(var(--ac-rgb),.08);display:flex;align-items:center;justify-content:center;color:var(--ac)}
.osrc-ico svg{width:22px;height:22px}
.osrc-t{font-size:14px;font-weight:800;color:#ece3d2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.osrc-u{font-size:11.5px;color:#8a8a8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.osrc-b{display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.osrc-b button,.osrc-b a{border:0;border-radius:9px;padding:7px 11px;font-size:11.5px;font-weight:850;text-decoration:none;text-align:center;display:block}
.osrc-b .imp{background:var(--ac);color:#171310}
.osrc-b .opn{background:#262626;color:#ccc}
@media(min-width:560px){.osrc-b{flex-direction:row}}
#mo-online .ms{max-width:640px;height:min(88vh,760px)}
#mo-online .mscroll{overscroll-behavior:contain}
/* Organizar livros */
body.hz-organize .book-card{animation:hzwig 0.35s ease-in-out infinite alternate;cursor:grab}
body.hz-organize .book-card.hz-drag{opacity:.65;transform:scale(1.05);z-index:10}
@keyframes hzwig{from{transform:rotate(-.7deg)}to{transform:rotate(.7deg)}}
.hz-org-x{border:1px solid rgba(var(--ac-rgb),.5)!important;color:var(--ac)!important;background:rgba(var(--ac-rgb),.1)!important}
.chap-ind{text-decoration:underline dotted;text-underline-offset:3px;cursor:pointer}
`;document.head.appendChild(css);
/* ---------- MEU PERFIL ---------- */
const GLOBE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z"/></svg>';
function pName(){try{return localStorage.getItem('hzProfileName')||T('guest');}catch(e){return T('guest');}}
function pImg(){try{return localStorage.getItem('hzProfileImg')||'';}catch(e){return'';}}
function ensureProfileScreen(){
 if(document.getElementById('spf'))return;
 const anchor=document.getElementById('ss');if(!anchor||!anchor.parentNode)return;
 const sec=document.createElement('div');sec.id='spf';sec.className='screen';
 sec.innerHTML=`<div class="bc" style="flex:1;overflow-y:auto">
   <div class="lib-title" style="font-size:24px;font-weight:800;padding:6px 2px 12px">${T('profile')}</div>
   <div class="spf-head">
     <div class="spf-ava" id="spf-ava" title="Trocar imagem"><span id="spf-ava-fallback"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.2c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg></span><span class="cam"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
     <div class="spf-name"><input id="spf-name" maxlength="24" autocomplete="off"><div class="spf-sub">${T('profile')} · 漢讀</div><div class="spf-hint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg> Toque no nome para editá-lo · toque na foto para trocar a imagem</div></div>
   </div>
   <input type="file" id="spf-file" accept="image/*" style="display:none">
   <div id="spf-stats"></div>
 </div><nav class="bnav" id="prof-nav"></nav>`;
 anchor.parentNode.insertBefore(sec,anchor.nextSibling);
 const nameIn=sec.querySelector('#spf-name');
 nameIn.value=pName();
 nameIn.addEventListener('change',()=>{try{localStorage.setItem('hzProfileName',nameIn.value.trim()||T('guest'));}catch(e){}});
 const ava=sec.querySelector('#spf-ava'),file=sec.querySelector('#spf-file');
 ava.addEventListener('click',()=>file.click());
 ava.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();file.click();}});
 file.addEventListener('change',()=>{const f=file.files&&file.files[0];if(f)compressAvatar(f);file.value='';});
 applyAvatar();
}
function applyAvatar(){
 const ava=document.getElementById('spf-ava');if(!ava)return;
 const img=pImg();
 ava.style.backgroundImage=img?`url(${img})`:'';
 ava.classList.toggle('has-image',!!img);
 ava.setAttribute('aria-label',img?'Substituir imagem do perfil':'Adicionar imagem do perfil');
 ava.setAttribute('role','button');ava.tabIndex=0;
 const fb=document.getElementById('spf-ava-fallback');if(fb)fb.style.display=img?'none':'';
}
/* compressão agressiva: 144px, WebP com qualidade decrescente até <=60KB (fallback JPEG) */
function compressAvatar(fileObj){
 const rd=new FileReader();
 rd.onload=()=>{
   const im=new Image();
   im.onload=()=>{
     try{
       const S=144,cv=document.createElement('canvas');cv.width=S;cv.height=S;
       const cx=cv.getContext('2d');
       const r=Math.max(S/im.width,S/im.height);
       const w=im.width*r,h=im.height*r;
       cx.drawImage(im,(S-w)/2,(S-h)/2,w,h);
       const LIMIT=60*1024;
       let best='';
       for(const type of ['image/webp','image/jpeg']){
         for(let q=0.8;q>=0.3;q-=0.1){
           const d=cv.toDataURL(type,q);
           if(d.length<50)continue; // formato não suportado
           if(d.length*0.75<=LIMIT){best=d;break;}
           best=best||d;
         }
         if(best&&best.length*0.75<=LIMIT)break;
       }
       if(best){
         try{localStorage.setItem('hzProfileImg',best);}catch(e){try{toast('Imagem grande demais para salvar');}catch(_){}} 
         applyAvatar();
         try{toast('Foto atualizada ('+Math.round(best.length*0.75/1024)+' KB)');}catch(e){}
       }
     }catch(e){}
   };
   im.src=rd.result;
 };
 rd.readAsDataURL(fileObj);
}
window.hzOpenProfile=function(){
 ensureProfileScreen();
 const pn=document.getElementById('prof-nav');
 if(pn&&typeof v29NavHTML==='function')pn.innerHTML=v29NavHTML('profile');
 const ni=document.getElementById('spf-name');if(ni&&!ni.value)ni.value=pName();
 showScreen('spf');
 try{if(window.hzStatsRender)window.hzStatsRender();}catch(e){}
 document.querySelectorAll('.ni[data-tab]').forEach(n=>n.classList.remove('on'));
 document.querySelectorAll('.ni[data-tab="profile"]').forEach(n=>n.classList.add('on'));
};
/* ---------- SOURCES COMPACTAS + IMPORTAR ONLINE ---------- */
function srcHost(u){try{return new URL(u).host+new URL(u).pathname.replace(/\/$/,'');}catch(e){return u||'fonte manual';}}
function osrcCard(sr,i,ctx){
 const dest=sr.type==='book'?'Livros':'Leitura simples';
 return `<div class="osrc-item"><div class="osrc-ico">${GLOBE}</div>
  <div style="min-width:0"><div class="osrc-t">${esc(sr.title)}</div><div class="osrc-u">${esc(sr.url?srcHost(sr.url):'Fonte manual · '+dest)}</div></div>
  <div class="osrc-b"><button class="imp" data-osrc-imp="${i}" title="Importar para ${dest}">Importar → ${dest==='Livros'?'Livros':'Leitura'}</button>${sr.url?`<a class="opn" href="${esc(sr.url)}" target="_blank" rel="noopener">Abrir source</a>`:''}</div></div>`;
}
async function hzImportOnline(i){
 try{
   await v34AddSource(i);
   const sr=V34_SOURCES[i];
   document.getElementById('mo-online')?.classList.remove('open');
   document.getElementById('mo-import')?.classList.remove('open');
   const btn=document.getElementById(sr.type==='book'?'mode-books':'mode-simple');
   if(btn)btn.click(); else renderLib();
   showScreen('sl');
 }catch(e){}
}
function wireOsrc(root){
 root.querySelectorAll('[data-osrc-imp]').forEach(b=>b.onclick=()=>hzImportOnline(+b.dataset.osrcImp));
}
/* substitui o seletor grande por lista compacta na tela Sources */
function compactDiscover(){
 const dc=document.getElementById('dc');if(!dc)return;
 dc.innerHTML='<div class="osrc-list">'+V34_SOURCES.map((sr,i)=>osrcCard(sr,i)).join('')+'</div>';
 wireOsrc(dc);
}
try{window.renderDiscover=compactDiscover;}catch(e){}
let hzCompactDiscoverReady=false;
function hzEnsureCompactDiscover(){
 if(hzCompactDiscoverReady)return;
 hzCompactDiscoverReady=true;
 compactDiscover();
}
document.addEventListener('hz:screen-change',event=>{
 if(event.detail?.id==='sd')requestAnimationFrame(hzEnsureCompactDiscover);
},{passive:true});
if(document.querySelector('.screen.active')?.id==='sd')hzEnsureCompactDiscover();
/* modal Importar de source online */
function ensureOnlineModal(){
 if(document.getElementById('mo-online'))return;
 document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="mo-online"><div class="ms">
  <div class="mbar"><div class="mhd"></div><button class="mx" id="mo-online-x" aria-label="Fechar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
  <div class="mtitle">Importar de source online</div>
  <div class="mscroll"><div class="osrc-list" id="mo-online-list"></div></div>
 </div></div>`);
 document.getElementById('mo-online-x').onclick=()=>document.getElementById('mo-online').classList.remove('open');
 document.getElementById('mo-online').addEventListener('click',e=>{if(e.target.id==='mo-online')e.target.classList.remove('open');});
}
function openOnlineModal(){
 ensureOnlineModal();
 const l=document.getElementById('mo-online-list');
 l.innerHTML=V34_SOURCES.map((sr,i)=>osrcCard(sr,i)).join('');
 wireOsrc(l);
 document.getElementById('mo-online').classList.add('open');
}
/* opção no topo do modal de importação */
function installImportOption(){
 const scroll=document.querySelector('#mo-import .mscroll');
 if(!scroll||document.getElementById('oonline'))return;
 scroll.insertAdjacentHTML('afterbegin',`<div class="iopt" id="oonline">
   <div class="iico" style="background:linear-gradient(135deg,rgba(var(--ac-rgb),.85),rgba(var(--ac-rgb),.45));display:flex;align-items:center;justify-content:center;color:#171310">${GLOBE}</div>
   <div><div class="ilbl">Importar de source online</div><div class="isub">Leituras e livros prontos, em um toque</div></div></div>`);
 document.getElementById('oonline').addEventListener('click',()=>{openOnlineModal();});
}
/* ---------- ORGANIZAR LIVROS (long-press -> arrastar; X encerra) ---------- */
window.hzEnterOrganize=function(){
 if(document.body.classList.contains('hz-organize'))return;
 if((v29LibMode||'simple')!=='books')return;
 document.body.classList.add('hz-organize');
 try{navigator.vibrate&&navigator.vibrate(20);}catch(e){}
 hzDecorateOrganize();
 try{toast('Arraste para reorganizar · toque no X para concluir');}catch(e){}
};
window.hzDecorateOrganize=function(){
 const tools=document.querySelector('#bc .lib-tools');
 const on=document.body.classList.contains('hz-organize');
 let x=document.getElementById('hz-org-x');
 if(on&&tools&&!x){
   tools.insertAdjacentHTML('beforeend','<button class="lib-chip hz-org-x" id="hz-org-x">✕ Concluir</button>');
   document.getElementById('hz-org-x').onclick=hzExitOrganize;
 }else if(!on&&x)x.remove();
 if(on)hzWireDrag();
};
function hzExitOrganize(){document.body.classList.remove('hz-organize');const x=document.getElementById('hz-org-x');if(x)x.remove();hzPersistOrder();}
function hzWireDrag(){
 const wrap=document.getElementById('book-wrap');
 if(!wrap||wrap._hzDrag)return;wrap._hzDrag=true;
 let drag=null;
 wrap.addEventListener('pointerdown',e=>{
   if(!document.body.classList.contains('hz-organize'))return;
   const card=e.target.closest('.book-card');if(!card)return;
   drag=card;card.classList.add('hz-drag');
   try{card.setPointerCapture(e.pointerId);}catch(err){}
   e.preventDefault();
 });
 wrap.addEventListener('pointermove',e=>{
   if(!drag)return;
   const el=document.elementFromPoint(e.clientX,e.clientY);
   const over=el&&el.closest?el.closest('.book-card'):null;
   if(over&&over!==drag&&over.parentNode===wrap){
     const r=over.getBoundingClientRect();
     const before=(e.clientY<r.top+r.height/2)||(e.clientX<r.left+r.width/2&&Math.abs(e.clientY-(r.top+r.height/2))<r.height/2);
     wrap.insertBefore(drag,before?over:over.nextSibling);
   }
 });
 const up=()=>{if(drag){drag.classList.remove('hz-drag');drag=null;hzPersistOrder();}};
 wrap.addEventListener('pointerup',up);wrap.addEventListener('pointercancel',up);
}
async function hzPersistOrder(){
 try{
   const wrap=document.getElementById('book-wrap');if(!wrap)return;
   const ids=[...wrap.querySelectorAll('.book-card')].map(c=>c.dataset.bookId);
   let changed=false;
   ids.forEach((id,i)=>{const b=books.find(x=>String(x.id)===String(id));if(b&&b.order!==i){b.order=i;changed=true;}});
   if(changed){for(const b of books){if(typeof b.order==='number')await dbPut(STB,b);}}
 }catch(e){}
}
function boot(){try{ensureProfileScreen();}catch(e){}try{installImportOption();}catch(e){}try{compactDiscover();}catch(e){}}
setTimeout(boot,800);setTimeout(boot,2400);
})();

// -----------------------------------------------------------------------------
// Runtime enhancer: ensure book Importar button is present across all
// renderLib implementations.  The project defines multiple versions of
// renderLib (v29, h36) and not all include an Importar button for importing
// local book sources.  Rather than editing every definition manually, we
// wrap the active renderLib function and inject the Importar button after
// each render.  This code executes after the initial boot and checks the
// library mode; if the mode is "books" and the toolbar lacks an Importar
// button, it inserts one before the New book button.  It also updates the
// empty-state message to instruct users to use Importar when no books are
// present.
(function(){
  const orig = window.renderLib;
  if (typeof orig === 'function' && !orig.__withImport) {
    window.renderLib = function() {
      const res = orig.apply(this, arguments);
      try {
        const bc = document.getElementById('bc');
        const libTools = bc && bc.querySelector('.lib-tools');
        if (libTools && window.v29LibMode === 'books' && !libTools.querySelector('#book-import-chip')) {
          const btn = document.createElement('button');
          btn.className = 'lib-chip';
          btn.id = 'book-import-chip';
          btn.textContent = 'Importar';
          const ref = libTools.querySelector('#book-new-chip');
          libTools.insertBefore(btn, ref);
          btn.onclick = () => {
            try {
              showScreen('sd');
            } catch (e) {}
          };
          const wrap = document.getElementById('book-wrap');
          const empty = wrap && wrap.querySelector('.emptyx');
          if (empty) empty.innerHTML = '<b>Nenhum livro.</b><br>Toque em Importar ou Novo livro para adicionar.';
        }
      } catch (e) {}
      return res;
    };
    window.renderLib.__withImport = true;
  }
})();


/* ===== hz-unified-emotion-voice-flow-v51-natural-pauses =====
   Unifica TODOS os pontos de voz no mesmo fluxo emocional validado no index-2.2,
   usando o construtor v36/v3 expandido como fonte única de SSML. */
(function(){
'use strict';
const TAG='hz-unified-emotion-voice-flow-v51-natural-pauses';
let lastUrl=null;
function cjkCount(s){try{return [...String(s||'')].filter(ch=>/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)).length;}catch{return 0;}}
function cleanVoiceText(text){
  try{text=(window.v40ToSimplified||v40ToSimplified)(text);}catch{}
  return String(text||'')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\r/g,'\n')
    .replace(/([^。！？!?\n])\n+/g,'$1 ')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t\f\v]{2,}/g,' ')
    .trim();
}
function settings(){try{return window.v36GetSettings?window.v36GetSettings():{};}catch{return{};}}
function buildSsml(text){
  text=cleanVoiceText(text);
  if(!text)throw new Error('sem texto para voz');
  if(typeof window.v36BuildSsmlAuto==='function')return window.v36BuildSsmlAuto(text);
  const esc=s=>String(s==null?'':s).replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]||c));
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">\n  <voice name="zh-CN-XiaoxiaoNeural">\n    <prosody rate="+0%" pitch="+0Hz" volume="+0%">${esc(text)}</prosody>\n  </voice>\n</speak>`;
}
async function audioFromSsml(ssml,o){
  const st=settings();
  const outputFormat=(o&&o.outputFormat)||(o&&o.format)||(o&&o.quality)||st.quality||'audio-48khz-192kbitrate-mono-mp3';
  if(typeof window.hzTtsEdgeApiBlob==='function')return await window.hzTtsEdgeApiBlob(ssml,{outputFormat,format:outputFormat,quality:outputFormat});
  if(typeof window.getTtsAudioFromSsml==='function')return await window.getTtsAudioFromSsml(ssml,outputFormat);
  throw new Error('API de voz não disponível');
}
function playBlob(blob){
  return new Promise((resolve,reject)=>{
    try{if(window.curAudio&&typeof window.curAudio.pause==='function')window.curAudio.pause();}catch{}
    try{if(lastUrl)URL.revokeObjectURL(lastUrl);}catch{}
    lastUrl=URL.createObjectURL(blob);
    const a=new Audio(lastUrl);
    try{window.curAudio=a;curAudio=a;}catch{window.curAudio=a;}
    const timeout=setTimeout(()=>{try{a.pause();}catch{}reject(new Error('timeout de áudio'));},Math.max(30000,Math.min(360000,(blob&&blob.size||0)*14)));
    a.onended=()=>{clearTimeout(timeout);resolve(true);};
    a.onerror=()=>{clearTimeout(timeout);reject(new Error('falha no player de áudio'));};
    a.play().catch(e=>{clearTimeout(timeout);reject(e);});
  });
}
async function speak(text,kind='auto'){
  text=cleanVoiceText(text);
  if(!text||cjkCount(text)<1)return false;
  const busyKind=(kind==='char'||cjkCount(text)<=1)?'char':'natural';
  try{if(typeof setAudioBusy==='function')setAudioBusy(busyKind,true);else if(typeof h36Busy==='function')h36Busy(true);}catch{}
  try{
    const ssml=buildSsml(text);
    const blob=await audioFromSsml(ssml,settings());
    await playBlob(blob);
    return true;
  }catch(e){
    try{console.warn('['+TAG+'] falha',e);}catch{}
    try{(window.toast||window.h42Toast||function(){} )('Falha na voz emocional: '+(e&&e.message||e));}catch{}
    return false;
  }finally{
    try{if(typeof setAudioBusy==='function')setAudioBusy(busyKind,false);else if(typeof h36Busy==='function')h36Busy(false);}catch{}
  }
}
function patch(){
  try{window.hzEmotionBuildSsml=buildSsml;}catch{}
  try{window.hzEmotionAudioFromSsml=audioFromSsml;}catch{}
  try{window.hzEmotionSpeak=speak;}catch{}
  // Construtores SSML usados por H48/H46/h42 passam a apontar para o MESMO fluxo.
  try{window.h42BuildSsml=buildSsml;if(typeof h42BuildSsml!=='undefined')h42BuildSsml=buildSsml;}catch{}
  try{window.H46_buildSsml=buildSsml;if(typeof H46_buildSsml!=='undefined')H46_buildSsml=buildSsml;}catch{}
  try{window.h42AudioFromSsml=audioFromSsml;if(typeof h42AudioFromSsml!=='undefined')h42AudioFromSsml=audioFromSsml;}catch{}
  try{window.H46_audioFromSsml=audioFromSsml;if(typeof H46_audioFromSsml!=='undefined')H46_audioFromSsml=audioFromSsml;}catch{}
  // Entradas públicas antigas: palavra, frase, dicionário, exemplos e botões inline.
  try{window.v36Speak=speak;}catch{}
  try{window.H46_speak=speak;if(typeof H46_speak!=='undefined')H46_speak=speak;}catch{}
  try{window.h42Speak=speak;if(typeof h42Speak!=='undefined')h42Speak=speak;}catch{}
  try{window.h41SpeakText=speak;if(typeof h41SpeakText!=='undefined')h41SpeakText=speak;}catch{}
  try{window.h36Speak=function(text,opts){return speak(text,opts&&opts.mode||'auto');};if(typeof h36Speak!=='undefined')h36Speak=window.h36Speak;}catch{}
  try{window.hr39SpeakWhole=window.h36Speak;}catch{}
  try{window.speakWordMode=function(word,mode){return speak(word,mode||'natural');};if(typeof speakWordMode!=='undefined')speakWordMode=window.speakWordMode;}catch{}
  try{window.speakWord=function(word){return speak(word,'natural');};if(typeof speakWord!=='undefined')speakWord=window.speakWord;}catch{}
  try{window.v30SpeakSentence=function(key){const d=(window.V30_SENT_AUDIO||{})[key];return speak((d&&d.zh)||key,'sentence');};}catch{}
  try{window.hr36Speak=window.h36Speak;}catch{}
}
function boot(){patch();setTimeout(patch,250);setTimeout(patch,900);setTimeout(patch,1800);setTimeout(patch,3600);setTimeout(patch,5200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();


/* ===== hz-traditional-simplified-db-v1 =====
   Centraliza a conversão Tradicional -> Simplificado para leitura, dicionário,
   exemplos e voz. O banco grande fica em db/traditional-simplified.json. */
(function(){
'use strict';
function simp(x){try{return (window.v40ToSimplified||v40ToSimplified)(x);}catch{return String(x||'');}}
function patchTradSimpFlow(){
  try{window.v40ToSimplified=v40ToSimplified;window.v40NormalizeText=v40NormalizeText;window.loadTradSimpDb=loadTradSimpDb;}catch{}
  try{hzScheduleIdle(()=>loadTradSimpDb(),2200);}catch{}
  try{
    if(typeof lookupAll==='function'&&!lookupAll.__tradSimp){
      const old=lookupAll;
      lookupAll=async function(word){return old.call(this,simp(word));};
      lookupAll.__tradSimp=true;
      window.lookupAll=lookupAll;
    }
  }catch{}
  try{
    if(typeof speakWordMode==='function'&&!speakWordMode.__tradSimp){
      const old=speakWordMode;
      speakWordMode=function(word,mode){return old.call(this,simp(word),mode);};
      speakWordMode.__tradSimp=true;
      window.speakWordMode=speakWordMode;
    }
  }catch{}
  try{
    if(typeof window.hzEmotionSpeak==='function'&&!window.hzEmotionSpeak.__tradSimp){
      const old=window.hzEmotionSpeak;
      window.hzEmotionSpeak=function(text,kind){return old.call(this,simp(text),kind);};
      window.hzEmotionSpeak.__tradSimp=true;
      if(typeof v36Speak!=='undefined')v36Speak=window.hzEmotionSpeak;
      window.v36Speak=window.hzEmotionSpeak;
    }
  }catch{}
  try{
    if(typeof v29RunDict==='function'&&!v29RunDict.__tradSimp){
      const old=v29RunDict;
      v29RunDict=function(q){q=simp(q);const inp=document.getElementById('dict-q');if(inp)inp.value=q;return old.call(this,q);};
      v29RunDict.__tradSimp=true;
      window.v29RunDict=v29RunDict;
    }
  }catch{}
  try{
    document.querySelectorAll('[data-v34-speak],[data-sent-play]').forEach(el=>{
      if(el.dataset.v34Speak)el.dataset.v34Speak=simp(el.dataset.v34Speak);
      if(el.dataset.sentPlay)el.dataset.sentPlay=simp(el.dataset.sentPlay);
    });
  }catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchTradSimpFlow);else patchTradSimpFlow();
setTimeout(patchTradSimpFlow,400);setTimeout(patchTradSimpFlow,1400);setTimeout(patchTradSimpFlow,3200);
})();

/* ===== hz-traditional-simplified-runtime-v2 =====
   Correção cumulativa: o banco db/traditional-simplified.json precisa atuar
   também nas renderizações finais do leitor e do dicionário, não apenas em
   buscas/voz. */
(function(){
  'use strict';
  const TSDB_VER='20260709-v2';
  let tsdbPromise=null;
  const baseV40ToSimplified=(typeof v40ToSimplified==='function')?v40ToSimplified:null;

  function asText(x){return String(x==null?'':x);}
  function toSimp(x){
    try{ return baseV40ToSimplified?baseV40ToSimplified(asText(x)):asText(x); }
    catch{ return asText(x); }
  }
  function hasCjk(s){return /[\u3400-\u9fff\uf900-\ufaff]/.test(asText(s));}

  async function ensureTradSimpDb(){
    if(tsdbPromise)return tsdbPromise;
    tsdbPromise=(async()=>{
      try{
        const urls=[`db/traditional-simplified.json?v=${TSDB_VER}`,'db/traditional-simplified.json'];
        let lastErr=null;
        for(const url of urls){
          try{
            const r=await fetch(url,{cache:'no-store'});
            if(!r.ok){lastErr=new Error('HTTP '+r.status+' '+url);continue;}
            const db=await r.json();
            if(typeof v40MergeTradSimpDb==='function')v40MergeTradSimpDb(db);
            try{V40_TRAD_DB_STATE.loaded=true;V40_TRAD_DB_STATE.error=null;}catch{}
            try{window.HZ_TRAD_SIMP_DB_READY=true;window.HZ_TRAD_SIMP_DB_VERSION=db.version||TSDB_VER;}catch{}
            return true;
          }catch(e){lastErr=e;}
        }
        throw lastErr||new Error('traditional-simplified db not loaded');
      }catch(e){
        try{window.HZ_TRAD_SIMP_DB_READY=false;window.HZ_TRAD_SIMP_DB_ERROR=e&&e.message||String(e);}catch{}
        try{console.warn('[Trad->Simp v2] usando fallback interno:',e);}catch{}
        return false;
      }
    })();
    return tsdbPromise;
  }

  try{
    const oldLoad=(typeof loadTradSimpDb==='function')?loadTradSimpDb:null;
    window.loadTradSimpDb=async function(){return ensureTradSimpDb();};
    try{loadTradSimpDb=window.loadTradSimpDb;}catch{}
    try{window.__oldLoadTradSimpDb=oldLoad;}catch{}
  }catch{}
  try{window.v40ToSimplified=function(text){return toSimp(text);};window.v40NormalizeText=function(text){return toSimp(text);};}catch{}

  function simplifyTextNodes(root){
    if(!root)return;
    try{
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
        const p=node.parentElement;
        if(!p||/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;
        return hasCjk(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP;
      }});
      const nodes=[];
      while(walker.nextNode())nodes.push(walker.currentNode);
      nodes.forEach(n=>{const s=toSimp(n.nodeValue);if(s!==n.nodeValue)n.nodeValue=s;});
    }catch{}
  }

  function simplifyReaderNow(){
    try{
      const sr=document.getElementById('sr');
      const root=document.getElementById('rtext');
      if(!sr||!root||!sr.classList.contains('active'))return;
      let raw='';
      if(typeof curBook!=='undefined'&&curBook){
        const idx=curBook._readingChapterIndex??curBook.lastChapterIndex??curBook.lastChapter??0;
        const chs=curBook.chapters||curBook.pages;
        if(chs&&chs[idx])raw=chs[idx].content||chs[idx].text||chs[idx].body||'';
        else raw=curBook.content||'';
      }
      if(raw&&typeof buildHTML==='function'){
        const y=document.getElementById('rscroll')?.scrollTop||0;
        root.innerHTML=buildHTML(toSimp(raw));
        try{applyPinyin();}catch{}
        try{document.getElementById('rscroll').scrollTop=y;}catch{}
      }else simplifyTextNodes(root);
    }catch{}
  }

  async function migrateStoredLibrary(){
    try{
      await ensureTradSimpDb();
      if(!db||typeof dbAll!=='function'||typeof dbPut!=='function'||!STB)return;
      const key='hzTradSimpMigrationV2';
      try{if(localStorage.getItem(key)==='1')return;}catch{}
      const arr=await dbAll(STB);
      let changedCount=0;
      for(const b of arr||[]){
        let changed=false;
        ['title','content','synopsis'].forEach(k=>{if(b&&typeof b[k]==='string'){const s=toSimp(b[k]);if(s!==b[k]){b[k]=s;changed=true;}}});
        const chs=b&&Array.isArray(b.chapters)?b.chapters:(b&&Array.isArray(b.pages)?b.pages:null);
        if(chs){
          for(const ch of chs){
            ['title','content','text','body'].forEach(k=>{if(ch&&typeof ch[k]==='string'){const s=toSimp(ch[k]);if(s!==ch[k]){ch[k]=s;changed=true;}}});
          }
        }
        if(changed){changedCount++;await dbPut(STB,b);}
      }
      if(changedCount){try{books=await dbAll(STB);renderLib();simplifyReaderNow();}catch{}}
      try{localStorage.setItem(key,'1');}catch{}
    }catch(e){try{console.warn('[Trad->Simp v2] migration skipped:',e);}catch{}}
  }

  function patchOnce(){
    try{
      if(typeof cleanRaw==='function'&&!cleanRaw.__tradSimpV2){
        const old=cleanRaw;
        cleanRaw=function(raw){return toSimp(old.call(this,raw));};
        cleanRaw.__tradSimpV2=true;
        window.cleanRaw=cleanRaw;
      }
    }catch{}
    try{
      if(typeof buildHTML==='function'&&!buildHTML.__tradSimpV2){
        const old=buildHTML;
        buildHTML=function(text){return old.call(this,toSimp(text));};
        buildHTML.__tradSimpV2=true;
        window.buildHTML=buildHTML;
      }
    }catch{}
    try{
      if(typeof getWordPY==='function'&&!getWordPY.__tradSimpV2){
        const old=getWordPY;
        getWordPY=function(word){return old.call(this,toSimp(word));};
        getWordPY.__tradSimpV2=true;
        window.getWordPY=getWordPY;
      }
    }catch{}
    try{
      if(typeof segmentChineseRun==='function'&&!segmentChineseRun.__tradSimpV2){
        const old=segmentChineseRun;
        segmentChineseRun=function(run){return old.call(this,toSimp(run));};
        segmentChineseRun.__tradSimpV2=true;
        window.segmentChineseRun=segmentChineseRun;
      }
    }catch{}
    try{
      if(typeof v30ContainsTerm==='function'&&!v30ContainsTerm.__tradSimpV2){
        const old=v30ContainsTerm;
        v30ContainsTerm=function(text,q){return old.call(this,toSimp(text),toSimp(q));};
        v30ContainsTerm.__tradSimpV2=true;
        window.v30ContainsTerm=v30ContainsTerm;
      }
    }catch{}
    try{
      if(typeof v30NormalizeCedict==='function'&&!v30NormalizeCedict.__tradSimpV2){
        const old=v30NormalizeCedict;
        v30NormalizeCedict=function(e,q){
          const r=old.call(this,e,toSimp(q));
          if(r){r.simp=toSimp(r.simp);r.trad=asText(r.trad||'');}
          return r;
        };
        v30NormalizeCedict.__tradSimpV2=true;
        window.v30NormalizeCedict=v30NormalizeCedict;
      }
    }catch{}
    try{
      if(typeof v29Tatoeba==='function'&&!v29Tatoeba.__tradSimpV2){
        const old=v29Tatoeba;
        v29Tatoeba=async function(q){
          await ensureTradSimpDb();
          const qs=toSimp(q);
          const rows=await old.call(this,qs);
          return (rows||[]).map(s=>({...s,zh:toSimp(s.zh||s.text||''),text:toSimp(s.text||s.zh||'')})).filter(s=>s.zh||s.text);
        };
        v29Tatoeba.__tradSimpV2=true;
        window.v29Tatoeba=v29Tatoeba;
      }
    }catch{}
    try{
      if(typeof v30CacheSentenceAudio==='function'&&!v30CacheSentenceAudio.__tradSimpV2){
        const old=v30CacheSentenceAudio;
        v30CacheSentenceAudio=function(zh,urls){return old.call(this,toSimp(zh),urls);};
        v30CacheSentenceAudio.__tradSimpV2=true;
        window.v30CacheSentenceAudio=v30CacheSentenceAudio;
      }
    }catch{}
    try{
      if(typeof v29RunDict==='function'&&!v29RunDict.__tradSimpV2){
        const old=v29RunDict;
        v29RunDict=async function(q){
          await ensureTradSimpDb();
          q=toSimp(q);
          const inp=document.getElementById('dict-q');if(inp)inp.value=q;
          return old.call(this,q);
        };
        v29RunDict.__tradSimpV2=true;
        window.v29RunDict=v29RunDict;
      }
    }catch{}
    try{
      if(typeof v29RenderDictCurrent==='function'&&!v29RenderDictCurrent.__tradSimpV2){
        const old=v29RenderDictCurrent;
        v29RenderDictCurrent=async function(force){
          await ensureTradSimpDb();
          try{if(typeof v29DictTerm!=='undefined')v29DictTerm=toSimp(v29DictTerm);}catch{}
          const res=await old.call(this,force);
          simplifyTextNodes(document.getElementById('dict-results'));
          return res;
        };
        v29RenderDictCurrent.__tradSimpV2=true;
        window.v29RenderDictCurrent=v29RenderDictCurrent;
      }
    }catch{}
    try{
      if(typeof v29RenderDictSentences==='function'&&!v29RenderDictSentences.__tradSimpV2){
        const old=v29RenderDictSentences;
        v29RenderDictSentences=async function(q,out){
          await ensureTradSimpDb();
          const res=await old.call(this,toSimp(q),out);
          simplifyTextNodes(out);
          return res;
        };
        v29RenderDictSentences.__tradSimpV2=true;
        window.v29RenderDictSentences=v29RenderDictSentences;
      }
    }catch{}
    try{
      if(typeof v29RenderDictWords==='function'&&!v29RenderDictWords.__tradSimpV2){
        const old=v29RenderDictWords;
        v29RenderDictWords=async function(q,out){
          await ensureTradSimpDb();
          const res=await old.call(this,toSimp(q),out);
          simplifyTextNodes(out);
          return res;
        };
        v29RenderDictWords.__tradSimpV2=true;
        window.v29RenderDictWords=v29RenderDictWords;
      }
    }catch{}
    try{
      if(typeof v29RenderDictDefs==='function'&&!v29RenderDictDefs.__tradSimpV2){
        const old=v29RenderDictDefs;
        v29RenderDictDefs=async function(q,out){
          await ensureTradSimpDb();
          const res=await old.call(this,toSimp(q),out);
          simplifyTextNodes(out);
          return res;
        };
        v29RenderDictDefs.__tradSimpV2=true;
        window.v29RenderDictDefs=v29RenderDictDefs;
      }
    }catch{}
    try{
      if(typeof v30DictJump==='function'&&!v30DictJump.__tradSimpV2){
        const old=v30DictJump;
        v30DictJump=function(w){return old.call(this,toSimp(w));};
        v30DictJump.__tradSimpV2=true;
        window.v30DictJump=v30DictJump;
      }
    }catch{}
    try{
      if(typeof speakWordMode==='function'&&!speakWordMode.__tradSimpV2){
        const old=speakWordMode;
        speakWordMode=function(word,mode){return old.call(this,toSimp(word),mode);};
        speakWordMode.__tradSimpV2=true;
        window.speakWordMode=speakWordMode;
      }
      if(typeof speakWord==='function'&&!speakWord.__tradSimpV2){
        const old=speakWord;
        speakWord=function(word){return old.call(this,toSimp(word));};
        speakWord.__tradSimpV2=true;
        window.speakWord=speakWord;
      }
    }catch{}
    try{
      if(window.hzEmotionSpeak&&!window.hzEmotionSpeak.__tradSimpV2){
        const old=window.hzEmotionSpeak;
        window.hzEmotionSpeak=function(text,kind){return old.call(this,toSimp(text),kind);};
        window.hzEmotionSpeak.__tradSimpV2=true;
        try{v36Speak=window.hzEmotionSpeak;}catch{}
        try{h42Speak=window.hzEmotionSpeak;}catch{}
        try{H46_speak=window.hzEmotionSpeak;}catch{}
      }
    }catch{}
    try{simplifyReaderNow();simplifyTextNodes(document.getElementById('dict-results'));}catch{}
  }

  function bootTradSimpV2(){
    patchOnce();
    hzScheduleIdle(async()=>{
      await ensureTradSimpDb();
      patchOnce();simplifyReaderNow();migrateStoredLibrary();
      simplifyTextNodes(document.getElementById('dict-results'));
    },2600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootTradSimpV2);else bootTradSimpV2();
  setTimeout(()=>patchOnce(),900);
})();

/* ===== hz-v52-reset-simplified-and-dictionary-final ===== */
(function(){
  'use strict';
  const H52_EMPTY_DICT='<div class="emptyx"><b>Pesquise uma palavra ou ideograma.</b><br>O dicionário usa definições, palavras relacionadas, exemplos e áudio natural quando disponível.</div>';
  const H52_TREAT_KEY='hzTradSimpTreatmentV52';
  const h52SentenceCache=new Map();
  let h52TsPromise=null;
  let h52LibMigrationRunning=false;

  function h52Text(v){return String(v==null?'':v);}
  function h52Esc(v){try{return esc(v);}catch{return h52Text(v).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}}
  function h52Cjk(v){return [...h52Text(v)].filter(ch=>{try{return isCJK(ch);}catch{return /[\u3400-\u9fff\uf900-\ufaff]/.test(ch);}}).join('');}
  async function h52EnsureTradSimp(){
    if(h52TsPromise)return h52TsPromise;
    h52TsPromise=(async()=>{
      try{
        if(typeof loadTradSimpDb==='function')await loadTradSimpDb();
        else if(window.loadTradSimpDb)await window.loadTradSimpDb();
      }catch{}
      return true;
    })();
    return h52TsPromise;
  }
  function h52ToSimpSync(v){
    const s=h52Text(v);
    try{return v40ToSimplified(s);}catch{}
    try{return window.v40NormalizeText?window.v40NormalizeText(s):s;}catch{}
    return s;
  }
  function h52StillHasTrad(v){
    const s=h52Text(v);
    try{
      if(typeof V40_TRAD_TO_SIMP==='object'){
        for(const ch of s){const m=V40_TRAD_TO_SIMP[ch];if(m&&m!==ch)return true;}
      }
    }catch{}
    return false;
  }
  async function h52GoogleSimplify(text){
    const raw=h52Text(text).trim();
    if(!raw)return '';
    const cached=h52SentenceCache.get('g:'+raw);
    if(cached!==undefined)return cached;
    try{
      const ctl=new AbortController();
      const t=setTimeout(()=>ctl.abort(),5500);
      const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&tl=zh-CN&dt=t&q='+encodeURIComponent(raw);
      const r=await fetch(url,{cache:'no-store',signal:ctl.signal});
      clearTimeout(t);
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json();
      let out='';
      try{out=(d[0]||[]).map(x=>x&&x[0]||'').join('');}catch{}
      out=out?out.trim():'';
      h52SentenceCache.set('g:'+raw,out);
      return out;
    }catch(e){h52SentenceCache.set('g:'+raw,'');return '';}
  }
  async function h52SimplifySentenceAsync(text){
    const raw=h52Text(text);
    if(!raw)return raw;
    const cached=h52SentenceCache.get(raw);
    if(cached!==undefined)return cached;
    await h52EnsureTradSimp();
    const local=h52ToSimpSync(raw);
    let out=local;
    if(h52StillHasTrad(local)){
      const g=await h52GoogleSimplify(local);
      if(g)out=h52ToSimpSync(g);
    }
    h52SentenceCache.set(raw,out);
    return out;
  }
  function h52Contains(text,q){
    const t=h52ToSimpSync(text);
    const n=h52ToSimpSync(h52Cjk(q)||q);
    if(!n)return false;
    return t.includes(n);
  }
  function h52TreatField(obj,key){
    if(!obj||typeof obj[key]!=='string')return false;
    const old=obj[key], next=h52ToSimpSync(old);
    if(next!==old){obj[key]=next;return true;}
    return false;
  }
  async function h52TreatBookRecord(book,force){
    if(!book||typeof book!=='object')return false;
    await h52EnsureTradSimp();
    if(!force && book.tradSimpTreated==='yes')return false;
    let changed=false;
    ['title','source','content','synopsis','desc','description'].forEach(k=>{if(h52TreatField(book,k))changed=true;});
    const chapters=Array.isArray(book.chapters)?book.chapters:(Array.isArray(book.pages)?book.pages:null);
    if(chapters){
      chapters.forEach(ch=>['title','content','text','body'].forEach(k=>{if(h52TreatField(ch,k))changed=true;}));
    }
    if(book.tradSimpTreated!=='yes'){book.tradSimpTreated='yes';changed=true;}
    if(book.tradSimpTreatment!=='traditional-to-simplified'){book.tradSimpTreatment='traditional-to-simplified';changed=true;}
    if(!book.tradSimpTreatedAt){book.tradSimpTreatedAt=Date.now();changed=true;}
    return changed;
  }
  async function h52TreatBookById(id){
    try{
      await h52EnsureTradSimp();
      let b=(books||[]).find(x=>String(x.id)===String(id));
      if(!b&&typeof v29LoadBook==='function')b=await v29LoadBook(id);
      if(!b)return null;
      const changed=await h52TreatBookRecord(b,false);
      if(changed&&typeof dbPut==='function'){await dbPut(STB,b);try{books=await dbAll(STB);}catch{}}
      return b;
    }catch{return null;}
  }
  async function h52MigrateStoredLibrary(){
    if(h52LibMigrationRunning)return;
    h52LibMigrationRunning=true;
    try{
      await h52EnsureTradSimp();
      if(typeof dbAll!=='function'||typeof dbPut!=='function'||!STB)return;
      const already=(()=>{try{return localStorage.getItem(H52_TREAT_KEY)==='1';}catch{return false;}})();
      const arr=await dbAll(STB);
      let changedCount=0;
      for(const b of arr||[]){
        const changed=await h52TreatBookRecord(b,!already?false:false);
        if(changed){changedCount++;await dbPut(STB,b);}
      }
      if(changedCount){try{books=await dbAll(STB);renderLib();}catch{}}
      try{localStorage.setItem(H52_TREAT_KEY,'1');}catch{}
    }catch(e){try{console.warn('[h52] library treatment skipped:',e);}catch{}}
    finally{h52LibMigrationRunning=false;}
  }

  function h52InstallCss(){
    if(document.getElementById('h52-style'))return;
    const css=`
      .dict-word-link{cursor:pointer;color:inherit;border-radius:7px;padding:0 2px;transition:color .15s ease,background .15s ease,text-shadow .15s ease}
      .dict-word-link:hover,.dict-word-link:focus,.dict-word-link.active{color:var(--ac,var(--active-color,#ee8765));background:rgba(var(--ac-rgb,238,135,101),.10);text-shadow:0 0 12px rgba(var(--ac-rgb,238,135,101),.25);outline:0}
      .dict-word-link:active{opacity:.72}
      .dict-item-main .lexi-acc-row-label{user-select:text;-webkit-user-select:text}
    `;
    document.head.insertAdjacentHTML('beforeend','<style id="h52-style">'+css+'</style>');
  }

  async function h52SearchDictWord(word,el){
    const w=h52ToSimpSync(word).trim();
    if(!w)return;
    try{el&&el.classList.add('active');}catch{}
    const q=document.getElementById('dict-q');
    if(q)q.value=w;
    try{v29DictTab='defs';}catch{}
    try{v29DictTerm=w;}catch{}
    try{await v29RunDict(w);}catch{try{await window.v29RunDict(w);}catch{}}
  }

  function h52LocalEntry(w){
    try{return v34EntryLocal(w)||v30LocalEntry(w)||null;}catch{}
    try{return v30LocalEntry(w)||null;}catch{}
    return null;
  }
  function h52WordDefs(entry){
    if(!entry)return '';
    const arr=entry.defs||entry.en||entry.pt||entry.definitions||[];
    if(Array.isArray(arr))return arr.slice(0,3).join('; ');
    return h52Text(arr).slice(0,160);
  }

  function h52PaintDictWords(q,out,combined){
    if(!out)return;
    if(!combined.length){out.innerHTML='<div class="dict-empty">Não encontrei palavras relacionadas a este termo.</div>';return;}
    const playIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
    const rows=combined.map((w,i)=>{
      const e=h52LocalEntry(w)||{};
      const py=e.pinyin||e.py||((typeof getWordPY==='function')?getWordPY(w):'');
      const lv=(()=>{try{return HSK_LEVEL.get(w);}catch{return ''}})();
      const defs=h52WordDefs(e)||'Toque na linha para expandir. Toque exatamente na palavra para pesquisar.';
      const trad=e.trad&&h52ToSimpSync(e.trad)!==w?` <span class="trad">〔${h52Esc(typeof v29TradMask==='function'?v29TradMask(w,e.trad):e.trad)}〕</span>`:'';
      return `<div class="lexi-acc-row h52-word-row" data-acc-idx="${i}"><div class="lexi-acc-row-label"><span class="dict-word-link" role="button" tabindex="0" data-dict-word="${h52Esc(w)}">${h52Esc(w)}</span>${trad}<span style="color:#8a8170;font-size:12px;margin-left:8px">${h52Esc(py)}${lv?' • HSK '+lv:''}</span><div class="en" style="font-size:14px;color:#bfb7aa;margin-top:4px">${h52Esc(defs)}</div></div>${(typeof v39SaveButtonHtml==='function')?v39SaveButtonHtml(w):''}<button class="dict-audio v34-svg-only" data-word-idx="${i}" style="margin-right:6px">${playIcon}</button><svg class="lexi-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="lexi-acc-panel" id="acc-panel-${i}"></div>`;
    }).join('');
    out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Palavras que usam “'+h52Esc(q)+'”</div><div class="lexi-acc-hint" style="margin:0 0 8px">Toque na palavra em chinês para pesquisar; toque fora dela para expandir.</div><div class="lexi-entry">'+rows+'</div></div>';
    out.querySelectorAll('.dict-word-link').forEach(el=>{
      const run=e=>{e.preventDefault();e.stopPropagation();h52SearchDictWord(el.dataset.dictWord||el.textContent,el);};
      el.onclick=run;
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){run(e);}};
    });
    out.querySelectorAll('[data-word-idx]').forEach(btn=>{
      const w=combined[parseInt(btn.dataset.wordIdx,10)];
      if(!w)return;
      btn.onclick=async e=>{e.stopPropagation();const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';try{await speakWordMode(w,'natural');}catch(err){try{toast('Falha ao reproduzir: '+(err.message||err));}catch{}}finally{btn.disabled=false;btn.innerHTML=old;}};
    });
    try{v39BindSaveButtons(out);}catch{}
    try{v39BindAccordion(out,combined);}catch{}
  }

  async function h52RenderDictWords(q,out){
    void h52EnsureTradSimp();
    q=h52ToSimpSync(q).trim();
    if(!out)return;
    const requestId=String((Number(out.dataset.h52WordsRequest)||0)+1);
    out.dataset.h52WordsRequest=requestId;
    if(!q){out.innerHTML='<div class="dict-empty">Pesquise uma palavra ou ideograma.</div>';return;}
    const qChars=[...q].filter(ch=>{try{return isCJK(ch);}catch{return /[\u3400-\u9fff]/.test(ch);}});
    const words=new Set();
    const addWord=raw=>{const w=h52ToSimpSync(raw||'');if(w&&w!==q&&h52Contains(w,q))words.add(w);};
    try{(v34CandidateWords(q)||[]).forEach(addWord);}catch{}
    try{[...HSK_LEVEL.keys(),...SEG_WORDS].forEach(raw=>{const w=h52ToSimpSync(raw);if(w&&w!==q&&w.length>1&&qChars.some(ch=>w.includes(ch)))words.add(w);});}catch{}

    // Renderiza o banco local imediatamente. As fontes remotas apenas enriquecem
    // a lista depois, sem deixar a primeira abertura vazia e sem bloquear a aba.
    const initial=[...words].slice(0,70);
    if(initial.length)h52PaintDictWords(q,out,initial);
    else out.innerHTML='<div class="dict-results-lexi h52-final-loading"><div class="dict-subtitle">Palavras relacionadas</div><div class="lexi-entry h54-skeleton"><div class="h54-skeleton-line"></div><div class="h54-skeleton-line short"></div></div></div>';

    void Promise.allSettled([
      Promise.resolve().then(()=>lookupSogouSuggestions(q)),
      Promise.resolve().then(()=>v34CedictEntries(q))
    ]).then(results=>{
      if(!out.isConnected||out.dataset.h52WordsRequest!==requestId)return;
      const sogou=results[0]&&results[0].status==='fulfilled'?results[0].value:[];
      const cedict=results[1]&&results[1].status==='fulfilled'?results[1].value:[];
      try{(sogou||[]).forEach(s=>addWord(s.word||s.k||''));}catch{}
      try{(cedict||[]).forEach(e=>addWord(e.simp||e.word||''));}catch{}
      h52PaintDictWords(q,out,[...words].slice(0,70));
    });
  }

  async function h52Tatoeba(q){
    const n=h52ToSimpSync(h52Cjk(q)||q).trim();
    const found=[];
    const seen=new Set();
    if(!n)return found;
    const push=async(text,translations,src)=>{
      const zh=await h52SimplifySentenceAsync(text||'');
      if(!zh||!h52Contains(zh,n)||seen.has(zh))return;
      seen.add(zh);
      const trs=Array.isArray(translations)?translations.filter(Boolean):[translations].filter(Boolean);
      found.push({text:zh,translations:trs,src:src||'Tatoeba'});
    };

    // Mantém o mesmo caminho que já funcionava antes do patch visual/trad-simp:
    // lookupTatoebaExamples() usa https://api.tatoeba.org/v1/sentences.
    // A aba Frases do dicionário NÃO deve chamar o caminho legado, porque esse
    // endpoint legado redireciona (302) em produção/mobile e quebra a leitura JSON/CORS.
    try{
      if(typeof lookupTatoebaExamples==='function'){
        const rows=await lookupTatoebaExamples(n,18);
        for(const row of rows||[])await push(row.text,row.translations,row.src||'Tatoeba');
      }
    }catch{}

    const fetchV1=async(transLang)=>{
      const p=new URLSearchParams();
      p.set('lang','cmn');
      p.set('q',n);
      if(transLang)p.set('trans:lang',transLang);
      p.set('showtrans','matching');
      p.set('sort','relevance');
      p.set('limit','24');
      const url='https://api.tatoeba.org/v1/sentences?'+p.toString();
      try{
        const opts={cache:'no-store'};
        if(typeof AbortSignal!=='undefined'&&AbortSignal.timeout)opts.signal=AbortSignal.timeout(7500);
        const r=await fetch(url,opts);
        if(!r.ok)return;
        const d=await r.json();
        for(const row of d.data||[]){
          const flat=Array.isArray(row.translations)?row.translations.flat(Infinity):[];
          const trs=flat.filter(t=>t&&t.text&&(!transLang||t.lang===transLang)&&!t.is_unapproved).map(t=>t.text);
          await push(row.text,trs,transLang==='por'?'Tatoeba PT':'Tatoeba EN');
        }
      }catch{}
    };

    if(found.length<12)await fetchV1('por');
    if(found.length<12)await fetchV1('eng');
    return found.slice(0,22);
  }
  function h52PaintDictSentences(q,out,sents){
    if(!out)return;
    if(!sents.length){out.innerHTML='<div class="dict-empty">Não encontrei frases que contenham exatamente este termo agora.</div>';return;}
    const playIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
    out.innerHTML='<div class="dict-results-lexi"><div class="dict-subtitle">Frases com “'+h52Esc(q)+'”</div>'+sents.map((s,i)=>{
      const py=(typeof getWordPY==='function'?getWordPY(s.text):'')||'';
      const zh=(typeof v41RenderSentenceWithHighlight==='function')?v41RenderSentenceWithHighlight(s.text,q):h52Esc(s.text);
      const save=(typeof v41SaveSentenceButtonHtml==='function')?v41SaveSentenceButtonHtml(s.text,s.translations,q):'';
      return `<div class="sent-card v37"><div class="sent-top"><div><div class="sent-zh">${zh}</div><div class="sent-py"><b>${h52Esc(py)}</b></div></div><div class="hz-sent-actions"><button class="dict-audio v34-svg-only" data-sent-idx="${i}">${playIcon}</button>${save}</div></div><div class="sent-tr">${s.translations&&s.translations.length?h52Esc(s.translations[0]):'Tradução indisponível nesta fonte.'}</div><div class="sent-src"><b>${h52Esc(s.src||'Banco de frases')}</b> • contém “${h52Esc(q)}”</div></div>`;
    }).join('')+'</div>';
    try{v41BindSaveSentenceButtons(out);}catch{}
    out.querySelectorAll('[data-sent-idx]').forEach(btn=>{
      const s=sents[parseInt(btn.dataset.sentIdx,10)];
      if(!s)return;
      btn.onclick=async e=>{e.stopPropagation();const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';try{if(typeof window.v36Speak==='function')await window.v36Speak(s.text,'sentence');else await speakWordMode(s.text,'natural');}catch(err){try{toast('Falha ao reproduzir: '+(err.message||err));}catch{}}finally{btn.disabled=false;btn.innerHTML=old;}};
    });
  }

  async function h52RenderDictSentences(q,out){
    void h52EnsureTradSimp();
    q=h52ToSimpSync(h52Cjk(q)||q).trim();
    if(!out)return;
    const requestId=String((Number(out.dataset.h52SentencesRequest)||0)+1);
    out.dataset.h52SentencesRequest=requestId;
    if(!q){out.innerHTML='<div class="dict-empty">Pesquise uma palavra ou ideograma.</div>';return;}
    const map=new Map();
    const push=async s=>{
      const raw=s.text||s.zh||'';
      if(!raw)return;
      const text=await h52SimplifySentenceAsync(raw);
      if(!text||!h52Contains(text,q)||map.has(text))return;
      const trs=s.translations||(s.tr?[s.tr]:(s.en?[s.en]:(s.pt?[s.pt]:[])));
      map.set(text,{text,translations:Array.isArray(trs)?trs.filter(Boolean):[trs].filter(Boolean),src:s.src||'Banco de frases'});
    };

    // Monta o conteúdo local na primeira entrada; a rede enriquece em segundo plano.
    try{if(typeof V34_SENTENCES!=='undefined')for(const s of V34_SENTENCES)await push(s);}catch{}
    try{if(typeof V29_LOCAL_SENTENCES!=='undefined')for(const s of V29_LOCAL_SENTENCES)await push({text:s.zh,translations:s.tr?[s.tr]:[],src:'Local'});}catch{}
    const initial=[...map.values()].slice(0,22);
    if(initial.length)h52PaintDictSentences(q,out,initial);
    else out.innerHTML='<div class="dict-results-lexi h52-final-loading"><div class="dict-subtitle">Frases com o termo pesquisado</div><div class="sent-card h54-skeleton"><div class="h54-skeleton-line"></div><div class="h54-skeleton-line short"></div></div><div class="sent-card h54-skeleton"><div class="h54-skeleton-line"></div><div class="h54-skeleton-line short"></div></div></div>';

    void (async()=>{
      try{for(const s of await h52Tatoeba(q)||[])await push(s);}catch{}
      if(!out.isConnected||out.dataset.h52SentencesRequest!==requestId)return;
      h52PaintDictSentences(q,out,[...map.values()].slice(0,22));
    })();
  }


  const h53DictionaryCache=new Map();
  let h53FallbackPromise=null;
  function h53HasDefs(result){return Boolean(result&&Array.isArray(result.defs)&&result.defs.some(group=>Array.isArray(group.defs)&&group.defs.some(def=>String(def&&def.text||'').trim())));}
  function h53StandardizeDefs(result){
    if(!result)return null;
    const groups=[];const seen=new Set();
    for(const group of result.defs||[]){
      const defs=[];
      for(const raw of group.defs||[]){
        const text=String(typeof raw==='string'?raw:raw&&raw.text||'').trim();if(!text||seen.has(text))continue;seen.add(text);defs.push({text,ex:Array.isArray(raw&&raw.ex)?raw.ex:[],pyHint:raw&&raw.pyHint||null});
      }
      if(defs.length)groups.push({pos:String(group.pos||''),defs});
    }
    return{...result,defs:groups};
  }
  async function h53FallbackEntries(){
    if(h53FallbackPromise)return h53FallbackPromise;
    h53FallbackPromise=fetch('db/dictionary-fallbacks.json',{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(data=>data&&data.entries||{}).catch(()=>({}));
    return h53FallbackPromise;
  }
  function h53EntriesToResult(term,entries){
    const defs=[];let source='';let pinyin='';let traditional='';
    for(const entry of entries||[]){
      const rows=[];
      for(const text of [...(entry.pt||[]),...(entry.en||[]),...(entry.defs||[])]){const clean=String(typeof text==='string'?text:text&&text.text||'').trim();if(clean)rows.push({text:clean,ex:[]});}
      if(rows.length)defs.push({pos:entry.pos||'',defs:rows});
      pinyin=pinyin||entry.pinyin||'';traditional=traditional||entry.trad||entry.traditional||'';source=source||entry.src||'';
    }
    return defs.length?{term,defs,src:source||'Dicionário local',pinyin,traditional}:null;
  }
  function h53RememberTerm(term){
    try{const current=JSON.parse(localStorage.getItem('hzDictionaryRecent.v1')||'[]');const next=[...(Array.isArray(current)?current:[]).filter(item=>item!==term),term].slice(-60);localStorage.setItem('hzDictionaryRecent.v1',JSON.stringify(next));}catch{}
  }
  async function h53ResolveDictionaryEntry(rawTerm){
    await h52EnsureTradSimp();
    const term=h52ToSimpSync(h52Cjk(rawTerm)||rawTerm).trim();if(!term)return null;
    h53RememberTerm(term);
    const cached=h53DictionaryCache.get(term);if(cached&&Date.now()-cached.at<600000)return cached.value;
    // v5.1: cache positivo persistente (IndexedDB) — nunca guarda negativos.
    if(window.hzStore?.dictGet){try{const persisted=await window.hzStore.dictGet(term);if(persisted&&h53HasDefs(persisted)){h53DictionaryCache.set(term,{at:Date.now(),value:persisted});return persisted;}}catch{}}
    let result=null;
    try{const localExact=v34EntryLocal(term);if(localExact)result=h53EntriesToResult(term,[{...localExact,src:'Dicionário local'}]);}catch{}
    if(!h53HasDefs(result)){
      const fallback=await h53FallbackEntries();
      const variants=[term,h52Text(rawTerm).trim(),h52ToSimpSync(h52Text(rawTerm).trim())].filter(Boolean);
      const packaged=variants.map(key=>fallback[key]).find(Boolean);
      if(packaged){
        const groups=[];
        for(const reading of packaged.readings||[]){
          const defs=[...(reading.pt||[]),...(reading.en||[])].filter(Boolean).map(text=>({text,ex:[],pyHint:reading.pinyin||null}));
          if(defs.length)groups.push({pos:'tradução',defs});
        }
        if(!groups.length)groups.push({pos:'tradução',defs:[...(packaged.pt||[]),...(packaged.en||[])].filter(Boolean).map(text=>({text,ex:[]}))});
        result={term,pinyin:packaged.pinyin||'',hsk:packaged.hsk||null,src:'Dicionário local',defs:groups};
      }
    }
    // Primeiro reutiliza o resolvedor antigo validado (Local + CC-CEDICT). Só
    // depois consulta as rotas públicas mais lentas; assim uma falha de rede não
    // transforma uma entrada local válida em "sem resposta".
    if(!h53HasDefs(result)){
      try{const entries=await v34LookupEntries(term);result=h53EntriesToResult(term,entries)||result;}catch{}
    }
    if(!h53HasDefs(result)){try{result=h53StandardizeDefs(await lookupAll(term));}catch{}}
    // v5.1: resgate final para ideogramas de um único caractere — normaliza a
    // entrada, testa variantes simplificada/tradicional e consulta CC-CEDICT
    // e o banco local antes de aceitar "sem definição".
    if(!h53HasDefs(result)&&typeof window.hzResolveSingleCharFallback==='function'){
      try{const rescued=await window.hzResolveSingleCharFallback(term);if(rescued&&h53HasDefs(rescued))result=h53StandardizeDefs({...rescued,term});}catch{}
    }
    if(result){
      result=h53StandardizeDefs(result);result.term=term;result.pinyin=result.pinyin||(typeof getWordPY==='function'?getWordPY(term):'');
      try{result.hsk=result.hsk||HSK_LEVEL.get(term)||null;}catch{}
      try{const local=v34EntryLocal(term);if(local){result.pinyin=result.pinyin||local.pinyin||'';result.traditional=result.traditional||local.trad||'';}}catch{}
    }
    // Resultados positivos valem 10 min em memória (e persistem); uma falha
    // (possivelmente de rede) fica só 30 s, para a próxima busca tentar de novo.
    if(h53HasDefs(result)){h53DictionaryCache.set(term,{at:Date.now(),value:result});try{window.hzStore?.dictPut?.(term,result);}catch{}}
    else h53DictionaryCache.set(term,{at:Date.now()-570000,value:result});
    return result;
  }
  window.resolveDictionaryEntry=h53ResolveDictionaryEntry;

  async function h54RenderDictDefs(rawQuery,out){
    if(!out)return;
    await h52EnsureTradSimp();
    const q=h52ToSimpSync(h52Cjk(rawQuery)||rawQuery).trim();
    if(!q){out.innerHTML=H52_EMPTY_DICT;return;}
    const requestId=`defs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    out.dataset.h54DefsRequest=requestId;
    const py=(typeof getWordPY==='function'?getWordPY(q):'')||'';
    const playIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
    // O esqueleto já usa a geometria final. Nenhuma tela legada é pintada antes
    // dele, eliminando o flash de layout nas abas DICIO/FRASES.
    out.innerHTML=`<div class="dict-results-lexi h54-dict-final" data-dict-query="${h52Esc(q)}"><div class="lexi-hero"><div class="lexi-word-col"><div class="lexi-zh ${[...q].length>3?'small':''}">${typeof v40WordDisplayHtml==='function'?v40WordDisplayHtml(q):h52Esc(q)}</div><div class="lexi-py">${h52Esc(py)}</div><div class="lexi-source-label"></div></div><div class="h54-stroke-slot"></div><div class="lexi-hero-actions"><button class="dict-audio v34-svg-only h54-main-audio" type="button">${playIcon}</button>${typeof v39SaveButtonHtml==='function'?v39SaveButtonHtml(q):''}</div></div><div class="h54-steps-slot"></div><div class="h54-defs-slot"><div class="lexi-entry h54-skeleton"><div class="h54-skeleton-line"></div><div class="h54-skeleton-line short"></div></div></div></div>`;
    const root=out.querySelector('.h54-dict-final'),defsSlot=root?.querySelector('.h54-defs-slot');
    if(!root||!defsSlot)return;
    const audioBtn=root.querySelector('.h54-main-audio');
    if(audioBtn)audioBtn.onclick=async()=>{if(audioBtn.disabled)return;audioBtn.disabled=true;const old=audioBtn.innerHTML;audioBtn.innerHTML='<span class="spin sm" style="width:13px;height:13px;border-width:2px"></span>';try{await speakWordMode(q,'natural');}catch{}finally{if(audioBtn.isConnected){audioBtn.disabled=false;audioBtn.innerHTML=old;}}};
    try{v39BindSaveButtons(root);}catch{}
    if([...q].filter(ch=>{try{return isCJK(ch);}catch{return /[\u3400-\u9fff]/.test(ch);}}).length===1){
      void (async()=>{
        let stroke=null;try{stroke=await lookupStrokeOrder(q);}catch{}
        if(!out.isConnected||out.dataset.h54DefsRequest!==requestId)return;
        const slot=root.querySelector('.h54-stroke-slot');if(!slot)return;
        // v5.1: painel compartilhado — GIF + botão "Passos" (mesma lógica
        // validada em v3.9/v4.1), com recolhimento e imagens por etapa.
        if(typeof window.hzMountStrokePanel==='function'){
          window.hzMountStrokePanel({slot,stepsHost:root.querySelector('.h54-steps-slot'),stroke,char:q});
        }else if(stroke?.gif){slot.innerHTML=`<button class="lexi-stroke-card h54-stroke-button" type="button"><img src="${h52Esc(stroke.gif)}" alt="Ordem dos traços"></button>`;slot.querySelector('button').onclick=()=>{try{v41OpenGifModal(stroke.gif,q);}catch{}};}
      })();
    }
    let result=null;try{result=await h53ResolveDictionaryEntry(q);}catch{}
    if(!out.isConnected||out.dataset.h54DefsRequest!==requestId)return;
    const source=root.querySelector('.lexi-source-label');if(source)source.textContent=result?.src||'Dicionário local';
    const pyEl=root.querySelector('.lexi-py');if(pyEl&&result?.pinyin)pyEl.textContent=result.pinyin;
    let html='';
    if(h53HasDefs(result)){
      const hints=new Set();for(const group of result.defs||[])for(const def of group.defs||[])if(def.pyHint)hints.add(def.pyHint);
      let index=0;
      for(const group of (result.defs||[]).slice(0,8)){
        const rows=(group.defs||[]).slice(0,8);if(!rows.length)continue;
        html+='<div class="lexi-entry">';if(group.pos)html+=`<div class="lexi-pos">${h52Esc(group.pos)}</div>`;
        for(const def of rows){index++;const reading=hints.size>1&&def.pyHint?` <span class="lexi-def-reading">— ${h52Esc(q)}: ${h52Esc(def.pyHint)}</span>`:'';html+=`<div class="lexi-def"><div class="lexi-def-label">Definição ${index}${reading}</div>${typeof v39TransButton==='function'?v39TransButton(def.text):h52Esc(def.text)}</div>`;}
        html+='</div>';
      }
    }else html='<div class="lexi-entry"><div class="dict-empty">Não encontrei uma definição local para este termo. As fontes públicas serão consultadas novamente na próxima pesquisa.</div></div>';
    try{const grammar=v42FindGrammar(q);if(grammar?.length)html+=grammar.map(g=>`<div class="lexi-entry"><div class="lexi-section-title">Gramática — ${h52Esc(g.title)}</div><div class="lexi-grammar-pattern">${h52Esc(g.pattern)}</div><div class="lexi-def" style="border-bottom:0">${h52Esc(g.explanation)}</div></div>`).join('');}catch{}
    if(result?.charDefs?.length){html+='<div class="lexi-entry"><div class="lexi-section-title">Ideograma por ideograma</div>'+result.charDefs.map(c=>`<div class="lexi-def"><b>${h52Esc(c.ch)}</b> — ${c.text?(typeof v39TransButton==='function'?v39TransButton(c.text):h52Esc(c.text)):'—'}</div>`).join('')+'</div>';}
    const related=(result?.sogou||[]).map(item=>item.word).filter(Boolean).slice(0,10);
    if(related.length){html+=`<div class="lexi-entry"><div class="lexi-section-title">Termos relacionados</div><div class="lexi-acc-hint">Toque numa palavra para ver a definição completa</div>${related.map((word,i)=>`<div class="lexi-acc-row" data-acc-idx="${i}"><div class="lexi-acc-row-label">${typeof v40WordDisplayHtml==='function'?v40WordDisplayHtml(word):h52Esc(word)}</div>${typeof v39SaveButtonHtml==='function'?v39SaveButtonHtml(word):''}<svg class="lexi-acc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div><div class="lexi-acc-panel" id="acc-panel-${i}"></div>`).join('')}</div>`;}
    defsSlot.innerHTML=html;
    try{v39BindTransButtons(defsSlot);v39BindSaveButtons(defsSlot);v39BindAccordion(defsSlot,related);}catch{}
  }
  h54RenderDictDefs.__h52Final=true;h54RenderDictDefs.__tradSimpV2=true;

  function h52PostProcessTipSentences(){
    setTimeout(async()=>{
      await h52EnsureTradSimp();
      const root=document.getElementById('tip-body');
      if(!root)return;
      const word=h52ToSimpSync((()=>{try{return defWord||'';}catch{return ''}})());
      const cards=[...root.querySelectorAll('.tip-ex-card,.sent-card,.lexi-ex')];
      for(const card of cards){
        const zhEl=card.querySelector('.tip-ex-zh,.sent-zh,.lexi-ex-zh');
        if(!zhEl)continue;
        const raw=zhEl.textContent.trim();
        const simp=await h52SimplifySentenceAsync(raw);
        if(!simp||simp===raw)continue;
        try{zhEl.innerHTML=(typeof v41RenderSentenceWithHighlight==='function')?v41RenderSentenceWithHighlight(simp,word):h52Esc(simp);}catch{zhEl.textContent=simp;}
        const py=card.querySelector('.tip-ex-py,.sent-py,.lexi-ex-py');
        if(py)py.textContent=(typeof getWordPY==='function'?getWordPY(simp):'');
        card.querySelectorAll('[data-ex-text],[data-sent-play],[data-v34-speak]').forEach(btn=>{
          if(btn.dataset.exText!==undefined)btn.dataset.exText=simp;
          if(btn.dataset.sentPlay!==undefined)btn.dataset.sentPlay=simp;
          if(btn.dataset.v34Speak!==undefined)btn.dataset.v34Speak=simp;
        });
        card.querySelectorAll('.v41-save-sent-btn,[data-sent-text]').forEach(btn=>{if(btn.dataset.sentText!==undefined)btn.dataset.sentText=simp;});
      }
    },0);
  }

  function h52ResetDict(){
    try{v29DictTerm='';v29DictTab='defs';}catch{}
    const q=document.getElementById('dict-q');if(q)q.value='';
    const out=document.getElementById('dict-results');if(out)out.innerHTML=H52_EMPTY_DICT;
    document.querySelectorAll('.dict-tab').forEach(x=>x.classList.toggle('on',x.dataset.dtab==='defs'));
    const wrap=document.querySelector('#sx .dict-wrap');if(wrap)wrap.scrollTop=0;
  }
  function h52ResetTransientSearch(){
    try{searchQ='';}catch{}
    const sin=document.getElementById('sin');if(sin)sin.value='';
    const sbar=document.getElementById('sbar');if(sbar)sbar.classList.remove('open','vis');
    const v43=document.getElementById('v43-search');if(v43)v43.value='';
  }
  function h52ResetNonReaderScroll(id){
    if(id==='sr')return;
    requestAnimationFrame(()=>{
      try{window.scrollTo(0,0);}catch{}
      const root=document.getElementById(id);
      const nodes=[];
      if(root)nodes.push(root,...root.querySelectorAll('.bc,.wc,.sc,.dict-wrap,.dict-list,.simple-list,.lib-grid,.mscroll,#bc,#wc,#dc,#dict-results'));
      nodes.forEach(el=>{try{el.scrollTop=0;}catch{}});
    });
  }
  function h52ActiveScreen(){return document.querySelector('.screen.active')?.id||'';}

  function h52Patch(){
    h52InstallCss();
    try{
      if(typeof v29RenderDictDefs==='function'&&!v29RenderDictDefs.__h52Final){
        v29RenderDictDefs=h54RenderDictDefs;
        v29RenderDictDefs.__h52Final=true;
        v29RenderDictDefs.__tradSimpV2=true;
        window.v29RenderDictDefs=v29RenderDictDefs;
      }
    }catch{}
    try{
      if(typeof v29RenderDictWords==='function'&&!v29RenderDictWords.__h52Final){
        v29RenderDictWords=h52RenderDictWords;
        v29RenderDictWords.__h52Final=true;
        v29RenderDictWords.__tradSimpV2=true;
        window.v29RenderDictWords=v29RenderDictWords;
      }
    }catch{}
    try{
      if(typeof v29RenderDictSentences==='function'&&!v29RenderDictSentences.__h52Final){
        v29RenderDictSentences=h52RenderDictSentences;
        v29RenderDictSentences.__h52Final=true;
        v29RenderDictSentences.__tradSimpV2=true;
        window.v29RenderDictSentences=v29RenderDictSentences;
      }
    }catch{}
    try{
      if(typeof renderTipDefs==='function'&&!renderTipDefs.__h52Final){
        const old=renderTipDefs;
        renderTipDefs=function(result){const r=old.apply(this,arguments);h52PostProcessTipSentences();return r;};
        renderTipDefs.__h52Final=true;
        window.renderTipDefs=renderTipDefs;
      }
    }catch{}
    try{
      if(typeof openBook==='function'&&!openBook.__h52Final){
        const old=openBook;
        openBook=async function(id){await h52TreatBookById(id);return old.call(this,id);};
        openBook.__h52Final=true;
        window.openBook=openBook;
      }
    }catch{}
    try{
      if(typeof v29OpenSimpleReading==='function'&&!v29OpenSimpleReading.__h52Final){
        const old=v29OpenSimpleReading;
        v29OpenSimpleReading=async function(id){await h52TreatBookById(id);return old.call(this,id);};
        v29OpenSimpleReading.__h52Final=true;
        window.v29OpenSimpleReading=v29OpenSimpleReading;
      }
    }catch{}
    try{
      if(typeof v29OpenBookChapter==='function'&&!v29OpenBookChapter.__h52Final){
        const old=v29OpenBookChapter;
        v29OpenBookChapter=async function(id,idx){await h52TreatBookById(id);return old.call(this,id,idx);};
        v29OpenBookChapter.__h52Final=true;
        window.v29OpenBookChapter=v29OpenBookChapter;
      }
    }catch{}
    try{
      if(typeof loadLib==='function'&&!loadLib.__h52Final){
        const old=loadLib;
        loadLib=async function(){const r=await old.apply(this,arguments);h52MigrateStoredLibrary();return r;};
        loadLib.__h52Final=true;
        window.loadLib=loadLib;
      }
    }catch{}
    try{
      if(typeof showScreen==='function'&&!showScreen.__h52Final){
        const old=showScreen;
        showScreen=function(id){
          const prev=h52ActiveScreen();
          if(prev&&prev!==id){
            h52ResetTransientSearch();
            if(prev==='sx')h52ResetDict();
          }
          if(id==='sx'&&prev!==id)h52ResetDict();
          const r=old.call(this,id);
          if(id!=='sr')h52ResetTransientSearch();
          h52ResetNonReaderScroll(id);
          return r;
        };
        showScreen.__h52Final=true;
        window.showScreen=showScreen;
      }
    }catch{}
  }

  function h52Boot(){
    h52Patch();
    hzScheduleIdle(()=>h52EnsureTradSimp().then(()=>{h52Patch();return h52MigrateStoredLibrary();}),2800);
  }
  // Instala os renderizadores finais durante a própria avaliação do módulo. O
  // DOMContentLoaded fica apenas para migrações que dependem de nós visíveis.
  h52Patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',h52Boot,{once:true});else h52Boot();
})();
