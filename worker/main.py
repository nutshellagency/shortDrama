import json
import os
import subprocess
import tempfile
import time
from datetime import datetime

import boto3
import requests
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

# Smart crop module for AI-powered face-tracking crop
try:
    from smart_crop import smart_crop_video
    SMART_CROP_AVAILABLE = True
    print("[Worker] Smart crop module loaded successfully", flush=True)
except ImportError as e:
    SMART_CROP_AVAILABLE = False
    print(f"[Worker] Smart crop not available (fallback to center crop): {e}", flush=True)


API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:3000").rstrip("/")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")

S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "http://localhost:9000")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "minioadmin")
S3_BUCKET_RAW = os.environ.get("S3_BUCKET_RAW", "shortdrama-raw")
S3_BUCKET_PROCESSED = os.environ.get("S3_BUCKET_PROCESSED", "shortdrama-processed")

# FFmpeg path - try system PATH first, fallback to common Windows location
FFMPEG_PATH = "ffmpeg"  # Default: use PATH
if os.name == 'nt' and not os.system("where ffmpeg >nul 2>&1"):  # Windows
    # Check if ffmpeg is in PATH, if not use hardcoded path
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        if os.path.exists(r"C:\ffmpeg\bin\ffmpeg.exe"):
            FFMPEG_PATH = r"C:\ffmpeg\bin\ffmpeg.exe"
            print(f"[Worker] Using FFmpeg from: {FFMPEG_PATH}", flush=True)


def s3_client():
    return boto3.client(
        "s3",
        region_name=S3_REGION,
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )


