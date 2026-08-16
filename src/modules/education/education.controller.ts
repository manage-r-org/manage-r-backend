import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { DeleteEducationResponse, EducationResponse } from './mappers/education.mapper';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { ApiStandardResponse, CurrentUser } from '../../common/decorators';
import { ParseBigIntPipe } from '../../common/pipes';
import { IAuthenticatedUser } from '../../common/interfaces';
import { SUCCESS_MESSAGES } from '../../common/constants';

/**
 * EducationController — education routes, nested under the profile resource.
 *
 * Every route is protected by the global JwtAuthGuard and identifies the owner
 * via `@CurrentUser()` → verified access token. Education rows hang off a
 * profile, so ownership is always scoped to the authenticated user's profile;
 * `:educationId` only addresses rows the user already owns (a foreign id simply
 * matches nothing → 404). No body/query field is ever trusted for ownership.
 */
@ApiTags('Education')
@Controller('profile/education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  /**
   * GET /api/v1/profile/education
   *
   * Lists every education entry belonging to the authenticated user's profile.
   * No identifiers are accepted from the request (query/body are ignored), so a
   * client can only ever read its own entries. A user without a profile or
   * without entries receives an empty list.
   */
  @Get()
  @ApiOperation({ summary: "List the authenticated user's education entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.LISTED('Education'))
  listEducation(@CurrentUser() user: IAuthenticatedUser): Promise<EducationResponse[]> {
    return this.educationService.listEducation(user);
  }

  /**
   * POST /api/v1/profile/education
   *
   * Adds an education entry to the authenticated user's profile. The DTO has no
   * `profileId`/`educationId`/`userId`, and the validation pipe rejects them
   * (400). 404 when the account has no profile yet (a profile must exist to own
   * education). Thin: the ownership resolution and the safe mapping live in
   * EducationService.
   */
  @Post()
  @ApiOperation({ summary: "Add an education entry to the authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.CREATED, SUCCESS_MESSAGES.CREATED('Education'))
  createEducation(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: CreateEducationDto,
  ): Promise<EducationResponse> {
    return this.educationService.createEducation(user, dto);
  }

  /**
   * PATCH /api/v1/profile/education/:educationId
   *
   * Updates one of the authenticated user's education entries. `:educationId`
   * is validated by `ParseBigIntPipe` (400 for anything that is not a BIGINT
   * id string) and only addresses rows the user owns — a foreign id is a 404,
   * never an update. PATCH semantics: only the supplied fields change. 400 for
   * an empty body. Thin: the empty-body check, the 404, and the safe mapping
   * live in EducationService.
   */
  @Patch(':educationId')
  @ApiOperation({ summary: "Update one of the authenticated user's education entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.UPDATED('Education'))
  updateEducation(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('educationId', ParseBigIntPipe) educationId: string,
    @Body() dto: UpdateEducationDto,
  ): Promise<EducationResponse> {
    return this.educationService.updateEducation(user, educationId, dto);
  }

  /**
   * DELETE /api/v1/profile/education/:educationId
   *
   * Deletes one of the authenticated user's education entries. `:educationId`
   * is validated by `ParseBigIntPipe` and only addresses rows the user owns — a
   * foreign id is a 404, never a delete (no IDOR). The deleted row is never
   * returned. Thin: the ownership resolution and the success-only response live
   * in EducationService.
   */
  @Delete(':educationId')
  @ApiOperation({ summary: "Delete one of the authenticated user's education entries" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.DELETED('Education'))
  deleteEducation(
    @CurrentUser() user: IAuthenticatedUser,
    @Param('educationId', ParseBigIntPipe) educationId: string,
  ): Promise<DeleteEducationResponse> {
    return this.educationService.deleteEducation(user, educationId);
  }
}
