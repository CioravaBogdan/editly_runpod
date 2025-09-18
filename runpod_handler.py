import runpod
import subprocess
import json
import os
import requests
import time
import tempfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def start_editly_server():
    """Start the Editly Node.js server in background"""
    try:
        # Start the Node.js server
        process = subprocess.Popen([
            "/usr/bin/dumb-init", "--", "/docker-init.sh", 
            "xvfb-run", "--server-args", "-screen 0 1280x1024x24 -ac",
            "node", "dist/api-server.js"
        ], cwd="/app")
        
        # Wait for server to start
        time.sleep(10)
        
        # Test if server is running
        for i in range(30):  # Try for 30 seconds
            try:
                response = requests.get("http://localhost:3001/health", timeout=2)
                if response.status_code == 200:
                    logger.info("Editly server started successfully")
                    return process
            except:
                time.sleep(1)
        
        logger.error("Failed to start Editly server")
        return None
        
    except Exception as e:
        logger.error(f"Error starting Editly server: {e}")
        return None

# Start the Editly server when the module loads
editly_process = start_editly_server()

#!/usr/bin/env python3
import runpod
import subprocess
import json
import os
import time
import tempfile
import shutil
from pathlib import Path

def handler(job):
    """
    RunPod handler function for Editly video processing
    """
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
            json.dump(job_input, f)
        
        # Check if GPU is available
        gpu_available = os.path.exists('/dev/nvidia0')
        
        # Set FFmpeg hardware acceleration if GPU available
        env = os.environ.copy()
        if gpu_available:
            env['FFMPEG_ENCODER'] = 'h264_nvenc'
            env['FFMPEG_PRESET'] = 'p4'  # balanced preset
            print("GPU detected, using NVENC hardware acceleration")
        
        # Run Editly
        cmd = ["npx", "editly", "--json", str(config_path)]
        
        print(f"Executing: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            env=env,
            cwd="/app"
        )
        
        if result.returncode != 0:
            raise Exception(f"Editly failed: {result.stderr}")
        
        # Check if output exists
        if not output_path.exists():
            raise Exception(f"Output file not created: {output_path}")
        
        # Read the output file
        with open(output_path, "rb") as f:
            video_data = f.read()
        
        # Convert to base64 for transfer
        import base64
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        
        # Clean up
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return {
            "video": video_base64,
            "filename": output_filename,
            "size": len(video_data),
            "gpu_used": gpu_available
        }
        
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        # Clean up on error
        if 'temp_dir' in locals():
            shutil.rmtree(temp_dir, ignore_errors=True)
        return {"error": str(e)}

if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})

# This is required for RunPod
runpod.serverless.start({"handler": handler})