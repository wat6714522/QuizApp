import { z } from "zod";

// Shared by every schema that takes an id from the request (attempt, quiz, course).
export const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
