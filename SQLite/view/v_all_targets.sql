CREATE VIEW IF NOT EXISTS v_all_targets AS
WITH RECURSIVE

target_methods AS (
    SELECT
        a.filePath,
        a.className,
        a.methodName,
        a.process1
    FROM args_data a

    UNION

    SELECT
        r.filePath,
        r.className,
        r.methodName,
        r.process1
    FROM return_data r
),

target_args AS (
    SELECT
        a.n AS arg_n,
        a.filePath,
        a.className,
        a.methodName,
        a.process1,
        a.argIndex,
        a.argName,
        a.argRaw,
        a.rawType AS argRawType,
        a.convModel AS argConvModel,
        a.validationMin AS argValidationMin,
        a.validationMax AS argValidationMax,
        a.nullable AS argNullable,
        a.rawAnnotations AS argRawAnnotations,
        a.objectRootId AS argObjectRootId
    FROM args_data a
),

target_returns AS (
    SELECT
        r.n AS return_n,
        r.filePath,
        r.className,
        r.methodName,
        r.process1,
        r.rawType AS returnRawType,
        r.convModel AS returnConvModel,
        r.objectRootId AS returnObjectRootId
    FROM return_data r
),

target_dto_fields AS (
    SELECT
        a.arg_n,
        a.filePath,
        a.className,
        a.methodName,
        a.process1,
        a.argIndex,
        a.argName,
        a.argRaw,
        a.argRawType,
        a.argConvModel,
        a.argValidationMin,
        a.argValidationMax,
        a.argNullable,
        a.argRawAnnotations,
        a.argObjectRootId,

        d.n AS dto_n,
        d.filePath AS dtoFilePath,
        d.dtoName,

        f.n AS field_n,
        f.fieldName,
        f.rawType AS fieldRawType,
        f.convModel AS fieldConvModel,
        f.isFinal,
        f.validationMin AS fieldValidationMin,
        f.validationMax AS fieldValidationMax,
        f.nullable AS fieldNullable,
        f.rawAnnotations AS fieldRawAnnotations,
        f.objectRootId AS fieldObjectRootId
    FROM target_args a

    INNER JOIN dto_data d
        ON d.dtoName = a.argRawType

    INNER JOIN field_data f
        ON f.filePath = d.filePath
       AND f.className = d.dtoName
       AND f.fieldName = d.fieldName
),

relevant_root_ids AS (
    SELECT DISTINCT
        a.argObjectRootId AS rootObjectId
    FROM target_args a
    WHERE a.argObjectRootId > 0

    UNION

    SELECT DISTINCT
        f.fieldObjectRootId
    FROM target_dto_fields f
    WHERE f.fieldObjectRootId > 0

    UNION

    SELECT DISTINCT
        r.returnObjectRootId
    FROM target_returns r
    WHERE r.returnObjectRootId > 0
),

relevant_object_tree AS (
    SELECT
        o.objectId,
        o.objectId AS rootObjectId,
        o.parentObjectId,
        o.ownerKind,
        o.filePath,
        o.className,
        o.methodName,
        o.ownerName,
        o.ownerIndex,
        o.position,
        o.rawType,
        o.baseType,
        o.convModel,
        o.referenceType,
        0 AS depth
    FROM relevant_root_ids rr

    INNER JOIN object_data o
        ON o.objectId = rr.rootObjectId

    UNION ALL

    SELECT
        c.objectId,
        p.rootObjectId,
        c.parentObjectId,
        c.ownerKind,
        c.filePath,
        c.className,
        c.methodName,
        c.ownerName,
        c.ownerIndex,
        c.position,
        c.rawType,
        c.baseType,
        c.convModel,
        c.referenceType,
        p.depth + 1
    FROM relevant_object_tree p

    INNER JOIN object_data c
        ON c.parentObjectId = p.objectId
),

object_structure_rows AS (
    SELECT
        o.rootObjectId,
        o.objectId,
        o.depth,
        o.position,
        o.rawType,
        o.baseType,
        o.convModel,
        o.referenceType
    FROM relevant_object_tree o
    ORDER BY
        o.rootObjectId,
        o.depth,
        o.objectId
),

