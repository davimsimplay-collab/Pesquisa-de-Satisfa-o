@echo off
chcp 65001 >nul
title Pesquisa de Satisfacao - Servidor Local
echo.
echo ===========================================
echo   Pesquisa de Satisfacao
echo ===========================================
echo.
echo   Iniciando servidor local na porta 8080...
echo.
echo   Login (totem):     http://localhost:8080/login.html
echo   Cadastro (admin):  http://localhost:8080/cadastro.html
echo   Painel central:    http://localhost:8080/painel-central.html
echo.
echo   Para encerrar, feche esta janela ou pressione CTRL+C.
echo ===========================================
echo.
start "" http://localhost:8080/login.html
python servidor.py 8080
pause
