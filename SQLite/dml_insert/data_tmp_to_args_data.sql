INSERT INTO args_data(n,filePath,className,methodName,process1,argIndex,argName,argRaw,rawType,convModel,validationMin,validationMax,nullable,rawAnnotations,objectRootId)
SELECT CAST(n AS integer),filePath,className,methodName,CAST(process1 AS integer),CAST(argIndex AS integer),argName,argRaw,rawType,convModel,CAST(validationMin AS integer),CAST(validationMax AS integer),CAST(nullable AS integer),rawAnnotations,CAST(objectRootId AS integer)
FROM args_data_tmp
;