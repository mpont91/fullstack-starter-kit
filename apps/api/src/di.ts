import { settings } from './settings'
import { prisma } from './infrastructure/persistence/prisma'
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user-repository'
import { PrismaMetricsRepository } from './infrastructure/persistence/prisma-metrics-repository'
import { PrismaPasswordResetTokenRepository } from './infrastructure/persistence/prisma-password-reset-token-repository'
import { PrismaRevokedTokenRepository } from './infrastructure/persistence/prisma-revoked-token-repository'
import { PrismaAdminActionRepository } from './infrastructure/persistence/prisma-admin-action-repository'
import { BcryptPasswordHasher } from './infrastructure/auth/bcrypt-password-hasher'
import { JwtTokenService } from './infrastructure/auth/jwt-token-service'
import { CryptoOneTimeTokenService } from './infrastructure/auth/crypto-one-time-token-service'
import { GoogleAuthLibraryVerifier } from './infrastructure/auth/google-auth-library-verifier'
import { ResendEmailSender } from './infrastructure/email/resend-email-sender'
import { SentryErrorReporter } from './infrastructure/monitoring/sentry-error-reporter'
import { UserRepository } from './domain/ports/user-repository'
import { MetricsRepository } from './domain/ports/metrics-repository'
import { PasswordResetTokenRepository } from './domain/ports/password-reset-token-repository'
import { RevokedTokenRepository } from './domain/ports/revoked-token-repository'
import { AdminActionRepository } from './domain/ports/admin-action-repository'
import { OneTimeTokenService } from './domain/ports/one-time-token-service'
import { GoogleIdentityVerifier } from './domain/ports/google-identity-verifier'
import { EmailSender } from './domain/ports/email-sender'
import { PasswordHasher } from './domain/ports/password-hasher'
import { TokenService } from './domain/ports/token-service'
import { ErrorReporter } from './domain/ports/error-reporter'
import { RegisterUseCase } from './application/register-use-case'
import { LoginUseCase } from './application/login-use-case'
import { GoogleSignInUseCase } from './application/google-sign-in-use-case'
import { GetMeUseCase } from './application/get-me-use-case'
import { UpdateUserLanguageUseCase } from './application/update-user-language-use-case'
import { DeleteAccountUseCase } from './application/delete-account-use-case'
import { VerificationEmailService } from './application/verification-email-service'
import { VerifyEmailUseCase } from './application/verify-email-use-case'
import { ResendVerificationUseCase } from './application/resend-verification-use-case'
import { AuthenticateUseCase } from './application/authenticate-use-case'
import { LogoutUseCase } from './application/logout-use-case'
import { ChangePasswordUseCase } from './application/change-password-use-case'
import { RequestPasswordResetUseCase } from './application/request-password-reset-use-case'
import { ResetPasswordUseCase } from './application/reset-password-use-case'
import { GetPasswordResetEmailUseCase } from './application/get-password-reset-email-use-case'
import { AuthorizeAdminUseCase } from './application/authorize-admin-use-case'
import { ListUsersUseCase } from './application/list-users-use-case'
import { DeleteUserUseCase } from './application/delete-user-use-case'
import { GetMetricsUseCase } from './application/get-metrics-use-case'

export class Container {
  static getUserRepository(): UserRepository {
    return new PrismaUserRepository(prisma)
  }

  static getMetricsRepository(): MetricsRepository {
    return new PrismaMetricsRepository(prisma)
  }

  static getPasswordResetTokenRepository(): PasswordResetTokenRepository {
    return new PrismaPasswordResetTokenRepository(prisma)
  }

  static getRevokedTokenRepository(): RevokedTokenRepository {
    return new PrismaRevokedTokenRepository(prisma)
  }

  static getAdminActionRepository(): AdminActionRepository {
    return new PrismaAdminActionRepository(prisma)
  }

  static getOneTimeTokenService(): OneTimeTokenService {
    return new CryptoOneTimeTokenService()
  }

  static getErrorReporter(): ErrorReporter {
    return new SentryErrorReporter()
  }

  static getEmailSender(): EmailSender {
    return new ResendEmailSender(settings.email)
  }

  static getPasswordHasher(): PasswordHasher {
    return new BcryptPasswordHasher(settings.auth.bcryptRounds)
  }

