const mongoose = require('mongoose');

const playbackStateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  queue: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  currentIndex: {
    type: Number,
    default: 0
  },
  currentSong: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  },
  position: {
    type: Number,
    default: 0
  },
  shuffle: {
    type: Boolean,
    default: false
  },
  repeat: {
    type: String,
    enum: ['off', 'all', 'one'],
    default: 'off'
  },
  volume: {
    type: Number,
    default: 0.8,
    min: 0,
    max: 1
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }
      delete ret.__v;
      return ret;
    }
  }
});

const PlaybackState = mongoose.model('PlaybackState', playbackStateSchema);

module.exports = PlaybackState;
