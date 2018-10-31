const { Schema } = require('mongoose');

const Account = new Schema(
  {
    name: { type: String, index: true, unique: true },
    createdBy: String,
    createdAccounts: { type: [String], index: true },
    date: { type: Date, default: Date.now },
    balances: {
      EOS: { type: Number, default: 0.0 },
    },
    tokenData: {
      tokenSyncedAt: { type: Date, default: Date.now },
      tokens: [String],
    },
    mentionedIn: [String],
  },
  { collection: 'Account' },
);

module.exports = Account;
