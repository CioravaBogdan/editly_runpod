# Quick Performance Test
Write-Host "🧪 EDITLY QUICK PERFORMANCE TEST" -ForegroundColor Cyan
Write-Host "Testing with 8 clips at 720p 24fps" -ForegroundColor Yellow
Write-Host ""

$API_URL = "http://localhost:3001"

# Generate test spec with 8 clips for quick test
$testSpec = @{
    width = 1280
    height = 720
    fps = 24
    duration = 8
    fast = $true
    clips = @()
}

# Create 8 test clips
for ($i = 0; $i -lt 8; $i++) {
    $color = "#{0:X6}" -f (Get-Random -Maximum 0xFFFFFF)
    $testSpec.clips += @{
        duration = 1
        layers = @(
            @{
                type = "fill-color"
                color = $color
            },
            @{
                type = "title"
                text = "Test Clip $($i + 1)"
                position = "center"
            }
        )
    }
}

$body = @{
    editSpec = $testSpec
    outputFilename = "test-performance-$(Get-Date -Format 'HHmmss').mp4"
} | ConvertTo-Json -Depth 10 -Compress

Write-Host "📤 Sending test request..." -ForegroundColor Gray
$startTime = Get-Date

try {
    $response = Invoke-RestMethod -Uri "$API_URL/edit" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 300  # 5 minutes timeout
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "⏱️  Processing time: $([math]::Round($duration, 2)) seconds" -ForegroundColor Yellow
    Write-Host "📁 Output: $($response.outputPath)" -ForegroundColor Gray
    Write-Host "🔗 Download: $($response.downloadUrl)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📊 Performance metrics:" -ForegroundColor Cyan
    $clipsPerSecond = 8 / $duration
    Write-Host "   Speed: $([math]::Round($clipsPerSecond, 2)) clips/second" -ForegroundColor White
    Write-Host "   Estimated for 32 clips: $([math]::Round($duration * 4, 2)) seconds" -ForegroundColor White
    
}
catch {
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Write-Host ""
    Write-Host "❌ FAILED after $([math]::Round($duration, 2)) seconds" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

# Check Docker stats
Write-Host ""
Write-Host "📊 Docker Resource Usage:" -ForegroundColor Yellow
docker stats editly-api --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"