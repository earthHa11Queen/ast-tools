CREATE VIEW IF NOT EXISTS v_junit_data_instruction_expand AS
WITH

-- ============================================================
-- ENUM values
-- ============================================================
enum_values AS MATERIALIZED (
    SELECT
        enumName,
        GROUP_CONCAT(enumValue, ' / ') AS referenceValues
    FROM (
        SELECT
            enumName,
            enumValue
        FROM enum_data
        ORDER BY
            enumName,
            enumIndex
    )
    GROUP BY
        enumName
),

-- ============================================================
-- Structure edges
--
-- 型構造を「現在ノード -> 次ノード」の有限な辺へ正規化する。
--
-- OBJECT_CHILD:
--   object_data parent -> ELEMENT / KEY / VALUE
--
-- DTO_FIELD:
--   OBJECT referenceType -> DTO field
--
-- ここを一度MATERIALIZEDすることで、
-- 各levelが object_data / dto_data / field_data を
-- 直接繰り返し展開しないようにする。
-- ============================================================
structure_edges AS MATERIALIZED (

    -- --------------------------------------------------------
    -- ARRAY / COLLECTION / MAP
    -- object_data parent -> child
    -- --------------------------------------------------------
    SELECT
        'OBJECT_CHILD' AS edgeKind,

        child.parentObjectId AS sourceObjectId,
        '-' AS sourceReferenceType,

        CASE child.position
            WHEN 'ELEMENT' THEN '[]'
            WHEN 'KEY'     THEN '{key}'
            WHEN 'VALUE'   THEN '{value}'
            ELSE ''
        END AS pathSuffix,

        '-' AS dtoName,
        '-' AS fieldName,

        child.objectId,

        child.rawType,
        child.baseType,
        child.convModel,
        child.referenceType,

        -1 AS sourceMin,
        -1 AS sourceMax,
        -1 AS nullable

    FROM object_data child

    WHERE
        child.parentObjectId > 0


    UNION ALL


    -- --------------------------------------------------------
    -- DTO -> field
    -- --------------------------------------------------------
    SELECT
        'DTO_FIELD' AS edgeKind,

        -1 AS sourceObjectId,
        d.dtoName AS sourceReferenceType,

        '.' || f.fieldName AS pathSuffix,

        d.dtoName,
        f.fieldName,

        CASE
            WHEN f.objectRootId > 0
            THEN f.objectRootId
            ELSE -1
        END AS objectId,

        f.rawType AS rawType,

        COALESCE(
            fo.baseType,
            f.rawType
        ) AS baseType,

        CASE
            WHEN ev.enumName IS NOT NULL
            THEN 'ENUM'
            ELSE f.convModel
        END AS convModel,

        CASE
            WHEN fo.referenceType IS NOT NULL
             AND fo.referenceType <> '-'
            THEN fo.referenceType

            WHEN f.convModel = 'OBJECT'
            THEN f.rawType

            ELSE '-'
        END AS referenceType,

        f.validationMin AS sourceMin,
        f.validationMax AS sourceMax,
        f.nullable AS nullable

    FROM dto_data d

    JOIN field_data f
      ON f.filePath = d.filePath
     AND f.className = d.dtoName
     AND f.fieldName = d.fieldName

    LEFT JOIN object_data fo
      ON fo.objectId = f.objectRootId
     AND fo.position = 'ROOT'

    LEFT JOIN enum_values ev
      ON ev.enumName = f.rawType
),

-- ============================================================
-- Level 0
--
-- 構造化されたargument root。
-- Case情報は持たせない。
-- ============================================================
level_0 AS MATERIALIZED (
    SELECT
        a.filePath,
        a.className,
        a.methodName,
        a.process1,

        a.argIndex,
        a.argName,

        a.argName AS dataId,

        0 AS depth,

        '-' AS dtoName,
        '-' AS fieldName,

        root.objectId,

        root.rawType,
        root.baseType,
        root.convModel,
        root.referenceType,

        a.validationMin AS sourceMin,
        a.validationMax AS sourceMax,
        a.nullable,

        '>' AS typeChain

    FROM args_data a

    JOIN object_data root
      ON root.objectId = a.objectRootId
     AND root.position = 'ROOT'

    WHERE
        a.objectRootId > 0
),

