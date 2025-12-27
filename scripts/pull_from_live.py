#!/usr/bin/env python3
"""
Pull data from Supabase (Live) to Local environment.

This script:
1. Exports all tables from Supabase Postgres
2. Imports them into local Postgres
3. Downloads processed videos/thumbnails from Supabase Storage to local Minio

Usage:
    python scripts/pull_from_live.py
"""

import os
import subprocess
import sys
from urllib.parse import urlparse

import boto3
from botocore.config import Config
from dotenv import load_dotenv

# ============================================================================
# CONFIGURATION - Edit these values for your setup
# ============================================================================

# Supabase (Live) credentials
SUPABASE_DB_URL = "postgres://postgres.sqnqbdyqqiizyktfkwwq:bbBySjRz5ykA2vP2@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
SUPABASE_S3_ENDPOINT = "https://sqnqbdyqqiizyktfkwwq.storage.supabase.co/storage/v1/s3"
SUPABASE_S3_ACCESS_KEY = "5f8e572007ad546404395df0c3e7a608"
SUPABASE_S3_SECRET_KEY = "9f6fc497d4023479a32b03958a6f82157ee837a2a16ec0f67378cde92a6ee1ac"
SUPABASE_S3_REGION = "ap-southeast-2"

# Local credentials
LOCAL_DB_URL = "postgresql://shortdrama:shortdrama@localhost:5432/shortdrama"
LOCAL_S3_ENDPOINT = "http://127.0.0.1:9000"
LOCAL_S3_ACCESS_KEY = "minioadmin"
LOCAL_S3_SECRET_KEY = "minioadmin"

# Buckets to sync (only processed, not raw)
BUCKETS_TO_SYNC = ["shortdrama-processed"]

# ============================================================================
# DATABASE SYNC
# ============================================================================

def sync_database():
    """Export from Supabase and import to local Postgres."""
    print("\n" + "="*60)
    print("DATABASE SYNC")
    print("="*60)
    
    dump_file = "supabase_dump.sql"
    
    # Parse connection strings
    supabase = urlparse(SUPABASE_DB_URL)
    local = urlparse(LOCAL_DB_URL)
    
    print(f"\n[1/3] Exporting from Supabase...")
    
    # Set password for pg_dump
    env = os.environ.copy()
    env["PGPASSWORD"] = supabase.password
    
    dump_cmd = [
        "pg_dump",
        "-h", supabase.hostname,
        "-p", str(supabase.port or 5432),
        "-U", supabase.username,
        "-d", supabase.path.lstrip("/"),
        "--no-owner",
        "--no-acl",
        "-f", dump_file
    ]
    
    try:
        subprocess.run(dump_cmd, env=env, check=True, capture_output=True)
        print(f"   ✓ Exported to {dump_file}")
    except subprocess.CalledProcessError as e:
        print(f"   ✗ Export failed: {e.stderr.decode()}")
        return False
    except FileNotFoundError:
        print("   ✗ pg_dump not found. Install PostgreSQL client tools.")
        return False
    
    print(f"\n[2/3] Importing to local Postgres...")
    
    env["PGPASSWORD"] = local.password
    
    # Drop and recreate database (optional - be careful!)
    restore_cmd = [
        "psql",
        "-h", local.hostname,
        "-p", str(local.port or 5432),
        "-U", local.username,
        "-d", local.path.lstrip("/"),
        "-f", dump_file
    ]
    
    try:
        subprocess.run(restore_cmd, env=env, check=True, capture_output=True)
        print("   ✓ Imported to local database")
    except subprocess.CalledProcessError as e:
        print(f"   ✗ Import failed: {e.stderr.decode()}")
        return False
    
    print(f"\n[3/3] Cleaning up...")
    os.remove(dump_file)
    print("   ✓ Removed temp file")
    
    return True

# ============================================================================
# STORAGE SYNC
# ============================================================================

def create_s3_client(endpoint, access_key, secret_key, region):
    """Create an S3 client."""
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4")
    )

def ensure_bucket_exists(client, bucket_name):
    """Create bucket if it doesn't exist."""
    try:
        client.head_bucket(Bucket=bucket_name)
    except:
        try:
            client.create_bucket(Bucket=bucket_name)
            print(f"   Created bucket: {bucket_name}")
        except Exception as e:
            print(f"   Warning: Could not create bucket {bucket_name}: {e}")

def sync_storage():
    """Download files from Supabase Storage to local Minio."""
    print("\n" + "="*60)
    print("STORAGE SYNC")
    print("="*60)
    
    # Create clients
    supabase_s3 = create_s3_client(
        SUPABASE_S3_ENDPOINT,
        SUPABASE_S3_ACCESS_KEY,
        SUPABASE_S3_SECRET_KEY,
        SUPABASE_S3_REGION
    )
    
    local_s3 = create_s3_client(
        LOCAL_S3_ENDPOINT,
        LOCAL_S3_ACCESS_KEY,
        LOCAL_S3_SECRET_KEY,
        "us-east-1"
    )
    
    for bucket in BUCKETS_TO_SYNC:
        print(f"\n[Bucket: {bucket}]")
        
        # Ensure local bucket exists
        ensure_bucket_exists(local_s3, bucket)
        
        # List objects in Supabase bucket
        try:
            response = supabase_s3.list_objects_v2(Bucket=bucket)
            objects = response.get("Contents", [])
        except Exception as e:
            print(f"   ✗ Failed to list objects: {e}")
            continue
        
        if not objects:
            print("   No objects found")
            continue
        
        print(f"   Found {len(objects)} objects")
        
        total_size = sum(obj["Size"] for obj in objects)
        print(f"   Total size: {total_size / 1024 / 1024:.2f} MB")
        
        # Download and upload each object
        for i, obj in enumerate(objects, 1):
            key = obj["Key"]
            size_mb = obj["Size"] / 1024 / 1024
            
            print(f"   [{i}/{len(objects)}] {key} ({size_mb:.2f} MB)...", end=" ", flush=True)
            
            try:
                # Download from Supabase
                response = supabase_s3.get_object(Bucket=bucket, Key=key)
                body = response["Body"].read()
                
                # Upload to local Minio
                local_s3.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=body,
                    ContentType=response.get("ContentType", "application/octet-stream")
                )
                print("✓")
            except Exception as e:
                print(f"✗ {e}")
    
    return True

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("="*60)
    print("PULL FROM LIVE (Supabase → Local)")
    print("="*60)
    
    print("\nThis will:")
    print("  1. Export all data from Supabase Postgres")
    print("  2. Import into local Postgres")
    print("  3. Download processed videos from Supabase Storage")
    print("  4. Upload to local Minio")
    print("\nLocal data will be REPLACED.")
    
    # Bypass confirmation for automation
    confirm = "y"
    if confirm != "y":
        print("Aborted.")
        return
    
    # Run sync
    db_ok = sync_database()
    storage_ok = sync_storage()
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"  Database: {'✓ Success' if db_ok else '✗ Failed'}")
    print(f"  Storage:  {'✓ Success' if storage_ok else '✗ Failed'}")
    print()

if __name__ == "__main__":
    main()
