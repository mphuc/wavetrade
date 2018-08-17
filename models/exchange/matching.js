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

const Matchingchema = new Schema({
	MarketName : String,
	history: {
        type: {
            open: { type: String, default: ""},
            close: { type: String, default: ""},
            hight: { type: String, default: ""},
            low: { type: String, default: ""},
            types: { type: String, default: ""},
            date: { type: Date, default: ""},
            created_on : { type: Date, default: ""}
        }
    },
    
    date: { type: Date, default: ""}
})

/*.post('update', function (doc) {

	this.findOne({'MarketName' : this._conditions.MarketName},function(err,result){
		console.log(result,"123123123");
		
	})
});*/
/*.post('save', function (doc) {
	info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:save', {
		user_id: doc.user_id,
		MarketName: doc.MarketName,
		quantity: doc.quantity,
		price: doc.price,
		subtotal: doc.subtotal,
		commission: doc.commission,
		total: doc.total,
		status: doc.status,
		_id: doc._id,
		date: moment(doc.date).format('MM/DD/YYYY LT')}
	);
	info.sockets.socket.emit('Loadbalance', '');
})
.post('remove', function (doc) {
	info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', doc);
	info.sockets.socket.emit('Loadbalance', '');
});*/

return module.exports = {
	infoSocket : function(socket, io){
		info.sockets = [socket, io];
	},
	module : function(){
		return mongoose.model('Matching', Matchingchema);
	}
}