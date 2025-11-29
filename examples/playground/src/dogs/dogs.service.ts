import { Service } from "@karin-js/core";
import { ConfigService } from "@karin-js/config";
import { type CreateDogsDto } from "./dtos/create-dogs.dto";
import { type UpdateDogsDto } from "./dtos/update-dogs.dto";

@Service()
export class DogsService {
  constructor(private readonly config: ConfigService) { }

  // private items = []; // Mock DB

  create(data: CreateDogsDto) {
    return { id: Math.floor(Math.random() * 1000), ...data };
  }

  findAll() {
    // 💡 Aquí usamos la variable de entorno específica para este servicio
    // Si DOG_NAME no existe, fallará aquí (o devolverá undefined si usamos get sin validación)
    // Pero como no la declaramos en el main.ts, no se validó al inicio.
    const dogName = this.config.get("DOG_NAME");
    return `This action returns all dogs. Special dog: ${dogName}`;
  }

  findOne(id: string) {
    return `This action returns a #${id} dogs`;
  }

  update(id: string, data: UpdateDogsDto) {
    return `This action updates a #${id} dogs`;
  }

  remove(id: string) {
    return `This action removes a #${id} dogs`;
  }
}
