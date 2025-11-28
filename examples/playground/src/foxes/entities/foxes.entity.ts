import { Schema, Prop } from "@karin-js/mongoose";

@Schema("Foxes")
export class Foxes {
  @Prop({ required: true, index: true })
  name: string;

  /*
  @Prop()
  age: number;

  @Prop({ default: Date.now })
  createdAt: Date;
  */
}
