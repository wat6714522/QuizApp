import { getClientPromise } from "@/app/lib/mongodb";
import { requireRole } from "@/app/lib/authentication/session";
import { parseObjectId } from "@/app/lib/params";
import { loadOwnedCourse, loadRoster } from "@/app/lib/courses";
import { errorResponse, printExceptionLog, successResponse } from "@/app/lib/utils";
import { addStudentSchema } from "@/app/lib/validation/course";

// POST { students: ["a@x.com", ...] } — enroll students by email; stores their user ids
export async function POST(request, { params }) {
  try {
    const { session, response } = await requireRole("instructor");
    if (response) return response;

    const courseId = await parseObjectId(params, "course_id");
    if (!courseId) return errorResponse("Invalid course id", 400);

    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = addStudentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    const { students: emails } = parsed.data;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const { response: denied } = await loadOwnedCourse(db, courseId, session);
    if (denied) return denied;

    // Emails are stored lowercase, and the schema lowercases the input, so an exact match works.
    const students = await db
      .collection("users")
      .find({ email: { $in: emails }, role: "student" }, { projection: { email: 1 } })
      .toArray();

    const found = new Set(students.map((s) => s.email));
    const missing = emails.filter((e) => !found.has(e));

    if (missing.length) {
      return errorResponse(`No student account found for: ${missing.join(", ")}`, 404);
    }

    const updated = await db.collection("courses").findOneAndUpdate(
      { _id: courseId },
      {
        $addToSet: { studentIds: { $each: students.map((s) => s._id) } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after", projection: { studentIds: 1 } },
    );

    if (!updated) return errorResponse("Course not found", 404);

    return successResponse({ students: await loadRoster(db, updated.studentIds) }, 200);
  } catch (err) {
    printExceptionLog("POST /api/course/[course_id]/student", err);

    return errorResponse("Internal Server Error", 500);
  }
}
