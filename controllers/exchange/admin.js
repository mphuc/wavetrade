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


function LoadOrder_history(req,res){

	if (req.session.userId)
	{
		req.session.userId == '5a55ce6590928d62738e9949' ? (
			OrderBuy.find({ $and : [{'MarketName' : 'BTC-STC'},{'status': 0 }]},(err,result_buy)=>{
				OrderSell.find({ $and : [{'MarketName' : 'BTC-STC'},{'status': 0 }]},(err,result_sell)=>{
					console.log(result_buy);
					res.locals.order_buy = result_buy;
					res.locals.order_sell = result_sell;
				 	res.render('exchange/admin')
				});
			})
		) : res.status(200).send("error");
	}
	else
	{
		res.status(200).send("error");
	}
}
function LoadMarketHistory(req,res){
	if (req.query.MarketName)
	{
		MarketHistory.find({'MarketName' : req.query.MarketName},{ MarketName: 1 , quantity : 1, price : 1, total : 1 , type: 1,date: 1},(err,result)=>{
			return res.status(200).send({result: result});
		}).limit(2000); 
	}
	else
	{
		return res.status(404).send();
	}
}

module.exports = {
	LoadOrder_history,
	LoadMarketHistory
}