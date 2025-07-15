import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Fragment } from "@/generated/prisma";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { useState } from "react";

interface Props {
  data: Fragment;
}

export const FragmentWeb = ({ data }: Props) => {
  const [fragmentKey, setFragmentKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(data.sanboxUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-2 border-b bg-sidebar flex items-center gap-x-2">
        <Hint text="Refresh" side="bottom" align="start">
          <Button size={"sm"} variant={"outline"} onClick={onRefresh}>
            <RefreshCcwIcon />
          </Button>
        </Hint>
        <Hint text="Copy URL" side="bottom" align="start">
          <Button
            size={"sm"}
            variant={"outline"}
            onClick={handleCopy}
            disabled={copied || !data.sanboxUrl}
            className="flex-1 justify-start text-start font-normal"
          >
            <span className="truncate">{data.sanboxUrl}</span>
          </Button>
        </Hint>
        <Hint text="Open in new tab" side="bottom" align="start">
          <Button
            size={"sm"}
            disabled={!data.sanboxUrl}
            variant={"outline"}
            onClick={() => {
              if (!data.sanboxUrl) return;
              window.open(data.sanboxUrl, "_blank");
            }}
          >
            <ExternalLinkIcon />
          </Button>
        </Hint>
      </div>

      <iframe
        key={fragmentKey}
        className="h-full w-full"
        sandbox="allow-forms allow-script allow-same-origine"
        loading="lazy"
        src={data.sanboxUrl}
      />
    </div>
  );
};
