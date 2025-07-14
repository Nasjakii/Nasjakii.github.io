console.log("Server started");

const WebSocket = require("ws"); // Use ws for WebSocket
const http = require("http");


const port = process.env.PORT;
//const server = new WebSocket.Server({ port: 8080 });

const server = http
  .createServer(function (req, res) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("This is just a server");
    res.end();
  })
  .listen(port);
// pass the created server to ws
const wss = new WebSocket.Server({ server });

var data;
var hosts = [];
var game_started_array = [];
var server_array = [];

const msgType = {
  CREATE_HOST: 0,
  STOP_HOST: 1,
  GET_HOSTS: 2,
  JOIN_LOBBY: 3,
  GAMESETTINGS: 4,
  START_GAME: 5,
  STATE: 6,
  OCCUPY_FIELD: 7,
  CREATE_TOWER: 8,
  UPDATE_TOWER: 9,
  DESTROY_TOWER: 10,
  DISCONNECT_CLIENT: 11,
  PING: 12,
  TEAM_NUMBER: 13,
  TOWER_SELECTION: 14,
  SERVER_READY: 15,
  SERVER_CLOSE: 16,
  SEND_MONEY: 17,
  PLAYER_READY: 18,
};

function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function player(player_number, player_name, team_number, socket) {
  this.player_number = player_number;
  this.player_name = player_name;
  this.socket = socket;
  this.team_number = team_number;
}

wss.on("connection", function (socket) {
  console.log("Client connected");

  socket.on("message", function (msg) {
    if (true) console.log("< " + String(msg));

    if (isJson(msg)) {
      data = JSON.parse(msg);
      switch (data.type) {
        case msgType.CREATE_HOST:
          create_host(data, socket);
          break;
        case msgType.STOP_HOST:
          stop_host(data, socket);
          break;
        case msgType.GET_HOSTS:
          get_hosts(data, socket);
          break;
        case msgType.JOIN_LOBBY:
          join_lobby(data, socket, true);
          break;
        case msgType.UPDATE_TOWER:
          share_data(data, socket, true);
          break;
        case msgType.DESTROY_TOWER:
          share_data(data, socket, true, true);
          break;
        case msgType.OCCUPY_FIELD:
          share_data(data, socket, true);
          break;
        case msgType.CREATE_TOWER:
          share_data(data, socket, true);
          break;
        case msgType.STATE:
          share_data(data, socket, true);
          break;
        case msgType.DISCONNECT_CLIENT:
          disconnect_client(data, socket, true);
          break;
        case msgType.START_GAME:
          game_started_array[data.lobbyNumber] = true;
          share_data(data, socket, true, true);
          break;
        case msgType.GAMESETTINGS:
          share_data(data, socket, false);
          break;
        case msgType.PING:
          //console.log("Ping");
          socket.send(JSON.stringify(data)); //send to self even if not in lobby
          share_data(data, socket, false); //send to everyone - just possible when in lobby
          break;
        case msgType.TEAM_NUMBER:
          share_data(data, socket, true);
          break;
        case msgType.TOWER_SELECTION:
          share_data(data, socket, true);
          break;
        case msgType.SERVER_READY:
          start_server(socket);
          break;
        case msgType.SERVER_CLOSE:
          close_server(socket);
          break;
        case msgType.SEND_MONEY:
          share_data(data, socket, true);
          break;
        case msgType.PLAYER_READY:
          share_data(data, socket, true);
          break;
      }
    } else {
    }
  });

  socket.on("close", function () {
    console.log("Client disconnected");
  });
});

function create_host(data, socket) {
  try {
    var lobbyNumber = hosts.length;
    var team_number = 0;
    var player_number = 0;
    hosts.push([new player(player_number, data.playerName, team_number, socket)]);
    game_started_array.push(false);

    data.lobbyNumber = lobbyNumber;
    data.playerNumber = 0;

    socket.send(JSON.stringify(data));
    console.table(hosts);

    //send request to droplet for new game instance

  } catch(err) {
    console.log(err);
  }
}

