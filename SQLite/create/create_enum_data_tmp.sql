CREATE TABLE IF NOT EXISTS enum_data_tmp(
    n integer PRIMARY KEY,
    filePath text,
    enumName text,
    enumIndex integer,
    enumValue text,
    convModel text
);