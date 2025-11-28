import { z } from "zod";

export const CreateFoxesSchema = z.object({
  name: z.string().min(1, "Name is required"),

});

export type CreateFoxesDto = z.infer<typeof CreateFoxesSchema>;
