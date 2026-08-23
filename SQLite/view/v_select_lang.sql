CREATE VIEW IF NOT EXISTS v_select_lang AS
SELECT
    CASE
        WHEN filePath LIKE '%.java' THEN 'java'
        WHEN filePath LIKE '%.ts' OR filePath LIKE '%.tsx' THEN 'typescript'
        WHEN filePath LIKE '%.js' OR filePath LIKE '%.jsx' THEN 'javascript'
        WHEN filePath LIKE '%.py' THEN 'python'
        WHEN filePath LIKE '%.php' THEN 'php'
        WHEN filePath LIKE '%.cs' THEN 'csharp'
    END AS lang
FROM ast_field_level_tmp
limit 1
;