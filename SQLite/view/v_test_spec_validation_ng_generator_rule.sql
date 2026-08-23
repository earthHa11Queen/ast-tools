CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_generator_rule AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
WHERE COALESCE(ts.generatorRule, '') <>
      'X=' || COALESCE(ts."観点ID_X", '') ||
      '|Y=' || COALESCE(ts."観点ID_Y", '') ||
      '|Z=' || COALESCE(ts."観点ID_Z", '');
