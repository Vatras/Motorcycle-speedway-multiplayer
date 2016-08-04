var express = require('express');
var socketIO = require('socket.io')
var cookieParser = require('cookie-parser')
var properties = require('./properties.js')
var app = express();
var server = require('http').Server(app);
var io = socketIO(server);

var currentRoom=getUUID();

var port = process.env.PORT || 8080;
app.set('view engine','ejs');
app.set('views',__dirname + '/views');
app.set('view options',{layout: false});

app.use(cookieParser());

app.use(function (req, res, next) {
  // check if client sent cookie
  var cookie = req.cookies.cookieName;
  if (cookie === undefined)
  {
    var randomString=getUUID();
    res.cookie('cookieName',randomString, { maxAge: 900000, httpOnly: true }); //set cookie
    res.cookie('newRoomDate',"", { maxAge: 900000, httpOnly: true });
  } 
  next();
});



app.get("/",function(req,res,next){

        //res.cookie('newRoomDate',new Date().getTime(), { maxAge: 900000, httpOnly: true });
        // currentPlayersInRoom++;
        // if(currentPlayersInRoom==4)
        // {
        //     var tempRoomName=currentRoom;
        //     currentRoom=getUUID();
        //     currentPlayersInRoom=0;
        //     res.redirect(tempRoomName);
        // }
        res.redirect(currentRoom);

})
app.get("/new/:id",function(req,res,next){

    var param=req.params.id;

    if(param==currentRoom)
    {
        var cookie = req.cookies.newRoomDate;
        if(cookie && new Date().getTime()-cookie<30000) //30sec freeze for not creating too many rooms
        {
            res.redirect("../"+req.params.id+"#tooFast");
        }
        res.cookie('newRoomDate',new Date().getTime(), { maxAge: 900000, httpOnly: true });

        currentPlayersInRoom=0;
        currentRoom=getUUID();
        res.redirect("../"+currentRoom);
    }
    else
        res.redirect("../"+currentRoom);

})
app.get("/:id",function(req,res,next){
    var param=req.params.id;
    
    if(param=="favicon.ico")
    	next();
    var param2=req.query.num;

    if(typeof io.nsps["/"+req.params.id]==="undefined")
        makeNameSpace(req.params.id);

    res.render("main");

})


app.use(express.static('public'));

function getUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() +  s4() +  s4() + 
    s4() + s4() + s4() + s4();
}

