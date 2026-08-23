CREATE TABLE IF NOT EXISTS field_data(
    n integer PRIMARY KEY,
    filePath text,
    className text,
    fieldName text,
    rawType text,
    convModel text,
    isFinal integer,
    validationMin integer,
    validationMax integer,
    nullable  integer,
    rawAnnotations text,
    objectRootId integer
);