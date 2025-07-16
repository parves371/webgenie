import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import z from "zod";
import { generateSlug } from "random-word-slugs";
import { TRPCError } from "@trpc/server";
export const projectsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, "Message cannot be empty")
          .max(10000, "prompt is too long"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const createdProject = await prisma.project.create({
        data: {
          name: generateSlug(2, {
            format: "kebab",
          }),
          useerId: ctx.auth.userId,
          messages: {
            create: {
              content: input.value,
              role: "USER",
              type: "RESULT",
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: createdProject.id,
        },
      });

      return createdProject;
    }),
  getOne: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "projectId is required"),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.auth.userId;
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          useerId: userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.userId;

    const projects = await prisma.project.findMany({
      where:{
        useerId: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return projects;
  }),
});
