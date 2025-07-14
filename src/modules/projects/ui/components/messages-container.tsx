import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MesssageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { useEffect, useRef } from "react";
import { Fragment } from "@/generated/prisma";
import { MessageLoading } from "./message-loading";

interface props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
}

export const MessagesContainer = ({
  projectId,
  activeFragment,
  setActiveFragment,
}: props) => {
  const bottomref = useRef<HTMLDivElement>(null);
  const trpc = useTRPC();

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({
      projectId: projectId,
    })
  );

  useEffect(() => {
    const lastassistantMessageWithFragment = messages.findLast((message) => {
      return message.role === "ASSISTANT" && message.fragment;
    });

    if (lastassistantMessageWithFragment) {
      setActiveFragment(lastassistantMessageWithFragment.fragment);
    }
  }, [messages, setActiveFragment]);

  useEffect(() => {
    bottomref.current?.scrollIntoView();
  }, [messages.length]);

  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.role === "USER";

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
              isActiveFragment={activeFragment?.id === messages.fragment?.id}
              onFragmentClick={() => setActiveFragment(messages.fragment)}
              type={messages.type}
            />
          ))}

          {isLastMessageUser && <MessageLoading />}
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
