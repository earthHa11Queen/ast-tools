INSERT INTO lang_data_models(n,language,data_model,memo,conv_model,min_value,max_value)
SELECT CAST(n AS integer),language,data_model,memo,conv_model,CAST(min_value AS integer),CAST(max_value AS integer)
FROM lang_data_models_tmp
;