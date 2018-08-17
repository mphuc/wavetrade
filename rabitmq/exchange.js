 'use strict'
const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const moment = require('moment');
const bitcoin = require('bitcoin');
var config = require('../config');
const request = require('request');
const speakeasy = require('speakeasy');
const _ = require('lodash');
const bcrypt = require('bcrypt-nodejs');
const urlSlug = require('url-slug');
var sendpulse = require("sendpulse-api");
const OrderBuy = require('../models/exchange/orderbuy').module();
const OrderSell = require('../models/exchange/ordersell').module();
const Matching = require('../models/exchange/matching').module();
const MarketHistory = require('../models/exchange/markethistory').module();
const Volume = require('../models/exchange/volume').module();
const Trading = require('../models/exchange/trading').module();
var forEach = require('async-foreach').forEach;
const Partner = require('../models/partner');
const Ticker = require('../models/ticker');
const History = require('../models/history');
const sleep = require('system-sleep');
const cron = require('node-cron');
var global_total_buy = 0;
var global_total_sell = 0;
var global_balance_server = 0;
var global_total_buy_admin = 0;
var global_total_sell_admin = 0;
var global_status_betting = 0;
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

var update_amount_betting = function(account_id,new_bettings,callback){
	var obj = null;
	var new_betting;
	var new_betting_bk;
	Partner.findOne({'account_id' : account_id},(err,data)=>{
		(!err && data)? (
			User.findOne({'_id' : data.parent},function(errs,datas){
				(!errs && datas)? (
					new_betting = parseFloat(datas.betting) + parseFloat(new_bettings),
					new_betting_bk = parseFloat(datas.betting_bk) + parseFloat(new_bettings),
					obj =  { 'betting': parseFloat(new_betting),'betting_bk' : parseFloat(new_betting_bk) },
					User.update({ '_id' :datas._id }, { $set : obj }, function(err, UsersUpdate){
						err ? callback(false) : callback(true);
					})
				) : callback(false)
			})
		) : callback (false) 
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

var newOrderBuy = function(account_id, MarketName,amount,robot,type_account,user_id){
	
	var today = moment();
	return new OrderBuy({
		"account_id" : account_id,
		"MarketName" : MarketName,
		"amount" : parseFloat(amount),
		"date" : moment(today).format(),
		"status" : 0,
		"type" : type_account,
		"robot" : robot,
		"user_id" : user_id
	})
}		

var newHistory = function(account_id, type,amount,detail,symbol,buysell,type_account,balance_res){

	//console.log(account_id, type,amount,detail,symbol,buysell);
	var today = moment();
	return new History({
		"user_id" : account_id,
		"amount" : amount,
		"detai" : detail,
		"date" : moment(today).format(),
		"type" : type,
		"symbol" : symbol,
		"buysell" : buysell,
		"type_account" : type_account,
		"balance_res" : balance_res

	})
}

var updateOrderBuy = function(orderid,amount,callback){
	var today = moment();
	OrderBuy.update({'_id' : orderid},{'$set' : {'amount' : amount,'date' :moment(today).format()}},function(err,result){
		!err && result ? callback(true) : false;
	})
}
var newOrderSell = function(account_id, MarketName,amount,robot,type_account,user_id){
	var today = moment();
	return new OrderSell({
		"account_id" : account_id,
		"MarketName" : MarketName,
		"amount" : parseFloat(amount),
		"date" : moment(today).format(),
		"status" : 0,
		"type" : type_account,
		"robot" : robot,
		"user_id" : user_id
	})
}
var updateOrderSell = function(orderid,amount,callback){
	var today = moment();
	OrderSell.update({'_id' : orderid},{'$set' : {'amount' : amount,'date' :moment(today).format()}},function(err,result){
		!err && result ? callback(true) : false;
	})
}
var UpdateVolume = function(data,MarketName,Last,hight,low,bid,ask,volume){
	//data,MarketName,-1,-1,-1,-1,ask,-1
	var query = {'_id' : data._id};
	var date_update;
	parseFloat(Last) > 0 && (
		date_update = {
			'last' : Last,
			'hight' : hight,
			'low' : low,
			'volume' : volume,
			'last_last' : data.last,
			'hight_last' : data.hight,
			'low_last' : data.low,
			'volume_last' : data.volume
		}
	);
	parseFloat(bid) > 0 && (
		date_update = {
			'bid' : bid,
			'bid_last' : data.bid
		}
	);
	parseFloat(ask) > 0 && (
		date_update = {
			'ask' : ask,
			'ask_last' : data.ask
		}
	);
	Volume.update(query,date_update,function(err,result){})
}


function update_volume(MarketName,Last,Bid,Ask,Volum){
	console.log(MarketName,Last,Bid,Ask,Volum);
	Volume.findOne({'MarketName' : MarketName},function(err,data){

		if (data)
		{
			parseFloat(Bid) > 0 && (
				OrderBuy.find(
					{
						"user_id": {
					        "$not": {
					            "$in": ["5a55ce6590928d62738e9949"]
					        }
					    },
					    'MarketName' : MarketName,
					    'status': "0" 
					},
				function(errbuy,result_buyorder){
					Sortobject_buy(result_buyorder,function(max_buyorder){
						//var bid = Bid;//result_buyorder.length > 0 ? Bid : 0;
						var bid = result_buyorder.length > 0 ? max_buyorder[0].price : 0;
						UpdateVolume(data,MarketName,-1,-1,-1,bid,-1,-1);
					})
				})
			),
			parseFloat(Ask) > 0 &&(
				OrderSell.find(
					{
						"user_id": {
					        "$not": {
					            "$in": ["5a55ce6590928d62738e9949"]
					        }
					    },
					    'MarketName' : MarketName,
					    'status': "0" 
					},function(errsell,result_sellorder){
					Sortobject_sell(result_sellorder,function(max_sellorder){
						var ask = result_sellorder.length > 0 ? max_sellorder[0].price : 0;
						UpdateVolume(data,MarketName,-1,-1,-1,-1,ask,-1);
					})
				})
			),
			parseFloat(Last) > 0 && (
				MarketHistory.find(
					{ $and : [{"MarketName" : MarketName},
					{
					    "date": 
					    {
					        $gte: new Date((new Date().getTime() - (15 * 24 * 60 * 1000)))
					    }
					}]
				},
				function(errs,result){
					Sortobject_buy(result,function(max_vol){
						Sortobject_sell(result,function(min_vol){
							if (result ){
								var total_volume = 0;
								for (var sss = result.length - 1; sss >= 0; sss--) 
								{
									total_volume +=  parseFloat(result[sss].total);
								}
							}
							var hight = result.length > 0 ? max_vol[0].price : data.hight;
							var low = result.length > 0 ? min_vol[0].price : data.low;
							UpdateVolume(data,MarketName,Last,hight,low,-1,-1,total_volume);
						})
					})
				})
			)
		}
	})
}

function process_sell(string_receiverabit,callback){
	var build_String = string_receiverabit.split("_");
	var MarketName = build_String[0];
	var amount = build_String[1];
	var user_id = build_String[2];
	var type_account = parseInt(build_String[3]);
	var _id_user = build_String[4];
	get_balance(user_id,function(balance){
		if (parseFloat(balance) >= amount && global_status_betting == 1)
        {
        	OrderSell.findOne({'$and' : [{'account_id' : user_id},{'status' : 0},{'MarketName' : MarketName}]},function(err,orderbuy){
        		var new_ast_balance;
        		!err && orderbuy ? (
        			updateOrderSell(orderbuy._id, parseFloat(amount)+parseFloat(orderbuy.amount),function(cbb){
						!cbb ? callback(false) : (
							new_ast_balance = (parseFloat(balance) - amount).toFixed(8),
							update_balace(new_ast_balance,user_id,function(cb){
								cb ? (
									info.sockets.socket.broadcast.emit('OrderSell:save', {
										account_id: orderbuy.account_id,
										MarketName: orderbuy.MarketName,
										amount: parseFloat(amount),
										status: orderbuy.status,
										_id: orderbuy._id,
										date: moment(orderbuy.date).format('MM/DD/YYYY LT')}
									),
									info.sockets.socket.emit('OrderSell:save', {
										account_id: orderbuy.account_id,
										MarketName: orderbuy.MarketName,
										amount: parseFloat(amount),
										status: orderbuy.status,
										_id: orderbuy._id,
										date: moment(orderbuy.date).format('MM/DD/YYYY LT')}
									),
									
									callback (true)
								) : callback (false)
							})
						)
					})
        		) : (
        			newOrderSell(user_id, MarketName,amount,0,type_account,_id_user).save(( err, order_create)=>{
						err ? callback(false) : (
							new_ast_balance = (parseFloat(balance) - amount).toFixed(2),
							update_balace(new_ast_balance,user_id,function(cb){
								
								cb ? callback (true) : callback (false)
							})
						)
					})
        		)
        	});
			(parseInt(type_account) == 0) && (
				update_amount_betting(user_id,amount,function(cbb){
					
				}),
				global_total_sell += parseFloat(amount)
				
			);
			//if (user_id == '0823988' || user_id == '0655357' || user_id == '0331394' || user_id == '0334451') global_total_sell_admin += parseFloat(amount);
        }
        else
        {
        	callback(false)
        }
	});	
}

function process_buy(string_receiverabit,callback){
	var build_String = string_receiverabit.split("_");
	var MarketName = build_String[0];
	var amount = build_String[1];
	var user_id = build_String[2];
	var type_account = parseInt(build_String[3]);
	var _id_user = build_String[4];
	get_balance(user_id,function(balance){
		if (parseFloat(balance) >= amount && global_status_betting == 1)
        {
        	OrderBuy.findOne({'$and' : [{'account_id' : user_id},{'status' : 0},{'MarketName' : MarketName}]},function(err,orderbuy){
        		var new_ast_balance;
        		!err && orderbuy ? (
        			updateOrderBuy(orderbuy._id, parseFloat(amount)+parseFloat(orderbuy.amount),function(cbb){
						!cbb ? callback(false) : (
							new_ast_balance = (parseFloat(balance) - amount).toFixed(2),
							update_balace(new_ast_balance,user_id,function(cb){
								cb ? (
									info.sockets.socket.broadcast.emit('OrderBuy:save', {
										account_id: orderbuy.account_id,
										MarketName: orderbuy.MarketName,
										amount: parseFloat(amount),
										status: orderbuy.status,
										_id: orderbuy._id,
										date: moment(orderbuy.date).format('MM/DD/YYYY LT')}
									),
									info.sockets.socket.emit('OrderBuy:save', {
										account_id: orderbuy.account_id,
										MarketName: orderbuy.MarketName,
										amount: parseFloat(amount),
										status: orderbuy.status,
										_id: orderbuy._id,
										date: moment(orderbuy.date).format('MM/DD/YYYY LT')}
									),
									
									callback (true)
								) : callback (false)
							})
						)
					})
        		) : (
        			newOrderBuy(user_id, MarketName,amount,0,type_account,_id_user).save(( err, order_create)=>{
						err ? callback(false) : (
							new_ast_balance = (parseFloat(balance) - amount).toFixed(2),
							update_balace(new_ast_balance,user_id,function(cb){
								cb ? callback (true) : callback (false)
							})
						)
					})
        		)
        	});
			(parseInt(type_account) == 0) && (
				update_amount_betting(user_id,amount,function(cbb){
					
				}),
				global_total_buy += parseFloat(amount)
				
			);
			//if (user_id == '0823988' || user_id == '0655357' || user_id == '0331394' || user_id == '0334451') global_total_buy_admin += parseFloat(amount)	
        }
        else
        {
        	callback(false)
        }
	});
}

function Update_BalanceServer(amount,type)
{
	if (type == 'lose')
	{
		global_balance_server = parseFloat(global_balance_server)  + (parseFloat(amount)*0.4);	
		
		var amount_max = 0;
		if (parseFloat(global_balance_server) > 1000)
		{
			amount_max = global_balance_server - 1000;
			global_balance_server = 1000;
		}
		User.findOne({'_id' : '5ad45e709b45ef4b042a0eb3'},function(errs,ressss){
			if (!errs && ressss)
			{
				var new_balance = parseFloat(ressss.balance) + (parseFloat(amount)*0.35) + parseFloat(amount_max);
				User.update({'_id' :'5ad45e709b45ef4b042a0eb3'},{'$set' : {'balance' :new_balance}},function(esss,sss){
				})
			}
		});
	}
	else
	{
		global_balance_server = parseFloat(global_balance_server)  - parseFloat(amount);
	}
}



function process_cancel_order(string_receiverabit,callback){
	var build_String = string_receiverabit.split("_");

	var id_order = build_String[0];
	var tpyes = build_String[1];
	var user_id = build_String[2];
	if (tpyes == 'Sell')
	{
		OrderSell.findOne({ $and : [{_id : id_order},{user_id : user_id},{status : 0}]},(err,data)=>{
			var query;
			var data_update;
			err || !data ? (
				callback(false)
			) :
			(
				query = {'_id':id_order},
				data_update = {
					$set : {
						'status': 8
					}
				},
				OrderSell.findOneAndRemove(query, function(err, Users){
					var wallet_name =  data.MarketName.split("-")[1];
					var value_update = data.quantity;
					!err ? (
						get_balance(wallet_name,user_id,function(ast_balance){
							var new_ast_balance = (parseFloat(ast_balance) + parseFloat(value_update) ).toFixed(8);
							update_balace(wallet_name , new_ast_balance,user_id,function(cb){
								update_volume(data.MarketName,-1,-1,data.price,-1);
								cb ? (callback(true),Users.remove()) : callback(false)
							})
						})
					) : callback(false)
				})
			)
		});
	}
	else
	{
		OrderBuy.findOne({ $and : [{_id : id_order},{user_id : user_id},{status : 0}]},(err,data)=>{
			var query;
			
			err || !data ? (
				callback(false)
			) :
			(
				query = {'_id':id_order},
				
				OrderBuy.findOneAndRemove(query, function(err, Users){
					var wallet_name = data.MarketName.split("-")[0];
					var value_update = (data.total)*1.0025;
					
					!err ? (
						get_balance(wallet_name,user_id,function(ast_balance){
							var new_ast_balance = (parseFloat(ast_balance) + parseFloat(value_update) ).toFixed(8);
							update_balace(wallet_name , new_ast_balance,user_id,function(cb){

								update_volume(data.MarketName,-1,data.price,-1,-1);

								cb ? (Users.remove(),callback(true)) : callback(false)
							})
						})
					) : callback(false)
				})
			)
		});
	}
}



var newMarketHistory = function(user_id_buy,user_id_sell, MarketName,price,quantity,total,type ){
	var today = moment();
	return new MarketHistory({
		"user_id_buy" : user_id_buy,
		"user_id_sell" : user_id_sell,
		"MarketName" : MarketName,
		"price" : price,
		"quantity" : quantity,
		"total" : total,
		"date" : moment(today).format(),
		"status" : 0,
		"type" : type
	})
}	
function Create_market(user_id_buy,user_id_sell,MarketName,quantity,price,type,callback){
	

	var total = parseFloat(price)*parseFloat(quantity)*1.0025/100000000;
	newMarketHistory(
		user_id_buy,
		user_id_sell, 
		MarketName,
		parseFloat(price),
		parseFloat(quantity),
		total, 
		type
	).save(( err, DepositStored)=>{
		!err && callback(true);
	})
}



function finish_orderbuy(id,status,callback){
	OrderBuy.update({ _id :id }, { $set : {'status' : status} }, function(err, UsersUpdate){
		err ? callback(false) : callback(true);
	});
}
/*setTimeout(function() {
	matching_buy("5a37a9475597a230926eb54f");
}, 12000);*/


function Sortobject_buy(object,callback){
	callback(_.sortBy(object, [function(o) { return parseFloat(o.price); }]).reverse());
}
function Sortobject_sell(object,callback){
	callback(_.sortBy(object, [function(o) { return parseFloat(o.price); }]));
}



function matching_buy(sellorder){	
	var today_date = moment();
	var now_date = moment(today_date).format();
	OrderBuy.find({$and : 
		[
            {$where: 'this.price >= '+parseFloat(sellorder.price)+''},
            {'MarketName' : sellorder.MarketName },
            {'status' : 0}
        ]
	}
	,function(err,buyorder){
		!err && buyorder.length > 0 ? (
			Sortobject_buy(buyorder,function(buyorder){
				var quantity_Sell;
				var array_push_market = [];
				var array_remove_buy = [];
				var array_remove_sell = [];
				var array_push_alls = [];
				var soketss = false;
				buyorder && (
					quantity_Sell = parseFloat(sellorder.quantity),
					forEach(buyorder, function(item, index){
						var done = this.async();
						
						//console.log(parseFloat(quantity_Sell),parseFloat(item.quantity));
						if (parseFloat(quantity_Sell) > parseFloat(item.quantity) && parseFloat(quantity_Sell) > 0){
							console.log(">>>>>>>>>>>>>>>>>>");
							array_push_market.push([item.user_id, sellorder.user_id, sellorder.MarketName, item.quantity, item.price, 'Sell',now_date])
							Create_market(
								item.user_id,
								sellorder.user_id,
								sellorder.MarketName,
								item.quantity,
								item.price,
								'Sell',
							function(cbb){
								var query;
								var data_update;
								var string_sendrabit;
								cbb && (
									OrderBuy.findOneAndUpdate({'_id' : item._id},{'status' : 1},function(errs,result_rm){
										quantity_Sell = parseFloat(quantity_Sell) - parseFloat(item.quantity),

										get_balance(sellorder.MarketName.split("-")[0],sellorder.user_id,function(balance_sell){
											var new_balance_sell = (parseFloat(balance_sell) + (parseFloat(item.quantity)*parseFloat(item.price)/100000000*0.9975)).toFixed(8);
											
											update_balace(sellorder.MarketName.split("-")[0],new_balance_sell,sellorder.user_id,function(cbsss){
												get_balance(sellorder.MarketName.split("-")[1],item.user_id,function(balance_buy){
													var new_balance_buy = (parseFloat(balance_buy) + parseFloat(item.quantity)).toFixed(8);
													update_balace(sellorder.MarketName.split("-")[1],new_balance_buy,item.user_id,function(cbsss){
														
													})
												})
											})
										}),

										(buyorder.length - 1 === index && parseFloat(quantity_Sell) > 0) && 
										(
											query = {'_id' : sellorder._id},
											data_update = {
												quantity : parseFloat(quantity_Sell).toFixed(8),
												total : (parseFloat(quantity_Sell)*parseFloat(item.price)/100000000).toFixed(8),
												price : item.price
											},
											OrderSell.update(query,data_update,function(errrs,result_ud){
												//console.log(result_ud)
											})
										),
										
										array_remove_buy.push(result_rm),
										array_remove_sell.push({
											quantity : parseFloat(item.quantity),
											total : (parseFloat(item.quantity)*parseFloat(item.price)/100000000).toFixed(8),
											price : item.price,
											_id : sellorder._id
										}),
										setTimeout(function() {
											//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', result_rm);
											done()
										}, 100);
									})
									
								)
							})
						} 
						else if (parseFloat(quantity_Sell) == parseFloat(item.quantity) && parseFloat(quantity_Sell) > 0)
						{
							
							console.log("=====================");
							array_push_market.push([item.user_id, sellorder.user_id, sellorder.MarketName, item.quantity, item.price, 'Sell',now_date]);
							Create_market(
								item.user_id,
								sellorder.user_id,
								sellorder.MarketName,
								item.quantity,
								item.price,
								'Sell',
							function(cbb){
								cbb && (
									OrderSell.findOneAndUpdate({'_id' : sellorder._id},{'status' : 1},function(errs,result_ssss){
										OrderBuy.findOneAndUpdate({'_id' : item._id},{'status' : 1},function(errs,result_rm){
											quantity_Sell = parseFloat(quantity_Sell) - parseFloat(item.quantity),
											get_balance(sellorder.MarketName.split("-")[0],sellorder.user_id,function(balance_sell){
												var new_balance_sell = (parseFloat(balance_sell) + parseFloat(item.total)*0.9975).toFixed(8);
												
												update_balace(sellorder.MarketName.split("-")[0],new_balance_sell,sellorder.user_id,function(cbsss){
													get_balance(sellorder.MarketName.split("-")[1],item.user_id,function(balance_buy){
														var new_balance_buy = (parseFloat(balance_buy) + parseFloat(item.quantity)).toFixed(8);
														update_balace(sellorder.MarketName.split("-")[1],new_balance_buy,item.user_id,function(cbsss){
															
														})
													})
												})
											}),

											array_remove_buy.push(result_rm),
											array_remove_sell.push(sellorder),

											setTimeout(function() {
												//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', result_rm);
												//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', sellorder);
												done()
											}, 100);
										})
									})
								)
							});
						}
						else if (parseFloat(quantity_Sell) < parseFloat(item.quantity) && parseFloat(quantity_Sell) > 0)
						{
							console.log("<<<<<<<<<<<<<<<<<");
							array_push_market.push([item.user_id, sellorder.user_id, sellorder.MarketName, quantity_Sell, item.price, 'Sell',now_date]);
							Create_market(
								item.user_id,
								sellorder.user_id,
								sellorder.MarketName,
								quantity_Sell,
								item.price,
								'Sell',
							function(cbb){
								var query_ud;
								var data_ud;
								cbb && (
									OrderSell.findOneAndUpdate({'_id' : sellorder._id},{'status' : 1},function(errs,result_ssss){
										OrderBuy.update({'_id' : item._id},{'status' : 1},function(errs,result_rm){

											//console.log(parseFloat(item.quantity),parseFloat(quantity_Sell),"123123213");

											var quantity_sub = parseFloat(item.quantity) - parseFloat(quantity_Sell);

											var quantitysss = quantity_sub;
											var totalsss = (quantity_sub*parseFloat(item.price)/100000000).toFixed(8);
											var subtotalsss = quantitysss*parseFloat(item.price)/100000000;
											var commissionsss = quantitysss*parseFloat(item.price)/100000000*0.0025;
											var balance_add;
											var amount_add_quanty;
											newOrderBuy(item.user_id, item.MarketName,quantitysss,item.price, subtotalsss, commissionsss,totalsss).save(( err, DepositStored)=>{
												!err &&  (
													balance_add = (parseFloat(quantity_Sell)*parseFloat(item.price)/100000000).toFixed(8),
													amount_add_quanty = quantity_Sell,
													quantity_Sell = parseFloat(quantity_Sell) - parseFloat(item.quantity),
													get_balance(sellorder.MarketName.split("-")[0],sellorder.user_id,function(balance_sell){		
														//console.log(balance_add,balance_sell);
														var new_balance_sell = (parseFloat(balance_sell) + (balance_add*0.9975)).toFixed(8);
														
														update_balace(sellorder.MarketName.split("-")[0],new_balance_sell,sellorder.user_id,function(cbsss){
															
															get_balance(sellorder.MarketName.split("-")[1],item.user_id,function(balance_buy){
																var new_balance_buy = (parseFloat(balance_buy) +  parseFloat(amount_add_quanty)).toFixed(8);
																update_balace(sellorder.MarketName.split("-")[1],new_balance_buy,item.user_id,function(cbsss){
																		
																})
															})
														})
													}),

													array_remove_buy.push(item),
													array_remove_sell.push(sellorder),
													soketss = true,
													setTimeout(function() {
														//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', item);
														//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', sellorder);
														done()
													}, 100)
												)
											})
										})
									})
								)
							});
						}


						(buyorder.length - 1 === index || soketss == true) && (

							setTimeout(function() {

								array_push_alls.push({
									'OrderBuy_remove' : array_remove_buy,
									'OrderSell_remove' : array_remove_sell,
									'MatchingOrder' : array_push_market
								});

								info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', array_push_alls),
								info.sockets.socket.emit('Buy_Sell_Matchings', array_push_alls);

								//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('Buy_Sell_Matching', array_push_alls),

								/*info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', array_remove_buy),
								info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', array_remove_sell),
								info.sockets.io.sockets.in(sellorder.MarketName).emit('MatchingOrder', array_push_market),*/
								
								update_volume(sellorder.MarketName,item.price,1,sellorder.price,1)
								//MarketName,Last,Bid,Ask,Volum
							}, 500)
							
						)

					})

					
				)
			})
		) : update_volume(sellorder.MarketName,-1,-1,sellorder.price,-1);

	})
}

function matching_sell(buyorder){ 
	var today_date = moment();
	var now_date = moment(today_date).format();
	OrderSell.find({$and : 
		[
            {$where: 'this.price <= '+parseFloat(buyorder.price)+''},
            {'MarketName' : buyorder.MarketName },
            {'status' : 0}
        ]
	}
	,function(err,sellorder){
		var array_push_market = [];
		!err && sellorder.length > 0 ? (
			Sortobject_sell(sellorder,function(sellorder){
				var quantity_Buy;
				var array_remove_buy = [];
				var array_remove_sell = [];
				var array_push_alls = [];
				var soketss = false;
				sellorder && (

					quantity_Buy = parseFloat(buyorder.quantity),

					forEach(sellorder, function(item, index){
						var done = this.async();
						
						//console.log(parseFloat(quantity_Buy),parseFloat(item.quantity));
						if (parseFloat(quantity_Buy) > parseFloat(item.quantity) && parseFloat(quantity_Buy) > 0){
							console.log(">>>>>>>>>>>>>>>>>>");
							array_push_market.push([item.user_id, buyorder.user_id, buyorder.MarketName, item.quantity, item.price, 'Buy',now_date]);
							Create_market(
								buyorder.user_id,
								item.user_id,
								buyorder.MarketName,
								item.quantity,
								item.price,
								'Buy',
							function(cbb){
								var query;
								var data_update;
								var string_sendrabit;
								cbb && (
									OrderSell.findOneAndUpdate({'_id' : item._id},{'status' : 1},function(errs,result_rm){
										quantity_Buy = parseFloat(quantity_Buy) - parseFloat(item.quantity),

										get_balance(buyorder.MarketName.split("-")[1],buyorder.user_id,function(balance_buy){
											
											var new_balance_buy = (parseFloat(balance_buy) + parseFloat(item.quantity)).toFixed(8);

											update_balace(buyorder.MarketName.split("-")[1],new_balance_buy,buyorder.user_id,function(cbsss){
												get_balance(buyorder.MarketName.split("-")[0],item.user_id,function(balance_sell){
													var new_balance_sell = (parseFloat(balance_sell) + (parseFloat(item.quantity)*parseFloat(item.price)/100000000*0.9975)).toFixed(8);
													update_balace(buyorder.MarketName.split("-")[0],new_balance_sell,item.user_id,function(cbsss){
														
													})
												})
											})
										}),

										(sellorder.length - 1 === index && parseFloat(quantity_Buy) > 0) && 
										(
											//console.log(quantity_Buy),
											query = {'_id' : buyorder._id},
											data_update = {
												quantity : parseFloat(quantity_Buy).toFixed(8),
												total : (parseFloat(quantity_Buy)*parseFloat(item.price)/100000000).toFixed(8),
												price : item.price
											},
											OrderBuy.update(query,data_update,function(errrs,result_ud){
												console.log(result_ud)
											})
										),
										array_remove_sell.push(item),
										
										array_remove_buy.push({
											quantity : parseFloat(item.quantity),
											total : (parseFloat(item.quantity)*parseFloat(item.price)/100000000).toFixed(8),
											price : item.price,
											_id : buyorder._id
										}),
										
										setTimeout(function() {
											//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', item);
											done()
										}, 100);
									})
									
								)
							})
						} 
						else if (parseFloat(quantity_Buy) == parseFloat(item.quantity) && parseFloat(quantity_Buy) > 0)
						{
							
							console.log("=====================");
							array_push_market.push([item.user_id, buyorder.user_id, buyorder.MarketName, item.quantity, item.price, 'Buy',now_date]);
							Create_market(
								buyorder.user_id,
								item.user_id,
								buyorder.MarketName,
								item.quantity,
								item.price,
								'Buy',
							function(cbb){
								cbb && (
									OrderSell.findOneAndUpdate({'_id' : item._id},{'status' : 1},function(errs,result_rm){
										OrderBuy.findOneAndUpdate({'_id' : buyorder._id},{'status' : 1},function(errs,result_rm){
											quantity_Buy = parseFloat(quantity_Buy) - parseFloat(item.quantity),
											get_balance(buyorder.MarketName.split("-")[1],buyorder.user_id,function(balance_buy){
												
												var new_balance_buy = (parseFloat(balance_buy) + parseFloat(item.quantity)).toFixed(8);

												update_balace(buyorder.MarketName.split("-")[1],new_balance_buy,buyorder.user_id,function(cbsss){
													get_balance(buyorder.MarketName.split("-")[0],item.user_id,function(balance_sell){
														var new_balance_sell = (parseFloat(balance_sell) + parseFloat(item.total)*0.9975).toFixed(8);
														update_balace(buyorder.MarketName.split("-")[0],new_balance_sell,item.user_id,function(cbsss){
															
														})
													})
												})
											}),
											array_remove_buy.push(buyorder),
											array_remove_sell.push(item),
											setTimeout(function() {
												//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', buyorder);
												//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', item);
												done()
											}, 100);
										})
									})
								)
							});
						}
						else if (parseFloat(quantity_Buy) < parseFloat(item.quantity) && parseFloat(quantity_Buy) > 0)
						{
							console.log("<<<<<<<<<<<<<<<<<");
							array_push_market.push([item.user_id, buyorder.user_id, buyorder.MarketName, quantity_Buy, item.price, 'Buy',now_date]);
							Create_market(
								buyorder.user_id,
								item.user_id,
								buyorder.MarketName,
								quantity_Buy,
								item.price,
								'Buy',
							function(cbb){
								var query_ud;
								var data_ud;
								cbb && (
									
									OrderSell.update({'_id' : item._id},{'status' : 1},function(errs,result_rm){
										OrderBuy.update({'_id' : buyorder._id},{'status' : 1},function(errs,result_rm){
											console.log(parseFloat(item.quantity),parseFloat(quantity_Buy),"123123213");
											var quantity_sub = parseFloat(item.quantity) - parseFloat(quantity_Buy);

											var quantitysss = quantity_sub;
											var totalsss = (quantity_sub*parseFloat(item.price)/100000000).toFixed(8);
											var subtotalsss = quantitysss*parseFloat(item.price)/100000000;
											var commissionsss = quantitysss*parseFloat(item.price)/100000000*0.0025;
											var balance_add;
											var amount_add_quanty;
											newOrderSell(item.user_id, item.MarketName,quantitysss,item.price, subtotalsss, commissionsss,totalsss).save(( err, DepositStored)=>{
												!err &&  (
													balance_add = (parseFloat(quantity_Buy)*parseFloat(item.price)/100000000).toFixed(8),
													amount_add_quanty = quantity_Buy,
													quantity_Buy = parseFloat(quantity_Buy) - parseFloat(item.quantity),
													get_balance(buyorder.MarketName.split("-")[1],buyorder.user_id,function(balance_sell){

														var new_balance_sell = (parseFloat(balance_sell) + (amount_add_quanty)).toFixed(8);
															
														update_balace(buyorder.MarketName.split("-")[1],new_balance_sell,buyorder.user_id,function(cbsss){
															
															get_balance(buyorder.MarketName.split("-")[0],item.user_id,function(balance_buy){
																var new_balance_buy = (parseFloat(balance_buy) +  parseFloat(balance_add)*0.9975).toFixed(8);
																update_balace(buyorder.MarketName.split("-")[0],new_balance_buy,item.user_id,function(cbsss){
																		
																})
															})
														})
													}),
													array_remove_buy.push(buyorder),
													array_remove_sell.push(item),
													soketss = true,
													setTimeout(function() {
														//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', buyorder);
														//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', item);
														done()
													}, 100)
												)
											})
										});
									})
								)
							});
						};
						
						(sellorder.length - 1 === index || soketss) && (
							setTimeout(function() {
								array_push_alls.push({
									'OrderBuy_remove' : array_remove_buy,
									'OrderSell_remove' : array_remove_sell,
									'MatchingOrder' : array_push_market
								});

								info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', array_push_alls),
								info.sockets.socket.emit('Buy_Sell_Matchings', array_push_alls);

								//info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('Buy_Sell_Matching', array_push_alls),
								/*info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderBuy:remove', array_remove_buy);

								info.sockets.io.sockets.in(info.sockets.socket.Exchange).emit('OrderSell:remove', array_remove_sell);
								info.sockets.io.sockets.in(buyorder.MarketName).emit('MatchingOrder', array_push_market),*/
								update_volume(buyorder.MarketName,item.price,buyorder.price,1,1)
							}, 500)
						)

					})
				)
			})
		) : update_volume(buyorder.MarketName,-1,buyorder.price,-1,-1)

			
	});
}

function SumObject(object,callback){
	callback(_.sumBy(object, function(o) { return parseFloat(o.amount); }));
}

function matching_buy_sell(MarketName){
	OrderBuy.find({'$and' : [{'MarketName' :MarketName},{'status' : 0}]},function(err_buy,result_buy){
		!err_buy  ?(
			SumObject(result_buy,function(SumBuy){
				console.log(SumBuy,'total Buy')
				OrderSell.find({'$and' : [{'MarketName' :MarketName},{'status' : 0}]},function(err_sell,result_sell){
					!err_sell  ?(
						SumObject(result_sell,function(SumSell){
							console.log(SumSell,'total Sell');
							var count_buy = 0;
							var count_sell = 0;
							Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -4 }},function(errss4,data_matching4){
								if (!errss4 && data_matching4.history)
								{
									for (var i = data_matching4.history.length - 1; i >= 0; i--) {
										if (data_matching4.history[i].types == 'Sell') count_sell ++;
										if (data_matching4.history[i].types == 'Buy') count_buy ++;
									}
									Ticker.findOne({},function(errtk,resulttk){
										if (parseFloat(SumBuy) > parseFloat(SumSell) || count_buy >= parseInt(Math.random()*(3-2+2)+2) || parseFloat(resulttk.btc.usd) < parseFloat(data_matching4.history[data_matching4.history.length - 1].hight))
										{
											awards_sell(MarketName);
											Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -1 }},function(errss,data_matching){
												if (data_matching && !errss && (data_matching.history).length > 0)
												{
													var open = data_matching.history[0].open;
													var close = data_matching.history[0].close;
													var hight = data_matching.history[0].hight;
													var low = data_matching.history[0].low;
													var random_0 = parseFloat(Math.random()*1);
													var random_1 = parseFloat(Math.random()*2);
													var random_2 = parseFloat(Math.random()*2);
													var random_3 = parseFloat(Math.random()*2);
													var price_btc = resulttk.btc.usd;
													
													var date = new Date().getTime() * 1000;
													var created_on = new Date().toLocaleString();
													var query = {'MarketName' : MarketName};
													var data_update = {
														$push: {
												            'history': {
												                'open': (parseFloat(hight) + random_0 ).toFixed(2),
												                'close': (parseFloat(hight)).toFixed(2),
												                'hight': (parseFloat(hight) - random_1 ).toFixed(2),
												                'low': (parseFloat(hight) - random_1 - random_1 ).toFixed(2),
												                'types': 'Sell',
												                'date': date,
												                'created_on' : created_on
												            }
												        }
													};
													Matching.update(query, data_update, function(err, newUser) {
														var array_push_matching = {
															'open': (parseFloat(hight) + random_0 ).toFixed(2),
											                'close': (parseFloat(hight)).toFixed(2),
											                'hight': (parseFloat(hight) - random_1 ).toFixed(2),
											                'low': (parseFloat(hight) - random_1 - random_1 ).toFixed(2),
											                'types': 'Sell',
											                'date': date,
											                'created_on' : created_on,
											                'MarketName' : MarketName
														}
														info.sockets.socket.broadcast.emit('Matching:push',array_push_matching);
														info.sockets.socket.emit('Matching:push', array_push_matching);
														
													})
												}
											})
											console.log('Sell');
										
										}
										else
										{
											awards_buy(MarketName);
											Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -1 }},function(errss,data_matching){
												if (data_matching && !errss && (data_matching.history).length > 0)
												{
													var open = data_matching.history[0].open;
													var close = data_matching.history[0].close;
													var hight = data_matching.history[0].hight;
													var low = data_matching.history[0].low;
												
													var price_btc = resulttk.btc.usd;
													var random_0 = parseFloat(Math.random()*1);
													var random_1 = parseFloat(Math.random()*2);
													var random_2 = parseFloat(Math.random()*2);
													var random_3 = parseFloat(Math.random()*2);
													var date = new Date().getTime() * 1000;
													var created_on = new Date().toLocaleString();
													var random = parseFloat(Math.random());
													var query = {'MarketName' : MarketName};
													var data_update = {
														$push: {
												            'history': {
											                 	'open': (parseFloat(hight) - random_0).toFixed(2),
												                'close': (parseFloat(hight)).toFixed(2),
												                'hight': (parseFloat(hight) + random_1).toFixed(2),
												                'low': (parseFloat(hight) + random_1 + random_1).toFixed(2),
												                'types': 'Buy',
												                'date': date,
												                'created_on' : created_on
												            }
												        }
													};

													Matching.update(query, data_update, function(err, newUser) {
														var array_push_matching = {
															'open': (parseFloat(hight) - random_0).toFixed(2),
											                'close': (parseFloat(hight)).toFixed(2),
											                'hight': (parseFloat(hight) + random_1).toFixed(2),
											                'low': (parseFloat(hight) + random_1 + random_1).toFixed(2),
											                'types': 'Buy',
											                'date': date,
											                'created_on' : created_on,
											                'MarketName' : MarketName
														};
														info.sockets.socket.broadcast.emit('Matching:push',array_push_matching);
														info.sockets.socket.emit('Matching:push', array_push_matching);
													})
												}
											});
												
										
											console.log('Buy');
										}
									});
								}
							})
								
						})
					) : ( console.log('none sell'));
				})

			})
		) : ( console.log('none buy'));
	})
}