-- ============================================================
-- Level 1
-- ============================================================
level_1 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        1 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_0 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 2
-- ============================================================
level_2 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        2 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_1 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 3
-- ============================================================
level_3 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        3 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_2 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 4
-- ============================================================
level_4 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        4 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_3 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 5
-- ============================================================
level_5 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        5 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_4 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 6
-- ============================================================
level_6 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        6 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_5 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 7
-- ============================================================
level_7 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        7 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_6 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 8
-- ============================================================
level_8 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        8 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_7 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 9
-- ============================================================
level_9 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        9 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_8 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 10
-- ============================================================
level_10 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        10 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_9 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 11
-- ============================================================
level_11 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        11 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_10 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 12
-- ============================================================
level_12 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        12 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_11 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 13
-- ============================================================
level_13 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        13 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_12 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 14
-- ============================================================
level_14 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        14 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_13 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 15
-- ============================================================
level_15 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        15 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_14 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 16
-- ============================================================
level_16 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        16 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_15 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 17
-- ============================================================
level_17 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        17 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_16 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 18
-- ============================================================
level_18 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        18 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_17 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 19
-- ============================================================
level_19 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        19 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_18 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Level 20
-- ============================================================
level_20 AS MATERIALIZED (
    SELECT
        p.filePath,
        p.className,
        p.methodName,
        p.process1,

        p.argIndex,
        p.argName,

        p.dataId || e.pathSuffix AS dataId,

        20 AS depth,

        e.dtoName,
        e.fieldName,

        e.objectId,

        e.rawType,
        e.baseType,
        e.convModel,
        e.referenceType,

        e.sourceMin,
        e.sourceMax,
        e.nullable,

        CASE
            WHEN e.edgeKind = 'DTO_FIELD'
            THEN p.typeChain || p.referenceType || '>'
            ELSE p.typeChain
        END AS typeChain

    FROM level_19 p

    JOIN structure_edges e
      ON (
            e.edgeKind = 'OBJECT_CHILD'
        AND e.sourceObjectId = p.objectId
         )
      OR (
            e.edgeKind = 'DTO_FIELD'
        AND p.convModel = 'OBJECT'
        AND p.referenceType <> '-'
        AND e.sourceReferenceType = p.referenceType
        AND instr(
                p.typeChain,
                '>' || p.referenceType || '>'
            ) = 0
         )
),

-- ============================================================
-- Complete structure tree
--
-- 各levelで到達したノードはここへ残す。
-- 終端ノードは次levelに生成されていないため、
-- 後続levelでは自然に0件となる。
-- ============================================================
tree AS MATERIALIZED (

    SELECT * FROM level_0

    UNION ALL
    SELECT * FROM level_1

    UNION ALL
    SELECT * FROM level_2

    UNION ALL
    SELECT * FROM level_3

    UNION ALL
    SELECT * FROM level_4

    UNION ALL
    SELECT * FROM level_5

    UNION ALL
    SELECT * FROM level_6

    UNION ALL
    SELECT * FROM level_7

    UNION ALL
    SELECT * FROM level_8

    UNION ALL
    SELECT * FROM level_9

    UNION ALL
    SELECT * FROM level_10

    UNION ALL
    SELECT * FROM level_11

    UNION ALL
    SELECT * FROM level_12

    UNION ALL
    SELECT * FROM level_13

    UNION ALL
    SELECT * FROM level_14

    UNION ALL
    SELECT * FROM level_15

    UNION ALL
    SELECT * FROM level_16

    UNION ALL
    SELECT * FROM level_17

    UNION ALL
    SELECT * FROM level_18

    UNION ALL
    SELECT * FROM level_19

    UNION ALL
    SELECT * FROM level_20
),

