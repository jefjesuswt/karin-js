import { z } from "zod";

export const CreateDogsSchema = z.object({
  name: z.string().min(1, "Name is required"),

});

export type CreateDogsDto = z.infer<typeof CreateDogsSchema>;
