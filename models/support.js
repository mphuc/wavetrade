'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const crypto = require('crypto');


const SupportSchema = new Schema({
    email: { type: String }, 
	account: String,
	subject: { type: String }, 
    date : { type: Date, default: Date.now() },
	message: { type: String }
});
var Support = mongoose.model('Support', SupportSchema);
module.exports = Support;