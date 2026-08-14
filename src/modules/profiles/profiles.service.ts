import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { ProfilesRepository } from './profiles.repository';
import {
  DeleteProfileResponse,
  ProfileResponse,
  toProfileResponse,
} from './mappers/profile.mapper';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BadRequestException, ConflictException, NotFoundException } from '../../common/exceptions';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';
import { IAuthenticatedUser } from '../../common/interfaces';

/**
 * ProfilesService — profile business logic.
 *
 * Current-profile flow:
 *   1. The identity comes from the verified access token (JwtAuthGuard +
 *      @CurrentUser()); the client never supplies a userId, so it can only
 *      ever read its own profile.
 *   2. Load the profile by that user id.
 *   3. 404 if the account has no profile (a read never creates one — that is
 *      the job of POST /profile).
 *   4. Map the row into a safe response.
 *
 * Create-profile flow:
 *   1. Ownership comes from the verified access token (@CurrentUser()), never
 *      from the DTO.
 *   2. 409 if the account already has a profile (one profile per user).
 *   3. Create the profile and map it into a safe response.
 *   4. Convert a concurrent duplicate insert (unique `user_id` constraint,
 *      P2002) into the same 409 — the database is the final protection.
 *
 * Update-profile flow:
 *   1. Reject an empty PATCH body (nothing to update) with 400.
 *   2. Ownership comes from the verified access token (@CurrentUser()), never
 *      from the DTO.
 *   3. 404 if the account has no profile yet — PATCH never creates one.
 *   4. Update only the supplied fields and map the result.
 *   5. Convert a concurrent delete (P2025) into the same 404.
 *
 * Delete-profile flow:
 *   1. Ownership comes from the verified access token (@CurrentUser()); no
 *      identifier is accepted from the request, so a client can only delete
 *      its own profile.
 *   2. 404 if the account has no profile.
 *   3. Delete the profile and return a success-only response (the deleted row
 *      is never exposed). A concurrent delete (P2025) becomes the same 404.
 *      `sec_user` is untouched; profile-owned rows cascade per the database's
 *      foreign-key design.
 */
@Injectable()
export class ProfilesService {
  constructor(
    private readonly profilesRepository: ProfilesRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProfilesService.name);
  }

  /**
   * Current-profile flow:
   *   1. The identity comes from the verified access token (JwtAuthGuard +
   *      @CurrentUser()); no identifier is accepted from the request.
   *   2. Load the profile belonging to that user via the repository.
   *   3. 404 when the account has no profile yet.
   *   4. Return only the explicitly whitelisted fields.
   */
  async getProfile(user: IAuthenticatedUser): Promise<ProfileResponse> {
    const profile = await this.profilesRepository.findByUserId(user.id);

    if (!profile) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
    }

    return toProfileResponse(profile);
  }

  /**
   * Create-profile flow:
   *   1. Ownership comes from the verified access token (@CurrentUser()) — the
   *      DTO cannot carry a userId (validation pipe rejects unknown fields).
   *   2. 409 when the account already has a profile. This endpoint is CREATE,
   *      not UPDATE: an existing profile is never silently overwritten.
   *   3. Create the profile for the authenticated user and return the safe
   *      response. A concurrent duplicate insert is caught and converted to the
   *      same 409 via the unique `user_id` constraint (P2002).
   */
  async createProfile(user: IAuthenticatedUser, dto: CreateProfileDto): Promise<ProfileResponse> {
    const existing = await this.profilesRepository.findByUserId(user.id);

    if (existing) {
      throw new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Profile'));
    }

    try {
      const profile = await this.profilesRepository.createProfile(user.id, dto);

      this.logger.info({ event: 'profile_created', userId: user.id }, 'Profile created');

      return toProfileResponse(profile);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException(ERROR_MESSAGES.ALREADY_EXISTS('Profile'));
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  /**
   * Update-profile flow:
   *   1. An empty body is a client error (400) — a PATCH with no fields would
   *      be a meaningless write.
   *   2. Ownership comes from the verified access token (@CurrentUser()); the
   *      DTO has no userId/profileId (validation pipe rejects unknown fields).
   *   3. 404 when the account has no profile yet. This is UPDATE, not CREATE:
   *      PATCH never creates a profile.
   *   4. Update only the supplied fields (PATCH semantics) and return the safe
   *      response. A concurrent delete is caught and converted to the same 404
   *      via the P2025 "record not found" error.
   */
  async updateProfile(user: IAuthenticatedUser, dto: UpdateProfileDto): Promise<ProfileResponse> {
    if (this.isDtoEmpty(dto)) {
      throw new BadRequestException(ERROR_MESSAGES.NOTHING_TO_UPDATE);
    }

    const existing = await this.profilesRepository.findByUserId(user.id);

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
    }

    try {
      const profile = await this.profilesRepository.updateByUserId(user.id, dto);

      this.logger.info({ event: 'profile_updated', userId: user.id }, 'Profile updated');

      return toProfileResponse(profile);
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
      }
      throw error;
    }
  }

  /**
   * True when the client supplied no field at all (an empty `{}` body). An
   * explicit `null` is a legitimate "clear this field", so it is not "empty".
   */
  private isDtoEmpty(dto: UpdateProfileDto): boolean {
    return Object.values(dto ?? {}).every((value) => value === undefined);
  }

  /**
   * Delete-profile flow:
   *   1. Ownership comes from the verified access token (@CurrentUser()) — no
   *      identifier is accepted from the request (path, query, body, or custom
   *      headers), so a client can only ever delete its own profile.
   *   2. 404 when the account has no profile. DELETE never creates one.
   *   3. Delete the profile and return a success-only response (no deleted
   *      data). A concurrent delete is caught and converted to the same 404
   *      via the P2025 "record not found" error. Profile-owned rows cascade
   *      per the database's foreign-key design; `sec_user` is untouched.
   */
  async deleteProfile(user: IAuthenticatedUser): Promise<DeleteProfileResponse> {
    const existing = await this.profilesRepository.findByUserId(user.id);

    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
    }

    try {
      await this.profilesRepository.deleteByUserId(user.id);

      this.logger.info({ event: 'profile_deleted', userId: user.id }, 'Profile deleted');

      return { message: SUCCESS_MESSAGES.DELETED('Profile'), data: null };
    } catch (error) {
      if (this.isRecordNotFound(error)) {
        throw new NotFoundException(ERROR_MESSAGES.NOT_FOUND('Profile'));
      }
      throw error;
    }
  }

  private isRecordNotFound(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}
