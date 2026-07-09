/*
 * Manual handwriting search module for Hanzi‑Reader
 *
 * This file adds a handwriting input mode to the dictionary.  It adds a
 * pencil icon next to the existing search field; clicking it opens a
 * modal where users can draw characters on a canvas.  Handwritten
 * strokes are analysed using the same recognition logic from the
 * standalone recogniser provided in the assignment.  Recognised
 * candidates appear in a scrolling list; tapping a candidate appends
 * the ideogram to a composition bar.  Users can build a sequence of
 * characters, remove the last one, clear or undo strokes on the canvas
 * and finally send the composition back to the main dictionary search
 * flow.
 *
 * The modal is entirely self contained and responsive.  It respects
 * the current theme by relying on CSS variables already defined in the
 * application.  A blur backdrop is used to dim the underlying page
 * while keeping the modal contents crisp.
 */

// Seed data for recognition.  These arrays list canonical stroke
// sequences for thousands of characters along with frequency hints and
// variant sequences.  They originate from the standalone
// recogniser file and are inlined here to avoid module import
// restrictions when running from the local filesystem.  See
// js/handSeed.mjs for the original exports.
const SEED = [
 ['一','H',1],['乙','Z',2],['丨','S',3],['丶','D',4],['丿','P',5],['二','HH',6],['十','HS',7],['丁','HS',8],['厂','HP',9],['七','HZ',10],['卜','SD',11],['人','PD',12],['入','PD',13],['八','PD',14],['九','PZ',15],['几','PZ',16],['儿','PZ',17],['了','ZS',18],['力','ZP',19],['刀','ZP',20],['又','ZD',21],['三','HHH',22],['于','HHS',23],['干','HHS',24],['亏','HHZ',25],['士','HSH',26],['土','HSH',27],['才','HSP',28],['寸','HSD',29],['下','HSD',30],['大','HPD',31],['丈','HPD',32],['与','HZH',33],['万','HZP',34],['上','SHH',35],['小','SPD',36],['口','SZH',37],['巾','SZS',38],['山','SZS',39],['千','PHS',40],['乞','PHZ',41],['川','PSP',42],['亿','PZ',43],['个','PDS',44],['勺','PZD',45],['久','PZD',46],['凡','PZD',47],['及','PZD',48],['夕','PZD',49],['丸','PZD',50],['么','PZD',51],['广','DHP',52],['亡','DHZ',53],['门','DSZ',54],['义','DPD',55],['之','DZD',56],['尸','ZHP',57],['己','ZHZ',58],['已','ZHZ',59],['巳','ZHZ',60],['弓','ZHZ',61],['子','ZSH',62],['卫','ZSH',63],['也','ZSHZ',64],['女','ZPH',65],['飞','ZPD',66],['刃','ZPD',67],['习','ZD',68],['叉','ZDD',69],['马','ZZH',70],
 ['不','HPSD',80],['中','SZHS',81],['为','DZPD',82],['云','HHZD',83],['互','HZH',84],['五','HSHH',85],['井','HHPS',86],['开','HHPS',87],['天','HHPD',88],['无','HHPZ',89],['元','HHPZ',90],['专','HHZD',91],['艺','HZ',92],['木','HSPD',93],['王','HHSH',94],['丰','HHHS',95],['夫','HHSP',96],['犬','HPDD',97],['太','HPDD',98],['区','HPDZ',99],['历','HPZP',100],['尤','HPZD',101],['友','HPZD',102],['匹','HPZZ',103],['车','HZHS',104],['巨','HZHZ',105],['牙','HZSP',106],['屯','HZSZ',107],['比','HZPZ',108],['切','HZZP',109],['止','SHSH',110],['少','SPDP',111],['日','SZHH',112],['曰','SZHH',113],['贝','SZPD',114],['水','SZPD',115],['内','SZPD',116],['见','SZPZ',117],['手','PHHS',118],['午','PHHS',119],['牛','PHHS',120],['毛','PHHZ',121],['气','PHHZ',122],['升','PHPS',123],['长','PHZD',124],['仁','PSHH',125],['什','PSHS',126],['片','PSHZ',127],['仆','PSSD',128],['化','PSPZ',129],['币','PSZS',130],['仍','PSZP',131],['仅','PSZD',132],['斤','PPHS',133],['爪','PPPD',134],['父','PDPD',135],['从','PDPD',136],['今','PDDZ',137],['分','PDZP',138],['公','PDZD',139],['月','PZSHH',140],['氏','PZHZ',141],['欠','PZPD',142],['风','PZPD',143],['丹','PZDH',144],['匀','PZDH',145],['乌','PZZH',146],['凤','PZZD',147],['六','DHPD',148],['文','DHPD',149],['方','DHPZ',150],['火','DPPD',151],['斗','DDHS',152],['忆','DDZ',153],['订','DHS',154],['计','DHS',155],['户','DZHP',156],['认','DPD',157],['心','DZD',158],['尺','ZHPD',159],['引','ZHZS',160],['丑','ZSHH',161],['巴','ZSHZ',162],['孔','ZSHZ',163],['队','ZSPD',164],['办','ZPDD',165],['以','ZDPD',166],['允','ZDPZ',167],['予','ZDZS',168],['劝','ZDZP',169],['双','ZDZD',170],['书','ZZSD',171],['幻','ZZZ',172],
 ['他','PSZSHZ',200],['们','PSDSZ',201],['你','PSPZSPD',1],['伱','PSPDSPD',204],['我','PHZHSPD',2],['的','PZHH PZD'.replace(/ /g,''),3],['是','SZHHHSHD',4],['在','HPSHSH',5],['有','HPSZHH',6],['和','PHSPDSZH',7],['人','PD',8],['这','DHDPDZD',9],['中','SZHS',10],['大','HPD',11],['为','DZPD',12],['上','SHH',13],['个','PDS',14],['国','SZHHSHDH',15],['到','HZDHSHSS',16],['说','DDHDPZ',17],['时','SZHHHSD',18],['要','HSZHHHZPH',19],['就','DHSZHSPDHZ',20],['出','ZSSZS',21],['会','PDHHZD',22],['可','HSZHSH',23],['也','ZSHZ',24],['对','ZDHSD',25],['生','PHHSH',26],['能','ZDSZHH PZPZ'.replace(/ /g,''),27],['而','HPSZS S'.replace(/ /g,''),28],['子','ZSH',29],['那','ZHHSPZ',30],['得','PPS SZHHHHSD'.replace(/ /g,''),31],['于','HHS',32],['着','DDPHHH SZHHH'.replace(/ /g,''),33],['下','HSD',34],['自','PSZHHH',35],['之','DZD',36],['年','PHHSHS',37],['过','HSDDZD',38],['发','ZPZD',39],['后','PPHSZH',40],['作','PSPHSHH',41],['里','SZHHSHH',42],['用','PZHHS',43],['道','DDPPSZHHHDZD',44],['行','PPSHHS',45],['所','DZHP PPHS'.replace(/ /g,''),46],['然','PZDHPDDDDDD',47],['家','DDZHPZPPPD',48],['种','PHSPDSZHS',49],['事','HSZHHZHS',50],['成','HPZZPD',51],['方','DHPZ',52],['多','PZDPZD',53],['经','ZZZDZSH',54],['么','PZD',55],['去','HSHZD',56],['法','DDHSHZD',57],['学','DDPDZDZSH',58],['學','PSSHHPHPHHZDZSH',5000],['如','ZPHSZH',59],['都','HSHPSZHHZ',60],['同','SZHSZH',61],['现','HHSHSZPZ',62],['当','SPDZHH',63],['没','DDHPZZD',64],['动','HHZDZP',65],['面','HPSZS HHH'.replace(/ /g,''),66],['起','HSHSHZHZ',67],['看','PHHPSZHHH',68],['定','DDZHSHD',69],['天','HHPD',70],['分','PDZP',71],['还','HPSDDZD',72],['进','HHPSDZD',73],['好','ZPHZSH',74],['小','SPD',75],['部','DHSZHPZ',76],['其','HSSHHHPD',77],['些','SHSHPZHH',78],['主','DHHSH',79],['样','HSPDDDPHHS',80],['理','HHSHSZHHSHH',81],['她','ZPHZSHZ',82],['本','HSPDH',83],['前','DDPHZHHSS',84],['开','HHPS',85],['但','PSSZHHH',86],['因','SZHPDH',87],['只','SZHPD',88],['从','PDPD',89],['想','HSPDSZHHHDZD',90],['实','DDZDDHPD',91],['日','SZHH',92],['军','DZHZHS',93],['者','HSHPSZHH',94],['意','DHSZHH DZD'.replace(/ /g,''),95],['无','HHPZ',96],['力','ZP',97],['它','DDZPZ',98],['与','HZH',99],['长','PHZD',100],['把','HSHZSHZ',101],['机','HSPDPZ',102],['十','HS',103],['民','ZHZHZ',104],['第','PHHSPZHZSP',105],['公','PDZD',106],['此','SHSHPZ',107],['已','ZHZ',108],['工','HSH',109],['使','PSHSZHPD',110],['情','DDHHHSHSZHH',111],['明','SZHHPZSHH',112],['性','DDHPHHSH',113],['知','PHHPSZH',114],['全','PDHHSH',115],['三','HHH',116],['又','ZD',117],['关','DDPHHPD',118],['点','SHSZHDDDD',119],['正','HSHSH',120],['业','SSDDH',121],['外','PZDSD',122],['将','DSPZD HSD'.replace(/ /g,''),123],['两','HSZPDPD',124],['高','DHSZHSZSZH',125],['间','DSZSZHH',126],['由','SZHSH',127],['问','DSZSZH',128],['很','PPSZHHZPD',129],['最','SZHHHSSHHZD',130],['重','PHSZHHSHH',131],['并','DDPHHPS',132],['物','PHSH PZPP'.replace(/ /g,''),133],['手','PHHS',134],['应','DHPDDH',135],['战','SHSZHHZPD',136],['向','PSZSZH',137],['头','DDHPD',138],['文','DHPD',139],['体','PSHSPDH',140],['政','HSHSHPHPD',141],['美','DDPHHHSHHPD',142],['相','HSPDSZHHH',143],['见','SZPZ',144],['被','DZSPZPHZD',145],['利','PHSPDSS',146],['什','PSHS',147],['二','HH',148],['等','PHHSPHSHHSD',149],['产','DHPHP',150],['或','HSZHHZPD',151],['新','DHSHHSPPPHS',152],['己','ZHZ',153],['制','PHHSZSSS',154],['身','PSZHHHP',155],['果','SZHHHSPD',156],['加','ZPSZH',157],['西','HSZPZH',158],['斯','HSSHHHPDPPHS',159],['月','PZSHH',160],['话','DDHPHSZH',161],['合','PDHSZH',162],['回','SZSZHH',163],['特','PHSHHSHHSD',164],['代','PSHZD',165],['内','SZPD',166],['信','PSDHHSZH',167],['表','HHSH PZD'.replace(/ /g,''),168],['化','PSPZ',169],['老','HSHPPZ',170],['给','ZZZPDHSZH',171],['世','HSSHZ',172],['位','PSDHSH',173],['次','DHPZPD',174],['度','DHPHSSZD',175],['门','DSZ',176],['任','PSPHSH',177],['常','SPDDZSZHSZS',178],['先','PHSH PZ'.replace(/ /g,''),179],['海','DDHPHZZHDDH',180],['通','ZDSZHHSDZD',181],['教','HSHPSZHPHPD',182],['儿','PZ',183],['原','HPPSZHHSPD',184],['东','HZSPD',185],['声','HSHSZHP',186],['提','HSHSZHHHSHD',187],['立','DHSH',188],['及','PZD',189],['比','HZPZ',190],['员','SZHSZPD',191],['解','PZPZHHSZP PHHS'.replace(/ /g,''),192],['水','SZPD',193],['名','PZDSZH',194],['真','HSSZHHHHPD',195],['论','DDHPDPZ',196],['處','PDPD',197],['走','HSHSHD',198],['义','DPD',199],['各','PZDSZH',200],
 ['爱','PDDPDZHPZD',80],['愛','PDDPDZDZDHPZD',1800],['语','DDHHSHSZH',220],['語','DDHHSHSZH',2300],['汉','DDHZD',221],['漢','DDHHSSHSZHPD',2301],['字','DDZZSH',222],['吗','SZHZZH',223],['媽','ZPHHHSHHHSZ',2302],['呢','SZHZHPPZ',224],['吗','SZHZZH',225],['哪','SZHZHHSPZ',226],['谁','DDHPSDHSHH',227],['誰','DDHPSDHSHH',2303],['请','DDHHHSHSZHH',228],['請','DDHHHSHSZHH',2304],['谢谢','DDHHSZHHSZH',229],['谢','DDHPSZHHHPHSD',230],['謝','DDHPSZHHHPHSD',2305]
];
const COMMON_EXTRA = [
    ['國',['SZHSZHHZPDH','SZHSHZPDH'],350],['国',['SZHHSHDH','SZHHSHD'],90],['園',['SZHSHSZHPZDH','SZHSHSZHPZD'],900],['圆',['SZSZHSZPDH','SZSZHSZPD'],950],['圓',['SZSZHSZHHHPDH','SZSZHSZHHHPD'],1600],
    ['书',['ZZSD','ZZS'],220],['書',['ZHHSHSZHH','ZHHHSHSZHH'],850],['車',['HSZHHS','HSHSZHH'],800],['連',['HSZHHSZD','HSHSZHHZD'],320],['连',['HZHSZD','HZHSD'],260],['转',['HZHSHHZD','HZHSHZD'],420],['轉',['HSZHHSHSZHSDHSD','HSHSZHHHSZHSDHSD'],1200],
    ['門',['SZHHZSHH','SHZHHZSH'],800],['問',['SZHHZSHHSZH','SZHHZSHHSZ'],600],['间',['DSZSZHH','DSZSZH'],126],['間',['SZHHZSHHSZHH','SZHHZSHHSZH'],760],['聞',['SZHHZSHHHSSHHH','SZHHZSHHHSSHH'],900],['開',['SZHHZSHHHHPS','SZHHZSHHHHP'],850],['關',['SZHHZSHHZZDZZDHHPS','SZHHZSHHZZDZZDHH'],1300],
    ['見',['SZHHHPZ','SZHHHP'],144],['現',['HHSHSZHHHPZ','HHSHSZHHPZ'],330],['观',['ZDSZPZ','ZDSZP'],500],['觀',['HSSSZHSZHPSDHSHHSZHHHPZ','HSSSZHSZHPSDHSHHSZPZ'],1800],
    ['風',['PZSZHSHD','PZSZHSH'],980],['鳳',['PZHSHHSZDDDZ','PZPSZHHSZDDD'],1800],['凤',['PZZD','PZZ'],600],['飛',['ZPDZPD','ZPDZD'],980],['馬',['HSHHHSZD','HSHHHSZDD'],1200],['嗎',['SZHHSHHHSZD','SZHHSHHHSZ'],1300],
    ['龙',['HPZD','HPZP'],350],['龍',['DHSHZHHHZZHHSZHSHH','DHSHZHHHZZHHSZH'],1700],['龚',['HPZDHSSHPD','HPZDHSSPD'],2200],['龜',['PZSZHHSZZHH','PZSZHHSZZH'],2600],
    ['云','HHZD',83],['雲','HSZSDDDDHHZD',1800],['电',['SZHHZ','SZHZ'],350],['電',['HSZSDDDDSZHHZ','HSZSDDDDSZHZ'],1200],['無',['PHHSSSHDDDD','PHHSSSHDDD'],950],['会',['PDHHZD','PDHHZ'],70],['會',['PDHSZSZHH','PDHSZSZH'],1200],
    ['来',['HDDPHSPD','HDDPHSP'],80],['來',['HSPDPDPD','HSPDPDP'],900],['乐',['PZSPD','PZSP'],120],['樂',['PSZHHZZDZZDHSPD','PSZHHZZDZZDHSP'],1600],['東',['HSZHHSPD','HSZHHSP'],700],['長','HSHHHZPD',1500],['发',['ZPZD','ZPD'],170],['發',['ZDPPDZHZZPZD','ZDPPDZHZZP'],1700],['髮',['HSHHHZPPPZPZD','HSHHHZPPPZD'],2200],
    ['机',['HSPDPZ','HSPDP'],180],['機',['HSPDZZDZZDHPZD','HSPDZZDZZDHPZ'],1400],['过',['HSDZD','HSDZ'],110],['過',['SZZSZHSDZD','SZZSZHZD'],1000],['进',['HHPSZD','HHPSZ'],90],['進',['PSDHSHHZD','PSDHSHZD'],900],['這',['DHHSZHDZD','DHHSZHZD'],700],['边','ZPZD',450],['邊',['PSZHHHDDZDPZDZD','PSZHHHDDZPZDZD'],1500],
    ['选',['PHSHPZZD','PHSHZDD'],380],['選',['ZHZHZHHSSHPDZD','ZHZHZHHSSPDZD'],900],['难',['ZDPSDHSHH','ZDPSDHSH'],680],['難',['HSSHSZHPDPSDHSHH','HSSHSZHPDPSDHSH'],1100],['欢',['ZDPZPD','ZDPZD'],300],['歡',['HSSSZHSZHPSDHSHHPZPD','HSSSZHSZHPSDHSHHPZD'],2200],
    ['體',['SZZHSHHSSZHHHSDDPHSH','SZZHSHHSSZHHHSDDP'],1400],['聽',['HSSHHHHSHSHHSSHHHDZD','HSSHHHHSHSHHSSHHDD'],1300],['聲',['HSHSZHPPZZDHSSHHH','HSHSZHPPZZDHSSHH'],1300],
    ['說',['DHHSZHPDSZHPZ','DHHSZHPDSZHP'],950],['讓',['DHHSZHDHSZHSZHHPZD','DHHSZHDHSZHSZHHPZ'],1600],['认','DPD',157],['認',['DHHSZHZPDDZD','DHHSZHZPDD'],1000],['识','DDHSZHPD',240],['識',['DHHSZHDHSHSZHHHZPD','DHHSZHDHSHSZHHHZP'],1500],
    ['课',['DDHSZHHHSPD','DDHSZHHHSP'],320],['課',['DHHSZHSZHHHSPD','DHHSZHSZHHHSP'],1200],['读',['DDHHSDZHPD','DDHHSDZHP'],300],['讀',['DHHSZHHSHSZSSHSZHHHPD','DHHSZHHSHSZSSHSZHHHP'],1700],['写',['DZHZH','DZHZ'],250],['寫',['DDZPSHSHHPZZD','DDZPSHSHHPZZ'],1400],
    ['妇','ZPHZHH',500],['婦',['ZPHZHHZSZS','ZPHZHHZSZ'],1200],['好','ZPHZSH',40],['她','ZPHZSHZ',200],['姐','ZPHSZHHH',260],['妹','ZPHHHSPD',280],['婚','ZPHPZHSZHH',700],['孩','ZSHDHZPD',430],
    ['家','DDZHPZPPPD',70],['安','DDZZPH',150],['定','DDZHSHD',180],['室','DDZHZDHSH',400],['容','DDZPDPDSZH',480],['窗','DDZPSZPZD',550],['察','DDZPZDDHHSPD',650],['宝','DDZHHSHD',230],['寶',['DDZHHSHSPHHSZSSZHHHPD','DDZHHSHSPHHSZSSZHHHP'],1900],
    ['草','HSSSZHHHS',470],['花','HSSPSPZ',260],['茶','HSSPDHSPD',500],['菜','HSSPDDPHSPD',470],['英','HSSSZHPD',420],['苦','HSSHSZH',630],['藥',['HSSPSZHHZZDZZDHSPD','HSSPSZHHZZDZZDHSP'],1800],['药','HSSZZPZD',760],
    ['河','DDHHSZHS',310],['湖','DDHHSSZHPZHH',520],['清','DDHHHSHSZHH',370],['满','DDHHSSHSZPDPD',650],['滿',['DDHHSSHSZSPDPD','DDHHSSHSZSPDP'],1500],['灣',['DDHDHHSZHZZDZZD','DDHDHHSZHZZDZZ'],1900],['湾','DDHDHPSZZ',1000],
    ['炎','DPPDDPPD',600],['灯','DPPDHS',560],['燈',['DPPDZDPPDHSZHDDH','DPPDZDPPDHSZHDD'],1600],['烦','DPPDHPSZPD',700],['煩','DPPDHPSZHHHPD',1700],['熱',['HSHHSHPZDDDDDD','HSHHSHPZDDDDD'],1300],['热','HSHPZDDDD',550],
    ['必','DZDP',320],['忙','DDDHZ',520],['快','DDZHPD',280],['情','DDHHHSHSZHH',360],['慢','DDSZHHSZSSHZD',650],['懂','DDHSSPHSZHHSHH',700],
    ['扌','HSH',100],['找','HSHHZPD',260],['把','HSHZSHZ',300],['打','HSHHS',220],['持','HSHHSHHSD',520],['换','HSHPZSZHPD',600],['換','HSHPZSZPDPD',1300],['接','HSHDHSZPH',600],['推','HSHPSDHSHH',700],['操','HSHSZHSZHSZHHSPD',900],
    ['林','HSPDHSPD',430],['森','HSPDHSPDHSPD',750],['校','HSPDDHPDPD',300],['样','HSPDDDPHHHS',760],['樣','HSPDDDPHHHSPZD',1600],['树','HSPDZDHSD',420],['樹','HSPDHSHSZHDDHHSD',1400],
    ['看','PHPSZHHH',80],['眼','SZHHHZHHZPD',600],['睛','SZHHHHHSHSZHH',700],['睡','SZHHHPHSHHSHH',700],['省','SPDPSZHHH',280],
    ['品','SZHSZHSZH',700],['唱','SZHSZHHSZHH',520],['器','SZHSZHHPDDSZHSZH',850],['嚴',['SZHSZHHPZHPPHPD','SZHSZHHPZHPPHP'],1600],['吃','SZHPHZ',420],['喝','SZHSZHHPZPZ',500],
    ['明','SZHHPZHH',70],['時','SZHHHSHHSD',350],['时','SZHHHSD',130],['早','SZHHHS',160],['晚','SZHHPZSZHPZ',480],['景','SZHHDHSZHSPD',650],['暗','SZHHDHSHSZHH',760],['曬',['SZHHHSZSSHHZPZ','SZHHHSZSSHHZP'],1600],['晒','SZHHHSZPZH',700],
    ['朋','PZHHPZHH',370],['服','PZHHZSZD',400],['脱','PZHHDPZHPZ',700],['脑','PZHHDHPDS',520],['腦',['PZHHZZZPSZPDS','PZHHZZZPSZPD'],1300],
    ['詩','DHHSZHHSHHSD',900],['诗','DDHHSHHSD',300],['詞','DHHSZHZHSZH',900],['词','DDHZHSZH',310],['話','DHHSZHPHSZH',900],['论','DDHPDPZ',196],['論','DHHSZHPDHSZS',900],
    ['钱','PHHHZHHZPD',420],['錢','PDHHSHDDHZPDHZPD',1300],['银','PHHHZZHHZPD',500],['銀','PDHHSHDDZHHZPD',1300],['铁','PHHHZPHHPD',480],['鐵','PDHHSHDDHSSHHSHSZHHZPD',1700],
    ['轻','HZHSZDHSH',420],['輕','HSHSZHHHZZZHSH',1200],['较','HZHSDHPDPD',450],['較','HSHSZHHDHPDPD',1200],['轮','HZHSPDPZ',500],['輪','HSHSZHHPDHSZS',1300],
    ['跑','SZHSHSDPZZHZ',500],['跳','SZHSHSDPDPZD',650],['跟','SZHSHSDZHHZPD',650],['踢','SZHSHSDSZHHPZPP',700],['蹈','SZHSHSDPDDPPSHSHH',1000],
    ['霸','HSZSDDDDHSSHSZHHSPZHH',2600],['靈','HSZSDDDDSZHSZHSZHPDPDH',2600],['灵','ZHHDPPD',450],['霖','HSZSDDDDHSPDHSPD',1800],['霉','HSZSDDDDPHZZHDDH',1800],['霄','HSZSDDDDSPDSZHH',1800],['霈','HSZSDDDDDDHHSZS',2200],
    ['乚','Z',8],['乛','Z',9],['乀','D',10],['乁','D',11],['亇','PZS',60],['乃','ZP',60],['乂','PD',61],['乍','PHSHH',62],['乎','PDPHS',63]
  ];
