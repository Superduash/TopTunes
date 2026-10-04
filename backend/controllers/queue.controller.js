const asyncHandler = require('../utils/asyncHandler');
const queueService = require('../services/queue.service');

const getPlaybackState = asyncHandler(async (req, res) => {
  const state = await queueService.getPlaybackState(req.user);
  res.status(200).json({
    data: state
  });
});

const updatePlaybackState = asyncHandler(async (req, res) => {
  const state = await queueService.updatePlaybackState(req.user, req.body);
  res.status(200).json({
    data: state
  });
});

const addToQueue = asyncHandler(async (req, res) => {
  const { songId, next } = req.body;
  const state = await queueService.addToQueue(req.user, { songId, next: !!next });
  res.status(200).json({
    data: state
  });
});

const removeFromQueue = asyncHandler(async (req, res) => {
  const state = await queueService.removeFromQueue(req.user, req.params.songId);
  res.status(200).json({
    data: state
  });
});

const clearQueue = asyncHandler(async (req, res) => {
  await queueService.clearQueue(req.user);
  res.status(204).send();
});

module.exports = {
  getPlaybackState,
  updatePlaybackState,
  addToQueue,
  removeFromQueue,
  clearQueue
};
