import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { EducationRepository } from './education.repository';
import {
  DeleteEducationResponse,
  EducationResponse,
  toEducationResponse,
} from './mappers/education.mapper';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { BadRequestException, NotFoundException } from '../../common/exceptions';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';
import { IAuthenticatedUser } from '../../common/interfaces';

/**
 * EducationService — education business logic.
 *
 * Ownership model: every education row hangs off a profile, which hangs off
 * exactly one `sec_user` (`profile.user_id` is unique). The identity therefore
 * comes from the verified access token (`@CurrentUser()`), and every repository
 * call is scoped by `profile.user_id`. No `profileId`/`educationId` is ever
 * accepted from the body, so a client can only ever reach its own rows — even
 * with a foreign `:educationId` path param (it simply matches nothing).
 *
 * List flow:      scope by the authenticated user's profile → map each row.
 *                 A user without a profile gets an empty list (200).
 *
 * Create flow:    1) resolve the profile id from the JWT identity → 404 when the
 *                 account has no profile (a profile must exist to own education).
 *                 2) create the row. A concurrent profile deletion surfaces as a
 *                 foreign-key violation (P2003) → converted to the same 404.
 *
 * Update flow:    1) reject an empty PATCH body (nothing to update) with 400.
 *                 2) `updateMany` scoped by `profile.user_id` + `:educationId`;
 *                    count 0 means not owned or not found → 404. Never creates.
 *                 3) re-fetch the owned row and map it (never leaks another
 *                    user's entry).
 *
 * Delete flow:    `deleteMany` scoped the same way; count 0 → 404. Returns a
 *                 success-only response (the deleted row is never exposed).
 */
@Injectable()
export class EducationService {
  constructor(
    private readonly educationRepository: EducationRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EducationService.name);
  }

  /**
   * List flow: every education entry belonging to the authenticated user's
   * profile, mapped to the safe response shape. The query is scoped by
   * `profile.user_id`, so a user without a profile (or with no entries) gets an
   * empty array rather than an error.
   */
  async listEducation(user: IAuthenticatedUser): Promise<EducationResponse[]> {
    const rows = await this.educationRepository.findAllByUserId(user.id);
    return rows.map(toEducationResponse);
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
  async createEducation(
    user: IAuthenticatedUser,
    dto: CreateEducationDto,
  ): Promise<EducationResponse> {
    const profileId = await this.educationRepository.findProfileIdByUserId(user.id);

    if (profileId === null) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
    }

    try {
      const education = await this.educationRepository.createEducation(profileId, dto);

      this.logger.info(
        {
          event: 'education_created',
          userId: user.id,
          educationId: education.education_id.toString(),
        },
        'Education created',
      );

      return toEducationResponse(education);
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
   *   2. `updateMany` is scoped by the JWT identity + `:educationId`, so a
   *      count of 0 means "not yours or doesn't exist" → 404 (never creates,
   *      never touches another user's row).
   *   3. Re-fetch the owned row and return the safe mapping.
   */
  async updateEducation(
    user: IAuthenticatedUser,
    educationId: string,
    dto: UpdateEducationDto,
  ): Promise<EducationResponse> {
    if (this.isDtoEmpty(dto)) {
      throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_UPDATE);
    }

    const updated = await this.educationRepository.updateOwnedEducation(user.id, educationId, dto);

    if (updated === 0) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Education'));
    }

    const education = await this.educationRepository.findOwnedById(user.id, educationId);

    if (!education) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Education'));
    }

    this.logger.info(
      { event: 'education_updated', userId: user.id, educationId },
      'Education updated',
    );

    return toEducationResponse(education);
  }

  /**
   * Delete flow:
   *   1. `deleteMany` is scoped by the JWT identity + `:educationId`; a count
   *      of 0 → 404 (not owned or not found).
   *   2. Return a success-only response — the deleted row is never exposed.
   */
  async deleteEducation(
    user: IAuthenticatedUser,
    educationId: string,
  ): Promise<DeleteEducationResponse> {
    const deleted = await this.educationRepository.deleteOwnedEducation(user.id, educationId);

    if (deleted === 0) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Education'));
    }

    this.logger.info(
      { event: 'education_deleted', userId: user.id, educationId },
      'Education deleted',
    );

    return { message: SUCCESS_MESSAGES.DELETED('Education'), data: null };
  }

  /**
   * True when the client supplied no field at all (an empty `{}` body). An
   * explicit `null` is a legitimate "clear this field", so it is not "empty".
   */
  private isDtoEmpty(dto: UpdateEducationDto): boolean {
    return Object.values(dto ?? {}).every((value) => value === undefined);
  }

  private isForeignKeyViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
  }
}
