import { createAgent, gemini } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event }) => {
    const codeAgent = createAgent({
      name: "summerizer",
      system:
        "You are an expert NextJs developer.  You write redaible, maintainable, and efficient code.you write code Next.js & react Snippets",
      model: gemini({ model: "gemini-1.5-flash" }),
    });

    const { output } = await codeAgent.run(
      `write the Flowing snippets: ${event.data.value}`
    );

    console.log("output", output);

    return { output };
  }
);
