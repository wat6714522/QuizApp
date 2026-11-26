"use client";

import { type FormEvent, useState } from "react";
import { api, message, type Student } from "../_lib/api";
import { card, danger, Empty, input, Notice, primary } from "./workspace";

export function StudentRoster({ courseId, initial }: { courseId: string; initial: Student[] }) {
  const [students, setStudents] = useState(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const emails = text.split(/[\s,;]+/).filter(Boolean);
    if (!emails.length || busy) return;
    setBusy("add");
    setError("");

    try {
      const data = await api<{ students: Student[] }>(`/api/student/${courseId}`, {
        method: "POST",
        body: JSON.stringify({ students: emails }),
      });

      setStudents(data.students);
      setText("");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  }

  async function remove(student: Student) {
    if (busy || !window.confirm(`Remove ${student.name} (${student.email}) from this course?`))
      return;
    setBusy(student.id);
    setError("");

    try {
      const data = await api<{ students: Student[] }>(
        `/api/course/${courseId}/student/${student.id}`,
        { method: "DELETE" },
      );

      setStudents(data.students);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className={`${card} mb-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Students</h2>
        <span className="text-sm text-stone-500">{students.length} enrolled</span>
      </div>
      <form onSubmit={add} className="mb-4 space-y-3">
        <textarea
          aria-label="Student emails"
          className={input}
          rows={3}
          placeholder="student1@example.com, student2@example.com"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-stone-500">
          Separate emails with commas, spaces, or new lines. Students must already have an account.
          Up to 40 at a time.
        </p>
        <button className={primary} disabled={!text.trim() || Boolean(busy)}>
          {busy === "add" ? "Adding..." : "Add Students"}
        </button>
      </form>
      <div className="mb-4">
        <Notice>{error}</Notice>
      </div>
      {students.length === 0 ? (
        <Empty>No students yet. Only students in this course can see its quizzes.</Empty>
      ) : (
        <ul className="divide-y divide-stone-200">
          {students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{student.name}</span>
                <span className="block break-all text-stone-500">{student.email}</span>
              </span>
              <button className={danger} disabled={Boolean(busy)} onClick={() => remove(student)}>
                {busy === student.id ? "Removing..." : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
