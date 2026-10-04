const mongoose = require('mongoose');

const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Artist name is required'],
    unique: true,
    trim: true
  },
  bio: {
    type: String,
    default: '',
    trim: true
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

const Artist = mongoose.model('Artist', artistSchema);

module.exports = Artist;
