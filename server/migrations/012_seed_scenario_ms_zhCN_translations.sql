CREATE TEMPORARY TABLE tmp_scenario_definition_translations (
  slug VARCHAR(120) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary VARCHAR(500) NOT NULL
);

-- migrate:statement-start
INSERT INTO tmp_scenario_definition_translations (slug, locale, title, summary)
VALUES
  ('suspicious-parcel-delivery-sms','ms','SMS penghantaran bungkusan yang mencurigakan','Anda menerima SMS bungkusan yang mendesak anda membayar sedikit bayaran penghantaran sebelum pakej dilepaskan.'),
  ('suspicious-parcel-delivery-sms','zh-CN','可疑的包裹派送短信','你收到一条包裹短信，催你先支付一小笔派送费，包裹才会放行。'),
  ('fake-ewallet-urgent-message','ms','Mesej mendesak palsu bank atau e-dompet','Satu mesej mendakwa e-dompet anda akan dibekukan kecuali anda mengesahkan akaun dengan segera.'),
  ('fake-ewallet-urgent-message','zh-CN','假的银行或电子钱包紧急消息','一条消息声称你的电子钱包将被冻结，除非你立即验证账号。'),
  ('friend-asks-share-otp','ms','Rakan meminta anda berkongsi OTP','Seorang rakan berkata akaunnya terkunci dan meminta anda menghantar kata laluan sekali guna daripada telefon anda.'),
  ('friend-asks-share-otp','zh-CN','朋友要求分享 OTP','朋友说自己被账号锁住，要求你把手机收到的一次性密码发给他。'),
  ('same-password-breach-warning','ms','Kata laluan sama digunakan semula selepas amaran kebocoran','Anda terdengar bahawa salah satu kata laluan yang anda guna semula mungkin muncul dalam amaran kebocoran data.'),
  ('same-password-breach-warning','zh-CN','收到泄露警告后仍重复使用同一密码','你听说自己重复使用的某个密码可能出现在数据泄露警告中。'),
  ('location-school-uniform-post','ms','Hantaran media sosial dengan lokasi dan uniform sekolah','Anda hampir memuat naik foto yang menunjukkan uniform sekolah anda dan tag lokasi.'),
  ('location-school-uniform-post','zh-CN','带有位置和校服的社交媒体帖文','你准备发布一张照片，照片显示了你的校服和位置标签。'),
  ('mobile-app-excessive-permissions','ms','Aplikasi mudah alih meminta kebenaran berlebihan','Aplikasi penyunting yang menyeronokkan meminta akses kenalan, lokasi, kamera, dan mikrofon sebelum ia boleh dibuka.'),
  ('mobile-app-excessive-permissions','zh-CN','手机应用要求过多权限','一个有趣的修图应用在打开前要求访问联系人、位置、相机和麦克风。'),
  ('viral-emergency-group-chat','ms','Dakwaan kecemasan tular dalam sembang kumpulan','Amaran kecemasan yang dramatik tersebar dalam sembang kelas dan meminta semua orang memajukannya segera.'),
  ('viral-emergency-group-chat','zh-CN','群聊中的热门紧急传言','一条夸张的紧急警告在班级群里传播，并要求大家立刻转发。'),
  ('ai-celebrity-investment-video','ms','Video pelaburan selebriti yang dijana AI','Satu video kelihatan menunjukkan orang terkenal mempromosikan skim pelaburan yang dijamin.'),
  ('ai-celebrity-investment-video','zh-CN','AI 生成的名人投资视频','一段视频似乎显示一位名人在推广保证收益的投资计划。');
-- migrate:statement-end

INSERT INTO scenario_definition_translations (scenario_id, locale, title, summary)
SELECT sd.id, t.locale, t.title, t.summary
FROM tmp_scenario_definition_translations t
JOIN scenario_definitions sd ON sd.slug = t.slug AND sd.version = 1
ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary);

DROP TEMPORARY TABLE tmp_scenario_definition_translations;

CREATE TEMPORARY TABLE tmp_scenario_step_translations (
  slug VARCHAR(120) NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  locale VARCHAR(10) NOT NULL,
  situation_text TEXT NOT NULL,
  prompt_text TEXT NOT NULL
);

