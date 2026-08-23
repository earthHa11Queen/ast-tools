CREATE VIEW IF NOT EXISTS v_test_spec_validation_ng_case_no_duplicate AS
SELECT
    ts.rowid AS validationRowId,
    ts.*
FROM test_spec ts
INNER JOIN v_test_spec_validation_ng_case_no_duplicate_key ng
    ON ng.CaseNo = ts.CaseNo;
