import { Prisma, education } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { EducationService } from './education.service';
import { EducationRepository } from './education.repository';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { BadRequestException, NotFoundException } from '../../common/exceptions';
import { IAuthenticatedUser } from '../../common/interfaces';
import { Role } from '../../common/enums/role.enum';

const mockEducation = {
  education_id: 11n,
  profile_id: 1n,
  degree: 'Bachelor of Science',
  institution: 'University of Dhaka',
  field_of_study: 'Computer Science',
  grade: '3.82',
  start_date: new Date('2020-01-15'),
  end_date: new Date('2024-06-30'),
  is_current: false,
  description: null,
} as education;

function buildCreateDto(): CreateEducationDto {
  const dto = new CreateEducationDto();
  dto.degree = 'Bachelor of Science';
  dto.institution = 'University of Dhaka';
  dto.fieldOfStudy = 'Computer Science';
  dto.startDate = '2020-01-15';
  dto.endDate = '2024-06-30';
  dto.isCurrent = false;
  return dto;
}

function buildUpdateDto(): UpdateEducationDto {
  const dto = new UpdateEducationDto();
  dto.institution = 'University of Cambridge';
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

describe('EducationService', () => {
  let service: EducationService;
  let repository: {
    findProfileIdByUserId: jest.Mock;
    findAllByUserId: jest.Mock;
    findOwnedById: jest.Mock;
    createEducation: jest.Mock;
    updateOwnedEducation: jest.Mock;
    deleteOwnedEducation: jest.Mock;
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
      findProfileIdByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      findOwnedById: jest.fn(),
      createEducation: jest.fn(),
      updateOwnedEducation: jest.fn(),
      deleteOwnedEducation: jest.fn(),
    };

    service = new EducationService(
      repository as unknown as EducationRepository,
      logger as unknown as PinoLogger,
    );
  });

  describe('listEducation', () => {
    it("returns the authenticated user's education entries mapped safely", async () => {
      repository.findAllByUserId.mockResolvedValue([mockEducation]);

      const result = await service.listEducation(authenticatedUser);

      expect(repository.findAllByUserId).toHaveBeenCalledWith('1');
      expect(result).toEqual([
        {
          educationId: '11',
          profileId: '1',
          degree: 'Bachelor of Science',
          institution: 'University of Dhaka',
          fieldOfStudy: 'Computer Science',
          grade: '3.82',
          startDate: mockEducation.start_date,
          endDate: mockEducation.end_date,
          isCurrent: false,
          description: null,
        },
      ]);
    });

    it('returns an empty list when the user has no education', async () => {
      repository.findAllByUserId.mockResolvedValue([]);

      const result = await service.listEducation(authenticatedUser);

      expect(result).toEqual([]);
    });

    it('scopes the lookup by the authenticated user id only', async () => {
      repository.findAllByUserId.mockResolvedValue([mockEducation]);

      let passedUserId: string | undefined;
      repository.findAllByUserId.mockImplementation((userId: string) => {
        passedUserId = userId;
        return Promise.resolve([mockEducation]);
      });

      await service.listEducation(authenticatedUser);

      expect(passedUserId).toBe('1');
    });

    it('never exposes raw database keys or sec_user internals', async () => {
      repository.findAllByUserId.mockResolvedValue([mockEducation]);

      const result = await service.listEducation(authenticatedUser);

      expect(result[0]).not.toHaveProperty('education_id');
      expect(result[0]).not.toHaveProperty('profile_id');
      expect(result[0]).not.toHaveProperty('password_hash');
      expect(result[0]).not.toHaveProperty('user_id');
    });
  });

  describe('createEducation', () => {
    it("creates the education entry under the authenticated user's profile", async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createEducation.mockResolvedValue(mockEducation);

      const result = await service.createEducation(authenticatedUser, buildCreateDto());

      expect(repository.createEducation).toHaveBeenCalledWith(1n, buildCreateDto());
      expect(result).toEqual({
        educationId: '11',
        profileId: '1',
        degree: 'Bachelor of Science',
        institution: 'University of Dhaka',
        fieldOfStudy: 'Computer Science',
        grade: '3.82',
        startDate: mockEducation.start_date,
        endDate: mockEducation.end_date,
        isCurrent: false,
        description: null,
      });
    });

    it('never passes a client-supplied identifier to the repository', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createEducation.mockResolvedValue(mockEducation);

      let passedProfileId: bigint | undefined;
      let passedDto: CreateEducationDto | undefined;
      repository.createEducation.mockImplementation(
        (profileId: bigint, dto: CreateEducationDto) => {
          passedProfileId = profileId;
          passedDto = dto;
          return Promise.resolve(mockEducation);
        },
      );

      await service.createEducation(authenticatedUser, buildCreateDto());

      expect(passedProfileId).toBe(1n);
      expect(passedDto).not.toHaveProperty('profileId');
      expect(passedDto).not.toHaveProperty('userId');
      expect(passedDto).not.toHaveProperty('educationId');
    });

    it('throws NotFoundException when the account has no profile and skips the create', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(null);

      await expect(
        service.createEducation(authenticatedUser, buildCreateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.createEducation).not.toHaveBeenCalled();
    });

    it('converts a concurrent profile deletion (P2003) into NotFoundException', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createEducation.mockRejectedValue(buildForeignKeyViolation());

      await expect(
        service.createEducation(authenticatedUser, buildCreateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows non-constraint errors unchanged', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      const dbError = new Error('database down');
      repository.createEducation.mockRejectedValue(dbError);

      await expect(service.createEducation(authenticatedUser, buildCreateDto())).rejects.toBe(
        dbError,
      );
    });

    it('never exposes raw database keys in the created response', async () => {
      repository.findProfileIdByUserId.mockResolvedValue(1n);
      repository.createEducation.mockResolvedValue(mockEducation);

      const result = await service.createEducation(authenticatedUser, buildCreateDto());

      expect(result).not.toHaveProperty('education_id');
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('user_id');
    });
  });

  describe('updateEducation', () => {
    it('updates an entry owned by the authenticated user and returns the mapped row', async () => {
      repository.updateOwnedEducation.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue({
        ...mockEducation,
        institution: 'University of Cambridge',
      });

      const result = await service.updateEducation(authenticatedUser, '11', buildUpdateDto());

      expect(repository.updateOwnedEducation).toHaveBeenCalledWith('1', '11', buildUpdateDto());
      expect(repository.findOwnedById).toHaveBeenCalledWith('1', '11');
      expect(result.institution).toBe('University of Cambridge');
      expect(result.educationId).toBe('11');
    });

    it('scopes the update by the authenticated user id + education id', async () => {
      repository.updateOwnedEducation.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(mockEducation);

      let passedUserId: string | undefined;
      let passedEducationId: string | undefined;
      repository.updateOwnedEducation.mockImplementation((userId: string, educationId: string) => {
        passedUserId = userId;
        passedEducationId = educationId;
        return Promise.resolve(1);
      });

      await service.updateEducation(authenticatedUser, '11', buildUpdateDto());

      expect(passedUserId).toBe('1');
      expect(passedEducationId).toBe('11');
    });

    it('throws BadRequestException for an empty body and skips the update', async () => {
      const emptyDto = new UpdateEducationDto();

      await expect(
        service.updateEducation(authenticatedUser, '11', emptyDto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repository.updateOwnedEducation).not.toHaveBeenCalled();
      expect(repository.findOwnedById).not.toHaveBeenCalled();
    });

    it('treats an explicit null as a clear-field intent, not an empty body', async () => {
      repository.updateOwnedEducation.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue({ ...mockEducation, description: null });
      const dto = new UpdateEducationDto();
      // @IsOptional() skips validation for null at runtime (clearing a field),
      // even though the DTO's TypeScript type is string | undefined.
      dto.description = null as unknown as string;

      const result = await service.updateEducation(authenticatedUser, '11', dto);

      expect(repository.updateOwnedEducation).toHaveBeenCalledWith('1', '11', dto);
      expect(result.description).toBeNull();
    });

    it('throws NotFoundException when the entry is not owned or does not exist', async () => {
      repository.updateOwnedEducation.mockResolvedValue(0);

      await expect(
        service.updateEducation(authenticatedUser, '11', buildUpdateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.findOwnedById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the row disappears between update and fetch', async () => {
      repository.updateOwnedEducation.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(null);

      await expect(
        service.updateEducation(authenticatedUser, '11', buildUpdateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rethrows unknown errors unchanged', async () => {
      const dbError = new Error('database down');
      repository.updateOwnedEducation.mockRejectedValue(dbError);

      await expect(service.updateEducation(authenticatedUser, '11', buildUpdateDto())).rejects.toBe(
        dbError,
      );
    });

    it('never exposes raw database keys in the updated response', async () => {
      repository.updateOwnedEducation.mockResolvedValue(1);
      repository.findOwnedById.mockResolvedValue(mockEducation);

      const result = await service.updateEducation(authenticatedUser, '11', buildUpdateDto());

      expect(result).not.toHaveProperty('education_id');
      expect(result).not.toHaveProperty('profile_id');
      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('deleteEducation', () => {
    it('deletes an entry owned by the authenticated user and returns a success response', async () => {
      repository.deleteOwnedEducation.mockResolvedValue(1);

      const result = await service.deleteEducation(authenticatedUser, '11');

      expect(repository.deleteOwnedEducation).toHaveBeenCalledWith('1', '11');
      expect(result).toEqual({ message: 'Education deleted successfully.', data: null });
    });

    it('scopes the delete by the authenticated user id + education id', async () => {
      repository.deleteOwnedEducation.mockResolvedValue(1);

      let passedUserId: string | undefined;
      let passedEducationId: string | undefined;
      repository.deleteOwnedEducation.mockImplementation((userId: string, educationId: string) => {
        passedUserId = userId;
        passedEducationId = educationId;
        return Promise.resolve(1);
      });

      await service.deleteEducation(authenticatedUser, '11');

      expect(passedUserId).toBe('1');
      expect(passedEducationId).toBe('11');
    });

    it('throws NotFoundException when the entry is not owned or does not exist', async () => {
      repository.deleteOwnedEducation.mockResolvedValue(0);

      await expect(service.deleteEducation(authenticatedUser, '11')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns a success-only response — never the deleted row data', async () => {
      repository.deleteOwnedEducation.mockResolvedValue(1);

      const result = await service.deleteEducation(authenticatedUser, '11');

      expect(result.data).toBeNull();
      expect(result).not.toHaveProperty('education_id');
      expect(result).not.toHaveProperty('degree');
      expect(result).not.toHaveProperty('password_hash');
    });
  });
});
