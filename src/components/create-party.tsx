"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";

export function CreateParty() {
  const router = useRouter();
  const [name, setName] = useState("");

  const createParty = api.party.create.useMutation({
    onSuccess: (party) => {
      // Redirect to the party page
      router.push(`/party/${party.hash}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createParty.mutate({ name });
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="text"
        placeholder="Title"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-full px-4 py-2 text-black"
        minLength={3}
        required
      />
      <button
        type="submit"
        className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
        disabled={createParty.isPending}
      >
        {createParty.isPending ? "Starting..." : "Start Party"}
      </button>
    </form>
  );
}
