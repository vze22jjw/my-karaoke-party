# Script para iniciar o banco de dados e o servidor de desenvolvimento no Windows
# Use: .\start-dev.ps1

Write-Host "My Karaoke Party - Iniciando ambiente de desenvolvimento..." -ForegroundColor Cyan
Write-Host ""

# Nome do container do banco de dados
$DB_CONTAINER_NAME = "karaokeparty-t3-postgres"

# Verificar se Docker esta instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker nao esta instalado!" -ForegroundColor Red
    Write-Host "Por favor, instale o Docker Desktop:" -ForegroundColor Yellow
    Write-Host "https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Blue
    exit 1
}

# Verificar se o arquivo .env existe
if (-not (Test-Path ".env")) {
    Write-Host "Arquivo .env nao encontrado!" -ForegroundColor Red
    Write-Host "Copie o arquivo .env.example para .env e configure as variaveis" -ForegroundColor Yellow
    exit 1
}

Write-Host "Verificando banco de dados PostgreSQL..." -ForegroundColor Yellow

# Verificar se o container ja esta rodando
$running = docker ps -q -f name=$DB_CONTAINER_NAME 2>$null
if ($running) {
    Write-Host "Banco de dados ja esta rodando" -ForegroundColor Green
}
else {
    # Verificar se o container existe mas esta parado
    $exists = docker ps -aq -f name=$DB_CONTAINER_NAME 2>$null
    if ($exists) {
        Write-Host "Iniciando banco de dados existente..." -ForegroundColor Yellow
        docker start $DB_CONTAINER_NAME | Out-Null
        Write-Host "Banco de dados iniciado" -ForegroundColor Green
    }
    else {
        Write-Host "Criando novo container do banco de dados..." -ForegroundColor Yellow
        docker run -d --name $DB_CONTAINER_NAME -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=mykaraoke_party -p 5432:5432 postgres:15 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Banco de dados criado e iniciado" -ForegroundColor Green
            Write-Host "Aguardando banco de dados ficar pronto..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
        else {
            Write-Host "Erro ao criar banco de dados" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Sincronizando schema do banco de dados..." -ForegroundColor Yellow
pnpm prisma db push --skip-generate 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Schema sincronizado" -ForegroundColor Green
}
else {
    Write-Host "Aviso: Nao foi possivel sincronizar o schema" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================" -ForegroundColor Gray
Write-Host "  Servidor: http://localhost:3000" -ForegroundColor Green
Write-Host "  Pressione Ctrl+C para parar" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Gray
Write-Host ""

# Iniciar o servidor de desenvolvimento
pnpm dev
