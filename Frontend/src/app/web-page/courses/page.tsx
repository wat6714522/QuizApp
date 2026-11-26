"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api, message, type Course } from "../_lib/api";
import { useSession } from "../_lib/use-session";
import {
  Workspace,
  Empty,
  Field,
  Loading,
  Notice,
  card,
  input,
  primary,
  secondary,
} from "../_components/workspace";

export default function CoursesPage() {
  const session = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const instructor = session.user?.role === "instructor";

  useEffect(() => {
    if (!session.user) return;
    const controller = new AbortController();

    api<Course[]>("/api/course", { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setCourses(items);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(message(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [session.user]);

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!code.trim() || !name.trim()) {
      setFormError("Course code and name are required.");

      return;
    }

    setBusy(true);
    setFormError("");

    try {
      const course = await api<Course>("/api/course", {
        method: "POST",
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });

      setCourses((items) => [...items, course].sort((a, b) => a.code.localeCompare(b.code)));
      setCode("");
      setName("");
      setCreating(false);
    } catch (err) {
      setFormError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace
      session={session}
      active="courses"
      title="My Courses"
      description={
        instructor
          ? "Create courses and add students. Students only see quizzes from their courses."
          : "Courses you are enrolled in. Their published quizzes appear under Available Quizzes."
      }
    >
      {instructor && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button className={primary} onClick={() => setCreating((value) => !value)}>
            {creating ? "Hide Form" : "New Course"}
          </button>
        </div>
      )}
      {creating && instructor && (
        <section className={`${card} mb-6`}>
          <h2 className="mb-5 text-xl font-semibold">Create Course</h2>
          <form onSubmit={createCourse} className="space-y-4">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Course code">
                <input
                  className={input}
                  placeholder="CSX4107"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  minLength={7}
                  maxLength={20}
                />
              </Field>
              <Field label="Course name">
                <input
                  className={input}
                  placeholder="Web Application Development"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={10}
                  maxLength={120}
                />
              </Field>
            </fieldset>
            <Notice>{formError}</Notice>
            <div className="flex flex-wrap gap-3">
              <button className={primary} disabled={busy}>
                {busy ? "Creating..." : "Create Course"}
              </button>
              <button
                type="button"
                className={secondary}
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <div className="mb-5">
        <Notice>{error}</Notice>
      </div>
      {loading ? (
        <Loading />
      ) : courses.length === 0 ? (
        <Empty>
          {instructor
            ? "Create your first course, then add students to it."
            : "You are not in any course yet. Ask your instructor to add your email."}
        </Empty>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <article className={card} key={course.id}>
              <span className="text-xs font-medium text-orange-600">{course.code}</span>
              <h2 className="mt-2 text-xl font-semibold">{course.name}</h2>
              {instructor && (
                <p className="mt-2 text-sm text-stone-500">{course.studentCount} students</p>
              )}
              <div className="mt-5">
                <Link className={primary} href={`/web-page/courses/${course.id}`}>
                  {instructor ? "Manage Course" : "View Course"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </Workspace>
  );
}
