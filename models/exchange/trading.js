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

const Tradingchema = new Schema({
	amount : String,
	user_id : String, // 0 watting //1 fininsh //3 cancel order
	p_node : String,
    total_f1 : String,
	date: { type: Date, default: Date.now()}
});

return module.exports = {
	infoSocket : function(socket, io){
		info.sockets = [socket, io];
	},
	module : function(){
		return mongoose.model('Trading', Tradingchema);
	}
}