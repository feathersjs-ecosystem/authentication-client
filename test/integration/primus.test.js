import hooks from 'feathers-hooks';
import feathers from 'feathers/client';
import primus from 'feathers-primus/client';
import Primus from 'primus';
import Emitter from 'primus-emitter';
import runTests from './common-tests';

import authentication from '../../src/index';
import initServer from '../fixtures/server';

const Socket = Primus.createSocket({
  transformer: 'websockets',
  plugin: {
    'emitter': Emitter
  }
});

const email = 'test@feathersjs.com';
const password = 'test';
const settings = {
  secret: 'feathers-rocks'
  // user: {
  //   idField: 'id'
  // }
};
const options = {
  type: 'local',
  email,
  password
};

describe.only('Primus client authentication', () => {
  let socket;
  let server;
  let client;

  before(() => {
    return initServer(settings, email, password, false).then(app => {
      server = app;
      socket = new Socket('http://localhost:8888');

      client = feathers()
        .configure(primus(socket))
        .configure(hooks())
        .configure(authentication());
    });
  });

  after(done => {
    socket.socket.close();
    server.close(done);
  });

  runTests(client, options);
});
