CREATE TABLE IF NOT EXISTS importlist_data(
    n int primary key,
    appName text,
    fileName text,
    directoryPath text,
    importList text
);