CREATE TABLE IF NOT EXISTS ast_field_level(
    n integer PRIMARY KEY,
    language text,
    filePath text,
    className text,
    methodName text,
    fieldKind text,
    fieldName text,
    fieldType text,
    isFinal integer,
    validationMin integer,
    validationMax integer,
    nullable integer,
    rawAnnotations text
);