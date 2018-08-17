'use strict'
const mongoose = require('mongoose');
const User = require('../../models/user');
const OrderBuy = require('../../models/exchange/orderbuy').module();
const OrderSell = require('../../models/exchange/ordersell').module();
const MarketHistory = require('../../models/exchange/markethistory').module();
const Volume = require('../../models/exchange/volume').module();
const request = require('request');
const bitcoin = require('bitcoin');
const amqp = require('amqplib/callback_api');
const sendRabimq = require('../../rabbit_comfim');
const moment = require('moment');
const Ticker = require('../../models/ticker');
const Partner = require('../../models/partner');
const History = require('../../models/history');
const _ = require('lodash');
const Matching = require('../../models/exchange/matching').module();

const cron = require('node-cron');
cron.schedule('0 * * * *', function(){
	//sendRabimq.publish('','Reset_Chart_Item',new Buffer(''));
});
function Indexs(req,res) {
	Partner.find({'$and' : [{'parent' : req.user._id},{'account_id' : req.params.AccountID}]} ,(err,check_from_id)=>{	
		if (parseInt(check_from_id.length) > 0)
		{
			req.session.AccountID = req.params.AccountID;
			res.redirect('/exchange/account');
		}
		else
		{
			res.redirect('/logout')
		}
	});
}
function Index(req,res) {
	ger_user(req.session.userId,function(result){
		res.locals.user = result,
		res.locals.title = 'Exchange',
		res.locals.exchange1 = 'Bitcoin',
		res.locals.exchange2 = 'EURUSD',//'EURUSD',
		res.locals.menu = 'exchange',
		res.locals.AccountID = req.params.AccountID,
		res.locals.partner = req.partner,
		res.locals.layout = 'layout_exchange.hbs'
		res.render('exchange/market')
	});
		
}

function ger_user(userId,callback){
	User.findOne({_id :userId},(err,result)=>{
		err || !result ? callback(null) : callback(result);
	})
}