-- ============================================================
-- Case context
--
-- 型構造展開が完全に終了してから
-- CaseNo / targetId / Mirror を取得する。
-- ============================================================
case_context AS MATERIALIZED (
    SELECT
        ts.CaseNo,
        ts.targetId,

        ts.観点ID_X,
        ts.観点ID_Y,
        ts.観点ID_Z,

        ai.filePath,
        ai.className,
        ai.methodName,
        ai.process1,

        ai.targetKind,

        ai.argIndex AS targetArgIndex,
        ai.argName AS targetArgName,
        ai.dtoName AS targetDtoName,
        ai.targetName

    FROM v_test_spec_validation ts

    JOIN v_ai_input ai
      ON ai.targetId = ts.targetId
),

-- ============================================================
-- Case + expanded structure
--
-- Caseをここで初めて展開済み構造へ掛ける。
-- ============================================================
resolved AS MATERIALIZED (
    SELECT
        c.CaseNo,
        c.targetId,

        c.観点ID_X,
        c.観点ID_Y,
        c.観点ID_Z,

        c.targetKind,
        c.targetArgIndex,
        c.targetArgName,
        c.targetDtoName,
        c.targetName,

        t.argIndex,
        t.argName,

        t.dataId,
        t.depth,

        t.dtoName,
        t.fieldName,

        t.objectId,

        t.rawType,
        t.baseType,
        t.convModel,
        t.referenceType,

        t.sourceMin,
        t.sourceMax,
        t.nullable,

        t.typeChain,

        CASE
            WHEN c.targetKind = 'ARG'
             AND t.argIndex = c.targetArgIndex
             AND t.argName = c.targetArgName
             AND t.depth = 0
            THEN 1

            WHEN c.targetKind = 'FIELD'
             AND t.argIndex = c.targetArgIndex
             AND t.argName = c.targetArgName
             AND t.dtoName = c.targetDtoName
             AND t.fieldName = c.targetName
            THEN 1

            ELSE 0
        END AS isTarget

    FROM case_context c

    JOIN tree t
      ON t.filePath = c.filePath
     AND t.className = c.className
     AND t.methodName = c.methodName
     AND t.process1 = c.process1
)

-- ============================================================
-- JUnit Data Instruction
--
-- v_junit_data_instruction_expand の既存出力契約を維持。
-- ============================================================
SELECT
    r.CaseNo,

    r.dataId,

    r.targetId,

    CASE
        WHEN r.isTarget = 1
        THEN 'TARGET'
        ELSE 'NORMAL'
    END AS dataRole,

    CASE
        WHEN ev.enumName IS NOT NULL
        THEN 'ENUM'
        ELSE r.convModel
    END AS convModel,

    CASE
        WHEN r.isTarget = 1
        THEN r.観点ID_X
        ELSE '-'
    END AS mirrorX,

    CASE
        WHEN r.isTarget = 1
        THEN r.観点ID_Y
        ELSE '-'
    END AS mirrorY,

    CASE
        WHEN r.isTarget = 1
        THEN r.観点ID_Z
        ELSE '-'
    END AS mirrorZ,

    CASE
        WHEN r.sourceMin = -1
        THEN COALESCE(
            ldm.min_value,
            -1
        )
        ELSE r.sourceMin
    END AS validationMin,

    CASE
        WHEN r.sourceMax = -1
        THEN COALESCE(
            ldm.max_value,
            -1
        )
        ELSE r.sourceMax
    END AS validationMax,

    r.nullable,

    r.rawType AS referenceType,

    '' AS fixedValue,

    COALESCE(
        ev.referenceValues,
        ''
    ) AS referenceValues

FROM resolved r

LEFT JOIN lang_data_models ldm
  ON LOWER(ldm.language) = 'java'
 AND ldm.data_model = r.baseType

LEFT JOIN enum_values ev
  ON ev.enumName = r.rawType;