  static getTokenService(): TokenService {
    return new JwtTokenService(
      settings.auth.jwtSecret,
      settings.auth.jwtExpiresIn,
    )
  }

  static getGoogleIdentityVerifier(): GoogleIdentityVerifier {
    return new GoogleAuthLibraryVerifier(settings.auth.googleClientId)
  }

  static getVerificationEmailService(): VerificationEmailService {
    return new VerificationEmailService(
      this.getUserRepository(),
      this.getOneTimeTokenService(),
      this.getEmailSender(),
      settings.frontendUrl,
    )
  }

  static getRegisterUseCase(): RegisterUseCase {
    return new RegisterUseCase(
      this.getUserRepository(),
      this.getPasswordHasher(),
      this.getVerificationEmailService(),
      this.getErrorReporter(),
    )
  }

  static getVerifyEmailUseCase(): VerifyEmailUseCase {
    return new VerifyEmailUseCase(
      this.getUserRepository(),
      this.getOneTimeTokenService(),
      this.getTokenService(),
    )
  }

  static getResendVerificationUseCase(): ResendVerificationUseCase {
    return new ResendVerificationUseCase(
      this.getUserRepository(),
      this.getVerificationEmailService(),
    )
  }

  static getLoginUseCase(): LoginUseCase {
    return new LoginUseCase(
      this.getUserRepository(),
      this.getPasswordHasher(),
      this.getTokenService(),
    )
  }

  static getGoogleSignInUseCase(): GoogleSignInUseCase {
    return new GoogleSignInUseCase(
      this.getUserRepository(),
      this.getGoogleIdentityVerifier(),
      this.getTokenService(),
    )
  }

  static getGetMeUseCase(): GetMeUseCase {
    return new GetMeUseCase(this.getUserRepository())
  }

  static getUpdateUserLanguageUseCase(): UpdateUserLanguageUseCase {
    return new UpdateUserLanguageUseCase(this.getUserRepository())
  }

  static getAuthenticateUseCase(): AuthenticateUseCase {
    return new AuthenticateUseCase(
      this.getTokenService(),
      this.getRevokedTokenRepository(),
      this.getUserRepository(),
    )
  }

  static getLogoutUseCase(): LogoutUseCase {
    return new LogoutUseCase(this.getRevokedTokenRepository())
  }

  static getChangePasswordUseCase(): ChangePasswordUseCase {
    return new ChangePasswordUseCase(
      this.getUserRepository(),
      this.getPasswordHasher(),
      this.getTokenService(),
    )
  }

  static getDeleteAccountUseCase(): DeleteAccountUseCase {
    return new DeleteAccountUseCase(
      this.getUserRepository(),
      this.getPasswordHasher(),
      this.getGoogleIdentityVerifier(),
    )
  }

  static getRequestPasswordResetUseCase(): RequestPasswordResetUseCase {
    return new RequestPasswordResetUseCase(
      this.getUserRepository(),
      this.getPasswordResetTokenRepository(),
      this.getOneTimeTokenService(),
      this.getEmailSender(),
      settings.frontendUrl,
    )
  }

  static getResetPasswordUseCase(): ResetPasswordUseCase {
    return new ResetPasswordUseCase(
      this.getUserRepository(),
      this.getPasswordResetTokenRepository(),
      this.getOneTimeTokenService(),
      this.getPasswordHasher(),
      this.getTokenService(),
    )
  }

  static getGetPasswordResetEmailUseCase(): GetPasswordResetEmailUseCase {
    return new GetPasswordResetEmailUseCase(
      this.getUserRepository(),
      this.getPasswordResetTokenRepository(),
      this.getOneTimeTokenService(),
    )
  }

  static getAuthorizeAdminUseCase(): AuthorizeAdminUseCase {
    return new AuthorizeAdminUseCase(this.getUserRepository())
  }

  static getListUsersUseCase(): ListUsersUseCase {
    return new ListUsersUseCase(this.getUserRepository())
  }

  static getDeleteUserUseCase(): DeleteUserUseCase {
    return new DeleteUserUseCase(
      this.getUserRepository(),
      this.getAdminActionRepository(),
    )
  }

  static getGetMetricsUseCase(): GetMetricsUseCase {
    return new GetMetricsUseCase(this.getMetricsRepository())
  }
}
