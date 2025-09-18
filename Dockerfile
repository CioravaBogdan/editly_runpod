# Use NVIDIA CUDA base image with Node.js pre-installed
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Install system dependencies and Python
RUN apt-get update && apt-get install -y \
    # FFmpeg dependencies
    software-properties-common \
    wget \
    curl \
    git \
    # Python for RunPod
    python3 \
    python3-pip \
    # Build tools
    build-essential \
    # Libraries for canvas
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # X11 and GL dependencies
    xvfb \
    libgl1-mesa-glx \
    libxi6 \
    libxext6 \
    libx11-6 \
    libglew-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 from NodeSource (clean method)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install FFmpeg with NVIDIA hardware acceleration support (using standard Ubuntu packages)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install Python RunPod SDK
RUN pip3 install --no-cache-dir runpod requests

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production || npm install --production

# Copy application code
COPY . .

# Build TypeScript if needed
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Create required directories
RUN mkdir -p /app/uploads /outputs /app/temp

# Copy RunPod handler
COPY runpod_handler.py /app/

# Set environment variables
ENV NODE_ENV=production \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility,video \
    LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64

# RunPod expects this
CMD ["python3", "/app/runpod_handler.py"]