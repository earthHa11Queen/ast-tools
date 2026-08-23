CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_case_duplicate AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
INNER JOIN v_test_spec_validation_ng_case_duplicate_key ng
    ON ng.targetId = ts.targetId
   AND ng."観点ID_X" = ts."観点ID_X"
   AND ng."観点ID_Y" = ts."観点ID_Y"
   AND ng."観点ID_Z" = ts."観点ID_Z";
