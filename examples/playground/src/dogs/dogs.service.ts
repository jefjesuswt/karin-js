import { Service } from "@karin-js/core";
import { type CreateDogsDto } from "./dtos/create-dogs.dto";
import { type UpdateDogsDto } from "./dtos/update-dogs.dto";

@Service()
export class DogsService {
  // private items = []; // Mock DB

  create(data: CreateDogsDto) {
    return { id: Math.floor(Math.random() * 1000), ...data };
  }

  findAll() {
    return "This action returns all dogs";
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
