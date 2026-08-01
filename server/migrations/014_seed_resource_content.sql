INSERT INTO resource_articles (slug, category_code, source_url, display_order, status)
VALUES
  ('phishing', 'Scams', 'https://www.csa.gov.sg/our-programmes/cybersecurity-outreach/cybersecurity-awareness/resources/phishing', 1, 'published'),
  ('online-scams', 'Scams', 'https://www.nsrc.my/', 2, 'published'),
  ('misinformation-fake-news', 'Misinformation', 'https://sebenarnya.my/', 3, 'published'),
  ('ai-generated-content', 'AI & Technology', 'https://www.mcmc.gov.my/en/media/press-clippings/understanding-ai-generated-content', 4, 'published'),
  ('deepfakes', 'AI & Technology', 'https://www.interpol.int/en/Crimes/Cybercrime/Deepfakes', 5, 'published'),
  ('privacy-personal-data', 'Privacy', 'https://www.pdp.gov.my/jpdpv2/', 6, 'published'),
  ('cyberbullying', 'Safety', 'https://www.unicef.org/malaysia/what-is-cyberbullying', 7, 'published'),
  ('password-security', 'Passwords', 'https://www.cisa.gov/secure-our-world/use-strong-passwords', 8, 'published'),
  ('digital-citizenship', 'Beginner', 'https://www.digitalcitizenship.net/', 9, 'published')
ON DUPLICATE KEY UPDATE
  category_code = VALUES(category_code),
  source_url = VALUES(source_url),
  display_order = VALUES(display_order),
  status = VALUES(status);

-- migrate:statement-start
INSERT INTO resource_article_translations
  (resource_id, locale, title, summary, content_json, source_label)
