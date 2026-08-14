import { Prisma, profile } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { ProfilesService } from './profiles.service';
import { ProfilesRepository } from './profiles.repository';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BadRequestException, ConflictException, NotFoundException } from '../../common/exceptions';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Role } from '../../common/enums/role.enum';

const mockProfile = {
  profile_id: 1n,
  user_id: 1n,
  first_name: 'Tasin',
  middle_name: null,
  last_name: 'Shahriar',
  dob: new Date('1995-01-01'),
  headline: 'Software Engineer',
  summary: 'Building things that matter.',
  email: 'tasin@example.com',
  phone: '017XXXXXXXX',
  website: null,
  linkedin_url: null,
  github_url: null,
  present_address: null,
  permanent_address: null,
  created_at: new Date('2026-08-08T00:00:00.000Z'),
  updated_at: null,
} as profile;

function buildCreateDto(): CreateProfileDto {
  const dto = new CreateProfileDto();
  dto.firstName = 'Tasin';
  dto.lastName = 'Shahriar';
  dto.headline = 'Software Engineer';
  dto.email = 'tasin@example.com';
  dto.phone = '017XXXXXXXX';
  return dto;
}

function buildUniqueViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed on the fields: (`user_id`)',
    {
      code: 'P2002',
      clientVersion: 'test',
    },
  );
}

function buildRecordNotFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

function buildUpdateDto(): UpdateProfileDto {
  const dto = new UpdateProfileDto();
  dto.headline = 'Software Developer';
  return dto;
}

