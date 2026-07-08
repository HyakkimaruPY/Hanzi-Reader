
const DB='hanzi_r2',DBV=3,STB='books',STW='words';
let db=null,books=[],words=[],curBook=null;
let fontSize=38,showPinyin=true,pinyinLevelMode=false,pinyinMinLevel=2;
let defWord='',defDefs=null,defPy='',defOriginalPy='',defNaturalPy='',defToneInfo=null;
let readerTokens=[],readerCharRefs=[];
let searchQ='';
let curAudio=null;

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
function applyFontSize(){document.documentElement.style.setProperty('--fs',fontSize+'px');['fs-val','sfs-val'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fontSize;});requestAnimationFrame(()=>requestAnimationFrame(()=>{try{v37FixPinyinOverlap();}catch{}}));}
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
function buildHanziCells(word,parts){return[...word].map((ch,i)=>{const py=parts&&parts[i]?` data-py="${esc(parts[i])}"`:'';return`<span class="hzch notranslate" translate="no" lang="zh-CN"${py}>${esc(ch)}</span>`;}).join('');}
function levelClass(level){return level>=1&&level<=6?'lv'+level:'lvx';}
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
  return`<span class="wunit notranslate ${lvcls}${hidden}${target}${uncls}" translate="no" lang="zh-CN" data-tid="${tid}" data-lv="${level>=1&&level<=6?level:'x'}" data-ci="${ci}" data-cilen="${[...word].length}" onclick="onTap(this)"><span class="hzrow notranslate" translate="no" lang="zh-CN">${buildHanziCells(word,pyInfo.parts)}</span></span>`;
}
async function waitPinyin(){
  if(window.pinyinFn)return;
  await new Promise(res=>{
    const t=setTimeout(res,3000);
    document.addEventListener('pinyin-ready',()=>{clearTimeout(t);res();},{once:true});
  });
}
function buildHTML(text){
  text=String(text||'');
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
function v40ToSimplified(text){
  if(!text)return text;
  const chars=[...text];
  let out='';
  let i=0;
  while(i<chars.length){
    let matched=false;
    for(let len=Math.min(V40_MAX_KEY_LEN,chars.length-i);len>1;len--){
      const sub=chars.slice(i,i+len).join('');
      if(V40_TRAD_TO_SIMP[sub]){out+=V40_TRAD_TO_SIMP[sub];i+=len;matched=true;break;}
    }
    if(matched)continue;
    out+=V40_TRAD_TO_SIMP[chars[i]]||chars[i];
    i++;
  }
  return out;
}
function v40WordDisplayHtml(word){
  const chars=[...String(word||'')];
  let hasTrad=false;
  const simpChars=chars.map(ch=>{
    if(V40_TRAD_TO_SIMP[ch]){hasTrad=true;return V40_TRAD_TO_SIMP[ch];}
    return ch;
  });
  if(!hasTrad)return esc(word);
  const diffChars=chars.map(ch=>V40_TRAD_TO_SIMP[ch]?ch:'-');
  return `${esc(simpChars.join(''))} <span class="trad-diff">(${esc(diffChars.join(''))})</span>`;
}
async function lookupTatoebaExamples(word,limit=6){
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
function v42FindGrammar(word){
  if(!word)return[];
  return V42_GRAMMAR_DICT.filter(g=>word.includes(g.trigger)).slice(0,3);
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
const V43_COVER='https://dn721903.ca.archive.org/0/items/fu-na-fever-guzheng-3cd/Cover.jpg';
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
let v43Audio=null,v43CurrentTrackId=null,v43IsShuffled=false,v43IsRepeating=false,v43CelebrationMode=false,v43CelebEndTimer=null,v43CelebSegEnd=0;
function v43GetAudioEl(){
  if(!v43Audio){
    v43Audio=new Audio();
    v43Audio.addEventListener('ended',()=>v43OnTrackEnded());
    v43Audio.addEventListener('timeupdate',()=>v43OnTimeUpdate());
  }
  return v43Audio;
}
function v43StopMusic(){
  if(v43Audio){try{v43Audio.pause();}catch{}}
  if(v43CelebEndTimer){clearTimeout(v43CelebEndTimer);v43CelebEndTimer=null;}
  v43CelebrationMode=false;
  v43CurrentTrackId=null;
  const mini=document.getElementById('v43-mini-player');if(mini)mini.remove();
  setTimeout(v43StartPreload,800);
}
function v43OnTrackEnded(){
  if(v43CelebrationMode)return;
  if(v43IsRepeating){v43Audio.currentTime=0;v43Audio.play().catch(()=>{});return;}
  v43PlayNextTrack();
}
function v43OnTimeUpdate(){
  if(v43CelebrationMode){
    const fill=document.getElementById('v43-mini-fill');
    const timeEl=document.getElementById('v43-mini-time');
    if(fill){const pct=Math.min(100,((v43Audio.currentTime-(v43CelebSegEnd-V43_SEG_LEN))/V43_SEG_LEN)*100);fill.style.width=Math.max(0,pct)+'%';}
    if(timeEl)timeEl.textContent=`${v43Fmt(v43Audio.currentTime-(v43CelebSegEnd-V43_SEG_LEN))} / ${v43Fmt(V43_SEG_LEN)}`;
    if(v43Audio.currentTime>=v43CelebSegEnd){try{v43Audio.pause();}catch{}}
    return;
  }
  v43UpdateFullPlayerUI();
}
let v43PreloadedInfo=null,v43PreloadPending=false;
function v43StartPreload(){
  if(v43CurrentTrackId!=null||v43PreloadedInfo||v43PreloadPending)return; // já tem algo tocando ou pronto
  v43PreloadPending=true;
  const trackId=Math.floor(Math.random()*V43_TRACKS.length);
  const track=V43_TRACKS[trackId];
  const start=v43PickSegmentStart(trackId);
  const audio=v43GetAudioEl();
  audio.preload='auto';
  audio.src=track.url;
  const onMeta=()=>{
    try{audio.currentTime=start;}catch{}
    v43PreloadedInfo={trackId,track,start};
    v43PreloadPending=false;
    audio.removeEventListener('loadedmetadata',onMeta);
  };
  audio.addEventListener('loadedmetadata',onMeta);
}
function v43ReleasePreload(){
  if(v43CurrentTrackId!=null)return; // não mexe se algo estiver realmente tocando
  if(v43Audio){try{v43Audio.pause();v43Audio.removeAttribute('src');v43Audio.load();}catch{}}
  v43PreloadedInfo=null;v43PreloadPending=false;
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)v43ReleasePreload();
  else setTimeout(v43StartPreload,1000);
});
setTimeout(v43StartPreload,3000);
function v43PlayCelebrationTrack(){
  const audio=v43GetAudioEl();
  let trackId,track,start,alreadyBuffered=false;
  if(v43PreloadedInfo&&audio.src===v43PreloadedInfo.track.url){
    ({trackId,track,start}=v43PreloadedInfo);
    alreadyBuffered=true;
  }else{
    trackId=Math.floor(Math.random()*V43_TRACKS.length);
    track=V43_TRACKS[trackId];
    start=v43PickSegmentStart(trackId);
    audio.src=track.url;
  }
  v43CelebrationMode=true;
  v43CurrentTrackId=trackId;
  v43PreloadedInfo=null;
  const doPlay=()=>{audio.currentTime=start;audio.play().catch(()=>{});};
  if(alreadyBuffered)doPlay();
  else{const onMeta=()=>{doPlay();audio.removeEventListener('loadedmetadata',onMeta);};audio.addEventListener('loadedmetadata',onMeta);}
  v43CelebSegEnd=start+V43_SEG_LEN;
  if(v43CelebEndTimer)clearTimeout(v43CelebEndTimer);
  v43CelebEndTimer=setTimeout(()=>{try{audio.pause();}catch{}v43CelebrationMode=false;v43CurrentTrackId=null;v43CelebEndTimer=null;setTimeout(v43StartPreload,900);},V43_SEG_LEN*1000+300);
  return{trackId,track,start};
}
function v43PlayFullTrack(trackId){
  const track=V43_TRACKS[trackId];
  if(!track)return;
  const audio=v43GetAudioEl();
  v43CelebrationMode=false;
  if(v43CelebEndTimer){clearTimeout(v43CelebEndTimer);v43CelebEndTimer=null;}
  audio.src=track.url;
  audio.currentTime=0;
  v43CurrentTrackId=trackId;
  audio.play().catch(()=>{});
  v43RenderPlayerDetail();
}
function v43PlayNextTrack(){
  if(v43CurrentTrackId==null)return;
  let nextId;
  if(v43IsShuffled){do{nextId=Math.floor(Math.random()*V43_TRACKS.length);}while(nextId===v43CurrentTrackId&&V43_TRACKS.length>1);}
  else nextId=(v43CurrentTrackId+1)%V43_TRACKS.length;
  v43PlayFullTrack(nextId);
}
function v43PlayPrevTrack(){
  if(v43CurrentTrackId==null)return;
  const prevId=(v43CurrentTrackId-1+V43_TRACKS.length)%V43_TRACKS.length;
  v43PlayFullTrack(prevId);
}
function v43ToggleShuffle(){v43IsShuffled=!v43IsShuffled;if(v43IsShuffled)v43IsRepeating=false;v43RenderPlayerDetail();}
function v43ToggleRepeat(){v43IsRepeating=!v43IsRepeating;if(v43IsRepeating)v43IsShuffled=false;v43RenderPlayerDetail();}
function v43GetFavorites(){try{return JSON.parse(localStorage.getItem('v43Favorites')||'[]');}catch{return[];}}
function v43ToggleFavorite(trackId){
  let favs=v43GetFavorites();
  if(favs.includes(trackId))favs=favs.filter(id=>id!==trackId);
  else favs.push(trackId);
  try{localStorage.setItem('v43Favorites',JSON.stringify(favs));}catch{}
  v43RenderTrackList(document.getElementById('v43-search')?.value||'');
}
function v43RenderTrackList(filter){
  const list=document.getElementById('v43-track-list');
  if(!list)return;
  const favs=v43GetFavorites();
  const q=(filter||'').trim().toLowerCase();
  let tracks=V43_TRACKS.filter(t=>!q||t.title.toLowerCase().includes(q)||t.num.includes(q));
  tracks=[...tracks].sort((a,b)=>{
    const af=favs.includes(a.id)?1:0,bf=favs.includes(b.id)?1:0;
    if(af!==bf)return bf-af;
    return a.id-b.id;
  });
  if(!tracks.length){list.innerHTML='<div class="dict-empty">Nenhuma música encontrada.</div>';return;}
  list.innerHTML=tracks.map(t=>{
    const isFav=favs.includes(t.id);
    return`<div class="v43-track-row" data-track-id="${t.id}"><div class="v43-track-num">${esc(t.num)}</div><div class="v43-track-title">${esc(t.title)}</div><div class="v43-track-dur">${v43Fmt(t.dur)}</div><button class="v43-fav-btn${isFav?' on':''}" data-fav-id="${t.id}"><svg viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg></button></div>`;
  }).join('');
  list.querySelectorAll('.v43-track-row').forEach(row=>{
    row.onclick=(e)=>{if(e.target.closest('.v43-fav-btn'))return;const id=parseInt(row.dataset.trackId);v43ShowPlayerView(id);};
  });
  list.querySelectorAll('.v43-fav-btn').forEach(btn=>{
    btn.onclick=(e)=>{e.stopPropagation();v43ToggleFavorite(parseInt(btn.dataset.favId));};
  });
}
function v43ShowPlayerView(trackId){
  document.getElementById('v43-list-view').style.display='none';
  document.getElementById('v43-player-view').style.display='block';
  v43PlayFullTrack(trackId);
}
function v43RenderPlayerDetail(){
  const track=V43_TRACKS[v43CurrentTrackId];
  if(!track)return;
  const cover=document.getElementById('v43-player-cover');if(cover)cover.src=V43_COVER;
  const title=document.getElementById('v43-player-title');if(title)title.textContent=`${track.num} · ${track.title}`;
  document.getElementById('v43-shuffle-btn')?.classList.toggle('v43-active',v43IsShuffled);
  document.getElementById('v43-repeat-btn')?.classList.toggle('v43-active',v43IsRepeating);
  v43UpdatePlayPauseIcon();
}
function v43UpdatePlayPauseIcon(){
  const btn=document.getElementById('v43-playpause-btn');
  if(!btn||!v43Audio)return;
  btn.innerHTML=v43Audio.paused?'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>':'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
}
function v43UpdateFullPlayerUI(){
  if(!v43Audio||v43CelebrationMode)return;
  const seek=document.getElementById('v43-player-seek');
  const timeEl=document.getElementById('v43-player-time');
  if(seek&&v43Audio.duration)seek.style.width=((v43Audio.currentTime/v43Audio.duration)*100)+'%';
  if(timeEl)timeEl.textContent=`${v43Fmt(v43Audio.currentTime)} / ${v43Fmt(v43Audio.duration)}`;
  v43UpdatePlayPauseIcon();
}
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
        const term=terms[idx];
        let result=null;try{result=await lookupAll(term);}catch{}
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
        let result=null;try{result=await lookupAll(word);}catch{}
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
      const lib=getPDFLib();if(!lib)throw new Error('PDF.js indisponível');
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
function getPDFLib(){const l=window.pdfjsLib||window['pdfjs-dist/build/pdf'];if(l)l.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return l;}
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
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
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
    const lib=getPDFLib();if(!lib)throw new Error('PDF.js não carregou');
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

function showScreen(id){try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function showModal(id){closeModals();document.getElementById(id).classList.add('open');}
function closeModals(){try{if(typeof v43StopMusic==='function')v43StopMusic();}catch{}document.querySelectorAll('.mo').forEach(m=>m.classList.remove('open'));}
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
  if(btn){showModal('mo-music');v43RenderTrackList('');}
});
document.getElementById('v43-search')?.addEventListener('input',(e)=>v43RenderTrackList(e.target.value));
document.getElementById('v43-music-close')?.addEventListener('click',()=>{v43StopMusic();closeModals();});
document.getElementById('v43-back-to-list')?.addEventListener('click',()=>{
  v43StopMusic();
  document.getElementById('v43-player-view').style.display='none';
  document.getElementById('v43-list-view').style.display='block';
  v43RenderTrackList(document.getElementById('v43-search')?.value||'');
});
document.getElementById('v43-playpause-btn')?.addEventListener('click',()=>{
  if(!v43Audio)return;
  if(v43Audio.paused)v43Audio.play().catch(()=>{});else v43Audio.pause();
  v43UpdatePlayPauseIcon();
});
document.getElementById('v43-prev-btn')?.addEventListener('click',v43PlayPrevTrack);
document.getElementById('v43-next-btn')?.addEventListener('click',v43PlayNextTrack);
document.getElementById('v43-shuffle-btn')?.addEventListener('click',v43ToggleShuffle);
document.getElementById('v43-repeat-btn')?.addEventListener('click',v43ToggleRepeat);
let v40AutoTransDefs=localStorage.getItem('h40AutoTransDefs')==='1';
function v40SyncAutoTransBtn(){const b=document.getElementById('tog-auto-trans-btn');if(b)b.classList.toggle('on',v40AutoTransDefs);}
document.getElementById('tog-auto-trans').addEventListener('click',()=>{v40AutoTransDefs=!v40AutoTransDefs;localStorage.setItem('h40AutoTransDefs',v40AutoTransDefs?'1':'0');v40SyncAutoTransBtn();});
v40SyncAutoTransBtn();
document.getElementById('btn-clear-all').addEventListener('click',async()=>{if(confirm('Apagar tudo?')){await dbClr(STB);await dbClr(STW);await loadLib();await loadWords();toast('Dados apagados');}});
document.getElementById('bwclear').addEventListener('click',async()=>{if(confirm('Limpar todas as palavras?')){await dbClr(STW);await loadWords();toast('Vocabulário limpo');}});
document.body.addEventListener('click',e=>{
  const btn=e.target.closest('[data-tab]');if(!btn)return;
  const tab=btn.dataset.tab;
  if(tab==='music'||tab==='practice'){if(typeof hzOpenPractice==='function')hzOpenPractice();else{showModal('mo-music');v43RenderTrackList('');}return;}
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
