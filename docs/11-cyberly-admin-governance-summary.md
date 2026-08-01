# Cyberly Admin Governance and Resource Review Metadata Summary

## 1. Purpose of Admin Governance in Cyberly

The Cyberly Admin module is not intended to be only a generic user-management dashboard. Its main purpose is to provide a governance layer for the learning and AI ecosystem that supports CyberGuard.

Admin governance covers:

- content governance
- source metadata governance
- RAG governance
- Malaysia guidance governance
- AI safety governance
- Agentic AI learning-route governance

In Cyberly, Admin acts as the human review layer between “content exists” and “CyberGuard can confidently use this content.” A Resource may be published for learners to read, but future governance should still decide whether that Resource is reviewed, source-stable, appropriate for teenagers, Malaysia-relevant, and safe to use as RAG grounding or as a strong learning-route recommendation.

## 2. Why Admin Is Needed

CyberGuard now uses RAG grounding from Resource content. This means the quality of CyberGuard’s answers depends partly on the quality, freshness, and authority of the sources behind those Resources. If a Resource has an outdated source, unclear organisation, weak evidence, or sensitive Malaysia-specific reporting guidance, the AI answer may become less trustworthy even if the model behaves correctly.

Admin is also needed because Agentic AI learning routes should prefer reviewed content. If CyberGuard suggests a Resource or Scenario as a next step, the system should eventually know whether that content has been reviewed, whether the source is reliable, and whether it is appropriate for the learner’s context.

Malaysia-specific guidance needs extra care. Reporting channels, local laws, scam response advice, cyberbullying support, privacy guidance, and safety escalation instructions should not be invented by AI. They should come from reviewed official or trusted sources, with review dates and source validation.

## 3. Phase 9A Admin Planning Summary

Phase 9A defined Admin as a governance system for Cyberly’s learning content and AI safety, not as a broad learner surveillance tool.

Recommended future roles include:

- System Admin: manages platform-level access and configuration.
- Content Reviewer: reviews Resource, FAQ, and Safety Summary content.
- Educator Reviewer: checks age appropriateness, learning value, and sequencing.
- Safety Reviewer: reviews sensitive topics, AI safety cases, and Malaysia guidance.
- Moderator: supports limited operational review without access to secrets or raw learner data.

Recommended future modules include:

- Admin Dashboard
- Resource Management
- FAQ and Safety Summary Management
- Scenario Management
- Content Relationship Management
- RAG Knowledge Management
- Malaysia Guidance Management
- AI Safety and Evaluation Review
- User and Role Management

The key planning decision was that published content should not automatically mean RAG-ready content. RAG readiness, source quality, and sensitive guidance require their own governance process.

## 4. Phase 9B Admin Access Foundation Summary

Phase 9B implemented the protected Admin foundation.

Implemented backend support:

- protected `GET /api/admin/status`
- authenticated admin-only access
- server-side role checking
- rejection of unauthenticated users
- rejection of authenticated non-admin users

Implemented frontend support:

- protected Admin Console at `#/admin`
- admin-only navigation
- non-admin access denied state
- admin status card
- placeholder module cards for future governance areas:
  - Resource Review
  - RAG Knowledge
  - Content Relationships
  - Malaysia Guidance
  - AI Safety Evaluation
  - Role Management

Phase 9B intentionally did not add schema changes, editing features, learner surveillance, or score editing.

## 5. Phase 9C Resource Review Metadata MVP Summary

Phase 9C added the Resource Review Metadata MVP.

Implemented backend and database foundation:

- migration `022_add_resource_review_metadata.sql`
- Resource review metadata columns added to `resource_articles`
- protected `GET /api/admin/resources/review`
- safe Resource review summary response for admins only

Implemented frontend foundation:

- read-only Resource Review Metadata section in the Admin Console
- safe summary counts
- read-only list of current Resources and review/source metadata status

No edit forms, RAG-ready toggles, publish/archive controls, Resource creation, or review workflow were added in Phase 9C.

### Metadata Fields

- `review_status`: review state for the Resource, such as approved or needs review.
- `rag_ready`: whether the Resource is currently considered available for RAG use.
- `reviewed_by`: future reviewer user ID, nullable.
- `reviewed_at`: when the Resource was reviewed, nullable.
- `next_review_at`: when the Resource should be reviewed again, nullable.
- `source_type`: broad type of source, such as government agency, NGO, education site, or general web.
- `source_country`: source country or scope, such as MY, SG, US, or global.
- `source_authority_level`: broad authority classification for the source.
- `last_source_checked_at`: when the source URL or source metadata was last checked, nullable.
- `malaysia_guidance_flag`: marks content that includes Malaysia-specific guidance or local reporting/safety claims.
- `age_appropriateness`: future field for age suitability review.
- `sensitive_topic_flag`: marks content involving sensitive or higher-risk topics.
- `rag_ready_reason`: explanation for why the Resource is or is not suitable for RAG use.
- `replacement_source_needed`: marks Resources that may need a stronger or more stable source.
- `review_notes`: reviewer notes or planning notes.

## 6. Current Admin Console Behavior

The current Admin Console shows:

