@echo off
REM Activate the virtual environment
call .venv\Scripts\activate.bat

REM Run Django development server
python manage.py runserver 0.0.0.0:8004
