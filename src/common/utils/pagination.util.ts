import { IPaginatedResult, IPaginationMeta } from '../interfaces/pagination.interface';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '../constants/api.constants';

/**
 * Builds a pagination skip/take object from a PaginationQueryDto.
 */
export function buildPaginationOptions(pagination: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  const page = pagination.page ?? DEFAULT_PAGE;
  const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Constructs a paginated result object from raw items and count.
 */
export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  pagination: PaginationQueryDto,
): IPaginatedResult<T> {
  const page = pagination.page ?? DEFAULT_PAGE;
  const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;
  const totalPages = Math.ceil(total / limit);

  const meta: IPaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return { items, meta };
}
