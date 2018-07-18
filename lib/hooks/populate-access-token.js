module.exports = function populateAccessToken () {
  return function (hook) {
    const app = hook.app;

    if (hook.type !== 'before') {
      return Promise.reject(new Error(`The 'populateAccessToken' hook should only be used as a 'before' hook.`));
    }

    return Promise.resolve(app.get('storage').getItem(app.passport.options.storageKey))
      .then(accessToken => {
        Object.assign(hook.params, { accessToken });
        return hook;
      });
  };
};
