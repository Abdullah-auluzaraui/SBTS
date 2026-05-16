const { Server } = require('socket.io');

let _io = null;

const init = (httpServer, options) => { 
  _io = new Server(httpServer, options); 
  return _io; 
};

const getIO = () => { 
  if (!_io) throw new Error('Socket.io not initialized'); 
  return _io; 
};

module.exports = { init, getIO };