function process_update_balance_user(string_receiverabit,callback){
	var build_String = string_receiverabit.split("_");
	var account_id = build_String[0];
	var amount = build_String[1];

	get_balance(account_id,function(balance){
		var new_balance = (parseFloat(balance) + parseFloat(amount) + (parseFloat(amount)*0.96)).toFixed(2);
		update_balace(new_balance,account_id,function(update_result){
			callback(true);
		})
	});
}

var update_amount_betting_node = function(user_id,new_betting,callback){
	var obj = null;
	var new_betting;
	User.findOne({'_id' : user_id},function(errs,datas){
		(!errs && datas)? (
			new_betting = parseFloat(datas.balance_commision) + parseFloat(new_betting),
			obj =  { 'balance_commision': parseFloat(new_betting) },
			User.update({ '_id' :datas._id }, { $set : obj }, function(err, UsersUpdate){
				err ? callback(false) : callback(true);
			})
		) : callback(false)
	})	
}

function LoopNode(i,user_id,amount_betting,callback){
	User.findOne({_id:user_id}, function (err, item) {
		if (!err && item)
		{
			if (item.p_node != '0' && i < 3) {
				update_amount_betting_node (item.p_node,parseFloat(amount_betting)*0.005,function(cbb){
				})
				i = i+1;
				LoopNode(i,item.p_node,amount_betting,callback);
			}
			else
			{
				return 'faile';
			}
		}
		else
		{
			return 'faile';
		}
	})
}

function awards_sell(MarketName){
	var array_win_sell = [];
	var array_lose_buy = [];
	OrderSell.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_sell,sellorder){
		if (sellorder.length > 0)
		{
			var new_balance;
			var done;
			forEach(sellorder, function(item, index){
				done = this.async();
				get_balance(item.account_id,function(balance){
					new_balance = (parseFloat(balance) + parseFloat(item.amount) + (parseFloat(item.amount)*0.96)).toFixed(2);
					request(config.host+'/qwertyuikjhbhjjansdbasvdb?string='+item.account_id+'_'+item.amount, function (error, response, body) {
						OrderSell.update({'_id' : item._id},{'$set' : {'status' : 1}},function(err,rs){
							
							newHistory(item.account_id,'win',parseFloat(item.amount),(parseFloat(item.amount)*0.96).toFixed(2),item.MarketName,"Sell",item.type,new_balance).save(( err,history_create)=>{
								array_win_sell.push({
									'awards' : 'Sell',
									'account_id' : item.account_id,
									'amount' : (parseFloat(item.amount)*0.96).toFixed(2),
									'type' : 'Win',
									'MarketName' : item.MarketName	
								});

								parseInt(item.type) == 0 && (

									Update_BalanceServer(parseFloat(item.amount),'win'),
									
									LoopNode(0,item.user_id,item.amount,function(cb){
									})
								);

								setTimeout(function() {
									done()
								}, 50)
							});

								
						})	
					})
				});
				(sellorder.length - 1 === index) && (
					setTimeout(function() {

						OrderBuy.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_buy,buyorder){
							if (buyorder.length > 0)
							{
								var dones;
								forEach(buyorder, function(items, indexs){
									dones = this.async();
									OrderBuy.update({'_id' : items._id},{'$set' : {'status' : 1}},function(err,rs){
										get_balance(items.account_id,function(balance_res){
											
											newHistory(items.account_id,'lose',parseFloat(items.amount),parseFloat(items.amount),items.MarketName,"Buy",items.type,balance_res).save(( err,history_create)=>{
												array_win_sell.push({
													'awards' : 'Buy',
													'account_id' : items.account_id,
													'amount' : parseFloat(items.amount),
													'type' : 'Lose',
													'MarketName' : items.MarketName	
												});
												parseInt(items.type) == 0 && Update_BalanceServer(parseFloat(items.amount),'lose');
												
												setTimeout(function() {
													dones()
												}, 50)
											})
										})
											
									});
										
									(buyorder.length - 1 === indexs) && (
										setTimeout(function() {
											info.sockets.socket.broadcast.emit('Buy_Sell_Matchings',[array_win_sell,MarketName]),
											info.sockets.socket.emit('Buy_Sell_Matchings', [array_win_sell,MarketName]);
										}, 1250)
									)
								})
							}
							else
							{
								setTimeout(function() {
									info.sockets.socket.broadcast.emit('Buy_Sell_Matchings',[array_win_sell,MarketName]),
									info.sockets.socket.emit('Buy_Sell_Matchings', [array_win_sell,MarketName]);
								}, 1250)
							}
						})
					}, 50)
				)
			});
		}
		else
		{
			OrderBuy.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_buy,buyorder){
				var doness;
				forEach(buyorder, function(items, indexs){
					doness = this.async();
					OrderBuy.update({'_id' : items._id},{'$set' : {'status' : 1}},function(err,rs){
						get_balance(items.account_id,function(balance_res){
							
							newHistory(items.account_id,'lose',parseFloat(items.amount),parseFloat(items.amount),items.MarketName,"Buy",items.type,balance_res).save(( err,history_create)=>{
								array_lose_buy.push({
									'awards' : 'Buy',
									'account_id' : items.account_id,
									'amount' : parseFloat(items.amount),
									'type' : 'Lose',
									'MarketName' : items.MarketName	
								});
								parseInt(items.type) == 0 && Update_BalanceServer(parseFloat(items.amount),'lose');
								
								setTimeout(function() {
									doness()
								}, 50)
							})
						})
							
					});
						
					(buyorder.length - 1 === indexs) && (
						setTimeout(function() {
							info.sockets.socket.broadcast.emit('Buy_Sell_Matchings',[array_lose_buy,MarketName]),
							info.sockets.socket.emit('Buy_Sell_Matchings', [array_lose_buy,MarketName]);
						}, 1250)
					)
				})
			})
		}
	})	
}

