import { Result } from "@/shared/domain/result";

import { User } from "../entities/user.entity";

export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface IAuthProvider {
  signInWithGoogle(): Promise<Result<void>>;
  signOut(): Promise<Result<void>>;
  getCurrentUser(): Promise<Result<User | null>>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}
