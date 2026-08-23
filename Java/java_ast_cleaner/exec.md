# 実行方法

```bash
mvn clean package
java -jar target/java-ast-cleaner-1.0.0-with-dependencies.jar ./config.json
```

出力先には以下を生成する。

- importlist_data.csv
- enum_data.csv
- args_data.csv
- field_data.csv
- dto_data.csv
- object_data.csv
- return_data.csv
