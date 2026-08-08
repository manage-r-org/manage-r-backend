import { Injectable } from '@nestjs/common';
import { Prisma, sec_user } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BaseRepository } from '../../database/repositories/base.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';
import { Role } from '../../common/enums/role.enum';

/**
 * Data needed to create a new account with its default profile.
 */
export interface CreateAccountInput {
  username: string;
  email: string;
  phoneNumber: string | null;
  passwordHash: string;
}

/**
 * A `sec_user` row with its role relation included — the shape needed to
 * build the JWT `roles` claim during login.
 */
export type UserWithRole = Prisma.sec_userGetPayload<{ include: { sec_role: true } }>;

/**
 * AuthRepository — persistence for authentication-related records.
 *
 * The repository only retrieves and stores data. It never decides whether
 * a registration is allowed; that policy lives in AuthService.
 */
@Injectable()
export class AuthRepository extends BaseRepository<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findByUsername(username: string): Promise<sec_user | null> {
    return this.prisma.sec_user.findUnique({ where: { username } });
  }

  findByEmail(email: string): Promise<sec_user | null> {
    return this.prisma.sec_user.findUnique({ where: { email } });
  }

  /**
   * `phone_number` is nullable and has no unique constraint in the schema,
   * so this uses `findFirst` rather than `findUnique`.
   */
  findByPhoneNumber(phoneNumber: string): Promise<sec_user | null> {
    return this.prisma.sec_user.findFirst({ where: { phone_number: phoneNumber } });
  }

  /**
   * Creates the account and its empty profile atomically in a single Prisma
   * write. The default USER role is connected (created on first use if the
   * role table is empty), so registration works without manual seeding.
   */
  createUserWithProfile(input: CreateAccountInput): Promise<sec_user> {
    return this.prisma.sec_user.create({
      data: {
        username: input.username,
        email: input.email,
        phone_number: input.phoneNumber,
        password_hash: input.passwordHash,
        profile: { create: {} },
        sec_role: {
          connectOrCreate: {
            where: { role_name: Role.USER },
            create: { role_name: Role.USER },
          },
        },
      },
    });
  }

  /**
   * Finds an account by either username or email (both are unique). The role
   * relation is included so the service can build the JWT `roles` claim
   * without a second query.
   */
  findByLoginIdentifier(identifier: string): Promise<UserWithRole | null> {
    return this.prisma.sec_user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: { sec_role: true },
    });
  }

  /**
   * Finds an account by its BIGINT id (received as a string from the JWT
   * `sub` claim). The role relation is included so the service can re-derive
   * the JWT `roles` claim from current database state.
   */
  findByIdWithRole(id: string): Promise<UserWithRole | null> {
    return this.prisma.sec_user.findUnique({
      where: { user_id: BigInt(id) },
      include: { sec_role: true },
    });
  }

  findById(_id: string): Promise<unknown> {
    return Promise.resolve(null);
  }

  findAll(_pagination: PaginationQueryDto): Promise<IPaginatedResult<unknown>> {
    return Promise.resolve({
      items: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  }

  create(_data: Partial<unknown>): Promise<unknown> {
    return Promise.resolve(null);
  }

  update(_id: string, _data: Partial<unknown>): Promise<unknown> {
    return Promise.resolve(null);
  }

  delete(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
