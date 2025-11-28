import mongoose from "mongoose";
import { PROP_METADATA } from "./decorators";

export class SchemaFactory {
  static createForClass(target: Function): mongoose.Schema {
    const props = Reflect.getMetadata(PROP_METADATA, target.prototype);

    if (!props) {
      return new mongoose.Schema({});
    }

    const schema = new mongoose.Schema(props, {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    });

    return schema;
  }
}
