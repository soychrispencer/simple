$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$seedPath = Join-Path $appRoot 'public\seeds\simpleautos-catalog.json'
$userAgent = 'Mozilla/5.0'
$yearsToTry = @(2025, 2024)

$configs = @(
    @{
        VehicleType = 'car'
        EndpointType = 'passenger car'
        IncludeRemoteMakes = $true
        CuratedBrands = @('Toyota', 'Hyundai', 'Kia', 'Chevrolet', 'Suzuki', 'Mazda', 'Nissan', 'Ford', 'Volkswagen', 'Peugeot', 'Renault', 'Citroen', 'Subaru', 'Tesla', 'BYD', 'MG', 'Chery', 'Omoda', 'Jaecoo', 'JAC', 'Jetour', 'Geely', 'Honda', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'Mitsubishi', 'Isuzu', 'SsangYong', 'GWM', 'Haval')
    },
    @{
        VehicleType = 'motorcycle'
        EndpointType = 'motorcycle'
        IncludeRemoteMakes = $false
        CuratedBrands = @('Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'BMW', 'KTM', 'Ducati', 'Triumph', 'Aprilia', 'Benelli', 'CFMoto', 'Harley-Davidson', 'Royal Enfield', 'Bajaj', 'Husqvarna', 'Indian', 'Piaggio', 'GasGas')
    },
    @{
        VehicleType = 'truck'
        EndpointType = 'truck'
        IncludeRemoteMakes = $false
        CuratedBrands = @('Mercedes-Benz', 'Volvo', 'Scania', 'MAN', 'Hino', 'Isuzu', 'Iveco', 'Freightliner', 'International', 'Kenworth', 'Peterbilt', 'Mitsubishi Fuso', 'Volkswagen', 'Ford', 'Chevrolet', 'Ram', 'Hyundai', 'Foton', 'JAC', 'JMC', 'Renault')
    },
    @{
        VehicleType = 'bus'
        EndpointType = 'bus'
        IncludeRemoteMakes = $false
        CuratedBrands = @('Mercedes-Benz', 'Volvo', 'Scania', 'MAN', 'Agrale', 'Marcopolo', 'Irizar', 'Hino', 'Hyundai', 'King Long', 'Yutong', 'Volkswagen', 'BYD', 'Golden Dragon')
    }
)

function Normalize-Text([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return '' }
    $normalized = $value.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($ch)
        }
    }
    return ($sb.ToString().ToLowerInvariant() -replace '[^a-z0-9]+', ' ' -replace '\s+', ' ').Trim()
}

function ConvertTo-Slug([string]$value) {
    return (Normalize-Text $value) -replace ' ', '-'
}

function ConvertTo-PrettyName([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return '' }
    if ($value -cmatch '[a-z]') { return $value.Trim() }
    $tokens = $value.Trim() -split '(\s+|/|-)'
    $parts = foreach ($token in $tokens) {
        if ($token -match '^\s+$' -or $token -eq '/' -or $token -eq '-') {
            $token
        } elseif ($token.Length -le 4 -or $token -match '\d') {
            $token.ToUpperInvariant()
        } else {
            $token.Substring(0, 1).ToUpperInvariant() + $token.Substring(1).ToLowerInvariant()
        }
    }
    return -join $parts
}

function Get-JsonFromUrl([string]$url) {
    $raw = curl.exe -s -L -A $userAgent $url
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw "Empty response for $url"
    }
    try {
        return $raw | ConvertFrom-Json
    } catch {
        $preview = $raw.Substring(0, [Math]::Min(180, $raw.Length))
        throw "Invalid JSON for $url :: $preview"
    }
}

function Ensure-UniqueId([string]$base, [System.Collections.Generic.HashSet[string]]$used) {
    $candidate = if ([string]::IsNullOrWhiteSpace($base)) { 'item' } else { $base }
    $suffix = 2
    while ($used.Contains($candidate)) {
        $candidate = "$base-$suffix"
        $suffix += 1
    }
    [void]$used.Add($candidate)
    return $candidate
}

function Add-VehicleType($item, [string]$vehicleType) {
    if (-not $item.vehicle_types) { $item | Add-Member -NotePropertyName vehicle_types -NotePropertyValue @() -Force }
    if ($item.vehicle_types -notcontains $vehicleType) {
        $item.vehicle_types += $vehicleType
    }
}

$catalog = Get-Content $seedPath -Raw | ConvertFrom-Json
$usedBrandIds = [System.Collections.Generic.HashSet[string]]::new()
$usedModelIds = [System.Collections.Generic.HashSet[string]]::new()
$brandsByKey = @{}
$modelsByKey = @{}

