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
        placeholder="My Awesome Party..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-lg input-accent"
        minLength={3}
        required
      />
      <button
        type="submit"
        className="btn btn-lg btn-accent"
        disabled={createParty.isPending}
      >
        {createParty.isPending ? "Creating..." : "Start Party 🎉"}
      </button>
    </form>
  );
}
