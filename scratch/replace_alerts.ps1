$files = Get-ChildItem -Path src -Filter *.tsx -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false

    if ($content -match "alert\(") {
        $lines = $content -split "`r`n|`n"
        $newLines = @()
        
        $hasToastImport = $content -match "import \{.*toast.*\} from 'react-hot-toast'"
        
        foreach ($line in $lines) {
            if ($line -match "alert\((.*)\)") {
                $arg = $matches[1]
                
                # Check if it's an error based on keywords
                if ($arg -match "hata|başarısız|Hata|fail|error|zorunlu|geçemez|desteklenir|bulunamadı") {
                    $newLine = $line -replace "alert\((.*?)\)", "toast.error(`$1)"
                } else {
                    $newLine = $line -replace "alert\((.*?)\)", "toast.success(`$1)"
                }
                $newLines += $newLine
                $modified = $true
            } else {
                $newLines += $line
            }
        }
        
        if ($modified) {
            $finalContent = $newLines -join "`n"
            if (-not $hasToastImport) {
                # add import after the first import or "use client"
                $finalContent = $finalContent -replace "('use client';|`"use client`";)", "`$1`nimport { toast } from 'react-hot-toast';"
                if (-not ($finalContent -match "import \{ toast \}")) {
                     $finalContent = "import { toast } from 'react-hot-toast';`n" + $finalContent
                }
            }
            Set-Content -Path $file.FullName -Value $finalContent -Encoding UTF8
            Write-Host "Updated $($file.Name)"
        }
    }
}