function awards_buy(MarketName){
	
	var array_win_buy = [];
	var array_lose_sell = [];
	OrderBuy.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_sell,buyorder){
		if (buyorder.length > 0)
		{
			var new_balance;
			var done;
			forEach(buyorder, function(item, index){
				done = this.async();
				get_balance(item.account_id,function(balance){
					new_balance = (parseFloat(balance) + parseFloat(item.amount) + (parseFloat(item.amount)*0.96)).toFixed(2);
					request(config.host+'/qwertyuikjhbhjjansdbasvdb?string='+item.account_id+'_'+item.amount, function (error, response, body) {
						OrderBuy.update({'_id' : item._id},{'$set' : {'status' : 1}},function(err,rs){
							
							newHistory(item.account_id,'win',parseFloat(item.amount),(parseFloat(item.amount)*0.96).toFixed(2),item.MarketName,"Buy",item.type,new_balance).save(( err,history_create)=>{
								array_win_buy.push({
									'awards' : 'Buy',
									'account_id' : item.account_id,
									'amount' : (parseFloat(item.amount)*0.96).toFixed(2),
									'type' : 'Win',
									'MarketName' : item.MarketName	
								});
								
								parseInt(item.type) == 0 && (
									Update_BalanceServer(parseFloat(item.amount),'win'),
									LoopNode(0,item.user_id,item.amount,function(cb){
									})
								);
								setTimeout(function() {
									done()
								}, 50)
							});
						})	
					})
				});
				(buyorder.length - 1 === index) && (
					setTimeout(function() {

						OrderSell.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_sell,sellorder){
							if (sellorder.length > 0)
							{
								var dones;
								forEach(sellorder, function(items, indexs){
									dones = this.async();
									OrderSell.update({'_id' : items._id},{'$set' : {'status' : 1}},function(err,rs){
										get_balance(items.account_id,function(balance_res){	
											newHistory(items.account_id,'lose',parseFloat(items.amount),parseFloat(items.amount),items.MarketName,"Sell",items.type,balance_res).save(( err,history_create)=>{
												array_win_buy.push({
													'awards' : 'Sell',
													'account_id' : items.account_id,
													'amount' : parseFloat(items.amount),
													'type' : 'Lose',
													'MarketName' : items.MarketName	
												});
												
												parseInt(items.type) == 0 && Update_BalanceServer(parseFloat(items.amount),'lose');
												setTimeout(function() {
													dones()
												}, 50)
											})
										})
											
									});
										
									(sellorder.length - 1 === indexs) && (
										setTimeout(function() {
											info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', [array_win_buy,MarketName]),
											info.sockets.socket.emit('Buy_Sell_Matchings', [array_win_buy,MarketName]);
										}, 1250)
									)
								})
							}
							else
							{
								setTimeout(function() {
									info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', [array_win_buy,MarketName]),
									info.sockets.socket.emit('Buy_Sell_Matchings', [array_win_buy,MarketName]);
								}, 1250)
							}
						})
					}, 50)
				)
			});
		}
		else
		{
			OrderSell.find({'$and' : [{'MarketName' :MarketName},{'status' : 0},{'robot' : 0}]},function(err_sell,sellorder){
				var doness;
				forEach(sellorder, function(items, indexs){
					doness = this.async();
					OrderSell.update({'_id' : items._id},{'$set' : {'status' : 1}},function(err,rs){
						get_balance(items.account_id,function(balance_res){	
							newHistory(items.account_id,'lose',parseFloat(items.amount),parseFloat(items.amount),items.MarketName,"Sell",items.type,balance_res).save(( err,history_create)=>{
								array_lose_sell.push({
									'awards' : 'Sell',
									'account_id' : items.account_id,
									'amount' : parseFloat(items.amount),
									'type' : 'Lose',
									'MarketName' : items.MarketName	
								});
								parseInt(items.type) == 0 && Update_BalanceServer(parseFloat(items.amount),'lose');
								setTimeout(function() {
									doness()
								}, 50)
							})
						})
							
					});
						
					(sellorder.length - 1 === indexs) && (
						setTimeout(function() {
							info.sockets.socket.broadcast.emit('Buy_Sell_Matchings', [array_lose_sell,MarketName]),
							info.sockets.socket.emit('Buy_Sell_Matchings', [array_lose_sell,MarketName]);
						}, 1250)
					)
				})
			})
		}
	})	
}


function process_buy_exchange(string_receiverabit , callback){

	process_buy(string_receiverabit, function(cb){
		//callback(true)
		cb ? callback(true) : callback(false)
	});
}

function process_sell_exchange(string_receiverabit , callback){

	process_sell(string_receiverabit, function(cb){
		cb ? callback(true) : callback(false)
	});
}

function process_cancel_order_open(string_receiverabit , callback){

	process_cancel_order(string_receiverabit, function(cb){
		cb ? callback(true) : callback(false)
	});
}



function robo_trade_sell(){
	Volume.findOne({'MarketName' : 'BTC-STC'},function(err,volume){
		if (volume)
		{
			if (parseFloat(volume.volume_last) <= 8200000000 && parseFloat(volume.last) < 18275)
			{
				var last = parseFloat(volume.last);
				var quantity = parseInt(_.random(500,1000));
				var rand_price_add  = parseInt(_.random(2,10));
				var subtotal = parseFloat(quantity) * (parseFloat(last)+parseFloat(rand_price_add));
				var commission = (subtotal*0.0025).toFixed(8);
				var randomss = _.random(1,2);
				console.log(randomss);
				if (parseInt(randomss) == 1)
				{
					newOrderSell("5a5a2290ff10084afefe9894", "BTC-STC",quantity*100000000,parseFloat(last)+parseFloat(rand_price_add), subtotal, commission, subtotal).save(( err,order_create)=>{
						order_create && matching_buy(order_create);        		
						setTimeout(function() {
							newOrderBuy("5a5a2290ff10084afefe9894", "BTC-STC",quantity*100000000,parseFloat(last)+parseFloat(rand_price_add), subtotal, commission, subtotal).save(( err,order_createdd)=>{
								order_createdd && matching_sell(order_createdd);
							})
						}, 20000);

					})
				}
				else
				{
					newOrderBuy("5a5a2290ff10084afefe9894", "BTC-STC",quantity*100000000,parseFloat(last)-parseFloat(rand_price_add), subtotal, commission, subtotal).save(( err,order_createdd)=>{
						order_createdd && matching_sell(order_createdd);
						setTimeout(function() {
							newOrderSell("5a5a2290ff10084afefe9894", "BTC-STC",quantity*100000000,parseFloat(last)-parseFloat(rand_price_add), subtotal, commission, subtotal).save(( err,order_create)=>{
								order_create && matching_buy(order_create);        		
							})	
						}, 10000);
					})
				}
			}
		}
	});
}

setTimeout(function() {
	//initssss();
}, 20000);
function initssss() {
    var myFunction = function() {
        robo_trade_sell();
        var rand = Math.round(Math.random() * (100000 - 500)) + 5000; 
        setTimeout(myFunction, rand);
    }
    myFunction();
}

function robo_trade_buy(){
	Volume.findOne({'MarketName' : 'BTC-STC'},function(err,volume){
		if (volume)
		{
			var last = parseFloat(volume.last);
			var quantity = 100;
			var rand_price_add  = 15;
			var subtotal = parseFloat(quantity) * (parseFloat(last)+parseFloat(rand_price_add));
			var commission = (subtotal*0.0025).toFixed(8);
			newOrderBuy("5a191e6474ac96292883dd87", "BTC-STC",quantity*100000000,parseFloat(last)+parseFloat(rand_price_add), subtotal, commission, subtotal).save(( err,order_create)=>{
				order_create && matching_sell(order_create);
        		
			})
		}
	});
}

setTimeout(function() {
	//countdown_order('BTC');
	//countdown_order('ETH');
}, 35000);
const time_count_dow = 5; 
function countdown_order(MarketName)
{
	var second = time_count_dow;
	var interval = setInterval(function() {
		
		info.sockets.socket.broadcast.emit('CounDown', {'second' : second, 'type' : 'order','MarketName' : MarketName ,'date' : new Date()}),
		info.sockets.socket.emit('CounDown', {'second' : second, 'type' : 'order','MarketName' : MarketName,'date' : new Date()});

	    second--;
	    if (second == -1) {
	        clearInterval(interval);
	        countdown_matching(MarketName);
	    }
	}, 1000);
}

function countdown_matching(MarketName)
{
	var second = time_count_dow ;
	var interval = setInterval(function() {
		
		if (second == time_count_dow)
		{
			push_chart(MarketName);
		}
		

		info.sockets.socket.broadcast.emit('CounDown', {'second' : second, 'type' : 'matching','MarketName' : MarketName}),
		info.sockets.socket.emit('CounDown', {'second' : second, 'type' : 'matching','MarketName' : MarketName});

	    second--;
	    if (second == -1)
	    {
	    	matching_buy_sell(MarketName);
	    }
	    if (second == -1) {
	        clearInterval(interval);
	        countdown_order(MarketName);
	    }
	}, 1000);
}

function edit_chart(MarketName)
{
	Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -1 }},function(errss,data_matching){
		if (data_matching && !errss && (data_matching.history).length > 0)
		{
			console.log(data_matching);
		}
	})
}

function push_chart(MarketName)
{
	Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -1 }},function(errss,data_matching){
		if (data_matching && !errss && (data_matching.history).length > 0)
		{
			var hight = data_matching.history[0].hight;
			var random_0 = parseFloat(Math.random()*1);
			var random_1 = parseFloat(Math.random()*2);
			
			var date = new Date().getTime() * 1000 + parseFloat(time_count_dow)*100;
			var created_on = new Date().toLocaleString();
			var query = {'MarketName' : MarketName};

			if ((Math.floor(Math.random() * 2) + 1) == 1)
			{
				var data_update = {
					$push: {
			            'history': {
		                 	'open': (parseFloat(hight) - random_0).toFixed(2),
			                'close': (parseFloat(hight)).toFixed(2),
			                'hight': (parseFloat(hight) + random_1).toFixed(2),
			                'low': (parseFloat(hight) + random_1 + random_1).toFixed(2),
			                'types': 'Buy',
			                'date': date,
			                'created_on' : created_on
			            }
			        }
				};

				Matching.update(query, data_update, function(err, newUser) {
						var array_push_matching = {
							'open': (parseFloat(hight) - random_0).toFixed(2),
			                'close': (parseFloat(hight)).toFixed(2),
			                'hight': (parseFloat(hight) + random_1).toFixed(2),
			                'low': (parseFloat(hight) + random_1 + random_1).toFixed(2),
			                'types': 'Buy',
			                'date': date,
			                'created_on' : created_on,
			                'MarketName' : MarketName
						};
						info.sockets.socket.broadcast.emit('Matchings:push',array_push_matching);
						info.sockets.socket.emit('Matchings:push', array_push_matching);
					
				})
			}
			else
			{
				var data_update = {
					$push: {
			            'history': {
			                'open': (parseFloat(hight) + random_0 ).toFixed(2),
			                'close': (parseFloat(hight)).toFixed(2),
			                'hight': (parseFloat(hight) - random_1 ).toFixed(2),
			                'low': (parseFloat(hight) - random_1 - random_1 ).toFixed(2),
			                'types': 'Sell',
			                'date': date,
			                'created_on' : created_on
			            }
			        }
				};
				Matching.update(query, data_update, function(err, newUser) {
					var array_push_matching = {
						'open': (parseFloat(hight) + random_0 ).toFixed(2),
		                'close': (parseFloat(hight)).toFixed(2),
		                'hight': (parseFloat(hight) - random_1 ).toFixed(2),
		                'low': (parseFloat(hight) - random_1 - random_1 ).toFixed(2),
		                'types': 'Sell',
		                'date': date,
		                'created_on' : created_on,
		                'MarketName' : MarketName
					}
					info.sockets.socket.broadcast.emit('Matching:push',array_push_matching);
					info.sockets.socket.emit('Matching:push', array_push_matching);	
				})
			}
		}
	})
}






 var stack_btcusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_ethusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_bchusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_xrpusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_ltcusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_miotausd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_xemusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_dashusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_eurusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_audusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_gbpusd = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_usdjpy = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_eurgbp = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_eurjpy = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_usdcad = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var stack_usdchf = [ 
  [ 1524563645935000, 8304.77, 8304.76, 8303.57, 8304.52 ],
  [ 1524563648975000, 8304.77, 8304.76, 8303, 8304.52 ],
  [ 1524563652007000, 8304.77, 8304.76, 8305.1, 8304.52 ],
  [ 1524563655044000, 8304.77, 8304.76, 8302.89, 8304.52 ],
  [ 1524563658087000, 8304.77, 8304.76, 8302.42, 8304.52 ],
  [ 1524563661132000, 8304.77, 8304.76, 8308.21, 8304.52 ],
  [ 1524563664157000, 8304.77, 8304.76, 8303.89, 8304.52 ],
  [ 1524563667194000, 8304.77, 8304.76, 8304.51, 8304.52 ],
  [ 1524563670225000, 8304.77, 8304.76, 8303.43, 8304.52 ],
  [ 1524563673254000, 8304.77, 8304.76, 8305.51, 8304.52 ],
  [ 1524563676291000, 8304.77, 8304.76, 8303.66, 8304.52 ],
  [ 1524563679328000, 8304.77, 8304.76, 8305.83, 8304.52 ],
  [ 1524563682369000, 8304.77, 8304.76, 8304.21, 8304.52 ],
  [ 1524563685402000, 8304.77, 8304.76, 8305.14, 8304.52 ],
  [ 1524563688439000, 8304.77, 8304.76, 8304.14, 8304.52 ] 
  ];
var array_item_usdchf = [];
var array_item_usdcad = [];
var array_item_eurjpy = [];
var array_item_eurgbp = [];
var array_item_usdjpy = [];
var array_item_gbpusd = [];
var array_item_audusd = [];
var array_item_eurusd = [];
var array_item_dashusd = [];
var array_item_xemusd = [];
var array_item_miotausd = [];
var array_item_ltcusd = [];
var array_item_xrpusd = [];

var array_item_btcusd = [];
var array_item_ethusd = [];
var array_item_bchusd = [];


function randomXToY(minVal,maxVal,floatVal)
{
    var randVal = minVal+(Math.random()*(maxVal-minVal));
    return typeof floatVal=='undefined'?Math.round(randVal):randVal.toFixed(floatVal);
}

function get_buy_sell(MarketName,callback)
{
	
	if (parseFloat(global_total_buy) > 0 || parseFloat(global_total_sell) > 0)
	{
		if (parseFloat(global_total_buy_admin) > 0 || parseFloat(global_total_sell_admin) > 0)
		{
			if (parseFloat(global_total_buy_admin) > 0)
			{
				callback('buy');
			}
			else
			{
				callback('sell');
			}
		}
		else
		{
			if (parseFloat(global_total_buy) > parseFloat(global_total_sell))
			{
				if (parseFloat(global_total_sell) == 0 && parseFloat(global_total_buy) < parseFloat(global_balance_server) && _.random(1,2) == 1)
				{
					callback('buy');
				}
				else
				{
					callback('sell');
				}
				
			} 
			else if (parseFloat(global_total_buy) < parseFloat(global_total_sell))
			{
				if (parseFloat(global_total_buy) == 0 && parseFloat(global_total_sell) < parseFloat(global_balance_server)  && _.random(1,2) == 1)
				{
					callback('sell');
				}
				else
				{
					callback('buy');
				}
				
			}
			else if (parseFloat(global_total_buy) == parseFloat(global_total_sell))
			{
				callback('none');
			}
		}
	}
	else
	{
		callback('none');
	}
	
}
function remove_buy_sell_robot(){
	OrderSell.remove({'robot' : 1},function(err,resssss){});
	OrderBuy.remove({'robot' : 1},function(err,resssss){});
}
function random_buy_sell(MarketName)
{
	var amount = parseInt(_.random(20000,100000));
	if (_.random(1,2) == 1)
	{
		newOrderSell('5abf08479b277336c7b2ddde', MarketName,amount,1,0,'').save(( err, order_create)=>{});
	}
	else
	{
		newOrderBuy('5abf08479b277336c7b2ddde', MarketName,amount,1,0,'').save(( err, order_create)=>{});
	}
}