-- migrate:statement-start
INSERT INTO tmp_scenario_step_translations (slug, step_order, locale, situation_text, prompt_text)
VALUES
  ('suspicious-parcel-delivery-sms',1,'ms','Satu SMS mengatakan bungkusan sedang menunggu dan anda mesti membayar RM2.30 hari ini. Nama pengirim kelihatan seperti syarikat penghantaran, tetapi mesej itu terasa tergesa-gesa.','Apakah yang patut anda lakukan dahulu?'),
  ('suspicious-parcel-delivery-sms',1,'zh-CN','一条短信说有包裹在等你，今天必须支付 RM2.30。发件人名称看起来像快递公司，但消息让人感觉很催促。','你首先应该怎么做？'),
  ('suspicious-parcel-delivery-sms',2,'ms','Halaman SMS itu meminta nama penuh, nombor kad, dan OTP perbankan anda untuk melepaskan bungkusan.','Apakah respons yang paling selamat?'),
  ('suspicious-parcel-delivery-sms',2,'zh-CN','短信打开的页面要求你填写全名、银行卡号和银行 OTP，才能放行包裹。','最安全的回应是什么？'),
  ('suspicious-parcel-delivery-sms',3,'ms','Anda kini berfikir SMS itu ialah penipuan. Anda mahu mengurangkan mudarat kepada diri sendiri dan orang lain.','Apakah yang patut anda lakukan seterusnya?'),
  ('suspicious-parcel-delivery-sms',3,'zh-CN','你现在觉得这条短信是诈骗。你想减少自己和他人受到的伤害。','你接下来应该怎么做？'),
  ('fake-ewallet-urgent-message',1,'ms','Satu mesej mengatakan e-dompet anda akan dibekukan dalam 30 minit kecuali anda mengesahkan akaun melalui halaman yang diberi.','Apakah langkah pertama yang terbaik?'),
  ('fake-ewallet-urgent-message',1,'zh-CN','一条消息说你的电子钱包将在 30 分钟内被冻结，除非你通过提供的页面验证账号。','最佳的第一步是什么？'),
  ('fake-ewallet-urgent-message',2,'ms','Mesej itu meminta anda memuat naik foto ID dan memasukkan PIN dompet anda.','Apakah yang patut anda lakukan?'),
  ('fake-ewallet-urgent-message',2,'zh-CN','这条消息要求你上传身份证照片并输入钱包 PIN。','你应该怎么做？'),
  ('fake-ewallet-urgent-message',3,'ms','Anda tidak memasukkan butiran itu. Pengirim menghantar satu lagi amaran dengan tekanan yang lebih kuat.','Apakah tindakan akhir yang paling selamat?'),
  ('fake-ewallet-urgent-message',3,'zh-CN','你没有输入资料。发送者又发来更强烈的警告。','最安全的最后行动是什么？'),
  ('friend-asks-share-otp',1,'ms','Seorang rakan menghantar mesej bahawa dia terkunci daripada akaun. Beberapa saat kemudian, kata laluan sekali guna muncul pada telefon anda.','Apakah yang patut anda lakukan dengan OTP itu?'),
  ('friend-asks-share-otp',1,'zh-CN','朋友发消息说自己无法登录账号。几秒后，你的手机收到一个一次性密码。','你应该如何处理这个 OTP？'),
  ('friend-asks-share-otp',2,'ms','Rakan itu menjadi tidak sabar dan berkata dia memerlukan kod itu untuk projek kumpulan sekolah.','Apakah balasan yang paling selamat?'),
  ('friend-asks-share-otp',2,'zh-CN','朋友开始不耐烦，说他需要这个验证码来做学校小组项目。','最安全的回复是什么？'),
  ('friend-asks-share-otp',3,'ms','Anda menelefon rakan anda dan dia berkata dia tidak menghantar permintaan itu. Akaunnya mungkin telah diceroboh.','Apakah yang patut anda lakukan?'),
  ('friend-asks-share-otp',3,'zh-CN','你打电话给朋友，他说自己没有发出这个请求。他的账号可能已被入侵。','你应该怎么做？'),
  ('same-password-breach-warning',1,'ms','Anda terdengar amaran kebocoran untuk forum permainan. Anda menggunakan kata laluan yang sama di situ dan pada akaun lain.','Apakah yang patut anda lakukan dahulu?'),
  ('same-password-breach-warning',1,'zh-CN','你听说一个游戏论坛出现泄露警告。你在那里和其他账号使用了同一个密码。','你首先应该怎么做？'),
  ('same-password-breach-warning',2,'ms','Anda perlu membuat beberapa kata laluan baharu dan bimbang anda akan terlupa.','Pendekatan manakah yang paling selamat?'),
  ('same-password-breach-warning',2,'zh-CN','你需要设置几个新密码，又担心自己会忘记。','哪种做法最安全？'),
  ('same-password-breach-warning',3,'ms','Selepas menukar kata laluan, akaun itu menawarkan perlindungan log masuk tambahan.','Apakah yang patut anda pilih?'),
  ('same-password-breach-warning',3,'zh-CN','更改密码后，账号提供额外的登录保护。','你应该选择什么？'),
  ('location-school-uniform-post',1,'ms','Anda mahu memuat naik foto yang menyeronokkan selepas sekolah. Foto itu jelas menunjukkan uniform sekolah anda dan tag lokasi sedang aktif.','Apakah yang patut anda lakukan sebelum memuat naik?'),
  ('location-school-uniform-post',1,'zh-CN','放学后你想发布一张有趣的照片。照片清楚显示你的校服，而且位置标签已开启。','发布前你应该做什么？'),
  ('location-school-uniform-post',2,'ms','Seseorang yang anda tidak kenali mengulas dan bertanya kelas anda serta waktu anda biasanya pulang dari sekolah.','Bagaimanakah anda patut membalas?'),
  ('location-school-uniform-post',2,'zh-CN','一个你不认识的人留言，问你在哪个班，以及通常什么时候离开学校。','你应该如何回应？'),
  ('location-school-uniform-post',3,'ms','Rakan anda juga kelihatan dalam foto dan bertanya sama ada anda masih boleh memuat naiknya.','Apakah pilihan terbaik?'),
  ('location-school-uniform-post',3,'zh-CN','你的朋友也出现在照片里，并问你是否仍然可以发布。','最佳选择是什么？'),
  ('mobile-app-excessive-permissions',1,'ms','Aplikasi penyunting foto yang popular meminta akses kepada kenalan, lokasi, kamera, dan mikrofon sebelum anda boleh menggunakan penapis ringkas.','Apakah yang patut anda lakukan dahulu?'),
  ('mobile-app-excessive-permissions',1,'zh-CN','一个热门修图应用在你使用简单滤镜前，要求访问联系人、位置、相机和麦克风。','你首先应该怎么做？'),
  ('mobile-app-excessive-permissions',2,'ms','Halaman gedung aplikasi mempunyai sedikit ulasan dan beberapa komen mengatakan aplikasi itu menghantar terlalu banyak pemberitahuan.','Apakah langkah seterusnya yang paling selamat?'),
  ('mobile-app-excessive-permissions',2,'zh-CN','应用商店页面评论很少，而且有几条评论说这个应用发送太多通知。','最安全的下一步是什么？'),
  ('mobile-app-excessive-permissions',3,'ms','Anda sudah memasang aplikasi itu sebelum ini dan kini mahu mengurangkan aksesnya.','Apakah yang patut anda lakukan?'),
  ('mobile-app-excessive-permissions',3,'zh-CN','你之前已经安装了这个应用，现在想减少它的访问权限。','你应该怎么做？'),
  ('viral-emergency-group-chat',1,'ms','Sembang kumpulan kelas menerima amaran dramatik tentang kecemasan berhampiran beberapa sekolah. Mesej itu meminta semua orang memajukannya sekarang.','Apakah yang patut anda lakukan dahulu?'),
  ('viral-emergency-group-chat',1,'zh-CN','班级群收到一条关于几所学校附近发生紧急情况的夸张警告。消息要求大家现在就转发给所有人。','你首先应该怎么做？'),
  ('viral-emergency-group-chat',2,'ms','Anda tidak dapat menemui dakwaan itu di saluran rasmi, tetapi beberapa rakan mula takut.','Apakah respons yang membantu?'),
  ('viral-emergency-group-chat',2,'zh-CN','你在官方渠道找不到这个说法，但有些朋友开始害怕。','怎样回应比较有帮助？'),
  ('viral-emergency-group-chat',3,'ms','Kemudian, sekolah menyiarkan kemas kini rasmi yang mengatakan tiada kecemasan yang disahkan.','Apakah yang patut anda lakukan dalam sembang?'),
  ('viral-emergency-group-chat',3,'zh-CN','之后，学校发布官方更新，说明没有确认的紧急情况。','你应该在群聊里怎么做？'),
  ('ai-celebrity-investment-video',1,'ms','Satu video dalam suapan anda kelihatan menunjukkan orang terkenal mempromosikan pelaburan yang dijamin. Kapsyen mengatakan tempat adalah terhad.','Apakah respons pertama anda?'),
  ('ai-celebrity-investment-video',1,'zh-CN','你动态里的一段视频似乎显示一位名人在推广保证收益的投资。说明文字说名额有限。','你的第一反应是什么？'),
  ('ai-celebrity-investment-video',2,'ms','Video itu mempunyai pergerakan mulut yang pelik dan audio kedengaran sedikit seperti robot. Satu halaman meminta deposit untuk bermula.','Apakah yang patut anda lakukan?'),
  ('ai-celebrity-investment-video',2,'zh-CN','视频中的嘴部动作很奇怪，声音也有点机械。一个页面要求你先付押金才能开始。','你应该怎么做？'),
  ('ai-celebrity-investment-video',3,'ms','Anda mahu memberi amaran kepada rakan sekelas kerana ada yang sedang berkongsi video itu.','Apakah cara paling selamat?'),
  ('ai-celebrity-investment-video',3,'zh-CN','你想提醒同学，因为有些人正在分享这段视频。','最安全的方法是什么？');
-- migrate:statement-end

