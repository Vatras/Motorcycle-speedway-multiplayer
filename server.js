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
    //console.log(param)
    if(param=="favicon.ico")
    next();
    //console.log('Cookies: ', req.cookies)
	
    var param2=req.query.num;
    //console.log(param2+" <<")

	if(typeof io.nsps["/"+req.params.id]==="undefined")
		makeNameSpace(req.params.id);

	res.render("main",{
        namespace: req.params.id
    });

})

app.use(express.static('public'));
// app.listen(3000, function () {
//   console.log('Example app listening on port 3000!');
// });
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

    function setPlayerAttr(motorNum,attrName,value){
        socketMap[namespace].players[motorNum][attrName]=value;
    }
    function getPlayerAttr(motorNum,attrName){
        return socketMap[namespace].players[motorNum][attrName];
    }
    function parseCookie(){
        if(typeof(socket.sessionId)!=="undefined")
            return socket.sessionId;
        var idd=socket.request.headers.cookie;
        var charNumber=typeof(idd)==="undefined" ? undefined : idd.indexOf("cookieName=");
        var sessionId=typeof(charNumber)==="undefined" ? null : idd.substr(charNumber+11,idd.length)
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
        console.log("game restarted!")
    }
    function sendState(){
        var stateMap={};
        stateMap.started=socketMap[namespace].started;
        stateMap.players=socketMap[namespace].players;
        sessionId=parseCookie(socket);
        if(sessionId && typeof socketMap[namespace].cookies[sessionId]!== "undefined")
        {
            console.log("cookie: "+sessionId)
            console.log("cala mapa: "+socketMap[namespace])
            console.log("mapa od cookiego: "+socketMap[namespace].cookies[sessionId])
            stateMap.owner=socketMap[namespace].cookies[sessionId]
        }  
        socket.emit('roomState',stateMap)
    }
    sendState();
    //socket.once("roomState",sendState)

    socket.on("position",function(temp){
    var sessionId = parseCookie(socket);
        if(sessionId)
        {
            var motorIndex = socketMap[namespace].cookies[sessionId];
            if(typeof motorIndex !== "undefined" && socketMap[namespace].players[motorIndex].playing)
            {
                console.log("otrzymalem od "+motorIndex+" y="+temp.y)
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
                    if(newLap==3 && getPlayerAttr(motorIndex,"finished") == false)
                    {
                        setPlayerAttr(motorIndex,"finished",true);
                        var time=new Date().getTime() - socketMap[namespace].startedTime;
                        nsp.emit("finished",{"who":motorIndex,
                                            "time":time})
                        socketMap[namespace].playingPlayers--;
                        console.log("socketMap[namespace].playingPlayers "+socketMap[namespace].playingPlayers)
                        
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
                    console.log(" namespace/"+namespace)
                    temp.lap=getPlayerAttr(motorIndex,"lap");
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
        //'myNum'
        // 'name':
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
            console.log("dodano do mapy:"+sessionId)
              

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