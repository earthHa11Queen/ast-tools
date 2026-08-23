INSERT INTO dto_data(n,filePath,dtoName,fieldName,rawType)
SELECT CAST(n AS integer),filePath,dtoName,fieldName,rawType
FROM dto_data_tmp
;