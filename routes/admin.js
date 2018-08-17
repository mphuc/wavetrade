'use strict'

const express = require('express');
const AdminCtrl = require('../controllers/admin');
const InvestCtrl = require('../controllers/admin/invest');
const IcoAdminCtrl = require('../controllers/admin/ico');
const WithdrawAdminCtrl = require('../controllers/admin/withdraw');
const DepositAdminCtrl = require('../controllers/admin/deposit');
const SupportAdminCtrl = require('../controllers/admin/support');
const auth = require('../middlewares/authAdmin');
const router = express.Router();

/*SUPPORT*/
router.get('/admin/support', auth, SupportAdminCtrl.ListSupport);
router.get('/admin/support/ticket/:token', auth, SupportAdminCtrl.ViewTicker);
router.post('/admin/support/ticket/reply-support', auth, SupportAdminCtrl.SubmitReplySupport);
/*RUTAS*/
router.get('/admin', auth, AdminCtrl.Index);


router.get('/admin/dashboard', auth, AdminCtrl.Dahboard);
router.post('/admin/withdraw-balance-server', auth, AdminCtrl.WithdrawServer);
router.get('/admin/customer', auth, AdminCtrl.Customer);
router.get('/admin/edit/customer/:id', auth, AdminCtrl.EditCustomer);
router.get('/admin/customer/verified/:id', auth, AdminCtrl.VerifiedCustomer);

/*ICO*/
router.get('/admin/ico', auth, IcoAdminCtrl.ListIco);
router.get('/admin/ico-history', auth, IcoAdminCtrl.ListIcohistory);
router.get('/admin/ico/cancel/:id', auth, IcoAdminCtrl.CanelICO);
router.get('/admin/ico/matched/:id', auth, IcoAdminCtrl.MatchedICO);

router.get('/admin/ico/endico/', auth, IcoAdminCtrl.EndICO);
router.get('/admin/ico/startico/', auth, IcoAdminCtrl.StartICO);

router.post('/admin/ico/totalbuy', auth, IcoAdminCtrl.TotalBuy);
/*END ICO*/

/*Withdraw*/
router.get('/admin/withdraw', auth, WithdrawAdminCtrl.ListWithdraw);
router.get('/admin/withdraw-history', auth, WithdrawAdminCtrl.ListWithdrawhistory);
router.get('/admin/withdraw-enlable', auth, WithdrawAdminCtrl.WithdrawEnlable);
router.get('/admin/withdraw-disable', auth, WithdrawAdminCtrl.WithdrawDisable);


router.get('/admin/withdraw/payment/:id', auth, WithdrawAdminCtrl.SubmitWithdraw);

/*End Withdraw*/

/*Deposit*/
router.get('/admin/deposit', auth, DepositAdminCtrl.ListDeposit);

/*End Deposit*/

router.get('/admin/invest', auth, InvestCtrl.ListInvest);
//router.get('/wqwqeqweerysdfsfsfsfs/CaculateProfit', InvestCtrl.CaculateProfit);
router.post('/admin/updateUser', auth, AdminCtrl.updateUser);

//router.get('/admin/invest/payment/:id', auth, InvestCtrl.SubmitInvest);
router.get('/admin/history-buysell', auth, DepositAdminCtrl.ListHistoryBuySell);
router.get('/admin/buysell', auth, DepositAdminCtrl.ListOrderBuy);
router.get('/admin/history-buysell/:Account_id', auth, DepositAdminCtrl.ListHistoryBuySellAccount);


module.exports = router;