import feathers from 'feathers';
import primus from 'feathers-primus';
import socketio from 'feathers-socketio';
import rest from 'feathers-rest';
import errorHandler from 'feathers-errors/handler';
import hooks from 'feathers-hooks';
import bodyParser from 'body-parser';
import memory from 'feathers-memory';
import auth from 'feathers-authentication';

export default function (settings, username, password, useSocketio = true) {
  return new Promise((resolve, reject) => {
    const app = feathers();

    app.configure(rest())
      .configure(useSocketio ? socketio() : primus({
        transformer: 'websockets'
      }))
      .configure(hooks())
      .use(bodyParser.json())
      .use(bodyParser.urlencoded({ extended: true }))
      .configure(auth(settings))
      .use('/authorizations', memory())
      .use('/users', memory())
      .use('/messages', memory())
      // .get('/get-jwt', function(req, res) {
      //   res.json({ token: req.token });
      // })
      .use(errorHandler());

    app.service('authentication').before({
      create (hook) {
        if (hook.data.login === 'testing') {
          hook.params.authentication = 'test-auth';

          hook.data.payload = {
            userId: 0,
            authentication: 'test-auth'
          };
        } else if (hook.data.login === 'testing-fail') {
          hook.params.authentication = 'test-auth';

          hook.data.payload = {
            authentication: 'test-auth'
          };
        }
      }
    });

    // Message hooks
    app.service('messages').before({
      all: [
        auth.hooks.authenticate(),
        auth.hooks.isAuthenticated()
      ]
    });

    // User hooks
    app.service('users').hooks({
      before: {
        create: [
          auth.hooks.hashPassword()
        ]
      }
    });

    // create a user
    app.service('users').create({ email: username, password })
      .then(() => Promise.all([
        app.service('messages').create({ text: 'A million people walk into a Silicon Valley bar' }),
        app.service('messages').create({ text: 'Nobody buys anything' }),
        app.service('messages').create({ text: 'Bar declared massive success' })
      ]))
      .then(() => resolve(app));
  });
}