function while_true()
{
	var second = 29;
	var time = 0;
	var timeLeft = second - time;
	var tmpOrder = true;
	var max = 0, min = 0;
	var flag = 0;
	var start_white;
	var end_white;
	var hight_btcusd,open_btcusd,close_btcusd,date_btcusd,low_btcusd,random_0_btcusd,hight_temp_btcusd;
	var hight_ethusd,open_ethusd,close_ethusd,date_ethusd,low_ethusd,random_0_ethusd,hight_temp_ethusd;
	var hight_bchusd,open_bchusd,close_bchusd,date_bchusd,low_bchusd,random_0_bchusd,hight_temp_bchusd;
	var hight_xrpusd,open_xrpusd,close_xrpusd,date_xrpusd,low_xrpusd,random_0_xrpusd,hight_temp_xrpusd;
	var hight_ltcusd,open_ltcusd,close_ltcusd,date_ltcusd,low_ltcusd,random_0_ltcusd,hight_temp_ltcusd;
	var hight_miotausd,open_miotausd,close_miotausd,date_miotausd,low_miotausd,random_0_miotausd,hight_temp_miotausd;
	var hight_xemusd,open_xemusd,close_xemusd,date_xemusd,low_xemusd,random_0_xemusd,hight_temp_xemusd;
	var hight_dashusd,open_dashusd,close_dashusd,date_dashusd,low_dashusd,random_0_dashusd,hight_temp_dashusd;
	var hight_eurusd,open_eurusd,close_eurusd,date_eurusd,low_eurusd,random_0_eurusd,hight_temp_eurusd;
	var hight_audusd,open_audusd,close_audusd,date_audusd,low_audusd,random_0_audusd,hight_temp_audusd;
	var hight_gbpusd,open_gbpusd,close_gbpusd,date_gbpusd,low_gbpusd,random_0_gbpusd,hight_temp_gbpusd;
	var hight_usdjpy,open_usdjpy,close_usdjpy,date_usdjpy,low_usdjpy,random_0_usdjpy,hight_temp_usdjpy;
	var hight_eurgbp,open_eurgbp,close_eurgbp,date_eurgbp,low_eurgbp,random_0_eurgbp,hight_temp_eurgbp;
	var hight_eurjpy,open_eurjpy,close_eurjpy,date_eurjpy,low_eurjpy,random_0_eurjpy,hight_temp_eurjpy;
	var hight_usdcad,open_usdcad,close_usdcad,date_usdcad,low_usdcad,random_0_usdcad,hight_temp_usdcad;
	var hight_usdchf,open_usdchf,close_usdchf,date_usdchf,low_usdchf,random_0_usdchf,hight_temp_usdchf;
	while (true) {
		start_white = new Date();
		time >= second ? time = 0 : time ++ ;
	  	time >= 0 ? timeLeft = second - time : timeLeft = 0 ;

	  	
	  	if(tmpOrder){ //dang khop 
	  		socket_CounDown_push(timeLeft,'matching');

	  		/*BTC*/
	  		get_buy_sell('Bitcoin',function(return_buy_sell_btcusd){

		  		hight_btcusd = parseFloat(stack_btcusd[14][3]);
	  			open_btcusd =  parseFloat(stack_btcusd[14][1]);
	  			close_btcusd = parseFloat(stack_btcusd[14][2]);
	  			date_btcusd = parseFloat(stack_btcusd[14][0]);   
	  			low_btcusd = parseFloat(stack_btcusd[14][4]);
	  			
	  			if (return_buy_sell_btcusd == 'none')
	  		 	{
	  		 		random_0_btcusd = parseFloat(randomXToY(-0.5,0.5,2));
	  		 	}
	  		 	if (return_buy_sell_btcusd == 'buy')
	  		 	{
	  		 		random_0_btcusd = parseFloat(randomXToY(-0.1,0.4,2));
	  		 	}
	  		 	if (return_buy_sell_btcusd == 'sell')
	  		 	{
	  		 		random_0_btcusd = parseFloat(randomXToY(-0.4,0.1,2));
	  		 	}
	  		 	//random_0_btcusd = parseFloat(randomXToY(-0.5,0.5,2));
	            hight_btcusd = parseFloat((parseFloat(hight_btcusd) + parseFloat(random_0_btcusd)).toFixed(2));
	            stack_btcusd[14][3] = parseFloat(hight_btcusd);
	            stack_btcusd[14][1] = parseFloat(hight_btcusd) < parseFloat(stack_btcusd[14][1]) ? parseFloat(hight_btcusd) : parseFloat(stack_btcusd[14][1]);
	            stack_btcusd[14][2] = parseFloat(stack_btcusd[14][2]);
	            stack_btcusd[14][4] = parseFloat(hight_btcusd) > parseFloat(stack_btcusd[14][4]) ? parseFloat(hight_btcusd) : parseFloat(stack_btcusd[14][4]);
	            hight_temp_btcusd = parseFloat(stack_btcusd[14][3]).toFixed(2);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_btcusd,'Bitcoin']),
					info.sockets.socket.emit('Matching:push',[stack_btcusd,'Bitcoin'])
				);	 
		  		if(time >= second){
		  			remove_buy_sell_robot();
		  		 	tmpOrder = false;
  		 			if (close_btcusd - hight_btcusd <= 0){ //console.log('buy');
						stack_btcusd.shift();
						random_0_btcusd = parseFloat(randomXToY(0.1,1,2));
						stack_btcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_btcusd) - parseFloat(random_0_btcusd)).toFixed(2),
							(parseFloat(hight_temp_btcusd)).toFixed(2)  , 
							(parseFloat(hight_temp_btcusd) + parseFloat(random_0_btcusd)).toFixed(2) , 
							(parseFloat(hight_temp_btcusd)  + parseFloat(random_0_btcusd) + parseFloat(random_0_btcusd)).toFixed(2) 
						]);
						if (array_item_btcusd.length >= 60){
							array_item_btcusd = [];
							array_item_btcusd[0] = 'Buy';
						}else{
							array_item_btcusd[array_item_btcusd.length] = 'Buy';
						}
						awards_buy('Bitcoin')
					}
					else{ //console.log('sell');
						stack_btcusd.shift();
						random_0_btcusd = parseFloat(randomXToY(0.1,1,2));
						stack_btcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_btcusd) + parseFloat(random_0_btcusd)).toFixed(2),
							(parseFloat(hight_temp_btcusd)).toFixed(2),
							(parseFloat(hight_temp_btcusd)  - parseFloat(random_0_btcusd)).toFixed(2) , 
							(parseFloat(hight_temp_btcusd) - parseFloat(random_0_btcusd) - parseFloat(random_0_btcusd)).toFixed(2)
						]);
						if (array_item_btcusd.length >= 60){
							array_item_btcusd = [];
							array_item_btcusd[0] = 'Sell';
						}else{
							array_item_btcusd[array_item_btcusd.length] = 'Sell'
						}
						awards_sell('Bitcoin');
					}
	  		 		
	  		 		
	  		 		socket_MatchingItem_push(array_item_btcusd,'Bitcoin')
					socket_Matching_push(stack_btcusd,'Bitcoin');

					global_total_sell = 0;
					global_total_buy = 0;
					global_total_buy_admin = 0;
					global_total_sell_admin = 0;
					//set_chart_item_auto();

					global_status_betting = 1;
					setTimeout(function() {
						if (parseFloat(global_balance_server) < 0) global_balance_server = 0;
					}, 1000);

	  			}
	  		})
	  		/*END BTC*/

	  		/*ETH*/
	  		get_buy_sell('Ethereum',function(return_buy_sell_ethusd){
		  		hight_ethusd = parseFloat(stack_ethusd[14][3]);
	  			open_ethusd =  parseFloat(stack_ethusd[14][1]);
	  			close_ethusd = parseFloat(stack_ethusd[14][2]);
	  			date_ethusd = parseFloat(stack_ethusd[14][0]);   
	  			low_ethusd = parseFloat(stack_ethusd[14][4]);

	  			if (return_buy_sell_ethusd == 'none')
	  		 	{
	  		 		random_0_ethusd = parseFloat(randomXToY(-0.5,0.5,3));
	  		 	}
	  		 	if (return_buy_sell_ethusd == 'buy')
	  		 	{
	  		 		random_0_ethusd = parseFloat(randomXToY(-0.1,0.4,3));
	  		 	}
	  		 	if (return_buy_sell_ethusd == 'sell')
	  		 	{
	  		 		random_0_ethusd = parseFloat(randomXToY(-0.4,0.1,3));
	  		 	}

	            hight_ethusd = parseFloat((parseFloat(hight_ethusd) + parseFloat(random_0_ethusd)).toFixed(3));
	            stack_ethusd[14][3] = parseFloat(hight_ethusd);
	            stack_ethusd[14][1] = parseFloat(hight_ethusd) < parseFloat(stack_ethusd[14][1]) ? parseFloat(hight_ethusd) : parseFloat(stack_ethusd[14][1]);
	            stack_ethusd[14][2] = parseFloat(stack_ethusd[14][2]);
	            stack_ethusd[14][4] = parseFloat(hight_ethusd) > parseFloat(stack_ethusd[14][4]) ? parseFloat(hight_ethusd) : parseFloat(stack_ethusd[14][4]);
	            hight_temp_ethusd = parseFloat(stack_ethusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_ethusd,'Ethereum']),
					info.sockets.socket.emit('Matching:push',[stack_ethusd,'Ethereum'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_ethusd - hight_ethusd <= 0){ //console.log('buy');
						stack_ethusd.shift();
						random_0_ethusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_ethusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ethusd) - parseFloat(random_0_ethusd)).toFixed(3),
							(parseFloat(hight_temp_ethusd)).toFixed(3)  , 
							(parseFloat(hight_temp_ethusd) + parseFloat(random_0_ethusd)).toFixed(3) , 
							(parseFloat(hight_temp_ethusd)  + parseFloat(random_0_ethusd) + parseFloat(random_0_ethusd)).toFixed(3) 
						]);
						if (array_item_ethusd.length >= 60){
							array_item_ethusd = [];
							array_item_ethusd[0] = 'Buy';
						}else{
							array_item_ethusd[array_item_ethusd.length] = 'Buy';
						}
						awards_buy('Ethereum')
					}
					else{
						stack_ethusd.shift();
						random_0_ethusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_ethusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ethusd) + parseFloat(random_0_ethusd)).toFixed(3),
							(parseFloat(hight_temp_ethusd)).toFixed(3),
							(parseFloat(hight_temp_ethusd)  - parseFloat(random_0_ethusd)).toFixed(3) , 
							(parseFloat(hight_temp_ethusd) - parseFloat(random_0_ethusd) - parseFloat(random_0_ethusd)).toFixed(3)
						]);
						if (array_item_ethusd.length >= 60){
							array_item_ethusd = [];
							array_item_ethusd[0] = 'Sell';
						}else{
							array_item_ethusd[array_item_ethusd.length] = 'Sell'
						}
						awards_sell('Ethereum');
					}
					
					socket_MatchingItem_push(array_item_ethusd,'Ethereum')
					socket_Matching_push(stack_ethusd,'Ethereum');
		  		}
		  	})
	  		/*END ETH*/

	  		/*BCH*/
	  		get_buy_sell('Bitcoin Cash',function(return_buy_sell_bchusd){
		  		hight_bchusd = parseFloat(stack_bchusd[14][3]);
	  			open_bchusd =  parseFloat(stack_bchusd[14][1]);
	  			close_bchusd = parseFloat(stack_bchusd[14][2]);
	  			date_bchusd = parseFloat(stack_bchusd[14][0]);   
	  			low_bchusd = parseFloat(stack_bchusd[14][4]);
	  			
	            
	  			if (return_buy_sell_bchusd == 'none')
	  		 	{
	  		 		random_0_bchusd = parseFloat(randomXToY(-0.5,0.5,3));
	  		 	}
	  		 	if (return_buy_sell_bchusd == 'buy')
	  		 	{
	  		 		random_0_bchusd = parseFloat(randomXToY(-0.1,0.4,3));
	  		 	}
	  		 	if (return_buy_sell_bchusd == 'sell')
	  		 	{
	  		 		random_0_bchusd = parseFloat(randomXToY(-0.4,0.1,3));
	  		 	}

	            hight_bchusd = parseFloat((parseFloat(hight_bchusd) + parseFloat(random_0_bchusd)).toFixed(3));
	            stack_bchusd[14][3] = parseFloat(hight_bchusd);
	            stack_bchusd[14][1] = parseFloat(hight_bchusd) < parseFloat(stack_bchusd[14][1]) ? parseFloat(hight_bchusd) : parseFloat(stack_bchusd[14][1]);
	            stack_bchusd[14][2] = parseFloat(stack_bchusd[14][2]);
	            stack_bchusd[14][4] = parseFloat(hight_bchusd) > parseFloat(stack_bchusd[14][4]) ? parseFloat(hight_bchusd) : parseFloat(stack_bchusd[14][4]);
	            hight_temp_bchusd = parseFloat(stack_bchusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_bchusd,'Bitcoin Cash']),
					info.sockets.socket.emit('Matching:push',[stack_bchusd,'Bitcoin Cash'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_bchusd - hight_bchusd <= 0){ //console.log('buy');
						stack_bchusd.shift();
						random_0_bchusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_bchusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_bchusd) - parseFloat(random_0_bchusd)).toFixed(3),
							(parseFloat(hight_temp_bchusd)).toFixed(3)  , 
							(parseFloat(hight_temp_bchusd) + parseFloat(random_0_bchusd)).toFixed(3) , 
							(parseFloat(hight_temp_bchusd)  + parseFloat(random_0_bchusd) + parseFloat(random_0_bchusd)).toFixed(3) 
						]);
						if (array_item_bchusd.length >= 60){
							array_item_bchusd = [];
							array_item_bchusd[0] = 'Buy';
						}else{
							array_item_bchusd[array_item_bchusd.length] = 'Buy';
						}
						awards_buy('Bitcoin Cash')
					}
					else{
						stack_bchusd.shift();
						random_0_bchusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_bchusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_bchusd) + parseFloat(random_0_bchusd)).toFixed(3),
							(parseFloat(hight_temp_bchusd)).toFixed(3),
							(parseFloat(hight_temp_bchusd)  - parseFloat(random_0_bchusd)).toFixed(3) , 
							(parseFloat(hight_temp_bchusd) - parseFloat(random_0_bchusd) - parseFloat(random_0_bchusd)).toFixed(3)
						]);
						if (array_item_bchusd.length >= 60){
							array_item_bchusd = [];
							array_item_bchusd[0] = 'Sell';
						}else{
							array_item_bchusd[array_item_bchusd.length] = 'Sell'
						}
						awards_sell('Bitcoin Cash');
					}
					
					socket_MatchingItem_push(array_item_bchusd,'Bitcoin Cash')
					socket_Matching_push(stack_bchusd,'Bitcoin Cash');
		  		}
		  	})
	  		/*END BCH*/

	  		/*XRP*/
	  		get_buy_sell('Ripple',function(return_buy_sell_xrpusd){
		  		hight_xrpusd = parseFloat(stack_xrpusd[14][3]);
	  			open_xrpusd =  parseFloat(stack_xrpusd[14][1]);
	  			close_xrpusd = parseFloat(stack_xrpusd[14][2]);
	  			date_xrpusd = parseFloat(stack_xrpusd[14][0]);   
	  			low_xrpusd = parseFloat(stack_xrpusd[14][4]);
	  			

	  			if (return_buy_sell_xrpusd == 'none')
	  		 	{
	  		 		random_0_xrpusd = parseFloat(randomXToY(-0.0005,0.0005,6));	  		 		
	  		 	}
	  		 	if (return_buy_sell_xrpusd == 'buy')
	  		 	{
	  		 		random_0_xrpusd = parseFloat(randomXToY(-0.0001,0.0004,6));
	  		 	}
	  		 	if (return_buy_sell_xrpusd == 'sell')
	  		 	{
	  		 		random_0_xrpusd = parseFloat(randomXToY(-0.0004,0.0001,6));
	  		 	}

	            hight_xrpusd = parseFloat((parseFloat(hight_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6));
	            stack_xrpusd[14][3] = parseFloat(hight_xrpusd);
	            stack_xrpusd[14][1] = parseFloat(hight_xrpusd) < parseFloat(stack_xrpusd[14][1]) ? parseFloat(hight_xrpusd) : parseFloat(stack_xrpusd[14][1]);
	            stack_xrpusd[14][2] = parseFloat(stack_xrpusd[14][2]);
	            stack_xrpusd[14][4] = parseFloat(hight_xrpusd) > parseFloat(stack_xrpusd[14][4]) ? parseFloat(hight_xrpusd) : parseFloat(stack_xrpusd[14][4]);
	            hight_temp_xrpusd = parseFloat(stack_xrpusd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_xrpusd,'Ripple']),
					info.sockets.socket.emit('Matching:push',[stack_xrpusd,'Ripple'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_xrpusd - hight_xrpusd <= 0){ //console.log('buy');
						stack_xrpusd.shift();
						random_0_xrpusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xrpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xrpusd) - parseFloat(random_0_xrpusd)).toFixed(6),
							(parseFloat(hight_temp_xrpusd)).toFixed(6)  , 
							(parseFloat(hight_temp_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6) , 
							(parseFloat(hight_temp_xrpusd)  + parseFloat(random_0_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6) 
						]);
						if (array_item_xrpusd.length >= 60){
							array_item_xrpusd = [];
							array_item_xrpusd[0] = 'Buy';
						}else{
							array_item_xrpusd[array_item_xrpusd.length] = 'Buy';
						}
						awards_buy('Ripple')
					}
					else{
						stack_xrpusd.shift();
						random_0_xrpusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xrpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6),
							(parseFloat(hight_temp_xrpusd)).toFixed(6),
							(parseFloat(hight_temp_xrpusd)  - parseFloat(random_0_xrpusd)).toFixed(6) , 
							(parseFloat(hight_temp_xrpusd) - parseFloat(random_0_xrpusd) - parseFloat(random_0_xrpusd)).toFixed(6)
						]);
						if (array_item_xrpusd.length >= 60){
							array_item_xrpusd = [];
							array_item_xrpusd[0] = 'Sell';
						}else{
							array_item_xrpusd[array_item_xrpusd.length] = 'Sell'
						}
						awards_sell('Ripple');
					}
					
					socket_MatchingItem_push(array_item_xrpusd,'Ripple')
					socket_Matching_push(stack_xrpusd,'Ripple');
		  		}
		  	})
	  		/*END XRP*/

	  		/*LTC*/
	  		get_buy_sell('Litecoin',function(return_buy_sell_ltcusd){
		  		hight_ltcusd = parseFloat(stack_ltcusd[14][3]);
	  			open_ltcusd =  parseFloat(stack_ltcusd[14][1]);
	  			close_ltcusd = parseFloat(stack_ltcusd[14][2]);
	  			date_ltcusd = parseFloat(stack_ltcusd[14][0]);   
	  			low_ltcusd = parseFloat(stack_ltcusd[14][4]);
	  			
	  			if (return_buy_sell_ltcusd == 'none')
	  		 	{
	  		 		random_0_ltcusd = parseFloat(randomXToY(-0.05,0.05,3));
	  		 	}
	  		 	if (return_buy_sell_ltcusd == 'buy')
	  		 	{
	  		 		random_0_ltcusd = parseFloat(randomXToY(-0.01,0.04,3));
	  		 	}
	  		 	if (return_buy_sell_ltcusd == 'sell')
	  		 	{
	  		 		random_0_ltcusd = parseFloat(randomXToY(-0.04,0.01,3));
	  		 	}

	            hight_ltcusd = parseFloat((parseFloat(hight_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3));
	            stack_ltcusd[14][3] = parseFloat(hight_ltcusd);
	            stack_ltcusd[14][1] = parseFloat(hight_ltcusd) < parseFloat(stack_ltcusd[14][1]) ? parseFloat(hight_ltcusd) : parseFloat(stack_ltcusd[14][1]);
	            stack_ltcusd[14][2] = parseFloat(stack_ltcusd[14][2]);
	            stack_ltcusd[14][4] = parseFloat(hight_ltcusd) > parseFloat(stack_ltcusd[14][4]) ? parseFloat(hight_ltcusd) : parseFloat(stack_ltcusd[14][4]);
	            hight_temp_ltcusd = parseFloat(stack_ltcusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_ltcusd,'Litecoin']),
					info.sockets.socket.emit('Matching:push',[stack_ltcusd,'Litecoin'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_ltcusd - hight_ltcusd <= 0){ //console.log('buy');
						stack_ltcusd.shift();
						random_0_ltcusd = parseFloat(randomXToY(0.01,0.05,3));
						stack_ltcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ltcusd) - parseFloat(random_0_ltcusd)).toFixed(3),
							(parseFloat(hight_temp_ltcusd)).toFixed(3)  , 
							(parseFloat(hight_temp_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3) , 
							(parseFloat(hight_temp_ltcusd)  + parseFloat(random_0_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3) 
						]);
						if (array_item_ltcusd.length >= 60){
							array_item_ltcusd = [];
							array_item_ltcusd[0] = 'Buy';
						}else{
							array_item_ltcusd[array_item_ltcusd.length] = 'Buy';
						}
						awards_buy('Litecoin')
					}
					else{
						stack_ltcusd.shift();
						random_0_ltcusd = parseFloat(randomXToY(0.01,0.05,3));
						stack_ltcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3),
							(parseFloat(hight_temp_ltcusd)).toFixed(3),
							(parseFloat(hight_temp_ltcusd)  - parseFloat(random_0_ltcusd)).toFixed(3) , 
							(parseFloat(hight_temp_ltcusd) - parseFloat(random_0_ltcusd) - parseFloat(random_0_ltcusd)).toFixed(3)
						]);
						if (array_item_ltcusd.length >= 60){
							array_item_ltcusd = [];
							array_item_ltcusd[0] = 'Sell';
						}else{
							array_item_ltcusd[array_item_ltcusd.length] = 'Sell'
						}
						awards_sell('Litecoin');
					}
					
					socket_MatchingItem_push(array_item_ltcusd,'Litecoin')
					socket_Matching_push(stack_ltcusd,'Litecoin');
		  		}
		  	})
	  		/*END LTC*/

	  		/*MIOTA*/
	  		get_buy_sell('IOTA',function(return_buy_sell_miotausd){
		  		hight_miotausd = parseFloat(stack_miotausd[14][3]);
	  			open_miotausd =  parseFloat(stack_miotausd[14][1]);
	  			close_miotausd = parseFloat(stack_miotausd[14][2]);
	  			date_miotausd = parseFloat(stack_miotausd[14][0]);   
	  			low_miotausd = parseFloat(stack_miotausd[14][4]);
	  			
	            
	  			if (return_buy_sell_miotausd == 'none')
	  		 	{
	  		 		random_0_miotausd = parseFloat(randomXToY(-0.0005,0.0005,6)); 		 		
	  		 	}
	  		 	if (return_buy_sell_miotausd == 'buy')
	  		 	{
	  		 		random_0_miotausd = parseFloat(randomXToY(-0.0001,0.0004,6));
	  		 	}
	  		 	if (return_buy_sell_miotausd == 'sell')
	  		 	{
	  		 		random_0_miotausd = parseFloat(randomXToY(-0.0004,0.0001,6));
	  		 	}

	            hight_miotausd = parseFloat((parseFloat(hight_miotausd) + parseFloat(random_0_miotausd)).toFixed(6));
	            stack_miotausd[14][3] = parseFloat(hight_miotausd);
	            stack_miotausd[14][1] = parseFloat(hight_miotausd) < parseFloat(stack_miotausd[14][1]) ? parseFloat(hight_miotausd) : parseFloat(stack_miotausd[14][1]);
	            stack_miotausd[14][2] = parseFloat(stack_miotausd[14][2]);
	            stack_miotausd[14][4] = parseFloat(hight_miotausd) > parseFloat(stack_miotausd[14][4]) ? parseFloat(hight_miotausd) : parseFloat(stack_miotausd[14][4]);
	            hight_temp_miotausd = parseFloat(stack_miotausd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_miotausd,'IOTA']),
					info.sockets.socket.emit('Matching:push',[stack_miotausd,'IOTA'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_miotausd - hight_miotausd <= 0){ //console.log('buy');
						stack_miotausd.shift();
						random_0_miotausd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_miotausd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_miotausd) - parseFloat(random_0_miotausd)).toFixed(6),
							(parseFloat(hight_temp_miotausd)).toFixed(6)  , 
							(parseFloat(hight_temp_miotausd) + parseFloat(random_0_miotausd)).toFixed(6) , 
							(parseFloat(hight_temp_miotausd)  + parseFloat(random_0_miotausd) + parseFloat(random_0_miotausd)).toFixed(6) 
						]);
						if (array_item_miotausd.length >= 60){
							array_item_miotausd = [];
							array_item_miotausd[0] = 'Buy';
						}else{
							array_item_miotausd[array_item_miotausd.length] = 'Buy';
						}
						awards_buy('IOTA')
					}
					else{
						stack_miotausd.shift();
						random_0_miotausd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_miotausd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_miotausd) + parseFloat(random_0_miotausd)).toFixed(6),
							(parseFloat(hight_temp_miotausd)).toFixed(6),
							(parseFloat(hight_temp_miotausd)  - parseFloat(random_0_miotausd)).toFixed(6) , 
							(parseFloat(hight_temp_miotausd) - parseFloat(random_0_miotausd) - parseFloat(random_0_miotausd)).toFixed(6)
						]);
						if (array_item_miotausd.length >= 60){
							array_item_miotausd = [];
							array_item_miotausd[0] = 'Sell';
						}else{
							array_item_miotausd[array_item_miotausd.length] = 'Sell'
						}
						awards_sell('IOTA');
					}
					
					socket_MatchingItem_push(array_item_miotausd,'IOTA')
					socket_Matching_push(stack_miotausd,'IOTA');
		  		}
		  	})
	  		/*END MIOTA*/

	  		/*XEM*/
	  		get_buy_sell('Cardano',function(return_buy_sell_xemusd){
		  		hight_xemusd = parseFloat(stack_xemusd[14][3]);
	  			open_xemusd =  parseFloat(stack_xemusd[14][1]);
	  			close_xemusd = parseFloat(stack_xemusd[14][2]);
	  			date_xemusd = parseFloat(stack_xemusd[14][0]);   
	  			low_xemusd = parseFloat(stack_xemusd[14][4]);
	  			
	  			if (return_buy_sell_xemusd == 'none')
	  		 	{
	  		 		random_0_xemusd = parseFloat(randomXToY(-0.0005,0.0005,6)); 		 		
	  		 	}
	  		 	if (return_buy_sell_xemusd == 'buy')
	  		 	{
	  		 		random_0_xemusd = parseFloat(randomXToY(-0.0001,0.0004,6));
	  		 	}
	  		 	if (return_buy_sell_xemusd == 'sell')
	  		 	{
	  		 		random_0_xemusd = parseFloat(randomXToY(-0.0004,0.0001,6));
	  		 	}

	            hight_xemusd = parseFloat((parseFloat(hight_xemusd) + parseFloat(random_0_xemusd)).toFixed(6));
	            stack_xemusd[14][3] = parseFloat(hight_xemusd);
	            stack_xemusd[14][1] = parseFloat(hight_xemusd) < parseFloat(stack_xemusd[14][1]) ? parseFloat(hight_xemusd) : parseFloat(stack_xemusd[14][1]);
	            stack_xemusd[14][2] = parseFloat(stack_xemusd[14][2]);
	            stack_xemusd[14][4] = parseFloat(hight_xemusd) > parseFloat(stack_xemusd[14][4]) ? parseFloat(hight_xemusd) : parseFloat(stack_xemusd[14][4]);
	            hight_temp_xemusd = parseFloat(stack_xemusd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_xemusd,'Cardano']),
					info.sockets.socket.emit('Matching:push',[stack_xemusd,'Cardano'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_xemusd - hight_xemusd <= 0){ //console.log('buy');
						stack_xemusd.shift();
						random_0_xemusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xemusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xemusd) - parseFloat(random_0_xemusd)).toFixed(6),
							(parseFloat(hight_temp_xemusd)).toFixed(6)  , 
							(parseFloat(hight_temp_xemusd) + parseFloat(random_0_xemusd)).toFixed(6) , 
							(parseFloat(hight_temp_xemusd)  + parseFloat(random_0_xemusd) + parseFloat(random_0_xemusd)).toFixed(6) 
						]);
						if (array_item_xemusd.length >= 60){
							array_item_xemusd = [];
							array_item_xemusd[0] = 'Buy';
						}else{
							array_item_xemusd[array_item_xemusd.length] = 'Buy';
						}
						awards_buy('Cardano')
					}
					else{
						stack_xemusd.shift();
						random_0_xemusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xemusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xemusd) + parseFloat(random_0_xemusd)).toFixed(6),
							(parseFloat(hight_temp_xemusd)).toFixed(6),
							(parseFloat(hight_temp_xemusd)  - parseFloat(random_0_xemusd)).toFixed(6) , 
							(parseFloat(hight_temp_xemusd) - parseFloat(random_0_xemusd) - parseFloat(random_0_xemusd)).toFixed(6)
						]);
						if (array_item_xemusd.length >= 60){
							array_item_xemusd = [];
							array_item_xemusd[0] = 'Sell';
						}else{
							array_item_xemusd[array_item_xemusd.length] = 'Sell'
						}
						awards_sell('Cardano');
					}
					
					socket_MatchingItem_push(array_item_xemusd,'Cardano')
					socket_Matching_push(stack_xemusd,'Cardano');
		  		}
		  	})
	  		/*END XEM*/

	  		/*DASH*/
	  		get_buy_sell('DASH',function(return_buy_sell_dashusd){
		  		hight_dashusd = parseFloat(stack_dashusd[14][3]);
	  			open_dashusd =  parseFloat(stack_dashusd[14][1]);
	  			close_dashusd = parseFloat(stack_dashusd[14][2]);
	  			date_dashusd = parseFloat(stack_dashusd[14][0]);   
	  			low_dashusd = parseFloat(stack_dashusd[14][4]);
	  			
	  			if (return_buy_sell_dashusd == 'none')
	  		 	{
	  		 		random_0_dashusd = parseFloat(randomXToY(-0.05,0.05,3));
	  		 	}
	  		 	if (return_buy_sell_dashusd == 'buy')
	  		 	{
	  		 		random_0_dashusd = parseFloat(randomXToY(-0.01,0.04,3));
	  		 	}
	  		 	if (return_buy_sell_dashusd == 'sell')
	  		 	{
	  		 		random_0_dashusd = parseFloat(randomXToY(-0.04,0.01,3));
	  		 	}

	            hight_dashusd = parseFloat((parseFloat(hight_dashusd) + parseFloat(random_0_dashusd)).toFixed(3));
	            stack_dashusd[14][3] = parseFloat(hight_dashusd);
	            stack_dashusd[14][1] = parseFloat(hight_dashusd) < parseFloat(stack_dashusd[14][1]) ? parseFloat(hight_dashusd) : parseFloat(stack_dashusd[14][1]);
	            stack_dashusd[14][2] = parseFloat(stack_dashusd[14][2]);
	            stack_dashusd[14][4] = parseFloat(hight_dashusd) > parseFloat(stack_dashusd[14][4]) ? parseFloat(hight_dashusd) : parseFloat(stack_dashusd[14][4]);
	            hight_temp_dashusd = parseFloat(stack_dashusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_dashusd,'DASH']),
					info.sockets.socket.emit('Matching:push',[stack_dashusd,'DASH'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_dashusd - hight_dashusd <= 0){ //console.log('buy');
						stack_dashusd.shift();
						random_0_dashusd = parseFloat(randomXToY(0.001,0.005,3));
						stack_dashusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_dashusd) - parseFloat(random_0_dashusd)).toFixed(3),
							(parseFloat(hight_temp_dashusd)).toFixed(3)  , 
							(parseFloat(hight_temp_dashusd) + parseFloat(random_0_dashusd)).toFixed(3) , 
							(parseFloat(hight_temp_dashusd)  + parseFloat(random_0_dashusd) + parseFloat(random_0_dashusd)).toFixed(3) 
						]);
						if (array_item_dashusd.length >= 60){
							array_item_dashusd = [];
							array_item_dashusd[0] = 'Buy';
						}else{
							array_item_dashusd[array_item_dashusd.length] = 'Buy';
						}
						awards_buy('DASH')
					}
					else{
						stack_dashusd.shift();
						random_0_dashusd = parseFloat(randomXToY(0.001,0.005,3));
						stack_dashusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_dashusd) + parseFloat(random_0_dashusd)).toFixed(3),
							(parseFloat(hight_temp_dashusd)).toFixed(3),
							(parseFloat(hight_temp_dashusd)  - parseFloat(random_0_dashusd)).toFixed(3) , 
							(parseFloat(hight_temp_dashusd) - parseFloat(random_0_dashusd) - parseFloat(random_0_dashusd)).toFixed(3)
						]);
						if (array_item_dashusd.length >= 60){
							array_item_dashusd = [];
							array_item_dashusd[0] = 'Sell';
						}else{
							array_item_dashusd[array_item_dashusd.length] = 'Sell'
						}
						awards_sell('DASH');
					}
					
					socket_MatchingItem_push(array_item_dashusd,'DASH')
					socket_Matching_push(stack_dashusd,'DASH');
		  		}
		  	})
	  		/*END DASH*/

	  		/*EURUSD*/
	  		get_buy_sell('EURUSD',function(return_buy_sell_eurusd){
		  		hight_eurusd = parseFloat(stack_eurusd[14][3]);
	  			open_eurusd =  parseFloat(stack_eurusd[14][1]);
	  			close_eurusd = parseFloat(stack_eurusd[14][2]);
	  			date_eurusd = parseFloat(stack_eurusd[14][0]);   
	  			low_eurusd = parseFloat(stack_eurusd[14][4]);
	  			
	  			if (return_buy_sell_eurusd == 'none')
	  		 	{
	  		 		random_0_eurusd = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_eurusd == 'buy')
	  		 	{
	  		 		random_0_eurusd = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_eurusd == 'sell')
	  		 	{
	  		 		random_0_eurusd = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_eurusd = parseFloat((parseFloat(hight_eurusd) + parseFloat(random_0_eurusd)).toFixed(5));
	            stack_eurusd[14][3] = parseFloat(hight_eurusd);
	            stack_eurusd[14][1] = parseFloat(hight_eurusd) < parseFloat(stack_eurusd[14][1]) ? parseFloat(hight_eurusd) : parseFloat(stack_eurusd[14][1]);
	            stack_eurusd[14][2] = parseFloat(stack_eurusd[14][2]);
	            stack_eurusd[14][4] = parseFloat(hight_eurusd) > parseFloat(stack_eurusd[14][4]) ? parseFloat(hight_eurusd) : parseFloat(stack_eurusd[14][4]);
	            hight_temp_eurusd = parseFloat(stack_eurusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurusd,'EURUSD']),
					info.sockets.socket.emit('Matching:push',[stack_eurusd,'EURUSD'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_eurusd - hight_eurusd <= 0){ //console.log('buy');
						stack_eurusd.shift();
						random_0_eurusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurusd) - parseFloat(random_0_eurusd)).toFixed(5),
							(parseFloat(hight_temp_eurusd)).toFixed(5)  , 
							(parseFloat(hight_temp_eurusd) + parseFloat(random_0_eurusd)).toFixed(5) , 
							(parseFloat(hight_temp_eurusd)  + parseFloat(random_0_eurusd) + parseFloat(random_0_eurusd)).toFixed(5) 
						]);
						if (array_item_eurusd.length >= 60){
							array_item_eurusd = [];
							array_item_eurusd[0] = 'Buy';
						}else{
							array_item_eurusd[array_item_eurusd.length] = 'Buy';
						}
						awards_buy('EURUSD')
					}
					else{
						stack_eurusd.shift();
						random_0_eurusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurusd) + parseFloat(random_0_eurusd)).toFixed(5),
							(parseFloat(hight_temp_eurusd)).toFixed(5),
							(parseFloat(hight_temp_eurusd)  - parseFloat(random_0_eurusd)).toFixed(5) , 
							(parseFloat(hight_temp_eurusd) - parseFloat(random_0_eurusd) - parseFloat(random_0_eurusd)).toFixed(5)
						]);
						if (array_item_eurusd.length >= 60){
							array_item_eurusd = [];
							array_item_eurusd[0] = 'Sell';
						}else{
							array_item_eurusd[array_item_eurusd.length] = 'Sell'
						}
						awards_sell('EURUSD');
					}
					
					socket_MatchingItem_push(array_item_eurusd,'EURUSD')
					socket_Matching_push(stack_eurusd,'EURUSD');
		  		}
		  	})
	  		/*END EURUSD*/

	  		/*AUDUSD*/
	  		get_buy_sell('AUDUSD',function(return_buy_sell_audusd){
		  		hight_audusd = parseFloat(stack_audusd[14][3]);
	  			open_audusd =  parseFloat(stack_audusd[14][1]);
	  			close_audusd = parseFloat(stack_audusd[14][2]);
	  			date_audusd = parseFloat(stack_audusd[14][0]);   
	  			low_audusd = parseFloat(stack_audusd[14][4]);
	  			
	  			if (return_buy_sell_audusd == 'none')
	  		 	{
	  		 		random_0_audusd = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_audusd == 'buy')
	  		 	{
	  		 		random_0_audusd = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_audusd == 'sell')
	  		 	{
	  		 		random_0_audusd = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_audusd = parseFloat((parseFloat(hight_audusd) + parseFloat(random_0_audusd)).toFixed(5));
	            stack_audusd[14][3] = parseFloat(hight_audusd);
	            stack_audusd[14][1] = parseFloat(hight_audusd) < parseFloat(stack_audusd[14][1]) ? parseFloat(hight_audusd) : parseFloat(stack_audusd[14][1]);
	            stack_audusd[14][2] = parseFloat(stack_audusd[14][2]);
	            stack_audusd[14][4] = parseFloat(hight_audusd) > parseFloat(stack_audusd[14][4]) ? parseFloat(hight_audusd) : parseFloat(stack_audusd[14][4]);
	            hight_temp_audusd = parseFloat(stack_audusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_audusd,'AUDUSD']),
					info.sockets.socket.emit('Matching:push',[stack_audusd,'AUDUSD'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_audusd - hight_audusd <= 0){ //console.log('buy');
						stack_audusd.shift();
						random_0_audusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_audusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_audusd) - parseFloat(random_0_audusd)).toFixed(5),
							(parseFloat(hight_temp_audusd)).toFixed(5)  , 
							(parseFloat(hight_temp_audusd) + parseFloat(random_0_audusd)).toFixed(5) , 
							(parseFloat(hight_temp_audusd)  + parseFloat(random_0_audusd) + parseFloat(random_0_audusd)).toFixed(5) 
						]);
						if (array_item_audusd.length >= 60){
							array_item_audusd = [];
							array_item_audusd[0] = 'Buy';
						}else{
							array_item_audusd[array_item_audusd.length] = 'Buy';
						}
						awards_buy('AUDUSD')
					}
					else{
						stack_audusd.shift();
						random_0_audusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_audusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_audusd) + parseFloat(random_0_audusd)).toFixed(5),
							(parseFloat(hight_temp_audusd)).toFixed(5),
							(parseFloat(hight_temp_audusd)  - parseFloat(random_0_audusd)).toFixed(5) , 
							(parseFloat(hight_temp_audusd) - parseFloat(random_0_audusd) - parseFloat(random_0_audusd)).toFixed(5)
						]);
						if (array_item_audusd.length >= 60){
							array_item_audusd = [];
							array_item_audusd[0] = 'Sell';
						}else{
							array_item_audusd[array_item_audusd.length] = 'Sell'
						}
						awards_sell('AUDUSD');
					}
					
					socket_MatchingItem_push(array_item_audusd,'AUDUSD')
					socket_Matching_push(stack_audusd,'AUDUSD');
		  		}
		  	})
	  		/*END AUDUSD*/

	  		/*GBPUSD*/
	  		get_buy_sell('GBPUSD',function(return_buy_sell_gbpusd){
		  		hight_gbpusd = parseFloat(stack_gbpusd[14][3]);
	  			open_gbpusd =  parseFloat(stack_gbpusd[14][1]);
	  			close_gbpusd = parseFloat(stack_gbpusd[14][2]);
	  			date_gbpusd = parseFloat(stack_gbpusd[14][0]);   
	  			low_gbpusd = parseFloat(stack_gbpusd[14][4]);
	  			
	            if (return_buy_sell_gbpusd == 'none')
	  		 	{
	  		 		random_0_gbpusd = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_gbpusd == 'buy')
	  		 	{
	  		 		random_0_gbpusd = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_gbpusd == 'sell')
	  		 	{
	  		 		random_0_gbpusd = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_gbpusd = parseFloat((parseFloat(hight_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5));
	            stack_gbpusd[14][3] = parseFloat(hight_gbpusd);
	            stack_gbpusd[14][1] = parseFloat(hight_gbpusd) < parseFloat(stack_gbpusd[14][1]) ? parseFloat(hight_gbpusd) : parseFloat(stack_gbpusd[14][1]);
	            stack_gbpusd[14][2] = parseFloat(stack_gbpusd[14][2]);
	            stack_gbpusd[14][4] = parseFloat(hight_gbpusd) > parseFloat(stack_gbpusd[14][4]) ? parseFloat(hight_gbpusd) : parseFloat(stack_gbpusd[14][4]);
	            hight_temp_gbpusd = parseFloat(stack_gbpusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_gbpusd,'GBPUSD']),
					info.sockets.socket.emit('Matching:push',[stack_gbpusd,'GBPUSD'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_gbpusd - hight_gbpusd <= 0){ //console.log('buy');
						stack_gbpusd.shift();
						random_0_gbpusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_gbpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_gbpusd) - parseFloat(random_0_gbpusd)).toFixed(5),
							(parseFloat(hight_temp_gbpusd)).toFixed(5)  , 
							(parseFloat(hight_temp_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5) , 
							(parseFloat(hight_temp_gbpusd)  + parseFloat(random_0_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5) 
						]);
						if (array_item_gbpusd.length >= 60){
							array_item_gbpusd = [];
							array_item_gbpusd[0] = 'Buy';
						}else{
							array_item_gbpusd[array_item_gbpusd.length] = 'Buy';
						}
						awards_buy('GBPUSD')
					}
					else{
						stack_gbpusd.shift();
						random_0_gbpusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_gbpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5),
							(parseFloat(hight_temp_gbpusd)).toFixed(5),
							(parseFloat(hight_temp_gbpusd)  - parseFloat(random_0_gbpusd)).toFixed(5) , 
							(parseFloat(hight_temp_gbpusd) - parseFloat(random_0_gbpusd) - parseFloat(random_0_gbpusd)).toFixed(5)
						]);
						if (array_item_gbpusd.length >= 60){
							array_item_gbpusd = [];
							array_item_gbpusd[0] = 'Sell';
						}else{
							array_item_gbpusd[array_item_gbpusd.length] = 'Sell'
						}
						awards_sell('GBPUSD');
					}
					
					socket_MatchingItem_push(array_item_gbpusd,'GBPUSD')
					socket_Matching_push(stack_gbpusd,'GBPUSD');
		  		}
		  	})
	  		/*END GBPUSD*/

	  		/*USDJPY*/
	  		get_buy_sell('USDJPY',function(return_buy_sell_usdjpy){
		  		hight_usdjpy = parseFloat(stack_usdjpy[14][3]);
	  			open_usdjpy =  parseFloat(stack_usdjpy[14][1]);
	  			close_usdjpy = parseFloat(stack_usdjpy[14][2]);
	  			date_usdjpy = parseFloat(stack_usdjpy[14][0]);   
	  			low_usdjpy = parseFloat(stack_usdjpy[14][4]);
	  			
	  			if (return_buy_sell_usdjpy == 'none')
	  		 	{
	  		 		random_0_usdjpy = parseFloat(randomXToY(-0.005,0.005,3)); 		 		
	  		 	}
	  		 	if (return_buy_sell_usdjpy == 'buy')
	  		 	{
	  		 		random_0_usdjpy = parseFloat(randomXToY(-0.001,0.004,3));
	  		 	}
	  		 	if (return_buy_sell_usdjpy == 'sell')
	  		 	{
	  		 		random_0_usdjpy = parseFloat(randomXToY(-0.004,0.001,3));
	  		 	}

	            hight_usdjpy = parseFloat((parseFloat(hight_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3));
	            stack_usdjpy[14][3] = parseFloat(hight_usdjpy);
	            stack_usdjpy[14][1] = parseFloat(hight_usdjpy) < parseFloat(stack_usdjpy[14][1]) ? parseFloat(hight_usdjpy) : parseFloat(stack_usdjpy[14][1]);
	            stack_usdjpy[14][2] = parseFloat(stack_usdjpy[14][2]);
	            stack_usdjpy[14][4] = parseFloat(hight_usdjpy) > parseFloat(stack_usdjpy[14][4]) ? parseFloat(hight_usdjpy) : parseFloat(stack_usdjpy[14][4]);
	            hight_temp_usdjpy = parseFloat(stack_usdjpy[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdjpy,'USDJPY']),
					info.sockets.socket.emit('Matching:push',[stack_usdjpy,'USDJPY'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_usdjpy - hight_usdjpy <= 0){ //console.log('buy');
						stack_usdjpy.shift();
						random_0_usdjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_usdjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdjpy) - parseFloat(random_0_usdjpy)).toFixed(3),
							(parseFloat(hight_temp_usdjpy)).toFixed(3)  , 
							(parseFloat(hight_temp_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3) , 
							(parseFloat(hight_temp_usdjpy)  + parseFloat(random_0_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3) 
						]);
						if (array_item_usdjpy.length >= 60){
							array_item_usdjpy = [];
							array_item_usdjpy[0] = 'Buy';
						}else{
							array_item_usdjpy[array_item_usdjpy.length] = 'Buy';
						}
						awards_buy('USDJPY')
					}
					else{
						stack_usdjpy.shift();
						random_0_usdjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_usdjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3),
							(parseFloat(hight_temp_usdjpy)).toFixed(3),
							(parseFloat(hight_temp_usdjpy)  - parseFloat(random_0_usdjpy)).toFixed(3) , 
							(parseFloat(hight_temp_usdjpy) - parseFloat(random_0_usdjpy) - parseFloat(random_0_usdjpy)).toFixed(3)
						]);
						if (array_item_usdjpy.length >= 60){
							array_item_usdjpy = [];
							array_item_usdjpy[0] = 'Sell';
						}else{
							array_item_usdjpy[array_item_usdjpy.length] = 'Sell'
						}
						awards_sell('USDJPY');
					}
					
					socket_MatchingItem_push(array_item_usdjpy,'USDJPY')
					socket_Matching_push(stack_usdjpy,'USDJPY');
		  		}
		  	})
	  		/*END USDJPY*/

	  		/*EURGBP*/
	  		get_buy_sell('EURGBP',function(return_buy_sell_eurgbp){
		  		hight_eurgbp = parseFloat(stack_eurgbp[14][3]);
	  			open_eurgbp =  parseFloat(stack_eurgbp[14][1]);
	  			close_eurgbp = parseFloat(stack_eurgbp[14][2]);
	  			date_eurgbp = parseFloat(stack_eurgbp[14][0]);   
	  			low_eurgbp = parseFloat(stack_eurgbp[14][4]);
	  			
	  			if (return_buy_sell_eurgbp == 'none')
	  		 	{
	  		 		random_0_eurgbp = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_eurgbp == 'buy')
	  		 	{
	  		 		random_0_eurgbp = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_eurgbp == 'sell')
	  		 	{
	  		 		random_0_eurgbp = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_eurgbp = parseFloat((parseFloat(hight_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5));
	            stack_eurgbp[14][3] = parseFloat(hight_eurgbp);
	            stack_eurgbp[14][1] = parseFloat(hight_eurgbp) < parseFloat(stack_eurgbp[14][1]) ? parseFloat(hight_eurgbp) : parseFloat(stack_eurgbp[14][1]);
	            stack_eurgbp[14][2] = parseFloat(stack_eurgbp[14][2]);
	            stack_eurgbp[14][4] = parseFloat(hight_eurgbp) > parseFloat(stack_eurgbp[14][4]) ? parseFloat(hight_eurgbp) : parseFloat(stack_eurgbp[14][4]);
	            hight_temp_eurgbp = parseFloat(stack_eurgbp[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurgbp,'EURGBP']),
					info.sockets.socket.emit('Matching:push',[stack_eurgbp,'EURGBP'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_eurgbp - hight_eurgbp <= 0){ //console.log('buy');
						stack_eurgbp.shift();
						random_0_eurgbp = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurgbp.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurgbp) - parseFloat(random_0_eurgbp)).toFixed(5),
							(parseFloat(hight_temp_eurgbp)).toFixed(5)  , 
							(parseFloat(hight_temp_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5) , 
							(parseFloat(hight_temp_eurgbp)  + parseFloat(random_0_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5) 
						]);
						if (array_item_eurgbp.length >= 60){
							array_item_eurgbp = [];
							array_item_eurgbp[0] = 'Buy';
						}else{
							array_item_eurgbp[array_item_eurgbp.length] = 'Buy';
						}
						awards_buy('EURGBP')
					}
					else{
						stack_eurgbp.shift();
						random_0_eurgbp = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurgbp.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5),
							(parseFloat(hight_temp_eurgbp)).toFixed(5),
							(parseFloat(hight_temp_eurgbp)  - parseFloat(random_0_eurgbp)).toFixed(5) , 
							(parseFloat(hight_temp_eurgbp) - parseFloat(random_0_eurgbp) - parseFloat(random_0_eurgbp)).toFixed(5)
						]);
						if (array_item_eurgbp.length >= 60){
							array_item_eurgbp = [];
							array_item_eurgbp[0] = 'Sell';
						}else{
							array_item_eurgbp[array_item_eurgbp.length] = 'Sell'
						}
						awards_sell('EURGBP');
					}
					
					socket_MatchingItem_push(array_item_eurgbp,'EURGBP')
					socket_Matching_push(stack_eurgbp,'EURGBP');
		  		}
		  	})
	  		/*END EURGBP*/

	  		/*EURJPY*/
	  		get_buy_sell('EURJPY',function(return_buy_sell_eurjpy){
		  		hight_eurjpy = parseFloat(stack_eurjpy[14][3]);
	  			open_eurjpy =  parseFloat(stack_eurjpy[14][1]);
	  			close_eurjpy = parseFloat(stack_eurjpy[14][2]);
	  			date_eurjpy = parseFloat(stack_eurjpy[14][0]);   
	  			low_eurjpy = parseFloat(stack_eurjpy[14][4]);
	  			
	            if (return_buy_sell_eurjpy == 'none')
	  		 	{
	  		 		random_0_eurjpy = parseFloat(randomXToY(-0.005,0.005,3)); 		 		
	  		 	}
	  		 	if (return_buy_sell_eurjpy == 'buy')
	  		 	{
	  		 		random_0_eurjpy = parseFloat(randomXToY(-0.001,0.004,3));
	  		 	}
	  		 	if (return_buy_sell_eurjpy == 'sell')
	  		 	{
	  		 		random_0_eurjpy = parseFloat(randomXToY(-0.004,0.001,3));
	  		 	}

	            hight_eurjpy = parseFloat((parseFloat(hight_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3));
	            stack_eurjpy[14][3] = parseFloat(hight_eurjpy);
	            stack_eurjpy[14][1] = parseFloat(hight_eurjpy) < parseFloat(stack_eurjpy[14][1]) ? parseFloat(hight_eurjpy) : parseFloat(stack_eurjpy[14][1]);
	            stack_eurjpy[14][2] = parseFloat(stack_eurjpy[14][2]);
	            stack_eurjpy[14][4] = parseFloat(hight_eurjpy) > parseFloat(stack_eurjpy[14][4]) ? parseFloat(hight_eurjpy) : parseFloat(stack_eurjpy[14][4]);
	            hight_temp_eurjpy = parseFloat(stack_eurjpy[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurjpy,'EURJPY']),
					info.sockets.socket.emit('Matching:push',[stack_eurjpy,'EURJPY'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_eurjpy - hight_eurjpy <= 0){ //console.log('buy');
						stack_eurjpy.shift();
						random_0_eurjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_eurjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurjpy) - parseFloat(random_0_eurjpy)).toFixed(3),
							(parseFloat(hight_temp_eurjpy)).toFixed(3)  , 
							(parseFloat(hight_temp_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3) , 
							(parseFloat(hight_temp_eurjpy)  + parseFloat(random_0_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3) 
						]);
						if (array_item_eurjpy.length >= 60){
							array_item_eurjpy = [];
							array_item_eurjpy[0] = 'Buy';
						}else{
							array_item_eurjpy[array_item_eurjpy.length] = 'Buy';
						}
						awards_buy('EURJPY')
					}
					else{
						stack_eurjpy.shift();
						random_0_eurjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_eurjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3),
							(parseFloat(hight_temp_eurjpy)).toFixed(3),
							(parseFloat(hight_temp_eurjpy)  - parseFloat(random_0_eurjpy)).toFixed(3) , 
							(parseFloat(hight_temp_eurjpy) - parseFloat(random_0_eurjpy) - parseFloat(random_0_eurjpy)).toFixed(3)
						]);
						if (array_item_eurjpy.length >= 60){
							array_item_eurjpy = [];
							array_item_eurjpy[0] = 'Sell';
						}else{
							array_item_eurjpy[array_item_eurjpy.length] = 'Sell'
						}
						awards_sell('EURJPY');
					}
					
					socket_MatchingItem_push(array_item_eurjpy,'EURJPY')
					socket_Matching_push(stack_eurjpy,'EURJPY');
		  		}
		  	})
	  		/*END EURJPY*/

	  		/*USDCAD*/
	  		get_buy_sell('USDCAD',function(return_buy_sell_usdcad){
		  		hight_usdcad = parseFloat(stack_usdcad[14][3]);
	  			open_usdcad =  parseFloat(stack_usdcad[14][1]);
	  			close_usdcad = parseFloat(stack_usdcad[14][2]);
	  			date_usdcad = parseFloat(stack_usdcad[14][0]);   
	  			low_usdcad = parseFloat(stack_usdcad[14][4]);
	  			
	  			if (return_buy_sell_usdcad == 'none')
	  		 	{
	  		 		random_0_usdcad = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_usdcad == 'buy')
	  		 	{
	  		 		random_0_usdcad = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_usdcad == 'sell')
	  		 	{
	  		 		random_0_usdcad = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_usdcad = parseFloat((parseFloat(hight_usdcad) + parseFloat(random_0_usdcad)).toFixed(5));
	            stack_usdcad[14][3] = parseFloat(hight_usdcad);
	            stack_usdcad[14][1] = parseFloat(hight_usdcad) < parseFloat(stack_usdcad[14][1]) ? parseFloat(hight_usdcad) : parseFloat(stack_usdcad[14][1]);
	            stack_usdcad[14][2] = parseFloat(stack_usdcad[14][2]);
	            stack_usdcad[14][4] = parseFloat(hight_usdcad) > parseFloat(stack_usdcad[14][4]) ? parseFloat(hight_usdcad) : parseFloat(stack_usdcad[14][4]);
	            hight_temp_usdcad = parseFloat(stack_usdcad[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdcad,'USDCAD']),
					info.sockets.socket.emit('Matching:push',[stack_usdcad,'USDCAD'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_usdcad - hight_usdcad <= 0){ //console.log('buy');
						stack_usdcad.shift();
						random_0_usdcad = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdcad.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdcad) - parseFloat(random_0_usdcad)).toFixed(5),
							(parseFloat(hight_temp_usdcad)).toFixed(5)  , 
							(parseFloat(hight_temp_usdcad) + parseFloat(random_0_usdcad)).toFixed(5) , 
							(parseFloat(hight_temp_usdcad)  + parseFloat(random_0_usdcad) + parseFloat(random_0_usdcad)).toFixed(5) 
						]);
						if (array_item_usdcad.length >= 60){
							array_item_usdcad = [];
							array_item_usdcad[0] = 'Buy';
						}else{
							array_item_usdcad[array_item_usdcad.length] = 'Buy';
						}
						awards_buy('USDCAD')
					}
					else{
						stack_usdcad.shift();
						random_0_usdcad = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdcad.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdcad) + parseFloat(random_0_usdcad)).toFixed(5),
							(parseFloat(hight_temp_usdcad)).toFixed(5),
							(parseFloat(hight_temp_usdcad)  - parseFloat(random_0_usdcad)).toFixed(5) , 
							(parseFloat(hight_temp_usdcad) - parseFloat(random_0_usdcad) - parseFloat(random_0_usdcad)).toFixed(5)
						]);
						if (array_item_usdcad.length >= 60){
							array_item_usdcad = [];
							array_item_usdcad[0] = 'Sell';
						}else{
							array_item_usdcad[array_item_usdcad.length] = 'Sell'
						}
						awards_sell('USDCAD');
					}
					
					socket_MatchingItem_push(array_item_usdcad,'USDCAD')
					socket_Matching_push(stack_usdcad,'USDCAD');
		  		}
		  	})
	  		/*END USDCAD*/

	  		/*USDCHF*/
	  		get_buy_sell('USDCHF',function(return_buy_sell_usdchf){
		  		hight_usdchf = parseFloat(stack_usdchf[14][3]);
	  			open_usdchf =  parseFloat(stack_usdchf[14][1]);
	  			close_usdchf = parseFloat(stack_usdchf[14][2]);
	  			date_usdchf = parseFloat(stack_usdchf[14][0]);   
	  			low_usdchf = parseFloat(stack_usdchf[14][4]);
	  				
	            if (return_buy_sell_usdchf == 'none')
	  		 	{
	  		 		random_0_usdchf = parseFloat(randomXToY(-0.0005,0.0005,5)); 		 		
	  		 	}
	  		 	if (return_buy_sell_usdchf == 'buy')
	  		 	{
	  		 		random_0_usdchf = parseFloat(randomXToY(-0.0001,0.0004,5));
	  		 	}
	  		 	if (return_buy_sell_usdchf == 'sell')
	  		 	{
	  		 		random_0_usdchf = parseFloat(randomXToY(-0.0004,0.0001,5));
	  		 	}

	            hight_usdchf = parseFloat((parseFloat(hight_usdchf) + parseFloat(random_0_usdchf)).toFixed(5));
	            stack_usdchf[14][3] = parseFloat(hight_usdchf);
	            stack_usdchf[14][1] = parseFloat(hight_usdchf) < parseFloat(stack_usdchf[14][1]) ? parseFloat(hight_usdchf) : parseFloat(stack_usdchf[14][1]);
	            stack_usdchf[14][2] = parseFloat(stack_usdchf[14][2]);
	            stack_usdchf[14][4] = parseFloat(hight_usdchf) > parseFloat(stack_usdchf[14][4]) ? parseFloat(hight_usdchf) : parseFloat(stack_usdchf[14][4]);
	            hight_temp_usdchf = parseFloat(stack_usdchf[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdchf,'USDCHF']),
					info.sockets.socket.emit('Matching:push',[stack_usdchf,'USDCHF'])
				);	 
		  		if(time >= second){
		  		 	tmpOrder = false;
		  		 	if (close_usdchf - hight_usdchf <= 0){ //console.log('buy');
						stack_usdchf.shift();
						random_0_usdchf = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdchf.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdchf) - parseFloat(random_0_usdchf)).toFixed(5),
							(parseFloat(hight_temp_usdchf)).toFixed(5)  , 
							(parseFloat(hight_temp_usdchf) + parseFloat(random_0_usdchf)).toFixed(5) , 
							(parseFloat(hight_temp_usdchf)  + parseFloat(random_0_usdchf) + parseFloat(random_0_usdchf)).toFixed(5) 
						]);
						if (array_item_usdchf.length >= 60){
							array_item_usdchf = [];
							array_item_usdchf[0] = 'Buy';
						}else{
							array_item_usdchf[array_item_usdchf.length] = 'Buy';
						}
						awards_buy('USDCHF')
					}
					else{
						stack_usdchf.shift();
						random_0_usdchf = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdchf.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdchf) + parseFloat(random_0_usdchf)).toFixed(5),
							(parseFloat(hight_temp_usdchf)).toFixed(5),
							(parseFloat(hight_temp_usdchf)  - parseFloat(random_0_usdchf)).toFixed(5) , 
							(parseFloat(hight_temp_usdchf) - parseFloat(random_0_usdchf) - parseFloat(random_0_usdchf)).toFixed(5)
						]);
						if (array_item_usdchf.length >= 60){
							array_item_usdchf = [];
							array_item_usdchf[0] = 'Sell';
						}else{
							array_item_usdchf[array_item_usdchf.length] = 'Sell'
						}
						awards_sell('USDCHF');
					}
					
					socket_MatchingItem_push(array_item_usdchf,'USDCHF')
					socket_Matching_push(stack_usdchf,'USDCHF');
		  		}
		  	})
	  		/*END USDCHF*/
	  	}else {
	  		Ticker.findOne({},function(errtk,resulttk){
	  			socket_CounDown_push(timeLeft,'order');

	  			/*BTC*/
	  			hight_btcusd = parseFloat(stack_btcusd[14][3]);
	  			open_btcusd =  parseFloat(stack_btcusd[14][1]);
	  			close_btcusd = parseFloat(stack_btcusd[14][2]);
	  			date_btcusd = parseFloat(stack_btcusd[14][0]);   
	  			low_btcusd = parseFloat(stack_btcusd[14][4]);
	  			random_0_btcusd = parseFloat(randomXToY(-0.5,0.5,2));
	  			hight_btcusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.btc) + parseFloat(random_0_btcusd)).toFixed(2) : (parseFloat(hight_btcusd) + parseFloat(random_0_btcusd)).toFixed(2);
	            stack_btcusd[14][3] = parseFloat(hight_btcusd);
	            stack_btcusd[14][1] = parseFloat(hight_btcusd) < parseFloat(stack_btcusd[14][1]) ? parseFloat(hight_btcusd) : parseFloat(stack_btcusd[14][1]);
	            stack_btcusd[14][2] = parseFloat(stack_btcusd[14][2]);
	            stack_btcusd[14][4] = parseFloat(hight_btcusd) > parseFloat(stack_btcusd[14][4]) ? parseFloat(hight_btcusd) : parseFloat(stack_btcusd[14][4]);
	            hight_temp_btcusd = parseFloat(stack_btcusd[14][3]).toFixed(2);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_btcusd,'Bitcoin']),
					info.sockets.socket.emit('Matching:push',[stack_btcusd,'Bitcoin'])
				);	 
				random_buy_sell('Bitcoin');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_btcusd - hight_btcusd <= 0){
						stack_btcusd.shift();
						random_0_btcusd = parseFloat(randomXToY(0.1,1,2));
						stack_btcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_btcusd) - parseFloat(random_0_btcusd)).toFixed(2),
						(parseFloat(hight_temp_btcusd)).toFixed(2)  , 
						(parseFloat(hight_temp_btcusd) + parseFloat(random_0_btcusd)).toFixed(2) , 
						(parseFloat(hight_temp_btcusd)  + parseFloat(random_0_btcusd) + parseFloat(random_0_btcusd)).toFixed(2) 
						]);
					}
					else{
						stack_btcusd.shift();
						random_0_btcusd = parseFloat(randomXToY(0.1,1,2));
						stack_btcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_btcusd) + parseFloat(random_0_btcusd)).toFixed(2),
							(parseFloat(hight_temp_btcusd)).toFixed(2),
							(parseFloat(hight_temp_btcusd)  - parseFloat(random_0_btcusd)).toFixed(2) , 
							(parseFloat(hight_temp_btcusd) - parseFloat(random_0_btcusd) - parseFloat(random_0_btcusd)).toFixed(2)
						]);
					}
					socket_Matching_push(stack_btcusd,'Bitcoin');
					global_status_betting = 0;
				}
				/*END BTC*/


				/*ETH*/
				hight_ethusd = parseFloat(stack_ethusd[14][3]);
	  			open_ethusd =  parseFloat(stack_ethusd[14][1]);
	  			close_ethusd = parseFloat(stack_ethusd[14][2]);
	  			date_ethusd = parseFloat(stack_ethusd[14][0]);   
	  			low_ethusd = parseFloat(stack_ethusd[14][4]);
	  			random_0_ethusd = parseFloat(randomXToY(-0.5,0.5,3));
	  			hight_ethusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.eth) + parseFloat(random_0_ethusd)).toFixed(3) : (parseFloat(hight_ethusd) + parseFloat(random_0_ethusd)).toFixed(3);
	            stack_ethusd[14][3] = parseFloat(hight_ethusd);
	            stack_ethusd[14][1] = parseFloat(hight_ethusd) < parseFloat(stack_ethusd[14][1]) ? parseFloat(hight_ethusd) : parseFloat(stack_ethusd[14][1]);
	            stack_ethusd[14][2] = parseFloat(stack_ethusd[14][2]);
	            stack_ethusd[14][4] = parseFloat(hight_ethusd) > parseFloat(stack_ethusd[14][4]) ? parseFloat(hight_ethusd) : parseFloat(stack_ethusd[14][4]);
	            hight_temp_ethusd = parseFloat(stack_ethusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_ethusd,'Ethereum']),
					info.sockets.socket.emit('Matching:push',[stack_ethusd,'Ethereum'])
				);	 
				random_buy_sell('Ethereum');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_ethusd - hight_ethusd <= 0){
						stack_ethusd.shift();
						random_0_ethusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_ethusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ethusd) - parseFloat(random_0_ethusd)).toFixed(3),
						(parseFloat(hight_temp_ethusd)).toFixed(3)  , 
						(parseFloat(hight_temp_ethusd) + parseFloat(random_0_ethusd)).toFixed(3) , 
						(parseFloat(hight_temp_ethusd)  + parseFloat(random_0_ethusd) + parseFloat(random_0_ethusd)).toFixed(3) 
						]);
					}
					else{
						stack_ethusd.shift();
						random_0_ethusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_ethusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ethusd) + parseFloat(random_0_ethusd)).toFixed(3),
							(parseFloat(hight_temp_ethusd)).toFixed(3),
							(parseFloat(hight_temp_ethusd)  - parseFloat(random_0_ethusd)).toFixed(3) , 
							(parseFloat(hight_temp_ethusd) - parseFloat(random_0_ethusd) - parseFloat(random_0_ethusd)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_ethusd,'Ethereum');
				}
				/*END ETH*/

				/*BCH*/
				hight_bchusd = parseFloat(stack_bchusd[14][3]);
	  			open_bchusd =  parseFloat(stack_bchusd[14][1]);
	  			close_bchusd = parseFloat(stack_bchusd[14][2]);
	  			date_bchusd = parseFloat(stack_bchusd[14][0]);   
	  			low_bchusd = parseFloat(stack_bchusd[14][4]);
	  			random_0_bchusd = parseFloat(randomXToY(-0.5,0.5,3));
	  			hight_bchusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.bch) + parseFloat(random_0_bchusd)).toFixed(3) : (parseFloat(hight_bchusd) + parseFloat(random_0_bchusd)).toFixed(3);
	            stack_bchusd[14][3] = parseFloat(hight_bchusd);
	            stack_bchusd[14][1] = parseFloat(hight_bchusd) < parseFloat(stack_bchusd[14][1]) ? parseFloat(hight_bchusd) : parseFloat(stack_bchusd[14][1]);
	            stack_bchusd[14][2] = parseFloat(stack_bchusd[14][2]);
	            stack_bchusd[14][4] = parseFloat(hight_bchusd) > parseFloat(stack_bchusd[14][4]) ? parseFloat(hight_bchusd) : parseFloat(stack_bchusd[14][4]);
	            hight_temp_bchusd = parseFloat(stack_bchusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_bchusd,'Bitcoin Cash']),
					info.sockets.socket.emit('Matching:push',[stack_bchusd,'Bitcoin Cash'])
				);	 
				random_buy_sell('Bitcoin Cash');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_bchusd - hight_bchusd <= 0){
						stack_bchusd.shift();
						random_0_bchusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_bchusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_bchusd) - parseFloat(random_0_bchusd)).toFixed(3),
						(parseFloat(hight_temp_bchusd)).toFixed(3)  , 
						(parseFloat(hight_temp_bchusd) + parseFloat(random_0_bchusd)).toFixed(3) , 
						(parseFloat(hight_temp_bchusd)  + parseFloat(random_0_bchusd) + parseFloat(random_0_bchusd)).toFixed(3) 
						]);
					}
					else{
						stack_bchusd.shift();
						random_0_bchusd = parseFloat(randomXToY(0.1,0.5,3));
						stack_bchusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_bchusd) + parseFloat(random_0_bchusd)).toFixed(3),
							(parseFloat(hight_temp_bchusd)).toFixed(3),
							(parseFloat(hight_temp_bchusd)  - parseFloat(random_0_bchusd)).toFixed(3) , 
							(parseFloat(hight_temp_bchusd) - parseFloat(random_0_bchusd) - parseFloat(random_0_bchusd)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_bchusd,'Bitcoin Cash');
				}
				/*END BCH*/

				/*XRP*/
				hight_xrpusd = parseFloat(stack_xrpusd[14][3]);
	  			open_xrpusd =  parseFloat(stack_xrpusd[14][1]);
	  			close_xrpusd = parseFloat(stack_xrpusd[14][2]);
	  			date_xrpusd = parseFloat(stack_xrpusd[14][0]);   
	  			low_xrpusd = parseFloat(stack_xrpusd[14][4]);
	  			random_0_xrpusd = parseFloat(randomXToY(-0.0005,0.0005,6));
	  			hight_xrpusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.xrp) + parseFloat(random_0_xrpusd)).toFixed(6) : (parseFloat(hight_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6);
	            stack_xrpusd[14][3] = parseFloat(hight_xrpusd);
	            stack_xrpusd[14][1] = parseFloat(hight_xrpusd) < parseFloat(stack_xrpusd[14][1]) ? parseFloat(hight_xrpusd) : parseFloat(stack_xrpusd[14][1]);
	            stack_xrpusd[14][2] = parseFloat(stack_xrpusd[14][2]);
	            stack_xrpusd[14][4] = parseFloat(hight_xrpusd) > parseFloat(stack_xrpusd[14][4]) ? parseFloat(hight_xrpusd) : parseFloat(stack_xrpusd[14][4]);
	            hight_temp_xrpusd = parseFloat(stack_xrpusd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_xrpusd,'Ripple']),
					info.sockets.socket.emit('Matching:push',[stack_xrpusd,'Ripple'])
				);	 
				random_buy_sell('Ripple');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_xrpusd - hight_xrpusd <= 0){
						stack_xrpusd.shift();
						random_0_xrpusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xrpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xrpusd) - parseFloat(random_0_xrpusd)).toFixed(6),
						(parseFloat(hight_temp_xrpusd)).toFixed(6)  , 
						(parseFloat(hight_temp_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6) , 
						(parseFloat(hight_temp_xrpusd)  + parseFloat(random_0_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6) 
						]);
					}
					else{
						stack_xrpusd.shift();
						random_0_xrpusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xrpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xrpusd) + parseFloat(random_0_xrpusd)).toFixed(6),
							(parseFloat(hight_temp_xrpusd)).toFixed(6),
							(parseFloat(hight_temp_xrpusd)  - parseFloat(random_0_xrpusd)).toFixed(6) , 
							(parseFloat(hight_temp_xrpusd) - parseFloat(random_0_xrpusd) - parseFloat(random_0_xrpusd)).toFixed(6)
						]);
					}
					socket_Matching_push(stack_xrpusd,'Ripple');
				}

	  			/*END XRP*/

	  			/*LTC*/
	  			hight_ltcusd = parseFloat(stack_ltcusd[14][3]);
	  			open_ltcusd =  parseFloat(stack_ltcusd[14][1]);
	  			close_ltcusd = parseFloat(stack_ltcusd[14][2]);
	  			date_ltcusd = parseFloat(stack_ltcusd[14][0]);   
	  			low_ltcusd = parseFloat(stack_ltcusd[14][4]);
	  			random_0_ltcusd = parseFloat(randomXToY(-0.05,0.05,3));
	  			hight_ltcusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.ltc) + parseFloat(random_0_ltcusd)).toFixed(3) : (parseFloat(hight_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3);
	            stack_ltcusd[14][3] = parseFloat(hight_ltcusd);
	            stack_ltcusd[14][1] = parseFloat(hight_ltcusd) < parseFloat(stack_ltcusd[14][1]) ? parseFloat(hight_ltcusd) : parseFloat(stack_ltcusd[14][1]);
	            stack_ltcusd[14][2] = parseFloat(stack_ltcusd[14][2]);
	            stack_ltcusd[14][4] = parseFloat(hight_ltcusd) > parseFloat(stack_ltcusd[14][4]) ? parseFloat(hight_ltcusd) : parseFloat(stack_ltcusd[14][4]);
	            hight_temp_ltcusd = parseFloat(stack_ltcusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_ltcusd,'Litecoin']),
					info.sockets.socket.emit('Matching:push',[stack_ltcusd,'Litecoin'])
				);	 
				random_buy_sell('Litecoin');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_ltcusd - hight_ltcusd <= 0){
						stack_ltcusd.shift();
						random_0_ltcusd = parseFloat(randomXToY(0.01,0.05,3));
						stack_ltcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ltcusd) - parseFloat(random_0_ltcusd)).toFixed(3),
						(parseFloat(hight_temp_ltcusd)).toFixed(3)  , 
						(parseFloat(hight_temp_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3) , 
						(parseFloat(hight_temp_ltcusd)  + parseFloat(random_0_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3) 
						]);
					}
					else{
						stack_ltcusd.shift();
						random_0_ltcusd = parseFloat(randomXToY(0.01,0.05,3));
						stack_ltcusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_ltcusd) + parseFloat(random_0_ltcusd)).toFixed(3),
							(parseFloat(hight_temp_ltcusd)).toFixed(3),
							(parseFloat(hight_temp_ltcusd)  - parseFloat(random_0_ltcusd)).toFixed(3) , 
							(parseFloat(hight_temp_ltcusd) - parseFloat(random_0_ltcusd) - parseFloat(random_0_ltcusd)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_ltcusd,'Litecoin');
				}
	  			/*END LTC*/

	  			/*MIOTA*/
	  			hight_miotausd = parseFloat(stack_miotausd[14][3]);
	  			open_miotausd =  parseFloat(stack_miotausd[14][1]);
	  			close_miotausd = parseFloat(stack_miotausd[14][2]);
	  			date_miotausd = parseFloat(stack_miotausd[14][0]);   
	  			low_miotausd = parseFloat(stack_miotausd[14][4]);
	  			random_0_miotausd = parseFloat(randomXToY(-0.0005,0.0005,6));
	  			hight_miotausd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.miota) + parseFloat(random_0_miotausd)).toFixed(6) : (parseFloat(hight_miotausd) + parseFloat(random_0_miotausd)).toFixed(6);
	            stack_miotausd[14][3] = parseFloat(hight_miotausd);
	            stack_miotausd[14][1] = parseFloat(hight_miotausd) < parseFloat(stack_miotausd[14][1]) ? parseFloat(hight_miotausd) : parseFloat(stack_miotausd[14][1]);
	            stack_miotausd[14][2] = parseFloat(stack_miotausd[14][2]);
	            stack_miotausd[14][4] = parseFloat(hight_miotausd) > parseFloat(stack_miotausd[14][4]) ? parseFloat(hight_miotausd) : parseFloat(stack_miotausd[14][4]);
	            hight_temp_miotausd = parseFloat(stack_miotausd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_miotausd,'IOTA']),
					info.sockets.socket.emit('Matching:push',[stack_miotausd,'IOTA'])
				);	 
				random_buy_sell('IOTA');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_miotausd - hight_miotausd <= 0){
						stack_miotausd.shift();
						random_0_miotausd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_miotausd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_miotausd) - parseFloat(random_0_miotausd)).toFixed(6),
						(parseFloat(hight_temp_miotausd)).toFixed(6)  , 
						(parseFloat(hight_temp_miotausd) + parseFloat(random_0_miotausd)).toFixed(6) , 
						(parseFloat(hight_temp_miotausd)  + parseFloat(random_0_miotausd) + parseFloat(random_0_miotausd)).toFixed(6) 
						]);
					}
					else{
						stack_miotausd.shift();
						random_0_miotausd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_miotausd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_miotausd) + parseFloat(random_0_miotausd)).toFixed(6),
							(parseFloat(hight_temp_miotausd)).toFixed(6),
							(parseFloat(hight_temp_miotausd)  - parseFloat(random_0_miotausd)).toFixed(6) , 
							(parseFloat(hight_temp_miotausd) - parseFloat(random_0_miotausd) - parseFloat(random_0_miotausd)).toFixed(6)
						]);
					}
					socket_Matching_push(stack_miotausd,'IOTA');
				}
	  			/*END MIOTA*/

	  			/*XEM*/
	  			hight_xemusd = parseFloat(stack_xemusd[14][3]);
	  			open_xemusd =  parseFloat(stack_xemusd[14][1]);
	  			close_xemusd = parseFloat(stack_xemusd[14][2]);
	  			date_xemusd = parseFloat(stack_xemusd[14][0]);   
	  			low_xemusd = parseFloat(stack_xemusd[14][4]);
	  			random_0_xemusd = parseFloat(randomXToY(-0.0005,0.0005,6));
	  			hight_xemusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.xem) + parseFloat(random_0_xemusd)).toFixed(6) : (parseFloat(hight_xemusd) + parseFloat(random_0_xemusd)).toFixed(6);
	            stack_xemusd[14][3] = parseFloat(hight_xemusd);
	            stack_xemusd[14][1] = parseFloat(hight_xemusd) < parseFloat(stack_xemusd[14][1]) ? parseFloat(hight_xemusd) : parseFloat(stack_xemusd[14][1]);
	            stack_xemusd[14][2] = parseFloat(stack_xemusd[14][2]);
	            stack_xemusd[14][4] = parseFloat(hight_xemusd) > parseFloat(stack_xemusd[14][4]) ? parseFloat(hight_xemusd) : parseFloat(stack_xemusd[14][4]);
	            hight_temp_xemusd = parseFloat(stack_xemusd[14][3]).toFixed(6);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_xemusd,'Cardano']),
					info.sockets.socket.emit('Matching:push',[stack_xemusd,'Cardano'])
				);	 
				random_buy_sell('Cardano');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_xemusd - hight_xemusd <= 0){
						stack_xemusd.shift();
						random_0_xemusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xemusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xemusd) - parseFloat(random_0_xemusd)).toFixed(6),
						(parseFloat(hight_temp_xemusd)).toFixed(6)  , 
						(parseFloat(hight_temp_xemusd) + parseFloat(random_0_xemusd)).toFixed(6) , 
						(parseFloat(hight_temp_xemusd)  + parseFloat(random_0_xemusd) + parseFloat(random_0_xemusd)).toFixed(6) 
						]);
					}
					else{
						stack_xemusd.shift();
						random_0_xemusd = parseFloat(randomXToY(0.0001,0.0005,6));
						stack_xemusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_xemusd) + parseFloat(random_0_xemusd)).toFixed(6),
							(parseFloat(hight_temp_xemusd)).toFixed(6),
							(parseFloat(hight_temp_xemusd)  - parseFloat(random_0_xemusd)).toFixed(6) , 
							(parseFloat(hight_temp_xemusd) - parseFloat(random_0_xemusd) - parseFloat(random_0_xemusd)).toFixed(6)
						]);
					}
					socket_Matching_push(stack_xemusd,'Cardano');
				}
	  			/*END XEM*/

	  			/*DASH*/
	  			hight_dashusd = parseFloat(stack_dashusd[14][3]);
	  			open_dashusd =  parseFloat(stack_dashusd[14][1]);
	  			close_dashusd = parseFloat(stack_dashusd[14][2]);
	  			date_dashusd = parseFloat(stack_dashusd[14][0]);   
	  			low_dashusd = parseFloat(stack_dashusd[14][4]);
	  			random_0_dashusd = parseFloat(randomXToY(-0.05,0.05,3));
	  			hight_dashusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.dash) + parseFloat(random_0_dashusd)).toFixed(3) : (parseFloat(hight_dashusd) + parseFloat(random_0_dashusd)).toFixed(3);
	            stack_dashusd[14][3] = parseFloat(hight_dashusd);
	            stack_dashusd[14][1] = parseFloat(hight_dashusd) < parseFloat(stack_dashusd[14][1]) ? parseFloat(hight_dashusd) : parseFloat(stack_dashusd[14][1]);
	            stack_dashusd[14][2] = parseFloat(stack_dashusd[14][2]);
	            stack_dashusd[14][4] = parseFloat(hight_dashusd) > parseFloat(stack_dashusd[14][4]) ? parseFloat(hight_dashusd) : parseFloat(stack_dashusd[14][4]);
	            hight_temp_dashusd = parseFloat(stack_dashusd[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_dashusd,'DASH']),
					info.sockets.socket.emit('Matching:push',[stack_dashusd,'DASH'])
				);	 
				random_buy_sell('DASH');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_dashusd - hight_dashusd <= 0){
						stack_dashusd.shift();
						random_0_dashusd = parseFloat(randomXToY(0.001,0.005,3));
						stack_dashusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_dashusd) - parseFloat(random_0_dashusd)).toFixed(3),
						(parseFloat(hight_temp_dashusd)).toFixed(3)  , 
						(parseFloat(hight_temp_dashusd) + parseFloat(random_0_dashusd)).toFixed(3) , 
						(parseFloat(hight_temp_dashusd)  + parseFloat(random_0_dashusd) + parseFloat(random_0_dashusd)).toFixed(3) 
						]);
					}
					else{
						stack_dashusd.shift();
						random_0_dashusd = parseFloat(randomXToY(0.001,0.005,3));
						stack_dashusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_dashusd) + parseFloat(random_0_dashusd)).toFixed(3),
							(parseFloat(hight_temp_dashusd)).toFixed(3),
							(parseFloat(hight_temp_dashusd)  - parseFloat(random_0_dashusd)).toFixed(3) , 
							(parseFloat(hight_temp_dashusd) - parseFloat(random_0_dashusd) - parseFloat(random_0_dashusd)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_dashusd,'DASH');
				}
	  			
	  			/*END DASH*/

		  		/*EURUSD*/
		  		hight_eurusd = parseFloat(stack_eurusd[14][3]);
	  			open_eurusd =  parseFloat(stack_eurusd[14][1]);
	  			close_eurusd = parseFloat(stack_eurusd[14][2]);
	  			date_eurusd = parseFloat(stack_eurusd[14][0]);   
	  			low_eurusd = parseFloat(stack_eurusd[14][4]);
	  			random_0_eurusd = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_eurusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.eurusd) + parseFloat(random_0_eurusd)).toFixed(5) : (parseFloat(hight_eurusd) + parseFloat(random_0_eurusd)).toFixed(5);
	            stack_eurusd[14][3] = parseFloat(hight_eurusd);
	            stack_eurusd[14][1] = parseFloat(hight_eurusd) < parseFloat(stack_eurusd[14][1]) ? parseFloat(hight_eurusd) : parseFloat(stack_eurusd[14][1]);
	            stack_eurusd[14][2] = parseFloat(stack_eurusd[14][2]);
	            stack_eurusd[14][4] = parseFloat(hight_eurusd) > parseFloat(stack_eurusd[14][4]) ? parseFloat(hight_eurusd) : parseFloat(stack_eurusd[14][4]);
	            hight_temp_eurusd = parseFloat(stack_eurusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurusd,'EURUSD']),
					info.sockets.socket.emit('Matching:push',[stack_eurusd,'EURUSD'])
				);	 
				random_buy_sell('EURUSD');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_eurusd - hight_eurusd <= 0){
						stack_eurusd.shift();
						random_0_eurusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurusd) - parseFloat(random_0_eurusd)).toFixed(5),
						(parseFloat(hight_temp_eurusd)).toFixed(5)  , 
						(parseFloat(hight_temp_eurusd) + parseFloat(random_0_eurusd)).toFixed(5) , 
						(parseFloat(hight_temp_eurusd)  + parseFloat(random_0_eurusd) + parseFloat(random_0_eurusd)).toFixed(5) 
						]);
					}
					else{
						stack_eurusd.shift();
						random_0_eurusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurusd) + parseFloat(random_0_eurusd)).toFixed(5),
							(parseFloat(hight_temp_eurusd)).toFixed(5),
							(parseFloat(hight_temp_eurusd)  - parseFloat(random_0_eurusd)).toFixed(5) , 
							(parseFloat(hight_temp_eurusd) - parseFloat(random_0_eurusd) - parseFloat(random_0_eurusd)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_eurusd,'EURUSD');
				}
		  		/*END EURUSD*/

		  		/*AUDUSD*/
		  		hight_audusd = parseFloat(stack_audusd[14][3]);
	  			open_audusd =  parseFloat(stack_audusd[14][1]);
	  			close_audusd = parseFloat(stack_audusd[14][2]);
	  			date_audusd = parseFloat(stack_audusd[14][0]);   
	  			low_audusd = parseFloat(stack_audusd[14][4]);
	  			random_0_audusd = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_audusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.audusd) + parseFloat(random_0_audusd)).toFixed(5) : (parseFloat(hight_audusd) + parseFloat(random_0_audusd)).toFixed(5);
	            stack_audusd[14][3] = parseFloat(hight_audusd);
	            stack_audusd[14][1] = parseFloat(hight_audusd) < parseFloat(stack_audusd[14][1]) ? parseFloat(hight_audusd) : parseFloat(stack_audusd[14][1]);
	            stack_audusd[14][2] = parseFloat(stack_audusd[14][2]);
	            stack_audusd[14][4] = parseFloat(hight_audusd) > parseFloat(stack_audusd[14][4]) ? parseFloat(hight_audusd) : parseFloat(stack_audusd[14][4]);
	            hight_temp_audusd = parseFloat(stack_audusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_audusd,'AUDUSD']),
					info.sockets.socket.emit('Matching:push',[stack_audusd,'AUDUSD'])
				);	 
				random_buy_sell('AUDUSD');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_audusd - hight_audusd <= 0){
						stack_audusd.shift();
						random_0_audusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_audusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_audusd) - parseFloat(random_0_audusd)).toFixed(5),
						(parseFloat(hight_temp_audusd)).toFixed(5)  , 
						(parseFloat(hight_temp_audusd) + parseFloat(random_0_audusd)).toFixed(5) , 
						(parseFloat(hight_temp_audusd)  + parseFloat(random_0_audusd) + parseFloat(random_0_audusd)).toFixed(5) 
						]);
					}
					else{
						stack_audusd.shift();
						random_0_audusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_audusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_audusd) + parseFloat(random_0_audusd)).toFixed(5),
							(parseFloat(hight_temp_audusd)).toFixed(5),
							(parseFloat(hight_temp_audusd)  - parseFloat(random_0_audusd)).toFixed(5) , 
							(parseFloat(hight_temp_audusd) - parseFloat(random_0_audusd) - parseFloat(random_0_audusd)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_audusd,'AUDUSD');
				}
		  		/*END AUDUSD*/

		  		/*GBPUSD*/
		  		hight_gbpusd = parseFloat(stack_gbpusd[14][3]);
	  			open_gbpusd =  parseFloat(stack_gbpusd[14][1]);
	  			close_gbpusd = parseFloat(stack_gbpusd[14][2]);
	  			date_gbpusd = parseFloat(stack_gbpusd[14][0]);   
	  			low_gbpusd = parseFloat(stack_gbpusd[14][4]);
	  			random_0_gbpusd = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_gbpusd = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5) : (parseFloat(hight_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5);
	            stack_gbpusd[14][3] = parseFloat(hight_gbpusd);
	            stack_gbpusd[14][1] = parseFloat(hight_gbpusd) < parseFloat(stack_gbpusd[14][1]) ? parseFloat(hight_gbpusd) : parseFloat(stack_gbpusd[14][1]);
	            stack_gbpusd[14][2] = parseFloat(stack_gbpusd[14][2]);
	            stack_gbpusd[14][4] = parseFloat(hight_gbpusd) > parseFloat(stack_gbpusd[14][4]) ? parseFloat(hight_gbpusd) : parseFloat(stack_gbpusd[14][4]);
	            hight_temp_gbpusd = parseFloat(stack_gbpusd[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_gbpusd,'GBPUSD']),
					info.sockets.socket.emit('Matching:push',[stack_gbpusd,'GBPUSD'])
				);	 
				random_buy_sell('GBPUSD');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_gbpusd - hight_gbpusd <= 0){
						stack_gbpusd.shift();
						random_0_gbpusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_gbpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_gbpusd) - parseFloat(random_0_gbpusd)).toFixed(5),
						(parseFloat(hight_temp_gbpusd)).toFixed(5)  , 
						(parseFloat(hight_temp_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5) , 
						(parseFloat(hight_temp_gbpusd)  + parseFloat(random_0_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5) 
						]);
					}
					else{
						stack_gbpusd.shift();
						random_0_gbpusd = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_gbpusd.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_gbpusd) + parseFloat(random_0_gbpusd)).toFixed(5),
							(parseFloat(hight_temp_gbpusd)).toFixed(5),
							(parseFloat(hight_temp_gbpusd)  - parseFloat(random_0_gbpusd)).toFixed(5) , 
							(parseFloat(hight_temp_gbpusd) - parseFloat(random_0_gbpusd) - parseFloat(random_0_gbpusd)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_gbpusd,'GBPUSD');
				}
		  		/*END GBPUSD*/

		  		/*USDJPY*/
		  		hight_usdjpy = parseFloat(stack_usdjpy[14][3]);
	  			open_usdjpy =  parseFloat(stack_usdjpy[14][1]);
	  			close_usdjpy = parseFloat(stack_usdjpy[14][2]);
	  			date_usdjpy = parseFloat(stack_usdjpy[14][0]);   
	  			low_usdjpy = parseFloat(stack_usdjpy[14][4]);
	  			random_0_usdjpy = parseFloat(randomXToY(-0.005,0.005,3));
	  			hight_usdjpy = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3) : (parseFloat(hight_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3);
	            stack_usdjpy[14][3] = parseFloat(hight_usdjpy);
	            stack_usdjpy[14][1] = parseFloat(hight_usdjpy) < parseFloat(stack_usdjpy[14][1]) ? parseFloat(hight_usdjpy) : parseFloat(stack_usdjpy[14][1]);
	            stack_usdjpy[14][2] = parseFloat(stack_usdjpy[14][2]);
	            stack_usdjpy[14][4] = parseFloat(hight_usdjpy) > parseFloat(stack_usdjpy[14][4]) ? parseFloat(hight_usdjpy) : parseFloat(stack_usdjpy[14][4]);
	            hight_temp_usdjpy = parseFloat(stack_usdjpy[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdjpy,'USDJPY']),
					info.sockets.socket.emit('Matching:push',[stack_usdjpy,'USDJPY'])
				);	 
				random_buy_sell('USDJPY');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_usdjpy - hight_usdjpy <= 0){
						stack_usdjpy.shift();
						random_0_usdjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_usdjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdjpy) - parseFloat(random_0_usdjpy)).toFixed(3),
						(parseFloat(hight_temp_usdjpy)).toFixed(3)  , 
						(parseFloat(hight_temp_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3) , 
						(parseFloat(hight_temp_usdjpy)  + parseFloat(random_0_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3) 
						]);
					}
					else{
						stack_usdjpy.shift();
						random_0_usdjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_usdjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdjpy) + parseFloat(random_0_usdjpy)).toFixed(3),
							(parseFloat(hight_temp_usdjpy)).toFixed(3),
							(parseFloat(hight_temp_usdjpy)  - parseFloat(random_0_usdjpy)).toFixed(3) , 
							(parseFloat(hight_temp_usdjpy) - parseFloat(random_0_usdjpy) - parseFloat(random_0_usdjpy)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_usdjpy,'USDJPY');
				}
		  		/*END USDJPY*/

		  		/*EURGBP*/
		  		hight_eurgbp = parseFloat(stack_eurgbp[14][3]);
	  			open_eurgbp =  parseFloat(stack_eurgbp[14][1]);
	  			close_eurgbp = parseFloat(stack_eurgbp[14][2]);
	  			date_eurgbp = parseFloat(stack_eurgbp[14][0]);   
	  			low_eurgbp = parseFloat(stack_eurgbp[14][4]);
	  			random_0_eurgbp = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_eurgbp = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5) : (parseFloat(hight_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5);
	            stack_eurgbp[14][3] = parseFloat(hight_eurgbp);
	            stack_eurgbp[14][1] = parseFloat(hight_eurgbp) < parseFloat(stack_eurgbp[14][1]) ? parseFloat(hight_eurgbp) : parseFloat(stack_eurgbp[14][1]);
	            stack_eurgbp[14][2] = parseFloat(stack_eurgbp[14][2]);
	            stack_eurgbp[14][4] = parseFloat(hight_eurgbp) > parseFloat(stack_eurgbp[14][4]) ? parseFloat(hight_eurgbp) : parseFloat(stack_eurgbp[14][4]);
	            hight_temp_eurgbp = parseFloat(stack_eurgbp[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurgbp,'EURGBP']),
					info.sockets.socket.emit('Matching:push',[stack_eurgbp,'EURGBP'])
				);	 
				random_buy_sell('EURGBP');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_eurgbp - hight_eurgbp <= 0){
						stack_eurgbp.shift();
						random_0_eurgbp = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurgbp.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurgbp) - parseFloat(random_0_eurgbp)).toFixed(5),
						(parseFloat(hight_temp_eurgbp)).toFixed(5)  , 
						(parseFloat(hight_temp_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5) , 
						(parseFloat(hight_temp_eurgbp)  + parseFloat(random_0_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5) 
						]);
					}
					else{
						stack_eurgbp.shift();
						random_0_eurgbp = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_eurgbp.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurgbp) + parseFloat(random_0_eurgbp)).toFixed(5),
							(parseFloat(hight_temp_eurgbp)).toFixed(5),
							(parseFloat(hight_temp_eurgbp)  - parseFloat(random_0_eurgbp)).toFixed(5) , 
							(parseFloat(hight_temp_eurgbp) - parseFloat(random_0_eurgbp) - parseFloat(random_0_eurgbp)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_eurgbp,'EURGBP');
				}
		  		/*END EURGBP*/

		  		/*EURJPY*/
		  		hight_eurjpy = parseFloat(stack_eurjpy[14][3]);
	  			open_eurjpy =  parseFloat(stack_eurjpy[14][1]);
	  			close_eurjpy = parseFloat(stack_eurjpy[14][2]);
	  			date_eurjpy = parseFloat(stack_eurjpy[14][0]);   
	  			low_eurjpy = parseFloat(stack_eurjpy[14][4]);
	  			random_0_eurjpy = parseFloat(randomXToY(-0.005,0.005,3));
	  			hight_eurjpy = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3) : (parseFloat(hight_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3);
	            stack_eurjpy[14][3] = parseFloat(hight_eurjpy);
	            stack_eurjpy[14][1] = parseFloat(hight_eurjpy) < parseFloat(stack_eurjpy[14][1]) ? parseFloat(hight_eurjpy) : parseFloat(stack_eurjpy[14][1]);
	            stack_eurjpy[14][2] = parseFloat(stack_eurjpy[14][2]);
	            stack_eurjpy[14][4] = parseFloat(hight_eurjpy) > parseFloat(stack_eurjpy[14][4]) ? parseFloat(hight_eurjpy) : parseFloat(stack_eurjpy[14][4]);
	            hight_temp_eurjpy = parseFloat(stack_eurjpy[14][3]).toFixed(3);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_eurjpy,'EURJPY']),
					info.sockets.socket.emit('Matching:push',[stack_eurjpy,'EURJPY'])
				);	 
				random_buy_sell('EURJPY');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_eurjpy - hight_eurjpy <= 0){
						stack_eurjpy.shift();
						random_0_eurjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_eurjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurjpy) - parseFloat(random_0_eurjpy)).toFixed(3),
						(parseFloat(hight_temp_eurjpy)).toFixed(3)  , 
						(parseFloat(hight_temp_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3) , 
						(parseFloat(hight_temp_eurjpy)  + parseFloat(random_0_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3) 
						]);
					}
					else{
						stack_eurjpy.shift();
						random_0_eurjpy = parseFloat(randomXToY(0.001,0.005,3));
						stack_eurjpy.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_eurjpy) + parseFloat(random_0_eurjpy)).toFixed(3),
							(parseFloat(hight_temp_eurjpy)).toFixed(3),
							(parseFloat(hight_temp_eurjpy)  - parseFloat(random_0_eurjpy)).toFixed(3) , 
							(parseFloat(hight_temp_eurjpy) - parseFloat(random_0_eurjpy) - parseFloat(random_0_eurjpy)).toFixed(3)
						]);
					}
					socket_Matching_push(stack_eurjpy,'EURJPY');
				}
		  		/*END EURJPY*/

		  		/*USDCAD*/
		  		hight_usdcad = parseFloat(stack_usdcad[14][3]);
	  			open_usdcad =  parseFloat(stack_usdcad[14][1]);
	  			close_usdcad = parseFloat(stack_usdcad[14][2]);
	  			date_usdcad = parseFloat(stack_usdcad[14][0]);   
	  			low_usdcad = parseFloat(stack_usdcad[14][4]);
	  			random_0_usdcad = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_usdcad = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.usdcad) + parseFloat(random_0_usdcad)).toFixed(5) : (parseFloat(hight_usdcad) + parseFloat(random_0_usdcad)).toFixed(5);
	            stack_usdcad[14][3] = parseFloat(hight_usdcad);
	            stack_usdcad[14][1] = parseFloat(hight_usdcad) < parseFloat(stack_usdcad[14][1]) ? parseFloat(hight_usdcad) : parseFloat(stack_usdcad[14][1]);
	            stack_usdcad[14][2] = parseFloat(stack_usdcad[14][2]);
	            stack_usdcad[14][4] = parseFloat(hight_usdcad) > parseFloat(stack_usdcad[14][4]) ? parseFloat(hight_usdcad) : parseFloat(stack_usdcad[14][4]);
	            hight_temp_usdcad = parseFloat(stack_usdcad[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdcad,'USDCAD']),
					info.sockets.socket.emit('Matching:push',[stack_usdcad,'USDCAD'])
				);	 
				random_buy_sell('USDCAD');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_usdcad - hight_usdcad <= 0){
						stack_usdcad.shift();
						random_0_usdcad = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdcad.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdcad) - parseFloat(random_0_usdcad)).toFixed(5),
						(parseFloat(hight_temp_usdcad)).toFixed(5)  , 
						(parseFloat(hight_temp_usdcad) + parseFloat(random_0_usdcad)).toFixed(5) , 
						(parseFloat(hight_temp_usdcad)  + parseFloat(random_0_usdcad) + parseFloat(random_0_usdcad)).toFixed(5) 
						]);
					}
					else{
						stack_usdcad.shift();
						random_0_usdcad = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdcad.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdcad) + parseFloat(random_0_usdcad)).toFixed(5),
							(parseFloat(hight_temp_usdcad)).toFixed(5),
							(parseFloat(hight_temp_usdcad)  - parseFloat(random_0_usdcad)).toFixed(5) , 
							(parseFloat(hight_temp_usdcad) - parseFloat(random_0_usdcad) - parseFloat(random_0_usdcad)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_usdcad,'USDCAD');
				}
		  		/*END USDCAD*/

		  		/*USDCHF*/
		  		hight_usdchf = parseFloat(stack_usdchf[14][3]);
	  			open_usdchf =  parseFloat(stack_usdchf[14][1]);
	  			close_usdchf = parseFloat(stack_usdchf[14][2]);
	  			date_usdchf = parseFloat(stack_usdchf[14][0]);   
	  			low_usdchf = parseFloat(stack_usdchf[14][4]);
	  			random_0_usdchf = parseFloat(randomXToY(-0.0005,0.0005,5));
	  			hight_usdchf = parseInt(Math.random() * (20 - 1) + 2) == 5 ? (parseFloat(resulttk.usdchf) + parseFloat(random_0_usdchf)).toFixed(5) : (parseFloat(hight_usdchf) + parseFloat(random_0_usdchf)).toFixed(5);
	            stack_usdchf[14][3] = parseFloat(hight_usdchf);
	            stack_usdchf[14][1] = parseFloat(hight_usdchf) < parseFloat(stack_usdchf[14][1]) ? parseFloat(hight_usdchf) : parseFloat(stack_usdchf[14][1]);
	            stack_usdchf[14][2] = parseFloat(stack_usdchf[14][2]);
	            stack_usdchf[14][4] = parseFloat(hight_usdchf) > parseFloat(stack_usdchf[14][4]) ? parseFloat(hight_usdchf) : parseFloat(stack_usdchf[14][4]);
	            hight_temp_usdchf = parseFloat(stack_usdchf[14][3]).toFixed(5);
				time < second && (
					info.sockets.socket.broadcast.emit('Matching:push',[stack_usdchf,'USDCHF']),
					info.sockets.socket.emit('Matching:push',[stack_usdchf,'USDCHF'])
				);	 
				random_buy_sell('USDCHF');
		  		if(time >= second){
		  		 	tmpOrder = true;
		  		 	if (close_usdchf - hight_usdchf <= 0){
						stack_usdchf.shift();
						random_0_usdchf = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdchf.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdchf) - parseFloat(random_0_usdchf)).toFixed(5),
						(parseFloat(hight_temp_usdchf)).toFixed(5)  , 
						(parseFloat(hight_temp_usdchf) + parseFloat(random_0_usdchf)).toFixed(5) , 
						(parseFloat(hight_temp_usdchf)  + parseFloat(random_0_usdchf) + parseFloat(random_0_usdchf)).toFixed(5) 
						]);
					}
					else{
						stack_usdchf.shift();
						random_0_usdchf = parseFloat(randomXToY(0.0001,0.0005,5));
						stack_usdchf.push([ new Date().getTime() * 1000, 
							(parseFloat(hight_temp_usdchf) + parseFloat(random_0_usdchf)).toFixed(5),
							(parseFloat(hight_temp_usdchf)).toFixed(5),
							(parseFloat(hight_temp_usdchf)  - parseFloat(random_0_usdchf)).toFixed(5) , 
							(parseFloat(hight_temp_usdchf) - parseFloat(random_0_usdchf) - parseFloat(random_0_usdchf)).toFixed(5)
						]);
					}
					socket_Matching_push(stack_usdchf,'USDCHF');
				}
		  		/*END USDCHF*/

	  		});
	  	}
	  	end_white = new Date() - start_white;

    	//console.info("Execution time: %dms", end_white);

	  	//console.log(end_white,start_white);
	  	sleep(980);//985
	}
}

