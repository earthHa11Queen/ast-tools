CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_case_duplicate_key AS
SELECT
    targetId,
    "観点ID_X",
    "観点ID_Y",
    "観点ID_Z",
    COUNT(*) AS duplicateCount
FROM test_spec
GROUP BY
    targetId,
    "観点ID_X",
    "観点ID_Y",
    "観点ID_Z"
HAVING COUNT(*) > 1;
