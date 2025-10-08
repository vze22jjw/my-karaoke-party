# Deploy em VPS Ubuntu - Guia Completo

## 📋 Pré-requisitos no Servidor Ubuntu

### 1. Instalar Node.js (via nvm - recomendado)
```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js 22.x (mesma versão do desenvolvimento)
nvm install 22
nvm use 22
nvm alias default 22

# Verificar instalação
node -v  # deve mostrar v22.x.x
npm -v
```

### 2. Instalar pnpm
```bash
npm install -g pnpm
pnpm -v
```

### 3. Instalar PostgreSQL
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql
```

### 4. Configurar PostgreSQL
```bash
# Acessar como usuário postgres
sudo -u postgres psql

# Dentro do psql, criar banco e usuário
CREATE DATABASE mykaraoke_party;
CREATE USER mykaraoke WITH PASSWORD 'sua_senha_segura_aqui';
GRANT ALL PRIVILEGES ON DATABASE mykaraoke_party TO mykaraoke;
\q
```

## 🚀 Deploy da Aplicação

### 1. Clonar Repositório
```bash
# Criar diretório para aplicações
mkdir -p ~/apps
cd ~/apps

# Clonar repositório
git clone https://github.com/flaviokosta79/my-karaoke-party.git
cd my-karaoke-party
```

### 2. Configurar Variáveis de Ambiente
```bash
# Criar arquivo .env
nano .env
```

Cole o conteúdo:
```env
# Database
DATABASE_URL="postgresql://mykaraoke:sua_senha_segura_aqui@localhost:5432/mykaraoke_party"
DATABASE_URL_NON_POOLING="postgresql://mykaraoke:sua_senha_segura_aqui@localhost:5432/mykaraoke_party"

# YouTube API
YOUTUBE_API_KEY_1="SUA_CHAVE_API_DO_YOUTUBE"

# Next.js (URL da sua VPS)
NEXT_PUBLIC_URL="http://seu-dominio.com"
# ou se usar IP:
# NEXT_PUBLIC_URL="http://123.45.67.89:3000"
```

### 3. Instalar Dependências e Build
```bash
# Instalar dependências
pnpm install

# Executar migrations
pnpm exec prisma migrate deploy

# Gerar Prisma Client
pnpm exec prisma generate

# Build da aplicação
pnpm build
```

### 4. Testar Aplicação
```bash
# Iniciar em modo produção
pnpm start

