const bittrex = require('node-bittrex-api');
const Coinmarketcap = require('node-coinmarketcap-api');
const mysql = require('mysql');
const coinmarketcap = new Coinmarketcap();
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

       let count = 0;

       bittrex.result.forEach(coin => {
           const coins = {
               'ADA': {'name': 'Cardano'},
               'BAT': {'name': 'Basic Attention Token'},
               'BTC': {'name': 'Bitcoin'},
               'DGB': {'name': 'DigiByte'},
               'ETH': {'name': 'Ethereum'},
               'LTC': {'name': 'Litecoin'},
               'RDD': {'name': 'ReddCoin'},
               'USDT': {'name': 'Tether'},
               'XLM': {'name': 'Stellar'},
               'XRP': {'name': 'Ripple'}
           };

           if (coins[coin.Currency]) {
               let fullname = coins[coin.Currency].name;

               (async () => {
                   await coinmarketcap.ticker(fullname.replace(/ /g, '-'), 'EUR').then(coinmarketcap => {
                       coinmarketcap = coinmarketcap[0];

                       connection.query('SELECT bought_for, highest_profit, lowest_profit FROM cryptocurrencies WHERE name = ?', [fullname], (err, res) => {
                          if (err)
                              console.error(err);

                          if (res) {
                              res = res[0];

                              let bought_for = res.bought_for;
                              let price = coin.Balance * coinmarketcap.price_eur;
                              let profit = price - bought_for;
                              let highest_profit = res.highest_profit;
                              let lowest_profit = res.lowest_profit;

                              if (profit > highest_profit)
                                  highest_profit = profit;

                              if (profit < lowest_profit)
                                  lowest_profit = profit;

                              let query = 'UPDATE cryptocurrencies SET amount = ?, price = ?, profit = ?, highest_profit = ?, lowest_profit = ?, ' +
                                  'difference_1h = ?, difference_24h = ?, difference_7d = ?, updated_at = ? WHERE name = ? AND active = 1';
                              let data = [coin.Balance, price, profit, highest_profit, lowest_profit, coinmarketcap.percent_change_1h, coinmarketcap.percent_change_24h, coinmarketcap.percent_change_7d, new Date(), fullname];

                              connection.query(query, data, (err, res) => {
                                  if (err)
                                      console.error(err);

                                  count++;

                                  if (count === Object.keys(coins).length)
                                      connection.end();
                              });
                          }
                       });
                   });
               })();
           }
       });
   }
});
