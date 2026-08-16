import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExperienceService } from './experience.service';
import { DeleteExperienceResponse, ExperienceResponse } from './mappers/experience.mapper';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { ApiStandardResponse, CurrentUser } from '../../common/decorators';
import { ParseBigIntPipe } from '../../common/pipes';
import { IAuthenticatedUser } from '../../common/interfaces';
import { SUCCESS_MESSAGES } from '../../common/constants';

/**
 * ExperienceController — work-experience routes, nested under the profile
 * resource.
 *
 * Every route is protected by the global JwtAuthGuard and identifies the owner
 * via `@CurrentUser()` → verified access token. Experience rows hang off a
 * profile, so ownership is always scoped to the authenticated user's profile;
 * `:experienceId` only addresses rows the user already owns (a foreign id
 * simply matches nothing → 404). No body/query field is ever trusted for
 * ownership.
 */
@ApiTags('Experience')
@Controller('profile/experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  /**
   * GET /api/v1/profile/experience
   *
   * Lists every work-experience entry belonging to the authenticated user's
   * profile. No identifiers are accepted from the request (query/body are
   * ignored), so a client can only ever read its own entries. A user without a
   * profile or without entries receives an empty list.
   */
  @Get()
  @ApiOperation({ summary: "List the authenticated user's work-experience entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.LISTED('Experience'))
  listExperience(@CurrentUser() user: IAuthenticatedUser): Promise<ExperienceResponse[]> {
    return this.experienceService.listExperience(user);
  }

  /**
   * POST /api/v1/profile/experience
   *
   * Adds a work-experience entry to the authenticated user's profile. The DTO
   * has no `profileId`/`experienceId`/`userId`, and the validation pipe rejects
   * them (400). 404 when the account has no profile yet (a profile must exist
   * to own experience). Thin: the ownership resolution and the safe mapping
   * live in ExperienceService.
   */
  @Post()
  @ApiOperation({ summary: "Add a work-experience entry to the authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.CREATED, SUCCESS_MESSAGES.CREATED('Experience'))
  createExperience(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: CreateExperienceDto,
  ): Promise<ExperienceResponse> {
    return this.experienceService.createExperience(user, dto);
  }

  /**
   * GET /api/v1/profile/experience/:experienceId
   *
   * Returns one of the authenticated user's work-experience entries.
   * `:experienceId` is validated by `ParseBigIntPipe` (400 for anything that is
   * not a BIGINT id string) and only addresses rows the user owns — a foreign
   * id is an indistinguishable 404, never a leak (no IDOR).
   */
  @Get(':experienceId')
  @ApiOperation({ summary: "Get one of the authenticated user's work-experience entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.FETCHED('Experience'))
  getExperience(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('experienceId', ParseBigIntPipe) experienceId: string,
  ): Promise<ExperienceResponse> {
    return this.experienceService.getExperience(user, experienceId);
  }

  /**
   * PATCH /api/v1/profile/experience/:experienceId
   *
   * Updates one of the authenticated user's work-experience entries.
   * `:experienceId` is validated by `ParseBigIntPipe` (400 for anything that is
   * not a BIGINT id string) and only addresses rows the user owns — a foreign
   * id is a 404, never an update. PATCH semantics: only the supplied fields
   * change. 400 for an empty body. Thin: the empty-body check, the 404, and the
   * safe mapping live in ExperienceService.
   */
  @Patch(':experienceId')
  @ApiOperation({ summary: "Update one of the authenticated user's work-experience entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.UPDATED('Experience'))
  updateExperience(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('experienceId', ParseBigIntPipe) experienceId: string,
    @Body() dto: UpdateExperienceDto,
  ): Promise<ExperienceResponse> {
    return this.experienceService.updateExperience(user, experienceId, dto);
  }

  /**
   * DELETE /api/v1/profile/experience/:experienceId
   *
   * Deletes one of the authenticated user's work-experience entries.
   * `:experienceId` is validated by `ParseBigIntPipe` and only addresses rows
   * the user owns — a foreign id is a 404, never a delete (no IDOR). The
   * deleted row is never returned; child responsibility rows cascade at the
   * database level. Thin: the ownership resolution and the success-only
   * response live in ExperienceService.
   */
  @Delete(':experienceId')
  @ApiOperation({ summary: "Delete one of the authenticated user's work-experience entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.DELETED('Experience'))
  deleteExperience(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('experienceId', ParseBigIntPipe) experienceId: string,
  ): Promise<DeleteExperienceResponse> {
    return this.experienceService.deleteExperience(user, experienceId);
  }
}
