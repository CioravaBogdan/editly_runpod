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

def handler(job):
    """
    RunPod handler function that interfaces with Editly
    """
    try:
        job_input = job.get("input", {})
        
        # Validate input
        if not job_input:
            return {"error": "No input provided"}
        
        # Send request to Editly server
        try:
            response = requests.post(
                "http://localhost:3001/api/render",
                json=job_input,
                timeout=300  # 5 minutes timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # If there's an output file, we might want to return it
                if "outputPath" in result:
                    output_path = result["outputPath"]
                    if os.path.exists(output_path):
                        # For RunPod, we typically return the file path or upload to storage
                        # For now, return the file path
                        result["output_file"] = output_path
                        result["status"] = "completed"
                
                return result
            else:
                return {
                    "error": f"Editly server error: {response.status_code}",
                    "details": response.text
                }
                
        except requests.exceptions.Timeout:
            return {"error": "Request timeout - video processing took too long"}
        except requests.exceptions.ConnectionError:
            return {"error": "Cannot connect to Editly server"}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
            
    except Exception as e:
        logger.error(f"Handler error: {e}")
        return {"error": f"Handler error: {str(e)}"}

# This is required for RunPod
runpod.serverless.start({"handler": handler})