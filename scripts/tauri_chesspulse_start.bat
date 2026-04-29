
@echo off
set "Path=%Path%;C:\Users\freem\AppData\Local\Programs\Python\Python312"
cd /d "%~dp0chesspulse"
echo [♟️] STARTING CHESSPULSE CLUSTER ON PORT 8000...
echo [♟️] CORE: Fast API / Python Ingestors
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
