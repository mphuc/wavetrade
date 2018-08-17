'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const moment = require('moment');
const _ = require('lodash');
const request = require('request');
function Indexmain(req,res){

	User.find({p_node: req.session.userId}, { displayName: 1, email: 1, signupDate: 1, _id: 0 },(err,data_user)=>{
		if (req.user.p_node != '0') {
			User.findById(req.user.p_node, (err, users)=>{
				res.locals.sponsor_mail = users.email;
				res.locals.sponsor_name = users.displayName;
				res.locals.title = 'System';
				res.locals.menu = 'affiliate';
				res.locals.user = req.user;
				res.locals.sponsor = true;
				res.locals.data_child = data_user;
				res.render('account/affiliate_main');
			})
		}else{
			res.locals.sponsor_mail = req.user.email;
			res.locals.sponsor_name = req.user.displayName;
			res.locals.title = 'System';
			res.locals.menu = 'affiliate';
			res.locals.user = req.user;
			res.sponsor = false;
			res.locals.data_child = data_user;
			res.render('account/affiliate_main');
		}
	});
	
}
function Indexrefferal(req,res){

	request({
        url: 'https://api.adafxpro.com/personal/json_tree?id_user='+req.user._id,
        json: true
    },function(error, response, body) {
    	var new_data = [];
    	var total_f1 = 0;
    	var total_betting = 0;
		for (var i = body.length - 1; i >= 0; i--) {
			total_betting += parseFloat(body[i].betting);
			if (body[i].floor == 'F1') total_f1+=1;
			new_data.push({
				'date': moment(body[i].date).format('MM/DD/YYYY LT'),
				'email': body[i].email ,
				'sponsor': body[i].sponsor,
				'floor': body[i].floor,
				'betting': body[i].betting,
				'level': body[i].level,
				'balance': body[i].balance,
				'count_f1': body[i].count_f1
			});
		}
		//console.log(new_data);
    	if (error) {
    		res.render('account/affiliate_refferal', {
				title: 'User List',
				menu: 'affiliate',
				child : new_data,
				user: req.user,
				total_f1 : total_f1,
				total_betting: total_betting,
				total_member : 0
			});
    	}
    	else
    	{
    		res.render('account/affiliate_refferal', {
				title: 'User List',
				menu: 'affiliate',
				child : new_data,
				user: req.user,
				total_f1 : total_f1,
				total_betting: total_betting,
				total_member : body.length
			});
    	}
	});
}
function Indexpromo(req,res){
	res.render('account/affiliate_promo_materials', {
		title: 'PROMO MATERIALS',
		menu: 'affiliate',
		user: req.user
	});
}
function Treerefferal(req,res){
	res.render('account/affiliate_tree', {
		title: 'YOUR AFFILIATES',
		menu: 'affiliate',
		user: req.user
	});
}
function getRefferal(req,res){
	User.find({p_node: req.session.userId}, { displayName: 1, email: 1, signupDate: 1, _id: 0 },(err,data_user)=>{
		if(err) return res.status(500).send({message:`Error load your refferal`})
		if(!data_user) return res.status(404).send({message:`Error load your refferal`})

		var new_data_user = [];
		
		if (data_user == undefined || _.size(data_user) === 0)
			return res.status(404).send({message: 'No data'});
		
		_.forEach(data_user, function(value) {
			new_data_user.push({
				'signupDate': moment(value.signupDate).format('MM/DD/YYYY LT'),
				'email': value.email,
				'displayName': value.displayName,
			});
		});
		return res.status(200).send({refferal: new_data_user});

	})
}
module.exports = {
	Indexmain,
	Indexrefferal,
	Indexpromo,
	getRefferal,
	Treerefferal
}