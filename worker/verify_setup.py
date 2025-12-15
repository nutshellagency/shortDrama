"""
Worker Setup Verification Script
Run this to verify all dependencies and configuration are correct.
"""

import sys
import subprocess
import os

def check_python():
    """Check Python version"""
    version = sys.version_info
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("  ⚠ Warning: Python 3.8+ recommended")
        return False
    return True

def check_ffmpeg():
    """Check FFmpeg installation"""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            # Extract version from first line
            first_line = result.stdout.split('\n')[0]
            print(f"✓ FFmpeg installed: {first_line}")
            return True
        else:
            print("✗ FFmpeg not working properly")
            return False
    except FileNotFoundError:
        print("✗ FFmpeg not found in PATH")
        print("  Install from: https://ffmpeg.org/download.html")
        return False
    except Exception as e:
        print(f"✗ FFmpeg check failed: {e}")
        return False

def check_package(package_name):
    """Check if a Python package is installed"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False

def check_packages():
    """Check all required Python packages"""
    required = [
        ("boto3", "AWS S3 client"),
        ("requests", "HTTP client"),
        ("mediapipe", "AI face detection"),
        ("cv2", "OpenCV (opencv-python-headless)"),
        ("numpy", "Numerical operations"),
        ("yt_dlp", "Video downloader"),
        ("dotenv", "Environment loader (python-dotenv)"),
    ]
    
    all_ok = True
    for package, description in required:
        if check_package(package):
            print(f"✓ {package:20s} - {description}")
        else:
            print(f"✗ {package:20s} - {description} (MISSING)")
            all_ok = False
    
    return all_ok

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    
    if not os.path.exists(env_path):
        print("✗ .env file not found")
        print("  Copy .env.template to .env and fill in your values")
        return False
    
    print("✓ .env file exists")
    
    # Check for required variables
    required_vars = [
        "API_BASE_URL",
        "WORKER_TOKEN",
        "SUPABASE_URL",
        "S3_ENDPOINT",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        "S3_BUCKET_RAW",
        "S3_BUCKET_PROCESSED",
    ]
    
    from dotenv import load_dotenv
    load_dotenv(env_path)
    
    missing = []
    placeholder = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing.append(var)
        elif "your-" in value or "your_" in value:
            placeholder.append(var)
    
    if missing:
        print(f"  ⚠ Missing variables: {', '.join(missing)}")
    
    if placeholder:
        print(f"  ⚠ Placeholder values detected: {', '.join(placeholder)}")
        print("    Update these with your actual credentials")
    
    return len(missing) == 0

def main():
    print("=" * 60)
    print("ShortDrama Worker - Setup Verification")
    print("=" * 60)
    print()
    
    print("Checking System Requirements:")
    print("-" * 60)
    python_ok = check_python()
    ffmpeg_ok = check_ffmpeg()
    print()
    
    print("Checking Python Packages:")
    print("-" * 60)
    packages_ok = check_packages()
    print()
    
    print("Checking Configuration:")
    print("-" * 60)
    env_ok = check_env_file()
    print()
    
    print("=" * 60)
    if python_ok and ffmpeg_ok and packages_ok and env_ok:
        print("✓ All checks passed! Worker is ready to run.")
        print()
        print("To start the worker:")
        print("  python main.py")
    else:
        print("⚠ Some checks failed. Please fix the issues above.")
        print()
        if not packages_ok:
            print("To install missing packages:")
            print("  pip install -r requirements.txt")
        if not env_ok:
            print("To configure environment:")
            print("  1. Copy .env.template to .env")
            print("  2. Edit .env with your actual credentials")
    print("=" * 60)

if __name__ == "__main__":
    main()
