CREATE TABLE IF NOT EXISTS return_data(
    n integer PRIMARY KEY,
    filePath text,
    className text,
    methodName text,
    process1 integer,
    rawType text,
    convModel text,
    objectRootId integer
)
;