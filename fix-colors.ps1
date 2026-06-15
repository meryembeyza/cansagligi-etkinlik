$files = Get-ChildItem -Path "src" -Filter *.tsx -Recurse

foreach ($file in $files) {
    $filePath = $file.FullName
    $content = [System.IO.File]::ReadAllText($filePath)
    
    # Backgrounds
    $content = [regex]::Replace($content, "backgroundColor:\s*'#fff'", "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    $content = [regex]::Replace($content, 'backgroundColor:\s*"#fff"', "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    $content = [regex]::Replace($content, "backgroundColor:\s*'#ffffff'", "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    $content = [regex]::Replace($content, 'backgroundColor:\s*"#ffffff"', "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    
    $content = [regex]::Replace($content, "backgroundColor:\s*'white'", "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    $content = [regex]::Replace($content, 'backgroundColor:\s*"white"', "backgroundColor: 'var(--bg-card)'", "IgnoreCase")
    
    $content = [regex]::Replace($content, "background:\s*'#fff'", "background: 'var(--bg-card)'", "IgnoreCase")
    $content = [regex]::Replace($content, 'background:\s*"#fff"', "background: 'var(--bg-card)'", "IgnoreCase")
    
    $content = [regex]::Replace($content, "backgroundColor:\s*'#f9fafb'", "backgroundColor: 'var(--bg-main)'", "IgnoreCase")
    
    # Specific colors from screenshots (Calendar, Events, etc)
    $content = [regex]::Replace($content, "backgroundColor:\s*'#fffbeb'", "backgroundColor: 'var(--bg-warning-light)'", "IgnoreCase")
    $content = [regex]::Replace($content, "backgroundColor:\s*'#fecaca'", "backgroundColor: 'var(--bg-danger-light)'", "IgnoreCase")
    $content = [regex]::Replace($content, "backgroundColor:\s*'#bbf7d0'", "backgroundColor: 'var(--bg-success-light)'", "IgnoreCase")
    $content = [regex]::Replace($content, "backgroundColor:\s*'#e5e7eb'", "backgroundColor: 'var(--border-color)'", "IgnoreCase")
    $content = [regex]::Replace($content, "backgroundColor:\s*'#bfdbfe'", "backgroundColor: 'var(--bg-info-light)'", "IgnoreCase")

    # Borders
    $content = [regex]::Replace($content, "1px solid #eaeaea", "1px solid var(--border-color)", "IgnoreCase")
    $content = [regex]::Replace($content, "borderColor:\s*'#eaeaea'", "borderColor: 'var(--border-color)'", "IgnoreCase")
    $content = [regex]::Replace($content, "borderBottom:\s*'1px solid #eaeaea'", "borderBottom: '1px solid var(--border-color)'", "IgnoreCase")
    $content = [regex]::Replace($content, "borderTop:\s*'1px solid #eaeaea'", "borderTop: '1px solid var(--border-color)'", "IgnoreCase")
    
    # Text Colors
    $content = [regex]::Replace($content, "color:\s*'#111'", "color: 'var(--text-main)'", "IgnoreCase")
    $content = [regex]::Replace($content, "color:\s*'#333'", "color: 'var(--text-main)'", "IgnoreCase")
    $content = [regex]::Replace($content, "color:\s*'#222'", "color: 'var(--text-main)'", "IgnoreCase")
    $content = [regex]::Replace($content, "color:\s*'#4b5563'", "color: 'var(--text-muted)'", "IgnoreCase")
    
    [System.IO.File]::WriteAllText($filePath, $content)
}

Write-Host "Color replacements complete."
