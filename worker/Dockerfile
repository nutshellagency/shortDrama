FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# ffmpeg: video processing
# libgl1/libglib: required by opencv-python-headless (used in MediaPipe)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create content directory structure
RUN mkdir -p /content/raw /content/processed

# Start the worker
CMD ["python", "main.py"]
