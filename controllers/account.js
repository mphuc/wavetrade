'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const service = require('../services');
const Ticker = require('../models/ticker');
const Order = require('../models/order');
const History = require('../models/history');
const _ = require('lodash');
const moment = require('moment');
const Partner = require('../models/partner');
function IndexOn(req,res){
		
	Partner.find({'parent' : req.user._id},(err,result)=>{	
		res.locals.title = 'Account';
		res.locals.menu = 'account';
		res.locals.user = req.user;
		res.locals.user_child = result;
		res.render('account/account');
	});
}


function AddAccount(req, res){
	var type = parseFloat(req.body.type);
	var user = req.user;	
	if (parseInt(type) == 0)
	{
		
		Partner.find({'$and' : [{'type' : type},{'parent' : req.user._id}]},(err,result)=>{	
			if (parseInt(result.length) >= 7)
			{
				return res.status(404).send({message: 'You can not create more than 7 accounts!'});
			}
			else
			{	
				var account_id;
				var hour = parseInt(moment().hour()) < 10 ? '0'+moment().hour() : moment().hour();
				var seconds = parseInt(moment().seconds()) < 10 ? '0'+moment().seconds() : moment().seconds();
				var milliseconds = parseInt(moment().milliseconds()) < 10 ? '0'+moment().milliseconds() : moment().milliseconds();
				
				account_id = hour+''+seconds+''+milliseconds;

				Partner.findOne({'account_id' : account_id},function(errss,resultss){
					if (!resultss)
					{
						let newPartner = new Partner();
						newPartner.account_id= account_id;
						
						newPartner.signupDate= new Date();
						newPartner.balance= 0;
						newPartner.p_node= user.p_node;
						newPartner.status= 0;
						newPartner.parent= user._id;
						newPartner.type= parseInt(type);
						newPartner.save((err, account_new)=>{
							if (account_new){
								return res.status(200).send({message: 'Add Account Success'})
							}
						});
					}
					else
					{
						return res.status(404).send({message: 'Error'});
					}
				})
			}
		});
	}
	else
	{
		var balance = parseFloat(req.body.balance);
		if ( balance < 0 || isNaN(balance))
			return res.status(404).send({message: 'Please Enter Balance'})
		
		Partner.find({'$and' : [{'type' : type},{'parent' : req.user._id}]},(err,result)=>{	
			if (parseInt(result.length) >= 7)
			{
				return res.status(404).send({message: 'You can not create more than 7 accounts!'});
			}
			else
			{	
				var hour = parseInt(moment().hour()) < 10 ? '0'+moment().hour() : moment().hour();
				var seconds = parseInt(moment().seconds()) < 10 ? '0'+moment().seconds() : moment().seconds();
				var milliseconds = parseInt(moment().milliseconds()) < 10 ? '0'+moment().milliseconds() : moment().milliseconds();
				var account_id = parseInt(_.random(1,9))+''+hour+''+seconds+''+milliseconds;
				let newPartner = new Partner();
				newPartner.account_id= account_id;
				newPartner.signupDate= new Date();
				newPartner.balance=  balance;
				newPartner.p_node= user.p_node;
				newPartner.status= 0;
				newPartner.parent= user._id;
				newPartner.type= parseInt(type);
				newPartner.save((err, account_new)=>{
					if (account_new){
						res.status(200).send({message: 'Add Account Success'})
					}
				});
			}
		});
	}
}
function SubmitNewBalance(req, res){
	var account_id = req.body.account_id;
	var balance = parseFloat(req.body.balance);
	var user = req.user;	

	if ( balance < 10 || isNaN(balance))
		return res.status(404).send({message: 'Please Enter Balance'})
	if (!account_id)
		return res.status(404).send({message: 'Error'});
	
	Partner.find({'$and' : [{'type' : 1},{'account_id' : account_id}]},(err,result)=>{	
		if (!err && result)
		{
			Partner.update({'account_id' : account_id},{'$set' :{'balance' : balance}},function(errs,resss){
				res.status(200).send({message: 'New Balance Success'})
			})
		}
		else
		{
			res.status(200).send({message: 'New Balance Success'})
		}
	});

}



function DisableAccount(req, res){
	var AccountID = req.params.AccountID;
	Partner.update({'account_id' : AccountID},{'$set' : {'status' : 1}}, function(err, result){
		res.redirect('/account/useraccount')
	})
}
function EnableAccount(req, res){
	var AccountID = req.params.AccountID;
	Partner.update({'account_id' : AccountID},{'$set' : {'status' : 0}}, function(err, result){
		res.redirect('/account/useraccount')
	})
}

