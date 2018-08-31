'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const Invest = require('../models/invest');
const service = require('../services');
const moment = require('moment');
const nodemailer = require('nodemailer');
const Ticker = require('../models/ticker');
var _ = require('lodash');
const bitcoin = require('bitcoin');
const Withdraw = require('../models/withdraw');
const Deposit = require('../models/deposit');
const bcrypt = require('bcrypt-nodejs');

var sendpulse = require("sendpulse-api");
var sendpulse = require("../models/sendpulse.js");
var config = require('../config'); 
var speakeasy = require('speakeasy');
const amqp = require('amqplib/callback_api');
var API_USER_ID= 'e0690653db25307c9e049d9eb26e6365';
var API_SECRET= '3d7ebbb8a236cce656f8042248fc536e';
var TOKEN_STORAGE="/tmp/";
const sendRabimq = require('../rabbit_comfim');
const Order = require('../models/order');
const History = require('../models/history');
const Transfer = require('../models/transfer');
var Mailgun = require('mailgun-js');
const Coinpayments = require('coinpayments');

const ClientCoinpayment = new Coinpayments({
	'key' : config.KeyCoinpayments,
	'secret' : config.SecretCoinpayments
}); 
const WAValidator = require('wallet-address-validator');




sendpulse.init(API_USER_ID,API_SECRET,TOKEN_STORAGE);

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

/*
STCclient.getInfo( function (err, data){
	console.log(data);
})
*/

function Balance(req,res){
	
	Withdraw.find({'user_id' : req.user._id},(err,result)=>{
		get_pedding_balance(req.user._id,function(data){
			check_pending_deposit(req.user._id,function(check_order){

				Ticker.findOne({},function(errtk,resulttk){
					res.locals.title = 'Wallet';
					res.locals.menu = 'balance';
					res.locals.user = req.user;
					res.locals.withdraw_history = result;
					res.locals.balance = data;
					res.locals.check_order = check_order;
					res.locals.ticker = resulttk;
					res.render('account/balance');
				});

					
			});
		});	
	});
}

function check_pending_deposit(user_id,callback){
	
	var check_order = {};
	check_order.btc = false;
	check_order.btg = false;
	
	Order.find({$and : [{'user_id' : user_id},{'status' : 0}]},(err,result_order)=>{
		(!err && result_order) && (
			result_order.forEach(function(item){
				if (item.method_payment == 'BTC')
					check_order.btc = true;
				if (item.method_payment == 'BTG')
					check_order.btg = true;
			})
		)
		callback(check_order);
	});
}

function get_pedding_balance(user_id,callback)
{
	var data = {};
	data.coin = 0;
	data.btc = 0;
	data.btg = 0;
	
	Deposit.find({$and : [{'user_id' : user_id}, { 'status': 0 }]},(err,result)=>{
		result.forEach(function(item){
			if (item.type == 'STC') data.coin += parseFloat(item.amount);
			if (item.type == 'BTG') data.btg += parseFloat(item.amount);
			if (item.type == 'BTC') data.btc += parseFloat(item.amount);
			
		});
		callback(data);
	});
}

function getWithdraw_user_pendding(req,res){
	Withdraw.find({$and : [{'user_id' : req.user._id}, { 'status': 0 }]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			new_data_user.push({
				'date': moment(result[i].date).format('MM/DD/YYYY LT'),
				'amount': (parseFloat(result[i].amount)).toFixed(8),
				'amount_usd': (parseFloat(result[i].amount_usd)).toFixed(2),
				'status' : 'Pending',
				'type' : result[i].type,
				'wallet' : result[i].wallet,
				'remove_order' : '<button class="remove_order" data-id="'+result[i]._id+'"> <i class="fa fa-times "></i> </button>'

			});
		}
		return res.status(200).send({result: new_data_user});
	});
}

function getDeposit_user_pendding(req,res){
	Deposit.find({$and : [{'user_id' : req.user._id}, { 'status': 0 }]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			var status = (result[i].status == 1) ? 'Finish' : 'Cancel';

			var confirms = result[i].type == 'STC' ? '/3' : '/1';

			var url_exchain = result[i].txid;
			if (result[i].type == 'BTC')
				url_exchain = '<a target="_blank" href="https://blockchain.info/tx/'+result[i].txid+'" >'+result[i].txid+'</a>';
			if (result[i].type == 'STC')
				url_exchain = result[i].txid;
			if (result[i].type == 'BTG')
				url_exchain = '<a target="_blank" href="https://btgexplorer.com/tx/'+result[i].txid+'" >'+result[i].txid+'</a>';
			

			new_data_user.push({
				'date': moment(result[i].date).format('MM/DD/YYYY LT'),
				'amount': (parseFloat(result[i].amount)/100000000).toFixed(8),
				'amount_usd': (parseFloat(result[i].amount_usd)).toFixed(2),
				'confirm' : result[i].confirm+confirms,
				'type' : result[i].type,
				'txid' : url_exchain

			});
		}

		return res.status(200).send({result: new_data_user});
	});
}

