'use strict'

const User = require('../../models/user');
const Withdraw = require('../../models/withdraw');
const Ticker = require('../../models/ticker');
const Invest = require('../../models/invest');
const IcoSum = require('../../models/icosum');
const Ico = require('../../models/ico');
const moment = require('moment');
const speakeasy = require('speakeasy');
const _ = require('lodash');
var forEach = require('async-foreach').forEach;

var config = require('../../config');
const bitcoin = require('bitcoin');
const Coinpayments = require('coinpayments');

const ClientCoinpayment = new Coinpayments({
	'key' : config.KeyCoinpayments,
	'secret' : config.SecretCoinpayments
}); 
const BBLclient = new bitcoin.Client({
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


function ListWithdraw(req, res){
	get_all_server(function(balance){
		if (!balance) balance = 0;
		Withdraw.find(
			{
			status: '0'
		}, (err, data)=>{
			if (err) {
				res.status(500).send({'message': 'data not found'});
			}else{
				// res.status(200).send(users);

				var total_btc = 0,total_usd = 0,total_eth = 0,total_xrp = 0;
				if (data.length > 0)
				{
					forEach(data, function(value, index){
						var done = this.async();
						if (value.type == 'BTC') total_btc += parseFloat(value.amount);
						if (value.type == 'ETH') total_eth += parseFloat(value.amount);
						if (value.type == 'XRP') total_xrp += parseFloat(value.amount);
						total_usd += parseFloat(value.amount_usd);
						done();
						data.length - 1 === index && (
							res.render('admin/withdraw', {
								title: 'Withdraw',
								layout: 'layout_admin.hbs',
								history: data,
								total_btc : total_btc,
								total_eth : total_eth,
								total_xrp : total_xrp,
								total_usd : total_usd
							})
						)
					})
				}
				else
				{
					res.render('admin/withdraw', {
						title: 'Withdraw',
						layout: 'layout_admin.hbs',
						history: data,
						total_btc : total_btc,
						total_eth : total_eth,
						total_xrp : total_xrp,
						total_usd : total_usd
					})
				}

					
			}
		})
	})
	
}

function get_all_server(callback)
{
	var data = {};
	get_balance_server(BTCclient,function(btc){
		data.btc = btc;
		get_balance_server(BBLclient,function(bbl){
			data.bbl = bbl;
			callback(data);
		})
	})
}

function get_balance_server(Client,callback)
{
	Client.getInfo(function(err,result){
		if (result) callback(result.balance);
		else callback(0)
	})
}


function ListWithdrawhistory(req, res){
	Withdraw.find({
		
	    status: '1'
	}, (err, data)=>{
		if (err) {
			res.status(500).send({'message': 'data not found'});
		}else{
			var total_btc = 0,total_usd = 0,total_eth = 0,total_xrp = 0;
			if (data.length > 0)
			{
				forEach(data, function(value, index){
					var done = this.async();
					if (value.type == 'BTC') total_btc += parseFloat(value.amount);
					if (value.type == 'ETH') total_eth += parseFloat(value.amount);
					if (value.type == 'XRP') total_xrp += parseFloat(value.amount);
					total_usd += parseFloat(value.amount_usd);
					done();
					data.length - 1 === index && (
						res.render('admin/withdraw_history', {
							title: 'Withdraw',
							layout: 'layout_admin.hbs',
							history: data,
							total_btc : total_btc,
							total_eth : total_eth,
							total_xrp : total_xrp,
							total_usd : total_usd
						})
					)
				})
			}
			else
			{
				res.render('admin/withdraw_history', {
					title: 'Withdraw',
					layout: 'layout_admin.hbs',
					history: data,
					total_btc : total_btc,
					total_eth : total_eth,
					total_xrp : total_xrp,
					total_usd : total_usd
				})
			}
		
		}
	})
}
function WithdrawEnlable(req, res){
	var id = req.query.id;
	if (id) {
		Withdraw.update({'_id':id},{ $set : {'confirm' : 1}},function(err,result){
			res.redirect('/qwertyuiop/admin/withdraw');
		})
	}
}
function WithdrawDisable(req, res){
	var id = req.query.id;
	if (id) {
		Withdraw.update({'_id':id},{ $set : {'confirm' : 0}},function(err,result){
			res.redirect('/qwertyuiop/admin/withdraw');
		})
	}
}

function SubmitWithdraw(req, res){
	var id = req.params.id;

	if (id) {
		Withdraw.findOne({'$and' : [{'status' : '0'},{'_id' : id}]},function(err,result){
			if (!err && result)
			{
				ClientCoinpayment.createWithdrawal({'currency' : result.type, 'amount' : parseFloat(result.amount).toFixed(8), 'address': result.wallet},function(errs,results){
					console.log(errs,results);
					if (!errs && results)
					{
						Withdraw.update({'_id' :id}, { $set : {'id_withdraw' :results.id,'txid' : 'Pending', 'status' : 1} }, function(err, data){
							res.redirect('/qwertyuiop/admin/withdraw');
						});
					}
					else
					{
						res.redirect('/qwertyuiop/admin/withdraw');
					}
				});
			}
			else
			{
				res.redirect('/qwertyuiop/admin/withdraw');
			}
		})
	}
	else
	{
		res.redirect('/qwertyuiop/admin/withdraw');
	}
}



module.exports = {
	ListWithdraw,
	ListWithdrawhistory,
	WithdrawEnlable,
	WithdrawDisable,
	SubmitWithdraw
}