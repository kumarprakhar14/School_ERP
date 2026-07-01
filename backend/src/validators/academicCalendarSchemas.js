import { z } from 'zod';

const createOverrideSchema = z.object({
  startDate: z.string().datetime({ message: 'Must be a valid ISO date' }),
  endDate: z.string().datetime({ message: 'Must be a valid ISO date' }),
  status: z.enum(['WORKING', 'HOLIDAY', 'VACATION']),
  reason: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.status === 'HOLIDAY' || data.status === 'VACATION') {
    if (!data.reason || data.reason.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required for HOLIDAY and VACATION',
        path: ['reason']
      });
    }
  }

  const start = new Date(data.startDate).getTime();
  const end = new Date(data.endDate).getTime();
  const today = new Date(new Date().toISOString().split('T')[0]).getTime();

  if (start < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate cannot be in the past',
      path: ['startDate']
    });
  }

  if (end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be greater than or equal to startDate',
      path: ['endDate']
    });
  }

  if ((data.status === 'WORKING' || data.status === 'HOLIDAY') && start !== end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'startDate and endDate must be the same for WORKING and HOLIDAY overrides',
      path: ['endDate']
    });
  }
});

const updateOverrideSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['WORKING', 'HOLIDAY', 'VACATION']).optional(),
  reason: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    const today = new Date(new Date().toISOString().split('T')[0]).getTime();

    if (start < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be in the past',
        path: ['startDate']
      });
    }

    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be greater than or equal to startDate',
        path: ['endDate']
      });
    }

    if ((data.status === 'WORKING' || data.status === 'HOLIDAY') && start !== end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate and endDate must be the same for WORKING and HOLIDAY overrides',
        path: ['endDate']
      });
    }
  }
});

export {
  createOverrideSchema,
  updateOverrideSchema
};
