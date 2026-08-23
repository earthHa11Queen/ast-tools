CREATE VIEW IF NOT EXISTS v_all_lang_data_models AS
SELECT n,language,data_model,memo,conv_model,min_value,max_value
FROM lang_data_models
;