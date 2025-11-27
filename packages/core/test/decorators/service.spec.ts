import "reflect-metadata";
import { describe, it, expect, beforeEach } from "bun:test";
import { container } from "tsyringe";
import { Service } from "../../src/decorators/service";

describe("@Service Decorator", () => {
  beforeEach(() => {
    container.reset();
  });

  it("should register the class as a singleton", () => {
    @Service()
    class TestService {
      public readonly id = Math.random();
      getId() {
        return this.id;
      }
    }

    const instance1 = container.resolve(TestService);
    const instance2 = container.resolve(TestService);

    expect(instance1).toBe(instance2);
    expect(instance1.getId()).toBe(instance2.getId());
  });
});
