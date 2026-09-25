param(
  [string]$Ffmpeg = 'ffmpeg',
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '../fixtures/media')
)
$ErrorActionPreference = 'Stop'
$destination = $OutputDirectory
New-Item -ItemType Directory -Force $destination | Out-Null
& $Ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=320x180:rate=24' -f lavfi -i 'sine=frequency=440:sample_rate=48000' -t 3.2 -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart (Join-Path $destination 'synthetic-mp4.mp4')
if ($LASTEXITCODE -ne 0) { throw 'Synthetic MP4 generation failed' }
& $Ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'testsrc2=size=320x180:rate=24' -f lavfi -i 'sine=frequency=660:sample_rate=48000' -t 3.2 -c:v libvpx-vp9 -b:v 200k -c:a libopus (Join-Path $destination 'synthetic-webm.webm')
if ($LASTEXITCODE -ne 0) { throw 'Synthetic WebM generation failed' }
Get-FileHash (Join-Path $destination 'synthetic-mp4.mp4'), (Join-Path $destination 'synthetic-webm.webm') -Algorithm SHA256
