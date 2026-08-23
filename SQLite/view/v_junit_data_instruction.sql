CREATE VIEW IF NOT EXISTS v_junit_data_instruction AS
SELECT
    CaseNo,
    dataId,
    targetId,
    dataRole,
    convModel,
    mirrorX,
    mirrorY,
    mirrorZ,
    validationMin,
    validationMax,
    nullable,
    referenceType,
    fixedValue,
    referenceValues
FROM v_junit_data_instruction_expand
UNION ALL
SELECT
    CaseNo,
    dataId,
    targetId,
    dataRole,
    convModel,
    mirrorX,
    mirrorY,
    mirrorZ,
    validationMin,
    validationMax,
    nullable,
    referenceType,
    fixedValue,
    referenceValues
FROM v_junit_data_instruction_direct;