- Admin access verified
- role: admin
- planned governance modules
- Resource Review Metadata section
- total Resources
- needs review count
- RAG-ready count
- source replacement needed count
- Malaysia guidance flagged count
- read-only list of current Resources and metadata status

This is a governance visibility foundation. It helps supervisors and developers see which Resources need review attention, but it is not full content management yet.

## 7. Current Resource Review Status Interpretation

The Resource Review Metadata counts should be interpreted cautiously:

- Total resources: the current seeded Resource count in the database.
- Needs review: Resources that require source or content review before stronger governance claims are made.
- RAG-ready: Resources currently allowed for MVP RAG continuity.
- Source replacement needed: Resources that may need a stronger, more official, or more stable source.
- Malaysia guidance flagged: Resources involving Malaysia-specific guidance, reporting advice, or local safety claims.

The current MVP preserves seeded Resources for demo continuity while adding metadata that prepares the project for stricter governance later.

## 8. Treatment of Previously Planned Workbook Content

The workbook content from `02_Content_Inventory`, `03_Content_Relationships`, and `08_Content_Category_Plan` is not automatically imported into live website content.

The workbook is currently used for:

- planning taxonomy
- identifying content gaps
- planning content relationships
- preparing future governance workflows
- informing future Admin design

Selected workbook content should only become live Resource, FAQ, Safety Summary, or Scenario content after review. A future Admin workflow should support this gradual conversion from planning material into reviewed platform content.

## 9. Why 9C Matters for RAG

RAG source quality affects CyberGuard answer trustworthiness. If a RAG answer is grounded in weak, outdated, or unclear content, the citation display may look credible while still depending on poor source material.

Resource review metadata helps by making source quality visible. It prepares the project to distinguish between content that is merely published and content that has been approved for RAG grounding. This is especially important for cybersecurity guidance, Malaysia-specific response information, and sensitive topics.

The current MVP keeps seeded Resources RAG-available for continuity, while review metadata prepares the system for stricter future rules where unreviewed content may be excluded from RAG.

## 10. Why 9C Matters for Agentic AI

Agentic AI learning routes depend on trustworthy content. If CyberGuard suggests a Resource or Scenario as the next step, that recommendation is stronger when the content has been reviewed, source-stable, and aligned with the learner’s level.

Future learning routes should prefer reviewed content. Sensitive routes should include reviewed safety summaries and trusted support guidance. Unreviewed content should not become a strong next-step recommendation without human review.

Phase 9C provides the metadata foundation that future Agentic AI planning can use when ranking or filtering content.

## 11. Security and Access Control

Current Admin access follows these rules:

- Admin API endpoints require an authenticated session.
- Admin role is checked server-side.
- Client-provided role spoofing should not grant access.
- Normal users cannot see Admin navigation.
- Normal users manually opening `#/admin` should see access denied.
- Admin responses do not return secrets, prompts, API keys, password hashes, session data, or learner private data.
- No direct score editing exists.
- No direct database console exists.

This keeps the Admin foundation narrow and safer while future governance tools are planned.

## 12. Current Limitations

Current limitations include:

- no Resource editor
- no review assignment workflow
- no RAG-ready toggle UI
- no publish/archive buttons
- no audit logs yet
- no FAQ or Safety Summary tables yet
- no Malaysia Guidance Management yet
- no AI Safety Evaluation Panel yet
- no Content Relationship Editor yet
- no workbook import workflow
- no Resource completion tracking yet

## 13. Future Roadmap

### Phase 9D Resource Review Workflow MVP

- update `review_status`
- update `review_notes`
- update `replacement_source_needed`
- update `rag_ready_reason`
- keep changes audited if an audit foundation exists

### Phase 9E Resource Management MVP

- Resource editor
- translation management
- source metadata management
- publish/archive workflow

### Phase 9F RAG Knowledge Management

- ingestion run visibility
- chunk preview
- retrieval testing
- RAG-ready governance

### Phase 9G Content Relationship Management

- prerequisite
- next_step
- practice_after
- remedial
- related_topic

### Phase 9H AI Safety Evaluation Panel

- safe and unsafe prompt sets
- model/prompt version tracking
- false positive and false negative review

### Phase 9I Malaysia Guidance Management

- official source-backed local guidance
- review dates
- reporting guidance validation

### Phase 9J Audit and Role Hardening

- `admin_audit_logs`
- stronger least-privilege roles
- review/publish approval trail

## 14. Report-Ready Summary

Cyberly’s Admin governance layer is necessary because the platform now includes AI-powered learning support, RAG grounding, and Agentic AI learning-route planning. In this type of system, content quality directly affects the quality and trustworthiness of AI output. Admin governance provides the human review process needed to decide which content is source-stable, age-appropriate, Malaysia-relevant, and safe for CyberGuard to use.

Phase 9C improves trustworthiness by adding Resource review metadata. This allows Cyberly to distinguish between published content, reviewed content, RAG-ready content, content needing stronger sources, and Malaysia guidance-sensitive content. These metadata fields prepare the system for stricter RAG governance, better citations, and safer Agentic AI learning routes.

The current Admin implementation is intentionally read-only and governance-focused. It gives administrators visibility into content review status without introducing risky editing tools, score editing, RAG toggles, or content publishing workflows too early. This staged approach supports Capstone demo clarity while preserving safety, auditability, and future scalability.
