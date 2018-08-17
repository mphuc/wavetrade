'use strict';



$(function() {
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#EXCHANGE_ONE').val();
});

var app = angular.module('exchange_one', ['ui.bootstrap'])
.factory('socketio', ['$rootScope' , function ($rootScope) {
    var socket = io.connect('http://192.254.73.26:5988',{ 'forceNew': true });
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
}]);

app.config(function($interpolateProvider) {
  $interpolateProvider.startSymbol('{[{');
  $interpolateProvider.endSymbol('}]}');
});


var exchange = $('#EXCHANGE_ONE').val();
var namecoin = $('#_NAMECOIN_').val();
var _id_ = $('#_ID_').val();

app.controller('CtrBalanceUser', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var _id_ = $('#_ID_').val();
    $http({
        url: "/exchange/load-balance",
        dataType: "json",
        method: "POST",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  

        $scope.balance = response.balance;
        
        socketio.on('OrderBuy:save', (data)=>{
            if (data.account_id == _id_) $scope.balance = parseFloat($scope.balance) - parseFloat(data.amount);
        });
        socketio.on('OrderSell:save', (data)=>{
            if (data.account_id == _id_)  $scope.balance = parseFloat($scope.balance) - parseFloat(data.amount);
        });

        socketio.on('Buy_Sell_Matchings', (data)=>{
        for (var i = 0; i < data[0].length; i++) {
            
            if (data[0][i].account_id == _id_) {
                if (data[0][i].type == 'Win')
                {
                    $scope.balance = parseFloat($scope.balance) + parseFloat(data[0][i].amount) + parseFloat(data[0][i].amount)/0.96;
                }  
            }
        }
    });
        
    })
}]);


app.controller('CtrBuySellUser', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#EXCHANGE_ONE').val();
    var _id_ = $('#_ID_').val();
    $http({
        url: "/exchange/loadbuysell",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        $scope.sum_order_buy = response.amount_buy;
        $scope.sum_order_sell = response.amount_sell;

        socketio.on('OrderBuy:save', (data)=>{
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_buy = parseFloat($scope.sum_order_buy) + parseFloat(data.amount);
        });

        socketio.on('OrderSell:save', (data)=>{
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_sell = parseFloat($scope.sum_order_sell) + parseFloat(data.amount);
        });

        socketio.on('CounDown', (data)=>{
            
            if (data.MarketName == exchange)
            {
                $scope.second = parseInt(data.second) < 10 ? '0'+parseInt(data.second) : parseInt(data.second);
                $scope.type = data.type;
            }
            
        });
        socketio.on('Buy_Sell_Matchings', (data)=>{
            if (data[1] == exchange)
            {
                $scope.sum_order_buy = 0;
                $scope.sum_order_sell = 0;
            }
        });
    })
    $scope.SubmitBuy = function() {
        $('.button_buysell .buy').css({
            'background' : 'linear-gradient(to bottom,rgba(128,128,128,1) 0,rgba(77,77,77,1) 100%)'
        })
        $(".button_buysell .buy").attr("disabled",true);
        var audio = new Audio('/tick.mp3');
        audio.play();
        $.ajax({
            type: "POST",
            url: "/exchange/submit-buy",
            data: {
                
                'amount' : $('.button_buysell [name="amount"]').val(),
                'MarketName' : $('.button_buysell [name="MarketName"]').val(),
                'token_crt' : $('.button_buysell [name="token_crt"]').val()
            },
            cache: false,
            success: function(data){
                setTimeout(function() {
                    $('.button_buysell .buy').css({
                        'background' : 'linear-gradient(to bottom,rgba(0,104,55,1) 0,rgba(0,56,28,1) 100%)'
                    })
                    $(".button_buysell .buy").attr("disabled",false);
                }, 300);
            },
            error: function(data){
                setTimeout(function() {
                    $('.button_buysell .buy').css({
                        'background' : 'linear-gradient(to bottom,rgba(0,104,55,1) 0,rgba(0,56,28,1) 100%)'
                    })
                    $(".button_buysell .buy").attr("disabled",false);
                }, 300);
                alert('An error occurred to try again after');
            }
        });

        return false;
    };

    $scope.SubmitSell = function() {
        $('.button_buysell .sell').css({
            'background' : 'linear-gradient(to bottom,rgba(128,128,128,1) 0,rgba(77,77,77,1) 100%)'
        })
        $(".button_buysell .sell").attr("disabled",true);
        var audio = new Audio('/tick.mp3');
        audio.play();
        $.ajax({
            type: "POST",
            url: "/exchange/submit-sell",
            data: {
                
                'amount' : $('.button_buysell [name="amount"]').val(),
                'MarketName' : $('.button_buysell [name="MarketName"]').val(),
                'token_crt' : $('.button_buysell [name="token_crt"]').val()
            },
            cache: false,
            success: function(data){
                setTimeout(function() {
                    $('.button_buysell .sell').css({
                        'background' : 'linear-gradient(to bottom,rgba(255,0,0,1) 0,rgba(165,0,0,1) 100%)'
                    })
                    $(".button_buysell .sell").attr("disabled",false);
                }, 300);
            },
            error: function(data){
                setTimeout(function() {
                    $('.button_buysell .sell').css({
                        'background' : 'linear-gradient(to bottom,rgba(255,0,0,1) 0,rgba(165,0,0,1) 100%)'
                    })
                    $(".button_buysell .sell").attr("disabled",false);
                }, 300);
                alert('An error occurred to try again after');
            }
        });

        return false;
    };
    
}]);