def claim_job():
    r = requests.post(
        f"{API_BASE_URL}/worker/jobs/claim",
        headers={"Authorization": f"Bearer {WORKER_TOKEN}"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json().get("job")


def job_fail(job_id: str, error: str):
    requests.post(
        f"{API_BASE_URL}/worker/jobs/{job_id}/fail",
        headers={"Authorization": f"Bearer {WORKER_TOKEN}", "Content-Type": "application/json"},
        data=json.dumps({"error": error[:4000]}),
        timeout=20,
    ).raise_for_status()


def job_complete(job_id: str, payload: dict):
    requests.post(
        f"{API_BASE_URL}/worker/jobs/{job_id}/complete",
        headers={"Authorization": f"Bearer {WORKER_TOKEN}", "Content-Type": "application/json"},
        data=json.dumps(payload),
        timeout=20,
    ).raise_for_status()

def job_progress(job_id: str, progress_pct: int, stage: str, message: str | None = None):
    data = {"progressPct": int(progress_pct), "stage": stage}
    if message:
        data["message"] = message
    try:
        requests.post(
            f"{API_BASE_URL}/worker/jobs/{job_id}/progress",
            headers={"Authorization": f"Bearer {WORKER_TOKEN}", "Content-Type": "application/json"},
            data=json.dumps(data),
            timeout=10,
        ).raise_for_status()
    except Exception:
        # best-effort
        pass


def run(cmd: list[str]):
    # Replace 'ffmpeg' with FFMPEG_PATH if needed
    if cmd and cmd[0] == "ffmpeg":
        cmd = [FFMPEG_PATH] + cmd[1:]
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed ({p.returncode}): {' '.join(cmd)}\n{p.stdout}")
    return p.stdout


def ffprobe_duration_sec(path: str) -> int | None:
    """
    Get video duration using ffmpeg (more reliable than ffprobe on Windows).
    """
    try:
        print(f"[DEBUG] Running ffmpeg to detect duration: {path}", flush=True)
        
        # Use ffmpeg -i to get file info (outputs to stderr)
        result = subprocess.run(
            [FFMPEG_PATH, "-i", path],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # Parse duration from stderr (format: Duration: HH:MM:SS.ms)
        output = result.stderr
        print(f"[DEBUG] ffmpeg output length: {len(output)} chars", flush=True)
        
        import re
        duration_match = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', output)
        
        if duration_match:
            hours = int(duration_match.group(1))
            minutes = int(duration_match.group(2))
            seconds = float(duration_match.group(3))
            total_seconds = hours * 3600 + minutes * 60 + seconds
            duration = max(1, int(total_seconds))
            print(f"[DEBUG] Detected duration: {hours}h {minutes}m {seconds:.1f}s = {duration} seconds", flush=True)
            return duration
        else:
            print(f"[DEBUG] Could not parse duration from ffmpeg output", flush=True)
            # Try to show first 500 chars of output for debugging
            print(f"[DEBUG] First 500 chars: {output[:500]}", flush=True)
            return None
        
    except subprocess.TimeoutExpired:
        print(f"[DEBUG] ffmpeg timeout after 30s", flush=True)
        return None
    except FileNotFoundError:
        print(f"[DEBUG] ffmpeg not found in PATH", flush=True)
        return None
    except Exception as e:
        print(f"[DEBUG] ffmpeg exception: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return None


def get_smart_crop_filter(input_path: str, job_id: str, report_progress: bool = True) -> str:
    """
    Analyze video and get smart crop filter using MediaPipe face detection.
    Falls back to center crop if smart crop is not available or fails.
    """
    default_filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    
    if not SMART_CROP_AVAILABLE:
        print(f"[Worker] Job {job_id}: Using default center crop (smart crop not available)", flush=True)
        return default_filter
    
    try:
        print(f"[Worker] Job {job_id}: Analyzing video for smart crop...", flush=True)
        
        def progress_cb(pct, stage):
            if report_progress:
                job_progress(job_id, max(1, pct // 2), f"smart_crop_{stage}")
        
        result = smart_crop_video(
            input_path,
            None,  # We don't output directly, just get the filter
            target_width=1080,
            target_height=1920,
            progress_callback=progress_cb
        )
        
        crop_filter = result.get("filter")
        strategy = result.get("strategy", "unknown")
        
        print(f"[Worker] Job {job_id}: Smart crop strategy: {strategy}", flush=True)
        print(f"[Worker] Job {job_id}: Using filter: {crop_filter}", flush=True)
        
        if crop_filter:
            return crop_filter
        else:
            print(f"[Worker] Job {job_id}: Smart crop returned no filter, using default", flush=True)
            return default_filter
            
    except Exception as e:
        print(f"[Worker] Job {job_id}: Smart crop failed ({e}), using center crop", flush=True)
        return default_filter


def get_ffmpeg_encoder():
    """
    Check if NVIDIA GPU acceleration (NVENC) is available.
    """
    try:
        # Quick check for nvenc support
        result = subprocess.run([FFMPEG_PATH, "-encoders"], capture_output=True, text=True)
        if "h264_nvenc" in result.stdout:
            print("[Worker] NVIDIA GPU acceleration (NVENC) detected! Using GPU for encoding.", flush=True)
            return "h264_nvenc"
    except:
        pass
    print("[Worker] GPU acceleration not detected. Using CPU (libx264) for encoding.", flush=True)
    return "libx264"


def process_video(
    job_id: str,
    input_path: str,
    out_dir: str,
    start_sec: int | None = None,
    duration_sec: int | None = None,
    report_progress: bool = True,
):
    os.makedirs(out_dir, exist_ok=True)
    out_mp4 = os.path.join(out_dir, "vertical.mp4")
    out_jpg = os.path.join(out_dir, "thumb.jpg")
    out_srt = os.path.join(out_dir, "subs.srt")
    out_json = os.path.join(out_dir, "meta.json")

    duration_sec_in = duration_sec or ffprobe_duration_sec(input_path) or 1
    encoder = get_ffmpeg_encoder()

    # For segments with start_sec, we need to extract the segment first before analyzing
    # This ensures smart crop analyzes the actual content being cropped
    segment_input = input_path
    temp_segment = None
    
    if start_sec is not None and start_sec > 0:
        # Extract segment to a temp file for analysis
        temp_segment = os.path.join(out_dir, "temp_segment.mp4")
        extract_cmd = ["ffmpeg", "-y", "-i", input_path, "-ss", str(int(start_sec))]
        if duration_sec is not None and duration_sec > 0:
            extract_cmd += ["-t", str(int(duration_sec))]
        extract_cmd += ["-c", "copy", temp_segment]
        
        try:
            run(extract_cmd)
            segment_input = temp_segment
        except Exception as e:
            print(f"[Worker] Job {job_id}: Segment extraction failed, using original: {e}", flush=True)
    
    # Get smart crop filter (analyzes faces in video)
    video_filter = get_smart_crop_filter(segment_input, job_id, report_progress)

    # Encode with progress
    # Hardware acceleration flags added
    cmd = ["ffmpeg", "-y"]
    if encoder == "h264_nvenc":
        cmd += ["-hwaccel", "auto"] # Auto-detect hardware decoder
    
    cmd += ["-i", input_path]
    
    if start_sec is not None and start_sec > 0:
        cmd += ["-ss", str(int(start_sec))]
    if duration_sec is not None and duration_sec > 0:
        cmd += ["-t", str(int(duration_sec))]
    
    cmd += [
        "-vf", video_filter,
        "-c:v", encoder,
    ]

    if encoder == "h264_nvenc":
        cmd += ["-preset", "p4", "-tune", "hq"] # High quality GPU presets
    else:
        cmd += ["-preset", "veryfast", "-crf", "23"]

    cmd += [
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-progress", "pipe:1",
        "-nostats",
        out_mp4,
    ]

    if report_progress:
        job_progress(job_id, 1, "encoding", "starting ffmpeg")
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    last_pct = 0
    if p.stdout:
        for line in p.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    out_ms = int(line.split("=", 1)[1])
                    out_sec = out_ms / 1_000_000.0
                    pct = int(min(99, max(0, (out_sec / duration_sec_in) * 100)))
                    if report_progress and pct >= last_pct + 2:  # reduce spam
                        last_pct = pct
                        job_progress(job_id, pct, "encoding")
                except Exception:
                    pass
            elif line.startswith("progress=end"):
                break
    rc = p.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg failed with code {rc}")
    if report_progress:
        job_progress(job_id, 100, "encoding_done")

    # Dummy subtitles for POC
    with open(out_srt, "w", encoding="utf-8") as f:
        f.write("1\n00:00:00,000 --> 00:00:02,000\n(POC subtitles)\n")

    duration_sec = ffprobe_duration_sec(out_mp4)
    if not duration_sec:
        raise RuntimeError("encoded segment has no duration (empty output)")

    # Smart thumbnail generation: analyze multiple frames and select the best one
    try:
        from smart_thumbnail import generate_smart_thumbnail
        
        print(f"[Worker] Job {job_id}: Generating smart thumbnail...", flush=True)
        thumbnail_result = generate_smart_thumbnail(
            video_path=out_mp4,
            output_dir=out_dir,
            target_width=1080,
            target_height=1920,
            job_id=job_id,
            progress_callback=None  # Could enable if needed
        )
        
        if "error" in thumbnail_result:
            print(f"[Worker] Job {job_id}: Smart thumbnail failed, using fallback", flush=True)
            # Fallback to simple middle-frame extraction (using time)
            midpoint = (duration_sec or 1) / 2
            run(["ffmpeg", "-y", "-ss", str(midpoint), "-i", out_mp4, "-frames:v", "1", "-q:v", "2", out_jpg])
        else:
            # Smart thumbnail succeeded - file already saved as thumb.jpg
            print(f"[Worker] Job {job_id}: Smart thumbnail generated successfully", flush=True)
            print(f"[Worker] Job {job_id}:   Strategy: {thumbnail_result.get('strategy')}", flush=True)
            print(f"[Worker] Job {job_id}:   Score: {thumbnail_result['metadata'].get('best_score', 0):.1f}/100", flush=True)
            
    except Exception as e:
        print(f"[Worker] Job {job_id}: Smart thumbnail error ({e}), using fallback", flush=True)
        # Fallback: extract frame from middle of video instead of first frame
        midpoint = (duration_sec or 1) / 2
        run(["ffmpeg", "-y", "-ss", str(midpoint), "-i", out_mp4, "-frames:v", "1", "-q:v", "2", out_jpg])
    mm = (duration_sec or 1) // 60
    ss = (duration_sec or 1) % 60

    meta = {
        "episode_title": "POC Episode",
        "duration": f"{mm:02d}:{ss:02d}",
        "language": "ur",
        "thumbnail": "thumb_url",
        "video": "cdn_video_url",
        "subtitles": "srt_url",
    }
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    # Cleanup temp segment file if created
    if temp_segment and os.path.exists(temp_segment):
        try:
            os.remove(temp_segment)
        except Exception:
            pass

    return out_mp4, out_jpg, out_srt, out_json, duration_sec


def upload_file(s3, bucket: str, key: str, path: str, content_type: str | None = None):
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    with open(path, "rb") as f:
        s3.put_object(Bucket=bucket, Key=key, Body=f, **extra)


def download_from_url(url: str, dest_path: str):
    # Check if it looks like a YouTube URL or similar that yt-dlp supports
    is_supported_site = any(x in url for x in ["youtube.com", "youtu.be", "tiktok.com", "instagram.com"])
    
    if is_supported_site:
        print(f"[Worker] Downloading with yt-dlp: {url}", flush=True)
        
        # Create a unique download folder to isolate this download
        download_dir = os.path.dirname(dest_path)
        download_subdir = os.path.join(download_dir, "ytdl_temp")
        os.makedirs(download_subdir, exist_ok=True)
        
        # Clear any previous files in the temp folder
        for f in os.listdir(download_subdir):
            try:
                os.remove(os.path.join(download_subdir, f))
            except:
                pass
        
        # yt-dlp output template - just use 'video' as the base name
        output_template = os.path.join(download_subdir, "video.%(ext)s")
        
        # Use a format that gives a single pre-muxed file to avoid FFmpeg merge issues
        # 'best[ext=mp4]' gets the best single MP4 stream (video+audio in one file)
        # Fallback to 'best' if mp4 not available
        cmd = [
            "yt-dlp",
            "-o", output_template,
            "-f", "best[ext=mp4]/best",  # Single file, no merge needed
            "--no-playlist",
            "--no-warnings",
            url
        ]
        
        print(f"[Worker] Running: {' '.join(cmd)}", flush=True)
        run(cmd)
        
        # Find the downloaded file - scan for any video file in the temp folder
        video_extensions = [".mp4", ".mkv", ".webm", ".avi", ".mov"]
        downloaded_file = None
        
        print(f"[Worker] Scanning {download_subdir} for video files...", flush=True)
        for f in os.listdir(download_subdir):
            print(f"[Worker]   Found: {f}", flush=True)
            if any(f.lower().endswith(ext) for ext in video_extensions):
                downloaded_file = os.path.join(download_subdir, f)
                break
        
        if downloaded_file and os.path.exists(downloaded_file):
            file_size = os.path.getsize(downloaded_file)
            print(f"[Worker] Moving {downloaded_file} -> {dest_path} ({file_size} bytes)", flush=True)
            # Use shutil.move for cross-drive compatibility on Windows
            import shutil
            shutil.move(downloaded_file, dest_path)
            print(f"[Worker] Downloaded successfully: {dest_path}", flush=True)
        else:
            # List what's in the directory for debugging
            all_files = os.listdir(download_subdir) if os.path.exists(download_subdir) else []
            raise RuntimeError(f"yt-dlp download completed but no video file found. Files in {download_subdir}: {all_files}")
    else:
        print(f"[Worker] Downloading with requests: {url}", flush=True)
        with requests.get(url, stream=True) as r:
            r.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)


def split_series(job: dict):
    job_id = job["id"]
    raw_key = job.get("rawKey")
    seg = int(job.get("seriesEpisodeDurationSec") or 180)

    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    workdir = os.path.join(tempfile.gettempdir(), f"job_{job_id}")
    os.makedirs(workdir, exist_ok=True)
    input_path = os.path.join(workdir, "input.mp4")  # Use .mp4 extension for ffprobe

    s3 = s3_client()

    print("job_claimed_split:", job_id, "raw_key=", raw_key, "seg=", seg, flush=True)
    job_progress(job_id, 0, "downloading")
    if raw_key.startswith("http"):
        download_from_url(raw_key, input_path)
    else:
        s3.download_file(S3_BUCKET_RAW, raw_key, input_path)
    job_progress(job_id, 1, "downloaded")

    # Debug: Check file exists and its size
    if os.path.exists(input_path):
        file_size = os.path.getsize(input_path)
        print(f"[DEBUG] Input file exists: {input_path} ({file_size} bytes)", flush=True)
    else:
        print(f"[DEBUG] ERROR: Input file NOT found at {input_path}", flush=True)
        # List files in workdir
        print(f"[DEBUG] Files in {workdir}: {os.listdir(workdir)}", flush=True)
        raise RuntimeError(f"Downloaded file not found at {input_path}")

    total_sec = ffprobe_duration_sec(input_path) or 1
    print(f"[DEBUG] ffprobe_duration_sec result: {total_sec} seconds", flush=True)
    
    seg = max(30, seg)
    count = max(1, int((total_sec + seg - 1) // seg))
    
    print(f"[DEBUG] Segment length: {seg}s, Total duration: {total_sec}s, Episode count: {count}", flush=True)
    
    # Respect max episodes limit from job payload
    max_eps = int(job.get("seriesMaxEpisodes") or 50)
    if count > max_eps:
        print(f"Limiting count {count} to max {max_eps}", flush=True)
        count = max_eps

    segments_payload = []
    for i in range(count):
        ep_no = i + 1
        start = i * seg
        remaining = total_sec - start
        if remaining <= 0:
            break
        dur = min(seg, remaining)
        # Avoid creating a near-empty trailing episode (common with slightly-over durations).
        if dur < 15:
            break

        out_dir = os.path.join(workdir, f"out_{ep_no:03d}")
        job_progress(job_id, max(1, int((i / count) * 100)), f"split_encoding_ep_{ep_no}/{count}")

        try:
            print(f"[DEBUG] Processing episode {ep_no}: start={start}s, duration={dur}s", flush=True)
            out_mp4, out_jpg, out_srt, out_json, duration_sec = process_video(
                job_id, input_path, out_dir, start_sec=start, duration_sec=dur, report_progress=False
            )
            print(f"[DEBUG] Episode {ep_no} processed successfully", flush=True)
        except Exception as e:
            print(f"[ERROR] Failed to process episode {ep_no}: {e}", flush=True)
            import traceback
            traceback.print_exc()
            raise

        base_key = f"processed/{job_id}_{stamp}_ep{ep_no:03d}"
        video_key = f"{base_key}.mp4"
        thumb_key = f"{base_key}.jpg"
        subs_key = f"{base_key}.srt"
        meta_key = f"{base_key}.json"

        upload_file(s3, S3_BUCKET_PROCESSED, video_key, out_mp4, "video/mp4")
        upload_file(s3, S3_BUCKET_PROCESSED, thumb_key, out_jpg, "image/jpeg")
        upload_file(s3, S3_BUCKET_PROCESSED, subs_key, out_srt, "application/x-subrip")
        upload_file(s3, S3_BUCKET_PROCESSED, meta_key, out_json, "application/json")

        segments_payload.append(
            {
                "episodeNumber": ep_no,
                "videoKey": video_key,
                "thumbnailKey": thumb_key,
                "subtitlesKey": subs_key,
                "metadataKey": meta_key,
                "durationSec": int(duration_sec or dur or seg),
            }
        )

        job_progress(job_id, int(min(99, ((i + 1) / count) * 100)), f"split_uploaded_ep_{ep_no}/{count}")

    job_progress(job_id, 100, "uploaded")
    job_complete(job_id, {"segments": segments_payload})
    print("job_completed_split:", job_id, "episodes=", len(segments_payload), flush=True)


def main():
    if not WORKER_TOKEN:
        raise RuntimeError("WORKER_TOKEN is required")
    s3 = s3_client()

    while True:
        job = None
        try:
            job = claim_job()
        except Exception as e:
            print("claim_job_error:", e, flush=True)
            time.sleep(3)
            continue

        if not job:
            time.sleep(2)
            continue

        job_id = job["id"]
        raw_key = job.get("rawKey")
        kind = job.get("kind") or "ENCODE_ONE"
        if not raw_key:
            job_fail(job_id, "Missing rawKey on job")
            continue

        if kind == "SPLIT_SERIES":
            try:
                split_series(job)
            except Exception as e:
                print("job_failed_split:", job_id, e, flush=True)
                try:
                    job_progress(job_id, 0, "failed", str(e))
                    job_fail(job_id, str(e))
                except Exception as e2:
                    print("job_fail_callback_error:", e2, flush=True)
            continue

        stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        workdir = os.path.join(tempfile.gettempdir(), f"job_{job_id}")
        os.makedirs(workdir, exist_ok=True)
        input_path = os.path.join(workdir, "input.mp4")  # Use .mp4 extension for ffprobe

        try:
            # Download raw video
            print("job_claimed:", job_id, "raw_key=", raw_key, flush=True)
            job_progress(job_id, 0, "downloading")
            if raw_key.startswith("http"):
                download_from_url(raw_key, input_path)
            else:
                s3.download_file(S3_BUCKET_RAW, raw_key, input_path)
            job_progress(job_id, 1, "downloaded")

            out_mp4, out_jpg, out_srt, out_json, duration_sec = process_video(job_id, input_path, os.path.join(workdir, "out"))

            base = f"processed/{job_id}_{stamp}"
            video_key = f"{base}.mp4"
            thumb_key = f"{base}.jpg"
            subs_key = f"{base}.srt"
            meta_key = f"{base}.json"

            upload_file(s3, S3_BUCKET_PROCESSED, video_key, out_mp4, "video/mp4")
            upload_file(s3, S3_BUCKET_PROCESSED, thumb_key, out_jpg, "image/jpeg")
            upload_file(s3, S3_BUCKET_PROCESSED, subs_key, out_srt, "application/x-subrip")
            upload_file(s3, S3_BUCKET_PROCESSED, meta_key, out_json, "application/json")

            job_progress(job_id, 100, "uploaded")
            job_complete(
                job_id,
                {
                    "videoKey": video_key,
                    "thumbnailKey": thumb_key,
                    "subtitlesKey": subs_key,
                    "metadataKey": meta_key,
                    "durationSec": duration_sec or 1,
                },
            )
            print("job_completed:", job_id, flush=True)
        except Exception as e:
            print("job_failed:", job_id, e, flush=True)
            try:
                job_progress(job_id, 0, "failed", str(e))
                job_fail(job_id, str(e))
            except Exception as e2:
                print("job_fail_callback_error:", e2, flush=True)


if __name__ == "__main__":
    main()


