import json
import tempfile
import unittest
from pathlib import Path

from scripts.planning import workbook_import_preview as preview
from scripts.planning import workbook_import_audit as audit


class TaxonomyMappingTests(unittest.TestCase):
    def test_maps_exact_main_category(self):
        result = preview.map_topic("Scams & Social Engineering")
        self.assertEqual(result["mapped_category"], "Scams & Social Engineering")
        self.assertEqual(result["live_category_code"], "Scams")
        self.assertEqual(result["mapping_method"], "exact_category")
        self.assertEqual(result["confidence"], "high")

    def test_maps_old_topic_alias_with_normalized_spacing(self):
        result = preview.map_topic("  password   safety ")
        self.assertEqual(result["mapped_category"], "Passwords & Account Security")
        self.assertEqual(result["live_category_code"], "Passwords")
        self.assertEqual(result["mapping_method"], "alias_exact")

    def test_unresolved_topic_requires_manual_mapping(self):
        result = preview.map_topic("Unknown workbook topic")
        self.assertEqual(result["mapping_method"], "unresolved")
        self.assertEqual(result["confidence"], "manual_review_required")

    def test_subcategory_exact_mapping_preserves_subcategory(self):
        result = preview.map_topic("QR Code Scams")
        self.assertEqual(result["mapped_category"], "Scams & Social Engineering")
        self.assertEqual(result["proposed_subcategory"], "QR Code Scams")
        self.assertEqual(result["mapping_method"], "subcategory_exact")


class ContentTypeTests(unittest.TestCase):
    def test_normalizes_supported_types(self):
        self.assertEqual(preview.normalize_content_type("Resources"), "resource")
        self.assertEqual(preview.normalize_content_type("Scenario"), "scenario")
        self.assertEqual(preview.normalize_content_type("FAQs"), "faq")
        self.assertEqual(preview.normalize_content_type("Safety Summaries"), "safety_summary")

    def test_unsupported_type_is_not_silently_converted(self):
        self.assertEqual(preview.normalize_content_type("Assessment"), "unsupported_content_type")


class SlugTests(unittest.TestCase):
    def test_generates_ascii_slug_from_english_title(self):
        self.assertEqual(preview.slugify("Spot a Suspicious Link!"), "spot-a-suspicious-link")

    def test_manual_slug_required_for_non_english_without_english_title(self):
        self.assertEqual(preview.slugify("网络钓鱼"), "")

    def test_slug_collision_is_reported(self):
        collisions = preview.find_slug_collisions(
            [
                {"dryRunId": "a", "proposedSlug": "phishing"},
                {"dryRunId": "b", "proposedSlug": "phishing"},
            ],
            [{"slug": "phishing", "id": 7}],
        )
        self.assertEqual(len(collisions), 2)


class DuplicateDetectionTests(unittest.TestCase):
    def test_exact_slug_match_to_live_resource(self):
        candidate = {
            "dryRunId": "workbook:02_Content_Inventory:5",
            "normalized": {"contentType": "resource", "title": "Phishing"},
            "taxonomyMapping": {"live_category_code": "Scams"},
            "proposedSlug": "phishing",
            "sourceMetadata": {},
        }
        matches = preview.detect_live_duplicates(candidate, {"resources": [{"id": 1, "slug": "phishing", "title": "Phishing", "category_code": "Scams"}]})
        self.assertEqual(matches[0]["matchType"], "exact")
        self.assertIn("slug", matches[0]["reason"])

    def test_fuzzy_title_is_possible_duplicate_only(self):
        candidate = {
            "dryRunId": "row",
            "normalized": {"contentType": "resource", "title": "How to spot suspicious links"},
            "taxonomyMapping": {"live_category_code": "Scams"},
            "proposedSlug": "how-to-spot-suspicious-links",
            "sourceMetadata": {},
        }
        matches = preview.detect_live_duplicates(candidate, {"resources": [{"id": 1, "slug": "suspicious-links", "title": "How to spot a suspicious link", "category_code": "Scams"}]})
        self.assertTrue(any(match["matchType"] == "possible" for match in matches))

    def test_unrelated_candidate_has_no_duplicate(self):
        candidate = {
            "dryRunId": "row",
            "normalized": {"contentType": "resource", "title": "Password Managers"},
            "taxonomyMapping": {"live_category_code": "Passwords"},
            "proposedSlug": "password-managers",
            "sourceMetadata": {},
        }
        matches = preview.detect_live_duplicates(candidate, {"resources": [{"id": 1, "slug": "phishing", "title": "Phishing", "category_code": "Scams"}]})
        self.assertEqual(matches, [])


