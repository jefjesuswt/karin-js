import { z } from "zod";
import { CreateFoxesSchema } from "./create-foxes.dto";

export const UpdateFoxesSchema = CreateFoxesSchema.partial();

export type UpdateFoxesDto = z.infer<typeof UpdateFoxesSchema>;
