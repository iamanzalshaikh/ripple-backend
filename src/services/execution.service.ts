import type { ExecutionAction, Step } from "../types/command.types.js";

function pending(action: Omit<ExecutionAction, "status">): ExecutionAction {
  return { ...action, status: "pending" };
}

/** Convert a single completed step + its output text into an Electron-executable action. */
export function actionForStep(args: {
  step: Step;
  text?: string;
  appTarget?: { url: string; name: string };
}): ExecutionAction | null {
  const { step, text, appTarget } = args;

  switch (step) {
    case "open_app":
      return {
        type: "OPEN_APP",
        status: "pending",
        data: appTarget
          ? { target: appTarget.name, url: appTarget.url }
          : { target: "browser" },
      };

    case "copy":
      if (!text) return pending({ type: "NOOP" });
      return pending({ type: "COPY_TEXT", data: { text } });

    case "paste":
      if (!text) return pending({ type: "NOOP" });
      return pending({ type: "INSERT_TEXT", data: { text } });

    case "undo":
      if (!text) return pending({ type: "NOOP" });
      return pending({ type: "INSERT_TEXT", data: { text } });

    case "generate":
    case "rewrite_formal":
    case "rewrite_casual":
    case "rewrite_short":
    case "rewrite_long":
    case "rewrite_emotional":
    case "rewrite_professional":
    case "summarize":
    case "fix_grammar":
    case "translate":
      // Only the *final* AI step gets surfaced as an INSERT_TEXT — the orchestrator
      // decides which step is final and only emits that action.
      if (!text) return null;
      return pending({ type: "INSERT_TEXT", data: { text } });

    default:
      return null;
  }
}

export function suggestionAction(args: {
  reason: string;
  suggestions: string[];
}): ExecutionAction {
  return pending({
    type: "SHOW_SUGGESTIONS",
    data: {
      reason: args.reason,
      items: args.suggestions.map((label) => ({ label, command: label })),
    },
  });
}

export function workflowAction(actions: ExecutionAction[]): ExecutionAction {
  return pending({
    type: "WORKFLOW",
    data: { steps: actions },
  });
}

/** Decide which step in a plan should produce the user-visible INSERT_TEXT action. */
export function isFinalProducingStep(step: Step): boolean {
  return (
    step === "generate" ||
    step === "summarize" ||
    step === "fix_grammar" ||
    step === "translate" ||
    step.startsWith("rewrite_")
  );
}
