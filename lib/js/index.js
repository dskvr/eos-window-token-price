var Web3 = require('web3'), web3, start_pos = 0, num_windows = 30, max_num_windows = 341, loading_percentage = 0, loop_buffer=100, usd_per_eth, Contract, EOSCrowdsale, window_today;

var iterator_timeout, iterator_pause, iterator_pause_length = 0, iterator_position = 0;

var eos_sale = {}
  eos_sale.init = function(){
    dom_state.run();
    dom_state.loading();
    $.getJSON('//api.etherscan.io/api?module=contract&action=getabi&address=0xd0a6e6c54dbc68db5db3a091b171a77407ff7ccf', function (data) {
    var contractABI = "";
    contractABI = JSON.parse(data.result);
    if (contractABI != ''){
      Contract = web3.eth.contract(contractABI);
      EOSCrowdsale = Contract.at("0xd0a6e6c54dbc68db5db3a091b171a77407ff7ccf");
      window_today = EOSCrowdsale.today();
      // get current price of ETH
      $.getJSON('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD', function(price) {
        usd_per_eth = price.USD;
        display_eth_price();
        iterator_start();
      });
    } else {
      // console.log("Error" );
    }
  });
  }
  eos_sale.incompatible = function(){
    $('body').addClass('incompatible');
  }

var query_contract = function(eos, pos){
  var     result = {};
      result.daily_totals = eos.dailyTotals(pos);
      result.eos_in_window = eos.createOnDay(pos)/1000000000000000000;
  return  result;
}

var factory = function(pos){
  var query;
  // console.log(pos);
  var formatted_result = formatResult(pos,window_today);
  jQuery("#results").append(formatted_result);
  loadingStatus(pos, num_windows);
}

var iterator_start = function(){
  iterator();
}

var iterator = function(stop){
  if(iterator_position > num_windows) {
    $('body').addClass('results');
    dom_state.complete();
    return;
  }
  var pause = function(){
    iterator_timeout = setTimeout(function(){
      iterator_position++;
      iterator();
    }, iterator_pause_length)
  }
  factory(iterator_position);
  pause();
}

var dom_state = {};
  dom_state.run = function(){ $('body').addClass('run');  }
  dom_state.set = function(){ $('body').removeClass('run'); }
  dom_state.loading = function(){ $('body').addClass('loading'); $('body form input[type=submit]').attr('disabled', true) }
  dom_state.complete = function(){ $('body').removeClass('loading'); $('body form input[type=submit]').attr('disabled', false) }

var sleep = function(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
  if ((new Date().getTime() - start) > milliseconds){
    break;
  }
  }
}

var loadingStatus = function(cur, total){
  var percent = Math.round(cur/total*100);
  $('.loader .status').text(percent+"%");
  $('.loader .bar').css({width: percent+"%"});
}

var display_eth_price = function(){
  $('.eth-price .eth-usd-rate .value').html("$"+usd_per_eth);
  $('body').addClass('price-discovered');
}

function formatResult(day,today)
{
  var query = query_contract(EOSCrowdsale, day);
  var divisor = 1000000000000000000;
  var results = '';
  var eth_contributed = (query.daily_totals/divisor);
  var eos_string = eth_contributed.toFixed(2)+'';
  // eos_string = eos_string.padStart(20,'.');
  // results = results.padStart(20,'&nbsp;');
  var eos_per_window = query.eos_in_window;
  var eth_per_eos = eth_contributed / eos_per_window;
  var usd_total = eth_contributed * usd_per_eth;
  var usd_per_eos = usd_total / eos_per_window;

  var window_passed = (day < today) ? true : false;
  var is_today = (day == today) ? true : false;
  //
  var tr_class;
  tr_class = (window_passed) ? "window-closed" : "window-open";
  tr_class = (is_today) ? " is-today" : tr_class;
  //
  results += '<tr class="'+tr_class+'">';
  results += '<td class="day">'+day+'</span>';
  results += '<td class="available">'+eos_per_window+'</span>';
  results += '<td class="contributed">'+eos_string+'</td>';
  results += '<td class="rate"><span class="rate usd">$' + usd_per_eos.toFixed(6) + '</span><span class="rate eth">'+eth_per_eos.toFixed(6)+'</span></td>';
  results += '</tr>';
  return results;
}

function reset_results(){
  jQuery("#results").html('');
  $('body').removeClass('results');
  iterator_position = 0;
}

/* console shim*/
(function () {
  var f = function () {};
  if (!window.console) {
    window.console = {
      log:f, info:f, warn:f, debug:f, error:f
    };
  }
}());

// ADD YOUR KEY HERE (get one via https://infura.io/register.html )
var node, nodeTO;

$(function(){    
  var cookie = Cookies.getJSON('eostracker');

  if(typeof cookie == "object") {
    $('form').find('input.node').val(cookie.node);
    $('form').find('input.days-to-check').val(cookie.days).focus();
  } else {
    setTimeout(function(){$('input.node:first').focus();},100);
  }

  $('#set-node').submit(function(e){
    e.preventDefault();
    reset_results();
    //
    var node = $(this).find('input.node').val();
    var iterator_position = $(this).find('input.start-from').val();    
    var days = $(this).find('input.days-to-check').val();
    //
    if(!iterator_position){
      $(this).find('input.start-from').attr('value', start_pos);
      iterator_position = start_pos;
    }    
    if(!days){
      $(this).find('input.days-to-check').attr('value', num_windows);
      days = num_windows;
    }
    if(days > max_num_windows) {
      days = max_num_windows;
      $(this).find('input.days-to-check').attr('value', max_num_windows);
    }
    if(iterator_position+days>max_num_windows){
      $(this).find('input.start-from').attr('value', max_num_windows);
      iterator_position = max_num_windows-days;
    }    
    //
    Cookies.set('eostracker', {'node':node.trim(),'days':days.trim()});
    //
    num_windows = days;
    // console.log(num_windows);
    web3 = new Web3(new Web3.providers.HttpProvider(node));
    eos_sale.init();
    

    return false;
  });

  $('table tr a.rate').on('click', function(){
    switch( $(this).text() ){
      case "USD":
        $('body').removeClass('rate-eth').addClass('rate-usd');
        break;
      case "ETH":
        $('body').removeClass('rate-usd').addClass('rate-eth');
        break;
    }
  });
});
