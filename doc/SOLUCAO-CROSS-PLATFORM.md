# Cross-Platform Solution / Solução Multi-Plataforma

<details open>
<summary>🇬🇧 English</summary>

To ensure the application runs smoothly on both Linux (Production) and macOS/Windows (Development), we use Docker.

**Key Challenges Solved:**
* **Prisma Engines:** We configure `PRISMA_CLI_BINARY_TARGETS` to support `linux-musl` (Alpine Docker) and `darwin` (macOS) to avoid binary mismatches.
* **Socket Ports:** We use dynamic port mapping in `docker-compose` and flexible CORS origins in the Socket server to support different local dev URLs (e.g., `localhost`, `mylocal.mac.here`).

</details>

<details>
<summary>🇧🇷 Português</summary>

Para garantir que o aplicativo rode suavemente tanto em Linux (Produção) quanto em macOS/Windows (Desenvolvimento), usamos Docker.

**Principais Desafios Resolvidos:**
* **Mecanismos Prisma:** Configuramos `PRISMA_CLI_BINARY_TARGETS` para suportar `linux-musl` (Alpine Docker) e `darwin` (macOS) para evitar incompatibilidade de binários.
* **Portas de Socket:** Usamos mapeamento dinâmico de portas no `docker-compose` e origens CORS flexíveis no servidor Socket para suportar diferentes URLs de desenvolvimento local (ex: `localhost`, `mylocal.mac.here`).

</details>
