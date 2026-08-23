INSERT INTO ast_field_level(language,filePath,className,methodName,fieldKind,fieldName,fieldType,isFinal,validationMin,validationMax,nullable,rawAnnotations)
SELECT (SELECT lang FROM v_select_lang LIMIT 1) AS language,filePath,className,methodName,fieldKind,fieldName,fieldType,CAST(isFinal AS integer),CAST(validationMin AS integer),CAST(validationMax AS integer),CAST(nullable AS integer),rawAnnotations
FROM ast_field_level_tmp
ORDER BY filePath,className,methodName,fieldKind,fieldName,fieldType
;