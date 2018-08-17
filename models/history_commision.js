'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const HistoryCommissionchema = new Schema({
	user_id : String,
	amount : String,
	date: { type: Date, default: Date.now() },
	detail : String,
	type : String,
	status : String
});



var HistoryCommission = mongoose.model('HistoryCommission', HistoryCommissionchema);
module.exports = HistoryCommission;