app.controller('CtrCharPin', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#EXCHANGE_ONE').val();
    $http({
        url: "/exchange/loadchartpin",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
            
        $scope.total_buy = response.total_buy == 0 ? 50 : response.total_buy;
        $scope.total_sell = response.total_sell == 0 ? 50 : response.total_sell;

        $scope.percent_buy = (parseFloat($scope.total_buy)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);
        $scope.percent_sell = (parseFloat($scope.total_sell)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);


        socketio.on('OrderBuy:save', (data)=>{
            
            if (data.MarketName == exchange)
            {
                $scope.total_buy = parseFloat(data.amount) + parseFloat($scope.total_buy);
                $scope.percent_buy = (parseFloat($scope.total_buy)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);
                $scope.percent_sell = (parseFloat($scope.total_sell)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);
            }
        });

        socketio.on('OrderSell:save', (data)=>{
            if (data.MarketName == exchange)
            {
                $scope.total_sell = parseFloat(data.amount) + parseFloat($scope.total_sell);
                $scope.percent_buy = (parseFloat($scope.total_buy)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);
                $scope.percent_sell = (parseFloat($scope.total_sell)/(parseFloat($scope.total_buy)+parseFloat($scope.total_sell))*100).toFixed(1);
            }
        });

        socketio.on('Buy_Sell_Matchings', (data)=>{
            if (data[1] == exchange)
            {
                $scope.percent_buy =  50;
                $scope.percent_sell =  50;
            }
            
        });

    })
}]);

app.controller('CtrCounDown', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#EXCHANGE_ONE').val();
    $scope.second = 29;
    $scope.type = 'order';
    socketio.on('CounDown', (data)=>{
        if (data.MarketName == exchange)
        {
            var audio = new Audio('/bettick.mp3');
            audio.play();
            
            $scope.second = parseInt(data.second) < 10 ? '0'+parseInt(data.second) : parseInt(data.second);
            $scope.type = data.type;
        }
    });
}]);

app.controller('CtrCharPinItem', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#EXCHANGE_ONE').val();
    $http({
        url: "/exchange/loadchartpinitem",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  

        $scope.item_all = response.result;
        $scope.items = [];
        var y = 0;

        for (var i = 0 ; i < $scope.item_all.length; i++) {
            y ++;
            $scope.items[y] = $scope.item_all[i].types;
        }
        
    })
    socketio.on('Matching:push', (data)=>{ 
        if (data.MarketName == exchange)
        {
            if ($scope.item_all.length == 60)
            {
                $scope.item_all = [];
                $scope.items = [];
            }
            $scope.item_all.push(data);
            var yz = 0;
            for (var i = 0 ; i < $scope.item_all.length; i++) {
                yz ++;
                $scope.items[yz] = $scope.item_all[i].types;
            }
            
        }
    })
    
}]);

