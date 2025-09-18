FROM node:18-bookworm AS build

# Install dependencies for building canvas/gl
RUN apt-get update -y && apt-get -y install \
    build-essential \
    libcairo2-dev \
    libgif-dev \
    libgl1-mesa-dev \
    libglew-dev \
    libglu1-mesa-dev \
    libjpeg-dev \
    libpango1.0-dev \
    librsvg2-dev \
    libxi-dev \
    pkg-config \
    python-is-python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app

# Install node dependencies
COPY package.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set maxsockets 1 && \
    npm install --no-fund --no-audit --prefer-offline

# Add app source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

# ---- Modern FFmpeg stage ----
FROM alpine:latest as ffmpeg-download

RUN apk add --no-cache curl tar xz
WORKDIR /tmp

# Download latest FFmpeg static build
RUN curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl-shared.tar.xz" -o ffmpeg.tar.xz && \
    tar -xf ffmpeg.tar.xz && \
    mv ffmpeg-master-latest-linux64-gpl-shared ffmpeg-build

# ---- Final runtime image ----
FROM node:18-bookworm

# Install Python and system dependencies
RUN apt-get update -y && apt-get -y install \
    dumb-init \
    xvfb \
    libcairo2 \
    libpango1.0 \
    libgif7 \
    librsvg2-2 \
    libfribidi0 \
    libfribidi-bin \
    curl \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app
COPY --from=build /app /app

# Install modern FFmpeg build
COPY --from=ffmpeg-download /tmp/ffmpeg-build /usr/local/ffmpeg

# Ensure FFmpeg is in PATH
ENV PATH="/usr/local/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/local/ffmpeg/lib:${LD_LIBRARY_PATH}"

# Install Python dependencies for RunPod
RUN pip3 install --no-cache-dir runpod requests

# Ensure `editly` binary available in container
RUN npm link

# Create necessary directories
RUN mkdir -p /app/uploads /outputs /app/temp

# Copy Python handler and init script
COPY runpod_handler.py /app/
COPY docker-init.sh /docker-init.sh
RUN chmod +x /docker-init.sh

# Expose API port (for internal communication)
EXPOSE 3001

# RunPod expects Python handler
CMD ["python3", "/app/runpod_handler.py"]