# Abrir em outro terminal e testar
curl http://localhost:3000
```

## ⚙️ Configurar PM2 (Process Manager)

### 1. Instalar PM2
```bash
npm install -g pm2
```

### 2. Criar Arquivo de Configuração PM2
```bash
cd ~/apps/my-karaoke-party
nano ecosystem.config.js
```

Cole o conteúdo:
```javascript
module.exports = {
  apps: [{
    name: 'my-karaoke-party',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/home/seu_usuario/apps/my-karaoke-party',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### 3. Iniciar com PM2
```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração para reinício automático
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando que o PM2 mostrar

# Verificar status
pm2 status
pm2 logs my-karaoke-party
```

## ⏰ Configurar Cron Job (Auto-Cleanup de Parties)

### Método 1: Crontab Nativo (Recomendado)

```bash
# Editar crontab
crontab -e
```

Adicionar linha (executar a cada 10 minutos):
```bash
*/10 * * * * curl -X GET http://localhost:3000/api/cron/cleanup-parties >> /home/seu_usuario/logs/cleanup-cron.log 2>&1
```

Ou com wget:
```bash
*/10 * * * * wget -qO- http://localhost:3000/api/cron/cleanup-parties >> /home/seu_usuario/logs/cleanup-cron.log 2>&1
```

**Criar diretório de logs:**
```bash
mkdir -p ~/logs
```

**Ver logs do cron:**
```bash
tail -f ~/logs/cleanup-cron.log
```

### Método 2: Script Bash + Cron

```bash
# Criar script
nano ~/scripts/cleanup-parties.sh
```

Cole o conteúdo:
```bash
#!/bin/bash
# Script para limpar parties inativas

LOG_FILE="/home/seu_usuario/logs/cleanup-parties.log"
API_URL="http://localhost:3000/api/cron/cleanup-parties"

echo "=== $(date) ===" >> "$LOG_FILE"
curl -X GET "$API_URL" >> "$LOG_FILE" 2>&1
echo "" >> "$LOG_FILE"
```

**Dar permissão de execução:**
```bash
chmod +x ~/scripts/cleanup-parties.sh
```

**Adicionar ao crontab:**
```bash
crontab -e
```

Adicionar:
```bash
*/10 * * * * /home/seu_usuario/scripts/cleanup-parties.sh
```

### Método 3: Systemd Timer (Mais Avançado)

**Criar serviço:**
```bash
sudo nano /etc/systemd/system/cleanup-parties.service
```

Cole:
```ini
[Unit]
Description=Cleanup Inactive Karaoke Parties
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X GET http://localhost:3000/api/cron/cleanup-parties
User=seu_usuario
StandardOutput=journal
StandardError=journal
```

**Criar timer:**
```bash
sudo nano /etc/systemd/system/cleanup-parties.timer
```

Cole:
```ini
[Unit]
Description=Run Cleanup Parties Every 10 Minutes
Requires=cleanup-parties.service

[Timer]
OnBootSec=10min
OnUnitActiveSec=10min
Unit=cleanup-parties.service

[Install]
WantedBy=timers.target
```

**Ativar timer:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable cleanup-parties.timer
sudo systemctl start cleanup-parties.timer

# Verificar status
sudo systemctl status cleanup-parties.timer
sudo systemctl list-timers
```

## 🌐 Configurar Nginx (Reverse Proxy)

### 1. Instalar Nginx
```bash
sudo apt install nginx -y
```

### 2. Configurar Site
```bash
sudo nano /etc/nginx/sites-available/my-karaoke-party
```

Cole:
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

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

### 3. Ativar Site
```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/my-karaoke-party /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 4. Instalar SSL (Certbot - HTTPS Gratuito)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática (certbot já configura)
sudo certbot renew --dry-run
```

## 🔒 Segurança Adicional

### 1. Configurar Firewall (UFW)
```bash
# Ativar firewall
sudo ufw enable

# Permitir SSH (IMPORTANTE!)
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Verificar status
sudo ufw status
```

### 2. Proteger PostgreSQL
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Garantir que tenha:
```
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
```

Reiniciar:
```bash
sudo systemctl restart postgresql
```

## 📊 Monitoramento

### Ver Logs da Aplicação
```bash
pm2 logs my-karaoke-party
```

### Ver Logs do Cron Job
```bash
tail -f ~/logs/cleanup-cron.log
```

### Ver Logs do Nginx
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitorar Recursos
```bash
# Com PM2
pm2 monit

# Sistema
htop
```

## 🔄 Atualizar Aplicação

```bash
cd ~/apps/my-karaoke-party

# Parar aplicação
pm2 stop my-karaoke-party

# Atualizar código
git pull origin main

# Instalar novas dependências
pnpm install

# Executar migrations
pnpm exec prisma migrate deploy

# Gerar Prisma Client
pnpm exec prisma generate

# Rebuild
pnpm build

# Reiniciar aplicação
pm2 restart my-karaoke-party

# Verificar logs
pm2 logs my-karaoke-party
```

## 🆘 Comandos Úteis

```bash
# PM2
pm2 status                    # Ver status
pm2 restart my-karaoke-party  # Reiniciar
pm2 stop my-karaoke-party     # Parar
pm2 delete my-karaoke-party   # Remover
pm2 logs my-karaoke-party     # Ver logs

# Nginx
sudo systemctl status nginx   # Status
sudo systemctl restart nginx  # Reiniciar
sudo nginx -t                 # Testar config

# PostgreSQL
sudo systemctl status postgresql  # Status
sudo -u postgres psql             # Acessar
```

## 📝 Checklist Final

- [ ] Node.js 22.x instalado
- [ ] pnpm instalado
- [ ] PostgreSQL instalado e configurado
- [ ] Repositório clonado
- [ ] .env configurado
- [ ] Dependências instaladas
- [ ] Migrations executadas
- [ ] Build realizado
- [ ] PM2 configurado e rodando
- [ ] Cron job configurado (crontab ou systemd)
- [ ] Nginx configurado
- [ ] SSL instalado (se usar domínio)
- [ ] Firewall configurado
- [ ] Logs sendo gerados corretamente

## 🎯 Testar Tudo

```bash
# 1. Testar aplicação
curl http://localhost:3000

# 2. Testar cleanup manualmente
curl http://localhost:3000/api/cron/cleanup-parties

# 3. Criar uma party no navegador
# http://seu-dominio.com ou http://seu-ip:3000

# 4. Aguardar 10 minutos e verificar log do cron
tail -f ~/logs/cleanup-cron.log
```

---

**Pronto! Sua aplicação está rodando em servidor próprio sem dependência de plataformas!** 🚀
