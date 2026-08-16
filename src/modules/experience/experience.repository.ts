import { Injectable } from '@nestjs/common';
import { experience } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BaseRepository } from '../../database/repositories/base.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

/**
 * ExperienceRepository — persistence for work-experience records.
 *
 * The repository only retrieves and stores data. It never decides which entry
 * a user may read or change; that ownership policy lives in ExperienceService.
 * Every method scopes its query to `profile.user_id` (the unique owner of the
 * profile an experience row hangs off), so the database itself enforces that a
 * client can only ever touch its own rows — even with a foreign
 * `experienceId`.
 */
@Injectable()
export class ExperienceRepository extends BaseRepository<experience> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Resolves the profile id of the authenticated user (BIGINT as a native
   * `bigint`). Returns `null` when the account has no profile yet — a profile
   * must exist before experience rows can be created (they hang off
   * `profile_id`).
   */
  findProfileIdByUserId(userId: string): Promise<bigint | null> {
    return this.prisma.profile
      .findUnique({
        where: { user_id: BigInt(userId) },
        select: { profile_id: true },
      })
      .then((profile) => profile?.profile_id ?? null);
  }

  /**
   * Lists every work-experience entry belonging to the authenticated user's
   * profile. The `profile.user_id` filter makes the query safe even when the
   * user has no profile yet (it simply matches nothing). Ordered most-recent
   * start date first, newest entry first as a tiebreaker.
   */
  findAllByUserId(userId: string): Promise<experience[]> {
    return this.prisma.experience.findMany({
      where: { profile: { user_id: BigInt(userId) } },
      orderBy: [{ start_date: { sort: 'desc', nulls: 'last' } }, { experience_id: 'desc' }],
    });
  }

  /**
   * Finds a single work-experience entry that both exists AND belongs to the
   * authenticated user's profile. Used for the GET-one flow and to return the
   * updated row after an `updateMany` (which yields no row) — and, by
   * construction, can never leak another user's entry (no IDOR).
   */
  findOwnedById(userId: string, experienceId: string): Promise<experience | null> {
    return this.prisma.experience.findFirst({
      where: {
        experience_id: BigInt(experienceId),
        profile: { user_id: BigInt(userId) },
      },
    });
  }

  /**
   * Creates a work-experience entry owned by the authenticated user's profile.
   * `profile_id` is resolved from the verified JWT identity (passed as
   * `profileId`), never from client input — the DTO has no owner field and the
   * validation pipe rejects any unknown property. `start_date`/`end_date`
   * arrive as ISO date strings and are converted to `Date` (Prisma's DateTime
   * parser rejects a bare date such as "2019-05-01").
   */
  createExperience(profileId: bigint, dto: CreateExperienceDto): Promise<experience> {
    return this.prisma.experience.create({
      data: {
        profile_id: profileId,
        company_name: dto.companyName,
        position: dto.position,
        employment_type: dto.employmentType,
        location: dto.location,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        end_date: dto.endDate ? new Date(dto.endDate) : undefined,
        is_current: dto.isCurrent,
        description: dto.description,
      },
    });
  }

  /**
   * Partially updates a work-experience entry that both exists AND belongs to
   * the authenticated user's profile. Returns the number of rows changed (0 or
   * 1), never throwing — the service turns a `0` into a 404. The ownership
   * filter means a foreign `experienceId` simply updates nothing (no IDOR).
   *
   * PATCH semantics are preserved by Prisma: an `undefined` field is ignored,
   * an explicit `null` clears it. Dates convert the same way as create.
   */
  updateOwnedExperience(
    userId: string,
    experienceId: string,
    dto: UpdateExperienceDto,
  ): Promise<number> {
    return this.prisma.experience
      .updateMany({
        where: {
          experience_id: BigInt(experienceId),
          profile: { user_id: BigInt(userId) },
        },
        data: {
          company_name: dto.companyName,
          position: dto.position,
          employment_type: dto.employmentType,
          location: dto.location,
          start_date: typeof dto.startDate === 'string' ? new Date(dto.startDate) : dto.startDate,
          end_date: typeof dto.endDate === 'string' ? new Date(dto.endDate) : dto.endDate,
          is_current: dto.isCurrent,
          description: dto.description,
        },
      })
      .then((result) => result.count);
  }

  /**
   * Deletes a work-experience entry that both exists AND belongs to the
   * authenticated user's profile. Returns the number of rows deleted (0 or 1);
   * the service turns a `0` into a 404. A foreign `experienceId` deletes
   * nothing (no IDOR). The deleted row is never returned. Child
   * `experience_responsibility` rows cascade at the database level (the table's
   * FK is `ON DELETE CASCADE`), so no manual cleanup is needed.
   */
  deleteOwnedExperience(userId: string, experienceId: string): Promise<number> {
    return this.prisma.experience
      .deleteMany({
        where: {
          experience_id: BigInt(experienceId),
          profile: { user_id: BigInt(userId) },
        },
      })
      .then((result) => result.count);
  }

  findById(_id: string): Promise<experience | null> {
    return Promise.resolve(null);
  }

  findAll(_pagination: PaginationQueryDto): Promise<IPaginatedResult<experience>> {
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

  create(_data: Partial<experience>): Promise<experience> {
    return Promise.resolve(null as unknown as experience);
  }

  update(_id: string, _data: Partial<experience>): Promise<experience> {
    return Promise.resolve(null as unknown as experience);
  }

  delete(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
