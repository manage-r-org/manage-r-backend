import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { BaseRepository } from '../../database/repositories/base.repository';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { IPaginatedResult } from '../../common/interfaces/pagination.interface';

/**
 * RolesRepository — placeholder.
 * Replace `unknown` generics with real entity types once Prisma models are defined.
 */
@Injectable()
export class RolesRepository extends BaseRepository<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  findById(_id: string): Promise<unknown> {
    return Promise.resolve(null);
  }

  findAll(_pagination: PaginationQueryDto): Promise<IPaginatedResult<unknown>> {
    return Promise.resolve({
      items: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
  }

  create(_data: Partial<unknown>): Promise<unknown> {
    return Promise.resolve(null);
  }

  update(_id: string, _data: Partial<unknown>): Promise<unknown> {
    return Promise.resolve(null);
  }

  delete(_id: string): Promise<void> {
    return Promise.resolve();
  }
}
