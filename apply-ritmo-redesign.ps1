$ErrorActionPreference = 'Stop'
$ritmoSource = 'C:\Users\arthu\Downloads\Estudo\Novo-Projeto\ritmo-design'
$ritmoTarget = 'C:\Users\arthu\Downloads\Estudo\Ritmo'
$ritmoManifest = Get-Content -LiteralPath 'C:\Users\arthu\Downloads\Estudo\Novo-Projeto\ritmo-redesign-manifest.json' -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($ritmoItem in $ritmoManifest) {
  $ritmoSourceFile = [IO.Path]::GetFullPath((Join-Path $ritmoSource $ritmoItem.File))
  $ritmoTargetFile = [IO.Path]::GetFullPath((Join-Path $ritmoTarget $ritmoItem.File))
  if (-not $ritmoSourceFile.StartsWith($ritmoSource + '\') -or -not $ritmoTargetFile.StartsWith($ritmoTarget + '\')) { throw 'Caminho fora do projeto.' }
  if ((Get-FileHash -LiteralPath $ritmoSourceFile).Hash -ne $ritmoItem.NewHash) { throw ('A revisão mudou: ' + $ritmoItem.File) }
  if ($ritmoItem.OriginalHash) {
    if ((Get-FileHash -LiteralPath $ritmoTargetFile).Hash -ne $ritmoItem.OriginalHash) { throw ('Arquivo original alterado durante a revisão: ' + $ritmoItem.File) }
  } elseif (Test-Path -LiteralPath $ritmoTargetFile) { throw ('Um novo arquivo já existe: ' + $ritmoItem.File) }
}
foreach ($ritmoItem in $ritmoManifest) {
  $ritmoTargetFile = Join-Path $ritmoTarget $ritmoItem.File
  New-Item -ItemType Directory -Path (Split-Path $ritmoTargetFile -Parent) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $ritmoSource $ritmoItem.File) -Destination $ritmoTargetFile -Force
  if ((Get-FileHash -LiteralPath $ritmoTargetFile).Hash -ne $ritmoItem.NewHash) { throw ('Falha ao verificar cópia: ' + $ritmoItem.File) }
  Write-Output ('Aplicado: ' + $ritmoItem.File)
}
