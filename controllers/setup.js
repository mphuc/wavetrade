'use strict'

const mongoose = require('mongoose');
const request = require('request');
const Ticker = require('../models/ticker');
const IcoSum = require('../models/icosum');
const Volume = require('../models/exchange/volume').module();
function setupTicker(){
	let newTicker = new Ticker();
	newTicker.coin = 1;
	newTicker.btc = 1;
	newTicker.eth = 1;
	newTicker.bch = 1;
	newTicker.xrp = 1;
	newTicker.miota = 1;
	newTicker.xem = 1;
	newTicker.dash = 1;
	newTicker.eurusd = 1;
	newTicker.audusd = 1;
	newTicker.gbpusd = 1;
	newTicker.usdjpy = 1;
	newTicker.eurgbp = 1;
	newTicker.eurjpy = 1;
	newTicker.usdcad = 1;
	newTicker.usdchf = 1;
	newTicker.diamond = 1;
	newTicker.wave = 1;
	newTicker.save((err, investStored)=>{
		
	});
}

function setupIcoSum(req,res){
	let newIcoSum = new IcoSum();
	newIcoSum.total = '0';
	newIcoSum.total_today = '0';
	newIcoSum.status = '0';
	newIcoSum.save((err, Ico)=>{
		res.status(200).send(Ico);
	});
}
function setupvolume(req,res){
	let newVolume = new Volume();
	newVolume.MarketName = 'BTC-STC';
	newVolume.last = '0';
	newVolume.bid = '0';
	newVolume.ask = '0';
	newVolume.hight = '0';
	newVolume.low = '0';
	newVolume.volume = '0';
	
	newVolume.last_last = '0';
	newVolume.bid_last = '0';
	newVolume.ask_last = '0';
	newVolume.hight_last = '0';
	newVolume.low_last = '0';
	newVolume.volume_last = '0';
	newVolume.date_added = new Date();
	newVolume.save((err, Ico)=>{
		res.status(200).send(Ico);
	});
}
function Setup(req,res){
	//res.status(404).send('Error');
	/*IcoSum.remove({}, function(err, reply) {
		setupIcoSum(req,res);
	});*/
	/*Volume.remove({}, function(err, reply) {
		setupvolume(req,res);
	});*/
	Ticker.remove({}, function(err, reply) {
		setupTicker();
	});

	res.status(200).send();
	
}

module.exports = {
	Setup
}