'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const moment = require('moment');
const bitcoin = require('bitcoin');
var config = require('../config');
const Deposit = require('../models/deposit');
const Withdraw = require('../models/withdraw');
const Trading = require('../models/exchange/trading').module();
const cron = require('node-cron');
var _ = require('lodash');
var sleep = require('sleep');
var forEach = require('async-foreach').forEach;
const HistoryCommission = require('../models/history_commision');

const Coinpayments = require('coinpayments');

const ClientCoinpayment = new Coinpayments({
	'key' : config.KeyCoinpayments,
	'secret' : config.SecretCoinpayments
}); 


cron.schedule('30 */10 * * * *', function(){
  Auto_Commission_User();
});

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

cron.schedule('30 */2 * * * *', function(){
	update_txid_widthdraw()
});

cron.schedule('0 */4 * * * *', function(){
  Auto_Confirm_Withdraw();
});

function update_status_deposit(_id,status,confirmations,callback){
	var query = {_id:_id};
	var data_update = {$set : {
		'status': status,
		'confirm' : confirmations
	}};
	Deposit.update(query, data_update, function(err, newUser){
		err ? callback(false) : callback(true)
	});
}

function update_status_withdraw(_id_wthidraw,status,callback)
{
	var query = {_id: _id_wthidraw};
	var data_update = {
		$set : {
			'status': status
		}
	};
	Withdraw.update(query, data_update, function(err, IcoUpdate){
		err ? callback(false) : callback(true)
	});
}

var update_balace = function( new_ast_balance,user_id,callback){

	var obj = null;
	obj =  { 'balance': parseFloat(new_ast_balance) }
	User.update({ _id :user_id }, { $set : obj }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}

var get_balance =function(user_id,callback){
	var balance = 0;
	User.findOne({'_id' : user_id},(err,data)=>{
		(!err && data)? (
			callback(data.balance)
		) : callback (balance) 
	})
}

function update_wallet_user(user_id,amount_usd,callback){
	
	get_balance(user_id,function(available){
		var new_ast_balance = parseFloat(available) + parseFloat(amount_usd);
		update_balace(new_ast_balance,user_id,function(cb){
			!cb ? callback(false) : callback(true);
		})
	})
		
}
function gettransaction(client,txid,callback){
	
	client.getTransaction(txid, function (err, data_transaction){
		err || !data_transaction ? callback(null) : callback(data_transaction.confirmations)
	});
}


function get_coin_details(name,callback){
	var data = {};
	if (name === 'BTC') { data.confirmations = 0,  data.free = 0.001, data.client = BTCclient };
	if (name === 'BTG') { data.confirmations = 3,  data.free = 0.001, data.client =  BTGclient };
	if (name === 'STC') { data.confirmations = 1,  data.free = 0.001, data.client =  STCclient };
	callback(data);
}
function Confirm_Deposit_async(item, cb){
	setTimeout(() => {
		get_coin_details(item.type,function(detail_coin){
			gettransaction(detail_coin.client,item.txid, function(confirmations){
				confirmations !== null ? (
					//&& parseFloat(item.amount) <= 20000000000 
					(parseInt(confirmations) >= parseInt(detail_coin.confirmations) ) ? (
						update_status_deposit(item._id,1,confirmations,function(callback){
							if (callback)
							{
								update_wallet_user(item.user_id,item.amount_usd,function(send_callback){
									console.log("update complete "+item.type+"");
									cb();
								});
							}
						})
					) : (
						update_status_deposit(item._id,0,0,function(callback){
							console.log(item.type , confirmations);
							cb();
						})
					)	
					
				) : (console.log("transaction "+item.type+" nul"),cb())
			})
		});
	}, 1000);
}



function Auto_Confirm_Deposit(){
	Deposit.find({'status' : 0},(err,result)=>{
		let requests;
		(err || !result) ?  console.log('Fail') : (

			requests = result.reduce((promiseChain, item) => {
			    return promiseChain.then(() => new Promise((resolve) => {
			    	
			      Confirm_Deposit_async(item, resolve);
			    }));
			}, Promise.resolve()),

			requests.then(() => console.log('done Auto_Confirm_Deposit'))
		)	
	});
}

var groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};
function get_withdraw_muti_address(name,callback){
	
	Withdraw.find({$and : [{'status' : 0},{'type' : name}]},(err,result)=>{
		var totals;
		err || !result ? callback(null) : (
			totals = result.reduce(function (r, o) {
			    (r[o.wallet])? r[o.wallet] += parseFloat(o.amount) : r[o.wallet] = parseFloat(o.amount);
			    return r;
			}, {}),
			callback(totals)
		)
	});
}

function sendMany(Client,account_send,muti_address,callback){
	Client.sendMany(account_send,muti_address,function (err, txid){
		console.log(err,txid,"send");
		err ? callback(null) : callback(txid)
	})
}

