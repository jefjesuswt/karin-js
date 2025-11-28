import { Schema, Prop } from "@karin-js/mongoose";

@Schema("Dogs")
export class Dogs {
  @Prop({ required: true, index: true })
  name: string;

  /*
  @Prop()
  age: number;

  @Prop({ default: Date.now })
  createdAt: Date;
  */
}
