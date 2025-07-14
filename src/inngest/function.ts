import { Sandbox } from "@e2b/code-interpreter";
import {
  createAgent,
  createNetwork,
  createTool,
  gemini,
  AnyZodType,
  type Tool,
} from "@inngest/agent-kit";
import { z } from "zod";
import { inngest } from "./client";
import { getSandboxUrl, lastAssistandtTextMesageContent } from "./utils";
import { PROMPT } from "@/prompt";
import { prisma } from "@/lib/db";

interface AgentState {
  summary: string;
  files: {
    [key: string]: string;
  };
}

export const codeAgentFuntion = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("nextjstest2");
      return sandbox.sandboxId;
    });

    const commandSchema = z.object({
      command: z.string(),
    });

    const codeAgent = createAgent<AgentState>({
      name: "you are an expert coding agent",
      system: PROMPT,
      model: gemini({ model: "gemini-2.0-flash-lite" }),
      tools: [
        createTool({
          name: "terminal",
          description: "A tool that executes terminal commands",
          parameters: commandSchema as unknown as AnyZodType,
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffer = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandboxUrl(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffer.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffer.stderr += data;
                  },
                });

                return result.stdout;
              } catch (error) {
                console.error(`Command failed: ${command}, Error: ${error}`);
                return `command failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "A tool that creates or updates files in a sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }) as unknown as AnyZodType,
          handler: async (
            { files },
            { step, network }: Tool.Options<AgentState>
          ) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  const updatedFiles = network.state.data.files || {};
                  const sandbox = await getSandboxUrl(sandboxId);

                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[files.path] = file.content;
                  }

                  return updatedFiles;
                } catch (error) {
                  return `command failed: ${error}`;
                }
              }
            );
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          },
        }),
        createTool({
          name: "readFiles",
          description: "A tool that reads a file in a sandbox",
          parameters: z.object({
            files: z.string(),
          }) as unknown as AnyZodType,
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandboxUrl(sandboxId);
                const contents = [];

                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                return `Error: ${error}`;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantTextMessage =
            lastAssistandtTextMesageContent(result);

          if (lastAssistantTextMessage && network) {
            if (lastAssistantTextMessage.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantTextMessage;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "codiing agent network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return codeAgent;
      },
    });

    const result = await network.run(event.data.value);
    const isError =
      !result.state.data.summary ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandboxUrl(sandboxId);
      const host = sandbox.getHost(3000);
      return `http://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            content: "Somthing went wrong. please try again",
            role: "ASSISTANT",
            type: "ERRROR",
            projectId: event.data.projectId,
          },
        });
      }

      return await prisma.message.create({
        data: {
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          projectId: event.data.projectId,
          fragment: {
            create: {
              sanboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
      titel: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);
