CREATE TABLE IF NOT EXISTS ast_source_file_level(
    n integer PRIMARY KEY,
    language text,
    appName text,
    fileName text,
    directoryPath text,
    className text,
    importList text,
    lineCount integer,
    methodCount integer,
    variableCount integer,
    constantCount integer
);