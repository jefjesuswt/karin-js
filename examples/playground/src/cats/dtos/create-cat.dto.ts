import { z } from "zod";

export const CreateCatSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),

  age: z.coerce.number().min(0, "La edad no puede ser negativa"),

  breed: z.string().min(1, "La raza es obligatoria"),

  isAdopted: z.coerce.boolean().optional().default(false),
});

export type CreateCatDto = z.infer<typeof CreateCatSchema>;
