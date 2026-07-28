Add-Type -AssemblyName System.Windows.Forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.ShowNewFolderButton = $true
$f.Description = "Select Levels Directory"
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
if ($f.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) {
    Write-Output $f.SelectedPath
}