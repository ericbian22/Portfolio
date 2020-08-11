require('dotenv').config();
const express=require("express");
const app=express();
const bodyParser=require("body-parser");
const https=require("https");
const ejs=require("ejs");
const request=require("request");
const mongoose=require("mongoose");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

//////////////////////////////////////////////////////////////////Main Home Page////////////////////////////////////////////////////////////
app.route("/")
.get((req,res)=>{
  res.render("index");

});

//////////////////////////////////////////////////////////////////API Page//////////////////////////////////////////////////////////////////
app.route("/API")
.get((req,res)=>{
  res.render("apiMainpage");

});

app.route("/API/Weather")
.get((req,res)=>{
  res.render("weatherRequest");
})
.post((req,res)=>{
  var query=req.body.cityName;
  const apiKey=process.env.OPENWEATHER_APIKEY;
  const unit="metric"
  const url="https://api.openweathermap.org/data/2.5/weather?q="+query+"&appid="+apiKey+"&units="+unit;
  https.get(url,function(response){
    response.on("data",function(data){
    const weatherData=JSON.parse(data);
    var temp=weatherData.main.temp;
    var describtion=weatherData.weather[0].description;
    var icon=weatherData.weather[0].icon;
    var imgURL="http://openweathermap.org/img/wn/"+icon+"@2x.png";
    query=query.charAt(0).toUpperCase()+query.slice(1,query.length);
  res.render("weatherReceived",{describtion:describtion,temp:temp, icon:icon,imgURL:imgURL,cityname:query});

    });
  });
});


app.route("/API/Nasa-Image")
.get((req,res)=>{
  var url="https://api.nasa.gov/planetary/apod?api_key="+process.env.NASA_APIKEY;
https.get(url,function(response){
  response.on("data",function(data){
    var nasa=JSON.parse(data);
    var imgUrl=nasa.hdurl;
  res.render("nasaImage",{img:imgUrl});
});
});
});
//////////////////////////////////////////////////////////////////Calculator Page//////////////////////////////////////////////////////////////////
































app.listen(3005,function(){
  console.log("Server is running on port 3005");
});
