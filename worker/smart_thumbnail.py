"""
Smart Thumbnail Generation for ShortDrama Worker

This module uses AI-powered frame selection to generate high-quality thumbnails.
Instead of simply taking the first frame (which is often black or low quality),
it analyzes multiple frames and scores them based on:
- Brightness (avoid too dark or too bright)
- Sharpness (avoid blurry frames)
- Face presence (prefer frames with visible faces)

The best-scoring frame is selected as the thumbnail, and all candidates
are saved for admin review if needed.
"""

import cv2
import numpy as np
import os
from typing import Dict, List, Tuple, Optional, Callable

# MediaPipe for face detection
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("[SmartThumbnail] MediaPipe not available, face detection disabled")


def extract_frame_at_time(video_path: str, timestamp_sec: float, output_path: str) -> bool:
    """
    Extract a single frame from video at specified timestamp.
    
    Args:
        video_path: Path to input video
        timestamp_sec: Time in seconds to extract frame
        output_path: Path to save extracted frame
        
    Returns:
        True if successful, False otherwise
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return False
    
    try:
        # Set position to timestamp
        cap.set(cv2.CAP_PROP_POS_MSEC, timestamp_sec * 1000)
        ret, frame = cap.read()
        
        if ret and frame is not None:
            cv2.imwrite(output_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
            return True
        return False
    finally:
        cap.release()


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return 0.0
    
    try:
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        if fps > 0:
            return frame_count / fps
        return 0.0
    finally:
        cap.release()


def calculate_brightness_score(frame: np.ndarray) -> float:
    """
    Score frame brightness (0-40 points).
    Prefer frames with moderate brightness (0.3-0.7 range).
    Too dark or too bright frames get lower scores.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Calculate mean brightness (0-255 normalized to 0-1)
    brightness = np.mean(gray) / 255.0
    
    # Optimal range is 0.3-0.7
    if 0.3 <= brightness <= 0.7:
        # Perfect range: full 40 points
        score = 40.0
    elif brightness < 0.3:
        # Too dark: scale from 0 (black) to 40 (0.3)
        score = (brightness / 0.3) * 40.0
    else:
        # Too bright: scale from 40 (0.7) to 0 (1.0)
        score = 40.0 - ((brightness - 0.7) / 0.3) * 40.0
    
    return max(0, min(40, score))


