import { z } from 'zod';

const VALID_STATUSES = ['PRESENT', 'ABSENT', 'LEAVE'];

const attendanceRecordSchema = z.object({
  studentId: z.string({ required_error: 'Student ID is required' }).uuid('Invalid student ID format'),
  status: z.enum(VALID_STATUSES, { required_error: 'Status is required', invalid_type_error: `Status must be one of: ${VALID_STATUSES.join(', ')}` })
});

const markAttendanceSchema = z.object({
  sectionId: z.string({ required_error: 'Section ID is required' }).uuid('Invalid section ID format'),
  date: z.string({ required_error: 'Date is required' }),
  records: z.array(attendanceRecordSchema, { required_error: 'Attendance records are required' }).min(1, 'At least one attendance record is required')
});

const attendanceStateSchema = z.object({
  sectionId: z.string({ required_error: 'Section ID is required' }).uuid('Invalid section ID format'),
  date: z.string({ required_error: 'Date is required' })
});

export { markAttendanceSchema, attendanceStateSchema  };
