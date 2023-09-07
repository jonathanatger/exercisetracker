const express = require('express')
const app = express()
const cors = require('cors')
const Database = require("@replit/database")
const bodyParser = require('body-parser')
require('dotenv').config()
const postgres = require('postgres');


//PSQL
let URL = `postgres://jonathanatger:LMDr3B8AnuqE@ep-long-truth-00983597.eu-central-1.aws.neon.tech/neondb`

const sql = postgres(URL, { ssl: 'require' });

//middleware
app.use(cors())
app.use(express.static('public'));
app.use(express.urlencoded(true));



//Create a new user
app.post("/api/users", async (req, res) => {
  let usern = req.body.username;
  let ret;

  const ins = await sql`insert into users(username) values(${usern})`

  let name = await sql`SELECT * FROM users WHERE username = ${usern}`;

  ret = {
    username: name[0].username,
    _id: name[0]._id
  }


  res.send(ret);

})



//Get all users
app.get("/api/users", async (req, res) => {

  let users = await sql`SELECT username, _id FROM users`;

  res.send(users);

})

//Create a new exercise
app.post('/api/users/:id/exercises', async (req, res) => {
  let body = req.body;
  let params = req.params;

  let __id = params.id;

  let _description = body.description;
  let _raw_duration = body.duration;
  let _date = body.date;
  let _formatted_date;
  let _username;

  //Clean data
  if (_date == '' || _date === undefined) {
    let dateObj = new Date();
    _formatted_date = dateObj.toDateString();
    
    let year = dateObj.getFullYear().toString(); 
    let month = (dateObj.getMonth() + 1).toString();
    let day = dateObj.getDate().toString();
    
    if(month.length < 2){ month = '0' + month }
    if(day.length < 2){ day = '0' + day }
    
    _date = year + "-" + month + "-" + day;    
    
  } else {
    
    let dateStr = _date.split('-')
    //_date = dateObj.toDateString();    
    dateObj = new Date();
    dateObj.setFullYear(Number(dateStr[0]));
    dateObj.setMonth(Number(dateStr[1]) - 1);
    dateObj.setDate(Number(dateStr[1]));   
    
    _formatted_date = dateObj.toDateString();
  }      

  //duration
  let _duration;
  try {
    _duration = Number(_raw_duration);
  } catch {
    _duration = 0;
  }

  if (__id === undefined) {
    __id = "";
  }

  if (__id != "") {

    let query;

    try {
      query = await sql`SELECT username FROM users WHERE _id = ${__id}`;
    }
    catch {
      query = [];
    }

    if (query.length != 0) {
      _username = query[0].username;
    } else {
      _username = "";
    }

  } else {
    _username = "";
  }

  //Create exercise in DB
  const ins = await sql`insert into exercises 
  (date, formatted_date, description, duration, user_id, username ) 
  values(${_date}, ${_formatted_date}, ${_description}, ${_duration}, ${__id}, ${_username})`

  //Retrieve exercises
  let ret = {
    username: _username,
    description: _description,
    duration: _duration,
    date: _formatted_date,
    _id: __id
  }

  res.send(ret);

});



app.get('/api/users/:id/logs', async (req, res) => {
  let params = req.params;
  let body = req.body;

  let __id = params.id;
  let _from = req.query.from;
  let _to = req.query.to;
  let _limit = req.query.limit;  

  if (__id === undefined) {
    __id = "";
  }

  let ret = await retrieveExercises(__id, _from, _to, _limit);

  res.send(ret);
});




app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})





//Function to get all exercises related to a single user
async function retrieveExercises(_id, _from, _to, _limit) {
  
  // query exercises  
  let exes;

  if(_limit === undefined){_limit = 1000}
  
  if(_from === undefined && _to === undefined){    
    exes = await sql`select description, duration, formatted_date from exercises where user_id = ${_id} limit ${_limit}`;
    console.log(1)
  } else if (_to === undefined) {
    exes = await sql`select description, duration, formatted_date from exercises where user_id = ${_id} and date > ${_from}`;
    console.log(2)
    
  } else if (_from === undefined){
    exes = await sql`select description, duration, formatted_date from exercises where user_id = ${_id} and date < ${_to}`; 
    console.log(3)
    
  } else {
    exes = await sql`select description, duration, formatted_date from exercises where user_id = ${_id} and date > ${_from} and date < ${_to}`;
    console.log(4)
  
  }
  


  //query username
  let _username;

  try {
    let _query_username = await sql`select username from users where _id = ${_id}`;
    _username = _query_username[0].username;
  } catch {
    _username = '';
  }


  //convert result to array
  let exeArr = (exes) => {
    let array = [];
    for (let e of exes) {
      e.date = e.formatted_date;
      delete e.formatted_date;
      array.push(e);
    }
    return array;
  };

  

  let exeObj = exeArr(exes);
  let _count = exeObj.length;

  let ret = {
    username: _username,
    count: _count,
    _id: _id,
    log: exeObj
  }

  return ret;

}

