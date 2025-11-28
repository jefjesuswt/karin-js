import { describe, it, expect } from "bun:test";
import { getModelToken, getConnectionToken } from "../src/utils/utils";

describe("Mongoose Utils", () => {
    describe("getModelToken", () => {
        it("should return the correct token for a model name", () => {
            expect(getModelToken("User")).toBe("MONGO_MODEL_USER");
            expect(getModelToken("Product")).toBe("MONGO_MODEL_PRODUCT");
        });
    });

    describe("getConnectionToken", () => {
        it("should return the default connection token if no name provided", () => {
            expect(getConnectionToken()).toBe("MONGO_CONNECTION");
        });

        it("should return a named connection token if name provided", () => {
            expect(getConnectionToken("primary")).toBe("MONGO_CONN_PRIMARY");
        });
    });
});
