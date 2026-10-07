@echo off
REM ============================================================
REM  Q-AI Hub - one-click dev launcher
REM  Opens two terminal windows:
REM    1) Spring Boot API   (backend/,  port 8081)
REM    2) Vite React app    (frontend/, port 5173)
REM
REM  Pre-requisites:
REM    - Java 17+ on PATH (java -version)
REM    - Node.js 18+ on PATH (node -v)
REM    - MySQL running on localhost:3306
REM    - backend\.env created from backend\.env.example (DB password, mail...)
REM ============================================================

setlocal
REM Repository root = parent of this scripts\ folder
set "ROOT=%~dp0..\"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo.
echo === Q-AI Hub dev launcher ===
echo Project root: %ROOT%
echo.

REM --- sanity checks ---
where java >nul 2>nul || (echo [ERROR] Java is not on PATH. Install JDK 17 and retry. & pause & exit /b 1)
where node >nul 2>nul || (echo [ERROR] Node.js is not on PATH. Install Node 18+ and retry. & pause & exit /b 1)
if not exist "%BACKEND%\.env" (
    echo [WARN] backend\.env not found. Copy backend\.env.example to backend\.env and fill in your values.
)

REM --- frontend deps ---
if not exist "%FRONTEND%\node_modules" (
    echo [setup] Installing frontend dependencies (one-time)...
    pushd "%FRONTEND%"
    call npm install
    popd
)

echo [start] Spring Boot API in a new window...
REM Started from backend\ so that backend\.env and backend\uploads are used
start "Q-AI Hub API (port 8081)" cmd /k "cd /d "%BACKEND%" && mvnw.cmd spring-boot:run"

REM Give the backend a head start so the frontend proxy works on first request
timeout /t 3 /nobreak >nul

echo [start] Vite frontend in a new window...
start "Q-AI Hub Web (port 5173)" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo Both servers are starting.
echo   API:      http://localhost:8081
echo   Frontend: http://localhost:5173
echo.
echo Press any key to close this launcher window (the two server windows will keep running).
pause >nul
endlocal
