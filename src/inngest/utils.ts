import { Sandbox } from "@e2b/code-interpreter";
import { AgentResult, TextMessage } from "@inngest/agent-kit";
import { SANDBOX_TIMEOUT } from "./type";

export async function getSandboxUrl(sandboxId: string) {
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.setTimeout(SANDBOX_TIMEOUT); 
  return sandbox;
}

export function lastAssistandtTextMesageContent(retsult: AgentResult) {
  const lastAssistantTextMessageIndex = retsult.output.findLastIndex(
    (message) => message.role === "assistant"
  );

  const message = retsult.output[lastAssistantTextMessageIndex] as
    | TextMessage
    | undefined;

  return message?.content
    ? typeof message.content === "string"
      ? message.content
      : message.content.map((m) => m.text).join("")
    : undefined;
}
