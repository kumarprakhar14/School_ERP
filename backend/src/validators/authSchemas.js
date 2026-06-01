const { z } = require('zod');

const loginSchema = z.object({
  erpId: z.string({ required_error: 'ERP ID is required' }).min(1, 'ERP ID cannot be empty'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
  schoolId: z.string().uuid('Invalid school ID format').optional()
});

module.exports = { loginSchema };
