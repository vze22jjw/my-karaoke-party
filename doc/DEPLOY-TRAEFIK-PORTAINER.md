# 🐳 Deploy com Traefik e Portainer

Guia completo para fazer deploy do **My Karaoke Party** usando **Docker + Traefik + Portainer** no seu VPS Ubuntu.

## 📋 Índice

- [Por que Traefik?](#por-que-traefik)
- [Pré-requisitos](#pré-requisitos)
- [Arquitetura](#arquitetura)
- [Setup do Traefik](#setup-do-traefik)
- [Deploy da Aplicação](#deploy-da-aplicação)
- [Configuração de Variáveis](#configuração-de-variáveis)
- [Verificação e Logs](#verificação-e-logs)
- [Múltiplas Aplicações](#múltiplas-aplicações)
- [Troubleshooting](#troubleshooting)

---

## 🌟 Por que Traefik?

✅ **Reverse Proxy automático** - Detecta containers automaticamente
✅ **SSL/HTTPS automático** - Let's Encrypt integrado
✅ **Load Balancing** - Distribuição de carga nativa
✅ **Dashboard visual** - Interface web para monitoramento
✅ **Multi-domínios** - Gerencia múltiplos projetos facilmente
✅ **Docker-first** - Configuração via labels do Docker

---

## 🔧 Pré-requisitos

### No Servidor VPS Ubuntu 20.04

- [x] Docker Engine instalado
- [x] Docker Compose instalado
- [x] Portainer rodando
- [x] Domínio apontado para o IP do servidor
- [x] Portas abertas: 80, 443, 9000 (Portainer)

---

## 🏗️ Arquitetura

```
Internet
    ↓
Traefik (porta 80/443)
    ↓
┌─────────────────────────────────────┐
│  Network: portainer_default         │
│  (Traefik + Apps expostas)          │
│                                     │
│  ┌────────────────────────────┐    │
│  │  mykaraoke_party-app       │    │
│  │  karaoke.seudominio.com    │    │
│  └────────────────────────────┘    │
│              ↓                      │
│     Network: internal               │
│     (Isolada, sem internet)         │
│              ↓                      │
│  ┌────────────────────────────┐    │
│  │  mykaraoke_party-postgres  │    │
│  │  (não exposto na internet) │    │
│  └────────────────────────────┘    │
│              ↓                      │
│  ┌────────────────────────────┐    │
│  │  mykaraoke_party-cleanup   │    │
│  │  (cron interno)            │    │
│  └────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 🚀 Setup do Traefik

### 1. Verificar network do Portainer

```bash
# Verificar se a network portainer_default existe
docker network ls | grep portainer_default

# Se não existir, criar
docker network create portainer_default
```

**Nota**: Se você já tem Traefik rodando no Portainer, provavelmente a network `portainer_default` já existe.

### 2. Criar diretórios para Traefik

```bash
# Criar estrutura de diretórios
mkdir -p ~/traefik
cd ~/traefik
mkdir -p data/configurations
touch data/acme.json
chmod 600 data/acme.json
```

### 3. Criar arquivo de configuração dinâmica

Criar `~/traefik/data/configurations/dynamic.yml`:

```yaml
# Configurações dinâmicas do Traefik
http:
  middlewares:
    # Middleware para comprimir responses
    compress:
      compress: {}

    # Middleware para adicionar headers de segurança
    security-headers:
      headers:
        frameDeny: true
        browserXssFilter: true
        contentTypeNosniff: true
        forceSTSHeader: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000

tls:
  options:
    default:
      minVersion: VersionTLS12
```

### 4. Criar docker-compose do Traefik

Criar `~/traefik/docker-compose.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: always
    security_opt:
      - no-new-privileges:true
    networks:
      - portainer_default
    ports:
      # HTTP
      - 80:80
      # HTTPS
      - 443:443
      # Dashboard (opcional, pode comentar em produção)
      - 8080:8080
    environment:
      # Configurar email para Let's Encrypt
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_EMAIL=${ACME_EMAIL}
    volumes:
      # Socket do Docker (para descobrir containers)
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Certificados SSL
      - ./data/acme.json:/acme.json
      # Configurações dinâmicas
      - ./data/configurations:/configurations
    command:
      # Habilitar Dashboard (opcional)
      - "--api.dashboard=true"
      - "--api.insecure=true"

      # Logs
      - "--log.level=INFO"
      - "--accesslog=true"

      # Provedor Docker
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=portainer_default"

      # Configurações dinâmicas
      - "--providers.file.directory=/configurations"
      - "--providers.file.watch=true"

      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

      # Let's Encrypt
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    labels:
      # Dashboard do Traefik (opcional)
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.${DOMAIN}`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Autenticação básica (usuário: admin, senha: secure_password)
      # Gere com: htpasswd -nb admin sua_senha
      # Ou use: echo $(htpasswd -nb admin secure_password) | sed -e s/\\$/\\$\\$/g
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$8EVjn/nj$$GiLUZqcbueTFeD23SuB6x0"

networks:
  portainer_default:
    external: true
```

### 5. Criar .env do Traefik

Criar `~/traefik/.env`:

```env
# Email para notificações do Let's Encrypt
ACME_EMAIL=seu-email@exemplo.com

# Domínio base (opcional, para dashboard)
DOMAIN=seudominio.com
```

### 6. Iniciar Traefik

```bash
cd ~/traefik
docker-compose up -d

# Verificar logs
docker logs -f traefik

# Verificar se está rodando
docker ps | grep traefik
```

### 7. Acessar Dashboard do Traefik (opcional)

- URL: `http://seu-ip:8080`
- Ou com domínio: `https://traefik.seudominio.com`
- Usuário: `admin`
- Senha: `secure_password` (ou a que você configurou)

---

## 📦 Deploy da Aplicação no Portainer

### 1. Preparar variáveis de ambiente

Antes de criar a stack no Portainer, prepare estas variáveis:

```env
DB_PASSWORD=sua_senha_postgresql_super_segura
YOUTUBE_API_KEY=AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E
DOMAIN=karaoke.seudominio.com
NEXT_PUBLIC_APP_URL=https://karaoke.seudominio.com
```

### 2. Criar Stack no Portainer

1. **Login no Portainer**: `https://seu-ip:9443`
2. **Menu**: `Stacks` → `Add stack`
3. **Nome da Stack**: `my-karaoke-party`

### 3. Escolher método de deploy

#### Opção A: Deploy via Git (Recomendado)

1. **Build method**: Selecione `Repository`
2. **Repository URL**: `https://github.com/flaviokosta79/my-karaoke-party`
3. **Reference**: `refs/heads/main`
4. **Compose path**: `docker-compose.yml`
5. **Environment variables**: Cole as variáveis acima
6. **Deploy the stack**

#### Opção B: Deploy via Web Editor

1. **Build method**: Selecione `Web editor`
2. Cole o conteúdo do `docker-compose.yml` do repositório
3. **Environment variables**: Cole as variáveis
4. **Deploy the stack**

### 4. Verificar Deploy

Após o deploy, você deve ver 3 containers rodando:

- ✅ `mykaraoke_party-postgres` - Database
- ✅ `mykaraoke_party-app` - Aplicação Next.js
- ✅ `mykaraoke_party-cleanup` - Cron de limpeza

---

## 🔐 Configuração de Variáveis

### Variáveis Obrigatórias:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DB_PASSWORD` | Senha do PostgreSQL | `minha_senha_super_segura_123` |
| `YOUTUBE_API_KEY` | Chave da API do YouTube | `AIzaSyD2ANlmuTx-oCKcmeV4GbwnR2JMA99rI1E` |
| `DOMAIN` | Domínio da aplicação (sem https://) | `karaoke.seudominio.com` |
| `NEXT_PUBLIC_APP_URL` | URL completa da aplicação | `https://karaoke.seudominio.com` |

### Importante sobre o Domínio:

1. **DNS configurado**: Seu domínio deve apontar para o IP do servidor
2. **Registro A**: `karaoke.seudominio.com` → `seu.ip.do.servidor`
3. **Propagação**: Aguarde alguns minutos para o DNS propagar
4. **Verificar**: `nslookup karaoke.seudominio.com`

---

## 📊 Verificação e Logs

### Via Portainer:

1. **Stacks** → `my-karaoke-party`
2. Verifique os 3 containers rodando
3. Clique em cada container → **Logs**

### Via Terminal:

```bash
# Logs da aplicação
docker logs -f mykaraoke_party-app

# Logs do PostgreSQL
docker logs -f mykaraoke_party-postgres

# Logs do cleanup
docker logs -f mykaraoke_party-cleanup

# Logs do Traefik (para ver as rotas)
docker logs -f traefik
```

### Testar Aplicação:

```bash
# Testar HTTP (deve redirecionar para HTTPS)
curl -I http://karaoke.seudominio.com

# Testar HTTPS
curl -I https://karaoke.seudominio.com

# Testar endpoint de cleanup
curl https://karaoke.seudominio.com/api/cron/cleanup-parties
```

### Verificar no Dashboard do Traefik:

1. Acesse: `http://seu-ip:8080` ou `https://traefik.seudominio.com`
2. Veja a aba **HTTP** → **Routers**
3. Você deve ver:
   - `mykaraoke-http` (redireciona HTTP → HTTPS)
   - `mykaraoke-https` (serve a aplicação)
4. Veja a aba **HTTP** → **Services**
   - `mykaraoke` (aponta para o container da app)

---

## 🚀 Múltiplas Aplicações

Uma das vantagens do Traefik é gerenciar múltiplos projetos facilmente!

### Exemplo: Adicionar outro projeto

```yaml
services:
  outro-projeto:
    image: seu-outro-projeto
    networks:
      - portainer_default
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=portainer_default"
      - "traefik.http.routers.outro-http.rule=Host(`outro.seudominio.com`)"
      - "traefik.http.routers.outro-http.entrypoints=web"
      - "traefik.http.routers.outro-http.middlewares=https-redirect"
      - "traefik.http.routers.outro-https.rule=Host(`outro.seudominio.com`)"
      - "traefik.http.routers.outro-https.entrypoints=websecure"
      - "traefik.http.routers.outro-https.tls=true"
      - "traefik.http.routers.outro-https.tls.certresolver=letsencrypt"
      - "traefik.http.services.outro.loadbalancer.server.port=3000"
```

O Traefik automaticamente:
- Detecta o novo container
- Cria as rotas HTTP e HTTPS
- Gera certificado SSL
- Faz redirect HTTP → HTTPS

---

## 🔄 Atualizações

### Via Portainer:

1. **Stacks** → `my-karaoke-party`
2. **Editor** (ícone de lápis)
3. Marque `Re-pull image and redeploy`
4. **Update the stack**

### Via Terminal:

```bash
cd ~/apps/my-karaoke-party
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

### Rebuild sem perder dados:

```bash
# Para os containers
docker-compose down

# Rebuild
docker-compose build --no-cache

# Inicia novamente
docker-compose up -d

# O volume postgres_data é preservado!
```

---

## 🐛 Troubleshooting

### Erro: "Gateway Timeout" ou "Bad Gateway"

**Problema**: Traefik não consegue se conectar ao container

**Soluções**:
```bash
# 1. Verificar se o container está na rede correta
docker inspect mykaraoke_party-app | grep -A 10 Networks

# 2. Verificar healthcheck do container
docker ps

# 3. Ver logs do Traefik
docker logs traefik | grep mykaraoke

# 4. Verificar se a porta está correta
docker port mykaraoke_party-app
```

### Erro: "Certificate error" ou "SSL error"

**Problema**: Certificado SSL não foi gerado

**Soluções**:
```bash
# 1. Verificar se o domínio aponta para o servidor
nslookup karaoke.seudominio.com

# 2. Verificar logs do Traefik para erros do Let's Encrypt
docker logs traefik | grep -i acme

# 3. Verificar arquivo de certificados
ls -lh ~/traefik/data/acme.json

# 4. Forçar renovação (se necessário)
rm ~/traefik/data/acme.json
touch ~/traefik/data/acme.json
chmod 600 ~/traefik/data/acme.json
docker-compose restart
```

### Erro: "404 Not Found" no Traefik

**Problema**: Traefik não encontra a rota

**Soluções**:
```bash
# 1. Verificar se o container tem traefik.enable=true
docker inspect mykaraoke_party-app | grep traefik.enable

# 2. Verificar todas as labels
docker inspect mykaraoke_party-app | grep traefik

# 3. Verificar network
docker network inspect portainer_default

# 4. Restart do container
docker restart mykaraoke_party-app
```

### Container não inicia:

```bash
# Ver logs detalhados
docker logs mykaraoke_party-app

# Verificar status dos serviços
docker-compose ps

# Verificar healthcheck do PostgreSQL
docker inspect mykaraoke_party-postgres | grep -A 10 Health
```

### Network "portainer_default" não existe:

```bash
# Criar a network manualmente
docker network create portainer_default

# Verificar redes
docker network ls

# Reconectar container
docker network connect portainer_default mykaraoke_party-app
```

### Dashboard do Traefik não acessível:

```bash
# Verificar se Traefik está rodando
docker ps | grep traefik

# Verificar porta 8080
sudo netstat -tlnp | grep 8080

# Ver logs do Traefik
docker logs -f traefik

# Restart do Traefik
cd ~/traefik
docker-compose restart
```

---

## 🔒 Segurança

### Recomendações:

1. **Firewall (UFW)**:
```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (Traefik)
sudo ufw allow 443/tcp     # HTTPS (Traefik)
sudo ufw allow 9443/tcp    # Portainer
sudo ufw enable
```

2. **Remover Dashboard do Traefik em produção**:
```yaml
# Comentar no docker-compose.yml do Traefik:
# - "--api.dashboard=true"
# - "--api.insecure=true"
# E remover o port mapping:
# - 8080:8080
```

3. **Proteger Portainer com IP whitelist**:
```bash
sudo ufw allow from SEU_IP to any port 9443
```

4. **Senha forte do banco**:
```bash
openssl rand -base64 32
```

5. **Rate Limiting no Traefik** (opcional):

Adicionar em `~/traefik/data/configurations/dynamic.yml`:
```yaml
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
```

E no container:
```yaml
labels:
  - "traefik.http.routers.mykaraoke-https.middlewares=rate-limit"
```

---

## 📦 Backup

### Backup do Banco de Dados:

```bash
# Backup manual
docker exec mykaraoke_party-postgres pg_dump -U mykaraoke_party mykaraoke_party > backup-$(date +%Y%m%d).sql

# Backup automático diário (adicionar ao cron)
0 2 * * * docker exec mykaraoke_party-postgres pg_dump -U mykaraoke_party mykaraoke_party > ~/backups/mykaraoke-$(date +\%Y\%m\%d).sql
```

### Backup dos Volumes:

```bash
# Criar diretório de backup
mkdir -p ~/backups

# Backup do volume do PostgreSQL
docker run --rm \
  -v mykaraoke_party_postgres_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data

# Backup dos certificados SSL
cp ~/traefik/data/acme.json ~/backups/acme-$(date +%Y%m%d).json
```

### Restaurar Backup:

```bash
# Parar aplicação
docker-compose down

# Restaurar banco
docker run --rm \
  -v mykaraoke_party_postgres_data:/data \
  -v ~/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/postgres-backup-YYYYMMDD.tar.gz -C /"

# Iniciar aplicação
docker-compose up -d
```

---

## ✅ Checklist de Deploy com Traefik

- [ ] Docker e Docker Compose instalados
- [ ] Portainer rodando
- [ ] Network `portainer_default` criada
- [ ] Traefik configurado e rodando
- [ ] Dashboard do Traefik acessível
- [ ] Domínio apontando para o servidor (DNS)
- [ ] Stack criada no Portainer
- [ ] Variáveis de ambiente configuradas
- [ ] Containers rodando (postgres, app, cleanup)
- [ ] Aplicação acessível via HTTPS
- [ ] Certificado SSL válido (Let's Encrypt)
- [ ] Redirect HTTP → HTTPS funcionando
- [ ] Endpoint de cleanup testado
- [ ] Firewall configurado
- [ ] Backup configurado

---

## 🎉 Deploy Completo!

Agora você tem:

✅ **Aplicação rodando** em `https://karaoke.seudominio.com`
✅ **SSL automático** via Let's Encrypt
✅ **Redirect automático** HTTP → HTTPS
✅ **Auto-cleanup** a cada 10 minutos
✅ **Dashboard do Traefik** para monitoramento
✅ **Gerenciamento via Portainer**
✅ **Escalável** - adicione mais apps facilmente!

---

## 📚 Recursos Adicionais

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Traefik Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Let's Encrypt with Traefik](https://doc.traefik.io/traefik/https/acme/)
- [Portainer Documentation](https://docs.portainer.io/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
