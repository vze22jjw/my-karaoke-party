# 🐳 Deploy com Docker e Portainer

Guia completo para fazer deploy do **My Karaoke Party** usando Docker e Portainer no seu VPS Ubuntu.

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Preparação do Servidor](#preparação-do-servidor)
- [Configuração do Portainer](#configuração-do-portainer)
- [Deploy da Aplicação](#deploy-da-aplicação)
- [Configuração de Variáveis](#configuração-de-variáveis)
- [Deploy via Git](#deploy-via-git)
- [Deploy via Upload](#deploy-via-upload)
- [Verificação e Logs](#verificação-e-logs)
- [Atualizações](#atualizações)
- [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### No Servidor VPS Ubuntu 20.04

- Docker Engine instalado
- Docker Compose instalado
- Portainer rodando
- Acesso SSH ao servidor
- Portas abertas: 80, 443, 3000, 9000 (Portainer)

---

## 🚀 Preparação do Servidor

### 1. Instalar Docker

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Adicionar repositório Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
```

### 2. Instalar Docker Compose

```bash
# Baixar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permissão de execução
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker-compose --version
```

### 3. Instalar Portainer

```bash
# Criar volume para dados do Portainer
docker volume create portainer_data

# Iniciar Portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Verificar se está rodando
docker ps | grep portainer
```

### 4. Acessar Portainer

1. Abra o navegador: `https://seu-ip:9443`
2. Crie o usuário admin na primeira vez
3. Conecte ao ambiente Docker local

---

## 🎯 Configuração do Portainer

### Criar Stack no Portainer

1. **Login no Portainer**: `https://seu-ip:9443`
2. **Menu**: `Stacks` → `Add stack`
3. **Nome da Stack**: `my-karaoke-party`

---

## 📦 Deploy da Aplicação

### Método 1: Deploy via Git (Recomendado)

#### No Portainer:

1. **Build method**: Selecione `Repository`
2. **Repository URL**: `https://github.com/flaviokosta79/my-karaoke-party`
3. **Reference**: `refs/heads/main`
4. **Compose path**: `docker-compose.yml`

#### Configurar Environment Variables:

```env
DB_PASSWORD=sua_senha_postgresql_segura
YOUTUBE_API_KEY=AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E
NEXT_PUBLIC_APP_URL=http://seu-dominio.com
```

5. **Deploy the stack**: Clique em `Deploy the stack`

---

### Método 2: Deploy via Upload

#### 1. Preparar arquivos no servidor

```bash
# Criar diretório
mkdir -p ~/apps/my-karaoke-party
cd ~/apps/my-karaoke-party

# Clonar repositório
git clone https://github.com/flaviokosta79/my-karaoke-party.git .

# Criar arquivo .env
nano .env
```

#### 2. Configurar `.env`:

```env
DB_PASSWORD=sua_senha_postgresql_segura
YOUTUBE_API_KEY=AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E
NEXT_PUBLIC_APP_URL=http://seu-dominio.com
```

#### 3. No Portainer:

1. **Build method**: Selecione `Upload`
2. **Upload**: Faça upload do `docker-compose.yml`
3. **Environment variables**: Cole as variáveis do `.env`
4. **Deploy the stack**

---

### Método 3: Deploy via Web Editor

#### No Portainer:

1. **Build method**: Selecione `Web editor`
2. Cole o conteúdo do `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: karaoke-postgres
    restart: always
    environment:
      POSTGRES_USER: mykaraoke
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: mykaraoke_party
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mykaraoke"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: https://github.com/flaviokosta79/my-karaoke-party.git
      dockerfile: Dockerfile
    container_name: karaoke-app
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://mykaraoke:${DB_PASSWORD}@postgres:5432/mykaraoke_party
      YOUTUBE_API_KEY: ${YOUTUBE_API_KEY}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"

  cleanup-cron:
    image: curlimages/curl:latest
    container_name: karaoke-cleanup
    restart: always
    depends_on:
      - app
    entrypoint: /bin/sh
    command: >
      -c "while true; do
        sleep 600;
        curl -f http://app:3000/api/cron/cleanup-parties || echo 'Cleanup failed';
      done"

volumes:
  postgres_data:
```

3. **Environment variables**:

```env
DB_PASSWORD=sua_senha_postgresql_segura
YOUTUBE_API_KEY=AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E
NEXT_PUBLIC_APP_URL=http://seu-dominio.com
```

4. **Deploy the stack**

---

## 🔐 Configuração de Variáveis

### Variáveis Obrigatórias:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DB_PASSWORD` | Senha do PostgreSQL | `minha_senha_super_segura_123` |
| `YOUTUBE_API_KEY` | Chave da API do YouTube | `AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E` |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | `http://karaoke.seudominio.com` ou `http://seu-ip:3000` |

### Como obter a YouTube API Key:

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto
3. Ative a **YouTube Data API v3**
4. Crie credenciais → Chave de API
5. Copie a chave gerada

---

## 📊 Verificação e Logs

### No Portainer:

1. **Stacks** → `my-karaoke-party`
2. Verifique status dos containers:
   - ✅ `karaoke-postgres` - healthy
   - ✅ `karaoke-app` - running
   - ✅ `karaoke-cleanup` - running

### Ver logs:

**Pelo Portainer:**
1. Clique no container
2. Aba `Logs`
3. Acompanhe em tempo real

**Pelo Terminal:**
```bash
# Logs da aplicação
docker logs -f karaoke-app

# Logs do PostgreSQL
docker logs -f karaoke-postgres

# Logs do cleanup cron
docker logs -f karaoke-cleanup

# Logs de todos
docker-compose logs -f
```

### Verificar aplicação:

```bash
# Testar se está respondendo
curl http://localhost:3000

# Testar endpoint de cleanup
curl http://localhost:3000/api/cron/cleanup-parties
```

---

## 🔄 Atualizações

### Pelo Portainer:

1. **Stacks** → `my-karaoke-party`
2. **Editor** (ícone de lápis)
3. Se usar Git:
   - Marque `Re-pull image and redeploy`
   - Clique `Update the stack`
4. Se usar Web editor:
   - Não precisa mudar nada
   - Clique `Update the stack`

### Pelo Terminal:

```bash
cd ~/apps/my-karaoke-party

# Atualizar código
git pull origin main

# Rebuild e restart
docker-compose down
docker-compose up -d --build

# Ou usar Portainer para ver os logs durante o processo
```

---

## 🌐 Configurar Domínio e SSL

### Opção 1: Usar Nginx Externo

```bash
# Instalar Nginx no host
sudo apt install -y nginx certbot python3-certbot-nginx

# Criar configuração
sudo nano /etc/nginx/sites-available/karaoke
```

```nginx
server {
    listen 80;
    server_name karaoke.seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/karaoke /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Instalar SSL
sudo certbot --nginx -d karaoke.seudominio.com
```

### Opção 2: Usar container Nginx (incluído no docker-compose)

```bash
# Adicionar profile no docker-compose.yml
docker-compose --profile with-nginx up -d
```

---

## 🐛 Troubleshooting

### Container não inicia:

```bash
# Ver logs detalhados
docker logs karaoke-app

# Ver status
docker ps -a

# Reiniciar container específico
docker restart karaoke-app
```

### Erro de conexão com banco:

```bash
# Verificar se PostgreSQL está healthy
docker ps

# Entrar no container do PostgreSQL
docker exec -it karaoke-postgres psql -U mykaraoke -d mykaraoke_party

# Listar tabelas
\dt

# Sair
\q
```

### Build falha:

```bash
# Limpar cache do Docker
docker system prune -a

# Rebuild forçado
docker-compose build --no-cache
docker-compose up -d
```

### Aplicação não responde:

```bash
# Verificar portas
sudo netstat -tlnp | grep 3000

# Verificar logs
docker logs -f karaoke-app

# Restart completo
docker-compose restart
```

### Cleanup não está funcionando:

```bash
# Ver logs do cron
docker logs -f karaoke-cleanup

# Testar manualmente
curl http://localhost:3000/api/cron/cleanup-parties

# Entrar no container
docker exec -it karaoke-cleanup sh
```

---

## 📱 Acesso à Aplicação

Depois do deploy bem-sucedido:

- **Aplicação**: `http://seu-ip:3000` ou `https://seu-dominio.com`
- **Portainer**: `https://seu-ip:9443`

---

## 🔒 Segurança

### Recomendações:

1. **Firewall (UFW)**:
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 9443/tcp    # Portainer (pode restringir por IP)
sudo ufw enable
```

2. **Senha forte do banco**: Gere com `openssl rand -base64 32`

3. **Não exponha porta 5432**: Já está configurado para uso interno apenas

4. **Mantenha Docker atualizado**:
```bash
sudo apt update
sudo apt upgrade docker-ce docker-ce-cli
```

5. **Backups regulares**:
```bash
# Backup do banco
docker exec karaoke-postgres pg_dump -U mykaraoke mykaraoke_party > backup-$(date +%Y%m%d).sql

# Backup do volume
docker run --rm -v my-karaoke-party_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data
```

---

## 📦 Estrutura dos Containers

```
my-karaoke-party (stack)
│
├── karaoke-postgres (PostgreSQL 15)
│   └── Volume: postgres_data
│   └── Port: 5432 (interno)
│   └── Health check: pg_isready
│
├── karaoke-app (Next.js)
│   └── Port: 3000 (externo)
│   └── Depends on: postgres
│   └── Auto migrations on startup
│
└── karaoke-cleanup (Cron)
    └── Curl a cada 10 minutos
    └── Endpoint: /api/cron/cleanup-parties
    └── Depends on: app
```

---

## ✅ Checklist de Deploy

- [ ] Docker e Docker Compose instalados
- [ ] Portainer rodando e acessível
- [ ] Stack criada no Portainer
- [ ] Variáveis de ambiente configuradas
- [ ] Build da imagem concluído
- [ ] Containers rodando (postgres, app, cleanup)
- [ ] Migrations executadas automaticamente
- [ ] Aplicação acessível em `http://ip:3000`
- [ ] Endpoint de cleanup funcionando
- [ ] Nginx configurado (opcional)
- [ ] SSL instalado (opcional)
- [ ] Firewall configurado
- [ ] Backup configurado

---

## 🎉 Deploy Completo!

Sua aplicação **My Karaoke Party** agora está rodando em produção com Docker e Portainer!

**Stack rodando:**
- ✅ PostgreSQL 15 (banco de dados)
- ✅ Next.js App (aplicação)
- ✅ Cleanup Cron (limpeza automática a cada 10 minutos)

**Sistema de auto-cleanup ativo:**
- Festas inativas por 20+ minutos serão fechadas automaticamente
- Cron job rodando dentro do container
- Logs disponíveis no Portainer

---

## 📚 Recursos Adicionais

- [Docker Docs](https://docs.docker.com/)
- [Portainer Docs](https://docs.portainer.io/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Next.js Docker](https://nextjs.org/docs/deployment#docker-image)
