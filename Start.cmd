@echo off
setlocal
chcp 65001 >nul
title Antigravity zh-CN v0.4.0
if not exist "%~dp0patch.cjs" (
    echo [ERROR] patch.cjs not found. Please extract the full ZIP folder first.
    pause
    exit /b 1
)
where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js 22 or newer is required.
    pause
    exit /b 1
)

:menu
echo.
echo ========================================================
echo   Antigravity zh-CN v0.4.0 (for Antigravity 2.35.1)
echo ========================================================
echo   [C] Check   [A] Install / Upgrade   [R] Restore   [Q] Quit
echo ========================================================
choice /c CARQ /n /m "Select [C/A/R/Q]: "
if errorlevel 4 exit /b 0
if errorlevel 3 (
    echo.
    node "%~dp0patch.cjs" restore
    set "patch_exit=%errorlevel%"
    goto done
)
if errorlevel 2 (
    echo.
    node "%~dp0patch.cjs" apply
    set "patch_exit=%errorlevel%"
    goto done
)
echo.
node "%~dp0patch.cjs" check
goto menu

:done
echo.
pause
exit /b %patch_exit%
