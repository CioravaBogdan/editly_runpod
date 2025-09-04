# GPU Monitoring Script pentru Editly
# Monitorizează utilizarea GPU în timp real

param(
    [int]$Interval = 1,  # Interval în secunde
    [switch]$Detailed,   # Afișare detaliată
    [switch]$SaveLog     # Salvează în fișier log
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   GPU MONITOR FOR EDITLY" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificare NVIDIA GPU
$gpu = nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ NVIDIA GPU not detected!" -ForegroundColor Red
    exit 1
}
Write-Host "🎮 GPU: $gpu" -ForegroundColor Green
Write-Host "📊 Monitoring interval: ${Interval}s" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$logFile = if ($SaveLog) { "gpu-monitor-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv" } else { $null }

if ($logFile) {
    "Timestamp,GPU%,Memory%,MemoryUsed(MB),Temperature(C),Power(W),EncoderUtil%,DecoderUtil%" | Out-File $logFile
    Write-Host "📝 Logging to: $logFile" -ForegroundColor Yellow
    Write-Host ""
}

# Header pentru afișare
if ($Detailed) {
    Write-Host "Time          | GPU% | Mem% | Used/Total MB  | Temp | Power | Encoder% | Decoder% | Processes" -ForegroundColor White
    Write-Host "--------------|------|------|----------------|------|-------|----------|----------|----------" -ForegroundColor Gray
} else {
    Write-Host "Time     | GPU% | Memory      | Temp | Power | Video Enc/Dec" -ForegroundColor White  
    Write-Host "---------|------|-------------|------|-------|---------------" -ForegroundColor Gray
}

# Monitoring loop
while ($true) {
    try {
        # Query GPU metrics
        $metrics = nvidia-smi --query-gpu=timestamp,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu,power.draw,utilization.encoder,utilization.decoder --format=csv,noheader,nounits
        
        if ($LASTEXITCODE -eq 0) {
            $values = $metrics -split ','
            $timestamp = Get-Date -Format "HH:mm:ss"
            
            $gpuUtil = $values[1].Trim()
            $memUtil = $values[2].Trim()
            $memUsed = $values[3].Trim()
            $memTotal = $values[4].Trim()
            $temp = $values[5].Trim()
            $power = $values[6].Trim()
            $encUtil = $values[7].Trim()
            $decUtil = $values[8].Trim()
            
            # Get processes using GPU
            $processes = ""
            if ($Detailed) {
                $procInfo = nvidia-smi --query-compute-apps=name --format=csv,noheader 2>$null
                if ($LASTEXITCODE -eq 0 -and $procInfo) {
                    $processes = ($procInfo -split "`n" | Select-Object -First 3) -join ", "
                }
            }
            
            # Format output based on mode
            if ($Detailed) {
                $line = "{0,13} | {1,4}% | {2,4}% | {3,5}/{4,5} MB | {5,3}°C | {6,5}W | {7,8}% | {8,8}% | {9}" -f `
                    $timestamp, $gpuUtil, $memUtil, $memUsed, $memTotal, $temp, $power, $encUtil, $decUtil, $processes
            } else {
                $memInfo = "{0,5}/{1,5}MB" -f $memUsed, $memTotal
                $videoInfo = "{0,3}%/{1,3}%" -f $encUtil, $decUtil
                $line = "{0,8} | {1,4}% | {2,11} | {3,3}°C | {4,5}W | {5,13}" -f `
                    $timestamp, $gpuUtil, $memInfo, $temp, $power, $videoInfo
            }
            
            # Color coding based on utilization
            $color = "White"
            if ([int]$gpuUtil -gt 80) { $color = "Green" }
            elseif ([int]$gpuUtil -gt 50) { $color = "Yellow" }
            elseif ([int]$gpuUtil -lt 20) { $color = "Gray" }
            
            Write-Host $line -ForegroundColor $color
            
            # Save to log if requested
            if ($logFile) {
                "$timestamp,$gpuUtil,$memUtil,$memUsed,$temp,$power,$encUtil,$decUtil" | Out-File $logFile -Append
            }
            
            # Check for NVENC usage
            if ([int]$encUtil -gt 0) {
                Write-Host "  🎬 VIDEO ENCODING DETECTED! (NVENC: ${encUtil}%)" -ForegroundColor Green -NoNewline
                Write-Host ""
            }
        }
    }
    catch {
        Write-Host "Error reading GPU metrics" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds $Interval
}