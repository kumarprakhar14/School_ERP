import attendanceReportService from '../services/reports/AttendanceReportService.js';
import feeReportService from '../services/reports/FeeReportService.js';

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await attendanceReportService.getSummary(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAttendanceRanking = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await attendanceReportService.getRanking(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getLowAttendance = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await attendanceReportService.getLowAttendance(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getChronicAbsentees = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await attendanceReportService.getChronicAbsentees(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getComparativeAttendance = async (req, res, next) => {
  // Placeholder for comparative logic implementation
  try {
    res.status(501).json({ message: 'Not Implemented Yet' });
  } catch (error) {
    next(error);
  }
};

export const getFeeCollectionSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await feeReportService.getCollectionSummary(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getFeePaymentMethods = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await feeReportService.getPaymentMethods(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getFeeDefaulters = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await feeReportService.getDefaulters(schoolId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
