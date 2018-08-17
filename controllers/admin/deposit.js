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
const Deposit = require('../../models/deposit');
const History = require('../../models/history');
const Partner = require('../../models/partner');
const OrderBuy = require('../../models/exchange/orderbuy').module();
const OrderSell = require('../../models/exchange/ordersell').module();
var forEach = require('async-foreach').forEach;
function ListDeposit(req, res){
	Deposit.find({}, (err, data)=>{
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
						res.render('admin/deposit', {
							title: 'Deposit',
							layout: 'layout_admin.hbs',
							history: data,
							total_btc : total_btc,
							total_eth : total_eth,
							total_xrp : total_xrp,
							total_usd : total_usd
						})
					)
				});
			}
			else
			{
				res.render('admin/deposit', {
					title: 'Deposit',
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
function ListHistoryBuySell(req, res){
	History.find({'$and' : [{'$or' : [{'type' : 'win'},{'type' : 'lose'}]},{'type_account' : '0'}]} ,(err,data)=>{
		if (err) {
			res.status(500).send({'message': 'data not found'});
		}else{
			var total_btc = 0;
			var total_usd = 0;
			if (data.length > 0)
			{
				forEach(data, function(value, index){
				
				var done = this.async();
					total_btc += parseFloat(value.amount);
					total_usd += parseFloat(value.amount_usd);
					done();
					data.length - 1 === index && (
						res.render('admin/historybuysell', {
							title: 'Deposit',
							layout: 'layout_admin.hbs',
							history: data,
							total_btc : total_btc,
							total_usd : total_usd,
						})
					)
				});
			}
			else
			{
				res.render('admin/historybuysell', {
					title: 'Deposit',
					layout: 'layout_admin.hbs',
					history: data,
					total_btc : total_btc,
					total_usd : total_usd,
				})
			}
		}
	}).limit(2000).sort({
		    "date": -1
		}); 
}

function ListHistoryBuySellAccount(req, res){
	History.find({'$and' : [{'$or' : [{'type' : 'win'},{'type' : 'lose'}]},{'type_account' : '0'},{'user_id' : req.params.Account_id}]} ,(err,data)=>{
		if (err) {
			res.status(500).send({'message': 'data not found'});
		}else
		{
			History.find({'$and' : [{'user_id' : req.params.Account_id},{'$or' : [{'type' : 'deposit'},{'type' : 'withdraw'}]}]} ,(errs,data_withdraw)=>{
				Partner.findOne({'account_id' : req.params.Account_id},function(err,data_parnert){
					User.findOne({'_id' : data_parnert.parent},function(errs,data_user){
						
						var total_btc = 0;
						var total_usd = 0;
						if (data.length > 0)
						{
							forEach(data, function(value, index){
							
							var done = this.async();
								total_btc += parseFloat(value.amount);
								total_usd += parseFloat(value.amount_usd);
								done();
								data.length - 1 === index && (
									res.render('admin/historybuysell_account', {
										title: 'Deposit',
										layout: 'layout_admin.hbs',
										history: data,
										total_btc : total_btc,
										total_usd : total_usd,
										data_withdraw : data_withdraw,
										Account_id : req.params.Account_id,
										user_account : data_user,
										data_parnert :data_parnert
									})
								)
							});
						}
						else
						{
							res.render('admin/historybuysell_account', {
								title: 'Deposit',
								layout: 'layout_admin.hbs',
								history: data,
								total_btc : total_btc,
								total_usd : total_usd,
								data_withdraw : data_withdraw,
								Account_id : req.params.Account_id,
								user_account : data_user,
								data_parnert : data_parnert
							})
						}
					})
				})		
			});
		}
	}).limit(2000).sort({
		    "date": -1
		}); 
}


function ListOrderBuy(req, res){
	OrderBuy.find({'$and' : [{'status' : '0'},{'robot' : '0'},{'type' : '0'}]} ,(err,data_buy)=>{
		OrderSell.find({'$and' : [{'status' : '0'},{'robot' : '0'},{'type' : '0'}]} ,(err,data_sell)=>{
			res.render('admin/buysell', {
				title: 'Buy Sell',
				layout: 'layout_admin.hbs',
				data_buy : data_buy,
				data_sell : data_sell
			})
		})
	})		
}

module.exports = {
	ListDeposit,
	ListHistoryBuySell,
	ListHistoryBuySellAccount,
	ListOrderBuy
}