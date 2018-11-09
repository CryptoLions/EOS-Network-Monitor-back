const { Schema } = require('mongoose');

const Unregistered = new Schema({
  name: {},
  name123: { type: String, index: true },
  unregisteredAt: { type: Date, index: true, default: Date.now },
  reregisteredAt: { type: Date },
}, { collection: 'Unregistered' });

module.exports = Unregistered;
