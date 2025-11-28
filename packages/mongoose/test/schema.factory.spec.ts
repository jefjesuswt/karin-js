import "reflect-metadata";
import { describe, it, expect, mock } from "bun:test";
import { SchemaFactory } from "../src/utils/schema.factory";
import { Prop } from "../src/utils/decorators";
import mongoose from "mongoose";

// Mock Mongoose
mock.module("mongoose", () => {
    return {
        default: {
            Schema: class MockSchema {
                constructor(public definition: any, public options: any) { }
            },
        },
    };
});

class TestClass {
    @Prop({ required: true })
    name!: string;

    @Prop()
    age!: number;
}

class EmptyClass { }

describe("SchemaFactory", () => {
    it("should create a schema from a decorated class", () => {
        const schema = SchemaFactory.createForClass(TestClass) as any;

        expect(schema).toBeInstanceOf(mongoose.Schema);
        expect(schema.definition).toEqual({
            name: { required: true, type: expect.any(Function) }, // String
            age: { type: expect.any(Function) }, // Number
        });
        expect(schema.options).toEqual({
            timestamps: true,
            toJSON: { virtuals: true },
            toObject: { virtuals: true },
        });
    });

    it("should create an empty schema for a class with no props", () => {
        const schema = SchemaFactory.createForClass(EmptyClass) as any;

        expect(schema).toBeInstanceOf(mongoose.Schema);
        expect(schema.definition).toEqual({});
    });
});
