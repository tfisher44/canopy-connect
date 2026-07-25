import { createContext, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { IntakeFormValues } from "../schema";

type StoryContextValue = {
  latestStory: string | null;
  submittedAt: string | null;
  submitStory: (values: IntakeFormValues) => void;
};

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

export function StoryProvider({ children }: PropsWithChildren) {
  const [latestStory, setLatestStory] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const value = useMemo<StoryContextValue>(
    () => ({
      latestStory,
      submittedAt,
      submitStory(values) {
        setLatestStory(values.story);
        setSubmittedAt(new Date().toISOString());
      },
    }),
    [latestStory, submittedAt],
  );

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStory() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error("useStory must be used within StoryProvider.");
  }

  return context;
}
