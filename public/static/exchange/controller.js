'use strict';



$(function() {
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#_EXCHANGE_').val();
});

var app = angular.module('myApp', ['ui.bootstrap'])
.filter('formatNumber', function() {
  return function (input) {
    return formatNumber(input);
  };
})
.factory('socketio', ['$rootScope' , function ($rootScope) {

    var protocol = document.location.protocol;
    var host = document.location.host;
    var url = protocol + '//' + host;

    var socket = io.connect(url,{ 'forceNew': true });
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


app.controller('CtrBalanceUser', ['$scope','$http','socketio', function($scope,$http,socketio) {
    
    $scope.balance = '';

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

        $scope.balance = (response.balance).toFixed(2);
        
        socketio.on('OrderBuy:save', (data)=>{
            if (data.account_id == _id_) $scope.balance = (parseFloat($scope.balance) - parseFloat(data.amount)).toFixed(2);
        });
        socketio.on('OrderSell:save', (data)=>{
            if (data.account_id == _id_)  $scope.balance = (parseFloat($scope.balance) - parseFloat(data.amount)).toFixed(2);
        });

        socketio.on('Buy_Sell_Matchings', (data)=>{

        

        for (var i = 0; i < data[0].length; i++) {
            
            if (data[0][i].account_id == _id_) {
                if (data[0][i].type == 'Win')
                {
                    $scope.balance = (parseFloat($scope.balance) + parseFloat(data[0][i].amount) + parseFloat(data[0][i].amount)/0.96).toFixed(2);
                }  
            }
        }
    });
        
    })
}]);


app.controller('CtrCounDown', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#_EXCHANGE_').val();
    $scope.second = 29;
    $scope.type = 'order';
    //$scope.date_now = '';
    socketio.on('CounDown', (data)=>{
        if (localStorage.getItem("audio") == 'true')
        {
            var audio = new Audio('/bettick.mp3');
            audio.play();
        }
        //console.log(data.date);
        $scope.second = parseInt(data.second) < 10 ? '0'+parseInt(data.second) : parseInt(data.second);
        $scope.type = data.type;
        $scope.date_now = (data.date).split(" ")[1];
    });
}]);


app.controller('CtrMessage', ['$scope','$http','socketio', function($scope,$http,socketio) {
   
    var _id_ = $('#_ID_').val();
    socketio.on('Buy_Sell_Matchings', (data)=>{
    
        var buy_win = 0;
        var buy_lose = 0;
        var sell_win = 0;
        var sell_lose = 0;

        //console.log(data);

        for (var i = 0; i < data[0].length; i++) {       
            if (data[0][i].account_id == _id_) {
                if (data[0][i].awards == 'Buy')
                {
                    if (data[0][i].type == "Win")
                    {
                        buy_win += parseFloat(data[0][i].amount);
                    }
                    else
                    {
                        buy_lose += parseFloat(data[0][i].amount);
                    }
                }
                if (data[0][i].awards == 'Sell')
                {
                    if (data[0][i].type == "Win")
                    {
                        sell_win += parseFloat(data[0][i].amount);
                    }
                    else
                    {
                        sell_lose += parseFloat(data[0][i].amount);
                    }
                }
            }
        }
        var amount_total = parseFloat(buy_win) - parseFloat(buy_lose) + parseFloat(sell_win) - parseFloat(sell_lose);
        if (Math.abs(amount_total) > 0)
        {
            if (parseFloat(amount_total) > 0)
            {
                var message = 'You win '+parseFloat(amount_total).toFixed(2)+' '+data[1]+'';
                
                if (localStorage.getItem("audio") == 'true')
                {
                    var audio = new Audio('/win.mp3');
                    audio.play();
                }

                
                $('.noti-Result').show();
                $('.noti-Result .c-green-2').append('<p>'+message+'</p>');
                
            }
            else
            {
                var message = 'You lose '+parseFloat(amount_total).toFixed(2)+' '+data[1]+'';
                if (localStorage.getItem("audio") == 'true')
                {
                    var audio = new Audio('/lose.mp3');
                    audio.play();
                }
                $('.noti-Result').show();
                $('.noti-Result .c-green-2').append('<p>'+message+'</p>');
            }
        }
        setTimeout(function() {
            $('.noti-Result .c-green-2').html('');
            $('.noti-Result').hide();
        }, 2000);
    });
}]);


