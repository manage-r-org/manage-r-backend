import { Body, Controller, Delete, Get, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { DeleteProfileResponse, ProfileResponse } from './mappers/profile.mapper';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiStandardResponse, CurrentUser } from '../../common/decorators';
import { IAuthenticatedUser } from '../../common/interfaces';
import { SUCCESS_MESSAGES } from '../../common/constants';

/**
 * ProfilesController — user profile routes.
 */
@ApiTags('Profiles')
@Controller('profile')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/v1/profile
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity. No userId/profileId/email/username
   * is accepted from the request (no query, body, or path identifiers), so a
   * client can only ever read its own profile. Thin: identity resolution, the
   * ownership check, and the safe mapping live in ProfilesService.
   */
  @Get()
  @ApiOperation({ summary: "Get the currently authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.FETCHED('Profile'))
  getProfile(@CurrentUser() user: IAuthenticatedUser): Promise<ProfileResponse> {
    return this.profilesService.getProfile(user);
  }

  /**
   * POST /api/v1/profile
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity. Ownership comes from the verified
   * JWT, never from the body — `userId`/`profileId` are not part of the DTO
   * and the validation pipe rejects them (400). 409 if the account already has
   * a profile; this is CREATE, not UPDATE. Thin: the duplicate check and the
   * safe mapping live in ProfilesService.
   */
  @Post()
  @ApiOperation({ summary: "Create the authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.CREATED, SUCCESS_MESSAGES.CREATED('Profile'))
  createProfile(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: CreateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profilesService.createProfile(user, dto);
  }

  /**
   * PATCH /api/v1/profile
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity. Only the profile belonging to the
   * authenticated user can change — no userId/profileId is accepted (validation
   * pipe rejects them, 400). PATCH semantics: only the supplied fields change.
   * 404 if the account has no profile yet (PATCH never creates one); 400 for an
   * empty body. Thin: the empty-body check, the 404, and the safe mapping live
   * in ProfilesService.
   */
  @Patch()
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.UPDATED('Profile'))
  updateProfile(
    @CurrentUser() user: IAuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profilesService.updateProfile(user, dto);
  }

  /**
   * DELETE /api/v1/profile
   *
   * Protected endpoint. The global JwtAuthGuard verifies the access token and
   * @CurrentUser() supplies the identity. The endpoint accepts no identifier
   * at all (no path param, query, body, or custom header), so a client can
   * only ever delete its own profile — there is no route like
   * DELETE /api/v1/profile/:id. 404 if the account has no profile. Thin: the
   * ownership resolution, the 404, and the success-only response live in
   * ProfilesService.
   */
  @Delete()
  @ApiOperation({ summary: "Delete the authenticated user's profile" })
  @ApiStandardResponse(HttpStatus.OK, SUCCESS_MESSAGES.DELETED('Profile'))
  deleteProfile(@CurrentUser() user: IAuthenticatedUser): Promise<DeleteProfileResponse> {
    return this.profilesService.deleteProfile(user);
  }
}
