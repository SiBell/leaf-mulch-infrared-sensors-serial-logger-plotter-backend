//-------------------------------------------------
// Dependencies
//-------------------------------------------------
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const WebSocket = require('ws');
const fs = require('fs');
const format = require('date-fns/format');
const _ = require('lodash');

//-------------------------------------------------
// Create a data file
//-------------------------------------------------

const fileNameAndPath = `./data/${makeDateFilenameFriendly(new Date())}.csv`;
// fs.writeFileSync(fileNameAndPath);
const fileStream = fs.createWriteStream(fileNameAndPath);
fileStream.write('Time ISO8601,Time,IR 1 Object Temp,IR 2 Object Temp,IR 1 Die Temp, IR 2 Die Temp\n');



//-------------------------------------------------
// Setup serial
//-------------------------------------------------
// On a Mac you can use the following command to list the available serial ports:  ls /dev/{tty,cu}.* 
const serialPortName = '/dev/tty.usbserial-A104NAJO';
const baudRate = 115200;

const port = new SerialPort(serialPortName, {
  baudRate
}, (err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Port opened');
  }
});

const parser = new Readline();
port.pipe(parser);


//-------------------------------------------------
// Setup websockets
//-------------------------------------------------
const wss = new WebSocket.Server({port: 8082});

let websocketConnectionMade = false;
let wsConnection;
 
wss.on('connection', (ws) => {

  console.log('A client has connected to the websocket');
  websocketConnectionMade = true;

  wsConnection = ws;

});



//-------------------------------------------------
// Start Listening
//-------------------------------------------------
// Switches the port into "flowing mode"
parser.on('data', (data) => {

  const dateReceived = new Date();
  const dataStringWithoutNewLineCharacter = data.replace('\r', '');
  const dataAsArray = dataStringWithoutNewLineCharacter.split(',');
  
  // This if statement is to filter out serial messages such as 'E#'
  if (dataAsArray.length > 1) {

    const dataAsNumericalArray = dataAsArray.map((value) => Number(value));
    const dataArrayRounded = dataAsNumericalArray.map((value) => _.round(value, 3));

    // Save to file
    const lineForFile = `${dateReceived.toISOString()},${format(dateReceived, 'yyyy-MM-dd HH:mm:ss')},${dataArrayRounded.join(',')}\n`;
    fileStream.write(lineForFile);
    console.log(lineForFile);

    // Transmit via websocket
    if (websocketConnectionMade) {
      wsConnection.send(JSON.stringify({
        time: dateReceived.toISOString(),
        data: dataArrayRounded
      }));
    }
    
  }

});





function makeDateFilenameFriendly(date) {
  const inter = `${date.toISOString().split('.')[0]}Z`;
  const fileName = inter.replace(/:/g, '-');
  return fileName;
}


