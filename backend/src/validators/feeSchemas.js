import { z } from 'zod';

const createInvoiceSchema = z.object({
  studentId: z.string({ required_error: 'Student ID is required' }).uuid('Invalid student ID format'),
  amount: z.union([z.number(), z.string()]).refine(val => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, { message: 'Amount must be a valid positive number' }),
  month: z.union([z.number(), z.string()]).refine(val => {
    const num = Number(val);
    return Number.isInteger(num) && num >= 1 && num <= 12;
  }, { message: 'Month must be between 1 and 12' }),
  year: z.union([z.number(), z.string()]).refine(val => {
    const num = Number(val);
    return Number.isInteger(num) && num >= 2000 && num <= 2100;
  }, { message: 'Year must be between 2000 and 2100' }),
  dueDate: z.string().optional().nullable(),
  remarks: z.string().optional().nullable()
});

const recordPaymentSchema = z.object({
  invoiceId: z.string({ required_error: 'Invoice ID is required' }).uuid('Invalid invoice ID format'),
  amount: z.union([z.number(), z.string()]).refine(val => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, { message: 'Amount must be a valid positive number' }),
  paymentMode: z.string().optional(),
  referenceNo: z.string().optional(),
  remarks: z.string().optional().nullable()
});

export { createInvoiceSchema, recordPaymentSchema };
