const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSchema = new Schema({
  /**
   * The user who submitted the report. This creates a relationship
   * between the Report and User collections.
   */
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // This tells Mongoose to link to the 'User' model
    required: true,
  },
  
  hazardType: {
    type: String,
    required: true,
    enum: [
      'flood', 'high-waves', 'coastal-erosion', 'storm-surge', 'tsunami',
      'oil-spill', 'marine-debris', 'red-tide', 'infrastructure-damage', 'other'
    ]
  },
  
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  
  /**
   * The geographic location of the hazard. Using the GeoJSON format
   * is essential for performing geospatial queries.
   */
  location: {
    type: {
      type: String,
      enum: ['Point'], // The GeoJSON type must be 'Point'
      required: true
    },
    coordinates: {
      type: [Number], // Array of numbers: [longitude, latitude]
      required: true
    }
  },
  
  mediaUrl: {
    type: String,
    required: false
  },
  
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  
  // Information about the verification process
  verifiedById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  verifiedAt: {
    type: Date,
    required: false
  },
  rejectionReason: {
    type: String,
    trim: true,
    required: false
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

/**
 * Creates a geospatial index on the 'location' field.
 * This is CRITICAL for fast location-based queries, such as finding all
 * reports within a certain radius.
 */
reportSchema.index({ location: '2dsphere' });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;