# Cleanup Problem & Solution / Problema e Solução de Limpeza

<details open>
<summary>🇬🇧 English</summary>

**Problem:** Initially, the app relied on `cron` jobs inside the container which were unreliable in serverless environments (like Vercel) or complex to manage in Docker.

**Solution:** We moved the cleanup logic to a Next.js API Route (`/api/cron/cleanup-parties`). This allows the cleanup to be triggered by an external pinger (like UptimeRobot, Vercel Cron, or a simple `curl` script) without relying on container-internal clocks or persistent processes.

</details>

<details>
<summary>🇧🇷 Português</summary>

**Problema:** Inicialmente, o app dependia de jobs `cron` dentro do container, que eram pouco confiáveis em ambientes serverless (como Vercel) ou complexos de gerenciar no Docker.

**Solução:** Movemos a lógica de limpeza para uma Rota de API Next.js (`/api/cron/cleanup-parties`). Isso permite que a limpeza seja acionada por um "pinger" externo (como UptimeRobot, Vercel Cron ou um script `curl` simples) sem depender de relógios internos do container ou processos persistentes.

</details>
