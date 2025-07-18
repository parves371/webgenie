import { prisma } from "@/lib/db";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { Sandbox } from "@e2b/code-interpreter";
import {
  AnyZodType,
  type Message,
  type Tool,
  createAgent,
  createNetwork,
  createState,
  createTool,
  gemini,
} from "@inngest/agent-kit";
import { z } from "zod";
import { inngest } from "./client";
import { getSandboxUrl, lastAssistandtTextMesageContent } from "./utils";

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
    const previusMessages = await step.run("get-messages", async () => {
      const formatedMEssages: Message[] = [];
      const messages = await prisma.message.findMany({
        where: {
          id: event.data.value.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      for (const message of messages) {
        formatedMEssages.push({
          type: "text",
          role: message.role === "ASSISTANT" ? "assistant" : "user",
          content: message.content,
        });
      }

      return formatedMEssages;
    });

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
      },
      {
        messages: previusMessages,
      }
    );

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
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return codeAgent;
      },
    });

    const result = await network.run(event.data.value, { state: state });

    const fragmentTitleGenrator = createAgent({
      name: "fragment-title-generator",
      description: "Generates a title for the fragment based on the summary",
      system: FRAGMENT_TITLE_PROMPT,
      model: gemini({ model: "gemini-2.0-flash-lite" }),
    });

    const ResponseGenrator = createAgent({
      name: "response-generator",
      description: "Generates a response based on the summary and files",
      system: RESPONSE_PROMPT,
      model: gemini({ model: "gemini-2.0-flash-lite" }),
    });

    const { output: fragmentTitleOutput } = await fragmentTitleGenrator.run(
      result.state.data.summary
    );
    const { output: responseOutput } = await ResponseGenrator.run(
      result.state.data.summary
    );

    const generateFregmentTitle = () => {
      if (fragmentTitleOutput[0].type !== "text") {
        return "Fragment";
      }
      if (Array.isArray(fragmentTitleOutput[0].content)) {
        return fragmentTitleOutput[0].content.map((text) => text.text).join("");
      } else {
        return fragmentTitleOutput[0].content;
      }
    };

    const generateResponse = () => {
      if (responseOutput[0].type !== "text") {
        return "Sorry, I couldn't generate a response.";
      }
      if (Array.isArray(responseOutput[0].content)) {
        return responseOutput[0].content.map((text) => text.text).join("");
      } else {
        return responseOutput[0].content;
      }
    };

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
          content: generateResponse(),
          role: "ASSISTANT",
          type: "RESULT",
          projectId: event.data.projectId,
          fragment: {
            create: {
              sanboxUrl: sandboxUrl,
              title: generateFregmentTitle(),
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
