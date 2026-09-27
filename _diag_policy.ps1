$ErrorActionPreference = 'Continue'
Write-Output "==== EXECUTION POLICY (effective order) ===="
Get-ExecutionPolicy -List | Format-Table -AutoSize | Out-String -Width 200
Write-Output "==== EFFECTIVE POLICY ===="
Get-ExecutionPolicy
Write-Output "==== npm shims in the Node dir ===="
$nodeDir = Split-Path (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
Write-Output "node dir: $nodeDir"
Get-ChildItem -Path $nodeDir -Filter 'npm*' -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty Name
Write-Output "==== Which shim PowerShell picks for 'npm' ===="
(Get-Command npm -ErrorAction SilentlyContinue).Source
Write-Output "==== Reproduce the launch the user is actually typing ===="
try {
  $null = & npm --version
  Write-Output "RESULT: 'npm --version' SUCCEEDED - no execution-policy block"
} catch {
  Write-Output "RESULT: BLOCKED -> $($_.Exception.Message)"
}