var get_balance =function(account_id,callback){
	var balance = 0;
	Partner.findOne({'account_id' : account_id},(err,data)=>{
		(!err && data)? (
			callback(data.balance)
		) : callback (balance) 
	})
}
var update_balace = function(new_ast_balance,account_id,callback){
	var obj = null;
	obj =  { 'balance': parseFloat(new_ast_balance) }
	Partner.update({ 'account_id' :account_id }, { $set : obj }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}
function SubmitBuy(req,res) {
	if (req.body.MarketName && req.body.amount  && parseFloat(req.body.amount) >= 1 )
	{
		req.session.token_crt = 'sdadasdasdasd';
		var MarketName = req.body.MarketName;
		var amount = parseFloat(req.body.amount).toFixed(8);
		get_balance(req.partner.account_id,function(balance){
        	if (parseFloat(balance) >= amount)
        	{
        		var string_sendrabit = MarketName.toString()+'_'+amount.toString()+'_'+req.partner.account_id.toString()+'_'+req.partner.type.toString()+'_'+req.user._id.toString();
				sendRabimq.publish('','Exchange_Buy',new Buffer(string_sendrabit));
				return res.status(200).send();
        	}
        	else
        	{
        		return res.status(401).send({ message : 'Balance is not enough!' });
        	}
        })
	}
	else
	{
		return res.status(401).send({ message : '' });
	}
}

function SubmitSell(req,res) {
	if (req.body.MarketName && req.body.amount  && parseFloat(req.body.amount) >= 1 )
	{
		req.session.token_crt = 'sdadasdasdasd';
		var MarketName = req.body.MarketName;
		var amount = parseFloat(req.body.amount).toFixed(8);
		get_balance(req.partner.account_id,function(balance){
        	if (parseFloat(balance) >= amount)
        	{
        		var string_sendrabit = MarketName.toString()+'_'+amount.toString()+'_'+req.partner.account_id.toString()+'_'+req.partner.type.toString()+'_'+req.user._id.toString();
				sendRabimq.publish('','Exchange_Sell',new Buffer(string_sendrabit));
				return res.status(200).send();
        	}
        	else
        	{
        		return res.status(401).send({ message : 'Balance is not enough!' });
        	}
        })
	}
	else
	{
		return res.status(401).send({ message : '' });
	}
}
function CancelOrder(req,res) {
	
	if (req.body.data)
	{	
		var string_sendrabit = (req.body.data).toString()+'_'+req.user._id.toString();

		console.log(string_sendrabit);

		sendRabimq.publish('','Cancel_Exchange_Open',new Buffer(string_sendrabit));
		return res.status(200).send();
	}
	else
	{
		return res.status(404).send();
	}
	
}



function LoadOrder_buyAll(req,res){
	var query_search = {
		"user_id": {
	        "$not": {
	            "$in": ["5a55ce6590928d62738e9949"]
	        }
	    },
	    'MarketName' : req.query.MarketName,
	    'status': 0 
	};
	
	req.session.userId && (
		req.session.userId == '5a55ce6590928d62738e9949' && (
			query_search = { $and : [{'MarketName' : req.query.MarketName},{'status': 0 }]}
		)
	); 
	OrderBuy.find(query_search,{ _id: 1,user_id: 1, MarketName: 1 , quantity : 1, price : 1, total : 1},(err,result)=>{
		return res.status(200).send({result: result});
	});
}

function LoadOrder_sellAll(req,res){
	var query_search = {
		"user_id": {
	        "$not": {
	            "$in": ["5a55ce6590928d62738e9949"]
	        }
	    },
	    'MarketName' : req.query.MarketName,
	    'status': 0 
	};
	
	req.session.userId && (
		req.session.userId == '5a55ce6590928d62738e9949' && (
			query_search = { $and : [{'MarketName' : req.query.MarketName},{'status': 0 }]}
		)
	); 
	
	OrderSell.find(query_search,{_id: 1, user_id: 1, MarketName: 1 , quantity : 1, price : 1, total : 1},(err,result)=>{
		return res.status(200).send({result: result});
	});
}

function LoadOrder_Open_id(req,res){
	OrderBuy.find({$and : [{'MarketName' : req.query.MarketName}, { 'status': 0 }, { 'user_id': req.user._id }]},(err,result)=>{
		var new_data_user = [];
		for (var i = result.length - 1; i >= 0; i--) {
			new_data_user.push({
				'date' : moment(result[i].date).format('MM/DD/YYYY LT'),
				'type' : 'Buy',
				'price': (parseFloat(result[i].price)/100000000).toFixed(8),
				'quantity': (parseFloat(result[i].quantity)/100000000).toFixed(8),
				'commission' : (parseFloat(result[i].commission)/100000000).toFixed(8),
				'total' : (parseFloat(result[i].total)/100000000).toFixed(8),
				'remove' : result[i]._id+'_Buy'
			});
		}
		OrderSell.find({$and : [{'MarketName' : req.query.MarketName}, { 'status': 0 }, { 'user_id': req.user._id }]},(err,results)=>{
			for (var i = results.length - 1; i >= 0; i--) {
				new_data_user.push({
					'date' : moment(results[i].date).format('MM/DD/YYYY LT'),
					'type' : 'Sell',
					'price': (parseFloat(results[i].price)/100000000).toFixed(8),
					'quantity': (parseFloat(results[i].quantity)/100000000).toFixed(8),
					'commission' : (parseFloat(results[i].commission)/100000000).toFixed(8),
					'total' : (parseFloat(results[i].total)/100000000).toFixed(8),
					'remove' : results[i]._id+'_Sell'
				});
			}

			return res.status(200).send({result: new_data_user});
		})
		
	});
}
function ReloadBalance(req,res){
	return res.status(200).send({'balance' : parseFloat(req.partner.balance)});
}

function LoadMarketHistory(req,res){
	if (req.query.MarketName)
	{
		MarketHistory.find({'MarketName' : req.query.MarketName},{ MarketName: 1 , quantity : 1, price : 1, total : 1 , type: 1,date: 1},(err,result)=>{
			return res.status(200).send({result: result});
		}).limit(2000).sort({
		    "date": -1
		});
	}
	else
	{
		return res.status(404).send();
	}
	
}

function LoadMyMarketHistory(req,res){
	if (req.query.MarketName)
	{
		MarketHistory.find({ $and : [
			{'MarketName' : req.query.MarketName},
			{
				$or : [{'user_id_buy' : req.user._id},{'user_id_sell' : req.user._id}]
			}]
		} ,(err,result)=>{
			return res.status(200).send({result: result});
		}).limit(2000).sort({
		    "date": -1
		}); 
	}
	else
	{
		return res.status(404).send();
	}
}

function LoadVolume(req,res){


	Ticker.findOne({}, function(err,data){

		var usd;
		if (req.query.MarketName.split("-")[0] == 'BTC')
			usd = data.btc.usd;
		if (req.query.MarketName.split("-")[0] == 'BCC')
			usd = data.bcc.usd;
		if (req.query.MarketName.split("-")[0] == 'BCH')
			usd = data.bch.usd;
		if (req.query.MarketName.split("-")[0] == 'BTG')
			usd = data.btg.usd;
		if (req.query.MarketName.split("-")[0] == 'ETH')
			usd = data.eth.usd;
		if (req.query.MarketName.split("-")[0] == 'LTC')
			usd = data.ltc.usd;
		if (req.query.MarketName.split("-")[0] == 'DASH')
			usd = data.dash.usd;
		if (req.query.MarketName.split("-")[0] == 'STC')
			usd = data.coin.usd;
		if (req.query.MarketName.split("-")[0] == 'XZC')
			usd = data.xzc.usd;
		
		Volume.findOne({'MarketName' : req.query.MarketName},(err,result)=>{
			return res.status(200).send({result: result,usd : usd});
		}); 	
	})
}

function load_ticker(req,res){
	Ticker.findOne({}, function(err,data){
		return res.status(200).send({result: data});
	});
}

function LoadBuySell(req,res){
	OrderBuy.findOne({$and : [{'MarketName' : req.body.exchange}, { 'status': 0 }, { 'account_id': req.partner.account_id }]},(err,result)=>{
		var amount_buy = 0;
		amount_buy = !err && result ? parseFloat(result.amount) : 0;
		var amount_sell = 0;
		OrderSell.findOne({$and : [{'MarketName' : req.body.exchange}, { 'status': 0 }, { 'account_id': req.partner.account_id }]},(errs,results)=>{
			amount_sell = !errs && results ? parseFloat(results.amount) : 0;
			return res.status(200).send({'amount_buy': amount_buy,'amount_sell' :amount_sell});
		})
	});
}

function loadchartpie(req,res){
	OrderBuy.find({$and : [{'MarketName' : req.body.exchange}, { 'status': 0 }]},(err,result)=>{
		var amount_buy = 0;
		
		for (var i = result.length - 1; i >= 0; i--) {
			amount_buy += parseFloat(result[i].amount);
		}	
		var amount_sell = 0;
		OrderSell.find({$and : [{'MarketName' : req.body.exchange}, { 'status': 0 }]},(err,results)=>{
			for (var i = results.length - 1; i >= 0; i--) {
				amount_sell += parseFloat(results[i].amount);
			}
			return res.status(200).send({'total_buy': amount_buy,'total_sell': amount_sell});
		})
	});
}

function LoadChartPinItem(req,res){
	Matching.findOne({'MarketName' : req.body.exchange},(err,result_all)=>{
		if (!err && result_all.history)
		{
			var all_item = result_all.history.length;
			var count_item = all_item%60;
			Matching.findOne({'MarketName' : req.body.exchange},{ history: { $slice: -count_item }},(err,result)=>{
				return res.status(200).send({'result': result.history});
			})
		}
		else
		{
			return res.status(200).send({'result': []});
		}
		
	});
}

function GetRedisChartItem(req,res){
	if (req.params.MarketName)
	{
		var market = req.params.MarketName;
		var chart_item = require('../../rabitmq/exchange').chart_item();
		
		if (market == "Bitcoin")
		{
			return res.status(200).send(chart_item.Bitcoin.toString().split(","));
		}
		if (market == "Ethereum")
		{
			return res.status(200).send(chart_item.Ethereum.toString().split(","));
		}
		if (market == "Bitcoin Cash")
		{
			return res.status(200).send(chart_item.BitcoinCash.toString().split(","));
		}
		if (market == "Ripple")
		{
			return res.status(200).send(chart_item.Ripple.toString().split(","));
		}
		if (market == "Litecoin")
		{
			return res.status(200).send(chart_item.Litecoin.toString().split(","));
		}
		if (market == "Cardano")
		{
			return res.status(200).send(chart_item.Cardano.toString().split(","));
		}
		if (market == "IOTA")
		{
			return res.status(200).send(chart_item.IOTA.toString().split(","));
		}
		if (market == "DASH")
		{
			return res.status(200).send(chart_item.DASH.toString().split(","));
		}
		if (market == "EURUSD")
		{
			return res.status(200).send(chart_item.EURUSD.toString().split(","));
		}
		if (market == "AUDUSD")
		{
			return res.status(200).send(chart_item.AUDUSD.toString().split(","));
		}
		if (market == "GBPUSD")
		{
			return res.status(200).send(chart_item.GBPUSD.toString().split(","));
		}
		if (market == "USDJPY")
		{
			return res.status(200).send(chart_item.USDJPY.toString().split(","));
		}
		if (market == "EURGBP")
		{
			return res.status(200).send(chart_item.EURGBP.toString().split(","));
		}
		if (market == "EURJPY")
		{
			return res.status(200).send(chart_item.EURJPY.toString().split(","));
		}
		if (market == "USDCAD")
		{
			return res.status(200).send(chart_item.USDCAD.toString().split(","));
		}
		if (market == "USDCHF")
		{
			return res.status(200).send(chart_item.USDCHF.toString().split(","));
		}
	}
	else
	{
		return res.status(403).send();
	}
	
}

function LoadTickerApi(req,res){
	Ticker.findOne({}, function(err,data){
		if(!err && data)
		{
			return res.status(200).send(data);
		}
		else
		{
			return res.status(403).send();
		}
	})
}

function Reset_Chart_Item(req,res){
	var string_sendrabit = '';
	//sendRabimq.publish('','Reset_Chart_Item',new Buffer(string_sendrabit));
	return res.status(200).send('complete');
}

module.exports = {
	Indexs,
	Index,
	SubmitBuy,
	LoadOrder_buyAll,
	LoadOrder_sellAll,
	SubmitSell,
	LoadOrder_Open_id,
	CancelOrder,
	ReloadBalance,
	LoadMarketHistory,
	LoadVolume,
	LoadMyMarketHistory,
	load_ticker,
	LoadBuySell,
	loadchartpie,
	LoadChartPinItem,
	GetRedisChartItem,
	LoadTickerApi,
	Reset_Chart_Item
}