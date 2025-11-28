import { Service } from "@karin-js/core";
import { type CreateFoxesDto } from "./dtos/create-foxes.dto";
import { type UpdateFoxesDto } from "./dtos/update-foxes.dto";

@Service()
export class FoxesService {
  // private items = []; // Mock DB

  create(data: CreateFoxesDto) {
    return { id: Math.floor(Math.random() * 1000), ...data };
  }

  findAll() {
    return "This action returns all foxes";
  }

  findOne(id: string) {
    return `This action returns a #${id} foxes`;
  }

  update(id: string, data: UpdateFoxesDto) {
    return `This action updates a #${id} foxes`;
  }

  remove(id: string) {
    return `This action removes a #${id} foxes`;
  }
}
