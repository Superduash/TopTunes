const asyncHandler = require('../utils/asyncHandler');
const playlistService = require('../services/playlist.service');

const getPlaylists = asyncHandler(async (req, res) => {
  const playlists = await playlistService.getPlaylists(req.user);
  res.status(200).json({
    data: playlists
  });
});

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const playlist = await playlistService.createPlaylist(req.user, { name, description });
  res.status(201).json({
    data: playlist
  });
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const playlist = await playlistService.getPlaylistById(req.params.id, req.user);
  res.status(200).json({
    data: playlist
  });
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const playlist = await playlistService.updatePlaylist(req.params.id, req.user, { name, description });
  res.status(200).json({
    data: playlist
  });
});

const deletePlaylist = asyncHandler(async (req, res) => {
  await playlistService.deletePlaylist(req.params.id, req.user);
  res.status(204).send();
});

const addSongToPlaylist = asyncHandler(async (req, res) => {
  const songId = req.params.songId || req.body.songId;
  const playlist = await playlistService.addSongToPlaylist(req.params.id, songId, req.user);
  res.status(200).json({
    data: playlist
  });
});

const removeSongFromPlaylist = asyncHandler(async (req, res) => {
  const songId = req.params.songId || req.body.songId;
  const playlist = await playlistService.removeSongFromPlaylist(req.params.id, songId, req.user);
  res.status(200).json({
    data: playlist
  });
});

const getSuggestions = asyncHandler(async (req, res) => {
  const suggestions = await playlistService.getSuggestions(req.params.id, req.user, {
    limit: req.query.limit
  });
  res.status(200).json({
    data: suggestions
  });
});

module.exports = {
  getPlaylists,
  createPlaylist,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getSuggestions
};