INSERT INTO scenario_step_translations (step_id, locale, situation_text, prompt_text)
SELECT ss.id, t.locale, t.situation_text, t.prompt_text
FROM tmp_scenario_step_translations t
JOIN scenario_definitions sd ON sd.slug = t.slug AND sd.version = 1
JOIN scenario_steps ss ON ss.scenario_id = sd.id AND ss.step_order = t.step_order
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text);

DROP TEMPORARY TABLE tmp_scenario_step_translations;

CREATE TEMPORARY TABLE tmp_scenario_option_translations (
  slug VARCHAR(120) NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  option_key VARCHAR(10) NOT NULL,
  locale VARCHAR(10) NOT NULL,
  text TEXT NOT NULL,
  feedback TEXT NOT NULL,
  safety_explanation TEXT NOT NULL
);

-- migrate:statement-start
INSERT INTO tmp_scenario_option_translations (slug, step_order, option_key, locale, text, feedback, safety_explanation)
VALUES
  ('suspicious-parcel-delivery-sms',1,'A','ms','Tekan pautan dan masukkan butiran yang diminta dengan cepat.','Berisiko kerana mesej scam sering guna bayaran kecil dan desakan untuk mengumpul butiran kad atau log masuk.','Buka kemas kini penghantaran melalui aplikasi atau laman web rasmi kurier, bukan pautan SMS yang tidak dijangka.'),
  ('suspicious-parcel-delivery-sms',1,'B','ms','Abaikan pautan dan semak status bungkusan melalui aplikasi atau laman web rasmi kurier.','Pilihan baik. Anda berpindah ke saluran dipercayai sebelum berkongsi apa-apa.','Aplikasi dan laman web rasmi mengurangkan risiko masuk ke halaman bayaran palsu.'),
  ('suspicious-parcel-delivery-sms',1,'C','ms','Majukan SMS kepada keluarga dan tanya jika ada sesiapa memesan sesuatu.','Bertanya boleh membantu, tetapi memajukan pautan mencurigakan boleh menyebarkan risiko.','Jika bertanya, buang pautan atau terangkan mesej itu sahaja.'),
  ('suspicious-parcel-delivery-sms',1,'A','zh-CN','点击链接并快速输入要求的资料。','这很冒险，因为诈骗短信常用小额费用和紧迫感来套取银行卡或登录资料。','请从官方快递应用或官方网站查看配送更新，不要使用意外短信中的链接。'),
  ('suspicious-parcel-delivery-sms',1,'B','zh-CN','忽略链接，并通过官方快递应用或网站查看包裹状态。','不错的选择。你先转到可信渠道，再决定是否分享任何资料。','官方应用和网站能降低进入假付款页面的风险。'),
  ('suspicious-parcel-delivery-sms',1,'C','zh-CN','把短信转发给家人，问是否有人订了东西。','询问可能有帮助，但转发可疑链接也会扩散风险。','如果要询问，请移除链接或只描述消息内容。'),
  ('suspicious-parcel-delivery-sms',2,'A','ms','Masukkan OTP kerana jumlahnya kecil.','Tidak selamat. OTP boleh meluluskan akses akaun atau bayaran walaupun caj nampak kecil.','Jangan masukkan OTP perbankan pada halaman yang dibuka daripada mesej tidak dijangka.'),
  ('suspicious-parcel-delivery-sms',2,'B','ms','Tutup halaman itu dan jangan masukkan sebarang butiran.','Betul. Menutup halaman sebelum memasukkan butiran melindungi akaun anda.','Permintaan OTP perbankan pada halaman bayaran penghantaran ialah tanda amaran besar.'),
  ('suspicious-parcel-delivery-sms',2,'C','ms','Taip nama sahaja tetapi berhenti sebelum butiran kad.','Lebih baik daripada memasukkan kad, tetapi maklumat peribadi masih boleh membantu scammer menyasarkan anda.','Jika halaman terasa mencurigakan, elakkan memasukkan sebarang maklumat peribadi.'),
  ('suspicious-parcel-delivery-sms',2,'A','zh-CN','因为金额很小，所以输入 OTP。','不安全。即使费用看起来很小，OTP 也可能批准账号访问或付款。','不要在意外消息打开的页面输入银行 OTP。'),
  ('suspicious-parcel-delivery-sms',2,'B','zh-CN','关闭页面，不输入任何资料。','正确。在输入资料前关闭页面，可以保护你的账号。','派送费页面要求银行 OTP 是重大警讯。'),
  ('suspicious-parcel-delivery-sms',2,'C','zh-CN','只输入姓名，但在银行卡资料前停下。','这比输入银行卡好，但个人资料仍可能帮助诈骗者针对你。','当页面可疑时，避免输入任何个人信息。'),
  ('suspicious-parcel-delivery-sms',3,'A','ms','Padam sahaja dan teruskan.','Memadam melindungi anda, tetapi melapor boleh membantu mengurangkan mudarat kepada orang lain.','Menyekat dan melaporkan mesej mencurigakan membantu platform dan penyedia mengesan penyalahgunaan.'),
  ('suspicious-parcel-delivery-sms',3,'B','ms','Lapor atau sekat pengirim dan beri amaran kepada keluarga tanpa berkongsi pautan.','Respons kuat. Anda melindungi diri dan memberi amaran dengan selamat.','Kongsi amaran tanpa pautan berisiko, dan gunakan alat lapor atau sekat rasmi.'),
  ('suspicious-parcel-delivery-sms',3,'C','ms','Muat naik tangkapan skrin yang menunjukkan pautan penuh supaya semua orang nampak.','Itu boleh menyebarkan pautan scam dengan lebih jauh.','Jika berkongsi tangkapan skrin, sembunyikan pautan, nombor telefon, dan butiran peribadi.'),
  ('suspicious-parcel-delivery-sms',3,'A','zh-CN','默默删除，然后继续做别的。','删除能保护你，但举报可以帮助减少他人受害。','屏蔽和举报可疑消息有助平台和服务商发现滥用行为。'),
  ('suspicious-parcel-delivery-sms',3,'B','zh-CN','举报或屏蔽发送者，并在不分享链接的情况下提醒家人。','很强的回应。你保护了自己，也安全地提醒了别人。','提醒他人时不要带上危险链接，并使用官方举报或屏蔽工具。'),
  ('suspicious-parcel-delivery-sms',3,'C','zh-CN','发布显示完整链接的截图，让大家都看见。','这可能让诈骗链接传播得更远。','如果分享截图，请遮住链接、电话号码和个人资料。'),
  ('fake-ewallet-urgent-message',1,'A','ms','Gunakan pautan kerana pembekuan akaun serius.','Desakan ialah taktik scam biasa. Pautan itu mungkin palsu walaupun mesej nampak rasmi.','Buka aplikasi bank atau e-dompet secara langsung, bukan pautan dalam mesej mendesak.'),
  ('fake-ewallet-urgent-message',1,'B','ms','Buka sendiri aplikasi rasmi dan semak pemberitahuan di situ.','Bagus. Anda mengesahkan melalui laluan yang dipercayai.','Aplikasi rasmi ialah tempat lebih selamat untuk menyemak amaran akaun dan sokongan.'),
  ('fake-ewallet-urgent-message',1,'C','ms','Balas kepada pengirim dan tanya sama ada mesej itu benar.','Nampak berhati-hati, tetapi membalas mengesahkan nombor anda aktif.','Elakkan membalas pengirim mencurigakan. Gunakan saluran sokongan rasmi.'),
  ('fake-ewallet-urgent-message',1,'A','zh-CN','使用链接，因为账号冻结很严重。','紧迫感是常见诈骗手法。即使消息看起来正式，链接也可能是假的。','请直接打开银行或电子钱包应用，不要使用紧急消息里的链接。'),
  ('fake-ewallet-urgent-message',1,'B','zh-CN','自己打开官方应用，并在那里查看通知。','很好。你通过可信路径完成核实。','官方应用是查看账号提醒和客服消息更安全的地方。'),
  ('fake-ewallet-urgent-message',1,'C','zh-CN','回复发送者，询问消息是否真实。','这看似谨慎，但回复会确认你的号码是活跃的。','避免回复可疑发送者。请使用官方客服渠道。'),
  ('fake-ewallet-urgent-message',2,'A','ms','Masukkan PIN sahaja, tetapi langkau foto ID.','PIN sahaja pun boleh mencukupi untuk memudaratkan akaun anda.','Jangan masukkan PIN dompet pada halaman yang dibuka daripada mesej.'),
  ('fake-ewallet-urgent-message',2,'B','ms','Berhenti dan hubungi sokongan rasmi dari dalam aplikasi.','Betul. Anda berpindah ke sokongan rasmi dan mengelak berkongsi data sensitif.','Sokongan rasmi boleh mengesahkan sama ada tindakan diperlukan tanpa mendedahkan kelayakan.'),
  ('fake-ewallet-urgent-message',2,'C','ms','Tanya rakan sama ada reka bentuk halaman itu nampak benar.','Pandangan kedua boleh membantu, tetapi halaman palsu boleh kelihatan meyakinkan.','Pengesahan patut bergantung pada saluran rasmi, bukan rupa halaman semata-mata.'),
  ('fake-ewallet-urgent-message',2,'A','zh-CN','只输入 PIN，但不上传身份证照片。','单凭 PIN 也足以伤害你的账号。','不要在消息打开的页面输入钱包 PIN。'),
  ('fake-ewallet-urgent-message',2,'B','zh-CN','停止操作，并从应用内联系官方客服。','正确。你转向官方客服，也避免分享敏感资料。','官方客服可以确认是否需要采取行动，而不暴露凭证。'),
  ('fake-ewallet-urgent-message',2,'C','zh-CN','问朋友这个页面设计看起来像不像真的。','第二意见有帮助，但假页面也可能做得很逼真。','核实应依靠官方渠道，而不是只看页面外观。'),
  ('fake-ewallet-urgent-message',3,'A','ms','Sekat dan lapor pengirim, kemudian terus semak hanya saluran rasmi.','Kuat. Anda mengurangkan tekanan berulang dan kekal mengesahkan secara rasmi.','Scammer sering mengulangi mesej mendesak. Menyekat dan melapor membantu mengehadkan pendedahan.'),
  ('fake-ewallet-urgent-message',3,'B','ms','Hantar satu balasan terakhir bahawa anda tahu ia palsu.','Mungkin terasa memuaskan, tetapi melayan boleh mengundang lebih banyak mesej.','Menyekat biasanya lebih selamat daripada berdebat dengan pengirim mencurigakan.'),
  ('fake-ewallet-urgent-message',3,'C','ms','Majukan secara meluas supaya semua orang boleh bantu semak.','Memajukan boleh menyebarkan scam.','Beri amaran kepada orang lain tanpa memajukan mesej atau pautan berisiko.'),
  ('fake-ewallet-urgent-message',3,'A','zh-CN','屏蔽并举报发送者，然后只继续查看官方渠道。','很强。你减少了反复施压，并保持官方核实。','诈骗者常重复发送紧急消息。屏蔽和举报有助减少接触。'),
  ('fake-ewallet-urgent-message',3,'B','zh-CN','最后回复一次，说你知道这是假的。','这样可能很解气，但互动可能招来更多消息。','屏蔽通常比和可疑发送者争辩更安全。'),
  ('fake-ewallet-urgent-message',3,'C','zh-CN','广泛转发，让大家帮忙检查。','转发可能扩散诈骗。','提醒他人时不要转发危险消息或链接。')
ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation);
-- migrate:statement-end

