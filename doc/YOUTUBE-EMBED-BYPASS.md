# YouTube Embed Bypass - CodePen

## 🎯 Problema

Alguns vídeos do YouTube **não podem ser embedados em todos os domínios**. Eles têm restrições de domínio e só funcionam em sites whitelisted (como `.com`, `.io`, etc).

Quando tentamos embedar esses vídeos, aparece:
```
Video unavailable
Watch on YouTube
```

## ✅ Solução Implementada

Utilizamos um **bypass através do CodePen** que está na whitelist do YouTube!

### Como funciona:

1. **Tentativa 1**: Player tenta embed padrão do YouTube
2. **Se falhar**: Ativa automaticamente o bypass do CodePen
3. **Se CodePen falhar**: Mostra botão "Play in YouTube"

### URL do CodePen Bypass:
```
https://cdpn.io/pen/debug/oNPzxKo?v=VIDEO_ID
```

### Exemplo:
```
Vídeo restrito: https://www.youtube.com/watch?v=NAo38Q9c4xA
Bypass CodePen: https://cdpn.io/pen/debug/oNPzxKo?v=NAo38Q9c4xA
```

## 🔧 Implementação Técnica

### 1. Utility Function (`src/utils/youtube-embed.ts`)

```typescript
export function getCodePenEmbedUrl(
  videoId: string,
  params?: Record<string, string | number>
): string {
  const baseUrl = 'https://cdpn.io/pen/debug/oNPzxKo';
  const urlParams = new URLSearchParams({ v: videoId });

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlParams.append(key, String(value));
    });
  }

  return `${baseUrl}?${urlParams.toString()}`;
}
```

### 2. Player Component (`src/components/player.tsx`)

**Estado:**
```typescript
const [useCodePenBypass, setUseCodePenBypass] = useState(false);
```

**Error Handler:**
```typescript
const onPlayerError: YouTubeProps["onError"] = (event) => {
  console.log("Player error, trying CodePen bypass", { event });
  // Primeiro tenta o bypass do CodePen
  if (!useCodePenBypass) {
    setUseCodePenBypass(true);
  } else {
    // Se o bypass também falhou, mostra botão do YouTube
    setShowOpenInYouTubeButton(true);
  }
};
```

**Renderização:**
```tsx
if (useCodePenBypass && !showOpenInYouTubeButton) {
  const codePenUrl = getCodePenEmbedUrl(video.id, {
    autoplay: 1,
    mute: 0,
    controls: 1,
    rel: 0,
  });

  return (
    <iframe
      src={codePenUrl}
      className="h-full w-full animate-in fade-in"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      style={{ border: 0 }}
      title={decode(video.title)}
    />
  );
}
```

## 🎬 Fluxo de Execução

```
┌─────────────────────────────────────┐
│  Vídeo adicionado na playlist       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Player tenta embed padrão YouTube  │
│  (react-youtube component)          │
└──────────────┬──────────────────────┘
               │
          ┌────┴────┐
          │  Erro?  │
          └────┬────┘
               │
        ┌──────┴───────┐
        │ SIM          │ NÃO
        ▼              ▼
┌────────────────┐   ┌─────────────┐
│ Ativa CodePen  │   │ Toca normal │
│ Bypass         │   └─────────────┘
└────────┬───────┘
         │
    ┌────┴────┐
    │  Erro?  │
    └────┬────┘
         │
   ┌─────┴──────┐
   │ SIM        │ NÃO
   ▼            ▼
┌────────────┐ ┌──────────────┐
│ Mostra     │ │ Toca com     │
│ Botão YT   │ │ CodePen OK!  │
└────────────┘ └──────────────┘
```

## 📊 Parâmetros Suportados

O bypass do CodePen suporta os mesmos parâmetros do YouTube Player:

| Parâmetro | Descrição | Valor Padrão |
|-----------|-----------|--------------|
| `autoplay` | Inicia automaticamente | `1` |
| `mute` | Inicia mutado | `0` |
| `controls` | Mostra controles | `1` |
| `rel` | Vídeos relacionados | `0` |
| `start` | Tempo inicial (segundos) | - |
| `end` | Tempo final (segundos) | - |

Documentação completa: https://developers.google.com/youtube/player_parameters

## 🌐 Domínios Whitelisted

O CodePen (`cdpn.io`) está na whitelist do YouTube e permite:
- ✅ Embedar vídeos restritos
- ✅ Autoplay
- ✅ Fullscreen
- ✅ Controles completos
- ✅ Eventos de player

## 🚀 Benefícios

1. **Transparente**: Usuário não percebe a diferença
2. **Automático**: Fallback acontece sem intervenção
3. **Confiável**: CodePen é mantido e confiável
4. **Completo**: Suporta todos os parâmetros do YouTube

## 🔍 Debugging

Para verificar se o bypass está ativo:

```javascript
// No console do navegador
console.log("useCodePenBypass:", useCodePenBypass);
```

Logs no Player:
```
Player error, trying CodePen bypass { event: ... }
```

## 📚 Referências

- **CodePen Original**: https://codepen.io/brownsugar/pen/oNPzxKo
- **YouTube Player Parameters**: https://developers.google.com/youtube/player_parameters
- **Issue sobre embed restrictions**: Vídeos como `NAo38Q9c4xA` só funcionam em `.com` e `.io`

## ✅ Testes

Para testar o bypass:

1. Adicione um vídeo com restrição de embed (ex: `NAo38Q9c4xA`)
2. Player tentará embed padrão → Falhará
3. Player ativará bypass CodePen → Funcionará!
4. Verifique que o vídeo toca normalmente

### Vídeos de Teste com Restrições:
- `NAo38Q9c4xA` - Restrito a `.com` e `.io`
- _(adicione mais conforme encontrar)_

## 🎯 Futuras Melhorias

- [ ] Detectar restrições antes de tentar embed
- [ ] Cache de vídeos que precisam bypass
- [ ] Analytics de quantos vídeos usam bypass
- [ ] Fallback para outros serviços além do CodePen
