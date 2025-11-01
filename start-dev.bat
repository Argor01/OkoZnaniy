@echo off
echo Starting OkoZnaniy in development mode...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found. Please create it from .env.example
    pause
    exit /b 1
)

echo Building and starting containers...
docker-compose -f docker-compose.dev.yml up --build

pause