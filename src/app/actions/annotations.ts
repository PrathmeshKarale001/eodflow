"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Prisma, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Add Annotation (pin on image with comment)
// ---------------------------------------------------------------------------

export async function addAnnotation(data: {
  taskId: string;
  fileId: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  content: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "addComment")) {
    throw new Error("FORBIDDEN: Cannot add annotations.");
  }

  // Count existing annotations for this file to auto-assign pin number
  const existingCount = await db.comment.count({
    where: {
      taskId: data.taskId,
      annotationData: { not: Prisma.JsonNull },
      AND: [
        {
          annotationData: {
            path: ["fileId"],
            equals: data.fileId,
          },
        },
      ],
    },
  });

  const pinNumber = existingCount + 1;

  const comment = await db.comment.create({
    data: {
      taskId: data.taskId,
      userId: session.user.id,
      content: data.content,
      annotationData: {
        x: data.x,
        y: data.y,
        fileId: data.fileId,
        pinNumber,
      },
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  // Activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      action: "COMMENTED",
      metadata: {
        type: "annotation",
        fileId: data.fileId,
        pinNumber,
        preview: data.content.substring(0, 80),
      },
    },
  });

  revalidatePath("/tasks");
  revalidatePath("/files");
  return comment;
}

// ---------------------------------------------------------------------------
// Get File Annotations
// ---------------------------------------------------------------------------

export async function getFileAnnotations(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const annotations = await db.comment.findMany({
    where: {
      annotationData: { not: Prisma.JsonNull },
      AND: [
        {
          annotationData: {
            path: ["fileId"],
            equals: fileId,
          },
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return annotations.map((a) => {
    const data = a.annotationData as {
      x: number;
      y: number;
      fileId: string;
      pinNumber: number;
    };
    return {
      id: a.id,
      taskId: a.taskId,
      content: a.content,
      x: data.x,
      y: data.y,
      pinNumber: data.pinNumber,
      user: a.user,
      createdAt: a.createdAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Delete Annotation
// ---------------------------------------------------------------------------

export async function deleteAnnotation(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, taskId: true },
  });

  if (!comment) throw new Error("Annotation not found");

  const isOwner = comment.userId === session.user.id;
  const isManager = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  if (!isOwner && !isManager) {
    throw new Error("FORBIDDEN: Cannot delete this annotation.");
  }

  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/tasks");
  revalidatePath("/files");
  return { success: true };
}
