CREATE TABLE IF NOT EXISTS scenario_definitions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  title VARCHAR(160) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NOT NULL,
  difficulty ENUM('beginner', 'developing', 'intermediate', 'advanced') NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  estimated_minutes INT UNSIGNED NOT NULL,
  total_steps INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scenario_definitions_slug_version (slug, version),
  INDEX idx_scenario_definitions_topic_difficulty (topic_code, difficulty, status),
  CONSTRAINT chk_scenario_definitions_total_steps CHECK (total_steps BETWEEN 3 AND 5)
);

CREATE TABLE IF NOT EXISTS scenario_steps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scenario_id INT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  situation_text VARCHAR(900) NOT NULL,
  prompt_text VARCHAR(500) NOT NULL,
  options_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scenario_steps_scenario_order (scenario_id, step_order),
  CONSTRAINT chk_scenario_steps_order CHECK (step_order BETWEEN 1 AND 5),
  CONSTRAINT fk_scenario_steps_scenario
    FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scenario_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  scenario_id INT UNSIGNED NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
  current_step_order INT UNSIGNED NOT NULL DEFAULT 1,
  total_score INT UNSIGNED NULL,
  maximum_score INT UNSIGNED NULL,
  percentage INT UNSIGNED NULL,
  result_level ENUM('needs_review', 'developing', 'proficient', 'strong') NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scenario_attempts_user_status (user_id, status),
  INDEX idx_scenario_attempts_scenario_status (scenario_id, status),
  CONSTRAINT chk_scenario_attempts_percentage CHECK (percentage IS NULL OR percentage BETWEEN 0 AND 100),
  CONSTRAINT fk_scenario_attempts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_scenario_attempts_scenario
    FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS scenario_decisions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  step_id INT UNSIGNED NOT NULL,
  selected_option_key VARCHAR(10) NOT NULL,
  awarded_score INT UNSIGNED NOT NULL,
  outcome_code VARCHAR(80) NOT NULL,
  answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scenario_decisions_attempt_step (attempt_id, step_id),
  CONSTRAINT fk_scenario_decisions_attempt
    FOREIGN KEY (attempt_id) REFERENCES scenario_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_scenario_decisions_step
    FOREIGN KEY (step_id) REFERENCES scenario_steps(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS scenario_progress_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  scenario_attempt_id INT UNSIGNED NOT NULL,
  topic_code ENUM(
    'phishing_and_scams',
    'password_and_account_security',
    'privacy_and_personal_information',
    'misinformation_and_deepfakes'
  ) NOT NULL,
  mastery_delta INT UNSIGNED NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scenario_progress_events_attempt (scenario_attempt_id),
  INDEX idx_scenario_progress_events_user_topic (user_id, topic_code),
  CONSTRAINT fk_scenario_progress_events_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_scenario_progress_events_attempt
    FOREIGN KEY (scenario_attempt_id) REFERENCES scenario_attempts(id)
    ON DELETE CASCADE
);

