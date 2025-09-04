FROM node:18-bookworm AS build

# Install dependencies for building canvas/gl
RUN apt-get update -y

RUN apt-get -y install \
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
    python-is-python3

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

# Purge build dependencies
RUN apt-get --purge autoremove -y \
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
    python-is-python3

# Remove Apt cache
RUN rm -rf /var/lib/apt/lists/* /var/cache/apt/*

# ---- Modern FFmpeg stage ----
# Use latest FFmpeg with full codec support
FROM alpine:latest as ffmpeg-download

RUN apk add --no-cache curl unzip
WORKDIR /tmp

# Download latest FFmpeg static build
RUN curl -L "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl-shared.tar.xz" -o ffmpeg.tar.xz && \
    tar -xf ffmpeg.tar.xz && \
    mv ffmpeg-master-latest-linux64-gpl-shared ffmpeg-build

# ---- Final runtime image ----
FROM node:18-bookworm

# Install minimal runtime libs; no ffmpeg via apt to avoid non-NVENC builds
RUN apt-get update -y \
    && apt-get -y install dumb-init xvfb libcairo2 libpango1.0 libgif7 librsvg2-2 libfribidi0 libfribidi-bin curl \
    && apt-get -y install libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

WORKDIR /app
COPY --from=build /app /app

# Install modern FFmpeg build
COPY --from=ffmpeg-download /tmp/ffmpeg-build /usr/local/ffmpeg

# Ensure FFmpeg is in PATH
ENV PATH="/usr/local/ffmpeg/bin:${PATH}"
ENV LD_LIBRARY_PATH="/usr/local/ffmpeg/lib:${LD_LIBRARY_PATH}"

# Ensure `editly` binary available in container
RUN npm link

# Create necessary directories
RUN mkdir -p /app/uploads /outputs /app/temp

# Copy and make init script executable
COPY docker-init.sh /docker-init.sh
RUN chmod +x /docker-init.sh

# Expose API port
EXPOSE 3001

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/docker-init.sh", "xvfb-run", "--server-args", "-screen 0 1280x1024x24 -ac"]
CMD [ "node", "dist/api-server.js" ]
