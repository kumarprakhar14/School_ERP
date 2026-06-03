import path from 'path';
import { importStudents, importTeachers } from '../services/importService.js';
import * as feeImportService from '../services/feeImportService.js';

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

const uploadFeesV2 = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const result = await feeImportService.uploadFees(req.user.schoolId, req.file.buffer, req.file.originalname);
    return res.status(200).json({ message: 'File uploaded and parsed successfully', ...result });
  } catch (error) {
    next(error);
  }
};

const validateFees = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.validateFees(jobId);
    return res.status(200).json({ message: 'Validation successful', status: result.status });
  } catch (error) {
    next(error);
  }
};

const matchFees = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.matchFees(jobId);
    return res.status(200).json({ 
      message: 'Matching complete', 
      status: result.status,
      matchedRows: result.matchedRows,
      ambiguousRows: result.ambiguousRows,
      unmatchedRows: result.unmatchedRows
    });
  } catch (error) {
    next(error);
  }
};

const reconcileMatching = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.reconcileMatching(jobId);
    return res.status(200).json({ message: 'Reconciliation complete', ...result });
  } catch (error) {
    next(error);
  }
};

const resolveAmbiguity = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { resolutions } = req.body; // Array of { rowNumber, resolvedStudentId }
    if (!resolutions || !Array.isArray(resolutions)) {
      return res.status(400).json({ message: 'resolutions must be an array' });
    }
    const result = await feeImportService.resolveAmbiguity(jobId, resolutions);
    return res.status(200).json({ message: 'Resolutions applied', ...result });
  } catch (error) {
    next(error);
  }
};

const getAmbiguousRows = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.getAmbiguousRows(jobId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const previewFees = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.previewFees(jobId);
    return res.status(200).json({ message: 'Preview generated', ...result });
  } catch (error) {
    next(error);
  }
};

const confirmFees = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const result = await feeImportService.confirmFees(jobId, req.user.id);
    return res.status(200).json({ message: 'Import confirmed and executed successfully', ...result });
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
    csvContent = 'ERP ID,Student Name,Father Name,Class Name,Section,Total Fee,Amount Paid,Month,Year,Payment Mode,Reference No,Remarks\nERP001,John Doe,Michale Doe,10,A,1500,1500,4,2024,ONLINE,TXN123,April fee\n';
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
  res.send(csvContent);
};

export { 
  uploadStudents,
  uploadTeachers,
  uploadFeesV2 as uploadFees,
  validateFees,
  matchFees,
  reconcileMatching,
  resolveAmbiguity,
  previewFees,
  confirmFees,
  getTemplate,
  getAmbiguousRows
};
