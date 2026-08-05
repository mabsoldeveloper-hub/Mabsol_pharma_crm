@echo off
title Mabsol Pharma CRM - Desktop Sync Worker
echo ========================================================
echo   Mabsol Pharma CRM - Desktop DBF Sync Worker (Marg / FoxPro)
echo ========================================================
echo.
echo Starting background worker for live cloud database sync...
echo Local Folder: Watcher & Queue active
echo.
node scripts\mabsolcrm-sync\worker.cjs
pause
