const { z } = require('zod');

const VALID_ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'ACCOUNTS', 'SUPER_ADMIN'];

const createNoticeSchema = z.object({
  title: z.string({ required_error: 'Title is required' }).min(1, 'Title cannot be empty'),
  content: z.string({ required_error: 'Content is required' }).min(1, 'Content cannot be empty'),
  targetRoles: z.array(z.enum(VALID_ROLES)).optional().default([])
});

module.exports = { createNoticeSchema };
