import { Prisma, experience } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { ExperienceService } from './experience.service';
import { ExperienceRepository } from './experience.repository';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { BadRequestException, NotFoundException } from '../../common/exceptions';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Role } from '../../common/enums/role.enum';

const mockExperience = {
  experience_id: 21n,
  profile_id: 1n,
  company_name: 'Google',
  position: 'Senior Software Engineer',
  employment_type: 'Full-time',
  location: 'Mountain View, CA',
  start_date: new Date('2019-05-01'),
  end_date: new Date('2024-02-28'),
  is_current: false,
  description: null,
} as experience;

function buildCreateDto(): CreateExperienceDto {
  const dto = new CreateExperienceDto();
  dto.companyName = 'Google';
  dto.position = 'Senior Software Engineer';
  dto.employmentType = 'Full-time';
  dto.location = 'Mountain View, CA';
  dto.startDate = '2019-05-01';
  dto.endDate = '2024-02-28';
  dto.isCurrent = false;
  return dto;
}

function buildUpdateDto(): UpdateExperienceDto {
  const dto = new UpdateExperienceDto();
  dto.position = 'Staff Software Engineer';
  return dto;
}

function buildForeignKeyViolation(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Foreign key constraint failed on the field: `profile_id`',
    {
      code: 'P2003',
      clientVersion: 'test',
    },
  );
}

