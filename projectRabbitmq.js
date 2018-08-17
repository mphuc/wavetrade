'use strict'
const mongoose = require('mongoose');
const User = require('./models/user');
const service = require('./services');
const moment = require('moment');
const bitcoin = require('bitcoin');
var config = require('./config');
const amqp = require('amqplib/callback_api');
const Deposit = require('./models/deposit');
const Withdraw = require('./models/withdraw');
const Ticker = require('./models/ticker');
const Coinpayments = require('coinpayments');
const ClientCoinpayment = new Coinpayments({
	'key' : config.KeyCoinpayments,
	'secret' : config.SecretCoinpayments
}); 
var _ = require('lodash');

const STCclient = new bitcoin.Client({
	host: config.BBL.host,
	port: config.BBL.port,
	user: config.BBL.user,
	pass: config.BBL.pass,
	timeout: config.BBL.timeout
});

const BTCclient = new bitcoin.Client({
	host: config.BTC.host,
	port: config.BTC.port,
	user: config.BTC.user,
	pass: config.BTC.pass,
	timeout: config.BTC.timeout
});

const BTGclient = new bitcoin.Client({
	host: config.BTG.host,
	port: config.BTG.port,
	user: config.BTG.user,
	pass: config.BTG.pass,
	timeout: config.BTG.timeout
});

var getUser = function(id_user,callback){
	User.findById(id_user, function(err, user) {
		err || !user ? callback(null) : callback(user);
	});
}

var Create_Withdraw = function(name,user,amount,amount_btc, address,fee,callback){
	let newWithdraw = new Withdraw();	
	var today = moment();
	newWithdraw.amount = amount_btc;
	newWithdraw.amount_usd = amount;
	newWithdraw.user_id = user._id;
	newWithdraw.status = 0;
	newWithdraw.username = user.displayName;
	newWithdraw.wallet = address;
	newWithdraw.txid = '';
	newWithdraw.fee = fee;
	newWithdraw.date = moment(today).format();
	newWithdraw.type = name;
	newWithdraw.confirm = 0;
	newWithdraw.save((err, WithdrawStored)=>{
		err ? callback(false) : callback(true);
	});
}

