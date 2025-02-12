module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: 'localhost',
      database: 'soundscape_db',
      user: 'postgres',
      password: 'postgres',
    },
    migrations: {
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  }
};
