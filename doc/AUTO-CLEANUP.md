# Party Auto-Cleanup System

## Overview
Sistema automático para fechar parties inativas após 20 minutos sem atividade.

## Como Funciona

### 1. Campo `lastActivityAt`
- Cada party tem um campo `lastActivityAt` que registra a última atividade
- Criado automaticamente com a data de criação da party
- Atualizado em duas situações:
  - **Heartbeat**: A cada 60 segundos enquanto há usuários conectados
  - **Música tocada**: Quando uma música é marcada como "played"

### 2. Heartbeat (Mantém Party Viva)
- Endpoint: `POST /api/party/heartbeat`
- Enviado automaticamente a cada 60 segundos pelos componentes:
  - `player-scene.tsx` (host/player)
  - `party-scene.tsx` (participantes)
- Atualiza o `lastActivityAt` para a data/hora atual

### 3. Renovação por Música Tocada
- Quando uma música é marcada como "played" via `POST /api/playlist/played`
- O `lastActivityAt` é atualizado automaticamente
- Isso renova o timer de 20 minutos

### 4. Cleanup Job (Limpeza Automática)
- Endpoint: `GET /api/cron/cleanup-parties`
- Deve ser executado periodicamente (recomendado: a cada 5-10 minutos)
- Deleta parties onde `lastActivityAt < (now - 20 minutes)`

## Configuração do Cron Job

### Opção 1: Servidor Linux/Ubuntu (Recomendado para VPS)
Adicione ao crontab:
```bash
crontab -e
```

Adicione a linha:
```bash
*/10 * * * * curl -X GET http://localhost:3000/api/cron/cleanup-parties >> ~/logs/cleanup-cron.log 2>&1
```

### Opção 2: Servidor Windows
Use Task Scheduler para criar tarefa que executa a cada 10 minutos:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/cleanup-parties"
```

### Opção 3: Docker/Container
Adicione serviço de cron no docker-compose.yml ou use crond no container.

### Opção 4: Desenvolvimento Local
Para testar localmente, chame manualmente:
```bash
curl http://localhost:3000/api/cron/cleanup-parties
```

**Veja guia completo de deploy em:** `doc/DEPLOY-VPS-UBUNTU.md`

## Regras de Inatividade

Uma party é considerada inativa e será deletada se:
1. **Sem usuários conectados**: Nenhum heartbeat por 20+ minutos
2. **Com usuários mas sem tocar música**: 20+ minutos sem marcar nenhuma música como "played"

Uma party permanece ativa se:
- Há usuários conectados (heartbeat a cada 60s)
- OU uma música foi tocada recentemente (renova por 20 min)

## Benefícios
- ✅ Libera recursos do banco de dados
- ✅ Remove parties abandonadas automaticamente
- ✅ Parties ativas com usuários nunca são fechadas
- ✅ Tocar música renova o timer automaticamente
