SET @resource_review_schema = DATABASE();

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'review_status');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN review_status VARCHAR(40) NOT NULL DEFAULT ''draft'' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'reviewed_by');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN reviewed_by INT UNSIGNED NULL AFTER review_status', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'reviewed_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'next_review_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN next_review_at DATETIME NULL AFTER reviewed_at', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'source_type');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN source_type VARCHAR(80) NULL AFTER source_url', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'source_country');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN source_country VARCHAR(80) NULL AFTER source_type', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'source_authority_level');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN source_authority_level VARCHAR(80) NULL AFTER source_country', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'last_source_checked_at');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN last_source_checked_at DATETIME NULL AFTER source_authority_level', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'malaysia_guidance_flag');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN malaysia_guidance_flag TINYINT(1) NOT NULL DEFAULT 0 AFTER last_source_checked_at', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'age_appropriateness');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN age_appropriateness VARCHAR(80) NULL AFTER malaysia_guidance_flag', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'sensitive_topic_flag');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN sensitive_topic_flag TINYINT(1) NOT NULL DEFAULT 0 AFTER age_appropriateness', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'rag_ready');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN rag_ready TINYINT(1) NOT NULL DEFAULT 0 AFTER sensitive_topic_flag', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'rag_ready_reason');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN rag_ready_reason TEXT NULL AFTER rag_ready', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'replacement_source_needed');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN replacement_source_needed TINYINT(1) NOT NULL DEFAULT 0 AFTER rag_ready_reason', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @resource_review_schema AND TABLE_NAME = 'resource_articles' AND COLUMN_NAME = 'review_notes');
SET @sql = IF(@column_exists = 0, 'ALTER TABLE resource_articles ADD COLUMN review_notes TEXT NULL AFTER replacement_source_needed', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded resource currently used for reviewed CyberGuard RAG demos.',
    source_type = 'government_cybersecurity_agency',
    source_country = 'SG',
    source_authority_level = 'official_agency',
    review_notes = 'Seeded MVP resource. Full review workflow will be managed in a later Admin phase.'
WHERE slug = 'phishing';

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded Malaysia scam resource currently used for reviewed CyberGuard RAG demos.',
    source_type = 'government_response_center',
    source_country = 'MY',
    source_authority_level = 'official_national_response',
    malaysia_guidance_flag = 1,
    sensitive_topic_flag = 1,
    review_notes = 'Malaysia-specific scam guidance should receive recurring source review in a later Admin phase.'
WHERE slug = 'online-scams';

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded Malaysia fact-check resource currently used for reviewed CyberGuard RAG demos.',
    source_type = 'government_fact_check_portal',
    source_country = 'MY',
    source_authority_level = 'official_portal',
    review_notes = 'Seeded MVP resource. Source freshness should be checked during future content review.'
WHERE slug = 'misinformation-fake-news';

UPDATE resource_articles
SET review_status = 'needs_review',
    rag_ready = 1,
    rag_ready_reason = 'Kept available for MVP demo continuity, needs stronger source review before broader governance use.',
    source_type = 'government_regulator_page',
    source_country = 'MY',
    source_authority_level = 'official_press_or_media_page',
    sensitive_topic_flag = 1,
    replacement_source_needed = 1,
    review_notes = 'AI-generated content source was flagged for stronger source review in content planning.'
WHERE slug = 'ai-generated-content';

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded international safety resource currently used for CyberGuard RAG demos.',
    source_type = 'international_law_enforcement',
    source_country = 'global',
    source_authority_level = 'recognised_international',
    sensitive_topic_flag = 1,
    review_notes = 'Seeded MVP resource. Malaysia-specific handling should be added through future guidance content.'
WHERE slug = 'deepfakes';

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded Malaysia privacy resource currently used for reviewed CyberGuard RAG demos.',
    source_type = 'government_data_protection_authority',
    source_country = 'MY',
    source_authority_level = 'official_regulator',
    malaysia_guidance_flag = 1,
    sensitive_topic_flag = 1,
    review_notes = 'Malaysia-specific privacy guidance should receive recurring source review in a later Admin phase.'
WHERE slug = 'privacy-personal-data';

UPDATE resource_articles
SET review_status = 'needs_review',
    rag_ready = 1,
    rag_ready_reason = 'Kept available for MVP demo continuity, needs Malaysia safety guidance validation.',
    source_type = 'ngo_child_safety',
    source_country = 'MY',
    source_authority_level = 'recognised_ngo',
    malaysia_guidance_flag = 1,
    sensitive_topic_flag = 1,
    review_notes = 'Cyberbullying support and reporting guidance should be validated against official Malaysia sources.'
WHERE slug = 'cyberbullying';

UPDATE resource_articles
SET review_status = 'approved',
    rag_ready = 1,
    rag_ready_reason = 'MVP seeded cybersecurity agency resource currently used for reviewed CyberGuard RAG demos.',
    source_type = 'government_cybersecurity_agency',
    source_country = 'US',
    source_authority_level = 'official_agency',
    review_notes = 'Seeded MVP resource. Local Malaysia account-safety guidance can be added later.'
WHERE slug = 'password-security';

UPDATE resource_articles
SET review_status = 'needs_review',
    rag_ready = 1,
    rag_ready_reason = 'Kept available for MVP demo continuity, source should be strengthened before broad governance use.',
    source_type = 'education_web',
    source_country = 'global',
    source_authority_level = 'general_web',
    replacement_source_needed = 1,
    review_notes = 'Digital citizenship source was flagged for stronger or more official source review.'
WHERE slug = 'digital-citizenship';
