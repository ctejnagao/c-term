Set-Location "D:\C-TERP"
Write-Host ">>> Pulling latest changes..." -ForegroundColor Cyan
git pull
Write-Host ">>> Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
Write-Host ">>> Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> Restarting PM2..." -ForegroundColor Green
    pm2 restart c-terp
    pm2 save
    Write-Host ">>> Deployment successful!" -ForegroundColor Green
} else {
    Write-Host ">>> Build failed! Deployment aborted." -ForegroundColor Red
}
