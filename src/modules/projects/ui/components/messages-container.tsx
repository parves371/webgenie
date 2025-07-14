import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MesssageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";

interface props {
  projectId: string;
}

export const MessagesContainer = ({ projectId }: props) => {
  const bottomref = useRef<HTMLDivElement>(null);
  const trpc = useTRPC();

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({
      projectId: projectId,
    })
  );

  useEffect(() => {
    const lastassistantMessage = messages.findLast((message) => {
      return message.role === "ASSISTANT";
    });

    if (lastassistantMessage) {
      // TODO:set Active Fragment
    }
  }, [messages]);

  useEffect(() => {
    bottomref.current?.scrollIntoView();
  }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="pt-2 pr-1">
          {messages.map((messages) => (
            <MesssageCard
              key={messages.id}
              content={messages.content}
              role={messages.role}
              fragment={messages.fragment}
              createdAt={messages.createdAt}
              isActiveFragment={false}
              onFragmentClick={() => {}}
              type={messages.type}
            />
          ))}
          <div ref={bottomref} />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background/70 pointer-events-none" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
};
