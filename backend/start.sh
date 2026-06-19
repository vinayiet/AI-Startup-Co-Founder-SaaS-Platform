#!/bin/bash

# Force Celery to run under root user inside Docker container
export C_FORCE_ROOT=1

# Start Celery worker in the background
echo "Starting Celery Worker..."
celery -A app.tasks.main.celery_app worker --loglevel=info &

# Start Uvicorn FastAPI server in the foreground
echo "Starting FastAPI Server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
