INSERT INTO importlist_data(n,appName,fileName,directoryPath,importList)
SELECT CAST(n AS integer),appName,fileName,directoryPath,importList
FROM importlist_data_tmp
;
