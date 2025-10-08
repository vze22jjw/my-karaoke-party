#!/usr/bin/env bash
# Script para iniciar o banco de dados e o servidor de desenvolvimento
# Use: ./start-dev.sh

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}🎤 My Karaoke Party - Iniciando ambiente de desenvolvimento...${NC}"
echo ""

# Nome do container do banco de dados
DB_CONTAINER_NAME="karaokeparty-t3-postgres"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    echo -e "${YELLOW}Por favor, instale o Docker:${NC}"
    echo -e "${CYAN}https://docs.docker.com/engine/install/${NC}"
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}Copie o arquivo .env.example para .env e configure as variáveis${NC}"
    exit 1
fi

echo -e "${YELLOW}🐘 Verificando banco de dados PostgreSQL...${NC}"

# Verificar se o container já está rodando
if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
    echo -e "${GREEN}✅ Banco de dados já está rodando${NC}"
else
    # Verificar se o container existe mas está parado
    if [ "$(docker ps -aq -f name=$DB_CONTAINER_NAME)" ]; then
        echo -e "${YELLOW}▶️  Iniciando banco de dados existente...${NC}"
        docker start $DB_CONTAINER_NAME > /dev/null
        echo -e "${GREEN}✅ Banco de dados iniciado${NC}"
    else
        echo -e "${YELLOW}📦 Criando novo container do banco de dados...${NC}"
        docker run -d \
            --name $DB_CONTAINER_NAME \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_DB=mykaraoke_party \
            -p 5432:5432 \
            postgres:15 > /dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Banco de dados criado e iniciado${NC}"
            echo -e "${YELLOW}⏳ Aguardando banco de dados ficar pronto...${NC}"
            sleep 3
        else
            echo -e "${RED}❌ Erro ao criar banco de dados${NC}"
            exit 1
        fi
    fi
fi

echo ""
echo -e "${YELLOW}📊 Sincronizando schema do banco de dados...${NC}"
pnpm prisma db push --skip-generate > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema sincronizado${NC}"
else
    echo -e "${YELLOW}⚠️  Aviso: Não foi possível sincronizar o schema${NC}"
fi

echo ""
echo -e "${CYAN}🚀 Iniciando servidor de desenvolvimento...${NC}"
echo ""
echo -e "${GRAY}=====================================${NC}"
echo -e "${GREEN}  Servidor: http://localhost:3000${NC}"
echo -e "${GRAY}  Pressione Ctrl+C para parar${NC}"
echo -e "${GRAY}=====================================${NC}"
echo ""

# Iniciar o servidor de desenvolvimento
pnpm dev