object_structure_agg AS (
    SELECT
        o.rootObjectId,
        GROUP_CONCAT(
            o.depth
            || ':'
            || o.position
            || ':'
            || o.rawType
            || ':'
            || o.baseType
            || ':'
            || o.convModel
            || ':'
            || o.referenceType,
            ' / '
        ) AS objectStructure
    FROM object_structure_rows o
    GROUP BY
        o.rootObjectId
),

arg_models AS (
    SELECT
        a.arg_n,

        CASE
            WHEN root.objectId > 0
                THEN root.baseType
            ELSE a.argRawType
        END AS modelLookupType,

        ldm.conv_model AS languageConvModel,
        ldm.min_value AS languageMinValue,
        ldm.max_value AS languageMaxValue
    FROM target_args a

    LEFT JOIN object_data root
        ON root.objectId = a.argObjectRootId

    LEFT JOIN lang_data_models ldm
        ON LOWER(ldm.language) = 'java'
       AND ldm.data_model =
            CASE
                WHEN root.objectId > 0
                    THEN root.baseType
                ELSE a.argRawType
            END
),

field_models AS (
    SELECT
        f.arg_n,
        f.field_n,

        CASE
            WHEN root.objectId > 0
                THEN root.baseType
            ELSE f.fieldRawType
        END AS modelLookupType,

        ldm.conv_model AS languageConvModel,
        ldm.min_value AS languageMinValue,
        ldm.max_value AS languageMaxValue
    FROM target_dto_fields f

    LEFT JOIN object_data root
        ON root.objectId = f.fieldObjectRootId

    LEFT JOIN lang_data_models ldm
        ON LOWER(ldm.language) = 'java'
       AND ldm.data_model =
            CASE
                WHEN root.objectId > 0
                    THEN root.baseType
                ELSE f.fieldRawType
            END
),

enum_rows AS (
    SELECT
        e.enumName,
        e.enumIndex,
        e.enumValue
    FROM enum_data e
    ORDER BY
        e.enumName,
        e.enumIndex
),

enum_agg AS (
    SELECT
        e.enumName,
        GROUP_CONCAT(
            e.enumIndex || ':' || e.enumValue,
            ' / '
        ) AS enumValues
    FROM enum_rows e
    GROUP BY
        e.enumName
),

import_rows AS (
    SELECT
        i.n,
        RTRIM(i.directoryPath, '/') || '/' || i.fileName AS filePath,
        i.importList
    FROM importlist_data i
    ORDER BY
        RTRIM(i.directoryPath, '/') || '/' || i.fileName,
        i.n
),

imports_agg AS (
    SELECT
        i.filePath,
        GROUP_CONCAT(
            i.importList,
            ' / '
        ) AS imports
    FROM import_rows i
    GROUP BY
        i.filePath
),

method_argument_rows AS (
    SELECT
        a.filePath,
        a.className,
        a.methodName,
        a.process1,
        a.argIndex,

        a.argIndex
        || ':'
        || a.argName
        || ':'
        || a.argRawType
        || ':'
        || a.argConvModel
        || ':'
        || a.argRawAnnotations AS argumentContext
    FROM target_args a
    ORDER BY
        a.filePath,
        a.className,
        a.methodName,
        a.process1,
        a.argIndex
),

method_arguments_agg AS (
    SELECT
        a.filePath,
        a.className,
        a.methodName,
        a.process1,

        GROUP_CONCAT(
            a.argumentContext,
            ' / '
        ) AS methodArgumentContext
    FROM method_argument_rows a
    GROUP BY
        a.filePath,
        a.className,
        a.methodName,
        a.process1
),

