CREATE VIEW IF NOT EXISTS v_all_ast_field_level AS
SELECT n,language,filePath,className,methodName,fieldKind,fieldName,fieldType,isFinal,validationMin,validationMax,nullable,rawAnnotations
FROM ast_field_level
ORDER BY n,filePath,className,methodName,fieldKind,fieldName,fieldType
;