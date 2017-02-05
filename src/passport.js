import errors from 'feathers-errors';
import decode from 'jwt-decode';
import Debug from 'debug';

const debug = Debug('feathers-authentication-client');

export default class Passport {
  constructor (app, options) {
    if (app.passport) {
      throw new Error('You have already registered authentication on this client app instance. You only need to do it once.');
    }

    this.options = options;
    this.app = app;
    this.storage = app.get('storage') || this.getStorage(options.storage);

    this.setJWT = this.setJWT.bind(this);

    app.set('storage', this.storage);
    this.getJWT().then(this.setJWT);

    this.setupSocketListeners();
  }

  setupSocketListeners () {
    const app = this.app;
    const socket = app.io || app.primus;
    const emit = app.io ? 'emit' : 'send';
    const reconnected = app.io ? 'reconnect' : 'reconnected';

    if (!socket) {
      return;
    }

    socket.on(reconnected, () => {
      debug('Socket reconnected');

      // If socket was already authenticated then re-authenticate
      // it with the server automatically.
      if (socket.authenticated) {
        const data = {
          strategy: this.options.jwtStrategy,
          accessToken: app.get('accessToken')
        };
        this.authenticateSocket(data, socket, emit)
          .then(this.setJWT)
          .catch(error => {
            debug('Error re-authenticating after socket reconnect', error);
            socket.authenticated = false;
            app.emit('reauthentication-error', error);
          });
      }
    });

    const socketUpgradeHandler = () => {
      socket.io.engine.on('upgrade', () => {
        debug('Socket upgrading');

        // If socket was already authenticated then re-authenticate
        // it with the server automatically.
        if (socket.authenticated) {
          const data = {
            strategy: this.options.jwtStrategy,
            accessToken: app.get('accessToken')
          };

          this.authenticateSocket(data, socket, emit)
            .then(this.setJWT)
            .catch(error => {
              debug('Error re-authenticating after socket upgrade', error);
              socket.authenticated = false;
              app.emit('reauthentication-error', error);
            });
        }
      });
    };

    if (socket.io && socket.io.engine) {
      socketUpgradeHandler();
    } else {
      socket.on('connect', socketUpgradeHandler);
    }
  }

  connected () {
    const app = this.app;

    if (app.rest) {
      return Promise.resolve();
    }

    const socket = app.io || app.primus;

    if (!socket) {
      return Promise.reject(new Error(`It looks like your client connection has not been configured.`));
    }

    if ((app.io && socket.connected) || (app.primus && socket.readyState === 3)) {
      debug('Socket already connected');
      return Promise.resolve(socket);
    }

    return new Promise((resolve, reject) => {
      const connected = app.primus ? 'open' : 'connect';
      const disconnect = app.io ? 'disconnect' : 'end';
      debug('Waiting for socket connection');

      const handleDisconnect = () => {
        debug('Socket disconnected before it could connect');
        socket.authenticated = false;
      };

      // If disconnect happens before `connect` the promise will be rejected.
      socket.once(disconnect, handleDisconnect);
      socket.once(connected, () => {
        debug('Socket connected');
        debug(`Removing ${disconnect} listener`);
        socket.removeListener(disconnect, handleDisconnect);
        resolve(socket);
      });
    });
  }

  authenticate (credentials = {}) {
    const app = this.app;
    let getCredentials = Promise.resolve(credentials);

    // If no strategy was given let's try to authenticate with a stored JWT
    if (!credentials.strategy) {
      if (credentials.accessToken) {
        credentials.strategy = this.options.jwtStrategy;
      } else {
        getCredentials = this.getJWT().then(accessToken => {
          if (!accessToken) {
            return Promise.reject(new errors.NotAuthenticated(`Could not find stored JWT and no authentication strategy was given`));
          }
          return { strategy: this.options.jwtStrategy, accessToken };
        });
      }
    }

    return getCredentials.then(credentials => {
      return this.connected(app).then(socket => {
        if (app.rest) {
          return app.service(this.options.path).create(credentials).then(this.setJWT);
        }

        const emit = app.io ? 'emit' : 'send';
        return this.authenticateSocket(credentials, socket, emit).then(this.setJWT);
      });
    });
  }

  // Returns a promise that authenticates a socket
  authenticateSocket (credentials, socket, emit) {
    return new Promise((resolve, reject) => {
      debug('Attempting to authenticate socket');
      socket[emit]('authenticate', credentials, (error, data) => {
        if (error) {
          return reject(error);
        }

        socket.authenticated = true;
        debug('Socket authenticated!');

        resolve(data);
      });
    });
  }

  logoutSocket (socket, emit) {
    return new Promise((resolve, reject) => {
      socket[emit]('logout', error => {
        if (error) {
          reject(error);
        }

        socket.authenticated = false;
        resolve();
      });
    });
  }

  logout () {
    const app = this.app;

    app.set('accessToken', null);
    this.clearCookie(this.options.cookie);

    // remove the accessToken from localStorage
    return Promise.resolve(app.get('storage').removeItem(this.options.storageKey)).then(() => {
      // If using sockets de-authenticate the socket
      if (app.io || app.primus) {
        const method = app.io ? 'emit' : 'send';
        const socket = app.io ? app.io : app.primus;

        return this.logoutSocket(socket, method);
      }
    });
  }

  setJWT (data) {
    const accessToken = (data && data.accessToken) ? data.accessToken : data;

    if (accessToken) {
      this.app.set('accessToken', accessToken);
      this.app.get('storage').setItem(this.options.storageKey, accessToken);
    }

    return Promise.resolve(data);
  }

  getJWT () {
    const app = this.app;
    return new Promise((resolve) => {
      const accessToken = app.get('accessToken');

      if (accessToken) {
        return resolve(accessToken);
      }

      return Promise.resolve(this.storage.getItem(this.options.storageKey)).then(jwt => {
        let token = jwt || this.getCookie(this.options.cookie);

        if (token && token !== 'null' && !this.payloadIsValid(decode(token))) {
          token = undefined;
        }

        return resolve(token);
      });
    });
  }

  // Pass a jwt token, get back a payload if it's valid.
  verifyJWT (token) {
    if (typeof token !== 'string') {
      return Promise.reject(new Error('Token provided to verifyJWT is missing or not a string'));
    }

    try {
      let payload = decode(token);

      if (this.payloadIsValid(payload)) {
        return Promise.resolve(payload);
      }

      return Promise.reject(new Error('Invalid token: expired'));
    } catch (error) {
      return Promise.reject(new Error('Cannot decode malformed token.'));
    }
  }

  // Pass a decoded payload and it will return a boolean based on if it hasn't expired.
  payloadIsValid (payload) {
    return payload && payload.exp * 1000 > new Date().getTime();
  }

  getCookie (name) {
    if (typeof document !== 'undefined') {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);

      if (parts.length === 2) {
        return parts.pop().split(';').shift();
      }
    }

    return null;
  }

  clearCookie (name) {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    }

    return null;
  }

  // Returns a storage implementation
  getStorage (storage) {
    if (storage) {
      return storage;
    }

    return {
      store: {},
      getItem (key) {
        return this.store[key];
      },

      setItem (key, value) {
        return (this.store[key] = value);
      },

      removeItem (key) {
        delete this.store[key];
        return this;
      }
    };
  }
}
