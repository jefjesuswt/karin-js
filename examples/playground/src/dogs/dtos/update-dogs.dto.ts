import { z } from "zod";
import { CreateDogsSchema } from "./create-dogs.dto";

export const UpdateDogsSchema = CreateDogsSchema.partial();

export type UpdateDogsDto = z.infer<typeof UpdateDogsSchema>;