class ValidationTests(unittest.TestCase):
    def test_resource_missing_title_and_body(self):
        issues = preview.validate_candidate({"normalized": {"contentType": "resource", "title": "", "summary": "short", "body": ""}, "sourceMetadata": {"sourceUrl": "https://example.com"}})
        fields = {issue["field"] for issue in issues}
        self.assertIn("title", fields)
        self.assertIn("body", fields)

    def test_resource_malformed_source_url(self):
        issues = preview.validate_candidate({"normalized": {"contentType": "resource", "title": "A", "summary": "B", "body": "C"}, "sourceMetadata": {"sourceUrl": "not a url"}})
        self.assertTrue(any(issue["issue_code"] == "malformed_source_url" for issue in issues))

    def test_faq_missing_answer(self):
        issues = preview.validate_candidate({"normalized": {"contentType": "faq", "title": "What?", "body": ""}, "sourceMetadata": {}})
        self.assertTrue(any(issue["field"] == "answer" for issue in issues))

    def test_incomplete_scenario_structure(self):
        issues = preview.validate_candidate({"normalized": {"contentType": "scenario", "title": "Scenario", "summary": "Summary"}, "scenarioStructure": {"steps": 0, "options": 0}, "sourceMetadata": {}})
        codes = {issue["issue_code"] for issue in issues}
        self.assertIn("missing_scenario_steps", codes)
        self.assertIn("missing_scenario_options", codes)


class RelationshipResolutionTests(unittest.TestCase):
    def test_resolves_by_exact_id(self):
        index = preview.build_candidate_index([
            {"dryRunId": "row-1", "original": {"contentId": "RES-1", "title": "Title"}, "normalized": {"title": "Title"}, "proposedSlug": "title"}
        ])
        result = preview.resolve_relationship_endpoint("RES-1", index)
        self.assertEqual(result["status"], "resolved")
        self.assertEqual(result["method"], "content_id")

    def test_resolves_by_exact_title(self):
        index = preview.build_candidate_index([
            {"dryRunId": "row-1", "original": {"contentId": "RES-1", "title": "Unique Title"}, "normalized": {"title": "Unique Title"}, "proposedSlug": "unique-title"}
        ])
        result = preview.resolve_relationship_endpoint("Unique Title", index)
        self.assertEqual(result["status"], "resolved")
        self.assertEqual(result["method"], "title")

    def test_unresolved_and_ambiguous_targets(self):
        ambiguous_index = preview.build_candidate_index([
            {"dryRunId": "a", "original": {"contentId": "A", "title": "Same"}, "normalized": {"title": "Same"}, "proposedSlug": "same-a"},
            {"dryRunId": "b", "original": {"contentId": "B", "title": "Same"}, "normalized": {"title": "Same"}, "proposedSlug": "same-b"},
        ])
        self.assertEqual(preview.resolve_relationship_endpoint("Missing", ambiguous_index)["status"], "unresolved")
        self.assertEqual(preview.resolve_relationship_endpoint("Same", ambiguous_index)["status"], "ambiguous")


