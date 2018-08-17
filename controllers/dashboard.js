'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const Ticker = require('../models/ticker');
const Order = require('../models/order');
const History = require('../models/history');
const Partner = require('../models/partner');
const HistoryCommission = require('../models/history_commision');

function IndexOn(req,res){
	// setupTicker();
	HistoryCommission.find({'user_id':req.user._id},function(errs,data_commission){
		Partner.find({'$and' : [{'status' : 0},{'parent' : req.user._id}]},function(err,child){
			History.find(
				{'$and' : [
					{"date": 
					    {
					        $gte: new Date((new Date().getTime() - (1 * 24 * 60 * 1000)))
					    }
					},
				    {'user_id' : req.user._id},
				    {'type' :'Transfer'}
				]}
				,function(err,dailytransfer){
				res.locals.title = 'Dashboard';
				res.locals.menu = 'dashboard';
				res.locals.user = req.user;
				res.locals.count_child = child.length;
				res.locals.dailytransfer = dailytransfer;
				res.locals.data_commission = data_commission;
				
				res.render('account/dashboard');
			})
		})
	})
		
}

function setupTicker(){
	let newTicker = new Ticker();
	newTicker.last= '0.5';
	newTicker.bid= '0.5';
	newTicker.ask= '0.5';
	newTicker.high= '0.5';
	newTicker.volume= '0.5';
	newTicker.price_usd= '0.5';
	newTicker.price_btc= '0.5';
	newTicker.save((err, investStored)=>{
		console.log(investStored);
	});
}


function TransferToCoin(req, res){
	var amountUsd = parseFloat(req.body.amount);
	
	var user = req.user;
	var balance_lending = parseFloat(user.balance.lending_wallet.available).toFixed(8);
	var balance_coin = parseFloat(user.balance.coin_wallet.available).toFixed(8);
	
	
	if ( amountUsd < 5 || amountUsd > balance_lending || isNaN(amountUsd))
		return res.status(404).send({message: 'Please enter amount > 5$!'})

	Ticker.findOne({},(err,data_ticker)=>{
		if(err){
			res.status(500).send({message: `Error al crear el usuario: ${err}`})
		}else{
			amountUsd = parseFloat(amountUsd).toFixed(8);
			var ast_usd = data_ticker.price_usd;
			var amount = parseFloat(amountUsd)/ parseFloat(ast_usd);
			amount = parseFloat(amount).toFixed(8);
			var query = {_id:user._id};
			var new_balance_lending = parseFloat(balance_lending) - parseFloat(amountUsd);
			new_balance_lending = parseFloat(new_balance_lending).toFixed(8);
			var new_balance_coin = parseFloat(balance_coin) + parseFloat(amount);
			new_balance_coin = parseFloat(new_balance_coin).toFixed(8);
			var data_update = {
				$set : {
					'balance.lending_wallet.available': parseFloat(new_balance_lending),
					'balance.coin_wallet.available': parseFloat(new_balance_coin)
				},
				$push: {
					'balance.lending_wallet.history': {
						date: Date.now(), 
						type: 'sent', 
						amount: parseFloat(amountUsd), 
						detail: 'Transfer to BBL wallet  $' +parseFloat(amountUsd) + ' ('+ parseFloat(amount)+' BBL) <br> Exchange rate: 1 BBL = '+parseFloat(ast_usd)+' USD'
					},
					'balance.coin_wallet.history': {
						date: Date.now(), 
						type: 'received', 
						amount: parseFloat(amount), 
						detail: 'Received from USD wallet $' +parseFloat(amountUsd) + ' ('+ parseFloat(amount)+' BBL) <br> Exchange rate: 1 BBL = '+parseFloat(ast_usd)+' USD'
					}
				}
			};

			User.update(query, data_update, function(err, Users){
				if(err) res.status(500).send({message: `Error al crear el usuario: ${err}`})
				return res.status(200).send({
					message: 'Transfer success', 
					balance_lending: parseFloat(new_balance_lending),
					balance_coin: parseFloat(new_balance_coin)
				}) /*service son como helpers*/
			});
		} 
		

	});

	
}
function History_tempalte(req,res){
	
	History.find({'$and' : [{'user_id' : req.partner.account_id},{'$or' : [{'type' : 'win'},{'type' : 'lose'}]}]} ,(err,result)=>{
		History.find({'$and' : [{'user_id' : req.partner.account_id},{'$or' : [{'type' : 'deposit'},{'type' : 'withdraw'}]}]} ,(errs,results)=>{
			res.locals.title = 'History '+req.partner.account_id,
			res.locals.result = result,
			res.locals.results = results,
			res.locals.menu = 'exchange',
			res.locals.user = req.user;
			res.locals.AccountID = req.params.AccountID,
			res.locals.partner = req.partner,
			res.locals.layout = 'layout_exchange.hbs',
			res.render('account/historybuysell')
		}).sort( { $date: 1 } )
	}).sort( { $date: 1 } )
}

module.exports = {
	IndexOn,
	TransferToCoin,
	History_tempalte
}