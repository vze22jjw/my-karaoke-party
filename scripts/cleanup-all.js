#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

/**
 * Script to clean up all parties from the system
 * Script para limpar todas as parties do sistema
 *
 * Usage/Uso:
 * pnpm cleanup:all              # Preview (shows what would be deleted)
 * pnpm cleanup:all --confirm    # Deletes all parties
 */

import readline from "readline";

// --- Configuration & Localization ---
const API_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "change-me-in-production";
const LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE === "pt" ? "pt" : "en";

const MESSAGES = {
  en: {
    fetching: "🔍 Fetching party statistics...\n",
    currentStats: "📊 Current Statistics:",
    totalParties: "   Total Parties:",
    totalSongs: "   Total Songs:",
    noParties: "✅ No parties to cleanup!",
    openParties: "📋 Open Parties:",
    /**
     * @param {string} name
     * @param {string} hash
     * @param {number} count
     * @param {string} date
     */
    partyItem: (name, hash, count, date) => `   ${name} (${hash}) - ${count} songs - Created at ${date}`,
    preview: "⚠️  Preview mode - no parties were deleted",
    /** @param {number} count */
    runToDelete: (count) => `   To delete all ${count} parties, run:`,
    command: "   pnpm cleanup:all --confirm\n",
    warning: "⚠️  WARNING: You are about to delete ALL parties!",
    /**
     * @param {number} pCount
     * @param {number} sCount
     */
    warningDetails: (pCount, sCount) => `   This will remove ${pCount} parties and ${sCount} songs.\n`,
    confirmPrompt: "Type 'YES' to confirm: ",
    confirmKey: "YES",
    cancelled: "\n❌ Operation cancelled by user",
    deleting: "\n🗑️  Deleting all parties...",
    success: "\n✅ Cleanup completed successfully!",
    deletedCount: "   Deleted parties:",
    timestamp: "   Timestamp:",
    errorFetch: "❌ Error fetching statistics:",
    errorDelete: "❌ Error deleting parties:",
    errorFatal: "❌ Fatal error:",
    dateLocale: "en-US"
  },
  pt: {
    fetching: "🔍 Buscando estatísticas das parties...\n",
    currentStats: "📊 Estatísticas Atuais:",
    totalParties: "   Total de Parties:",
    totalSongs: "   Total de Músicas:",
    noParties: "✅ Não há parties para limpar!",
    openParties: "📋 Parties abertas:",
    /**
     * @param {string} name
     * @param {string} hash
     * @param {number} count
     * @param {string} date
     */
    partyItem: (name, hash, count, date) => `   ${name} (${hash}) - ${count} músicas - Criada em ${date}`,
    preview: "⚠️  Preview mode - nenhuma party foi deletada",
    /** @param {number} count */
    runToDelete: (count) => `   Para deletar todas as ${count} parties, execute:`,
    command: "   pnpm cleanup:all --confirm\n",
    warning: "⚠️  ATENÇÃO: Você está prestes a deletar TODAS as parties!",
    /**
     * @param {number} pCount
     * @param {number} sCount
     */
    warningDetails: (pCount, sCount) => `   Isso irá remover ${pCount} parties e ${sCount} músicas.\n`,
    confirmPrompt: "Digite 'SIM' para confirmar: ",
    confirmKey: "SIM",
    cancelled: "\n❌ Operação cancelada pelo usuário",
    deleting: "\n🗑️  Deletando todas as parties...",
    success: "\n✅ Limpeza concluída com sucesso!",
    deletedCount: "   Parties deletadas:",
    timestamp: "   Timestamp:",
    errorFetch: "❌ Erro ao buscar estatísticas:",
    errorDelete: "❌ Erro ao deletar parties:",
    errorFatal: "❌ Erro fatal:",
    dateLocale: "pt-BR"
  }
};

const t = MESSAGES[LOCALE];

// --- Functions ---

async function getPartiesStats() {
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
    console.error(t.errorFetch, error);
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
    console.error(t.errorDelete, error);
    process.exit(1);
  }
}

async function main() {
  const shouldConfirm = process.argv.includes("--confirm");

  console.log(t.fetching);

  const stats = await getPartiesStats();

  console.log(t.currentStats);
  console.log(`${t.totalParties} ${stats.totalParties}`);
  console.log(`${t.totalSongs} ${stats.totalPlaylistItems}\n`);

  if (stats.totalParties === 0) {
    console.log(t.noParties);
    process.exit(0);
  }

  console.log(t.openParties);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats.parties.forEach((/** @type {any} */ party, /** @type {number} */ index) => {
    const date = new Date(party.createdAt).toLocaleString(t.dateLocale);
    // Fix: Ensure we pass a string or number as expected, party.songsCount should be number
    console.log(t.partyItem(String(index + 1) + ". " + party.name, party.hash, Number(party.songsCount), date));
  });

  console.log("");

  if (!shouldConfirm) {
    console.log(t.preview);
    console.log(t.runToDelete(stats.totalParties));
    console.log(t.command);
    process.exit(0);
  }

  // Additional Confirmation
  console.log(t.warning);
  console.log(t.warningDetails(stats.totalParties, stats.totalPlaylistItems));

  // Interactive confirmation
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(t.confirmPrompt, resolve);
    });

    rl.close();

    if (answer !== t.confirmKey) {
      console.log(t.cancelled);
      process.exit(0);
    }
  }

  console.log(t.deleting);

  const result = await deleteAllParties();

  console.log(t.success);
  console.log(`${t.deletedCount} ${result.deletedCount}`);
  console.log(`${t.timestamp} ${new Date(result.timestamp).toLocaleString(t.dateLocale)}\n`);
}

main().catch((error) => {
  console.error(t.errorFatal, error);
  process.exit(1);
});