app.controller('CtrBuySellUser_One', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#exchange_one [name="MarketName"]').val();
    angular.element(document).ready(function () {
        socketio.emit('ChangeExchange',exchange);
    });
    $scope.sizes_coin = [
        ['Bitcoin','Bitcoin'],
        ['Ethereum','Ethereum'],
        ['Bitcoin Cash','Bitcoin Cash'],
        ['Ripple','Ripple'],
        ['Litecoin','Litecoin'],
        ['Cardano','Cardano'],
        ['IOTA','IOTA'],
        ['DASH','DASH']
    ];
    $scope.item_update = 'Bitcoin';
    $scope.currency = 'COIN';
    var _id_ = $('#_ID_').val();
    $scope.sum_order_buy = 0;
    $scope.sum_order_sell = 0;
    loadbuysell(exchange,$http,function(response)
    {  
        $scope.sum_order_buy = response.amount_buy;
        $scope.sum_order_sell = response.amount_sell;

        socketio.on('OrderBuy:save', (data)=>{
            exchange = $('#exchange_one [name="MarketName"]').val();
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_buy = parseFloat($scope.sum_order_buy) + parseFloat(data.amount);
        });

        socketio.on('OrderSell:save', (data)=>{
            exchange = $('#exchange_one [name="MarketName"]').val();
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_sell = parseFloat($scope.sum_order_sell) + parseFloat(data.amount);
        });

        
        socketio.on('Buy_Sell_Matchings', (data)=>{
            exchange = $('#exchange_one [name="MarketName"]').val();
            if (data[1] == exchange)
            {
                $scope.sum_order_buy = 0;
                $scope.sum_order_sell = 0;
            }
        });

        socketio.on('CounDown', (data)=>{
            if (data.type == 'matching')
            {
                $('#btn-buy-one ').attr("data-status",2);
                $('#btn-buy-one ').css({'opacity' : '0.3'});
                $('#btn-buy-tow ').css({'opacity' : '0.3'});
                $('#btn-sell-one ').css({'opacity' : '0.3'});
                $('#btn-sell-tow ').css({'opacity' : '0.3'});
                $('#btn-sell-one ').attr("data-status",2);
                $('#btn-buy-tow ').attr("data-status",2);
                $('#btn-sell-tow ').attr("data-status",2);
            }
            else
            {
                $('#btn-buy-one ').css({'opacity' : '1'});
                $('#btn-buy-tow ').css({'opacity' : '1'});
                $('#btn-sell-one ').css({'opacity' : '1'});
                $('#btn-sell-tow ').css({'opacity' : '1'});
                $('#btn-buy-one ').attr("data-status",1);
                $('#btn-sell-one ').attr("data-status",1);
                $('#btn-buy-tow ').attr("data-status",1);
                $('#btn-sell-tow ').attr("data-status",1);
            }
        });


        $scope.update_currency = function () {
            if ($scope.currency == 'FOREX')
            {
                $scope.item_update = 'EURUSD';
                socketio.emit('ChangeExchange','EURUSD');
                $('#exchange_one [name="MarketName"]').val('EURUSD');
                loadbuysell('EURUSD',$http,function(responses)
                {
                    $scope.sum_order_buy = responses.amount_buy;
                    $scope.sum_order_sell = responses.amount_sell;
                })
                $scope.sizes_coin = [
                    ['EURUSD','EURUSD'],
                    ['AUDUSD','AUDUSD'],
                    ['GBPUSD','GBPUSD'],
                    ['USDJPY','USDJPY'],
                    ['EURGBP','EURGBP'],
                    ['EURJPY','EURJPY'],
                    ['USDCAD','USDCAD'],
                    ['USDCHF','USDCHF']
                ];
            }
            else
            {
                $scope.item_update = 'Bitcoin';
                socketio.emit('ChangeExchange','Bitcoin');
                $('#exchange_one [name="MarketName"]').val('Bitcoin');
                loadbuysell('Bitcoin',$http,function(responses)
                {
                    $scope.sum_order_buy = responses.amount_buy;
                    $scope.sum_order_sell = responses.amount_sell;
                })
                $scope.sizes_coin = [
                    ['Bitcoin','Bitcoin'],
                    ['Ethereum','Ethereum'],
                    ['Bitcoin Cash','Bitcoin Cash'],
                    ['Ripple','Ripple'],
                    ['Litecoin','Litecoin'],
                    ['Cardano','Cardano'],
                    ['IOTA','IOTA'],
                    ['DASH','DASH']
                ];
            }
            
        }

        $scope.update_exchange = function () {
            $('#exchange_one [name="MarketName"]').val(''+$scope.item_update+'');
            loadbuysell($scope.item_update,$http,function(responses)
            {
                $scope.sum_order_buy = responses.amount_buy;
                $scope.sum_order_sell = responses.amount_sell;
            })
        }        
    })
}]);

