CREATE TABLE IF NOT EXISTS lang_data_models(
    n int primary key,
    language text,
    data_model text,
    memo text,
    conv_model text,
    min_value int,
    max_value int
);