import searchService from '../services/searchService.js';
import prisma from '../utils/db.js';
import { AppError } from '../errors/index.js';

class SearchController {
  async search(req, res, next) {
    try {
      const query = req.query.q || '';
      
      if (query.length < 3) {
        return res.status(200).json({}); // Do not search if less than 3 chars
      }

      // Perform the actual search using the service
      const results = await searchService.globalSearch(req.user, query);

      // Asynchronously log the search for analytics (fire and forget)
      prisma.searchLog.create({
        data: {
          query,
          role: req.user.role,
          schoolId: req.user.schoolId,
        }
      }).catch(err => console.error('[SearchLog Error]', err));

      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  }
}

export default new SearchController();
