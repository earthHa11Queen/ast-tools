CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_case_no_duplicate_key AS
SELECT
    CaseNo,
    COUNT(*) AS duplicateCount
FROM test_spec
GROUP BY CaseNo
HAVING COUNT(*) > 1;