function socket_Matching_push(stack,MarketName)
{
	info.sockets.socket.broadcast.emit('Matching:push',[stack,MarketName]);
	info.sockets.socket.emit('Matching:push',[stack,MarketName]);
}
function socket_MatchingItem_push(array_item,MarketName)
{	
	info.sockets.socket.broadcast.emit('MatchingItem:push',[array_item,MarketName]);
	info.sockets.socket.emit('MatchingItem:push',[array_item,MarketName]);
}
function socket_MatchingItem_pushs(array_item,MarketName)
{	
	info.sockets.socket.broadcast.emit('MatchingItems:push',[array_item,MarketName]);
	info.sockets.socket.emit('MatchingItems:push',[array_item,MarketName]);
}
function socket_CounDown_push(timeLeft,type)
{
	info.sockets.socket.broadcast.emit('CounDown', {'second' : timeLeft, 'type' : type,'date' : new Date().toLocaleString()}),
	info.sockets.socket.emit('CounDown', {'second' : timeLeft, 'type' : type,'date' : new Date().toLocaleString()});
}



function get_chart(MarketName,callback)
{
	Matching.findOne({'MarketName' : MarketName},{ history: { $slice: -14 }},function(err,data_socket){
		var history =[];
		if (!err && data_socket.history)
		{
			for (var i = 0; i < data_socket.history.length; i++) {
				history.push([data_socket.history[i].date, parseFloat(data_socket.history[i].open), parseFloat(data_socket.history[i].close), parseFloat(data_socket.history[i].hight), parseFloat(data_socket.history[i].low)]);
			}
			callback(history);
		}
		else
		{
			callback(history);
		}
	})
}
function process_update_balance_server(string_receiverabit , callback)
{
	global_balance_server = parseFloat(string_receiverabit);
	callback(true);
}

