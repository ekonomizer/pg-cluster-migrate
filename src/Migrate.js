const fs = require('fs');
const path = require("path");
const Db = require("pg-cluster");

class Migrate {
    constructor(withPostgres = true, cfg, log, migrationsPath) {
        global.withPostgres = withPostgres;
        this.log = log;
        this.cfg = cfg;
        this.migrationsPath = migrationsPath;

        return new Promise(async (res, rej) => {
            try {
                await this.initDb();
                this.db.log.info("Success connect to Database");
                res(this)
            } catch (e) {
                this.db.log.info('Error when asyncInit', {err: e});
                rej(e)
            }
        })
    }

    async initDb() {
        this.defaultConfig = this.clone(this.cfg);

        if (withPostgres)
            for (const shardName in this.cfg) {
                this.cfg[shardName].database = 'postgres'
            }

        this.db = new Db(this.cfg, this.log);
        await this.db.init();
        this.db.log.info('Db initialized.')
    }

    async drop() {
        const dropPrms = [];
        this.shard = this.db.shards[Object.keys(this.db.shards)[0]];
        for (const k in this.defaultConfig) {
            if (this.defaultConfig[k].slave)
                continue;
            const v = this.defaultConfig[k];
            dropPrms.push(this.dropDb(v))
        }
        return await Promise.all(dropPrms)
    }

    async dropDb(v) {
        this.db.log.info("Migrations Try drop");
        const DropDbTask = require("./tasks/DropDb");
        const task = new DropDbTask(v, this.shard, this.db.log);
        return await task.run()
    }

    async create() {
        const createPrms = [];
        this.db.log.info("Migrations Try create");
        this.shard = this.db.shards[Object.keys(this.db.shards)[0]];
        for (const k in this.defaultConfig) {
            if (this.defaultConfig[k].slave)
                continue;
            const v = this.defaultConfig[k];
            createPrms.push(this.createDb(v))
        }
        return await Promise.all(createPrms)
    }

    createDb(v) {
        const CreateDbTask = require("./tasks/CreateDb");
        const task = new CreateDbTask(v, this.shard, this.db.log);
        return task.run()
    }

    async migrate() {
        this.fs = require("fs");
        const shards = this.createShardsTasks();
        await this.checkLastMigrations(shards);
        const migrationsList = this.prepareMigrationFiles();
        return await this.runMigrations(migrationsList)
    }

    createShardsTasks() {
        this.db.log.info('Create shards tasks');
        const MigrateShardDb = require("./tasks/MigrateShardDb");
        const shards = [];
        for (const shardName in this.defaultConfig) {
            if (this.defaultConfig[shardName].slave)
                continue;
            const task = new MigrateShardDb(this.defaultConfig[shardName], this.db.shards[shardName], this.log);
            shards.push(task)
        }
        this.shardsTasks = shards;
        return shards
    }

    checkLastMigrations(shards) {
        this.db.log.info('Check last migrations');
        //Первой будет таска на проверку последней смигрированной ноды в каждой таске.
        const CheckShardsVersionsTask = require("./tasks/CheckShardsVersions");
        const task = new CheckShardsVersionsTask(this.db.log);
        task.addShards(shards);
        return task.run()
    }

    prepareMigrationFiles() {
        this.db.log.info('Prepare migration sql');
        //Собираем список файлов с миграциями.
        const migrationsList = [];
        for (const file of this.fs.readdirSync(this.migrationsPath)) {
            const matches = file.match(/^V(\d+)__(.*)\.sql/i);
            if (matches)
                migrationsList.push({version: parseInt(matches[1]), name: matches[2], file})
        }

        //Сортируем список.
        migrationsList.sort(this.sortMigrations);
        return migrationsList
    }

    async runMigrations(migrationsList) {
        //Прогоняем миграции.
        this.db.log.info('Run migrations', {migrations_list: migrationsList});
        const list = [];
        for (const migration of migrationsList) {
            await this.getReadAndRunMigrations(migration)
        }
        this.db.log.info(list);
        return await Promise.all(list)
    }

    getReadAndRunMigrations(props) {
        return new Promise((resolve, reject) => {
            this.db.log.info('props.file', {file: props.file});
            this.fs.readFile(path.join(this.migrationsPath, props.file), 'utf8', (err, res) => {
                if (res) {
                    this.db.log.info('Read migration', {migration: props});
                    const MigrateOneTask = require("./tasks/MigrateOne");
                    const task = new MigrateOneTask(props.file, props.version, props.name, res, this.db.log);
                    task.addShards(this.shardsTasks);
                    resolve(task.run())
                } else {
                    this.db.log.info('Cannot read migration', {migration: props});
                    resolve(new Promise((res, rej) => res(null)));
                }
            })
        })
    }

    sortMigrations(a, b) {
        if (a.version < b.version)
            return -1;
        else if (a.version > b.version)
            return 1;
        return 0
    }

    clone(obj) {
        if (obj == null || typeof obj !== 'object' || obj instanceof RegExp)
            return obj;

        if (Array.isArray(obj)) {
            const newInstance = [];
            for(const el of obj) {
                newInstance.push(this.clone(el))
            }
            return newInstance
        }

        if (obj instanceof Date)
            return new Date(obj.getTime());

        if (obj instanceof Error) {
            return Object.assign(new Error(), obj)
        }

        const newInstance = {};

        for (const key in obj)
            newInstance[key] = this.clone(obj[key])

        return newInstance
    }
}

module.exports = Migrate;