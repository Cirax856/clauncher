@echo off
setlocal

:: get version from argument or prompt
if "%~1"=="" (
  set /p VERSION="Version (e.g. 2.2.0): "
) else (
  set VERSION=%~1
)

if "%VERSION%"=="" (
  echo No version provided
  exit /b 1
)

:: strip leading v if provided
if "%VERSION:~0,1%"=="v" set VERSION=%VERSION:~1%

echo.
echo Releasing v%VERSION%...
echo.

echo =^> Committing
git add .
git commit -m "v%VERSION%"
if errorlevel 1 goto error

echo =^> Pushing main
git push origin main
if errorlevel 1 goto error

echo =^> Tagging v%VERSION%
git tag v%VERSION%
if errorlevel 1 goto error

git push origin v%VERSION%
if errorlevel 1 goto error

echo.
echo Done - Released v%VERSION% - GitHub Actions build triggered
echo.
exit /b 0

:error
echo.
echo Release failed
exit /b 1