foreach ($brand in $catalog.brands) {
    [void]$usedBrandIds.Add([string]$brand.id)
    $brandsByKey[(Normalize-Text $brand.name)] = [pscustomobject]@{
        id = [string]$brand.id
        name = [string]$brand.name
        vehicle_types = @($brand.vehicle_types)
    }
}

foreach ($model in $catalog.models) {
    [void]$usedModelIds.Add([string]$model.id)
    $modelsByKey["$($model.brand_id)|$(Normalize-Text $model.name)"] = [pscustomobject]@{
        id = [string]$model.id
        brand_id = [string]$model.brand_id
        name = [string]$model.name
        vehicle_types = @($model.vehicle_types)
    }
}

function Ensure-Brand([string]$brandName, [string]$vehicleType) {
    $pretty = ConvertTo-PrettyName $brandName
    $key = Normalize-Text $pretty
    if ($brandsByKey.ContainsKey($key)) {
        Add-VehicleType $brandsByKey[$key] $vehicleType
        return $brandsByKey[$key]
    }

    $brand = [pscustomobject]@{
        id = Ensure-UniqueId (ConvertTo-Slug $pretty) $usedBrandIds
        name = $pretty
        vehicle_types = @($vehicleType)
    }
    $brandsByKey[$key] = $brand
    return $brand
}

function Ensure-Model([string]$brandId, [string]$modelName, [string]$vehicleType) {
    if ([string]::IsNullOrWhiteSpace($modelName)) { return }
    $trimmed = $modelName.Trim()
    $key = "$brandId|$(Normalize-Text $trimmed)"
    if ($modelsByKey.ContainsKey($key)) {
        Add-VehicleType $modelsByKey[$key] $vehicleType
        return
    }

    $model = [pscustomobject]@{
        id = Ensure-UniqueId ("$brandId-$(ConvertTo-Slug $trimmed)") $usedModelIds
        brand_id = $brandId
        name = $trimmed
        vehicle_types = @($vehicleType)
    }
    $modelsByKey[$key] = $model
}

function Get-VpicModels([string]$makeName, [string]$endpointType) {
    foreach ($year in $yearsToTry) {
        try {
            $url = "https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/$([uri]::EscapeDataString($makeName))/modelyear/$year/vehicletype/$([uri]::EscapeDataString($endpointType))?format=json"
            $payload = Get-JsonFromUrl $url
            if ($payload.Results -and $payload.Results.Count -gt 0) {
                return @($payload.Results)
            }
        } catch {
            continue
        }
    }
    return @()
}

foreach ($config in $configs) {
    $existingBrands = @($brandsByKey.Values | Where-Object { $_.vehicle_types -contains $config.VehicleType } | ForEach-Object { $_.name })
    $remoteBrands = @()
    if ($config.IncludeRemoteMakes) {
        $url = "https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/$([uri]::EscapeDataString($config.EndpointType))?format=json"
        $payload = Get-JsonFromUrl $url
        $remoteBrands = @($payload.Results | ForEach-Object { ConvertTo-PrettyName $_.MakeName })
    }

    $candidateBrands = @($existingBrands + $config.CuratedBrands + $remoteBrands | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique)
    Write-Output "vPIC $($config.VehicleType) brands: $($candidateBrands.Count)"

    $processed = 0
    foreach ($brandName in $candidateBrands) {
        $brand = Ensure-Brand $brandName $config.VehicleType
        $models = Get-VpicModels $brandName $config.EndpointType
        foreach ($model in $models) {
            Ensure-Model $brand.id ([string]$model.Model_Name) $config.VehicleType
        }
        $processed += 1
        if (($processed % 10) -eq 0 -or $processed -eq $candidateBrands.Count) {
            Write-Output "vPIC $($config.VehicleType) models: $processed/$($candidateBrands.Count)"
        }
    }
}

$catalog.generated_at = [DateTime]::UtcNow.ToString('o')
$catalog.source = 'internet-merged'
$catalog.source_details = [pscustomobject]@{
    car = 'NHTSA vPIC current lineup + local seed'
    motorcycle = 'NHTSA vPIC current lineup + local seed'
    truck = 'NHTSA vPIC current lineup + local seed'
    bus = 'NHTSA vPIC current lineup + local seed'
}
$catalog.brands = @($brandsByKey.Values | Sort-Object name)
$catalog.models = @($modelsByKey.Values | Sort-Object brand_id, name)

$json = $catalog | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($seedPath, "$json`n", [System.Text.UTF8Encoding]::new($false))

Write-Output "Catalog written to $seedPath"
Write-Output "Brands: $($catalog.brands.Count)"
Write-Output "Models: $($catalog.models.Count)"
