import { Schema, Prop } from "@karin-js/mongoose";

@Schema("Cat")
export class Cat {
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  age: number;

  @Prop({ required: true })
  breed: string;

  @Prop({ default: false })
  isAdopted: boolean;
}
