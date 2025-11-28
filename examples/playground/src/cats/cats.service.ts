import { Service } from "@karin-js/core";
import { Model } from "mongoose";
import { Cat } from "./schemas/cat.schema";
import type { CreateCatDto } from "./dtos/create-cat.dto";
import { InjectModel } from "@karin-js/mongoose";

@Service()
export class CatsService {
  constructor(@InjectModel("Cat") private catModel: Model<Cat>) {}

  async create(createCatDto: CreateCatDto) {
    const createdCat = new this.catModel(createCatDto);
    return createdCat.save();
  }

  async findAll() {
    return this.catModel.find().exec();
  }

  async findOne(id: string) {
    return this.catModel.findById(id).exec();
  }
}
