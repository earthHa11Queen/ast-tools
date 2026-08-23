INSERT INTO ast_source_file_level(language,appName,fileName,directoryPath,className,importList,lineCount,methodCount,variableCount,constantCount)
SELECT (SELECT lang FROM v_select_lang LIMIT 1) AS language,appName,fileName,directoryPath,className,importList,CAST(lineCount AS integer),CAST(methodCount AS integer),CAST(variableCount AS integer),CAST(constantCount AS integer)
FROM ast_source_file_level_tmp
ORDER BY appName,fileName,directoryPath,className,importList
;