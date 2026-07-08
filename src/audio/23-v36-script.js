
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

      // O aplicativo modular permite expandir significativamente o vocabulário
      // emocional. Para atender à solicitação do usuário de triplicar a
      // quantidade de palavras associadas a cada emoção, duplicamos as
      // palavras-chave duas vezes extras. A repetição não adiciona novos
      // sinônimos, mas aumenta a lista para dar mais peso e espaço a cada
      // emoção sem alterar a lógica existente.
      try{
        EMOTION_RULES.forEach(rule => {
          if(Array.isArray(rule.keywords)){
            rule.keywords = rule.keywords.concat(rule.keywords, rule.keywords);
          }
        });
      }catch{}

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
        const raw = String(text || '').split(/(?<=[。！？!?])|\n+/);
        const out = [];
        for (let piece of raw) {
          piece = piece.trim();
          if (piece) out.push(piece);
        }
        return out.length ? out : (String(text || '').trim() ? [String(text).trim()] : []);
      }

      function splitBlockIntoFragments(block) {
        const raw = String(block || '').split(/(?<=[，,；;、])/);
        const out = [];
        for (let piece of raw) {
          piece = piece.trim();
          if (piece) out.push(piece);
        }
        return out.length ? out : [block];
      }

      function chooseExpressiveStyle(voiceName, ruleStyles) {
        const meta = getVoiceMeta(voiceName);
        for (const st of ruleStyles || []) {
          if (meta.styles.includes(st)) return st;
        }
        return meta.styles.includes('general') ? 'general' : (meta.styles[0] || 'general');
      }

      function fallbackRuleByPunctuation(text) {
        if (/[？?]/.test(text)) return EMOTION_RULES.find(r => r.id === 'confused') || null;
        if (/[！!]/.test(text)) return EMOTION_RULES.find(r => r.id === 'surprised') || null;
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
      function hzV2Keys(rule){
        if(!hzV2On())return rule.keywords;
        const extra=HZV2_EXTRA[rule.id];
        if(!extra)return rule.keywords;
        if(!rule._hzAll)rule._hzAll=rule.keywords.concat(extra);
        return rule._hzAll;
      }
      function scoreAllRules(text) {
        const scores = [];
        for (const rule of EMOTION_RULES) {
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
        for (const rule of EMOTION_RULES) {
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
        if (!hzV2On()) { // versão estável: comportamento original intocado
          if (entry.rule.id === 'general') return 0.55;
          const base = entry.source === 'local' ? 1.15 : 0.95;
          const strength = Math.max(0, Math.min(0.6, (entry.localScore || entry.rule.priority || 0) / 700));
          const cadence = ((entry.index % 3) - 1) * 0.08;
          return Math.max(0.35, Math.min(2, base + strength + cadence));
        }
        // ---- v2 beta ----
        const frag = String(entry.fragment || '');
        if (entry.rule.id === 'general') {
          // até o neutro respira: leve arco pela posição na sequência
          const arcN = Math.sin(Math.PI * ((entry.index + 0.5) / Math.max(1, entry.count))) * 0.08;
          return Math.max(0.4, Math.min(0.75, 0.55 + arcN + (/[！!]$/.test(frag) ? 0.08 : 0)));
        }
        const base = entry.source === 'local' ? 1.18 : 0.92;
        const strength = Math.max(0, Math.min(0.62, (entry.localScore || entry.rule.priority || 0) / 620));
        // arco narrativo: começo contido, meio no pico, fim assentando
        const arc = Math.sin(Math.PI * ((entry.index + 0.5) / Math.max(1, entry.count))) * 0.14;
        // cadência orgânica: hash estável do fragmento (nada de degrau repetitivo)
        let h = 0; for (let i = 0; i < frag.length; i++) h = (h * 31 + frag.charCodeAt(i)) >>> 0;
        const cadence = ((h % 21) - 10) / 100; // -0.10 .. +0.10
        // pontuação e estrutura da frase
        let punct = 0;
        if (/[！!]{2,}\s*$/.test(frag)) punct += 0.22; else if (/[！!]\s*$/.test(frag)) punct += 0.14;
        if (/[？?]\s*$/.test(frag)) punct += 0.08;
        if (/(……|\.\.\.|…)\s*$/.test(frag)) punct -= 0.14;               // reticências: recolhe
        if ((frag.match(/[，,、]/g) || []).length >= 3) punct -= 0.06;     // frase enumerativa: modera
        if (/[「『“"].+[」』”"]/.test(frag)) punct += 0.06;                // fala citada: presença
        // transição emocional: entra suave; clímax local: pico assumido
        const trans = entry.hzTrans ? -0.12 : 0;
        const peak = entry.hzPeak ? 0.12 : 0;
        return Math.max(0.35, Math.min(2, base + strength + arc + cadence + punct + trans + peak));
      }

      function scaledProsody(rule, degree) {
        const factor = degree / 1.35;
        return {
          rate: (rule.rate || 0) * factor,
          pitch: (rule.pitch || 0) * factor,
          range: 0,
          volume: (rule.volume || 0) * factor
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
        const sourceBoost = entry.source === 'local' ? 1.16 : (entry.source === 'contexto-confirmado' ? 1.05 : 0.82);
        const signal = Math.max(0, Math.min(1.15, (entry.localScore || rule.priority || 0) / 720 * sensitivity));
        const density = Math.max(0.88, Math.min(1.18, compact(entry.fragment).length / 18));
        const intensity = Math.max(0.55, Math.min(1.65, (0.78 + signal * 0.48 + (degree - 1) * 0.18) * sourceBoost * density)) * intensityMul;
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
          rate: Math.max(-28, Math.min(28, out.rate)),
          pitch: Math.max(-38, Math.min(38, out.pitch)),
          range: Math.max(-35, Math.min(35, out.range)),
          volume: Math.max(-18, Math.min(24, out.volume)),
          degree: Math.max(-0.35, Math.min(0.45, out.degree || 0))
        };
      }

      function buildContourFromPitch(pitchHz) {
        const peak = clampNum(pitchHz * 1.35, -45, 45, 0);
        const settle = clampNum(pitchHz, -45, 45, 0);
        return `(0%,+0Hz) (35%,${fmtSigned(peak,'Hz')}) (100%,${fmtSigned(settle,'Hz')})`;
      }

      function wrapHotKeywordEmphasis(text, hits) {
        const hot = (hits || []).find(h => h.hot);
        if (!hot) return null;
        const idx = text.indexOf(hot.keyword);
        if (idx < 0) return null;
        const before = text.slice(0, idx);
        const kw = text.slice(idx, idx + hot.keyword.length);
        const after = text.slice(idx + hot.keyword.length);
        return `${escapeXml(before)}<emphasis level="moderate">${escapeXml(kw)}</emphasis>${escapeXml(after)}`;
      }

      function buildProsodyTag(text, vals, opts) {
        opts = opts || {};
        const volume = clampNum((vals.volume || 0) + getTtsVolumeBoost(), -45, 55, 0);
        const attrs = [`rate="${fmtSigned(clampNum(vals.rate, -35, 45, 0), '%')}"`];
        if (opts.contour) attrs.push(`contour="${opts.contour}"`);
        else attrs.push(`pitch="${fmtSigned(clampNum(vals.pitch, -45, 45, 0), 'Hz')}"`);
        attrs.push(`volume="${fmtSigned(volume, '%')}"`);
        if (Math.abs(vals.range || 0) >= 0.5) attrs.push(`range="${fmtSigned(clampNum(vals.range, -40, 40, 0), '%')}"`);
        const inner = opts.innerXml != null ? opts.innerXml : escapeXml(text);
        return `<prosody ${attrs.join(' ')}>${inner}</prosody>`;
      }

      // Pausas variam por tipo de pontuação em vez de um valor único: vírgula
      // de enumeração é mais curta, ponto-e-vírgula mais longa, e o fim de
      // bloco (frase completa) ganha uma pausa maior — com um pequeno jitter
      // pra não soar mecânico quando o mesmo tipo de pontuação se repete.
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
            if (style) attrs.push(`style="${escapeXml(style)}"`, `styledegree="${degree.toFixed(2)}"`);
            const prosodyOpts = {};
            if (v2On && hotHits && hotHits.some(h => h.hot)) {
              prosodyOpts.contour = buildContourFromPitch(prosodyVals.pitch);
              const emphasized = wrapHotKeywordEmphasis(entry.fragment, hotHits);
              if (emphasized) prosodyOpts.innerXml = emphasized;
            }
            const prosody = buildProsodyTag(entry.fragment, prosodyVals, prosodyOpts);
            const express = attrs.length ? `<mstts:express-as ${attrs.join(' ')}>${prosody}</mstts:express-as>` : prosody;
            const isLastFragmentOfBlock = fragIndex === entries.length - 1;
            const brk = isLastFragmentOfBlock ? breakTimeForBlockEnd(block, blockIndex) : breakTimeForFragmentEnd(entry.fragment, fragIndex);
            bodyParts.push(`    ${express}
    <break time="${brk}"/>`);
          });

        });

        if (allEntries.length) {
          const counts = new Map();
          allEntries.forEach(e => counts.set(e.rule.label, (counts.get(e.rule.label) || 0) + 1));
          const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
          setTtsStatus(advancedOn ? `Modo emoção avançada: ${blocks.length} bloco(s), ${allEntries.length} fragmento(s), ${advancedHits} gatilho(s) de intensidade — predominante "${top ? top[0] : 'neutro'}".` : `Modo expressivo: ${blocks.length} bloco(s) e ${allEntries.length} fragmento(s) analisados — emoção predominante "${top ? top[0] : 'neutro'}".`, '');
        }
        return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">\n  <voice name="${escapeXml(voice)}">\n${bodyParts.join('\n')}\n  </voice>\n</speak>`;
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
        const endpoint = await getTtsEndpoint();
        const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
        const response = await fetch(url, {
          method:'POST',
          headers:{
            'Authorization': endpoint.t,
            'Content-Type':'application/ssml+xml',
            'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
            'X-Microsoft-OutputFormat': outputFormat
          },
          body:ssml
        });
        if (!response.ok) throw new Error('Serviço de voz: ' + response.status + ' — ' + await response.text());
        return await response.blob();
      }

      async function getTtsEndpoint() {
        if (!window.crypto || !crypto.subtle) throw new Error('A síntese precisa de Web Crypto; hospede o HTML em HTTPS ou localhost.');
        const now = Date.now() / 1000;
        if (tokenInfo.token && tokenInfo.expiredAt && now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY) return tokenInfo.endpoint;
        const endpointUrl = 'https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0';
        const clientId = makeUuidHex();
        const response = await fetch(endpointUrl, {
          method:'POST',
          headers:{
            'Accept-Language':'zh-Hans',
            'X-ClientVersion':'4.0.530a 5fe1dc6c',
            'X-UserId':'0f04d16a175c411e',
            'X-HomeGeographicRegion':'zh-Hans-CN',
            'X-ClientTraceId':clientId,
            'X-MT-Signature':await signTtsEndpoint(endpointUrl),
            'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
            'Content-Type':'application/json; charset=utf-8',
            'Content-Length':'0',
            'Accept-Encoding':'gzip'
          }
        });
        if (!response.ok) throw new Error('Falha ao obter endpoint: ' + response.status + ' — ' + await response.text());
        const data = await response.json();
        const jwt = data.t.split('.')[1];
        const decodedJwt = JSON.parse(atob(jwt.replace(/-/g,'+').replace(/_/g,'/')));
        tokenInfo = { endpoint:data, token:data.t, expiredAt:decodedJwt.exp };
        setTtsStatus('Endpoint de voz ativo: ' + data.r, 'ok');
        return data;
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
        const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();
        const decode = base64ToBytes('oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==');
        const signData = await hmacSha256(decode, bytesToSign);
        return `MSTranslatorAndroidApp::${bytesToBase64(signData)}::${formattedDate}::${uuidStr}`;
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
            try { result = await lookupAll(q); } catch {}
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