function getWithdraw_user_finish(req,res){
	Withdraw.find({$and : [{'user_id' : req.user._id}, {$or: [{ 'status': 1 },{ 'status': 8 }]}]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			var status = (result[i].status == 1) ? 'Finish' : 'Cancel';
			new_data_user.push({
				'date': moment(result[i].date).format('MM/DD/YYYY LT'),
				'amount': (parseFloat(result[i].amount)).toFixed(8),
				'amount_usd': (parseFloat(result[i].amount_usd)).toFixed(2),
				'status' : status,
				'type' : result[i].type,
				'txid' : result[i].txid

			});
		}

		return res.status(200).send({result: new_data_user});
	});
}

function getDeposit_user_finish(req,res){
	Deposit.find({$and : [{'user_id' : req.user._id}, {$or: [{ 'status': 1 },{ 'status': 8 }]}]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			var status = (result[i].status == 1) ? 'Finish' : 'Cancel';

			var url_exchain = result[i].txid;
			if (result[i].type == 'BTC')
				url_exchain = '<a target="_blank" href="https://blockchain.info/tx/'+result[i].txid+'" >'+result[i].txid+'</a>';
			if (result[i].type == 'WAVE')
				url_exchain = result[i].txid;
			if (result[i].type == 'ETH')
				url_exchain = '<a target="_blank" href="https://etherscan.io/tx/'+result[i].txid+'" >'+result[i].txid+'</a>';
			if (result[i].type == 'XRP')
				url_exchain = '<a target="_blank" href="https://xrpcharts.ripple.com/#/transactions/'+result[i].txid+'" >'+result[i].txid+'</a>';
			new_data_user.push({
				'date': moment(result[i].date).format('MM/DD/YYYY LT'),
				'amount': (parseFloat(result[i].amount)/100000000).toFixed(8),
				'amount_usd': (parseFloat(result[i].amount_usd)).toFixed(2),
				'status' : 'Finish',
				'type' : result[i].type,
				'txid' : url_exchain

			});
		}

		return res.status(200).send({result: new_data_user});
	});
}
function getHistoryTransfer(req,res){
	Transfer.find({$and : [{'user_id' : req.user._id}]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			new_data_user.push({
				'date': moment(result[i].date).format('MM/DD/YYYY LT'),
				'amount': result[i].type == 'Send' ? '<span style="color: red">-'+(parseFloat(result[i].amount)).toFixed(2)+'</span>' : '<span style="color: #2196F3">'+(parseFloat(result[i].amount)).toFixed(2)+'</span>',
				'detai': result[i].detai,
				'type': result[i].type == 'Send' ? '<span style="color: red">Send</span>' : '<span style="color: #2196F3">Receive</span>',
				'content': result[i].content,
				'amount_res': result[i].amount_res
			});
		}
		return res.status(200).send({result: new_data_user});
	});
}


var get_balance =function(user_id,callback){

	var balance = 0;
	User.findOne({'_id' : user_id},(err,data)=>{
		(!err && data)? callback(data.balance) : callback (balance) 
	})
}

function get_coin_details(name,callback){
	var data = {};
	if (name === 'BTC') { data.confirmations = 3,  data.free = 100000, data.client = BTCclient };
	if (name === 'BTG') { data.confirmations = 3,  data.free = 100000, data.client =  BTGclient };
	if (name === 'STC') { data.confirmations = 3,  data.free = 3000000, data.client =  STCclient };
	callback(data);
}

function check_wallet(type,wallet,callback){
	if (type == 'WAVE')
	{
		STCclient.validateAddress(wallet, function (err, valid) {
			err || !valid.isvalid ? callback(false) : callback(true)
		})
	}
	else
	{
		var valid_address = WAValidator.validate(wallet, type);
		callback(valid_address);
	}

}

