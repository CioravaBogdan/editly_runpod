# 🎬 Editly Video Editor API

**Dockerized Editly video editor with HTTP API for seamless n8n integration**

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![n8n](https://img.shields.io/badge/n8n-Compatible-red?logo=n8n)](https://n8n.io)
[![Express](https://img.shields.io/badge/Express-API-green?logo=express)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

This project extends the powerful [Editly](https://github.com/mifi/editly) video editing library with a complete HTTP API server, making it perfect for automation workflows with n8n, webhooks, and other integrations.

## 🚀 Features

- **Complete HTTP API** with Express.js
- **Docker containerized** for easy deployment
- **n8n integration ready** with CORS support
- **File upload/download** endpoints
- **Health monitoring** and logging
- **Production ready** with proper error handling
- **Volume persistence** for input/output files

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/info` | API documentation |
| `POST` | `/upload` | Upload files (multipart) |
| `POST` | `/edit` | Create video with editSpec |
| `GET` | `/download/:filename` | Download generated video |
| `GET` | `/files` | List all generated files |

## 🐳 Quick Start with Docker

### 1. Clone and Run
```bash
git clone https://github.com/CioravaBogdan/EDITLY_VIDEO_EDITOR.git
cd EDITLY_VIDEO_EDITOR
docker-compose up --build -d
```

### 2. Verify Installation
```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/info
```

### 3. Create Your First Video
```bash
curl -X POST http://localhost:3001/edit \
  -H "Content-Type: application/json" \
  -d '{
    "editSpec": {
      "width": 1280,
      "height": 720,
      "fps": 30,
      "fast": true,
      "clips": [
        {
          "duration": 5,
          "layers": [
            {
              "type": "title",
              "text": "Hello World!",
              "textColor": "#ffffff",
              "position": "center"
            },
            {
              "type": "fill-color",
              "color": "#4CAF50"
            }
          ]
        }
      ]
    },
    "outputFilename": "hello-world.mp4"
  }'
```

## 🔧 Configuration

### Docker Compose Services

- **editly-api**: Main API server on port 3001
- **volumes**: Persistent storage for uploads and outputs

### Environment Variables

- `PORT`: API server port (default: 3001)
- `NODE_ENV`: Environment mode (production/development)

### Volume Mounts

- `uploads:/app/uploads` - Input files storage
- `outputs:/outputs` - Generated videos storage
- `./examples/assets:/app/examples/assets` - Example assets

## 📖 Documentation

- [**API Documentation**](README-API.md) - Complete API reference (Romanian)
- [**n8n Integration Examples**](n8n-examples.md) - Ready-to-use n8n workflows
- [**cURL Examples**](curl-examples.md) - Complete cURL command reference
- [**Original Editly Docs**](README-ORIGINAL.md) - Complete editSpec reference

## 🧪 Testing

### Quick Test Scripts

#### Linux/macOS
```bash
# Complete API test
./test-api.sh

# Quick tests
./quick-curl-tests.sh
```

#### Windows (PowerShell)
```powershell
# Complete workflow test
.\quick-test.ps1

# Manual test
$body = Get-Content test-api.json -Raw
Invoke-RestMethod -Uri http://localhost:3001/edit -Method Post -Body $body -ContentType "application/json"
```

### Manual cURL Testing

#### Health Check
```bash
curl -X GET http://localhost:3001/health
```

#### Upload File
```bash
curl -X POST \
  -F "files=@your-video.mp4" \
  http://localhost:3001/upload
```

#### Create Video
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '@test-payload.json' \
  http://localhost:3001/edit
```

#### Download Result
```bash
curl -X GET \
  -o output.mp4 \
  http://localhost:3001/download/your-video.mp4
```

## 🔗 n8n Integration

### Complete Video Workflow - Replace Audio & Add Text Overlay

Perfect pentru automatizarea procesării video-urilor cu înlocuirea sunetului și adăugarea de text.

#### Step 1: Upload Video File
```json
{
  "method": "POST",
  "url": "http://localhost:3001/upload",
  "sendBinaryData": true,
  "binaryPropertyName": "video_file",
  "options": {
    "bodyContentType": "multipart-form-data"
  }
}
```

#### Step 2: Upload Audio File (Background Music)
```json
{
  "method": "POST", 
  "url": "http://localhost:3001/upload",
  "sendBinaryData": true,
  "binaryPropertyName": "audio_file",
  "options": {
    "bodyContentType": "multipart-form-data"
  }
}
```

#### Step 3: Create Video with Audio Replacement
```json
{
  "method": "POST",
  "url": "http://localhost:3001/edit",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "editSpec": {
      "width": 1080,
      "height": 1080,
      "fps": 30,
      "clips": [
        {
          "duration": 30,
          "layers": [
            {
              "type": "video",
              "path": "/app/uploads/{{ $('Upload Video').first().json.files[0].filename }}",
              "resizeMode": "cover"
            },
            {
              "type": "title",
              "text": "{{ $json.productInfo.title }}",
              "textColor": "#FF6B6B",
              "position": "center",
              "fontSize": 72,
              "fontFamily": "Arial"
            },
            {
              "type": "title", 
              "text": "{{ $json.productInfo.price }} RON",
              "textColor": "#4ECDC4",
              "position": {"x": 0.5, "y": 0.7},
              "fontSize": 48,
              "start": 2,
              "stop": 30
            },
            {
              "type": "title",
              "text": "www.infant.ro", 
              "textColor": "#FFE66D",
              "position": "bottom",
              "fontSize": 36,
              "start": 25,
              "stop": 30
            }
          ]
        }
      ],
      "audioTracks": [
        {
          "path": "/app/uploads/{{ $('Upload Audio').first().json.files[0].filename }}",
          "mixVolume": 1,
          "cutTo": 30
        }
      ]
    },
    "outputFilename": "{{ $json.productInfo.code }}_video_final.mp4"
  }
}
```

#### Step 4: Download Final Video
```json
{
  "method": "GET",
  "url": "http://localhost:3001/download/{{ $('Create Video').first().json.outputFilename }}",
  "options": {
    "responseType": "stream"
  }
}
```

### Simple Video Creation Workflow

Pentru crearea rapidă de video-uri cu text:

```json
{
  "editSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 25,
    "clips": [
      {
        "duration": 4,
        "layers": [
          {
            "type": "title",
            "text": "Generated by n8n",
            "position": "center"
          }
        ]
      }
    ]
  },
  "outputFilename": "n8n-video.mp4"
}
```

### Complete cURL Workflow Example

```bash
# 1. Upload video
VIDEO_RESPONSE=$(curl -X POST -F "files=@input-video.mp4" http://localhost:3001/upload)
VIDEO_FILENAME=$(echo $VIDEO_RESPONSE | jq -r '.files[0].filename')

# 2. Upload audio
AUDIO_RESPONSE=$(curl -X POST -F "files=@background-music.mp3" http://localhost:3001/upload)
AUDIO_FILENAME=$(echo $AUDIO_RESPONSE | jq -r '.files[0].filename')

# 3. Create video with replaced audio
curl -X POST http://localhost:3001/edit \
  -H "Content-Type: application/json" \
  -d "{
    \"editSpec\": {
      \"width\": 1080,
      \"height\": 1080,
      \"fps\": 30,
      \"clips\": [{
        \"duration\": 30,
        \"layers\": [{
          \"type\": \"video\",
          \"path\": \"/app/uploads/$VIDEO_FILENAME\",
          \"resizeMode\": \"cover\"
        }, {
          \"type\": \"title\",
          \"text\": \"Produs Test\",
          \"textColor\": \"#FF6B6B\",
          \"position\": \"center\",
          \"fontSize\": 72
        }]
      }],
      \"audioTracks\": [{
        \"path\": \"/app/uploads/$AUDIO_FILENAME\",
        \"mixVolume\": 1,
        \"cutTo\": 30
      }]
    },
    \"outputFilename\": \"final-video.mp4\"
  }"

# 4. Download result
curl -X GET -o final-video.mp4 http://localhost:3001/download/final-video.mp4
```

## 🎨 Video Creation Examples

### Basic Text Animation
```json
{
  "editSpec": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "clips": [
      {
        "duration": 3,
        "layers": [
          {
            "type": "slide-in-text",
            "text": "Welcome!",
            "fontSize": 60,
            "position": "center"
          }
        ]
      }
    ]
  }
}
```

### Image Slideshow with Music
```json
{
  "editSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "audioTracks": [
      {
        "path": "/app/uploads/background-music.mp3",
        "mixVolume": 0.8
      }
    ],
    "clips": [
      {
        "duration": 4,
        "layers": [
          {
            "type": "image",
            "path": "/app/uploads/image1.jpg",
            "resizeMode": "cover"
          },
          {
            "type": "title",
            "text": "Prima imagine",
            "position": {"x": 0.5, "y": 0.1},
            "fontSize": 48,
            "color": "#ffffff"
          }
        ]
      },
      {
        "duration": 4,
        "layers": [
          {
            "type": "image",
            "path": "/app/uploads/image2.jpg",
            "resizeMode": "cover"
          },
          {
            "type": "title",
            "text": "A doua imagine",
            "position": {"x": 0.5, "y": 0.1},
            "fontSize": 48,
            "color": "#ffffff"
          }
        ]
      }
    ],
    "defaults": {
      "transition": {
        "duration": 1,
        "name": "fadeIn"
      }
    }
  }
}
```

### Product Video with Price Animation
```json
{
  "editSpec": {
    "width": 1080,
    "height": 1080,
    "fps": 30,
    "clips": [
      {
        "duration": 30,
        "layers": [
          {
            "type": "video",
            "path": "/app/uploads/product-video.mp4",
            "resizeMode": "cover"
          },
          {
            "type": "fill-color",
            "color": "#000000",
            "opacity": 0.3
          },
          {
            "type": "title",
            "text": "Produs Premium",
            "textColor": "#FFFFFF",
            "position": "center",
            "fontSize": 72,
            "fontFamily": "Arial",
            "start": 0,
            "stop": 30
          },
          {
            "type": "title",
            "text": "299 RON",
            "textColor": "#4ECDC4",
            "position": {"x": 0.5, "y": 0.7},
            "fontSize": 48,
            "start": 5,
            "stop": 30
          },
          {
            "type": "title",
            "text": "Comandă acum!",
            "textColor": "#FF6B6B",
            "position": "bottom",
            "fontSize": 36,
            "start": 20,
            "stop": 30
          }
        ]
      }
    ],
    "audioTracks": [
      {
        "path": "/app/uploads/commercial-music.mp3",
        "mixVolume": 0.6,
        "cutTo": 30
      }
    ]
  },
  "outputFilename": "product-commercial.mp4"
}
```

### Color Transition Video
```json
{
  "editSpec": {
    "width": 1280,
    "height": 720,
    "fps": 30,
    "defaults": {
      "transition": {
        "name": "fadeIn",
        "duration": 0.5
      }
    },
    "clips": [
      {
        "duration": 2,
        "layers": [
          {
            "type": "fill-color",
            "color": "#FF0000"
          },
          {
            "type": "title",
            "text": "Red",
            "fontSize": 48,
            "color": "#FFFFFF",
            "position": "center"
          }
        ]
      },
      {
        "duration": 2,
        "layers": [
          {
            "type": "fill-color", 
            "color": "#00FF00"
          },
          {
            "type": "title",
            "text": "Green",
            "fontSize": 48,
            "color": "#FFFFFF",
            "position": "center"
          }
        ]
      },
      {
        "duration": 2,
        "layers": [
          {
            "type": "fill-color",
            "color": "#0000FF"
          },
          {
            "type": "title",
            "text": "Blue",
            "fontSize": 48,
            "color": "#FFFFFF",
            "position": "center"
          }
        ]
      }
    ]
  }
}
```

### Video with Subtitles
```json
{
  "editSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "clips": [
      {
        "layers": [
          {
            "type": "video",
            "path": "/app/uploads/main-video.mp4"
          },
          {
            "type": "subtitle",
            "text": "Acesta este primul subtitle",
            "start": 0,
            "stop": 3,
            "position": "bottom",
            "fontSize": 32,
            "color": "#FFFFFF"
          },
          {
            "type": "subtitle",
            "text": "Al doilea subtitle aici",
            "start": 3,
            "stop": 6,
            "position": "bottom",
            "fontSize": 32,
            "color": "#FFFFFF"
          }
        ]
      }
    ]
  }
}
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

### API Server Development
The API server code is in `src/api-server.ts` and includes:
- Express.js server with CORS
- Multer for file uploads
- Error handling and logging
- Health checks and monitoring

## 📦 Production Deployment

### Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Using Docker Build
```bash
docker build -t editly-api .
docker run -p 3001:3001 -v editly_outputs:/outputs -v editly_uploads:/app/uploads editly-api
```

### Environment Configuration
```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
```

## 🔒 Security & Production Considerations

### Security Best Practices

#### Authentication Setup
```javascript
// Add to api-server.ts
const jwt = require('jsonwebtoken');

app.use('/edit', (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  try {
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

#### CORS Configuration
```javascript
// Restrict CORS for production
app.use(cors({
  origin: ['https://your-domain.com', 'https://your-n8n-instance.com'],
  credentials: true
}));
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // limit each IP to 10 requests per windowMs
});

app.use('/edit', limiter);
```

### Production Deployment

#### Environment Variables
```yaml
# docker-compose.prod.yml
environment:
  - NODE_ENV=production
  - PORT=3001
  - JWT_SECRET=your-secret-key
  - MAX_FILE_SIZE=1073741824  # 1GB
  - CORS_ORIGIN=https://your-domain.com
```

#### Resource Limits
```yaml
# docker-compose.yml
services:
  editly:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

#### Volume Management
```bash
# Setup automated cleanup
echo "0 2 * * * docker exec editly-api find /outputs -name '*.mp4' -mtime +7 -delete" | crontab -

# Backup important videos
docker run --rm -v editly_outputs:/source -v $(pwd)/backups:/backup alpine tar czf /backup/videos-$(date +%Y%m%d).tar.gz -C /source .
```

#### Health Monitoring
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

#### Nginx Proxy Setup
```nginx
# /etc/nginx/sites-available/editly-api
server {
    listen 80;
    server_name your-domain.com;
    
    client_max_body_size 1G;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout pentru video processing
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Monitoring & Logging

#### Centralized Logging
```yaml
# docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

#### Prometheus Metrics
```javascript
// Add to api-server.ts
const promBundle = require("express-prom-bundle");
const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);
```

## 🐛 Troubleshooting

### Check Container Status
```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs -f editly

# Restart container
docker-compose restart editly
```

### Common Issues & Solutions

#### ❌ "Endpoint not found" Error
```bash
# Rebuild and restart container
docker-compose down
docker-compose up --build -d

# Check if API is responding
curl http://localhost:3001/health
```

#### ❌ Upload Fails
```bash
# Check file size (max 500MB)
ls -lh your-file.mp4

# Check disk space
docker exec editly-api df -h

# Test with smaller file
curl -X POST -F "files=@small-test.txt" http://localhost:3001/upload
```

#### ❌ Video Creation Fails
```bash
# Check logs for FFmpeg errors
docker-compose logs editly

# Verify file paths in editSpec
curl http://localhost:3001/files

# Test with simple video first
curl -X POST http://localhost:3001/edit \
  -H "Content-Type: application/json" \
  -d '{"editSpec":{"width":720,"height":480,"fps":30,"clips":[{"duration":3,"layers":[{"type":"title","text":"Test"}]}]}}'
```

#### ❌ Audio Issues
```bash
# Check audio file format (MP3, WAV supported)
file your-audio.mp3

# Test audio separately
curl -X POST -F "files=@test-audio.mp3" http://localhost:3001/upload
```

#### ❌ Port 3001 Already in Use
```yaml
# Change port in docker-compose.yml
ports:
  - "3002:3001"  # Use port 3002 instead
```

### Debug Mode
```bash
# Run without detached mode to see logs
docker-compose up --build

# Enable verbose logging
docker-compose exec editly npm run dev
```

### Performance Issues
```bash
# Check container resources
docker stats editly-api

# Clean up old files
docker-compose exec editly rm -rf /outputs/*
docker-compose exec editly rm -rf /app/uploads/*

# Restart with more memory
docker-compose down
docker-compose up -d --memory=4g
```

### File Permission Issues
```bash
# Fix permissions
docker-compose exec editly chown -R node:node /app/uploads /outputs

# Check directory permissions
docker-compose exec editly ls -la /app/uploads /outputs
```

## 🤝 Contributing

1. Fork this repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Editly](https://github.com/mifi/editly) - The amazing video editing library this API wraps
- [n8n](https://n8n.io) - The workflow automation platform this integrates with
- [Express.js](https://expressjs.com) - Web framework for the API server

## 📞 Support & Resources

### Documentation Links
- **📋 API Documentation**: [README-API.md](README-API.md) - Complete API reference (Romanian)
- **🔗 n8n Examples**: [n8n-examples.md](n8n-examples.md) - Ready-to-use n8n workflows  
- **📝 cURL Examples**: [curl-examples.md](curl-examples.md) - Complete cURL command reference
- **📖 Original Editly**: [README-ORIGINAL.md](README-ORIGINAL.md) - Complete editSpec reference

### Test Files
- **🧪 Bash Test Script**: [test-api.sh](test-api.sh) - Complete API testing
- **⚡ Quick Tests**: [quick-curl-tests.sh](quick-curl-tests.sh) - Fast cURL tests
- **🪟 PowerShell Test**: [quick-test.ps1](quick-test.ps1) - Windows testing script
- **📦 Test Payload**: [test-payload.json](test-payload.json) - Example editSpec

### Useful Commands Quick Reference

#### Container Management
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f editly

# Restart API
docker-compose restart editly

# Stop services  
docker-compose down

# Rebuild and start
docker-compose up --build -d
```

#### Quick API Tests
```bash
# Health check
curl http://localhost:3001/health

# Upload file
curl -X POST -F "files=@test.mp4" http://localhost:3001/upload

# Create simple video
curl -X POST -H "Content-Type: application/json" \
  -d '{"editSpec":{"width":720,"height":480,"fps":30,"clips":[{"duration":3,"layers":[{"type":"title","text":"Test"}]}]}}' \
  http://localhost:3001/edit

# List files
curl http://localhost:3001/files

# Download video
curl -o output.mp4 http://localhost:3001/download/filename.mp4
```

#### File Management
```bash
# Clean uploads
docker-compose exec editly rm -rf /app/uploads/*

# Clean outputs
docker-compose exec editly rm -rf /outputs/*

# Check disk usage
docker-compose exec editly df -h

# List uploaded files
docker-compose exec editly ls -la /app/uploads/

# List generated videos
docker-compose exec editly ls -la /outputs/
```

### Support Channels
- **🐛 Issues**: [GitHub Issues](https://github.com/CioravaBogdan/EDITLY_VIDEO_EDITOR/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/CioravaBogdan/EDITLY_VIDEO_EDITOR/discussions)
- **📚 Editly Docs**: [Editly Repository](https://github.com/mifi/editly)
- **🔧 n8n Community**: [n8n Community](https://community.n8n.io/)

### Common Use Cases
- **🎬 Video Marketing**: Automated product video creation with text overlays
- **📱 Social Media**: Batch video processing for Instagram/TikTok content
- **🎓 Educational**: Automated lesson video creation with subtitles
- **🏢 Corporate**: Training video generation with company branding
- **🛍️ E-commerce**: Product showcase videos with pricing information

---

**Made with ❤️ for automation and video creation workflows**