app.controller('CtrBuySellUser_Tow', ['$scope','$http','socketio', function($scope,$http,socketio) {
    
    var exchange = $('#exchange_tow [name="MarketName"]').val();
    angular.element(document).ready(function () {
        socketio.emit('ChangeExchange',exchange);
    });
    $scope.sizes_coin = [
        ['EURUSD','EURUSD'],
        ['AUDUSD','AUDUSD'],
        ['GBPUSD','GBPUSD'],
        ['USDJPY','USDJPY'],
        ['EURGBP','EURGBP'],
        ['EURJPY','EURJPY'],
        ['USDCAD','USDCAD'],
        ['USDCHF','USDCHF']
    ];
    $scope.item_update = 'EURUSD';
    $scope.currency = 'FOREX';

    var _id_ = $('#_ID_').val();

    $scope.sum_order_buy = 0;
    $scope.sum_order_sell = 0;

    loadbuysell(exchange,$http,function(response)
    {   
        $scope.sum_order_buy = response.amount_buy;
        $scope.sum_order_sell = response.amount_sell;

        socketio.on('OrderBuy:save', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_buy = parseFloat($scope.sum_order_buy) + parseFloat(data.amount);
        });

        socketio.on('OrderSell:save', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();
            if (data.account_id == _id_ && data.MarketName == exchange) $scope.sum_order_sell = parseFloat($scope.sum_order_sell) + parseFloat(data.amount);
        });

        
        socketio.on('Buy_Sell_Matchings', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();
            if (data[1] == exchange)
            {
                $scope.sum_order_buy = 0;
                $scope.sum_order_sell = 0;
            }
        });

        socketio.on('CounDown', (data)=>{
            if (data.type == 'matching')
            {
                $('#btn-buy-one ').attr("data-status",2);
                $('#btn-buy-one ').css({'opacity' : '0.3'});
                $('#btn-buy-tow ').css({'opacity' : '0.3'});
                $('#btn-sell-one ').css({'opacity' : '0.3'});
                $('#btn-sell-tow ').css({'opacity' : '0.3'});
                $('#btn-sell-one ').attr("data-status",2);
                $('#btn-buy-tow ').attr("data-status",2);
                $('#btn-sell-tow ').attr("data-status",2);
            }
            else
            {
                $('#btn-buy-one ').css({'opacity' : '1'});
                $('#btn-buy-tow ').css({'opacity' : '1'});
                $('#btn-sell-one ').css({'opacity' : '1'});
                $('#btn-sell-tow ').css({'opacity' : '1'});
                $('#btn-buy-one ').attr("data-status",1);
                $('#btn-sell-one ').attr("data-status",1);
                $('#btn-buy-tow ').attr("data-status",1);
                $('#btn-sell-tow ').attr("data-status",1);
            }
        });


        $scope.update_currency = function () {
            if ($scope.currency == 'FOREX')
            {
                $scope.item_update = 'EURUSD';
                socketio.emit('ChangeExchange','EURUSD');
                $('#exchange_tow [name="MarketName"]').val('EURUSD');
                loadbuysell('EURUSD',$http,function(responses)
                {
                    $scope.sum_order_buy = responses.amount_buy;
                    $scope.sum_order_sell = responses.amount_sell;
                })
                $scope.sizes_coin = [
                    ['EURUSD','EURUSD'],
                    ['AUDUSD','AUDUSD'],
                    ['GBPUSD','GBPUSD'],
                    ['USDJPY','USDJPY'],
                    ['EURGBP','EURGBP'],
                    ['EURJPY','EURJPY'],
                    ['USDCAD','USDCAD'],
                    ['USDCHF','USDCHF']
                ];
            }
            else
            {
                $scope.item_update = 'Bitcoin';
                socketio.emit('ChangeExchange','Bitcoin');
                $('#exchange_tow [name="MarketName"]').val('Bitcoin');
                loadbuysell('Bitcoin',$http,function(responses)
                {
                    $scope.sum_order_buy = responses.amount_buy;
                    $scope.sum_order_sell = responses.amount_sell;
                })
                $scope.sizes_coin = [
                    ['Bitcoin','Bitcoin'],
                    ['Ethereum','Ethereum'],
                    ['Bitcoin Cash','Bitcoin Cash'],
                    ['Ripple','Ripple'],
                    ['Litecoin','Litecoin'],
                    ['Cardano','Cardano'],
                    ['IOTA','IOTA'],
                    ['DASH','DASH']
                ];
            }
            
        }

        $scope.update_exchange = function () {
            $('#exchange_tow [name="MarketName"]').val(''+$scope.item_update+'');
            loadbuysell($scope.item_update,$http,function(responses)
            {
                $scope.sum_order_buy = responses.amount_buy;
                $scope.sum_order_sell = responses.amount_sell;
            })
        }  

    })
}]);

