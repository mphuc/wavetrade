'use strict'
const mongoose = require('mongoose');
const User = require('../../models/user');
const OrderBuy = require('../../models/exchange/orderbuy').module();
const OrderSell = require('../../models/exchange/ordersell').module();
const MarketHistory = require('../../models/exchange/markethistory').module();
const Chart = require('../../models/exchange/chart').module();
const Volume = require('../../models/exchange/volume').module();
const request = require('request');
const bitcoin = require('bitcoin');
const amqp = require('amqplib/callback_api');
const sendRabimq = require('../../rabbit_comfim');
const moment = require('moment');
const Matching = require('../../models/exchange/matching').module();
const _ = require('lodash');
function LoadTempalate(req,res) {
	var MarketName = req.params.MarketName;
	res.render('exchange/chart', {
		MarketName : MarketName,
        layout: ''
    })
}

function get_json_chart(req,res){
	var MarketName = req.params.MarketName;
	
	var history = [];
	Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -14 }},function(err,data_socket){
		if (!err && data_socket.history)
		{
			
			for (var i = 0; i < data_socket.history.length; i++) {
				history.push([data_socket.history[i].date, parseFloat(data_socket.history[i].open), parseFloat(data_socket.history[i].close), parseFloat(data_socket.history[i].hight), parseFloat(data_socket.history[i].low)]);
			}
			res.status(200).send({'history' : history});
		}
		else
		{
			res.status(200).send({'history' : []});
		}
	})
	
	
}

function LoadTempalatePie(req,res) {
	var MarketName = req.params.MarketName;
	res.render('exchange/chart-pie', {
		MarketName : MarketName,
        layout: ''
    })
}
function LoadTempalateItem(req,res) {
	var MarketName = req.params.MarketName;
	res.render('exchange/chart-item', {
		MarketName : MarketName,
        layout: ''
    })
}


function LoadTempalateBook(req,res) {
	var MarketName = req.params.MarketName;
	
	res.render('exchange/chartbook', {
		MarketName : MarketName,
        layout: ''
    })
}

function GroupByPrice(object,callback){
	callback(_.groupBy(object, function(b) { return parseFloat(b.price)}));
}

function get_json_chart_book(req,res){
	var objects = [];
	var object_buy = [];
	var object_sell = [];
	OrderBuy.find({$and : [{'MarketName' : req.params.MarketName}, { 'status': 0 }]},(err,result)=>{
		if (!err && result.length > 0 )
		{

			var group = _.groupBy(result, 'price')
			var result = _.map(_.keys(group), function(e) {
			  return _.reduce(group[e], function(r, o) {
			    return r.count += + parseFloat(o.total), r
			  }, {price: e, count: 0, sum: group[e].length})
			})

			for (var i = result.length - 1; i >= 0; i--) {
				object_buy.push([(parseFloat(result[i].price)/100000000).toFixed(8), (parseFloat(result[i].count)/100000000).toFixed(8)])
			}
		}
		OrderSell.find({$and : [{'MarketName' : req.params.MarketName}, { 'status': 0 }]},(errs,result_sell)=>{
			if (!errs && result_sell.length > 0 ){
				var groups = _.groupBy(result_sell, 'price')
				var result_sell = _.map(_.keys(groups), function(e) {
				  return _.reduce(groups[e], function(r, o) {
				    return r.count += + parseFloat(o.total), r
				  }, {price: e, count: 0, sum: groups[e].length})
				})


				for (var i = result_sell.length - 1; i >= 0; i--) {
					object_sell.push([(parseFloat(result_sell[i].price)/100000000).toFixed(8), (parseFloat(result_sell[i].count)/100000000).toFixed(8)])
				}	
			}

			objects.push({
				"bids" : object_buy,
				"asks" : object_sell,
				"isFrozen":"0",
					"seq":462625960
			});

				
			res.status(200).send(
				objects[0]
		    ) 
					
		});

	});

	
					
	
			
}

module.exports = {
	LoadTempalate,
	get_json_chart,
	get_json_chart_book,
	LoadTempalateBook,
	LoadTempalatePie,
	LoadTempalateItem
}