# Native Windows Development Guide (No Docker)

This guide explains how to set up the full ShortDrama environment on Windows 10 without using Docker.

## 1. Database: PostgreSQL

Since we cannot use the Docker container, you must install PostgreSQL directly on Windows.

1.  **Download**: [PostgreSQL for Windows (EnterpriseDB)](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
    *   Choose version **16** or **15**.
2.  **Install**:
    *   Run the installer.
    *   **Password**: When asked for a password for the superuser (`postgres`), enter `password` (or something simple you will remember).
    *   **Port**: Keep default `5432`.
3.  **Create Database**:
    *   Open **pgAdmin 4** (installed automatically) OR use SQL Shell (psql).
    *   **SQL Shell method**:
        *   Open Start Menu -> "SQL Shell (psql)".
        *   Press Enter for Server, Database, Port, Username defaults.
        *   Enter your password.
        *   Run command: `CREATE DATABASE shortdrama;`
        *   Run command: `\q` to exit.

4.  **Update `.env`**:
    *   In `server/.env`, set:
        ```ini
        DATABASE_URL="postgresql://postgres:password@localhost:5432/shortdrama?schema=public"
        ```
        *(Replace `password` with whatever you chose).*

## 2. Storage: Minio (Local S3)

We will use Minio as a single executable file to simulate AWS S3.

1.  **Download**:
    *   Download `minio.exe` from: [https://dl.min.io/server/minio/release/windows-amd64/minio.exe](https://dl.min.io/server/minio/release/windows-amd64/minio.exe)
    *   Move the file to your project root `d:\Projects\shortDrama\minio.exe` (or add it to your PATH).

2.  **Run Minio**:
    *   Open PowerShell in the project folder.
    *   Run the convenience script (see below) or:
        ```powershell
        .\minio.exe server .\data --console-address ":9001"
        ```
    *   This will create a `data` folder where files are stored.

3.  **Configure Buckets**:
    *   Open Browser: `http://127.0.0.1:9001`
    *   **Login**: User `minioadmin`, Pass `minioadmin`.
    *   **Create Buckets**:
        1.  Go to Buckets -> "Create Bucket" -> Name: `shortdrama-raw` -> Create.
        2.  Go to Buckets -> "Create Bucket" -> Name: `shortdrama-processed` -> Create.
    *   **Make Public** (Important for Viewer):
        1.  Click the `shortdrama-processed` bucket.
        2.  Click "Anonymous" (or Access Policy).
        3.  Set "Prefix" to `/` and "Access" to `App ReadOnly` (or Public).
        4.  Save.
        *(If specific UI differs, look for "Access Policy" -> "Public" / "Read Only").*

## 3. Worker & Server Configuration

1.  **Environment Variables**:
    Ensure your `server/.env` and `worker/.env` point to this local Minio:
    ```ini
    S3_ENDPOINT=http://127.0.0.1:9000
    S3_REGION=us-east-1
    S3_ACCESS_KEY=minioadmin
    S3_SECRET_KEY=minioadmin
    S3_BUCKET_RAW=shortdrama-raw
    S3_BUCKET_PROCESSED=shortdrama-processed
    PUBLIC_S3_BASE_URL=http://127.0.0.1:9000/shortdrama-processed
    ```

## 4. Running the App (No Docker)

We have updated `package.json` with a "native" script.

1.  **Start Minio**:
    ```bash
    npm run native:minio
    ```
    *(Keep this window open)*

2.  **Start App**:
    ```bash
    npm run dev:all
    # Note: Requires 'concurrently'. If run dev:all fails on "docker" command,
    # you can run server and viewer separately in new terminals:
    # Term 1: cd server && npm run dev
    # Term 2: cd viewer && npm run dev
    # Term 3: cd worker && python main.py
    ```
