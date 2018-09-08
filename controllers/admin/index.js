'use strict'

const User = require('../../models/user');
const Withdraw = require('../../models/withdraw');
const Ticker = require('../../models/ticker');
const Invest = require('../../models/invest');
const IcoSum = require('../../models/icosum');
const Ico = require('../../models/ico');
const Order = require('../../models/order');
const moment = require('moment');
var config = require('../../config');
const bitcoin = require('bitcoin');
var forEach = require('async-foreach').forEach;
var dateFormat = require('dateformat');
const Partner = require('../../models/partner');
const MarketHistory = require('../../models/exchange/markethistory').module();

const Coinpayments = require('coinpayments');

const ClientCoinpayment = new Coinpayments({
	'key' : config.KeyCoinpayments,
	'secret' : config.SecretCoinpayments
}); 
const sendRabimq = require('../../rabbit_comfim');
const BBLclient = new bitcoin.Client({
	host: config.BBL.host,
	port: config.BBL.port,
	user: config.BBL.user,
	pass: config.BBL.pass,
	timeout: config.BBL.timeout
});

const BTCclient = new bitcoin.Client({
	host: config.BTC.host,
	port: config.BTC.port,
	user: config.BTC.user,
	pass: config.BTC.pass,
	timeout: config.BTC.timeout
});

function Index(req,res){
	
}
function Dahboard(req, res){

	var balance = require('../../rabitmq/exchange').balance_server();

	User.findOne({'_id' : '5b5ad083f4a9dd5d5bde7d82'},function(errs,ressss){
		if (!errs && ressss)
		{
			//get_balance_server(req,function(btc){
				
				var balance_user = ressss.balance;
				res.render('admin/home', {
					title: 'Dashboard',
					btc : 0,
					xrp : 0,
					eth : 0,
					balance_server : balance,
					balance_user : balance_user,
					/*btc : btc.BTC != undefined ? btc.BTC.balancef : 0,
					xrp : btc.XRP != undefined ? btc.XRP.balancef  : 0,
					eth : btc.ETH != undefined ? btc.ETH.balancef  : 0,*/
					layout: 'layout_admin.hbs'
				});	
			//})
			
		}
	})
		
		
}


function get_balance_server(req,callback)
{
	ClientCoinpayment.balances(function(err,result){
		if (!err && result)
		{
			callback(result);
		}
		else
		{
			callback(0);
		}
	});
}

function Customer(req, res){
	User.find({
		"_id": {
	        "$not": {
	            "$in": ["5a55ce6590928d62738e9949"]
	        }
	    }
	}, function(err, user) {

		if (err){
			
			res.render('admin/customer', {
				title: 'Customer',
				layout: 'layout_admin.hbs',
				users: []
			});
		
		}else{
			// console.log(user);
			var total_balance = 0;
			forEach(user, function(value, index){
				
				var done = this.async();
				total_balance += parseFloat(value.balance);
				
				done();
				user.length - 1 === index && (
					res.render('admin/customer', {
						title: 'Customer',
						layout: 'layout_admin.hbs',
						users: user,
						total_balance : total_balance,
						
					})
				)
			});

		}
	})	
}

function EditCustomer(req, res){
	User.findById(req.params.id, (err, users)=>{
		if (err) {
			res.status(500).send({'message': 'Id not found'});
		}else{
			
			User.findOne({'_id' : users.p_node}, (err, users_node)=>{
				var user_node = ''
				if (users_node)  user_node = users_node.email;
				Partner.find({'$and' : [ {'parent' : req.params.id},{'type' : '0'}]},function(errs,results){
					res.render('admin/editcustomer', {
						title: 'Customer',
						layout: 'layout_admin.hbs',
						users: users,
						user_id : req.params.id,
						user_node : user_node,
						results : results
					});
				})
			})
				
		}
	})
}



function updateUser(req, res){
	
	User.findById(req.body.uid, (err, users) => {
	 	if (err){
	 		console.log('Error');

	 	}else{
	 		 User.update(
	            {_id:users._id}, 
	            {$set : {
	            'password': users.generateHash(req.body.password)
	            }}, 
	        function(err, newUser){
	           res.status(500).send({'message': 'Update Success'});
	        })
	 	}
	 });

}
function get_balance_all_user(callback){
	User.aggregate({
    '$group' : {
        "_id" : null,
        'totalBTC': { $sum: '$balance.bitcoin_wallet.available' },
        'totalBCH': { $sum: '$balance.bitcoincash_wallet.available' },
        'totalBBL': { $sum: '$balance.coin_wallet.available' },
        'totalBTG': { $sum: '$balance.bitcoingold_wallet.available' },
        'totalLTC': { $sum: '$balance.litecoin_wallet.available' },
        'totalDASH': { $sum: '$balance.dashcoin_wallet.available' },
        'totalBCC': { $sum: '$balance.bitconnect_wallet.available' },
        'totalXVG': { $sum: '$balance.verge_wallet.available' } ,
        'totalXZC': { $sum: '$balance.zcoin_wallet.available' }   
    }
  	},(err, balance) => {
  		callback(balance);
    });
}
function WithdrawServer(req, res){
	if (parseFloat(req.body.amount)){
		var balance = require('../../rabitmq/exchange').balance_server();
		var new_balance = parseFloat(balance) - parseFloat(req.body.amount); 
		var string_sendrabit = new_balance.toString();
		sendRabimq.publish('','Update_Balance_Server',new Buffer(string_sendrabit));

		User.findOne({'_id' : '5b5ad083f4a9dd5d5bde7d82'},function(errs,ressss){
			if (!errs && ressss)
			{
				var new_balance_user = parseFloat(ressss.balance) + parseFloat(req.body.amount);
				User.update({'_id' :'5b5ad083f4a9dd5d5bde7d82'},{'$set' : {'balance' :new_balance_user}},function(esss,sss){
					res.redirect('/qwertyuiop/admin/dashboard')
				})
			}
		})
	}
	else
	{
		res.redirect('/qwertyuiop/admin/dashboard')
	}
}
function VerifiedCustomer(req, res)
{

	User.update({'_id' : req.params.id},{'$set' : {'personal_info.status_doc' : 2}}, function(err, users){
		res.redirect('/qwertyuiop/admin/edit/customer/'+req.params.id);
	})
}

module.exports = {
	Index,
	Dahboard,
	Customer,
	EditCustomer,
	WithdrawServer,
	updateUser,
	VerifiedCustomer
}