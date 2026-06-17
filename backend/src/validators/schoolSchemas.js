import { z } from 'zod';

const createSchoolSchema = z.object({
  name: z.string({ required_error: 'School name is required' }).min(1, 'School name cannot be empty'),
  code: z.string({ required_error: 'School code is required' }).min(1, 'School code cannot be empty'),
  validUntil: z.string({ required_error: 'Valid until date is required' }),
  themeColor: z.string().optional(),
  description: z.string().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().email('Invalid email format').optional(),
  adminPassword: z.string().min(6, 'Admin password must be at least 6 characters').optional()
});

const updateSchoolSchema = z.object({
  name: z.string().min(1, 'School name cannot be empty').optional(),
  validUntil: z.string().optional(),
  themeColor: z.string().optional(),
  description: z.string().optional()
});

const updateSchoolSettingsSchema = z.object({
  themeColor: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  merchantName: z.string().optional(),
  upiId: z.string().optional()
});

export { createSchoolSchema, updateSchoolSchema, updateSchoolSettingsSchema  };
