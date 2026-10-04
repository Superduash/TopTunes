@echo off
title TopTunes Music Streaming System

echo ==================================================
echo   Starting TopTunes Music Streaming System...
echo ==================================================
echo.

if not exist .env (
    echo [.env missing] Copying environment defaults from .env.example...
    copy .env.example .env >nul
)

if not exist node_modules (
    echo [node_modules missing] Installing dependencies...
    call npm install
)

echo Opening TopTunes in your default web browser...
start "" "http://localhost:3000/#/home"

echo.
echo Launching TopTunes Unified Server...
npm start
