'use strict'

const express = require('express');
const MarketCtrl = require('../controllers/exchange/market');
const AutosCtrl = require('../controllers/exchange/auto');
const ChartCtrl = require('../controllers/exchange/chart');
const Dashboard = require('../controllers/exchange/dashboard');
const Page = require('../controllers/exchange/page');
const MarketadminCtrl = require('../controllers/exchange/admin');

const auth = require('../middlewares/auth');
const authchild = require('../middlewares/authchild');
const router = express.Router();
/*Dashboard*/
router.get('/Dashboard', Dashboard.Indexs);
router.get('/public', Dashboard.api_coinmartketcap);


router.get('/account/:AccountID',auth, MarketCtrl.Indexs);

router.get('/account',authchild, MarketCtrl.Index);
router.get('/reset-chart-item', MarketCtrl.Reset_Chart_Item);

router.post('/load-balance',authchild, MarketCtrl.ReloadBalance);

router.post('/loadbuysell', authchild,MarketCtrl.LoadBuySell);
router.post('/submit-buy',authchild, MarketCtrl.SubmitBuy);
router.post('/submit-sell',authchild, MarketCtrl.SubmitSell);

router.post('/cancel-order-open',auth, MarketCtrl.CancelOrder);



router.get('/loadorder-exchange-buy', MarketCtrl.LoadOrder_buyAll);
router.get('/loadorder-exchange-sell', MarketCtrl.LoadOrder_sellAll);
router.get('/load-order-open',auth, MarketCtrl.LoadOrder_Open_id);
router.get('/load-exchange-makethistory', MarketCtrl.LoadMarketHistory);
router.get('/load-exchange-mymakethistory',auth, MarketCtrl.LoadMyMarketHistory);
router.get('/load-volume', MarketCtrl.LoadVolume);
router.post('/load-ticker', MarketCtrl.load_ticker);

router.get('/load-chart/:MarketName', ChartCtrl.LoadTempalate);
router.get('/load-chart-pie/:MarketName', ChartCtrl.LoadTempalatePie);
router.get('/load-chart-item/:MarketName', ChartCtrl.LoadTempalateItem);
router.get('/load-json-chart/:MarketName', ChartCtrl.get_json_chart);


router.post('/loadchartpie', auth,MarketCtrl.loadchartpie);
router.post('/loadchartpinitem', auth,MarketCtrl.LoadChartPinItem);

router.get('/get-chart-item/:MarketName',auth, MarketCtrl.GetRedisChartItem);

router.get('/get-price-api', MarketCtrl.LoadTickerApi);

router.get('/Fees', Page.LoadTempalateFee);
router.get('/Api', Page.LoadTempalateApi);
router.get('/api/info/:MarketName', Page.Api_SFCC);

router.get('/qwertyuiop', MarketadminCtrl.LoadOrder_history);

module.exports = router;