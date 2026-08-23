CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_y_coverage_target AS
SELECT
    c.targetId,
    c.mirrorId AS missingMirrorId
FROM test_spec_validation_candidates c
LEFT JOIN test_spec ts
    ON  ts.targetId = c.targetId
    AND ts.観点ID_Y = c.mirrorId
WHERE c.axis = 'Y'
  AND ts.rowid IS NULL;
