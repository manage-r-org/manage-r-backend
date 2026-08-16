import { Injectable } from '@nestjs/common';
import { education } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BaseRepository } from '../../database/repositories/base.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

/**
 * EducationRepository — persistence for education records.
 *
 * The repository only retrieves and stores data. It never decides which entry
 * a user may read or change; that ownership policy lives in EducationService.
 * Every method scopes its query to `profile.user_id` (the unique owner of the
 * profile an education row hangs off), so the database itself enforces that a
 * client can only ever touch its own rows — even with a foreign `educationId`.
 */
@Injectable()
export class EducationRepository extends BaseRepository<education> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Resolves the profile id of the authenticated user (BIGINT as a native
   * `bigint`). Returns `null` when the account has no profile yet — a profile
   * must exist before education rows can be created (they hang off
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
   * Lists every education entry belonging to the authenticated user's profile.
   * The `profile.user_id` filter makes the query safe even when the user has no
   * profile yet (it simply matches nothing). Ordered most-recent start date
   * first, newest entry first as a tiebreaker.
   */
  findAllByUserId(userId: string): Promise<education[]> {
    return this.prisma.education.findMany({
      where: { profile: { user_id: BigInt(userId) } },
      orderBy: [{ start_date: { sort: 'desc', nulls: 'last' } }, { education_id: 'desc' }],
    });
  }

  /**
   * Finds a single education entry that both exists AND belongs to the
   * authenticated user's profile. Used to return the updated row after an
   * `updateMany` (which yields no row) — and, by construction, can never leak
   * another user's entry (no IDOR).
   */
  findOwnedById(userId: string, educationId: string): Promise<education | null> {
    return this.prisma.education.findFirst({
      where: {
        education_id: BigInt(educationId),
        profile: { user_id: BigInt(userId) },
      },
    });
  }

  /**
   * Creates an education entry owned by the authenticated user's profile.
   * `profile_id` is resolved from the verified JWT identity (passed as
   * `profileId`), never from client input — the DTO has no owner field and the
   * validation pipe rejects any unknown property. `start_date`/`end_date`
   * arrive as ISO date strings and are converted to `Date` (Prisma's DateTime
   * parser rejects a bare date such as "2020-01-15").
   */
  createEducation(profileId: bigint, dto: CreateEducationDto): Promise<education> {
    return this.prisma.education.create({
      data: {
        profile_id: profileId,
        degree: dto.degree,
        institution: dto.institution,
        field_of_study: dto.fieldOfStudy,
        grade: dto.grade,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        end_date: dto.endDate ? new Date(dto.endDate) : undefined,
        is_current: dto.isCurrent,
        description: dto.description,
      },
    });
  }

  /**
   * Partially updates an education entry that both exists AND belongs to the
   * authenticated user's profile. Returns the number of rows changed (0 or 1),
   * never throwing — the service turns a `0` into a 404. The ownership filter
   * means a foreign `educationId` simply updates nothing (no IDOR).
   *
   * PATCH semantics are preserved by Prisma: an `undefined` field is ignored,
   * an explicit `null` clears it. Dates convert the same way as create.
   */
  updateOwnedEducation(
    userId: string,
    educationId: string,
    dto: UpdateEducationDto,
  ): Promise<number> {
    return this.prisma.education
      .updateMany({
        where: {
          education_id: BigInt(educationId),
          profile: { user_id: BigInt(userId) },
        },
        data: {
          degree: dto.degree,
          institution: dto.institution,
          field_of_study: dto.fieldOfStudy,
          grade: dto.grade,
          start_date: typeof dto.startDate === 'string' ? new Date(dto.startDate) : dto.startDate,
          end_date: typeof dto.endDate === 'string' ? new Date(dto.endDate) : dto.endDate,
          is_current: dto.isCurrent,
          description: dto.description,
        },
      })
      .then((result) => result.count);
  }

  /**
   * Deletes an education entry that both exists AND belongs to the
   * authenticated user's profile. Returns the number of rows deleted (0 or 1);
   * the service turns a `0` into a 404. A foreign `educationId` deletes nothing
   * (no IDOR). The deleted row is never returned.
   */
  deleteOwnedEducation(userId: string, educationId: string): Promise<number> {
    return this.prisma.education
      .deleteMany({
        where: {
          education_id: BigInt(educationId),
          profile: { user_id: BigInt(userId) },
        },
      })
      .then((result) => result.count);
  }

  findById(_id: string): Promise<education | null> {
    return Promise.resolve(null);
  }

  findAll(_pagination: PaginationQueryDto): Promise<IPaginatedResult<education>> {
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

  create(_data: Partial<education>): Promise<education> {
    return Promise.resolve(null as unknown as education);
  }

  update(_id: string, _data: Partial<education>): Promise<education> {
    return Promise.resolve(null as unknown as education);
  }

  delete(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