-- migrate:statement-start
INSERT INTO tmp_scenario_option_translations (slug, step_order, option_key, locale, text, feedback, safety_explanation)
VALUES
  ('friend-asks-share-otp',1,'A','ms','Hantar kerana permintaan itu datang daripada rakan.','Tidak selamat. Akaun rakan mungkin diceroboh, dan OTP hanya untuk pemilik akaun.','Jangan kongsi OTP, walaupun dengan rakan, keluarga, atau orang yang mengaku mahu membantu.'),
  ('friend-asks-share-otp',1,'B','ms','Jangan kongsi, dan tanya rakan melalui saluran dipercayai yang lain.','Betul. Anda melindungi OTP dan menyemak sama ada permintaan itu benar.','Saluran berasingan membantu mengesahkan sama ada mesej benar-benar daripada rakan anda.'),
  ('friend-asks-share-otp',1,'C','ms','Tanya mengapa mereka memerlukannya sebelum membuat keputusan.','Bertanya lebih baik daripada menghantar, tetapi sembang yang sama mungkin dikawal orang lain.','Sahkan permintaan sensitif di luar perbualan yang mencurigakan.'),
  ('friend-asks-share-otp',1,'A','zh-CN','发送给他，因为请求来自朋友。','不安全。朋友的账号可能已被入侵，而且 OTP 只应由账号本人使用。','不要分享 OTP，即使对象是朋友、家人或声称要帮忙的人。'),
  ('friend-asks-share-otp',1,'B','zh-CN','不要分享，并通过另一个可信渠道询问朋友。','正确。你保护了 OTP，也核实了请求是否真实。','使用另一个渠道有助确认消息是否真来自你的朋友。'),
  ('friend-asks-share-otp',1,'C','zh-CN','先问他们为什么需要，再决定。','提出问题比直接发送好，但同一个聊天可能已被别人控制。','敏感请求应在可疑对话之外核实。'),
  ('friend-asks-share-otp',2,'A','ms','Katakan anda tidak boleh berkongsi OTP dan cadangkan pemulihan akaun melalui aplikasi rasmi.','Bagus. Anda menetapkan batas yang jelas dan menunjukkan langkah pemulihan lebih selamat.','Aliran pemulihan rasmi lebih selamat daripada meminjam OTP orang lain.'),
  ('friend-asks-share-otp',2,'B','ms','Hantar kod itu tetapi pesan supaya tidak digunakan untuk perkara lain.','Pesanan itu tidak melindungi akaun selepas OTP dikongsi.','Sesiapa yang mempunyai OTP mungkin boleh melengkapkan log masuk atau tetapan semula.'),
  ('friend-asks-share-otp',2,'C','ms','Abaikan mesej tanpa melakukan apa-apa lagi.','Mengabaikan mengelak perkongsian OTP, tetapi rakan sebenar mungkin masih perlukan bantuan keselamatan.','Semakan ringkas melalui saluran lain boleh membantu jika akaunnya diambil alih.'),
  ('friend-asks-share-otp',2,'A','zh-CN','说你不能分享 OTP，并建议通过官方应用恢复账号。','很好。你设下清楚界限，并指向更安全的恢复步骤。','官方恢复流程比借用他人的 OTP 更安全。'),
  ('friend-asks-share-otp',2,'B','zh-CN','发送验证码，但告诉他们不要用于其他事情。','一旦 OTP 被分享，这个提醒无法保护账号。','任何拿到 OTP 的人都可能完成登录或重置操作。'),
  ('friend-asks-share-otp',2,'C','zh-CN','直接忽略消息，不做其他事。','忽略能避免分享 OTP，但真正的朋友可能仍需要保护账号的帮助。','通过其他渠道快速确认，可以在朋友账号被盗时帮上忙。'),
  ('friend-asks-share-otp',3,'A','ms','Suruh mereka menukar kata laluan dan melaporkan akses mencurigakan.','Kuat. Anda membantu pemulihan tanpa mendedahkan akaun sendiri.','Tetapan semula kata laluan, log keluar sesi lain, dan laporan boleh mengurangkan kerosakan rampasan akaun.'),
  ('friend-asks-share-otp',3,'B','ms','Mesej akaun mencurigakan itu untuk menakutkan penyerang.','Melayan boleh mendedahkan lebih banyak maklumat atau mengundang tekanan.','Fokus pada pemulihan melalui kawalan rasmi, bukan berdebat dalam sembang yang diceroboh.'),
  ('friend-asks-share-otp',3,'C','ms','Beri amaran kepada rakan bersama supaya tidak berkongsi kod.','Membantu, tetapi rakan anda juga perlukan langkah pemulihan akaun.','Gabungkan amaran dengan pemulihan akaun dan laporan.'),
  ('friend-asks-share-otp',3,'A','zh-CN','告诉他们更改密码并举报可疑访问。','很强。你帮助他们恢复账号，同时没有暴露自己的账号。','重置密码、登出其他会话和举报可减少账号被盗的损害。'),
  ('friend-asks-share-otp',3,'B','zh-CN','给可疑账号发消息，吓走攻击者。','互动可能泄露更多信息或带来更多压力。','重点应放在官方恢复控制上，而不是在被盗聊天里争辩。'),
  ('friend-asks-share-otp',3,'C','zh-CN','提醒共同朋友不要分享验证码。','这有帮助，但你的朋友还需要账号恢复步骤。','把提醒与账号恢复和举报结合起来。'),
  ('same-password-breach-warning',1,'A','ms','Tukar kata laluan yang dikongsi pada akaun paling penting dahulu.','Betul. Kata laluan yang digunakan semula boleh membahayakan beberapa akaun.','Mulakan dengan e-mel, perbankan, sekolah, dan sosial kerana ia boleh membuka perkhidmatan lain.'),
  ('same-password-breach-warning',1,'B','ms','Tunggu untuk melihat sama ada sesuatu buruk berlaku.','Menunggu memberi penyerang lebih masa mencuba kata laluan yang sama.','Amaran kebocoran ialah tanda untuk bertindak sebelum kerosakan muncul.'),
  ('same-password-breach-warning',1,'C','ms','Tukar hanya kata laluan forum permainan.','Itu membantu satu laman, tetapi kata laluan yang sama boleh menjejaskan akaun lain juga.','Mana-mana akaun yang menggunakan kata laluan sama perlu diganti dengan yang unik.'),
  ('same-password-breach-warning',1,'A','zh-CN','先更改最重要账号上重复使用的密码。','正确。重复使用的密码可能让多个账号同时有风险。','先处理邮箱、银行、学校和社交账号，因为它们可能打开其他服务。'),
  ('same-password-breach-warning',1,'B','zh-CN','等着看是否会出事。','等待会给攻击者更多时间尝试重复使用的密码。','泄露警告是提醒你在损害出现前行动。'),
  ('same-password-breach-warning',1,'C','zh-CN','只更改游戏论坛的密码。','这能帮助一个网站，但重复密码也会影响其他账号。','任何使用相同密码的账号都应换成独特密码。'),
  ('same-password-breach-warning',2,'A','ms','Gunakan satu kata laluan yang diubah sedikit untuk setiap akaun.','Corak kecil pada kata laluan sering diteka selepas satu kata laluan terdedah.','Penyerang mungkin mencuba variasi biasa merentas perkhidmatan.'),
  ('same-password-breach-warning',2,'B','ms','Gunakan kata laluan unik dan simpan dalam pengurus kata laluan atau kaedah selamat yang diluluskan penjaga.','Bagus. Kata laluan unik mengehadkan kerosakan daripada satu perkhidmatan bocor.','Pengurus kata laluan boleh mencipta dan menyimpan kata laluan unik yang kuat.'),
  ('same-password-breach-warning',2,'C','ms','Tulis kata laluan dalam buku nota yang disimpan dalam beg sekolah.','Menulis boleh lebih baik daripada guna semula, tetapi beg sekolah boleh hilang atau dilihat orang.','Jika kata laluan ditulis, ia mesti disimpan secara peribadi dan selamat.'),
  ('same-password-breach-warning',2,'A','zh-CN','每个账号都用一个稍微改动的密码。','一个密码曝光后，小变化的规律常会被猜到。','攻击者可能会在不同服务尝试常见变体。'),
  ('same-password-breach-warning',2,'B','zh-CN','使用独特密码，并存放在密码管理器或监护人认可的安全方法中。','很好。独特密码能限制某个服务泄露带来的损害。','密码管理器可以创建并保存强而独特的密码。'),
  ('same-password-breach-warning',2,'C','zh-CN','把密码写在放在书包里的笔记本中。','写下来可能比重复使用好，但书包可能遗失或被别人看到。','如果写下密码，必须私密且安全地保存。'),
  ('same-password-breach-warning',3,'A','ms','Hidupkan pengesahan berbilang faktor jika tersedia.','Kuat. Perlindungan log masuk tambahan membantu walaupun kata laluan diteka atau terdedah.','Gunakan arahan aplikasi, aplikasi pengesah, atau kaedah rasmi lain jika tersedia.'),
  ('same-password-breach-warning',3,'B','ms','Langkau kerana kata laluan baharu anda sudah cukup.','Kata laluan kuat membantu, tetapi perlindungan tambahan mengurangkan risiko lagi.','Pengesahan berbilang faktor menambah halangan terhadap rampasan akaun.'),
  ('same-password-breach-warning',3,'C','ms','Kongsi kod sandaran dalam sembang kumpulan supaya mudah dicari kemudian.','Kod sandaran sensitif dan tidak patut dikongsi.','Simpan kod sandaran secara peribadi. Sesiapa yang memilikinya boleh memintas perlindungan log masuk.'),
  ('same-password-breach-warning',3,'A','zh-CN','在可用时开启多因素认证。','很强。即使密码被猜到或曝光，额外登录保护仍能帮忙。','可使用应用提示、认证器应用或其他官方方法。'),
  ('same-password-breach-warning',3,'B','zh-CN','跳过，因为新密码已经足够。','强密码有帮助，但额外保护能进一步降低风险。','多因素认证为防止账号被盗增加另一道障碍。'),
  ('same-password-breach-warning',3,'C','zh-CN','把备用码分享到群聊，方便以后找到。','备用码很敏感，不应分享。','请私密保存备用码。任何拿到的人都可能绕过登录保护。')
ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation);
-- migrate:statement-end

