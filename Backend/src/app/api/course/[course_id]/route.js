import { ObjectId } from "mongodb";
import { getClientPromise } from "@/app/lib/mongodb";
import { requireAuth, requireRole } from "@/app/lib/authentication/session";
import { parseObjectId } from "@/app/lib/params";
import { serializeCourse } from "@/app/lib/api";
import { loadOwnedCourse, loadRoster } from "@/app/lib/courses";
import { errorResponse, printExceptionLog, successResponse } from "@/app/lib/utils";
import { courseUpdateSchema } from "@/app/lib/validation/course";
import corsHeaders from "@/app/lib/cors";

export async function GET(request, { params }) {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const courseId = await parseObjectId(params, "course_id");
    if (!courseId) return errorResponse("Invalid course id", 400);

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const course = await db.collection("courses").findOne({ _id: courseId });
    if (!course) return errorResponse("Course not found", 404);

    const userId = new ObjectId(session.userId);
    const isOwner = course.ownerId.equals(userId);
    const enrolled = (course.studentIds ?? []).some((id) => id.equals(userId));

    // 404 rather than 403 so course ids can't be probed.
    if (!isOwner && !enrolled) return errorResponse("Course not found", 404);

    const students = isOwner ? await loadRoster(db, course.studentIds) : undefined;

    return successResponse(serializeCourse(course, students), 200);
  } catch (err) {
    printExceptionLog("GET /api/course/[course_id]", err);

    return errorResponse("Internal Server Error", 500);
  }
}

export async function PUT(request, { params }) {
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

    const parsed = courseUpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    const data = parsed.data;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);
    const courses = db.collection("courses");

    const { course, response: denied } = await loadOwnedCourse(db, courseId, session);
    if (denied) return denied;

    if (data.code && data.code !== course.code) {
      const taken = await courses.findOne({ ownerId: course.ownerId, code: data.code, _id: { $ne: courseId } }, { projection: { _id: 1 } });

      if (taken) return errorResponse(`You already have a course with code ${data.code}`, 409);
    }

    let updated;

    try {
      updated = await courses.findOneAndUpdate({ _id: courseId }, { $set: { ...data, updatedAt: new Date() } }, { returnDocument: "after" });
    } catch (err) {
      if (err.code === 11000) return errorResponse(`You already have a course with code ${data.code}`, 409);
      throw err;
    }

    if (!updated) return errorResponse("Course not found", 404);

    return successResponse(serializeCourse(updated, await loadRoster(db, updated.studentIds)), 200);
  } catch (err) {
    printExceptionLog("PUT /api/course/[course_id]", err);

    return errorResponse("Internal Server Error", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, response } = await requireRole("instructor");
    if (response) return response;

    const courseId = await parseObjectId(params, "course_id");
    if (!courseId) return errorResponse("Invalid course id", 400);

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);

    const { response: denied } = await loadOwnedCourse(db, courseId, session);
    if (denied) return denied;

    // Don't orphan quizzes — the teacher moves or deletes them first.
    const quizCount = await db.collection("quizzes").countDocuments({ courseId }, { limit: 1 });

    if (quizCount > 0) {
      return errorResponse("Move or delete this course's quizzes before deleting it", 409);
    }

    await db.collection("courses").deleteOne({ _id: courseId });

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (err) {
    printExceptionLog("DELETE /api/course/[course_id]", err);

    return errorResponse("Internal Server Error", 500);
  }
}
