import { IPaginatedResult } from './pagination.interface';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

/**
 * Generic repository interface defining standard CRUD operations.
 * All feature repositories should implement or extend this contract.
 *
 * @template T  - The entity type this repository manages.
 * @template CreateDto - DTO used for creation.
 * @template UpdateDto - DTO used for updates.
 */
export interface IRepository<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  findById(id: string): Promise<T | null>;
  findAll(pagination: PaginationQueryDto): Promise<IPaginatedResult<T>>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
