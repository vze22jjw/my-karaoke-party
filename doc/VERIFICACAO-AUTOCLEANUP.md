# Auto-Cleanup Verification / Verificação de Limpeza Automática

<details open>
<summary>🇬🇧 English</summary>

To verify that the auto-cleanup is working:

1.  **Create a Party:** Start a new party.
2.  **Simulate Time Passing:** Manually update the `lastActivityAt` date in the Database to be 2 days ago.
3.  **Trigger Endpoint:** Visit `http://your-url/api/cron/cleanup-parties` in your browser.
4.  **Check Results:** The response should return `{ success: true, deleted: 1 }` (or similar). The party should no longer exist in the database.

</details>

<details>
<summary>🇧🇷 Português</summary>

Para verificar se a limpeza automática está funcionando:

1.  **Crie uma Festa:** Inicie uma nova festa.
2.  **Simule a Passagem do Tempo:** Atualize manualmente a data `lastActivityAt` no Banco de Dados para 2 dias atrás.
3.  **Acione o Endpoint:** Visite `http://sua-url/api/cron/cleanup-parties` no seu navegador.
4.  **Verifique os Resultados:** A resposta deve retornar `{ success: true, deleted: 1 }` (ou similar). A festa não deve mais existir no banco de dados.

</details>
