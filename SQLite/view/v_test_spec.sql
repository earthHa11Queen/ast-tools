CREATE VIEW IF NOT EXISTS v_test_spec AS
SELECT
    ts.CaseNo,
    ts.targetId,

    ts.大分類,
    ts.中分類,
    ts.小分類,

    ts.観点ID_X,
    ts.観点ID_Y,
    ts.観点ID_Z,

    ts.ケース内容,
    ts.操作手順,
    ts.確認内容,
    ts.確認手順,
    ts.想定結果,
    ts."想定結果判断基準・判断手順",

    ts.generatorTarget,
    ts.generatorRule,

    ts.予定日,
    ts.実施日,
    ts.実施者,
    ts.実施結果,

    ts.再実施要否,
    ts.再実施判断日,
    ts.再実施判断担当者,
    ts.再実施テスト仕様書ファイル名ないしファイルパス,

    ts.備考,

    COALESCE(ai.filePath, '-') AS filePath,
    COALESCE(ai.className, '-') AS className,
    COALESCE(ai.methodName, '-') AS methodName,
    COALESCE(ai.process1, -1) AS process1,

    COALESCE(ai.targetKind, '-') AS targetKind,

    COALESCE(ai.argIndex, -1) AS argIndex,
    COALESCE(ai.argName, '-') AS argName,
    COALESCE(ai.argRaw, '-') AS argRaw,
    COALESCE(ai.parentArgRawType, '-') AS parentArgRawType,
    COALESCE(ai.parentArgRawAnnotations, '-') AS parentArgRawAnnotations,

    COALESCE(ai.dtoFilePath, '-') AS dtoFilePath,
    COALESCE(ai.dtoName, '-') AS dtoName,

    COALESCE(ai.targetName, '-') AS targetName,

    COALESCE(ai.rawType, '-') AS rawType,
    COALESCE(ai.convModel, '-') AS convModel,

    COALESCE(ai.validationMin, -1) AS validationMin,
    COALESCE(ai.validationMax, -1) AS validationMax,
    COALESCE(ai.nullable, -1) AS nullable,
    COALESCE(ai.rawAnnotations, '-') AS rawAnnotations,

    COALESCE(ai.modelLookupType, '-') AS modelLookupType,
    COALESCE(ai.languageConvModel, '-') AS languageConvModel,
    COALESCE(ai.modelMin, -1) AS modelMin,
    COALESCE(ai.modelMax, -1) AS modelMax,

    COALESCE(ai.effectiveMin, -1) AS effectiveMin,
    COALESCE(ai.effectiveMax, -1) AS effectiveMax,

    COALESCE(ai.objectStructure, '-') AS objectStructure,
    COALESCE(ai.enumValues, '-') AS enumValues,

    COALESCE(ai.returnRawType, '-') AS returnRawType,
    COALESCE(ai.returnConvModel, '-') AS returnConvModel,
    COALESCE(ai.returnObjectStructure, '-') AS returnObjectStructure,

    COALESCE(ai.methodArgumentContext, '-') AS methodArgumentContext,
    COALESCE(ai.methodReturnRawType, '-') AS methodReturnRawType,
    COALESCE(ai.methodReturnConvModel, '-') AS methodReturnConvModel,
    COALESCE(ai.methodReturnContext, '-') AS methodReturnContext,
    COALESCE(ai.methodSemanticContext, '-') AS methodSemanticContext,

    COALESCE(ai.xCandidateIds, '-') AS xCandidateIds,
    COALESCE(ai.yCandidateIds, '-') AS yCandidateIds,
    COALESCE(ai.zCandidateIds, '-') AS zCandidateIds,

    CASE
        WHEN ai.targetId IS NULL
            THEN 0
        ELSE 1
    END AS targetExists,

    CASE
        WHEN ts.generatorTarget = ts.targetId
            THEN 1
        ELSE 0
    END AS generatorTargetValid,

    CASE
        WHEN ts.generatorRule =
            'X='
            || ts.観点ID_X
            || '|Y='
            || ts.観点ID_Y
            || '|Z='
            || ts.観点ID_Z
            THEN 1
        ELSE 0
    END AS generatorRuleValid

FROM test_spec ts

LEFT JOIN v_ai_input ai
    ON ai.targetId = ts.targetId

ORDER BY
    ts.CaseNo;