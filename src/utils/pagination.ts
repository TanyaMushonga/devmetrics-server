import { PaginationParams } from "../types";

export class PaginationUtil {
  static getPaginationParams(query: any): PaginationParams {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 10, 100); // Max 100 items per page
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  static getPaginationMeta(totalItems: number, page: number, limit: number) {
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
    };
  }
}
