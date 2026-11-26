import { parseObjectId } from "@/app/lib/params";
import { errorResponse } from "@/app/lib/utils";
import { isEnrolled } from "@/app/lib/courses";

export async function quizAccess(db, session, quiz) {
  if (quiz.ownerId.toString() === session.userId) return "owner";

  const now = new Date();

  const isOpen = quiz.status === "published" && (!quiz.opensAt || quiz.opensAt <= now) && (!quiz.closesAt || quiz.closesAt > now);

  if (!isOpen) return null;

  return (await isEnrolled(db, session, quiz.courseId)) ? "reader" : null;
}

// Reads ?quizId=… and returns { id, response } like the other guards.
export async function getQuizId(request) {
  const id = await parseObjectId({ quizId: request.nextUrl.searchParams.get("quizId") }, "quizId");

  if (!id) return { id: null, response: errorResponse("Invalid or missing quizId", 400) };

  return { id, response: null };
}

export const READER_PROJECTION = { correctAnswer: 0, explanation: 0 };
