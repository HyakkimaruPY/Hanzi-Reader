
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