describe('ExperienceService', () => {
  let service: ExperienceService;
  let repository: {
    findProfileIdByUserId: jest.Mock;
    findAllByUserId: jest.Mock;
    findOwnedById: jest.Mock;
    createExperience: jest.Mock;
    updateOwnedExperience: jest.Mock;
    deleteOwnedExperience: jest.Mock;
  };
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const userA: IAuthenticatedUser = {
    id: '1',
    email: 'a@example.com',
    roles: [Role.USER],
  };
  const userB: IAuthenticatedUser = {
    id: '2',
    email: 'b@example.com',
    roles: [Role.USER],
  };

  beforeEach(() => {
    repository = {
      findProfileIdByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      findOwnedById: jest.fn(),
      createExperience: jest.fn(),
      updateOwnedExperience: jest.fn(),
      deleteOwnedExperience: jest.fn(),
    };

    service = new ExperienceService(
      repository as unknown as ExperienceRepository,
      logger as unknown as PinoLogger,
    );
  });

  describe('listExperience', () => {
    it("returns the authenticated user's experience entries mapped safely", async () => {
      repository.findAllByUserId.mockResolvedValue([mockExperience]);

      const result = await service.listExperience(userA);

      expect(repository.findAllByUserId).toHaveBeenCalledWith('1');
      expect(result).toEqual([
        {
          experienceId: '21',
          profileId: '1',
          companyName: 'Google',
          position: 'Senior Software Engineer',
          employmentType: 'Full-time',
          location: 'Mountain View, CA',
          startDate: mockExperience.start_date,
          endDate: mockExperience.end_date,
          isCurrent: false,
          description: null,
        },
      ]);
    });

    it('returns an empty list when the user has no experience', async () => {
      repository.findAllByUserId.mockResolvedValue([]);

      const result = await service.listExperience(userA);

      expect(result).toEqual([]);
    });

    it('scopes the lookup by the authenticated user id only', async () => {
      repository.findAllByUserId.mockResolvedValue([mockExperience]);

      let passedUserId: string | undefined;
      repository.findAllByUserId.mockImplementation((userId: string) => {
        passedUserId = userId;
        return Promise.resolve([mockExperience]);
      });

      await service.listExperience(userA);

      expect(passedUserId).toBe('1');
    });

    it('never exposes raw database keys or sec_user internals', async () => {
      repository.findAllByUserId.mockResolvedValue([mockExperience]);

      const result = await service.listExperience(userA);

      expect(result[0]).not.toHaveProperty('experience_id');
      expect(result[0]).not.toHaveProperty('profile_id');
      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[0]).not.toHaveProperty('user_id');
    });
  });

  describe('getExperience', () => {
    it("returns the authenticated user's experience entry mapped safely", async () => {
      repository.findOwnedById.mockResolvedValue(mockExperience);

      const result = await service.getExperience(userA, '21');

      expect(repository.findOwnedById).toHaveBeenCalledWith('1', '21');
      expect(result).toEqual({
        experienceId: '21',
        profileId: '1',
        companyName: 'Google',
        position: 'Senior Software Engineer',
        employmentType: 'Full-time',
        location: 'Mountain View, CA',
        startDate: mockExperience.start_date,
        endDate: mockExperience.end_date,
        isCurrent: false,
        description: null,
      });
    });

    it('scopes the lookup by the authenticated user id + experience id', async () => {
      repository.findOwnedById.mockResolvedValue(mockExperience);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.findOwnedById.mockImplementation((userId: string, experienceId: string) => {
        passedUserId = userId;
        passedExperienceId = experienceId;
        return Promise.resolve(mockExperience);
      });

      await service.getExperience(userA, '21');

      expect(passedUserId).toBe('1');
      expect(passedExperienceId).toBe('21');
    });

    it('throws NotFoundException when the entry does not exist', async () => {
      repository.findOwnedById.mockResolvedValue(null);

      await expect(service.getExperience(userA, '999')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('never exposes raw database keys in the fetched response', async () => {
      repository.findOwnedById.mockResolvedValue(mockExperience);

      const result = await service.getExperience(userA, '21');

      expect(result).not.toHaveProperty('experience_id');
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('createExperience', () => {
    it("creates the experience entry under the authenticated user's profile", async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createExperience.mockResolvedValue(mockExperience);

      const result = await service.createExperience(userA, buildCreateDto());

      expect(repository.createExperience).toHaveBeenCalledWith(1n, buildCreateDto());
      expect(result).toEqual({
        experienceId: '21',
        profileId: '1',
        companyName: 'Google',
        position: 'Senior Software Engineer',
        employmentType: 'Full-time',
        location: 'Mountain View, CA',
        startDate: mockExperience.start_date,
        endDate: mockExperience.end_date,
        isCurrent: false,
        description: null,
      });
    });

    it('never passes a client-supplied identifier to the repository', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createExperience.mockResolvedValue(mockExperience);

      let passedProfileId: bigint | undefined;
      let passedDto: CreateExperienceDto | undefined;
      repository.createExperience.mockImplementation(
        (profileId: bigint, dto: CreateExperienceDto) => {
          passedProfileId = profileId;
          passedDto = dto;
          return Promise.resolve(mockExperience);
        },
      );

      await service.createExperience(userA, buildCreateDto());

      expect(passedProfileId).toBe(1n);
      expect(passedDto).not.toHaveProperty('profileId');
      expect(passedDto).not.toHaveProperty('userId');
      expect(passedDto).not.toHaveProperty('experienceId');
    });

    it('throws NotFoundException when the account has no profile and skips the create', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(null);

      await expect(service.createExperience(userA, buildCreateDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(repository.createExperience).not.toHaveBeenCalled();
    });

    it('converts a concurrent profile deletion (P2003) into NotFoundException', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createExperience.mockRejectedValue(buildForeignKeyViolation());

      await expect(service.createExperience(userA, buildCreateDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rethrows non-constraint errors unchanged', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      const dbError = new Error('database down');
      repository.createExperience.mockRejectedValue(dbError);

      await expect(service.createExperience(userA, buildCreateDto())).rejects.toBe(dbError);
    });

    it('never exposes raw database keys in the created response', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createExperience.mockResolvedValue(mockExperience);

      const result = await service.createExperience(userA, buildCreateDto());

      expect(result).not.toHaveProperty('experience_id');
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('updateExperience', () => {
    it('updates an entry owned by the authenticated user and returns the mapped row', async () => {
      repository.updateOwnedExperience.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue({
        ...mockExperience,
        position: 'Staff Software Engineer',
      });

      const result = await service.updateExperience(userA, '21', buildUpdateDto());

      expect(repository.updateOwnedExperience).toHaveBeenCalledWith('1', '21', buildUpdateDto());
      expect(repository.findOwnedById).toHaveBeenCalledWith('1', '21');
      expect(result.position).toBe('Staff Software Engineer');
      expect(result.experienceId).toBe('21');
    });

    it('scopes the update by the authenticated user id + experience id', async () => {
      repository.updateOwnedExperience.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(mockExperience);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.updateOwnedExperience.mockImplementation(
        (userId: string, experienceId: string) => {
          passedUserId = userId;
          passedExperienceId = experienceId;
          return Promise.resolve(1);
        },
      );

      await service.updateExperience(userA, '21', buildUpdateDto());

      expect(passedUserId).toBe('1');
      expect(passedExperienceId).toBe('21');
    });

    it('throws BadRequestException for an empty body and skips the update', async () => {
      const emptyDto = new UpdateExperienceDto();

      await expect(service.updateExperience(userA, '21', emptyDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(repository.updateOwnedExperience).not.toHaveBeenCalled();
      expect(repository.findOwnedById).not.toHaveBeenCalled();
    });

    it('treats an explicit null as a clear-field intent, not an empty body', async () => {
      repository.updateOwnedExperience.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue({ ...mockExperience, description: null });
      const dto = new UpdateExperienceDto();
      // @IsOptional() skips validation for null at runtime (clearing a field),
      // even though the DTO's TypeScript type is string | undefined.
      dto.description = null as unknown as string;

      const result = await service.updateExperience(userA, '21', dto);

      expect(repository.updateOwnedExperience).toHaveBeenCalledWith('1', '21', dto);
      expect(result.description).toBeNull();
    });

    it('throws NotFoundException when the entry is not owned or does not exist', async () => {
      repository.updateOwnedExperience.mockResolvedValue(0);

      await expect(service.updateExperience(userA, '21', buildUpdateDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(repository.findOwnedById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the row disappears between update and fetch', async () => {
      repository.updateOwnedExperience.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(null);

      await expect(service.updateExperience(userA, '21', buildUpdateDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rethrows unknown errors unchanged', async () => {
      const dbError = new Error('database down');
      repository.updateOwnedExperience.mockRejectedValue(dbError);

      await expect(service.updateExperience(userA, '21', buildUpdateDto())).rejects.toBe(dbError);
    });

    it('never exposes raw database keys in the updated response', async () => {
      repository.updateOwnedExperience.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(mockExperience);

      const result = await service.updateExperience(userA, '21', buildUpdateDto());

      expect(result).not.toHaveProperty('experience_id');
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('deleteExperience', () => {
    it('deletes an entry owned by the authenticated user and returns a success response', async () => {
      repository.deleteOwnedExperience.mockResolvedValue(1);

      const result = await service.deleteExperience(userA, '21');

      expect(repository.deleteOwnedExperience).toHaveBeenCalledWith('1', '21');
      expect(result).toEqual({ message: 'Experience deleted successfully.', data: null });
    });

    it('scopes the delete by the authenticated user id + experience id', async () => {
      repository.deleteOwnedExperience.mockResolvedValue(1);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.deleteOwnedExperience.mockImplementation(
        (userId: string, experienceId: string) => {
          passedUserId = userId;
          passedExperienceId = experienceId;
          return Promise.resolve(1);
        },
      );

      await service.deleteExperience(userA, '21');

      expect(passedUserId).toBe('1');
      expect(passedExperienceId).toBe('21');
    });

    it('throws NotFoundException when the entry is not owned or does not exist', async () => {
      repository.deleteOwnedExperience.mockResolvedValue(0);

      await expect(service.deleteExperience(userA, '21')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns a success-only response — never the deleted row data', async () => {
      repository.deleteOwnedExperience.mockResolvedValue(1);

      const result = await service.deleteExperience(userA, '21');

      expect(result.data).toBeNull();
      expect(result).not.toHaveProperty('experience_id');
      expect(result).not.toHaveProperty('company_name');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('security / cross-user isolation', () => {
    it("User B cannot GET User A's experience (404, query scoped by user B)", async () => {
      repository.findOwnedById.mockResolvedValue(null);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.findOwnedById.mockImplementation((userId: string, experienceId: string) => {
        passedUserId = userId;
        passedExperienceId = experienceId;
        return Promise.resolve(null);
      });

      await expect(service.getExperience(userB, '21')).rejects.toBeInstanceOf(NotFoundException);

      expect(passedUserId).toBe('2');
      expect(passedExperienceId).toBe('21');
    });

    it("User B cannot PATCH User A's experience (404, update scoped by user B)", async () => {
      const userARow = { ...mockExperience, experience_id: 21n, profile_id: 1n };
      repository.updateOwnedExperience.mockResolvedValue(0);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.updateOwnedExperience.mockImplementation(
        (userId: string, experienceId: string) => {
          passedUserId = userId;
          passedExperienceId = experienceId;
          return Promise.resolve(0);
        },
      );

      await expect(service.updateExperience(userB, '21', buildUpdateDto())).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(passedUserId).toBe('2');
      expect(passedExperienceId).toBe('21');
      // The update affected zero rows — user A's row was never touched.
      expect(userARow.position).toBe('Senior Software Engineer');
      expect(repository.findOwnedById).not.toHaveBeenCalled();
    });

    it("User B cannot DELETE User A's experience (404, delete scoped by user B)", async () => {
      const userARow = { ...mockExperience, experience_id: 21n, profile_id: 1n };
      repository.deleteOwnedExperience.mockResolvedValue(0);

      let passedUserId: string | undefined;
      let passedExperienceId: string | undefined;
      repository.deleteOwnedExperience.mockImplementation(
        (userId: string, experienceId: string) => {
          passedUserId = userId;
          passedExperienceId = experienceId;
          return Promise.resolve(0);
        },
      );

      await expect(service.deleteExperience(userB, '21')).rejects.toBeInstanceOf(NotFoundException);

      expect(passedUserId).toBe('2');
      expect(passedExperienceId).toBe('21');
      // Zero rows were deleted — user A's row survives.
      expect(userARow.experience_id).toBe(21n);
    });
  });
});
