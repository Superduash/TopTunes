const asyncHandler = require('../utils/asyncHandler');
const searchService = require('../services/search.service');

const search = asyncHandler(async (req, res) => {
  const result = await searchService.search(req.query, req.user);
  res.status(200).json({
    data: result,
    meta: result.meta
  });
});

const getBrowse = asyncHandler(async (req, res) => {
  const result = await searchService.getBrowse(req.user);
  res.status(200).json({
    data: result
  });
});

const getMyStats = asyncHandler(async (req, res) => {
  const stats = await searchService.getMyStats(req.user);
  res.status(200).json({
    data: stats
  });
});

const getTopSongs = asyncHandler(async (req, res) => {
  const songs = await searchService.getTopSongs(req.query);
  res.status(200).json({
    data: songs
  });
});

module.exports = {
  search,
  getBrowse,
  getMyStats,
  getTopSongs
};
