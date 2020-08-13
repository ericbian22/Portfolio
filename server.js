require('dotenv').config();
const express=require("express");
const app=express();
const bodyParser=require("body-parser");
const https=require("https");
const ejs=require("ejs");
const request=require("request");
const mongoose=require("mongoose");
const _=require("lodash");
const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

//////////////////////////////////////////////////////////////////Authentication setting////////////////////////////////////////////////////
app.use(session({
  secret:"The EB String",
  resave:false,
  saveUninitialized:false
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  
  mongoose.connect(process.env.DBKEY, {useNewUrlParser: true, useUnifiedTopology: true});
  mongoose.set("useCreateIndex",true);
  mongoose.set('useFindAndModify', false);

  const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    username:String,
    provider:String,
    secret:String
  });
  
  userSchema.plugin(passportLocalMongoose);
  
  userSchema.plugin(findOrCreate);
  const User=mongoose.model("User",userSchema);
  
  passport.use(User.createStrategy());
  
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new GoogleStrategy({
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3005/auth/google/Welcome",
      userProfile: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
      var data={
        members:[{
          email_address:profile._json.email,
          status:"subscribed"
        }]
     
     
      };
      var jsondata=JSON.stringify(data);
      const url="https://us17.api.mailchimp.com/3.0/lists/"+process.env.MAILCHIMP_LIST;
      const options={
        hostname:"us17.api.mailchimp.com",
        path:"/3.0/lists/"+process.env.MAILCHIMP_LIST,
        method:"POST",
        auth:"Eric1:"+process.env.MAILCHIMP_APIKEY
      }
     
     
     const request= https.request(options,function(response){
     response.on("data",function(data){
     });
     });
      request.write(jsondata);
      request.end();
      User.findOrCreate({ username: profile.id}, {provider: "google", email:profile._json.email},function (err, user) {
  
        return cb(err, user);
      });
    }
  ));
  
  passport.use(new FacebookStrategy({
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: "http://localhost:3005/auth/facebook/Welcome",
          profileFields: ["id", "email"],
          authType: 'reauthenticate'
      },
      function (accessToken, refreshToken, profile, cb) {
        var data={
          members:[{
            email_address:profile._json.email,
            status:"subscribed"
          }]
       
       
        };
        var jsondata=JSON.stringify(data);
        const url="https://us17.api.mailchimp.com/3.0/lists/"+process.env.MAILCHIMP_LIST;
        const options={
          hostname:"us17.api.mailchimp.com",
          path:"/3.0/lists/"+process.env.MAILCHIMP_LIST,
          method:"POST",
          auth:"Eric1:"+process.env.MAILCHIMP_APIKEY
        }
       
       
       const request= https.request(options,function(response){
       response.on("data",function(data){
       });
       });
        request.write(jsondata);
        request.end();
          User.findOrCreate({ username: profile.id },{provider: "facebook",email: profile._json.email},function (err, user) {
              return cb(err, user);
            }
          );
      }
  ));
  
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
//////////////////////////////////////////////////////////////////Calculator Page///////////////////////////////////////////////////////////////////

app.route("/Calculator")
.get((req,res)=>{
  res.render("calculator");
});

//////////////////////////////////////////////////////////////////login///////////////////////////////////////////////////////////////////
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

  app.get('/auth/google/Welcome',
    passport.authenticate('google', { failureRedirect: '/Login' }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect('/Welcome');
    });

    app.get("/auth/facebook",
        passport.authenticate("facebook", {scope: ["email"]}));

        app.get('/auth/facebook/Welcome',
          passport.authenticate('facebook', { failureRedirect: '/Login' }),
          function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/Welcome');
          });

app.route("/Login")
.get((req,res)=>{
  res.render("login");
})
.post(function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user,function(err){
    if(err){
      res.redirect("/Login");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/Welcome");
      });
    }
  });
  });

app.route("/Register")
.get((req,res)=>{
  res.render("register");
}).post(function(req,res){

  

 var data={
   members:[{
     email_address:req.body.username,
     status:"subscribed"
   }]


 };
 var jsondata=JSON.stringify(data);
 const url="https://us17.api.mailchimp.com/3.0/lists/"+process.env.MAILCHIMP_LIST;
 const options={
   hostname:"us17.api.mailchimp.com",
   path:"/3.0/lists/"+process.env.MAILCHIMP_LIST,
   method:"POST",
   auth:"Eric1:"+process.env.MAILCHIMP_APIKEY
 }


const request= https.request(options,function(response){
response.on("data",function(data){
});
});
 request.write(jsondata);
 request.end();




  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/Register");
    }else{
      passport.authenticate("local")(req,res,function(){
        User.updateOne({_id:user._id},{$set:{provider:"local",email:req.body.username}},function(err){
          if(!err){
              res.redirect("/Welcome");
          }
        });
      });
    }
  });
  });


  app.route("/Welcome")
.get(function(req,res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function(err,foundUser){
        res.render("Welcome",{useremail:foundUser.email});
    });

  }else{
    res.redirect("/Login");
  }
});

app.get("/Logout",function(req,res){
  req.session.destroy(function(e){
    req.logout();
    res.redirect('/');
});
});

//////////////////////////////////////////////////////////////////////Blog/////////////////////////////////////////////////////////////////////
const blogItemSchema=new mongoose.Schema({
  title:String,
  content:String
});
const BlogItem=mongoose.model("BlogItem",blogItemSchema);
const blogSchema=new mongoose.Schema({
  _id:String,
  blogs:[blogItemSchema]
});

const Blog=mongoose.model("Blog",blogSchema);
const item=BlogItem({
title:"Blog",
content:"Welcome to your personal blog!"
});
app.route("/Blog")
.get((req,res)=>{
  if(req.isAuthenticated()){
  Blog.findOne({_id:req.user.id},function(err,foundBlog){    
   if(!foundBlog){
      const blog=new Blog({
        _id:req.user.id,
        blogs:[item]
      });
    blog.save();
    res.redirect("/Blog");
    }else if(foundBlog.blogs.length===0){
      foundBlog.blogs.push(item);
      foundBlog.save();
      res.redirect("/Blog");
    }else{
      res.render("blog",{blogs:foundBlog.blogs});
    }
  });
 
  
  }else{
  res.redirect("/Login");
}
});

app.route("/Compose")
.get((req,res)=>{
  if(req.isAuthenticated()){
   res.render("compose");
  }else{
    res.redirect("/Login");
  }
})
.post((req,res)=>{
  const useritem=new BlogItem({
      title:req.body.postTitle,
      content:req.body.postBody
  });
Blog.findOneAndUpdate({_id:req.user.id},{$push:{blogs:useritem}},function(err,foundBlog){
      res.redirect("/Blog");
});
});

app.get("/Blog/:postId",function(req,res){
  if(req.isAuthenticated()){
  var requestedPostId=req.params.postId;
  Blog.findOne({_id:req.user.id},function(err,foundBlog){
    var blog=foundBlog.blogs.id(requestedPostId);
    res.render("post",{postTitle:blog.title,postContent:blog.content,postId:requestedPostId});
  });
}else{
  res.redirect("/Login");
}
});


app.get("/Blog/:postId/Delete",function(req,res){
  if(req.isAuthenticated()){
    var requestedPostId=req.params.postId;
  Blog.findOneAndUpdate({_id:req.user.id},{$pull:{blogs:{_id:requestedPostId}}},function(err,foundBlog){
    res.redirect("/Blog");
  });
}else{
  res.redirect("/Login");
}
});























app.listen(3005,function(){
  console.log("Server is running on port 3005");
});
