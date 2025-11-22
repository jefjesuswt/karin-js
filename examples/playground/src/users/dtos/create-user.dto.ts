import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 letras"),
  email: z.email({ message: "Debe ser un email válido" }),
  age: z.number().min(18, "Debe ser mayor de edad"),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
