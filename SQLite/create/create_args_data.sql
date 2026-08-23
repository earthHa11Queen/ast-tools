CREATE TABLE IF NOT EXISTS args_data(
    n integer PRIMARY KEY,
    filePath text,
    className text,
    methodName text,
    process1 integer,
    argIndex integer,
    argName text,
    argRaw text,
    rawType text,
    convModel text,
    validationMin integer,
    validationMax integer,
    nullable integer,
    rawAnnotations text,
    objectRootId integer
)
;