function SubmitWithdraw(req,res){
	var address = req.body.address;
	var amount = parseFloat(req.body.amount_usd);
	var user = req.user;
	var type = req.body.currency;
	
	if (req.body.token_crt == req.session.token_crt)
	{	

		if ( !address)
			return res.status(404).send({message: 'Please enter address wallet '+type+'!'});
		if ( !amount || isNaN(amount) || amount < 10)
			return res.status(404).send({message: 'Please enter amount > 10 USD'});

		if (req.user.security.two_factor_auth.status == 1)
		{
			var verified = speakeasy.totp.verify({
		        secret: user.security.two_factor_auth.code,
		        encoding: 'base32',
		        token: req.body.authenticator
		    });
		    if (!verified) {
		    	return res.status(404).send({ message: 'The two-factor authentication code you specified is incorrect.'});
		    }
		}
		
		
		check_wallet(type,address,function(cb){
			cb ? (
				get_balance(user._id,function(ast_balance){
					if (parseFloat(ast_balance) < parseFloat(amount)) 
					{
						return res.status(404).send({error: 'amount', message: 'Ensure wallet has sufficient balance!'});
					}
					else
					{
						var string_sendrabit = user._id.toString()+'_'+amount.toString()+'_'+address.toString()+'_'+type.toString();
						sendRabimq.publish('','Withdraw',new Buffer(string_sendrabit));
						res.status(200).send({error: '', status: 1, message: 'Withdraw success'})	
					}
				})
			) : (
				res.status(404).send({message: 'Please enter address wallet '+type+''})
			)
		});
	}
}

function SubmitTransfer(req,res){
	var account = req.body.account;
	var amount = parseFloat(req.body.amount);
	var user = req.user;
	if (user.personal_info.status_doc == 1 || user.personal_info.status_doc == 2 || 1==1)
	{
		if (req.body.token_crt == req.session.token_crt)
		{	
			if ( !account)
				return res.status(404).send({message: 'Please enter email account'});
			if ( !amount || isNaN(amount) || amount < 10)
				return res.status(404).send({message: 'Please enter amount > 10'});

			if (req.user.security.two_factor_auth.status == 1)
			{
				var verified = speakeasy.totp.verify({
			        secret: user.security.two_factor_auth.code,
			        encoding: 'base32',
			        token: req.body.authenticator
			    });
			    if (!verified) {
			    	return res.status(404).send({ message: 'The two-factor authentication code you specified is incorrect.'});
			    }
			}
				
			User.findOne({
	            $and : [{active_email : 1}, { 'email': _.toLower(_.trim(account)) }]
	        }, function(err, user_receve) {
	        	if (!err && user_receve)
	        	{
	        		get_balance(user._id,function(ast_balance){
						if (parseFloat(ast_balance) < parseFloat(amount)) 
						{
							return res.status(404).send({error: 'amount', message: 'Ensure wallet has sufficient balance!'});
						}
						else
						{
							var new_ast_balance = (parseFloat(ast_balance) - parseFloat(amount)).toFixed(2);
							update_balace(new_ast_balance,user._id,function(cb){
								get_balance(user_receve._id,function(ast_balance_recever){
									var new_balance_reciver = (parseFloat(ast_balance_recever) + parseFloat(amount)).toFixed(2);
									update_balace(new_balance_reciver,user_receve._id,function(cb){

										let newTransfer = new Transfer();
										newTransfer.user_id= user._id;
										newTransfer.amount=  amount;
										newTransfer.date= new Date();
										newTransfer.detai= account;
										newTransfer.type= 'Send';
										newTransfer.content= req.body.content;
										newTransfer.amount_res= new_ast_balance;
										

										newTransfer.save((err, account_new)=>{

											let newTransfer = new Transfer();
											newTransfer.user_id= user_receve._id;
											newTransfer.amount=  amount;
											newTransfer.date= new Date();
											newTransfer.detai= user.email;
											newTransfer.type= 'Receive';
											newTransfer.content= req.body.content;
											newTransfer.amount_res= new_balance_reciver;

											newTransfer.save((err, account_new)=>{
												return res.status(200).send({
													message: 'Success'
												});
											});
										});
									})
								});
								
							})
								
						}
					})
	        	}
	        	else
	        	{
	        		return res.status(404).send({message: 'Account does not exist'});
	        	}
	        })			
		}
	}
	else
	{
		res.status(404).send({message:'Please Account verification'})
	}
}

