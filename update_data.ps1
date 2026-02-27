# Update script for Bandar Algaloud Website
# This script runs the python scraper and updates the data for the Next.js site.

Write-Host "Scraping latest data from Telegram..." -ForegroundColor Cyan
python scraper.py

if (Test-Path "messages.json") {
    Write-Host "Updating site data..." -ForegroundColor Green
    Copy-Item "messages.json" "site/src/app/data.json" -Force
    Write-Host "Data updated successfully!" -ForegroundColor Green
} else {
    Write-Host "Error: messages.json not found. Scraping might have failed." -ForegroundColor Red
}
