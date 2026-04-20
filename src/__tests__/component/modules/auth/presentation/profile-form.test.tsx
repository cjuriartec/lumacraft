import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeUser } from "@/__tests__/factories/domain-factories";
import { ProfileForm } from "@/modules/auth/presentation/components/profile-form";
import { ok } from "@/shared/domain/result";

const mockUser = makeUser({ fullName: "Initial Name" });

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockUpdateProfile = vi.fn().mockResolvedValue(ok(undefined));
vi.mock("@/modules/auth/presentation/hooks/use-update-profile", () => ({
  useUpdateProfile: () => ({ updateProfile: mockUpdateProfile }),
}));

const mockUploadFile = vi.fn().mockResolvedValue(ok({ url: "https://new-avatar.png" }));
vi.mock("@/shared/presentation/hooks/use-upload-file", () => ({
  useUploadFile: () => ({ uploadFile: mockUploadFile }),
}));

describe("ProfileForm Component", () => {
  it("renders with initial user data", () => {
    render(<ProfileForm />);
    expect(screen.getByLabelText(/nombre completo/i)).toHaveValue("Initial Name");
    expect(screen.getByDisplayValue(mockUser.email.value)).toBeInTheDocument();
  });

  it("updates the profile name", async () => {
    render(<ProfileForm />);
    const input = screen.getByLabelText(/nombre completo/i);

    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.click(screen.getByText("Guardar Cambios"));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        fullName: "New Name",
        avatarUrl: mockUser.avatarUrl,
      });
    });
  });

  it("uploads a new avatar when selected", async () => {
    render(<ProfileForm />);
    const file = new File(["hello"], "hello.png", { type: "image/png" });
    const input = screen.getByLabelText(/seleccionar avatar/i);

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Guardar Cambios"));

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, "avatars", mockUser.id);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        fullName: "Initial Name",
        avatarUrl: "https://new-avatar.png",
      });
    });
  });
});
