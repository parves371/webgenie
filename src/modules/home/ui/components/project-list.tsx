"use client";

import { Button } from "@/components/ui/button";
import { PROJECT_NAME } from "@/constant";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";

export const ProjectList = () => {
  const trpc = useTRPC();
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());

  return (
    <div className="w-full bg-white dark:bg-sidebar rounded-xl p-8 border flex flex-col gap-y-6 sm:gap-y-4">
      <h2 className="text-2xl font-semibold">Previus {PROJECT_NAME}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {projects?.length === 0 && (
          <p className="text-sm text-muted-foreground">NO Project found</p>
        )}
        {projects?.map((project) => (
          <Button
            variant={"outline"}
            className="font-normal h-auto justify-start w-full text-start p-4"
            key={project.id}
            asChild
          >
            <Link href={`projects/${project.id}`}>
              <div className="flex items-center gap-x-4">
                <Image
                  src={"/logo.svg"}
                  alt={PROJECT_NAME}
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <div className="flex flex-col">
                  <h3 className="truncate font-medium">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(project.updatedAt, {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
};