app.controller('CandlestickChart-one', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#exchange_one [name="MarketName"]').val();
    $scope.data = []
    socketio.on('Matching:push', (data_socket)=>{
        $scope.data  = data_socket[0];
        exchange = $('#exchange_one [name="MarketName"]').val();
        if (data_socket[1] == exchange)
        {
            draw_chart($scope.data,exchange,'CandlestickChart_one');  
        }
    });
}]);

app.controller('CandlestickChart-tow', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#exchange_tow [name="MarketName"]').val();
    $scope.data = []
   
    socketio.on('Matching:push', (data_socket)=>{
        $scope.data  = data_socket[0];
        exchange = $('#exchange_tow [name="MarketName"]').val();
        if (data_socket[1] == exchange)
        {
            draw_chart($scope.data,exchange,'CandlestickChart_tow');  
        }
    });
}]);


app.controller('PieChart-one', ['$scope','$http','socketio', function($scope,$http,socketio) {
    $scope.total_buy = 1;
    $scope.total_sell = 1;
    var exchange = $('#exchange_one [name="MarketName"]').val();
    $http({
        url: "/exchange/loadchartpie",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        
        $scope.total_buy = response.total_buy == 0 ? 1 : response.total_buy;
        $scope.total_sell = response.total_sell == 0 ? 1 : response.total_sell;

        var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
        draw_chart_pie(data_chart,'piechart_3d_one');
        socketio.on('OrderBuy:save', (data)=>{
            exchange = $('#exchange_one [name="MarketName"]').val();

            if (data.MarketName == exchange)
            {
                $scope.total_buy = parseFloat(data.amount) + parseFloat($scope.total_buy);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart,'piechart_3d_one');
            }
        });

        socketio.on('OrderSell:save', (data)=>{
            exchange = $('#exchange_one [name="MarketName"]').val();
            if (data.MarketName == exchange)
            {
                $scope.total_sell = parseFloat(data.amount) + parseFloat($scope.total_sell);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart,'piechart_3d_one');
            }
        });

        socketio.on('MatchingItem:push', (data)=>{

            exchange = $('#exchange_one [name="MarketName"]').val();
            if (data[1] == exchange)
            {
                $scope.total_buy =  1;
                $scope.total_sell =  1;
                draw_chart_pie(data_chart,'piechart_3d_one');
            }
            
        });

    })
}]);