function makeNameSpace(namespace){
    var namespace=namespace;
    var socketMap={};
    socketMap[namespace]={'started':false,
                          'readyPlayers':0,
                          'players':{},
                          'cookies':{}}
    var nsp = io.of('/'+namespace);
    var namespaceTimeout=null;
    
    nsp.on('connection',function(socket){
        nsp.emit('playerJoined',{});

        sendState();
        function setPlayerAttr(motorNum,attrName,value){
            socketMap[namespace].players[motorNum][attrName]=value;
        }

        function getPlayerAttr(motorNum,attrName){
            return socketMap[namespace].players[motorNum][attrName];
        }

        function parseCookie(){
            if(typeof(socket.sessionId)!=="undefined")
                return socket.sessionId;
            var tempId=socket.request.headers.cookie;
            var charNumber=typeof(tempId)==="undefined" ? undefined : tempId.indexOf("cookieName=");
            var sessionId=typeof(charNumber)==="undefined" ? null : tempId.substr(charNumber+11,tempId.length)
            if(sessionId)
                socket.sessionId=sessionId;
            return sessionId ? sessionId : false; 
        }

        function startGame(){
            socketMap[namespace].started=true;
            socketMap[namespace].startedTime=new Date().getTime();
            socketMap[namespace].playingPlayers=0;
            for(var x in socketMap[namespace].players)
            {
                if(socketMap[namespace].players[x].ready)
                {
                    socketMap[namespace].playingPlayers++;
                    socketMap[namespace].players[x].playing=true;
                    socketMap[namespace].players[x].finished=false;
                    socketMap[namespace].players[x].wasUp=false;
                    socketMap[namespace].players[x].wasDown=true;
                    socketMap[namespace].players[x].lap=0;
                }
            }
            socketMap[namespace].initPlayingPlayers=socketMap[namespace].playingPlayers;
            nsp.emit("startGame",{});
        }

        function restartGame(){
            socketMap[namespace]={'started':false,
	                            'readyPlayers':0,
	                            'players':{},
	                            'cookies':{}}
            nsp.emit('restart',{})
        }

        function sendState(){
            var stateMap={};
            stateMap.started=socketMap[namespace].started;
            stateMap.players=socketMap[namespace].players;
            sessionId=parseCookie(socket);
            if(sessionId && typeof socketMap[namespace].cookies[sessionId]!== "undefined")
            {
                stateMap.owner=socketMap[namespace].cookies[sessionId]
            }  
            socket.emit('roomState',stateMap)
        }

        //socket.once("roomState",sendState)
        socket.on("chatMessage",function(temp){
            nsp.emit('chatMessage',temp);
        });

        socket.on("position",function(temp){
        	var sessionId = parseCookie(socket);
            if(sessionId)
            {
                var motorIndex =, socketMap[namespace].cookies[sessionId];
                if(typeof motorIndex !== "undefined" && socketMap[namespace].players[motorIndex].playing)
                {

                    if(temp.y>195 && temp.y<215  && temp.x>250 && temp.x<500)
                    {
                        socketMap[namespace].players[motorIndex].playing=false;
                        socketMap[namespace].playingPlayers--;
                        socketMap[namespace].initPlayingPlayers--;
                        return;
                    }
                    setPlayerAttr(motorIndex,"x",temp.x);
                    setPlayerAttr(motorIndex,"y",temp.y);
                    setPlayerAttr(motorIndex,"scaleX",temp.scaleX);
                    setPlayerAttr(motorIndex,"scaleY",temp.scaleY);
                    setPlayerAttr(motorIndex,"angle",temp.angle);
                    var player=socketMap[namespace].players[motorIndex];

                    if(player.y<145 &&  player.x<415 && player.wasDown)
                    {
                        setPlayerAttr(motorIndex,"wasDown",false);
                        setPlayerAttr(motorIndex,"wasUp",true);
                    }
                    if(player.wasDown==false && player.wasUp && player.x>370 && player.y>240)
                    {
                        setPlayerAttr(motorIndex,"wasDown",true);

                        setPlayerAttr(motorIndex,"wasUp",true);
                        var newLap=getPlayerAttr(motorIndex,"lap") + 1;
                        setPlayerAttr(motorIndex,"lap",newLap);
                        if(newLap==properties.laps && getPlayerAttr(motorIndex,"finished") == false)
                        {
                            setPlayerAttr(motorIndex,"finished",true);
                            var time=new Date().getTime() - socketMap[namespace].startedTime;
                            nsp.emit("finished",{"who":motorIndex,
                                                "time":time})
                            socketMap[namespace].playingPlayers--;
                            
                            if(socketMap[namespace].initPlayingPlayers-1==socketMap[namespace].playingPlayers)
                            {
                                namespaceTimeout=setTimeout(restartGame,20000); 
                            }

                            if(socketMap[namespace].playingPlayers==0)
                            {
                                if(namespaceTimeout)
                                {
                                    clearTimeout(namespaceTimeout)
                                    namespaceTimeout=null;
                                }
                                restartGame();
                            }
                        }   
                    }
                        temp.lap=getPlayerAttr(motorIndex,"lap");
                        nsp.emit('position', temp);
                }
            }
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
                    if(socketMap[namespace].readyPlayers==2 && numOfPlayers>socketMap[namespace].readyPlayers)
                    {
                        nsp.emit("playerReady",{'who':motorIndex,"startedInterval":true});
                        if(!namespaceTimeout)
                            namespaceTimeout=setTimeout(startGame,20000); //20 sec to give chance to hit ready
                    }
                    else if(socketMap[namespace].readyPlayers>=2 && numOfPlayers==socketMap[namespace].readyPlayers)
                    {
                        nsp.emit("playerReady",{'who':motorIndex,"startedInterval":false});
                        clearTimeout(namespaceTimeout);
                        namespaceTimeout=null;
                        startGame();
                    }   
                    else
                        nsp.emit("playerReady",{'who':motorIndex,"startedInterval":false});
                    
                }
            }    
        });
        socket.on("spriteChoose",function(temp){
            sessionId=parseCookie(socket);
            var motorIndex=temp.myNum;
            if(sessionId && typeof socketMap[namespace].cookies[sessionId]==='undefined' && typeof socketMap[namespace].players[motorIndex]==='undefined')
            {
                socketMap[namespace].players[motorIndex]={'name': temp.name,
		                                                  'x':170+motorIndex*150,
		                                                  'y': 200,
		                                                  'ready':false,
		                                                  'playing':false}
                socketMap[namespace].cookies[sessionId]=motorIndex;
                  
                nsp.emit('spriteChoose', temp);
            }
            else
            {
                socket.emit('spriteBad',{})
            }
        })
    });

}

server.listen(port, function () {
  console.log('App listening on port!'+port);
});