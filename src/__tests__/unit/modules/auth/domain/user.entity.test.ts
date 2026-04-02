import { describe, expect, it } from "vitest";

import { User } from "@/modules/auth/domain/entities/user.entity";

describe("User Entity", () => {
  it("should create a valid user", () => {
    const userResult = User.create({
      id: "123",
      email: "test@example.com",
      fullName: "Test User",
      avatarUrl: "https://example.com/avatar.png",
    });

    if (!userResult.ok) throw userResult.error;
    const user = userResult.value;

    expect(user.id).toBe("123");
    expect(user.email.value).toBe("test@example.com");
    expect(user.fullName).toBe("Test User");
    expect(user.avatarUrl).toBe("https://example.com/avatar.png");
  });
});
