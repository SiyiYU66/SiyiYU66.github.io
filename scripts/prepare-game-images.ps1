# Preserve the supplied masters. The game only loads these proportional web copies.
# Run from the repository root after replacing a ship illustration.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskAssets = Join-Path $taskRoot 'assets/games/battleship/assets'
$taskReport = @()
foreach ($fleet in @('player1', 'player2')) {
  foreach ($ship in @('battleship', 'carrier', 'cruiser', 'destroyer', 'submarine')) {
    $taskSource = Join-Path $taskAssets "$fleet/$ship.png"
    $taskOutput = Join-Path $taskAssets "ui/$fleet/$ship.png"
    New-Item -ItemType Directory -Path (Split-Path $taskOutput) -Force | Out-Null
    $taskImage = [Drawing.Image]::FromFile($taskSource)
    try {
      $taskWidth = [Math]::Min(768, $taskImage.Width)
      $taskHeight = [int][Math]::Round($taskImage.Height * $taskWidth / $taskImage.Width)
      $taskBitmap = [Drawing.Bitmap]::new($taskWidth, $taskHeight, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $taskGraphics = [Drawing.Graphics]::FromImage($taskBitmap)
        try {
          $taskGraphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
          $taskGraphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
          $taskGraphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $taskGraphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $taskGraphics.DrawImage($taskImage, [Drawing.Rectangle]::new(0, 0, $taskWidth, $taskHeight), 0, 0, $taskImage.Width, $taskImage.Height, [Drawing.GraphicsUnit]::Pixel)
        } finally { $taskGraphics.Dispose() }
        $taskBitmap.Save($taskOutput, [Drawing.Imaging.ImageFormat]::Png)
        # Bake the original CSS darkening for static, low-memory distant ships.
        if ($fleet -eq 'player1' -and $ship -in @('battleship', 'cruiser', 'carrier')) {
          $taskDarkPath = Join-Path $taskAssets "ui/silhouettes/$ship.png"
          New-Item -ItemType Directory -Path (Split-Path $taskDarkPath) -Force | Out-Null
          $taskBrightness = if ($ship -eq 'carrier') { 0.11 } else { 0.16 }
          $taskSaturation = if ($ship -eq 'carrier') { 0.3 } else { 0.4 }
          $taskMatrix = [Drawing.Imaging.ColorMatrix]::new()
          $taskLuma = @(0.2126, 0.7152, 0.0722)
          for ($taskRow = 0; $taskRow -lt 3; $taskRow++) {
            for ($taskCol = 0; $taskCol -lt 3; $taskCol++) {
              $taskProperty = "Matrix$taskRow$taskCol"
              $taskMatrix.$taskProperty = [single]($taskBrightness * ($taskLuma[$taskRow] * (1 - $taskSaturation) + $(if ($taskRow -eq $taskCol) { $taskSaturation } else { 0 })))
            }
          }
          $taskDark = [Drawing.Bitmap]::new($taskWidth, $taskHeight, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
          $taskAttributes = [Drawing.Imaging.ImageAttributes]::new()
          $taskDarkGraphics = [Drawing.Graphics]::FromImage($taskDark)
          try {
            $taskAttributes.SetColorMatrix($taskMatrix)
            $taskDarkGraphics.DrawImage($taskBitmap, [Drawing.Rectangle]::new(0,0,$taskWidth,$taskHeight), 0,0,$taskWidth,$taskHeight,[Drawing.GraphicsUnit]::Pixel,$taskAttributes)
            $taskDark.Save($taskDarkPath,[Drawing.Imaging.ImageFormat]::Png)
          } finally { $taskDarkGraphics.Dispose(); $taskAttributes.Dispose(); $taskDark.Dispose() }
        }
      } finally { $taskBitmap.Dispose() }
      $taskReport += [ordered]@{source="$fleet/$ship.png";web="ui/$fleet/$ship.png";sourceWidth=$taskImage.Width;sourceHeight=$taskImage.Height;width=$taskWidth;height=$taskHeight;sourceSHA256=(Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash.ToLower()}
    } finally { $taskImage.Dispose() }
  }
}
$taskReport | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskAssets 'ui/manifest.json') -Encoding utf8
'Generated 10 ship web images without changing their masters.'