-- migrate:statement-start
INSERT INTO tmp_scenario_option_translations (slug, step_order, option_key, locale, text, feedback, safety_explanation)
VALUES
  ('location-school-uniform-post',1,'A','ms','Muat naik segera kerana hanya rakan mengikuti anda.','Berisiko. Tangkapan skrin dan perkongsian semula boleh membawa hantaran melepasi senarai rakan.','Identiti sekolah dan lokasi langsung boleh mendedahkan rutin dan keberadaan.'),
  ('location-school-uniform-post',1,'B','ms','Buang tag lokasi dan semak sama ada uniform atau nama sekolah kelihatan.','Bagus. Anda mengurangkan maklumat yang boleh mengenal pasti rutin anda.','Butiran kecil dalam foto boleh mendedahkan tempat anda belajar atau meluangkan masa.'),
  ('location-school-uniform-post',1,'C','ms','Kekalkan foto tetapi tambah kapsyen supaya jangan dikongsi.','Kapsyen menetapkan batas, tetapi tidak membuang butiran yang mengenal pasti.','Perlindungan privasi paling berkesan sebelum kandungan dimuat naik.'),
  ('location-school-uniform-post',1,'A','zh-CN','立刻发布，因为只有朋友关注你。','有风险。截图和转发可能让帖文超出朋友列表。','学校标识和实时位置可能暴露你的日常路线和所在位置。'),
  ('location-school-uniform-post',1,'B','zh-CN','移除位置标签，并检查校服或校名是否可见。','很好。你减少了能识别你日常活动的信息。','照片中的小细节可能透露你在哪里上学或活动。'),
  ('location-school-uniform-post',1,'C','zh-CN','保留照片，但加上说明不要分享。','说明文字表达了界限，但没有移除识别信息。','隐私保护最好在内容发布前完成。'),
  ('location-school-uniform-post',2,'A','ms','Jawab dengan sopan kerana komen itu nampak mesra.','Tidak selamat. Soalan mesra masih boleh mengumpul butiran rutin peribadi.','Elakkan berkongsi kelas, jadual, laluan, atau lokasi tepat dengan orang asing dalam talian.'),
  ('location-school-uniform-post',2,'B','ms','Jangan jawab, hadkan atau sekat akaun itu, dan beritahu orang dewasa dipercayai jika terasa membimbangkan.','Betul. Anda melindungi maklumat rutin dan mendapatkan bantuan jika perlu.','Orang asing yang bertanya butiran rutin memerlukan kewaspadaan tambahan.'),
  ('location-school-uniform-post',2,'C','ms','Balas dengan jenaka tetapi tanpa butiran sebenar.','Tidak berkongsi butiran itu baik, tetapi meneruskan perbualan boleh mengundang soalan lagi.','Anda tidak wajib membalas orang asing yang bertanya soalan peribadi.'),
  ('location-school-uniform-post',2,'A','zh-CN','礼貌回答，因为留言看起来很友善。','不安全。友善的问题也可能收集你的私人日常信息。','避免向网上陌生人分享班级、时间表、路线或精确位置。'),
  ('location-school-uniform-post',2,'B','zh-CN','不要回答，限制或屏蔽该账号，如果觉得担心就告诉可信成年人。','正确。你保护了日常信息，并在需要时升级求助。','陌生人询问日常细节时，应格外谨慎。'),
  ('location-school-uniform-post',2,'C','zh-CN','开个玩笑回复，但不透露真实细节。','不分享细节是好的，但继续对话可能引来更多问题。','你没有义务回复询问个人问题的陌生人。'),
  ('location-school-uniform-post',3,'A','ms','Muat naik kerana itu akaun anda.','Memuat naik orang lain tanpa persetujuan boleh menjejaskan privasi mereka juga.','Privasi termasuk menghormati orang lain yang muncul dalam kandungan anda.'),
  ('location-school-uniform-post',3,'B','ms','Minta persetujuan dan sunting atau elak memuat naik jika mereka tidak selesa.','Kuat. Anda mempertimbangkan privasi diri dan rakan.','Persetujuan dan membuang butiran pengenalan ialah tabiat kewargaan digital yang baik.'),
  ('location-school-uniform-post',3,'C','ms','Tutup muka rakan tetapi biarkan tag lokasi.','Menutup muka membantu, tetapi lokasi masih boleh mendedahkan konteks sensitif.','Semak keseluruhan hantaran, termasuk tag, latar belakang, kapsyen, dan metadata.'),
  ('location-school-uniform-post',3,'A','zh-CN','发布，因为这是你的账号。','未经同意发布他人照片也可能伤害他们的隐私。','隐私也包括尊重出现在你内容中的其他人。'),
  ('location-school-uniform-post',3,'B','zh-CN','征求同意；如果他们不舒服，就编辑或不要发布。','很强。你同时考虑了自己和朋友的隐私。','征得同意并移除识别细节，是良好的数字公民习惯。'),
  ('location-school-uniform-post',3,'C','zh-CN','遮住朋友的脸，但保留位置标签。','遮脸有帮助，但位置仍可能透露敏感背景。','检查整篇帖文，包括标签、背景、说明文字和元数据。'),
  ('mobile-app-excessive-permissions',1,'A','ms','Benarkan semuanya supaya aplikasi berfungsi dengan betul.','Berisiko. Aplikasi hanya patut menerima kebenaran yang diperlukan untuk ciri digunakan.','Kebenaran berlebihan boleh mendedahkan kenalan, lokasi, atau rakaman tanpa perlu.'),
  ('mobile-app-excessive-permissions',1,'B','ms','Semak sebab setiap kebenaran diperlukan dan tolak apa-apa yang tidak perlu.','Bagus. Anda menyemak sama ada permintaan sepadan dengan ciri aplikasi.','Semakan kebenaran membantu mengehadkan data peribadi yang boleh diakses aplikasi.'),
  ('mobile-app-excessive-permissions',1,'C','ms','Benarkan kamera sahaja dan putuskan yang lain kemudian.','Lebih baik daripada membenarkan semuanya, tetapi anda masih patut semak permintaan lain.','Berikan hanya kebenaran yang diperlukan sekarang dan semak semula tetapan apabila ciri berubah.'),
  ('mobile-app-excessive-permissions',1,'A','zh-CN','全部允许，让应用正常运行。','有风险。应用只应获得你使用该功能所需的权限。','过多权限可能不必要地暴露联系人、位置或录音。'),
  ('mobile-app-excessive-permissions',1,'B','zh-CN','查看每项权限为何需要，并拒绝不必要的权限。','很好。你检查了请求是否符合应用功能。','审查权限有助限制应用可访问的个人数据。'),
  ('mobile-app-excessive-permissions',1,'C','zh-CN','只允许相机，其余之后再决定。','这比全部允许好，但仍应检查其他请求。','只授予当前需要的权限，并在功能改变时重新查看设置。'),
  ('mobile-app-excessive-permissions',2,'A','ms','Pasang juga kerana penapis itu sedang tular.','Populariti tidak menjamin keselamatan. Tanda amaran dalam ulasan penting.','Ulasan, reputasi pembangun, dan permintaan kebenaran membantu menilai risiko.'),
  ('mobile-app-excessive-permissions',2,'B','ms','Cari alternatif yang lebih dikenali dengan kebenaran lebih sedikit.','Betul. Anda menimbang manfaat dengan risiko privasi.','Alternatif dipercayai dengan kebenaran terhad biasanya lebih selamat.'),
  ('mobile-app-excessive-permissions',2,'C','ms','Tanya rakan sama ada aplikasi itu berfungsi untuk mereka.','Bertanya rakan membantu, tetapi tidak menjawab sepenuhnya isu privasi.','Gabungkan cadangan rakan dengan semakan kebenaran dan ulasan.'),
  ('mobile-app-excessive-permissions',2,'A','zh-CN','还是安装，因为这个滤镜正在流行。','流行不代表安全。评论中的警讯很重要。','评论、开发者信誉和权限请求都能帮助判断风险。'),
  ('mobile-app-excessive-permissions',2,'B','zh-CN','寻找权限更少、较知名的替代应用。','正确。你平衡了好处和隐私风险。','权限有限且可信的替代应用通常更安全。'),
  ('mobile-app-excessive-permissions',2,'C','zh-CN','问朋友这个应用对他们是否有用。','问朋友有帮助，但不能完全回答隐私疑虑。','把朋友建议与权限和评论检查结合起来。'),
  ('mobile-app-excessive-permissions',3,'A','ms','Buka tetapan peranti dan buang kebenaran yang tidak diperlukan, atau nyahpasang aplikasi.','Kuat. Anda masih boleh mengurangkan risiko selepas pemasangan.','Tetapan kebenaran dan nyahpasang ialah cara praktikal untuk mengambil semula kawalan.'),
  ('mobile-app-excessive-permissions',3,'B','ms','Berhenti membuka aplikasi itu sahaja.','Kurang menggunakannya mungkin membantu, tetapi kebenaran boleh kekal aktif bergantung pada tetapan.','Semak kebenaran atau buang aplikasi jika anda tidak lagi mempercayainya.'),
  ('mobile-app-excessive-permissions',3,'C','ms','Siarkan nombor telefon dalam komen aplikasi dan minta pembangun membaikinya.','Jangan siarkan butiran hubungan peribadi secara umum untuk menyelesaikan isu aplikasi.','Gunakan saluran sokongan rasmi tanpa mendedahkan maklumat peribadi.'),
  ('mobile-app-excessive-permissions',3,'A','zh-CN','打开设备设置，移除应用不需要的权限，或卸载它。','很强。安装后你仍然可以降低风险。','权限设置和卸载是重新掌控的实际方法。'),
  ('mobile-app-excessive-permissions',3,'B','zh-CN','只是停止打开这个应用。','少用可能有帮助，但权限可能仍根据设置保持有效。','如果不再信任该应用，请查看权限或移除应用。'),
  ('mobile-app-excessive-permissions',3,'C','zh-CN','在应用评论里公开电话号码，请开发者修复。','不要为了处理应用问题而公开私人联系方式。','使用官方支持渠道，不要暴露个人信息。')
ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation);
-- migrate:statement-end

