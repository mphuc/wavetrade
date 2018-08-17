'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');
const Trading = require('./trading').module();
const Partner = require('../partner');
const User = require('../user');
var info = {
    socket: null,
    io: null,
    get sockets() {
        return {
        	socket : this.socket,
        	io : this.io
        };
    },
    set sockets (infoSocket) {
        this.socket = infoSocket[0] || null;
        this.io = infoSocket[1] || null;
    }
}

const OrderBuychema = new Schema({
	MarketName : String,
	amount : Number,
	account_id : String,
	status : String, // 0 watting //1 fininsh //3 cancel order
	type : String,
	robot : String,
	user_id :String,
	date: { type: Date, default: Date.now()}
})

.post('save', function (doc) {
	
	info.sockets.socket.broadcast.emit('OrderBuy:save', {
		account_id: doc.account_id,
		MarketName: doc.MarketName,
		amount: doc.amount,
		status: doc.status,
		_id: doc._id,
		date: moment(doc.date).format('MM/DD/YYYY LT')}
	);
	info.sockets.socket.emit('OrderBuy:save', {
		account_id: doc.account_id,
		MarketName: doc.MarketName,
		amount: doc.amount,
		status: doc.status,
		_id: doc._id,
		date: moment(doc.date).format('MM/DD/YYYY LT')}
	);

})/*
.post('remove', function (doc) {
	var array_push_market = [];
	var array_remove_buy = [];
	var array_remove_sell = [];
	var array_push_alls = [];
	array_remove_buy.push(doc);

	array_push_alls.push({
		'OrderBuy_remove' : array_remove_buy,
		'OrderSell_remove' : array_remove_sell,
		'MatchingOrder' : array_push_market
	});

	info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', array_push_alls);
	info.sockets.socket.emit('Buy_Sell_Matchings', array_push_alls);
	setTimeout(function() {
		info.sockets.socket.emit('Loadbalance', '');
	}, 100);
	
})*/


;

return module.exports = {
	infoSocket : function(socket, io){
		info.sockets = [socket, io];
	},
	module : function(){
		return mongoose.model('OrderBuy', OrderBuychema);
	}
}