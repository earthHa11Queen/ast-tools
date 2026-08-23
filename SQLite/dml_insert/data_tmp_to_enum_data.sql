INSERT INTO enum_data(n,filePath,enumName,enumIndex,enumValue,convModel)
SELECT CAST(n AS integer),filePath,enumName,CAST(enumIndex AS integer),enumValue,convModel
FROM enum_data_tmp
;