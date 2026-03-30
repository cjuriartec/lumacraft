import { IAuthProvider } from '@/modules/auth/domain/ports/auth-provider.port'
import { Result } from '@/shared/domain/result'

export class SignInWithGoogleUseCase {
  constructor(private authProvider: IAuthProvider) {}

  public async execute(): Promise<Result<void>> {
    return this.authProvider.signInWithGoogle()
  }
}