var update_balace = function( new_ast_balance,user_id,callback){
	User.update({ _id :user_id }, { $set : {'balance' : parseFloat(new_ast_balance)} }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}

function process_withdraw(string_receiverabit,callback){

	var build_String = string_receiverabit.split("_");
	var id_user = build_String[0];
	var amount = parseFloat(build_String[1]);
	var address = build_String[2];
	var name = build_String[3];
	var numWallet = null;
	var free = 0

	getUser(id_user,function(user){
		if (user) {
			
			var ast_balance = parseFloat(user.balance);
			if (parseFloat(ast_balance) < parseFloat(amount)) {
				callback(false);
			}
			else{
				Ticker.findOne({},function(errtk,resulttk){
					var price_ticker;
					if (name == 'BTC') price_ticker = resulttk.btc;
					if (name == 'ETH') price_ticker = resulttk.eth;
					if (name == 'XRP') price_ticker = resulttk.xrp;
					if (name == 'WAVE') price_ticker = resulttk.wave;
					var amount_btc = ((parseFloat(amount)*0.98)/parseFloat(price_ticker)).toFixed(8);
					
					Create_Withdraw(name,user,amount,amount_btc,address,(parseFloat(amount)*0.02),function(cb){
						
						if (cb){
							var new_ast_balance = (parseFloat(ast_balance - parseFloat(amount))).toFixed(8);
							update_balace(new_ast_balance,user._id,function(calb){
								calb ? callback(true) : callback(false);
							})
						}
						else{
							callback(false);
						}
					})
				})
			}
		}
		else {
			callback(false);
		}
	});
};

var newDepositObj = function(data, amount, address, tx ,name,amount_usd){
	var today = moment();
	return new Deposit({
		"user_id" : data._id,
		"amount" : amount*100000000,
		"amount_usd" : amount_usd,
		"confirm" : 0,
		"username" : data.displayName,
		"wallet" : address,
		"txid" : tx,
		"type" : name,
		"date" : moment(today).format(),
		"status" : 1
	})
}	

var getNameCoin = function(name, address){
	if (name === 'BTC') return {'wallet.bitcoin_wallet.cryptoaddress' : address};
	if (name === 'ETH') return {'wallet.ethereum_wallet.cryptoaddress': address};
	if (name === 'XRP') return {'wallet.ripple_wallet.cryptoaddress': address};
	if (name === 'WAVE') return {'wallet.wavecoin_wallet.cryptoaddress': address};
	return {'wallet.dashcoin_wallet.cryptoaddress' : 'sdkjafhkjarthyiuertyiury'}
}

var fnFindAddress = function(name, amount, address,tx ,callback){
	User.findOne(getNameCoin(name,address)
	,function (err, data) {
		var new_balance;
		var amount_usd = 0;
		err || !data ? callback(false) : (
			Ticker.findOne({},function(errtk,resulttk){
				var amount_us
				if (name == 'BTC') amount_usd = parseFloat(resulttk.btc)*parseFloat(amount);
				if (name == 'ETH') amount_usd = parseFloat(resulttk.eth)*parseFloat(amount);
				if (name == 'XRP') amount_usd = parseFloat(resulttk.xrp)*parseFloat(amount);
				if (name == 'WAVE') amount_usd = parseFloat(resulttk.wave)*parseFloat(amount);
				newDepositObj(data, amount, address, tx, name,amount_usd).save(( err, DepositStored)=>{
					!err ? (
						new_balance = parseFloat(data.balance) + parseFloat(amount_usd),
						update_balace(new_balance,data._id,function(callbackss){
							callback(true)
						})
					) : callback(false)
				})
			})
		);
	});
}

var checkTxdepo = function(name, tx, callback){
	Deposit.count({
		$and : [
        {'txid' : tx}, 
        { 'type': name }]
    }, (err, sum) => {
    	err || sum > 0 ? callback(false) : callback(true);
	});
}


var process_deposit = function(string_rabbit,callback){
	var build_String = string_rabbit.split("_");
	var tx = build_String[0];
	var address = build_String[1];
	var amount = build_String[2];
	var name = build_String[3];

	checkTxdepo(name, tx, function(check){
		console.log(check);
		check ? (
			fnFindAddress(name, amount, address, tx, function(cb){
				callback(true) ;
			})
		) : callback(true);
	})		
};


function process_deposit(string_rabbit , callback){
	console.log("Deposit Rabbit");
	process_deposit(string_rabbit, function(cb){
		cb ? callback(true) : callback(false)
	});
			
}

var getTransaction = function(client , tx, callback){
	client.getTransaction(tx, function (err, transaction) {
		err || !transaction ? callback(null) : callback(transaction);
	})
}

var process_deposit_coins = function(name, client, tx ,callback){

	var details = null;
	getTransaction (client, tx, function(transaction){
		transaction !== null ? (
			
			details = transaction.details.filter(function (self) {
			    return self.category === 'receive'
			}),
			
			details.length > 0 ? (
				checkTxdepo(name, tx, function(check){
					console.log(check);
					check ? _.forEach(details, function(value,index ){
						console.log(value.amount , value.address);

						fnFindAddress(name, value.amount, value.address, tx, function(cb){
							details.length - 1 === index && callback(true) ;
						})

					}) : callback(true);
				})
			) : callback(false)
		) : callback(false)
	});			
};
function process_deposit_coin(tx , callback){
	console.log("Deposit COIN");
	process_deposit_coins('WAVE', STCclient , tx, function(cb){
		cb ? callback(true) : callback(false)
	});
			
}

module.exports = {
	process_withdraw,
	process_deposit,
	process_deposit_coin
	
}