app.controller('PieChart-tow', ['$scope','$http','socketio', function($scope,$http,socketio) {
    $scope.total_buy = 1;
    $scope.total_sell = 1;
    var exchange = $('#exchange_tow [name="MarketName"]').val();
    $http({
        url: "/exchange/loadchartpie",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        
        $scope.total_buy = response.total_buy == 0 ? 1 : response.total_buy;
        $scope.total_sell = response.total_sell == 0 ? 1 : response.total_sell;

        var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
        draw_chart_pie(data_chart,'piechart_3d_tow');
        socketio.on('OrderBuy:save', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();
            if (data.MarketName == exchange)
            {
                $scope.total_buy = parseFloat(data.amount) + parseFloat($scope.total_buy);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart,'piechart_3d_tow');
            }
        });

        socketio.on('OrderSell:save', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();
            if (data.MarketName == exchange)
            {
                
                $scope.total_sell = parseFloat(data.amount) + parseFloat($scope.total_sell);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart,'piechart_3d_tow');
            }
        });

        socketio.on('MatchingItem:push', (data)=>{
            exchange = $('#exchange_tow [name="MarketName"]').val();

            if (data[1] == exchange)
            {
                $scope.total_buy =  1;
                $scope.total_sell =  1;
                draw_chart_pie(data_chart,'piechart_3d_tow');
            }
        });

    })
}]);


app.controller('CtrCharPinItem-one', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#exchange_one [name="MarketName"]').val();
    
    load_chart_item(exchange,$http,function(response){
        $scope.items  = response;
    })

    socketio.on('MatchingItem:push', (data)=>{ 
        exchange = $('#exchange_one [name="MarketName"]').val();
        if (data[1] == exchange)
        {

            $scope.items = data[0];
            
        }
    })

    socketio.on('MatchingItems:push', (data)=>{ 
        exchange = $('#exchange_one [name="MarketName"]').val();
        if (data[1] == exchange)
        {

            $scope.items = data[0];
            
        }
    })

    $('#change_exchange_one').on('change',function(){
        load_chart_item($('#change_exchange_one').val(),$http,function(response){
            $scope.items  = response;
        })
    })

    $('#change_curency_one').on('change',function(){
        if ($('#change_curency_one').val() == 'COIN')
        {
            load_chart_item('Bitcoin',$http,function(response){
                $scope.items  = response;
            })
        }
        else
        {
            load_chart_item('EURUSD',$http,function(response){
                $scope.items  = response;
            })
        }
    })

}]);

app.controller('CtrCharPinItem-tow', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#exchange_tow [name="MarketName"]').val();
    
    load_chart_item(exchange,$http,function(response){
        $scope.itemss  = response;
    })

    socketio.on('MatchingItem:push', (data)=>{ 
        exchange = $('#exchange_tow [name="MarketName"]').val();
        if (data[1] == exchange)
        {
            $scope.itemss = data[0];
            
        }
    })

    socketio.on('MatchingItems:push', (data)=>{ 
        exchange = $('#exchange_tow [name="MarketName"]').val();
        if (data[1] == exchange)
        {
            $scope.itemss = data[0];
            
        }
    })

    $('#change_exchange_tow').on('change',function(){
        load_chart_item($('#change_exchange_tow').val(),$http,function(response){
            $scope.itemss  = response;
        })
    })

    $('#change_curency_tow').on('change',function(){
        if ($('#change_curency_tow').val() == 'COIN')
        {
            load_chart_item('Bitcoin',$http,function(response){
                $scope.itemss  = response;
            })
        }
        else
        {
            load_chart_item('EURUSD',$http,function(response){
                $scope.itemss  = response;
            })
        }
    })
}]);

