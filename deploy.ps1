Set-Location "D:\C-TERP"
Write-Host ">>> Pulling latest changes..." -ForegroundColor Cyan
git config --global --add safe.directory D:/C-TERP 2>$null
git pull
Write-Host ">>> Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
Write-Host ">>> Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> Restarting PM2..." -ForegroundColor Green
    if (Get-Command pm2 -ErrorAction SilentlyContinue) {
        pm2 restart c-terp
        pm2 save
    } elseif (Test-Path "C:\Users\vmware\AppData\Roaming\npm\pm2.cmd") {
        & "C:\Users\vmware\AppData\Roaming\npm\pm2.cmd" restart c-terp
        & "C:\Users\vmware\AppData\Roaming\npm\pm2.cmd" save
    } else {
        npx pm2 restart c-terp
        npx pm2 save
    }
    Write-Host ">>> Deployment successful!" -ForegroundColor Green
} else {
    Write-Host ">>> Build failed! Deployment aborted." -ForegroundColor Red
}
