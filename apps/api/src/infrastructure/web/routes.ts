import { type Request, type Response, Router } from 'express'
import { Container } from '../../di'
import { asyncHandler } from './middleware/async-handler'
import { authGuard } from './middleware/auth-guard'
import {
  emailRateLimit,
  loginRateLimit,
  registerRateLimit,
} from './middleware/rate-limit'
import { AuthController } from './controllers/auth-controller'
import { AdminController } from './controllers/admin-controller'
import { adminGuard } from './middleware/admin-guard'

export const createRouter = (): Router => {
  const router: Router = Router()

  router.get('/', (_: Request, res: Response): void => {
    res.send({})
  })
  router.get('/uptime', (_: Request, res: Response): void => {
    res.send({ data: process.uptime() })
  })

  const authController = new AuthController(
    Container.getRegisterUseCase(),
    Container.getLoginUseCase(),
    Container.getGoogleSignInUseCase(),
    Container.getGetMeUseCase(),
    Container.getUpdateUserLanguageUseCase(),
    Container.getDeleteAccountUseCase(),
    Container.getLogoutUseCase(),
    Container.getChangePasswordUseCase(),
    Container.getVerifyEmailUseCase(),
    Container.getResendVerificationUseCase(),
    Container.getRequestPasswordResetUseCase(),
    Container.getResetPasswordUseCase(),
    Container.getGetPasswordResetEmailUseCase(),
  )

  const guard = authGuard(Container.getAuthenticateUseCase())

  router.post(
    '/auth/register',
    registerRateLimit(),
    asyncHandler(authController.register),
  )
  router.post(
    '/auth/login',
    loginRateLimit(),
    asyncHandler(authController.login),
  )
  router.post(
    '/auth/google',
    loginRateLimit(),
    asyncHandler(authController.googleSignIn),
  )
  router.post('/auth/verify-email', asyncHandler(authController.verifyEmail))
  router.post(
    '/auth/verify-email/resend',
    emailRateLimit(),
    asyncHandler(authController.resendVerification),
  )
  router.get('/auth/me', guard, asyncHandler(authController.me))
  router.patch('/auth/me', guard, asyncHandler(authController.updateLanguage))
  router.delete('/auth/me', guard, asyncHandler(authController.deleteMe))
  router.post('/auth/logout', guard, asyncHandler(authController.logout))
  router.put(
    '/auth/password',
    guard,
    asyncHandler(authController.changePassword),
  )
  router.post(
    '/auth/password-reset/request',
    emailRateLimit(),
    asyncHandler(authController.requestPasswordReset),
  )
  router.post(
    '/auth/password-reset/confirm',
    asyncHandler(authController.resetPassword),
  )
  router.get(
    '/auth/password-reset/:token',
    asyncHandler(authController.getPasswordResetEmail),
  )

  // The product's own routes, all behind the session. One controller per
  // resource, each method wrapped in asyncHandler.
  const protectedRouter = Router()
  protectedRouter.use(guard)

  const adminController = new AdminController(
    Container.getListUsersUseCase(),
    Container.getDeleteUserUseCase(),
    Container.getGetMetricsUseCase(),
  )

  const adminRouter = Router()
  adminRouter.use(guard, adminGuard(Container.getAuthorizeAdminUseCase()))

  adminRouter.get('/users', asyncHandler(adminController.users))
  adminRouter.delete('/users/:id', asyncHandler(adminController.deleteUser))
  adminRouter.get('/metrics', asyncHandler(adminController.metrics))

  // Mounted ahead of the catch-all protected router, whose guard would
  // otherwise authenticate every /admin request a second time.
  router.use('/admin', adminRouter)

  router.use(protectedRouter)

  return router
}
