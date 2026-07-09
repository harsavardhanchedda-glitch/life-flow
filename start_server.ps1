# LifeFlow Native PowerShell Development Server
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "  LifeFlow Development Server Running!" -ForegroundColor Green
    Write-Host "  Local Address: http://localhost:$port/" -ForegroundColor Yellow
    Write-Host "--------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Serving files from: $PSScriptRoot"
    Write-Host "Press Ctrl+C in this terminal window to stop the server."
    Write-Host ""

    # Open default browser automatically
    Start-Process "http://localhost:$port/"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        # Default document
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }
        
        # Replace forward slashes with backward slashes for Windows path resolution
        $relPath = $urlPath.Replace("/", "\").TrimStart("\")
        $filePath = Join-Path $PSScriptRoot $relPath
        
        if (Test-Path $filePath -PathType Leaf) {
            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Content-Type Mapping based on file extension
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = "text/plain"
                
                if ($ext -eq ".html" -or $ext -eq ".htm") {
                    $contentType = "text/html; charset=utf-8"
                } elseif ($ext -eq ".css") {
                    $contentType = "text/css"
                } elseif ($ext -eq ".js") {
                    $contentType = "application/javascript; charset=utf-8"
                } elseif ($ext -eq ".json") {
                    $contentType = "application/json; charset=utf-8"
                } elseif ($ext -eq ".png") {
                    $contentType = "image/png"
                } elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") {
                    $contentType = "image/jpeg"
                } elseif ($ext -eq ".svg") {
                    $contentType = "image/svg+xml"
                }
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
                $errMsg = [System.Text.Encoding]::UTF8.GetBytes("Error reading file: $_")
                $response.OutputStream.Write($errMsg, 0, $errMsg.Length)
            }
        } else {
            $response.StatusCode = 404
            $notFoundMsg = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $urlPath")
            $response.OutputStream.Write($notFoundMsg, 0, $notFoundMsg.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Server error occurred: $_" -ForegroundColor Red
} finally {
    $listener.Stop()
    Write-Host "Server stopped." -ForegroundColor Red
}