describe('ProfilesService', () => {
  let service: ProfilesService;
  let repository: {
    findByUserId: jest.Mock;
    createProfile: jest.Mock;
    updateByUserId: jest.Mock;
    deleteByUserId: jest.Mock;
  };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const authenticatedUser: IAuthenticatedUser = {
    id: '1',
    email: 'tasin@example.com',
    roles: [Role.USER],
  };

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      createProfile: jest.fn(),
      updateByUserId: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    service = new ProfilesService(
      repository as unknown as ProfilesRepository,
      logger as unknown as PinoLogger,
    );
  });

  describe('getProfile', () => {
    it("returns the authenticated user's profile", async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);

      const result = await service.getProfile(authenticatedUser);

      expect(result).toEqual({
        profileId: '1',
        userId: '1',
        firstName: 'Tasin',
        middleName: null,
        lastName: 'Shahriar',
        dob: mockProfile.dob,
        headline: 'Software Engineer',
        summary: 'Building things that matter.',
        email: 'tasin@example.com',
        phone: '017XXXXXXXX',
        website: null,
        linkedinUrl: null,
        githubUrl: null,
        presentAddress: null,
        permanentAddress: null,
        createdAt: mockProfile.created_at,
        updatedAt: null,
      });
    });

    it('looks up the profile by the authenticated user id only', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);

      await service.getProfile(authenticatedUser);

      expect(repository.findByUserId).toHaveBeenCalledWith('1');
    });

    it('never exposes raw database keys or sec_user internals', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);

      const result = await service.getProfile(authenticatedUser);

      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('user_id');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('role_id');
      expect(result).not.toHaveProperty('is_active');
    });

    it('throws NotFoundException when the account has no profile', async () => {
      repository.findByUserId.mockResolvedValue(null);

      await expect(service.getProfile(authenticatedUser)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createProfile', () => {
    it('creates the profile owned by the authenticated user id', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createProfile.mockResolvedValue(mockProfile);

      const result = await service.createProfile(authenticatedUser, buildCreateDto());

      expect(repository.createProfile).toHaveBeenCalledWith('1', buildCreateDto());
      expect(result).toEqual({
        profileId: '1',
        userId: '1',
        firstName: 'Tasin',
        middleName: null,
        lastName: 'Shahriar',
        dob: mockProfile.dob,
        headline: 'Software Engineer',
        summary: 'Building things that matter.',
        email: 'tasin@example.com',
        phone: '017XXXXXXXX',
        website: null,
        linkedinUrl: null,
        githubUrl: null,
        presentAddress: null,
        permanentAddress: null,
        createdAt: mockProfile.created_at,
        updatedAt: null,
      });
    });

    it('never passes a client-supplied userId to the repository', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createProfile.mockResolvedValue(mockProfile);

      let passedUserId: string | undefined;
      let passedDto: CreateProfileDto | undefined;
      repository.createProfile.mockImplementation((userId: string, dto: CreateProfileDto) => {
        passedUserId = userId;
        passedDto = dto;
        return Promise.resolve(mockProfile);
      });

      await service.createProfile(authenticatedUser, buildCreateDto());

      expect(passedUserId).toBe('1');
      expect(passedDto).not.toHaveProperty('userId');
      expect(passedDto).not.toHaveProperty('profileId');
    });

    it('throws ConflictException when the account already has a profile', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);

      await expect(
        service.createProfile(authenticatedUser, buildCreateDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.createProfile).not.toHaveBeenCalled();
    });

    it('converts a concurrent duplicate insert (P2002) into ConflictException', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createProfile.mockRejectedValue(buildUniqueViolation());

      await expect(
        service.createProfile(authenticatedUser, buildCreateDto()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows non-constraint errors unchanged', async () => {
      repository.findByUserId.mockResolvedValue(null);
      const dbError = new Error('database down');
      repository.createProfile.mockRejectedValue(dbError);

      await expect(service.createProfile(authenticatedUser, buildCreateDto())).rejects.toBe(
        dbError,
      );
    });

    it('never exposes raw database keys in the created response', async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.createProfile.mockResolvedValue(mockProfile);

      const result = await service.createProfile(authenticatedUser, buildCreateDto());

      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('user_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('updateProfile', () => {
    it('updates the profile belonging to the authenticated user id', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.updateByUserId.mockResolvedValue({
        ...mockProfile,
        headline: 'Software Developer',
      });

      const result = await service.updateProfile(authenticatedUser, buildUpdateDto());

      expect(repository.updateByUserId).toHaveBeenCalledWith('1', buildUpdateDto());
      expect(result.headline).toBe('Software Developer');
      expect(result.userId).toBe('1');
    });

    it('never passes a client-supplied userId to the repository', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.updateByUserId.mockResolvedValue(mockProfile);

      let passedUserId: string | undefined;
      let passedDto: UpdateProfileDto | undefined;
      repository.updateByUserId.mockImplementation((userId: string, dto: UpdateProfileDto) => {
        passedUserId = userId;
        passedDto = dto;
        return Promise.resolve(mockProfile);
      });

      await service.updateProfile(authenticatedUser, buildUpdateDto());

      expect(passedUserId).toBe('1');
      expect(passedDto).not.toHaveProperty('userId');
      expect(passedDto).not.toHaveProperty('profileId');
    });

    it('throws BadRequestException for an empty body and skips the update', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      const emptyDto = new UpdateProfileDto();

      await expect(service.updateProfile(authenticatedUser, emptyDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(repository.findByUserId).not.toHaveBeenCalled();
      expect(repository.updateByUserId).not.toHaveBeenCalled();
    });

    it('treats an explicit null as a clear-field intent, not an empty body', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.updateByUserId.mockResolvedValue({ ...mockProfile, headline: null });
      const dto = new UpdateProfileDto();
      // @IsOptional() skips validation for null at runtime (clearing a field),
      // even though the DTO's TypeScript type is string | undefined.
      dto.headline = null as unknown as string;

      const result = await service.updateProfile(authenticatedUser, dto);

      expect(repository.updateByUserId).toHaveBeenCalledWith('1', dto);
      expect(result.headline).toBeNull();
    });

    it('throws NotFoundException when the account has no profile', async () => {
      repository.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateProfile(authenticatedUser, buildUpdateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.updateByUserId).not.toHaveBeenCalled();
    });

    it('converts a concurrent delete (P2025) into NotFoundException', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.updateByUserId.mockRejectedValue(buildRecordNotFound());

      await expect(
        service.updateProfile(authenticatedUser, buildUpdateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-P2025 errors unchanged', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      const dbError = new Error('database down');
      repository.updateByUserId.mockRejectedValue(dbError);

      await expect(service.updateProfile(authenticatedUser, buildUpdateDto())).rejects.toBe(
        dbError,
      );
    });

    it('never exposes raw database keys in the updated response', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.updateByUserId.mockResolvedValue({
        ...mockProfile,
        headline: 'Software Developer',
      });

      const result = await service.updateProfile(authenticatedUser, buildUpdateDto());

      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('user_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('deleteProfile', () => {
    it('deletes the profile belonging to the authenticated user id', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.deleteByUserId.mockResolvedValue(mockProfile);

      const result = await service.deleteProfile(authenticatedUser);

      expect(repository.deleteByUserId).toHaveBeenCalledWith('1');
      expect(result).toEqual({ message: 'Profile deleted successfully.', data: null });
    });

    it('uses only the authenticated user id — never a client-supplied identifier', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.deleteByUserId.mockResolvedValue(mockProfile);

      let passedUserId: string | undefined;
      repository.deleteByUserId.mockImplementation((userId: string) => {
        passedUserId = userId;
        return Promise.resolve(mockProfile);
      });

      await service.deleteProfile(authenticatedUser);

      expect(passedUserId).toBe('1');
    });

    it('throws NotFoundException when the account has no profile and skips the delete', async () => {
      repository.findByUserId.mockResolvedValue(null);

      await expect(service.deleteProfile(authenticatedUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(repository.deleteByUserId).not.toHaveBeenCalled();
    });

    it('converts a concurrent delete (P2025) into NotFoundException', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.deleteByUserId.mockRejectedValue(buildRecordNotFound());

      await expect(service.deleteProfile(authenticatedUser)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rethrows non-P2025 errors unchanged', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      const dbError = new Error('database down');
      repository.deleteByUserId.mockRejectedValue(dbError);

      await expect(service.deleteProfile(authenticatedUser)).rejects.toBe(dbError);
    });

    it('returns a success-only response — never the deleted profile data', async () => {
      repository.findByUserId.mockResolvedValue(mockProfile);
      repository.deleteByUserId.mockResolvedValue(mockProfile);

      const result = await service.deleteProfile(authenticatedUser);

      expect(result.data).toBeNull();
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('user_id');
      expect(result).not.toHaveProperty('headline');
      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