-- migrate:statement-start
INSERT INTO tmp_scenario_option_translations (slug, step_order, option_key, locale, text, feedback, safety_explanation)
VALUES
  ('viral-emergency-group-chat',1,'A','ms','Majukan segera sekiranya ia benar.','Memajukan amaran yang belum disahkan boleh menyebarkan panik atau maklumat palsu.','Bahasa yang mendesak untuk memajukan ialah tanda untuk berhenti dan menyemak.'),
  ('viral-emergency-group-chat',1,'B','ms','Berhenti seketika dan semak saluran rasmi sekolah, pihak berkuasa tempatan, atau berita dipercayai.','Betul. Anda mengesahkan sebelum memperbesarkan dakwaan itu.','Gunakan sumber rasmi atau bereputasi sebelum berkongsi dakwaan kecemasan.'),
  ('viral-emergency-group-chat',1,'C','ms','Tanya dalam kumpulan siapa yang mula-mula menghantarnya.','Mencari sumber boleh membantu, tetapi anda masih perlukan pengesahan yang boleh dipercayai.','Orang pertama dalam sembang anda mungkin bukan sumber asal atau tepat.'),
  ('viral-emergency-group-chat',1,'A','zh-CN','立刻转发，以防是真的。','转发未核实警告可能传播恐慌或错误信息。','要求紧急转发的语言，是提醒你暂停并核实的信号。'),
  ('viral-emergency-group-chat',1,'B','zh-CN','先暂停，查看学校官方、本地 authorities 或可信新闻渠道。','正确。你在扩大传播前先核实。','分享紧急说法前，请使用官方或可靠来源。'),
  ('viral-emergency-group-chat',1,'C','zh-CN','问群里是谁最先发的。','找来源有帮助，但你仍需要可靠核实。','你群里的第一个发送者不一定是原始或准确来源。'),
  ('viral-emergency-group-chat',2,'A','ms','Katakan ia pasti palsu tanpa menyemak lagi.','Ia mungkin belum disahkan, tetapi terlalu cepat menyatakan pasti juga boleh mengelirukan.','Gunakan kata-kata berhati-hati: belum disahkan, semak kemas kini rasmi.'),
  ('viral-emergency-group-chat',2,'B','ms','Kongsi bahawa ia belum disahkan dan cadangkan menunggu kemas kini rasmi.','Bagus. Anda mengurangkan panik dan menggalakkan pengesahan.','Bahasa yang jelas dan tenang membantu kumpulan mengelak menyebarkan dakwaan tidak pasti.'),
  ('viral-emergency-group-chat',2,'C','ms','Hantar ke lebih banyak kumpulan supaya orang lain boleh sahkan.','Itu menyebarkan dakwaan sebelum pengesahan.','Pengesahan tidak sepatutnya memerlukan mesej itu diperbesarkan.'),
  ('viral-emergency-group-chat',2,'A','zh-CN','不再核实就说它肯定是假的。','它也许未核实，但太快下定论也可能误导。','请谨慎表达：目前未证实，请查看官方更新。'),
  ('viral-emergency-group-chat',2,'B','zh-CN','说明它尚未核实，并建议等待官方更新。','很好。你减少恐慌，并鼓励核实。','清楚冷静的表达能帮助群组避免传播不确定消息。'),
  ('viral-emergency-group-chat',2,'C','zh-CN','发到更多群，让别人帮忙核实。','这会在核实前扩散说法。','核实不应靠扩大传播来完成。'),
  ('viral-emergency-group-chat',3,'A','ms','Kongsi kemas kini rasmi dan minta orang ramai tidak memajukan amaran lama.','Kuat. Pembetulan membantu mengehadkan capaian maklumat palsu.','Apabila dakwaan dibetulkan, kongsi pembetulan di tempat dakwaan itu tersebar.'),
  ('viral-emergency-group-chat',3,'B','ms','Diam sahaja kerana panik sudah selesai.','Panik mungkin reda, tetapi mesej lama boleh terus tersebar di tempat lain.','Pembetulan paling berguna apabila sampai kepada audiens yang sama.'),
  ('viral-emergency-group-chat',3,'C','ms','Ejek orang yang memajukannya dahulu.','Mengejek boleh membuat orang takut bertanya soalan pada masa depan.','Betulkan maklumat palsu dengan hormat dan fokus pada tingkah laku lebih selamat.'),
  ('viral-emergency-group-chat',3,'A','zh-CN','分享官方更新，并请大家不要再转发旧警告。','很强。更正有助限制错误信息的影响范围。','当说法被更正时，请在它传播过的地方分享更正。'),
  ('viral-emergency-group-chat',3,'B','zh-CN','什么都不说，因为恐慌已经过去。','恐慌可能消退，但旧消息仍可能在其他地方继续传播。','更正信息到达同一批受众时最有用。'),
  ('viral-emergency-group-chat',3,'C','zh-CN','嘲笑第一个转发的人。','嘲笑可能让人下次不敢提问。','应尊重地更正错误信息，并专注于更安全的行为。'),
  ('ai-celebrity-investment-video',1,'A','ms','Daftar cepat sebelum tawaran ditutup.','Tidak selamat. Pulangan dijamin dan desakan ialah isyarat scam biasa.','Keputusan pelaburan tidak patut dibuat tergesa-gesa daripada video sosial.'),
  ('ai-celebrity-investment-video',1,'B','ms','Berhenti seketika dan cari dakwaan itu di saluran rasmi serta sumber bereputasi.','Bagus. Anda tidak menganggap video itu sebagai bukti dengan sendirinya.','Deepfake dan klip suntingan boleh membuat orang kelihatan berkata perkara yang tidak pernah dikatakan.'),
  ('ai-celebrity-investment-video',1,'C','ms','Baca komen untuk melihat sama ada orang teruja.','Komen boleh memberi petunjuk, tetapi juga boleh palsu atau diselaraskan.','Gunakan pengesahan yang lebih kuat daripada sentimen komen.'),
  ('ai-celebrity-investment-video',1,'A','zh-CN','在优惠结束前赶快报名。','不安全。保证回报和紧迫感是常见诈骗信号。','投资决定不应因社交视频而仓促作出。'),
  ('ai-celebrity-investment-video',1,'B','zh-CN','先暂停，在官方渠道和可靠来源查找这个说法。','很好。你没有把视频本身当成证据。','深度伪造和剪辑片段可能让人看起来说了从未说过的话。'),
  ('ai-celebrity-investment-video',1,'C','zh-CN','阅读评论，看大家是否很兴奋。','评论能提供线索，但也可能是假的或被协调操控。','请使用比评论情绪更强的核实方式。'),
  ('ai-celebrity-investment-video',2,'A','ms','Anggap kecacatan visual itu sebagai amaran dan jangan bayar.','Betul. Ketidakpadanan visual dan audio ialah tanda amaran berguna.','Petunjuk deepfake termasuk gerak bibir pelik, suara tidak semula jadi, dan tekanan untuk membayar.'),
  ('ai-celebrity-investment-video',2,'B','ms','Bayar sedikit sahaja untuk menguji sama ada ia berfungsi.','Deposit kecil pun boleh membawa kepada lebih banyak tekanan atau kerugian.','Jangan menguji halaman pelaburan mencurigakan dengan wang atau butiran peribadi.'),
  ('ai-celebrity-investment-video',2,'C','ms','Simpan video dan tanya orang dewasa dipercayai sebelum berbuat apa-apa.','Bertanya orang dewasa dipercayai membantu, dan anda juga patut elak membayar semasa mengesahkan.','Untuk dakwaan berkaitan wang, berhenti seketika dan dapatkan nasihat boleh dipercayai sebelum bertindak.'),
  ('ai-celebrity-investment-video',2,'A','zh-CN','把视觉异常当作警讯，不要付款。','正确。画面和声音不匹配是有用的警讯。','深度伪造线索包括奇怪的口型、不自然的声音和付款压力。'),
  ('ai-celebrity-investment-video',2,'B','zh-CN','先付一小笔钱测试是否有效。','即使是小额押金，也可能带来更多压力或损失。','不要用金钱或个人资料测试可疑投资页面。'),
  ('ai-celebrity-investment-video',2,'C','zh-CN','保存视频，并在做任何事前询问可信成年人。','询问可信成年人有帮助，同时在核实时也应避免付款。','涉及金钱的说法，应暂停并先取得可靠建议。'),
  ('ai-celebrity-investment-video',3,'A','ms','Kongsi semula video itu dengan kapsyen amaran.','Berkongsi semula masih boleh menaikkan capaian video scam.','Elakkan menambah capaian kandungan mencurigakan, walaupun dengan amaran.'),
  ('ai-celebrity-investment-video',3,'B','ms','Terangkan tanda amaran dan cadangkan melaporkan hantaran tanpa memuat naik semula.','Kuat. Anda membantu orang lain mengenal risiko tanpa memperbesarkannya.','Melapor dan menerangkan tanda amaran lebih selamat daripada memuat naik semula media mencurigakan.'),
  ('ai-celebrity-investment-video',3,'C','ms','Beritahu rakan sekelas sahaja bahawa ia mungkin palsu.','Amaran membantu, tetapi tanda jelas dan langkah laporan lebih berguna.','Panduan khusus membantu orang membuat keputusan seterusnya.'),
  ('ai-celebrity-investment-video',3,'A','zh-CN','带着警告说明再次分享视频。','再次分享仍可能提高诈骗视频的传播。','即使带有警告，也应避免扩大可疑内容的触达。'),
  ('ai-celebrity-investment-video',3,'B','zh-CN','说明警讯，并建议举报帖文，不要重新发布。','很强。你帮助别人识别风险，同时没有扩大传播。','举报并描述警讯，比重新发布可疑媒体更安全。'),
  ('ai-celebrity-investment-video',3,'C','zh-CN','只告诉同学它可能是假的。','提醒有帮助，但清楚的迹象和举报步骤更有用。','具体指引能帮助别人决定下一步。')
ON DUPLICATE KEY UPDATE text = VALUES(text), feedback = VALUES(feedback), safety_explanation = VALUES(safety_explanation);
-- migrate:statement-end

INSERT INTO scenario_option_translations (step_id, option_key, locale, text, feedback, safety_explanation)
SELECT ss.id, t.option_key, t.locale, t.text, t.feedback, t.safety_explanation
FROM tmp_scenario_option_translations t
JOIN scenario_definitions sd ON sd.slug = t.slug AND sd.version = 1
JOIN scenario_steps ss ON ss.scenario_id = sd.id AND ss.step_order = t.step_order
ON DUPLICATE KEY UPDATE
  text = VALUES(text),
  feedback = VALUES(feedback),
  safety_explanation = VALUES(safety_explanation);

DROP TEMPORARY TABLE tmp_scenario_option_translations;