function ChangePasswordAccount(req, res){
	var AccountID = req.params.AccountID;
	res.locals.title = 'Change Password Account';
	res.locals.menu = 'changepassowraccount';
	res.locals.user = req.user;
	res.locals.AccountID = AccountID;
	res.render('account/changepasswordaccount');
}
function SubmitChangePasswordAccount(req, res){
	var AccountId = req.body.AccountId;
	var password = req.body.password;
	var repeat_password = req.body.repeat_password;
	if (AccountId == '' || password  == '' || repeat_password  == '' || password != repeat_password)
	{
		return res.status(404).send({message: 'Please enter password!'});
	}
	else
	{	
		let newPartner = new Partner();
		var new_pass = _.trim(req.body.password) !== '' ? newPartner.generateHash(req.body.password) : '';
		Partner.update({'account_id' : AccountId},{'$set' : {'password' : new_pass},'password_not_hash' : password},function(err,result){
			res.status(200).send({message: 'Update Password Success'})
		})
	}
}
function InteraltrabsferAccount(req, res){
	Partner.find({'$and' :[{'parent' : req.user._id},{'type' : 0}]},(err,result)=>{	
		var AccountID = req.params.AccountID;

		res.locals.title = 'Internal Transfer';
		res.locals.menu = 'interaltrabsfer';
		res.locals.user = req.user;
		res.locals.user_child = result;
		res.locals.AccountID = AccountID;
		res.render('account/interaltrabsfer');
	});
	
}
var get_balance =function(account_id,user_id,callback){
	var balance = 0;
	if (account_id == 0)
	{
		User.findOne({'_id' : user_id},(err,data)=>{
			(!err && data)? (
				callback(data.balance)
			) : callback (balance) 
		})
	}
	else
	{
		Partner.findOne({'account_id' : account_id},(err,data)=>{
			(!err && data)? (
				callback(data.balance)
			) : callback (balance) 
		})
	}
	
}

var update_balace = function(new_ast_balance,account_id,user_id,callback){
	var obj = null;
	obj =  { 'balance': parseFloat(new_ast_balance) };
	if (account_id == 0)
	{
		
		
		User.update({ _id :user_id }, { $set : obj }, function(err, UsersUpdate){
			err ? callback(false) : callback(true);
		});
	}
	else
	{
		Partner.update({'account_id' : account_id}, { $set : obj }, function(err, UsersUpdate){
			err ? callback(false) : callback(true);
		});
	}
	
}
var newHistory = function(account_id, type,amount,detail,symbol,buysell){

	var today = moment();
	return new History({
		"user_id" : account_id,
		"amount" : amount,
		"detai" : detail,
		"date" : moment(today).format(),
		"type" : type,
		"symbol" : symbol,
		"buysell" : buysell

	})
}
function Submitinteraltrabsfer(req, res){
	var FromAccountID = req.body.FromAccountID;
	var ToAccountID = req.body.ToAccountID;
	var amount = parseFloat(req.body.amount);
	var user = req.user;
	if (FromAccountID == '' || ToAccountID  == '' || amount <= 0 || isNaN(amount))
	{
		return res.status(404).send({message: 'Please enter Amount!'});
	}
	else if (FromAccountID == ToAccountID)
	{
		return res.status(404).send({message: 'Please select two different accounts!'});
	}
	else
	{	
		if (FromAccountID != 0)
		{
			Partner.find({'$and' : [{'parent' : req.user._id},{'account_id' : FromAccountID}]} ,(err,check_from_id)=>{	
				if (parseInt(check_from_id.length) > 0)
				{
					get_balance(FromAccountID,user._id,function(balance_from){

						if (parseFloat(balance_from) < amount)
						{
							res.status(404).send({message: 'Account balance is not enough'})
						}
						else
						{
							var new_balance_from = parseFloat(balance_from) - amount;
							update_balace(new_balance_from,FromAccountID,user._id,function(result){

								get_balance(ToAccountID,user._id,function(balance_to){
									var new_balance_to = parseFloat(balance_to) + amount;
									update_balace(new_balance_to,ToAccountID,user._id,function(result){
										newHistory(ToAccountID  == 0 ? user._id : ToAccountID,'deposit',parseFloat(amount),parseFloat(amount).toFixed(2),'',"Deposit").save(( err,history_create)=>{
											newHistory(FromAccountID == 0 ? user._id : FromAccountID,'withdraw',parseFloat(amount),parseFloat(amount).toFixed(2),'',"Withdraw").save(( err,history_create)=>{
												res.status(200).send({message: 'Transfer Success'})
											});
										});
									})
								});
									
							})
						}
					})
				}

			});
		}
		else
		{
			get_balance(FromAccountID,user._id,function(balance_from){

				if (parseFloat(balance_from) < amount)
				{
					res.status(404).send({message: 'Account balance is not enough'})
				}
				else
				{
					var new_balance_from = parseFloat(balance_from) - amount;
					update_balace(new_balance_from,FromAccountID,user._id,function(result){

						get_balance(ToAccountID,user._id,function(balance_to){
							var new_balance_to = parseFloat(balance_to) + amount;
							update_balace(new_balance_to,ToAccountID,user._id,function(result){
								
								newHistory(ToAccountID  == 0 ? user._id : ToAccountID,'deposit',parseFloat(amount),parseFloat(amount).toFixed(2),'',"Deposit").save(( err,history_create)=>{
									newHistory(FromAccountID  == 0 ? user._id : FromAccountID,'withdraw',parseFloat(amount),parseFloat(amount).toFixed(2),'',"Withdraw").save(( err,history_create)=>{
										res.status(200).send({message: 'Transfer Success'})
									});
								});
							})
						});
							
					})
				}
			})
		}
		
	}
}


module.exports = {
	IndexOn,
	AddAccount,
	DisableAccount,
	EnableAccount,
	ChangePasswordAccount,
	SubmitChangePasswordAccount,
	InteraltrabsferAccount,
	Submitinteraltrabsfer,
	SubmitNewBalance
}