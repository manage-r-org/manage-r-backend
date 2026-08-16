import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { ExperienceRepository } from './experience.repository';
import {
  DeleteExperienceResponse,
  ExperienceResponse,
  toExperienceResponse,
} from './mappers/experience.mapper';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { BadRequestException, NotFoundException } from '../../common/exceptions';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';
import { IAuthenticatedUser } from '../../common/interfaces';

/**
 * ExperienceService — work-experience business logic.
 *
 * Ownership model: every experience row hangs off a profile, which hangs off
 * exactly one `sec_user` (`profile.user_id` is unique). The identity therefore
 * comes from the verified access token (`@CurrentUser()`), and every repository
 * call is scoped by `profile.user_id`. No `profileId`/`experienceId` is ever
 * accepted from the body, so a client can only ever reach its own rows — even
 * with a foreign `:experienceId` path param (it simply matches nothing).
 *
 * List flow:     scope by the authenticated user's profile → map each row.
 *                A user without a profile gets an empty list (200).
 *
 * Get-one flow:  query by `:experienceId` AND `profile.user_id` (ownership baked
 *                into the query); 404 when the row does not exist or belongs to
 *                someone else — never 403, same as education.
 *
 * Create flow:   1) resolve the profile id from the JWT identity → 404 when the
 *                account has no profile (a profile must exist to own
 *                experience). 2) create the row. A concurrent profile deletion
 *                surfaces as a foreign-key violation (P2003) → converted to the
 *                same 404.
 *
 * Update flow:   1) reject an empty PATCH body (nothing to update) with 400.
 *                2) `updateMany` scoped by `profile.user_id` + `:experienceId`;
 *                   count 0 means not owned or not found → 404. Never creates.
 *                3) re-fetch the owned row and map it (never leaks another
 *                   user's entry).
 *
 * Delete flow:   `deleteMany` scoped the same way; count 0 → 404. Returns a
 *                success-only response (the deleted row is never exposed). Child
 *                responsibilities cascade at the database level.
 */
@Injectable()
export class ExperienceService {
  constructor(
    private readonly experienceRepository: ExperienceRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExperienceService.name);
  }

  /**
   * List flow: every work-experience entry belonging to the authenticated
   * user's profile, mapped to the safe response shape. The query is scoped by
   * `profile.user_id`, so a user without a profile (or with no entries) gets an
   * empty array rather than an error.
   */
  async listExperience(user: IAuthenticatedUser): Promise<ExperienceResponse[]> {
    const rows = await this.experienceRepository.findAllByUserId(user.id);
    return rows.map(toExperienceResponse);
  }

  /**
   * Get-one flow: the entry must both exist AND belong to the authenticated
   * user's profile — ownership is enforced inside the repository query, so a
   * foreign `experienceId` is indistinguishable from a missing one and becomes
   * the same 404 (no IDOR, no existence leak).
   */
  async getExperience(user: IAuthenticatedUser, experienceId: string): Promise<ExperienceResponse> {
    const experience = await this.experienceRepository.findOwnedById(user.id, experienceId);

    if (!experience) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Experience'));
    }

    return toExperienceResponse(experience);
  }

  /**
   * Create flow:
   *   1. Ownership comes from the verified access token (`@CurrentUser()`) —
   *      the DTO cannot carry a profile/user id (validation pipe rejects
   *      unknown fields).
   *   2. Resolve the profile id; 404 when the account has no profile yet.
   *   3. Create the entry. A concurrent profile deletion is caught and
   *      converted to the same 404 via the foreign-key constraint (P2003).
   */
  async createExperience(
    user: IAuthenticatedUser,
    dto: CreateExperienceDto,
  ): Promise<ExperienceResponse> {
    const profileId = await this.experienceRepository.findProfileIdByUserId(user.id);

    if (profileId === null) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
    }

    try {
      const experience = await this.experienceRepository.createExperience(profileId, dto);

      this.logger.info(
        {
          event: 'experience_created',
          userId: user.id,
          experienceId: experience.experience_id.toString(),
        },
        'Experience created',
      );

      return toExperienceResponse(experience);
    } catch (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
      }
      throw error;
    }
  }

  /**
   * Update flow:
   *   1. An empty body is a client error (400) — a PATCH with no fields would
   *      be a meaningless write.
   *   2. `updateMany` is scoped by the JWT identity + `:experienceId`, so a
   *      count of 0 means "not yours or doesn't exist" → 404 (never creates,
   *      never touches another user's row).
   *   3. Re-fetch the owned row and return the safe mapping.
   */
  async updateExperience(
    user: IAuthenticatedUser,
    experienceId: string,
    dto: UpdateExperienceDto,
  ): Promise<ExperienceResponse> {
    if (this.isDtoEmpty(dto)) {
      throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_UPDATE);
    }

    const updated = await this.experienceRepository.updateOwnedExperience(
      user.id,
      experienceId,
      dto,
    );

    if (updated === 0) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Experience'));
    }

    const experience = await this.experienceRepository.findOwnedById(user.id, experienceId);

    if (!experience) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Experience'));
    }

    this.logger.info(
      { event: 'experience_updated', userId: user.id, experienceId },
      'Experience updated',
    );

    return toExperienceResponse(experience);
  }

  /**
   * Delete flow:
   *   1. `deleteMany` is scoped by the JWT identity + `:experienceId`; a count
   *      of 0 → 404 (not owned or not found).
   *   2. Return a success-only response — the deleted row is never exposed.
   *      Child responsibility rows cascade at the database level.
   */
  async deleteExperience(
    user: IAuthenticatedUser,
    experienceId: string,
  ): Promise<DeleteExperienceResponse> {
    const deleted = await this.experienceRepository.deleteOwnedExperience(user.id, experienceId);

    if (deleted === 0) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Experience'));
    }

    this.logger.info(
      { event: 'experience_deleted', userId: user.id, experienceId },
      'Experience deleted',
    );

    return { message: SUCCESS_MESSAGES.DELETED('Experience'), data: null };
  }

  /**
   * True when the client supplied no field at all (an empty `{}` body). An
   * explicit `null` is a legitimate "clear this field", so it is not "empty".
   */
  private isDtoEmpty(dto: UpdateExperienceDto): boolean {
    return Object.values(dto ?? {}).every((value) => value === undefined);
  }

  private isForeignKeyViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }
}
