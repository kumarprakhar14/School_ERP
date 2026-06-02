import { z } from 'zod';

const createAssignmentSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  description: z.string({ required_error: 'Description is required' }).min(1, 'Description cannot be empty'),
  dueDate: z.string({ required_error: 'Due date is required' }),
  sectionId: z.string({ required_error: 'Section ID is required' }).uuid('Invalid section ID format')
});

export { createAssignmentSchema  };
