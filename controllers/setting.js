'use strict'

const mongoose = require('mongoose');
const User = require('../models/user');
const Token = require('../models/token');
const service = require('../services');
var country = require('../public/static/js/country.json');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
const moment = require('moment');
const _ = require('lodash');

var sendpulse = require("sendpulse-api");
var sendpulse = require("./sendpulse.js");
var formidable = require('formidable');
function Index(req,res){
	var url_code = "otpauth://totp/wavetrade:"+req.user.email+"?secret="+req.user.security.two_factor_auth.code+"";
    var qr_cdode = QRCode.toDataURL(url_code, function(err, data_url) {

		res.locals.title = 'Setting'
		res.locals.menu = 'setting'
		res.locals.country = country
		res.locals.user = req.user
		res.locals.qr_code_authy = data_url
	  	res.render('account/setting')
	});


}
function IndexLoginHistory(req,res){
	var secret = req.user.security.two_factor_auth.secret

	var qr_cdode = QRCode.toDataURL(secret.otpauth_url, function(err, data_url) {

		res.locals.title = 'Setting'
		res.locals.menu = 'setting'
		res.locals.country = country
		res.locals.user = req.user
		res.locals.qr_code_authy = data_url
	  	res.render('account/login_history')
	});


}
function updatePersonal(req,res){
	req.checkBody({
		firstname: {
			notEmpty: true,
			errorMessage: 'Please enter first name'
		},
		lastname: {
			notEmpty: true,
			errorMessage: 'Please enter last name'
		},
		birthday: {
			notEmpty: true,
			errorMessage: 'Please enter Date of Birth'
		},
		phone_number: {
			notEmpty: true,
			errorMessage: 'Please enter Phone number'
		},
		address: {
			notEmpty: true,
			errorMessage: 'Please enter Address'
		},
		city: {
			notEmpty: true,
			errorMessage: 'Please enter City'
		},
		
	});
	
	var errors = req.validationErrors();
	if (errors) {
		return res.status(404).send({message:errors})
	}else {
		var query = {_id:req.user._id};
		var data_update = {$set : {
			'personal_info.firstname': req.body.firstname,
			'personal_info.lastname': req.body.lastname,
			'personal_info.birthday': req.body.birthday,
			'personal_info.gender': req.body.gender,
			'personal_info.address': req.body.address,
			'personal_info.telephone': req.body.phone_number,
			'personal_info.country': req.body.country,
			'personal_info.city': req.body.city
		}};
		User.update(query, data_update, function(err, newUser){
			if(err) return res.status(500).send({message: `Error update Personal info`})
			return res.status(200).send({message: 'Update Personal Success'});
		});
	 	
	}
}

function updatePersonal_document(req,res){
	var form =  new formidable.IncomingForm();
        
    form.uploadDir = "public/uploads/";
    
    form.parse(req,function (err, fields, file) {
    	if (!file.document_1 || !file.document_2)
    	{
    		return res.status(500).send({message: `Error`})
    	}
    	else
    	{
    		if (file.document_1.type.split("/")[0] == "image" && file.document_2.type.split("/")[0])
    		{
    			var path1 = (file.document_1.path).substring(7);
		        var path2 = (file.document_2.path).substring(7);
		       	var query = {_id:req.user._id};
				var data_update = {$set : {
					'personal_info.document1': path1,
					'personal_info.document2': path2,
					'personal_info.status_doc' : 1
				}};
				User.update(query, data_update, function(err, newUser){
					if(err) return res.status(500).send({message: `Error update Personal info`})
					return res.status(200).send({message: 'Update Personal Success'});
				});
    		}	
    		else
    		{
    			return res.status(500).send({message: `Error`})
    		}	
    	}
    });
}
function UpdateUsername(req,res){
	var username = _.trim(_.toLower(_.trim(req.body.username)))

	if (username)
	{
		User.findOne({'displayName' : username},function(errs,result){
			if (!errs && result)
			{
				return res.status(500).send({message: `Username already in use`})
			}
			else
			{
				User.update({ _id :req.user._id }, { $set : {'displayName' : username} }, function(err, UsersUpdate){
					return res.status(200).send({message: 'Update Username Success'});
				});
			}
	    	
	    })
	}
	else
	{
		return res.status(500).send({message: `Error`})
	}
}


function authy(req,res){
	let newToken = new Token();
	req.checkBody({
		authy: {
			notEmpty: true,
			errorMessage: 'Please enter code'
		},
		
	});
	
	var errors = req.validationErrors();
	
	if (errors) {
		return res.status(404).send({message:errors})
	}else {
		var verified = speakeasy.totp.verify({
		  secret: req.user.security.two_factor_auth.code,
		  encoding: 'base32',
		  token: req.body.authy
		});
		if (verified) {		
			var query = {_id:req.user._id};
			var status = req.user.security.two_factor_auth.status == '0' ? 1 : 0;
			var data_update = {$set : {
				'security.two_factor_auth.status': status
			}};
			User.update(query, data_update, function(err, newUser){
				if(err) return res.status(500).send({message: `Error update Authenticator`})
				return res.status(200).send({message: 'Update Authenticator Success'});
			});
		}	
		else
		{
			return res.status(500).send({message: `Error code Authenticator`});
		}	
	}	
}

function active(req, res) {
	let token = null;
	_.has(req.query, 'token') ? (
		token = _.split(req.query.token, '_'),
		token.length > 1 && (
			Token.findOneAndUpdate({
				'user_id' : token[1],
				'token' : token[0],
				'status': '0'
			}, {
				'status' : '1'
			}, function(err, result){
				if (result)
				{
					if (result.type == 'authy')
					{

						User.findById(token[1], function(err, user) {
							var query = {_id:user._id};
							var status = user.security.two_factor_auth.status == '0' ? 1 : 0;
							var data_update = {$set : {
								'security.two_factor_auth.status': status
							}};
							User.update(query, data_update, function(err, newUser){
								res.redirect('/login-system.html')
							});
					    });

					}
				}
				else
				{
					res.redirect('/login-system.html');
				}
			})
		)
	) : (
		res.redirect('/login-system.html')
	)
}


function changePasswrd(req,res){
	
	req.checkBody({
		oldpassword: {
			notEmpty: true,
			errorMessage: 'Please enter old password'
		},
		newPassword: {
			notEmpty: true,
			errorMessage: 'Please enter new password'
		},
		cfpassword: {
			notEmpty: true,
			errorMessage: 'Please enter new password'
		}
		
	});
	
	var errors = req.validationErrors();
	if (errors) {
		return res.status(404).send({message:errors})
	}else {
		if (req.body.newPassword != req.body.cfpassword)
			return res.status(404).send({message: 'Oops! Wrong password confirm.'});
		var user = req.user;
		if (!user.validPassword(req.body.oldpassword))
			return res.status(404).send({message: 'Oops! Wrong Old password.'});
		var query = {_id:user._id};
		var data_update = {$set : {
			'password': user.generateHash(req.body.newPassword)
		}};
		User.update(query, data_update, function(err, newUser){
			if(err) return res.status(500).send({message: `Error change password`})
			return res.status(200).send({message: 'Change password success'});
		});
	 	
	}
	
}
module.exports = {
	Index,
	IndexLoginHistory,
	updatePersonal,
	authy,
	changePasswrd,
	active,
	updatePersonal_document,
	UpdateUsername
}