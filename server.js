require('dotenv').config();
const express = require ("express");
const morgan = require('morgan');
const cors = require ("cors");

const PORT = process.env.PORT || 8080;
const app = express()
const pool = require('./db/database');
pool.query('SELECT NOW()')
  .then(res => console.log('Database connected:', res.rows[0].now))
  .catch(err => console.error('Database connection error:', err));






app.set('view engine', 'ejs');
app.use(express.urlencoded ({extended:true}));
app.use(express.static('public'));
app.use(express.json())
app.use(morgan('dev'));
app.use(cors());

app.get('/', (req, res) =>{
  res.render('index');
})


app.listen(PORT, () => {
  console.log(`listening on port${PORT}`)
})