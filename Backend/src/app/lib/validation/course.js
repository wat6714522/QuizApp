import { z } from "zod";
import { objectIdString } from "@/app/lib/validation/common";

const code = z.string().trim().toUpperCase().min(7, "Please enter a valid course code").max(20, "Course code is too long");
const name = z.string().trim().min(10, "Please enter a valid course name").max(120, "Course name is too long");
const student = z.string().trim().toLowerCase().email("Invalid email address");

export const courseCreateSchema = z.object({ code, name }).strict();

export const courseUpdateSchema = z
  .object({ code, name })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update." });

// Teachers add students by email; the route resolves them to user ids.
export const addStudentSchema = z
  .object({
    courseId: objectIdString,
    students: z
      .array(student)
      .min(1, "Enter at least one student")
      .max(40, "Maximum of 40 students allowed")
      .transform((list) => [...new Set(list)]),
  })
  .strict();
