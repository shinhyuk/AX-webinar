"use client";

import { useState } from "react";
import { useQuestions } from "@/hooks/useQuestions";
import type { Identity } from "@/hooks/useIdentity";
import { QuestionComposer } from "./QuestionComposer";
import { QuestionList } from "./QuestionList";

type Props = {
  identity: Identity;
  active: boolean;
};

export function QnATab({ identity, active }: Props) {
  const { pending, answered, submit, loading } = useQuestions();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(text: string) {
    setError(null);
    try {
      await submit({ ...identity, text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    }
  }

  return (
    <section
      className={"flex h-full flex-col " + (active ? "" : "hidden")}
      aria-hidden={!active}
    >
      <QuestionComposer onSubmit={handleSubmit} />
      {error ? (
        <div className="mx-3 mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <QuestionList
        pending={pending}
        answered={answered}
        myUserId={identity.userId}
        loading={loading}
      />
    </section>
  );
}
