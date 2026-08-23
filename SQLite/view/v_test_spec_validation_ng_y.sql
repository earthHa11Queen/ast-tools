CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_y AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
LEFT JOIN test_spec_validation_candidates c
    ON  c.targetId = ts.targetId
    AND c.axis = 'Y'
    AND c.mirrorId = ts.観点ID_Y
WHERE ts.観点ID_Y <> '-'
  AND c.targetId IS NULL;
