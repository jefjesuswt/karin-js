export const toPascalCase = (str: string) =>
  str
    .replace(/[-_]+/g, " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) =>
      word.toUpperCase()
    )
    .replace(/\s+/g, "");

export const toKebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

export const removeSuffix = (name: string, suffix: string) => {
  const regex = new RegExp(`${suffix}$`, "i");
  return name.replace(regex, "");
};
