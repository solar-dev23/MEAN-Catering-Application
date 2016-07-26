'use strict';

import mongoose from 'mongoose';

var EventSchema = new mongoose.Schema({
  name: String,
  description: String,
  status: String,
  pricePerPerson: Number,
  people: Number,
  vegetarianMeals: Number,
  specialRequest: String,
  includedInPrice: Object,
  deliveryInstructions: String,
  location: String,
  userId: String,
  showToCaterers: Boolean,
  foodTypes: Object,
  serviceTypes: Object,
  date: Date,
  time: String,
  dateAccepted: Date,
  dateConfirmed: Date,
  selectedCaterers: Object,
  sentTo: Array,
  rejectedBy: Array,
  confirmedBy: String,
  isUpdated: Boolean,
  address: Object
});

export default mongoose.model('Event', EventSchema);
