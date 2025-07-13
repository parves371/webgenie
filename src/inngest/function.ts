import { createAgent, gemini } from "@inngest/agent-kit";
import { inngest } from "./client";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandboxUrl } from "./utils";
export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("nextjstest2");
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
      name: "summerizer",
      system:
        "You are an expert NextJs developer.  You write redaible, maintainable, and efficient code.you write code Next.js & react Snippets",
      model: gemini({ model: "gemini-1.5-flash" }),
    });

    const { output } = await codeAgent.run(
      `write the Flowing snippets: ${event.data.value}`
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandboxUrl(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    });

    return { sandboxUrl, output };
  }
);
