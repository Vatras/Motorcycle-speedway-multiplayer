//TOOD:zeby nie mozna bylo sie podszywac
// rozdzielanie uzytkownikom id
//zeby byl interval pozwalajacy wybierac motory przez 45 sec

var express = require('express');
var socketIO = require('socket.io')
var cookieParser = require('cookie-parser')
var app = express();
var server = require('http').Server(app);
var io = socketIO(server);
app.set('view engine','ejs');
app.set('views',__dirname + '/views');
app.set('view options',{layout: false});

app.use(cookieParser());

app.use(function (req, res, next) {
  // check if client sent cookie
  var cookie = req.cookies.cookieName;
  if (cookie === undefined)
  {
    // no: set a new cookie
    var randomNumber=Math.random().toString();
    randomNumber=randomNumber.substring(2,randomNumber.length);
    res.cookie('cookieName',randomNumber, { maxAge: 900000, httpOnly: true });
    console.log('cookie created successfully');
  } 
  else
  {
    // yes, cookie was already present 
    console.log('cookie exists', cookie);
  } 
  next(); // <-- important!
});

app.get("/:id",function(req,res,next){
    var param=req.params.id;
    console.log(param)
    if(param=="favicon.ico")
    next();
    console.log('Cookies: ', req.cookies)
	
    var param2=req.query.num;
    console.log(param2+" <<")

	if(typeof io.nsps["/"+req.params.id]==="undefined")
		makeNameSpace(req.params.id);

	res.render("main",{
        namespace: req.params.id
    });

})

app.use(express.static('public'));
var socketMap={};
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });
function makeNameSpace(namespace){
socketMap[namespace]={'started':false,
                        'readyPlayers':0,
                        'players':{},
                        'cookies':{}}
var nsp = io.of('/'+namespace);
nsp.on('connection',function(socket){

function setPlayerAttr(motorNum,attrName,value){
    socketMap[namespace].players[motorNum][attrName]=value;
}

function parseCookie(socket){
    var idd=socket.request.headers.cookie;
    var charNumber=typeof(idd)==="undefined" ? undefined : idd.indexOf("cookieName=");
    var sessionId=typeof(charNumber)==="undefined" ? null : idd.substr(charNumber+11,idd.length)

    return sessionId ? sessionId : false; 
}
function sendState(){
    var stateMap={};
    stateMap.started=socketMap[namespace].started;
    stateMap.players=socketMap[namespace].players;
    var idd=socket.request.headers.cookie;
    var charNumber=typeof(idd)==="undefined" ? undefined : idd.indexOf("cookieName=");
    var sessionId=typeof(charNumber)==="undefined" ? null : idd.substr(charNumber+11,idd.length)
    if(sessionId && socketMap[namespace].cookies[sessionId])
    {
        console.log("cookie: "+sessionId)
        console.log("cala mapa: "+socketMap[namespace])
        console.log("mapa od cookiego: "+socketMap[namespace].cookies[sessionId])
        stateMap.owner=socketMap[namespace].cookies[sessionId]
    }  
    socket.emit('roomState',stateMap)
}
sendState();
socket.on("roomState",sendState)
socket.on("wiad1",function(temp){
	console.log(temp.a+" /"+namespace)
	nsp.emit('hi', 'everyone!');
	//socket.emit('hi', 'everyone!');
})
socket.on("position",function(temp){
var sessionId = parseCookie(socket);
    if(sessionId)
    {
        var motorIndex = socketMap[namespace].cookies[sessionId];
        if(typeof motorIndex !== "undefined" && socketMap[namespace].players[motorIndex].playing)
        {
            //setPlayerAttr(motorIndex,"x",temp.x);
            socketMap[namespace].players[motorIndex].x=temp.x;
            socketMap[namespace].players[motorIndex].y=temp.y;
            var player=socketMap[namespace].players[motorIndex];

            if(player.y<145 &&  player.x<415 && player.wasDown)
            {
                socketMap[namespace].players[motorIndex].wasDown=false;
                socketMap[namespace].players[motorIndex].wasUp=true;
            }
            if(player.wasDown==false && player.wasUp && player.x>370 && player.y>240)
            {
                socketMap[namespace].players[motorIndex].wasDown=true;
                socketMap[namespace].players[motorIndex].wasUp=false;
                socketMap[namespace].players[motorIndex].lap++;
            }
                console.log(temp.a+" /"+namespace)
                temp.lap=socketMap[namespace].players[motorIndex].lap
                nsp.emit('position', temp);
        }
    }
    //socket.emit('hi', 'everyone!');
})
socket.on("ready",function(temp){
    var sessionId = parseCookie(socket);
    if(sessionId)
    {
        var motorIndex = socketMap[namespace].cookies[sessionId];
        if(typeof motorIndex !== "undefined" && socketMap[namespace].players[motorIndex].ready==false)
        {
            socketMap[namespace].players[motorIndex].ready=true;
            socketMap[namespace].readyPlayers++;
            var numOfPlayers=Object.keys(socketMap[namespace].players).length;
            if(numOfPlayers>=2 && numOfPlayers==socketMap[namespace].readyPlayers)
            {
                for(var x in socketMap[namespace].players)
                {
                    if(socketMap[namespace].players[x].ready)
                    {
                        socketMap[namespace].players[x].playing=true;
                        socketMap[namespace].players[x].wasUp=false;
                        socketMap[namespace].players[x].wasDown=true;
                        socketMap[namespace].players[x].lap=0;
                    }
                }
                nsp.emit("startGame",{'who':motorIndex});
            }
            else
                nsp.emit("playerReady",{'who':motorIndex});
            
        }


    }    
});
socket.on("spriteChoose",function(temp){
    //'myNum'
    // 'name':
    var motorIndex=temp.myNum;
    if(typeof socketMap[namespace].players[motorIndex]==='undefined')
    {
        socketMap[namespace].players[motorIndex]={'name': temp.name,
                                        'x':170+motorIndex*150,
                                        'y': 200,
                                        'ready':false,
                                        'playing':false}
        var idd=socket.request.headers.cookie;
        var charNumber=typeof(idd)==="undefined" ? undefined : idd.indexOf("cookieName=");
        var sessionId=typeof(charNumber)==="undefined" ? null : idd.substr(charNumber+11,idd.length)
        if(sessionId)
        {
            socketMap[namespace].cookies[sessionId]=motorIndex;
            console.log("dodano do mapy:"+sessionId)
        }    

        nsp.emit('spriteChoose', temp);
    }
    else
    {
        socket.emit('spriteBad',{})
    }
})


console.log("polaczenie")

function checkIfClientExists(socket)
{
    var idd=socket.request.headers.cookie;
    var charNumber=idd.indexOf("connect.sid");
    var sessionId=idd.substr(charNumber+12,idd.length)
    socket.sessionId=sessionId;
    socket.userId=maxNumberOfUsers;
    maxNumberOfUsers++;
    if(sessionMap[sessionId]==null)
    {
        sessionMap[sessionId]=true
        console.log("ktos sie polaczyl");
        return 1;
    }
    else
    {
        console.log("rozlaczam duplikat");
        socket.disconnect();
        return 0;
    }
}

});

}
server.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});