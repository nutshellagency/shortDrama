"""
Smart Crop Module for ShortDrama AI Worker

Uses MediaPipe Face Detection to intelligently crop videos to 9:16 vertical format
while keeping faces and action centered.

Free-tier solution using:
- MediaPipe Face Detection (runs locally, no API costs)
- OpenCV for video processing
- Smoothing algorithm to prevent jittery camera movements
"""

import cv2
import numpy as np
import mediapipe as mp
from dataclasses import dataclass
from typing import List, Tuple, Optional
import json
import os


@dataclass
class FaceRegion:
    """Represents a detected face region"""
    x: int  # center x
    y: int  # center y
    width: int
    height: int
    confidence: float


@dataclass 
class CropWindow:
    """Represents a crop window for a frame"""
    x: int  # top-left x
    y: int  # top-left y
    width: int
    height: int


class SmartCropper:
    """
    Intelligent video cropper that tracks faces and keeps them in frame.
    
    Strategy:
    1. Detect faces in sampled frames using MediaPipe
    2. Calculate optimal crop region that includes all/primary faces
    3. Apply temporal smoothing to prevent jittery panning
    4. Generate crop coordinates for FFmpeg
    """
    
    # Target aspect ratio: 9:16 (vertical mobile video)
    TARGET_ASPECT = 9 / 16  # width / height = 0.5625
    
    # Sampling: analyze every Nth frame (balance accuracy vs speed)
    SAMPLE_INTERVAL = 5  # Every 5th frame
    
    # Smoothing factor (0-1): higher = smoother but slower to follow
    SMOOTHING_FACTOR = 0.85
    
    # Face priority: weight for keeping faces in upper third (headroom)
    HEADROOM_RATIO = 0.35  # Face center should be in top 35% of crop
    
    def __init__(self, min_detection_confidence: float = 0.5):
        """Initialize the smart cropper with MediaPipe face detection."""
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detector = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 1 = full range model (better for varied distances)
            min_detection_confidence=min_detection_confidence
        )
        
    def detect_faces(self, frame: np.ndarray) -> List[FaceRegion]:
        """Detect faces in a single frame using MediaPipe."""
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_detector.process(rgb_frame)
        
        faces = []
        if results.detections:
            h, w = frame.shape[:2]
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                
                # Convert relative coordinates to absolute
                face_x = int((bbox.xmin + bbox.width / 2) * w)
                face_y = int((bbox.ymin + bbox.height / 2) * h)
                face_w = int(bbox.width * w)
                face_h = int(bbox.height * h)
                
                faces.append(FaceRegion(
                    x=face_x,
                    y=face_y,
                    width=face_w,
                    height=face_h,
                    confidence=detection.score[0]
                ))
        
        return faces
    
    def calculate_crop_region(
        self, 
        faces: List[FaceRegion], 
        frame_width: int, 
        frame_height: int,
        target_width: int,
        target_height: int
    ) -> CropWindow:
        """
        Calculate optimal crop region based on detected faces.
        
        Priority:
        1. Include all faces if possible
        2. If multiple faces, center on the group
        3. If single face, position with proper headroom
        4. If no faces, center crop
        """
        if not faces:
            # No faces detected: center crop
            crop_x = (frame_width - target_width) // 2
            crop_y = (frame_height - target_height) // 2
            return CropWindow(x=crop_x, y=crop_y, width=target_width, height=target_height)
        
        # Sort faces by confidence (prioritize highest confidence)
        faces_sorted = sorted(faces, key=lambda f: f.confidence, reverse=True)
        
        if len(faces_sorted) == 1:
            # Single face: center horizontally on face, apply headroom vertically
            face = faces_sorted[0]
            
            # Horizontal: center on face
            crop_x = face.x - target_width // 2
            
            # Vertical: position face in upper portion (headroom)
            # Face center should be at HEADROOM_RATIO of crop height
            target_face_y = int(target_height * self.HEADROOM_RATIO)
            crop_y = face.y - target_face_y
            
        else:
            # Multiple faces: find bounding box of top 3 faces
            top_faces = faces_sorted[:3]
            
            # Calculate center of all tracked faces
            avg_x = sum(f.x for f in top_faces) // len(top_faces)
            avg_y = sum(f.y for f in top_faces) // len(top_faces)
            
            # Center crop on the average position
            crop_x = avg_x - target_width // 2
            
            # Apply headroom based on average face position
            target_face_y = int(target_height * self.HEADROOM_RATIO)
            crop_y = avg_y - target_face_y
        
        # Clamp to valid bounds
        crop_x = max(0, min(crop_x, frame_width - target_width))
        crop_y = max(0, min(crop_y, frame_height - target_height))
        
        return CropWindow(x=crop_x, y=crop_y, width=target_width, height=target_height)
    
    def smooth_crop_positions(
        self, 
        crop_positions: List[Tuple[int, int]], 
        smoothing: float = None
    ) -> List[Tuple[int, int]]:
        """
        Apply temporal smoothing to crop positions to prevent jittery movement.
        Uses exponential moving average.
        """
        if smoothing is None:
            smoothing = self.SMOOTHING_FACTOR
            
        if len(crop_positions) <= 1:
            return crop_positions
        
        smoothed = [crop_positions[0]]
        
        for i in range(1, len(crop_positions)):
            prev_x, prev_y = smoothed[-1]
            curr_x, curr_y = crop_positions[i]
            
            # Exponential smoothing
            new_x = int(smoothing * prev_x + (1 - smoothing) * curr_x)
            new_y = int(smoothing * prev_y + (1 - smoothing) * curr_y)
            
            smoothed.append((new_x, new_y))
        
        return smoothed
    
    def analyze_video(
        self, 
        video_path: str,
        target_width: int = 1080,
        target_height: int = 1920,
        progress_callback=None
    ) -> dict:
        """
        Analyze video and generate smart crop data.
        
        Returns a dict with:
        - crop_data: list of (frame_number, x, y) tuples
        - video_info: original video dimensions and fps
        - strategy: description of cropping strategy used
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")
        
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"[SmartCrop] Analyzing video: {frame_width}x{frame_height} @ {fps}fps, {total_frames} frames")
        
        # Calculate crop dimensions that fit within source
        # We need to crop to 9:16 from source
        source_aspect = frame_width / frame_height
        
        if source_aspect > self.TARGET_ASPECT:
            # Source is wider than target: crop width
            crop_height = frame_height
            crop_width = int(frame_height * self.TARGET_ASPECT)
        else:
            # Source is taller than target: crop height
            crop_width = frame_width
            crop_height = int(frame_width / self.TARGET_ASPECT)
        
        print(f"[SmartCrop] Crop dimensions: {crop_width}x{crop_height}")
        
        # Sample frames and detect faces
        frame_crops = []  # (frame_number, x, y)
        face_detection_count = 0
        
        frame_number = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_number % self.SAMPLE_INTERVAL == 0:
                faces = self.detect_faces(frame)
                if faces:
                    face_detection_count += 1
                
                crop = self.calculate_crop_region(
                    faces, frame_width, frame_height, crop_width, crop_height
                )
                frame_crops.append((frame_number, crop.x, crop.y))
                
                if progress_callback and frame_number % 100 == 0:
                    pct = int((frame_number / total_frames) * 100)
                    progress_callback(pct, "analyzing_faces")
            
            frame_number += 1
        
        cap.release()
        
        # Smooth the crop positions
        positions = [(x, y) for _, x, y in frame_crops]
        smoothed = self.smooth_crop_positions(positions)
        
        # Update with smoothed positions
        smoothed_crops = [
            (frame_crops[i][0], smoothed[i][0], smoothed[i][1]) 
            for i in range(len(frame_crops))
        ]
        
        # Interpolate for all frames (not just sampled ones)
        full_crop_data = self._interpolate_crops(smoothed_crops, total_frames)
        
        # Determine strategy description
        detection_ratio = face_detection_count / len(frame_crops) if frame_crops else 0
        if detection_ratio > 0.7:
            strategy = "face_tracking"
        elif detection_ratio > 0.3:
            strategy = "mixed_face_center"
        else:
            strategy = "center_crop"
        
        print(f"[SmartCrop] Analysis complete: {face_detection_count}/{len(frame_crops)} frames with faces ({detection_ratio:.1%})")
        print(f"[SmartCrop] Strategy: {strategy}")
        
        return {
            "crop_data": full_crop_data,
            "video_info": {
                "width": frame_width,
                "height": frame_height,
                "fps": fps,
                "total_frames": total_frames,
                "crop_width": crop_width,
                "crop_height": crop_height
            },
            "strategy": strategy,
            "face_detection_ratio": detection_ratio
        }
    
    def _interpolate_crops(
        self, 
        sampled_crops: List[Tuple[int, int, int]], 
        total_frames: int
    ) -> List[Tuple[int, int, int]]:
        """Interpolate crop positions for frames between samples."""
        if not sampled_crops:
            return [(i, 0, 0) for i in range(total_frames)]
        
        result = []
        sample_idx = 0
        
        for frame_num in range(total_frames):
            # Find surrounding samples
            while (sample_idx < len(sampled_crops) - 1 and 
                   sampled_crops[sample_idx + 1][0] <= frame_num):
                sample_idx += 1
            
            if sample_idx >= len(sampled_crops) - 1:
                # Use last sample
                _, x, y = sampled_crops[-1]
            else:
                # Interpolate between samples
                f1, x1, y1 = sampled_crops[sample_idx]
                f2, x2, y2 = sampled_crops[sample_idx + 1]
                
                if f2 == f1:
                    t = 0
                else:
                    t = (frame_num - f1) / (f2 - f1)
                
                x = int(x1 + t * (x2 - x1))
                y = int(y1 + t * (y2 - y1))
            
            result.append((frame_num, x, y))
        
        return result
    
    def generate_ffmpeg_filter(self, analysis_result: dict) -> str:
        """
        Generate FFmpeg filter string for smart cropping.
        
        For dynamic cropping, we generate a crop filter with expressions.
        Since FFmpeg crop filter doesn't support per-frame variables easily,
        we use a simplified approach: find the dominant crop region.
        
        For more advanced dynamic cropping, we'd need to use ffmpeg's sendcmd
        or process frame-by-frame (slower).
        """
        info = analysis_result["video_info"]
        crop_data = analysis_result["crop_data"]
        
        # For POC: use average crop position (works well with smoothing)
        # This gives a stable crop that's centered on where faces appear most
        avg_x = sum(c[1] for c in crop_data) // len(crop_data)
        avg_y = sum(c[2] for c in crop_data) // len(crop_data)
        
        crop_w = info["crop_width"]
        crop_h = info["crop_height"]
        
        # Build FFmpeg filter: crop then scale to target
        filter_str = f"crop={crop_w}:{crop_h}:{avg_x}:{avg_y},scale=1080:1920"
        
        return filter_str
    
    def generate_dynamic_crop_script(
        self, 
        analysis_result: dict, 
        output_path: str
    ) -> str:
        """
        Generate a file with frame-by-frame crop commands for advanced processing.
        Can be used with ffmpeg's sendcmd filter for true dynamic cropping.
        """
        crop_data = analysis_result["crop_data"]
        info = analysis_result["video_info"]
        fps = info["fps"]
        
        commands = []
        last_x, last_y = None, None
        
        for frame_num, x, y in crop_data:
            # Only output when position changes significantly
            if last_x is None or abs(x - last_x) > 5 or abs(y - last_y) > 5:
                time_sec = frame_num / fps
                commands.append(f"{time_sec:.3f} crop x {x};")
                commands.append(f"{time_sec:.3f} crop y {y};")
                last_x, last_y = x, y
        
        with open(output_path, 'w') as f:
            f.write('\n'.join(commands))
        
        return output_path
    
    def close(self):
        """Clean up resources."""
        self.face_detector.close()


def smart_crop_video(
    input_path: str,
    output_path: str,
    target_width: int = 1080,
    target_height: int = 1920,
    progress_callback=None
) -> dict:
    """
    Main entry point: analyze and crop a video to 9:16 vertical format.
    
    Args:
        input_path: Path to input video
        output_path: Path for output video
        target_width: Output width (default 1080)
        target_height: Output height (default 1920)
        progress_callback: Optional callback(pct, stage)
    
    Returns:
        dict with processing info
    """
    cropper = SmartCropper()
    
    try:
        # Analyze video for face positions
        if progress_callback:
            progress_callback(0, "analyzing")
        
        analysis = cropper.analyze_video(
            input_path,
            target_width,
            target_height,
            progress_callback
        )
        
        # Generate FFmpeg filter
        crop_filter = cropper.generate_ffmpeg_filter(analysis)
        
        print(f"[SmartCrop] Using filter: {crop_filter}")
        
        return {
            "filter": crop_filter,
            "analysis": analysis,
            "crop_width": analysis["video_info"]["crop_width"],
            "crop_height": analysis["video_info"]["crop_height"],
            "strategy": analysis["strategy"]
        }
        
    finally:
        cropper.close()


if __name__ == "__main__":
    # Test mode
    import sys
    if len(sys.argv) > 1:
        result = smart_crop_video(sys.argv[1], "test_output.mp4")
        print(json.dumps(result, indent=2, default=str))
