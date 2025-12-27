@echo off
set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin
:: Start MinIO using the D drive folder
minio.exe server D:\shortdrama_data --console-address :9001
