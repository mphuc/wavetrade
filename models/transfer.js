'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const Transferchema = new Schema({
	user_id : String,
	amount : String,
	date: { type: Date, default: Date.now() },
	detai : String,
	type : String,
	content : String,
	amount_res : String
});



var Transfer = mongoose.model('Transfer', Transferchema);
module.exports = Transfer;