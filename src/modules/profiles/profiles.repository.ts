import { Injectable } from '@nestjs/common';
import { profile } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BaseRepository } from '../../database/repositories/base.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * ProfilesRepository — persistence for profile records.
 *
 * The repository only retrieves and stores data. It never decides which profile
 * a user may read or create; that ownership policy lives in ProfilesService.
 */
@Injectable()
export class ProfilesRepository extends BaseRepository<profile> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Finds the profile belonging to a `sec_user` by its BIGINT id (received as
   * a string from the JWT `sub` claim). `user_id` is `@unique` in the schema
   * (one profile per account), so `findUnique` is the correct lookup.
   */
  findByUserId(userId: string): Promise<profile | null> {
    return this.prisma.profile.findUnique({
      where: { user_id: BigInt(userId) },
    });
  }

  /**
   * Creates the profile owned by the authenticated user. `user_id` is assigned
   * from the verified JWT identity (passed as `userId`), never from client
   * input — the DTO has no owner field and the validation pipe rejects any
   * unknown property. The database's unique `user_id` constraint is the final
   * guarantee that a user has at most one profile.
   *
   * `dob` arrives as an ISO date string from the DTO and is converted to a
   * `Date`: Prisma's DateTime parser requires a full ISO-8601 datetime and
   * rejects a bare date such as "1995-01-01".
   */
  createProfile(userId: string, dto: CreateProfileDto): Promise<profile> {
    return this.prisma.profile.create({
      data: {
        user_id: BigInt(userId),
        first_name: dto.firstName,
        middle_name: dto.middleName,
        last_name: dto.lastName,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        headline: dto.headline,
        summary: dto.summary,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        linkedin_url: dto.linkedinUrl,
        github_url: dto.githubUrl,
        present_address: dto.presentAddress,
        permanent_address: dto.permanentAddress,
      },
    });
  }

  /**
   * Partially updates the profile owned by the authenticated user. The `where`
   * clause targets the unique `user_id` derived from the verified JWT identity
   * — the client can never supply a profile/user id.
   *
   * PATCH semantics are preserved by Prisma: an `undefined` field is ignored
   * (only supplied fields change), while an explicit `null` clears the field.
   * `dob` arrives as an ISO date string and is converted to a `Date` (Prisma
   * rejects a bare date such as "1995-01-01"); a `null` dob clears it.
   */
  updateByUserId(userId: string, dto: UpdateProfileDto): Promise<profile> {
    return this.prisma.profile.update({
      where: { user_id: BigInt(userId) },
      data: {
        first_name: dto.firstName,
        middle_name: dto.middleName,
        last_name: dto.lastName,
        dob: typeof dto.dob === 'string' ? new Date(dto.dob) : dto.dob,
        headline: dto.headline,
        summary: dto.summary,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        linkedin_url: dto.linkedinUrl,
        github_url: dto.githubUrl,
        present_address: dto.presentAddress,
        permanent_address: dto.permanentAddress,
      },
    });
  }

  /**
   * Deletes the profile owned by the authenticated user. The `where` clause
   * targets the unique `user_id` derived from the verified JWT identity — the
   * client can never supply a profile/user id. Returns the deleted row, which
   * the service never exposes (the endpoint answers with a success-only
   * response). Deleting a profile cascades to its owned rows (education,
   * experience, project, certification, profile_skill, resume, etc.) per the
   * database's foreign-key design; `sec_user` itself is untouched.
   */
  deleteByUserId(userId: string): Promise<profile> {
    return this.prisma.profile.delete({
      where: { user_id: BigInt(userId) },
    });
  }

  findById(_id: string): Promise<profile | null> {
    return Promise.resolve(null);
  }

  findAll(_pagination: PaginationQueryDto): Promise<IPaginatedResult<profile>> {
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

  create(_data: Partial<profile>): Promise<profile> {
    return Promise.resolve(null as unknown as profile);
  }

  update(_id: string, _data: Partial<profile>): Promise<profile> {
    return Promise.resolve(null as unknown as profile);
  }

  delete(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