method_context AS (
    SELECT
        m.filePath,
        m.className,
        m.methodName,
        m.process1,

        COALESCE(
            ma.methodArgumentContext,
            '-'
        ) AS methodArgumentContext,

        COALESCE(
            r.returnRawType,
            '-'
        ) AS methodReturnRawType,

        COALESCE(
            r.returnConvModel,
            '-'
        ) AS methodReturnConvModel,

        COALESCE(
            ro.objectStructure,
            '-'
        ) AS methodReturnContext,

        'class='
        || m.className
        || ' / method='
        || m.methodName
        || ' / process1='
        || m.process1
        || ' / arguments='
        || COALESCE(
            ma.methodArgumentContext,
            '-'
        )
        || ' / return='
        || COALESCE(
            ro.objectStructure,
            r.returnRawType,
            '-'
        ) AS methodSemanticContext

    FROM target_methods m

    LEFT JOIN method_arguments_agg ma
        ON ma.filePath = m.filePath
       AND ma.className = m.className
       AND ma.methodName = m.methodName
       AND ma.process1 = m.process1

    LEFT JOIN target_returns r
        ON r.filePath = m.filePath
       AND r.className = m.className
       AND r.methodName = m.methodName
       AND r.process1 = m.process1

    LEFT JOIN object_structure_agg ro
        ON ro.rootObjectId = r.returnObjectRootId
),

field_targets AS (
    SELECT
        f.filePath,
        f.className,
        f.methodName,
        f.process1,

        'FIELD' AS targetKind,

        f.arg_n,
        f.argIndex,
        f.argName,
        f.argRaw,
        f.argRawType AS parentArgRawType,
        f.argRawAnnotations AS parentArgRawAnnotations,

        f.dto_n,
        f.dtoFilePath,
        f.dtoName,

        f.field_n,
        f.fieldName AS targetName,

        f.fieldRawType AS rawType,
        f.fieldConvModel AS convModel,

        f.fieldValidationMin AS validationMin,
        f.fieldValidationMax AS validationMax,
        f.fieldNullable AS nullable,
        f.fieldRawAnnotations AS rawAnnotations,
        f.fieldObjectRootId AS objectRootId,

        fm.modelLookupType,
        fm.languageConvModel,
        COALESCE(fm.languageMinValue, -1) AS modelMin,
        COALESCE(fm.languageMaxValue, -1) AS modelMax,

        CASE
            WHEN f.fieldValidationMin = -1
                THEN COALESCE(fm.languageMinValue, -1)
            ELSE f.fieldValidationMin
        END AS effectiveMin,

        CASE
            WHEN f.fieldValidationMax = -1
                THEN COALESCE(fm.languageMaxValue, -1)
            ELSE f.fieldValidationMax
        END AS effectiveMax,

        COALESCE(obj.objectStructure, '-') AS objectStructure,
        COALESCE(en.enumValues, '-') AS enumValues
    FROM target_dto_fields f

    LEFT JOIN field_models fm
        ON fm.arg_n = f.arg_n
       AND fm.field_n = f.field_n

    LEFT JOIN object_structure_agg obj
        ON obj.rootObjectId = f.fieldObjectRootId

    LEFT JOIN enum_agg en
        ON en.enumName = f.fieldRawType
),

arg_targets AS (
    SELECT
        a.filePath,
        a.className,
        a.methodName,
        a.process1,

        'ARG' AS targetKind,

        a.arg_n,
        a.argIndex,
        a.argName,
        a.argRaw,
        a.argRawType AS parentArgRawType,
        a.argRawAnnotations AS parentArgRawAnnotations,

        -1 AS dto_n,
        '-' AS dtoFilePath,
        '-' AS dtoName,

        -1 AS field_n,
        a.argName AS targetName,

        a.argRawType AS rawType,
        a.argConvModel AS convModel,

        a.argValidationMin AS validationMin,
        a.argValidationMax AS validationMax,
        a.argNullable AS nullable,
        a.argRawAnnotations AS rawAnnotations,
        a.argObjectRootId AS objectRootId,

        COALESCE(am.modelLookupType, '-') AS modelLookupType,
        COALESCE(am.languageConvModel, '-') AS languageConvModel,
        COALESCE(am.languageMinValue, -1) AS modelMin,
        COALESCE(am.languageMaxValue, -1) AS modelMax,

        CASE
            WHEN a.argValidationMin = -1
                THEN COALESCE(am.languageMinValue, -1)
            ELSE a.argValidationMin
        END AS effectiveMin,

        CASE
            WHEN a.argValidationMax = -1
                THEN COALESCE(am.languageMaxValue, -1)
            ELSE a.argValidationMax
        END AS effectiveMax,

        COALESCE(obj.objectStructure, '-') AS objectStructure,
        '-' AS enumValues
    FROM target_args a

    LEFT JOIN arg_models am
        ON am.arg_n = a.arg_n

    LEFT JOIN object_structure_agg obj
        ON obj.rootObjectId = a.argObjectRootId

    WHERE NOT EXISTS (
        SELECT 1
        FROM target_dto_fields f
        WHERE f.arg_n = a.arg_n
    )
),

