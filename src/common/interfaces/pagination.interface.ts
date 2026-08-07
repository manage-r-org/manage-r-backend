/**
 * Pagination metadata returned alongside paginated list results.
 */
export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Generic paginated result wrapper.
 */
export interface IPaginatedResult<T> {
  items: T[];
  meta: IPaginationMeta;
}