class SafetyTests(unittest.TestCase):
    def test_output_writer_excludes_secret_like_keys(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "manifest.json"
            preview.write_json_safe(path, {"ok": True, "password": "secret"})
            payload = json.loads(path.read_text(encoding="utf-8"))
            self.assertNotIn("password", payload)


class AuditClassificationTests(unittest.TestCase):
    def item(self, content_type="resource", body="", issues=None, duplicate_matches=None, live_support="live_supported"):
        return {
            "dryRunId": "workbook:02_Content_Inventory:5",
            "normalized": {
                "contentType": content_type,
                "title": "Title",
                "summary": "Summary",
                "body": body,
            },
            "taxonomyMapping": {"mapping_method": "alias_exact", "live_category_code": "Scams"},
            "validation": {"issues": issues or []},
            "duplicateMatches": duplicate_matches or [],
            "liveSupport": live_support,
            "proposedSlug": "title",
            "scenarioStructure": {"steps": 0, "options": 0},
        }

    def test_missing_body_prevents_resource_create_candidate(self):
        item = self.item(issues=[{"severity": "warning", "issue_code": "missing_body", "field": "body"}])
        audit.apply_audit_classification(item)
        self.assertEqual(item["contentCompleteness"], "content_brief")
        self.assertEqual(item["disposition"], "missing_required_fields")
        self.assertEqual(item["importReadiness"], "blocked_missing_content")

    def test_missing_scenario_steps_and_options_prevent_create_candidate(self):
        item = self.item(content_type="scenario", issues=[
            {"severity": "warning", "issue_code": "missing_scenario_steps", "field": "scenario_steps"},
            {"severity": "warning", "issue_code": "missing_scenario_options", "field": "scenario_options"},
        ])
        audit.apply_audit_classification(item)
        self.assertEqual(item["contentCompleteness"], "content_brief")
        self.assertEqual(item["disposition"], "missing_required_fields")
        self.assertEqual(item["importReadiness"], "blocked_missing_content")

    def test_faq_without_answer_is_not_import_ready(self):
        item = self.item(content_type="faq", live_support="planning_only", issues=[{"severity": "error", "issue_code": "missing_faq_answer", "field": "answer"}])
        audit.apply_audit_classification(item)
        self.assertEqual(item["contentCompleteness"], "content_brief")
        self.assertEqual(item["importReadiness"], "planning_only")

    def test_unsupported_live_type_and_completeness_remain_separate(self):
        item = self.item(content_type="safety_summary", body="Full guidance", live_support="planning_only")
        audit.apply_audit_classification(item)
        self.assertEqual(item["contentCompleteness"], "full_content")
        self.assertEqual(item["disposition"], "unsupported_live_type")
        self.assertEqual(item["importReadiness"], "blocked_unsupported_schema")

    def test_duplicate_free_but_incomplete_content_is_not_create_candidate(self):
        item = self.item(issues=[{"severity": "warning", "issue_code": "missing_body", "field": "body"}])
        audit.apply_audit_classification(item)
        self.assertNotEqual(item["disposition"], "create_candidate")

    def test_exact_duplicate_match_is_retained_even_when_validation_blocks_import(self):
        match = {"matchType": "exact", "recommendedDisposition": "skip_exact_duplicate"}
        item = self.item(issues=[{"severity": "warning", "issue_code": "missing_body", "field": "body"}], duplicate_matches=[match])
        audit.apply_audit_classification(item)
        self.assertEqual(item["disposition"], "missing_required_fields")
        self.assertEqual(item["duplicateMatches"], [match])

    def test_possible_duplicate_match_is_retained_independently(self):
        match = {"matchType": "possible", "recommendedDisposition": "possible_duplicate"}
        item = self.item(body="Body", duplicate_matches=[match])
        audit.apply_audit_classification(item)
        self.assertEqual(item["disposition"], "possible_duplicate")
        self.assertEqual(item["importReadiness"], "blocked_duplicate_review")

    def test_declared_locales_do_not_imply_actual_localized_content(self):
        item = self.item()
        item["original"] = {"title_en": "Title", "summary_en": "Summary", "title_ms": "", "summary_ms": "", "title_zh": "", "summary_zh": ""}
        audit.apply_locale_audit(item)
        self.assertEqual(item["declaredLocaleCoverage"], ["en", "ms", "zh-CN"])
        self.assertEqual(item["actualLocaleContent"]["en"], "partial")
        self.assertEqual(item["actualLocaleContent"]["ms"], "missing")
        self.assertEqual(item["actualLocaleContent"]["zh-CN"], "missing")

    def test_actual_locale_completeness_checks_meaningful_fields(self):
        item = self.item(body="Body")
        item["original"] = {"title_en": "Title", "summary_en": "Summary", "body_en": "Body"}
        audit.apply_locale_audit(item)
        self.assertEqual(item["actualLocaleContent"]["en"], "complete")

    def test_content_brief_and_full_content_classification(self):
        brief = self.item()
        full = self.item(body="Body")
        self.assertEqual(audit.classify_content_completeness(brief)[0], "content_brief")
        self.assertEqual(audit.classify_content_completeness(full)[0], "full_content")

    def test_disposition_precedence_is_deterministic(self):
        item = self.item(
            live_support="planning_only",
            issues=[{"severity": "error", "issue_code": "unmapped_topic", "field": "topic"}],
            duplicate_matches=[{"matchType": "exact", "recommendedDisposition": "skip_exact_duplicate"}],
        )
        item["taxonomyMapping"]["mapping_method"] = "unresolved"
        audit.apply_audit_classification(item)
        self.assertEqual(item["disposition"], "needs_manual_mapping")

    def test_import_readiness_is_deterministic(self):
        item = self.item(body="Body")
        audit.apply_audit_classification(item)
        self.assertEqual(item["importReadiness"], "ready_for_draft_import")

    def test_relationship_exact_id_method_is_reported(self):
        row = {"originalRelationshipId": "REL-1", "sourceReference": "RES-1", "targetReference": "FAQ-1", "relationshipType": "next_step"}
        result = audit.audit_relationship_resolution(row, {"source": {"status": "resolved", "method": "content_id", "dryRunId": "a"}, "target": {"status": "resolved", "method": "content_id", "dryRunId": "b"}})
        self.assertEqual(result["source_resolution_method"], "exact_content_id")
        self.assertEqual(result["confidence"], "high")

    def test_fuzzy_relationship_is_review_required(self):
        row = {"originalRelationshipId": "REL-1", "sourceReference": "Title", "targetReference": "Other", "relationshipType": "next_step"}
        result = audit.audit_relationship_resolution(row, {"source": {"status": "resolved", "method": "fuzzy_title", "dryRunId": "a"}, "target": {"status": "resolved", "method": "title", "dryRunId": "b"}})
        self.assertEqual(result["source_resolution_method"], "fuzzy_title")
        self.assertEqual(result["review_required"], "yes")

    def test_duplicate_signals_and_duplicate_records_are_counted_separately(self):
        items = [
            {"dryRunId": "a", "duplicateMatches": [{"matchType": "exact"}, {"matchType": "exact"}]},
            {"dryRunId": "b", "duplicateMatches": [{"matchType": "possible"}]},
        ]
        counts = audit.count_duplicate_records(items)
        self.assertEqual(counts["duplicateSignals"], 3)
        self.assertEqual(counts["duplicateRecords"], 2)

    def test_original_dry_run_id_is_preserved(self):
        item = self.item()
        audit.apply_audit_classification(item)
        self.assertEqual(item["dryRunId"], "workbook:02_Content_Inventory:5")

    def test_original_phase_outputs_are_not_overwritten(self):
        self.assertTrue(audit.is_audit_output_path(Path("docs/planning/import-preview/14July2026-audit")))
        self.assertFalse(audit.is_audit_output_path(Path("docs/planning/import-preview/14July2026")))

    def test_hash_comparison_detects_unchanged_file(self):
        with tempfile.NamedTemporaryFile(delete=False) as handle:
            handle.write(b"same")
            temp_path = Path(handle.name)
        try:
            before = audit.file_identity(temp_path)
            after = audit.file_identity(temp_path)
            self.assertEqual(before["sha256"], after["sha256"])
        finally:
            temp_path.unlink(missing_ok=True)

    def test_catalogue_counts_unchanged(self):
        catalog = {"database": {"countsBefore": {"a": 1}, "countsAfter": {"a": 1}, "unchanged": True}}
        audit.assert_catalogue_read_only(catalog)

    def test_audit_output_contains_no_secrets(self):
        payload = audit.sanitize_audit_payload({"apiKey": "secret", "safe": {"token": "x", "value": 1}})
        self.assertNotIn("apiKey", payload)
        self.assertEqual(payload["safe"], {"value": 1})


if __name__ == "__main__":
    unittest.main()
