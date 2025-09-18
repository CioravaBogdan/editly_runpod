#!/usr/bin/env python3
import runpod
import subprocess
import json
import os
import time
import tempfile
import shutil
import base64
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handler(job):
    """
    RunPod handler function for Editly video processing
    """
    temp_dir = None
    try:
        job_input = job["input"]
        
        # Create temporary directory for this job
        job_id = job.get("id", f"job_{int(time.time())}")
        temp_dir = Path(f"/tmp/editly_{job_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Set output path
        output_filename = job_input.get("outPath", f"output_{job_id}.mp4")
        output_path = temp_dir / output_filename
        job_input["outPath"] = str(output_path)
        
        # Write config to temp file
        config_path = temp_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(job_input, f, indent=2)
        
        # Check if GPU is available
        gpu_available = os.path.exists('/dev/nvidia0') or os.path.exists('/dev/nvidiactl')
        
        # Set FFmpeg hardware acceleration if GPU available
        env = os.environ.copy()
        if gpu_available:
            env['FFMPEG_ENCODER'] = 'h264_nvenc'
            env['FFMPEG_PRESET'] = 'p4'  # balanced preset
            env['USE_GPU'] = 'true'
            logger.info("GPU detected, using NVENC hardware acceleration")
        else:
            env['FFMPEG_ENCODER'] = 'libx264'
            env['USE_GPU'] = 'false'
            logger.info("No GPU detected, using CPU encoding")
        
        # Try Node.js handler first (better performance)
        if os.path.exists("/app/runpod-handler.js"):
            cmd = ["node", "/app/runpod-handler.js"]
            logger.info("Using Node.js handler")
        else:
            # Fallback to direct editly CLI
            cmd = ["node", "/app/dist/cli.js", "--json", str(config_path)]
            logger.info("Using Editly CLI directly")
        
        logger.info(f"Executing: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            cwd="/app",
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"Command failed with code {result.returncode}")
            logger.error(f"STDERR: {result.stderr}")
            logger.error(f"STDOUT: {result.stdout}")
            raise Exception(f"Video processing failed: {result.stderr}")
        
        # Check if output exists
        if not output_path.exists():
            logger.error(f"Output file not created at: {output_path}")
            # List contents of temp directory for debugging
            if temp_dir.exists():
                files = list(temp_dir.glob("*"))
                logger.error(f"Files in temp directory: {files}")
            raise Exception(f"Output file not created: {output_filename}")
        
        # Read the output file
        with open(output_path, "rb") as f:
            video_data = f.read()
        
        # Convert to base64 for transfer
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        
        logger.info(f"Successfully processed video: {len(video_data)} bytes")
        
        # Clean up
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return {
            "video": video_base64,
            "filename": output_filename,
            "size": len(video_data),
            "gpu_used": gpu_available,
            "processing_time": result.returncode,
            "status": "success"
        }
        
    except subprocess.TimeoutExpired:
        logger.error("Processing timeout after 5 minutes")
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        return {"error": "Processing timeout after 5 minutes", "status": "timeout"}
        
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        # Clean up on error
        if temp_dir and temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
        return {"error": str(e), "status": "error"}

if __name__ == "__main__":
    logger.info("Starting RunPod serverless handler...")
    runpod.serverless.start({"handler": handler})