import { ObjectId } from "mongodb";
import { getClientPromise } from "@/app/lib/mongodb";
import { requireAuth, requireRole } from "@/app/lib/authentication/session";
import { serializeCourse } from "@/app/lib/api";
import { errorResponse, printExceptionLog, successResponse } from "@/app/lib/utils";
import { courseCreateSchema } from "@/app/lib/validation/course";

export async function GET() {
  try {
    const { session, response } = await requireAuth();
    if (response) return response;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);
    const userId = new ObjectId(session.userId);

    // Instructors see the courses they own; students see the courses they're enrolled in.
    const filter = session.role === "instructor" ? { ownerId: userId } : { studentIds: userId };

    const courses = await db.collection("courses").find(filter).sort({ code: 1 }).toArray();

    // Wrapped so map's index argument isn't passed as `students`.
    return successResponse(
      courses.map((c) => serializeCourse(c)),
      200,
    );
  } catch (err) {
    printExceptionLog("GET /api/course", err);

    return errorResponse("Internal Server Error", 500);
  }
}

export async function POST(request) {
  try {
    const { session, response } = await requireRole("instructor");
    if (response) return response;

    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = courseCreateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);
    const data = parsed.data;

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME);
    const courses = db.collection("courses");

    const now = new Date();

    const course = {
      code: data.code,
      name: data.name,
      ownerId: new ObjectId(session.userId), // from the session, never the body
      studentIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const taken = await courses.findOne({ ownerId: course.ownerId, code: course.code }, { projection: { _id: 1 } });
    if (taken) return errorResponse(`You already have a course with code ${course.code}`, 409);

    try {
      await courses.insertOne(course); // adds course._id
    } catch (err) {
      if (err.code === 11000) return errorResponse(`You already have a course with code ${course.code}`, 409);
      throw err;
    }

    return successResponse(serializeCourse(course, []), 201);
  } catch (err) {
    printExceptionLog("POST /api/course", err);

    return errorResponse("Internal Server Error", 500);
  }
}
