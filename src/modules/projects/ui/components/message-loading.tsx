import Image from "next/image";
import { useEffect, useState } from "react";

const ShiimerMessages = () => {
  const messages = [
    "Thinking...",
    "Loading...",
    "Almost there...",
    "Building your response...",
    "Genrating your response...",
    "Loading your response...",
    "Optimiging layout...",
    "Adding finishing touches...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div>
      <span className="text-base text-primary-foreground animate-pulse">
        {messages[currentMessageIndex]}
      </span>
    </div>
  );
};

export const MessageLoading = () => {
  return (
    <div className="flex flex-col group px-2 pb-4">
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image src={"/logo.svg"} alt={"webGenie"} width={20} height={20} />
        <span>webGeine</span>
      </div>
      <div className="pl-8.5 flex-col flex gap-y-4">
        <ShiimerMessages />
      </div>
    </div>
  );
};
