@echo off
:: ===========================================================================
::  Mini Excel launcher
::
::  This file exists because of one specific Windows problem:
::
::    npm.ps1 cannot be loaded because running scripts is disabled on this
::    machine. For more information about execution policies, see
::    learn.microsoft.com/powershell/module/microsoft.powershell.core/
::    about/about_execution_policies
::
::  PowerShell resolves the bare name `npm` to npm.ps1 (a PowerShell script)
::  ahead of npm.cmd. When the execution policy is Restricted - the default on a
::  freshly built Windows box, and still the default on many corporate images -
::  PowerShell refuses to run that script, and `npm start` dies before npm is
::  ever reached.
::
::  Nothing here is PowerShell. This is cmd.exe, and the execution policy does
::  not apply to it. Calling npm.cmd explicitly also defeats PowerShell's
::  ps1-first name resolution, so this works from PowerShell, cmd.exe, Explorer
::  and Task Scheduler alike.
::
::  Notes for anyone editing this file:
::    * Use :: for comments, not REM. A REM line containing a URL with a query
::      string (fwlink with a ?LinkID parameter) makes cmd fail with
::      "... was unexpected at this time", because the ? is parsed as part of
::      the command line rather than as comment text.
::    * Keep the file ASCII with CRLF endings and no BOM.
::
::  Usage:  start.cmd            - run the app
::          start.cmd --test     - run the JavaScript test suite
:: ===========================================================================
setlocal
cd /d "%~dp0"

:: Locate npm.cmd. The bare name is deliberately avoided: inside PowerShell that
:: would resolve back to npm.ps1 and hit the very policy error we are dodging.
set "NPM_CMD="
for %%I in (npm.cmd) do set "NPM_CMD=%%~$PATH:I"
if not defined NPM_CMD (
  if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)
if not defined NPM_CMD (
  if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
)
if not defined NPM_CMD (
  if exist "%APPDATA%\npm\npm.cmd" set "NPM_CMD=%APPDATA%\npm\npm.cmd"
)
if not defined NPM_CMD (
  echo.
  echo   [Mini Excel] npm was not found on your PATH.
  echo.
  echo   Install Node.js LTS from nodejs.org - it ships npm - then run this
  echo   file again.
  echo.
  exit /b 1
)

if /i "%~1"=="--test" (
  call "%NPM_CMD%" test
) else (
  call "%NPM_CMD%" start
)

:: Surface npm's exit code rather than cmd's, so CI and Task Scheduler see a
:: real failure instead of a silent success.
exit /b %ERRORLEVEL%
