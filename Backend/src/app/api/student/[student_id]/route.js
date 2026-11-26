import { getClientPromise } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/authentication/session";
import { parseObjectId } from "@/app/lib/params";
import { loadOwnedCourse, loadRoster } from "@/app/lib/courses";
import { errorResponse, printExceptionLog, successResponse } from "@/app/lib/utils";

// DELETE — remove one student from the course
export async function DELETE(request, { params }) {
  try {
    const { session, response } = await requireRole("instructor");
    if (response) return response;

    const courseId = await parseObjectId(params, "course_id");
    if (!courseId) return errorResponse("Invalid course id", 400);

    const studentId = await parseObjectId(params, "student_id");
    if (!studentId) return errorResponse("Invalid student id", 400);

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const { response: denied } = await loadOwnedCourse(db, courseId, session);
    if (denied) return denied;

    // Removing someone who isn't enrolled is a no-op, so a double click is harmless.
    const updated = await db.collection("courses").findOneAndUpdate(
      { _id: courseId },
      {
        $pull: { studentIds: studentId },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after", projection: { studentIds: 1 } },
    );

    if (!updated) return errorResponse("Course not found", 404);

    return successResponse({ students: await loadRoster(db, updated.studentIds ?? []) }, 200);
  } catch (err) {
    printExceptionLog("DELETE /api/course/[course_id]/student/[student_id]", err);

    return errorResponse("Internal Server Error", 500);
  }
}
