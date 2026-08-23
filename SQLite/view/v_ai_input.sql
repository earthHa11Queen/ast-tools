CREATE VIEW IF NOT EXISTS v_ai_input AS
SELECT
    (
        c.filePath
        || '::'
        || c.className
        || '::'
        || c.methodName
        || '::'
        || c.process1
        || '::'
        || c.targetKind
        || '::'
        || c.argIndex
        || '::'
        || c.dtoName
        || '::'
        || c.targetName
    ) AS targetId,

    c.filePath,
    c.className,
    c.methodName,
    c.process1,

    c.targetKind,

    c.argIndex,
    c.argName,
    c.argRaw,
    c.parentArgRawType,
    c.parentArgRawAnnotations,

    c.dtoFilePath,
    c.dtoName,

    c.targetName,

    c.rawType,
    c.convModel,

    c.validationMin,
    c.validationMax,
    c.nullable,
    c.rawAnnotations,

    c.modelLookupType,
    c.languageConvModel,
    c.modelMin,
    c.modelMax,

    c.effectiveMin,
    c.effectiveMax,

    c.objectStructure,
    c.enumValues,

    c.returnRawType,
    c.returnConvModel,
    c.returnObjectStructure,

    c.methodArgumentContext,
    c.methodReturnRawType,
    c.methodReturnConvModel,
    c.methodReturnContext,
    c.methodSemanticContext,

    c.imports,

    c.xCandidateIds,
    c.xCandidateDetails,

    c.yCandidateIds,
    c.yCandidateDetails,

    c.zCandidateIds,
    c.zCandidateDetails

FROM v_mirror_candidates c

ORDER BY
    c.filePath,
    c.className,
    c.methodName,
    c.process1,
    c.argIndex,
    c.dtoName,
    c.targetName;