const VARIANTS = [
    ['解',['PZPZHHSZPPHHS','PZPZHHZPPHHS','PZPZHHSPPHHS','PZPZHHZPPHS'],192],
    ['露',['HSZSDDDDSZHSHSDPZDSZH','HSZSDDDDSZHSHSPZDSZH','HSZSDDDDSZHSHSDPZDSZ','HSZSDDDDSZHSHSPZDSZ'],2200],
    ['想',['HSPDSZHHHDZD','HSPDSZHHHDD','HSPDSZHHHDZDP'],70],
    ['愛',['PDDPDZDZDHPZD','PDDPDZDZDZPZD','PDDPDZDZDPZD'],1800],
    ['齒',['SHSHHSPDPDS','SHSHHSPDPDZS','SHSHSPDPDS'],2300],
    ['鬱',['HSPDPPHSHSZSHSPDDPZDPPP','HSPDPPHSHSZSHSPDDPZDPP'],2800]
  ];


// Internal state for recognition
let db = [];
let dbMap = new Map();

/**
 * Insert the handwriting button and modal once the dictionary page is
 * present.  Because the dictionary DOM is created dynamically after
 * initial load, this function polls for the search bar and then
 * initialises the UI exactly once.
 */
export function initManualSearch() {
  // Wait until the dictionary search bar exists.  The dictionary page
  // is added after the initial shell, so we need to poll.  If the
  // module has already been initialised (button exists), do nothing.
  const tryInit = () => {
    // Locate the dictionary search wrapper.  It may reside inside
    // various parent containers depending on navigation state, so
    // query without anchoring to a specific screen id.
    const searchWrap = document.querySelector('.dict-search');
    if (!searchWrap) {
      // Retry shortly
      setTimeout(tryInit, 150);
      return;
    }
    if (document.getElementById('dict-hand-btn')) {
      return;
    }
    setupUI(searchWrap);
  };
  // If the document is still loading, delay until ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit, { once: true });
  } else {
    tryInit();
  }
}

