CREATE TABLE IF NOT EXISTS assessment_definitions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  assessment_type ENUM('initial', 'post', 'practice') NOT NULL,
  version INT UNSIGNED NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  question_count INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_definitions_slug_version (slug, version),
  INDEX idx_assessment_definitions_type_status (assessment_type, status)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT UNSIGNED NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NOT NULL,
  prompt TEXT NOT NULL,
  options_json JSON NOT NULL,
  correct_option_key ENUM('A', 'B', 'C', 'D') NOT NULL,
  explanation TEXT NOT NULL,
  difficulty ENUM('basic', 'intermediate', 'advanced') NOT NULL DEFAULT 'basic',
  display_order INT UNSIGNED NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_questions_order (assessment_id, display_order),
  INDEX idx_assessment_questions_topic (assessment_id, topic_code),
  CONSTRAINT fk_assessment_questions_definition
    FOREIGN KEY (assessment_id) REFERENCES assessment_definitions(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  assessment_id INT UNSIGNED NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  total_score INT UNSIGNED NULL,
  maximum_score INT UNSIGNED NULL,
  percentage INT UNSIGNED NULL,
  measured_level ENUM('beginner', 'developing', 'intermediate', 'advanced') NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assessment_attempts_user_status (user_id, status),
  INDEX idx_assessment_attempts_assessment (assessment_id),
  CONSTRAINT fk_assessment_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_assessment_attempts_definition
    FOREIGN KEY (assessment_id) REFERENCES assessment_definitions(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  selected_option_key ENUM('A', 'B', 'C', 'D') NOT NULL,
  is_correct BOOLEAN NULL,
  awarded_score INT UNSIGNED NULL,
  answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_answers_attempt_question (attempt_id, question_id),
  INDEX idx_assessment_answers_question (question_id),
  CONSTRAINT fk_assessment_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_assessment_answers_question
    FOREIGN KEY (question_id) REFERENCES assessment_questions(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assessment_topic_scores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NOT NULL,
  correct_count INT UNSIGNED NOT NULL,
  total_count INT UNSIGNED NOT NULL,
  percentage INT UNSIGNED NOT NULL,
  UNIQUE KEY uq_assessment_topic_scores_attempt_topic (attempt_id, topic_code),
  CONSTRAINT fk_assessment_topic_scores_attempt
    FOREIGN KEY (attempt_id) REFERENCES assessment_attempts(id)
    ON DELETE CASCADE
);

INSERT INTO assessment_definitions
  (slug, title, description, assessment_type, version, status, question_count)
VALUES
  (
    'initial-cyber-wellness-v1',
    'Initial Cyber Wellness Assessment',
    'A fixed 12-question baseline assessment covering phishing, account security, privacy, and misinformation.',
    'initial',
    1,
    'published',
    12
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  assessment_type = VALUES(assessment_type),
  status = VALUES(status),
  question_count = VALUES(question_count);

DELETE FROM assessment_questions
WHERE assessment_id = (SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1);

-- migrate:statement-start
INSERT INTO assessment_questions
  (assessment_id, topic_code, prompt, options_json, correct_option_key, explanation, difficulty, display_order, status)
VALUES
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'phishing_and_scams',
   'You receive a message saying your bank account will be locked unless you click a link immediately. What is the safest action?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Click the link quickly before the account is locked'),JSON_OBJECT('key','B','text','Reply with your account number to confirm it is real'),JSON_OBJECT('key','C','text','Open the bank app or official website yourself to check'),JSON_OBJECT('key','D','text','Forward the link to friends to ask if they know it')),
   'C',
   'Urgent messages with links can be phishing. Use the official app, website, or phone number instead of the message link.',
   'basic',
   1,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'phishing_and_scams',
   'A delivery SMS asks you to pay a small fee through a shortened link before your parcel can be released. What should you do first?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Pay because the amount is small'),JSON_OBJECT('key','B','text','Check the delivery status using the official courier website or app'),JSON_OBJECT('key','C','text','Send your debit card details by SMS'),JSON_OBJECT('key','D','text','Ignore all parcel messages forever')),
   'B',
   'Scammers often use fake delivery fee links. Check through the official courier channel before paying anything.',
   'basic',
   2,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'phishing_and_scams',
   'Someone claiming to be from a game support team asks for your one-time password so they can give you free credits. What should you do?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Share the OTP if they know your username'),JSON_OBJECT('key','B','text','Share only half of the OTP'),JSON_OBJECT('key','C','text','Do not share the OTP with anyone'),JSON_OBJECT('key','D','text','Post the OTP in the game chat')),
   'C',
   'An OTP is a security code for you only. Real support teams should not ask you to share it.',
   'basic',
   3,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'password_and_account_security',
   'Which password habit is safest?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Use the same easy password for every account'),JSON_OBJECT('key','B','text','Use a unique strong password for each important account'),JSON_OBJECT('key','C','text','Use your birthday so you can remember it'),JSON_OBJECT('key','D','text','Share passwords only with close friends')),
   'B',
   'Unique strong passwords reduce the damage if one account is compromised.',
   'basic',
   4,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'password_and_account_security',
   'Why is multi-factor authentication useful?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','It makes your password visible to trusted websites'),JSON_OBJECT('key','B','text','It adds another check if someone learns your password'),JSON_OBJECT('key','C','text','It lets you use shorter passwords'),JSON_OBJECT('key','D','text','It stops all scams automatically')),
   'B',
   'Multi-factor authentication adds another layer, such as an app prompt or code, after the password.',
   'basic',
   5,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'password_and_account_security',
   'Your friend asks to borrow your social media account for a school event because theirs is blocked. What is the safest response?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Give them your password for one day'),JSON_OBJECT('key','B','text','Log in for them and leave the device signed in'),JSON_OBJECT('key','C','text','Do not share the account; help them use another safe method'),JSON_OBJECT('key','D','text','Change your password to something simple first')),
   'C',
   'Sharing accounts can expose private messages, contacts, and security settings. Help without giving access.',
   'intermediate',
   6,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'privacy_and_personal_information',
   'Which information is safest to avoid posting publicly?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Your favourite music genre'),JSON_OBJECT('key','B','text','Your home address and daily routine'),JSON_OBJECT('key','C','text','A drawing you made'),JSON_OBJECT('key','D','text','A review of a movie')),
   'B',
   'Home address and routine details can put privacy and safety at risk when shared publicly.',
   'basic',
   7,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'privacy_and_personal_information',
   'A photo editing app asks for access to your contacts and location even though you only want to edit one picture. What is the best choice?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Allow everything because all apps need it'),JSON_OBJECT('key','B','text','Only allow permissions that are needed for the task'),JSON_OBJECT('key','C','text','Give permission and uninstall your browser'),JSON_OBJECT('key','D','text','Post your contact list online first')),
   'B',
   'Apps should only get permissions they need. Extra access can expose personal information.',
   'intermediate',
   8,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'privacy_and_personal_information',
   'You are posting a photo from your school trip. What is a safer privacy choice?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Tag your exact live location while you are still there'),JSON_OBJECT('key','B','text','Share the exact bus route and hotel room number'),JSON_OBJECT('key','C','text','Post later and avoid revealing exact private locations'),JSON_OBJECT('key','D','text','Add your phone number in the caption')),
   'C',
   'Posting later and avoiding exact private locations reduces real-time tracking and oversharing risks.',
   'intermediate',
   9,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'misinformation_and_deepfakes',
   'A viral post makes an urgent claim but does not show a source. What should you do before sharing it?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Share it quickly in case it is important'),JSON_OBJECT('key','B','text','Check trusted sources or official channels first'),JSON_OBJECT('key','C','text','Believe it if many people use angry emojis'),JSON_OBJECT('key','D','text','Edit the post to make it sound stronger')),
   'B',
   'Urgent viral claims should be checked against trusted sources before you help spread them.',
   'basic',
   10,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'misinformation_and_deepfakes',
   'A video of a public figure looks shocking, but the face and voice seem slightly unnatural. What is a careful next step?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','Assume it is real because it is a video'),JSON_OBJECT('key','B','text','Check whether reliable news or official sources confirm it'),JSON_OBJECT('key','C','text','Download an unknown app to view it'),JSON_OBJECT('key','D','text','Share it with a dramatic caption')),
   'B',
   'Images, audio, and video can be manipulated. Confirmation from reliable sources helps avoid spreading deepfakes.',
   'intermediate',
   11,
   'published'),
  ((SELECT id FROM assessment_definitions WHERE slug = 'initial-cyber-wellness-v1' AND version = 1),
   'misinformation_and_deepfakes',
   'Which sign can suggest an online image or claim needs extra checking?',
   JSON_ARRAY(JSON_OBJECT('key','A','text','It asks you to check multiple sources'),JSON_OBJECT('key','B','text','It includes a clear official source link'),JSON_OBJECT('key','C','text','It pressures you to share immediately without evidence'),JSON_OBJECT('key','D','text','It corrects an earlier mistake openly')),
   'C',
   'Pressure to share immediately without evidence is a common warning sign of misinformation.',
   'basic',
   12,
   'published');
-- migrate:statement-end
