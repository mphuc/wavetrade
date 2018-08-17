'use strict'

const services = require('../services');
const localStorage = require('localStorage');
const User = require('../models/user');
function isAuthAdmin(req,res,next){ /*como es middleware recibe un 3er params*/
	
	if(!req.session.userId){
		return res.redirect('/signin');
	}
	
	User.findById(req.session.userId, function(err, user) {
		if (user.security.two_factor_auth.status == '1') {
			if(!req.session.authyId){
				return res.redirect('/two-factor-auth');
			}
            	
        }
        
        if (req.session.userId != '5ad45e709b45ef4b042a0eb3' && req.headers.host.split(':')[0] != 'localhost' ) {
        	return res.redirect('/login');
        }
        
        req.user = user
		next()
    });
}

module.exports = isAuthAdmin;