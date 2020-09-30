'user strict';
const express = require('express')
var app = express()
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

var sql = require('mysql');

//local mysql db connection
var mc = sql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'dailytask'
});

mc.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const accessTokenSecret = 'accesstokensecret';

var users = [];


mc.query(`select name, password from users `, (err, data) => {             
  users = data.map(item => ({
    username: item.name,
    password: item.password
  }))
});


const authenticateJWT = (req, res, next) => { // jwt middleware
  const authHeader = req.headers.authorization;
  if (authHeader) {
      const token = authHeader.split(' ')[1];

      jwt.verify(token, accessTokenSecret, (err, user) => {
          if (err) {
              return res.sendStatus(403);
          }
          req.user = user;
          next();
      });
  } else {
      res.sendStatus(401);
  }
};
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/frontend/index.html'));
});

app.post('/login', (req, res) => { // login

  const { username, password } = req.body;

  const user = users.find(u => { return u.username === username && u.password === password });

  if (user) {
      const accessToken = jwt.sign({ username: user.username,  password: user.password }, accessTokenSecret);
    res.json({token: accessToken});
  } else {
      res.status(400).send('Username or password incorrect');
  }
});


app.get('/logout', (req, res) => {

  accessToken = null;
  res.send('Log out is success');
});

app.put('/tasks', authenticateJWT, function (req, res) { // update a task
  
  const {username, password} = req.user;
  var id;
  const {title, date, status} = req.body;

  mc.query(`select id from users where name = "${username}" and password = "${password}" `, (err, data) => {     
    id = data[0].id;
    mc.query(`update data set status = '${status}' where title = "${title}" and date = "${date}" and user_id = "${id}" `, (err, data) => {           
      if(err) {
          res.send(err);
      }
      else{
        res.send('success');
      }
    });
  });


})

app.post('/tasks', authenticateJWT, function (req, res) { // insert a task

  const {username, password} = req.user;
  var id;
  const {title, date} = req.body;

  mc.query(`select id from users where name = "${username}" and password = "${password}" `, (err, data) => {     
    id = data[0].id;
    mc.query(`insert into data (title, date, status, user_id) values ('${title}', '${date}', '0', '${id}') `, (err, datas) => {           
      if(err) {
          res.send(err);
      }
      else{
        res.send('success');
      }
    });
  });
})


app.get('/tasks',authenticateJWT,  function (req, res) { // get tasks by date
  const {username, password} = req.user;
  const {date} = req.query;
  var id;
  mc.query(`select id from users where name = "${username}" and password = "${password}" `, (err, data) => {     
    id = data[0].id;
    mc.query(`select title, status from data where date = "${date}" and user_id = "${id}" `, (err, datas) => {           
      if(err) {
          res.send(err);
      }
      else{
          var total = [];
          total = datas.map(item => ({
            title: item.title,
            status: item.status
          }))
          res.json(total);
      }
    });
  })
});

app.listen(3000);