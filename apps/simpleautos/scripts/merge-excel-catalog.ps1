param(
    [Parameter(Mandatory = $true)]
    [string]$SourceXlsxPath,
    [string]$SeedPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SeedPath)) {
    $SeedPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'public\seeds\simpleautos-catalog.json'
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

if (-not (Test-Path $SourceXlsxPath)) {
    throw "No existe el archivo Excel: $SourceXlsxPath"
}

if (-not (Test-Path $SeedPath)) {
    throw "No existe el seed destino: $SeedPath"
}

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
    $normalized = Normalize-Text $value
    if ([string]::IsNullOrWhiteSpace($normalized)) { return 'item' }
    return $normalized -replace ' ', '-'
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

function Get-InlineText($cell) {
    if ($null -eq $cell) { return '' }
    if ($cell.t -eq 'inlineStr') {
        if ($cell.is) { return [string]$cell.is.InnerText }
        return ''
    }
    if ($cell.v) { return [string]$cell.v }
    return ''
}

function Add-VehicleTypes($item, [string[]]$vehicleTypes) {
    if (-not $item.vehicle_types) {
        $item | Add-Member -NotePropertyName vehicle_types -NotePropertyValue @() -Force
    }

    $changed = $false
    foreach ($vehicleType in @($vehicleTypes | Where-Object { $_ } | Select-Object -Unique)) {
        if ($item.vehicle_types -notcontains $vehicleType) {
            $item.vehicle_types += $vehicleType
            $changed = $true
        }
    }
    return $changed
}

function Expand-Years([string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return @() }
    $trimmed = $value.Trim()
    $years = [regex]::Matches($trimmed, '\d{4}') | ForEach-Object { [int]$_.Value }
    if ($years.Count -eq 0) { return @() }

    if ($trimmed -match '^\s*\d{4}\s*-\s*\d{4}\s*$') {
        $start = $years[0]
        $end = $years[1]
        if ($start -gt $end) {
            $swap = $start
            $start = $end
            $end = $swap
        }
        if (($end - $start) -gt 40) {
            return @($years | Select-Object -Unique | ForEach-Object { [string]$_ })
        }
        return @($start..$end | ForEach-Object { [string]$_ })
    }

    return @($years | Select-Object -Unique | Sort-Object | ForEach-Object { [string]$_ })
}

function Get-SheetRows([string]$xlsxPath, [string]$sheetEntryPath = 'xl/worksheets/sheet2.xml') {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($xlsxPath)
    try {
        $entry = $zip.GetEntry($sheetEntryPath)
        if ($null -eq $entry) {
            throw "No se encontró la hoja $sheetEntryPath dentro del Excel."
        }
        $reader = New-Object IO.StreamReader($entry.Open())
        try {
            $xml = [xml]$reader.ReadToEnd()
        } finally {
            $reader.Dispose()
        }

        $rows = @($xml.worksheet.sheetData.row)
        if ($rows.Count -lt 2) { return @() }

        $parsedRows = foreach ($row in $rows[1..($rows.Count - 1)]) {
            $cells = @{}
            foreach ($cell in $row.c) {
                $column = $cell.r -replace '\d', ''
                $cells[$column] = Get-InlineText $cell
            }

            if ($cells['A'] -and $cells['B'] -and $cells['C']) {
                [pscustomobject]@{
                    category = [string]$cells['A']
                    brand = [string]$cells['B']
                    model = [string]$cells['C']
                    version = [string]$cells['D']
                    years = [string]$cells['E']
                }
            }
        }
        return @($parsedRows)
    } finally {
        $zip.Dispose()
    }
}

$specialMotorcycleBrands = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
@('yamaha', 'polaris', 'can am', 'honda', 'kawasaki', 'arctic cat', 'brp', 'bombardier') | ForEach-Object { [void]$specialMotorcycleBrands.Add($_) }

$specialTruckBrands = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
@('rosenbauer', 'mercedes benz', 'scania', 'pierce', 'e one', 'ford', 'oshkosh', 'daimler', 'hyundai', 'nikola', 'volvo', 'byd') | ForEach-Object { [void]$specialTruckBrands.Add($_) }

function Resolve-VehicleTypes([string]$category, [string]$brandName, [string]$modelName, [string]$versionName) {
    switch (Normalize-Text $category) {
        'automoviles' { return @('car') }
        'motocicletas' { return @('motorcycle') }
        'camiones' { return @('truck') }
        'buses y minibuses' { return @('bus') }
        'maquinaria' { return @('machinery') }
        'nautico' { return @('nautical') }
        'aeronautico' { return @('aerial') }
        'agricola' { return @('machinery') }
        'especial militar' {
            $combined = Normalize-Text "$brandName $modelName $versionName"
            $brandKey = Normalize-Text $brandName

            if (
                $combined -match '\batv\b' -or
                $combined -match '\butv\b' -or
                $combined -match 'motonieve' -or
                $combined -match 'snowmobile' -or
                $combined -match 'quad' -or
                $specialMotorcycleBrands.Contains($brandKey)
            ) {
                return @('motorcycle')
            }

            if (
                $combined -match 'ambulancia' -or
                $combined -match 'camion' -or
                $combined -match 'autobomba' -or
                $combined -match 'pumper' -or
                $combined -match 'tanker' -or
                $combined -match 'bomberos' -or
                $combined -match 'plataforma' -or
                $combined -match 'aeroportuario' -or
                $combined -match 'sprinter' -or
                $combined -match 'transit' -or
                $combined -match '\b6x6\b' -or
                $combined -match '\b6x4\b' -or
                $combined -match '\b4x4\b' -or
                $specialTruckBrands.Contains($brandKey)
            ) {
                return @('truck')
            }

            return @('machinery')
        }
        default { return @() }
    }
}

$catalog = Get-Content $SeedPath -Raw | ConvertFrom-Json
if (-not ($catalog.PSObject.Properties.Name -contains 'versions')) {
    $catalog | Add-Member -NotePropertyName versions -NotePropertyValue @() -Force
}

$usedBrandIds = [System.Collections.Generic.HashSet[string]]::new()
$usedModelIds = [System.Collections.Generic.HashSet[string]]::new()
$usedVersionIds = [System.Collections.Generic.HashSet[string]]::new()

$brandsByKey = @{}
$brandById = @{}
$modelsByKey = @{}
$modelById = @{}
$versionsByKey = @{}

foreach ($brand in @($catalog.brands)) {
    $brandId = [string]$brand.id
    [void]$usedBrandIds.Add($brandId)
    $brandById[$brandId] = $brand
    $brandsByKey[(Normalize-Text $brand.name)] = $brand
}

foreach ($model in @($catalog.models)) {
    $modelId = [string]$model.id
    [void]$usedModelIds.Add($modelId)
    $modelById[$modelId] = $model
    $modelsByKey["$([string]$model.brand_id)|$(Normalize-Text $model.name)"] = $model
}

foreach ($version in @($catalog.versions)) {
    $versionId = [string]$version.id
    [void]$usedVersionIds.Add($versionId)
    $versionsByKey["$([string]$version.model_id)|$(Normalize-Text $version.name)|$([string]$version.year)"] = $version
}

$stats = [ordered]@{
    rows_read = 0
    rows_processed = 0
    skipped_rows = 0
    new_brands = 0
    new_models = 0
    new_versions = 0
    merged_brand_types = 0
    merged_model_types = 0
    merged_version_types = 0
}

function Ensure-Brand([string]$brandName, [string[]]$vehicleTypes) {
    $key = Normalize-Text $brandName
    if ($brandsByKey.ContainsKey($key)) {
        if (Add-VehicleTypes $brandsByKey[$key] $vehicleTypes) {
            $stats.merged_brand_types += 1
        }
        return $brandsByKey[$key]
    }

    $prettyName = $brandName.Trim()
    $brand = [pscustomobject]@{
        id = Ensure-UniqueId (ConvertTo-Slug $prettyName) $usedBrandIds
        name = $prettyName
        vehicle_types = @($vehicleTypes | Select-Object -Unique)
    }
    $brandsByKey[$key] = $brand
    $brandById[$brand.id] = $brand
    $stats.new_brands += 1
    return $brand
}

function Ensure-Model([string]$brandId, [string]$modelName, [string[]]$vehicleTypes) {
    $normalizedModel = Normalize-Text $modelName
    $key = "$brandId|$normalizedModel"
    if ($modelsByKey.ContainsKey($key)) {
        if (Add-VehicleTypes $modelsByKey[$key] $vehicleTypes) {
            $stats.merged_model_types += 1
        }
        return $modelsByKey[$key]
    }

    $prettyName = $modelName.Trim()
    $model = [pscustomobject]@{
        id = Ensure-UniqueId ("$brandId-$(ConvertTo-Slug $prettyName)") $usedModelIds
        brand_id = $brandId
        name = $prettyName
        vehicle_types = @($vehicleTypes | Select-Object -Unique)
    }
    $modelsByKey[$key] = $model
    $modelById[$model.id] = $model
    $stats.new_models += 1
    return $model
}

function Ensure-Version([string]$brandId, [string]$modelId, [string]$versionName, [string]$year, [string[]]$vehicleTypes) {
    if ([string]::IsNullOrWhiteSpace($versionName)) { return }
    $key = "$modelId|$(Normalize-Text $versionName)|$year"
    if ($versionsByKey.ContainsKey($key)) {
        if (Add-VehicleTypes $versionsByKey[$key] $vehicleTypes) {
            $stats.merged_version_types += 1
        }
        return
    }

    $slugBase = "$modelId-$(ConvertTo-Slug $versionName)"
    if ($year) { $slugBase = "$slugBase-$year" }
    $version = [pscustomobject]@{
        id = Ensure-UniqueId $slugBase $usedVersionIds
        brand_id = $brandId
        model_id = $modelId
        name = $versionName.Trim()
        year = if ($year) { $year } else { $null }
        vehicle_types = @($vehicleTypes | Select-Object -Unique)
    }
    $versionsByKey[$key] = $version
    $stats.new_versions += 1
}

$rows = Get-SheetRows -xlsxPath $SourceXlsxPath
$stats.rows_read = $rows.Count

foreach ($row in $rows) {
    $vehicleTypes = Resolve-VehicleTypes $row.category $row.brand $row.model $row.version
    if ($vehicleTypes.Count -eq 0) {
        $stats.skipped_rows += 1
        continue
    }

    $brand = Ensure-Brand $row.brand $vehicleTypes
    $model = Ensure-Model $brand.id $row.model $vehicleTypes
    $years = Expand-Years $row.years
    if ($years.Count -eq 0) { $years = @('') }

    foreach ($year in $years) {
        Ensure-Version $brand.id $model.id $row.version $year $vehicleTypes
    }

    $stats.rows_processed += 1
}

$catalog.generated_at = [DateTime]::UtcNow.ToString('o')
$catalog.source = 'internet-merged+excel'

$sourceDetails = [ordered]@{}
if ($catalog.PSObject.Properties.Name -contains 'source_details' -and $catalog.source_details) {
    foreach ($prop in $catalog.source_details.PSObject.Properties) {
        $sourceDetails[$prop.Name] = $prop.Value
    }
}
$sourceDetails['excel'] = "Excel local fusionado: $([System.IO.Path]::GetFileName($SourceXlsxPath))"
$catalog | Add-Member -NotePropertyName source_details -NotePropertyValue ([pscustomobject]$sourceDetails) -Force
$catalog | Add-Member -NotePropertyName excel_import -NotePropertyValue ([pscustomobject]$stats) -Force
$catalog.brands = @($brandsByKey.Values | Sort-Object name)
$catalog.models = @($modelsByKey.Values | Sort-Object brand_id, name)
$catalog.versions = @($versionsByKey.Values | Sort-Object brand_id, model_id, year, name)

$json = $catalog | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($SeedPath, "$json`n", [System.Text.UTF8Encoding]::new($false))

Write-Output "Excel fusionado en $SeedPath"
Write-Output "Brands: $($catalog.brands.Count)"
Write-Output "Models: $($catalog.models.Count)"
Write-Output "Versions: $($catalog.versions.Count)"
$stats.GetEnumerator() | ForEach-Object { Write-Output "$($_.Key): $($_.Value)" }
