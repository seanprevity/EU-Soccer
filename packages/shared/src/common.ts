import { z } from "zod";

// Body of every intentional error response (400, 404...). 
export const apiErrorSchema = z.object({ error: z.string() });
export type ApiError = z.infer<typeof apiErrorSchema>;

// A positive integer id in the URL path: /matches/odds/:id 
export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ?ids=12,15,31 -> [12, 15, 31]. Shared by every route that takes a list of ids.
export const idListSchema = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== ""),
  )
  .pipe(z.array(z.coerce.number<string>().int().positive()).min(1).max(300));

// ?page=0 is the first page; missing means 0.
export const pageSchema = z.coerce.number().int().min(0).default(0);

export type IdParams = z.infer<typeof idParamsSchema>;