function update_confirm_withdraw(name,txid,callback){
	Withdraw.updateMany({
		$and : [{'type' : name},{'status' : 0}]
	}, { $set : {'txid' :txid, 'status' : 1} }, function(err, data){
		err ? callback(false) : callback(true);
	});
}

function withdraw(name,Client,account_send,callback){
	get_withdraw_muti_address(name,function(cb){

		cb === null || _.isEmpty(cb) ? callback(false) : (
			console.log(cb),
			sendMany(Client,account_send,cb,function(txid){
				txid !== null ? (
					update_confirm_withdraw(name,txid,function(result){
						callback(true)
					})
				):callback(false)
			})
		)
	});
}

function update_txid_Finish_async(item, cb){
	setTimeout(() => {
		ClientCoinpayment.getWithdrawalInfo(item.id_withdraw, function(err,result){
			if (!err && result)
			{
				console.log(err,result);
				if (result.status_text == 'Complete')
				{
					Withdraw.update({'_id' :item._id}, { $set : {'txid' : result.send_txid} }, function(err, data){
						cb();
					});
				}
				else if (result.status_text == 'Cancelled')
				{
					Withdraw.update({'_id' :item._id}, { $set : {'status' : 0, 'txid' :''} }, function(err, data){
						cb();
					});
				}
				else if (result.status_text == 'Pending')
				{
					cb();
				}
			}
			else
			{
			  	cb();
			} 
		})
	}, 100);
}

function update_txid_widthdraw(){
	let requests;
	Withdraw.find({$and : [{'status' : 1},{'txid' : 'Pending'}]},(err,result)=>{
		if (!err && result.length > 0)
		{
			requests = result.reduce((promiseChain, item) => {
			    return promiseChain.then(() => new Promise((resolve) => {
			      update_txid_Finish_async(item, resolve);
			    }));
			}, Promise.resolve()),
			requests.then(() => console.log('done Withdraw'))
		}
	});
}



function Auto_Confirm_Withdraw_BTC(req, res){
	withdraw('BTC',BTCclient,'exchange',function(cb){
		cb ? console.log('Send Success BTC') : console.log('Send Fail BTC')
	})
	sleep.sleep(1);
	res.redirect('/qwertyuiop/admin/withdraw');
}



function Auto_Commission_User()
{
	let requests;
	User.find({'balance_commision': {$gt: 0}},(err,data)=>{
		(!err && data.length > 0)? (
			requests = data.reduce((promiseChain, item) => {
			    return promiseChain.then(() => new Promise((resolve) => {
			      Update_Commision_Finish_async(item, resolve);
			    }));
			}, Promise.resolve()),
			requests.then(() => console.log('done Auto_Confirm_Deposit'))
		) : console.log('none')
	})
}

function Update_Commision_Finish_async(item, cb){
	setTimeout(() => {
		/*User.find({'$and' : [{'p_node' : item._id},{'betting': {$gte: 20000000}}]},function(ess,check_f1){
			if (!ess && check_f1.length >= 5)
			{*/
				User.findOne({'_id' : item._id},function(err,result){
					if (!err && result)
					{
						var new_ast_balance = parseFloat(result.balance) + (parseFloat(item.balance_commision))
						User.update({'_id' : item._id},{'$set' : {'balance_commision' : 0,'balance' : new_ast_balance}},function(errs,results){
							var today = moment();
							let newHistoryCommission = new HistoryCommission();
							newHistoryCommission.date = moment(today).format();
							newHistoryCommission.user_id = item._id;
							newHistoryCommission.amount = parseFloat(item.balance_commision).toFixed(8);
							newHistoryCommission.detai = 'Get '+(parseFloat(item.balance_commision)/100000000).toFixed(8)+' ETH from Network Commission';
							newHistoryCommission.type = 'Network Commission';
							newHistoryCommission.status = 'Finish';
							newHistoryCommission.save( (err) => {
								cb();
							})
						})
					}
					else
					{
						cb();
					}
				})
			/*}
			else
			{
				cb();
			}
		})*/
	}, 50);
}


function withdrawWAVE(callback){
	Withdraw.findOne({$and : [{'status' : 0},{'type' : 'WAVE'}]}, (e, o) => {  
	    if (e) {
	        callback(false)
	    } else {
	    	if (o) {
	    		var amount = parseFloat(o.amount);
		    	var wallet = o.wallet;
		    	STCclient.sendToAddress(wallet, amount, function (err, tx) {		
					if (err) {
						callback(false)
					}else{
						var querys = {_id: o._id};
						var data_updates = {
							$set : {
								'txid': tx,
								'status': 1
							}
						};
						Withdraw.update(querys, data_updates, function(err, WithdrawUpdate){
							callback(true)
						});
					}
				});
	    	}else{
	    		callback(false)
	    	}
	    	
	    }


	});	
}

function Auto_Confirm_Withdraw(){
	withdrawWAVE(function(cb){
		cb ? console.log('Send Success WAVE') : console.log('Send Fail WAVE')
	})	
}

module.exports = {
	Auto_Confirm_Withdraw_BTC
}