app.controller('CtrMessage', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#EXCHANGE_ONE').val();
    var _id_ = $('#_ID_').val();
    socketio.on('Buy_Sell_Matchings', (data)=>{
        if (data[1] == exchange)
        {
            for (var i = 0; i < data[0].length; i++) {
               
                if (data[0][i].account_id == _id_) {
                    $scope.message = 'You '+data[0][i].type+' '+ (data[0][i].type == 'Lose' ? '-' : '+') +parseFloat(data[0][i].amount);
                    if (data[0][i].type == 'Lose')
                    {
                        var audio = new Audio('/lose.mp3');
                        audio.play();
                    }  
                    else
                    {
                        var audio = new Audio('/win.mp3');
                        audio.play();
                    }

                    $('.noti-Result').show();
                }
            }
        }
        setTimeout(function() {
            $('.noti-Result').hide();
        }, 2000);
    });
}]);
/*app.controller('CtrVolume', ['$scope','$http','socketio', function($scope,$http,socketio) {
    'use strict';
    
    $http({
        url: "/Market/load-volume?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  
        $scope.Volume = response.result;
        $scope.usd = response.usd;
        $('title').text('('+(parseFloat($scope.Volume.last)/100000000).toFixed(8)+') '+$('#_NAMECOIN_').val()+'-'+$('#EXCHANGE_ONE').val());
    }).error(function(error){
        $scope.error = error;
    });

    $scope.CompareNumber = function(num1,num2) {
        
        if(parseFloat(num1) == parseFloat(num2)) {
            return 'equal';
        } 
        if(parseFloat(num1) > parseFloat(num2)) {
            return 'up';
        } 
        if(parseFloat(num1) < parseFloat(num2)) {
            return 'down';
        } 
    }

    socketio.on('Volume:update', (data)=>{
        
        $scope.Volume = data;
    });
}]);*/
/*app.controller('CtrMarketHistory', ['$scope','$http','socketio', function($scope,$http,socketio) {
    'use strict';
    
    $http({
        url: "/Market/load-exchange-makethistory?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  

        $scope.data = response.result;

        $scope.viewby = 10;
        $scope.totalItems = $scope.data.length;
        $scope.currentPage = 1;
        $scope.itemsPerPage = $scope.viewby;
        $scope.maxSize = 7;
        $scope.user_id = _id_;


    }).error(function(error){
        $scope.error = error;
    });

    $scope.setPage = function (pageNo) {
        $scope.currentPage = pageNo;
    };
    $scope.pageChanged = function() {
        
    };
    $scope.setItemsPerPage_history = function(num) {
        $scope.itemsPerPage = num;
        $scope.currentPage = 1;
    }

    socketio.on('Buy_Sell_Matchings',(data)=>{
        var data = data[0];
        if (data.MatchingOrder.length > 0)
        {
            var quantity,price,total,date,type,scope_save;

            for (var i = 0; i < data.MatchingOrder.length; i++) {
                if (data.MatchingOrder[i][1] == $scope.user_id)
                {
                    load_balance_user($http,$scope,namecoin,exchange);
                    $.toast({
                        heading: (data.MatchingOrder[i][2]).split("-")[1]+' Buy Place',
                        text: 'Your buy order of  '+parseFloat(data.MatchingOrder[i][3])/100000000+' units of '+(data.MatchingOrder[i][2]).split("-")[1]+' at '+parseFloat(data.MatchingOrder[i][4])/100000000+' per unit has been placed.',
                        showHideTransition: 'fade',
                        icon: 'info',
                        position: 'top-right',
                        hideAfter: 5000,
                        loaderBg: '#4c4c4c'
                    })
                }
                if (data.MatchingOrder[i][0] == $scope.user_id)
                {
                    load_balance_user($http,$scope,namecoin,exchange);
                    $.toast({
                        heading: (data.MatchingOrder[i][2]).split("-")[1]+' Sell Place',
                        text: 'Your buy order of '+parseFloat(data.MatchingOrder[i][3])/100000000+' units of '+(data.MatchingOrder[i][2]).split("-")[1]+' at '+parseFloat(data.MatchingOrder[i][4])/100000000+' per unit has been placed.',
                        showHideTransition: 'fade',
                        icon: 'info',
                        position: 'top-right',
                        hideAfter: 5000,
                        loaderBg: '#4c4c4c'
                    })
                }

                //item.user_id, buyorder.user_id, buyorder.MarketName, item.quantity, item.price, 'Buy',now_date 

                quantity = data.MatchingOrder[i][3];
                price = data.MatchingOrder[i][4];
                total = parseFloat(data.MatchingOrder[i][3])*parseFloat(data.MatchingOrder[i][4])/100000000;
                date = data.MatchingOrder[i][6];
                type = data.MatchingOrder[i][5];

                scope_save = $scope.data;

                scope_save.push({'type' : type ,'quantity' : quantity,'price' : price,'total' : total, 'date' : date});
                
                
                $scope.data = scope_save;
                $scope.totalItems = $scope.data.length;
                $scope.setPage = function (pageNo) {
                    $scope.currentPage = pageNo;
                };
            }
        }
    });

    socketio.on('MatchingOrder', (data)=>{
        var quantity,price,total,date,type,scope_save;

        for (var i = 0; i < data.length; i++) {
            if (data[i][1] == $scope.user_id)
            {
                load_balance_user($http,$scope,namecoin,exchange);
                $.toast({
                    heading: (data[i][2]).split("-")[1]+' Buy Place',
                    text: 'Your buy order of '+parseFloat(data[i][3])/100000000+' units of '+(data[i][2]).split("-")[1]+' at '+parseFloat(data[i][4])/100000000+' per unit has been placed.',
                    showHideTransition: 'fade',
                    icon: 'info',
                    position: 'top-right',
                    hideAfter: 5000,
                    loaderBg: '#4c4c4c'
                })
            }
            if (data[i][0] == $scope.user_id)
            {
                load_balance_user($http,$scope,namecoin,exchange);
                $.toast({
                    heading: (data[i][2]).split("-")[1]+' Sell Place',
                    text: 'Your sell order of '+parseFloat(data[i][3])/100000000+' units of '+(data[i][2]).split("-")[1]+' at '+parseFloat(data[i][4])/100000000+' per unit has been placed.',
                    showHideTransition: 'fade',
                    icon: 'info',
                    position: 'top-right',
                    hideAfter: 5000,
                    loaderBg: '#4c4c4c'
                })
            }

            //item.user_id, buyorder.user_id, buyorder.MarketName, item.quantity, item.price, 'Buy',now_date 

            quantity = data[i][3];
            price = data[i][4];
            total = parseFloat(data[i][3])*parseFloat(data[i][4])/100000000;
            date = data[i][6];
            type = data[i][5];

            scope_save = $scope.data;

            scope_save.push({'type' : type ,'quantity' : quantity,'price' : price,'total' : total, 'date' : date});
            
            
            $scope.data = scope_save;
            $scope.totalItems = $scope.data.length;
            $scope.setPage = function (pageNo) {
                $scope.currentPage = pageNo;
            };
        }
    });

}]);


app.controller('CtrOrderBuy', ['$scope','$http','socketio', function($scope,$http,socketio) {
    'use strict';
    
    $http({
        url: "/Market/loadorder-exchange-buy?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  

        $scope.data_temp = response.result;

        var result = [];
        response.result.reduce(function (res, value) {
            if (!res[parseFloat(value.price).toFixed(8)]) {
                res[parseFloat(value.price).toFixed(8)] = {
                    quantity: 0,
                    total : 0,
                    price: parseFloat(value.price).toFixed(8)
                };
                result.push(res[parseFloat(value.price).toFixed(8)])
            }
            res[parseFloat(value.price).toFixed(8)].quantity += parseFloat(value.quantity);
            res[parseFloat(value.price).toFixed(8)].total += parseFloat(value.total)
            return res;
        }, {});


        $scope.data = result;

        $scope.viewby = 10;
        $scope.totalItems = $scope.data.length;
        $scope.currentPage = 1;
        $scope.itemsPerPage = $scope.viewby;
        $scope.maxSize = 5;
        $scope.user_id = _id_;

        $scope.setPage = function (pageNo) {
            $scope.currentPage = pageNo;
        };
        $scope.pageChanged = function() {
        };
        $scope.setItemsPerPage = function(num) {
            $scope.itemsPerPage = num;
            $scope.currentPage = 1;
        }
    }).error(function(error){
        $scope.error = error;
    });

    $scope.ClickBuyOrder = function(data){
        load_token();
        var data_click = data.split("_");
        var quantity_Buy = (parseFloat(data_click[1])/100000000).toFixed(8);
        var price_Buy = (parseFloat(data_click[2])/100000000).toFixed(8);
        
        var fee = 0.9975;
        var total = (quantity_Buy*price_Buy*fee).toFixed(8);
        var subtotal = (quantity_Buy*price_Buy).toFixed(8);
        var commission = (quantity_Buy*price_Buy*0.0025).toFixed(8);

        $('#Form-submit-sell-exchange .error_submit_sell').hide();

        $('#Form-submit-sell-exchange input[name="quantity"]').val(quantity_Buy);
        $('#Form-submit-sell-exchange input[name="price"]').val(price_Buy);

        $('#Form-submit-sell-exchange input[name="subtotal"]').val(subtotal);
        $('#Form-submit-sell-exchange input[name="commission"]').val(commission);
        $('#Form-submit-sell-exchange input[name="total"]').val(total);

        $('#modal_sell_Exchange').modal();
    }  
    $scope.ClickBuyQuantityForm = function(data){
        var quantity_Buy = (parseFloat(data)/100000000).toFixed(8);
        $('#form_Buy_exchange input[name="quantity_Buy"]').val(quantity_Buy);
        $('#form_Sell_exchange input[name="quantity_Buy"]').val(quantity_Buy);

        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var price_Buy = $('#form_Buy_exchange input[name="price_Buy"]').val();
        if (parseFloat(price_Buy) > 0)
        {
            var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
            $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);
        }

        var price_Sell = $('#form_Sell_exchange input[name="price_Buy"]').val();
        if (parseFloat(price_Sell) > 0)
        {
            var total_Sells = (quantity_Buy*price_Buy*fee_sell).toFixed(8);
            $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sells);
        }
    }

    $scope.ClickBuyPriceForm = function(data){
        var price_Buy = (parseFloat(data)/100000000).toFixed(8);
        $('#form_Buy_exchange input[name="price_Buy"]').val(price_Buy);
        $('#form_Sell_exchange input[name="price_Buy"]').val(price_Buy);

        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var quantity_Buy = $('#form_Buy_exchange input[name="quantity_Buy"]').val();
        if (parseFloat(quantity_Buy) > 0)
        {
            var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
            $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);
        }

        var quantity_Sell = $('#form_Sell_exchange input[name="quantity_Buy"]').val();

        if (parseFloat(quantity_Sell) > 0)
        {
            var total_Sells = (quantity_Sell*price_Buy*fee_sell).toFixed(8);
            $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sells);
        }
    }


    $scope.ClickBuyForm = function(data){

        var data_click = data.split("_");
        var quantity_Buy = (parseFloat(data_click[0])/100000000).toFixed(8);
        var price_Buy = (parseFloat(data_click[1])/100000000).toFixed(8);
        
        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
        var total_Sell = (quantity_Buy*price_Buy*fee_sell).toFixed(8);

        $('#form_Buy_exchange input[name="quantity_Buy"]').val(quantity_Buy);
        $('#form_Buy_exchange input[name="price_Buy"]').val(price_Buy);
        $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);

        $('#form_Sell_exchange input[name="quantity_Buy"]').val(quantity_Buy);
        $('#form_Sell_exchange input[name="price_Buy"]').val(price_Buy);
        $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sell);

        $('html, body').animate({
            scrollTop: $("#scroll_buy").offset().top-80
        }, 400);
    }

    socketio.on('OrderBuy:save', (data)=>{
        var quantity = data.quantity;
        var price = data.price;
        var total =parseFloat(data.total);
        var user_id = data.user_id;
        var id = data._id;
        var scope_save = $scope.data_temp;
        scope_save.push({'_id' : id ,'quantity' : quantity,'price' : price,'total' : total, 'user_id' : user_id});
        $scope.data_temp = scope_save;
        var result = [];
        var check_item = 0;
        for (var s = 0; s < $scope.data.length; s++) {
            if ($scope.data[s].price == price)
            {
                var quantity_new = (parseFloat($scope.data[s].quantity) + parseFloat(quantity)).toFixed(8);
                var total_new = (parseFloat($scope.data[s].total) + parseFloat(total)).toFixed(8);
                var price_new = parseFloat($scope.data[s].price).toFixed(8);
                $scope.data.splice(s, 1);
                $scope.data.push({'quantity' : quantity_new,'price' : price_new,'total' : total_new})
                check_item = 1;
                break;
            }
        };
        if (check_item == 0){
            $scope.data.push({'quantity' : quantity,'price' : price,'total' : total});
        }
        $scope.totalItems = $scope.data.length;
        $scope.setPage = function (pageNo) {
            $scope.currentPage = pageNo;
        };
    });
   

    socketio.on('Buy_Sell_Matchings',(data)=>{

        //console.log(data);

        var data = data[0];
        if (data.OrderBuy_remove.length > 0)
        {
            
            var quantity_new,total_new,price_new;
            for (var y = 0; y < data.OrderBuy_remove.length; y++) {
                for(var i = 0; i < $scope.data.length; i++) {
                    if($scope.data[i].price == data.OrderBuy_remove[y].price) {
                        quantity_new = (parseFloat($scope.data[i].quantity)-parseFloat(data.OrderBuy_remove[y].quantity)).toFixed(8);
                        total_new = (parseFloat($scope.data[i].total)-parseFloat(data.OrderBuy_remove[y].total)).toFixed(8);
                        price_new = $scope.data[i].price;
                        $scope.data.splice(i, 1);
                        if (quantity_new > 0 && total_new > 0) {
                            $scope.data.push({'quantity' : quantity_new,'price' : price_new,'total' : total_new});
                        }
                        break;
                    }
                }
                $scope.totalItems = $scope.data.length;
            }
        } 
    });

    socketio.on('Loadbalance', (data)=>{
        load_balance_user($http,$scope,namecoin,exchange)
    });
    

}]);

app.controller('CtrOrderSell', ['$scope','$http','socketio', function($scope,$http,socketio) {
    'use strict';
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#EXCHANGE_ONE').val();
    

    $http({
        url: "/Market/loadorder-exchange-sell?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        $scope.data_temp = response.result;
        var result = [];
        response.result.reduce(function (res, value) {
            if (!res[parseFloat(value.price).toFixed(8)]) {
                res[parseFloat(value.price).toFixed(8)] = {
                    quantity: 0,
                    total : 0,
                    price: parseFloat(value.price).toFixed(8)
                };
                result.push(res[parseFloat(value.price).toFixed(8)])
            }
            res[parseFloat(value.price).toFixed(8)].quantity += parseFloat(value.quantity);
            res[parseFloat(value.price).toFixed(8)].total += parseFloat(value.total)
            return res;
        }, {});

        $scope.data = result;
        $scope.viewby = 10;
        $scope.totalItems = $scope.data.length;
        $scope.currentPage = 1;
        $scope.itemsPerPage = $scope.viewby;
        $scope.maxSize = 5;
        $scope.user_id = _id_;

        $scope.setPage = function (pageNo) {
            $scope.currentPage = pageNo;
        };
        $scope.pageChanged = function() {
        };
        $scope.setItemsPerPage = function(num) {
            $scope.itemsPerPage = num;
            $scope.currentPage = 1;
        }
    }).error(function(error){
        $scope.error = error;
    });

    $scope.ClickSellOrder = function(data){
        load_token();
        var data_click = data.split("_");
        var quantity_Buy = (parseFloat(data_click[1])/100000000).toFixed(8);
        var price_Buy = (parseFloat(data_click[2])/100000000).toFixed(8);
        var fee = 1.0025;
        var total = (quantity_Buy*price_Buy*fee).toFixed(8);
        var subtotal = (quantity_Buy*price_Buy).toFixed(8);
        var commission = (quantity_Buy*price_Buy*0.0025).toFixed(8);
        $('#Form-submit-buy-exchange .error_submit_buy').hide();
        $('#Form-submit-buy-exchange input[name="quantity"]').val(quantity_Buy);
        $('#Form-submit-buy-exchange input[name="price"]').val(price_Buy);
        $('#Form-submit-buy-exchange input[name="subtotal"]').val(subtotal);
        $('#Form-submit-buy-exchange input[name="commission"]').val(commission);
        $('#Form-submit-buy-exchange input[name="total"]').val(total);
        $('#modal_buy_Exchange').modal();
    }  

    $scope.ClickSellForm = function(data){

        var data_click = data.split("_");
        var quantity_Sell = (parseFloat(data_click[0])/100000000).toFixed(8);
        var price_Sell = (parseFloat(data_click[1])/100000000).toFixed(8);
        
        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var total_Buy = (quantity_Sell*price_Sell*fee_buy).toFixed(8);
        var total_Sell = (quantity_Sell*price_Sell*fee_sell).toFixed(8);

        $('#form_Buy_exchange input[name="quantity_Buy"]').val(quantity_Sell);
        $('#form_Buy_exchange input[name="price_Buy"]').val(price_Sell);
        $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);

        $('#form_Sell_exchange input[name="quantity_Buy"]').val(quantity_Sell);
        $('#form_Sell_exchange input[name="price_Buy"]').val(price_Sell);
        $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sell);

        $('html, body').animate({
            scrollTop: $("#scroll_sell").offset().top-80
        }, 400);
    }

    $scope.ClickSellQuantityForm = function(data){
        var quantity_Buy = (parseFloat(data)/100000000).toFixed(8);
        $('#form_Buy_exchange input[name="quantity_Buy"]').val(quantity_Buy);
        $('#form_Sell_exchange input[name="quantity_Buy"]').val(quantity_Buy);

        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var price_Buy = $('#form_Buy_exchange input[name="price_Buy"]').val();
        if (parseFloat(price_Buy) > 0)
        {
            var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
            $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);
        }

        var price_Sell = $('#form_Sell_exchange input[name="price_Buy"]').val();
        if (parseFloat(price_Sell) > 0)
        {
            var total_Sells = (quantity_Buy*price_Buy*fee_sell).toFixed(8);
            $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sells);
        }
    }

    $scope.ClickSellPriceForm = function(data){
        var price_Buy = (parseFloat(data)/100000000).toFixed(8);
        $('#form_Buy_exchange input[name="price_Buy"]').val(price_Buy);
        $('#form_Sell_exchange input[name="price_Buy"]').val(price_Buy);

        var fee_buy = 1.0025;
        var fee_sell = 0.9975;
        var quantity_Buy = $('#form_Buy_exchange input[name="quantity_Buy"]').val();
        if (parseFloat(quantity_Buy) > 0)
        {
            var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
            $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);
        }

        var quantity_Sell = $('#form_Sell_exchange input[name="quantity_Buy"]').val();

        if (parseFloat(quantity_Sell) > 0)
        {
            var total_Sells = (quantity_Sell*price_Buy*fee_sell).toFixed(8);
            $('#form_Sell_exchange input[name="total_Buy"]').val(total_Sells);
        }
    }

    socketio.emit('Create-Room-Exchange', name_coin+'-'+exchange);
    socketio.on('OrderSell:save', (data)=>{
        var quantity = data.quantity;
        var price = data.price;
        var total = data.total;
        var user_id = data.user_id;
        var id = data._id;

        var scope_save = $scope.data_temp;

        scope_save.push({'_id' : id ,'quantity' : quantity,'price' : price,'total' : total, 'user_id' : user_id});
            

        $scope.data_temp = scope_save;

        var result = [];
        var check_item = 0;
        for (var s = 0; s < $scope.data.length; s++) {
            if (parseFloat($scope.data[s].price) == parseFloat(price))
            {
                var quantity_new = (parseFloat($scope.data[s].quantity) + parseFloat(quantity)).toFixed(8);
                var total_new = (parseFloat($scope.data[s].total) + parseFloat(total)).toFixed(8);
                var price_new = parseFloat($scope.data[s].price).toFixed(8);
                $scope.data.splice(s, 1);
                $scope.data.push({'quantity' : quantity_new,'price' : price_new,'total' : total_new})
                check_item = 1;
                break;
            }
        };
        if (check_item == 0){
            $scope.data.push({'quantity' : quantity,'price' : price,'total' : total});
        }
        $scope.totalItems = $scope.data.length;
        $scope.setPage = function (pageNo) {
            $scope.currentPage = pageNo;
        };
    });

    socketio.on('Buy_Sell_Matchings',(data)=>{
        var data = data[0];

        if (data.OrderSell_remove.length > 0)
        {
            var quantity_new;
            var total_new;
            var price_new;
            for (var y = 0; y < data.OrderSell_remove.length; y++) {
                for(var i = 0; i < $scope.data.length; i++) {

                    //console.log($scope.data[i].price,data.OrderSell_remove[y].price);

                    if(parseFloat($scope.data[i].price) == parseFloat(data.OrderSell_remove[y].price)) {
                        quantity_new = (parseFloat($scope.data[i].quantity)-parseFloat(data.OrderSell_remove[y].quantity)).toFixed(8);
                        total_new = (parseFloat($scope.data[i].total)-parseFloat(data.OrderSell_remove[y].total)).toFixed(8);
                        price_new = $scope.data[i].price;
                        $scope.data.splice(i, 1);
                        if (quantity_new > 0 && total_new > 0) {
                            $scope.data.push({'quantity' : quantity_new,'price' : price_new,'total' : total_new});
                        }
                        break;
                    }
                }
                $scope.totalItems = $scope.data.length;

            }
        }
    });

    
    socketio.on('Loadbalance', (data)=>{
        load_balance_user($http,$scope,namecoin,exchange)
    });
}]);

app.controller('CtrOrderOpen', ['$scope','$http', 'socketio', function($scope,$http,socketio) {
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#EXCHANGE_ONE').val();

    $http({
        url: "/Market/load-order-open?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        $scope.data = response.result;
        $scope.viewby = 10;
        $scope.totalItems = $scope.data.length;
        $scope.currentPage = 1;
        $scope.itemsPerPage = $scope.viewby;
        $scope.maxSize = 5;
        $scope.user_id = _id_;
        $scope.setPage = function (pageNo) {
            $scope.currentPage = pageNo;
        };
        $scope.pageChanged = function() {
        };
        $scope.setItemsPerPage = function(num) {
            $scope.itemsPerPage = num;
            $scope.currentPage = 1;
        }

    }).error(function(error){
        $scope.error = error;
    });

    $scope.ClickCancelOrder = function(data){

        $http({
            url: "/Market/cancel-order-open",
            dataType: "json",
            method: "POST",
            data: {'data' : data},
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            }
        }).success(function(response){ 
            for(var i = $scope.data.length; i--;){
                if ($scope.data[i].remove === data) 
                {
                    $scope.data.splice(i, 1);
                    break;
                }
            }
            $scope.totalItems = $scope.data.length;
            $.toast({
                heading: 'Order Cancel Sumitted',
                text: 'You order has been submitted for cancelling',
                showHideTransition: 'fade',
                icon: 'error',
                position: 'top-right',
                hideAfter: 5000,
                loaderBg: '#4c4c4c'
            })
        }).error(function(error){
            $scope.error = error;
        });
    }

    socketio.emit('Create-Room-Exchange', name_coin+'-'+exchange);
    socketio.on('OrderBuy:save', (data)=>{
        if (data.user_id == $scope.user_id)
        {
            var commission = (parseFloat(data.commission)/100000000).toFixed(8);
            var date = data.date;
            var remove = data._id+'_Buy';
            var quantity = (parseFloat(data.quantity)/100000000).toFixed(8);
            var price = (parseFloat(data.price)/100000000).toFixed(8);
            var total = (parseFloat(data.total)/100000000).toFixed(8);
            var type = 'Buy';
            $scope.data.push({'commission' : commission,'date' : date, 'remove' : remove,'quantity' : quantity,'price' : price,'total' : total, 'type' : type});
            $scope.totalItems = $scope.data.length;
            $scope.setPage = function (pageNo) {
                $scope.currentPage = pageNo;
            };
        }
    });

    socketio.on('OrderSell:save', (data)=>{
        if (data.user_id == $scope.user_id)
        {
            var commission = (parseFloat(data.commission)/100000000).toFixed(8);
            var date = data.date;
            var remove = data._id+'_Sell';
            var quantity = (parseFloat(data.quantity)/100000000).toFixed(8);
            var price = (parseFloat(data.price)/100000000).toFixed(8);
            var total = (parseFloat(data.total)/100000000).toFixed(8);
            var type = 'Sell';
            $scope.data.push({'commission' : commission,'date' : date, 'remove' : remove,'quantity' : quantity,'price' : price,'total' : total, 'type' : type});
            $scope.totalItems = $scope.data.length;
            $scope.setPage = function (pageNo) {
                $scope.currentPage = pageNo;
            };
        }
    });
    socketio.on('Buy_Sell_Matchings',(data)=>{
        var data = data[0];
        
        if (data.OrderSell_remove.length > 0)
        {
            
            for (var y = 0; y < data.OrderSell_remove.length; y++) {
                for(var i = 0; i < $scope.data.length; i++) {
                    
                    if($scope.data[i].remove ==  data.OrderSell_remove[y]._id+'_Sell') {

                        if (parseFloat($scope.data[i].quantity)*100000000 == parseFloat(data.OrderSell_remove[y].quantity))
                        {
                            $scope.data.splice(i, 1);
                        }
                        else
                        {
                            var quantity_curent = parseFloat($scope.data[i].quantity);
                            var quantity_new = (quantity_curent*100000000) - parseFloat(data.OrderSell_remove[y].quantity);
                            if (parseFloat(quantity_new) > 0)
                            {
                                $scope.data[i].quantity =  (quantity_new/100000000).toFixed(8);
                            }
                            else
                            {
                                $scope.data.splice(i, 1);
                            }
                        }
                        break;
                    }
                }
                
                $scope.totalItems = $scope.data.length;
            }
        }

        if (data.OrderBuy_remove.length > 0)
        {
            for (var y = 0; y < data.OrderBuy_remove.length; y++) {
                for(var i = 0; i < $scope.data.length; i++) {
                    if($scope.data[i].remove == data.OrderBuy_remove[y]._id+'_Buy') {
                        if (parseFloat($scope.data[i].quantity)*100000000 == parseFloat(data.OrderBuy_remove[y].quantity))
                        {
                            $scope.data.splice(i, 1);
                        }
                        else
                        {
                            var quantity_curent = parseFloat($scope.data[i].quantity);
                            var quantity_new = (quantity_curent*100000000) - parseFloat(data.OrderBuy_remove[y].quantity);
                            if (parseFloat(quantity_new) > 0)
                            {
                                $scope.data[i].quantity =  (quantity_new/100000000).toFixed(8);
                            }
                            else
                            {
                                $scope.data.splice(i, 1);
                            }
                            
                        }
                    }
                }
                $scope.totalItems = $scope.data.length;
            }
        }
    });


    socketio.on('Loadbalance', (data)=>{
        load_balance_user($http,$scope,namecoin,exchange)
    });
}]);
 

app.controller('CtrMyMarketHistory', ['$scope','$http','socketio', function($scope,$http,socketio) {
    'use strict';
    
    $http({
        url: "/Market/load-exchange-mymakethistory?MarketName="+namecoin+"-"+exchange+"",
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  
        $scope.data = response.result;
        $scope.viewby = 10;
        $scope.totalItems = $scope.data.length;
        $scope.currentPage = 1;
        $scope.itemsPerPage = $scope.viewby;
        $scope.maxSize = 5;
        $scope.user_id = _id_;
    }).error(function(error){
        $scope.error = error;
    });

    $scope.setPage = function (pageNo) {
        $scope.currentPage = pageNo;
    };
    $scope.pageChanged = function() {
    };
    $scope.setItemsPerPage_history = function(num) {
        $scope.itemsPerPage = num;
        $scope.currentPage = 1;
    }

    socketio.on('Buy_Sell_Matchings',(data)=>{
        var data = data[0];
        if (data.MatchingOrder.length > 0)
        {
            for (var i = 0; i < data.MatchingOrder.length; i++) {
                if (data.MatchingOrder[i][1] == $scope.user_id || data.MatchingOrder[i][0] == $scope.user_id)
                {   
                    var quantity = data.MatchingOrder[i][3];
                    var price = data.MatchingOrder[i][4];
                    var total = parseFloat(data.MatchingOrder[i][3])*parseFloat(data.MatchingOrder[i][4])/100000000;
                    var date = data.MatchingOrder[i][6];
                    var type = data.MatchingOrder[i][5];
                    var scope_save = $scope.data;
                    scope_save.push({'type' : type ,'quantity' : quantity,'price' : price,'total' : total, 'date' : date , 'user_id_buy' : data.MatchingOrder[i][0], 'user_id_sell' : data.MatchingOrder[i][1]});
                    $scope.data = scope_save;
                    $scope.totalItems = $scope.data.length;
                    $scope.setPage = function (pageNo) {
                        $scope.currentPage = pageNo;
                    };
                }
            }
        }
    });

}]);*/

