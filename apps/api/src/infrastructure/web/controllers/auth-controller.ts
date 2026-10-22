import {
  changePasswordRequestSchema,
  deleteAccountRequestSchema,
  googleSignInRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  requestPasswordResetRequestSchema,
  resendVerificationRequestSchema,
  resetPasswordRequestSchema,
  updateLanguageRequestSchema,
  verifyEmailRequestSchema,
} from '@app/shared'
import { Request, Response } from 'express'
import { z } from 'zod'
import { RegisterUseCase } from '../../../application/register-use-case'
import { LoginUseCase } from '../../../application/login-use-case'
import { GoogleSignInUseCase } from '../../../application/google-sign-in-use-case'
import { GetMeUseCase } from '../../../application/get-me-use-case'
import { UpdateUserLanguageUseCase } from '../../../application/update-user-language-use-case'
import { DeleteAccountUseCase } from '../../../application/delete-account-use-case'
import { LogoutUseCase } from '../../../application/logout-use-case'
import { ChangePasswordUseCase } from '../../../application/change-password-use-case'
import { VerifyEmailUseCase } from '../../../application/verify-email-use-case'
import { ResendVerificationUseCase } from '../../../application/resend-verification-use-case'
import { RequestPasswordResetUseCase } from '../../../application/request-password-reset-use-case'
import { ResetPasswordUseCase } from '../../../application/reset-password-use-case'
import { GetPasswordResetEmailUseCase } from '../../../application/get-password-reset-email-use-case'
import { requireUserId } from '../helpers/require-user-id'
import { requireToken } from '../helpers/require-token'

const resetTokenParamSchema = z.object({ token: z.string().min(1) })

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly googleSignInUseCase: GoogleSignInUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateUserLanguageUseCase: UpdateUserLanguageUseCase,
    private readonly deleteAccountUseCase: DeleteAccountUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly getPasswordResetEmailUseCase: GetPasswordResetEmailUseCase,
  ) {}

  register = async (request: Request, response: Response): Promise<void> => {
    const body = registerRequestSchema.parse(request.body)
    const data = await this.registerUseCase.execute(body)
    response.status(201).json({ data })
  }

  verifyEmail = async (request: Request, response: Response): Promise<void> => {
    const { token } = verifyEmailRequestSchema.parse(request.body)
    const data = await this.verifyEmailUseCase.execute(token)
    response.json({ data })
  }

  resendVerification = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const { email } = resendVerificationRequestSchema.parse(request.body)
    await this.resendVerificationUseCase.execute(email)
    response.json({
      data: {
        message: 'If that account is waiting on confirmation, a link was sent.',
      },
    })
  }

  login = async (request: Request, response: Response): Promise<void> => {
    const body = loginRequestSchema.parse(request.body)
    const data = await this.loginUseCase.execute(body)
    response.json({ data })
  }

  googleSignIn = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const body = googleSignInRequestSchema.parse(request.body)
    const data = await this.googleSignInUseCase.execute(body)
    response.json({ data })
  }

  me = async (request: Request, response: Response): Promise<void> => {
    const userId = requireUserId(request)
    const data = await this.getMeUseCase.execute(userId)
    response.json({ data })
  }

  updateLanguage = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const userId = requireUserId(request)
    const body = updateLanguageRequestSchema.parse(request.body)
    const data = await this.updateUserLanguageUseCase.execute(
      userId,
      body.language,
    )
    response.json({ data })
  }

  logout = async (request: Request, response: Response): Promise<void> => {
    await this.logoutUseCase.execute(requireToken(request))
    response.json({ data: { message: 'Logged out.' } })
  }

  changePassword = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const userId = requireUserId(request)
    const body = changePasswordRequestSchema.parse(request.body)
    const data = await this.changePasswordUseCase.execute(userId, body)
    response.json({ data })
  }

  deleteMe = async (request: Request, response: Response): Promise<void> => {
    const userId = requireUserId(request)
    const body = deleteAccountRequestSchema.parse(request.body)
    await this.deleteAccountUseCase.execute(userId, body)
    response.json({ data: { message: 'Account deleted.' } })
  }

  requestPasswordReset = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const body = requestPasswordResetRequestSchema.parse(request.body)
    await this.requestPasswordResetUseCase.execute(body.email)
    response.json({
      data: { message: 'If that email exists, a reset link was sent.' },
    })
  }

  resetPassword = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const body = resetPasswordRequestSchema.parse(request.body)
    const data = await this.resetPasswordUseCase.execute(body)
    response.json({ data })
  }

  getPasswordResetEmail = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const { token } = resetTokenParamSchema.parse(request.params)
    const email = await this.getPasswordResetEmailUseCase.execute(token)
    response.json({ data: { email } })
  }
}