def calculate_sharpness_score(frame: np.ndarray) -> float:
    """
    Score frame sharpness (0-30 points) using Laplacian variance.
    Higher variance = sharper image (more edges/details).
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Calculate Laplacian variance
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = laplacian.var()
    
    # Normalize to 0-30 scale
    # Variance typically ranges from 0 (very blurry) to 1000+ (very sharp)
    # We cap at 500 for normalization
    normalized = min(variance / 500.0, 1.0)
    score = normalized * 30.0
    
    return max(0, min(30, score))


def calculate_face_score(frame: np.ndarray) -> Tuple[float, int]:
    """
    Score frame based on face presence (0-30 points).
    Uses MediaPipe face detection.
    
    Returns:
        Tuple of (score, num_faces)
    """
    if not MEDIAPIPE_AVAILABLE:
        return 0.0, 0
    
    try:
        mp_face_detection = mp.solutions.face_detection
        
        with mp_face_detection.FaceDetection(
            model_selection=1,  # Full range model
            min_detection_confidence=0.5
        ) as face_detection:
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detection.process(rgb_frame)
            
            if not results.detections:
                return 0.0, 0
            
            num_faces = len(results.detections)
            base_score = 30.0  # Full points for having faces
            
            # Bonus for multiple faces (up to +10 bonus)
            if num_faces > 1:
                bonus = min(num_faces - 1, 3) * 3.33  # Up to +10 for 4+ faces
            else:
                bonus = 0
            
            # Bonus for centered faces
            center_bonus = 0
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                # Face center (relative to image center)
                face_center_x = bbox.xmin + bbox.width / 2
                face_center_y = bbox.ymin + bbox.height / 2
                
                # Distance from image center (0.5, 0.5)
                dist_from_center = np.sqrt((face_center_x - 0.5)**2 + (face_center_y - 0.5)**2)
                
                # Centered faces get bonus (max +5 for perfect center)
                if dist_from_center < 0.3:
                    center_bonus = max(center_bonus, 5 * (1 - dist_from_center / 0.3))
            
            total_score = base_score + bonus + center_bonus
            return min(40, total_score), num_faces
            
    except Exception as e:
        print(f"[SmartThumbnail] Face detection error: {e}")
        return 0.0, 0


def score_frame(frame: np.ndarray) -> Dict:
    """
    Score a single frame based on multiple quality metrics.
    
    Returns:
        Dict with scores and total
    """
    brightness_score = calculate_brightness_score(frame)
    sharpness_score = calculate_sharpness_score(frame)
    face_score, num_faces = calculate_face_score(frame)
    
    total_score = brightness_score + sharpness_score + face_score
    
    return {
        "brightness": round(brightness_score, 2),
        "sharpness": round(sharpness_score, 2),
        "faces": round(face_score, 2),
        "num_faces": num_faces,
        "total": round(total_score, 2)
    }


def generate_smart_thumbnail(
    video_path: str,
    output_dir: str,
    target_width: int = 1080,
    target_height: int = 1920,
    job_id: Optional[str] = None,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Dict:
    """
    Generate smart thumbnail by analyzing and scoring multiple frames.
    
    Args:
        video_path: Path to input video
        output_dir: Directory to save thumbnails
        target_width: Target thumbnail width
        target_height: Target thumbnail height
        job_id: Optional job ID for logging
        progress_callback: Optional callback(progress_pct, stage) for reporting
        
    Returns:
        Dict with:
            - best_frame: Path to best thumbnail
            - candidates: List of all candidate frames with scores
            - strategy: Strategy used for selection
            - metadata: Additional scoring metadata
    """
    os.makedirs(output_dir, exist_ok=True)
    candidates_dir = os.path.join(output_dir, "thumb-candidates")
    os.makedirs(candidates_dir, exist_ok=True)
    
    log_prefix = f"[SmartThumbnail] Job {job_id}: " if job_id else "[SmartThumbnail] "
    
    # Get video duration
    duration = get_video_duration(video_path)
    if duration <= 0:
        print(f"{log_prefix}Failed to get video duration")
        return {"error": "invalid_video"}
    
    print(f"{log_prefix}Video duration: {duration:.1f}s")
    
    # Define sampling points (skip first 2 seconds to avoid fade-ins/black frames)
    skip_seconds = min(2.0, duration * 0.1)  # Skip first 2s or 10% of video
    effective_duration = duration - skip_seconds
    
    timestamps = [
        skip_seconds + 1.0,  # 3 seconds in (or 1s after skip)
        skip_seconds + effective_duration * 0.1,   # 10% mark
        skip_seconds + effective_duration * 0.25,  # 25% mark
        skip_seconds + effective_duration * 0.5,   # 50% mark (middle)
        skip_seconds + effective_duration * 0.75,  # 75% mark
        skip_seconds + effective_duration * 0.9,   # 90% mark
    ]
    
    # Ensure all timestamps are within bounds
    timestamps = [min(t, duration - 0.5) for t in timestamps if t < duration]
    
    print(f"{log_prefix}Sampling {len(timestamps)} candidate frames")
    
    # Extract and score candidate frames
    candidates = []
    for idx, timestamp in enumerate(timestamps):
        if progress_callback:
            progress = int((idx / len(timestamps)) * 50)  # First 50% for extraction
            progress_callback(progress, "thumbnail_extraction")
        
        candidate_path = os.path.join(candidates_dir, f"candidate_{idx}.jpg")
        
        if extract_frame_at_time(video_path, timestamp, candidate_path):
            # Load frame for scoring
            frame = cv2.imread(candidate_path)
            if frame is not None:
                # Score the frame
                scores = score_frame(frame)
                
                candidates.append({
                    "index": idx,
                    "timestamp": timestamp,
                    "path": candidate_path,
                    "scores": scores,
                    "total_score": scores["total"]
                })
                
                print(f"{log_prefix}  Frame {idx} @ {timestamp:.1f}s: "
                      f"brightness={scores['brightness']:.1f}, "
                      f"sharpness={scores['sharpness']:.1f}, "
                      f"faces={scores['faces']:.1f} ({scores['num_faces']} detected), "
                      f"total={scores['total']:.1f}")
        
        if progress_callback:
            progress = int(((idx + 1) / len(timestamps)) * 50)
            progress_callback(progress, "thumbnail_scoring")
    
    if not candidates:
        print(f"{log_prefix}No valid candidates extracted")
        return {"error": "no_candidates"}
    
    # Select best candidate
    best_candidate = max(candidates, key=lambda c: c["total_score"])
    print(f"{log_prefix}Best frame: #{best_candidate['index']} "
          f"with score {best_candidate['total_score']:.1f}")
    
    # Copy best frame to output location
    best_frame_path = os.path.join(output_dir, "thumb.jpg")
    
    # Read best frame and resize to target dimensions
    frame = cv2.imread(best_candidate["path"])
    if frame is not None and (frame.shape != (target_height, target_width)):
        # Resize frame to target dimensions (should already be correct from video processing)
        # This is just a safety measure
        frame = cv2.resize(frame, (target_width, target_height))
        cv2.imwrite(best_frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
    else:
        # Just copy the file
        import shutil
        shutil.copy(best_candidate["path"], best_frame_path)
    
    if progress_callback:
        progress_callback(100, "thumbnail_complete")
    
    strategy = "face_tracking" if MEDIAPIPE_AVAILABLE else "brightness_sharpness"
    
    return {
        "best_frame": best_frame_path,
        "candidates": candidates,
        "strategy": strategy,
        "metadata": {
            "video_duration": duration,
            "num_candidates": len(candidates),
            "best_score": best_candidate["total_score"],
            "best_timestamp": best_candidate["timestamp"]
        }
    }


if __name__ == "__main__":
    # Test the module
    import sys
    if len(sys.argv) < 2:
        print("Usage: python smart_thumbnail.py <video_path> [output_dir]")
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "test_output"
    
    result = generate_smart_thumbnail(video_path, output_dir)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(f"\n✓ Best thumbnail: {result['best_frame']}")
    print(f"✓ Strategy: {result['strategy']}")
    print(f"✓ Score: {result['metadata']['best_score']:.1f}/100")
    print(f"✓ Candidates saved to: {os.path.join(output_dir, 'thumb-candidates')}")
