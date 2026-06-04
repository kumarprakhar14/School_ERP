import dashboardService from '../services/dashboardService.js';

const getDashboardStats = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const stats = await dashboardService.getAdminDashboardStats(schoolId);
      return res.json(stats);
    }

    if (role === 'STUDENT') {
      const stats = await dashboardService.getStudentDashboardStats(req.user.userId, schoolId);
      return res.json(stats);
    }

    res.json({});
  } catch (error) {
    next(error);
  }
};

const getAccountsDashboardStats = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const stats = await dashboardService.getAccountsDashboardStats(schoolId);
    return res.json(stats);
  } catch (error) {
    next(error);
  }
};

export { getDashboardStats, getAccountsDashboardStats };
