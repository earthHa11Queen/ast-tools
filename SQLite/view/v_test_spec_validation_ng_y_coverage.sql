CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_y_coverage AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
JOIN (
    SELECT DISTINCT
        targetId
    FROM v_test_spec_validation_ng_y_coverage_target
) ng
    ON ng.targetId = ts.targetId;