function draw_chart_pie(data_json,ElementById)
{
    google.charts.load("current", {packages:["corechart"]});
    google.charts.setOnLoadCallback(drawChart);
    function drawChart() {
    var data = google.visualization.arrayToDataTable(data_json);

    var options = {
            backgroundColor: "transparent",
            legend: "none",
            title: "",
            is3D: !0,
            slices: {
                1: {
                    color: "red"
                },
                0: {
                    color: "green"
                }
            },
            chartArea: {
                left: 5,
                top: 0,
                right : 5,
                bottom: 0,
                width: "100%",
                height: "100%"
            },
            height: 200
        };

    var chart = new google.visualization.PieChart(document.getElementById(ElementById));
    chart.draw(data, options);
    }
}
function draw_chart(data_json,exchange,ElementById)
{   

    var data_temp =[];
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);


    if (ElementById == 'CandlestickChart_one')
    {

        $('#exchange_one .colum-last-chartss').html('<span>'+data_json[14][1]+'</span> - <span>'+data_json[14][2]+'</span> - <span>'+data_json[14][3]+'</span> - <span>'+data_json[14][4]+'</span>');
    }
    else
    {
        $('#exchange_tow .colum-last-chartss').html('<span>'+data_json[14][1]+'</span> - <span>'+data_json[14][2]+'</span> - <span>'+data_json[14][3]+'</span> - <span>'+data_json[14][4]+'</span>');
    }
    
   
    function drawChart() {
        var data = google.visualization.arrayToDataTable(data_json, true);

        var options = {
            backgroundColor: "transparent",
            legend: "none",
            candlestick: {
                hollowIsRising: !0,
                fallingColor: {
                strokeWidth: 0,
                fill: "red",
                color: "red",
                stroke: "red"
            },
            risingColor: {
                strokeWidth: 0,
                fill: "green",
                color: "green",
                stroke: "green"
                }
            },

            hAxis: {
                title: "",
                titleTextStyle: {
                color: "dodgerblue"

            },
                gridlines: {color: 'none'},
                
            textStyle: {
                color: "dodgerblue"
            }
            },
            vAxis: {
                title: "Price "+exchange+"",
                titleTextStyle: {
                color: "dodgerblue",

                },

                textStyle: {
                    color: "dodgerblue"
                    }
            },
            
            chartArea: {
                left: 55,
                top: 10,
                bottom: 5,
                right: 0,
                width: "100%",
                height: "100%"
        }
    };
    var chart = new google.visualization.CandlestickChart(document.getElementById(ElementById));
    chart.draw(data, options);
    }
}


$('#broker-tow').on('change',function(){
    if ($(this).val() == 'COIN')
    {
        $('#symbol-tow').html('');
        $("#symbol-tow").append('<option value=1>Bitcoin</option><option value=2>Ethereum</option><option value=3>Bitcoin Cash</option><option value=4>Ripple</option><option value=5>Litecoin</option><option value=6>IOTA</option><option value=7>NEM</option><option value=8>Dash</option>');
        change_exchange('tow','BTC');
    }
    if ($(this).val() == 'FOREX')
    {
        $('#symbol-tow').html('');
        $("#symbol-tow").append('<option value="EURUSD">EURUSD</option> <option value="AUDUSD">AUDUSD</option> <option value="GBPUSD">GBPUSD</option> <option value="USDJPY">USDJPY</option> <option value="EURGBP">EURGBP</option> <option value="EURJPY">EURJPY</option> <option value="USDCAD">USDCAD</option> <option value="USDCHF">USDCHF</option> <option value="DIAMOND">DIAMOND</option>');
        change_exchange('tow','EURUSD');
    }
})

function change_exchange(position,exchange)
{
    /*$('#CandlestickChart_'+position).html('Loading...');
    $('#piechart_3d_'+position).html('Loading...');
    $('#exchange_'+position+' [name="MarketName"]').val(''+exchange+'');*/



}
function load_chart_item(MarketName,$http,callback)
{
    $http({
        url: "/exchange/get-chart-item/"+MarketName,
        dataType: "json",
        method: "GET",
        data: {},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){  
        callback(response)
    })
}
function loadbuysell(MarketName,$http,callback)
{
    $http({
        url: "/exchange/loadbuysell",
        dataType: "json",
        method: "POST",
        data: {'exchange' : MarketName},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){
        callback(response)
    })
}
    

$('#symbol-one').on('change',function(){
    change_exchange('one',$('#symbol-one').val());
});

$('#symbol-tow').on('change',function(){
    change_exchange('tow',$('#symbol-tow').val());
});


function formatusd(amount) {
  if (amount) {
    return parseFloat(amount).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
  } else return 0;
}

function formatNumber(nStr)
{
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}