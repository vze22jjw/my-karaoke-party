# 🧹 Limpeza de Parties

Guia para limpar parties do sistema My Karaoke Party.

## 📋 Índice

- [Limpeza Automática](#limpeza-automática)
- [Limpeza Manual de Todas as Parties](#limpeza-manual-de-todas-as-parties)
- [API de Administração](#api-de-administração)
- [Segurança](#segurança)

---

## 🤖 Limpeza Automática

O sistema possui limpeza automática de parties inativas.

### Como funciona:

- ⏱️ **Cron job** executa a cada 10 minutos
- 🕒 **Inatividade**: Parties sem atividade por **20 minutos** são deletadas
- 💓 **Heartbeat**: Atualizado automaticamente nas páginas do player e party
- 🎵 **Atividades que mantêm a party ativa**:
  - Adicionar música
  - Remover música
  - Marcar música como tocada
  - Visualizar a página da party
  - Visualizar a página do player

### Endpoint:

```
GET /api/cron/cleanup-parties
```

**Documentação completa**: [AUTO-CLEANUP.md](AUTO-CLEANUP.md)

---

## 🗑️ Limpeza Manual de Todas as Parties

Para limpar **TODAS** as parties do sistema de uma vez.

### Uso via CLI (Recomendado)

#### 1. Preview (não deleta)

Veja quantas parties seriam deletadas:

```bash
pnpm cleanup:all
```

Saída esperada:
```
🔍 Buscando estatísticas das parties...

📊 Estatísticas Atuais:
   Total de Parties: 15
   Total de Músicas: 47

📋 Parties abertas:
   1. Festa do João (abc123) - 5 músicas - Criada em 08/10/2025 14:30:00
   2. Karaoke Corporativo (def456) - 8 músicas - Criada em 08/10/2025 15:45:00
   ...

⚠️  Preview mode - nenhuma party foi deletada
   Para deletar todas as 15 parties, execute:
   pnpm cleanup:all --confirm
```

#### 2. Deletar (com confirmação)

```bash
pnpm cleanup:all --confirm
```

**Confirmação interativa:**
```
⚠️  ATENÇÃO: Você está prestes a deletar TODAS as parties!
   Isso irá remover 15 parties e 47 músicas.

Digite 'SIM' para confirmar: SIM

🗑️  Deletando todas as parties...

✅ Limpeza concluída com sucesso!
   Parties deletadas: 15
   Timestamp: 08/10/2025 16:00:00
```

### Uso via API direta

#### Preview (GET)

```bash
# Ver estatísticas sem deletar
curl http://localhost:3000/api/admin/cleanup-all
```

Resposta:
```json
{
  "totalParties": 15,
  "totalPlaylistItems": 47,
  "parties": [
    {
      "name": "Festa do João",
      "hash": "abc123",
      "createdAt": "2025-10-08T14:30:00.000Z",
      "songsCount": 5
    },
    ...
  ]
}
```

#### Deletar (DELETE)

```bash
# Com token no header
curl -X DELETE \
  -H "Authorization: Bearer seu-token-admin" \
  http://localhost:3000/api/admin/cleanup-all

# Ou com token na query string
curl -X DELETE \
  "http://localhost:3000/api/admin/cleanup-all?token=seu-token-admin"
```

Resposta:
```json
{
  "success": true,
  "message": "All parties deleted successfully",
  "deletedCount": 15,
  "totalBefore": 15,
  "timestamp": "2025-10-08T16:00:00.000Z"
}
```

---

## 🔐 API de Administração

### Endpoint: `/api/admin/cleanup-all`

#### GET - Estatísticas

Retorna informações sobre todas as parties sem deletar nada.

**Autenticação**: Não requer

**Response**:
```typescript
{
  totalParties: number;
  totalPlaylistItems: number;
  parties: Array<{
    name: string;
    hash: string;
    createdAt: string;
    songsCount: number;
  }>;
}
```

#### DELETE - Deletar Todas

Deleta todas as parties do sistema.

**Autenticação**: Requer token de admin

**Headers**:
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Ou Query Param**:
```
?token={ADMIN_TOKEN}
```

**Response Success**:
```typescript
{
  success: true;
  message: string;
  deletedCount: number;
  totalBefore: number;
  timestamp: string;
}
```

**Response Error (401)**:
```json
{
  "error": "Unauthorized - Invalid admin token"
}
```

**Response Error (500)**:
```json
{
  "error": "Failed to delete parties"
}
```

---

## 🔒 Segurança

### Token de Admin

O endpoint de delete requer um **ADMIN_TOKEN** para evitar deleções acidentais.

#### Configurar Token

**Em desenvolvimento (.env.local)**:
```env
ADMIN_TOKEN=meu-token-super-secreto-123
```

**Em produção (Docker/Portainer)**:

Adicionar nas variáveis de ambiente da stack:
```env
ADMIN_TOKEN=token-producao-super-seguro-xyz789
```

#### Gerar Token Seguro

```bash
# Gerar token aleatório (32 bytes)
openssl rand -base64 32

# Ou usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Proteção contra Uso Acidental

1. **Token obrigatório** para DELETE
2. **Confirmação interativa** no CLI (`Digite 'SIM'`)
3. **Preview mode** por padrão (requer `--confirm`)
4. **Logs detalhados** de quantas parties serão deletadas

### Recomendações

✅ **Use token diferente** em cada ambiente
✅ **Não commite o token** no Git
✅ **Guarde o token** em local seguro
✅ **Troque o token** periodicamente
✅ **Faça preview** antes de deletar

❌ **Não use token padrão** em produção
❌ **Não compartilhe o token** publicamente
❌ **Não exponha** o endpoint sem proteção

---

## 📝 Exemplos de Uso

### Cenário 1: Ambiente de Testes

Limpar banco após testes:

```bash
# Ver quantas parties de teste existem
pnpm cleanup:all

# Limpar tudo
pnpm cleanup:all --confirm
```

### Cenário 2: Manutenção Agendada

Limpar todas as parties semanalmente:

```bash
# Criar script de manutenção
cat > scripts/weekly-cleanup.sh << 'EOF'
#!/bin/bash
echo "🧹 Limpeza semanal - $(date)"
cd /path/to/my-karaoke-party
export ADMIN_TOKEN="seu-token-aqui"
node scripts/cleanup-all.js --confirm
EOF

chmod +x scripts/weekly-cleanup.sh

# Agendar no cron (toda segunda às 3h)
crontab -e
# Adicionar:
0 3 * * 1 /path/to/scripts/weekly-cleanup.sh >> /var/log/karaoke-cleanup.log 2>&1
```

### Cenário 3: API em Produção

Limpar via API com autenticação:

```bash
# Configurar token
export ADMIN_TOKEN="seu-token-producao"

# Ver estatísticas
curl https://karaoke.seudominio.com/api/admin/cleanup-all

# Deletar (com confirmação manual)
read -p "Deletar TODAS as parties? (sim/não): " confirm
if [ "$confirm" = "sim" ]; then
  curl -X DELETE \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    https://karaoke.seudominio.com/api/admin/cleanup-all
fi
```

### Cenário 4: Docker/Portainer

Executar dentro do container:

```bash
# Entrar no container
docker exec -it mykaraoke_party-app sh

# Limpar parties
node scripts/cleanup-all.js --confirm

# Ou via curl interno
curl -X DELETE \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:3000/api/admin/cleanup-all
```

---

## 🆘 Troubleshooting

### Erro: "Unauthorized - Invalid admin token"

**Causa**: Token de admin inválido ou não configurado

**Solução**:
```bash
# Verificar se o token está configurado
echo $ADMIN_TOKEN

# Configurar token
export ADMIN_TOKEN="seu-token-aqui"

# Ou adicionar no .env
echo "ADMIN_TOKEN=seu-token-aqui" >> .env.local
```

### Erro: "Failed to fetch parties stats"

**Causa**: Aplicação não está rodando ou URL incorreta

**Solução**:
```bash
# Verificar se a aplicação está rodando
curl http://localhost:3000

# Verificar URL configurada
echo $NEXT_PUBLIC_APP_URL

# Iniciar aplicação se necessário
pnpm dev
```

### Script não executa

**Causa**: Permissões ou Node.js não instalado

**Solução**:
```bash
# Dar permissão de execução
chmod +x scripts/cleanup-all.js

# Executar diretamente com Node
node scripts/cleanup-all.js --confirm

# Verificar Node.js instalado
node --version
```

---

## 📚 Ver Também

- [AUTO-CLEANUP.md](AUTO-CLEANUP.md) - Limpeza automática (20 minutos)
- [DEPLOY-TRAEFIK-PORTAINER.md](DEPLOY-TRAEFIK-PORTAINER.md) - Deploy em produção
- [SCRIPTS.md](../SCRIPTS.md) - Outros scripts disponíveis

---

## ⚠️ Avisos Importantes

⚠️ **Operação irreversível**: Parties deletadas **NÃO PODEM** ser recuperadas
⚠️ **Uso cuidadoso**: Sempre faça preview antes de confirmar
⚠️ **Produção**: Configure token seguro em produção
⚠️ **Backup**: Considere fazer backup do banco antes de limpar

---

**✅ Pronto!** Agora você tem controle total sobre a limpeza de parties no sistema.
