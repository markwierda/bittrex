const bittrex = require('node-bittrex-api');
const Coinmarketcap = require('coinmarketcap-api');
const mysql = require('mysql');
const coinmarketcap = new Coinmarketcap('API_KEY');
const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'markwierda.nl'
});

bittrex.options({
    'apikey': 'API_KEY',
    'apisecret': 'API_SECRET'
});

bittrex.getbalances((bittrex, err) => {
   if (err)
       console.error(err);

   if (bittrex) {
       connection.connect();

       const coins = ['ADA', 'BAT', 'BTC', 'DAI', 'DGB', 'ETH', 'EOS', 'LTC', 'RDD', 'USDT', 'XLM', 'XRP'];
       let count = 0;

       bittrex.result.forEach(coin => {
           if (coins.indexOf(coin.Currency) > -1) {
               coinmarketcap.getQuotes({symbol: coin.Currency, convert: 'EUR'}).then(coinmarketData => {
                   if (coinmarketData.status.error_code === 200) {
                       coinmarketData = coinmarketData.data[coin.Currency];

                       if (coinmarketData.name === 'XRP')
                           coinmarketData.name = 'Ripple';

                       connection.query('SELECT bought_for, highest_profit, lowest_profit FROM cryptocurrencies WHERE name = ?', coinmarketData.name, (err, res) => {
                           if (err)
                               console.error(err.toString());

                           if (res) {
                               res = res[0];

                               if (res !== undefined) {
                                   let bought_for = res.bought_for;
                                   let price = coin.Balance * coinmarketData.quote['EUR'].price;
                                   let profit = price - bought_for;
                                   let highest_profit = res.highest_profit;
                                   let lowest_profit = res.lowest_profit;

                                   if (profit > highest_profit)
                                       highest_profit = profit;

                                   if (profit < lowest_profit)
                                       lowest_profit = profit;

                                   let query = 'UPDATE cryptocurrencies SET amount = ?, price = ?, profit = ?, highest_profit = ?, lowest_profit = ?, ' +
                                       'difference_1h = ?, difference_24h = ?, difference_7d = ?, updated_at = ? WHERE name = ? AND active = 1';
                                   let data = [coin.Balance, price, profit, highest_profit, lowest_profit, coinmarketData.quote['EUR'].percent_change_1h, coinmarketData.quote['EUR'].percent_change_24h, coinmarketData.quote['EUR'].percent_change_7d, new Date(), coinmarketData.name];

                                   connection.query(query, data, (err, res) => {
                                       if (err)
                                           console.error(err.toString());
                                   });
                               }
                           }
                       });
                   } else {
                       console.error(coinmarketData.status.error_message); 
                   }
               }).catch(console.error.toString());
           }

           count++;
           if (count === Object.keys(coins).length) {
               connection.query('UPDATE cryptocurrencies SET error = ?', [null], (err, res) => {
                   if (err)
                       console.error(err.toString());
                });

               connection.end();
           }
       });
   }
});