INSERT INTO scenario_definitions (slug, title, summary, topic_code, difficulty, version, status, estimated_minutes, total_steps)
VALUES
  ('suspicious-parcel-delivery-sms', 'Suspicious parcel-delivery SMS', 'You receive a parcel SMS that pressures you to pay a small delivery fee before a package can be released.', 'phishing_and_scams', 'beginner', 1, 'published', 4, 3),
  ('fake-ewallet-urgent-message', 'Fake bank or e-wallet urgent message', 'A message claims your e-wallet will be frozen unless you verify your account immediately.', 'phishing_and_scams', 'developing', 1, 'published', 5, 3),
  ('friend-asks-share-otp', 'Friend asks to share an OTP', 'A friend says they are locked out and asks you to send a one-time password from your phone.', 'password_and_account_security', 'beginner', 1, 'published', 4, 3),
  ('same-password-breach-warning', 'Same password reused after a breach warning', 'You hear that one of your reused passwords may have appeared in a breach warning.', 'password_and_account_security', 'developing', 1, 'published', 5, 3),
  ('location-school-uniform-post', 'Social media location and school-uniform post', 'You are about to post a photo that shows your school uniform and a location tag.', 'privacy_and_personal_information', 'beginner', 1, 'published', 4, 3),
  ('mobile-app-excessive-permissions', 'Mobile app requests excessive permissions', 'A fun editing app asks for contacts, location, camera, and microphone access before it will open.', 'privacy_and_personal_information', 'developing', 1, 'published', 5, 3),
  ('viral-emergency-group-chat', 'Viral emergency claim in a group chat', 'A dramatic emergency warning spreads in a class group chat and asks everyone to forward it quickly.', 'misinformation_and_deepfakes', 'beginner', 1, 'published', 4, 3),
  ('ai-celebrity-investment-video', 'AI-generated celebrity investment video', 'A video appears to show a famous person promoting a guaranteed investment scheme.', 'misinformation_and_deepfakes', 'intermediate', 1, 'published', 5, 3)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  summary = VALUES(summary),
  topic_code = VALUES(topic_code),
  difficulty = VALUES(difficulty),
  status = VALUES(status),
  estimated_minutes = VALUES(estimated_minutes),
  total_steps = VALUES(total_steps);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'An SMS says a parcel is waiting and you must pay RM2.30 today. The sender name looks like a delivery company, but the message feels rushed.', 'What should you do first?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Tap the link and enter the requested details quickly.','outcomeCode','opened_pressure_link','score',0,'feedback','That is risky because scam messages often use small fees and urgency to collect card or login details.','safetyExplanation','Open delivery updates from the official courier app or official website, not from an unexpected SMS link.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Ignore the link and check the parcel status through the official courier app or website.','outcomeCode','verified_official_channel','score',2,'feedback','Good choice. You moved the decision to a trusted channel before sharing anything.','safetyExplanation','Official apps and websites reduce the chance of landing on a fake payment page.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Forward the SMS to your family and ask if anyone ordered something.','outcomeCode','forwarded_suspicious_message','score',1,'feedback','Asking can help, but forwarding the suspicious link can spread the risk.','safetyExplanation','If you ask someone, remove the link or describe the message instead.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'suspicious-parcel-delivery-sms' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'The SMS page asks for your full name, card number, and banking OTP to release the parcel.', 'What is the safest response?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Enter the OTP because the amount is small.','outcomeCode','shared_otp','score',0,'feedback','Unsafe. OTPs can approve account access or payments even when the fee looks tiny.','safetyExplanation','Never enter banking OTPs on pages opened from unexpected messages.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Close the page and do not enter any details.','outcomeCode','closed_phishing_page','score',2,'feedback','Correct. Closing the page before entering details protects your account.','safetyExplanation','A request for banking OTP on a delivery-fee page is a major warning sign.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Type only your name but stop before the card details.','outcomeCode','partial_personal_info','score',1,'feedback','Better than entering card details, but personal information can still help scammers target you.','safetyExplanation','When a page feels suspicious, avoid entering any personal information.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'suspicious-parcel-delivery-sms' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'You now think the SMS is a scam. You want to reduce harm for yourself and others.', 'What should you do next?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Delete it silently and move on.','outcomeCode','deleted_only','score',1,'feedback','Deleting protects you, but reporting can help reduce harm for others.','safetyExplanation','Blocking and reporting suspicious messages helps platforms and providers detect abuse.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Report or block the sender and warn family without sharing the link.','outcomeCode','reported_and_warned_safely','score',2,'feedback','Strong response. You protected yourself and warned others safely.','safetyExplanation','Share the warning without the risky link, and use official report/block tools.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Post a screenshot showing the full link so everyone can see it.','outcomeCode','posted_full_link','score',0,'feedback','That can spread the scam link further.','safetyExplanation','If sharing a screenshot, hide links, phone numbers, and personal details.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'suspicious-parcel-delivery-sms' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'A message says your e-wallet will be frozen in 30 minutes unless you verify your account through a provided page.', 'What is the best first move?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Use the link because account freezes are serious.','outcomeCode','used_fake_verification','score',0,'feedback','Urgency is a common scam tactic. The link may be fake even if the message sounds official.','safetyExplanation','Open your bank or e-wallet app directly instead of using links in urgent messages.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Open the official app yourself and check notifications there.','outcomeCode','checked_official_app','score',2,'feedback','Good. You verified through a trusted route.','safetyExplanation','Official apps are safer places to check account alerts and support messages.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Reply to the sender asking if the message is real.','outcomeCode','replied_to_scammer','score',1,'feedback','Asking feels cautious, but replying confirms your number is active.','safetyExplanation','Avoid replying to suspicious senders. Use official support channels.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'fake-ewallet-urgent-message' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'The message asks you to upload your ID photo and enter your wallet PIN.', 'What should you do?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Enter the PIN only, but skip the ID photo.','outcomeCode','entered_pin','score',0,'feedback','A PIN alone can be enough to harm your account.','safetyExplanation','Never enter wallet PINs on pages opened from messages.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Stop and contact official support from inside the app.','outcomeCode','contacted_official_support','score',2,'feedback','Correct. You moved to official support and avoided sharing sensitive data.','safetyExplanation','Official support can confirm whether action is needed without exposing credentials.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Ask a friend whether the page design looks real.','outcomeCode','visual_check_only','score',1,'feedback','A second opinion can help, but fake pages can look convincing.','safetyExplanation','Verification should rely on official channels, not page appearance alone.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'fake-ewallet-urgent-message' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'You did not enter the details. The sender sends another warning with more pressure.', 'What is the safest final action?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Block and report the sender, then keep checking only official channels.','outcomeCode','blocked_reported_checked_official','score',2,'feedback','Strong. You reduced repeated pressure and kept verification official.','safetyExplanation','Scammers often repeat urgent messages. Blocking and reporting helps limit exposure.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Send one final reply saying you know it is fake.','outcomeCode','engaged_sender','score',1,'feedback','It may feel satisfying, but engaging can invite more messages.','safetyExplanation','Blocking is usually safer than arguing with suspicious senders.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Forward it widely so everyone can help check.','outcomeCode','forwarded_scam','score',0,'feedback','Forwarding can spread the scam.','safetyExplanation','Warn others without forwarding the risky message or link.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'fake-ewallet-urgent-message' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'A friend messages you saying they are locked out of an account. A one-time password appears on your phone a few seconds later.', 'What should you do with the OTP?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Send it because the request came from a friend.','outcomeCode','shared_otp_with_friend','score',0,'feedback','Unsafe. The friend account may be compromised, and OTPs are meant only for the account owner.','safetyExplanation','Never share OTPs, even with friends, family, or people claiming to help.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Do not share it, and ask the friend through another trusted channel.','outcomeCode','verified_friend_separately','score',2,'feedback','Correct. You protected the OTP and checked whether the request was real.','safetyExplanation','A separate channel helps confirm whether a message is really from your friend.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Ask why they need it before deciding.','outcomeCode','asked_in_same_chat','score',1,'feedback','Questioning is better than sending it, but the same chat may be controlled by someone else.','safetyExplanation','Verify sensitive requests outside the suspicious conversation.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'friend-asks-share-otp' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'The friend becomes impatient and says they need the code for a school group project.', 'What is the safest reply?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Say you cannot share OTPs and suggest account recovery through the official app.','outcomeCode','refused_and_redirected_recovery','score',2,'feedback','Good. You set a clear boundary and pointed to safer recovery steps.','safetyExplanation','Official recovery flows are safer than borrowing someone else''s OTP.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Send the code but tell them not to use it for anything else.','outcomeCode','sent_with_warning','score',0,'feedback','The warning does not protect the account once the OTP is shared.','safetyExplanation','Anyone with the OTP may complete a login or reset action.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Ignore the message without doing anything else.','outcomeCode','ignored_pressure','score',1,'feedback','Ignoring avoids sharing the OTP, but the real friend may still need help securing their account.','safetyExplanation','A quick separate check can help your friend if their account was taken over.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'friend-asks-share-otp' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'You call your friend and they say they did not send the request. Their account may be compromised.', 'What should you do?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Tell them to change their password and report the suspicious access.','outcomeCode','helped_secure_friend_account','score',2,'feedback','Strong. You helped them move toward recovery without exposing your own account.','safetyExplanation','Password reset, logout of other sessions, and reporting can reduce account takeover damage.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Message the suspicious account to scare the attacker away.','outcomeCode','engaged_compromised_account','score',0,'feedback','Engaging may reveal more information or invite more pressure.','safetyExplanation','Focus on recovery through official controls, not arguing in a compromised chat.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Warn mutual friends not to share codes.','outcomeCode','warned_mutual_friends','score',1,'feedback','Helpful, but your friend also needs account recovery steps.','safetyExplanation','Combine warnings with account recovery and reporting.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'friend-asks-share-otp' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'You hear about a breach warning for a game forum. You used the same password there and on other accounts.', 'What should you do first?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Change the shared password on your most important accounts first.','outcomeCode','changed_important_passwords','score',2,'feedback','Correct. Reused passwords can put several accounts at risk.','safetyExplanation','Start with email, banking, school, and social accounts because they can unlock other services.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Wait to see whether anything bad happens.','outcomeCode','waited_after_breach','score',0,'feedback','Waiting gives attackers more time to try the reused password.','safetyExplanation','A breach warning is a signal to act before damage appears.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Change only the game forum password.','outcomeCode','changed_only_breached_site','score',1,'feedback','That helps one site, but reused passwords can affect other accounts too.','safetyExplanation','Any account using the same password should get a unique replacement.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'same-password-breach-warning' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'You need to make several new passwords and worry you will forget them.', 'Which approach is safest?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Use one slightly changed password for every account.','outcomeCode','pattern_reuse','score',0,'feedback','Small password patterns are often guessed after one password is exposed.','safetyExplanation','Attackers may try common variations across services.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Use unique passwords and store them in a password manager or another safe method approved by a guardian.','outcomeCode','unique_passwords_safe_storage','score',2,'feedback','Good. Unique passwords limit damage from one breached service.','safetyExplanation','A password manager can create and store strong unique passwords.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Write passwords in a notebook kept in your school bag.','outcomeCode','portable_password_notes','score',1,'feedback','Writing can be better than reusing, but a school bag can be lost or seen by others.','safetyExplanation','If passwords are written down, they must be stored privately and securely.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'same-password-breach-warning' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'After changing passwords, the account offers extra login protection.', 'What should you choose?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Turn on multi-factor authentication where available.','outcomeCode','enabled_mfa','score',2,'feedback','Strong. Extra login protection helps even if a password is guessed or exposed.','safetyExplanation','Use app prompts, authenticator apps, or other official methods where available.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Skip it because your new password is enough.','outcomeCode','skipped_mfa','score',1,'feedback','A strong password helps, but extra protection reduces risk further.','safetyExplanation','Multi-factor authentication adds another barrier against account takeover.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Share backup codes in a group chat so you can find them later.','outcomeCode','shared_backup_codes','score',0,'feedback','Backup codes are sensitive and should not be shared.','safetyExplanation','Store backup codes privately. Anyone with them may bypass login protection.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'same-password-breach-warning' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'You want to post a fun photo after school. The photo clearly shows your school uniform and the location tag is on.', 'What should you do before posting?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Post it immediately because only friends follow you.','outcomeCode','posted_location_uniform','score',0,'feedback','Risky. Screenshots and resharing can move posts beyond your friend list.','safetyExplanation','School identifiers and live location can reveal routines and whereabouts.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Remove the location tag and check whether the uniform or school name is visible.','outcomeCode','reduced_identifying_details','score',2,'feedback','Good. You reduced information that could identify your routine.','safetyExplanation','Small details in photos can reveal where you study or spend time.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Keep the photo but add a caption saying not to share it.','outcomeCode','caption_only_privacy','score',1,'feedback','The caption sets a boundary, but it does not remove identifying details.','safetyExplanation','Privacy protection works best before content is posted.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'location-school-uniform-post' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'A person you do not know comments asking which class you are in and when you usually leave school.', 'How should you respond?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Answer politely because the comment seems friendly.','outcomeCode','shared_routine','score',0,'feedback','Unsafe. Friendly questions can still collect private routine details.','safetyExplanation','Avoid sharing class, schedule, route, or exact location with strangers online.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Do not answer, restrict or block the account, and tell a trusted adult if it feels worrying.','outcomeCode','blocked_and_sought_support','score',2,'feedback','Correct. You protected your routine information and escalated if needed.','safetyExplanation','Strangers asking for routine details deserve extra caution.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Reply with a joke but no real details.','outcomeCode','joked_no_details','score',1,'feedback','Not sharing details is good, but continuing the conversation may invite more questions.','safetyExplanation','You do not owe replies to strangers asking personal questions.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'location-school-uniform-post' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'Your friend is also visible in the photo and asks whether you can still post it.', 'What is the best choice?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Post it because it is your account.','outcomeCode','ignored_friend_consent','score',0,'feedback','Posting others without consent can harm their privacy too.','safetyExplanation','Privacy includes respecting other people shown in your content.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Ask for consent and edit or avoid posting if they are not comfortable.','outcomeCode','asked_consent','score',2,'feedback','Strong. You considered both your privacy and your friend''s privacy.','safetyExplanation','Consent and removing identifying details are good digital citizenship habits.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Cover your friend''s face but leave the location tag.','outcomeCode','partial_edit_location_left','score',1,'feedback','Covering a face helps, but location can still reveal sensitive context.','safetyExplanation','Review the whole post, including tags, background, captions, and metadata.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'location-school-uniform-post' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'A popular photo-editing app asks for access to contacts, location, camera, and microphone before you can use a simple filter.', 'What should you do first?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Allow everything so the app works properly.','outcomeCode','allowed_all_permissions','score',0,'feedback','Risky. Apps should only receive permissions needed for the feature you use.','safetyExplanation','Excessive permissions can expose contacts, location, or recordings unnecessarily.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Review why each permission is needed and deny anything unnecessary.','outcomeCode','reviewed_permissions','score',2,'feedback','Good. You checked whether the request matched the app feature.','safetyExplanation','Permission review helps limit how much personal data an app can access.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Allow camera only and decide on the rest later.','outcomeCode','allowed_only_camera','score',1,'feedback','Better than allowing everything, but you should still review the remaining requests.','safetyExplanation','Grant only the permissions needed now, and revisit settings when features change.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'mobile-app-excessive-permissions' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'The app store page has few reviews and several comments say the app sends too many notifications.', 'What is the safest next step?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Install it anyway because the filter is trending.','outcomeCode','installed_despite_reviews','score',0,'feedback','Popularity does not guarantee safety. Warning signs in reviews matter.','safetyExplanation','Reviews, developer reputation, and permission requests all help you judge risk.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Look for a better-known alternative with fewer permissions.','outcomeCode','chose_safer_alternative','score',2,'feedback','Correct. You balanced the benefit with privacy risk.','safetyExplanation','A trusted alternative with limited permissions is usually safer.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Ask friends if the app worked for them.','outcomeCode','asked_friends_app','score',1,'feedback','Asking friends helps, but it does not fully answer privacy concerns.','safetyExplanation','Combine personal recommendations with permission and review checks.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'mobile-app-excessive-permissions' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'You already installed the app earlier and now want to reduce its access.', 'What should you do?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Open device settings and remove permissions the app does not need, or uninstall it.','outcomeCode','reduced_or_removed_permissions','score',2,'feedback','Strong. You can still reduce risk after installation.','safetyExplanation','Permission settings and uninstalling are practical ways to regain control.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Just stop opening the app.','outcomeCode','stopped_opening_app','score',1,'feedback','Using it less may help, but permissions can remain active depending on settings.','safetyExplanation','Review permissions or remove the app if you no longer trust it.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Post your phone number in the app comments asking the developer to fix it.','outcomeCode','shared_phone_publicly','score',0,'feedback','Never post private contact details publicly to solve app issues.','safetyExplanation','Use official support channels without exposing personal information.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'mobile-app-excessive-permissions' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'A class group chat receives a dramatic warning about an emergency near several schools. The message says to forward it to everyone now.', 'What should you do first?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Forward it immediately in case it is true.','outcomeCode','forwarded_unverified_claim','score',0,'feedback','Forwarding unverified warnings can spread panic or misinformation.','safetyExplanation','Urgent forwarding language is a signal to pause and verify.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Pause and check official school, local authority, or trusted news channels.','outcomeCode','checked_trusted_sources','score',2,'feedback','Correct. You verified before amplifying the claim.','safetyExplanation','Use official or reputable sources before sharing emergency claims.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Ask the group who first sent it.','outcomeCode','asked_origin','score',1,'feedback','Finding the source can help, but you still need reliable verification.','safetyExplanation','The first person in your chat may not be the original or accurate source.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'viral-emergency-group-chat' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'You cannot find the claim on official channels, but some friends are getting scared.', 'What is a helpful response?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Say it is definitely fake without checking further.','outcomeCode','declared_fake_too_fast','score',1,'feedback','It may be unverified, but declaring certainty too quickly can also mislead.','safetyExplanation','Use careful wording: not verified yet, check official updates.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Share that it is unverified and suggest waiting for official updates.','outcomeCode','calmed_with_verification_advice','score',2,'feedback','Good. You reduced panic and encouraged verification.','safetyExplanation','Clear calm wording helps a group avoid spreading uncertain claims.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Send it to more groups so someone else can verify.','outcomeCode','crowdsourced_by_forwarding','score',0,'feedback','That spreads the claim before verification.','safetyExplanation','Verification should not require amplifying the message.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'viral-emergency-group-chat' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'Later, the school posts an official update saying there is no confirmed emergency.', 'What should you do in the chat?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Share the official update and ask people not to forward the old warning.','outcomeCode','shared_correction','score',2,'feedback','Strong. Corrections help limit the reach of misinformation.','safetyExplanation','When a claim is corrected, share the correction in the same places where the claim spread.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Say nothing because the panic is over.','outcomeCode','no_correction','score',1,'feedback','The panic may fade, but the old message can keep spreading elsewhere.','safetyExplanation','Corrections are most useful when they reach the same audience.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Mock the person who forwarded it first.','outcomeCode','mocked_sender','score',0,'feedback','Mocking can discourage people from asking questions next time.','safetyExplanation','Correct misinformation respectfully and focus on safer behavior.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'viral-emergency-group-chat' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 1, 'A video in your feed appears to show a famous person promoting a guaranteed investment. The caption says spots are limited.', 'What is your first response?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Sign up quickly before the offer closes.','outcomeCode','joined_investment_pressure','score',0,'feedback','Unsafe. Guaranteed returns and urgency are common scam signals.','safetyExplanation','Investment decisions should never be rushed from a social video.','nextStepOrder',2),
  JSON_OBJECT('key','B','text','Pause and look for the claim on official channels and reputable sources.','outcomeCode','verified_celebrity_claim','score',2,'feedback','Good. You did not treat the video as proof by itself.','safetyExplanation','Deepfakes and edited clips can make people appear to say things they never said.','nextStepOrder',2),
  JSON_OBJECT('key','C','text','Read comments to see whether people are excited.','outcomeCode','relied_on_comments','score',1,'feedback','Comments can provide clues, but they can also be fake or coordinated.','safetyExplanation','Use stronger verification than comment sentiment.','nextStepOrder',2)
) FROM scenario_definitions WHERE slug = 'ai-celebrity-investment-video' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 2, 'The video has strange mouth movement and the audio sounds slightly robotic. A page asks for a deposit to start.', 'What should you do?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Treat the visual glitches as a warning and do not pay.','outcomeCode','noticed_deepfake_signs','score',2,'feedback','Correct. Visual and audio mismatches are useful warning signs.','safetyExplanation','Deepfake clues include odd lip sync, unnatural voice, and pressure to pay.','nextStepOrder',3),
  JSON_OBJECT('key','B','text','Pay a small amount only to test whether it works.','outcomeCode','paid_test_deposit','score',0,'feedback','Even small deposits can lead to more pressure or loss.','safetyExplanation','Do not test suspicious investment pages with money or personal details.','nextStepOrder',3),
  JSON_OBJECT('key','C','text','Save the video and ask a trusted adult before doing anything.','outcomeCode','asked_trusted_adult','score',1,'feedback','Asking a trusted adult is helpful, and you should also avoid payment while verifying.','safetyExplanation','For money-related claims, pause and get reliable advice before acting.','nextStepOrder',3)
) FROM scenario_definitions WHERE slug = 'ai-celebrity-investment-video' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);

