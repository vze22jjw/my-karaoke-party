# My Karaoke Party - Guia de Desenvolvimento Local

## 🚀 Como rodar o projeto completo

### Opção 1: Deploy em Produção (Recomendado)

Esta é a melhor opção para ter todas as funcionalidades funcionando:

1. **Deploy no Vercel:**
   ```bash
   vercel
   ```

2. **Deploy no PartyKit:**
   ```bash
   npx partykit deploy
   ```

3. **Configurar variáveis de ambiente** no Vercel com a URL do PartyKit deployado

### Opção 2: Desenvolvimento Local com WSL (Windows)

O PartyKit tem problemas com caminhos do Windows. Para rodar localmente:

1. **Instale o WSL:**
   ```powershell
   wsl --install
   ```

2. **Abra o WSL e navegue até o projeto:**
   ```bash
   cd /mnt/e/VSCode/Projects/my-karaoke-party
   ```

3. **Instale as dependências (dentro do WSL):**
   ```bash
   pnpm install
   ```

4. **Inicie o PartyKit (dentro do WSL):**
   ```bash
   pnpm dev:pk
   ```

5. **Em outro terminal do Windows, inicie o Next.js:**
   ```powershell
   pnpm dev
   ```

### Opção 3: Modo Local sem WebSocket (Atual)

O que funciona:
- ✅ Criar parties
- ✅ Pesquisar músicas no YouTube
- ✅ Ver interface completa

O que NÃO funciona sem PartyKit:
- ❌ Adicionar músicas à playlist
- ❌ Sincronização em tempo real

## 🔧 API REST Alternativa (Em Implementação)

Foi criada uma API REST usando tRPC para permitir que o app funcione sem PartyKit:

### Endpoints disponíveis:

```typescript
// Buscar playlist
api.playlist.getPlaylist.useQuery({ partyHash: "abc123" });

// Adicionar música
api.playlist.addVideo.useMutation({
  partyHash: "abc123",
  videoId: "...",
  title: "...",
  coverUrl: "...",
  singerName: "...",
});

// Remover música
api.playlist.removeVideo.useMutation({
  partyHash: "abc123",
  videoId: "...",
});

// Marcar como tocada
api.playlist.markAsPlayed.useMutation({
  partyHash: "abc123",
  videoId: "...",
});
```

### Para finalizar a implementação:

1. **Atualizar `party-scene.tsx`:**
   - Substituir `socket.send()` por `api.playlist.addVideo.mutate()`
   - Usar `useQuery` com polling para atualizar a playlist

2. **Atualizar `player-scene.tsx`:**
   - Mesmo processo

3. **Implementar polling:**
   ```typescript
   const { data: playlistData } = api.playlist.getPlaylist.useQuery(
     { partyHash: party.hash },
     { refetchInterval: 2000 } // Atualiza a cada 2 segundos
   );
   ```

## 🔑 Variáveis de Ambiente Necessárias

```.env
# Banco de dados
DATABASE_URL="postgresql://postgres:password@localhost:5432/mykaraoke_party"
DATABASE_URL_NON_POOLING="postgresql://postgres:password@localhost:5432/mykaraoke_party"

# YouTube API
YOUTUBE_API_KEY="sua_chave_aqui"

# PartyKit (para produção ou WSL)
NEXT_PUBLIC_PARTYKIT_URL="http://127.0.0.1:1999"  # Local
# ou
NEXT_PUBLIC_PARTYKIT_URL="https://seu-projeto.partykit.dev"  # Produção
```

## 📝 Problemas Conhecidos

### Windows + PartyKit
- **Problema:** `TypeError: Invalid URL` ao tentar rodar `partykit dev` ou `partykit deploy`
- **Causa:** Bug do PartyKit com caminhos do Windows
- **Solução:** Use WSL ou faça deploy em produção

### Cache (Vercel KV)
- **Situação Atual:** Usando cache em memória para desenvolvimento
- **Produção:** Configurar Vercel KV para melhor performance

## 🎯 Estado Atual

✅ Configurado:
- PostgreSQL rodando no Docker
- Next.js funcionando
- YouTube API configurada
- Cache em memória
- Schema do banco com PlaylistItem
- Router tRPC para playlist

⚠️ Em Progresso:
- Migração dos componentes para usar tRPC ao invés de WebSocket
- Polling para simular tempo real

## 🚀 Próximos Passos

Para ter o app 100% funcional em qualquer OS:

1. Finalizar migração dos componentes React para usar tRPC
2. Implementar polling para atualizações
3. Testar em diferentes sistemas operacionais
4. Fazer deploy em produção

---

**Dúvidas?** Abra uma issue no repositório!
