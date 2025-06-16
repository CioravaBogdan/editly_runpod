# n8n Workflow Examples for Editly API

## Simple Video Creation Workflow

This workflow demonstrates how to create a video using Editly API in n8n.

### Workflow Structure:
1. **Manual Trigger** - Start the workflow manually
2. **HTTP Request** - Create video via Editly API
3. **HTTP Request** - Download the generated video

### HTTP Request Node 1 - Create Video
- **Method**: POST
- **URL**: `http://localhost:3001/edit`
- **Headers**: 
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
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
            "text": "Created with n8n + Editly",
            "textColor": "#ffffff",
            "position": "center"
          },
          {
            "type": "fill-color",
            "color": "#007acc"
          }
        ]
      }
    ]
  },
  "outputFilename": "n8n-generated-video.mp4"
}
```

### HTTP Request Node 2 - Download Video
- **Method**: GET
- **URL**: `http://localhost:3001/download/{{ $json.outputFilename }}`
- **Response Format**: Binary

## Advanced Workflow with File Upload

### Workflow Structure:
1. **Manual Trigger** - Start the workflow
2. **Read Binary File** - Read an image file
3. **HTTP Request** - Upload image to Editly
4. **HTTP Request** - Create slideshow with uploaded image
5. **HTTP Request** - Download the final video

### HTTP Request Node 1 - Upload File
- **Method**: POST
- **URL**: `http://localhost:3001/upload`
- **Body Type**: Form-Data Binary
- **Fields**:
  - `files`: {{ $binary.data }}

### HTTP Request Node 2 - Create Slideshow
- **Method**: POST
- **URL**: `http://localhost:3001/edit`
- **Headers**: 
  - `Content-Type: application/json`
- **Body (JSON)**:
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
            "type": "image",
            "path": "/app/uploads/{{ $('HTTP Request').first().json.files[0].filename }}"
          },
          {
            "type": "title",
            "text": "Powered by n8n",
            "textColor": "#ffffff",
            "position": "bottom"
          }
        ]
      }
    ],
    "defaults": {
      "transition": {
        "duration": 1,
        "name": "fade"
      }
    }
  },
  "outputFilename": "slideshow-{{ new Date().getTime() }}.mp4"
}
```

## Webhook-Triggered Video Creation

This workflow can be triggered via webhook to create videos automatically.

### Workflow Structure:
1. **Webhook Trigger** - Listen for incoming HTTP requests
2. **Code Node** - Process webhook data
3. **HTTP Request** - Create video with dynamic content
4. **HTTP Request** - Send back the download URL

### Webhook Trigger
- **Method**: POST
- **Path**: `/create-video`

### Code Node (Process Data)
```javascript
// Extract data from webhook
const { title, backgroundColor, duration } = $input.first().json.body;

// Prepare edit specification
const editSpec = {
  width: 1280,
  height: 720,
  fps: 30,
  fast: true,
  clips: [
    {
      duration: duration || 5,
      layers: [
        {
          type: "title",
          text: title || "Default Title",
          textColor: "#ffffff",
          position: "center"
        },
        {
          type: "fill-color",
          color: backgroundColor || "#4CAF50"
        }
      ]
    }
  ]
};

return [{
  json: {
    editSpec,
    outputFilename: `webhook-video-${Date.now()}.mp4`
  }
}];
```

### HTTP Request Node - Create Video
- **Method**: POST
- **URL**: `http://localhost:3001/edit`
- **Headers**: 
  - `Content-Type: application/json`
- **Body (JSON)**:
```json
{
  "editSpec": {{ $json.editSpec }},
  "outputFilename": "{{ $json.outputFilename }}"
}
```

## Testing the Webhook

Send a POST request to your n8n webhook URL:

```bash
curl -X POST http://your-n8n-instance/webhook/create-video \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Custom Video",
    "backgroundColor": "#FF5722",
    "duration": 7
  }'
```

## Error Handling

Add error handling to your workflows:

### Code Node - Error Handler
```javascript
// Check if video creation was successful
const response = $input.first().json;

if (response.error) {
  throw new Error(`Video creation failed: ${response.error}`);
}

// Log success
console.log(`Video created successfully: ${response.outputFilename}`);

return [$input.first()];
```

## Tips for Production

1. **Add authentication** to your Editly API if needed
2. **Monitor file sizes** and clean up old videos regularly
3. **Use environment variables** for API URLs
4. **Add retry logic** for failed video generations
5. **Implement queuing** for multiple simultaneous requests

## Common editSpec Examples

### Text Animation Video
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
            "text": "Welcome to our service!",
            "fontSize": 60,
            "position": "center"
          }
        ]
      }
    ]
  }
}
```

### Multi-Clip Video
```json
{
  "editSpec": {
    "width": 1920,
    "height": 1080,
    "fps": 25,
    "clips": [
      {
        "duration": 3,
        "layers": [
          { "type": "fill-color", "color": "#FF5722" },
          { "type": "title", "text": "Clip 1", "position": "center" }
        ]
      },
      {
        "duration": 3,
        "layers": [
          { "type": "fill-color", "color": "#2196F3" },
          { "type": "title", "text": "Clip 2", "position": "center" }
        ]
      }
    ],
    "defaults": {
      "transition": { "duration": 1, "name": "fade" }
    }
  }
}
```
