import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';
import { IRepository } from '../../common/interfaces/repository.interface';
import { buildPaginatedResult, buildPaginationOptions } from '../../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Abstract base repository providing common pagination logic.
 *
 * Feature repositories extend this class and implement the full
 * IRepository contract using the injected PrismaService.
 *
 * @template T         - The domain entity type.
 * @template CreateDto - DTO for creation.
 * @template UpdateDto - DTO for updates.
 *
 * Usage:
 *   @Injectable()
 *   export class UsersRepository extends BaseRepository<User, CreateUserDto, UpdateUserDto> {
 *     constructor(prisma: PrismaService) { super(prisma); }
 *     ...
 *   }
 */
export abstract class BaseRepository<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>,
> implements IRepository<T, CreateDto, UpdateDto> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(pagination: PaginationQueryDto): Promise<IPaginatedResult<T>>;
  abstract create(data: CreateDto): Promise<T>;
  abstract update(id: string, data: UpdateDto): Promise<T>;
  abstract delete(id: string): Promise<void>;

  /**
   * Helper: build skip/take from a PaginationQueryDto.
   */
  protected getPaginationOptions(pagination: PaginationQueryDto): { skip: number; take: number } {
    return buildPaginationOptions(pagination);
  }

  /**
   * Helper: wrap items + total count into a standardised paginated result.
   */
  protected paginate<TItem>(
    items: TItem[],
    total: number,
    pagination: PaginationQueryDto,
  ): IPaginatedResult<TItem> {
    return buildPaginatedResult(items, total, pagination);
  }
}
