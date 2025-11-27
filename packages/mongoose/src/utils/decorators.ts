import { inject } from "@karin-js/core";
import { getModelToken } from "./utils";

export function InjectModel(modelName: string) {
  return inject(getModelToken(modelName));
}

export function InjectConnection(name?: string) {
  return inject("MONGO_CONNECTION");
}
