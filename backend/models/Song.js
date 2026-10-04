const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: [true, 'Artist is required']
  },
  album: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album'
  },
  genre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
  },
  duration: {
    type: Number,
    required: [true, 'Duration in seconds is required'],
    min: [1, 'Duration must be at least 1 second']
  },
  trackNumber: {
    type: Number,
    default: 1
  },
  available: {
    type: Boolean,
    default: true
  },
  playCount: {
    type: Number,
    default: 0,
    min: 0
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hue: {
    type: Number,
    default: 0
  },
  shape: {
    type: Number,
    default: 0
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

// Indexes for high performance search, filter, and sorting
songSchema.index({ title: 'text' });
songSchema.index({ artist: 1 });
songSchema.index({ album: 1, trackNumber: 1 });
songSchema.index({ genre: 1 });
songSchema.index({ playCount: -1 });
songSchema.index({ available: 1 });

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
