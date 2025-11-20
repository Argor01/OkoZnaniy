@echo off
echo Starting OkoZnaniy in production mode...
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
docker-compose up --build -d

echo.
echo Application is starting...
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8000
echo Admin: http://localhost:8000/admin
echo.
echo To stop the application, run: docker-compose down

pause