import { z } from 'zod';

const VALID_BUG_STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

const submitBugSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  description: z.string({ required_error: 'Description is required' }).min(1, 'Description cannot be empty')
});

const updateBugStatusSchema = z.object({
  status: z.enum(VALID_BUG_STATUSES, { required_error: 'Status is required', invalid_type_error: `Status must be one of: ${VALID_BUG_STATUSES.join(', ')}` })
});

export { submitBugSchema, updateBugStatusSchema  };
