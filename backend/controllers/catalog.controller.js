const asyncHandler = require('../utils/asyncHandler');
const catalogService = require('../services/catalog.service');

const getSongs = asyncHandler(async (req, res) => {
  const result = await catalogService.getSongs(req.query, req.user);
  res.status(200).json({
    data: result.songs,
    meta: result.meta
  });
});

const getSongById = asyncHandler(async (req, res) => {
  const song = await catalogService.getSongById(req.params.id, req.user);
  res.status(200).json({
    data: song
  });
});

const recordPlay = asyncHandler(async (req, res) => {
  const { seconds } = req.body || {};
  const result = await catalogService.recordPlay(req.params.id, {
    seconds: typeof seconds === 'number' ? seconds : 0,
    user: req.user
  });
  res.status(200).json({
    data: result
  });
});

const getArtists = asyncHandler(async (req, res) => {
  const artists = await catalogService.getArtists();
  res.status(200).json({
    data: artists
  });
});

const getArtistById = asyncHandler(async (req, res) => {
  const artist = await catalogService.getArtistById(req.params.id, req.user);
  res.status(200).json({
    data: artist
  });
});

const getAlbums = asyncHandler(async (req, res) => {
  const albums = await catalogService.getAlbums(req.query, req.user);
  res.status(200).json({
    data: albums
  });
});

const getAlbumById = asyncHandler(async (req, res) => {
  const album = await catalogService.getAlbumById(req.params.id, req.user);
  res.status(200).json({
    data: album
  });
});

const getGenres = asyncHandler(async (req, res) => {
  const genres = await catalogService.getGenres();
  res.status(200).json({
    data: genres
  });
});

const getCatalog = asyncHandler(async (req, res) => {
  const catalog = await catalogService.getCatalog(req.user);
  res.status(200).json({
    data: catalog
  });
});

module.exports = {
  getSongs,
  getSongById,
  recordPlay,
  getArtists,
  getArtistById,
  getAlbums,
  getAlbumById,
  getGenres,
  getCatalog
};
