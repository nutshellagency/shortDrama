import boto3
import json
import os
from botocore.exceptions import ClientError

# Minio Configuration (Local)
S3_ENDPOINT = "http://127.0.0.1:9000"
S3_ACCESS_KEY = "minioadmin"
S3_SECRET_KEY = "minioadmin"
BUCKET_NAME = "shortdrama-processed"

def set_public_policy():
    print(f"Connecting to Minio at {S3_ENDPOINT}...")
    s3 = boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )

    # Define Public Read Policy
    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicRead",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{BUCKET_NAME}/*"]
            }
        ]
    }

    try:
        # Check if bucket exists
        s3.head_bucket(Bucket=BUCKET_NAME)
        print(f"Bucket '{BUCKET_NAME}' found.")

        # Apply Policy
        policy_json = json.dumps(bucket_policy)
        s3.put_bucket_policy(Bucket=BUCKET_NAME, Policy=policy_json)
        print("✅ SUCCESS: Bucket is now PUBLIC.")
        print("You can tests this by uploading a file and accessing it via:")
        print(f"{S3_ENDPOINT}/{BUCKET_NAME}/<filename>")

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == "404":
            print(f"❌ Error: Bucket '{BUCKET_NAME}' does not exist.")
            print("Please create it in the Minio Console first.")
        else:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    set_public_policy()