VALUES
  ((SELECT id FROM resource_articles WHERE slug = 'phishing'),
   'en',
   'Phishing',
   'Recognise the bait before you take it.',
   JSON_ARRAY(
     'Phishing is a type of cyber attack where criminals impersonate legitimate organisations — banks, delivery services, or even government agencies — through emails, SMS messages, or fake websites. The goal is to trick you into handing over sensitive information like passwords, credit card numbers, or one-time PINs. These messages often create a false sense of urgency, warning you that your account will be suspended or that a parcel is waiting unless you act immediately.',
     'Modern phishing attacks have become highly sophisticated. Spear phishing targets specific individuals using personal details gathered from social media, making the message feel genuine. Smishing uses SMS, while vishing is conducted over phone calls. Even tech-savvy users fall victim because attackers study their targets carefully and craft believable scenarios tailored to their situation.',
     'To protect yourself, always verify the sender''s email address carefully — look for subtle misspellings like ''paypa1.com'' instead of ''paypal.com''. Never click links in unsolicited messages; instead, navigate directly to the official website. Enable multi-factor authentication on your accounts so that even if your password is stolen, attackers cannot easily access your data.'
   ),
   'Cyber Security Agency of Singapore'),
  ((SELECT id FROM resource_articles WHERE slug = 'online-scams'),
   'en',
   'Online Scams',
   'Know the tricks fraudsters use to steal your money.',
   JSON_ARRAY(
     'Online scams encompass a wide range of fraudulent schemes designed to deceive people into sending money or revealing personal information. Common types include e-commerce scams (fake online shops that take payment but never deliver), investment scams promising unrealistically high returns, love scams where criminals build fake romantic relationships over weeks or months before requesting money, and job scams offering easy income for minimal work.',
     'Malaysia consistently ranks among the countries with high rates of online fraud. The Royal Malaysia Police (PDRM) reported billions in losses annually, with Macau scams, phone scams, and investment fraud being the most prevalent. Victims often feel embarrassed to report these crimes, which allows scammers to continue operating and targeting others.',
     'The best defence is healthy scepticism. If an offer sounds too good to be true, it almost certainly is. Always verify the legitimacy of websites, sellers, and investment platforms before transferring any money. Use secure payment methods with buyer protection, and report suspected scams to the National Scam Response Centre (NSRC) hotline at 997.'
   ),
   'National Scam Response Centre (NSRC) Malaysia'),
  ((SELECT id FROM resource_articles WHERE slug = 'misinformation-fake-news'),
   'en',
   'Misinformation & Fake News',
   'Stop false information from spreading through your network.',
   JSON_ARRAY(
     'Misinformation refers to false or inaccurate information spread regardless of intent, while disinformation is deliberately fabricated to deceive. In the social media era, both travel at extraordinary speed. A single misleading post can reach thousands of people within hours, shaping opinions on health, elections, and public safety before any correction can catch up.',
     'Malaysia introduced the Anti-Fake News Act in 2018, reflecting how seriously governments treat this issue. False information about health treatments, political figures, and natural disasters has caused real-world harm — from people refusing vaccines to mob violence triggered by rumours. The viral nature of social media platforms incentivises outrage and novelty over accuracy, making misinformation particularly potent.',
     'Before sharing anything, apply the SIFT method: Stop before reacting, Investigate the source, Find better coverage from credible outlets, and Trace claims back to their origin. Fact-checking websites like Sebenarnya.my (Malaysia''s official fact-check portal) and AFP Fact Check provide verified information on viral claims. Remember that sharing false information, even unintentionally, makes you part of the problem.'
   ),
   'Sebenarnya.my — Malaysia''s Official Fact Check Portal'),
  ((SELECT id FROM resource_articles WHERE slug = 'ai-generated-content'),
   'en',
   'AI-Generated Content',
   'Understand what machines can create — and why it matters.',
   JSON_ARRAY(
     'Artificial intelligence can now generate text, images, audio, and video that are virtually indistinguishable from human-created content. Tools like large language models (LLMs) can write convincing articles, product reviews, and social media posts at scale. AI image generators can produce photorealistic pictures of events that never happened. This capability has enormous legitimate uses — from design and accessibility to education — but also serious risks.',
     'AI-generated content becomes dangerous when it is used without disclosure to deceive. Fake reviews manipulate purchasing decisions. AI-written propaganda floods information ecosystems. Synthetic media is used in scams where criminals impersonate executives or family members in audio or video calls. As these tools become cheaper and easier to use, the volume of synthetic content online is growing rapidly.',
     'Critical evaluation is essential. Look for unnatural repetition, overly formal language, or images with subtle errors (distorted hands, inconsistent backgrounds). Many AI tools now embed watermarks or metadata, and AI-detection platforms are improving. When consuming content on important topics, prioritise established news organisations and primary sources over viral social media posts, regardless of how polished they appear.'
   ),
   'Malaysian Communications and Multimedia Commission (MCMC)'),
  ((SELECT id FROM resource_articles WHERE slug = 'deepfakes'),
   'en',
   'Deepfakes',
   'AI-manipulated media and how to spot it.',
   JSON_ARRAY(
     'Deepfakes are synthetic media — most commonly videos or audio recordings — in which a person''s likeness, voice, or words are digitally replaced or manipulated using artificial intelligence. The technology has advanced so rapidly that high-quality deepfakes can now be created by anyone with a consumer-grade computer and freely available software. While deepfakes have legitimate creative applications in film and entertainment, they are increasingly weaponised for harm.',
     'The threats posed by deepfakes are serious and varied. Politicians and public figures have been targeted with fabricated videos that misrepresent their statements. Revenge porn deepfakes — non-consensual synthetic intimate images — cause devastating psychological harm, particularly to women. Business email compromise scams now use deepfake audio to impersonate CEOs and authorise fraudulent wire transfers. In Malaysia, deepfake scam videos impersonating celebrities and public figures to promote fake investment schemes have become a serious problem.',
     'Detecting deepfakes requires careful observation: look for unnatural blinking patterns, inconsistent lighting on the face, blurry or morphing edges around the hairline, and audio that does not quite match lip movements. Reverse image searches and tools like Microsoft''s Video Authenticator can help verify media authenticity. If you receive an unexpected request via video or audio — especially involving money — verify it through an independent channel before acting.'
   ),
   'INTERPOL — Deepfakes Resource'),
  ((SELECT id FROM resource_articles WHERE slug = 'privacy-personal-data'),
   'en',
   'Privacy & Personal Data',
   'Take control of who knows what about you online.',
   JSON_ARRAY(
     'Every time you use an app, browse a website, or make an online purchase, you generate data. This data — your location, browsing habits, purchase history, health information, and more — is collected, analysed, and often sold by companies to advertisers and data brokers. Malaysia''s Personal Data Protection Act (PDPA) 2010 provides some legal safeguards, but individuals must also take proactive steps to protect their own privacy.',
     'Data breaches are a constant risk. When companies that hold your information are hacked, your personal details can end up on the dark web, sold to fraudsters, or used for identity theft. Large-scale breaches affecting millions of Malaysians have been reported involving telecommunications companies, financial institutions, and government databases. Once your data is out, it is very difficult to contain.',
     'Minimise your digital footprint by only providing necessary information to online services. Read privacy policies and adjust app permissions — does a flashlight app really need access to your contacts? Use a different strong password for every service (a password manager makes this easy), enable two-factor authentication, and regularly check whether your email appears in known data breaches at HaveIBeenPwned.com.'
   ),
   'Department of Personal Data Protection Malaysia (JPDP)'),
  ((SELECT id FROM resource_articles WHERE slug = 'cyberbullying'),
   'en',
   'Cyberbullying',
   'Recognise, respond to, and prevent online harassment.',
   JSON_ARRAY(
     'Cyberbullying is the use of digital technology — social media, messaging apps, gaming platforms, or email — to repeatedly harass, threaten, humiliate, or target another person. Unlike traditional bullying, it can occur 24 hours a day, reach a vast audience instantly, and follow victims wherever they go. Screenshots and viral sharing mean hurtful content can be nearly impossible to completely remove. Young people are disproportionately affected, but adults experience cyberbullying too, particularly in the form of workplace harassment and coordinated online pile-ons.',
     'The psychological impact of cyberbullying is severe and well-documented: victims commonly experience anxiety, depression, low self-esteem, and in serious cases, suicidal ideation. In Malaysia, cyberbullying is addressed under Section 233 of the Communications and Multimedia Act 1998, which makes it illegal to transmit offensive or menacing content online. Penalties can include fines and imprisonment.',
     'If you or someone you know is being cyberbullied: do not respond to the bully, document everything with screenshots, block and report the user on the platform, and — critically — tell a trusted adult, school counsellor, or contact Talian Kasih at 15999 for support. Bystanders play a powerful role: refusing to share or engage with bullying content and offering support to victims can significantly reduce harm.'
   ),
   'UNICEF Malaysia — Cyberbullying Resources'),
  ((SELECT id FROM resource_articles WHERE slug = 'password-security'),
   'en',
   'Password Security',
   'Why length beats complexity — and how to remember them.',
   JSON_ARRAY(
     'Weak passwords remain the single most common way accounts are compromised. Attackers use automated tools that can try billions of password combinations per second, meaning a short password — even one with numbers and symbols — can be cracked in minutes. The most effective passwords are long passphrases: a string of four or more random words is far harder to crack than a short complex password, and much easier for a human to remember.',
     'Password reuse is equally dangerous. When one website suffers a data breach, attackers take the stolen username-password combinations and automatically try them on hundreds of other sites (a technique called credential stuffing). If you use the same password everywhere, a breach at one obscure forum can lead to your bank account being compromised. Each account you own should have a unique password.',
     'A password manager — such as Bitwarden (free and open source), 1Password, or the password manager built into your browser — solves both problems. It generates and stores long, random, unique passwords for every site, so you only need to remember one master password. Pair this with two-factor authentication (2FA) on all important accounts: even if your password is stolen, an attacker cannot log in without access to your phone or authenticator app.'
   ),
   'CISA — Use Strong Passwords'),
  ((SELECT id FROM resource_articles WHERE slug = 'digital-citizenship'),
   'en',
   'Digital Citizenship',
   'Be responsible, respectful, and rights-aware online.',
   JSON_ARRAY(
     'Digital citizenship refers to the responsible and ethical use of technology and the internet. Just as physical citizenship carries rights and responsibilities, being active online means participating in a shared space that is shaped by how all of us behave. Good digital citizens think critically about the content they consume and share, respect others'' privacy and dignity, and contribute constructively to online communities.',
     'The digital world carries real legal responsibilities. Sharing someone else''s copyrighted content, posting defamatory statements, distributing intimate images without consent, and inciting hatred online are all illegal in Malaysia under various laws including the Communications and Multimedia Act, the Defamation Act, and the Penal Code. The anonymity of the internet is increasingly illusory — authorities regularly identify and prosecute individuals for online offences.',
     'Practising good digital citizenship starts with small habits: pause before posting to consider how your words might affect others; verify information before sharing it; protect your personal information and respect others''; speak up when you witness online abuse. Digital literacy education is expanding in Malaysian schools, but everyone — regardless of age — benefits from regularly reflecting on how they show up in digital spaces.'
   ),
   'DigitalCitizenship.net')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  summary = VALUES(summary),
  content_json = VALUES(content_json),
  source_label = VALUES(source_label);
-- migrate:statement-end
