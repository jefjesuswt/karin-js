import { Schema, Prop } from "@karin-js/mongoose";

@Schema("Fox")
export class Fox {
  @Prop({ required: true, index: true })
  name: string;

  /*
  @Prop()
  age: number;

  @Prop({ default: Date.now })
  createdAt: Date;
  */
}
