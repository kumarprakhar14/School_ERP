import { z } from 'zod';

const VALID_ROLES = ['TEACHER', 'STUDENT', 'ACCOUNTS', 'ADMIN', 'SUPER_ADMIN'];

const profileDataSchema = z.object({
  classId: z.string().uuid().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  admissionDate: z.string().optional(),
  designation: z.string().optional(),
  assignedSectionIds: z.array(z.string().uuid()).optional()
}).optional();

const createUserSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name cannot be empty'),
  role: z.enum(VALID_ROLES, { required_error: 'Role is required', invalid_type_error: `Role must be one of: ${VALID_ROLES.join(', ')}` }),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  schoolId: z.string().uuid('Invalid school ID format').optional(),
  profileData: profileDataSchema
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  erpId: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(VALID_ROLES).optional(),
  contactDetails: z.string().optional(),
  isPrimary: z.boolean().optional(),
  profileData: z.union([z.string(), profileDataSchema]).optional()
});

export { createUserSchema, updateUserSchema  };
