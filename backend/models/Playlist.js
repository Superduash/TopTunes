const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    minlength: [1, 'Playlist name cannot be empty'],
    maxlength: [60, 'Playlist name must be at most 60 characters']
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  songs: [{
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  hue: {
    type: Number,
    default: 200
  },
  shape: {
    type: Number,
    default: 1
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

playlistSchema.index({ owner: 1 });

const Playlist = mongoose.model('Playlist', playlistSchema);

module.exports = Playlist;
