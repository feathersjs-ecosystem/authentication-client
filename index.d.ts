
export as namespace authentication;

export default e;

declare function e(config?: e.Config) : () => void;

declare namespace e {
  const defaults: Config;

  interface Config {
    storage?:any;
    header?: 'authorization';
    cookie?: 'feathers-jwt';
    storageKey?: 'feathers-jwt';
    jwtStrategy?: 'jwt';
    path?: '/authentication';
    entity?: 'user';
    service?: 'users';
  }
}

