CREATE TABLE IF NOT EXISTS object_data(
    objectId integer PRIMARY KEY,
    parentObjectId integer,
    ownerKind text,
    filePath text,
    className text,
    methodName text,
    ownerName text,
    ownerIndex integer,
    position text,
    rawType text,
    baseType text,
    convModel text,
    referenceType text
);