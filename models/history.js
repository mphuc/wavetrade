'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const Historychema = new Schema({
	user_id : String,
	amount : String,
	date: { type: Date, default: Date.now() },
	detai : String,
	type : String,
	code : String,
	symbol : String,
	profit : String,
	buysell : String,
	type_account : String,
	balance_res : String
});



var History = mongoose.model('History', Historychema);
module.exports = History;