var update_wallet = function(name ,wallet,user_id,callback){

	var obj = null;
	if (name === 'BTC') obj =  { 'wallet.bitcoin_wallet.cryptoaddress': wallet }
	if (name === 'ETH') obj =  {'wallet.ethereum_wallet.cryptoaddress' : wallet};
	if (name === 'XRP') obj = {'wallet.ripple_wallet.cryptoaddress': wallet};
	if (name === 'WAVE') obj = {'wallet.wavecoin_wallet.cryptoaddress': wallet};
	User.update({ _id :user_id }, { $set : obj }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}
var update_balace = function(new_ast_balance,user_id,callback){

	var obj = null;
	obj =  { 'balance': parseFloat(new_ast_balance) }
	
	User.update({ _id :user_id }, { $set : obj }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}

var newDepositObj = function(user, amount,amount_usd, address, type,confirms_needed,txn_id,timeout,status_url){
	var today = moment();
	return new Deposit({
		"user_id" : user._id,
		"amount" : amount,
		"amount_usd" : amount_usd, 
		"type" : type,
		"confirm" : 0,
		"username" : user.displayName,
		"wallet" : address,
		"txid" : '',
		"date": moment(today).format(),
		"status" : 0,
		"confirms_needed": confirms_needed,
		"txn_id":txn_id,
		"timeout": timeout,
		"status_url": status_url
	})
}

function get_new_address(name,user,callback){

	var wallet = '';
	if (name === 'BTC') wallet = user.wallet.bitcoin_wallet.cryptoaddress;
	if (name === 'ETH') wallet = user.wallet.ethereum_wallet.cryptoaddress;
	if (name === 'XRP') wallet = user.wallet.ripple_wallet.cryptoaddress;
	if (name === 'WAVE') wallet = user.wallet.wavecoin_wallet.cryptoaddress;

	wallet === "" ? (

		name == 'WAVE' ? (
			STCclient.getNewAddress('', function (err, address){
				err || !address ? (
					callback(null)
				) : (
					update_wallet(name,address,user._id,function(cb){
						cb ? callback(address) : callback(null)
					})
				)

			})
		) : (
			ClientCoinpayment.getCallbackAddress(name, function (err, response) {
				update_wallet(name,response.address,user._id,function(cb){
					cb ? callback(response.address) : callback(null)
				})
			})
		)
	):(
		callback(wallet)
	)

	

	/*ClientCoinpayment.createTransaction({'currency1' : 'USD',
	 'currency2' : name,
	 'amount' :amount,
	 'ipn_url' : 'http://192.254.73.26:31078/callback-coinpayment'
	},function(err,result){
		if (!err && result)
		{
			newDepositObj(user, result.amount, amount,result.address, name, result.confirms_needed,result.txn_id,result.timeout,result.status_url).save(( err, DepositStored)=>{
				err ? callback(null) : callback(result)
			})
		}
		else
		{
			callback(null);
		}
	});*/
}


function GetWallet (req,res){
	req.body.type ? (
		get_new_address(req.body.type,req.user,function(callback){
			callback === null ? (
				res.status(404).send({message:`Can't create new address. Please try again`})
			) : (
				res.status(200).send({ wallet: callback, message: 'Success!' })
			)
		})	
	) : res.status(404).send({message:`Can't create new address. Please try again`})
}

function create_token(req,res){
	var token_withdraw = _.replace(bcrypt.hashSync(new Date(), bcrypt.genSaltSync(8), null),'?','_');
	req.session.token_crt = token_withdraw;	
	return res.status(200).send({'token': token_withdraw});				
}

function Remove_Withdraw (req,res){
	var user = req.user;

	Withdraw.findOne(
	{ $and : [{_id : req.body.id},{status : 0}]},(err,data)=>{
		if(err){
			res.status(500).send({message: `Error al crear el usuario: ${err}`})
		}
		else
		{
			if (user._id == data.user_id)
			{
				var query = {_id:req.body.id};
				var data_update = {
					$set : {
						'status': 8
					}
				}
				Withdraw.update(query, data_update, function(err, Users){
					if (err)  return res.status(404).send({message:`Can't create new address. Please try again`})
					
					get_balance(data.user_id,function(ast_balance){
						var new_ast_balance = (parseFloat(ast_balance) + parseFloat(data.amount_usd)).toFixed(8);
						update_balace(new_ast_balance,data.user_id,function(cb){
							return res.status(200).send({
								message: 'Success'
							});
						})
					})

					
				});
			}
		}
	});

}

function CallbackCoinpayment(req,res){
	console.log(req.body);
	
	var tx = req.body.txn_id;
	var address = req.body.address;
	var amount = req.body.amount;
	var currency = req.body.currency;
	Deposit.findOne({'txid' : tx},function(err,result){
		if (!err && !result)
		{
			var string_sendrabit = tx.toString()+'_'+address.toString()+'_'+amount.toString()+'_'+currency.toString();
			sendRabimq.publish('','Deposit',new Buffer(string_sendrabit));
		}
		return res.status(200).send('Deposit');
	});
}


module.exports = {
	Balance,
	SubmitWithdraw,
	GetWallet,
	getWithdraw_user_pendding,
	getDeposit_user_pendding,
	getWithdraw_user_finish,
	getDeposit_user_finish,
	Remove_Withdraw,
	create_token,
	SubmitTransfer,
	getHistoryTransfer,
	CallbackCoinpayment
}