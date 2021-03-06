var socket;

function startSocketing() {
    socket = io.connect("zuzel.herokuapp.com" + window.location.pathname, {
        transports: ['websocket'],
        'force new connection': true,
        'connect timeout': 500,
        'reconnection limit': 2,
        'max reconnection attempts': 2
    });
    socket.on('connect_error', function (err) {
        document.getElementById("errorMsg").setAttribute("class","show");
        //alert("connect_failed Connection failure")
    });

    socket.emit("wiad1", {a: "1abc1"})
    socket.on("position", positionSet)
    socket.on("spriteOK", spriteOK)
    socket.on("roomState", roomState)
    socket.on("spriteChoose", spriteChoose)
    socket.on("spriteBad", spriteBad)
    socket.on("startGame", startGame)
    socket.on("playerReady", playerReady)
    socket.on("finished", finished)
    socket.on("restart", restart);
    socket.on("chatMessage", chatMessage);
    socket.on("playerJoined", playerJoined);


}
function playerJoined(a) {
    if (typeof chat === "undefined")
        return;
    var elementText = "A new player joined the room";
    var elem = document.createElement("li");
    elem.setAttribute("class", "blue")
    elem.innerHTML = elementText;
    chat.appendChild(elem)
    chat.scrollTop = chat.scrollHeight;
}
function chatMessage(a) {
    if (typeof chat === "undefined")
        return;
    var elementText = a.who + ": " + a.message;
    var elem = document.createElement("li");
    elem.innerHTML = elementText;
    chat.appendChild(elem)
    chat.scrollTop = chat.scrollHeight;
}
function restart() {
    window.location.reload()
    // game.destroy();
    // game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update ,render:render});
}

function finished(a) {
    if (a.who == myNum) {
        started = false;
        laps[myNum] = parseInt(laps[myNum] + 1)
        renderTexts(myNum)
    }
    var time = new Date(a.time);
    var name = names[a.who].realName;
    currentPlace++;
    var seconds=(time.getSeconds()+"".length==1)? "0"+time.getSeconds() : time.getSeconds()+""
    var minutes=(time.getMinutes()+"".length==1)? "0"+time.getMinutes() : time.getMinutes()+""
    finishedTexts += currentPlace + ". " + name + " time-> " + minutes + ":" + seconds + "\n";
    renderMainText(finishedTexts)
}

function roomState(a) {
    console.log("a:")
    console.log(a)
// 		={'name': t
// 'x':170+mot
// 'y': 200}
    // if((!a.players || !a.started) && a[1])
    // 	a=a[1]
    if (!a.started) {
        for (var x in a.players) {
            var b = a.players;
            // if(typeof(names[x]) !== "undefined")
            names[x].setText(b[x].name);
            names[x].realName = b[x].name;
            // else
            // {
            // 	preparedNames[x]=b[x].name
            // }
            players[x].x = b[x].x;
            players[x].y = b[x].y;
            players[x].ready = b[x].ready;
            renderTexts(x)
            if (a.started) {

            }
            else if (a.owner != x) {
                players[x].alpha = 0.5;
                players[x].events.onInputDown.remove(spriteClicked, this);
            }
        }
        if (typeof(a.owner) !== "undefined") {
            myNum = a.owner;
            spriteOK(true)
            for (var i in players)
                players[i].events.onInputDown.remove(spriteClicked, this);
            if (Object.keys(a.players).length >= 2)
                showButton(true);
        }
    }
    else {
        if (typeof(a.owner) !== "undefined") {
            myNum = a.owner;
            // players[myNum].x=localStorage["x"];
            // players[myNum].y=localStorage["y"];
            players[myNum].x = a.players[myNum].x
            players[myNum].y = a.players[myNum].y
            players[myNum].angle = a.players[myNum].angle
            players[myNum].scale.x = a.players[myNum].scaleX
            players[myNum].scale.y = a.players[myNum].scaleY
            started = true;
            hideArrows()
            // players[myNum].angle=localStorage["angle"];
        }

        for (var x in a.players) {
            var b = a.players;
            // if(typeof(names[x]) !== "undefined")
            names[x].setText(b[x].name);
            names[x].realName = b[x].name;
            players[x].playing = b[x].playing;
        }
    }
}

function startGame(a) {
    for (var x in players) {
        if (players[x].ready) {
            players[x].ready = false
            players[x].playing = true
            players[x].alpha = 1;
            names[x].text = names[x].realName;
        }
        else {
            names[x].text = "";
        }
        if (x != myNum) {
            players[x].visible = false;
            names[x].visible = false;
        }

    }
    buttonText.text = 5;
    buttonText.visible = true;
    setTimeout(function () {
        buttonText.visible = true;
        buttonText.text = 4;
    }, 1000)
    setTimeout(function () {
        buttonText.visible = true;
        buttonText.text = 3;
    }, 2000)
    setTimeout(function () {
        buttonText.visible = true;
        buttonText.text = 2;
    }, 3000)
    setTimeout(function () {
        buttonText.visible = true;
        buttonText.text = 1;
    }, 4000)
    setTimeout(
        function () {
            buttonText.visible = false;
            started = true;
            hideArrows();
            for (var x in players) {
                if (players[x].playing) {
                    players[x].visible = true;
                    names[x].visible = true;
                }

            }
        }, 5000)

}

function playerReady(a) {
    var who = a.who;
    players[who].ready = true;
    renderTexts(who)
    if (a.startedInterval) {
        var time = 20;
        var waitingInterval = setInterval(function () {
            time--;
            renderMainText("waiting " + time + " sec\nfor remaining players");

            if (time == 0) {
                clearInterval(waitingInterval);
                renderMainText("")
            }

        }, 1000)
        renderMainText("waiting " + time + " sec\nfor remaining players");

    }
}
function positionSet(a) {
    if (started) {
        var i = a.num;
        if (i != myNum) {
            players[i].x = a.x;
            players[i].y = a.y;
            players[i].scale.x = a.scaleX
            players[i].scale.y = a.scaleY

        }
        laps[i] = a.lap + "";
        renderTexts(i);
    }
}
function spriteChoose(a) {
    var i = a.myNum;
    //player[i].name=a.name;
    if (i != myNum)
        players[i].alpha = 0.5
    names[i].setText(a.name);
    names[i].realName = a.name;
    renderTexts(i)
    if (i == myNum) {
        spriteOK(true)
        showButton(true)
        for (var x in players)
            players[x].events.onInputDown.remove(spriteClicked, this);

    }
    else
        players[i].events.onInputDown.remove(spriteClicked, this);

    //a.name;
    //player[i].visibility..
}
function spriteBad() {
    spriteOK(false)
}
function spriteOK(a) {
    if (a) {
        if (!myName)
            renderMainText("guest" + myNum);
        interval = setInterval(function () {
            if (players[myNum].y != 285) {
                players[myNum].y++;
            }
            else if (players[myNum].x != 350) {
                players[myNum].x += (players[myNum].x > 350) ? -1 : 1;
            }
            else {
                clearInterval(interval);
            }
            renderTexts(myNum)
        }, 7)
    }
    else {
        for (var i in players)
            players[i].events.onInputDown.add(spriteClicked, this);
    }
}