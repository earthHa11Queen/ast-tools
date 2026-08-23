CREATE VIEW IF NOT EXISTS v_junit_data_instruction_direct AS
WITH enum_values AS (
    SELECT enumName,GROUP_CONCAT(enumValue,' / ') AS referenceValues
    FROM (
        SELECT enumName,enumValue
        FROM enum_data
        ORDER BY enumName,enumIndex
    )
    GROUP BY enumName
)
SELECT
    ts.CaseNo,
    a.argName AS dataId,
    ts.targetId,
    CASE
        WHEN ai.targetKind='ARG'
         AND ai.argIndex=a.argIndex
         AND ai.argName=a.argName
        THEN 'TARGET'
        ELSE 'NORMAL'
    END AS dataRole,
    CASE WHEN ev.enumName IS NOT NULL THEN 'ENUM' ELSE a.convModel END AS convModel,
    CASE
        WHEN ai.targetKind='ARG'
         AND ai.argIndex=a.argIndex
         AND ai.argName=a.argName
        THEN ts.観点ID_X
        ELSE '-'
    END AS mirrorX,
    CASE
        WHEN ai.targetKind='ARG'
         AND ai.argIndex=a.argIndex
         AND ai.argName=a.argName
        THEN ts.観点ID_Y
        ELSE '-'
    END AS mirrorY,
    CASE
        WHEN ai.targetKind='ARG'
         AND ai.argIndex=a.argIndex
         AND ai.argName=a.argName
        THEN ts.観点ID_Z
        ELSE '-'
    END AS mirrorZ,
    CASE
        WHEN a.validationMin=-1 THEN COALESCE(ldm.min_value,-1)
        ELSE a.validationMin
    END AS validationMin,
    CASE
        WHEN a.validationMax=-1 THEN COALESCE(ldm.max_value,-1)
        ELSE a.validationMax
    END AS validationMax,
    a.nullable,
    a.rawType AS referenceType,
    '' AS fixedValue,
    COALESCE(ev.referenceValues,'') AS referenceValues
FROM v_test_spec_validation ts
JOIN v_ai_input ai
  ON ai.targetId=ts.targetId
JOIN args_data a
  ON a.filePath=ai.filePath
 AND a.className=ai.className
 AND a.methodName=ai.methodName
 AND a.process1=ai.process1
LEFT JOIN lang_data_models ldm
  ON LOWER(ldm.language)='java'
 AND ldm.data_model=a.rawType
LEFT JOIN enum_values ev
  ON ev.enumName=a.rawType
WHERE a.objectRootId<=0;