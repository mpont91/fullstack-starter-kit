import { UserLanguage } from '@app/shared'
import { PrismaClient } from '@prisma/client'
import { UserRepository } from '../../domain/ports/user-repository'
import { UserRecord } from '../../domain/types/user'

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(
    email: string,
    hash: string,
    language: UserLanguage,
  ): Promise<UserRecord> {
    return this.prisma.user.create({ data: { email, hash, language } })
  }

  createWithGoogle(
    email: string,
    googleId: string,
    language: UserLanguage,
  ): Promise<UserRecord> {
    return this.prisma.user.create({
      data: { email, googleId, language, emailVerifiedAt: new Date() },
    })
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  findByGoogleId(googleId: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { googleId } })
  }

  setGoogleId(id: string, googleId: string): Promise<UserRecord> {
    return this.prisma.user.update({ where: { id }, data: { googleId } })
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  updateLanguage(id: string, language: UserLanguage): Promise<UserRecord> {
    return this.prisma.user.update({ where: { id }, data: { language } })
  }

  updatePassword(
    id: string,
    hash: string,
    sessionsValidFrom: Date,
  ): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { hash, sessionsValidFrom },
    })
  }

  removePassword(id: string, sessionsValidFrom: Date): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: { hash: null, sessionsValidFrom },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }

  async setVerificationToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        verificationTokenHash: tokenHash,
        verificationExpiresAt: expiresAt,
      },
    })
  }

  findByVerificationTokenHash(tokenHash: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { verificationTokenHash: tokenHash },
    })
  }

  async list(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ records: UserRecord[]; total: number }> {
    const where = search
      ? { email: { contains: search, mode: 'insensitive' as const } }
      : {}
    const [records, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ])
    return { records, total }
  }

  markEmailVerified(id: string): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: {
        emailVerifiedAt: new Date(),
        verificationTokenHash: null,
        verificationExpiresAt: null,
      },
    })
  }
}
