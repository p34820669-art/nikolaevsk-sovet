# Отрисовка страниц PDF в PNG средствами Windows (без сторонних программ).
# Пример: powershell -File tools/pdf_page.ps1 -Pdf "D:\...\1977.pdf" -Out "C:\tmp\p" -From 1 -To 3 [-Ocr]
param([string]$Pdf,[string]$Out,[int]$From=1,[int]$To=1,[double]$Scale=1.6,[switch]$Ocr)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Data.Pdf.PdfDocument,Windows.Data.Pdf,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Globalization.Language,Windows.Globalization,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Media.Ocr,ContentType=WindowsRuntime]
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await($op,$type){ $t=$asTask.MakeGenericMethod($type).Invoke($null,@($op)); $t.Wait(-1)|Out-Null; $t.Result }
$asAction=([System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'})[0]
function AwaitAct($op){ $t=$asAction.Invoke($null,@($op)); $t.Wait(-1)|Out-Null }
$f=Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($Pdf)) ([Windows.Storage.StorageFile])
$doc=Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($f)) ([Windows.Data.Pdf.PdfDocument])
"pages=$($doc.PageCount)"
if($Ocr){ $lang=New-Object Windows.Globalization.Language 'ru'; $eng=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang); if(-not $eng){"no ru OCR"; $eng=$null} }
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
for($i=$From;$i -le [Math]::Min($To,$doc.PageCount);$i++){
  $page=$doc.GetPage($i-1)
  $ms=New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  $opt=New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opt.DestinationWidth=[uint32]($page.Size.Width*$Scale)
  AwaitAct ($page.RenderToStreamAsync($ms,$opt))
  $path="$Out$i.png"
  $bytes=New-Object byte[] $ms.Size; $ms.Seek(0)
  $rd=New-Object Windows.Storage.Streams.DataReader $ms; $null=Await ($rd.LoadAsync([uint32]$ms.Size)) ([uint32]); $rd.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($path,$bytes)
  if($eng){
    $ms.Seek(0)
    $dec=Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ms)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bmp=Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $res=Await ($eng.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
    [IO.File]::WriteAllText("$Out$i.txt",$res.Text,[Text.Encoding]::UTF8)
  }
  $page.Dispose()
  "page $i -> $path"
}
