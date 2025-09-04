# Test Script pentru Editly Performance
# Testează diferite configurații și măsoară performanța

param(
    [string]$Mode = "simple",  # simple, parallel, benchmark
    [int]$Clips = 32
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   EDITLY PERFORMANCE TEST" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Mode: $Mode | Clips: $Clips" -ForegroundColor Yellow
Write-Host ""

$API_URL = "http://localhost:3001"

# Test spec generator
function Generate-TestSpec {
    param([int]$NumClips = 32)
    
    $clips = @()
    for ($i = 0; $i -lt $NumClips; $i++) {
        $color = "#{0:X6}" -f (Get-Random -Maximum 0xFFFFFF)
        $clips += @{
            duration = 1
            layers = @(
                @{
                    type = "fill-color"
                    color = $color
                },
                @{
                    type = "title"
                    text = "Clip $($i + 1)"
                    position = "center"
                }
            )
        }
    }
    
    return @{
        width = 1280  # 720p pentru viteză
        height = 720
        fps = 24      # FPS redus pentru viteză
        duration = $NumClips
        clips = $clips
        fast = $true
    }
}

# Test simple edit
function Test-SimpleEdit {
    Write-Host "🧪 Testing Simple Edit..." -ForegroundColor Yellow
    
    $spec = Generate-TestSpec -NumClips $Clips
    $body = @{
        editSpec = $spec
        outputFilename = "test-simple-$(Get-Date -Format 'yyyyMMdd-HHmmss').mp4"
    } | ConvertTo-Json -Depth 10 -Compress
    
    $startTime = Get-Date
    
    try {
        Write-Host "  📤 Sending request..." -ForegroundColor Gray
        $response = Invoke-RestMethod -Uri "$API_URL/edit" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 1800  # 30 minutes timeout
        
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Host "  ✅ Success in $([math]::Round($duration, 2))s" -ForegroundColor Green
        Write-Host "  📁 Output: $($response.outputPath)" -ForegroundColor Gray
        Write-Host "  🔗 Download: $($response.downloadUrl)" -ForegroundColor Gray
        
        return @{
            Success = $true
            Duration = $duration
            Output = $response.outputPath
        }
    }
    catch {
        $duration = ((Get-Date) - $startTime).TotalSeconds
        Write-Host "  ❌ Failed after $([math]::Round($duration, 2))s" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        
        return @{
            Success = $false
            Duration = $duration
            Error = $_.ToString()
        }
    }
}

# Monitor resources
function Monitor-Resources {
    Write-Host "📊 Resource Monitoring:" -ForegroundColor Yellow
    
    # Docker stats
    $stats = docker stats editly-api --no-stream --format "table {{.Container}}`t{{.CPUPerc}}`t{{.MemUsage}}"
    Write-Host $stats -ForegroundColor Gray
    
    # GPU stats (if available)
    $gpu = nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits 2>$null
    if ($LASTEXITCODE -eq 0) {
        $gpuData = $gpu -split ','
        Write-Host "  🎮 GPU: $($gpuData[0])% | Memory: $($gpuData[1])/$($gpuData[2]) MB" -ForegroundColor Gray
    }
}

# Benchmark multiple configurations
function Run-Benchmark {
    Write-Host "🚀 Running Benchmark Tests..." -ForegroundColor Yellow
    Write-Host ""
    
    $configurations = @(
        @{ Name = "Ultra Fast 720p 24fps"; Width = 1280; Height = 720; FPS = 24; Fast = $true },
        @{ Name = "Fast 720p 30fps"; Width = 1280; Height = 720; FPS = 30; Fast = $false },
        @{ Name = "Standard 1080p 30fps"; Width = 1920; Height = 1080; FPS = 30; Fast = $false }
    )
    
    $results = @()
    
    foreach ($config in $configurations) {
        Write-Host "Testing: $($config.Name)" -ForegroundColor Cyan
        
        $spec = Generate-TestSpec -NumClips $Clips
        $spec.width = $config.Width
        $spec.height = $config.Height
        $spec.fps = $config.FPS
        $spec.fast = $config.Fast
        
        $body = @{
            editSpec = $spec
            outputFilename = "benchmark-$($config.Name.Replace(' ', '-'))-$(Get-Date -Format 'HHmmss').mp4"
        } | ConvertTo-Json -Depth 10 -Compress
        
        $startTime = Get-Date
        
        try {
            $response = Invoke-RestMethod -Uri "$API_URL/edit" `
                -Method POST `
                -ContentType "application/json" `
                -Body $body `
                -TimeoutSec 1800
            
            $duration = ((Get-Date) - $startTime).TotalSeconds
            Write-Host "  ✅ Completed in $([math]::Round($duration, 2))s" -ForegroundColor Green
            
            $results += @{
                Config = $config.Name
                Success = $true
                Duration = $duration
            }
        }
        catch {
            $duration = ((Get-Date) - $startTime).TotalSeconds
            Write-Host "  ❌ Failed after $([math]::Round($duration, 2))s" -ForegroundColor Red
            
            $results += @{
                Config = $config.Name
                Success = $false
                Duration = $duration
            }
        }
        
        Monitor-Resources
        Write-Host ""
    }
    
    # Summary
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "   BENCHMARK RESULTS" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    
    $results | Sort-Object Duration | ForEach-Object {
        $status = if ($_.Success) { "✅" } else { "❌" }
        Write-Host "$status $($_.Config): $([math]::Round($_.Duration, 2))s" -ForegroundColor White
    }
}

# Main execution
Write-Host "🔍 Checking API health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/health" -Method GET
    Write-Host "✅ API is healthy" -ForegroundColor Green
    
    $info = Invoke-RestMethod -Uri "$API_URL/info" -Method GET
    Write-Host "📋 Configuration:" -ForegroundColor Yellow
    Write-Host "  GPU: $($info.runtime.useGpu)" -ForegroundColor Gray
    Write-Host "  Encoder: $($info.runtime.videoEncoder)" -ForegroundColor Gray
    Write-Host "  Threads: $($info.runtime.ffmpegThreads)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "❌ API is not responding!" -ForegroundColor Red
    Write-Host "Please check: docker logs editly-api" -ForegroundColor Yellow
    exit 1
}

# Execute based on mode
switch ($Mode) {
    "simple" {
        Test-SimpleEdit
        Monitor-Resources
    }
    "benchmark" {
        Run-Benchmark
    }
    "parallel" {
        Write-Host "⚠️  Parallel mode requires multiple workers" -ForegroundColor Yellow
        Write-Host "Run: docker-compose -f docker-compose-parallel.yml up -d" -ForegroundColor Yellow
    }
    default {
        Write-Host "Unknown mode: $Mode" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Test complete!" -ForegroundColor Green