INSERT INTO scenario_steps (scenario_id, step_order, situation_text, prompt_text, options_json)
SELECT id, 3, 'You want to warn classmates because some are sharing the video.', 'What is the safest way?', JSON_ARRAY(
  JSON_OBJECT('key','A','text','Share the video again with a warning caption.','outcomeCode','reshared_scam_video','score',0,'feedback','Resharing can still boost the scam video.','safetyExplanation','Avoid increasing reach for suspicious content, even with a warning.','nextStepOrder',null),
  JSON_OBJECT('key','B','text','Explain the warning signs and suggest reporting the post without reposting it.','outcomeCode','explained_and_reported','score',2,'feedback','Strong. You helped others recognize the risk without amplifying it.','safetyExplanation','Reporting and describing warning signs is safer than reposting suspicious media.','nextStepOrder',null),
  JSON_OBJECT('key','C','text','Tell classmates only that it might be fake.','outcomeCode','vague_warning','score',1,'feedback','A warning helps, but clear signs and reporting steps are more useful.','safetyExplanation','Specific guidance helps people decide what to do next.','nextStepOrder',null)
) FROM scenario_definitions WHERE slug = 'ai-celebrity-investment-video' AND version = 1
ON DUPLICATE KEY UPDATE situation_text = VALUES(situation_text), prompt_text = VALUES(prompt_text), options_json = VALUES(options_json);
