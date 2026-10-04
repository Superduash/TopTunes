const mongoose = require('mongoose');

const albumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Album title is required'],
    trim: true
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist',
    required: [true, 'Artist reference is required']
  },
  year: {
    type: Number,
    required: [true, 'Release year is required']
  },
  genre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
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

// Virtual populate for songs
albumSchema.virtual('songs', {
  ref: 'Song',
  localField: '_id',
  foreignField: 'album',
  options: { sort: { trackNumber: 1 } }
});

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;
