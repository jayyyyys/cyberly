-- migrate:statement-start
INSERT INTO resource_article_translations
  (resource_id, locale, title, summary, content_json, source_label)
VALUES
  ((SELECT id FROM resource_articles WHERE slug = 'phishing'),
   'ms',
   'Pancingan Data',
   'Kenali umpan sebelum anda terperangkap.',
   JSON_ARRAY(
     'Pancingan data ialah serangan siber apabila penjenayah menyamar sebagai organisasi sah — bank, perkhidmatan penghantaran, atau agensi kerajaan — melalui e-mel, SMS, atau laman web palsu. Matlamatnya ialah memperdaya anda supaya menyerahkan maklumat sensitif seperti kata laluan, nombor kad kredit, atau PIN sekali guna. Mesej seperti ini sering mewujudkan rasa cemas palsu, contohnya akaun akan digantung atau bungkusan sedang menunggu jika anda tidak bertindak segera.',
     'Serangan pancingan data moden semakin canggih. Spear phishing menyasarkan individu tertentu menggunakan butiran peribadi daripada media sosial supaya mesej terasa meyakinkan. Smishing menggunakan SMS, manakala vishing berlaku melalui panggilan telefon. Pengguna yang mahir teknologi juga boleh menjadi mangsa kerana penyerang mengkaji sasaran dan membina senario yang nampak sesuai dengan keadaan mereka.',
     'Untuk melindungi diri, semak alamat e-mel pengirim dengan teliti — cari ejaan halus yang salah seperti ''paypa1.com'' dan bukannya ''paypal.com''. Jangan klik pautan dalam mesej yang tidak diminta; pergi terus ke laman web rasmi. Aktifkan pengesahan berbilang faktor pada akaun supaya walaupun kata laluan dicuri, penyerang tidak mudah mengakses data anda.'
   ),
   'Cyber Security Agency of Singapore'),
  ((SELECT id FROM resource_articles WHERE slug = 'phishing'),
   'zh-CN',
   '网络钓鱼',
   '在上钩之前，先认出诱饵。',
   JSON_ARRAY(
     '网络钓鱼是一种网络攻击，犯罪分子会冒充合法组织，例如银行、快递服务，甚至政府机构，通过电子邮件、短信或假网站联系你。目的就是诱骗你交出敏感信息，如密码、信用卡号码或一次性 PIN。这类消息常制造假的紧迫感，警告你账号会被暂停，或包裹在等待处理，除非你立刻行动。',
     '现代网络钓鱼攻击已经非常精细。鱼叉式钓鱼会利用从社交媒体收集的个人资料，专门针对特定对象，让消息显得真实。Smishing 使用短信，vishing 则通过电话进行。即使懂科技的人也可能受害，因为攻击者会研究目标，并设计出符合对方情况的可信情境。',
     '保护自己时，请仔细检查发件人的电邮地址，例如留意 ''paypa1.com'' 这种细微拼写，而不是 ''paypal.com''。不要点击陌生消息中的链接；请直接前往官方网站。为账号开启多因素认证，这样即使密码被偷，攻击者也不容易进入你的资料。'
   ),
   'Cyber Security Agency of Singapore'),
  ((SELECT id FROM resource_articles WHERE slug = 'online-scams'),
   'ms',
   'Penipuan Dalam Talian',
   'Ketahui helah yang digunakan penipu untuk mencuri wang anda.',
   JSON_ARRAY(
     'Penipuan dalam talian merangkumi pelbagai skim palsu yang direka untuk memperdaya orang supaya menghantar wang atau mendedahkan maklumat peribadi. Jenis biasa termasuk penipuan e-dagang seperti kedai palsu yang menerima bayaran tetapi tidak menghantar barang, penipuan pelaburan dengan pulangan terlalu tinggi, love scam apabila penjenayah membina hubungan palsu sebelum meminta wang, dan penipuan kerja yang menjanjikan pendapatan mudah.',
     'Malaysia sering mencatat kadar penipuan dalam talian yang tinggi. Polis Diraja Malaysia (PDRM) melaporkan kerugian bernilai berbilion ringgit setiap tahun, dengan Macau scam, penipuan telefon, dan penipuan pelaburan antara yang paling kerap berlaku. Mangsa sering malu membuat laporan, dan ini membolehkan penipu terus beroperasi serta menyasarkan orang lain.',
     'Pertahanan terbaik ialah sikap skeptikal yang sihat. Jika tawaran kedengaran terlalu bagus untuk dipercayai, besar kemungkinan ia memang tidak benar. Sentiasa sahkan kesahihan laman web, penjual, dan platform pelaburan sebelum memindahkan wang. Gunakan kaedah bayaran selamat yang ada perlindungan pembeli, dan laporkan scam yang disyaki kepada talian National Scam Response Centre (NSRC) di 997.'
   ),
   'National Scam Response Centre (NSRC) Malaysia'),
  ((SELECT id FROM resource_articles WHERE slug = 'online-scams'),
   'zh-CN',
   '网上诈骗',
   '了解骗子用来偷走你金钱的手法。',
   JSON_ARRAY(
     '网上诈骗包括各种欺诈手段，目的在于骗取金钱或个人资料。常见类型包括电商诈骗，例如假网店收款后不发货；投资诈骗，承诺不现实的高回报；爱情诈骗，犯罪分子花数周或数月建立假关系后要求汇款；以及工作诈骗，声称轻松工作就能获得收入。',
     '马来西亚一直是网上欺诈高发的国家之一。马来西亚皇家警察（PDRM）每年报告数十亿令吉损失，其中 Macau scam、电话诈骗和投资诈骗最常见。受害者常因羞愧而不报案，这让诈骗者继续运作并寻找新的目标。',
     '最好的防御是保持健康的怀疑。如果一个机会听起来好得不像真的，它几乎一定有问题。转账前请确认网站、卖家和投资平台是否合法。使用有买家保护的安全付款方式，并拨打 National Scam Response Centre（NSRC）热线 997 举报可疑诈骗。'
   ),
   'National Scam Response Centre (NSRC) Malaysia'),
  ((SELECT id FROM resource_articles WHERE slug = 'misinformation-fake-news'),
   'ms',
   'Maklumat Palsu & Berita Palsu',
   'Hentikan maklumat palsu daripada merebak melalui rangkaian anda.',
   JSON_ARRAY(
     'Maklumat palsu merujuk kepada maklumat yang salah atau tidak tepat yang tersebar tanpa mengira niat, manakala disinformasi sengaja direka untuk menipu. Dalam era media sosial, kedua-duanya bergerak sangat pantas. Satu hantaran mengelirukan boleh mencapai ribuan orang dalam beberapa jam, membentuk pandangan tentang kesihatan, pilihan raya, dan keselamatan awam sebelum pembetulan sempat sampai.',
     'Malaysia pernah memperkenalkan Akta Anti-Berita Tidak Benar pada tahun 2018, menunjukkan betapa seriusnya isu ini. Maklumat palsu tentang rawatan kesihatan, tokoh politik, dan bencana alam telah menyebabkan kesan dunia sebenar — daripada orang menolak vaksin hingga keganasan akibat khabar angin. Sifat tular media sosial sering mengutamakan kemarahan dan perkara baharu berbanding ketepatan.',
     'Sebelum berkongsi apa-apa, gunakan kaedah SIFT: Stop sebelum bertindak, Investigate sumber, Find liputan lebih baik daripada saluran dipercayai, dan Trace dakwaan ke asalnya. Laman semakan fakta seperti Sebenarnya.my, portal semakan fakta rasmi Malaysia, dan AFP Fact Check menyediakan maklumat disahkan tentang dakwaan tular. Ingat, berkongsi maklumat palsu walaupun tanpa sengaja tetap menjadikan anda sebahagian daripada masalah.'
   ),
   'Sebenarnya.my — Malaysia''s Official Fact Check Portal'),
  ((SELECT id FROM resource_articles WHERE slug = 'misinformation-fake-news'),
   'zh-CN',
   '错误信息与假新闻',
   '阻止虚假信息在你的网络中扩散。',
   JSON_ARRAY(
     '错误信息是指不论意图如何而传播的虚假或不准确信息；虚假信息则是故意编造来欺骗他人的内容。在社交媒体时代，两者传播速度都非常快。一条误导性帖文可在数小时内触达成千上万人，在更正出现之前就影响人们对健康、选举和公共安全的看法。',
     '马来西亚曾在 2018 年推出《反假新闻法》，反映政府对这个问题的重视。关于健康疗法、政治人物和自然灾害的虚假信息已经造成现实伤害，例如有人拒绝疫苗，或因谣言引发群体暴力。社交平台的病毒式传播机制常奖励愤怒和新奇，而不是准确性。',
     '分享任何内容前，可以使用 SIFT 方法：Stop，先停下来；Investigate，调查来源；Find，寻找可信媒体的更好报道；Trace，追溯说法的原始出处。Sebenarnya.my（马来西亚官方事实核查门户）和 AFP Fact Check 等网站会核实热门说法。请记住，即使不是故意，分享虚假信息也会让你成为问题的一部分。'
   ),
   'Sebenarnya.my — Malaysia''s Official Fact Check Portal'),
  ((SELECT id FROM resource_articles WHERE slug = 'ai-generated-content'),
   'ms',
   'Kandungan Dijana AI',
   'Fahami apa yang boleh dicipta mesin — dan mengapa ia penting.',
   JSON_ARRAY(
     'Kecerdasan buatan kini boleh menjana teks, imej, audio, dan video yang hampir sukar dibezakan daripada kandungan manusia. Alat seperti model bahasa besar (LLM) boleh menulis artikel, ulasan produk, dan hantaran media sosial yang meyakinkan secara besar-besaran. Penjana imej AI boleh menghasilkan gambar realistik tentang peristiwa yang tidak pernah berlaku. Keupayaan ini berguna untuk reka bentuk, aksesibiliti, dan pendidikan, tetapi juga membawa risiko serius.',
     'Kandungan dijana AI menjadi berbahaya apabila digunakan tanpa pendedahan untuk memperdaya. Ulasan palsu mempengaruhi keputusan pembelian. Propaganda tulisan AI membanjiri ekosistem maklumat. Media sintetik digunakan dalam scam apabila penjenayah menyamar sebagai eksekutif atau ahli keluarga melalui panggilan audio atau video. Apabila alat ini semakin murah dan mudah digunakan, jumlah kandungan sintetik dalam talian meningkat dengan cepat.',
     'Penilaian kritikal sangat penting. Perhatikan pengulangan tidak semula jadi, bahasa terlalu formal, atau imej dengan ralat halus seperti tangan herot dan latar belakang tidak konsisten. Banyak alat AI kini meletakkan tera air atau metadata, dan platform pengesanan AI semakin baik. Untuk topik penting, utamakan organisasi berita mapan dan sumber utama berbanding hantaran media sosial yang tular, walaupun nampak sangat kemas.'
   ),
   'Malaysian Communications and Multimedia Commission (MCMC)'),
  ((SELECT id FROM resource_articles WHERE slug = 'ai-generated-content'),
   'zh-CN',
   'AI 生成内容',
   '了解机器能创造什么，以及为什么这很重要。',
   JSON_ARRAY(
     '人工智能现在可以生成文字、图像、音频和视频，几乎难以与人类创作的内容区分。大型语言模型（LLM）等工具可以大规模写出可信的文章、产品评论和社交媒体帖文。AI 图像生成器也能制作从未发生过事件的逼真照片。这些能力在设计、无障碍和教育方面有许多正当用途，但也带来严重风险。',
     '当 AI 生成内容在不说明的情况下用于欺骗时，就会变得危险。假评论会操纵购买决定。AI 撰写的宣传内容会淹没信息环境。合成媒体可用于诈骗，例如犯罪分子在音频或视频通话中冒充高管或家人。随着这些工具越来越便宜、容易使用，网上合成内容的数量正在快速增加。',
     '批判性判断非常重要。留意不自然的重复、过于正式的语言，或图像中细微错误，例如手部扭曲、背景不一致。许多 AI 工具现在会加入水印或元数据，AI 检测平台也在进步。面对重要主题时，请优先参考成熟新闻机构和第一手来源，而不是只看包装精美的热门社交媒体帖文。'
   ),
   'Malaysian Communications and Multimedia Commission (MCMC)'),
  ((SELECT id FROM resource_articles WHERE slug = 'deepfakes'),
   'ms',
   'Deepfake',
   'Media dimanipulasi AI dan cara mengenal pastinya.',
   JSON_ARRAY(
     'Deepfake ialah media sintetik — lazimnya video atau rakaman audio — apabila wajah, suara, atau kata-kata seseorang diganti atau dimanipulasi secara digital menggunakan kecerdasan buatan. Teknologi ini maju dengan sangat cepat sehingga deepfake berkualiti tinggi kini boleh dicipta oleh sesiapa yang mempunyai komputer biasa dan perisian percuma. Walaupun ada kegunaan kreatif yang sah dalam filem dan hiburan, deepfake semakin banyak digunakan untuk memudaratkan.',
     'Ancaman deepfake serius dan pelbagai. Ahli politik dan tokoh awam pernah disasarkan dengan video palsu yang memutarbelitkan kenyataan mereka. Deepfake pornografi balas dendam, iaitu imej intim sintetik tanpa persetujuan, menyebabkan kemudaratan psikologi yang besar, khususnya kepada wanita. Scam kompromi e-mel perniagaan kini menggunakan audio deepfake untuk menyamar sebagai CEO dan meluluskan pindahan wang palsu. Di Malaysia, video scam deepfake yang menyamar sebagai selebriti dan tokoh awam untuk mempromosikan pelaburan palsu semakin serius.',
     'Mengesan deepfake memerlukan pemerhatian teliti: cari pola kelipan mata tidak semula jadi, pencahayaan muka yang tidak konsisten, tepi rambut yang kabur atau berubah bentuk, dan audio yang tidak sepadan dengan pergerakan bibir. Carian imej songsang dan alat seperti Microsoft''s Video Authenticator boleh membantu mengesahkan keaslian media. Jika anda menerima permintaan tidak dijangka melalui video atau audio, terutama melibatkan wang, sahkan melalui saluran berasingan sebelum bertindak.'
   ),
   'INTERPOL — Deepfakes Resource'),
  ((SELECT id FROM resource_articles WHERE slug = 'deepfakes'),
   'zh-CN',
   '深度伪造',
   '了解 AI 操纵媒体，以及如何识别它。',
   JSON_ARRAY(
     '深度伪造是一种合成媒体，最常见的是视频或音频，其中某个人的外貌、声音或话语被人工智能数字替换或操纵。这项技术发展极快，现在任何拥有普通电脑和免费软件的人都可能制作高质量 deepfake。虽然它在电影和娱乐中有正当创作用途，但也越来越常被用来造成伤害。',
     '深度伪造带来的威胁严重且多样。政治人物和公众人物曾被伪造视频针对，内容歪曲他们的言论。复仇色情 deepfake，也就是未经同意的合成亲密图像，会造成严重心理伤害，尤其影响女性。商业电邮入侵诈骗现在也使用 deepfake 音频冒充 CEO，批准欺诈转账。在马来西亚，冒充名人和公众人物推广假投资计划的 deepfake 诈骗视频已经成为严重问题。',
     '识别 deepfake 需要仔细观察：留意不自然的眨眼、脸部光线不一致、发际线边缘模糊或变形，以及声音与口型不太匹配。反向图片搜索和 Microsoft''s Video Authenticator 等工具可帮助验证媒体真实性。如果你通过视频或音频收到意外请求，尤其涉及金钱，请先通过独立渠道核实。'
   ),
   'INTERPOL — Deepfakes Resource')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  summary = VALUES(summary),
  content_json = VALUES(content_json),
  source_label = VALUES(source_label);
