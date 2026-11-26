"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { allQuizzes, api, availability, message, type Course, type Quiz } from "../../_lib/api";
import { useSession } from "../../_lib/use-session";
import { StudentRoster } from "../../_components/student-roster";
import {
  Workspace,
  Badge,
  Empty,
  Field,
  Loading,
  Notice,
  card,
  danger,
  input,
  primary,
  secondary,
} from "../../_components/workspace";

export default function CoursePage() {
  const { courseId } = useParams<{ courseId: string }>();

  return <CourseDetails key={courseId} courseId={courseId} />;
}

function CourseDetails({ courseId }: { courseId: string }) {
  const router = useRouter();
  const session = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session.user) return;
    const controller = new AbortController();

    Promise.all([
      api<Course>(`/api/course/${courseId}`, { signal: controller.signal }),
      allQuizzes(controller.signal),
    ])
      .then(([data, items]) => {
        if (controller.signal.aborted) return;
        setCourse(data);
        setQuizzes(items.filter((quiz) => quiz.courseId === courseId));
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(message(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [session.user, courseId]);

  const owner = session.user?.role === "instructor" && course?.ownerId === session.user.id;

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!code.trim() || !name.trim()) {
      setError("Course code and name are required.");

      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const updated = await api<Course>(`/api/course/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      });

      setCourse(updated);
      setEditing(false);
      setSuccess("Course saved.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteCourse() {
    if (
      busy ||
      !course ||
      !window.confirm(`Delete "${course.code}"? Its students will lose access to it.`)
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await api<void>(`/api/course/${courseId}`, { method: "DELETE" });
      router.push("/web-page/courses");
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <Workspace
      session={session}
      active="courses"
      title={course ? `${course.code} · ${course.name}` : "Course"}
      description={
        owner
          ? "Add students and see the quizzes in this course."
          : "Published quizzes in this course."
      }
    >
      <div className="mb-5 flex flex-wrap gap-3">
        <Link className={secondary} href="/web-page/courses">
          Back to Courses
        </Link>
      </div>
      <div className="mb-5 space-y-3">
        <Notice>{error}</Notice>
        <Notice good>{success}</Notice>
      </div>
      {loading ? (
        <Loading />
      ) : (
        course && (
          <>
            {owner && (
              <section className={`${card} mb-6`}>
                {editing ? (
                  <form onSubmit={saveCourse} className="space-y-4">
                    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-[200px_1fr]">
                      <Field label="Course code">
                        <input
                          className={input}
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
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          minLength={10}
                          maxLength={120}
                        />
                      </Field>
                    </fieldset>
                    <div className="flex flex-wrap gap-3">
                      <button className={primary} disabled={busy}>
                        {busy ? "Saving..." : "Save Course"}
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        disabled={busy}
                        onClick={() => setEditing(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={secondary}
                      disabled={busy}
                      onClick={() => {
                        setCode(course.code);
                        setName(course.name);
                        setEditing(true);
                        setSuccess("");
                      }}
                    >
                      Edit Course
                    </button>
                    <button className={danger} disabled={busy} onClick={deleteCourse}>
                      Delete Course
                    </button>
                  </div>
                )}
              </section>
            )}
            {owner && <StudentRoster courseId={course.id} initial={course.students ?? []} />}
            <h2 className="mb-4 text-xl font-semibold">Quizzes</h2>
            {quizzes.length === 0 ? (
              <Empty>
                {owner
                  ? "No quizzes in this course yet. Create one from My Quizzes and pick this course."
                  : "No published quizzes in this course yet."}
              </Empty>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {quizzes.map((quiz) => (
                  <article className={card} key={quiz.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-orange-600">{quiz.subject}</span>
                      <Badge>{availability(quiz)}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{quiz.title}</h3>
                    <div className="mt-4">
                      <Link className={primary} href={`/web-page/quizzes/${quiz.id}`}>
                        {owner ? "Manage Quiz" : "View Quiz"}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )
      )}
    </Workspace>
  );
}