function load_balance_user($http,$scope,exchange){
    $http({
        url: "/exchange/reload-balance",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        $('#balance').html(response.namecoin);
        $('#availableBaseCurrency_exchange').html(response.exchange);
    })
}
function groupBy( array , f )
{
  var groups = {};
  array.forEach( function( o )
  {
    var group = JSON.stringify( f(o) );
    groups[group] = groups[group] || [];
    groups[group].push( o );  
  });
  return Object.keys(groups).map( function( group )
  {
    return groups[group]; 
  })
}


function click_price_sell(price_Buy){
    var price_Buy = parseFloat(price_Buy).toFixed(8);

    $('#form_Sell_exchange input[name="price_Buy"]').val(price_Buy);
    var quantity_Buy = $('#form_Sell_exchange input[name="quantity_Buy"]').val();

    var total_Buy = $('#form_Sell_exchange input[name="total_Buy"]').val();
    var fee_buy = 0.9975;
    if (parseFloat(quantity_Buy) > 0)
    {
        var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
        $('#form_Sell_exchange input[name="total_Buy"]').val(total_Buy);
    }
}

function click_price_buy(price_Buy){

    var price_Buy = parseFloat(price_Buy).toFixed(8);
    $('#form_Buy_exchange input[name="price_Buy"]').val(price_Buy);
    var quantity_Buy = $('#form_Buy_exchange input[name="quantity_Buy"]').val();
    var total_Buy = $('#form_Buy_exchange input[name="total_Buy"]').val();
    var fee_buy = 1.0025;
    if (parseFloat(quantity_Buy) > 0)
    {
        var total_Buy = (quantity_Buy*price_Buy*fee_buy).toFixed(8);
        $('#form_Buy_exchange input[name="total_Buy"]').val(total_Buy);
    }

    if (parseFloat(total_Buy) > 0)
    {
        var quantity_Buy = (total_Buy/(price_Buy*1.0025)).toFixed(8);
        $('#form_Buy_exchange input[name="quantity_Buy"]').val(quantity_Buy);
    }
}

function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

function load_token(){
$.ajax({
    url: "/token_crt",
    data: {},
    type: "GET",
    beforeSend: function() {},
    error: function(data) {},
    success: function(data) {
        $('.token_crt').val(data.token);
        $('.btn-submit-exchain').removeAttr('disabled' ,'disabled');
    }
});
}
