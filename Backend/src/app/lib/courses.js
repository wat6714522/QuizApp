import { ObjectId } from "mongodb";
import { errorResponse } from "@/app/lib/utils";

// Courses store enrolled students as user ids (studentIds), so enrollment
// never depends on how an email was typed.

export async function enrolledCourseIds(db, session) {
  const courses = await db
    .collection("courses")
    .find({ studentIds: new ObjectId(session.userId) }, { projection: { _id: 1 } })
    .toArray();

  return courses.map((c) => c._id);
}

export async function isEnrolled(db, session, courseId) {
  if (!courseId) return false;

  const count = await db.collection("courses").countDocuments({ _id: courseId, studentIds: new ObjectId(session.userId) }, { limit: 1 });

  return count > 0;
}

// For instructor-only routes. Returns { course, response } like the other guards.
export async function loadOwnedCourse(db, courseId, session) {
  const course = await db.collection("courses").findOne({ _id: courseId });

  if (!course) return { course: null, response: errorResponse("Course not found", 404) };

  if (course.ownerId.toString() !== session.userId) {
    return { course: null, response: errorResponse("You can only manage your own courses", 403) };
  }

  return { course, response: null };
}

// Turns stored student ids into { id, name, email } for the teacher's roster.
// Accounts that were deleted simply drop out of the list.
export async function loadRoster(db, studentIds = []) {
  if (studentIds.length === 0) return [];

  const users = await db
    .collection("users")
    .find({ _id: { $in: studentIds } }, { projection: { name: 1, email: 1 } })
    .sort({ name: 1 })
    .toArray();

  return users.map((u) => ({ id: u._id.toString(), name: u.name, email: u.email }));
}
