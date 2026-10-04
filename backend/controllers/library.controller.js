const asyncHandler = require('../utils/asyncHandler');
const libraryService = require('../services/library.service');

const getLibrarySummary = asyncHandler(async (req, res) => {
  const summary = await libraryService.getLibrarySummary(req.user);
  res.status(200).json({
    data: summary
  });
});

const getLikedSongs = asyncHandler(async (req, res) => {
  const songs = await libraryService.getLikedSongs(req.user, req.query);
  res.status(200).json({
    data: songs
  });
});

const likeSong = asyncHandler(async (req, res) => {
  const result = await libraryService.likeSong(req.user, req.params.songId);
  res.status(200).json({
    data: result
  });
});

const unlikeSong = asyncHandler(async (req, res) => {
  const result = await libraryService.unlikeSong(req.user, req.params.songId);
  res.status(200).json({
    data: result
  });
});

const getSavedAlbums = asyncHandler(async (req, res) => {
  const albums = await libraryService.getSavedAlbums(req.user);
  res.status(200).json({
    data: albums
  });
});

const saveAlbum = asyncHandler(async (req, res) => {
  const result = await libraryService.saveAlbum(req.user, req.params.albumId);
  res.status(200).json({
    data: result
  });
});

const unsaveAlbum = asyncHandler(async (req, res) => {
  const result = await libraryService.unsaveAlbum(req.user, req.params.albumId);
  res.status(200).json({
    data: result
  });
});

const getRecentHistory = asyncHandler(async (req, res) => {
  const history = await libraryService.getRecentHistory(req.user);
  res.status(200).json({
    data: history
  });
});

const resetLibrary = asyncHandler(async (req, res) => {
  await libraryService.resetLibrary(req.user);
  res.status(204).send();
});

module.exports = {
  getLibrarySummary,
  getLikedSongs,
  likeSong,
  unlikeSong,
  getSavedAlbums,
  saveAlbum,
  unsaveAlbum,
  getRecentHistory,
  resetLibrary
};
