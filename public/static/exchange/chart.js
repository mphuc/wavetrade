'use strict';



$(function() {
    var name_coin = $('#_NAMECOIN_').val();
    var exchange = $('#_EXCHANGE_').val();
});
var app = angular.module('myApp', ['ui.bootstrap'])
.filter('sumOfValue', function () {
    return function (data, key) {        
        if (angular.isUndefined(data) || angular.isUndefined(key))
            return 0;        
        var sum = 0;        
        angular.forEach(data,function(value){

            sum = sum + parseFloat(value[key]);
        });        
        return parseFloat((sum/100000000).toFixed(8));
    }
}).filter('slice', function() {
  return function(arr, start, end) {
    return (arr || []).slice(start, end);
  };
}).factory('socketio', ['$rootScope' , function ($rootScope) {
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
app.controller('CtrChart', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#_EXCHANGE_').val();
    $scope.data = []
    /*draw_chart([ [ 1524589451903000, 100, 101, 102, 103 ],
  [ 1524589454915000, 101, 102, 103, 104 ],
  [ 1524589457948000, 103, 102, 101, 100 ],
  [ 1524589460960000, 101, 102, 103, 105 ],
  [ 1524589463976000, 103, 102, 101, 100 ],
  [ 1524589466992000, 100, 100, 100, 100 ]
   ]
,exchange);  */
    socketio.on('Matching:push', (data_socket)=>{
        console.log(data_socket[1]);
        $scope.data  = data_socket[0];
        if (data_socket[1] == exchange)
        {
            draw_chart($scope.data,exchange);  
        }
    });
}]);


app.controller('CtrChartPie', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#_EXCHANGE_').val();
    $http({
        url: "/exchange/loadchartpie",
        dataType: "json",
        method: "POST",
        data: {'exchange' : exchange},
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }).success(function(response){    
        
        $scope.total_buy = response.total_buy == 0 ? 5 : response.total_buy;
        $scope.total_sell = response.total_sell == 0 ? 5 : response.total_sell;

        var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
        draw_chart_pie(data_chart);
        socketio.on('OrderBuy:save', (data)=>{
            
            if (data.MarketName == exchange)
            {
                $scope.total_buy = parseFloat(data.amount) + parseFloat($scope.total_buy);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart);
            }
        });

        socketio.on('OrderSell:save', (data)=>{
            if (data.MarketName == exchange)
            {
                $scope.total_sell = parseFloat(data.amount) + parseFloat($scope.total_sell);
                var data_chart =    [['Task', ''],
                            ['Buy',     $scope.total_buy],
                            ['Sell',      $scope.total_sell]];
                draw_chart_pie(data_chart);
            }
        });

        socketio.on('MatchingItem:push', (data)=>{
            
            if (data[1] == exchange)
            {
                $scope.total_buy =  5;
                $scope.total_sell =  5;
                draw_chart_pie(data_chart);
            }
            
        });

    })
}]);

app.controller('CtrCharPinItem', ['$scope','$http','socketio', function($scope,$http,socketio) {
    var exchange = $('#_EXCHANGE_').val();
    /*$http({
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
        
    })*/
    

    socketio.on('MatchingItem:push', (data)=>{ 
        // console.log(typeof data[0],data[0])
        $scope.items = new Array();
      

            //}
        if (typeof data[0] === 'string')
        {
            if (data[1] == exchange)
            {
                $scope.item_all = data[0].split(",");
                
                var yz = 0;
                for (var i = 0 ; i < $scope.item_all.length; i++) {
                    
                    yz ++;
                    if (typeof $scope.item_all[i] === 'string') {
                        
                        $scope.items[yz] = $scope.item_all[i];
                        
                    }
                }
                
            }
        
    }
            
    })
    
}]);

function draw_chart_pie(data_json)
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

    var chart = new google.visualization.PieChart(document.getElementById('piechart_3d'));
    chart.draw(data, options);
    }
}
function draw_chart(data_json,exchange)
{
    var data_temp =[];
    google.charts.load('current', {'packages':['corechart']});
    google.charts.setOnLoadCallback(drawChart);
    
    function drawChart() {
        /*for (var i = 0 ; i < data_json.length; i++) {
            data_temp.push([data_json[i][0],
                parseFloat(data_json[i][1]),
                parseFloat(data_json[i][2]),
                parseFloat(data_json[i][3]),
                parseFloat(data_json[i][4])
            ])
        }*/
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
            textStyle: {
                color: "dodgerblue"
            }
            },
            vAxis: {
                title: "Price "+exchange+"",
                titleTextStyle: {
                color: "dodgerblue"
            },
            textStyle: {
                color: "dodgerblue"
                }
            },
            chartArea: {
                left: 55,
                top: 10,
                bottom: 5,
                right: 50,
                width: "100%",
                height: "100%"
        }
    };
    var chart = new google.visualization.CandlestickChart(document.getElementById('chart_div'));
    chart.draw(data, options);
    }
}