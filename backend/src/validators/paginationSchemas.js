import { z } from 'zod';

/**
 * Canonical pagination query schemas.
 * Use with validate({ query: paginationQuerySchema }) or extended schemas.
 * Defaults: page 1, limit 20, max 100.
 * Enforces numeric coercion — ?page=abc → 400.
 */

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginatedSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(), // alias
  sortBy: z.string().trim().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Extended for fee summary/history with domain filters
export const feeSummaryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['NO_FEES', 'PAID', 'PARTIALLY_PAID', 'PENDING', 'OVERDUE']).optional(),
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'totalAmount', 'dueAmount', 'dueDate', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const feeHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(['SUCCESS', 'PENDING_VERIFICATION', 'REJECTED']).optional(),
  paymentMode: z.string().trim().max(20).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'invoiceNumber']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Reports defaulters/low-attendance share ReportEngine filters + pagination
export const reportPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // ReportEngine handles preset/startDate/endDate/classId/sectionId separately
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().trim().max(50).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  threshold: z.coerce.number().min(0).max(100).optional(), // low-attendance
});

export const billingOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  sortBy: z.enum(['createdAt', 'amount']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});
