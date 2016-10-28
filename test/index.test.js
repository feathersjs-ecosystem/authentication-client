// import { expect } from 'chai';
// import io from 'socket.io-client';
// import hooks from 'feathers-hooks';
// import feathers from 'feathers/client';
// import socketio from 'feathers-socketio/client';
// import primus from 'feathers-primus/client';
// import rest from 'feathers-rest/client';
// import localstorage from 'localstorage-memory';
// import request from 'request';
// import Primus from 'primus';
// import Emitter from 'primus-emitter';

// import authentication from '../src/index';
// import initServer from '../fixtures/server';

// const email = 'test@feathersjs.com';
// const password = 'test';
// const settings = {
//   user: {
//     idField: 'id'
//   },
//   token: {
//     secret: 'feathers-rocks'
//   }
// };
// const setupTests = initClient => {
//   let client;
//   let options;

//   beforeEach(() => {
//     options = {
//       type: 'local',
//       email,
//       password
//     };
//     client = initClient();
//   });

//   it('client.authentication object', () => {
//     expect(typeof client.authentication.getJWT).to.equal('function');
//     expect(client.authentication.options).to.deep.equal({
//       cookie: 'feathers-jwt',
//       tokenKey: 'feathers-jwt',
//       localEndpoint: '/auth/local',
//       tokenEndpoint: '/auth/token'
//     });
//   });

//   it('can use client.authentication.getJWT() to get the accessToken', () => {
//     return client.authenticate(options).then(response => {
//       client.authentication.getJWT().then(accessToken => {
//         expect(accessToken).to.equal(response.accessToken);
//       });
//     });
//   });

//   it('can decode a accessToken with client.authentication.verifyToken()', () => {
//     return client.authenticate(options).then(response => {
//       return client.authentication.verifyJWT(response).then(payload => {
//         expect(payload.id).to.equal(0);
//         expect(payload.iss).to.equal('feathers');
//         expect(payload.sub).to.equal('auth');
//       });
//     });
//   });

//   it('local username password authentication', () => {
//     return client.authenticate(options).then(response => {
//       expect(response.accessToken).to.not.equal(undefined);
//       expect(client.get('accessToken')).to.deep.equal(response.accessToken);
//     });
//   });

//   it('local username password authentication and access to protected service', () => {
//     return client.authenticate(options).then(response => {
//       expect(response.accessToken).to.not.equal(undefined);
//       return client.service('messages').create({ text: 'auth test message' })
//         .then(msg => {
//           expect(typeof msg.id).to.not.equal(undefined);
//         });
//     });
//   });

//   it('local authentication with wrong credentials fails', () => {
//     options.password = 'this is wrong';
//     return client.authenticate(options).catch(error => {
//       expect(error.name).to.equal('NotAuthenticated');
//       expect(error.code).to.equal(401);
//     });
//   });

//   it('authentication with no options and no stored accessToken fails', () => {
//     return client.authenticate().catch(error => {
//       expect(error.message).to.equal('Could not find stored JWT and no authentication type was given');
//       expect(error.code).to.equal(401);
//     });
//   });

//   it('uses localStorage compatible stores', () => {
//     const oldStorage = client.get('storage');
//     client.set('storage', localstorage);

//     return client.authenticate(options).then(response => {
//       expect(response.accessToken).to.equal(localstorage.getItem('feathers-jwt'));
//       client.set('storage', oldStorage);
//     });
//   });

//   it('accessToken is stored and re-authentication with stored accessToken works', () => {
//     return client.authenticate(options).then(response => {
//       expect(response.accessToken).to.not.equal(undefined);

//       return client.authenticate().then(response => {
//         expect(client.get('accessToken')).to.equal(response.accessToken);
//       });
//     });
//   });

//   it('.logout works, does not grant access to protected service and accessToken is removed from localstorage', () => {
//     return client.authenticate(options).then(response => {
//       expect(response.accessToken).to.not.equal(undefined);
//       return client.logout();
//     })
//     .then(() => {
//       expect(client.get('accessToken')).to.equal(null);
//       return Promise.resolve(client.get('storage').getItem('feathers-jwt'));
//     })
//     .then(accessToken => {
//       expect(accessToken).to.equal(undefined);

//       return client.service('messages').create({ text: 'auth test message' }).catch(error => {
//         expect(error.code).to.equal(401);
//       });
//     });
//   });
// };

// describe('Client side authentication', () => {
//   it('adds .authenticate, and .logout', () => {
//     const client = feathers().configure(authentication());

//     expect(typeof client.authenticate).to.equal('function');
//     expect(typeof client.logout).to.equal('function');
//   });

//   describe('REST client authentication', () => {
//     const connection = rest('http://localhost:8888').request(request);
//     let server;

//     before(done => {
//       initServer(settings, email, password, true).then(app => {
//         server = app;
//         setTimeout(done, 10);
//       });
//     });

//     after(done => server.close(done));

//     setupTests(() => {
//       return feathers()
//         .configure(connection)
//         .configure(hooks())
//         .configure(authentication());
//     });
//   });

//   describe('Socket.io client authentication', () => {
//     let socket, server;

//     before(done => {
//       initServer(settings, email, password, true).then(server => {

//       })
//         if (err) {
//           done(err);
//         }
//         server = obj.server;
//         socket = io('http://localhost:8888');

//         setTimeout(done, 10);
//       });
//     });

//     after(done => {
//       socket.once('disconnect', () => server.close(done));
//       socket.disconnect();
//     });

//     setupTests(() => {
//       return feathers()
//         .configure(socketio(socket))
//         .configure(hooks())
//         .configure(authentication());
//     });
//   });

//   describe('Primus client authentication', () => {
//     let socket, server;

//     before(done => {
//       initServer(settings, email, password, false).then(server => {

//       })
//         if (err) {
//           done(err);
//         }
//         const Socket = Primus.createSocket({
//           transformer: 'websockets',
//           plugin: {
//             'emitter': Emitter
//           }
//         });

//         server = obj.server;
//         socket = new Socket('http://localhost:8888');

//         setTimeout(done, 10);
//       });
//     });

//     after(done => {
//       socket.socket.close();
//       server.close(done);
//     });

//     setupTests(() => {
//       return feathers()
//         .configure(primus(socket))
//         .configure(hooks())
//         .configure(authentication());
//     });
//   });
// });