function stop_host(data, socket) {
  try {
    var host_to_stop = hosts.indexOf(data.lobbyNumber);

    share_data(data, socket, false); //sending disconnect requests to sockets connected

    hosts.splice(host_to_stop, 1);
    game_started_array.splice(host_to_stop, 1);

    console.table(hosts);
  } catch(err) {
    console.log(err);
  }
  
}

function get_hosts(data, socket) {
  try {
    var lobby_names = [];
    var player_counts = [];
    for (var i = 0; i < hosts.length; i++) {
      lobby_names[i] = hosts[i][0].player_name;
      player_counts[i] = hosts[i].length;
    }
    data.lobbyNames = JSON.stringify(lobby_names);
    data.playerCounts = JSON.stringify(player_counts);

    data.gameStartedList = game_started_array;

    console.log("> hosts, running");
    socket.send(JSON.stringify(data));
  } catch(err) {
    console.log(err);
  }
}

function join_lobby(data, socket) {
  try {
    var lobby_number = data.lobbyNumber;
    if (typeof hosts[lobby_number] == "undefined") {
      console.log("lobby doesnt exist anymore");
      return;
    }
    if (game_started_array[lobby_number]) {
      console.log("cant join a running game");
      return;
    }
    var number_of_players = hosts[lobby_number].length;
    var player_number = -1;
    var player_number_array = hosts[lobby_number].map(arr => arr.player_number);
    for (var i = 0; i <= number_of_players; i++) {
      if (!player_number_array.includes(i)) {
        player_number = i;
      }
    }

    if (player_number == -1) {
      console.log("error giving a player number");
      return;
    }

    hosts[lobby_number].push(
      new player(player_number, data.playerName, number_of_players, socket)
    );

    //add playernames to data
    var player_names = [];
    for (var i = 0; i < number_of_players; i++) {
      player_names[i] = hosts[lobby_number][i].player_name;
    }
    player_names[number_of_players] = data.playerName;

    data.playerNames = JSON.stringify(player_names);
    data.playerNumber = JSON.stringify(player_number);
    data.lobbyNumber = JSON.stringify(lobby_number);
    share_data(data, socket, true);

    console.table(hosts);

  } catch(err) {
    console.log(err);
  }
}
function disconnect_client(data, socket) {
  try {
    var client_to_stop = data.playerNumber;
    if (typeof hosts[data.lobbyNumber] == "undefined") {
      return;
    }

    data.playerCount = 0; //fake data for client to stop
    hosts[data.lobbyNumber][client_to_stop].socket.send(JSON.stringify(data)); //send disconnect request to client that needs to be disconnected

    hosts[data.lobbyNumber].splice(client_to_stop, 1); //remove client from server client list
    data.playerCount = hosts[data.lobbyNumber].length; //set new player count
    share_data(data, socket, true); //share new player count with lobby

  } catch(err) {
    console.log(err);
  }
}

function share_data(data, socket, self, debug = false) {
  try {
    
    if (typeof hosts[data.lobbyNumber] == "undefined") {
      console.log("Host undefined in share_data");
      console.log(data);
      return false; //error
    }

    for (var i = 0; i < hosts[data.lobbyNumber].length; i++) {
      if (self == false && i == data.playerNumber) continue;
      hosts[data.lobbyNumber][i].socket.send(JSON.stringify(data));
    }
    if (debug) {
      console.log("> " + JSON.stringify(data));
    } else {
      console.log("> data type: " + JSON.stringify(data.type));
    }
  
  } catch(err) {
    console.log(err);
  }
}

function start_server(socket) {
  try {
    console.log("Server Ready");
    server_array.push(socket);
    console.log(server_array.length);

  } catch(err) {
    console.log(err);
  }
}

function close_server(socket) {
  try {
    const index = server_array.indexOf(socket);
    if (index > -1) { 
      server_array.splice(index, 1); 
    }
    console.log(server_array.length);
  
  } catch(err) {
    console.log(err);
  }
}

console.log(hosts);

/*
hosts.splice(1, 1);
console.table(hosts);
*/
