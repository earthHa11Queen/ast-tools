CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_generator_target AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
WHERE COALESCE(ts.generatorTarget, '') <> COALESCE(ts.targetId, '');
