#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/**
 * Script para limpar todas as parties do sistema
 *
 * Uso:
 *   pnpm cleanup:all              # Preview (mostra o que seria deletado)
 *   pnpm cleanup:all --confirm    # Deleta todas as parties
 */

import readline from "readline";

const API_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "change-me-in-production";async function getPartiesStats() {
  try {
    const response = await fetch(`${API_URL}/api/admin/cleanup-all`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error);
    process.exit(1);
  }
}

async function deleteAllParties() {
  try {
    const response = await fetch(`${API_URL}/api/admin/cleanup-all`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Erro ao deletar parties:", error);
    process.exit(1);
  }
}

async function main() {
  const shouldConfirm = process.argv.includes("--confirm");

  console.log("🔍 Buscando estatísticas das parties...\n");

  const stats = await getPartiesStats();

  console.log("📊 Estatísticas Atuais:");
  console.log(`   Total de Parties: ${stats.totalParties}`);
  console.log(`   Total de Músicas: ${stats.totalPlaylistItems}\n`);

  if (stats.totalParties === 0) {
    console.log("✅ Não há parties para limpar!");
    process.exit(0);
  }

  console.log("📋 Parties abertas:");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats.parties.forEach((party, index) => {
    const date = new Date(party.createdAt).toLocaleString("pt-BR");
    console.log(
      `   ${index + 1}. ${party.name} (${party.hash}) - ${party.songsCount} músicas - Criada em ${date}`
    );
  });

  console.log("");

  if (!shouldConfirm) {
    console.log("⚠️  Preview mode - nenhuma party foi deletada");
    console.log(
      `   Para deletar todas as ${stats.totalParties} parties, execute:`
    );
    console.log("   pnpm cleanup:all --confirm\n");
    process.exit(0);
  }

  // Confirmação adicional
  console.log("⚠️  ATENÇÃO: Você está prestes a deletar TODAS as parties!");
  console.log(
    `   Isso irá remover ${stats.totalParties} parties e ${stats.totalPlaylistItems} músicas.\n`
  );

  // Em ambiente interativo, pedir confirmação
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("Digite 'SIM' para confirmar: ", resolve);
    });

    rl.close();

    if (answer !== "SIM") {
      console.log("\n❌ Operação cancelada pelo usuário");
      process.exit(0);
    }
  }

  console.log("\n🗑️  Deletando todas as parties...");

  const result = await deleteAllParties();

  console.log("\n✅ Limpeza concluída com sucesso!");
  console.log(`   Parties deletadas: ${result.deletedCount}`);
  console.log(`   Timestamp: ${new Date(result.timestamp).toLocaleString("pt-BR")}\n`);
}

main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
