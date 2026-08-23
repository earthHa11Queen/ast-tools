INSERT INTO field_data(n,filePath,className,fieldName,rawType,convModel,isFinal,validationMin,validationMax,nullable,rawAnnotations,objectRootId)
SELECT CAST(n AS integer),filePath,className,fieldName,rawType,convModel,CAST(isFinal AS integer),CAST(validationMin AS integer),CAST(validationMax AS integer),CAST(nullable AS integer),rawAnnotations,CAST(objectRootId AS integer)
FROM field_data_tmp
;