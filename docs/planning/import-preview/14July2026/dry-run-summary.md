# Dry-Run Import Summary

This is a read-only planning output. It does not import content, publish content, enable RAG, or modify the database.

## Candidate Counts
- Total candidates: 56
- By content type: `{"faq": 28, "resource": 14, "safety_summary": 7, "scenario": 7}`
- By disposition: `{"create_candidate": 18, "possible_duplicate": 2, "skip_exact_duplicate": 1, "unsupported_live_type": 35}`

## Import Recommendation
- Future create candidates: 18
- Future update candidates: 0
- Exact duplicates to skip: 1
- Manual mapping required: 0
- Schema/Admin module required: 35

## What Must Not Be Imported Yet
- FAQ and Safety Summary rows require live schema/Admin module support before import.
- Scenario rows require detailed step/option modelling before import.
- Workbook governance flags are planning metadata only; every proposed import default remains Draft/Draft/RAG-disabled.
