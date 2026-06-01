import { z } from 'zod';

const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const createSubjectSchema = z.object({
  name: z.string({ required_error: 'Subject name is required' }).min(1, 'Subject name cannot be empty'),
  code: z.string().optional()
});

const createPeriodSchema = z.object({
  name: z.string({ required_error: 'Period name is required' }).min(1, 'Period name cannot be empty'),
  startTime: z.string({ required_error: 'Start time is required' }),
  endTime: z.string({ required_error: 'End time is required' })
});

const updatePeriodSchema = z.object({
  name: z.string().min(1, 'Period name cannot be empty').optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional()
});

const createTimeTableEntrySchema = z.object({
  classId: z.string({ required_error: 'Class ID is required' }).uuid('Invalid class ID format'),
  sectionId: z.string().uuid('Invalid section ID format').optional().nullable(),
  subjectId: z.string({ required_error: 'Subject ID is required' }).uuid('Invalid subject ID format'),
  teacherId: z.string({ required_error: 'Teacher ID is required' }).uuid('Invalid teacher ID format'),
  periodId: z.string({ required_error: 'Period ID is required' }).uuid('Invalid period ID format'),
  dayOfWeek: z.enum(VALID_DAYS, { required_error: 'Day of week is required', invalid_type_error: `Day must be one of: ${VALID_DAYS.join(', ')}` })
});

export { createSubjectSchema, createPeriodSchema, updatePeriodSchema, createTimeTableEntrySchema  };
