CREATE VIEW IF NOT EXISTS v_mirror_candidates AS
WITH

x_rows AS (
    SELECT
        x.n,
        x.root_id,
        x.branch_id,
        x.leaf_id,
        x.leaf_edge_id,
        x.x_id,
        x.x_name
    FROM mirror_x_axis x
    ORDER BY
        x.n
),

x_agg AS (
    SELECT
        GROUP_CONCAT(
            x.n
            || ':'
            || x.x_id,
            ' / '
        ) AS xCandidateIds,

        GROUP_CONCAT(
            x.n
            || ':'
            || x.root_id
            || ':'
            || x.branch_id
            || ':'
            || x.leaf_id
            || ':'
            || x.leaf_edge_id
            || ':'
            || x.x_id
            || ':'
            || x.x_name,
            ' / '
        ) AS xCandidateDetails
    FROM x_rows x
),

z_rows AS (
    SELECT
        z.n,
        z.category_id,
        z.group_id,
        z.z_type,
        z.z_name,
        z.z_id,
        z.variants
    FROM mirror_z_axis z
    WHERE z.z_id <> 'Nothing'
    ORDER BY
        z.n
),

z_agg AS (
    SELECT
        GROUP_CONCAT(
            z.n
            || ':'
            || z.z_id,
            ' / '
        ) AS zCandidateIds,

        GROUP_CONCAT(
            z.n
            || ':'
            || z.category_id
            || ':'
            || z.group_id
            || ':'
            || z.z_type
            || ':'
            || z.z_name
            || ':'
            || z.z_id
            || ':'
            || z.variants,
            ' / '
        ) AS zCandidateDetails
    FROM z_rows z
),

target_y_candidates AS (
    SELECT
        t.filePath,
        t.className,
        t.methodName,
        t.process1,
        t.targetKind,
        t.argIndex,
        t.dtoName,
        t.targetName,

        y.n,
        y.y_id,
        y.domains_name,
        y.logic

    FROM v_all_targets t

    INNER JOIN mirror_y_axis y
        ON t.targetKind <> 'METHOD'

    WHERE
        (
            y.y_id = 'length_null'
            AND (
                t.nullable = 1
                OR t.nullable = -1
            )
        )

        OR

        (
            y.y_id = 'length_empty'
            AND (
                t.nullable = 0
                OR t.nullable = -1
            )
        )

        OR

        (
            y.y_id IN (
                'length_min',
                'length_min_minus_1'
            )
            AND t.effectiveMin <> -1
        )

        OR

        (
            y.y_id IN (
                'length_max',
                'length_max_plus_1'
            )
            AND t.effectiveMax <> -1
        )

        OR

        (
            y.y_id = 'length_normal_mid'
            AND t.effectiveMin <> -1
            AND t.effectiveMax <> -1
            AND t.effectiveMax > t.effectiveMin
        )
),

target_y_agg AS (
    SELECT
        y.filePath,
        y.className,
        y.methodName,
        y.process1,
        y.targetKind,
        y.argIndex,
        y.dtoName,
        y.targetName,

        GROUP_CONCAT(
            y.n
            || ':'
            || y.y_id,
            ' / '
        ) AS yCandidateIds,

        GROUP_CONCAT(
            y.n
            || ':'
            || y.y_id
            || ':'
            || y.domains_name
            || ':'
            || y.logic,
            ' / '
        ) AS yCandidateDetails

    FROM target_y_candidates y

    GROUP BY
        y.filePath,
        y.className,
        y.methodName,
        y.process1,
        y.targetKind,
        y.argIndex,
        y.dtoName,
        y.targetName
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

    t.return_n,
    t.returnRawType,
    t.returnConvModel,
    t.returnObjectRootId,
    t.returnObjectStructure,

    t.methodArgumentContext,
    t.methodReturnRawType,
    t.methodReturnConvModel,
    t.methodReturnContext,
    t.methodSemanticContext,

    t.imports,

    CASE
        WHEN t.targetKind = 'METHOD'
            THEN '-'
        ELSE x.xCandidateIds
    END AS xCandidateIds,

    CASE
        WHEN t.targetKind = 'METHOD'
            THEN '-'
        ELSE x.xCandidateDetails
    END AS xCandidateDetails,

    COALESCE(
        y.yCandidateIds,
        '-'
    ) AS yCandidateIds,

    COALESCE(
        y.yCandidateDetails,
        '-'
    ) AS yCandidateDetails,

    CASE
        WHEN t.targetKind = 'METHOD'
            THEN '-'
        ELSE z.zCandidateIds
    END AS zCandidateIds,

    CASE
        WHEN t.targetKind = 'METHOD'
            THEN '-'
        ELSE z.zCandidateDetails
    END AS zCandidateDetails

FROM v_all_targets t

CROSS JOIN x_agg x

CROSS JOIN z_agg z

LEFT JOIN target_y_agg y
    ON y.filePath = t.filePath
   AND y.className = t.className
   AND y.methodName = t.methodName
   AND y.process1 = t.process1
   AND y.targetKind = t.targetKind
   AND y.argIndex = t.argIndex
   AND y.dtoName = t.dtoName
   AND y.targetName = t.targetName

ORDER BY
    t.filePath,
    t.className,
    t.methodName,
    t.process1,
    t.argIndex,
    t.dtoName,
    t.targetName;