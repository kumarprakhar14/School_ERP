import { z } from 'zod';

const createClassSchema = z.object({
  name: z.string({ required_error: 'Class name is required' }).min(1, 'Class name cannot be empty')
});

const createSectionSchema = z.object({
  name: z.string({ required_error: 'Section name is required' }).min(1, 'Section name cannot be empty')
});

const updateClassSchema = z.object({
  name: z.string({ required_error: 'Class name is required' }).min(1, 'Class name cannot be empty')
});

const updateSectionSchema = z.object({
  name: z.string({ required_error: 'Section name is required' }).min(1, 'Section name cannot be empty')
});

export { createClassSchema, createSectionSchema, updateClassSchema, updateSectionSchema  };
