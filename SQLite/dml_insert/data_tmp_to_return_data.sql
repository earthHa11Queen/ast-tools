INSERT INTO return_data(n,filePath,className,methodName,process1,rawType,convModel,objectRootId)
SELECT CAST(n AS integer),filePath,className,methodName,CAST(process1 AS integer),rawType,convModel,CAST(objectRootId AS integer)
FROM return_data_tmp
;