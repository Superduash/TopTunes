const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Genre name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: [true, 'Genre slug is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  color: {
    type: String,
    default: '#ffb224'
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

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;
