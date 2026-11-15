import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** The screen shows its own error message; skip the global toast. */
      handlesErrors?: boolean;
    };
  }
}
