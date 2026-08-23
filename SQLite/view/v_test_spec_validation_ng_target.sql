CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_target AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
LEFT JOIN test_spec_validation_targets t
    ON t.targetId = ts.targetId
WHERE t.targetId IS NULL;
