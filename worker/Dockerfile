FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg and OpenCV dependencies
# Note: libgl1 replaces libgl1-mesa-glx in newer Debian versions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY smart_crop.py .

CMD ["python", "main.py"]


