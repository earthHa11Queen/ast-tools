#!/bin/bash
echo "Running TS/JS AST parser..."
cd tsjs_ast && npx ts-node main.ts

echo "Running Java AST parser..."
cd ../java_ast && mvn exec:java