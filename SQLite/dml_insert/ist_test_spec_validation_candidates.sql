BEGIN;

-- ============================================================
-- Validation target refresh
-- ============================================================

DELETE FROM test_spec_validation_targets;

INSERT INTO test_spec_validation_targets (
    targetId
)
SELECT DISTINCT
    targetId
FROM v_ai_input;


-- ============================================================
-- Validation candidate refresh
-- ============================================================

DELETE FROM test_spec_validation_candidates;

WITH RECURSIVE
candidate_source AS (

    SELECT
        targetId,
        'X' AS axis,
        xCandidateIds AS candidateIds
    FROM v_ai_input

    UNION ALL

    SELECT
        targetId,
        'Y' AS axis,
        yCandidateIds AS candidateIds
    FROM v_ai_input

    UNION ALL

    SELECT
        targetId,
        'Z' AS axis,
        zCandidateIds AS candidateIds
    FROM v_ai_input
),
split (
    targetId,
    axis,
    mirrorId,
    rest
) AS (

    SELECT
        targetId,
        axis,
        TRIM(
            CASE
                WHEN INSTR(candidateIds, '/') > 0
                    THEN SUBSTR(candidateIds, 1, INSTR(candidateIds, '/') - 1)
                ELSE candidateIds
            END
        ) AS mirrorId,
        CASE
            WHEN INSTR(candidateIds, '/') > 0
                THEN SUBSTR(candidateIds, INSTR(candidateIds, '/') + 1)
            ELSE ''
        END AS rest
    FROM candidate_source
    WHERE candidateIds IS NOT NULL
      AND TRIM(candidateIds) <> ''
      AND TRIM(candidateIds) <> '-'

    UNION ALL

    SELECT
        targetId,
        axis,
        TRIM(
            CASE
                WHEN INSTR(rest, '/') > 0
                    THEN SUBSTR(rest, 1, INSTR(rest, '/') - 1)
                ELSE rest
            END
        ) AS mirrorId,
        CASE
            WHEN INSTR(rest, '/') > 0
                THEN SUBSTR(rest, INSTR(rest, '/') + 1)
            ELSE ''
        END AS rest
    FROM split
    WHERE rest <> ''
)

INSERT OR IGNORE INTO test_spec_validation_candidates (
    targetId,
    axis,
    mirrorId
)
SELECT
    targetId,
    axis,
    mirrorId
FROM split
WHERE mirrorId <> ''
  AND mirrorId <> '-';

COMMIT;