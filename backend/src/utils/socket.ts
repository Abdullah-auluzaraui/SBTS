import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let _io: Server | null = null;

export const init = (httpServer: HttpServer, options?: any) => { 
  _io = new Server(httpServer, options); 
  return _io; 
};

export const getIO = (): Server => { 
  if (!_io) throw new Error('Socket.io not initialized'); 
  return _io; 
};
