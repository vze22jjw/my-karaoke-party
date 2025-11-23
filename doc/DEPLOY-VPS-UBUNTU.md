**Updates:** General VPS instructions updated.

````markdown
# VPS Deployment (Ubuntu) / Deploy em VPS (Ubuntu)

<details open>
<summary>🇬🇧 English</summary>

1.  **Clone the Repo:** `git clone ...`
2.  **Env Setup:** Copy `.env.example` to `.env` and populate keys.
3.  **Build:**
    ```bash
    docker-compose up -d --build
    ```
4.  **Nginx Proxy (Optional):** If running Nginx, ensure you proxy `Upgrade` and `Connection` headers for the `/socket.io/` path to allow real-time features to work.

**Note:** The Applause feature requires `NEXT_PUBLIC_APP_URL` to be set in your `.env` file to match your VPS IP or Domain.

</details>

<details>
<summary>🇧🇷 Português</summary>

1.  **Clone o Repositório:** `git clone ...`
2.  **Configuração de Env:** Copie `.env.example` para `.env` e preencha as chaves.
3.  **Build:**
    ```bash
    docker-compose up -d --build
    ```
4.  **Proxy Nginx (Opcional):** Se estiver rodando Nginx, certifique-se de fazer proxy dos cabeçalhos `Upgrade` e `Connection` para o caminho `/socket.io/` para permitir que os recursos em tempo real funcionem.

**Nota:** O recurso de Aplausos requer que `NEXT_PUBLIC_APP_URL` esteja definido no seu arquivo `.env` correspondendo ao IP ou Domínio da sua VPS.

</details>
