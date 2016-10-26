import {
  connected,
  authenticateSocket,
  logoutSocket,
  clearCookie,
  handleResponse
} from '../utils';

class SocketService {
  constructor (app) {
    this.app = app;
  }

  create (data, params) {
    const app = this.app;

    return app.authentication.getJWT().then(token => {
      data.accessToken = token;
      console.log('token', token);

      return connected(app).then(socket => {
        const method = app.io ? 'emit' : 'send';
        console.log('method', method);
        return authenticateSocket(data, socket, method)
          .then(response => {
            console.log('response', response);
            socket.on('reconnect', () => authenticateSocket(data, socket, method));
            socket.io.engine.on('upgrade', () => authenticateSocket(data, socket, method));
            return handleResponse(app, response);
          })
          .catch(error => {
            console.log('inner error', error);
          });
      });
    })
    .catch(error => {
      console.log(error);
    });
  }

  remove (id, params) {
    const app = this.app;
    let options = app.authentication.options;

    app.set('accessToken', null);
    clearCookie(options.cookie);

    // remove the token from localStorage
    return Promise.resolve(app.get('storage').removeItem(options.tokenKey)).then(() => {
      // If using sockets de-authenticate the socket
      if (app.io || app.primus) {
        const method = app.io ? 'emit' : 'send';
        const socket = app.io ? app.io : app.primus;

        return logoutSocket(socket, method);
      }
    });
  }
}

export default SocketService;
