import academicCalendarService from '../services/academicCalendarService.js';

class AcademicCalendarController {
  
  async getTodayStatus(req, res, next) {
    try {
      const { schoolId } = req.user; // Assumes authMiddleware sets req.user.schoolId
      // Determine today's date in local time or use UTC based on requirement.
      // Using UTC for consistency:
      const today = new Date().toISOString().split('T')[0];
      
      const status = await academicCalendarService.getEffectiveStatus(schoolId, today);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async getStatusForDate(req, res, next) {
    try {
      const { schoolId } = req.user;
      const { date } = req.query; // Expecting YYYY-MM-DD
      
      if (!date) {
        return res.status(400).json({ success: false, message: 'Date query parameter is required.' });
      }

      const status = await academicCalendarService.getEffectiveStatus(schoolId, date);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async createOverride(req, res, next) {
    try {
      const { schoolId, id: userId } = req.user;
      const data = req.body;
      
      const override = await academicCalendarService.createOverride(schoolId, data, userId);
      res.status(201).json({ success: true, data: override });
    } catch (error) {
      if (error.message.includes('overlapping')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async updateOverride(req, res, next) {
    try {
      const { schoolId, id: userId } = req.user;
      const { id } = req.params;
      const data = req.body;

      const override = await academicCalendarService.updateOverride(id, schoolId, data, userId);
      res.status(200).json({ success: true, data: override });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('overlapping')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async deleteOverride(req, res, next) {
    try {
      const { schoolId } = req.user;
      const { id } = req.params;

      await academicCalendarService.deleteOverride(id, schoolId);
      res.status(200).json({ success: true, message: 'Override deleted successfully.' });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async listOverrides(req, res, next) {
    try {
      const { schoolId } = req.user;
      const filters = req.query; // Can include startDate, endDate

      const overrides = await academicCalendarService.listOverrides(schoolId, filters);
      res.status(200).json({ success: true, data: overrides });
    } catch (error) {
      next(error);
    }
  }
}

export default new AcademicCalendarController();
