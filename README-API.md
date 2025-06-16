# Editly API Server pentru n8n

Această configurație permite utilizarea Editly ca serviciu HTTP pentru integrarea cu n8n.

## Configurare și instalare

### 1. Construire și rulare cu Docker

```bash
# Clonează repository-ul
git clone https://github.com/mifi/editly.git
cd editly

# Construiește și pornește containerul
docker-compose up --build -d
```

Serviciul va fi disponibil pe portul **3001**.

### 2. Verificare funcționare

```bash
# Health check
curl http://localhost:3001/health

# Informații despre API
curl http://localhost:3001/info
```

## Utilizare cu n8n

### Endpoint-uri disponibile

#### 1. Health Check
- **GET** `/health`
- Verifică dacă serviciul funcționează

#### 2. Informații API
- **GET** `/info`
- Returnează informații despre endpoint-urile disponibile

#### 3. Upload fișiere
- **POST** `/upload`
- Content-Type: `multipart/form-data`
- Field name: `files` (acceptă multiple fișiere)

#### 4. Editare video
- **POST** `/edit`
- Content-Type: `application/json`
- Body:
```json
{
  "editSpec": {
    "width": 640,
    "height": 480,
    "fps": 30,
    "clips": [
      {
        "duration": 3,
        "layers": [
          {
            "type": "title",
            "text": "Hello World!",
            "position": "center"
          }
        ]
      }
    ]
  },
  "outputFilename": "my-video.mp4"
}
```

#### 5. Download fișiere
- **GET** `/download/:filename`
- Descarcă fișierul generat

#### 6. Listare fișiere
- **GET** `/files`
- Listează toate fișierele generate

## Exemple de integrare în n8n

### 1. Workflow simplu de creare video

1. **HTTP Request Node** pentru upload fișiere:
   - Method: POST
   - URL: `http://localhost:3001/upload`
   - Body Type: Form-Data Binary

2. **HTTP Request Node** pentru editare:
   - Method: POST
   - URL: `http://localhost:3001/edit`
   - Body Type: JSON
   - Setează `editSpec` cu configurația dorită

3. **HTTP Request Node** pentru download:
   - Method: GET
   - URL: `http://localhost:3001/download/{{$json.outputFilename}}`

### 2. Exemple de editSpec

#### Video cu titlu simplu:
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
            "text": "Titlul meu",
            "textColor": "#ffffff",
            "position": "center"
          },
          {
            "type": "fill-color",
            "color": "#ff6600"
          }
        ]
      }
    ]
  },
  "outputFilename": "video-titlu.mp4"
}
```

#### Video cu imagini și tranziții:
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
          {
            "type": "image",
            "path": "/app/uploads/imagine1.jpg"
          }
        ]
      },
      {
        "duration": 3,
        "layers": [
          {
            "type": "image",
            "path": "/app/uploads/imagine2.jpg"
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
  "outputFilename": "slideshow.mp4"
}
```

## Configurație Docker

### Porturi
- **3001**: API HTTP Server

### Volume-uri
- `outputs`: Fișierele generate
- `uploads`: Fișierele uploadate
- `./examples/assets`: Asset-uri de exemplu

### Variabile de mediu
- `PORT`: Portul pentru API (default: 3001)
- `NODE_ENV`: Mediul de rulare

## Troubleshooting

### Verificare logs
```bash
docker-compose logs -f editly
```

### Restart serviciu
```bash
docker-compose restart editly
```

### Rebuild container
```bash
docker-compose down
docker-compose up --build -d
```

## Specificații tehnice

- **Framework**: Express.js
- **Upload**: Multer (limit 500MB per fișier)
- **CORS**: Activat pentru toate originile
- **Timeout**: Fără timeout (processing-ul video poate dura mult)

Pentru documentația completă Editly, vezi: https://github.com/mifi/editly