function process_reset_item(string_receiverabit , callback){
	array_item_btcusd = [];
	array_item_ethusd = [];
	array_item_bchusd = [];
	array_item_xrpusd = [];
	array_item_ltcusd = [];
	array_item_miotausd = [];
	array_item_xemusd = [];
	array_item_dashusd = [];
	array_item_eurusd = [];
	array_item_audusd = [];
	array_item_gbpusd = [];
	
	array_item_usdjpy = [];
	array_item_eurgbp = [];
	array_item_eurjpy = [];
	array_item_usdcad = [];
	array_item_usdchf = [];
	callback(true)
}


function set_chart_item_auto(){
	var date = new Date();
	var min = date.getMinutes();
	if (min != array_item_btcusd.length)
	{
		if (array_item_btcusd.length > min)
		{
			array_item_btcusd.splice(0, array_item_btcusd.length - min);
			socket_MatchingItem_pushs(array_item_btcusd,'Bitcoin');
		}
		else
		{
			for (var i = array_item_btcusd.length; i < min; i++) {
				array_item_btcusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_btcusd,'Bitcoin');
			}
		}
	}
	if (min != array_item_ethusd.length)
	{
		if (array_item_ethusd.length > min)
		{
			array_item_ethusd.splice(0, array_item_ethusd.length - min);
			socket_MatchingItem_pushs(array_item_ethusd,'Ethereum');
		}
		else
		{
			for (var i = array_item_ethusd.length; i < min; i++) {
				array_item_ethusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_ethusd,'Ethereum');
			}
		}
	}
	if (min != array_item_bchusd.length)
	{
		if (array_item_bchusd.length > min)
		{
			array_item_bchusd.splice(0, array_item_bchusd.length - min);
			socket_MatchingItem_pushs(array_item_bchusd,'Bitcoin Cash');
		}
		else
		{
			for (var i = array_item_bchusd.length; i < min; i++) {
				array_item_bchusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_bchusd,'Bitcoin Cash');
			}
		}
	}
	if (min != array_item_xrpusd.length)
	{
		if (array_item_xrpusd.length > min)
		{
			array_item_xrpusd.splice(0, array_item_xrpusd.length - min);
			socket_MatchingItem_pushs(array_item_xrpusd,'Ripple');
		}
		else
		{
			for (var i = array_item_xrpusd.length; i < min; i++) {
				array_item_xrpusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_xrpusd,'Ripple');
			}
		}
	}
	if (min != array_item_ltcusd.length)
	{
		if (array_item_ltcusd.length > min)
		{
			array_item_ltcusd.splice(0, array_item_ltcusd.length - min);
			socket_MatchingItem_pushs(array_item_ltcusd,'Litecoin');
		}
		else
		{
			for (var i = array_item_ltcusd.length; i < min; i++) {
				array_item_ltcusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_ltcusd,'Litecoin');
			}
		}
	}
	if (min != array_item_miotausd.length)
	{
		if (array_item_miotausd.length > min)
		{
			array_item_miotausd.splice(0, array_item_miotausd.length - min);
			socket_MatchingItem_pushs(array_item_miotausd,'IOTA');
		}
		else
		{
			for (var i = array_item_miotausd.length; i < min; i++) {
				array_item_miotausd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_miotausd,'IOTA');
			}
		}
	}
	if (min != array_item_xemusd.length)
	{
		if (array_item_xemusd.length > min)
		{
			array_item_xemusd.splice(0, array_item_xemusd.length - min);
			socket_MatchingItem_pushs(array_item_xemusd,'Cardano');
		}
		else
		{
			for (var i = array_item_xemusd.length; i < min; i++) {
				array_item_xemusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_xemusd,'Cardano');
			}
		}
	}
	if (min != array_item_dashusd.length)
	{
		if (array_item_dashusd.length > min)
		{
			array_item_dashusd.splice(0, array_item_dashusd.length - min);
			socket_MatchingItem_pushs(array_item_dashusd,'DASH');
		}
		else
		{
			for (var i = array_item_dashusd.length; i < min; i++) {
				array_item_dashusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_dashusd,'DASH');
			}
		}
	}
	if (min != array_item_eurusd.length)
	{
		if (array_item_eurusd.length > min)
		{
			array_item_eurusd.splice(0, array_item_eurusd.length - min);
			socket_MatchingItem_pushs(array_item_eurusd,'EURUSD');
		}
		else
		{
			for (var i = array_item_eurusd.length; i < min; i++) {
				array_item_eurusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_eurusd,'EURUSD');
			}
		}
	}
	if (min != array_item_audusd.length)
	{
		if (array_item_audusd.length > min)
		{
			array_item_audusd.splice(0, array_item_audusd.length - min);
			socket_MatchingItem_pushs(array_item_audusd,'AUDUSD');
		}
		else
		{
			for (var i = array_item_audusd.length; i < min; i++) {
				array_item_audusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_audusd,'AUDUSD');
			}
		}
	}
	if (min != array_item_gbpusd.length)
	{
		if (array_item_gbpusd.length > min)
		{
			array_item_gbpusd.splice(0, array_item_gbpusd.length - min);
			socket_MatchingItem_pushs(array_item_gbpusd,'GBPUSD');
		}
		else
		{
			for (var i = array_item_gbpusd.length; i < min; i++) {
				array_item_gbpusd[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_gbpusd,'GBPUSD');
			}
		}
	}
	if (min != array_item_usdjpy.length)
	{
		if (array_item_usdjpy.length > min)
		{
			array_item_usdjpy.splice(0, array_item_usdjpy.length - min);
			socket_MatchingItem_pushs(array_item_usdjpy,'USDJPY');
		}
		else
		{
			for (var i = array_item_usdjpy.length; i < min; i++) {
				array_item_usdjpy[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_usdjpy,'USDJPY');
			}
		}
	}
	if (min != array_item_eurgbp.length)
	{
		if (array_item_eurgbp.length > min)
		{
			array_item_eurgbp.splice(0, array_item_eurgbp.length - min);
			socket_MatchingItem_pushs(array_item_eurgbp,'EURGBP');
		}
		else
		{
			for (var i = array_item_eurgbp.length; i < min; i++) {
				array_item_eurgbp[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_eurgbp,'EURGBP');
			}
		}
	}
	if (min != array_item_eurjpy.length)
	{
		if (array_item_eurjpy.length > min)
		{
			array_item_eurjpy.splice(0, array_item_eurjpy.length - min);
			socket_MatchingItem_pushs(array_item_eurjpy,'EURJPY');
		}
		else
		{
			for (var i = array_item_eurjpy.length; i < min; i++) {
				array_item_eurjpy[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_eurjpy,'EURJPY');
			}
		}
	}
	if (min != array_item_usdcad.length)
	{
		if (array_item_usdcad.length > min)
		{
			array_item_usdcad.splice(0, array_item_usdcad.length - min);
			socket_MatchingItem_pushs(array_item_usdcad,'USDCAD');
		}
		else
		{
			for (var i = array_item_usdcad.length; i < min; i++) {
				array_item_usdcad[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_usdcad,'USDCAD');
			}
		}
	}
	if (min != array_item_usdchf.length)
	{
		if (array_item_usdchf.length > min)
		{
			array_item_usdchf.splice(0, array_item_usdchf.length - min);
			socket_MatchingItem_pushs(array_item_usdchf,'USDCHF');
		}
		else
		{
			for (var i = array_item_usdchf.length; i < min; i++) {
				array_item_usdchf[i] = (_.random(1,2) == 1) ? 'Buy' : 'Sell';
				socket_MatchingItem_pushs(array_item_usdchf,'USDCHF');
			}
		}
	}

}

