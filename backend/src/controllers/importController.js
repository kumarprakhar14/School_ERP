import path from 'path';
import { importStudents, importTeachers, importFees } from '../services/importService.js';

const handleImportResponse = (res, result, type) => {
  if (!result.success) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_import_errors.csv"`);
    return res.status(400).send(result.report);
  }
  
  return res.status(200).json({
    message: `${type} imported successfully`,
    count: result.count
  });
};

const uploadStudents = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const result = await importStudents(req.user.schoolId, req.file.buffer);
    return handleImportResponse(res, result, 'students');
  } catch (error) {
    next(error);
  }
};

const uploadTeachers = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const result = await importTeachers(req.user.schoolId, req.file.buffer);
    return handleImportResponse(res, result, 'teachers');
  } catch (error) {
    next(error);
  }
};

const uploadFees = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const result = await importFees(req.user.schoolId, req.file.buffer);
    return handleImportResponse(res, result, 'fees');
  } catch (error) {
    next(error);
  }
};

const getTemplate = (req, res) => {
  const { type } = req.params;
  const validTypes = ['students', 'teachers', 'fees'];
  
  if (!validTypes.includes(type)) {
    return res.status(404).json({ message: 'Template not found' });
  }

  // Define column headers for each template
  let csvContent = '';
  if (type === 'students') {
    csvContent = 'Student Name,Class,Section,Contact,Admission Date\nJohn Doe,10,A,1234567890,2023-04-01\n';
  } else if (type === 'teachers') {
    csvContent = 'Teacher Name,Designation,Contact,Assigned Sections\nJane Smith,Math Teacher,0987654321,"10-A, 10-B"\n';
  } else if (type === 'fees') {
    csvContent = 'Student Name,Class Name,Fee Amount,Month,Year,Status,Payment Mode,Reference No,Remarks\nJohn Doe,10,1500,4,2024,PAID,ONLINE,TXN123,April fee\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  res.send(csvContent);
};

export { uploadStudents,
  uploadTeachers,
  uploadFees,
  getTemplate
 };
