CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_x AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
LEFT JOIN test_spec_validation_candidates c
    ON  c.targetId = ts.targetId
    AND c.axis = 'X'
    AND c.mirrorId = ts.観点ID_X
WHERE ts.観点ID_X <> '-'
  AND c.targetId IS NULL;
