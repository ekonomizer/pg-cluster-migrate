# pg-cluster-migrate.
## Description.
Simple module for create/drop/migrate postgresql cluster for node v >=7 with 1 dependencies(pg-cluster). If you use pg-cluster for building pg cluster, and connecting to pg, pg-cluster-migrate your choice.

###Install module.
```
npm install pg-cluster-migrate
```

## Usage.

#### Migrate is class, and can be extend.
#### Define sample config.
```
Define sample config:
2 shards dev0, dev1(in maintenance) - in master mode
2 shards dev2, dev3 - in slave mode

const config = {
    dev0: {
        adapter: "postgresql"
        port: 5432,
        host: "127.0.0.1",
        database: "dev0",
        shard_id: "00",
        username: "postgres",
        password: "pass"
    },
    dev1: {
        adapter: "postgresql"
        port: 5432,
        host: "127.0.0.1",
        database: "dev1",
        shard_id: "01",
        username: "postgres",
        password: "pass",
        maintenance: true
    },

    dev_slave0: {
        adapter: "postgresql"
        port: 5432,
        host: "127.0.0.1",
        database: "dev2",
        shard_id: "00",
        username: "postgres",
        password: "pass",
        slave: true
    },
    dev_slave1: {
        adapter: "postgresql"
        port: 5432,
        host: "127.0.0.1",
        database: "dev3",
        shard_id: "01",
        username: "postgres",
        password: "pass",
        slave: true
    }
};

or load form yml
const config = require("node-config-yml");
config.load("/Users/someuser/test/config.yml");
```

#### Init Migrate.
```
const Migrate = require('pg-cluster-migrate');
const path = require("path");
const migrationDir = path.join("/Users/someuser/test/", "db", "migrations");
const customLog = console.log; //can be null
try {
    const migrate = await new Migrate(true, config, customLog, migrationDir);
    await manager.drop();
    await manager.create();
    await manager.migrate()
} catch (e) {
    console.log("Some Error", err)
}
```

## License MIT
