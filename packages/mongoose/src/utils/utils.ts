export function getModelToken(modelName: string): string {
  return `MONGO_MODEL_${modelName.toUpperCase()}`;
}

export function getConnectionToken(connectionName?: string): string {
  return connectionName
    ? `MONGO_CONN_${connectionName.toUpperCase()}`
    : "MONGO_CONNECTION";
}
