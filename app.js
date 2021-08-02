require('dotenv').config()
const express=require('express');
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const session=require('express-session');
const passport=require('passport');
const passportLocalMongoose=require('passport-local-mongoose');

const app=express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({ secret: process.env.SECRET, resave: true, saveUninitialized: true }));    //create a session.
app.use(passport.initialize());    //initialise passport
app.use(passport.session());       //use passport to manage our session


mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true, useUnifiedTopology: true,useCreateIndex:true});

const userSchema = new mongoose.Schema({
    name:String,
    secrets: [String]
});


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());    // a strategy is just a way of authentication. Many strategies are provided by passport, like passport-local for local username and password auth strategy. passport-facebook for auth using facebook. etc.

passport.serializeUser( (user, done) => {      //serialize creates the cookie.
    done(null, user.id);
  });
  
  passport.deserializeUser((id, done) => {      //deserialize gets the cookie and obtains the necessary data from it.
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


app.get("/", (req,res) => {
    res.render("home");
});

app.get("/login", (req,res) => {
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.get("/secrets", (req,res) => {
    User.find({"secrets":{$ne:null}}, (err,foundUsers) => {
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
                res.render("secrets",{userSecrets:foundUsers});
            }
        }
    })
})

app.post("/register", (req,res) => {
    User.register({username:req.body.username,name:req.body.name},req.body.password, (err,user) => {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate('local')(req,res, () => {     //the server sends a cookie to the user's browser that the browser holds on to. It is used for checking if the user is authenticated or not when he accesses other areas of the website
                res.redirect("/secrets");
            });
        }
    })     //this function comes from passport-local.
})



app.post("/login",(req,res) => {    //passport saves the user details in the req variable. These details are sent in every request. so it can be accessed anywhere. console.log(req.user) inside req.login to see it.
        const user=new User({
            email:req.body.username,
            password:req.body.password
        });
        req.login(user, (err) => {
            if (err){
                console.log(err); 
            }else{
                passport.authenticate('local')(req,res, () => {     // the callback is triggered only if the authentication is successful.
                    res.redirect("/secrets");
                });
            }
          });
})


app.post("/submit", (req,res) => {
    const submittedSecret=req.body.secret;
    User.findById(req.user.id, (err,foundUser) => {
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secrets.push(submittedSecret);
                foundUser.save();
                res.redirect("/secrets");
            }
        }
    })
})

app.get("/submit", (req,res) => {
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
})

app.get("/personal", (req,res) => {
    if(req.isAuthenticated()){
        User.findById(req.user.id, (err,foundUser) => {
            if(err){
                console.log(err);
            }else{
                if(foundUser){
                    res.render("personal",{name:foundUser.name,personalSecrets:foundUser.secrets});
                }
            }
        })
    }
})

app.get('/logout',(req,res) => {
    req.logout();
    res.redirect("/");
})

app.listen(3000, () => {
    console.log("started listening on 3000");
})