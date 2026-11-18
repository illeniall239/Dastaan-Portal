import { describe, it, expect } from "vitest";
import { mustEvaluateOnUpload } from "./permissions";

describe("mustEvaluateOnUpload", () => {
  it("returns true for evaluator", () => {
    expect(mustEvaluateOnUpload("evaluator")).toBe(true);
  });

  it("returns true for programmer", () => {
    expect(mustEvaluateOnUpload("programmer")).toBe(true);
  });

  it("returns true for management", () => {
    expect(mustEvaluateOnUpload("management")).toBe(true);
  });

  it("returns true for executive", () => {
    expect(mustEvaluateOnUpload("executive")).toBe(true);
  });

  it("returns false for content_manager", () => {
    expect(mustEvaluateOnUpload("content_manager")).toBe(false);
  });

  it("returns false for content_creator", () => {
    expect(mustEvaluateOnUpload("content_creator")).toBe(false);
  });

  it("returns false for admin", () => {
    expect(mustEvaluateOnUpload("admin")).toBe(false);
  });

  it("returns false for unknown role", () => {
    expect(mustEvaluateOnUpload("viewer")).toBe(false);
  });
});
