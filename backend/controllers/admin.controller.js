const adminService = require('../services/admin.service');
const ApiError = require('../utils/ApiError');

class AdminController {
  async createSong(req, res, next) {
    try {
      const song = await adminService.createSong(req.body);
      res.status(201).json({ status: 'success', data: { song } });
    } catch (error) {
      next(error);
    }
  }

  async updateSong(req, res, next) {
    try {
      const song = await adminService.updateSong(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: { song } });
    } catch (error) {
      next(error);
    }
  }

  async deleteSong(req, res, next) {
    try {
      const result = await adminService.deleteSong(req.params.id);
      res.status(200).json({ status: 'success', message: result.message, data: { id: result.id } });
    } catch (error) {
      next(error);
    }
  }

  async uploadAudio(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No audio file provided.');
      }
      const audioUrl = `/storage/audio/${req.file.filename}`;
      const song = await adminService.setAudioUrl(req.params.id, audioUrl);
      res.status(200).json({ status: 'success', data: { song, audioUrl } });
    } catch (error) {
      next(error);
    }
  }

  async uploadCover(req, res, next) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No image file provided.');
      }
      const coverUrl = `/storage/covers/${req.file.filename}`;
      const song = await adminService.setCoverUrl(req.params.id, coverUrl);
      res.status(200).json({ status: 'success', data: { song, coverUrl } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
