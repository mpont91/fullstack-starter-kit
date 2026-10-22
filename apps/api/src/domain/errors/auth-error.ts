export class EmailAlreadyInUseError extends Error {
  constructor(message: string = 'Email already in use') {
    super(message)
    this.name = 'EmailAlreadyInUseError'
  }
}

// Too many logins or sign-ups from one address in a short time: someone
// guessing passwords, or a script creating accounts.
export class TooManyAttemptsError extends Error {
  constructor(message: string = 'Too many attempts, try again later') {
    super(message)
    this.name = 'TooManyAttemptsError'
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message: string = 'Invalid credentials') {
    super(message)
    this.name = 'InvalidCredentialsError'
  }
}

// A wrong password on an already-authenticated request. Kept apart from
// InvalidCredentialsError because a 401 makes the frontend drop the session,
// and a typo while confirming account deletion shouldn't log the user out.
export class IncorrectPasswordError extends Error {
  constructor(message: string = 'Incorrect password') {
    super(message)
    this.name = 'IncorrectPasswordError'
  }
}

// Logged in, but not allowed to do this — an admin route reached by a regular
// user, or an admin turning a tool on their own account.
export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string = 'User not found') {
    super(message)
    this.name = 'UserNotFoundError'
  }
}

// Right password, but the email was never confirmed. Distinct from a wrong
// password so the login form can offer to resend the link instead.
export class EmailNotVerifiedError extends Error {
  constructor(message: string = 'Email not verified') {
    super(message)
    this.name = 'EmailNotVerifiedError'
  }
}

export class InvalidOrExpiredVerificationTokenError extends Error {
  constructor(message: string = 'Invalid or expired verification link') {
    super(message)
    this.name = 'InvalidOrExpiredVerificationTokenError'
  }
}

export class InvalidOrExpiredResetTokenError extends Error {
  constructor(message: string = 'Invalid or expired reset token') {
    super(message)
    this.name = 'InvalidOrExpiredResetTokenError'
  }
}