-- migrate:statement-end

-- migrate:statement-start
INSERT INTO resource_article_translations
  (resource_id, locale, title, summary, content_json, source_label)
VALUES
  ((SELECT id FROM resource_articles WHERE slug = 'privacy-personal-data'),
   'ms',
   'Privasi & Data Peribadi',
   'Kawal siapa yang mengetahui apa tentang anda dalam talian.',
   JSON_ARRAY(
     'Setiap kali anda menggunakan aplikasi, melayari laman web, atau membuat pembelian dalam talian, anda menghasilkan data. Data ini — lokasi, tabiat pelayaran, sejarah pembelian, maklumat kesihatan, dan banyak lagi — dikumpul, dianalisis, dan sering dijual oleh syarikat kepada pengiklan serta broker data. Akta Perlindungan Data Peribadi (PDPA) 2010 Malaysia menyediakan perlindungan undang-undang tertentu, tetapi individu juga perlu mengambil langkah proaktif untuk menjaga privasi sendiri.',
     'Kebocoran data ialah risiko berterusan. Apabila syarikat yang menyimpan maklumat anda digodam, butiran peribadi boleh berakhir di dark web, dijual kepada penipu, atau digunakan untuk kecurian identiti. Kebocoran besar yang melibatkan jutaan rakyat Malaysia pernah dilaporkan dalam syarikat telekomunikasi, institusi kewangan, dan pangkalan data kerajaan. Setelah data anda tersebar, sangat sukar untuk mengawalnya semula.',
     'Kurangkan jejak digital dengan hanya memberikan maklumat yang diperlukan kepada perkhidmatan dalam talian. Baca dasar privasi dan laraskan kebenaran aplikasi — adakah aplikasi lampu suluh benar-benar perlukan akses kenalan? Gunakan kata laluan kuat yang berbeza untuk setiap perkhidmatan, aktifkan pengesahan dua faktor, dan semak secara berkala sama ada e-mel anda muncul dalam kebocoran data yang diketahui di HaveIBeenPwned.com.'
   ),
   'Department of Personal Data Protection Malaysia (JPDP)'),
  ((SELECT id FROM resource_articles WHERE slug = 'privacy-personal-data'),
   'zh-CN',
   '隐私与个人数据',
   '掌控网上有谁知道你的哪些信息。',
   JSON_ARRAY(
     '每当你使用应用、浏览网站或网上购物时，都会产生数据。这些数据包括你的位置、浏览习惯、购买记录、健康信息等，会被公司收集、分析，且常被卖给广告商和数据经纪商。马来西亚的《2010 年个人数据保护法》（PDPA）提供一定法律保障，但个人也必须主动保护自己的隐私。',
     '数据泄露是持续存在的风险。当持有你资料的公司被入侵时，你的个人信息可能流入暗网，被卖给诈骗者，或用于身份盗窃。马来西亚曾发生影响数百万人的大型泄露事件，涉及电信公司、金融机构和政府数据库。一旦数据外泄，就很难完全控制。',
     '减少数字足迹的方法，是只向网上服务提供必要信息。阅读隐私政策并调整应用权限，例如手电筒应用真的需要访问联系人吗？为每项服务使用不同的强密码，开启双因素认证，并定期在 HaveIBeenPwned.com 检查你的电邮是否出现在已知数据泄露中。'
   ),
   'Department of Personal Data Protection Malaysia (JPDP)'),
  ((SELECT id FROM resource_articles WHERE slug = 'cyberbullying'),
   'ms',
   'Buli Siber',
   'Kenali, tangani, dan cegah gangguan dalam talian.',
   JSON_ARRAY(
     'Buli siber ialah penggunaan teknologi digital — media sosial, aplikasi mesej, platform permainan, atau e-mel — untuk berulang kali mengganggu, mengancam, memalukan, atau menyasarkan seseorang. Tidak seperti buli biasa, ia boleh berlaku 24 jam sehari, mencapai audiens besar dengan cepat, dan mengikuti mangsa ke mana-mana. Tangkapan skrin dan perkongsian tular menjadikan kandungan menyakitkan hampir mustahil dipadam sepenuhnya. Golongan muda lebih kerap terjejas, tetapi orang dewasa juga mengalaminya, termasuk gangguan tempat kerja dan serangan berkumpulan dalam talian.',
     'Kesan psikologi buli siber sangat serius dan terbukti: mangsa sering mengalami keresahan, kemurungan, harga diri rendah, dan dalam kes berat, fikiran untuk membunuh diri. Di Malaysia, buli siber ditangani di bawah Seksyen 233 Akta Komunikasi dan Multimedia 1998, yang menjadikan penghantaran kandungan lucah, mengancam, atau menyinggung dalam talian sebagai kesalahan. Hukuman boleh termasuk denda dan penjara.',
     'Jika anda atau seseorang yang anda kenali dibuli siber: jangan balas pembuli, dokumentasikan semuanya dengan tangkapan skrin, sekat dan laporkan pengguna di platform, dan yang paling penting, beritahu orang dewasa dipercayai, kaunselor sekolah, atau hubungi Talian Kasih di 15999 untuk sokongan. Pemerhati juga berperanan besar: tidak berkongsi atau melayan kandungan buli dan menawarkan sokongan kepada mangsa boleh mengurangkan mudarat.'
   ),
   'UNICEF Malaysia — Cyberbullying Resources'),
  ((SELECT id FROM resource_articles WHERE slug = 'cyberbullying'),
   'zh-CN',
   '网络霸凌',
   '认识、回应并预防网上骚扰。',
   JSON_ARRAY(
     '网络霸凌是使用数字技术，例如社交媒体、通讯应用、游戏平台或电邮，反复骚扰、威胁、羞辱或针对他人。不同于传统霸凌，它可以一天 24 小时发生，迅速触达大量受众，并跟随受害者到任何地方。截图和病毒式分享意味着伤害性内容几乎不可能完全移除。年轻人受影响尤其明显，但成年人也会遭遇网络霸凌，尤其是职场骚扰和有组织的网上围攻。',
     '网络霸凌的心理影响严重且有充分记录：受害者常经历焦虑、抑郁、自尊降低，严重时甚至出现自杀念头。在马来西亚，网络霸凌可依据《1998 年通讯与多媒体法令》第 233 条处理，该条禁止在线传送冒犯性或威胁性内容。处罚可能包括罚款和监禁。',
     '如果你或认识的人正遭受网络霸凌：不要回应霸凌者，用截图记录一切，在平台上屏蔽并举报该用户，并且务必告诉可信成年人、学校辅导员，或拨打 Talian Kasih 15999 寻求支持。旁观者也有力量：拒绝分享或参与霸凌内容，并支持受害者，可以显著减少伤害。'
   ),
   'UNICEF Malaysia — Cyberbullying Resources'),
  ((SELECT id FROM resource_articles WHERE slug = 'password-security'),
   'ms',
   'Keselamatan Kata Laluan',
   'Mengapa panjang lebih penting daripada rumit — dan cara mengingatinya.',
   JSON_ARRAY(
     'Kata laluan lemah masih menjadi cara paling biasa akaun diceroboh. Penyerang menggunakan alat automatik yang boleh mencuba berbilion gabungan kata laluan setiap saat, bermakna kata laluan pendek — walaupun ada nombor dan simbol — boleh dipecahkan dalam beberapa minit. Kata laluan paling berkesan ialah frasa laluan panjang: gabungan empat atau lebih perkataan rawak jauh lebih sukar dipecahkan berbanding kata laluan pendek yang rumit, dan lebih mudah diingati manusia.',
     'Menggunakan semula kata laluan juga sangat berbahaya. Apabila satu laman web mengalami kebocoran data, penyerang mengambil gabungan nama pengguna dan kata laluan yang dicuri lalu mencubanya secara automatik pada ratusan laman lain, teknik yang dipanggil credential stuffing. Jika anda menggunakan kata laluan sama di semua tempat, kebocoran di forum kecil boleh menyebabkan akaun bank anda terjejas. Setiap akaun perlu mempunyai kata laluan unik.',
     'Pengurus kata laluan — seperti Bitwarden yang percuma dan sumber terbuka, 1Password, atau pengurus kata laluan dalam pelayar — menyelesaikan kedua-dua masalah. Ia menjana dan menyimpan kata laluan panjang, rawak, dan unik untuk setiap laman, jadi anda hanya perlu mengingati satu kata laluan induk. Gabungkan dengan pengesahan dua faktor (2FA) pada akaun penting: walaupun kata laluan dicuri, penyerang tidak boleh log masuk tanpa telefon atau aplikasi pengesah anda.'
   ),
   'CISA — Use Strong Passwords'),
  ((SELECT id FROM resource_articles WHERE slug = 'password-security'),
   'zh-CN',
   '密码安全',
   '为什么长度比复杂度更重要，以及如何记住它们。',
   JSON_ARRAY(
     '弱密码仍然是账号被入侵最常见的原因。攻击者使用自动化工具，每秒可尝试数十亿种密码组合，这意味着短密码即使包含数字和符号，也可能在几分钟内被破解。最有效的密码是长密码短语：四个或更多随机词组成的字符串，比短而复杂的密码更难破解，也更容易让人记住。',
     '重复使用密码同样危险。当一个网站发生数据泄露时，攻击者会拿被偷的用户名和密码组合，自动在数百个其他网站尝试登录，这称为凭证填充。如果你到处使用同一个密码，一个不起眼论坛的泄露也可能导致银行账号受影响。你拥有的每个账号都应使用独特密码。',
     '密码管理器，例如免费开源的 Bitwarden、1Password，或浏览器内置的密码管理器，可以解决这两个问题。它会为每个网站生成并保存长、随机、独特的密码，所以你只需要记住一个主密码。重要账号还应搭配双因素认证（2FA）：即使密码被偷，攻击者没有你的手机或认证器应用也无法登录。'
   ),
   'CISA — Use Strong Passwords'),
  ((SELECT id FROM resource_articles WHERE slug = 'digital-citizenship'),
   'ms',
   'Kewargaan Digital',
   'Jadilah bertanggungjawab, hormat, dan sedar hak dalam talian.',
   JSON_ARRAY(
     'Kewargaan digital merujuk kepada penggunaan teknologi dan internet secara bertanggungjawab serta beretika. Sama seperti kewargaan fizikal mempunyai hak dan tanggungjawab, aktif dalam talian bermaksud menyertai ruang bersama yang dibentuk oleh tingkah laku kita semua. Warga digital yang baik berfikir secara kritikal tentang kandungan yang mereka guna dan kongsi, menghormati privasi serta maruah orang lain, dan menyumbang secara membina kepada komuniti dalam talian.',
     'Dunia digital membawa tanggungjawab undang-undang sebenar. Berkongsi kandungan berhak cipta orang lain, membuat kenyataan fitnah, mengedarkan imej intim tanpa persetujuan, dan menghasut kebencian dalam talian semuanya menyalahi undang-undang di Malaysia di bawah pelbagai undang-undang termasuk Akta Komunikasi dan Multimedia, Akta Fitnah, dan Kanun Keseksaan. Anonimiti internet semakin tidak mutlak — pihak berkuasa kerap mengenal pasti dan mendakwa individu atas kesalahan dalam talian.',
     'Amalan kewargaan digital yang baik bermula dengan tabiat kecil: berhenti seketika sebelum memuat naik untuk memikirkan kesan kata-kata anda terhadap orang lain; sahkan maklumat sebelum berkongsi; lindungi maklumat peribadi anda dan hormati maklumat orang lain; bersuara apabila melihat penderaan dalam talian. Pendidikan literasi digital semakin berkembang di sekolah Malaysia, tetapi semua orang, tanpa mengira umur, mendapat manfaat daripada menilai semula cara mereka hadir dalam ruang digital.'
   ),
   'DigitalCitizenship.net'),
  ((SELECT id FROM resource_articles WHERE slug = 'digital-citizenship'),
   'zh-CN',
   '数字公民素养',
   '在网上负责任、尊重他人，并了解自己的权利。',
   JSON_ARRAY(
     '数字公民素养是指负责任且合乎道德地使用科技和互联网。就像现实公民身份包含权利和责任一样，活跃在网上也意味着参与一个由所有人行为共同塑造的共享空间。良好的数字公民会批判性思考自己接收和分享的内容，尊重他人的隐私与尊严，并积极建设网上社区。',
     '数字世界也有真实的法律责任。分享他人的受版权保护内容、发表诽谤言论、未经同意传播亲密图像，以及在网上煽动仇恨，在马来西亚都可能违法，涉及《通讯与多媒体法令》《诽谤法令》和《刑事法典》等法律。互联网匿名性越来越不可靠，执法机关经常识别并起诉网上违法者。',
     '良好的数字公民习惯从小事开始：发布前暂停一下，想想你的话会如何影响他人；分享前核实信息；保护自己的个人资料，也尊重他人的资料；看到网上伤害时勇于发声。马来西亚学校正在加强数字素养教育，但无论年龄，每个人都能通过定期反思自己如何出现在数字空间中而受益。'
   ),
   'DigitalCitizenship.net')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  summary = VALUES(summary),
  content_json = VALUES(content_json),
  source_label = VALUES(source_label);
-- migrate:statement-end
