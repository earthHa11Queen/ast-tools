CREATE VIEW IF NOT EXISTS v_all_ast_source_file_level AS
SELECT n,language,appName,fileName,directoryPath,className,importList,lineCount,methodCount,variableCount,constantCount
FROM ast_source_file_level
ORDER BY n,language,appName,fileName,directoryPath,className,importList,lineCount,methodCount,variableCount,constantCount
;