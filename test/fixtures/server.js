import path from 'path';
import feathers from 'feathers';
import rest from 'feathers-rest';
import socketio from 'feathers-socketio';
import primus from 'feathers-primus';
import hooks from 'feathers-hooks';
import memory from 'feathers-memory';
import bodyParser from 'body-parser';
import errorHandler from 'feathers-errors/handler';
import local from 'feathers-authentication-local';
import jwt from 'feathers-authentication-jwt';
import auth from 'feathers-authentication';

const User = {
  email: 'admin@feathersjs.com',
  password: 'admin',
  permissions: ['*']
};

function customizeJWTPayload () {
  return function (hook) {
    hook.data.payload = {
      id: hook.params.user.id
    };

    return Promise.resolve(hook);
  };
}

export default function (settings, socketProvider) {
  const app = feathers();

  app.configure(rest())
    .configure(socketProvider === 'socketio' ? socketio() : primus({
      transformer: 'websockets'
    }))
    .configure(hooks())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .configure(auth(settings))
    .configure(local())
    .configure(jwt())
    .use('/users', memory())
    .use('/', feathers.static(path.resolve(__dirname, '/public')))
    .use(errorHandler());

  app.service('authentication').hooks({
    before: {
      create: [
        auth.hooks.authenticate(['jwt', 'local']),
        customizeJWTPayload()
      ],
      remove: [
        auth.hooks.authenticate('jwt')
      ]
    }
  });

  // Add a hook to the user service that automatically replaces
  // the password with a hash of the password before saving it.
  app.service('users').hooks({
    before: {
      find: [
        auth.hooks.authenticate('jwt')
      ],
      create: [
        local.hooks.hashPassword({ passwordField: 'password' })
      ]
    }
  });

  const _super = app.setup;
  app.setup = function () {
    let result = _super.apply(this, arguments);

    // Socket.io middleware
    if (app.io) {
      console.log('listening to upgrade-me');

      app.io.on('upgrade-me', () => {
        console.log('got upgrade-me message');
        app.io.broadcast.emit('boom', {message: 'from app'});
      });
    }

    return result;
  };

  // Create a user that we can use to log in
  app.service('users').create(User).catch(console.error);

  return app;
}
