export function serializeQuiz({ _id, ownerId, courseId, ...rest }) {
  return {
    id: _id.toString(),
    ownerId: ownerId.toString(),
    courseId: courseId ? courseId.toString() : null,
    ...rest,
  };
}

// studentEmails is pulled out too, in case a course from before the migration still has it.
// Pass `students` (from loadRoster) only for the course owner.
// eslint-disable-next-line no-unused-vars
export function serializeCourse({ _id, ownerId, studentIds, studentEmails, ...rest }, students) {
  return {
    id: _id.toString(),
    ownerId: ownerId.toString(),
    ...rest,
    studentCount: (studentIds ?? []).length,
    ...(students && { students }),
  };
}

export function serializeQuestion({ _id, quizId, ...rest }) {
  return { id: _id.toString(), quizId: quizId.toString(), ...rest };
}

export function serializeAttempt(a) {
  const { _id, quizId, studentId, answers, student, quiz, ...rest } = a;

  return {
    ...rest,
    id: _id.toString(),
    quizId: quizId.toString(),
    studentId: studentId.toString(),
    ...(answers && {
      answers: answers.map(({ questionId, ...x }) => ({ ...x, questionId: questionId.toString() })),
    }),
    ...(student && { student: { id: student._id.toString(), name: student.name } }),
    ...(quiz && { quiz: { id: quiz._id.toString(), title: quiz.title } }),
  };
}