method_targets AS (
    SELECT
        m.filePath,
        m.className,
        m.methodName,
        m.process1,

        'METHOD' AS targetKind,

        -1 AS arg_n,
        -1 AS argIndex,
        '-' AS argName,
        '-' AS argRaw,
        '-' AS parentArgRawType,
        '-' AS parentArgRawAnnotations,

        -1 AS dto_n,
        '-' AS dtoFilePath,
        '-' AS dtoName,

        -1 AS field_n,
        '-' AS targetName,

        '-' AS rawType,
        '-' AS convModel,

        -1 AS validationMin,
        -1 AS validationMax,
        -1 AS nullable,
        '-' AS rawAnnotations,
        -1 AS objectRootId,

        '-' AS modelLookupType,
        '-' AS languageConvModel,
        -1 AS modelMin,
        -1 AS modelMax,

        -1 AS effectiveMin,
        -1 AS effectiveMax,

        '-' AS objectStructure,
        '-' AS enumValues
    FROM target_methods m

    WHERE NOT EXISTS (
        SELECT 1
        FROM target_args a
        WHERE a.filePath = m.filePath
          AND a.className = m.className
          AND a.methodName = m.methodName
          AND a.process1 = m.process1
    )
),

all_targets AS (
    SELECT * FROM field_targets

    UNION ALL

    SELECT * FROM arg_targets

    UNION ALL

    SELECT * FROM method_targets
)

SELECT
    t.filePath,
    t.className,
    t.methodName,
    t.process1,

    t.targetKind,

    t.arg_n,
    t.argIndex,
    t.argName,
    t.argRaw,
    t.parentArgRawType,
    t.parentArgRawAnnotations,

    t.dto_n,
    t.dtoFilePath,
    t.dtoName,

    t.field_n,
    t.targetName,

    t.rawType,
    t.convModel,

    t.validationMin,
    t.validationMax,
    t.nullable,
    t.rawAnnotations,
    t.objectRootId,

    t.modelLookupType,
    t.languageConvModel,
    t.modelMin,
    t.modelMax,

    t.effectiveMin,
    t.effectiveMax,

    t.objectStructure,
    t.enumValues,

    COALESCE(r.return_n, -1) AS return_n,
    COALESCE(r.returnRawType, '-') AS returnRawType,
    COALESCE(r.returnConvModel, '-') AS returnConvModel,
    COALESCE(r.returnObjectRootId, -1) AS returnObjectRootId,

    COALESCE(
        returnObj.objectStructure,
        '-'
    ) AS returnObjectStructure,

    COALESCE(
        mc.methodArgumentContext,
        '-'
    ) AS methodArgumentContext,

    COALESCE(
        mc.methodReturnRawType,
        '-'
    ) AS methodReturnRawType,

    COALESCE(
        mc.methodReturnConvModel,
        '-'
    ) AS methodReturnConvModel,

    COALESCE(
        mc.methodReturnContext,
        '-'
    ) AS methodReturnContext,

    COALESCE(
        mc.methodSemanticContext,
        '-'
    ) AS methodSemanticContext,

    COALESCE(
        imports.imports,
        '-'
    ) AS imports

FROM all_targets t

LEFT JOIN target_returns r
    ON r.filePath = t.filePath
   AND r.className = t.className
   AND r.methodName = t.methodName
   AND r.process1 = t.process1

LEFT JOIN object_structure_agg returnObj
    ON returnObj.rootObjectId = r.returnObjectRootId

LEFT JOIN method_context mc
    ON mc.filePath = t.filePath
   AND mc.className = t.className
   AND mc.methodName = t.methodName
   AND mc.process1 = t.process1

LEFT JOIN imports_agg imports
    ON imports.filePath = t.filePath

ORDER BY
    t.filePath,
    t.className,
    t.methodName,
    t.process1,
    t.argIndex,
    t.dtoName,
    t.targetName;