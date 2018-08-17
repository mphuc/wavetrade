'use strict'

const mongoose = require('mongoose');
const Ticker = require('../models/ticker');
const request = require('request');
const IcoSum = require('../models/icosum');
const cron = require('node-cron');
const Volume = require('../models/exchange/volume').module();
cron.schedule('30 */10 * * * *', function(){
    Ticker.findOne({},function(err,result){
        Update_Price_BTC_USD(result);
    	Update_Price_ETH_USD(result);
    	Update_Price_BCH_USD(result);
    	Update_Price_XRP_USD(result);
    	Update_Price_LTC_USD(result);
    	Update_Price_MIOTA_USD(result);
    	Update_Price_XEM_USD(result);
    	Update_Price_DASH_USD(result);
    	Update_Price_FOREX_USD(result);
    	Update_Price_FOREX_EUR(result);
        Update_Price_FOREX_GBP(result);
        Update_Price_FOREX_AUD(result);
    });
});
function Update_Price_BTC_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=BTC,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
        Ticker.findOneAndUpdate({},{ $set : { 'btc': ((parseFloat(result.btc) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
		
	});
}

function Update_Price_ETH_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=ETH,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'eth': ((parseFloat(result.eth) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_BCH_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=BCH&tsyms=BCH,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'bch': ((parseFloat(result.bch) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_XRP_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=XRP&tsyms=XRP,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'xrp': ((parseFloat(result.xrp) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_LTC_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=LTC&tsyms=LTC,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'ltc': ((parseFloat(result.ltc) + parseFloat(body.USD))/2).toFixed(2)  } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_MIOTA_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=IOTA&tsyms=IOTA,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'miota': ((parseFloat(result.miota) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_XEM_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=ADA&tsyms=ADA,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'xem': ((parseFloat(result.xem) + parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_DASH_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=DASH&tsyms=DASH,USD',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 'dash': ((parseFloat(result.dash) +  parseFloat(body.USD))/2).toFixed(2) } },(err,new_data_ticker)=>{return 0});
	});
}

function Update_Price_FOREX_USD(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=JPY,CAD,CHF',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 
			'usdjpy': ((parseFloat(result.usdjpy) + parseFloat(body.JPY))/2).toFixed(5),
			'usdcad': ((parseFloat(result.usdcad) + parseFloat(body.CAD))/2).toFixed(5),
			'usdchf': ((parseFloat(result.usdchf) + parseFloat(body.CHF))/2).toFixed(5)
		 } },(err,new_data_ticker)=>{return 0});
	});
}

function Update_Price_FOREX_AUD(result){
    request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=AUD&tsyms=USD',
        json: true
    },function(error, response, body) {
        if (!body || error) {
            return false
        }
        Ticker.findOneAndUpdate({},{ $set : { 
            'audusd': ((parseFloat(result.audusd) +  parseFloat(body.USD))/2).toFixed(5)
         } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_FOREX_GBP(result){
    request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=GBP&tsyms=USD',
        json: true
    },function(error, response, body) {
        if (!body || error) {
            return false
        }
        Ticker.findOneAndUpdate({},{ $set : { 
            'gbpusd': ((parseFloat(result.gbpusd) + parseFloat(body.USD))/2).toFixed(5)
         } },(err,new_data_ticker)=>{return 0});
    });
}

function Update_Price_FOREX_EUR(result){
	request({
        url: 'https://min-api.cryptocompare.com/data/price?fsym=EUR&tsyms=USD,GBP,JPY',
        json: true
    },function(error, response, body) {
    	if (!body || error) {
    		return false
    	}
		Ticker.findOneAndUpdate({},{ $set : { 
            'eurusd': ((parseFloat(result.eurusd) + parseFloat(body.USD))/2).toFixed(5),
			'eurgbp': ((parseFloat(result.eurgbp) + parseFloat(body.GBP))/2).toFixed(5),
			'eurjpy': ((parseFloat(result.eurjpy) + parseFloat(body.JPY))/2).toFixed(5)
		 } },(err,new_data_ticker)=>{return 0});
	});
}

module.exports = {
	
}