start_while_true();

function start_while_true()
{
	var date = new Date();
	var second_new = date.getSeconds();
	if (second_new == 30) 
	{
		set_chart_item_auto();
		while_true();
	}
	else
	{
		setTimeout(function() {
			start_while_true();
		}, 800);
		
	}
}
cron.schedule('*/30 * * * *', function(){ // 5 min chart 6h
  set_chart_item_auto();
});




return module.exports = {
	infoSocket : function(socket, io){
		info.sockets = [socket, io];
	},
	module : function(){
		return {
			process_buy_exchange,
			process_sell_exchange,
			process_cancel_order_open,
			process_update_balance_server,
			process_reset_item,
			process_update_balance_user
		}
	},
	balance_server : function(){
		return global_balance_server;
	},
	chart_item : function(){
		return {
			"Bitcoin" : array_item_btcusd,
			"Ethereum" : array_item_ethusd,
			"BitcoinCash" : array_item_bchusd,
			"Ripple" : array_item_xrpusd,
			"Litecoin" : array_item_ltcusd,
			"Cardano" : array_item_miotausd,
			"IOTA" : array_item_xemusd,
			"DASH" : array_item_dashusd,
			"EURUSD" : array_item_eurusd,
			"AUDUSD" : array_item_audusd,
			"GBPUSD" : array_item_gbpusd,
			
			"USDJPY" : array_item_usdjpy,
			"EURGBP" : array_item_eurgbp,
			"EURJPY" : array_item_eurjpy,
			"USDCAD" : array_item_usdcad,
			"USDCHF" : array_item_usdchf
		};
	}
}