// Automatically initialise when this module loads.  If the dictionary
// has not been built yet the init function will poll until it is.
initManualSearch();

/**
 * Create the button, modal, event handlers and recognition database.
 *
 * @param {HTMLElement} searchWrap the container of the existing
 * search field and buttons.
 */
function setupUI(searchWrap) {
  // Build the pencil button.  It is inserted just before the
  // magnifying glass to maintain the expected layout.  The button
  // inherits sizing from CSS (see style modifications) and only needs
  // its SVG content and a few attributes.
  const handBtn = document.createElement('button');
  handBtn.id = 'dict-hand-btn';
  handBtn.className = 'dict-hand-btn';
  handBtn.type = 'button';
  handBtn.title = 'Escrita manual';
  // Pencil icon SVG (outlined style to match existing buttons)
  handBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20.5v-3.4L14.4 5.7l3.4 3.4L6.4 20.5H3z"></path><path d="M14.4 5.7l3.4 3.4"></path><path d="M17.8 9.1l1.4-1.4c.4-.4.4-1 0-1.4L15.7 2.9c-.4-.4-1-.4-1.4 0l-1.4 1.4"></path></svg>';
  // Insert the new button immediately before the existing search button.
  // Do not keep moving existing DOM nodes after this point: the previous
  // version used a MutationObserver that called appendChild/insertBefore
  // during its own callback, which could create a self-triggered mutation
  // loop and freeze the app.  The stable order is handled by CSS `order`.
  const searchBtn = searchWrap.querySelector('#dict-go');
  if (!searchBtn) return;
  searchWrap.insertBefore(handBtn, searchBtn);

  // Force the search row to remain a single line without mutating the
  // child list.  This keeps the input → handwriting → search layout while
  // avoiding the recursive childList mutations that caused the Vercel build
  // to become unresponsive.
  const input = searchWrap.querySelector('#dict-q');
  const backMini = searchWrap.querySelector('.dict-back-mini');
  function enforceSearchLayout() {
    searchWrap.style.setProperty('display', 'flex', 'important');
    searchWrap.style.setProperty('flex-wrap', 'nowrap', 'important');
    searchWrap.style.setProperty('align-items', 'center', 'important');
    searchWrap.style.setProperty('gap', '4px', 'important');
    searchWrap.style.setProperty('grid-template-columns', 'none', 'important');
    searchWrap.style.setProperty('grid-auto-flow', 'column', 'important');
    if (backMini) {
      backMini.style.setProperty('order', '0', 'important');
      backMini.style.setProperty('flex', '0 0 38px', 'important');
      backMini.style.setProperty('width', '38px', 'important');
      backMini.style.setProperty('min-width', '38px', 'important');
      backMini.style.setProperty('height', '42px', 'important');
    }
    if (input) {
      input.style.setProperty('order', '1', 'important');
      input.style.setProperty('flex', '1 1 0', 'important');
      input.style.setProperty('min-width', '0', 'important');
      input.style.setProperty('width', 'auto', 'important');
      input.style.setProperty('max-width', 'none', 'important');
    }
    handBtn.style.setProperty('order', '2', 'important');
    handBtn.style.setProperty('flex', '0 0 44px', 'important');
    handBtn.style.setProperty('width', '44px', 'important');
    handBtn.style.setProperty('min-width', '44px', 'important');
    handBtn.style.setProperty('max-width', '44px', 'important');
    handBtn.style.setProperty('height', '42px', 'important');
    handBtn.style.setProperty('display', 'inline-flex', 'important');
    handBtn.style.setProperty('align-items', 'center', 'important');
    handBtn.style.setProperty('justify-content', 'center', 'important');
    searchBtn.style.setProperty('order', '3', 'important');
    searchBtn.style.setProperty('flex', '0 0 44px', 'important');
    searchBtn.style.setProperty('width', '44px', 'important');
    searchBtn.style.setProperty('min-width', '44px', 'important');
    searchBtn.style.setProperty('max-width', '44px', 'important');
    searchBtn.style.setProperty('height', '42px', 'important');
    searchBtn.style.setProperty('display', 'inline-flex', 'important');
    searchBtn.style.setProperty('align-items', 'center', 'important');
    searchBtn.style.setProperty('justify-content', 'center', 'important');
  }
  enforceSearchLayout();
  // Reapply after theme/boot patches that may touch `.dict-search`.
  [0, 80, 250, 700].forEach(ms => setTimeout(enforceSearchLayout, ms));

  // Build the modal once.  The modal is appended to the body and
  // remains hidden until opened.  We define all elements here so
  // event handlers can capture references.
  const modal = document.createElement('div');
  modal.id = 'handwrite-modal';
  modal.style.display = 'none';
  // Compose modal structure with a header, drawing area with side controls,
  // and a footer.  Icons are defined inline via SVG for consistency with
  // the rest of the application.  Composition bar appears in the header
  // with a delete button; a close button sits to the right.  A side
  // panel provides stroke thickness and colour controls.  Candidates and
  // action buttons live in the footer.
  modal.innerHTML = `
    <div class="hand-modal-overlay"></div>
    <div class="hand-modal-content" role="dialog" aria-modal="true" aria-label="Busca manual por escrita">
      <div class="hand-header">
        <div class="hand-bar" id="hand-comp-bar" aria-label="Ideogramas selecionados">
          <div class="hand-chars" id="hand-comp-chars"></div>
          <button type="button" id="hand-del" title="Apagar último ideograma" class="hand-icon-btn hand-del-btn" aria-label="Apagar último ideograma">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 6.5H9.2L3.5 12l5.7 5.5H21a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1Z"></path>
              <path d="M12.2 9.2 17 14"></path>
              <path d="M17 9.2 12.2 14"></path>
            </svg>
          </button>
        </div>
        <button type="button" id="hand-close" title="Fechar" class="hand-icon-btn hand-close-btn" aria-label="Fechar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6.5 6.5 17.5 17.5"></path>
            <path d="M17.5 6.5 6.5 17.5"></path>
          </svg>
        </button>
      </div>
      <div class="hand-main">
        <div class="hand-board" id="hand-board">
          <canvas id="hand-guides-canvas"></canvas>
          <canvas id="hand-canvas"></canvas>
        </div>
        <div class="hand-side" aria-label="Controles do traço">
          <div class="hand-thickness-ui" id="hand-thickness-ui" title="Espessura do traço" role="slider" aria-label="Espessura do traço" aria-valuemin="0" aria-valuemax="100" aria-valuenow="42" tabindex="0">
            <div class="hand-thickness-rail">
              <span class="hand-thickness-shape"></span>
              <span class="hand-thickness-thumb" id="hand-thickness-thumb"></span>
            </div>
          </div>
          <input type="range" id="hand-thick" class="hand-thick-input" min="3" max="10" value="5" step="0.5" title="Espessura do traço" aria-hidden="true" tabindex="-1">
          <div class="hand-color">
            <button type="button" id="hand-color-toggle" title="Escolher cor" class="hand-icon-btn hand-color-toggle" aria-label="Escolher cor">
              <svg class="hand-ink-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4.8 19.2 12.9 4.6c.4-.8 1.5-.8 1.9 0l4.4 8.1c.3.6.1 1.3-.5 1.6l-8.5 4.9c-.6.3-1.3.3-1.8-.1l-1.2-1.1-2.4 1.2Z"></path>
                <path d="M12.2 9.2 16 13"></path>
                <path d="M8.1 17.9 5.7 15.5"></path>
                <circle cx="18.2" cy="18.4" r="2.2" fill="currentColor" stroke="none"></circle>
              </svg>
              <span class="hand-color-current" id="hand-color-current"></span>
            </button>
            <div class="hand-color-options" id="hand-color-options" aria-label="Cores do traço">
              <button type="button" data-color="#ffffff" title="Branco" class="selected" style="--swatch:#ffffff;"></button>
              <button type="button" data-color="#111111" title="Preto" style="--swatch:#111111;"></button>
              <button type="button" data-color="#ffd84d" title="Amarelo" style="--swatch:#ffd84d;"></button>
              <button type="button" data-color="accent" title="Destaque do tema" style="--swatch:var(--dict-ac,#c89b5e);"></button>
            </div>
          </div>
        </div>
      </div>
      <div class="hand-bottom">
        <div class="hand-cands" id="hand-cands" aria-label="Candidatos reconhecidos"></div>
        <button type="button" id="hand-expand" title="Expandir candidatos" class="hand-icon-btn hand-expand-btn" aria-label="Expandir candidatos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M7 10 12 15 17 10"></path>
          </svg>
        </button>
        <div class="hand-actions">
          <button type="button" id="hand-undo" title="Desfazer último traço" class="hand-icon-btn hand-undo-btn" aria-label="Desfazer último traço">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 8 4.5 12.5 9 17"></path>
              <path d="M5 12.5h8.2c4.1 0 6.3-2.2 6.3-5.5"></path>
            </svg>
          </button>
          <button type="button" id="hand-clear" title="Limpar desenho" class="hand-icon-btn hand-clear-btn" aria-label="Limpar desenho">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 15.4 13.4 6a2 2 0 0 1 2.8 0L20 9.8a2 2 0 0 1 0 2.8l-6.9 6.9H7.3L4 16.2a.6.6 0 0 1 0-.8Z"></path>
              <path d="M10.5 18.5H21"></path>
              <path d="M12 7.4 18.6 14"></path>
            </svg>
          </button>
          <button type="button" id="hand-search" title="Pesquisar" class="hand-icon-btn hand-search-btn" aria-label="Pesquisar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="10.8" cy="10.8" r="6.8"></circle>
              <path d="M16 16 21 21"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // Inject styles for modal.  These styles rely on existing CSS
  // variables defined by the application theme.  Only elements
  // introduced by this module are targeted here to avoid leaking
  // overrides into unrelated components.
  const style = document.createElement('style');
  style.textContent = `
  :root {
    --hand-size-btn: 34px;
  }
  #handwrite-modal {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    padding: max(14px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
    z-index: 10000;
  }
  #handwrite-modal.show { display: flex; }
  #handwrite-modal .hand-modal-overlay {
    position: absolute;
    inset: 0;
    backdrop-filter: blur(18px) saturate(1.1);
    -webkit-backdrop-filter: blur(18px) saturate(1.1);
    background:
      radial-gradient(circle at 50% 28%, rgba(201, 155, 94, 0.10), transparent 34%),
      rgba(0,0,0,0.62);
  }
  #handwrite-modal .hand-modal-content {
    position: relative;
    box-sizing: border-box;
    width: min(94vw, 520px);
    max-width: 100%;
    max-height: min(92vh, 720px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    color: var(--dict-text, #f2eee7);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012)),
      var(--dict-card, rgba(18,18,18,0.96));
    border: 1px solid color-mix(in srgb, var(--dict-line, #9a9a9a) 68%, transparent);
    border-radius: 14px;
    box-shadow: 0 20px 54px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .hand-header,
  .hand-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hand-bar {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 5px 6px 5px 10px;
    overflow: hidden;
    background: rgba(0,0,0,0.30);
    border: 1px solid color-mix(in srgb, var(--dict-line, #9a9a9a) 72%, transparent);
    border-radius: 10px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.035);
  }
  .hand-chars {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    white-space: nowrap;
    font-family: var(--hz-font, "Noto Serif CJK SC", "Source Han Serif SC", "Microsoft YaHei", "PingFang SC", serif);
    font-size: clamp(24px, 5.8vw, 31px);
    line-height: 1;
    color: var(--dict-text,#f2eee7);
  }
  .hand-chars::-webkit-scrollbar,
  .hand-cands::-webkit-scrollbar { height: 0; width: 0; }
  .hand-icon-btn {
    flex: 0 0 var(--hand-size-btn);
    width: var(--hand-size-btn);
    height: var(--hand-size-btn);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 9px;
    border: 1px solid color-mix(in srgb, var(--dict-line, #9a9a9a) 76%, transparent);
    background: rgba(255,255,255,0.045);
    color: var(--dict-text, #f2eee7);
    cursor: pointer;
    transition: background .16s ease, color .16s ease, border-color .16s ease, transform .12s ease, box-shadow .16s ease;
  }
  .hand-icon-btn svg { width: 20px; height: 20px; display: block; }
  .hand-icon-btn:hover,
  .hand-icon-btn:focus-visible {
    background: color-mix(in srgb, var(--dict-ac, #c89b5e) 24%, transparent);
    border-color: color-mix(in srgb, var(--dict-ac, #c89b5e) 74%, var(--dict-line, #9a9a9a));
    color: var(--dict-text, #fff7ed);
    outline: none;
  }
  .hand-icon-btn:active { transform: scale(.97); }
  .hand-del-btn { color: color-mix(in srgb, var(--dict-ac,#c89b5e) 82%, #fff); }
  .hand-search-btn {
    background: var(--dict-ac, #c89b5e);
    border-color: color-mix(in srgb, var(--dict-ac, #c89b5e) 82%, #fff);
    color: var(--dict-bg, #111);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 4px 14px rgba(0,0,0,0.22);
  }
  .hand-main {
    display: flex;
    align-items: stretch;
    gap: 10px;
    min-height: 0;
  }
  .hand-board {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    aspect-ratio: 1 / 1;
    background: rgba(0,0,0,0.80);
    border: 1px solid color-mix(in srgb, var(--dict-line, #9a9a9a) 74%, transparent);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: inset 0 1px 18px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.025);
  }
  .hand-board::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(255,255,255,0.035), transparent 64%);
    pointer-events: none;
    z-index: 1;
  }
  .hand-board canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  #hand-guides-canvas { z-index: 2; pointer-events: none; opacity: .72; }
  #hand-canvas { z-index: 3; }
  .hand-side {
    flex: 0 0 44px;
    width: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .hand-thick-input {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  .hand-thickness-ui {
    width: 38px;
    height: clamp(126px, 35vw, 168px);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--dict-line,#9a9a9a) 70%, transparent);
    border-radius: 12px;
    background: rgba(0,0,0,0.26);
    cursor: pointer;
    user-select: none;
    touch-action: none;
  }
  .hand-thickness-rail {
    position: relative;
    width: 22px;
    height: calc(100% - 18px);
  }
  .hand-thickness-shape {
    position: absolute;
    inset: 0 5px;
    border-radius: 999px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--dict-ac,#c89b5e) 85%, #fff) 0%, color-mix(in srgb, var(--dict-line,#888) 78%, transparent) 100%);
    clip-path: polygon(20% 0, 80% 0, 58% 100%, 42% 100%);
    opacity: .9;
  }
  .hand-thickness-thumb {
    position: absolute;
    left: 50%;
    bottom: calc(var(--thick-pct, 42) * 1%);
    width: var(--thick-thumb, 16px);
    height: var(--thick-thumb, 16px);
    transform: translate(-50%, 50%);
    border-radius: 50%;
    background: var(--dict-ac, #c89b5e);
    border: 2px solid color-mix(in srgb, var(--dict-bg,#111) 88%, #fff);
    box-shadow: 0 2px 10px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.12);
  }
  .hand-color { position: relative; width: 38px; display: flex; justify-content: center; }
  .hand-color-toggle {
    position: relative;
    overflow: visible;
    color: color-mix(in srgb, var(--active-color, #ffffff) 78%, var(--dict-text,#fff));
    border-color: color-mix(in srgb, var(--active-color, #ffffff) 78%, var(--dict-line,#9a9a9a)) !important;
    background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
  }
  .hand-color-toggle .hand-ink-svg { width: 20px; height: 20px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
  .hand-color-current {
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--active-color, #ffffff);
    border: 1px solid rgba(0,0,0,.65);
    box-shadow: 0 0 0 1px rgba(255,255,255,.28), 0 2px 6px rgba(0,0,0,.4);
  }
  .hand-color-options {
    display: none;
    position: absolute;
    top: calc(100% + 7px);
    right: 0;
    grid-template-columns: repeat(2, 28px);
    gap: 6px;
    padding: 7px;
    background: rgba(10,10,10,0.96);
    border: 1px solid color-mix(in srgb, var(--dict-line,#9a9a9a) 75%, transparent);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,.38);
    z-index: 5;
  }
  .hand-color-options.open { display: grid; }
  .hand-color-options button {
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--swatch);
    border: 1px solid color-mix(in srgb, var(--dict-line,#9a9a9a) 78%, transparent);
    cursor: pointer;
  }
  .hand-color-options button.selected {
    border-color: var(--dict-ac, #c89b5e);
    box-shadow: 0 0 0 2px rgba(201,155,94,.25);
  }
  .hand-color-options button.selected::after {
    content: "";
    position: absolute;
    inset: 7px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,.9);
    box-shadow: 0 0 0 1px rgba(0,0,0,.45);
  }
  .hand-bottom { align-items: flex-start; }
  .hand-cands {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 36px;
    max-height: 42px;
    display: flex;
    align-items: center;
    gap: 5px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px;
    background: rgba(0,0,0,.30);
    border: 1px solid color-mix(in srgb, var(--dict-line,#9a9a9a) 72%, transparent);
    border-radius: 10px;
    transition: max-height .22s ease;
  }
  .hand-cands.expanded {
    flex-wrap: wrap;
    overflow-y: auto;
    overflow-x: hidden;
    max-height: min(35vh, 162px);
    align-content: flex-start;
  }
  .hand-cands button {
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--dict-line,#9a9a9a) 72%, transparent);
    border-radius: 8px;
    background: rgba(255,255,255,.045);
    color: var(--dict-text,#f2eee7);
    font-family: var(--hz-font, "Noto Serif CJK SC", "Source Han Serif SC", "Microsoft YaHei", "PingFang SC", serif);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }
  .hand-cands button:hover,
  .hand-cands button:focus-visible {
    background: color-mix(in srgb, var(--dict-ac,#c89b5e) 24%, transparent);
    border-color: color-mix(in srgb, var(--dict-ac,#c89b5e) 70%, var(--dict-line,#999));
    outline: none;
  }
  .hand-cands:empty::before {
    content: "Desenhe um ideograma";
    padding: 0 8px;
    color: color-mix(in srgb, var(--dict-text,#f2eee7) 56%, transparent);
    font-size: 12px;
    white-space: nowrap;
  }
  .hand-actions { display: flex; gap: 4px; align-items: center; }
  .hand-expand-btn.expanded { transform: rotate(180deg); }

  /* Hard override for the dictionary search row. */
  .dict-search,
  #sx .dict-search {
    display: flex !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 4px !important;
    grid-template-columns: none !important;
    grid-auto-flow: column !important;
  }
  .dict-search #dict-q,
  #sx .dict-search #dict-q {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    width: auto !important;
    max-width: none !important;
    order: 1 !important;
  }
  .dict-search #dict-hand-btn,
  #sx .dict-search #dict-hand-btn,
  .dict-search #dict-go,
  #sx .dict-search #dict-go {
    flex: 0 0 44px !important;
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
    height: 42px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .dict-search #dict-hand-btn,
  #sx .dict-search #dict-hand-btn { order: 2 !important; }
  .dict-search #dict-go,
  #sx .dict-search #dict-go { order: 3 !important; }
  .dict-search .dict-back-mini,
  #sx .dict-search .dict-back-mini {
    order: 0 !important;
    flex: 0 0 38px !important;
  }
  @media (max-width: 520px) {
    #handwrite-modal { padding: 10px 8px; }
    #handwrite-modal .hand-modal-content { width: 100%; padding: 10px; gap: 9px; }
    .hand-main { gap: 8px; }
    .hand-side { flex-basis: 40px; width: 40px; gap: 8px; }
    :root { --hand-size-btn: 32px; }
    .hand-thickness-ui { width: 34px; height: clamp(118px, 38vw, 156px); }
    .hand-color-options { right: -2px; }
  }
  `;
  document.head.appendChild(style);

  // Recognition state
  let strokes = [];
  let current = null;
  let isDown = false;
  let lastRecognize = 0;
  const composition = [];

  // Current drawing colour and stroke width. Updated via controls; defaults chosen
  // for comfortable visibility on desktop and high-density mobile displays.
  let currentColor = '#ffffff';
  let currentStrokeWidth = 5;

  // Grab important elements from the modal
  const compCharsEl = modal.querySelector('#hand-comp-chars');
  const delBtn = modal.querySelector('#hand-del');
  const closeBtn = modal.querySelector('#hand-close');
  const canvas = modal.querySelector('#hand-canvas');
  const guidesCanvas = modal.querySelector('#hand-guides-canvas');
  const board = modal.querySelector('#hand-board');
  const thickSlider = modal.querySelector('#hand-thick');
  const thicknessUi = modal.querySelector('#hand-thickness-ui');
  const thicknessThumb = modal.querySelector('#hand-thickness-thumb');
  const colorToggle = modal.querySelector('#hand-color-toggle');
  const colorOptions = modal.querySelector('#hand-color-options');
  const colorCurrent = modal.querySelector('#hand-color-current');
  const ctx = canvas.getContext('2d', { alpha: true });
  const guidesCtx = guidesCanvas.getContext('2d', { alpha: true });
  const candsEl = modal.querySelector('#hand-cands');
  const expandBtn = modal.querySelector('#hand-expand');
  const undoBtn = modal.querySelector('#hand-undo');
  const clearBtn = modal.querySelector('#hand-clear');
  const searchBtn2 = modal.querySelector('#hand-search');

  // Prepare recognition database once
  function addEntry(ch, seq, freq = 99999, med = null) {
    if (!ch || !seq) return;
    const seqList = Array.isArray(seq) ? seq : [seq];
    const cleanList = [];
    for (const raw of seqList) {
      const clean = String(raw || '').replace(/[^HSPDZ]/g, '');
      if (clean && !cleanList.includes(clean)) cleanList.push(clean);
    }
    if (!cleanList.length) return;
    const old = dbMap.get(ch);
    if (old) {
      if (freq < old.freq) old.freq = freq;
      if (med && !old.med) old.med = med;
      for (const clean of cleanList) {
        if (!old.seqs.includes(clean)) old.seqs.push(clean);
      }
      old.seq = chooseDisplaySeq(old.seqs);
      return;
    }
    const item = { ch, seq: chooseDisplaySeq(cleanList), seqs: cleanList.slice(), freq, med };
    dbMap.set(ch, item);
    db.push(item);
  }
  function chooseDisplaySeq(seqs) {
    return (seqs || []).slice().sort((a, b) => {
      const az = (a.match(/Z/g) || []).length;
      const bz = (b.match(/Z/g) || []).length;
      return Math.abs(a.length - 7) - Math.abs(b.length - 7) || az - bz || b.length - a.length;
    })[0] || '';
  }
  function resetSeed() {
    db = [];
    dbMap = new Map();
    SEED.forEach(e => addEntry(e[0], e[1], e[2]));

    // Sequências alternativas para traços com gancho/variação de teclado.
    addEntry('你', ['PSPZSPD', 'PSPZZPD', 'PSSZZSD', 'PSPZZSD'], 1);
    addEntry('他', ['PSZSHZ', 'PSZSHZ'], 200);
    addEntry('们', ['PSDSZ', 'PSDZ'], 201);
    addEntry('爱', ['PDDPDZHPZD', 'PDDPDZPZD', 'PDDPDZHPPD'], 80);
    addEntry('愛', ['PDDPDZDZDHPZD', 'PDDPDZDZDZPPD'], 1800);

  // Bloco de ideogramas compostos/complexos.
  // A base principal é a sequência de 5 tipos do teclado por traços:
  // H=一, S=丨, P=丿, D=丶/捺, Z=折/gancho.
  // Esses itens corrigem o ponto fraco da versão anterior: ela era rápida,
  // mas só conhecia caracteres curtos/médios. Caracteres como 露 só podem
  // aparecer se existir uma sequência de referência no índice local.
  addEntry('雨',['HSZSDDDD','HSZSDD DD'.replace(/ /g,'')],260);
  addEntry('雪',['HSZSDDDDZHH','HSZSDDDDZHHH'],930);
  addEntry('雷',['HSZSDDDDSZHHSH','HSZSDDDDSZHSH'],1500);
  addEntry('零',['HSZSDDDDPDDZD','HSZSDDDDPDDZ'],900);
  addEntry('霜',['HSZSDDDDHSPDSZHHH','HSZSDDDDHSPDSZHH'],2500);
  addEntry('雾',['HSZSDDDDPZDZP','HSZSDDDDPZDP'],1400);
  addEntry('霧',['HSZSDDDDZDPHPZP','HSZSDDDDZDPPZP'],2600);
  addEntry('需',['HSZSDDDDHPSZS','HSZSDDDDHPSS'],1700);
  addEntry('霍',['HSZSDDDDPSDHSHH','HSZSDDDDPSDHSH'],3200);
  addEntry('雲',['HSZSDDDDHHZD','HSZSDDDDHHZ'],1800);
  addEntry('震',['HSZSDDDDHPHHZPD','HSZSDDDDHPHZPD'],2100);
  addEntry('霆',['HSZSDDDDPHSHZD','HSZSDDDD PHSZD'.replace(/ /g,'')],3300);
  addEntry('霞',['HSZSDDDDZHSHHZZD','HSZSDDDDZHSHZD'],3800);
  addEntry('露',['HSZSDDDDSZHSHSDPZDSZH','HSZSDDDDSZHSHSDPZDSZH','HSZSDDDDSZHSHSPZDSZH','HSZSDDDDSZHSHSDPZDSZ'],2200);
  addEntry('路',['SZHSHSDPZDSZH','SZHSHSPZDSZH','SZHSHSDPZDSZ'],520);
  addEntry('足',['SZHSHSD','SZHSHD'],530);
  addEntry('各',['PZDSZH','PZDSZ'],531);

  // Mais compostos frequentes para reduzir falso positivo quando o usuário
  // escreve muitos traços. As sequências são aproximadas no esquema de 5 traços.
  addEntry('想',['HSPDSZHHHDZD','HSPDSZHHHDD'],70);
  addEntry('謝',['DDHPSZHHHPHSD','DDHPSZHHHPSHD'],1800);
  addEntry('道',['DDPHPZHHHZD','DDPHPZHHZD'],160);
  addEntry('還',['SZSSHHSZHPZDZD','SZSSHHSZHPDDZD'],760);
  addEntry('邊',['PSZHHHDDZDPZDZD','PSZHHHDDZPZDZD'],1500);
  addEntry('選',['ZHZHZHHSSHPDZD','ZHZHZHHSSPDZD'],900);
  addEntry('難',['HSSHSZHPDPSDHSHH','HSSHSZHPDPSDHSH'],1100);
  addEntry('觀',['HSSSZHSZHPSDHSHHSZPZ','HSSSZHSZHPSDHSHSZPZ'],1800);
  addEntry('歡',['HSSSZHSZHPSDHSHHPZPD','HSSSZHSZHPSDHSHHPZD'],2200);
  addEntry('學',['PSHHSZDDPDDZ ZSH'.replace(/ /g,''),'PSHHSZDDPDDZZSH'],580);
  addEntry('觉',['DDPDZSZPZ','DDPDZSZP'],590);
  addEntry('覺',['PSHHSZDDPDDZSZPZ','PSHHSZDDPDDZSZP'],1800);
  addEntry('體',['SZZHSHHSSZHHHSDDPHSH','SZZHSHHSSZHHHSDDP'],1400);
  addEntry('听',['SZHPPHS','SZHPPH'],260);
  addEntry('聽',['HSSHHHHSHSHHSSHHHDZD','HSSHHHHSHSHHSSHHDD'],1300);
  addEntry('龍',['DHSHZHHHZZHHSZHSHH','DHSHZHHHZZHHSZH'],1700);
  addEntry('麼',['DHPHSPDHSPDZZD','DHPHSPDHSPZD'],500);

    addOriginalHtmlStrokeAndRadicalIndex();
    COMMON_EXTRA.forEach(e => addEntry(e[0], e[1], e[2]));
    VARIANTS.forEach(e => addEntry(e[0], e[1], e[2]));
  }

  function addOriginalHtmlStrokeAndRadicalIndex() {
    // Extensão local leve do HTML original: radicais, componentes,
    // traços isolados e pares simplificado/tradicional.
    const STROKE_PARTS = [
        ['㇐','H',2],['㇑','S',2],['㇒','P',2],['㇓','P',3],['㇔','D',2],['㇏','D',4],['㇕','Z',3],['㇖','Z',3],['㇗','Z',3],['㇘','Z',3],['㇙','Z',3],['㇚','Z',3],['㇛','Z',3],['㇜','Z',3],['㇝','Z',3],['㇞','Z',3],['㇟','Z',3],['㇀','D',4],['㇁','Z',4],['㇂','Z',4],['㇃','Z',4],['㇄','Z',4],['㇅','Z',4],['㇆','Z',4],['㇇','Z',4],['㇈','Z',4],['㇉','Z',4],['㇊','Z',4],['㇋','Z',4],['㇌','Z',4],['㇍','Z',4],['㇎','Z',4],
        ['横','HSH',60],['竖','SHS',300],['豎','SHHSS',2200],['撇','HSHHSSZPDP',1000],['捺','HSHHPDD',1500],['点','SHSZHDDDD',150],['點','SHSZHSHSZHDDDD',1600],['折','HSHZP',700],['钩','PHHHZPZD',1200],['鈎','PHHHSHHHPZD',2200],['提','HSHSZHHHSHD',800]
      ];
    STROKE_PARTS.forEach(e => addEntry(e[0], e[1], e[2]));

    const RADICALS = [
        ['亅','S',40],['亠','DH',41],['冂','SZ',42],['冖','DZ',43],['冫','DD',44],['凵','SZ',45],['勹','PZ',46],['匕','PZ',47],['匚','HZ',48],['匸','HZ',49],['卩','ZS',50],['厶','ZD',51],['囗','SZH',52],['夂','PZD',53],['夊','PZD',54],['宀','DDZ',55],['尢','HPZ',56],['屮','ZSS',57],['巛','ZZZ',58],['幺','ZZD',59],['廴','ZDZ',60],['廾','HPS',61],['弋','HZD',62],['彐','ZHH',63],['彡','PPP',64],['彳','PPS',65],['戈','HZPD',66],['戶','PZHP',67],['户','DZHP',68],['攴','SHZD',69],['支','HSZD',70],['无','HHPZ',71],['毋','ZZHD',72],['殳','PZZD',73],['爿','ZSHS',74],['片','PSHZ',75],['牙','HZSP',76],['玄','DHZZD',77],['瓜','PPZD',78],['瓦','HZZD',79],['甘','HSSHH',80],['生','PHHSH',81],['用','PZSHS',82],['田','SZHSH',83],['疋','ZSHD',84],['疒','DHPDD',85],['癶','ZDPPD',86],['白','PSZHH',87],['皮','ZPZZD',88],['皿','SZSSH',89],['目','SZHHH',90],['矛','ZDZSP',91],['矢','PHHPD',92],['石','HPSZH',93],['示','HHSPD',94],['礻','DZSD',95],['禸','SZD',96],['禾','PHSPD',97],['穴','DDZPD',98],['立','DHSH',99],['竹','PHSPHS',100],['米','DDPHSPD',101],['糸','ZZDSPD',102],['缶','PHHSZS',103],['网','SZPDPD',104],['罒','SZSSH',105],['羊','DDPHHHS',106],['羽','ZDZD',107],['老','HSHPPZ',108],['而','HPSZS',109],['耒','HHHSPD',110],['耳','HSSHHH',111],['聿','ZHHHHS',112],['肉','SZPDPD',113],['臣','HSHZHS',114],['自','PSZHHH',115],['至','HZDHSH',116],['臼','PSHSHH',117],['舌','PHSZH',118],['舛','PZDHZS',119],['舟','PZDDHS',120],['艮','ZHHZPD',121],['色','PZZSHZ',122],['艹','HSS',123],['虍','SHZHPZ',124],['虫','SZHSHD',125],['血','PSZSSH',126],['行','PPSHHS',127],['衣','DHPZD',128],['衤','DZSPD',129],['西','HSZPZH',130],['覀','HSZSSH',131],['见','SZPZ',132],['見','SZHHHPZ',133],['角','PZPZHHS',134],['言','DHHSZH',135],['訁','DHHSZH',136],['谷','PDPDSZH',137],['豆','HSZHDDH',138],['豕','HPZPPPD',139],['豸','PDPDPPZ',140],['贝','SZPD',141],['貝','SZHHHPD',142],['赤','HSHPSPD',143],['走','HSHSHD',144],['足','SZHSHSD',145],['車','HSZHHS',146],['车','HZHS',147],['辛','DHSHHHS',148],['辰','HPHHZPD',149],['辶','DZD',150],['邑','SZHZSHZ',151],['阝','ZS',152],['酉','HSZPZHH',153],['釆','PDPHSPD',154],['里','SZHHSHH',155],['金','PDHHSHDD',156],['钅','PHHHZ',157],['長','HSHHHZPD',158],['門','SZHHZSHH',159],['门','DSZ',160],['阜','PZSHS',161],['隶','ZHHSPD',162],['隹','PSDHSHH',163],['雨','HSZSDDDD',164],['青','HHSHSZHH',165],['非','SHHHSHHH',166],['面','HPSZSSHH',167],['革','HSSHSZHHS',168],['韋','ZSHSZHHS',169],['韭','SHHHSHHHH',170],['音','DHSHSZHH',171],['頁','HPSZHHHPD',172],['页','HPSZPD',173],['風','PZSZHSHD',174],['风','PZPD',175],['飛','ZPDZPD',176],['飞','ZPD',177],['食','PDDZHHPD',178],['饣','PZZ',179],['首','DDPHPSZHHH',180],['香','PHSPDSZHH',181],['馬','HSHHHSZD',182],['马','ZZH',183],['骨','SZZHSDZHH',184],['高','DHSZHSZSZH',185],['髟','HSHHHZPPPD',186],['鬥','SHHSHHSHH',187],['鬯','PDDDDZPZ',188],['鬲','HSZHSZS',189],['鬼','PSZHHZPD',190],['魚','PZSZHSHDDDD',191],['鱼','PZSZHSHH',192],['鳥','PSZHHSZDDDD',193],['鸟','PZZH',194],['鹵','SHSZPDDDDH',195],['鹿','DHPZHHPZPZ',196],['麥','HSPDPDPDPZD',197],['麦','HHSH PZD'.replace(/ /g,''),198],['麻','DHPHSPDHSPD',199],['黃','HSSHSZHSHD',200],['黄','HSSHSZHSHD',201],['黍','PHSPDPDSZPD',202],['黑','SZHSHDDDD',203],['黹','SSDDHSPDD',204],['黽','SZHHZSHH',205],['鼎','SZHHHZSHS',206],['鼓','HSHSZHDDHHSZD',207],['鼠','PSHSHHZZDZZD',208],['鼻','PSZHHHSZHSHHPS',209],['齊','DHPPDDHS',210],['齐','DHPPS',211],['齒','SHSHHSPDPDS',212],['齿','SHSHSPDS',213],['龜','PZSZHHSZZHH',214],['龠','PDHSZHSZHSZH',215]
      ];
    RADICALS.forEach(e => addEntry(e[0], e[1], e[2]));
  }

  // Geometric helpers.  These functions are ported from the standalone
  // recogniser and operate on arrays of points with x/y/t fields.
  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function lengthOf(s) {
    let l = 0;
    for (let i = 1; i < s.length; i++) l += dist(s[i - 1], s[i]);
    return l;
  }
  function bbox(s) {
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const p of s) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }
  function angleNorm(a) {
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }
  function angleDiffDirected(a, b) {
    return Math.abs(angleNorm(a - b));
  }
  function angleDiffAxis(a, b) {
    let d = Math.abs(angleNorm(a - b));
    d = Math.min(d, Math.abs(Math.PI - d));
    return d;
  }
  function dirScore(angle, proto, tol) {
    return Math.max(0, 1 - angleDiffDirected(angle, proto) / tol);
  }
  function axisScore(angle, proto, tol) {
    return Math.max(0, 1 - angleDiffAxis(angle, proto) / tol);
  }
  function resample(s, n = 22) {
    const L = lengthOf(s);
    if (!L || s.length < 2) return s.slice();
    const out = [s[0]];
    let target = L / (n - 1), acc = 0, next = target;
    for (let i = 1; i < s.length; i++) {
      let a = s[i - 1], b = s[i], seg = dist(a, b);
      if (!seg) continue;
      while (acc + seg >= next && out.length < n - 1) {
        const r = (next - acc) / seg;
        out.push({ x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r });
        next += target;
      }
      acc += seg;
    }
    out.push(s[s.length - 1]);
    return out;
  }
  function pathAngle(s, from = 0, to = 1) {
    if (!s || s.length < 2) return 0;
    const a = s[Math.max(0, Math.min(s.length - 1, Math.round((s.length - 1) * from)))];
    const b = s[Math.max(0, Math.min(s.length - 1, Math.round((s.length - 1) * to)))];
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  function rdp(points, eps) {
    if (points.length <= 2) return points.slice();
    const a = points[0], b = points[points.length - 1];
    const vx = b.x - a.x, vy = b.y - a.y;
    const den = Math.hypot(vx, vy) || 1;
    let maxD = -1, idx = -1;
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i];
      const d = Math.abs(vy * p.x - vx * p.y + b.x * a.y - b.y * a.x) / den;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > eps) {
      const left = rdp(points.slice(0, idx + 1), eps);
      const right = rdp(points.slice(idx), eps);
      return left.slice(0, -1).concat(right);
    }
    return [a, b];
  }
  function rotatePoint(p, cx, cy, rad) {
    const x = p.x - cx, y = p.y - cy, co = Math.cos(rad), si = Math.sin(rad);
    return { x: cx + x * co - y * si, y: cy + x * si + y * co, t: p.t };
  }
  function rotateStroke(s, cx, cy, deg) {
    const rad = deg * Math.PI / 180;
    return s.map(p => rotatePoint(p, cx, cy, rad));
  }
  function allStrokeBox() {
    const pts = [];
    strokes.forEach(s => s.forEach(p => pts.push(p)));
    return pts.length ? bbox(pts) : { cx: canvas.clientWidth / 2, cy: canvas.clientHeight / 2, w: 1, h: 1 };
  }
  function mergeProbs(base, add, weight = 1) {
    for (const k of 'HSPDZ') base[k] = (base[k] || 0) + (add[k] || 0) * weight;
  }
  function normalizeProbs(p) {
    let sum = 0;
    for (const k of 'HSPDZ') {
      p[k] = Math.max(0.001, p[k] || 0);
      sum += p[k];
    }
    for (const k of 'HSPDZ') p[k] /= sum;
    let code = 'H', best = -1;
    for (const k of 'HSPDZ') {
      if (p[k] > best) {
        best = p[k];
        code = k;
      }
    }
    return { code, probs: p, confidence: best };
  }
  function analyzeStroke(raw) {
    const s = resample(raw, 24);
    const b = bbox(s);
    const L = lengthOf(s);
    const a = s[0], z = s[s.length - 1];
    const chord = Math.max(0.001, dist(a, z));
    const dx = z.x - a.x, dy = z.y - a.y, adx = Math.abs(dx), ady = Math.abs(dy);
    const main = Math.atan2(dy, dx);
    const startA = pathAngle(s, 0, 0.22);
    const midA = pathAngle(s, 0.28, 0.72);
    const endA = pathAngle(s, 0.78, 1);
    const straight = chord / (L || 1);
    const dotness = (L < 18 || (b.w < 14 && b.h < 14));
    const poly = rdp(s, Math.max(3.2, Math.min(12, L * 0.055)));
    const segs = [];
    for (let i = 1; i < poly.length; i++) {
      const p0 = poly[i - 1], p1 = poly[i];
      const len = dist(p0, p1);
      if (len > Math.max(4, L * 0.045)) segs.push({ a: p0, b: p1, len, ang: Math.atan2(p1.y - p0.y, p1.x - p0.x) });
    }
    let cornerEnergy = 0, maxTurn = 0, cornerCount = 0;
    for (let i = 1; i < segs.length; i++) {
      const d = angleDiffDirected(segs[i].ang, segs[i - 1].ang);
      const w = Math.min(segs[i].len, segs[i - 1].len) / (L || 1);
      if (d > 0.52 && w > 0.055) {
        cornerCount++;
        cornerEnergy += d * w * 2.2;
        maxTurn = Math.max(maxTurn, d);
      }
    }
    const tail = segs[segs.length - 1], prev = segs[segs.length - 2];
    const hook = tail && prev ? (angleDiffDirected(tail.ang, prev.ang) > 0.72 && tail.len < L * 0.36 && tail.len > Math.max(5, L * 0.045)) : false;
    const hasBrokenShape = (cornerCount >= 1 && maxTurn > 0.62 && (b.w > 10 && b.h > 10));
    const p = { H: 0, S: 0, P: 0, D: 0, Z: 0 };
    p.H += axisScore(main, 0, 1.05) * 1.45 + axisScore(midA, 0, 1.10) * 0.55;
    p.S += axisScore(main, Math.PI / 2, 1.05) * 1.45 + axisScore(midA, Math.PI / 2, 1.10) * 0.55;
    // 丿 and 丶/捺 need direction: start and end matter.
    p.P += dirScore(main, 2.25, 1.15) * 1.65 + dirScore(startA, 2.25, 1.25) * 0.45 + dirScore(endA, 2.25, 1.35) * 0.25;
    p.D += dirScore(main, 0.78, 1.15) * 1.45 + dirScore(startA, 0.78, 1.25) * 0.38 + dirScore(endA, 0.78, 1.35) * 0.25;
    if (dotness) {
      p.D += 2.3;
      p.P += 0.28;
      p.H *= 0.45;
      p.S *= 0.45;
    }
    if (straight > 0.82) {
      p.Z *= 0.25;
    } else if (straight > 0.64) {
      p.Z += 0.18;
    }
    const zShape = Math.max(0, cornerEnergy * 0.72, hook ? 1.55 : 0, (hasBrokenShape ? 1.05 : 0));
    p.Z += zShape;
    if (hasBrokenShape && maxTurn > 1.05) {
      p.Z += 0.75;
    }
    if (hook) {
      if (axisScore(prev.ang, Math.PI / 2, 1.0) > 0.45) p.S += 0.55;
      if (axisScore(prev.ang, 0, 1.0) > 0.45) p.H += 0.45;
    }
    if (ady > adx * 0.82 && dy > 0 && !hasBrokenShape) p.S += 0.62;
    if (adx > ady * 0.82 && Math.abs(dy) < b.h * 0.85 && !hasBrokenShape) p.H += 0.45;
    if (dx < 0 && dy > 0) {
      p.P += 0.9;
      p.D *= 0.62;
    }
    if (dx > 0 && dy > 0) {
      p.D += 0.75;
      p.P *= 0.72;
    }
    if (dx > 0 && dy < 0) {
      p.P += 0.25;
      p.H += 0.35;
      p.D *= 0.55;
    }
    const out = normalizeProbs(p);
    out.detail = { start: a, end: z, straight, cornerCount, maxTurn, hook, poly: poly.length };
    return out;
  }
  function analysesFor(deg = 0) {
    const all = allStrokeBox();
    return strokes.map(s => analyzeStroke(deg ? rotateStroke(s, all.cx, all.cy, deg) : s));
  }
  function compatible(a, b) {
    if (a === b) return true;
    return (a === 'D' && b === 'P') || (a === 'P' && b === 'D') || (a === 'Z' && (b === 'H' || b === 'S')) || (b === 'Z' && (a === 'H' || a === 'S'));
  }
  function editDistanceWeighted(codes, seq) {
    const n = codes.length, m = seq.length;
    let prev = Array(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;
    for (let i = 1; i <= n; i++) {
      let cur = [i];
      for (let j = 1; j <= m; j++) {
        const sub = codes[i - 1] === seq[j - 1] ? 0 : (compatible(codes[i - 1], seq[j - 1]) ? 0.42 : 1);
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + sub);
      }
      prev = cur;
    }
    return prev[m];
  }
  function strokeMatchScore(a, code) {
    let p = a.probs[code] || 0.001;
    const primary = a.code;
    let s = p * 15;
    if (primary === code) s += 6;
    else if (compatible(primary, code)) s += 2.4;
    else s -= 4.6;
    if (code === 'Z' && (a.detail.hook || a.detail.cornerCount)) s += 2.2;
    if (code === 'D' && a.detail.straight < 0.55 && a.detail.poly <= 4) s += 0.8;
    return s;
  }
  function alignSeqScore(analyses, seq) {
    const n = analyses.length, m = seq.length;
    const codes = analyses.map(a => a.code);
    let prefix = 0;
    for (let i = 0; i < Math.min(n, m); i++) {
      if (codes[i] === seq[i]) prefix += 1;
      else if (compatible(codes[i], seq[i])) prefix += 0.55;
      else break;
    }
    let dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(-1e9));
    dp[0][0] = 0;
    for (let i = 1; i <= n; i++) dp[i][0] = dp[i - 1][0] - 7.2;
    for (let j = 1; j <= m; j++) dp[0][j] = dp[0][j - 1] - 5.4;
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const match = dp[i - 1][j - 1] + strokeMatchScore(analyses[i - 1], seq[j - 1]);
        const extraUser = dp[i - 1][j] - 7.0;
        const missing = dp[i][j - 1] - 5.2;
        dp[i][j] = Math.max(match, extraUser, missing);
      }
    }
    let score = dp[n][m];
    if (seq.startsWith(codes.join(''))) score += 34;
    score += (prefix / Math.max(1, n)) * 30;
    score -= Math.abs(m - n) * 2.15;
    score += Math.max(0, 34 - editDistanceWeighted(codes, seq) * 9.5);
    if (n >= 5 && m <= 3) score -= 46;
    if (n >= 7 && m <= 5) score -= 28;
    if (n >= 12 && m <= 8) score -= 38;
    if (n >= 16 && m <= 12) score -= 26;
    const lenGap = Math.abs(n - m);
    if (n >= 10 && m >= 10 && lenGap <= 3) score += 18 - lenGap * 4;
    if (n >= 16 && m >= 16 && lenGap <= 4) score += 22 - lenGap * 3;
    return score;
  }
  function itemSeqs(item) {
    return item.seqs && item.seqs.length ? item.seqs : [item.seq];
  }
  function bestSeqScoreForVariant(item, analyses) {
    let best = -1e9, bestSeq = item.seq;
    for (const seq of itemSeqs(item)) {
      const s = alignSeqScore(analyses, seq);
      if (s > best) {
        best = s;
        bestSeq = seq;
      }
    }
    return [best, bestSeq];
  }
  function recognizeNow() {
    if (!strokes.length) {
      renderResults([]);
      return;
    }
    const rotations = [0, -8, 8, -16, 16, -28, 28, -40, 40];
    const variants = rotations.map(deg => ({ deg, analyses: analysesFor(deg) }));
    let scored = [];
    for (const item of db) {
      let best = -1e9;
      for (const v of variants) {
        const got = bestSeqScoreForVariant(item, v.analyses);
        const rotPenalty = Math.abs(v.deg) * 0.055;
        const s = got[0] - rotPenalty;
        if (s > best) best = s;
      }
      if (best <= -42) continue;
      best += Math.max(0, 19 - Math.log10((item.freq || 99999) + 1) * 4.8);
      scored.push([best, item]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    renderResults(scored.slice(0, 14));
  }
  function renderResults(list) {
    candsEl.innerHTML = '';
    if (!list.length) {
      candsEl.textContent = 'Sem candidatos';
      return;
    }
    const max = list[0][0] || 1;
    list.forEach(([score, it]) => {
      const pct = Math.max(1, Math.min(99, Math.round((score / max) * 92 + 6)));
      const btn = document.createElement('button');
      btn.textContent = it.ch;
      btn.title = pct + '%';
      btn.addEventListener('click', () => {
        composition.push(it.ch);
        updateComposition();
        clearCanvas(false);
        // After selecting a candidate, allow the user to continue drawing
      });
      candsEl.appendChild(btn);
    });
  }

  /** Update the composition bar to reflect the current sequence of
   * selected ideograms.  Called after adding or removing items. */
  function updateComposition() {
    compCharsEl.innerHTML = '';
    composition.forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      compCharsEl.appendChild(span);
    });
    // Scroll to end so the last added character is visible
    compCharsEl.parentElement.scrollLeft = compCharsEl.parentElement.scrollWidth;
  }

  /** Remove the last character from the composition bar. */
  function deleteLastChar() {
    if (composition.length > 0) {
      composition.pop();
      updateComposition();
    }
  }

  /** Clear the canvas and optionally the stroke list.  When
   * `removeAllStrokes` is true, also clears stored strokes; otherwise
   * only resets the current stroke being drawn. */
  function clearCanvas(removeAllStrokes = true) {
    // Always clear only the drawing area; composition is preserved separately.
    // This is used by the clear button and after choosing a candidate so
    // the user can immediately draw the next ideogram.
    strokes = [];
    current = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    guidesCtx.clearRect(0, 0, guidesCanvas.width, guidesCanvas.height);
    drawGuides();
    recognizeNow();
  }
  /** Undo the last stroke. */
  function undoStroke() {
    strokes.pop();
    redraw();
    recognizeNow();
  }

  /** Draw a line segment on the canvas using the current colour and thickness. */
  function drawSegment(a, b) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  /** Draw a full stroke composed of many points. */
  function drawStroke(s) {
    if (!s || s.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentStrokeWidth;
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
    ctx.stroke();
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(drawStroke);
    if (current) drawStroke(current);
  }

  /** Draw guideline lines on the guides canvas.  The guidelines consist of
   * a dashed vertical and horizontal line through the centre plus
   * two diagonals forming an ‘X’.  Colours derive from the theme’s
   * line colour variable. */
  function drawGuides() {
    const rect = guidesCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;
    guidesCtx.clearRect(0, 0, w, h);
    const comp = getComputedStyle(document.documentElement);
    let col = comp.getPropertyValue('--dict-line') || '#9a9a9a';
    col = col.trim() || '#9a9a9a';
    guidesCtx.strokeStyle = col;
    guidesCtx.globalAlpha = 0.72;
    guidesCtx.lineWidth = 1.35;
    guidesCtx.setLineDash([6, 6]);
    guidesCtx.beginPath();
    guidesCtx.moveTo(w / 2, 0);
    guidesCtx.lineTo(w / 2, h);
    guidesCtx.moveTo(0, h / 2);
    guidesCtx.lineTo(w, h / 2);
    guidesCtx.moveTo(0, 0);
    guidesCtx.lineTo(w, h);
    guidesCtx.moveTo(w, 0);
    guidesCtx.lineTo(0, h);
    guidesCtx.stroke();
    guidesCtx.setLineDash([]);
    guidesCtx.globalAlpha = 1;
  }
  function getStrokeLimits() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const boardSize = Math.max(220, board.getBoundingClientRect().width || 320);
    const mobile = Math.min(window.innerWidth || 999, window.innerHeight || 999) <= 520;
    const min = mobile ? 3.2 : 2.6;
    const max = Math.max(7.5, Math.min(mobile ? 12 : 10.5, boardSize * (mobile ? 0.040 : 0.032)));
    const def = Math.max(min, Math.min(max, mobile ? 5.1 : 4.6));
    return { min, max, def, dpr };
  }
  function updateThicknessVisual() {
    if (!thicknessUi || !thickSlider) return;
    const limits = getStrokeLimits();
    const value = Math.max(limits.min, Math.min(limits.max, parseFloat(thickSlider.value || limits.def)));
    const pct = ((value - limits.min) / Math.max(0.001, limits.max - limits.min)) * 100;
    const thumb = 12 + pct * 0.08;
    thicknessUi.style.setProperty('--thick-pct', String(Math.max(0, Math.min(100, pct))));
    thicknessUi.style.setProperty('--thick-thumb', thumb.toFixed(1) + 'px');
    thicknessUi.setAttribute('aria-valuemin', Math.round(limits.min * 10).toString());
    thicknessUi.setAttribute('aria-valuemax', Math.round(limits.max * 10).toString());
    thicknessUi.setAttribute('aria-valuenow', Math.round(value * 10).toString());
  }
  function setStrokeWidth(value, shouldRedraw = true) {
    const limits = getStrokeLimits();
    const next = Math.max(limits.min, Math.min(limits.max, Number(value || limits.def)));
    currentStrokeWidth = next;
    thickSlider.min = limits.min.toFixed(1);
    thickSlider.max = limits.max.toFixed(1);
    thickSlider.step = '0.5';
    thickSlider.value = next.toFixed(1);
    ctx.lineWidth = currentStrokeWidth;
    updateThicknessVisual();
    if (shouldRedraw) redraw();
  }
  function setStrokeWidthFromPointer(ev) {
    if (!thicknessUi) return;
    const rail = thicknessUi.querySelector('.hand-thickness-rail') || thicknessUi;
    const rect = rail.getBoundingClientRect();
    const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const pct = 1 - (y / Math.max(1, rect.height));
    const limits = getStrokeLimits();
    setStrokeWidth(limits.min + pct * (limits.max - limits.min));
  }

  /** Resize the canvases to match their container and redraw.  This
   * handles device pixel ratio scaling and updates stroke styles,
   * thickness and guidelines accordingly. */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    // Update pixel dimensions
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;
    guidesCanvas.width = w;
    guidesCanvas.height = h;
    // Set transforms for drawing contexts
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    guidesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Apply current drawing settings
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    setStrokeWidth(currentStrokeWidth || getStrokeLimits().def, false);
    // Redraw guidelines and strokes
    guidesCtx.clearRect(0, 0, guidesCanvas.width, guidesCanvas.height);
    drawGuides();
    redraw();
  }
  // Observe resize events on the parent of the canvas
  new ResizeObserver(resizeCanvas).observe(board);
  window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 250));

  function pos(ev) {
    const rect = canvas.getBoundingClientRect();
    const p = ev.touches ? ev.touches[0] : ev;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top, t: performance.now() };
  }
  function startDraw(ev) {
    ev.preventDefault();
    isDown = true;
    current = [pos(ev)];
  }
  function moveDraw(ev) {
    if (!isDown) return;
    ev.preventDefault();
    const p = pos(ev);
    const last = current[current.length - 1];
    const dx = p.x - last.x, dy = p.y - last.y;
    if (dx * dx + dy * dy > 1.2) {
      current.push(p);
      drawSegment(last, p);
    }
  }
  function endDraw(ev) {
    if (!isDown) return;
    ev && ev.preventDefault();
    isDown = false;
    if (current && current.length > 1) {
      strokes.push(current);
      current = null;
      redraw();
      recognizeNow();
    } else {
      current = null;
    }
  }
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); startDraw(e); });
  canvas.addEventListener('pointermove', moveDraw);
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('pointercancel', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });

  // Button handlers
  handBtn.addEventListener('click', () => {
    openModal();
  });
  delBtn.addEventListener('click', () => {
    deleteLastChar();
  });
  closeBtn.addEventListener('click', () => {
    closeModal();
  });
  undoBtn.addEventListener('click', () => {
    undoStroke();
  });
  clearBtn.addEventListener('click', () => {
    clearCanvas(true);
  });
  searchBtn2.addEventListener('click', () => {
    // Send composed string to dictionary and close modal
    const q = composition.join('');
    const dq = document.getElementById('dict-q');
    if (dq) {
      dq.value = q;
      // Trigger search via global function if available
      if (typeof v29RunDict === 'function') v29RunDict(q.trim());
    }
    composition.length = 0;
    updateComposition();
    closeModal();
  });
  expandBtn.addEventListener('click', () => {
    const expanded = candsEl.classList.toggle('expanded');
    expandBtn.classList.toggle('expanded', expanded);
  });
  // Stroke thickness: hidden range keeps semantics; custom vertical UI handles pointer/keyboard.
  if (thickSlider) {
    thickSlider.addEventListener('input', e => setStrokeWidth(e.target.value));
  }
  if (thicknessUi) {
    const startThicknessDrag = ev => {
      ev.preventDefault();
      thicknessUi.setPointerCapture && ev.pointerId != null && thicknessUi.setPointerCapture(ev.pointerId);
      setStrokeWidthFromPointer(ev);
      const move = e => setStrokeWidthFromPointer(e);
      const stop = e => {
        thicknessUi.releasePointerCapture && e.pointerId != null && thicknessUi.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', stop);
        window.removeEventListener('pointercancel', stop);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', stop);
      window.addEventListener('pointercancel', stop);
    };
    thicknessUi.addEventListener('pointerdown', startThicknessDrag);
    thicknessUi.addEventListener('keydown', ev => {
      const limits = getStrokeLimits();
      const step = 0.5;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') { ev.preventDefault(); setStrokeWidth(currentStrokeWidth + step); }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft') { ev.preventDefault(); setStrokeWidth(currentStrokeWidth - step); }
      if (ev.key === 'Home') { ev.preventDefault(); setStrokeWidth(limits.min); }
      if (ev.key === 'End') { ev.preventDefault(); setStrokeWidth(limits.max); }
    });
  }
  function applyColorButtonState(col, activeBtn = null) {
    const resolved = (col || '#ffffff').trim();
    currentColor = resolved;
    ctx.strokeStyle = currentColor;
    if (colorToggle) {
      colorToggle.style.setProperty('--active-color', currentColor);
      colorToggle.style.borderColor = currentColor;
    }
    if (colorCurrent) colorCurrent.style.background = currentColor;
    if (colorOptions) {
      colorOptions.querySelectorAll('button').forEach(b => {
        const isSelected = activeBtn ? b === activeBtn : (b.dataset.color || '').toLowerCase() === resolved.toLowerCase();
        b.classList.toggle('selected', isSelected);
      });
    }
  }
  // Colour toggle and options. The palette opens downward and closes on selection.
  if (colorToggle && colorOptions) {
    colorToggle.addEventListener('click', ev => {
      ev.stopPropagation();
      colorOptions.classList.toggle('open');
    });
    colorOptions.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      let col = btn.dataset.color || '';
      if (col === 'accent') {
        const computed = getComputedStyle(document.documentElement);
        col = computed.getPropertyValue('--dict-ac') || '#c89b5e';
      }
      col = col.trim();
      if (!col) return;
      applyColorButtonState(col, btn);
      colorOptions.classList.remove('open');
      redraw();
    });
    document.addEventListener('click', e => {
      if (!modal.contains(e.target) || (!colorOptions.contains(e.target) && e.target !== colorToggle && !colorToggle.contains(e.target))) {
        colorOptions.classList.remove('open');
      }
    });
  }
  // Close modal when clicking outside of content
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target === modal.querySelector('.hand-modal-overlay')) {
      closeModal();
    }
  });

  function openModal() {
    // Reset everything that belongs to the previous handwriting search.
    composition.length = 0;
    updateComposition();
    clearCanvas(true);
    // Reset candidate list
    candsEl.innerHTML = '';
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    // Reset expansion state
    candsEl.classList.remove('expanded');
    expandBtn.classList.remove('expanded');
    // Reset colour and thickness UI indicators.
    if (colorOptions) colorOptions.classList.remove('open');
    const whiteBtn = colorOptions ? colorOptions.querySelector('[data-color="#ffffff"]') : null;
    applyColorButtonState('#ffffff', whiteBtn);
    // Ensure composition bar scroll position and canvas dimensions before applying default thickness.
    updateComposition();
    resizeCanvas();
    setStrokeWidth(getStrokeLimits().def, false);
    redraw();
  }
  function closeModal() {
    modal.style.display = 'none';
    modal.classList.remove('show');
    composition.length = 0;
    updateComposition();
    clearCanvas(true);
    candsEl.innerHTML = '';
    if (colorOptions) colorOptions.classList.remove('open');
  }

  // Build recognition database now
  resetSeed();
  // Initialise composition display
  updateComposition();
  // Initial canvas sizing
  resizeCanvas();
}