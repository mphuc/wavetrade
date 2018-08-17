'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');
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

const MarketHistorychema = new Schema({
	MarketName : String,
	quantity : String,
	price : String,
	total : String,
	user_id_buy : String,
	user_id_sell : String,
	status : String, 
	type : String,
	date: { type: Date, default: Date.now()},
});

MarketHistorychema.post('save', function (doc) {
	//info.sockets.io.sockets.in(doc.MarketName).emit('MatchingOrder', doc);
	/*process.socket.emit('Loadbalance', '');*/
});

return module.exports = {
	infoSocket : function(socket, io){
		info.sockets = [socket, io];
	},
	module : function(){
		return mongoose.model('MarketHistory', MarketHistorychema);
	}
}