CREATE TABLE IF NOT EXISTS test_spec_validation_candidates (
    targetId TEXT NOT NULL,
    axis TEXT NOT NULL CHECK (axis IN ('X', 'Y', 'Z')),
    mirrorId TEXT NOT NULL,
    PRIMARY KEY (targetId, axis, mirrorId)
);
